'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsLeft, ChevronsRight, GraduationCap, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navFor, type NavItem } from '@/lib/navigation';
import { groupLabel, navLabel } from '@/lib/i18n';
import { useLang } from '@/components/providers';
import { Tooltip } from '@/components/ui/display';
import { useApp } from './app-context';

const GROUP_ORDER = ['Overview', 'My School', 'Front Office', 'People', 'Academics', 'Examinations', 'Finance', 'Communication', 'Operations', 'Student Life', 'Administration'];

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: { collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onMobileClose: () => void }) {
  const { me, role } = useApp();
  const { lang } = useLang();
  const pathname = usePathname();
  const items = React.useMemo(() => navFor(role, me.permissions, { isDriver: me.isDriver, trackingEnabled: me.settings.liveTracking?.enabled, appCount: me.appCount }), [role, me.permissions, me.isDriver, me.settings.liveTracking?.enabled, me.appCount]);
  const groups = React.useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const it of items) map.set(it.group, [...(map.get(it.group) ?? []), it]);
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ name: g, items: map.get(g)! }));
  }, [items]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden" onClick={onMobileClose} aria-hidden />}
      <aside
        aria-label="Main navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-line bg-surface transition-[width,transform] duration-200',
          'w-72',
          collapsed ? 'lg:w-[72px]' : 'lg:w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-4">
          {me.school.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.school.logoUrl} alt="" className="size-9 shrink-0 rounded-xl object-cover" />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/25">
              <GraduationCap className="size-5" />
            </span>
          )}
          <div className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
            <p className="truncate text-sm font-bold text-ink">{me.school.shortName || me.school.name}</p>
            <p className="truncate text-[11px] text-ink-faint">{me.school.name}</p>
          </div>
          <button type="button" onClick={onMobileClose} className="rounded-lg p-1.5 text-ink-soft hover:bg-canvas lg:hidden" aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          {groups.map((g) => (
            <div key={g.name} className="mb-4">
              <p className={cn('mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint', collapsed && 'lg:invisible lg:h-0 lg:mb-0')}>
                {groupLabel(lang, g.name)}
              </p>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = isActive(it.href);
                  const label = navLabel(lang, it.label);
                  const link = (
                    <Link
                      href={it.href}
                      onClick={onMobileClose}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                        active ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'text-ink-soft hover:bg-canvas hover:text-ink',
                        collapsed && 'lg:justify-center lg:px-0'
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      <it.icon className={cn('size-[18px] shrink-0', active ? 'text-brand-600 dark:text-brand-300' : 'text-ink-faint group-hover:text-ink-soft')} />
                      <span className={cn('truncate', collapsed && 'lg:hidden')}>{label}</span>
                    </Link>
                  );
                  return <li key={it.href}>{collapsed ? <Tooltip content={label} side="right">{link}</Tooltip> : link}</li>;
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="hidden shrink-0 border-t border-line p-3 lg:block">
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-ink-soft hover:bg-canvas hover:text-ink"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : (
              <>
                <ChevronsLeft className="size-4" /> Collapse
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
