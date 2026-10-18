import { describe, expect, it } from 'vitest';
import { amountInWords, fromPaise, percentOf, toPaise } from '@/server/services/money';

describe('paise arithmetic', () => {
  it('avoids floating point drift', () => {
    expect(toPaise(0.1) + toPaise(0.2)).toBe(toPaise(0.3));
    expect(toPaise('1234.565')).toBe(123457);
    expect(toPaise(null)).toBe(0);
  });
  it('round-trips through Decimal with two places', () => {
    expect(fromPaise(123456).toString()).toBe('1234.56');
    expect(toPaise(fromPaise(99))).toBe(99);
  });
  it('rounds percentages to the nearest paisa', () => {
    expect(percentOf(100_00, 12.5)).toBe(12_50);
    expect(percentOf(333, 10)).toBe(33);
  });
});

describe('amountInWords (Indian system)', () => {
  it.each([
    [0, 'Zero Rupees Only'],
    [15, 'Fifteen Rupees Only'],
    [1_05_000, 'One Lakh Five Thousand Rupees Only'],
    [2_50_00_000, 'Two Crore Fifty Lakh Rupees Only'],
    [999.5, 'Nine Hundred Ninety Nine Rupees and Fifty Paise Only'],
  ])('%d → %s', (n, words) => {
    expect(amountInWords(n)).toBe(words);
  });
});
