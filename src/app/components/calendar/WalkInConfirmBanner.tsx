import { Zap, Lock, CreditCard, AlertCircle } from 'lucide-react';

interface WalkInConfirmBannerProps {
  customerName?: string;
  spaceName: string;
  date: Date;
  timeSlot: string;
}

export function WalkInConfirmBanner({
  customerName,
  spaceName,
  date,
  timeSlot,
}: WalkInConfirmBannerProps) {
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-xl shadow-lg border-2 border-green-500 mb-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-white/20 rounded-lg">
          <Zap className="size-8" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-2xl font-bold">Walk-In Direct Confirmation</h3>
            <div className="px-3 py-1 bg-white/30 rounded-full text-sm font-semibold">
              Bypass Tentative
            </div>
          </div>
          
          <p className="text-green-100 mb-4">
            {customerName 
              ? `Converting ${customerName}'s tentative to confirmed booking with immediate payment.`
              : 'Creating a new confirmed booking directly - no tentative required.'
            }
          </p>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-green-200 text-xs mb-1">📅 Event Date</div>
              <div className="font-semibold">
                {date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-green-200 text-xs mb-1">⏰ Time Slot</div>
              <div className="font-semibold">{formatTime(timeSlot)}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-green-200 text-xs mb-1">🏛️ Space</div>
              <div className="font-semibold truncate" title={spaceName}>
                {spaceName}
              </div>
            </div>
          </div>

          <div className="bg-yellow-500 text-yellow-900 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lock className="size-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="font-semibold flex items-center gap-2">
                  <span>Locked Parameters - Cannot be Changed</span>
                </div>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="text-yellow-700">•</span>
                    <span>Date, time, and space are fixed for this walk-in confirmation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-yellow-700">•</span>
                    <span>Booking status will be set to <strong>CONFIRMED</strong> automatically</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-yellow-700">•</span>
                    <span>You can edit customer details, guest count, and event information</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-red-500 text-white rounded-lg p-4 mt-3">
            <div className="flex items-start gap-3">
              <CreditCard className="size-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-2 mb-1">
                  <AlertCircle className="size-4" />
                  <span>Advance Payment Required</span>
                </div>
                <p className="text-sm text-red-100">
                  You MUST enter an advance payment amount before saving this booking. 
                  Walk-in confirmations require immediate payment commitment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
