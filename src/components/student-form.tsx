'use client';

import * as React from 'react';
import { Info, Users } from 'lucide-react';
import { useLookups, sectionOptions, classOptions } from '@/lib/lookups';
import { api, ApiError } from '@/lib/api-client';
import { todayISO } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/display';
import { Checkbox, Field, Input, Select, Switch, Textarea } from '@/components/ui/form';
import { PhotoPicker } from '@/components/people';

export interface StudentFormValues {
  [k: string]: any;
}

const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((v) => ({ value: v, label: v }));
const CATEGORY = ['GENERAL', 'OBC', 'SC', 'ST', 'EWS'].map((v) => ({ value: v, label: v === 'GENERAL' ? 'General' : v }));
const RELIGION = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'].map((v) => ({ value: v, label: v }));

const STUDENT_KEYS = ['classId', 'sectionId', 'firstName', 'lastName', 'gender', 'dob', 'admissionDate', 'admissionNo', 'rollNo', 'bloodGroup', 'religion', 'caste', 'category', 'motherTongue', 'aadhaar', 'apaarId', 'apaarConsent', 'penNo', 'identificationMark', 'medicalNotes', 'address', 'city', 'state', 'pincode', 'previousSchool', 'previousBoardRollNo', 'isRte', 'feeDiscountPercent', 'notes', 'photoUrl'];
const GUARDIAN_KEYS = ['fatherName', 'fatherPhone', 'fatherEmail', 'fatherOccupation', 'fatherEducation', 'motherName', 'motherPhone', 'motherOccupation', 'motherEducation', 'guardianName', 'guardianPhone', 'guardianRelation', 'primaryPhone', 'annualIncome'];

export function splitStudentForm(v: StudentFormValues, mode: 'create' | 'edit') {
  const clean = (x: any) => (typeof x === 'string' ? (x.trim() === '' ? null : x.trim()) : x);
  const student: Record<string, any> = {};
  for (const k of STUDENT_KEYS) if (v[k] !== undefined) student[k] = clean(v[k]);
  student.feeDiscountPercent = v.feeDiscountPercent === '' || v.feeDiscountPercent == null ? 0 : Number(v.feeDiscountPercent);
  student.isRte = !!v.isRte;
  if (mode === 'edit' && student.aadhaar === null) delete student.aadhaar; // blank means "unchanged"
  const guardian: Record<string, any> = {};
  for (const k of GUARDIAN_KEYS) if (v[k] !== undefined) guardian[k] = clean(v[k]);
  guardian.address = clean(v.address);
  if (guardian.annualIncome != null) guardian.annualIncome = Number(guardian.annualIncome);
  return { student, guardian };
}

