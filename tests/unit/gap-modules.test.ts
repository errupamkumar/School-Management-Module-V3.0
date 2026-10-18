import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { audienceIncludes } from '@/server/services/audience';
import { tally, validateAnswers, type FormField } from '@/server/services/forms';
import { attemptDeadline, gradeAttempt, isCorrect, mcqCorrectIndex, shuffled, type ExamQuestion } from '@/server/services/online-exams';
import { nextRun } from '@/server/services/reminders';
import { weightedGradebook } from '@/server/services/gradebook';
import { DEFAULT_GRADES } from '@/server/services/exams';
import { plainExcerpt, safeHref } from '@/lib/markdown';
import { embedUrl, googleAppName } from '@/lib/embed';
import { csvCell, paybooksAttendanceCsv, quickbooksIif, quickbooksJournalCsv, toCsv } from '@/server/services/exporters';
import { bbbApiBase, bbbChecksum, bbbSignedUrl } from '@/server/services/bbb';
import { emailDomainAllowed, providerFromId, ssoPolicy } from '@/server/sso';
import { parseAmount, parseMode, parseSheetDate } from '@/server/services/imports';
import { slugify } from '@/server/services/blog';
import { settingsSchema } from '@/server/settings';
import { MODULE_MAP, defaultPerm, grantCeiling } from '@/lib/modules';
import { NAV } from '@/lib/navigation';
import { periodLabel } from '@/lib/utils';

describe('audiences', () => {
  const aud = { roles: ['PARENT', 'TEACHER'] as never[], classIds: ['c5'] };
  it('admins and owners always see everything', () => {
    expect(audienceIncludes(aud, 'ADMIN', [])).toBe(true);
    expect(audienceIncludes(aud, 'SUPER_ADMIN', [])).toBe(true);
  });
  it('staff roles match by role only', () => {
    expect(audienceIncludes(aud, 'TEACHER', [])).toBe(true);
    expect(audienceIncludes(aud, 'ACCOUNTANT', [])).toBe(false);
  });
  it('families must also be in one of the classes', () => {
    expect(audienceIncludes(aud, 'PARENT', ['c5', 'c7'])).toBe(true);
    expect(audienceIncludes(aud, 'PARENT', ['c7'])).toBe(false);
    expect(audienceIncludes(aud, 'STUDENT', ['c5'])).toBe(false);
    expect(audienceIncludes({ roles: ['STUDENT'] as never[], classIds: [] }, 'STUDENT', ['c9'])).toBe(true);
  });
});

describe('form builder', () => {
  const fields: FormField[] = [
    { id: 'slot', label: 'PTM slot', type: 'SINGLE', required: true, options: ['Sat 10am', 'Sat 12pm'] },
    { id: 'help', label: 'Can help with', type: 'MULTI', required: false, options: ['Decor', 'Food', 'Music'] },
    { id: 'rate', label: 'Rating', type: 'RATING', required: false, options: [] },
    { id: 'note', label: 'Note', type: 'TEXT', required: false, options: [] },
  ];
  it('accepts valid answers and cleans them', () => {
    const r = validateAnswers(fields, { slot: 'Sat 10am', help: ['Food', 'Food'], rate: '4', note: '  hi  ' });
    expect(r).toEqual({ ok: true, answers: { slot: 'Sat 10am', help: ['Food'], rate: 4, note: 'hi' } });
  });
  it('rejects missing required, unknown options and bad ratings', () => {
    expect(validateAnswers(fields, {}).ok).toBe(false);
    expect(validateAnswers(fields, { slot: 'Sun' }).ok).toBe(false);
    expect(validateAnswers(fields, { slot: 'Sat 10am', help: ['Dance'] }).ok).toBe(false);
    expect(validateAnswers(fields, { slot: 'Sat 10am', rate: 6 }).ok).toBe(false);
  });
  it('tallies choices and hides names unless allowed', () => {
    const res = tally(fields, [{ answers: { slot: 'Sat 10am', rate: 5, note: 'x' }, userName: 'A' }, { answers: { slot: 'Sat 12pm', rate: 3 }, userName: 'B' }, { answers: { slot: 'Sat 10am' }, userName: 'C' }], { withText: true, names: false });
    expect(res[0].counts).toEqual([{ option: 'Sat 10am', count: 2 }, { option: 'Sat 12pm', count: 1 }]);
    expect(res[2].average).toBe(4);
    expect(res[3].texts).toEqual([{ value: 'x' }]);
    expect(tally(fields, [{ answers: { note: 'y' }, userName: 'A' }], { withText: false, names: false })[3].texts).toBeUndefined();
  });
});

