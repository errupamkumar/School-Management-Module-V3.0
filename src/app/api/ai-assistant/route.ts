import { z } from 'zod';
import { HttpError, badRequest, body, route, type Ctx } from '@/server/api';
import { classLabel, todayUTC } from '@/server/common';
import { rateLimit } from '@/server/rate-limit';
import { AiUnavailable, aiProvider, chat, estimateTokens, systemPrompt } from '@/server/services/ai';
import { studentDues } from '@/server/services/fees';
import { guardianStudentIds, hasSchoolWideScope, teacherSectionIds } from '@/server/scope';

const MAX_REPLY_TOKENS = 1200;

const SUGGESTIONS: Record<string, string[]> = {
  STUDENT: ['Explain photosynthesis with a simple diagram in words', 'Give me 5 practice questions on fractions', 'Make a 7-day revision plan for my exams', 'How do I write a formal letter?'],
  PARENT: ["How is my child's attendance this month?", 'What fees are pending?', 'Which exams are coming up?', 'How can I help my child with maths at home?'],
  TEACHER: ['Lesson plan for Class 8 Science: Force and Pressure', 'Create a 20-mark quiz on the water cycle with answers', 'Write report-card remarks for a hardworking but shy student', 'Draft a message to parents about the science fair'],
  ADMIN: ['Draft a circular for the annual sports day', "Summarise today's school KPIs", 'Write a polite fee reminder for parents', 'Checklist for CBSE affiliation renewal'],
  ACCOUNTANT: ['Write a polite fee reminder for parents', 'Explain TDS on contractor payments for schools', 'How should I record a cancelled receipt?'],
};

const today = () => new Date().toISOString().slice(0, 10);

async function usage(ctx: Ctx) {
  const row = await ctx.db.aiUsage.findUnique({ where: { schoolId_userId_day: { schoolId: ctx.user.schoolId, userId: ctx.user.id, day: today() } } });
  const limit = ctx.school.settings.ai.dailyTokenLimitPerUser;
  const used = row?.tokens ?? 0;
  return { limit, used, remaining: Math.max(0, limit - used), requests: row?.requests ?? 0 };
}

/** Read-only facts about this user that make answers specific; scoped exactly like the rest of the app. */
async function context(ctx: Ctx): Promise<Record<string, unknown>> {
  const now = todayUTC();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const base = { today: today(), academicYear: undefined as unknown };
  const ay = await ctx.db.academicYear.findFirst({ where: { isCurrent: true }, select: { name: true } });
  base.academicYear = ay?.name;

  if (ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT') {
    const ids = ctx.user.role === 'PARENT' ? await guardianStudentIds(ctx) : ctx.user.studentId ? [ctx.user.studentId] : [];
    const kids = await ctx.db.student.findMany({ where: { id: { in: ids }, status: 'ACTIVE' }, select: { id: true, firstName: true, classId: true, sectionId: true, class: { select: { name: true } }, section: { select: { name: true } } } });
    const children = [];
    for (const k of kids.slice(0, 5)) {
      const [att, dues, hw, exams] = await Promise.all([
        ctx.db.studentAttendance.groupBy({ by: ['status'], where: { studentId: k.id, date: { gte: monthStart, lte: now }, status: { not: 'HOLIDAY' } }, _count: true }),
        studentDues(ctx.db, [k.id]),
        ctx.db.homework.findMany({ where: { classId: k.classId, OR: [{ sectionId: null }, { sectionId: k.sectionId }], dueOn: { gte: now } }, orderBy: { dueOn: 'asc' }, take: 5, select: { title: true, subjectId: true, dueOn: true } }),
        ctx.db.examSchedule.findMany({ where: { classId: k.classId, date: { gte: now } }, orderBy: { date: 'asc' }, take: 8, select: { subjectId: true, date: true, exam: { select: { name: true } } } }),
      ]);
      const subjects = await ctx.db.subject.findMany({ where: { id: { in: [...hw.map((h) => h.subjectId), ...exams.map((e) => e.subjectId)] } }, select: { id: true, name: true } });
      const sub = (id: string) => subjects.find((s) => s.id === id)?.name ?? '';
      const marked = att.reduce((a, x) => a + x._count, 0);
      const present = att.filter((x) => ['PRESENT', 'LATE'].includes(x.status)).reduce((a, x) => a + x._count, 0) + (att.find((x) => x.status === 'HALF_DAY')?._count ?? 0) * 0.5;
      children.push({
        firstName: k.firstName,
        class: classLabel(k.class, k.section),
        attendanceThisMonth: marked ? `${Math.round((present / marked) * 100)}% (${present}/${marked} days)` : 'not marked yet',
        feesDue: `₹${(dues.totalDue / 100).toLocaleString('en-IN')}`,
        upcomingHomework: hw.map((h) => ({ subject: sub(h.subjectId), title: h.title.slice(0, 80), due: h.dueOn.toISOString().slice(0, 10) })),
        upcomingExams: exams.map((e) => ({ exam: e.exam.name, subject: sub(e.subjectId), date: e.date?.toISOString().slice(0, 10) })),
      });
    }
    return { ...base, children };
  }

  if (ctx.user.role === 'TEACHER') {
    const sectionIds = await teacherSectionIds(ctx);
    const [sections, subjects] = await Promise.all([
      ctx.db.section.findMany({ where: { id: { in: sectionIds } }, select: { name: true, classTeacherId: true, class: { select: { name: true } }, _count: { select: { students: { where: { status: 'ACTIVE' } } } } } }),
      ctx.db.teacherAssignment.findMany({ where: { employeeId: ctx.user.employeeId ?? '__none__' }, select: { subject: { select: { name: true } }, section: { select: { name: true, class: { select: { name: true } } } } } }),
    ]);
    return {
      ...base,
      classTeacherOf: sections.filter((s) => s.classTeacherId === ctx.user.employeeId).map((s) => `${classLabel(s.class, s)} (${s._count.students} students)`),
      teaches: subjects.map((a) => `${a.subject.name} · ${classLabel(a.section.class, a.section)}`),
    };
  }

  if (hasSchoolWideScope(ctx)) {
    const [students, staff, att, collected, due] = await Promise.all([
      ctx.db.student.count({ where: { status: 'ACTIVE' } }),
      ctx.db.employee.count({ where: { status: 'ACTIVE' } }),
      ctx.db.studentAttendance.groupBy({ by: ['status'], where: { date: now }, _count: true }),
      ctx.db.feePayment.aggregate({ where: { status: 'SUCCESS', paidAt: { gte: monthStart } }, _sum: { amount: true } }),
      ctx.db.feeInvoice.aggregate({ where: { status: { in: ['UNPAID', 'PARTIAL'] } }, _sum: { total: true, paidAmount: true } }),
    ]);
    const marked = att.reduce((a, x) => a + x._count, 0);
    const present = att.filter((x) => ['PRESENT', 'LATE', 'HALF_DAY'].includes(x.status)).reduce((a, x) => a + x._count, 0);
    return {
      ...base,
      activeStudents: students,
      activeStaff: staff,
      attendanceToday: marked ? `${Math.round((present / marked) * 100)}% of ${marked} marked` : 'not marked yet',
      feesCollectedThisMonth: `₹${Number(collected._sum.amount ?? 0).toLocaleString('en-IN')}`,
      feesOutstanding: `₹${(Number(due._sum.total ?? 0) - Number(due._sum.paidAmount ?? 0)).toLocaleString('en-IN')}`,
    };
  }
  return base;
}