export function StudentForm({
  initial,
  mode,
  onSubmit,
  submitting,
  errors,
}: {
  initial: StudentFormValues;
  mode: 'create' | 'edit';
  onSubmit: (v: StudentFormValues) => void;
  submitting: boolean;
  errors: Record<string, string>;
}) {
  const { data: lk } = useLookups(['classes']);
  const [v, setV] = React.useState<StudentFormValues>(initial);
  const [family, setFamily] = React.useState<{ count: number; names: string[] } | null>(null);
  const set = (k: string, value: any) => setV((s) => ({ ...s, [k]: value }));
  const err = (k: string) => errors[`student.${k}`] ?? errors[`guardian.${k}`] ?? errors[k];

  // Sibling detection: look up the family by phone as soon as a valid number is entered.
  React.useEffect(() => {
    if (mode !== 'create' || !/^[6-9]\d{9}$/.test(v.primaryPhone ?? '')) {
      setFamily(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api<Array<{ students: Array<{ firstName: string; lastName: string | null }> }>>('/api/guardians', { params: { phone: v.primaryPhone } });
        const g = res[0];
        setFamily(g ? { count: g.students.length, names: g.students.map((s) => `${s.firstName} ${s.lastName ?? ''}`.trim()) } : null);
      } catch (e) {
        if (!(e instanceof ApiError)) setFamily(null);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [v.primaryPhone, mode]);

  const text = (k: string, label: string, props: Partial<React.ComponentProps<typeof Input>> & { required?: boolean; hint?: string; span?: boolean } = {}) => {
    const { required, hint, span, ...rest } = props;
    return (
      <Field label={label} required={required} error={err(k)} hint={hint} className={span ? 'sm:col-span-2' : undefined} htmlFor={`s-${k}`}>
        <Input id={`s-${k}`} value={v[k] ?? ''} onChange={(e) => set(k, e.target.value)} invalid={!!err(k)} {...rest} />
      </Field>
    );
  };
  const select = (k: string, label: string, options: Array<{ value: string; label: string }>, required?: boolean, placeholder = 'Select…') => (
    <Field label={label} required={required} error={err(k)} htmlFor={`s-${k}`}>
      <Select id={`s-${k}`} value={v[k] ?? ''} onChange={(e) => set(k, e.target.value)} options={options} placeholder={placeholder} invalid={!!err(k)} />
    </Field>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
      className="space-y-6"
      noValidate
    >
      <Card>
        <CardHeader title="Student details" />
        <CardBody className="space-y-5">
          <PhotoPicker value={v.photoUrl} onChange={(p) => set('photoUrl', p)} name={`${v.firstName ?? ''} ${v.lastName ?? ''}`} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {text('firstName', 'First name', { required: true, autoFocus: mode === 'create' })}
            {text('lastName', 'Last name')}
            {select('gender', 'Gender', GENDERS, true)}
            {text('dob', 'Date of birth', { type: 'date', max: todayISO() })}
            {select('bloodGroup', 'Blood group', BLOOD, false, '—')}
            {select('religion', 'Religion', RELIGION, false, '—')}
            {select('category', 'Category', CATEGORY, false, '—')}
            {text('caste', 'Caste')}
            {text('motherTongue', 'Mother tongue')}
            {text('identificationMark', 'Identification mark', { span: true })}
            {text('medicalNotes', 'Medical conditions / allergies')}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Admission & class" />
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Class" required error={err('classId')} htmlFor="s-classId">
            <Select
              id="s-classId"
              value={v.classId ?? ''}
              onChange={(e) => {
                const cls = lk?.classes?.find((c) => c.id === e.target.value);
                setV((s) => ({ ...s, classId: e.target.value, sectionId: cls?.sections.length === 1 ? cls.sections[0].id : '' }));
              }}
              options={classOptions(lk)}
              placeholder="Select…"
              invalid={!!err('classId')}
            />
          </Field>
          <Field label="Section" required error={err('sectionId')} htmlFor="s-sectionId">
            <Select id="s-sectionId" value={v.sectionId ?? ''} onChange={(e) => set('sectionId', e.target.value)} options={sectionOptions(lk, v.classId)} placeholder={v.classId ? 'Select…' : 'Choose class first'} invalid={!!err('sectionId')} />
          </Field>
          {text('rollNo', 'Roll number')}
          {text('admissionNo', 'Admission number', { hint: mode === 'create' ? 'Leave blank to auto-generate' : undefined })}
          {text('admissionDate', 'Admission date', { type: 'date' })}
          {text('feeDiscountPercent', 'Fee discount %', { type: 'number', min: 0, max: 100, hint: 'Applied to every fee head' })}
          {text('previousSchool', 'Previous school', { span: true })}
          {text('previousBoardRollNo', 'Previous board roll no.')}
          <Field label="RTE seat (free education quota)">
            <div className="flex h-10 items-center gap-3">
              <Switch checked={!!v.isRte} onCheckedChange={(x) => set('isRte', x)} />
              <span className="text-xs text-ink-faint">Section 12(1)(c) of the RTE Act</span>
            </div>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Parents / guardian" description="The primary mobile is used for the parent login and SMS/WhatsApp alerts. Siblings are linked automatically by this number." icon={Users} />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {text('primaryPhone', 'Primary mobile', { required: true, inputMode: 'numeric', maxLength: 13, placeholder: '98XXXXXXXX', disabled: mode === 'edit', hint: mode === 'edit' ? 'Change from the family record' : undefined })}
            {text('fatherName', "Father's name")}
            {text('fatherOccupation', "Father's occupation")}
            {text('fatherPhone', "Father's mobile", { inputMode: 'numeric' })}
            {text('fatherEmail', "Father's email", { type: 'email' })}
            {text('fatherEducation', "Father's education")}
            {text('motherName', "Mother's name")}
            {text('motherPhone', "Mother's mobile", { inputMode: 'numeric' })}
            {text('motherOccupation', "Mother's occupation")}
            {text('guardianName', 'Guardian (if other)')}
            {text('guardianRelation', 'Relation')}
            {text('guardianPhone', "Guardian's mobile", { inputMode: 'numeric' })}
            {text('annualIncome', 'Annual family income (₹)', { type: 'number', min: 0 })}
          </div>
          {family && (
            <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
              <Info className="mt-0.5 size-4 shrink-0" />
              This number belongs to an existing family with {family.count} child(ren): {family.names.join(', ')}. The new student will be linked as a sibling and the existing parent login will see both.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Address" />
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Address" className="sm:col-span-2 lg:col-span-4" error={err('address')}>
            <Textarea value={v.address ?? ''} onChange={(e) => set('address', e.target.value)} rows={2} />
          </Field>
          {text('city', 'City / village')}
          {text('state', 'State')}
          {text('pincode', 'PIN code', { inputMode: 'numeric', maxLength: 6 })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Government IDs" description="Aadhaar is encrypted at rest and only the last 4 digits are ever shown." />
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {text('aadhaar', 'Aadhaar number', { inputMode: 'numeric', maxLength: 14, placeholder: mode === 'edit' && initial.aadhaarMasked ? initial.aadhaarMasked : 'XXXX XXXX XXXX', hint: mode === 'edit' ? 'Leave blank to keep unchanged' : 'Optional' })}
          {text('penNo', 'UDISE+ PEN')}
          {text('apaarId', 'APAAR ID')}
          {select(
            'apaarConsent',
            'APAAR consent',
            [
              { value: 'PENDING', label: 'Not yet asked' },
              { value: 'GRANTED', label: 'Granted' },
              { value: 'DECLINED', label: 'Declined' },
            ],
            false,
            '—'
          )}
          <p className="text-xs text-ink-faint sm:col-span-2 lg:col-span-4">
            APAAR registration is voluntary. Parents may decline, and admission must not be refused for declining.
          </p>
        </CardBody>
      </Card>

      {mode === 'create' && (
        <Card>
          <CardBody className="space-y-3">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={!!v.createLogins} onCheckedChange={(x) => set('createLogins', !!x)} />
              <span>Create student and parent logins now (temporary passwords will be shown once).</span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={!!v.consent} onCheckedChange={(x) => set('consent', !!x)} />
              <span>
                The parent/guardian has consented to the school processing this child’s personal data for education and administration, as required by the Digital Personal Data Protection Act, 2023.
                <span className="text-rose-500"> *</span>
              </span>
            </label>
            {err('consent') && <p className="text-xs text-rose-600">{err('consent')}</p>}
          </CardBody>
        </Card>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t border-line bg-surface/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button type="button" variant="secondary" onClick={() => history.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting} disabled={mode === 'create' && !v.consent}>
          {mode === 'create' ? 'Admit student' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
