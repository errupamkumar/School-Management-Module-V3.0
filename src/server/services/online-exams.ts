/**
 * Online exams: questions are copied from the question bank when the exam is
 * written, so later edits to the bank never change a running exam. Objective
 * questions (MCQ, true/false, fill in the blank) are marked automatically;
 * short and long answers wait for the teacher.
 */
export interface ExamQuestion {
  id: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'FILL_BLANK' | 'SHORT' | 'LONG';
  text: string;
  options: string[];
  answer: string | null;
  marks: number;
}

export const OBJECTIVE = new Set(['MCQ', 'TRUE_FALSE', 'FILL_BLANK']);

export function readQuestions(raw: unknown): ExamQuestion[] {
  return Array.isArray(raw) ? (raw as ExamQuestion[]) : [];
}

/** Index of the correct MCQ option from the bank's answer: "B", "2" (1-based) or the option text. */
export function mcqCorrectIndex(options: string[], answer: string | null): number | null {
  const a = (answer ?? '').trim();
  if (!a) return null;
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const byText = options.findIndex((o) => norm(o) === norm(a));
  if (byText >= 0) return byText;
  const letter = /^\(?([a-f])\)?[.)]?$/i.exec(a);
  if (letter) {
    const i = letter[1].toLowerCase().charCodeAt(0) - 97;
    return i < options.length ? i : null;
  }
  const num = /^(\d)$/.exec(a);
  if (num) {
    const i = Number(num[1]) - 1;
    return i >= 0 && i < options.length ? i : null;
  }
  return null;
}

function truthy(v: string): boolean | null {
  const s = v.trim().toLowerCase();
  if (['true', 't', 'yes', 'y', 'सही'].includes(s)) return true;
  if (['false', 'f', 'no', 'n', 'गलत'].includes(s)) return false;
  return null;
}

/** null = needs a teacher (descriptive) or the bank has no usable key. */
export function isCorrect(q: ExamQuestion, given: string | undefined): boolean | null {
  if (!OBJECTIVE.has(q.type)) return null;
  const g = (given ?? '').trim();
  if (!g) return false;
  if (q.type === 'MCQ') {
    const right = mcqCorrectIndex(q.options, q.answer);
    return right === null ? null : Number(g) === right;
  }
  if (q.type === 'TRUE_FALSE') {
    const right = truthy(q.answer ?? '');
    return right === null ? null : truthy(g) === right;
  }
  // Fill in the blank: case/space-insensitive; alternatives separated by "|".
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const keys = (q.answer ?? '').split('|').map(norm).filter(Boolean);
  return keys.length ? keys.includes(norm(g)) : null;
}

export interface Graded {
  autoScore: number;
  needsManual: boolean;
  perQuestion: Array<{ id: string; correct: boolean | null; awarded: number | null }>;
}

/**
 * Marks objective answers. A wrong (not blank) objective answer loses
 * `negative` marks; the total never goes below zero.
 */
export function gradeAttempt(questions: ExamQuestion[], answers: Record<string, string>, negative = 0): Graded {
  let auto = 0;
  let needsManual = false;
  const perQuestion = questions.map((q) => {
    const given = answers[q.id];
    const ok = isCorrect(q, given);
    if (ok === null) {
      if (!OBJECTIVE.has(q.type) && (given ?? '').trim()) needsManual = true;
      return { id: q.id, correct: null, awarded: OBJECTIVE.has(q.type) ? 0 : (given ?? '').trim() ? null : 0 };
    }
    const blank = !(given ?? '').trim();
    const awarded = ok ? q.marks : blank ? 0 : -negative;
    auto += awarded;
    return { id: q.id, correct: ok, awarded };
  });
  return { autoScore: Math.max(0, Math.round(auto * 100) / 100), needsManual, perQuestion };
}

/** Fisher–Yates with an injectable random source (tests pass a seeded one). */
export function shuffled<T>(items: T[], rand: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Seconds of grace after the deadline for answers already in flight. */
export const GRACE_MS = 30_000;

/** When an attempt must end: the duration from its start, but never after the exam window closes. */
export function attemptDeadline(startedAt: Date, durationMins: number, endsAt: Date): Date {
  return new Date(Math.min(startedAt.getTime() + durationMins * 60_000, endsAt.getTime()));
}

/** Questions as the student sees them: no answer key. */
export function forStudent(q: ExamQuestion) {
  return { id: q.id, type: q.type, text: q.text, options: q.type === 'MCQ' ? q.options : q.type === 'TRUE_FALSE' ? ['True', 'False'] : [], marks: q.marks };
}
