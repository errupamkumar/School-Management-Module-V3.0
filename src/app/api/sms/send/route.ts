import crypto from 'node:crypto';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { badRequest, body, route } from '@/server/api';
import { displayName } from '@/server/common';
import { queueMessages } from '@/server/services/messaging';
import { phoneIN } from '@/lib/validators';

/** Bulk SMS / WhatsApp / email to parents (whole school, classes, sections), staff, or custom numbers / addresses. */
export const POST = route({ module: 'sms', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']),
      subject: z.string().trim().max(190).optional(),
      emails: z.array(z.string().trim().toLowerCase().email()).max(1000).default([]),
      audience: z.enum(['ALL_PARENTS', 'CLASSES', 'SECTIONS', 'STAFF', 'CUSTOM']),
      classIds: z.array(z.string()).max(50).default([]),
      sectionIds: z.array(z.string()).max(100).default([]),
      numbers: z.array(phoneIN).max(1000).default([]),
      body: z.string().trim().min(3).max(10_000),
      personalise: z.boolean().default(false),
    })
  );
  const email = input.channel === 'EMAIL';
  if (!email && input.body.length > 1000) throw badRequest('SMS and WhatsApp messages can be up to 1000 characters.');
  if (email && !input.subject) throw badRequest('Enter a subject for the email.');
  let items: Array<{ recipient: string; recipientName: string; body: string; subject?: string }> = [];
  if (input.audience === 'STAFF') {
    const staff = await ctx.db.employee.findMany({ where: { status: 'ACTIVE', ...(email ? { email: { not: null } } : { phone: { not: null } }) }, select: { firstName: true, lastName: true, phone: true, email: true } });
    items = staff.map((e) => ({ recipient: (email ? e.email : e.phone)!, recipientName: displayName(e), body: input.personalise ? `Dear ${e.firstName}, ${input.body}` : input.body }));
  } else if (input.audience === 'CUSTOM') {
    items = email ? [...new Set(input.emails)].map((n) => ({ recipient: n, recipientName: n, body: input.body })) : [...new Set(input.numbers)].map((n) => ({ recipient: n, recipientName: n, body: input.body }));
  } else {
    const where: Prisma.StudentWhereInput = { status: 'ACTIVE' };
    if (input.audience === 'CLASSES') {
      if (!input.classIds.length) throw badRequest('Choose at least one class.');
      where.classId = { in: input.classIds };
    }
    if (input.audience === 'SECTIONS') {
      if (!input.sectionIds.length) throw badRequest('Choose at least one section.');
      where.sectionId = { in: input.sectionIds };
    }
    const students = await ctx.db.student.findMany({ where, select: { firstName: true, guardianId: true, guardian: { select: { primaryPhone: true, fatherEmail: true, fatherName: true, motherName: true, user: { select: { email: true } } } } } });
    // One message per family, not per child.
    const seen = new Set<string>();
    for (const s of students) {
      if (!s.guardian || seen.has(s.guardianId!)) continue;
      seen.add(s.guardianId!);
      const to = email ? (s.guardian.user?.email ?? s.guardian.fatherEmail) : s.guardian.primaryPhone;
      if (!to) continue;
      items.push({ recipient: to, recipientName: s.guardian.fatherName ?? s.guardian.motherName ?? 'Parent', body: input.personalise ? `Dear Parent of ${s.firstName}, ${input.body}` : input.body });
    }
  }
  if (email) items = items.map((i) => ({ ...i, subject: input.subject }));
  if (!items.length) throw badRequest(email ? 'No recipients with an email address.' : 'No recipients with a valid mobile number.');
  const batchId = crypto.randomUUID();
  const accepted = await queueMessages(ctx, input.channel, items, batchId);
  await ctx.audit('CREATE', 'OutboundMessage', batchId, `${input.channel} to ${items.length} (${input.audience}); accepted ${accepted}`);
  return { batchId, recipients: items.length, accepted, gatewayMissing: accepted === 0 };
});
