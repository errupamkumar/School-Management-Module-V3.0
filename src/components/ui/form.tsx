'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { className, invalid, ...props },
  ref
) {
  return <input ref={ref} className={cn('input', invalid && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15', className)} aria-invalid={invalid || undefined} {...props} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { className, invalid, rows = 3, ...props },
  ref
) {
  return <textarea ref={ref} rows={rows} className={cn('input h-auto py-2.5 leading-relaxed', invalid && 'border-rose-400', className)} aria-invalid={invalid || undefined} {...props} />;
});

export interface Option {
  value: string;
  label: string;
}

/** Native select: accessible, fast on low-end Android phones, and keyboard friendly. */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { options: Option[]; placeholder?: string; invalid?: boolean }
>(function Select({ className, options, placeholder, invalid, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn('input appearance-none pr-9', invalid && 'border-rose-400', className)} aria-invalid={invalid || undefined} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
    </div>
  );
});

export function Label({ className, children, required, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn('label', className)} {...props}>
      {children}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
  );
}

export function Field({
  label,
  required,
  error,
  hint,
  className,
  children,
  htmlFor,
}: {
  label?: React.ReactNode;
  required?: boolean;
  error?: string | null;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p> : hint ? <p className="mt-1 text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export function Checkbox({ checked, onCheckedChange, className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        'peer size-[18px] shrink-0 rounded-md border border-line bg-surface transition-colors data-[state=checked]:border-brand-600 data-[state=checked]:bg-brand-600 data-[state=indeterminate]:bg-brand-600 disabled:opacity-50',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <Check className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-slate-300 transition-colors data-[state=checked]:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:data-[state=checked]:bg-brand-500',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  );
}

/** Segmented control for 2–5 mutually exclusive choices. */
export function Segmented<T extends string>({ value, onChange, options, className, size = 'md' }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: React.ReactNode }>; className?: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" className={cn('inline-flex rounded-xl border border-line bg-canvas p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg font-medium transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
