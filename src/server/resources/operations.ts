import { z } from 'zod';
import { badRequest, conflict } from '../api';
import { toDate, zDate, type CrudConfig } from '../crud';
import { fromPaise } from '../services/money';
import { money, optionalPhoneIN, phoneIN } from '@/lib/validators';

const optDate = zDate.optional().nullable().or(z.literal('').transform(() => null));

// ---------------------------------------------------------------- Transport
const vehicleSchema = z.object({
  registrationNo: z
    .string()
    .trim()
    .toUpperCase()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .refine((v) => /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(v), 'Enter a valid registration number, e.g. BR01PA4521'),
  model: z.string().trim().max(60).optional().nullable(),
  capacity: z.coerce.number().int().min(1).max(100),
  driverName: z.string().trim().min(2).max(80),
  driverPhone: phoneIN,
  driverLicenseNo: z.string().trim().max(30).optional().nullable(),
  attendantName: z.string().trim().max(80).optional().nullable(),
  attendantPhone: optionalPhoneIN,
  insuranceExpiry: optDate,
  fitnessExpiry: optDate,
  pucExpiry: optDate,
  permitExpiry: optDate,
  gpsDeviceId: z.string().trim().max(60).optional().nullable(),
  driverEmployeeId: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  isActive: z.boolean().default(true),
});

export const vehicleConfig = {
  module: 'transport',
  model: 'vehicle',
  entity: 'Vehicle',
  schema: vehicleSchema,
  staffOnly: true,
  refs: { driverEmployeeId: 'employee' },
  orderBy: { registrationNo: 'asc' },
  search: ['registrationNo', 'driverName', 'model'],
  include: { routes: { select: { id: true, name: true } } },
  map: (i) => ({
    ...i,
    ...(i.insuranceExpiry !== undefined ? { insuranceExpiry: toDate(i.insuranceExpiry) ?? null } : {}),
    ...(i.fitnessExpiry !== undefined ? { fitnessExpiry: toDate(i.fitnessExpiry) ?? null } : {}),
    ...(i.pucExpiry !== undefined ? { pucExpiry: toDate(i.pucExpiry) ?? null } : {}),
    ...(i.permitExpiry !== undefined ? { permitExpiry: toDate(i.permitExpiry) ?? null } : {}),
  }),
} satisfies CrudConfig<typeof vehicleSchema.shape>;

const routeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  vehicleId: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  isActive: z.boolean().default(true),
});

export const routeConfig = {
  module: 'transport',
  model: 'transportRoute',
  entity: 'TransportRoute',
  schema: routeSchema,
  staffOnly: true,
  refs: { vehicleId: 'vehicle' },
  orderBy: { name: 'asc' },
  include: { vehicle: true, stops: { orderBy: { sortOrder: 'asc' } }, _count: { select: { passengers: true } } },
  beforeDelete: async (ctx, id) => {
    const n = await ctx.db.studentTransport.count({ where: { routeId: id } });
    if (n) throw conflict(`${n} students use this route. Move them first.`);
  },
} satisfies CrudConfig<typeof routeSchema.shape>;

// ---------------------------------------------------------------- Library
const bookSchema = z.object({
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().max(120).optional().nullable(),
  isbn: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .refine((v) => v === '' || /^(\d{9}[\dX]|\d{13})$/.test(v), 'ISBN must be 10 or 13 digits')
    .optional()
    .nullable(),
  publisher: z.string().trim().max(120).optional().nullable(),
  category: z.string().trim().max(60).optional().nullable(),
  rackNo: z.string().trim().max(20).optional().nullable(),
  copies: z.coerce.number().int().min(1).max(10_000),
});

