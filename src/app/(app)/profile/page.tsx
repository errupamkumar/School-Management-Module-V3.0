'use client';

import * as React from 'react';
import { signOut } from 'next-auth/react';
import { KeyRound, LogOut, MonitorSmartphone, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';
import { useLang } from '@/components/providers';
import { useApp } from '@/components/shell/app-context';
import { PasswordForm } from '@/components/password-form';
import { AppInstallCard } from '@/components/app-install-card';
import { PhotoPicker } from '@/components/people';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, KeyValue, PageHeader } from '@/components/ui/display';
import { Field, Select } from '@/components/ui/form';
import { LANGS, type Lang } from '@/lib/i18n';
import { useConfirm } from '@/components/ui/overlay';

export default function ProfilePage() {
  const { me, refresh } = useApp();
  const { lang, setLang } = useLang();
  const confirm = useConfirm();
  const u = me.user;

  async function patch(body: Record<string, unknown>, msg: string) {
    try {
      await api('/api/me', { method: 'PATCH', body });
      toast.success(msg);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader title="My profile" description="Your account, photo, language and password." icon={UserCircle2} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Account" icon={UserCircle2} />
          <CardBody className="space-y-5">
            <PhotoPicker name={u.name} value={u.avatarUrl} onChange={(v) => patch({ avatarUrl: v }, v ? 'Photo updated' : 'Photo removed')} />
            <KeyValue
              items={[
                ['Name', u.name],
                ['Role', u.roleLabel],
                ['Username', <span key="u" className="font-mono">{u.username}</span>],
                ['School code', <span key="c" className="font-mono">{me.school.code}</span>],
                ['Email', u.email ?? '—'],
                ['Mobile', u.phone ?? '—'],
                ['Last sign-in', u.lastLoginAt ? formatDateTime(u.lastLoginAt) : '—'],
              ]}
            />
            <Field label="Language">
              <Select
                value={lang}
                onChange={(e) => {
                  const l = e.target.value as Lang;
                  setLang(l);
                  toast.success('Language updated');
                }}
                options={LANGS.filter((l) => (me.settings?.languages?.enabled ?? ['en', 'hi']).includes(l.code)).map((l) => ({ value: l.code, label: l.code === 'en' ? l.native : `${l.native} (${l.name})` }))}
              />
            </Field>
            <p className="text-xs text-ink-faint">To change your name, email or mobile number, contact the school office.</p>
          </CardBody>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Change password" description="Changing your password signs you out on all other devices." icon={KeyRound} />
            <CardBody>
              <PasswordForm />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Devices" icon={MonitorSmartphone} />
            <CardBody className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-soft">Lost a phone or signed in on a shared computer? Sign out everywhere, including this device.</p>
              <Button
                variant="secondary"
                onClick={async () => {
                  if (!(await confirm({ title: 'Sign out of all devices?', description: 'You will need to sign in again on every device.', confirmLabel: 'Sign out everywhere', tone: 'danger' }))) return;
                  try {
                    await api('/api/me/sessions', { method: 'POST' });
                    await signOut({ callbackUrl: '/login' });
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                <LogOut /> Sign out everywhere
              </Button>
            </CardBody>
          </Card>
          <AppInstallCard />
        </div>
      </div>
    </>
  );
}
