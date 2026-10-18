import { z } from 'zod';
import type { Ctx } from '../api';

export const blogInput = z.object({
  title: z.string().trim().min(3).max(150),
  excerpt: z.string().trim().max(300).optional().nullable(),
  body: z.string().trim().min(20, 'Write at least a few sentences').max(100_000),
  coverFileId: z.string().optional().nullable(),
  isPublic: z.boolean().default(false),
  action: z.enum(['draft', 'submit', 'publish']).default('draft'),
});

/** URL-safe slug from a title (ASCII; other scripts fall back to "post"). */
export function slugify(title: string): string {
  const s = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return s || 'post';
}

export async function uniqueSlug(ctx: Ctx, title: string, exceptId?: string): Promise<string> {
  const base = slugify(title);
  for (let i = 0; i < 50; i++) {
    const slug = i ? `${base}-${i + 1}` : base;
    const clash = await ctx.db.blogPost.findFirst({ where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } });
    if (!clash) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}
