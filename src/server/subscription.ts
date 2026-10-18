/** Subscription state that decides whether a school may make changes. Pure, so it is unit-tested. */

export const GRACE_DAYS = 7;
const longDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

/** Non-null when the trial ended or the paid period lapsed beyond the grace period: data stays readable, changes are blocked. */
export function readOnlyReason(s: { status: string; trialEndsAt: Date | null; subscriptionEndsAt: Date | null }, now = new Date()): string | null {
  if (s.status === 'TRIAL' && s.trialEndsAt && s.trialEndsAt < now) return `The free trial ended on ${longDate(s.trialEndsAt)}.`;
  if (s.status === 'ACTIVE' && s.subscriptionEndsAt && s.subscriptionEndsAt.getTime() + GRACE_DAYS * 86_400_000 < now.getTime()) return `The subscription expired on ${longDate(s.subscriptionEndsAt)}.`;
  return null;
}
