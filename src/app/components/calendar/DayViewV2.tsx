import { Booking } from './types-v2';
import {
  getPrimeSpacesByVenue,
  getVenueById,
} from './data-v2';
import {
  getPrimeSpaceBookings,
  getSubSpaceBookings,
  shouldHidePrimeSpace,
  shouldHideSubSpace,
  timeToMinutes,
} from './availability-v2';
import { getStatusColor } from './status-colors';
import { ChevronDown, ChevronRight, Clock, Calendar, ChevronLeft, AlertTriangle, Users, Banknote, DollarSign, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { StatusFilters } from './CalendarHeaderV2';
import { filterBookingsByView, shouldShowSpace, filterConfirmedOnly } from './view-filter';
import { getPrimeSpaceColors, getSpaceAccentColor } from './space-colors';
import { TentativeQueuePanel } from './TentativeQueuePanel';
import { useState, useEffect, useRef } from 'react';
import { formatCurrencyPKR, formatDatePK, formatTimeRangePK } from '../../lib/locale';
import { getBookingSpaceAssignments, bookingUsesPrimeSpace } from '../../lib/bookingSpaces';

interface DayViewV2Props {
  venueId: string;
  currentDate: Date;
  onBookingClick: (booking?: Booking, quickBookData?: { 
    spaceId: string; 
    spaceName: string; 
    isPrime: boolean; 
    hour: number; 
    date: Date; 
    venueId: string;
    venueName?: string;
    primeSpaceId?: string;
    primeSpaceName?: string;
    subSpaceId?: string;
    subSpaceName?: string;
  }) => void;
  onDateChange: (date: Date) => void;
  statusFilter: StatusFilters;
  bookings?: Booking[];
}

export function DayViewV2({ venueId, currentDate, onBookingClick, onDateChange, statusFilter, bookings: externalBookings }: DayViewV2Props) {
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Tentative Queue Panel State
  const [tentativeQueueOpen, setTentativeQueueOpen] = useState(false);
  const [selectedTentatives, setSelectedTentatives] = useState<Booking[]>([]);
  const [selectedTentativeSpace, setSelectedTentativeSpace] = useState<{
    name: string;
    venueId: string;
    isPrime: boolean;
    spaceId: string;
  } | null>(null);
  const [selectedTentativeTimeSlot, setSelectedTentativeTimeSlot] = useState<string>('');
  const [selectedTentativeDate, setSelectedTentativeDate] = useState<Date>(new Date());

  // Get venue and prime spaces
  const venue = getVenueById(venueId);
  const primeSpaces = getPrimeSpacesByVenue(venueId);

  // Generate hours from 6 AM to 5 AM next day (6, 7, 8, ..., 22, 23, 0, 1, 2, 3, 4, 5)
  // This covers typical event hours: daytime events and late-night events ending at 5 AM
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

  // Handle date navigation
  const handlePreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  // Handle date picker change
  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      const newDate = new Date(value);
      onDateChange(newDate);
    }
  };

  // Format current date for input value (YYYY-MM-DD)
  const inputValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

  // Always filter the source bookings down to the selected day.
  const sourceBookings = externalBookings ?? [];
  const dayBookings = sourceBookings.filter((b) => {
    const bookingDate = typeof b.date === 'string' ? new Date(b.date) : b.date;

    const isSameDate =
      bookingDate.getDate() === currentDate.getDate() &&
      bookingDate.getMonth() === currentDate.getMonth() &&
      bookingDate.getFullYear() === currentDate.getFullYear();

    // Also include bookings from previous day that run past midnight into the selected day.
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const isPreviousDayOvernight =
      bookingDate.getDate() === prevDate.getDate() &&
      bookingDate.getMonth() === prevDate.getMonth() &&
      bookingDate.getFullYear() === prevDate.getFullYear() &&
      timeToMinutes(b.endTime) < timeToMinutes(b.startTime);

    return isSameDate || isPreviousDayOvernight;
  });

  // Filter bookings by venue - check if booking belongs to this venue's spaces
  const venueFilteredBookings = dayBookings.filter(b => {
    // Check if booking belongs to this venue's prime spaces
    const belongsToVenue = primeSpaces.some(ps => {
      // Check if it's a prime space booking for this venue
      const isPrimeBooking = b.primeSpaceIds 
        ? b.primeSpaceIds.includes(ps.id)
        : b.primeSpaceId === ps.id;
      
      // Check if it's a sub space booking for this venue
      const isSubSpaceBooking = ps.subSpaces.some(ss => ss.id === b.subSpaceId);
      
      return isPrimeBooking || isSubSpaceBooking;
    });
    
    return belongsToVenue;
  });

  // Filter to show ONLY confirmed bookings (remove tentative from Calendar View)
  const confirmedOnlyBookings = venueFilteredBookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'completed',
  );

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

  // Auto-expand prime spaces when confirmed filter is active and there are confirmed sub-space bookings
  useEffect(() => {
    if (statusFilter.confirmed) {
      const spacesToExpand = new Set<string>();
      
      primeSpaces.forEach((primeSpace) => {
        // Check if any sub-space has confirmed bookings
        const hasConfirmedSubSpaceBookings = primeSpace.subSpaces.some((subSpace) => {
          const subSpaceBookings = getSubSpaceBookings(subSpace.id, currentDate, confirmedOnlyBookings);
          return subSpaceBookings.some(
            (b) => b.subSpaceId === subSpace.id && (b.status === 'confirmed' || b.status === 'completed'),
          );
        });
        
        if (hasConfirmedSubSpaceBookings) {
          spacesToExpand.add(primeSpace.id);
        }
      });
      
      setExpandedSpaces(spacesToExpand);
    }
  }, [statusFilter.confirmed, currentDate, venueId]);

  // Helper to get adjusted end minutes for overnight events
  const getAdjustedEndMinutes = (booking: Booking): number => {
    const startMinutes = timeToMinutes(booking.startTime);
    const endMinutes = timeToMinutes(booking.endTime);
    
    // If endTime < startTime, it's an overnight event - add 24 hours to endTime
    if (endMinutes < startMinutes) {
      return endMinutes + 1440; // 24 * 60 = 1440 minutes
    }
    return endMinutes;
  };

  // Determine if we're viewing the end of an overnight event (from previous day)
  const isOvernightContinuation = (booking: Booking): boolean => {
    const bookingDate = new Date(booking.date);
    const viewDate = new Date(currentDate);
    bookingDate.setHours(0, 0, 0, 0);
    viewDate.setHours(0, 0, 0, 0);
    
    // Check if booking is from previous day
    const dayBefore = new Date(viewDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    
    return bookingDate.getTime() === dayBefore.getTime();
  };

  // Render booking block across timeline
  const renderBookingBlock = (booking: Booking, rowType: 'prime' | 'sub') => {
    const startMinutes = timeToMinutes(booking.startTime);
    const endMinutes = getAdjustedEndMinutes(booking);
    
    const startHour = Math.floor(startMinutes / 60);
    const endHour = Math.floor(endMinutes / 60);
    const durationHours = (endMinutes - startMinutes) / 60;

    // Calculate position within first cell (offset from hour start)
    const offsetMinutes = startMinutes % 60;
    const offsetPercent = (offsetMinutes / 60) * 100;

    const statusColor =
      booking.status === 'confirmed'
        ? 'bg-red-600' // Changed from bg-red-500 for confirmed
        : booking.status === 'tentative'
        ? 'bg-yellow-400 text-gray-900'
        : 'bg-green-500 text-white';

    return {
      startHour,
      endHour,
      durationHours,
      offsetPercent,
      statusColor,
      booking,
    };
  };

  // Helper function to get all tentatives overlapping a specific hour
  const getTentativesForHour = (hour: number, spaceBookings: Booking[]): Booking[] => {
    return spaceBookings.filter(booking => {
      if (booking.status !== 'tentative') return false;
      
      const startMinutes = timeToMinutes(booking.startTime);
      const endMinutes = getAdjustedEndMinutes(booking);
      const hourStartMinutes = hour * 60;
      const hourEndMinutes = (hour + 1) * 60;
      
      // Check if booking overlaps with this hour
      return startMinutes < hourEndMinutes && endMinutes > hourStartMinutes;
    });
  };

  // Helper to get the earliest start hour among a group of tentatives
  const getFirstTentativeHour = (tentatives: Booking[]): number => {
    if (tentatives.length === 0) return -1;
    
    const startHours = tentatives.map(t => {
      const startMinutes = timeToMinutes(t.startTime);
      return Math.floor(startMinutes / 60);
    });
    
    return Math.min(...startHours);
  };

  // Calculate total tentatives for a space (for risk indicator)
  const getTotalTentativesForSpace = (spaceId: string, isPrime: boolean): number => {
    const spaceBookings = isPrime 
      ? getPrimeSpaceBookings(spaceId, currentDate, venueFilteredBookings)
      : getSubSpaceBookings(spaceId, currentDate, venueFilteredBookings);
    
    return spaceBookings.filter(b => b.status === 'tentative').length;
  };

  // Handlers for Tentative Queue Panel
  const handleTentativePromote = (bookingId: string) => {
    // TODO: Implement priority promotion logic
    // For now, just close and reopen to refresh
    console.log('Promote booking:', bookingId);
    setTentativeQueueOpen(false);
    setTimeout(() => setTentativeQueueOpen(true), 100);
  };

  const handleTentativeDemote = (bookingId: string) => {
    // TODO: Implement priority demotion logic
    console.log('Demote booking:', bookingId);
    setTentativeQueueOpen(false);
    setTimeout(() => setTentativeQueueOpen(true), 100);
  };

  const handleTentativeConvert = (bookingId: string) => {
    // Find the booking and open it in edit mode to convert to confirmed
    const booking = selectedTentatives.find(b => b.id === bookingId);
    if (booking) {
      setTentativeQueueOpen(false);
      
      // Pass booking with direct-confirm mode signal
      // We'll add mode information to the booking object temporarily
      const bookingWithMode = {
        ...booking,
        _convertMode: 'direct-confirm' as const, // Special flag for walk-in confirm
      };
      
      onBookingClick(bookingWithMode as any);
    }
  };

  const handleTentativeEdit = (booking: Booking) => {
    setTentativeQueueOpen(false);
    onBookingClick(booking);
  };

  const handleTentativeDelete = (bookingId: string) => {
    // TODO: Implement delete logic with data persistence
    console.log('Delete booking:', bookingId);
    // For now, just filter it out from the display
    setSelectedTentatives(prev => prev.filter(b => b.id !== bookingId));
  };

  const handleTentativeRelease = (bookingId: string, reason: string, notes: string) => {
    // Find the booking
    const booking = selectedTentatives.find(b => b.id === bookingId);
    if (!booking) return;

    // Get current user (in production, this would come from auth context)
    const currentUser = 'Sales Manager'; // TODO: Replace with actual user from auth
    const now = new Date();

    // Create comprehensive audit log
    const auditLog = {
      timestamp: now.toISOString(),
      userId: 'USER123', // TODO: Get from auth
      userName: currentUser,
      reason: reason,
      notes: notes || '',
      customerName: booking.customerName,
      spaceId: selectedTentativeSpace?.spaceId || '',
      spaceName: selectedTentativeSpace?.name || '',
      eventDate: selectedTentativeDate.toISOString(),
      timeSlot: selectedTentativeTimeSlot,
      bookingDetails: {
        startTime: booking.startTime,
        endTime: booking.endTime,
        guestCount: booking.guestCount,
        contactNumber: booking.contactNumber,
        createdAt: booking.createdAt?.toISOString(),
      },
    };

    // Update booking with release information
    booking.released = true;
    booking.releaseReason = reason as 'declined' | 'no-response' | 'postponed' | 'other';
    booking.releaseNotes = notes;
    booking.releasedAt = now;
    booking.releasedBy = currentUser;
    booking.releaseAuditLog = auditLog;

    console.log('📋 TENTATIVE RELEASE LOGGED:', auditLog);
    console.log('━'.repeat(80));
    console.log('RELEASE SUMMARY:');
    console.log(`Customer: ${booking.customerName}`);
    console.log(`Reason: ${getReleaseReasonLabel(reason)}`);
    console.log(`Notes: ${notes || 'None'}`);
    console.log(`Space: ${selectedTentativeSpace?.name}`);
            console.log(`Date: ${formatDatePK(selectedTentativeDate)}`);
    console.log(`Time: ${booking.startTime} - ${booking.endTime}`);
    console.log(`Released By: ${currentUser}`);
    console.log(`Released At: ${now.toLocaleString()}`);
    console.log('━'.repeat(80));
    
    // TODO: In production:
    // 1. Save release to database with full audit trail
    // 2. Update booking status or mark as archived
    // 3. Send notification to customer (optional - "slot no longer available")
    // 4. Update availability calendar immediately
    // 5. Create analytics entry for conversion tracking
    // 6. Trigger CRM update if integrated

    // Remove from current view (slot becomes available)
    setSelectedTentatives(prev => prev.filter(b => b.id !== bookingId));
    
    // Show success message
    const reasonLabel = getReleaseReasonLabel(reason);
    alert(
      `✅ Tentative Released Successfully!\n\n` +
      `Customer: ${booking.customerName}\n` +
      `Reason: ${reasonLabel}\n` +
      `${notes ? `Notes: ${notes}\n` : ''}` +
      `\nThe slot is now available for immediate booking.\n` +
      `Release has been logged in the audit trail.`
    );

    // Close queue panel if no more tentatives
    if (selectedTentatives.length === 1) {
      setTentativeQueueOpen(false);
    }
  };

  // Helper to get readable release reason label
  const getReleaseReasonLabel = (reason: string): string => {
    switch (reason) {
      case 'declined':
        return 'Customer Declined';
      case 'no-response':
        return 'No Response';
      case 'postponed':
        return 'Postponed';
      case 'other':
        return 'Other Reason';
      default:
        return reason;
    }
  };

  const handleRequestConfirmation = (bookingId: string, timeWindowMinutes: number) => {
    // Find the booking
    const booking = selectedTentatives.find(b => b.id === bookingId);
    if (!booking) return;

    // Get current user (in production, this would come from auth context)
    const currentUser = 'Sales Manager'; // TODO: Replace with actual user from auth

    // Calculate deadline based on custom time window
    const now = new Date();
    const deadline = new Date(now.getTime() + timeWindowMinutes * 60 * 1000);

    // Update booking with confirmation request data
    booking.confirmationRequested = true;
    booking.confirmationRequestedAt = now;
    booking.confirmationRequestedBy = currentUser;
    booking.confirmationDeadline = deadline;
    booking.confirmationWindowMinutes = timeWindowMinutes;
    booking.slotLockedForConfirmation = true;

    // Log the action
    const logEntry = {
      action: 'REQUEST_IMMEDIATE_CONFIRMATION',
      bookingId: booking.id,
      customerName: booking.customerName,
      tentativeId: booking.id,
      userId: currentUser,
      timestamp: now.toISOString(),
      confirmationDeadline: deadline.toISOString(),
      windowMinutes: timeWindowMinutes,
      spaceId: selectedTentativeSpace?.spaceId,
      spaceName: selectedTentativeSpace?.name,
      eventDate: selectedTentativeDate.toISOString(),
      timeSlot: selectedTentativeTimeSlot,
    };

    console.log('🔔 CONFIRMATION REQUEST LOGGED:', logEntry);
    
    // TODO: In production:
    // 1. Save to database
    // 2. Send notification to customer (WhatsApp/Email/SMS)
    // 3. Create audit log entry
    // 4. Set up automatic expiry handler

    // Refresh the queue panel to show countdown
    setSelectedTentatives([...selectedTentatives]);
    
    // Show success message
    alert(
      `✅ Confirmation Request Sent!\n\n` +
      `Customer: ${booking.customerName}\n` +
      `Time Window: ${timeWindowMinutes} minutes\n` +
      `Deadline: ${deadline.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })}\n\n` +
      `The slot is now locked for ${timeWindowMinutes} minutes.\n` +
      `Customer must submit advance payment before the deadline.`
    );
  };

  // Render time cells for a space
  const renderTimeCells = (
    spaceId: string,
    spaceName: string,
    spaceBookings: Booking[],
    isPrime: boolean,
    colorScheme: ReturnType<typeof getPrimeSpaceColors>
  ) => {
    // Helper to convert 24h to 12h format
    const formatTime12h = (time: string): string => {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    // **CRITICAL: Filter to show ONLY CONFIRMED bookings on the timeline**
    // Tentative bookings should NEVER appear on the calendar timeline
    const confirmedOnlyBookings = filterConfirmedOnly(spaceBookings);

    // Filter dayBookings by confirmed only for N/A blocking logic
    const visibleDayBookings = filterConfirmedOnly(dayBookings);

    // Helper to check if a time slot is unavailable (blocked by parent/child booking)
    const isSlotUnavailable = (hour: number): boolean => {
      if (isPrime) {
        // For Prime Space: check if any sub-space has a booking during this hour
        const primeSpace = primeSpaces.find(ps => ps.id === spaceId);
        if (!primeSpace) return false;
        
        return primeSpace.subSpaces.some(subSpace => {
          return visibleDayBookings.some(booking => {
            const hasSubAssignment = getBookingSpaceAssignments(booking).some(
              (assignment) => assignment.assignmentType === 'SUB_ONLY' && assignment.subSpaceId === subSpace.id,
            );
            if (!hasSubAssignment) return false;
            
            const startMinutes = timeToMinutes(booking.startTime);
            const endMinutes = getAdjustedEndMinutes(booking);
            
            // Calculate the hour slot boundaries
            const hourStartMinutes = hour * 60;
            const hourEndMinutes = (hour + 1) * 60;
            
            // Booking blocks this hour if it overlaps with [hourStart, hourEnd)
            // A booking from 13:00 to 16:00 blocks hours 13, 14, 15 but NOT 16
            return startMinutes < hourEndMinutes && endMinutes > hourStartMinutes;
          });
        });
      } else {
        // For Sub-Space: check if parent prime space has a booking during this hour
        const primeSpace = primeSpaces.find(ps => 
          ps.subSpaces.some(ss => ss.id === spaceId)
        );
        if (!primeSpace) return false;
        
        return visibleDayBookings.some(booking => {
          const hasThisPrimeSpace = bookingUsesPrimeSpace(booking, primeSpace.id);
          if (!hasThisPrimeSpace) return false;
          
          const startMinutes = timeToMinutes(booking.startTime);
          const endMinutes = getAdjustedEndMinutes(booking);
          
          // Calculate the hour slot boundaries
          const hourStartMinutes = hour * 60;
          const hourEndMinutes = (hour + 1) * 60;
          
          // Booking blocks this hour if it overlaps with [hourStart, hourEnd)
          // A booking from 13:00 to 16:00 blocks hours 13, 14, 15 but NOT 16
          return startMinutes < hourEndMinutes && endMinutes > hourStartMinutes;
        });
      }
    };

    // Helper to get the blocking booking for an unavailable slot
    const getBlockingBooking = (hour: number): Booking | null => {
      if (isPrime) {
        const primeSpace = primeSpaces.find(ps => ps.id === spaceId);
        if (!primeSpace) return null;
        
        for (const subSpace of primeSpace.subSpaces) {
          const blocking = visibleDayBookings.find(booking => {
            const hasSubAssignment = getBookingSpaceAssignments(booking).some(
              (assignment) => assignment.assignmentType === 'SUB_ONLY' && assignment.subSpaceId === subSpace.id,
            );
            if (!hasSubAssignment) return false;
            
            const startMinutes = timeToMinutes(booking.startTime);
            const endMinutes = getAdjustedEndMinutes(booking);
            const hourStartMinutes = hour * 60;
            const hourEndMinutes = (hour + 1) * 60;
            
            return startMinutes < hourEndMinutes && endMinutes > hourStartMinutes;
          });
          if (blocking) return blocking;
        }
      } else {
        const primeSpace = primeSpaces.find(ps => 
          ps.subSpaces.some(ss => ss.id === spaceId)
        );
        if (!primeSpace) return null;
        
        return visibleDayBookings.find(booking => {
          const hasThisPrimeSpace = bookingUsesPrimeSpace(booking, primeSpace.id);
          if (!hasThisPrimeSpace) return false;
          
          const startMinutes = timeToMinutes(booking.startTime);
          const endMinutes = getAdjustedEndMinutes(booking);
          const hourStartMinutes = hour * 60;
          const hourEndMinutes = (hour + 1) * 60;
          
          return startMinutes < hourEndMinutes && endMinutes > hourStartMinutes;
        }) || null;
      }
      return null;
    };

    return hours.map((hour, hourIndex) => {
      // **REMOVED: Tentative rendering logic - tentatives should NEVER appear on timeline**
      // They are only shown in the right-side "Tentative Events" panel
      
      // Find CONFIRMED booking that covers this hour
      const coveringBooking = confirmedOnlyBookings.find((b) => {
        const startMinutes = timeToMinutes(b.startTime);
        const endMinutes = timeToMinutes(b.endTime); // Use ORIGINAL end time for overnight detection
        const adjustedEndMinutes = getAdjustedEndMinutes(b); // Use adjusted for calculations
        const isOvernight = endMinutes < startMinutes; // Detect overnight using ORIGINAL times
        const isFromPrevDay = isOvernightContinuation(b);
        
        // For overnight events from previous day, only show the early morning portion (0-endTime)
        if (isFromPrevDay) {
          // Only show on hours 0-5 (which are at the end of our hours array)
          const hourStart = hour * 60;
          return hourStart < adjustedEndMinutes;
        }
        
        // For overnight events starting today, we need to handle the wrap-around
        if (isOvernight) {
          // Event spans from startTime to 23:59, then 0:00 to endTime
          const startHour = Math.floor(startMinutes / 60);
          const endHour = Math.floor(endMinutes / 60); // Use original endMinutes
          
          // Check if this hour is covered
          // Either: hour is >= startHour (same day portion: 23, 24, etc.)
          // Or: hour is < 6 AND hour <= endHour (next day portion: 0, 1, 2, etc.)
          if (hour >= startHour) {
            // This is the same-day portion (e.g., 23 PM)
            return true;
          } else if (hour < 6 && hour <= endHour) {
            // This is the next-day portion (e.g., 0, 1, 2 AM up to and including endTime)
            return true;
          }
          return false;
        }
        
        // Normal same-day event
        const hourStart = hour * 60;
        const hourEnd = (hour + 1) * 60;
        // FIXED: Use >= instead of > to include the ending hour when booking ends exactly at hour boundary
        // Example: 1 PM to 4 PM should cover hours 13, 14, 15, and show visual at 16
        return startMinutes < hourEnd && adjustedEndMinutes >= hourStart;
      });

      if (coveringBooking) {
        const startMinutes = timeToMinutes(coveringBooking.startTime);
        let endMinutes = getAdjustedEndMinutes(coveringBooking);
        const isOvernight = endMinutes < startMinutes;
        const isFromPrevDay = isOvernightContinuation(coveringBooking);
        
        // Determine if this is the first cell for this booking
        let isFirstCell = false;
        
        if (isFromPrevDay) {
          // For overnight continuation, first cell is hour 0 (which is after 23 in our array)
          isFirstCell = hour === 0;
        } else {
          const startHour = Math.floor(startMinutes / 60);
          isFirstCell = startHour === hour;
        }
        
        // Calculate booking width in pixels
        let bookingWidthPx = 0;
        
        if (isFromPrevDay) {
          // Show from 0:00 to endTime
          const endHour = Math.floor(endMinutes / 60);
          const endMinutePart = endMinutes % 60;
          let durationInCells = endHour;
          if (endMinutePart > 0) durationInCells += 1;
          bookingWidthPx = durationInCells * 80;
        } else if (isOvernight) {
          // Calculate how many cells from current hour to end of booking
          const startHour = Math.floor(startMinutes / 60);
          const endHour = Math.floor(endMinutes / 60);
          
          if (hour >= startHour) {
            // We're in the same-day portion, calculate to end of day + early morning hours
            // From startHour (e.g., 23) to midnight = (24 - startHour) hours
            // From midnight to endTime (e.g., 0, 1, up to but not including 2) = endHour hours
            // Example: 23:00 to 02:00
            //   - Hours from 23 to midnight: 24 - 23 = 1 cell (hour 23)
            //   - Hours from midnight to 2 AM: Need cells for hours 0, 1, 2 (that's 3 cells)
            //   - We want to show the block extending TO the end time marker
            const hoursToMidnight = 24 - startHour; // e.g., 24 - 23 = 1 cell
            const endMinutePart = endMinutes % 60;
            
            // Count cells needed after midnight
            // We always include the ending hour to show the block extending to that time marker
            // Example: endHour=2 means we need cells 0, 1, 2 (3 cells total)
            let hoursAfterMidnight = endHour + 1;
            
            let totalCells = hoursToMidnight + hoursAfterMidnight;
            bookingWidthPx = totalCells * 80;
          } else {
            // We're in the next-day portion (hours 0-5)
            const endMinutePart = endMinutes % 60;
            let durationInCells = endHour - hour;
            if (endMinutePart > 0) durationInCells += 1;
            bookingWidthPx = durationInCells * 80;
          }
        } else {
          // Normal event within same day
          const startHour = Math.floor(startMinutes / 60);
          const endHour = Math.floor(endMinutes / 60);
          const endMinutePart = endMinutes % 60;
          // We want to show the block extending TO the end time marker
          // Example: 1:00 PM to 4:00 PM should cover cells 13, 14, 15, and extend to 16
          let durationInCells = endHour - startHour + 1;
          bookingWidthPx = durationInCells * 80;
        }

        const statusColor =
          coveringBooking.status === 'confirmed'
            ? 'bg-red-500 text-white'
            : coveringBooking.status === 'tentative'
            ? 'bg-yellow-400 text-gray-900'
            : 'bg-green-500 text-white';

        return (
          <div
            key={`${hour}-${hourIndex}`}
            className={`w-20 h-12 border-r border-gray-200 relative cursor-pointer ${statusColor} transition-opacity ${isFirstCell ? 'overflow-visible' : ''} group`}
            onClick={() => onBookingClick(coveringBooking)}
          >
            {isFirstCell && (
              <>
                {/* Customer Name Display */}
                <div 
                  className="absolute inset-y-0 left-0 flex items-center justify-center px-2 z-10 pointer-events-none"
                  style={{ width: `${bookingWidthPx}px` }}
                >
                  <div className={`text-xs font-semibold w-full text-center leading-tight truncate ${isPrime ? colorScheme.prime.text : colorScheme.sub.text}`}>
                    {coveringBooking.customerName}
                  </div>
                </div>

                {/* Hover Tooltip */}
                <div 
                  className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ width: '240px' }}
                >
                  <div className="bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 border border-gray-700">
                    <div className="space-y-1.5">
                      <div className="font-semibold border-b border-gray-700 pb-1.5 mb-1.5">
                        {coveringBooking.customerName}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Time:</span>
                        <span className="font-medium">{formatTime12h(coveringBooking.startTime)} - {formatTime12h(coveringBooking.endTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Guests:</span>
                        <span className="font-medium">{coveringBooking.guestCount} pax</span>
                      </div>
                      {coveringBooking.totalAmount !== undefined && (
                        <>
                          <div className="border-t border-gray-700 pt-1.5 mt-1.5"></div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total:</span>
                            <span className="font-medium text-blue-400">{formatCurrencyPKR(coveringBooking.totalAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Paid:</span>
                            <span className="font-medium text-green-400">{formatCurrencyPKR(coveringBooking.paidAmount || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Balance:</span>
                            <span className="font-medium text-yellow-400">{formatCurrencyPKR(coveringBooking.balance || 0)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      }

      // Check if this slot is unavailable due to parent/child booking
      const isUnavailable = isSlotUnavailable(hour);

      // Empty cell - available or unavailable
      if (isUnavailable) {
        const blockingBooking = getBlockingBooking(hour);
        
        if (!blockingBooking) {
          // Shouldn't happen, but fallback to simple unavailable cell
          return (
            <div
              key={`${hour}-${hourIndex}`}
              className="w-20 h-12 border-r border-gray-200 bg-gray-200 cursor-not-allowed relative"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, #e5e7eb, #e5e7eb 10px, #f3f4f6 10px, #f3f4f6 20px)'
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-gray-500 text-xs font-medium">N/A</div>
              </div>
            </div>
          );
        }
        
        // Determine if this is the first cell of the N/A block
        const blockingStartMinutes = timeToMinutes(blockingBooking.startTime);
        const blockingEndMinutes = getAdjustedEndMinutes(blockingBooking);
        const blockingStartHour = Math.floor(blockingStartMinutes / 60);
        
        const isFirstNACell = blockingStartHour === hour;
        
        // Calculate N/A block width (same logic as booking blocks)
        let naBlockWidthPx = 0;
        
        if (isFirstNACell) {
          // Use ORIGINAL end time for hour calculation, not adjusted
          const originalEndMinutes = timeToMinutes(blockingBooking.endTime);
          const blockingEndHour = Math.floor(originalEndMinutes / 60); // Use ORIGINAL, not adjusted!
          const endMinutePart = originalEndMinutes % 60;
          
          // Check if this is truly an overnight booking (use ORIGINAL end time, not adjusted)
          const isOvernightBooking = originalEndMinutes < blockingStartMinutes;
          
          if (isOvernightBooking) {
            // Overnight: calculate from current hour to end of day + early morning hours
            const hoursToMidnight = 24 - blockingStartHour;
            const hoursAfterMidnight = blockingEndHour + 1;
            let totalCells = hoursToMidnight + hoursAfterMidnight;
            naBlockWidthPx = totalCells * 80;
          } else {
            // Same-day booking: N/A block should extend TO the end time
            // Example: 1:00 PM to 4:00 PM should show N/A for hours 13, 14, 15, 16 (4 cells)
            // Example: 6:00 PM to 10:00 PM should show N/A for hours 18, 19, 20, 21, 22 (5 cells)
            let durationInCells = blockingEndHour - blockingStartHour + 1;
            naBlockWidthPx = durationInCells * 80;
          }
        }
        
        return (
          <div
            key={`${hour}-${hourIndex}`}
            className={`w-20 h-12 border-r border-gray-200 bg-gray-200 cursor-not-allowed relative ${isFirstNACell ? 'overflow-visible' : ''}`}
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #e5e7eb, #e5e7eb 10px, #f3f4f6 10px, #f3f4f6 20px)'
            }}
          >
            {isFirstNACell ? (
              <>
                {/* N/A Label spanning the full blocked duration */}
                <div 
                  className="absolute inset-y-0 left-0 flex items-center justify-center z-[5] pointer-events-none"
                  style={{ 
                    width: `${naBlockWidthPx}px`,
                    backgroundImage: 'repeating-linear-gradient(45deg, #e5e7eb, #e5e7eb 10px, #f3f4f6 10px, #f3f4f6 20px)'
                  }}
                >
                  <div className="text-gray-500 text-xs font-medium">N/A</div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-0">
                <div className="text-gray-500 text-xs font-medium">N/A</div>
              </div>
            )}
          </div>
        );
      }

      // Available cell - green background
      const formatHourLocal = (hour: number): string => {
        if (hour === 0) return '12 AM';
        if (hour === 12) return '12 PM';
        if (hour < 12) return `${hour} AM`;
        return `${hour - 12} PM`;
      };
      
      return (
        <div
          key={`${hour}-${hourIndex}`}
          className="w-20 h-12 border-r border-gray-200 bg-green-50 hover:bg-green-100 cursor-pointer transition-colors group relative"
          onClick={() => {
            // Determine prime space information
            let primeSpaceId = '';
            let primeSpaceName = '';
            
            if (isPrime) {
              // Clicking on a prime space directly
              primeSpaceId = spaceId;
              primeSpaceName = spaceName;
            } else {
              // Clicking on a sub-space, find its parent prime space
              const parentPrime = primeSpaces.find(ps => 
                ps.subSpaces.some(ss => ss.id === spaceId)
              );
              if (parentPrime) {
                primeSpaceId = parentPrime.id;
                primeSpaceName = parentPrime.name;
              }
            }
            
            onBookingClick(undefined, { 
              spaceId, 
              spaceName, 
              isPrime, 
              hour, 
              date: currentDate, 
              venueId,
              venueName: venue?.name || '',
              primeSpaceId,
              primeSpaceName,
              subSpaceId: isPrime ? undefined : spaceId,
              subSpaceName: isPrime ? undefined : spaceName,
            });
          }}
          title={`Click to book ${spaceName} at ${formatHourLocal(hour)}`}
        >
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="text-green-600 text-lg font-bold">+</div>
          </div>
          
          {/* Tooltip on hover */}
          <div className="absolute left-0 top-full mt-1 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-green-700 text-white text-xs rounded-lg shadow-xl px-3 py-2 whitespace-nowrap">
              <div className="font-semibold">Available - Click to Book</div>
              <div className="text-green-100 mt-0.5">{spaceName} • {formatHourLocal(hour)}</div>
            </div>
          </div>
        </div>
      );
    });
  };

  // Scroll to 11 AM on mount and when date changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Scroll horizontally to 11 AM
      // Hours array: [6, 7, 8, 9, 10, 11, 12, 13, ...] so 11 AM is at index 5
      // Each hour cell is 80px wide (w-20)
      const scrollPosition = 5 * 80; // Index 5 = 11 AM
      scrollContainerRef.current.scrollLeft = scrollPosition;
    }
  }, [currentDate, venueId]);

  if (!venue) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <p className="text-gray-500">Please select a venue</p>
      </div>
    );
  }

  // Calculate confirmed bookings count for today (respect status filter)
  const filteredDayBookings = filterBookingsByView(venueFilteredBookings, statusFilter);
  const confirmedBookingsToday = filteredDayBookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'completed',
  ).length;
  const displayedEventList = filteredDayBookings
    .filter((b) => b.status === 'confirmed' || b.status === 'completed')
    .sort((left, right) => {
      const startDifference = timeToMinutes(left.startTime) - timeToMinutes(right.startTime);
      if (startDifference !== 0) {
        return startDifference;
      }

      return left.customerName.localeCompare(right.customerName);
    });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Legend */}
      <div className="px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-gray-600" />
              <span className="font-semibold text-gray-900">
                {formatDatePK(currentDate)}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onDateChange(new Date())}
                className="h-6 px-2 ml-1 text-xs"
              >
                Today
              </Button>
            </div>
            <div className="w-px h-5 bg-gray-300" />
            <span className="text-gray-600 mr-2">Status:</span>
            <div className="flex items-center gap-2">
              <div className="size-4 bg-green-500 rounded" />
              <span>🟢 Available</span>
            </div>
            <div className="flex items-center gap-2">
              
              
            </div>
            <div className="flex items-center gap-2">
              <div className="size-4 bg-red-500 rounded" />
              <span>🔴 Confirmed</span>
            </div>
          </div>
          
          {/* Booking Counts */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-800 rounded-md border border-red-200">
              <span className="font-semibold">{confirmedBookingsToday}</span>
              <span>{confirmedBookingsToday === 1 ? 'Event' : 'Events'} Today</span>
            </div>
            
            <div className="text-gray-600">
              Total: <span className="font-semibold">{confirmedOnlyBookings.length}</span> {confirmedOnlyBookings.length === 1 ? 'confirmed booking' : 'confirmed bookings'}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="overflow-hidden">
        <div 
          ref={scrollContainerRef}
          className="max-h-[40vh] overflow-auto"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="min-w-max">
            {/* Hour Headers */}
            <div className="flex sticky top-0 z-30 bg-white border-b shadow-sm">
              <div className="w-48 flex-shrink-0 border-r bg-gray-50 p-3 sticky left-0 z-40">
                <span className="text-sm">Prime Space / Sub Space</span>
              </div>
              {hours.map((hour) => {
                // Highlight common event hours (1-4 PM and 6-10 PM)
                const isLunchTime = hour >= 13 && hour <= 16; // 1 PM - 4 PM
                const isDinnerTime = hour >= 18 && hour <= 22; // 6 PM - 10 PM
                const isEventTime = isLunchTime || isDinnerTime;

                return (
                  <div
                    key={hour}
                    className={`w-20 flex-shrink-0 border-r p-2 text-center ${
                      isEventTime ? 'bg-blue-50' : 'bg-gray-50'
                    }`}
                  >
                    <div className={`text-xs ${isEventTime ? 'text-blue-900 font-medium' : 'text-gray-600'}`}>
                      {formatHour(hour)}
                    </div>
                    {isLunchTime && hour === 13 && (
                      <div className="text-[9px] text-blue-600 mt-0.5">Lunch</div>
                    )}
                    {isDinnerTime && hour === 18 && (
                      <div className="text-[9px] text-blue-600 mt-0.5">Dinner</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Space Rows */}
            <div className="divide-y">
              {primeSpaces.map((primeSpace) => {
                const isExpanded = expandedSpaces.has(primeSpace.id);
                const primeSpaceBookings = getPrimeSpaceBookings(
                  primeSpace.id,
                  currentDate,
                  confirmedOnlyBookings  // Use confirmed-only bookings instead of all dayBookings
                );
                
                // Get color scheme for this prime space
                const colorScheme = getPrimeSpaceColors(primeSpace.id);

                // Get only direct prime space bookings (not sub space bookings)
                const directPrimeBookings = primeSpaceBookings.filter(
                  (b) => getBookingSpaceAssignments(b).some(
                    (assignment) => assignment.assignmentType === 'PRIME_FULL' && assignment.primeSpaceId === primeSpace.id,
                  )
                );

                // Apply view filter - check if this prime space should be shown
                const filteredDirectPrimeBookings = filterBookingsByView(directPrimeBookings, statusFilter);
                const showPrimeSpace = shouldShowSpace(directPrimeBookings, statusFilter);
                
                // Check if any sub-spaces have bookings that match the filter
                const subSpacesMatchFilter = primeSpace.subSpaces.some(subSpace => {
                  const subSpaceBookings = getSubSpaceBookings(subSpace.id, currentDate, venueFilteredBookings);
                  return shouldShowSpace(subSpaceBookings, statusFilter);
                });

                // If filtering and neither prime space nor any sub space matches, skip entirely
                if (!showPrimeSpace && !subSpacesMatchFilter) {
                  return null;
                }

                // REMOVED: Hierarchical row hiding - we now only hide at the cell level with N/A
                // All space rows are always visible, conflicts are shown as N/A in individual cells

                return (
                  <div key={primeSpace.id}>
                    {/* Prime Space Row - Always show (conflicts handled at cell level) */}
                    <div className="flex hover:bg-gray-50 relative">
                      {/* Prime Space Name (Sticky) - with space color */}
                      <div
                        className={`w-48 flex-shrink-0 border-r border-l-4 ${colorScheme.prime.border} ${colorScheme.prime.bg} p-3 flex items-center sticky left-0 z-20 cursor-pointer select-none hover:opacity-90 transition-opacity`}
                        onClick={() => toggleSpace(primeSpace.id)}
                      >
                        {/* Expand/Collapse Icon */}
                        <button className="mr-2 text-gray-600 hover:text-gray-900">
                          {isExpanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
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

                      {/* Time Cells */}
                      {renderTimeCells(
                        primeSpace.id,
                        primeSpace.name,
                        filteredDirectPrimeBookings,
                        true,
                        colorScheme
                      )}
                    </div>

                    {/* Sub Space Rows - Show if expanded OR if prime is hidden */}
                    {(isExpanded) &&
                      primeSpace.subSpaces.map((subSpace) => {
                        // REMOVED: Hierarchical row hiding for sub-spaces
                        // Sub-spaces now always show when expanded, conflicts handled at cell level

                        const subSpaceBookings = getSubSpaceBookings(
                          subSpace.id,
                          currentDate,
                          venueFilteredBookings
                        ).filter((b) =>
                          getBookingSpaceAssignments(b).some(
                            (assignment) => assignment.assignmentType === 'SUB_ONLY' && assignment.subSpaceId === subSpace.id,
                          ),
                        );

                        // Apply view filter to sub space bookings
                        const filteredSubSpaceBookings = filterBookingsByView(subSpaceBookings, statusFilter);
                        const showSubSpace = shouldShowSpace(subSpaceBookings, statusFilter);
                        
                        // If filtering and this sub space doesn't match, skip it
                        if (!showSubSpace) {
                          return null;
                        }

                        return (
                          <div
                            key={subSpace.id}
                            className="flex bg-gray-50/50 hover:bg-gray-100/50 relative"
                          >
                            {/* Sub Space Name (Sticky) */}
                            <div className={`w-48 flex-shrink-0 border-r pl-8 pr-3 py-2.5 flex items-center sticky left-0 z-20 ${colorScheme.sub.bg}`}>
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
                            {renderTimeCells(
                              subSpace.id,
                              subSpace.name,
                              filteredSubSpaceBookings,
                              false,
                              colorScheme
                            )}
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
      
      {/* Events List Section - Shows all booked events for the selected day */}
      <div className="border-t-2 border-gray-300 bg-white">
        {/* Fixed Header Section */}
        <div className="sticky top-0 bg-white z-20">
          <div className="px-6 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="size-4 text-blue-600" />
              Events for {formatDatePK(currentDate)} ({displayedEventList.length})
            </h3>
          </div>
          {/* Fixed Table Headers */}
          <div className="px-6">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[160px]" />
                  <col className="w-[250px]" />
                  <col className="w-[170px]" />
                  <col className="w-[170px]" />
                  <col className="w-[120px]" />
                  <col className="w-[140px]" />
                  <col className="w-[140px]" />
                  <col className="w-[140px]" />
                </colgroup>
                <thead>
                  <tr className="border-b-2 border-gray-300 bg-gray-50">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Time</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Customer</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Event Type</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Venue</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-700">Guests</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-700">Total</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-700">Advance</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-700">Balance</th>
                  </tr>
                </thead>
              </table>
            </div>
          </div>
        </div>
        {/* Scrollable Table Body */}
        <div className="max-h-96 overflow-y-auto">
          <div className="overflow-x-auto px-6">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[160px]" />
                <col className="w-[250px]" />
                <col className="w-[170px]" />
                <col className="w-[170px]" />
                <col className="w-[120px]" />
                <col className="w-[140px]" />
                <col className="w-[140px]" />
                <col className="w-[140px]" />
              </colgroup>
              <tbody>
                {displayedEventList.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">
                      No confirmed events for the selected date
                    </td>
                  </tr>
                )}
                {displayedEventList
                  .map((booking) => {
                    const snapshotTotals = (booking as any).currentAgreementSnapshot?.totals;
                    const snapshotPaymentTerms = (booking as any).currentAgreementSnapshot?.paymentTerms;
                    const resolvedTotalAmount =
                      booking.totalAmount ??
                      snapshotTotals?.grandTotal ??
                      (booking as any).totals?.grandTotal ??
                      undefined;
                    const resolvedPaidAmount =
                      snapshotPaymentTerms?.totalReceived ??
                      (booking as any).paymentTerms?.totalReceived ??
                      snapshotPaymentTerms?.advanceReceived ??
                      (booking as any).paymentTerms?.advanceReceived ??
                      booking.paidAmount ??
                      snapshotTotals?.paidAmount ??
                      (booking as any).totals?.paidAmount ??
                      undefined;
                    const resolvedBalanceAmount =
                      booking.balance ??
                      snapshotTotals?.balance ??
                      (booking as any).totals?.balance ??
                      ((resolvedTotalAmount !== undefined || resolvedPaidAmount !== undefined)
                        ? Math.max((resolvedTotalAmount ?? 0) - (resolvedPaidAmount ?? 0), 0)
                        : undefined);

                    // Get prime space name
                    const primeSpace = primeSpaces.find(ps => 
                      booking.primeSpaceIds 
                        ? booking.primeSpaceIds.includes(ps.id)
                        : booking.primeSpaceId === ps.id
                    );
                    
                    // Get sub space name if applicable
                    let spaceName = primeSpace?.name || '';
                    if (booking.subSpaceId) {
                      const subSpace = primeSpace?.subSpaces.find(ss => ss.id === booking.subSpaceId);
                      if (subSpace) {
                        spaceName = `${primeSpace?.name} - ${subSpace.name}`;
                      }
                    }
                    
                    // Format time
                    const formatTime = (time: string): string => {
                      const [hours, minutes] = time.split(':').map(Number);
                      const period = hours >= 12 ? 'PM' : 'AM';
                      const hour12 = hours % 12 || 12;
                      return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
                    };
                    
                    return (
                      <tr 
                        key={booking.id} 
                        className="border-b border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => onBookingClick(booking)}
                      >
                        <td className="py-2 px-3 text-gray-700">
                          <div className="flex items-center gap-1">
                            <Clock className="size-3 text-blue-600" />
                            <span className="font-medium">{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-gray-900">{booking.customerName}</div>
                          {booking.contactNumber && (
                            <div className="text-xs text-gray-500 mt-0.5">{booking.contactNumber}</div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-700">{booking.eventType || '-'}</td>
                        <td className="py-2 px-3 text-gray-700">{spaceName}</td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Users className="size-3.5 text-gray-500" />
                            <span className="font-medium text-gray-700">{booking.guestCount || '-'}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right">
                          {resolvedTotalAmount !== undefined ? (
                            <span className="font-semibold text-gray-900">{formatCurrencyPKR(resolvedTotalAmount)}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {resolvedPaidAmount !== undefined ? (
                            <span className="font-semibold text-green-700">{formatCurrencyPKR(resolvedPaidAmount)}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {resolvedBalanceAmount !== undefined ? (
                            <span className={`font-semibold ${
                              resolvedBalanceAmount === 0 ? 'text-green-700' : 'text-amber-700'
                            }`}>
                              {formatCurrencyPKR(resolvedBalanceAmount)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tentative Queue Panel */}
      {tentativeQueueOpen && selectedTentativeSpace && (
        <TentativeQueuePanel
          tentatives={selectedTentatives}
          spaceInfo={selectedTentativeSpace}
          date={selectedTentativeDate}
          timeSlot={selectedTentativeTimeSlot}
          onPromote={handleTentativePromote}
          onDemote={handleTentativeDemote}
          onConvert={handleTentativeConvert}
          onEdit={handleTentativeEdit}
          onRelease={handleTentativeRelease}
          onRequestConfirmation={handleRequestConfirmation}
          onClose={() => setTentativeQueueOpen(false)}
        />
      )}
    </div>
  );
}
