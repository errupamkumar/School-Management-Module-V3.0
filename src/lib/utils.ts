import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });
const inrWhole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('en-IN');

export function formatINR(value: number | null | undefined, whole = false): string {
  return (whole ? inrWhole : inr).format(Number(value ?? 0));
}

/** ₹1.2L / ₹3.4Cr style for KPI tiles. */
export function compactINR(value: number): string {
  const v = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (v >= 1e7) return `${sign}₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `${sign}₹${(v / 1e5).toFixed(2)}L`;
  if (v >= 1e3) return `${sign}₹${(v / 1e3).toFixed(1)}K`;
  return `${sign}₹${v.toFixed(0)}`;
}

export function formatNumber(value: number | null | undefined): string {
  return num.format(Number(value ?? 0));
}

export function formatDate(value: string | Date | null | undefined, style: 'short' | 'long' | 'month' = 'short'): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  const opts: Intl.DateTimeFormatOptions =
    style === 'long' ? { day: 'numeric', month: 'long', year: 'numeric' } : style === 'month' ? { month: 'short', year: 'numeric' } : { day: '2-digit', month: 'short', year: 'numeric' };
  return d.toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** YYYY-MM-DD in local time (for <input type="date"> defaults). */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Oct 2026" for a billing month; instant (one-off) invoices show their title. */
export function periodLabel(period: string, title?: string | null): string {
  if (title) return title;
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (m) return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
  return period.startsWith('X-') ? 'One-off fee' : period;
}

export function fullName(p: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  if (!p) return '';
  return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
}

export function className(cls: { name: string } | null | undefined, sec?: { name: string } | null): string {
  if (!cls) return '—';
  const n = /^\d+$/.test(cls.name) ? `Class ${cls.name}` : cls.name;
  return sec ? `${n}-${sec.name}` : n;
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    // Neutralise spreadsheet formula injection.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
