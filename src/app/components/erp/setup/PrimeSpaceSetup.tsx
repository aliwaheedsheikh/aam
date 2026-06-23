import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Edit2,
  Home,
  LayoutGrid,
  Layers,
  Maximize2,
  Plus,
  Power,
  Ruler,
  Save,
  Search,
  Sun,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { primeSpaceDataStore, subSpaceDataStore, venueDataStore } from '../../../lib/masterDataStore';
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
  spaceType: 'hall' | 'marquee' | 'lawn' | 'poolside' | 'rooftop' | 'ballroom' | 'terrace';
  isIndoor: boolean;
  sizeValue: number;
  sizeUnit: 'sqft' | 'sqm';
  defaultSeatingCapacity: number;
  minimumGuests: number;
  maximumGuests: number;
  defaultLayout: 'theater' | 'banquet' | 'classroom' | 'u-shape' | 'boardroom' | 'cocktail' | 'mixed';
  minimumAdvanceAmount?: number;
  defaultTaxGroup?: string;
  balanceDueDaysBeforeEvent?: number;
  securityDeposit?: number;
  overtimeChargesPerHour?: number;
  allowSubSpaces: boolean;
  floorLevel?: string;
  hasAC: boolean;
  hasStage: boolean;
  hasSoundSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  notes?: string;
}

interface PrimeSpaceSubSpaceRef {
  primeSpaceId: string;
}

interface PrimeSpaceSetupProps {
  userName: string;
  compact?: boolean;
}

const LEGACY_SAMPLE_VENUE_SIGNATURES = new Set([
  'VEN001|Aiwan-e-Akbari Grand Banquet|Lahore|Gulberg III',
  'VEN002|Emerald Banquet Hall|Lahore|DHA Phase 5',
  'VEN003|Pearl Marquee & Lawn|Lahore|Johar Town',
]);

const LEGACY_SAMPLE_PRIME_SPACE_SIGNATURES = new Set([
  '1|Grand Hall|VEN001-PS001|Admin',
  '1|Crystal Ballroom|VEN001-PS002|Admin',
  '1|Garden Lawn|VEN001-PS003|Admin',
  '2|Emerald Main Hall|VEN002-PS001|Admin',
]);

function isLegacyVenue(venue: Venue) {
  return LEGACY_SAMPLE_VENUE_SIGNATURES.has([venue.venueCode, venue.venueName, venue.city, venue.area].join('|'));
}

function isLegacyPrimeSpace(space: PrimeSpace) {
  return LEGACY_SAMPLE_PRIME_SPACE_SIGNATURES.has([space.venueId, space.spaceName, space.spaceCode, space.createdBy].join('|'));
}

