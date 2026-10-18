'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { AlertTriangle, Inbox, Loader2, RefreshCw, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { cn, initials } from '@/lib/utils';
import { Button } from './button';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card', className)} {...props} />;
}

export function CardHeader({ title, description, actions, className, icon: Icon }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string; icon?: LucideIcon }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-ink-soft">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}

const BADGE_TONES = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  info: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
} as const;
export type Tone = keyof typeof BADGE_TONES;

export function Badge({ tone = 'neutral', className, children, dot }: { tone?: Tone; className?: string; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold', BADGE_TONES[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, Tone> = {
  ACTIVE: 'success', PAID: 'success', SUCCESS: 'success', PRESENT: 'success', APPROVED: 'success', PASS: 'success', ADMITTED: 'success', CONFIRMED: 'success', COMPLETED: 'success', GRANTED: 'success', ANSWERED: 'success', DELIVERED: 'success', SENT: 'success',
  PARTIAL: 'warning', PENDING: 'warning', LATE: 'warning', HALF_DAY: 'warning', REQUESTED: 'warning', TRIAL: 'warning', INCOMPLETE: 'warning', OPEN: 'warning', QUEUED: 'warning',
  UNPAID: 'danger', ABSENT: 'danger', REJECTED: 'danger', FAIL: 'danger', CANCELLED: 'danger', SUSPENDED: 'danger', FAILED: 'danger', DECLINED: 'danger', OVERDUE: 'danger', WITHDRAWN: 'danger',
  LEAVE: 'info', HOLIDAY: 'info', ENQUIRY: 'info', APPLIED: 'info', INACTIVE: 'neutral', TRANSFERRED: 'neutral', PASSED_OUT: 'neutral',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <Badge tone={STATUS_TONES[status] ?? 'neutral'} dot>
      {label ?? status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
    </Badge>
  );
}

export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <AvatarPrimitive.Root className={cn('relative inline-flex shrink-0 overflow-hidden rounded-full', className)} style={{ width: size, height: size }}>
      {src && <AvatarPrimitive.Image src={src} alt={name} className="size-full object-cover" />}
      <AvatarPrimitive.Fallback
        className="flex size-full items-center justify-center font-semibold text-white"
        style={{ background: `hsl(${hue} 55% 52%)`, fontSize: Math.max(10, size * 0.38) }}
      >
        {initials(name) || '?'}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export function Tooltip({ content, children, side = 'top' }: { content: React.ReactNode; children: React.ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <TooltipPrimitive.Root delayDuration={250}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content side={side} sideOffset={6} className="z-[70] max-w-xs animate-fade-in rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-pop dark:bg-slate-700">
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-700/40', className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-brand-600', className)} />;
}

export function LoadingBlock({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-16 text-sm text-ink-soft', className)}>
      <Spinner /> {label}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: { icon?: LucideIcon; title: string; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
        <Icon className="size-6" />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10">
        <AlertTriangle className="size-6" />
      </span>
      <p className="text-sm font-semibold text-ink">Couldn’t load this</p>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw /> Try again
        </Button>
      )}
    </div>
  );
}

export function PageHeader({ title, description, actions, icon: Icon, children }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; icon?: LucideIcon; children?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className="hidden size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/20 sm:flex">
              <Icon className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
            {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

const STAT_TONES = {
  brand: 'from-brand-500 to-brand-700',
  emerald: 'from-emerald-500 to-teal-600',
  amber: 'from-amber-400 to-orange-500',
  rose: 'from-rose-500 to-pink-600',
  sky: 'from-sky-500 to-blue-600',
  violet: 'from-violet-500 to-purple-600',
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
  hint,
  trend,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof STAT_TONES;
  hint?: React.ReactNode;
  trend?: number | null;
  onClick?: () => void;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick} className={cn('card group flex w-full items-start gap-4 p-5 text-left transition-shadow', onClick && 'hover:shadow-pop')}>
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md', STAT_TONES[tone])}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
        <p className="mt-1 truncate text-2xl font-bold tracking-tight text-ink">{value}</p>
        {(hint || trend != null) && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
            {trend != null && (
              <span className={cn('inline-flex items-center gap-0.5 font-semibold', trend >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                {trend >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {Math.abs(trend).toFixed(0)}%
              </span>
            )}
            {hint}
          </p>
        )}
      </div>
    </Comp>
  );
}

export function Progress({ value, tone = 'brand', className }: { value: number; tone?: 'brand' | 'success' | 'warning' | 'danger'; className?: string }) {
  const color = { brand: 'bg-brand-600', success: 'bg-emerald-500', warning: 'bg-amber-500', danger: 'bg-rose-500' }[tone];
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800', className)}>
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function KeyValue({ items, cols = 2 }: { items: Array<[string, React.ReactNode]>; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-3', cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3')}>
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs text-ink-faint">{k}</dt>
          <dd className="mt-0.5 break-words text-sm font-medium text-ink">{v === null || v === undefined || v === '' ? '—' : v}</dd>
        </div>
      ))}
    </dl>
  );
}
