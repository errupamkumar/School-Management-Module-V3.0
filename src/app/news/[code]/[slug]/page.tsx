'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Markdown } from '@/lib/markdown';
import { NewsHeader, type PublicSchool } from '@/components/news-header';

interface PublicPost {
  title: string;
  body: string;
  coverFileId: string | null;
  authorName: string;
  publishedAt: string;
}

export default function PublicNewsPost() {
  const { code, slug } = useParams<{ code: string; slug: string }>();
  const [data, setData] = React.useState<{ school: PublicSchool; post: PublicPost } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    fetch(`/api/public/blog/${encodeURIComponent(code)}/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return setError(j.error ?? 'Not found');
        setData(j.data);
        document.title = `${j.data.post.title} · ${j.data.school.name}`;
      })
      .catch(() => setError('Could not load this post.'));
  }, [code, slug]);
  if (error) return <p className="p-10 text-center text-sm text-ink-soft">{error}</p>;
  if (!data) return <p className="p-10 text-center text-sm text-ink-faint">Loading…</p>;
  return (
    <div className="min-h-dvh bg-canvas">
      <NewsHeader school={data.school} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href={`/news/${data.school.code}`} className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
          <ArrowLeft className="size-4" /> All news
        </Link>
        <article className="card overflow-hidden">
          {data.post.coverFileId && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/public/blog/${data.school.code}/image/${data.post.coverFileId}`} alt="" className="aspect-[21/9] w-full object-cover" />
          )}
          <div className="p-6 sm:p-8">
            <h1 className="text-2xl font-bold">{data.post.title}</h1>
            <p className="mt-1 text-sm text-ink-faint">
              {data.post.authorName} · {formatDate(data.post.publishedAt, 'long')}
            </p>
            <Markdown text={data.post.body} className="mt-6 space-y-3 text-[15px]" />
          </div>
        </article>
      </main>
    </div>
  );
}
