import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardCheck,
  DollarSign,
  Eye,
  FileText,
  Package,
  Search,
  ShoppingCart,
  TrendingUp,
  Truck,
  X,
} from 'lucide-react';
import { formatCurrencyPKR, formatDatePK } from '../../lib/locale';
import { getStoreDisplayName } from '../../lib/storeMaster';
import { Booking } from '../calendar/types-v2';
import {
  Dish,
  GoodsReceipt,
  KitchenIssueSheet,
  MenuPackage,
  ProductionCostMethod,
  ProcurementLookupState,
  PurchaseItem,
  PurchaseOrder,
  Recipe,
  StoreMaster,
  StoreStock,
  UnitMaster,
  Vendor,
  VendorBill,
  VendorItemMapping,
} from '../kitchen/types';
import { PurchaseItemMaster } from '../kitchen/shared/PurchaseItemMaster';
import { GRNDialog } from './GRNDialog';
import { PurchaseOrders } from './PurchaseOrders';
import { VendorMasterEnhanced } from './VendorMasterEnhanced';

interface ProcurementManagementProps {
  userName: string;
  initialTab?: ProcurementTab;
  vendors: Vendor[];
  procurementLookups: ProcurementLookupState;
  purchaseOrders: PurchaseOrder[];
  purchaseItems: PurchaseItem[];
  stores: StoreMaster[];
  units: UnitMaster[];
  goodsReceipts: GoodsReceipt[];
  storeStocks: StoreStock[];
  vendorBills: VendorBill[];
  vendorItemMappings: VendorItemMapping[];
  bookings?: Booking[];
  dishes?: Dish[];
  recipes?: Recipe[];
  menuPackages?: MenuPackage[];
  productionCostMethods?: ProductionCostMethod[];
  kitchenIssueSheets?: KitchenIssueSheet[];
  onVendorsChange: (vendors: Vendor[]) => void;
  onProcurementLookupsChange: (lookups: ProcurementLookupState) => void;
  onPurchaseOrdersChange: (orders: PurchaseOrder[]) => void;
  onPurchaseItemsChange: (items: PurchaseItem[]) => void;
  onVendorItemMappingsChange: (mappings: VendorItemMapping[]) => void;
  onGoodsReceiptsChange: (grns: GoodsReceipt[]) => void;
  onStoreStocksChange: (stocks: StoreStock[]) => void;
  onVendorBillsChange: (bills: VendorBill[]) => void;
  onNavigate?: (route: string) => void;
  onBack: () => void;
}

type ProcurementTab = 'overview' | 'vendors' | 'purchase-items' | 'purchase-orders' | 'grn-register';
type DateRangeFilter = 'all' | '7d' | '30d' | '90d';
type GrnReceiptStatus = 'pending' | 'partial' | 'completed' | 'cancelled';

const tabs: Array<{ id: ProcurementTab; label: string; route: string }> = [
  { id: 'overview', label: 'Overview', route: 'procurement-management' },
  { id: 'vendors', label: 'Vendors', route: 'procurement-management-vendors' },
  { id: 'purchase-items', label: 'Purchase Items', route: 'procurement-management-purchase-items' },
  { id: 'purchase-orders', label: 'Purchase Orders', route: 'procurement-management-purchase-orders' },
  { id: 'grn-register', label: 'GRN Register', route: 'procurement-management-grn-register' },
];

