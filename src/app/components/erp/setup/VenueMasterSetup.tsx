import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ChevronRight,
  Clock,
  Edit2,
  FileText,
  Info,
  Maximize2,
  MoreHorizontal,
  Phone,
  Plus,
  Power,
  Save,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '../../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { primeSpaceDataStore, subSpaceDataStore, venueDataStore } from '../../../lib/masterDataStore';
import { toast } from 'sonner';
import { SetupEmptyState } from './SetupEmptyState';
import { loadSetupAdvancePolicy, loadSetupDiscounts, loadSetupEventTypes, loadSetupTaxes } from './setupMasterData';
import {
  SetupAdminColumn,
  SetupAdminGrid,
  CompactFormSection,
  CompactHoursRow,
  CompactMetaRow,
  CompactStatsRow,
  InlineSummarySection,
} from './SetupCompactPrimitives';

interface Venue {
  id: string;
  venueName: string;
  venueCode: string;
  venueType: string;
  city: string;
  area: string;
  address: string;
  landmark?: string;
  postalCode?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  alternatePhone?: string;
  totalCapacity?: number;
  totalArea?: number;
  parkingCapacity?: number;
  numberOfHalls?: number;
  numberOfMarquees?: number;
  numberOfLawns?: number;
  defaultTaxGroup: string;
  balanceDueDaysBeforeEvent?: number;
  securityDeposit?: number;
  overtimeChargesPerHour?: number;
  operatingHoursStart?: string;
  operatingHoursEnd?: string;
  weeklyOffDay?: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  notes?: string;
}

interface VenueSummaryPrimeSpace {
  id: string;
  venueId: string;
  spaceName?: string;
  spaceType?: string;
  sizeValue?: number | string;
  sizeUnit?: string;
  defaultSeatingCapacity?: number | string;
  minimumGuests?: number | string;
  maximumGuests?: number | string;
  minimumAdvanceAmount?: number | string;
  defaultTaxGroup?: string;
  balanceDueDaysBeforeEvent?: number | string;
  securityDeposit?: number | string;
  overtimeChargesPerHour?: number | string;
  allowSubSpaces?: boolean;
  isActive?: boolean;
}

interface VenueSummarySubSpace {
  id: string;
  primeSpaceId: string;
  isActive?: boolean;
}

interface VenueSetupSummary {
  totalCapacity: number;
  totalCapacityLabel: string;
  listCapacityLabel: string;
  totalAreaLabel: string;
  primeSpaceCount: number;
  activePrimeSpaceCount: number;
  activePrimeSpaceLabel: string;
  subSpaceCount: number;
  activeSubSpaceCount: number;
  activeSubSpaceLabel: string;
  divisiblePrimeSpaceCount: number;
  spaceTypeLabel: string;
  guestRangeLabel: string;
  defaultTaxGroupLabel: string;
  balanceDueLabel: string;
  securityDepositLabel: string;
  overtimeLabel: string;
  minimumAdvanceLabel: string;
  advancePolicyLabel: string;
  activeEventTypeCount: number;
  activeTaxRuleCount: number;
  activeDiscountCount: number;
  eventContentsLabel: string;
}

interface VenueType {
  id: string;
  name: string;
  isCustom?: boolean;
}

interface VenueMasterSetupProps {
  userName: string;
  compact?: boolean;
}

const LEGACY_SAMPLE_VENUE_SIGNATURES = new Set([
  'VEN001|Aiwan-e-Akbari|Lahore|Main Ferozepur Road Opposite Metro Station No.23|Admin',
  'VEN002|Taj Mahal|Lahore|9-Abu Baker Block Garden Town|Admin',
  'VEN003|Pearl Marquee & Lawn|Lahore|Johar Town|Admin',
]);

const EMPTY_VENUE_SETUP_SUMMARY: VenueSetupSummary = {
  totalCapacity: 0,
  totalCapacityLabel: '- guests',
  listCapacityLabel: '-',
  totalAreaLabel: '-',
  primeSpaceCount: 0,
  activePrimeSpaceCount: 0,
  activePrimeSpaceLabel: '0 active',
  subSpaceCount: 0,
  activeSubSpaceCount: 0,
  activeSubSpaceLabel: '0 active',
  divisiblePrimeSpaceCount: 0,
  spaceTypeLabel: '-',
  guestRangeLabel: '-',
  defaultTaxGroupLabel: '-',
  balanceDueLabel: '-',
  securityDepositLabel: '-',
  overtimeLabel: '-',
  minimumAdvanceLabel: '-',
  advancePolicyLabel: '-',
  activeEventTypeCount: 0,
  activeTaxRuleCount: 0,
  activeDiscountCount: 0,
  eventContentsLabel: '0 event types',
};

const SPACE_TYPE_LABELS: Record<string, string> = {
  hall: 'Hall',
  marquee: 'Marquee',
  lawn: 'Lawn',
  poolside: 'Poolside',
  rooftop: 'Rooftop',
  ballroom: 'Ballroom',
  terrace: 'Terrace',
};

function isLegacySampleVenue(venue: Venue) {
  return LEGACY_SAMPLE_VENUE_SIGNATURES.has(
    [venue.venueCode, venue.venueName, venue.city, venue.area, venue.createdBy].join('|'),
  );
}

