import { Prisma } from '@prisma/client';

/**
 * All fee/salary arithmetic is done in integer paise to avoid floating point
 * drift, then converted back to Decimal for storage.
 */
export type Paise = number;

export function toPaise(value: Prisma.Decimal | number | string | null | undefined): Paise {
  if (value === null || value === undefined) return 0;
  const n = Prisma.Decimal.isDecimal(value) ? (value as Prisma.Decimal).toNumber() : Number(value);
  return Math.round(n * 100);
}

export function fromPaise(p: Paise): Prisma.Decimal {
  return new Prisma.Decimal((p / 100).toFixed(2));
}

export function rupees(p: Paise): number {
  return Math.round(p) / 100;
}

export function percentOf(amount: Paise, percent: number): Paise {
  return Math.round((amount * percent) / 100);
}

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
export function formatINR(p: Paise): string {
  return INR.format(p / 100);
}

/** Indian-system amount in words (lakh/crore) for receipts and payslips. */
export function amountInWords(rupeesAmount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (n: number) => (n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ' ' + ones[n % 10] : ''}`);
  const three = (n: number) => (n >= 100 ? `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ' ' + two(n % 100) : ''}` : two(n));

  const whole = Math.floor(rupeesAmount);
  const paise = Math.round((rupeesAmount - whole) * 100);
  if (whole === 0 && paise === 0) return 'Zero Rupees Only';

  const parts: string[] = [];
  const crore = Math.floor(whole / 1_00_00_000);
  const lakh = Math.floor((whole % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((whole % 1_00_000) / 1000);
  const rest = whole % 1000;
  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (rest) parts.push(three(rest));

  let words = parts.length ? `${parts.join(' ')} Rupees` : '';
  if (paise) words += `${words ? ' and ' : ''}${two(paise)} Paise`;
  return `${words} Only`;
}
