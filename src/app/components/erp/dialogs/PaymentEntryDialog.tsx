import { useState } from 'react';
import { X, DollarSign, Calendar, CreditCard, FileText } from 'lucide-react';
import { Booking } from '../../calendar/types-v2';

interface PaymentEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSavePayment: (paymentData: {
    advanceAmount: number;
    paymentDate: Date;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
  }) => void;
}

export function PaymentEntryDialog({
  isOpen,
  onClose,
  booking,
  onSavePayment,
}: PaymentEntryDialogProps) {
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen || !booking) return null;

  const totalAmount = (booking.packagePrice || 0) + (booking.extraCharges || 0);
  const currentAdvance = booking.advanceAmount || 0;
  const remainingBalance = totalAmount - currentAdvance;
  const minimumAdvance = totalAmount * 0.3; // 30% minimum

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(advanceAmount);
    
    if (!amount || amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (amount > remainingBalance) {
      alert(`Payment amount cannot exceed remaining balance of PKR ${remainingBalance.toLocaleString()}`);
      return;
    }

    onSavePayment({
      advanceAmount: amount,
      paymentDate: new Date(paymentDate),
      paymentMethod,
      referenceNumber: referenceNumber || undefined,
      notes: notes || undefined,
    });

    // Reset form
    setAdvanceAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setReferenceNumber('');
    setNotes('');
  };

  const handleCancel = () => {
    setAdvanceAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setReferenceNumber('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 flex items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="size-7" />
              Receive Payment & Confirm Booking
            </h2>
            <p className="text-sm text-green-100 mt-1">
              Convert tentative to confirmed reservation
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X className="size-6" />
          </button>
        </div>

        {/* Booking Summary */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Customer</p>
              <p className="font-bold text-gray-900">{booking.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Event Date</p>
              <p className="font-bold text-gray-900">
                {new Date(booking.date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Venue</p>
              <p className="font-bold text-gray-900">{booking.venueName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Time Slot</p>
              <p className="font-bold text-gray-900">{booking.timeSlot}</p>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="mt-4 bg-white border-2 border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Total Amount</p>
                <p className="text-lg font-bold text-blue-600">
                  PKR {totalAmount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Already Paid</p>
                <p className="text-lg font-bold text-green-600">
                  PKR {currentAdvance.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Remaining Balance</p>
                <p className="text-lg font-bold text-orange-600">
                  PKR {remainingBalance.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Min. Advance (30%)</p>
                <p className="text-lg font-bold text-purple-600">
                  PKR {minimumAdvance.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Entry Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Payment Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              <DollarSign className="size-4 inline mr-1" />
              Payment Amount (PKR) *
            </label>
            <input
              type="number"
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(e.target.value)}
              placeholder="Enter payment amount"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-semibold"
              required
              min="1"
              max={remainingBalance}
            />
            <div className="mt-2 flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setAdvanceAmount(minimumAdvance.toString())}
                className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200"
              >
                30% Minimum
              </button>
              <button
                type="button"
                onClick={() => setAdvanceAmount((totalAmount * 0.5).toString())}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200"
              >
                50% Half
              </button>
              <button
                type="button"
                onClick={() => setAdvanceAmount(remainingBalance.toString())}
                className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200"
              >
                Full Payment
              </button>
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              <Calendar className="size-4 inline mr-1" />
              Payment Date *
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              <CreditCard className="size-4 inline mr-1" />
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            >
              <option value="cash">Cash</option>
              <option value="bank-transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="credit-card">Credit Card</option>
              <option value="debit-card">Debit Card</option>
              <option value="online-payment">Online Payment (JazzCash/Easypaisa)</option>
            </select>
          </div>

          {/* Reference Number */}
          {paymentMethod !== 'cash' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Reference/Transaction Number
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g., Cheque #, Transaction ID, Receipt #"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              <FileText className="size-4 inline mr-1" />
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional payment notes or remarks..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors shadow-lg"
            >
              Confirm Booking & Save Payment
            </button>
          </div>
        </form>

        {/* Important Notice */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium">
              ℹ️ <strong>Important:</strong> Once payment is received, this booking will be converted from 
              <span className="text-yellow-600 font-bold"> TENTATIVE</span> to 
              <span className="text-green-600 font-bold"> CONFIRMED</span> status automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
