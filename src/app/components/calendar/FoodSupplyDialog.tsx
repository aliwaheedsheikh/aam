import { useState, useEffect } from 'react';
import { X, Package, Users, Calendar, Clock, User, Phone, MapPin, UtensilsCrossed } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { TimePicker } from '../ui/time-picker';
import { InternationalPhoneInput } from '../ui/international-phone-input';
import { ServiceBooking, FoodSupplyBooking, KITCHENS } from './service-types';
import { toast } from 'sonner';
import { formatCurrencyPKR, formatDatePK } from '../../lib/locale';

interface FoodSupplyDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (booking: ServiceBooking) => void;
  selectedDate: Date;
}

export function FoodSupplyDialog({ open, onClose, onSave, selectedDate }: FoodSupplyDialogProps) {
  // Basic Info
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [guestCount, setGuestCount] = useState<number>(100);
  const [date, setDate] = useState(selectedDate.toISOString().split('T')[0]);

  // Delivery Info
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('Islamabad');
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('delivery');
  const [deliveryTime, setDeliveryTime] = useState('12:00');
  const [deliveryCharges, setDeliveryCharges] = useState<number>(0);

  // Kitchen & Production
  const [kitchenAssigned, setKitchenAssigned] = useState(KITCHENS[0].id);
  const [productionDate, setProductionDate] = useState(selectedDate.toISOString().split('T')[0]);
  const [productionShift, setProductionShift] = useState<'morning' | 'afternoon' | 'evening'>('morning');

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
      const dateStr = selectedDate.toISOString().split('T')[0];
      setDate(dateStr);
      setProductionDate(dateStr);
      // Reset form
      setCustomerName('');
      setContactNumber('');
      setGuestCount(100);
      setDeliveryAddress('');
      setDeliveryArea('');
      setDeliveryCity('Islamabad');
      setDeliveryMethod('delivery');
      setDeliveryTime('12:00');
      setDeliveryCharges(0);
      setKitchenAssigned(KITCHENS[0].id);
      setProductionShift('morning');
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
    if (!guestCount || guestCount < 1) newErrors.guestCount = 'Min 1 guest';
    if (deliveryMethod === 'delivery' && !deliveryAddress.trim()) newErrors.deliveryAddress = 'Required';
    if (!menuType.trim()) newErrors.menuType = 'Required';
    if (!menuRate || menuRate <= 0) newErrors.menuRate = 'Required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      toast.error('Please fill all required fields');
      return;
    }

    const menuTotal = menuRate * guestCount;
    const grandTotal = menuTotal + (deliveryMethod === 'delivery' ? deliveryCharges : 0);
    
    const booking: Partial<FoodSupplyBooking> & ServiceBooking = {
      id: `food-${Date.now()}`,
      serviceType: 'food-supply',
      status: bookingStatus,
      date: new Date(date),
      startTime: deliveryTime,
      endTime: deliveryTime,
      customerName: customerName.trim(),
      contactNumber: contactNumber.trim(),
      guestCount,
      deliveryAddress,
      deliveryCity,
      deliveryArea,
      deliveryMethod,
      deliveryTime,
      deliveryCharges: deliveryMethod === 'delivery' ? deliveryCharges : 0,
      menuType,
      menuRate,
      menuTotal,
      kitchenAssigned,
      productionDate,
      productionShift,
      notes: notes.trim(),
      createdAt: new Date(),
      totalAmount: grandTotal,
      paidAmount: 0,
      balanceDue: grandTotal,
    };

    onSave(booking as ServiceBooking);
    toast.success('Food Supply Order Created', {
      description: `${customerName} • ${guestCount} guests • ${formatDatePK(date)}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogTitle className="sr-only">New Food Supply Order</DialogTitle>
        <DialogDescription className="sr-only">
          Create a new food supply only order
        </DialogDescription>

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-5">
          <button onClick={onClose} className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-white/20 transition-colors">
            <X className="size-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Package className="size-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Food Supply Order</h2>
              <p className="text-orange-100 text-sm">Food preparation & delivery only</p>
            </div>
          </div>

          {/* Status Toggle */}
          <div className="flex gap-2 bg-white/10 rounded-lg p-1 max-w-md">
            <button
              onClick={() => setBookingStatus('tentative')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                bookingStatus === 'tentative'
                  ? 'bg-white text-orange-700 shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Tentative
            </button>
            <button
              onClick={() => setBookingStatus('confirmed')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                bookingStatus === 'confirmed'
                  ? 'bg-white text-orange-700 shadow-md'
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
            <div className="grid grid-cols-3 gap-4">
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

          {/* Delivery Information */}
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
              <MapPin className="size-4" />
              Delivery Information
            </h3>
            
            {/* Delivery Method */}
            <div className="mb-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="delivery"
                    checked={deliveryMethod === 'delivery'}
                    onChange={() => setDeliveryMethod('delivery')}
                    className="text-orange-600"
                  />
                  <span className="font-medium">Home Delivery</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="pickup"
                    checked={deliveryMethod === 'pickup'}
                    onChange={() => setDeliveryMethod('pickup')}
                    className="text-orange-600"
                  />
                  <span className="font-medium">Self Pickup</span>
                </label>
              </div>
            </div>

            {deliveryMethod === 'delivery' && (
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label>Delivery Address <span className="text-red-500">*</span></Label>
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
                <div>
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
                <div>
                  <Label>Delivery Time</Label>
                  <TimePicker value={deliveryTime} onChange={setDeliveryTime} />
                </div>
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
              </div>
            )}

            {deliveryMethod === 'pickup' && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Customer will pick up food from kitchen location at scheduled time
                </p>
              </div>
            )}
          </div>

          {/* Kitchen & Production */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <UtensilsCrossed className="size-4" />
                Kitchen Assignment
              </h3>
              <div className="space-y-3">
                <div>
                  <Label>Kitchen</Label>
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
                  <Label>Production Date</Label>
                  <Input
                    type="date"
                    value={productionDate}
                    onChange={(e) => setProductionDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label>Production Shift</Label>
                  <select
                    value={productionShift}
                    onChange={(e) => setProductionShift(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                  >
                    <option value="morning">Morning (8 AM - 2 PM)</option>
                    <option value="afternoon">Afternoon (2 PM - 8 PM)</option>
                    <option value="evening">Evening (8 PM - 12 AM)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Menu & Pricing</h3>
              <div className="space-y-3">
                <div>
                  <Label>Menu Type <span className="text-red-500">*</span></Label>
                  <Input
                    value={menuType}
                    onChange={(e) => setMenuType(e.target.value)}
                    placeholder="e.g., Premium BBQ, Continental"
                    className={errors.menuType ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label>Rate per Person <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    value={menuRate}
                    onChange={(e) => setMenuRate(Number(e.target.value))}
                    min="0"
                    placeholder="PKR"
                    className={errors.menuRate ? 'border-red-500' : ''}
                  />
                </div>
                
                {/* Calculation Summary */}
                {menuRate > 0 && guestCount > 0 && (
                  <div className="p-3 bg-orange-100 rounded-lg space-y-1 text-sm">
                    <div className="flex justify-between text-orange-900">
                      <span>Menu Total:</span>
                    <strong>{formatCurrencyPKR(menuRate * guestCount)}</strong>
                    </div>
                    {deliveryMethod === 'delivery' && deliveryCharges > 0 && (
                      <div className="flex justify-between text-orange-900">
                        <span>Delivery Charges:</span>
                    <strong>{formatCurrencyPKR(deliveryCharges)}</strong>
                      </div>
                    )}
                    <div className="flex justify-between text-orange-900 pt-2 border-t border-orange-200">
                      <span className="font-semibold">Grand Total:</span>
                      <strong className="text-lg">
                  {formatCurrencyPKR((menuRate * guestCount) + (deliveryMethod === 'delivery' ? deliveryCharges : 0))}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Event Date */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="size-4" />
              Event/Delivery Date
            </h3>
            <div className="w-64">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Menu preferences, packaging requirements, etc."
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
            <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700 text-white">
              Create Order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
