// Mock data for the Event Availability Calendar with hierarchical venues
import { Venue, Booking } from './types';

// Hierarchical venue structure
export const venues: Venue[] = [
  // Main Venues with sub-venues
  {
    id: 'M1',
    name: 'Marquee 1 - Grand Palace',
    capacity: 1000,
    isSubVenue: false,
    subVenues: [
      {
        id: 'M1-A',
        name: 'Marquee 1-A (North Wing)',
        capacity: 500,
        isSubVenue: true,
        parentVenueId: 'M1',
      },
      {
        id: 'M1-B',
        name: 'Marquee 1-B (South Wing)',
        capacity: 500,
        isSubVenue: true,
        parentVenueId: 'M1',
      },
    ],
  },
  {
    id: 'M2',
    name: 'Marquee 2 - Crystal Hall',
    capacity: 800,
    isSubVenue: false,
    subVenues: [
      {
        id: 'M2-A',
        name: 'Marquee 2-A (East Section)',
        capacity: 400,
        isSubVenue: true,
        parentVenueId: 'M2',
      },
      {
        id: 'M2-B',
        name: 'Marquee 2-B (West Section)',
        capacity: 400,
        isSubVenue: true,
        parentVenueId: 'M2',
      },
    ],
  },
  {
    id: 'M3',
    name: 'Marquee 3 - Royal Garden',
    capacity: 600,
    isSubVenue: false,
    subVenues: [
      {
        id: 'M3-A',
        name: 'Marquee 3-A (Garden Terrace)',
        capacity: 300,
        isSubVenue: true,
        parentVenueId: 'M3',
      },
      {
        id: 'M3-B',
        name: 'Marquee 3-B (Lawn Area)',
        capacity: 300,
        isSubVenue: true,
        parentVenueId: 'M3',
      },
    ],
  },
  {
    id: 'G1',
    name: 'Aiwan-e-Akbari',
    address: 'Main Ferozepur Road Opposite Metro Station No.23',
    capacity: 1200,
    isSubVenue: false,
    subVenues: [
      {
        id: 'G1-A',
        name: 'Aiwan-e-Akbari - Hall A (Main Chamber)',
        capacity: 700,
        isSubVenue: true,
        parentVenueId: 'G1',
      },
      {
        id: 'G1-B',
        name: 'Aiwan-e-Akbari - Hall B (Banquet Wing)',
        capacity: 500,
        isSubVenue: true,
        parentVenueId: 'G1',
      },
    ],
  },
  {
    id: 'G2',
    name: 'Taj Mahal',
    address: '9-Abu Baker Block Garden Town Lahore',
    capacity: 1500,
    isSubVenue: false,
    subVenues: [
      {
        id: 'G2-A',
        name: 'Taj Mahal - Hall A (Ballroom)',
        capacity: 900,
        isSubVenue: true,
        parentVenueId: 'G2',
      },
      {
        id: 'G2-B',
        name: 'Taj Mahal - Hall B (Conference Hall)',
        capacity: 600,
        isSubVenue: true,
        parentVenueId: 'G2',
      },
    ],
  },
  {
    id: 'G3',
    name: 'Grand Hall 3 - Pearl Pavilion',
    capacity: 900,
    isSubVenue: false,
    subVenues: [
      {
        id: 'G3-A',
        name: 'Grand Hall 3-A (Crystal Room)',
        capacity: 450,
        isSubVenue: true,
        parentVenueId: 'G3',
      },
      {
        id: 'G3-B',
        name: 'Grand Hall 3-B (Emerald Room)',
        capacity: 450,
        isSubVenue: true,
        parentVenueId: 'G3',
      },
    ],
  },
];

// Helper to get all venues including sub-venues in flat list
export const getAllVenues = (): Venue[] => {
  const allVenues: Venue[] = [];
  venues.forEach((venue) => {
    allVenues.push(venue);
    if (venue.subVenues) {
      allVenues.push(...venue.subVenues);
    }
  });
  return allVenues;
};

// Helper to find venue by ID
export const findVenueById = (id: string): Venue | undefined => {
  return getAllVenues().find((v) => v.id === id);
};

// Helper to get parent venue
export const getParentVenue = (subVenueId: string): Venue | undefined => {
  const subVenue = findVenueById(subVenueId);
  if (subVenue?.parentVenueId) {
    return findVenueById(subVenue.parentVenueId);
  }
  return undefined;
};

