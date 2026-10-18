/**
 * Exhaustive role × module permission check against a running server.
 *   npx tsx tests/api/rbac-matrix.ts
 *
 * For every demo login it reads the effective permission map from /api/me and
 * verifies the server enforces exactly that map: view (GET), create and edit
 * (write with an empty body, so allowed calls stop at validation and nothing is
 * written). It also flags maps that differ from the product defaults, and checks
 * the platform operator is locked out of every school endpoint.
 */
import { resetLoginRateLimits } from '../reset-rate-limits';
import { as, Session } from './client';
import { MODULES, defaultPerm, type ModuleKey, type Perm, type SchoolRole } from '../../src/lib/modules';

const SCHOOL = process.env.TEST_SCHOOL || 'DEMO';
const USERS: Array<[SchoolRole, string]> = [
  ['SUPER_ADMIN', 'owner'],
  ['ADMIN', 'admin'],
  ['TEACHER', 'teacher'],
  ['ACCOUNTANT', 'accountant'],
  ['RECEPTIONIST', 'reception'],
  ['LIBRARIAN', 'librarian'],
  ['TRANSPORT_MANAGER', 'transport'],
  ['STORE_MANAGER', 'store'],
  ['STAFF', 'staff'],
  ['PARENT', 'parent'],
  ['STUDENT', 'student'],
];

const month = new Date().toISOString().slice(0, 7);
/** One representative endpoint per module and action. */
const VIEW: Record<ModuleKey, string> = {
  dashboard: '/api/dashboard',
  admissions: '/api/admissions',
  students: '/api/students',
  guardians: '/api/guardians',
  employees: '/api/employees',
  academics: '/api/classes',
  attendance: '/api/attendance',
  staff_attendance: `/api/staff-attendance?month=${month}`,
  leave: '/api/leave',
  timetable: '/api/timetable',
  homework: '/api/homework',
  lms: '/api/materials',
  live_classes: '/api/live-classes',
  exams: '/api/exams',
  class_tests: '/api/class-tests',
  question_bank: '/api/question-papers',
  behaviour: '/api/observations',
  fees: '/api/fees/invoices',
  accounts: '/api/accounts/entries',
  payroll: '/api/payroll?mine=1',
  notices: '/api/notices',
  messaging: '/api/messages',
  sms: '/api/sms/log',
  events: '/api/events',
  meetings: '/api/meetings',
  transport: '/api/transport/mine',
  library: '/api/library/issues',
  store: '/api/store/products',
  inventory: '/api/assets',
  hostel: '/api/hostels',
  gate: '/api/gate/visitors',
  online_exams: '/api/online-exams',
  discipline: '/api/discipline',
  placements: '/api/placements',
  polls: '/api/forms',
  discussion: '/api/discussions',
  gallery: '/api/gallery',
  blog: '/api/blog',
  reminders: '/api/reminders',
  alumni: '/api/alumni',
  tasks: '/api/tasks',
  documents: '/api/documents',
  apps: '/api/apps',
  certificates: '/api/certificates/issued',
  reports: '/api/reports/students',
  activities: '/api/activities',
  study_tools: '/api/doubts',
  ai_assistant: '/api/ai-assistant',
  settings: '/api/settings',
  access_control: '/api/access-control',
  audit_logs: '/api/audit-logs',
};
const CREATE: Partial<Record<ModuleKey, [string, string]>> = {
  admissions: ['POST', '/api/admissions'],
  students: ['POST', '/api/students'],
  employees: ['POST', '/api/employees'],
  academics: ['POST', '/api/classes'],
  attendance: ['PUT', '/api/attendance'],
  staff_attendance: ['PUT', '/api/staff-attendance'],
  leave: ['POST', '/api/leave'],
  homework: ['POST', '/api/homework'],
  lms: ['POST', '/api/materials'],
  live_classes: ['POST', '/api/live-classes'],
  exams: ['POST', '/api/exams'],
  class_tests: ['POST', '/api/class-tests'],
  question_bank: ['POST', '/api/question-papers'],
  behaviour: ['POST', '/api/observations'],
  fees: ['POST', '/api/fees/collect'],
  accounts: ['POST', '/api/accounts/entries'],
  payroll: ['POST', '/api/payroll'],
  notices: ['POST', '/api/notices'],
  messaging: ['POST', '/api/messages'],
  sms: ['POST', '/api/sms/send'],
  events: ['POST', '/api/events'],
  meetings: ['POST', '/api/meetings'],
  transport: ['POST', '/api/transport/allocations'],
  library: ['POST', '/api/library/issues'],
  store: ['POST', '/api/store/orders'],
  inventory: ['POST', '/api/assets'],
  hostel: ['POST', '/api/hostel/allocations'],
  gate: ['POST', '/api/gate/visitors'],
  online_exams: ['POST', '/api/online-exams'],
  discipline: ['POST', '/api/discipline'],
  placements: ['POST', '/api/placements'],
  polls: ['POST', '/api/forms'],
  discussion: ['POST', '/api/discussions'],
  gallery: ['POST', '/api/gallery'],
  blog: ['POST', '/api/blog'],
  reminders: ['POST', '/api/reminders'],
  alumni: ['POST', '/api/alumni'],
  tasks: ['POST', '/api/tasks'],
  documents: ['POST', '/api/documents'],
  certificates: ['POST', '/api/certificates/issued'],
  activities: ['POST', '/api/activities'],
  study_tools: ['POST', '/api/doubts'],
  ai_assistant: ['POST', '/api/ai-assistant'],
};
const EDIT: Partial<Record<ModuleKey, [string, string]>> = {
  timetable: ['PUT', '/api/timetable'],
  settings: ['PUT', '/api/settings'],
  access_control: ['PUT', '/api/access-control/permissions'],
  fees: ['PUT', '/api/fees/structures'],
};

