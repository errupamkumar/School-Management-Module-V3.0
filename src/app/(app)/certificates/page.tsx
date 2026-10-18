'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Award, Ban, Copy, Eye, FileBadge, IdCard, Printer, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate, usePagedQuery } from '@/lib/api-client';
import { CERTIFICATE_KINDS, PLACEHOLDERS } from '@/lib/certificates';
import { allSectionOptions, useLookups } from '@/lib/lookups';
import { formatDate } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { RICH_TEXT } from '@/components/print';
import { ResourcePage } from '@/components/resource';
import { StudentPicker, type PickedStudent } from '@/components/student-picker';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, PageHeader } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/form';
import { Dialog, Tabs, TabPanel, usePrompt } from '@/components/ui/overlay';

type Recipient = 'STUDENT' | 'EMPLOYEE';
interface Template {
  id: string;
  name: string;
  kind: string;
  recipientType: Recipient;
  body: string;
}
interface Issued {
  id: string;
  serialNo: string;
  recipientType: Recipient;
  recipientName: string;
  issuedOn: string;
  revokedAt: string | null;
  verifyCode: string;
  template: { name: string; kind: string };
}
interface EmployeeRow {
  id: string;
  name: string;
  employeeCode: string;
  designation: string;
  status: string;
}

const openPrint = (path: string) => window.open(path, '_blank', 'noopener');

