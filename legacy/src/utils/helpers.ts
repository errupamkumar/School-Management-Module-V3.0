import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(date: Date | string, format: 'short' | 'long' | 'input' = 'short'): string {
  const d = new Date(date);
  if (format === 'input') return d.toISOString().split('T')[0];
  return d.toLocaleDateString('en-IN', format === 'long' ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function generateAdmissionNo(prefix: string = 'ADM'): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${year}${random}`;
}

export function generateReceiptNo(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const r = Math.floor(10000 + Math.random() * 90000);
  return `REC${y}${m}${r}`;
}

export function generateEmployeeId(prefix: string = 'EMP'): string {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${random}`;
}

export function getAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 3 ? `${year}-${(year + 1).toString().slice(-2)}` : `${year - 1}-${year.toString().slice(-2)}`;
}

export function getIndianMonths(): string[] {
  return ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
}

export function getGradeFromPercentage(percentage: number): string {
  if (percentage >= 91) return 'A1';
  if (percentage >= 81) return 'A2';
  if (percentage >= 71) return 'B1';
  if (percentage >= 61) return 'B2';
  if (percentage >= 51) return 'C1';
  if (percentage >= 41) return 'C2';
  if (percentage >= 33) return 'D';
  return 'E (Fail)';
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir', 'Ladakh',
];

export const CLASS_NAMES = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
export const SECTION_NAMES = ['A', 'B', 'C', 'D', 'E'];
export const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