export function PrimeSpaceSetup({ userName, compact = false }: PrimeSpaceSetupProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [primeSpaces, setPrimeSpaces] = useState<PrimeSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<PrimeSpace | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editedSpace, setEditedSpace] = useState<PrimeSpace | null>(null);
  const [showDivisibilitySettings, setShowDivisibilitySettings] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [subSpaceCounts, setSubSpaceCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadPrimeSpaceState = () => {
      const storedVenues = venueDataStore.getVenues([] as Venue[]);
      const sanitizedVenues = storedVenues.filter((venue) => !isLegacyVenue(venue));
      if (sanitizedVenues.length !== storedVenues.length) {
        venueDataStore.saveVenues(sanitizedVenues);
      }

      const validVenueIds = new Set(sanitizedVenues.map((venue) => venue.id));
      const storedSpaces = primeSpaceDataStore.getPrimeSpaces([] as PrimeSpace[]);
      const sanitizedSpaces = storedSpaces.filter(
        (space) => !isLegacyPrimeSpace(space) && validVenueIds.has(space.venueId),
      );
      if (sanitizedSpaces.length !== storedSpaces.length) {
        primeSpaceDataStore.savePrimeSpaces(sanitizedSpaces);
      }

      setVenues(sanitizedVenues);
      setPrimeSpaces(sanitizedSpaces);
      setSelectedVenueId((current) =>
        current && sanitizedVenues.some((venue) => venue.id === current)
          ? current
          : (sanitizedVenues[0]?.id ?? ''),
      );
      setSelectedSpace((current) =>
        current && sanitizedSpaces.some((space) => space.id === current.id)
          ? sanitizedSpaces.find((space) => space.id === current.id) ?? null
          : null,
      );
    };

    loadPrimeSpaceState();

    const handleMasterDataChange = () => {
      if (!isEditing && !isCreating) {
        loadPrimeSpaceState();
      }
    };

    window.addEventListener('storage', handleMasterDataChange);
    window.addEventListener('masterDataUpdated', handleMasterDataChange);

    return () => {
      window.removeEventListener('storage', handleMasterDataChange);
      window.removeEventListener('masterDataUpdated', handleMasterDataChange);
    };
  }, [isCreating, isEditing]);

  useEffect(() => {
    const loadedSubSpaces = subSpaceDataStore.getSubSpaces([] as PrimeSpaceSubSpaceRef[]);
    const counts = loadedSubSpaces.reduce<Record<string, number>>((acc, subSpace) => {
      acc[subSpace.primeSpaceId] = (acc[subSpace.primeSpaceId] || 0) + 1;
      return acc;
    }, {});
    setSubSpaceCounts(counts);
  }, []);

  const spaceTypes = [
    { id: 'hall', name: 'Hall', icon: Home },
    { id: 'ballroom', name: 'Ballroom', icon: Maximize2 },
    { id: 'marquee', name: 'Marquee', icon: Building2 },
    { id: 'lawn', name: 'Lawn', icon: Sun },
    { id: 'poolside', name: 'Poolside', icon: Sun },
    { id: 'rooftop', name: 'Rooftop', icon: Building2 },
    { id: 'terrace', name: 'Terrace', icon: Building2 },
  ];

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

  const selectedVenue = venues.find((v) => v.id === selectedVenueId);
  const filteredSpaces = primeSpaces
    .filter((space) => space.venueId === selectedVenueId)
    .filter(
      (space) =>
        space.spaceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        space.spaceCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

  useEffect(() => {
    if (isEditing) {
      return;
    }

    if (!selectedSpace || selectedSpace.venueId !== selectedVenueId) {
      setSelectedSpace(filteredSpaces[0] || null);
    }
  }, [filteredSpaces, isEditing, selectedSpace, selectedVenueId]);

  const handleCreateNew = () => {
    if (!selectedVenue) return;

    const venueSpaces = primeSpaces.filter((s) => s.venueId === selectedVenueId);
    const nextSpaceNumber = venueSpaces.length + 1;

    const newSpace: PrimeSpace = {
      id: `temp-${Date.now()}`,
      venueId: selectedVenueId,
      spaceName: '',
      spaceCode: `${selectedVenue.venueCode}-PS${String(nextSpaceNumber).padStart(3, '0')}`,
      spaceType: 'hall',
      isIndoor: true,
      sizeValue: 0,
      sizeUnit: 'sqft',
      defaultSeatingCapacity: 0,
      minimumGuests: 0,
      maximumGuests: 0,
      defaultLayout: 'banquet',
      minimumAdvanceAmount: 100000,
      defaultTaxGroup: 'standard-gst',
      balanceDueDaysBeforeEvent: 7,
      securityDeposit: 0,
      overtimeChargesPerHour: 0,
      allowSubSpaces: false,
      hasAC: true,
      hasStage: false,
      hasSoundSystem: false,
      isActive: true,
      createdAt: new Date(),
      createdBy: userName,
    };

    setEditedSpace(newSpace);
    setSelectedSpace(newSpace);
    setIsCreating(true);
    setIsEditing(true);
    setShowDivisibilitySettings(false);
  };

  const handleEdit = () => {
    if (selectedSpace) {
      setEditedSpace({ ...selectedSpace });
      setIsEditing(true);
      setShowDivisibilitySettings(selectedSpace.allowSubSpaces);
    }
  };

  const handleSave = () => {
    if (!editedSpace) return;

    if (!editedSpace.spaceName.trim()) {
      alert('Prime Space Name is required');
      return;
    }

    const normalizedSpaceName = editedSpace.spaceName.trim().toLowerCase();
    const normalizedSpaceCode = editedSpace.spaceCode.trim().toLowerCase();
    const hasDuplicateName = primeSpaces.some(
      (space) =>
        space.id !== editedSpace.id &&
        space.venueId === editedSpace.venueId &&
        space.spaceName.trim().toLowerCase() === normalizedSpaceName,
    );
    const hasDuplicateCode = primeSpaces.some(
      (space) => space.id !== editedSpace.id && space.spaceCode.trim().toLowerCase() === normalizedSpaceCode,
    );

    if (hasDuplicateName) {
      alert('A Prime Space with this name already exists for the selected venue.');
      return;
    }

    if (hasDuplicateCode) {
      alert('A Prime Space with this code already exists.');
      return;
    }

    if (editedSpace.defaultSeatingCapacity <= 0) {
      alert('Default Seating Capacity must be greater than 0');
      return;
    }
    if (editedSpace.minimumGuests > editedSpace.maximumGuests) {
      alert('Minimum Guests cannot exceed Maximum Guests');
      return;
    }

    if (isCreating) {
      const newSpace = {
        ...editedSpace,
        id: Date.now().toString(),
        createdAt: new Date(),
        createdBy: userName,
      };
      const nextSpaces = [...primeSpaces, newSpace];
      setPrimeSpaces(nextSpaces);
      primeSpaceDataStore.savePrimeSpaces(nextSpaces);
      setSelectedSpace(newSpace);
      setIsCreating(false);
    } else {
      const nextSpaces = 
        primeSpaces.map((s) =>
          s.id === editedSpace.id
            ? { ...editedSpace, updatedAt: new Date(), updatedBy: userName }
            : s
        );
      setPrimeSpaces(nextSpaces);
      primeSpaceDataStore.savePrimeSpaces(nextSpaces);
      setSelectedSpace(editedSpace);
    }

    setIsEditing(false);
    setEditedSpace(null);
    toast.success('Prime space saved', {
      description: 'Prime space changes are saved locally and queued for backend sync.',
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedSpace(null);
    if (isCreating) {
      setSelectedSpace(filteredSpaces[0] || null);
      setIsCreating(false);
    }
    setShowDivisibilitySettings(selectedSpace?.allowSubSpaces ?? false);
  };

  const handleDelete = () => {
    if (!selectedSpace || !window.confirm(`Are you sure you want to delete "${selectedSpace.spaceName}"?`)) {
      return;
    }

    const remainingSpaces = primeSpaces.filter((s) => s.id !== selectedSpace.id);
    setPrimeSpaces(remainingSpaces);
    primeSpaceDataStore.savePrimeSpaces(remainingSpaces);
    setSelectedSpace(filteredSpaces[0] || null);
    toast.success('Prime space deleted', {
      description: 'The prime space removal is saved locally and queued for backend sync.',
    });
  };

  const handleToggleStatus = () => {
    if (!selectedSpace) return;

    const updatedSpace = { ...selectedSpace, isActive: !selectedSpace.isActive };
    const nextSpaces = primeSpaces.map((s) => (s.id === selectedSpace.id ? updatedSpace : s));
    setPrimeSpaces(nextSpaces);
    primeSpaceDataStore.savePrimeSpaces(nextSpaces);
    setSelectedSpace(updatedSpace);
    toast.success(`Prime space ${updatedSpace.isActive ? 'activated' : 'deactivated'}`);
  };

  const activeSpace = editedSpace || selectedSpace;
  const inputStateClass = `${compact ? 'h-9 text-sm' : ''} ${!isEditing ? 'bg-slate-50 text-slate-700' : ''}`.trim();
  const selectStateClass = `h-9 w-full rounded-md border border-slate-200 ${compact ? 'px-2.5 text-sm' : 'px-3 py-2 text-sm'} focus:border-blue-500 focus:outline-none ${
    !isEditing ? 'bg-slate-50 text-slate-600' : 'bg-white'
  }`;
  const sectionClass = `rounded-lg border border-slate-200 bg-white ${compact ? 'p-3' : 'p-3.5'}`;
  const formatRecordDate = (value?: Date | string) => {
    if (!value) return 'Unknown date';
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown date';
    return parsed.toLocaleDateString();
  };
  const safeSpaceName = activeSpace?.spaceName?.trim() || 'Unnamed Space';
  const safeSpaceType = activeSpace?.spaceType || 'hall';
  const safeIsActive = Boolean(activeSpace?.isActive);
  const safeIsIndoor = activeSpace?.isIndoor ?? true;
  const safeSizeValue = activeSpace?.sizeValue ?? 0;
  const safeSizeUnit = activeSpace?.sizeUnit || 'sqft';
  const safeCapacity = activeSpace?.defaultSeatingCapacity ?? 0;
  const safeMinGuests = activeSpace?.minimumGuests ?? 0;
  const safeMaxGuests = activeSpace?.maximumGuests ?? 0;
  const safeFloorLevel = activeSpace?.floorLevel || '';
  const safeDefaultLayout = activeSpace?.defaultLayout || 'banquet';
  const safeAdvanceAmount = activeSpace?.minimumAdvanceAmount ?? 100000;
  const safeTaxGroup = activeSpace?.defaultTaxGroup || 'standard-gst';
  const safeBalanceDueDays = activeSpace?.balanceDueDaysBeforeEvent ?? 7;
  const safeSecurityDeposit = activeSpace?.securityDeposit ?? 0;
  const safeOvertimeCharges = activeSpace?.overtimeChargesPerHour ?? 0;
  const safeNotes = activeSpace?.notes || '';
  const safeCreatedBy = activeSpace?.createdBy || 'Unknown';
  const safeSubSpaceCount = activeSpace ? subSpaceCounts[activeSpace.id] || 0 : 0;

  useEffect(() => {
    setShowDivisibilitySettings(false);
    setShowAdvancedSettings(false);
  }, [activeSpace?.id]);

  if (venues.length === 0) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-white ${compact ? 'h-[calc(100vh-340px)] p-3' : 'h-[calc(100vh-292px)] p-4'}`}>
        <SetupEmptyState
          icon={Building2}
          title="No venues available"
          description="Create a venue first to manage prime spaces."
          compact
        />
      </div>
    );
  }

  if (!selectedVenue) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-white ${compact ? 'h-[calc(100vh-340px)] p-3' : 'h-[calc(100vh-292px)] p-4'}`}>
        <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-4 text-center">
          <SetupEmptyState
            icon={Maximize2}
            title="Prime Space setup is unavailable"
            description="Select a saved Venue Profile record to continue."
            compact
          />
          <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left">
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Venue Profile
            </Label>
            <select
              value={selectedVenueId}
              onChange={(e) => {
                setSelectedVenueId(e.target.value);
                setSelectedSpace(null);
                setSearchQuery('');
              }}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Select venue profile</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.venueName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className={compact ? 'space-y-2.5' : 'space-y-3'}>
      <div className={`flex items-center justify-between rounded-lg border border-slate-200 bg-white ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Building2 className="size-4 text-emerald-600" />
            Venue Profile
          </div>
          <select
            value={selectedVenueId}
            onChange={(e) => {
              setSelectedVenueId(e.target.value);
              setSelectedSpace(null);
              setSearchQuery('');
            }}
            disabled={isEditing}
            className={`w-full max-w-lg rounded-md border border-slate-200 bg-white font-medium text-slate-900 focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 ${compact ? 'px-2.5 py-1.5 text-[13px]' : 'px-3 py-2 text-sm'}`}
          >
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.venueName}
              </option>
            ))}
          </select>
        </div>
        <div className={`rounded border border-slate-200 bg-slate-50 text-slate-600 ${compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1.5 text-sm'}`}>
          <span className="font-semibold text-blue-700">{filteredSpaces.length}</span> Prime Spaces
        </div>
      </div>

      <div className={`flex ${compact ? 'h-[calc(100vh-340px)] gap-2.5' : 'h-[calc(100vh-292px)] gap-3'}`}>
        <div className={`flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white ${compact ? 'w-[280px] max-w-[280px]' : 'w-72'}`}>
          <div className={`border-b border-slate-200 ${compact ? 'p-2.5' : 'p-3'}`}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
                <Maximize2 className="size-3.5 text-blue-600" />
                Spaces
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                  {filteredSpaces.length}
                </span>
              </h3>
              <Button
                onClick={handleCreateNew}
                disabled={isEditing}
                className="h-8 bg-blue-600 px-2.5 hover:bg-blue-700"
                size="sm"
              >
                <Plus className="mr-1 size-4" />
                New
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search spaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 rounded-md border-slate-200 pl-9"
              />
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto bg-white ${compact ? 'p-1.5' : 'p-2'}`}>
            {filteredSpaces.length === 0 ? (
              <div className="p-4">
                <SetupEmptyState
                  icon={Maximize2}
                  title="No prime spaces found"
                  description="Create a prime space for the selected venue."
                  compact
                />
              </div>
            ) : (
              <div className="space-y-1">
                {filteredSpaces.map((space) => {
                  const SpaceIcon = spaceTypes.find((t) => t.id === space.spaceType)?.icon || Home;
                  return (
                    <button
                      key={space.id}
                      onClick={() => {
                        if (!isEditing) {
                          setSelectedSpace(space);
                        }
                      }}
                      disabled={isEditing}
                      className={`w-full rounded-md border ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'} text-left transition-colors ${
                        selectedSpace?.id === space.id
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                      } ${isEditing ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <SpaceIcon className="size-4 shrink-0 text-blue-600" />
                            <h4 className="truncate text-sm font-medium text-slate-900">{space.spaceName}</h4>
                            <span className={`text-[11px] font-medium ${space.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                              {space.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <Users className="size-3" />
                              <span>{space.defaultSeatingCapacity}</span>
                            </div>
                            <span className="capitalize">{space.spaceType}</span>
                          </div>
                        </div>
                        <ChevronRight
                          className={`mt-1 size-4 shrink-0 text-slate-400 ${
                            selectedSpace?.id === space.id ? 'text-blue-600' : ''
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
          {!activeSpace ? (
            <SetupEmptyState
              icon={Maximize2}
              title="No Prime Space selected"
              description="Select a prime space from the list to view details."
            />
          ) : (
            <>
              <div className={`sticky top-0 z-10 border-b border-slate-200 bg-white ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <Maximize2 className="size-4 text-blue-600" />
                      <h2 className={`truncate font-semibold text-slate-900 ${compact ? 'text-base' : 'text-lg'}`}>
                        {isCreating ? 'Create New Prime Space' : safeSpaceName}
                      </h2>
                    </div>
                    <CompactMetaRow
                      items={[
                        <span key="type" className="text-[11px] text-slate-500 capitalize">
                          {safeSpaceType}
                        </span>,
                        <span
                          key="status"
                          className={`text-[11px] font-medium ${
                            safeIsActive
                              ? 'text-emerald-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {safeIsActive ? 'Active' : 'Inactive'}
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
                          title={safeIsActive ? 'Deactivate' : 'Activate'}
                          aria-label={safeIsActive ? 'Deactivate prime space' : 'Activate prime space'}
                          className={`h-8 w-8 ${
                            safeIsActive
                              ? 'border-red-200 text-red-700 hover:bg-red-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          <Power className="size-4" />
                        </Button>
                        <Button onClick={handleEdit} size="icon" variant="outline" className="h-8 w-8" title="Edit" aria-label="Edit prime space">
                          <Edit2 className="size-4" />
                        </Button>
                        {!isCreating && (
                          <Button
                            onClick={handleDelete}
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                            title="Delete"
                            aria-label="Delete prime space"
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
                  {selectedVenue && !compact && (
                    <div
                      className={`flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white text-slate-600 ${
                        compact ? 'px-2.5 py-1.5 text-[13px]' : 'px-3 py-2 text-sm'
                      }`}
                    >
                      <Building2 className="size-4 text-emerald-600" />
                      <span className="font-medium text-slate-900">{selectedVenue.venueName}</span>
                      <ChevronRight className="size-4 text-slate-400" />
                      <span className="font-medium text-blue-700">{safeSpaceName}</span>
                    </div>
                  )}

                  {isEditing && !compact && (
                    <section
                      className={`rounded-xl border border-blue-200 bg-blue-50 ${compact ? 'p-2.5' : 'p-3'}`}
                    >
                      <div className="flex items-start gap-2 text-xs text-blue-700">
                        <AlertCircle className="mt-0.5 size-4 shrink-0 text-blue-600" />
                        <p>
                          Fields marked with <span className="font-bold text-red-500">*</span> are required.
                          Ensure minimum guests stays less than or equal to maximum guests.
                        </p>
                      </div>
                    </section>
                  )}

                  <SetupAdminGrid>
                    <SetupAdminColumn>
                      <CompactFormSection title="Basic Information" icon={Maximize2} iconClassName="text-blue-600">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <Label className="mb-1.5 text-sm">
                              Prime Space Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              value={activeSpace?.spaceName || ''}
                              onChange={(e) =>
                                setEditedSpace({ ...activeSpace, spaceName: e.target.value })
                              }
                              disabled={!isEditing}
                              placeholder="e.g., Grand Hall, Crystal Ballroom, Garden Lawn"
                              className={inputStateClass}
                            />
                          </div>
                          <div>
                            <Label className="mb-1.5 text-sm">
                              Space Type <span className="text-red-500">*</span>
                            </Label>
                            <select
                              value={safeSpaceType}
                              onChange={(e) =>
                                setEditedSpace({ ...activeSpace, spaceType: e.target.value as any })
                              }
                              disabled={!isEditing}
                              className={selectStateClass}
                            >
                              {spaceTypes.map((type) => (
                                <option key={type.id} value={type.id}>
                                  {type.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <Label className="mb-1.5 text-sm">Floor Level</Label>
                            <Input
                              value={safeFloorLevel}
                              onChange={(e) =>
                                setEditedSpace({ ...activeSpace, floorLevel: e.target.value })
                              }
                              disabled={!isEditing}
                              placeholder="Ground Floor"
                              className={inputStateClass}
                            />
                          </div>
                        </div>
                      </CompactFormSection>

                      <CompactFormSection
                        title={`Environment & Capacity · ${safeIsIndoor ? 'Indoor' : 'Outdoor'}`}
                        icon={safeIsIndoor ? Home : Sun}
                        iconClassName={safeIsIndoor ? 'text-blue-600' : 'text-amber-600'}
                      >
                        <div className="grid gap-2.5 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-end">
                          <div>
                            <Label className="mb-1 text-sm">
                              Environment Type <span className="text-red-500">*</span>
                            </Label>
                            <select
                              value={safeIsIndoor ? 'indoor' : 'outdoor'}
                              onChange={(e) =>
                                setEditedSpace({ ...activeSpace, isIndoor: e.target.value === 'indoor' })
                              }
                              disabled={!isEditing}
                              className={selectStateClass}
                            >
                              <option value="indoor">Indoor</option>
                              <option value="outdoor">Outdoor</option>
                            </select>
                          </div>

                          <div className="grid gap-2.5 md:grid-cols-3">
                            <div>
                              <Label className="mb-1 text-sm">
                                Size <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                type="number"
                                value={safeSizeValue || ''}
                                onChange={(e) =>
                                  setEditedSpace({
                                    ...activeSpace,
                                    sizeValue: parseInt(e.target.value) || 0,
                                  })
                                }
                                disabled={!isEditing}
                                placeholder="15000"
                                className={inputStateClass}
                              />
                            </div>
                            <div>
                              <Label className="mb-1 text-sm">Unit</Label>
                              <select
                                value={safeSizeUnit}
                                onChange={(e) =>
                                  setEditedSpace({ ...activeSpace, sizeUnit: e.target.value as any })
                                }
                                disabled={!isEditing}
                                className={selectStateClass}
                              >
                                <option value="sqft">sq ft</option>
                                <option value="sqm">sq m</option>
                              </select>
                            </div>
                            <div>
                              <Label className="mb-1 text-sm">
                                Seating Capacity <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                type="number"
                                value={safeCapacity || ''}
                                onChange={(e) =>
                                  setEditedSpace({
                                    ...activeSpace,
                                    defaultSeatingCapacity: parseInt(e.target.value) || 0,
                                  })
                                }
                                disabled={!isEditing}
                                placeholder="800"
                                className={inputStateClass}
                              />
                            </div>
                          </div>
                        </div>
                      </CompactFormSection>

                    </SetupAdminColumn>

                    <SetupAdminColumn>
                      <CompactAccordionSection
                        title="Divisibility"
                        icon={Layers}
                        iconClassName="text-blue-600"
                        hint={activeSpace?.allowSubSpaces ? `${safeSubSpaceCount} sub-spaces` : 'Single unit'}
                      >
                        <button
                          type="button"
                          onClick={() => setShowDivisibilitySettings((value) => !value)}
                          className="flex w-full items-center justify-between text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Layers className="size-4 text-blue-600" />
                            <span className="text-sm font-semibold text-slate-900">Divisibility & Sub-Spaces</span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                              {activeSpace?.allowSubSpaces ? 'Divisible' : 'Single unit'}
                              {activeSpace?.allowSubSpaces ? ` · ${safeSubSpaceCount} sub-spaces` : ''}
                            </span>
                          </div>
                          <ChevronDown
                            className={`size-4 text-slate-500 transition-transform ${
                              showDivisibilitySettings ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {showDivisibilitySettings && (
                          <div className="mt-3 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditedSpace({ ...activeSpace, allowSubSpaces: true });
                                  setShowDivisibilitySettings(true);
                                }}
                                disabled={!isEditing}
                                className={`rounded-lg border px-3 py-2 text-sm transition ${
                                  activeSpace?.allowSubSpaces
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 bg-white text-slate-700'
                                } ${!isEditing ? 'cursor-not-allowed opacity-50' : 'hover:border-emerald-400'}`}
                              >
                                Divisible
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditedSpace({ ...activeSpace, allowSubSpaces: false })}
                                disabled={!isEditing}
                                className={`rounded-lg border px-3 py-2 text-sm transition ${
                                  !activeSpace?.allowSubSpaces
                                    ? 'border-slate-500 bg-slate-100 text-slate-700'
                                    : 'border-slate-200 bg-white text-slate-700'
                                } ${!isEditing ? 'cursor-not-allowed opacity-50' : 'hover:border-slate-400'}`}
                              >
                                Single unit
                              </button>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                              {activeSpace?.allowSubSpaces
                                ? `This space can be divided into sub-spaces. Current sub-space count: ${safeSubSpaceCount}.`
                                : 'This space will be booked as one unit only.'}
                            </div>
                          </div>
                        )}
                      </CompactAccordionSection>

                      <CompactAccordionSection
                        title="Booking Rules"
                        icon={Users}
                        iconClassName="text-blue-600"
                        hint={`${safeMinGuests}-${safeMaxGuests} guests`}
                      >
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <Label className="mb-1.5 text-sm">
                              Minimum Guests <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              type="number"
                              value={safeMinGuests || ''}
                              onChange={(e) =>
                                setEditedSpace({
                                  ...activeSpace,
                                  minimumGuests: parseInt(e.target.value) || 0,
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
                              value={safeMaxGuests || ''}
                              onChange={(e) =>
                                setEditedSpace({
                                  ...activeSpace,
                                  maximumGuests: parseInt(e.target.value) || 0,
                                })
                              }
                              disabled={!isEditing}
                              className={inputStateClass}
                            />
                          </div>
                        </div>
                      </CompactAccordionSection>

                      <CompactAccordionSection
                        title="Financial Settings"
                        icon={DollarSign}
                        iconClassName="text-blue-600"
                        hint={layoutTypes.find((layout) => layout.id === safeDefaultLayout)?.name || 'Layout'}
                      >
                        <button
                          type="button"
                          onClick={() => setShowAdvancedSettings((value) => !value)}
                          className="flex w-full items-center justify-between text-left"
                        >
                          <div className="flex items-center gap-2">
                            <DollarSign className="size-4 text-blue-600" />
                            <span className="text-sm font-semibold text-slate-900">Booking & Financial Settings</span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                              {layoutTypes.find((layout) => layout.id === safeDefaultLayout)?.name || 'Layout'}
                            </span>
                          </div>
                          <ChevronDown
                            className={`size-4 text-slate-500 transition-transform ${
                              showAdvancedSettings ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {showAdvancedSettings && (
                          <div className="mt-3 grid gap-2.5 md:grid-cols-2">
                            <div>
                              <Label className="mb-1 text-sm">Default Layout</Label>
                              <select
                                value={safeDefaultLayout}
                                onChange={(e) =>
                                  setEditedSpace({ ...activeSpace, defaultLayout: e.target.value as any })
                                }
                                disabled={!isEditing}
                                className={selectStateClass}
                              >
                                {layoutTypes.map((layout) => (
                                  <option key={layout.id} value={layout.id}>
                                    {layout.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label className="mb-1 text-sm">Fixed Minimum Advance</Label>
                              <Input
                                type="number"
                                min="0"
                                value={safeAdvanceAmount}
                                onChange={(e) =>
                                  setEditedSpace({
                                    ...activeSpace,
                                    minimumAdvanceAmount: parseInt(e.target.value) || 0,
                                  })
                                }
                                disabled={!isEditing}
                                className={inputStateClass}
                              />
                              <p className="mt-1 text-xs text-slate-500">
                                Enter the fixed minimum advance amount for full marquee or full prime space booking.
                              </p>
                            </div>
                            <div>
                              <Label className="mb-1 text-sm">Default Tax Group</Label>
                              <select
                                value={safeTaxGroup}
                                onChange={(e) =>
                                  setEditedSpace({ ...activeSpace, defaultTaxGroup: e.target.value })
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
                              <Label className="mb-1 text-sm">Balance Due Days Before Event</Label>
                              <Input
                                type="number"
                                min="0"
                                value={safeBalanceDueDays}
                                onChange={(e) =>
                                  setEditedSpace({
                                    ...activeSpace,
                                    balanceDueDaysBeforeEvent: parseInt(e.target.value) || 0,
                                  })
                                }
                                disabled={!isEditing}
                                className={inputStateClass}
                              />
                            </div>
                            <div>
                              <Label className="mb-1 text-sm">Security Deposit (Rs.)</Label>
                              <Input
                                type="number"
                                min="0"
                                value={safeSecurityDeposit}
                                onChange={(e) =>
                                  setEditedSpace({
                                    ...activeSpace,
                                    securityDeposit: parseInt(e.target.value) || 0,
                                  })
                                }
                                disabled={!isEditing}
                                className={inputStateClass}
                              />
                            </div>
                            <div>
                              <Label className="mb-1 text-sm">Overtime Charges (Rs./hour)</Label>
                              <Input
                                type="number"
                                min="0"
                                value={safeOvertimeCharges}
                                onChange={(e) =>
                                  setEditedSpace({
                                    ...activeSpace,
                                    overtimeChargesPerHour: parseInt(e.target.value) || 0,
                                  })
                                }
                                disabled={!isEditing}
                                className={inputStateClass}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label className="mb-1 text-sm">Additional Notes</Label>
                              <Textarea
                                value={safeNotes}
                                onChange={(e) => setEditedSpace({ ...activeSpace, notes: e.target.value })}
                                disabled={!isEditing}
                                rows={3}
                                placeholder="Any additional information about the space, special features, restrictions, etc."
                                className={inputStateClass}
                              />
                            </div>
                          </div>
                        )}
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
                                      safeIsActive
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {safeIsActive ? 'Active' : 'Inactive'}
                                  </span>
                                ),
                              },
                              {
                                label: 'Created',
                                value: `${formatRecordDate(activeSpace?.createdAt)} by ${safeCreatedBy}`,
                              },
                              ...(activeSpace?.updatedAt
                                ? [
                                    {
                                      label: 'Last Updated',
                                      value: `${formatRecordDate(activeSpace.updatedAt)} by ${activeSpace.updatedBy || 'Unknown'}`,
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
