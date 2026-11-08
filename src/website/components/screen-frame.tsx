import Image from 'next/image';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SCREENS, type ScreenId } from '../content/screens.generated';

interface FrameProps {
  id: ScreenId;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  /** Crop desktop screenshots to a fixed ratio (top-aligned). Omit to show the whole screen. */
  aspect?: 'wide' | 'video' | 'none';
}

const ASPECT = { wide: 'aspect-[16/10]', video: 'aspect-video', none: '' } as const;

/** A real Vidyalaya screenshot inside a minimal browser window. */
export function BrowserFrame({ id, alt, className, priority, sizes = '(min-width: 1024px) 50vw, 100vw', aspect = 'wide' }: FrameProps) {
  const s = SCREENS[id];
  return (
    <div className={cn('overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/10 dark:ring-white/10', className)}>
      <div className="flex items-center gap-3 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/90 dark:bg-white/[0.04] px-3 py-2 sm:px-4 sm:py-2.5">
        <span className="flex shrink-0 gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-rose-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
        </span>
        <span className="mx-auto flex h-6 min-w-0 max-w-sm flex-1 items-center justify-center gap-1.5 rounded-md bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-white/10">
          <Lock className="size-3 shrink-0 text-emerald-500" aria-hidden="true" />
          <span className="truncate">Vidyalaya · {alt}</span>
        </span>
        <span className="hidden w-12 sm:block" aria-hidden="true" />
      </div>
      <div className={cn('relative overflow-hidden bg-slate-50 dark:bg-white/[0.04]', ASPECT[aspect])}>
        <Image src={s.src} width={s.width} height={s.height} alt={alt} sizes={sizes} priority={priority} className={cn('block w-full', aspect === 'none' ? 'h-auto' : 'h-full object-cover object-top')} />
      </div>
    </div>
  );
}

/** A real Vidyalaya mobile screenshot inside a phone. */
export function PhoneFrame({ id, alt, className, priority, sizes = '(min-width: 1024px) 300px, 60vw' }: Omit<FrameProps, 'aspect'>) {
  const s = SCREENS[id];
  return (
    <div className={cn('relative rounded-[2.4rem] bg-slate-900 p-[0.55rem] shadow-2xl shadow-slate-900/30 ring-1 ring-white/10', className)}>
      <span className="absolute left-1/2 top-[1.1rem] z-10 h-[0.95rem] w-[30%] -translate-x-1/2 rounded-full bg-slate-900" aria-hidden="true" />
      <div className="relative aspect-[9/19.5] overflow-hidden rounded-[1.9rem] bg-white dark:bg-slate-900">
        <Image src={s.src} width={s.width} height={s.height} alt={alt} sizes={sizes} priority={priority} className="block h-full w-full object-cover object-top" />
      </div>
    </div>
  );
}

/** Picks the right frame for the screenshot. */
export function ScreenShot(props: FrameProps & { phoneClassName?: string }) {
  const { phoneClassName, ...rest } = props;
  if (SCREENS[props.id].mobile) return <PhoneFrame {...rest} className={cn('mx-auto w-[min(17rem,70%)]', phoneClassName)} />;
  return <BrowserFrame {...rest} />;
}

export function isMobileScreen(id: ScreenId) {
  return SCREENS[id].mobile;
}
