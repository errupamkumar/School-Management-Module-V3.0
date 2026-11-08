'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/providers';

/** Light/dark switch. Shares the app's per-device theme setting (localStorage "vidyalaya-theme"). */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={cn('relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-slate-600 ring-1 ring-slate-200 transition hover:text-indigo-700 hover:ring-indigo-300 dark:text-slate-300 dark:ring-white/15 dark:hover:text-indigo-300 dark:hover:ring-indigo-400/40', className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={theme} initial={{ y: -18, opacity: 0, rotate: -90 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 18, opacity: 0, rotate: 90 }} transition={{ duration: 0.22 }}>
          {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
