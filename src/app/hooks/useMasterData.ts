import { useState, useEffect } from 'react';
import { venueDataStore, primeSpaceDataStore, subSpaceDataStore } from '../lib/masterDataStore';
import { Venue, PrimeSpace } from '../components/calendar/types-v2';

// Historical demo data kept as reference only. Master data should come from
// user-entered setup records in a fresh system.
const defaultVenues: any[] = [
  {
    id: '1',
    venueName: 'Aiwan-e-Akbari Grand Banquet',
    venueCode: 'VEN001',
    city: 'Lahore',
    area: 'Gulberg III',
    isActive: true,
  },
];

const defaultPrimeSpaces: any[] = [
  {
    id: '1',
    venueId: '1',
    spaceName: 'Grand Hall',
    spaceCode: 'VEN001-PS001',
    defaultSeatingCapacity: 800,
    allowSubSpaces: true,
    isActive: true,
  },
];

const defaultSubSpaces: any[] = [
  {
    id: '1',
    primeSpaceId: '1',
    subSpaceName: 'Grand Hall - Section A',
    subSpaceCode: 'VEN001-PS001-SS001',
    customCapacity: 400,
    isActive: true,
  },
];

export function useMasterData() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [primeSpaces, setPrimeSpaces] = useState<PrimeSpace[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Function to refresh data
  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    loadData();
    const handleStorageChange = () => {
      loadData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('masterDataUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('masterDataUpdated', handleStorageChange);
    };
  }, [refreshKey]);

  const loadData = () => {
    // Load venues
    const masterVenues = venueDataStore.getVenues([]);
    const transformedVenues: Venue[] = masterVenues
      .filter((v: any) => v.isActive !== false)
      .map((v: any) => ({
        id: v.id,
        name: v.venueName,
        location: `${v.area}, ${v.city}`,
      }));
    setVenues(transformedVenues);

    // Load prime spaces and sub spaces
    const masterPrimeSpaces = primeSpaceDataStore.getPrimeSpaces([]);
    const masterSubSpaces = subSpaceDataStore.getSubSpaces([]);

    const transformedPrimeSpaces: PrimeSpace[] = masterPrimeSpaces
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

    setPrimeSpaces(transformedPrimeSpaces);
  };

  // Helper functions
  const getVenueById = (id: string): Venue | undefined => {
    return venues.find((v) => v.id === id);
  };

  const getPrimeSpacesByVenue = (venueId: string): PrimeSpace[] => {
    return primeSpaces.filter((ps) => ps.venueId === venueId);
  };

  const getPrimeSpaceById = (id: string): PrimeSpace | undefined => {
    return primeSpaces.find((ps) => ps.id === id);
  };

  const getSubSpaceById = (id: string) => {
    for (const primeSpace of primeSpaces) {
      const subSpace = primeSpace.subSpaces.find((ss) => ss.id === id);
      if (subSpace) return subSpace;
    }
    return undefined;
  };

  return {
    venues,
    primeSpaces,
    getVenueById,
    getPrimeSpacesByVenue,
    getPrimeSpaceById,
    getSubSpaceById,
    refresh,
  };
}