function sanitizeLoadedVenues(venues: Venue[]) {
  return venues.filter((venue) => !isLegacySampleVenue(venue));
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toPositiveNumber(value: unknown) {
  const parsed = toNumber(value);
  return parsed > 0 ? parsed : 0;
}

function formatInteger(value: number) {
  return Math.round(value).toLocaleString('en-US');
}

function formatMoney(value: number) {
  return `Rs ${formatInteger(value)}`;
}

function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${formatInteger(value)} ${value === 1 ? singular : plural}`;
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function uniquePositiveNumbers(values: unknown[]) {
  return Array.from(new Set(values.map(toPositiveNumber).filter(Boolean))).sort((a, b) => a - b);
}

function formatUniqueStrings(values: Array<string | undefined>) {
  const uniqueValues = uniqueStrings(values);
  if (uniqueValues.length === 0) return '-';
  if (uniqueValues.length <= 3) return uniqueValues.join(', ');
  return `${uniqueValues.slice(0, 3).join(', ')} +${uniqueValues.length - 3}`;
}

function formatNumberSet(values: unknown[], suffix = '') {
  const uniqueValues = uniquePositiveNumbers(values);
  if (uniqueValues.length === 0) return '-';
  if (uniqueValues.length === 1) return `${formatInteger(uniqueValues[0])}${suffix}`;
  if (uniqueValues.length <= 3) return `${uniqueValues.map(formatInteger).join(', ')}${suffix}`;
  return `${formatInteger(uniqueValues[0])}-${formatInteger(uniqueValues[uniqueValues.length - 1])}${suffix}`;
}

function formatMoneySet(values: unknown[]) {
  const uniqueValues = uniquePositiveNumbers(values);
  if (uniqueValues.length === 0) return '-';
  if (uniqueValues.length === 1) return formatMoney(uniqueValues[0]);
  if (uniqueValues.length <= 3) return uniqueValues.map(formatMoney).join(', ');
  return `${formatMoney(uniqueValues[0])}-${formatMoney(uniqueValues[uniqueValues.length - 1])}`;
}

function formatAreaSummary(spaces: VenueSummaryPrimeSpace[]) {
  const areaByUnit = spaces.reduce<Record<string, number>>((acc, space) => {
    const size = toPositiveNumber(space.sizeValue);
    if (!size) return acc;

    const unit = space.sizeUnit === 'sqm' ? 'sq m' : 'sq ft';
    acc[unit] = (acc[unit] ?? 0) + size;
    return acc;
  }, {});

  const entries = Object.entries(areaByUnit);
  if (entries.length === 0) return '-';

  return entries.map(([unit, total]) => `${formatInteger(total)} ${unit}`).join(' + ');
}

function formatSpaceTypeSummary(spaces: VenueSummaryPrimeSpace[]) {
  const counts = spaces.reduce<Record<string, number>>((acc, space) => {
    const typeKey = space.spaceType?.trim() || 'space';
    const label = SPACE_TYPE_LABELS[typeKey] || typeKey.replace(/-/g, ' ');
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

  const entries = Object.entries(counts);
  if (entries.length === 0) return '-';

  return entries
    .slice(0, 3)
    .map(([label, count]) => `${formatInteger(count)} ${label}`)
    .join(', ');
}

function formatGuestRange(spaces: VenueSummaryPrimeSpace[]) {
  const minimumGuests = spaces.map((space) => toPositiveNumber(space.minimumGuests)).filter(Boolean);
  const maximumGuests = spaces.map((space) => toPositiveNumber(space.maximumGuests)).filter(Boolean);

  if (minimumGuests.length === 0 && maximumGuests.length === 0) return '-';

  const min = minimumGuests.length > 0 ? Math.min(...minimumGuests) : 0;
  const max = maximumGuests.length > 0 ? Math.max(...maximumGuests) : 0;

  return `${min ? formatInteger(min) : '-'}-${max ? formatInteger(max) : '-'} guests`;
}

function formatAdvancePolicySummary() {
  const policy = loadSetupAdvancePolicy();
  if (!policy.isActive) return 'Inactive';

  return `Prime ${formatMoney(policy.primeSpaceMinimumAdvance)} / Sub ${formatMoney(
    policy.subSpaceMinimumAdvance,
  )} / due ${formatInteger(policy.dueDaysAfterBooking)} days`;
}

function buildVenueSetupSummaries(venues: Venue[]) {
  const summaries = new Map<string, VenueSetupSummary>();
  const allPrimeSpaces = primeSpaceDataStore.getPrimeSpaces([] as VenueSummaryPrimeSpace[]);
  const allSubSpaces = subSpaceDataStore.getSubSpaces([] as VenueSummarySubSpace[]);
  const activeEventTypeCount = loadSetupEventTypes().filter((eventType) => eventType.isActive !== false).length;
  const activeTaxRuleCount = loadSetupTaxes().filter((tax) => tax.isActive !== false).length;
  const activeDiscountCount = loadSetupDiscounts().filter((discount) => discount.isActive !== false).length;
  const advancePolicyLabel = formatAdvancePolicySummary();
  const eventContentsLabel = [
    formatCount(activeEventTypeCount, 'event type'),
    formatCount(activeTaxRuleCount, 'tax rule'),
    formatCount(activeDiscountCount, 'discount'),
  ].join(' / ');

  for (const venue of venues) {
    const venuePrimeSpaces = allPrimeSpaces.filter((space) => space.venueId === venue.id);
    const activePrimeSpaces = venuePrimeSpaces.filter((space) => space.isActive !== false);
    const activePrimeSpaceIds = new Set(activePrimeSpaces.map((space) => space.id));
    const venueSubSpaces = allSubSpaces.filter((space) => activePrimeSpaceIds.has(space.primeSpaceId));
    const activeSubSpaces = venueSubSpaces.filter((space) => space.isActive !== false);
    const totalCapacity = activePrimeSpaces.reduce(
      (total, space) => total + toPositiveNumber(space.defaultSeatingCapacity),
      0,
    );

    summaries.set(venue.id, {
      totalCapacity,
      totalCapacityLabel: totalCapacity > 0 ? `${formatInteger(totalCapacity)} guests` : '- guests',
      listCapacityLabel: totalCapacity > 0 ? formatInteger(totalCapacity) : '-',
      totalAreaLabel: formatAreaSummary(activePrimeSpaces),
      primeSpaceCount: venuePrimeSpaces.length,
      activePrimeSpaceCount: activePrimeSpaces.length,
      activePrimeSpaceLabel:
        activePrimeSpaces.length > 0
          ? `${formatCount(activePrimeSpaces.length, 'active space')}`
          : '0 active',
      subSpaceCount: venueSubSpaces.length,
      activeSubSpaceCount: activeSubSpaces.length,
      activeSubSpaceLabel:
        activeSubSpaces.length > 0
          ? `${formatCount(activeSubSpaces.length, 'active sub-space')}`
          : '0 active',
      divisiblePrimeSpaceCount: activePrimeSpaces.filter((space) => space.allowSubSpaces).length,
      spaceTypeLabel: formatSpaceTypeSummary(activePrimeSpaces),
      guestRangeLabel: formatGuestRange(activePrimeSpaces),
      defaultTaxGroupLabel: formatUniqueStrings(activePrimeSpaces.map((space) => space.defaultTaxGroup)),
      balanceDueLabel: formatNumberSet(
        activePrimeSpaces.map((space) => space.balanceDueDaysBeforeEvent),
        ' days',
      ),
      securityDepositLabel: formatMoneySet(activePrimeSpaces.map((space) => space.securityDeposit)),
      overtimeLabel: formatMoneySet(activePrimeSpaces.map((space) => space.overtimeChargesPerHour)),
      minimumAdvanceLabel: formatMoneySet(activePrimeSpaces.map((space) => space.minimumAdvanceAmount)),
      advancePolicyLabel,
      activeEventTypeCount,
      activeTaxRuleCount,
      activeDiscountCount,
      eventContentsLabel,
    });
  }

  return summaries;
}

function ErpSection({
  title,
  children,
  first = false,
}: {
  title: string;
  children: ReactNode;
  first?: boolean;
}) {
  return (
    <section className={`space-y-2.5 ${first ? '' : 'border-t border-slate-200 pt-3'}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</div>
      {children}
    </section>
  );
}

