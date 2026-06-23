import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Edit2,
  Layers,
  LayoutGrid,
  Maximize2,
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { subSpaceDataStore, primeSpaceDataStore, venueDataStore } from '../../../lib/masterDataStore';
import { toast } from 'sonner';
import { SetupEmptyState } from './SetupEmptyState';
import { loadSetupTaxes } from './setupMasterData';
import {
  CompactAccordionSection,
  SetupAdminColumn,
  SetupAdminGrid,
  CompactFormSection,
  CompactMetaRow,
  CompactStatsRow,
  InlineSummarySection,
} from './SetupCompactPrimitives';

interface Venue {
  id: string;
  venueName: string;
  venueCode: string;
  city: string;
  area: string;
}

interface PrimeSpace {
  id: string;
  venueId: string;
  spaceName: string;
  spaceCode: string;
  spaceType: string;
  defaultSeatingCapacity: number;
  minimumGuests: number;
  maximumGuests: number;
  defaultLayout: string;
  minimumAdvanceAmount?: number;
  defaultTaxGroup?: string;
  balanceDueDaysBeforeEvent?: number;
  securityDeposit?: number;
  overtimeChargesPerHour?: number;
  allowSubSpaces: boolean;
}

interface SubSpace {
  id: string;
  primeSpaceId: string;
  subSpaceName: string;
  subSpaceCode: string;
  useCustomCapacity: boolean;
  customCapacity?: number;
  useCustomGuestLimits: boolean;
  customMinGuests?: number;
  customMaxGuests?: number;
  useCustomLayouts: boolean;
  allowedLayouts: string[];
  useCustomAdvanceRule: boolean;
  useCustomFinancialSettings: boolean;
  customAdvanceAmount?: number;
  customTaxGroup?: string;
  customBalanceDueDaysBeforeEvent?: number;
  customSecurityDeposit?: number;
  customOvertimeChargesPerHour?: number;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  notes?: string;
}

interface SubSpaceSetupProps {
  userName: string;
  compact?: boolean;
}

const LEGACY_SAMPLE_VENUE_SIGNATURES = new Set([
  'VEN001|Aiwan-e-Akbari Grand Banquet|Lahore|Gulberg III',
  'VEN002|Emerald Banquet Hall|Lahore|DHA Phase 5',
]);

const LEGACY_SAMPLE_PRIME_SPACE_SIGNATURES = new Set([
  '1|Grand Hall|VEN001-PS001|hall',
  '4|Emerald Main Hall|VEN002-PS001|hall',
]);

const LEGACY_SAMPLE_SUB_SPACE_SIGNATURES = new Set([
  '1|Grand Hall - Section A|VEN001-PS001-SS001|Admin',
  '1|Grand Hall - Section B|VEN001-PS001-SS002|Admin',
  '4|Emerald East Wing|VEN002-PS001-SS001|Admin',
]);

function isLegacyVenue(venue: Venue) {
  return LEGACY_SAMPLE_VENUE_SIGNATURES.has([venue.venueCode, venue.venueName, venue.city, venue.area].join('|'));
}

function isLegacyPrimeSpace(space: PrimeSpace) {
  return LEGACY_SAMPLE_PRIME_SPACE_SIGNATURES.has([space.id, space.spaceName, space.spaceCode, space.spaceType].join('|'));
}

function isLegacySubSpace(space: SubSpace) {
  return LEGACY_SAMPLE_SUB_SPACE_SIGNATURES.has([space.primeSpaceId, space.subSpaceName, space.subSpaceCode, space.createdBy].join('|'));
}

