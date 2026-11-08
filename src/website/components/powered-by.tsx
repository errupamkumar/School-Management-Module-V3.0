import Image from 'next/image';
import { cn } from '@/lib/utils';
import { COMPANY } from '../content/company';

export function PoweredBy({ className }: { className?: string }) {
  return (
    <a href={COMPANY.url} target="_blank" rel="noopener noreferrer" className={cn('group inline-flex items-center gap-2', className)} aria-label={`Powered by ${COMPANY.name} (opens in a new tab)`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Powered by</span>
      <span className="rounded-lg bg-white px-2 py-1 shadow-sm ring-1 ring-slate-200 transition group-hover:shadow-md group-hover:ring-emerald-300 dark:ring-white/10">
        <Image src={COMPANY.logo.src} alt={COMPANY.name} width={COMPANY.logo.width} height={COMPANY.logo.height} sizes="96px" className="h-7 w-auto" />
      </span>
    </a>
  );
}
