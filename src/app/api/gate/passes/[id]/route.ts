import { z } from 'zod';
import { body, conflict, notFound, route } from '@/server/api';
import { classLabel, displayName } from '@/server/common';
import { notifyFamilies } from '@/server/services/notify';

export const GET = route({ module: 'gate' }, async (ctx, _req, { id }) => {
  const [p, school] = await Promise.all([
    ctx.db.gatePass.findUnique({ where: { id }, include: { student: { select: { firstName: true, lastName: true, admissionNo: true, photoUrl: true, class: { select: { name: true } }, section: { select: { name: true } } } } } }),
    ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { name: true, logoUrl: true, address: true, city: true, state: true, pincode: true, phone: true, email: true, affiliationNo: true, board: true } }),
  ]);
  if (!p) throw notFound('Gate pass');
  return { ...p, studentName: displayName(p.student), classLabel: classLabel(p.student.class, p.student.section), school };
});

/** The guard records the child leaving, or the office cancels the pass. */
export const PATCH = route({ module: 'gate', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(req, z.object({ action: z.enum(['left', 'cancel']) }));
  const p = await ctx.db.gatePass.findUnique({ where: { id }, include: { student: { select: { firstName: true, lastName: true } } } });
  if (!p) throw notFound('Gate pass');
  if (p.status !== 'ISSUED') throw conflict(p.status === 'LEFT' ? 'The student has already left.' : 'This pass was cancelled.');
  const row = await ctx.db.gatePass.update({ where: { id }, data: input.action === 'left' ? { status: 'LEFT', outAt: new Date() } : { status: 'CANCELLED' } });
  if (input.action === 'left' && ctx.school.settings.gate.notifyParents) {
    await notifyFamilies(ctx.db, ctx.user.schoolId, [p.studentId], { title: `${displayName(p.student)} has left school`, body: `With ${p.pickedUpBy} (${p.relation}) at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}. Pass ${p.passNo}.`, link: '/dashboard' });
  }
  await ctx.audit('UPDATE', 'GatePass', id, `${p.passNo} ${input.action}`);
  return row;
});
