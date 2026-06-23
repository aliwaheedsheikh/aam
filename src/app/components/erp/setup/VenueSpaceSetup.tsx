import { useState } from 'react';
import {
  Building2,
  Layers,
  Maximize2,
  PartyPopper,
} from 'lucide-react';
import { EventConfigurationWithLayouts } from './EventConfigurationWithLayouts';
import { PrimeSpaceSetup } from './PrimeSpaceSetup';
import { SubSpaceSetup } from './SubSpaceSetup';
import { VenueMasterSetup } from './VenueMasterSetup';

type VenueTab = 'venue-master' | 'prime-spaces' | 'sub-spaces';
type ReservationVenueTab =
  | 'venue-master'
  | 'prime-spaces'
  | 'sub-spaces'
  | 'event-contents';

interface VenueSpaceSetupProps {
  userName: string;
  mode?: 'full' | 'reservation';
}

const fullModeTabs = [
  {
    id: 'venue-master' as VenueTab,
    label: 'Venue Master',
    note: 'Base venue profile',
    icon: Building2,
  },
  {
    id: 'prime-spaces' as VenueTab,
    label: 'Prime Spaces & Halls',
    note: 'Sellable primary spaces',
    icon: Maximize2,
  },
  {
    id: 'sub-spaces' as VenueTab,
    label: 'Sub Spaces',
    note: 'Divisions and partitions',
    icon: Layers,
  },
];

const reservationModeTabs = [
  {
    id: 'venue-master' as ReservationVenueTab,
    label: 'Venue Profile',
    note: 'Venue identity and contact details',
    icon: Building2,
  },
  {
    id: 'prime-spaces' as ReservationVenueTab,
    label: 'Prime Spaces',
    note: 'Sellable halls with booking rules',
    icon: Maximize2,
  },
  {
    id: 'sub-spaces' as ReservationVenueTab,
    label: 'Sub Spaces',
    note: 'Splits, partitions and overrides',
    icon: Layers,
  },
  {
    id: 'event-contents' as ReservationVenueTab,
    label: 'Event Contents',
    note: 'Types, discounts and taxes',
    icon: PartyPopper,
  },
];

export function VenueSpaceSetup({ userName, mode = 'full' }: VenueSpaceSetupProps) {
  const [activeTab, setActiveTab] = useState<VenueTab>('venue-master');
  const [reservationTab, setReservationTab] = useState<ReservationVenueTab>('venue-master');

  if (mode === 'reservation') {
    const activeReservationTab = reservationModeTabs.find((tab) => tab.id === reservationTab);

    return (
      <div className="flex h-full min-h-0 flex-col bg-white">
        <div className="sticky top-0 z-[5] border-b border-slate-200 bg-white px-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto pt-1">
              {reservationModeTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = reservationTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setReservationTab(tab.id)}
                    className={`flex h-8 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-medium transition-colors ${
                      isActive
                        ? 'border-slate-900 bg-slate-50 text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="hidden shrink-0 text-[11px] text-slate-500 xl:block">
              {activeReservationTab?.note}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden pt-2">
          {reservationTab === 'venue-master' ? <VenueMasterSetup userName={userName} compact /> : null}
          {reservationTab === 'prime-spaces' ? <PrimeSpaceSetup userName={userName} compact /> : null}
          {reservationTab === 'sub-spaces' ? <SubSpaceSetup userName={userName} compact /> : null}

          {reservationTab === 'event-contents' ? <EventConfigurationWithLayouts userName={userName} compact /> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="sticky top-0 z-[5] border-b border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur-sm">
          <div className="flex flex-wrap gap-1">
            {fullModeTabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-w-[152px] rounded-lg border px-2 py-1.5 text-left transition-all ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-3.5" />
                    <span className="text-[11px] font-semibold">
                      {index + 1}. {tab.label}
                    </span>
                  </div>
                  <div className={`mt-0.5 text-[11px] ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>{tab.note}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-2">
          {activeTab === 'venue-master' ? <VenueMasterSetup userName={userName} /> : null}
          {activeTab === 'prime-spaces' ? <PrimeSpaceSetup userName={userName} /> : null}
          {activeTab === 'sub-spaces' ? <SubSpaceSetup userName={userName} /> : null}
        </div>
      </div>
    </div>
  );
}