const FAMILY = new Set<SchoolRole>(['PARENT', 'STUDENT']);
/** Endpoints whose meaning differs by audience (family portal vs staff screens). */
function probePath(role: SchoolRole, key: ModuleKey, action: string, path: string): string | null {
  if (key === 'transport' && action === 'view' && !FAMILY.has(role)) return '/api/transport/routes';
  if (key === 'hostel' && action === 'view' && FAMILY.has(role)) return '/api/hostel/mine';
  // Students' "create" on clubs means joining one; staff create clubs.
  if (key === 'activities' && action === 'create' && role === 'STUDENT') return '/api/activities/__none__/members';
  // The doubt desk is a student-only feature; other roles' create right is unused there.
  if (key === 'study_tools' && action === 'create' && role !== 'STUDENT') return null;
  // Students' "create" on online exams means taking one, and on placements applying to a drive.
  if (key === 'online_exams' && action === 'create' && role === 'STUDENT') return '/api/online-exams/__none__/attempt';
  if (key === 'placements' && action === 'create' && role === 'STUDENT') return '/api/placements/__none__';
  return path;
}

const failures: string[] = [];
const notes: string[] = [];
let checks = 0;

/** Allowed calls may fail validation (400) or find nothing (404), but never 401/403. */
const passedGate = (status: number) => status !== 401 && status !== 403 && status < 500;

async function ensureStaffLogin(owner: Session) {
  const probe = new Session();
  if (await probe.login(SCHOOL, 'staff')) return;
  const emps = await owner.get('/api/employees?pageSize=200');
  const e = (emps.data as Array<{ id: string; user: unknown; designation: string }>).find((x) => !x.user);
  if (!e) throw new Error('No employee without a login to give the STAFF role');
  const cred = await owner.post(`/api/employees/${e.id}`, { role: 'STAFF', username: 'staff' });
  if (!cred.ok) throw new Error(`Could not create STAFF login: ${cred.error}`);
  const s = new Session();
  await s.login(SCHOOL, 'staff', cred.data.password);
  const pw = await s.post('/api/me/password', { currentPassword: cred.data.password, newPassword: 'Demo@12345' });
  if (!pw.ok) throw new Error(`Could not set STAFF password: ${pw.error}`);
  notes.push(`Created demo login "staff" (role STAFF) for employee ${e.designation} ${e.id}.`);
}

async function checkRole(role: SchoolRole, username: string) {
  const s = await as(SCHOOL, username);
  const me = await s.get('/api/me');
  const perms = me.data.permissions as Record<ModuleKey, Perm>;
  for (const m of MODULES) {
    const key = m.key as ModuleKey;
    const p = perms[key];
    const def = defaultPerm(key, role);
    const effDef = { ...def, view: def.view || def.create || def.edit || def.delete };
    if (p && (p.view !== effDef.view || p.create !== effDef.create || p.edit !== effDef.edit || p.delete !== effDef.delete)) {
      notes.push(`${role} ${key}: effective ${fmt(p)} differs from default ${fmt(effDef)} (override or module off)`);
    }
    const probes: Array<[string, string, string, boolean]> = [['view', 'GET', VIEW[key], !!p?.view]];
    if (CREATE[key]) probes.push(['create', CREATE[key]![0], CREATE[key]![1], !!p?.create]);
    if (EDIT[key]) probes.push(['edit', EDIT[key]![0], EDIT[key]![1], !!p?.edit]);
    for (const [action, method, rawPath, allowed] of probes) {
      const path = probePath(role, key, action, rawPath);
      if (!path) continue;
      const r = await s.call(method, path, method === 'GET' ? undefined : {});
      checks++;
      const ok = allowed ? passedGate(r.status) : r.status === 403;
      if (!ok) failures.push(`${role.padEnd(17)} ${key.padEnd(16)} ${action.padEnd(6)} ${method} ${path} → ${r.status} ${r.code ?? ''} ${r.error ?? ''} (expected ${allowed ? 'allowed' : '403'})`);
    }
  }
}

const fmt = (p: Perm) => (['view', 'create', 'edit', 'delete'] as const).map((a) => (p[a] ? a[0].toUpperCase() : '-')).join('');

(async () => {
  await resetLoginRateLimits();
  const owner = await as(SCHOOL, 'owner');
  await ensureStaffLogin(owner);
  for (const [role, username] of USERS) {
    await checkRole(role, username);
    await resetLoginRateLimits();
  }

  // Platform operator must not reach any school endpoint.
  const platform = await as('', 'platform');
  for (const path of Object.values(VIEW)) {
    const r = await platform.get(path);
    checks++;
    if (r.status !== 403) failures.push(`PLATFORM_ADMIN GET ${path} → ${r.status} (expected 403)`);
  }

  // Signed-out callers get 401 everywhere.
  const anon = new Session();
  for (const path of Object.values(VIEW)) {
    const r = await anon.get(path);
    checks++;
    if (r.status !== 401) failures.push(`ANONYMOUS GET ${path} → ${r.status} (expected 401)`);
  }

  if (notes.length) console.log('Notes:\n  ' + notes.join('\n  '));
  console.log(`\n${checks - failures.length}/${checks} permission checks passed`);
  if (failures.length) {
    console.log('\nFailures:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
