'use client';

import * as React from 'react';
import { Download, Play, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { classOptions, sectionOptions, useLookups } from '@/lib/lookups';
import { downloadCsv } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, EmptyState, LoadingBlock } from '@/components/ui/display';
import { Checkbox, Field, Input, Select, Switch } from '@/components/ui/form';
import { usePrompt } from '@/components/ui/overlay';

interface Source {
  key: string;
  label: string;
  filters: string[];
  statuses: string[];
  columns: Array<{ key: string; label: string }>;
}
interface Saved {
  id: string;
  name: string;
  entity: string;
  columns: string[];
  filters: Record<string, string>;
  shared: boolean;
  mine: boolean;
  createdByName: string;
}
type Result = { columns: Array<{ key: string; label: string }>; rows: Array<Record<string, unknown>>; truncated: boolean };

/** Custom reports: pick a data source, the columns you need and filters; save for reuse. */
export function ReportBuilder() {
  const prompt = usePrompt();
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['classes']);
  const { data: sources } = useApiQuery<Source[]>('/api/reports/builder');
  const { data: saved } = useApiQuery<Saved[]>('/api/reports/saved');
  const [entity, setEntity] = React.useState('');
  const [columns, setColumns] = React.useState<string[]>([]);
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<Result | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [share, setShare] = React.useState(false);
  const src = sources?.find((s) => s.key === entity);
  React.useEffect(() => {
    if (sources?.length && !entity) setEntity(sources[0].key);
  }, [sources, entity]);
  const pick = (key: string) => {
    const s = sources?.find((x) => x.key === key);
    setEntity(key);
    setColumns(s?.columns.slice(0, 5).map((c) => c.key) ?? []);
    setFilters({});
    setResult(null);
  };
  React.useEffect(() => {
    if (src && !columns.length) setColumns(src.columns.slice(0, 5).map((c) => c.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
  const run = async (e = entity, c = columns, f = filters) => {
    setBusy(true);
    try {
      setResult(await api<Result>('/api/reports/builder', { method: 'POST', body: { entity: e, columns: c, filters: f } }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const setF = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: v }));
  if (!sources) return <LoadingBlock />;
  if (!sources.length) return <Card><EmptyState title="No data sources" description="You need access to Students, Staff, Fees, Attendance or Library to build reports." /></Card>;
  return (
    <div className="space-y-4">
      {!!saved?.length && (
        <div className="flex flex-wrap gap-2">
          {saved.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface pl-3 text-sm">
              <button
                type="button"
                className="py-1"
                onClick={() => {
                  setEntity(s.entity);
                  setColumns(s.columns);
                  setFilters(s.filters);
                  void run(s.entity, s.columns, s.filters);
                }}
              >
                {s.name}
                {s.shared && <Badge className="ml-1">shared</Badge>}
              </button>
              {s.mine && (
                <button
                  type="button"
                  aria-label={`Delete ${s.name}`}
                  className="rounded-full p-1.5 text-ink-faint hover:text-rose-600"
                  onClick={async () => {
                    await api('/api/reports/saved', { method: 'DELETE', params: { id: s.id } });
                    invalidate(['/api/reports/saved']);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Data" className="w-48">
              <Select value={entity} onChange={(e) => pick(e.target.value)} options={sources.map((s) => ({ value: s.key, label: s.label }))} />
            </Field>
            {src?.filters.includes('classId') && (
              <Field label="Class" className="w-36">
                <Select value={filters.classId ?? ''} onChange={(e) => setFilters((f) => ({ ...f, classId: e.target.value, sectionId: '' }))} options={[{ value: '', label: 'All' }, ...classOptions(lk)]} />
              </Field>
            )}
            {src?.filters.includes('sectionId') && (
              <Field label="Section" className="w-32">
                <Select disabled={!filters.classId} value={filters.sectionId ?? ''} onChange={(e) => setF('sectionId', e.target.value)} options={[{ value: '', label: 'All' }, ...sectionOptions(lk, filters.classId)]} />
              </Field>
            )}
            {src?.filters.includes('status') && !!src.statuses.length && (
              <Field label="Status" className="w-36">
                <Select value={filters.status ?? ''} onChange={(e) => setF('status', e.target.value)} options={[{ value: '', label: 'Any' }, ...src.statuses.map((s) => ({ value: s, label: s.replace(/_/g, ' ').toLowerCase() }))]} />
              </Field>
            )}
            {src?.filters.includes('gender') && (
              <Field label="Gender" className="w-28">
                <Select value={filters.gender ?? ''} onChange={(e) => setF('gender', e.target.value)} options={[{ value: '', label: 'All' }, { value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }]} />
              </Field>
            )}
            {src?.filters.includes('from') && (
              <>
                <Field label="From" className="w-40">
                  <Input type="date" value={filters.from ?? ''} onChange={(e) => setF('from', e.target.value)} />
                </Field>
                <Field label="To" className="w-40">
                  <Input type="date" value={filters.to ?? ''} onChange={(e) => setF('to', e.target.value)} />
                </Field>
              </>
            )}
            {src?.filters.includes('search') && (
              <Field label="Search" className="w-44">
                <Input value={filters.search ?? ''} onChange={(e) => setF('search', e.target.value)} />
              </Field>
            )}
          </div>
          <Field label="Columns">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {src?.columns.map((c) => (
                <label key={c.key} className="flex items-center gap-1.5 text-sm">
                  <Checkbox checked={columns.includes(c.key)} onCheckedChange={(on) => setColumns((l) => (on ? [...l, c.key] : l.filter((x) => x !== c.key)))} /> {c.label}
                </label>
              ))}
            </div>
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button loading={busy} disabled={!columns.length} onClick={() => run()}>
              <Play /> Run report
            </Button>
            <label className="ml-auto flex items-center gap-2 text-xs text-ink-soft">
              <Switch checked={share} onCheckedChange={setShare} /> Share with colleagues
            </label>
            <Button
              variant="secondary"
              disabled={!columns.length}
              onClick={async () => {
                const name = await prompt({ title: 'Save this report', label: 'Name', placeholder: 'Class 10 girls with bus', minLength: 2, confirmLabel: 'Save' });
                if (!name) return;
                try {
                  await api('/api/reports/saved', { method: 'POST', body: { name, entity, columns, filters: Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), shared: share } });
                  toast.success('Report saved');
                  invalidate(['/api/reports/saved']);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              <Save /> Save
            </Button>
          </div>
        </CardBody>
      </Card>
      {result && (
        <Card>
          <div className="flex items-center gap-2 border-b border-line p-3 text-sm">
            <span>
              {result.rows.length} rows{result.truncated && ' (first 5000)'}
            </span>
            <Button size="sm" variant="secondary" className="ml-auto" disabled={!result.rows.length} onClick={() => downloadCsv(`report-${entity}`, result.rows.map((r) => Object.fromEntries(result.columns.map((c) => [c.label, r[c.key]]))))}>
              <Download /> Export
            </Button>
          </div>
          {!result.rows.length ? (
            <EmptyState title="No rows match" />
          ) : (
            <div className="max-h-[32rem] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-canvas text-xs text-ink-soft">
                  <tr>
                    {result.columns.map((c) => (
                      <th key={c.key} className="whitespace-nowrap px-3 py-2 text-left">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {result.rows.slice(0, 1000).map((r, i) => (
                    <tr key={i}>
                      {result.columns.map((c) => (
                        <td key={c.key} className="whitespace-nowrap px-3 py-1.5">
                          {String(r[c.key] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.rows.length > 1000 && <p className="p-3 text-center text-xs text-ink-faint">Showing 1000 rows — export to see all.</p>}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
