// Staged load test with exact percentiles and SLO verdicts (autocannon).
//   BASE=http://localhost:3100 PROFILE=local node tests/load/loadtest.mjs out.json   (QA copy: full stages)
//   BASE=https://…vercel.app PROFILE=prod node tests/load/loadtest.mjs out.json      (live: capped, read-only)
// Vercel challenges a single address after a few thousand requests in a burst; keep prod runs short.
import autocannon from 'autocannon';
import { writeFileSync } from 'fs';

const BASE = process.env.BASE || 'http://localhost:3100';
const PROFILE = process.env.PROFILE || 'local';
const OUT = process.argv[2] || 'loadtest.json';
const PASSWORD = 'Demo@12345';
const SLO = { p95: 500, p99: 1500, errorRate: 0.01 };
const rnd = () => `10.${(Math.random() * 255) | 0}.${(Math.random() * 255) | 0}.${(Math.random() * 255) | 0}`;

async function login(school, user) {
  const jar = new Map();
  const keep = (res) => { for (const c of res.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i), kv.slice(i + 1)); } };
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const xff = PROFILE === 'local' ? { 'x-forwarded-for': rnd() } : {};
  const r1 = await fetch(`${BASE}/api/auth/csrf`, { headers: xff }); keep(r1);
  const { csrfToken } = await r1.json();
  const body = new URLSearchParams({ csrfToken, schoolCode: school, identifier: user, password: PASSWORD, json: 'true' });
  const r2 = await fetch(`${BASE}/api/auth/callback/credentials`, { method: 'POST', body, redirect: 'manual', headers: { cookie: cookie(), 'content-type': 'application/x-www-form-urlencoded', ...xff } }); keep(r2);
  if (![...jar.keys()].some((k) => k.includes('session-token'))) throw new Error(`login failed ${school}/${user}`);
  return { cookie: cookie(), csrfToken };
}

function pct(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

async function stage(name, opts) {
  const times = [];
  let bad = 0;
  const codes = {};
  const inst = autocannon({ url: BASE, timeout: 20, ...opts });
  inst.on('response', (_c, status, _b, ms) => {
    times.push(ms);
    codes[status] = (codes[status] || 0) + 1;
    if (status >= 400) bad++;
  });
  const r = await inst;
  times.sort((a, b) => a - b);
  const total = times.length + r.errors + r.timeouts;
  const errorRate = total ? (bad + r.errors + r.timeouts) / total : 0;
  const row = {
    stage: name, connections: opts.connections, seconds: opts.duration, requests: total,
    rps: +(times.length / opts.duration).toFixed(1),
    p50: Math.round(pct(times, 50)), p95: Math.round(pct(times, 95)), p99: Math.round(pct(times, 99)), max: Math.round(times.at(-1) ?? 0),
    errorRate: +(errorRate * 100).toFixed(2), errors: r.errors, timeouts: r.timeouts, codes,
  };
  row.pass = row.p95 <= SLO.p95 && row.p99 <= SLO.p99 && errorRate < SLO.errorRate;
  console.log(`${row.pass ? 'PASS' : 'FAIL'}  ${name.padEnd(34)} c=${String(row.connections).padStart(3)}  ${String(row.rps).padStart(7)} req/s  p50 ${String(row.p50).padStart(5)}  p95 ${String(row.p95).padStart(5)}  p99 ${String(row.p99).padStart(5)} ms  err ${row.errorRate}%  ${JSON.stringify(codes)}`);
  return row;
}

const results = { base: BASE, profile: PROFILE, slo: SLO, startedAt: new Date().toISOString(), stages: [] };
const owner = await login('DEMO', 'owner');
const parent = await login('DEMO', 'parent');
const teacher = await login('DEMO', 'teacher');
const get = (path, s) => ({ method: 'GET', path, headers: s ? { cookie: s.cookie } : {} });
const mixed = [
  get('/', null),
  get('/api/dashboard', owner),
  get('/api/me', teacher),
  get('/api/students?pageSize=20', owner),
  get('/api/dashboard', parent),
  get('/login', null),
  get('/api/notices', teacher),
  get('/api/dashboard', owner),
];
const push = (row) => results.stages.push(row);

if (PROFILE === 'local') {
  push(await stage('smoke · mixed', { connections: 1, duration: 20, requests: mixed }));
  push(await stage('baseline · owner dashboard only', { connections: 10, duration: 30, requests: [get('/api/dashboard', owner)] }));
  push(await stage('baseline · website home (ISR)', { connections: 10, duration: 20, requests: [get('/', null)] }));
  push(await stage('average load · mixed', { connections: 25, duration: 60, requests: mixed }));
  push(await stage('stress · mixed', { connections: 50, duration: 45, requests: mixed }));
  push(await stage('stress · mixed', { connections: 100, duration: 45, requests: mixed }));
  push(await stage('stress · mixed', { connections: 200, duration: 45, requests: mixed }));
  push(await stage('spike · mixed', { connections: 400, duration: 30, requests: mixed }));
  // Sign-in path: unknown users from many addresses (bcrypt + rate-limit writes + audit), never the demo accounts.
  push(await stage('sign-in endpoint (bcrypt)', {
    connections: 20, duration: 30,
    requests: [{
      method: 'POST', path: '/api/auth/callback/credentials',
      setupRequest: (req) => ({
        ...req,
        headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: owner.cookie, 'x-forwarded-for': rnd() },
        body: new URLSearchParams({ csrfToken: owner.csrfToken, schoolCode: 'DEMO', identifier: `load${Math.random().toString(36).slice(2)}`, password: 'Wrong@12345', json: 'true' }).toString(),
      }),
    }],
  }));
  push(await stage('recovery · mixed after spike', { connections: 25, duration: 30, requests: mixed }));
} else {
  push(await stage('prod smoke · mixed', { connections: 1, duration: 20, requests: mixed }));
  push(await stage('prod light load · mixed', { connections: 10, duration: 45, requests: mixed }));
  push(await stage('prod moderate · mixed', { connections: 25, duration: 30, requests: mixed }));
  push(await stage('prod · website home (CDN)', { connections: 25, duration: 20, requests: [get('/', null)] }));
}
results.finishedAt = new Date().toISOString();
writeFileSync(OUT, JSON.stringify(results, null, 1));
console.log(`\nwrote ${OUT}`);
