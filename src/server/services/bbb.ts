import crypto from 'node:crypto';
import { decryptField } from '../crypto';
import type { SchoolSettings } from '../settings';

/**
 * BigBlueButton API client (create + join). Requests are signed with the
 * server's shared secret: checksum = sha1(callName + queryString + secret).
 * The school brings its own BBB server (self-hosted or a hosting provider).
 */
export function bbbConfigured(settings: SchoolSettings): boolean {
  return !!(settings.liveClasses.bbbUrl && settings.liveClasses.bbbSecretEnc);
}

/** "https://bbb.school.in" or ".../bigbluebutton/" → ".../bigbluebutton/api/" */
export function bbbApiBase(serverUrl: string): string {
  let base = serverUrl.trim().replace(/\/+$/, '');
  if (base.endsWith('/api')) base = base.slice(0, -4);
  if (!base.endsWith('/bigbluebutton')) base += '/bigbluebutton';
  return `${base}/api/`;
}

export function bbbChecksum(call: string, query: string, secret: string): string {
  return crypto.createHash('sha1').update(call + query + secret).digest('hex');
}

export function bbbSignedUrl(serverUrl: string, secret: string, call: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return `${bbbApiBase(serverUrl)}${call}?${query}&checksum=${bbbChecksum(call, query, secret)}`;
}

/** Stable per-meeting passwords for older BBB servers that still need them. */
function meetingPassword(secret: string, meetingID: string, kind: 'mod' | 'att'): string {
  return crypto.createHmac('sha256', secret).update(`${meetingID}:${kind}`).digest('hex').slice(0, 16);
}

/** Creates the meeting if it is not running (BBB treats repeat creates with the same id as a no-op). */
export async function ensureBbbMeeting(settings: SchoolSettings, meetingID: string, name: string, durationMins: number): Promise<void> {
  const secret = decryptField(settings.liveClasses.bbbSecretEnc!);
  const url = bbbSignedUrl(settings.liveClasses.bbbUrl, secret, 'create', {
    name: name.slice(0, 120),
    meetingID,
    attendeePW: meetingPassword(secret, meetingID, 'att'),
    moderatorPW: meetingPassword(secret, meetingID, 'mod'),
    duration: String(Math.min(durationMins + 30, 600)),
    record: 'false',
  });
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  const xml = await res.text();
  if (!res.ok || !/<returncode>SUCCESS<\/returncode>/.test(xml)) {
    const msg = /<message>([^<]*)<\/message>/.exec(xml)?.[1];
    throw new Error(msg ? `BigBlueButton: ${msg}` : `BigBlueButton server error (HTTP ${res.status})`);
  }
}

export function bbbJoinUrl(settings: SchoolSettings, meetingID: string, fullName: string, userID: string, moderator: boolean): string {
  const secret = decryptField(settings.liveClasses.bbbSecretEnc!);
  return bbbSignedUrl(settings.liveClasses.bbbUrl, secret, 'join', {
    fullName: fullName.slice(0, 80),
    meetingID,
    password: meetingPassword(secret, meetingID, moderator ? 'mod' : 'att'),
    role: moderator ? 'MODERATOR' : 'VIEWER',
    userID,
    redirect: 'true',
  });
}
