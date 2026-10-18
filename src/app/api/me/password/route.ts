import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { authSecret } from '@/server/env';
import { hashPassword, verifyPassword } from '@/server/crypto';
import { writeAudit } from '@/server/audit';
import { clientIp, rateLimit } from '@/server/rate-limit';
import { passwordPolicy } from '@/lib/validators';

const schema = z
  .object({ currentPassword: z.string().min(1, 'Enter your current password').max(200), newPassword: passwordPolicy })
  .refine((v) => v.currentPassword !== v.newPassword, { path: ['newPassword'], message: 'New password must differ from the current one' });

/**
 * Works for every role (including platform admins and users who must change
 * their password), so it reads the token directly instead of using route().
 */
export async function POST(req: NextRequest) {
  const token = (await getToken({ req, secret: authSecret() })) as { sub?: string; sv?: number } | null;
  if (!token?.sub) return NextResponse.json({ success: false, error: 'Please sign in again.' }, { status: 401 });

  const rl = await rateLimit(`pwchange:${token.sub}`, 10, 15 * 60);
  if (!rl.ok) return NextResponse.json({ success: false, error: 'Too many attempts. Try again later.' }, { status: 429 });

  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await req.json());
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message : 'Invalid request';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: token.sub } });
  if (!user || !user.isActive || user.sessionVersion !== token.sv) {
    return NextResponse.json({ success: false, error: 'Please sign in again.' }, { status: 401 });
  }
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 400 });
  }
  if (input.newPassword.toLowerCase().includes(user.username.toLowerCase())) {
    return NextResponse.json({ success: false, error: 'Password must not contain your username.' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(input.newPassword),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      sessionVersion: { increment: 1 }, // signs out other devices; this one refreshes via session.update()
    },
  });
  await writeAudit({ schoolId: user.schoolId, userId: user.id, userName: user.name, role: user.role, action: 'PASSWORD_CHANGED', entity: 'User', entityId: user.id, ip: clientIp(req.headers) });
  return NextResponse.json({ success: true, data: { changed: true } });
}
