import { z } from 'zod';
import { body, conflict, forbidden, route } from '@/server/api';
import { assertStudentAccess } from '@/server/scope';
import { notifyUsers } from '@/server/services/notify';

/** Teachers answer; the student who asked may close or reopen. */
export const PATCH = route({ module: 'study_tools' }, async (ctx, req, { id }) => {
  const input = await body(req, z.object({ answer: z.string().trim().min(2).max(4000).optional(), status: z.enum(['OPEN', 'CLOSED']).optional() }));
  const d = await ctx.db.doubt.findUniqueOrThrow({ where: { id } });
  await assertStudentAccess(ctx, d.studentId);

  if (input.answer) {
    ctx.require('study_tools', 'edit');
    if (ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT') throw forbidden();
    if (d.status === 'CLOSED') throw conflict('This doubt was closed by the student.');
    const me = await ctx.db.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { name: true } });
    const updated = await ctx.db.doubt.update({ where: { id }, data: { answer: input.answer, status: 'ANSWERED', answeredById: ctx.user.id, answeredByName: me.name } });
    await notifyUsers(ctx.db, ctx.user.schoolId, [d.askedById], { title: `${me.name} answered your doubt`, body: input.answer.slice(0, 140), link: '/study-tools' });
    await ctx.audit('UPDATE', 'Doubt', id, 'answered');
    return updated;
  }
  if (input.status) {
    if (d.askedById !== ctx.user.id) throw forbidden('Only the student who asked can close or reopen this doubt.');
    return ctx.db.doubt.update({ where: { id }, data: { status: input.status === 'OPEN' ? (d.answer ? 'ANSWERED' : 'OPEN') : 'CLOSED' } });
  }
  return d;
});