// Generate bookings for demonstration
export const generateBookings = (): Booking[] => {
  const bookings: Booking[] = [];
  const today = new Date();
  
  // Example Scenario 1: Full Venue Booking (M1 fully booked - Lunch)
  bookings.push({
    id: 'b1',
    date: new Date(today.getFullYear(), today.getMonth(), 15),
    venueId: 'M1',
    slot: 'lunch',
    status: 'confirmed',
    customerName: 'Ahmed Khan',
    guestCount: 950,
    isFullVenue: true,
  });
  
  // M1 sub-venues available for dinner on same day
  bookings.push({
    id: 'b1b',
    date: new Date(today.getFullYear(), today.getMonth(), 15),
    venueId: 'M1-A',
    slot: 'dinner',
    status: 'confirmed',
    customerName: 'Zara Malik',
    guestCount: 480,
    isFullVenue: false,
  });
  
  // Example Scenario 2: Sub-Venue Booking (M2-A booked, M2-B available)
  bookings.push({
    id: 'b2',
    date: new Date(today.getFullYear(), today.getMonth(), 18),
    venueId: 'M2-A',
    slot: 'lunch',
    status: 'confirmed',
    customerName: 'Sara Malik',
    guestCount: 380,
    isFullVenue: false,
  });
  
  // M2-B also booked dinner on same day
  bookings.push({
    id: 'b2b',
    date: new Date(today.getFullYear(), today.getMonth(), 18),
    venueId: 'M2-B',
    slot: 'dinner',
    status: 'tentative',
    customerName: 'Imran Shah',
    guestCount: 350,
    callbackDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
    isFullVenue: false,
  });
  
  // Example Scenario 3: Multiple bookings same day (G1-A booked lunch, G1-B booked dinner)
  bookings.push({
    id: 'b3',
    date: new Date(today.getFullYear(), today.getMonth(), 22),
    venueId: 'G1-A',
    slot: 'lunch',
    status: 'confirmed',
    customerName: 'Hassan Ali',
    guestCount: 650,
    isFullVenue: false,
  });
  
  bookings.push({
    id: 'b3b',
    date: new Date(today.getFullYear(), today.getMonth(), 22),
    venueId: 'G1-B',
    slot: 'dinner',
    status: 'confirmed',
    customerName: 'Nadia Ahmed',
    guestCount: 490,
    isFullVenue: false,
  });
  
  // Full venue booking for G2 - both lunch and dinner
  bookings.push({
    id: 'b4',
    date: new Date(today.getFullYear(), today.getMonth(), 25),
    venueId: 'G2',
    slot: 'lunch',
    status: 'confirmed',
    customerName: 'Fatima Sheikh',
    guestCount: 1400,
    isFullVenue: true,
  });
  
  bookings.push({
    id: 'b4b',
    date: new Date(today.getFullYear(), today.getMonth(), 25),
    venueId: 'G2',
    slot: 'dinner',
    status: 'confirmed',
    customerName: 'Fatima Sheikh',
    guestCount: 1400,
    isFullVenue: true,
  });
  
  // Today's bookings for timeline demonstration
  // M3-A lunch
  bookings.push({
    id: 'today1',
    date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    venueId: 'M3-A',
    slot: 'lunch',
    status: 'confirmed',
    customerName: 'Kamran Hussain',
    guestCount: 280,
    isFullVenue: false,
  });
  
  // M3 full venue dinner
  bookings.push({
    id: 'today2',
    date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    venueId: 'M3',
    slot: 'dinner',
    status: 'tentative',
    customerName: 'Ayesha Tariq',
    guestCount: 550,
    callbackDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
    isFullVenue: true,
  });
  
  // G3-A and G3-B both booked on different slots same day
  bookings.push({
    id: 'today3',
    date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    venueId: 'G3-A',
    slot: 'lunch',
    status: 'confirmed',
    customerName: 'Bilal Ahmad',
    guestCount: 420,
    isFullVenue: false,
  });
  
  bookings.push({
    id: 'today4',
    date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    venueId: 'G3-B',
    slot: 'lunch',
    status: 'confirmed',
    customerName: 'Sana Riaz',
    guestCount: 380,
    isFullVenue: false,
  });
  
  // Tentative sub-venue booking
  bookings.push({
    id: 'b5',
    date: new Date(today.getFullYear(), today.getMonth(), 12),
    venueId: 'M3-B',
    slot: 'lunch',
    status: 'tentative',
    customerName: 'Ali Raza',
    guestCount: 280,
    callbackDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
    isFullVenue: false,
  });
  
  // Tentative full venue booking
  bookings.push({
    id: 'b6',
    date: new Date(today.getFullYear(), today.getMonth(), 20),
    venueId: 'G3',
    slot: 'lunch',
    status: 'tentative',
    customerName: 'Ayesha Tariq',
    guestCount: 850,
    callbackDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
    isFullVenue: true,
  });
  
  // Multiple sub-venue bookings on same day
  bookings.push({
    id: 'b7',
    date: new Date(today.getFullYear(), today.getMonth(), 28),
    venueId: 'G1-B',
    slot: 'lunch',
    status: 'confirmed',
    customerName: 'Bilal Ahmad',
    guestCount: 480,
    isFullVenue: false,
  });

  // Next month bookings
  bookings.push({
    id: 'b8',
    date: new Date(today.getFullYear(), today.getMonth() + 1, 5),
    venueId: 'M1-A',
    slot: 'dinner',
    status: 'confirmed',
    customerName: 'Zainab Hussain',
    guestCount: 450,
    isFullVenue: false,
  });

  bookings.push({
    id: 'b9',
    date: new Date(today.getFullYear(), today.getMonth(), 22),
    venueId: 'M2-B',
    slot: 'dinner',
    status: 'tentative',
    customerName: 'Usman Farooq',
    guestCount: 350,
    callbackDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),
    isFullVenue: false,
  });
  
  return bookings;
};

export const bookings = generateBookings();