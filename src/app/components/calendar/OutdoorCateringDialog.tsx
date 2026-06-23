import { useState, useEffect } from 'react';
import { X, MapPin, Users, Calendar, Clock, UtensilsCrossed, Truck, User, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { TimePicker } from '../ui/time-picker';
import { InternationalPhoneInput } from '../ui/international-phone-input';
import { ServiceBooking, OutdoorCateringBooking, KITCHENS } from './service-types';
import { toast } from 'sonner';

interface OutdoorCateringDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (booking: ServiceBooking) => void;
  selectedDate: Date;
}

export function OutdoorCateringDialog({ open, onClose, onSave, selectedDate }: OutdoorCateringDialogProps) {
  // Basic Info
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [eventType, setEventType] = useState('');
  const [guestCount, setGuestCount] = useState<number>(100);
  const [date, setDate] = useState(selectedDate.toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('18:00');

  // Location
  const [eventLocation, setEventLocation] = useState('');
  const [eventArea, setEventArea] = useState('');
  const [eventCity, setEventCity] = useState('Islamabad');

  // Service Requirements
  const [serversRequired, setServersRequired] = useState<number>(10);
  const [chefsRequired, setChefsRequired] = useState<number>(2);

  // Equipment & Logistics
  const [transportRequired, setTransportRequired] = useState(true);
  const [vehiclesNeeded, setVehiclesNeeded] = useState<number>(1);
  const [setupTime, setSetupTime] = useState('12:00');

  // Kitchen
  const [kitchenAssigned, setKitchenAssigned] = useState(KITCHENS[0].id);

  // Menu & Pricing
  const [menuType, setMenuType] = useState('');
  const [menuRate, setMenuRate] = useState<number>(0);

  // Booking Status
  const [bookingStatus, setBookingStatus] = useState<'tentative' | 'confirmed'>('tentative');

  // Notes
  const [notes, setNotes] = useState('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setDate(selectedDate.toISOString().split('T')[0]);
      // Reset form
      setCustomerName('');
      setContactNumber('');
      setEventType('');
      setGuestCount(100);
      setEventLocation('');
      setEventArea('');
      setEventCity('Islamabad');
      setServersRequired(10);
      setChefsRequired(2);
      setTransportRequired(true);
      setVehiclesNeeded(1);
      setSetupTime('12:00');
      setStartTime('14:00');
      setEndTime('18:00');
      setKitchenAssigned(KITCHENS[0].id);
      setMenuType('');
      setMenuRate(0);
      setBookingStatus('tentative');
      setNotes('');
      setErrors({});
    }
  }, [open, selectedDate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!customerName.trim()) newErrors.customerName = 'Required';
    if (!contactNumber.trim()) newErrors.contactNumber = 'Required';
    if (!eventType.trim()) newErrors.eventType = 'Required';
    if (!guestCount || guestCount < 1) newErrors.guestCount = 'Min 1 guest';
    if (!eventLocation.trim()) newErrors.eventLocation = 'Required';
    if (!eventCity.trim()) newErrors.eventCity = 'Required';
    if (!serversRequired || serversRequired < 1) newErrors.serversRequired = 'Required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      toast.error('Please fill all required fields');
      return;
    }

    const menuTotal = menuRate * guestCount;
    
    const booking: Partial<OutdoorCateringBooking> & ServiceBooking = {
      id: `outdoor-${Date.now()}`,
      serviceType: 'outdoor-catering',
      status: bookingStatus,
      date: new Date(date),
      startTime,
      endTime,
      customerName: customerName.trim(),
      contactNumber: contactNumber.trim(),
      guestCount,
      eventLocation,
      eventCity,
      eventArea,
      eventType,
      serversRequired,
      chefsRequired,
      transportRequired,
      vehiclesNeeded,
      setupTime,
      menuType,
      menuRate,
      menuTotal,
      kitchenAssigned,
      notes: notes.trim(),
      createdAt: new Date(),
      totalAmount: menuTotal,
      paidAmount: 0,
      balanceDue: menuTotal,
    };

    onSave(booking as ServiceBooking);
    toast.success('Outdoor Catering Booking Created', {
      description: `${customerName} • ${new Date(date).toLocaleDateString()} • ${eventCity}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogTitle className="sr-only">New Outdoor Catering Booking</DialogTitle>
        <DialogDescription className="sr-only">
          Create a new outdoor catering service booking
        </DialogDescription>

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-5">
          <button onClick={onClose} className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-white/20 transition-colors">
            <X className="size-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <UtensilsCrossed className="size-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Outdoor Catering Booking</h2>
              <p className="text-purple-100 text-sm">Service at customer location</p>
            </div>
          </div>

          {/* Status Toggle */}
          <div className="flex gap-2 bg-white/10 rounded-lg p-1 max-w-md">
            <button
              onClick={() => setBookingStatus('tentative')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                bookingStatus === 'tentative'
                  ? 'bg-white text-purple-700 shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Tentative
            </button>
            <button
              onClick={() => setBookingStatus('confirmed')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                bookingStatus === 'confirmed'
                  ? 'bg-white text-purple-700 shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Confirmed
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Customer Information */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="size-4" />
              Customer Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer Name <span className="text-red-500">*</span></Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full name"
                  className={errors.customerName ? 'border-red-500' : ''}
                />
                {errors.customerName && <p className="text-xs text-red-600 mt-1">{errors.customerName}</p>}
              </div>
              <div>
                <Label>Contact Number <span className="text-red-500">*</span></Label>
                <InternationalPhoneInput
                  value={contactNumber}
                  onChange={(value) => setContactNumber(value || '')}
                  placeholder="03XX-XXXXXXX"
                  error={!!errors.contactNumber}
                  errorMessage={errors.contactNumber}
                  defaultCountry="PK"
                  required
                />
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="size-4" />
              Event Details
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Event Date <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label>Start Time</Label>
                <TimePicker value={startTime} onChange={setStartTime} />
              </div>
              <div>
                <Label>End Time</Label>
                <TimePicker value={endTime} onChange={setEndTime} />
              </div>
              <div>
                <Label>Setup Time</Label>
                <TimePicker value={setupTime} onChange={setSetupTime} />
              </div>
              <div>
                <Label>Event Type <span className="text-red-500">*</span></Label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md bg-white ${errors.eventType ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select type</option>
                  <option value="wedding">Wedding</option>
                  <option value="corporate">Corporate Event</option>
                  <option value="birthday">Birthday</option>
                  <option value="conference">Conference</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label>Guest Count <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  min="1"
                  className={errors.guestCount ? 'border-red-500' : ''}
                />
              </div>
            </div>
          </div>

          {/* Event Location */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <MapPin className="size-4" />
              Event Location (Customer Venue)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label>Address <span className="text-red-500">*</span></Label>
                <Input
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Street address or venue name"
                  className={errors.eventLocation ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <Label>Area/Sector</Label>
                <Input
                  value={eventArea}
                  onChange={(e) => setEventArea(e.target.value)}
                  placeholder="e.g., F-7, DHA"
                />
              </div>
              <div className="col-span-3">
                <Label>City <span className="text-red-500">*</span></Label>
                <select
                  value={eventCity}
                  onChange={(e) => setEventCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                >
                  <option value="Islamabad">Islamabad</option>
                  <option value="Rawalpindi">Rawalpindi</option>
                  <option value="Lahore">Lahore</option>
                  <option value="Karachi">Karachi</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Service Requirements */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="size-4" />
                Staff Requirements
              </h3>
              <div className="space-y-3">
                <div>
                  <Label>Servers Required <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    value={serversRequired}
                    onChange={(e) => setServersRequired(Number(e.target.value))}
                    min="1"
                    className={errors.serversRequired ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label>Chefs Required</Label>
                  <Input
                    type="number"
                    value={chefsRequired}
                    onChange={(e) => setChefsRequired(Number(e.target.value))}
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Truck className="size-4" />
                Logistics
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="transport"
                    checked={transportRequired}
                    onChange={(e) => setTransportRequired(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="transport" className="cursor-pointer">Transport Required</Label>
                </div>
                {transportRequired && (
                  <div>
                    <Label>Vehicles Needed</Label>
                    <Input
                      type="number"
                      value={vehiclesNeeded}
                      onChange={(e) => setVehiclesNeeded(Number(e.target.value))}
                      min="1"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Kitchen & Menu */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Kitchen & Menu</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Kitchen Assignment</Label>
                <select
                  value={kitchenAssigned}
                  onChange={(e) => setKitchenAssigned(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                >
                  {KITCHENS.map((kitchen) => (
                    <option key={kitchen.id} value={kitchen.id}>
                      {kitchen.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Menu Type</Label>
                <Input
                  value={menuType}
                  onChange={(e) => setMenuType(e.target.value)}
                  placeholder="e.g., Premium BBQ"
                />
              </div>
              <div>
                <Label>Menu Rate (per person)</Label>
                <Input
                  type="number"
                  value={menuRate}
                  onChange={(e) => setMenuRate(Number(e.target.value))}
                  min="0"
                  placeholder="PKR"
                />
              </div>
            </div>
            {menuRate > 0 && guestCount > 0 && (
              <div className="mt-3 p-3 bg-purple-100 rounded-lg">
                <p className="text-sm text-purple-900">
                  <strong>Estimated Total:</strong> PKR {(menuRate * guestCount).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label>Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special requirements, equipment needs, etc."
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-white px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            All fields marked with <span className="text-red-500">*</span> are required
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white">
              Create Booking
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
