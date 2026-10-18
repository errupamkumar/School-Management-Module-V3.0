/** Starting data every new school gets (platform onboarding and the demo seed). Schools edit all of it. */

export const DEFAULT_FEE_HEADS: Array<[name: string, kind: 'RECURRING' | 'ONE_TIME']> = [
  ['Tuition Fee', 'RECURRING'],
  ['Admission Fee', 'ONE_TIME'],
  ['Annual Charges', 'RECURRING'],
  ['Exam Fee', 'RECURRING'],
  ['Computer Fee', 'RECURRING'],
  ['Smart Class Fee', 'RECURRING'],
];

export const DEFAULT_EXPENSE_HEADS = ['Electricity', 'Building Maintenance', 'Stationery', 'Diesel & Vehicle Upkeep', 'Internet & Telephone', 'Events & Functions'];
export const DEFAULT_INCOME_HEADS = ['Donations', 'Hall Rent', 'Scrap Sale'];

export const DEFAULT_CERTIFICATE_TEMPLATES: Array<[name: string, kind: string, recipientType: 'STUDENT' | 'EMPLOYEE', body: string]> = [
  ['Transfer Certificate', 'TRANSFER', 'STUDENT', '<p>This is to certify that <b>{{student.name}}</b>, son/daughter of <b>{{student.fatherName}}</b>, Admission No. <b>{{student.admissionNo}}</b>, was a bonafide student of this school studying in Class <b>{{student.class}}</b>. Date of birth as per school records: <b>{{student.dob}}</b>.</p><p>He/She has paid all dues and bears a good moral character. We wish him/her success in all future endeavours.</p>'],
  ['Bonafide Certificate', 'BONAFIDE', 'STUDENT', '<p>This is to certify that <b>{{student.name}}</b>, son/daughter of <b>{{student.fatherName}}</b>, is a bonafide student of <b>{{school.name}}</b> studying in Class <b>{{student.class}}</b> during the academic session <b>{{academicYear}}</b>.</p>'],
  ['Character Certificate', 'CHARACTER', 'STUDENT', '<p>This is to certify that <b>{{student.name}}</b> (Admission No. {{student.admissionNo}}) has been a student of this institution. During the stay, his/her conduct and character were found to be <b>good</b>.</p>'],
  ['Experience Certificate', 'EXPERIENCE', 'EMPLOYEE', '<p>This is to certify that <b>{{employee.name}}</b> worked with <b>{{school.name}}</b> as <b>{{employee.designation}}</b> from <b>{{employee.joiningDate}}</b>. During this period we found him/her sincere and hardworking.</p>'],
  ['Merit Certificate', 'MERIT', 'STUDENT', '<p>Awarded to <b>{{student.name}}</b> of Class <b>{{student.class}}</b> for outstanding performance. {{customText}}</p>'],
];

export const DEFAULT_RULES = {
  students: [
    '1. Students must reach school by 7:45 AM.',
    '2. Complete uniform is mandatory on all working days.',
    '3. Mobile phones are not permitted on campus.',
    '4. A minimum of 75% attendance is required to appear in the annual examinations.',
  ].join('\n'),
  employees: ['1. Staff must mark attendance by 7:30 AM.', '2. Leave must be applied for at least one day in advance, except in emergencies.'].join('\n'),
};
