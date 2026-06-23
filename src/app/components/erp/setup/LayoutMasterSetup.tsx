import { useState, useEffect } from 'react';
import {
  LayoutGrid,
  Plus,
  Search,
  ChevronRight,
  Edit2,
  Trash2,
  Save,
  X,
  AlertCircle,
  Users,
  Percent,
  MapPin,
  CheckCircle2,
  XCircle,
  Building2,
  Maximize2,
  Layers,
  Calendar,
  Info,
  Link,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { layoutDataStore, primeSpaceDataStore, subSpaceDataStore, venueDataStore } from '../../../lib/masterDataStore';

interface Layout {
  id: string;
  
  // Basic Information
  layoutName: string;
  layoutCode: string;
  layoutCategory: 'buffet' | 'banquet-wedding' | 'family-style' | 'classroom' | 'theatre' | 'cocktail' | 'u-shape' | 'boardroom';
  
  // Seating Configuration
  seatingDescription: string;
  seatingPerTable?: number;
  spaceUtilizationPercentage: number; // e.g., 60% means layout uses 60% of available space
  
  // Capacity
  minimumGuests: number;
  maximumGuests: number;
  
  // Event Types
  allowedEventTypes: string[];
  
  // Space Mapping
  mappedPrimeSpaces: string[]; // IDs of prime spaces
  mappedSubSpaces: string[]; // IDs of sub-spaces
  
  // Status
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  
  // Notes
  notes?: string;
}

interface Venue {
  id: string;
  venueName: string;
  venueCode: string;
}

interface PrimeSpace {
  id: string;
  venueId: string;
  spaceName: string;
  spaceCode: string;
  defaultSeatingCapacity: number;
  minimumGuests: number;
  maximumGuests: number;
  allowSubSpaces: boolean;
}

interface SubSpace {
  id: string;
  primeSpaceId: string;
  subSpaceName: string;
  subSpaceCode: string;
  customCapacity?: number;
  customMinGuests?: number;
  customMaxGuests?: number;
}

interface LayoutMasterSetupProps {
  userName: string;
}

export function LayoutMasterSetup({ userName }: LayoutMasterSetupProps) {
  // Default Data
  const defaultVenues: Venue[] = [
    { id: '1', venueName: 'Aiwan-e-Akbari Grand Banquet', venueCode: 'VEN001' },
    { id: '2', venueName: 'Emerald Banquet Hall', venueCode: 'VEN002' },
  ];

  const defaultPrimeSpaces: PrimeSpace[] = [
    {
      id: '1',
      venueId: '1',
      spaceName: 'Grand Hall',
      spaceCode: 'VEN001-PS001',
      defaultSeatingCapacity: 800,
      minimumGuests: 400,
      maximumGuests: 1000,
      allowSubSpaces: true,
    },
    {
      id: '2',
      venueId: '1',
      spaceName: 'Crystal Ballroom',
      spaceCode: 'VEN001-PS002',
      defaultSeatingCapacity: 500,
      minimumGuests: 250,
      maximumGuests: 650,
      allowSubSpaces: false,
    },
    {
      id: '3',
      venueId: '1',
      spaceName: 'Garden Lawn',
      spaceCode: 'VEN001-PS003',
      defaultSeatingCapacity: 400,
      minimumGuests: 200,
      maximumGuests: 500,
      allowSubSpaces: false,
    },
  ];

  const defaultSubSpaces: SubSpace[] = [
    {
      id: '1',
      primeSpaceId: '1',
      subSpaceName: 'Grand Hall - Section A',
      subSpaceCode: 'VEN001-PS001-SS001',
      customCapacity: 400,
      customMinGuests: 200,
      customMaxGuests: 500,
    },
    {
      id: '2',
      primeSpaceId: '1',
      subSpaceName: 'Grand Hall - Section B',
      subSpaceCode: 'VEN001-PS001-SS002',
      customCapacity: 400,
      customMinGuests: 200,
      customMaxGuests: 500,
    },
  ];

  const defaultLayouts: Layout[] = [
    {
      id: '1',
      layoutName: 'Standard Banquet - Round Tables',
      layoutCode: 'LAY001',
      layoutCategory: 'banquet-wedding',
      seatingDescription: 'Round tables with 10 guests per table, elegant spacing for formal dining',
      seatingPerTable: 10,
      spaceUtilizationPercentage: 60,
      minimumGuests: 100,
      maximumGuests: 1000,
      allowedEventTypes: ['walima', 'barat', 'engagement', 'corporate-dinner'],
      mappedPrimeSpaces: ['1', '2'],
      mappedSubSpaces: ['1', '2'],
      isActive: true,
      createdAt: new Date('2024-01-01'),
      createdBy: 'Admin',
      notes: 'Most popular layout for wedding receptions. Requires 6.5 sqft per guest.',
    },
    {
      id: '2',
      layoutName: 'Buffet Style - Mixed Seating',
      layoutCode: 'LAY002',
      layoutCategory: 'buffet',
      seatingDescription: 'Mixed round and rectangular tables with self-service buffet stations',
      seatingPerTable: 8,
      spaceUtilizationPercentage: 55,
      minimumGuests: 50,
      maximumGuests: 800,
      allowedEventTypes: ['mehndi', 'corporate-lunch', 'birthday'],
      mappedPrimeSpaces: ['1', '2', '3'],
      mappedSubSpaces: ['1', '2'],
      isActive: true,
      createdAt: new Date('2024-01-05'),
      createdBy: 'Admin',
      notes: 'Requires dedicated buffet area. Popular for daytime events.',
    },
    {
      id: '3',
      layoutName: 'Theater Style - Rows',
      layoutCode: 'LAY003',
      layoutCategory: 'theatre',
      seatingDescription: 'Chair rows facing stage, no tables, maximum capacity utilization',
      spaceUtilizationPercentage: 80,
      minimumGuests: 100,
      maximumGuests: 1500,
      allowedEventTypes: ['corporate-seminar', 'conference'],
      mappedPrimeSpaces: ['1', '2'],
      mappedSubSpaces: [],
      isActive: true,
      createdAt: new Date('2024-01-10'),
      createdBy: 'Admin',
      notes: 'Highest capacity layout. No dining service. Requires stage and AV setup.',
    },
    {
      id: '4',
      layoutName: 'Classroom Style',
      layoutCode: 'LAY004',
      layoutCategory: 'classroom',
      seatingDescription: 'Rows of tables with chairs, note-taking friendly for training sessions',
      seatingPerTable: 3,
      spaceUtilizationPercentage: 50,
      minimumGuests: 30,
      maximumGuests: 500,
      allowedEventTypes: ['corporate-training', 'corporate-seminar'],
      mappedPrimeSpaces: ['2'],
      mappedSubSpaces: ['1', '2'],
      isActive: true,
      createdAt: new Date('2024-01-15'),
      createdBy: 'Admin',
      notes: 'Ideal for corporate training. Requires notepads and water bottles at each seat.',
    },
  ];

  const eventTypes = [
    { id: 'walima', name: 'Walima' },
    { id: 'barat', name: 'Barat' },
    { id: 'mehndi', name: 'Mehndi' },
    { id: 'engagement', name: 'Engagement / Mangni' },
    { id: 'birthday', name: 'Birthday Party' },
    { id: 'corporate-dinner', name: 'Corporate Dinner' },
    { id: 'corporate-lunch', name: 'Corporate Lunch' },
    { id: 'corporate-seminar', name: 'Corporate Seminar' },
    { id: 'corporate-training', name: 'Corporate Training' },
    { id: 'conference', name: 'Conference' },
    { id: 'other', name: 'Other Event' },
  ];

  const layoutCategories = [
    { id: 'banquet-wedding', name: 'Banquet / Wedding', icon: Users, color: 'purple' },
    { id: 'buffet', name: 'Buffet Style', icon: LayoutGrid, color: 'blue' },
    { id: 'family-style', name: 'Family Style', icon: Users, color: 'green' },
    { id: 'classroom', name: 'Classroom', icon: LayoutGrid, color: 'amber' },
    { id: 'theatre', name: 'Theatre / Rows', icon: LayoutGrid, color: 'red' },
    { id: 'cocktail', name: 'Cocktail / Standing', icon: Users, color: 'pink' },
    { id: 'u-shape', name: 'U-Shape', icon: LayoutGrid, color: 'indigo' },
    { id: 'boardroom', name: 'Boardroom', icon: LayoutGrid, color: 'gray' },
  ];

  const [venues, setVenues] = useState<Venue[]>([]);
  const [primeSpaces, setPrimeSpaces] = useState<PrimeSpace[]>([]);
  const [subSpaces, setSubSpaces] = useState<SubSpace[]>([]);
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<Layout | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editedLayout, setEditedLayout] = useState<Layout | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const loadedVenues = venueDataStore.getVenues([]);
    setVenues(loadedVenues);
  }, []);

  useEffect(() => {
    const loadedPrimeSpaces = primeSpaceDataStore.getPrimeSpaces([]);
    setPrimeSpaces(loadedPrimeSpaces);
  }, []);

  useEffect(() => {
    const loadedSubSpaces = subSpaceDataStore.getSubSpaces([]);
    setSubSpaces(loadedSubSpaces);
  }, []);

  useEffect(() => {
    const loadedLayouts = layoutDataStore.getLayouts([]);
    setLayouts(loadedLayouts);
    if (loadedLayouts.length > 0 && !selectedLayout) {
      setSelectedLayout(loadedLayouts[0]);
    }
  }, []);

  // Save layouts to localStorage whenever they change
  useEffect(() => {
    if (layouts.length > 0) {
      layoutDataStore.saveLayouts(layouts);
    }
  }, [layouts]);

  const filteredLayouts = layouts.filter(
    (layout) =>
      layout.layoutName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      layout.layoutCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      layout.layoutCategory.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = () => {
    const newLayout: Layout = {
      id: `temp-${Date.now()}`,
      layoutName: '',
      layoutCode: `LAY${String(defaultLayouts.length + 1).padStart(3, '0')}`,
      layoutCategory: 'banquet-wedding',
      seatingDescription: '',
      spaceUtilizationPercentage: 60,
      minimumGuests: 50,
      maximumGuests: 1000,
      allowedEventTypes: [],
      mappedPrimeSpaces: [],
      mappedSubSpaces: [],
      isActive: true,
      createdAt: new Date(),
      createdBy: userName,
    };

    setEditedLayout(newLayout);
    setSelectedLayout(newLayout);
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEdit = () => {
    if (selectedLayout) {
      setEditedLayout({ ...selectedLayout });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (!editedLayout) return;

    // Validation
    if (!editedLayout.layoutName.trim()) {
      alert('Layout Name is required');
      return;
    }
    if (editedLayout.minimumGuests > editedLayout.maximumGuests) {
      alert('Minimum guests cannot exceed maximum guests');
      return;
    }
    if (editedLayout.spaceUtilizationPercentage < 1 || editedLayout.spaceUtilizationPercentage > 100) {
      alert('Space utilization must be between 1% and 100%');
      return;
    }
    if (editedLayout.allowedEventTypes.length === 0) {
      alert('Please select at least one allowed event type');
      return;
    }

    if (isCreating) {
      const newLayout = {
        ...editedLayout,
        id: Date.now().toString(),
        createdAt: new Date(),
        createdBy: userName,
      };
      setLayouts([...layouts, newLayout]);
      setSelectedLayout(newLayout);
      setIsCreating(false);
    } else {
      setLayouts(
        layouts.map((l) =>
          l.id === editedLayout.id
            ? { ...editedLayout, updatedAt: new Date(), updatedBy: userName }
            : l
        )
      );
      setSelectedLayout(editedLayout);
    }

    setIsEditing(false);
    setEditedLayout(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedLayout(null);
    if (isCreating) {
      setSelectedLayout(defaultLayouts[0] || null);
      setIsCreating(false);
    }
  };

  const handleDelete = () => {
    if (!selectedLayout || !window.confirm(`Are you sure you want to delete "${selectedLayout.layoutName}"?`))
      return;

    setLayouts(layouts.filter((l) => l.id !== selectedLayout.id));
    setSelectedLayout(defaultLayouts[0] || null);
  };

  const handleToggleStatus = () => {
    if (!selectedLayout) return;

    const updatedLayout = { ...selectedLayout, isActive: !selectedLayout.isActive };
    setLayouts(layouts.map((l) => (l.id === selectedLayout.id ? updatedLayout : l)));
    setSelectedLayout(updatedLayout);
  };

  const handleEventTypeToggle = (eventTypeId: string) => {
    if (!editedLayout) return;

    const currentTypes = editedLayout.allowedEventTypes || [];
    const newTypes = currentTypes.includes(eventTypeId)
      ? currentTypes.filter((t) => t !== eventTypeId)
      : [...currentTypes, eventTypeId];

    setEditedLayout({ ...editedLayout, allowedEventTypes: newTypes });
  };

  const handlePrimeSpaceToggle = (spaceId: string) => {
    if (!editedLayout) return;

    const currentSpaces = editedLayout.mappedPrimeSpaces || [];
    const newSpaces = currentSpaces.includes(spaceId)
      ? currentSpaces.filter((s) => s !== spaceId)
      : [...currentSpaces, spaceId];

    setEditedLayout({ ...editedLayout, mappedPrimeSpaces: newSpaces });
  };

  const handleSubSpaceToggle = (spaceId: string) => {
    if (!editedLayout) return;

    const currentSpaces = editedLayout.mappedSubSpaces || [];
    const newSpaces = currentSpaces.includes(spaceId)
      ? currentSpaces.filter((s) => s !== spaceId)
      : [...currentSpaces, spaceId];

    setEditedLayout({ ...editedLayout, mappedSubSpaces: newSpaces });
  };

  const activeLayout = editedLayout || selectedLayout;

  // Check if layout is compatible with a space
  const isLayoutCompatible = (spaceCapacity: number, spaceMinGuests: number, spaceMaxGuests: number) => {
    if (!activeLayout) return false;
    
    // Layout max guests should work within space capacity
    const effectiveCapacity = Math.floor((spaceCapacity * activeLayout.spaceUtilizationPercentage) / 100);
    
    // Check if there's overlap between layout guest range and space guest range
    const layoutMin = activeLayout.minimumGuests;
    const layoutMax = Math.min(activeLayout.maximumGuests, effectiveCapacity);
    
    return layoutMin <= spaceMaxGuests && layoutMax >= spaceMinGuests;
  };

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-3">
        <div className="flex items-start gap-2">
          <Info className="size-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Layout Master defines seating and service styles.</strong> Map layouts to spaces to
            control which layouts are available during booking. Invalid combinations are automatically
            prevented.
          </div>
        </div>
      </div>

      {/* Split Panel Layout */}
      <div className="h-[calc(100vh-300px)] flex gap-5">
        {/* LEFT PANEL - Layout List */}
        <div className="w-80 bg-white rounded-lg border border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
                <LayoutGrid className="size-5 text-indigo-600" />
                Layouts ({layouts.length})
              </h3>
              <Button
                onClick={handleCreateNew}
                disabled={isEditing}
                className="bg-indigo-600 hover:bg-indigo-700 h-8"
                size="sm"
              >
                <Plus className="size-4 mr-1" />
                New
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search layouts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Layout List */}
          <div className="flex-1 overflow-y-auto">
            {filteredLayouts.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                <LayoutGrid className="size-12 text-gray-300 mx-auto mb-2" />
                <p>No layouts found</p>
                <p className="text-xs mt-1">Click "New" to create one</p>
              </div>
            ) : (
              <div className="p-2">
                {filteredLayouts.map((layout) => {
                  const category = layoutCategories.find((c) => c.id === layout.layoutCategory);
                  const CategoryIcon = category?.icon || LayoutGrid;

                  return (
                    <button
                      key={layout.id}
                      onClick={() => {
                        if (!isEditing) {
                          setSelectedLayout(layout);
                        }
                      }}
                      disabled={isEditing}
                      className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                        selectedLayout?.id === layout.id
                          ? 'bg-indigo-50 border-2 border-indigo-500'
                          : 'hover:bg-gray-50 border-2 border-transparent'
                      } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CategoryIcon className="size-4 text-indigo-600 flex-shrink-0" />
                            <h4 className="font-medium text-sm text-[#2E2E2E] truncate">
                              {layout.layoutName}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                              {layout.layoutCode}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                                layout.isActive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {layout.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="mb-2">
                            <span className={`px-2 py-0.5 bg-${category?.color}-100 text-${category?.color}-700 rounded text-xs capitalize`}>
                              {category?.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Users className="size-3" />
                              <span>{layout.minimumGuests}-{layout.maximumGuests}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Percent className="size-3" />
                              <span>{layout.spaceUtilizationPercentage}%</span>
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            <span>{layout.mappedPrimeSpaces.length} spaces mapped</span>
                          </div>
                        </div>
                        <ChevronRight
                          className={`size-4 text-gray-400 flex-shrink-0 mt-1 ${
                            selectedLayout?.id === layout.id ? 'text-indigo-600' : ''
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

        {/* RIGHT PANEL - Layout Details */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col">
          {!activeLayout ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <LayoutGrid className="size-16 text-gray-300 mx-auto mb-3" />
                <p className="text-sm">Select a layout to view details</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <LayoutGrid className="size-5 text-indigo-600" />
                      <h2 className="text-xl font-semibold text-[#2E2E2E]">
                        {isCreating ? 'Create New Layout' : activeLayout.layoutName || 'Unnamed Layout'}
                      </h2>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                        {activeLayout.layoutCode}
                      </span>
                      {!isCreating && (
                        <>
                          <span>•</span>
                          <span>
                            Created by {activeLayout.createdBy} on{' '}
                            {activeLayout.createdAt.toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <>
                        <Button
                          onClick={handleToggleStatus}
                          variant="outline"
                          className={
                            activeLayout.isActive
                              ? 'border-red-300 text-red-700 hover:bg-red-50'
                              : 'border-green-300 text-green-700 hover:bg-green-50'
                          }
                        >
                          {activeLayout.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button onClick={handleEdit} className="bg-indigo-600 hover:bg-indigo-700">
                          <Edit2 className="size-4 mr-2" />
                          Edit
                        </Button>
                        {!isCreating && (
                          <Button
                            onClick={handleDelete}
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <Button onClick={handleCancel} variant="outline">
                          <X className="size-4 mr-2" />
                          Cancel
                        </Button>
                        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                          <Save className="size-4 mr-2" />
                          Save Layout
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-5xl space-y-6">
                  {/* Validation Warning */}
                  {isEditing && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="size-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700">
                          Fields marked with <span className="text-red-500 font-bold">*</span> are
                          required. Map layouts to spaces after defining the layout configuration.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* SECTION 1: Layout Configuration */}
                  <div className="border-2 border-indigo-200 rounded-lg p-5 bg-indigo-50">
                    <h3 className="font-semibold text-lg text-[#2E2E2E] mb-4 flex items-center gap-2">
                      <LayoutGrid className="size-5 text-indigo-600" />
                      Layout Configuration
                    </h3>

                    {/* Basic Information */}
                    <div className="bg-white rounded-lg p-5 mb-4 border border-gray-200">
                      <h4 className="font-medium text-[#2E2E2E] mb-3">Basic Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label className="text-sm mb-1.5">
                            Layout Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={activeLayout.layoutName}
                            onChange={(e) =>
                              setEditedLayout({ ...activeLayout, layoutName: e.target.value })
                            }
                            disabled={!isEditing}
                            placeholder="e.g., Standard Banquet - Round Tables"
                            className={`${!isEditing ? 'bg-gray-50' : 'bg-white'} text-base`}
                          />
                        </div>
                        <div>
                          <Label className="text-sm mb-1.5">
                            Layout Code <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={activeLayout.layoutCode}
                            disabled
                            className="bg-gray-100 font-mono"
                          />
                          <p className="text-xs text-gray-500 mt-1">Auto-generated</p>
                        </div>
                        <div>
                          <Label className="text-sm mb-1.5">
                            Layout Category <span className="text-red-500">*</span>
                          </Label>
                          <select
                            value={activeLayout.layoutCategory}
                            onChange={(e) =>
                              setEditedLayout({ ...activeLayout, layoutCategory: e.target.value as any })
                            }
                            disabled={!isEditing}
                            className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm ${
                              !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                            }`}
                          >
                            {layoutCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Seating Configuration */}
                    <div className="bg-white rounded-lg p-5 mb-4 border border-gray-200">
                      <h4 className="font-medium text-[#2E2E2E] mb-3 flex items-center gap-2">
                        <Users className="size-4 text-indigo-600" />
                        Seating Configuration
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm mb-1.5">
                            Seating Description <span className="text-red-500">*</span>
                          </Label>
                          <Textarea
                            value={activeLayout.seatingDescription}
                            onChange={(e) =>
                              setEditedLayout({ ...activeLayout, seatingDescription: e.target.value })
                            }
                            disabled={!isEditing}
                            rows={2}
                            placeholder="Describe the seating arrangement and style"
                            className={!isEditing ? 'bg-gray-50' : 'bg-white'}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm mb-1.5">Seating per Table</Label>
                            <Input
                              type="number"
                              value={activeLayout.seatingPerTable || ''}
                              onChange={(e) =>
                                setEditedLayout({
                                  ...activeLayout,
                                  seatingPerTable: parseInt(e.target.value) || undefined,
                                })
                              }
                              disabled={!isEditing}
                              placeholder="10"
                              className={!isEditing ? 'bg-gray-50' : 'bg-white'}
                            />
                            <p className="text-xs text-gray-500 mt-1">Optional (0 for theatre)</p>
                          </div>
                          <div>
                            <Label className="text-sm mb-1.5">
                              Space Utilization <span className="text-red-500">*</span>
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                max="100"
                                value={activeLayout.spaceUtilizationPercentage}
                                onChange={(e) =>
                                  setEditedLayout({
                                    ...activeLayout,
                                    spaceUtilizationPercentage: parseInt(e.target.value) || 60,
                                  })
                                }
                                disabled={!isEditing}
                                className={!isEditing ? 'bg-gray-50' : 'bg-white'}
                              />
                              <Percent className="size-4 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">1-100%</p>
                          </div>
                          <div className="bg-blue-50 rounded p-3 border border-blue-200">
                            <p className="text-xs text-blue-700 mb-1">Effective Capacity</p>
                            <p className="text-lg font-bold text-blue-900">
                              {Math.floor((800 * activeLayout.spaceUtilizationPercentage) / 100)}
                            </p>
                            <p className="text-xs text-blue-600">Based on 800 cap space</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Guest Limits */}
                    <div className="bg-white rounded-lg p-5 mb-4 border border-gray-200">
                      <h4 className="font-medium text-[#2E2E2E] mb-3 flex items-center gap-2">
                        <Users className="size-4 text-indigo-600" />
                        Guest Limits
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm mb-1.5">
                            Minimum Guests <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            value={activeLayout.minimumGuests}
                            onChange={(e) =>
                              setEditedLayout({
                                ...activeLayout,
                                minimumGuests: parseInt(e.target.value) || 0,
                              })
                            }
                            disabled={!isEditing}
                            placeholder="50"
                            className={!isEditing ? 'bg-gray-50' : 'bg-white'}
                          />
                        </div>
                        <div>
                          <Label className="text-sm mb-1.5">
                            Maximum Guests <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            value={activeLayout.maximumGuests}
                            onChange={(e) =>
                              setEditedLayout({
                                ...activeLayout,
                                maximumGuests: parseInt(e.target.value) || 0,
                              })
                            }
                            disabled={!isEditing}
                            placeholder="1000"
                            className={!isEditing ? 'bg-gray-50' : 'bg-white'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Allowed Event Types */}
                    <div className="bg-white rounded-lg p-5 border border-gray-200">
                      <h4 className="font-medium text-[#2E2E2E] mb-3 flex items-center gap-2">
                        <Calendar className="size-4 text-indigo-600" />
                        Allowed Event Types <span className="text-red-500">*</span>
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {eventTypes.map((eventType) => (
                          <label
                            key={eventType.id}
                            className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                              activeLayout.allowedEventTypes?.includes(eventType.id)
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 bg-white hover:border-indigo-300'
                            } ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={activeLayout.allowedEventTypes?.includes(eventType.id)}
                              onChange={() => handleEventTypeToggle(eventType.id)}
                              disabled={!isEditing}
                              className="rounded"
                            />
                            <span className="text-sm font-medium">{eventType.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Space Mapping */}
                  <div className="border-2 border-green-200 rounded-lg p-5 bg-green-50">
                    <h3 className="font-semibold text-lg text-[#2E2E2E] mb-4 flex items-center gap-2">
                      <Link className="size-5 text-green-600" />
                      Space Mapping
                    </h3>

                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="size-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-800">
                          <strong>Compatibility Check:</strong> System validates that layout guest limits
                          and space utilization fit within each space's capacity. Incompatible spaces are
                          marked in red and cannot be selected.
                        </div>
                      </div>
                    </div>

                    {/* Prime Spaces Mapping */}
                    <div className="bg-white rounded-lg p-5 mb-4 border border-gray-200">
                      <h4 className="font-medium text-[#2E2E2E] mb-3 flex items-center gap-2">
                        <Maximize2 className="size-4 text-blue-600" />
                        Map to Prime Spaces
                      </h4>
                      <div className="space-y-2">
                        {venues.map((venue) => {
                          const venueSpaces = primeSpaces.filter((ps) => ps.venueId === venue.id);
                          if (venueSpaces.length === 0) return null;

                          return (
                            <div key={venue.id}>
                              <div className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                <Building2 className="size-3" />
                                {venue.venueName}
                              </div>
                              <div className="grid grid-cols-1 gap-2 ml-4 mb-3">
                                {venueSpaces.map((space) => {
                                  const compatible = isLayoutCompatible(
                                    space.defaultSeatingCapacity,
                                    space.minimumGuests,
                                    space.maximumGuests
                                  );
                                  const effectiveCapacity = Math.floor(
                                    (space.defaultSeatingCapacity * activeLayout.spaceUtilizationPercentage) / 100
                                  );

                                  return (
                                    <label
                                      key={space.id}
                                      className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                                        !compatible
                                          ? 'border-red-300 bg-red-50 opacity-60 cursor-not-allowed'
                                          : activeLayout.mappedPrimeSpaces?.includes(space.id)
                                          ? 'border-green-500 bg-green-50'
                                          : 'border-gray-200 bg-white hover:border-green-300'
                                      } ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={activeLayout.mappedPrimeSpaces?.includes(space.id)}
                                        onChange={() => handlePrimeSpaceToggle(space.id)}
                                        disabled={!isEditing || !compatible}
                                        className="rounded"
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-sm font-medium">{space.spaceName}</span>
                                          <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                            {space.spaceCode}
                                          </span>
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          Capacity: {space.defaultSeatingCapacity} → Effective:{' '}
                                          {effectiveCapacity} | Range: {space.minimumGuests}-
                                          {space.maximumGuests}
                                        </div>
                                      </div>
                                      {compatible ? (
                                        <CheckCircle2 className="size-4 text-green-600 flex-shrink-0" />
                                      ) : (
                                        <XCircle className="size-4 text-red-600 flex-shrink-0" />
                                      )}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sub-Spaces Mapping */}
                    <div className="bg-white rounded-lg p-5 border border-gray-200">
                      <h4 className="font-medium text-[#2E2E2E] mb-3 flex items-center gap-2">
                        <Layers className="size-4 text-purple-600" />
                        Map to Sub-Spaces
                      </h4>
                      {subSpaces.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-4">
                          No sub-spaces available
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {primeSpaces
                            .filter((ps) => ps.allowSubSpaces)
                            .map((primeSpace) => {
                              const primeSubSpaces = subSpaces.filter(
                                (ss) => ss.primeSpaceId === primeSpace.id
                              );
                              if (primeSubSpaces.length === 0) return null;

                              return (
                                <div key={primeSpace.id}>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                    <Maximize2 className="size-3" />
                                    {primeSpace.spaceName}
                                  </div>
                                  <div className="grid grid-cols-1 gap-2 ml-4 mb-3">
                                    {primeSubSpaces.map((subSpace) => {
                                      const capacity = subSpace.customCapacity || primeSpace.defaultSeatingCapacity;
                                      const minGuests = subSpace.customMinGuests || primeSpace.minimumGuests;
                                      const maxGuests = subSpace.customMaxGuests || primeSpace.maximumGuests;
                                      const compatible = isLayoutCompatible(capacity, minGuests, maxGuests);
                                      const effectiveCapacity = Math.floor(
                                        (capacity * activeLayout.spaceUtilizationPercentage) / 100
                                      );

                                      return (
                                        <label
                                          key={subSpace.id}
                                          className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                                            !compatible
                                              ? 'border-red-300 bg-red-50 opacity-60 cursor-not-allowed'
                                              : activeLayout.mappedSubSpaces?.includes(subSpace.id)
                                              ? 'border-purple-500 bg-purple-50'
                                              : 'border-gray-200 bg-white hover:border-purple-300'
                                          } ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={activeLayout.mappedSubSpaces?.includes(subSpace.id)}
                                            onChange={() => handleSubSpaceToggle(subSpace.id)}
                                            disabled={!isEditing || !compatible}
                                            className="rounded"
                                          />
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="text-sm font-medium">
                                                {subSpace.subSpaceName}
                                              </span>
                                              <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                {subSpace.subSpaceCode}
                                              </span>
                                            </div>
                                            <div className="text-xs text-gray-600">
                                              Capacity: {capacity} → Effective: {effectiveCapacity} |
                                              Range: {minGuests}-{maxGuests}
                                            </div>
                                          </div>
                                          {compatible ? (
                                            <CheckCircle2 className="size-4 text-purple-600 flex-shrink-0" />
                                          ) : (
                                            <XCircle className="size-4 text-red-600 flex-shrink-0" />
                                          )}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                    <h3 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
                      <LayoutGrid className="size-5 text-indigo-600" />
                      Additional Notes
                    </h3>
                    <Textarea
                      value={activeLayout.notes || ''}
                      onChange={(e) => setEditedLayout({ ...activeLayout, notes: e.target.value })}
                      disabled={!isEditing}
                      rows={3}
                      placeholder="Any additional information about the layout, setup requirements, pricing notes, etc."
                      className={!isEditing ? 'bg-gray-50' : 'bg-white'}
                    />
                  </div>

                  {/* Status Information */}
                  {!isCreating && (
                    <div className="bg-gray-100 rounded-lg p-4 border border-gray-300">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Record Information
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <span
                            className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                              activeLayout.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {activeLayout.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Mapped Spaces:</span>
                          <span className="ml-2 text-gray-900">
                            {activeLayout.mappedPrimeSpaces.length} prime,{' '}
                            {activeLayout.mappedSubSpaces.length} sub
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Created:</span>
                          <span className="ml-2 text-gray-900">
                            {activeLayout.createdAt.toLocaleDateString()} by {activeLayout.createdBy}
                          </span>
                        </div>
                        {activeLayout.updatedAt && (
                          <div>
                            <span className="text-gray-500">Last Updated:</span>
                            <span className="ml-2 text-gray-900">
                              {activeLayout.updatedAt.toLocaleDateString()} by{' '}
                              {activeLayout.updatedBy}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
