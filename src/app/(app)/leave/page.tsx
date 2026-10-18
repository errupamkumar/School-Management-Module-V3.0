'use client';

import * as React from 'react';
import { CalendarOff, Check, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { formatDate, todayISO } from '@/lib/utils';
import { useApp, useFocusChild } from '@/components/shell/app-context';
import { FormDialog } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Badge, Card, EmptyState, LoadingBlock, PageHeader, StatusBadge } from '@/components/ui/display';
import { Tabs, TabPanel, usePrompt } from '@/components/ui/overlay';

interface Leave {
  id: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: string;
  reviewNote: string | null;
  forName: string;
  forDetail: string;
  kind: 'STUDENT' | 'STAFF';
  applicantName: string;
  createdAt: string;
}

function LeaveList({ view }: { view: 'mine' | 'approve' }) {
  const prompt = usePrompt();
  const invalidate = useInvalidate();
  const { data, isLoading } = useApiQuery<Leave[]>('/api/leave', { view });
  const act = async (id: string, status: string, note?: string | null) => {
    try {
      await api(`/api/leave/${id}`, { method: 'PATCH', body: { status, reviewNote: note ?? null } });
      toast.success(`Leave ${status.toLowerCase()}`);
      invalidate(['/api/leave', '/api/dashboard', '/api/attendance']);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  if (isLoading) return <LoadingBlock />;
  if (!data?.length) return <Card><EmptyState icon={CalendarOff} title={view === 'approve' ? 'Nothing to review' : 'No leave applications'} /></Card>;
  return (
    <Card>
      <ul className="divide-y divide-line">
        {data.map((l) => (
          <li key={l.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{l.forName}</p>
                <span className="text-xs text-ink-faint">{l.forDetail}</span>
                <Badge>{l.leaveType.toLowerCase()}</Badge>
                <Badge tone="brand">{l.days} day{l.days > 1 ? 's' : ''}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-ink-faint">
                {formatDate(l.fromDate)} – {formatDate(l.toDate)} · applied by {l.applicantName} on {formatDate(l.createdAt)}
              </p>
              <p className="mt-1.5 text-sm">{l.reason}</p>
              {l.reviewNote && <p className="mt-1 text-xs text-ink-soft">Note: {l.reviewNote}</p>}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={l.status} />
              {view === 'approve' && l.status === 'PENDING' && (
                <>
                  <Button size="sm" variant="success" onClick={() => act(l.id, 'APPROVED')}>
                    <Check /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger-soft"
                    onClick={async () => {
                      const note = await prompt({ title: 'Reject leave?', label: 'Reason', minLength: 3, confirmLabel: 'Reject' });
                      if (note) act(l.id, 'REJECTED', note);
                    }}
                  >
                    <X /> Reject
                  </Button>
                </>
              )}
              {view === 'mine' && l.status === 'PENDING' && (
                <Button size="sm" variant="ghost" onClick={() => act(l.id, 'CANCELLED')}>
                  Withdraw
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function LeavePage() {
  const { can, role, me } = useApp();
  const child = useFocusChild();
  const invalidate = useInvalidate();
  const reviewer = can('leave', 'edit');
  const [tab, setTab] = React.useState(reviewer && role !== 'TEACHER' ? 'approve' : 'mine');
  const [open, setOpen] = React.useState(false);
  const family = role === 'PARENT';
  const canApply = can('leave', 'create') && (family || !!me.user.employeeId);
  return (
    <>
      <PageHeader
        title="Leave"
        description={family ? `Apply for ${child?.name ?? 'your child'}’s leave — the class teacher is notified.` : 'Apply for leave and review applications.'}
        icon={CalendarOff}
        actions={
          canApply && (
            <Button onClick={() => setOpen(true)}>
              <Plus /> Apply for leave
            </Button>
          )
        }
      />
      {reviewer ? (
        <Tabs value={tab} onValueChange={setTab} tabs={[{ value: 'approve', label: role === 'TEACHER' ? 'My students' : 'To review' }, ...(me.user.employeeId ? [{ value: 'mine', label: 'My applications' }] : [])]}>
          <TabPanel value="approve">
            <LeaveList view="approve" />
          </TabPanel>
          <TabPanel value="mine">
            <LeaveList view="mine" />
          </TabPanel>
        </Tabs>
      ) : (
        <LeaveList view="mine" />
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={family ? `Leave for ${child?.name ?? ''}` : 'Apply for leave'}
        fields={[
          { name: 'leaveType', label: 'Type', type: 'select', required: true, options: (family ? ['SICK', 'FAMILY', 'OTHER'] : ['CASUAL', 'SICK', 'EARNED', 'MATERNITY', 'OTHER']).map((t) => ({ value: t, label: t.toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) })) },
          { name: 'fromDate', label: 'From', type: 'date', required: true },
          { name: 'toDate', label: 'To', type: 'date', required: true },
          { name: 'reason', label: 'Reason', type: 'textarea', required: true },
        ]}
        initial={{ leaveType: family ? 'SICK' : 'CASUAL', fromDate: todayISO(), toDate: todayISO() }}
        onSubmit={async (v) => {
          await api('/api/leave', { method: 'POST', body: { ...v, studentId: family ? child?.id : null } });
          toast.success('Leave application submitted');
          invalidate(['/api/leave']);
        }}
      />
    </>
  );
}
