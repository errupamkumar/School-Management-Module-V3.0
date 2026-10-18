'use client';

import * as React from 'react';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Toaster } from 'sonner';
import { ConfirmProvider } from '@/components/ui/overlay';
import { isLang, translate, type Lang, type TKey } from '@/lib/i18n';
import { PwaProvider } from './pwa';
import { applyPalette } from '@/lib/theme';
import { ApiError } from '@/lib/api-client';

// ----------------------------------------------------------------------------
// Theme (light/dark) — persisted per device
// ----------------------------------------------------------------------------

type Theme = 'light' | 'dark';
const ThemeContext = React.createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => {} });

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>('light');
  React.useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);
  const toggle = React.useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', next === 'dark');
      try {
        localStorage.setItem('vidyalaya-theme', next);
      } catch {
        // storage unavailable
      }
      return next;
    });
  }, []);
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => React.useContext(ThemeContext);

// ----------------------------------------------------------------------------
// Language
// ----------------------------------------------------------------------------

interface LangCtx {
  lang: Lang;
  /** The user picks a language: remembered on this device and saved to their account. */
  setLang: (l: Lang) => void;
  t: (k: TKey) => string;
  /** Applies a language decided by school settings without saving it as the user's choice. */
  adopt: { chosen: boolean; set: (l: Lang) => void };
}

const LangContext = React.createContext<LangCtx>({
  lang: 'en',
  setLang: () => {},
  t: (k) => translate('en', k),
  adopt: { chosen: false, set: () => {} },
});

function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>('en');
  const [chosen, setChosen] = React.useState(false);
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('vidyalaya-lang');
      if (isLang(saved)) {
        setLangState(saved);
        setChosen(true);
      }
    } catch {
      // storage unavailable
    }
  }, []);
  React.useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = React.useCallback((l: Lang) => {
    setLangState(l);
    setChosen(true);
    try {
      localStorage.setItem('vidyalaya-lang', l);
    } catch {
      // storage unavailable
    }
    fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: l }) }).catch(() => {});
  }, []);
  const t = React.useCallback((k: TKey) => translate(lang, k), [lang]);
  const adopt = React.useMemo(() => ({ chosen, set: (l: Lang) => setLangState(l) }), [chosen]);
  const value = React.useMemo(() => ({ lang, setLang, t, adopt }), [lang, setLang, t, adopt]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}
export const useLang = () => React.useContext(LangContext);

// ----------------------------------------------------------------------------
// Root providers
// ----------------------------------------------------------------------------

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
          },
        },
      })
  );
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <LangProvider>
            <PwaProvider>
            <TooltipPrimitive.Provider>
              <ConfirmProvider>
                {children}
                <Toaster richColors closeButton position="top-right" />
              </ConfirmProvider>
            </TooltipPrimitive.Provider>
            </PwaProvider>
          </LangProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}

export { applyPalette };
