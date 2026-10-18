'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Letterhead, PrintPage, PrintState, usePrintData, type SchoolHeader } from '@/components/print';

interface Paper {
  title: string;
  classLabel: string;
  subject: string;
  durationMins: number;
  totalMarks: number;
  instructions: string | null;
  school: SchoolHeader;
  sections: Array<{ title: string; questions: Array<{ id: string; type: string; text: string; options: string[] | null; answer: string | null; marks: number }> }>;
}

function PaperView() {
  const { id } = useParams<{ id: string }>();
  const answers = useSearchParams().get('answers') === '1';
  const { data: p, isLoading, error } = usePrintData<Paper>(`/api/question-papers/${id}`);
  // Questions are numbered continuously across sections.
  const starts = (p?.sections ?? []).reduce<number[]>((acc, s, i, all) => [...acc, i === 0 ? 0 : acc[i - 1] + all[i - 1].questions.length], []);
  return (
    <PrintPage title={p ? `${p.title}${answers ? ' — answer key' : ''}` : 'Question paper'}>
      <PrintState loading={isLoading} error={error?.message} />
      {p && (
        <div>
          <Letterhead school={p.school} subtitle={<p className="text-sm font-bold">{p.title}{answers && ' — ANSWER KEY (confidential)'}</p>} />
          <div className="mt-3 flex justify-between text-[12px] font-semibold">
            <span>
              Class: {p.classLabel} · Subject: {p.subject}
            </span>
            <span>
              Time: {Math.floor(p.durationMins / 60)}h {p.durationMins % 60 ? `${p.durationMins % 60}m` : ''} · Max. marks: {Number(p.totalMarks)}
            </span>
          </div>
          {p.instructions && <p className="mt-2 border-y border-slate-300 py-1.5 text-[11px] italic">General instructions: {p.instructions}</p>}
          {p.sections.map((s, si) => (
            <div key={s.title} className="mt-5">
              <p className="mb-2 text-center text-[13px] font-bold uppercase underline">{s.title}</p>
              <ol className="space-y-3">
                {s.questions.map((q, qi) => {
                  const n = starts[si] + qi + 1;
                  return (
                    <li key={q.id} className="break-inside-avoid text-[13px]">
                      <div className="flex gap-2">
                        <span className="font-semibold">{n}.</span>
                        <span className="flex-1 whitespace-pre-wrap">{q.text}</span>
                        <span className="shrink-0 font-semibold">[{Number(q.marks)}]</span>
                      </div>
                      {q.options && (
                        <div className="ml-6 mt-1 grid grid-cols-2 gap-x-6 gap-y-0.5 text-[12px]">
                          {q.options.map((o, i) => (
                            <span key={i}>
                              ({String.fromCharCode(97 + i)}) {o}
                            </span>
                          ))}
                        </div>
                      )}
                      {answers && q.answer && <p className="ml-6 mt-1 rounded bg-emerald-50 px-2 py-1 text-[12px] text-emerald-900">Answer: {q.answer}</p>}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
          <p className="mt-8 text-center text-[11px]">— End of question paper —</p>
        </div>
      )}
    </PrintPage>
  );
}

export default function QuestionPaperPrint() {
  return (
    <Suspense>
      <PaperView />
    </Suspense>
  );
}
