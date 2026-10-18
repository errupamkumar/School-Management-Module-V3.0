'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { toast } from 'sonner';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string = 'ERROR',
    public details?: Record<string, string>
  ) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | null | undefined>;

export function buildUrl(url: string, params?: Params): string {
  if (!params) return url;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${url}${url.includes('?') ? '&' : '?'}${s}` : url;
}

let redirecting = false;

export async function api<T = unknown>(url: string, opts: { method?: string; body?: unknown; params?: Params } = {}): Promise<T> {
  const res = await fetch(buildUrl(url, opts.params), {
    method: opts.method ?? 'GET',
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  });
  let payload: { success?: boolean; data?: T; error?: string; code?: string; details?: Record<string, string> } = {};
  try {
    payload = await res.json();
  } catch {
    // non-JSON error page
  }
  if (!res.ok || payload.success === false) {
    const code = payload.code ?? 'ERROR';
    if (typeof window !== 'undefined' && !redirecting) {
      if (res.status === 401) {
        redirecting = true;
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}&reason=expired`;
      } else if (code === 'PASSWORD_CHANGE_REQUIRED') {
        redirecting = true;
        window.location.href = '/change-password';
      }
    }
    throw new ApiError(res.status, payload.error ?? `Request failed (${res.status})`, code, payload.details);
  }
  return payload.data as T;
}

export interface Paged<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  /** Any extra summary fields the endpoint returns (e.g. sumTotal). */
  [extra: string]: unknown;
}

/** Fetches a paginated list endpoint that returns `{ data, total, page, pageSize }`. */
export function usePagedQuery<T>(url: string | null, params?: Params) {
  return useQuery<Paged<T>, ApiError>({
    queryKey: [url, params ?? {}, 'paged'],
    queryFn: async () => {
      const res = await fetch(buildUrl(url!, params), { credentials: 'same-origin' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) {
        if (res.status === 401 && typeof window !== 'undefined') window.location.href = '/login?reason=expired';
        throw new ApiError(res.status, payload.error ?? 'Request failed', payload.code);
      }
      const { success: _s, ...rest } = payload;
      return rest as Paged<T>;
    },
    enabled: !!url,
    placeholderData: (prev) => prev,
  });
}

export function useApiQuery<T = unknown>(url: string | null, params?: Params, options?: Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<T, ApiError>({
    queryKey: [url, params ?? {}],
    queryFn: () => api<T>(url!, { params }),
    enabled: !!url && (options?.enabled ?? true),
    ...options,
  });
}

/** Invalidate every cached query whose URL starts with one of the prefixes. */
export function useInvalidate() {
  const qc = useQueryClient();
  return (prefixes: string[]) =>
    qc.invalidateQueries({
      predicate: (q) => typeof q.queryKey[0] === 'string' && prefixes.some((p) => (q.queryKey[0] as string).startsWith(p)),
    });
}

export function useApiMutation<TVars = unknown, TRes = unknown>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string | ((vars: TVars) => string),
  opts: { invalidate?: string[]; success?: string | ((res: TRes) => string); onSuccess?: (res: TRes, vars: TVars) => void; silent?: boolean } = {}
) {
  const invalidate = useInvalidate();
  return useMutation<TRes, ApiError, TVars>({
    mutationFn: (vars) => api<TRes>(typeof url === 'function' ? url(vars) : url, { method, body: method === 'DELETE' && vars === undefined ? undefined : vars }),
    onSuccess: async (res, vars) => {
      if (opts.invalidate?.length) await invalidate(opts.invalidate);
      if (opts.success) toast.success(typeof opts.success === 'function' ? opts.success(res) : opts.success);
      opts.onSuccess?.(res, vars);
    },
    onError: (err) => {
      if (!opts.silent) toast.error(err.message);
    },
  });
}
