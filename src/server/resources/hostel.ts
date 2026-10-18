import { z } from 'zod';
import { conflict } from '../api';
import type { CrudConfig } from '../crud';
import { fromPaise } from '../services/money';
import { money } from '@/lib/validators';

const hostelSchema = z.object({
  name: z.string().trim().min(2).max(80),
  kind: z.enum(['BOYS', 'GIRLS', 'MIXED']),
  wardenId: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  address: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const hostelConfig = {
  module: 'hostel',
  model: 'hostel',
  entity: 'Hostel',
  schema: hostelSchema,
  staffOnly: true,
  refs: { wardenId: 'employee' },
  orderBy: { name: 'asc' },
  include: { rooms: { where: { isActive: true }, orderBy: { roomNo: 'asc' }, include: { _count: { select: { allocations: { where: { status: 'ACTIVE' } } } } } } },
  beforeDelete: async (ctx, id) => {
    const n = await ctx.db.hostelAllocation.count({ where: { status: 'ACTIVE', room: { hostelId: id } } });
    if (n) throw conflict(`${n} students live in this hostel. Vacate them first.`);
  },
} satisfies CrudConfig<typeof hostelSchema.shape>;

const roomSchema = z.object({
  hostelId: z.string().min(1, 'Choose a hostel'),
  roomNo: z.string().trim().min(1).max(20),
  floor: z.string().trim().max(20).optional().nullable(),
  roomType: z.string().trim().max(40).optional().nullable(),
  capacity: z.coerce.number().int().min(1).max(50),
  monthlyFee: money.default(0),
  isActive: z.boolean().default(true),
});

export const roomConfig = {
  module: 'hostel',
  model: 'hostelRoom',
  entity: 'HostelRoom',
  schema: roomSchema,
  staffOnly: true,
  refs: { hostelId: 'hostel' },
  filters: ['hostelId'],
  orderBy: [{ hostelId: 'asc' }, { roomNo: 'asc' }],
  include: { hostel: { select: { name: true } }, _count: { select: { allocations: { where: { status: 'ACTIVE' } } } } },
  map: (i) => ({ ...i, ...(i.monthlyFee !== undefined ? { monthlyFee: fromPaise(Math.round(Number(i.monthlyFee) * 100)) } : {}) }),
  mapUpdate: async (i, ctx, id) => {
    if (i.capacity !== undefined) {
      const used = await ctx.db.hostelAllocation.count({ where: { roomId: id, status: 'ACTIVE' } });
      if (i.capacity < used) throw conflict(`${used} students already live in this room.`);
    }
    return { ...i, ...(i.monthlyFee !== undefined ? { monthlyFee: fromPaise(Math.round(Number(i.monthlyFee) * 100)) } : {}) };
  },
  beforeDelete: async (ctx, id) => {
    const n = await ctx.db.hostelAllocation.count({ where: { roomId: id, status: 'ACTIVE' } });
    if (n) throw conflict(`${n} students live in this room. Vacate them first.`);
  },
} satisfies CrudConfig<typeof roomSchema.shape>;
