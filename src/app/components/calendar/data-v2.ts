// Data loader for Venue → Prime Space → Sub Space system
// Now loads from Master Setup localStorage
import { Venue, PrimeSpace, Booking, BookingSpaceAssignment } from './types-v2';
import { venueDataStore, primeSpaceDataStore, subSpaceDataStore } from '../../lib/masterDataStore';

// Historical demo data kept as reference only. Reservation screens should show
// venues from Master Setup, not create fallback venues in a fresh system.
const defaultVenues: any[] = [
  {
    id: '1',
    venueName: 'Aiwan-e-Akbari',
    venueCode: 'VEN001',
    city: 'Lahore',
    area: 'Main Ferozepur Road Opposite Metro Station No.23',
    isActive: true,
  },
  {
    id: '2',
    venueName: 'Taj Mahal',
    venueCode: 'VEN002',
    city: 'Lahore',
    area: '9-Abu Baker Block Garden Town',
    isActive: true,
  },
];

const defaultPrimeSpaces: any[] = [
  // Aiwan-e-Akbari Prime Spaces
  {
    id: 'ps-1',
    venueId: '1',
    spaceName: 'Marquee 1',
    spaceCode: 'VEN001-PS001',
    defaultSeatingCapacity: 500,
    allowSubSpaces: true,
    isActive: true,
  },
  {
    id: 'ps-2',
    venueId: '1',
    spaceName: 'Marquee 2',
    spaceCode: 'VEN001-PS002',
    defaultSeatingCapacity: 500,
    allowSubSpaces: true,
    isActive: true,
  },
  {
    id: 'ps-3',
    venueId: '1',
    spaceName: 'Marquee 3',
    spaceCode: 'VEN001-PS003',
    defaultSeatingCapacity: 500,
    allowSubSpaces: true,
    isActive: true,
  },
  {
    id: 'ps-4',
    venueId: '1',
    spaceName: 'Lawn-M4',
    spaceCode: 'VEN001-PS004',
    defaultSeatingCapacity: 300,
    allowSubSpaces: false,
    isActive: true,
  },
  {
    id: 'ps-5',
    venueId: '1',
    spaceName: 'Lawn-Open',
    spaceCode: 'VEN001-PS005',
    defaultSeatingCapacity: 400,
    allowSubSpaces: false,
    isActive: true,
  },
  // Taj Mahal Prime Spaces
  {
    id: 'ps-6',
    venueId: '2',
    spaceName: 'Hall 1',
    spaceCode: 'VEN002-PS001',
    defaultSeatingCapacity: 600,
    allowSubSpaces: false,
    isActive: true,
  },
  {
    id: 'ps-7',
    venueId: '2',
    spaceName: 'Hall 2',
    spaceCode: 'VEN002-PS002',
    defaultSeatingCapacity: 400,
    allowSubSpaces: false,
    isActive: true,
  },
];

const defaultSubSpaces: any[] = [
  // Marquee 1 Sub-Spaces
  {
    id: 'ss-1',
    primeSpaceId: 'ps-1',
    subSpaceName: 'M1-A',
    subSpaceCode: 'VEN001-PS001-SS001',
    customCapacity: 250,
    isActive: true,
  },
  {
    id: 'ss-2',
    primeSpaceId: 'ps-1',
    subSpaceName: 'M1-B',
    subSpaceCode: 'VEN001-PS001-SS002',
    customCapacity: 250,
    isActive: true,
  },
  // Marquee 2 Sub-Spaces
  {
    id: 'ss-3',
    primeSpaceId: 'ps-2',
    subSpaceName: 'M2-A',
    subSpaceCode: 'VEN001-PS002-SS001',
    customCapacity: 250,
    isActive: true,
  },
  {
    id: 'ss-4',
    primeSpaceId: 'ps-2',
    subSpaceName: 'M2-B',
    subSpaceCode: 'VEN001-PS002-SS002',
    customCapacity: 250,
    isActive: true,
  },
  // Marquee 3 Sub-Spaces
  {
    id: 'ss-5',
    primeSpaceId: 'ps-3',
    subSpaceName: 'M3-A',
    subSpaceCode: 'VEN001-PS003-SS001',
    customCapacity: 250,
    isActive: true,
  },
  {
    id: 'ss-6',
    primeSpaceId: 'ps-3',
    subSpaceName: 'M3-B',
    subSpaceCode: 'VEN001-PS003-SS002',
    customCapacity: 250,
    isActive: true,
  },
];

