'use client';

import * as React from 'react';
import Link from 'next/link';
import { MessageSquare, RefreshCw, Send, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { api, usePagedQuery, useInvalidate } from '@/lib/api-client';
import { allSectionOptions, classOptions, useLookups } from '@/lib/lookups';
import { cn, formatDateTime } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { ResourcePage } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, PageHeader, StatusBadge } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Checkbox, Field, Input, Segmented, Select, Switch, Textarea } from '@/components/ui/form';
import { Tabs, TabPanel } from '@/components/ui/overlay';
import { useApiQuery } from '@/lib/api-client';

function Compose() {
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['classes']);
  const { data: templates } = useApiQuery<Array<{ id: string; name: string; channel: string; body: string; dltTemplateId: string | null }>>('/api/sms/templates');
  const [channel, setChannel] = React.useState<'SMS' | 'WHATSAPP' | 'EMAIL'>('SMS');
  const [subject, setSubject] = React.useState('');
  const [audience, setAudience] = React.useState('ALL_PARENTS');
  const [classIds, setClassIds] = React.useState<string[]>([]);
  const [sectionIds, setSectionIds] = React.useState<string[]>([]);
  const [numbers, setNumbers] = React.useState('');
  const [body, setBody] = React.useState('');
  const [personalise, setPersonalise] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const segments = Math.max(1, Math.ceil(body.length / (/[^\x00-\x7F]/.test(body) ? 70 : 160)));
  const list = audience === 'CLASSES' ? classOptions(lk) : allSectionOptions(lk);
  const selected = audience === 'CLASSES' ? classIds : sectionIds;
  const setSelected = audience === 'CLASSES' ? setClassIds : setSectionIds;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card>
        <CardHeader title="Compose" />
        <CardBody className="space-y-4">
          <Segmented value={channel} onChange={setChannel} options={[{ value: 'SMS', label: 'SMS' }, { value: 'WHATSAPP', label: 'WhatsApp' }, { value: 'EMAIL', label: 'Email' }]} />
          <Field label="Send to">
            <Select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              options={[
                { value: 'ALL_PARENTS', label: 'All parents (one message per family)' },
                { value: 'CLASSES', label: 'Parents of selected classes' },
                { value: 'SECTIONS', label: 'Parents of selected sections' },
                { value: 'STAFF', label: 'All staff' },
                { value: 'CUSTOM', label: channel === 'EMAIL' ? 'Custom email addresses' : 'Custom numbers' },
              ]}
            />
          </Field>
          {(audience === 'CLASSES' || audience === 'SECTIONS') && (
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
              {list.map((c) => (
                <label key={c.value} className={cn('flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs', selected.includes(c.value) ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10' : 'border-line')}>
                  <Checkbox checked={selected.includes(c.value)} onCheckedChange={(v) => setSelected((s) => (v ? [...s, c.value] : s.filter((x) => x !== c.value)))} /> {c.label}
                </label>
              ))}
            </div>
          )}
          {audience === 'CUSTOM' && (
            <Field label={channel === 'EMAIL' ? 'Email addresses' : 'Mobile numbers'} hint="One per line or comma-separated">
              <Textarea rows={3} value={numbers} onChange={(e) => setNumbers(e.target.value)} />
            </Field>
          )}
          {templates?.length ? (
            <Field label="Use a template">
              <Select value="" onChange={(e) => setBody(templates.find((t) => t.id === e.target.value)?.body ?? body)} options={templates.filter((t) => t.channel === channel).map((t) => ({ value: t.id, label: `${t.name}${t.dltTemplateId ? ' · DLT' : ''}` }))} placeholder="—" />
            </Field>
          ) : null}
          {channel === 'EMAIL' && (
            <Field label="Subject" required>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={190} />
            </Field>
          )}
          <Field label="Message" hint={channel === 'EMAIL' ? 'Plain text. Parents receive it at the email on their login or the father’s email.' : channel === 'SMS' ? `${body.length} characters · ${segments} SMS segment(s) per recipient. Indian SMS must match a DLT-approved template.` : 'WhatsApp business messages outside a 24-hour session require an approved template.'}>
            <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={personalise} onCheckedChange={setPersonalise} /> Prefix with “Dear Parent of &lt;child&gt;”
          </label>
          <Button
            loading={busy}
            disabled={!body.trim() || (channel === 'EMAIL' && !subject.trim())}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await api<{ recipients: number; accepted: number; gatewayMissing: boolean }>('/api/sms/send', {
                  method: 'POST',
                  body: {
                    channel,
                    audience,
                    classIds,
                    sectionIds,
                    ...(channel === 'EMAIL' ? { emails: numbers.split(/[\s,;]+/).filter(Boolean), subject } : { numbers: numbers.split(/[\s,]+/).filter(Boolean) }),
                    body,
                    personalise,
                  },
                });
                if (r.gatewayMissing) toast.warning(`${r.recipients} messages logged but not sent — configure ${channel === 'EMAIL' ? 'email (SMTP)' : channel === 'SMS' ? 'an SMS gateway' : 'a WhatsApp gateway'} in School Settings.`);
                else toast.success(`Sending to ${r.accepted} recipients`);
                invalidate(['/api/sms/log']);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Send /> Send
          </Button>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Gateway" icon={Settings} />
        <CardBody className="space-y-3 text-sm text-ink-soft">
          <p>Messages are delivered through your school’s own SMS (MSG91 / Twilio) or WhatsApp Cloud API account, so delivery and sender ID stay under your control.</p>
          <Button asChild variant="secondary" size="sm">
            <Link href="/settings?tab=messaging">Configure gateway</Link>
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

interface LogRow {
  id: string;
  channel: string;
  recipient: string;
  recipientName: string | null;
  body: string;
  status: string;
  error: string | null;
  createdAt: string;
}

function Log() {
  const invalidate = useInvalidate();
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('');
  const { data, isLoading } = usePagedQuery<LogRow>('/api/sms/log', { page, pageSize: 25, status: status || undefined });
  const stats = (data?.stats ?? {}) as Record<string, number>;
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <Select className="h-9 w-36" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={['QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED'].map((s) => ({ value: s, label: s.toLowerCase() }))} placeholder="All statuses" />
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(stats).map(([k, v]) => (
            <Badge key={k}>
              {k.toLowerCase()} {v}
            </Badge>
          ))}
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="ml-auto"
          onClick={async () => {
            try {
              const r = await api<{ requeued: number; sent: number; failed: number }>('/api/sms/retry', { method: 'POST' });
              toast.success(`Retried ${r.requeued}: ${r.sent} sent, ${r.failed} failed`);
              invalidate(['/api/sms/log']);
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          <RefreshCw /> Retry failed
        </Button>
      </div>
      <DataTable<LogRow>
        data={data?.data}
        loading={isLoading}
        pagination={data ? { page, pageSize: 25, total: data.total, onPageChange: setPage } : undefined}
        emptyTitle="No messages sent yet"
        columns={[
          { accessorKey: 'createdAt', header: 'Time', cell: ({ getValue }) => <span className="text-xs">{formatDateTime(getValue())}</span> },
          { accessorKey: 'recipient', header: 'To', cell: ({ row }) => <div><p className="text-sm">{row.original.recipientName}</p><p className="text-xs text-ink-faint">{row.original.recipient}</p></div> },
          { accessorKey: 'channel', header: 'Channel', cell: ({ getValue }) => <Badge>{String(getValue()).toLowerCase()}</Badge> },
          { accessorKey: 'body', header: 'Message', cell: ({ getValue }) => <p className="line-clamp-2 max-w-md text-xs">{getValue()}</p> },
          { accessorKey: 'status', header: 'Status', cell: ({ row }) => <span title={row.original.error ?? ''}><StatusBadge status={row.original.status} /></span> },
        ]}
      />
    </Card>
  );
}

export default function SmsPage() {
  const { can } = useApp();
  const [tab, setTab] = React.useState(can('sms', 'create') ? 'compose' : 'log');
  return (
    <>
      <PageHeader title="SMS, WhatsApp & Email" description="Bulk messages and emails to parents and staff, with DLT templates and a delivery log." icon={MessageSquare} />
      <Tabs value={tab} onValueChange={setTab} tabs={[...(can('sms', 'create') ? [{ value: 'compose', label: 'Compose' }] : []), { value: 'log', label: 'Delivery log' }, { value: 'templates', label: 'Templates' }]}>
        <TabPanel value="compose">
          <Compose />
        </TabPanel>
        <TabPanel value="log">
          <Log />
        </TabPanel>
        <TabPanel value="templates">
          <ResourcePage<{ id: string; name: string; channel: string; body: string; dltTemplateId: string | null }>
            embedded
            title="Templates"
            entityLabel="Template"
            endpoint="/api/sms/templates"
            module="sms"
            columns={[
              { accessorKey: 'name', header: 'Name', cell: ({ getValue }) => <span className="font-medium">{getValue()}</span> },
              { accessorKey: 'channel', header: 'Channel', cell: ({ getValue }) => <Badge>{String(getValue()).toLowerCase()}</Badge> },
              { accessorKey: 'body', header: 'Text', cell: ({ getValue }) => <p className="line-clamp-2 max-w-lg text-xs">{getValue()}</p> },
              { accessorKey: 'dltTemplateId', header: 'DLT ID', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() ?? '—'}</span> },
            ]}
            fields={[
              { name: 'name', label: 'Name', required: true },
              { name: 'channel', label: 'Channel', type: 'select', required: true, options: [{ value: 'SMS', label: 'SMS' }, { value: 'WHATSAPP', label: 'WhatsApp' }] },
              { name: 'body', label: 'Text', type: 'textarea', required: true, hint: 'Use {#var#} for DLT variables' },
              { name: 'dltTemplateId', label: 'DLT template ID', hint: 'Required by TRAI for promotional/transactional SMS in India' },
            ]}
            defaults={{ channel: 'SMS' }}
          />
        </TabPanel>
      </Tabs>
    </>
  );
}
