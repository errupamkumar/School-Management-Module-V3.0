'use client';

/**
 * Platform console tab: "Start free trial / Book a demo" requests sent from the
 * public website. Used by src/app/platform/page.tsx.
 */
import * as React from 'react';
import { Mail, MessageSquareText, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge, Card, type Tone } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Input, Select, Textarea } from '@/components/ui/form';
import { Dialog } from '@/components/ui/overlay';
import { FEATURE_MAP } from '../content/features';
import { LEAD_STATUSES } from '../lead-schema';

type LeadStatus = (typeof LEAD_STATUSES)[number];

interface Lead {
  id: string;
  interest: 'trial' | 'demo';
  schoolName: string;
  contactName: string;
  role: string | null;
  email: string;
  phone: string;
  city: string | null;
  state: string | null;
  board: string | null;
  students: string | null;
  features: string[] | null;
  message: string | null;
  source: string | null;
  status: LeadStatus;
  notes: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<LeadStatus, string> = { NEW: 'New', CONTACTED: 'Contacted', DEMO_DONE: 'Demo done', CONVERTED: 'Converted', CLOSED: 'Closed' };
const STATUS_TONE: Record<LeadStatus, Tone> = { NEW: 'brand', CONTACTED: 'info', DEMO_DONE: 'warning', CONVERTED: 'success', CLOSED: 'neutral' };
const STATUS_OPTIONS = LEAD_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }));

function LeadDialog({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const invalidate = useInvalidate();
  const [status, setStatus] = React.useState<LeadStatus>(lead.status);
  const [notes, setNotes] = React.useState(lead.notes ?? '');
  const [busy, setBusy] = React.useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api(`/api/platform/website-leads/${lead.id}`, { method: 'PATCH', body: { status, notes } });
      toast.success('Lead updated');
      invalidate(['/api/platform/website-leads']);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={lead.schoolName}
      description={`${lead.interest === 'demo' ? 'Demo request' : 'Free trial request'} · ${formatDateTime(lead.createdAt)}`}
      size="lg"
      footer={
        <Button loading={busy} onClick={save}>
          Save
        </Button>
      }
    >
      <div className="space-y-5 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <p>
            <span className="block text-xs text-ink-faint">Contact</span>
            {lead.contactName}
            {lead.role ? ` · ${lead.role}` : ''}
          </p>
          <p>
            <span className="block text-xs text-ink-faint">Location</span>
            {[lead.city, lead.state].filter(Boolean).join(', ') || '—'}
          </p>
          <p>
            <span className="block text-xs text-ink-faint">Board · students</span>
            {lead.board ?? '—'} · {lead.students ?? '—'}
          </p>
          <p>
            <span className="block text-xs text-ink-faint">Came from</span>
            <span className="font-mono text-xs">{lead.source ?? '—'}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.open(`tel:${lead.phone}`)}>
            <Phone /> {lead.phone}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.open(`mailto:${lead.email}`)}>
            <Mail /> {lead.email}
          </Button>
        </div>
        {!!lead.features?.length && (
          <div>
            <p className="mb-1.5 text-xs text-ink-faint">Interested in</p>
            <div className="flex flex-wrap gap-1.5">
              {lead.features.map((f) => (
                <Badge key={f}>{FEATURE_MAP[f]?.short ?? f}</Badge>
              ))}
            </div>
          </div>
        )}
        {lead.message && (
          <div className="rounded-xl bg-canvas p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs text-ink-faint">
              <MessageSquareText className="size-3.5" /> Message
            </p>
            <p className="whitespace-pre-wrap">{lead.message}</p>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
          <div>
            <p className="label">Status</p>
            <Select value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)} options={STATUS_OPTIONS} />
          </div>
          <div>
            <p className="label">Follow-up notes</p>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Called on…, demo booked for…" />
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export function WebsiteLeads() {
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [open, setOpen] = React.useState<Lead | null>(null);
  const { data, isLoading, error, refetch } = useApiQuery<Lead[]>('/api/platform/website-leads', { search: search.trim() || undefined, status: status || undefined });

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <Input className="w-64" placeholder="Search school, contact, phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select className="w-40" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]} />
        <p className="ml-auto text-xs text-ink-faint">From the website’s “Start free trial / Book a demo” form</p>
      </div>
      <DataTable<Lead>
        data={data}
        loading={isLoading}
        error={error?.message}
        onRetry={() => void refetch()}
        emptyTitle="No website leads yet"
        emptyDescription="Requests from /get-started appear here."
        onRowClick={(l) => setOpen(l)}
        columns={[
          { accessorKey: 'createdAt', header: 'Received', cell: ({ getValue }) => <span className="whitespace-nowrap text-xs">{formatDateTime(getValue() as string)}</span> },
          {
            accessorKey: 'schoolName',
            header: 'School',
            cell: ({ row: { original: l } }) => (
              <div>
                <p className="font-medium">{l.schoolName}</p>
                <p className="text-xs text-ink-faint">{[l.city, l.state, l.board, l.students && `${l.students} students`].filter(Boolean).join(' · ') || '—'}</p>
              </div>
            ),
          },
          {
            accessorKey: 'contactName',
            header: 'Contact',
            cell: ({ row: { original: l } }) => (
              <div>
                <p>
                  {l.contactName}
                  {l.role ? <span className="text-ink-faint"> · {l.role}</span> : null}
                </p>
                <p className="text-xs text-ink-faint">
                  {l.phone} · {l.email}
                </p>
              </div>
            ),
          },
          { accessorKey: 'interest', header: 'Wants', cell: ({ row: { original: l } }) => <Badge tone={l.interest === 'demo' ? 'info' : 'brand'}>{l.interest === 'demo' ? 'Demo' : 'Free trial'}</Badge> },
          { accessorKey: 'status', header: 'Status', cell: ({ row: { original: l } }) => <Badge tone={STATUS_TONE[l.status]}>{STATUS_LABEL[l.status]}</Badge> },
        ]}
      />
      {open && <LeadDialog lead={open} onClose={() => setOpen(null)} />}
    </Card>
  );
}
