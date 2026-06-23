import { useState } from 'react';
import { bookings, venues, findVenueById } from './mock-data';
import { Booking, VenueType } from './types';
import { getStatusColor } from './status-colors';
import { getVenueSlotStatus } from './availability-logic';
import { Button } from '../ui/button';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

interface DayViewTimelineProps {
  currentDate: Date;
  selectedVenue: string;
  venueTypeFilter: VenueType;
  onSlotClick: (date: Date, booking?: Booking) => void;
}

interface TimeBlock {
  booking?: Booking;
  isBlocked: boolean;
  blockedReason?: string;
  hour: number;
}

export function DayViewTimeline({
  currentDate,
  selectedVenue,
  venueTypeFilter,
  onSlotClick,
}: DayViewTimelineProps) {
  const [expandedVenues, setExpandedVenues] = useState<Set<string>>(
    new Set(venues.map((v) => v.id))
  );

  // Generate hours (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Get bookings for current date
  const dayBookings = bookings.filter(
    (b) =>
      b.date.getDate() === currentDate.getDate() &&
      b.date.getMonth() === currentDate.getMonth() &&
      b.date.getFullYear() === currentDate.getFullYear()
  );

  // Convert slot to hours
  const getSlotHours = (slot: 'lunch' | 'dinner') => {
    if (slot === 'lunch') return { start: 12, end: 17 }; // 12:00 PM - 5:00 PM
    return { start: 18, end: 24 }; // 6:00 PM - 12:00 AM
  };

  // Get bookings for a specific venue and hour
  const getHourBlocks = (venueId: string, hour: number): TimeBlock => {
    const venue = findVenueById(venueId);
    if (!venue) return { isBlocked: false, hour };

    // Check for direct booking on this venue
    const directBooking = dayBookings.find((b) => {
      if (b.venueId !== venueId) return false;
      const slotHours = getSlotHours(b.slot);
      return hour >= slotHours.start && hour < slotHours.end;
    });

    if (directBooking) {
      return { booking: directBooking, isBlocked: false, hour };
    }

    // If this is a sub-venue, check if parent is booked
    if (venue.isSubVenue && venue.parentVenueId) {
      const parentBooking = dayBookings.find((b) => {
        if (b.venueId !== venue.parentVenueId || !b.isFullVenue) return false;
        const slotHours = getSlotHours(b.slot);
        return hour >= slotHours.start && hour < slotHours.end;
      });

      if (parentBooking) {
        return {
          isBlocked: true,
          blockedReason: `Full venue booked`,
          hour,
        };
      }
    }

    // If this is a parent venue, check if any sub-venue is booked
    if (!venue.isSubVenue && venue.subVenues) {
      const subVenueBooking = dayBookings.find((b) => {
        if (!venue.subVenues!.some((sv) => sv.id === b.venueId)) return false;
        const slotHours = getSlotHours(b.slot);
        return hour >= slotHours.start && hour < slotHours.end;
      });

      if (subVenueBooking) {
        return {
          isBlocked: true,
          blockedReason: `Sub-venue in use`,
          hour,
        };
      }
    }

    return { isBlocked: false, hour };
  };

  // Toggle venue expansion
  const toggleVenue = (venueId: string) => {
    setExpandedVenues((prev) => {
      const next = new Set(prev);
      if (next.has(venueId)) {
        next.delete(venueId);
      } else {
        next.add(venueId);
      }
      return next;
    });
  };

  // Render time cell
  const renderTimeCell = (venueId: string, hour: number) => {
    const block = getHourBlocks(venueId, hour);
    
    if (block.booking) {
      const slotHours = getSlotHours(block.booking.slot);
      const isStart = hour === slotHours.start;
      const isMiddle = hour > slotHours.start && hour < slotHours.end - 1;
      const isEnd = hour === slotHours.end - 1;
      const status = block.booking.status;

      const bgColor = status === 'confirmed'
        ? 'bg-red-500'
        : status === 'tentative'
        ? 'bg-yellow-400'
        : 'bg-green-500';

      return (
        <div
          className={`h-full border-r border-gray-200 relative cursor-pointer ${bgColor} hover:opacity-80 transition-opacity ${
            isStart ? 'rounded-l' : ''
          } ${isEnd ? 'rounded-r border-r-2 border-r-gray-800' : ''}`}
          onClick={() => onSlotClick(currentDate, block.booking)}
        >
          {isStart && (
            <div className="absolute inset-0 flex flex-col items-start justify-center pl-2 text-white text-xs overflow-hidden">
              <div className="font-semibold truncate w-full">
                {block.booking.customerName}
              </div>
              <div className="text-[10px] opacity-90">
                {block.booking.guestCount} pax
              </div>
            </div>
          )}
          {isMiddle && (
            <div className="absolute inset-0 border-l-0 border-r-0" />
          )}
        </div>
      );
    }

    if (block.isBlocked) {
      return (
        <div className="h-full border-r border-gray-200 bg-gray-200 bg-opacity-50 relative group">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.05)_4px,rgba(0,0,0,0.05)_8px)]" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="text-[9px] text-gray-600 bg-white px-1 py-0.5 rounded shadow-sm whitespace-nowrap">
              {block.blockedReason}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="h-full border-r border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors group relative"
        onClick={() => onSlotClick(currentDate)}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="text-gray-400 text-lg">+</div>
        </div>
      </div>
    );
  };

  // Filter venues based on selected venue and type
  let venuesToShow = venues;
  if (selectedVenue !== 'all') {
    const venue = findVenueById(selectedVenue);
    if (venue) {
      venuesToShow = venue.isSubVenue
        ? [venues.find((v) => v.id === venue.parentVenueId)!].filter(Boolean)
        : [venue];
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Date Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2>
            {currentDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </h2>
          <p className="text-sm text-gray-600 mt-1">Resource Timeline View</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="size-4 text-gray-500" />
          <span className="text-gray-600">24-Hour Format</span>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="size-4 bg-red-500 rounded" />
          <span>Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 bg-yellow-400 rounded" />
          <span>Tentative</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 bg-green-500 rounded" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 bg-gray-300 bg-opacity-40 border border-gray-400 rounded" />
          <span>Blocked</span>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="min-w-max">
            {/* Hour Headers */}
            <div className="flex sticky top-0 z-10 bg-white border-b">
              <div className="w-48 flex-shrink-0 border-r bg-gray-50 p-2">
                <span className="text-sm">Venue</span>
              </div>
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="w-16 flex-shrink-0 border-r bg-gray-50 p-2 text-center"
                >
                  <div className="text-xs text-gray-600">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                </div>
              ))}
            </div>

            {/* Venue Rows */}
            <div className="divide-y">
              {venuesToShow.map((venue) => {
                const isExpanded = expandedVenues.has(venue.id);
                const hasSubVenues = venue.subVenues && venue.subVenues.length > 0;

                return (
                  <div key={venue.id}>
                    {/* Parent Venue Row */}
                    <div className="flex hover:bg-gray-50">
                      {/* Venue Name */}
                      <div className="w-48 flex-shrink-0 border-r p-2 flex items-center gap-2">
                        {hasSubVenues && (
                          <button
                            onClick={() => toggleVenue(venue.id)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            {isExpanded ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </button>
                        )}
                        <div className="flex-1">
                          <div className="text-sm truncate">{venue.name}</div>
                          <div className="text-xs text-gray-500">
                            {venue.capacity} capacity
                          </div>
                        </div>
                      </div>

                      {/* Time Cells */}
                      {hours.map((hour) => (
                        <div key={hour} className="w-16 flex-shrink-0">
                          {renderTimeCell(venue.id, hour)}
                        </div>
                      ))}
                    </div>

                    {/* Sub-Venue Rows */}
                    {isExpanded &&
                      hasSubVenues &&
                      venue.subVenues!.map((subVenue) => {
                        // Skip if filtering by venue type
                        if (venueTypeFilter === 'full') return null;

                        return (
                          <div key={subVenue.id} className="flex hover:bg-gray-50 bg-gray-25">
                            {/* Sub-Venue Name */}
                            <div className="w-48 flex-shrink-0 border-r p-2 pl-12 flex items-center">
                              <div className="flex-1">
                                <div className="text-sm truncate text-gray-700">
                                  {subVenue.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {subVenue.capacity} capacity
                                </div>
                              </div>
                            </div>

                            {/* Time Cells */}
                            {hours.map((hour) => (
                              <div key={hour} className="w-16 flex-shrink-0">
                                {renderTimeCell(subVenue.id, hour)}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {venuesToShow.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <p>No venues match the current filter</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer Info */}
      <div className="border-t p-3 bg-gray-50 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span>
            Lunch: 12:00 PM - 5:00 PM • Dinner: 6:00 PM - 12:00 AM
          </span>
          <span>
            Click on any cell to view details or create booking
          </span>
        </div>
      </div>
    </div>
  );
}