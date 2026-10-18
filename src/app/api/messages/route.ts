import { z } from 'zod';
import { body, forbidden, route } from '@/server/api';
import { canContact } from '@/server/services/contacts';
import { notifyUsers } from '@/server/services/notify';
import { ROLE_LABELS } from '@/lib/modules';

/** Conversation list with last message and unread count. */
export const GET = route({ module: 'messaging' }, async (ctx) => {
  const convs = await ctx.db.conversation.findMany({
    where: { OR: [{ userAId: ctx.user.id }, { userBId: ctx.user.id }] },
    orderBy: { lastAt: 'desc' },
    take: 100,
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  const otherIds = convs.map((c) => (c.userAId === ctx.user.id ? c.userBId : c.userAId));
  const [users, unread] = await Promise.all([
    ctx.db.user.findMany({ where: { id: { in: otherIds } }, select: { id: true, name: true, role: true, avatarUrl: true } }),
    ctx.db.chatMessage.groupBy({ by: ['conversationId'], where: { conversationId: { in: convs.map((c) => c.id) }, senderId: { not: ctx.user.id }, readAt: null }, _count: true }),
  ]);
  return convs.map((c) => {
    const other = users.find((u) => u.id === (c.userAId === ctx.user.id ? c.userBId : c.userAId));
    return {
      id: c.id,
      lastAt: c.lastAt,
      other: other ? { ...other, roleLabel: ROLE_LABELS[other.role] } : null,
      last: c.messages[0] ? { body: c.messages[0].body.slice(0, 120), mine: c.messages[0].senderId === ctx.user.id, createdAt: c.messages[0].createdAt } : null,
      unread: unread.find((u) => u.conversationId === c.id)?._count ?? 0,
    };
  });
});

/** Start (or continue) a conversation with someone you are allowed to contact. */
export const POST = route({ module: 'messaging', action: 'create' }, async (ctx, req) => {
  const input = await body(req, z.object({ toUserId: z.string().min(1), body: z.string().trim().min(1).max(4000) }));
  if (!(await canContact(ctx, input.toUserId))) throw forbidden('You cannot message this person.');
  const [a, b] = [ctx.user.id, input.toUserId].sort();
  const conv = await ctx.db.conversation.upsert({
    where: { schoolId_userAId_userBId: { schoolId: ctx.user.schoolId, userAId: a, userBId: b } },
    update: { lastAt: new Date() },
    create: { schoolId: ctx.user.schoolId, userAId: a, userBId: b },
  });
  const msg = await ctx.db.chatMessage.create({ data: { schoolId: ctx.user.schoolId, conversationId: conv.id, senderId: ctx.user.id, body: input.body } });
  await notifyUsers(ctx.db, ctx.user.schoolId, [input.toUserId], { title: `Message from ${ctx.user.name}`, body: input.body.slice(0, 140), link: `/messages?c=${conv.id}` });
  return { conversationId: conv.id, message: msg };
});
