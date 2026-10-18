'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, BadgeIndianRupee, BarChart3, FileText, Layers, Receipt, Settings2, Wallet } from 'lucide-react';
import { useApp } from '@/components/shell/app-context';
import { PageHeader } from '@/components/ui/display';
import { Tabs, TabPanel } from '@/components/ui/overlay';
import { CollectFee } from './_components/collect';
import { Invoices } from './_components/invoices';
import { Receipts } from './_components/receipts';
import { Defaulters } from './_components/defaulters';
import { FeeStructure } from './_components/structure';
import { FeeSetup } from './_components/setup';
import { FeeReport } from './_components/report';
import { FamilyFees } from './_components/family';

function StaffFees() {
  const { can, role } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const canCollect = can('fees', 'create');
  const fullScope = role !== 'TEACHER';
  const tabs = [
    ...(canCollect ? [{ value: 'collect', label: <><Wallet className="size-4" /> Collect</> }] : []),
    { value: 'invoices', label: <><FileText className="size-4" /> Invoices</> },
    { value: 'receipts', label: <><Receipt className="size-4" /> Receipts</> },
    { value: 'defaulters', label: <><AlertTriangle className="size-4" /> Defaulters</> },
    ...(fullScope ? [{ value: 'report', label: <><BarChart3 className="size-4" /> Report</> }] : []),
    { value: 'structure', label: <><Layers className="size-4" /> Fee structure</> },
    { value: 'setup', label: <><Settings2 className="size-4" /> Heads & concessions</> },
  ];
  const tab = params.get('tab') && tabs.some((t) => t.value === params.get('tab')) ? params.get('tab')! : tabs[0].value;
  return (
    <>
      <PageHeader title="Fees" description="Invoices, collection, receipts, defaulters and fee structure." icon={BadgeIndianRupee} />
      <Tabs value={tab} onValueChange={(v) => router.replace(`/fees?tab=${v}`, { scroll: false })} tabs={tabs}>
        <TabPanel value="collect">
          <CollectFee />
        </TabPanel>
        <TabPanel value="invoices">
          <Invoices />
        </TabPanel>
        <TabPanel value="receipts">
          <Receipts />
        </TabPanel>
        <TabPanel value="defaulters">
          <Defaulters />
        </TabPanel>
        <TabPanel value="report">
          <FeeReport />
        </TabPanel>
        <TabPanel value="structure">
          <FeeStructure />
        </TabPanel>
        <TabPanel value="setup">
          <FeeSetup />
        </TabPanel>
      </Tabs>
    </>
  );
}

function FeesRouter() {
  const { isFamily } = useApp();
  return isFamily ? <FamilyFees /> : <StaffFees />;
}

export default function FeesPage() {
  return (
    <Suspense>
      <FeesRouter />
    </Suspense>
  );
}
