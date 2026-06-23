/**
 * Example Booking Form Component - Integrated with Master Data
 * This demonstrates how to use the MasterDataContext in booking/reservation forms
 */

import { useState } from 'react';
import { useMasterData } from '../../contexts/MasterDataContext';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Input } from '../ui/input';
import { formatCurrencyPKR } from '../../lib/locale';

export function BookingFormWithMasterData() {
  const {
    venues,
    eventTypes,
    timeSlots,
    services,
    packages,
    getPrimeSpacesByVenue,
    getSubSpacesByPrimeSpace,
    getActiveEventTypes,
    getActiveTimeSlots,
    getActiveServices,
    getActivePackages,
    getApplicableAdvanceRule,
  } = useMasterData();

  // Form state
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [selectedPrimeSpaceId, setSelectedPrimeSpaceId] = useState('');
  const [selectedSubSpaceId, setSelectedSubSpaceId] = useState('');
  const [selectedEventTypeId, setSelectedEventTypeId] = useState('');
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState('');
  const [guestCount, setGuestCount] = useState(0);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');

  // Get filtered data based on selections
  const availablePrimeSpaces = selectedVenueId ? getPrimeSpacesByVenue(selectedVenueId) : [];
  const availableSubSpaces = selectedPrimeSpaceId ? getSubSpacesByPrimeSpace(selectedPrimeSpaceId) : [];
  const activeEventTypes = getActiveEventTypes();
  const activeTimeSlots = getActiveTimeSlots();
  const activeServices = getActiveServices();
  const activePackages = getActivePackages();

  // Calculate pricing based on Master Data
  const calculateTotalAmount = () => {
    let total = 0;

    // Package cost
    const selectedPackage = activePackages.find(p => p.id === selectedPackageId);
    if (selectedPackage && guestCount > 0) {
      total += selectedPackage.pricePerPerson * guestCount;
    }

    // Services cost
    selectedServices.forEach(serviceId => {
      const service = activeServices.find(s => s.id === serviceId);
      if (service) {
        total += service.basePrice;
      }
    });

    return total;
  };

  // Get applicable advance rule
  const advanceRule = getApplicableAdvanceRule(
    selectedVenueId,
    selectedPrimeSpaceId,
    selectedSubSpaceId,
    selectedEventTypeId
  );

  const calculateAdvanceAmount = () => {
    if (!advanceRule) return 0;
    const total = calculateTotalAmount();
    if (advanceRule.advanceType === 'percentage') {
      return (total * advanceRule.value) / 100;
    }
    return advanceRule.value;
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border">
      <h3 className="text-xl font-bold text-gray-900">New Booking - Master Data Integration</h3>

      {/* Venue Selection */}
      <div className="space-y-2">
        <Label htmlFor="venue">Venue *</Label>
        <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
          <SelectTrigger id="venue">
            <SelectValue placeholder="Select venue" />
          </SelectTrigger>
          <SelectContent>
            {venues.filter(v => v.isActive).map(venue => (
              <SelectItem key={venue.id} value={venue.id}>
                {venue.venueName} - {venue.location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedVenueId && (
          <p className="text-sm text-gray-600">
            Capacity: {venues.find(v => v.id === selectedVenueId)?.capacity} guests
          </p>
        )}
      </div>

      {/* Prime Space Selection */}
      {selectedVenueId && (
        <div className="space-y-2">
          <Label htmlFor="primeSpace">Prime Space *</Label>
          <Select value={selectedPrimeSpaceId} onValueChange={setSelectedPrimeSpaceId}>
            <SelectTrigger id="primeSpace">
              <SelectValue placeholder="Select prime space" />
            </SelectTrigger>
            <SelectContent>
              {availablePrimeSpaces.map(space => (
                <SelectItem key={space.id} value={space.id}>
                  {space.spaceName} ({space.spaceType}) - {space.capacity} guests
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Sub Space Selection (Optional) */}
      {selectedPrimeSpaceId && availableSubSpaces.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="subSpace">Sub Space (Optional)</Label>
          <Select value={selectedSubSpaceId} onValueChange={setSelectedSubSpaceId}>
            <SelectTrigger id="subSpace">
              <SelectValue placeholder="Select sub space or leave blank for full prime space" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Full Prime Space</SelectItem>
              {availableSubSpaces.map(space => (
                <SelectItem key={space.id} value={space.id}>
                  {space.spaceName} - {space.capacity} guests
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Event Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="eventType">Event Type *</Label>
        <Select value={selectedEventTypeId} onValueChange={setSelectedEventTypeId}>
          <SelectTrigger id="eventType">
            <SelectValue placeholder="Select event type" />
          </SelectTrigger>
          <SelectContent>
            {activeEventTypes.map(eventType => (
              <SelectItem key={eventType.id} value={eventType.id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="size-3 rounded-full" 
                    style={{ backgroundColor: eventType.color }}
                  />
                  {eventType.displayName}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Time Slot Selection */}
      <div className="space-y-2">
        <Label htmlFor="timeSlot">Time Slot *</Label>
        <Select value={selectedTimeSlotId} onValueChange={setSelectedTimeSlotId}>
          <SelectTrigger id="timeSlot">
            <SelectValue placeholder="Select time slot" />
          </SelectTrigger>
          <SelectContent>
            {activeTimeSlots.map(slot => (
              <SelectItem key={slot.id} value={slot.id}>
                {slot.name} ({slot.startTime} - {slot.endTime})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Guest Count */}
      <div className="space-y-2">
        <Label htmlFor="guests">Expected Guests *</Label>
        <Input
          id="guests"
          type="number"
          value={guestCount || ''}
          onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)}
          placeholder="Enter guest count"
        />
      </div>

      {/* Menu Package Selection */}
      <div className="space-y-2">
        <Label htmlFor="package">Menu Package *</Label>
        <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
          <SelectTrigger id="package">
            <SelectValue placeholder="Select menu package" />
          </SelectTrigger>
          <SelectContent>
            {activePackages.map(pkg => (
              <SelectItem key={pkg.id} value={pkg.id}>
                {pkg.name} - {formatCurrencyPKR(pkg.pricePerPerson)}/person
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedPackageId && (
          <p className="text-sm text-gray-600">
            {activePackages.find(p => p.id === selectedPackageId)?.description}
          </p>
        )}
      </div>

      {/* Services Selection */}
      <div className="space-y-2">
        <Label>Additional Services</Label>
        <div className="space-y-2">
          {activeServices.map(service => (
            <label key={service.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
              <input
                type="checkbox"
                checked={selectedServices.includes(service.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedServices([...selectedServices, service.id]);
                  } else {
                    setSelectedServices(selectedServices.filter(id => id !== service.id));
                  }
                }}
              />
              <span className="flex-1">{service.name}</span>
              <span className="text-sm text-gray-600">
                {formatCurrencyPKR(service.basePrice)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-2">
        <h4 className="font-semibold text-gray-900">Financial Summary</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Total Amount:</span>
            <span className="font-semibold">{formatCurrencyPKR(calculateTotalAmount())}</span>
          </div>
          {advanceRule && (
            <>
              <div className="flex justify-between text-blue-600">
                <span>Advance Required ({advanceRule.ruleName}):</span>
                <span className="font-semibold">
                  {advanceRule.advanceType === 'percentage' 
                    ? `% = `
                    : ``
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span>Balance After Advance:</span>
                <span className="font-semibold">
                  {formatCurrencyPKR(calculateTotalAmount() - calculateAdvanceAmount())}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-gray-100 rounded-lg p-4 text-xs space-y-1">
        <p className="font-semibold">Master Data Status:</p>
        <p>✅ {venues.length} Venues loaded</p>
        <p>✅ {eventTypes.length} Event Types configured</p>
        <p>✅ {timeSlots.length} Time Slots available</p>
        <p>✅ {services.length} Services available</p>
        <p>✅ {packages.length} Packages configured</p>
        {advanceRule && <p>✅ Advance Rule: {advanceRule.ruleName}</p>}
      </div>
    </div>
  );
}

