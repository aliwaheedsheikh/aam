import { Booking } from './types-v2';
import { getVenueById } from './data-v2';
import { Input } from '../ui/input';
import { Calendar } from 'lucide-react';
import { StatusFilters } from './CalendarHeaderV2';

interface MonthViewV2Props {
  venueId: string;
  currentDate: Date;
  onDateClick: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  statusFilter: StatusFilters;
  bookings?: Booking[];
  mode?: 'confirmed' | 'tentative';
  showHeader?: boolean;
}

export function MonthViewV2({
  venueId,
  currentDate,
  onDateClick,
  onMonthChange,
  statusFilter: _statusFilter,
  bookings: externalBookings,
  mode = 'confirmed',
  showHeader = true,
}: MonthViewV2Props) {
  const venue = getVenueById(venueId);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  const bookingsToUse = externalBookings ?? [];

  // Get bookings for a specific date
  const getDateBookings = (day: number): Booking[] => {
    const date = new Date(year, month, day);
    const dayBookings = bookingsToUse.filter(
      (b) => {
        // Ensure date is a Date object
        const bookingDate = typeof b.date === 'string' ? new Date(b.date) : b.date;
        return (
          b.venueId === venueId &&
          bookingDate.getDate() === date.getDate() &&
          bookingDate.getMonth() === date.getMonth() &&
          bookingDate.getFullYear() === date.getFullYear()
        );
      }
    );
    
    if (mode === 'tentative') {
      return dayBookings.filter((booking) => booking.status === 'tentative');
    }

    return dayBookings.filter((booking) => booking.status === 'confirmed' || booking.status === 'completed');
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  // Handle month picker change
  const handleMonthPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value; // Format: "YYYY-MM"
    if (value) {
      const [newYear, newMonth] = value.split('-').map(Number);
      const newDate = new Date(newYear, newMonth - 1, 1);
      onMonthChange(newDate);
    }
  };

  // Handle date picker change
  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value; // Format: "YYYY-MM-DD"
    if (value) {
      const newDate = new Date(value);
      onMonthChange(newDate);
    }
  };

  // Format current date for input value (YYYY-MM)
  const inputValue = `${year}-${String(month + 1).padStart(2, '0')}`;

  // Format current date for full date picker (YYYY-MM-DD)
  const dateValue = `${year}-${String(month + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

  if (!venue) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <p className="text-gray-500">Please select a venue</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-white overflow-hidden flex flex-col">
      {showHeader && (
        <div className="p-3 border-b flex-shrink-0 bg-white">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg">
              {venue.name} - {firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            
            {/* Date Pickers */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-gray-500" />
                <span className="text-sm text-gray-600">Jump to:</span>
                <Input
                  type="date"
                  value={dateValue}
                  onChange={handleDatePickerChange}
                  className="w-[160px] h-8 text-sm"
                />
              </div>
              <div className="w-px h-6 bg-gray-300" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Month:</span>
                <Input
                  type="month"
                  value={inputValue}
                  onChange={handleMonthPickerChange}
                  className="w-[160px] h-8 text-sm"
                />
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600">{venue.location}</p>
        </div>
      )}

      {/* Calendar Grid Container */}
      <div className="flex-1 overflow-hidden flex flex-col p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2 flex-shrink-0">
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
            <div key={day} className="text-center text-gray-700 py-1.5 text-sm font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="flex-1 grid grid-cols-7 gap-2 overflow-hidden">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="min-h-0" />;
            }

            const date = new Date(year, month, day);
            const dateBookings = getDateBookings(day);
            const confirmedCount = dateBookings.filter(
              (b) => b.status === 'confirmed' || b.status === 'completed',
            ).length;
            const tentativeCount = dateBookings.filter((b) => b.status === 'tentative').length;
            const overdueCallbacks = dateBookings.filter((booking) => {
              if (!booking.callbackDate || booking.status !== 'tentative') return false;
              const callbackDate =
                typeof booking.callbackDate === 'string' ? new Date(booking.callbackDate) : booking.callbackDate;
              callbackDate.setHours(0, 0, 0, 0);
              return callbackDate < today;
            }).length;

            return (
              <button
                key={day}
                onClick={() => onDateClick(date)}
                className={`min-h-0 border rounded-lg p-2 cursor-pointer hover:shadow-lg hover:border-blue-400 transition-all text-left flex flex-col ${
                  isToday(day) ? 'border-blue-500 border-2 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col h-full min-h-0">
                  <div
                    className={`mb-1.5 ${
                      isToday(day) ? 'font-semibold text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    {day}
                  </div>

                  {dateBookings.length > 0 ? (
                    <div className="flex flex-col gap-1 overflow-hidden">
                      {mode === 'confirmed' && confirmedCount > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="size-2.5 rounded-full bg-green-600 flex-shrink-0" />
                          <span className="text-xs font-medium text-green-700 truncate">
                            {confirmedCount} confirmed
                          </span>
                        </div>
                      )}
                      {mode === 'tentative' && tentativeCount > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="size-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-amber-700 truncate">
                            {tentativeCount} tentative
                          </span>
                        </div>
                      )}
                      {mode === 'tentative' && overdueCallbacks > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="size-2.5 rounded-full bg-rose-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-rose-700 truncate">
                            {overdueCallbacks} overdue
                          </span>
                        </div>
                      )}
                      {dateBookings.length > 1 && (
                        <div className="text-xs text-gray-500">
                          +{dateBookings.length - 1} more
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center min-h-0">
                      <span className="text-xs text-gray-300">—</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-2 bg-gray-50 text-xs text-gray-600 text-center flex-shrink-0">
        {mode === 'tentative'
          ? 'Click on any date to open the detailed tentative day board'
          : 'Click on any date to view the detailed confirmed reservation timeline'}
      </div>
    </div>
  );
}
