import { getPrimeSpaceById, getSubSpaceById, primeSpaces, venues } from '../components/calendar/data-v2';
import { Booking, BookingSpaceAssignment, PrimeSpace } from '../components/calendar/types-v2';

type BookingSpaceSource = Pick<
  Booking,
  'venueId' | 'primeSpaceId' | 'primeSpaceIds' | 'subSpaceId' | 'spaceAssignments'
>;

const unique = <T,>(values: T[]) => Array.from(new Set(values));

export const getBookingSpaceAssignments = (booking: BookingSpaceSource): BookingSpaceAssignment[] => {
  const rawAssignments = Array.isArray(booking.spaceAssignments) ? booking.spaceAssignments : [];
  const assignments = rawAssignments.length > 0 ? rawAssignments : buildLegacyAssignments(booking);
  const deduped = new Map<string, BookingSpaceAssignment>();

  assignments.forEach((assignment, index) => {
    const primeSpaceId = normalizePrimeSpaceId(assignment.primeSpaceId, assignment.subSpaceId);
    const subSpaceId = assignment.subSpaceId && getSubSpaceById(assignment.subSpaceId) ? assignment.subSpaceId : assignment.subSpaceId;
    const assignmentType = (assignment.assignmentType ?? (subSpaceId ? 'SUB_ONLY' : 'PRIME_FULL')) === 'SUB_ONLY'
      ? 'SUB_ONLY'
      : 'PRIME_FULL';

    if (!primeSpaceId) {
      return;
    }

    const key = assignmentType === 'SUB_ONLY' ? `sub:${subSpaceId}` : `prime:${primeSpaceId}`;
    deduped.set(key, {
      venueId: assignment.venueId || booking.venueId || getPrimeSpaceById(primeSpaceId)?.venueId,
      primeSpaceId,
      subSpaceId,
      assignmentType,
      usageLabel: assignment.usageLabel?.trim() || undefined,
      guestCount: typeof assignment.guestCount === 'number' ? assignment.guestCount : undefined,
      sortOrder: typeof assignment.sortOrder === 'number' ? assignment.sortOrder : index,
    });
  });

  return Array.from(deduped.values()).sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
};

const buildLegacyAssignments = (booking: BookingSpaceSource): BookingSpaceAssignment[] => {
  if (booking.subSpaceId) {
    const primeSpaceId = normalizePrimeSpaceId(booking.primeSpaceId, booking.subSpaceId) || booking.primeSpaceIds?.[0];
    return primeSpaceId
      ? [
          {
            venueId: booking.venueId,
            primeSpaceId,
            subSpaceId: booking.subSpaceId,
            assignmentType: 'SUB_ONLY',
            sortOrder: 0,
          },
        ]
      : [];
  }

  return unique((booking.primeSpaceIds ?? [booking.primeSpaceId]).filter(Boolean) as string[]).map((primeSpaceId, index) => ({
    venueId: booking.venueId,
    primeSpaceId,
    assignmentType: 'PRIME_FULL',
    sortOrder: index,
  }));
};

const normalizePrimeSpaceId = (primeSpaceId?: string, subSpaceId?: string) => {
  if (primeSpaceId && getPrimeSpaceById(primeSpaceId)) {
    return primeSpaceId;
  }

  if (subSpaceId) {
    return getSubSpaceById(subSpaceId)?.primeSpaceId;
  }

  return primeSpaceId;
};

export const buildLegacySpaceFieldsFromAssignments = (assignments: BookingSpaceAssignment[]) => {
  const normalizedAssignments = getBookingSpaceAssignments({
    venueId: assignments[0]?.venueId || '',
    spaceAssignments: assignments,
  });
  const uniquePrimeSpaceIds = unique(normalizedAssignments.map((assignment) => assignment.primeSpaceId));
  const primaryAssignment = normalizedAssignments[0];
  const primaryPrimeAssignment =
    normalizedAssignments.find((assignment) => assignment.assignmentType === 'PRIME_FULL') ?? primaryAssignment;
  const legacySubSpaceId =
    normalizedAssignments.length === 1 && primaryAssignment?.assignmentType === 'SUB_ONLY'
      ? primaryAssignment.subSpaceId
      : undefined;

  return {
    primeSpaceId: primaryPrimeAssignment?.primeSpaceId,
    primeSpaceIds: uniquePrimeSpaceIds.length > 0 ? uniquePrimeSpaceIds : undefined,
    subSpaceId: legacySubSpaceId,
  };
};

