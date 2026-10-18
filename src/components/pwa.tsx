'use client';

import * as React from 'react';

/**
 * Installable app support: registers the service worker, captures the
 * browser's install prompt, and manages this device's push subscription.
 */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaCtx {
  /** The browser offered an install prompt (Android Chrome, desktop Edge/Chrome). */
  canInstall: boolean;
  install: () => Promise<boolean>;
  /** Already running as an installed app. */
  installed: boolean;
  /** iPhone/iPad Safari: install is manual (Share → Add to Home Screen). */
  ios: boolean;
  registration: ServiceWorkerRegistration | null;
}

const Ctx = React.createContext<PwaCtx>({ canInstall: false, install: async () => false, installed: false, ios: false, registration: null });

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [prompt, setPrompt] = React.useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);
  const [ios, setIos] = React.useState(false);
  const [registration, setRegistration] = React.useState<ServiceWorkerRegistration | null>(null);

  React.useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent));
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('/sw.js').then(setRegistration).catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = React.useCallback(async () => {
    if (!prompt) return false;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setPrompt(null);
    return choice.outcome === 'accepted';
  }, [prompt]);

  const value = React.useMemo(() => ({ canInstall: !!prompt && !installed, install, installed, ios, registration }), [prompt, installed, install, ios, registration]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePwa = () => React.useContext(Ctx);

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export type PushState = 'unsupported' | 'unavailable' | 'denied' | 'off' | 'on' | 'loading';

/** This device's phone-notification state, with enable/disable actions. */
export function usePush() {
  const { registration } = usePwa();
  const [state, setState] = React.useState<PushState>('loading');
  const [publicKey, setPublicKey] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (typeof window === 'undefined' || !('PushManager' in window) || !('Notification' in window)) return setState('unsupported');
    try {
      const res = await fetch('/api/push/subscribe').then((r) => r.json());
      if (!res.data?.available) return setState('unavailable');
      setPublicKey(res.data.publicKey);
      if (Notification.permission === 'denied') return setState('denied');
      const sub = await registration?.pushManager.getSubscription();
      setState(sub ? 'on' : 'off');
    } catch {
      setState('unavailable');
    }
  }, [registration]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = React.useCallback(async () => {
    if (!registration || !publicKey) throw new Error('Notifications are not ready yet. Reload the page and try again.');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setState(permission === 'denied' ? 'denied' : 'off');
      throw new Error(permission === 'denied' ? 'Notifications are blocked. Allow them for this site in your browser settings.' : 'Permission was not granted.');
    }
    const sub = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource }));
    const json = sub.toJSON();
    const r = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }) });
    if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? 'Could not turn on notifications.');
    setState('on');
  }, [registration, publicKey]);

  const disable = React.useCallback(async () => {
    const sub = await registration?.pushManager.getSubscription();
    if (sub) {
      await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
    setState('off');
  }, [registration]);

  return { state, enable, disable, refresh };
}
