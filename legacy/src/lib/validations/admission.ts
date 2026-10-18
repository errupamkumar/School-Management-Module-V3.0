import { z } from 'zod';

export const publicApplicationSchema = z.object({
  campusId: z.string().min(1, 'Campus is required'),
  classId: z.string().min(1, 'Class is required'),
  sectionId: z.string().optional(),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  dob: z.string().min(1, 'Date of birth is required'),
  bloodGroup: z.string().optional(),
  religion: z.string().optional(),
  caste: z.string().optional(),
  category: z.string().optional(),
  nationality: z.string().default('Indian'),
  aadhaarNo: z
    .string()
    .regex(/^$|^\d{12}$/, 'Aadhaar must be 12 digits')
    .optional()
    .nullable(),
  previousSchool: z.string().optional(),
  previousGrade: z.string().optional(),

  // Parent / Guardian
  parentName: z.string().min(1, 'Parent/Guardian name is required').max(100),
  parentPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Parent phone must be a valid 10-digit Indian mobile number'),
  parentEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  parentRelation: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']).default('FATHER'),
  parentAadhaar: z
    .string()
    .regex(/^$|^\d{12}$/, 'Parent Aadhaar must be 12 digits')
    .optional()
    .nullable(),
  parentOccupation: z.string().optional(),
  annualIncome: z.string().optional(),

  // Address
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().default('Uttar Pradesh'),
  pincode: z.string().regex(/^$|^\d{6}$/, 'Pincode must be 6 digits').optional(),
  notes: z.string().optional(),
});

export type PublicApplicationInput = z.infer<typeof publicApplicationSchema>;

export const inquiryStatusSchema = z.object({
  inquiryId: z.string().min(1, 'Inquiry ID is required'),
  status: z.enum([
    'INQUIRY',
    'FORM_SUBMITTED',
    'DOCS_VERIFIED',
    'SEAT_OFFERED',
    'FEES_PAID',
    'ENROLLED',
    'REJECTED',
    'WITHDRAWN',
  ]),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

export const enrollStudentSchema = z.object({
  inquiryId: z.string().min(1, 'Inquiry ID is required'),
  campusId: z.string().min(1, 'Campus ID is required'),
  classId: z.string().min(1, 'Class ID is required'),
  sectionId: z.string().min(1, 'Section ID is required'),
  rollNo: z.string().optional(),
  academicYear: z.string().optional().default('2025-26'),
  assignedStaffId: z.string().optional(),
});

export type EnrollStudentInput = z.input<typeof enrollStudentSchema>;
