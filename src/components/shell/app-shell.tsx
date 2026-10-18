'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Lock } from 'lucide-react';
import { driverAccess, navForPath } from '@/lib/navigation';
import { hasPerm } from '@/lib/modules';
import { cn } from '@/lib/utils';
import { useLang } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { AppProvider, useApp } from './app-context';
import { Sidebar } from './sidebar';
import { CommandPalette, Topbar } from './topbar';

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span className="flex size-12 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
          <GraduationCap className="size-6" />
        </span>
        <p className="text-sm text-ink-soft">Loading your school…</p>
      </div>
    </div>
  );
}

/** Client-side mirror of the server's permission check, for a clear message instead of empty pages. */
function PageGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me } = useApp();
  const { t } = useLang();
  const item = navForPath(pathname);
  const allowed = item?.driver ? driverAccess(me.permissions, { isDriver: me.isDriver, trackingEnabled: me.settings.liveTracking?.enabled }) : !item || hasPerm(me.permissions, item.module, 'view');
  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10">
          <Lock className="size-7" />
        </span>
        <h1 className="text-lg font-semibold">{t('noAccess')}</h1>
        <p className="mt-1 max-w-md text-sm text-ink-soft">{t('noAccessHint')}</p>
        <Button asChild variant="secondary" className="mt-6">
          <Link href="/dashboard">{t('backToDashboard')}</Link>
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}

function Frame({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const { me } = useApp();
  const { t } = useLang();

  React.useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('vidyalaya-sidebar') === 'collapsed');
    } catch {
      // storage unavailable
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem('vidyalaya-sidebar', c ? 'expanded' : 'collapsed');
      } catch {
        // storage unavailable
      }
      return !c;
    });

  return (
    <div className="min-h-dvh">
      <Sidebar collapsed={collapsed} onToggle={toggle} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className={cn('flex min-h-dvh flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        <Topbar onMenu={() => setMobileOpen(true)} onSearch={() => setSearchOpen(true)} />
        {me.school.readOnlyReason ? (
          <div role="alert" className="border-b border-rose-200 bg-rose-50 px-6 py-2 text-center text-xs font-medium text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {me.school.readOnlyReason} Your data is safe and viewable, but changes are paused until the plan is renewed. Contact sales to continue.
          </div>
        ) : (
          me.school.status === 'TRIAL' &&
          me.school.trialEndsAt && (
            <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-center text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              Trial ends on {new Date(me.school.trialEndsAt).toLocaleDateString('en-IN')}. Contact sales to activate your subscription.
            </div>
          )
        )}
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <PageGate>{children}</PageGate>
        </main>
        <footer className="border-t border-line px-6 py-4 text-center text-xs text-ink-faint">
          © {new Date().getFullYear()} {me.school.name} · {t('poweredBy')} <span className="font-semibold text-ink-soft">Vidyalaya ERP</span>
        </footer>
      </div>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider fallback={<Splash />}>
      <Frame>{children}</Frame>
    </AppProvider>
  );
}
