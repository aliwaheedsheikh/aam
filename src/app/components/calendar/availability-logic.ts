// Logic for determining venue availability based on hierarchical bookings
import { Booking, Venue, Slot, VenueType } from './types';
import { findVenueById, getParentVenue, venues } from './mock-data';

/**
 * VENUE RESERVATION RULES & DEPENDENCIES
 * 
 * PRIMARY RULES:
 * 1. Full Venue Booking Rule: If full venue (M1, M2, M3, G1, G2, G3) is booked, 
 *    all corresponding sub-venues become unavailable.
 * 
 * 2. Sub-Venue Booking Rule: If any sub-venue (e.g., M1-A) is booked, 
 *    the corresponding full venue (M1) becomes unavailable.
 * 
 * 3. Concurrent Sub-Venue Rule: Multiple sub-venues of the same primary venue 
 *    can be booked simultaneously if available.
 * 
 * DEPENDENCY RELATIONSHIPS:
 * - Marquee 1 (Prime) unavailable ⟹ M1-A and M1-B unavailable
 * - M1-A booked ⟹ Marquee 1 unavailable (but M1-B still available)
 * - M1-B booked ⟹ Marquee 1 unavailable (but M1-A still available)
 * - M1-A AND M1-B both available ⟹ Both can be booked concurrently
 * (Same pattern applies to all other venues and sub-venues)
 */

/**
 * Check if a venue is available for a specific date and slot
 * Takes into account parent-child venue relationships
 */
export function isVenueAvailable(
  venueId: string,
  date: Date,
  slot: Slot,
  bookings: Booking[],
  requestType: VenueType
): { available: boolean; reason?: string } {
  const venue = findVenueById(venueId);
  if (!venue) {
    return { available: false, reason: 'Venue not found' };
  }

  // Get all bookings for this date and slot
  const dateSlotBookings = bookings.filter(
    (b) =>
      b.date.getDate() === date.getDate() &&
      b.date.getMonth() === date.getMonth() &&
      b.date.getFullYear() === date.getFullYear() &&
      b.slot === slot
  );

  // RULE 1: If requesting full venue
  if (requestType === 'full' && !venue.isSubVenue) {
    // Check if the full venue itself is booked
    const fullVenueBooking = dateSlotBookings.find(
      (b) => b.venueId === venueId && b.isFullVenue
    );
    if (fullVenueBooking) {
      return {
        available: false,
        reason: `Full venue booked by ${fullVenueBooking.customerName}`,
      };
    }

    // RULE 2: Check if ANY sub-venue is booked (blocks full venue)
    // Example: If M1-A is booked, Marquee 1 (Prime) becomes unavailable
    if (venue.subVenues) {
      const subVenueBooking = dateSlotBookings.find((b) =>
        venue.subVenues!.some((sv) => sv.id === b.venueId)
      );
      if (subVenueBooking) {
        const subVenue = findVenueById(subVenueBooking.venueId);
        return {
          available: false,
          reason: `Sub-venue ${subVenue?.name} is already booked`,
        };
      }
    }

    return { available: true };
  }

  // RULE 3: If requesting partial venue (sub-venue)
  if (requestType === 'partial' && venue.isSubVenue) {
    // Check if this specific sub-venue is booked
    const subVenueBooking = dateSlotBookings.find((b) => b.venueId === venueId);
    if (subVenueBooking) {
      return {
        available: false,
        reason: `Sub-venue booked by ${subVenueBooking.customerName}`,
      };
    }

    // RULE 1: Check if parent venue is booked as full venue
    // Example: If Marquee 1 (Prime) is booked, M1-A becomes unavailable
    if (venue.parentVenueId) {
      const parentBooking = dateSlotBookings.find(
        (b) => b.venueId === venue.parentVenueId && b.isFullVenue
      );
      if (parentBooking) {
        return {
          available: false,
          reason: `Full venue booked by ${parentBooking.customerName}`,
        };
      }
    }

    // RULE 3: Other sub-venues of the same parent can still be booked
    // Example: M1-A is available even if M1-B is booked
    return { available: true };
  }

  return { available: false, reason: 'Invalid venue type combination' };
}