export const GET = route({ module: 'ai_assistant' }, async (ctx) => {
  // TEMP-DIAG (remove): outbound latency from inside the server process
  const u = await usage(ctx);
  return { configured: !!aiProvider(), enabled: u.limit > 0, dailyLimit: u.limit, usedToday: u.used, remainingToday: u.remaining, suggestions: SUGGESTIONS[ctx.user.role] ?? SUGGESTIONS.ADMIN };
});

const turn = z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(4000) });

export const POST = route({ module: 'ai_assistant', action: 'create' }, async (ctx, req) => {
  const input = await body(req, z.object({ messages: z.array(turn).min(1).max(20) }));
  const turns = input.messages.slice(-12);
  if (turns[0].role !== 'user') turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== 'user') throw badRequest('The last message must be from you.');

  const u = await usage(ctx);
  if (u.limit === 0) throw new HttpError(403, 'The AI assistant is switched off for this school.', 'AI_DISABLED');
  const rl = await rateLimit(`ai:${ctx.user.id}`, 10, 60);
  if (!rl.ok) throw new HttpError(429, `Too many questions in a row. Try again in ${rl.retryAfterSec}s.`, 'RATE_LIMITED');

  const me = await ctx.db.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { name: true, language: true } });
  const school = await ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { name: true } });
  const system = systemPrompt(ctx.user.role, school.name, me.name, me.language, await context(ctx));
  const estimate = estimateTokens(system + turns.map((t) => t.content).join('')) + MAX_REPLY_TOKENS;
  if (u.used + estimate > u.limit) throw new HttpError(429, `You have used today's AI allowance (${u.limit.toLocaleString('en-IN')} tokens). It resets at midnight.`, 'AI_QUOTA');

  let reply;
  try {
    reply = await chat(system, turns, MAX_REPLY_TOKENS);
  } catch (e) {
    if (e instanceof AiUnavailable) throw new HttpError(503, e.message, 'AI_UNAVAILABLE');
    throw e;
  }
  const tokens = reply.tokens || estimate;
  const day = today();
  await ctx.db.aiUsage.upsert({
    where: { schoolId_userId_day: { schoolId: ctx.user.schoolId, userId: ctx.user.id, day } },
    update: { tokens: { increment: tokens }, requests: { increment: 1 } },
    create: { schoolId: ctx.user.schoolId, userId: ctx.user.id, day, tokens, requests: 1 },
  });
  return { reply: reply.text || 'Sorry, I could not come up with an answer. Please rephrase your question.', usedToday: u.used + tokens, remainingToday: Math.max(0, u.limit - u.used - tokens) };
});
