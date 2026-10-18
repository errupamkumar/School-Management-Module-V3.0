import { describe, expect, it } from 'vitest';
import { FULL_PERM, MODULES, ROLES, defaultPerm, grantCeiling, hasPerm, type ModuleKey } from '@/lib/modules';
import { isValidAadhaar, passwordPolicy, phoneIN, ifsc, pan } from '@/lib/validators';
import { DEFAULT_GRADES, gradeFor } from '@/server/services/exams';
import { readOnlyReason } from '@/server/subscription';

describe('permission ceilings (Roles & Permissions)', () => {
  it('never lets family roles exceed their defaults', () => {
    for (const role of ['PARENT', 'STUDENT'] as const) {
      for (const m of MODULES) {
        const ceil = grantCeiling(m.key as ModuleKey, role);
        const def = defaultPerm(m.key as ModuleKey, role);
        expect(ceil).toEqual(def);
      }
    }
  });
  it('reserves Roles & Permissions for admins', () => {
    for (const role of ROLES) {
      const ceil = grantCeiling('access_control', role);
      expect(ceil.view).toBe(role === 'ADMIN' || role === 'SUPER_ADMIN');
    }
  });
  it('gives the owner every right by default', () => {
    for (const m of MODULES) expect(defaultPerm(m.key as ModuleKey, 'SUPER_ADMIN')).toEqual(FULL_PERM);
  });
  it('checks individual actions', () => {
    expect(hasPerm({ fees: { view: true, create: false, edit: false, delete: false } }, 'fees', 'view')).toBe(true);
    expect(hasPerm({ fees: { view: true, create: false, edit: false, delete: false } }, 'fees', 'create')).toBe(false);
    expect(hasPerm({}, 'fees')).toBe(false);
  });
});

describe('subscription read-only mode', () => {
  const now = new Date('2026-10-17T10:00:00Z');
  it('locks an expired trial', () => {
    expect(readOnlyReason({ status: 'TRIAL', trialEndsAt: new Date('2026-10-01'), subscriptionEndsAt: null }, now)).toMatch(/trial ended/);
  });
  it('allows a running trial', () => {
    expect(readOnlyReason({ status: 'TRIAL', trialEndsAt: new Date('2026-10-30'), subscriptionEndsAt: null }, now)).toBeNull();
  });
  it('gives paid schools a 7-day grace period', () => {
    expect(readOnlyReason({ status: 'ACTIVE', trialEndsAt: null, subscriptionEndsAt: new Date('2026-10-12') }, now)).toBeNull();
    expect(readOnlyReason({ status: 'ACTIVE', trialEndsAt: null, subscriptionEndsAt: new Date('2026-10-05') }, now)).toMatch(/expired/);
  });
  it('treats an open-ended subscription as active', () => {
    expect(readOnlyReason({ status: 'ACTIVE', trialEndsAt: null, subscriptionEndsAt: null }, now)).toBeNull();
  });
});

describe('Indian identifiers', () => {
  it('validates Aadhaar with the Verhoeff checksum', () => {
    expect(isValidAadhaar('2341 2341 2346')).toBe(true);
    expect(isValidAadhaar('2341 2341 2347')).toBe(false);
    expect(isValidAadhaar('1234 5678 9012')).toBe(false); // cannot start with 0/1
  });
  it('validates mobile, PAN and IFSC', () => {
    expect(phoneIN.safeParse('9876543210').success).toBe(true);
    expect(phoneIN.safeParse('5876543210').success).toBe(false);
    expect(pan.safeParse('abcde1234f').success).toBe(true);
    expect(ifsc.safeParse('SBIN0000152').success).toBe(true);
    expect(ifsc.safeParse('SBIN1000152').success).toBe(false);
  });
  it('enforces the password policy', () => {
    expect(passwordPolicy.safeParse('short1').success).toBe(false);
    expect(passwordPolicy.safeParse('lettersonly').success).toBe(false);
    expect(passwordPolicy.safeParse('Shiksha2026').success).toBe(true);
  });
});

describe('CBSE grade scale', () => {
  it.each([
    [100, 'A1'],
    [91, 'A1'],
    [90.99, 'A2'],
    [33, 'D'],
    [32.99, 'E'],
    [0, 'E'],
  ])('%d%% → %s', (p, g) => {
    expect(gradeFor(p, DEFAULT_GRADES)?.grade).toBe(g);
  });
});
