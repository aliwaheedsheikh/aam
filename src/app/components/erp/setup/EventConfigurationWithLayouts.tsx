import { useState } from 'react';
import { DiscountSetup } from './DiscountSetup';
import { EventTypeSetup } from './EventTypeSetup';
import { TaxConfigurationWrapper } from './TaxConfigurationWrapper';

interface EventConfigurationWithLayoutsProps {
  userName: string;
  compact?: boolean;
}

export function EventConfigurationWithLayouts({ userName, compact = false }: EventConfigurationWithLayoutsProps) {
  const [activeSection, setActiveSection] = useState<'event-types' | 'discounts' | 'taxes'>('event-types');

  const sections = [
    {
      id: 'event-types' as const,
      label: 'Event Types',
    },
    {
      id: 'discounts' as const,
      label: 'Discount Rules',
    },
    {
      id: 'taxes' as const,
      label: 'Tax Configuration',
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded border border-slate-200 bg-white">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 px-3 py-2">
        {sections.map((section) => {
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {section.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-slate-50">
        {activeSection === 'event-types' ? <EventTypeSetup userName={userName} compact={compact} /> : null}
        {activeSection === 'discounts' ? <DiscountSetup userName={userName} compact={compact} hideAudit /> : null}
        {activeSection === 'taxes' ? <TaxConfigurationWrapper userName={userName} compact={compact} hideAudit /> : null}
      </div>
    </div>
  );
}
