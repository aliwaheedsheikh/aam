import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  Download,
  Search,
} from 'lucide-react';
import {
  GoodsReceipt,
  PurchaseItem,
  PurchaseOrder,
  StockTransfer,
  StoreLocation,
  StoreMaster as StoreMasterType,
  StoreStock,
  UnitMaster,
  Vendor,
} from '../kitchen/types';
import { formatCurrencyPKR, formatDatePK, formatNumberPK } from '../../lib/locale';
import { StockTransferDialog } from '../procurement/StockTransferDialog';
import { StoreMaster as StoreMasterScreen } from './StoreMaster';
import { buildStoreOptions, getStoreDisplayName } from '../../lib/storeMaster';
import { UnitMasterSetup } from '../kitchen/shared/UnitMasterSetup';

interface InventoryManagementProps {
  userName: string;
  initialTab?: InventoryTab;
  stores: StoreMasterType[];
  purchaseItems: PurchaseItem[];
  storeStocks: StoreStock[];
  stockTransfers: StockTransfer[];
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  goodsReceipts: GoodsReceipt[];
  units: UnitMaster[];
  onStoreStocksChange: (stocks: StoreStock[]) => void;
  onStockTransfersChange: (transfers: StockTransfer[]) => void;
  onStoresChange: (stores: StoreMasterType[]) => void;
  onUnitsChange: (units: UnitMaster[]) => void;
  onNavigate?: (route: string) => void;
  onBack: () => void;
}

type InventoryTab =
  | 'overview'
  | 'stock-levels'
  | 'stock-movement'
  | 'purchase-tracking'
  | 'store-master'
  | 'vendor-performance'
  | 'unit-setup';
type DateRangeFilter = 'all' | '7d' | '30d' | '90d';

const tabs: Array<{ id: InventoryTab; label: string; route: string }> = [
  { id: 'overview', label: 'Overview', route: 'inventory-stock' },
  { id: 'stock-levels', label: 'Current Stock', route: 'inventory-stock-levels' },
  { id: 'stock-movement', label: 'Stock Movements', route: 'inventory-stock-movement' },
  { id: 'store-master', label: 'Stores', route: 'inventory-stores' },
  { id: 'unit-setup', label: 'Unit Setup', route: 'inventory-unit-setup' },
];

