import { z } from 'zod';
import { body, query, route } from '@/server/api';
import { displayName } from '@/server/common';
import { assertStudentAccess, studentWhere } from '@/server/scope';
import { notifyFamilies } from '@/server/services/notify';
import { toDate, zDate } from '@/server/crud';

export const GET = route({ module: 'behaviour' }, async (ctx, req) => {
  const q = query(req, z.object({ studentId: z.string().optional() }));
  const family = ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT';
  if (q.studentId) await assertStudentAccess(ctx, q.studentId);
  const rows = await ctx.db.observation.findMany({
    where: { ...(q.studentId ? { studentId: q.studentId } : {}), ...(family ? { shareWithParent: true } : {}) },
    orderBy: { observedOn: 'desc' },
    take: 200,
  });
  const visible = await ctx.db.student.findMany({ where: { AND: [await studentWhere(ctx), { id: { in: rows.map((r) => r.studentId) } }] }, select: { id: true, firstName: true, lastName: true } });
  return rows.filter((r) => visible.some((v) => v.id === r.studentId)).map((r) => ({ ...r, studentName: displayName(visible.find((v) => v.id === r.studentId)!) }));
});

export const POST = route({ module: 'behaviour', action: 'create' }, async (ctx, req) => {
  const input = await body(req, z.object({ studentId: z.string().min(1), kind: z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL']), note: z.string().trim().min(3).max(1000), observedOn: zDate, shareWithParent: z.boolean().default(true) }));
  await assertStudentAccess(ctx, input.studentId);
  const o = await ctx.db.observation.create({ data: { schoolId: ctx.user.schoolId, studentId: input.studentId, kind: input.kind, note: input.note, observedOn: toDate(input.observedOn)!, shareWithParent: input.shareWithParent, createdById: ctx.user.id, createdByName: ctx.user.name } });
  if (input.shareWithParent) await notifyFamilies(ctx.db, ctx.user.schoolId, [input.studentId], { title: input.kind === 'POSITIVE' ? '⭐ Appreciation from school' : 'Note from the teacher', body: input.note.slice(0, 160), link: '/behaviour' });
  await ctx.audit('CREATE', 'Observation', o.id, `${input.kind} for ${input.studentId}`);
  return o;
});
