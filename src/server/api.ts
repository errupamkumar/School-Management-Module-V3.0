import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Prisma, type Role } from '@prisma/client';
import { z, ZodError, type ZodType } from 'zod';
import { prisma, tenantDb, type TenantDb } from './db';
import { authSecret } from './env';
import { resolvePermissions } from './permissions';
import { writeAudit } from './audit';
import { clientIp, rateLimit } from './rate-limit';
import { readSettings, type SchoolSettings } from './settings';
import { readOnlyReason } from './subscription';
import { hasPerm, type Action, type ModuleKey, type PermissionMap } from '@/lib/modules';

// --------------------------------------------------------------------------
// Errors
// --------------------------------------------------------------------------

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'ERROR',
    public details?: unknown
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new HttpError(400, msg, 'BAD_REQUEST', details);
export const forbidden = (msg = 'You do not have permission to perform this action.') => new HttpError(403, msg, 'FORBIDDEN');
export const notFound = (what = 'Record') => new HttpError(404, `${what} not found.`, 'NOT_FOUND');
export const conflict = (msg: string) => new HttpError(409, msg, 'CONFLICT');

// --------------------------------------------------------------------------
// Context
// --------------------------------------------------------------------------

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  schoolId: string;
  campusId: string | null;
  studentId: string | null;
  guardianId: string | null;
  employeeId: string | null;
}

export interface SchoolInfo {
  id: string;
  code: string;
  name: string;
  status: string;
  settings: SchoolSettings;
  /** Set when the trial or subscription has lapsed: data stays readable, changes are blocked. */
  readOnlyReason: string | null;
}

export interface Ctx {
  user: SessionUser;
  school: SchoolInfo;
  db: TenantDb;
  perms: PermissionMap;
  ip: string;
  can(module: ModuleKey, action?: Action): boolean;
  require(module: ModuleKey, action?: Action): void;
  audit(action: string, entity: string, entityId?: string | null, summary?: string | null): Promise<void>;
}

export interface PlatformCtx {
  user: { id: string; name: string; role: 'PLATFORM_ADMIN' };
  ip: string;
  audit(action: string, entity: string, entityId?: string | null, summary?: string | null): Promise<void>;
}

type Access =
  | { module: ModuleKey; action?: Action }
  | { anyOf: Array<{ module: ModuleKey; action?: Action }> }
  | { authenticated: true }
  | { allowPasswordChange: true };

type RouteContext = { params: Promise<Record<string, string>> };

// --------------------------------------------------------------------------
// Serialisation: Decimal -> number, and strip secrets as a last line of defence
// --------------------------------------------------------------------------

const SECRET_KEYS = new Set(['passwordHash', 'aadhaarEnc', 'sessionVersion', 'smsApiKeyEnc', 'whatsappTokenEnc', 'razorpayKeySecretEnc', 'razorpayWebhookSecretEnc', 'smtpPassEnc', 'bbbSecretEnc', 'failedLoginCount', 'lockedUntil']);

export function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Prisma.Decimal.isDecimal(value)) return (value as Prisma.Decimal).toNumber();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return Number(value);
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEYS.has(k)) continue;
      out[k] = serialize(v);
    }
    return out;
  }
  return value;
}

export function ok(data: unknown, init?: { status?: number; meta?: Record<string, unknown> }) {
  return NextResponse.json({ success: true, data: serialize(data), ...(init?.meta ?? {}) }, { status: init?.status ?? 200 });
}

function fail(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ success: false, error: err.message, code: err.code, details: err.details }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    const first = err.issues[0];
    const label = first?.path.length ? `${first.path.join('.')}: ` : '';
    return NextResponse.json(
      { success: false, error: `${label}${first?.message ?? 'Invalid input'}`, code: 'VALIDATION', details: fields },
      { status: 400 }
    );
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string | string[] | undefined) ?? '';
      const field = String(Array.isArray(target) ? target.join(', ') : target).replace(/_key$/, '').split('_').slice(1).filter((f) => f !== 'schoolId').join(' ');
      return NextResponse.json({ success: false, error: `A record with the same ${field || 'value'} already exists.`, code: 'CONFLICT' }, { status: 409 });
    }
    if (err.code === 'P2025') return NextResponse.json({ success: false, error: 'Record not found.', code: 'NOT_FOUND' }, { status: 404 });
    if (err.code === 'P2003' || err.code === 'P2014') {
      return NextResponse.json({ success: false, error: 'This record is linked to other records and cannot be changed this way.', code: 'CONFLICT' }, { status: 409 });
    }
  }
  console.error('[api] unhandled error', err);
  return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.', code: 'INTERNAL' }, { status: 500 });
}