export const bookConfig = {
  module: 'library',
  model: 'book',
  entity: 'Book',
  schema: bookSchema,
  orderBy: { title: 'asc' },
  search: ['title', 'author', 'isbn', 'category'],
  filters: ['category'],
  map: (i) => ({ ...i, isbn: i.isbn || null, available: i.copies }),
  // Keep `available` consistent with copies currently issued out.
  mapUpdate: async (i, ctx, id) => {
    if (i.copies === undefined) return { ...i, ...(i.isbn !== undefined ? { isbn: i.isbn || null } : {}) };
    const out = await ctx.db.bookIssue.count({ where: { bookId: id, returnedOn: null } });
    if (i.copies < out) throw badRequest(`${out} copies are currently issued; copies cannot be fewer than that.`);
    return { ...i, isbn: i.isbn || null, available: i.copies - out };
  },
  beforeDelete: async (ctx, id) => {
    const out = await ctx.db.bookIssue.count({ where: { bookId: id, returnedOn: null } });
    if (out) throw conflict(`${out} copies are issued. Collect them before deleting.`);
  },
} satisfies CrudConfig<typeof bookSchema.shape>;

// ---------------------------------------------------------------- Store
const categorySchema = z.object({ name: z.string().trim().min(1).max(60) });
export const categoryConfig = {
  module: 'store',
  model: 'productCategory',
  entity: 'ProductCategory',
  schema: categorySchema,
  orderBy: { name: 'asc' },
  include: { _count: { select: { products: true } } },
} satisfies CrudConfig<typeof categorySchema.shape>;

const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().toUpperCase().min(1).max(40),
  categoryId: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  unit: z.string().trim().max(12).default('pcs'),
  price: money,
  gstPercent: z.coerce.number().refine((v) => [0, 5, 12, 18, 28].includes(v), 'GST must be 0, 5, 12, 18 or 28%'),
  reorderAt: z.coerce.number().int().min(0).max(100_000).default(0),
  isActive: z.boolean().default(true),
  openingStock: z.coerce.number().int().min(0).max(1_000_000).optional(),
});

export const productConfig = {
  module: 'store',
  model: 'product',
  entity: 'Product',
  schema: productSchema,
  refs: { categoryId: 'productCategory' },
  orderBy: { name: 'asc' },
  search: ['name', 'sku'],
  filters: ['categoryId'],
  include: { category: { select: { name: true } } },
  map: (i) => {
    const { openingStock, price, ...rest } = i;
    return { ...rest, price: fromPaise(Math.round(price * 100)), stock: openingStock ?? 0 };
  },
  // Stock only changes through sales and stock adjustments, never via edit.
  mapUpdate: (i) => {
    const { openingStock: _ignored, price, ...rest } = i;
    return { ...rest, ...(price !== undefined ? { price: fromPaise(Math.round(price * 100)) } : {}) };
  },
  beforeDelete: async (ctx, id) => {
    const sold = await ctx.db.storeOrderItem.count({ where: { productId: id } });
    if (sold) throw conflict('This product has sales history. Mark it inactive instead.');
  },
} satisfies CrudConfig<typeof productSchema.shape>;

// ---------------------------------------------------------------- Assets
const assetSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(60),
  quantity: z.coerce.number().int().min(0).max(1_000_000),
  unitCost: money.default(0),
  location: z.string().trim().max(80).optional().nullable(),
  condition: z.enum(['GOOD', 'FAIR', 'POOR', 'DAMAGED']).default('GOOD'),
  purchasedOn: optDate,
  supplier: z.string().trim().max(120).optional().nullable(),
});

export const assetConfig = {
  module: 'inventory',
  model: 'asset',
  entity: 'Asset',
  schema: assetSchema,
  orderBy: [{ category: 'asc' }, { name: 'asc' }],
  search: ['name', 'category', 'location', 'supplier'],
  filters: ['category', 'condition'],
  map: (i) => ({ ...i, ...(i.unitCost !== undefined ? { unitCost: fromPaise(Math.round(i.unitCost * 100)) } : {}), ...(i.purchasedOn !== undefined ? { purchasedOn: toDate(i.purchasedOn) ?? null } : {}) }),
} satisfies CrudConfig<typeof assetSchema.shape>;

export function assertNotNegative(n: number, label: string) {
  if (n < 0) throw badRequest(`${label} cannot go below zero.`);
}
