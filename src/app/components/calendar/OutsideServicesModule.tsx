import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  DollarSign,
  FileText,
  History,
  MapPin,
  Package,
  Pencil,
  Plus,
  Receipt,
  Save,
  Search,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
  Users,
  Warehouse,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Booking } from './types-v2';
import { ServiceBooking, type ServiceType } from './service-types';
import { formatCurrencyPKR, formatDatePK } from '../../lib/locale';
import { type Customer, SAMPLE_CUSTOMERS } from '../customers/customer-types';
import { usePersistedWorkflowState, WORKFLOW_STATE_KEYS } from '../../lib/workflowState';
import { isDishAvailableForUsage } from '../kitchen/dishUsage';
import type { Dish, MenuPackage } from '../kitchen/types';
import { loadSetupRcsCategories, loadSetupRcsServices } from '../erp/setup/setupMasterData';

type DateWindow = 'today' | 'week' | 'month';
type ViewMode = 'list' | 'calendar';
type SectionKey =
  | 'customer-info'
  | 'supply-details'
  | 'food-supplies'
  | 'food-catering'
  | 'rcs-services'
  | 'rental-items'
  | 'misc-charges'
  | 'payment-ledger'
  | 'agreement'
  | 'shift-supply-date'
  | 'cancellation'
  | 'history-log';

type SupplyTypeLabel =
  | 'Food Supply'
  | 'Food & Catering'
  | 'RCS Services'
  | 'Rental Items'
  | 'Mixed Services';

type EditableCollectionKey =
  | 'foodSupplies'
  | 'cateringItems'
  | 'rcsServices'
  | 'rentalItems'
  | 'miscCharges'
  | 'payments';

interface FoodSupplyLine {
  id: string;
  item: string;
  kitchenItemId?: string;
  variantId?: string;
  variantLabel?: string;
  quantity: number;
  rate: number;
  total: number;
  dispatchNotes: string;
}

interface CateringLine {
  id: string;
  packageName: string;
  packageId?: string;
  guestCount: number;
  rate: number;
  total: number;
  serviceStaff: number;
  setupNotes: string;
}

interface RcsLine {
  id: string;
  masterServiceId?: string;
  serviceType: string;
  quantity: number;
  charges: number;
  total: number;
  notes: string;
}

interface RentalLine {
  id: string;
  category: string;
  itemName: string;
  issueQuantity: number;
  returnQuantity: number;
  damagedQuantity: number;
  pendingQuantity: number;
  rate: number;
  total: number;
}

interface MiscChargeLine {
  id: string;
  label: string;
  amount: number;
  notes: string;
}

interface PaymentLedgerEntry {
  id: string;
  date: string;
  type: string;
  method: string;
  reference: string;
  amount: number;
  receivedBy: string;
  notes: string;
}

interface CancellationDetails {
  reason: string;
  cancelledBy: string;
  cancelledOn: string;
  rollbackInventory: boolean;
  rollbackDispatch: boolean;
}

interface HistoryEntry {
  id: string;
  timestamp: string;
  action: string;
  section: string;
  description: string;
}

interface OrderDraft {
  id: string;
  createdAt: string;
  status: 'confirmed' | 'cancelled';
  customerId?: string;
  customerName: string;
  primaryPhone: string;
  secondaryPhone: string;
  address: string;
  area: string;
  city: string;
  referenceSource: string;
  reference: string;
  approvedBy: string;
  creditReference: string;
  remarks: string;
  supplyDate: string;
  deliveryTime: string;
  pickupTime: string;
  sameDeliveryAndPickupTime: boolean;
  supplyType: SupplyTypeLabel;
  useCustomerAddressForSupply: boolean;
  supplyLocation: string;
  supplyArea: string;
  supplyCity: string;
  deliveryInstructions: string;
  internalNotes: string;
  foodSupplies: FoodSupplyLine[];
  cateringItems: CateringLine[];
  rcsServices: RcsLine[];
  rentalItems: RentalLine[];
  miscCharges: MiscChargeLine[];
  payments: PaymentLedgerEntry[];
  agreementNotes: string;
  historyLog: HistoryEntry[];
  cancellation: CancellationDetails;
}

interface CustomerSearchRecord {
  id: string;
  customerName: string;
  primaryPhone: string;
  secondaryPhone?: string;
  address?: string;
  area?: string;
  city?: string;
  referenceSource?: string;
  previousOrders: number;
}

interface OutsideServicesModuleProps {
  bookings: Booking[];
  serviceBookings: ServiceBooking[];
  dishes: Dish[];
  menuPackages: MenuPackage[];
  onServiceBookingsChange: (bookings: ServiceBooking[]) => void;
}

const DEFAULT_CITY = 'Lahore';
const SUPPLY_TYPE_OPTIONS: SupplyTypeLabel[] = [
  'Food Supply',
  'Food & Catering',
  'RCS Services',
  'Rental Items',
  'Mixed Services',
];

const SECTION_CONFIG: Array<{ key: SectionKey; label: string; icon: any }> = [
  { key: 'customer-info', label: 'Customer Information', icon: Users },
  { key: 'supply-details', label: 'Supply Details', icon: Truck },
  { key: 'food-supplies', label: 'Food Supplies', icon: Package },
  { key: 'food-catering', label: 'Food & Catering', icon: ShoppingBag },
  { key: 'rcs-services', label: 'RCS Services', icon: ShieldCheck },
  { key: 'rental-items', label: 'Rental Items', icon: Warehouse },
  { key: 'misc-charges', label: 'Miscellaneous Charges', icon: Receipt },
  { key: 'payment-ledger', label: 'Payment Ledger', icon: DollarSign },
  { key: 'agreement', label: 'Outside Services Agreement', icon: FileText },
  { key: 'shift-supply-date', label: 'Shift Supply Date', icon: CalendarDays },
  { key: 'cancellation', label: 'Cancellation Details', icon: XCircle },
  { key: 'history-log', label: 'History Log', icon: History },
];

const normalizeText = (value?: string) => (value || '').trim().toLowerCase();
const normalizePhone = (value?: string) => (value || '').replace(/\D/g, '');
const safeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

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
  const variants = getFoodSupplyDishVariants(dish);
  return variants.find((variant) => variant.id === variantId) || getDishDefaultVariant(dish) || variants[0];
};

const getFoodSupplyDishRate = (dish: Dish, variantId?: string) =>
  safeNumber(getFoodSupplyDishVariant(dish, variantId)?.sellingPrice ?? dish.defaultSellingPrice ?? dish.sellingPrice);

const getFoodSupplyDishVariantLabel = (dish: Dish, variantId?: string) =>
  String(getFoodSupplyDishVariant(dish, variantId)?.label || getFoodSupplyDishVariant(dish, variantId)?.variantLabel || '').trim();

const getFoodSupplyLineDisplayName = (line: FoodSupplyLine) =>
  line.variantLabel ? `${line.item || '-'} (${line.variantLabel})` : line.item || '-';

const padNumber = (value: number) => value.toString().padStart(2, '0');

const formatInputDate = (value: Date | string | undefined) => {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
};

const toDateKey = (value: Date | string | undefined) => formatInputDate(value);

const parseDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const getRcsSetupServiceName = (value: any) => String(value?.serviceName || value?.name || '').trim();

