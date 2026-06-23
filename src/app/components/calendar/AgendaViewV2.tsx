import { useState } from 'react';
import { Booking } from './types-v2';
import { getVenueById } from './data-v2';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Calendar, Phone, Users } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { StatusFilters } from './CalendarHeaderV2';
import { filterBookingsByView } from './view-filter';
import { getStatusColor } from './status-colors';
import { formatBookingSpaceAssignments, getBookingSpaceAssignments } from '../../lib/bookingSpaces';

interface AgendaViewV2Props {
  venueId: string;
  currentDate: Date;
  onBookingClick: (booking: Booking) => void;
  onDateChange: (date: Date) => void;
  statusFilter: StatusFilters;
  bookings?: Booking[];
}

export function AgendaViewV2({
  venueId,
  currentDate,
  onBookingClick,
  onDateChange,
  statusFilter,
  bookings: externalBookings,
}: AgendaViewV2Props) {
  const venue = getVenueById(venueId);

  const bookingsToUse = externalBookings ?? [];

  // Filters
  const [dateFrom, setDateFrom] = useState(
    new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      .toISOString()
      .split('T')[0]
  );
  const [dateTo, setDateTo] = useState(
    new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0]
  );

  // Handle jump to date
  const handleJumpToDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      const newDate = new Date(value);
      onDateChange(newDate);
    }
  };

  // Format current date for input value (YYYY-MM-DD)
  const jumpToDateValue = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1
  ).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

  // Filter bookings
  const filteredBookings = bookingsToUse
    .filter((b) => {
      // Venue filter
      if (b.venueId !== venueId) return false;

      // Ensure date is a Date object
      const dateObj = typeof b.date === 'string' ? new Date(b.date) : b.date;
      
      // Date range filter (inclusive of both start and end dates)
      const bookingDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      
      // Set times to midnight for accurate date-only comparison
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999); // Include entire end day
      
      if (bookingDate < from || bookingDate > to) return false;

      return true;
    })
    .sort((a, b) => {
      const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date;
      const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date;
      return dateA.getTime() - dateB.getTime();
    });

  // Confirmed calendar stays focused on real bookings.
  const displayedBookings = filterBookingsByView(filteredBookings, statusFilter).filter(
    (booking) => booking.status === 'confirmed' || booking.status === 'completed',
  );

  // Get space name
  const getSpaceName = (booking: Booking): string => {
    const labels = formatBookingSpaceAssignments(booking);
    return labels.length > 0 ? labels.join(' | ') : 'Unknown';
  };

  const getSpaceType = (booking: Booking): string => {
    const assignments = getBookingSpaceAssignments(booking);
    if (assignments.length > 1) return 'Multi Space';
    return assignments[0]?.assignmentType === 'SUB_ONLY' ? 'Sub Space' : 'Prime Space';
  };

  // Helper to convert 24h to 12h format
  const formatTime12h = (time: string | undefined): string => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  if (!venue) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <p className="text-gray-500">Please select a venue</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2>{venue.name} - Agenda View</h2>
            <p className="text-sm text-gray-600 mt-1">{venue.location}</p>
          </div>
          
          {/* Jump to Date Picker */}
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-gray-500" />
            <label htmlFor="jump-to-date" className="text-sm text-gray-600">
              Jump to Date:
            </label>
            <Input
              id="jump-to-date"
              type="date"
              value={jumpToDateValue}
              onChange={handleJumpToDate}
              className="w-[160px]"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b space-y-4 bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="date-from" className="text-sm whitespace-nowrap">
              From
            </label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="date-to" className="text-sm whitespace-nowrap">
              To
            </label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>

          <Button variant="outline" size="sm" className="ml-auto">
            Export to CSV
          </Button>
        </div>

        <div className="text-sm text-gray-600">
          Showing {displayedBookings.length} booking(s)
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Space</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Guests</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Callback</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                  No bookings found for the selected filters
                </TableCell>
              </TableRow>
            ) : (
              displayedBookings.map((booking) => (
                <TableRow
                  key={booking.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => onBookingClick(booking)}
                >
                  <TableCell>
                    {(() => {
                      const dateObj = typeof booking.date === 'string' ? new Date(booking.date) : booking.date;
                      return dateObj.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      });
                    })()}
                  </TableCell>
                  <TableCell>{getSpaceName(booking)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {getSpaceType(booking)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatTime12h(booking.startTime)} - {formatTime12h(booking.endTime)}
                  </TableCell>
                  <TableCell>{booking.customerName}</TableCell>
                  <TableCell className="text-right">
                    {booking.guestCount}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`size-2 rounded-full ${
                          getStatusColor(booking.status).dot
                        }`}
                      />
                      <span className={getStatusColor(booking.status).text}>
                        {getStatusColor(booking.status).label}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {booking.contactNumber || '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {booking.callbackDate
                      ? booking.callbackDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
