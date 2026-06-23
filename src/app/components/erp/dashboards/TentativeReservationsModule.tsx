import {
  AlertCircle,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  TrendingUp,
  Calendar,
  Users,
  DollarSign,
  MapPin,
  History,
  ArrowRight,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { Booking } from '../../calendar/types-v2';
import { useState } from 'react';
import { venues, getPrimeSpaceById } from '../../calendar/data-v2';
import { Button } from '../../ui/button';
import { toast } from 'sonner';
import { formatCurrencyPKR, formatDatePK } from '../../../lib/locale';

interface TentativeReservationsModuleProps {
  bookings: Booking[];
  onBookingsChange: (bookings: Booking[]) => void;
  onBack: () => void;
}

type FilterType = 'all' | 'overdue-callback' | 'today-callback' | 'high-value' | 'no-callback' | 'lost-slot';
type ConversionStatus = 'hot' | 'warm' | 'cold';

export function TentativeReservationsModule({
  bookings,
  onBookingsChange,
  onBack,
}: TentativeReservationsModuleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedVenueId, setSelectedVenueId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'value' | 'callback'>('date');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tentativeBookings = bookings.filter(b => b.status === 'tentative');
  const lostSlotBookings = bookings.filter(
    b => b.status === 'lost-space-taken' || (b.released && b.releaseNotes?.includes('overridden by confirmed reservation'))
  );
  const pipelineBookings = [...tentativeBookings, ...lostSlotBookings];

  // Helper: Get days until event
  const getDaysUntilEvent = (booking: Booking): number => {
    const eventDate = typeof booking.date === 'string' ? new Date(booking.date) : booking.date;
    eventDate.setHours(0, 0, 0, 0);
    return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Helper: Get days since callback
  const getDaysSinceCallback = (booking: Booking): number | null => {
    if (!booking.callbackDate) return null;
    const callbackDate = typeof booking.callbackDate === 'string' ? new Date(booking.callbackDate) : booking.callbackDate;
    callbackDate.setHours(0, 0, 0, 0);
    return Math.ceil((today.getTime() - callbackDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Helper: Get conversion status
  const getConversionStatus = (booking: Booking): ConversionStatus => {
    const daysUntil = getDaysUntilEvent(booking);
    const daysSince = getDaysSinceCallback(booking);
    const hasAdvance = (booking.paidAmount || 0) > 0;

    if (hasAdvance || daysUntil <= 3) return 'hot';
    if (daysSince !== null && daysSince > 7) return 'cold';
    if (daysUntil <= 7) return 'warm';
    return 'warm';
  };

  // Categorize bookings
  const overdueCallback = tentativeBookings.filter(b => {
    const daysSince = getDaysSinceCallback(b);
    return daysSince !== null && daysSince > 0;
  });

  const todayCallback = tentativeBookings.filter(b => {
    if (!b.callbackDate) return false;
    const callbackDate = typeof b.callbackDate === 'string' ? new Date(b.callbackDate) : b.callbackDate;
    callbackDate.setHours(0, 0, 0, 0);
    return callbackDate.getTime() === today.getTime();
  });

  const noCallback = tentativeBookings.filter(b => !b.callbackDate);

  const highValue = tentativeBookings.filter(b => {
    const totalAmount = b.totalAmount || 0;
    return totalAmount >= 500000; // PKR 500k+
  });

  // Get filtered bookings
  const getFilteredBookings = (): Booking[] => {
    let filtered = [...pipelineBookings];

    // Apply filter type
    switch (activeFilter) {
      case 'overdue-callback':
        filtered = overdueCallback;
        break;
      case 'today-callback':
        filtered = todayCallback;
        break;
      case 'high-value':
        filtered = highValue;
        break;
      case 'no-callback':
        filtered = noCallback;
        break;
      case 'lost-slot':
        filtered = lostSlotBookings;
        break;
      default:
        filtered = pipelineBookings;
    }

    // Apply venue filter
    if (selectedVenueId !== 'all') {
      filtered = filtered.filter(b => b.venueId === selectedVenueId);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.customerName.toLowerCase().includes(query) ||
        (b.contactNumber && b.contactNumber.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return getDaysUntilEvent(a) - getDaysUntilEvent(b);
        case 'value':
          return (b.totalAmount || 0) - (a.totalAmount || 0);
        case 'callback': {
          const aDays = getDaysSinceCallback(a);
          const bDays = getDaysSinceCallback(b);
          if (aDays === null && bDays === null) return 0;
          if (aDays === null) return 1;
          if (bDays === null) return -1;
          return bDays - aDays;
        }
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredBookings = getFilteredBookings();

  // Handle actions
  const handleConvertToConfirmed = (booking: Booking) => {
    const confirmed = confirm(
      `Convert ${booking.customerName}'s tentative to CONFIRMED?\n\nThis will block the calendar slot.`
    );

    if (confirmed) {
      const updatedBookings = bookings.map(b =>
        b.id === booking.id ? { ...b, status: 'confirmed' as const } : b
      );
      onBookingsChange(updatedBookings);
      
      toast.success('Converted to Confirmed!', {
        description: `${booking.customerName}'s booking is now confirmed and blocking availability.`,
      });
    }
  };

  const handleReleaseTentative = (booking: Booking) => {
    const confirmed = confirm(
      `Release ${booking.customerName}'s tentative?\n\nThis will remove it from the system.`
    );

    if (confirmed) {
      const updatedBookings = bookings.filter(b => b.id !== booking.id);
      onBookingsChange(updatedBookings);
      
      toast.success('Tentative Released', {
        description: `${booking.customerName}'s tentative has been removed from the pipeline.`,
      });
    }
  };

  const handleScheduleCallback = (booking: Booking) => {
    toast.info('Schedule Callback', {
      description: 'Callback scheduling feature would open here',
    });
  };

  // Calculate pipeline metrics
  const pipelineValue = tentativeBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const hotLeads = tentativeBookings.filter(b => getConversionStatus(b) === 'hot').length;
  const warmLeads = tentativeBookings.filter(b => getConversionStatus(b) === 'warm').length;
  const coldLeads = tentativeBookings.filter(b => getConversionStatus(b) === 'cold').length;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="size-7 text-orange-600" />
              Tentative Reservations - Sales Pipeline
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track, follow-up, and convert inquiry-based reservations to confirmed bookings
            </p>
          </div>
          <Button onClick={onBack} variant="outline">
            <ArrowRight className="size-4 mr-2 rotate-180" />
            Back to Calendar
          </Button>
        </div>

        {/* Pipeline Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Total Pipeline</p>
            <p className="text-3xl font-bold text-blue-600">{tentativeBookings.length}</p>
            <p className="text-xs text-gray-500 mt-1">Tentative inquiries</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">🔥 Hot Leads</p>
            <p className="text-3xl font-bold text-red-600">{hotLeads}</p>
            <p className="text-xs text-gray-500 mt-1">Ready to close</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">💛 Warm Leads</p>
            <p className="text-3xl font-bold text-yellow-600">{warmLeads}</p>
            <p className="text-xs text-gray-500 mt-1">Active follow-up</p>
          </div>
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">❄️ Cold Leads</p>
            <p className="text-3xl font-bold text-gray-600">{coldLeads}</p>
            <p className="text-xs text-gray-500 mt-1">Need attention</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Pipeline Value</p>
            <p className="text-2xl font-bold text-green-600">PKR {(pipelineValue / 1000000).toFixed(1)}M</p>
            <p className="text-xs text-gray-500 mt-1">Potential revenue</p>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Lost to Confirmed</p>
            <p className="text-3xl font-bold text-rose-600">{lostSlotBookings.length}</p>
            <p className="text-xs text-gray-500 mt-1">Space taken by confirmed booking</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Filters & Search */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Venue Filter */}
            <select
              value={selectedVenueId}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Venues</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Sort by Event Date</option>
              <option value="value">Sort by Value</option>
              <option value="callback">Sort by Callback</option>
            </select>
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2 flex-wrap mt-4">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({pipelineBookings.length})
            </button>
            <button
              onClick={() => setActiveFilter('overdue-callback')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === 'overdue-callback'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🔴 Overdue ({overdueCallback.length})
            </button>
            <button
              onClick={() => setActiveFilter('today-callback')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === 'today-callback'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📞 Today ({todayCallback.length})
            </button>
            <button
              onClick={() => setActiveFilter('high-value')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === 'high-value'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              💎 High Value ({highValue.length})
            </button>
            <button
              onClick={() => setActiveFilter('no-callback')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === 'no-callback'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ⚠️ No Callback ({noCallback.length})
            </button>
            <button
              onClick={() => setActiveFilter('lost-slot')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === 'lost-slot'
                  ? 'bg-rose-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ⛔ Lost Slot ({lostSlotBookings.length})
            </button>
          </div>
        </div>

        {/* Pipeline List */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <FileText className="size-5 text-orange-600" />
              Tentative Reservations ({filteredBookings.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold text-gray-900">Status</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-900">Customer</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-900">Event Details</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-900">Days Until</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-900">Callback</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-900">Value</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <CheckCircle className="size-12 text-green-500 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No tentative reservations found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        All inquiries have been processed or filtered out
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map(booking => {
                    const isLostSlot = booking.status === 'lost-space-taken' || (booking.released && booking.releaseNotes?.includes('overridden by confirmed reservation'));
                    const conversionStatus = isLostSlot ? 'cold' : getConversionStatus(booking);
                    const daysUntil = getDaysUntilEvent(booking);
                    const daysSince = getDaysSinceCallback(booking);
                    const primeSpace = getPrimeSpaceById(booking.primeSpaceIds?.[0] || booking.primeSpaceId || '');
                    const venue = venues.find(v => v.id === booking.venueId);

                    const statusConfig = {
                      hot: { bg: 'bg-red-100', text: 'text-red-700', icon: '🔥', label: 'HOT' },
                      warm: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '💛', label: 'WARM' },
                      cold: { bg: 'bg-gray-100', text: 'text-gray-600', icon: '❄️', label: 'COLD' },
                    };

                    return (
                      <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${isLostSlot ? 'bg-rose-100 text-rose-700' : `${statusConfig[conversionStatus].bg} ${statusConfig[conversionStatus].text}`}`}>
                            {isLostSlot ? '⛔ LOST SLOT' : `${statusConfig[conversionStatus].icon} ${statusConfig[conversionStatus].label}`}
                          </span>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-gray-900 text-sm">{booking.customerName}</p>
                          {booking.contactNumber && (
                            <p className="text-xs text-gray-600 flex items-center gap-1">
                              <Phone className="size-3" />
                              {booking.contactNumber}
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          <p className="text-sm font-medium text-gray-900">
                            {typeof booking.date === 'string' 
                              ? formatDatePK(booking.date)
                              : formatDatePK(booking.date)
                            }
                          </p>
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <MapPin className="size-3" />
                            {venue?.name}
                          </p>
                          {primeSpace && (
                            <p className="text-xs text-gray-500">{primeSpace.name}</p>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            daysUntil <= 3 ? 'bg-red-500 text-white' :
                            daysUntil <= 7 ? 'bg-orange-500 text-white' :
                            'bg-gray-400 text-white'
                          }`}>
                            {daysUntil < 0 ? `${Math.abs(daysUntil)}d PAST` :
                             daysUntil === 0 ? 'TODAY' :
                             `${daysUntil} days`}
                          </span>
                        </td>
                        <td className="p-3">
                          {booking.callbackDate ? (
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {formatDatePK(booking.callbackDate)}
                              </p>
                              {daysSince !== null && daysSince > 0 && (
                                <p className="text-xs text-red-600 font-semibold">
                                  {daysSince}d overdue!
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                              Not Set
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {booking.totalAmount ? (
                            <p className="text-sm font-bold text-gray-900">
                              {formatCurrencyPKR(booking.totalAmount)}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400">Not quoted</p>
                          )}
                        </td>
                        <td className="p-3">
                            <div className="flex items-center gap-2">
                              {isLostSlot ? (
                                <div className="max-w-xs rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                                  Space taken by confirmed booking.
                                  {booking.releaseNotes ? ` ${booking.releaseNotes}` : ''}
                                </div>
                              ) : (
                                <>
                              <Button
                                onClick={() => handleScheduleCallback(booking)}
                              size="sm"
                              variant="outline"
                              className="text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
                            >
                              <Clock className="size-3 mr-1" />
                              Callback
                            </Button>
                            <Button
                              onClick={() => handleConvertToConfirmed(booking)}
                              size="sm"
                              className="text-xs bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="size-3 mr-1" />
                              Convert
                            </Button>
                              <Button
                                onClick={() => handleReleaseTentative(booking)}
                              size="sm"
                              variant="outline"
                              className="text-xs border-red-300 text-red-600 hover:bg-red-50"
                            >
                                <XCircle className="size-3" />
                              </Button>
                                </>
                              )}
                            </div>
                          </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
