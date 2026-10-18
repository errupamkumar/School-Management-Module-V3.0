import { Prisma, PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

/**
 * Unscoped client. Only auth, platform administration and the tenant wrapper
 * itself may use it; feature code must go through `tenantDb(schoolId)`.
 */
export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;

/** Every model that has a `schoolId` column is tenant-owned. */
export const TENANT_MODELS: ReadonlySet<string> = new Set(
  Prisma.dmmf.datamodel.models.filter((m) => m.fields.some((f) => f.name === 'schoolId')).map((m) => m.name)
);

const WHERE_OPS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);
const UNIQUE_OPS = new Set(['findUnique', 'findUniqueOrThrow', 'update', 'delete']);

function withSchool<T>(data: T, schoolId: string): T {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const existing = (data as Record<string, unknown>).schoolId;
    if (existing !== undefined && existing !== schoolId) {
      throw new Error('Cross-tenant write blocked');
    }
    return { ...(data as object), schoolId } as T;
  }
  return data;
}

/**
 * Returns a client whose every top-level query against a tenant model is
 * constrained to `schoolId`:
 *  - reads/updates/deletes get `schoolId` ANDed into `where`
 *  - creates get `schoolId` stamped onto `data` (a mismatching value throws)
 *
 * Nested writes are not rewritten, so nested creates must pass `schoolId`
 * explicitly; the column is required, so forgetting it fails loudly instead of
 * leaking. Foreign keys supplied by clients must be checked with `owned()`.
 */
export function tenantDb(schoolId: string) {
  if (!schoolId) throw new Error('tenantDb requires a schoolId');
  return prisma.$extends({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_MODELS.has(model)) return query(args);
          const a = (args ?? {}) as Record<string, any>;

          if (WHERE_OPS.has(operation)) {
            a.where = a.where ? { AND: [a.where, { schoolId }] } : { schoolId };
          } else if (UNIQUE_OPS.has(operation)) {
            a.where = { ...(a.where ?? {}), schoolId };
          } else if (operation === 'create') {
            a.data = withSchool(a.data, schoolId);
          } else if (operation === 'createMany') {
            a.data = Array.isArray(a.data) ? a.data.map((d: unknown) => withSchool(d, schoolId)) : withSchool(a.data, schoolId);
          } else if (operation === 'upsert') {
            a.where = { ...(a.where ?? {}), schoolId };
            a.create = withSchool(a.create, schoolId);
          }
          return query(a);
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof tenantDb>;
export type TenantTx = Parameters<Parameters<TenantDb['$transaction']>[0]>[0];

/**
 * Gap-free per-school sequence. Must run inside the same transaction as the
 * row that consumes the number so a rollback also rolls back the counter.
 * The upsert takes a row lock, serialising concurrent issuers.
 */
export async function nextSequence(tx: { $executeRaw: PrismaClient['$executeRaw']; $queryRaw: PrismaClient['$queryRaw'] }, schoolId: string, key: string): Promise<number> {
  await tx.$executeRaw`INSERT INTO Counter (schoolId, \`key\`, value) VALUES (${schoolId}, ${key}, 1) ON DUPLICATE KEY UPDATE value = value + 1`;
  const rows = await tx.$queryRaw<Array<{ value: number | bigint }>>`SELECT value FROM Counter WHERE schoolId = ${schoolId} AND \`key\` = ${key}`;
  return Number(rows[0].value);
}

/** Reserves `count` consecutive numbers and returns the first one. */
export async function reserveSequence(
  tx: { $executeRaw: PrismaClient['$executeRaw']; $queryRaw: PrismaClient['$queryRaw'] },
  schoolId: string,
  key: string,
  count: number
): Promise<number> {
  if (count < 1) throw new Error('count must be positive');
  await tx.$executeRaw`INSERT INTO Counter (schoolId, \`key\`, value) VALUES (${schoolId}, ${key}, ${count}) ON DUPLICATE KEY UPDATE value = value + ${count}`;
  const rows = await tx.$queryRaw<Array<{ value: number | bigint }>>`SELECT value FROM Counter WHERE schoolId = ${schoolId} AND \`key\` = ${key}`;
  return Number(rows[0].value) - count + 1;
}

export function formatNumber(prefix: string, n: number, pad = 5): string {
  return `${prefix}${String(n).padStart(pad, '0')}`;
}
