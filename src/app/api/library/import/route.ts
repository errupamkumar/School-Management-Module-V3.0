import { body, route } from '@/server/api';
import { importBody, sheetRow, type RowError } from '@/server/services/imports';

/** Book catalogue import. Rows with the same ISBN (or title + author) as an existing book add copies to it. */
export const POST = route({ module: 'library', action: 'create' }, async (ctx, req) => {
  const input = await body(req, importBody);
  const errors: RowError[] = [];
  const parsed: Array<{ title: string; author: string | null; isbn: string | null; publisher: string | null; category: string | null; rackNo: string | null; copies: number }> = [];
  input.rows.forEach((r, i) => {
    const title = (r.title ?? '').trim().slice(0, 200);
    const copies = Number((r.copies ?? '1').trim() || 1);
    const isbn = (r.isbn ?? '').replace(/[\s-]/g, '') || null;
    if (title.length < 2) errors.push({ row: sheetRow(i), error: 'title is required' });
    else if (!Number.isInteger(copies) || copies < 1 || copies > 1000) errors.push({ row: sheetRow(i), error: 'copies must be a whole number from 1 to 1000' });
    else if (isbn && !/^(\d{9}[\dXx]|\d{13})$/.test(isbn)) errors.push({ row: sheetRow(i), error: 'ISBN must have 10 or 13 digits' });
    else parsed.push({ title, author: (r.author ?? '').trim().slice(0, 120) || null, isbn, publisher: (r.publisher ?? '').trim().slice(0, 120) || null, category: (r.category ?? '').trim().slice(0, 60) || null, rackNo: (r.rackNo ?? '').trim().slice(0, 20) || null, copies });
  });
  const total = parsed.reduce((a, b) => a + b.copies, 0);
  if (input.dryRun || errors.length) return { valid: parsed.length, errors, summary: `${parsed.length} titles, ${total} copies` };
  let created = 0;
  let topped = 0;
  for (const b of parsed) {
    const existing = await ctx.db.book.findFirst({ where: b.isbn ? { isbn: b.isbn } : { title: b.title, author: b.author } });
    if (existing) {
      await ctx.db.book.update({ where: { id: existing.id }, data: { copies: { increment: b.copies }, available: { increment: b.copies } } });
      topped++;
    } else {
      await ctx.db.book.create({ data: { schoolId: ctx.user.schoolId, ...b, available: b.copies } });
      created++;
    }
  }
  await ctx.audit('IMPORT', 'Book', null, `Imported ${created} new titles, added copies to ${topped}`);
  return { created, failed: [], summary: `${created} new titles, more copies for ${topped}` };
});
