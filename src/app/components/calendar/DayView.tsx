import { bookings, getAllVenues, findVenueById } from './mock-data';
import { Booking, VenueType } from './types';
import { getStatusColor } from './status-colors';
import { getVenueSlotStatus } from './availability-logic';
import { Button } from '../ui/button';
import { Building2, Split } from 'lucide-react';

interface DayViewProps {
  currentDate: Date;
  selectedVenue: string;
  venueTypeFilter: VenueType;
  onSlotClick: (date: Date, booking?: Booking) => void;
}

export function DayView({ currentDate, selectedVenue, venueTypeFilter, onSlotClick }: DayViewProps) {
  let venuesToShow = getAllVenues();

  // Filter by selected venue
  if (selectedVenue !== 'all') {
    const venue = findVenueById(selectedVenue);
    if (venue) {
      if (venue.isSubVenue) {
        venuesToShow = [venue];
      } else {
        venuesToShow = [venue, ...(venue.subVenues || [])];
      }
    }
  }

  // Filter by venue type
  if (venueTypeFilter === 'full') {
    venuesToShow = venuesToShow.filter(v => !v.isSubVenue);
  } else {
    venuesToShow = venuesToShow.filter(v => v.isSubVenue);
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Date Header */}
      <div className="p-4 border-b">
        <h2 className="text-center">
          {currentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </h2>
      </div>

      {/* Grid View */}
      <div className="flex-1 overflow-auto p-4">
        <div className="border rounded-lg overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-6 gap-px bg-gray-200">
            <div className="bg-gray-50 p-3">
              <span>Venue</span>
            </div>
            <div className="bg-gray-50 p-3">
              <span>Type</span>
            </div>
            <div className="bg-gray-50 p-3 text-center">
              <span>Lunch Slot</span>
            </div>
            <div className="bg-gray-50 p-3 text-center">
              <span>Dinner Slot</span>
            </div>
            <div className="bg-gray-50 p-3 text-center">
              <span>Capacity</span>
            </div>
            <div className="bg-gray-50 p-3 text-center">
              <span>Actions</span>
            </div>
          </div>

          {/* Data Rows */}
          <div className="divide-y divide-gray-200">
            {venuesToShow.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No venues match the current filter
              </div>
            ) : (
              venuesToShow.map((venue) => {
                const lunchSlot = getVenueSlotStatus(venue.id, currentDate, 'lunch', bookings);
                const dinnerSlot = getVenueSlotStatus(venue.id, currentDate, 'dinner', bookings);

                return (
                  <div key={venue.id} className="grid grid-cols-6 gap-px bg-gray-100">
                    {/* Venue Name */}
                    <div className="bg-white p-3">
                      <div className="flex items-center gap-2">
                        {venue.isSubVenue ? (
                          <Split className="size-4 text-gray-400" />
                        ) : (
                          <Building2 className="size-4 text-gray-400" />
                        )}
                        <span>{venue.name}</span>
                      </div>
                    </div>

                    {/* Type */}
                    <div className="bg-white p-3">
                      <span className="text-sm text-gray-600">
                        {venue.isSubVenue ? 'Partial' : 'Full'}
                      </span>
                    </div>

                    {/* Lunch Slot */}
                    <div className="bg-white p-3">
                      <button
                        onClick={() => onSlotClick(currentDate, lunchSlot.booking)}
                        className={`w-full px-3 py-2 rounded-md border relative overflow-hidden ${
                          lunchSlot.status === 'blocked'
                            ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                            : `${getStatusColor(lunchSlot.status).border} ${getStatusColor(lunchSlot.status).bg} hover:opacity-80`
                        } transition-opacity`}
                        disabled={lunchSlot.status === 'blocked'}
                      >
                        {/* Striped pattern for blocked slots */}
                        {lunchSlot.status === 'blocked' && (
                          <div className="absolute inset-0 opacity-30" style={{
                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #d1d5db 10px, #d1d5db 20px)'
                          }} />
                        )}
                        <div className="relative z-10">
                          <div className="flex items-center justify-center gap-2">
                            {lunchSlot.status === 'blocked' ? (
                              <span className="text-sm text-gray-500 font-medium">N/A</span>
                            ) : (
                              <>
                                <div className={`size-2 rounded-full ${getStatusColor(lunchSlot.status).dot}`} />
                                <span className={`text-sm ${getStatusColor(lunchSlot.status).text}`}>
                                  {getStatusColor(lunchSlot.status).label}
                                </span>
                              </>
                            )}
                          </div>
                          {lunchSlot.booking?.customerName && lunchSlot.status !== 'blocked' && (
                            <div className="text-xs text-gray-600 mt-1 font-medium">
                              {lunchSlot.booking.customerName}
                            </div>
                          )}
                          {lunchSlot.booking?.guestCount && lunchSlot.status !== 'blocked' && (
                            <div className="text-xs text-gray-600 mt-1">
                              {lunchSlot.booking.guestCount} guests
                            </div>
                          )}
                          {lunchSlot.status === 'blocked' && lunchSlot.reason && (
                            <div className="text-xs text-gray-500 mt-1">
                              {lunchSlot.reason}
                            </div>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Dinner Slot */}
                    <div className="bg-white p-3">
                      <button
                        onClick={() => onSlotClick(currentDate, dinnerSlot.booking)}
                        className={`w-full px-3 py-2 rounded-md border relative overflow-hidden ${
                          dinnerSlot.status === 'blocked'
                            ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                            : `${getStatusColor(dinnerSlot.status).border} ${getStatusColor(dinnerSlot.status).bg} hover:opacity-80`
                        } transition-opacity`}
                        disabled={dinnerSlot.status === 'blocked'}
                      >
                        {/* Striped pattern for blocked slots */}
                        {dinnerSlot.status === 'blocked' && (
                          <div className="absolute inset-0 opacity-30" style={{
                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #d1d5db 10px, #d1d5db 20px)'
                          }} />
                        )}
                        <div className="relative z-10">
                          <div className="flex items-center justify-center gap-2">
                            {dinnerSlot.status === 'blocked' ? (
                              <span className="text-sm text-gray-500 font-medium">N/A</span>
                            ) : (
                              <>
                                <div className={`size-2 rounded-full ${getStatusColor(dinnerSlot.status).dot}`} />
                                <span className={`text-sm ${getStatusColor(dinnerSlot.status).text}`}>
                                  {getStatusColor(dinnerSlot.status).label}
                                </span>
                              </>
                            )}
                          </div>
                          {dinnerSlot.booking?.customerName && dinnerSlot.status !== 'blocked' && (
                            <div className="text-xs text-gray-600 mt-1 font-medium">
                              {dinnerSlot.booking.customerName}
                            </div>
                          )}
                          {dinnerSlot.booking?.guestCount && dinnerSlot.status !== 'blocked' && (
                            <div className="text-xs text-gray-600 mt-1">
                              {dinnerSlot.booking.guestCount} guests
                            </div>
                          )}
                          {dinnerSlot.status === 'blocked' && dinnerSlot.reason && (
                            <div className="text-xs text-gray-500 mt-1">
                              {dinnerSlot.reason}
                            </div>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Capacity */}
                    <div className="bg-white p-3 text-center">
                      <span className="text-gray-700">{venue.capacity}</span>
                    </div>

                    {/* Actions */}
                    <div className="bg-white p-3 text-center">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}