export function SubSpaceSetup({ userName, compact = false }: SubSpaceSetupProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [primeSpaces, setPrimeSpaces] = useState<PrimeSpace[]>([]);
  const [subSpaces, setSubSpaces] = useState<SubSpace[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [selectedPrimeSpaceId, setSelectedPrimeSpaceId] = useState<string>('');
  const [selectedSubSpace, setSelectedSubSpace] = useState<SubSpace | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editedSubSpace, setEditedSubSpace] = useState<SubSpace | null>(null);

  useEffect(() => {
    const loadSubSpaceState = () => {
      const storedVenues = venueDataStore.getVenues([] as Venue[]);
      const sanitizedVenues = storedVenues.filter((venue) => !isLegacyVenue(venue));
      if (sanitizedVenues.length !== storedVenues.length) {
        venueDataStore.saveVenues(sanitizedVenues);
      }

      const validVenueIds = new Set(sanitizedVenues.map((venue) => venue.id));
      const storedPrimeSpaces = primeSpaceDataStore.getPrimeSpaces([] as PrimeSpace[]);
      const sanitizedPrimeSpaces = storedPrimeSpaces.filter(
        (space) => !isLegacyPrimeSpace(space) && validVenueIds.has(space.venueId) && space.allowSubSpaces,
      );
      if (sanitizedPrimeSpaces.length !== storedPrimeSpaces.length) {
        primeSpaceDataStore.savePrimeSpaces(storedPrimeSpaces.filter((space) => !isLegacyPrimeSpace(space) && validVenueIds.has(space.venueId)));
      }

      const validPrimeSpaceIds = new Set(sanitizedPrimeSpaces.map((space) => space.id));
      const storedSubSpaces = subSpaceDataStore.getSubSpaces([] as SubSpace[]);
      const sanitizedSubSpaces = storedSubSpaces.filter(
        (space) => !isLegacySubSpace(space) && validPrimeSpaceIds.has(space.primeSpaceId),
      );
      if (sanitizedSubSpaces.length !== storedSubSpaces.length) {
        subSpaceDataStore.saveSubSpaces(sanitizedSubSpaces);
      }

      setVenues(sanitizedVenues);
      setPrimeSpaces(sanitizedPrimeSpaces);
      setSubSpaces(sanitizedSubSpaces);
      setSelectedVenueId((current) =>
        current && sanitizedVenues.some((venue) => venue.id === current)
          ? current
          : (sanitizedPrimeSpaces[0]?.venueId ?? sanitizedVenues[0]?.id ?? ''),
      );
      setSelectedPrimeSpaceId((current) =>
        current && sanitizedPrimeSpaces.some((space) => space.id === current)
          ? current
          : (sanitizedPrimeSpaces[0]?.id ?? ''),
      );
      setSelectedSubSpace((current) =>
        current && sanitizedSubSpaces.some((space) => space.id === current.id)
          ? sanitizedSubSpaces.find((space) => space.id === current.id) ?? null
          : null,
      );
    };

    loadSubSpaceState();

    const handleMasterDataChange = () => {
      if (!isEditing && !isCreating) {
        loadSubSpaceState();
      }
    };

    window.addEventListener('storage', handleMasterDataChange);
    window.addEventListener('masterDataUpdated', handleMasterDataChange);

    return () => {
      window.removeEventListener('storage', handleMasterDataChange);
      window.removeEventListener('masterDataUpdated', handleMasterDataChange);
    };
  }, [isCreating, isEditing]);

  const layoutTypes = [
    { id: 'banquet', name: 'Banquet (Round Tables)' },
    { id: 'theater', name: 'Theater (Rows)' },
    { id: 'classroom', name: 'Classroom' },
    { id: 'u-shape', name: 'U-Shape' },
    { id: 'boardroom', name: 'Boardroom' },
    { id: 'cocktail', name: 'Cocktail / Standing' },
    { id: 'mixed', name: 'Mixed Layout' },
  ];

  const taxGroups = [
    { id: 'no-tax', name: 'No Tax' },
    ...loadSetupTaxes().map((tax) => ({
      id: tax.taxCode || tax.id,
      name: `${tax.taxName} (${tax.taxPercentage}%)`,
    })),
  ];

  const selectedPrimeSpace = primeSpaces.find((ps) => ps.id === selectedPrimeSpaceId);
  const selectedVenue = venues.find((v) => v.id === selectedVenueId);

  const filteredPrimeSpaces = selectedVenueId
    ? primeSpaces.filter((ps) => ps.venueId === selectedVenueId)
    : primeSpaces;

  const filteredSubSpaces = selectedPrimeSpaceId
    ? subSpaces
        .filter((sub) => sub.primeSpaceId === selectedPrimeSpaceId)
        .filter(
          (sub) =>
            sub.subSpaceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sub.subSpaceCode.toLowerCase().includes(searchQuery.toLowerCase())
        )
    : [];

  useEffect(() => {
    if (isEditing) return;
    if (!selectedSubSpace || selectedSubSpace.primeSpaceId !== selectedPrimeSpaceId) {
      setSelectedSubSpace(filteredSubSpaces[0] || null);
    }
  }, [filteredSubSpaces, isEditing, selectedPrimeSpaceId, selectedSubSpace]);

  const handleCreateNew = () => {
    if (!selectedPrimeSpace) return;

    const primeSubSpaces = subSpaces.filter((s) => s.primeSpaceId === selectedPrimeSpaceId);
    const nextSubSpaceNumber = primeSubSpaces.length + 1;

    const newSubSpace: SubSpace = {
      id: `temp-${Date.now()}`,
      primeSpaceId: selectedPrimeSpaceId,
      subSpaceName: '',
      subSpaceCode: `${selectedPrimeSpace.spaceCode}-SS${String(nextSubSpaceNumber).padStart(3, '0')}`,
      useCustomCapacity: false,
      useCustomGuestLimits: false,
      useCustomLayouts: false,
      allowedLayouts: [selectedPrimeSpace.defaultLayout],
      useCustomAdvanceRule: false,
      useCustomFinancialSettings: false,
      isActive: true,
      createdAt: new Date(),
      createdBy: userName,
    };

    setEditedSubSpace(newSubSpace);
    setSelectedSubSpace(newSubSpace);
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEdit = () => {
    if (selectedSubSpace) {
      setEditedSubSpace({ ...selectedSubSpace });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (!editedSubSpace || !selectedPrimeSpace) return;

    if (!editedSubSpace.subSpaceName.trim()) {
      alert('Sub-Space Name is required');
      return;
    }

    const normalizedSubSpaceName = editedSubSpace.subSpaceName.trim().toLowerCase();
    const normalizedSubSpaceCode = editedSubSpace.subSpaceCode.trim().toLowerCase();
    const hasDuplicateName = subSpaces.some(
      (subSpace) =>
        subSpace.id !== editedSubSpace.id &&
        subSpace.primeSpaceId === editedSubSpace.primeSpaceId &&
        subSpace.subSpaceName.trim().toLowerCase() === normalizedSubSpaceName,
    );
    const hasDuplicateCode = subSpaces.some(
      (subSpace) =>
        subSpace.id !== editedSubSpace.id &&
        subSpace.subSpaceCode.trim().toLowerCase() === normalizedSubSpaceCode,
    );

    if (hasDuplicateName) {
      alert('A Sub Space with this name already exists under the selected prime space.');
      return;
    }

    if (hasDuplicateCode) {
      alert('A Sub Space with this code already exists.');
      return;
    }

    if (editedSubSpace.useCustomGuestLimits) {
      if (!editedSubSpace.customMinGuests || !editedSubSpace.customMaxGuests) {
        alert('Please specify both minimum and maximum guests when using custom limits');
        return;
      }
      if (editedSubSpace.customMinGuests > editedSubSpace.customMaxGuests) {
        alert('Minimum guests cannot exceed maximum guests');
        return;
      }
      if (editedSubSpace.customMaxGuests > selectedPrimeSpace.maximumGuests) {
        alert(
          `Sub-space maximum guests (${editedSubSpace.customMaxGuests}) cannot exceed prime space maximum (${selectedPrimeSpace.maximumGuests})`
        );
        return;
      }
    }

    if (editedSubSpace.useCustomCapacity) {
      if (!editedSubSpace.customCapacity || editedSubSpace.customCapacity <= 0) {
        alert('Please specify a valid custom capacity');
        return;
      }
      if (editedSubSpace.customCapacity > selectedPrimeSpace.defaultSeatingCapacity) {
        alert(
          `Sub-space capacity (${editedSubSpace.customCapacity}) cannot exceed prime space capacity (${selectedPrimeSpace.defaultSeatingCapacity})`
        );
        return;
      }
    }

    if (editedSubSpace.useCustomLayouts && editedSubSpace.allowedLayouts.length === 0) {
      alert('Please select at least one allowed layout');
      return;
    }

    if (isCreating) {
      const newSubSpace = {
        ...editedSubSpace,
        id: Date.now().toString(),
        createdAt: new Date(),
        createdBy: userName,
      };
      const nextSubSpaces = [...subSpaces, newSubSpace];
      setSubSpaces(nextSubSpaces);
      subSpaceDataStore.saveSubSpaces(nextSubSpaces);
      setSelectedSubSpace(newSubSpace);
      setIsCreating(false);
    } else {
      const nextSubSpaces =
        subSpaces.map((s) =>
          s.id === editedSubSpace.id
            ? { ...editedSubSpace, updatedAt: new Date(), updatedBy: userName }
            : s
        );
      setSubSpaces(nextSubSpaces);
      subSpaceDataStore.saveSubSpaces(nextSubSpaces);
      setSelectedSubSpace(editedSubSpace);
    }

    setIsEditing(false);
    setEditedSubSpace(null);
    toast.success('Sub-space saved', {
      description: 'Sub-space changes are saved locally and queued for backend sync.',
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedSubSpace(null);
    if (isCreating) {
      setSelectedSubSpace(filteredSubSpaces[0] || null);
      setIsCreating(false);
    }
  };

  const handleDelete = () => {
    if (!selectedSubSpace || !window.confirm(`Are you sure you want to delete "${selectedSubSpace.subSpaceName}"?`)) {
      return;
    }

    const remainingSubSpaces = subSpaces.filter((s) => s.id !== selectedSubSpace.id);
    setSubSpaces(remainingSubSpaces);
    subSpaceDataStore.saveSubSpaces(remainingSubSpaces);
    setSelectedSubSpace(filteredSubSpaces[0] || null);
    toast.success('Sub-space deleted', {
      description: 'The sub-space removal is saved locally and queued for backend sync.',
    });
  };

  const handleToggleStatus = () => {
    if (!selectedSubSpace) return;

    const updatedSubSpace = { ...selectedSubSpace, isActive: !selectedSubSpace.isActive };
    const nextSubSpaces = subSpaces.map((s) => (s.id === selectedSubSpace.id ? updatedSubSpace : s));
    setSubSpaces(nextSubSpaces);
    subSpaceDataStore.saveSubSpaces(nextSubSpaces);
    setSelectedSubSpace(updatedSubSpace);
    toast.success(`Sub-space ${updatedSubSpace.isActive ? 'activated' : 'deactivated'}`);
  };

  const handleLayoutToggle = (layoutId: string) => {
    if (!editedSubSpace) return;

    const currentLayouts = editedSubSpace.allowedLayouts || [];
    const newLayouts = currentLayouts.includes(layoutId)
      ? currentLayouts.filter((l) => l !== layoutId)
      : [...currentLayouts, layoutId];

    setEditedSubSpace({ ...editedSubSpace, allowedLayouts: newLayouts });
  };

  const activeSubSpace = editedSubSpace || selectedSubSpace;
  const usePrimeSpaceDefaults = activeSubSpace
    ? !activeSubSpace.useCustomCapacity &&
      !activeSubSpace.useCustomGuestLimits &&
      !activeSubSpace.useCustomLayouts &&
      !activeSubSpace.useCustomAdvanceRule &&
      !activeSubSpace.useCustomFinancialSettings
    : true;

  const getInheritedCapacity = () => selectedPrimeSpace?.defaultSeatingCapacity || 0;
  const getInheritedMinGuests = () => selectedPrimeSpace?.minimumGuests || 0;
  const getInheritedMaxGuests = () => selectedPrimeSpace?.maximumGuests || 0;
  const getInheritedLayout = () => selectedPrimeSpace?.defaultLayout || 'banquet';
  const getInheritedAdvanceAmount = () => selectedPrimeSpace?.minimumAdvanceAmount ?? 100000;
  const getInheritedTaxGroup = () => selectedPrimeSpace?.defaultTaxGroup || 'standard-gst';
  const getInheritedBalanceDueDays = () => selectedPrimeSpace?.balanceDueDaysBeforeEvent ?? 7;
  const getInheritedSecurityDeposit = () => selectedPrimeSpace?.securityDeposit ?? 0;
  const getInheritedOvertimeCharges = () => selectedPrimeSpace?.overtimeChargesPerHour ?? 0;
  const getSelectedLayoutSummary = () => {
    const selectedLayouts = activeSubSpace?.allowedLayouts || [];
    if (selectedLayouts.length === 0) return 'No layouts selected';
    if (selectedLayouts.length <= 2) {
      return selectedLayouts
        .map((layoutId) => layoutTypes.find((layout) => layout.id === layoutId)?.name || layoutId)
        .join(', ');
    }
    return `${selectedLayouts.length} layouts selected`;
  };

  const inputStateClass = `${compact ? 'h-8 text-[13px]' : ''} ${!isEditing ? 'bg-slate-50 text-slate-700' : ''}`.trim();
  const selectStateClass = `h-9 w-full rounded-md border border-slate-200 ${compact ? 'px-2.5 text-sm' : 'px-3 py-2 text-sm'} focus:border-purple-500 focus:outline-none ${
    !isEditing ? 'bg-slate-50 text-slate-600' : 'bg-white'
  }`;
  const sectionTitleClass =
    'mb-3 flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-900';
  const formatRecordDate = (value?: Date | string) => {
    if (!value) return 'Unknown date';
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'Unknown date' : parsed.toLocaleDateString('en-PK');
  };

  const applyDefaultMode = (checked: boolean) => {
    if (!activeSubSpace || !selectedPrimeSpace) return;

    if (checked) {
      setEditedSubSpace({
        ...activeSubSpace,
        useCustomCapacity: false,
        useCustomGuestLimits: false,
        useCustomLayouts: false,
        useCustomAdvanceRule: false,
        useCustomFinancialSettings: false,
        allowedLayouts: [getInheritedLayout()],
        customAdvanceAmount: undefined,
        customTaxGroup: undefined,
        customBalanceDueDaysBeforeEvent: undefined,
        customSecurityDeposit: undefined,
        customOvertimeChargesPerHour: undefined,
      });
      return;
    }

    setEditedSubSpace({
      ...activeSubSpace,
      useCustomCapacity: true,
      customCapacity: activeSubSpace.customCapacity || Math.min(getInheritedCapacity(), getInheritedCapacity()),
      useCustomGuestLimits: true,
      customMinGuests: activeSubSpace.customMinGuests || getInheritedMinGuests(),
      customMaxGuests: activeSubSpace.customMaxGuests || getInheritedMaxGuests(),
      useCustomLayouts: true,
      allowedLayouts:
        activeSubSpace.allowedLayouts && activeSubSpace.allowedLayouts.length > 0
          ? activeSubSpace.allowedLayouts
          : [getInheritedLayout()],
      useCustomAdvanceRule: true,
      customAdvanceAmount: activeSubSpace.customAdvanceAmount ?? 50000,
      useCustomFinancialSettings: true,
      customTaxGroup: activeSubSpace.customTaxGroup || getInheritedTaxGroup(),
      customBalanceDueDaysBeforeEvent:
        activeSubSpace.customBalanceDueDaysBeforeEvent ?? getInheritedBalanceDueDays(),
      customSecurityDeposit: activeSubSpace.customSecurityDeposit ?? getInheritedSecurityDeposit(),
      customOvertimeChargesPerHour: activeSubSpace.customOvertimeChargesPerHour ?? getInheritedOvertimeCharges(),
    });
  };

  return (
    <div className={compact ? 'space-y-2.5' : 'space-y-3'}>
      <div className={`flex items-center gap-3 rounded-lg border border-slate-200 bg-white ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Building2 className="size-4 text-emerald-600" />
          Venue Profile
        </div>
        <select
          value={selectedVenueId}
          onChange={(e) => {
            const newVenueId = e.target.value;
            setSelectedVenueId(newVenueId);
            const firstPrimeSpace = primeSpaces.find((ps) => ps.venueId === newVenueId);
            setSelectedPrimeSpaceId(firstPrimeSpace?.id || '');
            setSelectedSubSpace(null);
            setSearchQuery('');
          }}
          disabled={isEditing}
          className={`rounded-md border border-slate-200 bg-white font-medium text-slate-900 focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 ${compact ? 'px-2.5 py-1.5 text-[13px]' : 'px-3 py-2 text-sm'}`}
        >
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.venueName}
            </option>
          ))}
        </select>
        <ChevronRight className="size-4 text-slate-400" />
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Maximize2 className="size-4 text-blue-600" />
          Prime Space
        </div>
        <select
          value={selectedPrimeSpaceId}
          onChange={(e) => {
            setSelectedPrimeSpaceId(e.target.value);
            setSelectedSubSpace(null);
            setSearchQuery('');
          }}
          disabled={isEditing || filteredPrimeSpaces.length === 0}
          className={`min-w-[260px] rounded-md border border-slate-200 bg-white font-medium text-slate-900 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 ${compact ? 'px-2.5 py-1.5 text-[13px]' : 'px-3 py-2 text-sm'}`}
        >
          {filteredPrimeSpaces.length === 0 ? (
            <option value="">No divisible prime spaces for this venue</option>
          ) : (
            filteredPrimeSpaces.map((ps) => (
              <option key={ps.id} value={ps.id}>
                {ps.spaceName}
              </option>
            ))
          )}
        </select>
        <div className={`ml-auto rounded border border-slate-200 bg-slate-50 text-slate-600 ${compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1.5 text-sm'}`}>
          <span className="font-semibold text-purple-700">{filteredSubSpaces.length}</span> Sub-Spaces
        </div>
      </div>

      <div className={`flex ${compact ? 'h-[calc(100vh-340px)] gap-2.5' : 'h-[calc(100vh-292px)] gap-3'}`}>
        <div className={`flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white ${compact ? 'w-[280px] max-w-[280px]' : 'w-72'}`}>
          <div className={`border-b border-slate-200 ${compact ? 'p-2.5' : 'p-3'}`}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
                <Layers className="size-3.5 text-purple-600" />
                Sub-Spaces
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                  {filteredSubSpaces.length}
                </span>
              </h3>
              <Button
                onClick={handleCreateNew}
                disabled={isEditing || !selectedPrimeSpace}
                className="h-8 bg-purple-600 px-2.5 hover:bg-purple-700"
                size="sm"
              >
                <Plus className="mr-1 size-4" />
                New
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search sub-spaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 rounded-md border-slate-200 pl-9"
              />
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto bg-white ${compact ? 'p-1.5' : 'p-2'}`}>
            {filteredSubSpaces.length === 0 ? (
              <div className="p-4">
                <SetupEmptyState
                  icon={Layers}
                  title="No sub-spaces found"
                  description="Create a sub-space for the selected prime space."
                  compact
                />
              </div>
            ) : (
              <div className="space-y-1">
                {filteredSubSpaces.map((subSpace) => (
                  <button
                    key={subSpace.id}
                    onClick={() => {
                      if (!isEditing) {
                        setSelectedSubSpace(subSpace);
                      }
                    }}
                    disabled={isEditing}
                    className={`w-full rounded-md border ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'} text-left transition-colors ${
                      selectedSubSpace?.id === subSpace.id
                        ? 'border-purple-300 bg-purple-50'
                        : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                    } ${isEditing ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Layers className="size-4 shrink-0 text-purple-600" />
                          <h4 className="truncate text-sm font-medium text-slate-900">
                            {subSpace.subSpaceName}
                          </h4>
                          <span className={`text-[11px] font-medium ${subSpace.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {subSpace.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                          <span>Capacity {subSpace.customCapacity || getInheritedCapacity()}</span>
                          {subSpace.useCustomGuestLimits ? (
                            <span>{subSpace.customMinGuests}-{subSpace.customMaxGuests} guests</span>
                          ) : null}
                        </div>
                      </div>
                      <ChevronRight
                        className={`mt-1 size-4 shrink-0 text-slate-400 ${
                          selectedSubSpace?.id === subSpace.id ? 'text-purple-600' : ''
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
          {!activeSubSpace ? (
            <SetupEmptyState
              icon={Layers}
              title="No sub-space selected"
              description="Select a sub-space from the list to view details."
            />
          ) : (
            <>
              <div className={`sticky top-0 z-10 border-b border-slate-200 bg-white ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <Layers className="size-4 text-purple-600" />
                      <h2 className={`truncate font-semibold text-slate-900 ${compact ? 'text-base' : 'text-lg'}`}>
                        {isCreating ? 'Create New Sub-Space' : activeSubSpace.subSpaceName || 'Unnamed Sub-Space'}
                      </h2>
                    </div>
                    <CompactMetaRow
                      items={[
                        <span key="status" className={`text-[11px] font-medium ${activeSubSpace.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {activeSubSpace.isActive ? 'Active' : 'Inactive'}
                        </span>,
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
                          title={activeSubSpace.isActive ? 'Deactivate' : 'Activate'}
                          aria-label={activeSubSpace.isActive ? 'Deactivate sub-space' : 'Activate sub-space'}
                          className={`h-8 w-8 ${
                            activeSubSpace.isActive
                              ? 'border-red-200 text-red-700 hover:bg-red-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          <Power className="size-4" />
                        </Button>
                        <Button onClick={handleEdit} size="icon" variant="outline" className="h-8 w-8" title="Edit" aria-label="Edit sub-space">
                          <Edit2 className="size-4" />
                        </Button>
                        {!isCreating && (
                          <Button
                            onClick={handleDelete}
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                            title="Delete"
                            aria-label="Delete sub-space"
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

              <div className={`flex-1 overflow-y-auto bg-white ${compact ? 'p-2.5' : 'p-4'}`}>
                <div className={compact ? 'space-y-2.5' : 'space-y-4'}>
                  {!compact ? <div
                    className={`flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white text-slate-600 ${
                      compact ? 'px-2.5 py-1.5 text-[13px]' : 'px-3 py-2 text-sm'
                    }`}
                  >
                    <Building2 className="size-4 text-emerald-600" />
                    <span className="font-medium text-slate-900">{selectedVenue?.venueName}</span>
                    <ChevronRight className="size-4 text-slate-400" />
                    <span className="font-medium text-blue-700">{selectedPrimeSpace?.spaceName}</span>
                    <ChevronRight className="size-4 text-slate-400" />
                    <span className="text-purple-700">Sub-Spaces</span>
                  </div> : null}

                  {isEditing && !compact && (
                    <section
                      className={`rounded-xl border border-blue-200 bg-blue-50 ${compact ? 'p-2.5' : 'p-3'}`}
                    >
                      <div className="flex items-start gap-2 text-xs text-blue-700">
                        <AlertCircle className="mt-0.5 size-4 shrink-0 text-blue-600" />
                        <p>
                          Fields marked with <span className="font-bold text-red-500">*</span> are required.
                          Sub-space settings cannot exceed prime space limits.
                        </p>
                      </div>
                    </section>
                  )}

                  <SetupAdminGrid>
                    <SetupAdminColumn>
                      <CompactFormSection title="Basic Information" icon={Layers} iconClassName="text-purple-600">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <Label className="mb-1.5 text-sm">
                              Sub-Space Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              value={activeSubSpace.subSpaceName}
                              onChange={(e) =>
                                setEditedSubSpace({ ...activeSubSpace, subSpaceName: e.target.value })
                              }
                              disabled={!isEditing}
                              placeholder="e.g., Grand Hall - Section A, East Wing, VIP Area"
                              className={inputStateClass}
                            />
                          </div>
                          <div>
                            <Label className="mb-1.5 text-sm">Parent Prime Space</Label>
                            <Input value={selectedPrimeSpace?.spaceName || ''} disabled className="bg-slate-100" />
                          </div>
                        </div>
                      </CompactFormSection>

                      <CompactAccordionSection
                        title="Capacity & Guest Rules"
                        icon={Users}
                        iconClassName="text-purple-600"
                        hint={usePrimeSpaceDefaults ? 'Inherited from prime space' : 'Custom override'}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs text-slate-500">
                                Keep capacity and guest limits aligned with the parent prime space unless this sub-space needs its own limits.
                              </p>
                            </div>
                            <label className="flex items-center gap-2 text-sm font-medium text-purple-700">
                              <input
                                type="checkbox"
                                checked={usePrimeSpaceDefaults}
                                onChange={(e) => applyDefaultMode(e.target.checked)}
                                disabled={!isEditing}
                                className="rounded"
                              />
                              Use defaults
                            </label>
                          </div>

                          {usePrimeSpaceDefaults ? (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                              Using parent defaults for capacity, guests, layouts, and financial settings.
                            </div>
                          ) : (
                            <div className="grid gap-3 lg:grid-cols-2">
                              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                  <Users className="size-4 text-purple-600" />
                                  Capacity Override
                                </h4>
                                <div>
                                  <Label className="mb-1.5 text-sm">
                                    Custom Capacity <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    type="number"
                                    value={activeSubSpace.customCapacity || ''}
                                    onChange={(e) =>
                                      setEditedSubSpace({
                                        ...activeSubSpace,
                                        customCapacity: parseInt(e.target.value) || undefined,
                                      })
                                    }
                                    disabled={!isEditing}
                                    max={getInheritedCapacity()}
                                    placeholder={`Max: ${getInheritedCapacity()}`}
                                    className={inputStateClass}
                                  />
                                </div>
                              </div>

                              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                  <Users className="size-4 text-purple-600" />
                                  Guest Limits Override
                                </h4>
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div>
                                    <Label className="mb-1.5 text-sm">
                                      Minimum Guests <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      type="number"
                                      value={activeSubSpace.customMinGuests || ''}
                                      onChange={(e) =>
                                        setEditedSubSpace({
                                          ...activeSubSpace,
                                          customMinGuests: parseInt(e.target.value) || undefined,
                                        })
                                      }
                                      disabled={!isEditing}
                                      className={inputStateClass}
                                    />
                                  </div>
                                  <div>
                                    <Label className="mb-1.5 text-sm">
                                      Maximum Guests <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      type="number"
                                      value={activeSubSpace.customMaxGuests || ''}
                                      onChange={(e) =>
                                        setEditedSubSpace({
                                          ...activeSubSpace,
                                          customMaxGuests: parseInt(e.target.value) || undefined,
                                        })
                                      }
                                      disabled={!isEditing}
                                      max={getInheritedMaxGuests()}
                                      placeholder={`Max: ${getInheritedMaxGuests()}`}
                                      className={inputStateClass}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CompactAccordionSection>
                    </SetupAdminColumn>

                    <SetupAdminColumn>
                      <CompactAccordionSection
                        title="Layout & Financial Settings"
                        icon={DollarSign}
                        iconClassName="text-purple-600"
                        hint={usePrimeSpaceDefaults ? 'Inherited from prime space' : getSelectedLayoutSummary()}
                      >
                        {usePrimeSpaceDefaults ? (
                          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                            Layout and financial settings are inherited from the selected prime space.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                <LayoutGrid className="size-4 text-purple-600" />
                                Layout Overrides
                              </h4>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild disabled={!isEditing}>
                                  <button
                                    type="button"
                                    className={`flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm ${
                                      !isEditing ? 'cursor-not-allowed opacity-50' : 'hover:border-purple-300'
                                    }`}
                                  >
                                    <span className="truncate text-slate-700">{getSelectedLayoutSummary()}</span>
                                    <ChevronDown className="size-4 text-slate-400" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-72">
                                  <DropdownMenuLabel>Select Allowed Layouts</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {layoutTypes.map((layout) => (
                                    <DropdownMenuCheckboxItem
                                      key={layout.id}
                                      checked={activeSubSpace.allowedLayouts?.includes(layout.id)}
                                      onCheckedChange={() => handleLayoutToggle(layout.id)}
                                    >
                                      {layout.name}
                                    </DropdownMenuCheckboxItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <p className="mt-2 text-xs text-slate-500">Choose one or more layouts for this sub-space.</p>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                <DollarSign className="size-4 text-purple-600" />
                                Financial Override
                              </h4>
                              <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                  <Label className="mb-1.5 text-sm">Fixed Minimum Advance</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={activeSubSpace.customAdvanceAmount ?? getInheritedAdvanceAmount()}
                                    onChange={(e) =>
                                      setEditedSubSpace({
                                        ...activeSubSpace,
                                        customAdvanceAmount: parseInt(e.target.value) || 0,
                                      })
                                    }
                                    disabled={!isEditing}
                                    className={inputStateClass}
                                  />
                                </div>
                                <div>
                                  <Label className="mb-1.5 text-sm">Custom Tax Group</Label>
                                  <select
                                    value={activeSubSpace.customTaxGroup || getInheritedTaxGroup()}
                                    onChange={(e) =>
                                      setEditedSubSpace({
                                        ...activeSubSpace,
                                        customTaxGroup: e.target.value,
                                      })
                                    }
                                    disabled={!isEditing}
                                    className={selectStateClass}
                                  >
                                    {taxGroups.map((tax) => (
                                      <option key={tax.id} value={tax.id}>
                                        {tax.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <Label className="mb-1.5 text-sm">Balance Due Days Before Event</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={activeSubSpace.customBalanceDueDaysBeforeEvent ?? getInheritedBalanceDueDays()}
                                    onChange={(e) =>
                                      setEditedSubSpace({
                                        ...activeSubSpace,
                                        customBalanceDueDaysBeforeEvent: parseInt(e.target.value) || 0,
                                      })
                                    }
                                    disabled={!isEditing}
                                    className={inputStateClass}
                                  />
                                </div>
                                <div>
                                  <Label className="mb-1.5 text-sm">Security Deposit (Rs.)</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={activeSubSpace.customSecurityDeposit ?? getInheritedSecurityDeposit()}
                                    onChange={(e) =>
                                      setEditedSubSpace({
                                        ...activeSubSpace,
                                        customSecurityDeposit: parseInt(e.target.value) || 0,
                                      })
                                    }
                                    disabled={!isEditing}
                                    className={inputStateClass}
                                  />
                                </div>
                                <div>
                                  <Label className="mb-1.5 text-sm">Overtime Charges (Rs./hour)</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={activeSubSpace.customOvertimeChargesPerHour ?? getInheritedOvertimeCharges()}
                                    onChange={(e) =>
                                      setEditedSubSpace({
                                        ...activeSubSpace,
                                        customOvertimeChargesPerHour: parseInt(e.target.value) || 0,
                                      })
                                    }
                                    disabled={!isEditing}
                                    className={inputStateClass}
                                  />
                                </div>
                              </div>
                              <p className="mt-2 text-xs text-slate-500">
                                Use these values when the sub space needs a smaller fixed minimum advance or different tax behavior than its prime space.
                              </p>
                            </div>
                          </div>
                        )}
                      </CompactAccordionSection>

                      <CompactAccordionSection
                        title="Additional Notes"
                        icon={LayoutGrid}
                        iconClassName="text-purple-600"
                      >
                        <Textarea
                          value={activeSubSpace.notes || ''}
                          onChange={(e) =>
                            setEditedSubSpace({ ...activeSubSpace, notes: e.target.value })
                          }
                          disabled={!isEditing}
                          rows={3}
                          placeholder="Any additional information about the sub-space, access details, special features, etc."
                          className={inputStateClass}
                        />
                      </CompactAccordionSection>

                      {!isCreating && (
                        <InlineSummarySection title="Record Information" icon={LayoutGrid} iconClassName="text-slate-500">
                          <CompactStatsRow
                            items={[
                              {
                                label: 'Status',
                                value: (
                                  <span
                                    className={`rounded px-2 py-1 text-xs font-medium ${
                                      activeSubSpace.isActive
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {activeSubSpace.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                ),
                              },
                              {
                                label: 'Created',
                                value: `${formatRecordDate(activeSubSpace.createdAt)} by ${activeSubSpace.createdBy}`,
                              },
                              ...(activeSubSpace.updatedAt
                                ? [
                                    {
                                      label: 'Last Updated',
                                      value: `${formatRecordDate(activeSubSpace.updatedAt)} by ${activeSubSpace.updatedBy}`,
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
    </div>
  );
}
