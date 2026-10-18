'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { ShieldCheck } from 'lucide-react';
import { PasswordForm } from '@/components/password-form';

export default function ChangePasswordPage() {
  const router = useRouter();
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="card w-full max-w-md p-8">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
          <ShieldCheck className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-bold">Set a new password</h1>
        <p className="mt-1 text-sm text-ink-soft">For your security, replace the temporary password you were given before continuing.</p>
        <div className="mt-6">
          <PasswordForm
            onDone={() => {
              router.replace('/');
              router.refresh();
            }}
          />
        </div>
        <button className="mt-6 w-full text-center text-xs text-ink-faint hover:text-ink" onClick={() => signOut({ callbackUrl: '/login' })}>
          Sign out
        </button>
      </div>
    </div>
  );
}
