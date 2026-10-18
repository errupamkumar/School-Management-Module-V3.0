'use client';

import * as React from 'react';
import { Plus, Trash2, Video } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { allSectionOptions, classOptions, useLookups } from '@/lib/lookups';
import { cn, formatDateTime } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { FormDialog } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Badge, Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui/display';
import { Segmented } from '@/components/ui/form';
import { useConfirm } from '@/components/ui/overlay';

interface Live {
  id: string;
  title: string;
  platform: string;
  meetingUrl: string;
  target: string;
  startsAt: string;
  durationMins: number;
  message: string | null;
  hostName: string;
  hostId: string;
}

const PLATFORM: Record<string, string> = { GOOGLE_MEET: 'Google Meet', ZOOM: 'Zoom', TEAMS: 'Microsoft Teams', JITSI: 'Jitsi', BIGBLUEBUTTON: 'BigBlueButton', OTHER: 'Other' };

/** Opens the class: BigBlueButton links are personal and signed, so they are fetched at click time. */
async function join(id: string) {
  const win = window.open('about:blank', '_blank');
  try {
    const r = await api<{ url: string }>(`/api/live-classes/${id}/join`);
    if (win) win.location.href = r.url;
    else window.location.href = r.url;
  } catch (e) {
    win?.close();
    toast.error((e as Error).message);
  }
}

export default function LiveClassesPage() {
  const { can, isFamily, role, me } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['classes'], { mine: role === 'TEACHER' });
  const [when, setWhen] = React.useState<'upcoming' | 'past'>('upcoming');
  const { data, isLoading } = useApiQuery<Live[]>('/api/live-classes', { past: when === 'past' ? '1' : undefined });
  const [open, setOpen] = React.useState(false);
  const now = Date.now();
  return (
    <>
      <PageHeader
        title="Live classes"
        description="Online classes on Google Meet, Zoom, Teams or Jitsi."
        icon={Video}
        actions={
          <>
            <Segmented value={when} onChange={setWhen} options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }]} />
            {!isFamily && can('live_classes', 'create') && (
              <Button onClick={() => setOpen(true)}>
                <Plus /> Schedule class
              </Button>
            )}
          </>
        }
      />
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <Card>
          <EmptyState icon={Video} title={when === 'upcoming' ? 'No upcoming live classes' : 'No past classes'} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((l) => {
            const start = new Date(l.startsAt).getTime();
            const live = now >= start - 10 * 60_000 && now <= start + l.durationMins * 60_000;
            return (
              <Card key={l.id} className={cn('flex flex-col p-5', live && 'ring-2 ring-emerald-500/40')}>
                <div className="flex items-start justify-between gap-2">
                  <Badge tone="brand">{PLATFORM[l.platform]}</Badge>
                  {live && <Badge tone="success" dot>Live now</Badge>}
                </div>
                <p className="mt-3 font-semibold">{l.title}</p>
                <p className="text-xs text-ink-faint">
                  {formatDateTime(l.startsAt)} · {l.durationMins} min · {l.target}
                </p>
                {l.message && <p className="mt-2 text-sm text-ink-soft">{l.message}</p>}
                <p className="mt-2 text-xs text-ink-faint">Host: {l.hostName}</p>
                <div className="mt-auto flex items-center gap-2 pt-4">
                  {when === 'upcoming' && (
                    <Button size="sm" variant={live ? 'success' : 'soft'} onClick={() => join(l.id)}>
                      <Video /> Join
                    </Button>
                  )}
                  {!isFamily && can('live_classes', 'delete') && (
                    <Button
                      className="ml-auto"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Cancel class"
                      onClick={async () => {
                        if (!(await confirm({ title: `Cancel ${l.title}?`, confirmLabel: 'Cancel class' }))) return;
                        try {
                          await api(`/api/live-classes/${l.id}`, { method: 'DELETE' });
                          invalidate(['/api/live-classes']);
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Schedule a live class"
        fields={(v) => [
          { name: 'title', label: 'Title', required: true, span: 2 },
          { name: 'platform', label: 'Platform', type: 'select', required: true, options: Object.entries(PLATFORM).filter(([k]) => k !== 'BIGBLUEBUTTON' || me.settings.liveClasses?.bbb).map(([value, label]) => ({ value, label })) },
          ...(v.platform === 'BIGBLUEBUTTON' ? [] : [{ name: 'meetingUrl', label: 'Meeting link', type: 'url' as const, required: true, placeholder: 'https://meet.google.com/…' }]),
          { name: 'audience', label: 'For', type: 'select', required: true, options: [...(role === 'TEACHER' ? [] : [{ value: 'ALL_STUDENTS', label: 'All students' }, { value: 'ALL_STAFF', label: 'All staff' }, { value: 'CLASS', label: 'A class (all sections)' }]), { value: 'SECTION', label: 'A section' }] },
          ...(v.audience === 'CLASS' ? [{ name: 'classId', label: 'Class', type: 'select' as const, required: true, options: classOptions(lk) }] : []),
          ...(v.audience === 'SECTION' ? [{ name: 'sectionId', label: 'Section', type: 'select' as const, required: true, options: allSectionOptions(lk) }] : []),
          { name: 'startsAt', label: 'Starts at', type: 'datetime-local', required: true },
          { name: 'durationMins', label: 'Duration (min)', type: 'number', required: true },
          { name: 'message', label: 'Message', type: 'textarea' },
        ]}
        initial={{ platform: me.settings.liveClasses?.bbb ? 'BIGBLUEBUTTON' : 'GOOGLE_MEET', audience: 'SECTION', durationMins: 40 }}
        onSubmit={async (v) => {
          await api('/api/live-classes', { method: 'POST', body: { ...v, startsAt: new Date(v.startsAt).toISOString() } });
          toast.success('Class scheduled — participants notified');
          invalidate(['/api/live-classes', '/api/dashboard']);
        }}
      />
    </>
  );
}
