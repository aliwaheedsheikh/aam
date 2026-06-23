import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  venueDataStore,
  primeSpaceDataStore,
  subSpaceDataStore,
  layoutDataStore,
  eventConfigDataStore,
  financialConfigDataStore,
} from '../lib/masterDataStore';

// Types
export interface Venue {
  id: string;
  venueName: string;
  location: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  isActive: boolean;
  capacity: number;
  operatingHours: { open: string; close: string };
  createdAt: Date;
}

export interface PrimeSpace {
  id: string;
  venueId: string;
  spaceName: string;
  spaceType: 'indoor' | 'outdoor' | 'hybrid';
  capacity: number;
  area: number;
  isActive: boolean;
  defaultAdvanceRuleId?: string;
  createdAt: Date;
}

export interface SubSpace {
  id: string;
  primeSpaceId: string;
  venueId: string;
  spaceName: string;
  capacity: number;
  area: number;
  isActive: boolean;
  canOperateIndependently: boolean;
  createdAt: Date;
}

export interface Layout {
  id: string;
  venueId: string;
  primeSpaceId?: string;
  subSpaceId?: string;
  layoutName: string;
  layoutType: string;
  capacity: number;
  description: string;
  isActive: boolean;
  createdAt: Date;
}

export interface EventType {
  id: string;
  name: string;
  displayName: string;
  category: 'wedding' | 'corporate' | 'social' | 'other';
  requiresCouple: boolean;
  defaultDuration: number;
  color: string;
  isActive: boolean;
}

export interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  slotType: 'morning' | 'afternoon' | 'evening' | 'night';
  isActive: boolean;
}

export interface Service {
  id: string;
  name: string;
  category: 'decoration' | 'entertainment' | 'catering' | 'other';
  basePrice: number;
  isActive: boolean;
}

export interface MenuPackage {
  id: string;
  name: string;
  pricePerPerson: number;
  description: string;
  isActive: boolean;
}

export interface AdvanceRule {
  id: string;
  ruleName: string;
  applicationType: 'venue' | 'prime-space' | 'sub-space' | 'event-type' | 'global';
  appliedTo?: string; // ID of venue/space/event
  advanceType: 'percentage' | 'fixed';
  value: number;
  isActive: boolean;
  priority: number;
  createdAt: Date;
}

export interface TaxGroup {
  id: string;
  name: string;
  taxes: Array<{
    taxName: string;
    percentage: number;
  }>;
  totalPercentage: number;
  isActive: boolean;
}

interface MasterDataContextType {
  // Data
  venues: Venue[];
  primeSpaces: PrimeSpace[];
  subSpaces: SubSpace[];
  layouts: Layout[];
  eventTypes: EventType[];
  timeSlots: TimeSlot[];
  services: Service[];
  packages: MenuPackage[];
  advanceRules: AdvanceRule[];
  taxGroups: TaxGroup[];
  
  // Helper functions
  getVenueById: (id: string) => Venue | undefined;
  getPrimeSpaceById: (id: string) => PrimeSpace | undefined;
  getSubSpaceById: (id: string) => SubSpace | undefined;
  getPrimeSpacesByVenue: (venueId: string) => PrimeSpace[];
  getSubSpacesByPrimeSpace: (primeSpaceId: string) => SubSpace[];
  getActiveEventTypes: () => EventType[];
  getActiveTimeSlots: () => TimeSlot[];
  getActiveServices: () => Service[];
  getActivePackages: () => MenuPackage[];
  getApplicableAdvanceRule: (venueId?: string, primeSpaceId?: string, subSpaceId?: string, eventTypeId?: string) => AdvanceRule | undefined;
  getActiveTaxGroups: () => TaxGroup[];
  
