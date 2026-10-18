'use client';

import * as React from 'react';
import { Download, Printer } from 'lucide-react';
import { useApiQuery } from '@/lib/api-client';
import { downloadCsv, formatDate, formatINR, todayISO } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, LoadingBlock, StatCard } from '@/components/ui/display';
import { BarsChart, ShareBars } from '@/components/ui/charts';
import { Input } from '@/components/ui/form';
import { BadgeIndianRupee, Receipt } from 'lucide-react';

interface Report {
  total: number;
  count: number;
  byDay: Array<{ date: string; amount: number }>;
  byMode: Array<{ label: string; amount: number }>;
  byHead: Array<{ label: string; amount: number }>;
  byCollector: Array<{ label: string; amount: number }>;
  byClass: Array<{ label: string; amount: number }>;
}

export function FeeReport() {
  const [from, setFrom] = React.useState(todayISO().slice(0, 8) + '01');
  const [to, setTo] = React.useState(todayISO());
  const { data, isLoading } = useApiQuery<Report>('/api/fees/report', { from, to });
  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="flex flex-wrap items-center gap-3">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" aria-label="From" />
          <span className="text-xs text-ink-faint">to</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" aria-label="To" />
          <Button variant="secondary" size="sm" onClick={() => setFrom(to)}>
            Today only
          </Button>
          <div className="ml-auto flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!data}
              onClick={() =>
                downloadCsv(`fee-collection-${from}-${to}`, [
                  ...data!.byDay.map((d) => ({ Section: 'Day', Label: d.date, Amount: d.amount })),
                  ...data!.byMode.map((d) => ({ Section: 'Mode', Label: d.label, Amount: d.amount })),
                  ...data!.byHead.map((d) => ({ Section: 'Fee head', Label: d.label, Amount: d.amount })),
                  ...data!.byClass.map((d) => ({ Section: 'Class', Label: d.label, Amount: d.amount })),
                  ...data!.byCollector.map((d) => ({ Section: 'Collector', Label: d.label, Amount: d.amount })),
                ])
              }
            >
              <Download /> CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
          </div>
        </CardBody>
      </Card>
      {isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Collected" value={formatINR(data.total, true)} icon={BadgeIndianRupee} tone="emerald" hint={`${formatDate(from)} – ${formatDate(to)}`} />
            <StatCard label="Receipts" value={data.count} icon={Receipt} />
          </div>
          <Card>
            <CardHeader title="Daily collection" />
            <CardBody>
              <BarsChart data={data.byDay.map((d) => ({ day: d.date.slice(5), amount: d.amount }))} xKey="day" money series={[{ key: 'amount', label: 'Collected' }]} />
            </CardBody>
          </Card>
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              ['By payment mode', data.byMode],
              ['By fee head', data.byHead],
              ['By collector (cash desk)', data.byCollector],
            ].map(([title, items]) => (
              <Card key={title as string}>
                <CardHeader title={title as string} />
                <CardBody>
                  <ShareBars money items={(items as Report['byMode']).map((i) => ({ label: i.label.replace('_', ' '), value: i.amount }))} />
                </CardBody>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader title="By class" />
            <CardBody>
              <BarsChart data={data.byClass} xKey="label" money series={[{ key: 'amount', label: 'Collected' }]} />
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
