'use client';

import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { useApiMutation, useApiQuery } from '@/lib/api-client';
import { cn, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui/display';

interface N {
  id: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { data, isLoading } = useApiQuery<{ items: N[]; unread: number }>('/api/notifications', { all: '1' });
  const markAll = useApiMutation('PATCH', '/api/notifications', { invalidate: ['/api/notifications', '/api/me'], success: 'All caught up' });
  return (
    <>
      <PageHeader
        title="Notifications"
        icon={Bell}
        description={data ? `${data.unread} unread` : undefined}
        actions={
          data?.unread ? (
            <Button variant="secondary" onClick={() => markAll.mutate({ all: true })}>
              <CheckCheck /> Mark all read
            </Button>
          ) : null
        }
      />
      <Card>
        {isLoading ? (
          <LoadingBlock />
        ) : !data?.items.length ? (
          <EmptyState icon={Bell} title="No notifications yet" />
        ) : (
          <ul className="divide-y divide-line">
            {data.items.map((n) => {
              const inner = (
                <div className={cn('flex gap-3 px-5 py-3.5', !n.isRead && 'bg-brand-50/50 dark:bg-brand-500/5')}>
                  <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.isRead ? 'bg-transparent' : 'bg-brand-600')} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-sm text-ink-soft">{n.body}</p>
                    <p className="mt-1 text-xs text-ink-faint">{formatDateTime(n.createdAt)}</p>
                  </div>
                </div>
              );
              return <li key={n.id}>{n.link ? <Link href={n.link} className="block hover:bg-canvas/60">{inner}</Link> : inner}</li>;
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
