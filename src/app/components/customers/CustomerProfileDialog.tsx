import {
  X,
  Phone,
  Mail,
  MapPin,
  Building2,
  CreditCard,
  Calendar,
  DollarSign,
  Star,
  Edit,
  MessageSquare,
  TrendingUp,
  Award,
  FileText,
  Clock,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Customer } from './customer-types';

interface CustomerProfileDialogProps {
  open: boolean;
  onClose: () => void;
  customer: Customer;
  onEdit: () => void;
}

export function CustomerProfileDialog({
  open,
  onClose,
  customer,
  onEdit,
}: CustomerProfileDialogProps) {
  if (!open) return null;

  // Sample booking history (in real app, this would be fetched)
  const recentBookings = [
    {
      id: '1',
      date: '2024-03-15',
      eventDate: '2024-04-20',
      service: 'Venue Booking',
      venue: 'Grand Hall',
      guests: 500,
      amount: 250000,
      status: 'confirmed',
    },
    {
      id: '2',
      date: '2024-02-10',
      eventDate: '2024-03-05',
      service: 'Outdoor Catering',
      venue: 'Customer Location',
      guests: 300,
      amount: 180000,
      status: 'completed',
    },
    {
      id: '3',
      date: '2024-01-20',
      eventDate: '2024-02-14',
      service: 'Mixed Package',
      venue: 'Royal Banquet',
      guests: 400,
      amount: 320000,
      status: 'completed',
    },
  ];

  const recentPayments = [
    { date: '2024-03-15', amount: 125000, method: 'Bank Transfer', receipt: 'RCP-001234' },
    { date: '2024-03-10', amount: 125000, method: 'Cash', receipt: 'RCP-001225' },
    { date: '2024-02-10', amount: 180000, method: 'Bank Transfer', receipt: 'RCP-001198' },
  ];

  const getStatusBadge = (status: string) => {
    const config = {
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800' },
      completed: { bg: 'bg-green-100', text: 'text-green-800' },
      tentative: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
    };
    const { bg, text } = config[status as keyof typeof config] || config.tentative;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
                {customer.customerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{customer.customerName}</h2>
                <p className="text-sm text-blue-100">{customer.customerCode}</p>
                {customer.companyName && (
                  <p className="text-sm text-blue-100 mt-0.5">{customer.companyName}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={onEdit}
                className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
              >
                <Edit className="size-4 mr-2" />
                Edit
              </Button>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Contact & Basic Info */}
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Phone className="size-4 text-blue-600" />
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">Primary Contact</label>
                    <div className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                      <Phone className="size-3 text-gray-400" />
                      {customer.primaryContact}
                    </div>
                  </div>
                  {customer.secondaryContact && (
                    <div>
                      <label className="text-xs text-gray-500">Secondary Contact</label>
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Phone className="size-3 text-gray-400" />
                        {customer.secondaryContact}
                      </div>
                    </div>
                  )}
                  {customer.email && (
                    <div>
                      <label className="text-xs text-gray-500">Email</label>
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Mail className="size-3 text-gray-400" />
                        {customer.email}
                      </div>
                    </div>
                  )}
                  {customer.whatsapp && (
                    <div>
                      <label className="text-xs text-gray-500">WhatsApp</label>
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <MessageSquare className="size-3 text-gray-400" />
                        {customer.whatsapp}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Address */}
              {customer.address && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="size-4 text-blue-600" />
                    Address
                  </h3>
                  <div className="text-sm text-gray-700">
                    <p>{customer.address}</p>
                    <p className="mt-1">{customer.area ? `${customer.area}, ` : ''}{customer.city}</p>
                  </div>
                </div>
              )}

              {/* Corporate Details */}
              {customer.customerType === 'corporate' && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Building2 className="size-4 text-blue-600" />
                    Corporate Details
                  </h3>
                  <div className="space-y-2">
                    {customer.designation && (
                      <div>
                        <label className="text-xs text-gray-500">Designation</label>
                        <p className="text-sm text-gray-900">{customer.designation}</p>
                      </div>
                    )}
                    {customer.gstNumber && (
                      <div>
                        <label className="text-xs text-gray-500">GST Number</label>
                        <p className="text-sm text-gray-900">{customer.gstNumber}</p>
                      </div>
                    )}
                    {customer.ntnNumber && (
                      <div>
                        <label className="text-xs text-gray-500">NTN Number</label>
                        <p className="text-sm text-gray-900">{customer.ntnNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Rating */}
              {customer.customerRating && (
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Award className="size-4 text-yellow-600" />
                    Customer Rating
                  </h3>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`size-6 ${
                          star <= customer.customerRating!
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Reliability & Payment Score</p>
                </div>
              )}
            </div>

            {/* Middle Column - Financial & Stats */}
            <div className="space-y-6">
              {/* Financial Summary */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="size-4 text-green-600" />
                  Financial Summary
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-600">Total Revenue</label>
                    <p className="text-xl font-bold text-green-700">
                      PKR {customer.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Total Paid</label>
                      <p className="text-sm font-semibold text-gray-900">
                        PKR {customer.totalPaid.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Outstanding</label>
                      <p className={`text-sm font-semibold ${
                        customer.totalOutstanding > 0 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        PKR {customer.totalOutstanding.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Statistics */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="size-4 text-blue-600" />
                  Booking Statistics
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-700">{customer.totalBookings}</p>
                    <p className="text-xs text-gray-600 mt-1">Total Bookings</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-700">{customer.completedEvents}</p>
                    <p className="text-xs text-gray-600 mt-1">Completed</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-700">{customer.upcomingEvents}</p>
                    <p className="text-xs text-gray-600 mt-1">Upcoming</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-700">{customer.cancelledEvents}</p>
                    <p className="text-xs text-gray-600 mt-1">Cancelled</p>
                  </div>
                </div>
              </div>

              {/* Payment Terms */}
              {customer.paymentTerms && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="size-4 text-blue-600" />
                    Payment Terms
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500">Terms</label>
                      <p className="text-sm font-medium text-gray-900">{customer.paymentTerms}</p>
                    </div>
                    {customer.creditLimit && (
                      <div>
                        <label className="text-xs text-gray-500">Credit Limit</label>
                        <p className="text-sm font-medium text-gray-900">
                          PKR {customer.creditLimit.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {customer.defaultDiscount && (
                      <div>
                        <label className="text-xs text-gray-500">Default Discount</label>
                        <p className="text-sm font-medium text-gray-900">{customer.defaultDiscount}%</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {customer.tags && customer.tags.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {customer.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Activity History */}
            <div className="space-y-6">
              {/* Recent Bookings */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="size-4 text-blue-600" />
                  Recent Bookings
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {recentBookings.map((booking) => (
                    <div key={booking.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{booking.service}</p>
                          <p className="text-xs text-gray-600">{booking.venue}</p>
                        </div>
                        {getStatusBadge(booking.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <p className="text-gray-500">Event Date</p>
                          <p className="font-medium">{new Date(booking.eventDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Guests</p>
                          <p className="font-medium">{booking.guests}</p>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-sm font-semibold text-green-700">
                          PKR {booking.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Payments */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="size-4 text-green-600" />
                  Recent Payments
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recentPayments.map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-100">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          PKR {payment.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600">{payment.method}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{new Date(payment.date).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500">{payment.receipt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {(customer.notes || customer.internalNotes) && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="size-4 text-blue-600" />
                    Notes
                  </h3>
                  {customer.notes && (
                    <div className="mb-3">
                      <label className="text-xs text-gray-500">Public Notes</label>
                      <p className="text-sm text-gray-700 mt-1">{customer.notes}</p>
                    </div>
                  )}
                  {customer.internalNotes && (
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <label className="text-xs text-yellow-700 font-medium">Internal Notes</label>
                      <p className="text-sm text-gray-700 mt-1">{customer.internalNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Last Activity */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Clock className="size-4 text-gray-600" />
                  Last Activity
                </h3>
                {customer.lastBookingDate && (
                  <p className="text-sm text-gray-600">
                    Last booking: {customer.lastBookingDate.toLocaleDateString()}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Customer since: {customer.createdAt.toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
