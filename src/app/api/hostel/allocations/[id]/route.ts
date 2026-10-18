import { z } from 'zod';
import { badRequest, body, conflict, owned, route } from '@/server/api';
import { zDate } from '@/server/crud';

/** Vacate a bed, or move the student to another room. History is kept. */
export const PATCH = route({ module: 'hostel', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(
    req,
    z.discriminatedUnion('action', [
      z.object({ action: z.literal('vacate'), toDate: zDate, notes: z.string().trim().max(300).optional().nullable() }),
      z.object({ action: z.literal('move'), roomId: z.string().min(1), bedNo: z.string().trim().max(10).optional().nullable(), fromDate: zDate }),
    ])
  );
  const a = await ctx.db.hostelAllocation.findUniqueOrThrow({ where: { id }, include: { room: { select: { roomNo: true } } } });
  if (a.status !== 'ACTIVE') throw badRequest('This allocation has already ended.');

  if (input.action === 'vacate') {
    const toDate = new Date(`${input.toDate}T00:00:00.000Z`);
    if (toDate < a.fromDate) throw badRequest('Leaving date is before the allotment date.');
    await ctx.db.hostelAllocation.update({ where: { id }, data: { status: 'VACATED', toDate, ...(input.notes ? { notes: input.notes } : {}) } });
    await ctx.audit('UPDATE', 'HostelAllocation', id, `Vacated room ${a.room.roomNo} on ${input.toDate}`);
    return { vacated: true };
  }

  await owned(ctx.db.hostelRoom, input.roomId, 'Room');
  if (input.roomId === a.roomId) throw badRequest('The student is already in this room.');
  const room = await ctx.db.hostelRoom.findUniqueOrThrow({ where: { id: input.roomId }, include: { _count: { select: { allocations: { where: { status: 'ACTIVE' } } } } } });
  if (room._count.allocations >= room.capacity) throw conflict(`Room ${room.roomNo} is full.`);
  const day = new Date(`${input.fromDate}T00:00:00.000Z`);
  const moved = await ctx.db.$transaction(async (tx) => {
    await tx.hostelAllocation.update({ where: { id }, data: { status: 'VACATED', toDate: day } });
    return tx.hostelAllocation.create({ data: { schoolId: ctx.user.schoolId, studentId: a.studentId, roomId: room.id, bedNo: input.bedNo ?? null, fromDate: day } });
  });
  await ctx.audit('UPDATE', 'HostelAllocation', moved.id, `Moved from room ${a.room.roomNo} to ${room.roomNo}`);
  return moved;
});
