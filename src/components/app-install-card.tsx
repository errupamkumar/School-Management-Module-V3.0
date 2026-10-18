'use client';

import * as React from 'react';
import { Bell, BellOff, CheckCircle2, Download, Share, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { useLang } from '@/components/providers';
import { usePush, usePwa } from '@/components/pwa';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader } from '@/components/ui/display';

/** Install the app on this phone and turn school alerts on or off for this device. */
export function AppInstallCard() {
  const { t } = useLang();
  const pwa = usePwa();
  const push = usePush();
  const [busy, setBusy] = React.useState(false);

  return (
    <Card>
      <CardHeader title="App & notifications" description="Use Vidyalaya like an app and get alerts on this phone." icon={Smartphone} />
      <CardBody className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold">App on this device</p>
          {pwa.installed ? (
            <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4" /> Installed. Open Vidyalaya from your home screen.
            </p>
          ) : pwa.canInstall ? (
            <Button
              onClick={async () => {
                if (await pwa.install()) toast.success('App installed');
              }}
            >
              <Download /> {t('installApp')}
            </Button>
          ) : pwa.ios ? (
            <p className="text-sm text-ink-soft">
              On iPhone or iPad: tap <Share className="inline size-4 align-text-bottom" /> <b>Share</b> in Safari, then <b>Add to Home Screen</b>.
            </p>
          ) : (
            <p className="text-sm text-ink-soft">Open this page in Chrome on Android (menu → Install app) or Safari on iPhone (Share → Add to Home Screen).</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold">
            Phone notifications
            {push.state === 'on' && <Badge tone="success">On</Badge>}
          </p>
          {push.state === 'unsupported' ? (
            <p className="text-sm text-ink-soft">This browser cannot show notifications. On iPhone, install the app first (iOS 16.4 or later).</p>
          ) : push.state === 'unavailable' ? (
            <p className="text-sm text-ink-soft">Your school has not turned on phone notifications. You still get every alert inside the app.</p>
          ) : push.state === 'denied' ? (
            <p className="text-sm text-ink-soft">Notifications are blocked for this site. Allow them in your browser or phone settings, then reload.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {push.state === 'on' ? (
                <>
                  <Button
                    variant="secondary"
                    loading={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const r = await api<{ sent: number }>('/api/push/test', { method: 'POST' });
                        toast.success(r.sent ? 'Test notification sent' : 'No device received it. Try turning notifications off and on.');
                      } catch (e) {
                        toast.error((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Bell /> Send a test
                  </Button>
                  <Button variant="ghost" onClick={() => push.disable().then(() => toast.success('Notifications turned off on this device'))}>
                    <BellOff /> Turn off
                  </Button>
                </>
              ) : (
                <Button
                  loading={busy || push.state === 'loading'}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await push.enable();
                      toast.success('Notifications turned on for this device');
                    } catch (e) {
                      toast.error((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Bell /> Turn on notifications
                </Button>
              )}
            </div>
          )}
          <p className="text-xs text-ink-faint">Attendance alerts, fee receipts, results, homework and “bus approaching” messages.</p>
        </div>
      </CardBody>
    </Card>
  );
}