function IssuePanel({ initialStudentId }: { initialStudentId: string | null }) {
  const invalidate = useInvalidate();
  const [kind, setKind] = React.useState<Recipient>('STUDENT');
  const [student, setStudent] = React.useState<PickedStudent | null>(null);
  const [employeeId, setEmployeeId] = React.useState('');
  const [templateId, setTemplateId] = React.useState('');
  const [customText, setCustomText] = React.useState('');
  const [issuedOn, setIssuedOn] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = React.useState(false);
  const { data: templates } = useApiQuery<Template[]>('/api/certificates/templates');
  const { data: staff } = usePagedQuery<EmployeeRow>(kind === 'EMPLOYEE' ? '/api/employees' : null, { status: 'ALL', pageSize: 200 });
  const { data: preset } = useApiQuery<PickedStudent>(initialStudentId ? `/api/students/${initialStudentId}` : null);
  React.useEffect(() => {
    if (preset) setStudent({ id: preset.id, name: preset.name, admissionNo: preset.admissionNo, classLabel: preset.classLabel, photoUrl: preset.photoUrl });
  }, [preset]);

  const options = (templates ?? []).filter((t) => t.recipientType === kind);
  const tpl = options.find((t) => t.id === templateId);
  const recipientId = kind === 'STUDENT' ? student?.id : employeeId;

  async function issue() {
    setBusy(true);
    try {
      const c = await api<{ id: string; serialNo: string }>('/api/certificates/issued', { method: 'POST', body: { templateId, recipientId, customText: customText || null, issuedOn } });
      toast.success(`Issued ${c.serialNo}`);
      invalidate(['/api/certificates/issued']);
      setCustomText('');
      openPrint(`/print/certificate/${c.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader title="Issue a certificate" description="The content is frozen at issue time and gets a serial number and a QR verification code." icon={FileBadge} />
        <CardBody className="space-y-4">
          <Segmented
            value={kind}
            onChange={(v) => {
              setKind(v);
              setTemplateId('');
            }}
            options={[
              { value: 'STUDENT', label: 'Student' },
              { value: 'EMPLOYEE', label: 'Staff' },
            ]}
          />
          {kind === 'STUDENT' ? (
            <Field label="Student" hint="Includes students who have left (for transfer certificates).">
              <StudentPicker value={student} onChange={setStudent} status="ALL" />
            </Field>
          ) : (
            <Field label="Staff member">
              <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} options={(staff?.data ?? []).map((e) => ({ value: e.id, label: `${e.name} · ${e.designation}${e.status !== 'ACTIVE' ? ' (left)' : ''}` }))} placeholder="Choose…" />
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Certificate">
              <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)} options={options.map((t) => ({ value: t.id, label: t.name }))} placeholder={options.length ? 'Choose…' : 'No templates yet'} />
            </Field>
            <Field label="Date of issue">
              <Input type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} />
            </Field>
          </div>
          {tpl?.body.includes('customText') && (
            <Field label="Additional text" hint="Fills {{customText}} in this template, e.g. the achievement for a merit certificate.">
              <Textarea rows={2} maxLength={500} value={customText} onChange={(e) => setCustomText(e.target.value)} />
            </Field>
          )}
          <div className="flex justify-end">
            <Button disabled={!templateId || !recipientId} loading={busy} onClick={issue}>
              <Printer /> Issue &amp; print
            </Button>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Template preview" icon={Eye} />
        <CardBody>
          {tpl ? <div className={`text-sm leading-6 ${RICH_TEXT}`} dangerouslySetInnerHTML={{ __html: tpl.body }} /> : <p className="text-sm text-ink-faint">Choose a certificate to see its wording. Placeholders like {'{{student.name}}'} are filled in automatically.</p>}
        </CardBody>
      </Card>
    </div>
  );
}

function Register() {
  const { can } = useApp();
  const prompt = usePrompt();
  const invalidate = useInvalidate();
  const [search, setSearch] = React.useState('');
  const [q, setQ] = React.useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data, isLoading } = useApiQuery<Issued[]>('/api/certificates/issued', q.length >= 2 ? { search: q } : undefined);
  return (
    <Card>
      <div className="border-b border-line p-3">
        <Input className="max-w-xs" placeholder="Search name or serial no…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <DataTable<Issued>
        data={data}
        loading={isLoading}
        emptyTitle="No certificates issued yet"
        columns={[
          { accessorKey: 'serialNo', header: 'Serial no.', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span> },
          { id: 'cert', header: 'Certificate', cell: ({ row }) => row.original.template.name },
          { accessorKey: 'recipientName', header: 'Issued to', cell: ({ row }) => <div><p className="font-medium">{row.original.recipientName}</p><Badge>{row.original.recipientType === 'STUDENT' ? 'student' : 'staff'}</Badge></div> },
          { accessorKey: 'issuedOn', header: 'Date', cell: ({ getValue }) => formatDate(getValue()) },
          { id: 'status', header: 'Status', cell: ({ row }) => (row.original.revokedAt ? <Badge tone="danger">Revoked {formatDate(row.original.revokedAt)}</Badge> : <Badge tone="success">Valid</Badge>) },
          {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" title="Print" onClick={() => openPrint(`/print/certificate/${row.original.id}`)}>
                  <Printer />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Copy verification link"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/verify/${row.original.verifyCode}`).then(() => toast.success('Verification link copied'), () => toast.error('Could not copy'));
                  }}
                >
                  <Copy />
                </Button>
                {can('certificates', 'delete') && !row.original.revokedAt && (
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Revoke"
                    onClick={async () => {
                      const reason = await prompt({ title: `Revoke ${row.original.serialNo}?`, description: 'The QR verification page will show this certificate as revoked. This cannot be undone.', label: 'Reason', placeholder: 'Issued in error', confirmLabel: 'Revoke' });
                      if (!reason) return;
                      try {
                        await api(`/api/certificates/issued/${row.original.id}`, { method: 'POST', body: { reason } });
                        toast.success('Certificate revoked');
                        invalidate(['/api/certificates/issued']);
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  >
                    <Ban className="text-rose-600" />
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
}

function Templates() {
  const [preview, setPreview] = React.useState<Template | null>(null);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <ResourcePage<Template>
        embedded
        title="Templates"
        entityLabel="Template"
        endpoint="/api/certificates/templates"
        module="certificates"
        dialogSize="xl"
        columns={[
          { accessorKey: 'name', header: 'Name', cell: ({ getValue }) => <span className="font-medium">{getValue()}</span> },
          { accessorKey: 'kind', header: 'Type', cell: ({ getValue }) => CERTIFICATE_KINDS.find((k) => k.value === getValue())?.label ?? getValue() },
          { accessorKey: 'recipientType', header: 'For', cell: ({ getValue }) => <Badge>{getValue() === 'STUDENT' ? 'students' : 'staff'}</Badge> },
        ]}
        rowActions={(t) => (
          <Button size="sm" variant="ghost" title="Preview" onClick={() => setPreview(t)}>
            <Eye />
          </Button>
        )}
        fields={[
          { name: 'name', label: 'Name', required: true },
          { name: 'kind', label: 'Type', type: 'select', required: true, options: CERTIFICATE_KINDS },
          { name: 'recipientType', label: 'Issued to', type: 'select', required: true, options: [{ value: 'STUDENT', label: 'Students' }, { value: 'EMPLOYEE', label: 'Staff' }] },
          { name: 'body', label: 'Wording (HTML)', type: 'textarea', required: true, hint: 'Allowed tags: p, b, i, u, br, ul/ol/li, h1–h4, blockquote, hr. Scripts, links, images and attributes are removed. Use the placeholders listed alongside.' },
        ]}
        defaults={{ kind: 'CUSTOM', recipientType: 'STUDENT', body: '<p>This is to certify that <b>{{student.name}}</b> …</p>' }}
      />
      <Card>
        <CardHeader title="Placeholders" description="Click to copy" icon={ScrollText} />
        <CardBody className="space-y-4 text-xs">
          {(['STUDENT', 'EMPLOYEE'] as const).map((r) => (
            <div key={r}>
              <p className="mb-1.5 font-semibold text-ink-soft">{r === 'STUDENT' ? 'Student certificates' : 'Staff certificates'}</p>
              <ul className="space-y-1">
                {PLACEHOLDERS[r].map(([key, label]) => (
                  <li key={key}>
                    <button type="button" className="w-full rounded-md px-1.5 py-1 text-left hover:bg-canvas" onClick={() => navigator.clipboard.writeText(`{{${key}}}`).then(() => toast.success(`Copied {{${key}}}`), () => undefined)}>
                      <code className="text-brand-700 dark:text-brand-300">{`{{${key}}}`}</code> <span className="text-ink-faint">— {label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardBody>
      </Card>
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)} title={preview?.name ?? ''} description="Stored wording (already sanitized). Placeholders are filled in when issuing.">
        {preview && <div className={`rounded-xl border border-line p-5 font-serif leading-7 ${RICH_TEXT}`} dangerouslySetInnerHTML={{ __html: preview.body }} />}
      </Dialog>
    </div>
  );
}

function IdCards() {
  const { data: lk } = useLookups(['classes']);
  const [kind, setKind] = React.useState<Recipient>('STUDENT');
  const [sectionId, setSectionId] = React.useState('');
  return (
    <Card className="max-w-2xl">
      <CardHeader title="Print ID cards" description="Portrait CR80 cards (54 × 86 mm), nine per A4 sheet. Print on card stock or PVC sheets." icon={IdCard} />
      <CardBody className="space-y-4">
        <Segmented value={kind} onChange={setKind} options={[{ value: 'STUDENT', label: 'Students' }, { value: 'EMPLOYEE', label: 'Staff' }]} />
        {kind === 'STUDENT' && (
          <Field label="Class & section">
            <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} options={allSectionOptions(lk)} placeholder="Choose…" />
          </Field>
        )}
        <p className="rounded-xl bg-canvas p-3 text-xs text-ink-soft">
          The QR code on each card carries the {kind === 'STUDENT' ? 'admission number, so cards work with “Scan ID card” in Attendance' : 'employee code'}. Upload photos on the {kind === 'STUDENT' ? 'student' : 'employee'} profile first for best results.
        </p>
        <div className="flex justify-end">
          <Button disabled={kind === 'STUDENT' && !sectionId} onClick={() => openPrint(kind === 'STUDENT' ? `/print/id-cards?type=STUDENT&sectionId=${sectionId}` : '/print/id-cards?type=EMPLOYEE')}>
            <Printer /> Print cards
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function CertificatesInner() {
  const params = useSearchParams();
  const studentId = params.get('studentId');
  const [tab, setTab] = React.useState('issue');
  return (
    <>
      <PageHeader title="Certificates & ID cards" description="Transfer, bonafide, character and experience certificates with QR verification; student and staff ID cards." icon={Award} />
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: 'issue', label: 'Issue' },
          { value: 'register', label: 'Register' },
          { value: 'templates', label: 'Templates' },
          { value: 'id-cards', label: 'ID cards' },
        ]}
      >
        <TabPanel value="issue">
          <IssuePanel initialStudentId={studentId} />
        </TabPanel>
        <TabPanel value="register">
          <Register />
        </TabPanel>
        <TabPanel value="templates">
          <Templates />
        </TabPanel>
        <TabPanel value="id-cards">
          <IdCards />
        </TabPanel>
      </Tabs>
    </>
  );
}

export default function CertificatesPage() {
  return (
    <React.Suspense>
      <CertificatesInner />
    </React.Suspense>
  );
}
