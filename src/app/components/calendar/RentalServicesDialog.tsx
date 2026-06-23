import { useState, useEffect } from 'react';
import { X, Tent, Calendar, MapPin, User, Phone, Plus, Trash2, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { InternationalPhoneInput } from '../ui/international-phone-input';
import { ServiceBooking, RentalServiceBooking, RentalItem, RENTAL_ITEMS, RENTAL_CATEGORIES } from './service-types';
import { toast } from 'sonner';
import { formatCurrencyPKR } from '../../lib/locale';

interface RentalServicesDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (booking: ServiceBooking) => void;
  selectedDate: Date;
}

export function RentalServicesDialog({ open, onClose, onSave, selectedDate }: RentalServicesDialogProps) {
  // Basic Info
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  
  // Rental Period
  const [rentalStartDate, setRentalStartDate] = useState(selectedDate.toISOString().split('T')[0]);
  const [rentalEndDate, setRentalEndDate] = useState(selectedDate.toISOString().split('T')[0]);
  
  // Delivery Info
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('Islamabad');
  const [deliveryDate, setDeliveryDate] = useState(selectedDate.toISOString().split('T')[0]);
  const [deliveryTime, setDeliveryTime] = useState('10:00');
  const [pickupDate, setPickupDate] = useState(selectedDate.toISOString().split('T')[0]);
  const [pickupTime, setPickupTime] = useState('18:00');
  
  // Charges
  const [deliveryCharges, setDeliveryCharges] = useState<number>(500);
  const [setupCharges, setSetupCharges] = useState<number>(0);
  const [securityDeposit, setSecurityDeposit] = useState<number>(0);
  
  // Items
  const [selectedItems, setSelectedItems] = useState<RentalItem[]>([]);
  const [showItemSelector, setShowItemSelector] = useState(false);

  // Booking Status
  const [bookingStatus, setBookingStatus] = useState<'tentative' | 'confirmed'>('tentative');

  // Notes
  const [notes, setNotes] = useState('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setRentalStartDate(dateStr);
      setRentalEndDate(dateStr);
      setDeliveryDate(dateStr);
      setPickupDate(dateStr);
      // Reset form
      setCustomerName('');
      setContactNumber('');
      setDeliveryAddress('');
      setDeliveryArea('');
      setDeliveryCity('Islamabad');
      setDeliveryTime('10:00');
      setPickupTime('18:00');
      setDeliveryCharges(500);
      setSetupCharges(0);
      setSecurityDeposit(0);
      setSelectedItems([]);
      setBookingStatus('tentative');
      setNotes('');
      setErrors({});
    }
  }, [open, selectedDate]);

  const calculateRentalDays = () => {
    const start = new Date(rentalStartDate);
    const end = new Date(rentalEndDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const calculateTotal = () => {
    const itemsTotal = selectedItems.reduce((sum, item) => sum + item.totalRate, 0);
    const rentalDays = calculateRentalDays();
    const rentalTotal = itemsTotal * rentalDays;
    const grandTotal = rentalTotal + deliveryCharges + setupCharges;
    return { itemsTotal, rentalDays, rentalTotal, grandTotal };
  };

  const addItem = (itemId: string) => {
    const item = RENTAL_ITEMS.find(i => i.id === itemId);
    if (!item) return;

    const newItem: RentalItem = {
      id: `${Date.now()}-${itemId}`,
      category: item.category as RentalItem['category'],
      itemName: item.name,
      quantity: 1,
      unitRate: item.unitRate,
      totalRate: item.unitRate,
      inventoryId: item.id,
    };

    setSelectedItems([...selectedItems, newItem]);
    setShowItemSelector(false);
  };

  const updateItemQuantity = (id: string, quantity: number) => {
    setSelectedItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, quantity, totalRate: item.unitRate * quantity }
          : item
      )
    );
  };

  const removeItem = (id: string) => {
    setSelectedItems(items => items.filter(item => item.id !== id));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!customerName.trim()) newErrors.customerName = 'Required';
    if (!contactNumber.trim()) newErrors.contactNumber = 'Required';
    if (!deliveryAddress.trim()) newErrors.deliveryAddress = 'Required';
    if (selectedItems.length === 0) newErrors.items = 'Add at least one item';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      toast.error('Please fill all required fields and add items');
      return;
    }

    const { grandTotal, rentalDays } = calculateTotal();
    
    const booking: Partial<RentalServiceBooking> & ServiceBooking = {
      id: `rental-${Date.now()}`,
      serviceType: 'rental-services',
      status: bookingStatus,
      date: new Date(rentalStartDate),
      startTime: deliveryTime,
      endTime: pickupTime,
      customerName: customerName.trim(),
      contactNumber: contactNumber.trim(),
      guestCount: 0,
      deliveryAddress,
      deliveryCity,
      deliveryArea,
      rentalStartDate: new Date(rentalStartDate),
      rentalEndDate: new Date(rentalEndDate),
      rentalDays,
      items: selectedItems,
      deliveryDate: new Date(deliveryDate),
      deliveryTime,
      pickupDate: new Date(pickupDate),
      pickupTime,
      deliveryCharges,
      setupCharges,
      securityDeposit,
      notes: notes.trim(),
      createdAt: new Date(),
      totalAmount: grandTotal,
      paidAmount: 0,
      balanceDue: grandTotal,
    };

    onSave(booking as ServiceBooking);
    toast.success('Rental Booking Created', {
      description: `${customerName} • ${selectedItems.length} items • ${rentalDays} days`,
    });
  };

  const totals = calculateTotal();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogTitle className="sr-only">New Rental Services Booking</DialogTitle>
        <DialogDescription className="sr-only">
          Create a new equipment rental booking
        </DialogDescription>

        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-5">
          <button onClick={onClose} className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-white/20 transition-colors">
            <X className="size-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Tent className="size-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Rental Services Booking</h2>
              <p className="text-green-100 text-sm">Equipment & furniture rentals</p>
            </div>
          </div>

          {/* Status Toggle */}
          <div className="flex gap-2 bg-white/10 rounded-lg p-1 max-w-md">
            <button
              onClick={() => setBookingStatus('tentative')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                bookingStatus === 'tentative'
                  ? 'bg-white text-green-700 shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Tentative
            </button>
            <button
              onClick={() => setBookingStatus('confirmed')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                bookingStatus === 'confirmed'
                  ? 'bg-white text-green-700 shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Confirmed
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
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

          {/* Rental Period */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <Calendar className="size-4" />
              Rental Period
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={rentalStartDate}
                  onChange={(e) => setRentalStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={rentalEndDate}
                  onChange={(e) => setRentalEndDate(e.target.value)}
                  min={rentalStartDate}
                />
              </div>
              <div>
                <Label>Rental Days</Label>
                <Input
                  value={`${calculateRentalDays()} days`}
                  disabled
                  className="bg-gray-100 font-semibold text-green-700"
                />
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="size-4" />
              Delivery Address
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label>Address <span className="text-red-500">*</span></Label>
                <Input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Complete address"
                  className={errors.deliveryAddress ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <Label>Area/Sector</Label>
                <Input
                  value={deliveryArea}
                  onChange={(e) => setDeliveryArea(e.target.value)}
                  placeholder="e.g., F-7"
                />
              </div>
              <div className="col-span-3">
                <Label>City</Label>
                <select
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                >
                  <option value="Islamabad">Islamabad</option>
                  <option value="Rawalpindi">Rawalpindi</option>
                  <option value="Lahore">Lahore</option>
                  <option value="Karachi">Karachi</option>
                </select>
              </div>
            </div>
          </div>

          {/* Delivery & Pickup Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Delivery Schedule</h3>
              <div className="space-y-3">
                <div>
                  <Label>Delivery Date</Label>
                  <Input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label>Delivery Time</Label>
                  <Input
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Pickup Schedule</h3>
              <div className="space-y-3">
                <div>
                  <Label>Pickup Date</Label>
                  <Input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    min={rentalStartDate}
                  />
                </div>
                <div>
                  <Label>Pickup Time</Label>
                  <Input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Rental Items */}
          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package className="size-4" />
                Rental Items {selectedItems.length > 0 && `(${selectedItems.length})`}
              </h3>
              <Button
                type="button"
                onClick={() => setShowItemSelector(!showItemSelector)}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <Plus className="size-4 mr-1" />
                Add Item
              </Button>
            </div>

            {errors.items && (
              <p className="text-sm text-red-600 mb-2">{errors.items}</p>
            )}

            {/* Item Selector */}
            {showItemSelector && (
              <div className="mb-4 p-3 bg-white border border-gray-300 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Select Item:</p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {RENTAL_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addItem(item.id)}
                      className="text-left p-2 border border-gray-200 rounded hover:bg-green-50 hover:border-green-300 transition-colors"
                    >
                      <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-gray-600">{formatCurrencyPKR(item.unitRate)}/day • {item.available} available</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Items */}
            <div className="space-y-2">
              {selectedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.itemName}</div>
                            <div className="text-xs text-gray-600">{formatCurrencyPKR(item.unitRate)}/day</div>
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(item.id, Number(e.target.value))}
                      min="1"
                      className="text-sm"
                    />
                  </div>
                  <div className="w-28 text-right font-semibold text-sm">
                              {formatCurrencyPKR(item.totalRate)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}

              {selectedItems.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No items added yet</p>
              )}
            </div>
          </div>

          {/* Charges & Total */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-3">Charges & Total</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <Label>Delivery Charges</Label>
                <Input
                  type="number"
                  value={deliveryCharges}
                  onChange={(e) => setDeliveryCharges(Number(e.target.value))}
                  min="0"
                  placeholder="PKR"
                />
              </div>
              <div>
                <Label>Setup Charges</Label>
                <Input
                  type="number"
                  value={setupCharges}
                  onChange={(e) => setSetupCharges(Number(e.target.value))}
                  min="0"
                  placeholder="PKR"
                />
              </div>
              <div>
                <Label>Security Deposit</Label>
                <Input
                  type="number"
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(Number(e.target.value))}
                  min="0"
                  placeholder="PKR"
                />
              </div>
            </div>

            {/* Total Summary */}
            <div className="bg-white rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items Total ({totals.rentalDays} days):</span>
                    <span className="font-semibold">{formatCurrencyPKR(totals.rentalTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery Charges:</span>
                    <span className="font-semibold">{formatCurrencyPKR(deliveryCharges)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Setup Charges:</span>
                    <span className="font-semibold">{formatCurrencyPKR(setupCharges)}</span>
              </div>
              <div className="h-px bg-gray-300 my-2" />
              <div className="flex justify-between text-lg">
                <span className="font-bold text-green-900">Grand Total:</span>
                  <span className="font-bold text-green-700">{formatCurrencyPKR(totals.grandTotal)}</span>
              </div>
              {securityDeposit > 0 && (
                <div className="flex justify-between text-sm text-gray-600 pt-1">
                  <span>+ Security Deposit (refundable):</span>
                  <span>{formatCurrencyPKR(securityDeposit)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special requirements, setup instructions, etc."
              rows={2}
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
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
              Create Booking
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
