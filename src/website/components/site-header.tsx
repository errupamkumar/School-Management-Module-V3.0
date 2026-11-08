'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { ArrowRight, ChevronDown, LayoutDashboard, LogIn, Menu, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCENTS, CATEGORIES, NAV, SITE } from '../content/site';
import { featuresIn } from '../content/features';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';

function AuthButtons({ compact = false }: { compact?: boolean }) {
  const { status } = useSession();
  if (status === 'authenticated')
    return (
      <Link href="/" className={cn('web-btn web-btn-primary', compact && 'w-full')}>
        <LayoutDashboard /> Open dashboard
      </Link>
    );
  return (
    <>
      <Link href={SITE.loginHref} className={cn('web-btn', compact ? 'web-btn-secondary w-full' : 'px-4 text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300')}>
        <LogIn /> Log in
      </Link>
      <Link href={SITE.signupHref} className={cn('web-btn web-btn-primary', compact && 'w-full')}>
        Start free trial <ArrowRight />
      </Link>
    </>
  );
}

function MegaMenu({ onNavigate, onMouseEnter, onMouseLeave }: { onNavigate: () => void; onMouseEnter: () => void; onMouseLeave: () => void }) {
  return (
    <div className="absolute inset-x-4 top-full z-50 hidden pt-2 sm:inset-x-6 lg:inset-x-8 lg:block" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="origin-top overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 shadow-2xl shadow-slate-900/15 backdrop-blur-xl"
      >
        <div className="grid gap-x-4 gap-y-6 p-6 md:grid-cols-3 xl:grid-cols-6">
          {CATEGORIES.map((c) => (
            <div key={c.key}>
              <p className="px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{c.label}</p>
              <ul className="mt-2 space-y-0.5">
                {featuresIn(c.key).map((f) => (
                  <li key={f.slug}>
                    <Link href={`/features/${f.slug}`} onClick={onNavigate} className="group flex items-center gap-2.5 rounded-xl p-2 transition hover:bg-slate-50 dark:hover:bg-white/5">
                      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm', ACCENTS[f.accent].icon)}>
                        <f.icon className="size-4" />
                      </span>
                      <span className="text-sm font-semibold leading-tight text-slate-800 dark:text-slate-100 group-hover:text-indigo-700">{f.short}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-white/10 bg-gradient-to-r from-indigo-50 dark:from-indigo-950/40 via-violet-50 to-fuchsia-50 dark:to-fuchsia-950/30 px-6 py-4">
          <p className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <Sparkles className="size-4 text-violet-600" /> Every feature works in 12 Indian languages, on any device.
          </p>
          <Link href="/features" onClick={onNavigate} className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:gap-2.5 hover:text-indigo-800">
            Explore all features <ArrowRight className="size-4 transition-all" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = React.useState(false);
  const [mega, setMega] = React.useState(false);
  const [mobile, setMobile] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 12));

  // Close menus after navigation (adjusting state during render, not in an effect).
  const [lastPath, setLastPath] = React.useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMega(false);
    setMobile(false);
  }

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMega(false);
        setMobile(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = mobile ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobile]);

  const openMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMega(true);
  };
  const closeMegaSoon = () => {
    closeTimer.current = setTimeout(() => setMega(false), 140);
  };

  return (
    <header className={cn('sticky top-0 z-50 transition-all duration-300', scrolled || mobile ? 'border-b border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 shadow-[0_8px_30px_-12px_rgb(15_23_42/0.12)] backdrop-blur-xl' : 'border-b border-transparent bg-transparent')}>
      <div className="web-container relative flex h-16 items-center gap-2 lg:h-[4.5rem] lg:gap-6">
        <AnimatePresence>{mega && <MegaMenu onNavigate={() => setMega(false)} onMouseEnter={openMega} onMouseLeave={closeMegaSoon} />}</AnimatePresence>
        <Logo />
        <nav className="relative ml-4 hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) =>
            'mega' in item && item.mega ? (
              <div key={item.label} className="relative" onMouseEnter={openMega} onMouseLeave={closeMegaSoon}>
                <button
                  type="button"
                  aria-expanded={mega}
                  aria-haspopup="true"
                  onClick={() => setMega((m) => !m)}
                  className={cn('flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition', mega || pathname.startsWith('/features') ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white')}
                >
                  {item.label}
                  <ChevronDown className={cn('size-4 transition-transform', mega && 'rotate-180')} />
                </button>
              </div>
            ) : (
              <Link key={item.label} href={item.href} className={cn('rounded-full px-3.5 py-2 text-sm font-medium transition', pathname === item.href ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white')}>
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <AuthButtons />
        </div>
        <ThemeToggle className="ml-auto lg:hidden" />
        <button type="button" className="flex size-10 items-center justify-center rounded-full text-slate-700 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-white/10 lg:hidden" aria-label={mobile ? 'Close menu' : 'Open menu'} aria-expanded={mobile} onClick={() => setMobile((m) => !m)}>
          {mobile ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'calc(100dvh - 4rem)' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-y-auto border-t border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900 lg:hidden"
          >
            <div className="web-container space-y-6 py-6">
              <div className="grid gap-2">
                {NAV.filter((n) => !('mega' in n)).map((n) => (
                  <Link key={n.label} href={n.href} onClick={() => setMobile(false)} className="rounded-xl px-3 py-2.5 text-base font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-white/5">
                    {n.label}
                  </Link>
                ))}
              </div>
              {CATEGORIES.map((c) => (
                <div key={c.key}>
                  <p className="px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{c.label}</p>
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    {featuresIn(c.key).map((f) => (
                      <Link key={f.slug} href={`/features/${f.slug}`} onClick={() => setMobile(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5">
                        <f.icon className={cn('size-4 shrink-0', ACCENTS[f.accent].text)} /> <span className="truncate">{f.short}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <Link href="/features" onClick={() => setMobile(false)} className="flex items-center gap-1.5 px-3 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                Explore all features <ArrowRight className="size-4" />
              </Link>
              <div className="grid gap-2 border-t border-slate-100 dark:border-white/10 pt-6">
                <AuthButtons compact />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
