import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Sidebar } from './Sidebar';
import { Booking, ServiceBooking } from '../calendar/types-v2';
import type { BookingFormData } from '../calendar/UnifiedBookingDialog';
import type { TentativeReservationSlot } from '../calendar/TentativeReservationWorkspace';
import { buildKitchenPlanningBookingsFromServiceBookings } from '../kitchen/banquet/outsideServiceKitchenBridge';
import { AuthUser } from '@/app/lib/authTypes';
import {
  canAccessBookingAgreementPreview,
  canAccessModuleForRole,
  canAccessReservationPaymentTools,
  MODULE_KEYS,
  normalizeRole,
} from '@/app/lib/permissions';
import { usePersistedWorkflowState, WORKFLOW_STATE_KEYS } from '@/app/lib/workflowState';
import {
  getDefaultVenueId,
  getVenueById,
  normalizeBookingVenueContext,
  primeSpaces,
} from '../calendar/data-v2';
import { hasConfirmedReservationConflict } from '@/app/lib/reservationConflicts';
import { getBookingSpaceAssignments } from '@/app/lib/bookingSpaces';
import {
  defaultStoreMaster,
  normalizeGoodsReceipts,
  normalizeKitchenIssueSheets,
  normalizeKitchenStations,
  normalizePurchaseItemStores,
  normalizeStockTransfers,
  normalizeStoreMaster,
  normalizeStoreStocks,
} from '@/app/lib/storeMaster';
import { DEFAULT_UNIT_MASTERS } from '@/app/lib/unitConversion';
import {
  DEFAULT_PROCUREMENT_LOOKUPS,
  normalizeProcurementLookups,
} from '@/app/lib/procurementLookups';
import type {
  KitchenDishCategory,
  KitchenIssueSheet,
  KitchenStation,
  MenuPackageTypeMaster,
  ProcurementLookupState,
  PurchaseItem,
  StoreMaster,
  UnitMaster,
  VendorItemMapping,
} from '../kitchen/types';

// VenueOps ERP System Component - v2.0.15 - Customer Database Integration - 22Mar2026

// Import types from data file
import type { 
  Cuisine, 
  Dish, 
  Recipe, 
  MenuPackage,
  Vendor,
  PurchaseOrder,
  GoodsReceipt,
  StoreStock,
  StockTransfer,
  CustomerInvoice,
  VendorBill,
  GeneralExpense,
  PaymentReceipt,
  PaymentVoucher,
  StatusFilters,
} from '../data/dummyData';

const ProcurementManagement = lazy(async () => ({
  default: (await import('../procurement/ProcurementManagement')).ProcurementManagement,
}));
const InventoryManagement = lazy(async () => ({
  default: (await import('../inventory/InventoryManagement')).InventoryManagement,
}));
const AccountsFinanceManagement = lazy(async () => ({
  default: (await import('../finance/AccountsFinanceManagement')).AccountsFinanceManagement,
}));
const CalendarHeaderV2 = lazy(async () => ({
  default: (await import('../calendar/CalendarHeaderV2')).CalendarHeaderV2,
}));
const DayViewV2 = lazy(async () => ({
  default: (await import('../calendar/DayViewV2')).DayViewV2,
}));
const MonthViewV2 = lazy(async () => ({
  default: (await import('../calendar/MonthViewV2')).MonthViewV2,
}));
const AgendaViewV2 = lazy(async () => ({
  default: (await import('../calendar/AgendaViewV2')).AgendaViewV2,
}));
const UnifiedBookingDialog = lazy(async () => ({
  default: (await import('../calendar/UnifiedBookingDialog')).UnifiedBookingDialog,
}));
const ConfirmedReservationForm = lazy(async () => ({
  default: (await import('../calendar/ConfirmedReservationForm')).ConfirmedReservationForm,
}));
const TentativeReservationWorkspace = lazy(async () => ({
  default: (await import('../calendar/TentativeReservationWorkspace')).TentativeReservationWorkspace,
}));
const QuickAvailabilityCheckDialog = lazy(async () => ({
  default: (await import('../calendar/QuickAvailabilityCheckDialog')).QuickAvailabilityCheckDialog,
}));
const OutsideServicesModule = lazy(async () => ({
  default: (await import('../calendar/OutsideServicesModule')).OutsideServicesModule,
}));
const CustomerDatabase = lazy(async () => ({
  default: (await import('../customers/CustomerDatabase')).CustomerDatabase,
}));
const FrontOfficeDashboard = lazy(async () => ({
  default: (await import('./dashboards/FrontOfficeDashboard-new')).FrontOfficeDashboard,
}));
const TentativeFollowUpModule = lazy(async () => ({
  default: (await import('./dashboards/TentativeFollowUpModule')).TentativeFollowUpModule,
}));
const BanquetKitchenManagement = lazy(async () => ({
  default: (await import('../kitchen/banquet/BanquetKitchenManagement')).BanquetKitchenManagement,
}));
const BanquetKitchenDashboard = lazy(async () => ({
  default: (await import('../kitchen/banquet/BanquetKitchenDashboard')).BanquetKitchenDashboard,
}));
const RestaurantKitchenDashboard = lazy(async () => ({
  default: (await import('../kitchen/restaurant/RestaurantKitchenDashboard')).RestaurantKitchenDashboard,
}));
const UnitMasterSetup = lazy(async () => ({
  default: (await import('../kitchen/shared/UnitMasterSetup')).UnitMasterSetup,
}));
const SetupModule = lazy(async () => ({
  default: (await import('./setup/SetupModule')).SetupModule,
}));
const EventAvailabilityCalendar = lazy(async () => ({
  default: (await import('../calendar/EventAvailabilityCalendar')).EventAvailabilityCalendar,
}));
const ReservationReports = lazy(async () => ({
  default: (await import('./reports/ReservationReports')).ReservationReports,
}));

interface ERPSystemProps {
  currentUser: AuthUser;
  onLogout: () => void;
  bookings: Booking[];
  onBookingsChange: (bookings: Booking[]) => void;
  serviceBookings: ServiceBooking[];
  onServiceBookingsChange: (bookings: ServiceBooking[]) => void;
}

type CalendarSlotContext = TentativeReservationSlot & {
  bookingType?: 'confirmed' | 'tentative';
  customerName?: string;
  contactNumber?: string;
  guestCount?: number;
  eventType?: string;
  notes?: string;
};

const CURRENT_MODULE_STORAGE_KEY = 'venueops:erp-current-module';

const loadStoredCurrentModule = () => {
  if (typeof window === 'undefined') {
    return 'dashboard';
  }

  return window.localStorage.getItem(CURRENT_MODULE_STORAGE_KEY) || 'dashboard';
};

function WorkspaceLoadingState({ label = 'Loading workspace...' }: { label?: string }) {
  return (
    <div className="h-full flex items-center justify-center bg-white p-6">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-gray-50 px-5 py-4 text-center">
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        <div className="mt-1 text-xs text-gray-600">Loading the selected ERP workspace on demand to keep navigation lighter.</div>
      </div>
    </div>
  );
}

function DialogLoadingState({ label = 'Loading form...' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-5 py-4 text-center shadow-xl">
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        <div className="mt-1 text-xs text-gray-600">Preparing the screen only when you open it.</div>
      </div>
    </div>
  );
}

