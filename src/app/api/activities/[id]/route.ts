import { body, route } from '@/server/api';
import { activitySchema, assertCanManage, mapActivity, promoteWaitlist } from '@/server/resources/activities';

export const PUT = route({ module: 'activities', action: 'edit' }, async (ctx, req, { id }) => {
  await assertCanManage(ctx, id);
  const input = await body(req, activitySchema.partial());
  const a = await ctx.db.activity.update({ where: { id }, data: (await mapActivity(ctx, input)) as never });
  // A larger capacity may free seats for the waitlist.
  await promoteWaitlist(ctx, id);
  await ctx.audit('UPDATE', 'Activity', id, a.name);
  return a;
});

export const DELETE = route({ module: 'activities', action: 'delete' }, async (ctx, _req, { id }) => {
  await assertCanManage(ctx, id);
  const a = await ctx.db.activity.findUniqueOrThrow({ where: { id }, select: { name: true } });
  await ctx.db.$transaction([ctx.db.activityMember.deleteMany({ where: { activityId: id } }), ctx.db.activity.delete({ where: { id } })]);
  await ctx.audit('DELETE', 'Activity', id, a.name);
  return { deleted: true };
});
