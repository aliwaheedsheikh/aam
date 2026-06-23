import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  Clock3,
  DollarSign,
  Eye,
  History,
  Phone,
  Search,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Booking } from '../../calendar/types-v2';
import { CallLogDialog, CallLog } from '../dialogs/CallLogDialog';
import { formatCurrencyPKR, formatDatePK, formatDateTimePK, formatTimeRangePK } from '../../../lib/locale';

interface TentativeFollowUpModuleProps {
  bookings: Booking[];
  onBookingsChange: (bookings: Booking[]) => void;
  userName: string;
  mode?: 'tentative' | 'payment';
  allowModeSwitch?: boolean;
  canViewPaymentTools?: boolean;
  onOpenConfirmedReservationForm?: (booking: Booking) => void;
}

type FilterType = 'all' | 'overdue-callback' | 'today-callback' | 'this-week' | 'no-callback' | 'high-value' | 'lost-slot';
type MonthFilter = 'all' | number;

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-3 py-2 text-sm text-slate-700 align-middle';

const compactCurrency = (value: number) =>
  formatCurrencyPKR(value, { compact: true, minimumFractionDigits: 1, maximumFractionDigits: 1 });

const monthOptions: Array<{ value: MonthFilter; label: string }> = [
  { value: 'all', label: 'All Months' },
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' },
];

const tentativeFilterOptions: Array<{ value: FilterType; label: string }> = [
  { value: 'all', label: 'All Tentative' },
  { value: 'overdue-callback', label: 'Overdue' },
  { value: 'today-callback', label: 'Due Today' },
  { value: 'this-week', label: 'This Week' },
  { value: 'no-callback', label: 'No Callback' },
  { value: 'high-value', label: 'High Value' },
  { value: 'lost-slot', label: 'Lost Slot' },
];

const paymentFilterOptions: Array<{ value: FilterType; label: string }> = [
  { value: 'all', label: 'All Confirmed' },
  { value: 'overdue-callback', label: 'Past Event' },
  { value: 'today-callback', label: 'Event Today' },
  { value: 'this-week', label: 'Next 7 Days' },
  { value: 'no-callback', label: 'No Contact Log' },
  { value: 'high-value', label: 'High Balance' },
];

const getCallLogs = (booking: Booking) => (((booking as any).callLogs || []) as CallLog[]);

const getBookingTotal = (booking: Booking) =>
  Number(booking.totalAmount ?? ((booking as any).packagePrice || 0) + ((booking as any).extraCharges || 0)) || 0;

const getPaidAmount = (booking: Booking) => Number(booking.paidAmount ?? (booking as any).advanceAmount ?? 0) || 0;

const getPaymentStatus = (booking: Booking): 'clear' | 'partial' | 'pending' => {
  const totalAmount = getBookingTotal(booking);
  const paidAmount = getPaidAmount(booking);

  if (totalAmount > 0 && paidAmount >= totalAmount) return 'clear';
  if (paidAmount > 0) return 'partial';
  return 'pending';
};

const getPaymentBadge = (booking: Booking) => {
  const status = getPaymentStatus(booking);
  const styles = {
    clear: 'bg-emerald-100 text-emerald-700',
    partial: 'bg-amber-100 text-amber-700',
    pending: 'bg-red-100 text-red-700',
  };
  const labels = {
    clear: 'Cleared',
    partial: 'Partial',
    pending: 'Pending',
  };

  return <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${styles[status]}`}>{labels[status]}</span>;
};

const getLeadBadge = (booking: Booking, isLostSlot: boolean, conversion: 'high' | 'medium' | 'low') => {
  if (isLostSlot) {
    return <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-medium bg-rose-100 text-rose-700">Lost slot</span>;
  }

  const styles = {
    high: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-slate-100 text-slate-700',
  };
  const label = booking.followUpStatus || `${conversion} likelihood`;

  return <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${styles[conversion]}`}>{label}</span>;
};

