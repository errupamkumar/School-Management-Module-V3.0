import { z } from 'zod';
import { aadhaar, ifsc, optionalPhoneIN, optionalText, pan } from '@/lib/validators';

const opt = <T extends z.ZodTypeAny>(s: T) => s.optional().nullable().or(z.literal('').transform(() => null));

export const employeeSchema = z.object({
  campusId: z.string().min(1).optional(),
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: optionalText(60),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { error: 'Gender is required' }),
  dob: opt(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  phone: optionalPhoneIN,
  email: opt(z.email('Enter a valid email')),
  designation: z.string().trim().min(1, 'Designation is required').max(60),
  department: optionalText(60),
  isTeaching: z.boolean().optional(),
  qualification: optionalText(120),
  experienceYears: z.coerce.number().int().min(0).max(60).optional().nullable(),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Joining date is required'),
  fatherSpouseName: optionalText(80),
  aadhaar: opt(aadhaar),
  panNo: opt(pan),
  bankName: optionalText(80),
  bankAccount: opt(z.string().trim().regex(/^\d{6,20}$/, 'Account number must be 6–20 digits')),
  ifsc: opt(ifsc),
  uan: opt(z.string().trim().regex(/^\d{12}$/, 'UAN must be 12 digits')),
  address: optionalText(300),
  bloodGroup: optionalText(4),
  religion: optionalText(30),
  basicSalary: z.coerce.number().min(0).max(10_000_000).default(0),
  allowances: z.coerce.number().min(0).max(10_000_000).default(0),
  deductions: z.coerce.number().min(0).max(10_000_000).default(0),
  photoUrl: z.string().max(400_000).optional().nullable(),
});
