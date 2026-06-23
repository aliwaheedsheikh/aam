import { useState } from 'react';
import { X, Zap, Clock, CheckCircle, Phone } from 'lucide-react';
import { Button } from '../ui/button';
import type { Booking } from './types-v2';

interface RequestConfirmationDialogProps {
  tentative: Booking;
  onConfirm: (timeWindowMinutes: number) => void;
  onConfirmNow: (tentative: Booking) => void; // Updated: Pass the full tentative object
  onClose: () => void;
}

export function RequestConfirmationDialog({
  tentative,
  onConfirm,
  onConfirmNow,
  onClose,
}: RequestConfirmationDialogProps) {
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<number>(30); // Default 30 minutes
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [useCustomTime, setUseCustomTime] = useState(false);

  // Preset time windows (in minutes)
  const presetWindows = [
    { label: '15 Minutes', minutes: 15, description: 'Ultra urgent - customer in office' },
    { label: '30 Minutes', minutes: 30, description: 'Very urgent - quick decision needed' },
    { label: '1 Hour', minutes: 60, description: 'Urgent - same day decision' },
    { label: '2 Hours', minutes: 120, description: 'Standard - customer needs time' },
    { label: '4 Hours', minutes: 240, description: 'Extended - half day window' },
    { label: '6 Hours', minutes: 360, description: 'Relaxed - full working day' },
  ];

  const handleConfirm = () => {
    let timeWindow = selectedTimeWindow;
    
    if (useCustomTime && customMinutes) {
      const customValue = parseInt(customMinutes);
      if (customValue > 0 && customValue <= 1440) { // Max 24 hours
        timeWindow = customValue;
      }
    }

    onConfirm(timeWindow);
  };

  const getDeadlineText = (minutes: number): string => {
    const now = new Date();
    const deadline = new Date(now.getTime() + minutes * 60 * 1000);
    return deadline.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="size-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg">
              <Zap className="size-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Request Immediate Confirmation</h2>
              <p className="text-purple-100 mt-1">
                Priority #1 Customer: {tentative.customerName}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Customer on Phone - Quick Confirm */}
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-600 rounded-lg text-white">
                <Phone className="size-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  Customer on Phone Right Now?
                </h3>
                <p className="text-sm text-green-800 mb-4">
                  If the customer is currently on the phone and agrees to pay the advance immediately,
                  you can convert this tentative to a confirmed booking right away.
                </p>
                <Button
                  onClick={() => {
                    if (confirm(
                      `Confirm booking for ${tentative.customerName} NOW?\n\n` +
                      `This will:\n` +
                      `• Convert tentative to CONFIRMED booking\n` +
                      `• Open booking form to collect advance payment\n` +
                      `• Remove from tentative queue\n\n` +
                      `Only proceed if customer has verbally agreed to pay advance.`
                    )) {
                      onConfirmNow(tentative);
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <CheckCircle className="size-5 mr-2" />
                  Confirm Booking Now
                </Button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="text-sm text-gray-500 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>

          {/* Set Time Window */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="size-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Give Customer Time to Arrange Payment
                </h3>
                <p className="text-sm text-gray-600">
                  Select how long the customer has to submit advance payment
                </p>
              </div>
            </div>

            {/* Preset Time Windows */}
            <div className="grid grid-cols-2 gap-3">
              {presetWindows.map((window) => (
                <button
                  key={window.minutes}
                  onClick={() => {
                    setSelectedTimeWindow(window.minutes);
                    setUseCustomTime(false);
                  }}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    selectedTimeWindow === window.minutes && !useCustomTime
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900">{window.label}</span>
                    {selectedTimeWindow === window.minutes && !useCustomTime && (
                      <div className="size-5 rounded-full bg-purple-600 flex items-center justify-center">
                        <CheckCircle className="size-3 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{window.description}</p>
                  <p className="text-xs text-purple-600 font-medium mt-1">
                    Deadline: {getDeadlineText(window.minutes)}
                  </p>
                </button>
              ))}
            </div>

            {/* Custom Time Input */}
            <div className="border-2 border-gray-200 rounded-lg p-4">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={useCustomTime}
                  onChange={(e) => setUseCustomTime(e.target.checked)}
                  className="size-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="font-semibold text-gray-900">Custom Time Window</span>
              </label>
              {useCustomTime && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(e.target.value)}
                      placeholder="Enter minutes"
                      className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    />
                    <span className="text-gray-600 font-medium">minutes</span>
                  </div>
                  {customMinutes && parseInt(customMinutes) > 0 && (
                    <p className="text-xs text-purple-600 font-medium">
                      Deadline: {getDeadlineText(parseInt(customMinutes))}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Maximum: 1440 minutes (24 hours)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* What Happens Next */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">What happens next:</h4>
            <ul className="space-y-1.5 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>A countdown timer will start showing time remaining</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>The slot will be temporarily locked from other bookings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Customer must submit advance payment before deadline</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>If not paid by deadline, slot will be released to next priority</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Action will be logged with timestamp and user details</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-6 flex items-center justify-between">
          <Button onClick={onClose} variant="outline" size="lg">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            size="lg"
          >
            <Zap className="size-5 mr-2" />
            Send Confirmation Request
            {!useCustomTime && ` (${selectedTimeWindow} min)`}
            {useCustomTime && customMinutes && ` (${customMinutes} min)`}
          </Button>
        </div>
      </div>
    </div>
  );
}