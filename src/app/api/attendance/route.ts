import { z } from 'zod';
import { badRequest, body, query, route } from '@/server/api';
import { classLabel, dayUTC, displayName } from '@/server/common';
import { assertSectionAccess } from '@/server/scope';
import { ATTENDANCE_STATUSES, assertEditable, holidayOn, isWorkingDay } from '@/server/services/attendance';
import { notifyUsers } from '@/server/services/notify';
import { queueMessages } from '@/server/services/messaging';

const dateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

/** Roster for one section on one date, with existing marks and approved leaves pre-filled. */
export const GET = route({ module: 'attendance' }, async (ctx, req) => {
  const q = query(req, z.object({ sectionId: z.string().min(1), date: dateParam }));
  await assertSectionAccess(ctx, q.sectionId);
  const date = dayUTC(q.date);
  const [section, students, marks, leaves, holiday] = await Promise.all([
    ctx.db.section.findUniqueOrThrow({ where: { id: q.sectionId }, include: { class: { select: { name: true } }, classTeacher: { select: { firstName: true, lastName: true } } } }),
    ctx.db.student.findMany({
      where: { sectionId: q.sectionId, status: 'ACTIVE', admissionDate: { lte: date } },
      orderBy: [{ rollNo: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, rollNo: true, admissionNo: true, photoUrl: true, gender: true },
    }),
    ctx.db.studentAttendance.findMany({ where: { sectionId: q.sectionId, date } }),
    ctx.db.leaveRequest.findMany({ where: { status: 'APPROVED', studentId: { not: null }, fromDate: { lte: date }, toDate: { gte: date } }, select: { studentId: true, leaveType: true } }),
    holidayOn(ctx, date),
  ]);
  const markMap = new Map(marks.map((m) => [m.studentId, m]));
  const leaveMap = new Map(leaves.map((l) => [l.studentId, l.leaveType]));
  // Sort numerically by roll number when possible.
  students.sort((a, b) => (Number(a.rollNo) || 9999) - (Number(b.rollNo) || 9999) || a.firstName.localeCompare(b.firstName));
  const markedBy = marks[0]?.markedById ? await ctx.db.user.findUnique({ where: { id: marks[0].markedById }, select: { name: true } }) : null;
  return {
    section: { id: section.id, label: classLabel(section.class, section), classTeacher: section.classTeacher ? displayName(section.classTeacher) : null },
    date: q.date,
    isWorkingDay: isWorkingDay(ctx, date),
    holiday,
    marked: marks.length > 0,
    markedBy: markedBy?.name ?? null,
    lastUpdated: marks.reduce<Date | null>((a, m) => (!a || m.updatedAt > a ? m.updatedAt : a), null),
    roster: students.map((s) => ({
      studentId: s.id,
      name: displayName(s),
      rollNo: s.rollNo,
      admissionNo: s.admissionNo,
      photoUrl: s.photoUrl,
      gender: s.gender,
      status: markMap.get(s.id)?.status ?? (leaveMap.has(s.id) ? 'LEAVE' : null),
      remarks: markMap.get(s.id)?.remarks ?? (leaveMap.has(s.id) ? `Approved ${leaveMap.get(s.id)!.toLowerCase()} leave` : null),
      onApprovedLeave: leaveMap.has(s.id),
    })),
  };
});

export const PUT = route({ module: 'attendance', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      sectionId: z.string().min(1),
      date: dateParam,
      entries: z.array(z.object({ studentId: z.string().min(1), status: z.enum(ATTENDANCE_STATUSES), remarks: z.string().trim().max(200).optional().nullable() })).min(1).max(200),
      notifyAbsent: z.boolean().optional(),
    })
  );
  await assertSectionAccess(ctx, input.sectionId);
  const date = dayUTC(input.date);
  assertEditable(ctx, date);
  const existing = await ctx.db.studentAttendance.count({ where: { sectionId: input.sectionId, date } });
  if (existing && !ctx.can('attendance', 'edit')) throw badRequest('Attendance for this day is already marked. You do not have permission to change it.');

  const ids = input.entries.map((e) => e.studentId);
  const valid = await ctx.db.student.findMany({ where: { id: { in: ids }, sectionId: input.sectionId }, select: { id: true, firstName: true, lastName: true, userId: true, guardian: { select: { userId: true, primaryPhone: true } } } });
  if (valid.length !== new Set(ids).size) throw badRequest('Some students do not belong to this section.');

  const before = await ctx.db.studentAttendance.findMany({ where: { sectionId: input.sectionId, date }, select: { studentId: true, status: true } });
  const prev = new Map(before.map((b) => [b.studentId, b.status]));

  await ctx.db.$transaction(
    input.entries.map((e) =>
      ctx.db.studentAttendance.upsert({
        where: { studentId_date: { studentId: e.studentId, date } },
        update: { status: e.status, remarks: e.remarks ?? null, markedById: ctx.user.id, sectionId: input.sectionId },
        create: { schoolId: ctx.user.schoolId, studentId: e.studentId, sectionId: input.sectionId, date, status: e.status, remarks: e.remarks ?? null, markedById: ctx.user.id, source: 'MANUAL' },
      })
    )
  );

  // Alert families of newly-absent students (not on every re-save).
  const newlyAbsent = input.entries.filter((e) => e.status === 'ABSENT' && prev.get(e.studentId) !== 'ABSENT');
  let alerted = 0;
  if (newlyAbsent.length && (input.notifyAbsent ?? ctx.school.settings.attendance.notifyParentsOnAbsence)) {
    const byId = new Map(valid.map((v) => [v.id, v]));
    for (const e of newlyAbsent) {
      const s = byId.get(e.studentId)!;
      await notifyUsers(ctx.db, ctx.user.schoolId, [s.guardian?.userId], { title: `${displayName(s)} was marked absent`, body: `Marked absent on ${input.date}. Please contact the class teacher if this is incorrect.`, link: '/attendance' });
    }
    alerted = await queueMessages(ctx, 'SMS', newlyAbsent.map((e) => {
      const s = byId.get(e.studentId)!;
      return { recipient: s.guardian?.primaryPhone, recipientName: displayName(s), body: `Dear Parent, your ward ${displayName(s)} was absent today (${input.date}). - ${ctx.school.name}` };
    }));
  }
  await ctx.audit(existing ? 'UPDATE' : 'CREATE', 'Attendance', input.sectionId, `${input.date}: ${input.entries.length} marked, ${input.entries.filter((e) => e.status === 'ABSENT').length} absent`);
  return { saved: input.entries.length, alerted };
});
