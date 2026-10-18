import { describe, expect, it } from 'vitest';
import { LANGS, NAV_LABEL_KEYS, groupLabel, isLang, navLabel, translate, type TKey } from '@/lib/i18n';
import { NAV } from '@/lib/navigation';
import { MODULE_MAP, defaultPerm, grantCeiling } from '@/lib/modules';
import { settingsSchema } from '@/server/settings';
import { distanceM, etaMinutes, validFix } from '@/server/services/tracking';
import { mastersXml, vouchersXml } from '@/server/services/tally';

describe('interface languages', () => {
  it('offers 12 languages with unique codes', () => {
    expect(LANGS).toHaveLength(12);
    expect(new Set(LANGS.map((l) => l.code)).size).toBe(12);
  });

  it('translates every shell string into every language', () => {
    const keys: TKey[] = ['search', 'signOut', 'notifications', 'save', 'cancel', 'noAccess', 'backToDashboard', 'installApp', 'language', 'goodMorning'];
    for (const l of LANGS) for (const k of keys) {
      const v = translate(l.code, k);
      expect(v, `${l.code}.${k}`).toBeTruthy();
      if (l.code !== 'en') expect(v, `${l.code}.${k} untranslated`).not.toBe(translate('en', k));
    }
  });

  it('translates every navigation label and group', () => {
    const labels = [...new Set(NAV.map((n) => n.label))];
    for (const label of labels) expect(NAV_LABEL_KEYS, `missing nav translation: ${label}`).toContain(label);
    for (const l of LANGS.filter((x) => x.code !== 'en')) {
      for (const label of labels) expect(navLabel(l.code, label), `${l.code}: ${label}`).not.toBe('');
      expect(groupLabel(l.code, 'Administration')).not.toBe('Administration');
    }
  });

  it('rejects unknown language codes', () => {
    expect(isLang('ta')).toBe(true);
    expect(isLang('xx')).toBe(false);
    expect(isLang(undefined)).toBe(false);
  });
});

describe('new settings default safely', () => {
  const s = settingsSchema.parse({});
  it('keeps live tracking off until a school turns it on', () => {
    expect(s.liveTracking.enabled).toBe(false);
    expect(s.liveTracking.approachAlertMeters).toBe(800);
  });
  it('defaults languages to English and Hindi, push on, OSM tiles', () => {
    expect(s.languages).toEqual({ enabled: ['en', 'hi'], default: 'en' });
    expect(s.notifications.pushEnabled).toBe(true);
    expect(s.maps.tileUrl).toContain('{z}');
  });
  it('accepts old stored settings without the new sections', () => {
    const old = settingsSchema.parse({ workingDays: [1, 2, 3, 4, 5] });
    expect(old.tally.cashLedger).toBe('Cash');
  });
});

describe('hostel module permissions', () => {
  it('exists with family view-only defaults', () => {
    expect(MODULE_MAP.hostel).toBeDefined();
    expect(defaultPerm('hostel', 'PARENT')).toEqual({ view: true, create: false, edit: false, delete: false });
    expect(defaultPerm('hostel', 'ADMIN')).toEqual({ view: true, create: true, edit: true, delete: true });
  });
  it('can be granted to staff (e.g. a warden) but never widened for families', () => {
    expect(grantCeiling('hostel', 'STAFF').edit).toBe(true);
    expect(grantCeiling('hostel', 'STUDENT').edit).toBe(false);
  });
});

describe('live tracking maths', () => {
  it('measures distance between Patna landmarks within 1%', () => {
    // Patna Junction → Gandhi Maidan is ~2.3 km as the crow flies.
    const d = distanceM({ lat: 25.6029, lng: 85.1376 }, { lat: 25.6195, lng: 85.1453 });
    expect(d).toBeGreaterThan(1900);
    expect(d).toBeLessThan(2100);
  });
  it('estimates ETA from speed, falling back to city speed when stopped', () => {
    expect(etaMinutes(2000, 30)).toBe(5); // 2 km × 1.3 at 30 km/h ≈ 5.2 min
    expect(etaMinutes(2000, 0)).toBe(8); // 20 km/h fallback
    expect(etaMinutes(50, 40)).toBe(1); // never below a minute
  });
  it('rejects impossible or null-island fixes', () => {
    expect(validFix({ lat: 25.6, lng: 85.1 })).toBe(true);
    expect(validFix({ lat: 0, lng: 0 })).toBe(false);
    expect(validFix({ lat: 95, lng: 85 })).toBe(false);
    expect(validFix({ lat: Number.NaN, lng: 85 })).toBe(false);
  });
});

describe('Tally export', () => {
  const settings = settingsSchema.parse({ tally: { companyName: 'Vidyalaya & Co', cashLedger: 'Cash', bankLedger: 'HDFC Current A/c', ledgerMap: { 'Fee Collection': 'Tuition Fees Received' } } });
  const xml = vouchersXml(settings, [
    { id: 'a1', date: new Date('2026-10-16T00:00:00Z'), type: 'INCOME', amount: 1500, headName: 'Fee Collection', description: 'Fee <Oct> receipt', mode: 'UPI', referenceNo: 'RCPT00012', party: 'Kabir & family' },
    { id: 'b2', date: new Date('2026-10-17T00:00:00Z'), type: 'EXPENSE', amount: 820.5, headName: 'Diesel', description: 'Bus diesel', mode: 'CASH', referenceNo: null, party: null },
  ]);
  it('creates a Receipt for income and a Payment for expense', () => {
    expect(xml).toContain('VCHTYPE="Receipt"');
    expect(xml).toContain('VCHTYPE="Payment"');
    expect(xml).toContain('<DATE>20261016</DATE>');
  });
  it('balances each voucher (debit negative, credit positive)', () => {
    expect(xml).toContain('<AMOUNT>-1500.00</AMOUNT>');
    expect(xml).toContain('<AMOUNT>1500.00</AMOUNT>');
    expect(xml).toContain('<AMOUNT>-820.50</AMOUNT>');
    expect(xml).toContain('<AMOUNT>820.50</AMOUNT>');
  });
  it('routes by payment mode and uses mapped ledger names', () => {
    expect(xml).toContain('<LEDGERNAME>HDFC Current A/c</LEDGERNAME>');
    expect(xml).toContain('<LEDGERNAME>Tuition Fees Received</LEDGERNAME>');
    expect(xml).toContain('<LEDGERNAME>Cash</LEDGERNAME>');
  });
  it('escapes XML special characters', () => {
    expect(xml).toContain('Fee &lt;Oct&gt; receipt');
    expect(xml).toContain('Kabir &amp; family');
    expect(xml).toContain('<SVCURRENTCOMPANY>Vidyalaya &amp; Co</SVCURRENTCOMPANY>');
    expect(xml).not.toMatch(/<Oct>/);
  });
  it('emits ledger masters under standard Tally groups', () => {
    const m = mastersXml(settings, [{ name: 'Fee Collection', type: 'INCOME' }, { name: 'Diesel', type: 'EXPENSE' }]);
    expect(m).toContain('<PARENT>Cash-in-Hand</PARENT>');
    expect(m).toContain('<PARENT>Bank Accounts</PARENT>');
    expect(m).toContain('NAME="Tuition Fees Received"');
    expect(m).toContain('<PARENT>Indirect Expenses</PARENT>');
  });
});
