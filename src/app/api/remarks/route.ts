import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { badRequest, body, forbidden, query, route } from '@/server/api';
import { classLabel, displayName } from '@/server/common';
import { assertSectionAccess, assertStudentAccess, studentWhere } from '@/server/scope';

const FAMILY = ['PARENT', 'STUDENT'];

/**
 * Teacher remarks. `?studentId=` lists a student's remarks (families see shared
 * ones only). `?examId=&sectionId=` returns the section's report-card remarks
 * for that exam, one row per student, for bulk entry.
 */
export const GET = route({ anyOf: [{ module: 'exams' }, { module: 'behaviour' }] }, async (ctx, req) => {
  const q = query(req, z.object({ studentId: z.string().optional(), examId: z.string().optional(), sectionId: z.string().optional() }));
  if (q.examId && q.sectionId) {
    if (FAMILY.includes(ctx.user.role)) throw forbidden();
    await assertSectionAccess(ctx, q.sectionId);
    const [students, remarks] = await Promise.all([
      ctx.db.student.findMany({ where: { sectionId: q.sectionId, status: 'ACTIVE' }, orderBy: [{ rollNo: 'asc' }, { firstName: 'asc' }], select: { id: true, firstName: true, lastName: true, rollNo: true, admissionNo: true } }),
      ctx.db.studentRemark.findMany({ where: { examId: q.examId, category: 'REPORT_CARD', student: { sectionId: q.sectionId } } }),
    ]);
    return students.map((s) => ({ studentId: s.id, name: displayName(s), rollNo: s.rollNo, admissionNo: s.admissionNo, text: remarks.find((r) => r.studentId === s.id)?.text ?? '' }));
  }
  if (!q.studentId) throw badRequest('Choose a student, or an exam and section.');
  await assertStudentAccess(ctx, q.studentId);
  const where: Prisma.StudentRemarkWhereInput = { studentId: q.studentId, student: await studentWhere(ctx), ...(FAMILY.includes(ctx.user.role) ? { visibleToFamily: true } : {}) };
  const rows = await ctx.db.studentRemark.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200, include: { student: { select: { firstName: true, lastName: true, class: { select: { name: true } }, section: { select: { name: true } } } } } });
  const exams = await ctx.db.exam.findMany({ where: { id: { in: rows.map((r) => r.examId).filter((x): x is string => !!x) } }, select: { id: true, name: true } });
  return rows.map((r) => ({ ...r, studentName: displayName(r.student), classLabel: classLabel(r.student.class, r.student.section), examName: exams.find((e) => e.id === r.examId)?.name ?? null, mine: r.authorId === ctx.user.id }));
});

/**
 * Report-card remarks in bulk (`examId` + `entries`, needs Exams edit) or one
 * general remark (`studentId` + `category`, needs Behaviour create).
 */
export const POST = route({ anyOf: [{ module: 'exams', action: 'edit' }, { module: 'behaviour', action: 'create' }] }, async (ctx, req) => {
  const input = await body(
    req,
    z.union([
      z.object({ examId: z.string().min(1), entries: z.array(z.object({ studentId: z.string().min(1), text: z.string().trim().max(500) })).min(1).max(200) }),
      z.object({ studentId: z.string().min(1), category: z.enum(['GENERAL', 'ACADEMIC', 'CONDUCT']), text: z.string().trim().min(2).max(2000), visibleToFamily: z.boolean().default(true) }),
    ])
  );
  if ('examId' in input) {
    if (!ctx.can('exams', 'edit')) throw forbidden();
    const exam = await ctx.db.exam.findUnique({ where: { id: input.examId }, select: { id: true, name: true } });
    if (!exam) throw badRequest('Unknown exam.');
    for (const e of input.entries) await assertStudentAccess(ctx, e.studentId);
    let saved = 0;
    await ctx.db.$transaction(async (tx) => {
      for (const e of input.entries) {
        // One report-card remark per student per exam (unique key), so concurrent saves cannot duplicate it.
        const key = { studentId_examId_category: { studentId: e.studentId, examId: exam.id, category: 'REPORT_CARD' } };
        if (!e.text) {
          await tx.studentRemark.deleteMany({ where: { studentId: e.studentId, examId: exam.id, category: 'REPORT_CARD' } });
          continue;
        }
        await tx.studentRemark.upsert({
          where: key,
          update: { text: e.text, authorId: ctx.user.id, authorName: ctx.user.name },
          create: { schoolId: ctx.user.schoolId, studentId: e.studentId, examId: exam.id, category: 'REPORT_CARD', text: e.text, authorId: ctx.user.id, authorName: ctx.user.name },
        });
        saved++;
      }
    });
    await ctx.audit('UPDATE', 'StudentRemark', exam.id, `Report-card remarks for ${exam.name}: ${saved}`);
    return { saved };
  }
  if (!ctx.can('behaviour', 'create')) throw forbidden();
  await assertStudentAccess(ctx, input.studentId);
  const row = await ctx.db.studentRemark.create({ data: { schoolId: ctx.user.schoolId, studentId: input.studentId, category: input.category, text: input.text, visibleToFamily: input.visibleToFamily, authorId: ctx.user.id, authorName: ctx.user.name } });
  await ctx.audit('CREATE', 'StudentRemark', row.id, `${input.category} remark`);
  return row;
});

/** Remove a remark: ?id= (its author, or anyone with Behaviour delete). */
export const DELETE = route({ anyOf: [{ module: 'exams', action: 'edit' }, { module: 'behaviour', action: 'create' }] }, async (ctx, req) => {
  const id = req.nextUrl.searchParams.get('id') ?? '';
  const r = await ctx.db.studentRemark.findUnique({ where: { id } });
  if (!r) throw badRequest('Unknown remark.');
  if (r.authorId !== ctx.user.id && !ctx.can('behaviour', 'delete')) throw forbidden();
  await ctx.db.studentRemark.delete({ where: { id } });
  await ctx.audit('DELETE', 'StudentRemark', id);
  return { deleted: true };
});
