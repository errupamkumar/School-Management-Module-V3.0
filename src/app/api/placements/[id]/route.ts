import { z } from 'zod';
import { badRequest, body, conflict, forbidden, notFound, route } from '@/server/api';
import { classLabel, displayName } from '@/server/common';
import { zDate } from '@/server/crud';
import { notifyFamilies } from '@/server/services/notify';

const FAMILY = ['PARENT', 'STUDENT'];

/** Drive with its applicants (staff). */
export const GET = route({ module: 'placements' }, async (ctx, _req, { id }) => {
  if (FAMILY.includes(ctx.user.role)) throw forbidden();
  const d = await ctx.db.placementDrive.findUnique({
    where: { id },
    include: { applications: { orderBy: { createdAt: 'asc' }, include: { student: { select: { firstName: true, lastName: true, admissionNo: true, class: { select: { name: true } }, section: { select: { name: true } }, guardian: { select: { primaryPhone: true } } } } } } },
  });
  if (!d) throw notFound('Drive');
  return { ...d, applications: d.applications.map((a) => ({ ...a, studentName: displayName(a.student), classLabel: classLabel(a.student.class, a.student.section) })) };
});

export const PUT = route({ module: 'placements', action: 'edit' }, async (ctx, req, { id }) => {
  if (FAMILY.includes(ctx.user.role)) throw forbidden();
  const input = await body(
    req,
    z
      .object({
        company: z.string().trim().min(2).max(120),
        role: z.string().trim().min(2).max(120),
        description: z.string().trim().max(5000).nullable(),
        location: z.string().trim().max(120).nullable(),
        packageInfo: z.string().trim().max(120).nullable(),
        driveDate: zDate.nullable(),
        applyBy: zDate.nullable(),
        eligibleClassIds: z.array(z.string()).max(30),
        status: z.enum(['OPEN', 'CLOSED', 'COMPLETED']),
      })
      .partial()
  );
  const d = (v?: string | null) => (v === undefined ? undefined : v ? new Date(`${v}T00:00:00.000Z`) : null);
  const row = await ctx.db.placementDrive.update({ where: { id }, data: { ...input, driveDate: d(input.driveDate), applyBy: d(input.applyBy) } });
  await ctx.audit('UPDATE', 'PlacementDrive', id, Object.keys(input).join(', '));
  return row;
});

export const DELETE = route({ module: 'placements', action: 'delete' }, async (ctx, _req, { id }) => {
  const d = await ctx.db.placementDrive.findUnique({ where: { id } });
  if (!d) throw notFound('Drive');
  await ctx.db.placementDrive.delete({ where: { id } });
  await ctx.audit('DELETE', 'PlacementDrive', id, d.company);
  return { deleted: true };
});

/** Student applies (create right) — or withdraws with `{ withdraw: true }`. */
export const POST = route({ module: 'placements', action: 'create' }, async (ctx, req, { id }) => {
  if (ctx.user.role !== 'STUDENT' || !ctx.user.studentId) throw forbidden('Students apply for themselves.');
  const input = await body(req, z.object({ withdraw: z.boolean().default(false), note: z.string().trim().max(500).optional().nullable() }));
  const d = await ctx.db.placementDrive.findUnique({ where: { id } });
  if (!d) throw notFound('Drive');
  const existing = await ctx.db.placementApplication.findUnique({ where: { driveId_studentId: { driveId: id, studentId: ctx.user.studentId } } });
  if (input.withdraw) {
    if (!existing || existing.status === 'WITHDRAWN') throw badRequest('You have not applied.');
    if (existing.status === 'SELECTED') throw conflict('You have been selected — contact the placement cell.');
    return ctx.db.placementApplication.update({ where: { id: existing.id }, data: { status: 'WITHDRAWN' } });
  }
  if (d.status !== 'OPEN') throw badRequest('Applications are closed.');
  if (d.applyBy && d.applyBy < new Date(new Date().toISOString().slice(0, 10))) throw badRequest('The last date to apply has passed.');
  const me = await ctx.db.student.findUniqueOrThrow({ where: { id: ctx.user.studentId }, select: { classId: true } });
  const eligible = Array.isArray(d.eligibleClassIds) ? (d.eligibleClassIds as string[]) : [];
  if (eligible.length && !eligible.includes(me.classId)) throw forbidden('This drive is not open to your class.');
  const row = existing
    ? await ctx.db.placementApplication.update({ where: { id: existing.id }, data: { status: 'APPLIED', note: input.note ?? existing.note } })
    : await ctx.db.placementApplication.create({ data: { schoolId: ctx.user.schoolId, driveId: id, studentId: ctx.user.studentId, note: input.note ?? null } });
  await ctx.audit('CREATE', 'PlacementApplication', row.id, `Applied to ${d.company}`);
  return row;
});

/** Placement cell moves an applicant through shortlist → selected / rejected; the family is told. */
export const PATCH = route({ module: 'placements', action: 'edit' }, async (ctx, req, { id }) => {
  if (FAMILY.includes(ctx.user.role)) throw forbidden();
  const input = await body(req, z.object({ applicationId: z.string().min(1), status: z.enum(['APPLIED', 'SHORTLISTED', 'SELECTED', 'REJECTED']), note: z.string().trim().max(500).optional().nullable() }));
  const a = await ctx.db.placementApplication.findFirst({ where: { id: input.applicationId, driveId: id }, include: { drive: { select: { company: true, role: true } } } });
  if (!a) throw notFound('Application');
  const row = await ctx.db.placementApplication.update({ where: { id: a.id }, data: { status: input.status, ...(input.note !== undefined ? { note: input.note } : {}) } });
  if (input.status !== a.status && ['SHORTLISTED', 'SELECTED', 'REJECTED'].includes(input.status)) {
    const msg = { SHORTLISTED: 'You have been shortlisted', SELECTED: 'Congratulations — you have been selected', REJECTED: 'Your application was not taken forward' }[input.status as 'SHORTLISTED'];
    await notifyFamilies(ctx.db, ctx.user.schoolId, [a.studentId], { title: `${a.drive.company}: ${input.status.toLowerCase()}`, body: `${msg} for ${a.drive.role}.`, link: '/placements' }, { includeStudents: true });
  }
  await ctx.audit('UPDATE', 'PlacementApplication', a.id, `${a.drive.company}: ${input.status}`);
  return row;
});
