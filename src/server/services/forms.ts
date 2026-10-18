import { z } from 'zod';
import { audienceSchema } from './audience';

/**
 * Form builder: a form is an ordered list of fields. A poll is a form with a
 * single choice question. Validation and result tallies are pure functions so
 * they can be unit-tested without a database.
 */
export const FIELD_TYPES = ['SINGLE', 'MULTI', 'TEXT', 'PARAGRAPH', 'NUMBER', 'DATE', 'RATING'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const fieldSchema = z
  .object({
    id: z.string().trim().min(1).max(40),
    label: z.string().trim().min(1, 'Every question needs text').max(300),
    type: z.enum(FIELD_TYPES),
    required: z.boolean().default(false),
    options: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  })
  .refine((f) => !['SINGLE', 'MULTI'].includes(f.type) || f.options.length >= 2, { message: 'Choice questions need at least two options', path: ['options'] })
  .refine((f) => new Set(f.options).size === f.options.length, { message: 'Options must be different', path: ['options'] });
export type FormField = z.infer<typeof fieldSchema>;

export const fieldsSchema = z
  .array(fieldSchema)
  .min(1, 'Add at least one question')
  .max(40)
  .refine((fs) => new Set(fs.map((f) => f.id)).size === fs.length, 'Question ids must be unique');

export function readFields(raw: unknown): FormField[] {
  const p = fieldsSchema.safeParse(raw);
  return p.success ? p.data : [];
}

export type Answers = Record<string, string | string[] | number>;

/** Checks answers against the form; returns the cleaned answers or an error message. */
export function validateAnswers(fields: FormField[], raw: Record<string, unknown>): { ok: true; answers: Answers } | { ok: false; error: string } {
  const out: Answers = {};
  for (const f of fields) {
    const v = raw[f.id];
    const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    if (empty) {
      if (f.required) return { ok: false, error: `"${f.label}" is required.` };
      continue;
    }
    switch (f.type) {
      case 'SINGLE':
        if (typeof v !== 'string' || !f.options.includes(v)) return { ok: false, error: `Choose one of the options for "${f.label}".` };
        out[f.id] = v;
        break;
      case 'MULTI': {
        if (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || !f.options.includes(x))) return { ok: false, error: `Choose from the options for "${f.label}".` };
        out[f.id] = [...new Set(v as string[])];
        break;
      }
      case 'NUMBER': {
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isFinite(n) || Math.abs(n) > 1e12) return { ok: false, error: `"${f.label}" must be a number.` };
        out[f.id] = n;
        break;
      }
      case 'RATING': {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 5) return { ok: false, error: `Rate "${f.label}" from 1 to 5.` };
        out[f.id] = n;
        break;
      }
      case 'DATE':
        if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: false, error: `"${f.label}" must be a date.` };
        out[f.id] = v;
        break;
      default: {
        if (typeof v !== 'string') return { ok: false, error: `"${f.label}" must be text.` };
        const max = f.type === 'PARAGRAPH' ? 4000 : 300;
        out[f.id] = v.trim().slice(0, max);
      }
    }
  }
  return { ok: true, answers: out };
}

export interface FieldResult {
  id: string;
  label: string;
  type: FieldType;
  answered: number;
  /** Choice / rating counts in option order. */
  counts?: Array<{ option: string; count: number }>;
  average?: number;
  /** Free-text answers (only for people allowed to see individual responses). */
  texts?: Array<{ value: string; by?: string }>;
}

/** Tallies responses. `withText` adds free-text answers; `names` attaches who answered (non-anonymous forms only). */
export function tally(fields: FormField[], responses: Array<{ answers: unknown; userName?: string }>, opts: { withText: boolean; names: boolean }): FieldResult[] {
  return fields.map((f) => {
    const vals = responses.map((r) => ({ v: (r.answers as Answers | null)?.[f.id], by: r.userName })).filter((x) => x.v !== undefined && x.v !== null && x.v !== '');
    const res: FieldResult = { id: f.id, label: f.label, type: f.type, answered: vals.length };
    if (f.type === 'SINGLE' || f.type === 'MULTI') {
      res.counts = f.options.map((o) => ({ option: o, count: vals.filter((x) => (Array.isArray(x.v) ? x.v.includes(o) : x.v === o)).length }));
    } else if (f.type === 'RATING') {
      res.counts = ['1', '2', '3', '4', '5'].map((o) => ({ option: o, count: vals.filter((x) => String(x.v) === o).length }));
      res.average = vals.length ? Math.round((vals.reduce((a, x) => a + Number(x.v), 0) / vals.length) * 10) / 10 : 0;
    } else if (f.type === 'NUMBER') {
      res.average = vals.length ? Math.round((vals.reduce((a, x) => a + Number(x.v), 0) / vals.length) * 100) / 100 : 0;
      if (opts.withText) res.texts = vals.map((x) => ({ value: String(x.v), ...(opts.names ? { by: x.by } : {}) }));
    } else if (opts.withText) {
      res.texts = vals.map((x) => ({ value: String(x.v), ...(opts.names ? { by: x.by } : {}) }));
    }
    return res;
  });
}

/** Create/update body for a poll or form. */
export const formInput = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().max(2000).optional().nullable(),
  kind: z.enum(['POLL', 'SURVEY', 'FORM']),
  fields: fieldsSchema,
  audience: audienceSchema,
  anonymous: z.boolean().default(false),
  allowEdit: z.boolean().default(false),
  resultsVisible: z.enum(['AFTER_RESPONSE', 'CREATOR_ONLY']).default('AFTER_RESPONSE'),
  closesAt: z.string().datetime({ offset: true }).optional().nullable(),
  notify: z.boolean().default(true),
});