const dateRangeOptions: Array<{ value: DateRangeFilter; label: string }> = [
  { value: 'all', label: 'All Dates' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
];

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600';
const tableCellClass = 'px-3 py-2 text-sm text-gray-700 align-middle';

const rangeDaysMap: Record<DateRangeFilter, number | null> = {
  all: null,
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const isWithinDateRange = (value: Date, range: DateRangeFilter) => {
  const days = rangeDaysMap[range];
  if (days === null) {
    return true;
  }

  const compareDate = new Date(value);
  const threshold = new Date();
  threshold.setHours(0, 0, 0, 0);
  threshold.setDate(threshold.getDate() - days);
  return compareDate >= threshold;
};

const compactCurrency = (value: number) => formatCurrencyPKR(value);

const getPurchaseDisplayUnit = (item: PurchaseItem) =>
  item.purchaseUnitId || item.purchaseUnit || item.baseUnitId || item.issueUnit || 'unit';

const getReceiptStatusMeta = (status: GrnReceiptStatus) => {
  const statusMap: Record<GrnReceiptStatus, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
    partial: { label: 'Partial', className: 'bg-amber-100 text-amber-700' },
    completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
  };

  return statusMap[status];
};

const getQualityStatusMeta = (status: GoodsReceipt['qualityCheckStatus']) => {
  const statusMap: Record<GoodsReceipt['qualityCheckStatus'], { label: string; className: string }> = {
    pending: { label: 'Inspection Pending', className: 'bg-yellow-100 text-yellow-700' },
    approved: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
    partial: { label: 'Partial Acceptance', className: 'bg-amber-100 text-amber-700' },
  };

  return statusMap[status];
};

const getReceiptStatusFromPurchaseOrder = (purchaseOrder?: PurchaseOrder | null): GrnReceiptStatus => {
  if (!purchaseOrder) {
    return 'pending';
  }

  if (purchaseOrder.status === 'cancelled') {
    return 'cancelled';
  }

  if (purchaseOrder.status === 'partially-received') {
    return 'partial';
  }

  if (purchaseOrder.status === 'received' || purchaseOrder.status === 'closed') {
    return 'completed';
  }

  return 'pending';
};

const canContinueReceipt = (purchaseOrder?: PurchaseOrder | null) =>
  Boolean(purchaseOrder && (purchaseOrder.status === 'approved' || purchaseOrder.status === 'partially-received'));

const isSameDay = (value: Date, compare = new Date()) => {
  const left = new Date(value);
  const right = new Date(compare);
  left.setHours(0, 0, 0, 0);
  right.setHours(0, 0, 0, 0);
  return left.getTime() === right.getTime();
};

const getAcceptedValue = (grn: GoodsReceipt) => grn.items.reduce((sum, item) => sum + item.totalValue, 0);
const getRejectedValue = (grn: GoodsReceipt) =>
  grn.items.reduce((sum, item) => sum + item.rejectedQuantity * item.ratePerUnit, 0);
const getAcceptedQuantity = (grn: GoodsReceipt) => grn.items.reduce((sum, item) => sum + item.acceptedQuantity, 0);
const getRejectedQuantity = (grn: GoodsReceipt) => grn.items.reduce((sum, item) => sum + item.rejectedQuantity, 0);

const getStockStatusMeta = (current: number, reorder: number) => {
  if (current <= 0) {
    return {
      label: 'Out',
      textClass: 'text-red-700',
      badgeClass: 'bg-red-100 text-red-700',
    };
  }

  if (reorder <= 0) {
    return {
      label: 'OK',
      textClass: 'text-emerald-700',
      badgeClass: 'bg-emerald-100 text-emerald-700',
    };
  }

  const percentage = (current / reorder) * 100;

  if (percentage <= 25) {
    return {
      label: 'Critical',
      textClass: 'text-red-700',
      badgeClass: 'bg-red-100 text-red-700',
    };
  }

  if (percentage <= 100) {
    return {
      label: 'Low',
      textClass: 'text-amber-700',
      badgeClass: 'bg-amber-100 text-amber-700',
    };
  }

  return {
    label: 'Healthy',
    textClass: 'text-emerald-700',
    badgeClass: 'bg-emerald-100 text-emerald-700',
  };
};

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    approved: 'bg-blue-100 text-blue-700',
    received: 'bg-emerald-100 text-emerald-700',
    'partially-received': 'bg-amber-100 text-amber-700',
    closed: 'bg-slate-200 text-slate-700',
    cancelled: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700',
    partial: 'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700',
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-slate-100 text-slate-700',
    blocked: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${statusMap[status] || 'bg-slate-100 text-slate-700'}`}>
      {status.replace(/-/g, ' ')}
    </span>
  );
};

const CompactSection = ({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) => (
  <section className="rounded border border-slate-200 bg-white">
    <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="text-xs font-medium text-blue-700 hover:text-blue-800"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
    {children}
  </section>
);

const getGrnStoreSummary = (stores: StoreMaster[], grn: GoodsReceipt) => {
  const storeIds = Array.from(
    new Set(
      grn.items
        .map((item) => item.destinationStore || grn.destinationStore)
        .filter((store): store is NonNullable<typeof store> => Boolean(store)),
    ),
  );

  return storeIds.map((store) => getStoreDisplayName(stores, store)).join(', ');
};

const getVendorAttentionMeta = (vendor: Vendor) => {
  if (vendor.status === 'blocked') {
    return { priority: 1, label: 'Blocked', detail: 'Vendor is blocked from new purchasing.' };
  }

  if (vendor.status === 'inactive') {
    return {
      priority: 2,
      label: 'Inactive',
      detail: vendor.inactiveReason || 'Vendor is inactive and needs review.',
    };
  }

  if (vendor.creditLimit && vendor.currentBalance >= vendor.creditLimit) {
    return { priority: 1, label: 'Over Limit', detail: 'Outstanding balance is above credit limit.' };
  }

  if (vendor.creditLimit && vendor.currentBalance >= vendor.creditLimit * 0.8) {
    return { priority: 2, label: 'Near Limit', detail: 'Outstanding balance is close to credit limit.' };
  }

  if (vendor.currentBalance > 0) {
    return { priority: 3, label: 'Outstanding', detail: 'Open payables require follow-up.' };
  }

  if ((vendor.pricingFormulas?.length || 0) > 0) {
    return { priority: 4, label: 'Pricing Rules', detail: 'Dynamic pricing rules are configured.' };
  }

  return { priority: 5, label: 'Stable', detail: 'No active issues detected.' };
};

export function ProcurementManagement({
  userName,
  initialTab = 'overview',
  vendors,
  procurementLookups,
  purchaseOrders,
  purchaseItems,
  stores,
  units,
  goodsReceipts,
  storeStocks,
  vendorBills,
  vendorItemMappings,
  bookings = [],
  dishes = [],
  recipes = [],
  menuPackages = [],
  productionCostMethods = [],
  kitchenIssueSheets = [],
  onVendorsChange,
  onProcurementLookupsChange,
  onPurchaseOrdersChange,
  onPurchaseItemsChange,
  onVendorItemMappingsChange,
  onGoodsReceiptsChange,
  onStoreStocksChange,
  onVendorBillsChange,
  onNavigate,
  onBack,
}: ProcurementManagementProps) {
  const [activeTab, setActiveTab] = useState<ProcurementTab>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('30d');
  const [grnVendorFilter, setGrnVendorFilter] = useState('all');
  const [grnStoreFilter, setGrnStoreFilter] = useState('all');
  const [grnReceiptStatusFilter, setGrnReceiptStatusFilter] = useState<'all' | GrnReceiptStatus>('all');
  const [grnQualityStatusFilter, setGrnQualityStatusFilter] = useState<'all' | GoodsReceipt['qualityCheckStatus']>('all');
  const [grnPoFilter, setGrnPoFilter] = useState('');
  const [grnNumberFilter, setGrnNumberFilter] = useState('');
  const [selectedGrnId, setSelectedGrnId] = useState<string | null>(null);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string | null>(null);
  const [selectedPOForGRN, setSelectedPOForGRN] = useState<PurchaseOrder | null>(null);
  const [grnDialogOpen, setGrnDialogOpen] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (tabId: ProcurementTab) => {
    setActiveTab(tabId);
    const matchingTab = tabs.find((tab) => tab.id === tabId);
    if (matchingTab) {
      onNavigate?.(matchingTab.route);
    }
  };

  const currentTabLabel = tabs.find((tab) => tab.id === activeTab)?.label || 'Overview';

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const normalizedGrnPoFilter = grnPoFilter.trim().toLowerCase();
  const normalizedGrnNumberFilter = grnNumberFilter.trim().toLowerCase();

  const stockTotalsByItem = useMemo(() => {
    const totals = new Map<string, number>();
    storeStocks.forEach((stock) => {
      totals.set(stock.purchaseItemId, (totals.get(stock.purchaseItemId) || 0) + stock.currentStock);
    });
    return totals;
  }, [storeStocks]);

  const purchaseItemsWithDerivedStock = useMemo(
    () =>
      purchaseItems.map((item) => ({
        ...item,
        derivedStock: stockTotalsByItem.get(item.id) ?? 0,
      })),
    [purchaseItems, stockTotalsByItem],
  );

  const purchaseOrderById = useMemo(
    () => new Map(purchaseOrders.map((purchaseOrder) => [purchaseOrder.id, purchaseOrder])),
    [purchaseOrders],
  );

  const purchaseOrderRows = useMemo(
    () =>
      purchaseOrders
        .filter((purchaseOrder) => purchaseOrder.status !== 'cancelled')
        .map((purchaseOrder) => {
          const relatedGrns = goodsReceipts.filter((grn) => grn.purchaseOrderId === purchaseOrder.id);
          const totalReceived = relatedGrns.reduce(
            (sum, grn) => sum + grn.items.reduce((itemSum, item) => itemSum + item.acceptedQuantity, 0),
            0,
          );
          const totalClosed = purchaseOrder.items.reduce((sum, item) => sum + (item.closedQuantity ?? 0), 0);
          const totalOrdered = purchaseOrder.items.reduce((sum, item) => sum + item.quantity, 0);

          return {
            ...purchaseOrder,
            totalReceived,
            totalClosed,
            totalOrdered,
            percentageReceived: totalOrdered > 0 ? ((totalReceived + totalClosed) / totalOrdered) * 100 : 0,
            grnCount: relatedGrns.length,
          };
        })
        .filter((purchaseOrder) => {
          const matchesDate = isWithinDateRange(new Date(purchaseOrder.orderDate), dateRange);
          const matchesSearch =
            !normalizedSearch ||
            purchaseOrder.poNumber.toLowerCase().includes(normalizedSearch) ||
            purchaseOrder.vendorName.toLowerCase().includes(normalizedSearch) ||
            purchaseOrder.items.some((item) => item.itemName.toLowerCase().includes(normalizedSearch));
          return matchesDate && matchesSearch;
        })
        .sort((left, right) => new Date(right.orderDate).getTime() - new Date(left.orderDate).getTime()),
    [dateRange, goodsReceipts, normalizedSearch, purchaseOrders],
  );

  const pendingPurchaseOrders = useMemo(
    () =>
      purchaseOrderRows.filter(
        (purchaseOrder) =>
          purchaseOrder.status === 'draft' ||
          purchaseOrder.status === 'approved' ||
          purchaseOrder.status === 'partially-received',
      ),
    [purchaseOrderRows],
  );

  const filteredGoodsReceipts = useMemo(
    () =>
      [...goodsReceipts]
        .filter((grn) => {
          const matchesDate = isWithinDateRange(new Date(grn.receiptDate), dateRange);
          const matchesSearch =
            !normalizedSearch ||
            grn.grnNumber.toLowerCase().includes(normalizedSearch) ||
            grn.poNumber.toLowerCase().includes(normalizedSearch) ||
            grn.vendorName.toLowerCase().includes(normalizedSearch);
          return matchesDate && matchesSearch;
        })
        .sort((left, right) => new Date(right.receiptDate).getTime() - new Date(left.receiptDate).getTime()),
    [dateRange, goodsReceipts, normalizedSearch],
  );

  const grnRegisterRows = useMemo(
    () =>
      goodsReceipts.map((grn) => {
        const linkedPurchaseOrder = purchaseOrderById.get(grn.purchaseOrderId);
        const storeIds = Array.from(
          new Set(
            grn.items
              .map((item) => item.destinationStore || grn.destinationStore)
              .filter((store): store is NonNullable<typeof store> => Boolean(store)),
          ),
        );
        const acceptedValue = getAcceptedValue(grn);
        const rejectedValue = getRejectedValue(grn);
        const acceptedQuantity = getAcceptedQuantity(grn);
        const rejectedQuantity = getRejectedQuantity(grn);

        return {
          ...grn,
          linkedPurchaseOrder,
          storeIds,
          storeSummary: getGrnStoreSummary(stores, grn),
          itemCount: grn.items.length,
          acceptedValue,
          rejectedValue,
          acceptedQuantity,
          rejectedQuantity,
          receiptStatus: getReceiptStatusFromPurchaseOrder(linkedPurchaseOrder),
          qualityStatus: grn.qualityCheckStatus,
          canContinue: canContinueReceipt(linkedPurchaseOrder),
        };
      }),
    [goodsReceipts, purchaseOrderById, stores],
  );

  const filteredGrnRegisterRows = useMemo(
    () =>
      [...grnRegisterRows]
        .filter((grn) => {
          const matchesDate = isWithinDateRange(new Date(grn.receiptDate), dateRange);
          const matchesVendor = grnVendorFilter === 'all' || grn.vendorId === grnVendorFilter;
          const matchesStore = grnStoreFilter === 'all' || grn.storeIds.includes(grnStoreFilter);
          const matchesReceiptStatus = grnReceiptStatusFilter === 'all' || grn.receiptStatus === grnReceiptStatusFilter;
          const matchesQualityStatus = grnQualityStatusFilter === 'all' || grn.qualityStatus === grnQualityStatusFilter;
          const matchesPo = !normalizedGrnPoFilter || grn.poNumber.toLowerCase().includes(normalizedGrnPoFilter);
          const matchesGrnNumber = !normalizedGrnNumberFilter || grn.grnNumber.toLowerCase().includes(normalizedGrnNumberFilter);
          const matchesSearch =
            !normalizedSearch ||
            grn.grnNumber.toLowerCase().includes(normalizedSearch) ||
            grn.poNumber.toLowerCase().includes(normalizedSearch) ||
            grn.vendorName.toLowerCase().includes(normalizedSearch) ||
            (grn.receivedBy || '').toLowerCase().includes(normalizedSearch) ||
            (grn.qualityRemarks || '').toLowerCase().includes(normalizedSearch) ||
            grn.items.some((item) => item.itemName.toLowerCase().includes(normalizedSearch));

          return (
            matchesDate &&
            matchesVendor &&
            matchesStore &&
            matchesReceiptStatus &&
            matchesQualityStatus &&
            matchesPo &&
            matchesGrnNumber &&
            matchesSearch
          );
        })
        .sort((left, right) => new Date(right.receiptDate).getTime() - new Date(left.receiptDate).getTime()),
    [
      dateRange,
      grnNumberFilter,
      grnPoFilter,
      grnQualityStatusFilter,
      grnReceiptStatusFilter,
      grnRegisterRows,
      grnStoreFilter,
      grnVendorFilter,
      normalizedGrnNumberFilter,
      normalizedGrnPoFilter,
      normalizedSearch,
    ],
  );

  const grnMetrics = useMemo(() => {
    const todaysRows = filteredGrnRegisterRows.filter((grn) => isSameDay(grn.receiptDate));

    return {
      todaysGrns: todaysRows.length,
      pendingInspection: filteredGrnRegisterRows.filter((grn) => grn.qualityStatus === 'pending').length,
      partialReceipts: filteredGrnRegisterRows.filter((grn) => grn.receiptStatus === 'partial').length,
      acceptedToday: todaysRows.reduce((sum, grn) => sum + grn.acceptedValue, 0),
      rejectedToday: todaysRows.reduce((sum, grn) => sum + grn.rejectedValue, 0),
      totalReceiptValue: filteredGrnRegisterRows.reduce((sum, grn) => sum + grn.acceptedValue, 0),
    };
  }, [filteredGrnRegisterRows]);

  const grnVendorOptions = useMemo(
    () =>
      vendors
        .filter((vendor) => goodsReceipts.some((grn) => grn.vendorId === vendor.id))
        .sort((left, right) => left.vendorName.localeCompare(right.vendorName)),
    [goodsReceipts, vendors],
  );

  const grnStoreOptions = useMemo(
    () =>
      Array.from(
        new Set(
          goodsReceipts.flatMap((grn) =>
            grn.items
              .map((item) => item.destinationStore || grn.destinationStore)
              .filter((store): store is string => Boolean(store)),
          ),
        ),
      ).sort((left, right) => getStoreDisplayName(stores, left).localeCompare(getStoreDisplayName(stores, right))),
    [goodsReceipts, stores],
  );

  const selectedGrn = useMemo(
    () => grnRegisterRows.find((grn) => grn.id === selectedGrnId) || null,
    [grnRegisterRows, selectedGrnId],
  );

  const selectedPurchaseOrder = useMemo(
    () => (selectedPurchaseOrderId ? purchaseOrderById.get(selectedPurchaseOrderId) || null : null),
    [purchaseOrderById, selectedPurchaseOrderId],
  );

  const selectedPurchaseOrderRow = useMemo(
    () => purchaseOrderRows.find((purchaseOrder) => purchaseOrder.id === selectedPurchaseOrderId) || null,
    [purchaseOrderRows, selectedPurchaseOrderId],
  );

  const selectedPurchaseOrderGrns = useMemo(
    () =>
      selectedPurchaseOrder
        ? grnRegisterRows
            .filter((grn) => grn.purchaseOrderId === selectedPurchaseOrder.id)
            .sort((left, right) => new Date(right.receiptDate).getTime() - new Date(left.receiptDate).getTime())
        : [],
    [grnRegisterRows, selectedPurchaseOrder],
  );

  const vendorWatchlist = useMemo(
    () =>
      vendors
        .map((vendor) => ({
          ...vendor,
          attention: getVendorAttentionMeta(vendor),
        }))
        .filter((vendor) => {
          const matchesSearch =
            !normalizedSearch ||
            vendor.vendorName.toLowerCase().includes(normalizedSearch) ||
            vendor.vendorCode.toLowerCase().includes(normalizedSearch) ||
            vendor.contactPerson.toLowerCase().includes(normalizedSearch);
          return matchesSearch && (vendor.attention.priority <= 4 || vendor.totalPurchases > 0);
        })
        .sort((left, right) => {
          if (left.attention.priority !== right.attention.priority) {
            return left.attention.priority - right.attention.priority;
          }
          return right.currentBalance - left.currentBalance;
        }),
    [normalizedSearch, vendors],
  );

  const reorderWatchlist = useMemo(
    () =>
      purchaseItemsWithDerivedStock
        .filter((item) => {
          const status = getStockStatusMeta(item.derivedStock, item.reorderLevel);
          const matchesSearch =
            !normalizedSearch ||
            item.itemName.toLowerCase().includes(normalizedSearch) ||
            (item.itemCode || '').toLowerCase().includes(normalizedSearch);
          return matchesSearch && item.status === 'active' && (status.label === 'Low' || status.label === 'Critical' || status.label === 'Out');
        })
        .sort((left, right) => left.derivedStock - right.derivedStock),
    [normalizedSearch, purchaseItemsWithDerivedStock],
  );

  const topVendors = useMemo(
    () =>
      vendors
        .filter((vendor) => {
          const matchesSearch =
            !normalizedSearch ||
            vendor.vendorName.toLowerCase().includes(normalizedSearch) ||
            vendor.vendorCode.toLowerCase().includes(normalizedSearch);
          return matchesSearch && vendor.totalPurchases > 0;
        })
        .sort((left, right) => right.totalPurchases - left.totalPurchases)
        .slice(0, 8),
    [normalizedSearch, vendors],
  );

  const metrics = useMemo(
    () => ({
      activeVendors: vendors.filter((vendor) => vendor.status === 'active').length,
      creditVendors: vendors.filter((vendor) => vendor.paymentTerms !== 'cash').length,
      pendingPOs: pendingPurchaseOrders.length,
      poValue: purchaseOrderRows.reduce((sum, purchaseOrder) => sum + purchaseOrder.totalAmount, 0),
      outstanding: vendors.reduce((sum, vendor) => sum + vendor.currentBalance, 0),
      lowStockItems: reorderWatchlist.length,
      grns: filteredGoodsReceipts.length,
    }),
    [filteredGoodsReceipts.length, pendingPurchaseOrders.length, purchaseOrderRows, reorderWatchlist.length, vendors],
  );

  const openLinkedPurchaseOrder = (purchaseOrderId: string) => {
    setSelectedGrnId(null);
    setSelectedPurchaseOrderId(purchaseOrderId);
  };

  const openLinkedGrn = (grnId: string) => {
    setSelectedPurchaseOrderId(null);
    setSelectedGrnId(grnId);
  };

  const handleContinueReceipt = (purchaseOrder?: PurchaseOrder | null) => {
    if (!canContinueReceipt(purchaseOrder)) {
      return;
    }

    setSelectedGrnId(null);
    setSelectedPurchaseOrderId(null);
    setSelectedPOForGRN(purchaseOrder || null);
    setGrnDialogOpen(true);
  };

  const clearGrnFilters = () => {
    setGrnVendorFilter('all');
    setGrnStoreFilter('all');
    setGrnReceiptStatusFilter('all');
    setGrnQualityStatusFilter('all');
    setGrnPoFilter('');
    setGrnNumberFilter('');
    setSearchTerm('');
    setDateRange('30d');
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <button
            onClick={onBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="mr-2 min-w-[160px]">
            <h1 className="text-base font-semibold text-slate-900">Kitchen Purchase</h1>
            <p className="text-xs text-slate-500">Purchase &gt; {currentTabLabel}</p>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
            className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            {dateRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'grn-register' ? 'Search GRN, PO, vendor, receiver, or item' : 'Search vendor, PO, GRN, or item'}
              className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
          {activeTab === 'grn-register' ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span><strong className="text-slate-900">Today's GRNs:</strong> {grnMetrics.todaysGrns}</span>
              <span><strong className="text-slate-900">Pending Inspection:</strong> {grnMetrics.pendingInspection}</span>
              <span><strong className="text-slate-900">Partial Receipts:</strong> {grnMetrics.partialReceipts}</span>
              <span><strong className="text-slate-900">Accepted Today:</strong> {compactCurrency(grnMetrics.acceptedToday)}</span>
              <span><strong className="text-slate-900">Rejected Today:</strong> {compactCurrency(grnMetrics.rejectedToday)}</span>
              <span><strong className="text-slate-900">Total Receipt Value:</strong> {compactCurrency(grnMetrics.totalReceiptValue)}</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span><strong className="text-slate-900">Active Vendors:</strong> {metrics.activeVendors}</span>
              <span><strong className="text-slate-900">Credit Vendors:</strong> {metrics.creditVendors}</span>
              <span><strong className="text-slate-900">Pending PO:</strong> {metrics.pendingPOs}</span>
              <span><strong className="text-slate-900">PO Value:</strong> {compactCurrency(metrics.poValue)}</span>
              <span><strong className="text-slate-900">Outstanding:</strong> {compactCurrency(metrics.outstanding)}</span>
              <span><strong className="text-slate-900">Low Stock:</strong> {metrics.lowStockItems}</span>
              <span><strong className="text-slate-900">GRNs:</strong> {metrics.grns}</span>
              <span><strong className="text-slate-900">User:</strong> {userName}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1 border-t border-slate-200 px-4 py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        {activeTab === 'overview' && (
          <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto xl:grid-cols-2">
            <CompactSection title="Pending Purchase Orders" actionLabel="Open Purchase Orders" onAction={() => handleTabChange('purchase-orders')}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>PO No</th>
                      <th className={tableHeadClass}>Vendor</th>
                      <th className={tableHeadClass}>Expected</th>
                      <th className={`${tableHeadClass} text-right`}>Amount</th>
                      <th className={`${tableHeadClass} text-right`}>Received</th>
                      <th className={tableHeadClass}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPurchaseOrders.slice(0, 8).map((purchaseOrder) => (
                      <tr key={purchaseOrder.id} className="border-t border-slate-200">
                        <td className={tableCellClass}>{purchaseOrder.poNumber}</td>
                        <td className={tableCellClass}>{purchaseOrder.vendorName}</td>
                        <td className={tableCellClass}>{formatDatePK(purchaseOrder.expectedDeliveryDate)}</td>
                        <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                          {formatCurrencyPKR(purchaseOrder.totalAmount)}
                        </td>
                        <td className={`${tableCellClass} text-right`}>{purchaseOrder.percentageReceived.toFixed(0)}%</td>
                        <td className={tableCellClass}>{getStatusBadge(purchaseOrder.status)}</td>
                      </tr>
                    ))}
                    {pendingPurchaseOrders.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={6}>
                          No pending purchase orders found for the current filter.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CompactSection>

            <CompactSection title="Vendor Attention Queue" actionLabel="Open Vendors" onAction={() => handleTabChange('vendors')}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Vendor</th>
                      <th className={tableHeadClass}>Focus</th>
                      <th className={`${tableHeadClass} text-right`}>Outstanding</th>
                      <th className={tableHeadClass}>Terms</th>
                      <th className={tableHeadClass}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorWatchlist.slice(0, 8).map((vendor) => (
                      <tr key={vendor.id} className="border-t border-slate-200">
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{vendor.vendorName}</div>
                          <div className="text-xs text-slate-500">{vendor.contactPerson}</div>
                        </td>
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{vendor.attention.label}</div>
                          <div className="text-xs text-slate-500">{vendor.attention.detail}</div>
                        </td>
                        <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                          {formatCurrencyPKR(vendor.currentBalance)}
                        </td>
                        <td className={tableCellClass}>{vendor.paymentTerms.replace(/-/g, ' ')}</td>
                        <td className={tableCellClass}>{getStatusBadge(vendor.status)}</td>
                      </tr>
                    ))}
                    {vendorWatchlist.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={5}>
                          No vendor watchlist items found for the current filter.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CompactSection>

            <CompactSection title="Reorder Watchlist" actionLabel="Open Purchase Items" onAction={() => handleTabChange('purchase-items')}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Item</th>
                      <th className={tableHeadClass}>Assigned Store</th>
                      <th className={`${tableHeadClass} text-right`}>Current</th>
                      <th className={`${tableHeadClass} text-right`}>Reorder</th>
                      <th className={tableHeadClass}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reorderWatchlist.slice(0, 10).map((item) => {
                      const status = getStockStatusMeta(item.derivedStock, item.reorderLevel);
                      return (
                        <tr key={item.id} className="border-t border-slate-200">
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{item.itemName}</div>
                            <div className="text-xs text-slate-500">{item.itemCode || 'No code'}</div>
                          </td>
                          <td className={tableCellClass}>{getStoreDisplayName(stores, item.storeLocation)}</td>
                          <td className={`${tableCellClass} text-right ${status.textClass}`}>
                            {item.derivedStock} {getPurchaseDisplayUnit(item)}
                          </td>
                          <td className={`${tableCellClass} text-right`}>
                            {item.reorderLevel} {getPurchaseDisplayUnit(item)}
                          </td>
                          <td className={tableCellClass}>
                            <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${status.badgeClass}`}>
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {reorderWatchlist.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={5}>
                          No low stock items found for the current filter.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CompactSection>

            <CompactSection title="Recent Goods Receipts" actionLabel="Open GRN Register" onAction={() => handleTabChange('grn-register')}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>GRN No</th>
                      <th className={tableHeadClass}>Vendor</th>
                      <th className={tableHeadClass}>Receipt Date</th>
                      <th className={tableHeadClass}>Store</th>
                      <th className={`${tableHeadClass} text-right`}>Accepted Value</th>
                      <th className={tableHeadClass}>Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGoodsReceipts.slice(0, 8).map((grn) => (
                      <tr key={grn.id} className="border-t border-slate-200">
                        <td className={tableCellClass}>{grn.grnNumber}</td>
                        <td className={tableCellClass}>{grn.vendorName}</td>
                        <td className={tableCellClass}>{formatDatePK(grn.receiptDate)}</td>
                        <td className={tableCellClass}>{getGrnStoreSummary(stores, grn)}</td>
                        <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                          {formatCurrencyPKR(grn.items.reduce((sum, item) => sum + item.totalValue, 0))}
                        </td>
                        <td className={tableCellClass}>{getStatusBadge(grn.qualityCheckStatus)}</td>
                      </tr>
                    ))}
                    {filteredGoodsReceipts.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={6}>
                          No GRNs found for the current filter.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CompactSection>

            <div className="xl:col-span-2">
              <CompactSection title="Top Vendors by Purchase Value" actionLabel="Open Vendors" onAction={() => handleTabChange('vendors')}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Vendor</th>
                        <th className={tableHeadClass}>Categories</th>
                        <th className={tableHeadClass}>Last Purchase</th>
                        <th className={`${tableHeadClass} text-right`}>Lifetime Purchases</th>
                        <th className={`${tableHeadClass} text-right`}>Outstanding</th>
                        <th className={tableHeadClass}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topVendors.map((vendor) => (
                        <tr key={vendor.id} className="border-t border-slate-200">
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{vendor.vendorName}</div>
                            <div className="text-xs text-slate-500">{vendor.vendorCode}</div>
                          </td>
                          <td className={tableCellClass}>
                            {(vendor.vendorCategories || [])
                              .slice(0, 2)
                              .map((assignment) => assignment.category.replace(/-/g, ' '))
                              .join(', ') || '-'}
                          </td>
                          <td className={tableCellClass}>
                            {vendor.lastPurchaseDate ? formatDatePK(vendor.lastPurchaseDate) : 'No purchases'}
                          </td>
                          <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                            {formatCurrencyPKR(vendor.totalPurchases)}
                          </td>
                          <td className={`${tableCellClass} text-right`}>
                            {formatCurrencyPKR(vendor.currentBalance)}
                          </td>
                          <td className={tableCellClass}>{getStatusBadge(vendor.status)}</td>
                        </tr>
                      ))}
                      {topVendors.length === 0 ? (
                        <tr>
                          <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={6}>
                            No vendor purchase history found for the current filter.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CompactSection>
            </div>
          </div>
        )}

        {activeTab === 'vendors' && (
          <VendorMasterEnhanced
            userName={userName}
            vendors={vendors}
            procurementLookups={procurementLookups}
            purchaseItems={purchaseItems}
            vendorItemMappings={vendorItemMappings}
            onVendorsChange={onVendorsChange}
            onPurchaseItemsChange={onPurchaseItemsChange}
            onVendorItemMappingsChange={onVendorItemMappingsChange}
            onProcurementLookupsChange={onProcurementLookupsChange}
          />
        )}

        {activeTab === 'purchase-items' && (
          <PurchaseItemMaster
            stores={stores}
            purchaseItems={purchaseItems}
            storeStocks={storeStocks}
            units={units}
            vendors={vendors}
            vendorItemMappings={vendorItemMappings}
            procurementLookups={procurementLookups}
            goodsReceipts={goodsReceipts}
            kitchenIssueSheets={kitchenIssueSheets}
            defaultDateRangeFilter={dateRange}
            onPurchaseItemsChange={onPurchaseItemsChange}
            onVendorItemMappingsChange={onVendorItemMappingsChange}
            onProcurementLookupsChange={onProcurementLookupsChange}
            onStoreStocksChange={onStoreStocksChange}
          />
        )}

        {activeTab === 'purchase-orders' && (
          <PurchaseOrders
            userName={userName}
            purchaseOrders={purchaseOrders}
            vendors={vendors}
            purchaseItems={purchaseItems}
            procurementLookups={procurementLookups}
            stores={stores}
            goodsReceipts={goodsReceipts}
            storeStocks={storeStocks}
            vendorBills={vendorBills}
            vendorItemMappings={vendorItemMappings}
            bookings={bookings}
            dishes={dishes}
            recipes={recipes}
            menuPackages={menuPackages}
            productionCostMethods={productionCostMethods}
            kitchenIssueSheets={kitchenIssueSheets}
            units={units}
            onVendorsChange={onVendorsChange}
            onProcurementLookupsChange={onProcurementLookupsChange}
            onPurchaseOrdersChange={onPurchaseOrdersChange}
            onPurchaseItemsChange={onPurchaseItemsChange}
            onVendorItemMappingsChange={onVendorItemMappingsChange}
            onGoodsReceiptsChange={onGoodsReceiptsChange}
            onStoreStocksChange={onStoreStocksChange}
            onVendorBillsChange={onVendorBillsChange}
          />
        )}

        {activeTab === 'grn-register' && (
          <div className="flex h-full flex-col overflow-hidden rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Goods Receipt Register</h3>
                  <p className="text-xs text-slate-500">Primary receiving window for posted GRNs, partial receipts, and PO follow-up.</p>
                </div>
                <span className="text-xs text-slate-500">{filteredGrnRegisterRows.length} rows</span>
              </div>
            </div>
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
                <select
                  value={grnVendorFilter}
                  onChange={(event) => setGrnVendorFilter(event.target.value)}
                  className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700"
                >
                  <option value="all">All Vendors</option>
                  {grnVendorOptions.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.vendorName}
                    </option>
                  ))}
                </select>
                <select
                  value={grnStoreFilter}
                  onChange={(event) => setGrnStoreFilter(event.target.value)}
                  className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700"
                >
                  <option value="all">All Stores</option>
                  {grnStoreOptions.map((storeId) => (
                    <option key={storeId} value={storeId}>
                      {getStoreDisplayName(stores, storeId)}
                    </option>
                  ))}
                </select>
                <select
                  value={grnReceiptStatusFilter}
                  onChange={(event) => setGrnReceiptStatusFilter(event.target.value as 'all' | GrnReceiptStatus)}
                  className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700"
                >
                  <option value="all">All Receipt Status</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select
                  value={grnQualityStatusFilter}
                  onChange={(event) => setGrnQualityStatusFilter(event.target.value as 'all' | GoodsReceipt['qualityCheckStatus'])}
                  className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700"
                >
                  <option value="all">All Quality Status</option>
                  <option value="pending">Inspection Pending</option>
                  <option value="approved">Accepted</option>
                  <option value="partial">Partial Acceptance</option>
                  <option value="rejected">Rejected</option>
                </select>
                <input
                  type="text"
                  value={grnPoFilter}
                  onChange={(event) => setGrnPoFilter(event.target.value)}
                  placeholder="PO Number"
                  className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 placeholder:text-slate-400"
                />
                <input
                  type="text"
                  value={grnNumberFilter}
                  onChange={(event) => setGrnNumberFilter(event.target.value)}
                  placeholder="GRN Number"
                  className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 placeholder:text-slate-400"
                />
                <div className="flex items-center text-xs text-slate-500">
                  {filteredGrnRegisterRows.filter((grn) => grn.canContinue).length} receivable PO linked
                </div>
                <button
                  onClick={clearGrnFilters}
                  className="h-8 rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Clear Filters
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className={tableHeadClass}>GRN</th>
                    <th className={tableHeadClass}>PO / Vendor</th>
                    <th className={tableHeadClass}>Store / Items</th>
                    <th className={tableHeadClass}>Receipt Status</th>
                    <th className={tableHeadClass}>Quality Status</th>
                    <th className={`${tableHeadClass} text-right`}>Receipt Value</th>
                    <th className={`${tableHeadClass} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGrnRegisterRows.map((grn) => {
                    const receiptMeta = getReceiptStatusMeta(grn.receiptStatus);
                    const qualityMeta = getQualityStatusMeta(grn.qualityStatus);

                    return (
                      <tr key={grn.id} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{grn.grnNumber}</div>
                          <div className="text-xs text-slate-500">
                            {formatDatePK(grn.receiptDate)} | By {grn.receivedBy}
                          </div>
                        </td>
                        <td className={tableCellClass}>
                          <button
                            onClick={() => openLinkedPurchaseOrder(grn.purchaseOrderId)}
                            className="text-left text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
                          >
                            {grn.poNumber}
                          </button>
                          <div className="text-xs text-slate-500">{grn.vendorName}</div>
                        </td>
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{grn.storeSummary || 'Unassigned'}</div>
                          <div className="text-xs text-slate-500">{grn.itemCount} item lines</div>
                        </td>
                        <td className={tableCellClass}>
                          <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${receiptMeta.className}`}>
                            {receiptMeta.label}
                          </span>
                          <div className="mt-1 text-xs text-slate-500">
                            Accepted {grn.acceptedQuantity} | Rejected {grn.rejectedQuantity}
                          </div>
                        </td>
                        <td className={tableCellClass}>
                          <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${qualityMeta.className}`}>
                            {qualityMeta.label}
                          </span>
                          <div className="mt-1 text-xs text-slate-500">
                            {grn.qualityCheckedBy ? `QC ${grn.qualityCheckedBy}` : 'QC pending'}
                          </div>
                        </td>
                        <td className={`${tableCellClass} text-right`}>
                          <div className="font-medium text-slate-900">{formatCurrencyPKR(grn.acceptedValue)}</div>
                          <div className="text-xs text-slate-500">
                            Rejected {formatCurrencyPKR(grn.rejectedValue)}
                          </div>
                        </td>
                        <td className={`${tableCellClass} text-right`}>
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              onClick={() => openLinkedGrn(grn.id)}
                              className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Eye className="size-3.5" />
                              View
                            </button>
                            {grn.canContinue ? (
                              <button
                                onClick={() => handleContinueReceipt(grn.linkedPurchaseOrder)}
                                className="inline-flex h-7 items-center gap-1 rounded bg-emerald-600 px-2 text-xs font-medium text-white hover:bg-emerald-700"
                              >
                                <Package className="size-3.5" />
                                Continue
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredGrnRegisterRows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={7}>
                        No GRNs match the current receiving filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selectedGrn ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{selectedGrn.grnNumber}</h2>
                  <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${getQualityStatusMeta(selectedGrn.qualityStatus).className}`}>
                    {getQualityStatusMeta(selectedGrn.qualityStatus).label}
                  </span>
                </div>
                <p className="text-xs text-slate-500">Review received lines, quality outcome, and linked purchase order.</p>
              </div>
              <button
                onClick={() => setSelectedGrnId(null)}
                className="rounded p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5">
                  <section className="rounded border border-slate-200">
                    <div className="border-b border-slate-200 px-4 py-2">
                      <h3 className="text-sm font-semibold text-slate-900">Receipt Details</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vendor</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">{selectedGrn.vendorName}</div>
                        <div className="text-sm text-slate-600">Received by {selectedGrn.receivedBy}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linked PO</div>
                        <button
                          onClick={() => openLinkedPurchaseOrder(selectedGrn.purchaseOrderId)}
                          className="mt-1 text-left text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
                        >
                          {selectedGrn.poNumber}
                        </button>
                        <div className="text-sm text-slate-600">Receipt date {formatDatePK(selectedGrn.receiptDate)}</div>
                      </div>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded border border-slate-200">
                    <div className="border-b border-slate-200 px-4 py-2">
                      <h3 className="text-sm font-semibold text-slate-900">Received Items</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className={tableHeadClass}>Item</th>
                            <th className={`${tableHeadClass} text-right`}>Ordered</th>
                            <th className={`${tableHeadClass} text-right`}>Received</th>
                            <th className={`${tableHeadClass} text-right`}>Accepted</th>
                            <th className={`${tableHeadClass} text-right`}>Rejected</th>
                            <th className={tableHeadClass}>Store</th>
                            <th className={`${tableHeadClass} text-right`}>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedGrn.items.map((item, index) => (
                            <tr key={`${selectedGrn.id}-${item.purchaseItemId}-${index}`} className="border-t border-slate-200">
                              <td className={tableCellClass}>
                                <div className="font-medium text-slate-900">{item.itemName}</div>
                                <div className="text-xs text-slate-500">{item.unit}</div>
                              </td>
                              <td className={`${tableCellClass} text-right`}>{item.orderedQuantity}</td>
                              <td className={`${tableCellClass} text-right`}>{item.receivedQuantity}</td>
                              <td className={`${tableCellClass} text-right`}>{item.acceptedQuantity}</td>
                              <td className={`${tableCellClass} text-right`}>{item.rejectedQuantity}</td>
                              <td className={tableCellClass}>{getStoreDisplayName(stores, item.destinationStore || selectedGrn.destinationStore)}</td>
                              <td className={`${tableCellClass} text-right font-medium text-slate-900`}>{formatCurrencyPKR(item.totalValue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {selectedGrn.qualityRemarks ? (
                    <section className="rounded border border-slate-200 bg-slate-50 p-4">
                      <h3 className="mb-2 text-sm font-semibold text-slate-900">Quality Remarks</h3>
                      <p className="text-sm text-slate-700">{selectedGrn.qualityRemarks}</p>
                    </section>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <section className="rounded border border-slate-200 bg-slate-50 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">Receipt Summary</h3>
                    <div className="space-y-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between">
                        <span>Store</span>
                        <span className="font-medium text-slate-900">{selectedGrn.storeSummary || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Items</span>
                        <span className="font-medium text-slate-900">{selectedGrn.itemCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Accepted Value</span>
                        <span className="font-medium text-slate-900">{formatCurrencyPKR(selectedGrn.acceptedValue)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Rejected Value</span>
                        <span className="font-medium text-slate-900">{formatCurrencyPKR(selectedGrn.rejectedValue)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Receipt Status</span>
                        <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${getReceiptStatusMeta(selectedGrn.receiptStatus).className}`}>
                          {getReceiptStatusMeta(selectedGrn.receiptStatus).label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Quality</span>
                        <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${getQualityStatusMeta(selectedGrn.qualityStatus).className}`}>
                          {getQualityStatusMeta(selectedGrn.qualityStatus).label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Checked By</span>
                        <span className="font-medium text-slate-900">{selectedGrn.qualityCheckedBy || 'Pending'}</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button
                onClick={() => setSelectedGrnId(null)}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              >
                Close
              </button>
              <button
                onClick={() => openLinkedPurchaseOrder(selectedGrn.purchaseOrderId)}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              >
                Open Purchase Order
              </button>
              {selectedGrn.canContinue ? (
                <button
                  onClick={() => handleContinueReceipt(selectedGrn.linkedPurchaseOrder)}
                  className="rounded border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Continue Partial Receipt
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {selectedPurchaseOrder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{selectedPurchaseOrder.poNumber}</h2>
                  {getStatusBadge(selectedPurchaseOrder.status)}
                </div>
                <p className="text-xs text-slate-500">Review original PO, receipt progress, and posted GRNs without leaving the register.</p>
              </div>
              <button
                onClick={() => setSelectedPurchaseOrderId(null)}
                className="rounded p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5">
                  <section className="rounded border border-slate-200">
                    <div className="border-b border-slate-200 px-4 py-2">
                      <h3 className="text-sm font-semibold text-slate-900">Commercial Details</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vendor</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">{selectedPurchaseOrder.vendorName}</div>
                        <div className="text-sm text-slate-600">Terms: {selectedPurchaseOrder.paymentTerms.replace(/-/g, ' ')}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Schedule</div>
                        <div className="mt-1 text-sm text-slate-700">Order: {formatDatePK(selectedPurchaseOrder.orderDate)}</div>
                        <div className="text-sm text-slate-700">Expected: {formatDatePK(selectedPurchaseOrder.expectedDeliveryDate)}</div>
                      </div>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded border border-slate-200">
                    <div className="border-b border-slate-200 px-4 py-2">
                      <h3 className="text-sm font-semibold text-slate-900">Line Items</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className={tableHeadClass}>Item</th>
                            <th className={`${tableHeadClass} text-right`}>Ordered</th>
                            <th className={`${tableHeadClass} text-right`}>Received</th>
                            <th className={`${tableHeadClass} text-right`}>Closed</th>
                            <th className={`${tableHeadClass} text-right`}>Pending</th>
                            <th className={`${tableHeadClass} text-right`}>Rate</th>
                            <th className={`${tableHeadClass} text-right`}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPurchaseOrder.items.map((item) => {
                            const receivedQuantity = item.receivedQuantity ?? selectedPurchaseOrder.receivedQuantities?.[item.purchaseItemId] ?? 0;
                            const closedQuantity = item.closedQuantity ?? 0;
                            const pendingQuantity = Math.max(item.quantity - receivedQuantity - closedQuantity, 0);

                            return (
                              <tr key={item.id} className="border-t border-slate-200">
                                <td className={tableCellClass}>
                                  <div className="font-medium text-slate-900">{item.itemName}</div>
                                  <div className="text-xs text-slate-500">{item.unit}</div>
                                </td>
                                <td className={`${tableCellClass} text-right`}>{item.quantity}</td>
                                <td className={`${tableCellClass} text-right`}>{receivedQuantity}</td>
                                <td className={`${tableCellClass} text-right`}>{closedQuantity > 0 ? closedQuantity : '-'}</td>
                                <td className={`${tableCellClass} text-right`}>{pendingQuantity}</td>
                                <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(item.ratePerUnit)}</td>
                                <td className={`${tableCellClass} text-right font-medium text-slate-900`}>{formatCurrencyPKR(item.amount)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded border border-slate-200">
                    <div className="border-b border-slate-200 px-4 py-2">
                      <h3 className="text-sm font-semibold text-slate-900">Posted GRNs</h3>
                    </div>
                    {selectedPurchaseOrderGrns.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-500">No GRNs have been posted against this PO yet.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className={tableHeadClass}>GRN</th>
                              <th className={tableHeadClass}>Receipt Date</th>
                              <th className={tableHeadClass}>Quality</th>
                              <th className={`${tableHeadClass} text-right`}>Accepted Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPurchaseOrderGrns.map((grn) => (
                              <tr key={grn.id} className="border-t border-slate-200">
                                <td className={tableCellClass}>
                                  <button
                                    onClick={() => openLinkedGrn(grn.id)}
                                    className="text-left font-medium text-blue-700 hover:text-blue-800 hover:underline"
                                  >
                                    {grn.grnNumber}
                                  </button>
                                </td>
                                <td className={tableCellClass}>{formatDatePK(grn.receiptDate)}</td>
                                <td className={tableCellClass}>
                                  <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${getQualityStatusMeta(grn.qualityStatus).className}`}>
                                    {getQualityStatusMeta(grn.qualityStatus).label}
                                  </span>
                                </td>
                                <td className={`${tableCellClass} text-right font-medium text-slate-900`}>{formatCurrencyPKR(grn.acceptedValue)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </div>

                <div className="space-y-4">
                  <section className="rounded border border-slate-200 bg-slate-50 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">PO Summary</h3>
                    <div className="space-y-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between">
                        <span>Receipt Progress</span>
                        <span className="font-medium text-slate-900">{selectedPurchaseOrderRow?.percentageReceived.toFixed(0) || 0}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Ordered Units</span>
                        <span className="font-medium text-slate-900">{selectedPurchaseOrderRow?.totalOrdered || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Received Units</span>
                        <span className="font-medium text-slate-900">{selectedPurchaseOrderRow?.totalReceived || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Closed Units</span>
                        <span className="font-medium text-slate-900">{selectedPurchaseOrderRow?.totalClosed || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>GRNs Posted</span>
                        <span className="font-medium text-slate-900">{selectedPurchaseOrderRow?.grnCount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Total Value</span>
                        <span className="font-medium text-slate-900">{formatCurrencyPKR(selectedPurchaseOrder.totalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Pending Amount</span>
                        <span className="font-medium text-slate-900">{formatCurrencyPKR(selectedPurchaseOrder.amountPending)}</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button
                onClick={() => setSelectedPurchaseOrderId(null)}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              >
                Close
              </button>
              {canContinueReceipt(selectedPurchaseOrder) ? (
                <button
                  onClick={() => handleContinueReceipt(selectedPurchaseOrder)}
                  className="rounded border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Continue Receipt
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {grnDialogOpen && selectedPOForGRN ? (
        <GRNDialog
          open={grnDialogOpen}
          onClose={() => {
            setGrnDialogOpen(false);
            setSelectedPOForGRN(null);
          }}
          purchaseOrder={selectedPOForGRN}
          onGRNCreate={(grn, updatedPurchaseOrder) => {
            onGoodsReceiptsChange([...goodsReceipts, grn]);
            onPurchaseOrdersChange(
              purchaseOrders.map((purchaseOrder) =>
                purchaseOrder.id === updatedPurchaseOrder.id ? updatedPurchaseOrder : purchaseOrder,
              ),
            );
            setGrnDialogOpen(false);
            setSelectedPOForGRN(null);
          }}
          stores={stores}
          purchaseItems={purchaseItems}
          storeStocks={storeStocks}
          vendors={vendors}
          vendorBills={vendorBills}
          onPurchaseItemsChange={onPurchaseItemsChange}
          onStoreStocksChange={onStoreStocksChange}
          onVendorsChange={onVendorsChange}
          onVendorBillsChange={onVendorBillsChange}
          userName={userName}
        />
      ) : null}
    </div>
  );
}
