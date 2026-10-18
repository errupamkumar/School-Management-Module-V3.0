'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

// ----------------------------------------------------------------------------
// Dialog (centered) and Sheet (side panel, used for forms)
// ----------------------------------------------------------------------------

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  side,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Render as a right-hand sheet instead of a centred modal. */
  side?: boolean;
}) {
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', '2xl': 'max-w-6xl' };
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-slate-950/50 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 flex flex-col bg-surface shadow-pop focus:outline-none',
            side
              ? cn('inset-y-0 right-0 w-full animate-slide-up border-l border-line sm:w-[min(92vw,40rem)]', size === 'xl' && 'sm:w-[min(96vw,56rem)]')
              : cn('left-1/2 top-1/2 max-h-[92dvh] w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2 animate-zoom-in rounded-2xl border border-line', widths[size])
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-base font-semibold text-ink">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-0.5 text-sm text-ink-soft">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{typeof title === 'string' ? title : 'Dialog'}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close">
                <X />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ----------------------------------------------------------------------------
// Imperative confirm(): `if (await confirm({...})) ...`
// ----------------------------------------------------------------------------

interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
}

interface PromptOptions extends ConfirmOptions {
  label?: string;
  placeholder?: string;
  minLength?: number;
}

const ConfirmContext = React.createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);
const PromptContext = React.createContext<(o: PromptOptions) => Promise<string | null>>(async () => null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const [prompt, setPrompt] = React.useState<(PromptOptions & { resolve: (v: string | null) => void }) | null>(null);
  const [text, setText] = React.useState('');
  const confirm = React.useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...o, resolve })), []);
  const ask = React.useCallback((o: PromptOptions) => {
    setText('');
    return new Promise<string | null>((resolve) => setPrompt({ ...o, resolve }));
  }, []);
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  const closePrompt = (v: string | null) => {
    prompt?.resolve(v);
    setPrompt(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
     <PromptContext.Provider value={ask}>
      {children}
      <DialogPrimitive.Root open={!!prompt} onOpenChange={(o) => !o && closePrompt(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[60] animate-fade-in bg-slate-950/50" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[60] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 animate-zoom-in rounded-2xl border border-line bg-surface p-6 shadow-pop">
            <DialogPrimitive.Title className="text-base font-semibold text-ink">{prompt?.title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-sm text-ink-soft">{prompt?.description ?? ''}</DialogPrimitive.Description>
            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim().length >= (prompt?.minLength ?? 1)) closePrompt(text.trim());
              }}
            >
              {prompt?.label && <label className="label">{prompt.label}</label>}
              <input autoFocus className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={prompt?.placeholder} />
              <div className="mt-6 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => closePrompt(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant={prompt?.tone === 'primary' ? 'primary' : 'danger'} disabled={text.trim().length < (prompt?.minLength ?? 1)}>
                  {prompt?.confirmLabel ?? 'Confirm'}
                </Button>
              </div>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
      <AlertDialogPrimitive.Root open={!!state} onOpenChange={(o) => !o && close(false)}>
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="fixed inset-0 z-[60] animate-fade-in bg-slate-950/50" />
          <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[60] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 animate-zoom-in rounded-2xl border border-line bg-surface p-6 shadow-pop">
            <AlertDialogPrimitive.Title className="text-base font-semibold text-ink">{state?.title}</AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="mt-2 text-sm text-ink-soft">{state?.description ?? 'Are you sure?'}</AlertDialogPrimitive.Description>
            <div className="mt-6 flex justify-end gap-2">
              <AlertDialogPrimitive.Cancel asChild>
                <Button variant="secondary">Cancel</Button>
              </AlertDialogPrimitive.Cancel>
              <AlertDialogPrimitive.Action asChild>
                <Button variant={state?.tone === 'primary' ? 'primary' : 'danger'} onClick={() => close(true)}>
                  {state?.confirmLabel ?? 'Confirm'}
                </Button>
              </AlertDialogPrimitive.Action>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
     </PromptContext.Provider>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => React.useContext(ConfirmContext);
/** `const reason = await prompt({ title, label })` → string, or null if cancelled. */
export const usePrompt = () => React.useContext(PromptContext);

// ----------------------------------------------------------------------------
// Dropdown menu
// ----------------------------------------------------------------------------

export const Menu = DropdownPrimitive.Root;
export const MenuTrigger = DropdownPrimitive.Trigger;

export function MenuContent({ children, align = 'end', className }: { children: React.ReactNode; align?: 'start' | 'end' | 'center'; className?: string }) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content align={align} sideOffset={6} className={cn('z-50 min-w-[12rem] animate-zoom-in rounded-xl border border-line bg-surface p-1.5 shadow-pop', className)}>
        {children}
      </DropdownPrimitive.Content>
    </DropdownPrimitive.Portal>
  );
}

export function MenuItem({ children, onSelect, danger, disabled }: { children: React.ReactNode; onSelect?: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <DropdownPrimitive.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4',
        danger ? 'text-rose-600 data-[highlighted]:bg-rose-50 dark:data-[highlighted]:bg-rose-500/10' : 'text-ink data-[highlighted]:bg-canvas'
      )}
    >
      {children}
    </DropdownPrimitive.Item>
  );
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return <DropdownPrimitive.Label className="px-2.5 py-1.5 text-xs font-medium text-ink-faint">{children}</DropdownPrimitive.Label>;
}

export function MenuSeparator() {
  return <DropdownPrimitive.Separator className="my-1 h-px bg-line" />;
}

// ----------------------------------------------------------------------------
// Tabs
// ----------------------------------------------------------------------------

export function Tabs({
  value,
  onValueChange,
  tabs,
  children,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  tabs: Array<{ value: string; label: React.ReactNode; count?: number }>;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange} className={className}>
      <TabsPrimitive.List className="-mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-line px-1">
        {tabs.map((t) => (
          <TabsPrimitive.Trigger
            key={t.value}
            value={t.value}
            className="relative -mb-px flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink data-[state=active]:border-brand-600 data-[state=active]:text-brand-700 dark:data-[state=active]:text-brand-300"
          >
            {t.label}
            {t.count !== undefined && <span className="rounded-full bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-ink-soft">{t.count}</span>}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  );
}

export const TabPanel = TabsPrimitive.Content;

// ----------------------------------------------------------------------------
// Popover
// ----------------------------------------------------------------------------

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export function PopoverContent({ children, className, align = 'start' }: { children: React.ReactNode; className?: string; align?: 'start' | 'end' | 'center' }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content align={align} sideOffset={6} className={cn('z-50 animate-zoom-in rounded-xl border border-line bg-surface p-2 shadow-pop', className)}>
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}
