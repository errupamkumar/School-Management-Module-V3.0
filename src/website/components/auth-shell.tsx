import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SITE } from '../content/site';
import { Logo } from './logo';
import { PoweredBy } from './powered-by';
import { ThemeToggle } from './theme-toggle';
import { CookieSettingsButton } from './consent-banner';

/** Frame of the sign-in and sign-up pages: the website's look, one focused card. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-b from-indigo-50/80 via-white to-white dark:from-indigo-950/40 dark:via-slate-950 dark:to-slate-950" aria-hidden="true" />
      <div className="web-grid-bg web-mask-fade pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-32 top-24 size-[28rem] rounded-full bg-indigo-300/25 blur-3xl dark:bg-indigo-600/20" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 bottom-10 size-[30rem] rounded-full bg-fuchsia-300/20 blur-3xl dark:bg-fuchsia-600/10" aria-hidden="true" />

      <header className="web-container relative z-10 flex h-16 items-center gap-2 lg:h-[4.5rem]">
        <Logo />
        <Link href="/" className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-indigo-700 dark:text-slate-300 dark:hover:text-indigo-300">
          <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Back to website</span>
          <span className="sm:hidden">Website</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 justify-center px-4 py-8 sm:items-center sm:py-12">{children}</main>

      <footer className="web-container relative z-10 flex flex-col items-center gap-3 py-6 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:justify-between">
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-start">
          <span>
            © {new Date().getFullYear()} {SITE.product} · Data hosted in India
          </span>
          <Link href="/privacy" className="hover:text-indigo-700 dark:hover:text-indigo-300">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-indigo-700 dark:hover:text-indigo-300">
            Terms
          </Link>
          <CookieSettingsButton className="hover:text-indigo-700 dark:hover:text-indigo-300" />
        </p>
        <PoweredBy />
      </footer>
    </div>
  );
}
