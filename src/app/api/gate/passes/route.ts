import { z } from 'zod';
import { badRequest, body, query, route } from '@/server/api';
import { classLabel, dayUTC, displayName, todayUTC } from '@/server/common';
import { formatNumber, nextSequence } from '@/server/db';
import { zDate } from '@/server/crud';
import { notifyFamilies } from '@/server/services/notify';
import { optionalPhoneIN } from '@/lib/validators';

/** Early-leave gate passes for a day (default today). */
export const GET = route({ module: 'gate' }, async (ctx, req) => {
  const q = query(req, z.object({ date: zDate.optional() }));
  const from = q.date ? dayUTC(q.date) : todayUTC();
  const rows = await ctx.db.gatePass.findMany({
    where: { issuedAt: { gte: from, lt: new Date(from.getTime() + 86_400_000) } },
    orderBy: { issuedAt: 'desc' },
    take: 500,
    include: { student: { select: { firstName: true, lastName: true, admissionNo: true, photoUrl: true, class: { select: { name: true } }, section: { select: { name: true } } } } },
  });
  return rows.map((r) => ({ ...r, studentName: displayName(r.student), classLabel: classLabel(r.student.class, r.student.section) }));
});

/** Issue a pass for a student collected during school hours; the parent is told at once. */
export const POST = route({ module: 'gate', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      studentId: z.string().min(1),
      reason: z.string().trim().min(3).max(200),
      pickedUpBy: z.string().trim().min(2).max(80),
      relation: z.string().trim().min(2).max(40),
      pickerPhone: optionalPhoneIN,
    })
  );
  const student = await ctx.db.student.findUnique({ where: { id: input.studentId }, select: { id: true, firstName: true, lastName: true, status: true } });
  if (!student) throw badRequest('Unknown student.');
  if (student.status !== 'ACTIVE') throw badRequest('Only active students can be given a gate pass.');
  const row = await ctx.db.$transaction(async (tx) => {
    const n = await nextSequence(tx, ctx.user.schoolId, 'gatepass');
    return tx.gatePass.create({
      data: { schoolId: ctx.user.schoolId, passNo: formatNumber('GP', n, 6), studentId: student.id, reason: input.reason, pickedUpBy: input.pickedUpBy, relation: input.relation, pickerPhone: input.pickerPhone ?? null, issuedById: ctx.user.id, issuedByName: ctx.user.name },
    });
  });
  if (ctx.school.settings.gate.notifyParents) {
    await notifyFamilies(ctx.db, ctx.user.schoolId, [student.id], { title: `Gate pass issued for ${displayName(student)}`, body: `To be collected by ${input.pickedUpBy} (${input.relation}). Reason: ${input.reason}. Pass ${row.passNo}. Call the school if you did not arrange this.`, link: '/dashboard' });
  }
  await ctx.audit('CREATE', 'GatePass', row.id, `${row.passNo} ${displayName(student)} → ${input.pickedUpBy} (${input.relation})`);
  return row;
});
