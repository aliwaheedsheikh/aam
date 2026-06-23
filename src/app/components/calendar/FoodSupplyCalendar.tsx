import { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Package, Users, TrendingUp } from 'lucide-react';
import { ServiceBooking } from './service-types';
import { Button } from '../ui/button';
import { FoodSupplyDialog } from './FoodSupplyDialog';
import { KITCHENS } from './service-types';

interface FoodSupplyCalendarProps {
  bookings: ServiceBooking[];
  onBookingsChange: (bookings: ServiceBooking[]) => void;
}

export function FoodSupplyCalendar({ bookings, onBookingsChange }: FoodSupplyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedKitchen, setSelectedKitchen] = useState(KITCHENS[0].id);

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

  // Calculate kitchen capacity
  const getKitchenCapacity = (day: number) => {
    const dayBookings = getDateBookings(day);
    const totalGuests = dayBookings.reduce((sum, b) => sum + b.guestCount, 0);
    const maxCapacity = KITCHENS.find(k => k.id === selectedKitchen)?.maxCapacity || 2000;
    const percentage = (totalGuests / maxCapacity) * 100;
    return { totalGuests, maxCapacity, percentage, ordersCount: dayBookings.length };
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Calendar Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Package className="size-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Food Supply Calendar</h2>
              <p className="text-sm text-gray-600">Kitchen capacity & production planning</p>
            </div>
          </div>

          <Button
            onClick={() => {
              setSelectedDate(new Date());
              setShowBookingDialog(true);
            }}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Plus className="size-4 mr-2" />
            New Food Order
          </Button>
        </div>

        {/* Kitchen Selector & Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Kitchen:</label>
            <select
              value={selectedKitchen}
              onChange={(e) => setSelectedKitchen(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium"
            >
              {KITCHENS.map((kitchen) => (
                <option key={kitchen.id} value={kitchen.id}>
                  {kitchen.name} (Max {kitchen.maxCapacity.toLocaleString()} guests)
                </option>
              ))}
            </select>
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

        {/* Capacity Legend */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-gray-700">Low (&lt;50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-gray-700">Moderate (50-80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-gray-700">High (&gt;80%)</span>
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
            const capacity = getKitchenCapacity(day);
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
                  ${today ? 'ring-2 ring-orange-500 ring-offset-2' : ''}
                  hover:scale-105 active:scale-95
                `}
              >
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-semibold ${today ? 'text-orange-700' : 'text-gray-700'}`}>
                      {day}
                    </span>
                    {capacity.ordersCount > 0 && (
                      <span className="text-xs font-bold text-orange-700">
                        {capacity.ordersCount}
                      </span>
                    )}
                  </div>

                  {/* Guest Count */}
                  {capacity.totalGuests > 0 && (
                    <div className="flex items-center gap-1 mb-1 text-xs text-gray-700">
                      <Users className="size-3" />
                      <span className="font-semibold">{capacity.totalGuests.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Capacity Bar */}
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full ${
                        capacity.percentage >= 80 ? 'bg-red-500' :
                        capacity.percentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(capacity.percentage, 100)}%` }}
                    />
                  </div>

                  {/* Order List */}
                  <div className="flex-1 overflow-hidden space-y-1">
                    {dayBookings.slice(0, 2).map((booking) => (
                      <div
                        key={booking.id}
                        className={`text-xs p-1 rounded truncate ${
                          booking.status === 'confirmed' 
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        <div className="font-medium truncate">{booking.customerName}</div>
                      </div>
                    ))}
                    {dayBookings.length > 2 && (
                      <div className="text-xs text-gray-500 font-medium">
                        +{dayBookings.length - 2} more
                      </div>
                    )}
                  </div>

                  {/* Capacity percentage */}
                  <div className="text-xs text-gray-600 mt-1 font-medium">
                    {capacity.percentage > 0 ? `${Math.round(capacity.percentage)}%` : '-'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Booking Dialog */}
      <FoodSupplyDialog
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
