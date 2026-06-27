import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Clock3,
  Edit3,
  Eye,
  Package,
  Plus,
  Search,
  Truck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrencyPKR, formatDatePK } from '../../lib/locale';
import { getLookupName } from '../../lib/procurementLookups';
import { getCanonicalItemCategoryId, getVendorSupportMatch } from '../../lib/vendorCategorySupport';
import { Booking } from '../calendar/types-v2';
import {
  Dish,
  GoodsReceipt,
  KitchenIssueSheet,
  MenuPackage,
  ProcurementLookupState,
  PurchaseItem,
  PurchaseOrder,
  PurchaseOrderItem as POItem,
  Recipe,
  StoreMaster,
  StoreStock,
  UnitMaster,
  Vendor,
  VendorBill,
  VendorItemMapping,
} from '../kitchen/types';
import {
  buildBanquetProductionPlans,
  buildConsolidatedBanquetRequirements,
} from '../kitchen/banquet/productionFlow';
import { GRNDialog } from './GRNDialog';

type PurchaseOrderStatusFilter = 'all' | 'draft' | 'approved' | 'partially-received' | 'received' | 'closed' | 'cancelled';
type VendorFilter = 'all' | string;
type PlanningMode = 'shortage' | 'production' | 'reorder';

interface PurchasePlanningRow {
  id: string;
  purchaseItemId: string;
  itemName: string;
  requiredQuantity: number;
  currentStock: number;
  shortageQuantity: number;
  reorderLevel: number;
  parLevel: number;
  baseUnit: string;
  purchaseUnit: string;
  preferredVendorId: string;
  selectedVendorId: string;
  lastPurchaseRate: number;
  suggestedQuantity: number;
  include: boolean;
  source: PlanningMode;
  sourceDetail: string;
}

interface FastDailyPORow {
  id: string;
  purchaseItemId: string;
  quantity: number;
  recommendedVendorId: string;
  selectedVendorId: string;
  lastRate: number;
  ratePerUnit: number;
  notes: string;
  recommendationReason: string;
  leadTimeDays?: number;
  moq?: number;
}

interface VendorSuggestion {
  recommended_vendor?: Vendor;
  alternate_vendors: Vendor[];
  last_purchase_rate: number;
  average_rate: number;
  lead_time?: number;
  moq?: number;
  reason_for_recommendation: string;
}

interface PurchaseHistoryStats {
  lastVendorId: string;
  lastPurchaseRate: number;
  lastPurchaseDate?: Date;
  lastPurchaseQuantity: number;
  averageRate: number;
}

interface ConsumptionStats {
  average7Day: number;
  average30Day: number;
  lastIssuedQuantity: number;
  lastIssuedDate?: Date;
}

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-3 py-2 text-sm text-slate-700 align-middle';

const compactCurrency = (value: number) =>
  formatCurrencyPKR(value, { compact: true, minimumFractionDigits: 1, maximumFractionDigits: 1 });

const formatTerms = (value: string) => value.replace(/-/g, ' ');
const getDefaultPurchaseCost = (purchaseItem: PurchaseItem) =>
  purchaseItem.defaultPurchaseCost ?? purchaseItem.lastPurchaseRate ?? 0;
const getBaseUnit = (purchaseItem: PurchaseItem) => purchaseItem.baseUnitId || purchaseItem.issueUnit;
const getPurchaseUnit = (purchaseItem: PurchaseItem) => purchaseItem.purchaseUnitId || purchaseItem.purchaseUnit;
const getPurchaseItemName = (purchaseItem: PurchaseItem) => String(purchaseItem.itemName || '').trim();
const getFastSearchLabel = (purchaseItem: PurchaseItem) =>
  purchaseItem.itemCode ? `${getPurchaseItemName(purchaseItem)} (${purchaseItem.itemCode})` : getPurchaseItemName(purchaseItem);
const isActivePurchaseItem = (purchaseItem: PurchaseItem) => (purchaseItem.status || 'active') === 'active';
const normalizeFastSearchText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const roundQuantity = (value: number) => Math.round(value * 1000) / 1000;
const toDateInputValue = (value: Date | string) => new Date(value).toISOString().split('T')[0];
const formatCompactDate = (value?: Date | string) => (value ? formatDatePK(value) : '-');

const planningModeLabels: Record<PlanningMode, string> = {
  shortage: 'Generate from Shortage',
  production: 'Generate from F&B Production Plan',
  reorder: 'Generate from Par Level / Reorder',
};

interface PurchaseOrdersProps {
  userName: string;
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  purchaseItems: PurchaseItem[];
  procurementLookups: ProcurementLookupState;
  stores: StoreMaster[];
  goodsReceipts: GoodsReceipt[];
  storeStocks: StoreStock[];
  vendorBills: VendorBill[];
  vendorItemMappings: VendorItemMapping[];
  bookings?: Booking[];
  dishes?: Dish[];
  recipes?: Recipe[];
  menuPackages?: MenuPackage[];
  kitchenIssueSheets?: KitchenIssueSheet[];
  units?: UnitMaster[];
  onVendorsChange: (vendors: Vendor[]) => void;
  onProcurementLookupsChange: (lookups: ProcurementLookupState) => void;
  onPurchaseOrdersChange: (orders: PurchaseOrder[]) => void;
  onPurchaseItemsChange: (items: PurchaseItem[]) => void;
  onVendorItemMappingsChange: (mappings: VendorItemMapping[]) => void;
  onGoodsReceiptsChange: (grns: GoodsReceipt[]) => void;
  onStoreStocksChange: (stocks: StoreStock[]) => void;
  onVendorBillsChange: (bills: VendorBill[]) => void;
}

interface PurchaseOrderRow extends PurchaseOrder {
  orderedQuantity: number;
  receivedQuantity: number;
  closedQuantity: number;
  completedQuantity: number;
  pendingQuantity: number;
  receiptPercentage: number;
  grnCount: number;
  overdueDays: number;
  daysToDelivery: number;
}

const getStatusBadge = (status: string) => {
  const statusStyles: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    received: 'bg-emerald-100 text-emerald-700',
    'partially-received': 'bg-amber-100 text-amber-700',
    closed: 'bg-slate-200 text-slate-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${statusStyles[status] || 'bg-slate-100 text-slate-700'}`}
    >
      {status.replace(/-/g, ' ')}
    </span>
  );
};

const isPostReceiptOrderStatus = (status: PurchaseOrder['status']) =>
  status === 'received' || status === 'partially-received' || status === 'closed';

const getClosedQuantity = (item: POItem) => item.closedQuantity ?? 0;
const getReceivedQuantity = (purchaseOrder: PurchaseOrder, item: POItem) =>
  item.receivedQuantity ?? purchaseOrder.receivedQuantities?.[item.purchaseItemId] ?? 0;
const hasPostedLineActivity = (item: POItem) =>
  (item.receivedQuantity ?? 0) > 0 || getClosedQuantity(item) > 0;
const getCommittedQuantity = (item: POItem) => Math.max(item.quantity - getClosedQuantity(item), 0);
const getPendingQuantity = (purchaseOrder: PurchaseOrder, item: POItem) =>
  Math.max(item.quantity - getReceivedQuantity(purchaseOrder, item) - getClosedQuantity(item), 0);
const getLineAmount = (item: POItem) => getCommittedQuantity(item) * item.ratePerUnit;

const recalculateVendorBillStatus = (amountPaid: number, amountPending: number): VendorBill['status'] =>
  amountPending === 0 ? 'paid' : amountPaid > 0 ? 'partially-paid' : 'pending';

const recalculatePurchaseOrder = (purchaseOrder: PurchaseOrder, overrides?: Partial<PurchaseOrder>): PurchaseOrder => {
  const nextOrder = {
    ...purchaseOrder,
    ...overrides,
  };
  const nextItems = (overrides?.items || purchaseOrder.items).map((item) => {
    const amount = getLineAmount(item);
    const pendingQuantity = getPendingQuantity(nextOrder, item);

    return {
      ...item,
      amount,
      pendingQuantity,
    };
  });
  const subtotal = nextItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = overrides?.taxAmount ?? nextOrder.taxAmount ?? 0;
  const totalAmount = subtotal + taxAmount;
  const amountPaid = overrides?.amountPaid ?? nextOrder.amountPaid ?? 0;

  return {
    ...nextOrder,
    items: nextItems,
    subtotal,
    taxAmount,
    totalAmount,
    amountPaid,
    amountPending: Math.max(totalAmount - amountPaid, 0),
  };
};

const derivePostReceiptStatus = (purchaseOrder: PurchaseOrder): PurchaseOrder['status'] => {
  const allPhysicallyReceived = purchaseOrder.items.every(
    (item) => getReceivedQuantity(purchaseOrder, item) >= item.quantity,
  );
  if (allPhysicallyReceived) {
    return 'received';
  }

  const allResolved = purchaseOrder.items.every((item) => getPendingQuantity(purchaseOrder, item) <= 0);
  if (allResolved) {
    return 'closed';
  }

  const hasPostedActivity = purchaseOrder.items.some(
    (item) => getReceivedQuantity(purchaseOrder, item) > 0 || getClosedQuantity(item) > 0,
  );
  return hasPostedActivity ? 'partially-received' : 'approved';
};

const getActionMeta = (purchaseOrder: PurchaseOrderRow) => {
  if (purchaseOrder.status === 'draft') {
    return {
      label: 'Approve',
      detail: 'Waiting for approval',
      className: 'text-amber-700',
    };
  }

  if (purchaseOrder.status === 'approved' && purchaseOrder.overdueDays > 0) {
    return {
      label: 'Expedite',
      detail: `${purchaseOrder.overdueDays}d overdue`,
      className: 'text-red-700',
    };
  }

  if (purchaseOrder.status === 'partially-received') {
    return {
      label: 'Complete GRN',
      detail: `${purchaseOrder.pendingQuantity} units pending`,
      className: 'text-blue-700',
    };
  }

  if (purchaseOrder.status === 'approved') {
    return {
      label: 'Await Receipt',
      detail: purchaseOrder.daysToDelivery < 0 ? 'Receipt overdue' : 'Delivery in flight',
      className: 'text-slate-700',
    };
  }

  if (purchaseOrder.status === 'received') {
    return {
      label: 'Closed',
      detail: 'Fully received',
      className: 'text-emerald-700',
    };
  }

  if (purchaseOrder.status === 'closed') {
    return {
      label: 'Closed',
      detail: 'Short delivery closed',
      className: 'text-slate-700',
    };
  }

  return {
    label: 'Cancelled',
    detail: 'No further action',
    className: 'text-slate-500',
  };
};

const getEtaLabel = (purchaseOrder: PurchaseOrderRow) => {
  if (purchaseOrder.status === 'received') {
    return {
      label: 'Completed',
      className: 'text-emerald-700',
    };
  }

  if (purchaseOrder.status === 'closed') {
    return {
      label: 'Closed',
      className: 'text-slate-700',
    };
  }

  if (purchaseOrder.status === 'cancelled') {
    return {
      label: 'Stopped',
      className: 'text-slate-500',
    };
  }

  if (purchaseOrder.overdueDays > 0) {
    return {
      label: `${purchaseOrder.overdueDays}d overdue`,
      className: 'text-red-700',
    };
  }

  if (purchaseOrder.daysToDelivery === 0) {
    return {
      label: 'Due today',
      className: 'text-amber-700',
    };
  }

  return {
    label: `Due in ${purchaseOrder.daysToDelivery}d`,
    className: 'text-slate-500',
  };
};

