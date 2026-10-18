import { forbidden, route } from '@/server/api';

/** Only manual entries can be deleted; fee/salary/store postings are reversed from their source. */
export const DELETE = route({ module: 'accounts', action: 'delete' }, async (ctx, _req, { id }) => {
  const e = await ctx.db.ledgerEntry.findUniqueOrThrow({ where: { id } });
  if (e.source !== 'MANUAL') throw forbidden(`This entry was posted automatically by ${e.source.toLowerCase()} — cancel it from there.`);
  await ctx.db.ledgerEntry.delete({ where: { id } });
  await ctx.audit('DELETE', 'LedgerEntry', id, `${e.type} ₹${Number(e.amount)} — ${e.description}`);
  return { deleted: true };
});
