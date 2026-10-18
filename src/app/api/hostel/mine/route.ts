import { z } from 'zod';
import { forbidden, query, route } from '@/server/api';
import { displayName } from '@/server/common';
import { ownClassSectionPairs } from '@/server/scope';

/** The family's view: the child's hostel, room, bed and warden contact. */
export const GET = route({ module: 'hostel' }, async (ctx, req) => {
  const q = query(req, z.object({ studentId: z.string().optional() }));
  const pairs = await ownClassSectionPairs(ctx);
  const p = q.studentId ? pairs.find((x) => x.studentId === q.studentId) : pairs[0];
  if (!p) throw forbidden();
  const a = await ctx.db.hostelAllocation.findFirst({
    where: { studentId: p.studentId, status: 'ACTIVE' },
    include: { room: { select: { roomNo: true, floor: true, roomType: true, monthlyFee: true, hostel: { select: { name: true, kind: true, address: true, phone: true, wardenId: true } } } } },
  });
  if (!a) return null;
  const warden = a.room.hostel.wardenId ? await ctx.db.employee.findUnique({ where: { id: a.room.hostel.wardenId }, select: { firstName: true, lastName: true, phone: true } }) : null;
  return {
    hostel: a.room.hostel.name,
    kind: a.room.hostel.kind,
    address: a.room.hostel.address,
    hostelPhone: a.room.hostel.phone,
    roomNo: a.room.roomNo,
    floor: a.room.floor,
    roomType: a.room.roomType,
    bedNo: a.bedNo,
    since: a.fromDate,
    monthlyFee: a.room.monthlyFee,
    warden: warden ? { name: displayName(warden), phone: warden.phone } : null,
  };
});
