import type { ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';

interface SetupAdminGridProps {
  children: ReactNode;
  className?: string;
}

export function SetupAdminGrid({ children, className = '' }: SetupAdminGridProps) {
  return <div className={`grid gap-2.5 xl:grid-cols-2 xl:items-start ${className}`.trim()}>{children}</div>;
}

interface SetupAdminColumnProps {
  children: ReactNode;
  className?: string;
}

export function SetupAdminColumn({ children, className = '' }: SetupAdminColumnProps) {
  return <div className={`min-w-0 space-y-2.5 ${className}`.trim()}>{children}</div>;
}

interface CompactFormSectionProps {
  title: string;
  icon: LucideIcon;
  iconClassName?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function CompactFormSection({
  title,
  icon: Icon,
  iconClassName = 'text-slate-700',
  children,
  actions,
}: CompactFormSectionProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
          <Icon className={`size-3.5 ${iconClassName}`} />
          <span>{title}</span>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

interface InlineSummarySectionProps {
  title: string;
  icon: LucideIcon;
  iconClassName?: string;
  hint?: ReactNode;
  children: ReactNode;
}

export function InlineSummarySection({
  title,
  icon: Icon,
  iconClassName = 'text-slate-700',
  hint,
  children,
}: InlineSummarySectionProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
        <Icon className={`size-3.5 ${iconClassName}`} />
        <span>{title}</span>
        {hint ? <div className="text-[11px] font-normal text-slate-500">{hint}</div> : null}
      </div>
      {children}
    </section>
  );
}

interface CompactStatsRowItem {
  label: string;
  value: ReactNode;
}

interface CompactStatsRowProps {
  items: CompactStatsRowItem[];
  columnsClassName?: string;
  tone?: 'default' | 'success';
}

export function CompactStatsRow({
  items,
  columnsClassName = 'md:grid-cols-2 xl:grid-cols-4',
  tone = 'default',
}: CompactStatsRowProps) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50'
      : 'border-slate-200 bg-slate-50';

  return (
    <div className={`grid gap-2 rounded-lg border p-2.5 text-sm ${toneClass} ${columnsClassName}`}>
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</p>
          <div className="mt-1 font-medium text-slate-900">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

interface CompactMetaRowProps {
  items: ReactNode[];
}

export function CompactMetaRow({ items }: CompactMetaRowProps) {
  return <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">{items}</div>;
}

interface CompactHoursRowProps {
  children: ReactNode;
}

export function CompactHoursRow({ children }: CompactHoursRowProps) {
  return <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

interface CompactAccordionSectionProps {
  title: string;
  icon: LucideIcon;
  iconClassName?: string;
  hint?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function CompactAccordionSection({
  title,
  icon: Icon,
  iconClassName = 'text-slate-700',
  hint,
  children,
  defaultOpen = false,
  className = '',
}: CompactAccordionSectionProps) {
  return (
    <details open={defaultOpen} className={`group rounded-lg border border-slate-200 bg-white ${className}`.trim()}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon className={`size-3.5 ${iconClassName}`} />
          <span className="text-[13px] font-semibold text-slate-900">{title}</span>
          {hint ? <span className="truncate text-[11px] text-slate-500">{hint}</span> : null}
        </div>
        <ChevronDown className="size-3.5 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-slate-200 px-3 py-3">{children}</div>
    </details>
  );
}
