import { useState } from 'react';
import { X, DollarSign, AlertTriangle, CheckCircle, UserCheck } from 'lucide-react';
import { Booking } from '../../calendar/types-v2';
import { loadSetupAdvancePolicy } from '../setup/setupMasterData';

interface ConfirmBookingDialogProps {
  booking: Booking | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (bookingId: string, advanceAmount: number, needsApproval: boolean, approvalReason: string) => void;
  userName: string;
}

export function ConfirmBookingDialog({
  booking,
  open,
  onClose,
  onConfirm,
  userName,
}: ConfirmBookingDialogProps) {
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [approvalReason, setApprovalReason] = useState('');

  if (!open || !booking) return null;

  const totalAmount = booking.totalAmount || 0;
  const setupAdvancePolicy = loadSetupAdvancePolicy();
  const minimumAdvance = booking.subSpaceId
    ? setupAdvancePolicy.subSpaceMinimumAdvance
    : setupAdvancePolicy.primeSpaceMinimumAdvance;
  const advanceValue = parseFloat(advanceAmount) || 0;
  const needsApproval = advanceValue < minimumAdvance;

  const handleSubmit = () => {
    if (needsApproval && !approvalReason.trim()) {
      alert('Please provide a reason for requesting approval without advance payment');
      return;
    }
    onConfirm(booking.id, advanceValue, needsApproval, approvalReason);
    handleClose();
  };

  const handleClose = () => {
    setAdvanceAmount('');
    setApprovalReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="size-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Confirm Booking</h2>
              <p className="text-sm text-green-100">Enter payment details to confirm reservation</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:bg-green-800 p-2 rounded-lg transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Booking Summary */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Booking Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Customer:</p>
                <p className="font-medium text-gray-900">{booking.customerName}</p>
              </div>
              <div>
                <p className="text-gray-600">Event Date:</p>
                <p className="font-medium text-gray-900">
                  {new Date(booking.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
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
                <p className="font-medium text-gray-900">{(booking as any).timeSlot || booking.startTime}</p>
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="size-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Financial Details</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-bold text-gray-900">PKR {totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Minimum Advance:</span>
                <span className="font-bold text-orange-600">PKR {minimumAdvance.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Advance Payment Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Advance Payment Received <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                PKR
              </span>
              <input
                type="number"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                placeholder="Enter advance amount (0 if none)"
                className="w-full pl-14 pr-4 py-3 border rounded-lg text-lg font-semibold focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter 0 if no advance payment received (requires approval)
            </p>
          </div>

          {/* Approval Warning */}
          {needsApproval && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-orange-900 mb-2">⚠️ Approval Required</h4>
                  <p className="text-sm text-orange-800 mb-3">
                    This booking has {advanceValue === 0 ? 'NO advance payment' : 'less than minimum advance'} and requires approval from:
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <UserCheck className="size-5 text-orange-600" />
                    <span className="font-semibold text-orange-900">General Manager or Director</span>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-orange-900 mb-2">
                      Reason for No/Low Advance Payment <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      value={approvalReason}
                      onChange={(e) => setApprovalReason(e.target.value)}
                      placeholder="Example: VIP customer with 10+ years relationship, Strong reference from Senator Tariq, etc."
                      rows={3}
                      className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    />
                    <p className="text-xs text-orange-700 mt-1">
                      This will be sent to GM/Director for approval. Customer will pay within 15 days grace period.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {!needsApproval && advanceValue >= minimumAdvance && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-5 text-green-600" />
                <p className="text-sm text-green-800 font-medium">
                  ✅ Advance payment meets minimum requirement. Booking will be confirmed immediately.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!advanceAmount && advanceAmount !== '0'}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
              needsApproval
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {needsApproval ? (
              <>
                <UserCheck className="size-4" />
                Send for Approval
              </>
            ) : (
              <>
                <CheckCircle className="size-4" />
                Confirm Booking
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
