import { z } from 'zod';
import { badRequest, query, route } from '@/server/api';
import { quickbooksAccountsIif, quickbooksIif, quickbooksJournalCsv } from '@/server/services/exporters';

/**
 * Download the ledger for QuickBooks.
 *   ?kind=accounts                         chart of accounts (IIF, Desktop)
 *   ?kind=journal&format=iif|csv&from&to   journal entries (IIF for Desktop, CSV for QuickBooks Online)
 * Ledger names follow the Tally ledger mapping in School Settings.
 */
export const GET = route({ module: 'accounts' }, async (ctx, req) => {
  const q = query(req, z.object({ kind: z.enum(['accounts', 'journal']).default('journal'), format: z.enum(['iif', 'csv']).default('csv'), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }));
  const settings = ctx.school.settings;
  let text: string;
  let filename: string;
  if (q.kind === 'accounts') {
    text = quickbooksAccountsIif(settings, await ctx.db.accountHead.findMany({ select: { name: true, type: true } }));
    filename = `quickbooks-accounts-${ctx.school.code}.iif`;
  } else {
    if (!q.from || !q.to) throw badRequest('Choose a date range.');
    if (q.to < q.from) throw badRequest('“To” date is before “from” date.');
    const rows = await ctx.db.ledgerEntry.findMany({
      where: { date: { gte: new Date(`${q.from}T00:00:00.000Z`), lte: new Date(`${q.to}T00:00:00.000Z`) } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      take: 20_000,
      include: { head: { select: { name: true } } },
    });
    const lines = rows.map((r) => ({ id: r.id, date: r.date, type: r.type, amount: Number(r.amount), headName: r.head.name, description: r.description, mode: r.mode, referenceNo: r.referenceNo, party: r.party }));
    text = q.format === 'iif' ? quickbooksIif(settings, lines) : quickbooksJournalCsv(settings, lines);
    filename = `quickbooks-journal-${ctx.school.code}-${q.from}-to-${q.to}.${q.format}`;
  }
  await ctx.audit('EXPORT', 'QuickBooks', null, filename);
  return new Response(text, { headers: { 'Content-Type': filename.endsWith('.csv') ? 'text/csv; charset=utf-8' : 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' } });
});
