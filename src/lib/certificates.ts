/** {{placeholders}} available in certificate templates (filled in by POST /api/certificates/issued). */
const COMMON: Array<[string, string]> = [
  ['school.name', 'School name'],
  ['school.city', 'School city'],
  ['school.board', 'Board'],
  ['school.affiliationNo', 'Affiliation no.'],
  ['academicYear', 'Current session, e.g. 2026-27'],
  ['today', 'Issue date'],
  ['customText', 'Free text typed while issuing'],
];

export const PLACEHOLDERS: Record<'STUDENT' | 'EMPLOYEE', Array<[string, string]>> = {
  STUDENT: [
    ['student.name', 'Student name'],
    ['student.fatherName', "Father's name"],
    ['student.motherName', "Mother's name"],
    ['student.admissionNo', 'Admission no.'],
    ['student.class', 'Class-section, e.g. 5-A'],
    ['student.classLabel', 'e.g. Class 5-A'],
    ['student.dob', 'Date of birth'],
    ['student.admissionDate', 'Date of admission'],
    ['student.leftOn', 'Date of leaving'],
    ['student.leavingReason', 'Reason for leaving'],
    ['student.category', 'Category (GEN/OBC/SC/ST)'],
    ['student.penNo', 'PEN (UDISE+)'],
    ...COMMON,
  ],
  EMPLOYEE: [
    ['employee.name', 'Employee name'],
    ['employee.code', 'Employee code'],
    ['employee.designation', 'Designation'],
    ['employee.department', 'Department'],
    ['employee.joiningDate', 'Date of joining'],
    ['employee.leftOn', 'Date of leaving'],
    ...COMMON,
  ],
};

export const CERTIFICATE_KINDS = [
  { value: 'TRANSFER', label: 'Transfer certificate' },
  { value: 'BONAFIDE', label: 'Bonafide' },
  { value: 'CHARACTER', label: 'Character' },
  { value: 'MERIT', label: 'Merit / achievement' },
  { value: 'EXPERIENCE', label: 'Experience (staff)' },
  { value: 'CUSTOM', label: 'Other' },
];
