import { z } from 'zod';
import { aadhaar, optionalPhoneIN, optionalText, phoneIN, pincode } from '@/lib/validators';

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null));

export const studentInputSchema = z.object({
  campusId: z.string().min(1).optional(),
  classId: z.string().min(1, 'Class is required'),
  sectionId: z.string().min(1, 'Section is required'),
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: optionalText(60),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { error: 'Gender is required' }),
  dob: optionalDate,
  admissionDate: optionalDate,
  admissionNo: optionalText(30),
  rollNo: optionalText(10),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional().nullable().or(z.literal('').transform(() => null)),
  religion: optionalText(30),
  caste: optionalText(40),
  category: z.enum(['GENERAL', 'OBC', 'SC', 'ST', 'EWS']).optional().nullable().or(z.literal('').transform(() => null)),
  motherTongue: optionalText(30),
  aadhaar: aadhaar.optional().nullable().or(z.literal('').transform(() => null)),
  apaarId: optionalText(20),
  apaarConsent: z.enum(['PENDING', 'GRANTED', 'DECLINED']).optional(),
  penNo: optionalText(20),
  identificationMark: optionalText(120),
  medicalNotes: optionalText(500),
  address: optionalText(300),
  city: optionalText(60),
  state: optionalText(40),
  pincode: pincode.optional().nullable().or(z.literal('').transform(() => null)),
  previousSchool: optionalText(120),
  previousBoardRollNo: optionalText(30),
  isRte: z.boolean().optional(),
  feeDiscountPercent: z.coerce.number().min(0).max(100).optional(),
  notes: optionalText(1000),
  photoUrl: z.string().max(400_000).optional().nullable(),
});

export const guardianInputSchema = z.object({
  fatherName: optionalText(80),
  fatherPhone: optionalPhoneIN,
  fatherEmail: z.email('Enter a valid email').optional().nullable().or(z.literal('').transform(() => null)),
  fatherOccupation: optionalText(60),
  fatherEducation: optionalText(60),
  motherName: optionalText(80),
  motherPhone: optionalPhoneIN,
  motherOccupation: optionalText(60),
  motherEducation: optionalText(60),
  guardianName: optionalText(80),
  guardianPhone: optionalPhoneIN,
  guardianRelation: optionalText(30),
  primaryPhone: phoneIN,
  address: optionalText(300),
  annualIncome: z.coerce.number().min(0).max(1e9).optional().nullable(),
});

export const admitSchema = z.object({
  student: studentInputSchema,
  guardian: guardianInputSchema,
  createLogins: z.boolean().default(true),
  consent: z.literal(true, { error: 'Guardian consent to data processing is required (DPDP Act)' }),
});

export function checkPhoto(url: string | null | undefined): void {
  if (url && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url)) {
    throw new Error('Photo must be a PNG, JPEG or WebP image');
  }
}
