import { z } from 'zod';
import { badRequest, body, conflict, forbidden, owned, query, route } from '@/server/api';
import { classLabel, displayName } from '@/server/common';
import { assertSectionAccess, hasSchoolWideScope, ownClassSectionPairs } from '@/server/scope';

/**
 * ?sectionId=…      class timetable
 * ?employeeId=…     teacher timetable
 * ?mine=1           own timetable (teacher) or child's (family; optional studentId)
 */
export const GET = route({ module: 'timetable' }, async (ctx, req) => {
  const q = query(req, z.object({ sectionId: z.string().optional(), employeeId: z.string().optional(), mine: z.string().optional(), studentId: z.string().optional() }));
  let where: { sectionId?: string; employeeId?: string } = {};
  let title = '';
  if (q.mine) {
    if (ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT') {
      const pairs = await ownClassSectionPairs(ctx);
      const p = q.studentId ? pairs.find((x) => x.studentId === q.studentId) : pairs[0];
      if (!p) throw forbidden();
      where = { sectionId: p.sectionId };
    } else if (ctx.user.employeeId) where = { employeeId: ctx.user.employeeId };
    else throw badRequest('No timetable for this account.');
  } else if (q.sectionId) {
    if (!hasSchoolWideScope(ctx) && ctx.user.role !== 'TEACHER') throw forbidden();
    if (ctx.user.role === 'TEACHER') await assertSectionAccess(ctx, q.sectionId);
    where = { sectionId: q.sectionId };
  } else if (q.employeeId) {
    if (!hasSchoolWideScope(ctx) && q.employeeId !== ctx.user.employeeId) throw forbidden();
    where = { employeeId: q.employeeId };
  } else throw badRequest('Choose a section or teacher.');

  const [periods, entries, subjects] = await Promise.all([
    ctx.db.period.findMany({ orderBy: { sortOrder: 'asc' } }),
    ctx.db.timetableEntry.findMany({
      where,
      include: { employee: { select: { id: true, firstName: true, lastName: true } }, room: { select: { name: true } }, section: { select: { id: true, name: true, class: { select: { name: true } } } } },
    }),
    ctx.db.subject.findMany({ select: { id: true, name: true, code: true } }),
  ]);
  if (where.sectionId) {
    const s = await ctx.db.section.findUnique({ where: { id: where.sectionId }, include: { class: { select: { name: true } } } });
    title = s ? classLabel(s.class, s) : '';
  } else if (where.employeeId) {
    const e = await ctx.db.employee.findUnique({ where: { id: where.employeeId }, select: { firstName: true, lastName: true } });
    title = e ? displayName(e) : '';
  }
  return {
    title,
    view: where.sectionId ? 'section' : 'teacher',
    sectionId: where.sectionId ?? null,
    workingDays: ctx.school.settings.workingDays,
    periods,
    entries: entries.map((e) => ({
      id: e.id,
      day: e.day,
      periodId: e.periodId,
      subjectId: e.subjectId,
      subject: subjects.find((s) => s.id === e.subjectId)?.name ?? '',
      subjectCode: subjects.find((s) => s.id === e.subjectId)?.code ?? '',
      employeeId: e.employeeId,
      teacher: e.employee ? displayName(e.employee) : null,
      roomId: e.roomId,
      room: e.room?.name ?? null,
      sectionLabel: classLabel(e.section.class, e.section),
    })),
  };
});

/** Set or clear one cell, refusing teacher or room double-booking. */
export const PUT = route({ module: 'timetable', action: 'edit' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      sectionId: z.string().min(1),
      day: z.number().int().min(1).max(7),
      periodId: z.string().min(1),
      subjectId: z.string().nullable(),
      employeeId: z.string().nullable().optional(),
      roomId: z.string().nullable().optional(),
    })
  );
  await owned(ctx.db.section, input.sectionId, 'Section');
  const period = await ctx.db.period.findUnique({ where: { id: input.periodId } });
  if (!period) throw badRequest('Unknown period.');
  if (period.isBreak) throw badRequest('Breaks cannot have a subject.');
  if (!input.subjectId) {
    await ctx.db.timetableEntry.deleteMany({ where: { sectionId: input.sectionId, day: input.day, periodId: input.periodId } });
    return { cleared: true };
  }
  await owned(ctx.db.subject, input.subjectId, 'Subject');
  await owned(ctx.db.employee, input.employeeId, 'Teacher');
  await owned(ctx.db.room, input.roomId, 'Room');
  if (input.employeeId) {
    const clash = await ctx.db.timetableEntry.findFirst({
      where: { employeeId: input.employeeId, day: input.day, periodId: input.periodId, sectionId: { not: input.sectionId } },
      include: { section: { include: { class: { select: { name: true } } } } },
    });
    if (clash) throw conflict(`Teacher is already teaching ${classLabel(clash.section.class, clash.section)} in this period.`);
  }
  if (input.roomId) {
    const clash = await ctx.db.timetableEntry.findFirst({ where: { roomId: input.roomId, day: input.day, periodId: input.periodId, sectionId: { not: input.sectionId } } });
    if (clash) throw conflict('This room is already booked in this period.');
  }
  const entry = await ctx.db.timetableEntry.upsert({
    where: { sectionId_day_periodId: { sectionId: input.sectionId, day: input.day, periodId: input.periodId } },
    update: { subjectId: input.subjectId, employeeId: input.employeeId ?? null, roomId: input.roomId ?? null },
    create: { schoolId: ctx.user.schoolId, sectionId: input.sectionId, day: input.day, periodId: input.periodId, subjectId: input.subjectId, employeeId: input.employeeId ?? null, roomId: input.roomId ?? null },
  });
  await ctx.audit('UPDATE', 'Timetable', input.sectionId, `day ${input.day} ${period.name}`);
  return entry;
});
