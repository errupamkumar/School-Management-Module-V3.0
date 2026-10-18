/**
 * Create (or reset) a platform operator account for the SaaS console.
 *
 *   OPERATOR_PASSWORD='…' npm run platform:operator -- <username> "<Full Name>" [email]
 *
 * The password is read from the environment so it never lands in shell history.
 */
import { prisma } from '../src/server/db';
import { hashPassword } from '../src/server/crypto';
import { passwordPolicy } from '../src/lib/validators';

async function main() {
  const [username, name, email] = process.argv.slice(2);
  const password = process.env.OPERATOR_PASSWORD ?? '';
  if (!username || !name) throw new Error('Usage: OPERATOR_PASSWORD=… npm run platform:operator -- <username> "<Full Name>" [email]');
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw new Error('Username: 3–30 lowercase letters, digits, dot, dash or underscore.');
  const check = passwordPolicy.safeParse(password);
  if (!check.success || password.length < 12) throw new Error('Set OPERATOR_PASSWORD to at least 12 characters with letters and numbers.');

  const passwordHash = await hashPassword(password);
  const existing = await prisma.user.findFirst({ where: { schoolId: null, username } });
  if (existing && existing.role !== 'PLATFORM_ADMIN') throw new Error(`${username} exists and is not a platform operator.`);
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { name, passwordHash, isActive: true, failedLoginCount: 0, lockedUntil: null, sessionVersion: { increment: 1 }, ...(email ? { email } : {}) } });
    console.log(`Updated operator ${username} (all sessions signed out).`);
  } else {
    await prisma.user.create({ data: { username, name, email: email ?? null, role: 'PLATFORM_ADMIN', passwordHash, mustChangePassword: false } });
    console.log(`Created operator ${username}. Sign in at /login with an empty school code.`);
  }
}

main()
  .catch((e) => {
    console.error((e as Error).message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
