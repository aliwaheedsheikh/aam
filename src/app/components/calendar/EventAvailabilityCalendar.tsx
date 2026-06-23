import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Crown,
  Edit2,
  MessageCircle,
  Phone,
  Plus,
  X,
  XCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { getPrimeSpaceColors } from './space-colors';
import { useState, useRef, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Booking } from './types-v2';
import {
  getDefaultVenueId,
  getPrimeSpacesByVenue,
  getVenueById,
  normalizeBookingVenueContext,
  venues,
} from './data-v2';
import {
  getPrimeSpaceBookings,
  getSubSpaceBookings,
  timeToMinutes,
} from './availability-v2';
import { formatDatePK, formatDateTimePK, formatTimePK, formatTimeRangePK } from '../../lib/locale';
import { getBookingSpaceAssignments } from '../../lib/bookingSpaces';
import { MonthViewV2 } from './MonthViewV2';

type InquirySlotContext = {
  spaceId: string;
  spaceName: string;
  isPrime: boolean;
  hour: number;
  date: Date;
  venueId: string;
  venueName: string;
  primeSpaceId?: string;
  primeSpaceName?: string;
  subSpaceId?: string;
  subSpaceName?: string;
  startTime?: string;
  endTime?: string;
};

interface EventAvailabilityCalendarProps {
  bookings: Booking[];
  onBookingsChange: (bookings: Booking[]) => void;
  onBack?: () => void;
  onCreateTentativeBooking: (slot: InquirySlotContext) => void;
  onEditTentativeInquiry: (booking: Booking) => void;
  onConvertTentativeInquiry: (booking: Booking) => void;
}

