import { useState } from 'react';
import { X, XCircle, AlertTriangle, Calendar, Clock, User, MessageSquare, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import type { Booking } from './types-v2';

interface TentativeReleaseDialogProps {
  tentative: Booking;
  spaceInfo: {
    name: string;
    venueId: string;
    isPrime: boolean;
    spaceId: string;
  };
  date: Date;
  timeSlot: string;
  onConfirm: (reason: string, notes: string) => void;
  onCancel: () => void;
}

type ReleaseReason = 'declined' | 'no-response' | 'postponed' | 'other';

interface ReasonOption {
  value: ReleaseReason;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export function TentativeReleaseDialog({
  tentative,
  spaceInfo,
  date,
  timeSlot,
  onConfirm,
  onCancel,
}: TentativeReleaseDialogProps) {
  const [selectedReason, setSelectedReason] = useState<ReleaseReason | null>(null);
  const [notes, setNotes] = useState('');
  const [showValidation, setShowValidation] = useState(false);

  const reasonOptions: ReasonOption[] = [
    {
      value: 'declined',
      label: 'Customer Declined',
      description: 'Customer explicitly said no or chose different date/venue',
      icon: <XCircle className="size-6 text-red-600" />,
      color: 'border-red-300 bg-red-50 hover:bg-red-100',
    },
    {
      value: 'no-response',
      label: 'No Response',
      description: 'Customer not answering calls/messages or deadline expired',
      icon: <Clock className="size-6 text-orange-600" />,
      color: 'border-orange-300 bg-orange-50 hover:bg-orange-100',
    },
    {
      value: 'postponed',
      label: 'Postponed',
      description: 'Customer wants to book later or different date',
      icon: <Calendar className="size-6 text-blue-600" />,
      color: 'border-blue-300 bg-blue-50 hover:bg-blue-100',
    },
    {
      value: 'other',
      label: 'Other Reason',
      description: 'Different reason - please provide details in notes',
      icon: <FileText className="size-6 text-gray-600" />,
      color: 'border-gray-300 bg-gray-50 hover:bg-gray-100',
    },
  ];

  const handleConfirm = () => {
    if (!selectedReason) {
      setShowValidation(true);
      return;
    }

    // If "Other" is selected, notes are required
    if (selectedReason === 'other' && !notes.trim()) {
      setShowValidation(true);
      alert('Please provide details in the notes field when selecting "Other Reason"');
      return;
    }

    onConfirm(selectedReason, notes);
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 relative">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="size-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg">
              <AlertTriangle className="size-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Release Tentative Reservation</h2>
              <p className="text-red-100 mt-1">
                Free up this slot for other customers
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(90vh-250px)] overflow-y-auto">
          {/* Tentative Details Card */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-500 rounded-lg text-white">
                <User className="size-6" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <div className="text-sm text-yellow-800 font-medium mb-1">Customer Name</div>
                  <div className="text-xl font-bold text-yellow-900">{tentative.customerName}</div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-yellow-700 font-medium mb-1">📅 Event Date</div>
                    <div className="text-yellow-900 font-semibold">
                      {date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-yellow-700 font-medium mb-1">⏰ Time Slot</div>
                    <div className="text-yellow-900 font-semibold">
                      {formatTime(tentative.startTime)} - {formatTime(tentative.endTime)}
                    </div>
                  </div>
                  <div>
                    <div className="text-yellow-700 font-medium mb-1">🏛️ Space</div>
                    <div className="text-yellow-900 font-semibold truncate" title={spaceInfo.name}>
                      {spaceInfo.name}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-yellow-300">
                  <div>
                    <div className="text-yellow-700 font-medium mb-1">👥 Guest Count</div>
                    <div className="text-yellow-900 font-semibold">{tentative.guestCount} guests</div>
                  </div>
                  {tentative.contactNumber && (
                    <div>
                      <div className="text-yellow-700 font-medium mb-1">📞 Contact</div>
                      <div className="text-yellow-900 font-semibold">{tentative.contactNumber}</div>
                    </div>
                  )}
                </div>

                {tentative.notes && (
                  <div className="pt-2 border-t border-yellow-300">
                    <div className="text-yellow-700 font-medium mb-1 text-sm">📝 Original Notes</div>
                    <div className="text-yellow-900 text-sm">{tentative.notes}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-red-900 mb-1">
                This action will release the tentative reservation
              </div>
              <div className="text-sm text-red-800">
                The slot will become immediately available for other customers to book.
                This action cannot be undone, but you can create a new tentative if needed.
              </div>
            </div>
          </div>

          {/* Release Reason Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">
                Select Release Reason <span className="text-red-600">*</span>
              </span>
              {showValidation && !selectedReason && (
                <span className="text-xs text-red-600 font-medium animate-pulse">
                  ⚠️ Required
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {reasonOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedReason(option.value);
                    setShowValidation(false);
                  }}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    selectedReason === option.value
                      ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-200'
                      : option.color
                  } ${showValidation && !selectedReason ? 'animate-pulse border-red-400' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">{option.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{option.label}</span>
                        {selectedReason === option.value && (
                          <div className="size-5 rounded-full bg-purple-600 flex items-center justify-center">
                            <svg className="size-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                              <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 leading-tight">{option.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-gray-600" />
              <label className="text-sm font-semibold text-gray-900">
                Additional Notes {selectedReason === 'other' && <span className="text-red-600">*</span>}
              </label>
              <span className="text-xs text-gray-500">(Optional, except for "Other")</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional context about why this tentative is being released..."
              rows={4}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors resize-none ${
                selectedReason === 'other' && showValidation && !notes.trim()
                  ? 'border-red-400 focus:border-red-500 bg-red-50 animate-pulse'
                  : 'border-gray-300 focus:border-purple-500'
              }`}
            />
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <div className="mt-0.5">💡</div>
              <div>
                <strong>Examples:</strong> "Customer found cheaper venue", "Not responding to 3 calls", 
                "Wants to rebook for next month", "Budget constraints", etc.
              </div>
            </div>
          </div>

          {/* Audit Trail Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <div className="font-semibold text-blue-900 mb-2">Audit Trail Information</div>
                <div className="space-y-1 text-blue-800">
                  <div>✓ Release timestamp will be recorded</div>
                  <div>✓ Your user ID and name will be logged</div>
                  <div>✓ Selected reason and notes will be saved</div>
                  <div>✓ Complete booking details will be archived</div>
                  <div>✓ Slot will be marked as "Available" immediately</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-6 flex items-center justify-between">
          <Button onClick={onCancel} variant="outline" size="lg">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
            size="lg"
            disabled={!selectedReason || (selectedReason === 'other' && !notes.trim())}
          >
            <XCircle className="size-5 mr-2" />
            Release Tentative Reservation
          </Button>
        </div>
      </div>
    </div>
  );
}