describe('online exam marking', () => {
  const qs: ExamQuestion[] = [
    { id: 'q1', type: 'MCQ', text: 'sin 30°', options: ['1/2', '√3/2', '1', '0'], answer: '1/2', marks: 2 },
    { id: 'q2', type: 'TRUE_FALSE', text: 'Earth is flat', options: [], answer: 'False', marks: 1 },
    { id: 'q3', type: 'FILL_BLANK', text: 'Capital of India', options: [], answer: 'New Delhi|Delhi', marks: 1 },
    { id: 'q4', type: 'LONG', text: 'Explain', options: [], answer: 'scheme', marks: 5 },
  ];
  it('finds the MCQ key by text, letter or number', () => {
    expect(mcqCorrectIndex(qs[0].options, '1/2')).toBe(0);
    expect(mcqCorrectIndex(qs[0].options, 'B')).toBe(1);
    expect(mcqCorrectIndex(qs[0].options, '(c)')).toBe(2);
    expect(mcqCorrectIndex(qs[0].options, '4')).toBe(3);
    expect(mcqCorrectIndex(qs[0].options, 'Z')).toBeNull();
  });
  it('marks objective answers, case-insensitively for blanks', () => {
    expect(isCorrect(qs[0], '0')).toBe(true);
    expect(isCorrect(qs[1], 'false')).toBe(true);
    expect(isCorrect(qs[2], ' delhi ')).toBe(true);
    expect(isCorrect(qs[3], 'anything')).toBeNull();
  });
  it('applies negative marks to wrong (not blank) answers and never goes below zero', () => {
    const g = gradeAttempt(qs, { q1: '1', q2: 'False', q3: '', q4: 'my essay' }, 0.5);
    expect(g.autoScore).toBe(0.5); // -0.5 + 1 + 0
    expect(g.needsManual).toBe(true);
    expect(gradeAttempt(qs, { q1: '1', q2: 'True' }, 2).autoScore).toBe(0);
    expect(gradeAttempt(qs, { q1: '0', q2: 'False', q3: 'New Delhi' }).needsManual).toBe(false);
  });
  it('ends an attempt at its duration or the window end, whichever is first', () => {
    const start = new Date('2026-10-20T10:00:00Z');
    expect(attemptDeadline(start, 30, new Date('2026-10-20T12:00:00Z')).toISOString()).toBe('2026-10-20T10:30:00.000Z');
    expect(attemptDeadline(start, 30, new Date('2026-10-20T10:10:00Z')).toISOString()).toBe('2026-10-20T10:10:00.000Z');
  });
  it('shuffles without losing questions', () => {
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const out = shuffled(['a', 'b', 'c', 'd', 'e'], rand);
    expect([...out].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

describe('reminders', () => {
  const at = new Date('2026-01-31T03:30:00Z');
  it('one-off reminders do not repeat', () => expect(nextRun(at, 'NONE', new Date('2026-02-01'))).toBeNull());
  it('daily and weekly reminders move past now', () => {
    expect(nextRun(at, 'DAILY', new Date('2026-02-02T00:00:00Z'))!.toISOString()).toBe('2026-02-02T03:30:00.000Z');
    expect(nextRun(at, 'WEEKLY', new Date('2026-02-01T00:00:00Z'))!.toISOString()).toBe('2026-02-07T03:30:00.000Z');
  });
  it('monthly reminders keep the day, clamped to short months', () => {
    expect(nextRun(at, 'MONTHLY', new Date('2026-02-01T00:00:00Z'))!.toISOString()).toBe('2026-02-28T03:30:00.000Z');
  });
});

describe('gradebook', () => {
  const subj = [{ id: 'm', name: 'Maths', maxMarks: 100 }];
  const slice = (examId: string, weight: number, marks: number | null, isAbsent = false) => ({
    examId,
    weight,
    subjects: subj,
    results: [{ studentId: 's1', name: 'Asha', rollNo: '1', admissionNo: 'A1', percentage: marks ?? 0, subjects: [{ subjectId: 'm', maxMarks: 100, marks, isAbsent }] }],
  });
  it('weights exams and grades the result', () => {
    const b = weightedGradebook([slice('pt', 20, 50), slice('ann', 80, 100)], DEFAULT_GRADES);
    expect(b.rows[0].subjects.m.percent).toBe(90);
    expect(b.rows[0].overall).toBe(90);
    expect(b.rows[0].grade).toBe('A2');
    expect(b.rows[0].rank).toBe(1);
  });
  it('leaves out missing marks but counts absence as zero', () => {
    expect(weightedGradebook([slice('pt', 20, null), slice('ann', 80, 75)], DEFAULT_GRADES).rows[0].subjects.m.percent).toBe(75);
    expect(weightedGradebook([slice('pt', 50, null, true), slice('ann', 50, 80)], DEFAULT_GRADES).rows[0].subjects.m.percent).toBe(40);
  });
});

describe('safe markdown, embeds and slugs', () => {
  it('only links http(s)', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('https://school.in/x')).toBe('https://school.in/x');
  });
  it('makes plain excerpts', () => expect(plainExcerpt('# Hi\n\n**Bold** [link](https://a.b)')).toBe('Hi Bold link'));
  it('embeds Google Docs, Drive and YouTube only', () => {
    expect(embedUrl('https://docs.google.com/document/d/abc_123/edit')?.src).toBe('https://docs.google.com/document/d/abc_123/preview');
    expect(embedUrl('https://docs.google.com/presentation/d/xyz/edit')?.src).toBe('https://docs.google.com/presentation/d/xyz/embed');
    expect(embedUrl('https://drive.google.com/file/d/F1/view')?.src).toBe('https://drive.google.com/file/d/F1/preview');
    expect(embedUrl('https://youtu.be/dQw4w9WgXcQ')?.src).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(embedUrl('http://docs.google.com/document/d/abc')).toBeNull();
    expect(embedUrl('https://evil.example/doc')).toBeNull();
    expect(googleAppName('https://docs.google.com/spreadsheets/d/1')).toBe('Google Sheets');
  });
  it('slugifies titles', () => {
    expect(slugify('Annual Day 2026: A Grand Show!')).toBe('annual-day-2026-a-grand-show');
    expect(slugify('वार्षिक उत्सव')).toBe('post');
  });
});

describe('exports for QuickBooks and Paybooks', () => {
  const settings = settingsSchema.parse({});
  const lines = [
    { id: '1', date: new Date('2026-04-05T00:00:00Z'), type: 'INCOME' as const, amount: 1500, headName: 'Fee Collection', description: 'Fee receipt RCPT1', mode: 'CASH', referenceNo: 'RCPT1', party: 'Aarav' },
    { id: '2', date: new Date('2026-04-06T00:00:00Z'), type: 'EXPENSE' as const, amount: 800, headName: 'Electricity', description: 'Bill\tApril', mode: 'UPI', referenceNo: null, party: '=HYPERLINK("x")' },
  ];
  it('neutralises spreadsheet formulas and quotes properly', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('-50')).toBe('-50');
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(toCsv([{ a: 1 }])).toBe('a\r\n1\r\n');
  });
  it('QuickBooks journal CSV balances debits and credits', () => {
    const rows = quickbooksJournalCsv(settings, lines).trim().split('\r\n').slice(1);
    expect(rows).toHaveLength(4);
    const nums = (i: number) => rows.map((r) => Number(r.split(',')[i] || 0)).reduce((a, b) => a + b, 0);
    expect(nums(3)).toBe(nums(4));
    expect(rows[0]).toContain('05/04/2026');
  });
  it('QuickBooks IIF pairs a debit with an equal credit and strips tabs from text', () => {
    const iif = quickbooksIif(settings, lines);
    expect(iif.match(/^TRNS\t/gm)).toHaveLength(2);
    expect(iif).toContain('\t1500.00\t');
    expect(iif).toContain('\t-1500.00\t');
    expect(iif).toContain('Bill April');
  });
  it('Paybooks attendance counts half days as half loss of pay', () => {
    const csv = paybooksAttendanceCsv('2026-04', 30, [{ employeeCode: 'EMP1', name: 'Ravi', present: 24, halfDays: 2, leave: 1, absent: 1, holidays: 2 }]);
    expect(csv).toContain('EMP1,Ravi,2026-04,30,25,1,2,2,28');
  });
});

describe('BigBlueButton signing', () => {
  it('normalises the server URL to the API base', () => {
    expect(bbbApiBase('https://bbb.school.in')).toBe('https://bbb.school.in/bigbluebutton/api/');
    expect(bbbApiBase('https://bbb.school.in/bigbluebutton/')).toBe('https://bbb.school.in/bigbluebutton/api/');
    expect(bbbApiBase('https://bbb.school.in/bigbluebutton/api')).toBe('https://bbb.school.in/bigbluebutton/api/');
  });
  it('signs call name + query + secret with SHA-1', () => {
    expect(bbbChecksum('create', 'name=Test', 's3cret')).toBe(crypto.createHash('sha1').update('createname=Tests3cret').digest('hex'));
    const url = bbbSignedUrl('https://bbb.school.in', 's3cret', 'join', { fullName: 'Asha K', meetingID: 'm1' });
    expect(url).toBe(`https://bbb.school.in/bigbluebutton/api/join?fullName=Asha+K&meetingID=m1&checksum=${bbbChecksum('join', 'fullName=Asha+K&meetingID=m1', 's3cret')}`);
  });
});

describe('single sign-on policy', () => {
  const s = { sso: { google: true, microsoft: false, allowedDomains: ['school.edu.in'] } };
  it('maps NextAuth provider ids', () => {
    expect(providerFromId('google')).toBe('google');
    expect(providerFromId('azure-ad')).toBe('microsoft');
    expect(providerFromId('credentials')).toBeNull();
  });
  it('requires the provider to be on, a verified email and an allowed domain', () => {
    expect(ssoPolicy(s, 'microsoft', 'a@school.edu.in', true)).toBe('SSO_SCHOOL');
    expect(ssoPolicy(s, 'google', 'a@school.edu.in', false)).toBe('SSO_EMAIL');
    expect(ssoPolicy(s, 'google', 'a@gmail.com', true)).toBe('SSO_DOMAIN');
    expect(ssoPolicy(s, 'google', 'A@School.edu.in', true)).toBeNull();
    expect(emailDomainAllowed('x@any.com', [])).toBe(true);
  });
});

describe('spreadsheet imports', () => {
  it('reads Indian and ISO dates and rejects impossible ones', () => {
    expect(parseSheetDate('05/04/2026')).toBe('2026-04-05');
    expect(parseSheetDate('2026-4-5')).toBe('2026-04-05');
    expect(parseSheetDate('31/02/2026')).toBeNull();
    expect(parseSheetDate('April 5')).toBeNull();
  });
  it('reads amounts and payment modes', () => {
    expect(parseAmount('₹ 12,500.50')).toBe(12500.5);
    expect(parseAmount('-5')).toBeNull();
    expect(parseMode('NEFT')).toBe('BANK_TRANSFER');
    expect(parseMode('upi')).toBe('UPI');
    expect(parseMode('bitcoin')).toBeNull();
  });
});

describe('new modules and settings', () => {
  const keys = ['gate', 'online_exams', 'discipline', 'placements', 'polls', 'discussion', 'gallery', 'blog', 'reminders', 'alumni', 'tasks', 'documents', 'apps'] as const;
  it('every new module is registered with a nav entry', () => {
    for (const k of keys) {
      expect(MODULE_MAP[k], k).toBeTruthy();
      expect(NAV.some((n) => n.module === k), `nav for ${k}`).toBe(true);
    }
  });
  it('families never get more than their defaults', () => {
    expect(grantCeiling('online_exams', 'STUDENT')).toEqual(defaultPerm('online_exams', 'STUDENT'));
    expect(defaultPerm('alumni', 'PARENT').view).toBe(false);
    expect(defaultPerm('tasks', 'STUDENT').view).toBe(false);
  });
  it('settings default safely for old schools', () => {
    const s = settingsSchema.parse({});
    expect(s.fees.allowAdvance).toBe(true);
    expect(s.sso).toEqual({ google: false, microsoft: false, allowedDomains: [] });
    expect(s.apps).toEqual([]);
    expect(s.messaging.emailProvider).toBe('NONE');
    expect(s.remarkBank.length).toBeGreaterThan(0);
  });
  it('labels one-off invoices by their title', () => {
    expect(periodLabel('2026-10')).toBe('Oct 2026');
    expect(periodLabel('X-abc', 'Science trip')).toBe('Science trip');
    expect(periodLabel('X-abc')).toBe('One-off fee');
  });
});
