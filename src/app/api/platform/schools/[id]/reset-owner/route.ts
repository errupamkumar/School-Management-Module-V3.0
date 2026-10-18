import { z } from 'zod';
import { badRequest, body, platformRoute } from '@/server/api';
import { writeAudit } from '@/server/audit';
import { generateTempPassword, hashPassword } from '@/server/crypto';
import { prisma } from '@/server/db';

/**
 * Support recovery when a school's owner is locked out. Issues a temporary
 * password (must be changed at next sign-in), signs out all their sessions and
 * records the action in both the platform and the school's audit log.
 */
export const POST = platformRoute(async (ctx, req, { id }) => {
  const input = await body(req, z.object({ reason: z.string().trim().min(5, 'Record why (e.g. ticket number)').max(200) }));
  const owner = await prisma.user.findFirst({ where: { schoolId: id, role: 'SUPER_ADMIN', isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, username: true } });
  if (!owner) throw badRequest('This school has no active owner account.');
  const password = generateTempPassword();
  await prisma.user.update({
    where: { id: owner.id },
    data: { passwordHash: await hashPassword(password, 'temporary'), mustChangePassword: true, failedLoginCount: 0, lockedUntil: null, sessionVersion: { increment: 1 } },
  });
  const summary = `Owner password reset by platform support (${input.reason})`;
  await ctx.audit('RESET_PASSWORD', 'User', owner.id, `${summary} for school ${id}`);
  await writeAudit({ schoolId: id, userId: ctx.user.id, userName: `${ctx.user.name} (platform)`, role: 'PLATFORM_ADMIN', action: 'RESET_PASSWORD', entity: 'User', entityId: owner.id, summary, ip: ctx.ip });
  return { name: owner.name, username: owner.username, password };
});
