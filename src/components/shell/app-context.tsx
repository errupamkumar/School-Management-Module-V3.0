'use client';

import * as React from 'react';
import { useApiQuery } from '@/lib/api-client';
import { hasPerm, type Action, type AppRole, type ModuleKey, type PermissionMap } from '@/lib/modules';
import { applyPalette } from '@/lib/theme';
import { isLang } from '@/lib/i18n';
import { useLang } from '@/components/providers';

export interface Me {
  user: {
    id: string;
    name: string;
    role: AppRole;
    roleLabel: string;
    username: string;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    language: string;
    studentId: string | null;
    guardianId: string | null;
    employeeId: string | null;
    lastLoginAt: string | null;
  };
  school: {
    id: string;
    code: string;
    name: string;
    shortName: string | null;
    tagline: string | null;
    logoUrl: string | null;
    themeColor: string;
    board: string | null;
    city: string | null;
    state: string | null;
    status: string;
    trialEndsAt: string | null;
    readOnlyReason: string | null;
    planName: string | null;
    academicYear: string;
  };
  permissions: PermissionMap;
  settings: {
    workingDays: number[];
    exams: { overallPassPercent: number; subjectPassPercent: number; maxFailedSubjects: number; showRank: boolean };
    fees: { allowPartialPayment: boolean; onlinePaymentEnabled: boolean; allowAdvance: boolean };
    behaviourTraits: string[];
    skillTraits: string[];
    liveTracking: { enabled: boolean; shareWithParents: boolean; pingIntervalSec: number };
    maps: { tileUrl: string; attribution: string };
    languages: { enabled: string[]; default: string };
    notifications: { pushEnabled: boolean };
    remarkBank: string[];
    disciplineCategories: string[];
    liveClasses: { bbb: boolean };
  };
  /** True when this user drives a vehicle and may share its live location. */
  isDriver?: boolean;
  children: Array<{ id: string; name: string; admissionNo: string; classLabel: string; classId: string; sectionId: string; photoUrl: string | null }>;
  unreadNotifications: number;
  appCount?: number;
}

interface AppCtx {
  me: Me;
  role: AppRole;
  can: (module: ModuleKey, action?: Action) => boolean;
  isFamily: boolean;
  /** For parents with several children: the child currently in focus. */
  childId: string | null;
  setChildId: (id: string) => void;
  refresh: () => void;
}

const Ctx = React.createContext<AppCtx | null>(null);

export function AppProvider({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const { data, refetch, error } = useApiQuery<Me>('/api/me', undefined, { staleTime: 60_000 });
  const [childId, setChildIdState] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (data?.school.themeColor) applyPalette(data.school.themeColor);
  }, [data?.school.themeColor]);

  // Language: the user's own choice, else the school's default; never one the school has switched off.
  const { lang, adopt } = useLang();
  React.useEffect(() => {
    if (!data) return;
    const enabled = data.settings.languages?.enabled ?? ['en', 'hi'];
    const fallback = isLang(data.settings.languages?.default) && enabled.includes(data.settings.languages.default) ? data.settings.languages.default : 'en';
    const own = data.user.language;
    const want = isLang(own) && enabled.includes(own) && (own !== 'en' || fallback === 'en') ? own : fallback;
    if (!enabled.includes(lang) || (!adopt.chosen && lang !== want)) adopt.set(isLang(want) ? want : 'en');
  }, [data, lang, adopt]);

  React.useEffect(() => {
    if (!data?.children.length) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('vidyalaya-child');
    } catch {
      // storage unavailable
    }
    setChildIdState(data.children.some((c) => c.id === saved) ? saved : data.children[0].id);
  }, [data?.children]);

  const value = React.useMemo<AppCtx | null>(() => {
    if (!data) return null;
    return {
      me: data,
      role: data.user.role,
      can: (m, a = 'view') => hasPerm(data.permissions, m, a),
      isFamily: data.user.role === 'PARENT' || data.user.role === 'STUDENT',
      childId,
      setChildId: (id) => {
        setChildIdState(id);
        try {
          localStorage.setItem('vidyalaya-child', id);
        } catch {
          // storage unavailable
        }
      },
      refresh: () => void refetch(),
    };
  }, [data, childId, refetch]);

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center text-sm text-ink-soft">
        <div>
          <p className="font-semibold text-ink">We couldn’t load your account.</p>
          <p className="mt-1">{error.message}</p>
          <a href="/login" className="mt-4 inline-block text-brand-600 underline">
            Sign in again
          </a>
        </div>
      </div>
    );
  }
  if (!value) return <>{fallback}</>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const v = React.useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}

/** The child in focus for family users; null for staff. */
export function useFocusChild() {
  const { me, childId } = useApp();
  return me.children.find((c) => c.id === childId) ?? me.children[0] ?? null;
}
