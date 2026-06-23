import type { LucideIcon } from 'lucide-react';

interface SetupEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  compact?: boolean;
}

export function SetupEmptyState({
  icon: Icon,
  title,
  description,
  compact = false,
}: SetupEmptyStateProps) {
  return (
    <div className="flex h-full items-center justify-center text-slate-500">
      <div className="text-center">
        <Icon className={`${compact ? 'size-12' : 'size-16'} mx-auto mb-3 text-slate-300`} />
        <p className={`${compact ? 'text-sm font-medium' : 'text-sm'} text-slate-700`}>{title}</p>
        {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}