// --------------------------------------------------------------------------
// Input parsing
// --------------------------------------------------------------------------

export async function body<T extends ZodType>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest('Request body must be valid JSON.');
  }
  return schema.parse(raw);
}

export function query<T extends ZodType>(req: NextRequest, schema: T): z.infer<T> {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  return schema.parse(params);
}

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  search: z.string().trim().max(100).optional(),
});

// --------------------------------------------------------------------------
// Session loading
// --------------------------------------------------------------------------

interface TokenShape {
  sub?: string;
  role?: string;
  schoolId?: string | null;
  sv?: number;
  mcp?: boolean;
}

async function readToken(req: NextRequest): Promise<TokenShape | null> {
  return (await getToken({ req, secret: authSecret() })) as TokenShape | null;
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-browser client; cookie auth still required
  try {
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Loads and validates everything a school route needs. Exported for server components. */
export async function loadContext(req: NextRequest): Promise<{ ctx: Ctx | null; error?: HttpError; mustChangePassword?: boolean }> {
  const token = await readToken(req);
  if (!token?.sub) return { ctx: null, error: new HttpError(401, 'Please sign in to continue.', 'UNAUTHENTICATED') };

  const user = await prisma.user.findUnique({
    where: { id: token.sub },
    select: {
      id: true,
      name: true,
      role: true,
      schoolId: true,
      campusId: true,
      isActive: true,
      sessionVersion: true,
      mustChangePassword: true,
      student: { select: { id: true } },
      guardian: { select: { id: true } },
      employee: { select: { id: true } },
      school: { select: { id: true, code: true, name: true, status: true, settings: true, trialEndsAt: true, subscriptionEndsAt: true } },
    },
  });

  if (!user || !user.isActive || user.sessionVersion !== token.sv) {
    return { ctx: null, error: new HttpError(401, 'Your session has expired. Please sign in again.', 'SESSION_REVOKED') };
  }
  if (user.role === 'PLATFORM_ADMIN' || !user.schoolId || !user.school) {
    return { ctx: null, error: forbidden('This endpoint is only available to school users.') };
  }
  if (user.school.status === 'SUSPENDED' || user.school.status === 'CANCELLED') {
    return { ctx: null, error: new HttpError(403, 'This school account is suspended.', 'SCHOOL_SUSPENDED') };
  }

  const perms = await resolvePermissions(user.schoolId, user.role);
  const ip = clientIp(req.headers);
  const sessionUser: SessionUser = {
    id: user.id,
    name: user.name,
    role: user.role,
    schoolId: user.schoolId,
    campusId: user.campusId,
    studentId: user.student?.id ?? null,
    guardianId: user.guardian?.id ?? null,
    employeeId: user.employee?.id ?? null,
  };

  const ctx: Ctx = {
    user: sessionUser,
    school: { id: user.school.id, code: user.school.code, name: user.school.name, status: user.school.status, settings: readSettings(user.school.settings), readOnlyReason: readOnlyReason(user.school) },
    db: tenantDb(user.schoolId),
    perms,
    ip,
    can: (module, action = 'view') => hasPerm(perms, module, action),
    require(module, action = 'view') {
      if (!hasPerm(perms, module, action)) throw forbidden();
    },
    audit: (action, entity, entityId, summary) =>
      writeAudit({
        schoolId: sessionUser.schoolId,
        userId: sessionUser.id,
        userName: sessionUser.name,
        role: sessionUser.role,
        action,
        entity,
        entityId,
        summary,
        ip,
        userAgent: req.headers.get('user-agent'),
      }),
  };
  return { ctx, mustChangePassword: user.mustChangePassword };
}

function checkAccess(ctx: Ctx, access: Access) {
  if ('module' in access) {
    if (!ctx.can(access.module, access.action ?? 'view')) throw forbidden();
  } else if ('anyOf' in access) {
    if (!access.anyOf.some((a) => ctx.can(a.module, a.action ?? 'view'))) throw forbidden();
  }
}

// --------------------------------------------------------------------------
// Route factories
// --------------------------------------------------------------------------

type Handler = (ctx: Ctx, req: NextRequest, params: Record<string, string>) => Promise<unknown>;

/**
 * Wraps a school route: authentication, session revocation, tenant scoping,
 * module + role permission, CSRF origin check, error mapping and serialisation.
 */
export function route(access: Access, handler: Handler) {
  return async (req: NextRequest, context: RouteContext) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD' && !sameOrigin(req)) throw forbidden('Cross-origin request blocked.');
      const { ctx, error, mustChangePassword } = await loadContext(req);
      if (!ctx) throw error!;
      if (mustChangePassword && !('allowPasswordChange' in access)) {
        throw new HttpError(403, 'Please change your password to continue.', 'PASSWORD_CHANGE_REQUIRED');
      }
      checkAccess(ctx, access);
      // Lapsed schools keep read access; personal account actions (password, language, sign-out) still work.
      if (ctx.school.readOnlyReason && req.method !== 'GET' && req.method !== 'HEAD' && !('authenticated' in access) && !('allowPasswordChange' in access)) {
        throw new HttpError(402, `${ctx.school.readOnlyReason} The school is in read-only mode until the plan is renewed.`, 'SUBSCRIPTION_LAPSED');
      }
      const params = (await context?.params) ?? {};
      const result = await handler(ctx, req, params);
      if (result instanceof Response) return result;
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  };
}

/** Platform (SaaS operator) routes. School users can never reach these. */
export function platformRoute(handler: (ctx: PlatformCtx, req: NextRequest, params: Record<string, string>) => Promise<unknown>) {
  return async (req: NextRequest, context: RouteContext) => {
    try {
      if (req.method !== 'GET' && !sameOrigin(req)) throw forbidden('Cross-origin request blocked.');
      const token = await readToken(req);
      if (!token?.sub) throw new HttpError(401, 'Please sign in to continue.', 'UNAUTHENTICATED');
      const user = await prisma.user.findUnique({ where: { id: token.sub } });
      if (!user || !user.isActive || user.sessionVersion !== token.sv || user.role !== 'PLATFORM_ADMIN') throw forbidden();
      const ip = clientIp(req.headers);
      const ctx: PlatformCtx = {
        user: { id: user.id, name: user.name, role: 'PLATFORM_ADMIN' },
        ip,
        audit: (action, entity, entityId, summary) =>
          writeAudit({ schoolId: null, userId: user.id, userName: user.name, role: user.role, action, entity, entityId, summary, ip }),
      };
      const result = await handler(ctx, req, (await context?.params) ?? {});
      if (result instanceof Response) return result;
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  };
}

/** Unauthenticated routes (public admission form, certificate verification, webhooks). */
export function publicRoute(opts: { limit: number; windowSec: number; name: string }, handler: (req: NextRequest, params: Record<string, string>, ip: string) => Promise<unknown>) {
  return async (req: NextRequest, context: RouteContext) => {
    try {
      const ip = clientIp(req.headers);
      const rl = await rateLimit(`public:${opts.name}:${ip}`, opts.limit, opts.windowSec);
      if (!rl.ok) throw new HttpError(429, 'Too many requests. Please try again later.', 'RATE_LIMITED', { retryAfterSec: rl.retryAfterSec });
      const result = await handler(req, (await context?.params) ?? {}, ip);
      if (result instanceof Response) return result;
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  };
}

// --------------------------------------------------------------------------
// Ownership helpers: verify client-supplied foreign keys belong to this school
// --------------------------------------------------------------------------

type CountDelegate = { count(args: { where: { id: string } }): Promise<number> };

export async function owned(delegate: CountDelegate, id: string | null | undefined, what: string): Promise<void> {
  if (!id) return;
  const n = await delegate.count({ where: { id } });
  if (n === 0) throw notFound(what);
}

export function paginate(page: number, pageSize: number) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}
