import { z } from 'zod';
import { body, forbidden, route, type Ctx } from '@/server/api';
import { displayName } from '@/server/common';
import { hasSchoolWideScope, teacherSectionIds } from '@/server/scope';
import { notifyUsers } from '@/server/services/notify';

async function loadForStaff(ctx: Ctx, id: string) {
  const hw = await ctx.db.homework.findUniqueOrThrow({ where: { id } });
  if (ctx.user.role === 'TEACHER') {
    const secs = await teacherSectionIds(ctx);
    if (hw.createdById !== ctx.user.id && !(hw.sectionId && secs.includes(hw.sectionId))) throw forbidden();
  } else if (!hasSchoolWideScope(ctx)) throw forbidden();
  return hw;
}

/** Roster with submission status for a homework. */
export const GET = route({ module: 'homework' }, async (ctx, _req, { id }) => {
  const hw = await loadForStaff(ctx, id);
  const [students, subs] = await Promise.all([
    ctx.db.student.findMany({ where: { classId: hw.classId, ...(hw.sectionId ? { sectionId: hw.sectionId } : {}), status: 'ACTIVE' }, select: { id: true, firstName: true, lastName: true, rollNo: true } }),
    ctx.db.homeworkSubmission.findMany({ where: { homeworkId: id } }),
  ]);
  const files = await ctx.db.storedFile.findMany({ where: { id: { in: subs.map((s) => s.attachmentId).filter(Boolean) as string[] } }, select: { id: true, fileName: true } });
  students.sort((a, b) => (Number(a.rollNo) || 9999) - (Number(b.rollNo) || 9999));
  return students.map((s) => {
    const sub = subs.find((x) => x.studentId === s.id);
    return { studentId: s.id, name: displayName(s), rollNo: s.rollNo, submission: sub ? { ...sub, attachment: files.find((f) => f.id === sub.attachmentId) ?? null } : null };
  });
});

/** Teacher review: mark checked or ask to redo, with feedback. */
export const PATCH = route({ module: 'homework', action: 'create' }, async (ctx, req, { id }) => {
  await loadForStaff(ctx, id);
  const input = await body(req, z.object({ studentId: z.string(), status: z.enum(['CHECKED', 'REDO']), feedback: z.string().trim().max(1000).optional().nullable() }));
  const sub = await ctx.db.homeworkSubmission.update({ where: { homeworkId_studentId: { homeworkId: id, studentId: input.studentId } }, data: { status: input.status, feedback: input.feedback ?? null } });
  const s = await ctx.db.student.findUnique({ where: { id: input.studentId }, select: { userId: true, guardian: { select: { userId: true } } } });
  await notifyUsers(ctx.db, ctx.user.schoolId, [s?.userId, s?.guardian?.userId], { title: input.status === 'CHECKED' ? 'Homework checked ✓' : 'Homework needs to be redone', body: input.feedback ?? '', link: '/homework' });
  return sub;
});
