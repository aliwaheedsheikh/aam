// Service Types for VenueOps ERP - Multi-Service Calendar System

export type ServiceType = 
  | 'venue-booking'        // In-house venue banquet
  | 'outdoor-catering'     // Catering at customer location
  | 'food-supply'          // Food only (no venue, no service)
  | 'rental-services'      // Equipment/item rentals
  | 'mixed-package';       // Combination of services

export type ServiceStatus = 'tentative' | 'confirmed' | 'completed' | 'cancelled' | 'expired';

// Base Service Booking Interface
export interface ServiceBooking {
  id: string;
  serviceType: ServiceType;
  status: ServiceStatus;
  date: Date;
  startTime: string;
  endTime: string;
  customerName: string;
  contactNumber: string;
  guestCount: number;
  notes?: string;
  createdAt: Date;
  assignedTo?: string;
  bookingSource?: string;
  followUpDate?: string;
  followUpTime?: string;
  
  // Financial
  totalAmount?: number;
  paidAmount?: number;
  balanceDue?: number;
}

// Outdoor Catering Booking
export interface OutdoorCateringBooking extends ServiceBooking {
  serviceType: 'outdoor-catering';
  eventLocation: string; // Customer's venue address
  eventCity: string;
  eventArea?: string;
  eventType: string; // Wedding, Corporate, etc.
  
  // Menu & Food
  menuType?: string;
  menuRate?: number;
  menuTotal?: number;
  
  // Service Requirements
  serversRequired: number;
  chefsRequired?: number;
  
  // Equipment & Logistics
  transportRequired: boolean;
  vehiclesNeeded?: number;
  setupTime?: string; // Time needed before event
  
  // Equipment items
  equipmentRequired?: {
    portableWarmers?: number;
    servingStations?: number;
    chafingDishes?: number;
    tables?: number;
    chairs?: number;
  };
  
  // Kitchen allocation
  kitchenAssigned?: string; // Which kitchen will prepare
  productionDate?: string; // When to prepare
  deliveryTime?: string; // When to deliver
}

// Food Supply Only Booking
export interface FoodSupplyBooking extends ServiceBooking {
  serviceType: 'food-supply';
  deliveryAddress: string;
  deliveryCity: string;
  deliveryArea?: string;
  eventType?: string;
  
  // Menu & Food
  menuType: string;
  menuRate: number;
  menuTotal: number;
  
  // Kitchen allocation
  kitchenAssigned: string;
  productionDate: string;
  productionShift: 'morning' | 'afternoon' | 'evening';
  
  // Delivery
  deliveryTime: string;
  deliveryMethod: 'pickup' | 'delivery';
  deliveryCharges?: number;
  
  // No service staff, no equipment
}

// Rental Services Booking
export interface RentalServiceBooking extends ServiceBooking {
  serviceType: 'rental-services';
  deliveryAddress: string;
  deliveryCity: string;
  deliveryArea?: string;
  
  // Rental period
  rentalStartDate: Date;
  rentalEndDate: Date;
  rentalDays: number;
  
  // Items
  items: RentalItem[];
  
  // Delivery/Pickup
  deliveryDate: Date;
  deliveryTime: string;
  pickupDate: Date;
  pickupTime: string;
  
  deliveryCharges?: number;
  setupCharges?: number;
  
  // Damages & Security
  securityDeposit?: number;
  damageCharges?: number;
}

export interface RentalItem {
  id: string;
  category: 'furniture' | 'decor' | 'sound' | 'lighting' | 'equipment' | 'other';
  itemName: string;
  quantity: number;
  unitRate: number;
  totalRate: number;
  inventoryId?: string; // Link to inventory system
}

// Mixed Package Booking (combines multiple services)
export interface MixedPackageBooking extends ServiceBooking {
  serviceType: 'mixed-package';
  services: {
    hasVenue?: boolean;
    hasOutdoorCatering?: boolean;
    hasFoodSupply?: boolean;
    hasRentals?: boolean;
  };
  
  // Each service component (optional)
  venueBookingId?: string; // Link to venue booking
  outdoorCateringDetails?: Partial<OutdoorCateringBooking>;
  foodSupplyDetails?: Partial<FoodSupplyBooking>;
  rentalDetails?: Partial<RentalServiceBooking>;
}

// Kitchen Capacity Tracking
export interface KitchenCapacity {
  kitchenId: string;
  kitchenName: string;
  date: string;
  shift: 'morning' | 'afternoon' | 'evening';
  maxGuestCapacity: number; // Max guests per shift
  bookedGuestCount: number;
  availableCapacity: number;
  bookings: string[]; // Booking IDs using this kitchen
}

// Resource Availability (for outdoor catering)
export interface ResourceAvailability {
  date: string;
  maxConcurrentEvents: number; // Max outdoor events we can handle per day
  bookedEvents: number;
  availableSlots: number;
  
  // Staff availability
  availableServers: number;
  availableChefs: number;
  availableDrivers: number;
  