const formatDayDelta = (days: number) => {
  if (days < 0) return `${Math.abs(days)}d past`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days}d`;
};

const getFollowUpStatusFromOutcome = (outcome: CallLog['outcome']): Booking['followUpStatus'] => {
  if (outcome === 'payment-promised') return 'Negotiation';
  if (outcome === 'answered') return 'Contacted';
  return 'Follow-up Required';
};

const getPriorityFromOutcome = (outcome: CallLog['outcome']): Booking['priority'] => {
  if (outcome === 'answered') return 'Medium';
  return 'High';
};

export function TentativeFollowUpModule({
  bookings,
  onBookingsChange,
  userName,
  mode = 'tentative',
  allowModeSwitch = false,
  canViewPaymentTools = false,
  onOpenConfirmedReservationForm,
}: TentativeFollowUpModuleProps) {
  const [activeMode, setActiveMode] = useState<'tentative' | 'payment'>(mode);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [monthFilter, setMonthFilter] = useState<MonthFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [callLogDialogOpen, setCallLogDialogOpen] = useState(false);
  const [selectedBookingForCall, setSelectedBookingForCall] = useState<Booking | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (mode === 'payment' && !canViewPaymentTools) {
      setActiveMode('tentative');
      return;
    }

    setActiveMode(mode);
  }, [canViewPaymentTools, mode]);

  useEffect(() => {
    setActiveFilter('all');
    setMonthFilter('all');
    setSearchQuery('');
    setSelectedBookingId(null);
  }, [activeMode]);

  const currentMode = activeMode === 'payment' && canViewPaymentTools ? 'payment' : 'tentative';

  const getDaysUntilEvent = (booking: Booking): number => {
    const eventDate = new Date(booking.date);
    eventDate.setHours(0, 0, 0, 0);
    return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDaysSinceCallback = (booking: Booking): number | null => {
    if (!booking.callbackDate) return null;
    const callbackDate = new Date(booking.callbackDate);
    callbackDate.setHours(0, 0, 0, 0);
    return Math.ceil((today.getTime() - callbackDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const isLostSlotBooking = (booking: Booking) =>
    booking.status === 'lost-space-taken' ||
    Boolean(booking.released && booking.releaseNotes?.includes('overridden by confirmed reservation'));

  const getPriority = (booking: Booking): 'urgent' | 'high' | 'medium' | 'low' => {
    if (isLostSlotBooking(booking)) return 'urgent';

    const daysUntil = getDaysUntilEvent(booking);
    const daysSince = getDaysSinceCallback(booking);

    if (currentMode === 'payment') {
      const paymentStatus = getPaymentStatus(booking);
      if (paymentStatus !== 'clear' && daysUntil <= 3) return 'urgent';
      if (paymentStatus !== 'clear' && daysUntil <= 7) return 'high';
      return paymentStatus === 'partial' ? 'medium' : 'low';
    }

    if (daysUntil <= 3 || (daysSince !== null && daysSince >= 3)) return 'urgent';
    if (daysUntil <= 7 || (daysSince !== null && daysSince >= 1)) return 'high';
    if (daysUntil <= 14) return 'medium';
    return 'low';
  };

  const getConversionLikelihood = (booking: Booking): 'high' | 'medium' | 'low' => {
    const callLogs = getCallLogs(booking);
    const hasAdvance = getPaidAmount(booking) > 0;
    const hasPromisedPayment = callLogs.some((log) => log.outcome === 'payment-promised');

    if (hasAdvance || hasPromisedPayment) return 'high';
    if (callLogs.length >= 2 || booking.followUpStatus === 'Interested' || booking.followUpStatus === 'Negotiation') return 'medium';
    return 'low';
  };

  const targetBookings = currentMode === 'tentative'
    ? bookings.filter((booking) => booking.status === 'tentative' || booking.status === 'lost-space-taken')
    : bookings.filter((booking) => booking.status === 'confirmed' || booking.status === 'completed');

  const activeTentativeBookings = currentMode === 'tentative'
    ? targetBookings.filter((booking) => booking.status === 'tentative')
    : targetBookings;

  const lostSlotBookings = currentMode === 'tentative'
    ? targetBookings.filter((booking) => isLostSlotBooking(booking))
    : [];

  const overdueCallback = currentMode === 'payment'
    ? targetBookings.filter((booking) => getPaymentStatus(booking) !== 'clear' && getDaysUntilEvent(booking) < 0)
    : activeTentativeBookings.filter((booking) => {
        const daysSince = getDaysSinceCallback(booking);
        return daysSince !== null && daysSince > 0;
      });

  const todayCallback = currentMode === 'payment'
    ? targetBookings.filter((booking) => getPaymentStatus(booking) !== 'clear' && getDaysUntilEvent(booking) === 0)
    : activeTentativeBookings.filter((booking) => {
        if (!booking.callbackDate) return false;
        const callbackDate = new Date(booking.callbackDate);
        callbackDate.setHours(0, 0, 0, 0);
        return callbackDate.getTime() === today.getTime();
      });

  const thisWeekCallback = currentMode === 'payment'
    ? targetBookings.filter((booking) => {
        const daysUntil = getDaysUntilEvent(booking);
        return getPaymentStatus(booking) !== 'clear' && daysUntil > 0 && daysUntil <= 7;
      })
    : activeTentativeBookings.filter((booking) => {
        if (!booking.callbackDate) return false;
        const callbackDate = new Date(booking.callbackDate);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return callbackDate >= today && callbackDate <= weekEnd;
      });

  const noCallback = currentMode === 'payment'
    ? targetBookings.filter((booking) => getCallLogs(booking).length === 0)
    : activeTentativeBookings.filter((booking) => !booking.callbackDate);

  const highValue = currentMode === 'payment'
    ? targetBookings.filter((booking) => Math.max(getBookingTotal(booking) - getPaidAmount(booking), 0) >= 500000)
    : activeTentativeBookings.filter((booking) => getBookingTotal(booking) >= 500000);

  const filteredBookings = useMemo(() => {
    let filtered: Booking[] = [];

    switch (activeFilter) {
      case 'overdue-callback':
        filtered = overdueCallback;
        break;
      case 'today-callback':
        filtered = todayCallback;
        break;
      case 'this-week':
        filtered = thisWeekCallback;
        break;
      case 'no-callback':
        filtered = noCallback;
        break;
      case 'high-value':
        filtered = highValue;
        break;
      case 'lost-slot':
        filtered = lostSlotBookings;
        break;
      default:
        filtered = targetBookings;
    }

    if (monthFilter !== 'all') {
      filtered = filtered.filter((booking) => new Date(booking.date).getMonth() === monthFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((booking) =>
        booking.customerName.toLowerCase().includes(query) ||
        booking.contactNumber?.toLowerCase().includes(query) ||
        booking.customerPhone?.toLowerCase().includes(query) ||
        booking.venueName?.toLowerCase().includes(query) ||
        booking.eventType?.toLowerCase().includes(query)
      );
    }

    return [...filtered].sort((left, right) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const leftPriority = getPriority(left);
      const rightPriority = getPriority(right);

      if (leftPriority !== rightPriority) {
        return priorityOrder[leftPriority] - priorityOrder[rightPriority];
      }

      return getDaysUntilEvent(left) - getDaysUntilEvent(right);
    });
  }, [
    activeFilter,
    highValue,
    lostSlotBookings,
    monthFilter,
    noCallback,
    overdueCallback,
    searchQuery,
    targetBookings,
    thisWeekCallback,
    todayCallback,
  ]);

  const selectedBooking = filteredBookings.find((booking) => booking.id === selectedBookingId) || filteredBookings[0] || null;

  const actionQueue = filteredBookings
    .filter((booking) => {
      if (currentMode === 'payment') {
        return getPaymentStatus(booking) !== 'clear';
      }
      return !isLostSlotBooking(booking);
    })
    .slice(0, 8);

  const metrics = {
    total: targetBookings.length,
    overdue: overdueCallback.length,
    today: todayCallback.length,
    week: thisWeekCallback.length,
    noCallback: noCallback.length,
    highValue: highValue.length,
    value: targetBookings.reduce((sum, booking) => {
      const totalAmount = getBookingTotal(booking);
      return currentMode === 'payment' ? sum + Math.max(totalAmount - getPaidAmount(booking), 0) : sum + totalAmount;
    }, 0),
  };

  const getFocusMeta = (booking: Booking) => {
    const isLostSlot = isLostSlotBooking(booking);
    const daysUntil = getDaysUntilEvent(booking);
    const daysSince = getDaysSinceCallback(booking);

    if (isLostSlot) {
      return {
        label: 'Slot closed',
        detail: booking.releaseNotes || 'Confirmed reservation took this slot.',
        className: 'text-rose-700',
      };
    }

    if (currentMode === 'payment') {
      const balance = Math.max(getBookingTotal(booking) - getPaidAmount(booking), 0);
      if (balance <= 0) {
        return { label: 'Payment clear', detail: 'No balance pending.', className: 'text-emerald-700' };
      }
      if (daysUntil < 0) {
        return { label: 'Past event', detail: `${compactCurrency(balance)} still pending.`, className: 'text-red-700' };
      }
      if (daysUntil <= 7) {
        return { label: 'Collect balance', detail: `${formatDayDelta(daysUntil)} to event.`, className: 'text-amber-700' };
      }
      return { label: 'Payment follow-up', detail: `${compactCurrency(balance)} outstanding.`, className: 'text-slate-700' };
    }

    if (!booking.callbackDate) {
      return { label: 'Schedule callback', detail: 'No next follow-up date set.', className: 'text-amber-700' };
    }
    if (daysSince !== null && daysSince > 0) {
      return { label: 'Overdue callback', detail: `${daysSince}d overdue.`, className: 'text-red-700' };
    }
    if (daysSince === 0) {
      return { label: 'Call today', detail: 'Callback is due today.', className: 'text-amber-700' };
    }
    return { label: 'Next callback', detail: formatDatePK(booking.callbackDate), className: 'text-slate-700' };
  };

  const handleOpenConfirmedReservationForm = (booking: Booking) => {
    if (!onOpenConfirmedReservationForm) {
      toast.error('Confirmed Reservation Form is not connected from this screen.');
      return;
    }

    onOpenConfirmedReservationForm(booking);
  };

  const handleCancelBooking = (booking: Booking) => {
    if (!confirm(`Cancel tentative reservation for ${booking.customerName}?`)) {
      return;
    }

    onBookingsChange(bookings.map((entry) => (entry.id === booking.id ? { ...entry, status: 'cancelled' as const } : entry)));
    toast.success('Tentative reservation cancelled', {
      description: `${booking.customerName} has been removed from the active follow-up queue.`,
    });
  };

  const handleCallClick = (booking: Booking) => {
    setSelectedBookingForCall(booking);
    setCallLogDialogOpen(true);
  };

  const handleSaveCallLog = (logData: Omit<CallLog, 'id' | 'callDate'>) => {
    if (!selectedBookingForCall) return;

    const newLog: CallLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      callDate: new Date(),
      ...logData,
    };
    const changedAt = new Date();
    const nextCallbackDate = logData.nextActionDate || logData.paymentPromiseDate;

    const updatedBookings = bookings.map((booking) => {
      if (booking.id !== selectedBookingForCall.id) {
        return booking;
      }

      const existingLogs = getCallLogs(booking);
      const previousStatus = booking.followUpStatus || 'New';
      const nextStatus = getFollowUpStatusFromOutcome(logData.outcome);

      return {
        ...booking,
        callLogs: [...existingLogs, newLog],
        callbackDate: nextCallbackDate ?? (logData.outcome === 'answered' ? undefined : booking.callbackDate),
        followUpStatus: nextStatus,
        priority: getPriorityFromOutcome(logData.outcome),
        latestFollowUpNote: logData.notes,
        lastFollowUpAt: changedAt,
        lastFollowUpBy: userName,
        lastFollowUpOutcome: logData.outcome,
        changeHistory: [
          ...(booking.changeHistory || []),
          {
            timestamp: changedAt.toISOString(),
            field: 'Follow-up Record',
            oldValue: previousStatus,
            newValue: nextStatus || 'Updated',
            changedBy: userName,
            changeType: 'modified' as const,
          },
        ],
      };
    });

    onBookingsChange(updatedBookings);
    toast.success('Follow-up updated', {
      description: `${selectedBookingForCall.customerName}'s callback record was saved.`,
    });
    setCallLogDialogOpen(false);
    setSelectedBookingForCall(null);
  };

  const activeFilterOptions = currentMode === 'payment' ? paymentFilterOptions : tentativeFilterOptions;
  const heading = currentMode === 'payment' ? 'Confirmed Reservation Payment Follow-up' : 'Tentative Reservation Follow-up';
  const description = currentMode === 'payment'
    ? 'Use the Confirmed Reservation Form to update payment ledger and reservation details.'
    : 'Call customers, record outcomes, and move ready inquiries into the Confirmed Reservation Form.';

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <h1 className="mr-2 text-base font-semibold text-slate-900">{heading}</h1>
          {allowModeSwitch ? (
            <div className="flex gap-1 rounded border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => setActiveMode('tentative')}
                className={`rounded px-3 py-1.5 text-sm font-medium ${
                  currentMode === 'tentative' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-white'
                }`}
              >
                Tentative
              </button>
              {canViewPaymentTools ? (
                <button
                  onClick={() => setActiveMode('payment')}
                  className={`rounded px-3 py-1.5 text-sm font-medium ${
                    currentMode === 'payment' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  Payment
                </button>
              ) : null}
            </div>
          ) : null}
          <select
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value as FilterType)}
            className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            {activeFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))}
            className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search customer, phone, venue, or event"
              className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span><strong className="text-slate-900">Queue:</strong> {metrics.total}</span>
            <span><strong className="text-slate-900">Overdue:</strong> {metrics.overdue}</span>
            <span><strong className="text-slate-900">Today:</strong> {metrics.today}</span>
            <span><strong className="text-slate-900">This Week:</strong> {metrics.week}</span>
            <span><strong className="text-slate-900">{currentMode === 'payment' ? 'No Contact:' : 'No Callback:'}</strong> {metrics.noCallback}</span>
            <span><strong className="text-slate-900">{currentMode === 'payment' ? 'High Balance:' : 'High Value:'}</strong> {metrics.highValue}</span>
            <span><strong className="text-slate-900">{currentMode === 'payment' ? 'Outstanding:' : 'Potential:'}</strong> {compactCurrency(metrics.value)}</span>
            <span><strong className="text-slate-900">User:</strong> {userName}</span>
          </div>
        </div>

        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
          {description}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        {filteredBookings.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-300 bg-white px-6 text-center">
            <div>
              <CheckCircle className="mx-auto mb-3 size-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">
                {currentMode === 'payment' ? 'No payment follow-ups found' : 'No tentative follow-ups found'}
              </p>
              <p className="mt-1 text-xs text-slate-500">Adjust the search or filters to review more records.</p>
            </div>
          </div>
        ) : (
          <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="overflow-hidden rounded border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <h3 className="text-sm font-semibold text-slate-900">Follow-up Register</h3>
                <span className="text-xs text-slate-500">{filteredBookings.length} rows</span>
              </div>
              <div className="h-[calc(100%-41px)] overflow-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Customer</th>
                      <th className={tableHeadClass}>Event</th>
                      <th className={tableHeadClass}>Follow-up Focus</th>
                      <th className={`${tableHeadClass} text-right`}>Financials</th>
                      <th className={tableHeadClass}>Status</th>
                      <th className={`${tableHeadClass} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((booking) => {
                      const isLostSlot = isLostSlotBooking(booking);
                      const callLogs = getCallLogs(booking);
                      const totalAmount = getBookingTotal(booking);
                      const paidAmount = getPaidAmount(booking);
                      const focus = getFocusMeta(booking);
                      const daysUntil = getDaysUntilEvent(booking);
                      const conversion = getConversionLikelihood(booking);
                      const isSelected = selectedBooking?.id === booking.id;

                      return (
                        <tr
                          key={booking.id}
                          onClick={() => setSelectedBookingId(booking.id)}
                          className={`cursor-pointer border-t border-slate-200 hover:bg-slate-50 ${isSelected ? 'bg-blue-50/60' : ''}`}
                        >
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{booking.customerName}</div>
                            <div className="text-xs text-slate-500">{booking.contactNumber || booking.customerPhone || 'No phone'}</div>
                            {callLogs.length > 0 ? (
                              <div className="mt-1 flex items-center gap-1 text-xs text-blue-700">
                                <History className="size-3" />
                                {callLogs.length} follow-up{callLogs.length === 1 ? '' : 's'}
                              </div>
                            ) : null}
                          </td>
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{formatDatePK(booking.date)}</div>
                            <div className="text-xs text-slate-500">{booking.venueName || booking.venueId || 'Venue not set'}</div>
                            <div className="text-xs text-slate-500">{formatTimeRangePK(booking.startTime, booking.endTime)}</div>
                          </td>
                          <td className={tableCellClass}>
                            <div className={`font-medium ${focus.className}`}>{focus.label}</div>
                            <div className="max-w-[260px] truncate text-xs text-slate-500">{focus.detail}</div>
                            <div className="mt-1 text-xs text-slate-500">Event: {formatDayDelta(daysUntil)}</div>
                          </td>
                          <td className={`${tableCellClass} text-right`}>
                            <div className="font-medium text-slate-900">{formatCurrencyPKR(totalAmount)}</div>
                            <div className="text-xs text-slate-500">
                              {currentMode === 'payment'
                                ? `Balance ${formatCurrencyPKR(Math.max(totalAmount - paidAmount, 0), { compact: true })}`
                                : paidAmount > 0
                                  ? `Paid ${formatCurrencyPKR(paidAmount, { compact: true })}`
                                  : 'No payment recorded'}
                            </div>
                          </td>
                          <td className={tableCellClass}>
                            {currentMode === 'payment' ? getPaymentBadge(booking) : getLeadBadge(booking, isLostSlot, conversion)}
                          </td>
                          <td className={`${tableCellClass} text-right`}>
                            {isLostSlot ? (
                              <span className="text-xs font-medium text-rose-700">Closed</span>
                            ) : (
                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleCallClick(booking);
                                  }}
                                  className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  <Phone className="size-3.5" />
                                  Call
                                </button>
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleOpenConfirmedReservationForm(booking);
                                  }}
                                  className="inline-flex h-7 items-center gap-1 rounded bg-blue-600 px-2 text-xs font-medium text-white hover:bg-blue-700"
                                >
                                  {currentMode === 'payment' ? <DollarSign className="size-3.5" /> : <CheckCircle className="size-3.5" />}
                                  {currentMode === 'payment' ? 'Confirm Form' : 'Confirm'}
                                </button>
                                {currentMode === 'tentative' ? (
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleCancelBooking(booking);
                                    }}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-200 text-red-700 hover:bg-red-50"
                                    aria-label="Cancel tentative reservation"
                                  >
                                    <XCircle className="size-3.5" />
                                  </button>
                                ) : null}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid h-full grid-cols-1 gap-4 overflow-hidden">
              <section className="overflow-hidden rounded border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                  <h3 className="text-sm font-semibold text-slate-900">Action Queue</h3>
                  <Clock3 className="size-4 text-slate-400" />
                </div>
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Customer</th>
                        <th className={tableHeadClass}>Focus</th>
                        <th className={`${tableHeadClass} text-right`}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionQueue.map((booking) => {
                        const focus = getFocusMeta(booking);
                        return (
                          <tr
                            key={booking.id}
                            onClick={() => setSelectedBookingId(booking.id)}
                            className="cursor-pointer border-t border-slate-200 hover:bg-slate-50"
                          >
                            <td className={tableCellClass}>
                              <div className="font-medium text-slate-900">{booking.customerName}</div>
                              <div className="text-xs text-slate-500">{booking.contactNumber || booking.customerPhone || '-'}</div>
                            </td>
                            <td className={tableCellClass}>
                              <div className={`font-medium ${focus.className}`}>{focus.label}</div>
                              <div className="text-xs text-slate-500">{focus.detail}</div>
                            </td>
                            <td className={`${tableCellClass} text-right`}>
                              {booking.callbackDate ? formatDatePK(booking.callbackDate) : formatDatePK(booking.date)}
                            </td>
                          </tr>
                        );
                      })}
                      {actionQueue.length === 0 ? (
                        <tr>
                          <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={3}>
                            No active records need action.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="overflow-hidden rounded border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                  <h3 className="text-sm font-semibold text-slate-900">Selected Record</h3>
                  <Eye className="size-4 text-slate-400" />
                </div>
                {selectedBooking ? (
                  <div className="space-y-4 overflow-auto p-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{selectedBooking.customerName}</div>
                      <div className="text-xs text-slate-500">
                        {selectedBooking.eventType || 'Event'} on {formatDatePK(selectedBooking.date)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Venue</div>
                        <div className="mt-1 text-slate-900">{selectedBooking.venueName || selectedBooking.venueId || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time</div>
                        <div className="mt-1 text-slate-900">{formatTimeRangePK(selectedBooking.startTime, selectedBooking.endTime)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Guests</div>
                        <div className="mt-1 text-slate-900">{selectedBooking.guestCount || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Balance</div>
                        <div className="mt-1 text-slate-900">
                          {formatCurrencyPKR(Math.max(getBookingTotal(selectedBooking) - getPaidAmount(selectedBooking), 0), { compact: true })}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!isLostSlotBooking(selectedBooking) ? (
                        <>
                          <button
                            onClick={() => handleCallClick(selectedBooking)}
                            className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Phone className="size-3.5" />
                            Call Customer
                          </button>
                          <button
                            onClick={() => handleOpenConfirmedReservationForm(selectedBooking)}
                            className="inline-flex h-8 items-center gap-1 rounded bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            <CheckCircle className="size-3.5" />
                            Open Confirmed Form
                          </button>
                        </>
                      ) : (
                        <div className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                          {selectedBooking.releaseNotes || 'This tentative record is closed because the slot is already confirmed.'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-900">Follow-up History</h4>
                        <span className="text-xs text-slate-500">{getCallLogs(selectedBooking).length} logs</span>
                      </div>
                      {getCallLogs(selectedBooking).length > 0 ? (
                        <div className="max-h-48 space-y-2 overflow-auto">
                          {getCallLogs(selectedBooking).slice().reverse().map((log) => (
                            <div key={log.id} className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-medium text-slate-900">{log.outcome.replace(/-/g, ' ')}</div>
                                  <div className="text-xs text-slate-500">{formatDateTimePK(log.callDate)} by {log.callerName}</div>
                                </div>
                                {log.nextActionDate ? (
                                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                    Next {formatDatePK(log.nextActionDate)}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-2 text-xs text-slate-600">{log.notes}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                          No callback has been recorded yet.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-sm text-slate-500">Select a row to review follow-up details.</div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>

      <CallLogDialog
        isOpen={callLogDialogOpen}
        onClose={() => {
          setCallLogDialogOpen(false);
          setSelectedBookingForCall(null);
        }}
        customerName={selectedBookingForCall?.customerName || ''}
        bookingId={selectedBookingForCall?.id || ''}
        existingLogs={selectedBookingForCall ? getCallLogs(selectedBookingForCall) : []}
        onSaveLog={handleSaveCallLog}
        loggedInUserName={userName}
        mode={currentMode}
      />
    </div>
  );
}
