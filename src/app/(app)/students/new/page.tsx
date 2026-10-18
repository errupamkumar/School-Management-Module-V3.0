'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError, useInvalidate } from '@/lib/api-client';
import { todayISO } from '@/lib/utils';
import { PageHeader } from '@/components/ui/display';
import { StudentForm, splitStudentForm } from '@/components/student-form';
import { CredentialsDialog, type Credential } from '@/components/people';

export default function NewAdmissionPage() {
  const router = useRouter();
  const invalidate = useInvalidate();
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<{ studentId: string; credentials: Credential[] } | null>(null);

  return (
    <>
      <PageHeader title="New admission" description="Admit a student and create the family’s logins in one step." icon={UserPlus} />
      <StudentForm
        mode="create"
        initial={{ admissionDate: todayISO(), apaarConsent: 'PENDING', createLogins: true, consent: false, state: '' }}
        submitting={submitting}
        errors={errors}
        onSubmit={async (v) => {
          setSubmitting(true);
          setErrors({});
          try {
            const { student, guardian } = splitStudentForm(v, 'create');
            const res = await api<{ studentId: string; admissionNo: string; siblingOf: number; credentials: Credential[] }>('/api/students', {
              method: 'POST',
              body: { student, guardian, createLogins: !!v.createLogins, consent: !!v.consent },
            });
            await invalidate(['/api/students', '/api/dashboard', '/api/users']);
            toast.success(`Admitted with admission no. ${res.admissionNo}${res.siblingOf ? ' (linked to existing family)' : ''}`);
            if (res.credentials.length) setResult({ studentId: res.studentId, credentials: res.credentials });
            else router.push(`/students/${res.studentId}`);
          } catch (e) {
            if (e instanceof ApiError && e.details) setErrors(e.details);
            toast.error((e as Error).message);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } finally {
            setSubmitting(false);
          }
        }}
      />
      {result && (
        <CredentialsDialog
          credentials={result.credentials}
          title="Admission complete — login details"
          onClose={() => {
            const id = result.studentId;
            setResult(null);
            router.push(`/students/${id}`);
          }}
        />
      )}
    </>
  );
}
