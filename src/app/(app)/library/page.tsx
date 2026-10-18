'use client';

import * as React from 'react';
import { BookCheck, BookOpen, BookUp, FileUp, Library } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { useLookups } from '@/lib/lookups';
import { formatDate, formatINR } from '@/lib/utils';
import { useApp, useFocusChild } from '@/components/shell/app-context';
import { ResourcePage } from '@/components/resource';
import { StudentPicker, type PickedStudent } from '@/components/student-picker';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardHeader, EmptyState, LoadingBlock, PageHeader } from '@/components/ui/display';
import { CsvImportDialog } from '@/components/csv-import';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input, Segmented, Select } from '@/components/ui/form';
import { Dialog, Tabs, TabPanel, usePrompt } from '@/components/ui/overlay';

interface Book {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  publisher: string | null;
  category: string | null;
  rackNo: string | null;
  copies: number;
  available: number;
}
interface Issue {
  id: string;
  borrowerType: string;
  borrowerName: string;
  issuedOn: string;
  dueOn: string;
  returnedOn: string | null;
  fine: number;
  overdueDays: number;
  book: { title: string; author: string | null; rackNo: string | null };
}

function IssueDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const invalidate = useInvalidate();
  const { data: books } = useApiQuery<Book[]>(open ? '/api/library/books' : null);
  const { data: lk } = useLookups(['employees']);
  const [kind, setKind] = React.useState<'STUDENT' | 'EMPLOYEE'>('STUDENT');
  const [student, setStudent] = React.useState<PickedStudent | null>(null);
  const [employeeId, setEmployeeId] = React.useState('');
  const [bookId, setBookId] = React.useState('');
  const [due, setDue] = React.useState(() => new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10));
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Issue a book"
      footer={
        <Button
          disabled={!bookId || (kind === 'STUDENT' ? !student : !employeeId)}
          onClick={async () => {
            try {
              await api('/api/library/issues', { method: 'POST', body: { bookId, borrowerType: kind, borrowerId: kind === 'STUDENT' ? student!.id : employeeId, dueOn: due } });
              toast.success('Book issued');
              invalidate(['/api/library', '/api/dashboard']);
              onOpenChange(false);
              setBookId('');
              setStudent(null);
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          <BookUp /> Issue
        </Button>
      }
    >
      <div className="space-y-4">
        <Segmented value={kind} onChange={setKind} options={[{ value: 'STUDENT', label: 'Student' }, { value: 'EMPLOYEE', label: 'Staff' }]} />
        {kind === 'STUDENT' ? (
          <Field label="Student">
            <StudentPicker value={student} onChange={setStudent} />
          </Field>
        ) : (
          <Field label="Staff member">
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} options={(lk?.employees ?? []).map((e) => ({ value: e.id, label: `${e.name} (${e.designation})` }))} placeholder="Choose…" />
          </Field>
        )}
        <Field label="Book">
          <Select value={bookId} onChange={(e) => setBookId(e.target.value)} options={(books ?? []).filter((b) => b.available > 0).map((b) => ({ value: b.id, label: `${b.title} — ${b.author ?? ''} (${b.available} left)` }))} placeholder="Choose…" />
        </Field>
        <Field label="Due date">
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

function Circulation() {
  const { can } = useApp();
  const prompt = usePrompt();
  const invalidate = useInvalidate();
  const [status, setStatus] = React.useState<'OUT' | 'OVERDUE' | 'RETURNED'>('OUT');
  const { data, isLoading } = useApiQuery<Issue[]>('/api/library/issues', { status });
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <Segmented size="sm" value={status} onChange={setStatus} options={[{ value: 'OUT', label: 'Issued' }, { value: 'OVERDUE', label: 'Overdue' }, { value: 'RETURNED', label: 'Returned' }]} />
          {can('library', 'create') && (
            <Button size="sm" className="ml-auto" onClick={() => setOpen(true)}>
              <BookUp /> Issue book
            </Button>
          )}
        </div>
        <DataTable<Issue>
          data={data}
          loading={isLoading}
          emptyTitle="Nothing here"
          columns={[
            { id: 'book', header: 'Book', cell: ({ row }) => <div><p className="font-medium">{row.original.book.title}</p><p className="text-xs text-ink-faint">{row.original.book.author} {row.original.book.rackNo ? `· Rack ${row.original.book.rackNo}` : ''}</p></div> },
            { accessorKey: 'borrowerName', header: 'Borrower', cell: ({ row }) => <div><p>{row.original.borrowerName}</p><Badge>{row.original.borrowerType.toLowerCase()}</Badge></div> },
            { accessorKey: 'issuedOn', header: 'Issued', cell: ({ getValue }) => formatDate(getValue()) },
            { accessorKey: 'dueOn', header: 'Due', cell: ({ row }) => <span className={row.original.overdueDays ? 'font-semibold text-rose-600' : ''}>{formatDate(row.original.dueOn)}{row.original.overdueDays ? ` (${row.original.overdueDays}d late)` : ''}</span> },
            { id: 'ret', header: status === 'RETURNED' ? 'Returned' : '', cell: ({ row }) => row.original.returnedOn ? <span className="text-xs">{formatDate(row.original.returnedOn)} {Number(row.original.fine) > 0 && <Badge tone="warning">fine {formatINR(Number(row.original.fine), true)}</Badge>}</span> : can('library', 'edit') ? (
              <Button
                size="sm"
                variant="soft"
                onClick={async () => {
                  const suggested = row.original.overdueDays * 2;
                  const fine = suggested > 0 ? await prompt({ title: `Return “${row.original.book.title}”`, description: `${row.original.overdueDays} days late. Suggested fine ₹${suggested}. Enter 0 to waive.`, label: 'Fine (₹)', placeholder: String(suggested), tone: 'primary', confirmLabel: 'Return' }) : '0';
                  if (fine === null) return;
                  try {
                    await api(`/api/library/issues/${row.original.id}`, { method: 'PATCH', body: { fine: Number(fine) || 0 } });
                    toast.success('Returned');
                    invalidate(['/api/library', '/api/dashboard']);
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                <BookCheck /> Return
              </Button>
            ) : null },
          ]}
        />
      </Card>
      <IssueDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function FamilyLibrary() {
  const child = useFocusChild();
  const { data, isLoading } = useApiQuery<Issue[]>(child ? '/api/library/issues' : null, { status: 'ALL', studentId: child?.id });
  return (
    <>
      <PageHeader title="Library" description={child ? `Books borrowed by ${child.name}` : ''} icon={Library} />
      <Card>
        <CardHeader title="Borrowed books" icon={BookOpen} />
        {isLoading ? (
          <LoadingBlock />
        ) : !data?.length ? (
          <EmptyState title="No books borrowed" />
        ) : (
          <ul className="divide-y divide-line">
            {data.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium">{i.book.title}</p>
                  <p className="text-xs text-ink-faint">
                    Issued {formatDate(i.issuedOn)} · due {formatDate(i.dueOn)}
                  </p>
                </div>
                {i.returnedOn ? <Badge tone="success">Returned</Badge> : i.overdueDays ? <Badge tone="danger">{i.overdueDays} days overdue</Badge> : <Badge tone="warning">With student</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function LibraryPage() {
  const { isFamily, can, role } = useApp();
  const [tab, setTab] = React.useState('circulation');
  const [importing, setImporting] = React.useState(false);
  const invalidate = useInvalidate();
  if (isFamily) return <FamilyLibrary />;
  const staffManager = can('library', 'create');
  return (
    <>
      <PageHeader
        title="Library"
        description="Catalogue, issue and return with overdue fines."
        icon={Library}
        actions={
          staffManager && (
            <Button variant="secondary" onClick={() => setImporting(true)}>
              <FileUp /> Import books
            </Button>
          )
        }
      />
      <CsvImportDialog
        open={importing}
        onOpenChange={setImporting}
        title="Import books"
        description="Add your catalogue from a spreadsheet. Rows with an ISBN (or title and author) already in the catalogue add copies to it."
        endpoint="/api/library/import"
        columns={['title', 'author', 'isbn', 'publisher', 'category', 'rackNo', 'copies']}
        required={['title']}
        sample={{ title: 'Wings of Fire', author: 'A. P. J. Abdul Kalam', isbn: '9788173711466', publisher: 'Universities Press', category: 'Biography', rackNo: 'B-2', copies: '3' }}
        onDone={() => invalidate(['/api/library'])}
      />
      <Tabs value={tab} onValueChange={setTab} tabs={[...(staffManager || role !== 'TEACHER' ? [{ value: 'circulation', label: 'Circulation' }] : [{ value: 'circulation', label: 'My books' }]), { value: 'catalogue', label: 'Catalogue' }]}>
        <TabPanel value="circulation">
          <Circulation />
        </TabPanel>
        <TabPanel value="catalogue">
          <ResourcePage<Book>
            embedded
            title="Books"
            entityLabel="Book"
            endpoint="/api/library/books"
            module="library"
            searchPlaceholder="Title, author, ISBN…"
            exportRow={(b) => ({ Title: b.title, Author: b.author, ISBN: b.isbn, Publisher: b.publisher, Category: b.category, Rack: b.rackNo, Copies: b.copies, Available: b.available })}
            columns={[
              { accessorKey: 'title', header: 'Title', cell: ({ row }) => <div><p className="font-medium">{row.original.title}</p><p className="text-xs text-ink-faint">{row.original.author}</p></div> },
              { accessorKey: 'category', header: 'Category' },
              { accessorKey: 'rackNo', header: 'Rack' },
              { accessorKey: 'isbn', header: 'ISBN', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() ?? '—'}</span> },
              { id: 'avail', header: 'Available', cell: ({ row }) => <Badge tone={row.original.available === 0 ? 'danger' : 'success'}>{row.original.available} / {row.original.copies}</Badge> },
            ]}
            fields={[
              { name: 'title', label: 'Title', required: true, span: 2 },
              { name: 'author', label: 'Author' },
              { name: 'publisher', label: 'Publisher' },
              { name: 'isbn', label: 'ISBN' },
              { name: 'category', label: 'Category', placeholder: 'Fiction, Reference…' },
              { name: 'rackNo', label: 'Rack / shelf' },
              { name: 'copies', label: 'Number of copies', type: 'number', required: true },
            ]}
            defaults={{ copies: 1 }}
          />
        </TabPanel>
      </Tabs>
    </>
  );
}
