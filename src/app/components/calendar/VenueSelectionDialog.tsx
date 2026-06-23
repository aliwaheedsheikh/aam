import { useState, useMemo } from 'react';
import { Venue, Slot, VenueType } from './types';
import { bookings } from './mock-data';
import { getAvailableVenues } from './availability-logic';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Calendar, Users, Building2, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

interface VenueSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (venue: Venue, date: Date, slot: Slot, guestCount: number) => void;
}

export function VenueSelectionDialog({
  open,
  onClose,
  onSelect,
}: VenueSelectionDialogProps) {
  const [step, setStep] = useState<'date' | 'type' | 'venues'>('date');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<Slot>('lunch');
  const [venueType, setVenueType] = useState<VenueType>('full');
  const [guestCount, setGuestCount] = useState<string>('');
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  // Calculate available venues
  const availableVenues = useMemo(() => {
    if (!selectedDate) return [];

    const date = new Date(selectedDate);
    const minCapacity = guestCount ? parseInt(guestCount) : undefined;

    return getAvailableVenues(date, selectedSlot, venueType, bookings, minCapacity);
  }, [selectedDate, selectedSlot, venueType, guestCount]);

  const handleContinue = () => {
    if (step === 'date') {
      setStep('type');
    } else if (step === 'type') {
      setStep('venues');
    }
  };

  const handleBack = () => {
    if (step === 'venues') {
      setStep('type');
    } else if (step === 'type') {
      setStep('date');
    }
  };

  const handleSelectVenue = (venue: Venue) => {
    setSelectedVenue(venue);
  };

  const handleConfirm = () => {
    if (selectedVenue && selectedDate) {
      const date = new Date(selectedDate);
      const guests = guestCount ? parseInt(guestCount) : 0;
      onSelect(selectedVenue, date, selectedSlot, guests);
      handleReset();
    }
  };

  const handleReset = () => {
    setStep('date');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedSlot('lunch');
    setVenueType('full');
    setGuestCount('');
    setSelectedVenue(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Venue Selection Flow</DialogTitle>
          <DialogDescription>
            Select date, space type, and available venue
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          <div className={`flex items-center gap-2 ${step === 'date' ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`size-8 rounded-full flex items-center justify-center ${
              step === 'date' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              1
            </div>
            <span className="text-sm">Date & Time</span>
          </div>
          <div className="w-12 h-px bg-gray-300" />
          <div className={`flex items-center gap-2 ${step === 'type' ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`size-8 rounded-full flex items-center justify-center ${
              step === 'type' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              2
            </div>
            <span className="text-sm">Space Type</span>
          </div>
          <div className="w-12 h-px bg-gray-300" />
          <div className={`flex items-center gap-2 ${step === 'venues' ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`size-8 rounded-full flex items-center justify-center ${
              step === 'venues' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              3
            </div>
            <span className="text-sm">Select Venue</span>
          </div>
        </div>

        {/* Step 1: Date Selection */}
        {step === 'date' && (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-date">Event Date</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label>Time Slot</Label>
                <RadioGroup value={selectedSlot} onValueChange={(v) => setSelectedSlot(v as Slot)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lunch" id="lunch" />
                    <Label htmlFor="lunch">Lunch (12:00 PM - 5:00 PM)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dinner" id="dinner" />
                    <Label htmlFor="dinner">Dinner (6:00 PM - 12:00 AM)</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest-count">Expected Guest Count (Optional)</Label>
              <Input
                id="guest-count"
                type="number"
                placeholder="Enter number of guests"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                min="0"
              />
              <p className="text-sm text-gray-500">
                This will filter venues by minimum capacity
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Space Type Selection */}
        {step === 'type' && (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setVenueType('full')}
                className={`p-6 border-2 rounded-lg transition-all ${
                  venueType === 'full'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <Building2 className={`size-12 ${venueType === 'full' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div className="text-center">
                    <h3 className="mb-1">Full Venue</h3>
                    <p className="text-sm text-gray-600">
                      Book entire venue space
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      M1, M2, M3, G1, G2, G3
                    </p>
                  </div>
                  {venueType === 'full' && (
                    <CheckCircle2 className="size-6 text-blue-600" />
                  )}
                </div>
              </button>

              <button
                onClick={() => setVenueType('partial')}
                className={`p-6 border-2 rounded-lg transition-all ${
                  venueType === 'partial'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <Building2 className={`size-12 ${venueType === 'partial' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div className="text-center">
                    <h3 className="mb-1">Partial Venue</h3>
                    <p className="text-sm text-gray-600">
                      Book sub-venue sections
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      M1-A, M1-B, G1-A, G1-B, etc.
                    </p>
                  </div>
                  {venueType === 'partial' && (
                    <CheckCircle2 className="size-6 text-blue-600" />
                  )}
                </div>
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="mb-2 font-semibold text-blue-900">📋 Venue Reservation Rules & Dependencies:</h4>
              <ul className="text-sm text-blue-800 space-y-1.5">
                <li><strong>Rule 1 - Full Venue Booking:</strong> If full venue (M1, M2, M3, G1, G2, G3) is booked, all sub-venues become unavailable</li>
                <li><strong>Rule 2 - Sub-Venue Booking:</strong> If any sub-venue (M1-A, M1-B, etc.) is booked, the parent full venue becomes unavailable</li>
                <li><strong>Rule 3 - Concurrent Sub-Venues:</strong> Multiple sub-venues of the same parent can be booked simultaneously if available</li>
              </ul>
              <div className="mt-3 pt-3 border-t border-blue-300">
                <p className="text-xs text-blue-700 font-medium mb-1">Examples:</p>
                <ul className="text-xs text-blue-700 space-y-0.5">
                  <li>• Marquee 1 (Prime) booked → M1-A and M1-B unavailable</li>
                  <li>• M1-A booked → Marquee 1 unavailable, but M1-B still available</li>
                  <li>• M1-A and M1-B can both be booked concurrently</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Venue Selection */}
        {step === 'venues' && (
          <div className="space-y-4 py-4">
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-gray-500" />
                    <span>
                      {new Date(selectedDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="capitalize">{selectedSlot}</div>
                  {guestCount && (
                    <div className="flex items-center gap-1">
                      <Users className="size-4 text-gray-500" />
                      <span>{guestCount} guests</span>
                    </div>
                  )}
                </div>
                <div className="text-sm">
                  {venueType === 'full' ? 'Full Venues' : 'Partial Venues'}
                </div>
              </div>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {availableVenues.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Building2 className="size-12 mx-auto mb-3 text-gray-300" />
                    <p>No venues available for selected criteria</p>
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                  </div>
                ) : (
                  availableVenues.map((venue) => (
                    <button
                      key={venue.id}
                      onClick={() => handleSelectVenue(venue)}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                        selectedVenue?.id === venue.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="mb-1">{venue.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Users className="size-4" />
                              <span>Capacity: {venue.capacity}</span>
                            </div>
                            <div className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                              Available
                            </div>
                          </div>
                        </div>
                        {selectedVenue?.id === venue.id && (
                          <CheckCircle2 className="size-6 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={step === 'date' ? onClose : handleBack}>
            {step === 'date' ? 'Cancel' : 'Back'}
          </Button>
          <div className="flex gap-2">
            {step !== 'venues' ? (
              <Button onClick={handleContinue} disabled={step === 'date' && !selectedDate}>
                Continue
              </Button>
            ) : (
              <Button onClick={handleConfirm} disabled={!selectedVenue}>
                Create Booking
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}