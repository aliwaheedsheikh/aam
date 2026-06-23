import { useMemo, useState } from 'react';
import {
  Building2,
  Lock,
  MapPinned,
  PartyPopper,
  Users,
  Settings,
  ChevronRight,
  Layers3,
} from 'lucide-react';
import { UsersRolesSetup } from './UsersRolesSetup';
import { OrganizationSetup } from './OrganizationSetup';
import { VenueSpaceSetup } from './VenueSpaceSetup';
import { SystemDefaultsSetup } from './SystemDefaultsSetup';
import { RcsSetup } from './RcsSetup';
import type { Booking } from '../../calendar/types-v2';

interface SetupModuleProps {
  userRole: string;
  userName: string;
  mode?: "full" | "reservation";
  bookings?: Booking[];
  serviceBookings?: Array<Record<string, any>>;
}

type SetupSection =
  | 'organization'
  | 'venue-space'
  | 'rcs-setup'
  | 'users-roles'
  | 'system-defaults';

export function SetupModule({ userRole, userName, mode = "full", bookings = [], serviceBookings = [] }: SetupModuleProps) {
  const [activeSection, setActiveSection] = useState<SetupSection>('organization');

  const isReservationMode = mode === "reservation";
  const canAccessSetup =
    isReservationMode
      ? userRole === 'admin' || userRole === 'front-office' || userRole === 'general-manager'
      : userRole === 'admin';

  if (!canAccessSetup) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F5F7FA]">
        <div className="text-center">
          <Lock className="size-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-[#2E2E2E] mb-2">Access Denied</h2>
          <p className="text-[#6B7280]">
            {isReservationMode
              ? 'You do not have access to reservation setup.'
              : 'Only Admin can access user setup and permission control'}
          </p>
        </div>
      </div>
    );
  }

  const masterSetupSections = [
    {
      id: 'organization' as SetupSection,
      name: 'Organization',
      shortName: 'Org',
      description: 'Business identity, contact and operating hours',
      detail: 'Legal profile, contact points and base operating schedule',
      icon: Building2,
      tone: 'blue',
    },
    {
      id: 'users-roles' as SetupSection,
      name: 'Users & Roles',
      shortName: 'Users',
      description: 'Access control, permissions and setup ownership',
      detail: 'Protects who can change backbone system rules',
      icon: Users,
      tone: 'indigo',
    },
    {
      id: 'system-defaults' as SetupSection,
      name: 'System Defaults',
      shortName: 'Defaults',
      description: 'System-wide fallbacks and default ERP behavior',
      detail: 'Used whenever the ERP needs a global default choice',
      icon: Settings,
      tone: 'slate',
    },
  ];

  const reservationOnlySetupSections = [
    {
      id: 'venue-space' as SetupSection,
      name: 'Venue, Events & Rules',
      shortName: 'Hub',
      description: 'Venues, spaces, event types, advance rules, discounts and taxes',
      detail: 'One simple reservation workspace for inventory, event configuration and financial controls',
      icon: MapPinned,
      tone: 'emerald',
    },
    {
      id: 'rcs-setup' as SetupSection,
      name: 'RCS Setup',
      shortName: 'RCS',
      description: 'RCS master services, vendor rates, packages and commissions',
      detail: 'Operational master for RCS selling price, cost, profit visibility and payout rules',
      icon: PartyPopper,
      tone: 'indigo',
    },
  ];

  const setupSections = isReservationMode ? reservationOnlySetupSections : masterSetupSections;

  const activeSectionConfig = setupSections.find((section) => section.id === activeSection) ?? setupSections[0];
  const resolvedActiveSection = activeSectionConfig.id;

  const compactStats = useMemo(
    () => [
      { label: 'Areas', value: String(setupSections.length) },
      { label: 'Focus', value: activeSectionConfig.shortName },
      { label: 'Access', value: isReservationMode ? 'Ops' : 'Admin' },
    ],
    [activeSectionConfig.shortName, isReservationMode, setupSections.length]
  );

  const renderContent = () => {
    switch (resolvedActiveSection) {
      case 'organization':
        return <OrganizationSetup />;
      case 'venue-space':
        return <VenueSpaceSetup userName={userName} mode="reservation" />;
      case 'rcs-setup':
        return <RcsSetup userName={userName} bookings={bookings} serviceBookings={serviceBookings} />;
      case 'users-roles':
        return <UsersRolesSetup userName={userName} />;
      case 'system-defaults':
        return <SystemDefaultsSetup />;
      default:
        return <OrganizationSetup />;
    }
  };

  const toneClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  };

  const ActiveSectionIcon = activeSectionConfig.icon;

  if (isReservationMode) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-white">
        <div className="border-b border-slate-200 bg-white px-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto pt-1">
              {setupSections.map((section) => {
                const Icon = section.icon;
                const isActive = resolvedActiveSection === section.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`flex h-8 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-medium transition-colors ${
                      isActive
                        ? 'border-slate-900 bg-slate-50 text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{section.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="hidden shrink-0 items-center gap-3 text-[11px] text-slate-500 xl:flex">
              {compactStats.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className="uppercase tracking-[0.12em] text-slate-400">{item.label}</span>
                  <span className="font-medium text-slate-700">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">{renderContent()}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#EEF2F6]">
      <div className="sticky top-0 z-20 border-b border-slate-300 bg-gradient-to-r from-[#18314F] via-[#20415F] to-[#294A63] px-3 py-2.5 text-white shadow-sm">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="size-4" />
              <h1 className="text-base font-bold tracking-tight">
                {isReservationMode ? 'Reservation Setup' : 'Master Setup'}
              </h1>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-200">
              {isReservationMode
                ? 'Reservation inventory, event rules, pricing defaults and operational booking configuration.'
                : 'System administration controls for organization profile, access control and global defaults.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {compactStats.map((item) => (
              <div key={item.label} className="rounded-lg border border-white/15 bg-white/10 px-2 py-1.5 backdrop-blur-sm">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-200">{item.label}</div>
                <div className="mt-0.5 text-xs font-semibold">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-2.5">
        <div className="grid h-full min-h-0 gap-2.5 xl:grid-cols-[208px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-2.5 py-2.5">
              <div className="flex items-center gap-2 text-slate-900">
                <Layers3 className="size-4 text-slate-600" />
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em]">Setup Map</h2>
              </div>
            </div>

            <div className="space-y-1 overflow-y-auto p-1.5">
              {setupSections.map((section, index) => {
                const Icon = section.icon;
                const isActive = resolvedActiveSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full rounded-lg border px-2 py-1.5 text-left transition-all ${
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`mt-0.5 rounded-md border p-1.5 ${
                          isActive ? 'border-white/20 bg-white/10 text-white' : toneClasses[section.tone]
                        }`}
                      >
                        <Icon className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] font-semibold">
                          {index + 1}. {section.name}
                        </div>
                          <ChevronRight className={`size-3.5 ${isActive ? 'text-white/80' : 'text-slate-400'}`} />
                        </div>
                        <div className={`mt-0.5 text-[11px] ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>{section.shortName}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-2.5 py-2.5 backdrop-blur-sm">
              <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ActiveSectionIcon className="size-4 text-slate-700" />
                    <h2 className="text-sm font-semibold text-slate-900">{activeSectionConfig.name}</h2>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneClasses[activeSectionConfig.tone]}`}>
                      Active Section
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-600">{activeSectionConfig.detail}</p>
                </div>
                <div className="text-[11px] font-medium text-slate-500">System administration</div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-2">{renderContent()}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