export function PurchaseOrders({
  userName,
  purchaseOrders,
  vendors,
  purchaseItems,
  procurementLookups,
  stores,
  goodsReceipts,
  storeStocks,
  vendorBills,
  vendorItemMappings,
  bookings = [],
  dishes = [],
  recipes = [],
  menuPackages = [],
  kitchenIssueSheets = [],
  units = [],
  onVendorsChange,
  onProcurementLookupsChange,
  onPurchaseOrdersChange,
  onPurchaseItemsChange,
  onGoodsReceiptsChange,
  onStoreStocksChange,
  onVendorBillsChange,
}: PurchaseOrdersProps) {
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatusFilter>('all');
  const [vendorFilter, setVendorFilter] = useState<VendorFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
  const [grnDialogOpen, setGrnDialogOpen] = useState(false);
  const [selectedPOForGRN, setSelectedPOForGRN] = useState<PurchaseOrder | null>(null);
  const [planningOpen, setPlanningOpen] = useState(false);
  const [planningMode, setPlanningMode] = useState<PlanningMode>('shortage');
  const [planningDate, setPlanningDate] = useState(new Date().toISOString().split('T')[0]);
  const [planningRows, setPlanningRows] = useState<PurchasePlanningRow[]>([]);
  const [generatedDraftPOs, setGeneratedDraftPOs] = useState<PurchaseOrder[]>([]);
  const [editingDraftPO, setEditingDraftPO] = useState<PurchaseOrder | null>(null);
  const [fastPOOpen, setFastPOOpen] = useState(false);
  const [fastOrderDate, setFastOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [fastExpectedDeliveryDate, setFastExpectedDeliveryDate] = useState('');
  const [fastCategoryFilter, setFastCategoryFilter] = useState('all');
  const [fastItemSearch, setFastItemSearch] = useState('');
  const [fastSelectedItemId, setFastSelectedItemId] = useState('');
  const [fastRemarks, setFastRemarks] = useState('');
  const [fastRows, setFastRows] = useState<FastDailyPORow[]>([]);
  const [fastGeneratedDraftPOs, setFastGeneratedDraftPOs] = useState<PurchaseOrder[]>([]);

  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [poItems, setPoItems] = useState<POItem[]>([]);
  const [poTaxAmount, setPoTaxAmount] = useState(0);
  const [remarks, setRemarks] = useState('');

  const activeVendors = useMemo(
    () => vendors.filter((vendor) => vendor.status === 'active').sort((left, right) => left.vendorName.localeCompare(right.vendorName)),
    [vendors],
  );
  const purchaseCategoryOptions = useMemo(
    () =>
      procurementLookups.purchaseCategories
        .filter((category) => category.status !== 'inactive')
        .map((category) => ({ value: category.id, label: category.name })),
    [procurementLookups.purchaseCategories],
  );
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const stockTotalsByItem = useMemo(() => {
    const totals = new Map<string, number>();
    storeStocks.forEach((stock) => {
      totals.set(stock.purchaseItemId, (totals.get(stock.purchaseItemId) || 0) + stock.currentStock);
    });
    return totals;
  }, [storeStocks]);

  const purchaseItemById = useMemo(() => {
    const map = new Map<string, PurchaseItem>();
    purchaseItems.forEach((item) => map.set(item.id, item));
    return map;
  }, [purchaseItems]);

  const vendorById = useMemo(() => {
    const map = new Map<string, Vendor>();
    vendors.forEach((vendor) => map.set(vendor.id, vendor));
    return map;
  }, [vendors]);

  const purchaseStatsByItem = useMemo(() => {
    const linesByItem = new Map<
      string,
      { vendorId: string; orderDate: Date; ratePerUnit: number; quantity: number }[]
    >();

    purchaseOrders.forEach((purchaseOrder) => {
      purchaseOrder.items.forEach((item) => {
        const lines = linesByItem.get(item.purchaseItemId) || [];
        lines.push({
          vendorId: purchaseOrder.vendorId,
          orderDate: new Date(purchaseOrder.orderDate),
          ratePerUnit: item.ratePerUnit,
          quantity: item.quantity,
        });
        linesByItem.set(item.purchaseItemId, lines);
      });
    });

    const stats = new Map<string, PurchaseHistoryStats>();

    linesByItem.forEach((lines, purchaseItemId) => {
      lines.sort((left, right) => right.orderDate.getTime() - left.orderDate.getTime());
      const rateLines = lines.filter((line) => Number.isFinite(line.ratePerUnit) && line.ratePerUnit > 0);

      stats.set(purchaseItemId, {
        lastVendorId: lines[0]?.vendorId || '',
        lastPurchaseRate: rateLines[0]?.ratePerUnit || 0,
        lastPurchaseDate: lines[0]?.orderDate,
        lastPurchaseQuantity: lines[0]?.quantity || 0,
        averageRate: rateLines.length
          ? rateLines.reduce((sum, line) => sum + line.ratePerUnit, 0) / rateLines.length
          : 0,
      });
    });

    return stats;
  }, [purchaseOrders]);

  const consumptionStatsByItem = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const start7Day = new Date(today);
    start7Day.setHours(0, 0, 0, 0);
    start7Day.setDate(start7Day.getDate() - 6);

    const start30Day = new Date(today);
    start30Day.setHours(0, 0, 0, 0);
    start30Day.setDate(start30Day.getDate() - 29);

    const working = new Map<
      string,
      { total7Day: number; total30Day: number; lastIssuedQuantity: number; lastIssuedDate?: Date }
    >();

    kitchenIssueSheets
      .filter((sheet) => sheet.status === 'issued' || sheet.status === 'partial')
      .sort((left, right) => new Date(right.eventDate).getTime() - new Date(left.eventDate).getTime())
      .forEach((sheet) => {
        const eventDate = new Date(sheet.eventDate);
        const within7Day = eventDate >= start7Day;
        const within30Day = eventDate >= start30Day;

        sheet.lineItems.forEach((lineItem) => {
          const existing = working.get(lineItem.purchaseItemId) || {
            total7Day: 0,
            total30Day: 0,
            lastIssuedQuantity: 0,
          };
          const issuedQuantity = Number(lineItem.issuedQuantity) || 0;

          if (within7Day) {
            existing.total7Day += issuedQuantity;
          }
          if (within30Day) {
            existing.total30Day += issuedQuantity;
          }
          if (!existing.lastIssuedDate || eventDate.getTime() > existing.lastIssuedDate.getTime()) {
            existing.lastIssuedDate = eventDate;
            existing.lastIssuedQuantity = issuedQuantity;
          }

          working.set(lineItem.purchaseItemId, existing);
        });
      });

    const stats = new Map<string, ConsumptionStats>();

    working.forEach((value, purchaseItemId) => {
      stats.set(purchaseItemId, {
        average7Day: roundQuantity(value.total7Day / 7),
        average30Day: roundQuantity(value.total30Day / 30),
        lastIssuedQuantity: roundQuantity(value.lastIssuedQuantity),
        lastIssuedDate: value.lastIssuedDate,
      });
    });

    return stats;
  }, [kitchenIssueSheets]);

  const purchaseOrderRows = useMemo<PurchaseOrderRow[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return [...purchaseOrders]
      .map((purchaseOrder) => {
        const orderedQuantity = purchaseOrder.items.reduce((sum, item) => sum + item.quantity, 0);
        const receivedQuantity = purchaseOrder.items.reduce(
          (sum, item) => sum + getReceivedQuantity(purchaseOrder, item),
          0,
        );
        const closedQuantity = purchaseOrder.items.reduce(
          (sum, item) => sum + getClosedQuantity(item),
          0,
        );
        const completedQuantity = receivedQuantity + closedQuantity;
        const expectedDate = new Date(purchaseOrder.expectedDeliveryDate);
        expectedDate.setHours(0, 0, 0, 0);
        const diffMs = expectedDate.getTime() - today.getTime();
        const daysToDelivery = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const overdueDays =
          purchaseOrder.status === 'received' || purchaseOrder.status === 'closed' || purchaseOrder.status === 'cancelled' || daysToDelivery >= 0
            ? 0
            : Math.abs(daysToDelivery);
        const relatedGrns = goodsReceipts.filter((grn) => grn.purchaseOrderId === purchaseOrder.id);

        return {
          ...purchaseOrder,
          orderedQuantity,
          receivedQuantity,
          closedQuantity,
          completedQuantity,
          pendingQuantity: Math.max(orderedQuantity - completedQuantity, 0),
          receiptPercentage: orderedQuantity > 0 ? Math.round((completedQuantity / orderedQuantity) * 100) : 0,
          grnCount: relatedGrns.length,
          overdueDays,
          daysToDelivery,
        };
      })
      .filter((purchaseOrder) => {
        const matchesStatus = statusFilter === 'all' || purchaseOrder.status === statusFilter;
        const matchesVendor = vendorFilter === 'all' || purchaseOrder.vendorId === vendorFilter;
        const matchesSearch =
          !normalizedSearch ||
          purchaseOrder.poNumber.toLowerCase().includes(normalizedSearch) ||
          purchaseOrder.vendorName.toLowerCase().includes(normalizedSearch) ||
          purchaseOrder.items.some((item) => item.itemName.toLowerCase().includes(normalizedSearch)) ||
          formatTerms(purchaseOrder.paymentTerms).toLowerCase().includes(normalizedSearch);

        return matchesStatus && matchesVendor && matchesSearch;
      })
      .sort((left, right) => new Date(right.orderDate).getTime() - new Date(left.orderDate).getTime());
  }, [goodsReceipts, normalizedSearch, purchaseOrders, statusFilter, vendorFilter]);

  const metrics = useMemo(() => {
    const openOrders = purchaseOrderRows.filter(
      (purchaseOrder) =>
        purchaseOrder.status === 'draft' ||
        purchaseOrder.status === 'approved' ||
        purchaseOrder.status === 'partially-received',
    );
    const overdueOrders = openOrders.filter((purchaseOrder) => purchaseOrder.overdueDays > 0);
    const inReceiving = purchaseOrderRows.filter((purchaseOrder) => purchaseOrder.status === 'partially-received');

    return {
      total: purchaseOrderRows.length,
      open: openOrders.length,
      draft: purchaseOrderRows.filter((purchaseOrder) => purchaseOrder.status === 'draft').length,
      approved: purchaseOrderRows.filter((purchaseOrder) => purchaseOrder.status === 'approved').length,
      receiving: inReceiving.length,
      overdue: overdueOrders.length,
      value: purchaseOrderRows
        .filter((purchaseOrder) => purchaseOrder.status !== 'cancelled')
        .reduce((sum, purchaseOrder) => sum + purchaseOrder.totalAmount, 0),
      pendingValue: openOrders.reduce((sum, purchaseOrder) => sum + purchaseOrder.amountPending, 0),
    };
  }, [purchaseOrderRows]);

  const actionQueue = useMemo(
    () =>
      purchaseOrderRows
        .filter(
          (purchaseOrder) =>
            purchaseOrder.status === 'draft' ||
            purchaseOrder.status === 'approved' ||
            purchaseOrder.status === 'partially-received',
        )
        .sort((left, right) => {
          const leftPriority = left.status === 'draft' ? 1 : left.overdueDays > 0 ? 2 : left.status === 'partially-received' ? 3 : 4;
          const rightPriority = right.status === 'draft' ? 1 : right.overdueDays > 0 ? 2 : right.status === 'partially-received' ? 3 : 4;

          if (leftPriority !== rightPriority) {
            return leftPriority - rightPriority;
          }

          return new Date(left.expectedDeliveryDate).getTime() - new Date(right.expectedDeliveryDate).getTime();
        })
        .slice(0, 8),
    [purchaseOrderRows],
  );

  const vendorExposure = useMemo(
    () =>
      vendors
        .map((vendor) => {
          const vendorOrders = purchaseOrderRows.filter(
            (purchaseOrder) =>
              purchaseOrder.vendorId === vendor.id &&
              purchaseOrder.status !== 'cancelled' &&
              purchaseOrder.status !== 'received' &&
              purchaseOrder.status !== 'closed',
          );

          return {
            id: vendor.id,
            vendorName: vendor.vendorName,
            openOrders: vendorOrders.length,
            overdueOrders: vendorOrders.filter((purchaseOrder) => purchaseOrder.overdueDays > 0).length,
            openValue: vendorOrders.reduce((sum, purchaseOrder) => sum + purchaseOrder.totalAmount, 0),
            balance: vendor.currentBalance,
          };
        })
        .filter((vendor) => vendor.openOrders > 0 || vendor.balance > 0)
        .sort((left, right) => {
          if (left.overdueOrders !== right.overdueOrders) {
            return right.overdueOrders - left.overdueOrders;
          }
          return right.openValue - left.openValue;
        })
        .slice(0, 8),
    [purchaseOrderRows, vendors],
  );

  const draftTotals = useMemo(() => {
    const subtotal = poItems.reduce((sum, item) => sum + item.amount, 0);
    const totalAmount = subtotal + poTaxAmount;

    return { subtotal, taxAmount: poTaxAmount, totalAmount };
  }, [poItems, poTaxAmount]);

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === selectedVendorId) || null,
    [selectedVendorId, vendors],
  );
  const isEditingApprovedPO = editingDraftPO?.status === 'approved';
  const isEditingPostReceiptPO = editingDraftPO ? isPostReceiptOrderStatus(editingDraftPO.status) : false;
  const isEditingAmendmentPO = isEditingApprovedPO || isEditingPostReceiptPO;

  const vendorFormOptions = useMemo(() => {
    if (!selectedVendor || activeVendors.some((vendor) => vendor.id === selectedVendor.id)) {
      return activeVendors;
    }
    return [selectedVendor, ...activeVendors];
  }, [activeVendors, selectedVendor]);

  const viewingOrderRow = useMemo(
    () => (viewingPO ? purchaseOrderRows.find((purchaseOrder) => purchaseOrder.id === viewingPO.id) || null : null),
    [purchaseOrderRows, viewingPO],
  );

  const viewingOrderGrns = useMemo(
    () =>
      viewingPO
        ? goodsReceipts
            .filter((grn) => grn.purchaseOrderId === viewingPO.id)
            .sort((left, right) => new Date(right.receiptDate).getTime() - new Date(left.receiptDate).getTime())
        : [],
    [goodsReceipts, viewingPO],
  );

  const generatePONumber = (sequenceOffset = 0) => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const count = purchaseOrders.length + 1 + sequenceOffset;
    return `PO-${dateStr}-${count.toString().padStart(3, '0')}`;
  };

  const getItemPurchaseCategoryId = (purchaseItem: PurchaseItem) => getCanonicalItemCategoryId(purchaseItem);

  const vendorSupportsItem = (vendor: Vendor, purchaseItem: PurchaseItem) => {
    return getVendorSupportMatch(vendor, purchaseItem, procurementLookups);
  };

  const getItemPurchaseStats = (purchaseItemId: string): PurchaseHistoryStats => ({
    lastVendorId: '',
    lastPurchaseRate: 0,
    lastPurchaseDate: undefined,
    lastPurchaseQuantity: 0,
    averageRate: 0,
    ...purchaseStatsByItem.get(purchaseItemId),
  });

  const getItemConsumptionStats = (purchaseItemId: string): ConsumptionStats => ({
    average7Day: 0,
    average30Day: 0,
    lastIssuedQuantity: 0,
    lastIssuedDate: undefined,
    ...consumptionStatsByItem.get(purchaseItemId),
  });

  const getSuggestedFastQuantity = (
    purchaseItem: PurchaseItem,
    options?: { leadTimeDays?: number; moq?: number },
  ) => {
    const currentStock = stockTotalsByItem.get(purchaseItem.id) ?? 0;
    const consumptionStats = getItemConsumptionStats(purchaseItem.id);
    const purchaseStats = getItemPurchaseStats(purchaseItem.id);
    const conversionFactor = purchaseItem.conversionFactor > 0 ? purchaseItem.conversionFactor : 1;
    const averageDailyConsumption = Math.max(consumptionStats.average7Day, consumptionStats.average30Day);
    const leadTimeDays = Math.max(options?.leadTimeDays || purchaseItem.leadTimeDays || 1, 1);
    const stockFloor = Math.max(purchaseItem.reorderLevel || 0, purchaseItem.minimumStockLevel || 0);
    const leadTimeDemand = averageDailyConsumption * leadTimeDays;
    const targetBaseStock = Math.max(stockFloor, leadTimeDemand);
    const requiredBaseQuantity = Math.max(targetBaseStock - currentStock, 0);
    const minimumOrderQuantity = options?.moq || purchaseItem.minimumOrderQuantity || 0;
    const suggestedPurchaseQuantity = requiredBaseQuantity > 0 ? requiredBaseQuantity / conversionFactor : 0;

    return {
      currentStock: roundQuantity(currentStock),
      average7Day: consumptionStats.average7Day,
      average30Day: consumptionStats.average30Day,
      lastIssuedQuantity: consumptionStats.lastIssuedQuantity,
      lastIssuedDate: consumptionStats.lastIssuedDate,
      lastPurchaseQuantity: purchaseStats.lastPurchaseQuantity,
      lastPurchaseDate: purchaseStats.lastPurchaseDate,
      lastPurchaseRate: purchaseStats.lastPurchaseRate,
      targetBaseStock: roundQuantity(targetBaseStock),
      leadTimeDemand: roundQuantity(leadTimeDemand),
      suggestedPurchaseQuantity: roundQuantity(
        suggestedPurchaseQuantity > 0 ? Math.max(suggestedPurchaseQuantity, minimumOrderQuantity) : 0,
      ),
    };
  };

  const getVendorSuggestionForItem = (purchaseItem: PurchaseItem): VendorSuggestion => {
    const activeVendorIds = new Set(activeVendors.map((vendor) => vendor.id));
    const mappingsForItem = vendorItemMappings.filter(
      (mapping) => mapping.kitchenItemId === purchaseItem.id && mapping.status !== 'inactive',
    );
    const preferredMapping = mappingsForItem.find((mapping) => mapping.isPreferred && activeVendorIds.has(mapping.vendorId));
    const approvedMappings = mappingsForItem.filter((mapping) => activeVendorIds.has(mapping.vendorId));
    const scopedVendorMatches = activeVendors
      .map((vendor) => ({
        vendor,
        match: vendorSupportsItem(vendor, purchaseItem),
      }))
      .filter((entry) => entry.match.matched);
    const subCategoryMatchedVendors = scopedVendorMatches
      .filter((entry) => entry.match.matchType === 'category_subcategory')
      .map((entry) => entry.vendor);
    const categoryMatchedVendors = scopedVendorMatches
      .filter((entry) => entry.match.matchType === 'category_all')
      .map((entry) => entry.vendor);
    const purchaseStats = getItemPurchaseStats(purchaseItem.id);
    const lastPurchaseVendor = activeVendors.find((vendor) => vendor.id === purchaseStats.lastVendorId);
    let recommendedVendor: Vendor | undefined;
    let recommendedMapping: VendorItemMapping | undefined;
    let reasonForRecommendation = 'No supplier intelligence available';

    if (purchaseItem.preferredSupplierId && activeVendorIds.has(purchaseItem.preferredSupplierId)) {
      recommendedVendor = vendorById.get(purchaseItem.preferredSupplierId);
      recommendedMapping = mappingsForItem.find((mapping) => mapping.vendorId === purchaseItem.preferredSupplierId);
      reasonForRecommendation = 'Preferred vendor from kitchen item';
    } else if (preferredMapping) {
      recommendedVendor = vendorById.get(preferredMapping.vendorId);
      recommendedMapping = preferredMapping;
      reasonForRecommendation = 'Preferred vendor from approved vendor mapping';
    } else if (approvedMappings.length > 0) {
      recommendedMapping = approvedMappings[0];
      recommendedVendor = vendorById.get(recommendedMapping.vendorId);
      reasonForRecommendation = 'Approved vendor for this item';
    } else if (subCategoryMatchedVendors.length > 0) {
      recommendedVendor = subCategoryMatchedVendors[0];
      reasonForRecommendation = 'Vendor supports this category and sub category';
    } else if (categoryMatchedVendors.length > 0) {
      recommendedVendor = categoryMatchedVendors[0];
      reasonForRecommendation = 'Vendor supports this category';
    } else if (lastPurchaseVendor) {
      recommendedVendor = lastPurchaseVendor;
      reasonForRecommendation = 'Last purchase vendor';
    }

    const alternateVendorMap = new Map<string, Vendor>();
    [
      ...approvedMappings.map((mapping) => vendorById.get(mapping.vendorId)),
      ...subCategoryMatchedVendors,
      ...categoryMatchedVendors,
      lastPurchaseVendor,
    ]
      .filter((vendor): vendor is Vendor => Boolean(vendor))
      .forEach((vendor) => {
        if (vendor.id !== recommendedVendor?.id) {
          alternateVendorMap.set(vendor.id, vendor);
        }
      });

    const lastPurchaseRate =
      recommendedMapping?.lastRate || purchaseStats.lastPurchaseRate || purchaseItem.lastPurchaseRate || getDefaultPurchaseCost(purchaseItem);
    const averageRate = purchaseStats.averageRate || purchaseItem.averageCost || lastPurchaseRate;

    return {
      recommended_vendor: recommendedVendor,
      alternate_vendors: Array.from(alternateVendorMap.values()),
      last_purchase_rate: lastPurchaseRate,
      average_rate: averageRate,
      lead_time: recommendedMapping?.leadTimeDays || purchaseItem.leadTimeDays || recommendedVendor?.defaultLeadTimeDays,
      moq: recommendedMapping?.moq || purchaseItem.minimumOrderQuantity,
      reason_for_recommendation: reasonForRecommendation,
    };
  };

  const buildFastRow = (purchaseItem: PurchaseItem): FastDailyPORow => {
    const suggestion = getVendorSuggestionForItem(purchaseItem);
    const currentRate = suggestion.last_purchase_rate || getDefaultPurchaseCost(purchaseItem);
    const suggestedQuantity = getSuggestedFastQuantity(purchaseItem, {
      leadTimeDays: suggestion.lead_time,
      moq: suggestion.moq,
    }).suggestedPurchaseQuantity;

    return {
      id: `fast-row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      purchaseItemId: purchaseItem.id,
      quantity: suggestedQuantity || suggestion.moq || purchaseItem.minimumOrderQuantity || 0,
      recommendedVendorId: suggestion.recommended_vendor?.id || '',
      selectedVendorId: suggestion.recommended_vendor?.id || '',
      lastRate: suggestion.last_purchase_rate,
      ratePerUnit: currentRate,
      notes: '',
      recommendationReason: suggestion.reason_for_recommendation,
      leadTimeDays: suggestion.lead_time,
      moq: suggestion.moq,
    };
  };

  const fastFilteredItems = useMemo(() => {
    const normalizedItemSearch = normalizeFastSearchText(fastItemSearch);
    const searchTerms = normalizedItemSearch ? normalizedItemSearch.split(/\s+/).filter(Boolean) : [];

    return purchaseItems
      .filter((item) => {
        const purchaseCategoryId = getItemPurchaseCategoryId(item);
        const matchesCategory = fastCategoryFilter === 'all' || purchaseCategoryId === fastCategoryFilter;
        const itemName = getPurchaseItemName(item);
        const categoryName = purchaseCategoryId
          ? getLookupName(procurementLookups.purchaseCategories, purchaseCategoryId)
          : '';
        const searchFields = [
          itemName,
          item.itemCode || '',
          getFastSearchLabel(item),
          categoryName,
        ].map(normalizeFastSearchText);
        const matchesSearch =
          !normalizedItemSearch ||
          searchFields.some((field) => field.includes(normalizedItemSearch)) ||
          searchTerms.every((term) => searchFields.some((field) => field.includes(term)));
        return isActivePurchaseItem(item) && Boolean(itemName.trim()) && matchesCategory && matchesSearch;
      })
      .sort((left, right) => getPurchaseItemName(left).localeCompare(getPurchaseItemName(right)));
  }, [fastCategoryFilter, fastItemSearch, procurementLookups.purchaseCategories, purchaseItems]);

  const selectedFastSearchItem = useMemo(() => {
    if (fastFilteredItems.length === 0 || !fastSelectedItemId) {
      return undefined;
    }

    return fastFilteredItems.find((item) => item.id === fastSelectedItemId);
  }, [fastFilteredItems, fastSelectedItemId]);

  const createPlanningRow = ({
    purchaseItem,
    requiredQuantity,
    currentStock,
    shortageQuantity,
    source,
    sourceDetail,
  }: {
    purchaseItem: PurchaseItem;
    requiredQuantity: number;
    currentStock: number;
    shortageQuantity: number;
    source: PlanningMode;
    sourceDetail: string;
  }): PurchasePlanningRow => {
    const conversionFactor = purchaseItem.conversionFactor > 0 ? purchaseItem.conversionFactor : 1;
    const purchaseQuantity = shortageQuantity > 0 ? shortageQuantity / conversionFactor : 0;
    const minimumOrderQuantity = purchaseItem.minimumOrderQuantity || 0;

    return {
      id: `${source}-${purchaseItem.id}`,
      purchaseItemId: purchaseItem.id,
      itemName: purchaseItem.itemName,
      requiredQuantity: roundQuantity(requiredQuantity),
      currentStock: roundQuantity(currentStock),
      shortageQuantity: roundQuantity(shortageQuantity),
      reorderLevel: purchaseItem.reorderLevel || 0,
      parLevel: purchaseItem.maximumStockLevel || purchaseItem.reorderLevel || purchaseItem.minimumStockLevel || 0,
      baseUnit: getBaseUnit(purchaseItem),
      purchaseUnit: getPurchaseUnit(purchaseItem),
      preferredVendorId: purchaseItem.preferredSupplierId || '',
      selectedVendorId: purchaseItem.preferredSupplierId || '',
      lastPurchaseRate: getDefaultPurchaseCost(purchaseItem),
      suggestedQuantity: roundQuantity(Math.max(purchaseQuantity, minimumOrderQuantity)),
      include: true,
      source,
      sourceDetail,
    };
  };

  const buildShortagePlanningRows = () =>
    purchaseItems
      .filter((item) => isActivePurchaseItem(item) && item.trackInventory !== false)
      .map((purchaseItem) => {
        const currentStock = stockTotalsByItem.get(purchaseItem.id) ?? 0;
        const minimumTarget = Math.max(purchaseItem.minimumStockLevel || 0, purchaseItem.reorderLevel || 0);
        const fallbackTarget = (purchaseItem.minimumOrderQuantity || 1) * (purchaseItem.conversionFactor || 1);
        const targetQuantity = minimumTarget > 0 ? minimumTarget : currentStock <= 0 ? fallbackTarget : 0;

        if (targetQuantity <= 0 || currentStock >= targetQuantity) {
          return null;
        }

        return createPlanningRow({
          purchaseItem,
          requiredQuantity: targetQuantity,
          currentStock,
          shortageQuantity: Math.max(targetQuantity - currentStock, 0),
          source: 'shortage',
          sourceDetail: currentStock <= 0 ? 'Out of stock' : 'Below minimum/reorder',
        });
      })
      .filter((row): row is PurchasePlanningRow => Boolean(row))
      .sort((left, right) => left.itemName.localeCompare(right.itemName));

  const buildReorderPlanningRows = () =>
    purchaseItems
      .filter((item) => isActivePurchaseItem(item) && item.trackInventory !== false)
      .map((purchaseItem) => {
        const currentStock = stockTotalsByItem.get(purchaseItem.id) ?? 0;
        const targetQuantity = Math.max(
          purchaseItem.maximumStockLevel || 0,
          purchaseItem.reorderLevel || 0,
          purchaseItem.minimumStockLevel || 0,
        );

        if (targetQuantity <= 0 || currentStock >= targetQuantity) {
          return null;
        }

        return createPlanningRow({
          purchaseItem,
          requiredQuantity: targetQuantity,
          currentStock,
          shortageQuantity: Math.max(targetQuantity - currentStock, 0),
          source: 'reorder',
          sourceDetail: purchaseItem.maximumStockLevel ? 'Below par level' : 'Below reorder level',
        });
      })
      .filter((row): row is PurchasePlanningRow => Boolean(row))
      .sort((left, right) => left.itemName.localeCompare(right.itemName));

  const buildProductionPlanningRows = (dateValue: string) => {
    const selectedDate = new Date(`${dateValue}T00:00:00`);
    const productionPlans = buildBanquetProductionPlans({
      bookings,
      selectedDate,
      dishes,
      recipes,
      menuPackages,
      purchaseItems,
      storeStocks,
      issueSheets: kitchenIssueSheets,
      units,
    });
    const consolidatedRequirements = buildConsolidatedBanquetRequirements(productionPlans, storeStocks);
    const requirementsByItem = new Map<
      string,
      {
        requiredQuantity: number;
        shortageQuantity: number;
        eventNames: string[];
        linkedDishes: string[];
      }
    >();

    consolidatedRequirements.forEach((requirement) => {
      if (requirement.shortageQuantity <= 0) {
        return;
      }

      const existing = requirementsByItem.get(requirement.purchaseItemId) || {
        requiredQuantity: 0,
        shortageQuantity: 0,
        eventNames: [],
        linkedDishes: [],
      };

      existing.requiredQuantity += requirement.remainingRequiredQuantity;
      existing.shortageQuantity += requirement.shortageQuantity;
      requirement.eventNames.forEach((eventName) => {
        if (!existing.eventNames.includes(eventName)) {
          existing.eventNames.push(eventName);
        }
      });
      requirement.linkedDishes.forEach((dishName) => {
        if (!existing.linkedDishes.includes(dishName)) {
          existing.linkedDishes.push(dishName);
        }
      });
      requirementsByItem.set(requirement.purchaseItemId, existing);
    });

    return Array.from(requirementsByItem.entries())
      .map(([purchaseItemId, requirement]) => {
        const purchaseItem = purchaseItemById.get(purchaseItemId);
        if (!purchaseItem) {
          return null;
        }

        const eventSummary =
          requirement.eventNames.length > 0
            ? `${requirement.eventNames.slice(0, 3).join(', ')}${requirement.eventNames.length > 3 ? ' +' : ''}`
            : 'Approved F&B production';

        return createPlanningRow({
          purchaseItem,
          requiredQuantity: requirement.requiredQuantity,
          currentStock: stockTotalsByItem.get(purchaseItemId) ?? 0,
          shortageQuantity: requirement.shortageQuantity,
          source: 'production',
          sourceDetail: eventSummary,
        });
      })
      .filter((row): row is PurchasePlanningRow => Boolean(row))
      .sort((left, right) => left.itemName.localeCompare(right.itemName));
  };

  const buildPlanningRowsForMode = (mode: PlanningMode, dateValue = planningDate) => {
    if (mode === 'production') {
      return buildProductionPlanningRows(dateValue);
    }

    if (mode === 'reorder') {
      return buildReorderPlanningRows();
    }

    return buildShortagePlanningRows();
  };

  const closeDialog = () => {
    setViewingPO(null);
    setEditingDraftPO(null);
    setDialogOpen(false);
  };

  const openViewDialog = (purchaseOrder: PurchaseOrder) => {
    setEditingDraftPO(null);
    setViewingPO(purchaseOrder);
    setDialogOpen(true);
  };

  const openEditDraftDialog = (purchaseOrder: PurchaseOrder) => {
    if (purchaseOrder.status === 'cancelled') {
      toast.error('Cancelled purchase orders cannot be amended');
      return;
    }

    setViewingPO(null);
    setEditingDraftPO(purchaseOrder);
    setSelectedVendorId(purchaseOrder.vendorId);
    setOrderDate(toDateInputValue(purchaseOrder.orderDate));
    setExpectedDeliveryDate(toDateInputValue(purchaseOrder.expectedDeliveryDate));
    setPoItems(
      purchaseOrder.items.map((item) => ({
        ...item,
        amount: getLineAmount(item),
        pendingQuantity: getPendingQuantity(purchaseOrder, item),
      })),
    );
    setPoTaxAmount(purchaseOrder.taxAmount || 0);
    setRemarks(purchaseOrder.remarks || '');
    setDialogOpen(true);
  };

  const openGrnDialog = (purchaseOrder: PurchaseOrder) => {
    setSelectedPOForGRN(purchaseOrder);
    setGrnDialogOpen(true);
  };

  const openPlanningDialog = () => {
    if (purchaseItems.length === 0) {
      toast.error('Please add purchase items first');
      return;
    }

    const nextRows = buildPlanningRowsForMode(planningMode, planningDate);
    setPlanningRows(nextRows);
    setGeneratedDraftPOs([]);
    setPlanningOpen(true);
  };

  const openFastPODialog = () => {
    if (purchaseItems.length === 0) {
      toast.error('Please add purchase items first');
      return;
    }

    const nextDeliveryDate = new Date();
    nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 1);

    setFastOrderDate(new Date().toISOString().split('T')[0]);
    setFastExpectedDeliveryDate(nextDeliveryDate.toISOString().split('T')[0]);
    setFastCategoryFilter('all');
    setFastItemSearch('');
    setFastSelectedItemId('');
    setFastRemarks('Fast Daily PO draft from item-first entry.');
    setFastRows([]);
    setFastGeneratedDraftPOs([]);
    setFastPOOpen(true);
  };

  const refreshPlanningRows = (mode = planningMode, dateValue = planningDate) => {
    const nextRows = buildPlanningRowsForMode(mode, dateValue);
    setPlanningRows(nextRows);
    setGeneratedDraftPOs([]);
    if (nextRows.length === 0) {
      toast.info('No purchase requirements found for the selected mode');
    }
  };

  const handleAddItem = () => {
    if (purchaseItems.length === 0) {
      return;
    }

    const firstItem = purchaseItems[0];
    const defaultPurchaseCost = getDefaultPurchaseCost(firstItem);
    const newItem: POItem = {
      id: `po-item-${Date.now()}`,
      purchaseItemId: firstItem.id,
      itemName: firstItem.itemName,
      quantity: 0,
      unit: getPurchaseUnit(firstItem),
      ratePerUnit: defaultPurchaseCost,
      amount: 0,
      receivedQuantity: 0,
      pendingQuantity: 0,
    };

    setPoItems([...poItems, newItem]);
  };

  const handleAddFastRow = () => {
    if (!selectedFastSearchItem) {
      toast.error('Select an item first');
      return;
    }

    setFastRows((currentRows) => [...currentRows, buildFastRow(selectedFastSearchItem)]);
    setFastGeneratedDraftPOs([]);
  };

  const handleUpdateFastRow = (rowId: string, field: keyof FastDailyPORow, value: string | number) => {
    setFastRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        if (field === 'purchaseItemId') {
          const purchaseItem = purchaseItemById.get(String(value));
          if (!purchaseItem) {
            return row;
          }

          const nextRow = buildFastRow(purchaseItem);
          return {
            ...nextRow,
            id: row.id,
            ...row,
            purchaseItemId: purchaseItem.id,
            recommendedVendorId: nextRow.recommendedVendorId,
            selectedVendorId: nextRow.selectedVendorId,
            lastRate: nextRow.lastRate,
            ratePerUnit: nextRow.ratePerUnit,
            quantity: row.quantity > 0 ? row.quantity : nextRow.quantity,
            recommendationReason: nextRow.recommendationReason,
            leadTimeDays: nextRow.leadTimeDays,
            moq: nextRow.moq,
          };
        }

        return {
          ...row,
          [field]: field === 'quantity' || field === 'ratePerUnit' || field === 'lastRate' ? Number(value) : value,
        };
      }),
    );
    setFastGeneratedDraftPOs([]);
  };

  const handleRemoveFastRow = (rowId: string) => {
    setFastRows((currentRows) => currentRows.filter((row) => row.id !== rowId));
    setFastGeneratedDraftPOs([]);
  };

  const handleDuplicateFastRow = (rowId: string) => {
    const sourceRow = fastRows.find((row) => row.id === rowId);
    if (!sourceRow) {
      return;
    }

    const purchaseItem = purchaseItemById.get(sourceRow.purchaseItemId);
    if (!purchaseItem) {
      toast.error('Selected item is no longer available');
      return;
    }

    const duplicatedRow = buildFastRow(purchaseItem);
    duplicatedRow.quantity = 0;
    duplicatedRow.ratePerUnit = sourceRow.ratePerUnit;
    duplicatedRow.lastRate = sourceRow.lastRate;
    duplicatedRow.notes = '';

    setFastRows((currentRows) => {
      const rowIndex = currentRows.findIndex((row) => row.id === rowId);
      if (rowIndex === -1) {
        return [...currentRows, duplicatedRow];
      }

      const nextRows = [...currentRows];
      nextRows.splice(rowIndex + 1, 0, duplicatedRow);
      return nextRows;
    });
    setFastGeneratedDraftPOs([]);
  };

  const handleUpdateItem = (index: number, field: string, value: string | number) => {
    const updatedItems = [...poItems];

    if (field === 'purchaseItemId') {
      const purchaseItem = purchaseItems.find((item) => item.id === value);
      if (purchaseItem) {
        const defaultPurchaseCost = getDefaultPurchaseCost(purchaseItem);
        updatedItems[index] = {
          ...updatedItems[index],
          purchaseItemId: purchaseItem.id,
          itemName: purchaseItem.itemName,
          unit: getPurchaseUnit(purchaseItem),
          ratePerUnit: defaultPurchaseCost,
          amount: getCommittedQuantity(updatedItems[index]) * defaultPurchaseCost,
        };
      }
    } else if (field === 'quantity' || field === 'ratePerUnit') {
      const minimumQuantity =
        isEditingPostReceiptPO
          ? (updatedItems[index].receivedQuantity ?? 0) + getClosedQuantity(updatedItems[index])
          : 0;
      const quantity =
        field === 'quantity'
          ? Math.max(Number(value), minimumQuantity)
          : updatedItems[index].quantity;
      const ratePerUnit = field === 'ratePerUnit' ? Number(value) : updatedItems[index].ratePerUnit;

      updatedItems[index] = {
        ...updatedItems[index],
        [field]: field === 'quantity' ? quantity : Number(value),
        amount: Math.max(quantity - getClosedQuantity(updatedItems[index]), 0) * ratePerUnit,
        pendingQuantity: Math.max(
          quantity -
            (updatedItems[index].receivedQuantity ?? 0) -
            getClosedQuantity(updatedItems[index]),
          0,
        ),
      };
    }

    setPoItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    if (isEditingPostReceiptPO && hasPostedLineActivity(poItems[index])) {
      toast.error('Lines with receipt history cannot be removed');
      return;
    }

    setPoItems(poItems.filter((_, itemIndex) => itemIndex !== index));
  };

  const handlePlanningRowChange = (
    rowId: string,
    field: 'include' | 'selectedVendorId' | 'suggestedQuantity',
    value: boolean | string | number,
  ) => {
    setPlanningRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        return {
          ...row,
          [field]: field === 'suggestedQuantity' ? Number(value) : value,
        };
      }),
    );
    setGeneratedDraftPOs([]);
  };

  const handleGenerateDraftPOs = () => {
    const includedRows = planningRows.filter((row) => row.include);

    if (includedRows.length === 0) {
      toast.error('Select at least one requirement to generate draft POs');
      return;
    }

    const unassignedRows = includedRows.filter((row) => !row.selectedVendorId);
    if (unassignedRows.length > 0) {
      toast.error('Assign vendors before generating draft POs', {
        description: `${unassignedRows.length} item(s) are in Unassigned Vendor Items.`,
      });
      return;
    }

    if (includedRows.some((row) => row.suggestedQuantity <= 0)) {
      toast.error('Suggested quantity must be greater than 0 for all included rows');
      return;
    }

    const rowsByVendor = new Map<string, PurchasePlanningRow[]>();
    includedRows.forEach((row) => {
      const rows = rowsByVendor.get(row.selectedVendorId) || [];
      rows.push(row);
      rowsByVendor.set(row.selectedVendorId, rows);
    });

    const draftOrders: PurchaseOrder[] = [];

    for (const [vendorId, rows] of rowsByVendor.entries()) {
      const vendor = vendorById.get(vendorId);
      if (!vendor) {
        toast.error('Selected vendor is no longer available');
        return;
      }

      const items: POItem[] = rows.map((row, rowIndex) => {
        const purchaseItem = purchaseItemById.get(row.purchaseItemId);
        const ratePerUnit = row.lastPurchaseRate || (purchaseItem ? getDefaultPurchaseCost(purchaseItem) : 0);

        return {
          id: `po-item-${Date.now()}-${draftOrders.length}-${rowIndex}`,
          purchaseItemId: row.purchaseItemId,
          itemName: row.itemName,
          quantity: row.suggestedQuantity,
          unit: row.purchaseUnit,
          ratePerUnit,
          amount: row.suggestedQuantity * ratePerUnit,
          receivedQuantity: 0,
          pendingQuantity: row.suggestedQuantity,
        };
      });
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

      if (
        vendor.paymentTerms.startsWith('credit') &&
        vendor.creditLimit &&
        vendor.currentBalance + subtotal > vendor.creditLimit
      ) {
        toast.error('Draft PO exceeds vendor credit limit', {
          description: `${vendor.vendorName} has ${formatCurrencyPKR(vendor.creditLimit - vendor.currentBalance)} credit available.`,
        });
        return;
      }

      const leadTimeDays = Math.max(
        1,
        ...rows.map((row) => purchaseItemById.get(row.purchaseItemId)?.leadTimeDays || 7),
      );
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + leadTimeDays);

      draftOrders.push({
        id: `po-${Date.now()}-${draftOrders.length}`,
        poNumber: generatePONumber(draftOrders.length),
        vendorId,
        vendorName: vendor.vendorName,
        orderDate: new Date(),
        expectedDeliveryDate: expectedDate,
        paymentTerms: vendor.paymentTerms,
        status: 'draft',
        sourceFlow: 'multi-vendor-planning',
        sourceLabel: planningModeLabels[planningMode],
        items,
        subtotal,
        taxAmount: 0,
        totalAmount: subtotal,
        amountPaid: 0,
        amountPending: subtotal,
        remarks: `${planningModeLabels[planningMode]} draft. Procurement review required before approval.`,
        createdBy: userName,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    onPurchaseOrdersChange([...purchaseOrders, ...draftOrders]);
    setGeneratedDraftPOs(draftOrders);
    setStatusFilter('draft');
    setVendorFilter('all');
    toast.success(`${draftOrders.length} draft PO${draftOrders.length === 1 ? '' : 's'} generated for procurement review`);
  };

  const handleGenerateFastDraftPOs = () => {
    if (fastRows.length === 0) {
      toast.error('Add at least one item row');
      return;
    }

    if (!fastExpectedDeliveryDate) {
      toast.error('Select an expected delivery date');
      return;
    }

    if (!fastOrderDate) {
      toast.error('Select an order date');
      return;
    }

    const invalidRows = fastRows.filter((row) => !row.purchaseItemId || row.quantity <= 0 || row.ratePerUnit < 0);
    if (invalidRows.length > 0) {
      toast.error('Each row needs an item, quantity greater than 0, and a valid rate');
      return;
    }

    const unassignedRows = fastRows.filter((row) => !row.selectedVendorId);
    if (unassignedRows.length > 0) {
      toast.error('Assign vendors before generating draft POs', {
        description: `${unassignedRows.length} item(s) have no selected vendor.`,
      });
      return;
    }

    const rowsByVendor = new Map<string, FastDailyPORow[]>();
    fastRows.forEach((row) => {
      const rows = rowsByVendor.get(row.selectedVendorId) || [];
      rows.push(row);
      rowsByVendor.set(row.selectedVendorId, rows);
    });

    const draftOrders: PurchaseOrder[] = [];

    for (const [vendorId, rows] of rowsByVendor.entries()) {
      const vendor = vendorById.get(vendorId);
      if (!vendor) {
        toast.error('Selected vendor is no longer available');
        return;
      }

      const items: POItem[] = rows.map((row, rowIndex) => {
        const purchaseItem = purchaseItemById.get(row.purchaseItemId);
        return {
          id: `po-item-${Date.now()}-fast-${draftOrders.length}-${rowIndex}`,
          purchaseItemId: row.purchaseItemId,
          itemName: purchaseItem?.itemName || 'Unknown Item',
          quantity: row.quantity,
          unit: purchaseItem ? getPurchaseUnit(purchaseItem) : 'unit',
          ratePerUnit: row.ratePerUnit,
          amount: row.quantity * row.ratePerUnit,
          preferredVendorId: purchaseItem?.preferredSupplierId,
          selectedVendorId: vendorId,
          purchaseCategoryId: purchaseItem?.purchaseCategoryId || purchaseItem?.categoryId || purchaseItem?.category,
          supplyCategoryId: purchaseItem?.supplyCategoryId,
          notes: row.notes.trim() || undefined,
          receivedQuantity: 0,
          pendingQuantity: row.quantity,
        };
      });
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

      draftOrders.push({
        id: `po-${Date.now()}-fast-${draftOrders.length}`,
        poNumber: generatePONumber(draftOrders.length),
        vendorId,
        vendorName: vendor.vendorName,
        orderDate: new Date(fastOrderDate),
        expectedDeliveryDate: new Date(fastExpectedDeliveryDate),
        paymentTerms: vendor.paymentTerms,
        status: 'draft',
        sourceFlow: 'fast-daily',
        sourceLabel: 'Fast Daily PO',
        items,
        subtotal,
        taxAmount: 0,
        totalAmount: subtotal,
        amountPaid: 0,
        amountPending: subtotal,
        remarks: fastRemarks.trim() || 'Fast Daily PO draft from item-first entry.',
        createdBy: userName,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    onPurchaseOrdersChange([...purchaseOrders, ...draftOrders]);
    setFastGeneratedDraftPOs(draftOrders);
    setStatusFilter('draft');
    setVendorFilter('all');
    toast.success(`${draftOrders.length} fast daily draft PO${draftOrders.length === 1 ? '' : 's'} created`);
  };

  const handleSavePO = () => {
    if (!selectedVendorId) {
      toast.error('Please select a vendor');
      return;
    }

    if (poItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    if (poItems.some((item) => item.quantity <= 0)) {
      toast.error('All items must have quantity greater than 0');
      return;
    }

    if (
      isEditingPostReceiptPO &&
      poItems.some((item) => item.quantity < (item.receivedQuantity ?? 0) + getClosedQuantity(item))
    ) {
      toast.error('Amended quantity cannot be less than already received or short-closed quantity');
      return;
    }

    if ((isEditingAmendmentPO || editingDraftPO?.status === 'approved') && poItems.some((item) => item.ratePerUnit <= 0)) {
      toast.error('All corrected lines must have a rate greater than 0');
      return;
    }

    if (!expectedDeliveryDate) {
      toast.error('Please select an expected delivery date');
      return;
    }

    const vendor = vendors.find((entry) => entry.id === selectedVendorId);
    if (!vendor) {
      return;
    }

    if (
      vendor.paymentTerms.startsWith('credit') &&
      vendor.creditLimit &&
      vendor.currentBalance + draftTotals.totalAmount > vendor.creditLimit
    ) {
      toast.error('Purchase order exceeds vendor credit limit', {
        description: `${vendor.vendorName} has ${formatCurrencyPKR(vendor.creditLimit - vendor.currentBalance)} credit available.`,
      });
      return;
    }

    const preservedStatus: PurchaseOrder['status'] = editingDraftPO?.status || 'draft';
    const recalculatedPurchaseOrder = recalculatePurchaseOrder({
      id: editingDraftPO?.id || `po-${Date.now()}`,
      poNumber: editingDraftPO?.poNumber || generatePONumber(),
      vendorId: selectedVendorId,
      vendorName: vendor.vendorName,
      orderDate: new Date(orderDate),
      expectedDeliveryDate: new Date(expectedDeliveryDate),
      paymentTerms: vendor.paymentTerms,
      status: preservedStatus,
      sourceFlow: editingDraftPO?.sourceFlow || 'manual',
      sourceLabel: editingDraftPO?.sourceLabel || 'Manual PO',
      items: poItems.map((item) => ({
        ...item,
        amount: getLineAmount(item),
        pendingQuantity:
          item.pendingQuantity ??
          Math.max(item.quantity - (item.receivedQuantity ?? 0) - getClosedQuantity(item), 0),
      })),
      amountPaid: editingDraftPO?.amountPaid || 0,
      remarks,
      createdBy: editingDraftPO?.createdBy || userName,
      createdAt: editingDraftPO?.createdAt || new Date(),
      approvedBy: editingDraftPO?.approvedBy,
      approvedAt: editingDraftPO?.approvedAt,
      deliveredDate: editingDraftPO?.deliveredDate,
      receivedBy: editingDraftPO?.receivedBy,
      receivedQuantities: editingDraftPO?.receivedQuantities,
      shortClosedAt: editingDraftPO?.shortClosedAt,
      shortClosedBy: editingDraftPO?.shortClosedBy,
      shortCloseReason: editingDraftPO?.shortCloseReason,
      amendedAt: editingDraftPO ? new Date() : undefined,
      amendedBy: editingDraftPO ? userName : undefined,
      amendmentReason: editingDraftPO && isEditingAmendmentPO ? (remarks.trim() || 'Post-receipt PO correction') : editingDraftPO?.amendmentReason,
      taxAmount: draftTotals.taxAmount,
      updatedAt: new Date(),
    });
    const purchaseOrderData = isEditingPostReceiptPO
      ? {
          ...recalculatedPurchaseOrder,
          status: derivePostReceiptStatus(recalculatedPurchaseOrder),
        }
      : recalculatedPurchaseOrder;

    if (editingDraftPO) {
      const creditDays =
        vendor.paymentTerms.startsWith('credit-') ? Number(vendor.paymentTerms.split('-')[1] || '0') : 0;
      const originalLineById = new Map(editingDraftPO.items.map((item) => [item.id, item]));
      const originalItemToAmendedLine = new Map<string, POItem>();
      purchaseOrderData.items.forEach((item) => {
        const originalLine = originalLineById.get(item.id);
        if (originalLine) {
          originalItemToAmendedLine.set(originalLine.purchaseItemId, item);
        }
      });
      const nextGoodsReceipts = isEditingPostReceiptPO
        ? goodsReceipts.map((grn) => {
            if (grn.purchaseOrderId !== editingDraftPO.id) {
              return grn;
            }

            return {
              ...grn,
              vendorId: purchaseOrderData.vendorId,
              vendorName: purchaseOrderData.vendorName,
              items: grn.items.map((grnItem) => {
                const amendedLine =
                  originalItemToAmendedLine.get(grnItem.purchaseItemId) ||
                  purchaseOrderData.items.find((item) => item.purchaseItemId === grnItem.purchaseItemId);
                if (!amendedLine) {
                  return grnItem;
                }

                return {
                  ...grnItem,
                  purchaseItemId: amendedLine.purchaseItemId,
                  itemName: amendedLine.itemName,
                  unit: amendedLine.unit,
                  ratePerUnit: amendedLine.ratePerUnit,
                  totalValue: grnItem.acceptedQuantity * amendedLine.ratePerUnit,
                };
              }),
            };
          })
        : goodsReceipts;
      const nextVendorBills = isEditingPostReceiptPO
        ? vendorBills.map((bill) => {
            if (bill.purchaseOrderId !== editingDraftPO.id) {
              return bill;
            }

            const items = bill.items.map((billItem) => {
              const amendedLine =
                originalItemToAmendedLine.get(billItem.purchaseItemId || '') ||
                purchaseOrderData.items.find((item) => item.purchaseItemId === billItem.purchaseItemId);
              if (!amendedLine) {
                return billItem;
              }

              return {
                ...billItem,
                purchaseItemId: amendedLine.purchaseItemId,
                itemName: amendedLine.itemName,
                unit: amendedLine.unit,
                ratePerUnit: amendedLine.ratePerUnit,
                amount: billItem.quantity * amendedLine.ratePerUnit,
              };
            });
            const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
            const totalAmount = subtotal + (bill.taxAmount || 0);
            const amountPending = Math.max(totalAmount - bill.amountPaid, 0);
            const dueDate = new Date(bill.billDate);
            if (creditDays > 0) {
              dueDate.setDate(dueDate.getDate() + creditDays);
            }

            return {
              ...bill,
              vendorId: purchaseOrderData.vendorId,
              vendorName: purchaseOrderData.vendorName,
              poNumber: purchaseOrderData.poNumber,
              items,
              subtotal,
              totalAmount,
              amountPending,
              dueDate,
              status: recalculateVendorBillStatus(bill.amountPaid, amountPending),
              updatedAt: new Date(),
            };
          })
        : vendorBills;
      const nextPurchaseItems = isEditingPostReceiptPO
        ? purchaseItems.map((purchaseItem) => {
            const amendedLine = purchaseOrderData.items.find((item) => item.purchaseItemId === purchaseItem.id);
            if (!amendedLine || getReceivedQuantity(purchaseOrderData, amendedLine) <= 0 || amendedLine.ratePerUnit <= 0) {
              return purchaseItem;
            }

            const conversionFactor = purchaseItem.conversionFactor || 1;
            const baseUnitRate = amendedLine.ratePerUnit / conversionFactor;

            return {
              ...purchaseItem,
              lastPurchaseRate: amendedLine.ratePerUnit,
              lastCost: amendedLine.ratePerUnit,
              averageCost: purchaseItem.averageCost && purchaseItem.averageCost > 0 ? purchaseItem.averageCost : baseUnitRate,
              ratePerUnit: purchaseItem.ratePerUnit && purchaseItem.ratePerUnit > 0 ? purchaseItem.ratePerUnit : baseUnitRate,
              lastPurchaseDate: new Date(),
              updatedAt: new Date(),
            };
          })
        : purchaseItems;
      const nextVendors = isEditingPostReceiptPO
        ? (() => {
            const originalLinkedBills = vendorBills.filter((bill) => bill.purchaseOrderId === editingDraftPO.id);
            const updatedLinkedBills = nextVendorBills.filter((bill) => bill.purchaseOrderId === editingDraftPO.id);
            const originalOutstanding = originalLinkedBills.reduce((sum, bill) => sum + bill.amountPending, 0);
            const originalPurchases = originalLinkedBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
            const updatedOutstanding = updatedLinkedBills.reduce((sum, bill) => sum + bill.amountPending, 0);
            const updatedPurchases = updatedLinkedBills.reduce((sum, bill) => sum + bill.totalAmount, 0);

            return vendors.map((entry) => {
              const isOriginalVendor = entry.id === editingDraftPO.vendorId;
              const isUpdatedVendor = entry.id === purchaseOrderData.vendorId;
              if (!isOriginalVendor && !isUpdatedVendor) {
                return entry;
              }

              let currentBalance = entry.currentBalance;
              let totalPurchases = entry.totalPurchases;
              let lastPurchaseDate = entry.lastPurchaseDate;

              if (isOriginalVendor) {
                currentBalance = Math.max(currentBalance - originalOutstanding, 0);
                totalPurchases = Math.max(totalPurchases - originalPurchases, 0);
              }

              if (isUpdatedVendor) {
                currentBalance += updatedOutstanding;
                totalPurchases += updatedPurchases;
                lastPurchaseDate = new Date();
              }

              return {
                ...entry,
                currentBalance,
                totalPurchases,
                lastPurchaseDate,
                updatedAt: new Date(),
              };
            });
          })()
        : vendors;
      const orderExists = purchaseOrders.some((entry) => entry.id === editingDraftPO.id);
      if (isEditingPostReceiptPO) {
        onGoodsReceiptsChange(nextGoodsReceipts);
        onVendorBillsChange(nextVendorBills);
        onPurchaseItemsChange(nextPurchaseItems);
        onVendorsChange(nextVendors);
      }
      onPurchaseOrdersChange(
        orderExists
          ? purchaseOrders.map((entry) => (entry.id === editingDraftPO.id ? purchaseOrderData : entry))
          : [...purchaseOrders, purchaseOrderData],
      );
      toast.success(
        `${purchaseOrderData.poNumber} ${
          isEditingPostReceiptPO ? 'amended' : purchaseOrderData.status === 'approved' ? 'corrected' : 'updated'
        }`,
      );
      closeDialog();
      return;
    }

    onPurchaseOrdersChange([...purchaseOrders, purchaseOrderData]);
    toast.success(`Purchase Order ${purchaseOrderData.poNumber} created as draft`);
    closeDialog();
  };

  const handleApprovePO = (purchaseOrder: PurchaseOrder) => {
    if (purchaseOrder.items.some((item) => item.ratePerUnit <= 0)) {
      toast.error('Enter a valid rate for every line before approval');
      return;
    }

    const approvedPurchaseOrder: PurchaseOrder = recalculatePurchaseOrder({
      ...purchaseOrder,
      status: 'approved',
      approvedBy: userName,
      approvedAt: new Date(),
      updatedAt: new Date(),
    });

    onPurchaseOrdersChange(
      purchaseOrders.map((entry) => (entry.id === purchaseOrder.id ? approvedPurchaseOrder : entry)),
    );
    setViewingPO((current) => (current?.id === purchaseOrder.id ? approvedPurchaseOrder : current));
    toast.success(`${purchaseOrder.poNumber} approved`);
  };

  const handleCancelPO = (purchaseOrder: PurchaseOrder) => {
    if (purchaseOrder.status === 'received' || purchaseOrder.status === 'partially-received' || purchaseOrder.status === 'closed') {
      toast.error('Received purchase orders cannot be cancelled');
      return;
    }

    const cancelledPurchaseOrder: PurchaseOrder = {
      ...purchaseOrder,
      status: 'cancelled',
      updatedAt: new Date(),
    };

    onPurchaseOrdersChange(
      purchaseOrders.map((entry) => (entry.id === purchaseOrder.id ? cancelledPurchaseOrder : entry)),
    );
    setViewingPO((current) => (current?.id === purchaseOrder.id ? cancelledPurchaseOrder : current));
    toast.success(`${purchaseOrder.poNumber} cancelled`);
  };

  const includedPlanningRows = useMemo(() => planningRows.filter((row) => row.include), [planningRows]);

  const unassignedPlanningRows = useMemo(
    () => includedPlanningRows.filter((row) => !row.selectedVendorId),
    [includedPlanningRows],
  );

  const planningVendorGroups = useMemo(() => {
    const groups = new Map<string, { vendorId: string; vendorName: string; rows: PurchasePlanningRow[]; total: number }>();

    includedPlanningRows.forEach((row) => {
      const vendorId = row.selectedVendorId || 'unassigned';
      const vendor = vendorById.get(vendorId);
      const existing = groups.get(vendorId) || {
        vendorId,
        vendorName: vendor?.vendorName || 'Unassigned Vendor Items',
        rows: [],
        total: 0,
      };

      existing.rows.push(row);
      existing.total += row.suggestedQuantity * row.lastPurchaseRate;
      groups.set(vendorId, existing);
    });

    return Array.from(groups.values()).sort((left, right) => {
      if (left.vendorId === 'unassigned') {
        return -1;
      }
      if (right.vendorId === 'unassigned') {
        return 1;
      }
      return left.vendorName.localeCompare(right.vendorName);
    });
  }, [includedPlanningRows, vendorById]);

  const fastVendorGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        vendorId: string;
        vendorName: string;
        rows: FastDailyPORow[];
        total: number;
        previousBalance: number;
        openPOValue: number;
        lastDelivery?: Date;
        leadTimeDays?: number;
      }
    >();

    fastRows.forEach((row) => {
      const vendorId = row.selectedVendorId || 'unassigned';
      const vendor = vendorById.get(vendorId);
      const openOrders = purchaseOrders.filter(
        (purchaseOrder) =>
          purchaseOrder.vendorId === vendorId &&
          (purchaseOrder.status === 'draft' ||
            purchaseOrder.status === 'approved' ||
            purchaseOrder.status === 'partially-received'),
      );
      const vendorDeliveries = goodsReceipts
        .filter((grn) => grn.vendorId === vendorId)
        .sort((left, right) => new Date(right.receiptDate).getTime() - new Date(left.receiptDate).getTime());
      const existing = groups.get(vendorId) || {
        vendorId,
        vendorName: vendor?.vendorName || 'Unassigned Vendor Items',
        rows: [],
        total: 0,
        previousBalance: vendor?.currentBalance || 0,
        openPOValue: openOrders.reduce((sum, purchaseOrder) => sum + purchaseOrder.totalAmount, 0),
        lastDelivery: vendorDeliveries[0]?.receiptDate,
        leadTimeDays: vendor?.defaultLeadTimeDays,
      };

      existing.rows.push(row);
      existing.total += row.quantity * row.ratePerUnit;
      existing.leadTimeDays = Math.max(existing.leadTimeDays || 0, row.leadTimeDays || 0) || existing.leadTimeDays;
      groups.set(vendorId, existing);
    });

    return Array.from(groups.values()).sort((left, right) => {
      if (left.vendorId === 'unassigned') {
        return -1;
      }
      if (right.vendorId === 'unassigned') {
        return 1;
      }
      return left.vendorName.localeCompare(right.vendorName);
    });
  }, [fastRows, goodsReceipts, purchaseOrders, vendorById]);

  const fastRowDiagnostics = useMemo(
    () =>
      fastRows.map((row) => {
        const quantityMissing = row.quantity <= 0;
        const vendorMissing = !row.selectedVendorId;
        const invalidRate = row.ratePerUnit < 0;
        const itemMissing = !row.purchaseItemId;
        const vendorOverride =
          Boolean(row.selectedVendorId) &&
          Boolean(row.recommendedVendorId) &&
          row.selectedVendorId !== row.recommendedVendorId;
        const amount = row.quantity > 0 && row.ratePerUnit >= 0 ? row.quantity * row.ratePerUnit : 0;

        return {
          rowId: row.id,
          amount,
          quantityMissing,
          vendorMissing,
          invalidRate,
          itemMissing,
          vendorOverride,
          hasIssue: quantityMissing || vendorMissing || invalidRate || itemMissing,
        };
      }),
    [fastRows],
  );

  const fastDiagnosticByRowId = useMemo(
    () => new Map(fastRowDiagnostics.map((entry) => [entry.rowId, entry])),
    [fastRowDiagnostics],
  );

  const fastSummary = useMemo(() => {
    const selectedVendorIds = new Set(
      fastRows
        .map((row) => row.selectedVendorId)
        .filter((vendorId): vendorId is string => Boolean(vendorId)),
    );
    const recommendedVendorIds = new Set(
      fastRows
        .map((row) => row.recommendedVendorId)
        .filter((vendorId): vendorId is string => Boolean(vendorId)),
    );

    return {
      itemRows: fastRows.length,
      totalQuantity: roundQuantity(
        fastRows.reduce((sum, row) => sum + (row.quantity > 0 ? row.quantity : 0), 0),
      ),
      estimatedValue: fastRowDiagnostics.reduce((sum, entry) => sum + entry.amount, 0),
      vendorCount: selectedVendorIds.size,
      recommendedVendorCount: recommendedVendorIds.size,
      draftCount: fastVendorGroups.filter((group) => group.vendorId !== 'unassigned').length,
      unassignedRows: fastRowDiagnostics.filter((entry) => entry.vendorMissing).length,
      missingQuantities: fastRowDiagnostics.filter((entry) => entry.quantityMissing).length,
      invalidRates: fastRowDiagnostics.filter((entry) => entry.invalidRate).length,
      overriddenRows: fastRowDiagnostics.filter((entry) => entry.vendorOverride).length,
    };
  }, [fastRowDiagnostics, fastRows, fastVendorGroups]);

  const fastValidationMessages = useMemo(() => {
    const messages: string[] = [];
    if (!fastOrderDate) {
      messages.push('Order date is required.');
    }
    if (!fastExpectedDeliveryDate) {
      messages.push('Expected delivery date is required.');
    }
    if (fastSummary.missingQuantities > 0) {
      messages.push(`${fastSummary.missingQuantities} row(s) need quantity greater than 0.`);
    }
    if (fastSummary.unassignedRows > 0) {
      messages.push(`${fastSummary.unassignedRows} row(s) need a vendor before draft generation.`);
    }
    if (fastSummary.invalidRates > 0) {
      messages.push(`${fastSummary.invalidRates} row(s) have invalid rates.`);
    }
    if (fastSummary.overriddenRows > 0) {
      messages.push(`${fastSummary.overriddenRows} row(s) are using vendor overrides.`);
    }
    return messages;
  }, [fastExpectedDeliveryDate, fastOrderDate, fastSummary.invalidRates, fastSummary.missingQuantities, fastSummary.overriddenRows, fastSummary.unassignedRows]);

  const fastCanGenerate =
    fastRows.length > 0 &&
    Boolean(fastOrderDate) &&
    Boolean(fastExpectedDeliveryDate) &&
    fastSummary.missingQuantities === 0 &&
    fastSummary.unassignedRows === 0 &&
    fastSummary.invalidRates === 0 &&
    fastGeneratedDraftPOs.length === 0;

  const emptyMessage =
    purchaseOrders.length === 0
      ? 'No purchase orders yet. Create the first PO to start procurement operations.'
      : 'No purchase orders match the current search and filters.';

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <h2 className="mr-2 text-base font-semibold text-slate-900">Purchase Orders</h2>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as PurchaseOrderStatusFilter)}
            className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="partially-received">Partially Received</option>
            <option value="received">Received</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={vendorFilter}
            onChange={(event) => setVendorFilter(event.target.value)}
            className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            <option value="all">All Vendors</option>
            {vendors
              .slice()
              .sort((left, right) => left.vendorName.localeCompare(right.vendorName))
              .map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.vendorName}
                </option>
              ))}
          </select>
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search PO, vendor, terms, or item"
              className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={openPlanningDialog}
            className="inline-flex h-9 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ClipboardList className="size-4" />
            Purchase Planning
          </button>
          <button
            onClick={openFastPODialog}
            className="inline-flex h-9 items-center gap-2 rounded border border-emerald-600 bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="size-4" />
            Fast Daily PO
          </button>
        </div>

        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span><strong className="text-slate-900">POs:</strong> {metrics.total}</span>
            <span><strong className="text-slate-900">Open:</strong> {metrics.open}</span>
            <span><strong className="text-slate-900">Draft:</strong> {metrics.draft}</span>
            <span><strong className="text-slate-900">Approved:</strong> {metrics.approved}</span>
            <span><strong className="text-slate-900">Receiving:</strong> {metrics.receiving}</span>
            <span><strong className="text-slate-900">Overdue:</strong> {metrics.overdue}</span>
            <span><strong className="text-slate-900">PO Value:</strong> {compactCurrency(metrics.value)}</span>
            <span><strong className="text-slate-900">Pending:</strong> {compactCurrency(metrics.pendingValue)}</span>
            <span><strong className="text-slate-900">User:</strong> {userName}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        {purchaseOrderRows.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-300 bg-white px-6 text-center">
            <div>
              <Truck className="mx-auto mb-3 size-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No purchase orders found</p>
              <p className="mt-1 text-xs text-slate-500">{emptyMessage}</p>
            </div>
          </div>
        ) : (
          <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="overflow-hidden rounded border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <h3 className="text-sm font-semibold text-slate-900">Purchase Order Register</h3>
                <span className="text-xs text-slate-500">{purchaseOrderRows.length} rows</span>
              </div>
              <div className="h-[calc(100%-41px)] overflow-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>PO</th>
                      <th className={tableHeadClass}>Vendor</th>
                      <th className={tableHeadClass}>Order Window</th>
                      <th className={tableHeadClass}>Items</th>
                      <th className={tableHeadClass}>Receipt</th>
                      <th className={`${tableHeadClass} text-right`}>Financials</th>
                      <th className={tableHeadClass}>Status</th>
                      <th className={`${tableHeadClass} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrderRows.map((purchaseOrder) => {
                      const actionMeta = getActionMeta(purchaseOrder);
                      const etaMeta = getEtaLabel(purchaseOrder);

                      return (
                        <tr key={purchaseOrder.id} className="border-t border-slate-200 hover:bg-slate-50">
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{purchaseOrder.poNumber}</div>
                            <div className="text-xs text-slate-500">
                              {purchaseOrder.sourceLabel || 'Manual PO'} | {formatTerms(purchaseOrder.paymentTerms)}
                            </div>
                          </td>
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{purchaseOrder.vendorName}</div>
                            <div className={`text-xs ${actionMeta.className}`}>{actionMeta.label}: {actionMeta.detail}</div>
                          </td>
                          <td className={tableCellClass}>
                            <div className="text-slate-900">{formatDatePK(purchaseOrder.orderDate)}</div>
                            <div className={`text-xs ${etaMeta.className}`}>
                              {formatDatePK(purchaseOrder.expectedDeliveryDate)} · {etaMeta.label}
                            </div>
                          </td>
                          <td className={tableCellClass}>
                            <div className="text-slate-900">{purchaseOrder.items.length} lines</div>
                            <div className="text-xs text-slate-500">{purchaseOrder.orderedQuantity} units ordered</div>
                          </td>
                          <td className={tableCellClass}>
                            <div className="text-slate-900">{purchaseOrder.receiptPercentage}% received</div>
                            <div className="text-xs text-slate-500">
                              {purchaseOrder.receivedQuantity} / {purchaseOrder.orderedQuantity} units
                              {purchaseOrder.closedQuantity > 0 ? ` | ${purchaseOrder.closedQuantity} closed` : ''}
                              {` | ${purchaseOrder.grnCount} GRN`}
                            </div>
                          </td>
                          <td className={`${tableCellClass} text-right`}>
                            <div className="font-medium text-slate-900">{formatCurrencyPKR(purchaseOrder.totalAmount)}</div>
                            <div className="text-xs text-slate-500">
                              Pending {formatCurrencyPKR(purchaseOrder.amountPending, { compact: true })}
                            </div>
                          </td>
                          <td className={tableCellClass}>{getStatusBadge(purchaseOrder.status)}</td>
                          <td className={`${tableCellClass} text-right`}>
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              {purchaseOrder.status === 'draft' || purchaseOrder.status === 'approved' ? (
                                <button
                                  onClick={() => openEditDraftDialog(purchaseOrder)}
                                  className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  <Edit3 className="size-3.5" />
                                  {purchaseOrder.status === 'approved' ? 'Correct' : 'Edit'}
                                </button>
                              ) : null}
                              {isPostReceiptOrderStatus(purchaseOrder.status) ? (
                                <button
                                  onClick={() => openEditDraftDialog(purchaseOrder)}
                                  className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  <Edit3 className="size-3.5" />
                                  Amend
                                </button>
                              ) : null}
                              {purchaseOrder.status === 'draft' ? (
                                <button
                                  onClick={() => handleApprovePO(purchaseOrder)}
                                  className="inline-flex h-7 items-center gap-1 rounded bg-blue-600 px-2 text-xs font-medium text-white hover:bg-blue-700"
                                >
                                  <CheckCircle className="size-3.5" />
                                  Approve
                                </button>
                              ) : null}
                              {(purchaseOrder.status === 'approved' || purchaseOrder.status === 'partially-received') ? (
                                <button
                                  onClick={() => openGrnDialog(purchaseOrder)}
                                  className="inline-flex h-7 items-center gap-1 rounded bg-emerald-600 px-2 text-xs font-medium text-white hover:bg-emerald-700"
                                >
                                  <Package className="size-3.5" />
                                  GRN
                                </button>
                              ) : null}
                              {(purchaseOrder.status === 'draft' || purchaseOrder.status === 'approved') ? (
                                <button
                                  onClick={() => handleCancelPO(purchaseOrder)}
                                  className="inline-flex h-7 items-center rounded border border-red-200 px-2 text-xs font-medium text-red-700 hover:bg-red-50"
                                >
                                  Cancel
                                </button>
                              ) : null}
                              <button
                                onClick={() => openViewDialog(purchaseOrder)}
                                className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <Eye className="size-3.5" />
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid h-full grid-cols-1 gap-4 overflow-hidden">
              <section className="overflow-hidden rounded border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                  <h3 className="text-sm font-semibold text-slate-900">Action Queue</h3>
                  <Clock3 className="size-4 text-slate-400" />
                </div>
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>PO</th>
                        <th className={tableHeadClass}>Focus</th>
                        <th className={`${tableHeadClass} text-right`}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionQueue.map((purchaseOrder) => {
                        const actionMeta = getActionMeta(purchaseOrder);
                        return (
                          <tr key={purchaseOrder.id} className="border-t border-slate-200">
                            <td className={tableCellClass}>
                              <div className="font-medium text-slate-900">{purchaseOrder.poNumber}</div>
                              <div className="text-xs text-slate-500">{purchaseOrder.vendorName}</div>
                            </td>
                            <td className={tableCellClass}>
                              <div className={`font-medium ${actionMeta.className}`}>{actionMeta.label}</div>
                              <div className="text-xs text-slate-500">{actionMeta.detail}</div>
                            </td>
                            <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                              {formatCurrencyPKR(purchaseOrder.totalAmount, { compact: true })}
                            </td>
                          </tr>
                        );
                      })}
                      {actionQueue.length === 0 ? (
                        <tr>
                          <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={3}>
                            No active purchase orders require action.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="overflow-hidden rounded border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                  <h3 className="text-sm font-semibold text-slate-900">Vendor Exposure</h3>
                  <AlertTriangle className="size-4 text-slate-400" />
                </div>
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Vendor</th>
                        <th className={`${tableHeadClass} text-right`}>Open PO</th>
                        <th className={`${tableHeadClass} text-right`}>Overdue</th>
                        <th className={`${tableHeadClass} text-right`}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorExposure.map((vendor) => (
                        <tr key={vendor.id} className="border-t border-slate-200">
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{vendor.vendorName}</div>
                            <div className="text-xs text-slate-500">
                              Open value {formatCurrencyPKR(vendor.openValue, { compact: true })}
                            </div>
                          </td>
                          <td className={`${tableCellClass} text-right`}>{vendor.openOrders}</td>
                          <td className={`${tableCellClass} text-right ${vendor.overdueOrders > 0 ? 'text-red-700' : 'text-slate-700'}`}>
                            {vendor.overdueOrders}
                          </td>
                          <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                            {formatCurrencyPKR(vendor.balance, { compact: true })}
                          </td>
                        </tr>
                      ))}
                      {vendorExposure.length === 0 ? (
                        <tr>
                          <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={4}>
                            No vendor exposure to show for the current filters.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {fastPOOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[92vh] w-full max-w-[1500px] flex-col rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Fast Daily PO / Multi Vendor PO</h2>
                <p className="text-xs text-slate-500">Item-first entry with preferred vendor selection and draft POs grouped by vendor.</p>
              </div>
              <button onClick={() => setFastPOOpen(false)} className="rounded p-2 text-slate-500 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>

            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Date</label>
                  <input
                    type="date"
                    value={fastOrderDate}
                    onChange={(event) => {
                      setFastOrderDate(event.target.value);
                      setFastGeneratedDraftPOs([]);
                    }}
                    className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Expected Delivery</label>
                  <input
                    type="date"
                    value={fastExpectedDeliveryDate}
                    onChange={(event) => {
                      setFastExpectedDeliveryDate(event.target.value);
                      setFastGeneratedDraftPOs([]);
                    }}
                    className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Category Filter</label>
                  <select
                    value={fastCategoryFilter}
                    onChange={(event) => {
                      setFastCategoryFilter(event.target.value);
                      setFastSelectedItemId('');
                    }}
                    className="h-9 min-w-[190px] rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  >
                    <option value="all">All Categories</option>
                    {purchaseCategoryOptions.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[220px] flex-1">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Search Item</label>
                    <span className="text-[11px] text-slate-500">
                      {fastFilteredItems.length} matching kitchen item{fastFilteredItems.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <input
                      value={fastItemSearch}
                      onChange={(event) => {
                        setFastItemSearch(event.target.value);
                        setFastSelectedItemId('');
                      }}
                      placeholder={
                        fastCategoryFilter === 'all'
                          ? 'Search kitchen item or code'
                          : 'Search or pick item from selected category'
                      }
                      className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    />
                    <select
                      value={fastSelectedItemId}
                      onChange={(event) => setFastSelectedItemId(event.target.value)}
                      className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      <option value="">Select item</option>
                      {fastFilteredItems.length === 0 ? (
                        <option value="">No matching items</option>
                      ) : (
                        fastFilteredItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {getFastSearchLabel(item)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleAddFastRow}
                  disabled={!selectedFastSearchItem}
                  className="inline-flex h-9 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <Plus className="size-4" />
                  Add Item
                </button>
              </div>
              <div className="mt-2 border-t border-slate-200 pt-2">
                <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4 xl:grid-cols-8">
                  <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-2">
                    <div className="text-slate-500">Active Items</div>
                    <div className="mt-0.5 font-semibold text-slate-900">{fastFilteredItems.length}</div>
                  </div>
                  <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-2">
                    <div className="text-slate-500">Rows</div>
                    <div className="mt-0.5 font-semibold text-slate-900">{fastSummary.itemRows}</div>
                  </div>
                  <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-2">
                    <div className="text-slate-500">Vendors</div>
                    <div className="mt-0.5 font-semibold text-slate-900">{fastSummary.vendorCount}</div>
                  </div>
                  <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-2">
                    <div className="text-slate-500">Draft POs</div>
                    <div className="mt-0.5 font-semibold text-slate-900">{fastSummary.draftCount}</div>
                  </div>
                  <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-2">
                    <div className="text-slate-500">Total Qty</div>
                    <div className="mt-0.5 font-semibold text-slate-900">{fastSummary.totalQuantity}</div>
                  </div>
                  <div className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-2">
                    <div className="text-emerald-700">Estimated Value</div>
                    <div className="mt-0.5 font-semibold text-emerald-900">{compactCurrency(fastSummary.estimatedValue)}</div>
                  </div>
                  <div className={`rounded border px-2.5 py-2 ${fastSummary.unassignedRows > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className={fastSummary.unassignedRows > 0 ? 'text-amber-700' : 'text-slate-500'}>Unassigned</div>
                    <div className={`mt-0.5 font-semibold ${fastSummary.unassignedRows > 0 ? 'text-amber-900' : 'text-slate-900'}`}>{fastSummary.unassignedRows}</div>
                  </div>
                  <div className={`rounded border px-2.5 py-2 ${fastSummary.missingQuantities > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className={fastSummary.missingQuantities > 0 ? 'text-red-700' : 'text-slate-500'}>Missing Qty</div>
                    <div className={`mt-0.5 font-semibold ${fastSummary.missingQuantities > 0 ? 'text-red-900' : 'text-slate-900'}`}>{fastSummary.missingQuantities}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 2xl:grid-cols-[minmax(0,1fr)_300px]">
              <section className="min-h-0 overflow-hidden rounded border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                  <h3 className="text-sm font-semibold text-slate-900">Daily Item Entry</h3>
                  <span className="text-xs text-slate-500">{fastRows.length} item rows</span>
                </div>
                {fastRows.length === 0 ? (
                  <div className="flex h-72 items-center justify-center px-6 text-center">
                    <div>
                      <Package className="mx-auto mb-2 size-9 text-slate-300" />
                      <p className="text-sm font-medium text-slate-700">No fast PO items added</p>
                      <p className="mt-1 text-xs text-slate-500">Add item rows to generate vendor-wise draft POs.</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-auto">
                    <table className="w-full min-w-[900px]">
                      <thead className="sticky top-0 bg-slate-50">
                        <tr>
                          <th className={tableHeadClass}>Item</th>
                          <th className={`${tableHeadClass} text-right`}>Qty</th>
                          <th className={tableHeadClass}>Unit</th>
                          <th className={tableHeadClass}>Vendor</th>
                          <th className={`${tableHeadClass} text-right`}>Last Rate</th>
                          <th className={`${tableHeadClass} text-right`}>Current Rate</th>
                          <th className={`${tableHeadClass} text-right`}>Amount</th>
                          <th className={`${tableHeadClass} text-right`}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fastRows.map((row) => {
                          const purchaseItem = purchaseItemById.get(row.purchaseItemId);
                          const rowDiagnostic = fastDiagnosticByRowId.get(row.id);
                          const rowIntelligence = purchaseItem
                            ? getSuggestedFastQuantity(purchaseItem, {
                                leadTimeDays: row.leadTimeDays,
                                moq: row.moq,
                              })
                            : null;
                          const rowItemOptions = fastFilteredItems.some((item) => item.id === row.purchaseItemId) || !purchaseItem
                            ? fastFilteredItems
                            : [purchaseItem, ...fastFilteredItems];

                          return (
                            <tr key={row.id} className="border-t border-slate-200 hover:bg-slate-50">
                              <td className={tableCellClass}>
                                <select
                                  value={row.purchaseItemId}
                                  onChange={(event) => handleUpdateFastRow(row.id, 'purchaseItemId', event.target.value)}
                                  className="h-8 w-52 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700"
                                >
                                  {rowItemOptions.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.itemName}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className={`${tableCellClass} text-right`}>
                                <input
                                  type="number"
                                  min="0"
                                  value={row.quantity}
                                  onChange={(event) => handleUpdateFastRow(row.id, 'quantity', Number(event.target.value))}
                                  className={`h-8 w-20 rounded bg-white px-2 text-right text-sm text-slate-700 ${
                                    rowDiagnostic?.quantityMissing ? 'border border-red-300 bg-red-50 text-red-900' : 'border border-slate-300'
                                  }`}
                                />
                              </td>
                              <td className={tableCellClass}>{purchaseItem ? getPurchaseUnit(purchaseItem) : 'unit'}</td>
                              <td className={tableCellClass}>
                                <select
                                  value={row.selectedVendorId}
                                  onChange={(event) => handleUpdateFastRow(row.id, 'selectedVendorId', event.target.value)}
                                  className={`h-8 w-44 rounded bg-white px-2 text-sm text-slate-700 ${
                                    rowDiagnostic?.vendorMissing
                                      ? 'border border-amber-300 bg-amber-50 text-amber-900'
                                      : rowDiagnostic?.vendorOverride
                                        ? 'border border-blue-300 bg-blue-50'
                                        : 'border border-slate-300'
                                  }`}
                                >
                                  <option value="">Select vendor</option>
                                  {activeVendors.map((vendor) => (
                                    <option key={vendor.id} value={vendor.id}>
                                      {vendor.vendorName}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className={`${tableCellClass} text-right`}>
                                {formatCurrencyPKR(row.lastRate || 0)}
                              </td>
                              <td className={`${tableCellClass} text-right`}>
                                <input
                                  type="number"
                                  min="0"
                                  value={row.ratePerUnit}
                                  onChange={(event) => handleUpdateFastRow(row.id, 'ratePerUnit', Number(event.target.value))}
                                  className={`h-8 w-20 rounded bg-white px-2 text-right text-sm text-slate-700 ${
                                    rowDiagnostic?.invalidRate ? 'border border-red-300 bg-red-50 text-red-900' : 'border border-slate-300'
                                  }`}
                                />
                              </td>
                              <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                                {row.quantity > 0 ? formatCurrencyPKR(row.quantity * row.ratePerUnit) : <span className="text-slate-400">0</span>}
                              </td>
                              <td className={`${tableCellClass} text-right`}>
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateFastRow(row.id, 'quantity', rowIntelligence?.suggestedPurchaseQuantity || row.quantity)}
                                    className="inline-flex size-7 items-center justify-center rounded border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                                    title="Use suggested quantity"
                                  >
                                    <CheckCircle className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDuplicateFastRow(row.id)}
                                    className="inline-flex size-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                    title="Add row"
                                  >
                                    <Plus className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFastRow(row.id)}
                                    className="inline-flex size-7 items-center justify-center rounded border border-red-200 bg-white text-red-700 hover:bg-red-50"
                                    title="Remove row"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <aside className="min-h-0 space-y-4 overflow-auto">
                <section className="rounded border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-3 py-2">
                    <h3 className="text-sm font-semibold text-slate-900">Vendor PO Summary</h3>
                  </div>
                  <div className="space-y-3 p-3">
                    {fastVendorGroups.length === 0 ? (
                      <div className="py-6 text-sm text-slate-500">Add rows to preview vendor grouping.</div>
                    ) : (
                      fastVendorGroups.map((group) => (
                        <div key={group.vendorId} className="rounded border border-slate-200 bg-white px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className={`text-sm font-medium ${group.vendorId === 'unassigned' ? 'text-amber-800' : 'text-slate-900'}`}>
                              {group.vendorName}
                            </div>
                            <div className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{group.rows.length} items</div>
                          </div>
                          <div className="mt-2 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-emerald-700">Draft PO Value</div>
                            <div className="mt-0.5 text-right text-base font-semibold text-emerald-900">
                              {formatCurrencyPKR(group.total, { compact: true })}
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
                            <span>Previous Balance</span>
                            <span className="text-right font-medium text-slate-900">{formatCurrencyPKR(group.previousBalance, { compact: true })}</span>
                            <span>Open PO Value</span>
                            <span className="text-right font-medium text-slate-900">{formatCurrencyPKR(group.openPOValue, { compact: true })}</span>
                            <span>Last Delivery</span>
                            <span className="text-right font-medium text-slate-900">{group.lastDelivery ? formatDatePK(group.lastDelivery) : '-'}</span>
                            <span>Lead Time</span>
                            <span className="text-right font-medium text-slate-900">{group.leadTimeDays ? `${group.leadTimeDays}d` : '-'}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className={`rounded border ${fastCanGenerate ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div className={`border-b px-3 py-2 ${fastCanGenerate ? 'border-blue-200' : 'border-amber-200'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">Pre-Generation Check</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${fastCanGenerate ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                        {fastCanGenerate ? 'Ready' : 'Blocked'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3 p-3 text-sm text-slate-700">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span>Order Date</span>
                        <span className={`font-medium ${fastOrderDate ? 'text-slate-900' : 'text-red-700'}`}>{fastOrderDate || 'Missing'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Expected Delivery</span>
                        <span className={`font-medium ${fastExpectedDeliveryDate ? 'text-slate-900' : 'text-red-700'}`}>{fastExpectedDeliveryDate || 'Missing'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Total POs</span>
                        <span className="font-medium text-slate-900">{fastSummary.draftCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Vendors</span>
                        <span className="font-medium text-slate-900">{fastSummary.vendorCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Total Qty</span>
                        <span className="font-medium text-slate-900">{fastSummary.totalQuantity}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Total Value</span>
                        <span className="font-medium text-slate-900">{compactCurrency(fastSummary.estimatedValue)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Missing Qty</span>
                        <span className={`font-medium ${fastSummary.missingQuantities > 0 ? 'text-red-700' : 'text-slate-900'}`}>{fastSummary.missingQuantities}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Missing Vendor</span>
                        <span className={`font-medium ${fastSummary.unassignedRows > 0 ? 'text-amber-800' : 'text-slate-900'}`}>{fastSummary.unassignedRows}</span>
                      </div>
                    </div>
                    {fastValidationMessages.length > 0 ? (
                      <div className="space-y-1 rounded border border-amber-200 bg-white px-3 py-2 text-xs text-amber-900">
                        {fastValidationMessages.map((message) => (
                          <div key={message} className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-700" />
                            <span>{message}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-800">
                        All rows are ready for vendor-wise draft PO generation.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded border border-emerald-200 bg-emerald-50">
                  <div className="border-b border-emerald-200 px-3 py-2">
                    <h3 className="text-sm font-semibold text-slate-900">Create Draft POs</h3>
                  </div>
                  <div className="space-y-3 p-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between">
                      <span>Vendor Drafts</span>
                      <span className="font-medium text-slate-900">{fastVendorGroups.filter((group) => group.vendorId !== 'unassigned').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Item Rows</span>
                      <span className="font-medium text-slate-900">{fastSummary.itemRows}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total Quantity</span>
                      <span className="font-medium text-slate-900">{fastSummary.totalQuantity}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Estimated Value</span>
                      <span className="font-medium text-slate-900">{compactCurrency(fastSummary.estimatedValue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Unassigned</span>
                      <span className={`font-medium ${fastSummary.unassignedRows > 0 ? 'text-amber-800' : 'text-slate-900'}`}>
                        {fastSummary.unassignedRows}
                      </span>
                    </div>
                    <button
                      onClick={handleGenerateFastDraftPOs}
                      disabled={!fastCanGenerate}
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded border border-emerald-600 bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      <ClipboardList className="size-4" />
                      Generate All Draft POs
                    </button>
                    <p className="text-xs text-slate-600">
                      {fastCanGenerate
                        ? 'Draft POs remain editable and follow the same approval and GRN process.'
                        : 'Resolve highlighted quantity, vendor, or rate issues before generating draft POs.'}
                    </p>
                  </div>
                </section>

                {fastGeneratedDraftPOs.length > 0 ? (
                  <section className="rounded border border-emerald-200 bg-white">
                    <div className="border-b border-emerald-200 px-3 py-2">
                      <h3 className="text-sm font-semibold text-slate-900">Generated Draft POs</h3>
                    </div>
                    <div className="divide-y divide-slate-200">
                      {fastGeneratedDraftPOs.map((purchaseOrder) => (
                        <div key={purchaseOrder.id} className="px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-medium text-slate-900">{purchaseOrder.poNumber}</div>
                              <div className="text-xs text-slate-600">{purchaseOrder.vendorName}</div>
                              <div className="text-xs text-slate-600">{purchaseOrder.items.length} lines | {formatCurrencyPKR(purchaseOrder.totalAmount, { compact: true })}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFastPOOpen(false);
                                openViewDialog(purchaseOrder);
                              }}
                              className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Eye className="size-3.5" />
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </aside>
            </div>
          </div>
        </div>
      ) : null}

      {planningOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[92vh] w-full max-w-[1280px] flex-col rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Purchase Planning</h2>
                <p className="text-xs text-slate-500">Calculate requirements, group by vendor, and generate draft POs for review.</p>
              </div>
              <button onClick={() => setPlanningOpen(false)} className="rounded p-2 text-slate-500 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>

            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">PO Creation Mode</label>
                  <select
                    value={planningMode}
                    onChange={(event) => {
                      const nextMode = event.target.value as PlanningMode;
                      setPlanningMode(nextMode);
                      refreshPlanningRows(nextMode, planningDate);
                    }}
                    className="h-9 min-w-[260px] rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  >
                    <option value="shortage">Generate from Shortage</option>
                    <option value="production">Generate from F&B Production Plan</option>
                    <option value="reorder">Generate from Par Level / Reorder</option>
                  </select>
                </div>
                {planningMode === 'production' ? (
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Production Date</label>
                    <input
                      type="date"
                      value={planningDate}
                      onChange={(event) => {
                        setPlanningDate(event.target.value);
                        refreshPlanningRows(planningMode, event.target.value);
                      }}
                      className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    />
                  </div>
                ) : null}
                <button
                  onClick={() => refreshPlanningRows()}
                  className="inline-flex h-9 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-white"
                >
                  <ClipboardList className="size-4" />
                  Calculate
                </button>
                <div className="ml-auto flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded border border-slate-200 bg-white px-2 py-1">
                    Requirements: <strong className="text-slate-900">{planningRows.length}</strong>
                  </span>
                  <span className="rounded border border-slate-200 bg-white px-2 py-1">
                    Included: <strong className="text-slate-900">{includedPlanningRows.length}</strong>
                  </span>
                  <span className={`rounded border px-2 py-1 ${unassignedPlanningRows.length ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white'}`}>
                    Unassigned: <strong>{unassignedPlanningRows.length}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="min-h-0 overflow-hidden rounded border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                  <h3 className="text-sm font-semibold text-slate-900">{planningModeLabels[planningMode]}</h3>
                  <span className="text-xs text-slate-500">Preferred vendor is suggested only</span>
                </div>
                {planningRows.length === 0 ? (
                  <div className="flex h-72 items-center justify-center px-6 text-center">
                    <div>
                      <Package className="mx-auto mb-2 size-9 text-slate-300" />
                      <p className="text-sm font-medium text-slate-700">No purchase requirements found</p>
                      <p className="mt-1 text-xs text-slate-500">Change the mode or production date, then calculate again.</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-auto">
                    <table className="w-full min-w-[1120px]">
                      <thead className="sticky top-0 bg-slate-50">
                        <tr>
                          <th className={`${tableHeadClass} w-12 text-center`}>Use</th>
                          <th className={tableHeadClass}>Required Item</th>
                          <th className={`${tableHeadClass} text-right`}>Required Qty</th>
                          <th className={`${tableHeadClass} text-right`}>Current Stock</th>
                          <th className={`${tableHeadClass} text-right`}>Shortage Qty</th>
                          <th className={`${tableHeadClass} text-right`}>Reorder</th>
                          <th className={`${tableHeadClass} text-right`}>Par</th>
                          <th className={tableHeadClass}>Preferred Vendor</th>
                          <th className={`${tableHeadClass} text-right`}>Last Rate</th>
                          <th className={`${tableHeadClass} text-right`}>Suggested Qty</th>
                          <th className={tableHeadClass}>Selected Vendor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {planningRows.map((row) => {
                          const preferredVendorName = row.preferredVendorId
                            ? vendorById.get(row.preferredVendorId)?.vendorName || 'Missing vendor'
                            : 'Unassigned';

                          return (
                            <tr key={row.id} className="border-t border-slate-200 hover:bg-slate-50">
                              <td className={`${tableCellClass} text-center`}>
                                <input
                                  type="checkbox"
                                  checked={row.include}
                                  onChange={(event) => handlePlanningRowChange(row.id, 'include', event.target.checked)}
                                  className="size-4 rounded border-slate-300"
                                />
                              </td>
                              <td className={tableCellClass}>
                                <div className="font-medium text-slate-900">{row.itemName}</div>
                                <div className="text-xs text-slate-500">{row.sourceDetail}</div>
                              </td>
                              <td className={`${tableCellClass} text-right`}>{row.requiredQuantity} {row.baseUnit}</td>
                              <td className={`${tableCellClass} text-right`}>{row.currentStock} {row.baseUnit}</td>
                              <td className={`${tableCellClass} text-right font-medium text-red-700`}>{row.shortageQuantity} {row.baseUnit}</td>
                              <td className={`${tableCellClass} text-right`}>{row.reorderLevel} {row.baseUnit}</td>
                              <td className={`${tableCellClass} text-right`}>{row.parLevel} {row.baseUnit}</td>
                              <td className={tableCellClass}>{preferredVendorName}</td>
                              <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(row.lastPurchaseRate, { compact: true })}</td>
                              <td className={`${tableCellClass} text-right`}>
                                <input
                                  type="number"
                                  min="0"
                                  value={row.suggestedQuantity}
                                  onChange={(event) => handlePlanningRowChange(row.id, 'suggestedQuantity', Number(event.target.value))}
                                  className="h-8 w-24 rounded border border-slate-300 bg-white px-2 text-right text-sm text-slate-700"
                                />
                                <div className="mt-0.5 text-[11px] text-slate-500">{row.purchaseUnit}</div>
                              </td>
                              <td className={tableCellClass}>
                                <select
                                  value={row.selectedVendorId}
                                  onChange={(event) => handlePlanningRowChange(row.id, 'selectedVendorId', event.target.value)}
                                  className="h-8 w-56 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700"
                                >
                                  <option value="">Unassigned Vendor Items</option>
                                  {activeVendors.map((vendor) => (
                                    <option key={vendor.id} value={vendor.id}>
                                      {vendor.vendorName}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <aside className="min-h-0 space-y-4 overflow-auto">
                <section className="rounded border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-3 py-2">
                    <h3 className="text-sm font-semibold text-slate-900">Vendor Grouping</h3>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {planningVendorGroups.length === 0 ? (
                      <div className="px-3 py-6 text-sm text-slate-500">Include rows to preview vendor draft groups.</div>
                    ) : (
                      planningVendorGroups.map((group) => (
                        <div key={group.vendorId} className="px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className={`text-sm font-medium ${group.vendorId === 'unassigned' ? 'text-amber-800' : 'text-slate-900'}`}>
                              {group.vendorName}
                            </div>
                            <div className="text-xs text-slate-500">{group.rows.length} lines</div>
                          </div>
                          <div className="mt-1 text-xs text-slate-600">{formatCurrencyPKR(group.total, { compact: true })}</div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded border border-blue-200 bg-blue-50">
                  <div className="border-b border-blue-200 px-3 py-2">
                    <h3 className="text-sm font-semibold text-slate-900">Generate Draft POs</h3>
                  </div>
                  <div className="space-y-3 p-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between">
                      <span>Vendor Drafts</span>
                      <span className="font-medium text-slate-900">{planningVendorGroups.filter((group) => group.vendorId !== 'unassigned').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Included Lines</span>
                      <span className="font-medium text-slate-900">{includedPlanningRows.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Unassigned Lines</span>
                      <span className={`font-medium ${unassignedPlanningRows.length ? 'text-amber-800' : 'text-slate-900'}`}>{unassignedPlanningRows.length}</span>
                    </div>
                    <button
                      onClick={handleGenerateDraftPOs}
                      disabled={planningRows.length === 0 || generatedDraftPOs.length > 0}
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded border border-blue-600 bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      <ClipboardList className="size-4" />
                      Generate Draft POs
                    </button>
                    <p className="text-xs text-slate-600">Stock remains unchanged. GRN receiving updates inventory after PO approval.</p>
                  </div>
                </section>

                {generatedDraftPOs.length > 0 ? (
                  <section className="rounded border border-emerald-200 bg-emerald-50">
                    <div className="border-b border-emerald-200 px-3 py-2">
                      <h3 className="text-sm font-semibold text-slate-900">Generated Draft POs</h3>
                    </div>
                    <div className="divide-y divide-emerald-200">
                      {generatedDraftPOs.map((purchaseOrder) => (
                        <div key={purchaseOrder.id} className="px-3 py-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium text-slate-900">{purchaseOrder.poNumber}</div>
                              <div className="text-xs text-slate-600">{purchaseOrder.vendorName}</div>
                              <div className="text-xs text-slate-600">{purchaseOrder.items.length} lines | {formatCurrencyPKR(purchaseOrder.totalAmount, { compact: true })}</div>
                            </div>
                            <button
                              onClick={() => {
                                setPlanningOpen(false);
                                openEditDraftDialog(purchaseOrder);
                              }}
                              className="inline-flex h-7 items-center gap-1 rounded border border-emerald-300 bg-white px-2 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
                            >
                              <Edit3 className="size-3.5" />
                              Open
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </aside>
            </div>
          </div>
        </div>
      ) : null}

      {dialogOpen && !viewingPO ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingDraftPO
                    ? `${
                        isEditingPostReceiptPO
                          ? 'Amend Received PO'
                          : editingDraftPO.status === 'approved'
                            ? 'Correct Approved PO'
                            : 'Edit Draft PO'
                      } ${editingDraftPO.poNumber}`
                    : 'Draft PO Review'}
                </h2>
                <p className="text-xs text-slate-500">
                  {isEditingPostReceiptPO
                    ? 'Correct commercial mistakes after GRN posting without reopening receipt history.'
                    : 'Review and adjust draft or approved POs before GRN receiving.'}
                </p>
              </div>
              <button onClick={closeDialog} className="rounded p-2 text-slate-500 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5">
                  <section className="rounded border border-slate-200">
                    <div className="border-b border-slate-200 px-4 py-2">
                      <h3 className="text-sm font-semibold text-slate-900">Commercial Setup</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
                      <div className="md:col-span-3">
                        <div className="inline-flex h-8 items-center rounded border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-700">
                          {isEditingPostReceiptPO ? 'Post Receipt Amendment Mode' : isEditingApprovedPO ? 'Approved PO Correction Mode' : 'Draft Review Mode'}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Vendor <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedVendorId}
                          onChange={(event) => setSelectedVendorId(event.target.value)}
                          className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                        >
                          {vendorFormOptions.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>
                              {vendor.vendorName} ({vendor.vendorCode})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Order Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={orderDate}
                          onChange={(event) => setOrderDate(event.target.value)}
                          className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Expected Delivery <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={expectedDeliveryDate}
                          onChange={(event) => setExpectedDeliveryDate(event.target.value)}
                          className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
                      <h3 className="text-sm font-semibold text-slate-900">Line Items</h3>
                      <button
                        onClick={handleAddItem}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
                      >
                        <Plus className="size-3.5" />
                        Add Item
                      </button>
                    </div>

                    {poItems.length === 0 ? (
                      <div className="flex items-center justify-center px-4 py-10 text-center">
                        <div>
                          <Package className="mx-auto mb-2 size-8 text-slate-300" />
                          <p className="text-sm font-medium text-slate-700">No items added</p>
                          <p className="mt-1 text-xs text-slate-500">Add line items to build the purchase order.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className={tableHeadClass}>Item</th>
                              <th className={`${tableHeadClass} text-right`}>Qty</th>
                              <th className={tableHeadClass}>Unit</th>
                              <th className={`${tableHeadClass} text-right`}>Rate</th>
                              <th className={`${tableHeadClass} text-right`}>Amount</th>
                              <th className={`${tableHeadClass} text-right`}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {poItems.map((item, index) => (
                              <tr key={item.id} className="border-t border-slate-200">
                                <td className={tableCellClass}>
                                  <select
                                    value={item.purchaseItemId}
                                    onChange={(event) => handleUpdateItem(index, 'purchaseItemId', event.target.value)}
                                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                                  >
                                    {purchaseItems.map((purchaseItem) => (
                                      <option key={purchaseItem.id} value={purchaseItem.id}>
                                        {purchaseItem.itemName}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className={`${tableCellClass} text-right`}>
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(event) => handleUpdateItem(index, 'quantity', Number(event.target.value))}
                                    min={
                                      isEditingPostReceiptPO
                                        ? (item.receivedQuantity ?? 0) + getClosedQuantity(item)
                                        : 0
                                    }
                                    className="w-24 rounded border border-slate-300 px-3 py-2 text-right text-sm text-slate-700"
                                  />
                                </td>
                                <td className={tableCellClass}>{item.unit}</td>
                                <td className={`${tableCellClass} text-right`}>
                                  <input
                                    type="number"
                                    value={item.ratePerUnit}
                                    onChange={(event) => handleUpdateItem(index, 'ratePerUnit', Number(event.target.value))}
                                    className="w-28 rounded border border-slate-300 px-3 py-2 text-right text-sm text-slate-700"
                                  />
                                </td>
                                <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                                  {formatCurrencyPKR(item.amount)}
                                </td>
                                <td className={`${tableCellClass} text-right`}>
                                  {!isEditingPostReceiptPO || !hasPostedLineActivity(item) ? (
                                    <button
                                      onClick={() => handleRemoveItem(index)}
                                      className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                                    >
                                      Remove
                                    </button>
                                  ) : (
                                    <span className="text-xs text-slate-400">Keep receipt line</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  <section className="rounded border border-slate-200">
                    <div className="border-b border-slate-200 px-4 py-2">
                      <h3 className="text-sm font-semibold text-slate-900">Internal Notes</h3>
                    </div>
                    <div className="p-4">
                      <textarea
                        value={remarks}
                        onChange={(event) => setRemarks(event.target.value)}
                        placeholder="Special delivery, packaging, or coordination notes"
                        rows={3}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                      />
                    </div>
                  </section>
                </div>

                <div className="space-y-4">
                  <section className="rounded border border-slate-200 bg-slate-50 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">Vendor Snapshot</h3>
                    {selectedVendor ? (
                      <div className="space-y-2 text-sm text-slate-700">
                        <div className="font-medium text-slate-900">{selectedVendor.vendorName}</div>
                        <div>Contact: {selectedVendor.contactPerson}</div>
                        <div>Phone: {selectedVendor.phone}</div>
                        <div>Terms: {formatTerms(selectedVendor.paymentTerms)}</div>
                        <div>Outstanding: {formatCurrencyPKR(selectedVendor.currentBalance)}</div>
                        {selectedVendor.paymentTerms.startsWith('credit') ? (
                          <div>
                            Credit Available:{' '}
                            {formatCurrencyPKR(
                              Math.max((selectedVendor.creditLimit || 0) - selectedVendor.currentBalance, 0),
                            )}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Select a vendor to review commercial terms.</p>
                    )}
                  </section>

                  <section className="rounded border border-blue-200 bg-blue-50 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">Order Summary</h3>
                    <div className="space-y-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between">
                        <span>Line Items</span>
                        <span className="font-medium text-slate-900">{poItems.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Subtotal</span>
                        <span className="font-medium text-slate-900">{formatCurrencyPKR(draftTotals.subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Tax</span>
                        <input
                          type="number"
                          min="0"
                        value={poTaxAmount}
                        onChange={(event) => setPoTaxAmount(Math.max(Number(event.target.value), 0))}
                        className="h-8 w-28 rounded border border-slate-300 bg-white px-2 text-right text-sm font-medium text-slate-900"
                      />
                      </div>
                      <div className="border-t border-blue-200 pt-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900">Total</span>
                          <span className="text-base font-semibold text-blue-700">
                            {formatCurrencyPKR(draftTotals.totalAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button
                onClick={closeDialog}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePO}
                className="rounded border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {editingDraftPO
                  ? isEditingPostReceiptPO
                    ? 'Save Amendment'
                    : editingDraftPO.status === 'approved'
                      ? 'Save Correction'
                      : 'Update Draft PO'
                  : 'Create Draft PO'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {dialogOpen && viewingPO ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{viewingPO.poNumber}</h2>
                  {getStatusBadge(viewingPO.status)}
                </div>
                <p className="text-xs text-slate-500">Review vendor, receipt progress, and commercial position.</p>
              </div>
              <button onClick={closeDialog} className="rounded p-2 text-slate-500 hover:bg-slate-100">
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
                        <div className="mt-1 text-sm font-medium text-slate-900">{viewingPO.vendorName}</div>
                        <div className="text-sm text-slate-600">Terms: {formatTerms(viewingPO.paymentTerms)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Schedule</div>
                        <div className="mt-1 text-sm text-slate-700">Order: {formatDatePK(viewingPO.orderDate)}</div>
                        <div className="text-sm text-slate-700">Expected: {formatDatePK(viewingPO.expectedDeliveryDate)}</div>
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
                            <th className={`${tableHeadClass} text-right`}>Rate</th>
                            <th className={`${tableHeadClass} text-right`}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingPO.items.map((item) => {
                            const receivedQuantity = item.receivedQuantity ?? viewingPO.receivedQuantities?.[item.purchaseItemId] ?? 0;
                            const closedQuantity = item.closedQuantity ?? 0;
                            return (
                              <tr key={item.id} className="border-t border-slate-200">
                                <td className={tableCellClass}>
                                  <div className="font-medium text-slate-900">{item.itemName}</div>
                                  <div className="text-xs text-slate-500">{item.unit}</div>
                                </td>
                                <td className={`${tableCellClass} text-right`}>{item.quantity}</td>
                                <td className={`${tableCellClass} text-right`}>{receivedQuantity}</td>
                                <td className={`${tableCellClass} text-right`}>{closedQuantity > 0 ? closedQuantity : '-'}</td>
                                <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(item.ratePerUnit)}</td>
                                <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                                  {formatCurrencyPKR(item.amount)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                          <tr>
                            <td colSpan={5} className="px-3 py-2 text-right text-sm font-semibold text-slate-900">
                              Total
                            </td>
                            <td className="px-3 py-2 text-right text-sm font-semibold text-blue-700">
                              {formatCurrencyPKR(viewingPO.totalAmount)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </section>

                  <section className="rounded border border-slate-200">
                    <div className="border-b border-slate-200 px-4 py-2">
                      <h3 className="text-sm font-semibold text-slate-900">Receipt Activity</h3>
                    </div>
                    {viewingOrderGrns.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-500">No GRNs have been posted against this PO yet.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className={tableHeadClass}>GRN</th>
                              <th className={tableHeadClass}>Receipt Date</th>
                              <th className={`${tableHeadClass} text-right`}>Accepted Qty</th>
                              <th className={tableHeadClass}>Quality</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewingOrderGrns.map((grn) => (
                              <tr key={grn.id} className="border-t border-slate-200">
                                <td className={tableCellClass}>{grn.grnNumber}</td>
                                <td className={tableCellClass}>{formatDatePK(grn.receiptDate)}</td>
                                <td className={`${tableCellClass} text-right`}>
                                  {grn.items.reduce((sum, item) => sum + item.acceptedQuantity, 0)}
                                </td>
                                <td className={tableCellClass}>{getStatusBadge(grn.qualityCheckStatus)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  {viewingPO.remarks ? (
                    <section className="rounded border border-slate-200 bg-slate-50 p-4">
                      <h3 className="mb-2 text-sm font-semibold text-slate-900">Notes</h3>
                      <p className="text-sm text-slate-700">{viewingPO.remarks}</p>
                    </section>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <section className="rounded border border-slate-200 bg-slate-50 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">PO Summary</h3>
                    <div className="space-y-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between">
                        <span>Receipt Progress</span>
                        <span className="font-medium text-slate-900">
                          {viewingOrderRow?.receiptPercentage ?? 0}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Ordered Units</span>
                        <span className="font-medium text-slate-900">
                          {viewingOrderRow?.orderedQuantity ?? 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Received Units</span>
                        <span className="font-medium text-slate-900">
                          {viewingOrderRow?.receivedQuantity ?? 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Closed Units</span>
                        <span className="font-medium text-slate-900">
                          {viewingOrderRow?.closedQuantity ?? 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Pending Units</span>
                        <span className="font-medium text-slate-900">
                          {viewingOrderRow?.pendingQuantity ?? 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Amount Pending</span>
                        <span className="font-medium text-slate-900">{formatCurrencyPKR(viewingPO.amountPending)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>GRNs Posted</span>
                        <span className="font-medium text-slate-900">{viewingOrderRow?.grnCount ?? 0}</span>
                      </div>
                    </div>
                  </section>

                  <section className="rounded border border-slate-200 bg-white p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">Control Trail</h3>
                    <div className="space-y-3 text-sm text-slate-700">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created By</div>
                        <div className="mt-1">{viewingPO.createdBy}</div>
                        <div className="text-xs text-slate-500">{formatDatePK(viewingPO.createdAt)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approved By</div>
                        <div className="mt-1">{viewingPO.approvedBy || 'Pending approval'}</div>
                        <div className="text-xs text-slate-500">
                          {viewingPO.approvedAt ? formatDatePK(viewingPO.approvedAt) : 'No approval timestamp'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Updated</div>
                        <div className="mt-1">{formatDatePK(viewingPO.updatedAt)}</div>
                      </div>
                      {viewingPO.amendedAt ? (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amended</div>
                          <div className="mt-1">{viewingPO.amendedBy || 'Unknown user'}</div>
                          <div className="text-xs text-slate-500">{formatDatePK(viewingPO.amendedAt)}</div>
                        </div>
                      ) : null}
                      {viewingPO.shortClosedAt ? (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Short Closed</div>
                          <div className="mt-1">{viewingPO.shortClosedBy || 'Unknown user'}</div>
                          <div className="text-xs text-slate-500">
                            {formatDatePK(viewingPO.shortClosedAt)}
                            {viewingPO.shortCloseReason ? ` | ${viewingPO.shortCloseReason}` : ''}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </section>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button
                onClick={closeDialog}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              >
                Close
              </button>
              {viewingPO.status === 'draft' || viewingPO.status === 'approved' ? (
                <button
                  onClick={() => openEditDraftDialog(viewingPO)}
                  className="inline-flex items-center gap-2 rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                >
                  <Edit3 className="size-4" />
                  {viewingPO.status === 'approved' ? 'Correct PO' : 'Edit Draft'}
                </button>
              ) : null}
              {isPostReceiptOrderStatus(viewingPO.status) ? (
                <button
                  onClick={() => openEditDraftDialog(viewingPO)}
                  className="inline-flex items-center gap-2 rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                >
                  <Edit3 className="size-4" />
                  Amend PO
                </button>
              ) : null}
              {viewingPO.status === 'draft' ? (
                <button
                  onClick={() => handleApprovePO(viewingPO)}
                  className="rounded border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Approve PO
                </button>
              ) : null}
              {(viewingPO.status === 'draft' || viewingPO.status === 'approved') ? (
                <button
                  onClick={() => handleCancelPO(viewingPO)}
                  className="rounded border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Cancel PO
                </button>
              ) : null}
              {(viewingPO.status === 'approved' || viewingPO.status === 'partially-received') ? (
                <button
                  onClick={() => {
                    openGrnDialog(viewingPO);
                    closeDialog();
                  }}
                  className="rounded border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Create GRN
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
