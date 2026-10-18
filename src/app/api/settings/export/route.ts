import ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import { forbidden, HttpError, route } from '@/server/api';
import { prisma, TENANT_MODELS } from '@/server/db';
import { rateLimit } from '@/server/rate-limit';

/** Columns never exported: credentials, encrypted IDs, device keys and storage paths. */
const DROP_ALWAYS = new Set(['passwordHash', 'aadhaarEnc', 'sessionVersion', 'failedLoginCount', 'lockedUntil', 'schoolId']);
const DROP: Record<string, string[]> = { Vehicle: ['trackingToken'], PushSubscription: ['endpoint', 'p256dh', 'auth'], StoredFile: ['path'] };
/** Internal bookkeeping with no value to the school. */
const SKIP = new Set(['Counter', 'RateLimit', 'PushSubscription', 'AiUsage']);
const MAX_ROWS = 100_000;

function cell(v: unknown): ExcelJS.CellValue {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (Prisma.Decimal.isDecimal(v)) return (v as Prisma.Decimal).toNumber();
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 32_000);
  if (typeof v === 'string') return v.slice(0, 32_000);
  return v as ExcelJS.CellValue;
}

/**
 * Data export (DPDP portability / backup): every table of this school as one
 * Excel workbook, one sheet per table. Owner only, rate-limited and audited.
 * Uploaded files themselves are not included (their names and sizes are).
 */
export const GET = route({ module: 'settings', action: 'edit' }, async (ctx) => {
  if (ctx.user.role !== 'SUPER_ADMIN') throw forbidden('Only the owner can export all school data.');
  const rl = await rateLimit(`data-export:${ctx.user.schoolId}`, 3, 3600);
  if (!rl.ok) throw new HttpError(429, 'Data export can run 3 times an hour. Try again later.', 'RATE_LIMITED');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Vidyalaya';
  wb.created = new Date();
  const about = wb.addWorksheet('About');
  about.addRow(['School data export']);
  about.addRow(['School', ctx.school.name, ctx.school.code]);
  about.addRow(['Exported at', new Date()]);
  about.addRow(['Exported by', ctx.user.name]);
  about.addRow(['Not included', 'Passwords, encrypted Aadhaar numbers, payment-gateway secrets, device keys and the uploaded files themselves.']);
  about.addRow([]);
  about.addRow(['Sheet', 'Rows', 'Note']);

  const models = Prisma.dmmf.datamodel.models.filter((m) => TENANT_MODELS.has(m.name) && !SKIP.has(m.name)).sort((a, b) => a.name.localeCompare(b.name));
  let total = 0;
  for (const m of models) {
    const delegate = (prisma as unknown as Record<string, { findMany(a: unknown): Promise<Array<Record<string, unknown>>> }>)[m.name.charAt(0).toLowerCase() + m.name.slice(1)];
    if (!delegate) continue;
    const scalar = m.fields.filter((f) => f.kind === 'scalar' || f.kind === 'enum').map((f) => f.name).filter((f) => !DROP_ALWAYS.has(f) && !(DROP[m.name] ?? []).includes(f));
    const hasId = m.fields.some((f) => f.name === 'id');
    const rows: Array<Record<string, unknown>> = [];
    let cursor: string | undefined;
    // Page through by id so big tables never load at once.
    while (rows.length < MAX_ROWS) {
      const page = await delegate.findMany({
        where: { schoolId: ctx.user.schoolId },
        select: Object.fromEntries(scalar.map((f) => [f, true]).concat(hasId ? [['id', true]] : [])),
        ...(hasId ? { orderBy: { id: 'asc' }, take: 5000, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}) } : { take: MAX_ROWS }),
      });
      rows.push(...page);
      if (!hasId || page.length < 5000) break;
      cursor = page[page.length - 1].id as string;
    }
    const ws = wb.addWorksheet(m.name.slice(0, 31));
    ws.addRow(scalar);
    ws.getRow(1).font = { bold: true };
    for (const r of rows.slice(0, MAX_ROWS)) ws.addRow(scalar.map((f) => cell(r[f])));
    about.addRow([m.name, Math.min(rows.length, MAX_ROWS), rows.length >= MAX_ROWS ? `First ${MAX_ROWS} rows only — contact support for a full database dump` : '']);
    total += rows.length;
  }
  const school = await ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId } });
  const ws = wb.addWorksheet('School');
  for (const [k, v] of Object.entries(school)) if (k !== 'settings') ws.addRow([k, cell(v)]);

  const buf = await wb.xlsx.writeBuffer();
  const filename = `school-data-${ctx.school.code}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  await ctx.audit('EXPORT', 'School', ctx.user.schoolId, `Full data export: ${models.length} tables, ${total} rows`);
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' },
  });
});
