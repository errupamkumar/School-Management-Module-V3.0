import { z } from 'zod';
import { badRequest, forbidden, query, route } from '@/server/api';
import { classLabel, displayName } from '@/server/common';
import { assertSectionAccess, assertStudentAccess } from '@/server/scope';
import { computeClassResults, loadGradeScale } from '@/server/services/exams';

/**
 * Report card data for one student or a whole section, across 1–4 exams.
 * ?examIds=a,b&studentId=…  |  ?examIds=a&sectionId=…
 */
export const GET = route({ module: 'exams' }, async (ctx, req) => {
  const q = query(req, z.object({ examIds: z.string().min(1), studentId: z.string().optional(), sectionId: z.string().optional() }));
  const examIds = q.examIds.split(',').filter(Boolean).slice(0, 4);
  const exams = await ctx.db.exam.findMany({ where: { id: { in: examIds } }, orderBy: { startDate: 'asc' } });
  if (exams.length !== examIds.length) throw badRequest('Unknown exam.');
  const family = ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT';
  if (family && exams.some((e) => !e.isPublished)) throw forbidden('Results are not published yet.');

  let studentIds: string[];
  let classId: string;
  if (q.studentId) {
    await assertStudentAccess(ctx, q.studentId);
    const s = await ctx.db.student.findUniqueOrThrow({ where: { id: q.studentId }, select: { classId: true } });
    studentIds = [q.studentId];
    classId = s.classId;
  } else if (q.sectionId && !family) {
    await assertSectionAccess(ctx, q.sectionId);
    const sec = await ctx.db.section.findUniqueOrThrow({ where: { id: q.sectionId }, select: { classId: true } });
    classId = sec.classId;
    studentIds = (await ctx.db.student.findMany({ where: { sectionId: q.sectionId, status: 'ACTIVE' }, select: { id: true }, orderBy: [{ rollNo: 'asc' }, { firstName: 'asc' }] })).map((s) => s.id);
  } else throw badRequest('Choose a student or a section.');

  const [school, students, grades, perExam] = await Promise.all([
    ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { name: true, logoUrl: true, address: true, city: true, state: true, pincode: true, phone: true, email: true, affiliationNo: true, board: true, udiseCode: true } }),
    ctx.db.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, firstName: true, lastName: true, admissionNo: true, rollNo: true, dob: true, photoUrl: true, class: { select: { name: true } }, section: { select: { name: true, classTeacher: { select: { firstName: true, lastName: true } } } }, guardian: { select: { fatherName: true, motherName: true } } },
    }),
    loadGradeScale(ctx.db),
    Promise.all(exams.map((e) => computeClassResults(ctx.db, ctx.school.settings, e.id, classId))),
  ]);

  const year = await ctx.db.academicYear.findFirst({ where: { name: exams[0].academicYear } });
  const [attendance, ratings, remarks] = await Promise.all([
    ctx.db.studentAttendance.groupBy({ by: ['studentId', 'status'], where: { studentId: { in: studentIds }, ...(year ? { date: { gte: year.startDate, lte: year.endDate } } : {}) }, _count: true }),
    ctx.db.behaviourRating.findMany({ where: { studentId: { in: studentIds } } }),
    ctx.db.studentRemark.findMany({ where: { studentId: { in: studentIds }, examId: { in: examIds }, category: 'REPORT_CARD' }, select: { studentId: true, examId: true, text: true } }),
  ]);

  const ordered = studentIds.map((id) => students.find((s) => s.id === id)!).filter(Boolean);
  return {
    school,
    academicYear: exams[0].academicYear,
    exams: exams.map((e, i) => ({ id: e.id, name: e.name, subjects: perExam[i].subjects })),
    grades,
    settings: ctx.school.settings.exams,
    cards: ordered.map((s) => {
      const att = attendance.filter((a) => a.studentId === s.id);
      const total = att.filter((a) => a.status !== 'HOLIDAY').reduce((a, x) => a + x._count, 0);
      const present = att.filter((a) => ['PRESENT', 'LATE', 'HALF_DAY'].includes(a.status)).reduce((a, x) => a + x._count, 0);
      return {
        studentId: s.id,
        name: displayName(s),
        admissionNo: s.admissionNo,
        rollNo: s.rollNo,
        dob: s.dob,
        photoUrl: s.photoUrl,
        classLabel: classLabel(s.class, s.section),
        classTeacher: s.section.classTeacher ? displayName(s.section.classTeacher) : null,
        fatherName: s.guardian?.fatherName ?? null,
        motherName: s.guardian?.motherName ?? null,
        attendance: { present, total },
        results: perExam.map((r) => r.results.find((x) => x.studentId === s.id) ?? null),
        ratings: ratings.filter((r) => r.studentId === s.id).map((r) => ({ term: r.term, category: r.category, trait: r.trait, rating: r.rating })),
        // The latest exam's remark first (report cards print one).
        remark: exams.map((e) => remarks.find((r) => r.studentId === s.id && r.examId === e.id)?.text).filter(Boolean).pop() ?? null,
      };
    }),
  };
});
