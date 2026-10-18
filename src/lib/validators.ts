/**
 * Indian-format validators shared by client forms and server schemas.
 */
import { z } from 'zod';

// Verhoeff tables for Aadhaar checksum validation.
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function isValidAadhaar(value: string): boolean {
  const digits = value.replace(/\s/g, '');
  if (!/^[2-9]\d{11}$/.test(digits)) return false;
  let c = 0;
  digits
    .split('')
    .reverse()
    .forEach((ch, i) => {
      c = D[c][P[i % 8][Number(ch)]];
    });
  return c === 0;
}

export const phoneIN = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, '').replace(/^(\+91|0)/, ''))
  .refine((v) => /^[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number');

export const optionalPhoneIN = z
  .union([z.literal(''), phoneIN])
  .optional()
  .transform((v) => (v ? v : undefined));

export const pincode = z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code');
export const pan = z.string().trim().toUpperCase().regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'Enter a valid PAN (e.g. ABCDE1234F)');
export const ifsc = z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code');
export const aadhaar = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s/g, ''))
  .refine(isValidAadhaar, 'Enter a valid 12-digit Aadhaar number');

export const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const requiredText = (label: string, max = 120) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');

export const money = z.coerce
  .number({ error: 'Enter an amount' })
  .min(0, 'Amount cannot be negative')
  .max(99_999_999, 'Amount is too large')
  .transform((v) => Math.round(v * 100) / 100);

export const positiveMoney = money.refine((v) => v > 0, 'Amount must be greater than zero');

export const id = z.string().trim().min(1).max(40);

export const passwordPolicy = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Use at most 72 characters')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Use letters and numbers');
