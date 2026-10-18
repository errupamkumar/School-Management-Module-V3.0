import { PrismaClient } from '@prisma/client';

/**
 * Test-database setup: suites sign in many times from one IP, which trips the
 * production login rate limit (by design). Clear those counters before a run.
 * Never point the test suites at a production database.
 */
export async function resetLoginRateLimits(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to touch rate limits in production.');
  const prisma = new PrismaClient();
  try {
    // Login attempts, plus the hourly caps the suites exercise (data export, alumni sign-up).
    await prisma.rateLimit.deleteMany({ where: { OR: ['login:', 'data-export:', 'public:alumni-register:'].map((p) => ({ key: { startsWith: p } })) } });
  } finally {
    await prisma.$disconnect();
  }
}

export default resetLoginRateLimits;

// Run directly (`npx tsx tests/reset-rate-limits.ts`) to clear the counters by hand.
if (process.argv[1]?.split('\\').join('/').endsWith('tests/reset-rate-limits.ts')) {
  resetLoginRateLimits().then(() => console.log('Login rate limits cleared.'));
}