export function ERPSystem({
  currentUser,
  onLogout,
  bookings,
  onBookingsChange,
  serviceBookings,
  onServiceBookingsChange,
}: ERPSystemProps) {
  const userRole = normalizeRole(currentUser.role);
  const userName = currentUser.fullName?.trim() || currentUser.email?.split('@')[0] || 'User';
  const isFrontOffice = userRole === 'front-office';
  const [currentModule, setCurrentModule] = useState(() => loadStoredCurrentModule());
  const [reservationFollowUpMode, setReservationFollowUpMode] = useState<'tentative' | 'payment'>('tentative');
  const canViewReservationPayments = canAccessReservationPaymentTools(userRole, currentUser.permissions);
  const canPreviewBookingAgreement = canAccessBookingAgreementPreview(userRole, currentUser.permissions);
  const canAccessModule = (
    moduleKey: string,
    action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'manage' = 'view',
  ) => canAccessModuleForRole(userRole, currentUser.permissions, moduleKey, action);
  
  // Calendar-related states
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedVenueId, setSelectedVenueId] = useState(() => getDefaultVenueId());
  const [selectedBooking, setSelectedBooking] = useState<Booking | undefined>();
  const [newReservationOpen, setNewReservationOpen] = useState(false); // For confirmed reservations
  const [tentativeReservationOpen, setTentativeReservationOpen] = useState(false); // For inquiry follow-up reservations
  const [quickBookDialogOpen, setQuickBookDialogOpen] = useState(false);
  const [availabilityCheckOpen, setAvailabilityCheckOpen] = useState(false);
  const [quickBookContext, setQuickBookContext] = useState<CalendarSlotContext | undefined>();
  const [tentativeSlotContext, setTentativeSlotContext] = useState<CalendarSlotContext | undefined>();
  const [tentativeInquiryData, setTentativeInquiryData] = useState<Partial<Booking> | null>(null);
  const [reservationInitialStatus, setReservationInitialStatus] = useState<'tentative' | 'confirmed'>('confirmed');
  const [statusFilters, setStatusFilters] = useState<StatusFilters>({
    available: true,
    tentative: true,
    confirmed: true,
  });
  const normalizedBookings = useMemo(
    () => bookings.map((booking) => normalizeBookingVenueContext(booking)),
    [bookings],
  );
  const kitchenPlanningBookings = useMemo(
    () => [...normalizedBookings, ...buildKitchenPlanningBookingsFromServiceBookings(serviceBookings)],
    [normalizedBookings, serviceBookings],
  );
  const tentativeInquiryInitialData = useMemo<Partial<Booking>>(() => {
    const venueId = selectedVenueId || getDefaultVenueId();

    return {
      venueId,
      venueName: getVenueById(venueId)?.name,
      date: currentDate,
      startTime: '18:00',
      endTime: '22:00',
      followUpStatus: 'New',
    };
  }, [currentDate, selectedVenueId]);

  useEffect(() => {
    if (!selectedVenueId || !getVenueById(selectedVenueId)) {
      const fallbackVenueId = getDefaultVenueId();
      if (fallbackVenueId && fallbackVenueId !== selectedVenueId) {
        setSelectedVenueId(fallbackVenueId);
      }
    }
  }, [selectedVenueId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(CURRENT_MODULE_STORAGE_KEY, currentModule);
  }, [currentModule]);

  // Format hour to AM/PM
  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  // Kitchen Management states with sample data
  const [cuisines, setCuisines] = usePersistedWorkflowState<Cuisine[]>(
    WORKFLOW_STATE_KEYS.banquetCuisines,
    [
    {
      id: 'cuisine-1',
      name: 'Pakistani',
      description: 'Traditional Pakistani cuisine',
      module: 'banquet',
      status: 'active',
      createdBy: 'System',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'cuisine-2',
      name: 'Chinese',
      description: 'Chinese and oriental cuisine',
      module: 'banquet',
      status: 'active',
      createdBy: 'System',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'cuisine-3',
      name: 'Continental',
      description: 'Western continental dishes',
      module: 'banquet',
      status: 'active',
      createdBy: 'System',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ]);

  const [kitchenStations, setKitchenStations] = usePersistedWorkflowState<KitchenStation[]>(
    WORKFLOW_STATE_KEYS.kitchenStations,
    [
      {
        id: 'station-1',
        code: 'hot-kitchen',
        name: 'Hot Kitchen',
        module: 'banquet',
        status: 'active',
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'station-2',
        code: 'cold-kitchen',
        name: 'Cold Kitchen',
        module: 'banquet',
        status: 'active',
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'station-3',
        code: 'tandoor',
        name: 'Tandoor',
        module: 'banquet',
        status: 'active',
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'station-4',
        code: 'bbq-station',
        name: 'BBQ Station',
        module: 'banquet',
        status: 'active',
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'station-5',
        code: 'taka-taka-station',
        name: 'Taka Taka Station',
        module: 'banquet',
        status: 'active',
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'station-6',
        code: 'live-station',
        name: 'Live Station',
        module: 'banquet',
        status: 'active',
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'station-7',
        code: 'beverage-section',
        name: 'Beverage Section',
        module: 'banquet',
        status: 'active',
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'station-8',
        code: 'bakery-section',
        name: 'Bakery Section',
        module: 'banquet',
        status: 'active',
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ],
  );

  const [dishCategories, setDishCategories] = usePersistedWorkflowState<KitchenDishCategory[]>(
    WORKFLOW_STATE_KEYS.dishCategories,
    [
      {
        id: 'dish-category-1',
        code: 'appetizer',
        name: 'Appetizer',
        module: 'banquet',
        status: 'active',
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'dish-category-2',
        code: 'main-course',
        name: 'Main Course',
        module: 'banquet',
        status: 'active',
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'dish-category-3',
        code: 'dessert',
        name: 'Dessert',
        module: 'banquet',
        status: 'active',
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'dish-category-4',
        code: 'beverage',
        name: 'Beverage',
        module: 'banquet',
        status: 'active',
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'dish-category-5',
        code: 'side-dish',
        name: 'Side Dish',
        module: 'banquet',
        status: 'active',
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'dish-category-6',
        code: 'bread',
        name: 'Bread',
        module: 'banquet',
        status: 'active',
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'dish-category-7',
        code: 'salad',
        name: 'Salad',
        module: 'banquet',
        status: 'active',
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'dish-category-8',
        code: 'soup',
        name: 'Soup',
        module: 'banquet',
        status: 'active',
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ],
  );

  const [measurementUnits, setMeasurementUnits] = usePersistedWorkflowState<UnitMaster[]>(
    WORKFLOW_STATE_KEYS.measurementUnits,
    DEFAULT_UNIT_MASTERS,
  );
  
  const [dishes, setDishes] = usePersistedWorkflowState<Dish[]>(WORKFLOW_STATE_KEYS.banquetDishes, []);
  
  const [purchaseItems, setPurchaseItems] = usePersistedWorkflowState<PurchaseItem[]>(
    WORKFLOW_STATE_KEYS.purchaseItems,
    [],
  );
  
  const [recipes, setRecipes] = usePersistedWorkflowState<Recipe[]>(WORKFLOW_STATE_KEYS.banquetRecipes, []);
  const [menuPackages, setMenuPackages] = usePersistedWorkflowState<MenuPackage[]>(
    WORKFLOW_STATE_KEYS.banquetMenuPackages,
    [],
  );
  const [menuPackageTypes, setMenuPackageTypes] = usePersistedWorkflowState<MenuPackageTypeMaster[]>(
    WORKFLOW_STATE_KEYS.banquetMenuPackageTypes,
    [
      {
        id: 'package-type-1',
        code: 'wedding-menu',
        name: 'Wedding Menu',
        status: 'active',
        displayOrder: 1,
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'package-type-2',
        code: 'tea-counter',
        name: 'Tea Counter',
        status: 'active',
        displayOrder: 2,
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'package-type-3',
        code: 'soup-counter',
        name: 'Soup Counter',
        status: 'active',
        displayOrder: 3,
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'package-type-4',
        code: 'corporate-event',
        name: 'Corporate Event',
        status: 'active',
        displayOrder: 4,
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'package-type-5',
        code: 'custom',
        name: 'Custom',
        status: 'active',
        displayOrder: 5,
        createdBy: 'System',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ],
  );

  const [stores, setStores] = usePersistedWorkflowState<StoreMaster[]>(
    WORKFLOW_STATE_KEYS.stores,
    defaultStoreMaster,
  );

  // Procurement Management states
  const [procurementLookups, setProcurementLookups] = usePersistedWorkflowState<ProcurementLookupState>(
    WORKFLOW_STATE_KEYS.procurementLookups,
    DEFAULT_PROCUREMENT_LOOKUPS,
  );

  const [vendors, setVendors] = usePersistedWorkflowState<Vendor[]>(
    WORKFLOW_STATE_KEYS.vendors,
    [
    {
      id: 'vendor-1',
      vendorName: 'Al-Rehman Poultry Farm',
      vendorCode: 'VEN0001',
      vendorCategories: [
        { category: 'poultry', startDate: new Date('2024-01-01'), isActive: true },
        { category: 'meat', startDate: new Date('2024-01-15'), isActive: true },
      ],
      contactPerson: 'Muhammad Ahmed',
      phone: '0300-1234567',
      email: 'alrehman@example.com',
      address: 'Ferozpur Road, Lahore',
      city: 'Lahore',
      paymentTerms: 'credit-7',
      creditLimit: 500000,
      status: 'active',
      pricingFormulas: [
        {
          id: 'formula-1',
          productType: 'Chicken With Bone',
          pricingMethod: 'supply-rate-multiplier',
          baseSupplyRate: 280,
          multiplyFactor: 1.10,
          lastUpdated: new Date(),
        },
        {
          id: 'formula-2',
          productType: 'Chicken Boneless',
          pricingMethod: 'supply-rate-multiplier',
          baseSupplyRate: 520,
          multiplyFactor: 1.15,
          lastUpdated: new Date(),
        },
      ],
      currentBalance: 0,
      totalPurchases: 0,
      createdBy: 'System',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'vendor-2',
      vendorName: 'Fresh Vegetables Suppliers',
      vendorCode: 'VEN0002',
      vendorCategories: [
        { category: 'vegetables-fruit', startDate: new Date('2024-01-01'), isActive: true },
      ],
      contactPerson: 'Ali Hassan',
      phone: '0321-9876543',
      address: 'Sabzi Mandi, Lahore',
      city: 'Lahore',
      paymentTerms: 'cash',
      status: 'active',
      currentBalance: 0,
      totalPurchases: 0,
      createdBy: 'System',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'vendor-3',
      vendorName: 'Coca-Cola Beverages',
      vendorCode: 'VEN0003',
      vendorCategories: [
        { category: 'beverages', startDate: new Date('2024-01-01'), isActive: true },
      ],
      contactPerson: 'Sales Department',
      phone: '042-111-222-333',
      email: 'sales@cocacola.pk',
      address: 'Industrial Area, Lahore',
      city: 'Lahore',
      paymentTerms: 'credit-30',
      creditLimit: 1000000,
      status: 'active',
      currentBalance: 0,
      totalPurchases: 0,
      createdBy: 'System',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ]);

  const [vendorItemMappings, setVendorItemMappings] = usePersistedWorkflowState<VendorItemMapping[]>(
    WORKFLOW_STATE_KEYS.vendorItemMappings,
    [],
  );

  const [purchaseOrders, setPurchaseOrders] = usePersistedWorkflowState<PurchaseOrder[]>(
    WORKFLOW_STATE_KEYS.purchaseOrders,
    [],
  );

  const [goodsReceipts, setGoodsReceipts] = usePersistedWorkflowState<GoodsReceipt[]>(
    WORKFLOW_STATE_KEYS.goodsReceipts,
    [],
  );

  // Inventory Management states
  const [storeStocks, setStoreStocks] = usePersistedWorkflowState<StoreStock[]>(
    WORKFLOW_STATE_KEYS.storeStocks,
    [],
  );

  const [stockTransfers, setStockTransfers] = usePersistedWorkflowState<StockTransfer[]>(
    WORKFLOW_STATE_KEYS.stockTransfers,
    [],
  );

  const [kitchenIssueSheets, setKitchenIssueSheets] = usePersistedWorkflowState<KitchenIssueSheet[]>(
    WORKFLOW_STATE_KEYS.kitchenIssueSheets,
    [],
  );

  useEffect(() => {
    setStores((currentStores) => normalizeStoreMaster(currentStores));
    setProcurementLookups((currentLookups) => normalizeProcurementLookups(currentLookups));
    setKitchenStations((currentStations) => normalizeKitchenStations(currentStations));
    setPurchaseItems((currentItems) => normalizePurchaseItemStores(currentItems));
    setGoodsReceipts((currentReceipts) => normalizeGoodsReceipts(currentReceipts));
    setStoreStocks((currentStocks) => normalizeStoreStocks(currentStocks));
    setStockTransfers((currentTransfers) => normalizeStockTransfers(currentTransfers));
    setKitchenIssueSheets((currentIssueSheets) => normalizeKitchenIssueSheets(currentIssueSheets));
  }, [
    setGoodsReceipts,
    setKitchenIssueSheets,
    setKitchenStations,
    setProcurementLookups,
    setPurchaseItems,
    setStockTransfers,
    setStoreStocks,
    setStores,
  ]);

  useEffect(() => {
    const stockTotals = new Map<string, number>();
    storeStocks.forEach((stock) => {
      stockTotals.set(stock.purchaseItemId, (stockTotals.get(stock.purchaseItemId) || 0) + stock.currentStock);
    });

    setPurchaseItems((currentItems) => {
      let hasChanges = false;

      const nextItems = currentItems.map((item) => {
        const derivedStock = stockTotals.get(item.id) ?? 0;
        if (item.currentStock === derivedStock) {
          return item;
        }

        hasChanges = true;
        return {
          ...item,
          currentStock: derivedStock,
          updatedAt: new Date(),
        };
      });

      return hasChanges ? nextItems : currentItems;
    });
  }, [setPurchaseItems, storeStocks]);

  // Finance Management states
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>([]);
  const [vendorBills, setVendorBills] = usePersistedWorkflowState<VendorBill[]>(
    WORKFLOW_STATE_KEYS.vendorBills,
    [],
  );
  const [generalExpenses, setGeneralExpenses] = useState<GeneralExpense[]>([]);
  const [paymentReceipts, setPaymentReceipts] = useState<PaymentReceipt[]>([]);
  const [paymentVouchers, setPaymentVouchers] = useState<PaymentVoucher[]>([]);

  useEffect(() => {
    const pendingBalanceByVendor = new Map<string, number>();
    vendorBills.forEach((bill) => {
      pendingBalanceByVendor.set(
        bill.vendorId,
        (pendingBalanceByVendor.get(bill.vendorId) || 0) + bill.amountPending,
      );
    });

    setVendors((currentVendors) => {
      let hasChanges = false;

      const nextVendors = currentVendors.map((vendor) => {
        const derivedBalance = pendingBalanceByVendor.get(vendor.id) || 0;
        if (vendor.currentBalance === derivedBalance) {
          return vendor;
        }

        hasChanges = true;
        return {
          ...vendor,
          currentBalance: derivedBalance,
          updatedAt: new Date(),
        };
      });

      return hasChanges ? nextVendors : currentVendors;
    });
  }, [setVendors, vendorBills]);

  useEffect(() => {
    const frontOfficeAllowedRoutes = new Set([
      'dashboard',
      'reservations-calendar',
      'reservations-bookings',
      'reservations-outside-services',
      'reservations-reports',
      'reservations-follow-up',
      'event-availability-calendar',
      'reservations-event-availability-calendar',
      'tentative-reservations-pipeline',
      'reservations-tentative-reservations-pipeline',
      'reservations-tentative',
      'tentative-follow-up',
    ]);

    if (canViewReservationPayments) {
      frontOfficeAllowedRoutes.add('payment-follow-up');
    }

    const allowedModules = [
      canAccessModule(MODULE_KEYS.dashboard) ? 'dashboard' : null,
      canAccessModule(MODULE_KEYS.reservations) ? 'reservations-calendar' : null,
      canAccessModule(MODULE_KEYS.accountsFinance) ? 'accounts-finance' : null,
      canAccessModule(MODULE_KEYS.customerDatabase) ? 'customer-database' : null,
      canAccessModule(MODULE_KEYS.banquetKitchen) ? 'banquet-kitchen-management' : null,
      canAccessModule(MODULE_KEYS.restaurantKitchen) ? 'restaurant-kitchen-production' : null,
      canAccessModule(MODULE_KEYS.inventory) ? 'inventory-stock' : null,
      canAccessModule(MODULE_KEYS.procurement) ? 'procurement-management' : null,
      canAccessModule(MODULE_KEYS.reports) ? 'reservations-reports' : null,
      canAccessModule(MODULE_KEYS.setup) ? 'setup' : null,
    ].filter(Boolean) as string[];

    if (allowedModules.length === 0) {
      setCurrentModule('dashboard');
      return;
    }

    const allowedPrefixes = [
      canAccessModule(MODULE_KEYS.dashboard) ? 'dashboard' : null,
      canAccessModule(MODULE_KEYS.reservations) ? 'reservations' : null,
      canAccessModule(MODULE_KEYS.reservations) ? 'event-availability-calendar' : null,
      canAccessModule(MODULE_KEYS.reservations) ? 'tentative-follow-up' : null,
      canViewReservationPayments ? 'payment-follow-up' : null,
      canAccessModule(MODULE_KEYS.banquetKitchen) ? 'banquet-kitchen' : null,
      canAccessModule(MODULE_KEYS.restaurantKitchen) ? 'restaurant-kitchen' : null,
      canAccessModule(MODULE_KEYS.accountsFinance) ? 'accounts-finance' : null,
      canAccessModule(MODULE_KEYS.customerDatabase) ? 'customer-database' : null,
      canAccessModule(MODULE_KEYS.inventory) ? 'inventory' : null,
      canAccessModule(MODULE_KEYS.procurement) ? 'procurement-management' : null,
      canAccessModule(MODULE_KEYS.reports) ? 'reports' : null,
      canAccessModule(MODULE_KEYS.setup) ? 'setup' : null,
    ].filter(Boolean) as string[];

    if (isFrontOffice && !frontOfficeAllowedRoutes.has(currentModule)) {
      setCurrentModule('dashboard');
      return;
    }

    const isCurrentAllowed = allowedPrefixes.some((prefix) => currentModule === prefix || currentModule.startsWith(`${prefix}-`));
    if (!isCurrentAllowed) {
      setCurrentModule(allowedModules[0]);
    }
  }, [canViewReservationPayments, currentModule, currentUser.permissions, currentUser.role, isFrontOffice, userRole]);

  const handleBookingClick = (booking?: Booking, quickBookData?: { spaceId: string; spaceName: string; isPrime: boolean; hour: number; date: Date; startTime?: string; endTime?: string; venueId: string; venueName?: string; primeSpaceId?: string; primeSpaceName?: string; subSpaceId?: string; subSpaceName?: string }) => {
    if (booking) {
      setSelectedBooking(normalizeBookingVenueContext(booking));
      
      // Always open the confirmed reservation form with existing booking data
      setNewReservationOpen(true);
    } else if (quickBookData) {
      // Directly open ConfirmedReservationForm with pre-filled slot data
      setQuickBookContext(quickBookData);
      setSelectedBooking(undefined); // Clear any existing booking
      setNewReservationOpen(true); // Open the ConfirmedReservationForm
    }
  };

  const handleModuleChange = (moduleId: string) => {
    if (moduleId === 'reservations-follow-up' || moduleId === 'tentative-follow-up' || moduleId === 'reservations-tentative') {
      setReservationFollowUpMode('tentative');
    }

    if (moduleId === 'payment-follow-up') {
      setReservationFollowUpMode('payment');
    }

    setCurrentModule(moduleId);
  };

  const handleQuickBookProceed = (bookingType: 'confirmed' | 'tentative', startTime: string, endTime: string) => {
    setQuickBookDialogOpen(false);
    
    // Update quickBookData with the selected booking type and times
    if (quickBookContext) {
      setQuickBookContext({
        ...quickBookContext,
        bookingType,
        startTime,
        endTime,
      });
    }
    
    // Set initial status based on booking type
    setReservationInitialStatus(bookingType === 'confirmed' ? 'confirmed' : 'tentative');
    
    // Always use the confirmed reservation form
    setNewReservationOpen(true);
  };

  const handleCloseDialog = () => {
    setNewReservationOpen(false);
    setSelectedBooking(undefined);
  };

  const handleNewBooking = () => {
    setSelectedBooking(undefined); // Clear any existing booking
    setQuickBookContext(undefined); // Clear quick book data
    setReservationInitialStatus('confirmed'); // Set initial status to confirmed
    setAvailabilityCheckOpen(true);
  };

  const handleAvailabilityReserve = (slotInfo: {
    spaceId: string;
    spaceName: string;
    isPrime: boolean;
    hour: number;
    date: Date;
    startTime: string;
    endTime: string;
    venueId: string;
    venueName: string;
    primeSpaceId?: string;
    primeSpaceName?: string;
    subSpaceId?: string;
    subSpaceName?: string;
  }) => {
    setAvailabilityCheckOpen(false);
    setSelectedBooking(undefined);
    setQuickBookContext(slotInfo);
    setReservationInitialStatus('confirmed');
    setNewReservationOpen(true);
  };

  const handleTentativeBooking = () => {
    setSelectedBooking(undefined); // Clear any existing booking
    setQuickBookContext(undefined); // Clear quick book data
    setTentativeSlotContext(undefined);
    setTentativeInquiryData(null);
    setReservationInitialStatus('tentative'); // Set initial status to tentative
    setTentativeReservationOpen(true);
  };

  const generateBookingId = () => {
    return `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const toDateOrUndefined = (value: unknown) => {
    if (!value) {
      return undefined;
    }

    if (value instanceof Date) {
      return value;
    }

    const parsed = new Date(value as string);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const normalizeBookingForState = (bookingData: any, fallbackStatus?: Booking['status']) =>
    normalizeBookingVenueContext({
      ...bookingData,
      status: bookingData.status ?? fallbackStatus,
      date: toDateOrUndefined(bookingData.date) ?? new Date(),
      createdAt: toDateOrUndefined(bookingData.createdAt) ?? new Date(),
      inquiryDateTime:
        toDateOrUndefined(bookingData.inquiryDateTime) ??
        toDateOrUndefined(bookingData.createdAt) ??
        new Date(),
      callbackDate: toDateOrUndefined(bookingData.callbackDate),
      approvalDate: toDateOrUndefined(bookingData.approvalDate),
      gracePeriodEndDate: toDateOrUndefined(bookingData.gracePeriodEndDate),
      confirmationRequestedAt: toDateOrUndefined(bookingData.confirmationRequestedAt),
      confirmationDeadline: toDateOrUndefined(bookingData.confirmationDeadline),
      releasedAt: toDateOrUndefined(bookingData.releasedAt),
    }) as Booking;

  const isSameBookingDate = (left: Date | string, right: Date | string) => {
    const leftDate = left instanceof Date ? left : new Date(left);
    const rightDate = right instanceof Date ? right : new Date(right);

    return (
      leftDate.getFullYear() === rightDate.getFullYear() &&
      leftDate.getMonth() === rightDate.getMonth() &&
      leftDate.getDate() === rightDate.getDate()
    );
  };

  const isSameVenueSpaceTimeSlot = (booking: Booking, confirmedBooking: Booking) => {
    const bookingAssignments = getBookingSpaceAssignments(booking)
      .map((assignment) =>
        assignment.assignmentType === 'SUB_ONLY'
          ? `sub:${assignment.subSpaceId}`
          : `prime:${assignment.primeSpaceId}`,
      )
      .sort();
    const confirmedAssignments = getBookingSpaceAssignments(confirmedBooking)
      .map((assignment) =>
        assignment.assignmentType === 'SUB_ONLY'
          ? `sub:${assignment.subSpaceId}`
          : `prime:${assignment.primeSpaceId}`,
      )
      .sort();

    return (
      booking.venueId === confirmedBooking.venueId &&
      bookingAssignments.length === confirmedAssignments.length &&
      bookingAssignments.every((assignment, index) => assignment === confirmedAssignments[index]) &&
      isSameBookingDate(booking.date, confirmedBooking.date) &&
      booking.startTime === confirmedBooking.startTime &&
      booking.endTime === confirmedBooking.endTime
    );
  };

  const markInquirySlotTaken = (booking: Booking, confirmedBooking: Booking, changedAt: Date) => {
    const message = `Slot Taken / Follow-up Needed: confirmed reservation saved for ${confirmedBooking.customerName}.`;

    return normalizeBookingVenueContext({
      ...booking,
      status: 'tentative' as const,
      followUpStatus: 'Follow-up Required' as const,
      priority: booking.priority === 'High' ? booking.priority : 'High',
      releaseNotes: message,
      changeHistory: [
        ...((booking.changeHistory || []) as NonNullable<Booking['changeHistory']>),
        {
          timestamp: changedAt.toISOString(),
          field: 'Inquiry Slot Status',
          oldValue: booking.releaseNotes || booking.followUpStatus || 'Open Inquiry',
          newValue: message,
          changedBy: userName,
          changeType: 'modified' as const,
        },
      ],
    });
  };

  const handleSaveNewReservation = (bookingData: any, options?: { overriddenTentativeIds?: string[] }) => {
    const bookingId = bookingData.id || generateBookingId();
    const baseBooking = normalizeBookingForState(
      {
        ...bookingData,
        id: bookingId,
      },
      'confirmed',
    );

    if (
      baseBooking.status === 'confirmed' &&
      normalizedBookings.some((booking) =>
        hasConfirmedReservationConflict({
          booking: {
            id: bookingId,
            date: baseBooking.date,
            startTime: baseBooking.startTime,
            endTime: baseBooking.endTime,
            venueId: baseBooking.venueId,
            primeSpaceId: baseBooking.primeSpaceId,
            primeSpaceIds: baseBooking.primeSpaceIds,
            subSpaceId: baseBooking.subSpaceId,
          },
          existingBooking: booking,
          primeSpaceCatalog: primeSpaces,
        })
      )
    ) {
      toast.error('This space is already booked for this time.');
      return false;
    }

    const changedAt = new Date();

    const updatedBookings = normalizedBookings
      .map((booking) => {
        if (options?.overriddenTentativeIds?.includes(booking.id)) {
          return markInquirySlotTaken(booking, baseBooking, changedAt);
        }

        if (
          baseBooking.status === 'confirmed' &&
          booking.id !== bookingId &&
          booking.status === 'tentative' &&
          isSameVenueSpaceTimeSlot(booking, baseBooking)
        ) {
          return markInquirySlotTaken(booking, baseBooking, changedAt);
        }

        if (booking.id === bookingId) {
          return normalizeBookingForState({ ...booking, ...baseBooking });
        }

        return booking;
      })
      .filter(Boolean);

    const bookingExists = normalizedBookings.some((booking) => booking.id === bookingId);
    const nextBookings = bookingExists ? updatedBookings : [...updatedBookings, baseBooking];
    onBookingsChange(nextBookings);
    
    toast.success('Reservation Saved!', {
      description: `${bookingData.status === 'confirmed' ? 'Confirmed' : 'Tentative'} reservation for ${bookingData.customerName} has been saved.`,
    });
    if (options?.overriddenTentativeIds?.length) {
      toast.warning('Tentative holds updated', {
        description: `${options.overriddenTentativeIds.length} tentative reservation(s) were marked as space taken.`,
      });
    }
    return true;
  };

  const handleUpdateBooking = (bookingId: string, updatedData: any) => {
    const updatedBookings = normalizedBookings.map((booking) =>
      booking.id === bookingId
        ? normalizeBookingForState({ ...booking, ...updatedData })
        : booking
    );
    onBookingsChange(updatedBookings);
    
    // Update the selected booking if it's the one being edited
    if (selectedBooking?.id === bookingId) {
      setSelectedBooking(normalizeBookingForState({ ...selectedBooking, ...updatedData }));
    }
  };

  const handleSaveTentativeReservation = (bookingData: any) => {
    const newBooking = normalizeBookingForState({
      ...bookingData,
      id: bookingData.id || generateBookingId(),
      status: 'tentative',
    });

    const bookingExists = normalizedBookings.some((booking) => booking.id === newBooking.id);
    const updatedBookings = bookingExists
      ? normalizedBookings.map((booking) => (booking.id === newBooking.id ? newBooking : booking))
      : [...normalizedBookings, newBooking];
    onBookingsChange(updatedBookings);
    
    toast.success('Inquiry Saved', {
      description: `Inquiry follow-up for ${bookingData.customerName} has been saved.`,
    });
    
    // Close the tentative dialog after saving
    setTentativeReservationOpen(false);
    setTentativeSlotContext(undefined);
    setTentativeInquiryData(null);
  };

  const handleConvertTentativeToConfirmed = (bookingData: any) => {
    // Close tentative dialog
    setTentativeReservationOpen(false);
    setTentativeSlotContext(undefined);
    setTentativeInquiryData(null);
    
    // Create a booking object with prefilled data
    const prefilledBooking = normalizeBookingForState({
      ...bookingData,
      id: bookingData.id || generateBookingId(),
      status: 'confirmed',
    });
    
    // Set this booking as the selected booking and open the confirmation dialog
    setSelectedBooking(prefilledBooking);
    setNewReservationOpen(true);
    
    toast.info('Opening Confirmation Form', {
      description: 'Customer details have been pre-filled',
    });
  };

  const handleOpenConfirmedReservationFromFollowUp = (booking: Booking) => {
    setSelectedBooking(normalizeBookingVenueContext(booking));
    setQuickBookContext(undefined);
    setTentativeSlotContext(undefined);
    setTentativeInquiryData(null);
    setReservationInitialStatus('confirmed');
    setNewReservationOpen(true);
  };

  const handleDateClick = (date: Date) => {
    setCurrentDate(date);
    setCurrentModule('reservations-calendar');
  };

  const handleConvertToConfirmed = (booking: Booking) => {
    toast.success('Booking Confirmed!', {
      description: `${booking.customerName}'s reservation has been confirmed.`,
    });
    const updatedBookings = normalizedBookings.map((b) =>
      b.id === booking.id ? normalizeBookingVenueContext({ ...b, status: 'confirmed' }) : b
    );
    onBookingsChange(updatedBookings);
  };

  const handleCancelBooking = (booking: Booking) => {
    toast.info('Booking Cancelled', {
      description: `${booking.customerName}'s reservation has been cancelled.`,
    });
    const updatedBookings = normalizedBookings.map((b) =>
      b.id === booking.id ? normalizeBookingVenueContext({ ...b, status: 'cancelled' }) : b
    );
    onBookingsChange(updatedBookings);
  };

  const handleViewChange = (view: string) => {
    switch (view) {
      case 'day-timeline':
        setCurrentModule('reservations-calendar');
        break;
      case 'month':
        setCurrentModule('reservations-bookings');
        break;
      case 'agenda':
        setCurrentModule('reservations-agenda');
        break;
      case 'follow-up':
        setReservationFollowUpMode('tentative');
        setCurrentModule('reservations-follow-up');
        break;
    }
  };

  const renderContent = () => {
    // Dashboard views based on role
    if (currentModule === 'dashboard') {
      switch (userRole) {
        case 'admin':
          return (
            <div className="flex-1 flex items-center justify-center bg-[#F5F7FA]">
              <div className="max-w-xl rounded-xl border border-blue-200 bg-white p-8 text-center shadow-sm">
                <h2 className="mb-3 text-2xl font-semibold text-[#2E2E2E]">Admin Access Center</h2>
                <p className="text-sm text-[#6B7280]">
                  Admin can access every module, setup area, and Users & Roles from this development-stage build.
                </p>
              </div>
            </div>
          );
        case 'front-office':
          return (
            <FrontOfficeDashboard
              bookings={normalizedBookings}
              onNavigateToCalendar={() => setCurrentModule('reservations-bookings')}
              onNavigateToTentativeReservations={() => setCurrentModule('event-availability-calendar')}
              onNavigateToFollowups={(mode) => {
                setReservationFollowUpMode(mode);
                setCurrentModule('reservations-follow-up');
              }}
              onBookingsChange={onBookingsChange}
              userName={userName}
              canViewPaymentTools={canViewReservationPayments}
            />
          );
        default:
          return (
            <FrontOfficeDashboard
              bookings={normalizedBookings}
              onNavigateToCalendar={() => setCurrentModule('reservations-bookings')}
              onNavigateToTentativeReservations={() => setCurrentModule('event-availability-calendar')}
              onNavigateToFollowups={(mode) => {
                setReservationFollowUpMode(mode);
                setCurrentModule('reservations-follow-up');
              }}
              onBookingsChange={onBookingsChange}
              userName={userName}
              canViewPaymentTools={canViewReservationPayments}
            />
          );
      }
    }

    // Reservation modules
    if (currentModule === 'reservations-calendar') {
      return (
        <div className="h-full flex flex-col">
          <CalendarHeaderV2
            currentDate={currentDate}
            selectedVenueId={selectedVenueId}
            view="day-timeline"
            statusFilters={statusFilters}
            onDateChange={setCurrentDate}
            onVenueChange={setSelectedVenueId}
            onNewBooking={handleNewBooking}
            onNewTentative={handleTentativeBooking}
            onStatusFilterChange={setStatusFilters}
            onViewChange={handleViewChange}
          />
          <div className="flex-1 overflow-hidden">
            <DayViewV2
              venueId={selectedVenueId}
              currentDate={currentDate}
              onBookingClick={handleBookingClick}
              onDateChange={setCurrentDate}
              statusFilter={statusFilters}
              bookings={normalizedBookings}
            />
          </div>
        </div>
      );
    }

    if (currentModule === 'reservations-bookings') {
      return (
        <div className="h-full flex flex-col">
          <CalendarHeaderV2
            currentDate={currentDate}
            selectedVenueId={selectedVenueId}
            view="month"
            statusFilters={statusFilters}
            onDateChange={setCurrentDate}
            onVenueChange={setSelectedVenueId}
            onNewBooking={handleNewBooking}
            onNewTentative={handleTentativeBooking}
            onStatusFilterChange={setStatusFilters}
            onViewChange={handleViewChange}
          />
          <div className="flex-1 overflow-hidden">
            <MonthViewV2
              venueId={selectedVenueId}
              currentDate={currentDate}
              onDateClick={handleDateClick}
              onMonthChange={setCurrentDate}
              statusFilter={statusFilters}
              bookings={normalizedBookings}
              mode="confirmed"
              showHeader={false}
            />
          </div>
        </div>
      );
    }

    if (currentModule === 'reservations-reports') {
      return <ReservationReports bookings={normalizedBookings} />;
    }

    if (currentModule === 'reservations-agenda') {
      return (
        <div className="h-full flex flex-col">
          <CalendarHeaderV2
            currentDate={currentDate}
            selectedVenueId={selectedVenueId}
            view="agenda"
            statusFilters={statusFilters}
            onDateChange={setCurrentDate}
            onVenueChange={setSelectedVenueId}
            onNewBooking={handleNewBooking}
            onNewTentative={handleTentativeBooking}
            onStatusFilterChange={setStatusFilters}
            onViewChange={handleViewChange}
          />
          <div className="flex-1 overflow-hidden">
            <AgendaViewV2
              venueId={selectedVenueId}
              currentDate={currentDate}
              onBookingClick={handleBookingClick}
              onDateChange={setCurrentDate}
              statusFilter={statusFilters}
              bookings={normalizedBookings}
            />
          </div>
        </div>
      );
    }

    if (currentModule === 'reservations-outside-services') {
      return (
        <OutsideServicesModule
          bookings={normalizedBookings}
          serviceBookings={serviceBookings}
          dishes={dishes}
          menuPackages={menuPackages}
          onServiceBookingsChange={onServiceBookingsChange}
        />
      );
    }

    if (
      currentModule === 'reservations-follow-up' ||
      currentModule === 'reservations-tentative' ||
      currentModule === 'tentative-follow-up' ||
      currentModule === 'payment-follow-up'
    ) {
      const followUpMode =
        currentModule === 'payment-follow-up'
          ? 'payment'
          : currentModule === 'reservations-follow-up'
            ? reservationFollowUpMode
            : 'tentative';

      return (
        <TentativeFollowUpModule
          bookings={normalizedBookings}
          onBookingsChange={onBookingsChange}
          userName={userName}
          mode={followUpMode}
          allowModeSwitch={currentModule === 'reservations-follow-up'}
          canViewPaymentTools={canViewReservationPayments}
          onOpenConfirmedReservationForm={handleOpenConfirmedReservationFromFollowUp}
        />
      );
    }

    // New Event Availability Calendar (Confirmed Events Only)
    if (currentModule === 'event-availability-calendar' || currentModule === 'reservations-event-availability-calendar') {
      return (
        <EventAvailabilityCalendar
          bookings={normalizedBookings}
          onBookingsChange={onBookingsChange}
              onBack={() => setCurrentModule('reservations-bookings')}
          onCreateTentativeBooking={(slotInfo) => {
            setSelectedBooking(undefined);
            setQuickBookContext(undefined);
            setTentativeSlotContext(slotInfo);
            setTentativeInquiryData(null);
            setReservationInitialStatus('tentative');
            setTentativeReservationOpen(true);
          }}
          onEditTentativeInquiry={(booking) => {
            setSelectedBooking(undefined);
            setQuickBookContext(undefined);
            setTentativeSlotContext(undefined);
            setTentativeInquiryData(normalizeBookingVenueContext(booking));
            setReservationInitialStatus('tentative');
            setTentativeReservationOpen(true);
          }}
          onConvertTentativeInquiry={handleConvertTentativeToConfirmed}
        />
      );
    }

    if (currentModule === 'reservations-reservation-setup') {
      return (
        <SetupModule
          userRole={userRole}
          userName={userName}
          mode="reservation"
          bookings={normalizedBookings}
          serviceBookings={serviceBookings as Array<Record<string, any>>}
        />
      );
    }

    if (currentModule === 'tentative-reservations-pipeline' || currentModule === 'reservations-tentative-reservations-pipeline') {
      return (
        <TentativeFollowUpModule
          bookings={normalizedBookings}
          onBookingsChange={onBookingsChange}
          userName={userName}
          mode="tentative"
          allowModeSwitch
          canViewPaymentTools={canViewReservationPayments}
        />
      );
    }

    // Banquet Kitchen modules
    if (
      currentModule === 'procurement-management-unit-setup' ||
      currentModule === 'banquet-kitchen-unit-setup' ||
      currentModule === 'restaurant-kitchen-unit-setup'
    ) {
      const initialUsageFilter =
        currentModule === 'procurement-management-unit-setup'
          ? 'purchase'
          : 'issue';

      return (
        <UnitMasterSetup
          userName={userName}
          units={measurementUnits}
          onUnitsChange={setMeasurementUnits}
          initialUsageFilter={initialUsageFilter}
        />
      );
    }

    if (currentModule.startsWith('banquet-kitchen')) {
      if (currentModule === 'banquet-kitchen-management') {
        return (
          <BanquetKitchenManagement
            userName={userName}
            cuisines={cuisines}
            dishCategories={dishCategories}
            kitchenStations={kitchenStations}
            dishes={dishes}
            stores={stores}
            purchaseItems={purchaseItems}
            storeStocks={storeStocks}
            units={measurementUnits}
            vendors={vendors}
            vendorItemMappings={vendorItemMappings}
            procurementLookups={procurementLookups}
            recipes={recipes}
            menuPackages={menuPackages}
            menuPackageTypes={menuPackageTypes}
            onCuisinesChange={setCuisines}
            onDishCategoriesChange={setDishCategories}
            onKitchenStationsChange={setKitchenStations}
            onUnitsChange={setMeasurementUnits}
            onDishesChange={setDishes}
            onPurchaseItemsChange={setPurchaseItems}
            onVendorItemMappingsChange={setVendorItemMappings}
            onProcurementLookupsChange={setProcurementLookups}
            onStoreStocksChange={setStoreStocks}
            onRecipesChange={setRecipes}
            onMenuPackagesChange={setMenuPackages}
            onMenuPackageTypesChange={setMenuPackageTypes}
          />
        );
      }

      const banquetKitchenInitialTab =
        currentModule === 'banquet-kitchen-packages'
          ? 'ingredient-requirement'
          : currentModule === 'banquet-kitchen-recipes'
            ? 'dispatch'
            : 'director-planning';

      return (
        <BanquetKitchenDashboard
          userName={userName}
          bookings={kitchenPlanningBookings}
          dishes={dishes}
          stores={stores}
          recipes={recipes}
          menuPackages={menuPackages}
          purchaseItems={purchaseItems}
          storeStocks={storeStocks}
          units={measurementUnits}
          issueSheets={kitchenIssueSheets}
          onStoreStocksChange={setStoreStocks}
          onIssueSheetsChange={setKitchenIssueSheets}
          initialTab={banquetKitchenInitialTab}
        />
      );
    }

    // Restaurant Kitchen modules
    if (currentModule.startsWith('restaurant-kitchen')) {
      return <RestaurantKitchenDashboard units={measurementUnits} />;
    }

    // Procurement Management
    if (currentModule.startsWith('procurement-management')) {
      const procurementInitialTab =
        currentModule === 'procurement-management-vendors'
          ? 'vendors'
          : currentModule === 'procurement-management-purchase-items'
            ? 'purchase-items'
            : currentModule === 'procurement-management-purchase-orders'
              ? 'purchase-orders'
              : currentModule === 'procurement-management-grn-register'
                ? 'grn-register'
                : 'overview';

      return (
        <ProcurementManagement
          userName={userName}
          initialTab={procurementInitialTab}
          vendors={vendors}
          procurementLookups={procurementLookups}
          purchaseOrders={purchaseOrders}
          purchaseItems={purchaseItems}
          stores={stores}
          units={measurementUnits}
          goodsReceipts={goodsReceipts}
          storeStocks={storeStocks}
          vendorBills={vendorBills}
          vendorItemMappings={vendorItemMappings}
          bookings={kitchenPlanningBookings}
          dishes={dishes}
          recipes={recipes}
          menuPackages={menuPackages}
          kitchenIssueSheets={kitchenIssueSheets}
          onVendorsChange={setVendors}
          onProcurementLookupsChange={setProcurementLookups}
          onPurchaseOrdersChange={setPurchaseOrders}
          onPurchaseItemsChange={setPurchaseItems}
          onVendorItemMappingsChange={setVendorItemMappings}
          onGoodsReceiptsChange={setGoodsReceipts}
          onStoreStocksChange={setStoreStocks}
          onVendorBillsChange={setVendorBills}
          onBack={() => setCurrentModule('dashboard')}
        />
      );
    }

    // Inventory Management
    if (currentModule.startsWith('inventory-')) {
      const inventoryInitialTab =
        currentModule === 'inventory-stock'
          ? 'stock-levels'
          : currentModule === 'inventory-purchase-orders'
            ? 'purchase-tracking'
            : currentModule === 'inventory-stock-movement'
              ? 'stock-movement'
              : currentModule === 'inventory-stores'
                ? 'store-master'
              : currentModule === 'inventory-vendors'
                ? 'vendor-performance'
                : 'overview';

      return (
        <InventoryManagement
          userName={userName}
          initialTab={inventoryInitialTab}
          stores={stores}
          purchaseItems={purchaseItems}
          storeStocks={storeStocks}
          stockTransfers={stockTransfers}
          purchaseOrders={purchaseOrders}
          vendors={vendors}
          goodsReceipts={goodsReceipts}
          onStoreStocksChange={setStoreStocks}
          onStockTransfersChange={setStockTransfers}
          onStoresChange={setStores}
          onBack={() => setCurrentModule('dashboard')}
        />
      );
    }

    // Accounts Finance Management
    if (currentModule === 'accounts-finance') {
      return (
        <AccountsFinanceManagement
          userName={userName}
          bookings={normalizedBookings}
          purchaseOrders={purchaseOrders}
          vendors={vendors}
          vendorBills={vendorBills}
          kitchenIssueSheets={kitchenIssueSheets}
          purchaseItems={purchaseItems}
          onVendorBillsChange={setVendorBills}
          onBack={() => setCurrentModule('dashboard')}
        />
      );
    }

    // Customer Database
    if (currentModule === 'customer-database' || currentModule === 'reservations-customers') {
      console.log('✅ Customer Database module activated');
      return <CustomerDatabase />;
    }

    // System Flow Diagram (Help/Documentation)

    // Setup Module
    if (currentModule === 'setup') {
      return (
        <SetupModule
          userRole={userRole}
          userName={userName}
          bookings={normalizedBookings}
          serviceBookings={serviceBookings as Array<Record<string, any>>}
        />
      );
    }

    // Venue Rules Demo

    console.log('❌ Module not found. Current module:', currentModule);
    return <div className="p-8">Module not found: {currentModule}</div>;
  };

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <Sidebar
        currentModule={currentModule}
        onModuleChange={handleModuleChange}
        userRole={userRole}
        userName={userName}
        permissions={currentUser.permissions}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Suspense fallback={<WorkspaceLoadingState label="Loading module..." />}>{renderContent()}</Suspense>
      </div>

      <Suspense fallback={availabilityCheckOpen ? <DialogLoadingState label="Loading availability check..." /> : null}>
        <QuickAvailabilityCheckDialog
          open={availabilityCheckOpen}
          bookings={normalizedBookings}
          initialVenueId={selectedVenueId}
          initialDate={currentDate}
          onClose={() => setAvailabilityCheckOpen(false)}
          onReserve={handleAvailabilityReserve}
        />
      </Suspense>

      {/* Comprehensive Confirmed Reservation Form */}
      <Suspense fallback={newReservationOpen ? <DialogLoadingState label="Loading reservation form..." /> : null}>
        {newReservationOpen && (
          <ConfirmedReservationForm
            onClose={() => {
              setNewReservationOpen(false);
              setQuickBookContext(undefined);
              setSelectedBooking(undefined);
              setReservationInitialStatus('confirmed');
            }}
            onSave={(bookingData, options) => {
              const normalizedBookingData = selectedBooking?.id
                ? { ...bookingData, id: selectedBooking.id }
                : bookingData;
              const wasSaved = handleSaveNewReservation(normalizedBookingData, options);
              if (wasSaved) {
                setNewReservationOpen(false);
              }
              return wasSaved;
            }}
            initialData={selectedBooking ? normalizeBookingVenueContext(selectedBooking) : undefined}
            existingBookings={normalizedBookings}
            allowPaymentLedger={canViewReservationPayments}
            allowAgreementPreview={canPreviewBookingAgreement}
            kitchenDishes={dishes}
            kitchenDishCategories={dishCategories}
            kitchenMenuPackages={menuPackages}
            purchaseItems={purchaseItems}
            slot={quickBookContext ? {
              venueId: quickBookContext.venueId,
              venueName: quickBookContext.venueName || '',
              spaceId: quickBookContext.spaceId,
              spaceName: quickBookContext.spaceName,
              primeSpaceId: quickBookContext.isPrime ? quickBookContext.spaceId : quickBookContext.primeSpaceId,
              primeSpaceName: quickBookContext.isPrime ? quickBookContext.spaceName : quickBookContext.primeSpaceName,
              subSpaceId: quickBookContext.isPrime ? undefined : (quickBookContext.subSpaceId || quickBookContext.spaceId),
              subSpaceName: quickBookContext.isPrime ? undefined : (quickBookContext.subSpaceName || quickBookContext.spaceName),
              date: quickBookContext.date,
              hour: quickBookContext.hour,
              startTime: quickBookContext.startTime,
              endTime: quickBookContext.endTime,
              isPrime: quickBookContext.isPrime,
            } : undefined}
          />
        )}
      </Suspense>

      <Suspense fallback={tentativeReservationOpen ? <DialogLoadingState label="Loading tentative workspace..." /> : null}>
        <TentativeReservationWorkspace
          open={tentativeReservationOpen}
          onClose={() => {
            setTentativeReservationOpen(false);
            setTentativeSlotContext(undefined);
            setTentativeInquiryData(null);
          }}
          slot={tentativeSlotContext}
          initialData={tentativeSlotContext ? undefined : tentativeInquiryData || tentativeInquiryInitialData}
          existingBookings={normalizedBookings}
          onSave={handleSaveTentativeReservation}
          onConvertToConfirmed={handleConvertTentativeToConfirmed}
        />
      </Suspense>

      {/* Unified Quick Booking Dialog */}
      <Suspense fallback={quickBookDialogOpen ? <DialogLoadingState label="Loading quick booking..." /> : null}>
        <UnifiedBookingDialog
          open={quickBookDialogOpen}
          onClose={() => {
            setQuickBookDialogOpen(false);
            setQuickBookContext(undefined);
          }}
          onSave={(bookingData: BookingFormData) => {
            // If tentative, save directly
            if (bookingData.status === 'tentative') {
              const newBooking = normalizeBookingVenueContext({
                id: bookingData.id || generateBookingId(),
                customerName: bookingData.customerName,
                contactNumber: bookingData.contactNumber,
                date: bookingData.date,
                startTime: bookingData.startTime,
                endTime: bookingData.endTime,
                status: 'tentative',
                guestCount: bookingData.guestCount,
                eventType: bookingData.eventType,
                venueId: bookingData.venueId,
                venueName: bookingData.venueName,
                ...(bookingData.isPrimeSpace ? {
                  primeSpaceIds: [bookingData.spaceId],
                  primeSpaceNames: [bookingData.spaceName],
                } : {
                  subSpaceId: bookingData.spaceId,
                  subSpaceName: bookingData.spaceName,
                  primeSpaceId: bookingData.primeSpaceId,
                  primeSpaceName: bookingData.primeSpaceName,
                }),
                followUpDate: bookingData.followUpDate,
                followUpTime: bookingData.followUpTime,
                assignedSalesPerson: bookingData.assignedSalesPerson,
                bookingSource: bookingData.bookingSource,
                notes: bookingData.notes,
                createdAt: new Date(),
              }) as Booking;
              
              const updatedBookings = [...normalizedBookings, newBooking];
              onBookingsChange(updatedBookings);
              
              setQuickBookDialogOpen(false);
              setQuickBookContext(undefined);
            } else {
              // If confirmed, open full reservation workspace with prefilled data
              setQuickBookDialogOpen(false);
              
              const fullFormContext = {
                spaceId: bookingData.spaceId,
                spaceName: bookingData.spaceName,
                isPrime: bookingData.isPrimeSpace,
                hour: parseInt(bookingData.startTime.split(':')[0]),
                date: bookingData.date,
                venueId: bookingData.venueId,
                venueName: bookingData.venueName,
                primeSpaceId: bookingData.primeSpaceId,
                primeSpaceName: bookingData.primeSpaceName,
                startTime: bookingData.startTime,
                endTime: bookingData.endTime,
                bookingType: 'confirmed',
                customerName: bookingData.customerName,
                contactNumber: bookingData.contactNumber,
                guestCount: bookingData.guestCount,
                eventType: bookingData.eventType,
                notes: bookingData.notes,
              };
              
              setQuickBookContext(fullFormContext);
              setReservationInitialStatus('confirmed');
              setNewReservationOpen(true);
            }
          }}
          venueId={quickBookContext?.venueId || selectedVenueId}
          venueName={quickBookContext?.venueName || 'Unknown Venue'}
          spaceId={quickBookContext?.spaceId || ''}
          spaceName={quickBookContext?.spaceName || ''}
          isPrimeSpace={quickBookContext?.isPrime || false}
          primeSpaceId={quickBookContext?.primeSpaceId}
          primeSpaceName={quickBookContext?.primeSpaceName}
          date={quickBookContext?.date || currentDate}
          suggestedStartTime={quickBookContext?.hour ? `${String(quickBookContext.hour).padStart(2, '0')}:00` : '12:00'}
          currentUserName={userName}
          currentUserRole={userRole}
        />
      </Suspense>
    </div>
  );
}
