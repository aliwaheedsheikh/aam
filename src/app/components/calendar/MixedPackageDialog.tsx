import { useState } from 'react';
import { X, Building2, UtensilsCrossed, Package, Tent, Plus, Trash2, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { MixedPackageBooking, ServiceBooking, KITCHENS, RENTAL_ITEMS, RENTAL_CATEGORIES } from './service-types';
import { Booking } from './types-v2';
import { formatCurrencyPKR, formatDatePK, formatTimeRangePK } from '../../lib/locale';

interface MixedPackageDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (booking: ServiceBooking) => void;
  selectedDate?: Date;
  existingBooking?: MixedPackageBooking;
}

export function MixedPackageDialog({
  open,
  onClose,
  onSave,
  selectedDate,
  existingBooking,
}: MixedPackageDialogProps) {
  const [activeStep, setActiveStep] = useState(1);
  
  // Step 1: Service Selection
  const [services, setServices] = useState({
    hasVenue: existingBooking?.services.hasVenue || false,
    hasOutdoorCatering: existingBooking?.services.hasOutdoorCatering || false,
    hasFoodSupply: existingBooking?.services.hasFoodSupply || false,
    hasRentals: existingBooking?.services.hasRentals || false,
  });

  // Basic Details
  const [customerName, setCustomerName] = useState(existingBooking?.customerName || '');
  const [contactNumber, setContactNumber] = useState(existingBooking?.contactNumber || '');
  const [guestCount, setGuestCount] = useState(existingBooking?.guestCount || 100);
  const [status, setStatus] = useState<'tentative' | 'confirmed'>(existingBooking?.status as any || 'tentative');
  const [date, setDate] = useState(selectedDate || existingBooking?.date || new Date());
  const [startTime, setStartTime] = useState(existingBooking?.startTime || '18:00');
  const [endTime, setEndTime] = useState(existingBooking?.endTime || '23:00');
  const [notes, setNotes] = useState(existingBooking?.notes || '');

  // Venue Details (if selected)
  const [venueId, setVenueId] = useState('');
  const [venueName, setVenueName] = useState('');

  // Outdoor Catering Details (if selected)
  const [eventLocation, setEventLocation] = useState('');
  const [eventCity, setEventCity] = useState('Lahore');
  const [eventType, setEventType] = useState('Wedding');
  const [serversRequired, setServersRequired] = useState(5);
  const [transportRequired, setTransportRequired] = useState(true);

  // Food Supply Details (if selected)
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('Lahore');
  const [deliveryTime, setDeliveryTime] = useState('17:00');
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('delivery');

  // Kitchen Details (shared between catering and food supply)
  const [kitchenAssigned, setKitchenAssigned] = useState('kitchen-main');
  const [menuType, setMenuType] = useState('Continental');
  const [menuRate, setMenuRate] = useState(1500);

  // Rental Details (if selected)
  const [rentalStartDate, setRentalStartDate] = useState(date);
  const [rentalEndDate, setRentalEndDate] = useState(date);
  const [rentalItems, setRentalItems] = useState<Array<{
    id: string;
    category: string;
    itemName: string;
    quantity: number;
    unitRate: number;
  }>>([]);

  const [selectedRentalItem, setSelectedRentalItem] = useState('');
  const [rentalQuantity, setRentalQuantity] = useState(1);

  if (!open) return null;

  const serviceOptions = [
    { 
      key: 'hasVenue' as const, 
      label: 'Venue Booking', 
      icon: Building2, 
      color: 'blue',
      description: 'In-house banquet hall',
    },
    { 
      key: 'hasOutdoorCatering' as const, 
      label: 'Outdoor Catering', 
      icon: UtensilsCrossed, 
      color: 'purple',
      description: 'Catering at customer location',
    },
    { 
      key: 'hasFoodSupply' as const, 
      label: 'Food Supply', 
      icon: Package, 
      color: 'orange',
      description: 'Food only delivery',
    },
    { 
      key: 'hasRentals' as const, 
      label: 'Rental Services', 
      icon: Tent, 
      color: 'green',
      description: 'Equipment rentals',
    },
  ];

  const toggleService = (key: keyof typeof services) => {
    setServices(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addRentalItem = () => {
    if (!selectedRentalItem) return;
    
    const item = RENTAL_ITEMS.find(i => i.id === selectedRentalItem);
    if (!item) return;

    setRentalItems(prev => [...prev, {
      id: item.id,
      category: item.category,
      itemName: item.name,
      quantity: rentalQuantity,
      unitRate: item.unitRate,
    }]);

    setSelectedRentalItem('');
    setRentalQuantity(1);
  };

  const removeRentalItem = (index: number) => {
    setRentalItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    let total = 0;
    
    // Menu costs (for catering or food supply)
    if (services.hasOutdoorCatering || services.hasFoodSupply) {
      total += menuRate * guestCount;
    }

    // Rental costs
    if (services.hasRentals) {
      const rentalDays = Math.ceil((rentalEndDate.getTime() - rentalStartDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
      rentalItems.forEach(item => {
        total += item.quantity * item.unitRate * rentalDays;
      });
    }

    return total;
  };

  const handleSave = () => {
    const booking: MixedPackageBooking = {
      id: existingBooking?.id || `mixed-${Date.now()}`,
      serviceType: 'mixed-package',
      status,
      date,
      startTime,
      endTime,
      customerName,
      contactNumber,
      guestCount,
      notes,
      createdAt: existingBooking?.createdAt || new Date(),
      totalAmount: calculateTotal(),
      services,
      
      ...(services.hasVenue && {
        venueBookingId: venueId,
      }),
      
      ...(services.hasOutdoorCatering && {
        outdoorCateringDetails: {
          id: '',
          serviceType: 'outdoor-catering' as const,
          status,
          date,
          startTime,
          endTime,
          customerName,
          contactNumber,
          guestCount,
          createdAt: new Date(),
          eventLocation,
          eventCity,
          eventType,
          serversRequired,
          transportRequired,
          kitchenAssigned,
          menuType,
          menuRate,
        },
      }),
      
      ...(services.hasFoodSupply && {
        foodSupplyDetails: {
          id: '',
          serviceType: 'food-supply' as const,
          status,
          date,
          startTime,
          endTime,
          customerName,
          contactNumber,
          guestCount,
          createdAt: new Date(),
          deliveryAddress,
          deliveryCity,
          deliveryTime,
          deliveryMethod,
          kitchenAssigned,
          menuType,
          menuRate,
          productionDate: date.toISOString().split('T')[0],
          productionShift: 'afternoon' as const,
          menuTotal: menuRate * guestCount,
        },
      }),
      
      ...(services.hasRentals && {
        rentalDetails: {
          id: '',
          serviceType: 'rental-services' as const,
          status,
          date,
          startTime,
          endTime,
          customerName,
          contactNumber,
          guestCount,
          createdAt: new Date(),
          deliveryAddress: eventLocation || deliveryAddress,
          deliveryCity: eventCity || deliveryCity,
          rentalStartDate,
          rentalEndDate,
          rentalDays: Math.ceil((rentalEndDate.getTime() - rentalStartDate.getTime()) / (1000 * 60 * 60 * 24)) || 1,
          deliveryDate: rentalStartDate,
          deliveryTime: startTime,
          pickupDate: rentalEndDate,
          pickupTime: endTime,
          items: rentalItems.map(item => ({
            ...item,
            totalRate: item.quantity * item.unitRate,
          })),
        },
      }),
    };

    onSave(booking);
    onClose();
  };

  const selectedServicesCount = Object.values(services).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600">
          <div>
            <h2 className="text-xl font-bold text-white">
              {existingBooking ? 'Edit Mixed Package' : 'Create Mixed Package'}
            </h2>
            <p className="text-sm text-indigo-100 mt-0.5">Combine multiple services into one booking</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-center gap-4">
            {[
              { num: 1, label: 'Select Services' },
              { num: 2, label: 'Basic Details' },
              { num: 3, label: 'Service Details' },
              { num: 4, label: 'Review & Save' },
            ].map((step) => (
              <div key={step.num} className="flex items-center">
                <button
                  onClick={() => setActiveStep(step.num)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    activeStep === step.num
                      ? 'bg-indigo-600 text-white'
                      : activeStep > step.num
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {activeStep > step.num ? (
                    <Check className="size-4" />
                  ) : (
                    <span className="text-sm font-semibold">{step.num}</span>
                  )}
                  <span className="text-sm font-medium">{step.label}</span>
                </button>
                {step.num < 4 && (
                  <div className="h-0.5 w-8 bg-gray-300 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Select Services */}
          {activeStep === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Services to Include</h3>
              <p className="text-sm text-gray-600 mb-6">Choose which services to combine in this package</p>
              
              <div className="grid grid-cols-2 gap-4">
                {serviceOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = services[option.key];
                  
                  return (
                    <button
                      key={option.key}
                      onClick={() => toggleService(option.key)}
                      className={`relative p-6 rounded-lg border-2 transition-all ${
                        isSelected
                          ? `border-${option.color}-600 bg-${option.color}-50`
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${
                          isSelected ? `bg-${option.color}-600` : 'bg-gray-100'
                        }`}>
                          <Icon className={`size-6 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                        </div>
                        <div className="flex-1 text-left">
                          <h4 className="font-semibold text-gray-900">{option.label}</h4>
                          <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                        </div>
                        {isSelected && (
                          <div className={`absolute top-3 right-3 size-6 rounded-full bg-${option.color}-600 flex items-center justify-center`}>
                            <Check className="size-4 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedServicesCount === 0 && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">⚠️ Please select at least one service to continue</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Basic Details */}
          {activeStep === 2 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Booking Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                  <input
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0300-1234567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Date *</label>
                  <input
                    type="date"
                    value={date.toISOString().split('T')[0]}
                    onChange={(e) => setDate(new Date(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guest Count *</label>
                  <input
                    type="number"
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Booking Status</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={status === 'tentative'}
                        onChange={() => setStatus('tentative')}
                        className="text-indigo-600"
                      />
                      <span className="text-sm">Tentative</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={status === 'confirmed'}
                        onChange={() => setStatus('confirmed')}
                        className="text-indigo-600"
                      />
                      <span className="text-sm">Confirmed</span>
                    </label>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Add any special requirements or notes..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Service Details */}
          {activeStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Service-Specific Details</h3>

              {/* Outdoor Catering Details */}
              {services.hasOutdoorCatering && (
                <div className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
                  <div className="flex items-center gap-2 mb-4">
                    <UtensilsCrossed className="size-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">Outdoor Catering Details</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Event Location *</label>
                      <input
                        type="text"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Customer's venue address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={eventCity}
                        onChange={(e) => setEventCity(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option>Wedding</option>
                        <option>Corporate</option>
                        <option>Birthday</option>
                        <option>Conference</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Servers Required</label>
                      <input
                        type="number"
                        value={serversRequired}
                        onChange={(e) => setServersRequired(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        min="1"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={transportRequired}
                          onChange={(e) => setTransportRequired(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Transport Required</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Food Supply Details */}
              {services.hasFoodSupply && (
                <div className="p-4 border-2 border-orange-200 rounded-lg bg-orange-50">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="size-5 text-orange-600" />
                    <h4 className="font-semibold text-gray-900">Food Supply Details</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address *</label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Time</label>
                      <input
                        type="time"
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Method</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={deliveryMethod === 'delivery'}
                            onChange={() => setDeliveryMethod('delivery')}
                          />
                          <span className="text-sm">Delivery</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={deliveryMethod === 'pickup'}
                            onChange={() => setDeliveryMethod('pickup')}
                          />
                          <span className="text-sm">Pickup</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Kitchen & Menu (shared for catering and food supply) */}
              {(services.hasOutdoorCatering || services.hasFoodSupply) && (
                <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                  <h4 className="font-semibold text-gray-900 mb-4">Kitchen & Menu</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kitchen</label>
                      <select
                        value={kitchenAssigned}
                        onChange={(e) => setKitchenAssigned(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {KITCHENS.map(kitchen => (
                          <option key={kitchen.id} value={kitchen.id}>{kitchen.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Menu Type</label>
                      <input
                        type="text"
                        value={menuType}
                        onChange={(e) => setMenuType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rate per Person (PKR)</label>
                      <input
                        type="number"
                        value={menuRate}
                        onChange={(e) => setMenuRate(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Menu Cost</label>
                      <input
                        type="text"
                        value={formatCurrencyPKR(menuRate * guestCount)}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Rental Details */}
              {services.hasRentals && (
                <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50">
                  <div className="flex items-center gap-2 mb-4">
                    <Tent className="size-5 text-green-600" />
                    <h4 className="font-semibold text-gray-900">Rental Services</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rental Start Date</label>
                      <input
                        type="date"
                        value={rentalStartDate.toISOString().split('T')[0]}
                        onChange={(e) => setRentalStartDate(new Date(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rental End Date</label>
                      <input
                        type="date"
                        value={rentalEndDate.toISOString().split('T')[0]}
                        onChange={(e) => setRentalEndDate(new Date(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Add Rental Items */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Add Rental Items</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedRentalItem}
                        onChange={(e) => setSelectedRentalItem(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select item...</option>
                        {RENTAL_CATEGORIES.map(cat => (
                          <optgroup key={cat.id} label={cat.name}>
                            {RENTAL_ITEMS.filter(item => item.category === cat.id).map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name} - {formatCurrencyPKR(item.unitRate)}/day
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={rentalQuantity}
                        onChange={(e) => setRentalQuantity(parseInt(e.target.value))}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                        min="1"
                        placeholder="Qty"
                      />
                      <Button
                        onClick={addRentalItem}
                        disabled={!selectedRentalItem}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Rental Items List */}
                  {rentalItems.length > 0 && (
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left">Item</th>
                            <th className="px-3 py-2 text-center">Qty</th>
                            <th className="px-3 py-2 text-right">Rate/Day</th>
                            <th className="px-3 py-2 text-right">Total</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {rentalItems.map((item, index) => {
                            const days = Math.ceil((rentalEndDate.getTime() - rentalStartDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
                            const total = item.quantity * item.unitRate * days;
                            return (
                              <tr key={index} className="border-t border-gray-200">
                                <td className="px-3 py-2">{item.itemName}</td>
                                <td className="px-3 py-2 text-center">{item.quantity}</td>
                                <td className="px-3 py-2 text-right">{formatCurrencyPKR(item.unitRate)}</td>
                                <td className="px-3 py-2 text-right font-semibold">{formatCurrencyPKR(total)}</td>
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => removeRentalItem(index)}
                                    className="text-red-600 hover:bg-red-50 p-1 rounded"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {activeStep === 4 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Mixed Package</h3>
              
              <div className="space-y-4">
                {/* Customer Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Customer Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-600">Name:</span> {customerName}</div>
                    <div><span className="text-gray-600">Contact:</span> {contactNumber}</div>
                    <div><span className="text-gray-600">Date:</span> {formatDatePK(date)}</div>
                    <div><span className="text-gray-600">Guests:</span> {guestCount}</div>
                    <div><span className="text-gray-600">Time:</span> {formatTimeRangePK(startTime, endTime)}</div>
                    <div><span className="text-gray-600">Status:</span> 
                      <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                        status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Services Included */}
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Services Included</h4>
                  <div className="flex flex-wrap gap-2">
                    {services.hasVenue && <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full">🏛️ Venue</span>}
                    {services.hasOutdoorCatering && <span className="px-3 py-1 bg-purple-600 text-white text-sm rounded-full">🍽️ Outdoor Catering</span>}
                    {services.hasFoodSupply && <span className="px-3 py-1 bg-orange-600 text-white text-sm rounded-full">📦 Food Supply</span>}
                    {services.hasRentals && <span className="px-3 py-1 bg-green-600 text-white text-sm rounded-full">⛺ Rentals</span>}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Financial Summary</h4>
                  <div className="space-y-2 text-sm">
                    {(services.hasOutdoorCatering || services.hasFoodSupply) && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Menu ({guestCount} guests x {formatCurrencyPKR(menuRate)})</span>
                        <span className="font-semibold">{formatCurrencyPKR(menuRate * guestCount)}</span>
                      </div>
                    )}
                    {services.hasRentals && rentalItems.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rentals ({rentalItems.length} items)</span>
                        <span className="font-semibold">
                          {formatCurrencyPKR(rentalItems.reduce((sum, item) => { const days = Math.ceil((rentalEndDate.getTime() - rentalStartDate.getTime()) / (1000 * 60 * 60 * 24)) || 1; return sum + (item.quantity * item.unitRate * days); }, 0))}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-green-300 flex justify-between text-lg">
                      <span className="font-bold text-gray-900">Total Package Amount</span>
                      <span className="font-bold text-green-700">{formatCurrencyPKR(calculateTotal())}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex gap-2">
            {activeStep > 1 && (
              <Button
                onClick={() => setActiveStep(activeStep - 1)}
                variant="outline"
              >
                Previous
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
            
            {activeStep < 4 ? (
              <Button
                onClick={() => setActiveStep(activeStep + 1)}
                disabled={activeStep === 1 && selectedServicesCount === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Next Step
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={!customerName || !contactNumber}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Save Mixed Package
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

