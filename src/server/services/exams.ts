import type { TenantDb } from '../db';
import type { SchoolSettings } from '../settings';

export const DEFAULT_GRADES = [
  { grade: 'A1', minPercent: 91, maxPercent: 100, gradePoint: 10, remark: 'Outstanding', isPass: true },
  { grade: 'A2', minPercent: 81, maxPercent: 90.99, gradePoint: 9, remark: 'Excellent', isPass: true },
  { grade: 'B1', minPercent: 71, maxPercent: 80.99, gradePoint: 8, remark: 'Very Good', isPass: true },
  { grade: 'B2', minPercent: 61, maxPercent: 70.99, gradePoint: 7, remark: 'Good', isPass: true },
  { grade: 'C1', minPercent: 51, maxPercent: 60.99, gradePoint: 6, remark: 'Above Average', isPass: true },
  { grade: 'C2', minPercent: 41, maxPercent: 50.99, gradePoint: 5, remark: 'Average', isPass: true },
  { grade: 'D', minPercent: 33, maxPercent: 40.99, gradePoint: 4, remark: 'Pass', isPass: true },
  { grade: 'E', minPercent: 0, maxPercent: 32.99, gradePoint: 0, remark: 'Needs Improvement', isPass: false },
];

export interface GradeRow {
  grade: string;
  minPercent: number;
  maxPercent: number;
  remark?: string | null;
  isPass: boolean;
}

export function gradeFor(percent: number, scale: GradeRow[]): GradeRow | null {
  const p = Math.round(percent * 100) / 100;
  return scale.find((g) => p >= g.minPercent && p <= g.maxPercent) ?? null;
}

export async function loadGradeScale(db: TenantDb): Promise<GradeRow[]> {
  const rows = await db.gradeScale.findMany({ orderBy: { minPercent: 'desc' } });
  if (!rows.length) return DEFAULT_GRADES;
  return rows.map((r) => ({ grade: r.grade, minPercent: Number(r.minPercent), maxPercent: Number(r.maxPercent), remark: r.remark, isPass: r.isPass }));
}

export interface SubjectResult {
  subjectId: string;
  subjectName: string;
  maxMarks: number;
  passMarks: number;
  marks: number | null;
  isAbsent: boolean;
  passed: boolean;
  grade: string | null;
}

export interface StudentResult {
  studentId: string;
  admissionNo: string;
  rollNo: string | null;
  name: string;
  sectionName: string;
  subjects: SubjectResult[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
  grade: string | null;
  remark: string | null;
  failedSubjects: number;
  result: 'PASS' | 'FAIL' | 'INCOMPLETE';
  rank: number | null;
}

export async function computeClassResults(
  db: TenantDb,
  settings: SchoolSettings,
  examId: string,
  classId: string,
  opts: { sectionId?: string; studentIds?: string[] } = {}
): Promise<{ subjects: Array<{ id: string; name: string; maxMarks: number; passMarks: number }>; results: StudentResult[] }> {
  const [schedules, students, marks, scale] = await Promise.all([
    db.examSchedule.findMany({ where: { examId, classId }, orderBy: { date: 'asc' } }),
    db.student.findMany({
      where: {
        classId,
        status: 'ACTIVE',
        ...(opts.sectionId ? { sectionId: opts.sectionId } : {}),
        ...(opts.studentIds ? { id: { in: opts.studentIds } } : {}),
      },
      select: { id: true, admissionNo: true, rollNo: true, firstName: true, lastName: true, section: { select: { name: true } } },
      orderBy: [{ section: { name: 'asc' } }, { rollNo: 'asc' }, { firstName: 'asc' }],
    }),
    db.examMark.findMany({ where: { examId, classId } }),
    loadGradeScale(db),
  ]);

  const subjectRows = await db.subject.findMany({ where: { id: { in: schedules.map((s) => s.subjectId) } }, select: { id: true, name: true } });
  const subjectName = new Map(subjectRows.map((s) => [s.id, s.name]));
  const subjects = schedules.map((s) => ({ id: s.subjectId, name: subjectName.get(s.subjectId) ?? 'Subject', maxMarks: Number(s.maxMarks), passMarks: Number(s.passMarks) }));
  const markMap = new Map(marks.map((m) => [`${m.studentId}:${m.subjectId}`, m]));

  const results: StudentResult[] = students.map((st) => {
    let totalObtained = 0;
    let totalMax = 0;
    let failed = 0;
    let missing = 0;
    const subjectResults: SubjectResult[] = subjects.map((sub) => {
      const m = markMap.get(`${st.id}:${sub.id}`);
      const value = m?.marksObtained != null ? Number(m.marksObtained) : null;
      const isAbsent = m?.isAbsent ?? false;
      if (!m || (value === null && !isAbsent)) missing++;
      const obtained = isAbsent ? 0 : value ?? 0;
      const subjectPercent = sub.maxMarks ? (obtained / sub.maxMarks) * 100 : 0;
      const passed = !isAbsent && obtained >= sub.passMarks && subjectPercent >= settings.exams.subjectPassPercent - 1e-9;
      if (!passed && (m || isAbsent)) failed++;
      totalObtained += obtained;
      totalMax += sub.maxMarks;
      return {
        subjectId: sub.id,
        subjectName: sub.name,
        maxMarks: sub.maxMarks,
        passMarks: sub.passMarks,
        marks: isAbsent ? null : value,
        isAbsent,
        passed,
        grade: m && !isAbsent ? gradeFor(subjectPercent, scale)?.grade ?? null : null,
      };
    });
    const percentage = totalMax ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0;
    const g = gradeFor(percentage, scale);
    let result: StudentResult['result'];
    if (missing > 0) result = 'INCOMPLETE';
    else if (percentage >= settings.exams.overallPassPercent && failed <= settings.exams.maxFailedSubjects) result = 'PASS';
    else result = 'FAIL';
    return {
      studentId: st.id,
      admissionNo: st.admissionNo,
      rollNo: st.rollNo,
      name: `${st.firstName} ${st.lastName ?? ''}`.trim(),
      sectionName: st.section.name,
      subjects: subjectResults,
      totalObtained: Math.round(totalObtained * 100) / 100,
      totalMax,
      percentage,
      grade: g?.grade ?? null,
      remark: g?.remark ?? null,
      failedSubjects: failed,
      result,
      rank: null,
    };
  });

  // Competition ranking ("1, 2, 2, 4") among students with complete results.
  const ranked = results.filter((r) => r.result !== 'INCOMPLETE').sort((a, b) => b.percentage - a.percentage);
  ranked.forEach((r, i) => {
    r.rank = i > 0 && ranked[i - 1].percentage === r.percentage ? ranked[i - 1].rank : i + 1;
  });

  return { subjects, results };
}
