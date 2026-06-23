import { Booking, PrimeSpace } from '../components/calendar/types-v2';
import { bookingBlocksPrimeSpace, bookingBlocksSubSpace, bookingsConflictOnAssignedSpaces, getBookingSpaceAssignments } from './bookingSpaces';

const toComparableDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));

export const isSameBookingDate = (left: Date | string, right: Date | string) => {
  const leftDate = toComparableDate(left);
  const rightDate = toComparableDate(right);

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
};

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const normalizeTimeRange = (start: string, end: string) => {
  const startMinutes = timeToMinutes(start);
  let endMinutes = timeToMinutes(end);

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return [startMinutes, endMinutes] as const;
};

const timesOverlap = (start1: string, end1: string, start2: string, end2: string) => {
  const [normalizedStart1, normalizedEnd1] = normalizeTimeRange(start1, end1);
  const [normalizedStart2, normalizedEnd2] = normalizeTimeRange(start2, end2);

  return normalizedStart1 < normalizedEnd2 && normalizedStart2 < normalizedEnd1;
};

export const hasConfirmedReservationConflict = ({
  booking,
  existingBooking,
  primeSpaceCatalog,
}: {
  booking: Pick<Booking, 'id' | 'date' | 'startTime' | 'endTime' | 'venueId' | 'primeSpaceId' | 'primeSpaceIds' | 'subSpaceId'>;
  existingBooking: Booking;
  primeSpaceCatalog: PrimeSpace[];
}) => {
  if (existingBooking.id === booking.id) {
    return false;
  }

  if (existingBooking.status !== 'confirmed' && existingBooking.status !== 'completed') {
    return false;
  }

  if (getBookingSpaceAssignments(booking).length === 0) {
    return false;
  }

  if (!isSameBookingDate(existingBooking.date, booking.date) || existingBooking.venueId !== booking.venueId) {
    return false;
  }

  if (!timesOverlap(booking.startTime, booking.endTime, existingBooking.startTime, existingBooking.endTime)) {
    return false;
  }

  return bookingsConflictOnAssignedSpaces(booking, existingBooking)
    || getBookingSpaceAssignments(booking).some((assignment) =>
      assignment.assignmentType === 'PRIME_FULL'
        ? bookingBlocksPrimeSpace(existingBooking, assignment.primeSpaceId, primeSpaceCatalog)
        : Boolean(assignment.subSpaceId && bookingBlocksSubSpace(existingBooking, assignment.subSpaceId)),
    );
};
