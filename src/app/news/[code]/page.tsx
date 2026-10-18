'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Newspaper } from 'lucide-react';
import { NewsHeader, type PublicSchool } from '@/components/news-header';
import { formatDate } from '@/lib/utils';

interface PostCard {
  title: string;
  slug: string;
  excerpt: string;
  coverFileId: string | null;
  authorName: string;
  publishedAt: string;
}

/** Public school news page (no sign-in). Only posts the school marked as public are shown. */
export default function PublicNews() {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = React.useState<{ school: PublicSchool; posts: PostCard[] } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    fetch(`/api/public/blog/${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((j) => (j.success ? setData(j.data) : setError(j.error ?? 'Not found')))
      .catch(() => setError('Could not load the news page.'));
  }, [code]);
  if (error) return <p className="p-10 text-center text-sm text-ink-soft">{error}</p>;
  if (!data) return <p className="p-10 text-center text-sm text-ink-faint">Loading…</p>;
  return (
    <div className="min-h-dvh bg-canvas">
      <NewsHeader school={data.school} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
          <Newspaper className="size-6 text-brand-600" /> School news
        </h1>
        {!data.posts.length ? (
          <p className="text-sm text-ink-soft">No news yet.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.posts.map((p) => (
              <Link key={p.slug} href={`/news/${data.school.code}/${p.slug}`} className="card overflow-hidden transition-shadow hover:shadow-pop">
                {p.coverFileId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/public/blog/${data.school.code}/image/${p.coverFileId}`} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 text-brand-400">
                    <Newspaper className="size-10" />
                  </div>
                )}
                <div className="p-4">
                  <p className="font-semibold">{p.title}</p>
                  <p className="mt-1 line-clamp-3 text-sm text-ink-soft">{p.excerpt}</p>
                  <p className="mt-2 text-xs text-ink-faint">{formatDate(p.publishedAt, 'long')}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
