/**
 * "Start free trial / Book a demo" form on the public website. Shared by the
 * form (client) and /api/public/website/leads (server).
 */
import { z } from 'zod';
import { optionalText, phoneIN, requiredText } from '@/lib/validators';

export const LEAD_ROLES = ['Owner / Director', 'Principal', 'Administrator', 'Accountant', 'Teacher', 'IT / Other'] as const;
export const LEAD_BOARDS = ['CBSE', 'ICSE', 'STATE', 'IB', 'CAMBRIDGE', 'NIOS', 'OTHER'] as const;
export const STUDENT_BANDS = ['Up to 300', '300 – 1,000', '1,000 – 3,000', 'More than 3,000'] as const;
export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'DEMO_DONE', 'CONVERTED', 'CLOSED'] as const;
export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
] as const;

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.literal(''), z.enum(values)])
    .optional()
    .transform((v) => (v ? v : null));

export const leadSchema = z.object({
  interest: z.enum(['trial', 'demo']).default('trial'),
  schoolName: requiredText('School name', 160),
  contactName: requiredText('Your name', 120),
  role: optionalEnum(LEAD_ROLES),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
  phone: phoneIN,
  city: optionalText(80),
  state: optionalText(60),
  board: optionalEnum(LEAD_BOARDS),
  students: optionalEnum(STUDENT_BANDS),
  features: z.array(z.string().trim().max(40)).max(30).default([]),
  message: optionalText(2000),
  consent: z.literal(true, { error: 'Please allow us to contact you about Vidyalaya' }),
  /** Honeypot: hidden from people, filled by bots. */
  website: z.string().max(200).optional(),
  source: optionalText(200),
});

export type LeadInput = z.input<typeof leadSchema>;

export const leadUpdateSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  notes: optionalText(4000),
});
