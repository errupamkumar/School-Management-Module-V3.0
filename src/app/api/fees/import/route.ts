import { z } from 'zod';
import { body, route } from '@/server/api';
import { todayUTC } from '@/server/common';
import { applyAdvance, collectPayment, createInstantInvoices } from '@/server/services/fees';
import { importBody, parseAmount, parseMode, parseSheetDate, sheetRow, type RowError } from '@/server/services/imports';

/**
 * Fees import from a spreadsheet:
 *  - DUES: opening balances / one-off charges → one instant invoice per row
 *  - PAYMENTS: past receipts (e.g. from the old software) → real receipts,
 *    allocated oldest-first exactly like counter collection
 * Every row is checked first; nothing is written while any row is invalid.
 */
export const POST = route({ module: 'fees', action: 'create' }, async (ctx, req) => {
  const input = await body(req, importBody.extend({ kind: z.enum(['DUES', 'PAYMENTS']) }));
  const admNos = [...new Set(input.rows.map((r) => (r.admissionNo ?? '').trim()).filter(Boolean))];
  const students = await ctx.db.student.findMany({ where: { admissionNo: { in: admNos } }, select: { id: true, admissionNo: true, status: true } });
  const byAdm = new Map(students.map((s) => [s.admissionNo.toLowerCase(), s]));
  const errors: RowError[] = [];
  const today = todayUTC();

  if (input.kind === 'DUES') {
    const parsed: Array<{ studentId: string; title: string; description: string; amount: number; dueDate: string }> = [];
    input.rows.forEach((r, i) => {
      const s = byAdm.get((r.admissionNo ?? '').trim().toLowerCase());
      const amount = parseAmount(r.amount);
      const dueDate = parseSheetDate(r.dueDate);
      const title = (r.title ?? '').trim().slice(0, 80);
      const problem = !s ? `admission no. "${r.admissionNo ?? ''}" not found` : s.status !== 'ACTIVE' ? 'student is not active' : title.length < 3 ? 'title is required (3+ characters)' : !amount ? 'amount must be a positive number' : !dueDate ? 'dueDate must be a date' : null;
      if (problem) errors.push({ row: sheetRow(i), error: problem });
      else parsed.push({ studentId: s!.id, title, description: (r.description ?? '').trim().slice(0, 120) || title, amount: amount!, dueDate: dueDate! });
    });
    const total = parsed.reduce((a, p) => a + p.amount, 0);
    if (input.dryRun || errors.length) return { valid: parsed.length, errors, summary: `${parsed.length} invoices worth ₹${total.toLocaleString('en-IN')}` };
    // Rows with the same charge become one batch (one numbering reservation).
    const groups = new Map<string, typeof parsed>();
    for (const p of parsed) {
      const k = `${p.title}|${p.description}|${p.amount}|${p.dueDate}`;
      groups.set(k, [...(groups.get(k) ?? []), p]);
    }
    let created = 0;
    for (const g of groups.values()) {
      const ids = await createInstantInvoices(ctx.db, ctx.user.schoolId, ctx.school.settings, {
        studentIds: g.map((p) => p.studentId),
        title: g[0].title,
        items: [{ description: g[0].description, amount: Math.round(g[0].amount * 100) }],
        dueDate: new Date(`${g[0].dueDate}T00:00:00.000Z`),
      });
      created += ids.length;
    }
    await applyAdvance(ctx.db, ctx.user.schoolId, [...new Set(parsed.map((p) => p.studentId))]);
    await ctx.audit('IMPORT', 'FeeInvoice', null, `Imported ${created} dues worth ₹${total}`);
    return { created, failed: [], summary: `${created} invoices imported (₹${total.toLocaleString('en-IN')})` };
  }

  const parsed: Array<{ row: number; studentId: string; amount: number; date: string; mode: NonNullable<ReturnType<typeof parseMode>>; reference: string | null; remarks: string | null }> = [];
  input.rows.forEach((r, i) => {
    const s = byAdm.get((r.admissionNo ?? '').trim().toLowerCase());
    const amount = parseAmount(r.amount);
    const date = parseSheetDate(r.date);
    const mode = parseMode(r.mode || 'cash');
    const problem = !s ? `admission no. "${r.admissionNo ?? ''}" not found` : !amount ? 'amount must be a positive number' : !date ? 'date must be a date' : new Date(`${date}T00:00:00.000Z`) > today ? 'date is in the future' : !mode ? `unknown mode "${r.mode}" (use Cash, UPI, Card, Cheque, DD, NEFT, Net banking)` : null;
    if (problem) errors.push({ row: sheetRow(i), error: problem });
    else parsed.push({ row: sheetRow(i), studentId: s!.id, amount: amount!, date: date!, mode: mode!, reference: (r.reference ?? '').trim().slice(0, 60) || null, remarks: (r.remarks ?? '').trim().slice(0, 150) || null });
  });
  const total = parsed.reduce((a, p) => a + p.amount, 0);
  if (input.dryRun || errors.length) return { valid: parsed.length, errors, summary: `${parsed.length} receipts worth ₹${total.toLocaleString('en-IN')}` };

  // Oldest first so allocation follows the real order of payments.
  parsed.sort((a, b) => a.date.localeCompare(b.date));
  const failed: RowError[] = [];
  let created = 0;
  for (const p of parsed) {
    try {
      await collectPayment(ctx.db, ctx.user.schoolId, ctx.school.settings, {
        studentIds: [p.studentId],
        amount: Math.round(p.amount * 100),
        mode: p.mode,
        paidAt: new Date(`${p.date}T00:00:00.000Z`),
        referenceNo: p.mode === 'CHEQUE' || p.mode === 'DD' ? null : p.reference,
        chequeNo: p.mode === 'CHEQUE' || p.mode === 'DD' ? p.reference : null,
        remarks: ['Imported', p.remarks].filter(Boolean).join(' · '),
        collectedBy: { id: ctx.user.id, name: ctx.user.name },
      });
      created++;
    } catch (e) {
      failed.push({ row: p.row, error: (e as Error).message });
    }
  }
  await ctx.audit('IMPORT', 'FeePayment', null, `Imported ${created} receipts (₹${total}); ${failed.length} failed`);
  return { created, failed, summary: `${created} receipts imported${failed.length ? `, ${failed.length} failed` : ''}` };
});