const shiftDate = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const shiftMonth = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const startOfWeek = (date: Date) => {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfWeek = (date: Date) => {
  const next = startOfWeek(date);
  next.setDate(next.getDate() + 6);
  next.setHours(23, 59, 59, 999);
  return next;
};

const startOfMonth = (date: Date) => {
  const next = new Date(date.getFullYear(), date.getMonth(), 1);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfMonth = (date: Date) => {
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  next.setHours(23, 59, 59, 999);
  return next;
};

const compareTime = (left?: string, right?: string) => (left || '').localeCompare(right || '');

const buildFoodSupplyLine = (source: Partial<FoodSupplyLine>): FoodSupplyLine => {
  const quantity = safeNumber(source.quantity);
  const rate = safeNumber(source.rate);
  return {
    id: source.id || createId('food'),
    item: source.item || '',
    kitchenItemId: source.kitchenItemId,
    variantId: source.variantId,
    variantLabel: source.variantLabel,
    quantity,
    rate,
    total: quantity * rate,
    dispatchNotes: source.dispatchNotes || '',
  };
};

const buildCateringLine = (source: Partial<CateringLine>): CateringLine => {
  const guestCount = safeNumber(source.guestCount);
  const rate = safeNumber(source.rate);
  return {
    id: source.id || createId('catering'),
    packageName: source.packageName || '',
    packageId: source.packageId,
    guestCount,
    rate,
    total: guestCount * rate,
    serviceStaff: safeNumber(source.serviceStaff),
    setupNotes: source.setupNotes || '',
  };
};

const buildRcsLine = (source: Partial<RcsLine>): RcsLine => {
  const quantity = safeNumber(source.quantity);
  const charges = safeNumber(source.charges);
  return {
    id: source.id || createId('rcs'),
    masterServiceId: source.masterServiceId,
    serviceType: source.serviceType || '',
    quantity,
    charges,
    total: quantity * charges,
    notes: source.notes || '',
  };
};

const buildRentalLine = (source: Partial<RentalLine>): RentalLine => {
  const issueQuantity = safeNumber(source.issueQuantity);
  const returnQuantity = safeNumber(source.returnQuantity);
  const damagedQuantity = safeNumber(source.damagedQuantity);
  const pendingQuantity =
    source.pendingQuantity !== undefined
      ? safeNumber(source.pendingQuantity)
      : Math.max(issueQuantity - returnQuantity - damagedQuantity, 0);
  const rate = safeNumber(source.rate);
  return {
    id: source.id || createId('rental'),
    category: source.category || '',
    itemName: source.itemName || '',
    issueQuantity,
    returnQuantity,
    damagedQuantity,
    pendingQuantity,
    rate,
    total: issueQuantity * rate,
  };
};

const buildMiscChargeLine = (source: Partial<MiscChargeLine>): MiscChargeLine => ({
  id: source.id || createId('misc'),
  label: source.label || '',
  amount: safeNumber(source.amount),
  notes: source.notes || '',
});

const buildPaymentEntry = (source: Partial<PaymentLedgerEntry>): PaymentLedgerEntry => ({
  id: source.id || createId('payment'),
  date: source.date || formatInputDate(new Date()),
  type: source.type || 'Payment',
  method: source.method || 'Cash',
  reference: source.reference || '',
  amount: safeNumber(source.amount),
  receivedBy: source.receivedBy || '',
  notes: source.notes || '',
});

const computeDraftTotals = (draft: OrderDraft) => {
  const foodSuppliesTotal = draft.foodSupplies.reduce((sum, line) => sum + safeNumber(line.total), 0);
  const cateringTotal = draft.cateringItems.reduce((sum, line) => sum + safeNumber(line.total), 0);
  const rcsTotal = draft.rcsServices.reduce((sum, line) => sum + safeNumber(line.total), 0);
  const rentalTotal = draft.rentalItems.reduce((sum, line) => sum + safeNumber(line.total), 0);
  const miscTotal = draft.miscCharges.reduce((sum, line) => sum + safeNumber(line.amount), 0);
  const grandTotal = foodSuppliesTotal + cateringTotal + rcsTotal + rentalTotal + miscTotal;
  const paid = draft.payments.reduce((sum, line) => sum + safeNumber(line.amount), 0);
  return {
    foodSuppliesTotal,
    cateringTotal,
    rcsTotal,
    rentalTotal,
    miscTotal,
    grandTotal,
    paid,
    balance: Math.max(grandTotal - paid, 0),
  };
};

const inferSupplyType = (booking: ServiceBooking): SupplyTypeLabel => {
  switch (booking.serviceType) {
    case 'food-supply':
      return 'Food Supply';
    case 'outdoor-catering':
      return 'Food & Catering';
    case 'rental-services':
      return 'Rental Items';
    case 'mixed-package':
      return 'Mixed Services';
    default:
      return 'RCS Services';
  }
};

const deriveServiceType = (draft: OrderDraft): ServiceType => {
  if (draft.supplyType === 'Rental Items') return 'rental-services';
  if (draft.supplyType === 'Food Supply') return 'food-supply';
  if (draft.supplyType === 'Food & Catering') return 'outdoor-catering';
  if (
    draft.foodSupplies.length > 0 &&
    (draft.cateringItems.length > 0 || draft.rcsServices.length > 0 || draft.rentalItems.length > 0)
  ) {
    return 'mixed-package';
  }
  if (draft.rcsServices.length > 0 || draft.miscCharges.length > 0) return 'mixed-package';
  return 'food-supply';
};

const getTodayDraft = (): OrderDraft => ({
  id: createId('outside-order'),
  createdAt: new Date().toISOString(),
  status: 'confirmed',
  customerName: '',
  primaryPhone: '',
  secondaryPhone: '',
  address: '',
  area: '',
  city: DEFAULT_CITY,
  referenceSource: 'Reference',
  reference: '',
  approvedBy: '',
  creditReference: '',
  remarks: '',
  supplyDate: formatInputDate(new Date()),
  deliveryTime: '12:00',
  pickupTime: '12:00',
  sameDeliveryAndPickupTime: true,
  supplyType: 'Food Supply',
  useCustomerAddressForSupply: true,
  supplyLocation: '',
  supplyArea: '',
  supplyCity: DEFAULT_CITY,
  deliveryInstructions: '',
  internalNotes: '',
  foodSupplies: [],
  cateringItems: [],
  rcsServices: [],
  rentalItems: [],
  miscCharges: [],
  payments: [],
  agreementNotes:
    'All outside service items will be dispatched as approved. Balance remains payable after supply completion unless otherwise approved in writing.',
  historyLog: [],
  cancellation: {
    reason: '',
    cancelledBy: '',
    cancelledOn: formatInputDate(new Date()),
    rollbackInventory: true,
    rollbackDispatch: true,
  },
});

const normalizeOrderDraft = (booking?: ServiceBooking): OrderDraft => {
  if (!booking) {
    return getTodayDraft();
  }

  const source = booking as ServiceBooking & Record<string, any>;
  const mappedFoodSupplies = Array.isArray(source.foodSupplies)
    ? source.foodSupplies.map((line: Partial<FoodSupplyLine>) => buildFoodSupplyLine(line))
    : source.menuType || source.menuRate
      ? [
          buildFoodSupplyLine({
            item: source.menuType || 'Food Supply',
            quantity: safeNumber(source.guestCount),
            rate: safeNumber(source.menuRate),
            dispatchNotes: source.notes || '',
          }),
        ]
      : [];

  const mappedCatering = Array.isArray(source.cateringItems)
    ? source.cateringItems.map((line: Partial<CateringLine>) => buildCateringLine(line))
    : booking.serviceType === 'outdoor-catering'
      ? [
          buildCateringLine({
            packageName: source.menuType || source.eventType || 'Catering Package',
            guestCount: safeNumber(source.guestCount),
            rate: safeNumber(source.menuRate),
            serviceStaff: safeNumber(source.serversRequired),
            setupNotes: source.notes || '',
          }),
        ]
      : [];

  const mappedRcs = Array.isArray(source.rcsServices)
    ? source.rcsServices.map((line: Partial<RcsLine>) => buildRcsLine(line))
    : [];

  const mappedRentals = Array.isArray(source.rentalItems)
    ? source.rentalItems.map((line: Partial<RentalLine>) => buildRentalLine(line))
    : Array.isArray(source.items)
      ? source.items.map((line: any) =>
          buildRentalLine({
            category: line.category,
            itemName: line.itemName,
            issueQuantity: safeNumber(line.quantity),
            rate: safeNumber(line.unitRate),
          }),
        )
      : [];

  const mappedMisc = Array.isArray(source.miscCharges)
    ? source.miscCharges.map((line: Partial<MiscChargeLine>) => buildMiscChargeLine(line))
    : source.deliveryCharges
      ? [
          buildMiscChargeLine({
            label: 'Delivery Charges',
            amount: safeNumber(source.deliveryCharges),
          }),
        ]
      : [];

  const mappedPayments = Array.isArray(source.payments)
    ? source.payments.map((line: Partial<PaymentLedgerEntry>) => buildPaymentEntry(line))
    : safeNumber(source.paidAmount) > 0
      ? [
          buildPaymentEntry({
            date: formatInputDate(source.createdAt || new Date()),
            method: 'Cash',
            amount: safeNumber(source.paidAmount),
            notes: 'Imported payment',
          }),
        ]
      : [];

  const normalizedCustomerAddress = normalizeText(source.address || source.deliveryAddress || source.eventLocation || '');
  const normalizedSupplyAddress = normalizeText(source.supplyLocation || source.deliveryAddress || source.eventLocation || '');
  const normalizedCustomerArea = normalizeText(source.area || source.deliveryArea || source.eventArea || '');
  const normalizedSupplyArea = normalizeText(source.supplyArea || source.deliveryArea || source.eventArea || '');
  const resolvedDeliveryTime = source.deliveryTime || booking.startTime || '12:00';
  const resolvedPickupTime = source.pickupTime || booking.endTime || booking.startTime || resolvedDeliveryTime;
  const sameDeliveryAndPickupTime =
    source.sameDeliveryAndPickupTime !== undefined
      ? Boolean(source.sameDeliveryAndPickupTime)
      : resolvedPickupTime === resolvedDeliveryTime;
  const useCustomerAddressForSupply =
    source.useCustomerAddressForSupply !== undefined
      ? Boolean(source.useCustomerAddressForSupply)
      : normalizedCustomerAddress.length > 0 &&
        normalizedCustomerAddress === normalizedSupplyAddress &&
        normalizedCustomerArea === normalizedSupplyArea;

  return {
    id: booking.id,
    createdAt:
      typeof booking.createdAt === 'string'
        ? booking.createdAt
        : booking.createdAt instanceof Date
          ? booking.createdAt.toISOString()
          : new Date().toISOString(),
    status: booking.status === 'cancelled' ? 'cancelled' : 'confirmed',
    customerId: source.customerId,
    customerName: booking.customerName || '',
    primaryPhone: booking.contactNumber || '',
    secondaryPhone: source.secondaryPhone || '',
    address: source.address || source.deliveryAddress || source.eventLocation || '',
    area: source.area || source.deliveryArea || source.eventArea || '',
    city: source.city || source.deliveryCity || source.eventCity || DEFAULT_CITY,
    referenceSource: source.referenceSource || source.bookingSource || 'Reference',
    reference: source.reference || '',
    approvedBy: source.approvedBy || '',
    creditReference: source.creditReference || '',
    remarks: source.remarks || booking.notes || '',
    supplyDate: formatInputDate(source.supplyDate || booking.date),
    deliveryTime: resolvedDeliveryTime,
    pickupTime: sameDeliveryAndPickupTime ? resolvedDeliveryTime : resolvedPickupTime,
    sameDeliveryAndPickupTime,
    supplyType: source.supplyType || inferSupplyType(booking),
    useCustomerAddressForSupply,
    supplyLocation: source.supplyLocation || source.deliveryAddress || source.eventLocation || '',
    supplyArea: source.supplyArea || source.deliveryArea || source.eventArea || '',
    supplyCity: source.supplyCity || source.deliveryCity || source.eventCity || source.city || DEFAULT_CITY,
    deliveryInstructions: source.deliveryInstructions || '',
    internalNotes: source.internalNotes || booking.notes || '',
    foodSupplies: mappedFoodSupplies,
    cateringItems: mappedCatering,
    rcsServices: mappedRcs,
    rentalItems: mappedRentals,
    miscCharges: mappedMisc,
    payments: mappedPayments,
    agreementNotes: source.agreementNotes || getTodayDraft().agreementNotes,
    historyLog: Array.isArray(source.historyLog)
      ? source.historyLog
      : [
          {
            id: createId('history'),
            timestamp: typeof booking.createdAt === 'string' ? booking.createdAt : new Date().toISOString(),
            action: 'Imported order',
            section: 'History Log',
            description: 'Existing outside service order loaded into the dispatch workflow.',
          },
        ],
    cancellation: {
      reason: source.cancellation?.reason || '',
      cancelledBy: source.cancellation?.cancelledBy || '',
      cancelledOn: source.cancellation?.cancelledOn || formatInputDate(new Date()),
      rollbackInventory:
        source.cancellation?.rollbackInventory !== undefined ? Boolean(source.cancellation.rollbackInventory) : true,
      rollbackDispatch:
        source.cancellation?.rollbackDispatch !== undefined ? Boolean(source.cancellation.rollbackDispatch) : true,
    },
  };
};

const buildCustomerSearchRecords = (
  bookings: Booking[],
  serviceBookings: ServiceBooking[],
  customers: Customer[],
): CustomerSearchRecord[] => {
  const records = new Map<string, CustomerSearchRecord>();

  customers.forEach((customer) => {
    const key = normalizePhone(customer.primaryContact) || normalizeText(customer.customerName) || customer.id;
    if (!key) return;
    records.set(key, {
      id: customer.id,
      customerName: customer.customerName,
      primaryPhone: customer.primaryContact,
      secondaryPhone: customer.secondaryContact,
      address: customer.address,
      area: customer.area,
      city: customer.city || DEFAULT_CITY,
      referenceSource: customer.tags?.[0] || customer.paymentTerms || 'Customer Database',
      previousOrders: safeNumber(customer.totalBookings),
    });
  });

  bookings.forEach((booking) => {
    const key = normalizePhone(booking.contactNumber || booking.customerPhone) || normalizeText(booking.customerName);
    if (!key) return;
    const existing = records.get(key);
    records.set(key, {
      id: existing?.id || booking.customerId || `booking-${key}`,
      customerName: existing?.customerName || booking.customerName || 'Customer',
      primaryPhone: existing?.primaryPhone || booking.contactNumber || booking.customerPhone || '',
      secondaryPhone: existing?.secondaryPhone || (booking as any).secondaryPhone || '',
      address: existing?.address || (booking as any).address || '',
      area: existing?.area || (booking as any).area || '',
      city: existing?.city || (booking as any).city || DEFAULT_CITY,
      referenceSource: existing?.referenceSource || (booking as any).referenceSource || 'Reservation',
      previousOrders: safeNumber(existing?.previousOrders) + 1,
    });
  });

  serviceBookings.forEach((booking) => {
    const source = booking as ServiceBooking & Record<string, any>;
    const key = normalizePhone(booking.contactNumber) || normalizeText(booking.customerName);
    if (!key) return;
    const existing = records.get(key);
    records.set(key, {
      id: existing?.id || source.customerId || `service-${key}`,
      customerName: existing?.customerName || booking.customerName || 'Customer',
      primaryPhone: existing?.primaryPhone || booking.contactNumber || '',
      secondaryPhone: existing?.secondaryPhone || source.secondaryPhone || '',
      address: existing?.address || source.address || source.deliveryAddress || source.eventLocation || '',
      area: existing?.area || source.area || source.deliveryArea || source.eventArea || '',
      city: existing?.city || source.city || source.deliveryCity || source.eventCity || DEFAULT_CITY,
      referenceSource: existing?.referenceSource || source.referenceSource || 'Outside Services',
      previousOrders: safeNumber(existing?.previousOrders) + 1,
    });
  });

  return Array.from(records.values()).sort((left, right) => left.customerName.localeCompare(right.customerName));
};

const summarizeGuestOrQuantity = (draft: OrderDraft) => {
  const guestCount = draft.cateringItems.reduce((sum, line) => sum + safeNumber(line.guestCount), 0);
  if (guestCount > 0) {
    return `${guestCount.toLocaleString('en-PK')} guests`;
  }

  const foodQuantity = draft.foodSupplies.reduce((sum, line) => sum + safeNumber(line.quantity), 0);
  const rentalQuantity = draft.rentalItems.reduce((sum, line) => sum + safeNumber(line.issueQuantity), 0);
  const rcsQuantity = draft.rcsServices.reduce((sum, line) => sum + safeNumber(line.quantity), 0);
  const quantity = foodQuantity + rentalQuantity + rcsQuantity;
  return quantity > 0 ? `${quantity.toLocaleString('en-PK')} qty` : 'As required';
};

const buildHistoryEntries = (
  previousDraft: OrderDraft | null,
  nextDraft: OrderDraft,
  shiftReason: string,
): HistoryEntry[] => {
  const timestamp = new Date().toISOString();
  if (!previousDraft) {
    return [
      {
        id: createId('history'),
        timestamp,
        action: 'Created order',
        section: 'History Log',
        description: `Outside service order created for ${nextDraft.customerName || 'customer'} on ${nextDraft.supplyDate}.`,
      },
    ];
  }

  const entries: HistoryEntry[] = [];
  const customerChanged =
    previousDraft.customerName !== nextDraft.customerName ||
    previousDraft.primaryPhone !== nextDraft.primaryPhone ||
    previousDraft.reference !== nextDraft.reference ||
    previousDraft.approvedBy !== nextDraft.approvedBy ||
    previousDraft.creditReference !== nextDraft.creditReference;
  if (customerChanged) {
    entries.push({
      id: createId('history'),
      timestamp,
      action: 'Customer/reference changes',
      section: 'Customer Information',
      description: 'Customer identity or reference approval details were updated.',
    });
  }

  const scheduleChanged =
    previousDraft.supplyDate !== nextDraft.supplyDate ||
    previousDraft.deliveryTime !== nextDraft.deliveryTime ||
    previousDraft.pickupTime !== nextDraft.pickupTime;
  if (scheduleChanged) {
    entries.push({
      id: createId('history'),
      timestamp,
      action: 'Supply date/time changes',
      section: 'Shift Supply Date',
      description: shiftReason.trim()
        ? `Supply schedule shifted. Reason: ${shiftReason.trim()}.`
        : `Supply schedule changed from ${previousDraft.supplyDate} ${previousDraft.deliveryTime}-${previousDraft.pickupTime} to ${nextDraft.supplyDate} ${nextDraft.deliveryTime}-${nextDraft.pickupTime}.`,
    });
  }

  const itemQuantityChanged =
    JSON.stringify(previousDraft.foodSupplies.map((line) => [line.item, line.quantity])) !==
      JSON.stringify(nextDraft.foodSupplies.map((line) => [line.item, line.quantity])) ||
    JSON.stringify(previousDraft.cateringItems.map((line) => [line.packageName, line.guestCount])) !==
      JSON.stringify(nextDraft.cateringItems.map((line) => [line.packageName, line.guestCount])) ||
    JSON.stringify(previousDraft.rcsServices.map((line) => [line.serviceType, line.quantity])) !==
      JSON.stringify(nextDraft.rcsServices.map((line) => [line.serviceType, line.quantity])) ||
    JSON.stringify(previousDraft.rentalItems.map((line) => [line.itemName, line.issueQuantity])) !==
      JSON.stringify(nextDraft.rentalItems.map((line) => [line.itemName, line.issueQuantity]));
  if (itemQuantityChanged) {
    entries.push({
      id: createId('history'),
      timestamp,
      action: 'Item quantity changes',
      section: 'Supply Lines',
      description: 'One or more supply, catering, RCS, or rental quantities were updated.',
    });
  }

  const dispatchChanged =
    previousDraft.supplyLocation !== nextDraft.supplyLocation ||
    previousDraft.deliveryInstructions !== nextDraft.deliveryInstructions ||
    JSON.stringify(previousDraft.foodSupplies.map((line) => [line.item, line.dispatchNotes])) !==
      JSON.stringify(nextDraft.foodSupplies.map((line) => [line.item, line.dispatchNotes]));
  if (dispatchChanged) {
    entries.push({
      id: createId('history'),
      timestamp,
      action: 'Dispatch changes',
      section: 'Supply Details',
      description: 'Delivery location, instructions, or dispatch notes changed.',
    });
  }

  if (JSON.stringify(previousDraft.payments) !== JSON.stringify(nextDraft.payments)) {
    entries.push({
      id: createId('history'),
      timestamp,
      action: 'Payment changes',
      section: 'Payment Ledger',
      description: 'Payment ledger entries were added or edited.',
    });
  }

  const rentalReturnChanged =
    JSON.stringify(
      previousDraft.rentalItems.map((line) => [line.itemName, line.returnQuantity, line.damagedQuantity, line.pendingQuantity]),
    ) !==
    JSON.stringify(
      nextDraft.rentalItems.map((line) => [line.itemName, line.returnQuantity, line.damagedQuantity, line.pendingQuantity]),
    );
  if (rentalReturnChanged) {
    entries.push({
      id: createId('history'),
      timestamp,
      action: 'Rental return/damage changes',
      section: 'Rental Items',
      description: 'Rental return, damage, or pending quantities were updated.',
    });
  }

  if (previousDraft.status !== nextDraft.status && nextDraft.status === 'cancelled') {
    entries.push({
      id: createId('history'),
      timestamp,
      action: 'Cancellation',
      section: 'Cancellation Details',
      description: `Order cancelled by ${nextDraft.cancellation.cancelledBy || 'staff'} due to: ${nextDraft.cancellation.reason || 'No reason provided'}.`,
    });
  }

  return entries;
};

const getRangeLabel = (windowMode: DateWindow, baseDate: Date) => {
  if (windowMode === 'today') {
    return formatDatePK(baseDate);
  }
  if (windowMode === 'week') {
    return `${formatDatePK(startOfWeek(baseDate))} - ${formatDatePK(endOfWeek(baseDate))}`;
  }
  return baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

function OutsideServicesOrderForm({
  initialBooking,
  bookings,
  serviceBookings,
  dishes,
  menuPackages,
  onClose,
  onSave,
}: {
  initialBooking?: ServiceBooking;
  bookings: Booking[];
  serviceBookings: ServiceBooking[];
  dishes: Dish[];
  menuPackages: MenuPackage[];
  onClose: () => void;
  onSave: (booking: ServiceBooking) => void;
}) {
  const [storedCustomers] = usePersistedWorkflowState<Customer[]>(
    WORKFLOW_STATE_KEYS.customerDatabase,
    SAMPLE_CUSTOMERS,
  );
  const activeRcsSetupServices = useMemo(() => {
    const categoryMap = new Map(loadSetupRcsCategories().map((category) => [category.id, category]));
    return loadSetupRcsServices().filter((service) => {
      const category = service.categoryId ? categoryMap.get(service.categoryId) : undefined;
      return service.isActive !== false && service.showInReservation !== false && category?.showInReservation !== false;
    });
  }, []);
  const initialDraft = useMemo(() => normalizeOrderDraft(initialBooking), [initialBooking]);
  const [activeSection, setActiveSection] = useState<SectionKey>('customer-info');
  const [draft, setDraft] = useState<OrderDraft>(initialDraft);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(true);
  const [paymentDraft, setPaymentDraft] = useState<PaymentLedgerEntry>(() => buildPaymentEntry({}));
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingRows, setEditingRows] = useState<Record<EditableCollectionKey, string[]>>({
    foodSupplies: [],
    cateringItems: [],
    rcsServices: [],
    rentalItems: [],
    miscCharges: [],
    payments: [],
  });
  const [shiftDateValue, setShiftDateValue] = useState(() => initialDraft.supplyDate);
  const [shiftDeliveryTime, setShiftDeliveryTime] = useState(() => initialDraft.deliveryTime);
  const [shiftPickupTime, setShiftPickupTime] = useState(() => initialDraft.pickupTime);
  const [shiftReason, setShiftReason] = useState('');

  useEffect(() => {
    setDraft(initialDraft);
    setActiveSection('customer-info');
    setCustomerSearchQuery('');
    setShowCustomerDropdown(false);
    setShowPaymentHistory(true);
    setPaymentDraft(buildPaymentEntry({}));
    setEditingPaymentId(null);
    setEditingRows({
      foodSupplies: [],
      cateringItems: [],
      rcsServices: [],
      rentalItems: [],
      miscCharges: [],
      payments: [],
    });
    setShiftDateValue(initialDraft.supplyDate);
    setShiftDeliveryTime(initialDraft.deliveryTime);
    setShiftPickupTime(initialDraft.pickupTime);
    setShiftReason('');
  }, [initialDraft]);

  const customerRecords = useMemo(
    () => buildCustomerSearchRecords(bookings, serviceBookings, storedCustomers),
    [bookings, serviceBookings, storedCustomers],
  );
  const banquetKitchenDishes = useMemo(
    () =>
      dishes
        .filter(
          (dish) =>
            dish.module === 'banquet' &&
            dish.status !== 'inactive' &&
            isDishAvailableForUsage(dish, 'outsideServices'),
        )
        .sort((left, right) => left.dishName.localeCompare(right.dishName)),
    [dishes],
  );
  const approvedMenuPackages = useMemo(
    () =>
      menuPackages
        .filter((menuPackage) => menuPackage.module === 'banquet' && menuPackage.status === 'approved')
        .sort((left, right) => left.packageName.localeCompare(right.packageName)),
    [menuPackages],
  );
  const dishesById = useMemo(
    () => new Map(banquetKitchenDishes.map((dish) => [dish.id, dish])),
    [banquetKitchenDishes],
  );
  const menuPackagesById = useMemo(
    () => new Map(approvedMenuPackages.map((menuPackage) => [menuPackage.id, menuPackage])),
    [approvedMenuPackages],
  );

  const customerSearchResults = useMemo(() => {
    const query = customerSearchQuery.trim();
    if (query.length < 2) return [];
    const normalizedQuery = normalizeText(query);
    const normalizedPhone = normalizePhone(query);
    return customerRecords
      .filter((customer) => {
        const nameMatches = normalizeText(customer.customerName).includes(normalizedQuery);
        const phoneMatches = normalizedPhone
          ? normalizePhone(customer.primaryPhone).includes(normalizedPhone)
          : false;
        return nameMatches || phoneMatches;
      })
      .slice(0, 8);
  }, [customerRecords, customerSearchQuery]);

  const totals = useMemo(() => computeDraftTotals(draft), [draft]);
  const resolvedSupplyLocation = draft.useCustomerAddressForSupply ? draft.address : draft.supplyLocation;
  const resolvedSupplyArea = draft.useCustomerAddressForSupply ? draft.area : draft.supplyArea;
  const resolvedSupplyCity = draft.useCustomerAddressForSupply ? draft.city : draft.supplyCity;
  const supplyTimeLabel = draft.sameDeliveryAndPickupTime
    ? draft.deliveryTime || '-'
    : `${draft.deliveryTime || '-'} - ${draft.pickupTime || '-'}`;

  const applyDraftUpdate = (updater: (current: OrderDraft) => OrderDraft) => {
    setDraft((current) => updater(current));
  };

  const syncSupplyAddress = (
    current: OrderDraft,
    overrides?: Partial<Pick<OrderDraft, 'address' | 'area' | 'city'>>,
  ): Pick<OrderDraft, 'supplyLocation' | 'supplyArea' | 'supplyCity'> => ({
    supplyLocation: overrides?.address ?? current.address,
    supplyArea: overrides?.area ?? current.area,
    supplyCity: overrides?.city ?? current.city,
  });

  const setRowEditing = (key: EditableCollectionKey, rowId: string, isEditing: boolean) => {
    setEditingRows((current) => ({
      ...current,
      [key]: isEditing ? Array.from(new Set([...current[key], rowId])) : current[key].filter((entry) => entry !== rowId),
    }));
  };

  const isRowEditing = (key: EditableCollectionKey, rowId: string) => editingRows[key].includes(rowId);

  const getEditableInputClassName = (enabled: boolean) =>
    enabled ? 'bg-white' : 'border-transparent bg-gray-50 text-gray-700 shadow-none focus-visible:ring-0';

  const resetPaymentDraft = () => {
    setPaymentDraft(buildPaymentEntry({}));
    setEditingPaymentId(null);
  };

  const addFoodSupplyLine = () => {
    const line = buildFoodSupplyLine({});
    applyDraftUpdate((current) => ({
      ...current,
      foodSupplies: [...current.foodSupplies, line],
    }));
    setRowEditing('foodSupplies', line.id, true);
  };

  const addCateringLine = () => {
    const line = buildCateringLine({});
    applyDraftUpdate((current) => ({
      ...current,
      cateringItems: [...current.cateringItems, line],
    }));
    setRowEditing('cateringItems', line.id, true);
  };

  const addRcsLine = () => {
    const line = buildRcsLine({});
    applyDraftUpdate((current) => ({
      ...current,
      rcsServices: [...current.rcsServices, line],
    }));
    setRowEditing('rcsServices', line.id, true);
  };

  const addRentalLine = () => {
    const line = buildRentalLine({});
    applyDraftUpdate((current) => ({
      ...current,
      rentalItems: [...current.rentalItems, line],
    }));
    setRowEditing('rentalItems', line.id, true);
  };

  const addMiscChargeLine = () => {
    const line = buildMiscChargeLine({});
    applyDraftUpdate((current) => ({
      ...current,
      miscCharges: [...current.miscCharges, line],
    }));
    setRowEditing('miscCharges', line.id, true);
  };

  const handleAddOrUpdatePayment = () => {
    if (!paymentDraft.date || safeNumber(paymentDraft.amount) <= 0 || !paymentDraft.receivedBy.trim()) {
      toast.error('Payment date, amount, and received by are required.');
      return;
    }

    const nextEntry = buildPaymentEntry({
      ...paymentDraft,
      id: editingPaymentId || paymentDraft.id,
      amount: safeNumber(paymentDraft.amount),
      receivedBy: paymentDraft.receivedBy.trim(),
      reference: paymentDraft.reference.trim(),
      notes: paymentDraft.notes.trim(),
      type: paymentDraft.type.trim() || 'Payment',
    });

    applyDraftUpdate((current) => ({
      ...current,
      payments: editingPaymentId
        ? current.payments.map((entry) => (entry.id === editingPaymentId ? nextEntry : entry))
        : [...current.payments, nextEntry],
    }));

    toast.success(editingPaymentId ? 'Payment entry updated' : 'Payment entry recorded');
    resetPaymentDraft();
  };

  const handleEditPayment = (entry: PaymentLedgerEntry) => {
    setPaymentDraft(buildPaymentEntry(entry));
    setEditingPaymentId(entry.id);
  };

  const handleDeletePayment = (paymentId: string) => {
    applyDraftUpdate((current) => ({
      ...current,
      payments: current.payments.filter((entry) => entry.id !== paymentId),
    }));
    if (editingPaymentId === paymentId) {
      resetPaymentDraft();
    }
  };

  const handleKitchenDishSelection = (lineId: string, kitchenItemId: string) => {
    const selectedDish = dishesById.get(kitchenItemId);
    const selectedVariant = selectedDish ? getFoodSupplyDishVariant(selectedDish) : undefined;
    applyDraftUpdate((current) => ({
      ...current,
      foodSupplies: current.foodSupplies.map((entry) =>
        entry.id === lineId
          ? buildFoodSupplyLine({
              ...entry,
              kitchenItemId,
              item: selectedDish?.dishName || entry.item,
              variantId: selectedVariant?.id,
              variantLabel: selectedVariant ? getFoodSupplyDishVariantLabel(selectedDish, selectedVariant.id) : undefined,
              rate: selectedDish ? getFoodSupplyDishRate(selectedDish, selectedVariant?.id) : entry.rate,
              quantity: entry.quantity || 1,
            })
          : entry,
      ),
    }));
  };

  const handleKitchenDishVariantSelection = (lineId: string, variantId: string) => {
    applyDraftUpdate((current) => ({
      ...current,
      foodSupplies: current.foodSupplies.map((entry) => {
        if (entry.id !== lineId || !entry.kitchenItemId) {
          return entry;
        }

        const selectedDish = dishesById.get(entry.kitchenItemId);
        if (!selectedDish) {
          return entry;
        }

        return buildFoodSupplyLine({
          ...entry,
          variantId,
          variantLabel: getFoodSupplyDishVariantLabel(selectedDish, variantId),
          rate: getFoodSupplyDishRate(selectedDish, variantId),
        });
      }),
    }));
  };

  const handleMenuPackageSelection = (lineId: string, packageId: string) => {
    const selectedPackage = menuPackagesById.get(packageId);
    applyDraftUpdate((current) => ({
      ...current,
      cateringItems: current.cateringItems.map((entry) =>
        entry.id === lineId
          ? buildCateringLine({
              ...entry,
              packageId,
              packageName: selectedPackage?.packageName || entry.packageName,
              rate: selectedPackage?.sellingPricePerHead || entry.rate,
              guestCount: entry.guestCount || selectedPackage?.minimumGuests || 0,
              serviceStaff: entry.serviceStaff,
              setupNotes: entry.setupNotes,
            })
          : entry,
      ),
    }));
  };

  const handleCustomerSelect = (customer: CustomerSearchRecord) => {
    applyDraftUpdate((current) => ({
      ...current,
      customerId: customer.id,
      customerName: customer.customerName,
      primaryPhone: customer.primaryPhone,
      secondaryPhone: customer.secondaryPhone || current.secondaryPhone,
      address: customer.address || current.address,
      area: customer.area || current.area,
      city: customer.city || current.city || DEFAULT_CITY,
      referenceSource: customer.referenceSource || current.referenceSource,
      ...(current.useCustomerAddressForSupply
        ? syncSupplyAddress(current, {
            address: customer.address || current.address,
            area: customer.area || current.area,
            city: customer.city || current.city || DEFAULT_CITY,
          })
        : {}),
    }));
    setCustomerSearchQuery(`${customer.customerName} | ${customer.primaryPhone}`);
    setShowCustomerDropdown(false);
  };

  const applyShift = () => {
    applyDraftUpdate((current) => ({
      ...current,
      supplyDate: shiftDateValue,
      deliveryTime: shiftDeliveryTime,
      pickupTime: current.sameDeliveryAndPickupTime ? shiftDeliveryTime : shiftPickupTime,
    }));
    toast.success('Supply schedule updated', {
      description: `New dispatch window: ${shiftDateValue} ${shiftDeliveryTime}${draft.sameDeliveryAndPickupTime ? '' : ` - ${shiftPickupTime}`}`,
    });
  };

  const markCancelled = () => {
    applyDraftUpdate((current) => ({
      ...current,
      status: 'cancelled',
    }));
    toast.error('Order marked for cancellation', {
      description: 'Save the order to persist the cancellation details.',
    });
  };

  const saveOrder = () => {
    if (!draft.customerName.trim()) {
      toast.error('Customer name is required');
      setActiveSection('customer-info');
      return;
    }

    if (!draft.primaryPhone.trim()) {
      toast.error('Primary phone is required');
      setActiveSection('customer-info');
      return;
    }

    if (!draft.supplyDate || !draft.deliveryTime) {
      toast.error('Supply date and delivery time are required');
      setActiveSection('supply-details');
      return;
    }

    if (!draft.useCustomerAddressForSupply && !draft.supplyLocation.trim()) {
      toast.error('Delivery address is required when customer and delivery addresses are different.');
      setActiveSection('supply-details');
      return;
    }

    const hasReferenceSupport =
      draft.reference.trim().length > 0 ||
      draft.approvedBy.trim().length > 0 ||
      draft.creditReference.trim().length > 0;

    if (totals.paid <= 0 && !hasReferenceSupport) {
      toast.error('Zero-advance orders need a Reference, Approved By, or Credit Reference entry.');
      setActiveSection('payment-ledger');
      return;
    }

    const previousDraft = initialBooking ? normalizeOrderDraft(initialBooking) : null;
    const newEntries = buildHistoryEntries(previousDraft, draft, shiftReason);
    const nextDraft = {
      ...draft,
      historyLog: [...draft.historyLog, ...newEntries],
    };
    const nextTotals = computeDraftTotals(nextDraft);
    const primaryMenuPackage = nextDraft.cateringItems.find((line) => line.packageId);

    const serviceBooking: ServiceBooking = {
      ...(initialBooking || {}),
      ...(nextDraft as unknown as ServiceBooking),
      id: nextDraft.id,
      serviceType: deriveServiceType(nextDraft),
      status: nextDraft.status === 'cancelled' ? 'cancelled' : 'confirmed',
      date: parseDate(nextDraft.supplyDate),
      startTime: nextDraft.deliveryTime,
      endTime: nextDraft.pickupTime || nextDraft.deliveryTime,
      customerName: nextDraft.customerName.trim(),
      contactNumber: nextDraft.primaryPhone.trim(),
      address: nextDraft.address,
      area: nextDraft.area,
      city: nextDraft.city,
      supplyLocation: nextDraft.useCustomerAddressForSupply ? nextDraft.address : nextDraft.supplyLocation,
      supplyArea: nextDraft.useCustomerAddressForSupply ? nextDraft.area : nextDraft.supplyArea,
      supplyCity: nextDraft.useCustomerAddressForSupply ? nextDraft.city : nextDraft.supplyCity,
      deliveryAddress: nextDraft.useCustomerAddressForSupply ? nextDraft.address : nextDraft.supplyLocation,
      deliveryArea: nextDraft.useCustomerAddressForSupply ? nextDraft.area : nextDraft.supplyArea,
      deliveryCity: nextDraft.useCustomerAddressForSupply ? nextDraft.city : nextDraft.supplyCity,
      guestCount: nextDraft.cateringItems.reduce((sum, line) => sum + safeNumber(line.guestCount), 0),
      notes: nextDraft.internalNotes || nextDraft.remarks,
      menuPackageId: primaryMenuPackage?.packageId,
      packageId: primaryMenuPackage?.packageId,
      packageName: primaryMenuPackage?.packageName,
      menuType: primaryMenuPackage?.packageName,
      menuRate: primaryMenuPackage?.rate,
      menuTotal: nextDraft.cateringItems.reduce((sum, line) => sum + safeNumber(line.total), 0),
      createdAt:
        initialBooking?.createdAt instanceof Date
          ? initialBooking.createdAt
          : initialBooking?.createdAt
            ? new Date(initialBooking.createdAt)
            : new Date(nextDraft.createdAt),
      totalAmount: nextTotals.grandTotal,
      paidAmount: nextTotals.paid,
      balanceDue: nextTotals.balance,
    };

    onSave(serviceBooking);
    toast.success(initialBooking ? 'Outside service order updated' : 'Outside service order created', {
      description: `${nextDraft.customerName} | ${nextDraft.supplyType} | ${formatCurrencyPKR(nextTotals.grandTotal)}`,
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="flex h-[90vh] w-full max-w-[1400px] flex-col rounded-lg bg-gray-100 shadow-2xl">
          <div className="flex-shrink-0 border-b-2 border-gray-300 bg-white">
            <div className="flex items-center justify-between bg-blue-900 px-6 py-3 text-white">
              <h1 className="text-xl font-bold">Outside Services Order</h1>
              <div className="flex items-center gap-3">
                <Button onClick={saveOrder} className="bg-green-600 text-white hover:bg-green-700">
                  <Save className="mr-2 size-4" />
                  Save Order
                </Button>
                <button onClick={onClose} className="rounded p-1.5 transition-colors hover:bg-blue-800">
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <div className="grid gap-4 border-b border-gray-200 px-6 py-3 md:grid-cols-7">
              <SummaryCell label="Customer Name" value={draft.customerName || '-'} />
              <SummaryCell label="Supply Date" value={draft.supplyDate ? formatDatePK(draft.supplyDate) : '-'} />
              <SummaryCell label="Supply Time" value={supplyTimeLabel} />
              <SummaryCell label="Supply Type" value={draft.supplyType} />
              <SummaryCell label="Grand Total" value={formatCurrencyPKR(totals.grandTotal)} tone="primary" />
              <SummaryCell label="Paid" value={formatCurrencyPKR(totals.paid)} tone="success" />
              <SummaryCell label="Reference" value={draft.reference || draft.creditReference || '-'} />
            </div>

            <div className="grid gap-4 bg-gray-50 px-6 py-3 md:grid-cols-3">
              <SummaryCell label="Balance" value={formatCurrencyPKR(totals.balance)} tone="danger" />
              <SummaryCell
                label="Area / Location"
                value={[resolvedSupplyArea, resolvedSupplyLocation, resolvedSupplyCity].filter(Boolean).join(' | ') || '-'}
              />
              <div>
                <div className="text-xs font-semibold uppercase text-gray-500">Order State</div>
                <div className="mt-0.5 text-sm font-bold text-gray-900">
                  {draft.status === 'cancelled' ? 'Cancelled supply order' : 'Active confirmed order'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-[260px] flex-shrink-0 overflow-y-auto border-r border-gray-300 bg-white">
              <div className="p-3">
                <div className="mb-2 px-2 text-xs font-semibold uppercase text-gray-500">Navigation</div>
                {SECTION_CONFIG.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.key}
                      onClick={() => setActiveSection(section.key)}
                      className={`mb-1 w-full rounded px-3 py-2.5 text-left text-sm transition-colors ${
                        activeSection === section.key
                          ? 'bg-blue-600 font-semibold text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 flex-shrink-0" />
                        <span className="min-w-0 flex-1 text-xs">{section.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
              <div className="max-w-5xl">
                {activeSection === 'customer-info' && (
                  <SectionCard title="Customer Information" icon={Users}>
                    <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <label className="mb-1 block text-xs font-semibold text-gray-700">Customer Search</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          value={customerSearchQuery}
                          onChange={(event) => {
                            setCustomerSearchQuery(event.target.value);
                            setShowCustomerDropdown(true);
                          }}
                          onFocus={() => setShowCustomerDropdown(true)}
                          placeholder="Search by customer name or phone"
                          className="pl-9"
                        />
                        {showCustomerDropdown && customerSearchQuery.trim().length >= 2 && (
                          <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                            {customerSearchResults.length > 0 ? (
                              customerSearchResults.map((customer) => (
                                <button
                                  key={customer.id}
                                  type="button"
                                  onClick={() => handleCustomerSelect(customer)}
                                  className="w-full border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-blue-50 last:border-b-0"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="font-semibold text-gray-900">{customer.customerName}</span>
                                    <span className="text-xs text-gray-500">{customer.primaryPhone || 'No phone'}</span>
                                  </div>
                                  <div className="mt-0.5 text-xs text-gray-500">
                                    {customer.previousOrders} previous order{customer.previousOrders === 1 ? '' : 's'} | {customer.area || customer.city || DEFAULT_CITY}
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

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Customer Name *">
                        <Input value={draft.customerName} onChange={(event) => applyDraftUpdate((current) => ({ ...current, customerName: event.target.value }))} />
                      </Field>
                      <Field label="Primary Phone *">
                        <Input value={draft.primaryPhone} onChange={(event) => applyDraftUpdate((current) => ({ ...current, primaryPhone: event.target.value }))} />
                      </Field>
                      <Field label="Secondary Phone">
                        <Input value={draft.secondaryPhone} onChange={(event) => applyDraftUpdate((current) => ({ ...current, secondaryPhone: event.target.value }))} />
                      </Field>
                      <Field label="Reference Source">
                        <Input value={draft.referenceSource} onChange={(event) => applyDraftUpdate((current) => ({ ...current, referenceSource: event.target.value }))} />
                      </Field>
                      <Field label="Address" className="md:col-span-2">
                        <Input
                          value={draft.address}
                          onChange={(event) =>
                            applyDraftUpdate((current) => ({
                              ...current,
                              address: event.target.value,
                              ...(current.useCustomerAddressForSupply
                                ? syncSupplyAddress(current, { address: event.target.value })
                                : {}),
                            }))
                          }
                        />
                      </Field>
                      <Field label="Area / Locality">
                        <Input
                          value={draft.area}
                          onChange={(event) =>
                            applyDraftUpdate((current) => ({
                              ...current,
                              area: event.target.value,
                              ...(current.useCustomerAddressForSupply
                                ? syncSupplyAddress(current, { area: event.target.value })
                                : {}),
                            }))
                          }
                        />
                      </Field>
                      <Field label="City">
                        <Input
                          value={draft.city}
                          onChange={(event) =>
                            applyDraftUpdate((current) => ({
                              ...current,
                              city: event.target.value,
                              ...(current.useCustomerAddressForSupply
                                ? syncSupplyAddress(current, { city: event.target.value })
                                : {}),
                            }))
                          }
                        />
                      </Field>
                      <Field label="Reference">
                        <Input value={draft.reference} onChange={(event) => applyDraftUpdate((current) => ({ ...current, reference: event.target.value }))} />
                      </Field>
                      <Field label="Approved By">
                        <Input value={draft.approvedBy} onChange={(event) => applyDraftUpdate((current) => ({ ...current, approvedBy: event.target.value }))} />
                      </Field>
                      <Field label="Credit Reference" className="md:col-span-2">
                        <Input value={draft.creditReference} onChange={(event) => applyDraftUpdate((current) => ({ ...current, creditReference: event.target.value }))} />
                      </Field>
                      <Field label="Remarks" className="md:col-span-2">
                        <Textarea value={draft.remarks} onChange={(event) => applyDraftUpdate((current) => ({ ...current, remarks: event.target.value }))} rows={3} />
                      </Field>
                    </div>
                  </SectionCard>
                )}

                {activeSection === 'supply-details' && (
                  <SectionCard title="Supply Details" icon={Truck}>
                    <div className="mb-4 grid gap-3 md:grid-cols-2">
                      <label className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                        <input
                          type="checkbox"
                          checked={draft.useCustomerAddressForSupply}
                          onChange={(event) =>
                            applyDraftUpdate((current) => ({
                              ...current,
                              useCustomerAddressForSupply: event.target.checked,
                              ...(event.target.checked ? syncSupplyAddress(current) : {}),
                            }))
                          }
                        />
                        Use customer address for delivery
                      </label>
                      <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                        <input
                          type="checkbox"
                          checked={draft.sameDeliveryAndPickupTime}
                          onChange={(event) =>
                            applyDraftUpdate((current) => ({
                              ...current,
                              sameDeliveryAndPickupTime: event.target.checked,
                              pickupTime: event.target.checked ? current.deliveryTime : current.pickupTime,
                            }))
                          }
                        />
                        Pickup time is same as delivery time
                      </label>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Supply Date">
                        <Input type="date" value={draft.supplyDate} onChange={(event) => applyDraftUpdate((current) => ({ ...current, supplyDate: event.target.value }))} />
                      </Field>
                      <Field label="Supply Type">
                        <select
                          value={draft.supplyType}
                          onChange={(event) => applyDraftUpdate((current) => ({ ...current, supplyType: event.target.value as SupplyTypeLabel }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          {SUPPLY_TYPE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Delivery Time">
                        <Input
                          type="time"
                          value={draft.deliveryTime}
                          onChange={(event) =>
                            applyDraftUpdate((current) => ({
                              ...current,
                              deliveryTime: event.target.value,
                              pickupTime: current.sameDeliveryAndPickupTime ? event.target.value : current.pickupTime,
                            }))
                          }
                        />
                      </Field>
                      {!draft.sameDeliveryAndPickupTime && (
                        <Field label="Pickup Time">
                          <Input
                            type="time"
                            value={draft.pickupTime}
                            onChange={(event) => applyDraftUpdate((current) => ({ ...current, pickupTime: event.target.value }))}
                          />
                        </Field>
                      )}
                      <Field label={draft.useCustomerAddressForSupply ? 'Delivery Address (Customer Address)' : 'Delivery Address'} className="md:col-span-2">
                        <Input
                          value={draft.useCustomerAddressForSupply ? draft.address : draft.supplyLocation}
                          disabled={draft.useCustomerAddressForSupply}
                          onChange={(event) => applyDraftUpdate((current) => ({ ...current, supplyLocation: event.target.value }))}
                          className={getEditableInputClassName(!draft.useCustomerAddressForSupply)}
                        />
                      </Field>
                      <Field label="Area / Sector">
                        <Input
                          value={draft.useCustomerAddressForSupply ? draft.area : draft.supplyArea}
                          disabled={draft.useCustomerAddressForSupply}
                          onChange={(event) => applyDraftUpdate((current) => ({ ...current, supplyArea: event.target.value }))}
                          className={getEditableInputClassName(!draft.useCustomerAddressForSupply)}
                        />
                      </Field>
                      <Field label="Delivery City">
                        <Input
                          value={draft.useCustomerAddressForSupply ? draft.city : draft.supplyCity}
                          disabled={draft.useCustomerAddressForSupply}
                          onChange={(event) => applyDraftUpdate((current) => ({ ...current, supplyCity: event.target.value }))}
                          className={getEditableInputClassName(!draft.useCustomerAddressForSupply)}
                        />
                      </Field>
                      <Field label="Delivery Instructions" className="md:col-span-2">
                        <Textarea value={draft.deliveryInstructions} onChange={(event) => applyDraftUpdate((current) => ({ ...current, deliveryInstructions: event.target.value }))} rows={3} />
                      </Field>
                      <Field label="Internal Notes" className="md:col-span-2">
                        <Textarea value={draft.internalNotes} onChange={(event) => applyDraftUpdate((current) => ({ ...current, internalNotes: event.target.value }))} rows={3} />
                      </Field>
                    </div>
                  </SectionCard>
                )}

                {activeSection === 'food-supplies' && (
                  <SectionCard title="Food Supplies" icon={Package} action={<Button variant="outline" onClick={addFoodSupplyLine}><Plus className="mr-2 size-4" />Add Item</Button>}>
                    <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      Link food supply rows to real Banquet Kitchen dishes so kitchen dispatch and issue planning can use the saved order directly.
                    </div>
                    <EditableTable
                      headers={['Kitchen Dish', 'Variant', 'Item', 'Quantity', 'Rate', 'Total', 'Dispatch Notes', 'Actions']}
                      rows={draft.foodSupplies.map((line) => {
                        const rowEditing = isRowEditing('foodSupplies', line.id);
                        const selectedDish = line.kitchenItemId ? dishesById.get(line.kitchenItemId) : undefined;
                        const variantOptions = selectedDish ? getFoodSupplyDishVariants(selectedDish) : [];
                        return (
                          <tr key={line.id} className="border-b border-gray-100">
                            <td className="px-3 py-2">
                              <select
                                value={line.kitchenItemId || ''}
                                disabled={!rowEditing}
                                onChange={(event) => handleKitchenDishSelection(line.id, event.target.value)}
                                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${rowEditing ? 'bg-white' : 'border-transparent bg-gray-50 text-gray-700'}`}
                              >
                                <option value="">Manual entry</option>
                                {banquetKitchenDishes.map((dish) => (
                                  <option key={dish.id} value={dish.id}>
                                    {dish.dishName} | {dish.category}
                                  </option>
                                  ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={line.variantId || ''}
                                disabled={!rowEditing || !selectedDish}
                                onChange={(event) => handleKitchenDishVariantSelection(line.id, event.target.value)}
                                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${rowEditing ? 'bg-white' : 'border-transparent bg-gray-50 text-gray-700'}`}
                              >
                                <option value="">{selectedDish ? 'Select variant' : 'Select dish first'}</option>
                                {variantOptions.map((variant) => (
                                  <option key={variant.id} value={variant.id}>
                                    {(variant.label || variant.variantLabel || 'Default')} | PKR {(variant.sellingPrice || 0).toLocaleString('en-PK')} / {variant.salesUnit}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                value={line.item}
                                disabled={!rowEditing}
                                className={getEditableInputClassName(rowEditing)}
                                onChange={(event) => applyDraftUpdate((current) => ({ ...current, foodSupplies: current.foodSupplies.map((entry) => entry.id === line.id ? buildFoodSupplyLine({ ...entry, item: event.target.value, kitchenItemId: entry.kitchenItemId, quantity: entry.quantity, rate: entry.rate }) : entry) }))}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                value={line.quantity}
                                disabled={!rowEditing}
                                className={getEditableInputClassName(rowEditing)}
                                onChange={(event) => applyDraftUpdate((current) => ({ ...current, foodSupplies: current.foodSupplies.map((entry) => entry.id === line.id ? buildFoodSupplyLine({ ...entry, quantity: safeNumber(event.target.value), kitchenItemId: entry.kitchenItemId, rate: entry.rate }) : entry) }))}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                value={line.rate}
                                disabled={!rowEditing}
                                className={getEditableInputClassName(rowEditing)}
                                onChange={(event) => applyDraftUpdate((current) => ({ ...current, foodSupplies: current.foodSupplies.map((entry) => entry.id === line.id ? buildFoodSupplyLine({ ...entry, rate: safeNumber(event.target.value), kitchenItemId: entry.kitchenItemId, quantity: entry.quantity }) : entry) }))}
                              />
                            </td>
                            <td className="px-3 py-2 text-sm font-semibold text-gray-900">{formatCurrencyPKR(line.total)}</td>
                            <td className="px-3 py-2">
                              <Input
                                value={line.dispatchNotes}
                                disabled={!rowEditing}
                                className={getEditableInputClassName(rowEditing)}
                                onChange={(event) => applyDraftUpdate((current) => ({ ...current, foodSupplies: current.foodSupplies.map((entry) => entry.id === line.id ? { ...entry, dispatchNotes: event.target.value } : entry) }))}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setRowEditing('foodSupplies', line.id, !rowEditing)}
                                  className={`rounded p-1.5 transition-colors ${rowEditing ? 'text-green-600 hover:bg-green-100 hover:text-green-700' : 'text-blue-600 hover:bg-blue-100 hover:text-blue-700'}`}
                                  title={rowEditing ? 'Finish editing' : 'Edit item'}
                                >
                                  {rowEditing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    applyDraftUpdate((current) => ({ ...current, foodSupplies: current.foodSupplies.filter((entry) => entry.id !== line.id) }));
                                    setRowEditing('foodSupplies', line.id, false);
                                  }}
                                  className="rounded p-1.5 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
                                  title="Remove item"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      emptyText="No food supply items added yet."
                    />
                  </SectionCard>
                )}

                {activeSection === 'food-catering' && (
                  <SectionCard title="Food & Catering" icon={ShoppingBag} action={<Button variant="outline" onClick={addCateringLine}><Plus className="mr-2 size-4" />Add Package</Button>}>
                    <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      Choose approved Banquet Kitchen menu packages here so central kitchen planning can generate accurate requisitions and dispatch lines.
                    </div>
                    <EditableTable
                      headers={['Banquet Menu Package', 'Catering Package / Items', 'Guest Count', 'Rate', 'Total', 'Service Staff', 'Setup Notes', 'Actions']}
                      rows={draft.cateringItems.map((line) => {
                        const rowEditing = isRowEditing('cateringItems', line.id);
                        return (
                          <tr key={line.id} className="border-b border-gray-100">
                            <td className="px-3 py-2">
                              <select
                                value={line.packageId || ''}
                                disabled={!rowEditing}
                                onChange={(event) => handleMenuPackageSelection(line.id, event.target.value)}
                                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${rowEditing ? 'bg-white' : 'border-transparent bg-gray-50 text-gray-700'}`}
                              >
                                <option value="">Manual package</option>
                                {approvedMenuPackages.map((menuPackage) => (
                                  <option key={menuPackage.id} value={menuPackage.id}>
                                    {menuPackage.packageName} | PKR {menuPackage.sellingPricePerHead.toLocaleString('en-PK')} / head
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                value={line.packageName}
                                disabled={!rowEditing}
                                className={getEditableInputClassName(rowEditing)}
                                onChange={(event) => applyDraftUpdate((current) => ({ ...current, cateringItems: current.cateringItems.map((entry) => entry.id === line.id ? buildCateringLine({ ...entry, packageName: event.target.value, packageId: entry.packageId, guestCount: entry.guestCount, rate: entry.rate, serviceStaff: entry.serviceStaff, setupNotes: entry.setupNotes }) : entry) }))}
                              />
                              {line.packageId && menuPackagesById.get(line.packageId) ? (
                                <div className="mt-1 text-xs text-gray-500">
                                  Includes: {menuPackagesById.get(line.packageId)?.dishes.map((dish) => dish.dishName).join(', ')}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                value={line.guestCount}
                                disabled={!rowEditing}
                                className={getEditableInputClassName(rowEditing)}
                                onChange={(event) => applyDraftUpdate((current) => ({ ...current, cateringItems: current.cateringItems.map((entry) => entry.id === line.id ? buildCateringLine({ ...entry, guestCount: safeNumber(event.target.value), packageId: entry.packageId, rate: entry.rate, serviceStaff: entry.serviceStaff, setupNotes: entry.setupNotes }) : entry) }))}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                value={line.rate}
                                disabled={!rowEditing}
                                className={getEditableInputClassName(rowEditing)}
                                onChange={(event) => applyDraftUpdate((current) => ({ ...current, cateringItems: current.cateringItems.map((entry) => entry.id === line.id ? buildCateringLine({ ...entry, rate: safeNumber(event.target.value), packageId: entry.packageId, guestCount: entry.guestCount, serviceStaff: entry.serviceStaff, setupNotes: entry.setupNotes }) : entry) }))}
                              />
                            </td>
                            <td className="px-3 py-2 text-sm font-semibold text-gray-900">{formatCurrencyPKR(line.total)}</td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                value={line.serviceStaff}
                                disabled={!rowEditing}
                                className={getEditableInputClassName(rowEditing)}
                                onChange={(event) => applyDraftUpdate((current) => ({ ...current, cateringItems: current.cateringItems.map((entry) => entry.id === line.id ? { ...entry, serviceStaff: safeNumber(event.target.value) } : entry) }))}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                value={line.setupNotes}
                                disabled={!rowEditing}
                                className={getEditableInputClassName(rowEditing)}
                                onChange={(event) => applyDraftUpdate((current) => ({ ...current, cateringItems: current.cateringItems.map((entry) => entry.id === line.id ? { ...entry, setupNotes: event.target.value } : entry) }))}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setRowEditing('cateringItems', line.id, !rowEditing)}
                                  className={`rounded p-1.5 transition-colors ${rowEditing ? 'text-green-600 hover:bg-green-100 hover:text-green-700' : 'text-blue-600 hover:bg-blue-100 hover:text-blue-700'}`}
                                  title={rowEditing ? 'Finish editing' : 'Edit package'}
                                >
                                  {rowEditing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    applyDraftUpdate((current) => ({ ...current, cateringItems: current.cateringItems.filter((entry) => entry.id !== line.id) }));
                                    setRowEditing('cateringItems', line.id, false);
                                  }}
                                  className="rounded p-1.5 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
                                  title="Remove package"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      emptyText="No catering items added yet."
                    />
                  </SectionCard>
                )}

                {activeSection === 'rcs-services' && (
                  <SectionCard title="RCS Services" icon={ShieldCheck} action={<Button variant="outline" onClick={addRcsLine}><Plus className="mr-2 size-4" />Add Service</Button>}>
                    <EditableTable
                      headers={['Service Type', 'Quantity', 'Charges', 'Total', 'Notes', 'Actions']}
                      rows={draft.rcsServices.map((line) => {
                        const rowEditing = isRowEditing('rcsServices', line.id);
                        return (
                          <tr key={line.id} className="border-b border-gray-100">
                            <td className="px-3 py-2">
                              <Input
                                list="outside-services-rcs-catalog"
                                value={line.serviceType}
                                disabled={!rowEditing}
                                className={getEditableInputClassName(rowEditing)}
                                onChange={(event) =>
                                  applyDraftUpdate((current) => ({
                                    ...current,
                                    rcsServices: current.rcsServices.map((entry) => {
                                      if (entry.id !== line.id) return entry;
                                      const matchedService = activeRcsSetupServices.find(
                                        (service) => getRcsSetupServiceName(service).toLowerCase() === event.target.value.trim().toLowerCase(),
                                      );
                                      return buildRcsLine({
                                        ...entry,
                                        masterServiceId: matchedService?.id,
                                        serviceType: event.target.value,
                                        quantity: entry.quantity,
                                        charges: matchedService ? safeNumber(matchedService.defaultSellingPrice) : entry.charges,
                                        notes: entry.notes,
                                      });
                                    }),
                                  }))
                                }
                              />
                              <datalist id="outside-services-rcs-catalog">
                                {activeRcsSetupServices.map((service) => (
                                  <option key={service.id} value={getRcsSetupServiceName(service)}>
                                    {getRcsSetupServiceName(service)} - {formatCurrencyPKR(safeNumber(service.defaultSellingPrice))}
                                  </option>
                                ))}
                              </datalist>
                            </td>
                            <td className="px-3 py-2"><Input type="number" value={line.quantity} disabled={!rowEditing} className={getEditableInputClassName(rowEditing)} onChange={(event) => applyDraftUpdate((current) => ({ ...current, rcsServices: current.rcsServices.map((entry) => entry.id === line.id ? buildRcsLine({ ...entry, quantity: safeNumber(event.target.value), charges: entry.charges, notes: entry.notes }) : entry) }))} /></td>
                            <td className="px-3 py-2"><Input type="number" value={line.charges} disabled={!rowEditing} className={getEditableInputClassName(rowEditing)} onChange={(event) => applyDraftUpdate((current) => ({ ...current, rcsServices: current.rcsServices.map((entry) => entry.id === line.id ? buildRcsLine({ ...entry, charges: safeNumber(event.target.value), quantity: entry.quantity, notes: entry.notes }) : entry) }))} /></td>
                            <td className="px-3 py-2 text-sm font-semibold text-gray-900">{formatCurrencyPKR(line.total)}</td>
                            <td className="px-3 py-2"><Input value={line.notes} disabled={!rowEditing} className={getEditableInputClassName(rowEditing)} onChange={(event) => applyDraftUpdate((current) => ({ ...current, rcsServices: current.rcsServices.map((entry) => entry.id === line.id ? { ...entry, notes: event.target.value } : entry) }))} /></td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-1">
                                <button type="button" onClick={() => setRowEditing('rcsServices', line.id, !rowEditing)} className={`rounded p-1.5 transition-colors ${rowEditing ? 'text-green-600 hover:bg-green-100 hover:text-green-700' : 'text-blue-600 hover:bg-blue-100 hover:text-blue-700'}`} title={rowEditing ? 'Finish editing' : 'Edit service'}>
                                  {rowEditing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
                                </button>
                                <button type="button" onClick={() => { applyDraftUpdate((current) => ({ ...current, rcsServices: current.rcsServices.filter((entry) => entry.id !== line.id) })); setRowEditing('rcsServices', line.id, false); }} className="rounded p-1.5 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700" title="Remove service">
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      emptyText="No RCS service lines added yet."
                    />
                  </SectionCard>
                )}

                {activeSection === 'rental-items' && (
                  <SectionCard title="Rental Items" icon={Warehouse} action={<Button variant="outline" onClick={addRentalLine}><Plus className="mr-2 size-4" />Add Rental</Button>}>
                    <EditableTable
                      headers={['Category', 'Item Name', 'Issue Qty', 'Return Qty', 'Damaged Qty', 'Pending Qty', 'Rate', 'Total', 'Actions']}
                      rows={draft.rentalItems.map((line) => {
                        const rowEditing = isRowEditing('rentalItems', line.id);
                        return (
                          <tr key={line.id} className="border-b border-gray-100">
                            <td className="px-3 py-2"><Input value={line.category} disabled={!rowEditing} className={getEditableInputClassName(rowEditing)} onChange={(event) => applyDraftUpdate((current) => ({ ...current, rentalItems: current.rentalItems.map((entry) => entry.id === line.id ? { ...entry, category: event.target.value } : entry) }))} /></td>
                            <td className="px-3 py-2"><Input value={line.itemName} disabled={!rowEditing} className={getEditableInputClassName(rowEditing)} onChange={(event) => applyDraftUpdate((current) => ({ ...current, rentalItems: current.rentalItems.map((entry) => entry.id === line.id ? { ...entry, itemName: event.target.value } : entry) }))} /></td>
                            <td className="px-3 py-2"><Input type="number" value={line.issueQuantity} disabled={!rowEditing} className={getEditableInputClassName(rowEditing)} onChange={(event) => applyDraftUpdate((current) => ({ ...current, rentalItems: current.rentalItems.map((entry) => entry.id === line.id ? buildRentalLine({ ...entry, issueQuantity: safeNumber(event.target.value), returnQuantity: entry.returnQuantity, damagedQuantity: entry.damagedQuantity, rate: entry.rate }) : entry) }))} /></td>
                            <td className="px-3 py-2"><Input type="number" value={line.returnQuantity} disabled={!rowEditing} className={getEditableInputClassName(rowEditing)} onChange={(event) => applyDraftUpdate((current) => ({ ...current, rentalItems: current.rentalItems.map((entry) => entry.id === line.id ? buildRentalLine({ ...entry, issueQuantity: entry.issueQuantity, returnQuantity: safeNumber(event.target.value), damagedQuantity: entry.damagedQuantity, rate: entry.rate }) : entry) }))} /></td>
                            <td className="px-3 py-2"><Input type="number" value={line.damagedQuantity} disabled={!rowEditing} className={getEditableInputClassName(rowEditing)} onChange={(event) => applyDraftUpdate((current) => ({ ...current, rentalItems: current.rentalItems.map((entry) => entry.id === line.id ? buildRentalLine({ ...entry, issueQuantity: entry.issueQuantity, returnQuantity: entry.returnQuantity, damagedQuantity: safeNumber(event.target.value), rate: entry.rate }) : entry) }))} /></td>
                            <td className="px-3 py-2"><Input type="number" value={line.pendingQuantity} disabled={!rowEditing} className={getEditableInputClassName(rowEditing)} onChange={(event) => applyDraftUpdate((current) => ({ ...current, rentalItems: current.rentalItems.map((entry) => entry.id === line.id ? buildRentalLine({ ...entry, issueQuantity: entry.issueQuantity, returnQuantity: entry.returnQuantity, damagedQuantity: entry.damagedQuantity, pendingQuantity: safeNumber(event.target.value), rate: entry.rate }) : entry) }))} /></td>
                            <td className="px-3 py-2"><Input type="number" value={line.rate} disabled={!rowEditing} className={getEditableInputClassName(rowEditing)} onChange={(event) => applyDraftUpdate((current) => ({ ...current, rentalItems: current.rentalItems.map((entry) => entry.id === line.id ? buildRentalLine({ ...entry, issueQuantity: entry.issueQuantity, returnQuantity: entry.returnQuantity, damagedQuantity: entry.damagedQuantity, pendingQuantity: entry.pendingQuantity, rate: safeNumber(event.target.value) }) : entry) }))} /></td>
                            <td className="px-3 py-2 text-sm font-semibold text-gray-900">{formatCurrencyPKR(line.total)}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-1">
                                <button type="button" onClick={() => setRowEditing('rentalItems', line.id, !rowEditing)} className={`rounded p-1.5 transition-colors ${rowEditing ? 'text-green-600 hover:bg-green-100 hover:text-green-700' : 'text-blue-600 hover:bg-blue-100 hover:text-blue-700'}`} title={rowEditing ? 'Finish editing' : 'Edit rental'}>
                                  {rowEditing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
                                </button>
                                <button type="button" onClick={() => { applyDraftUpdate((current) => ({ ...current, rentalItems: current.rentalItems.filter((entry) => entry.id !== line.id) })); setRowEditing('rentalItems', line.id, false); }} className="rounded p-1.5 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700" title="Remove rental">
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      emptyText="No rental items added yet."
                    />
                  </SectionCard>
                )}

                {activeSection === 'misc-charges' && (
                  <SectionCard title="Miscellaneous Charges" icon={Receipt} action={<Button variant="outline" onClick={addMiscChargeLine}><Plus className="mr-2 size-4" />Add Charge</Button>}>
                    <EditableTable
                      headers={['Charge', 'Amount', 'Notes', 'Actions']}
                      rows={draft.miscCharges.map((line) => {
                        const rowEditing = isRowEditing('miscCharges', line.id);
                        return (
                          <tr key={line.id} className="border-b border-gray-100">
                            <td className="px-3 py-2"><Input value={line.label} disabled={!rowEditing} className={getEditableInputClassName(rowEditing)} onChange={(event) => applyDraftUpdate((current) => ({ ...current, miscCharges: current.miscCharges.map((entry) => entry.id === line.id ? { ...entry, label: event.target.value } : entry) }))} /></td>
                            <td className="px-3 py-2"><Input type="number" value={line.amount} disabled={!rowEditing} className={getEditableInputClassName(rowEditing)} onChange={(event) => applyDraftUpdate((current) => ({ ...current, miscCharges: current.miscCharges.map((entry) => entry.id === line.id ? { ...entry, amount: safeNumber(event.target.value) } : entry) }))} /></td>
                            <td className="px-3 py-2"><Input value={line.notes} disabled={!rowEditing} className={getEditableInputClassName(rowEditing)} onChange={(event) => applyDraftUpdate((current) => ({ ...current, miscCharges: current.miscCharges.map((entry) => entry.id === line.id ? { ...entry, notes: event.target.value } : entry) }))} /></td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-1">
                                <button type="button" onClick={() => setRowEditing('miscCharges', line.id, !rowEditing)} className={`rounded p-1.5 transition-colors ${rowEditing ? 'text-green-600 hover:bg-green-100 hover:text-green-700' : 'text-blue-600 hover:bg-blue-100 hover:text-blue-700'}`} title={rowEditing ? 'Finish editing' : 'Edit charge'}>
                                  {rowEditing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
                                </button>
                                <button type="button" onClick={() => { applyDraftUpdate((current) => ({ ...current, miscCharges: current.miscCharges.filter((entry) => entry.id !== line.id) })); setRowEditing('miscCharges', line.id, false); }} className="rounded p-1.5 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700" title="Remove charge">
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      emptyText="No miscellaneous charges added yet."
                    />
                  </SectionCard>
                )}

                {activeSection === 'payment-ledger' && (
                  <SectionCard title="Payment Ledger" icon={DollarSign}>
                    <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      Zero advance is allowed for outside services when Reference, Approved By, or Credit Reference is provided.
                    </div>
                    <div className="mb-4 grid gap-4 md:grid-cols-3">
                      <MetricCard label="Grand Total" value={formatCurrencyPKR(totals.grandTotal)} tone="primary" />
                      <MetricCard label="Paid" value={formatCurrencyPKR(totals.paid)} tone="success" />
                      <MetricCard label="Balance" value={formatCurrencyPKR(totals.balance)} tone="danger" />
                    </div>
                    <div className="grid gap-4 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
                      <div className="rounded-lg border-2 border-gray-300 bg-white p-4">
                        <h3 className="mb-3 text-sm font-bold text-gray-900">{editingPaymentId ? 'Update Payment Entry' : 'Record Payment Entry'}</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-700">Date *</label>
                            <Input type="date" value={paymentDraft.date} onChange={(event) => setPaymentDraft((current) => ({ ...current, date: event.target.value }))} className="text-xs" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-700">Type</label>
                            <select
                              value={paymentDraft.type}
                              onChange={(event) => setPaymentDraft((current) => ({ ...current, type: event.target.value }))}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="Advance">Advance</option>
                              <option value="Payment">Payment</option>
                              <option value="Adjustment">Adjustment</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-700">Amount *</label>
                            <Input type="number" value={paymentDraft.amount} onChange={(event) => setPaymentDraft((current) => ({ ...current, amount: safeNumber(event.target.value) }))} className="text-xs" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-700">Method</label>
                            <select
                              value={paymentDraft.method}
                              onChange={(event) => setPaymentDraft((current) => ({ ...current, method: event.target.value }))}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                            >
                              <option>Cash</option>
                              <option>Bank Transfer</option>
                              <option>Cheque</option>
                              <option>Online</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-700">Reference</label>
                            <Input value={paymentDraft.reference} onChange={(event) => setPaymentDraft((current) => ({ ...current, reference: event.target.value }))} placeholder="Receipt no. / transaction ref" className="text-xs" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-700">Received By *</label>
                            <Input value={paymentDraft.receivedBy} onChange={(event) => setPaymentDraft((current) => ({ ...current, receivedBy: event.target.value }))} placeholder="Staff name" className="text-xs" />
                          </div>
                          <div className="col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-gray-700">Remarks</label>
                            <Input value={paymentDraft.notes} onChange={(event) => setPaymentDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional notes" className="text-xs" />
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button onClick={handleAddOrUpdatePayment} className="w-full bg-green-600 text-white hover:bg-green-700">
                            <Plus className="mr-2 size-4" />
                            {editingPaymentId ? 'Update Payment Entry' : 'Record Payment Entry'}
                          </Button>
                          {editingPaymentId && (
                            <Button variant="outline" onClick={resetPaymentDraft}>
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 w-full max-w-full overflow-hidden rounded-lg border-2 border-gray-300 bg-white">
                        <button
                          type="button"
                          onClick={() => setShowPaymentHistory((current) => !current)}
                          className="flex w-full items-center justify-between border-b border-gray-300 bg-gray-100 px-4 py-2"
                        >
                          <h3 className="text-sm font-bold text-gray-900">Payment History</h3>
                          <ChevronDown className={`size-4 text-slate-500 transition-transform ${showPaymentHistory ? 'rotate-180' : ''}`} />
                        </button>

                        {showPaymentHistory && (
                          <div className="w-full overflow-x-auto">
                            <table className="min-w-[760px] w-full border-collapse text-xs">
                              <thead>
                                <tr className="border-b bg-gray-50">
                                  <th className="w-[100px] whitespace-nowrap px-2 py-2.5 text-left font-semibold text-gray-700">Date</th>
                                  <th className="w-[92px] whitespace-nowrap px-2 py-2.5 text-left font-semibold text-gray-700">Type</th>
                                  <th className="w-[118px] whitespace-nowrap px-2 py-2.5 text-right font-semibold text-gray-700">Amount</th>
                                  <th className="w-[110px] whitespace-nowrap px-2 py-2.5 text-left font-semibold text-gray-700">Method</th>
                                  <th className="min-w-[170px] px-3 py-2.5 text-left font-semibold text-gray-700">Reference</th>
                                  <th className="w-[140px] whitespace-nowrap px-2 py-2.5 text-left font-semibold text-gray-700">Received By</th>
                                  <th className="w-[88px] whitespace-nowrap px-2 py-2.5 text-center font-semibold text-gray-700">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {draft.payments.length === 0 && (
                                  <tr>
                                    <td colSpan={7} className="py-6 text-center text-gray-500">
                                      No payments recorded yet
                                    </td>
                                  </tr>
                                )}
                                {draft.payments.map((payment) => (
                                  <tr key={payment.id} className="border-b hover:bg-gray-50">
                                    <td className="whitespace-nowrap px-2 py-2.5 align-top text-[11px] leading-tight text-gray-700">{payment.date ? formatDatePK(payment.date) : '-'}</td>
                                    <td className="whitespace-nowrap px-2 py-2.5 align-top text-[11px] text-gray-700">{payment.type || 'Payment'}</td>
                                    <td className="whitespace-nowrap px-2 py-2.5 align-top text-right font-bold text-green-700">{formatCurrencyPKR(payment.amount)}</td>
                                    <td className="whitespace-nowrap px-2 py-2.5 align-top">
                                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold ${
                                        payment.method === 'Cash' ? 'bg-green-100 text-green-800' :
                                        payment.method === 'Bank Transfer' ? 'bg-blue-100 text-blue-800' :
                                        payment.method === 'Cheque' ? 'bg-orange-100 text-orange-800' :
                                        'bg-purple-100 text-purple-800'
                                      }`}>
                                        {payment.method}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 align-top text-[11px] text-gray-700">{payment.reference || payment.notes || '-'}</td>
                                    <td className="whitespace-nowrap px-2 py-2.5 align-top text-[11px] text-gray-700">{payment.receivedBy || '-'}</td>
                                    <td className="whitespace-nowrap px-2 py-2.5 align-top">
                                      <div className="flex items-center justify-center gap-1">
                                        <button type="button" onClick={() => handleEditPayment(payment)} className="rounded p-1.5 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700" title="Edit payment">
                                          <Pencil className="size-3.5" />
                                        </button>
                                        <button type="button" onClick={() => handleDeletePayment(payment.id)} className="rounded p-1.5 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700" title="Remove payment">
                                          <Trash2 className="size-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </SectionCard>
                )}

                {activeSection === 'agreement' && (
                  <SectionCard title="Outside Services Agreement" icon={FileText}>
                    <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      The agreement is shown directly in this section so the full outside service order can be reviewed on the same working screen.
                    </div>
                    <Field label="Agreement Notes">
                      <Textarea
                        rows={8}
                        value={draft.agreementNotes}
                        onChange={(event) => applyDraftUpdate((current) => ({ ...current, agreementNotes: event.target.value }))}
                      />
                    </Field>
                    <div className="mt-6 rounded-lg border border-gray-300 bg-white">
                      <OutsideServicesAgreementView
                        draft={draft}
                        totals={totals}
                        dishesById={dishesById}
                        menuPackagesById={menuPackagesById}
                        resolvedSupplyLocation={resolvedSupplyLocation}
                        resolvedSupplyArea={resolvedSupplyArea}
                        resolvedSupplyCity={resolvedSupplyCity}
                        supplyTimeLabel={supplyTimeLabel}
                      />
                    </div>
                  </SectionCard>
                )}

                {activeSection === 'shift-supply-date' && (
                  <SectionCard title="Shift Supply Date" icon={CalendarDays}>
                    <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase text-slate-500">Current Schedule</div>
                      <div className="mt-1 text-sm font-bold text-slate-900">
                        {draft.supplyDate ? formatDatePK(draft.supplyDate) : '-'} | {draft.deliveryTime || '-'}{draft.sameDeliveryAndPickupTime ? '' : ` - ${draft.pickupTime || '-'}`}
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="New Supply Date">
                        <Input type="date" value={shiftDateValue} onChange={(event) => setShiftDateValue(event.target.value)} />
                      </Field>
                      <Field label="New Delivery Time">
                        <Input type="time" value={shiftDeliveryTime} onChange={(event) => setShiftDeliveryTime(event.target.value)} />
                      </Field>
                      {!draft.sameDeliveryAndPickupTime && (
                        <Field label="New Pickup Time">
                          <Input type="time" value={shiftPickupTime} onChange={(event) => setShiftPickupTime(event.target.value)} />
                        </Field>
                      )}
                      <Field label="Shift Reason" className="md:col-span-2">
                        <Textarea value={shiftReason} onChange={(event) => setShiftReason(event.target.value)} rows={3} />
                      </Field>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button onClick={applyShift} className="bg-blue-600 text-white hover:bg-blue-700">
                        Apply Supply Shift
                      </Button>
                    </div>
                  </SectionCard>
                )}

                {activeSection === 'cancellation' && (
                  <SectionCard title="Cancellation Details" icon={XCircle}>
                    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                      This cancels the supply order only and can rollback inventory or dispatch allocations where applicable.
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Cancellation Reason" className="md:col-span-2">
                        <Textarea
                          value={draft.cancellation.reason}
                          onChange={(event) =>
                            applyDraftUpdate((current) => ({
                              ...current,
                              cancellation: { ...current.cancellation, reason: event.target.value },
                            }))
                          }
                          rows={3}
                        />
                      </Field>
                      <Field label="Cancelled By">
                        <Input
                          value={draft.cancellation.cancelledBy}
                          onChange={(event) =>
                            applyDraftUpdate((current) => ({
                              ...current,
                              cancellation: { ...current.cancellation, cancelledBy: event.target.value },
                            }))
                          }
                        />
                      </Field>
                      <Field label="Cancellation Date">
                        <Input
                          type="date"
                          value={draft.cancellation.cancelledOn}
                          onChange={(event) =>
                            applyDraftUpdate((current) => ({
                              ...current,
                              cancellation: { ...current.cancellation, cancelledOn: event.target.value },
                            }))
                          }
                        />
                      </Field>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={draft.cancellation.rollbackInventory}
                          onChange={(event) =>
                            applyDraftUpdate((current) => ({
                              ...current,
                              cancellation: { ...current.cancellation, rollbackInventory: event.target.checked },
                            }))
                          }
                        />
                        Rollback inventory allocations
                      </label>
                      <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={draft.cancellation.rollbackDispatch}
                          onChange={(event) =>
                            applyDraftUpdate((current) => ({
                              ...current,
                              cancellation: { ...current.cancellation, rollbackDispatch: event.target.checked },
                            }))
                          }
                        />
                        Rollback dispatch assignments
                      </label>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button onClick={markCancelled} className="bg-red-600 text-white hover:bg-red-700">
                        Process Cancellation
                      </Button>
                    </div>
                  </SectionCard>
                )}

                {activeSection === 'history-log' && (
                  <SectionCard title="History Log" icon={History}>
                    <div className="space-y-3">
                      {[...draft.historyLog].sort((left, right) => right.timestamp.localeCompare(left.timestamp)).map((entry) => (
                        <div key={entry.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-gray-900">{entry.action}</div>
                            <div className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</div>
                          </div>
                          <div className="mt-1 text-xs font-medium uppercase text-blue-700">{entry.section}</div>
                          <div className="mt-1 text-sm text-gray-700">{entry.description}</div>
                        </div>
                      ))}
                      {draft.historyLog.length === 0 && (
                        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                          History will appear here after the order is saved.
                        </div>
                      )}
                    </div>
                  </SectionCard>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}

function SummaryCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'success' | 'danger';
}) {
  const colorClass =
    tone === 'primary'
      ? 'text-blue-900'
      : tone === 'success'
        ? 'text-green-700'
        : tone === 'danger'
          ? 'text-red-700'
          : 'text-gray-900';
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-gray-500">{label}</div>
      <div className={`mt-0.5 text-sm font-bold ${colorClass}`}>{value}</div>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: any;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-300 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Icon className="size-5 text-blue-600" />
          {title}
        </h2>
        {action ? <div className="flex items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-semibold text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function EditableTable({
  headers,
  rows,
  emptyText,
}: {
  headers: string[];
  rows: React.ReactNode[];
  emptyText: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse bg-white text-xs">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b bg-gray-100 px-3 py-2 text-left font-semibold text-gray-700">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <tr>
              <td colSpan={headers.length} className="py-6 text-center text-gray-500">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'primary' | 'success' | 'danger';
}) {
  const borderClass = tone === 'primary' ? 'border-blue-200 bg-blue-50' : tone === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50';
  const textClass = tone === 'primary' ? 'text-blue-900' : tone === 'success' ? 'text-green-700' : 'text-red-700';
  return (
    <div className={`rounded-lg border px-4 py-3 ${borderClass}`}>
      <div className="text-xs font-semibold uppercase text-gray-600">{label}</div>
      <div className={`mt-0.5 text-sm font-bold ${textClass}`}>{value}</div>
    </div>
  );
}

function AgreementSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-gray-300">
      <div className="bg-blue-900 px-4 py-2 font-bold text-white">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function AgreementField({
  label,
  value,
  className = '',
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs font-semibold uppercase text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-900">{value && value.trim().length > 0 ? value : '-'}</div>
    </div>
  );
}

function AgreementDataTable({
  headers,
  rows,
  emptyText,
}: {
  headers: string[];
  rows: string[][];
  emptyText: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full bg-white text-sm">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, rowIndex) => (
              <tr key={`${headers[0]}-${rowIndex}`} className="border-t border-gray-100">
                {row.map((cell, cellIndex) => (
                  <td key={`${headers[cellIndex]}-${rowIndex}`} className="px-3 py-2 text-gray-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length} className="px-4 py-6 text-center text-sm text-gray-500">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function OutsideServicesAgreementView({
  draft,
  totals,
  dishesById,
  menuPackagesById,
  resolvedSupplyLocation,
  resolvedSupplyArea,
  resolvedSupplyCity,
  supplyTimeLabel,
}: {
  draft: OrderDraft;
  totals: ReturnType<typeof computeDraftTotals>;
  dishesById: Map<string, Dish>;
  menuPackagesById: Map<string, MenuPackage>;
  resolvedSupplyLocation: string;
  resolvedSupplyArea: string;
  resolvedSupplyCity: string;
  supplyTimeLabel: string;
}) {
  return (
    <div className="p-6">
      <div className="mb-8 border-b-4 border-blue-900 pb-6 text-center">
        <h1 className="text-4xl font-bold text-blue-900">VENUEOPS ERP</h1>
        <p className="mt-2 text-lg font-semibold text-gray-700">Outside Services Supply Order Agreement</p>
        <p className="mt-2 text-sm text-gray-600">Dispatch, catering, rental, and payment confirmation for approved outside services.</p>
      </div>

      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900">OUTSIDE SERVICES AGREEMENT</h2>
        <p className="mt-1 text-sm text-gray-600">Order No: <span className="font-bold text-blue-900">{draft.id}</span></p>
        <p className="text-sm text-gray-600">Prepared On: {formatDatePK(new Date())}</p>
      </div>

      <AgreementSection title="Customer Information">
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <AgreementField label="Customer Name" value={draft.customerName} />
          <AgreementField label="Primary Phone" value={draft.primaryPhone} />
          <AgreementField label="Secondary Phone" value={draft.secondaryPhone} />
          <AgreementField label="Customer Address" value={draft.address} />
          <AgreementField label="Area / Locality" value={[draft.area, draft.city].filter(Boolean).join(', ')} />
          <AgreementField label="Reference Source" value={draft.referenceSource} />
          <AgreementField label="Reference" value={draft.reference} />
          <AgreementField label="Approved By" value={draft.approvedBy} />
          <AgreementField label="Credit Reference" value={draft.creditReference} />
          <AgreementField label="Remarks" value={draft.remarks} className="md:col-span-2" />
        </div>
      </AgreementSection>

      <AgreementSection title="Supply Details">
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <AgreementField label="Supply Date" value={draft.supplyDate ? formatDatePK(draft.supplyDate) : '-'} />
          <AgreementField label="Supply Type" value={draft.supplyType} />
          <AgreementField label="Delivery Time" value={draft.deliveryTime} />
          <AgreementField label="Pickup Time" value={draft.sameDeliveryAndPickupTime ? 'Same as delivery time' : draft.pickupTime} />
          <AgreementField label="Delivery Address Source" value={draft.useCustomerAddressForSupply ? 'Same as customer address' : 'Separate delivery address'} />
          <AgreementField label="Delivery Address" value={resolvedSupplyLocation} />
          <AgreementField label="Area / Sector" value={resolvedSupplyArea} />
          <AgreementField label="Delivery City" value={resolvedSupplyCity} />
          <AgreementField label="Delivery Instructions" value={draft.deliveryInstructions} className="md:col-span-2" />
          <AgreementField label="Internal Notes" value={draft.internalNotes} className="md:col-span-2" />
        </div>
      </AgreementSection>

      <AgreementSection title="Food Supplies">
        <AgreementDataTable
          headers={['Item', 'Kitchen Link', 'Quantity', 'Rate', 'Total', 'Dispatch Notes']}
          rows={draft.foodSupplies.map((line) => [
            getFoodSupplyLineDisplayName(line),
            line.kitchenItemId ? dishesById.get(line.kitchenItemId)?.dishName || 'Linked dish' : 'Manual entry',
            line.quantity ? line.quantity.toLocaleString('en-PK') : '0',
            formatCurrencyPKR(line.rate),
            formatCurrencyPKR(line.total),
            line.dispatchNotes || '-',
          ])}
          emptyText="No food supply items added."
        />
      </AgreementSection>

      <AgreementSection title="Food & Catering">
        <AgreementDataTable
          headers={['Package / Items', 'Kitchen Package', 'Guests', 'Rate', 'Total', 'Service Staff', 'Setup Notes']}
          rows={draft.cateringItems.map((line) => [
            line.packageName || '-',
            line.packageId ? menuPackagesById.get(line.packageId)?.packageName || 'Linked package' : 'Manual package',
            line.guestCount ? line.guestCount.toLocaleString('en-PK') : '0',
            formatCurrencyPKR(line.rate),
            formatCurrencyPKR(line.total),
            line.serviceStaff ? line.serviceStaff.toLocaleString('en-PK') : '0',
            line.setupNotes || '-',
          ])}
          emptyText="No catering package lines added."
        />
      </AgreementSection>

      <AgreementSection title="RCS Services">
        <AgreementDataTable
          headers={['Service Type', 'Quantity', 'Charges', 'Total', 'Notes']}
          rows={draft.rcsServices.map((line) => [
            line.serviceType || '-',
            line.quantity ? line.quantity.toLocaleString('en-PK') : '0',
            formatCurrencyPKR(line.charges),
            formatCurrencyPKR(line.total),
            line.notes || '-',
          ])}
          emptyText="No RCS services added."
        />
      </AgreementSection>

      <AgreementSection title="Rental Items">
        <AgreementDataTable
          headers={['Category', 'Item', 'Issue', 'Return', 'Damaged', 'Pending', 'Rate', 'Total']}
          rows={draft.rentalItems.map((line) => [
            line.category || '-',
            line.itemName || '-',
            line.issueQuantity.toLocaleString('en-PK'),
            line.returnQuantity.toLocaleString('en-PK'),
            line.damagedQuantity.toLocaleString('en-PK'),
            line.pendingQuantity.toLocaleString('en-PK'),
            formatCurrencyPKR(line.rate),
            formatCurrencyPKR(line.total),
          ])}
          emptyText="No rental items added."
        />
      </AgreementSection>

      <AgreementSection title="Miscellaneous Charges">
        <AgreementDataTable
          headers={['Charge', 'Amount', 'Notes']}
          rows={draft.miscCharges.map((line) => [line.label || '-', formatCurrencyPKR(line.amount), line.notes || '-'])}
          emptyText="No miscellaneous charges added."
        />
      </AgreementSection>

      <div className="mb-6 overflow-hidden rounded-lg border-2 border-blue-900">
        <div className="bg-blue-900 px-4 py-3 text-lg font-bold text-white">FINANCIAL SUMMARY</div>
        <div className="p-4">
          <table className="w-full text-base">
            <tbody>
              <tr className="border-b">
                <td className="px-3 py-3 text-gray-700">Food Supplies</td>
                <td className="px-3 py-3 text-right font-semibold text-gray-900">{formatCurrencyPKR(totals.foodSuppliesTotal)}</td>
              </tr>
              <tr className="border-b">
                <td className="px-3 py-3 text-gray-700">Food & Catering</td>
                <td className="px-3 py-3 text-right font-semibold text-gray-900">{formatCurrencyPKR(totals.cateringTotal)}</td>
              </tr>
              <tr className="border-b">
                <td className="px-3 py-3 text-gray-700">RCS Services</td>
                <td className="px-3 py-3 text-right font-semibold text-gray-900">{formatCurrencyPKR(totals.rcsTotal)}</td>
              </tr>
              <tr className="border-b">
                <td className="px-3 py-3 text-gray-700">Rental Items</td>
                <td className="px-3 py-3 text-right font-semibold text-gray-900">{formatCurrencyPKR(totals.rentalTotal)}</td>
              </tr>
              <tr className="border-b">
                <td className="px-3 py-3 text-gray-700">Miscellaneous Charges</td>
                <td className="px-3 py-3 text-right font-semibold text-gray-900">{formatCurrencyPKR(totals.miscTotal)}</td>
              </tr>
              <tr className="border-t-4 border-blue-900 bg-blue-50">
                <td className="px-3 py-4 text-xl font-bold text-gray-900">GRAND TOTAL</td>
                <td className="px-3 py-4 text-right text-2xl font-bold text-blue-900">{formatCurrencyPKR(totals.grandTotal)}</td>
              </tr>
              <tr className="border-b bg-green-50">
                <td className="px-3 py-3 text-lg font-semibold text-gray-900">PAID</td>
                <td className="px-3 py-3 text-right text-xl font-bold text-green-700">{formatCurrencyPKR(totals.paid)}</td>
              </tr>
              <tr className="bg-red-50">
                <td className="px-3 py-3 text-lg font-semibold text-gray-900">REMAINING BALANCE</td>
                <td className="px-3 py-3 text-right text-xl font-bold text-red-700">{formatCurrencyPKR(totals.balance)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {draft.payments.length > 0 && (
        <AgreementSection title="PAYMENT HISTORY">
          <div className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Date</th>
                  <th className="px-3 py-2 text-left font-semibold">Type</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount (Rs.)</th>
                  <th className="px-3 py-2 text-left font-semibold">Method</th>
                  <th className="px-3 py-2 text-left font-semibold">Received By</th>
                </tr>
              </thead>
              <tbody>
                {draft.payments.map((payment) => (
                  <tr key={payment.id} className="border-t">
                    <td className="px-3 py-2">{payment.date ? formatDatePK(payment.date) : '-'}</td>
                    <td className="px-3 py-2">{payment.type || 'Payment'}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatCurrencyPKR(payment.amount)}</td>
                    <td className="px-3 py-2">{payment.method}</td>
                    <td className="px-3 py-2">{payment.receivedBy || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AgreementSection>
      )}

      <AgreementSection title="AGREEMENT NOTES">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-sm leading-6 text-gray-700">
          {draft.agreementNotes || 'No additional agreement notes added.'}
        </div>
      </AgreementSection>

      <AgreementSection title="CHANGE HISTORY LOG">
        <div className="p-0">
          <table className="w-full text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Timestamp</th>
                <th className="px-3 py-2 text-left font-semibold">Action</th>
                <th className="px-3 py-2 text-left font-semibold">Section</th>
                <th className="px-3 py-2 text-left font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              {draft.historyLog.length > 0 ? (
                [...draft.historyLog]
                  .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
                  .map((entry) => (
                    <tr key={entry.id} className="border-t">
                      <td className="px-3 py-2">{new Date(entry.timestamp).toLocaleString()}</td>
                      <td className="px-3 py-2">{entry.action}</td>
                      <td className="px-3 py-2">{entry.section}</td>
                      <td className="px-3 py-2">{entry.description}</td>
                    </tr>
                  ))
              ) : (
                <tr className="border-t">
                  <td colSpan={4} className="px-3 py-3 text-center text-gray-500">No changes recorded yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AgreementSection>

      <AgreementSection title="TERMS & CONDITIONS">
        <div className="space-y-2 p-0 text-xs text-gray-700">
          <p>1. This agreement confirms an outside services order only and is not linked to venue reservation or hall allocation.</p>
          <p>2. Supply, catering, rental, and dispatch quantities must be checked by the client at delivery and pickup where applicable.</p>
          <p>3. Balance payment remains payable after supply completion unless alternate written approval has been recorded on this order.</p>
          <p>4. Any change in supply date, delivery time, pickup time, item quantity, or dispatch plan must be recorded through the order history.</p>
          <p>5. Rental shortages, damages, and pending returns are chargeable as per approved order rates and recovery policy.</p>
          <p>6. Cancellation applies to the outside service order only and may trigger dispatch or inventory rollback according to operations policy.</p>
          <p>7. All disputes are subject to Lahore jurisdiction only.</p>
        </div>
      </AgreementSection>

      <AgreementSection title="APPROVAL AND SIGN-OFF">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="text-xs font-semibold uppercase text-gray-500">Customer / Reference Approval</div>
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <AgreementField label="Reference" value={draft.reference} />
              <AgreementField label="Approved By" value={draft.approvedBy} />
              <AgreementField label="Credit Reference" value={draft.creditReference} />
              <div className="pt-6">
                <div className="border-t border-gray-300 pt-2 text-xs uppercase tracking-wide text-gray-500">Customer Signature</div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="text-xs font-semibold uppercase text-gray-500">Operations Confirmation</div>
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <AgreementField label="Order State" value={draft.status === 'cancelled' ? 'Cancelled supply order' : 'Active confirmed order'} />
              <AgreementField label="Supply Window" value={`${draft.supplyDate ? formatDatePK(draft.supplyDate) : '-'} | ${supplyTimeLabel}`} />
              <AgreementField label="Balance Payable" value={formatCurrencyPKR(totals.balance)} />
              <div className="pt-6">
                <div className="border-t border-gray-300 pt-2 text-xs uppercase tracking-wide text-gray-500">Authorized By Operations</div>
              </div>
            </div>
          </div>
        </div>
      </AgreementSection>
    </div>
  );
}

export function OutsideServicesModule({
  bookings,
  serviceBookings,
  dishes,
  menuPackages,
  onServiceBookingsChange,
}: OutsideServicesModuleProps) {
  const [dateWindow, setDateWindow] = useState<DateWindow>('today');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [baseDate, setBaseDate] = useState(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);

  const normalizedOrders = useMemo(
    () =>
      serviceBookings
        .map((booking) => normalizeOrderDraft(booking))
        .sort((left, right) => {
          const dateDiff = left.supplyDate.localeCompare(right.supplyDate);
          if (dateDiff !== 0) return dateDiff;
          return compareTime(left.deliveryTime, right.deliveryTime);
        }),
    [serviceBookings],
  );

  const filteredOrders = useMemo(() => {
    const currentDate = new Date(baseDate);
    currentDate.setHours(12, 0, 0, 0);
    const todayKey = toDateKey(currentDate);
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const normalizedQuery = normalizeText(searchQuery);

    return normalizedOrders.filter((order) => {
      const orderDate = parseDate(order.supplyDate);
      const inRange =
        dateWindow === 'today'
          ? order.supplyDate === todayKey
          : dateWindow === 'week'
            ? orderDate >= weekStart && orderDate <= weekEnd
            : orderDate >= monthStart && orderDate <= monthEnd;

      if (!inRange) return false;
      if (!normalizedQuery) return true;

      return (
        normalizeText(order.customerName).includes(normalizedQuery) ||
        normalizeText(order.supplyType).includes(normalizedQuery) ||
        normalizeText(order.supplyLocation).includes(normalizedQuery) ||
        normalizePhone(order.primaryPhone).includes(normalizePhone(normalizedQuery))
      );
    });
  }, [baseDate, dateWindow, normalizedOrders, searchQuery]);

  const selectedBooking = useMemo(
    () => serviceBookings.find((booking) => booking.id === selectedBookingId),
    [selectedBookingId, serviceBookings],
  );

  const dashboardTotals = useMemo(() => {
    return filteredOrders.reduce(
      (summary, order) => {
        const totals = computeDraftTotals(order);
        summary.total += totals.grandTotal;
        summary.paid += totals.paid;
        summary.balance += totals.balance;
        summary.orders += 1;
        if (order.status !== 'cancelled') {
          summary.active += 1;
        }
        return summary;
      },
      { total: 0, paid: 0, balance: 0, orders: 0, active: 0 },
    );
  }, [filteredOrders]);

  const groupedOrders = useMemo(() => {
    const groups = new Map<string, OrderDraft[]>();
    filteredOrders.forEach((order) => {
      const existing = groups.get(order.supplyDate) || [];
      existing.push(order);
      existing.sort((left, right) => compareTime(left.deliveryTime, right.deliveryTime));
      groups.set(order.supplyDate, existing);
    });
    return Array.from(groups.entries()).sort((left, right) => left[0].localeCompare(right[0]));
  }, [filteredOrders]);

  const openNewOrder = () => {
    setSelectedBookingId(null);
    setShowOrderForm(true);
  };

  const openExistingOrder = (orderId: string) => {
    setSelectedBookingId(orderId);
    setShowOrderForm(true);
  };

  const handleSaveOrder = (booking: ServiceBooking) => {
    const exists = serviceBookings.some((entry) => entry.id === booking.id);
    onServiceBookingsChange(
      exists
        ? serviceBookings.map((entry) => (entry.id === booking.id ? booking : entry))
        : [...serviceBookings, booking],
    );
    setShowOrderForm(false);
    setSelectedBookingId(null);
  };

  const shiftRange = (direction: 'prev' | 'next') => {
    const factor = direction === 'next' ? 1 : -1;
    if (dateWindow === 'today') {
      setBaseDate((current) => shiftDate(current, factor));
      return;
    }
    if (dateWindow === 'week') {
      setBaseDate((current) => shiftDate(current, factor * 7));
      return;
    }
    setBaseDate((current) => shiftMonth(current, factor));
  };

  return (
    <>
      <div className="flex h-full flex-col bg-gray-50">
        <div className="border-b border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Outside Services</h1>
              <p className="mt-0.5 text-sm text-gray-600">
                Dispatch-driven supply orders aligned to the confirmed reservation workflow.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-white'}`}
                >
                  Supply List
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-white'}`}
                >
                  Dispatch Calendar
                </button>
              </div>
              <Button onClick={openNewOrder} className="bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="mr-2 size-4" />
                New Order
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-lg border border-gray-200 bg-white p-1">
                {(['today', 'week', 'month'] as DateWindow[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => setDateWindow(option)}
                    className={`rounded-md px-3 py-2 text-sm font-medium capitalize ${dateWindow === option ? 'bg-slate-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1">
                <button onClick={() => shiftRange('prev')} className="rounded p-2 text-gray-600 hover:bg-gray-100">
                  <ArrowLeft className="size-4" />
                </button>
                <div className="min-w-[220px] text-center text-sm font-semibold text-gray-900">
                  {getRangeLabel(dateWindow, baseDate)}
                </div>
                <button onClick={() => shiftRange('next')} className="rounded p-2 text-gray-600 hover:bg-gray-100">
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>

            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search customer, type, phone, or location"
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-5 md:grid-cols-4">
          <MetricCard label="Orders In View" value={dashboardTotals.orders.toLocaleString('en-PK')} tone="primary" />
          <MetricCard label="Active Orders" value={dashboardTotals.active.toLocaleString('en-PK')} tone="success" />
          <MetricCard label="Total Value" value={formatCurrencyPKR(dashboardTotals.total)} tone="primary" />
          <MetricCard label="Outstanding" value={formatCurrencyPKR(dashboardTotals.balance)} tone="danger" />
        </div>

        <div className="flex-1 overflow-auto px-6 pb-6">
          {viewMode === 'list' ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    {['Time', 'Customer', 'Supply Type', 'Area / Delivery Location', 'Guests / Quantity', 'Total', 'Advance / Paid', 'Balance'].map((header) => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => {
                      const totals = computeDraftTotals(order);
                      return (
                        <tr
                          key={order.id}
                          onClick={() => openExistingOrder(order.id)}
                          className={`cursor-pointer border-b border-gray-100 transition-colors hover:bg-blue-50 ${order.status === 'cancelled' ? 'bg-red-50/50 text-gray-500' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-gray-900">{order.deliveryTime || '-'}</div>
                            <div className="text-xs text-gray-500">{order.pickupTime ? `Pickup ${order.pickupTime}` : 'No pickup time'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-gray-900">{order.customerName || '-'}</div>
                            <div className="text-xs text-gray-500">{order.primaryPhone || '-'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                              {order.supplyType}
                            </div>
                            {order.status === 'cancelled' && (
                              <div className="mt-1 text-xs font-medium text-red-700">Cancelled order</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{order.supplyLocation || '-'}</div>
                            <div className="text-xs text-gray-500">{order.supplyArea || order.city || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{summarizeGuestOrQuantity(order)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrencyPKR(totals.grandTotal)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-700">{formatCurrencyPKR(totals.paid)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-red-700">{formatCurrencyPKR(totals.balance)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">
                        No outside service orders found in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedOrders.length > 0 ? (
                groupedOrders.map(([dateKey, orders]) => (
                  <div key={dateKey} className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-200 bg-slate-50 px-4 py-3">
                      <div>
                        <div className="text-sm font-bold text-gray-900">{formatDatePK(dateKey)}</div>
                        <div className="text-xs text-gray-500">{orders.length} dispatch order{orders.length === 1 ? '' : 's'}</div>
                      </div>
                      <CalendarDays className="size-4 text-slate-500" />
                    </div>
                    <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                      {orders.map((order) => (
                        <button
                          key={order.id}
                          onClick={() => openExistingOrder(order.id)}
                          className={`rounded-lg border px-4 py-3 text-left transition-colors hover:bg-blue-50 ${order.status === 'cancelled' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-bold text-gray-900">{order.customerName || '-'}</div>
                            <div className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                              {order.supplyType}
                            </div>
                          </div>
                          <div className="mt-3 space-y-1 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <Clock3 className="size-4 text-slate-500" />
                              <span>Delivery {order.deliveryTime || '-'} | Pickup {order.pickupTime || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="size-4 text-slate-500" />
                              <span>{order.supplyLocation || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ClipboardList className="size-4 text-slate-500" />
                              <span>{summarizeGuestOrQuantity(order)}</span>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="font-semibold text-gray-900">{formatCurrencyPKR(computeDraftTotals(order).grandTotal)}</span>
                            <span className="font-semibold text-red-700">{formatCurrencyPKR(computeDraftTotals(order).balance)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
                  No dispatch entries are scheduled in this range.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showOrderForm && (
        <OutsideServicesOrderForm
          initialBooking={selectedBooking}
          bookings={bookings}
          serviceBookings={serviceBookings}
          dishes={dishes}
          menuPackages={menuPackages}
          onClose={() => {
            setShowOrderForm(false);
            setSelectedBookingId(null);
          }}
          onSave={handleSaveOrder}
        />
      )}
    </>
  );
}
