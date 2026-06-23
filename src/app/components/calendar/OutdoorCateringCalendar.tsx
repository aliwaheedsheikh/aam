import { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, MapPin, Users, Clock, UtensilsCrossed } from 'lucide-react';
import { ServiceBooking } from './service-types';
import { Button } from '../ui/button';
import { OutdoorCateringDialog } from './OutdoorCateringDialog';

interface OutdoorCateringCalendarProps {
  bookings: ServiceBooking[];
  onBookingsChange: (bookings: ServiceBooking[]) => void;
}

export function OutdoorCateringCalendar({ bookings, onBookingsChange }: OutdoorCateringCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Generate calendar days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const getDateBookings = (day: number): ServiceBooking[] => {
    const date = new Date(year, month, day);
    return bookings.filter(b => {
      const bookingDate = typeof b.date === 'string' ? new Date(b.date) : b.date;
      return (
        bookingDate.getDate() === date.getDate() &&
        bookingDate.getMonth() === date.getMonth() &&
        bookingDate.getFullYear() === date.getFullYear()
      );
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

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1));
  };

  const handleDateClick = (day: number) => {
    const date = new Date(year, month, day);
    setSelectedDate(date);
    setShowBookingDialog(true);
  };

  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Calculate daily capacity
  const maxEventsPerDay = 5; // Max outdoor catering events we can handle per day
  
  const getDayCapacity = (day: number) => {
    const dayBookings = getDateBookings(day);
    const booked = dayBookings.length;
    const available = maxEventsPerDay - booked;
    const percentage = (booked / maxEventsPerDay) * 100;
    return { booked, available, percentage };
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Calendar Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UtensilsCrossed className="size-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Outdoor Catering Calendar</h2>
              <p className="text-sm text-gray-600">Resource capacity & event timeline</p>
            </div>
          </div>

          <Button
            onClick={() => {
              setSelectedDate(new Date());
              setShowBookingDialog(true);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="size-4 mr-2" />
            New Outdoor Event
          </Button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handlePreviousMonth} className="px-3">
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-4 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">{monthName}</h3>
          </div>
          <Button variant="outline" onClick={handleNextMonth} className="px-3">
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Capacity Legend */}
        <div className="mt-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-gray-700">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-gray-700">Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-gray-700">Full Capacity</span>
          </div>
          <div className="ml-auto text-gray-600">
            Max {maxEventsPerDay} events per day
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-semibold text-gray-700 text-sm pb-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dayBookings = getDateBookings(day);
            const capacity = getDayCapacity(day);
            const today = isToday(day);

            let capacityColor = 'bg-green-50 border-green-200';
            if (capacity.percentage >= 80) capacityColor = 'bg-red-50 border-red-200';
            else if (capacity.percentage >= 50) capacityColor = 'bg-yellow-50 border-yellow-200';

            return (
              <button
                key={day}
                onClick={() => handleDateClick(day)}
                className={`
                  aspect-square border-2 rounded-lg p-2 hover:shadow-md transition-all
                  ${capacityColor}
                  ${today ? 'ring-2 ring-purple-500 ring-offset-2' : ''}
                  hover:scale-105 active:scale-95
                `}
              >
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-semibold ${today ? 'text-purple-700' : 'text-gray-700'}`}>
                      {day}
                    </span>
                    {capacity.booked > 0 && (
                      <span className="text-xs font-bold text-purple-700">
                        {capacity.booked}
                      </span>
                    )}
                  </div>

                  {/* Capacity Bar */}
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full ${
                        capacity.percentage >= 80 ? 'bg-red-500' :
                        capacity.percentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${capacity.percentage}%` }}
                    />
                  </div>

                  {/* Event List */}
                  <div className="flex-1 overflow-hidden space-y-1">
                    {dayBookings.slice(0, 2).map((booking) => (
                      <div
                        key={booking.id}
                        className={`text-xs p-1 rounded truncate ${
                          booking.status === 'confirmed' 
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {booking.customerName}
                      </div>
                    ))}
                    {dayBookings.length > 2 && (
                      <div className="text-xs text-gray-500 font-medium">
                        +{dayBookings.length - 2} more
                      </div>
                    )}
                  </div>

                  {/* Capacity indicator */}
                  <div className="text-xs text-gray-600 mt-1">
                    {capacity.available > 0 ? (
                      <span className="text-green-600 font-medium">{capacity.available} slots</span>
                    ) : (
                      <span className="text-red-600 font-medium">Full</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Booking Dialog */}
      <OutdoorCateringDialog
        open={showBookingDialog}
        onClose={() => {
          setShowBookingDialog(false);
          setSelectedDate(null);
        }}
        onSave={(booking) => {
          onBookingsChange([...bookings, booking]);
          setShowBookingDialog(false);
          setSelectedDate(null);
        }}
        selectedDate={selectedDate || new Date()}
      />
    </div>
  );
}