/**
 * Get all available venues for a specific date, slot, and venue type
 */
export function getAvailableVenues(
  date: Date,
  slot: Slot,
  venueType: VenueType,
  bookings: Booking[],
  minCapacity?: number
): Venue[] {
  let venuesToCheck: Venue[] = [];

  if (venueType === 'full') {
    // Only check parent venues
    venuesToCheck = venues.filter((v) => !v.isSubVenue);
  } else {
    // Only check sub-venues
    venuesToCheck = venues.flatMap((v) => v.subVenues || []);
  }

  // Filter by capacity if specified
  if (minCapacity) {
    venuesToCheck = venuesToCheck.filter((v) => v.capacity >= minCapacity);
  }

  // Filter by availability
  return venuesToCheck.filter((v) => {
    const { available } = isVenueAvailable(v.id, date, slot, bookings, venueType);
    return available;
  });
}

/**
 * Get booking status for a specific venue/slot combination
 */
export function getVenueSlotStatus(
  venueId: string,
  date: Date,
  slot: Slot,
  bookings: Booking[]
): {
  status: 'available' | 'tentative' | 'confirmed' | 'blocked';
  booking?: Booking;
  reason?: string;
} {
  const venue = findVenueById(venueId);
  if (!venue) {
    return { status: 'blocked', reason: 'Venue not found' };
  }

  const dateSlotBookings = bookings.filter(
    (b) =>
      b.date.getDate() === date.getDate() &&
      b.date.getMonth() === date.getMonth() &&
      b.date.getFullYear() === date.getFullYear() &&
      b.slot === slot
  );

  // Direct booking on this venue
  const directBooking = dateSlotBookings.find((b) => b.venueId === venueId);
  if (directBooking) {
    return { status: directBooking.status, booking: directBooking };
  }

  // If this is a parent venue, check if any sub-venue is booked
  if (!venue.isSubVenue && venue.subVenues) {
    const subVenueBooking = dateSlotBookings.find((b) =>
      venue.subVenues!.some((sv) => sv.id === b.venueId)
    );
    if (subVenueBooking) {
      const subVenue = findVenueById(subVenueBooking.venueId);
      return {
        status: 'blocked',
        reason: `${subVenue?.name} is booked`,
      };
    }
  }

  // If this is a sub-venue, check if parent is booked
  if (venue.isSubVenue && venue.parentVenueId) {
    const parentBooking = dateSlotBookings.find(
      (b) => b.venueId === venue.parentVenueId && b.isFullVenue
    );
    if (parentBooking) {
      const parent = findVenueById(venue.parentVenueId);
      return {
        status: 'blocked',
        reason: `Full venue ${parent?.name} is booked`,
      };
    }
  }

  return { status: 'available' };
}

/**
 * Get summary of availability for a specific date and slot
 */
export function getDateSlotSummary(date: Date, slot: Slot, bookings: Booking[]) {
  const fullVenuesAvailable = getAvailableVenues(date, slot, 'full', bookings);
  const partialVenuesAvailable = getAvailableVenues(date, slot, 'partial', bookings);

  const dateSlotBookings = bookings.filter(
    (b) =>
      b.date.getDate() === date.getDate() &&
      b.date.getMonth() === date.getMonth() &&
      b.date.getFullYear() === date.getFullYear() &&
      b.slot === slot
  );

  return {
    fullVenuesAvailable: fullVenuesAvailable.length,
    partialVenuesAvailable: partialVenuesAvailable.length,
    totalBookings: dateSlotBookings.length,
    confirmedBookings: dateSlotBookings.filter((b) => b.status === 'confirmed').length,
    tentativeBookings: dateSlotBookings.filter((b) => b.status === 'tentative').length,
  };
}