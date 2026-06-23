import {
  X,
  Phone,
  Clock,
  Users,
  MapPin,
  Calendar,
  AlertCircle,
  TrendingUp,
  DollarSign,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Booking } from './types-v2';
import { getPrimeSpaceById } from './data-v2';
import { Button } from '../ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatCurrencyPKR, formatDatePK, formatTimeRangePK } from '../../lib/locale';

interface TentativeSidePanelProps {
  date: Date;
  venueId: string;
  venueName: string;
  tentativeBookings: Booking[];
  confirmedBookings: Booking[];
  onClose: () => void;
  onBookingsChange: (bookings: Booking[]) => void;
}

type TabType = 'confirmed' | 'tentative';

export function TentativeSidePanel({
  date,
  venueId,
  venueName,
  tentativeBookings,
  confirmedBookings,
  onClose,
  onBookingsChange,
}: TentativeSidePanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('confirmed');
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  // Filter tentatives for this specific date and venue
  const dateTentatives = tentativeBookings.filter(b => {
    const bookingDate = typeof b.date === 'string' ? new Date(b.date) : b.date;
    return (
      b.venueId === venueId &&
      bookingDate.getDate() === date.getDate() &&
      bookingDate.getMonth() === date.getMonth() &&
      bookingDate.getFullYear() === date.getFullYear()
    );
  });

  // Filter confirmed bookings for this specific date and venue
  const dateConfirmed = confirmedBookings.filter(b => {
    const bookingDate = typeof b.date === 'string' ? new Date(b.date) : b.date;
    return (
      b.venueId === venueId &&
      bookingDate.getDate() === date.getDate() &&
      bookingDate.getMonth() === date.getMonth() &&
      bookingDate.getFullYear() === date.getFullYear()
    );
  });

  const handleConvertToConfirmed = (booking: Booking) => {
    const confirmed = confirm(
      `Convert ${booking.customerName}'s tentative booking to CONFIRMED?\n\nNote: This will block the slot on the calendar.`
    );

    if (confirmed) {
      const updatedBookings = tentativeBookings.map(b =>
        b.id === booking.id ? { ...b, status: 'confirmed' as const } : b
      );
      onBookingsChange(updatedBookings);
      
      toast.success('Booking Confirmed!', {
        description: `${booking.customerName}'s reservation is now confirmed and blocking availability.`,
      });
    }
  };

  const handleCallCustomer = (booking: Booking) => {
    toast.info('Call Feature', {
      description: `Calling ${booking.customerName} at ${booking.contactNumber}...`,
    });
  };

  const handleReleaseTentative = (booking: Booking) => {
    const confirmed = confirm(
      `Release ${booking.customerName}'s tentative booking?\n\nThis will remove it from the system.`
    );

    if (confirmed) {
      const updatedBookings = tentativeBookings.filter(b => b.id !== booking.id);
      onBookingsChange(updatedBookings);
      
      toast.success('Tentative Released', {
        description: `${booking.customerName}'s tentative booking has been removed.`,
      });
    }
  };

  const handleFollowUp = (booking: Booking) => {
    toast.info('Follow-Up Feature', {
      description: `Opening follow-up dialog for ${booking.customerName}...`,
    });
    // In real app, open follow-up/callback scheduling dialog
  };

  // Render booking card
  const renderBookingCard = (booking: Booking, isConfirmed: boolean) => {
    const primeSpace = getPrimeSpaceById(booking.primeSpaceIds?.[0] || booking.primeSpaceId || '');
    const isExpanded = expandedBookingId === booking.id;

    return (
      <div
        key={booking.id}
        className={`bg-white border-2 rounded-lg overflow-hidden hover:shadow-md transition-all ${
          isConfirmed ? 'border-green-200' : 'border-orange-200'
        }`}
      >
        {/* Header */}
        <div className={`px-3 py-2 border-b ${
          isConfirmed ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`size-2 rounded-full ${
                isConfirmed ? 'bg-green-500' : 'bg-orange-500 animate-pulse'
              }`}></div>
              <span className={`text-xs font-semibold ${
                isConfirmed ? 'text-green-700' : 'text-orange-700'
              }`}>
                {isConfirmed ? 'CONFIRMED' : 'TENTATIVE INQUIRY'}
              </span>
            </div>
            <button
              onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              {isExpanded ? 'Less' : 'Details'}
            </button>
          </div>
        </div>

        {/* Booking Info */}
        <div className="p-3">
          <div className="mb-3">
            <h4 className="font-bold text-gray-900 mb-1">
              {booking.customerName}
            </h4>
            {booking.contactNumber && (
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Phone className="size-3" />
                {booking.contactNumber}
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="size-4 text-blue-500" />
              <span>{formatTimeRangePK(booking.startTime, booking.endTime)}</span>
            </div>
            
            {primeSpace && (
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="size-4 text-green-500" />
                <span>{primeSpace.name}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-gray-700">
              <Users className="size-4 text-purple-500" />
              <span>{booking.guestCount} guests</span>
            </div>

            {booking.totalAmount && (
              <div className="flex items-center gap-2 text-gray-700">
                <DollarSign className="size-4 text-yellow-500" />
                <span className="font-semibold">{formatCurrencyPKR(booking.totalAmount)}</span>
              </div>
            )}
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              {booking.callbackDate && (
                <div className="mb-2">
                  <p className="text-xs text-gray-500">Next Callback:</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {formatDatePK(booking.callbackDate)}
                  </p>
                </div>
              )}
              
              {booking.notes && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Notes:</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">
                    {booking.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            <Button
              onClick={() => handleCallCustomer(booking)}
              size="sm"
              variant="outline"
              className="flex-1 text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              <Phone className="size-3 mr-1" />
              Call
            </Button>
            
            {isConfirmed ? (
              <Button
                onClick={() => handleFollowUp(booking)}
                size="sm"
                className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                <TrendingUp className="size-3 mr-1" />
                Follow Up
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => handleConvertToConfirmed(booking)}
                  size="sm"
                  className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="size-3 mr-1" />
                  Confirm
                </Button>
                <Button
                  onClick={() => handleReleaseTentative(booking)}
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs border-red-300 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="size-3 mr-1" />
                  Release
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-white border-l-4 border-blue-500 shadow-2xl z-[60] flex flex-col animate-in slide-in-from-right duration-300">
      {/* DEBUG INDICATOR */}
      <div className="absolute -left-20 top-4 bg-green-500 text-white px-3 py-2 rounded-l-lg font-bold text-sm shadow-lg">
        ✅ PANEL OPEN
      </div>
      
      {/* Header */}
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="size-5 text-blue-600" />
              Date Reservations
            </h3>
            <p className="text-xs text-blue-700 mt-1 font-medium">
              View & manage all bookings
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Date & Venue Info */}
        <div className="bg-white rounded-lg p-3 border border-blue-200">
          <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
            <Calendar className="size-4 text-blue-600" />
            <span className="font-semibold">
              {date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="size-4 text-green-600" />
            <span>{venueName}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b flex">
        <button
          onClick={() => setActiveTab('confirmed')}
          className={`flex-1 py-3 px-4 font-semibold text-sm transition-all relative ${
            activeTab === 'confirmed'
              ? 'text-green-700 bg-green-50 border-b-2 border-green-500'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <CheckCircle className="size-4" />
            Confirmed ({dateConfirmed.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('tentative')}
          className={`flex-1 py-3 px-4 font-semibold text-sm transition-all relative ${
            activeTab === 'tentative'
              ? 'text-orange-700 bg-orange-50 border-b-2 border-orange-500'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <AlertCircle className="size-4" />
            Tentative ({dateTentatives.length})
          </span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'confirmed' ? (
          dateConfirmed.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="size-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No confirmed bookings</p>
              <p className="text-xs text-gray-400 mt-1">
                This date has no confirmed reservations
              </p>
            </div>
          ) : (
            dateConfirmed.map(booking => renderBookingCard(booking, true))
          )
        ) : (
          dateTentatives.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="size-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No tentative inquiries</p>
              <p className="text-xs text-gray-400 mt-1">
                This date is clear for immediate booking
              </p>
            </div>
          ) : (
            dateTentatives.map(booking => renderBookingCard(booking, false))
          )
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t p-4">
        <p className="text-xs text-gray-600 text-center">
          {activeTab === 'confirmed' 
            ? '✅ Confirmed bookings block calendar availability'
            : '💡 Tentative inquiries don\'t block calendar availability until confirmed'
          }
        </p>
      </div>
    </div>
  );
}
