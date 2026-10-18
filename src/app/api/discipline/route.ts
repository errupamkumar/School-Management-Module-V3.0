import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { badRequest, body, query, route } from '@/server/api';
import { classLabel, dayUTC, displayName } from '@/server/common';
import { zDate } from '@/server/crud';
import { assertStudentAccess, studentWhere } from '@/server/scope';
import { notifyFamilies } from '@/server/services/notify';

const FAMILY = ['PARENT', 'STUDENT'];

/** Incident register. Teachers see their sections; families see only incidents shared with them. */
export const GET = route({ module: 'discipline' }, async (ctx, req) => {
  const q = query(req, z.object({ studentId: z.string().optional(), status: z.enum(['OPEN', 'ACTION_TAKEN', 'RESOLVED', 'ACTIVE']).optional(), severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(), from: zDate.optional(), to: zDate.optional() }));
  const family = FAMILY.includes(ctx.user.role);
  if (q.studentId) await assertStudentAccess(ctx, q.studentId);
  const and: Prisma.DisciplineIncidentWhereInput[] = [{ student: await studentWhere(ctx) }];
  if (family) and.push({ visibleToFamily: true });
  if (q.studentId) and.push({ studentId: q.studentId });
  if (q.status === 'ACTIVE') and.push({ status: { in: ['OPEN', 'ACTION_TAKEN'] } });
  else if (q.status) and.push({ status: q.status });
  if (q.severity) and.push({ severity: q.severity });
  if (q.from) and.push({ incidentDate: { gte: dayUTC(q.from) } });
  if (q.to) and.push({ incidentDate: { lte: dayUTC(q.to) } });
  const rows = await ctx.db.disciplineIncident.findMany({
    where: { AND: and },
    orderBy: [{ incidentDate: 'desc' }, { createdAt: 'desc' }],
    take: 500,
    include: { student: { select: { firstName: true, lastName: true, admissionNo: true, class: { select: { name: true } }, section: { select: { name: true } } } } },
  });
  return rows.map((r) => ({ ...r, studentName: displayName(r.student), classLabel: classLabel(r.student.class, r.student.section), ...(family ? { reportedById: undefined } : {}) }));
});

export const POST = route({ module: 'discipline', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      studentId: z.string().min(1),
      incidentDate: zDate,
      category: z.string().trim().min(2).max(40),
      severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      title: z.string().trim().min(3).max(150),
      description: z.string().trim().min(3).max(5000),
      actionTaken: z.string().trim().max(2000).optional().nullable(),
      visibleToFamily: z.boolean().default(true),
      notifyParent: z.boolean().default(true),
    })
  );
  await assertStudentAccess(ctx, input.studentId);
  if (!ctx.school.settings.disciplineCategories.includes(input.category)) throw badRequest('Choose a category from the list (School Settings → Rules).');
  const date = dayUTC(input.incidentDate);
  if (date > new Date()) throw badRequest('The incident date cannot be in the future.');
  const student = await ctx.db.student.findUniqueOrThrow({ where: { id: input.studentId }, select: { firstName: true, lastName: true } });
  const row = await ctx.db.disciplineIncident.create({
    data: {
      schoolId: ctx.user.schoolId,
      studentId: input.studentId,
      incidentDate: date,
      category: input.category,
      severity: input.severity,
      title: input.title,
      description: input.description,
      actionTaken: input.actionTaken ?? null,
      status: input.actionTaken ? 'ACTION_TAKEN' : 'OPEN',
      visibleToFamily: input.visibleToFamily,
      reportedById: ctx.user.id,
      reportedByName: ctx.user.name,
    },
  });
  if (input.visibleToFamily && input.notifyParent) {
    await notifyFamilies(ctx.db, ctx.user.schoolId, [input.studentId], { title: `Discipline note: ${displayName(student)}`, body: `${input.category} — ${input.title}. Please talk to your child and contact the class teacher if needed.`, link: '/discipline' });
  }
  await ctx.audit('CREATE', 'DisciplineIncident', row.id, `${displayName(student)}: ${input.category} (${input.severity})`);
  return row;
});
