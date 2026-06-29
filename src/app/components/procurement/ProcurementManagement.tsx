import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardCheck,
  DollarSign,
  FileText,
  Package,
  Search,
  ShoppingCart,
  TrendingUp,
  Truck,
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
  onBack: () => void;
}

type ProcurementTab = 'overview' | 'vendors' | 'purchase-items' | 'purchase-orders' | 'grn-register';
type DateRangeFilter = 'all' | '7d' | '30d' | '90d';

const tabs: Array<{ id: ProcurementTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'purchase-items', label: 'Purchase Items' },
  { id: 'purchase-orders', label: 'Purchase Orders' },
  { id: 'grn-register', label: 'GRN Register' },
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

const compactCurrency = (value: number) =>
  formatCurrencyPKR(value, { compact: true, minimumFractionDigits: 1, maximumFractionDigits: 1 });

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
  onBack,
}: ProcurementManagementProps) {
  const [activeTab, setActiveTab] = useState<ProcurementTab>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('30d');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

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
          <h1 className="mr-2 text-base font-semibold text-slate-900">Procurement</h1>
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
              placeholder="Search vendor, PO, GRN, or item"
              className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
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
        </div>

        <div className="flex flex-wrap gap-1 border-t border-slate-200 px-4 py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
            <CompactSection title="Pending Purchase Orders" actionLabel="Open Purchase Orders" onAction={() => setActiveTab('purchase-orders')}>
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

            <CompactSection title="Vendor Attention Queue" actionLabel="Open Vendors" onAction={() => setActiveTab('vendors')}>
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

            <CompactSection title="Reorder Watchlist" actionLabel="Open Purchase Items" onAction={() => setActiveTab('purchase-items')}>
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
                            {item.derivedStock} {item.issueUnit}
                          </td>
                          <td className={`${tableCellClass} text-right`}>
                            {item.reorderLevel} {item.issueUnit}
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

            <CompactSection title="Recent Goods Receipts" actionLabel="Open GRN Register" onAction={() => setActiveTab('grn-register')}>
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
              <CompactSection title="Top Vendors by Purchase Value" actionLabel="Open Vendors" onAction={() => setActiveTab('vendors')}>
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
          <div className="h-full overflow-auto rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-3 py-2">
              <h3 className="text-sm font-semibold text-slate-900">Goods Receipt Register</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={tableHeadClass}>GRN No</th>
                    <th className={tableHeadClass}>PO No</th>
                    <th className={tableHeadClass}>Vendor</th>
                    <th className={tableHeadClass}>Receipt Date</th>
                    <th className={tableHeadClass}>Store</th>
                    <th className={`${tableHeadClass} text-right`}>Accepted Value</th>
                    <th className={tableHeadClass}>Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGoodsReceipts.map((grn) => (
                    <tr key={grn.id} className="border-t border-slate-200">
                      <td className={tableCellClass}>{grn.grnNumber}</td>
                      <td className={tableCellClass}>{grn.poNumber}</td>
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
                      <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={7}>
                        No GRNs found for the current filter.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