function SummaryMetric({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-900">{value || '-'}</div>
      {hint ? <div className="mt-1 break-words text-[11px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

function ErpFieldRow({
  label,
  children,
  required = false,
  hint,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5 xl:grid-cols-[152px_minmax(0,1fr)] xl:items-center">
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </div>
      <div className="min-w-0">
        {children}
        {hint ? <div className="mt-1 text-[10px] text-slate-500">{hint}</div> : null}
      </div>
    </div>
  );
}

export function VenueMasterSetup({ userName, compact = false }: VenueMasterSetupProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editedVenue, setEditedVenue] = useState<Venue | null>(null);
  const [customVenueType, setCustomVenueType] = useState('');
  const [showCustomTypeInput, setShowCustomTypeInput] = useState(false);
  const [selectionBeforeCreate, setSelectionBeforeCreate] = useState<string | null>(null);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);

  useEffect(() => {
    const loadVenues = () => {
      const storedVenues = venueDataStore.getVenues([] as Venue[]);
      const sanitizedVenues = sanitizeLoadedVenues(storedVenues);

      if (sanitizedVenues.length !== storedVenues.length) {
        venueDataStore.saveVenues(sanitizedVenues);
      }

      setVenues(sanitizedVenues);
      setSelectedVenueId((current) =>
        current && sanitizedVenues.some((venue) => venue.id === current)
          ? current
          : (sanitizedVenues[0]?.id ?? null),
      );
    };

    loadVenues();

    const handleMasterDataChange = () => {
      setSummaryRefreshKey((current) => current + 1);

      if (!isEditing && !isCreating) {
        loadVenues();
      }
    };

    window.addEventListener('storage', handleMasterDataChange);
    window.addEventListener('masterDataUpdated', handleMasterDataChange);

    return () => {
      window.removeEventListener('storage', handleMasterDataChange);
      window.removeEventListener('masterDataUpdated', handleMasterDataChange);
    };
  }, [isCreating, isEditing]);

  const venueTypes: VenueType[] = [
    { id: 'hotel', name: 'Hotel' },
    { id: 'standalone', name: 'Standalone Banquet' },
    { id: 'marqueeshalls', name: 'Marquees & Halls' },
    { id: 'club', name: 'Club / Community Center' },
    { id: 'outdoor', name: 'Outdoor Venue / Lawn' },
    { id: 'resort', name: 'Resort / Farmhouse' },
    { id: 'custom', name: 'Custom', isCustom: true },
  ];

  const filteredVenues = venues.filter(
    (venue) =>
      venue.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.venueCode.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedVenue = venues.find((venue) => venue.id === selectedVenueId) ?? null;

  const handleCreateNew = () => {
    const newVenue: Venue = {
      id: `temp-${Date.now()}`,
      venueName: '',
      venueCode: `VEN${String(venues.length + 1).padStart(3, '0')}`,
      venueType: '',
      city: '',
      area: '',
      address: '',
      defaultTaxGroup: '',
      isActive: true,
      createdAt: new Date(),
      createdBy: userName,
    };
    setSelectionBeforeCreate(selectedVenueId);
    setEditedVenue(newVenue);
    setSelectedVenueId(newVenue.id);
    setCustomVenueType('');
    setShowCustomTypeInput(false);
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEdit = () => {
    if (selectedVenue) {
      setEditedVenue({ ...selectedVenue });
      const hasKnownVenueType = venueTypes.some((type) => !type.isCustom && type.id === selectedVenue.venueType);
      setShowCustomTypeInput(Boolean(selectedVenue.venueType) && !hasKnownVenueType);
      setCustomVenueType(hasKnownVenueType ? '' : (selectedVenue.venueType || ''));
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (!editedVenue) return;

    if (isCreating) {
      const newVenue: Venue = {
        ...editedVenue,
        id: Date.now().toString(),
        createdAt: new Date(),
        createdBy: userName,
      };
      const nextVenues = [...venues, newVenue];
      setVenues(nextVenues);
      venueDataStore.saveVenues(nextVenues);
      setSelectedVenueId(newVenue.id);
      setIsCreating(false);
      setSelectionBeforeCreate(null);
    } else {
      const updatedVenue: Venue = {
        ...editedVenue,
        updatedAt: new Date(),
        updatedBy: userName,
      };
      const nextVenues = 
        venues.map((v) =>
          v.id === updatedVenue.id
            ? updatedVenue
            : v
        );
      setVenues(nextVenues);
      venueDataStore.saveVenues(nextVenues);
      setSelectedVenueId(updatedVenue.id);
    }

    setIsEditing(false);
    setEditedVenue(null);
    toast.success('Venue saved', {
      description: 'Venue changes are saved locally and queued for backend sync.',
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedVenue(null);
    setShowCustomTypeInput(false);
    setCustomVenueType('');
    if (isCreating) {
      setSelectedVenueId(selectionBeforeCreate ?? venues[0]?.id ?? null);
      setIsCreating(false);
      setSelectionBeforeCreate(null);
    }
  };

  const handleDelete = () => {
    if (!selectedVenue || !window.confirm(`Are you sure you want to delete "${selectedVenue.venueName}"?`)) {
      return;
    }

    const remainingVenues = venues.filter((v) => v.id !== selectedVenue.id);
    setVenues(remainingVenues);
    venueDataStore.saveVenues(remainingVenues);
    setSelectedVenueId(remainingVenues[0]?.id ?? null);
    toast.success('Venue deleted', {
      description: 'The venue removal is saved locally and queued for backend sync.',
    });
  };

  const handleToggleStatus = () => {
    if (!selectedVenue) return;

    const updatedVenue = { ...selectedVenue, isActive: !selectedVenue.isActive };
    const nextVenues = venues.map((v) => (v.id === selectedVenue.id ? updatedVenue : v));
    setVenues(nextVenues);
    venueDataStore.saveVenues(nextVenues);
    setSelectedVenueId(updatedVenue.id);
    toast.success(`Venue ${updatedVenue.isActive ? 'activated' : 'deactivated'}`);
  };

  const activeVenue = editedVenue || selectedVenue;
  const venueSetupSummaryById = useMemo(() => buildVenueSetupSummaries(venues), [venues, summaryRefreshKey]);
  const getVenueSetupSummary = (venueId?: string | null) =>
    venueId ? (venueSetupSummaryById.get(venueId) ?? EMPTY_VENUE_SETUP_SUMMARY) : EMPTY_VENUE_SETUP_SUMMARY;
  const activeVenueSummary = getVenueSetupSummary(activeVenue?.id);
  const inputStateClass = `${compact ? 'h-9 text-sm' : 'h-9'} ${!isEditing ? 'bg-slate-50 text-slate-700' : ''}`.trim();
  const textareaStateClass = !isEditing ? 'bg-slate-50 text-slate-700' : '';
  const selectStateClass = `h-9 w-full rounded-md border border-slate-200 ${compact ? 'px-2.5 text-sm' : 'px-3 py-1.5 text-sm'} focus:border-emerald-500 focus:outline-none ${
    !isEditing ? 'bg-slate-50 text-slate-600' : 'bg-white'
  }`;
  const sectionClass = `rounded-lg border border-slate-200 bg-white ${compact ? 'p-3' : 'p-3.5'}`;
  const sectionTitleClass = 'mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-slate-900';
  const formatVenueDate = (value?: Date | string) => {
    if (!value) return 'Unknown date';
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'Unknown date' : parsed.toLocaleDateString('en-PK');
  };
  const updateEditedVenue = (changes: Partial<Venue>) => {
    if (!activeVenue) return;
    setEditedVenue({ ...activeVenue, ...changes });
  };
  const hasKnownVenueType = (value?: string) => venueTypes.some((type) => !type.isCustom && type.id === value);
  const getVenueTypeLabel = (value?: string) =>
    venueTypes.find((type) => type.id === value)?.name || value || 'Not set';
  const activeVenueTypeSelectValue = activeVenue
    ? hasKnownVenueType(activeVenue.venueType)
      ? activeVenue.venueType
      : activeVenue.venueType
        ? 'custom'
        : ''
    : '';
  const compactInputClass =
    'h-8 border-slate-200 bg-white px-2.5 text-sm shadow-none disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-700 disabled:opacity-100';
  const compactSelectClass =
    'h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm shadow-none outline-none focus:border-slate-400 disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-700 disabled:opacity-100';
  const compactTextAreaClass =
    'min-h-24 border-slate-200 bg-white px-2.5 py-2 text-sm shadow-none disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-700 disabled:opacity-100';

  if (compact) {
    return (
      <div className="grid h-full min-h-0 grid-cols-1 border-y border-slate-200 bg-white xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-white xl:border-r xl:border-b-0">
          <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search venue"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 border-slate-200 pl-8 text-sm shadow-none"
              />
            </div>
            <Button onClick={handleCreateNew} size="sm" className="h-8 bg-slate-900 px-3 hover:bg-slate-800">
              <Plus className="mr-1 size-3.5" />
              New
            </Button>
          </div>

          <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
            {filteredVenues.length} venue records
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {filteredVenues.length === 0 ? (
              <div className="p-4">
                <SetupEmptyState
                  icon={Building2}
                  title="No venues found"
                  description="Create a venue to start configuring reservation inventory."
                  compact
                />
              </div>
            ) : (
              <table className="w-full table-fixed text-sm">
                <thead className="sticky top-0 z-[1] bg-white">
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    <th className="w-20 px-3 py-2 text-left font-medium">Code</th>
                    <th className="px-3 py-2 text-left font-medium">Venue</th>
                    <th className="w-16 px-3 py-2 text-right font-medium">Cap</th>
                    <th className="w-12 px-3 py-2 text-center font-medium">St</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVenues.map((venue) => {
                    const isSelected = selectedVenue?.id === venue.id;
                    const venueSummary = getVenueSetupSummary(venue.id);

                    return (
                      <tr
                        key={venue.id}
                        onClick={() => {
                          if (!isEditing) {
                            setSelectedVenueId(venue.id);
                          }
                        }}
                        className={`border-b border-slate-100 align-top transition-colors ${
                          isSelected ? 'bg-slate-100/80' : 'hover:bg-slate-50'
                        } ${isEditing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      >
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{venue.venueCode}</td>
                        <td className="px-3 py-2">
                          <div className="truncate font-medium text-slate-900">{venue.venueName || 'Unnamed Venue'}</div>
                          <div className="truncate text-[11px] text-slate-500">{getVenueTypeLabel(venue.venueType)}</div>
                        </td>
                        <td className="px-3 py-2 text-right text-[12px] text-slate-700">
                          {venueSummary.listCapacityLabel}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-block size-2 rounded-full ${
                              venue.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                            title={venue.isActive ? 'Active' : 'Inactive'}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-white">
          {!activeVenue ? (
            <SetupEmptyState icon={Building2} title="No venue selected" description="Select a venue record to begin data entry." />
          ) : (
            <>
              <div className="border-b border-slate-200 px-4 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                      <Building2 className="size-4 text-slate-500" />
                      <span className="truncate">{isCreating ? 'New Venue' : activeVenue.venueName || 'Unnamed Venue'}</span>
                      <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600">
                        {activeVenue.venueCode}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                          activeVenue.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {activeVenue.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <span>Type: {getVenueTypeLabel(activeVenue.venueType)}</span>
                      <span>Created: {formatVenueDate(activeVenue.createdAt)}</span>
                      {!isCreating ? <span>Owner: {activeVenue.createdBy}</span> : null}
                    </div>
                  </div>

                  {!isEditing ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 border-slate-200 px-3 shadow-none">
                          <MoreHorizontal className="mr-1 size-4" />
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={handleEdit}>
                          <Edit2 className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleToggleStatus}>
                          <Power className="size-4" />
                          {activeVenue.isActive ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        {!isCreating ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={handleDelete} className="text-red-600 focus:text-red-700">
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button onClick={handleCancel} variant="outline" size="sm" className="h-8 border-slate-200 px-3 shadow-none">
                        Cancel
                      </Button>
                      <Button onClick={handleSave} size="sm" className="h-8 bg-slate-900 px-3 hover:bg-slate-800">
                        <Save className="mr-1 size-4" />
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-3 border-b border-slate-200 bg-slate-50/60 px-4 py-2 text-[11px] text-slate-600 xl:grid-cols-4">
                <div>
                  <span className="uppercase tracking-[0.12em] text-slate-400">Capacity</span>
                  <div className="mt-0.5 font-medium text-slate-900">{activeVenueSummary.totalCapacityLabel}</div>
                </div>
                <div>
                  <span className="uppercase tracking-[0.12em] text-slate-400">Prime Spaces</span>
                  <div className="mt-0.5 font-medium text-slate-900">{activeVenueSummary.activePrimeSpaceLabel}</div>
                </div>
                <div>
                  <span className="uppercase tracking-[0.12em] text-slate-400">Sub Spaces</span>
                  <div className="mt-0.5 font-medium text-slate-900">{activeVenueSummary.activeSubSpaceLabel}</div>
                </div>
                <div>
                  <span className="uppercase tracking-[0.12em] text-slate-400">Event Contents</span>
                  <div className="mt-0.5 font-medium text-slate-900">{activeVenueSummary.eventContentsLabel}</div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <ErpSection title="Core Profile" first>
                      <div className="grid gap-x-6 gap-y-2 2xl:grid-cols-2">
                        <ErpFieldRow label="Venue Name" required>
                          <Input
                            value={activeVenue.venueName}
                            onChange={(e) => updateEditedVenue({ venueName: e.target.value })}
                            disabled={!isEditing}
                            placeholder="Enter venue name"
                            className={compactInputClass}
                          />
                        </ErpFieldRow>
                        <ErpFieldRow label="Venue Code" required>
                          <Input
                            value={activeVenue.venueCode}
                            onChange={(e) => updateEditedVenue({ venueCode: e.target.value })}
                            disabled={!isEditing}
                            placeholder="Auto-generated"
                            className={compactInputClass}
                          />
                        </ErpFieldRow>
                        <ErpFieldRow label="Venue Type" required>
                          <div className="space-y-1.5">
                            <select
                              value={activeVenueTypeSelectValue}
                              onChange={(e) => {
                                if (e.target.value === 'custom') {
                                  setShowCustomTypeInput(true);
                                  updateEditedVenue({ venueType: customVenueType || '' });
                                  return;
                                }

                                setShowCustomTypeInput(false);
                                setCustomVenueType('');
                                updateEditedVenue({ venueType: e.target.value });
                              }}
                              disabled={!isEditing}
                              className={compactSelectClass}
                            >
                              <option value="">Select venue type</option>
                              {venueTypes.map((type) => (
                                <option key={type.id} value={type.id}>
                                  {type.name}
                                </option>
                              ))}
                            </select>
                            {showCustomTypeInput ? (
                              <Input
                                value={customVenueType}
                                onChange={(e) => {
                                  setCustomVenueType(e.target.value);
                                  updateEditedVenue({ venueType: e.target.value });
                                }}
                                disabled={!isEditing}
                                placeholder="Enter custom venue type"
                                className={compactInputClass}
                              />
                            ) : null}
                          </div>
                        </ErpFieldRow>
                        <ErpFieldRow label="Contact Person">
                          <Input
                            value={activeVenue.contactPerson || ''}
                            onChange={(e) => updateEditedVenue({ contactPerson: e.target.value })}
                            disabled={!isEditing}
                            placeholder="Enter contact person"
                            className={compactInputClass}
                          />
                        </ErpFieldRow>
                        <ErpFieldRow label="City">
                          <Input
                            value={activeVenue.city || ''}
                            onChange={(e) => updateEditedVenue({ city: e.target.value })}
                            disabled={!isEditing}
                            placeholder="Enter city"
                            className={compactInputClass}
                          />
                        </ErpFieldRow>
                        <ErpFieldRow label="Area">
                          <Input
                            value={activeVenue.area || ''}
                            onChange={(e) => updateEditedVenue({ area: e.target.value })}
                            disabled={!isEditing}
                            placeholder="Enter area"
                            className={compactInputClass}
                          />
                        </ErpFieldRow>
                      </div>
                    </ErpSection>

                    <ErpSection title="Contact Matrix">
                      <div className="grid gap-x-6 gap-y-2 2xl:grid-cols-2">
                        <ErpFieldRow label="Primary Phone">
                          <Input
                            value={activeVenue.phone || ''}
                            onChange={(e) => updateEditedVenue({ phone: e.target.value })}
                            disabled={!isEditing}
                            placeholder="Enter primary phone"
                            className={compactInputClass}
                          />
                        </ErpFieldRow>
                        <ErpFieldRow label="Alternate Phone">
                          <Input
                            value={activeVenue.alternatePhone || ''}
                            onChange={(e) => updateEditedVenue({ alternatePhone: e.target.value })}
                            disabled={!isEditing}
                            placeholder="Enter alternate phone"
                            className={compactInputClass}
                          />
                        </ErpFieldRow>
                        <ErpFieldRow label="Email" hint="Primary booking mailbox">
                          <Input
                            type="email"
                            value={activeVenue.email || ''}
                            onChange={(e) => updateEditedVenue({ email: e.target.value })}
                            disabled={!isEditing}
                            placeholder="Enter email address"
                            className={compactInputClass}
                          />
                        </ErpFieldRow>
                      </div>
                    </ErpSection>
                  </div>

                  <div className="space-y-4">
                    <ErpSection title="Capacity And Operations" first>
                      <div className="grid gap-2 2xl:grid-cols-2">
                        <SummaryMetric
                          label="Total Capacity"
                          value={activeVenueSummary.totalCapacityLabel}
                          hint="Active Prime Spaces"
                        />
                        <SummaryMetric
                          label="Total Area"
                          value={activeVenueSummary.totalAreaLabel}
                          hint="Active Prime Spaces"
                        />
                        <SummaryMetric
                          label="Prime Spaces"
                          value={activeVenueSummary.activePrimeSpaceLabel}
                          hint={`${formatCount(activeVenueSummary.primeSpaceCount, 'total space')}`}
                        />
                        <SummaryMetric
                          label="Sub Spaces"
                          value={activeVenueSummary.activeSubSpaceLabel}
                          hint={`${formatCount(activeVenueSummary.divisiblePrimeSpaceCount, 'divisible prime')}`}
                        />
                        <SummaryMetric label="Space Types" value={activeVenueSummary.spaceTypeLabel} />
                        <SummaryMetric label="Guest Range" value={activeVenueSummary.guestRangeLabel} />
                        <SummaryMetric
                          label="Event Contents"
                          value={activeVenueSummary.eventContentsLabel}
                          hint="Event Types / Taxes / Discounts"
                        />
                        <SummaryMetric
                          label="Sub-Space Records"
                          value={formatCount(activeVenueSummary.subSpaceCount, 'configured sub-space')}
                          hint="Linked to active Prime Spaces"
                        />
                      </div>
                    </ErpSection>

                    <details className="border-t border-slate-200 pt-3">
                      <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Advanced
                      </summary>

                      <div className="mt-3 grid gap-5 xl:grid-cols-2">
                        <div className="space-y-4">
                          <ErpSection title="Address" first>
                            <div className="space-y-2">
                              <ErpFieldRow label="Address">
                                <Input
                                  value={activeVenue.address || ''}
                                  onChange={(e) => updateEditedVenue({ address: e.target.value })}
                                  disabled={!isEditing}
                                  placeholder="Enter address"
                                  className={compactInputClass}
                                />
                              </ErpFieldRow>
                              <ErpFieldRow label="Landmark">
                                <Input
                                  value={activeVenue.landmark || ''}
                                  onChange={(e) => updateEditedVenue({ landmark: e.target.value })}
                                  disabled={!isEditing}
                                  placeholder="Enter landmark"
                                  className={compactInputClass}
                                />
                              </ErpFieldRow>
                              <ErpFieldRow label="Postal Code">
                                <Input
                                  value={activeVenue.postalCode || ''}
                                  onChange={(e) => updateEditedVenue({ postalCode: e.target.value })}
                                  disabled={!isEditing}
                                  placeholder="Enter postal code"
                                  className={compactInputClass}
                                />
                              </ErpFieldRow>
                            </div>
                          </ErpSection>

                          <ErpSection title="Booking Defaults">
                            <div className="grid gap-2">
                              <SummaryMetric
                                label="Tax Groups"
                                value={activeVenueSummary.defaultTaxGroupLabel}
                                hint={`${formatCount(activeVenueSummary.activeTaxRuleCount, 'active tax rule')}`}
                              />
                              <SummaryMetric
                                label="Balance Due"
                                value={activeVenueSummary.balanceDueLabel}
                                hint="Prime Spaces"
                              />
                              <SummaryMetric
                                label="Security Deposit"
                                value={activeVenueSummary.securityDepositLabel}
                                hint="Prime Spaces"
                              />
                              <SummaryMetric
                                label="Overtime Per Hour"
                                value={activeVenueSummary.overtimeLabel}
                                hint="Prime Spaces"
                              />
                              <SummaryMetric
                                label="Minimum Advance"
                                value={activeVenueSummary.minimumAdvanceLabel}
                                hint="Prime Spaces"
                              />
                              <SummaryMetric
                                label="Advance Policy"
                                value={activeVenueSummary.advancePolicyLabel}
                                hint="Event Contents"
                              />
                            </div>
                          </ErpSection>
                        </div>

                        <ErpSection title="Notes And Audit" first>
                          <div className="space-y-3">
                            <ErpFieldRow label="Notes">
                              <Textarea
                                value={activeVenue.notes || ''}
                                onChange={(e) => updateEditedVenue({ notes: e.target.value })}
                                disabled={!isEditing}
                                rows={4}
                                placeholder="Operational notes, facilities, exceptions"
                                className={compactTextAreaClass}
                              />
                            </ErpFieldRow>

                            {!isCreating ? (
                              <div className="space-y-2 border-t border-slate-200 pt-3 text-[11px] text-slate-600">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="uppercase tracking-[0.12em] text-slate-400">Status</span>
                                  <span className="font-medium text-slate-900">
                                    {activeVenue.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="uppercase tracking-[0.12em] text-slate-400">Created</span>
                                  <span className="text-right font-medium text-slate-900">
                                    {formatVenueDate(activeVenue.createdAt)} by {activeVenue.createdBy}
                                  </span>
                                </div>
                                {activeVenue.updatedAt ? (
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="uppercase tracking-[0.12em] text-slate-400">Last Updated</span>
                                    <span className="text-right font-medium text-slate-900">
                                      {formatVenueDate(activeVenue.updatedAt)} by {activeVenue.updatedBy}
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </ErpSection>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className={`flex ${compact ? 'h-[calc(100vh-250px)] gap-2.5' : 'h-[calc(100vh-180px)] gap-3'}`}>
      <div className={`flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white ${compact ? 'w-[280px] max-w-[280px]' : 'w-72'}`}>
        <div className={`border-b border-slate-200 ${compact ? 'p-2.5' : 'p-3'}`}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
              <Building2 className="size-3.5 text-emerald-600" />
              Venues
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                {venues.length}
              </span>
            </h3>
            <Button
              onClick={handleCreateNew}
              className="h-8 bg-emerald-600 px-2.5 hover:bg-emerald-700"
              size="sm"
            >
              <Plus className="mr-1 size-4" />
              New
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-md border-slate-200 pl-9"
            />
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto bg-white ${compact ? 'p-1.5' : 'p-2'}`}>
          {filteredVenues.length === 0 ? (
            <div className="p-4">
              <SetupEmptyState
                icon={Building2}
                title="No venues found"
                description="Create a venue to start configuring reservation inventory."
                compact
              />
            </div>
          ) : (
            <div className="space-y-1">
              {filteredVenues.map((venue) => (
                <button
                  key={venue.id}
                  onClick={() => {
                    if (!isEditing) {
                      setSelectedVenueId(venue.id);
                    }
                  }}
                  disabled={isEditing}
                  className={`w-full rounded-md border ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'} text-left transition-colors ${
                    selectedVenue?.id === venue.id
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                  } ${isEditing ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-sm font-medium text-slate-900">{venue.venueName}</h4>
                        <span
                          className={`shrink-0 text-[11px] font-medium ${
                            venue.isActive
                              ? 'text-emerald-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {venue.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Users className="size-3" />
                          <span>{venue.totalCapacity || 'N/A'}</span>
                        </div>
                        <span>{venue.venueCode}</span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`mt-0.5 size-4 shrink-0 text-slate-400 ${
                        selectedVenue?.id === venue.id ? 'text-emerald-600' : ''
                      }`}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
        {!activeVenue ? (
          <SetupEmptyState icon={Building2} title="No venue selected" description="Select a venue from the list to view its details." />
        ) : (
          <>
            <div className={`sticky top-0 z-10 border-b border-slate-200 bg-white ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className={`mb-1 truncate font-semibold text-slate-900 ${compact ? 'text-base' : 'text-lg'}`}>
                    {isCreating ? 'Create New Venue' : activeVenue.venueName || 'Unnamed Venue'}
                  </h2>
                  <CompactMetaRow
                    items={[
                      <span key="code" className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono">
                        {activeVenue.venueCode}
                      </span>,
                      <span
                        key="status"
                        className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                          activeVenue.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {activeVenue.isActive ? 'Active' : 'Inactive'}
                      </span>,
                      ...(!isCreating
                        ? [
                            <span key="created">
                              {formatVenueDate(activeVenue.createdAt)}
                            </span>,
                          ]
                        : []),
                    ]}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {!isEditing ? (
                    <>
                      <Button
                        onClick={handleToggleStatus}
                        size="icon"
                        variant="outline"
                        title={activeVenue.isActive ? 'Deactivate' : 'Activate'}
                        aria-label={activeVenue.isActive ? 'Deactivate venue' : 'Activate venue'}
                        className={`h-8 w-8 ${
                          activeVenue.isActive
                            ? 'border-red-200 text-red-700 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        <Power className="size-4" />
                      </Button>
                      <Button
                        onClick={handleEdit}
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        title="Edit"
                        aria-label="Edit venue"
                      >
                        <Edit2 className="size-4" />
                      </Button>
                      {!isCreating && (
                        <Button
                          onClick={handleDelete}
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                          title="Delete"
                          aria-label="Delete venue"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button onClick={handleCancel} variant="outline" size="sm" className="h-8">
                        Cancel
                      </Button>
                      <Button onClick={handleSave} size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700">
                        <Save className="mr-1 size-4" />
                        Save
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className={`flex-1 overflow-y-auto bg-white ${compact ? 'p-2.5' : 'p-3.5'}`}>
              <div className={compact ? 'space-y-2.5' : 'space-y-3.5'}>
                <SetupAdminGrid>
                  <SetupAdminColumn>
                    <section className={sectionClass}>
                      <h3 className={sectionTitleClass}>
                        <Building2 className="size-4 text-emerald-600" />
                        Basic Information
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label className="mb-1.5 text-sm">
                            Venue Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={activeVenue.venueName}
                            onChange={(e) =>
                              setEditedVenue({ ...activeVenue, venueName: e.target.value })
                            }
                            disabled={!isEditing}
                            placeholder="e.g., Grand Banquet Hall"
                            className={inputStateClass}
                          />
                        </div>
                        <div>
                          <Label className="mb-1.5 text-sm">
                            Venue Code <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={activeVenue.venueCode}
                            onChange={(e) =>
                              setEditedVenue({ ...activeVenue, venueCode: e.target.value })
                            }
                            disabled={!isEditing}
                            placeholder="VEN001"
                            className={inputStateClass}
                          />
                        </div>
                        <div>
                          <Label className="mb-1.5 text-sm">
                            Venue Type <span className="text-red-500">*</span>
                          </Label>
                          <select
                            value={activeVenueTypeSelectValue}
                            onChange={(e) => {
                              if (e.target.value === 'custom') {
                                setShowCustomTypeInput(true);
                                setEditedVenue({
                                  ...activeVenue,
                                  venueType: customVenueType || '',
                                });
                                return;
                              } else {
                                setShowCustomTypeInput(false);
                                setCustomVenueType('');
                              }
                              setEditedVenue({
                                ...activeVenue,
                                venueType: e.target.value,
                              });
                            }}
                            disabled={!isEditing}
                            className={selectStateClass}
                          >
                            <option value="">Select venue type</option>
                            {venueTypes.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                          </select>
                          {showCustomTypeInput && (
                            <Input
                              value={customVenueType}
                              onChange={(e) => {
                                setCustomVenueType(e.target.value);
                                setEditedVenue({ ...activeVenue, venueType: e.target.value });
                              }}
                              disabled={!isEditing}
                              placeholder="Enter custom venue type"
                              className={`mt-2 ${inputStateClass}`}
                            />
                          )}
                        </div>
                        <div>
                          <Label className="mb-1.5 text-sm">Contact Person</Label>
                          <Input
                            value={activeVenue.contactPerson || ''}
                            onChange={(e) =>
                              setEditedVenue({ ...activeVenue, contactPerson: e.target.value })
                            }
                            disabled={!isEditing}
                            placeholder="Manager name"
                            className={inputStateClass}
                          />
                        </div>
                      </div>
                    </section>

                    <CompactFormSection title="Capacity & Specifications" icon={Users} iconClassName="text-emerald-600">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <Label className="mb-1 text-sm">Total Capacity</Label>
                          <Input
                            type="number"
                            value={activeVenue.totalCapacity || ''}
                            onChange={(e) =>
                              setEditedVenue({
                                ...activeVenue,
                                totalCapacity: parseInt(e.target.value) || undefined,
                              })
                            }
                            disabled={!isEditing}
                            placeholder="1500"
                            className={inputStateClass}
                          />
                          <p className="mt-0.5 text-[10px] text-slate-500">Guests</p>
                        </div>
                        <div>
                          <Label className="mb-1 text-sm">Total Area</Label>
                          <Input
                            type="number"
                            value={activeVenue.totalArea || ''}
                            onChange={(e) =>
                              setEditedVenue({
                                ...activeVenue,
                                totalArea: parseInt(e.target.value) || undefined,
                              })
                            }
                            disabled={!isEditing}
                            placeholder="25000"
                            className={inputStateClass}
                          />
                          <p className="mt-0.5 text-[10px] text-slate-500">Sq ft</p>
                        </div>
                        <div>
                          <Label className="mb-1 text-sm">Parking Capacity</Label>
                          <Input
                            type="number"
                            value={activeVenue.parkingCapacity || ''}
                            onChange={(e) =>
                              setEditedVenue({
                                ...activeVenue,
                                parkingCapacity: parseInt(e.target.value) || undefined,
                              })
                            }
                            disabled={!isEditing}
                            placeholder="200"
                            className={inputStateClass}
                          />
                          <p className="mt-0.5 text-[10px] text-slate-500">Vehicles</p>
                        </div>
                        <div>
                          <Label className="mb-1 text-sm">Number of Halls</Label>
                          <Input
                            type="number"
                            value={activeVenue.numberOfHalls || ''}
                            onChange={(e) =>
                              setEditedVenue({
                                ...activeVenue,
                                numberOfHalls: parseInt(e.target.value) || undefined,
                              })
                            }
                            disabled={!isEditing}
                            placeholder="5"
                            className={inputStateClass}
                          />
                          <p className="mt-0.5 text-[10px] text-slate-500">Halls</p>
                        </div>
                      </div>
                    </CompactFormSection>
                  </SetupAdminColumn>

                  <SetupAdminColumn>
                    <section className={sectionClass}>
                      <h3 className={sectionTitleClass}>
                        <Phone className="size-4 text-emerald-600" />
                        Contact Information
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label className="mb-1.5 text-sm">Primary Phone</Label>
                          <Input
                            value={activeVenue.phone || ''}
                            onChange={(e) => setEditedVenue({ ...activeVenue, phone: e.target.value })}
                            disabled={!isEditing}
                            placeholder="+92 42 1234567"
                            className={inputStateClass}
                          />
                        </div>
                        <div>
                          <Label className="mb-1.5 text-sm">Alternate Phone</Label>
                          <Input
                            value={activeVenue.alternatePhone || ''}
                            onChange={(e) =>
                              setEditedVenue({ ...activeVenue, alternatePhone: e.target.value })
                            }
                            disabled={!isEditing}
                            placeholder="+92 300 1234567"
                            className={inputStateClass}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="mb-1.5 text-sm">Email Address</Label>
                          <Input
                            type="email"
                            value={activeVenue.email || ''}
                            onChange={(e) => setEditedVenue({ ...activeVenue, email: e.target.value })}
                            disabled={!isEditing}
                            placeholder="info@venue.com"
                            className={inputStateClass}
                          />
                        </div>
                      </div>
                    </section>

                    {(activeVenue.venueType === 'marqueeshalls' ||
                      activeVenue.venueType?.toLowerCase().includes('marque')) && (
                      <InlineSummarySection
                        title="Marquees & Halls Configuration"
                        icon={Building2}
                        iconClassName="text-blue-600"
                        hint={
                          <span
                            title="Use only for venues with separate covered marquee and lawn counts."
                            className="inline-flex size-4 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-700 align-middle"
                          >
                            <Info className="size-3" />
                          </span>
                        }
                      >
                        <div className="grid gap-2 md:grid-cols-2">
                          <div>
                            <Label className="mb-1 text-sm">Number of Marquees</Label>
                            <Input
                              type="number"
                              value={activeVenue.numberOfMarquees || ''}
                              onChange={(e) =>
                                setEditedVenue({
                                  ...activeVenue,
                                  numberOfMarquees: parseInt(e.target.value) || undefined,
                                })
                              }
                              disabled={!isEditing}
                              placeholder="3"
                              className={inputStateClass}
                            />
                            <p className="mt-0.5 text-[10px] text-slate-500">Marquees / tents</p>
                          </div>
                          <div>
                            <Label className="mb-1 text-sm">Number of Lawns</Label>
                            <Input
                              type="number"
                              value={activeVenue.numberOfLawns || ''}
                              onChange={(e) =>
                                setEditedVenue({
                                  ...activeVenue,
                                  numberOfLawns: parseInt(e.target.value) || undefined,
                                })
                              }
                              disabled={!isEditing}
                              placeholder="2"
                              className={inputStateClass}
                            />
                            <p className="mt-0.5 text-[10px] text-slate-500">Lawn areas</p>
                          </div>
                        </div>
                      </InlineSummarySection>
                    )}

                    <CompactFormSection title="Operating Hours" icon={Clock} iconClassName="text-emerald-600">
                      <CompactHoursRow>
                        <div>
                          <Label className="mb-1 text-sm">Opening Time</Label>
                          <Input
                            type="time"
                            value={activeVenue.operatingHoursStart || ''}
                            onChange={(e) =>
                              setEditedVenue({ ...activeVenue, operatingHoursStart: e.target.value })
                            }
                            disabled={!isEditing}
                            className={inputStateClass}
                          />
                        </div>
                        <div>
                          <Label className="mb-1 text-sm">Closing Time</Label>
                          <Input
                            type="time"
                            value={activeVenue.operatingHoursEnd || ''}
                            onChange={(e) =>
                              setEditedVenue({ ...activeVenue, operatingHoursEnd: e.target.value })
                            }
                            disabled={!isEditing}
                            className={inputStateClass}
                          />
                        </div>
                        <div>
                          <Label className="mb-1 text-sm">Weekly Off Day</Label>
                          <select
                            value={activeVenue.weeklyOffDay || 'none'}
                            onChange={(e) =>
                              setEditedVenue({ ...activeVenue, weeklyOffDay: e.target.value })
                            }
                            disabled={!isEditing}
                            className={selectStateClass}
                          >
                            <option value="none">None (Open 7 days)</option>
                            <option value="monday">Monday</option>
                            <option value="tuesday">Tuesday</option>
                            <option value="wednesday">Wednesday</option>
                            <option value="thursday">Thursday</option>
                            <option value="friday">Friday</option>
                            <option value="saturday">Saturday</option>
                            <option value="sunday">Sunday</option>
                          </select>
                        </div>
                      </CompactHoursRow>
                    </CompactFormSection>

                    <details className={sectionClass}>
                      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-900">
                        <FileText className="size-4 text-emerald-600" />
                        Additional Notes
                      </summary>
                      <div className="mt-3">
                        <Textarea
                          value={activeVenue.notes || ''}
                          onChange={(e) => setEditedVenue({ ...activeVenue, notes: e.target.value })}
                          disabled={!isEditing}
                          rows={3}
                          placeholder="Any additional information about the venue, facilities, amenities, etc."
                          className={textareaStateClass}
                        />
                      </div>
                    </details>

                    {!isCreating && (
                      <InlineSummarySection title="Record Information" icon={FileText} iconClassName="text-slate-500">
                        <CompactStatsRow
                          items={[
                            {
                              label: 'Status',
                              value: (
                                <span
                                  className={`rounded px-2 py-1 text-xs font-medium ${
                                    activeVenue.isActive
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {activeVenue.isActive ? 'Active' : 'Inactive'}
                                </span>
                              ),
                            },
                            {
                              label: 'Created',
                              value: `${formatVenueDate(activeVenue.createdAt)} by ${activeVenue.createdBy}`,
                            },
                            ...(activeVenue.updatedAt
                              ? [
                                  {
                                    label: 'Last Updated',
                                    value: `${formatVenueDate(activeVenue.updatedAt)} by ${activeVenue.updatedBy}`,
                                  },
                                ]
                              : []),
                          ]}
                          columnsClassName="md:grid-cols-2"
                        />
                      </InlineSummarySection>
                    )}
                  </SetupAdminColumn>
                </SetupAdminGrid>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