export const getBookingPrimeSpaceIds = (booking: BookingSpaceSource) =>
  unique(getBookingSpaceAssignments(booking).map((assignment) => assignment.primeSpaceId));

export const bookingUsesPrimeSpace = (booking: BookingSpaceSource, primeSpaceId: string) =>
  getBookingSpaceAssignments(booking).some(
    (assignment) => assignment.assignmentType === 'PRIME_FULL' && assignment.primeSpaceId === primeSpaceId,
  );

export const bookingUsesSubSpace = (booking: BookingSpaceSource, subSpaceId: string) =>
  getBookingSpaceAssignments(booking).some(
    (assignment) => assignment.assignmentType === 'SUB_ONLY' && assignment.subSpaceId === subSpaceId,
  );

export const spaceAssignmentsConflict = (
  leftAssignment: BookingSpaceAssignment,
  rightAssignment: BookingSpaceAssignment,
) => {
  if (leftAssignment.assignmentType === 'PRIME_FULL') {
    return leftAssignment.primeSpaceId === rightAssignment.primeSpaceId;
  }

  if (rightAssignment.assignmentType === 'PRIME_FULL') {
    return leftAssignment.primeSpaceId === rightAssignment.primeSpaceId;
  }

  return Boolean(
    leftAssignment.subSpaceId &&
      rightAssignment.subSpaceId &&
      leftAssignment.subSpaceId === rightAssignment.subSpaceId,
  );
};

export const bookingsConflictOnAssignedSpaces = (
  leftBooking: BookingSpaceSource,
  rightBooking: BookingSpaceSource,
) => {
  const leftAssignments = getBookingSpaceAssignments(leftBooking);
  const rightAssignments = getBookingSpaceAssignments(rightBooking);

  return leftAssignments.some((leftAssignment) =>
    rightAssignments.some((rightAssignment) => spaceAssignmentsConflict(leftAssignment, rightAssignment)),
  );
};

export const bookingBlocksPrimeSpace = (
  booking: BookingSpaceSource,
  primeSpaceId: string,
  primeSpaceCatalog: PrimeSpace[] = primeSpaces,
) => {
  const assignments = getBookingSpaceAssignments(booking);
  if (assignments.some((assignment) => assignment.assignmentType === 'PRIME_FULL' && assignment.primeSpaceId === primeSpaceId)) {
    return true;
  }

  const primeSpace = primeSpaceCatalog.find((space) => space.id === primeSpaceId);
  if (!primeSpace) {
    return false;
  }

  return assignments.some(
    (assignment) =>
      assignment.assignmentType === 'SUB_ONLY' &&
      Boolean(assignment.subSpaceId) &&
      primeSpace.subSpaces.some((subSpace) => subSpace.id === assignment.subSpaceId),
  );
};

export const bookingBlocksSubSpace = (booking: BookingSpaceSource, subSpaceId: string) => {
  const subSpace = getSubSpaceById(subSpaceId);
  if (!subSpace) {
    return false;
  }

  return getBookingSpaceAssignments(booking).some((assignment) => {
    if (assignment.assignmentType === 'PRIME_FULL') {
      return assignment.primeSpaceId === subSpace.primeSpaceId;
    }

    return assignment.subSpaceId === subSpaceId;
  });
};

export const formatBookingSpaceAssignments = (
  booking: BookingSpaceSource,
  options?: { includeVenue?: boolean },
) =>
  getBookingSpaceAssignments(booking).map((assignment) => {
    const primeSpace = getPrimeSpaceById(assignment.primeSpaceId);
    const subSpace = assignment.subSpaceId ? getSubSpaceById(assignment.subSpaceId) : undefined;
    const venue = venues.find((candidate) => candidate.id === (assignment.venueId || primeSpace?.venueId));
    const baseLabel = subSpace ? `${subSpace.name}` : `${primeSpace?.name ?? assignment.primeSpaceId}`;
    const fullLabel = options?.includeVenue === false ? baseLabel : venue ? `${venue.name} > ${baseLabel}` : baseLabel;
    return assignment.usageLabel ? `${fullLabel} - ${assignment.usageLabel}` : fullLabel;
  });
