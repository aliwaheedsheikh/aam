import { useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Building2, Split, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { isVenueAvailable } from './availability-logic';
import { Booking, Slot } from './types';

/**
 * VENUE RULES DEMONSTRATION COMPONENT
 * 
 * This component visually demonstrates the three venue reservation rules:
 * 1. Full Venue Booking → All sub-venues blocked
 * 2. Sub-Venue Booking → Parent full venue blocked, sibling sub-venues available
 * 3. Concurrent Sub-Venue Bookings → Multiple sub-venues can be booked simultaneously
 */

export function VenueRulesDemo() {
  const [scenario, setScenario] = useState<'initial' | 'fullVenue' | 'subVenueA' | 'bothSubVenues'>('initial');
  const testDate = new Date(2026, 0, 20); // Jan 20, 2026
  const testSlot: Slot = 'dinner';

  // Mock bookings based on scenario
  const getBookings = (): Booking[] => {
    const bookings: Booking[] = [];

    if (scenario === 'fullVenue') {
      // Scenario 1: Full venue booked
      bookings.push({
        id: 'demo-1',
        venueId: 'm1',
        isFullVenue: true,
        customerName: 'Ali Raza (Wedding)',
        guestCount: 800,
        date: testDate,
        slot: testSlot,
        status: 'confirmed',
        amount: 100000,
        eventType: 'Wedding',
      });
    } else if (scenario === 'subVenueA') {
      // Scenario 2: Sub-venue A booked
      bookings.push({
        id: 'demo-2',
        venueId: 'm1-a',
        isFullVenue: false,
        customerName: 'Ali Waheed (Corporate)',
        guestCount: 250,
        date: testDate,
        slot: testSlot,
        status: 'confirmed',
        amount: 50000,
        eventType: 'Corporate Event',
      });
    } else if (scenario === 'bothSubVenues') {
      // Scenario 3: Both sub-venues booked
      bookings.push(
        {
          id: 'demo-3',
          venueId: 'm1-a',
          isFullVenue: false,
          customerName: 'Ali Waheed (Corporate)',
          guestCount: 250,
          date: testDate,
          slot: testSlot,
          status: 'confirmed',
          amount: 50000,
          eventType: 'Corporate Event',
        },
        {
          id: 'demo-4',
          venueId: 'm1-b',
          isFullVenue: false,
          customerName: 'Sara Ahmad (Birthday)',
          guestCount: 400,
          date: testDate,
          slot: testSlot,
          status: 'confirmed',
          amount: 60000,
          eventType: 'Birthday Party',
        }
      );
    }

    return bookings;
  };

  const currentBookings = getBookings();

  // Check availability for each venue
  const m1Available = isVenueAvailable('m1', testDate, testSlot, currentBookings, 'full');
  const m1aAvailable = isVenueAvailable('m1-a', testDate, testSlot, currentBookings, 'partial');
  const m1bAvailable = isVenueAvailable('m1-b', testDate, testSlot, currentBookings, 'partial');

  const getStatusIcon = (available: boolean) => {
    return available ? (
      <CheckCircle2 className="size-5 text-green-600" />
    ) : (
      <XCircle className="size-5 text-red-600" />
    );
  };

  const getStatusBadge = (available: boolean, reason?: string) => {
    if (available) {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          ✓ Available
        </span>
      );
    } else {
      return (
        <div className="space-y-1">
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            ✗ Blocked
          </span>
          {reason && (
            <p className="text-xs text-gray-600 mt-1">{reason}</p>
          )}
        </div>
      );
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          <div>
            <h2 className="mb-2">Venue Reservation Rules - Live Demo</h2>
            <p className="text-sm text-gray-600">
              Test different booking scenarios to see how venue dependencies work
            </p>
          </div>

          {/* Scenario Selector */}
          <div className="grid grid-cols-4 gap-3">
            <Button
              variant={scenario === 'initial' ? 'default' : 'outline'}
              onClick={() => setScenario('initial')}
              className="h-auto py-3"
            >
              <div className="text-center">
                <div className="text-sm font-semibold">Initial State</div>
                <div className="text-xs mt-1">All Available</div>
              </div>
            </Button>
            <Button
              variant={scenario === 'fullVenue' ? 'default' : 'outline'}
              onClick={() => setScenario('fullVenue')}
              className="h-auto py-3"
            >
              <div className="text-center">
                <div className="text-sm font-semibold">Scenario 1</div>
                <div className="text-xs mt-1">Full Venue Booked</div>
              </div>
            </Button>
            <Button
              variant={scenario === 'subVenueA' ? 'default' : 'outline'}
              onClick={() => setScenario('subVenueA')}
              className="h-auto py-3"
            >
              <div className="text-center">
                <div className="text-sm font-semibold">Scenario 2</div>
                <div className="text-xs mt-1">Sub-Venue A Booked</div>
              </div>
            </Button>
            <Button
              variant={scenario === 'bothSubVenues' ? 'default' : 'outline'}
              onClick={() => setScenario('bothSubVenues')}
              className="h-auto py-3"
            >
              <div className="text-center">
                <div className="text-sm font-semibold">Scenario 3</div>
                <div className="text-xs mt-1">Both Sub-Venues Booked</div>
              </div>
            </Button>
          </div>

          {/* Current Scenario Description */}
          {scenario === 'initial' && (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertDescription>
                <strong>Initial State:</strong> No bookings exist. All venues (M1, M1-A, M1-B) are available.
              </AlertDescription>
            </Alert>
          )}
          {scenario === 'fullVenue' && (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertDescription>
                <strong>Rule 1 - Full Venue Booking:</strong> Marquee 1 (Prime) is booked by Ali Raza for a wedding with 800 guests.
                <br />
                <strong>Expected Result:</strong> M1-A and M1-B should be automatically blocked.
              </AlertDescription>
            </Alert>
          )}
          {scenario === 'subVenueA' && (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertDescription>
                <strong>Rule 2 - Sub-Venue Booking:</strong> M1-A is booked by Ali Waheed for a corporate event with 250 guests.
                <br />
                <strong>Expected Result:</strong> Marquee 1 (Prime) should be blocked, but M1-B should remain available.
              </AlertDescription>
            </Alert>
          )}
          {scenario === 'bothSubVenues' && (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertDescription>
                <strong>Rule 3 - Concurrent Sub-Venue Bookings:</strong> Both M1-A and M1-B are booked for different events.
                <br />
                <strong>Expected Result:</strong> Both sub-venues are confirmed, and Marquee 1 (Prime) is blocked.
              </AlertDescription>
            </Alert>
          )}

          {/* Visual Venue Status */}
          <div className="grid grid-cols-3 gap-4">
            {/* Marquee 1 (Prime) */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-6 text-blue-600" />
                    <div>
                      <h3 className="font-semibold">Marquee 1</h3>
                      <p className="text-xs text-gray-500">Full Venue (Prime)</p>
                    </div>
                  </div>
                  {getStatusIcon(m1Available.available)}
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">Capacity: 800 guests</p>
                  {getStatusBadge(m1Available.available, m1Available.reason)}
                </div>
                {currentBookings.find(b => b.venueId === 'm1') && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs font-medium text-blue-900">
                      Booked by: {currentBookings.find(b => b.venueId === 'm1')?.customerName}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {currentBookings.find(b => b.venueId === 'm1')?.guestCount} guests
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* M1-A */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Split className="size-6 text-purple-600" />
                    <div>
                      <h3 className="font-semibold">M1-A</h3>
                      <p className="text-xs text-gray-500">Partial Venue (Sub-space)</p>
                    </div>
                  </div>
                  {getStatusIcon(m1aAvailable.available)}
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">Capacity: 250 guests</p>
                  {getStatusBadge(m1aAvailable.available, m1aAvailable.reason)}
                </div>
                {currentBookings.find(b => b.venueId === 'm1-a') && (
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs font-medium text-purple-900">
                      Booked by: {currentBookings.find(b => b.venueId === 'm1-a')?.customerName}
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      {currentBookings.find(b => b.venueId === 'm1-a')?.guestCount} guests
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* M1-B */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Split className="size-6 text-orange-600" />
                    <div>
                      <h3 className="font-semibold">M1-B</h3>
                      <p className="text-xs text-gray-500">Partial Venue (Sub-space)</p>
                    </div>
                  </div>
                  {getStatusIcon(m1bAvailable.available)}
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">Capacity: 400 guests</p>
                  {getStatusBadge(m1bAvailable.available, m1bAvailable.reason)}
                </div>
                {currentBookings.find(b => b.venueId === 'm1-b') && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <p className="text-xs font-medium text-orange-900">
                      Booked by: {currentBookings.find(b => b.venueId === 'm1-b')?.customerName}
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      {currentBookings.find(b => b.venueId === 'm1-b')?.guestCount} guests
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Rule Explanation */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="mb-3 text-blue-900 font-semibold">📋 Active Rules Explanation</h3>
            <div className="space-y-2 text-sm text-blue-800">
              {scenario === 'initial' && (
                <div>
                  <p><strong>All venues available</strong></p>
                  <ul className="list-disc list-inside space-y-1 mt-2 text-blue-700">
                    <li>Marquee 1 (Prime) can be booked as full venue</li>
                    <li>M1-A can be booked as partial venue</li>
                    <li>M1-B can be booked as partial venue</li>
                  </ul>
                </div>
              )}
              {scenario === 'fullVenue' && (
                <div>
                  <p><strong>Rule 1 in effect: Full Venue Booking</strong></p>
                  <ul className="list-disc list-inside space-y-1 mt-2 text-blue-700">
                    <li>✓ Marquee 1 is BOOKED (full venue)</li>
                    <li>✗ M1-A is BLOCKED (parent venue booked)</li>
                    <li>✗ M1-B is BLOCKED (parent venue booked)</li>
                  </ul>
                </div>
              )}
              {scenario === 'subVenueA' && (
                <div>
                  <p><strong>Rule 2 in effect: Sub-Venue Booking</strong></p>
                  <ul className="list-disc list-inside space-y-1 mt-2 text-blue-700">
                    <li>✗ Marquee 1 is BLOCKED (sub-venue M1-A is booked)</li>
                    <li>✓ M1-A is BOOKED</li>
                    <li>✓ M1-B is AVAILABLE (sibling sub-venue not affected)</li>
                  </ul>
                </div>
              )}
              {scenario === 'bothSubVenues' && (
                <div>
                  <p><strong>Rule 3 in effect: Concurrent Sub-Venue Bookings</strong></p>
                  <ul className="list-disc list-inside space-y-1 mt-2 text-blue-700">
                    <li>✗ Marquee 1 is BLOCKED (both sub-venues are booked)</li>
                    <li>✓ M1-A is BOOKED (concurrent booking allowed)</li>
                    <li>✓ M1-B is BOOKED (concurrent booking allowed)</li>
                  </ul>
                </div>
              )}
            </div>
          </Card>

          {/* Dependency Diagram */}
          <Card className="p-6">
            <h3 className="mb-4 font-semibold">Venue Dependency Diagram</h3>
            <div className="flex items-center justify-center gap-8">
              <div className="text-center space-y-2">
                <div className={`p-4 rounded-lg border-2 ${
                  m1Available.available ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                }`}>
                  <Building2 className="size-8 mx-auto mb-2" />
                  <p className="font-semibold">Marquee 1</p>
                  <p className="text-xs">(Prime / Full)</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="h-px w-12 bg-gray-300 relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <div className="w-0 h-0 border-t-4 border-t-transparent border-l-8 border-l-gray-300 border-b-4 border-b-transparent" />
                  </div>
                </div>
                <div className="h-px w-12 bg-gray-300 relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2">
                    <div className="w-0 h-0 border-t-4 border-t-transparent border-r-8 border-r-gray-300 border-b-4 border-b-transparent" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className={`p-4 rounded-lg border-2 ${
                  m1aAvailable.available ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                }`}>
                  <Split className="size-8 mx-auto mb-2" />
                  <p className="font-semibold">M1-A</p>
                  <p className="text-xs">(Sub-space)</p>
                </div>
                <div className={`p-4 rounded-lg border-2 ${
                  m1bAvailable.available ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                }`}>
                  <Split className="size-8 mx-auto mb-2" />
                  <p className="font-semibold">M1-B</p>
                  <p className="text-xs">(Sub-space)</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center mt-4">
              Arrows show dependency relationships. Green = Available, Red = Blocked/Booked
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}