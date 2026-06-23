import { Booking, BookingStatus } from './types-v2';
import { StatusFilters } from './CalendarHeaderV2';

/**
 * Filter bookings based on the selected status filters
 */
export function filterBookingsByView(bookings: Booking[], statusFilters: StatusFilters): Booking[] {
  // If all filters are on, show everything
  if (statusFilters.available && statusFilters.tentative && statusFilters.confirmed) {
    return bookings;
  }

  return bookings.filter((booking) => {
    if (booking.status === 'available' && statusFilters.available) return true;
    if (booking.status === 'tentative' && statusFilters.tentative) return true;
    if (booking.status === 'confirmed' && statusFilters.confirmed) return true;
    if (booking.status === 'completed' && statusFilters.confirmed) return true;
    return false;
  });
}

/**
 * Filter bookings to show ONLY CONFIRMED events (for Event Availability Calendar)
 * Tentative bookings are NEVER shown on the timeline
 */
export function filterConfirmedOnly(bookings: Booking[]): Booking[] {
  return bookings.filter((booking) => booking.status === 'confirmed' || booking.status === 'completed');
}

/**
 * Check if a space should be shown based on the status filters
 * For filtered views, hide spaces that don't have any matching bookings
 */
export function shouldShowSpace(
  spaceBookings: Booking[],
  statusFilters: StatusFilters
): boolean {
  // If all filters are on, show all spaces
  if (statusFilters.available && statusFilters.tentative && statusFilters.confirmed) {
    return true;
  }

  // Show space if it has no bookings (means it's available) and available filter is ON
  if (spaceBookings.length === 0) {
    return statusFilters.available;
  }

  // Show space if it has at least one booking matching the active filters
  return spaceBookings.some(b => {
    if (b.status === 'available' && statusFilters.available) return true;
    if (b.status === 'tentative' && statusFilters.tentative) return true;
    if (b.status === 'confirmed' && statusFilters.confirmed) return true;
    if (b.status === 'completed' && statusFilters.confirmed) return true;
    return false;
  });
}