export function EventAvailabilityCalendar({
  bookings,
  onBookingsChange,
  onBack,
  onCreateTentativeBooking,
  onEditTentativeInquiry,
  onConvertTentativeInquiry,
}: EventAvailabilityCalendarProps) {
  const [viewMode, setViewMode] = useState<'month' | 'day'>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedVenueId, setSelectedVenueId] = useState(() => getDefaultVenueId());
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [selectedInquiries, setSelectedInquiries] = useState<Booking[]>([]);
  const [selectedSlotInfo, setSelectedSlotInfo] = useState<InquirySlotContext | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentBookings = useMemo(
    () => (bookings || []).map((booking) => normalizeBookingVenueContext(booking)),
    [bookings],
  );

  useEffect(() => {
    if (!selectedVenueId || !getVenueById(selectedVenueId)) {
      const fallbackVenueId = getDefaultVenueId();
      if (fallbackVenueId && fallbackVenueId !== selectedVenueId) {
        setSelectedVenueId(fallbackVenueId);
      }
    }
  }, [selectedVenueId]);

  // Get venue and prime spaces
  const venue = getVenueById(selectedVenueId);
  const primeSpaces = getPrimeSpacesByVenue(selectedVenueId);

  // Generate hours from 6 AM to 5 AM next day
  const hours = [
    6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 
    0, 1, 2, 3, 4, 5
  ];

  // Format hour to AM/PM
  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const inquiryCountLabel = (count: number) => `${count} ${count === 1 ? 'inquiry' : 'inquiries'}`;
  const getInquiryDateTime = (booking: Booking) => booking.inquiryDateTime || booking.createdAt || null;
  const formatShortDateLabel = (value: Date) =>
    new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short' }).format(value);
  const sortInquiriesByDate = (items: Booking[]) =>
    [...items].sort((left, right) => {
      const leftTime = getInquiryDateTime(left)?.getTime() ?? 0;
      const rightTime = getInquiryDateTime(right)?.getTime() ?? 0;
      return leftTime - rightTime;
    });

  // Handle date navigation
  const handlePreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  // Handle date picker change
  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      const newDate = new Date(value);
      setCurrentDate(newDate);
    }
  };

  // Format current date for input value (YYYY-MM-DD)
  const inputValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const monthInputValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  // Get active reservations for current date and venue
  const dayVenueBookings = currentBookings.filter((b) => {
    const bookingDate = typeof b.date === 'string' ? new Date(b.date) : b.date;
    
    const isSameDate = 
      bookingDate.getDate() === currentDate.getDate() &&
      bookingDate.getMonth() === currentDate.getMonth() &&
      bookingDate.getFullYear() === currentDate.getFullYear();
    
    const isSameVenue = b.venueId === selectedVenueId;
    
    return (
      isSameDate &&
      isSameVenue &&
      b.status !== 'cancelled' &&
      b.status !== 'expired' &&
      b.status !== 'lost-space-taken'
    );
  });

  const tentativeBookings = dayVenueBookings.filter((b) => b.status === 'tentative');
  const confirmedBookings = dayVenueBookings.filter((b) => b.status === 'confirmed' || b.status === 'completed');
  const monthVenueBookings = currentBookings.filter((booking) => {
    const bookingDate = typeof booking.date === 'string' ? new Date(booking.date) : booking.date;

    return (
      booking.venueId === selectedVenueId &&
      bookingDate.getMonth() === currentDate.getMonth() &&
      bookingDate.getFullYear() === currentDate.getFullYear() &&
      booking.status !== 'cancelled' &&
      booking.status !== 'expired' &&
      booking.status !== 'lost-space-taken'
    );
  });
  const monthTentativeBookings = monthVenueBookings.filter((booking) => booking.status === 'tentative');
  const monthConfirmedBookings = monthVenueBookings.filter(
    (booking) => booking.status === 'confirmed' || booking.status === 'completed',
  );
  const monthOverdueCallbacks = monthTentativeBookings.filter((booking) => {
    if (!booking.callbackDate) return false;

    const callbackDate = typeof booking.callbackDate === 'string' ? new Date(booking.callbackDate) : booking.callbackDate;
    callbackDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return callbackDate < today;
  });

  // Toggle expansion
  const toggleSpace = (primeSpaceId: string) => {
    setExpandedSpaces((prev) => {
      const next = new Set(prev);
      if (next.has(primeSpaceId)) {
        next.delete(primeSpaceId);
      } else {
        next.add(primeSpaceId);
      }
      return next;
    });
  };

  // Helper to get adjusted end minutes for overnight events
  const getAdjustedEndMinutes = (booking: Booking): number => {
    const startMinutes = timeToMinutes(booking.startTime);
    const endMinutes = timeToMinutes(booking.endTime);
    
    if (endMinutes < startMinutes) {
      return endMinutes + 1440; // 24 * 60 = 1440 minutes
    }
    return endMinutes;
  };

  const formatTimeValue = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

  const buildDefaultEndTime = (startTime: string) => {
    const [hoursValue = 18, minutesValue = 0] = startTime.split(':').map(Number);
    return `${String((hoursValue + 4) % 24).padStart(2, '0')}:${String(minutesValue).padStart(2, '0')}`;
  };

  const buildSlotInfo = (
    spaceId: string,
    spaceName: string,
    isPrime: boolean,
    hour: number,
    parentPrimeSpace?: { id: string; name: string },
  ): InquirySlotContext => ({
    spaceId,
    spaceName,
    isPrime,
    hour,
    date: currentDate,
    venueId: selectedVenueId,
    venueName: venue?.name || '',
    primeSpaceId: isPrime ? spaceId : parentPrimeSpace?.id,
    primeSpaceName: isPrime ? spaceName : parentPrimeSpace?.name,
    subSpaceId: isPrime ? undefined : spaceId,
    subSpaceName: isPrime ? undefined : spaceName,
    startTime: formatTimeValue(hour),
    endTime: buildDefaultEndTime(formatTimeValue(hour)),
  });

  const sameInquirySlot = (booking: Booking, slotInfo: InquirySlotContext) => {
    const bookingAssignments = getBookingSpaceAssignments(booking);
    const sameSpace = slotInfo.isPrime
      ? bookingAssignments.some(
          (assignment) => assignment.assignmentType === 'PRIME_FULL' && assignment.primeSpaceId === slotInfo.primeSpaceId,
        )
      : bookingAssignments.some(
          (assignment) => assignment.assignmentType === 'SUB_ONLY' && assignment.subSpaceId === slotInfo.subSpaceId,
        );

    return (
      booking.status === 'tentative' &&
      sameSpace &&
      booking.startTime === slotInfo.startTime &&
      booking.endTime === slotInfo.endTime
    );
  };

  const withSlotInfoFromInquiry = (booking: Booking, fallbackSlotInfo: InquirySlotContext): InquirySlotContext => ({
    ...fallbackSlotInfo,
    startTime: booking.startTime,
    endTime: booking.endTime,
  });

  const getOverlappingBookings = (hour: number, spaceBookings: Booking[]) => {
    const hourMinutes = hour < 6 ? hour * 60 + 1440 : hour * 60;

    return spaceBookings.filter((booking) => {
      const startMinutes = timeToMinutes(booking.startTime);
      const endMinutes = getAdjustedEndMinutes(booking);

      return hourMinutes >= startMinutes && hourMinutes < endMinutes;
    });
  };

  const openInquiryPanel = (inquiries: Booking[], slotInfo: InquirySlotContext) => {
    setSelectedInquiries(sortInquiriesByDate(inquiries));
    setSelectedSlotInfo(slotInfo);
  };

  const normalizeWhatsAppNumber = (value?: string) => {
    const digits = (value || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('92')) return digits;
    if (digits.startsWith('0')) return `92${digits.slice(1)}`;
    if (digits.length === 10 && digits.startsWith('3')) return `92${digits}`;
    return digits;
  };

  const handleWhatsAppInquiry = (booking: Booking) => {
    const whatsappNumber = normalizeWhatsAppNumber(booking.contactNumber || booking.customerPhone);
    if (!whatsappNumber) {
      toast.error('This inquiry does not have a phone number.');
      return;
    }

    const message = [
      `Hello ${booking.customerName}, thank you for your inquiry.`,
      booking.eventType ? `Event: ${booking.eventType}` : '',
      booking.guestCount ? `Expected guests: ${booking.guestCount}` : '',
      booking.callbackDate ? `Follow-up date: ${formatDatePK(booking.callbackDate)}` : '',
      booking.notes ? `Info shared: ${booking.notes}` : '',
    ].filter(Boolean).join('\n');

    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const handleMarkInquiryLost = (booking: Booking) => {
    const now = new Date();
    const updatedBookings = currentBookings.map((entry) =>
      entry.id === booking.id
        ? normalizeBookingVenueContext({
            ...entry,
            status: 'lost-space-taken' as const,
            followUpStatus: 'Lost' as const,
            released: true,
            releaseReason: 'declined' as const,
            releaseNotes: 'Marked lost from Inquiry Follow-ups.',
            releasedAt: now,
          })
        : entry,
    );

    onBookingsChange(updatedBookings);
    const remainingInquiries = sortInquiriesByDate(selectedInquiries.filter((entry) => entry.id !== booking.id));
    setSelectedInquiries(remainingInquiries);

    toast.success('Inquiry marked lost', {
      description: `${booking.customerName} has been removed from active follow-ups.`,
    });
  };

  // Scroll to 11 AM on mount and when date/venue changes
  useEffect(() => {
    if (!selectedSlotInfo) return;

    const refreshedInquiries = currentBookings.filter((booking) => sameInquirySlot(booking, selectedSlotInfo));
    setSelectedInquiries(sortInquiriesByDate(refreshedInquiries));
  }, [currentBookings, selectedSlotInfo]);

  useEffect(() => {
    if (viewMode !== 'day') return;

    // Use setTimeout to ensure DOM is fully rendered before scrolling
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        // Scroll horizontally to 11 AM
        // Hours array: [6, 7, 8, 9, 10, 11, 12, 13, ...] so 11 AM is at index 5
        // Each hour cell is 80px wide (w-20)
        const scrollPosition = 5 * 80; // Index 5 = 11 AM
        scrollContainerRef.current.scrollLeft = scrollPosition;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [currentDate, selectedVenueId, viewMode]);

  useEffect(() => {
    if (viewMode === 'month') {
      setSelectedSlotInfo(null);
      setSelectedInquiries([]);
    }
  }, [viewMode]);

  // Render time cells for a space
  const renderTimeCells = (
    spaceId: string,
    spaceName: string,
    spaceBookings: Booking[],
    isPrime: boolean,
    colorScheme: any,
    parentPrimeSpace?: { id: string; name: string }
  ) => {
    return hours.map((hour) => {
      const slotInfo = buildSlotInfo(spaceId, spaceName, isPrime, hour, parentPrimeSpace);
      const overlappingBookings = getOverlappingBookings(hour, spaceBookings);
      const slotStartTime = formatTimeValue(hour);
      const startingInquiries = spaceBookings.filter(
        (booking) => booking.status === 'tentative' && booking.startTime === slotStartTime,
      );
      const confirmedBooking = overlappingBookings.find(
        (booking) => booking.status === 'confirmed' || booking.status === 'completed',
      );

      if (confirmedBooking) {
        const confirmedStartMinutes = timeToMinutes(confirmedBooking.startTime);
        const isStart = confirmedStartMinutes === hour * 60;

        if (!isStart) {
          return null;
        }

        const confirmedEndMinutes = getAdjustedEndMinutes(confirmedBooking);
        const startHour = Math.floor(confirmedStartMinutes / 60);
        const endHour = Math.floor(confirmedEndMinutes / 60);
        const cellSpan = Math.max(1, endHour - startHour + 1);
        const blockInquiries = spaceBookings.filter((booking) => {
          if (booking.status !== 'tentative') return false;
          const inquiryStart = timeToMinutes(booking.startTime);
          const inquiryEnd = getAdjustedEndMinutes(booking);

          return inquiryStart < confirmedEndMinutes && inquiryEnd > confirmedStartMinutes;
        });

        return (
          <div
            key={hour}
            className="relative flex items-center justify-center border border-slate-200 bg-slate-100 px-2 py-1.5 text-slate-600"
            style={{ gridColumn: `span ${cellSpan}` }}
            title="Confirmed reservation, shown read-only"
          >
            <div className="w-full text-center">
              <div className="flex items-center justify-center gap-1.5">
                <span className="truncate text-xs font-semibold text-slate-700">
                  {confirmedBooking.customerName}
                </span>
                {confirmedBooking.isVIPCustomer && <Crown className="size-3.5 shrink-0 text-amber-600" />}
              </div>
              <div className="text-[10px] uppercase text-slate-500">
                Confirmed, read-only
              </div>
            </div>
            {blockInquiries.length > 0 && (
              <button
                type="button"
                className="absolute -right-2 -top-2 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 shadow-sm hover:bg-amber-200"
                onClick={(event) => {
                  event.stopPropagation();
                  openInquiryPanel(blockInquiries, withSlotInfoFromInquiry(blockInquiries[0], slotInfo));
                }}
                title="View tentative inquiries for this slot"
              >
                {inquiryCountLabel(blockInquiries.length)}
              </button>
            )}
            <button
              type="button"
              className="absolute bottom-1 right-1 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={(event) => {
                event.stopPropagation();
                onCreateTentativeBooking({
                  ...slotInfo,
                  startTime: confirmedBooking.startTime,
                  endTime: confirmedBooking.endTime,
                });
              }}
              title="Add inquiry as waitlist/follow-up"
            >
              Add inquiry
            </button>
          </div>
        );
      }

      return (
        <button
          key={hour}
          type="button"
          className="group relative min-h-[42px] border-r bg-white text-left transition-colors hover:bg-slate-50"
          onClick={() => {
            if (startingInquiries.length > 0) {
              const exactSlotInquiries = spaceBookings.filter((booking) =>
                sameInquirySlot(booking, withSlotInfoFromInquiry(startingInquiries[0], slotInfo))
              );
              openInquiryPanel(exactSlotInquiries, withSlotInfoFromInquiry(startingInquiries[0], slotInfo));
              return;
            }

            onCreateTentativeBooking(slotInfo);
          }}
          title={
            startingInquiries.length > 0
              ? 'View tentative inquiries'
              : `Add inquiry for ${spaceName} at ${formatHour(hour)}`
          }
        >
          {startingInquiries.length > 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="inline-flex max-w-[76px] items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 shadow-sm">
                <MessageCircle className="size-3 shrink-0" />
                <span>
                  {inquiryCountLabel(spaceBookings.filter((booking) =>
                    sameInquirySlot(booking, withSlotInfoFromInquiry(startingInquiries[0], slotInfo))
                  ).length)}
                </span>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
              <Plus className="size-4 text-slate-400" />
            </div>
          )}
        </button>
      );
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="size-7 text-slate-700" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Tentative Reservations</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Prime and sub-space timeline board for slot-level inquiry follow-up, with month view available when needed.
              </p>
            </div>
          </div>
          
          {/* Date Navigation & Venue Selector */}
          <div className="flex items-center gap-3">
            {onBack && (
              <Button
                onClick={onBack}
                variant="outline"
                size="sm"
                className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                ← Back
              </Button>
            )}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode('day')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'day'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'month'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Month
              </button>
            </div>
            <select
              value={selectedVenueId}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:ring-2 focus:ring-slate-200"
            >
              {venues.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>

            <Button
              onClick={() => {
                if (viewMode === 'month') {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCurrentDate(newDate);
                  return;
                }

                handlePreviousDay();
              }}
              variant="outline"
              size="sm"
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              ←
            </Button>
            
            <Input
              type={viewMode === 'month' ? 'month' : 'date'}
              value={viewMode === 'month' ? monthInputValue : inputValue}
              onChange={(e) => {
                if (viewMode === 'month') {
                  const value = e.target.value;
                  if (!value) return;

                  const [newYear, newMonth] = value.split('-').map(Number);
                  setCurrentDate(new Date(newYear, newMonth - 1, 1));
                  return;
                }

                handleDatePickerChange(e);
              }}
              className="w-44 bg-white text-gray-900"
            />
            
            <Button
              onClick={() => {
                if (viewMode === 'month') {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCurrentDate(newDate);
                  return;
                }

                handleNextDay();
              }}
              variant="outline"
              size="sm"
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              →
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="border-b bg-slate-50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-slate-400"></div>
            <span className="text-sm font-medium text-gray-700">
              {viewMode === 'month'
                ? `${monthConfirmedBookings.length} confirmed reservations in ${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                : `${confirmedBookings.length} confirmed reservations on ${formatDatePK(currentDate)}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-amber-500"></div>
            <span className="text-sm font-medium text-gray-700">
              {viewMode === 'month'
                ? `${monthTentativeBookings.length} tentative reservations`
                : `${tentativeBookings.length} open inquiries`}
            </span>
          </div>
          {viewMode === 'month' && (
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-rose-500"></div>
              <span className="text-sm font-medium text-gray-700">
                {monthOverdueCallbacks.length} overdue callbacks
              </span>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'month' ? (
        <div className="min-h-0 flex-1">
          <MonthViewV2
            venueId={selectedVenueId}
            currentDate={currentDate}
            onDateClick={(date) => {
              setCurrentDate(date);
              setViewMode('day');
            }}
            onMonthChange={setCurrentDate}
            statusFilter={{ available: false, tentative: true, confirmed: false }}
            bookings={currentBookings}
            mode="tentative"
            showHeader={false}
          />
        </div>
      ) : (
        <>
      {/* Calendar Grid */}
      <div className="flex-shrink-0" style={{ height: '400px' }}>
        <div className="h-full overflow-auto" ref={scrollContainerRef}>
          <div className="min-w-max">
            {/* Time Header Row (Sticky) */}
            <div className="sticky top-0 z-30 flex bg-white border-b-2 border-gray-300 shadow-sm">
              {/* Space Name Column */}
              <div className="w-48 flex-shrink-0 border-r sticky left-0 z-40 bg-gray-100 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-600">Prime Space / Sub Space</span>
              </div>
              
              {/* Time Slots */}
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${hours.length}, 80px)` }}>
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="border-r px-2 py-2 text-center bg-blue-50"
                  >
                    <div className="text-xs font-bold text-blue-900">
                      {formatHour(hour)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Space Rows */}
            <div className="bg-white">
              {primeSpaces.map((primeSpace) => {
                const colorScheme = getPrimeSpaceColors(primeSpace.id);
                const isExpanded = expandedSpaces.has(primeSpace.id);
                
                // Get prime space bookings
                const primeBookings = getPrimeSpaceBookings(
                  primeSpace.id,
                  currentDate,
                  dayVenueBookings
                );

                const filteredDirectPrimeBookings = primeBookings.filter((b) => {
                  const isPrimeOnlyBooking = getBookingSpaceAssignments(b).some(
                    (assignment) => assignment.assignmentType === 'PRIME_FULL' && assignment.primeSpaceId === primeSpace.id,
                  );
                  return isPrimeOnlyBooking;
                });

                return (
                  <div key={primeSpace.id}>
                    {/* Prime Space Row */}
                    <div className="flex hover:bg-gray-50 relative">
                      {/* Prime Space Name (Sticky) */}
                      <div className={`w-48 flex-shrink-0 border-r border-b px-3 py-2.5 sticky left-0 z-20 ${colorScheme.prime.bg}`}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleSpace(primeSpace.id)}
                            className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="size-4 text-gray-600" />
                            ) : (
                              <ChevronRight className="size-4 text-gray-600" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className={`text-sm truncate font-medium ${colorScheme.prime.text}`}>
                              {primeSpace.name}
                            </div>
                            <div className="text-xs text-gray-600">
                              Capacity: {primeSpace.capacity}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Time Cells */}
                      <div className="flex-1 grid border-b" style={{ gridTemplateColumns: `repeat(${hours.length}, 80px)` }}>
                        {renderTimeCells(
                          primeSpace.id,
                          primeSpace.name,
                          filteredDirectPrimeBookings,
                          true,
                          colorScheme,
                          { id: primeSpace.id, name: primeSpace.name }
                        )}
                      </div>
                    </div>

                    {/* Sub Space Rows */}
                    {isExpanded &&
                      primeSpace.subSpaces.map((subSpace) => {
                        const subSpaceBookings = getSubSpaceBookings(
                          subSpace.id,
                          currentDate,
                          dayVenueBookings
                        ).filter((b) =>
                          getBookingSpaceAssignments(b).some(
                            (assignment) => assignment.assignmentType === 'SUB_ONLY' && assignment.subSpaceId === subSpace.id,
                          ),
                        );

                        return (
                          <div
                            key={subSpace.id}
                            className="flex bg-gray-50/50 hover:bg-gray-100/50 relative"
                          >
                            {/* Sub Space Name (Sticky) */}
                            <div className={`w-48 flex-shrink-0 border-r border-b pl-8 pr-3 py-2.5 flex items-center sticky left-0 z-20 ${colorScheme.sub.bg}`}>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm truncate text-gray-700">
                                  {subSpace.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Capacity: {subSpace.capacity}
                                </div>
                              </div>
                            </div>

                            {/* Time Cells */}
                            <div className="flex-1 grid border-b" style={{ gridTemplateColumns: `repeat(${hours.length}, 80px)` }}>
                              {renderTimeCells(
                                subSpace.id,
                                subSpace.name,
                                subSpaceBookings,
                                false,
                                colorScheme,
                                { id: primeSpace.id, name: primeSpace.name }
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {viewMode === 'day' && selectedSlotInfo && (
        <div className="min-h-0 flex-1 overflow-hidden border-t bg-white">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
            <div className="min-w-0 truncate text-sm font-semibold text-slate-900">
              {selectedSlotInfo.spaceName} | {formatShortDateLabel(selectedSlotInfo.date)} | {formatTimeRangePK(
                selectedSlotInfo.startTime || formatHour(selectedSlotInfo.hour),
                selectedSlotInfo.endTime || 'auto',
              )} ({inquiryCountLabel(selectedInquiries.length)})
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => onCreateTentativeBooking(selectedSlotInfo)}
              >
                <Plus className="mr-2 size-4" />
                Add Inquiry
              </Button>
              <button
                type="button"
                onClick={() => {
                  setSelectedSlotInfo(null);
                  setSelectedInquiries([]);
                }}
                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close inquiry list"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="px-4 py-3 sm:px-6">
            <div className="overflow-hidden rounded-lg border">
              <div className="hidden bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600 lg:grid lg:grid-cols-[0.7fr_1.4fr_0.6fr_0.9fr_0.9fr_1.5fr] lg:gap-2">
                <div>Time</div>
                <div>Customer</div>
                <div>Guests</div>
                <div>Status</div>
                <div>Follow-up Date</div>
                <div>Actions</div>
              </div>

              <div className="max-h-[320px] overflow-y-auto overflow-x-hidden">
                {selectedInquiries.length === 0 ? (
                  <div className="px-3 py-10 text-center text-sm text-slate-500">
                    No active inquiries for this slot.
                  </div>
                ) : (
                  <div className="divide-y">
                    {selectedInquiries.map((booking) => (
                      <div
                        key={booking.id}
                        className="grid gap-2 px-3 py-2 text-xs transition-colors hover:bg-slate-50 lg:grid-cols-[0.7fr_1.4fr_0.6fr_0.9fr_0.9fr_1.5fr] lg:items-center"
                        title={`Source: ${booking.inquirySource || booking.bookingSource || '-'}${booking.eventType ? ` | Event: ${booking.eventType}` : ''}`}
                      >
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 lg:hidden">Time</div>
                          <div className="font-medium text-slate-900">
                            {getInquiryDateTime(booking) ? formatTimePK(getInquiryDateTime(booking)) : '-'}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 lg:hidden">Customer</div>
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                            <span className="truncate">{booking.customerName}</span>
                            {booking.isVIPCustomer && (
                              <Crown className="size-3 shrink-0 text-amber-600" title={booking.vipReference || 'VIP'} />
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 lg:hidden">Guests</div>
                          <div className="text-slate-700">{booking.guestCount || '-'}</div>
                        </div>

                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 lg:hidden">Status</div>
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                            {booking.followUpStatus || 'New'}
                          </span>
                        </div>

                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 lg:hidden">Follow-up Date</div>
                          <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            booking.callbackDate
                              ? new Date(booking.callbackDate) < new Date()
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {booking.callbackDate ? formatDatePK(booking.callbackDate) : 'Not Set'}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 lg:hidden">Actions</div>
                          <div className="flex flex-wrap gap-1 lg:justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => onEditTentativeInquiry(booking)}
                            >
                              <Edit2 className="mr-1 size-3" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleWhatsAppInquiry(booking)}
                            >
                              <Phone className="mr-1 size-3" />
                              WhatsApp
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 whitespace-nowrap bg-emerald-600 px-2 text-xs text-white hover:bg-emerald-700"
                              onClick={() => onConvertTentativeInquiry(booking)}
                            >
                              <CheckCircle2 className="mr-1 size-3" />
                              Convert to Confirmed
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 whitespace-nowrap px-2 text-xs text-rose-700 hover:bg-rose-50"
                              onClick={() => handleMarkInquiryLost(booking)}
                            >
                              <XCircle className="mr-1 size-3" />
                              Mark Lost
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
