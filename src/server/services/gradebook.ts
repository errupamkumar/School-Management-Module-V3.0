import { gradeFor, type GradeRow } from './exams';

/**
 * Gradebook: one weighted score per subject across several exams (e.g.
 * Periodic Test 20% + Half-yearly 30% + Annual 50%). An exam where the student
 * has no mark for a subject is left out of that subject's weighting rather than
 * counted as zero; an absence counts as zero.
 */
export interface ExamSlice {
  examId: string;
  weight: number;
  subjects: Array<{ id: string; name: string; maxMarks: number }>;
  results: Array<{ studentId: string; name: string; rollNo: string | null; admissionNo: string; percentage: number; subjects: Array<{ subjectId: string; maxMarks: number; marks: number | null; isAbsent: boolean }> }>;
}

export interface GradebookRow {
  studentId: string;
  name: string;
  rollNo: string | null;
  admissionNo: string;
  subjects: Record<string, { percent: number | null; grade: string | null }>;
  overall: number | null;
  grade: string | null;
  rank: number | null;
}

export function weightedGradebook(slices: ExamSlice[], scale: GradeRow[]): { subjects: Array<{ id: string; name: string }>; rows: GradebookRow[] } {
  const subjects = new Map<string, string>();
  slices.forEach((s) => s.subjects.forEach((x) => subjects.set(x.id, x.name)));
  const students = new Map<string, { name: string; rollNo: string | null; admissionNo: string }>();
  slices.forEach((s) => s.results.forEach((r) => students.set(r.studentId, { name: r.name, rollNo: r.rollNo, admissionNo: r.admissionNo })));

  const rows: GradebookRow[] = [...students].map(([studentId, st]) => {
    const subj: GradebookRow['subjects'] = {};
    let overallW = 0;
    let overallSum = 0;
    for (const [sid] of subjects) {
      let w = 0;
      let sum = 0;
      for (const s of slices) {
        const r = s.results.find((x) => x.studentId === studentId);
        const m = r?.subjects.find((x) => x.subjectId === sid);
        if (!m || !m.maxMarks || (m.marks === null && !m.isAbsent)) continue;
        const pct = m.isAbsent ? 0 : (Number(m.marks) / m.maxMarks) * 100;
        w += s.weight;
        sum += s.weight * pct;
      }
      const percent = w ? Math.round((sum / w) * 100) / 100 : null;
      subj[sid] = { percent, grade: percent === null ? null : gradeFor(percent, scale)?.grade ?? null };
      if (percent !== null) {
        overallW += 1;
        overallSum += percent;
      }
    }
    const overall = overallW ? Math.round((overallSum / overallW) * 100) / 100 : null;
    return { studentId, ...st, subjects: subj, overall, grade: overall === null ? null : gradeFor(overall, scale)?.grade ?? null, rank: null };
  });

  const ranked = rows.filter((r) => r.overall !== null).sort((a, b) => b.overall! - a.overall!);
  ranked.forEach((r, i) => {
    r.rank = i > 0 && ranked[i - 1].overall === r.overall ? ranked[i - 1].rank : i + 1;
  });
  rows.sort((a, b) => (a.rollNo ?? '').localeCompare(b.rollNo ?? '', undefined, { numeric: true }) || a.name.localeCompare(b.name));
  return { subjects: [...subjects].map(([id, name]) => ({ id, name })), rows };
}
