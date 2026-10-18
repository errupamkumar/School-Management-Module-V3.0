import { z } from 'zod';
import { body, forbidden, notFound, route, type Ctx } from '@/server/api';
import { notifyUsers } from '@/server/services/notify';
import { ROLE_LABELS } from '@/lib/modules';

async function loadConversation(ctx: Ctx, id: string) {
  const c = await ctx.db.conversation.findUnique({ where: { id } });
  if (!c) throw notFound('Conversation');
  if (c.userAId !== ctx.user.id && c.userBId !== ctx.user.id) throw forbidden();
  return { conv: c, otherId: c.userAId === ctx.user.id ? c.userBId : c.userAId };
}

export const GET = route({ module: 'messaging' }, async (ctx, req, { id }) => {
  const { conv, otherId } = await loadConversation(ctx, id);
  const before = req.nextUrl.searchParams.get('before');
  const [messages, other] = await Promise.all([
    ctx.db.chatMessage.findMany({ where: { conversationId: conv.id, ...(before ? { createdAt: { lt: new Date(before) } } : {}) }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ctx.db.user.findUnique({ where: { id: otherId }, select: { id: true, name: true, role: true, avatarUrl: true } }),
  ]);
  await ctx.db.chatMessage.updateMany({ where: { conversationId: conv.id, senderId: otherId, readAt: null }, data: { readAt: new Date() } });
  return { other: other ? { ...other, roleLabel: ROLE_LABELS[other.role] } : null, messages: messages.reverse().map((m) => ({ ...m, mine: m.senderId === ctx.user.id })) };
});

export const POST = route({ module: 'messaging', action: 'create' }, async (ctx, req, { id }) => {
  const { conv, otherId } = await loadConversation(ctx, id);
  const input = await body(req, z.object({ body: z.string().trim().min(1).max(4000) }));
  const other = await ctx.db.user.findUnique({ where: { id: otherId }, select: { isActive: true } });
  if (!other?.isActive) throw forbidden('This user is no longer active.');
  const msg = await ctx.db.chatMessage.create({ data: { schoolId: ctx.user.schoolId, conversationId: conv.id, senderId: ctx.user.id, body: input.body } });
  await ctx.db.conversation.update({ where: { id: conv.id }, data: { lastAt: new Date() } });
  await notifyUsers(ctx.db, ctx.user.schoolId, [otherId], { title: `Message from ${ctx.user.name}`, body: input.body.slice(0, 140), link: `/messages?c=${conv.id}` });
  return { ...msg, mine: true };
});