  // Equipment availability
  availableVehicles: number;
  availableEquipment: {
    portableWarmers: number;
    servingStations: number;
    chafingDishes: number;
  };
}

// Inventory Item Availability (for rentals)
export interface InventoryItemAvailability {
  itemId: string;
  itemName: string;
  category: RentalItem['category'];
  totalQuantity: number;
  availableQuantity: number;
  bookedQuantity: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  bookings: {
    bookingId: string;
    quantity: number;
    startDate: Date;
    endDate: Date;
  }[];
}

// Service Type Metadata
export const SERVICE_TYPE_CONFIG = {
  'venue-booking': {
    label: 'Venue Booking',
    icon: '🏢',
    color: 'blue',
    description: 'In-house banquet hall reservation',
    usesVenueCalendar: true,
    usesKitchen: true,
    requiresStaff: true,
  },
  'outdoor-catering': {
    label: 'Outdoor Catering',
    icon: '🍽️',
    color: 'purple',
    description: 'Catering services at customer location',
    usesVenueCalendar: false,
    usesKitchen: true,
    requiresStaff: true,
    requiresTransport: true,
  },
  'food-supply': {
    label: 'Food Supply Only',
    icon: '📦',
    color: 'orange',
    description: 'Food preparation and delivery without service',
    usesVenueCalendar: false,
    usesKitchen: true,
    requiresStaff: false,
  },
  'rental-services': {
    label: 'Rental Services',
    icon: '🎪',
    color: 'green',
    description: 'Equipment and furniture rentals',
    usesVenueCalendar: false,
    usesKitchen: false,
    requiresStaff: false,
    usesInventory: true,
  },
  'mixed-package': {
    label: 'Mixed Package',
    icon: '🎁',
    color: 'indigo',
    description: 'Combination of multiple services',
    usesVenueCalendar: 'conditional',
    usesKitchen: 'conditional',
    requiresStaff: 'conditional',
  },
} as const;

// Kitchen List
export const KITCHENS = [
  { id: 'kitchen-main', name: 'Main Kitchen (Central)', maxCapacity: 2000 },
  { id: 'kitchen-north', name: 'North Branch Kitchen', maxCapacity: 1500 },
  { id: 'kitchen-south', name: 'South Branch Kitchen', maxCapacity: 1200 },
] as const;

// Rental Item Categories
export const RENTAL_CATEGORIES = [
  { id: 'furniture', name: 'Furniture', icon: '🪑' },
  { id: 'decor', name: 'Decoration', icon: '🎨' },
  { id: 'sound', name: 'Sound System', icon: '🔊' },
  { id: 'lighting', name: 'Lighting', icon: '💡' },
  { id: 'equipment', name: 'Equipment', icon: '⚙️' },
  { id: 'other', name: 'Other', icon: '📦' },
] as const;

// Sample Rental Items
export const RENTAL_ITEMS = [
  // Furniture
  { id: 'chair-plastic', category: 'furniture', name: 'Plastic Chair', unitRate: 50, available: 500 },
  { id: 'chair-cushion', category: 'furniture', name: 'Cushioned Chair', unitRate: 100, available: 300 },
  { id: 'table-round-6', category: 'furniture', name: 'Round Table (6-seater)', unitRate: 300, available: 100 },
  { id: 'table-round-8', category: 'furniture', name: 'Round Table (8-seater)', unitRate: 400, available: 80 },
  { id: 'sofa-3seat', category: 'furniture', name: '3-Seater Sofa', unitRate: 1500, available: 20 },
  
  // Decor
  { id: 'stage-backdrop', category: 'decor', name: 'Stage Backdrop', unitRate: 5000, available: 10 },
  { id: 'flower-centerpiece', category: 'decor', name: 'Flower Centerpiece', unitRate: 500, available: 50 },
  { id: 'drapes-white', category: 'decor', name: 'White Drapes (per panel)', unitRate: 200, available: 100 },
  
  // Sound
  { id: 'sound-basic', category: 'sound', name: 'Basic Sound System', unitRate: 8000, available: 15 },
  { id: 'sound-premium', category: 'sound', name: 'Premium Sound System', unitRate: 15000, available: 8 },
  { id: 'wireless-mic', category: 'sound', name: 'Wireless Microphone', unitRate: 1000, available: 30 },
  
  // Lighting
  { id: 'led-uplighting', category: 'lighting', name: 'LED Uplighting (per unit)', unitRate: 500, available: 60 },
  { id: 'disco-ball', category: 'lighting', name: 'Disco Ball with Lights', unitRate: 3000, available: 10 },
  
  // Equipment
  { id: 'generator-5kva', category: 'equipment', name: 'Generator (5 KVA)', unitRate: 12000, available: 8 },
  { id: 'generator-10kva', category: 'equipment', name: 'Generator (10 KVA)', unitRate: 20000, available: 5 },
  { id: 'ac-portable', category: 'equipment', name: 'Portable AC Unit', unitRate: 5000, available: 15 },
] as const;
