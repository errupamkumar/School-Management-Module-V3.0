'use client';

import * as React from 'react';
import { CheckCircle2, Download, FileUp, Upload, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api, useInvalidate } from '@/lib/api-client';
import { parseCsv } from '@/lib/csv';
import { downloadCsv } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, PageHeader } from '@/components/ui/display';
import { Checkbox } from '@/components/ui/form';
import { CredentialsDialog, type Credential } from '@/components/people';

const COLUMNS = ['className', 'sectionName', 'firstName', 'lastName', 'gender', 'dob', 'admissionNo', 'rollNo', 'admissionDate', 'category', 'religion', 'bloodGroup', 'fatherName', 'motherName', 'primaryPhone', 'fatherOccupation', 'email', 'address'];
const REQUIRED = ['className', 'sectionName', 'firstName', 'gender', 'primaryPhone'];

export default function ImportStudentsPage() {
  const invalidate = useInvalidate();
  const [rows, setRows] = React.useState<Array<Record<string, string>>>([]);
  const [fileName, setFileName] = React.useState('');
  const [createLogins, setCreateLogins] = React.useState(true);
  const [consent, setConsent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<{ created: Array<{ row: number; admissionNo: string; name: string }>; failed: Array<{ row: number; error: string }>; credentials: Credential[] } | null>(null);
  const [showCreds, setShowCreds] = React.useState(false);

  const missingHeaders = rows.length ? REQUIRED.filter((h) => !(h in rows[0])) : [];

  return (
    <>
      <PageHeader title="Import students" description="Admit many students at once from a spreadsheet (CSV). Up to 500 rows per file." icon={FileUp} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="1. Prepare your file" />
          <CardBody className="space-y-3 text-sm text-ink-soft">
            <p>
              Download the template, fill one student per row and save as <b>CSV</b>. Required columns: {REQUIRED.map((r) => <Badge key={r} className="mr-1">{r}</Badge>)}
            </p>
            <p>Dates may be YYYY-MM-DD or DD/MM/YYYY. Gender: Male / Female / Other. Siblings are linked automatically when they share the same primaryPhone.</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                downloadCsv('student-import-template', [
                  Object.fromEntries(COLUMNS.map((c) => [c, { className: '5', sectionName: 'A', firstName: 'Aarav', lastName: 'Sharma', gender: 'Male', dob: '15/06/2015', primaryPhone: '9876543210', fatherName: 'Rajesh Sharma', motherName: 'Sunita Sharma', category: 'GENERAL', religion: 'Hindu', bloodGroup: 'B+' }[c] ?? ''])),
                ])
              }
            >
              <Download /> Download template
            </Button>
          </CardBody>
          <CardHeader title="2. Upload" className="border-t" />
          <CardBody className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line px-6 py-10 text-center hover:border-brand-400">
              <Upload className="size-6 text-brand-600" />
              <span className="text-sm font-medium">{fileName || 'Click to choose a CSV file'}</span>
              <span className="text-xs text-ink-faint">{rows.length ? `${rows.length} rows detected` : 'Max 500 rows'}</span>
              <input
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 2 * 1024 * 1024) return toast.error('File must be under 2 MB');
                  setFileName(f.name);
                  setResult(null);
                  const parsed = parseCsv(await f.text());
                  if (parsed.length > 500) toast.warning('Only the first 500 rows will be imported');
                  setRows(parsed.slice(0, 500));
                }}
              />
            </label>
            {missingHeaders.length > 0 && <p className="text-sm text-rose-600">Missing required columns: {missingHeaders.join(', ')}</p>}
            {rows.length > 0 && (
              <div className="max-h-72 overflow-auto rounded-xl border border-line">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-canvas">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      {Object.keys(rows[0]).map((h) => (
                        <th key={h} className="px-3 py-2 text-left">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="px-3 py-1.5 text-ink-faint">{i + 2}</td>
                        {Object.keys(rows[0]).map((h) => (
                          <td key={h} className="whitespace-nowrap px-3 py-1.5">
                            {r[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={createLogins} onCheckedChange={(v) => setCreateLogins(!!v)} /> Create student and parent logins
            </label>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} /> I confirm guardian consent for data processing has been collected for every student in this file (DPDP Act, 2023).
            </label>
            <Button
              loading={busy}
              disabled={!rows.length || missingHeaders.length > 0 || !consent}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await api<NonNullable<typeof result>>('/api/students/import', { method: 'POST', body: { rows, createLogins, consent } });
                  setResult(res);
                  invalidate(['/api/students', '/api/dashboard', '/api/users']);
                  toast.success(`${res.created.length} admitted, ${res.failed.length} failed`);
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <FileUp /> Import {rows.length || ''} students
            </Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="3. Results" />
          <CardBody>
            {!result ? (
              <p className="text-sm text-ink-soft">Results appear here after import. Failed rows can be fixed and re-uploaded on their own.</p>
            ) : (
              <div className="space-y-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="size-4" /> {result.created.length} admitted
                </p>
                {result.credentials.length > 0 && (
                  <Button size="sm" variant="secondary" onClick={() => setShowCreds(true)}>
                    View {result.credentials.length} login slips
                  </Button>
                )}
                {result.failed.length > 0 && (
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-700">
                      <XCircle className="size-4" /> {result.failed.length} failed
                    </p>
                    <ul className="max-h-80 space-y-1.5 overflow-auto text-xs">
                      {result.failed.map((f) => (
                        <li key={f.row} className="rounded-lg bg-rose-50 px-3 py-2 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
                          Row {f.row}: {f.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
      {showCreds && result && <CredentialsDialog credentials={result.credentials} onClose={() => setShowCreds(false)} />}
    </>
  );
}
