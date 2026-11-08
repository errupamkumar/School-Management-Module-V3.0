import Link from 'next/link';
import { cn } from '@/lib/utils';

/** The Vidyalaya mark — same artwork as src/app/icon.svg. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('size-9 drop-shadow-[0_6px_14px_rgb(99_102_241/0.35)]', className)} aria-hidden="true">
      <defs>
        <linearGradient id="vidyalaya-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#vidyalaya-mark)" />
      <path d="M32 16 8 27l24 11 18-8.25V40h4V27z" fill="#fff" />
      <path d="M18 34v8c0 3.9 6.3 7 14 7s14-3.1 14-7v-8l-14 6.4z" fill="#fff" opacity=".9" />
    </svg>
  );
}

export function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn('group flex items-center gap-2.5 rounded-xl', className)} aria-label="Vidyalaya — home">
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
      <span className="leading-none">
        <span className={cn('block font-display text-lg font-extrabold tracking-tight', dark ? 'text-white' : 'text-slate-900 dark:text-white')}>Vidyalaya</span>
        <span className={cn('mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.2em]', dark ? 'text-indigo-200/70' : 'text-slate-400')}>School ERP</span>
      </span>
    </Link>
  );
}
