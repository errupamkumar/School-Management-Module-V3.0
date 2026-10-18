import { z } from 'zod';
import { badRequest, body, forbidden, route } from '@/server/api';
import { zDate } from '@/server/crud';
import { ownClassSectionPairs } from '@/server/scope';
import { notifyFamilies } from '@/server/services/notify';

const FAMILY = ['PARENT', 'STUDENT'];

/**
 * Staff: every drive with application counts. Students: open drives they are
 * eligible for, plus drives they applied to. Parents: their children's applications.
 */
export const GET = route({ module: 'placements' }, async (ctx) => {
  const family = FAMILY.includes(ctx.user.role);
  const drives = await ctx.db.placementDrive.findMany({ orderBy: [{ status: 'asc' }, { driveDate: 'desc' }], take: 300, include: { _count: { select: { applications: true } }, applications: { where: { status: 'SELECTED' }, select: { id: true } } } });
  if (!family) return drives.map(({ applications, ...d }) => ({ ...d, selected: applications.length }));
  const pairs = await ownClassSectionPairs(ctx);
  const mine = await ctx.db.placementApplication.findMany({ where: { studentId: { in: pairs.map((p) => p.studentId) } }, select: { id: true, driveId: true, studentId: true, status: true, note: true, createdAt: true } });
  const classIds = pairs.map((p) => p.classId);
  return drives
    .filter((d) => mine.some((m) => m.driveId === d.id) || (ctx.user.role === 'STUDENT' && d.status === 'OPEN' && (!Array.isArray(d.eligibleClassIds) || !(d.eligibleClassIds as string[]).length || (d.eligibleClassIds as string[]).some((c) => classIds.includes(c)))))
    .map(({ applications: _a, _count: _c, ...d }) => ({ ...d, myApplications: mine.filter((m) => m.driveId === d.id) }));
});

export const POST = route({ module: 'placements', action: 'create' }, async (ctx, req) => {
  if (FAMILY.includes(ctx.user.role)) throw forbidden('Students apply from the drive list.');
  const input = await body(
    req,
    z.object({
      company: z.string().trim().min(2).max(120),
      role: z.string().trim().min(2).max(120),
      description: z.string().trim().max(5000).optional().nullable(),
      location: z.string().trim().max(120).optional().nullable(),
      packageInfo: z.string().trim().max(120).optional().nullable(),
      driveDate: zDate.optional().nullable(),
      applyBy: zDate.optional().nullable(),
      eligibleClassIds: z.array(z.string()).max(30).default([]),
      notify: z.boolean().default(true),
    })
  );
  if (input.eligibleClassIds.length && (await ctx.db.class.count({ where: { id: { in: input.eligibleClassIds } } })) !== new Set(input.eligibleClassIds).size) throw badRequest('Unknown class.');
  const d = (v?: string | null) => (v ? new Date(`${v}T00:00:00.000Z`) : null);
  const row = await ctx.db.placementDrive.create({
    data: { schoolId: ctx.user.schoolId, company: input.company, role: input.role, description: input.description ?? null, location: input.location ?? null, packageInfo: input.packageInfo ?? null, driveDate: d(input.driveDate), applyBy: d(input.applyBy), eligibleClassIds: input.eligibleClassIds },
  });
  if (input.notify) {
    const students = await ctx.db.student.findMany({ where: { status: 'ACTIVE', ...(input.eligibleClassIds.length ? { classId: { in: input.eligibleClassIds } } : {}) }, select: { id: true }, take: 5000 });
    await notifyFamilies(ctx.db, ctx.user.schoolId, students.map((s) => s.id), { title: `Placement drive: ${input.company}`, body: `${input.role}${input.applyBy ? ` · apply by ${input.applyBy}` : ''}`, link: '/placements' }, { includeStudents: true });
  }
  await ctx.audit('CREATE', 'PlacementDrive', row.id, `${input.company} — ${input.role}`);
  return row;
});
