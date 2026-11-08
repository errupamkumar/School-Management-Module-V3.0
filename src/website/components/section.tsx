import { cn } from '@/lib/utils';
import { Reveal } from './motion';

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'center',
  dark = false,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: 'center' | 'left';
  dark?: boolean;
  className?: string;
}) {
  return (
    <Reveal className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && <p className={cn('web-eyebrow', dark && 'bg-white/10 text-indigo-100 ring-white/15')}>{eyebrow}</p>}
      <h2 className={cn('web-h2 mt-4', dark && 'text-white')}>{title}</h2>
      {lead && <p className={cn('web-lead mt-4', dark && 'text-slate-300')}>{lead}</p>}
    </Reveal>
  );
}
