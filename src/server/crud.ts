import type { NextRequest } from 'next/server';
import { z, type ZodObject, type ZodRawShape } from 'zod';
import { badRequest, body, forbidden, notFound, owned, route, type Ctx } from './api';
import type { ModuleKey } from '@/lib/modules';

/**
 * Generic tenant-scoped CRUD for simple master-data resources. Every route is
 * permission-checked per action, input is validated with Zod, client-supplied
 * foreign keys are verified to belong to the same school, and writes are
 * audited. Complex workflows (fees, attendance, marks) use bespoke routes.
 */

type Delegate = {
  findMany(args: unknown): Promise<unknown[]>;
  findUnique(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<{ id: string }>;
  update(args: unknown): Promise<{ id: string }>;
  delete(args: unknown): Promise<unknown>;
  count(args: unknown): Promise<number>;
};

export interface CrudConfig<S extends ZodRawShape> {
  module: ModuleKey;
  model: string; // Prisma delegate name, e.g. "subject"
  entity: string; // human label for audit + errors
  schema: ZodObject<S>;
  orderBy?: unknown;
  include?: unknown;
  /** Fields searched by ?search= (string contains). */
  search?: string[];
  /** Query-string filters mapped straight to equality conditions. */
  filters?: string[];
  /** Foreign keys to verify: field -> Prisma delegate name. */
  refs?: Record<string, string>;
  /** Transform validated input before writing (e.g. date strings to Date). */
  map?: (input: z.infer<ZodObject<S>>, ctx: Ctx) => Record<string, unknown> | Promise<Record<string, unknown>>;
  /** Update-specific mapping (receives the record id); falls back to `map`. */
  mapUpdate?: (input: Partial<z.infer<ZodObject<S>>>, ctx: Ctx, id: string) => Record<string, unknown> | Promise<Record<string, unknown>>;
  /** Extra where-clause applied to every read (row-level scope). */
  scope?: (ctx: Ctx) => Promise<Record<string, unknown>> | Record<string, unknown>;
  /** Throw to block a delete (e.g. record in use). */
  beforeDelete?: (ctx: Ctx, id: string) => Promise<void>;
  /** Hook after create/update for side effects such as notifications. */
  afterWrite?: (ctx: Ctx, id: string, kind: 'create' | 'update') => Promise<void>;
  /** Hide from parents and students even when their role can view the module. */
  staffOnly?: boolean;
  /** View permission module override for listing (e.g. shared lookups). */
  listAccess?: Array<{ module: ModuleKey }>;
  take?: number;
}

function guard(ctx: Ctx, cfg: { staffOnly?: boolean }) {
  if (cfg.staffOnly && (ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT')) throw forbidden();
}

function delegate(ctx: Ctx, model: string): Delegate {
  const d = (ctx.db as unknown as Record<string, Delegate>)[model];
  if (!d) throw new Error(`Unknown model ${model}`);
  return d;
}

async function checkRefs(ctx: Ctx, refs: Record<string, string> | undefined, data: Record<string, unknown>) {
  if (!refs) return;
  for (const [field, model] of Object.entries(refs)) {
    const value = data[field];
    if (typeof value === 'string' && value) await owned(delegate(ctx, model), value, model.replace(/([A-Z])/g, ' $1').toLowerCase());
  }
}

export function crudCollection<S extends ZodRawShape>(cfg: CrudConfig<S>) {
  const GET = route(cfg.listAccess ? { anyOf: [{ module: cfg.module }, ...cfg.listAccess] } : { module: cfg.module, action: 'view' }, async (ctx, req: NextRequest) => {
    guard(ctx, cfg);
    const sp = req.nextUrl.searchParams;
    const where: Record<string, unknown>[] = [];
    if (cfg.scope) where.push(await cfg.scope(ctx));
    const q = sp.get('search')?.trim().slice(0, 100);
    if (q && cfg.search?.length) where.push({ OR: cfg.search.map((f) => ({ [f]: { contains: q } })) });
    for (const f of cfg.filters ?? []) {
      const v = sp.get(f);
      if (v !== null && v !== '') where.push({ [f]: v === 'true' ? true : v === 'false' ? false : v });
    }
    return delegate(ctx, cfg.model).findMany({
      where: where.length ? { AND: where } : undefined,
      orderBy: cfg.orderBy ?? { createdAt: 'desc' },
      include: cfg.include,
      take: cfg.take ?? 1000,
    });
  });

  const POST = route({ module: cfg.module, action: 'create' }, async (ctx, req) => {
    guard(ctx, cfg);
    const input = await body(req, cfg.schema);
    const data = cfg.map ? await cfg.map(input, ctx) : (input as Record<string, unknown>);
    await checkRefs(ctx, cfg.refs, data);
    const row = await delegate(ctx, cfg.model).create({ data: { ...data, schoolId: ctx.user.schoolId } });
    await ctx.audit('CREATE', cfg.entity, row.id, summarize(data));
    await cfg.afterWrite?.(ctx, row.id, 'create');
    return row;
  });

  return { GET, POST };
}

export function crudItem<S extends ZodRawShape>(cfg: CrudConfig<S>) {
  const GET = route({ module: cfg.module, action: 'view' }, async (ctx, _req, params) => {
    guard(ctx, cfg);
    const row = await delegate(ctx, cfg.model).findUnique({ where: { id: params.id }, include: cfg.include });
    if (!row) throw notFound(cfg.entity);
    return row;
  });

  const PUT = route({ module: cfg.module, action: 'edit' }, async (ctx, req, params) => {
    guard(ctx, cfg);
    const input = await body(req, cfg.schema.partial());
    const exists = await delegate(ctx, cfg.model).count({ where: { id: params.id } });
    if (!exists) throw notFound(cfg.entity);
    const data = cfg.mapUpdate
      ? await cfg.mapUpdate(input as Partial<z.infer<ZodObject<S>>>, ctx, params.id)
      : cfg.map
        ? await cfg.map(input as z.infer<ZodObject<S>>, ctx)
        : (input as Record<string, unknown>);
    if (!Object.keys(data).length) throw badRequest('Nothing to update.');
    await checkRefs(ctx, cfg.refs, data);
    const row = await delegate(ctx, cfg.model).update({ where: { id: params.id }, data });
    await ctx.audit('UPDATE', cfg.entity, row.id, summarize(data));
    await cfg.afterWrite?.(ctx, row.id, 'update');
    return row;
  });

  const DELETE = route({ module: cfg.module, action: 'delete' }, async (ctx, _req, params) => {
    guard(ctx, cfg);
    const exists = await delegate(ctx, cfg.model).count({ where: { id: params.id } });
    if (!exists) throw notFound(cfg.entity);
    await cfg.beforeDelete?.(ctx, params.id);
    await delegate(ctx, cfg.model).delete({ where: { id: params.id } });
    await ctx.audit('DELETE', cfg.entity, params.id);
    return { deleted: true };
  });

  return { GET, PUT, DELETE };
}

function summarize(data: Record<string, unknown>): string {
  return Object.entries(data)
    .filter(([k, v]) => !/password|aadhaar|secret|token/i.test(k) && v !== undefined)
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v)?.slice(0, 60) : String(v).slice(0, 60)}`)
    .join(', ')
    .slice(0, 500);
}

/** Common Zod helpers for CRUD schemas. */
export const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
export const toDate = (v: string | null | undefined) => (v ? new Date(`${v}T00:00:00.000Z`) : v === null ? null : undefined);
