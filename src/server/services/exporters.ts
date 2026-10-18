import type { SchoolSettings } from '../settings';
import { ledgerFor, moneyLedger, type TallyLine } from './tally';

/**
 * File exports for other software: QuickBooks (Desktop IIF and Online journal
 * CSV) and Paybooks payroll (employee master + monthly attendance CSV).
 */

/** CSV cell: quoted when needed; leading = + - @ neutralised so spreadsheets never run it as a formula. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Array<Record<string, unknown>>, headers?: string[]): string {
  const cols = headers ?? (rows[0] ? Object.keys(rows[0]) : []);
  return [cols.map(csvCell).join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\r\n') + '\r\n';
}

const dmy = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
const mdy = (d: Date) => `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`;
/** IIF is tab-separated; tabs/newlines inside values would break rows. */
const iifText = (s: string | null | undefined) => (s ?? '').replace(/[\t\r\n]+/g, ' ').replace(/"/g, "'").slice(0, 200);

/** QuickBooks Online "Journal entries" CSV (India: dates DD/MM/YYYY). Two rows per entry; debits = credits. */
export function quickbooksJournalCsv(settings: SchoolSettings, lines: TallyLine[]): string {
  const rows: Array<Record<string, unknown>> = [];
  lines.forEach((l, i) => {
    const income = l.type === 'INCOME';
    const money = moneyLedger(settings, l.mode);
    const head = ledgerFor(settings, l.headName);
    const no = l.referenceNo || `V${String(i + 1).padStart(5, '0')}`;
    const memo = [l.description, l.mode ? `Mode: ${l.mode}` : ''].filter(Boolean).join(' | ');
    const amount = l.amount.toFixed(2);
    rows.push({ 'Journal No': no, 'Journal Date': dmy(l.date), Account: income ? money : head, Debits: amount, Credits: '', Description: memo, Name: l.party ?? '' });
    rows.push({ 'Journal No': no, 'Journal Date': dmy(l.date), Account: income ? head : money, Debits: '', Credits: amount, Description: memo, Name: l.party ?? '' });
  });
  return toCsv(rows, ['Journal No', 'Journal Date', 'Account', 'Debits', 'Credits', 'Description', 'Name']);
}

/** QuickBooks Desktop IIF general journal: debit positive, credit negative, one TRNS/SPL pair per entry. */
export function quickbooksIif(settings: SchoolSettings, lines: TallyLine[]): string {
  const out = ['!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO', '!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO', '!ENDTRNS'];
  for (const l of lines) {
    const income = l.type === 'INCOME';
    const debit = income ? moneyLedger(settings, l.mode) : ledgerFor(settings, l.headName);
    const credit = income ? ledgerFor(settings, l.headName) : moneyLedger(settings, l.mode);
    const memo = iifText([l.description, l.mode ? `Mode: ${l.mode}` : ''].filter(Boolean).join(' | '));
    const a = l.amount.toFixed(2);
    out.push(`TRNS\tGENERAL JOURNAL\t${mdy(l.date)}\t${iifText(debit)}\t${iifText(l.party)}\t${a}\t${iifText(l.referenceNo)}\t${memo}`);
    out.push(`SPL\tGENERAL JOURNAL\t${mdy(l.date)}\t${iifText(credit)}\t${iifText(l.party)}\t-${a}\t${iifText(l.referenceNo)}\t${memo}`);
    out.push('ENDTRNS');
  }
  return out.join('\r\n') + '\r\n';
}

/** IIF chart of accounts for every account the journal uses (import this first). */
export function quickbooksAccountsIif(settings: SchoolSettings, heads: Array<{ name: string; type: 'INCOME' | 'EXPENSE' }>): string {
  const accts = new Map<string, string>([
    [settings.tally.cashLedger, 'BANK'],
    [settings.tally.bankLedger, 'BANK'],
  ]);
  for (const h of heads) {
    const n = ledgerFor(settings, h.name);
    if (!accts.has(n)) accts.set(n, h.type === 'INCOME' ? 'INC' : 'EXP');
  }
  return ['!ACCNT\tNAME\tACCNTTYPE', ...[...accts].map(([n, t]) => `ACCNT\t${iifText(n)}\t${t}`)].join('\r\n') + '\r\n';
}

export interface PayrollEmployee {
  employeeCode: string;
  firstName: string;
  lastName: string | null;
  gender: string;
  dob: Date | null;
  joiningDate: Date;
  designation: string;
  department: string | null;
  email: string | null;
  phone: string | null;
  panNo: string | null;
  uan: string | null;
  bankName: string | null;
  bankAccount: string | null;
  ifsc: string | null;
  basicSalary: number;
  allowances: number;
  deductions: number;
}

/** Employee master in the column layout of Paybooks' bulk employee upload. */
export function paybooksEmployeesCsv(rows: PayrollEmployee[]): string {
  return toCsv(
    rows.map((e) => ({
      'Employee Code': e.employeeCode,
      'First Name': e.firstName,
      'Last Name': e.lastName ?? '',
      Gender: e.gender === 'MALE' ? 'Male' : e.gender === 'FEMALE' ? 'Female' : 'Other',
      'Date of Birth': e.dob ? dmy(e.dob) : '',
      'Date of Joining': dmy(e.joiningDate),
      Designation: e.designation,
      Department: e.department ?? '',
      'Official Email': e.email ?? '',
      Mobile: e.phone ?? '',
      PAN: e.panNo ?? '',
      UAN: e.uan ?? '',
      'Bank Name': e.bankName ?? '',
      'Account Number': e.bankAccount ?? '',
      IFSC: e.ifsc ?? '',
      'Basic (Monthly)': e.basicSalary.toFixed(2),
      'Allowances (Monthly)': e.allowances.toFixed(2),
      'Deductions (Monthly)': e.deductions.toFixed(2),
      'CTC (Annual)': ((e.basicSalary + e.allowances) * 12).toFixed(2),
    }))
  );
}

/** Monthly attendance / loss-of-pay sheet for Paybooks' attendance import. Half days count as 0.5. */
export function paybooksAttendanceCsv(month: string, daysInMonth: number, rows: Array<{ employeeCode: string; name: string; present: number; halfDays: number; leave: number; absent: number; holidays: number }>): string {
  return toCsv(
    rows.map((r) => {
      const lop = r.absent + r.halfDays * 0.5;
      return {
        'Employee Code': r.employeeCode,
        'Employee Name': r.name,
        Month: month,
        'Total Days': daysInMonth,
        'Days Present': r.present + r.halfDays * 0.5,
        'Paid Leave': r.leave,
        Holidays: r.holidays,
        'LOP Days': lop,
        'Payable Days': Math.max(0, daysInMonth - lop),
      };
    })
  );
}
