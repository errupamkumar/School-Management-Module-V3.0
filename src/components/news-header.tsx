'use client';

import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

export interface PublicSchool {
  code: string;
  name: string;
  logoUrl: string | null;
  tagline: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
}
export function NewsHeader({ school }: { school: PublicSchool }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
        {school.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={school.logoUrl} alt="" className="size-12 rounded-xl object-contain" />
        ) : (
          <span className="flex size-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <GraduationCap className="size-6" />
          </span>
        )}
        <div className="min-w-0">
          <Link href={`/news/${school.code}`} className="block truncate text-lg font-bold hover:underline">
            {school.name}
          </Link>
          <p className="truncate text-xs text-ink-faint">{school.tagline ?? [school.city, school.state].filter(Boolean).join(', ')}</p>
        </div>
        {school.website && (
          <a href={school.website} className="ml-auto text-sm text-brand-600 hover:underline" rel="noopener noreferrer">
            Website
          </a>
        )}
      </div>
    </header>
  );
}

