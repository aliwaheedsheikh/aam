import { useState } from 'react';
import { Lock, Shield, Unlock } from 'lucide-react';
import { Button } from '../../ui/button';

interface SystemDefaults {
  defaultCurrency: string;
  defaultTimezone: string;
  fiscalYearStartMonth: string;
  defaultDateFormat: string;
  lastUpdatedAt?: Date;
  lastUpdatedBy?: string;
}

function formatDateTime(value?: Date) {
  if (!value || Number.isNaN(value.getTime())) return 'Not recorded';
  return `${value.toLocaleDateString('en-PK')} ${value.toLocaleTimeString('en-PK')}`;
}

export function SystemDefaultsSetup() {
  const [systemDefaults] = useState<SystemDefaults>({
    defaultCurrency: 'PKR',
    defaultTimezone: 'Asia/Karachi',
    fiscalYearStartMonth: 'July',
    defaultDateFormat: 'DD/MM/YYYY',
    lastUpdatedAt: new Date('2025-01-05T14:30:00'),
    lastUpdatedBy: 'Admin User',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLocked, setIsLocked] = useState(true);

  const handleEdit = () => {
    setIsEditing(true);
    setIsLocked(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsLocked(true);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">System Defaults</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  isLocked ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {isLocked ? 'Locked' : 'Unlocked'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isEditing ? (
              <Button onClick={handleEdit} className="h-8 bg-blue-600 hover:bg-blue-700">
                <Unlock className="mr-1 size-4" />
                Unlock
              </Button>
            ) : (
              <Button onClick={handleCancel} variant="outline" className="h-8">
                <Lock className="mr-1 size-4" />
                Lock
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 size-5 shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-900">Global ERP Defaults</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Currency', value: systemDefaults.defaultCurrency },
                { label: 'Timezone', value: systemDefaults.defaultTimezone },
                { label: 'Fiscal Year Starts', value: systemDefaults.fiscalYearStartMonth },
                { label: 'Date Format', value: systemDefaults.defaultDateFormat },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{item.label}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {systemDefaults.lastUpdatedAt && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              <strong className="text-slate-700">Last Updated:</strong> {formatDateTime(systemDefaults.lastUpdatedAt)}
            </span>
            <span>
              <strong className="text-slate-700">By:</strong> {systemDefaults.lastUpdatedBy || 'System'}
            </span>
            <span className="flex items-center gap-1">
              {isLocked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
              <strong className="text-slate-700">{isLocked ? 'Locked' : 'Unlocked'}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