// Load data from Master Setup - DYNAMIC VERSION
export function loadVenuesFromMasterSetup(): Venue[] {
  const masterVenues = venueDataStore.getVenues([]);
  
  return masterVenues
    .filter((v: any) => v.isActive !== false)
    .map((v: any) => ({
      id: v.id,
      name: v.venueName,
      location: `${v.area}, ${v.city}`,
    }));
}

export function loadPrimeSpacesFromMasterSetup(): PrimeSpace[] {
  const masterPrimeSpaces = primeSpaceDataStore.getPrimeSpaces([]);
  const masterSubSpaces = subSpaceDataStore.getSubSpaces([]);
  
  return masterPrimeSpaces
    .filter((ps: any) => ps.isActive !== false)
    .map((ps: any) => {
      // Find all sub-spaces for this prime space
      const relatedSubSpaces = masterSubSpaces
        .filter((ss: any) => ss.primeSpaceId === ps.id && ss.isActive !== false)
        .map((ss: any) => ({
          id: ss.id,
          name: ss.subSpaceName,
          capacity: ss.customCapacity || (ss.useCustomCapacity ? ss.customCapacity : ps.defaultSeatingCapacity / 2),
          primeSpaceId: ps.id,
        }));
      
      return {
        id: ps.id,
        name: ps.spaceName,
        venueId: ps.venueId,
        capacity: ps.defaultSeatingCapacity,
        subSpaces: relatedSubSpaces,
      };
    });
}

// Keep exported arrays live so existing imports reflect Master Setup changes.
export const venues: Venue[] = [];
export const primeSpaces: PrimeSpace[] = [];

export function refreshMasterSetupData() {
  venues.splice(0, venues.length, ...loadVenuesFromMasterSetup());
  primeSpaces.splice(0, primeSpaces.length, ...loadPrimeSpacesFromMasterSetup());
}

refreshMasterSetupData();

if (typeof window !== 'undefined') {
  const handleMasterDataRefresh = () => {
    refreshMasterSetupData();
  };

  window.addEventListener('masterDataUpdated', handleMasterDataRefresh);
  window.addEventListener('storage', handleMasterDataRefresh);
}

// Helper functions
export const getVenueById = (id: string): Venue | undefined => {
  return venues.find((v) => v.id === id);
};

export const getPrimeSpacesByVenue = (venueId: string): PrimeSpace[] => {
  return primeSpaces.filter((ps) => ps.venueId === venueId);
};

export const getPrimeSpaceById = (id: string): PrimeSpace | undefined => {
  return primeSpaces.find((ps) => ps.id === id);
};

export const getSubSpaceById = (id: string) => {
  for (const primeSpace of primeSpaces) {
    const subSpace = primeSpace.subSpaces.find((ss) => ss.id === id);
    if (subSpace) return subSpace;
  }
  return undefined;
};

