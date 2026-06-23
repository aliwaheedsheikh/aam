import { useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Clock, DollarSign, Calendar, UserCheck } from 'lucide-react';
import { Booking } from '../../calendar/types-v2';

interface ApprovalDialogProps {
  booking: Booking | null;
  open: boolean;
  onClose: () => void;
  onApprove: (bookingId: string, gracePeriodDays: number, approvalNotes: string, approverName: string) => void;
  onReject: (bookingId: string, rejectionReason: string, approverName: string) => void;
  approverName: string;
}

export function ApprovalDialog({
  booking,
  open,
  onClose,
  onApprove,
  onReject,
  approverName,
}: ApprovalDialogProps) {
  const [gracePeriodDays, setGracePeriodDays] = useState('15');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!open || !booking) return null;

  const totalAmount = booking.totalAmount || 0;
  const advanceAmount = (booking as any).advanceAmount || 0;
  const minimumAdvance = totalAmount * 0.3;

  const handleApprove = () => {
    if (!approvalNotes.trim()) {
      alert('Please provide approval conditions/notes');
      return;
    }
    const days = parseInt(gracePeriodDays) || 15;
    if (days < 1 || days > 30) {
      alert('Grace period must be between 1 and 30 days');
      return;
    }
    onApprove(booking.id, days, approvalNotes, approverName);
    handleClose();
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    onReject(booking.id, rejectionReason, approverName);
    handleClose();
  };

  const handleClose = () => {
    setGracePeriodDays('15');
    setApprovalNotes('');
    setRejectionReason('');
    setShowRejectForm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCheck className="size-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Booking Approval Required</h2>
              <p className="text-sm text-orange-100">Review and approve booking without sufficient advance</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:bg-orange-800 p-2 rounded-lg transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Approval Request Alert */}
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-6 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-orange-900 mb-2">⚠️ Zero/Low Advance Payment</h3>
                <p className="text-sm text-orange-800">
                  This booking has <span className="font-bold">{advanceAmount === 0 ? 'NO advance payment' : 'less than minimum advance'}</span> and requires your approval to proceed.
                </p>
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer & Event Details */}
            <div className="bg-gray-50 border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Customer & Event Details</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-600">Customer Name:</p>
                  <p className="font-medium text-gray-900">{booking.customerName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Contact Number:</p>
                  <p className="font-medium text-gray-900">{booking.contactNumber || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Event Date:</p>
                  <p className="font-medium text-gray-900">
                    {new Date(booking.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Venue:</p>
                  <p className="font-medium text-gray-900">{(booking as any).venueName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Time Slot:</p>
                  <p className="font-medium text-gray-900">{booking.startTime} - {booking.endTime}</p>
                </div>
                <div>
                  <p className="text-gray-600">Guest Count:</p>
                  <p className="font-medium text-gray-900">{booking.guestCount} guests</p>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="size-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">Financial Summary</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-bold text-gray-900">PKR {totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Minimum Required (30%):</span>
                  <span className="font-bold text-orange-600">PKR {minimumAdvance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Advance Received:</span>
                  <span className={`font-bold ${advanceAmount === 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                    PKR {advanceAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Outstanding Balance:</span>
                  <span className="font-bold text-red-600">PKR {(totalAmount - advanceAmount).toLocaleString()}</span>
                </div>
                <div className="bg-red-50 border border-red-200 rounded p-2 mt-3">
                  <p className="text-xs text-red-800 font-semibold">
                    ⚠️ Short by: PKR {(minimumAdvance - advanceAmount).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Staff Request Reason */}
          {booking.approvalNotes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">📝 Staff Request Reason:</h4>
              <p className="text-sm text-gray-800 italic">"{booking.approvalNotes}"</p>
            </div>
          )}

          {/* Approval or Rejection Form */}
          {!showRejectForm ? (
            // Approval Form
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="size-5 text-green-600" />
                <h4 className="font-semibold text-gray-900">Approval Conditions</h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Grace Period (Days) <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <Clock className="size-5 text-gray-500" />
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={gracePeriodDays}
                      onChange={(e) => setGracePeriodDays(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <span className="text-sm text-gray-600">days to pay full balance</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 15 days. Customer must pay within this period.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Approval Conditions / Notes <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Example: Approved based on VIP reference. Customer must pay PKR 500,000 within 15 days. Front office to follow up every 3 days."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Document the conditions and follow-up requirements for this approval
                  </p>
                </div>

                <div className="bg-white border border-green-300 rounded-lg p-3">
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold">Payment Deadline:</span>{' '}
                    {new Date(Date.now() + parseInt(gracePeriodDays || '15') * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    An alert will be generated if payment is not received by this date
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Rejection Form
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <XCircle className="size-5 text-red-600" />
                <h4 className="font-semibold text-gray-900">Rejection Reason</h4>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Why are you rejecting this booking? <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Example: Insufficient justification for waiving advance. Customer must pay minimum 30% advance to confirm booking."
                  rows={4}
                  className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This reason will be communicated to the front office staff
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            {!showRejectForm && (
              <button
                onClick={() => setShowRejectForm(true)}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <XCircle className="size-4" />
                Reject Booking
              </button>
            )}
            {showRejectForm && (
              <button
                onClick={() => setShowRejectForm(false)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Back to Approval
              </button>
            )}
          </div>
          
          {!showRejectForm ? (
            <button
              onClick={handleApprove}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <CheckCircle className="size-4" />
              Approve with {gracePeriodDays} Days Grace Period
            </button>
          ) : (
            <button
              onClick={handleReject}
              className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <XCircle className="size-4" />
              Confirm Rejection
            </button>
          )}
        </div>
      </div>
    </div>
  );
}