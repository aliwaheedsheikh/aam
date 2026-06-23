/**
 * Utility to update venue names in localStorage
 * This can be run once to update existing venue data
 */

export function updateVenueNamesInLocalStorage() {
  const VENUES_KEY = 'venueops_master_venues';
  
  try {
    const stored = localStorage.getItem(VENUES_KEY);
    if (!stored) {
      console.log('No venues found in localStorage');
      return false;
    }

    const venues = JSON.parse(stored);
    
    // Update the venues
    const updatedVenues = venues.map((venue: any) => {
      if (venue.id === '1') {
        return {
          ...venue,
          venueName: 'Aiwan-e-Akbari',
          area: 'Main Ferozepur Road Opposite Metro Station No.23',
          address: 'Main Ferozepur Road Opposite Metro Station No.23',
          landmark: 'Opposite Metro Station No.23',
        };
      }
      if (venue.id === '2') {
        return {
          ...venue,
          venueName: 'Taj Mahal',
          area: '9-Abu Baker Block Garden Town',
          address: '9-Abu Baker Block Garden Town Lahore',
          landmark: 'Garden Town',
          email: 'bookings@tajmahal.pk',
        };
      }
      return venue;
    });

    // Save back to localStorage
    localStorage.setItem(VENUES_KEY, JSON.stringify(updatedVenues));
    
    // Trigger update event
    window.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { key: VENUES_KEY } }));
    
    console.log('Venue names updated successfully!');
    return true;
  } catch (error) {
    console.error('Error updating venue names:', error);
    return false;
  }
}

// You can call this from browser console:
// import { updateVenueNamesInLocalStorage } from '@/app/utils/updateVenueNames';
// updateVenueNamesInLocalStorage();