  // Refresh function to reload data from storage
  refreshData: () => void;
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

// Historical demo data kept as reference only. Venue/space setup should start
// empty until the user creates real setup records.
const defaultVenues: Venue[] = [
  {
    id: 'venue-1',
    venueName: 'Grand Palace Banquet',
    location: 'Gulberg',
    address: '123 Main Boulevard',
    city: 'Lahore',
    phone: '+92-300-1234567',
    email: 'info@grandpalace.com',
    isActive: true,
    capacity: 1000,
    operatingHours: { open: '09:00', close: '02:00' },
    createdAt: new Date(),
  },
  {
    id: 'venue-2',
    venueName: 'Royal Gardens',
    location: 'DHA Phase 5',
    address: '456 Commercial Area',
    city: 'Lahore',
    phone: '+92-300-7654321',
    email: 'info@royalgardens.com',
    isActive: true,
    capacity: 800,
    operatingHours: { open: '10:00', close: '01:00' },
    createdAt: new Date(),
  },
];

const defaultPrimeSpaces: PrimeSpace[] = [
  {
    id: 'prime-1',
    venueId: 'venue-1',
    spaceName: 'Grand Hall',
    spaceType: 'indoor',
    capacity: 600,
    area: 8000,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'prime-2',
    venueId: 'venue-1',
    spaceName: 'Garden Lawn',
    spaceType: 'outdoor',
    capacity: 400,
    area: 12000,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'prime-3',
    venueId: 'venue-2',
    spaceName: 'Main Banquet',
    spaceType: 'indoor',
    capacity: 500,
    area: 7000,
    isActive: true,
    createdAt: new Date(),
  },
];

const defaultSubSpaces: SubSpace[] = [
  {
    id: 'sub-1',
    primeSpaceId: 'prime-1',
    venueId: 'venue-1',
    spaceName: 'Marquee 1',
    capacity: 300,
    area: 4000,
    isActive: true,
    canOperateIndependently: true,
    createdAt: new Date(),
  },
  {
    id: 'sub-2',
    primeSpaceId: 'prime-1',
    venueId: 'venue-1',
    spaceName: 'Marquee 2',
    capacity: 300,
    area: 4000,
    isActive: true,
    canOperateIndependently: true,
    createdAt: new Date(),
  },
];

const defaultEventTypes: EventType[] = [
  { id: '1', name: 'wedding', displayName: 'Wedding', category: 'wedding', requiresCouple: true, defaultDuration: 6, color: '#e11d48', isActive: true },
  { id: '2', name: 'walima', displayName: 'Walima', category: 'wedding', requiresCouple: true, defaultDuration: 5, color: '#db2777', isActive: true },
  { id: '3', name: 'mehndi', displayName: 'Mehndi', category: 'wedding', requiresCouple: true, defaultDuration: 5, color: '#f97316', isActive: true },
  { id: '4', name: 'engagement', displayName: 'Engagement', category: 'wedding', requiresCouple: true, defaultDuration: 4, color: '#ec4899', isActive: true },
  { id: '5', name: 'birthday', displayName: 'Birthday Party', category: 'social', requiresCouple: false, defaultDuration: 4, color: '#8b5cf6', isActive: true },
  { id: '6', name: 'corporate', displayName: 'Corporate Event', category: 'corporate', requiresCouple: false, defaultDuration: 5, color: '#3b82f6', isActive: true },
];

const defaultTimeSlots: TimeSlot[] = [
  { id: '1', name: 'Morning Shift', startTime: '10:00', endTime: '14:00', slotType: 'morning', isActive: true },
  { id: '2', name: 'Afternoon Shift', startTime: '14:00', endTime: '18:00', slotType: 'afternoon', isActive: true },
  { id: '3', name: 'Evening Shift', startTime: '18:00', endTime: '23:00', slotType: 'evening', isActive: true },
  { id: '4', name: 'Night Shift', startTime: '19:00', endTime: '00:00', slotType: 'night', isActive: true },
];

const defaultServices: Service[] = [
  { id: '1', name: 'Stage Setup', category: 'decoration', basePrice: 50000, isActive: true },
  { id: '2', name: 'DJ / Sound System', category: 'entertainment', basePrice: 35000, isActive: true },
  { id: '3', name: 'Photography', category: 'entertainment', basePrice: 60000, isActive: true },
  { id: '4', name: 'Videography', category: 'entertainment', basePrice: 80000, isActive: true },
  { id: '5', name: 'Lighting & Decor', category: 'decoration', basePrice: 75000, isActive: true },
];

const defaultPackages: MenuPackage[] = [
  { id: '1', name: 'Premium Package', pricePerPerson: 3500, description: '5-course meal with premium items', isActive: true },
  { id: '2', name: 'Standard Package', pricePerPerson: 2500, description: '4-course meal with standard items', isActive: true },
  { id: '3', name: 'Basic Package', pricePerPerson: 1800, description: '3-course meal with basic items', isActive: true },
];

export function MasterDataProvider({ children }: { children: ReactNode }) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [primeSpaces, setPrimeSpaces] = useState<PrimeSpace[]>([]);
  const [subSpaces, setSubSpaces] = useState<SubSpace[]>([]);
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<MenuPackage[]>([]);
  const [advanceRules, setAdvanceRules] = useState<AdvanceRule[]>([]);
  const [taxGroups, setTaxGroups] = useState<TaxGroup[]>([]);

