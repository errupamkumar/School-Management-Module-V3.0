import { z } from 'zod';
import type { Role } from '@prisma/client';
import { badRequest, body, forbidden, route, type Ctx } from '@/server/api';
import { hasSchoolWideScope, ownClassSectionPairs, teacherSectionIds } from '@/server/scope';
import { notifyUsers } from '@/server/services/notify';
import { queueMessages } from '@/server/services/messaging';
import { ROLES } from '@/lib/modules';

interface Audience {
  roles?: string[];
  classIds?: string[];
}

async function myClassIds(ctx: Ctx): Promise<string[]> {
  if (ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT') return (await ownClassSectionPairs(ctx)).map((p) => p.classId);
  if (ctx.user.role === 'TEACHER') {
    const secs = await teacherSectionIds(ctx);
    return (await ctx.db.section.findMany({ where: { id: { in: secs } }, select: { classId: true } })).map((s) => s.classId);
  }
  return [];
}

function visibleTo(ctx: Ctx, a: Audience | null, classIds: string[]): boolean {
  if (hasSchoolWideScope(ctx) && ctx.can('notices', 'create')) return true;
  const roles = a?.roles ?? [];
  const classes = a?.classIds ?? [];
  if (roles.length && !roles.includes(ctx.user.role)) return false;
  if (classes.length && !classes.some((c) => classIds.includes(c))) return false;
  return true;
}

export const GET = route({ module: 'notices' }, async (ctx) => {
  const manager = ctx.can('notices', 'edit') || (ctx.can('notices', 'create') && hasSchoolWideScope(ctx));
  const rows = await ctx.db.notice.findMany({
    where: manager ? {} : { publishAt: { lte: new Date() }, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
    orderBy: [{ isPinned: 'desc' }, { publishAt: 'desc' }],
    take: 200,
  });
  const classIds = await myClassIds(ctx);
  const classes = await ctx.db.class.findMany({ select: { id: true, name: true } });
  return rows
    .filter((n) => manager || n.createdById === ctx.user.id || visibleTo(ctx, n.audience as Audience, classIds))
    .map((n) => {
      const a = (n.audience as Audience) ?? {};
      return { ...n, audienceLabel: [a.roles?.length ? a.roles.map((r) => r.toLowerCase()).join(', ') : 'Everyone', a.classIds?.length ? `Classes ${a.classIds.map((c) => classes.find((x) => x.id === c)?.name).filter(Boolean).join(', ')}` : ''].filter(Boolean).join(' · '), scheduled: n.publishAt > new Date(), expired: !!n.expiresAt && n.expiresAt < new Date() };
    });
});

export const POST = route({ module: 'notices', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      title: z.string().trim().min(3).max(150),
      body: z.string().trim().min(3).max(10000),
      category: z.enum(['GENERAL', 'EXAM', 'FEE', 'EVENT', 'HOLIDAY', 'URGENT']).default('GENERAL'),
      roles: z.array(z.enum(ROLES as unknown as [string, ...string[]])).max(12).default([]),
      classIds: z.array(z.string()).max(50).default([]),
      isPinned: z.boolean().default(false),
      publishAt: z.string().optional().nullable(),
      expiresAt: z.string().optional().nullable(),
      sms: z.boolean().default(false),
    })
  );
  if (ctx.user.role === 'TEACHER') {
    // Teachers address only their own classes' students and parents.
    const mine = await myClassIds(ctx);
    if (!input.classIds.length || input.classIds.some((c) => !mine.includes(c))) throw forbidden('Teachers can post notices only to their own classes.');
    if (input.roles.some((r) => r !== 'PARENT' && r !== 'STUDENT')) throw forbidden('Teachers can address students and parents only.');
    if (input.isPinned || input.sms) throw forbidden('Only administrators can pin notices or send SMS.');
  }
  const publishAt = input.publishAt ? new Date(input.publishAt) : new Date();
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (expiresAt && expiresAt <= publishAt) throw badRequest('Expiry must be after the publish time.');
  const n = await ctx.db.notice.create({
    data: { schoolId: ctx.user.schoolId, title: input.title, body: input.body, category: input.category, audience: { roles: input.roles, classIds: input.classIds }, isPinned: input.isPinned, publishAt, expiresAt, createdById: ctx.user.id, createdByName: ctx.user.name },
  });

  // Resolve recipients once and notify them (in-app; SMS optional for admins).
  const roleFilter = (input.roles.length ? input.roles : ROLES) as Role[];
  const users = await ctx.db.user.findMany({
    where: {
      isActive: true,
      role: { in: roleFilter },
      ...(input.classIds.length
        ? { OR: [{ student: { classId: { in: input.classIds } } }, { guardian: { students: { some: { classId: { in: input.classIds } } } } }, { role: { notIn: ['PARENT', 'STUDENT'] } }] }
        : {}),
    },
    select: { id: true, phone: true, name: true, role: true },
  });
  if (publishAt <= new Date()) await notifyUsers(ctx.db, ctx.user.schoolId, users.map((u) => u.id), { title: `📢 ${input.title}`, body: input.body.slice(0, 180), link: '/notices' });
  let sms = 0;
  if (input.sms) sms = await queueMessages(ctx, 'SMS', users.filter((u) => u.role === 'PARENT').map((u) => ({ recipient: u.phone, recipientName: u.name, body: `${input.title}: ${input.body.slice(0, 120)} - ${ctx.school.name}` })));
  await ctx.audit('CREATE', 'Notice', n.id, `${input.title} → ${users.length} users${sms ? `, ${sms} SMS` : ''}`);
  return { ...n, recipients: users.length, sms };
});
