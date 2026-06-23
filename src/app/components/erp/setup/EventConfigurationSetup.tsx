import { useState, useEffect } from 'react';
import {
  PartyPopper,
  Clock,
  Wrench,
  Package,
  LayoutGrid,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { TimePicker, formatTimeDisplay } from '../../ui/time-picker';
import { LayoutMasterSetup } from './LayoutMasterSetup';
import { eventConfigDataStore } from '../../../lib/masterDataStore';

interface EventType {
  id: string;
  name: string;
  displayName: string;
  category: 'wedding' | 'corporate' | 'social' | 'other';
  requiresCouple: boolean;
  defaultDuration: number; // in hours
  color: string;
  isActive: boolean;
}

interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  slotType: 'morning' | 'afternoon' | 'evening' | 'night';
  isActive: boolean;
}

interface Service {
  id: string;
  name: string;
  category: 'decoration' | 'entertainment' | 'catering' | 'other';
  basePrice: number;
  isActive: boolean;
}

interface MenuPackage {
  id: string;
  name: string;
  pricePerPerson: number;
  description: string;
  isActive: boolean;
}

export function EventConfigurationSetup() {
  const [activeTab, setActiveTab] = useState<'event-types' | 'time-slots' | 'services' | 'packages'>('event-types');

  // Event Types - Initial data
  const [eventTypes, setEventTypes] = useState<EventType[]>([
    { id: '1', name: 'wedding', displayName: 'Wedding', category: 'wedding', requiresCouple: true, defaultDuration: 6, color: '#e11d48', isActive: true },
    { id: '2', name: 'walima', displayName: 'Walima', category: 'wedding', requiresCouple: true, defaultDuration: 5, color: '#db2777', isActive: true },
    { id: '3', name: 'mehndi', displayName: 'Mehndi', category: 'wedding', requiresCouple: true, defaultDuration: 5, color: '#f97316', isActive: true },
    { id: '4', name: 'engagement', displayName: 'Engagement', category: 'wedding', requiresCouple: true, defaultDuration: 4, color: '#ec4899', isActive: true },
    { id: '5', name: 'birthday', displayName: 'Birthday Party', category: 'social', requiresCouple: false, defaultDuration: 4, color: '#8b5cf6', isActive: true },
    { id: '6', name: 'corporate', displayName: 'Corporate Event', category: 'corporate', requiresCouple: false, defaultDuration: 5, color: '#3b82f6', isActive: true },
    { id: '7', name: 'anniversary', displayName: 'Anniversary', category: 'social', requiresCouple: true, defaultDuration: 4, color: '#06b6d4', isActive: true },
    { id: '8', name: 'conference', displayName: 'Conference / Seminar', category: 'corporate', requiresCouple: false, defaultDuration: 8, color: '#10b981', isActive: true },
  ]);

  // Time Slots - Initial data
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { id: '1', name: 'Morning Shift', startTime: '10:00', endTime: '14:00', slotType: 'morning', isActive: true },
    { id: '2', name: 'Afternoon Shift', startTime: '14:00', endTime: '18:00', slotType: 'afternoon', isActive: true },
    { id: '3', name: 'Evening Shift', startTime: '18:00', endTime: '23:00', slotType: 'evening', isActive: true },
    { id: '4', name: 'Night Shift', startTime: '19:00', endTime: '00:00', slotType: 'night', isActive: true },
  ]);

  // Services - Initial data
  const [services, setServices] = useState<Service[]>([
    { id: '1', name: 'Stage Setup', category: 'decoration', basePrice: 50000, isActive: true },
    { id: '2', name: 'DJ / Sound System', category: 'entertainment', basePrice: 35000, isActive: true },
    { id: '3', name: 'Photography', category: 'entertainment', basePrice: 60000, isActive: true },
    { id: '4', name: 'Videography', category: 'entertainment', basePrice: 80000, isActive: true },
    { id: '5', name: 'Lighting & Decor', category: 'decoration', basePrice: 75000, isActive: true },
    { id: '6', name: 'Flower Decoration', category: 'decoration', basePrice: 40000, isActive: true },
    { id: '7', name: 'Welcome Desk', category: 'other', basePrice: 15000, isActive: true },
  ]);

  // Packages - Initial data
  const [packages, setPackages] = useState<MenuPackage[]>([
    { id: '1', name: 'Premium Package', pricePerPerson: 3500, description: '5-course meal with premium items', isActive: true },
    { id: '2', name: 'Standard Package', pricePerPerson: 2500, description: '4-course meal with standard items', isActive: true },
    { id: '3', name: 'Basic Package', pricePerPerson: 1800, description: '3-course meal with basic items', isActive: true },
    { id: '4', name: 'Corporate Package', pricePerPerson: 2200, description: 'Continental & Pakistani mix', isActive: true },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Editing state for each type
  const [editingEventType, setEditingEventType] = useState<EventType | null>(null);
  const [editingTimeSlot, setEditingTimeSlot] = useState<TimeSlot | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingPackage, setEditingPackage] = useState<MenuPackage | null>(null);

  // New Event Type Form
  const [newEventType, setNewEventType] = useState<Partial<EventType>>({
    name: '',
    displayName: '',
    category: 'social',
    requiresCouple: false,
    defaultDuration: 4,
    color: '#3b82f6',
    isActive: true,
  });

  // New Time Slot Form
  const [newTimeSlot, setNewTimeSlot] = useState<Partial<TimeSlot>>({
    name: '',
    startTime: '10:00',
    endTime: '14:00',
    slotType: 'morning',
    isActive: true,
  });

  // New Service Form
  const [newService, setNewService] = useState<Partial<Service>>({
    name: '',
    category: 'decoration',
    basePrice: 0,
    isActive: true,
  });

  // New Package Form
  const [newPackage, setNewPackage] = useState<Partial<MenuPackage>>({
    name: '',
    pricePerPerson: 0,
    description: '',
    isActive: true,
  });

  // Load data from localStorage on mount
  useEffect(() => {
    const defaultEventTypes = [
      { id: '1', name: 'wedding', displayName: 'Wedding', category: 'wedding' as const, requiresCouple: true, defaultDuration: 6, color: '#e11d48', isActive: true },
      { id: '2', name: 'walima', displayName: 'Walima', category: 'wedding' as const, requiresCouple: true, defaultDuration: 5, color: '#db2777', isActive: true },
      { id: '3', name: 'mehndi', displayName: 'Mehndi', category: 'wedding' as const, requiresCouple: true, defaultDuration: 5, color: '#f97316', isActive: true },
      { id: '4', name: 'engagement', displayName: 'Engagement', category: 'wedding' as const, requiresCouple: true, defaultDuration: 4, color: '#ec4899', isActive: true },
      { id: '5', name: 'birthday', displayName: 'Birthday Party', category: 'social' as const, requiresCouple: false, defaultDuration: 4, color: '#8b5cf6', isActive: true },
      { id: '6', name: 'corporate', displayName: 'Corporate Event', category: 'corporate' as const, requiresCouple: false, defaultDuration: 5, color: '#3b82f6', isActive: true },
      { id: '7', name: 'anniversary', displayName: 'Anniversary', category: 'social' as const, requiresCouple: true, defaultDuration: 4, color: '#06b6d4', isActive: true },
      { id: '8', name: 'conference', displayName: 'Conference / Seminar', category: 'corporate' as const, requiresCouple: false, defaultDuration: 8, color: '#10b981', isActive: true },
    ];

    const defaultTimeSlots = [
      { id: '1', name: 'Morning Shift', startTime: '10:00', endTime: '14:00', slotType: 'morning' as const, isActive: true },
      { id: '2', name: 'Afternoon Shift', startTime: '14:00', endTime: '18:00', slotType: 'afternoon' as const, isActive: true },
      { id: '3', name: 'Evening Shift', startTime: '18:00', endTime: '23:00', slotType: 'evening' as const, isActive: true },
      { id: '4', name: 'Night Shift', startTime: '19:00', endTime: '00:00', slotType: 'night' as const, isActive: true },
    ];

    const defaultServices = [
      { id: '1', name: 'Stage Setup', category: 'decoration' as const, basePrice: 50000, isActive: true },
      { id: '2', name: 'DJ / Sound System', category: 'entertainment' as const, basePrice: 35000, isActive: true },
      { id: '3', name: 'Photography', category: 'entertainment' as const, basePrice: 60000, isActive: true },
      { id: '4', name: 'Videography', category: 'entertainment' as const, basePrice: 80000, isActive: true },
      { id: '5', name: 'Lighting & Decor', category: 'decoration' as const, basePrice: 75000, isActive: true },
      { id: '6', name: 'Flower Decoration', category: 'decoration' as const, basePrice: 40000, isActive: true },
      { id: '7', name: 'Welcome Desk', category: 'other' as const, basePrice: 15000, isActive: true },
    ];

    const defaultPackages = [
      { id: '1', name: 'Premium Package', pricePerPerson: 3500, description: '5-course meal with premium items', isActive: true },
      { id: '2', name: 'Standard Package', pricePerPerson: 2500, description: '4-course meal with standard items', isActive: true },
      { id: '3', name: 'Basic Package', pricePerPerson: 1800, description: '3-course meal with basic items', isActive: true },
      { id: '4', name: 'Corporate Package', pricePerPerson: 2200, description: 'Continental & Pakistani mix', isActive: true },
    ];

    setEventTypes(eventConfigDataStore.getEventTypes(defaultEventTypes));
    setTimeSlots(eventConfigDataStore.getTimeSlots(defaultTimeSlots));
    setServices(eventConfigDataStore.getServices(defaultServices));
    setPackages(eventConfigDataStore.getPackages(defaultPackages));
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (eventTypes.length > 0) {
      eventConfigDataStore.saveEventTypes(eventTypes);
    }
  }, [eventTypes]);

  useEffect(() => {
    if (timeSlots.length > 0) {
      eventConfigDataStore.saveTimeSlots(timeSlots);
    }
  }, [timeSlots]);

  useEffect(() => {
    if (services.length > 0) {
      eventConfigDataStore.saveServices(services);
    }
  }, [services]);

  useEffect(() => {
    if (packages.length > 0) {
      eventConfigDataStore.savePackages(packages);
    }
  }, [packages]);

  const handleAddEventType = () => {
    if (!newEventType.name || !newEventType.displayName) return;
    
    const eventType: EventType = {
      id: Date.now().toString(),
      name: newEventType.name!.toLowerCase().replace(/\s+/g, '-'),
      displayName: newEventType.displayName!,
      category: newEventType.category!,
      requiresCouple: newEventType.requiresCouple!,
      defaultDuration: newEventType.defaultDuration!,
      color: newEventType.color!,
      isActive: true,
    };
    
    setEventTypes([...eventTypes, eventType]);
    setNewEventType({
      name: '',
      displayName: '',
      category: 'social',
      requiresCouple: false,
      defaultDuration: 4,
      color: '#3b82f6',
      isActive: true,
    });
    setShowAddForm(false);
  };

  const handleAddTimeSlot = () => {
    if (!newTimeSlot.name || !newTimeSlot.startTime || !newTimeSlot.endTime) return;
    
    const slot: TimeSlot = {
      id: Date.now().toString(),
      ...newTimeSlot as TimeSlot,
    };
    
    setTimeSlots([...timeSlots, slot]);
    setNewTimeSlot({
      name: '',
      startTime: '10:00',
      endTime: '14:00',
      slotType: 'morning',
      isActive: true,
    });
    setShowAddForm(false);
  };

  const handleAddService = () => {
    if (!newService.name || !newService.basePrice) return;
    
    const service: Service = {
      id: Date.now().toString(),
      ...newService as Service,
    };
    
    setServices([...services, service]);
    setNewService({
      name: '',
      category: 'decoration',
      basePrice: 0,
      isActive: true,
    });
    setShowAddForm(false);
  };

  const handleAddPackage = () => {
    if (!newPackage.name || !newPackage.pricePerPerson) return;
    
    const pkg: MenuPackage = {
      id: Date.now().toString(),
      ...newPackage as MenuPackage,
    };
    
    setPackages([...packages, pkg]);
    setNewPackage({
      name: '',
      pricePerPerson: 0,
      description: '',
      isActive: true,
    });
    setShowAddForm(false);
  };

  const handleDeleteEventType = (id: string) => {
    setEventTypes(eventTypes.filter(et => et.id !== id));
  };

  const handleEditEventType = (eventType: EventType) => {
    setEditingEventType({ ...eventType });
    setEditingId(eventType.id);
  };

  const handleSaveEventType = () => {
    if (!editingEventType) return;
    
    setEventTypes(eventTypes.map(et => 
      et.id === editingEventType.id ? editingEventType : et
    ));
    setEditingEventType(null);
    setEditingId(null);
  };

  const handleCancelEditEventType = () => {
    setEditingEventType(null);
    setEditingId(null);
  };

  const handleDeleteTimeSlot = (id: string) => {
    setTimeSlots(timeSlots.filter(ts => ts.id !== id));
  };

  const handleEditTimeSlot = (timeSlot: TimeSlot) => {
    setEditingTimeSlot({ ...timeSlot });
    setEditingId(timeSlot.id);
  };

  const handleSaveTimeSlot = () => {
    if (!editingTimeSlot) return;
    
    setTimeSlots(timeSlots.map(ts => 
      ts.id === editingTimeSlot.id ? editingTimeSlot : ts
    ));
    setEditingTimeSlot(null);
    setEditingId(null);
  };

  const handleCancelEditTimeSlot = () => {
    setEditingTimeSlot(null);
    setEditingId(null);
  };

  const handleDeleteService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  };

  const handleEditService = (service: Service) => {
    setEditingService({ ...service });
    setEditingId(service.id);
  };

  const handleSaveService = () => {
    if (!editingService) return;
    
    setServices(services.map(s => 
      s.id === editingService.id ? editingService : s
    ));
    setEditingService(null);
    setEditingId(null);
  };

  const handleCancelEditService = () => {
    setEditingService(null);
    setEditingId(null);
  };

  const handleDeletePackage = (id: string) => {
    setPackages(packages.filter(p => p.id !== id));
  };

  const handleEditPackage = (pkg: MenuPackage) => {
    setEditingPackage({ ...pkg });
    setEditingId(pkg.id);
  };

  const handleSavePackage = () => {
    if (!editingPackage) return;
    
    setPackages(packages.map(p => 
      p.id === editingPackage.id ? editingPackage : p
    ));
    setEditingPackage(null);
    setEditingId(null);
  };

  const handleCancelEditPackage = () => {
    setEditingPackage(null);
    setEditingId(null);
  };

  const toggleEventTypeActive = (id: string) => {
    setEventTypes(eventTypes.map(et => et.id === id ? { ...et, isActive: !et.isActive } : et));
  };

  const toggleTimeSlotActive = (id: string) => {
    setTimeSlots(timeSlots.map(ts => ts.id === id ? { ...ts, isActive: !ts.isActive } : ts));
  };

  const toggleServiceActive = (id: string) => {
    setServices(services.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const togglePackageActive = (id: string) => {
    setPackages(packages.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  return (
    <div className="space-y-5">
      {/* Warning Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-1">Event Configuration</h3>
            <p className="text-sm text-amber-700">
              Event Types, Time Slots, Services, and Packages configured here will appear in Front Office booking forms. 
              This ensures consistent spelling and prevents data entry errors.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200 px-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('event-types')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'event-types'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <PartyPopper className="size-4" />
                Event Types
              </div>
            </button>
            <button
              onClick={() => setActiveTab('time-slots')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'time-slots'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="size-4" />
                Time Slots
              </div>
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'services'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Wrench className="size-4" />
                Services
              </div>
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'packages'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="size-4" />
                Menu Packages
              </div>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* EVENT TYPES TAB */}
          {activeTab === 'event-types' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#2E2E2E]">Event Types ({eventTypes.length})</h3>
                <Button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="size-4 mr-2" />
                  Add Event Type
                </Button>
              </div>

              {/* Add Form */}
              {showAddForm && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs mb-1">Display Name *</Label>
                      <Input
                        value={newEventType.displayName}
                        onChange={(e) => setNewEventType({ ...newEventType, displayName: e.target.value })}
                        placeholder="e.g., Walima"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1">Category</Label>
                      <select
                        value={newEventType.category}
                        onChange={(e) => setNewEventType({ ...newEventType, category: e.target.value as any })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="wedding">Wedding</option>
                        <option value="corporate">Corporate</option>
                        <option value="social">Social</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1">Default Duration (hrs)</Label>
                      <Input
                        type="number"
                        value={newEventType.defaultDuration}
                        onChange={(e) => setNewEventType({ ...newEventType, defaultDuration: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newEventType.requiresCouple}
                        onChange={(e) => setNewEventType({ ...newEventType, requiresCouple: e.target.checked })}
                        className="rounded"
                      />
                      Requires Couple Names (Bride/Groom)
                    </label>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Color:</Label>
                      <input
                        type="color"
                        value={newEventType.color}
                        onChange={(e) => setNewEventType({ ...newEventType, color: e.target.value })}
                        className="w-12 h-8 rounded border border-gray-300"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddEventType} className="bg-purple-600 hover:bg-purple-700">
                      <Check className="size-4 mr-2" />
                      Save Event Type
                    </Button>
                    <Button onClick={() => setShowAddForm(false)} variant="outline">
                      <X className="size-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Event Types Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-[#6B7280]">Display Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-[#6B7280]">Category</th>
                      <th className="text-left py-3 px-4 font-semibold text-[#6B7280]">Duration</th>
                      <th className="text-left py-3 px-4 font-semibold text-[#6B7280]">Couple Required</th>
                      <th className="text-center py-3 px-4 font-semibold text-[#6B7280]">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-[#6B7280]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventTypes.map((eventType) => (
                      <tr key={eventType.id} className="border-b border-gray-100 hover:bg-gray-50">
                        {editingId === eventType.id ? (
                          <>
                            {/* Edit Mode */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={editingEventType?.color}
                                  onChange={(e) =>
                                    setEditingEventType({ ...editingEventType!, color: e.target.value })
                                  }
                                  className="w-6 h-6 rounded border border-gray-300"
                                />
                                <Input
                                  value={editingEventType?.displayName}
                                  onChange={(e) =>
                                    setEditingEventType({ ...editingEventType!, displayName: e.target.value })
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={editingEventType?.category}
                                onChange={(e) =>
                                  setEditingEventType({
                                    ...editingEventType!,
                                    category: e.target.value as any,
                                  })
                                }
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                              >
                                <option value="wedding">Wedding</option>
                                <option value="corporate">Corporate</option>
                                <option value="social">Social</option>
                                <option value="other">Other</option>
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              <Input
                                type="number"
                                value={editingEventType?.defaultDuration}
                                onChange={(e) =>
                                  setEditingEventType({
                                    ...editingEventType!,
                                    defaultDuration: parseInt(e.target.value),
                                  })
                                }
                                className="h-8 text-sm w-20"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="checkbox"
                                checked={editingEventType?.requiresCouple}
                                onChange={(e) =>
                                  setEditingEventType({
                                    ...editingEventType!,
                                    requiresCouple: e.target.checked,
                                  })
                                }
                                className="rounded"
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => toggleEventTypeActive(eventType.id)}
                                className={`px-3 py-1 rounded text-xs font-medium ${
                                  eventType.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {eventType.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={handleSaveEventType}
                                  className="p-1.5 hover:bg-green-50 rounded text-green-600"
                                  title="Save"
                                >
                                  <Check className="size-4" />
                                </button>
                                <button
                                  onClick={handleCancelEditEventType}
                                  className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                                  title="Cancel"
                                >
                                  <X className="size-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            {/* View Mode */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: eventType.color }}
                                />
                                <span className="font-medium text-[#2E2E2E]">{eventType.displayName}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs capitalize">
                                {eventType.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[#6B7280]">{eventType.defaultDuration} hrs</td>
                            <td className="py-3 px-4">
                              {eventType.requiresCouple ? (
                                <Check className="size-4 text-green-600" />
                              ) : (
                                <X className="size-4 text-gray-400" />
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => toggleEventTypeActive(eventType.id)}
                                className={`px-3 py-1 rounded text-xs font-medium ${
                                  eventType.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {eventType.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleEditEventType(eventType)}
                                  className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                                  title="Edit"
                                >
                                  <Edit2 className="size-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEventType(eventType.id)}
                                  className="p-1.5 hover:bg-red-50 rounded text-red-600"
                                  title="Delete"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TIME SLOTS TAB */}
          {activeTab === 'time-slots' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#2E2E2E]">Time Slots ({timeSlots.length})</h3>
                <Button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="size-4 mr-2" />
                  Add Time Slot
                </Button>
              </div>

              {/* Add Form */}
              {showAddForm && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs mb-1">Slot Name *</Label>
                      <Input
                        value={newTimeSlot.name}
                        onChange={(e) => setNewTimeSlot({ ...newTimeSlot, name: e.target.value })}
                        placeholder="e.g., Morning Shift"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1">Start Time *</Label>
                      <TimePicker
                        value={newTimeSlot.startTime}
                        onChange={(time) => setNewTimeSlot({ ...newTimeSlot, startTime: time })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1">End Time *</Label>
                      <TimePicker
                        value={newTimeSlot.endTime}
                        onChange={(time) => setNewTimeSlot({ ...newTimeSlot, endTime: time })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1">Slot Type</Label>
                      <select
                        value={newTimeSlot.slotType}
                        onChange={(e) => setNewTimeSlot({ ...newTimeSlot, slotType: e.target.value as any })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="evening">Evening</option>
                        <option value="night">Night</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddTimeSlot} className="bg-purple-600 hover:bg-purple-700">
                      <Check className="size-4 mr-2" />
                      Save Time Slot
                    </Button>
                    <Button onClick={() => setShowAddForm(false)} variant="outline">
                      <X className="size-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Time Slots Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-[#6B7280]">Slot Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-[#6B7280]">Start Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-[#6B7280]">End Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-[#6B7280]">Type</th>
                      <th className="text-center py-3 px-4 font-semibold text-[#6B7280]">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-[#6B7280]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((slot) => (
                      <tr key={slot.id} className="border-b border-gray-100 hover:bg-gray-50">
                        {editingId === slot.id ? (
                          <>
                            {/* Edit Mode */}
                            <td className="py-3 px-4">
                              <Input
                                value={editingTimeSlot?.name}
                                onChange={(e) => setEditingTimeSlot({ ...editingTimeSlot!, name: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <TimePicker
                                value={editingTimeSlot?.startTime || ''}
                                onChange={(time) => setEditingTimeSlot({ ...editingTimeSlot!, startTime: time })}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <TimePicker
                                value={editingTimeSlot?.endTime || ''}
                                onChange={(time) => setEditingTimeSlot({ ...editingTimeSlot!, endTime: time })}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={editingTimeSlot?.slotType}
                                onChange={(e) =>
                                  setEditingTimeSlot({
                                    ...editingTimeSlot!,
                                    slotType: e.target.value as any,
                                  })
                                }
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                              >
                                <option value="morning">Morning</option>
                                <option value="afternoon">Afternoon</option>
                                <option value="evening">Evening</option>
                                <option value="night">Night</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => toggleTimeSlotActive(slot.id)}
                                className={`px-3 py-1 rounded text-xs font-medium ${
                                  slot.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {slot.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={handleSaveTimeSlot}
                                  className="p-1.5 hover:bg-green-50 rounded text-green-600"
                                  title="Save"
                                >
                                  <Check className="size-4" />
                                </button>
                                <button
                                  onClick={handleCancelEditTimeSlot}
                                  className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                                  title="Cancel"
                                >
                                  <X className="size-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            {/* View Mode */}
                            <td className="py-3 px-4 font-medium text-[#2E2E2E]">{slot.name}</td>
                            <td className="py-3 px-4 text-[#6B7280]">{formatTimeDisplay(slot.startTime)}</td>
                            <td className="py-3 px-4 text-[#6B7280]">{formatTimeDisplay(slot.endTime)}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs capitalize">
                                {slot.slotType}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => toggleTimeSlotActive(slot.id)}
                                className={`px-3 py-1 rounded text-xs font-medium ${
                                  slot.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {slot.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleEditTimeSlot(slot)}
                                  className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                                  title="Edit"
                                >
                                  <Edit2 className="size-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTimeSlot(slot.id)}
                                  className="p-1.5 hover:bg-red-50 rounded text-red-600"
                                  title="Delete"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SERVICES TAB */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#2E2E2E]">Services ({services.length})</h3>
                <Button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="size-4 mr-2" />
                  Add Service
                </Button>
              </div>

              {/* Add Form */}
              {showAddForm && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs mb-1">Service Name *</Label>
                      <Input
                        value={newService.name}
                        onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                        placeholder="e.g., Stage Setup"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1">Category</Label>
                      <select
                        value={newService.category}
                        onChange={(e) => setNewService({ ...newService, category: e.target.value as any })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="decoration">Decoration</option>
                        <option value="entertainment">Entertainment</option>
                        <option value="catering">Catering</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1">Base Price (₨) *</Label>
                      <Input
                        type="number"
                        value={newService.basePrice}
                        onChange={(e) => setNewService({ ...newService, basePrice: parseInt(e.target.value) })}
                        placeholder="50000"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddService} className="bg-purple-600 hover:bg-purple-700">
                      <Check className="size-4 mr-2" />
                      Save Service
                    </Button>
                    <Button onClick={() => setShowAddForm(false)} variant="outline">
                      <X className="size-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Services Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-[#6B7280]">Service Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-[#6B7280]">Category</th>
                      <th className="text-right py-3 px-4 font-semibold text-[#6B7280]">Base Price</th>
                      <th className="text-center py-3 px-4 font-semibold text-[#6B7280]">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-[#6B7280]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service) => (
                      <tr key={service.id} className="border-b border-gray-100 hover:bg-gray-50">
                        {editingId === service.id ? (
                          <>
                            {/* Edit Mode */}
                            <td className="py-3 px-4">
                              <Input
                                value={editingService?.name}
                                onChange={(e) => setEditingService({ ...editingService!, name: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={editingService?.category}
                                onChange={(e) =>
                                  setEditingService({
                                    ...editingService!,
                                    category: e.target.value as any,
                                  })
                                }
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                              >
                                <option value="decoration">Decoration</option>
                                <option value="entertainment">Entertainment</option>
                                <option value="catering">Catering</option>
                                <option value="other">Other</option>
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              <Input
                                type="number"
                                value={editingService?.basePrice}
                                onChange={(e) =>
                                  setEditingService({
                                    ...editingService!,
                                    basePrice: parseInt(e.target.value),
                                  })
                                }
                                className="h-8 text-sm text-right"
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => toggleServiceActive(service.id)}
                                className={`px-3 py-1 rounded text-xs font-medium ${
                                  service.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {service.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={handleSaveService}
                                  className="p-1.5 hover:bg-green-50 rounded text-green-600"
                                  title="Save"
                                >
                                  <Check className="size-4" />
                                </button>
                                <button
                                  onClick={handleCancelEditService}
                                  className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                                  title="Cancel"
                                >
                                  <X className="size-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            {/* View Mode */}
                            <td className="py-3 px-4 font-medium text-[#2E2E2E]">{service.name}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs capitalize">
                                {service.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-[#2E2E2E] font-medium">
                              ₨{service.basePrice.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => toggleServiceActive(service.id)}
                                className={`px-3 py-1 rounded text-xs font-medium ${
                                  service.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {service.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleEditService(service)}
                                  className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                                  title="Edit"
                                >
                                  <Edit2 className="size-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteService(service.id)}
                                  className="p-1.5 hover:bg-red-50 rounded text-red-600"
                                  title="Delete"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PACKAGES TAB */}
          {activeTab === 'packages' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#2E2E2E]">Menu Packages ({packages.length})</h3>
                <Button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="size-4 mr-2" />
                  Add Package
                </Button>
              </div>

              {/* Add Form */}
              {showAddForm && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1">Package Name *</Label>
                      <Input
                        value={newPackage.name}
                        onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                        placeholder="e.g., Premium Package"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1">Price Per Person (₨) *</Label>
                      <Input
                        type="number"
                        value={newPackage.pricePerPerson}
                        onChange={(e) => setNewPackage({ ...newPackage, pricePerPerson: parseInt(e.target.value) })}
                        placeholder="3500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-1">Description</Label>
                    <Textarea
                      value={newPackage.description}
                      onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
                      placeholder="Brief description of what's included"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddPackage} className="bg-purple-600 hover:bg-purple-700">
                      <Check className="size-4 mr-2" />
                      Save Package
                    </Button>
                    <Button onClick={() => setShowAddForm(false)} variant="outline">
                      <X className="size-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Packages Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-[#6B7280]">Package Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-[#6B7280]">Description</th>
                      <th className="text-right py-3 px-4 font-semibold text-[#6B7280]">Price/Person</th>
                      <th className="text-center py-3 px-4 font-semibold text-[#6B7280]">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-[#6B7280]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.map((pkg) => (
                      <tr key={pkg.id} className="border-b border-gray-100 hover:bg-gray-50">
                        {editingId === pkg.id ? (
                          <>
                            {/* Edit Mode */}
                            <td className="py-3 px-4">
                              <Input
                                value={editingPackage?.name}
                                onChange={(e) => setEditingPackage({ ...editingPackage!, name: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <Textarea
                                value={editingPackage?.description}
                                onChange={(e) => setEditingPackage({ ...editingPackage!, description: e.target.value })}
                                placeholder="Brief description of what's included"
                                rows={2}
                                className="h-16 text-xs"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <Input
                                type="number"
                                value={editingPackage?.pricePerPerson}
                                onChange={(e) =>
                                  setEditingPackage({
                                    ...editingPackage!,
                                    pricePerPerson: parseInt(e.target.value),
                                  })
                                }
                                className="h-8 text-sm text-right"
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => togglePackageActive(pkg.id)}
                                className={`px-3 py-1 rounded text-xs font-medium ${
                                  pkg.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {pkg.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={handleSavePackage}
                                  className="p-1.5 hover:bg-green-50 rounded text-green-600"
                                  title="Save"
                                >
                                  <Check className="size-4" />
                                </button>
                                <button
                                  onClick={handleCancelEditPackage}
                                  className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                                  title="Cancel"
                                >
                                  <X className="size-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            {/* View Mode */}
                            <td className="py-3 px-4 font-medium text-[#2E2E2E]">{pkg.name}</td>
                            <td className="py-3 px-4 text-[#6B7280] text-xs">{pkg.description}</td>
                            <td className="py-3 px-4 text-right text-[#2E2E2E] font-medium">
                              ₨{pkg.pricePerPerson.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => togglePackageActive(pkg.id)}
                                className={`px-3 py-1 rounded text-xs font-medium ${
                                  pkg.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {pkg.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleEditPackage(pkg)}
                                  className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                                  title="Edit"
                                >
                                  <Edit2 className="size-4" />
                                </button>
                                <button
                                  onClick={() => handleDeletePackage(pkg.id)}
                                  className="p-1.5 hover:bg-red-50 rounded text-red-600"
                                  title="Delete"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}