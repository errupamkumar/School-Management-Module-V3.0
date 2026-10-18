'use client';

import * as React from 'react';
import { Download, History } from 'lucide-react';
import { usePagedQuery } from '@/lib/api-client';
import { ROLE_LABELS, type AppRole } from '@/lib/modules';
import { downloadCsv, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge, Card, PageHeader, type Tone } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Input, Select } from '@/components/ui/form';

interface Row {
  id: string;
  createdAt: string;
  userName: string | null;
  role: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string | null;
  ip: string | null;
  userAgent: string | null;
}

const TONE: Record<string, Tone> = { CREATE: 'success', UPDATE: 'brand', DELETE: 'danger', REVOKE: 'danger', LOGIN: 'neutral', LOGIN_FAILED: 'warning', LOGOUT_ALL: 'neutral' };

export default function AuditLogPage() {
  const [page, setPage] = React.useState(1);
  const [f, setF] = React.useState({ action: '', entity: '', from: '', to: '', search: '' });
  const [search, setSearch] = React.useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setF((x) => ({ ...x, search: search.trim() })), 300);
    return () => clearTimeout(t);
  }, [search]);
  React.useEffect(() => setPage(1), [f]);
  const params = { page, pageSize: 50, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) };
  const { data, isLoading } = usePagedQuery<Row>('/api/audit-logs', params);
  // Filter options come with page 1 and are kept while paging.
  const [facets, setFacets] = React.useState<{ actions: string[]; entities: string[] }>({ actions: [], entities: [] });
  React.useEffect(() => {
    if (data?.actions) setFacets({ actions: data.actions as string[], entities: data.entities as string[] });
  }, [data]);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every change, sign-in and export, with who did it and from where. Entries cannot be edited or deleted."
        icon={History}
        actions={
          <Button variant="secondary" disabled={!data?.data.length} onClick={() => downloadCsv(`audit-log-page-${page}`, (data?.data ?? []).map((r) => ({ Time: formatDateTime(r.createdAt), User: r.userName, Role: r.role, Action: r.action, Entity: r.entity, 'Record id': r.entityId, Details: r.summary, IP: r.ip })))}>
            <Download /> Export page
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <Input className="w-56" placeholder="Search details, user, IP…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select className="w-40" value={f.action} onChange={(e) => setF((x) => ({ ...x, action: e.target.value }))} placeholder="All actions" options={[{ value: '', label: 'All actions' }, ...facets.actions.map((a) => ({ value: a, label: a.replace(/_/g, ' ').toLowerCase() }))]} />
          <Select className="w-44" value={f.entity} onChange={(e) => setF((x) => ({ ...x, entity: e.target.value }))} placeholder="All records" options={[{ value: '', label: 'All records' }, ...facets.entities.map((a) => ({ value: a, label: a }))]} />
          <Input type="date" className="w-40" aria-label="From" value={f.from} onChange={(e) => setF((x) => ({ ...x, from: e.target.value }))} />
          <Input type="date" className="w-40" aria-label="To" value={f.to} onChange={(e) => setF((x) => ({ ...x, to: e.target.value }))} />
        </div>
        <DataTable<Row>
          data={data?.data}
          loading={isLoading}
          emptyTitle="No matching entries"
          columns={[
            { accessorKey: 'createdAt', header: 'When', cell: ({ getValue }) => <span className="whitespace-nowrap text-xs">{formatDateTime(getValue())}</span> },
            { accessorKey: 'userName', header: 'User', cell: ({ row }) => <div><p className="font-medium">{row.original.userName ?? 'System'}</p>{row.original.role && <p className="text-xs text-ink-faint">{ROLE_LABELS[row.original.role as AppRole] ?? row.original.role}</p>}</div> },
            { accessorKey: 'action', header: 'Action', cell: ({ getValue }) => <Badge tone={TONE[getValue()] ?? 'neutral'}>{String(getValue()).replace(/_/g, ' ').toLowerCase()}</Badge> },
            { accessorKey: 'entity', header: 'Record' },
            { accessorKey: 'summary', header: 'Details', cell: ({ getValue }) => <span className="line-clamp-2 max-w-md text-xs text-ink-soft">{getValue() ?? '—'}</span> },
            { accessorKey: 'ip', header: 'IP', cell: ({ row }) => <span className="font-mono text-xs" title={row.original.userAgent ?? ''}>{row.original.ip ?? '—'}</span> },
          ]}
        />
        {data && data.total > data.pageSize && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
            <span className="text-ink-faint">
              {(page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.total)} of {data.total.toLocaleString('en-IN')}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" disabled={page * data.pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
