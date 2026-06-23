import { Fragment, useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, MessageCircle, Phone, Save, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { formatCurrencyPKR, formatDatePK, formatTimeRangePK } from '../../lib/locale';
import {
  PAKISTANI_MOBILE_VALIDATION_MESSAGE,
  isValidPakistaniMobileInput,
  normalizeWhatsAppNumber,
  phoneLookupKey,
} from '../../lib/phone';
import { Booking } from './types-v2';
import { getDefaultVenueId, getPrimeSpacesByVenue, getVenueById, venues } from './data-v2';
import { loadSetupEventTypes } from '../erp/setup/setupMasterData';

export type TentativeFollowUpStatus =
  | 'New'
  | 'Contacted'
  | 'Interested'
  | 'Visit Scheduled'
  | 'Negotiation'
  | 'Follow-up Required'
  | 'Converted'
  | 'Lost';

type InquirySource =
  | 'Walk-in'
  | 'Phone Call'
  | 'WhatsApp'
  | 'Facebook'
  | 'Instagram'
  | 'Google'
  | 'Website'
  | 'Reference'
  | 'Repeat Customer'
  | 'Old Customer'
  | 'Other';

type InquiryPriority = 'High' | 'Medium' | 'Low';

export interface TentativeReservationSlot {
  spaceId: string;
  spaceName: string;
  isPrime: boolean;
  hour: number;
  date: Date;
  venueId: string;
  venueName?: string;
  primeSpaceId?: string;
  primeSpaceName?: string;
  subSpaceId?: string;
  subSpaceName?: string;
  startTime?: string;
  endTime?: string;
}

interface TentativeReservationWorkspaceProps {
  open: boolean;
  onClose: () => void;
  slot?: TentativeReservationSlot;
  initialData?: Partial<Booking> | null;
  existingBookings?: Booking[];
  onSave: (booking: Booking) => void;
  onConvertToConfirmed: (booking: Booking) => void;
}

const FOLLOW_UP_STATUSES: TentativeFollowUpStatus[] = [
  'New',
  'Contacted',
  'Interested',
  'Visit Scheduled',
  'Negotiation',
  'Follow-up Required',
  'Converted',
  'Lost',
];

const INQUIRY_SOURCES: InquirySource[] = [
  'Walk-in',
  'Phone Call',
  'WhatsApp',
  'Facebook',
  'Instagram',
  'Google',
  'Website',
  'Reference',
  'Repeat Customer',
  'Other',
];

const PRIORITIES: InquiryPriority[] = ['High', 'Medium', 'Low'];

const normalizeInquirySource = (value?: string): InquirySource => {
  if (value === 'Old Customer') {
    return 'Repeat Customer';
  }

  return INQUIRY_SOURCES.includes(value as InquirySource) ? (value as InquirySource) : 'Walk-in';
};

type CustomerEventSnapshot = {
  id: string;
  date: string;
  eventType: string;
  totalAmount: number;
};

type CustomerRecord = {
  id: string;
  customerName: string;
  primaryPhone: string;
  events: CustomerEventSnapshot[];
  previousEvents: number;
  lastEventDate?: string;
  lifetimeValue: number;
};

const safeNumber = (value: number | undefined | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCustomerName = (value?: string) =>
  (value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const normalizeFollowUpStatus = (value?: string): TentativeFollowUpStatus => {
  switch (value) {
    case 'Called':
    case 'call-scheduled':
      return 'Contacted';
    case 'Visit Planned':
    case 'site-visit-requested':
      return 'Visit Scheduled';
    case 'interested':
      return 'Interested';
    case 'negotiating':
      return 'Negotiation';
    case 'ready-to-book':
      return 'Converted';
    case 'no-response':
      return 'Follow-up Required';
    case 'Lost':
      return 'Lost';
    default:
      return FOLLOW_UP_STATUSES.includes(value as TentativeFollowUpStatus)
        ? (value as TentativeFollowUpStatus)
        : 'New';
  }
};

const toDateInputValue = (value?: Date | string) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const normalizeDate = (value?: Date | string) => {
  if (!value) return new Date();
  return value instanceof Date ? value : new Date(value);
};

const toDateTimeInputValue = (value?: Date | string) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const buildDefaultEndTime = (startTime: string) => {
  const [hours = 18, minutes = 0] = startTime.split(':').map(Number);
  return `${String((hours + 4) % 24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const buildCustomerRecordsFromBookings = (bookings: Booking[]) => {
  const records = new Map<string, CustomerRecord>();

  bookings.forEach((booking) => {
    const customerName = booking.customerName?.trim();
    const primaryPhone = booking.contactNumber || booking.customerPhone || '';
    const key = phoneLookupKey(primaryPhone);

    if (!customerName || !key) return;

    const existing = records.get(key);
    const date = toDateInputValue(booking.date);

    records.set(key, {
      id: existing?.id || booking.customerId || `customer-${key}`,
      customerName: existing?.customerName || customerName,
      primaryPhone: existing?.primaryPhone || primaryPhone,
      events: [
        ...(existing?.events || []),
        {
          id: booking.id,
          date,
          eventType: booking.eventType || 'Event',
          totalAmount: safeNumber(booking.totalAmount),
        },
      ],
      previousEvents: 0,
      lifetimeValue: 0,
    });
  });

  return Array.from(records.values()).map((record) => {
    const sortedEvents = [...record.events].sort((a, b) => b.date.localeCompare(a.date));
    return {
      ...record,
      events: sortedEvents,
      previousEvents: sortedEvents.length,
      lastEventDate: sortedEvents[0]?.date,
      lifetimeValue: sortedEvents.reduce((sum, event) => sum + safeNumber(event.totalAmount), 0),
    };
  });
};

const buildCustomerRecordFromMatches = (bookings: Booking[], phoneKey: string, nameKey: string) => {
  const groupedBookings = new Map<string, Booking[]>();

  bookings.forEach((booking) => {
    const bookingPhone = phoneLookupKey(booking.contactNumber || booking.customerPhone || '');
    const bookingName = normalizeCustomerName(booking.customerName);
    const groupKey =
      booking.customerId ||
      (bookingPhone ? `phone:${bookingPhone}` : '') ||
      (bookingName ? `name:${bookingName}` : '') ||
      booking.id;
    const existingGroup = groupedBookings.get(groupKey) || [];
    existingGroup.push(booking);
    groupedBookings.set(groupKey, existingGroup);
  });

  const rankedRecords = Array.from(groupedBookings.values())
    .map((group) => {
      const records = buildCustomerRecordsFromBookings(group);
      const record = records[0];
      if (!record) return null;

      const recordPhoneKey = phoneLookupKey(record.primaryPhone);
      const recordNameKey = normalizeCustomerName(record.customerName);
      const phoneMatch = Boolean(phoneKey) && recordPhoneKey === phoneKey;
      const nameMatch = Boolean(nameKey) && recordNameKey === nameKey;

      return {
        record,
        phoneMatch,
        nameMatch,
      };
    })
    .filter((entry): entry is { record: CustomerRecord; phoneMatch: boolean; nameMatch: boolean } => Boolean(entry))
    .sort((left, right) => {
      const leftScore = Number(left.phoneMatch) * 2 + Number(left.nameMatch);
      const rightScore = Number(right.phoneMatch) * 2 + Number(right.nameMatch);

      if (leftScore !== rightScore) return rightScore - leftScore;
      if (left.record.previousEvents !== right.record.previousEvents) {
        return right.record.previousEvents - left.record.previousEvents;
      }

      const leftDate = left.record.lastEventDate || '';
      const rightDate = right.record.lastEventDate || '';
      return rightDate.localeCompare(leftDate);
    });

  return rankedRecords[0]?.record || null;
};

const bookingMatchesSlot = (
  booking: Booking,
  slot: TentativeReservationSlot | undefined,
  eventDate: Date,
  startTime: string,
  endTime: string,
) => {
  const bookingDate = normalizeDate(booking.date);
  const sameDate =
    bookingDate.getFullYear() === eventDate.getFullYear() &&
    bookingDate.getMonth() === eventDate.getMonth() &&
    bookingDate.getDate() === eventDate.getDate();

  if (!sameDate || booking.startTime !== startTime || booking.endTime !== endTime) return false;
  if (slot?.venueId && booking.venueId !== slot.venueId) return false;

  const bookingPrimeSpaceId = booking.primeSpaceIds?.[0] || booking.primeSpaceId;

  if (slot?.isPrime) {
    return bookingPrimeSpaceId === (slot.primeSpaceId || slot.spaceId) && !booking.subSpaceId;
  }

  if (slot?.subSpaceId || (!slot?.isPrime && slot?.spaceId)) {
    return booking.subSpaceId === (slot?.subSpaceId || slot?.spaceId);
  }

  return true;
};

export function TentativeReservationWorkspace({
  open,
  onClose,
  slot,
  initialData,
  existingBookings = [],
  onSave,
  onConvertToConfirmed,
}: TentativeReservationWorkspaceProps) {
  const initialVenueId = slot?.venueId || initialData?.venueId || getDefaultVenueId();
  const initialPrimeSpaceId =
    slot?.primeSpaceId ||
    (slot?.isPrime ? slot.spaceId : undefined) ||
    initialData?.primeSpaceIds?.[0] ||
    initialData?.primeSpaceId ||
    '';
  const initialSubSpaceId =
    (slot && !slot.isPrime ? slot.subSpaceId || slot.spaceId : initialData?.subSpaceId) || '';
  const initialEventDate = toDateInputValue(slot?.date || initialData?.date || new Date());
  const initialStartTime = slot?.startTime || initialData?.startTime || `${String(slot?.hour ?? 18).padStart(2, '0')}:00`;
  const initialEndTime = slot?.endTime || initialData?.endTime || buildDefaultEndTime(initialStartTime);

  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [eventType, setEventType] = useState('');
  const [notes, setNotes] = useState('');
  const [venueId, setVenueId] = useState(initialVenueId);
  const [primeSpaceId, setPrimeSpaceId] = useState(initialPrimeSpaceId);
  const [subSpaceId, setSubSpaceId] = useState(initialSubSpaceId);
  const [eventDateValue, setEventDateValue] = useState(initialEventDate);
  const [startTimeValue, setStartTimeValue] = useState(initialStartTime);
  const [endTimeValue, setEndTimeValue] = useState(initialEndTime);
  const [inquiryDateTime, setInquiryDateTime] = useState('');
  const [callbackDate, setCallbackDate] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState<TentativeFollowUpStatus>('New');
  const [inquirySource, setInquirySource] = useState<InquirySource>('Walk-in');
  const [referredBy, setReferredBy] = useState('');
  const [priority, setPriority] = useState<InquiryPriority>('Medium');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [customerAction, setCustomerAction] = useState<'use-existing' | 'update-info' | null>(null);

  const availablePrimeSpaces = useMemo(() => getPrimeSpacesByVenue(venueId), [venueId]);
  const selectedPrimeSpace = useMemo(
    () => availablePrimeSpaces.find((space) => space.id === primeSpaceId),
    [availablePrimeSpaces, primeSpaceId]
  );
  const activeEventTypes = useMemo(
    () => loadSetupEventTypes().filter((eventTypeConfig) => eventTypeConfig.isActive),
    []
  );
  const eventDate = normalizeDate(eventDateValue);

  const slotLabel = useMemo(() => {
    const venueName = getVenueById(venueId)?.name || 'Selected venue';
    const spaceName = selectedPrimeSpace
      ? subSpaceId
        ? selectedPrimeSpace.subSpaces.find((subSpace) => subSpace.id === subSpaceId)?.name
        : selectedPrimeSpace.name
      : initialData?.subSpaceName || initialData?.primeSpaceName || initialData?.primeSpaceNames?.[0];

    return [venueName, spaceName].filter(Boolean).join(' - ');
  }, [initialData, primeSpaceId, selectedPrimeSpace, subSpaceId, venueId]);

  useEffect(() => {
    if (!open) return;

    const nextVenueId = slot?.venueId || initialData?.venueId || getDefaultVenueId();
    const nextPrimeSpaceId =
      slot?.primeSpaceId ||
      (slot?.isPrime ? slot.spaceId : undefined) ||
      initialData?.primeSpaceIds?.[0] ||
      initialData?.primeSpaceId ||
      '';
    const nextSubSpaceId =
      (slot && !slot.isPrime ? slot.subSpaceId || slot.spaceId : initialData?.subSpaceId) || '';
    const nextStartTime = slot?.startTime || initialData?.startTime || `${String(slot?.hour ?? 18).padStart(2, '0')}:00`;
    const nextEndTime = slot?.endTime || initialData?.endTime || buildDefaultEndTime(nextStartTime);

    setVenueId(nextVenueId);
    setPrimeSpaceId(nextPrimeSpaceId);
    setSubSpaceId(nextSubSpaceId);
    setEventDateValue(toDateInputValue(slot?.date || initialData?.date || new Date()));
    setStartTimeValue(nextStartTime);
    setEndTimeValue(nextEndTime);
    setCustomerName(initialData?.customerName || '');
    setContactNumber(initialData?.contactNumber || initialData?.customerPhone || '');
    setGuestCount(initialData?.guestCount ? String(initialData.guestCount) : '');
    setEventType(initialData?.eventType || '');
    setNotes(initialData?.notes || '');
    setInquiryDateTime(
      toDateTimeInputValue(initialData?.inquiryDateTime || initialData?.createdAt || new Date())
    );
    setCallbackDate(toDateInputValue(initialData?.callbackDate));
    setFollowUpStatus(normalizeFollowUpStatus(initialData?.followUpStatus));
    setInquirySource(normalizeInquirySource(initialData?.inquirySource || initialData?.bookingSource));
    setReferredBy(initialData?.referredBy || '');
    setPriority((initialData?.priority as InquiryPriority) || 'Medium');
    setSelectedCustomer(null);
    setCustomerAction(null);
  }, [initialData, open]);

  const otherBookings = useMemo(
    () => existingBookings.filter((booking) => booking.id !== initialData?.id),
    [existingBookings, initialData?.id]
  );

  const detectedCustomer = useMemo(() => {
    const phoneKey = phoneLookupKey(contactNumber);
    const nameKey = normalizeCustomerName(customerName);

    const matches = otherBookings.filter((booking) => {
      const bookingPhoneKey = phoneLookupKey(booking.contactNumber || booking.customerPhone || '');
      const bookingNameKey = normalizeCustomerName(booking.customerName);
      const phoneMatch = phoneKey.length >= 7 && bookingPhoneKey === phoneKey;
      const nameMatch = nameKey.length >= 3 && bookingNameKey === nameKey;
      return phoneMatch || nameMatch;
    });

    if (matches.length === 0) return null;

    return buildCustomerRecordFromMatches(matches, phoneKey, nameKey);
  }, [contactNumber, customerName, otherBookings]);

  const activeCustomer = selectedCustomer || detectedCustomer;
  const confirmedSlotBooking = useMemo(
    () =>
      otherBookings.find(
        (booking) =>
          (booking.status === 'confirmed' || booking.status === 'completed') &&
          bookingMatchesSlot(
            booking,
            {
              spaceId: subSpaceId || primeSpaceId,
              spaceName: selectedPrimeSpace
                ? subSpaceId
                  ? selectedPrimeSpace.subSpaces.find((subSpace) => subSpace.id === subSpaceId)?.name || selectedPrimeSpace.name
                  : selectedPrimeSpace.name
                : '',
              isPrime: !subSpaceId,
              hour: Number(startTimeValue.split(':')[0] || 0),
              date: eventDate,
              venueId,
              venueName: getVenueById(venueId)?.name,
              primeSpaceId: primeSpaceId || undefined,
              primeSpaceName: selectedPrimeSpace?.name,
              subSpaceId: subSpaceId || undefined,
              subSpaceName: selectedPrimeSpace?.subSpaces.find((space) => space.id === subSpaceId)?.name,
              startTime: startTimeValue,
              endTime: endTimeValue,
            },
            eventDate,
            startTimeValue,
            endTimeValue,
          ),
      ),
    [endTimeValue, eventDate, otherBookings, primeSpaceId, selectedPrimeSpace, startTimeValue, subSpaceId, venueId],
  );

  if (!open) {
    return null;
  }

  const buildBooking = (): Booking | null => {
    if (!customerName.trim() || !contactNumber.trim() || !guestCount || Number(guestCount) <= 0 || !eventType.trim()) {
      toast.error('Please complete the required inquiry fields.');
      return null;
    }

    if (!isValidPakistaniMobileInput(contactNumber)) {
      toast.error(PAKISTANI_MOBILE_VALIDATION_MESSAGE);
      return null;
    }

    if (!venueId) {
      toast.error('A venue or calendar slot is required before saving.');
      return null;
    }
    if (!eventDateValue || !startTimeValue || !endTimeValue) {
      toast.error('Date and time are required.');
      return null;
    }
    if (!primeSpaceId) {
      toast.error('Please select a space for this inquiry.');
      return null;
    }

    const resolvedPrimeSpaceId =
      subSpaceId ? primeSpaceId : primeSpaceId;

    const resolvedSubSpaceId =
      subSpaceId || undefined;
    const resolvedInquiryDateTime = inquiryDateTime ? new Date(inquiryDateTime) : normalizeDate(initialData?.createdAt);
    const resolvedCreatedAt = initialData?.createdAt
      ? normalizeDate(initialData.createdAt)
      : resolvedInquiryDateTime;
    const selectedVenue = getVenueById(venueId);
    const selectedSubSpace = selectedPrimeSpace?.subSpaces.find((space) => space.id === subSpaceId);

    return {
      id: initialData?.id || `TENT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      venueId,
      venueName: selectedVenue?.name || initialData?.venueName,
      primeSpaceId: resolvedPrimeSpaceId,
      primeSpaceIds: resolvedPrimeSpaceId ? [resolvedPrimeSpaceId] : undefined,
      primeSpaceName: selectedPrimeSpace?.name || initialData?.primeSpaceName,
      primeSpaceNames: resolvedPrimeSpaceId
        ? [selectedPrimeSpace?.name || initialData?.primeSpaceName || '']
        : undefined,
      subSpaceId: resolvedSubSpaceId,
      subSpaceName: selectedSubSpace?.name || initialData?.subSpaceName,
      date: eventDate,
      startTime: startTimeValue,
      endTime: endTimeValue,
      status: 'tentative',
      customerName: customerName.trim(),
      contactNumber: contactNumber.trim(),
      customerId: activeCustomer?.id,
      guestCount: Number(guestCount),
      eventType: eventType.trim(),
      notes: notes.trim() || undefined,
      inquiryDateTime: resolvedInquiryDateTime,
      callbackDate: callbackDate ? new Date(callbackDate) : undefined,
      followUpStatus,
      inquirySource,
      bookingSource: inquirySource,
      referredBy: inquirySource === 'Reference' ? referredBy.trim() || undefined : undefined,
      priority,
      releaseNotes: confirmedSlotBooking ? 'Confirmed booking exists. Inquiry saved as waitlist/follow-up.' : undefined,
      createdAt: resolvedCreatedAt,
    };
  };

  const handleSave = () => {
    const booking = buildBooking();
    if (!booking) return;

    onSave(booking);
  };

  const handleConvert = () => {
    const booking = buildBooking();
    if (!booking) return;

    onConvertToConfirmed(booking);
  };

  const handleWhatsApp = () => {
    const whatsappNumber = normalizeWhatsAppNumber(contactNumber);
    if (!whatsappNumber) {
      toast.error('Add a contact number before opening WhatsApp.');
      return;
    }

    const message = [
      `Hello ${customerName.trim() || 'there'}, thank you for your inquiry.`,
      eventType.trim() ? `Event: ${eventType.trim()}` : '',
      guestCount ? `Expected guests: ${guestCount}` : '',
      callbackDate ? `Follow-up date: ${callbackDate}` : '',
      notes.trim() ? `Info shared: ${notes.trim()}` : '',
    ].filter(Boolean).join('\n');

    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-white px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Calendar className="size-5 text-slate-600" />
            Inquiry Follow-up
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {slotLabel} - {formatDatePK(eventDate)} - {formatTimeRangePK(startTimeValue, endTimeValue)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Venue</Label>
              <Select
                value={venueId}
                onValueChange={(value) => {
                  setVenueId(value);
                  const nextPrimeSpace = getPrimeSpacesByVenue(value)[0];
                  setPrimeSpaceId(nextPrimeSpace?.id || '');
                  setSubSpaceId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select venue" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Space</Label>
              <Select
                value={subSpaceId || primeSpaceId}
                onValueChange={(value) => {
                  const matchedPrimeSpace = availablePrimeSpaces.find((space) => space.id === value);
                  if (matchedPrimeSpace) {
                    setPrimeSpaceId(matchedPrimeSpace.id);
                    setSubSpaceId('');
                    return;
                  }

                  const parentPrimeSpace = availablePrimeSpaces.find((space) =>
                    space.subSpaces.some((subSpace) => subSpace.id === value)
                  );
                  if (parentPrimeSpace) {
                    setPrimeSpaceId(parentPrimeSpace.id);
                    setSubSpaceId(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select space" />
                </SelectTrigger>
                <SelectContent>
                  {availablePrimeSpaces.map((space) => (
                    <Fragment key={space.id}>
                      <SelectItem value={space.id}>{space.name}</SelectItem>
                      {space.subSpaces.map((subSpace) => (
                        <SelectItem key={subSpace.id} value={subSpace.id}>
                          {space.name} / {subSpace.name}
                        </SelectItem>
                      ))}
                    </Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tentative-event-date">Event Date</Label>
              <Input
                id="tentative-event-date"
                type="date"
                value={eventDateValue}
                onChange={(event) => setEventDateValue(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tentative-start-time">Start Time</Label>
              <Input
                id="tentative-start-time"
                type="time"
                value={startTimeValue}
                onChange={(event) => setStartTimeValue(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tentative-end-time">End Time</Label>
              <Input
                id="tentative-end-time"
                type="time"
                value={endTimeValue}
                onChange={(event) => setEndTimeValue(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tentative-customer-name">Customer Name</Label>
              <Input
                id="tentative-customer-name"
                value={customerName}
                onChange={(event) => {
                  setCustomerName(event.target.value);
                  setSelectedCustomer(null);
                  setCustomerAction(null);
                }}
                placeholder="Customer name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tentative-contact-number" className="flex items-center gap-2">
                <Phone className="size-4 text-slate-500" />
                Phone Number *
              </Label>
              <Input
                id="tentative-contact-number"
                type="tel"
                value={contactNumber}
                onChange={(event) => {
                  setContactNumber(event.target.value);
                  setSelectedCustomer(null);
                  setCustomerAction(null);
                }}
                placeholder="03XXXXXXXXX or +92XXXXXXXXXX"
              />
              <p className="text-xs text-slate-500">Used for WhatsApp communication</p>
            </div>
          </div>

          {activeCustomer && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <UserCheck className="size-4 text-blue-700" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-900">
                      Existing Customer Detected
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{activeCustomer.customerName}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 bg-blue-600 text-xs text-white hover:bg-blue-700"
                    onClick={() => {
                      setSelectedCustomer(activeCustomer);
                      setCustomerAction('use-existing');
                      setCustomerName(activeCustomer.customerName);
                      setContactNumber(activeCustomer.primaryPhone);
                      if (inquirySource === 'Walk-in') setInquirySource('Repeat Customer');
                    }}
                  >
                    Use Existing
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 bg-white text-xs"
                    onClick={() => {
                      setSelectedCustomer(activeCustomer);
                      setCustomerAction('update-info');
                      if (inquirySource === 'Walk-in') setInquirySource('Repeat Customer');
                    }}
                  >
                    Update Info
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 text-xs md:grid-cols-3">
                <div className="rounded border border-blue-100 bg-white px-3 py-2">
                  <div className="text-slate-600">Previous Events Count</div>
                  <div className="mt-0.5 text-sm font-bold text-slate-900">{activeCustomer.previousEvents}</div>
                </div>
                <div className="rounded border border-blue-100 bg-white px-3 py-2">
                  <div className="text-slate-600">Last Event Date</div>
                  <div className="mt-0.5 text-sm font-bold text-slate-900">
                    {activeCustomer.lastEventDate ? formatDatePK(activeCustomer.lastEventDate) : 'N/A'}
                  </div>
                </div>
                <div className="rounded border border-blue-100 bg-white px-3 py-2">
                  <div className="text-slate-600">Lifetime Value</div>
                  <div className="mt-0.5 text-sm font-bold text-slate-900">
                    {formatCurrencyPKR(activeCustomer.lifetimeValue)}
                  </div>
                </div>
              </div>
              {customerAction === 'update-info' && (
                <p className="mt-2 text-xs text-blue-800">
                  Edited inquiry details will be saved against this existing customer.
                </p>
              )}
            </div>
          )}

          {confirmedSlotBooking && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <span className="font-semibold">Confirmed booking exists.</span> Inquiry saved as waitlist/follow-up.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tentative-guest-count" className="flex items-center gap-2">
                <Users className="size-4 text-slate-500" />
                Expected Guests
              </Label>
              <Input
                id="tentative-guest-count"
                type="number"
                min={1}
                value={guestCount}
                onChange={(event) => setGuestCount(event.target.value)}
                placeholder="300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tentative-event-type">Event Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger id="tentative-event-type">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {eventType.trim() &&
                    !activeEventTypes.some((eventTypeConfig) => eventTypeConfig.displayName === eventType) && (
                      <SelectItem value={eventType}>{eventType}</SelectItem>
                    )}
                  {activeEventTypes.map((eventTypeConfig) => (
                    <SelectItem key={eventTypeConfig.id} value={eventTypeConfig.displayName}>
                      {eventTypeConfig.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Inquiry Source</Label>
              <Select value={inquirySource} onValueChange={(value) => setInquirySource(value as InquirySource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INQUIRY_SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as InquiryPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {inquirySource === 'Reference' && (
            <div className="space-y-2">
              <Label htmlFor="tentative-referred-by">Referred By</Label>
              <Input
                id="tentative-referred-by"
                value={referredBy}
                onChange={(event) => setReferredBy(event.target.value)}
                placeholder="Name of person or customer"
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tentative-inquiry-date-time" className="flex items-center gap-2">
                <Calendar className="size-4 text-slate-500" />
                Inquiry Date & Time
              </Label>
              <Input
                id="tentative-inquiry-date-time"
                type="datetime-local"
                value={inquiryDateTime}
                onChange={(event) => setInquiryDateTime(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tentative-callback-date">Follow-up Date</Label>
              <Input
                id="tentative-callback-date"
                type="date"
                value={callbackDate}
                onChange={(event) => setCallbackDate(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={followUpStatus} onValueChange={(value) => setFollowUpStatus(value as TentativeFollowUpStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOW_UP_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tentative-notes">Info Given to Customer</Label>
            <Textarea
              id="tentative-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Menu shared, venue details, availability discussion, next steps"
              className="min-h-[72px]"
            />
          </div>
        </div>

        <DialogFooter className="border-t bg-slate-50 px-6 py-4">
          <Button type="button" variant="outline" onClick={handleWhatsApp}>
            <MessageCircle className="mr-2 size-4" />
            WhatsApp
          </Button>
          <Button type="button" variant="outline" onClick={handleConvert}>
            <CheckCircle2 className="mr-2 size-4" />
            Convert to Confirmed
          </Button>
          <Button type="button" onClick={handleSave} className="bg-slate-900 text-white hover:bg-slate-800">
            <Save className="mr-2 size-4" />
            Save Inquiry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
