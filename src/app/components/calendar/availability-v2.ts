// Availability logic for Venue → Prime Space → Sub Space system
import { Booking, PrimeSpace, AvailabilityCheck } from './types-v2';
import { getPrimeSpaceById, getSubSpaceById } from './data-v2';
import { bookingBlocksPrimeSpace, bookingBlocksSubSpace, bookingUsesPrimeSpace, bookingUsesSubSpace } from '../../lib/bookingSpaces';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * VENUE RESERVATION RULES - IMPLEMENTATION SUMMARY
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * THREE PRIMARY RULES:
 * 
 * 📌 RULE 1: Full Prime Space Booking Blocks All Sub-Spaces
 *    When a Prime Space (e.g., Marquee 1) is booked, ALL its sub-spaces 
 *    (M1-A, M1-B) become unavailable.
 *    Example: Marquee 1 booked → M1-A ❌ BLOCKED, M1-B ❌ BLOCKED
 * 
 * 📌 RULE 2: Sub-Space Booking Blocks Parent Prime Space
 *    When ANY sub-space (e.g., M1-A) is booked, the parent Prime Space 
 *    (Marquee 1) becomes unavailable.
 *    Example: M1-A booked → Marquee 1 ❌ BLOCKED, M1-B ✅ AVAILABLE
 * 
 * 📌 RULE 3: Concurrent Sub-Space Bookings Allowed
 *    Multiple sub-spaces of the same Prime Space CAN be booked simultaneously.
 *    Example: M1-A booked + M1-B booked → Both ✅ CONFIRMED, Marquee 1 ❌ BLOCKED
 * 
 * ════════════════════════════════════════════════════════════════════════════
 */

/**
 * Parse time string "HH:MM" to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if two time ranges overlap
 */
export function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);

  return s1 < e2 && s2 < e1;
}

/**
 * Check if a booking overlaps with a given time range on a specific date
 */
function bookingOverlaps(
  booking: Booking,
  date: Date,
  startTime: string,
  endTime: string
): boolean {
  if (booking.status !== 'confirmed' && booking.status !== 'completed') {
    return false;
  }

  // Check if same date
  if (
    booking.date.getDate() !== date.getDate() ||
    booking.date.getMonth() !== date.getMonth() ||
    booking.date.getFullYear() !== date.getFullYear()
  ) {
    return false;
  }

  // Check time overlap
  return timesOverlap(booking.startTime, booking.endTime, startTime, endTime);
}

/**
 * Check if a prime space can be booked
 * Rule: Prime space cannot be booked if ANY sub space has a conflicting booking
 */
export function canBookPrimeSpace(
  primeSpaceId: string,
  date: Date,
  startTime: string,
  endTime: string,
  allBookings: Booking[]
): AvailabilityCheck {
  const primeSpace = getPrimeSpaceById(primeSpaceId);
  if (!primeSpace) {
    return { isAvailable: false, reason: 'Prime space not found' };
  }

  const directBooking = allBookings.find((booking) =>
    bookingUsesPrimeSpace(booking, primeSpaceId) && bookingOverlaps(booking, date, startTime, endTime),
  );

  if (directBooking) {
    return {
      isAvailable: false,
      reason: 'Prime space already booked',
      conflictingBooking: directBooking,
    };
  }

  // Check if any sub space has a conflicting booking
  for (const subSpace of primeSpace.subSpaces) {
    const subSpaceBooking = allBookings.find((booking) =>
      bookingBlocksSubSpace(booking, subSpace.id) && bookingOverlaps(booking, date, startTime, endTime),
    );

    if (subSpaceBooking) {
      return {
        isAvailable: false,
        reason: `Sub space ${subSpace.name} already booked`,
        conflictingBooking: subSpaceBooking,
      };
    }
  }

  return { isAvailable: true };
}

/**
 * Check if a sub space can be booked
 * Rule: Sub space cannot be booked if parent prime space has a conflicting booking
 */
export function canBookSubSpace(
  subSpaceId: string,
  date: Date,
  startTime: string,
  endTime: string,
  allBookings: Booking[]
): AvailabilityCheck {
  const subSpace = getSubSpaceById(subSpaceId);
  if (!subSpace) {
    return { isAvailable: false, reason: 'Sub space not found' };
  }

  // Check for direct booking on this sub space
  const directBooking = allBookings.find((booking) =>
    bookingUsesSubSpace(booking, subSpaceId) && bookingOverlaps(booking, date, startTime, endTime),
  );

  if (directBooking) {
    return {
      isAvailable: false,
      reason: 'Sub space already booked',
      conflictingBooking: directBooking,
    };
  }

  // Check if parent prime space has a conflicting booking (support both old and new format)
  const primeSpaceBooking = allBookings.find((booking) =>
    bookingUsesPrimeSpace(booking, subSpace.primeSpaceId) &&
    bookingOverlaps(booking, date, startTime, endTime),
  );

  if (primeSpaceBooking) {
    return {
      isAvailable: false,
      reason: 'Prime space fully booked',
      conflictingBooking: primeSpaceBooking,
    };
  }

  return { isAvailable: true };
}

/**
 * Get all bookings for a specific prime space or its sub spaces on a date
 */
