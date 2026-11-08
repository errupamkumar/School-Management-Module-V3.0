'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Cookie } from 'lucide-react';
import { CONSENT_EVENT, CONSENT_KEY, TRACKING_ENABLED, setConsent } from '../analytics';

/** Asks before Google Analytics / Ads cookies are used. Shown only when a Google tag is configured. */
export function ConsentBanner() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!TRACKING_ENABLED) return;
    let choice: string | null = null;
    try {
      choice = localStorage.getItem(CONSENT_KEY);
    } catch {
      // storage unavailable: ask every visit
    }
    const show = () => setOpen(true);
    if (!choice) {
      const t = setTimeout(show, 900);
      window.addEventListener(CONSENT_EVENT, show);
      return () => {
        clearTimeout(t);
        window.removeEventListener(CONSENT_EVENT, show);
      };
    }
    window.addEventListener(CONSENT_EVENT, show);
    return () => window.removeEventListener(CONSENT_EVENT, show);
  }, []);

  const choose = (granted: boolean) => {
    setConsent(granted);
    setOpen(false);
  };

  if (!TRACKING_ENABLED) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-live="polite"
          aria-label="Cookie choice"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-2xl shadow-slate-900/15 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 sm:inset-x-auto sm:left-5 sm:mx-0"
        >
          <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <Cookie className="size-5 text-indigo-600 dark:text-indigo-400" /> Your privacy choice
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            With your permission we use Google Analytics and Google Ads cookies to measure visits and the performance of our ads. Essential settings, such as your theme, are always kept.{' '}
            <Link href="/privacy" className="font-semibold text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300">
              Privacy Policy
            </Link>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => choose(true)} className="web-btn web-btn-primary px-5 py-2.5">
              Accept
            </button>
            <button type="button" onClick={() => choose(false)} className="web-btn web-btn-secondary px-5 py-2.5">
              Decline
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Footer link that reopens the banner. */
export function CookieSettingsButton({ className }: { className?: string }) {
  if (!TRACKING_ENABLED) return null;
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(CONSENT_EVENT))} className={className}>
      Cookie settings
    </button>
  );
}
