'use client';

import * as React from 'react';
import { KeyRound } from 'lucide-react';
import { classOptions, useLookups } from '@/lib/lookups';
import { useApp } from '@/components/shell/app-context';
import { PageHeader } from '@/components/ui/display';
import { Tabs, TabPanel } from '@/components/ui/overlay';
import { LoginsTable } from '@/components/people';

export default function StudentLoginsPage() {
  const { can } = useApp();
  const { data: lk } = useLookups(['classes']);
  const [tab, setTab] = React.useState('STUDENT');
  return (
    <>
      <PageHeader title="Student & parent logins" description="Enable, disable or reset logins. Passwords are stored encrypted and are never shown — reset issues a one-time temporary password." icon={KeyRound} />
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: 'STUDENT', label: 'Students' },
          ...(can('guardians') ? [{ value: 'PARENT', label: 'Parents' }] : []),
        ]}
      >
        <TabPanel value="STUDENT">
          <LoginsTable type="STUDENT" classOptions={classOptions(lk)} />
        </TabPanel>
        <TabPanel value="PARENT">
          <LoginsTable type="PARENT" classOptions={classOptions(lk)} />
        </TabPanel>
      </Tabs>
    </>
  );
}