const dateRangeOptions: Array<{ value: DateRangeFilter; label: string }> = [
  { value: 'all', label: 'All Dates' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
];

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-3 py-2 text-sm text-slate-700 align-middle';

const rangeDaysMap: Record<DateRangeFilter, number | null> = {
  all: null,
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const statusPriority: Record<string, number> = {
  Out: 0,
  Critical: 1,
  Low: 2,
  OK: 3,
  Healthy: 4,
};

const isPendingPurchaseStatus = (status: PurchaseOrder['status']) =>
  status === 'draft' || status === 'approved' || status === 'partially-received';

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

const getPurchaseDisplayUnit = (item?: PurchaseItem, fallbackUnit?: string) =>
  item?.purchaseUnitId || item?.purchaseUnit || item?.baseUnitId || item?.issueUnit || fallbackUnit || 'unit';

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
    'in-transit': 'bg-indigo-100 text-indigo-700',
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-slate-100 text-slate-700',
    blocked: 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${
        statusMap[status] || 'bg-slate-100 text-slate-700'
      }`}
    >
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
  <section className="overflow-hidden rounded border border-slate-200 bg-white">
    <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {actionLabel && onAction ? (
        <button onClick={onAction} className="text-xs font-medium text-blue-700 hover:text-blue-800">
          {actionLabel}
        </button>
      ) : null}
    </div>
    {children}
  </section>
);

const getTransferQuantity = (transfer: StockTransfer) =>
  transfer.items.reduce((sum, item) => sum + item.quantity, 0);

const getTransferAttentionMeta = (transfer: StockTransfer) => {
  if (transfer.status === 'pending') {
    return {
      priority: 1,
      label: 'Pending',
      detail: 'Awaiting issue or dispatch confirmation.',
    };
  }

  if (transfer.status === 'in-transit') {
    return {
      priority: 2,
      label: 'In Transit',
      detail: 'Transfer has left source store and needs receipt confirmation.',
    };
  }

  if (transfer.items.length >= 5) {
    return {
      priority: 3,
      label: 'Bulk Move',
      detail: `${transfer.items.length} line items moving in one document.`,
    };
  }

  if (transfer.status === 'cancelled') {
    return {
      priority: 5,
      label: 'Cancelled',
      detail: 'Transfer was cancelled and can be reviewed if repeated.',
    };
  }

  return {
    priority: 4,
    label: 'Closed',
    detail: 'Transfer has been received and posted.',
  };
};

const getStoreAttentionMeta = ({
  status,
  purpose,
  totalItems,
  lowStock,
  outOfStock,
  transferTouches,
}: {
  status: StoreMasterType['status'];
  purpose: StoreMasterType['purpose'];
  totalItems: number;
  lowStock: number;
  outOfStock: number;
  transferTouches: number;
}) => {
  if (status === 'inactive') {
    return {
      priority: 1,
      label: 'Inactive',
      detail: 'Store is not available for fresh inventory activity.',
    };
  }

  if (outOfStock > 0) {
    return {
      priority: 1,
      label: 'Stockout',
      detail: `${outOfStock} item${outOfStock === 1 ? '' : 's'} at zero stock.`,
    };
  }

  if (lowStock > 0) {
    return {
      priority: 2,
      label: 'Refill',
      detail: `${lowStock} item${lowStock === 1 ? '' : 's'} below reorder.`,
    };
  }

  if (transferTouches >= 6) {
    return {
      priority: 3,
      label: 'Busy',
      detail: `${transferTouches} transfer touchpoints in the selected period.`,
    };
  }

  if (purpose === 'production') {
    return {
      priority: 4,
      label: 'Production',
      detail: 'Operational store supporting issue and kitchen demand.',
    };
  }

  if (totalItems === 0) {
    return {
      priority: 4,
      label: 'Dormant',
      detail: 'No active stock rows in the selected scope.',
    };
  }

  return {
    priority: 5,
    label: 'Stable',
    detail: 'Coverage looks healthy for the current filters.',
  };
};

const getVendorAttentionMeta = ({
  status,
  qualityRejections,
  pendingPOs,
  onTimePercentage,
  totalPOs,
}: {
  status: Vendor['status'];
  qualityRejections: number;
  pendingPOs: number;
  onTimePercentage: number;
  totalPOs: number;
}) => {
  if (status === 'blocked') {
    return {
      priority: 1,
      label: 'Blocked',
      detail: 'Vendor is blocked from active purchasing.',
    };
  }

  if (status === 'inactive') {
    return {
      priority: 2,
      label: 'Inactive',
      detail: 'Vendor profile is inactive and needs review.',
    };
  }

  if (qualityRejections > 0) {
    return {
      priority: 1,
      label: 'Quality',
      detail: `${qualityRejections} rejected unit${qualityRejections === 1 ? '' : 's'} recorded.`,
    };
  }

  if (pendingPOs >= 3) {
    return {
      priority: 2,
      label: 'Load',
      detail: `${pendingPOs} open purchase order${pendingPOs === 1 ? '' : 's'} in progress.`,
    };
  }

  if (totalPOs >= 2 && onTimePercentage < 60) {
    return {
      priority: 2,
      label: 'Delay Risk',
      detail: 'Delivery timeliness is below the expected range.',
    };
  }

  return {
    priority: 5,
    label: 'Stable',
    detail: 'No immediate vendor follow-up required.',
  };
};

const getGrnStoreSummary = (stores: StoreMasterType[], grn: GoodsReceipt) => {
  const storeIds = Array.from(
    new Set(
      grn.items
        .map((item) => item.destinationStore || grn.destinationStore)
        .filter((store): store is NonNullable<typeof store> => Boolean(store)),
    ),
  );

  return storeIds.map((store) => getStoreDisplayName(stores, store)).join(', ');
};

const EmptyTableRow = ({ colSpan, message }: { colSpan: number; message: string }) => (
  <tr>
    <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={colSpan}>
      {message}
    </td>
  </tr>
);

export function InventoryManagement({
  userName,
  initialTab = 'overview',
  stores = [],
  purchaseItems = [],
  storeStocks = [],
  stockTransfers = [],
  purchaseOrders = [],
  vendors = [],
  goodsReceipts = [],
  units = [],
  onStoreStocksChange,
  onStockTransfersChange,
  onStoresChange,
  onUnitsChange,
  onNavigate,
  onBack,
}: InventoryManagementProps) {
  const [activeTab, setActiveTab] = useState<InventoryTab>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState<StoreLocation | 'all'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'critical'>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('30d');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (tabId: InventoryTab) => {
    setActiveTab(tabId);
    const matchingTab = tabs.find((tab) => tab.id === tabId);
    if (matchingTab) {
      onNavigate?.(matchingTab.route);
    }
  };

  const openPurchaseWorkspace = () => {
    onNavigate?.('procurement-management');
  };

  const currentTabLabel = tabs.find((tab) => tab.id === activeTab)?.label || 'Overview';

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const storeOptions = useMemo(() => buildStoreOptions(stores), [stores]);

  const purchaseItemLookup = useMemo(
    () => new Map(purchaseItems.map((purchaseItem) => [purchaseItem.id, purchaseItem])),
    [purchaseItems],
  );

  const storeUniverse = useMemo(() => {
    const ids = new Set<string>([
      ...stores.map((store) => store.id),
      ...storeStocks.map((stock) => stock.storeLocation),
      ...stockTransfers.flatMap((transfer) => [transfer.fromStore, transfer.toStore]),
      ...goodsReceipts.flatMap((grn) =>
        grn.items
          .map((item) => item.destinationStore || grn.destinationStore)
          .filter((store): store is string => Boolean(store)),
      ),
    ]);

    return Array.from(ids).map((id) => {
      const matchingStore = stores.find((store) => store.id === id);

      return {
        id: id as StoreLocation,
        code: matchingStore?.code || id,
        name: matchingStore?.name || getStoreDisplayName(stores, id),
        purpose: matchingStore?.purpose || ('storage' as const),
        kind: matchingStore?.kind || ('store' as const),
        status: matchingStore?.status || ('active' as const),
      };
    });
  }, [goodsReceipts, stockTransfers, storeStocks, stores]);

  const storeMetaById = useMemo(
    () => new Map(storeUniverse.map((store) => [store.id, store])),
    [storeUniverse],
  );

  const inventoryRows = useMemo(() => {
    return storeStocks
      .filter((stock) => selectedStore === 'all' || stock.storeLocation === selectedStore)
      .map((stock) => {
        const item = purchaseItemLookup.get(stock.purchaseItemId);
        const storeMeta = storeMetaById.get(stock.storeLocation);
        const status = getStockStatusMeta(stock.currentStock, stock.reorderLevel);
        const stockValue = stock.currentStock * (item?.ratePerUnit ?? item?.lastPurchaseRate ?? 0);

        return {
          ...stock,
          itemCode: item?.itemCode || '--',
          unit: getPurchaseDisplayUnit(item, stock.unit),
          storeName: storeMeta?.name || getStoreDisplayName(stores, stock.storeLocation),
          stockValue,
          status,
          statusRank: statusPriority[status.label] ?? 99,
        };
      });
  }, [purchaseItemLookup, selectedStore, storeMetaById, storeStocks, stores]);

  const filteredStockRows = useMemo(() => {
    return inventoryRows
      .filter((stock) => {
        const matchesSearch =
          !normalizedSearch ||
          stock.itemName.toLowerCase().includes(normalizedSearch) ||
          stock.itemCode.toLowerCase().includes(normalizedSearch) ||
          stock.storeName.toLowerCase().includes(normalizedSearch);

        const matchesFilter =
          stockFilter === 'all' ||
          (stockFilter === 'low' && stock.status.label === 'Low') ||
          (stockFilter === 'critical' && (stock.status.label === 'Critical' || stock.status.label === 'Out'));

        return matchesSearch && matchesFilter;
      })
      .sort((left, right) => {
        if (left.statusRank !== right.statusRank) {
          return left.statusRank - right.statusRank;
        }
        if (left.stockValue !== right.stockValue) {
          return right.stockValue - left.stockValue;
        }
        return left.itemName.localeCompare(right.itemName);
      });
  }, [inventoryRows, normalizedSearch, stockFilter]);

  const filteredMovementRows = useMemo(() => {
    return [...stockTransfers]
      .filter((transfer) => {
        const inRange = isWithinDateRange(new Date(transfer.transferDate), dateRange);
        const storeMatch =
          selectedStore === 'all' || transfer.fromStore === selectedStore || transfer.toStore === selectedStore;
        const fromStoreName =
          storeMetaById.get(transfer.fromStore)?.name || getStoreDisplayName(stores, transfer.fromStore);
        const toStoreName =
          storeMetaById.get(transfer.toStore)?.name || getStoreDisplayName(stores, transfer.toStore);
        const matchesSearch =
          !normalizedSearch ||
          transfer.transferNumber.toLowerCase().includes(normalizedSearch) ||
          fromStoreName.toLowerCase().includes(normalizedSearch) ||
          toStoreName.toLowerCase().includes(normalizedSearch) ||
          transfer.items.some((item) => item.itemName.toLowerCase().includes(normalizedSearch));

        return inRange && storeMatch && matchesSearch;
      })
      .map((transfer) => {
        const fromStoreName =
          storeMetaById.get(transfer.fromStore)?.name || getStoreDisplayName(stores, transfer.fromStore);
        const toStoreName =
          storeMetaById.get(transfer.toStore)?.name || getStoreDisplayName(stores, transfer.toStore);

        return {
          ...transfer,
          fromStoreName,
          toStoreName,
          totalQuantity: getTransferQuantity(transfer),
          attention: getTransferAttentionMeta(transfer),
        };
      })
      .sort((left, right) => new Date(right.transferDate).getTime() - new Date(left.transferDate).getTime());
  }, [dateRange, normalizedSearch, selectedStore, stockTransfers, storeMetaById, stores]);

  const recentReceiptRows = useMemo(() => {
    return [...goodsReceipts]
      .filter((grn) => {
        const inRange = isWithinDateRange(new Date(grn.receiptDate), dateRange);
        const storeMatch =
          selectedStore === 'all' ||
          grn.destinationStore === selectedStore ||
          grn.items.some((item) => item.destinationStore === selectedStore);
        const matchesSearch =
          !normalizedSearch ||
          grn.grnNumber.toLowerCase().includes(normalizedSearch) ||
          grn.poNumber.toLowerCase().includes(normalizedSearch) ||
          grn.vendorName.toLowerCase().includes(normalizedSearch);

        return inRange && storeMatch && matchesSearch;
      })
      .map((grn) => ({
        ...grn,
        acceptedValue: grn.items.reduce((sum, item) => sum + item.totalValue, 0),
        rejectedQuantity: grn.items.reduce((sum, item) => sum + item.rejectedQuantity, 0),
        storeSummary: getGrnStoreSummary(stores, grn),
      }))
      .sort((left, right) => new Date(right.receiptDate).getTime() - new Date(left.receiptDate).getTime());
  }, [dateRange, goodsReceipts, normalizedSearch, selectedStore, stores]);

  const purchaseTrackingRows = useMemo(() => {
    return purchaseOrders
      .filter((purchaseOrder) => purchaseOrder.status !== 'cancelled')
      .map((purchaseOrder) => {
        const relatedGrns = goodsReceipts.filter((grn) => grn.purchaseOrderId === purchaseOrder.id);
        const totalReceived = relatedGrns.reduce(
          (sum, grn) => sum + grn.items.reduce((itemSum, item) => itemSum + item.acceptedQuantity, 0),
          0,
        );
        const totalClosed = purchaseOrder.items.reduce((sum, item) => sum + (item.closedQuantity ?? 0), 0);
        const totalOrdered = purchaseOrder.items.reduce((sum, item) => sum + item.quantity, 0);
        const expectedStoreLabels = Array.from(
          new Set(
            purchaseOrder.items
              .map((item) => purchaseItemLookup.get(item.purchaseItemId)?.storeLocation)
              .filter((storeId): storeId is string => Boolean(storeId))
              .map((storeId) => getStoreDisplayName(stores, storeId)),
          ),
        );

        const isLate =
          isPendingPurchaseStatus(purchaseOrder.status) &&
          new Date(purchaseOrder.expectedDeliveryDate).getTime() < new Date().getTime();

        return {
          ...purchaseOrder,
          totalReceived,
          totalClosed,
          totalOrdered,
          percentageReceived: totalOrdered > 0 ? ((totalReceived + totalClosed) / totalOrdered) * 100 : 0,
          grnsCount: relatedGrns.length,
          isLate,
          expectedStores: expectedStoreLabels.join(', ') || 'Unassigned',
        };
      })
      .filter((purchaseOrder) => {
        const inRange = isWithinDateRange(new Date(purchaseOrder.orderDate), dateRange);
        const matchesSearch =
          !normalizedSearch ||
          purchaseOrder.poNumber.toLowerCase().includes(normalizedSearch) ||
          purchaseOrder.vendorName.toLowerCase().includes(normalizedSearch) ||
          purchaseOrder.expectedStores.toLowerCase().includes(normalizedSearch);

        return inRange && matchesSearch;
      })
      .sort((left, right) => {
        if (Number(right.isLate) !== Number(left.isLate)) {
          return Number(right.isLate) - Number(left.isLate);
        }
        return new Date(right.orderDate).getTime() - new Date(left.orderDate).getTime();
      });
  }, [dateRange, goodsReceipts, normalizedSearch, purchaseItemLookup, purchaseOrders, stores]);

  const vendorPerformanceRows = useMemo(() => {
    return vendors
      .map((vendor) => {
        const vendorPOs = purchaseTrackingRows.filter((purchaseOrder) => purchaseOrder.vendorId === vendor.id);
        const completedPOs = vendorPOs.filter(
          (purchaseOrder) => purchaseOrder.status === 'received' || purchaseOrder.status === 'closed',
        ).length;
        const pendingPOs = vendorPOs.filter((purchaseOrder) => isPendingPurchaseStatus(purchaseOrder.status)).length;
        const onTimeDeliveries = vendorPOs.filter((purchaseOrder) => {
          if (purchaseOrder.status !== 'received' && purchaseOrder.status !== 'closed') {
            return false;
          }

          const firstGrn = goodsReceipts.find((receipt) => receipt.purchaseOrderId === purchaseOrder.id);
          if (!firstGrn) {
            return false;
          }

          return new Date(firstGrn.receiptDate) <= new Date(purchaseOrder.expectedDeliveryDate);
        }).length;
        const qualityRejections = recentReceiptRows
          .filter((receipt) => receipt.vendorId === vendor.id)
          .reduce((sum, receipt) => sum + receipt.rejectedQuantity, 0);
        const onTimePercentage = vendorPOs.length > 0 ? (onTimeDeliveries / vendorPOs.length) * 100 : 0;
        const attention = getVendorAttentionMeta({
          status: vendor.status,
          qualityRejections,
          pendingPOs,
          onTimePercentage,
          totalPOs: vendorPOs.length,
        });
        const matchesSearch =
          !normalizedSearch ||
          vendor.vendorName.toLowerCase().includes(normalizedSearch) ||
          vendor.vendorCode.toLowerCase().includes(normalizedSearch) ||
          vendor.contactPerson.toLowerCase().includes(normalizedSearch);

        return {
          ...vendor,
          totalPOs: vendorPOs.length,
          pendingPOs,
          completedPOs,
          onTimePercentage,
          qualityRejections,
          completionRate: vendorPOs.length > 0 ? (completedPOs / vendorPOs.length) * 100 : 0,
          attention,
          matchesSearch,
        };
      })
      .filter((vendor) => vendor.matchesSearch && (vendor.totalPOs > 0 || vendor.status !== 'active'))
      .sort((left, right) => {
        if (left.attention.priority !== right.attention.priority) {
          return left.attention.priority - right.attention.priority;
        }
        return right.totalPurchases - left.totalPurchases;
      });
  }, [goodsReceipts, normalizedSearch, purchaseTrackingRows, recentReceiptRows, vendors]);

  const storeCoverageRows = useMemo(() => {
    return storeUniverse
      .filter((store) => selectedStore === 'all' || store.id === selectedStore)
      .map((store) => {
        const storeRows = storeStocks.filter((stock) => stock.storeLocation === store.id);
        const totalValue = storeRows.reduce((sum, stock) => {
          const item = purchaseItemLookup.get(stock.purchaseItemId);
          return sum + stock.currentStock * (item?.ratePerUnit ?? item?.lastPurchaseRate ?? 0);
        }, 0);
        const lowStock = storeRows.filter((stock) => {
          const status = getStockStatusMeta(stock.currentStock, stock.reorderLevel);
          return status.label === 'Low' || status.label === 'Critical' || status.label === 'Out';
        }).length;
        const outOfStock = storeRows.filter((stock) => stock.currentStock <= 0).length;
        const transferTouches = filteredMovementRows.filter(
          (transfer) => transfer.fromStore === store.id || transfer.toStore === store.id,
        ).length;
        const attention = getStoreAttentionMeta({
          status: store.status,
          purpose: store.purpose,
          totalItems: storeRows.length,
          lowStock,
          outOfStock,
          transferTouches,
        });
        const matchesSearch =
          !normalizedSearch ||
          store.name.toLowerCase().includes(normalizedSearch) ||
          store.code.toLowerCase().includes(normalizedSearch);

        return {
          ...store,
          totalItems: storeRows.length,
          lowStock,
          outOfStock,
          totalValue,
          transferTouches,
          attention,
          matchesSearch,
        };
      })
      .filter(
        (store) =>
          store.matchesSearch &&
          (selectedStore !== 'all' ||
            store.totalItems > 0 ||
            store.transferTouches > 0 ||
            store.status !== 'active'),
      )
      .sort((left, right) => {
        if (left.attention.priority !== right.attention.priority) {
          return left.attention.priority - right.attention.priority;
        }
        return right.totalValue - left.totalValue;
      });
  }, [filteredMovementRows, normalizedSearch, purchaseItemLookup, selectedStore, storeStocks, storeUniverse]);

  const criticalStockRows = useMemo(
    () =>
      filteredStockRows
        .filter((row) => row.status.label === 'Out' || row.status.label === 'Critical' || row.status.label === 'Low')
        .slice(0, 10),
    [filteredStockRows],
  );

  const topValueStockRows = useMemo(
    () => [...filteredStockRows].sort((left, right) => right.stockValue - left.stockValue).slice(0, 8),
    [filteredStockRows],
  );

  const activeTransferQueue = useMemo(
    () => filteredMovementRows.filter((movement) => movement.status !== 'received').slice(0, 8),
    [filteredMovementRows],
  );

  const routeActivityRows = useMemo(() => {
    const routeMap = new Map<
      string,
      {
        routeKey: string;
        fromStoreName: string;
        toStoreName: string;
        movements: number;
        totalQuantity: number;
        activeDocuments: number;
        lastTransferDate: Date;
      }
    >();

    filteredMovementRows.forEach((movement) => {
      const routeKey = `${movement.fromStore}__${movement.toStore}`;
      const current = routeMap.get(routeKey);

      if (current) {
        current.movements += 1;
        current.totalQuantity += movement.totalQuantity;
        current.activeDocuments += movement.status === 'received' ? 0 : 1;
        if (new Date(movement.transferDate).getTime() > current.lastTransferDate.getTime()) {
          current.lastTransferDate = new Date(movement.transferDate);
        }
        return;
      }

      routeMap.set(routeKey, {
        routeKey,
        fromStoreName: movement.fromStoreName,
        toStoreName: movement.toStoreName,
        movements: 1,
        totalQuantity: movement.totalQuantity,
        activeDocuments: movement.status === 'received' ? 0 : 1,
        lastTransferDate: new Date(movement.transferDate),
      });
    });

    return Array.from(routeMap.values())
      .sort((left, right) => {
        if (left.activeDocuments !== right.activeDocuments) {
          return right.activeDocuments - left.activeDocuments;
        }
        return right.movements - left.movements;
      })
      .slice(0, 8);
  }, [filteredMovementRows]);

  const purchaseFollowUpRows = useMemo(
    () => purchaseTrackingRows.filter((purchaseOrder) => isPendingPurchaseStatus(purchaseOrder.status)).slice(0, 8),
    [purchaseTrackingRows],
  );

  const vendorSupportRows = useMemo(() => vendorPerformanceRows.slice(0, 8), [vendorPerformanceRows]);

  const stockHealthCounts = useMemo(
    () =>
      inventoryRows.reduce(
        (summary, row) => {
          if (row.status.label === 'Out') {
            summary.out += 1;
          } else if (row.status.label === 'Critical') {
            summary.critical += 1;
          } else if (row.status.label === 'Low') {
            summary.low += 1;
          } else {
            summary.healthy += 1;
          }
          return summary;
        },
        { out: 0, critical: 0, low: 0, healthy: 0 },
      ),
    [inventoryRows],
  );

  const metrics = useMemo(
    () => ({
      visibleStores: storeCoverageRows.length,
      stockRows: inventoryRows.length,
      totalValue: inventoryRows.reduce((sum, row) => sum + row.stockValue, 0),
      lowStock: stockHealthCounts.low + stockHealthCounts.critical + stockHealthCounts.out,
      critical: stockHealthCounts.critical + stockHealthCounts.out,
      inTransit: filteredMovementRows.filter((movement) => movement.status === 'in-transit').length,
      pendingTransfers: filteredMovementRows.filter((movement) => movement.status === 'pending').length,
      pendingPOs: purchaseFollowUpRows.length,
      recentGrns: recentReceiptRows.length,
    }),
    [filteredMovementRows, inventoryRows, purchaseFollowUpRows.length, recentReceiptRows.length, stockHealthCounts, storeCoverageRows.length],
  );

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
            <p className="text-xs text-slate-500">Stocks &gt; {currentTabLabel}</p>
          </div>
          <select
            value={selectedStore}
            onChange={(event) => setSelectedStore(event.target.value as StoreLocation | 'all')}
            className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            <option value="all">All Stores</option>
            {storeOptions.map((store) => (
              <option key={store.id} value={store.id}>
                {store.hierarchyLabel}
              </option>
            ))}
          </select>
          <select
            value={dateRange}
            onChange={(event) => setDateRange(event.target.value as DateRangeFilter)}
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
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search item, store, PO, GRN, vendor, or transfer"
              className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={() => setTransferDialogOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded border border-blue-600 bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            <ArrowRightLeft className="size-4" />
            New Transfer
          </button>
          <button className="inline-flex h-9 items-center gap-2 rounded border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Download className="size-4" />
            Export
          </button>
        </div>

        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              <strong className="text-slate-900">Stores:</strong> {metrics.visibleStores}
            </span>
            <span>
              <strong className="text-slate-900">Stock Rows:</strong> {metrics.stockRows}
            </span>
            <span>
              <strong className="text-slate-900">Value:</strong> {compactCurrency(metrics.totalValue)}
            </span>
            <span>
              <strong className="text-slate-900">Low Stock:</strong> {metrics.lowStock}
            </span>
            <span>
              <strong className="text-slate-900">Critical:</strong> {metrics.critical}
            </span>
            <span>
              <strong className="text-slate-900">In Transit:</strong> {metrics.inTransit}
            </span>
            <span>
              <strong className="text-slate-900">Pending Transfers:</strong> {metrics.pendingTransfers}
            </span>
            <span>
              <strong className="text-slate-900">Pending PO:</strong> {metrics.pendingPOs}
            </span>
            <span>
              <strong className="text-slate-900">GRNs:</strong> {metrics.recentGrns}
            </span>
            <span>
              <strong className="text-slate-900">User:</strong> {userName}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 border-t border-slate-200 px-4 py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        {activeTab === 'overview' && (
          <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto xl:grid-cols-2">
            <CompactSection title="Store Coverage" actionLabel="Open Stores" onAction={() => handleTabChange('store-master')}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Store</th>
                      <th className={tableHeadClass}>Focus</th>
                      <th className={`${tableHeadClass} text-right`}>Items</th>
                      <th className={`${tableHeadClass} text-right`}>Value</th>
                      <th className={`${tableHeadClass} text-right`}>Low</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storeCoverageRows.slice(0, 8).map((store) => (
                      <tr key={store.id} className="border-t border-slate-200">
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{store.name}</div>
                          <div className="text-xs text-slate-500 capitalize">
                            {store.kind === 'sub-store' ? 'Sub-store' : 'Store'} · {store.purpose}
                          </div>
                        </td>
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{store.attention.label}</div>
                          <div className="text-xs text-slate-500">{store.attention.detail}</div>
                        </td>
                        <td className={`${tableCellClass} text-right`}>{store.totalItems}</td>
                        <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                          {compactCurrency(store.totalValue)}
                        </td>
                        <td className={`${tableCellClass} text-right`}>
                          {store.lowStock > 0 ? (
                            <span className="inline-flex rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                              {store.lowStock}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {storeCoverageRows.length === 0 ? (
                      <EmptyTableRow colSpan={5} message="No store coverage data found for the current filter." />
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CompactSection>

            <CompactSection
              title="Replenishment Watchlist"
              actionLabel="Open Stock Levels"
              onAction={() => handleTabChange('stock-levels')}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Item</th>
                      <th className={tableHeadClass}>Store</th>
                      <th className={`${tableHeadClass} text-right`}>Current</th>
                      <th className={`${tableHeadClass} text-right`}>Reorder</th>
                      <th className={tableHeadClass}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalStockRows.map((row) => (
                      <tr key={`${row.storeLocation}-${row.purchaseItemId}`} className="border-t border-slate-200">
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{row.itemName}</div>
                          <div className="text-xs text-slate-500">{row.itemCode}</div>
                        </td>
                        <td className={tableCellClass}>{row.storeName}</td>
                        <td className={`${tableCellClass} text-right ${row.status.textClass}`}>
                          {formatNumberPK(row.currentStock)} {row.unit}
                        </td>
                        <td className={`${tableCellClass} text-right`}>
                          {formatNumberPK(row.reorderLevel)} {row.unit}
                        </td>
                        <td className={tableCellClass}>
                          <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${row.status.badgeClass}`}>
                            {row.status.label}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {criticalStockRows.length === 0 ? (
                      <EmptyTableRow colSpan={5} message="No replenishment alerts found for the current filter." />
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CompactSection>

            <CompactSection
              title="Transfer Control Tower"
              actionLabel="Open Movements"
              onAction={() => handleTabChange('stock-movement')}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Transfer</th>
                      <th className={tableHeadClass}>Route</th>
                      <th className={`${tableHeadClass} text-right`}>Qty</th>
                      <th className={tableHeadClass}>Focus</th>
                      <th className={tableHeadClass}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovementRows.slice(0, 8).map((movement) => (
                      <tr key={movement.id} className="border-t border-slate-200">
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{movement.transferNumber}</div>
                          <div className="text-xs text-slate-500">{formatDatePK(movement.transferDate)}</div>
                        </td>
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{movement.fromStoreName}</div>
                          <div className="text-xs text-slate-500">to {movement.toStoreName}</div>
                        </td>
                        <td className={`${tableCellClass} text-right`}>
                          {formatNumberPK(movement.totalQuantity)}
                        </td>
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{movement.attention.label}</div>
                          <div className="text-xs text-slate-500">{movement.attention.detail}</div>
                        </td>
                        <td className={tableCellClass}>{getStatusBadge(movement.status)}</td>
                      </tr>
                    ))}
                    {filteredMovementRows.length === 0 ? (
                      <EmptyTableRow colSpan={5} message="No movement records found for the current filter." />
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CompactSection>

            <CompactSection
              title="Inbound Purchase Follow-up"
              actionLabel="Open Purchase"
              onAction={openPurchaseWorkspace}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>PO No</th>
                      <th className={tableHeadClass}>Vendor</th>
                      <th className={tableHeadClass}>Stores</th>
                      <th className={`${tableHeadClass} text-right`}>Received</th>
                      <th className={tableHeadClass}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseFollowUpRows.map((purchaseOrder) => (
                      <tr key={purchaseOrder.id} className="border-t border-slate-200">
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{purchaseOrder.poNumber}</div>
                          <div className="text-xs text-slate-500">
                            ETA {formatDatePK(purchaseOrder.expectedDeliveryDate)}
                            {purchaseOrder.isLate ? ' · Late' : ''}
                          </div>
                        </td>
                        <td className={tableCellClass}>{purchaseOrder.vendorName}</td>
                        <td className={tableCellClass}>{purchaseOrder.expectedStores}</td>
                        <td className={`${tableCellClass} text-right`}>
                          {purchaseOrder.percentageReceived.toFixed(0)}%
                        </td>
                        <td className={tableCellClass}>{getStatusBadge(purchaseOrder.status)}</td>
                      </tr>
                    ))}
                    {purchaseFollowUpRows.length === 0 ? (
                      <EmptyTableRow colSpan={5} message="No purchase follow-up items found for the current filter." />
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CompactSection>

            <div className="xl:col-span-2">
              <CompactSection
                title="Top Value Stock"
                actionLabel="Open Stock Levels"
                onAction={() => handleTabChange('stock-levels')}
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Item</th>
                        <th className={tableHeadClass}>Store</th>
                        <th className={`${tableHeadClass} text-right`}>Current</th>
                        <th className={`${tableHeadClass} text-right`}>Value</th>
                        <th className={tableHeadClass}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topValueStockRows.map((row) => (
                        <tr key={`${row.storeLocation}-${row.purchaseItemId}`} className="border-t border-slate-200">
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{row.itemName}</div>
                            <div className="text-xs text-slate-500">{row.itemCode}</div>
                          </td>
                          <td className={tableCellClass}>{row.storeName}</td>
                          <td className={`${tableCellClass} text-right`}>
                            {formatNumberPK(row.currentStock)} {row.unit}
                          </td>
                          <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                            {formatCurrencyPKR(row.stockValue)}
                          </td>
                          <td className={tableCellClass}>
                            <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${row.status.badgeClass}`}>
                              {row.status.label}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {topValueStockRows.length === 0 ? (
                        <EmptyTableRow colSpan={5} message="No stock valuation rows found for the current filter." />
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CompactSection>
            </div>
          </div>
        )}

        {activeTab === 'stock-levels' && (
          <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="overflow-hidden rounded border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Stock Register</h3>
                  <p className="text-xs text-slate-500">{filteredStockRows.length} visible row(s)</p>
                </div>
                <select
                  value={stockFilter}
                  onChange={(event) => setStockFilter(event.target.value as 'all' | 'low' | 'critical')}
                  className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700"
                >
                  <option value="all">All Levels</option>
                  <option value="low">Low Stock</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="h-[calc(100%-57px)] overflow-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Item</th>
                      <th className={tableHeadClass}>Code</th>
                      <th className={tableHeadClass}>Store</th>
                      <th className={`${tableHeadClass} text-right`}>Current</th>
                      <th className={`${tableHeadClass} text-right`}>Reorder</th>
                      <th className={tableHeadClass}>Status</th>
                      <th className={`${tableHeadClass} text-right`}>Value</th>
                      <th className={tableHeadClass}>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStockRows.map((row) => (
                      <tr key={`${row.storeLocation}-${row.purchaseItemId}`} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className={tableCellClass}>{row.itemName}</td>
                        <td className={`${tableCellClass} text-slate-500`}>{row.itemCode}</td>
                        <td className={tableCellClass}>{row.storeName}</td>
                        <td className={`${tableCellClass} text-right ${row.status.textClass}`}>
                          {formatNumberPK(row.currentStock)} {row.unit}
                        </td>
                        <td className={`${tableCellClass} text-right`}>
                          {formatNumberPK(row.reorderLevel)} {row.unit}
                        </td>
                        <td className={tableCellClass}>
                          <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${row.status.badgeClass}`}>
                            {row.status.label}
                          </span>
                        </td>
                        <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                          {formatCurrencyPKR(row.stockValue)}
                        </td>
                        <td className={tableCellClass}>{formatDatePK(row.lastUpdated)}</td>
                      </tr>
                    ))}
                    {filteredStockRows.length === 0 ? (
                      <EmptyTableRow colSpan={8} message="No stock rows found for the current filter." />
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid h-full grid-cols-1 gap-4 overflow-hidden">
              <CompactSection title="Inventory Attention">
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Item</th>
                        <th className={tableHeadClass}>Focus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {criticalStockRows.map((row) => (
                        <tr key={`${row.storeLocation}-${row.purchaseItemId}`} className="border-t border-slate-200">
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{row.itemName}</div>
                            <div className="text-xs text-slate-500">{row.storeName}</div>
                          </td>
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{row.status.label}</div>
                            <div className="text-xs text-slate-500">
                              {formatNumberPK(row.currentStock)} / {formatNumberPK(row.reorderLevel)} {row.unit}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {criticalStockRows.length === 0 ? (
                        <EmptyTableRow colSpan={2} message="No inventory alerts found for the current filter." />
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CompactSection>

              <CompactSection title="Store Snapshot">
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Store</th>
                        <th className={`${tableHeadClass} text-right`}>Items</th>
                        <th className={`${tableHeadClass} text-right`}>Low</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storeCoverageRows.slice(0, 8).map((store) => (
                        <tr key={store.id} className="border-t border-slate-200">
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{store.name}</div>
                            <div className="text-xs text-slate-500">{store.attention.label}</div>
                          </td>
                          <td className={`${tableCellClass} text-right`}>{store.totalItems}</td>
                          <td className={`${tableCellClass} text-right`}>{store.lowStock}</td>
                        </tr>
                      ))}
                      {storeCoverageRows.length === 0 ? (
                        <EmptyTableRow colSpan={3} message="No store snapshot data found for the current filter." />
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CompactSection>
            </div>
          </div>
        )}

        {activeTab === 'stock-movement' && (
          <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="overflow-hidden rounded border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Movement Register</h3>
                  <p className="text-xs text-slate-500">{filteredMovementRows.length} visible transfer(s)</p>
                </div>
                <button
                  onClick={() => setTransferDialogOpen(true)}
                  className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  New Transfer
                </button>
              </div>
              <div className="h-[calc(100%-57px)] overflow-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Ref</th>
                      <th className={tableHeadClass}>Date</th>
                      <th className={tableHeadClass}>From</th>
                      <th className={tableHeadClass}>To</th>
                      <th className={`${tableHeadClass} text-right`}>Qty</th>
                      <th className={tableHeadClass}>Issued By</th>
                      <th className={tableHeadClass}>Focus</th>
                      <th className={tableHeadClass}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovementRows.map((movement) => (
                      <tr key={movement.id} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className={tableCellClass}>{movement.transferNumber}</td>
                        <td className={tableCellClass}>{formatDatePK(movement.transferDate)}</td>
                        <td className={tableCellClass}>{movement.fromStoreName}</td>
                        <td className={tableCellClass}>{movement.toStoreName}</td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(movement.totalQuantity)}</td>
                        <td className={tableCellClass}>
                          <div className="text-slate-900">{movement.issuedBy}</div>
                          <div className="text-xs text-slate-500">{movement.receivedBy || '--'}</div>
                        </td>
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{movement.attention.label}</div>
                          <div className="text-xs text-slate-500">{movement.attention.detail}</div>
                        </td>
                        <td className={tableCellClass}>{getStatusBadge(movement.status)}</td>
                      </tr>
                    ))}
                    {filteredMovementRows.length === 0 ? (
                      <EmptyTableRow colSpan={8} message="No transfers found for the current filter." />
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid h-full grid-cols-1 gap-4 overflow-hidden">
              <CompactSection title="Transit Queue">
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Transfer</th>
                        <th className={tableHeadClass}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTransferQueue.map((movement) => (
                        <tr key={movement.id} className="border-t border-slate-200">
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{movement.transferNumber}</div>
                            <div className="text-xs text-slate-500">
                              {movement.fromStoreName} to {movement.toStoreName}
                            </div>
                          </td>
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{movement.attention.label}</div>
                            <div className="text-xs text-slate-500">{formatDatePK(movement.transferDate)}</div>
                          </td>
                        </tr>
                      ))}
                      {activeTransferQueue.length === 0 ? (
                        <EmptyTableRow colSpan={2} message="No open transfers found for the current filter." />
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CompactSection>

              <CompactSection title="Route Activity">
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Route</th>
                        <th className={`${tableHeadClass} text-right`}>Moves</th>
                        <th className={`${tableHeadClass} text-right`}>Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routeActivityRows.map((route) => (
                        <tr key={route.routeKey} className="border-t border-slate-200">
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{route.fromStoreName}</div>
                            <div className="text-xs text-slate-500">to {route.toStoreName}</div>
                          </td>
                          <td className={`${tableCellClass} text-right`}>{route.movements}</td>
                          <td className={`${tableCellClass} text-right`}>{route.activeDocuments}</td>
                        </tr>
                      ))}
                      {routeActivityRows.length === 0 ? (
                        <EmptyTableRow colSpan={3} message="No route activity found for the current filter." />
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CompactSection>
            </div>
          </div>
        )}

        {activeTab === 'purchase-tracking' && (
          <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="overflow-hidden rounded border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-3 py-2">
                <h3 className="text-sm font-semibold text-slate-900">Purchase Tracking</h3>
              </div>
              <div className="h-[calc(100%-41px)] overflow-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>PO No</th>
                      <th className={tableHeadClass}>Vendor</th>
                      <th className={tableHeadClass}>Stores</th>
                      <th className={tableHeadClass}>Order Date</th>
                      <th className={tableHeadClass}>Expected</th>
                      <th className={`${tableHeadClass} text-right`}>Received</th>
                      <th className={`${tableHeadClass} text-right`}>Amount</th>
                      <th className={`${tableHeadClass} text-right`}>GRNs</th>
                      <th className={tableHeadClass}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseTrackingRows.map((purchaseOrder) => (
                      <tr key={purchaseOrder.id} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className={tableCellClass}>{purchaseOrder.poNumber}</td>
                        <td className={tableCellClass}>{purchaseOrder.vendorName}</td>
                        <td className={tableCellClass}>{purchaseOrder.expectedStores}</td>
                        <td className={tableCellClass}>{formatDatePK(purchaseOrder.orderDate)}</td>
                        <td className={tableCellClass}>
                          <div className="text-slate-900">{formatDatePK(purchaseOrder.expectedDeliveryDate)}</div>
                          <div className="text-xs text-slate-500">{purchaseOrder.isLate ? 'Late follow-up' : 'On track'}</div>
                        </td>
                        <td className={`${tableCellClass} text-right`}>{purchaseOrder.percentageReceived.toFixed(0)}%</td>
                        <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                          {formatCurrencyPKR(purchaseOrder.totalAmount)}
                        </td>
                        <td className={`${tableCellClass} text-right`}>{purchaseOrder.grnsCount}</td>
                        <td className={tableCellClass}>{getStatusBadge(purchaseOrder.status)}</td>
                      </tr>
                    ))}
                    {purchaseTrackingRows.length === 0 ? (
                      <EmptyTableRow colSpan={9} message="No purchase orders found for the current filter." />
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid h-full grid-cols-1 gap-4 overflow-hidden">
              <CompactSection title="Recent Goods Receipts">
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>GRN</th>
                        <th className={tableHeadClass}>Focus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentReceiptRows.slice(0, 8).map((receipt) => (
                        <tr key={receipt.id} className="border-t border-slate-200">
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{receipt.grnNumber}</div>
                            <div className="text-xs text-slate-500">{receipt.vendorName}</div>
                          </td>
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{receipt.storeSummary || 'Unassigned'}</div>
                            <div className="text-xs text-slate-500">
                              {compactCurrency(receipt.acceptedValue)}
                              {receipt.rejectedQuantity > 0 ? ` · ${receipt.rejectedQuantity} rejected` : ''}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {recentReceiptRows.length === 0 ? (
                        <EmptyTableRow colSpan={2} message="No goods receipts found for the current filter." />
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CompactSection>

              <CompactSection title="Vendor Support Queue">
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Vendor</th>
                        <th className={tableHeadClass}>Focus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorSupportRows.map((vendor) => (
                        <tr key={vendor.id} className="border-t border-slate-200">
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{vendor.vendorName}</div>
                            <div className="text-xs text-slate-500">{vendor.vendorCode}</div>
                          </td>
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{vendor.attention.label}</div>
                            <div className="text-xs text-slate-500">{vendor.attention.detail}</div>
                          </td>
                        </tr>
                      ))}
                      {vendorSupportRows.length === 0 ? (
                        <EmptyTableRow colSpan={2} message="No vendor follow-up items found for the current filter." />
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CompactSection>
            </div>
          </div>
        )}

        {activeTab === 'store-master' && (
          <StoreMasterScreen
            userName={userName}
            stores={stores}
            purchaseItems={purchaseItems}
            storeStocks={storeStocks}
            stockTransfers={stockTransfers}
            onStoresChange={onStoresChange}
          />
        )}

        {activeTab === 'unit-setup' && (
          <UnitMasterSetup
            userName={userName}
            units={units}
            onUnitsChange={onUnitsChange}
            initialUsageFilter="purchase"
          />
        )}

        {activeTab === 'vendor-performance' && (
          <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="overflow-hidden rounded border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-3 py-2">
                <h3 className="text-sm font-semibold text-slate-900">Vendor Performance</h3>
              </div>
              <div className="h-[calc(100%-41px)] overflow-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Vendor</th>
                      <th className={tableHeadClass}>Categories</th>
                      <th className={`${tableHeadClass} text-right`}>POs</th>
                      <th className={`${tableHeadClass} text-right`}>Pending</th>
                      <th className={`${tableHeadClass} text-right`}>On-Time</th>
                      <th className={`${tableHeadClass} text-right`}>Rejected</th>
                      <th className={`${tableHeadClass} text-right`}>Purchases</th>
                      <th className={tableHeadClass}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorPerformanceRows.map((vendor) => (
                      <tr key={vendor.id} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{vendor.vendorName}</div>
                          <div className="text-xs text-slate-500">{vendor.contactPerson}</div>
                        </td>
                        <td className={tableCellClass}>
                          {(vendor.vendorCategories || [])
                            .slice(0, 2)
                            .map((category) => category.category.replace(/-/g, ' '))
                            .join(', ') || '--'}
                        </td>
                        <td className={`${tableCellClass} text-right`}>{vendor.totalPOs}</td>
                        <td className={`${tableCellClass} text-right`}>{vendor.pendingPOs}</td>
                        <td className={`${tableCellClass} text-right`}>{vendor.onTimePercentage.toFixed(0)}%</td>
                        <td className={`${tableCellClass} text-right`}>{vendor.qualityRejections}</td>
                        <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                          {compactCurrency(vendor.totalPurchases)}
                        </td>
                        <td className={tableCellClass}>{getStatusBadge(vendor.status)}</td>
                      </tr>
                    ))}
                    {vendorPerformanceRows.length === 0 ? (
                      <EmptyTableRow colSpan={8} message="No vendor records found for the current filter." />
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid h-full grid-cols-1 gap-4 overflow-hidden">
              <CompactSection title="Vendor Support Needed">
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Vendor</th>
                        <th className={tableHeadClass}>Focus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorSupportRows.map((vendor) => (
                        <tr key={vendor.id} className="border-t border-slate-200">
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{vendor.vendorName}</div>
                            <div className="text-xs text-slate-500">{vendor.vendorCode}</div>
                          </td>
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{vendor.attention.label}</div>
                            <div className="text-xs text-slate-500">{vendor.attention.detail}</div>
                          </td>
                        </tr>
                      ))}
                      {vendorSupportRows.length === 0 ? (
                        <EmptyTableRow colSpan={2} message="No vendor support items found for the current filter." />
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CompactSection>

              <CompactSection title="Recent Receipts">
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Receipt</th>
                        <th className={tableHeadClass}>Quality</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentReceiptRows.slice(0, 8).map((receipt) => (
                        <tr key={receipt.id} className="border-t border-slate-200">
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{receipt.grnNumber}</div>
                            <div className="text-xs text-slate-500">{receipt.vendorName}</div>
                          </td>
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{receipt.qualityCheckStatus}</div>
                            <div className="text-xs text-slate-500">
                              {receipt.rejectedQuantity > 0 ? `${receipt.rejectedQuantity} rejected` : 'No rejection logged'}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {recentReceiptRows.length === 0 ? (
                        <EmptyTableRow colSpan={2} message="No receipt quality data found for the current filter." />
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CompactSection>
            </div>
          </div>
        )}
      </div>

      <StockTransferDialog
        open={transferDialogOpen}
        onClose={() => setTransferDialogOpen(false)}
        stores={stores}
        purchaseItems={purchaseItems}
        storeStocks={storeStocks}
        onStoreStocksChange={onStoreStocksChange}
        onTransferCreate={(transfer) => {
          onStockTransfersChange([...stockTransfers, transfer]);
        }}
        userName={userName}
      />
    </div>
  );
}
