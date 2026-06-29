import { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Building2, 
  User, 
  Phone, 
  Users, 
  Lock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Plus,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { TimePicker, formatTimeDisplay } from '../ui/time-picker';
import { InternationalPhoneInput } from '../ui/international-phone-input';
import { toast } from 'sonner';
import { loadSetupEventTypes } from '../erp/setup/setupMasterData';

interface UnifiedBookingDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: BookingFormData) => void;
  // Pre-filled context from calendar
  venueId: string;
  venueName: string;
  spaceId: string;
  spaceName: string;
  isPrimeSpace: boolean;
  primeSpaceId?: string;
  primeSpaceName?: string;
  date: Date;
  suggestedStartTime: string; // HH:mm format (e.g., "14:00")
  // User context for auto-assignment
  currentUserName?: string;
  currentUserRole?: string;
}

export interface BookingFormData {
  // Context (locked)
  venueId: string;
  venueName: string;
  spaceId: string;
  spaceName: string;
  isPrimeSpace: boolean;
  primeSpaceId?: string;
  primeSpaceName?: string;
  date: Date;
  
  // Time
  startTime: string;
  endTime: string;
  
  // Booking type
  status: 'tentative' | 'confirmed';
  
  // Customer info
  customerName: string;
  contactNumber: string;
  
  // Event details
  guestCount: number;
  eventType: string;
  
  // Tentative-specific fields
  followUpDate?: string;
  followUpTime?: string;
  assignedSalesPerson?: string;
  bookingSource?: string;
  
  // Notes
  notes: string;
}