export function getPrimeSpaceBookings(
  primeSpaceId: string,
  date: Date,
  allBookings: Booking[]
): Booking[] {
  const primeSpace = getPrimeSpaceById(primeSpaceId);
  if (!primeSpace) return [];

  return allBookings.filter((b) => {
    // Check if same date
    if (
      b.date.getDate() !== date.getDate() ||
      b.date.getMonth() !== date.getMonth() ||
      b.date.getFullYear() !== date.getFullYear()
    ) {
      return false;
    }

    // Check if booking is for this prime space or any of its sub spaces (support both formats)
    return bookingBlocksPrimeSpace(b, primeSpaceId);
  });
}

/**
 * Get bookings for a specific sub space on a date
 */
export function getSubSpaceBookings(
  subSpaceId: string,
  date: Date,
  allBookings: Booking[]
): Booking[] {
  const subSpace = getSubSpaceById(subSpaceId);
  if (!subSpace) return [];

  return allBookings.filter((b) => {
    // Check if same date
    if (
      b.date.getDate() !== date.getDate() ||
      b.date.getMonth() !== date.getMonth() ||
      b.date.getFullYear() !== date.getFullYear()
    ) {
      return false;
    }

    // Check if booking is for this sub space OR the parent prime space (support both formats)
    return bookingUsesSubSpace(b, subSpaceId) || bookingUsesPrimeSpace(b, subSpace.primeSpaceId);
  });
}

/**
 * Check if a prime space should be HIDDEN during a specific time slot
 * Hidden when: Any sub space has a booking that overlaps with the given time slot
 */
export function shouldHidePrimeSpaceInTimeSlot(
  primeSpaceId: string,
  date: Date,
  startTime: string,
  endTime: string,
  allBookings: Booking[]
): boolean {
  const primeSpace = getPrimeSpaceById(primeSpaceId);
  if (!primeSpace) return true;

  // Check if any sub space has a booking that overlaps with this time slot
  return allBookings.some((b) => {
    // Check if same date
    if (
      b.date.getDate() !== date.getDate() ||
      b.date.getMonth() !== date.getMonth() ||
      b.date.getFullYear() !== date.getFullYear()
    ) {
      return false;
    }

    // Check if this booking is for a sub space of this prime space
    if (!primeSpace.subSpaces.some((subSpace) => bookingBlocksSubSpace(b, subSpace.id))) {
      return false;
    }

    // Check if time overlaps
    return timesOverlap(b.startTime, b.endTime, startTime, endTime);
  });
}

/**
 * Check if a sub space should be HIDDEN during a specific time slot
 * Hidden when: Parent prime space is booked during the given time slot
 */
export function shouldHideSubSpaceInTimeSlot(
  subSpaceId: string,
  date: Date,
  startTime: string,
  endTime: string,
  allBookings: Booking[]
): boolean {
  const subSpace = getSubSpaceById(subSpaceId);
  if (!subSpace) return true;

  // Check if parent prime space has a booking that overlaps with this time slot
  return allBookings.some((b) => {
    // Check if same date
    if (
      b.date.getDate() !== date.getDate() ||
      b.date.getMonth() !== date.getMonth() ||
      b.date.getFullYear() !== date.getFullYear()
    ) {
      return false;
    }

    // Check if this is a prime space booking (support both formats)
    const hasPrimeSpace = bookingUsesPrimeSpace(b, subSpace.primeSpaceId);
    if (!hasPrimeSpace) {
      return false;
    }

    // Check if time overlaps
    return timesOverlap(b.startTime, b.endTime, startTime, endTime);
  });
}

/**
 * Check if a prime space should be HIDDEN (not just disabled)
 * Hidden when: Any sub space has a booking on this date
 */
export function shouldHidePrimeSpace(
  primeSpaceId: string,
  date: Date,
  allBookings: Booking[]
): boolean {
  const primeSpace = getPrimeSpaceById(primeSpaceId);
  if (!primeSpace) return true;

  // Check if any sub space has ANY booking on this date
  return allBookings.some((b) => {
    if (
      b.date.getDate() !== date.getDate() ||
      b.date.getMonth() !== date.getMonth() ||
      b.date.getFullYear() !== date.getFullYear()
    ) {
      return false;
    }

    // Check if booking has any sub-space of this prime space
    const hasSubSpace = primeSpace.subSpaces.some((ss) => bookingBlocksSubSpace(b, ss.id));
    return hasSubSpace;
  });
}

/**
 * Check if a sub space should be HIDDEN (not just disabled)
 * Hidden when: Parent prime space is fully booked on this date
 */
export function shouldHideSubSpace(
  subSpaceId: string,
  date: Date,
  allBookings: Booking[]
): boolean {
  const subSpace = getSubSpaceById(subSpaceId);
  if (!subSpace) return true;

  // Check if parent prime space has ANY booking on this date
  return allBookings.some((b) => {
    if (
      b.date.getDate() !== date.getDate() ||
      b.date.getMonth() !== date.getMonth() ||
      b.date.getFullYear() !== date.getFullYear()
    ) {
      return false;
    }

    return bookingUsesPrimeSpace(b, subSpace.primeSpaceId);
  });
}
