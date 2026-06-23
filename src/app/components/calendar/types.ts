// Types for the Event Availability Calendar

export type BookingStatus = 'available' | 'tentative' | 'confirmed';
export type Slot = 'lunch' | 'dinner';
export type VenueType = 'full' | 'partial';

export interface Venue {
  id: string;
  name: string;
  address?: string;
  capacity: number;
  isSubVenue: boolean;
  parentVenueId?: string;
  subVenues?: Venue[];
}

export interface Booking {
  id: string;
  date: Date;
  venueId: string;
  slot: Slot;
  status: BookingStatus;
  customerName?: string;
  guestCount?: number;
  callbackDate?: Date;
  isFullVenue: boolean; // True if booking entire venue
}

export interface SlotAvailability {
  venueId: string;
  status: BookingStatus;
  booking?: Booking;
  isBlocked?: boolean; // Blocked due to parent/child booking
  blockedReason?: string;
}

export interface DayAvailability {
  date: Date;
  lunch: SlotAvailability[];
  dinner: SlotAvailability[];
}

export interface VenueAvailability {
  venue: Venue;
  isAvailable: boolean;
  reason?: string;
  subVenueAvailability?: Map<string, boolean>;
}