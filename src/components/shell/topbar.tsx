'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Command } from 'cmdk';
import { Bell, ChevronDown, Download, KeyRound, Languages, LogOut, Menu as MenuIcon, Moon, Search, Sun, UserCircle2 } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import { navFor } from '@/lib/navigation';
import { LANGS, isLang, navLabel } from '@/lib/i18n';
import { useApiMutation, useApiQuery } from '@/lib/api-client';
import { useLang, useTheme } from '@/components/providers';
import { Avatar, Badge } from '@/components/ui/display';
import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useApp } from './app-context';
import { usePwa } from '@/components/pwa';

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

function Notifications() {
  const { t } = useLang();
  const router = useRouter();
  const { data } = useApiQuery<{ items: NotificationRow[]; unread: number }>('/api/notifications', undefined, { refetchInterval: 60_000 });
  const markAll = useApiMutation('PATCH', '/api/notifications', { invalidate: ['/api/notifications', '/api/me'], silent: true });
  const unread = data?.unread ?? 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('notifications')} className="relative">
          <Bell />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,22rem)] p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-semibold">{t('notifications')}</p>
          {unread > 0 && (
            <button className="text-xs font-medium text-brand-600" onClick={() => markAll.mutate({ all: true })}>
              {t('markAllRead')}
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {!data?.items.length ? (
            <p className="px-4 py-10 text-center text-sm text-ink-soft">{t('noNotifications')}</p>
          ) : (
            data.items.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.isRead) markAll.mutate({ ids: [n.id] });
                  if (n.link) router.push(n.link);
                }}
                className={cn('block w-full border-b border-line/60 px-4 py-3 text-left last:border-0 hover:bg-canvas', !n.isRead && 'bg-brand-50/50 dark:bg-brand-500/5')}
              >
                <p className="flex items-center gap-2 text-sm font-medium text-ink">
                  {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-brand-600" />}
                  {n.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{n.body}</p>
                <p className="mt-1 text-[10px] text-ink-faint">{formatDateTime(n.createdAt)}</p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { me, role } = useApp();
  const { lang, t } = useLang();
  const router = useRouter();
  const items = navFor(role, me.permissions, { isDriver: me.isDriver, trackingEnabled: me.settings.liveTracking?.enabled, appCount: me.appCount });
  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] animate-fade-in bg-slate-950/50 backdrop-blur-[2px]" />
        <DialogPrimitive.Content className="fixed left-1/2 top-[12vh] z-[60] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 animate-zoom-in overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
          <DialogPrimitive.Title className="sr-only">{t('searchEverything')}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Jump to any page</DialogPrimitive.Description>
          <Command label={t('searchEverything')} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-faint">
            <div className="flex items-center gap-2 border-b border-line px-4">
              <Search className="size-4 text-ink-faint" />
              <Command.Input autoFocus placeholder={t('searchEverything')} className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-ink-faint" />
              <span className="kbd">Esc</span>
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
              <Command.Empty className="py-10 text-center text-sm text-ink-soft">No matches.</Command.Empty>
              <Command.Group heading="Pages">
                {items.map((it) => (
                  <Command.Item
                    key={it.href}
                    value={`${it.label} ${navLabel(lang, it.label)} ${it.group}`}
                    onSelect={() => go(it.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink data-[selected=true]:bg-brand-50 data-[selected=true]:text-brand-700 dark:data-[selected=true]:bg-brand-500/10 dark:data-[selected=true]:text-brand-300"
                  >
                    <it.icon className="size-4 text-ink-faint" />
                    {navLabel(lang, it.label)}
                    <span className="ml-auto text-[11px] text-ink-faint">{it.group}</span>
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Account">
                <Command.Item onSelect={() => go('/profile')} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-canvas">
                  <UserCircle2 className="size-4 text-ink-faint" /> {t('myProfile')}
                </Command.Item>
                <Command.Item onSelect={() => go('/notifications')} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-canvas">
                  <Bell className="size-4 text-ink-faint" /> {t('notifications')}
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Topbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const { me, isFamily, childId, setChildId } = useApp();
  const { theme, toggle } = useTheme();
  const { lang, setLang, t } = useLang();
  const pwa = usePwa();
  const allowed = me.settings?.languages?.enabled ?? ['en', 'hi'];
  const enabledLangs = LANGS.filter((l) => allowed.includes(l.code) && isLang(l.code));

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-surface/85 px-3 backdrop-blur-md sm:gap-3 sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open menu">
        <MenuIcon />
      </Button>

      <button
        type="button"
        onClick={onSearch}
        className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-canvas px-3 text-sm text-ink-faint transition-colors hover:border-brand-300 sm:max-w-sm"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">{t('search')}</span>
        <span className="kbd ml-auto hidden sm:inline">Ctrl K</span>
      </button>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {isFamily && me.children.length > 1 && (
          <select
            aria-label="Select child"
            value={childId ?? ''}
            onChange={(e) => setChildId(e.target.value)}
            className="h-9 w-28 min-w-0 rounded-xl border border-line bg-surface px-2 text-sm sm:w-auto sm:max-w-[12rem]"
          >
            {me.children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.classLabel}
              </option>
            ))}
          </select>
        )}
        <Badge tone="brand" className="hidden md:inline-flex">
          {t('academicYear')} {me.school.academicYear}
        </Badge>
        {enabledLangs.length > 1 && (
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('language')} title={t('language')}>
                <Languages />
              </Button>
            </MenuTrigger>
            <MenuContent>
              <MenuLabel>{t('language')}</MenuLabel>
              {enabledLangs.map((l) => (
                <MenuItem key={l.code} onSelect={() => setLang(l.code)}>
                  <span className={cn('w-4', lang !== l.code && 'invisible')}>✓</span> {l.native}
                  {l.code !== 'en' && <span className="ml-auto pl-3 text-[11px] text-ink-faint">{l.name}</span>}
                </MenuItem>
              ))}
            </MenuContent>
          </Menu>
        )}
        <Button variant="ghost" size="icon" onClick={toggle} aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')}>
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>
        <Notifications />
        <Menu>
          <MenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-canvas">
              <Avatar name={me.user.name} src={me.user.avatarUrl} size={32} />
              <span className="hidden text-left leading-tight md:block">
                <span className="block max-w-[9rem] truncate text-sm font-semibold text-ink">{me.user.name}</span>
                <span className="block text-[11px] text-ink-faint">{me.user.roleLabel}</span>
              </span>
              <ChevronDown className="hidden size-4 text-ink-faint md:block" />
            </button>
          </MenuTrigger>
          <MenuContent>
            <MenuLabel>
              {me.user.username} · {me.school.code}
            </MenuLabel>
            <MenuItem>
              <Link href="/profile" className="flex w-full items-center gap-2.5">
                <UserCircle2 /> {t('myProfile')}
              </Link>
            </MenuItem>
            <MenuItem>
              <Link href="/profile#password" className="flex w-full items-center gap-2.5">
                <KeyRound /> Change password
              </Link>
            </MenuItem>
            {pwa.canInstall && (
              <MenuItem onSelect={() => void pwa.install()}>
                <Download /> {t('installApp')}
              </MenuItem>
            )}
            <MenuSeparator />
            <MenuItem danger onSelect={() => signOut({ callbackUrl: '/login' })}>
              <LogOut /> {t('signOut')}
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </header>
  );
}
