'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppWindow, ArrowLeft, ExternalLink } from 'lucide-react';
import { useApiQuery } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, EmptyState, LoadingBlock } from '@/components/ui/display';

interface AppLink {
  id: string;
  title: string;
  url: string;
  newTab: boolean;
}

/**
 * App Frame: shows one of the school's tools inside Vidyalaya. Some sites
 * refuse to be framed (their own security headers); "Open in new tab" always works.
 */
export default function AppFrame() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useApiQuery<AppLink[]>('/api/apps');
  const app = data?.find((a) => a.id === decodeURIComponent(id));
  if (isLoading) return <LoadingBlock />;
  if (!app) return <Card><EmptyState icon={AppWindow} title="App not found" description="It may have been removed, or it is not shared with your role." /></Card>;
  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/apps">
            <ArrowLeft /> Apps
          </Link>
        </Button>
        <p className="font-semibold">{app.title}</p>
        <Button asChild variant="secondary" size="sm" className="ml-auto">
          <a href={app.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink /> Open in new tab
          </a>
        </Button>
      </div>
      <iframe
        src={app.url}
        title={app.title}
        className="w-full flex-1 rounded-2xl border border-line bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="fullscreen; clipboard-write"
      />
    </div>
  );
}
