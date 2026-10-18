/**
 * Minimal HTTP client that signs in through the real NextAuth credentials flow
 * and keeps cookies, so tests exercise exactly what a browser does.
 */
export const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
export const PASSWORD = process.env.SEED_PASSWORD || 'Demo@12345';

export interface ApiResult<T = any> {
  status: number;
  ok: boolean;
  data: T;
  error?: string;
  code?: string;
  raw: any;
}

export class Session {
  private jar = new Map<string, string>();
  constructor(public label = 'anonymous') {}

  private cookieHeader() {
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  private store(res: Response) {
    const set = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    for (const c of set) {
      const [pair] = c.split(';');
      const idx = pair.indexOf('=');
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (!value || /expires=Thu, 01 Jan 1970/i.test(c)) this.jar.delete(name);
      else this.jar.set(name, value);
    }
  }

  async raw(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    if (this.jar.size) headers.set('cookie', this.cookieHeader());
    const res = await fetch(BASE + path, { ...init, headers, redirect: 'manual' });
    this.store(res);
    return res;
  }

  async login(schoolCode: string, identifier: string, password = PASSWORD): Promise<boolean> {
    const csrfRes = await this.raw('/api/auth/csrf');
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
    const form = new URLSearchParams({ csrfToken, schoolCode, identifier, password, json: 'true' });
    const res = await this.raw('/api/auth/callback/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    await res.text();
    this.label = `${schoolCode}/${identifier}`;
    return [...this.jar.keys()].some((k) => k.includes('session-token'));
  }

  async call<T = any>(method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = {}): Promise<ApiResult<T>> {
    const res = await this.raw(path, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...extraHeaders },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let raw: any = null;
    try {
      raw = await res.json();
    } catch {
      raw = null;
    }
    return { status: res.status, ok: res.ok && raw?.success !== false, data: raw?.data, error: raw?.error, code: raw?.code, raw };
  }

  get = <T = any>(p: string) => this.call<T>('GET', p);
  post = <T = any>(p: string, b?: unknown) => this.call<T>('POST', p, b ?? {});
  put = <T = any>(p: string, b?: unknown) => this.call<T>('PUT', p, b ?? {});
  patch = <T = any>(p: string, b?: unknown) => this.call<T>('PATCH', p, b ?? {});
  del = <T = any>(p: string, b?: unknown) => this.call<T>('DELETE', p, b);
}

export async function as(schoolCode: string, username: string, password = PASSWORD): Promise<Session> {
  const s = new Session();
  const ok = await s.login(schoolCode, username, password);
  if (!ok) throw new Error(`Login failed for ${schoolCode}/${username}`);
  return s;
}