  const loadData = () => {
    setVenues(venueDataStore.getVenues([]));
    setPrimeSpaces(primeSpaceDataStore.getPrimeSpaces([]));
    setSubSpaces(subSpaceDataStore.getSubSpaces([]));
    setLayouts(layoutDataStore.getLayouts([]));
    setEventTypes(eventConfigDataStore.getEventTypes(defaultEventTypes));
    setTimeSlots(eventConfigDataStore.getTimeSlots(defaultTimeSlots));
    setServices(eventConfigDataStore.getServices(defaultServices));
    setPackages(eventConfigDataStore.getPackages(defaultPackages));
    setAdvanceRules(financialConfigDataStore.getAdvanceRules([]));
    setTaxGroups(financialConfigDataStore.getTaxGroups([]));
  };

  useEffect(() => {
    loadData();

    // Listen for storage changes from other tabs or Master Setup updates
    const handleStorageChange = () => {
      loadData();
    };

    window.addEventListener('storage', handleStorageChange);
    // Custom event for same-tab updates
    window.addEventListener('masterDataUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('masterDataUpdated', handleStorageChange);
    };
  }, []);

  // Helper functions
  const getVenueById = (id: string) => venues.find(v => v.id === id);
  
  const getPrimeSpaceById = (id: string) => primeSpaces.find(ps => ps.id === id);
  
  const getSubSpaceById = (id: string) => subSpaces.find(ss => ss.id === id);
  
  const getPrimeSpacesByVenue = (venueId: string) => 
    primeSpaces.filter(ps => ps.venueId === venueId && ps.isActive);
  
  const getSubSpacesByPrimeSpace = (primeSpaceId: string) => 
    subSpaces.filter(ss => ss.primeSpaceId === primeSpaceId && ss.isActive);
  
  const getActiveEventTypes = () => eventTypes.filter(et => et.isActive);
  
  const getActiveTimeSlots = () => timeSlots.filter(ts => ts.isActive);
  
  const getActiveServices = () => services.filter(s => s.isActive);
  
  const getActivePackages = () => packages.filter(p => p.isActive);
  
  const getApplicableAdvanceRule = (
    venueId?: string,
    primeSpaceId?: string,
    subSpaceId?: string,
    eventTypeId?: string
  ) => {
    // Priority order: Sub-Space > Prime Space > Venue > Event Type > Global
    const applicableRules = advanceRules
      .filter(rule => rule.isActive)
      .sort((a, b) => b.priority - a.priority);

    // Check sub-space specific rule
    if (subSpaceId) {
      const rule = applicableRules.find(
        r => r.applicationType === 'sub-space' && r.appliedTo === subSpaceId
      );
      if (rule) return rule;
    }

    // Check prime space specific rule
    if (primeSpaceId) {
      const rule = applicableRules.find(
        r => r.applicationType === 'prime-space' && r.appliedTo === primeSpaceId
      );
      if (rule) return rule;
    }

    // Check venue specific rule
    if (venueId) {
      const rule = applicableRules.find(
        r => r.applicationType === 'venue' && r.appliedTo === venueId
      );
      if (rule) return rule;
    }

    // Check event type specific rule
    if (eventTypeId) {
      const rule = applicableRules.find(
        r => r.applicationType === 'event-type' && r.appliedTo === eventTypeId
      );
      if (rule) return rule;
    }

    // Return global rule
    return applicableRules.find(r => r.applicationType === 'global');
  };
  
  const getActiveTaxGroups = () => taxGroups.filter(tg => tg.isActive);
  
  const refreshData = () => {
    loadData();
  };

  const value: MasterDataContextType = {
    venues,
    primeSpaces,
    subSpaces,
    layouts,
    eventTypes,
    timeSlots,
    services,
    packages,
    advanceRules,
    taxGroups,
    getVenueById,
    getPrimeSpaceById,
    getSubSpaceById,
    getPrimeSpacesByVenue,
    getSubSpacesByPrimeSpace,
    getActiveEventTypes,
    getActiveTimeSlots,
    getActiveServices,
    getActivePackages,
    getApplicableAdvanceRule,
    getActiveTaxGroups,
    refreshData,
  };

  return (
    <MasterDataContext.Provider value={value}>
      {children}
    </MasterDataContext.Provider>
  );
}

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
}
