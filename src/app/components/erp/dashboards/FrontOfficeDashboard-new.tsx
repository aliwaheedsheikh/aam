import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Users,
  AlertTriangle,
  DollarSign,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Utensils,
  Music,
  MapPin,
  Check,
  X,
  FileText,
  ChefHat,
  Radio,
  Filter,
  XCircle,
} from 'lucide-react';
import { Booking } from '../../calendar/types-v2';
import { useEffect, useState } from 'react';
import { CallLogDialog, CallLog } from '../dialogs/CallLogDialog';
import { toast } from 'sonner';
import React from 'react';
import { primeSpaces } from '../../calendar/data-v2';

interface FrontOfficeDashboardProps {
  bookings: Booking[];
  onNavigateToCalendar: () => void;
  onNavigateToTentativeReservations: () => void;
  onNavigateToFollowups: (mode: 'tentative' | 'payment') => void;
  onBookingsChange?: (bookings: Booking[]) => void;
  userName: string;
  canViewPaymentTools: boolean;
}

export function FrontOfficeDashboard({ 
  bookings, 
  onNavigateToCalendar,
  onNavigateToTentativeReservations,
  onNavigateToFollowups,
  onBookingsChange,
  userName,
  canViewPaymentTools,
}: FrontOfficeDashboardProps) {
  const [activeFollowupTab, setActiveFollowupTab] = useState<'payment' | 'menu' | 'tentative'>('payment');
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [callLogDialogOpen, setCallLogDialogOpen] = useState(false);
  const [selectedBookingForCall, setSelectedBookingForCall] = useState<any | null>(null);
  
  // Payment Action Filters
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'critical' | 'high' | 'medium'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [filterMinAdvance, setFilterMinAdvance] = useState(false);
  const [filterOneWeekBefore, setFilterOneWeekBefore] = useState(false);
  const [advanceAmountThreshold, setAdvanceAmountThreshold] = useState<string>('');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getBookingTotal = (booking: any) =>
    Number(booking.totalAmount ?? ((booking.packagePrice || 0) + (booking.extraCharges || 0))) || 0;
  const getPaidAmount = (booking: any) => Number(booking.paidAmount ?? booking.advanceAmount ?? 0) || 0;

  // Helper function to calculate payment status
  const getPaymentStatus = (booking: any): 'clear' | 'partial' | 'pending' => {
    const totalAmount = getBookingTotal(booking);
    const paid = getPaidAmount(booking);
    
    if (totalAmount > 0 && paid >= totalAmount) return 'clear';
    if (paid > 0) return 'partial';
    return 'pending';
  };

  // Helper function to check if minimum advance is paid (30% minimum)
  const hasMinimumAdvance = (booking: any): boolean => {
    const totalAmount = getBookingTotal(booking);
    const minimumAdvance = totalAmount * 0.3;
    const paid = getPaidAmount(booking);
    return paid >= minimumAdvance;
  };

  // Calculate priority based on event date proximity
  const getPriority = (booking: any): 'critical' | 'high' | 'medium' => {
    const bookingDate = new Date(booking.date);
    bookingDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil <= 3) return 'critical';
    if (daysUntil <= 7) return 'high';
    return 'medium';
  };

  // Handle call log
  const handleCallClick = (booking: any) => {
    setSelectedBookingForCall(booking);
    setCallLogDialogOpen(true);
  };

  const handleSaveCallLog = (logData: Omit<CallLog, 'id' | 'callDate'>) => {
    if (!selectedBookingForCall || !onBookingsChange) return;

    const newLog: CallLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      callDate: new Date(),
      ...logData,
    };

    const updatedBookings = bookings.map(b => {
      if (b.id === selectedBookingForCall.id) {
        const existingLogs = (b as any).callLogs || [];
        return {
          ...b,
          callLogs: [...existingLogs, newLog],
          callbackDate: logData.nextActionDate || b.callbackDate,
        };
      }
      return b;
    });

    onBookingsChange(updatedBookings);
    
    toast.success('Call Log Saved!', {
      description: `Follow-up call with ${selectedBookingForCall.customerName} has been recorded.`,
    });

    setCallLogDialogOpen(false);
    setSelectedBookingForCall(null);
  };

  const toggleExpanded = (bookingId: string) => {
    setExpandedBookingId(expandedBookingId === bookingId ? null : bookingId);
  };

  // Event Journey Funnel Data
  const leadsCount = 0; // Placeholder for leads module
  const tentativeCount = bookings.filter(b => b.status === 'tentative').length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const todayCount = bookings.filter(b => {
    const bookingDate = new Date(b.date);
    return bookingDate.toDateString() === new Date().toDateString() && b.status !== 'cancelled';
  }).length;

  // Lifecycle KPIs
  const todayBookings = bookings.filter(b => {
    const bookingDate = new Date(b.date);
    return bookingDate.toDateString() === new Date().toDateString() && b.status !== 'cancelled';
  });

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const upcomingNext7Days = bookings.filter(b => {
    const bookingDate = new Date(b.date);
    bookingDate.setHours(0, 0, 0, 0);
    return bookingDate > today && bookingDate <= nextWeek && b.status !== 'cancelled';
  });

  const tentativeEvents = bookings.filter(b => b.status === 'tentative');
  const reSignRequiredBookings = bookings.filter(
    (booking) => booking.status !== 'cancelled' && booking.agreementStatus === 'Re-sign Required'
  );
  const todayConfirmedBookings = bookings.filter((booking) => {
    if (booking.status !== 'confirmed' && booking.status !== 'completed') return false;
    const bookingDate = new Date(booking.date);
    bookingDate.setHours(0, 0, 0, 0);
    return bookingDate.getTime() === today.getTime();
  });
  const availableSlotsToday = primeSpaces.reduce((count, primeSpace) => {
    const relatedBookings = todayConfirmedBookings.filter((booking) => {
      const matchesPrime =
        booking.primeSpaceId === primeSpace.id ||
        booking.primeSpaceIds?.includes(primeSpace.id);
      const matchesSubSpace = primeSpace.subSpaces.some((subSpace) => booking.subSpaceId === subSpace.id);
      return matchesPrime || matchesSubSpace;
    });

    if (primeSpace.subSpaces.length > 0) {
      const hasFullPrimeBooking = relatedBookings.some(
        (booking) =>
          !booking.subSpaceId &&
          (booking.primeSpaceId === primeSpace.id || booking.primeSpaceIds?.includes(primeSpace.id))
      );

      if (hasFullPrimeBooking) {
        return count;
      }

      const blockedSubSpaces = new Set(
        relatedBookings
          .map((booking) => booking.subSpaceId)
          .filter((subSpaceId): subSpaceId is string => Boolean(subSpaceId))
      );

      return count + Math.max(primeSpace.subSpaces.length - blockedSubSpaces.size, 0);
    }

    const hasPrimeBooking = relatedBookings.some(
      (booking) => booking.primeSpaceId === primeSpace.id || booking.primeSpaceIds?.includes(primeSpace.id)
    );

    return count + (hasPrimeBooking ? 0 : 1);
  }, 0);

  // Risk KPIs
  const paymentsDueNext7Days = bookings.filter(b => {
    if (b.status === 'cancelled') return false;
    const bookingDate = new Date(b.date);
    bookingDate.setHours(0, 0, 0, 0);
    const isInNext7Days = bookingDate > today && bookingDate <= nextWeek;
    const paymentStatus = getPaymentStatus(b);
    return isInNext7Days && paymentStatus !== 'clear';
  });

  const overduePayments = bookings.filter(b => {
    if (b.status === 'cancelled') return false;
    const bookingDate = new Date(b.date);
    bookingDate.setHours(0, 0, 0, 0);
    const isPast = bookingDate < today;
    const paymentStatus = getPaymentStatus(b);
    return isPast && paymentStatus !== 'clear';
  });

  // Payment Action List - sorted by event date
  // Include overdue + next 30 days to capture all priority levels
  const next30Days = new Date(today);
  next30Days.setDate(next30Days.getDate() + 30);
  
  const upcomingPaymentsDue = bookings.filter(b => {
    if (b.status === 'cancelled') return false;
    const bookingDate = new Date(b.date);
    bookingDate.setHours(0, 0, 0, 0);
    const isInNext30Days = bookingDate > today && bookingDate <= next30Days;
    const paymentStatus = getPaymentStatus(b);
    return isInNext30Days && paymentStatus !== 'clear';
  });
  
  const paymentActionList = [...overduePayments, ...upcomingPaymentsDue]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  useEffect(() => {
    if (!canViewPaymentTools && activeFollowupTab === 'payment') {
      setActiveFollowupTab('tentative');
    }
  }, [activeFollowupTab, canViewPaymentTools]);

  // Apply Filters to Payment Action List
  const filteredPaymentList = paymentActionList.filter(booking => {
    // Priority filter
    if (selectedPriority !== 'all' && getPriority(booking) !== selectedPriority) return false;
    
    // Month filter
    if (selectedMonth !== 'all') {
      const bookingMonth = new Date(booking.date).getMonth();
      if (bookingMonth !== parseInt(selectedMonth)) return false;
    }
    
    // Minimum advance filter - Show only those WITHOUT minimum advance
    if (filterMinAdvance && hasMinimumAdvance(booking)) return false;
    
    // One week before filter
    if (filterOneWeekBefore) {
      const bookingDate = new Date(booking.date);
      const daysUntil = Math.ceil((bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil > 7 || daysUntil < 0) return false;
    }
    
    // Advance amount threshold - Show only those with advance LESS than threshold
    if (advanceAmountThreshold) {
      const paid = getPaidAmount(booking);
      const threshold = parseInt(advanceAmountThreshold);
      if (paid >= threshold) return false;
    }
    
    return true;
  });

  // Limit to 10 rows for scroll window
  const displayedPaymentList = filteredPaymentList.slice(0, 10);

  // Count active filters
  const activeFilterCount = 
    (selectedPriority !== 'all' ? 1 : 0) +
    (selectedMonth !== 'all' ? 1 : 0) +
    (filterMinAdvance ? 1 : 0) +
    (filterOneWeekBefore ? 1 : 0) +
    (advanceAmountThreshold ? 1 : 0);

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedPriority('all');
    setSelectedMonth('all');
    setFilterMinAdvance(false);
    setFilterOneWeekBefore(false);
    setAdvanceAmountThreshold('');
  };

  // Follow-up lists
  const paymentFollowups = paymentActionList;
  const menuFinalizationList = bookings.filter(b => {
    if (b.status !== 'confirmed') return false;
    const bookingDate = new Date(b.date);
    bookingDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil > 0 && daysUntil <= 14;
  });
  const tentativeToConfirm = bookings.filter(b => b.status === 'tentative');

  // Get risk chips for a booking
  const getRiskChips = (booking: any) => {
    const chips = [];
    const paymentStatus = getPaymentStatus(booking);
    const hasMinAdvance = hasMinimumAdvance(booking);
    
    if (paymentStatus === 'pending' || !hasMinAdvance) {
      chips.push({ label: 'Advance Pending', color: 'bg-red-100 text-red-700' });
    }
    
    // Menu not final (mock - in real system this would be a field)
    const bookingDate = new Date(booking.date);
    const daysUntil = Math.ceil((bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 7 && daysUntil > 0) {
      chips.push({ label: 'Menu Not Final', color: 'bg-orange-100 text-orange-700' });
    }
    
    return chips;
  };

  // Get last contacted info
  const getLastContacted = (booking: any) => {
    const callLogs = (booking as any).callLogs || [];
    if (callLogs.length === 0) return null;
    
    const lastLog = callLogs.sort((a: CallLog, b: CallLog) => 
      new Date(b.callDate).getTime() - new Date(a.callDate).getTime()
    )[0];
    
    return lastLog;
  };

  // Format time ago
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F5F7FA]">
      {/* Header */}
      <div className="bg-white border-b px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#2E2E2E]">Front Office Dashboard</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {today.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <button
            onClick={onNavigateToCalendar}
            className="rounded-md border border-blue-200 bg-white p-4 text-left transition-colors hover:bg-blue-50"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Workspace</div>
            <div className="mt-1 text-sm font-semibold text-[#2E2E2E]">Confirmed Reservations</div>
            <div className="mt-1 text-xs text-[#6B7280]">Manage booked events, agreements, and event-day readiness.</div>
          </button>
          <button
            onClick={onNavigateToTentativeReservations}
            className="rounded-md border border-amber-200 bg-white p-4 text-left transition-colors hover:bg-amber-50"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Workspace</div>
            <div className="mt-1 text-sm font-semibold text-[#2E2E2E]">Tentative Reservations</div>
            <div className="mt-1 text-xs text-[#6B7280]">Capture inquiries, hold slots, and keep the tentative desk organized.</div>
          </button>
          <button
            onClick={() => onNavigateToFollowups('tentative')}
            className="rounded-md border border-emerald-200 bg-white p-4 text-left transition-colors hover:bg-emerald-50"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Workspace</div>
            <div className="mt-1 text-sm font-semibold text-[#2E2E2E]">Follow-Up Center</div>
            <div className="mt-1 text-xs text-[#6B7280]">Work tentative callbacks and payment follow-ups from one shared queue.</div>
          </button>
        </div>

        {/* Event Journey Funnel */}
        <div className="bg-white rounded-md border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 py-2 text-center">
              <div className="text-2xl font-semibold text-[#2E2E2E]">{leadsCount}</div>
              <div className="text-xs text-[#6B7280] mt-0.5">Leads</div>
            </div>
            <div className="text-gray-300">→</div>
            <button
              onClick={onNavigateToTentativeReservations}
              className="flex-1 rounded py-2 text-center transition-colors hover:bg-amber-50"
            >
              <div className="text-2xl font-semibold text-[#2E2E2E]">{tentativeCount}</div>
              <div className="text-xs text-[#6B7280] mt-0.5">Tentative</div>
            </button>
            <div className="text-gray-300">→</div>
            <button
              onClick={onNavigateToCalendar}
              className="flex-1 rounded py-2 text-center transition-colors hover:bg-blue-50"
            >
              <div className="text-2xl font-semibold text-[#2E2E2E]">{confirmedCount}</div>
              <div className="text-xs text-[#6B7280] mt-0.5">Confirmed</div>
            </button>
            <div className="text-gray-300">→</div>
            <button
              onClick={onNavigateToCalendar}
              className="flex-1 rounded py-2 text-center transition-colors hover:bg-blue-50"
            >
              <div className="text-2xl font-semibold text-blue-600">{todayCount}</div>
              <div className="text-xs text-blue-600 mt-0.5 font-medium">Today</div>
            </button>
          </div>
        </div>

        {/* KPI Section - Split into Lifecycle and Risk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Lifecycle KPIs */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Reservation Overview</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-md border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="size-4 text-[#6B7280]" strokeWidth={2} />
                  <span className="text-xs text-[#6B7280]">Today's Bookings</span>
                </div>
                <div className="text-2xl font-semibold text-[#2E2E2E]">{todayBookings.length}</div>
              </div>
              
              <div className="bg-white rounded-md border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="size-4 text-[#6B7280]" strokeWidth={2} />
                  <span className="text-xs text-[#6B7280]">Available Slots</span>
                </div>
                <div className="text-2xl font-semibold text-[#2E2E2E]">{availableSlotsToday}</div>
              </div>
              
              <div className="bg-white rounded-md border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="size-4 text-[#6B7280]" strokeWidth={2} />
                  <span className="text-xs text-[#6B7280]">Upcoming Events</span>
                </div>
                <div className="text-2xl font-semibold text-[#2E2E2E]">{upcomingNext7Days.length}</div>
              </div>
            </div>
          </div>

          {/* Risk KPIs */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Action Required</h3>
            <div className={`grid gap-3 ${canViewPaymentTools ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <button
                onClick={() => onNavigateToFollowups('tentative')}
                className="rounded-md border border-amber-200 bg-white p-3 text-left transition-colors hover:bg-amber-50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="size-4 text-amber-600" strokeWidth={2} />
                  <span className="text-xs text-amber-700">Pending Confirmations</span>
                </div>
                <div className="text-2xl font-semibold text-amber-700">{tentativeEvents.length}</div>
              </button>

              {canViewPaymentTools && (
                <button
                  onClick={() => onNavigateToFollowups('payment')}
                  className="rounded-md border border-red-200 bg-white p-3 text-left transition-colors hover:bg-red-50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="size-4 text-red-600" strokeWidth={2} />
                    <span className="text-xs text-red-700">Payment Follow-ups</span>
                  </div>
                  <div className="text-2xl font-semibold text-red-700">{paymentActionList.length}</div>
                </button>
              )}

              <div className="bg-white rounded-md border border-red-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="size-4 text-red-600" strokeWidth={2} />
                  <span className="text-xs text-red-700">Re-sign Required</span>
                </div>
                <div className="text-2xl font-semibold text-red-700">{reSignRequiredBookings.length}</div>
                {reSignRequiredBookings.length > 0 && (
                  <div className="text-[10px] text-red-600 mt-1">Manager Attention</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Today's Events - Compact Operational View */}
        {todayBookings.length > 0 && (
          <div className="bg-white rounded-md border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#2E2E2E] flex items-center gap-2">
                <Calendar className="size-4 text-blue-600" />
                Today's Events ({todayBookings.length})
              </h3>
              <button
                onClick={onNavigateToCalendar}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                View Calendar →
              </button>
            </div>
            
            <div className="space-y-3">
              {todayBookings.map((booking) => {
                const totalAmount = getBookingTotal(booking);
                const paid = getPaidAmount(booking);
                const balance = totalAmount - paid;
                const guestsWithFood = booking.guestCount || booking.guests || 0;
                const guestsWithoutFood = Math.floor((booking.guestCount || booking.guests || 0) * 0.1);
                
                // Event progress stages
                const advancePaid = paid > 0;
                const menuFinalized = false; // Mock
                const kitchenSynced = false; // Mock
                const eventLive = true;
                
                return (
                  <div key={booking.id} className="border border-gray-200 rounded-md overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm">{booking.customerName}</div>
                          <div className="text-xs text-blue-100 mt-0.5">
                            {booking.eventType || 'Event'} • {booking.venueName} • {booking.timeSlot}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-3 space-y-2.5">
                      {/* Financial Row */}
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#6B7280]">Total:</span>
                          <span className="font-semibold text-[#2E2E2E]">₨{totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="w-px h-4 bg-gray-300"></div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#6B7280]">Paid:</span>
                          <span className="font-semibold text-green-600">₨{paid.toLocaleString()}</span>
                        </div>
                        <div className="w-px h-4 bg-gray-300"></div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#6B7280]">Balance:</span>
                          <span className={`font-semibold ${balance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₨{balance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      {/* Guests & Services Row */}
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Utensils className="size-3 text-[#6B7280]" />
                          <span className="text-[#6B7280]">Food:</span>
                          <span className="font-medium text-[#2E2E2E]">{guestsWithFood}</span>
                        </div>
                        <div className="w-px h-4 bg-gray-300"></div>
                        <div className="flex items-center gap-1.5">
                          <Users className="size-3 text-[#6B7280]" />
                          <span className="text-[#6B7280]">No Food:</span>
                          <span className="font-medium text-[#2E2E2E]">{guestsWithoutFood}</span>
                        </div>
                        <div className="w-px h-4 bg-gray-300"></div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium flex items-center gap-1">
                            <MapPin className="size-3" />
                            Stage Setup
                          </span>
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium flex items-center gap-1">
                            <Music className="size-3" />
                            DJ/Sound
                          </span>
                        </div>
                      </div>
                      
                      {/* Event Progress Tracker */}
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#6B7280] uppercase tracking-wide">Event Progress:</span>
                          <div className="flex items-center gap-1.5 flex-1">
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
                              advancePaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {advancePaid ? <Check className="size-3" /> : <X className="size-3" />}
                              Advance Paid
                            </div>
                            <div className="text-gray-300">→</div>
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
                              menuFinalized ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {menuFinalized ? <Check className="size-3" /> : <X className="size-3" />}
                              Menu Final
                            </div>
                            <div className="text-gray-300">→</div>
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
                              kitchenSynced ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {kitchenSynced ? <Check className="size-3" /> : <X className="size-3" />}
                              Kitchen Sync
                            </div>
                            <div className="text-gray-300">→</div>
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
                              eventLive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {eventLive ? <Radio className="size-3" /> : <X className="size-3" />}
                              Event Live
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment Action Required Table */}
        {canViewPaymentTools && displayedPaymentList.length > 0 && (
          <div className="bg-white rounded-md border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#2E2E2E] flex items-center gap-2">
                <DollarSign className="size-4 text-red-600" />
                Payment Action Required 
                <span className="text-[#6B7280] font-normal">
                  (Showing {displayedPaymentList.length} of {filteredPaymentList.length})
                </span>
              </h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                >
                  <XCircle className="size-3" />
                  Clear {activeFilterCount} {activeFilterCount === 1 ? 'Filter' : 'Filters'}
                </button>
              )}
            </div>
            
            {/* Filter Bar */}
            <div className="mb-3 p-3 bg-gray-50 rounded-md border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                {/* Priority Filter */}
                <div>
                  <label className="text-[10px] text-[#6B7280] mb-1 block uppercase tracking-wide">Priority</label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value as any)}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white"
                  >
                    <option value="all">All Priorities</option>
                    <option value="critical">Critical Only</option>
                    <option value="high">High Only</option>
                    <option value="medium">Medium Only</option>
                  </select>
                </div>

                {/* Month Filter */}
                <div>
                  <label className="text-[10px] text-[#6B7280] mb-1 block uppercase tracking-wide">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white"
                  >
                    <option value="all">All Months</option>
                    <option value="0">January</option>
                    <option value="1">February</option>
                    <option value="2">March</option>
                    <option value="3">April</option>
                    <option value="4">May</option>
                    <option value="5">June</option>
                    <option value="6">July</option>
                    <option value="7">August</option>
                    <option value="8">September</option>
                    <option value="9">October</option>
                    <option value="10">November</option>
                    <option value="11">December</option>
                  </select>
                </div>

                {/* Advance Threshold */}
                <div>
                  <label className="text-[10px] text-[#6B7280] mb-1 block uppercase tracking-wide">Advance &lt;</label>
                  <input
                    type="number"
                    value={advanceAmountThreshold}
                    onChange={(e) => setAdvanceAmountThreshold(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                  />
                </div>

                {/* Quick Filters */}
                <div className="col-span-2">
                  <label className="text-[10px] text-[#6B7280] mb-1 block uppercase tracking-wide">Quick Filters</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilterMinAdvance(!filterMinAdvance)}
                      className={`flex-1 text-xs px-2 py-1.5 rounded font-medium transition-colors ${
                        filterMinAdvance
                          ? 'bg-red-600 text-white'
                          : 'bg-white border border-gray-300 text-[#6B7280] hover:border-red-600 hover:text-red-600'
                      }`}
                    >
                      No Min Advance
                    </button>
                    <button
                      onClick={() => setFilterOneWeekBefore(!filterOneWeekBefore)}
                      className={`flex-1 text-xs px-2 py-1.5 rounded font-medium transition-colors ${
                        filterOneWeekBefore
                          ? 'bg-orange-600 text-white'
                          : 'bg-white border border-gray-300 text-[#6B7280] hover:border-orange-600 hover:text-orange-600'
                      }`}
                    >
                      Within 7 Days
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-semibold text-[#6B7280] sticky left-0 bg-white">Priority</th>
                    <th className="text-left py-2 px-2 font-semibold text-[#6B7280] sticky left-16 bg-white">Client</th>
                    <th className="text-left py-2 px-2 font-semibold text-[#6B7280]">Event Date</th>
                    <th className="text-left py-2 px-2 font-semibold text-[#6B7280]">Venue</th>
                    <th className="text-left py-2 px-2 font-semibold text-[#6B7280]">Status</th>
                    <th className="text-right py-2 px-2 font-semibold text-[#6B7280]">Advance</th>
                    <th className="text-right py-2 px-2 font-semibold text-[#6B7280]">Total</th>
                    <th className="text-right py-2 px-2 font-semibold text-[#6B7280]">Balance</th>
                    <th className="text-center py-2 px-2 font-semibold text-[#6B7280]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedPaymentList.map((booking) => {
                    const totalAmount = getBookingTotal(booking);
                    const paid = getPaidAmount(booking);
                    const balance = totalAmount - paid;
                    const priority = getPriority(booking);
                    const bookingDate = new Date(booking.date);
                    const daysUntil = Math.ceil((bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const isExpanded = expandedBookingId === booking.id;
                    const callLogs = (booking as any).callLogs || [];
                    
                    const rows = [
                      <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 sticky left-0 bg-white">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            priority === 'critical' 
                              ? 'bg-red-100 text-red-700' 
                              : priority === 'high'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {priority === 'critical' ? 'CRITICAL' : priority === 'high' ? 'HIGH' : 'MEDIUM'}
                          </span>
                        </td>
                        <td className="py-2 px-2 sticky left-16 bg-white">
                          <div className="font-medium text-[#2E2E2E]">{booking.customerName}</div>
                          {booking.phone && <div className="text-[#6B7280] text-[10px]">{booking.phone}</div>}
                        </td>
                        <td className="py-2 px-2">
                          <div className="text-[#2E2E2E]">{bookingDate.toLocaleDateString()}</div>
                          <div className={`text-[10px] ${daysUntil <= 3 ? 'text-red-600' : 'text-[#6B7280]'}`}>
                            {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `In ${daysUntil}d`}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-[#2E2E2E]">{booking.venueName}</td>
                        <td className="py-2 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            balance === 0 
                              ? 'bg-green-100 text-green-700'
                              : paid > 0
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {balance === 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right text-green-600 font-medium">
                          ₨{paid.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-right text-[#2E2E2E] font-medium">
                          ₨{totalAmount.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-red-700">
                          ₨{balance.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleCallClick(booking)}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-medium"
                            >
                              <Phone className="size-3" />
                            </button>
                            {callLogs.length > 0 && (
                              <button
                                onClick={() => toggleExpanded(booking.id)}
                                className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-medium"
                              >
                                {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ];
                    
                    // Add expanded call logs row if applicable
                    if (isExpanded && callLogs.length > 0) {
                      rows.push(
                        <tr key={`${booking.id}-expanded`}>
                          <td colSpan={8} className="py-2 px-4 bg-gray-50">
                            <div className="space-y-2">
                              {callLogs.slice(0, 3).map((log: CallLog) => (
                                <div key={log.id} className="bg-white p-2 rounded border border-gray-200 text-xs">
                                  <div className="flex items-start justify-between mb-1">
                                    <div>
                                      <div className="font-medium text-[#2E2E2E]">
                                        {new Date(log.callDate).toLocaleDateString()} - {log.callerName}
                                      </div>
                                      {log.notes && <div className="text-[#6B7280] mt-0.5">{log.notes}</div>}
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                      log.outcome === 'answered' || log.outcome === 'payment-promised'
                                        ? 'bg-green-100 text-green-700'
                                        : log.outcome === 'callback-scheduled'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {log.outcome}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    
                    return rows;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Follow-up Required */}
          <div className="bg-white rounded-md border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-[#2E2E2E] mb-3">Follow-up Required</h3>
            
            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 mb-3">
              <button
                onClick={() => canViewPaymentTools && setActiveFollowupTab('payment')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-b-2 ${
                  activeFollowupTab === 'payment'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-[#6B7280] hover:text-[#2E2E2E]'
                } ${canViewPaymentTools ? '' : 'hidden'}`}
              >
                Payment Follow-ups ({paymentFollowups.length})
              </button>
              <button
                onClick={() => setActiveFollowupTab('menu')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-b-2 ${
                  activeFollowupTab === 'menu'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-[#6B7280] hover:text-[#2E2E2E]'
                }`}
              >
                Menu Finalization ({menuFinalizationList.length})
              </button>
              <button
                onClick={() => setActiveFollowupTab('tentative')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-b-2 ${
                  activeFollowupTab === 'tentative'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-[#6B7280] hover:text-[#2E2E2E]'
                }`}
              >
                Tentative to Confirm ({tentativeToConfirm.length})
              </button>
            </div>
            
            {/* List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {((activeFollowupTab === 'payment' && canViewPaymentTools) ? paymentFollowups : 
                activeFollowupTab === 'menu' ? menuFinalizationList : 
                tentativeToConfirm).map((booking) => {
                const lastContact = getLastContacted(booking);
                const callCount = ((booking as any).callLogs || []).length;
                const bookingDate = new Date(booking.date);
                const daysUntil = Math.ceil((bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={booking.id} className="border border-gray-200 rounded p-2.5 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <div className="font-medium text-[#2E2E2E] text-xs">{booking.customerName}</div>
                        {lastContact && (
                          <div className="text-[10px] text-[#6B7280] mt-0.5">
                            Last contacted: {getTimeAgo(lastContact.callDate)}
                          </div>
                        )}
                      </div>
                      {callCount > 0 && (
                        <div className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                          {callCount} {callCount === 1 ? 'call' : 'calls'}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-[10px] text-[#6B7280] mt-1">
                      <span>{bookingDate.toLocaleDateString()}</span>
                      <div className="w-px h-3 bg-gray-300"></div>
                      <span>{booking.venueName}</span>
                      {activeFollowupTab === 'payment' && canViewPaymentTools && daysUntil <= 3 && (
                        <>
                          <div className="w-px h-3 bg-gray-300"></div>
                          <span className="text-red-600 font-medium">Urgent</span>
                        </>
                      )}
                    </div>
                    
                    {!lastContact && (
                      <div className="mt-2 px-2 py-1 bg-red-50 border border-red-200 rounded text-[10px] text-red-700">
                        No contact yet - Overdue
                      </div>
                    )}
                  </div>
                );
              })}
              
              {((activeFollowupTab === 'payment' && canViewPaymentTools) ? paymentFollowups : 
                activeFollowupTab === 'menu' ? menuFinalizationList : 
                tentativeToConfirm).length === 0 && (
                <div className="text-center py-8 text-[#6B7280] text-xs">
                  <CheckCircle className="size-8 text-gray-300 mx-auto mb-2" />
                  <p>No follow-ups required</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Events - Next 7 Days */}
          <div className="bg-white rounded-md border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-[#2E2E2E] mb-3 flex items-center gap-2">
              <Clock className="size-4 text-[#6B7280]" />
              Upcoming Events - Next 7 Days ({upcomingNext7Days.length})
            </h3>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {upcomingNext7Days.map((booking) => {
                const riskChips = getRiskChips(booking);
                const bookingDate = new Date(booking.date);
                const daysUntil = Math.ceil((bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={booking.id} className="border border-gray-200 rounded p-2.5 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <div className="font-semibold text-[#2E2E2E] text-xs">{booking.customerName}</div>
                        <div className="text-[10px] text-[#6B7280] mt-0.5">
                          {booking.eventType || 'Event'}
                        </div>
                      </div>
                      <div className="text-[10px] text-[#6B7280]">
                        In {daysUntil}d
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-[10px] text-[#6B7280] mt-1">
                      <Calendar className="size-3" />
                      <span>{bookingDate.toLocaleDateString()}</span>
                      <div className="w-px h-3 bg-gray-300"></div>
                      <MapPin className="size-3" />
                      <span>{booking.venueName}</span>
                    </div>
                    
                    {riskChips.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {riskChips.map((chip, idx) => (
                          <span key={idx} className={`px-2 py-0.5 rounded text-[10px] font-medium ${chip.color}`}>
                            {chip.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {upcomingNext7Days.length === 0 && (
                <div className="text-center py-8 text-[#6B7280] text-xs">
                  <Calendar className="size-8 text-gray-300 mx-auto mb-2" />
                  <p>No events in next 7 days</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Call Log Dialog */}
      <CallLogDialog
        open={callLogDialogOpen}
        onClose={() => {
          setCallLogDialogOpen(false);
          setSelectedBookingForCall(null);
        }}
        onSave={handleSaveCallLog}
        booking={selectedBookingForCall}
        userName={userName}
      />
    </div>
  );
}
