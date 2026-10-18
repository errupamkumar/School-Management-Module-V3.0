import type { Role } from '@prisma/client';
import type { TenantDb, TenantTx } from '../db';
import { sendPush } from './push';

type Db = TenantDb | TenantTx;

export async function notifyUsers(db: Db, schoolId: string, userIds: Array<string | null | undefined>, n: { title: string; body: string; link?: string }) {
  const ids = [...new Set(userIds.filter((x): x is string => !!x))];
  if (!ids.length) return;
  await db.notification.createMany({ data: ids.map((userId) => ({ schoolId, userId, title: n.title.slice(0, 190), body: n.body, link: n.link ?? null })) });
  // Also reach phones that installed the app; best-effort and never blocks the request.
  void sendPush(schoolId, ids, n);
}

export async function notifyRoles(db: Db, schoolId: string, roles: Role[], n: { title: string; body: string; link?: string }) {
  const users = await db.user.findMany({ where: { role: { in: roles }, isActive: true }, select: { id: true } });
  await notifyUsers(db, schoolId, users.map((u) => u.id), n);
}

/** Notify the guardians (and the students themselves) of the given students. */
export async function notifyFamilies(db: Db, schoolId: string, studentIds: string[], n: { title: string; body: string; link?: string }, opts: { includeStudents?: boolean } = {}) {
  if (!studentIds.length) return;
  const rows = await db.student.findMany({ where: { id: { in: studentIds } }, select: { userId: true, guardian: { select: { userId: true } } } });
  const ids = rows.flatMap((r) => [r.guardian?.userId, opts.includeStudents ? r.userId : null]);
  await notifyUsers(db, schoolId, ids, n);
}
