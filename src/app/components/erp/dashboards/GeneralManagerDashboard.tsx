import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Banknote,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Clock,
  Utensils,
  Package,
  Truck,
  UserCheck,
  XCircle,
  Bell,
} from 'lucide-react';
import { Booking } from '../../calendar/types-v2';
import { ApprovalDialog } from '../dialogs/ApprovalDialog';
import { toast } from 'sonner';
import { Amount } from '../../design-system';
import { formatCurrencyPKR, formatDatePK } from '../../../lib/locale';

interface GeneralManagerDashboardProps {
  bookings: Booking[];
  onBookingsChange: (bookings: Booking[]) => void;
  userName: string;
}

type KPICard = {
  title: string;
  value: string;
  change: number;
  icon: any;
  color: string;
  bgColor: string;
  textColor: string;
};

export function GeneralManagerDashboard({ bookings, onBookingsChange, userName }: GeneralManagerDashboardProps) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Calculate KPIs
  const todayBookings = bookings.filter(b => {
    const bookingDate = new Date(b.date);
    return bookingDate.toDateString() === today.toDateString() && b.status !== 'cancelled';
  });

  const thisMonthBookings = bookings.filter(b => {
    const bookingDate = new Date(b.date);
    return (
      bookingDate.getMonth() === currentMonth &&
      bookingDate.getFullYear() === currentYear &&
      b.status !== 'cancelled'
    );
  });

  const confirmedBookings = thisMonthBookings.filter(b => b.status === 'confirmed').length;
  const tentativeBookings = thisMonthBookings.filter(b => b.status === 'tentative').length;
  
  const totalRevenue = thisMonthBookings
    .filter(b => b.status === 'confirmed')
    .reduce((sum, b) => sum + ((b.packagePrice || 0) + (b.extraCharges || 0)), 0);

  const avgBookingValue = confirmedBookings > 0 ? totalRevenue / confirmedBookings : 0;

  const kpiCards: KPICard[] = [
    {
      title: 'Today\'s Events',
      value: todayBookings.length.toString(),
      change: 12,
      icon: Calendar,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrencyPKR(totalRevenue, { compact: true }),
      change: 18,
      icon: Banknote,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Confirmed Bookings',
      value: confirmedBookings.toString(),
      change: 8,
      icon: CheckCircle,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'Tentative Bookings',
      value: tentativeBookings.toString(),
      change: -5,
      icon: Clock,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
    },
    {
      title: 'Avg Booking Value',
      value: formatCurrencyPKR(avgBookingValue, { compact: true }),
      change: 15,
      icon: TrendingUp,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
    },
    {
      title: 'Low Stock Items',
      value: '8',
      change: -2,
      icon: AlertTriangle,
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
    },
  ];

  const departmentStats = [
    {
      name: 'Front Office',
      status: 'operational',
      bookingsToday: todayBookings.length,
      pendingFollowups: tentativeBookings,
      activeStaff: 5,
      icon: Users,
      color: 'blue',
    },
    {
      name: 'Kitchen',
      status: 'operational',
      eventsToday: todayBookings.length,
      ingredientsLow: 8,
      activeStaff: 15,
      icon: Utensils,
      color: 'orange',
    },
    {
      name: 'Accounts',
      status: 'operational',
      pendingInvoices: 12,
      pendingPayments: 8,
      todayCollection: 450000,
      icon: Banknote,
      color: 'green',
    },
    {
      name: 'Inventory',
      status: 'needs-attention',
      totalItems: 250,
      lowStockItems: 8,
      pendingOrders: 3,
      icon: Package,
      color: 'purple',
    },
    {
      name: 'Transport',
      status: 'operational',
      activeVehicles: 8,
      inMaintenance: 2,
      scheduledTrips: 6,
      icon: Truck,
      color: 'cyan',
    },
  ];

  const recentAlerts = [
    { type: 'warning', message: 'Low stock: Tomatoes (15kg remaining)', time: '10 mins ago', module: 'Inventory' },
    { type: 'info', message: '3 tentative bookings need follow-up today', time: '30 mins ago', module: 'Front Office' },
    { type: 'success', message: `Payment received: ${formatCurrencyPKR(250000)} from Yasir Wedding`, time: '1 hour ago', module: 'Accounts' },
    { type: 'warning', message: 'Vehicle #5 maintenance due in 2 days', time: '2 hours ago', module: 'Transport' },
    { type: 'info', message: 'New booking inquiry: 300 guests for Feb 15', time: '3 hours ago', module: 'Front Office' },
  ];

  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [approvalTab, setApprovalTab] = useState<'pending' | 'approved'>('pending');

  // Get bookings pending approval
  const pendingApprovals = bookings.filter(b => b.approvalStatus === 'pending');

  // Get approved bookings
  const approvedBookings = bookings.filter(b => b.approvalStatus === 'approved');

  // Get bookings with expired grace periods
  const expiredGracePeriods = bookings.filter(b => {
    if (!b.gracePeriodEndDate || b.approvalStatus !== 'approved') return false;
    const gracePeriodEnd = new Date(b.gracePeriodEndDate);
    gracePeriodEnd.setHours(0, 0, 0, 0);
    return gracePeriodEnd < today && (b.paidAmount || 0) < (b.totalAmount || 0);
  });

  // Get bookings with grace period expiring soon (within 3 days)
  const gracePeriodExpiringSoon = bookings.filter(b => {
    if (!b.gracePeriodEndDate || b.approvalStatus !== 'approved') return false;
    const gracePeriodEnd = new Date(b.gracePeriodEndDate);
    gracePeriodEnd.setHours(0, 0, 0, 0);
    const daysUntilExpiry = Math.ceil((gracePeriodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 3 && (b.paidAmount || 0) < (b.totalAmount || 0);
  });

  const handleApprovalClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setApprovalDialogOpen(true);
  };

  const handleApproveBooking = (bookingId: string, gracePeriodDays: number, approvalNotes: string, approverName: string) => {
    const updatedBookings = bookings.map(b => {
      if (b.id === bookingId) {
        const gracePeriodEndDate = new Date();
        gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + gracePeriodDays);
        
        return {
          ...b,
          status: 'confirmed' as const,
          approvalStatus: 'approved' as const,
          approvedBy: approverName,
          approvalDate: new Date(),
          gracePeriodDays: gracePeriodDays,
          gracePeriodEndDate: gracePeriodEndDate,
          approvalNotes: approvalNotes,
        };
      }
      return b;
    });

    if (onBookingsChange && typeof onBookingsChange === 'function') {
      onBookingsChange(updatedBookings);
    }
    
    // Switch to approved tab to show the newly approved booking
    setApprovalTab('approved');
    
    toast.success('Booking Approved!', {
      description: `Booking approved with ${gracePeriodDays} days grace period. Customer must pay by ${formatDatePK(new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000))}.`,
    });
  };

  const handleRejectBooking = (bookingId: string, rejectionReason: string, approverName: string) => {
    const updatedBookings = bookings.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          approvalStatus: 'rejected' as const,
          approvedBy: approverName,
          approvalDate: new Date(),
          approvalNotes: `REJECTED: ${rejectionReason}`,
          status: 'cancelled' as const, // Cancel the booking when rejected
        };
      }
      return b;
    });

    if (onBookingsChange && typeof onBookingsChange === 'function') {
      onBookingsChange(updatedBookings);
    }
    toast.error('Booking Rejected', {
      description: `Booking has been rejected and cancelled. Reason: ${rejectionReason}`,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">General Manager Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Overview of all operations - {formatDatePK(today)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-xs text-green-600 font-medium">System Status</div>
              <div className="text-sm font-bold text-green-700">All Systems Operational</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpiCards.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div key={idx} className="bg-white rounded-lg border p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">{kpi.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mb-2">{kpi.value}</p>
                    <div className="flex items-center gap-1">
                      {kpi.change > 0 ? (
                        <TrendingUp className="size-4 text-green-600" />
                      ) : (
                        <TrendingDown className="size-4 text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${
                        kpi.change > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {kpi.change > 0 ? '+' : ''}{kpi.change}% from last month
                      </span>
                    </div>
                  </div>
                  <div className={`${kpi.bgColor} p-3 rounded-lg`}>
                    <Icon className={`size-6 ${kpi.textColor}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CRITICAL: Pending Approvals Section */}
        {(pendingApprovals.length > 0 || approvedBookings.length > 0) && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-600 rounded-lg">
                  <UserCheck className="size-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Approval Management</h2>
                  <p className="text-sm text-gray-600">
                    Review and track booking approvals
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pendingApprovals.length > 0 && (
                  <span className="px-4 py-2 bg-orange-600 text-white rounded-full text-lg font-bold">
                    {pendingApprovals.length} Pending
                  </span>
                )}
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-4 border-b border-orange-200">
              <button
                onClick={() => setApprovalTab('pending')}
                className={`px-4 py-2 font-semibold transition-all ${
                  approvalTab === 'pending'
                    ? 'text-orange-700 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-orange-600'
                }`}
              >
                ⚠️ Pending Approvals ({pendingApprovals.length})
              </button>
              <button
                onClick={() => setApprovalTab('approved')}
                className={`px-4 py-2 font-semibold transition-all ${
                  approvalTab === 'approved'
                    ? 'text-green-700 border-b-2 border-green-600'
                    : 'text-gray-600 hover:text-green-600'
                }`}
              >
                ✅ Approved ({approvedBookings.length})
              </button>
            </div>

            {/* Pending Approvals Tab Content */}
            {approvalTab === 'pending' && (
              <div className="space-y-3">
                {pendingApprovals.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
                    <CheckCircle className="size-12 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold">No Pending Approvals</p>
                    <p className="text-sm">All bookings are either approved or have sufficient advance payment</p>
                  </div>
                ) : (
                  pendingApprovals.map((booking) => {
                    const totalAmount = booking.totalAmount || 0;
                    const advanceAmount = (booking as any).advanceAmount || 0;
                    const daysUntilEvent = Math.ceil((new Date(booking.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    return (
                      <div key={booking.id} className="bg-white border-2 border-orange-200 rounded-lg p-4 hover:shadow-lg transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-bold text-gray-900">{booking.customerName}</h4>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                    advanceAmount === 0 
                                      ? 'bg-red-100 text-red-700' 
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {advanceAmount === 0 ? '🚨 NO ADVANCE' : '⚠️ LOW ADVANCE'}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                                  <div>
                                    <p className="text-gray-600 text-xs">Event Date</p>
                                    <p className="font-semibold text-gray-900">
                                      {formatDatePK(booking.date)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {daysUntilEvent < 0 ? `${Math.abs(daysUntilEvent)}d past` :
                                       daysUntilEvent === 0 ? 'TODAY' :
                                       daysUntilEvent === 1 ? 'TOMORROW' :
                                       `in ${daysUntilEvent} days`}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 text-xs">Total Amount</p>
                                    <Amount value={totalAmount} bold />
                                  </div>
                                  <div>
                                    <p className="text-gray-600 text-xs">Advance Received</p>
                                    <Amount value={advanceAmount} variant={advanceAmount === 0 ? "negative" : "highlight"} bold />
                                  </div>
                                  <div>
                                    <p className="text-gray-600 text-xs">Outstanding</p>
                                    <Amount value={totalAmount - advanceAmount} variant="negative" bold />
                                  </div>
                                </div>

                                {booking.approvalNotes && (
                                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                                    <p className="text-xs text-yellow-900">
                                      <span className="font-semibold">Reason:</span> {booking.approvalNotes}
                                    </p>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                  <p>📍 {(booking as any).venueName}</p>
                                  <p>🕐 {booking.startTime} - {booking.endTime}</p>
                                  <p>👥 {booking.guestCount} guests</p>
                                  <p>📞 {booking.contactNumber}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            <button
                              onClick={() => handleApprovalClick(booking)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                            >
                              <CheckCircle className="size-4" />
                              Review & Approve
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Approved Bookings Tab Content */}
            {approvalTab === 'approved' && (
              <div className="space-y-3">
                {approvedBookings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
                    <UserCheck className="size-12 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold">No Approved Bookings</p>
                    <p className="text-sm">Approved bookings will appear here</p>
                  </div>
                ) : (
                  approvedBookings.map((booking) => {
                    const totalAmount = booking.totalAmount || 0;
                    const advanceAmount = (booking as any).advanceAmount || 0;
                    const paidAmount = booking.paidAmount || 0;
                    const daysUntilEvent = Math.ceil((new Date(booking.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const gracePeriodEnd = booking.gracePeriodEndDate ? new Date(booking.gracePeriodEndDate) : null;
                    const daysUntilGracePeriodEnd = gracePeriodEnd 
                      ? Math.ceil((gracePeriodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                      : null;

                    return (
                      <div key={booking.id} className="bg-white border-2 border-green-200 rounded-lg p-4 hover:shadow-lg transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-bold text-gray-900">{booking.customerName}</h4>
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                    ✅ APPROVED
                                  </span>
                                  {daysUntilGracePeriodEnd !== null && daysUntilGracePeriodEnd >= 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                      daysUntilGracePeriodEnd <= 3 
                                        ? 'bg-orange-100 text-orange-700' 
                                        : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {daysUntilGracePeriodEnd} days grace left
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mb-3">
                                  <div>
                                    <p className="text-gray-600 text-xs">Event Date</p>
                                    <p className="font-semibold text-gray-900">
                                      {formatDatePK(booking.date)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {daysUntilEvent < 0 ? `${Math.abs(daysUntilEvent)}d past` :
                                       daysUntilEvent === 0 ? 'TODAY' :
                                       daysUntilEvent === 1 ? 'TOMORROW' :
                                       `in ${daysUntilEvent} days`}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 text-xs">Total</p>
                                    <Amount value={totalAmount} bold />
                                  </div>
                                  <div>
                                    <p className="text-gray-600 text-xs">Paid</p>
                                    <Amount value={paidAmount} variant="positive" bold />
                                  </div>
                                  <div>
                                    <p className="text-gray-600 text-xs">Outstanding</p>
                                    <Amount value={totalAmount - paidAmount} variant="negative" bold />
                                  </div>
                                  {gracePeriodEnd && (
                                    <div>
                                      <p className="text-gray-600 text-xs">Payment Deadline</p>
                                      <p className="font-semibold text-orange-600">
                                        {formatDatePK(gracePeriodEnd)}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <div className="bg-green-50 border border-green-200 rounded p-2 mb-3">
                                  <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                      <span className="text-green-900 font-semibold">Approved by:</span>
                                      <span className="text-green-800 ml-1">{booking.approvedBy || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span className="text-green-900 font-semibold">Approved on:</span>
                                      <span className="text-green-800 ml-1">
                                        {booking.approvalDate 
                                          ? formatDatePK(booking.approvalDate)
                                          : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-green-900 font-semibold">Grace Period:</span>
                                      <span className="text-green-800 ml-1">{booking.gracePeriodDays || 0} days</span>
                                    </div>
                                  </div>
                                  {booking.approvalNotes && (
                                    <p className="text-xs text-green-900 mt-2">
                                      <span className="font-semibold">Notes:</span> {booking.approvalNotes}
                                    </p>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                  <p>📍 {(booking as any).venueName}</p>
                                  <p>🕐 {booking.startTime} - {booking.endTime}</p>
                                  <p>👥 {booking.guestCount} guests</p>
                                  <p>📞 {booking.contactNumber}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* CRITICAL: Grace Period Alerts */}
        {(expiredGracePeriods.length > 0 || gracePeriodExpiringSoon.length > 0) && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-600 rounded-lg animate-pulse">
                <Bell className="size-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">🔴 Grace Period Alerts</h2>
                <p className="text-sm text-gray-600">
                  {expiredGracePeriods.length} expired • {gracePeriodExpiringSoon.length} expiring soon
                </p>
              </div>
            </div>

            {/* Expired Grace Periods */}
            {expiredGracePeriods.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="size-5" />
                  🚨 OVERDUE - Payment Grace Period Expired ({expiredGracePeriods.length})
                </h3>
                <div className="space-y-2">
                  {expiredGracePeriods.map((booking) => {
                    const totalAmount = booking.totalAmount || 0;
                    const paidAmount = booking.paidAmount || 0;
                    const gracePeriodEnd = new Date(booking.gracePeriodEndDate!);
                    const daysOverdue = Math.ceil((today.getTime() - gracePeriodEnd.getTime()) / (1000 * 60 * 60 * 24));

                    return (
                      <div key={booking.id} className="bg-white border-2 border-red-300 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-bold text-gray-900">{booking.customerName}</h4>
                              <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-xs font-bold animate-pulse">
                                {daysOverdue} DAYS OVERDUE
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                              <div>
                                <p className="text-gray-600 text-xs">Event Date</p>
                                <p className="font-semibold text-gray-900">
                                  {formatDatePK(booking.date)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600 text-xs">Total</p>
                                <Amount value={totalAmount} bold />
                              </div>
                              <div>
                                <p className="text-gray-600 text-xs">Paid</p>
                                <Amount value={paidAmount} variant="positive" bold />
                              </div>
                              <div>
                                <p className="text-gray-600 text-xs">Outstanding</p>
                                <Amount value={totalAmount - paidAmount} variant="negative" bold />
                              </div>
                              <div>
                                <p className="text-gray-600 text-xs">Payment Deadline</p>
                                <p className="font-semibold text-red-600">
                                  {formatDatePK(gracePeriodEnd)}
                                </p>
                              </div>
                            </div>
                            {booking.approvalNotes && (
                              <p className="text-xs text-gray-600 mt-2 italic">
                                <span className="font-semibold">Approval Conditions:</span> {booking.approvalNotes}
                              </p>
                            )}
                          </div>
                          <div className="ml-4">
                            <span className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold">
                              URGENT CALL
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Expiring Soon */}
            {gracePeriodExpiringSoon.length > 0 && (
              <div>
                <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                  <Clock className="size-5" />
                  ⚠️ Expiring Soon - Within 3 Days ({gracePeriodExpiringSoon.length})
                </h3>
                <div className="space-y-2">
                  {gracePeriodExpiringSoon.map((booking) => {
                    const totalAmount = booking.totalAmount || 0;
                    const paidAmount = booking.paidAmount || 0;
                    const gracePeriodEnd = new Date(booking.gracePeriodEndDate!);
                    const daysRemaining = Math.ceil((gracePeriodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    return (
                      <div key={booking.id} className="bg-white border-2 border-orange-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-bold text-gray-900">{booking.customerName}</h4>
                              <span className="px-2 py-0.5 bg-orange-500 text-white rounded-full text-xs font-bold">
                                {daysRemaining} {daysRemaining === 1 ? 'DAY' : 'DAYS'} LEFT
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                              <div>
                                <p className="text-gray-600 text-xs">Event Date</p>
                                <p className="font-semibold text-gray-900">
                                  {formatDatePK(booking.date)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600 text-xs">Total</p>
                                <Amount value={totalAmount} bold />
                              </div>
                              <div>
                                <p className="text-gray-600 text-xs">Paid</p>
                                <Amount value={paidAmount} variant="positive" bold />
                              </div>
                              <div>
                                <p className="text-gray-600 text-xs">Outstanding</p>
                                <Amount value={totalAmount - paidAmount} variant="negative" bold />
                              </div>
                              <div>
                                <p className="text-gray-600 text-xs">Payment Deadline</p>
                                <p className="font-semibold text-orange-600">
                                  {formatDatePK(gracePeriodEnd)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="ml-4">
                            <span className="px-3 py-2 bg-orange-500 text-white rounded-lg text-xs font-bold">
                              FOLLOW UP
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Department Status Grid */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Department Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departmentStats.map((dept, idx) => {
              const Icon = dept.icon;
              return (
                <div key={idx} className="bg-white rounded-lg border p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-${dept.color}-50 rounded-lg`}>
                        <Icon className={`size-5 text-${dept.color}-600`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          dept.status === 'operational' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {dept.status === 'operational' ? '● Operational' : '● Needs Attention'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {dept.name === 'Front Office' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bookings Today:</span>
                          <span className="font-semibold">{dept.bookingsToday}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pending Follow-ups:</span>
                          <span className="font-semibold">{dept.pendingFollowups}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Active Staff:</span>
                          <span className="font-semibold">{dept.activeStaff}</span>
                        </div>
                      </>
                    )}

                    {dept.name === 'Kitchen' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Events Today:</span>
                          <span className="font-semibold">{dept.eventsToday}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Low Stock Items:</span>
                          <span className="font-semibold text-red-600">{dept.ingredientsLow}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Active Staff:</span>
                          <span className="font-semibold">{dept.activeStaff}</span>
                        </div>
                      </>
                    )}

                    {dept.name === 'Accounts' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pending Invoices:</span>
                          <span className="font-semibold">{dept.pendingInvoices}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pending Payments:</span>
                          <span className="font-semibold">{dept.pendingPayments}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Today's Collection:</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrencyPKR(dept.todayCollection, { compact: true })}
                          </span>
                        </div>
                      </>
                    )}

                    {dept.name === 'Inventory' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Items:</span>
                          <span className="font-semibold">{dept.totalItems}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Low Stock Items:</span>
                          <span className="font-semibold text-red-600">{dept.lowStockItems}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pending Orders:</span>
                          <span className="font-semibold">{dept.pendingOrders}</span>
                        </div>
                      </>
                    )}

                    {dept.name === 'Transport' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Active Vehicles:</span>
                          <span className="font-semibold">{dept.activeVehicles}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">In Maintenance:</span>
                          <span className="font-semibold text-yellow-600">{dept.inMaintenance}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Scheduled Trips:</span>
                          <span className="font-semibold">{dept.scheduledTrips}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Alerts & Today's Events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Alerts */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="size-5 text-orange-600" />
              Recent Alerts & Notifications
            </h3>
            <div className="space-y-3">
              {recentAlerts.map((alert, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`p-1.5 rounded-full ${
                    alert.type === 'warning' ? 'bg-yellow-100' :
                    alert.type === 'success' ? 'bg-green-100' :
                    'bg-blue-100'
                  }`}>
                    <div className={`size-2 rounded-full ${
                      alert.type === 'warning' ? 'bg-yellow-600' :
                      alert.type === 'success' ? 'bg-green-600' :
                      'bg-blue-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{alert.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{alert.time}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-blue-600 font-medium">{alert.module}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Events */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="size-5 text-blue-600" />
              Today's Events ({todayBookings.length})
            </h3>
            <div className="space-y-3">
              {todayBookings.slice(0, 5).map((booking, idx) => (
                <div key={idx} className="p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{booking.customerName}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {booking.eventTime} • {booking.venueName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {booking.guests} guests • {booking.startTime} - {booking.endTime}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      booking.status === 'confirmed' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
              {todayBookings.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="size-12 text-gray-300 mx-auto mb-2" />
                  <p>No events scheduled for today</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Approval Dialog */}
      <ApprovalDialog
        open={approvalDialogOpen}
        onClose={() => setApprovalDialogOpen(false)}
        onApprove={handleApproveBooking}
        onReject={handleRejectBooking}
        booking={selectedBooking}
        approverName={userName}
      />
    </div>
  );
}
