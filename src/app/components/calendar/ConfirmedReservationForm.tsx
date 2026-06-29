import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Save, Check, AlertTriangle, Phone, MapPin, Calendar as CalendarIcon, Users, DollarSign, Clock, Link2, FileText, ArrowRight, XCircle, Plus, Trash2, Eye, Printer, Upload, Download, Edit2, Lock, CreditCard, Banknote, ChevronDown, Search, UserCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Booking,
  type AdditionalChargeType,
  type BookingAgreementChangeEntry,
  type BookingAgreementSnapshot,
  type BookingAgreementStatus,
  type BookingSpaceAssignment,
  type CustomerChargeLedgerEntry,
  type PostEventFeedback,
  type PostEventFeedbackRating,
  type PostEventFeedbackRecommendation,
  type PostEventServiceFeedback,
  type PostEventServiceKey,
  type ReservationAdditionalCharge,
} from './types-v2';
import { venues, primeSpaces } from './data-v2';
import { eventConfigDataStore } from '../../lib/masterDataStore';
import { MenuManagement, type ReservationMenuSnapshot } from './MenuManagement';
import { formatCurrencyPKR, formatDatePK, formatTimeRangePK } from '../../lib/locale';
import { hasConfirmedReservationConflict } from '../../lib/reservationConflicts';
import { buildLegacySpaceFieldsFromAssignments, formatBookingSpaceAssignments, getBookingSpaceAssignments } from '../../lib/bookingSpaces';
import { authStorage } from '../../lib/authStorage';
import {
  PAKISTANI_MOBILE_VALIDATION_MESSAGE,
  isValidPakistaniMobileInput,
  phoneDigits,
  phoneLookupKey,
} from '../../lib/phone';
import { loadWorkflowState, saveWorkflowState, WORKFLOW_STATE_KEYS } from '../../lib/workflowState';
import {
  loadLiveVenueInventory,
  loadSetupAdvancePolicy,
  loadSetupEventTypes,
  loadSetupRcsCategories,
  loadSetupRcsCommissionRules,
  loadSetupRcsServices,
  loadSetupRcsVendorRates,
  loadSetupRcsVendors,
} from '../erp/setup/setupMasterData';
import { isDishAvailableForUsage } from '../kitchen/dishUsage';
import type { Dish, KitchenDishCategory, MenuPackage, PurchaseItem } from '../kitchen/types';

// Default Support Catering Items (fallback if Reservation Setup is empty)
const defaultSupportCateringItems = [
  { id: 'sc-1', itemName: 'Cold Drink', itemCode: 'SC001', defaultPricingType: 'Per Head', defaultRate: 50, inventoryLinked: true, kitchenLinked: false, isActive: true },
  { id: 'sc-2', itemName: 'Mineral Water', itemCode: 'SC002', defaultPricingType: 'Per Quantity', defaultRate: 30, inventoryLinked: true, kitchenLinked: false, isActive: true },
  { id: 'sc-3', itemName: 'Salad', itemCode: 'SC003', defaultPricingType: 'Per Plate', defaultRate: 80, inventoryLinked: false, kitchenLinked: true, isActive: true },
  { id: 'sc-4', itemName: 'Sweet Dish', itemCode: 'SC004', defaultPricingType: 'Per Kg', defaultRate: 1200, inventoryLinked: false, kitchenLinked: true, isActive: true },
  { id: 'sc-5', itemName: 'Naan', itemCode: 'SC005', defaultPricingType: 'Per Quantity', defaultRate: 15, inventoryLinked: false, kitchenLinked: true, isActive: true },
  { id: 'sc-6', itemName: 'Tea', itemCode: 'SC006', defaultPricingType: 'Per Head', defaultRate: 40, inventoryLinked: false, kitchenLinked: true, isActive: true },
  { id: 'sc-7', itemName: 'Soup', itemCode: 'SC007', defaultPricingType: 'Per Head', defaultRate: 100, inventoryLinked: false, kitchenLinked: true, isActive: true },
  { id: 'sc-8', itemName: 'Ice', itemCode: 'SC008', defaultPricingType: 'Per Kg', defaultRate: 80, inventoryLinked: true, kitchenLinked: false, isActive: true },
  { id: 'sc-9', itemName: 'Tissue Boxes', itemCode: 'SC009', defaultPricingType: 'Per Quantity', defaultRate: 50, inventoryLinked: true, kitchenLinked: false, isActive: true },
  { id: 'sc-10', itemName: 'Serving Staff', itemCode: 'SC010', defaultPricingType: 'Per Staff', defaultRate: 2000, inventoryLinked: false, kitchenLinked: false, isActive: true },
  { id: 'sc-11', itemName: 'Salad Counter', itemCode: 'SC011', defaultPricingType: 'Per Counter', defaultRate: 8000, inventoryLinked: false, kitchenLinked: true, isActive: true },
];

interface ConfirmedReservationFormProps {
  onClose: () => void;
  onSave: (booking: Partial<Booking>, options?: { overriddenTentativeIds?: string[] }) => boolean;
  initialData?: Partial<Booking>;
  existingBookings?: Booking[];
  allowPaymentLedger?: boolean;
  allowAgreementPreview?: boolean;
  kitchenDishes?: Dish[];
  kitchenDishCategories?: KitchenDishCategory[];
  kitchenMenuPackages?: MenuPackage[];
  purchaseItems?: PurchaseItem[];
  slot?: {
    venueId: string;
    venueName: string;
    spaceId: string;
    spaceName: string;
    primeSpaceId?: string;
    primeSpaceName?: string;
    subSpaceId?: string;
    subSpaceName?: string;
    date: Date;
    hour: number;
    startTime?: string;
    endTime?: string;
    isPrime: boolean;
  };
}

type AdvanceResolutionSource =
  | 'no-selection'
  | 'not-configured'
  | 'legacy-rule'
  | 'configured-amount'
  | 'rule-derived';

interface AdvanceResolution {
  amount: number;
  source: AdvanceResolutionSource;
  note?: string;
}

const safeNumber = (value: number | undefined | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const ADDITIONAL_CHARGE_CUSTOM_TYPE_ID = '__custom_additional_charge__';
const ADDITIONAL_CHARGE_SETUP_TIMESTAMP = '2026-01-01T00:00:00.000Z';

const defaultAdditionalChargeTypes: AdditionalChargeType[] = [
  {
    id: 'additional-charge-overtime',
    name: 'Overtime / Extra Hours',
    defaultRate: 0,
    unitType: 'hour',
    defaultDescription: 'Additional venue or service time beyond agreed schedule',
    isActive: true,
    createdAt: ADDITIONAL_CHARGE_SETUP_TIMESTAMP,
    updatedAt: ADDITIONAL_CHARGE_SETUP_TIMESTAMP,
  },
  {
    id: 'additional-charge-cleaning',
    name: 'Extra Cleaning',
    defaultRate: 0,
    unitType: 'fixed',
    defaultDescription: 'Additional cleaning or housekeeping charge',
    isActive: true,
    createdAt: ADDITIONAL_CHARGE_SETUP_TIMESTAMP,
    updatedAt: ADDITIONAL_CHARGE_SETUP_TIMESTAMP,
  },
  {
    id: 'additional-charge-generator',
    name: 'Generator / Fuel',
    defaultRate: 0,
    unitType: 'fixed',
    defaultDescription: 'Generator, fuel, or electricity support charge',
    isActive: true,
    createdAt: ADDITIONAL_CHARGE_SETUP_TIMESTAMP,
    updatedAt: ADDITIONAL_CHARGE_SETUP_TIMESTAMP,
  },
  {
    id: 'additional-charge-security',
    name: 'Security Staff',
    defaultRate: 0,
    unitType: 'staff',
    defaultDescription: 'Additional security staffing charge',
    isActive: true,
    createdAt: ADDITIONAL_CHARGE_SETUP_TIMESTAMP,
    updatedAt: ADDITIONAL_CHARGE_SETUP_TIMESTAMP,
  },
];

const slugifyAdditionalChargeName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'charge';

const calculateAdditionalChargeTotal = (quantity: number, rate: number) => safeNumber(quantity) * safeNumber(rate);

const normalizeAdditionalChargeType = (chargeType: Partial<AdditionalChargeType>, index = 0): AdditionalChargeType => {
  const now = new Date().toISOString();
  const name = String(chargeType.name || `Charge Type ${index + 1}`).trim();

  return {
    id: chargeType.id || `additional-charge-type-${Date.now()}-${index}`,
    name,
    defaultRate: safeNumber(chargeType.defaultRate),
    unitType: String(chargeType.unitType || 'fixed').trim() || 'fixed',
    defaultDescription: String(chargeType.defaultDescription || '').trim(),
    isActive: chargeType.isActive !== false,
    createdAt: chargeType.createdAt || now,
    updatedAt: chargeType.updatedAt || chargeType.createdAt || now,
  };
};

const serializeAdditionalChargeTypes = (chargeTypes: AdditionalChargeType[]) =>
  JSON.stringify(
    chargeTypes.map((chargeType) => ({
      id: chargeType.id,
      name: chargeType.name,
      defaultRate: safeNumber(chargeType.defaultRate),
      unitType: chargeType.unitType,
      defaultDescription: chargeType.defaultDescription,
      isActive: chargeType.isActive !== false,
      createdAt: chargeType.createdAt,
      updatedAt: chargeType.updatedAt,
    })),
  );

const getAdditionalChargeTypeName = (
  charge: ReservationAdditionalCharge,
  chargeTypes: AdditionalChargeType[],
) => {
  const matchedType = charge.additionalChargeTypeId
    ? chargeTypes.find((chargeType) => chargeType.id === charge.additionalChargeTypeId)
    : undefined;

  return matchedType?.name || charge.customChargeName || 'Additional Charge';
};

const normalizeAdditionalChargeLine = (
  rawCharge: Partial<ReservationAdditionalCharge> & { item?: string },
  index: number,
  chargeTypes: AdditionalChargeType[],
): ReservationAdditionalCharge => {
  const now = new Date().toISOString();
  const legacyName = String(rawCharge.item || '').trim();
  const matchedType = rawCharge.additionalChargeTypeId
    ? chargeTypes.find((chargeType) => chargeType.id === rawCharge.additionalChargeTypeId)
    : legacyName
      ? chargeTypes.find((chargeType) => chargeType.name.toLowerCase() === legacyName.toLowerCase())
      : undefined;
  const quantity = safeNumber(rawCharge.quantity) || 1;
  const rate = safeNumber(rawCharge.rate);
  const customChargeName = matchedType ? rawCharge.customChargeName : rawCharge.customChargeName || legacyName || undefined;
  const description =
    String(rawCharge.description || '').trim() ||
    matchedType?.defaultDescription ||
    customChargeName ||
    matchedType?.name ||
    'Additional charge';

  return {
    id:
      rawCharge.id ||
      `additional-charge-${index}-${slugifyAdditionalChargeName(matchedType?.name || customChargeName || legacyName)}`,
    additionalChargeTypeId: matchedType?.id || rawCharge.additionalChargeTypeId,
    customChargeName,
    description,
    quantity,
    rate,
    total: calculateAdditionalChargeTotal(quantity, rate),
    notes: rawCharge.notes,
    createdAt: rawCharge.createdAt || now,
    updatedAt: rawCharge.updatedAt || rawCharge.createdAt || now,
  };
};

const normalizeAdditionalChargeLines = (
  rawCharges: Array<Partial<ReservationAdditionalCharge> & { item?: string }> | undefined,
  chargeTypes: AdditionalChargeType[],
) => (rawCharges || []).map((charge, index) => normalizeAdditionalChargeLine(charge, index, chargeTypes));

const buildAdditionalChargeLedgerEntries = (
  charges: ReservationAdditionalCharge[],
  chargeTypes: AdditionalChargeType[],
): CustomerChargeLedgerEntry[] =>
  charges.map((charge) => {
    const chargeName = getAdditionalChargeTypeName(charge, chargeTypes);

    return {
      id: `additional-charge-ledger-${charge.id}`,
      source: 'additional-charge',
      sourceId: charge.id,
      entryType: 'debit',
      description: `Additional Charge - ${chargeName}`,
      debit: safeNumber(charge.total),
      credit: 0,
      createdAt: charge.createdAt,
      updatedAt: charge.updatedAt,
    };
  });

const POST_EVENT_FEEDBACK_RATINGS: PostEventFeedbackRating[] = ['Excellent', 'Good', 'Average', 'Poor'];

const POST_EVENT_RECOMMENDATION_OPTIONS: PostEventFeedbackRecommendation[] = ['Yes', 'No', 'Not Asked'];

interface FeedbackServiceCard {
  serviceKey: PostEventServiceKey;
  serviceLabel: string;
  bookedAmount: number;
  bookedItems: string[];
}

const buildInitialReservedSpaceAssignments = (
  initialData?: Partial<Booking>,
  slot?: ConfirmedReservationFormProps['slot'],
): BookingSpaceAssignment[] => {
  const seededAssignments = initialData ? getBookingSpaceAssignments(initialData as Booking) : [];
  if (seededAssignments.length > 0) {
    const hasSeededGuestCounts = seededAssignments.some((assignment) => safeNumber(assignment.guestCount) > 0);
    return seededAssignments.map((assignment, index) => ({
      ...assignment,
      guestCount:
        typeof assignment.guestCount === 'number'
          ? assignment.guestCount
          : !hasSeededGuestCounts && index === 0
            ? safeNumber(initialData?.guestCount)
            : 0,
    }));
  }

  if (!slot) {
    return [];
  }

  return [
    {
      venueId: slot.venueId,
      primeSpaceId: slot.primeSpaceId || slot.spaceId,
      subSpaceId: slot.isPrime ? undefined : (slot.subSpaceId || slot.spaceId),
      assignmentType: slot.isPrime ? 'PRIME_FULL' : 'SUB_ONLY',
      usageLabel: '',
      guestCount: safeNumber(initialData?.guestCount),
      sortOrder: 0,
    },
  ];
};

const createEditableSpaceAssignment = (venueId?: string): BookingSpaceAssignment => ({
  venueId,
  primeSpaceId: '',
  assignmentType: 'PRIME_FULL',
  usageLabel: '',
  guestCount: 0,
  sortOrder: 0,
});

const validateReservedSpaceAssignments = (assignments: BookingSpaceAssignment[]) => {
  if (assignments.length === 0) {
    return 'Please select at least one reserved space.';
  }

  const fullPrimeSpaceIds = new Set<string>();
  const subAssignments = new Set<string>();
  for (const assignment of assignments) {
    if (!assignment.primeSpaceId) {
      return 'Each reserved space must include a prime space.';
    }

    if (safeNumber(assignment.guestCount) < 0) {
      return 'Reserved space guests cannot be negative.';
    }

    if (assignment.assignmentType === 'SUB_ONLY') {
      if (!assignment.subSpaceId) {
        return 'Each sub-space assignment must include a sub space.';
      }

      if (fullPrimeSpaceIds.has(assignment.primeSpaceId)) {
        return 'A full prime space and one of its own sub spaces cannot be reserved together in the same booking.';
      }

      const subKey = `${assignment.primeSpaceId}:${assignment.subSpaceId}`;
      if (subAssignments.has(subKey)) {
        return 'Duplicate sub-space assignments are not allowed.';
      }

      subAssignments.add(subKey);
      continue;
    }

    if (fullPrimeSpaceIds.has(assignment.primeSpaceId)) {
      return 'Duplicate prime space assignments are not allowed.';
    }

    const hasConflictingSubAssignment = Array.from(subAssignments).some((subKey) =>
      subKey.startsWith(`${assignment.primeSpaceId}:`),
    );
    if (hasConflictingSubAssignment) {
      return 'A full prime space and one of its own sub spaces cannot be reserved together in the same booking.';
    }

    fullPrimeSpaceIds.add(assignment.primeSpaceId);
  }

  return null;
};

const areReservationMenuItemsEqual = (
  left: ReservationMenuSnapshot['items'],
  right: ReservationMenuSnapshot['items']
) =>
  left.length === right.length &&
  left.every((item, index) => {
    const other = right[index];
    return (
      item.kitchenItemId === other?.kitchenItemId &&
      item.name === other?.name &&
      item.category === other?.category &&
      item.cuisine === other?.cuisine &&
      item.isVeg === other?.isVeg &&
      item.source === other?.source &&
      item.originalName === other?.originalName
    );
  });

const areCustomerProvidedMenuItemsEqual = (
  left: ReservationMenuSnapshot['customerProvidedMenu'],
  right: ReservationMenuSnapshot['customerProvidedMenu']
) =>
  left.length === right.length &&
  left.every((item, index) => {
    const other = right[index];
    return (
      item.category === other?.category &&
      item.itemName === other?.itemName &&
      item.notes === other?.notes
    );
  });

const areStringArraysEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const areReservationMenuSnapshotsEqual = (left: ReservationMenuSnapshot, right: ReservationMenuSnapshot) =>
  left.serviceMode === right.serviceMode &&
  left.mode === right.mode &&
  left.summaryLabel === right.summaryLabel &&
  left.packageId === right.packageId &&
  left.packageName === right.packageName &&
  left.guaranteedGuests === right.guaranteedGuests &&
  left.basePerHeadRate === right.basePerHeadRate &&
  left.finalPerHeadRate === right.finalPerHeadRate &&
  left.pricingMode === right.pricingMode &&
  left.fixedAmount === right.fixedAmount &&
  left.cateringPerHeadRate === right.cateringPerHeadRate &&
  left.discountType === right.discountType &&
  left.discountAmount === right.discountAmount &&
  left.discountPercent === right.discountPercent &&
  left.discountGivenBy === right.discountGivenBy &&
  left.discountReason === right.discountReason &&
  left.approvedBy === right.approvedBy &&
  left.completenessOverrideNote === right.completenessOverrideNote &&
  left.menuTotal === right.menuTotal &&
  areStringArraysEqual(left.missingRequirements, right.missingRequirements) &&
  areReservationMenuItemsEqual(left.items, right.items) &&
  areCustomerProvidedMenuItemsEqual(left.customerProvidedMenu, right.customerProvidedMenu);

type KitchenEstimateLockRecord = {
  bookingId: string;
  dateKey: string;
  status: 'draft' | 'approved';
};

type FoodSupplyFormLine = {
  kitchenItemId?: string;
  masterItemId?: string;
  variantId?: string;
  variantLabel?: string;
  item: string;
  itemName?: string;
  itemCode?: string;
  quantity: number;
  unit: string;
  rate: number;
  costRate?: number;
};

const normalizeSignatureText = (value?: string | null) => (value || '').trim().toLowerCase();

const buildReservationMenuChangeSignature = (snapshot?: Partial<ReservationMenuSnapshot>) =>
  JSON.stringify({
    serviceMode: snapshot?.serviceMode || '',
    mode: snapshot?.mode || '',
    summaryLabel: snapshot?.summaryLabel || '',
    packageId: snapshot?.packageId || '',
    packageName: snapshot?.packageName || '',
    items: (snapshot?.items || [])
      .map((item) => ({
        id: item.kitchenItemId || '',
        name: item.name || '',
        category: item.category || '',
      }))
      .sort((left, right) => `${left.id}:${left.name}`.localeCompare(`${right.id}:${right.name}`)),
    customerProvidedMenu: (snapshot?.customerProvidedMenu || [])
      .map((item) => ({
        category: item.category || '',
        itemName: item.itemName || '',
        notes: item.notes || '',
      }))
      .sort((left, right) => `${left.category}:${left.itemName}`.localeCompare(`${right.category}:${right.itemName}`)),
  });

const buildFoodSupplyChangeSignature = (items: FoodSupplyFormLine[] = []) =>
  JSON.stringify(
    items
      .map((item) => ({
        item: normalizeSignatureText(item.item),
        kitchenItemId: item.kitchenItemId || '',
        masterItemId: item.masterItemId || '',
        variantId: item.variantId || '',
        quantity: Number(item.quantity) || 0,
        unit: normalizeSignatureText(item.unit),
        rate: Number(item.rate) || 0,
      }))
      .filter((item) => item.item && item.quantity > 0)
      .sort((left, right) => `${left.item}:${left.unit}`.localeCompare(`${right.item}:${right.unit}`)),
  );

const resolveBookingMinimumGuaranteedGuests = (booking?: Partial<Booking>) =>
  safeNumber(
    booking?.minimumGuaranteedGuests ??
      booking?.currentAgreementSnapshot?.guestGuarantees?.minimumGuaranteedGuests ??
      booking?.signedAgreementSnapshot?.guestGuarantees?.minimumGuaranteedGuests ??
      booking?.guestCount,
  );

const DEFAULT_CUSTOMER_CITY = 'Lahore';
const CUSTOMER_DIRECTORY_STORAGE_KEY = WORKFLOW_STATE_KEYS.customerDirectory;
const LEGACY_CUSTOMER_DIRECTORY_STORAGE_KEY = 'venueops-customer-directory-v1';
const LAHORE_AREAS = [
  'Pak Arab Society',
  'Shadab Town',
  'Garden Town',
  'Gulberg',
  'DHA',
  'Johar Town',
  'Model Town',
  'Faisal Town',
  'Iqbal Town',
  'Wapda Town',
  'Valencia Town',
  'Bahria Town',
  'Askari',
  'Cavalry Ground',
  'Cantt',
  'Samanabad',
  'Township',
  'Raiwind Road',
  'Ferozepur Road',
  'Canal Road',
];

type CustomerEventSnapshot = {
  id: string;
  date: string;
  eventType: string;
  venue: string;
  guests: number;
  totalAmount: number;
  paidAmount?: number;
  balance?: number;
  status?: string;
  startTime?: string;
  endTime?: string;
};

type CustomerRecord = {
  id: string;
  customerName: string;
  primaryPhone: string;
  secondaryPhone?: string;
  address?: string;
  area?: string;
  city: string;
  referenceSource?: string;
  referredBy?: string;
  customerRemarks?: string;
  events: CustomerEventSnapshot[];
  previousEvents: number;
  lastEventDate?: string;
  lifetimeValue: number;
  updatedAt?: string;
};

const normalizeText = (value?: string) => (value || '').trim().toLowerCase();

const normalizeReferenceSource = (value?: string) => {
  if (value === 'Old Customer') {
    return 'Repeat Customer';
  }

  return value || 'Walk-in';
};

const customerLookupKey = (customer: Pick<CustomerRecord, 'id' | 'primaryPhone' | 'customerName'>) =>
  phoneLookupKey(customer.primaryPhone) || normalizeText(customer.customerName) || customer.id;

const toDateInputValue = (value: Date | string | undefined) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const venueLabelForBooking = (booking: Booking) => {
  const payload = booking as Booking & { venueName?: string; spaceName?: string };
  const venueName = payload.venueName || venues.find((venue) => venue.id === booking.venueId)?.name || 'Venue';
  const primeSpace =
    payload.primeSpaceName ||
    primeSpaces.find((space) => space.id === booking.primeSpaceId || booking.primeSpaceIds?.includes(space.id))?.name;
  const subSpace =
    payload.subSpaceName ||
    primeSpaces
      .flatMap((space) => space.subSpaces)
      .find((space) => space.id === booking.subSpaceId)?.name;

  return [venueName, subSpace || primeSpace].filter(Boolean).join(' > ');
};

const eventSnapshotForBooking = (booking: Booking): CustomerEventSnapshot => ({
  id: booking.id,
  date: toDateInputValue(booking.date),
  eventType: booking.eventType || 'Event',
  venue: venueLabelForBooking(booking),
  guests: safeNumber(booking.guestCount),
  totalAmount: safeNumber(booking.totalAmount),
  paidAmount: safeNumber(booking.paidAmount),
  balance: safeNumber(booking.balance),
  status: booking.status,
  startTime: booking.startTime,
  endTime: booking.endTime,
});

const withCustomerStats = (record: CustomerRecord): CustomerRecord => {
  const sortedEvents = [...record.events].sort((a, b) => b.date.localeCompare(a.date));
  return {
    ...record,
    city: record.city || DEFAULT_CUSTOMER_CITY,
    events: sortedEvents,
    previousEvents: sortedEvents.length,
    lastEventDate: sortedEvents[0]?.date,
    lifetimeValue: sortedEvents.reduce((sum, event) => sum + safeNumber(event.totalAmount), 0),
  };
};

const buildCustomerRecordsFromBookings = (bookings: Booking[]) => {
  const records = new Map<string, CustomerRecord>();

  bookings.forEach((booking) => {
    const customerName = booking.customerName?.trim();
    if (!customerName) return;

    const primaryPhone = booking.contactNumber || booking.customerPhone || '';
    const key = phoneLookupKey(primaryPhone) || normalizeText(customerName);
    if (!key) return;

    const existing = records.get(key);
    const payload = booking as Booking & {
      secondaryPhone?: string;
      address?: string;
      area?: string;
      city?: string;
      referenceSource?: string;
      referredBy?: string;
      customerRemarks?: string;
    };

    records.set(key, {
      id: existing?.id || `customer-${key}`,
      customerName: existing?.customerName || customerName,
      primaryPhone: existing?.primaryPhone || primaryPhone,
      secondaryPhone: existing?.secondaryPhone || payload.secondaryPhone,
      address: existing?.address || payload.address,
      area: existing?.area || payload.area,
      city: existing?.city || payload.city || DEFAULT_CUSTOMER_CITY,
      referenceSource: existing?.referenceSource || payload.referenceSource,
      referredBy: existing?.referredBy || payload.referredBy,
      customerRemarks: existing?.customerRemarks || payload.customerRemarks,
      events: [...(existing?.events || []), eventSnapshotForBooking(booking)],
      previousEvents: 0,
      lifetimeValue: 0,
    });
  });

  return Array.from(records.values()).map(withCustomerStats);
};

const readStoredCustomerRecords = (): CustomerRecord[] => {
  let parsed = loadWorkflowState<CustomerRecord[]>(CUSTOMER_DIRECTORY_STORAGE_KEY, []);

  if (
    parsed.length === 0 &&
    typeof window !== 'undefined'
  ) {
    try {
      const legacyRaw = window.localStorage.getItem(LEGACY_CUSTOMER_DIRECTORY_STORAGE_KEY);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        if (Array.isArray(legacyParsed)) {
          parsed = legacyParsed;
          saveWorkflowState(CUSTOMER_DIRECTORY_STORAGE_KEY, legacyParsed);
        }
      }
    } catch {
      // Ignore legacy migration failures and fall back to the current store.
    }
  }

  if (!Array.isArray(parsed)) return [];
  return parsed.map((record) => withCustomerStats({ ...record, events: Array.isArray(record.events) ? record.events : [] }));
};

const writeStoredCustomerRecords = (records: CustomerRecord[]) => {
  saveWorkflowState(CUSTOMER_DIRECTORY_STORAGE_KEY, records.map(withCustomerStats));
};

const mergeCustomerRecords = (derivedRecords: CustomerRecord[], storedRecords: CustomerRecord[]) => {
  const byKey = new Map<string, CustomerRecord>();

  derivedRecords.forEach((record) => {
    byKey.set(customerLookupKey(record), withCustomerStats(record));
  });

  storedRecords.forEach((storedRecord) => {
    const key = customerLookupKey(storedRecord);
    const derivedRecord = byKey.get(key);
    const eventsById = new Map<string, CustomerEventSnapshot>();

    [...(derivedRecord?.events || []), ...(storedRecord.events || [])].forEach((event) => {
      eventsById.set(event.id, event);
    });

    byKey.set(
      key,
      withCustomerStats({
        ...derivedRecord,
        ...storedRecord,
        events: Array.from(eventsById.values()),
      } as CustomerRecord)
    );
  });

  return Array.from(byKey.values()).sort((a, b) => a.customerName.localeCompare(b.customerName));
};

const numberToWordsEn = (value: number) => {
  const safeValue = Math.floor(safeNumber(value));
  if (safeValue === 0) return 'Zero';
  if (safeValue < 0) return `Minus ${numberToWordsEn(Math.abs(safeValue))}`;

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const chunkToWords = (n: number) => {
    let remaining = n;
    const parts: string[] = [];

    if (remaining >= 100) {
      const hundreds = Math.floor(remaining / 100);
      parts.push(`${ones[hundreds]} hundred`);
      remaining = remaining % 100;
    }

    if (remaining >= 20) {
      const tensDigit = Math.floor(remaining / 10);
      const onesDigit = remaining % 10;
      parts.push(onesDigit ? `${tens[tensDigit]} ${ones[onesDigit]}` : tens[tensDigit]);
    } else if (remaining > 0) {
      parts.push(ones[remaining]);
    }

    return parts.join(' ').trim();
  };

  const scales = [
    { value: 1_000_000_000, label: 'billion' },
    { value: 1_000_000, label: 'million' },
    { value: 1_000, label: 'thousand' },
  ];

  let remaining = safeValue;
  const parts: string[] = [];

  for (const scale of scales) {
    if (remaining >= scale.value) {
      const chunk = Math.floor(remaining / scale.value);
      const chunkWords = chunkToWords(chunk);
      if (chunkWords) parts.push(`${chunkWords} ${scale.label}`);
      remaining = remaining % scale.value;
    }
  }

  const lastChunk = chunkToWords(remaining);
  if (lastChunk) parts.push(lastChunk);

  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

const formatSingleTimePK = (timeValue?: string) => {
  if (!timeValue) return '—';
  const [hours, minutes] = timeValue.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return timeValue;

  return new Intl.DateTimeFormat('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(2000, 0, 1, hours, minutes));
};

const DEFAULT_BASE_SLOT_MINUTES = 4 * 60;

const getFoodSupplyUnitFromPricingType = (pricingType?: string) => {
  switch ((pricingType || '').toLowerCase()) {
    case 'per kg':
      return 'kg';
    case 'per quantity':
      return 'pcs';
    case 'per plate':
      return 'plate';
    case 'per counter':
      return 'counter';
    case 'per staff':
      return 'staff';
    case 'per head':
      return 'head';
    default:
      return '';
  }
};

const FOOD_SUPPLY_LEGACY_DRAFT_ID = '__legacy-food-supply-line__';

const getSupportItemName = (item: any) => String(item?.itemName || item?.serviceName || item?.name || '');

const getSupportItemRate = (item: any) => safeNumber(item?.defaultRate ?? item?.basePrice ?? item?.rate);

const getSupportItemPricingType = (item: any) => String(item?.defaultPricingType || item?.pricingType || 'Per Quantity');

const getRCSServiceName = (item: any) => String(item?.serviceName || item?.itemName || item?.name || '');

const getRCSServiceRate = (item: any) => safeNumber(item?.defaultSellingPrice ?? item?.basePrice ?? item?.defaultRate ?? item?.rate);

const getRCSCategoryName = (service: any, categoryMap: Map<string, any>) => {
  const category = service?.categoryId ? categoryMap.get(service.categoryId) : undefined;
  return String(category?.name || service?.categoryName || service?.category || 'Uncategorized');
};

const sortRCSServicesByCategory = (services: any[], categoryMap: Map<string, any>) =>
  [...services].sort((left, right) =>
    `${getRCSCategoryName(left, categoryMap)}:${getRCSServiceName(left)}`.localeCompare(
      `${getRCSCategoryName(right, categoryMap)}:${getRCSServiceName(right)}`,
    ),
  );

const getPurchaseItemName = (item: PurchaseItem) => String(item.itemName || '').trim();

const getPurchaseItemUnit = (item: PurchaseItem) =>
  String(item.issueUnit || item.baseUnitId || item.purchaseUnit || item.purchaseUnitId || '').trim();

const getPurchaseItemDefaultRate = (item: PurchaseItem) =>
  safeNumber(item.ratePerUnit ?? item.defaultPurchaseCost ?? item.averageCost ?? item.lastPurchaseRate ?? item.lastCost);

const getPurchaseItemCostRate = (item: PurchaseItem) =>
  safeNumber(item.defaultPurchaseCost ?? item.averageCost ?? item.lastPurchaseRate ?? item.ratePerUnit ?? item.lastCost);

const getDishDefaultVariant = (dish: Dish) =>
  dish.salesVariants?.find((variant) => variant.isDefault) || dish.salesVariants?.[0];

const getFoodSupplyDishVariants = (dish: Dish) => {
  const activeVariants =
    dish.salesVariants?.filter((variant) => (variant.status || (variant.active === false ? 'inactive' : 'active')) !== 'inactive') || [];

  if (activeVariants.length > 0) {
    return activeVariants;
  }

  const defaultVariant = getDishDefaultVariant(dish);
  return defaultVariant ? [defaultVariant] : [];
};

const getFoodSupplyDishVariant = (dish: Dish, variantId?: string) => {
  const variantOptions = getFoodSupplyDishVariants(dish);
  return variantOptions.find((variant) => variant.id === variantId) || getDishDefaultVariant(dish) || variantOptions[0];
};

const getFoodSupplyDishUnit = (dish: Dish, variantId?: string) =>
  String(getFoodSupplyDishVariant(dish, variantId)?.salesUnit || dish.unitOfSale || '').trim();

const getFoodSupplyDishRate = (dish: Dish, variantId?: string) =>
  safeNumber(getFoodSupplyDishVariant(dish, variantId)?.sellingPrice ?? dish.defaultSellingPrice ?? dish.sellingPrice);

const getFoodSupplyDishCostRate = (dish: Dish, variantId?: string) =>
  safeNumber(getFoodSupplyDishVariant(dish, variantId)?.estimatedCost ?? dish.defaultVariantCost ?? dish.estimatedCost);

const getFoodSupplyDishVariantLabel = (dish: Dish, variantId?: string) =>
  String(getFoodSupplyDishVariant(dish, variantId)?.label || getFoodSupplyDishVariant(dish, variantId)?.variantLabel || '').trim();

const normalizeFoodSupplyLineFromKitchenItem = (
  dish: Dish,
  quantity = 1,
  rate = getFoodSupplyDishRate(dish),
  variantId?: string,
): FoodSupplyFormLine => {
  const itemName = String(dish.dishName || '').trim();
  const selectedVariant = getFoodSupplyDishVariant(dish, variantId);

  return {
    kitchenItemId: dish.id,
    variantId: selectedVariant?.id,
    variantLabel: selectedVariant ? getFoodSupplyDishVariantLabel(dish, selectedVariant.id) : undefined,
    item: itemName,
    itemName,
    itemCode: dish.dishCode,
    quantity: safeNumber(quantity),
    unit: getFoodSupplyDishUnit(dish, selectedVariant?.id),
    rate: safeNumber(rate),
    costRate: getFoodSupplyDishCostRate(dish, selectedVariant?.id),
  };
};

const normalizeFoodSupplyLineFromLegacyMaster = (
  item: PurchaseItem,
  quantity = 1,
  rate = getPurchaseItemDefaultRate(item),
): FoodSupplyFormLine => {
  const itemName = getPurchaseItemName(item);

  return {
    masterItemId: item.id,
    item: itemName,
    itemName,
    itemCode: item.itemCode,
    quantity: safeNumber(quantity),
    unit: getPurchaseItemUnit(item),
    rate: safeNumber(rate),
    costRate: getPurchaseItemCostRate(item),
  };
};

const normalizeFoodSupplyLine = (
  line: Partial<FoodSupplyFormLine> | undefined,
  kitchenItemsById: Map<string, Dish>,
  purchaseItemsById: Map<string, PurchaseItem>,
): FoodSupplyFormLine => {
  const kitchenItem = line?.kitchenItemId ? kitchenItemsById.get(line.kitchenItemId) : undefined;

  if (kitchenItem) {
    return {
      ...normalizeFoodSupplyLineFromKitchenItem(
        kitchenItem,
        safeNumber(line?.quantity),
        line?.rate === undefined ? getFoodSupplyDishRate(kitchenItem, line?.variantId) : safeNumber(line.rate),
        line?.variantId,
      ),
      variantLabel: line?.variantLabel || getFoodSupplyDishVariantLabel(kitchenItem, line?.variantId),
      costRate: line?.costRate === undefined ? getFoodSupplyDishCostRate(kitchenItem, line?.variantId) : safeNumber(line.costRate),
    };
  }

  const masterItem = line?.masterItemId ? purchaseItemsById.get(line.masterItemId) : undefined;

  if (masterItem) {
    return {
      ...normalizeFoodSupplyLineFromLegacyMaster(
        masterItem,
        safeNumber(line?.quantity),
        line?.rate === undefined ? getPurchaseItemDefaultRate(masterItem) : safeNumber(line.rate),
      ),
      costRate: line?.costRate === undefined ? getPurchaseItemCostRate(masterItem) : safeNumber(line.costRate),
    };
  }

  const itemName = String(line?.item || line?.itemName || '').trim();

  return {
    kitchenItemId: line?.kitchenItemId,
    masterItemId: line?.masterItemId,
    variantId: line?.variantId,
    variantLabel: line?.variantLabel,
    item: itemName,
    itemName: line?.itemName || itemName,
    itemCode: line?.itemCode,
    quantity: safeNumber(line?.quantity),
    unit: String(line?.unit || '').trim(),
    rate: safeNumber(line?.rate),
    costRate: safeNumber(line?.costRate),
  };
};

const getFoodSupplyLineName = (line: FoodSupplyFormLine) => {
  const itemName = line.itemName || line.item || 'Food Supply Item';
  return line.variantLabel ? `${itemName} (${line.variantLabel})` : itemName;
};

const toReservationRcsSource = (service: any): 'In-house' | 'Outsource' =>
  service?.fulfillmentType === 'outsourced' || service?.source === 'Outsource' ? 'Outsource' : 'In-house';

const getRcsServiceCostRate = (service: any) =>
  toReservationRcsSource(service) === 'Outsource'
    ? safeNumber(service?.vendorCost ?? service?.estimatedVendorCost ?? service?.marketVendorRate)
    : safeNumber(service?.internalCost ?? service?.estimatedInHouseCost ?? service?.vendorCost);

const AGREEMENT_SECTION_LABELS: Record<string, string> = {
  customer: 'Customer Information',
  event: 'Event Details',
  venue: 'Event Details',
  guestGuarantees: 'Event Details',
  venueCharges: 'Event Details',
  foodAndCatering: 'Food & Catering',
  foodSupplies: 'Food Supplies',
  rcs: 'RCS Services',
  additionalCharges: 'Additional Charges',
  miscCharges: 'Additional Charges',
  taxes: 'Payment Ledger',
  discounts: 'Payment Ledger',
  totals: 'Booking Agreement',
  paymentTerms: 'Payment Ledger',
};

const AGREEMENT_FIELD_LABELS: Record<string, string> = {
  'customer.name': 'Customer Name',
  'customer.primaryPhone': 'Primary Phone',
  'customer.secondaryPhone': 'Secondary Phone',
  'customer.address': 'Address',
  'customer.area': 'Area / Locality',
  'customer.city': 'City',
  'customer.referenceSource': 'Reference Source',
  'customer.referredBy': 'Referred By',
  'customer.remarks': 'Customer Remarks',
  'event.eventType': 'Event Type',
  'event.date': 'Event Date',
  'event.startTime': 'Start Time',
  'event.endTime': 'End Time',
  'venue.venueName': 'Venue',
  'venue.primeSpaceName': 'Prime Space',
  'venue.subSpaceName': 'Sub Space',
  'venue.venueMode': 'Venue Mode',
  'guestGuarantees.guaranteedGuests': 'Guaranteed Guests',
  'guestGuarantees.minimumGuaranteedGuests': 'Minimum Guaranteed Guests',
  'guestGuarantees.expectedGuests': 'Expected Guests',
  'venueCharges.total': 'Venue Charges',
  'foodAndCatering.menuPackage': 'Menu Package',
  'foodAndCatering.perHeadRate': 'Per Head Rate',
  'foodAndCatering.menuTotal': 'Menu Total',
  'foodAndCatering.supportCateringTotal': 'Support Catering Total',
  'foodAndCatering.menuSelection.items': 'Menu Items',
  'foodAndCatering.menuSelection.customerProvidedMenu': 'Customer Provided Menu',
  'foodAndCatering.menuSelection.discountAmount': 'Food & Catering Discount Amount',
  'foodAndCatering.menuSelection.discountPercent': 'Food & Catering Discount Percent',
  'foodSupplies.items': 'Food Supplies',
  'foodSupplies.total': 'Food Supplies Total',
  'rcs.items': 'RCS Services',
  'rcs.total': 'RCS Total',
  'additionalCharges.items': 'Additional Charges',
  'additionalCharges.total': 'Additional Charges Total',
  'miscCharges.items': 'Additional Charges',
  'miscCharges.total': 'Additional Charges Total',
  'taxes.total': 'Taxes',
  'discounts.amount': 'Discount Amount',
  'discounts.percent': 'Discount Percent',
  'totals.grandTotal': 'Grand Total',
  'totals.paidAmount': 'Paid Amount',
  'totals.balance': 'Balance',
  'paymentTerms.advanceReceived': 'Advance Received',
  'paymentTerms.totalReceived': 'Total Received',
  'paymentTerms.remainingCommitment': 'Remaining Commitment',
  'paymentTerms.paymentPlanEntries': 'Payment Terms',
  'paymentTerms.finalClearance': 'Final Clearance Terms',
  'paymentTerms.payments': 'Payment Entries',
};

const splitCamelCase = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const agreementFieldLabel = (path: string) =>
  AGREEMENT_FIELD_LABELS[path] ||
  path
    .split('.')
    .map((segment) => splitCamelCase(segment))
    .join(' > ');

const agreementSectionLabel = (path: string) => {
  const rootKey = path.split('.')[0];
  return AGREEMENT_SECTION_LABELS[rootKey] || 'Booking Agreement';
};

const serializeAgreementValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—';
  if (typeof value === 'string') return value || '—';

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const formatAgreementTimestamp = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatLifecycleDate = (value?: string | Date) => {
  if (!value) return 'Not recorded';
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not recorded';
  return parsed.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatOperationalEventDate = (value?: string | Date) => {
  if (!value) return 'Not recorded';
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not recorded';
  return parsed.toLocaleDateString('en-PK', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const flattenAgreementSnapshot = (
  value: unknown,
  path = '',
  flattened: Record<string, unknown> = {}
): Record<string, unknown> => {
  if (Array.isArray(value) || value === null || value === undefined || typeof value !== 'object') {
    if (path) {
      flattened[path] = value;
    }
    return flattened;
  }

  Object.entries(value).forEach(([key, nestedValue]) => {
    const nextPath = path ? `${path}.${key}` : key;
    if (Array.isArray(nestedValue) || nestedValue === null || typeof nestedValue !== 'object') {
      flattened[nextPath] = nestedValue;
      return;
    }

    flattenAgreementSnapshot(nestedValue, nextPath, flattened);
  });

  return flattened;
};

const detectAgreementSnapshotChanges = (
  previousSnapshot: BookingAgreementSnapshot,
  currentSnapshot: BookingAgreementSnapshot,
  changedBy: string,
  changedAt: string
): BookingAgreementChangeEntry[] => {
  const previousFlat = flattenAgreementSnapshot(previousSnapshot);
  const currentFlat = flattenAgreementSnapshot(currentSnapshot);
  const comparedPaths = new Set([...Object.keys(previousFlat), ...Object.keys(currentFlat)]);

  return Array.from(comparedPaths)
    .sort()
    .flatMap((path) => {
      const oldValue = serializeAgreementValue(previousFlat[path]);
      const newValue = serializeAgreementValue(currentFlat[path]);

      if (oldValue === newValue) {
        return [];
      }

      return [{
        field: agreementFieldLabel(path),
        section: agreementSectionLabel(path),
        oldValue,
        newValue,
        changedBy,
        changedAt,
      }];
    });
};

type SectionKey = 
  | 'customer-info'
  | 'event-details'
  | 'venue-selection'
  | 'guest-menu'
  | 'food-supplies'
  | 'venue-charges'
  | 'rcs-services'
  | 'setup-integrations'
  | 'misc-charges'
  | 'payment-ledger'
  | 'callback-tracking'
  | 'post-event-feedback'
  | 'final-summary'
  | 'shift-event'
  | 'cancellation';

type DirtySections = Partial<Record<SectionKey, boolean>>;

type PendingSectionNavigation = {
  from: SectionKey;
  to: SectionKey;
};

type PendingCloseRequest = {
  section: SectionKey;
};

export function ConfirmedReservationForm({
  onClose,
  onSave,
  initialData,
  existingBookings = [],
  allowPaymentLedger = true,
  allowAgreementPreview = true,
  kitchenDishes = [],
  kitchenDishCategories = [],
  kitchenMenuPackages = [],
  purchaseItems = [],
  slot,
}: ConfirmedReservationFormProps) {
  const currentSession = authStorage.load();
  const currentUserName = currentSession?.user.fullName || 'System User';
  const isAdminUser = currentSession?.user.role === 'ADMIN';
  const isPersistedConfirmedReservation = Boolean(
    initialData?.id && (initialData?.status === 'confirmed' || initialData?.status === 'completed'),
  );
  const lockedMinimumGuaranteedGuests = resolveBookingMinimumGuaranteedGuests(initialData);
  const isMinimumGuaranteedGuestsLocked = isPersistedConfirmedReservation && !isAdminUser;
  const [activeSection, setActiveSection] = useState<SectionKey>('customer-info');
  const [agreementStatusState, setAgreementStatusState] = useState<BookingAgreementStatus>(initialData?.agreementStatus ?? 'Draft');
  const [signedAgreementSnapshotState, setSignedAgreementSnapshotState] = useState<BookingAgreementSnapshot | undefined>(initialData?.signedAgreementSnapshot);
  const [currentAgreementSnapshotState, setCurrentAgreementSnapshotState] = useState<BookingAgreementSnapshot | undefined>(
    initialData?.currentAgreementSnapshot
  );
  const [agreementSignedAtState, setAgreementSignedAtState] = useState(initialData?.agreementSignedAt);
  const [agreementSignedByState, setAgreementSignedByState] = useState(initialData?.agreementSignedBy);
  const [agreementVersionState, setAgreementVersionState] = useState(initialData?.agreementVersion ?? 0);
  const [agreementChangeHistoryState, setAgreementChangeHistoryState] = useState<BookingAgreementChangeEntry[]>(
    initialData?.agreementChangeHistory ?? []
  );
  
  // Agreement Preview Panel State
  const [showAgreementPreview, setShowAgreementPreview] = useState(false);
  
  // Form State (Shared across all events)
  const [customerName, setCustomerName] = useState(initialData?.customerName || '');
  const [primaryPhone, setPrimaryPhone] = useState(initialData?.contactNumber || '');
  const [secondaryPhone, setSecondaryPhone] = useState(initialData?.secondaryPhone || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [area, setArea] = useState(initialData?.area || '');
  const [city] = useState(initialData?.city || DEFAULT_CUSTOMER_CITY);
  const [referenceSource, setReferenceSource] = useState(normalizeReferenceSource(initialData?.referenceSource));
  const [referredBy, setReferredBy] = useState(initialData?.referredBy || '');
  const [customerRemarks, setCustomerRemarks] = useState(initialData?.customerRemarks || '');
  const [postEventOverallRating, setPostEventOverallRating] = useState<PostEventFeedbackRating | ''>(
    initialData?.postEventFeedback?.overallRating || '',
  );
  const [postEventOverallComment, setPostEventOverallComment] = useState(
    initialData?.postEventFeedback?.overallComment || '',
  );
  const [postEventWouldRecommend, setPostEventWouldRecommend] = useState<PostEventFeedbackRecommendation>(
    initialData?.postEventFeedback?.wouldRecommend || 'Not Asked',
  );
  const [postEventFollowUpRequired, setPostEventFollowUpRequired] = useState(
    Boolean(initialData?.postEventFeedback?.followUpRequired),
  );
  const [postEventFollowUpAction, setPostEventFollowUpAction] = useState(
    initialData?.postEventFeedback?.followUpAction || '',
  );
  const [postEventServiceFeedback, setPostEventServiceFeedback] = useState<PostEventServiceFeedback[]>(
    initialData?.postEventFeedback?.serviceFeedback ?? [],
  );
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [storedCustomerRecords, setStoredCustomerRecords] = useState<CustomerRecord[]>(readStoredCustomerRecords);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [loadedCustomerId, setLoadedCustomerId] = useState<string | null>(initialData?.customerId || null);
  const [ignoredCustomerKeys, setIgnoredCustomerKeys] = useState<string[]>([]);
  const [readonlyAgreementEvent, setReadonlyAgreementEvent] = useState<CustomerEventSnapshot | null>(null);

  const [eventType, setEventType] = useState(initialData?.eventType || '');
  const [eventDate, setEventDate] = useState(
    slot?.date 
      ? `${slot.date.getFullYear()}-${String(slot.date.getMonth() + 1).padStart(2, '0')}-${String(slot.date.getDate()).padStart(2, '0')}`
      : toDateInputValue(initialData?.date)
  );
  const [eventStartTime, setEventStartTime] = useState(
    slot?.startTime || (slot?.hour ? `${String(slot.hour).padStart(2, '0')}:00` : initialData?.startTime || '18:00')
  );
  const [eventEndTime, setEventEndTime] = useState(
    slot?.endTime || (slot?.hour ? `${String((slot.hour + 4) % 24).padStart(2, '0')}:00` : initialData?.endTime || '23:00')
  );
  const [bookingManager, setBookingManager] = useState('');

  // Guest details in Event Details section
  const [totalGuests, setTotalGuests] = useState(initialData?.guestCount || 0);
  const [requiresPartition, setRequiresPartition] = useState(false);
  const [menCount, setMenCount] = useState(0);
  const [ladiesCount, setLadiesCount] = useState(0);
  const [kidsCount, setKidsCount] = useState(0);

  const initialReservedSpaceAssignments = buildInitialReservedSpaceAssignments(initialData, slot);
  const initialPrimarySpaceAssignment = initialReservedSpaceAssignments[0];
  const [selectedVenueId, setSelectedVenueId] = useState(slot?.venueId || initialData?.venueId || '');
  const [selectedPrimeSpaceId, setSelectedPrimeSpaceId] = useState(
    initialPrimarySpaceAssignment?.primeSpaceId ||
      slot?.primeSpaceId ||
      (slot?.isPrime ? slot.spaceId : '') ||
      initialData?.primeSpaceId ||
      ''
  );
  const [selectedSubSpaceId, setSelectedSubSpaceId] = useState(
    (initialPrimarySpaceAssignment?.assignmentType === 'SUB_ONLY' ? initialPrimarySpaceAssignment.subSpaceId : undefined) ||
      slot?.subSpaceId ||
      (!slot?.isPrime ? slot?.spaceId : '') ||
      initialData?.subSpaceId ||
      ''
  );
  const [primarySpaceUsageLabel, setPrimarySpaceUsageLabel] = useState(initialPrimarySpaceAssignment?.usageLabel || '');
  const [primarySpaceGuestCount, setPrimarySpaceGuestCount] = useState(
    safeNumber(initialPrimarySpaceAssignment?.guestCount ?? initialData?.guestCount),
  );
  const [additionalSpaceAssignments, setAdditionalSpaceAssignments] = useState<BookingSpaceAssignment[]>(
    initialReservedSpaceAssignments.slice(1).map((assignment, index) => ({
      ...assignment,
      usageLabel: assignment.usageLabel || '',
      guestCount: safeNumber(assignment.guestCount),
      sortOrder: index + 1,
    })),
  );
  const [venueMode, setVenueMode] = useState<'Full' | 'Half'>('Full');
  const [isManualContextCollapsed, setIsManualContextCollapsed] = useState(Boolean(slot));
  const [showReservedSpacesDetails, setShowReservedSpacesDetails] = useState(false);

  const [guaranteedGuests, setGuaranteedGuests] = useState(initialData?.guestCount || 0);
  const [minimumGuaranteedGuests, setMinimumGuaranteedGuests] = useState(
    resolveBookingMinimumGuaranteedGuests(initialData),
  );
  const [expectedGuests, setExpectedGuests] = useState(initialData?.guestCount || 0);
  const [menuPackage, setMenuPackage] = useState('');
  const [perHeadRate, setPerHeadRate] = useState(0);
  const [menuTotal, setMenuTotal] = useState(0);
  const [menuSelection, setMenuSelection] = useState<ReservationMenuSnapshot>({
    serviceMode: 'in-house',
    mode: 'package',
    summaryLabel: '',
    guaranteedGuests: initialData?.guestCount || 0,
    basePerHeadRate: 0,
    finalPerHeadRate: 0,
    pricingMode: undefined,
    fixedAmount: undefined,
    cateringPerHeadRate: undefined,
    discountType: 'rs',
    discountAmount: 0,
    discountPercent: 0,
    discountGivenBy: '',
    discountReason: '',
    approvedBy: '',
    completenessOverrideNote: '',
    missingRequirements: [],
    items: [],
    customerProvidedMenu: [],
    menuTotal: 0,
  });
  const handleMenuSnapshotChange = useCallback((snapshot: ReservationMenuSnapshot) => {
    setMenuSelection((current) =>
      areReservationMenuSnapshotsEqual(current, snapshot) ? current : snapshot
    );
    setMenuPackage((current) => (current === snapshot.summaryLabel ? current : snapshot.summaryLabel));
    setPerHeadRate((current) =>
      current === snapshot.finalPerHeadRate ? current : snapshot.finalPerHeadRate
    );
    setMenuTotal((current) => (current === snapshot.menuTotal ? current : snapshot.menuTotal));
  }, []);

  const [foodSupplies, setFoodSupplies] = useState<FoodSupplyFormLine[]>([]);
  const [foodSupplyDraft, setFoodSupplyDraft] = useState<FoodSupplyFormLine>({
    item: '',
    quantity: 0,
    unit: '',
    rate: 0,
  });
  const [editingFoodSupplyIndex, setEditingFoodSupplyIndex] = useState<number | null>(null);
  const [inHouseServiceSearch, setInHouseServiceSearch] = useState('');

  type AdditionalChargeDraft = {
    id?: string;
    additionalChargeTypeId: string;
    customChargeName: string;
    description: string;
    quantity: number;
    rate: number;
    notes: string;
    createdAt?: string;
  };

  type AdditionalChargeTypeDraft = {
    id?: string;
    name: string;
    defaultRate: number;
    unitType: string;
    defaultDescription: string;
    isActive: boolean;
    createdAt?: string;
  };

  const createEmptyAdditionalChargeDraft = (): AdditionalChargeDraft => ({
    additionalChargeTypeId: '',
    customChargeName: '',
    description: '',
    quantity: 1,
    rate: 0,
    notes: '',
  });

  const createEmptyAdditionalChargeTypeDraft = (): AdditionalChargeTypeDraft => ({
    name: '',
    defaultRate: 0,
    unitType: 'fixed',
    defaultDescription: '',
    isActive: true,
  });

  const [additionalChargeTypes, setAdditionalChargeTypes] = useState<AdditionalChargeType[]>(() =>
    eventConfigDataStore
      .getAdditionalChargeTypes(defaultAdditionalChargeTypes)
      .map((chargeType: Partial<AdditionalChargeType>, index: number) => normalizeAdditionalChargeType(chargeType, index)),
  );
  const [additionalCharges, setAdditionalCharges] = useState<ReservationAdditionalCharge[]>([]);
  const [showAdditionalChargeDraft, setShowAdditionalChargeDraft] = useState(false);
  const [editingAdditionalChargeId, setEditingAdditionalChargeId] = useState<string | null>(null);
  const [additionalChargeDraft, setAdditionalChargeDraft] = useState<AdditionalChargeDraft>(createEmptyAdditionalChargeDraft);
  const [showChargeTypeManager, setShowChargeTypeManager] = useState(false);
  const [editingChargeTypeId, setEditingChargeTypeId] = useState<string | null>(null);
  const [chargeTypeDraft, setChargeTypeDraft] = useState<AdditionalChargeTypeDraft>(createEmptyAdditionalChargeTypeDraft);

  const [advanceReceived, setAdvanceReceived] = useState(initialData?.paidAmount || 0);
  const [advanceExceptionReason, setAdvanceExceptionReason] = useState(initialData?.approvalNotes || '');

  const activeFoodSupplyKitchenItems = useMemo(
    () =>
      kitchenDishes
        .filter(
          (dish) =>
            dish.module === 'banquet' &&
            dish.status === 'approved' &&
            isDishAvailableForUsage(dish, 'reservationFoodSupplies') &&
            String(dish.dishName || '').trim(),
        )
        .sort((left, right) => left.dishName.localeCompare(right.dishName)),
    [kitchenDishes],
  );
  const foodSupplyKitchenItemById = useMemo(
    () => new Map(activeFoodSupplyKitchenItems.map((dish) => [dish.id, dish])),
    [activeFoodSupplyKitchenItems],
  );
  const selectedFoodSupplyDish = foodSupplyDraft.kitchenItemId ? foodSupplyKitchenItemById.get(foodSupplyDraft.kitchenItemId) : undefined;
  const selectedFoodSupplyVariants = selectedFoodSupplyDish ? getFoodSupplyDishVariants(selectedFoodSupplyDish) : [];
  const legacyFoodSupplyMasterById = useMemo(
    () => new Map(purchaseItems.map((item) => [item.id, item])),
    [purchaseItems],
  );
  const [masterDataRevision, setMasterDataRevision] = useState(0);

  useEffect(() => {
    const handleMasterDataUpdated = (event: Event) => {
      const key = String((event as CustomEvent<{ key?: string }>).detail?.key || '');
      if (!key || key === 'all' || key.startsWith('venueops_master_')) {
        setMasterDataRevision((revision) => revision + 1);
      }
    };

    const handleStorageUpdated = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith('venueops_master_')) {
        setMasterDataRevision((revision) => revision + 1);
      }
    };

    window.addEventListener('masterDataUpdated', handleMasterDataUpdated);
    window.addEventListener('storage', handleStorageUpdated);
    return () => {
      window.removeEventListener('masterDataUpdated', handleMasterDataUpdated);
      window.removeEventListener('storage', handleStorageUpdated);
    };
  }, []);

  // Load RCS Services from dedicated RCS setup master data.
  const masterRCSCategories = useMemo(() => loadSetupRcsCategories(), [masterDataRevision]);
  const masterRCSServices = useMemo(() => loadSetupRcsServices(), [masterDataRevision]);
  const masterRCSCategoryMap = useMemo(
    () => new Map(masterRCSCategories.map((category) => [category.id, category])),
    [masterRCSCategories],
  );
  const masterRCSServiceMap = useMemo(
    () => new Map(masterRCSServices.map((service: any) => [service.id, service])),
    [masterRCSServices],
  );
  const masterRCSVendors = useMemo(() => loadSetupRcsVendors(), [masterDataRevision]);
  const masterRCSVendorMap = useMemo(
    () => new Map(masterRCSVendors.map((vendor) => [vendor.id, vendor])),
    [masterRCSVendors],
  );
  const masterRCSVendorRates = useMemo(() => loadSetupRcsVendorRates(), [masterDataRevision]);
  const preferredRCSVendorRateByServiceId = useMemo(() => {
    const byServiceId = new Map<string, ReturnType<typeof loadSetupRcsVendorRates>[number]>();

    masterRCSVendorRates
      .filter((rate) => rate.isActive)
      .sort((left, right) => Number(right.isPreferred) - Number(left.isPreferred))
      .forEach((rate) => {
        if (!byServiceId.has(rate.serviceId)) {
          byServiceId.set(rate.serviceId, rate);
        }
      });

    return byServiceId;
  }, [masterRCSVendorRates]);
  const masterRCSCommissionRules = useMemo(() => loadSetupRcsCommissionRules(), [masterDataRevision]);
  const masterRCSCommissionRuleMap = useMemo(
    () => new Map(masterRCSCommissionRules.map((rule) => [rule.id, rule])),
    [masterRCSCommissionRules],
  );
  const activeRCSServices = useMemo(
    () =>
      sortRCSServicesByCategory(masterRCSServices, masterRCSCategoryMap).filter((service: any) => {
        const category = service.categoryId ? masterRCSCategoryMap.get(service.categoryId) : undefined;
        return (
          service.isActive === true &&
          service.showInReservation === true &&
          category?.isActive !== false &&
          category?.showInReservation !== false
        );
      }),
    [masterRCSCategoryMap, masterRCSServices],
  );
  const activeRCSCategoryOptions = useMemo(() => {
    const visibleCategoryIds = new Set(activeRCSServices.map((service: any) => service.categoryId).filter(Boolean));

    return masterRCSCategories
      .filter((category) => category.isActive !== false && category.showInReservation !== false && visibleCategoryIds.has(category.id))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [activeRCSServices, masterRCSCategories]);
  const inHouseRCSServices = useMemo(
    () => activeRCSServices.filter((service: any) => (service.fulfillmentType || 'in-house') === 'in-house'),
    [activeRCSServices],
  );
  const outsourcedRCSServices = useMemo(
    () => activeRCSServices.filter((service: any) => (service.fulfillmentType || 'in-house') === 'outsourced'),
    [activeRCSServices],
  );
  const inHouseRCSCategoryOptions = useMemo(() => {
    const categoryIds = new Set(inHouseRCSServices.map((service: any) => service.categoryId).filter(Boolean));
    return activeRCSCategoryOptions.filter((category) => categoryIds.has(category.id));
  }, [activeRCSCategoryOptions, inHouseRCSServices]);
  const outsourcedRCSCategoryOptions = useMemo(() => {
    const categoryIds = new Set(outsourcedRCSServices.map((service: any) => service.categoryId).filter(Boolean));
    return activeRCSCategoryOptions.filter((category) => categoryIds.has(category.id));
  }, [activeRCSCategoryOptions, outsourcedRCSServices]);
  useEffect(() => {
    if (showChargeTypeManager || editingChargeTypeId) {
      return;
    }

    const nextChargeTypes = eventConfigDataStore
      .getAdditionalChargeTypes(defaultAdditionalChargeTypes)
      .map((chargeType: Partial<AdditionalChargeType>, index: number) => normalizeAdditionalChargeType(chargeType, index));
    const nextSignature = serializeAdditionalChargeTypes(nextChargeTypes);

    setAdditionalChargeTypes((current) => (
      serializeAdditionalChargeTypes(current) === nextSignature ? current : nextChargeTypes
    ));
  }, [editingChargeTypeId, masterDataRevision, showChargeTypeManager]);

  const activeSetupEventTypes = useMemo(
    () => loadSetupEventTypes().filter((eventTypeConfig) => eventTypeConfig.isActive),
    [masterDataRevision]
  );
  const eventTypeOptions = useMemo(() => {
    const options = activeSetupEventTypes.map((eventTypeConfig) => eventTypeConfig.displayName);
    if (eventType.trim() && !options.includes(eventType.trim())) {
      options.unshift(eventType.trim());
    }
    return options;
  }, [activeSetupEventTypes, eventType]);
  const setupAdvancePolicy = useMemo(() => loadSetupAdvancePolicy(), [masterDataRevision]);

  type RCSServiceEntry = {
    id: string;
    source: 'In-house' | 'Outsource';
    serviceName: string;
    quantity: number;
    price: number;
    masterServiceId?: string;
    categoryId?: string;
    categoryName?: string;
    unitType?: string;
    vendorName?: string;
    costRate?: number;
    internalCost?: number;
    vendorCost?: number;
    commissionRuleId?: string;
    commissionRuleName?: string;
    notes?: string;
    description?: string;
    enteredBy?: string;
    reasonNote?: string;
  };

  // Selected RCS Services (items added to the booking)
  const [selectedRCSServices, setSelectedRCSServices] = useState<RCSServiceEntry[]>([]);
  const [rcsServiceSource, setRcsServiceSource] = useState<'In-house' | 'Outsource'>('In-house');
  const [inHouseCategoryId, setInHouseCategoryId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [inHouseQty, setInHouseQty] = useState(1);
  const [inHouseRate, setInHouseRate] = useState(0);
  const [outsourceDraft, setOutsourceDraft] = useState({
    categoryId: '',
    masterServiceId: '',
    vendorName: '',
    serviceName: '',
    unitType: '',
    quantity: 1,
    costRate: 0,
    sellingRate: 0,
    notes: '',
  });
  const [editingRCSIndex, setEditingRCSIndex] = useState<number | null>(null);
  const filteredInHouseRCSServices = useMemo(
    () => inHouseRCSServices.filter((service: any) => !inHouseCategoryId || service.categoryId === inHouseCategoryId),
    [inHouseCategoryId, inHouseRCSServices],
  );
  const filteredOutsourcedRCSServices = useMemo(
    () =>
      outsourcedRCSServices.filter(
        (service: any) => !outsourceDraft.categoryId || service.categoryId === outsourceDraft.categoryId,
      ),
    [outsourceDraft.categoryId, outsourcedRCSServices],
  );
  const rcsSourceSummaryText = useMemo(() => {
    if (rcsServiceSource === 'In-house') {
      return `${inHouseRCSServices.length} in-house setup service(s) in ${inHouseRCSCategoryOptions.length} categor${inHouseRCSCategoryOptions.length === 1 ? 'y' : 'ies'} available. Outsource has ${outsourcedRCSServices.length} service(s).`;
    }

    return `${outsourcedRCSServices.length} outsourced setup service(s) in ${outsourcedRCSCategoryOptions.length} categor${outsourcedRCSCategoryOptions.length === 1 ? 'y' : 'ies'} available. In-house has ${inHouseRCSServices.length} service(s).`;
  }, [
    inHouseRCSCategoryOptions.length,
    inHouseRCSServices.length,
    outsourcedRCSCategoryOptions.length,
    outsourcedRCSServices.length,
    rcsServiceSource,
  ]);

  const buildRcsEntryFromMasterService = useCallback(({
    service,
    quantity,
    price,
    vendorName,
    costRate,
    notes,
    existingId,
  }: {
    service: any;
    quantity: number;
    price?: number;
    vendorName?: string;
    costRate?: number;
    notes?: string;
    existingId?: string;
  }): RCSServiceEntry => {
    const source = toReservationRcsSource(service);
    const preferredRate = preferredRCSVendorRateByServiceId.get(service.id);
    const preferredVendor = preferredRate?.vendorId ? masterRCSVendorMap.get(preferredRate.vendorId) : undefined;
    const resolvedPrice =
      price === undefined ? safeNumber(preferredRate?.sellingPrice) || getRCSServiceRate(service) : safeNumber(price);
    const resolvedCostRate =
      costRate === undefined ? safeNumber(preferredRate?.vendorPrice) || getRcsServiceCostRate(service) : safeNumber(costRate);
    const commissionRule = service.commissionRuleId
      ? masterRCSCommissionRuleMap.get(service.commissionRuleId)
      : undefined;
    const category = service.categoryId ? masterRCSCategoryMap.get(service.categoryId) : undefined;

    return {
      id: existingId || `rcs-${Date.now()}`,
      source,
      serviceName: getRCSServiceName(service),
      quantity: safeNumber(quantity),
      price: resolvedPrice,
      masterServiceId: service.id,
      categoryId: service.categoryId,
      categoryName: category?.name || getRCSCategoryName(service, masterRCSCategoryMap),
      unitType: service.unitType,
      vendorName: source === 'Outsource' ? (vendorName || preferredVendor?.vendorName || '') : undefined,
      costRate: resolvedCostRate,
      internalCost: safeNumber(service.internalCost ?? service.estimatedInHouseCost),
      vendorCost: safeNumber(preferredRate?.vendorPrice ?? service.vendorCost ?? service.estimatedVendorCost),
      commissionRuleId: service.commissionRuleId,
      commissionRuleName: commissionRule?.ruleName,
      notes: notes?.trim() || undefined,
    };
  }, [masterRCSCategoryMap, masterRCSCommissionRuleMap, masterRCSVendorMap, preferredRCSVendorRateByServiceId]);

  const normalizeRcsEntry = useCallback((entry: Partial<RCSServiceEntry>): RCSServiceEntry => {
    const masterService = entry.masterServiceId ? masterRCSServiceMap.get(entry.masterServiceId) : undefined;
    if (masterService) {
      return {
        ...buildRcsEntryFromMasterService({
          service: masterService,
          quantity: safeNumber(entry.quantity),
          price: entry.price,
          vendorName: entry.vendorName,
          costRate: entry.costRate,
          notes: entry.notes,
          existingId: entry.id,
        }),
        serviceName: entry.serviceName || getRCSServiceName(masterService),
      };
    }

    return {
      id: entry.id || `rcs-${Date.now()}`,
      source: entry.source === 'Outsource' ? 'Outsource' : 'In-house',
      serviceName: String(entry.serviceName || '').trim(),
      quantity: safeNumber(entry.quantity),
      price: safeNumber(entry.price),
      masterServiceId: entry.masterServiceId,
      categoryId: entry.categoryId,
      categoryName: entry.categoryName,
      unitType: entry.unitType,
      vendorName: entry.vendorName,
      costRate: safeNumber(entry.costRate),
      internalCost: safeNumber(entry.internalCost),
      vendorCost: safeNumber(entry.vendorCost),
      commissionRuleId: entry.commissionRuleId,
      commissionRuleName: entry.commissionRuleName,
      notes: entry.notes,
      description: entry.description,
      enteredBy: entry.enteredBy,
      reasonNote: entry.reasonNote,
    };
  }, [buildRcsEntryFromMasterService, masterRCSServiceMap]);

  // Load Support Catering Items from Reservation Setup (for Venue Only bookings)
  const masterSupportCateringItems = useMemo(
    () => eventConfigDataStore.getServices(defaultSupportCateringItems),
    [masterDataRevision],
  );
  const activeSupportCateringItems = masterSupportCateringItems.filter((item: any) => item.isActive);

  // Selected Support Catering Services (items added to venue-only booking)
  const [selectedSupportCatering, setSelectedSupportCatering] = useState<Array<{ 
    id: string; 
    itemName: string; 
    pricingType: string; 
    quantity: number; 
    rate: number;
    inventoryLinked?: boolean;
    kitchenLinked?: boolean;
  }>>([]);
  
  // Currently selected support catering item in dropdown
  const [selectedSupportCateringId, setSelectedSupportCateringId] = useState('');

  // Venue Charges
  const [venueRentalCharges, setVenueRentalCharges] = useState(0);
  const [additionalHallCharges, setAdditionalHallCharges] = useState(0);
  const [chargeExtraHours, setChargeExtraHours] = useState(false);
  const [extraHourRate, setExtraHourRate] = useState(0);

  // Payment Ledger
  interface PaymentEntry {
    id: string;
    date: string;
    amount: number;
    entryType?: 'Payment' | 'Adjustment' | 'Refund';
    paymentMethod: 'Cash' | 'Online Transfer' | 'Cheque' | 'Credit Card';
    bankName?: string;
    chequeNo?: string;
    encashmentDate?: string;
    cardLastFour?: string;
    cardType?: string;
    transactionRef?: string;
    description?: string;
    referenceLabel?: string;
    fromEventName?: string;
    fromEventDate?: string;
    screenshot?: string;
    receivedBy: string;
    remarks?: string;
    createdAt: string;
    editedBy?: string;
    editedAt?: string;
  }

  interface PaymentPlanEntry {
    id: string;
    label: string;
    amount: number;
    dueDate: string;
    status: 'Planned' | 'Received' | 'Partial';
    notes?: string;
  }

  interface FinalClearanceState {
    dueDate: string;
    status: 'Planned' | 'Received' | 'Partial';
    notes: string;
  }

  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPaymentAmount, setNewPaymentAmount] = useState(0);
  const [newPaymentMethod, setNewPaymentMethod] = useState<'Cash' | 'Online Transfer' | 'Cheque' | 'Credit Card'>('Cash');
  const [newPaymentBank, setNewPaymentBank] = useState('');
  const [newPaymentChequeNo, setNewPaymentChequeNo] = useState('');
  const [newPaymentEncashmentDate, setNewPaymentEncashmentDate] = useState('');
  const [newPaymentCardLastFour, setNewPaymentCardLastFour] = useState('');
  const [newPaymentCardType, setNewPaymentCardType] = useState('');
  const [newPaymentTransactionRef, setNewPaymentTransactionRef] = useState('');
  const [newPaymentScreenshot, setNewPaymentScreenshot] = useState('');
  const [newPaymentReceivedBy, setNewPaymentReceivedBy] = useState('');
  const [newPaymentRemarks, setNewPaymentRemarks] = useState('');
  const [showEditPasswordModal, setShowEditPasswordModal] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [paymentPlanEntries, setPaymentPlanEntries] = useState<PaymentPlanEntry[]>([]);
  const [newPlanLabel, setNewPlanLabel] = useState('Next Payment');
  const [newPlanAmount, setNewPlanAmount] = useState(0);
  const [newPlanDueDate, setNewPlanDueDate] = useState('');
  const [newPlanStatus, setNewPlanStatus] = useState<PaymentPlanEntry['status']>('Planned');
  const [newPlanNotes, setNewPlanNotes] = useState('');
  const [finalClearance, setFinalClearance] = useState<FinalClearanceState>({
    dueDate: '',
    status: 'Planned',
    notes: '',
  });
  const [dirtySections, setDirtySections] = useState<DirtySections>({});
  const [pendingSectionNavigation, setPendingSectionNavigation] = useState<PendingSectionNavigation | null>(null);
  const [pendingCloseRequest, setPendingCloseRequest] = useState<PendingCloseRequest | null>(null);
  const [showTentativeConflictDialog, setShowTentativeConflictDialog] = useState(false);
  const [pendingBookingData, setPendingBookingData] = useState<Partial<Booking> | null>(null);
  const [tentativeConflicts, setTentativeConflicts] = useState<Booking[]>([]);
  const sectionDraftSnapshots = useRef<Partial<Record<SectionKey, any>>>({});

  const cloneDraftValue = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

  const createDraftSnapshot = () =>
    cloneDraftValue({
      customerName,
      primaryPhone,
      secondaryPhone,
      address,
      area,
      referenceSource,
      referredBy,
      customerRemarks,
      postEventOverallRating,
      postEventOverallComment,
      postEventWouldRecommend,
      postEventFollowUpRequired,
      postEventFollowUpAction,
      postEventServiceFeedback,
      customerSearchQuery,
      showCustomerDropdown,
      selectedCustomer,
      loadedCustomerId,
      ignoredCustomerKeys,
      eventType,
      eventDate,
      eventStartTime,
      eventEndTime,
      bookingManager,
      totalGuests,
      requiresPartition,
      menCount,
      ladiesCount,
      kidsCount,
      selectedVenueId,
      selectedPrimeSpaceId,
      selectedSubSpaceId,
      primarySpaceUsageLabel,
      primarySpaceGuestCount,
      additionalSpaceAssignments,
      venueMode,
      isManualContextCollapsed,
      guaranteedGuests,
      minimumGuaranteedGuests,
      expectedGuests,
      menuPackage,
      perHeadRate,
      menuTotal,
      menuSelection,
      foodSupplies,
      foodSupplyDraft,
      editingFoodSupplyIndex,
      inHouseServiceSearch,
      additionalCharges,
      showAdditionalChargeDraft,
      editingAdditionalChargeId,
      additionalChargeDraft,
      advanceReceived,
      advanceExceptionReason,
      selectedRCSServices,
      rcsServiceSource,
      inHouseCategoryId,
      selectedServiceId,
      inHouseQty,
      inHouseRate,
      outsourceDraft,
      editingRCSIndex,
      selectedSupportCatering,
      selectedSupportCateringId,
      venueRentalCharges,
      additionalHallCharges,
      chargeExtraHours,
      extraHourRate,
      payments,
      newPaymentDate,
      newPaymentAmount,
      newPaymentMethod,
      newPaymentBank,
      newPaymentChequeNo,
      newPaymentEncashmentDate,
      newPaymentCardLastFour,
      newPaymentCardType,
      newPaymentTransactionRef,
      newPaymentScreenshot,
      newPaymentReceivedBy,
      newPaymentRemarks,
      showEditPasswordModal,
      editingPaymentId,
      editPassword,
      showPaymentHistory,
      paymentPlanEntries,
      newPlanLabel,
      newPlanAmount,
      newPlanDueDate,
      newPlanStatus,
      newPlanNotes,
      finalClearance,
    });

  const restoreDraftSnapshot = (snapshot: any) => {
    setCustomerName(snapshot.customerName);
    setPrimaryPhone(snapshot.primaryPhone);
    setSecondaryPhone(snapshot.secondaryPhone);
    setAddress(snapshot.address);
    setArea(snapshot.area);
    setReferenceSource(normalizeReferenceSource(snapshot.referenceSource));
    setReferredBy(snapshot.referredBy);
    setCustomerRemarks(snapshot.customerRemarks);
    setPostEventOverallRating(snapshot.postEventOverallRating || '');
    setPostEventOverallComment(snapshot.postEventOverallComment || '');
    setPostEventWouldRecommend(snapshot.postEventWouldRecommend || 'Not Asked');
    setPostEventFollowUpRequired(Boolean(snapshot.postEventFollowUpRequired));
    setPostEventFollowUpAction(snapshot.postEventFollowUpAction || '');
    setPostEventServiceFeedback(snapshot.postEventServiceFeedback ?? []);
    setCustomerSearchQuery(snapshot.customerSearchQuery);
    setShowCustomerDropdown(snapshot.showCustomerDropdown);
    setSelectedCustomer(snapshot.selectedCustomer);
    setLoadedCustomerId(snapshot.loadedCustomerId);
    setIgnoredCustomerKeys(snapshot.ignoredCustomerKeys);
    setEventType(snapshot.eventType);
    setEventDate(snapshot.eventDate);
    setEventStartTime(snapshot.eventStartTime);
    setEventEndTime(snapshot.eventEndTime);
    setBookingManager(snapshot.bookingManager);
    setTotalGuests(snapshot.totalGuests);
    setRequiresPartition(snapshot.requiresPartition);
    setMenCount(snapshot.menCount);
    setLadiesCount(snapshot.ladiesCount);
    setKidsCount(snapshot.kidsCount);
    setSelectedVenueId(snapshot.selectedVenueId);
    setSelectedPrimeSpaceId(snapshot.selectedPrimeSpaceId);
    setSelectedSubSpaceId(snapshot.selectedSubSpaceId);
    setPrimarySpaceUsageLabel(snapshot.primarySpaceUsageLabel || '');
    setPrimarySpaceGuestCount(safeNumber(snapshot.primarySpaceGuestCount));
    setAdditionalSpaceAssignments(snapshot.additionalSpaceAssignments ?? []);
    setVenueMode(snapshot.venueMode);
    setIsManualContextCollapsed(snapshot.isManualContextCollapsed);
    setGuaranteedGuests(snapshot.guaranteedGuests);
    setMinimumGuaranteedGuests(snapshot.minimumGuaranteedGuests);
    setExpectedGuests(snapshot.expectedGuests);
    setMenuPackage(snapshot.menuPackage);
    setPerHeadRate(snapshot.perHeadRate);
    setMenuTotal(snapshot.menuTotal);
    setMenuSelection(snapshot.menuSelection);
    setFoodSupplies((snapshot.foodSupplies ?? []).map((line: FoodSupplyFormLine) => normalizeFoodSupplyLine(line, foodSupplyKitchenItemById, legacyFoodSupplyMasterById)));
    setFoodSupplyDraft(normalizeFoodSupplyLine(snapshot.foodSupplyDraft, foodSupplyKitchenItemById, legacyFoodSupplyMasterById));
    setEditingFoodSupplyIndex(snapshot.editingFoodSupplyIndex);
    setInHouseServiceSearch(snapshot.inHouseServiceSearch);
    setAdditionalCharges(snapshot.additionalCharges);
    setShowAdditionalChargeDraft(snapshot.showAdditionalChargeDraft);
    setEditingAdditionalChargeId(snapshot.editingAdditionalChargeId);
    setAdditionalChargeDraft(snapshot.additionalChargeDraft);
    setAdvanceReceived(snapshot.advanceReceived);
    setAdvanceExceptionReason(snapshot.advanceExceptionReason);
    setSelectedRCSServices((snapshot.selectedRCSServices ?? []).map((entry: Partial<RCSServiceEntry>) => normalizeRcsEntry(entry)));
    setRcsServiceSource(snapshot.rcsServiceSource);
    setInHouseCategoryId(snapshot.inHouseCategoryId || '');
    setSelectedServiceId(snapshot.selectedServiceId);
    setInHouseQty(snapshot.inHouseQty);
    setInHouseRate(snapshot.inHouseRate);
    setOutsourceDraft({
      categoryId: snapshot.outsourceDraft?.categoryId || '',
      masterServiceId: snapshot.outsourceDraft?.masterServiceId || '',
      vendorName: snapshot.outsourceDraft?.vendorName || '',
      serviceName: snapshot.outsourceDraft?.serviceName || '',
      unitType: snapshot.outsourceDraft?.unitType || '',
      quantity: safeNumber(snapshot.outsourceDraft?.quantity) || 1,
      costRate: safeNumber(snapshot.outsourceDraft?.costRate),
      sellingRate: safeNumber(snapshot.outsourceDraft?.sellingRate),
      notes: snapshot.outsourceDraft?.notes || '',
    });
    setEditingRCSIndex(snapshot.editingRCSIndex);
    setSelectedSupportCatering(snapshot.selectedSupportCatering);
    setSelectedSupportCateringId(snapshot.selectedSupportCateringId);
    setVenueRentalCharges(snapshot.venueRentalCharges);
    setAdditionalHallCharges(snapshot.additionalHallCharges);
    setChargeExtraHours(snapshot.chargeExtraHours);
    setExtraHourRate(snapshot.extraHourRate);
    setPayments(snapshot.payments);
    setNewPaymentDate(snapshot.newPaymentDate);
    setNewPaymentAmount(snapshot.newPaymentAmount);
    setNewPaymentMethod(snapshot.newPaymentMethod);
    setNewPaymentBank(snapshot.newPaymentBank);
    setNewPaymentChequeNo(snapshot.newPaymentChequeNo);
    setNewPaymentEncashmentDate(snapshot.newPaymentEncashmentDate);
    setNewPaymentCardLastFour(snapshot.newPaymentCardLastFour);
    setNewPaymentCardType(snapshot.newPaymentCardType);
    setNewPaymentTransactionRef(snapshot.newPaymentTransactionRef);
    setNewPaymentScreenshot(snapshot.newPaymentScreenshot);
    setNewPaymentReceivedBy(snapshot.newPaymentReceivedBy);
    setNewPaymentRemarks(snapshot.newPaymentRemarks);
    setShowEditPasswordModal(snapshot.showEditPasswordModal);
    setEditingPaymentId(snapshot.editingPaymentId);
    setEditPassword(snapshot.editPassword);
    setShowPaymentHistory(snapshot.showPaymentHistory);
    setPaymentPlanEntries(snapshot.paymentPlanEntries);
    setNewPlanLabel(snapshot.newPlanLabel);
    setNewPlanAmount(snapshot.newPlanAmount);
    setNewPlanDueDate(snapshot.newPlanDueDate);
    setNewPlanStatus(snapshot.newPlanStatus);
    setNewPlanNotes(snapshot.newPlanNotes);
    setFinalClearance(snapshot.finalClearance);
  };

  const buildInitialFormSnapshot = (booking?: Partial<Booking>, context = slot) => {
    const agreementSnapshot = booking?.currentAgreementSnapshot ?? booking?.signedAgreementSnapshot;
    const guaranteedGuestCount = safeNumber(
      agreementSnapshot?.guestGuarantees?.guaranteedGuests ?? booking?.guestCount,
    );
    const eventDateValue = context?.date
      ? `${context.date.getFullYear()}-${String(context.date.getMonth() + 1).padStart(2, '0')}-${String(context.date.getDate()).padStart(2, '0')}`
      : toDateInputValue(booking?.date) || agreementSnapshot?.event?.date || '';

    return cloneDraftValue({
      customerName: booking?.customerName || agreementSnapshot?.customer?.name || '',
      primaryPhone: booking?.contactNumber || booking?.customerPhone || agreementSnapshot?.customer?.primaryPhone || '',
      secondaryPhone: booking?.secondaryPhone || agreementSnapshot?.customer?.secondaryPhone || '',
      address: booking?.address || agreementSnapshot?.customer?.address || '',
      area: booking?.area || agreementSnapshot?.customer?.area || '',
      referenceSource: booking?.referenceSource || agreementSnapshot?.customer?.referenceSource || 'Walk-in',
      referredBy: booking?.referredBy || agreementSnapshot?.customer?.referredBy || '',
      customerRemarks: booking?.customerRemarks || agreementSnapshot?.customer?.remarks || '',
      postEventOverallRating: booking?.postEventFeedback?.overallRating || '',
      postEventOverallComment: booking?.postEventFeedback?.overallComment || '',
      postEventWouldRecommend: booking?.postEventFeedback?.wouldRecommend || 'Not Asked',
      postEventFollowUpRequired: Boolean(booking?.postEventFeedback?.followUpRequired),
      postEventFollowUpAction: booking?.postEventFeedback?.followUpAction || '',
      postEventServiceFeedback: booking?.postEventFeedback?.serviceFeedback ?? [],
      customerSearchQuery: '',
      showCustomerDropdown: false,
      selectedCustomer: null,
      loadedCustomerId: booking?.customerId || agreementSnapshot?.customer?.customerId || null,
      ignoredCustomerKeys: [],
      eventType: booking?.eventType || agreementSnapshot?.event?.eventType || '',
      eventDate: eventDateValue,
      eventStartTime:
        context?.startTime ||
        (context?.hour ? `${String(context.hour).padStart(2, '0')}:00` : booking?.startTime || agreementSnapshot?.event?.startTime || '18:00'),
      eventEndTime:
        context?.endTime ||
        (context?.hour
          ? `${String((context.hour + 4) % 24).padStart(2, '0')}:00`
          : booking?.endTime || agreementSnapshot?.event?.endTime || '23:00'),
      bookingManager: '',
      totalGuests: safeNumber(agreementSnapshot?.guestGuarantees?.totalGuests ?? booking?.guestCount),
      requiresPartition: Boolean(agreementSnapshot?.guestGuarantees?.requiresPartition),
      menCount: safeNumber(agreementSnapshot?.guestGuarantees?.menCount),
      ladiesCount: safeNumber(agreementSnapshot?.guestGuarantees?.ladiesCount),
      kidsCount: safeNumber(agreementSnapshot?.guestGuarantees?.kidsCount),
      selectedVenueId: context?.venueId || booking?.venueId || agreementSnapshot?.venue?.venueId || '',
      selectedPrimeSpaceId:
        context?.primeSpaceId || (context?.isPrime ? context.spaceId : '') || booking?.primeSpaceId || agreementSnapshot?.venue?.primeSpaceId || '',
      selectedSubSpaceId:
        context?.subSpaceId || (!context?.isPrime ? context?.spaceId : '') || booking?.subSpaceId || agreementSnapshot?.venue?.subSpaceId || '',
      venueMode: agreementSnapshot?.venue?.venueMode || 'Full',
      isManualContextCollapsed: Boolean(context),
      guaranteedGuests: guaranteedGuestCount,
      minimumGuaranteedGuests: resolveBookingMinimumGuaranteedGuests(booking),
      expectedGuests: safeNumber(agreementSnapshot?.guestGuarantees?.expectedGuests ?? booking?.guestCount),
      menuPackage: agreementSnapshot?.foodAndCatering?.menuPackage || '',
      perHeadRate: safeNumber(agreementSnapshot?.foodAndCatering?.perHeadRate),
      menuTotal: safeNumber(agreementSnapshot?.foodAndCatering?.menuTotal),
      menuSelection: agreementSnapshot?.foodAndCatering?.menuSelection ?? {
        serviceMode: 'in-house',
        mode: 'package',
        summaryLabel: '',
        guaranteedGuests: guaranteedGuestCount,
        basePerHeadRate: 0,
        finalPerHeadRate: 0,
        pricingMode: undefined,
        fixedAmount: undefined,
        cateringPerHeadRate: undefined,
        discountType: 'rs',
        discountAmount: 0,
        discountPercent: 0,
        discountGivenBy: '',
        discountReason: '',
        approvedBy: '',
        completenessOverrideNote: '',
        missingRequirements: [],
        items: [],
        customerProvidedMenu: [],
        menuTotal: 0,
      },
      foodSupplies: (agreementSnapshot?.foodSupplies?.items ?? []).map((line: FoodSupplyFormLine) =>
        normalizeFoodSupplyLine(line, foodSupplyKitchenItemById, legacyFoodSupplyMasterById),
      ),
      foodSupplyDraft: {
        item: '',
        quantity: 0,
        unit: '',
        rate: 0,
      },
      editingFoodSupplyIndex: null,
      inHouseServiceSearch: '',
      additionalCharges: normalizeAdditionalChargeLines(
        agreementSnapshot?.additionalCharges?.items ?? agreementSnapshot?.miscCharges?.items,
        additionalChargeTypes,
      ),
      showAdditionalChargeDraft: false,
      editingAdditionalChargeId: null,
      additionalChargeDraft: createEmptyAdditionalChargeDraft(),
      advanceReceived: safeNumber(
        agreementSnapshot?.paymentTerms?.advanceReceived ?? booking?.paidAmount,
      ),
      advanceExceptionReason: booking?.approvalNotes || '',
      selectedRCSServices: (agreementSnapshot?.rcs?.items ?? []).map((entry: Partial<RCSServiceEntry>) =>
        normalizeRcsEntry(entry),
      ),
      rcsServiceSource: 'In-house',
      inHouseCategoryId: '',
      selectedServiceId: '',
      inHouseQty: 1,
      inHouseRate: 0,
      outsourceDraft: {
        categoryId: '',
        masterServiceId: '',
        vendorName: '',
        serviceName: '',
        unitType: '',
        quantity: 1,
        costRate: 0,
        sellingRate: 0,
        notes: '',
      },
      editingRCSIndex: null,
      selectedSupportCatering: agreementSnapshot?.foodAndCatering?.selectedSupportCatering ?? [],
      selectedSupportCateringId: '',
      venueRentalCharges: safeNumber(agreementSnapshot?.venueCharges?.venueRentalCharges),
      additionalHallCharges: safeNumber(agreementSnapshot?.venueCharges?.additionalHallCharges),
      chargeExtraHours: Boolean(agreementSnapshot?.venueCharges?.chargeExtraHours),
      extraHourRate: safeNumber(agreementSnapshot?.venueCharges?.extraHourRate),
      payments: agreementSnapshot?.paymentTerms?.payments ?? [],
      newPaymentDate: new Date().toISOString().split('T')[0],
      newPaymentAmount: 0,
      newPaymentMethod: 'Cash',
      newPaymentBank: '',
      newPaymentChequeNo: '',
      newPaymentEncashmentDate: '',
      newPaymentCardLastFour: '',
      newPaymentCardType: '',
      newPaymentTransactionRef: '',
      newPaymentScreenshot: '',
      newPaymentReceivedBy: '',
      newPaymentRemarks: '',
      showEditPasswordModal: false,
      editingPaymentId: '',
      editPassword: '',
      showPaymentHistory: false,
      paymentPlanEntries: agreementSnapshot?.paymentTerms?.paymentPlanEntries ?? [],
      newPlanLabel: 'Next Payment',
      newPlanAmount: 0,
      newPlanDueDate: '',
      newPlanStatus: 'Planned',
      newPlanNotes: '',
      finalClearance: agreementSnapshot?.paymentTerms?.finalClearance ?? {
        dueDate: '',
        status: 'Planned',
        notes: '',
      },
    });
  };

  const clearSectionDirty = (section: SectionKey) => {
    setDirtySections((current) => {
      const next = { ...current };
      delete next[section];
      return next;
    });
  };

  const clearAllDirtySections = () => {
    sectionDraftSnapshots.current = {};
    setDirtySections({});
  };

  useEffect(() => {
    restoreDraftSnapshot(buildInitialFormSnapshot(initialData, slot));
    setAgreementStatusState(initialData?.agreementStatus ?? 'Draft');
    setSignedAgreementSnapshotState(initialData?.signedAgreementSnapshot);
    setCurrentAgreementSnapshotState(initialData?.currentAgreementSnapshot);
    setAgreementSignedAtState(initialData?.agreementSignedAt);
    setAgreementSignedByState(initialData?.agreementSignedBy);
    setAgreementVersionState(initialData?.agreementVersion ?? 0);
    setAgreementChangeHistoryState(initialData?.agreementChangeHistory ?? []);
    clearAllDirtySections();
    setPendingSectionNavigation(null);
    setPendingCloseRequest(null);
    setShowTentativeConflictDialog(false);
    setPendingBookingData(null);
    setTentativeConflicts([]);
  }, [
    initialData?.id,
    initialData?.agreementStatus,
    initialData?.signedAgreementSnapshot,
    initialData?.currentAgreementSnapshot,
    initialData?.agreementSignedAt,
    initialData?.agreementSignedBy,
    initialData?.agreementVersion,
    initialData?.agreementChangeHistory,
    slot?.venueId,
    slot?.primeSpaceId,
    slot?.subSpaceId,
    slot?.spaceId,
    slot?.startTime,
    slot?.endTime,
    slot?.hour,
    slot?.isPrime,
    slot?.date?.getTime(),
  ]);

  const markActiveSectionDirty = () => {
    if (!sectionDraftSnapshots.current[activeSection]) {
      sectionDraftSnapshots.current[activeSection] = createDraftSnapshot();
    }

    setDirtySections((current) =>
      current[activeSection] ? current : { ...current, [activeSection]: true }
    );
  };

  const handleSectionContentChange = () => {
    if (activeSection === 'food-supplies') return;
    markActiveSectionDirty();
  };

  const activeAdditionalChargeTypes = useMemo(
    () => additionalChargeTypes.filter((chargeType) => chargeType.isActive),
    [additionalChargeTypes],
  );

  const additionalChargeDraftTypeOptions = useMemo(() => {
    const selectedInactiveType = additionalChargeDraft.additionalChargeTypeId
      ? additionalChargeTypes.find(
          (chargeType) =>
            chargeType.id === additionalChargeDraft.additionalChargeTypeId &&
            !activeAdditionalChargeTypes.some((activeType) => activeType.id === chargeType.id),
        )
      : undefined;

    return selectedInactiveType
      ? [selectedInactiveType, ...activeAdditionalChargeTypes]
      : activeAdditionalChargeTypes;
  }, [activeAdditionalChargeTypes, additionalChargeDraft.additionalChargeTypeId, additionalChargeTypes]);

  const persistAdditionalChargeTypes = (nextChargeTypes: AdditionalChargeType[]) => {
    setAdditionalChargeTypes(nextChargeTypes);
    eventConfigDataStore.saveAdditionalChargeTypes(nextChargeTypes);
  };

  const resetAdditionalChargeDraft = () => {
    setAdditionalChargeDraft(createEmptyAdditionalChargeDraft());
    setEditingAdditionalChargeId(null);
    setShowAdditionalChargeDraft(false);
  };

  const openAddAdditionalCharge = () => {
    markActiveSectionDirty();
    setAdditionalChargeDraft(createEmptyAdditionalChargeDraft());
    setEditingAdditionalChargeId(null);
    setShowAdditionalChargeDraft(true);
  };

  const openEditAdditionalCharge = (charge: ReservationAdditionalCharge) => {
    markActiveSectionDirty();
    setAdditionalChargeDraft({
      id: charge.id,
      additionalChargeTypeId: charge.additionalChargeTypeId || ADDITIONAL_CHARGE_CUSTOM_TYPE_ID,
      customChargeName: charge.customChargeName || '',
      description: charge.description || '',
      quantity: safeNumber(charge.quantity) || 1,
      rate: safeNumber(charge.rate),
      notes: charge.notes || '',
      createdAt: charge.createdAt,
    });
    setEditingAdditionalChargeId(charge.id);
    setShowAdditionalChargeDraft(true);
  };

  const handleAdditionalChargeTypeSelect = (chargeTypeId: string) => {
    const selectedType = additionalChargeTypes.find((chargeType) => chargeType.id === chargeTypeId);

    setAdditionalChargeDraft((current) => ({
      ...current,
      additionalChargeTypeId: chargeTypeId,
      customChargeName: chargeTypeId === ADDITIONAL_CHARGE_CUSTOM_TYPE_ID ? current.customChargeName : '',
      description:
        chargeTypeId === ADDITIONAL_CHARGE_CUSTOM_TYPE_ID
          ? current.description
          : selectedType?.defaultDescription || current.description,
      rate:
        chargeTypeId === ADDITIONAL_CHARGE_CUSTOM_TYPE_ID
          ? current.rate
          : safeNumber(selectedType?.defaultRate),
    }));
  };

  const saveAdditionalChargeDraft = () => {
    const isCustomCharge = additionalChargeDraft.additionalChargeTypeId === ADDITIONAL_CHARGE_CUSTOM_TYPE_ID;
    const selectedType = isCustomCharge
      ? undefined
      : additionalChargeTypes.find((chargeType) => chargeType.id === additionalChargeDraft.additionalChargeTypeId);
    const customChargeName = additionalChargeDraft.customChargeName.trim();
    const description = additionalChargeDraft.description.trim();
    const quantity = safeNumber(additionalChargeDraft.quantity);
    const rate = safeNumber(additionalChargeDraft.rate);

    if (!isCustomCharge && !selectedType) {
      alert('Select an active charge type, or choose Other / Custom Charge.');
      return;
    }

    if (isCustomCharge && !customChargeName) {
      alert('Custom charge name is required for Other / Custom Charge.');
      return;
    }

    if (quantity <= 0) {
      alert('Quantity must be greater than zero.');
      return;
    }

    if (rate < 0) {
      alert('Rate cannot be negative.');
      return;
    }

    markActiveSectionDirty();

    const now = new Date().toISOString();
    const nextCharge: ReservationAdditionalCharge = {
      id: additionalChargeDraft.id || `additional-charge-${Date.now()}`,
      additionalChargeTypeId: selectedType?.id,
      customChargeName: isCustomCharge ? customChargeName : undefined,
      description: description || selectedType?.defaultDescription || customChargeName || selectedType?.name || 'Additional charge',
      quantity,
      rate,
      total: calculateAdditionalChargeTotal(quantity, rate),
      notes: additionalChargeDraft.notes.trim() || undefined,
      createdAt: additionalChargeDraft.createdAt || now,
      updatedAt: now,
    };

    setAdditionalCharges((current) =>
      editingAdditionalChargeId
        ? current.map((charge) => (charge.id === editingAdditionalChargeId ? nextCharge : charge))
        : [...current, nextCharge],
    );
    resetAdditionalChargeDraft();
  };

  const deleteAdditionalCharge = (chargeId: string) => {
    markActiveSectionDirty();
    setAdditionalCharges((current) => current.filter((charge) => charge.id !== chargeId));
    if (editingAdditionalChargeId === chargeId) {
      resetAdditionalChargeDraft();
    }
  };

  const openAddChargeType = () => {
    setChargeTypeDraft(createEmptyAdditionalChargeTypeDraft());
    setEditingChargeTypeId(null);
    setShowChargeTypeManager(true);
  };

  const openEditChargeType = (chargeType: AdditionalChargeType) => {
    setChargeTypeDraft({
      id: chargeType.id,
      name: chargeType.name,
      defaultRate: chargeType.defaultRate,
      unitType: chargeType.unitType,
      defaultDescription: chargeType.defaultDescription,
      isActive: chargeType.isActive,
      createdAt: chargeType.createdAt,
    });
    setEditingChargeTypeId(chargeType.id);
    setShowChargeTypeManager(true);
  };

  const saveChargeTypeDraft = () => {
    const name = chargeTypeDraft.name.trim();
    const now = new Date().toISOString();

    if (!name) {
      alert('Charge type name is required.');
      return;
    }

    if (
      additionalChargeTypes.some(
        (chargeType) =>
          chargeType.id !== editingChargeTypeId &&
          chargeType.name.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      alert('A charge type with this name already exists.');
      return;
    }

    const nextChargeType = normalizeAdditionalChargeType(
      {
        id: editingChargeTypeId || `additional-charge-type-${Date.now()}`,
        name,
        defaultRate: safeNumber(chargeTypeDraft.defaultRate),
        unitType: chargeTypeDraft.unitType,
        defaultDescription: chargeTypeDraft.defaultDescription,
        isActive: chargeTypeDraft.isActive,
        createdAt: chargeTypeDraft.createdAt || now,
        updatedAt: now,
      },
      additionalChargeTypes.length,
    );
    const nextChargeTypes = editingChargeTypeId
      ? additionalChargeTypes.map((chargeType) =>
          chargeType.id === editingChargeTypeId ? nextChargeType : chargeType,
        )
      : [...additionalChargeTypes, nextChargeType];

    persistAdditionalChargeTypes(nextChargeTypes);
    setChargeTypeDraft(createEmptyAdditionalChargeTypeDraft());
    setEditingChargeTypeId(null);
  };

  const toggleChargeTypeActive = (chargeTypeId: string) => {
    const now = new Date().toISOString();
    persistAdditionalChargeTypes(
      additionalChargeTypes.map((chargeType) =>
        chargeType.id === chargeTypeId
          ? { ...chargeType, isActive: !chargeType.isActive, updatedAt: now }
          : chargeType,
      ),
    );
  };

  const hasUnsavedChanges = Object.keys(dirtySections).length > 0;

  const navigateToSection = (section: SectionKey) => {
    sectionDraftSnapshots.current[section] = createDraftSnapshot();
    setActiveSection(section);
  };

  const requestSectionNavigation = (section: SectionKey) => {
    if (section === activeSection) return;

    if (dirtySections[activeSection]) {
      setPendingSectionNavigation({ from: activeSection, to: section });
      return;
    }

    navigateToSection(section);
  };

  const handleSaveAndContinueNavigation = () => {
    if (!pendingSectionNavigation) return;

    const { from, to } = pendingSectionNavigation;
    sectionDraftSnapshots.current[from] = createDraftSnapshot();
    clearSectionDirty(from);
    setPendingSectionNavigation(null);
    navigateToSection(to);
  };

  const handleDiscardAndContinueNavigation = () => {
    if (!pendingSectionNavigation) return;

    const { from, to } = pendingSectionNavigation;
    const snapshot = sectionDraftSnapshots.current[from];

    if (snapshot) {
      restoreDraftSnapshot(snapshot);
      sectionDraftSnapshots.current[to] = cloneDraftValue(snapshot);
    } else {
      sectionDraftSnapshots.current[to] = createDraftSnapshot();
    }

    clearSectionDirty(from);
    setPendingSectionNavigation(null);
    setActiveSection(to);
  };

  const handleRequestClose = () => {
    if (!hasUnsavedChanges) {
      onClose();
      return;
    }

    setPendingCloseRequest({ section: activeSection });
  };

  const handleSaveAndClose = () => {
    if (!pendingCloseRequest) return;

    setPendingCloseRequest(null);
    handleSubmit();
  };

  const handleDiscardAndClose = () => {
    if (!pendingCloseRequest) return;

    const snapshot = sectionDraftSnapshots.current[pendingCloseRequest.section];
    if (snapshot) {
      restoreDraftSnapshot(snapshot);
    }

    clearAllDirtySections();
    setPendingCloseRequest(null);
    onClose();
  };

  const newPaymentAmountPreviews = useMemo(() => {
    const amount = safeNumber(newPaymentAmount);
    if (amount <= 0) return { formatted: '', words: '' };

    return {
      formatted: new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.floor(amount)),
      words: numberToWordsEn(amount),
    };
  }, [newPaymentAmount]);

  const calculateDurationMinutes = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 0;

    const toMinutes = (timeValue: string) => {
      const [hours, minutes] = timeValue.split(':').map(Number);
      if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
      return (hours * 60) + minutes;
    };

    const startMinutes = toMinutes(startTime);
    let endMinutes = toMinutes(endTime);

    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }

    return Math.max(endMinutes - startMinutes, 0);
  };

  const formatDurationLabel = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;

    if (minutes <= 0) return '0 hours';
    if (remainder === 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
    return `${hours}h ${remainder}m`;
  };

  const baseSlotMinutes = DEFAULT_BASE_SLOT_MINUTES;

  const guestShortfall = Math.max(safeNumber(minimumGuaranteedGuests) - safeNumber(guaranteedGuests), 0);
  const minimumGuaranteeShortfallAmount = guestShortfall > 0 ? guestShortfall * safeNumber(perHeadRate) : 0;
  const extraMinutesBeyondSlot = Math.max(calculateDurationMinutes(eventStartTime, eventEndTime) - baseSlotMinutes, 0);
  const extraHourUnits = extraMinutesBeyondSlot > 0 ? extraMinutesBeyondSlot / 60 : 0;
  const extraHourCharge = chargeExtraHours && extraHourUnits > 0 ? extraHourUnits * safeNumber(extraHourRate) : 0;
  const venueCharges = safeNumber(venueRentalCharges) + safeNumber(additionalHallCharges) + safeNumber(minimumGuaranteeShortfallAmount) + safeNumber(extraHourCharge);

  const durationSummary = useMemo(() => {
    if (!eventStartTime || !eventEndTime) {
      return {
        totalMinutes: 0,
        totalLabel: 'Set start and end time',
        extraMinutes: 0,
        extraLabel: '',
      };
    }

    const totalMinutes = calculateDurationMinutes(eventStartTime, eventEndTime);
    const extraMinutes = Math.max(totalMinutes - baseSlotMinutes, 0);

    return {
      totalMinutes,
      totalLabel: formatDurationLabel(totalMinutes),
      extraMinutes,
      extraLabel: extraMinutes > 0 ? formatDurationLabel(extraMinutes) : '',
    };
  }, [baseSlotMinutes, eventEndTime, eventStartTime]);

  const isCalendarEntry = Boolean(slot);
  const hasReservationContext = Boolean(
    selectedVenueId &&
    selectedPrimeSpaceId &&
    eventDate &&
    eventStartTime &&
    eventEndTime
  );
  const shouldShowManualContextSetup = !isCalendarEntry && !isManualContextCollapsed;

  // Calculations
  const foodSuppliesTotal = foodSupplies.reduce((sum, item) => sum + (safeNumber(item.quantity) * safeNumber(item.rate)), 0);
  const supportCateringTotal = selectedSupportCatering.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  const rcsTotal = selectedRCSServices.reduce((sum, item) => sum + (safeNumber(item.quantity) * safeNumber(item.price)), 0);
  const additionalChargesTotal = additionalCharges.reduce((sum, item) => sum + safeNumber(item.total), 0);
  const taxTotal = 0;
  const grandTotal = menuTotal + foodSuppliesTotal + venueCharges + supportCateringTotal + rcsTotal + additionalChargesTotal + taxTotal;
  const totalPaymentsReceived = payments.reduce((sum, payment) => sum + safeNumber(payment.amount), 0);
  const totalPlannedAdvance = paymentPlanEntries.reduce((sum, entry) => sum + safeNumber(entry.amount), 0);

  // Get venue and space names
  const selectedVenue = venues.find(v => v.id === selectedVenueId);
  const selectedPrimeSpace = primeSpaces.find(ps => ps.id === selectedPrimeSpaceId);
  const selectedSubSpace = selectedPrimeSpace?.subSpaces?.find(ss => ss.id === selectedSubSpaceId);
  const editableSpaceAssignments = useMemo(() => {
    const primaryAssignment = selectedPrimeSpaceId
      ? [{
          venueId: selectedVenueId || selectedVenue?.id,
          primeSpaceId: selectedPrimeSpaceId,
          subSpaceId: selectedSubSpaceId || undefined,
          assignmentType: selectedSubSpaceId ? 'SUB_ONLY' : 'PRIME_FULL',
          usageLabel: primarySpaceUsageLabel.trim() || undefined,
          guestCount: safeNumber(primarySpaceGuestCount),
          sortOrder: 0,
        } satisfies BookingSpaceAssignment]
      : [];

    const normalizedAdditionalAssignments = additionalSpaceAssignments
      .map((assignment, index) => ({
        venueId: selectedVenueId || assignment.venueId,
        primeSpaceId: assignment.primeSpaceId,
        subSpaceId: assignment.assignmentType === 'SUB_ONLY' ? assignment.subSpaceId || undefined : undefined,
        assignmentType: assignment.assignmentType,
        usageLabel: assignment.usageLabel?.trim() || undefined,
        guestCount: safeNumber(assignment.guestCount),
        sortOrder: index + 1,
      }))
      .filter((assignment) => assignment.primeSpaceId);

    return [...primaryAssignment, ...normalizedAdditionalAssignments];
  }, [
    additionalSpaceAssignments,
    primarySpaceGuestCount,
    primarySpaceUsageLabel,
    selectedPrimeSpaceId,
    selectedSubSpaceId,
    selectedVenue?.id,
    selectedVenueId,
  ]);
  const reservedSpaceGuestTotal = useMemo(
    () => editableSpaceAssignments.reduce((sum, assignment) => sum + safeNumber(assignment.guestCount), 0),
    [editableSpaceAssignments],
  );
  const reservedSpaceLabels = useMemo(
    () => formatBookingSpaceAssignments({ venueId: selectedVenueId, spaceAssignments: editableSpaceAssignments }),
    [editableSpaceAssignments, selectedVenueId],
  );
  const reservedSpaceDisplayLabels = useMemo(
    () => formatBookingSpaceAssignments(
      { venueId: selectedVenueId, spaceAssignments: editableSpaceAssignments },
      { includeVenue: false },
    ),
    [editableSpaceAssignments, selectedVenueId],
  );
  const selectedVenueLabel = selectedVenue?.name || slot?.venueName || '—';
  const selectedPrimeSpaceLabel = selectedPrimeSpace?.spaceName || selectedPrimeSpace?.name || slot?.primeSpaceName || '—';
  const selectedSubSpaceLabel =
    selectedSubSpace && 'spaceName' in selectedSubSpace
      ? selectedSubSpace.spaceName
      : selectedSubSpace?.name || slot?.subSpaceName || '—';
  const bookingContextLabel = `${selectedVenueLabel} > ${selectedPrimeSpaceLabel || '—'}${
    selectedSubSpaceId ? ` > ${selectedSubSpaceLabel}` : ''
  } | ${eventDate ? formatDatePK(eventDate) : '—'}`;
  const resolvedBookingContextLabel = `${selectedVenueLabel} | ${
    reservedSpaceDisplayLabels.length > 0
      ? reservedSpaceDisplayLabels.join(' | ')
      : `${selectedPrimeSpaceLabel || 'â€”'}${selectedSubSpaceId ? ` > ${selectedSubSpaceLabel}` : ''}`
  } | ${eventDate ? formatDatePK(eventDate) : 'â€”'}`;
  const postEventServiceCatalog = useMemo<FeedbackServiceCard[]>(() => {
    const catalog: FeedbackServiceCard[] = [];
    const menuItems = [
      ...menuSelection.items,
      ...menuSelection.customerProvidedMenu,
    ]
      .map((item: any) => String(item?.dishName || item?.itemName || item?.name || item?.title || '').trim())
      .filter(Boolean);
    const supportCateringItems = selectedSupportCatering
      .map((item) => `${item.itemName} x${safeNumber(item.quantity)}`)
      .filter(Boolean);
    const foodSupplyItems = foodSupplies
      .filter((item) => safeNumber(item.quantity) > 0 || safeNumber(item.rate) > 0)
      .map((item) => `${getFoodSupplyLineName(item)} x${safeNumber(item.quantity)} ${item.unit}`.trim())
      .filter(Boolean);
    const rcsItems = selectedRCSServices
      .map((item) => `${item.serviceName} x${safeNumber(item.quantity)}`)
      .filter(Boolean);
    const additionalChargeItems = additionalCharges
      .filter((item) => safeNumber(item.quantity) > 0 || safeNumber(item.rate) > 0)
      .map((item) => `${getAdditionalChargeTypeName(item, additionalChargeTypes)} x${safeNumber(item.quantity)}`)
      .filter(Boolean);

    if (selectedVenueId || venueCharges > 0) {
      catalog.push({
        serviceKey: 'venue-charges',
        serviceLabel: 'Venue Reservation',
        bookedAmount: safeNumber(venueCharges),
        bookedItems: [resolvedBookingContextLabel],
      });
    }

    if (menuTotal > 0 || menuPackage || menuItems.length > 0) {
      catalog.push({
        serviceKey: 'food-menu',
        serviceLabel: 'Food Menu',
        bookedAmount: safeNumber(menuTotal),
        bookedItems: [menuPackage ? `Package: ${menuPackage}` : '', ...menuItems].filter(Boolean),
      });
    }

    if (supportCateringTotal > 0 || supportCateringItems.length > 0) {
      catalog.push({
        serviceKey: 'support-catering',
        serviceLabel: 'Support Catering',
        bookedAmount: safeNumber(supportCateringTotal),
        bookedItems: supportCateringItems,
      });
    }

    if (foodSuppliesTotal > 0 || foodSupplyItems.length > 0) {
      catalog.push({
        serviceKey: 'food-supplies',
        serviceLabel: 'Food Supplies',
        bookedAmount: safeNumber(foodSuppliesTotal),
        bookedItems: foodSupplyItems,
      });
    }

    if (rcsTotal > 0 || rcsItems.length > 0) {
      catalog.push({
        serviceKey: 'rcs-services',
        serviceLabel: 'RCS Services',
        bookedAmount: safeNumber(rcsTotal),
        bookedItems: rcsItems,
      });
    }

    if (additionalChargesTotal > 0 || additionalChargeItems.length > 0) {
      catalog.push({
        serviceKey: 'misc-charges',
        serviceLabel: 'Additional Charges',
        bookedAmount: safeNumber(additionalChargesTotal),
        bookedItems: additionalChargeItems,
      });
    }

    return catalog.map((service) => ({
      ...service,
      bookedItems: Array.from(new Set(service.bookedItems.filter(Boolean))),
    }));
  }, [
    foodSupplies,
    foodSuppliesTotal,
    menuPackage,
    menuSelection.customerProvidedMenu,
    menuSelection.items,
    menuTotal,
    additionalCharges,
    additionalChargeTypes,
    additionalChargesTotal,
    rcsTotal,
    resolvedBookingContextLabel,
    selectedRCSServices,
    selectedSupportCatering,
    selectedVenueId,
    supportCateringTotal,
    venueCharges,
  ]);
  const postEventServiceFeedbackByKey = useMemo(
    () => new Map(postEventServiceFeedback.map((entry) => [entry.serviceKey, entry])),
    [postEventServiceFeedback],
  );
  const updatePostEventServiceFeedback = useCallback(
    (serviceKey: PostEventServiceKey, patch: Partial<PostEventServiceFeedback>) => {
      const serviceMeta = postEventServiceCatalog.find((service) => service.serviceKey === serviceKey);

      setPostEventServiceFeedback((current) => {
        const index = current.findIndex((entry) => entry.serviceKey === serviceKey);
        const existing = index >= 0 ? current[index] : undefined;
        const nextEntry: PostEventServiceFeedback = {
          serviceKey,
          serviceLabel: serviceMeta?.serviceLabel || existing?.serviceLabel || serviceKey,
          bookedAmount: serviceMeta?.bookedAmount,
          bookedItems: serviceMeta?.bookedItems,
          rating: existing?.rating,
          customerComment: existing?.customerComment,
          internalNote: existing?.internalNote,
          issueReported: existing?.issueReported,
          ...patch,
        };
        const next = [...current];

        if (index >= 0) {
          next[index] = nextEntry;
        } else {
          next.push(nextEntry);
        }

        return next;
      });
    },
    [postEventServiceCatalog],
  );
  const legacySpaceFields = useMemo(
    () => buildLegacySpaceFieldsFromAssignments(editableSpaceAssignments),
    [editableSpaceAssignments],
  );
  const firstAmountPaidOnValue = useMemo(() => {
    const paymentDates = payments
      .filter((payment) => safeNumber(payment.amount) > 0)
      .map((payment) => payment.date)
      .filter(Boolean);

    if (paymentDates.length > 0) {
      return [...paymentDates].sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0];
    }

    const savedPaymentTerms =
      initialData?.currentAgreementSnapshot?.paymentTerms ?? initialData?.signedAgreementSnapshot?.paymentTerms;

    return (
      savedPaymentTerms?.advanceReceivedOn ||
      (safeNumber(advanceReceived) > 0
        ? initialData?.confirmationDate || toDateInputValue(initialData?.createdAt) || toDateInputValue(new Date())
        : '')
    );
  }, [
    advanceReceived,
    initialData?.confirmationDate,
    initialData?.createdAt,
    initialData?.currentAgreementSnapshot,
    initialData?.signedAgreementSnapshot,
    payments,
  ]);
  const firstAmountPaidOnDisplay = firstAmountPaidOnValue ? formatLifecycleDate(firstAmountPaidOnValue) : 'Not paid yet';
  const advanceExceptionApprovedByDisplay = initialData?.approvedBy || currentUserName || '—';
  const advanceExceptionApprovalDateDisplay =
    initialData?.approvalDate ? formatLifecycleDate(initialData.approvalDate) : 'Will be recorded on save';
  const operationalEventDateDisplay = formatOperationalEventDate(eventDate);
  const handleAddAdditionalSpace = () => {
    setShowReservedSpacesDetails(true);
    setAdditionalSpaceAssignments((current) => [
      ...current,
      {
        ...createEditableSpaceAssignment(selectedVenueId),
        sortOrder: current.length + 1,
      },
    ]);
  };
  const handleUpdateAdditionalSpace = (
    index: number,
    updates: Partial<BookingSpaceAssignment>,
  ) => {
    setAdditionalSpaceAssignments((current) =>
      current.map((assignment, assignmentIndex) => {
        if (assignmentIndex !== index) {
          return assignment;
        }

        const nextAssignmentType =
          (updates.assignmentType ?? assignment.assignmentType) === 'SUB_ONLY' ? 'SUB_ONLY' : 'PRIME_FULL';
        const nextPrimeSpaceId = updates.primeSpaceId ?? assignment.primeSpaceId;
        return {
          ...assignment,
          ...updates,
          primeSpaceId: nextPrimeSpaceId,
          assignmentType: nextAssignmentType,
          subSpaceId:
            nextAssignmentType === 'SUB_ONLY'
              ? (updates.subSpaceId ?? assignment.subSpaceId ?? '')
              : undefined,
          usageLabel: updates.usageLabel ?? assignment.usageLabel ?? '',
          venueId: selectedVenueId || assignment.venueId,
          sortOrder: index + 1,
        };
      }),
    );
  };
  const handleRemoveAdditionalSpace = (index: number) => {
    setAdditionalSpaceAssignments((current) =>
      current
        .filter((_, assignmentIndex) => assignmentIndex !== index)
        .map((assignment, assignmentIndex) => ({
          ...assignment,
          sortOrder: assignmentIndex + 1,
        })),
    );
  };
  const renderAddSpaceButton = (className?: string) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleAddAdditionalSpace}
      disabled={!selectedVenueId || !selectedPrimeSpaceId}
      className={className}
    >
      <Plus className="mr-1 size-3.5" />
      Add Space
    </Button>
  );
  const renderAdditionalReservedSpacesEditor = (options?: { compact?: boolean }) => {
    const compact = options?.compact ?? false;
    const primarySpaceDisplayLabel = selectedSubSpaceId
      ? `${selectedPrimeSpaceLabel} > ${selectedSubSpaceLabel}`
      : selectedPrimeSpaceLabel;
    const hasPrimarySpace = Boolean(selectedPrimeSpaceId);
    const hasAdditionalSpaces = additionalSpaceAssignments.length > 0;
    const totalReservedSpaces = (hasPrimarySpace ? 1 : 0) + additionalSpaceAssignments.length;
    const shouldShowMultiSpaceSection = hasPrimarySpace && hasAdditionalSpaces;

    return (
      <div className={`space-y-2 ${compact ? '' : 'mt-1'}`}>
        {!hasPrimarySpace ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            Select the primary venue and space first, then define reserved-space usage here.
          </div>
        ) : (
          <>
            {!shouldShowMultiSpaceSection && (
              <div className="rounded-md border border-slate-200 bg-white p-2.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Primary Space</div>
                  {renderAddSpaceButton()}
                </div>
                <div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_120px]">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-gray-700">Space</label>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900">
                      {primarySpaceDisplayLabel}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-gray-700">Usage Label</label>
                    <Input
                      type="text"
                      value={primarySpaceUsageLabel}
                      onChange={(e) => setPrimarySpaceUsageLabel(e.target.value)}
                      placeholder="Ladies / Dining / Main Event"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-gray-700">Informational Guests</label>
                    <Input
                      type="number"
                      value={primarySpaceGuestCount || ''}
                      onChange={(e) => setPrimarySpaceGuestCount(Math.max(Number(e.target.value) || 0, 0))}
                      placeholder="0"
                      className="w-full"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            )}

            {shouldShowMultiSpaceSection && (
              <div className="rounded-md border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Reserved Spaces</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
                      <span>Total spaces booked: <span className="font-semibold text-slate-900">{totalReservedSpaces}</span></span>
                      <span>Primary space: <span className="font-semibold text-slate-900">{primarySpaceDisplayLabel}</span></span>
                      <span>Total informational guests: <span className="font-semibold text-slate-900">{reservedSpaceGuestTotal.toLocaleString('en-PK')}</span></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderAddSpaceButton()}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReservedSpacesDetails((current) => !current)}
                      className="h-9 px-3"
                    >
                      {showReservedSpacesDetails ? 'Hide Details' : 'Show Details'}
                      <ChevronDown className={`ml-2 size-4 text-slate-500 transition-transform ${showReservedSpacesDetails ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>
                </div>

                {showReservedSpacesDetails && (
                  <div className="space-y-2 border-t border-slate-200 px-3 py-3">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Primary Space</div>
                      <div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_120px]">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-gray-700">Space</label>
                          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900">
                            {primarySpaceDisplayLabel}
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-gray-700">Usage Label</label>
                          <Input
                            type="text"
                            value={primarySpaceUsageLabel}
                            onChange={(e) => setPrimarySpaceUsageLabel(e.target.value)}
                            placeholder="Ladies / Dining / Main Event"
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-gray-700">Informational Guests</label>
                          <Input
                            type="number"
                            value={primarySpaceGuestCount || ''}
                            onChange={(e) => setPrimarySpaceGuestCount(Math.max(Number(e.target.value) || 0, 0))}
                            placeholder="0"
                            className="w-full"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>

                    {additionalSpaceAssignments.map((assignment, index) => {
                      const additionalPrimeSpace = primeSpaces.find((primeSpace) => primeSpace.id === assignment.primeSpaceId);
                      return (
                        <div
                          key={`space-assignment-${index}`}
                          className="rounded-md border border-slate-200 bg-slate-50 p-2.5"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Extra Space {index + 1}</div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveAdditionalSpace(index)}
                              className="h-8 w-8 border-red-200 p-0 text-red-700 hover:bg-red-50"
                              title="Remove space"
                              aria-label={`Remove reserved space ${index + 2}`}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[0.9fr_1fr_1fr_1fr_120px]">
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-gray-700">Space</label>
                              <select
                                value={assignment.primeSpaceId}
                                onChange={(e) =>
                                  handleUpdateAdditionalSpace(index, {
                                    primeSpaceId: e.target.value,
                                    subSpaceId: assignment.assignmentType === 'SUB_ONLY' ? '' : undefined,
                                  })
                                }
                                className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select Prime Space</option>
                                {primeSpaces
                                  .filter((primeSpace) => primeSpace.venueId === selectedVenueId)
                                  .map((primeSpace) => (
                                    <option key={primeSpace.id} value={primeSpace.id}>{primeSpace.name}</option>
                                  ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-gray-700">Usage Label</label>
                              <Input
                                type="text"
                                value={assignment.usageLabel || ''}
                                onChange={(e) => handleUpdateAdditionalSpace(index, { usageLabel: e.target.value })}
                                placeholder="Dining / Gents / Stage"
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-gray-700">Sub Space</label>
                              <select
                                value={assignment.subSpaceId || ''}
                                onChange={(e) => handleUpdateAdditionalSpace(index, { subSpaceId: e.target.value })}
                                disabled={assignment.assignmentType !== 'SUB_ONLY' || !assignment.primeSpaceId}
                                className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                              >
                                <option value="">{assignment.assignmentType === 'SUB_ONLY' ? 'Select Sub Space' : 'Not needed'}</option>
                                {additionalPrimeSpace?.subSpaces?.map((subSpace) => (
                                  <option key={subSpace.id} value={subSpace.id}>{subSpace.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-gray-700">Type</label>
                              <select
                                value={assignment.assignmentType}
                                onChange={(e) =>
                                  handleUpdateAdditionalSpace(index, {
                                    assignmentType: e.target.value === 'SUB_ONLY' ? 'SUB_ONLY' : 'PRIME_FULL',
                                    subSpaceId: e.target.value === 'SUB_ONLY' ? assignment.subSpaceId || '' : undefined,
                                  })
                                }
                                className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="PRIME_FULL">Full Prime</option>
                                <option value="SUB_ONLY">Sub Space</option>
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-gray-700">Informational Guests</label>
                              <Input
                                type="number"
                                value={assignment.guestCount || ''}
                                onChange={(e) =>
                                  handleUpdateAdditionalSpace(index, { guestCount: Math.max(Number(e.target.value) || 0, 0) })
                                }
                                placeholder="0"
                                className="w-full"
                                min="0"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px]">
                      <span className="font-medium text-slate-600">Total informational guests across spaces</span>
                      <span className="text-sm font-bold text-slate-900">{reservedSpaceGuestTotal.toLocaleString('en-PK')} guests</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };
  const otherBookings = useMemo(
    () => existingBookings.filter((booking) => booking.id !== initialData?.id),
    [existingBookings, initialData?.id]
  );

  const derivedCustomerRecords = useMemo(
    () => buildCustomerRecordsFromBookings(otherBookings),
    [otherBookings]
  );

  const customerRecords = useMemo(
    () => mergeCustomerRecords(derivedCustomerRecords, storedCustomerRecords),
    [derivedCustomerRecords, storedCustomerRecords]
  );

  const customerSearchResults = useMemo(() => {
    const query = customerSearchQuery.trim();
    if (query.length < 2) return [];
    const normalizedQuery = normalizeText(query);
    const queryDigits = phoneLookupKey(query);

    return customerRecords
      .filter((customer) => {
        const nameMatches = normalizeText(customer.customerName).includes(normalizedQuery);
        const phoneMatches = queryDigits
          ? phoneLookupKey(customer.primaryPhone).includes(queryDigits) || phoneDigits(customer.primaryPhone).includes(phoneDigits(query))
          : false;
        return nameMatches || phoneMatches;
      })
      .slice(0, 8);
  }, [customerRecords, customerSearchQuery]);

  const detectedCustomer = useMemo(() => {
    const primaryPhoneKey = phoneLookupKey(primaryPhone);
    const matchedByPhone =
      primaryPhoneKey.length >= 7
        ? customerRecords.find((customer) => phoneLookupKey(customer.primaryPhone) === primaryPhoneKey)
        : undefined;

    const matchedByName =
      !matchedByPhone && customerName.trim().length >= 3
        ? customerRecords.find((customer) => normalizeText(customer.customerName) === normalizeText(customerName))
        : undefined;

    const matchedCustomer = matchedByPhone || matchedByName || null;
    if (!matchedCustomer) return null;

    return ignoredCustomerKeys.includes(customerLookupKey(matchedCustomer)) ? null : matchedCustomer;
  }, [customerName, customerRecords, ignoredCustomerKeys, primaryPhone]);

  const activeCustomerMatch = selectedCustomer || detectedCustomer;
  const previousEvents = activeCustomerMatch?.events || [];
  const lastEventDisplay = activeCustomerMatch?.lastEventDate ? formatDatePK(activeCustomerMatch.lastEventDate) : 'N/A';

  const selectedSetupVenue = useMemo(
    () => loadLiveVenueInventory().venues.find((venue) => venue.id === selectedVenueId),
    [masterDataRevision, selectedVenueId]
  );
  const minimumAdvanceResolution = useMemo<AdvanceResolution>(() => {
    if (!selectedVenueId || !selectedPrimeSpaceId) {
      return {
        amount: 0,
        source: 'no-selection',
        note: 'Select a venue and prime space to load minimum advance',
      };
    }

    const configuredAmount = selectedSubSpaceId
      ? safeNumber(setupAdvancePolicy.subSpaceMinimumAdvance)
      : safeNumber(setupAdvancePolicy.primeSpaceMinimumAdvance);

    if (configuredAmount > 0) {
      return {
        amount: configuredAmount,
        source: 'configured-amount',
        note: selectedSubSpaceId
          ? 'Uses the active sub-space advance rule'
          : 'Uses the active prime-space advance rule',
      };
    }

    return {
      amount: 0,
      source: 'not-configured',
      note: 'No minimum advance configured for the selected space',
    };
  }, [
    selectedVenueId,
    selectedPrimeSpaceId,
    selectedSubSpaceId,
    setupAdvancePolicy.primeSpaceMinimumAdvance,
    setupAdvancePolicy.subSpaceMinimumAdvance,
  ]);

  const paymentLedgerSummary = useMemo(() => {
    const paidAtBooking = safeNumber(advanceReceived);
    const receivedPayments = safeNumber(totalPaymentsReceived);
    const totalReceived = paidAtBooking + receivedPayments;
    const minimumAdvance = safeNumber(minimumAdvanceResolution.amount);
    const remainingCommitment = Math.max(minimumAdvance - totalReceived, 0);
    const remainingBalance = Math.max(safeNumber(grandTotal) - totalReceived, 0);
    const hasConfiguredMinimumAdvance =
      minimumAdvanceResolution.source !== 'no-selection' &&
      minimumAdvanceResolution.source !== 'not-configured';
    const isMinimumAdvanceMet = hasConfiguredMinimumAdvance && remainingCommitment <= 0;

    return {
      paidAtBooking,
      receivedPayments,
      totalReceived,
      totalPlannedAdvance: safeNumber(totalPlannedAdvance),
      minimumAdvance,
      hasConfiguredMinimumAdvance,
      remainingCommitment,
      remainingBalance,
      isMinimumAdvanceMet,
      minimumAdvanceSource: minimumAdvanceResolution.source,
      minimumAdvanceNote: minimumAdvanceResolution.note,
    };
  }, [advanceReceived, grandTotal, minimumAdvanceResolution, totalPaymentsReceived, totalPlannedAdvance]);

  const minimumAdvanceDisplay =
    paymentLedgerSummary.minimumAdvanceSource === 'no-selection' ||
    paymentLedgerSummary.minimumAdvanceSource === 'not-configured'
      ? '—'
      : formatCurrencyPKR(paymentLedgerSummary.minimumAdvance);
  const paymentLedgerEntries = useMemo(() => {
    const sortedEntries = [...payments].sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    let runningBalance = Math.max(safeNumber(paymentLedgerSummary.paidAtBooking), 0);

    return sortedEntries.map((payment) => {
      const type = payment.entryType ?? 'Payment';
      const amountEffect = type === 'Refund' ? -safeNumber(payment.amount) : safeNumber(payment.amount);

      runningBalance = Math.max(runningBalance + amountEffect, 0);

      const reference =
        (type === 'Adjustment' && payment.fromEventName
          ? `From Event (${payment.fromEventName}${payment.fromEventDate ? ` - ${formatDatePK(payment.fromEventDate)}` : ''})`
          : undefined) ||
        (type === 'Refund' && (payment.remarks || payment.description)
          ? payment.remarks || payment.description
          : undefined) ||
        payment.referenceLabel ||
        payment.transactionRef ||
        payment.chequeNo ||
        (payment.cardType && payment.cardLastFour ? `${payment.cardType} •••• ${payment.cardLastFour}` : '') ||
        payment.bankName ||
        '—';

      const baseDescription =
        payment.description ||
        payment.remarks ||
        (type === 'Refund' ? 'Refund entry' : type === 'Adjustment' ? 'Adjustment entry' : 'Received payment');

      return {
        ...payment,
        type,
        reference,
        description: baseDescription,
        runningBalance,
      };
    });
  }, [grandTotal, paymentLedgerSummary.paidAtBooking, payments]);
  const hasConfiguredMinimumAdvance = paymentLedgerSummary.hasConfiguredMinimumAdvance;
  const requiresAdvanceException = paymentLedgerSummary.totalReceived <= 0;
  const hasAdvanceExceptionApproval = requiresAdvanceException || initialData?.approvalStatus === 'approved';
  const shouldShowPlannedPayments = hasConfiguredMinimumAdvance && !paymentLedgerSummary.isMinimumAdvanceMet;
  const finalClearanceStatusDisplay =
    paymentLedgerSummary.remainingBalance <= 0 ? 'Not Required' : finalClearance.status;
  const minimumAdvanceStatusLabel = !hasConfiguredMinimumAdvance
    ? null
    : paymentLedgerSummary.isMinimumAdvanceMet
      ? 'Fulfilled'
      : 'Pending';
  const isReSignRequired = agreementStatusState === 'Re-sign Required';
  const agreementDisplayedPerHeadRate = safeNumber(menuSelection.finalPerHeadRate || perHeadRate);
  const agreementDisplayedMenuPackage = menuPackage || menuSelection.summaryLabel || '—';
  const agreementServiceModeLabel =
    menuSelection.serviceMode === 'catering-only' ? 'Catering Only' : 'Food & Catering';
  const agreementCommercialHeading = 'Catering';
  const agreementPackageLabel =
    menuSelection.serviceMode === 'catering-only' ? 'Pricing Basis' : 'Catering Package';
  const agreementPerHeadRateLabel =
    menuSelection.serviceMode === 'catering-only' ? 'Effective Per Head Rate' : 'Catering Rate Per Head';
  const agreementTotalLabel = 'Catering Total';
  const financialSummaryRows: Array<{
    label: string;
    amount: number;
    section?: SectionKey;
    clickable?: boolean;
    tone?: 'default' | 'positive' | 'negative' | 'total';
  }> = [
    { label: 'Venue Charges', amount: safeNumber(venueCharges), section: 'event-details', clickable: true },
    { label: 'Catering Charges', amount: safeNumber(menuTotal), section: 'guest-menu', clickable: true },
    { label: 'RCS Services', amount: safeNumber(rcsTotal), section: 'rcs-services', clickable: true },
    { label: 'Food Supplies', amount: safeNumber(foodSuppliesTotal), section: 'food-supplies', clickable: true },
    { label: 'Additional Charges', amount: safeNumber(additionalChargesTotal), section: 'misc-charges', clickable: true },
    { label: 'Taxes', amount: safeNumber(taxTotal), clickable: false },
    { label: 'Grand Total', amount: safeNumber(grandTotal), section: 'final-summary', clickable: true, tone: 'total' },
    { label: 'Paid', amount: safeNumber(paymentLedgerSummary.totalReceived), clickable: false, tone: 'positive' },
    { label: 'Remaining Balance', amount: safeNumber(paymentLedgerSummary.remainingBalance), clickable: false, tone: 'negative' },
  ];

  // Sidebar sections
  const sections: Array<{ key: SectionKey; label: string; icon?: any }> = [
    { key: 'customer-info', label: 'Customer Information', icon: Users },
    { key: 'event-details', label: 'Event Details', icon: CalendarIcon },
    { key: 'guest-menu', label: 'Food & Catering', icon: Users },
    { key: 'food-supplies', label: 'Food Supplies', icon: FileText },
    { key: 'rcs-services', label: 'RCS Services', icon: FileText },
    { key: 'setup-integrations', label: 'Setup & Integrations', icon: Link2 },
    { key: 'misc-charges', label: 'Additional Charges', icon: DollarSign },
    ...(allowPaymentLedger ? [{ key: 'payment-ledger' as SectionKey, label: 'Payment Ledger', icon: DollarSign }] : []),
    { key: 'callback-tracking', label: 'Confirmed Follow-Up', icon: Clock },
    { key: 'post-event-feedback', label: 'Post-Event Feedback', icon: FileText },
    { key: 'final-summary', label: 'Booking Agreement', icon: FileText },
    { key: 'shift-event', label: 'Shift Event', icon: ArrowRight },
    { key: 'cancellation', label: 'Cancellation Details', icon: XCircle },
  ];

  useEffect(() => {
    if (!allowPaymentLedger && activeSection === 'payment-ledger') {
      setActiveSection('customer-info');
    }
  }, [activeSection, allowPaymentLedger]);

  const buildAgreementSnapshot = (
    minimumGuaranteedGuestsOverride = minimumGuaranteedGuests,
  ): BookingAgreementSnapshot => ({
    customer: {
      customerId: loadedCustomerId || activeCustomerMatch?.id,
      name: customerName,
      primaryPhone: primaryPhone,
      secondaryPhone,
      address,
      area,
      city,
      referenceSource,
      referredBy,
      remarks: customerRemarks,
    },
    event: {
      eventType,
      date: eventDate,
      startTime: eventStartTime,
      endTime: eventEndTime,
    },
    venue: {
      venueId: selectedVenueId,
      venueName: selectedVenue?.name,
      primeSpaceId: legacySpaceFields.primeSpaceId,
      primeSpaceName: legacySpaceFields.primeSpaceId ? selectedPrimeSpaceLabel : undefined,
      subSpaceId: legacySpaceFields.subSpaceId,
      subSpaceName: legacySpaceFields.subSpaceId ? selectedSubSpaceLabel : undefined,
      venueMode,
    },
    guestGuarantees: {
      guaranteedGuests: safeNumber(guaranteedGuests),
      minimumGuaranteedGuests: safeNumber(minimumGuaranteedGuestsOverride),
      expectedGuests: safeNumber(expectedGuests),
      totalGuests: safeNumber(totalGuests),
      menCount: safeNumber(menCount),
      ladiesCount: safeNumber(ladiesCount),
      kidsCount: safeNumber(kidsCount),
      requiresPartition,
    },
    venueCharges: {
      venueRentalCharges: safeNumber(venueRentalCharges),
      additionalHallCharges: safeNumber(additionalHallCharges),
      chargeExtraHours,
      extraHourRate: safeNumber(extraHourRate),
      total: safeNumber(venueCharges),
    },
    foodAndCatering: {
      menuPackage,
      perHeadRate: safeNumber(menuSelection.finalPerHeadRate || perHeadRate),
      menuTotal: safeNumber(menuSelection.menuTotal || menuTotal),
      supportCateringTotal: safeNumber(supportCateringTotal),
      menuSelection: {
        serviceMode: menuSelection.serviceMode,
        mode: menuSelection.mode,
        summaryLabel: menuSelection.summaryLabel,
        packageId: menuSelection.packageId,
        packageName: menuSelection.packageName,
        guaranteedGuests: safeNumber(menuSelection.guaranteedGuests),
        basePerHeadRate: safeNumber(menuSelection.basePerHeadRate),
        finalPerHeadRate: safeNumber(menuSelection.finalPerHeadRate),
        pricingMode: menuSelection.pricingMode,
        fixedAmount: menuSelection.fixedAmount,
        cateringPerHeadRate: menuSelection.cateringPerHeadRate,
        discountType: menuSelection.discountType,
        discountAmount: safeNumber(menuSelection.discountAmount),
        discountPercent: safeNumber(menuSelection.discountPercent),
        discountGivenBy: menuSelection.discountGivenBy,
        discountReason: menuSelection.discountReason,
        approvedBy: menuSelection.approvedBy,
        completenessOverrideNote: menuSelection.completenessOverrideNote,
        missingRequirements: [...menuSelection.missingRequirements],
        items: menuSelection.items.map((item) => ({ ...item })),
        customerProvidedMenu: menuSelection.customerProvidedMenu.map((item) => ({ ...item })),
        menuTotal: safeNumber(menuSelection.menuTotal),
      },
      selectedSupportCatering: selectedSupportCatering.map((item) => ({ ...item })),
    },
    foodSupplies: {
      items: foodSupplies.map((item) => normalizeFoodSupplyLine(item, foodSupplyKitchenItemById, legacyFoodSupplyMasterById)),
      total: safeNumber(foodSuppliesTotal),
    },
    rcs: {
      items: selectedRCSServices.map((item) => normalizeRcsEntry(item)),
      total: safeNumber(rcsTotal),
    },
    additionalCharges: {
      items: additionalCharges.map((item) => ({ ...item, total: calculateAdditionalChargeTotal(item.quantity, item.rate) })),
      total: safeNumber(additionalChargesTotal),
    },
    taxes: {
      total: safeNumber(taxTotal),
    },
    discounts: {
      type: menuSelection.discountType,
      amount: safeNumber(menuSelection.discountAmount),
      percent: safeNumber(menuSelection.discountPercent),
      givenBy: menuSelection.discountGivenBy,
      reason: menuSelection.discountReason,
      approvedBy: menuSelection.approvedBy,
    },
    totals: {
      menuTotal: safeNumber(menuTotal),
      foodSuppliesTotal: safeNumber(foodSuppliesTotal),
      supportCateringTotal: safeNumber(supportCateringTotal),
      rcsTotal: safeNumber(rcsTotal),
      additionalChargesTotal: safeNumber(additionalChargesTotal),
      miscTotal: safeNumber(additionalChargesTotal),
      taxTotal: safeNumber(taxTotal),
      grandTotal: safeNumber(grandTotal),
      paidAmount: safeNumber(paymentLedgerSummary.totalReceived),
      balance: safeNumber(paymentLedgerSummary.remainingBalance),
    },
    paymentTerms: {
      advanceReceived: safeNumber(advanceReceived),
      advanceReceivedOn: firstAmountPaidOnValue || undefined,
      receivedPayments: safeNumber(paymentLedgerSummary.receivedPayments),
      totalReceived: safeNumber(paymentLedgerSummary.totalReceived),
      minimumAdvance: safeNumber(paymentLedgerSummary.minimumAdvance),
      minimumAdvanceSource: paymentLedgerSummary.minimumAdvanceSource,
      minimumAdvanceNote: paymentLedgerSummary.minimumAdvanceNote,
      remainingCommitment: safeNumber(paymentLedgerSummary.remainingCommitment),
      totalPlannedAdvance: safeNumber(paymentLedgerSummary.totalPlannedAdvance),
      isMinimumAdvanceMet: paymentLedgerSummary.isMinimumAdvanceMet,
      advanceExceptionApprovedBy: requiresAdvanceException ? currentUserName : undefined,
      advanceExceptionApprovedAt: requiresAdvanceException ? new Date().toISOString() : undefined,
      advanceExceptionReason: requiresAdvanceException ? advanceExceptionReason.trim() || undefined : undefined,
      paymentPlanEntries: paymentPlanEntries.map((entry) => ({ ...entry })),
      finalClearance: { ...finalClearance },
      payments: payments.map((payment) => ({ ...payment })),
    },
  });

  const handleTotalGuestsChange = useCallback((value: number) => {
    setTotalGuests(value);
    setGuaranteedGuests(value);
    setExpectedGuests((current) => (current === 0 ? value : current));
  }, []);

  useEffect(() => {
    if (guaranteedGuests !== totalGuests) {
      setTotalGuests(guaranteedGuests);
    }
  }, [guaranteedGuests]);

  useEffect(() => {
    if (eventDate && !finalClearance.dueDate) {
      const clearanceDate = new Date(`${eventDate}T00:00:00`);
      clearanceDate.setDate(
        clearanceDate.getDate() - Math.max(0, selectedSetupVenue?.balanceDueDaysBeforeEvent ?? 7)
      );

      setFinalClearance((current) => ({
        ...current,
        dueDate: clearanceDate.toISOString().split('T')[0],
      }));
    }
  }, [eventDate, finalClearance.dueDate, selectedSetupVenue?.balanceDueDaysBeforeEvent]);

  useEffect(() => {
    if (newPlanDueDate || !hasConfiguredMinimumAdvance) {
      return;
    }

    const anchorDate =
      toDateInputValue(initialData?.confirmationDate) ||
      toDateInputValue(initialData?.inquiryDate) ||
      toDateInputValue(initialData?.createdAt) ||
      toDateInputValue(new Date());

    if (!anchorDate) {
      return;
    }

    const dueDate = new Date(`${anchorDate}T00:00:00`);
    if (Number.isNaN(dueDate.getTime())) {
      return;
    }

    dueDate.setDate(dueDate.getDate() + Math.max(0, setupAdvancePolicy.dueDaysAfterBooking));
    setNewPlanDueDate(dueDate.toISOString().split('T')[0]);
  }, [
    hasConfiguredMinimumAdvance,
    initialData?.confirmationDate,
    initialData?.createdAt,
    initialData?.inquiryDate,
    newPlanDueDate,
    setupAdvancePolicy.dueDaysAfterBooking,
  ]);

  useEffect(() => {
    if (!isCalendarEntry && hasReservationContext) {
      setIsManualContextCollapsed(true);
    }
  }, [hasReservationContext, isCalendarEntry]);

  // Payment handling functions
  const handleAddPayment = () => {
    if (newPaymentAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }
    markActiveSectionDirty();

    const newPayment: PaymentEntry = {
      id: `PAY-${Date.now()}`,
      date: newPaymentDate,
      amount: newPaymentAmount,
      paymentMethod: newPaymentMethod,
      bankName: newPaymentBank,
      chequeNo: newPaymentChequeNo,
      encashmentDate: newPaymentEncashmentDate,
      cardLastFour: newPaymentCardLastFour,
      cardType: newPaymentCardType,
      transactionRef: newPaymentTransactionRef,
      screenshot: newPaymentScreenshot,
      receivedBy: newPaymentReceivedBy || 'Front Desk',
      remarks: newPaymentRemarks,
      createdAt: new Date().toISOString(),
    };

    setPayments([...payments, newPayment]);

    // Reset form
    setNewPaymentDate(new Date().toISOString().split('T')[0]);
    setNewPaymentAmount(0);
    setNewPaymentMethod('Cash');
    setNewPaymentBank('');
    setNewPaymentChequeNo('');
    setNewPaymentEncashmentDate('');
    setNewPaymentCardLastFour('');
    setNewPaymentCardType('');
    setNewPaymentTransactionRef('');
    setNewPaymentScreenshot('');
    setNewPaymentReceivedBy('');
    setNewPaymentRemarks('');
  };

  const handleAddPaymentPlan = () => {
    if (!newPlanLabel.trim() || newPlanAmount <= 0 || !newPlanDueDate) {
      alert('Please fill in payment label, amount, and due date');
      return;
    }
    markActiveSectionDirty();

    const newEntry: PaymentPlanEntry = {
      id: `PLAN-${Date.now()}`,
      label: newPlanLabel.trim(),
      amount: newPlanAmount,
      dueDate: newPlanDueDate,
      status: newPlanStatus,
      notes: newPlanNotes.trim() || undefined,
    };

    setPaymentPlanEntries((current) => [...current, newEntry]);
    setNewPlanLabel('Next Payment');
    setNewPlanAmount(0);
    setNewPlanDueDate('');
    setNewPlanStatus('Planned');
    setNewPlanNotes('');
  };

  const handleDeletePaymentPlan = (entryId: string) => {
    markActiveSectionDirty();
    setPaymentPlanEntries((current) => current.filter((entry) => entry.id !== entryId));
  };

  const handleEditPayment = (paymentId: string) => {
    setEditingPaymentId(paymentId);
    setShowEditPasswordModal(true);
  };

  const handleDeletePayment = (paymentId: string, password: string) => {
    // Simple password check (in production, use secure authentication)
    if (password !== 'admin123') {
      alert('Incorrect password');
      return;
    }
    markActiveSectionDirty();
    setPayments(payments.filter(p => p.id !== paymentId));
    setShowEditPasswordModal(false);
    setEditPassword('');
    setEditingPaymentId('');
  };

  const handlePrintReceipt = (payment: PaymentEntry) => {
    window.print();
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPaymentScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const syncAgreementStateFromBooking = (bookingData: Partial<Booking>) => {
    setAgreementStatusState(bookingData.agreementStatus ?? 'Draft');
    setSignedAgreementSnapshotState(bookingData.signedAgreementSnapshot);
    setCurrentAgreementSnapshotState(bookingData.currentAgreementSnapshot);
    setAgreementSignedAtState(bookingData.agreementSignedAt);
    setAgreementSignedByState(bookingData.agreementSignedBy);
    setAgreementVersionState(bookingData.agreementVersion ?? 0);
    setAgreementChangeHistoryState(bookingData.agreementChangeHistory ?? []);
  };

  const saveConfirmedReservation = (bookingData: Partial<Booking>, overriddenTentativeIds: string[] = []) => {
    const shouldCloseAfterSave = Boolean(pendingCloseRequest);
    const wasSaved = onSave(
      bookingData,
      overriddenTentativeIds.length > 0 ? { overriddenTentativeIds } : undefined,
    );
    if (!wasSaved) {
      return;
    }
    syncAgreementStateFromBooking(bookingData);
    clearAllDirtySections();
    setPendingCloseRequest(null);
    if (shouldCloseAfterSave) {
      onClose();
    }
  };

  const handleSelectCustomer = (customer: CustomerRecord) => {
    setSelectedCustomer(customer);
    setCustomerSearchQuery(`${customer.customerName} | ${customer.primaryPhone}`);
    setShowCustomerDropdown(false);
    setIgnoredCustomerKeys((current) => current.filter((key) => key !== customerLookupKey(customer)));
  };

  const handleLoadCustomerData = (customer: CustomerRecord) => {
    markActiveSectionDirty();
    setCustomerName(customer.customerName);
    setPrimaryPhone(customer.primaryPhone);
    setSecondaryPhone(customer.secondaryPhone || '');
    setAddress(customer.address || '');
    setArea(customer.area || '');
    setReferenceSource(normalizeReferenceSource(customer.referenceSource || 'Repeat Customer'));
    setReferredBy(customer.referredBy || '');
    setCustomerRemarks(customer.customerRemarks || '');
    setSelectedCustomer(customer);
    setLoadedCustomerId(customer.id);
    setIgnoredCustomerKeys((current) => current.filter((key) => key !== customerLookupKey(customer)));
    alert('Customer data loaded into the current reservation.');
  };

  const handleUpdateCustomerRecord = (customer: CustomerRecord) => {
    const confirmed = window.confirm('Update this customer record with the edited customer information?');
    if (!confirmed) return;

    if (!isValidPakistaniMobileInput(primaryPhone)) {
      alert(PAKISTANI_MOBILE_VALIDATION_MESSAGE);
      return;
    }

    const updatedCustomer = withCustomerStats({
      ...customer,
      customerName: customerName.trim() || customer.customerName,
      primaryPhone: primaryPhone.trim() || customer.primaryPhone,
      secondaryPhone: secondaryPhone.trim() || undefined,
      address: address.trim() || undefined,
      area: area.trim() || undefined,
      city,
      referenceSource: referenceSource || undefined,
      referredBy: referredBy.trim() || undefined,
      customerRemarks: customerRemarks.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });

    const updatedStoredRecords = [
      ...storedCustomerRecords.filter((record) => customerLookupKey(record) !== customerLookupKey(updatedCustomer)),
      updatedCustomer,
    ];

    setStoredCustomerRecords(updatedStoredRecords);
    writeStoredCustomerRecords(updatedStoredRecords);
    setSelectedCustomer(updatedCustomer);
    setLoadedCustomerId(updatedCustomer.id);
    alert('Customer record updated.');
  };

  const handleContinueNewCustomer = (customer: CustomerRecord) => {
    setIgnoredCustomerKeys((current) => Array.from(new Set([...current, customerLookupKey(customer)])));
    setSelectedCustomer(null);
    setLoadedCustomerId(null);
    setCustomerSearchQuery('');
  };

  const handleSubmit = (requestedAgreementStatus?: BookingAgreementStatus) => {
    const missingRequiredFields: string[] = [];

    if (!customerName.trim()) {
      missingRequiredFields.push('Customer Name');
    }
    if (!eventDate) {
      missingRequiredFields.push('Event Date');
    }
    if (!selectedVenueId) {
      missingRequiredFields.push('Venue');
    }
    if (!selectedPrimeSpaceId) {
      missingRequiredFields.push('Prime Space');
    }
    if (safeNumber(guaranteedGuests) <= 0) {
      missingRequiredFields.push('Guaranteed Guests');
    }
    if (safeNumber(minimumGuaranteedGuests) <= 0) {
      missingRequiredFields.push('Minimum Guaranteed Guests');
    }

    if (missingRequiredFields.length > 0) {
      alert(`Please fill in these required fields:\n- ${missingRequiredFields.join('\n- ')}`);
      return;
    }

    if (!isValidPakistaniMobileInput(primaryPhone)) {
      alert(PAKISTANI_MOBILE_VALIDATION_MESSAGE);
      return;
    }

    if (requiresAdvanceException && !advanceExceptionReason.trim()) {
      alert('Enter the reason for this zero-advance reservation before confirming it.');
      return;
    }

    if (initialData?.id) {
      const kitchenEstimates = loadWorkflowState<KitchenEstimateLockRecord[]>(
        WORKFLOW_STATE_KEYS.centralKitchenEstimates,
        [],
      );
      const kitchenHasProcessedOrder = kitchenEstimates.some(
        (record) => record.bookingId === initialData.id && record.status === 'approved',
      );

      if (kitchenHasProcessedOrder) {
        const previousMenuSignature = buildReservationMenuChangeSignature(
          (initialData.currentAgreementSnapshot?.foodAndCatering?.menuSelection ||
            initialData.signedAgreementSnapshot?.foodAndCatering?.menuSelection) as Partial<ReservationMenuSnapshot> | undefined,
        );
        const nextMenuSignature = buildReservationMenuChangeSignature(menuSelection);
        const previousFoodSuppliesSignature = buildFoodSupplyChangeSignature(
          initialData.currentAgreementSnapshot?.foodSupplies?.items ||
            initialData.signedAgreementSnapshot?.foodSupplies?.items ||
            [],
        );
        const nextFoodSuppliesSignature = buildFoodSupplyChangeSignature(foodSupplies);

        if (previousMenuSignature !== nextMenuSignature || previousFoodSuppliesSignature !== nextFoodSuppliesSignature) {
          alert('Kitchen has already processed this event. Ask Kitchen to undo processing before changing the menu or food supplies.');
          return;
        }
      }
    }

    const changedAt = new Date().toISOString();
    const reservedSpaceValidationError = validateReservedSpaceAssignments(editableSpaceAssignments);
    if (reservedSpaceValidationError) {
      alert(reservedSpaceValidationError);
      return;
    }
    const effectiveMinimumGuaranteedGuests = isMinimumGuaranteedGuestsLocked
      ? lockedMinimumGuaranteedGuests
      : safeNumber(minimumGuaranteedGuests);
    const minimumGuaranteedGuestsWasChanged =
      isPersistedConfirmedReservation &&
      effectiveMinimumGuaranteedGuests !== lockedMinimumGuaranteedGuests;
    let minimumGuaranteedGuestsChangeReason: string | undefined;

    if (minimumGuaranteedGuestsWasChanged && isAdminUser) {
      const providedReason = window.prompt(
        'Enter a reason for changing Minimum Guaranteed Guests (optional).',
        '',
      );

      if (providedReason === null) {
        return;
      }

      minimumGuaranteedGuestsChangeReason = providedReason.trim() || undefined;
    }

    const currentAgreementSnapshot = buildAgreementSnapshot(effectiveMinimumGuaranteedGuests);
    const inquiryDate =
      initialData?.inquiryDate ||
      (initialData?.createdAt instanceof Date
        ? initialData.createdAt.toISOString()
        : initialData?.createdAt
          ? String(initialData.createdAt)
          : changedAt);
    const confirmationDate = initialData?.confirmationDate || changedAt;
    const trimmedPostEventOverallComment = postEventOverallComment.trim();
    const trimmedPostEventFollowUpAction = postEventFollowUpAction.trim();
    const normalizedPostEventServiceFeedback = postEventServiceCatalog
      .map((service) => {
        const existing = postEventServiceFeedbackByKey.get(service.serviceKey);
        const customerComment = existing?.customerComment?.trim() || undefined;
        const internalNote = existing?.internalNote?.trim() || undefined;

        return {
          serviceKey: service.serviceKey,
          serviceLabel: service.serviceLabel,
          bookedAmount: service.bookedAmount > 0 ? safeNumber(service.bookedAmount) : undefined,
          bookedItems: service.bookedItems.length > 0 ? service.bookedItems : undefined,
          rating: existing?.rating,
          customerComment,
          internalNote,
          issueReported: existing?.issueReported ? true : undefined,
        } satisfies PostEventServiceFeedback;
      })
      .filter((entry) => entry.rating || entry.customerComment || entry.internalNote || entry.issueReported);
    const hasPostEventFeedback =
      Boolean(postEventOverallRating) ||
      Boolean(trimmedPostEventOverallComment) ||
      postEventWouldRecommend !== 'Not Asked' ||
      postEventFollowUpRequired ||
      Boolean(trimmedPostEventFollowUpAction) ||
      normalizedPostEventServiceFeedback.length > 0;
    const normalizedPostEventFeedback: PostEventFeedback | undefined = hasPostEventFeedback
      ? {
          overallRating: postEventOverallRating || undefined,
          overallComment: trimmedPostEventOverallComment || undefined,
          wouldRecommend: postEventWouldRecommend,
          followUpRequired: postEventFollowUpRequired,
          followUpAction: trimmedPostEventFollowUpAction || undefined,
          serviceFeedback: normalizedPostEventServiceFeedback,
          recordedAt: initialData?.postEventFeedback?.recordedAt || changedAt,
          recordedBy: initialData?.postEventFeedback?.recordedBy || currentUserName,
          updatedAt: changedAt,
          updatedBy: currentUserName,
        }
      : undefined;
    // Future full customer-ledger integration should upsert these by sourceId.
    // For now they persist in the booking payload and payable balance follows grandTotal.
    const additionalChargeLedgerEntries = buildAdditionalChargeLedgerEntries(additionalCharges, additionalChargeTypes);
    let nextAgreementStatus: BookingAgreementStatus = requestedAgreementStatus ?? agreementStatusState;
    let nextSignedAgreementSnapshot = signedAgreementSnapshotState;
    let nextAgreementSignedAt = agreementSignedAtState;
    let nextAgreementSignedBy = agreementSignedByState;
    let nextAgreementVersion = agreementVersionState;
    let nextAgreementChangeHistory = [...agreementChangeHistoryState];

    if (minimumGuaranteedGuestsWasChanged && isAdminUser) {
      nextAgreementChangeHistory = [
        ...nextAgreementChangeHistory,
        {
          field: 'Minimum Guaranteed Guests',
          section: 'Event Details',
          oldValue: lockedMinimumGuaranteedGuests.toLocaleString('en-PK'),
          newValue: effectiveMinimumGuaranteedGuests.toLocaleString('en-PK'),
          changedBy: currentUserName,
          changedAt,
          reason: minimumGuaranteedGuestsChangeReason,
        },
      ];
    }

    if (nextAgreementStatus === 'Signed' && !nextSignedAgreementSnapshot) {
      nextSignedAgreementSnapshot = currentAgreementSnapshot;
      nextAgreementSignedAt = nextAgreementSignedAt || changedAt;
      nextAgreementSignedBy = nextAgreementSignedBy || currentUserName;
      nextAgreementVersion = Math.max(nextAgreementVersion, 0) + 1;
    }

    const previousAgreementSnapshot =
      currentAgreementSnapshotState ?? initialData?.currentAgreementSnapshot ?? nextSignedAgreementSnapshot;
    const detectedChanges = previousAgreementSnapshot
      ? detectAgreementSnapshotChanges(
          previousAgreementSnapshot,
          currentAgreementSnapshot,
          currentUserName,
          changedAt,
        )
      : [];
    const filteredDetectedChanges = minimumGuaranteedGuestsWasChanged
      ? detectedChanges.filter((entry) => entry.field !== 'Minimum Guaranteed Guests')
      : detectedChanges;

    if (filteredDetectedChanges.length > 0) {
      nextAgreementChangeHistory = [...nextAgreementChangeHistory, ...filteredDetectedChanges];
    }

    if (nextAgreementStatus === 'Signed' && nextSignedAgreementSnapshot) {
      if (filteredDetectedChanges.length > 0) {
        nextAgreementStatus = 'Re-sign Required';
      }
    }

    const bookingData: Partial<Booking> = {
      id: initialData?.id,
      customerId: loadedCustomerId || activeCustomerMatch?.id,
      customerName,
      contactNumber: primaryPhone,
      secondaryPhone,
      address,
      area,
      city,
      referenceSource,
      referredBy,
      customerRemarks,
      eventType,
      inquiryDate,
      confirmationDate,
      date: new Date(eventDate),
      startTime: eventStartTime,
      endTime: eventEndTime,
      guestCount: guaranteedGuests,
      minimumGuaranteedGuests: effectiveMinimumGuaranteedGuests,
      venueId: selectedVenueId,
      venueName: selectedVenue?.name,
      primeSpaceId: legacySpaceFields.primeSpaceId,
      primeSpaceIds: legacySpaceFields.primeSpaceIds,
      primeSpaceName: selectedPrimeSpaceLabel,
      subSpaceId: legacySpaceFields.subSpaceId,
      subSpaceName: selectedSubSpaceId ? selectedSubSpaceLabel : undefined,
      spaceAssignments: editableSpaceAssignments,
      status: 'confirmed',
      totalAmount: grandTotal,
      paidAmount: advanceReceived,
      balance: paymentLedgerSummary.remainingBalance,
      approvalStatus: requiresAdvanceException ? 'approved' : undefined,
      approvalType: requiresAdvanceException ? 'no-advance' : undefined,
      approvedBy: requiresAdvanceException ? currentUserName : undefined,
      approvalDate: requiresAdvanceException ? new Date(changedAt) : undefined,
      approvalNotes: requiresAdvanceException ? advanceExceptionReason.trim() : undefined,
      postEventFeedback: normalizedPostEventFeedback,
      agreementStatus: nextAgreementStatus,
      signedAgreementSnapshot: nextSignedAgreementSnapshot,
      currentAgreementSnapshot,
      agreementSignedAt: nextAgreementSignedAt,
      agreementSignedBy: nextAgreementSignedBy,
      agreementVersion: nextAgreementVersion,
      agreementChangeHistory: nextAgreementChangeHistory,
      additionalCharges: additionalCharges.map((item) => ({ ...item, total: calculateAdditionalChargeTotal(item.quantity, item.rate) })),
      additionalChargeLedgerEntries,
      customerPayableBalance: paymentLedgerSummary.remainingBalance,
    };

    const confirmedConflicts = existingBookings.filter((booking) =>
      hasConfirmedReservationConflict({
        booking: {
          id: bookingData.id,
          date: bookingData.date as Date,
          startTime: bookingData.startTime as string,
          endTime: bookingData.endTime as string,
          venueId: bookingData.venueId as string,
          primeSpaceId: bookingData.primeSpaceId,
          primeSpaceIds: bookingData.primeSpaceIds,
          subSpaceId: bookingData.subSpaceId,
        },
        existingBooking: booking,
        primeSpaceCatalog: primeSpaces,
      })
    );

    if (confirmedConflicts.length > 0) {
      alert('This space is already booked for this time.');
      return;
    }

    saveConfirmedReservation(bookingData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-100 rounded-lg shadow-2xl w-full h-[90vh] flex flex-col" style={{ maxWidth: '1400px' }}>
        
        {/* STICKY HEADER - BOOKING SUMMARY */}
        <div className="bg-white border-b-2 border-gray-300 flex-shrink-0">
          {/* Header Controls */}
          <div className="bg-blue-900 text-white px-6 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold">Confirmed Reservation Form</h1>
            <div className="flex items-center gap-3">
              {allowAgreementPreview && (
                <Button
                  onClick={() => setShowAgreementPreview(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Eye className="size-4 mr-2" />
                  Preview Agreement
                </Button>
              )}
              <Button
                onClick={() => handleSubmit()}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="size-4 mr-2" />
                Save Reservation
              </Button>
              <button
                onClick={handleRequestClose}
                className="p-1.5 hover:bg-blue-800 rounded transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Header Row 1 */}
          <div className="grid grid-cols-7 gap-4 px-6 py-3 border-b border-gray-200">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">Customer Name</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">{customerName || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">First Amount Paid On</div>
              <div className="text-sm font-semibold text-gray-900 mt-0.5">{firstAmountPaidOnDisplay}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">Event Date</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">
                {operationalEventDateDisplay}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">Venue</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">{selectedVenueLabel}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">Space</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">
                {reservedSpaceDisplayLabels.length > 0
                  ? reservedSpaceDisplayLabels.join(' | ')
                  : `${selectedPrimeSpaceLabel}${selectedSubSpaceId ? ` > ${selectedSubSpaceLabel}` : ''}`}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">Slot</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">
                {eventStartTime && eventEndTime ? formatTimeRangePK(eventStartTime, eventEndTime) : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">Guaranteed Guests</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">{guaranteedGuests || '—'}</div>
            </div>
          </div>

          {/* Header Row 2 */}
          <div className="grid grid-cols-6 gap-4 px-6 py-3 bg-gray-50">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">Grand Total</div>
              <div className="text-sm font-bold text-blue-900 mt-0.5">{formatCurrencyPKR(grandTotal)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">Paid</div>
              <div className="text-sm font-bold text-green-700 mt-0.5">{formatCurrencyPKR(paymentLedgerSummary.totalReceived)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">Remaining Balance</div>
              <div className="text-sm font-bold text-red-700 mt-0.5">{formatCurrencyPKR(paymentLedgerSummary.remainingBalance)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">Booking Status</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-semibold">
                  <Check className="size-3" />
                  Confirmed
                </span>
                {isReSignRequired && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    <AlertTriangle className="size-3" />
                    Re-sign Required
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">Min Advance</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">{minimumAdvanceDisplay}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">Remaining Commitment</div>
              <div className="mt-0.5 flex items-center gap-1">
                <span className={`text-sm font-bold ${paymentLedgerSummary.isMinimumAdvanceMet ? 'text-green-700' : 'text-amber-700'}`}>
                  {formatCurrencyPKR(paymentLedgerSummary.remainingCommitment)}
                </span>
                {!paymentLedgerSummary.isMinimumAdvanceMet && <AlertTriangle className="size-3.5 text-amber-600" />}
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT SIDEBAR - 260px */}
          <div className="w-[260px] bg-white border-r border-gray-300 overflow-y-auto flex-shrink-0">
            <div className="p-3">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2 px-2">Navigation</div>
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.key}
                    onClick={() => requestSectionNavigation(section.key)}
                    className={`w-full text-left px-3 py-2.5 rounded mb-1 transition-colors text-sm ${
                      activeSection === section.key
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className="size-4 flex-shrink-0" />}
                      <span className="min-w-0 flex-1 text-xs">{section.label}</span>
                      {dirtySections[section.key] && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            activeSection === section.key
                              ? 'bg-white/20 text-white'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          Unsaved
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT CONTENT AREA */}
          <div
            className="flex-1 overflow-y-auto bg-gray-100 p-6"
            onChangeCapture={handleSectionContentChange}
          >
            <div className="max-w-5xl">
              
              {/* CUSTOMER INFORMATION */}
              {activeSection === 'customer-info' && (
                <div className="bg-white rounded-lg border border-gray-300 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="size-5 text-blue-600" />
                    Customer Information
                  </h2>

                  <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          setShowCustomerDropdown(true);
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        placeholder="Search by customer name or phone"
                        className="w-full pl-9"
                      />
                      {showCustomerDropdown && customerSearchQuery.trim().length >= 2 && (
                        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                          {customerSearchResults.length > 0 ? (
                            customerSearchResults.map((customer) => (
                              <button
                                key={customer.id}
                                type="button"
                                onClick={() => handleSelectCustomer(customer)}
                                className="w-full border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-blue-50 last:border-b-0"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-semibold text-gray-900">{customer.customerName}</span>
                                  <span className="text-xs text-gray-500">{customer.primaryPhone || 'No phone'}</span>
                                </div>
                                <div className="mt-0.5 text-xs text-gray-500">
                                  {customer.previousEvents} previous event{customer.previousEvents === 1 ? '' : 's'} | {customer.area || DEFAULT_CUSTOMER_CITY}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-4 text-sm text-gray-500">No matching customers found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Name *</label>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter customer name"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Phone Number *</label>
                      <Input
                        value={primaryPhone}
                        onChange={(e) => setPrimaryPhone(e.target.value)}
                        placeholder="e.g., +92 300 1234567"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Secondary Phone Number</label>
                      <Input
                        value={secondaryPhone}
                        onChange={(e) => setSecondaryPhone(e.target.value)}
                        placeholder="Optional"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Reference Source</label>
                      <select
                        value={referenceSource}
                        onChange={(e) => setReferenceSource(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Walk-in">Walk-in</option>
                        <option value="Phone Call">Phone Call</option>
                        <option value="Online">Online</option>
                        <option value="Referral">Referral</option>
                        <option value="Repeat Customer">Repeat Customer</option>
                        <option value="Social Media">Social Media</option>
                      </select>
                    </div>
                    
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter customer address"
                        className="w-full"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Area / Locality</label>
                      <Input
                        list="lahore-area-options"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        placeholder="Pak Arab Society, Shadab Town"
                        className="w-full"
                      />
                      <datalist id="lahore-area-options">
                        {LAHORE_AREAS.map((areaName) => (
                          <option key={areaName} value={areaName} />
                        ))}
                      </datalist>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Referred By Customer</label>
                      <Input
                        value={referredBy}
                        onChange={(e) => setReferredBy(e.target.value)}
                        placeholder="Optional"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks</label>
                      <Input
                        value={customerRemarks}
                        onChange={(e) => setCustomerRemarks(e.target.value)}
                        placeholder="Optional notes"
                        className="w-full"
                      />
                    </div>
                  </div>

                  {activeCustomerMatch && (
                    <div className="mt-6 rounded-md border border-blue-200 bg-blue-50 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <UserCheck className="size-4 text-blue-700" />
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-blue-900">Existing Customer Found</div>
                            <div className="text-sm font-semibold text-gray-900">{activeCustomerMatch.customerName}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 bg-blue-600 text-xs text-white hover:bg-blue-700"
                            onClick={() => handleLoadCustomerData(activeCustomerMatch)}
                          >
                            Load Customer Data
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 bg-white text-xs"
                            onClick={() => handleUpdateCustomerRecord(activeCustomerMatch)}
                          >
                            Update Record
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 bg-white text-xs"
                            onClick={() => handleContinueNewCustomer(activeCustomerMatch)}
                          >
                            Continue New
                          </Button>
                        </div>
                      </div>

                      <div className="mb-3 grid grid-cols-3 gap-3 text-xs">
                        <div className="rounded border border-blue-100 bg-white px-3 py-2">
                          <div className="text-gray-600">Previous Events</div>
                          <div className="mt-0.5 text-sm font-bold text-gray-900">{activeCustomerMatch.previousEvents}</div>
                        </div>
                        <div className="rounded border border-blue-100 bg-white px-3 py-2">
                          <div className="text-gray-600">Last Event Date</div>
                          <div className="mt-0.5 text-sm font-bold text-gray-900">{lastEventDisplay}</div>
                        </div>
                        <div className="rounded border border-blue-100 bg-white px-3 py-2">
                          <div className="text-gray-600">Lifetime Value</div>
                          <div className="mt-0.5 text-sm font-bold text-gray-900">{formatCurrencyPKR(activeCustomerMatch.lifetimeValue)}</div>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded border border-blue-100 bg-white">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">Date</th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">Event Type</th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">Venue</th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-700">Guests</th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-700">Total Amount</th>
                              <th className="px-3 py-2 text-center font-semibold text-gray-700">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previousEvents.length > 0 ? (
                              previousEvents.map((event) => (
                                <tr key={event.id} className="border-t border-gray-100">
                                  <td className="px-3 py-2 text-gray-700">{event.date ? formatDatePK(event.date) : '-'}</td>
                                  <td className="px-3 py-2 font-medium text-gray-900">{event.eventType}</td>
                                  <td className="px-3 py-2 text-gray-700">{event.venue}</td>
                                  <td className="px-3 py-2 text-right text-gray-700">{event.guests.toLocaleString('en-PK')}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatCurrencyPKR(event.totalAmount)}</td>
                                  <td className="px-3 py-2 text-center">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-[11px]"
                                      onClick={() => setReadonlyAgreementEvent(event)}
                                    >
                                      <Eye className="mr-1 size-3" />
                                      View Agreement
                                    </Button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={6} className="px-3 py-5 text-center text-gray-500">
                                  No previous events recorded.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* EVENT DETAILS */}
              {activeSection === 'event-details' && (
                <div className="bg-white rounded-lg border border-gray-300 p-4">
                  <div className="space-y-2.5">
                    {shouldShowManualContextSetup && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Reservation Context Setup</div>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-700">Venue *</label>
                            <select
                              value={selectedVenueId}
                              onChange={(e) => {
                                setSelectedVenueId(e.target.value);
                                setSelectedPrimeSpaceId('');
                                setSelectedSubSpaceId('');
                                setPrimarySpaceUsageLabel('');
                                setAdditionalSpaceAssignments([]);
                              }}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select Venue</option>
                              {venues.map((venue) => (
                                <option key={venue.id} value={venue.id}>{venue.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-700">Prime Space *</label>
                            <select
                              value={selectedPrimeSpaceId}
                              onChange={(e) => {
                                setSelectedPrimeSpaceId(e.target.value);
                                setSelectedSubSpaceId('');
                              }}
                              disabled={!selectedVenueId}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            >
                              <option value="">Select Prime Space</option>
                              {primeSpaces
                                .filter((primeSpace) => primeSpace.venueId === selectedVenueId)
                                .map((primeSpace) => (
                                  <option key={primeSpace.id} value={primeSpace.id}>{primeSpace.name}</option>
                                ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-700">Sub Space</label>
                            <select
                              value={selectedSubSpaceId}
                              onChange={(e) => setSelectedSubSpaceId(e.target.value)}
                              disabled={!selectedPrimeSpaceId}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            >
                              <option value="">None (Full Prime Space)</option>
                              {selectedPrimeSpace?.subSpaces?.map((subSpace) => (
                                <option key={subSpace.id} value={subSpace.id}>{subSpace.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-700">Event Date *</label>
                            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-700">Start Time *</label>
                            <Input type="time" value={eventStartTime} onChange={(e) => setEventStartTime(e.target.value)} className="w-full" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-700">End Time *</label>
                            <Input type="time" value={eventEndTime} onChange={(e) => setEventEndTime(e.target.value)} className="w-full" />
                          </div>
                        </div>
                        <div className="mt-4">
                          {renderAdditionalReservedSpacesEditor()}
                        </div>
                      </div>
                    )}

                    {!shouldShowManualContextSetup && (
                      <>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-900">{resolvedBookingContextLabel}</span>
                          <span>Venue, space, and date changes are handled through Shift Event only.</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>
                              First Amount Paid On: <span className="font-semibold text-slate-900">{firstAmountPaidOnDisplay}</span>
                            </span>
                            <span>
                              Event Date: <span className="font-bold text-slate-900">{operationalEventDateDisplay}</span>
                            </span>
                          </div>
                        </div>
                        <div className="mt-3">
                          {renderAdditionalReservedSpacesEditor({ compact: true })}
                        </div>

                        <div className="rounded-md border border-slate-200 bg-white p-2.5">
                          <div className="mb-2 grid gap-2 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-gray-700">Event Type *</label>
                              <select
                                value={eventType}
                                onChange={(e) => setEventType(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select event type</option>
                                {eventTypeOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-gray-700">Booking Manager Name</label>
                              <Input
                                type="text"
                                value={bookingManager}
                                onChange={(e) => setBookingManager(e.target.value)}
                                placeholder="Enter manager name"
                                className="w-full"
                              />
                            </div>
                          </div>

                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Event Timing</div>
                          <div className="mt-1.5 grid items-end gap-2 md:grid-cols-4 xl:grid-cols-[1fr_1fr_0.7fr_0.7fr]">
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-gray-700">Start</label>
                              <Input type="time" value={eventStartTime} onChange={(e) => setEventStartTime(e.target.value)} className="w-full" />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-gray-700">End</label>
                              <Input type="time" value={eventEndTime} onChange={(e) => setEventEndTime(e.target.value)} className="w-full" />
                            </div>
                            <div>
                              <div className="mb-1 text-[11px] font-semibold text-gray-700">Duration</div>
                              <div className="text-sm font-bold text-slate-900">{durationSummary.totalLabel}</div>
                            </div>
                            <div>
                              <div className="mb-1 text-[11px] font-semibold text-gray-700">Extra</div>
                              <div className={`text-sm font-bold ${durationSummary.extraMinutes > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                                {durationSummary.extraMinutes > 0 ? durationSummary.extraLabel : '-'}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-2 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">
                          <div className="rounded-md border border-slate-200 bg-white p-2.5">
                            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Guest Commitment</div>
                            <div className="grid gap-2 md:grid-cols-2">
                              <div>
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <label className="block text-[11px] font-semibold text-gray-700">Guaranteed Guests *</label>
                                  <span className="text-[11px] text-slate-500">Controlled here only</span>
                                </div>
                                <Input
                                  type="number"
                                  value={guaranteedGuests || ''}
                                  placeholder="0"
                                  className="w-full"
                                  min="0"
                                  onChange={(e) => {
                                    const nextGuaranteedGuests = Math.max(Number(e.target.value) || 0, 0);
                                    handleTotalGuestsChange(nextGuaranteedGuests);
                                    if (requiresPartition) {
                                      setLadiesCount(Math.max(nextGuaranteedGuests - safeNumber(menCount), 0));
                                    }
                                  }}
                                />
                              </div>

                              <div>
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <label className="block text-[11px] font-semibold text-gray-700">Minimum Guaranteed Guests *</label>
                              <span className={`text-[11px] font-medium ${guestShortfall > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                                {guestShortfall > 0 ? `Shortfall: ${guestShortfall} guests` : 'Met'}
                              </span>
                            </div>
                            {isMinimumGuaranteedGuestsLocked && (
                              <div className="mb-1 flex items-center gap-1 text-[11px] text-slate-500">
                                <Lock className="size-3.5" />
                                <span>Locked after confirmation. Admin can update if needed.</span>
                              </div>
                            )}
                            <Input
                              type="number"
                              value={minimumGuaranteedGuests || ''}
                              onChange={(e) => setMinimumGuaranteedGuests(Number(e.target.value))}
                              placeholder="0"
                              className="w-full"
                              min="0"
                              disabled={isMinimumGuaranteedGuestsLocked}
                            />
                          </div>

                              <div className="md:col-span-2">
                                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                                  <input
                                    type="checkbox"
                                    checked={requiresPartition}
                                    onChange={(e) => setRequiresPartition(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-xs font-semibold text-gray-700">Requires Partition</span>
                                </label>
                              </div>
                              {requiresPartition && (
                                <div className="md:col-span-2 grid gap-2 md:grid-cols-[1fr_auto]">
                                  <div>
                                    <label className="mb-1 block text-[11px] font-semibold text-gray-700">Gents</label>
                                    <Input
                                      type="number"
                                      value={menCount || ''}
                                      onChange={(e) => {
                                        const nextMenCount = Math.max(Number(e.target.value), 0);
                                        setMenCount(nextMenCount);
                                        setLadiesCount(Math.max(safeNumber(guaranteedGuests) - nextMenCount, 0));
                                      }}
                                      placeholder="0"
                                      className="w-full"
                                      min="0"
                                      max={safeNumber(guaranteedGuests)}
                                    />
                                  </div>
                                  <div className="flex items-end">
                                    <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">
                                      Ladies auto: {Math.max(safeNumber(guaranteedGuests) - safeNumber(menCount), 0)}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="rounded-md border border-slate-200 bg-white p-2.5">
                            <div className="space-y-2.5">
                              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Venue Charges</div>
                              <div className="grid gap-2 md:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-[11px] font-semibold text-gray-700">Venue Rental</label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-600">Rs.</span>
                                    <Input
                                      type="number"
                                      value={venueRentalCharges || ''}
                                      onChange={(e) => setVenueRentalCharges(Number(e.target.value))}
                                      className="pl-12 text-sm font-semibold text-blue-900"
                                      placeholder="0"
                                      min="0"
                                    />
                                  </div>
                                </div>

                                {guestShortfall > 0 && (
                                  <div>
                                    <label className="mb-1 block text-[11px] font-semibold text-gray-700">Shortfall Rate (per guest)</label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-600">Rs.</span>
                                      <Input
                                        type="number"
                                        value={perHeadRate || ''}
                                        onChange={(e) => setPerHeadRate(Number(e.target.value))}
                                        className="pl-12 text-sm font-semibold text-amber-900"
                                        placeholder="0"
                                        min="0"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {durationSummary.extraMinutes > 0 && (
                                <div className="grid gap-2 md:grid-cols-[0.8fr_1fr_1fr]">
                                  <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                                    <div className="text-[10px] font-semibold uppercase text-amber-700">Extra Hours</div>
                                    <div className="mt-0.5 text-sm font-bold text-amber-900">{durationSummary.extraLabel}</div>
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-[11px] font-semibold text-gray-700">Charge Extra Hours?</label>
                                    <select
                                      value={chargeExtraHours ? 'yes' : 'no'}
                                      onChange={(e) => setChargeExtraHours(e.target.value === 'yes')}
                                      className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="no">No</option>
                                      <option value="yes">Yes</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-[11px] font-semibold text-gray-700">Extra Hour Rate</label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-600">Rs.</span>
                                      <Input
                                        type="number"
                                        value={extraHourRate || ''}
                                        onChange={(e) => setExtraHourRate(Number(e.target.value))}
                                        className="pl-12 text-sm font-semibold text-amber-900"
                                        placeholder="0"
                                        min="0"
                                        disabled={!chargeExtraHours}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-1.5 border-t border-slate-200 pt-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-600">Venue Rental</span>
                                  <span className="font-semibold text-slate-900">{formatCurrencyPKR(venueRentalCharges)}</span>
                                </div>
                                {guestShortfall > 0 && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Shortfall ({guestShortfall} × {formatCurrencyPKR(perHeadRate)})</span>
                                    <span className="font-semibold text-amber-900">{formatCurrencyPKR(minimumGuaranteeShortfallAmount)}</span>
                                  </div>
                                )}
                                {chargeExtraHours && durationSummary.extraMinutes > 0 && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Extra Hour Charge</span>
                                    <span className="font-semibold text-amber-900">{formatCurrencyPKR(extraHourCharge)}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 text-sm">
                                  <span className="font-semibold text-slate-900">Total</span>
                                  <span className="font-bold text-blue-900">{formatCurrencyPKR(venueCharges)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                )}

              {/* VENUE SELECTION */}
              {false && activeSection === 'venue-selection' && (
                <div className="bg-white rounded-lg border border-gray-300 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="size-5 text-blue-600" />
                    Venue Selection
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Prime Venue *</label>
                      <select
                        value={selectedVenueId}
                        onChange={(e) => {
                          setSelectedVenueId(e.target.value);
                          setSelectedPrimeSpaceId('');
                          setSelectedSubSpaceId('');
                          setPrimarySpaceUsageLabel('');
                          setAdditionalSpaceAssignments([]);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Venue</option>
                        {venues.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Prime Space *</label>
                      <select
                        value={selectedPrimeSpaceId}
                        onChange={(e) => {
                          setSelectedPrimeSpaceId(e.target.value);
                          setSelectedSubSpaceId('');
                          setPrimarySpaceUsageLabel('');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        disabled={!selectedVenueId}
                      >
                        <option value="">Select Prime Space</option>
                        {primeSpaces
                          .filter(ps => ps.venueId === selectedVenueId)
                          .map(ps => (
                            <option key={ps.id} value={ps.id}>{ps.name}</option>
                          ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Sub Space (Optional)</label>
                      <select
                        value={selectedSubSpaceId}
                        onChange={(e) => setSelectedSubSpaceId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        disabled={!selectedPrimeSpaceId}
                      >
                        <option value="">None (Full Prime Space)</option>
                        {selectedPrimeSpace?.subSpaces?.map(ss => (
                          <option key={ss.id} value={ss.id}>{ss.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Venue Mode</label>
                      <select
                        value={venueMode}
                        onChange={(e) => setVenueMode(e.target.value as 'Full' | 'Half')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Full">Full</option>
                        <option value="Half">Half</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Check className="size-4 mr-2" />
                      Check Availability
                    </Button>
                  </div>

                  {selectedVenueId && selectedPrimeSpaceId && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-xs">
                      <div className="flex items-center gap-2 text-green-800 font-semibold">
                        <Check className="size-4" />
                        Venue Available for Selected Date & Time
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* FOOD & CATERING */}
              {activeSection === 'guest-menu' && (
                <MenuManagement
                  guaranteedGuests={guaranteedGuests}
                  onGuaranteedGuestsChange={handleTotalGuestsChange}
                  onMenuSnapshotChange={handleMenuSnapshotChange}
                  initialSnapshot={menuSelection}
                  kitchenDishes={kitchenDishes}
                  kitchenDishCategories={kitchenDishCategories}
                  kitchenMenuPackages={kitchenMenuPackages}
                />
              )}

              {/* FOOD SUPPLIES */}
              {activeSection === 'food-supplies' && (
                <div className="bg-white rounded-lg border border-gray-300 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="size-5 text-blue-600" />
                    Food Supplies
                  </h2>
                  
                  <div className="mb-3 text-xs text-gray-600">Quantity-based catering items only. These do not affect per-head menu pricing.</div>

                  <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-3">
                    <div className="grid gap-2 md:grid-cols-[minmax(0,1.45fr)_150px_80px_90px_110px_120px_90px]">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Food Supply Item</label>
                        <select
                          value={
                            foodSupplyDraft.kitchenItemId ||
                            (editingFoodSupplyIndex !== null && foodSupplyDraft.item ? FOOD_SUPPLY_LEGACY_DRAFT_ID : '')
                          }
                          onChange={(e) => {
                            markActiveSectionDirty();
                            const selectedItem = foodSupplyKitchenItemById.get(e.target.value);
                            if (!selectedItem) {
                              setFoodSupplyDraft({ item: '', quantity: 0, unit: '', rate: 0 });
                              return;
                            }

                            setFoodSupplyDraft((current) =>
                              normalizeFoodSupplyLineFromKitchenItem(
                                selectedItem,
                                safeNumber(current.quantity) || 1,
                                getFoodSupplyDishRate(selectedItem),
                              ),
                            );
                          }}
                          className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select active Banquet Kitchen item</option>
                          {editingFoodSupplyIndex !== null && foodSupplyDraft.item && !foodSupplyDraft.kitchenItemId && (
                            <option value={FOOD_SUPPLY_LEGACY_DRAFT_ID} disabled>
                              Saved legacy item: {foodSupplyDraft.item}
                            </option>
                          )}
                          {foodSupplyDraft.kitchenItemId && !activeFoodSupplyKitchenItems.some((item) => item.id === foodSupplyDraft.kitchenItemId) && (
                            <option value={foodSupplyDraft.kitchenItemId} disabled>
                              Saved inactive item: {foodSupplyDraft.item}
                            </option>
                          )}
                          {activeFoodSupplyKitchenItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.dishName} - {getFoodSupplyDishUnit(item) || 'unit'} - {formatCurrencyPKR(getFoodSupplyDishRate(item))}
                            </option>
                          ))}
                        </select>
                        <div className="mt-1 text-[10px] text-gray-500">
                          {foodSupplyDraft.kitchenItemId
                            ? `Kitchen item: ${foodSupplyDraft.itemCode || foodSupplyDraft.kitchenItemId}`
                            : 'Only active Banquet Kitchen items marked for Food Supplies are available for new rows.'}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Variant</label>
                        <select
                          value={foodSupplyDraft.variantId || ''}
                          disabled={!selectedFoodSupplyDish}
                          onChange={(e) => {
                            if (!selectedFoodSupplyDish) {
                              return;
                            }

                            const nextVariantId = e.target.value || undefined;
                            markActiveSectionDirty();
                            setFoodSupplyDraft((current) => ({
                              ...current,
                              variantId: nextVariantId,
                              variantLabel: getFoodSupplyDishVariantLabel(selectedFoodSupplyDish, nextVariantId),
                              unit: getFoodSupplyDishUnit(selectedFoodSupplyDish, nextVariantId),
                              rate: getFoodSupplyDishRate(selectedFoodSupplyDish, nextVariantId),
                              costRate: getFoodSupplyDishCostRate(selectedFoodSupplyDish, nextVariantId),
                            }));
                          }}
                          className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        >
                          <option value="">{selectedFoodSupplyDish ? 'Select variant' : 'Select item first'}</option>
                          {selectedFoodSupplyVariants.map((variant) => (
                            <option key={variant.id} value={variant.id}>
                              {(variant.label || variant.variantLabel || 'Default')} - {variant.salesUnit} - {formatCurrencyPKR(variant.sellingPrice || 0)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Qty</label>
                        <Input
                          type="number"
                          value={foodSupplyDraft.quantity || ''}
                          onChange={(e) => {
                            markActiveSectionDirty();
                            setFoodSupplyDraft((current) => ({ ...current, quantity: Number(e.target.value) }));
                          }}
                          className="h-9 text-right text-xs"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Unit</label>
                        <Input
                          value={foodSupplyDraft.unit}
                          onChange={(e) => {
                            markActiveSectionDirty();
                            setFoodSupplyDraft((current) => ({ ...current, unit: e.target.value }));
                          }}
                          placeholder="kg"
                          className="h-9 text-xs"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Rate</label>
                        <Input
                          type="number"
                          value={foodSupplyDraft.rate || ''}
                          onChange={(e) => {
                            markActiveSectionDirty();
                            setFoodSupplyDraft((current) => ({ ...current, rate: Number(e.target.value) }));
                          }}
                          className="h-9 text-right text-xs"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Total</label>
                        <div className="flex h-9 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900">
                          {formatCurrencyPKR(safeNumber(foodSupplyDraft.quantity) * safeNumber(foodSupplyDraft.rate))}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Action</label>
                        <Button
                          onClick={() => {
                            const selectedKitchenItem = foodSupplyDraft.kitchenItemId
                              ? foodSupplyKitchenItemById.get(foodSupplyDraft.kitchenItemId)
                              : undefined;
                            const isEditingLegacySavedLine =
                              editingFoodSupplyIndex !== null &&
                              !foodSupplyDraft.kitchenItemId &&
                              Boolean(foodSupplyDraft.item.trim());

                            if ((!selectedKitchenItem && !isEditingLegacySavedLine) || safeNumber(foodSupplyDraft.quantity) <= 0) {
                              alert('Select an active Banquet Kitchen food supply item and enter quantity.');
                              return;
                            }
                            markActiveSectionDirty();
                            const nextLine = selectedKitchenItem
                              ? {
                                  ...normalizeFoodSupplyLineFromKitchenItem(
                                    selectedKitchenItem,
                                    safeNumber(foodSupplyDraft.quantity),
                                    foodSupplyDraft.rate === undefined
                                      ? getFoodSupplyDishRate(selectedKitchenItem, foodSupplyDraft.variantId)
                                      : safeNumber(foodSupplyDraft.rate),
                                    foodSupplyDraft.variantId,
                                  ),
                                  variantId: foodSupplyDraft.variantId,
                                  variantLabel:
                                    foodSupplyDraft.variantLabel || getFoodSupplyDishVariantLabel(selectedKitchenItem, foodSupplyDraft.variantId),
                                  unit: foodSupplyDraft.unit || getFoodSupplyDishUnit(selectedKitchenItem, foodSupplyDraft.variantId),
                                  costRate: foodSupplyDraft.costRate === undefined
                                    ? getFoodSupplyDishCostRate(selectedKitchenItem, foodSupplyDraft.variantId)
                                    : safeNumber(foodSupplyDraft.costRate),
                                }
                              : normalizeFoodSupplyLine(foodSupplyDraft, foodSupplyKitchenItemById, legacyFoodSupplyMasterById);

                            if (editingFoodSupplyIndex !== null) {
                              const updated = [...foodSupplies];
                              updated[editingFoodSupplyIndex] = nextLine;
                              setFoodSupplies(updated);
                            } else {
                              setFoodSupplies([...foodSupplies, nextLine]);
                            }

                            setFoodSupplyDraft({ item: '', quantity: 0, unit: '', rate: 0 });
                            setEditingFoodSupplyIndex(null);
                          }}
                          size="sm"
                          className="h-9 w-full bg-blue-600 text-xs text-white hover:bg-blue-700"
                        >
                          {editingFoodSupplyIndex !== null ? 'Update' : 'Add'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Item</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Qty</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Unit</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Rate (Rs.)</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Total (Rs.)</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {foodSupplies.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-gray-500">
                            No food supplies added yet.
                          </td>
                        </tr>
                      )}
                      {foodSupplies.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2 px-3">
                            <div className="font-medium text-gray-900">{getFoodSupplyLineName(item)}</div>
                            {(item.kitchenItemId || item.masterItemId) && (
                              <div className="text-[10px] text-gray-500">
                                {item.kitchenItemId
                                  ? `Kitchen: ${item.itemCode || item.kitchenItemId}`
                                  : `Legacy: ${item.itemCode || item.masterItemId}`}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">{safeNumber(item.quantity)}</td>
                          <td className="py-2 px-3">{item.unit || '—'}</td>
                          <td className="py-2 px-3 text-right">{formatCurrencyPKR(item.rate)}</td>
                          <td className="py-2 px-3 text-right font-semibold">
                            {formatCurrencyPKR(safeNumber(item.quantity) * safeNumber(item.rate))}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setFoodSupplyDraft(normalizeFoodSupplyLine(item, foodSupplyKitchenItemById, legacyFoodSupplyMasterById));
                                  setEditingFoodSupplyIndex(index);
                                }}
                                className="p-1.5 hover:bg-blue-100 rounded transition-colors text-blue-600 hover:text-blue-700"
                                title="Edit Item"
                              >
                                <Edit2 className="size-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  markActiveSectionDirty();
                                  const updated = foodSupplies.filter((_, i) => i !== index);
                                  setFoodSupplies(updated);
                                  if (editingFoodSupplyIndex === index) {
                                    setFoodSupplyDraft({ item: '', quantity: 0, unit: '', rate: 0 });
                                    setEditingFoodSupplyIndex(null);
                                  }
                                }}
                                className="p-1.5 hover:bg-red-100 rounded transition-colors text-red-600 hover:text-red-700"
                                title="Remove Item"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold">
                        <td colSpan={5} className="py-2 px-3 text-right">Food Supplies Total:</td>
                        <td className="py-2 px-3 text-right text-blue-900">{formatCurrencyPKR(foodSuppliesTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>

                </div>
              )}

              {/* VENUE CHARGES - SUPPORT CATERING SERVICES */}
              {false && activeSection === 'venue-charges' && (
                <div className="bg-white rounded-lg border border-gray-300 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="size-5 text-blue-600" />
                    Venue Charges
                  </h2>

                  {/* Venue Selection Display & Charges Input */}
                  <div className="mb-6 border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                    {/* Compact Venue Selection - One Line */}
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-300">
                      <MapPin className="size-4 text-blue-600 flex-shrink-0" />
                      <div className="flex items-center gap-2 flex-1 text-sm">
                        <span className="font-bold text-gray-900">{selectedVenue?.name || '—'}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-semibold text-gray-700">
                          {selectedSubSpace?.spaceName || selectedPrimeSpace?.spaceName || '—'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ml-2 ${
                          venueMode === 'Full' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {venueMode}
                        </span>
                      </div>
                    </div>

                    {/* Venue Charges Input */}
                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                          Venue Rental Charges
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm font-semibold">
                            Rs.
                          </span>
                          <Input
                            type="number"
                            value={venueCharges || ''}
                            onChange={(e) => setVenueRentalCharges(Number(e.target.value))}
                            className="pl-12 text-lg font-bold text-blue-900"
                            placeholder="0"
                            min="0"
                          />
                        </div>
                      </div>
                      {venueCharges > 0 && (
                        <div className="px-4 py-2 bg-blue-100 border-2 border-blue-300 rounded">
                          <div className="text-xs text-blue-700 font-semibold">Total</div>
                          <div className="text-lg font-bold text-blue-900">
                            {formatCurrencyPKR(venueCharges)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Support Catering Services Panel */}
                  <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50/30">
                    <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="size-4 text-blue-600" />
                      Support Catering Services
                    </h3>
                    <div className="text-xs text-gray-600 mb-3">
                      Optional consumable service items for Venue Only bookings
                    </div>

                    {/* Item Selection Dropdown */}
                    <div className="mb-4 flex gap-2 bg-white p-3 rounded border border-gray-300">
                      <select
                        value={selectedSupportCateringId}
                        onChange={(e) => setSelectedSupportCateringId(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Support Catering Item to Add</option>
                        {activeSupportCateringItems.map((item: any) => (
                          <option key={item.id} value={item.id}>
                                {getSupportItemName(item)} - {getSupportItemPricingType(item)} - {formatCurrencyPKR(getSupportItemRate(item))}
                            {item.inventoryLinked ? ' [Inventory]' : ''}
                            {item.kitchenLinked ? ' [Kitchen]' : ''}
                          </option>
                        ))}
                      </select>
                      <Button
                        onClick={() => {
                          if (selectedSupportCateringId) {
                            const item = activeSupportCateringItems.find((i: any) => i.id === selectedSupportCateringId);
                            if (item) {
                              // Check if item already added
                              const exists = selectedSupportCatering.find(s => s.id === item.id);
                              if (exists) {
                                alert('This item is already added');
                                return;
                              }
                              markActiveSectionDirty();
                              setSelectedSupportCatering([
                                ...selectedSupportCatering,
                                {
                                  id: item.id,
                                  itemName: getSupportItemName(item),
                                  pricingType: getSupportItemPricingType(item),
                                  quantity: 1,
                                  rate: getSupportItemRate(item),
                                  inventoryLinked: item.inventoryLinked,
                                  kitchenLinked: item.kitchenLinked,
                                },
                              ]);
                              setSelectedSupportCateringId('');
                            }
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                      >
                        <Plus className="size-4 mr-1" />
                        Add Item
                      </Button>
                    </div>

                    {/* Selected Items Table */}
                    <table className="w-full text-xs border-collapse bg-white">
                      <thead>
                        <tr className="bg-gray-100 border-b">
                          <th className="text-left py-2 px-3 font-semibold text-gray-700">Item Name</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-700">Pricing Type</th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-700">Qty/Guests</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-700">Rate (Rs.)</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-700">Total (Rs.)</th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-700">Links</th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSupportCatering.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-4 text-center text-gray-500">
                              No support catering items added yet. Select from the dropdown above.
                            </td>
                          </tr>
                        )}
                        {selectedSupportCatering.map((item, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3 font-medium">{item.itemName}</td>
                            <td className="py-2 px-3">
                              <select
                                value={item.pricingType}
                                onChange={(e) => {
                                  const updated = [...selectedSupportCatering];
                                  updated[index].pricingType = e.target.value;
                                  setSelectedSupportCatering(updated);
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              >
                                <option value="Per Head">Per Head</option>
                                <option value="Per Quantity">Per Quantity</option>
                                <option value="Per Plate">Per Plate</option>
                                <option value="Per Kg">Per Kg</option>
                                <option value="Per Counter">Per Counter</option>
                                <option value="Per Hour">Per Hour</option>
                                <option value="Per Staff">Per Staff</option>
                              </select>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <Input
                                type="number"
                                value={item.quantity || ''}
                                onChange={(e) => {
                                  const updated = [...selectedSupportCatering];
                                  updated[index].quantity = Number(e.target.value);
                                  setSelectedSupportCatering(updated);
                                }}
                                className="w-20 text-center text-xs mx-auto"
                                min="1"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                value={item.rate || ''}
                                onChange={(e) => {
                                  const updated = [...selectedSupportCatering];
                                  updated[index].rate = Number(e.target.value);
                                  setSelectedSupportCatering(updated);
                                }}
                                className="w-24 text-right text-xs ml-auto"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-semibold">
                              {formatCurrencyPKR(item.quantity * item.rate)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex gap-1 justify-center">
                                {item.inventoryLinked && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-semibold" title="Inventory Linked">
                                    INV
                                  </span>
                                )}
                                {item.kitchenLinked && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-semibold" title="Kitchen Linked">
                                    KIT
                                  </span>
                                )}
                                {!item.inventoryLinked && !item.kitchenLinked && (
                                  <span className="text-gray-400 text-xs">—</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                onClick={() => {
                                  markActiveSectionDirty();
                                  const updated = selectedSupportCatering.filter((_, i) => i !== index);
                                  setSelectedSupportCatering(updated);
                                }}
                                className="p-1.5 hover:bg-red-100 rounded transition-colors text-red-600 hover:text-red-700"
                                title="Remove Item"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-blue-50 font-bold border-t-2">
                          <td colSpan={4} className="py-2 px-3 text-right">Support Catering Total:</td>
                        <td className="py-2 px-3 text-right text-blue-900">{formatCurrencyPKR(supportCateringTotal)}</td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* RCS SERVICES */}
              {activeSection === 'rcs-services' && (
                <div className="bg-white rounded-lg border border-gray-300 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="size-5 text-blue-600" />
                    RCS Services
                  </h2>

                  <div className="mb-4 flex gap-2 rounded-md bg-gray-100 p-1">
                    {(['In-house', 'Outsource'] as const).map((source) => (
                      <button
                        key={source}
                        type="button"
                        onClick={() => {
                          setRcsServiceSource(source);
                          setEditingRCSIndex(null);
                        }}
                        className={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${
                          rcsServiceSource === source ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span>{source}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            {source === 'In-house' ? inHouseRCSServices.length : outsourcedRCSServices.length}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="mb-3 text-[11px] text-gray-500">
                    {rcsSourceSummaryText}
                  </div>

                  {rcsServiceSource === 'In-house' && (
                    <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div className="grid gap-2 md:grid-cols-[minmax(130px,0.8fr)_minmax(0,1.4fr)_80px_110px_120px_90px]">
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Category</label>
                          <select
                            value={inHouseCategoryId}
                            onChange={(e) => {
                              const nextCategoryId = e.target.value;
                              const currentService = selectedServiceId ? masterRCSServiceMap.get(selectedServiceId) : undefined;
                              setInHouseCategoryId(nextCategoryId);
                              if (nextCategoryId && currentService?.categoryId !== nextCategoryId) {
                                setSelectedServiceId('');
                                setInHouseServiceSearch('');
                                setInHouseRate(0);
                              }
                            }}
                            className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">All categories</option>
                            {inHouseRCSCategoryOptions.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Service</label>
                          <select
                            value={selectedServiceId}
                            onChange={(e) => {
                              const service = e.target.value ? masterRCSServiceMap.get(e.target.value) : undefined;
                              setSelectedServiceId(service?.id || '');
                              setInHouseServiceSearch(service ? getRCSServiceName(service) : '');
                              setInHouseRate(service ? getRCSServiceRate(service) : 0);
                              if (service?.categoryId) {
                                setInHouseCategoryId(service.categoryId);
                              }
                            }}
                            className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select setup service</option>
                            {selectedServiceId && !inHouseRCSServices.some((service: any) => service.id === selectedServiceId) && (
                              <option value={selectedServiceId} disabled>
                                Saved inactive service: {inHouseServiceSearch}
                              </option>
                            )}
                            {filteredInHouseRCSServices.map((service: any) => (
                              <option key={service.id} value={service.id}>
                                {!inHouseCategoryId ? `${getRCSCategoryName(service, masterRCSCategoryMap)} / ` : ''}
                                {getRCSServiceName(service)} - {formatCurrencyPKR(getRCSServiceRate(service))}
                              </option>
                            ))}
                          </select>
                          {selectedServiceId ? (
                            <div className="mt-1 text-[10px] text-gray-500">
                              Category: {getRCSCategoryName(masterRCSServiceMap.get(selectedServiceId), masterRCSCategoryMap)} | Unit: {masterRCSServiceMap.get(selectedServiceId)?.unitType || 'event'}
                            </div>
                          ) : editingRCSIndex !== null && selectedRCSServices[editingRCSIndex]?.source === 'In-house' ? (
                            <div className="mt-1 text-[10px] text-amber-700">
                              Saved manual service: {selectedRCSServices[editingRCSIndex]?.serviceName}
                            </div>
                          ) : (
                            <div className="mt-1 text-[10px] text-gray-500">
                              {filteredInHouseRCSServices.length} setup services available
                            </div>
                          )}
                          {filteredInHouseRCSServices.length === 0 ? (
                            <div className="mt-1 text-[10px] text-amber-700">
                              No in-house setup services match this category. Check the `Outsource` tab for outsourced services from RCS Setup.
                            </div>
                          ) : null}
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Qty</label>
                          <Input type="number" value={inHouseQty || ''} onChange={(e) => setInHouseQty(Number(e.target.value))} className="h-9 text-xs text-center" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Rate</label>
                          <Input type="number" value={inHouseRate || ''} onChange={(e) => setInHouseRate(Number(e.target.value))} className="h-9 text-xs text-right" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Total</label>
                          <div className="flex h-9 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900">
                            {formatCurrencyPKR(safeNumber(inHouseQty) * safeNumber(inHouseRate))}
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Action</label>
                          <Button
                            onClick={() => {
                              const legacyEditingEntry =
                                editingRCSIndex !== null ? selectedRCSServices[editingRCSIndex] : undefined;
                              if (!selectedServiceId && !legacyEditingEntry) {
                                alert('Select an active in-house RCS service from setup.');
                                return;
                              }
                              const service =
                                inHouseRCSServices.find((s: any) => s.id === selectedServiceId) ||
                                (editingRCSIndex !== null ? masterRCSServiceMap.get(selectedServiceId) : undefined);
                              if (!service && !legacyEditingEntry) {
                                alert('Select an active in-house RCS service from setup.');
                                return;
                              }
                              markActiveSectionDirty();

                              const nextEntry = service
                                ? buildRcsEntryFromMasterService({
                                    service,
                                    quantity: inHouseQty || 0,
                                    price: inHouseRate || 0,
                                    existingId: editingRCSIndex !== null ? selectedRCSServices[editingRCSIndex]?.id : undefined,
                                  })
                                : normalizeRcsEntry({
                                    ...legacyEditingEntry,
                                    quantity: inHouseQty || 0,
                                    price: inHouseRate || 0,
                                  });

                              if (editingRCSIndex !== null) {
                                const updated = [...selectedRCSServices];
                                updated[editingRCSIndex] = nextEntry;
                                setSelectedRCSServices(updated);
                              } else {
                                setSelectedRCSServices([...selectedRCSServices, nextEntry]);
                              }

                              setSelectedServiceId('');
                              setInHouseServiceSearch('');
                              setInHouseQty(1);
                              setInHouseRate(0);
                              setEditingRCSIndex(null);
                            }}
                            size="sm"
                            className="h-9 w-full bg-blue-600 text-xs text-white hover:bg-blue-700"
                          >
                            {editingRCSIndex !== null ? 'Update' : 'Add'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {rcsServiceSource === 'Outsource' && (
                    <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div className="grid gap-2 md:grid-cols-[minmax(130px,0.8fr)_minmax(0,1.3fr)_minmax(150px,1fr)_minmax(150px,1fr)]">
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Category</label>
                          <select
                            value={outsourceDraft.categoryId}
                            onChange={(e) => {
                              const nextCategoryId = e.target.value;
                              setOutsourceDraft((current) => {
                                const currentService = current.masterServiceId ? masterRCSServiceMap.get(current.masterServiceId) : undefined;
                                if (nextCategoryId && currentService?.categoryId !== nextCategoryId) {
                                  return {
                                    ...current,
                                    categoryId: nextCategoryId,
                                    masterServiceId: '',
                                    serviceName: '',
                                    unitType: '',
                                    costRate: 0,
                                    sellingRate: 0,
                                  };
                                }
                                return { ...current, categoryId: nextCategoryId };
                              });
                            }}
                            className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">All categories</option>
                            {outsourcedRCSCategoryOptions.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Service</label>
                          <select
                            value={outsourceDraft.masterServiceId}
                            onChange={(e) => {
                              const matchedService = masterRCSServiceMap.get(e.target.value);
                              const preferredRate = matchedService
                                ? preferredRCSVendorRateByServiceId.get(matchedService.id)
                                : undefined;
                              const preferredVendor = preferredRate?.vendorId ? masterRCSVendorMap.get(preferredRate.vendorId) : undefined;

                              setOutsourceDraft((current) => ({
                                ...current,
                                categoryId: matchedService?.categoryId || current.categoryId,
                                masterServiceId: matchedService?.id || '',
                                serviceName: matchedService ? getRCSServiceName(matchedService) : '',
                                unitType: matchedService?.unitType || '',
                                vendorName: preferredVendor?.vendorName || current.vendorName,
                                sellingRate: matchedService
                                  ? safeNumber(preferredRate?.sellingPrice) || getRCSServiceRate(matchedService)
                                  : 0,
                                costRate: matchedService
                                  ? safeNumber(preferredRate?.vendorPrice) || getRcsServiceCostRate(matchedService)
                                  : 0,
                              }));
                            }}
                            className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select active outsourced service</option>
                            {outsourceDraft.masterServiceId && !outsourcedRCSServices.some((service: any) => service.id === outsourceDraft.masterServiceId) && (
                              <option value={outsourceDraft.masterServiceId} disabled>
                                Saved inactive service: {outsourceDraft.serviceName}
                              </option>
                            )}
                            {filteredOutsourcedRCSServices.map((service: any) => (
                              <option key={service.id} value={service.id}>
                                {!outsourceDraft.categoryId ? `${getRCSCategoryName(service, masterRCSCategoryMap)} / ` : ''}
                                {getRCSServiceName(service)} - {formatCurrencyPKR(getRCSServiceRate(service))}
                              </option>
                            ))}
                          </select>
                          {outsourceDraft.masterServiceId && (
                            <div className="mt-1 text-[10px] text-gray-500">
                              Category: {getRCSCategoryName(masterRCSServiceMap.get(outsourceDraft.masterServiceId), masterRCSCategoryMap)} | Unit: {outsourceDraft.unitType || 'event'}
                            </div>
                          )}
                          {filteredOutsourcedRCSServices.length === 0 ? (
                            <div className="mt-1 text-[10px] text-amber-700">
                              No outsourced setup services match this category. Check the `In-house` tab for in-house services from RCS Setup.
                            </div>
                          ) : null}
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Vendor Name</label>
                          <Input value={outsourceDraft.vendorName} onChange={(e) => setOutsourceDraft((current) => ({ ...current, vendorName: e.target.value }))} className="h-9 text-xs" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Notes</label>
                          <Input value={outsourceDraft.notes} onChange={(e) => setOutsourceDraft((current) => ({ ...current, notes: e.target.value }))} className="h-9 text-xs" />
                        </div>
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-[80px_110px_110px_120px_90px]">
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Qty</label>
                          <Input type="number" value={outsourceDraft.quantity || ''} onChange={(e) => setOutsourceDraft((current) => ({ ...current, quantity: Number(e.target.value) }))} className="h-9 text-xs text-center" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Vendor Cost</label>
                          <Input type="number" value={outsourceDraft.costRate || ''} onChange={(e) => setOutsourceDraft((current) => ({ ...current, costRate: Number(e.target.value) }))} className="h-9 text-xs text-right" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Selling Rate</label>
                          <Input type="number" value={outsourceDraft.sellingRate || ''} onChange={(e) => setOutsourceDraft((current) => ({ ...current, sellingRate: Number(e.target.value) }))} className="h-9 text-xs text-right" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Total</label>
                          <div className="flex h-9 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900">
                            {formatCurrencyPKR(safeNumber(outsourceDraft.quantity) * safeNumber(outsourceDraft.sellingRate))}
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-600">Action</label>
                          <Button
                            onClick={() => {
                              const matchedService = outsourceDraft.masterServiceId
                                ? masterRCSServiceMap.get(outsourceDraft.masterServiceId)
                                : undefined;
                              const isEditingLegacySavedLine =
                                editingRCSIndex !== null &&
                                !outsourceDraft.masterServiceId &&
                                Boolean(outsourceDraft.serviceName.trim());

                              if (!matchedService && !isEditingLegacySavedLine) {
                                alert('Select an active outsourced RCS service from setup.');
                                return;
                              }
                              markActiveSectionDirty();
                              const nextEntry = matchedService
                                ? buildRcsEntryFromMasterService({
                                    service: matchedService,
                                    quantity: outsourceDraft.quantity || 0,
                                    price: outsourceDraft.sellingRate || 0,
                                    vendorName: outsourceDraft.vendorName.trim(),
                                    costRate: outsourceDraft.costRate || 0,
                                    notes: outsourceDraft.notes,
                                    existingId: editingRCSIndex !== null ? selectedRCSServices[editingRCSIndex]?.id : undefined,
                                  })
                                : normalizeRcsEntry({
                                    id: editingRCSIndex !== null ? selectedRCSServices[editingRCSIndex]?.id : undefined,
                                    source: 'Outsource',
                                    serviceName: outsourceDraft.serviceName.trim(),
                                    quantity: outsourceDraft.quantity || 0,
                                    price: outsourceDraft.sellingRate || 0,
                                    vendorName: outsourceDraft.vendorName.trim(),
                                    costRate: outsourceDraft.costRate || 0,
                                    notes: outsourceDraft.notes.trim(),
                                  });

                              if (editingRCSIndex !== null) {
                                const updated = [...selectedRCSServices];
                                updated[editingRCSIndex] = nextEntry;
                                setSelectedRCSServices(updated);
                              } else {
                                setSelectedRCSServices([...selectedRCSServices, nextEntry]);
                              }

                              setOutsourceDraft({
                                categoryId: outsourceDraft.categoryId,
                                masterServiceId: '',
                                vendorName: '',
                                serviceName: '',
                                unitType: '',
                                quantity: 1,
                                costRate: 0,
                                sellingRate: 0,
                                notes: '',
                              });
                              setEditingRCSIndex(null);
                            }}
                            size="sm"
                            className="h-9 w-full bg-blue-600 text-xs text-white hover:bg-blue-700"
                          >
                            {editingRCSIndex !== null ? 'Update' : 'Add'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Source</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Category</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Service</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Qty</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Rate (Rs.)</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Total (Rs.)</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRCSServices.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-4 text-center text-gray-500">
                            No RCS services added yet.
                          </td>
                        </tr>
                      )}
                      {selectedRCSServices.map((item, index) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3">{item.source}</td>
                          <td className="py-2 px-3 text-gray-700">{item.categoryName || '-'}</td>
                          <td className="py-2 px-3">
                            <div className="font-medium text-gray-900">{item.serviceName}</div>
                            <div className="text-[10px] text-gray-500">
                              {[item.unitType ? `Unit: ${item.unitType}` : '', item.commissionRuleName ? `Commission: ${item.commissionRuleName}` : '']
                                .filter(Boolean)
                                .join(' | ')}
                            </div>
                            {item.source === 'Outsource' && item.vendorName && (
                              <div className="text-[10px] text-gray-500">Vendor: {item.vendorName}</div>
                            )}
                            {item.notes && (
                              <div className="text-[10px] text-gray-500">Note: {item.notes}</div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">{safeNumber(item.quantity)}</td>
                          <td className="py-2 px-3 text-right">{formatCurrencyPKR(item.price)}</td>
                          <td className="py-2 px-3 text-right font-semibold">{formatCurrencyPKR(safeNumber(item.quantity) * safeNumber(item.price))}</td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingRCSIndex(index);
                                  setRcsServiceSource(item.source);
                                  if (item.source === 'In-house') {
                                    setInHouseCategoryId(item.categoryId || '');
                                    setSelectedServiceId(item.masterServiceId || '');
                                    setInHouseServiceSearch(item.serviceName);
                                    setInHouseQty(item.quantity);
                                    setInHouseRate(item.price);
                                  } else if (item.source === 'Outsource') {
                                    setOutsourceDraft({
                                      categoryId: item.categoryId || '',
                                      masterServiceId: item.masterServiceId || '',
                                      vendorName: item.vendorName || '',
                                      serviceName: item.serviceName,
                                      unitType: item.unitType || '',
                                      quantity: item.quantity,
                                      costRate: item.costRate || 0,
                                      sellingRate: item.price,
                                      notes: item.notes || '',
                                    });
                                  }
                                }}
                                className="p-1.5 hover:bg-blue-100 rounded transition-colors text-blue-600 hover:text-blue-700"
                                title="Edit Service"
                              >
                                <Edit2 className="size-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  markActiveSectionDirty();
                                  setSelectedRCSServices(selectedRCSServices.filter((_, i) => i !== index));
                                  if (editingRCSIndex === index) setEditingRCSIndex(null);
                                }}
                                className="p-1.5 hover:bg-red-100 rounded transition-colors text-red-600 hover:text-red-700"
                                title="Remove Service"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold">
                        <td colSpan={5} className="py-2 px-3 text-right">RCS Services Total:</td>
                        <td className="py-2 px-3 text-right text-blue-900">{formatCurrencyPKR(rcsTotal)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* SETUP & INTEGRATIONS */}
              {activeSection === 'setup-integrations' && (
                <div className="bg-white rounded-lg border border-gray-300 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Link2 className="size-5 text-blue-600" />
                    Setup & Integrations
                  </h2>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded">
                      <Check className="size-5 text-green-600" />
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900">Menu linked with Kitchen Module</div>
                        <div className="text-xs text-gray-600">Real-time menu pricing and availability</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded">
                      <Check className="size-5 text-green-600" />
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900">Services linked with Reservation Setup</div>
                        <div className="text-xs text-gray-600">Automated service pricing from database</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded">
                      <Check className="size-5 text-green-600" />
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900">Payments linked with Accounts Module</div>
                        <div className="text-xs text-gray-600">Double-entry accounting integration</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded">
                      <Check className="size-5 text-green-600" />
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900">Customer history linked with CRM Module</div>
                        <div className="text-xs text-gray-600">Complete customer relationship tracking</div>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 mb-3">Customer Event History</h3>
                  <table className="w-full text-xs border-collapse mb-4">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Date</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Event Type</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Venue</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Guests</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Booking Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-3">Jan 15, 2025</td>
                        <td className="py-2 px-3">Wedding</td>
                        <td className="py-2 px-3">Aiwan-e-Akbari</td>
                        <td className="py-2 px-3 text-right">500</td>
                        <td className="py-2 px-3 text-right">Rs. 350,000</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3">Mar 22, 2024</td>
                        <td className="py-2 px-3">Mehndi</td>
                        <td className="py-2 px-3">Taj Mahal</td>
                        <td className="py-2 px-3 text-right">300</td>
                        <td className="py-2 px-3 text-right">Rs. 250,000</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="text-xs text-gray-600">Total Events Referred</div>
                      <div className="text-xl font-bold text-blue-900">5</div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="text-xs text-gray-600">Total Revenue Generated</div>
                      <div className="text-xl font-bold text-blue-900">Rs. 1,200,000</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ADDITIONAL CHARGES */}
              {activeSection === 'misc-charges' && (
                <div className="bg-white rounded-lg border border-gray-300 p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                      <DollarSign className="size-5 text-blue-600" />
                      Additional Charges
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button onClick={openAddAdditionalCharge} size="sm" className="h-8 text-xs">
                        <Plus className="mr-1 size-3" />
                        Add Charge
                      </Button>
                      <Button
                        onClick={() => setShowChargeTypeManager((current) => !current)}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                      >
                        Manage Charge List
                      </Button>
                    </div>
                  </div>

                  {showAdditionalChargeDraft && (
                    <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-900">
                        {editingAdditionalChargeId ? 'Edit Charge' : 'Add Charge'}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                        <div className="xl:col-span-2">
                          <label className="mb-1 block text-xs font-medium text-gray-700">Charge Type</label>
                          <select
                            value={additionalChargeDraft.additionalChargeTypeId}
                            onChange={(event) => handleAdditionalChargeTypeSelect(event.target.value)}
                            className="h-9 w-full rounded border border-gray-300 bg-white px-2 text-sm text-gray-700"
                          >
                            <option value="">Select charge type</option>
                            {additionalChargeDraftTypeOptions.map((chargeType) => (
                              <option key={chargeType.id} value={chargeType.id}>
                                {chargeType.name}{chargeType.isActive ? '' : ' (Inactive)'}
                              </option>
                            ))}
                            <option value={ADDITIONAL_CHARGE_CUSTOM_TYPE_ID}>Other / Custom Charge</option>
                          </select>
                        </div>
                        {additionalChargeDraft.additionalChargeTypeId === ADDITIONAL_CHARGE_CUSTOM_TYPE_ID && (
                          <div className="xl:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-gray-700">Custom Charge Name</label>
                            <Input
                              value={additionalChargeDraft.customChargeName}
                              onChange={(event) =>
                                setAdditionalChargeDraft((current) => ({ ...current, customChargeName: event.target.value }))
                              }
                              className="h-9 text-sm"
                              placeholder="Enter custom charge name"
                            />
                          </div>
                        )}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">Quantity</label>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={additionalChargeDraft.quantity || ''}
                            onChange={(event) =>
                              setAdditionalChargeDraft((current) => ({ ...current, quantity: safeNumber(event.target.value) }))
                            }
                            className="h-9 text-right text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">Rate</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={additionalChargeDraft.rate || ''}
                            onChange={(event) =>
                              setAdditionalChargeDraft((current) => ({ ...current, rate: safeNumber(event.target.value) }))
                            }
                            className="h-9 text-right text-sm"
                          />
                        </div>
                        <div className="xl:col-span-3">
                          <label className="mb-1 block text-xs font-medium text-gray-700">Description</label>
                          <Input
                            value={additionalChargeDraft.description}
                            onChange={(event) =>
                              setAdditionalChargeDraft((current) => ({ ...current, description: event.target.value }))
                            }
                            className="h-9 text-sm"
                            placeholder="Description shown on agreement"
                          />
                        </div>
                        <div className="xl:col-span-2">
                          <label className="mb-1 block text-xs font-medium text-gray-700">Notes</label>
                          <Input
                            value={additionalChargeDraft.notes}
                            onChange={(event) =>
                              setAdditionalChargeDraft((current) => ({ ...current, notes: event.target.value }))
                            }
                            className="h-9 text-sm"
                            placeholder="Internal notes"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">Total</label>
                          <div className="flex h-9 items-center justify-end rounded border border-gray-200 bg-white px-2 text-sm font-semibold text-gray-900">
                            {formatCurrencyPKR(calculateAdditionalChargeTotal(additionalChargeDraft.quantity, additionalChargeDraft.rate))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={resetAdditionalChargeDraft}>
                          Cancel
                        </Button>
                        <Button size="sm" className="h-8 text-xs" onClick={saveAdditionalChargeDraft}>
                          Save Charge
                        </Button>
                      </div>
                    </div>
                  )}

                  {showChargeTypeManager && (
                    <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-700">Manage Charge List</div>
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={openAddChargeType}>
                          <Plus className="mr-1 size-3" />
                          New Type
                        </Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">Name</label>
                          <Input
                            value={chargeTypeDraft.name}
                            onChange={(event) => setChargeTypeDraft((current) => ({ ...current, name: event.target.value }))}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">Default Rate</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={chargeTypeDraft.defaultRate || ''}
                            onChange={(event) =>
                              setChargeTypeDraft((current) => ({ ...current, defaultRate: safeNumber(event.target.value) }))
                            }
                            className="h-9 text-right text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">Unit Type</label>
                          <Input
                            value={chargeTypeDraft.unitType}
                            onChange={(event) => setChargeTypeDraft((current) => ({ ...current, unitType: event.target.value }))}
                            className="h-9 text-sm"
                            placeholder="fixed, hour, staff"
                          />
                        </div>
                        <div className="xl:col-span-2">
                          <label className="mb-1 block text-xs font-medium text-gray-700">Default Description</label>
                          <Input
                            value={chargeTypeDraft.defaultDescription}
                            onChange={(event) =>
                              setChargeTypeDraft((current) => ({ ...current, defaultDescription: event.target.value }))
                            }
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                          <input
                            type="checkbox"
                            checked={chargeTypeDraft.isActive}
                            onChange={(event) =>
                              setChargeTypeDraft((current) => ({ ...current, isActive: event.target.checked }))
                            }
                            className="size-4"
                          />
                          Active in Add Charge dropdown
                        </label>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                              setChargeTypeDraft(createEmptyAdditionalChargeTypeDraft());
                              setEditingChargeTypeId(null);
                            }}
                          >
                            Clear
                          </Button>
                          <Button size="sm" className="h-8 text-xs" onClick={saveChargeTypeDraft}>
                            {editingChargeTypeId ? 'Save Type' : 'Add Type'}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 overflow-auto rounded border border-gray-200 bg-white">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">Charge Type</th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">Unit</th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-700">Default Rate</th>
                              <th className="px-3 py-2 text-center font-semibold text-gray-700">Status</th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {additionalChargeTypes.map((chargeType) => (
                              <tr key={chargeType.id} className="border-t">
                                <td className="px-3 py-2">
                                  <div className="font-medium text-gray-900">{chargeType.name}</div>
                                  <div className="text-[11px] text-gray-500">{chargeType.defaultDescription || '-'}</div>
                                </td>
                                <td className="px-3 py-2 text-gray-700">{chargeType.unitType}</td>
                                <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrencyPKR(chargeType.defaultRate)}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${chargeType.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {chargeType.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => openEditChargeType(chargeType)}
                                      className="rounded p-1.5 text-blue-600 hover:bg-blue-100"
                                      title="Edit charge type"
                                    >
                                      <Edit2 className="size-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleChargeTypeActive(chargeType.id)}
                                      className="rounded px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100"
                                    >
                                      {chargeType.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Charge Type</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Description</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Quantity</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Rate (Rs.)</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Total (Rs.)</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {additionalCharges.map((charge) => (
                        <tr key={charge.id} className="border-b">
                          <td className="py-2 px-3 align-top">
                            <div className="font-medium text-gray-900">{getAdditionalChargeTypeName(charge, additionalChargeTypes)}</div>
                            {charge.additionalChargeTypeId &&
                              additionalChargeTypes.find((chargeType) => chargeType.id === charge.additionalChargeTypeId)?.isActive === false && (
                                <div className="text-[11px] text-amber-700">Inactive type retained from saved reservation</div>
                              )}
                          </td>
                          <td className="py-2 px-3 align-top text-gray-700">
                            <div>{charge.description || '-'}</div>
                            {charge.notes ? <div className="mt-1 text-[11px] text-gray-500">Notes: {charge.notes}</div> : null}
                          </td>
                          <td className="py-2 px-3 text-right align-top">{charge.quantity}</td>
                          <td className="py-2 px-3 text-right align-top">{formatCurrencyPKR(charge.rate)}</td>
                          <td className="py-2 px-3 text-right align-top font-semibold">
                            {formatCurrencyPKR(calculateAdditionalChargeTotal(charge.quantity, charge.rate))}
                          </td>
                          <td className="py-2 px-3 text-center align-top">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => openEditAdditionalCharge(charge)}
                                className="rounded p-1.5 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                                title="Edit charge"
                              >
                                <Edit2 className="size-3.5" />
                              </button>
                              <button
                                onClick={() => deleteAdditionalCharge(charge.id)}
                                className="rounded p-1.5 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
                                title="Remove charge"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {additionalCharges.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">
                            No additional charges added yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold">
                        <td colSpan={4} className="py-2 px-3 text-right">Additional Charges Total:</td>
                        <td className="py-2 px-3 text-right text-blue-900">{formatCurrencyPKR(additionalChargesTotal)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* PAYMENT LEDGER */}
              {allowPaymentLedger && activeSection === 'payment-ledger' && (
                <div className="rounded-md border border-gray-300 bg-white p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="size-4 text-gray-700" />
                      <h2 className="text-sm font-semibold text-gray-900">Payment Ledger & Payment Plan</h2>
                      {isReSignRequired && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          <AlertTriangle className="size-3" />
                          Re-sign Required
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-start gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Total</span>
                        <span className="font-semibold text-gray-900">{formatCurrencyPKR(grandTotal)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Paid</span>
                        <span className="font-semibold text-gray-900">{formatCurrencyPKR(paymentLedgerSummary.totalReceived)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">Balance</span>
                        <span className="font-semibold text-gray-900">{formatCurrencyPKR(paymentLedgerSummary.remainingBalance)}</span>
                      </div>
                      <details className="min-w-[150px]">
                        <summary className="cursor-pointer list-none rounded border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50">
                          View Breakdown
                        </summary>
                        <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-2">
                          <div className="space-y-1.5 text-xs">
                            {financialSummaryRows.map((row) => (
                              <div key={row.label} className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <span className="text-gray-700">{row.label}</span>
                                  {row.clickable && row.section && (
                                    <button
                                      type="button"
                                      onClick={() => requestSectionNavigation(row.section!)}
                                      className="ml-2 text-[10px] font-medium text-blue-600 hover:underline"
                                    >
                                      Open
                                    </button>
                                  )}
                                </div>
                                <span className="whitespace-nowrap font-medium text-gray-900">
                                  {formatCurrencyPKR(row.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                          {paymentLedgerSummary.paidAtBooking > 0 && (
                            <div className="mt-2 border-t border-gray-200 pt-2 text-[11px] text-gray-500">
                              Includes paid at booking: {formatCurrencyPKR(paymentLedgerSummary.paidAtBooking)}
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-md border border-gray-200 px-3 py-2">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Received Payment</div>
                      <div className="grid gap-2">
                        <div className="grid gap-2 md:grid-cols-[110px_minmax(0,1fr)_112px] xl:grid-cols-[100px_minmax(0,1fr)_104px]">
                          <Input type="date" value={newPaymentDate} onChange={(e) => setNewPaymentDate(e.target.value)} className="h-8 text-xs" />
                          <Input
                            type="number"
                            value={newPaymentAmount || ''}
                            onChange={(e) => setNewPaymentAmount(Number(e.target.value))}
                            placeholder="Amount"
                            className="h-8 text-right text-xs"
                          />
                          <select
                            value={newPaymentMethod}
                            onChange={(e) => setNewPaymentMethod(e.target.value as any)}
                            className="h-8 rounded-md border border-gray-300 px-2 text-xs"
                          >
                            <option value="Cash">Cash</option>
                            <option value="Online Transfer">Online Transfer</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Credit Card">Credit Card</option>
                          </select>
                        </div>

                        {(newPaymentAmountPreviews.formatted || newPaymentAmountPreviews.words) && (
                          <div className="text-[11px] text-gray-500">
                            {newPaymentAmountPreviews.formatted ? `Formatted: ${newPaymentAmountPreviews.formatted}` : ''}
                            {newPaymentAmountPreviews.formatted && newPaymentAmountPreviews.words ? ' | ' : ''}
                            {newPaymentAmountPreviews.words ? `In words: ${newPaymentAmountPreviews.words}` : ''}
                          </div>
                        )}

                        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_76px] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_70px]">
                          <Input
                            value={newPaymentTransactionRef}
                            onChange={(e) => setNewPaymentTransactionRef(e.target.value)}
                            placeholder="Reference"
                            className="h-8 text-xs"
                          />
                          <Input
                            value={newPaymentReceivedBy}
                            onChange={(e) => setNewPaymentReceivedBy(e.target.value)}
                            placeholder="Received by"
                            className="h-8 text-xs"
                          />
                          <Button onClick={handleAddPayment} size="sm" variant="outline" className="h-8 border-gray-300 px-2 text-xs text-gray-700 hover:bg-gray-50">
                            + Add
                          </Button>
                        </div>

                        {(newPaymentMethod === 'Online Transfer' || newPaymentMethod === 'Cheque' || newPaymentMethod === 'Credit Card') && (
                          <div className="grid gap-2 md:grid-cols-2">
                            <Input
                              value={newPaymentBank}
                              onChange={(e) => setNewPaymentBank(e.target.value)}
                              placeholder={newPaymentMethod === 'Credit Card' ? 'Bank / processor' : 'Bank name'}
                              className="h-8 text-xs"
                            />
                            {newPaymentMethod === 'Cheque' ? (
                              <Input
                                value={newPaymentChequeNo}
                                onChange={(e) => setNewPaymentChequeNo(e.target.value)}
                                placeholder="Cheque number"
                                className="h-8 text-xs"
                              />
                            ) : newPaymentMethod === 'Credit Card' ? (
                              <Input
                                value={newPaymentCardLastFour}
                                onChange={(e) => setNewPaymentCardLastFour(e.target.value)}
                                placeholder="Last 4 digits"
                                maxLength={4}
                                className="h-8 text-xs"
                              />
                            ) : (
                              <Input
                                value={newPaymentRemarks}
                                onChange={(e) => setNewPaymentRemarks(e.target.value)}
                                placeholder="Remarks"
                                className="h-8 text-xs"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 min-w-0">
                    <div className="overflow-hidden rounded-md border border-gray-200">
                      <div className="border-b border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Payment History
                      </div>
                      <div className="max-h-[560px] overflow-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-gray-50">
                            <tr className="border-b border-gray-200 text-gray-700">
                              <th className="px-3 py-2 text-left font-semibold">Date</th>
                              <th className="px-3 py-2 text-left font-semibold">Type</th>
                              <th className="px-3 py-2 text-left font-semibold">Description</th>
                              <th className="px-3 py-2 text-right font-semibold">Amount</th>
                              <th className="px-3 py-2 text-left font-semibold">Method</th>
                              <th className="px-3 py-2 text-left font-semibold">Reference</th>
                              <th className="px-3 py-2 text-right font-semibold">Running Balance</th>
                              <th className="px-2 py-2 text-right font-semibold"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentLedgerEntries.length === 0 && (
                              <tr>
                                <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                                  No ledger entries recorded yet.
                                </td>
                              </tr>
                            )}
                            {paymentLedgerEntries.map((payment) => (
                              <tr key={payment.id} className="border-b border-gray-100 align-top">
                                <td className="px-3 py-2 text-gray-700">{formatDatePK(payment.date)}</td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    payment.type === 'Adjustment'
                                      ? 'bg-blue-100 text-blue-700'
                                      : payment.type === 'Refund'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {payment.type}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="text-gray-900">{payment.description}</div>
                                  {payment.fromEventName && (
                                    <div className="mt-0.5 text-[11px] text-gray-500">
                                      From Event: {payment.fromEventName}
                                      {payment.fromEventDate ? ` | ${formatDatePK(payment.fromEventDate)}` : ''}
                                    </div>
                                  )}
                                  {!payment.fromEventName && payment.receivedBy && (
                                    <div className="mt-0.5 text-[11px] text-gray-500">By: {payment.receivedBy}</div>
                                  )}
                                </td>
                                <td className={`px-3 py-2 text-right font-semibold ${
                                  payment.type === 'Refund' ? 'text-red-700' : 'text-gray-900'
                                }`}>
                                  {formatCurrencyPKR(payment.amount)}
                                </td>
                                <td className="px-3 py-2 text-gray-700">{payment.paymentMethod}</td>
                                <td className="px-3 py-2 text-gray-600">{payment.reference}</td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                  {formatCurrencyPKR(payment.runningBalance)}
                                </td>
                                <td className="px-2 py-2">
                                  <div className="flex items-center justify-end gap-1">
                                    {payment.screenshot && (
                                      <button
                                        type="button"
                                        onClick={() => window.open(payment.screenshot, '_blank')}
                                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                        title="View screenshot"
                                      >
                                        <Eye className="size-3.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleEditPayment(payment.id)}
                                      className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                      title="Edit payment"
                                    >
                                      <Edit2 className="size-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEditPayment(payment.id)}
                                      className="rounded p-1 text-red-600 hover:bg-red-50"
                                      title="Delete payment"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-md border border-gray-200 px-3 py-2">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Follow-Up</div>
                      <span className="text-[11px] font-medium text-gray-500">{finalClearanceStatusDisplay}</span>
                    </div>
                    <div className="grid gap-2">
                      {hasConfiguredMinimumAdvance && (
                        <div className="text-[11px] text-gray-500">
                          Minimum advance: {minimumAdvanceDisplay} | Remaining commitment: {formatCurrencyPKR(paymentLedgerSummary.remainingCommitment)}
                        </div>
                      )}
                      <Input
                        type="date"
                        value={finalClearance.dueDate}
                        onChange={(e) => setFinalClearance((current) => ({ ...current, dueDate: e.target.value }))}
                        className="h-8 text-xs"
                      />
                      <select
                        value={finalClearance.status}
                        onChange={(e) => setFinalClearance((current) => ({ ...current, status: e.target.value as FinalClearanceState['status'] }))}
                        disabled={finalClearanceStatusDisplay === 'Not Required'}
                        className="h-8 rounded-md border border-gray-300 px-2 text-xs"
                      >
                        <option value="Planned">Planned</option>
                        <option value="Received">Received</option>
                        <option value="Partial">Partial</option>
                      </select>
                      <Input
                        value={finalClearance.notes}
                        onChange={(e) => setFinalClearance((current) => ({ ...current, notes: e.target.value }))}
                        placeholder="Follow-up notes"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  {shouldShowPlannedPayments && (
                    <div className="mt-4 rounded-md border border-gray-200 px-3 py-2">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Payment Plan</div>
                      <div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_120px_120px_120px_minmax(0,1fr)_72px]">
                        <Input value={newPlanLabel} onChange={(e) => setNewPlanLabel(e.target.value)} placeholder="Label" className="h-8 text-xs" />
                        <Input
                          type="number"
                          value={newPlanAmount || ''}
                          onChange={(e) => setNewPlanAmount(Number(e.target.value) || 0)}
                          placeholder="Amount"
                          className="h-8 text-xs"
                        />
                        <Input type="date" value={newPlanDueDate} onChange={(e) => setNewPlanDueDate(e.target.value)} className="h-8 text-xs" />
                        <select
                          value={newPlanStatus}
                          onChange={(e) => setNewPlanStatus(e.target.value as PaymentPlanEntry['status'])}
                          className="h-8 rounded-md border border-gray-300 px-2 text-xs"
                        >
                          <option value="Planned">Planned</option>
                          <option value="Received">Received</option>
                          <option value="Partial">Partial</option>
                        </select>
                        <Input value={newPlanNotes} onChange={(e) => setNewPlanNotes(e.target.value)} placeholder="Notes" className="h-8 text-xs" />
                        <Button onClick={handleAddPaymentPlan} variant="outline" className="h-8 px-2 text-xs">
                          Add
                        </Button>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        {paymentPlanEntries.length === 0 ? (
                          <div className="text-xs text-gray-500">No planned payments added yet.</div>
                        ) : (
                          paymentPlanEntries.map((entry) => (
                            <div key={entry.id} className="flex items-start justify-between gap-2 border-t border-gray-100 pt-2 text-xs">
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900">{entry.label}</div>
                                <div className="text-gray-500">
                                  {formatDatePK(entry.dueDate)} | {entry.status}
                                    {entry.notes ? ` | ${entry.notes}` : ''}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">{formatCurrencyPKR(entry.amount)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePaymentPlan(entry.id)}
                                  className="rounded p-1 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}              {false && activeSection === 'payment-ledger' && (
                <div className="bg-white rounded-lg border border-gray-300 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="size-5 text-blue-600" />
                    Payment Ledger & Payment Plan
                  </h2>

                  <div className="min-w-0 grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                    <div className="min-w-0 space-y-4">
                      <div className="rounded-lg border border-slate-200 bg-white p-3 lg:col-start-1 lg:row-start-1">
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-900">Financial Summary</h3>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            Reservation Desk
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {financialSummaryRows.map((row) => {
                            const toneClass =
                              row.tone === 'positive'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : row.tone === 'negative'
                                  ? 'border-red-200 bg-red-50 text-red-800'
                                  : row.tone === 'total'
                                    ? 'border-slate-300 bg-slate-100 text-slate-900'
                                    : 'border-slate-200 bg-slate-50 text-slate-900';

                            const content = (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{row.label}</span>
                                  {row.clickable && row.section && (
                                    <span className="text-[10px] font-semibold text-blue-600">Open</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold">{formatCurrencyPKR(row.amount)}</span>
                                  {row.clickable && row.section && <ArrowRight className="size-3.5 text-blue-600" />}
                                </div>
                              </>
                            );

                            if (row.clickable && row.section) {
                              return (
                                <button
                                  key={row.label}
                                  type="button"
                                  onClick={() => requestSectionNavigation(row.section!)}
                                  className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 ${toneClass}`}
                                >
                                  {content}
                                </button>
                              );
                            }

                            return (
                              <div key={row.label} className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 ${toneClass}`}>
                                {content}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>

                    <div className="min-w-0 space-y-4 overflow-hidden lg:contents">
                      <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50 lg:col-start-1 lg:row-start-2">
                        <h3 className="text-sm font-bold text-gray-900 mb-3">Received Payments</h3>

                        <div className="grid grid-cols-[1fr_2.1fr_1fr] gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Date *</label>
                            <Input
                              type="date"
                              value={newPaymentDate}
                              onChange={(e) => setNewPaymentDate(e.target.value)}
                              className="w-full text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Amount *</label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 text-xs">Rs.</span>
                              <Input
                                type="number"
                                value={newPaymentAmount || ''}
                                onChange={(e) => setNewPaymentAmount(Number(e.target.value))}
                                className="w-full pl-10 pr-2 text-sm font-bold text-right tabular-nums"
                                placeholder="0"
                              />
                            </div>
                            {(newPaymentAmountPreviews.formatted || newPaymentAmountPreviews.words) && (
                              <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                                {newPaymentAmountPreviews.formatted && (
                                  <div>
                                    <span className="font-semibold text-gray-700">Formatted:</span> {newPaymentAmountPreviews.formatted}
                                  </div>
                                )}
                                {newPaymentAmountPreviews.words && (
                                  <div className="whitespace-normal break-words text-sm font-medium text-gray-700 leading-snug" title={newPaymentAmountPreviews.words}>
                                    <span className="font-semibold text-gray-700">In words:</span> {newPaymentAmountPreviews.words}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method *</label>
                            <select
                              value={newPaymentMethod}
                              onChange={(e) => setNewPaymentMethod(e.target.value as any)}
                              className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="Cash">Cash</option>
                              <option value="Online Transfer">Online Transfer</option>
                              <option value="Cheque">Cheque</option>
                              <option value="Credit Card">Credit Card</option>
                            </select>
                          </div>
                        </div>

                        {newPaymentMethod === 'Online Transfer' && (
                          <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name</label>
                              <Input
                                value={newPaymentBank}
                                onChange={(e) => setNewPaymentBank(e.target.value)}
                                placeholder="e.g., HBL, UBL, MCB"
                                className="text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Transaction Reference</label>
                              <Input
                                value={newPaymentTransactionRef}
                                onChange={(e) => setNewPaymentTransactionRef(e.target.value)}
                                placeholder="Transaction ID"
                                className="text-xs"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                <Upload className="size-3 inline mr-1" />
                                Upload Payment Screenshot
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleScreenshotUpload}
                                className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                              />
                              {newPaymentScreenshot && (
                                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                                  ✓ Screenshot uploaded successfully
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {newPaymentMethod === 'Cheque' && (
                          <div className="grid grid-cols-3 gap-3 mb-3 p-3 bg-orange-50 border border-orange-200 rounded">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Cheque Number *</label>
                              <Input
                                value={newPaymentChequeNo}
                                onChange={(e) => setNewPaymentChequeNo(e.target.value)}
                                placeholder="Cheque No."
                                className="text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name *</label>
                              <Input
                                value={newPaymentBank}
                                onChange={(e) => setNewPaymentBank(e.target.value)}
                                placeholder="Bank Name"
                                className="text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Encashment Date *</label>
                              <Input
                                type="date"
                                value={newPaymentEncashmentDate}
                                onChange={(e) => setNewPaymentEncashmentDate(e.target.value)}
                                className="text-xs"
                              />
                            </div>
                          </div>
                        )}

                        {newPaymentMethod === 'Credit Card' && (
                          <div className="grid grid-cols-3 gap-3 mb-3 p-3 bg-purple-50 border border-purple-200 rounded">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Card Type</label>
                              <select
                                value={newPaymentCardType}
                                onChange={(e) => setNewPaymentCardType(e.target.value)}
                                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select Type</option>
                                <option value="Visa">Visa</option>
                                <option value="Mastercard">Mastercard</option>
                                <option value="American Express">American Express</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Last 4 Digits</label>
                              <Input
                                value={newPaymentCardLastFour}
                                onChange={(e) => setNewPaymentCardLastFour(e.target.value)}
                                placeholder="XXXX"
                                maxLength={4}
                                className="text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Transaction Reference</label>
                              <Input
                                value={newPaymentTransactionRef}
                                onChange={(e) => setNewPaymentTransactionRef(e.target.value)}
                                placeholder="Auth Code"
                                className="text-xs"
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Received By *</label>
                            <Input
                              value={newPaymentReceivedBy}
                              onChange={(e) => setNewPaymentReceivedBy(e.target.value)}
                              placeholder="Staff name"
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks</label>
                            <Input
                              value={newPaymentRemarks}
                              onChange={(e) => setNewPaymentRemarks(e.target.value)}
                              placeholder="Optional notes"
                              className="text-xs"
                            />
                          </div>
                        </div>

                        <Button
                          onClick={handleAddPayment}
                          className="bg-green-600 hover:bg-green-700 text-white w-full"
                        >
                          <Plus className="size-4 mr-2" />
                          Record Payment Entry
                        </Button>
                      </div>

                      {/* Payment History Table */}
                      <div className="min-w-0 w-full max-w-full border-2 border-gray-300 rounded-lg overflow-hidden bg-white lg:col-start-2 lg:row-start-1">
                        <button
                          type="button"
                          onClick={() => setShowPaymentHistory((current) => !current)}
                          className="flex w-full items-center justify-between bg-gray-100 px-4 py-2 border-b border-gray-300"
                        >
                          <h3 className="text-sm font-bold text-gray-900">Payment History</h3>
                          <ChevronDown className={`size-4 text-slate-500 transition-transform ${showPaymentHistory ? 'rotate-180' : ''}`} />
                        </button>

                        {showPaymentHistory && (
                          <div className="w-full">
                            <table className="w-full table-fixed text-xs border-collapse">
                              <thead>
                                <tr className="bg-gray-50 border-b">
                                  <th className="w-[92px] text-left py-2.5 px-2 font-semibold text-gray-700">Date</th>
                                  <th className="w-[128px] text-right py-2.5 px-2 font-semibold text-gray-700">Amount</th>
                                  <th className="w-[108px] text-left py-2.5 px-2 font-semibold text-gray-700">Method</th>
                                  <th className="hidden text-left py-2.5 px-3 font-semibold text-gray-700">Details</th>
                                  <th className="w-[132px] text-left py-2.5 px-2 font-semibold text-gray-700">Received By</th>
                                  <th className="w-[88px] text-center py-2.5 px-2 font-semibold text-gray-700">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {payments.length === 0 && (
                                  <tr>
                                    <td colSpan={6} className="py-6 text-center text-gray-500">
                                      No payments recorded yet
                                    </td>
                                  </tr>
                                )}
                                {payments.map((payment) => (
                                  <tr key={payment.id} className="border-b hover:bg-gray-50">
                                    <td className="py-2.5 px-2 align-top text-[11px] leading-tight text-gray-700">{formatDatePK(payment.date)}</td>
                                    <td className="py-2.5 px-2 align-top text-right font-bold text-green-700">
                                      {formatCurrencyPKR(payment.amount)}
                                    </td>
                                    <td className="py-2.5 px-2 align-top">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                        payment.paymentMethod === 'Cash' ? 'bg-green-100 text-green-800' :
                                        payment.paymentMethod === 'Online Transfer' ? 'bg-blue-100 text-blue-800' :
                                        payment.paymentMethod === 'Cheque' ? 'bg-orange-100 text-orange-800' :
                                        'bg-purple-100 text-purple-800'
                                      }`}>
                                        {payment.paymentMethod}
                                      </span>
                                    </td>
                                    <td className="hidden min-w-[260px] py-2.5 px-3 text-xs whitespace-normal">
                                      {payment.paymentMethod === 'Cheque' && (
                                        <div className="text-[10px]">
                                          Ch# {payment.chequeNo} | {payment.bankName}
                                          <br />Encash: {payment.encashmentDate}
                                        </div>
                                      )}
                                      {payment.paymentMethod === 'Online Transfer' && (
                                        <div className="text-[10px]">
                                          {payment.bankName} | Ref: {payment.transactionRef}
                                          {payment.screenshot && (
                                            <span className="text-blue-600 ml-1">📎</span>
                                          )}
                                        </div>
                                      )}
                                      {payment.paymentMethod === 'Credit Card' && (
                                        <div className="text-[10px]">
                                          {payment.cardType} ****{payment.cardLastFour}
                                        </div>
                                      )}
                                      {payment.paymentMethod === 'Cash' && payment.remarks && (
                                        <div className="text-[10px] text-gray-600">{payment.remarks}</div>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 align-top break-words text-gray-700">{payment.receivedBy || '—'}</td>
                                    <td className="py-2.5 px-2 align-top text-center">
                                      <div className="flex justify-center gap-0.5">
                                        <button
                                          onClick={() => handlePrintReceipt(payment)}
                                          className="p-1 hover:bg-blue-100 rounded transition-colors text-blue-600"
                                          title="Print Receipt"
                                        >
                                          <Printer className="size-3.5" />
                                        </button>
                                        {payment.screenshot && (
                                          <button
                                            onClick={() => window.open(payment.screenshot, '_blank')}
                                            className="p-1 hover:bg-green-100 rounded transition-colors text-green-600"
                                            title="View Screenshot"
                                          >
                                            <Eye className="size-3.5" />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleEditPayment(payment.id)}
                                          className="p-1 hover:bg-orange-100 rounded transition-colors text-orange-600"
                                          title="Edit Payment"
                                        >
                                          <Edit2 className="size-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleEditPayment(payment.id)}
                                          className="p-1 hover:bg-red-100 rounded transition-colors text-red-600"
                                          title="Delete Payment"
                                        >
                                          <Trash2 className="size-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              {payments.length > 0 && (
                                <tfoot className="bg-gray-100 font-bold">
                                  <tr>
                                    <td className="py-3 px-3">Total:</td>
                                    <td className="py-3 px-3 text-right text-green-900 text-sm">
                                      {formatCurrencyPKR(totalPaymentsReceived)}
                                    </td>
                                    <td colSpan={4}></td>
                                  </tr>
                                </tfoot>
                              )}
                            </table>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 lg:col-start-2 lg:row-start-2">
                        {!shouldShowPlannedPayments && (
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                            <h3 className="text-sm font-bold text-emerald-900">Next Action</h3>
                            <p className="mt-2 text-sm text-emerald-800">
                              Minimum advance is fulfilled. Focus now shifts to balance payment follow-up before the event.
                            </p>
                            <div className="mt-3 space-y-2 text-sm text-emerald-800">
                              {paymentLedgerSummary.remainingBalance > 0 && (
                                <div className="rounded border border-emerald-200 bg-white/70 px-3 py-2">
                                  Follow up for the remaining balance by {finalClearance.dueDate ? formatDatePK(finalClearance.dueDate) : 'the selected due date'}
                                </div>
                              )}
                              <div className="rounded border border-emerald-200 bg-white/70 px-3 py-2">Call client 10 days before event</div>
                              <div className="rounded border border-emerald-200 bg-white/70 px-3 py-2">Finalize guest count, menu, and RCS services</div>
                            </div>
                          </div>
                        )}

                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">Balance Payment Follow-Up</h3>
                              <div className="mt-1 text-[11px] text-slate-500">
                                Default due date is {selectedSetupVenue?.balanceDueDaysBeforeEvent ?? 7} days before the event, but it can be changed for each customer.
                              </div>
                            </div>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              finalClearanceStatusDisplay === 'Not Required'
                                ? 'bg-emerald-100 text-emerald-700'
                                : finalClearanceStatusDisplay === 'Received'
                                  ? 'bg-green-100 text-green-700'
                                  : finalClearanceStatusDisplay === 'Partial'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-700'
                            }`}>
                              {finalClearanceStatusDisplay}
                            </span>
                          </div>
                          <div className="mb-3 grid gap-3 sm:grid-cols-2">
                            <div className="rounded border border-slate-200 bg-slate-50 p-3">
                              <div className="text-[11px] font-semibold uppercase text-slate-500">Remaining Balance</div>
                              <div className="mt-1 text-base font-bold text-red-700">{formatCurrencyPKR(paymentLedgerSummary.remainingBalance)}</div>
                            </div>
                            <div className="rounded border border-slate-200 bg-slate-50 p-3">
                              <div className="text-[11px] font-semibold uppercase text-slate-500">Target Follow-Up Date</div>
                              <div className="mt-1 text-base font-bold text-slate-900">
                                {finalClearance.dueDate ? formatDatePK(finalClearance.dueDate) : 'Set due date'}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-3">
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-slate-700">Balance Follow-Up Date</label>
                              <Input
                                type="date"
                                value={finalClearance.dueDate}
                                onChange={(e) => setFinalClearance((current) => ({ ...current, dueDate: e.target.value }))}
                                className="text-xs"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-slate-700">Balance Follow-Up Status</label>
                              <select
                                value={finalClearance.status}
                                onChange={(e) => setFinalClearance((current) => ({ ...current, status: e.target.value as FinalClearanceState['status'] }))}
                                disabled={finalClearanceStatusDisplay === 'Not Required'}
                                className="w-full rounded-lg border border-gray-300 px-2 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="Planned">Planned</option>
                                <option value="Received">Received</option>
                                <option value="Partial">Partial</option>
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-slate-700">Notes</label>
                              <Input
                                value={finalClearance.notes}
                                onChange={(e) => setFinalClearance((current) => ({ ...current, notes: e.target.value }))}
                                placeholder="Optional"
                                className="text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {!hasConfiguredMinimumAdvance ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 lg:col-start-2 lg:row-start-3">
                          No minimum advance configured for this space
                        </div>
                      ) : paymentLedgerSummary.isMinimumAdvanceMet ? (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 lg:col-start-2 lg:row-start-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-bold text-emerald-900">Minimum Advance Required</div>
                              <div className="mt-1 text-xs text-emerald-700">{minimumAdvanceStatusLabel}</div>
                            </div>
                            <div className="rounded-full bg-white px-3 py-1 text-sm font-bold text-emerald-700">
                              {minimumAdvanceDisplay}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 lg:col-start-2 lg:row-start-3">
                          <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-amber-900">Minimum Advance Required</h3>
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              <AlertTriangle className="size-3" />
                              {minimumAdvanceStatusLabel}
                            </span>
                          </div>
                          {paymentLedgerSummary.minimumAdvanceNote && (
                            <div className="mb-3 text-[11px] text-amber-700">{paymentLedgerSummary.minimumAdvanceNote}</div>
                          )}
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded border border-amber-200 bg-white p-3">
                              <div className="text-[11px] font-semibold uppercase text-amber-600">Minimum Advance</div>
                              <div className="mt-1 text-base font-bold text-slate-900">{minimumAdvanceDisplay}</div>
                            </div>
                            <div className="rounded border border-amber-200 bg-white p-3">
                              <div className="text-[11px] font-semibold uppercase text-amber-600">Paid</div>
                              <div className="mt-1 text-base font-bold text-slate-900">{formatCurrencyPKR(paymentLedgerSummary.totalReceived)}</div>
                            </div>
                            <div className="rounded border border-amber-200 bg-white p-3">
                              <div className="text-[11px] font-semibold uppercase text-amber-600">Remaining Commitment</div>
                              <div className="mt-1 text-base font-bold text-amber-700">
                                {formatCurrencyPKR(paymentLedgerSummary.remainingCommitment)}
                              </div>
                            </div>
                          </div>
                          {requiresAdvanceException ? (
                            <div className="mt-4 rounded-md border border-amber-200 bg-white p-3">
                              <div className="text-sm font-medium text-amber-900">
                                Zero-advance reservations need a reason before confirmation.
                              </div>
                              <div className="mt-2 text-xs text-amber-700">
                                This exception will be recorded under the current user.
                              </div>
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-amber-800">Recorded By</label>
                                  <Input value={currentUserName} readOnly className="bg-amber-50 text-xs" />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-amber-800">Approval Date</label>
                                  <Input value={advanceExceptionApprovalDateDisplay} readOnly className="bg-amber-50 text-xs" />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="mb-1 block text-xs font-semibold text-amber-800">Zero Advance Reason</label>
                                  <Textarea
                                    value={advanceExceptionReason}
                                    onChange={(e) => setAdvanceExceptionReason(e.target.value)}
                                    placeholder="Reason for confirming this reservation without any advance payment"
                                    className="min-h-[76px] text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-4 rounded-md border border-amber-200 bg-white p-3 text-xs text-amber-800">
                              Minimum advance is still short, but the reservation can be confirmed because some advance has already been received.
                            </div>
                          )}
                        </div>
                      )}

                      {shouldShowPlannedPayments ? (
                        <div className="rounded-lg border border-slate-200 bg-white lg:col-start-2 lg:row-start-4">
                          <div className="border-b border-slate-200 px-4 py-3">
                            <h3 className="text-sm font-bold text-slate-900">Planned Payments</h3>
                          </div>
                          <div className="border-b border-slate-200 bg-slate-50 p-4">
                            <div className="grid gap-3 md:grid-cols-5">
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">Payment Label</label>
                                <Input
                                  value={newPlanLabel}
                                  onChange={(e) => setNewPlanLabel(e.target.value)}
                                  placeholder="Next Payment"
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">Amount</label>
                                <Input
                                  type="number"
                                  value={newPlanAmount || ''}
                                  onChange={(e) => setNewPlanAmount(Number(e.target.value) || 0)}
                                  placeholder="0"
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">Due Date</label>
                                <Input
                                  type="date"
                                  value={newPlanDueDate}
                                  onChange={(e) => setNewPlanDueDate(e.target.value)}
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">Status</label>
                                <select
                                  value={newPlanStatus}
                                  onChange={(e) => setNewPlanStatus(e.target.value as PaymentPlanEntry['status'])}
                                  className="w-full rounded-lg border border-gray-300 px-2 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="Planned">Planned</option>
                                  <option value="Received">Received</option>
                                  <option value="Partial">Partial</option>
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">Notes</label>
                                <Input
                                  value={newPlanNotes}
                                  onChange={(e) => setNewPlanNotes(e.target.value)}
                                  placeholder="Optional"
                                  className="text-xs"
                                />
                              </div>
                            </div>
                            <Button
                              onClick={handleAddPaymentPlan}
                              variant="outline"
                              className="mt-3 border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                              <Plus className="mr-2 size-4" />
                              Add Planned Payment
                            </Button>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200">
                                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Label</th>
                                  <th className="px-3 py-2 text-right font-semibold text-slate-700">Amount</th>
                                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Due Date</th>
                                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
                                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Notes</th>
                                  <th className="px-3 py-2 text-right font-semibold text-slate-700">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paymentPlanEntries.length === 0 && (
                                  <tr>
                                    <td colSpan={6} className="px-3 py-5 text-center text-slate-500">
                                      No planned payments added yet.
                                    </td>
                                  </tr>
                                )}
                                {paymentPlanEntries.map((entry) => (
                                  <tr key={entry.id} className="border-b border-slate-100">
                                    <td className="px-3 py-2 font-medium text-slate-900">{entry.label}</td>
                                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatCurrencyPKR(entry.amount)}</td>
                                    <td className="px-3 py-2 text-slate-700">{formatDatePK(entry.dueDate)}</td>
                                    <td className="px-3 py-2">
                                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                        entry.status === 'Received'
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : entry.status === 'Partial'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-slate-100 text-slate-700'
                                      }`}>
                                        {entry.status}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-slate-600">{entry.notes || 'â€”'}</td>
                                    <td className="px-3 py-2 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePaymentPlan(entry.id)}
                                        className="inline-flex rounded p-1 text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}

                    </div>

                  <div className="hidden">

                  {shouldShowPlannedPayments ? (
                  <div className="order-3 rounded-lg border border-slate-200 bg-white lg:order-2 lg:col-start-2">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <h3 className="text-sm font-bold text-slate-900">Planned Payments</h3>
                    </div>
                    <div className="border-b border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-3 md:grid-cols-5">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">Payment Label</label>
                          <Input
                            value={newPlanLabel}
                            onChange={(e) => setNewPlanLabel(e.target.value)}
                            placeholder="Next Payment"
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">Amount</label>
                          <Input
                            type="number"
                            value={newPlanAmount || ''}
                            onChange={(e) => setNewPlanAmount(Number(e.target.value) || 0)}
                            placeholder="0"
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">Due Date</label>
                          <Input
                            type="date"
                            value={newPlanDueDate}
                            onChange={(e) => setNewPlanDueDate(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">Status</label>
                          <select
                            value={newPlanStatus}
                            onChange={(e) => setNewPlanStatus(e.target.value as PaymentPlanEntry['status'])}
                            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Planned">Planned</option>
                            <option value="Received">Received</option>
                            <option value="Partial">Partial</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">Notes</label>
                          <Input
                            value={newPlanNotes}
                            onChange={(e) => setNewPlanNotes(e.target.value)}
                            placeholder="Optional"
                            className="text-xs"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleAddPaymentPlan}
                        variant="outline"
                        className="mt-3 border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        <Plus className="mr-2 size-4" />
                        Add Planned Payment
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50">
                          <tr className="border-b border-slate-200">
                            <th className="px-3 py-2 text-left font-semibold text-slate-700">Label</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-700">Amount</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-700">Due Date</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-700">Notes</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-700">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentPlanEntries.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-3 py-5 text-center text-slate-500">
                                No planned payments added yet.
                              </td>
                            </tr>
                          )}
                          {paymentPlanEntries.map((entry) => (
                            <tr key={entry.id} className="border-b border-slate-100">
                              <td className="px-3 py-2 font-medium text-slate-900">{entry.label}</td>
                              <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatCurrencyPKR(entry.amount)}</td>
                              <td className="px-3 py-2 text-slate-700">{formatDatePK(entry.dueDate)}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  entry.status === 'Received'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : entry.status === 'Partial'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {entry.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-600">{entry.notes || '—'}</td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeletePaymentPlan(entry.id)}
                                  className="inline-flex rounded p-1 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  ) : null}

                  {/* Add New Payment Form */}
                  <div className="hidden">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Received Payments</h3>
                    
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Date *</label>
                        <Input
                          type="date"
                          value={newPaymentDate}
                          onChange={(e) => setNewPaymentDate(e.target.value)}
                          className="w-full text-xs"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Amount *</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 text-xs">Rs.</span>
                          <Input
                            type="number"
                            value={newPaymentAmount || ''}
                            onChange={(e) => setNewPaymentAmount(Number(e.target.value))}
                            className="pl-10 text-sm font-bold"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method *</label>
                        <select
                          value={newPaymentMethod}
                          onChange={(e) => setNewPaymentMethod(e.target.value as any)}
                          className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Cash">Cash</option>
                          <option value="Online Transfer">Online Transfer</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Credit Card">Credit Card</option>
                        </select>
                      </div>
                    </div>

                    {/* Conditional Fields Based on Payment Method */}
                    {newPaymentMethod === 'Online Transfer' && (
                      <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name</label>
                          <Input
                            value={newPaymentBank}
                            onChange={(e) => setNewPaymentBank(e.target.value)}
                            placeholder="e.g., HBL, UBL, MCB"
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Transaction Reference</label>
                          <Input
                            value={newPaymentTransactionRef}
                            onChange={(e) => setNewPaymentTransactionRef(e.target.value)}
                            placeholder="Transaction ID"
                            className="text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            <Upload className="size-3 inline mr-1" />
                            Upload Payment Screenshot
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotUpload}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          />
                          {newPaymentScreenshot && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                              ✓ Screenshot uploaded successfully
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {newPaymentMethod === 'Cheque' && (
                      <div className="grid grid-cols-3 gap-3 mb-3 p-3 bg-orange-50 border border-orange-200 rounded">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Cheque Number *</label>
                          <Input
                            value={newPaymentChequeNo}
                            onChange={(e) => setNewPaymentChequeNo(e.target.value)}
                            placeholder="Cheque No."
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name *</label>
                          <Input
                            value={newPaymentBank}
                            onChange={(e) => setNewPaymentBank(e.target.value)}
                            placeholder="Bank Name"
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Encashment Date *</label>
                          <Input
                            type="date"
                            value={newPaymentEncashmentDate}
                            onChange={(e) => setNewPaymentEncashmentDate(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {newPaymentMethod === 'Credit Card' && (
                      <div className="grid grid-cols-3 gap-3 mb-3 p-3 bg-purple-50 border border-purple-200 rounded">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Card Type</label>
                          <select
                            value={newPaymentCardType}
                            onChange={(e) => setNewPaymentCardType(e.target.value)}
                            className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Type</option>
                            <option value="Visa">Visa</option>
                            <option value="Mastercard">Mastercard</option>
                            <option value="American Express">American Express</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Last 4 Digits</label>
                          <Input
                            value={newPaymentCardLastFour}
                            onChange={(e) => setNewPaymentCardLastFour(e.target.value)}
                            placeholder="XXXX"
                            maxLength={4}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Transaction Reference</label>
                          <Input
                            value={newPaymentTransactionRef}
                            onChange={(e) => setNewPaymentTransactionRef(e.target.value)}
                            placeholder="Auth Code"
                            className="text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Received By *</label>
                        <Input
                          value={newPaymentReceivedBy}
                          onChange={(e) => setNewPaymentReceivedBy(e.target.value)}
                          placeholder="Staff name"
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks</label>
                        <Input
                          value={newPaymentRemarks}
                          onChange={(e) => setNewPaymentRemarks(e.target.value)}
                          placeholder="Optional notes"
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={handleAddPayment}
                      className="bg-green-600 hover:bg-green-700 text-white w-full"
                    >
                      <Plus className="size-4 mr-2" />
                      Record Payment Entry
                    </Button>
                  </div>

                  {/* Payment History Table */}
                  <div className="hidden">
                    <button
                      type="button"
                      onClick={() => setShowPaymentHistory((current) => !current)}
                      className="flex w-full items-center justify-between bg-gray-100 px-4 py-2 border-b border-gray-300"
                    >
                      <h3 className="text-sm font-bold text-gray-900">Payment History</h3>
                      <ChevronDown className={`size-4 text-slate-500 transition-transform ${showPaymentHistory ? 'rotate-180' : ''}`} />
                    </button>

                    {showPaymentHistory && (
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left py-2 px-3 font-semibold text-gray-700">Date</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-700">Amount</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-700">Method</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-700">Details</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-700">Received By</th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-gray-500">
                              No payments recorded yet
                            </td>
                          </tr>
                        )}
                        {payments.map((payment) => (
                          <tr key={payment.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3">{formatDatePK(payment.date)}</td>
                            <td className="py-2 px-3 text-right font-bold text-green-700">
                              {formatCurrencyPKR(payment.amount)}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                payment.paymentMethod === 'Cash' ? 'bg-green-100 text-green-800' :
                                payment.paymentMethod === 'Online Transfer' ? 'bg-blue-100 text-blue-800' :
                                payment.paymentMethod === 'Cheque' ? 'bg-orange-100 text-orange-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {payment.paymentMethod}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-xs">
                              {payment.paymentMethod === 'Cheque' && (
                                <div className="text-[10px]">
                                  Ch# {payment.chequeNo} | {payment.bankName}
                                  <br />Encash: {payment.encashmentDate}
                                </div>
                              )}
                              {payment.paymentMethod === 'Online Transfer' && (
                                <div className="text-[10px]">
                                  {payment.bankName} | Ref: {payment.transactionRef}
                                  {payment.screenshot && (
                                    <span className="text-blue-600 ml-1">📎</span>
                                  )}
                                </div>
                              )}
                              {payment.paymentMethod === 'Credit Card' && (
                                <div className="text-[10px]">
                                  {payment.cardType} ****{payment.cardLastFour}
                                </div>
                              )}
                              {payment.paymentMethod === 'Cash' && payment.remarks && (
                                <div className="text-[10px] text-gray-600">{payment.remarks}</div>
                              )}
                            </td>
                            <td className="py-2 px-3">{payment.receivedBy}</td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => handlePrintReceipt(payment)}
                                  className="p-1 hover:bg-blue-100 rounded transition-colors text-blue-600"
                                  title="Print Receipt"
                                >
                                  <Printer className="size-3.5" />
                                </button>
                                {payment.screenshot && (
                                  <button
                                    onClick={() => window.open(payment.screenshot, '_blank')}
                                    className="p-1 hover:bg-green-100 rounded transition-colors text-green-600"
                                    title="View Screenshot"
                                  >
                                    <Eye className="size-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEditPayment(payment.id)}
                                  className="p-1 hover:bg-orange-100 rounded transition-colors text-orange-600"
                                  title="Edit Payment"
                                >
                                  <Edit2 className="size-3.5" />
                                </button>
                                <button
                                  onClick={() => handleEditPayment(payment.id)}
                                  className="p-1 hover:bg-red-100 rounded transition-colors text-red-600"
                                  title="Delete Payment"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {payments.length > 0 && (
                        <tfoot className="bg-gray-100 font-bold">
                          <tr>
                            <td className="py-3 px-3">Total:</td>
                            <td className="py-3 px-3 text-right text-green-900 text-sm">
                              {formatCurrencyPKR(totalPaymentsReceived)}
                            </td>
                            <td colSpan={4}></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                    )}
                  </div>

                  </div>

                  </div>

                  {/* Password Modal for Edit/Delete */}
                  {showEditPasswordModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                        <div className="flex items-center gap-2 mb-4">
                          <Lock className="size-5 text-red-600" />
                          <h3 className="text-lg font-bold text-gray-900">Authentication Required</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          Enter admin password to edit or delete this payment entry:
                        </p>
                        <Input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Enter password"
                          className="mb-4"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleDeletePayment(editingPaymentId, editPassword);
                            }
                          }}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleDeletePayment(editingPaymentId, editPassword)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                          >
                            Delete Payment
                          </Button>
                          <Button
                            onClick={() => {
                              setShowEditPasswordModal(false);
                              setEditPassword('');
                              setEditingPaymentId('');
                            }}
                            variant="outline"
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                        <div className="mt-3 text-xs text-gray-500 text-center">
                          Demo password: admin123
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CALL-BACK TRACKING */}
              {activeSection === 'callback-tracking' && (
                <div className="bg-white rounded-lg border border-gray-300 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="size-5 text-blue-600" />
                    Confirmed Reservation Follow-Up
                  </h2>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                        <span className="text-sm text-gray-900">Advance Commitment</span>
                      </div>
                      <span className={`text-xs font-semibold ${paymentLedgerSummary.isMinimumAdvanceMet ? 'text-green-700' : 'text-amber-700'}`}>
                        {paymentLedgerSummary.isMinimumAdvanceMet ? 'Fulfilled' : formatCurrencyPKR(paymentLedgerSummary.remainingCommitment)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                        <span className="text-sm text-gray-900">Menu Finalization Pending</span>
                      </div>
                      <span className="text-xs text-gray-600">3 days before event</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                        <span className="text-sm text-gray-900">Guest Count Confirmation Pending</span>
                      </div>
                      <span className="text-xs text-gray-600">2 days before event</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                        <span className="text-sm text-gray-900">RCS Confirmation Pending</span>
                      </div>
                      <span className="text-xs text-gray-600">1 day before event</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                        <span className="text-sm text-gray-900">Final Payment Reminder Pending</span>
                      </div>
                      <span className="text-xs text-gray-600">Event day</span>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'post-event-feedback' && (
                <div className="bg-white rounded-lg border border-gray-300 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="size-5 text-blue-600" />
                    Post-Event Feedback
                  </h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Record customer comments after the event against each confirmed service billed in this reservation.
                  </p>

                  <div className="grid gap-4 md:grid-cols-2 mb-6">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">Overall Satisfaction</label>
                      <select
                        value={postEventOverallRating}
                        onChange={(e) => setPostEventOverallRating((e.target.value as PostEventFeedbackRating) || '')}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="">Select overall rating</option>
                        {POST_EVENT_FEEDBACK_RATINGS.map((rating) => (
                          <option key={rating} value={rating}>
                            {rating}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">Would Recommend</label>
                      <select
                        value={postEventWouldRecommend}
                        onChange={(e) => setPostEventWouldRecommend(e.target.value as PostEventFeedbackRecommendation)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        {POST_EVENT_RECOMMENDATION_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Overall Customer Comment</label>
                    <textarea
                      value={postEventOverallComment}
                      onChange={(e) => setPostEventOverallComment(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="How did the customer describe the overall event experience?"
                    />
                  </div>

                  <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <label className="flex items-center gap-3 text-sm font-medium text-slate-900">
                      <input
                        type="checkbox"
                        checked={postEventFollowUpRequired}
                        onChange={(e) => setPostEventFollowUpRequired(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                      Follow-up action required
                    </label>
                    <textarea
                      value={postEventFollowUpAction}
                      onChange={(e) => setPostEventFollowUpAction(e.target.value)}
                      rows={2}
                      className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Capture any recovery step, callback, compensation, or service follow-up."
                    />
                  </div>

                  <div className="space-y-4">
                    {postEventServiceCatalog.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600">
                        No billable confirmed services are available yet. Once menu, supplies, RCS, or additional charges are added,
                        service-wise feedback will appear here automatically.
                      </div>
                    ) : (
                      postEventServiceCatalog.map((service) => {
                        const feedback = postEventServiceFeedbackByKey.get(service.serviceKey);

                        return (
                          <div key={service.serviceKey} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{service.serviceLabel}</div>
                                <div className="mt-1 text-xs text-gray-600">
                                  Billed amount: {formatCurrencyPKR(service.bookedAmount)}
                                </div>
                                {service.bookedItems.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {service.bookedItems.map((item) => (
                                      <span
                                        key={`${service.serviceKey}-${item}`}
                                        className="rounded-full bg-white px-2.5 py-1 text-xs text-gray-700 border border-gray-200"
                                      >
                                        {item}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="grid gap-3 md:min-w-[260px]">
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-gray-700">Service Rating</label>
                                  <select
                                    value={feedback?.rating || ''}
                                    onChange={(e) =>
                                      updatePostEventServiceFeedback(service.serviceKey, {
                                        rating: (e.target.value as PostEventFeedbackRating) || undefined,
                                      })
                                    }
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                                  >
                                    <option value="">Select rating</option>
                                    {POST_EVENT_FEEDBACK_RATINGS.map((rating) => (
                                      <option key={rating} value={rating}>
                                        {rating}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(feedback?.issueReported)}
                                    onChange={(e) =>
                                      updatePostEventServiceFeedback(service.serviceKey, {
                                        issueReported: e.target.checked,
                                      })
                                    }
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                                  />
                                  Customer reported an issue on this service
                                </label>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700">Customer Comment</label>
                                <textarea
                                  value={feedback?.customerComment || ''}
                                  onChange={(e) =>
                                    updatePostEventServiceFeedback(service.serviceKey, {
                                      customerComment: e.target.value,
                                    })
                                  }
                                  rows={3}
                                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                                  placeholder="What did the customer say about this service?"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700">Internal Note</label>
                                <textarea
                                  value={feedback?.internalNote || ''}
                                  onChange={(e) =>
                                    updatePostEventServiceFeedback(service.serviceKey, {
                                      internalNote: e.target.value,
                                    })
                                  }
                                  rows={3}
                                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                                  placeholder="Internal recovery note, service lesson, or escalation context."
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* BOOKING AGREEMENT */}
              {activeSection === 'final-summary' && (
                <div className="rounded-md border border-gray-300 bg-white p-6">
                  <div className="border-b border-gray-300 pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-gray-900">
                        <FileText className="size-4 text-gray-700" />
                        <h2 className="text-base font-semibold">Booking Agreement</h2>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            agreementStatusState === 'Signed'
                              ? 'bg-green-100 text-green-700'
                              : agreementStatusState === 'Re-sign Required'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {agreementStatusState}
                        </span>
                      </div>
                      {agreementStatusState === 'Draft' && !signedAgreementSnapshotState && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSubmit('Signed')}
                          className="h-8 px-3 text-xs font-semibold"
                        >
                          Mark Signed
                        </Button>
                      )}
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 text-sm">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Customer Name</div>
                        <div className="mt-1 font-medium text-gray-900">{customerName || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">First Amount Paid On</div>
                        <div className="mt-1 font-medium text-gray-900">{firstAmountPaidOnDisplay}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Area / Locality</div>
                        <div className="mt-1 font-medium text-gray-900">{area ? `${area}, ${city}` : city}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Event Type</div>
                        <div className="mt-1 font-medium text-gray-900">{eventType || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Event Date</div>
                        <div className="mt-1 font-bold text-gray-900">{operationalEventDateDisplay}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Venue</div>
                        <div className="mt-1 font-medium text-gray-900">{selectedVenueLabel}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Space</div>
                        <div className="mt-1 font-medium text-gray-900">
                          {reservedSpaceDisplayLabels.length > 0
                            ? reservedSpaceDisplayLabels.join(' | ')
                            : `${selectedPrimeSpaceLabel}${selectedSubSpaceId ? ` > ${selectedSubSpaceLabel}` : ''}`}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Time Slot</div>
                        <div className="mt-1 font-medium text-gray-900">{formatTimeRangePK(eventStartTime, eventEndTime)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Booking ID</div>
                        <div className="mt-1 font-medium text-gray-900">{initialData?.id || 'Draft Reservation'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Prepared By</div>
                        <div className="mt-1 font-medium text-gray-900">Front Desk</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Prepared Date</div>
                        <div className="mt-1 font-medium text-gray-900">{formatDatePK(new Date().toISOString().split('T')[0])}</div>
                      </div>
                    </div>
                    {hasAdvanceExceptionApproval && (
                      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Advance Exception Approval</div>
                        <div className="mt-1 text-amber-950">
                          Approved by <span className="font-semibold">{advanceExceptionApprovedByDisplay}</span> on{' '}
                          <span className="font-semibold">{advanceExceptionApprovalDateDisplay}</span>
                        </div>
                        <div className="mt-1 text-amber-900">{advanceExceptionReason || initialData?.approvalNotes || 'Management-approved zero/low advance reservation.'}</div>
                      </div>
                    )}
                  </div>

                  {isReSignRequired && (
                    <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      <AlertTriangle className="mt-0.5 size-3.5 flex-shrink-0 text-amber-600" />
                      <span>Booking Agreement changed after signature. Customer re-sign required.</span>
                    </div>
                  )}

                  <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                    <div className="space-y-5">
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Event Summary</div>
                        <div className="grid gap-x-6 gap-y-2 md:grid-cols-2 text-sm">
                          <div className="flex items-center justify-between border-b border-gray-100 py-1.5">
                            <span className="text-gray-600">Guaranteed Guests</span>
                            <span className="font-medium text-gray-900">{safeNumber(guaranteedGuests).toLocaleString('en-PK')}</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-gray-100 py-1.5">
                            <span className="text-gray-600">Minimum Guests</span>
                            <span className="font-medium text-gray-900">{safeNumber(minimumGuaranteedGuests).toLocaleString('en-PK')}</span>
                          </div>
                          {guestShortfall > 0 && (
                            <div className="flex items-center justify-between border-b border-gray-100 py-1.5">
                              <span className="text-gray-600">Shortfall</span>
                              <span className="font-medium text-gray-900">{guestShortfall} guests</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between border-b border-gray-100 py-1.5">
                            <span className="text-gray-600">Duration</span>
                            <span className="font-medium text-gray-900">{durationSummary.totalLabel}</span>
                          </div>
                          {durationSummary.extraMinutes > 0 && (
                            <div className="flex items-center justify-between border-b border-gray-100 py-1.5">
                              <span className="text-gray-600">Extra Hours</span>
                              <span className="font-medium text-gray-900">{durationSummary.extraLabel}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Services Breakdown</div>
                        <div className="space-y-4 text-sm">
                          <div className="border-t border-gray-200 pt-3">
                            <div className="font-medium text-gray-900">{agreementCommercialHeading}</div>
                            <div className="mt-2 grid gap-1.5 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">{agreementPackageLabel}</span>
                                <span className="font-medium text-gray-900">{agreementDisplayedMenuPackage}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">{agreementPerHeadRateLabel}</span>
                                <span className="font-medium text-gray-900">{formatCurrencyPKR(agreementDisplayedPerHeadRate)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">{agreementTotalLabel}</span>
                                <span className="font-medium text-gray-900">{formatCurrencyPKR(menuTotal)}</span>
                              </div>
                            </div>
                          </div>

                          {menuSelection.serviceMode === 'catering-only' ? (
                            <div className="border-t border-gray-200 pt-3">
                              <div className="font-medium text-gray-900">Catering Details</div>
                              <div className="mt-2 text-gray-700">
                                {menuSelection.customerProvidedMenu.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {menuSelection.customerProvidedMenu.map((item, index) => (
                                      <div key={`${item.category}-${item.itemName}-${index}`} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-1.5">
                                        <div>
                                          <div className="font-medium text-gray-900">{item.category || 'Other'}: {item.itemName || '—'}</div>
                                          {item.notes && <div className="text-xs text-gray-500">{item.notes}</div>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-gray-500">Customer-provided menu not listed.</div>
                                )}
                              </div>
                            </div>
                          ) : menuSelection.items.length > 0 ? (
                            <div className="border-t border-gray-200 pt-3">
                              <div className="font-medium text-gray-900">Catering Details</div>
                              <div className="mt-2 space-y-2">
                                {Object.entries(
                                  menuSelection.items.reduce<Record<string, typeof menuSelection.items>>((groups, item) => {
                                    const key = item.category || 'Other';
                                    groups[key] = groups[key] || [];
                                    groups[key].push(item);
                                    return groups;
                                  }, {})
                                ).map(([category, items]) => (
                                  <div key={category} className="border-b border-gray-100 pb-1.5">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{category}</div>
                                    <div className="mt-1 text-gray-900">{items.map((item) => item.name).join(', ')}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {venueCharges > 0 && (
                            <div className="border-t border-gray-200 pt-3">
                              <div className="font-medium text-gray-900">Venue Charges</div>
                              <div className="mt-2 grid gap-1.5 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600">Venue Rental</span>
                                  <span className="font-medium text-gray-900">{formatCurrencyPKR(venueRentalCharges)}</span>
                                </div>
                                {guestShortfall > 0 && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Shortfall ({guestShortfall} × {formatCurrencyPKR(perHeadRate)})</span>
                                    <span className="font-medium text-gray-900">{formatCurrencyPKR(minimumGuaranteeShortfallAmount)}</span>
                                  </div>
                                )}
                                {extraHourCharge > 0 && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Extra Hours</span>
                                    <span className="font-medium text-gray-900">{formatCurrencyPKR(extraHourCharge)}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between border-t border-gray-100 pt-1.5">
                                  <span className="font-medium text-gray-900">Total Venue Charges</span>
                                  <span className="font-medium text-gray-900">{formatCurrencyPKR(venueCharges)}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {selectedSupportCatering.length > 0 && (
                            <div className="border-t border-gray-200 pt-3">
                              <div className="font-medium text-gray-900">Support Catering</div>
                              <div className="mt-2 space-y-1.5">
                                {selectedSupportCatering.map((item, index) => (
                                  <div key={`${item.itemName}-${index}`} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-1.5">
                                    <div>
                                      <div className="font-medium text-gray-900">{item.itemName}</div>
                                      <div className="text-xs text-gray-500">{item.pricingType} | Qty {item.quantity} × {formatCurrencyPKR(item.rate)}</div>
                                    </div>
                                    <div className="font-medium text-gray-900">{formatCurrencyPKR(item.quantity * item.rate)}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedRCSServices.length > 0 && (
                            <div className="border-t border-gray-200 pt-3">
                              <div className="font-medium text-gray-900">RCS Services</div>
                              <div className="mt-2 space-y-1.5">
                                {selectedRCSServices.map((item, index) => (
                                  <div key={`${item.serviceName}-${index}`} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-1.5">
                                    <div>
                                      <div className="font-medium text-gray-900">{item.serviceName}</div>
                                      <div className="text-xs text-gray-500">
                                        {[item.categoryName, item.source, `Qty ${item.quantity} × ${formatCurrencyPKR(item.price)}`]
                                          .filter(Boolean)
                                          .join(' | ')}
                                      </div>
                                    </div>
                                    <div className="font-medium text-gray-900">{formatCurrencyPKR(safeNumber(item.quantity) * safeNumber(item.price))}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {foodSupplies.filter((item) => safeNumber(item.quantity) > 0).length > 0 && (
                            <div className="border-t border-gray-200 pt-3">
                              <div className="font-medium text-gray-900">Food Supplies</div>
                              <div className="mt-2 space-y-1.5">
                                {foodSupplies.filter((item) => safeNumber(item.quantity) > 0).map((item, index) => (
                                  <div key={`${item.kitchenItemId || item.masterItemId || item.item}-${index}`} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-1.5">
                                    <div>
                                      <div className="font-medium text-gray-900">{getFoodSupplyLineName(item)}</div>
                                      <div className="text-xs text-gray-500">{item.quantity} {item.unit || ''} × {formatCurrencyPKR(item.rate)}</div>
                                    </div>
                                    <div className="font-medium text-gray-900">{formatCurrencyPKR(safeNumber(item.quantity) * safeNumber(item.rate))}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {additionalCharges.filter((item) => safeNumber(item.quantity) > 0 || safeNumber(item.rate) > 0 || safeNumber(item.total) > 0).length > 0 && (
                            <div className="border-t border-gray-200 pt-3">
                              <div className="font-medium text-gray-900">Additional Charges</div>
                              <div className="mt-2 overflow-hidden rounded border border-gray-200">
                                <table className="w-full text-xs">
                                  <thead className="bg-gray-50 text-gray-600">
                                    <tr>
                                      <th className="px-2 py-1.5 text-left font-semibold">Charge Type</th>
                                      <th className="px-2 py-1.5 text-left font-semibold">Description</th>
                                      <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
                                      <th className="px-2 py-1.5 text-right font-semibold">Rate</th>
                                      <th className="px-2 py-1.5 text-right font-semibold">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {additionalCharges
                                      .filter((item) => safeNumber(item.quantity) > 0 || safeNumber(item.rate) > 0 || safeNumber(item.total) > 0)
                                      .map((item) => (
                                        <tr key={item.id}>
                                          <td className="px-2 py-1.5 font-medium text-gray-900">{getAdditionalChargeTypeName(item, additionalChargeTypes)}</td>
                                          <td className="px-2 py-1.5 text-gray-600">{item.description || '-'}</td>
                                          <td className="px-2 py-1.5 text-right text-gray-700">{safeNumber(item.quantity)}</td>
                                          <td className="px-2 py-1.5 text-right text-gray-700">{formatCurrencyPKR(item.rate)}</td>
                                          <td className="px-2 py-1.5 text-right font-medium text-gray-900">{formatCurrencyPKR(calculateAdditionalChargeTotal(item.quantity, item.rate))}</td>
                                        </tr>
                                      ))}
                                  </tbody>
                                  <tfoot className="bg-blue-50">
                                    <tr>
                                      <td colSpan={4} className="px-2 py-1.5 text-right font-semibold text-blue-900">Additional Charges Total</td>
                                      <td className="px-2 py-1.5 text-right font-semibold text-blue-900">{formatCurrencyPKR(additionalChargesTotal)}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Financial Summary</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between border-b border-gray-100 py-1.5">
                            <span className="text-gray-600">{agreementPerHeadRateLabel}</span>
                            <span className="font-medium text-gray-900">{formatCurrencyPKR(agreementDisplayedPerHeadRate)}</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-gray-100 py-1.5">
                            <span className="text-gray-600">Total Charges</span>
                            <span className="font-medium text-gray-900">{formatCurrencyPKR(grandTotal)}</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-gray-100 py-1.5">
                            <span className="text-gray-600">Paid</span>
                            <span className="font-medium text-gray-900">{formatCurrencyPKR(paymentLedgerSummary.totalReceived)}</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-gray-100 py-1.5">
                            <span className="text-gray-600">Remaining Balance</span>
                            <span className="font-medium text-gray-900">{formatCurrencyPKR(paymentLedgerSummary.remainingBalance)}</span>
                          </div>
                          {hasConfiguredMinimumAdvance && (
                            <div className="flex items-center justify-between border-b border-gray-100 py-1.5">
                              <span className="text-gray-600">Minimum Advance</span>
                              <span className="font-medium text-gray-900">{minimumAdvanceDisplay}</span>
                            </div>
                          )}
                          {hasConfiguredMinimumAdvance && (
                            <div className="flex items-center justify-between py-1.5">
                              <span className="text-gray-600">Remaining Commitment</span>
                              <span className="font-medium text-gray-900">{formatCurrencyPKR(paymentLedgerSummary.remainingCommitment)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {paymentLedgerEntries.length > 0 && (
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Payment Snapshot</div>
                          <div className="space-y-2 text-sm">
                            {paymentLedgerEntries.slice(-5).reverse().map((payment) => (
                              <div key={payment.id} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2">
                                <div>
                                  <div className="font-medium text-gray-900">{formatDatePK(payment.date)} | {payment.type}</div>
                                  <div className="text-xs text-gray-500">{payment.paymentMethod}{payment.reference && payment.reference !== '—' ? ` | ${payment.reference}` : ''}</div>
                                </div>
                                <div className="font-medium text-gray-900">{formatCurrencyPKR(payment.amount)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Signature Section</div>
                        <div className="grid gap-4 md:grid-cols-3 text-sm">
                          <div className="border-t border-gray-400 pt-2">
                            <div className="font-medium text-gray-900">Customer Signature</div>
                          </div>
                          <div className="border-t border-gray-400 pt-2">
                            <div className="font-medium text-gray-900">Company Signature</div>
                          </div>
                          <div className="border-t border-gray-400 pt-2">
                            <div className="font-medium text-gray-900">Date</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SHIFT EVENT */}
              {activeSection === 'shift-event' && (
                <div className="bg-white rounded-lg border border-gray-300 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <ArrowRight className="size-5 text-blue-600" />
                    Shift Event
                  </h2>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded mb-4">
                    <div className="text-xs font-semibold text-blue-900 mb-2">CURRENT RESERVATION</div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-600">Venue:</span>
                        <span className="font-bold text-gray-900 ml-1">{selectedVenue?.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Date:</span>
                        <span className="font-bold text-gray-900 ml-1">
                          {eventDate ? formatDatePK(eventDate) : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Slot:</span>
                        <span className="font-bold text-gray-900 ml-1">{formatTimeRangePK(eventStartTime, eventEndTime)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Guests:</span>
                        <span className="font-bold text-gray-900 ml-1">{guaranteedGuests}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">New Event Date</label>
                      <Input type="date" className="w-full" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">New Start Time</label>
                        <Input type="time" className="w-full" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">New End Time</label>
                        <Input type="time" className="w-full" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">New Prime Venue</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                        <option value="">Select New Venue</option>
                        {venues.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Shift Reason</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Enter reason for shifting the event"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Check className="size-4 mr-2" />
                        Check Availability
                      </Button>
                      <Button className="bg-green-600 hover:bg-green-700 text-white">
                        <ArrowRight className="size-4 mr-2" />
                        Shift Transfer Reservation
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* CANCELLATION DETAILS */}
              {activeSection === 'cancellation' && (
                <div className="bg-white rounded-lg border border-gray-300 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <XCircle className="size-5 text-red-600" />
                    Cancellation Details
                  </h2>

                  <div className="p-4 bg-red-50 border border-red-200 rounded mb-4">
                    <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
                      <AlertTriangle className="size-5" />
                      Warning: This action will cancel the confirmed reservation
                    </div>
                    <div className="text-xs text-red-700">
                    Paid at Booking: {formatCurrencyPKR(paymentLedgerSummary.paidAtBooking)}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Cancellation Date</label>
                      <Input type="date" className="w-full" />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Cancelled By</label>
                      <Input placeholder="Enter name" className="w-full" />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Cancellation Reason</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Enter detailed reason for cancellation"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Refund Type</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                        <option value="full">Full Refund</option>
                        <option value="partial">Partial Refund</option>
                        <option value="adjust">Adjust Next Event</option>
                        <option value="non-refundable">Non-Refundable</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Refund Amount</label>
                        <Input type="number" placeholder="Rs." className="w-full" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Refund Method</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                          <option value="cash">Cash</option>
                          <option value="bank">Bank Transfer</option>
                          <option value="cheque">Cheque</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Deduction Reason</label>
                      <Input placeholder="If partial refund, explain deductions" className="w-full" />
                    </div>

                    <Button className="bg-red-600 hover:bg-red-700 text-white w-full">
                      <XCircle className="size-4 mr-2" />
                      Process Cancellation
                    </Button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {(pendingSectionNavigation || pendingCloseRequest) && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-2xl">
            <div className="border-b border-gray-200 px-5 py-3">
              <h2 className="text-base font-bold text-gray-900">Unsaved Changes</h2>
              <p className="mt-1 text-xs text-gray-600">
                {pendingCloseRequest
                  ? 'You have unsaved changes. What do you want to do?'
                  : 'Save or discard changes before moving to another reservation section.'}
              </p>
            </div>
            <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setPendingSectionNavigation(null);
                  setPendingCloseRequest(null);
                }}
                className="border-gray-300"
              >
                Stay
              </Button>
              <Button
                variant="outline"
                onClick={pendingCloseRequest ? handleDiscardAndClose : handleDiscardAndContinueNavigation}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                {pendingCloseRequest ? 'Discard & Close' : 'Discard Changes'}
              </Button>
              <Button
                onClick={pendingCloseRequest ? handleSaveAndClose : handleSaveAndContinueNavigation}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {pendingCloseRequest ? 'Save & Close' : 'Save & Continue'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {readonlyAgreementEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-blue-900 px-5 py-3 text-white">
              <div>
                <h2 className="text-lg font-bold">Booking Agreement</h2>
                <p className="text-xs text-blue-100">Read-only previous agreement</p>
              </div>
              <button
                type="button"
                onClick={() => setReadonlyAgreementEvent(null)}
                className="rounded p-1.5 hover:bg-blue-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-5 grid gap-3 md:grid-cols-2 text-sm">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Customer Name</div>
                  <div className="mt-1 font-medium text-gray-900">{activeCustomerMatch?.customerName || customerName || '-'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Contact</div>
                  <div className="mt-1 font-medium text-gray-900">{activeCustomerMatch?.primaryPhone || primaryPhone || '-'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Event Type</div>
                  <div className="mt-1 font-medium text-gray-900">{readonlyAgreementEvent.eventType}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Event Date</div>
                  <div className="mt-1 font-medium text-gray-900">{readonlyAgreementEvent.date ? formatDatePK(readonlyAgreementEvent.date) : '-'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Venue</div>
                  <div className="mt-1 font-medium text-gray-900">{readonlyAgreementEvent.venue}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Guests</div>
                  <div className="mt-1 font-medium text-gray-900">{readonlyAgreementEvent.guests.toLocaleString('en-PK')}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Time Slot</div>
                  <div className="mt-1 font-medium text-gray-900">
                    {readonlyAgreementEvent.startTime && readonlyAgreementEvent.endTime
                      ? formatTimeRangePK(readonlyAgreementEvent.startTime, readonlyAgreementEvent.endTime)
                      : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Booking ID</div>
                  <div className="mt-1 font-medium text-gray-900">{readonlyAgreementEvent.id}</div>
                </div>
              </div>

              <div className="rounded-md border border-gray-200">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Financial Summary
                </div>
                <div className="divide-y divide-gray-100 text-sm">
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="font-semibold text-gray-900">{formatCurrencyPKR(readonlyAgreementEvent.totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-gray-600">Paid</span>
                    <span className="font-semibold text-gray-900">{formatCurrencyPKR(readonlyAgreementEvent.paidAmount || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-gray-600">Balance</span>
                    <span className="font-semibold text-gray-900">{formatCurrencyPKR(readonlyAgreementEvent.balance || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-gray-600">Status</span>
                    <span className="font-semibold capitalize text-gray-900">{readonlyAgreementEvent.status || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                This previous agreement is read-only and does not update the current reservation.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AGREEMENT PREVIEW SIDE PANEL */}
      {allowAgreementPreview && showAgreementPreview && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex justify-end">
          <div className="bg-white w-full max-w-4xl h-full overflow-y-auto shadow-2xl">
            {/* Preview Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-6 py-4 flex items-center justify-between z-10 shadow-lg">
              <div>
                <h2 className="text-2xl font-bold">Agreement Preview</h2>
                <p className="text-xs text-blue-100 mt-1">Review all details before printing</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => window.print()}
                  className="bg-white text-blue-900 hover:bg-blue-50"
                >
                  <Printer className="size-4 mr-2" />
                  Print Agreement
                </Button>
                <button
                  onClick={() => setShowAgreementPreview(false)}
                  className="p-2 hover:bg-blue-800 rounded transition-colors"
                >
                  <X className="size-6" />
                </button>
              </div>
            </div>

            {/* Agreement Content */}
            <div className="p-8">
              {/* Company Header */}
              <div className="text-center mb-8 border-b-4 border-blue-900 pb-6">
                <h1 className="text-4xl font-bold text-blue-900 mb-2">VENUEOPS ERP</h1>
                <p className="text-lg text-gray-700 font-semibold">Unified Operations Platform for Banquet, Catering & Hospitality</p>
                <p className="text-sm text-gray-600 mt-2">Main Ferozepur Road • Lahore, Pakistan • +92-XXX-XXXXXXX</p>
              </div>

              {/* Agreement Title */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">BOOKING AGREEMENT</h2>
                <p className="text-sm text-gray-600">Confirmation No: <span className="font-bold text-blue-900">BK-{new Date().getFullYear()}-{String(Math.floor(Math.random() * 10000)).padStart(4, '0')}</span></p>
                <p className="text-sm text-gray-600">Date: {formatDatePK(new Date())}</p>
              </div>

              {/* Customer Information */}
              <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-blue-900 text-white px-4 py-2 font-bold">CUSTOMER INFORMATION</div>
                <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Customer Name:</span>
                    <p className="font-bold text-gray-900">{customerName || '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Primary Contact:</span>
                    <p className="font-bold text-gray-900">{primaryPhone || '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Secondary Contact:</span>
                    <p className="font-bold text-gray-900">{secondaryPhone || '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Address:</span>
                    <p className="font-bold text-gray-900">{address || '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Area / Locality:</span>
                    <p className="font-bold text-gray-900">{area ? `${area}, ${city}` : city}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Reference Source:</span>
                    <p className="font-bold text-gray-900">{referenceSource || '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Referred By:</span>
                    <p className="font-bold text-gray-900">{referredBy || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-blue-900 text-white px-4 py-2 font-bold">EVENT DETAILS</div>
                <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Event Type:</span>
                    <p className="font-bold text-gray-900">{eventType || '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Event Date:</span>
                    <p className="font-bold text-gray-900">{eventDate ? formatDatePK(eventDate) : '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Event Time:</span>
                    <p className="font-bold text-gray-900">{formatTimeRangePK(eventStartTime, eventEndTime)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Booking Manager:</span>
                    <p className="font-bold text-gray-900">{bookingManager || '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Guests:</span>
                    <p className="font-bold text-gray-900">{totalGuests || 0} guests</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Partition Required:</span>
                    <p className="font-bold text-gray-900">{requiresPartition ? 'Yes (Ladies & Gents)' : 'No'}</p>
                  </div>
                  {(menCount > 0 || ladiesCount > 0 || kidsCount > 0) && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Guest Breakdown:</span>
                      <div className="flex gap-4 mt-1">
                        {menCount > 0 && (
                          <span className="font-bold text-gray-900">Men: {menCount}</span>
                        )}
                        {ladiesCount > 0 && (
                          <span className="font-bold text-gray-900">Ladies: {ladiesCount}</span>
                        )}
                        {kidsCount > 0 && (
                          <span className="font-bold text-gray-900">Kids: {kidsCount}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Venue Selection */}
              <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-blue-900 text-white px-4 py-2 font-bold">VENUE SELECTION</div>
                <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Venue:</span>
                    <p className="font-bold text-gray-900">{selectedVenue?.name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Space:</span>
                    <p className="font-bold text-gray-900">
                      {reservedSpaceDisplayLabels.length > 0
                        ? reservedSpaceDisplayLabels.join(' | ')
                        : `${selectedPrimeSpace?.spaceName || '—'}${selectedSubSpace?.spaceName ? ` > ${selectedSubSpace.spaceName}` : ''}`}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Venue Mode:</span>
                    <p className="font-bold text-gray-900">{venueMode}</p>
                  </div>
                </div>
              </div>

              {/* Catering / Services */}
              <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-blue-900 text-white px-4 py-2 font-bold">CATERING / SERVICES</div>
                <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Guaranteed Guests:</span>
                    <p className="font-bold text-gray-900">{guaranteedGuests}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Service Mode:</span>
                    <p className="font-bold text-gray-900">{agreementServiceModeLabel}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Base Per Head Rate:</span>
                    <p className="font-bold text-gray-900">{formatCurrencyPKR(menuSelection.basePerHeadRate)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">{agreementPerHeadRateLabel}:</span>
                    <p className="font-bold text-gray-900">{formatCurrencyPKR(agreementDisplayedPerHeadRate)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">{agreementPackageLabel}:</span>
                    <p className="font-bold text-gray-900">{agreementDisplayedMenuPackage}</p>
                  </div>
                  {menuSelection.discountAmount > 0 && (
                    <div className="col-span-2 rounded border border-amber-200 bg-amber-50 p-3">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-amber-800">Discount:</span>
                          <p className="font-semibold text-amber-950">
                            {formatCurrencyPKR(menuSelection.discountAmount)} ({menuSelection.discountPercent.toFixed(2)}%)
                          </p>
                        </div>
                        <div>
                          <span className="text-amber-800">Given By:</span>
                          <p className="font-semibold text-amber-950">{menuSelection.discountGivenBy || '—'}</p>
                        </div>
                        <div>
                          <span className="text-amber-800">Reason:</span>
                          <p className="font-semibold text-amber-950">{menuSelection.discountReason || '—'}</p>
                        </div>
                        <div>
                          <span className="text-amber-800">Approved By:</span>
                          <p className="font-semibold text-amber-950">{menuSelection.approvedBy || '—'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {menuSelection.items.length > 0 && (
                    <div className="col-span-2 rounded border border-gray-200 bg-gray-50 p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Selected Menu</div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {Object.entries(
                          menuSelection.items.reduce<Record<string, typeof menuSelection.items>>((groups, item) => {
                            if (!groups[item.category]) groups[item.category] = [];
                            groups[item.category].push(item);
                            return groups;
                          }, {})
                        ).map(([category, items]) => (
                          <div key={category}>
                            <div className="text-xs font-semibold text-gray-700">{category}</div>
                            <ul className="mt-1 space-y-1 text-xs text-gray-600">
                              {items.map((item, index) => (
                                <li key={`${item.kitchenItemId}-${index}`}>{item.name}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {menuSelection.serviceMode === 'catering-only' && menuSelection.customerProvidedMenu.length > 0 && (
                    <div className="col-span-2 rounded border border-gray-200 bg-gray-50 p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Customer Provided Menu</div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {menuSelection.customerProvidedMenu.map((item, index) => (
                          <div key={`${item.category}-${index}`}>
                            <div className="text-xs font-semibold text-gray-700">{item.category}</div>
                            <div className="text-xs text-gray-600">{item.itemName || 'â€”'}</div>
                            {item.notes && <div className="text-[11px] text-gray-500">{item.notes}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {menuSelection.missingRequirements.length > 0 && (
                    <div className="col-span-2 rounded border border-amber-200 bg-amber-50 p-3 text-xs">
                      <span className="font-semibold text-amber-900">
                        Missing recommended categories: {menuSelection.missingRequirements.join(', ')}
                      </span>
                      {menuSelection.completenessOverrideNote && (
                        <p className="mt-1 text-amber-800">Override note: {menuSelection.completenessOverrideNote}</p>
                      )}
                    </div>
                  )}
                  <div className="col-span-2 bg-blue-50 p-3 rounded border border-blue-200">
                    <span className="text-gray-700 font-semibold">{agreementTotalLabel}:</span>
                    <p className="text-2xl font-bold text-blue-900">{formatCurrencyPKR(menuTotal)}</p>
                  </div>
                </div>
              </div>

              {/* Food Supplies */}
              {foodSupplies.filter(item => safeNumber(item.quantity) > 0).length > 0 && (
                <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-blue-900 text-white px-4 py-2 font-bold">FOOD SUPPLIES</div>
                  <div className="p-4">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold">Item</th>
                          <th className="text-center py-2 px-3 font-semibold">Qty</th>
                          <th className="text-left py-2 px-3 font-semibold">Unit</th>
                          <th className="text-right py-2 px-3 font-semibold">Rate (Rs.)</th>
                          <th className="text-right py-2 px-3 font-semibold">Total (Rs.)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {foodSupplies.filter(item => safeNumber(item.quantity) > 0).map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="py-2 px-3">{getFoodSupplyLineName(item)}</td>
                            <td className="py-2 px-3 text-center">{safeNumber(item.quantity)}</td>
                            <td className="py-2 px-3">{item.unit || '—'}</td>
                            <td className="py-2 px-3 text-right">{formatCurrencyPKR(item.rate)}</td>
                            <td className="py-2 px-3 text-right font-semibold">{formatCurrencyPKR(safeNumber(item.quantity) * safeNumber(item.rate))}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-blue-50 border-t-2">
                        <tr>
                          <td colSpan={4} className="py-2 px-3 text-right font-bold">Food Supplies Total:</td>
                <td className="py-2 px-3 text-right font-bold text-blue-900">{formatCurrencyPKR(foodSuppliesTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Venue Charges */}
              {venueCharges > 0 && (
                <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-blue-900 text-white px-4 py-2 font-bold">VENUE CHARGES</div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <table className="w-full text-sm">
                          <tbody>
                            <tr className="border-b">
                              <td className="py-2 px-3 text-gray-600">Venue:</td>
                              <td className="py-2 px-3 font-semibold text-gray-900">{selectedVenue?.name}</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 text-gray-600">Space:</td>
                              <td className="py-2 px-3 font-semibold text-gray-900">
                                {reservedSpaceDisplayLabels.length > 0
                                  ? reservedSpaceDisplayLabels.join(' | ')
                                  : `${selectedPrimeSpace?.spaceName || '—'}${selectedSubSpace?.spaceName ? ` > ${selectedSubSpace.spaceName}` : ''}`}
                              </td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 text-gray-600">Venue Mode:</td>
                              <td className="py-2 px-3 font-semibold text-gray-900">{venueMode}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="bg-blue-50 p-4 rounded border border-blue-200 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">Venue Rental Charges</div>
                <div className="text-3xl font-bold text-blue-900">{formatCurrencyPKR(venueCharges)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Support Catering Services */}
              {selectedSupportCatering.length > 0 && (
                <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-blue-900 text-white px-4 py-2 font-bold">SUPPORT CATERING SERVICES</div>
                  <div className="p-4">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold">Item Name</th>
                          <th className="text-left py-2 px-3 font-semibold">Pricing Type</th>
                          <th className="text-center py-2 px-3 font-semibold">Qty/Guests</th>
                          <th className="text-right py-2 px-3 font-semibold">Rate (Rs.)</th>
                          <th className="text-right py-2 px-3 font-semibold">Total (Rs.)</th>
                          <th className="text-center py-2 px-3 font-semibold">Links</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSupportCatering.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="py-2 px-3">{item.itemName}</td>
                            <td className="py-2 px-3">{item.pricingType}</td>
                            <td className="py-2 px-3 text-center">{item.quantity}</td>
                            <td className="py-2 px-3 text-right">{formatCurrencyPKR(item.rate)}</td>
                            <td className="py-2 px-3 text-right font-semibold">{formatCurrencyPKR(item.quantity * item.rate)}</td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex gap-1 justify-center">
                                {item.inventoryLinked && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-semibold">
                                    INV
                                  </span>
                                )}
                                {item.kitchenLinked && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-semibold">
                                    KIT
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-blue-50 border-t-2">
                        <tr>
                          <td colSpan={4} className="py-2 px-3 text-right font-bold">Support Catering Total:</td>
                <td className="py-2 px-3 text-right font-bold text-blue-900">{formatCurrencyPKR(supportCateringTotal)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* RCS Services */}
              {selectedRCSServices.length > 0 && (
                <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-blue-900 text-white px-4 py-2 font-bold">RCS SERVICES</div>
                  <div className="p-4">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold">Source</th>
                          <th className="text-left py-2 px-3 font-semibold">Category</th>
                          <th className="text-left py-2 px-3 font-semibold">Service</th>
                          <th className="text-center py-2 px-3 font-semibold">Qty</th>
                          <th className="text-right py-2 px-3 font-semibold">Rate (Rs.)</th>
                          <th className="text-right py-2 px-3 font-semibold">Total (Rs.)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRCSServices.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="py-2 px-3">{item.source}</td>
                            <td className="py-2 px-3">{item.categoryName || '-'}</td>
                            <td className="py-2 px-3">
                              <div>{item.serviceName}</div>
                              {item.unitType && (
                                <div className="text-xs text-gray-500">Unit: {item.unitType}</div>
                              )}
                              {item.source === 'Outsource' && item.vendorName && (
                                <div className="text-xs text-gray-500">Vendor: {item.vendorName}</div>
                              )}
                              {item.notes && (
                                <div className="text-xs text-gray-500">{item.notes}</div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">{safeNumber(item.quantity)}</td>
                            <td className="py-2 px-3 text-right">{formatCurrencyPKR(item.price)}</td>
                            <td className="py-2 px-3 text-right font-semibold">{formatCurrencyPKR(safeNumber(item.quantity) * safeNumber(item.price))}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-blue-50 border-t-2">
                        <tr>
                          <td colSpan={5} className="py-2 px-3 text-right font-bold">RCS Services Total:</td>
                <td className="py-2 px-3 text-right font-bold text-blue-900">{formatCurrencyPKR(rcsTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Additional Charges */}
              {additionalCharges.length > 0 && (
                <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-blue-900 text-white px-4 py-2 font-bold">ADDITIONAL CHARGES</div>
                  <div className="p-4">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold">Charge Type</th>
                          <th className="text-left py-2 px-3 font-semibold">Description</th>
                          <th className="text-center py-2 px-3 font-semibold">Quantity</th>
                          <th className="text-right py-2 px-3 font-semibold">Rate (Rs.)</th>
                          <th className="text-right py-2 px-3 font-semibold">Total (Rs.)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {additionalCharges.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="py-2 px-3">{getAdditionalChargeTypeName(item, additionalChargeTypes)}</td>
                            <td className="py-2 px-3">{item.description || '-'}</td>
                            <td className="py-2 px-3 text-center">{safeNumber(item.quantity)}</td>
                            <td className="py-2 px-3 text-right">{formatCurrencyPKR(item.rate)}</td>
                            <td className="py-2 px-3 text-right font-semibold">{formatCurrencyPKR(calculateAdditionalChargeTotal(item.quantity, item.rate))}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-blue-50 border-t-2">
                        <tr>
                          <td colSpan={4} className="py-2 px-3 text-right font-bold">Additional Charges Total:</td>
                <td className="py-2 px-3 text-right font-bold text-blue-900">{formatCurrencyPKR(additionalChargesTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Financial Summary */}
              <div className="mb-6 border-2 border-blue-900 rounded-lg overflow-hidden">
                <div className="bg-blue-900 text-white px-4 py-3 font-bold text-lg">FINANCIAL SUMMARY</div>
                <div className="p-4">
                  <table className="w-full text-base">
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3 px-3 text-gray-700">Catering Charges</td>
                <td className="py-3 px-3 text-right font-semibold text-gray-900">{formatCurrencyPKR(menuTotal)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-3 text-gray-700">Food Supplies</td>
                <td className="py-3 px-3 text-right font-semibold text-gray-900">{formatCurrencyPKR(foodSuppliesTotal)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-3 text-gray-700">Venue Charges</td>
                <td className="py-3 px-3 text-right font-semibold text-gray-900">{formatCurrencyPKR(venueCharges)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-3 text-gray-700">Support Catering Services</td>
                <td className="py-3 px-3 text-right font-semibold text-gray-900">{formatCurrencyPKR(supportCateringTotal)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-3 text-gray-700">RCS Services</td>
                <td className="py-3 px-3 text-right font-semibold text-gray-900">{formatCurrencyPKR(rcsTotal)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-3 text-gray-700">Additional Charges</td>
                <td className="py-3 px-3 text-right font-semibold text-gray-900">{formatCurrencyPKR(additionalChargesTotal)}</td>
                      </tr>
                      <tr className="border-t-4 border-blue-900 bg-blue-50">
                        <td className="py-4 px-3 font-bold text-gray-900 text-xl">GRAND TOTAL</td>
                <td className="py-4 px-3 text-right font-bold text-blue-900 text-2xl">{formatCurrencyPKR(grandTotal)}</td>
                      </tr>
                      <tr className="border-b bg-slate-50">
                        <td className="py-3 px-3 font-semibold text-gray-900">First Amount Paid On</td>
                <td className="py-3 px-3 text-right font-semibold text-slate-700">{firstAmountPaidOnDisplay}</td>
                      </tr>
                      <tr className="border-b bg-green-50">
                        <td className="py-3 px-3 font-semibold text-gray-900 text-lg">Paid at Booking</td>
                <td className="py-3 px-3 text-right font-bold text-green-700 text-xl">{formatCurrencyPKR(paymentLedgerSummary.paidAtBooking)}</td>
                      </tr>
                      <tr className="bg-red-50">
                        <td className="py-3 px-3 font-semibold text-gray-900 text-lg">Remaining Balance</td>
                <td className="py-3 px-3 text-right font-bold text-red-700 text-xl">{formatCurrencyPKR(paymentLedgerSummary.remainingBalance)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Ledger */}
              {payments.length > 0 && (
                <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-blue-900 text-white px-4 py-2 font-bold">PAYMENT HISTORY</div>
                  <div className="p-4">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold">Date</th>
                          <th className="text-left py-2 px-3 font-semibold">Type</th>
                          <th className="text-right py-2 px-3 font-semibold">Amount (Rs.)</th>
                          <th className="text-left py-2 px-3 font-semibold">Method</th>
                          <th className="text-left py-2 px-3 font-semibold">Received By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment, index) => (
                          <tr key={index} className="border-t">
                            <td className="py-2 px-3">{payment.date}</td>
                            <td className="py-2 px-3">{payment.type}</td>
                            <td className="py-2 px-3 text-right font-semibold">{formatCurrencyPKR(payment.amount)}</td>
                            <td className="py-2 px-3">{payment.method}</td>
                            <td className="py-2 px-3">{payment.receivedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {hasAdvanceExceptionApproval && (
                <div className="mb-6 border border-amber-300 rounded-lg overflow-hidden">
                  <div className="bg-amber-600 text-white px-4 py-2 font-bold">ADVANCE EXCEPTION APPROVAL</div>
                  <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Approved By:</span>
                      <p className="font-bold text-gray-900">{advanceExceptionApprovedByDisplay}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Approval Date:</span>
                      <p className="font-bold text-gray-900">{advanceExceptionApprovalDateDisplay}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Conditions / Reason:</span>
                      <p className="font-bold text-gray-900">{advanceExceptionReason || initialData?.approvalNotes || 'Management-approved zero/low advance reservation.'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Terms & Conditions */}
              <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-blue-900 text-white px-4 py-2 font-bold">TERMS & CONDITIONS</div>
                <div className="p-4 text-xs text-gray-700 space-y-2">
                  <p>1. The client confirms the booking by paying the advance amount as per company policy.</p>
                  <p>2. Balance payment must be cleared before the event date or as per agreed terms.</p>
                  <p>3. Guest count changes must be communicated 48 hours before the event.</p>
                  <p>4. Cancellation policy applies as per booking date and advance received.</p>
                  <p>5. The venue management reserves the right to charge for any damages caused during the event.</p>
                  <p>6. Client is responsible for the behavior of their guests during the event.</p>
                  <p>7. Management is not responsible for personal belongings of guests.</p>
                  <p>8. All disputes are subject to Lahore jurisdiction only.</p>
                </div>
              </div>

              {/* Signature Section */}
              <div className="grid grid-cols-2 gap-8 mt-12 mb-6">
                <div className="border-t-2 border-gray-400 pt-2">
                  <p className="text-sm font-bold text-gray-900">Customer Signature</p>
                  <p className="text-xs text-gray-600 mt-1">Name: {customerName}</p>
                  <p className="text-xs text-gray-600">Date: _______________</p>
                </div>
                <div className="border-t-2 border-gray-400 pt-2">
                  <p className="text-sm font-bold text-gray-900">Authorized Signature</p>
                  <p className="text-xs text-gray-600 mt-1">Name: {bookingManager}</p>
            <p className="text-xs text-gray-600">Date: {formatDatePK(new Date())}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-gray-500 border-t pt-4 mt-8">
                <p>This is a computer-generated document and is valid without signature.</p>
                <p className="mt-1">VenueOps ERP - Unified Operations Platform for Banquet, Catering & Hospitality</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTentativeConflictDialog && pendingBookingData && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl border border-amber-300 overflow-hidden">
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
              <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                <AlertTriangle className="size-5" />
                Tentative Inquiries Found for This Slot
              </h2>
              <p className="text-sm text-amber-800 mt-1">
                You can continue with the confirmed reservation. These inquiries do not reserve inventory and will remain visible for follow-up.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Selected slot:
                {' '}
                <span className="font-semibold">
                  {formatDatePK(eventDate)} • {formatTimeRangePK(eventStartTime, eventEndTime)} • {selectedVenue?.name || 'Venue'}
                </span>
              </div>

              <div className="overflow-hidden rounded border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Customer</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Event</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Time</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">Guests</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Follow-Up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tentativeConflicts.map((booking) => (
                      <tr key={booking.id} className="border-t">
                        <td className="px-4 py-3 font-medium text-gray-900">{booking.customerName}</td>
                        <td className="px-4 py-3 text-gray-700">{booking.eventType || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{formatTimeRangePK(booking.startTime, booking.endTime)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{booking.guestCount || 0}</td>
                        <td className="px-4 py-3 text-gray-700">{booking.callbackDate ? formatDatePK(booking.callbackDate) : 'Not set'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTentativeConflictDialog(false);
                    setPendingBookingData(null);
                    setTentativeConflicts([]);
                  }}
                >
                  Go Back
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => {
                    saveConfirmedReservation(pendingBookingData);
                    setShowTentativeConflictDialog(false);
                    setPendingBookingData(null);
                    setTentativeConflicts([]);
                  }}
                >
                  Confirm and Keep Inquiries Visible
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}







