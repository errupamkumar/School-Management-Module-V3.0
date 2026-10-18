'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { api, ApiError } from '@/lib/api-client';

export function PasswordForm({ onDone, compact }: { onDone?: () => void; compact?: boolean }) {
  const { update } = useSession();
  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const strong = next.length >= 8 && /[A-Za-z]/.test(next) && /\d/.test(next);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== confirm) return setError('New passwords do not match.');
    setLoading(true);
    try {
      await api('/api/me/password', { method: 'POST', body: { currentPassword: current, newPassword: next } });
      await update(); // refresh this device's token (other devices are signed out)
      toast.success('Password changed');
      setCurrent('');
      setNext('');
      setConfirm('');
      onDone?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className={compact ? 'grid gap-4 sm:grid-cols-3' : 'space-y-4'}>
      <Field label="Current password">
        <Input suppressHydrationWarning type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
      </Field>
      <Field label="New password" hint="At least 8 characters with letters and numbers">
        <Input suppressHydrationWarning type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
      </Field>
      <Field label="Confirm new password">
        <Input suppressHydrationWarning type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
      </Field>
      {error && <p className="text-sm text-rose-600 sm:col-span-3">{error}</p>}
      <div className={compact ? 'sm:col-span-3' : ''}>
        <Button type="submit" loading={loading} disabled={!current || !strong || next !== confirm} className={compact ? '' : 'w-full'}>
          <KeyRound /> Update password
        </Button>
      </div>
    </form>
  );
}
