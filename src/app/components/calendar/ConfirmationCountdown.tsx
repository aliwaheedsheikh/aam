import { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface ConfirmationCountdownProps {
  deadline: Date | string | undefined;
  onExpire?: () => void;
}

export function ConfirmationCountdown({ deadline, onExpire }: ConfirmationCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    // Convert deadline to Date object if needed
    let deadlineDate: Date;
    
    if (!deadline) {
      return; // No deadline provided
    }
    
    if (typeof deadline === 'string') {
      deadlineDate = new Date(deadline);
    } else if (deadline instanceof Date) {
      deadlineDate = deadline;
    } else {
      console.error('Invalid deadline type:', typeof deadline);
      return;
    }
    
    // Validate the date
    if (isNaN(deadlineDate.getTime())) {
      console.error('Invalid deadline date:', deadline);
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date();
      const total = deadlineDate.getTime() - now.getTime();

      if (total <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, total: 0 });
        if (onExpire) {
          onExpire();
        }
        return;
      }

      const seconds = Math.floor((total / 1000) % 60);
      const minutes = Math.floor((total / 1000 / 60) % 60);
      const hours = Math.floor((total / (1000 * 60 * 60)) % 24);

      setTimeRemaining({ hours, minutes, seconds, total });
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  const { hours, minutes, seconds, total } = timeRemaining;
  const isExpired = total <= 0;
  const isCritical = total > 0 && total < 30 * 60 * 1000; // Less than 30 minutes
  const isWarning = total > 0 && total < 60 * 60 * 1000; // Less than 1 hour

  if (isExpired) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg border-2 border-red-300">
        <AlertCircle className="size-5 flex-shrink-0" />
        <div className="flex-1">
          <div className="font-semibold">Confirmation Window Expired</div>
          <div className="text-sm text-red-700">Slot released back to available pool</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 ${
        isCritical
          ? 'bg-red-50 text-red-900 border-red-400 animate-pulse'
          : isWarning
          ? 'bg-orange-50 text-orange-900 border-orange-400'
          : 'bg-blue-50 text-blue-900 border-blue-400'
      }`}
    >
      <Clock
        className={`size-6 flex-shrink-0 ${
          isCritical
            ? 'text-red-600 animate-pulse'
            : isWarning
            ? 'text-orange-600'
            : 'text-blue-600'
        }`}
      />
      <div className="flex-1">
        <div className="font-semibold text-sm">
          {isCritical ? '⚠️ URGENT: ' : isWarning ? '⏰ Warning: ' : ''}
          Confirmation Deadline
        </div>
        <div className="text-xs mt-0.5 opacity-80">
          Customer must submit advance payment before deadline
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-baseline gap-1 font-mono">
          <div className="flex flex-col items-center">
            <div className={`text-2xl font-bold ${isCritical ? 'text-red-700' : isWarning ? 'text-orange-700' : 'text-blue-700'}`}>
              {hours.toString().padStart(2, '0')}
            </div>
            <div className="text-[9px] uppercase tracking-wider opacity-70">Hours</div>
          </div>
          <div className={`text-2xl font-bold ${isCritical ? 'text-red-700' : isWarning ? 'text-orange-700' : 'text-blue-700'}`}>:</div>
          <div className="flex flex-col items-center">
            <div className={`text-2xl font-bold ${isCritical ? 'text-red-700' : isWarning ? 'text-orange-700' : 'text-blue-700'}`}>
              {minutes.toString().padStart(2, '0')}
            </div>
            <div className="text-[9px] uppercase tracking-wider opacity-70">Mins</div>
          </div>
          <div className={`text-2xl font-bold ${isCritical ? 'text-red-700' : isWarning ? 'text-orange-700' : 'text-blue-700'}`}>:</div>
          <div className="flex flex-col items-center">
            <div className={`text-2xl font-bold ${isCritical ? 'text-red-700' : isWarning ? 'text-orange-700' : 'text-blue-700'}`}>
              {seconds.toString().padStart(2, '0')}
            </div>
            <div className="text-[9px] uppercase tracking-wider opacity-70">Secs</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ConfirmationBannerProps {
  booking: {
    id: string;
    customerName: string;
    confirmationRequestedAt?: Date | string;
    confirmationDeadline?: Date | string;
    confirmationRequestedBy?: string;
  };
  onExpire?: () => void;
}

export function ConfirmationBanner({ booking, onExpire }: ConfirmationBannerProps) {
  if (!booking.confirmationDeadline || !booking.confirmationRequestedAt) {
    return null;
  }

  // Convert confirmationRequestedAt to Date if needed
  const requestedAt = typeof booking.confirmationRequestedAt === 'string' 
    ? new Date(booking.confirmationRequestedAt)
    : booking.confirmationRequestedAt;

  return (
    <div className="space-y-3">
      {/* Main Countdown */}
      <ConfirmationCountdown deadline={booking.confirmationDeadline} onExpire={onExpire} />

      {/* Request Details */}
      <div className="bg-white border-2 border-blue-300 rounded-lg p-3 text-sm">
        <div className="flex items-start gap-3">
          <CheckCircle className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <div className="font-semibold text-gray-900">Immediate Confirmation Requested</div>
            <div className="text-gray-700">
              <span className="font-medium">{booking.customerName}</span> has been given priority for this slot.
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
              <div>
                <span className="font-medium">Requested:</span>{' '}
                {requestedAt.toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </div>
              {booking.confirmationRequestedBy && (
                <div>
                  <span className="font-medium">By:</span> {booking.confirmationRequestedBy}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Instructions */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 text-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-yellow-900">Payment Required to Confirm</div>
            <div className="text-yellow-800 text-xs">
              Customer must submit advance payment before the deadline to convert this tentative into a confirmed booking.
              Slot is temporarily locked from other bookings during this window.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}