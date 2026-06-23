import { useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  Timer,
  TrendingUp,
  MessageCircle,
  Zap,
  Lock,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { Booking } from './types-v2';
import { formatTimeDisplay } from '../ui/time-picker';
import { ConfirmationBanner } from './ConfirmationCountdown';
import { RequestConfirmationDialog } from './RequestConfirmationDialog';
import { TentativeReleaseDialog } from './TentativeReleaseDialog';

interface TentativeQueuePanelProps {
  tentatives: Booking[];
  spaceInfo: {
    name: string;
    venueId: string;
    isPrime: boolean;
    spaceId: string;
  };
  date: Date;
  timeSlot: string; // e.g., "14:00"
  onEdit: (booking: Booking) => void;
  onRelease: (bookingId: string, reason: string, notes: string) => void; // Changed from onDelete
  onPromote: (bookingId: string) => void;
  onDemote: (bookingId: string) => void;
  onConvert: (bookingId: string) => void; // Convert tentative to confirmed
  onRequestConfirmation: (bookingId: string, timeWindowMinutes: number) => void;
  onClose: () => void;
}

export function TentativeQueuePanel({
  tentatives,
  spaceInfo,
  date,
  timeSlot,
  onEdit,
  onRelease,
  onPromote,
  onDemote,
  onConvert,
  onRequestConfirmation,
  onClose,
}: TentativeQueuePanelProps) {
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<string | null>(null); // Booking ID for confirmation dialog
  const [showReleaseDialog, setShowReleaseDialog] = useState<string | null>(null); // Booking ID for release dialog

  // Calculate expiry time (48 hours from creation)
  const getExpiryInfo = (booking: Booking) => {
    const createdAt = new Date(booking.createdAt || Date.now());
    const expiryTime = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000); // 48 hours
    const now = new Date();
    const hoursRemaining = Math.max(0, (expiryTime.getTime() - now.getTime()) / (1000 * 60 * 60));
    const isExpiringSoon = hoursRemaining < 24;
    const isExpired = hoursRemaining === 0;

    return {
      expiryTime,
      hoursRemaining,
      isExpiringSoon,
      isExpired,
    };
  };

  // Get priority badge
  const getPriorityBadge = (index: number, total: number) => {
    if (index === 0) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          <ArrowUpCircle className="size-3 mr-1" />
          Priority #1
        </Badge>
      );
    } else if (index === total - 1) {
      return (
        <Badge className="bg-gray-100 text-gray-600 border-gray-300">
          Last in Queue
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-300">
          Priority #{index + 1}
        </Badge>
      );
    }
  };

  // Get follow-up status color
  const getFollowUpStatusColor = (status?: string) => {
    switch (status) {
      case 'call-scheduled':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'interested':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'ready-to-book':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'negotiating':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'no-response':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      case 'price-concern':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl w-[900px] max-h-[80vh] overflow-hidden flex flex-col border-2 border-yellow-400"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Timer className="size-6" />
              <div>
                <h2 className="text-xl font-bold">Tentative Queue</h2>
                <p className="text-sm text-yellow-100">
                  {tentatives.length} tentative{tentatives.length !== 1 ? 's' : ''} for {spaceInfo.name}
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-yellow-100">
              {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="text-lg font-semibold">
              {formatTimeDisplay(timeSlot)}
            </div>
          </div>
        </div>

        {/* Risk Indicator */}
        <div className={`px-6 py-3 border-b flex items-center gap-3 ${
          tentatives.length >= 4 ? 'bg-red-50' : tentatives.length >= 2 ? 'bg-orange-50' : 'bg-yellow-50'
        }`}>
          <AlertTriangle className={`size-5 ${
            tentatives.length >= 4 ? 'text-red-600' : tentatives.length >= 2 ? 'text-orange-600' : 'text-yellow-600'
          }`} />
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900">
              {tentatives.length >= 4 ? 'High Competition' : tentatives.length >= 2 ? 'Moderate Competition' : 'Low Competition'}
            </div>
            <div className="text-xs text-gray-600">
              {tentatives.length} clients interested in this time slot • First-come priority order
            </div>
          </div>
          <div className="text-2xl font-bold">
            {tentatives.length >= 4 ? '🔴' : tentatives.length >= 2 ? '🟠' : '🟡'}
          </div>
        </div>

        {/* Tentative List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {tentatives.map((booking, index) => {
            const expiryInfo = getExpiryInfo(booking);
            const isSelected = expandedBooking === booking.id;

            return (
              <div
                key={booking.id}
                className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-yellow-500 bg-yellow-50 shadow-md'
                    : expiryInfo.isExpired
                    ? 'border-red-300 bg-red-50/50 opacity-60'
                    : index === 0
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-yellow-400 hover:shadow-sm'
                }`}
                onClick={() => setExpandedBooking(isSelected ? null : booking.id)}
              >
                {/* Row 1: Priority + Customer Info + Status */}
                <div className="flex items-start gap-3 mb-3">
                  {/* Priority Number */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                    index === 0
                      ? 'bg-green-600 text-white'
                      : index === 1
                      ? 'bg-blue-600 text-white'
                      : index === 2
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-600 text-white'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Customer Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="size-4 text-gray-600 flex-shrink-0" />
                      <span className="font-semibold text-gray-900 truncate">{booking.customerName}</span>
                      {getPriorityBadge(index, tentatives.length)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Phone className="size-3" />
                        <span>{booking.contactNumber}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        <span>{booking.guestCount} guests</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        <span>{formatTimeDisplay(booking.startTime)} - {formatTimeDisplay(booking.endTime)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Follow-Up Status */}
                  {booking.salesFollowUpStatus && (
                    <Badge className={getFollowUpStatusColor(booking.salesFollowUpStatus)}>
                      {booking.salesFollowUpStatus === 'call-scheduled' && 'Call Scheduled'}
                      {booking.salesFollowUpStatus === 'interested' && 'Highly Interested'}
                      {booking.salesFollowUpStatus === 'ready-to-book' && 'Ready to Book'}
                      {booking.salesFollowUpStatus === 'negotiating' && 'Negotiating'}
                      {booking.salesFollowUpStatus === 'no-response' && 'No Response'}
                      {booking.salesFollowUpStatus === 'price-concern' && 'Price Concern'}
                    </Badge>
                  )}
                </div>

                {/* Row 2: Expiry Timer + Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t">
                  {/* Expiry Info */}
                  <div className={`flex items-center gap-2 text-sm ${
                    expiryInfo.isExpired
                      ? 'text-red-700 font-semibold'
                      : expiryInfo.isExpiringSoon
                      ? 'text-orange-700 font-medium'
                      : 'text-gray-600'
                  }`}>
                    <Timer className={`size-4 ${
                      expiryInfo.isExpired
                        ? 'text-red-600'
                        : expiryInfo.isExpiringSoon
                        ? 'text-orange-600 animate-pulse'
                        : 'text-gray-500'
                    }`} />
                    {expiryInfo.isExpired ? (
                      <span>⚠️ Expired</span>
                    ) : expiryInfo.isExpiringSoon ? (
                      <span>⏰ Expires in {Math.floor(expiryInfo.hoursRemaining)}h</span>
                    ) : (
                      <span>Valid for {Math.floor(expiryInfo.hoursRemaining)}h</span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Priority Controls */}
                    {index > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPromote(booking.id);
                        }}
                        title="Move Up in Queue"
                        className="h-7 px-2"
                      >
                        <ArrowUpCircle className="size-3" />
                      </Button>
                    )}
                    {index < tentatives.length - 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDemote(booking.id);
                        }}
                        title="Move Down in Queue"
                        className="h-7 px-2"
                      >
                        <ArrowDownCircle className="size-3" />
                      </Button>
                    )}

                    {/* Request Immediate Confirmation - ONLY for Priority #1 */}
                    {index === 0 && !booking.confirmationRequested && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowConfirmDialog(booking.id);
                        }}
                        className="bg-purple-600 hover:bg-purple-700 h-7 px-3 animate-pulse"
                        title="Request Immediate Confirmation (Priority #1 Only)"
                      >
                        <Zap className="size-3 mr-1" />
                        Request Confirmation
                      </Button>
                    )}

                    {/* Convert to Confirmed */}
                    <Button
                      size="sm"
                      variant="default"
                      onClick={(e) => {
                        e.stopPropagation();
                        onConvert(booking.id);
                      }}
                      className="bg-green-600 hover:bg-green-700 h-7 px-3"
                    >
                      <CheckCircle2 className="size-3 mr-1" />
                      Confirm
                    </Button>

                    {/* Edit */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(booking);
                      }}
                      className="h-7 px-2"
                    >
                      <Edit2 className="size-3" />
                    </Button>

                    {/* Delete */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowReleaseDialog(booking.id);
                      }}
                      className="h-7 px-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>

                {/* Confirmation Banner (if confirmation requested) */}
                {booking.confirmationRequested && booking.confirmationDeadline && (
                  <div className="mt-3 pt-3 border-t">
                    <ConfirmationBanner
                      booking={{
                        id: booking.id,
                        customerName: booking.customerName,
                        confirmationRequestedAt: booking.confirmationRequestedAt,
                        confirmationDeadline: booking.confirmationDeadline,
                        confirmationRequestedBy: booking.confirmationRequestedBy,
                      }}
                      onExpire={() => {
                        console.log('Confirmation window expired for', booking.id);
                        // TODO: Handle expiry - release slot
                      }}
                    />
                  </div>
                )}

                {/* Expanded Details (when selected) */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                    {booking.eventType && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Event Type:</span>
                        <span className="font-medium">{booking.eventType}</span>
                      </div>
                    )}
                    {booking.email && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{booking.email}</span>
                      </div>
                    )}
                    {booking.customerRemarks && (
                      <div className="flex items-start gap-2">
                        <MessageCircle className="size-4 text-gray-600 mt-0.5" />
                        <div className="flex-1">
                          <span className="text-gray-600">Remarks: </span>
                          <span className="text-gray-800">{booking.customerRemarks}</span>
                        </div>
                      </div>
                    )}
                    {booking.assignedTo && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Assigned to:</span>
                        <Badge variant="outline">{booking.assignedTo}</Badge>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Priority Order:</span> First tentative has highest priority for conversion
          </div>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>

      {/* Request Confirmation Dialog */}
      {showConfirmDialog && (() => {
        const tentativeBooking = tentatives.find(t => t.id === showConfirmDialog);
        if (!tentativeBooking) return null;
        
        return (
          <RequestConfirmationDialog
            tentative={tentativeBooking}
            onConfirm={(timeWindowMinutes) => {
              onRequestConfirmation(showConfirmDialog, timeWindowMinutes);
              setShowConfirmDialog(null);
            }}
            onConfirmNow={(tentative) => {
              onConvert(tentative.id);
              setShowConfirmDialog(null);
            }}
            onClose={() => setShowConfirmDialog(null)}
          />
        );
      })()}

      {/* Release Dialog */}
      {showReleaseDialog && (() => {
        const tentativeBooking = tentatives.find(t => t.id === showReleaseDialog);
        if (!tentativeBooking) return null;
        
        return (
          <TentativeReleaseDialog
            tentative={tentativeBooking}
            spaceInfo={spaceInfo}
            date={date}
            timeSlot={timeSlot}
            onConfirm={(reason, notes) => {
              onRelease(showReleaseDialog, reason, notes);
              setShowReleaseDialog(null);
            }}
            onCancel={() => setShowReleaseDialog(null)}
          />
        );
      })()}
    </div>
  );
}