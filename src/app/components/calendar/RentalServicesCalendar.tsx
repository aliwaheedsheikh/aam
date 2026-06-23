import { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Tent, Package as PackageIcon } from 'lucide-react';
import { ServiceBooking } from './service-types';
import { Button } from '../ui/button';
import { RentalServicesDialog } from './RentalServicesDialog';

interface RentalServicesCalendarProps {
  bookings: ServiceBooking[];
  onBookingsChange: (bookings: ServiceBooking[]) => void;
}

export function RentalServicesCalendar({ bookings, onBookingsChange }: RentalServicesCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

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

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Calendar Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Tent className="size-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Rental Services Calendar</h2>
              <p className="text-sm text-gray-600">Equipment & inventory availability tracking</p>
            </div>
          </div>

          <Button
            onClick={() => {
              setSelectedDate(new Date());
              setShowBookingDialog(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="size-4 mr-2" />
            New Rental Booking
          </Button>
        </div>

        {/* View Toggle & Month Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Calendar View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List View
            </button>
          </div>

          <div className="flex items-center gap-4">
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
        </div>
      </div>

      {/* Calendar Grid */}
      {viewMode === 'calendar' && (
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
              const today = isToday(day);
              const hasBookings = dayBookings.length > 0;

              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={`
                    aspect-square border-2 rounded-lg p-2 hover:shadow-md transition-all
                    ${hasBookings ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}
                    ${today ? 'ring-2 ring-green-500 ring-offset-2' : ''}
                    hover:scale-105 active:scale-95
                  `}
                >
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold ${today ? 'text-green-700' : 'text-gray-700'}`}>
                        {day}
                      </span>
                      {dayBookings.length > 0 && (
                        <span className="text-xs font-bold text-green-700">
                          {dayBookings.length}
                        </span>
                      )}
                    </div>

                    {/* Rental Indicators */}
                    <div className="flex-1 overflow-hidden space-y-1">
                      {dayBookings.slice(0, 3).map((booking) => (
                        <div
                          key={booking.id}
                          className={`text-xs p-1 rounded truncate ${
                            booking.status === 'confirmed' 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          <div className="font-medium truncate flex items-center gap-1">
                            <PackageIcon className="size-3" />
                            {booking.customerName}
                          </div>
                        </div>
                      ))}
                      {dayBookings.length > 3 && (
                        <div className="text-xs text-gray-500 font-medium">
                          +{dayBookings.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-3">
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <Tent className="size-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No rental bookings found</p>
                <Button
                  onClick={() => {
                    setSelectedDate(new Date());
                    setShowBookingDialog(true);
                  }}
                  className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="size-4 mr-2" />
                  Create First Rental
                </Button>
              </div>
            ) : (
              bookings
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((booking) => {
                  const bookingDate = typeof booking.date === 'string' ? new Date(booking.date) : booking.date;
                  return (
                    <div
                      key={booking.id}
                      className="border-2 border-gray-200 rounded-lg p-4 hover:border-green-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`px-2 py-1 rounded text-xs font-semibold ${
                              booking.status === 'confirmed' 
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {booking.status.toUpperCase()}
                            </div>
                            <h3 className="font-bold text-gray-900">{booking.customerName}</h3>
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <CalendarIcon className="size-4" />
                              {bookingDate.toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <PackageIcon className="size-4" />
                              Rental Service
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Booking Dialog */}
      <RentalServicesDialog
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
