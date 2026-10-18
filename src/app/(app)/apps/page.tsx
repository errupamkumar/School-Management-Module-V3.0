'use client';

import * as React from 'react';
import Link from 'next/link';
import { AppWindow, ExternalLink, Settings } from 'lucide-react';
import { useApiQuery } from '@/lib/api-client';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui/display';

interface AppLink {
  id: string;
  title: string;
  url: string;
  newTab: boolean;
}

export default function AppsPage() {
  const { can } = useApp();
  const { data, isLoading } = useApiQuery<AppLink[]>('/api/apps');
  return (
    <>
      <PageHeader
        title="Apps"
        description="Other web tools your school uses, in one place."
        icon={AppWindow}
        actions={
          can('settings', 'edit') && (
            <Button asChild variant="secondary">
              <Link href="/settings?tab=integrations">
                <Settings /> Manage apps
              </Link>
            </Button>
          )
        }
      />
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <Card>
          <EmptyState icon={AppWindow} title="No apps added" description="Admins can add tools (Google Classroom, a library OPAC, a survey site…) under School Settings → Integrations & data." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((a) => {
            const host = (() => {
              try {
                return new URL(a.url).hostname;
              } catch {
                return a.url;
              }
            })();
            const inner = (
              <>
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-xl font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{a.title.charAt(0).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.title}</p>
                  <p className="truncate text-xs text-ink-faint">{host}</p>
                </div>
                {a.newTab && <ExternalLink className="size-4 text-ink-faint" />}
              </>
            );
            return a.newTab ? (
              <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-pop">
                {inner}
              </a>
            ) : (
              <Link key={a.id} href={`/apps/${encodeURIComponent(a.id)}`} className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-pop">
                {inner}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
