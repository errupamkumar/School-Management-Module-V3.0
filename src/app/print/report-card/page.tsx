'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { Letterhead, PrintPage, PrintState, usePrintData, type SchoolHeader } from '@/components/print';
import { Avatar } from '@/components/ui/display';

interface SubjectResult {
  subjectId: string;
  subjectName: string;
  maxMarks: number;
  marks: number | null;
  isAbsent: boolean;
  passed: boolean;
  grade: string | null;
}
interface Result {
  subjects: SubjectResult[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
  grade: string | null;
  remark: string | null;
  result: string;
  rank: number | null;
  failedSubjects: number;
}
interface Data {
  school: SchoolHeader & { udiseCode: string | null };
  academicYear: string;
  exams: Array<{ id: string; name: string; subjects: Array<{ id: string; name: string; maxMarks: number }> }>;
  grades: Array<{ grade: string; minPercent: number; maxPercent: number; remark?: string | null }>;
  settings: { showRank: boolean };
  cards: Array<{
    studentId: string;
    name: string;
    admissionNo: string;
    rollNo: string | null;
    dob: string | null;
    photoUrl: string | null;
    classLabel: string;
    classTeacher: string | null;
    fatherName: string | null;
    motherName: string | null;
    attendance: { present: number; total: number };
    results: Array<Result | null>;
    ratings: Array<{ term: string; category: string; trait: string; rating: number }>;
    remark?: string | null;
  }>;
}

const STARS = ['', 'E', 'D', 'C', 'B', 'A'];

function Card({ d, c }: { d: Data; c: Data['cards'][number] }) {
  const subjects = new Map<string, string>();
  d.exams.forEach((e) => e.subjects.forEach((s) => subjects.set(s.id, s.name)));
  const last = [...c.results].reverse().find(Boolean) ?? null;
  return (
    <div className="print-break mb-10 last:mb-0">
      <Letterhead school={d.school} subtitle={<span className="rounded border border-slate-800 px-3 py-0.5 text-xs font-bold uppercase tracking-wider">Report card · Session {d.academicYear}</span>} />
      <div className="mt-4 flex gap-4">
        <table className="flex-1 border-collapse text-[12px]">
          <tbody>
            {[
              ['Student', c.name, 'Admission no.', c.admissionNo],
              ['Class', c.classLabel, 'Roll no.', c.rollNo ?? '—'],
              ["Father's name", c.fatherName ?? '—', "Mother's name", c.motherName ?? '—'],
              ['Date of birth', formatDate(c.dob), 'Attendance', `${c.attendance.present} / ${c.attendance.total} days`],
            ].map((r) => (
              <tr key={r[0]}>
                <td className="border border-slate-300 bg-slate-50 px-2 py-1 font-semibold">{r[0]}</td>
                <td className="border border-slate-300 px-2 py-1">{r[1]}</td>
                <td className="border border-slate-300 bg-slate-50 px-2 py-1 font-semibold">{r[2]}</td>
                <td className="border border-slate-300 px-2 py-1">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Avatar name={c.name} src={c.photoUrl} size={96} className="rounded-md" />
      </div>

      <p className="mt-4 text-[12px] font-bold uppercase">Part A — Scholastic areas</p>
      <table className="mt-1 w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 px-2 py-1 text-left" rowSpan={2}>
              Subject
            </th>
            {d.exams.map((e) => (
              <th key={e.id} className="border border-slate-300 px-2 py-1 text-center" colSpan={2}>
                {e.name}
              </th>
            ))}
          </tr>
          <tr className="bg-slate-50">
            {d.exams.map((e) => (
              <React.Fragment key={e.id}>
                <th className="border border-slate-300 px-2 py-1 text-center font-medium">Marks</th>
                <th className="border border-slate-300 px-2 py-1 text-center font-medium">Grade</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...subjects.entries()].map(([sid, name]) => (
            <tr key={sid}>
              <td className="border border-slate-300 px-2 py-1">{name}</td>
              {c.results.map((r, i) => {
                const s = r?.subjects.find((x) => x.subjectId === sid);
                return (
                  <React.Fragment key={i}>
                    <td className={`border border-slate-300 px-2 py-1 text-center ${s && !s.passed && (s.marks !== null || s.isAbsent) ? 'font-bold text-rose-700' : ''}`}>{s ? (s.isAbsent ? 'AB' : s.marks === null ? '—' : `${s.marks}/${s.maxMarks}`) : ''}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center">{s?.grade ?? ''}</td>
                  </React.Fragment>
                );
              })}
            </tr>
          ))}
          <tr className="font-bold">
            <td className="border border-slate-300 px-2 py-1">Total</td>
            {c.results.map((r, i) => (
              <React.Fragment key={i}>
                <td className="border border-slate-300 px-2 py-1 text-center">{r ? `${r.totalObtained}/${r.totalMax}` : ''}</td>
                <td className="border border-slate-300 px-2 py-1 text-center">{r?.grade ?? ''}</td>
              </React.Fragment>
            ))}
          </tr>
          <tr>
            <td className="border border-slate-300 px-2 py-1 font-semibold">Percentage</td>
            {c.results.map((r, i) => (
              <td key={i} className="border border-slate-300 px-2 py-1 text-center" colSpan={2}>
                {r ? `${r.percentage}%` : ''}
              </td>
            ))}
          </tr>
          {d.settings.showRank && (
            <tr>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Class rank</td>
              {c.results.map((r, i) => (
                <td key={i} className="border border-slate-300 px-2 py-1 text-center" colSpan={2}>
                  {r?.rank ?? '—'}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>

      {c.ratings.length > 0 && (
        <>
          <p className="mt-4 text-[12px] font-bold uppercase">Part B — Co-scholastic areas</p>
          <div className="mt-1 grid grid-cols-2 gap-x-6 text-[12px]">
            {c.ratings.map((r) => (
              <div key={`${r.term}${r.trait}`} className="flex justify-between border-b border-slate-200 py-0.5">
                <span>{r.trait}</span>
                <b>{STARS[r.rating]}</b>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-4 rounded border border-slate-400 px-3 py-2 text-[12px]">
        <b>Result:</b> {last?.result === 'PASS' ? 'Passed' : last?.result === 'FAIL' ? (last.failedSubjects ? `Needs improvement in ${last.failedSubjects} subject(s)` : 'Not passed') : 'Incomplete'}
        {last?.remark ? ` · ${last.remark}` : ''}
        <br />
        <b>Class teacher’s remarks:</b> {c.remark ? c.remark : '________________________________________________'}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 text-[10px] text-slate-500">
        Grading:{' '}
        {d.grades.map((g) => (
          <span key={g.grade}>
            {g.grade} {g.minPercent}–{g.maxPercent}
          </span>
        ))}
      </div>
      <div className="mt-12 flex justify-between text-[11px]">
        <p className="border-t border-slate-500 px-6 pt-1">Class teacher {c.classTeacher ? `(${c.classTeacher})` : ''}</p>
        <p className="border-t border-slate-500 px-6 pt-1">Parent</p>
        <p className="border-t border-slate-500 px-6 pt-1">Principal</p>
      </div>
    </div>
  );
}

function ReportCards() {
  const params = useSearchParams();
  const qs = new URLSearchParams();
  const ids = params.get('examIds') ?? params.get('examId') ?? '';
  qs.set('examIds', ids);
  if (params.get('studentId')) qs.set('studentId', params.get('studentId')!);
  if (params.get('sectionId')) qs.set('sectionId', params.get('sectionId')!);
  const { data, isLoading, error } = usePrintData<Data>(`/api/report-card?${qs.toString()}`);
  return (
    <PrintPage title={data ? `Report cards · ${data.cards.length}` : 'Report card'}>
      <PrintState loading={isLoading} error={error?.message} />
      {data?.cards.map((c) => <Card key={c.studentId} d={data} c={c} />)}
    </PrintPage>
  );
}

export default function ReportCardPrint() {
  return (
    <Suspense>
      <ReportCards />
    </Suspense>
  );
}