const normalizeLookupValue = (value?: string) => {
  if (!value) return '';

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const getDefaultVenueId = () => venues[0]?.id ?? '';

export const resolveVenueId = (
  value?: string,
  context?: {
    venueName?: string;
    primeSpaceId?: string;
    primeSpaceIds?: string[];
    subSpaceId?: string;
    spaceAssignments?: BookingSpaceAssignment[];
  },
) => {
  if (value && getVenueById(value)) {
    return value;
  }

  const primeSpaceCandidates = [
    context?.primeSpaceId,
    ...(context?.primeSpaceIds ?? []),
    ...((context?.spaceAssignments ?? []).map((assignment) => assignment.primeSpaceId)),
  ].filter(Boolean) as string[];

  for (const primeSpaceId of primeSpaceCandidates) {
    const primeSpace = getPrimeSpaceById(primeSpaceId);
    if (primeSpace) {
      return primeSpace.venueId;
    }
  }

  if (context?.subSpaceId) {
    const subSpace = getSubSpaceById(context.subSpaceId);
    const parentPrimeSpace = subSpace ? getPrimeSpaceById(subSpace.primeSpaceId) : undefined;
    if (parentPrimeSpace) {
      return parentPrimeSpace.venueId;
    }
  }

  const matchValue = normalizeLookupValue(value || context?.venueName);
  if (!matchValue) {
    return value || '';
  }

  const matchedVenue = venues.find((venue) => normalizeLookupValue(venue.name) === matchValue);
  return matchedVenue?.id ?? value ?? '';
};

export const resolvePrimeSpaceId = (
  value?: string,
  context?: {
    venueId?: string;
    venueName?: string;
    primeSpaceIds?: string[];
    subSpaceId?: string;
    primeSpaceName?: string;
    spaceAssignments?: BookingSpaceAssignment[];
  },
) => {
  const resolvedVenueId = resolveVenueId(context?.venueId, {
    venueName: context?.venueName,
    primeSpaceIds: context?.primeSpaceIds,
    subSpaceId: context?.subSpaceId,
    spaceAssignments: context?.spaceAssignments,
  });

  if (value) {
    const exactPrimeSpace = getPrimeSpaceById(value);
    if (exactPrimeSpace && (!resolvedVenueId || exactPrimeSpace.venueId === resolvedVenueId)) {
      return exactPrimeSpace.id;
    }
  }

  const primeSpaceCandidates = [
    value,
    ...(context?.primeSpaceIds ?? []),
    ...((context?.spaceAssignments ?? []).map((assignment) => assignment.primeSpaceId)),
  ].filter(Boolean) as string[];

  for (const primeSpaceId of primeSpaceCandidates) {
    const primeSpace = getPrimeSpaceById(primeSpaceId);
    if (primeSpace && (!resolvedVenueId || primeSpace.venueId === resolvedVenueId)) {
      return primeSpace.id;
    }
  }

  if (context?.subSpaceId) {
    const subSpace = getSubSpaceById(context.subSpaceId);
    if (subSpace) {
      return subSpace.primeSpaceId;
    }
  }

  const matchValue = normalizeLookupValue(value || context?.primeSpaceName);
  if (!matchValue || !resolvedVenueId) {
    return value || '';
  }

  const matchedPrimeSpace = getPrimeSpacesByVenue(resolvedVenueId).find(
    (primeSpace) => normalizeLookupValue(primeSpace.name) === matchValue,
  );

  return matchedPrimeSpace?.id ?? value ?? '';
};

export const normalizeBookingVenueContext = <
  T extends {
    venueId?: string;
    venueName?: string;
    primeSpaceId?: string;
    primeSpaceIds?: string[];
    primeSpaceName?: string;
    subSpaceId?: string;
    subSpaceName?: string;
    spaceAssignments?: BookingSpaceAssignment[];
  },
>(
  booking: T,
): T => {
  const legacySubSpaceId = booking.subSpaceId && getSubSpaceById(booking.subSpaceId) ? booking.subSpaceId : booking.subSpaceId;
  const rawAssignments = Array.isArray(booking.spaceAssignments) && booking.spaceAssignments.length > 0
    ? booking.spaceAssignments
    : buildLegacySpaceAssignments({
        venueId: booking.venueId,
        primeSpaceId: booking.primeSpaceId,
        primeSpaceIds: booking.primeSpaceIds,
        subSpaceId: legacySubSpaceId,
      });
  const normalizedAssignments = Array.from(
    new Map(
      rawAssignments
        .map((assignment, index) => {
          const normalizedSubSpaceId =
            assignment.subSpaceId && getSubSpaceById(assignment.subSpaceId)
              ? assignment.subSpaceId
              : assignment.subSpaceId;
          const normalizedPrimeSpaceId = resolvePrimeSpaceId(assignment.primeSpaceId, {
            venueId: booking.venueId,
            venueName: booking.venueName,
            subSpaceId: normalizedSubSpaceId,
            spaceAssignments: rawAssignments,
          });

          if (!normalizedPrimeSpaceId) {
            return undefined;
          }

          const assignmentType =
            (assignment.assignmentType ?? (normalizedSubSpaceId ? 'SUB_ONLY' : 'PRIME_FULL')) === 'SUB_ONLY'
              ? 'SUB_ONLY'
              : 'PRIME_FULL';
          const key = assignmentType === 'SUB_ONLY' ? `sub:${normalizedSubSpaceId}` : `prime:${normalizedPrimeSpaceId}`;

          return [
            key,
            {
              venueId: assignment.venueId || booking.venueId,
              primeSpaceId: normalizedPrimeSpaceId,
              subSpaceId: normalizedSubSpaceId,
              assignmentType,
              usageLabel: assignment.usageLabel?.trim() || undefined,
              guestCount: typeof assignment.guestCount === 'number' ? assignment.guestCount : undefined,
              sortOrder: typeof assignment.sortOrder === 'number' ? assignment.sortOrder : index,
            } satisfies BookingSpaceAssignment,
          ] as const;
        })
        .filter(Boolean) as Array<readonly [string, BookingSpaceAssignment]>,
    ).values(),
  ).sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  const primaryAssignment = normalizedAssignments[0];
  const primaryPrimeAssignment =
    normalizedAssignments.find((assignment) => assignment.assignmentType === 'PRIME_FULL') ?? primaryAssignment;
  const normalizedSubSpaceId =
    normalizedAssignments.length === 1 && primaryAssignment?.assignmentType === 'SUB_ONLY'
      ? primaryAssignment.subSpaceId
      : undefined;
  const normalizedPrimeSpaceIds = Array.from(
    new Set(normalizedAssignments.map((assignment) => assignment.primeSpaceId).filter(Boolean)),
  );
  const resolvedPrimeSpaceId = primaryPrimeAssignment?.primeSpaceId || resolvePrimeSpaceId(booking.primeSpaceId, {
    venueId: booking.venueId,
    venueName: booking.venueName,
    primeSpaceIds: booking.primeSpaceIds,
    subSpaceId: normalizedSubSpaceId,
    primeSpaceName: booking.primeSpaceName,
    spaceAssignments: normalizedAssignments,
  });

  const resolvedVenueId = resolveVenueId(booking.venueId, {
    venueName: booking.venueName,
    primeSpaceId: resolvedPrimeSpaceId,
    primeSpaceIds: normalizedPrimeSpaceIds,
    subSpaceId: normalizedSubSpaceId,
    spaceAssignments: normalizedAssignments,
  });
  const resolvedVenue = getVenueById(resolvedVenueId);
  const resolvedPrimeSpace = resolvedPrimeSpaceId ? getPrimeSpaceById(resolvedPrimeSpaceId) : undefined;
  const resolvedSubSpace = normalizedSubSpaceId ? getSubSpaceById(normalizedSubSpaceId) : undefined;

  return {
    ...booking,
    venueId: resolvedVenueId || booking.venueId,
    venueName: resolvedVenue?.name ?? booking.venueName,
    primeSpaceId: resolvedPrimeSpaceId || booking.primeSpaceId,
    primeSpaceIds:
      normalizedPrimeSpaceIds.length > 0 ? normalizedPrimeSpaceIds : booking.primeSpaceIds,
    primeSpaceName: resolvedPrimeSpace?.name ?? booking.primeSpaceName,
    subSpaceId: normalizedSubSpaceId || booking.subSpaceId,
    subSpaceName: resolvedSubSpace?.name ?? booking.subSpaceName,
    spaceAssignments: normalizedAssignments.length > 0 ? normalizedAssignments : booking.spaceAssignments,
  };
};

const buildLegacySpaceAssignments = (booking: {
  venueId?: string;
  primeSpaceId?: string;
  primeSpaceIds?: string[];
  subSpaceId?: string;
}): BookingSpaceAssignment[] => {
  if (booking.subSpaceId) {
    const parentPrimeSpaceId = resolvePrimeSpaceId(booking.primeSpaceId, {
      venueId: booking.venueId,
      primeSpaceIds: booking.primeSpaceIds,
      subSpaceId: booking.subSpaceId,
    });
    return parentPrimeSpaceId
      ? [
          {
            venueId: booking.venueId,
            primeSpaceId: parentPrimeSpaceId,
            subSpaceId: booking.subSpaceId,
            assignmentType: 'SUB_ONLY',
            sortOrder: 0,
          },
        ]
      : [];
  }

  return Array.from(new Set((booking.primeSpaceIds ?? [booking.primeSpaceId]).filter(Boolean) as string[])).map(
    (primeSpaceId, index) => ({
      venueId: booking.venueId,
      primeSpaceId,
      assignmentType: 'PRIME_FULL',
      sortOrder: index,
    }),
  );
};

// Generate mock bookings
export const generateBookings = (): Booking[] => {
  const bookings: Booking[] = [];
  const today = new Date();

  // ========== DEMO CONFIRMED BOOKINGS FOR EVENT AVAILABILITY CALENDAR ==========
  // Using actual venue IDs from Master Setup default data
  
  // Confirmed Booking 1 - Today at Aiwan-e-Akbari (Marquee 1)
  bookings.push({
    id: 'demo-confirmed-1',
    venueId: '1', // Aiwan-e-Akbari
    primeSpaceId: 'ps-1', // Marquee 1
    primeSpaceIds: ['ps-1'],
    date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    startTime: '18:00',
    endTime: '23:00',
    guestCount: 500,
    customerName: 'Ahmed Khan',
    customerPhone: '+923001234567',
    eventType: 'Wedding',
    status: 'confirmed',
    createdAt: new Date(),
    totalAmount: 250000,
    paidAmount: 250000,
    balance: 0,
  });

  // Confirmed Booking 2 - Tomorrow at Aiwan-e-Akbari (Lawn-M4)
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  bookings.push({
    id: 'demo-confirmed-2',
    venueId: '1', // Aiwan-e-Akbari
    primeSpaceId: 'ps-4', // Lawn-M4
    primeSpaceIds: ['ps-4'],
    date: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()),
    startTime: '14:00',
    endTime: '18:00',
    guestCount: 300,
    customerName: 'Fatima Ali',
    customerPhone: '+92 321 9876543',
    eventType: 'Birthday Party',
    status: 'confirmed',
    createdAt: new Date(),
    totalAmount: 180000,
    paidAmount: 90000,
    balance: 90000,
  });

  // Confirmed Booking 3 - In 3 days at Taj Mahal (Hall 1)
  const day3 = new Date(today);
  day3.setDate(day3.getDate() + 3);
  bookings.push({
    id: 'demo-confirmed-3',
    venueId: '2', // Taj Mahal
    primeSpaceId: 'ps-6', // Hall 1
    primeSpaceIds: ['ps-6'],
    date: new Date(day3.getFullYear(), day3.getMonth(), day3.getDate()),
    startTime: '19:00',
    endTime: '00:00',
    guestCount: 400,
    customerName: 'Hassan Raza',
    customerPhone: '+92 333 4567890',
    eventType: 'Corporate Event',
    status: 'confirmed',
    createdAt: new Date(),
  });

  // Confirmed Booking 4 - In 10 days at Aiwan-e-Akbari (Marquee 2)
  const day10 = new Date(today);
  day10.setDate(day10.getDate() + 10);
  bookings.push({
    id: 'demo-confirmed-4',
    venueId: '1', // Aiwan-e-Akbari
    primeSpaceId: 'ps-2', // Marquee 2
    primeSpaceIds: ['ps-2'],
    date: new Date(day10.getFullYear(), day10.getMonth(), day10.getDate()),
    startTime: '17:00',
    endTime: '22:00',
    guestCount: 450,
    customerName: 'Ayesha Malik',
    customerPhone: '+92 333 2221111',
    eventType: 'Walima',
    status: 'confirmed',
    createdAt: new Date(),
  });

  // Tentative Booking 1 - In 5 days at Aiwan-e-Akbari (Marquee 3)
  const day5 = new Date(today);
  day5.setDate(day5.getDate() + 5);
  bookings.push({
    id: 'demo-tentative-1',
    venueId: '1', // Aiwan-e-Akbari
    primeSpaceId: 'ps-3', // Marquee 3
    primeSpaceIds: ['ps-3'],
    date: new Date(day5.getFullYear(), day5.getMonth(), day5.getDate()),
    startTime: '18:00',
    endTime: '23:00',
    guestCount: 350,
    customerName: 'Sara Ahmad',
    customerPhone: '+92 315 1122334',
    eventType: 'Engagement',
    status: 'tentative',
    createdAt: new Date(),
  });

  // Tentative Booking 2 - In 7 days at Taj Mahal (Hall 2)
  const day7 = new Date(today);
  day7.setDate(day7.getDate() + 7);
  bookings.push({
    id: 'demo-tentative-2',
    venueId: '2', // Taj Mahal
    primeSpaceId: 'ps-7', // Hall 2
    primeSpaceIds: ['ps-7'],
    date: new Date(day7.getFullYear(), day7.getMonth(), day7.getDate()),
    startTime: '16:00',
    endTime: '21:00',
    guestCount: 200,
    customerName: 'Bilal Hussain',
    customerPhone: '+92 300 9988776',
    eventType: 'Mehndi',
    status: 'tentative',
    createdAt: new Date(),
  });

  // Tentative Booking 3 - Tomorrow at Aiwan-e-Akbari (Lawn-Open)
  bookings.push({
    id: 'demo-tentative-3',
    venueId: '1', // Aiwan-e-Akbari
    primeSpaceId: 'ps-5', // Lawn-Open
    primeSpaceIds: ['ps-5'],
    date: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()),
    startTime: '11:00',
    endTime: '15:00',
    guestCount: 250,
    customerName: 'Zain Abbas',
    customerPhone: '+92 300 5554444',
    eventType: 'Mayun',
    status: 'tentative',
    createdAt: new Date(),
  });

  // ========== ADDITIONAL BOOKINGS FOR FULLER CALENDAR ==========
  
  // Confirmed Booking 5 - In 2 days at Aiwan-e-Akbari (Marquee 1)
  const day2 = new Date(today);
  day2.setDate(day2.getDate() + 2);
  bookings.push({
    id: 'demo-confirmed-5',
    venueId: '1',
    primeSpaceId: 'ps-1',
    primeSpaceIds: ['ps-1'],
    date: new Date(day2.getFullYear(), day2.getMonth(), day2.getDate()),
    startTime: '19:00',
    endTime: '01:00',
    guestCount: 600,
    customerName: 'Imran Siddiqui',
    customerPhone: '+92 321 7778888',
    eventType: 'Wedding',
    status: 'confirmed',
    createdAt: new Date(),
    totalAmount: 300000,
    paidAmount: 150000,
    balance: 150000,
  });

  // Tentative Booking 4 - In 2 days (afternoon) at Taj Mahal (Hall 1)
  bookings.push({
    id: 'demo-tentative-4',
    venueId: '2',
    primeSpaceId: 'ps-6',
    primeSpaceIds: ['ps-6'],
    date: new Date(day2.getFullYear(), day2.getMonth(), day2.getDate()),
    startTime: '13:00',
    endTime: '17:00',
    guestCount: 180,
    customerName: 'Nadia Khan',
    customerPhone: '+92 333 6665544',
    eventType: 'Baby Shower',
    status: 'tentative',
    createdAt: new Date(),
  });

  // Confirmed Booking 6 - In 4 days at Taj Mahal (Hall 2)
  const day4 = new Date(today);
  day4.setDate(day4.getDate() + 4);
  bookings.push({
    id: 'demo-confirmed-6',
    venueId: '2',
    primeSpaceId: 'ps-7',
    primeSpaceIds: ['ps-7'],
    date: new Date(day4.getFullYear(), day4.getMonth(), day4.getDate()),
    startTime: '20:00',
    endTime: '02:00',
    guestCount: 350,
    customerName: 'Usman Farooq',
    customerPhone: '+92 300 1112233',
    eventType: 'Mehndi',
    status: 'confirmed',
    createdAt: new Date(),
  });

  // Confirmed Booking 7 - In 6 days at Aiwan-e-Akbari (Lawn-M4)
  const day6 = new Date(today);
  day6.setDate(day6.getDate() + 6);
  bookings.push({
    id: 'demo-confirmed-7',
    venueId: '1',
    primeSpaceId: 'ps-4',
    primeSpaceIds: ['ps-4'],
    date: new Date(day6.getFullYear(), day6.getMonth(), day6.getDate()),
    startTime: '16:00',
    endTime: '21:00',
    guestCount: 280,
    customerName: 'Sana Iqbal',
    customerPhone: '+92 321 9990000',
    eventType: 'Bridal Shower',
    status: 'confirmed',
    createdAt: new Date(),
    totalAmount: 200000,
    paidAmount: 200000,
    balance: 0,
  });

  // Tentative Booking 5 - In 6 days (evening) at Taj Mahal (Hall 1)
  bookings.push({
    id: 'demo-tentative-5',
    venueId: '2',
    primeSpaceId: 'ps-6',
    primeSpaceIds: ['ps-6'],
    date: new Date(day6.getFullYear(), day6.getMonth(), day6.getDate()),
    startTime: '19:30',
    endTime: '23:30',
    guestCount: 320,
    customerName: 'Tariq Mahmood',
    customerPhone: '+92 315 3334444',
    eventType: 'Anniversary',
    status: 'tentative',
    createdAt: new Date(),
  });

  // Confirmed Booking 8 - In 8 days at Aiwan-e-Akbari (Marquee 3)
  const day8 = new Date(today);
  day8.setDate(day8.getDate() + 8);
  bookings.push({
    id: 'demo-confirmed-8',
    venueId: '1',
    primeSpaceId: 'ps-3',
    primeSpaceIds: ['ps-3'],
    date: new Date(day8.getFullYear(), day8.getMonth(), day8.getDate()),
    startTime: '18:30',
    endTime: '23:30',
    guestCount: 420,
    customerName: 'Kamran Haider',
    customerPhone: '+92 333 8887777',
    eventType: 'Valima',
    status: 'confirmed',
    createdAt: new Date(),
  });

  // Tentative Booking 6 - In 9 days at Aiwan-e-Akbari (Lawn-Open)
  const day9 = new Date(today);
  day9.setDate(day9.getDate() + 9);
  bookings.push({
    id: 'demo-tentative-6',
    venueId: '1',
    primeSpaceId: 'ps-5',
    primeSpaceIds: ['ps-5'],
    date: new Date(day9.getFullYear(), day9.getMonth(), day9.getDate()),
    startTime: '12:00',
    endTime: '17:00',
    guestCount: 200,
    customerName: 'Rabiya Saeed',
    customerPhone: '+92 300 2223344',
    eventType: 'Dholki',
    status: 'tentative',
    createdAt: new Date(),
  });

  // Confirmed Booking 9 - In 12 days at Taj Mahal (Hall 1)
  const day12 = new Date(today);
  day12.setDate(day12.getDate() + 12);
  bookings.push({
    id: 'demo-confirmed-9',
    venueId: '2',
    primeSpaceId: 'ps-6',
    primeSpaceIds: ['ps-6'],
    date: new Date(day12.getFullYear(), day12.getMonth(), day12.getDate()),
    startTime: '17:00',
    endTime: '22:00',
    guestCount: 380,
    customerName: 'Fahad Sheikh',
    customerPhone: '+92 321 4445566',
    eventType: 'Corporate Dinner',
    status: 'confirmed',
    createdAt: new Date(),
  });

  // Confirmed Booking 10 - In 14 days at Aiwan-e-Akbari (Marquee 2)
  const day14 = new Date(today);
  day14.setDate(day14.getDate() + 14);
  bookings.push({
    id: 'demo-confirmed-10',
    venueId: '1',
    primeSpaceId: 'ps-2',
    primeSpaceIds: ['ps-2'],
    date: new Date(day14.getFullYear(), day14.getMonth(), day14.getDate()),
    startTime: '19:00',
    endTime: '00:00',
    guestCount: 520,
    customerName: 'Hina Rashid',
    customerPhone: '+92 333 1119999',
    eventType: 'Wedding Reception',
    status: 'confirmed',
    createdAt: new Date(),
  });

  // Tentative Booking 7 - In 15 days at Taj Mahal (Hall 2)
  const day15 = new Date(today);
  day15.setDate(day15.getDate() + 15);
  bookings.push({
    id: 'demo-tentative-7',
    venueId: '2',
    primeSpaceId: 'ps-7',
    primeSpaceIds: ['ps-7'],
    date: new Date(day15.getFullYear(), day15.getMonth(), day15.getDate()),
    startTime: '18:00',
    endTime: '22:00',
    guestCount: 240,
    customerName: 'Adeel Bhatti',
    customerPhone: '+92 315 6667788',
    eventType: 'Birthday Party',
    status: 'tentative',
    createdAt: new Date(),
  });

  // Confirmed Booking 11 - In 18 days at Aiwan-e-Akbari (Lawn-M4)
  const day18 = new Date(today);
  day18.setDate(day18.getDate() + 18);
  bookings.push({
    id: 'demo-confirmed-11',
    venueId: '1',
    primeSpaceId: 'ps-4',
    primeSpaceIds: ['ps-4'],
    date: new Date(day18.getFullYear(), day18.getMonth(), day18.getDate()),
    startTime: '15:00',
    endTime: '20:00',
    guestCount: 310,
    customerName: 'Mariam Saleem',
    customerPhone: '+92 300 3332211',
    eventType: 'Engagement',
    status: 'confirmed',
    createdAt: new Date(),
  });

  // Tentative Booking 8 - In 20 days at Aiwan-e-Akbari (Marquee 1)
  const day20 = new Date(today);
  day20.setDate(day20.getDate() + 20);
  bookings.push({
    id: 'demo-tentative-8',
    venueId: '1',
    primeSpaceId: 'ps-1',
    primeSpaceIds: ['ps-1'],
    date: new Date(day20.getFullYear(), day20.getMonth(), day20.getDate()),
    startTime: '18:00',
    endTime: '23:00',
    guestCount: 550,
    customerName: 'Waseem Akram',
    customerPhone: '+92 321 7776655',
    eventType: 'Nikah',
    status: 'tentative',
    createdAt: new Date(),
  });

  // Confirmed Booking 12 - In 25 days at Taj Mahal (Hall 1)
  const day25 = new Date(today);
  day25.setDate(day25.getDate() + 25);
  bookings.push({
    id: 'demo-confirmed-12',
    venueId: '2',
    primeSpaceId: 'ps-6',
    primeSpaceIds: ['ps-6'],
    date: new Date(day25.getFullYear(), day25.getMonth(), day25.getDate()),
    startTime: '19:30',
    endTime: '01:30',
    guestCount: 440,
    customerName: 'Salman Qureshi',
    customerPhone: '+92 333 9998877',
    eventType: 'Barat',
    status: 'confirmed',
    createdAt: new Date(),
  });

  return bookings;
};

// Reservations must come from the backend. Keep this legacy export empty so screens
// never fall back to demo reservations when real data is unavailable.
export const bookings: Booking[] = [];
