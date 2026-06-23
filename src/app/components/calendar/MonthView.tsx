import { bookings, getAllVenues, findVenueById } from './mock-data';
import { Booking, VenueType } from './types';
import { getStatusColor } from './status-colors';
import { getVenueSlotStatus, getDateSlotSummary } from './availability-logic';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '../ui/hover-card';
import { Building2, Split } from 'lucide-react';

interface MonthViewProps {
  currentDate: Date;
  selectedVenue: string;
  venueTypeFilter: VenueType;
  onSlotClick: (date: Date, booking?: Booking) => void;
}

export function MonthView({ 
  currentDate, 
  selectedVenue, 
  venueTypeFilter,
  onSlotClick 
}: MonthViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const calendarDays: (number | null)[] = [];
  
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const getSlotIndicator = (date: Date, slot: 'lunch' | 'dinner') => {
    const summary = getDateSlotSummary(date, slot, bookings);
    
    // Determine overall status based on availability
    if (summary.confirmedBookings > 0) {
      return { status: 'confirmed' as const, count: summary.confirmedBookings };
    } else if (summary.tentativeBookings > 0) {
      return { status: 'tentative' as const, count: summary.tentativeBookings };
    }
    
    // Show available count based on venue type filter
    const availableCount = venueTypeFilter === 'full' 
      ? summary.fullVenuesAvailable 
      : summary.partialVenuesAvailable;
    
    return { status: 'available' as const, count: availableCount };
  };

  const getVenueDetails = (date: Date) => {
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

    return venuesToShow.map((venue) => {
      const lunchStatus = getVenueSlotStatus(venue.id, date, 'lunch', bookings);
      const dinnerStatus = getVenueSlotStatus(venue.id, date, 'dinner', bookings);

      return {
        venue,
        lunch: lunchStatus,
        dinner: dinnerStatus,
      };
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b">
        <h2 className="text-center">
          {firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
      </div>

      <div className="flex-1 p-4">
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 flex-1">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const date = new Date(year, month, day);
            const lunchIndicator = getSlotIndicator(date, 'lunch');
            const dinnerIndicator = getSlotIndicator(date, 'dinner');
            const venueDetails = getVenueDetails(date);

            return (
              <HoverCard key={day} openDelay={200}>
                <HoverCardTrigger asChild>
                  <div
                    className={`aspect-square border rounded-lg p-2 cursor-pointer hover:shadow-md transition-shadow ${
                      isToday(day) ? 'border-blue-500 border-2' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col h-full">
                      <div className={`mb-2 ${isToday(day) ? 'font-semibold text-blue-600' : ''}`}>
                        {day}
                      </div>
                      
                      <div className="flex-1 flex flex-col gap-1">
                        {/* Lunch indicator */}
                        <div className="flex items-center gap-1">
                          <div className={`size-2 rounded-full ${getStatusColor(lunchIndicator.status).dot}`} />
                          <span className="text-xs text-gray-600">L</span>
                          {lunchIndicator.count > 0 && (
                            <span className="text-xs text-gray-500">({lunchIndicator.count})</span>
                          )}
                        </div>
                        
                        {/* Dinner indicator */}
                        <div className="flex items-center gap-1">
                          <div className={`size-2 rounded-full ${getStatusColor(dinnerIndicator.status).dot}`} />
                          <span className="text-xs text-gray-600">D</span>
                          {dinnerIndicator.count > 0 && (
                            <span className="text-xs text-gray-500">({dinnerIndicator.count})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-96" side="right">
                  <div className="space-y-3">
                    <div>
                      <h4 className="mb-2">{date.toLocaleDateString('en-US', { 
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}</h4>
                    </div>
                    
                    {venueDetails.length === 0 ? (
                      <p className="text-sm text-gray-500">No venues match the current filter</p>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {venueDetails.map(({ venue, lunch, dinner }) => (
                          <div key={venue.id} className="border-l-2 border-gray-200 pl-3 py-1">
                            <div className="mb-1 flex items-center gap-2">
                              {venue.isSubVenue ? (
                                <Split className="size-3 text-gray-500" />
                              ) : (
                                <Building2 className="size-3 text-gray-500" />
                              )}
                              <span className="text-sm">{venue.name}</span>
                              <span className="text-xs text-gray-500">({venue.capacity})</span>
                            </div>
                            
                            <div className="space-y-1 text-sm">
                              <div 
                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                onClick={() => onSlotClick(date, lunch.booking)}
                              >
                                <div className={`size-2 rounded-full ${
                                  lunch.status === 'blocked' 
                                    ? 'bg-gray-400' 
                                    : getStatusColor(lunch.status).dot
                                }`} />
                                <span className="text-gray-600">Lunch:</span>
                                {lunch.status === 'blocked' ? (
                                  <span className="text-gray-500 text-xs">{lunch.reason}</span>
                                ) : (
                                  <>
                                    <span className={getStatusColor(lunch.status).text}>
                                      {getStatusColor(lunch.status).label}
                                    </span>
                                    {lunch.booking?.customerName && (
                                      <span className="text-gray-500 text-xs">
                                        ({lunch.booking.customerName})
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                              
                              <div 
                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                onClick={() => onSlotClick(date, dinner.booking)}
                              >
                                <div className={`size-2 rounded-full ${
                                  dinner.status === 'blocked'
                                    ? 'bg-gray-400'
                                    : getStatusColor(dinner.status).dot
                                }`} />
                                <span className="text-gray-600">Dinner:</span>
                                {dinner.status === 'blocked' ? (
                                  <span className="text-gray-500 text-xs">{dinner.reason}</span>
                                ) : (
                                  <>
                                    <span className={getStatusColor(dinner.status).text}>
                                      {getStatusColor(dinner.status).label}
                                    </span>
                                    {dinner.booking?.customerName && (
                                      <span className="text-gray-500 text-xs">
                                        ({dinner.booking.customerName})
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
