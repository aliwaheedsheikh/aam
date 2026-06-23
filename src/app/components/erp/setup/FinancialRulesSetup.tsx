import { useState } from 'react';
import { Banknote, BadgePercent, Receipt } from 'lucide-react';
import { AdvanceRulesSetup } from './AdvanceRulesSetup';
import { DiscountSetup } from './DiscountSetup';
import { TaxConfigurationWrapper } from './TaxConfigurationWrapper';
import { SetupAdminColumn, SetupAdminGrid } from './SetupCompactPrimitives';

interface FinancialRulesSetupProps {
  userName: string;
  compact?: boolean;
}

export function FinancialRulesSetup({ userName, compact = false }: FinancialRulesSetupProps) {
  const [activeTab, setActiveTab] = useState<'advance-rules' | 'discounts' | 'taxes'>('advance-rules');

  return (
    <SetupAdminGrid className={compact ? 'xl:grid-cols-[200px_minmax(0,1fr)] gap-2.5' : 'xl:grid-cols-[240px_minmax(0,1fr)]'}>
      <SetupAdminColumn>
        <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-1.5' : 'p-2'}`}>
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab('advance-rules')}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                activeTab === 'advance-rules'
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Banknote className="size-4" />
                Advance Rules
              </div>
            </button>
            <button
              onClick={() => setActiveTab('discounts')}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                activeTab === 'discounts'
                  ? 'border-red-600 bg-red-50 text-red-700'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <BadgePercent className="size-4" />
                Discounts
              </div>
            </button>
            <button
              onClick={() => setActiveTab('taxes')}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                activeTab === 'taxes'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Receipt className="size-4" />
                Tax Configuration
              </div>
            </button>
          </div>
        </div>
      </SetupAdminColumn>

      <SetupAdminColumn>
        <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-2.5' : 'p-3'}`}>
          {activeTab === 'advance-rules' && <AdvanceRulesSetup userName={userName} compact={compact} />}
          {activeTab === 'discounts' && <DiscountSetup userName={userName} compact={compact} />}
          {activeTab === 'taxes' && <TaxConfigurationWrapper userName={userName} compact={compact} />}
        </div>
      </SetupAdminColumn>
    </SetupAdminGrid>
  );
}
