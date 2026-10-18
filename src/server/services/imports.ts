import { z } from 'zod';

/** Body of every CSV import endpoint (see components/csv-import.tsx). */
export const importBody = z.object({
  rows: z.array(z.record(z.string(), z.string())).min(1, 'The file has no rows').max(2000, 'Up to 2000 rows per file'),
  dryRun: z.boolean().default(true),
});

export interface RowError {
  row: number;
  error: string;
}

/** Spreadsheet row number for a data row index (header is row 1). */
export const sheetRow = (i: number) => i + 2;

/** Accepts YYYY-MM-DD, DD/MM/YYYY and DD-MM-YYYY. Returns ISO YYYY-MM-DD or null. */
export function parseSheetDate(value: string | undefined): string | null {
  const v = (value ?? '').trim();
  let y: number, m: number, d: number;
  let hit = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (hit) [y, m, d] = [Number(hit[1]), Number(hit[2]), Number(hit[3])];
  else if ((hit = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(v))) [d, m, y] = [Number(hit[1]), Number(hit[2]), Number(hit[3])];
  else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

/** "12,500.50" / "₹ 12500" → 12500.5; null when not a positive amount. */
export function parseAmount(value: string | undefined): number | null {
  const n = Number((value ?? '').replace(/[₹,\s]/g, ''));
  return Number.isFinite(n) && n > 0 && n <= 10_000_000 ? Math.round(n * 100) / 100 : null;
}

const MODES: Record<string, 'CASH' | 'UPI' | 'CARD' | 'NET_BANKING' | 'CHEQUE' | 'DD' | 'BANK_TRANSFER'> = {
  cash: 'CASH',
  upi: 'UPI',
  card: 'CARD',
  pos: 'CARD',
  'net banking': 'NET_BANKING',
  netbanking: 'NET_BANKING',
  net_banking: 'NET_BANKING',
  cheque: 'CHEQUE',
  check: 'CHEQUE',
  dd: 'DD',
  'demand draft': 'DD',
  neft: 'BANK_TRANSFER',
  rtgs: 'BANK_TRANSFER',
  imps: 'BANK_TRANSFER',
  'bank transfer': 'BANK_TRANSFER',
  bank_transfer: 'BANK_TRANSFER',
};

export function parseMode(value: string | undefined) {
  return MODES[(value ?? '').trim().toLowerCase()] ?? null;
}
