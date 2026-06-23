import { useState } from 'react';
import { bookings, getAllVenues, findVenueById } from './mock-data';
import { Booking, VenueType } from './types';
import { getStatusColor } from './status-colors';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { formatDatePK } from '../../lib/locale';

interface AgendaViewProps {
  currentDate: Date;
  selectedVenue: string;
  venueTypeFilter: VenueType;
  onSlotClick: (date: Date, booking?: Booking) => void;
}

export function AgendaView({ currentDate, selectedVenue, venueTypeFilter, onSlotClick }: AgendaViewProps) {
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [venueFilter, setVenueFilter] = useState<string>(selectedVenue);

  // Filter bookings
  const filteredBookings = bookings.filter((booking) => {
    const bookingDate = booking.date;
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);

    const matchesDateRange = bookingDate >= fromDate && bookingDate <= toDate;
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchesVenue = venueFilter === 'all' || booking.venueId === venueFilter;

    return matchesDateRange && matchesStatus && matchesVenue;
  });

  // Sort by date
  const sortedBookings = [...filteredBookings].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const getVenueName = (venueId: string) => {
    const venue = findVenueById(venueId);
    return venue?.name || '';
  };

  const getVenueType = (venueId: string) => {
    const venue = findVenueById(venueId);
    return venue?.isSubVenue ? 'Partial' : 'Full';
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Filters */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="date-from" className="text-sm whitespace-nowrap">
              Date From
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
              Date To
            </label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="venue-filter" className="text-sm whitespace-nowrap">
              Venue
            </label>
            <Select value={venueFilter} onValueChange={setVenueFilter}>
              <SelectTrigger id="venue-filter" className="w-[240px]">
                <SelectValue placeholder="Select venue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Venues</SelectItem>
                {getAllVenues().map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="status-filter" className="text-sm whitespace-nowrap">
              Status
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status-filter" className="w-[160px]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="tentative">Tentative</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="sm" className="ml-auto">
            Export List
          </Button>
        </div>

        <div className="text-sm text-gray-600">
          Showing {sortedBookings.length} booking(s)
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Date</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Slot</TableHead>
              <TableHead className="text-right">Guest Count</TableHead>
              <TableHead>Booking Status</TableHead>
              <TableHead>Callback Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                  No bookings found for the selected filters
                </TableCell>
              </TableRow>
            ) : (
              sortedBookings.map((booking) => (
                <TableRow
                  key={booking.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => onSlotClick(booking.date, booking)}
                >
                  <TableCell>
                    {formatDatePK(booking.date)}
                  </TableCell>
                  <TableCell>{booking.customerName || '—'}</TableCell>
                  <TableCell>{getVenueName(booking.venueId)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">{getVenueType(booking.venueId)}</span>
                  </TableCell>
                  <TableCell className="capitalize">{booking.slot}</TableCell>
                  <TableCell className="text-right">
                    {booking.guestCount || '—'}
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
                  <TableCell>
                    {booking.callbackDate
                      ? formatDatePK(booking.callbackDate)
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
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