export function UnifiedBookingDialog({
  open,
  onClose,
  onSave,
  venueId,
  venueName,
  spaceId,
  spaceName,
  isPrimeSpace,
  primeSpaceId,
  primeSpaceName,
  date,
  suggestedStartTime,
  currentUserName,
  currentUserRole,
}: UnifiedBookingDialogProps) {
  // Booking type toggle
  const [bookingType, setBookingType] = useState<'tentative' | 'confirmed'>('tentative');
  
  // Time selection
  const [startTime, setStartTime] = useState(suggestedStartTime);
  const [endTime, setEndTime] = useState(() => {
    const [hours, minutes] = suggestedStartTime.split(':').map(Number);
    const endHour = (hours + 4) % 24;
    return `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  });
  
  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [masterDataRevision, setMasterDataRevision] = useState(0);
  
  // Event details
  const [guestCount, setGuestCount] = useState<number>(100);
  const [eventType, setEventType] = useState('');

  useEffect(() => {
    const bumpMasterDataRevision = () => {
      setMasterDataRevision((current) => current + 1);
    };

    const handleMasterDataUpdated = (event: Event) => {
      const key = String((event as CustomEvent<{ key?: string }>).detail?.key || '');
      if (!key || key === 'all' || key === 'venueops_master_event_types') {
        bumpMasterDataRevision();
      }
    };

    const handleStorageUpdated = (event: StorageEvent) => {
      if (!event.key || event.key === 'venueops_master_event_types') {
        bumpMasterDataRevision();
      }
    };

    window.addEventListener('masterDataUpdated', handleMasterDataUpdated);
    window.addEventListener('storage', handleStorageUpdated);

    return () => {
      window.removeEventListener('masterDataUpdated', handleMasterDataUpdated);
      window.removeEventListener('storage', handleStorageUpdated);
    };
  }, []);

  const activeEventTypes = useMemo(
    () => loadSetupEventTypes().filter((eventTypeConfig) => eventTypeConfig.isActive),
    [masterDataRevision]
  );
  const eventTypeOptions = useMemo(() => {
    const options = activeEventTypes.map((eventTypeConfig) => ({
      value: eventTypeConfig.displayName,
      label: eventTypeConfig.displayName,
    }));

    if (eventType.trim() && !options.some((option) => option.value === eventType.trim())) {
      options.unshift({ value: eventType.trim(), label: eventType.trim() });
    }

    return options;
  }, [activeEventTypes, eventType]);
  
  // Tentative-specific fields
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [assignedSalesPerson, setAssignedSalesPerson] = useState('');
  const [bookingSource, setBookingSource] = useState('');
  
  // Notes
  const [notes, setNotes] = useState('');
  
  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setStartTime(suggestedStartTime);
      const [hours, minutes] = suggestedStartTime.split(':').map(Number);
      const endHour = (hours + 4) % 24;
      setEndTime(`${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      
      setBookingType('tentative');
      setCustomerName('');
      setContactNumber('');
      setGuestCount(100);
      setEventType('');
      setFollowUpDate('');
      setFollowUpTime('');
      setAssignedSalesPerson('');
      setBookingSource('');
      setNotes('');
      setErrors({});
    }
  }, [open, suggestedStartTime, venueId, spaceId, date]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!customerName.trim()) newErrors.customerName = 'Required';
    if (!contactNumber.trim()) newErrors.contactNumber = 'Required';
    if (!guestCount || guestCount < 1) newErrors.guestCount = 'Min 1 guest';
    if (!eventType.trim()) newErrors.eventType = 'Required';
    if (!startTime || !endTime) newErrors.time = 'Required';
    
    // Tentative validation
    if (bookingType === 'tentative') {
      if (!assignedSalesPerson) newErrors.assignedSalesPerson = 'Required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      toast.error('Please fill all required fields');
      return;
    }
    
    const data: BookingFormData = {
      venueId,
      venueName,
      spaceId,
      spaceName,
      isPrimeSpace,
      primeSpaceId,
      primeSpaceName,
      date,
      startTime,
      endTime,
      status: bookingType,
      customerName: customerName.trim(),
      contactNumber: contactNumber.trim(),
      guestCount,
      eventType: eventType.trim(),
      notes: notes.trim(),
    };
    
    // Add tentative-specific fields
    if (bookingType === 'tentative') {
      data.followUpDate = followUpDate;
      data.followUpTime = followUpTime;
      data.assignedSalesPerson = assignedSalesPerson;
      data.bookingSource = bookingSource;
    }
    
    onSave(data);
    
    toast.success(
      bookingType === 'tentative' 
        ? 'Tentative Booking Created' 
        : 'Confirmed Booking Created',
      {
        description: `${customerName} • ${formatDateDisplay(date)} • ${formatTimeDisplay(startTime)}`,
      }
    );
    
    onClose();
  };

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogTitle className="sr-only">Quick Book Reservation</DialogTitle>
        <DialogDescription className="sr-only">
          Create a {bookingType} reservation for {spaceName} at {venueName} on {formatDateDisplay(date)}
        </DialogDescription>
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-white/20 transition-colors z-10"
          >
            <X className="size-5" />
          </button>
          
          {/* Title & Status Toggle */}
          <div className="px-6 pt-6 pb-4 border-b border-blue-500/30">
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-1">New Booking</h2>
              <p className="text-blue-100 text-sm">Pre-filled from calendar selection</p>
            </div>
            
            {/* Status Toggle */}
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1 backdrop-blur-sm max-w-md">
              <button
                onClick={() => setBookingType('tentative')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all ${
                  bookingType === 'tentative'
                    ? 'bg-white text-blue-700 shadow-md'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <AlertCircle className="size-4" />
                Tentative
              </button>
              <button
                onClick={() => setBookingType('confirmed')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all ${
                  bookingType === 'confirmed'
                    ? 'bg-white text-blue-700 shadow-md'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <CheckCircle2 className="size-4" />
                Confirmed
              </button>
            </div>
          </div>
          
          {/* Locked Context */}
          <div className="px-6 py-4 grid grid-cols-3 gap-4 text-sm">
            {/* Venue & Space */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Building2 className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-xs text-blue-100 uppercase tracking-wide">Venue & Space</p>
                  <Lock className="size-3 text-blue-200" />
                </div>
                <p className="font-semibold truncate text-base">{venueName}</p>
                <p className="text-sm text-blue-100 truncate">
                  {spaceName}
                  {!isPrimeSpace && primeSpaceName && (
                    <span className="text-blue-200 ml-1">• {primeSpaceName}</span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Date */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Calendar className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-xs text-blue-100 uppercase tracking-wide">Event Date</p>
                  <Lock className="size-3 text-blue-200" />
                </div>
                <p className="font-semibold text-base">{formatDateDisplay(date)}</p>
              </div>
            </div>
            
            {/* Event Time */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Clock className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-xs text-blue-100 uppercase tracking-wide">Event Time</p>
                </div>
                <div className="flex gap-2 mt-1">
                  <TimePicker
                    value={startTime}
                    onChange={setStartTime}
                    className="w-28 bg-white/10 border-white/20 text-white"
                  />
                  <span className="text-white/60 self-center">to</span>
                  <TimePicker
                    value={endTime}
                    onChange={setEndTime}
                    className="w-28 bg-white/10 border-white/20 text-white"
                  />
                </div>
                {errors.time && <p className="text-xs text-red-300 mt-1">{errors.time}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto pb-24">
          <div className="p-6 space-y-5">
            {/* 1. Customer Information & Event Details - Combined */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="size-4 text-gray-700" />
                <h3 className="font-semibold text-gray-900">Customer & Event Information</h3>
              </div>
              
              <div className="flex gap-3">
                {/* Customer Name */}
                <div className="flex-1">
                  <Label className="text-sm font-medium text-gray-700">
                    Customer Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full name"
                    className={`mt-1.5 ${errors.customerName ? 'border-red-500' : ''}`}
                  />
                  {errors.customerName && (
                    <p className="text-xs text-red-600 mt-1">{errors.customerName}</p>
                  )}
                </div>
                
                {/* Contact Number */}
                <div className="w-56">
                  <Label className="text-sm font-medium text-gray-700">
                    Contact Number <span className="text-red-500">*</span>
                  </Label>
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
                
                {/* Event Type */}
                <div className="w-48">
                  <Label className="text-sm font-medium text-gray-700">
                    Event Type <span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className={`mt-1.5 w-full px-3 py-2 border rounded-md bg-white text-sm ${
                      errors.eventType ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select event type</option>
                    {eventTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.eventType && (
                    <p className="text-xs text-red-600 mt-1">{errors.eventType}</p>
                  )}
                </div>
                
                {/* Guest Count */}
                <div className="w-32">
                  <Label className="text-sm font-medium text-gray-700">
                    Guest Count <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    placeholder="Number of guests"
                    min="1"
                    className={`mt-1.5 ${errors.guestCount ? 'border-red-500' : ''}`}
                  />
                  {errors.guestCount && (
                    <p className="text-xs text-red-600 mt-1">{errors.guestCount}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Tentative-Specific Section */}
            {bookingType === 'tentative' && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="size-4 text-yellow-700" />
                  <h3 className="font-semibold text-yellow-900">Tentative Follow-Up & Assignment</h3>
                  <span className="ml-auto text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded font-medium">
                    Required
                  </span>
                </div>
                
                {/* All Assignment & Follow-Up Fields in One Row */}
                <div className="mb-4">
                  <div className="flex items-start gap-3">
                    {/* Assigned To */}
                    <div className="w-52">
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-sm font-medium text-gray-700">
                          Assigned To <span className="text-red-500">*</span>
                        </Label>
                        {currentUserName && (
                          <button
                            type="button"
                            onClick={() => setAssignedSalesPerson(currentUserName)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
                          >
                            Assign to Me
                          </button>
                        )}
                      </div>
                      <select
                        value={assignedSalesPerson}
                        onChange={(e) => setAssignedSalesPerson(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md bg-white text-sm ${
                          errors.assignedSalesPerson ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select person</option>
                        {currentUserName && (
                          <option value={currentUserName}>✓ {currentUserName} (Me)</option>
                        )}
                        <option value="Ahmed Khan">Ahmed Khan</option>
                        <option value="Sarah Ali">Sarah Ali</option>
                        <option value="Bilal Ahmed">Bilal Ahmed</option>
                        <option value="Fatima Hassan">Fatima Hassan</option>
                        <option value="Shakeel Ahmad">Shakeel Ahmad</option>
                        <option value="Zainab Malik">Zainab Malik</option>
                      </select>
                      {errors.assignedSalesPerson && (
                        <p className="text-xs text-red-600 mt-1">{errors.assignedSalesPerson}</p>
                      )}
                    </div>

                    {/* Booking Source */}
                    <div className="w-52">
                      <Label className="text-sm font-medium text-gray-700">
                        Booking Source
                      </Label>
                      <select
                        value={bookingSource}
                        onChange={(e) => setBookingSource(e.target.value)}
                        className="mt-1.5 w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                      >
                        <option value="">How did they find us?</option>
                        <option value="call-center">📞 Call Center</option>
                        <option value="direct-office">☎️ Direct Office Call</option>
                        <option value="walk-in">🚶 Walk-In</option>
                        <option value="whatsapp">💬 WhatsApp</option>
                        <option value="facebook">📘 Facebook</option>
                        <option value="instagram">📸 Instagram</option>
                        <option value="google">🔍 Google Search</option>
                        <option value="referral">👥 Referral</option>
                        <option value="repeat-customer">⭐ Repeat Customer</option>
                        <option value="website">🌐 Website</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Follow-Up Date */}
                    <div className="w-44">
                      <Label className="text-sm font-medium text-gray-700">
                        Follow-Up Date
                      </Label>
                      <Input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="mt-1.5"
                      />
                    </div>

                    {/* Follow-Up Time */}
                    <div className="w-32">
                      <Label className="text-sm font-medium text-gray-700">
                        Follow-Up Time
                      </Label>
                      <TimePicker
                        value={followUpTime}
                        onChange={setFollowUpTime}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 For repeat customers: Assign to their previous sales person
                  </p>
                </div>

                {/* Auto-Assignment Info */}
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                  <div className="flex gap-2 text-xs text-blue-800">
                    <AlertCircle className="size-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1">Smart Assignment:</p>
                      <ul className="space-y-0.5">
                        <li>• <strong>Call Center:</strong> Auto-distributed based on availability</li>
                        <li>• <strong>Direct Office Call:</strong> Assign to yourself or previous sales person</li>
                        <li>• <strong>Repeat Customer:</strong> Should be assigned to their previous contact</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Tentative Policy */}
                <div className="bg-yellow-100 border border-yellow-200 rounded p-3">
                  <div className="flex gap-2 text-xs text-yellow-800">
                    <AlertCircle className="size-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1">Tentative Policy:</p>
                      <ul className="space-y-0.5">
                        <li>• Expires after 48 hours unless confirmed</li>
                        <li>• Multiple tentatives allowed (queue-based priority)</li>
                        <li>• No payment required at this stage</li>
                        <li>• Front Office Dashboard will notify assigned person for follow-up</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Confirmed-Specific Info */}
            {bookingType === 'confirmed' && (
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="size-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-semibold mb-1">Confirmed Booking</p>
                    <p className="text-xs">
                      After saving, you'll proceed to the full Reservation Workspace to add financial details, 
                      payment information, and complete the booking confirmation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Additional Notes */}
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Additional Notes <span className="text-gray-400">(Optional)</span>
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special requirements, dietary restrictions, or other notes..."
                rows={3}
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        {/* Footer - Action Buttons */}
        <div className="border-t bg-white px-6 py-4 flex items-center justify-between shadow-lg">
          <div className="text-sm text-gray-600">
            {bookingType === 'tentative' ? (
              <span className="flex items-center gap-2">
                <AlertCircle className="size-4 text-yellow-600" />
                Saving as tentative booking
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-600" />
                Will open Reservation Workspace
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className={
                bookingType === 'tentative'
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white px-6'
                  : 'bg-green-600 hover:bg-green-700 text-white px-6'
              }
            >
              {bookingType === 'tentative' ? (
                <>
                  <AlertCircle className="size-4 mr-2" />
                  Save Tentative
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 mr-2" />
                  Continue to Full Form
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
