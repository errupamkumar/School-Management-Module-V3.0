import { z } from 'zod';
import { badRequest, body, conflict, forbidden, owned, query, route } from '@/server/api';
import { classLabel, displayName } from '@/server/common';
import { zDate } from '@/server/crud';
import { assertStudentAccess } from '@/server/scope';
import { notifyFamilies } from '@/server/services/notify';

/** Residents (active by default) with room, hostel and class. Staff screen; families use /api/hostel/mine. */
export const GET = route({ module: 'hostel' }, async (ctx, req) => {
  if (ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT') throw forbidden();
  const q = query(req, z.object({ hostelId: z.string().optional(), status: z.enum(['ACTIVE', 'VACATED', 'ALL']).default('ACTIVE') }));
  const rows = await ctx.db.hostelAllocation.findMany({
    where: { ...(q.status !== 'ALL' ? { status: q.status } : {}), ...(q.hostelId ? { room: { hostelId: q.hostelId } } : {}) },
    orderBy: [{ status: 'asc' }, { fromDate: 'desc' }],
    take: 1000,
    include: {
      room: { select: { id: true, roomNo: true, floor: true, monthlyFee: true, hostel: { select: { id: true, name: true } } } },
      student: { select: { id: true, firstName: true, lastName: true, admissionNo: true, gender: true, class: { select: { name: true } }, section: { select: { name: true } }, guardian: { select: { primaryPhone: true } } } },
    },
  });
  return rows.map((r) => ({ ...r, studentName: displayName(r.student), classLabel: classLabel(r.student.class, r.student.section) }));
});

/** Give a student a bed. One active allocation per student; rooms never exceed capacity. */
export const POST = route({ module: 'hostel', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({ studentId: z.string().min(1), roomId: z.string().min(1), bedNo: z.string().trim().max(10).optional().nullable(), fromDate: zDate, notes: z.string().trim().max(300).optional().nullable() })
  );
  await assertStudentAccess(ctx, input.studentId);
  await owned(ctx.db.hostelRoom, input.roomId, 'Room');
  const [room, current, student] = await Promise.all([
    ctx.db.hostelRoom.findUniqueOrThrow({ where: { id: input.roomId }, include: { hostel: { select: { name: true, kind: true, isActive: true } }, _count: { select: { allocations: { where: { status: 'ACTIVE' } } } } } }),
    ctx.db.hostelAllocation.findFirst({ where: { studentId: input.studentId, status: 'ACTIVE' } }),
    ctx.db.student.findUniqueOrThrow({ where: { id: input.studentId }, select: { firstName: true, lastName: true, gender: true, status: true } }),
  ]);
  if (student.status !== 'ACTIVE') throw badRequest('Only active students can be given a room.');
  if (current) throw conflict('This student already has a room. Move or vacate it first.');
  if (!room.isActive || !room.hostel.isActive) throw badRequest('This room is not in use.');
  if (room._count.allocations >= room.capacity) throw conflict(`Room ${room.roomNo} is full (${room.capacity} beds).`);
  if ((room.hostel.kind === 'BOYS' && student.gender === 'FEMALE') || (room.hostel.kind === 'GIRLS' && student.gender === 'MALE')) {
    throw badRequest(`${room.hostel.name} is a ${room.hostel.kind.toLowerCase()} hostel.`);
  }
  if (input.bedNo) {
    const taken = await ctx.db.hostelAllocation.count({ where: { roomId: room.id, bedNo: input.bedNo, status: 'ACTIVE' } });
    if (taken) throw conflict(`Bed ${input.bedNo} is already taken.`);
  }
  const row = await ctx.db.hostelAllocation.create({
    data: { schoolId: ctx.user.schoolId, studentId: input.studentId, roomId: room.id, bedNo: input.bedNo ?? null, fromDate: new Date(`${input.fromDate}T00:00:00.000Z`), notes: input.notes ?? null },
  });
  await notifyFamilies(ctx.db, ctx.user.schoolId, [input.studentId], { title: 'Hostel room allotted', body: `${displayName(student)}: ${room.hostel.name}, room ${room.roomNo}${input.bedNo ? `, bed ${input.bedNo}` : ''}.`, link: '/hostel' });
  await ctx.audit('CREATE', 'HostelAllocation', row.id, `${displayName(student)} → ${room.hostel.name} ${room.roomNo}`);
  return row;
});
