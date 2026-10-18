import { z } from 'zod';
import { badRequest, query, route } from '@/server/api';
import { mastersXml, vouchersXml } from '@/server/services/tally';

/**
 * Download the ledger as Tally XML.
 *   ?kind=vouchers&from=YYYY-MM-DD&to=YYYY-MM-DD   Receipt/Payment vouchers
 *   ?kind=masters                                  ledger masters to import first
 */
export const GET = route({ module: 'accounts' }, async (ctx, req) => {
  const q = query(req, z.object({ kind: z.enum(['vouchers', 'masters']).default('vouchers'), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }));
  const settings = ctx.school.settings;
  let xml: string;
  let filename: string;
  if (q.kind === 'masters') {
    const heads = await ctx.db.accountHead.findMany({ select: { name: true, type: true } });
    xml = mastersXml(settings, heads);
    filename = `tally-ledgers-${ctx.school.code}.xml`;
  } else {
    if (!q.from || !q.to) throw badRequest('Choose a date range.');
    if (q.to < q.from) throw badRequest('“To” date is before “from” date.');
    const rows = await ctx.db.ledgerEntry.findMany({
      where: { date: { gte: new Date(`${q.from}T00:00:00.000Z`), lte: new Date(`${q.to}T00:00:00.000Z`) } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      take: 20_000,
      include: { head: { select: { name: true } } },
    });
    xml = vouchersXml(
      settings,
      rows.map((r) => ({ id: r.id, date: r.date, type: r.type, amount: Number(r.amount), headName: r.head.name, description: r.description, mode: r.mode, referenceNo: r.referenceNo, party: r.party }))
    );
    filename = `tally-vouchers-${ctx.school.code}-${q.from}-to-${q.to}.xml`;
  }
  await ctx.audit('EXPORT', 'Tally', null, filename);
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' } });
});
