import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import type { Ctx } from '../api';
import { prisma } from '../db';
import { decryptField } from '../crypto';
import { readSettings, type SchoolSettings } from '../settings';

export type Channel = 'SMS' | 'WHATSAPP' | 'EMAIL';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface OutboundItem {
  recipient: string | null | undefined;
  recipientName?: string | null;
  body: string;
  /** EMAIL only. */
  subject?: string;
}

function providerFor(settings: SchoolSettings, channel: Channel): string {
  if (channel === 'EMAIL') return settings.messaging.emailProvider === 'SMTP' && settings.messaging.smtpHost && settings.messaging.fromEmail ? 'SMTP' : 'NONE';
  return channel === 'SMS' ? settings.messaging.smsProvider : settings.messaging.whatsappProvider;
}

const CHANNEL_NAME: Record<Channel, string> = { SMS: 'SMS', WHATSAPP: 'WhatsApp', EMAIL: 'Email' };

export function validRecipient(channel: Channel, recipient: string | null | undefined): boolean {
  if (!recipient) return false;
  return channel === 'EMAIL' ? EMAIL_RE.test(recipient) && recipient.length <= 190 : /^[6-9]\d{9}$/.test(recipient);
}

/**
 * Records messages in the outbox and dispatches them in the background.
 * Returns how many were accepted for sending (0 when no gateway is configured).
 */
export async function queueMessages(ctx: Ctx, channel: Channel, items: OutboundItem[], batchId: string = crypto.randomUUID()): Promise<number> {
  const valid = items.filter((i) => validRecipient(channel, i.recipient));
  if (!valid.length) return 0;
  const provider = providerFor(ctx.school.settings, channel);
  const configured = provider !== 'NONE';
  await ctx.db.outboundMessage.createMany({
    data: valid.map((i) => ({
      schoolId: ctx.user.schoolId,
      channel,
      recipient: channel === 'EMAIL' ? i.recipient!.toLowerCase() : i.recipient!,
      recipientName: i.recipientName ?? null,
      subject: channel === 'EMAIL' ? (i.subject ?? 'Message from school').slice(0, 190) : null,
      body: i.body.slice(0, channel === 'EMAIL' ? 20000 : 1000),
      status: configured ? 'QUEUED' : 'SKIPPED',
      provider: configured ? provider : null,
      error: configured ? null : `${CHANNEL_NAME[channel]} gateway not configured in School Settings`,
      batchId,
      sentById: ctx.user.id,
    })),
  });
  if (configured) void dispatchQueued(ctx.user.schoolId).catch((e) => console.error('[messaging] dispatch failed', e));
  return configured ? valid.length : 0;
}

/** Sends queued messages for a school. Safe to call repeatedly. */
export async function dispatchQueued(schoolId: string): Promise<{ sent: number; failed: number }> {
  const school = await prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { settings: true } });
  const settings = readSettings(school.settings);
  const queued = await prisma.outboundMessage.findMany({ where: { schoolId, status: 'QUEUED' }, take: 200, orderBy: { createdAt: 'asc' } });
  let sent = 0;
  let failed = 0;
  const mailer = queued.some((m) => m.channel === 'EMAIL') ? smtpTransport(settings) : null;
  for (const m of queued) {
    try {
      const id =
        m.channel === 'EMAIL'
          ? await sendEmail(settings, mailer, m.recipient, m.subject ?? 'Message from school', m.body)
          : m.channel === 'SMS'
            ? await sendSms(settings, m.recipient, m.body)
            : await sendWhatsApp(settings, m.recipient, m.body);
      await prisma.outboundMessage.update({ where: { id: m.id }, data: { status: 'SENT', providerMessageId: id, error: null } });
      sent++;
    } catch (e) {
      await prisma.outboundMessage.update({ where: { id: m.id }, data: { status: 'FAILED', error: (e as Error).message.slice(0, 500) } });
      failed++;
    }
  }
  mailer?.close();
  return { sent, failed };
}

function smtpTransport(settings: SchoolSettings) {
  const m = settings.messaging;
  if (m.emailProvider !== 'SMTP' || !m.smtpHost) return null;
  return nodemailer.createTransport({
    host: m.smtpHost,
    port: m.smtpPort,
    secure: m.smtpSecure,
    auth: m.smtpUser ? { user: m.smtpUser, pass: m.smtpPassEnc ? decryptField(m.smtpPassEnc) : '' } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
}

async function sendEmail(settings: SchoolSettings, mailer: ReturnType<typeof smtpTransport>, to: string, subject: string, text: string): Promise<string> {
  if (!mailer) throw new Error('SMTP not configured');
  const { fromEmail, fromName } = settings.messaging;
  const info = await mailer.sendMail({ from: fromName ? { name: fromName, address: fromEmail } : fromEmail, to, subject, text });
  return info.messageId ?? 'ok';
}

/** Sends one test email immediately (settings screen). Throws with the server's reason on failure. */
export async function sendTestEmail(settings: SchoolSettings, to: string): Promise<string> {
  const mailer = smtpTransport(settings);
  if (!mailer || !settings.messaging.fromEmail) throw new Error('Enter the SMTP host and From email first.');
  try {
    await mailer.verify();
    return await sendEmail(settings, mailer, to, 'Test email from Vidyalaya', 'Your school email settings work. Parents and staff will receive emails from this address.');
  } finally {
    mailer.close();
  }
}

async function sendSms(settings: SchoolSettings, to: string, body: string): Promise<string> {
  const { smsProvider, smsApiKeyEnc, smsSenderId } = settings.messaging;
  if (!smsApiKeyEnc) throw new Error('SMS API key missing');
  const key = decryptField(smsApiKeyEnc);
  if (smsProvider === 'MSG91') {
    // MSG91 v2 send API. Indian SMS requires the text to match a DLT-registered template.
    const res = await fetch('https://api.msg91.com/api/v2/sendsms', {
      method: 'POST',
      headers: { authkey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: smsSenderId, route: '4', country: '91', sms: [{ message: body, to: [to] }] }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as { type?: string; message?: string };
    if (!res.ok || json.type === 'error') throw new Error(json.message ?? `MSG91 HTTP ${res.status}`);
    return json.message ?? 'ok';
  }
  if (smsProvider === 'TWILIO') {
    const [sid, token] = key.split(':');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: `+91${to}`, From: smsSenderId, Body: body }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!res.ok) throw new Error(json.message ?? `Twilio HTTP ${res.status}`);
    return json.sid ?? 'ok';
  }
  throw new Error('No SMS provider configured');
}

async function sendWhatsApp(settings: SchoolSettings, to: string, body: string): Promise<string> {
  const { whatsappProvider, whatsappTokenEnc, whatsappPhoneNumberId } = settings.messaging;
  if (whatsappProvider !== 'META_CLOUD' || !whatsappTokenEnc || !whatsappPhoneNumberId) throw new Error('WhatsApp Cloud API not configured');
  const res = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(whatsappPhoneNumberId)}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${decryptField(whatsappTokenEnc)}`, 'Content-Type': 'application/json' },
    // Free-form text is only delivered inside a 24h customer-service window; outside it a template is required.
    body: JSON.stringify({ messaging_product: 'whatsapp', to: `91${to}`, type: 'text', text: { body } }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as { messages?: Array<{ id: string }>; error?: { message: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `WhatsApp HTTP ${res.status}`);
  return json.messages?.[0]?.id ?? 'ok';
}
