'use client';

import { KeyRound } from 'lucide-react';
import { PageHeader } from '@/components/ui/display';
import { LoginsTable } from '@/components/people';

export default function StaffLoginsPage() {
  return (
    <>
      <PageHeader title="Staff logins" description="Enable, disable or reset staff accounts. Change what each role can do under Roles & Permissions." icon={KeyRound} />
      <LoginsTable type="STAFF" />
    </>
  );
}
