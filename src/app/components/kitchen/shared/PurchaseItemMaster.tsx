import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ClipboardList,
  Edit2,
  Eye,
  History,
  Package,
  Plus,
  Save,
  Search,
  Trash2,
  Warehouse,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrencyPKR, formatDatePK } from '../../../lib/locale';
import { createProcurementLookupValue, getActiveLookupValues, getLookupName } from '../../../lib/procurementLookups';
import { buildAssignableStoreOptions, getStoreDisplayName } from '../../../lib/storeMaster';
import { convertUnitQuantity, ensureSelectedUnitOption, formatUnitOptionLabel, getUnitByCode, getUnitsForUsage } from '../../../lib/unitConversion';
import { getLegacySupplyCategoryIdForCategory } from '../../../lib/vendorCategorySupport';
import {
  CostingMethod,
  GoodsReceipt,
  IssueMethod,
  KitchenIssueSheet,
  MeasurementUnit,
  ProcurementLookupState,
  ProcurementLookupValue,
  PurchaseItem,
  StoreLocation,
  StoreMaster,
  StoreStock,
  UnitMaster,
  Vendor,
  VendorItemMapping,
} from '../types';

interface PurchaseItemMasterProps {
  stores: StoreMaster[];
  purchaseItems: PurchaseItem[];
  storeStocks: StoreStock[];
  units: UnitMaster[];
  vendors: Vendor[];
  vendorItemMappings: VendorItemMapping[];
  procurementLookups: ProcurementLookupState;
  goodsReceipts?: GoodsReceipt[];
  kitchenIssueSheets?: KitchenIssueSheet[];
  defaultDateRangeFilter?: RegisterDateRangeFilter;
  onPurchaseItemsChange: (items: PurchaseItem[]) => void;
  onVendorItemMappingsChange: (mappings: VendorItemMapping[]) => void;
  onProcurementLookupsChange: (lookups: ProcurementLookupState) => void;
  onStoreStocksChange: (stocks: StoreStock[]) => void;
}

type StockFilter = 'all' | 'low' | 'healthy' | 'not-tracked';
type RegisterStockStatusFilter = 'all' | 'out' | 'low' | 'ok' | 'not-tracked';
type RegisterRecipeFilter = 'all' | 'recipe-enabled' | 'recipe-blocked' | 'recipe-output';
type RegisterSetupFilter = 'all' | 'store-missing' | 'conversion-risk' | 'advanced';
type RegisterDateRangeFilter = 'all' | '7d' | '30d' | '90d';
type InventoryType = NonNullable<PurchaseItem['inventoryType']>;
type CategoryManagerSection = 'purchaseCategories' | 'purchaseSubCategories';
type StockDetailTab = 'summary' | 'purchase-history' | 'issue-history' | 'stock-ledger';
type KitchenItemDialogTab =
  | 'category-policy'
  | 'units-replenishment'
  | 'vendors'
  | 'stores-summary';

interface CategoryManagerDraft {
  section: CategoryManagerSection;
  name: string;
  parentId: string;
  isActive: boolean;
}

interface BatchEntryDefaults {
  assignedStoreIds: StoreLocation[];
  baseUnit: MeasurementUnit;
  categoryId: string;
  conversionFactor: number;
  defaultPurchaseCost: number;
  leadTimeDays: number;
  minimumOrderQuantity: number;
  preferredSupplierId: string;
  purchaseUnit: MeasurementUnit;
  reorderLevel: number;
  status: 'active' | 'inactive';
  subCategoryId: string;
}

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-3 py-2 text-sm text-slate-700 align-middle';
const inputClass = 'h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500';
const labelClass = 'mb-1 block text-xs font-medium text-slate-700';
const quietButtonClass = 'inline-flex h-8 items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50';

const getLookupOptions = (values: ProcurementLookupValue[]) =>
  getActiveLookupValues(values).map((value) => ({ value: value.id, label: value.name }));

const legacySubCategoryOptionsByCategory: Record<string, Array<{ value: string; label: string }>> = {
  'food-ingredients': [
    { value: 'meat-poultry', label: 'Meat & Poultry' },
    { value: 'vegetables-fruit', label: 'Vegetables & Fruit' },
    { value: 'dairy', label: 'Dairy' },
    { value: 'seafood', label: 'Seafood' },
    { value: 'spices-condiments', label: 'Spices & Condiments' },
    { value: 'oils-ghee', label: 'Oils & Ghee' },
    { value: 'dry-goods', label: 'Dry Goods' },
  ],
  'beverage-ingredients': [
    { value: 'tea-coffee', label: 'Tea & Coffee' },
    { value: 'juices-syrups', label: 'Juices & Syrups' },
    { value: 'beverage-garnish', label: 'Beverage Garnish' },
  ],
  'bakery-ingredients': [
    { value: 'flour-grains', label: 'Flour & Grains' },
    { value: 'sugar-sweeteners', label: 'Sugar & Sweeteners' },
    { value: 'cream-dairy', label: 'Cream & Dairy' },
    { value: 'yeast-leavening', label: 'Yeast & Leavening' },
  ],
  'raw-materials': [
    { value: 'general-raw', label: 'General Raw Material' },
    { value: 'imported-raw', label: 'Imported Raw Material' },
  ],
  'semi-finished-products': [
    { value: 'sauces-bases', label: 'Sauces & Bases' },
    { value: 'prepared-dough', label: 'Prepared Dough' },
    { value: 'marinated-items', label: 'Marinated Items' },
    { value: 'cooked-components', label: 'Cooked Components' },
  ],
  'finished-products': [
    { value: 'ready-to-serve', label: 'Ready To Serve' },
    { value: 'packed-kitchen-product', label: 'Packed Kitchen Product' },
  ],
  'food-packaging': [
    { value: 'trays-foil', label: 'Trays & Foil' },
    { value: 'cups-bottles', label: 'Cups & Bottles' },
    { value: 'labels-seals', label: 'Labels & Seals' },
    { value: 'disposable-food-packaging', label: 'Disposable Food Packaging' },
  ],
};

const inventoryTypeOptions: Array<{ value: InventoryType; label: string }> = [
  { value: 'raw-material', label: 'Raw Material' },
  { value: 'semi-finished-product', label: 'Semi Finished Product' },
  { value: 'finished-product', label: 'Finished Product' },
  { value: 'packaging-material', label: 'Packaging Material' },
];
const recipeOutputInventoryTypes = new Set<InventoryType>(['semi-finished-product', 'finished-product']);

const costingMethodOptions: Array<{ value: CostingMethod; label: string }> = [
  { value: 'weighted-average', label: 'Weighted Average' },
  { value: 'last-purchase-rate', label: 'Last Purchase Rate' },
  { value: 'standard-cost', label: 'Standard Cost' },
  { value: 'fifo-costing', label: 'FIFO Costing' },
];

const issueMethodOptions: Array<{ value: IssueMethod; label: string }> = [
  { value: 'fifo', label: 'FIFO' },
  { value: 'lifo', label: 'LIFO' },
  { value: 'fefo', label: 'FEFO' },
  { value: 'specific-batch', label: 'Specific Batch' },
];

const legacyCategoryMap: Record<string, string> = {
  'raw-material': 'raw-materials',
  'ready-made': 'finished-products',
  consumable: 'food-packaging',
  beverage: 'beverage-ingredients',
  packaging: 'food-packaging',
};

const legacyInventoryTypeMap: Record<string, InventoryType> = {
  'ready-made': 'finished-product',
  consumable: 'packaging-material',
  packaging: 'packaging-material',
};

const blockedStoreKeywords = [
  'housekeeping',
  'maintenance',
  'engineering',
  'asset',
  'cleaning',
  'repair',
  'office',
  'linen',
  'dishwash',
];

const kitchenStoreKeywords = [
  'main store',
  'kitchen',
  'bakery',
  'cold room',
  'cold storage',
  'freezer',
  'butchery',
  'beverage',
  'production',
  'dry goods',
  'food packaging',
  'disposable',
];

const getCategoryId = (item: PurchaseItem) =>
  item.purchaseCategoryId || item.categoryId || legacyCategoryMap[item.category] || item.category || 'food-ingredients';

const getCategoryLabel = (categoryId: string, categoryOptions: Array<{ value: string; label: string }>) =>
  categoryOptions.find((option) => option.value === categoryId)?.label || categoryId.replace(/-/g, ' ');

const getSubCategoryLabel = (categoryId: string, subCategoryId?: string) => {
  if (!subCategoryId) {
    return '-';
  }
  return (
    legacySubCategoryOptionsByCategory[categoryId]?.find((option) => option.value === subCategoryId)?.label ||
    subCategoryId.replace(/-/g, ' ')
  );
};

const createEmptyCategoryManagerDraft = (
  section: CategoryManagerSection = 'purchaseCategories',
  parentId = '',
): CategoryManagerDraft => ({
  section,
  name: '',
  parentId,
  isActive: true,
});

const getInventoryType = (item: PurchaseItem): InventoryType =>
  item.inventoryType || legacyInventoryTypeMap[item.category] || 'raw-material';

const getInventoryTypeLabel = (inventoryType?: string) =>
  inventoryTypeOptions.find((option) => option.value === inventoryType)?.label || (inventoryType || '-').replace(/-/g, ' ');

const getCostingMethod = (item?: PurchaseItem | null): CostingMethod => item?.costingMethod || 'weighted-average';
const getIssueMethod = (item?: PurchaseItem | null): IssueMethod => item?.issueMethod || 'fefo';

const getCostingMethodLabel = (costingMethod?: string) =>
  costingMethodOptions.find((option) => option.value === costingMethod)?.label || (costingMethod || '-').replace(/-/g, ' ');

const getIssueMethodLabel = (issueMethod?: string) =>
  issueMethodOptions.find((option) => option.value === issueMethod)?.label || (issueMethod || '-').replace(/-/g, ' ');

const getBaseUnit = (item: PurchaseItem) => item.baseUnitId || item.issueUnit;
const getPurchaseUnit = (item: PurchaseItem) => item.purchaseUnitId || item.purchaseUnit;
const isTracked = (item: PurchaseItem) => item.trackInventory !== false;
const isRecipeIngredientEnabled = (item?: PurchaseItem | null) => item?.useInRecipeIngredients !== false;
const isRecipeOutputEnabled = (item?: PurchaseItem | null) =>
  item?.useAsRecipeOutput ?? (item ? recipeOutputInventoryTypes.has(getInventoryType(item)) : false);

const getItemAssignedStoreIds = (item: PurchaseItem): StoreLocation[] => {
  if (Array.isArray(item.assignedKitchenStoreIds) && item.assignedKitchenStoreIds.length > 0) {
    return item.assignedKitchenStoreIds;
  }
  return item.storeLocation ? [item.storeLocation] : [];
};

const reconcileStoreStocksForItem = (
  stocks: StoreStock[],
  itemId: string,
  itemName: string,
  assignedStoreIds: StoreLocation[],
  unit: MeasurementUnit,
  reorderLevel: number,
  now: Date,
) => {
  const itemStocks = stocks.filter((stock) => stock.purchaseItemId === itemId);
  if (itemStocks.length === 0) {
    return stocks;
  }

  const otherStocks = stocks.filter((stock) => stock.purchaseItemId !== itemId);
  const assignedStoreSet = new Set(assignedStoreIds);
  const primaryStoreId = assignedStoreIds[0];
  const mergedStocks = new Map<StoreLocation, StoreStock>();
  let changed = false;

  itemStocks.forEach((stock) => {
    const storeLocation =
      primaryStoreId && !assignedStoreSet.has(stock.storeLocation)
        ? primaryStoreId
        : stock.storeLocation;
    const existingStock = mergedStocks.get(storeLocation);
    if (
      storeLocation !== stock.storeLocation ||
      stock.itemName !== itemName ||
      stock.unit !== unit ||
      stock.reorderLevel !== reorderLevel
    ) {
      changed = true;
    }

    const nextStock: StoreStock = {
      ...stock,
      storeLocation,
      itemName,
      unit,
      reorderLevel,
      lastUpdated: now,
    };

    if (existingStock) {
      changed = true;
      mergedStocks.set(storeLocation, {
        ...existingStock,
        currentStock: existingStock.currentStock + nextStock.currentStock,
        unit,
        reorderLevel,
        lastUpdated: now,
      });
      return;
    }

    mergedStocks.set(storeLocation, nextStock);
  });

  return changed ? [...otherStocks, ...Array.from(mergedStocks.values())] : stocks;
};

const hasKitchenStoreSignal = (store: StoreMaster & { label?: string; hierarchyLabel?: string }) => {
  const text = `${store.name} ${store.code} ${store.label || ''} ${store.hierarchyLabel || ''}`.toLowerCase();
  if (blockedStoreKeywords.some((keyword) => text.includes(keyword))) {
    return false;
  }
  return store.purpose === 'production' || kitchenStoreKeywords.some((keyword) => text.includes(keyword));
};

const getStockMeta = (currentStock: number, reorderLevel: number, trackInventory: boolean) => {
  if (!trackInventory) {
    return {
      label: 'Not Tracked',
      textClass: 'text-slate-500',
      badgeClass: 'bg-slate-100 text-slate-600',
    };
  }

  if (currentStock <= 0) {
    return {
      label: 'Out',
      textClass: 'text-red-700',
      badgeClass: 'bg-red-100 text-red-700',
    };
  }

  if (reorderLevel <= 0) {
    return {
      label: 'OK',
      textClass: 'text-emerald-700',
      badgeClass: 'bg-emerald-100 text-emerald-700',
    };
  }

  if (currentStock <= reorderLevel) {
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

const generateItemCode = (items: PurchaseItem[]) => {
  const maxCodeNumber = items.reduce((max, item) => {
    const match = item.itemCode?.match(/^KIT-(\d+)$/i);
    if (!match) {
      return max;
    }
    return Math.max(max, Number(match[1]) || 0);
  }, 0);

  return `KIT-${String(maxCodeNumber + 1).padStart(4, '0')}`;
};

const toDateInputValue = (value: Date) => value.toISOString().split('T')[0];

const getDateRangeBounds = (range: RegisterDateRangeFilter) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = toDateInputValue(today);

  if (range === 'all') {
    return { fromDate: '', toDate: endDate };
  }

  const startDate = new Date(today);
  const daysBack = range === '7d' ? 6 : range === '30d' ? 29 : 89;
  startDate.setDate(startDate.getDate() - daysBack);

  return {
    fromDate: toDateInputValue(startDate),
    toDate: endDate,
  };
};

const formatStoreSummary = (stores: StoreMaster[], storeIds: StoreLocation[]) => {
  if (storeIds.length === 0) {
    return 'Not assigned';
  }

  const [firstStore, ...remainingStores] = storeIds;
  const firstLabel = getStoreDisplayName(stores, firstStore);
  return remainingStores.length > 0 ? `${firstLabel} +${remainingStores.length}` : firstLabel;
};

interface SectionCardProps {
  title: string;
  icon?: LucideIcon;
  summary?: string;
  count?: number;
  hasError?: boolean;
  children: ReactNode;
}

function SectionCard({
  title,
  icon: Icon,
  summary,
  count,
  hasError,
  children,
}: SectionCardProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 px-4 py-3">
        {Icon ? (
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
            <Icon className="size-4" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{title}</span>
            {typeof count === 'number' ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {count}
              </span>
            ) : null}
            {hasError ? (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                Needs attention
              </span>
            ) : null}
          </div>
          {summary ? <div className="mt-1 text-xs text-slate-500">{summary}</div> : null}
        </div>
      </div>
      <div className="border-t border-slate-100 p-4">{children}</div>
    </section>
  );
}

const SummaryRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex min-h-8 items-center justify-between gap-3 px-2.5 py-1.5">
    <span className="text-xs text-slate-500">{label}</span>
    <span className="text-right text-xs font-medium text-slate-900">{value}</span>
  </div>
);

const ReadOnlyField = ({ value }: { value: ReactNode }) => (
  <div className="flex h-8 items-center rounded border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-700">
    {value}
  </div>
);

const FieldShell = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={className}>{children}</div>
);

function ExpandableSection({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {summary ? <div className="mt-1 text-xs text-slate-500">{summary}</div> : null}
        </div>
        <ChevronDown className={`size-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? <div className="border-t border-slate-100 p-4">{children}</div> : null}
    </section>
  );
}

export function PurchaseItemMaster({
  stores,
  purchaseItems,
  storeStocks,
  units,
  vendors,
  vendorItemMappings,
  procurementLookups,
  goodsReceipts = [],
  kitchenIssueSheets = [],
  defaultDateRangeFilter = '30d',
  onPurchaseItemsChange,
  onVendorItemMappingsChange,
  onProcurementLookupsChange,
  onStoreStocksChange,
}: PurchaseItemMasterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<RegisterStockStatusFilter>('all');
  const [recipeFilter, setRecipeFilter] = useState<RegisterRecipeFilter>('all');
  const [setupFilter, setSetupFilter] = useState<RegisterSetupFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedStockDetailItemId, setSelectedStockDetailItemId] = useState<string | null>(null);
  const [stockDetailTab, setStockDetailTab] = useState<StockDetailTab>('summary');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PurchaseItem | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [expandedApprovedVendorId, setExpandedApprovedVendorId] = useState<string | null>(null);
  const [activeDialogTab, setActiveDialogTab] = useState<KitchenItemDialogTab>('category-policy');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategoryLookupId, setEditingCategoryLookupId] = useState<string | null>(null);
  const [categoryManagerDraft, setCategoryManagerDraft] = useState<CategoryManagerDraft>(createEmptyCategoryManagerDraft());
  const [showAdvancedSection, setShowAdvancedSection] = useState(false);
  const [showVendorSection, setShowVendorSection] = useState(false);
  const [showStoreSection, setShowStoreSection] = useState(false);
  const [showSetupSection, setShowSetupSection] = useState(false);

  const [formItemName, setFormItemName] = useState('');
  const [formItemCode, setFormItemCode] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('food-ingredients');
  const [formSubCategoryId, setFormSubCategoryId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formInventoryType, setFormInventoryType] = useState<InventoryType>('raw-material');
  const [formTrackInventory, setFormTrackInventory] = useState(true);
  const [formUseInRecipeIngredients, setFormUseInRecipeIngredients] = useState(true);
  const [formUseAsRecipeOutput, setFormUseAsRecipeOutput] = useState(false);
  const [formCostingMethod, setFormCostingMethod] = useState<CostingMethod>('last-purchase-rate');
  const [formIssueMethod, setFormIssueMethod] = useState<IssueMethod>('fifo');
  const [formBaseUnit, setFormBaseUnit] = useState<MeasurementUnit>('gm');
  const [formPurchaseUnit, setFormPurchaseUnit] = useState<MeasurementUnit>('kg');
  const [formConversionFactor, setFormConversionFactor] = useState(1000);
  const [formReorderLevel, setFormReorderLevel] = useState(0);
  const [formMinimumStockLevel, setFormMinimumStockLevel] = useState(0);
  const [formMaximumStockLevel, setFormMaximumStockLevel] = useState(0);
  const [formAllowNegativeStock, setFormAllowNegativeStock] = useState(false);
  const [formPreferredSupplierId, setFormPreferredSupplierId] = useState('');
  const [formApprovedVendors, setFormApprovedVendors] = useState<VendorItemMapping[]>([]);
  const [formDefaultPurchaseCost, setFormDefaultPurchaseCost] = useState(0);
  const [formLeadTimeDays, setFormLeadTimeDays] = useState(0);
  const [formMinimumOrderQuantity, setFormMinimumOrderQuantity] = useState(0);
  const [formTaxGroupId, setFormTaxGroupId] = useState('');
  const [formAssignedStoreIds, setFormAssignedStoreIds] = useState<StoreLocation[]>([]);

  const stockTotalsByItem = useMemo(() => {
    const totals = new Map<string, number>();
    storeStocks.forEach((stock) => {
      totals.set(stock.purchaseItemId, (totals.get(stock.purchaseItemId) || 0) + stock.currentStock);
    });
    return totals;
  }, [storeStocks]);

  const registerStockTotalsByItem = useMemo(() => {
    const totals = new Map<string, number>();
    storeStocks
      .filter((stock) => storeFilter === 'all' || stock.storeLocation === storeFilter)
      .forEach((stock) => {
        totals.set(stock.purchaseItemId, (totals.get(stock.purchaseItemId) || 0) + stock.currentStock);
      });
    return totals;
  }, [storeFilter, storeStocks]);

  const activeStoreOptions = useMemo(() => buildAssignableStoreOptions(stores), [stores]);
  const activeKitchenStoreOptions = useMemo(
    () => activeStoreOptions.filter((store) => hasKitchenStoreSignal(store)),
    [activeStoreOptions],
  );
  const allowedKitchenStoreIds = useMemo(
    () => new Set(activeKitchenStoreOptions.map((store) => store.id)),
    [activeKitchenStoreOptions],
  );
  const registerSubCategoryOptions = useMemo(() => {
    const activeOptions = getLookupOptions(
      procurementLookups.purchaseSubCategories.filter(
        (entry) => entry.status !== 'inactive' && (categoryFilter === 'all' || entry.parentId === categoryFilter),
      ),
    );

    if (categoryFilter === 'all') {
      return activeOptions;
    }

    const legacyOptions = legacySubCategoryOptionsByCategory[categoryFilter] || [];
    const mergedOptions = [...activeOptions];
    legacyOptions.forEach((option) => {
      if (!mergedOptions.some((entry) => entry.value === option.value)) {
        mergedOptions.push(option);
      }
    });
    return mergedOptions;
  }, [categoryFilter, procurementLookups.purchaseSubCategories]);
  const purchaseUnitOptions = useMemo(() => getUnitsForUsage('purchase', units), [units]);
  const baseUnitOptions = useMemo(() => getUnitsForUsage('issue', units), [units]);
  const activeVendors = useMemo(
    () => vendors.filter((vendor) => vendor.status === 'active').sort((left, right) => left.vendorName.localeCompare(right.vendorName)),
    [vendors],
  );
  const vendorById = useMemo(() => {
    const map = new Map<string, Vendor>();
    vendors.forEach((vendor) => map.set(vendor.id, vendor));
    return map;
  }, [vendors]);
  const itemCategoryOptions = useMemo(() => {
    const options = getLookupOptions(procurementLookups.purchaseCategories);
    if (formCategoryId && !options.some((option) => option.value === formCategoryId)) {
      const selected = procurementLookups.purchaseCategories.find((entry) => entry.id === formCategoryId);
      if (selected) {
        return [...options, { value: selected.id, label: `${selected.name} (Inactive)` }];
      }
    }
    return options;
  }, [formCategoryId, procurementLookups.purchaseCategories]);
  const subCategoryLookupValues = useMemo(
    () => procurementLookups.purchaseSubCategories.filter((entry) => entry.parentId === formCategoryId),
    [formCategoryId, procurementLookups.purchaseSubCategories],
  );

  const fallbackPurchaseUnit = purchaseUnitOptions[0]?.code || 'kg';
  const fallbackBaseUnit = baseUnitOptions[0]?.code || 'gm';
  const fallbackPurchaseCategoryId = itemCategoryOptions[0]?.value || 'food-ingredients';
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const quantityFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      }),
    [],
  );
  const getPurchaseCategoryLabel = (categoryId: string) => getCategoryLabel(categoryId, itemCategoryOptions);
  const getResolvedSubCategoryLabel = (categoryId: string, subCategoryId?: string) => {
    if (!subCategoryId) {
      return '-';
    }

    const lookupMatch = procurementLookups.purchaseSubCategories.find((entry) => entry.id === subCategoryId);
    if (lookupMatch) {
      return lookupMatch.name;
    }

    return getSubCategoryLabel(categoryId, subCategoryId);
  };

  const findSuggestedStoreId = (keywords: string[]) =>
    activeKitchenStoreOptions.find((store) => {
      const text = `${store.label} ${store.name} ${store.code}`.toLowerCase();
      return keywords.some((keyword) => text.includes(keyword));
    })?.id;

  const getCategorySuggestedSetup = (categoryId: string): Pick<
    BatchEntryDefaults,
    'assignedStoreIds' | 'baseUnit' | 'conversionFactor' | 'purchaseUnit'
  > => {
    const categoryLabel = getPurchaseCategoryLabel(categoryId).toLowerCase();
    const packagingCategory =
      categoryLabel.includes('packaging') ||
      categoryLabel.includes('disposable') ||
      categoryLabel.includes('tray') ||
      categoryLabel.includes('cup') ||
      categoryLabel.includes('bottle') ||
      categoryLabel.includes('label');
    const beverageCategory =
      categoryLabel.includes('beverage') ||
      categoryLabel.includes('juice') ||
      categoryLabel.includes('drink') ||
      categoryLabel.includes('syrup');

    if (packagingCategory) {
      const packagingStoreId =
        findSuggestedStoreId(['packaging', 'disposable']) ||
        findSuggestedStoreId(['food store', 'main store']) ||
        activeKitchenStoreOptions[0]?.id;
      return {
        purchaseUnit: 'pcs',
        baseUnit: 'pcs',
        conversionFactor: 1,
        assignedStoreIds: packagingStoreId ? [packagingStoreId] : [],
      };
    }

    if (beverageCategory) {
      const beverageStoreId =
        findSuggestedStoreId(['beverage']) ||
        findSuggestedStoreId(['food store', 'main store']) ||
        activeKitchenStoreOptions[0]?.id;
      return {
        purchaseUnit: 'ltr',
        baseUnit: 'ml',
        conversionFactor: 1000,
        assignedStoreIds: beverageStoreId ? [beverageStoreId] : [],
      };
    }

    const foodStoreId =
      findSuggestedStoreId(['food store', 'main store', 'dry goods']) ||
      activeKitchenStoreOptions[0]?.id;
    return {
      purchaseUnit: 'kg',
      baseUnit: 'gm',
      conversionFactor: 1000,
      assignedStoreIds: foodStoreId ? [foodStoreId] : [],
    };
  };

  const convertToPurchaseUnit = (
    quantity: number,
    fromUnit: MeasurementUnit | string | undefined,
    purchaseUnit: MeasurementUnit | string,
    baseUnit: MeasurementUnit | string,
    conversionFactor: number,
  ) => {
    if (!Number.isFinite(quantity) || quantity === 0) {
      return 0;
    }

    const converted = fromUnit
      ? convertUnitQuantity(quantity, String(fromUnit), String(purchaseUnit), units)
      : null;

    if (converted !== null) {
      return converted;
    }

    if (fromUnit === purchaseUnit) {
      return quantity;
    }

    if (fromUnit === baseUnit && conversionFactor > 0) {
      return quantity / conversionFactor;
    }

    return quantity;
  };

  const formatRegisterUnit = (unitCode: string | undefined) => {
    if (!unitCode) {
      return '';
    }

    const resolvedUnit = getUnitByCode(unitCode, units);
    return (resolvedUnit?.symbol || unitCode).toUpperCase();
  };

  const formatRegisterQuantity = (value: number) => quantityFormatter.format(Math.round(value * 1000) / 1000);
  const isWithinSelectedDateRange = (value?: Date | string) => {
    if (!value) {
      return false;
    }

    const compareDate = new Date(value);
    compareDate.setHours(0, 0, 0, 0);

    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      if (compareDate < from) {
        return false;
      }
    }

    if (toDate) {
      const to = new Date(toDate);
      to.setHours(0, 0, 0, 0);
      if (compareDate > to) {
        return false;
      }
    }

    return true;
  };

  const isAfterSelectedToDate = (value?: Date | string) => {
    if (!value || !toDate) {
      return false;
    }

    const compareDate = new Date(value);
    compareDate.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(toDate);
    rangeEnd.setHours(0, 0, 0, 0);
    return compareDate > rangeEnd;
  };

  useEffect(() => {
    const bounds = getDateRangeBounds(defaultDateRangeFilter);
    setFromDate(bounds.fromDate);
    setToDate(bounds.toDate);
  }, [defaultDateRangeFilter]);

  useEffect(() => {
    const now = new Date();
    let nextStoreStocks = storeStocks;

    purchaseItems.forEach((item) => {
      const assignedStoreIds = getItemAssignedStoreIds(item);
      if (assignedStoreIds.length === 0) {
        return;
      }

      nextStoreStocks = reconcileStoreStocksForItem(
        nextStoreStocks,
        item.id,
        item.itemName,
        assignedStoreIds,
        getBaseUnit(item),
        item.reorderLevel || 0,
        now,
      );
    });

    if (nextStoreStocks !== storeStocks) {
      onStoreStocksChange(nextStoreStocks);
    }
  }, [onStoreStocksChange, purchaseItems, storeStocks]);

  useEffect(() => {
    if (subCategoryFilter === 'all') {
      return;
    }

    if (!registerSubCategoryOptions.some((option) => option.value === subCategoryFilter)) {
      setSubCategoryFilter('all');
    }
  }, [registerSubCategoryOptions, subCategoryFilter]);

  const purchasedQtyByItem = useMemo(() => {
    const totals = new Map<string, number>();

    goodsReceipts.forEach((grn) => {
      if (!isWithinSelectedDateRange(grn.receiptDate)) {
        return;
      }

      grn.items.forEach((item) => {
        const destinationStore = item.destinationStore || grn.destinationStore;
        if (storeFilter !== 'all' && destinationStore !== storeFilter) {
          return;
        }
        totals.set(item.purchaseItemId, (totals.get(item.purchaseItemId) || 0) + (Number(item.acceptedQuantity) || 0));
      });
    });

    return totals;
  }, [goodsReceipts, fromDate, isWithinSelectedDateRange, storeFilter, toDate]);

  const purchasedAfterToDateByItem = useMemo(() => {
    const totals = new Map<string, number>();

    goodsReceipts.forEach((grn) => {
      if (!isAfterSelectedToDate(grn.receiptDate)) {
        return;
      }

      grn.items.forEach((item) => {
        const destinationStore = item.destinationStore || grn.destinationStore;
        if (storeFilter !== 'all' && destinationStore !== storeFilter) {
          return;
        }
        totals.set(item.purchaseItemId, (totals.get(item.purchaseItemId) || 0) + (Number(item.acceptedQuantity) || 0));
      });
    });

    return totals;
  }, [goodsReceipts, isAfterSelectedToDate, storeFilter, toDate]);

  const issuedQtyByItem = useMemo(() => {
    const totals = new Map<string, number>();

    kitchenIssueSheets
      .filter((sheet) => sheet.status === 'issued' || sheet.status === 'partial')
      .filter((sheet) => isWithinSelectedDateRange(sheet.eventDate))
      .forEach((sheet) => {
        sheet.lineItems.forEach((lineItem) => {
          if (storeFilter !== 'all' && lineItem.sourceStore !== storeFilter) {
            return;
          }

          const purchaseItem = purchaseItems.find((item) => item.id === lineItem.purchaseItemId);
          if (!purchaseItem) {
            return;
          }

          const quantityInPurchaseUnit = convertToPurchaseUnit(
            Number(lineItem.issuedQuantity) || 0,
            lineItem.unit,
            getPurchaseUnit(purchaseItem),
            getBaseUnit(purchaseItem),
            purchaseItem.conversionFactor,
          );

          totals.set(lineItem.purchaseItemId, (totals.get(lineItem.purchaseItemId) || 0) + quantityInPurchaseUnit);
        });
      });

    return totals;
  }, [fromDate, isWithinSelectedDateRange, kitchenIssueSheets, purchaseItems, storeFilter, toDate, units]);

  const issuedAfterToDateByItem = useMemo(() => {
    const totals = new Map<string, number>();

    kitchenIssueSheets
      .filter((sheet) => sheet.status === 'issued' || sheet.status === 'partial')
      .filter((sheet) => isAfterSelectedToDate(sheet.eventDate))
      .forEach((sheet) => {
        sheet.lineItems.forEach((lineItem) => {
          if (storeFilter !== 'all' && lineItem.sourceStore !== storeFilter) {
            return;
          }

          const purchaseItem = purchaseItems.find((item) => item.id === lineItem.purchaseItemId);
          if (!purchaseItem) {
            return;
          }

          const quantityInPurchaseUnit = convertToPurchaseUnit(
            Number(lineItem.issuedQuantity) || 0,
            lineItem.unit,
            getPurchaseUnit(purchaseItem),
            getBaseUnit(purchaseItem),
            purchaseItem.conversionFactor,
          );

          totals.set(lineItem.purchaseItemId, (totals.get(lineItem.purchaseItemId) || 0) + quantityInPurchaseUnit);
        });
      });

    return totals;
  }, [isAfterSelectedToDate, kitchenIssueSheets, purchaseItems, storeFilter, toDate, units]);

  const stockRegisterRows = useMemo(
    () =>
      purchaseItems
        .map((item) => {
          const categoryId = getCategoryId(item);
          const baseUnit = getBaseUnit(item);
          const purchaseUnit = getPurchaseUnit(item);
          const assignedStoreIds = getItemAssignedStoreIds(item);
          const trackInventory = isTracked(item);
          const derivedStock = registerStockTotalsByItem.get(item.id) ?? 0;
          const purchasedQty = purchasedQtyByItem.get(item.id) || 0;
          const issuedQty = issuedQtyByItem.get(item.id) || 0;
          const currentBalanceQty = convertToPurchaseUnit(derivedStock, baseUnit, purchaseUnit, baseUnit, item.conversionFactor);
          const purchasedAfterToDateQty = purchasedAfterToDateByItem.get(item.id) || 0;
          const issuedAfterToDateQty = issuedAfterToDateByItem.get(item.id) || 0;
          const balanceQty = Math.max(currentBalanceQty - purchasedAfterToDateQty + issuedAfterToDateQty, 0);
          const reorderQty = convertToPurchaseUnit(item.reorderLevel || 0, baseUnit, purchaseUnit, baseUnit, item.conversionFactor);
          const openingQty = fromDate
            ? Math.max(balanceQty - purchasedQty + issuedQty, 0)
            : convertToPurchaseUnit(item.openingStock || 0, baseUnit, purchaseUnit, baseUnit, item.conversionFactor);
          const stockMeta = getStockMeta(balanceQty, reorderQty, trackInventory);
          const valuationRate = item.ratePerUnit ?? item.averageCost ?? item.lastPurchaseRate ?? item.defaultPurchaseCost ?? 0;
          const stockValue = balanceQty * valuationRate;
          const recipeEnabled = isRecipeIngredientEnabled(item);
          const recipeOutputEnabled = isRecipeOutputEnabled(item);
          const missingStoreAssignment = assignedStoreIds.length === 0;
          const conversionRisk = !purchaseUnit || !baseUnit || !item.conversionFactor || item.conversionFactor <= 0;
          const advancedInventory =
            !trackInventory ||
            item.allowNegativeStock ||
            getCostingMethod(item) !== 'last-purchase-rate' ||
            getIssueMethod(item) !== 'fifo' ||
            recipeOutputEnabled ||
            getInventoryType(item) !== 'raw-material';

          return {
            ...item,
            categoryId,
            baseUnit,
            purchaseUnit,
            assignedStoreIds,
            trackInventory,
            inventoryType: getInventoryType(item),
            derivedStock,
            currentBalanceQty,
            purchasedAfterToDateQty,
            issuedAfterToDateQty,
            stockMeta,
            openingQty,
            purchasedQty,
            issuedQty,
            balanceQty,
            reorderQty,
            stockValue,
            recipeEnabled,
            recipeOutputEnabled,
            missingStoreAssignment,
            conversionRisk,
            advancedInventory,
          };
        })
        .sort((left, right) => left.itemName.localeCompare(right.itemName)),
    [
      fromDate,
      issuedQtyByItem,
      issuedAfterToDateByItem,
      purchasedQtyByItem,
      purchasedAfterToDateByItem,
      purchaseItems,
      registerStockTotalsByItem,
      units,
    ],
  );

  const itemRows = useMemo(
    () =>
      stockRegisterRows
        .filter((item) => {
          const matchesSearch =
            !normalizedSearch ||
            item.itemName.toLowerCase().includes(normalizedSearch) ||
            item.assignedStoreIds.some((storeId) => getStoreDisplayName(stores, storeId).toLowerCase().includes(normalizedSearch)) ||
            (item.itemCode || '').toLowerCase().includes(normalizedSearch) ||
            getPurchaseCategoryLabel(item.categoryId).toLowerCase().includes(normalizedSearch) ||
            getInventoryTypeLabel(item.inventoryType).toLowerCase().includes(normalizedSearch) ||
            formatRegisterUnit(item.purchaseUnit).toLowerCase().includes(normalizedSearch);
          const matchesCategory = categoryFilter === 'all' || item.categoryId === categoryFilter;
          const matchesSubCategory = subCategoryFilter === 'all' || item.subCategoryId === subCategoryFilter;
          const matchesStore =
            storeFilter === 'all' ||
            item.assignedStoreIds.includes(storeFilter as StoreLocation);
          const matchesStock =
            stockFilter === 'all' ||
            (stockFilter === 'out' && item.stockMeta.label === 'Out') ||
            (stockFilter === 'low' && item.stockMeta.label === 'Low') ||
            (stockFilter === 'ok' && (item.stockMeta.label === 'Healthy' || item.stockMeta.label === 'OK')) ||
            (stockFilter === 'not-tracked' && item.stockMeta.label === 'Not Tracked');
          const matchesRecipe =
            recipeFilter === 'all' ||
            (recipeFilter === 'recipe-enabled' && item.recipeEnabled) ||
            (recipeFilter === 'recipe-blocked' && !item.recipeEnabled) ||
            (recipeFilter === 'recipe-output' && item.recipeOutputEnabled);
          const matchesSetup =
            setupFilter === 'all' ||
            (setupFilter === 'store-missing' && item.missingStoreAssignment) ||
            (setupFilter === 'conversion-risk' && item.conversionRisk) ||
            (setupFilter === 'advanced' && item.advancedInventory);

          return matchesSearch && matchesCategory && matchesSubCategory && matchesStore && matchesStock && matchesRecipe && matchesSetup;
        })
        .sort((left, right) => left.itemName.localeCompare(right.itemName)),
    [
      categoryFilter,
      getPurchaseCategoryLabel,
      normalizedSearch,
      recipeFilter,
      setupFilter,
      stockRegisterRows,
      stockFilter,
      storeFilter,
      stores,
      subCategoryFilter,
    ],
  );

  const metrics = useMemo(
    () => ({
      total: purchaseItems.length,
      lowStock: purchaseItems.filter((item) => {
        if (!isTracked(item)) {
          return false;
        }
        const derivedStock = stockTotalsByItem.get(item.id) ?? 0;
        return derivedStock <= item.reorderLevel;
      }).length,
      assignedStores: new Set(purchaseItems.flatMap((item) => getItemAssignedStoreIds(item))).size,
      categories: new Set(purchaseItems.map((item) => getCategoryId(item))).size,
      stockRows: storeStocks.length,
      recipeEnabled: purchaseItems.filter(isRecipeIngredientEnabled).length,
      recipeBlocked: purchaseItems.filter((item) => !isRecipeIngredientEnabled(item)).length,
      missingStore: purchaseItems.filter((item) => getItemAssignedStoreIds(item).length === 0).length,
      conversionRisk: purchaseItems.filter((item) => {
        const baseUnit = getBaseUnit(item);
        const purchaseUnit = getPurchaseUnit(item);
        return !baseUnit || !purchaseUnit || !item.conversionFactor || item.conversionFactor <= 0;
      }).length,
    }),
    [purchaseItems, stockTotalsByItem, storeStocks.length],
  );

  const reorderWatchlist = useMemo(
    () =>
      [...itemRows]
        .filter((item) => item.trackInventory && item.balanceQty <= item.reorderQty)
        .map((item) => ({
          ...item,
          shortQty: Math.max(item.reorderQty - item.balanceQty, 0),
        }))
        .sort((left, right) => {
          if (right.shortQty !== left.shortQty) {
            return right.shortQty - left.shortQty;
          }
          return left.balanceQty - right.balanceQty;
        })
        .slice(0, 8),
    [itemRows],
  );

  const selectedStockDetailItem = useMemo(
    () => (selectedStockDetailItemId ? stockRegisterRows.find((item) => item.id === selectedStockDetailItemId) || null : null),
    [selectedStockDetailItemId, stockRegisterRows],
  );

  useEffect(() => {
    if (selectedStockDetailItemId && !selectedStockDetailItem) {
      setSelectedStockDetailItemId(null);
      setStockDetailTab('summary');
    }
  }, [selectedStockDetailItem, selectedStockDetailItemId]);

  const purchaseHistoryRows = useMemo(() => {
    if (!selectedStockDetailItem) {
      return [];
    }

    return goodsReceipts
      .filter((grn) => isWithinSelectedDateRange(grn.receiptDate))
      .flatMap((grn) =>
        grn.items
          .filter((item) => item.purchaseItemId === selectedStockDetailItem.id)
          .filter((item) => {
            const destinationStore = item.destinationStore || grn.destinationStore;
            return storeFilter === 'all' || destinationStore === storeFilter;
          })
          .map((item) => ({
            id: `${grn.id}-${item.purchaseItemId}`,
            date: grn.receiptDate,
            reference: grn.grnNumber,
            vendor: grn.vendorName,
            qty: Number(item.acceptedQuantity) || 0,
            rate: item.ratePerUnit || 0,
            value: item.totalValue || (Number(item.acceptedQuantity) || 0) * (item.ratePerUnit || 0),
          })),
      )
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  }, [goodsReceipts, isWithinSelectedDateRange, selectedStockDetailItem, storeFilter]);

  const issueHistoryRows = useMemo(() => {
    if (!selectedStockDetailItem) {
      return [];
    }

    const issueRate =
      selectedStockDetailItem.ratePerUnit ??
      selectedStockDetailItem.averageCost ??
      selectedStockDetailItem.lastPurchaseRate ??
      selectedStockDetailItem.defaultPurchaseCost ??
      0;

    return kitchenIssueSheets
      .filter((sheet) => (sheet.status === 'issued' || sheet.status === 'partial') && isWithinSelectedDateRange(sheet.eventDate))
      .flatMap((sheet) =>
        sheet.lineItems
          .filter((lineItem) => lineItem.purchaseItemId === selectedStockDetailItem.id)
          .filter((lineItem) => storeFilter === 'all' || lineItem.sourceStore === storeFilter)
          .map((lineItem) => {
            const qty = convertToPurchaseUnit(
              Number(lineItem.issuedQuantity) || 0,
              lineItem.unit,
              selectedStockDetailItem.purchaseUnit,
              selectedStockDetailItem.baseUnit,
              selectedStockDetailItem.conversionFactor,
            );
            const kitchenDepartment = `${sheet.module === 'banquet' ? 'Banquet Kitchen' : 'Restaurant Kitchen'}${
              sheet.venueName ? ` · ${sheet.venueName}` : sheet.customerName ? ` · ${sheet.customerName}` : ''
            }`;

            return {
              id: `${sheet.id}-${lineItem.purchaseItemId}`,
              date: sheet.eventDate,
              reference: sheet.issueNumber,
              kitchenDepartment,
              qty,
              value: qty * issueRate,
            };
          }),
      )
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  }, [convertToPurchaseUnit, isWithinSelectedDateRange, kitchenIssueSheets, selectedStockDetailItem, storeFilter]);

  const stockLedgerRows = useMemo(() => {
    if (!selectedStockDetailItem) {
      return [];
    }

    const ledgerEntries = [
      ...purchaseHistoryRows.map((entry) => ({
        id: `purchase-${entry.id}`,
        date: entry.date,
        type: 'Purchase',
        reference: entry.reference,
        inQty: entry.qty,
        outQty: 0,
        value: entry.value,
      })),
      ...issueHistoryRows.map((entry) => ({
        id: `issue-${entry.id}`,
        date: entry.date,
        type: 'Issue',
        reference: entry.reference,
        inQty: 0,
        outQty: entry.qty,
        value: entry.value,
      })),
    ].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());

    let runningBalance = selectedStockDetailItem.openingQty;

    return ledgerEntries.map((entry) => {
      runningBalance += entry.inQty - entry.outQty;
      return {
        ...entry,
        balanceQty: Math.round(runningBalance * 1000) / 1000,
      };
    });
  }, [issueHistoryRows, purchaseHistoryRows, selectedStockDetailItem]);

  const storeCoverage = useMemo(
    () =>
      activeKitchenStoreOptions
        .map((store) => {
          const items = purchaseItems.filter((item) => getItemAssignedStoreIds(item).includes(store.id));
          const lowStock = items.filter((item) => {
            const derivedStock = stockTotalsByItem.get(item.id) ?? 0;
            return isTracked(item) && derivedStock <= item.reorderLevel;
          }).length;
          return {
            id: store.id,
            label: store.label,
            itemCount: items.length,
            lowStock,
          };
        })
        .filter((store) => store.itemCount > 0)
        .sort((left, right) => {
          if (left.lowStock !== right.lowStock) {
            return right.lowStock - left.lowStock;
          }
          return right.itemCount - left.itemCount;
        })
        .slice(0, 8),
    [activeKitchenStoreOptions, purchaseItems, stockTotalsByItem],
  );

  const resolvedPurchaseUnitOptions = ensureSelectedUnitOption(purchaseUnitOptions, formPurchaseUnit);
  const resolvedBaseUnitOptions = ensureSelectedUnitOption(baseUnitOptions, formBaseUnit);
  const formSubCategoryOptions = useMemo(() => {
    const lookupOptions = getLookupOptions(subCategoryLookupValues);
    const legacyOptions = legacySubCategoryOptionsByCategory[formCategoryId] || [];
    const mergedOptions = [...lookupOptions];

    legacyOptions.forEach((option) => {
      if (!mergedOptions.some((entry) => entry.value === option.value)) {
        mergedOptions.push(option);
      }
    });

    if (formSubCategoryId && !mergedOptions.some((option) => option.value === formSubCategoryId)) {
      const selected = subCategoryLookupValues.find((entry) => entry.id === formSubCategoryId);
      if (selected) {
        mergedOptions.push({ value: selected.id, label: `${selected.name} (Inactive)` });
      }
    }

    return mergedOptions;
  }, [formCategoryId, formSubCategoryId, subCategoryLookupValues]);
  const editingDerivedStock = editingItem ? stockTotalsByItem.get(editingItem.id) ?? 0 : 0;
  const currentStockPreview = editingItem ? editingDerivedStock : 0;
  const reservedStockPreview = 0;
  const availableStockPreview = Math.max(0, currentStockPreview - reservedStockPreview);
  const currentValuationRate =
    editingItem?.ratePerUnit ?? editingItem?.averageCost ?? editingItem?.lastPurchaseRate ?? formDefaultPurchaseCost ?? 0;
  const assignedStoreSummary = formatStoreSummary(stores, formAssignedStoreIds);
  const preferredVendorName =
    activeVendors.find((vendor) => vendor.id === formPreferredSupplierId)?.vendorName || 'Not selected';
  const conversionFormula = `1 ${formPurchaseUnit || '-'} = ${formConversionFactor || 0} ${formBaseUnit || '-'}`;
  const generalSummary = `${getPurchaseCategoryLabel(formCategoryId)} / ${getResolvedSubCategoryLabel(formCategoryId, formSubCategoryId)}`;
  const inventorySummary = `${getInventoryTypeLabel(formInventoryType)}, ${formTrackInventory ? 'tracked' : 'not tracked'}, ${getCostingMethodLabel(formCostingMethod)}, recipes: ${formUseInRecipeIngredients ? 'ingredient' : 'hidden'} / ${formUseAsRecipeOutput ? 'output' : 'no output'}`;
  const unitsSummary = `Base: ${formBaseUnit || '-'}, Purchase: ${formPurchaseUnit || '-'}, ${conversionFormula}`;
  const replenishmentSummary = `Reorder: ${formReorderLevel || 0}, Min: ${formMinimumStockLevel || 0}, Max: ${formMaximumStockLevel || 0}, MOQ: ${formMinimumOrderQuantity || 0}`;
  const approvedVendorsSummary = `${formApprovedVendors.length} vendors configured`;
  const itemSummaryText = `${formItemCode || 'Auto'} - ${getPurchaseCategoryLabel(formCategoryId)} - ${formStatus}`;
  const costInformationSummary = `Last Rate: ${formatCurrencyPKR(editingItem?.lastPurchaseRate || 0)}, Avg Cost: ${formatCurrencyPKR(editingItem?.averageCost || 0)}`;
  const stockSummaryText = `Available: ${availableStockPreview} ${formBaseUnit || ''}`;
  const purchasingSnapshotSummary = `Preferred Vendor: ${preferredVendorName}, Lead Time: ${formLeadTimeDays || 0} days`;
  const unitsHasError = formTrackInventory && (!formBaseUnit || !formPurchaseUnit || formConversionFactor <= 0);
  const replenishmentHasError =
    formReorderLevel < 0 ||
    formMinimumStockLevel < 0 ||
    formMaximumStockLevel < 0 ||
    formLeadTimeDays < 0 ||
    formMinimumOrderQuantity < 0;
  const storesHasError = formTrackInventory && formAssignedStoreIds.filter((storeId) => allowedKitchenStoreIds.has(storeId)).length === 0;
  const dialogTabs: Array<{
    id: KitchenItemDialogTab;
    label: string;
    note: string;
    icon: LucideIcon;
  }> = [
    {
      id: 'category-policy',
      label: 'Category & Policy',
      note: `${generalSummary} | ${getCostingMethodLabel(formCostingMethod)} / ${getIssueMethodLabel(formIssueMethod)}`,
      icon: Package,
    },
    {
      id: 'units-replenishment',
      label: 'Units & Replenishment',
      note: `${unitsSummary} | ${replenishmentSummary}`,
      icon: ClipboardList,
    },
    {
      id: 'vendors',
      label: 'Vendors',
      note: approvedVendorsSummary,
      icon: History,
    },
    {
      id: 'stores-summary',
      label: 'Stores & Summary',
      note: `${assignedStoreSummary} | ${stockSummaryText}`,
      icon: Warehouse,
    },
  ];
  const activeDialogTabConfig = dialogTabs.find((tab) => tab.id === activeDialogTab) ?? dialogTabs[0];
  const categoryManagerRows = useMemo(
    () => [
      ...procurementLookups.purchaseCategories.map((entry) => ({
        ...entry,
        section: 'purchaseCategories' as CategoryManagerSection,
        sectionLabel: 'Category',
        parentLabel: '-',
      })),
      ...procurementLookups.purchaseSubCategories.map((entry) => ({
        ...entry,
        section: 'purchaseSubCategories' as CategoryManagerSection,
        sectionLabel: 'Sub Category',
        parentLabel: entry.parentId ? getLookupName(procurementLookups.purchaseCategories, entry.parentId) : '-',
      })),
    ].sort((left, right) => {
      if (left.sectionLabel !== right.sectionLabel) {
        return left.sectionLabel.localeCompare(right.sectionLabel);
      }
      const leftOrder = left.sortOrder ?? 999;
      const rightOrder = right.sortOrder ?? 999;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.name.localeCompare(right.name);
    }),
    [procurementLookups.purchaseCategories, procurementLookups.purchaseSubCategories],
  );

  const scrollToStoreAssignment = () => {
    if (typeof document === 'undefined') {
      return;
    }

    setShowStoreSection(true);
    window.setTimeout(() => {
      document.getElementById('kitchen-store-assignment')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 0);
  };

  const resetForm = (itemCode: string, preservedDefaults?: Partial<BatchEntryDefaults>) => {
    const preservedCategoryId = preservedDefaults?.categoryId || fallbackPurchaseCategoryId;
    const suggestedSetup = getCategorySuggestedSetup(preservedCategoryId);

    setActiveDialogTab('category-policy');
    setShowCategoryManager(false);
    setShowAdvancedSection(false);
    setShowVendorSection(false);
    setShowStoreSection(false);
    setShowSetupSection(false);
    resetCategoryManagerDraft('purchaseCategories');
    setFormItemName('');
    setFormItemCode(itemCode);
    setFormCategoryId(preservedCategoryId);
    setFormSubCategoryId(preservedDefaults?.subCategoryId || '');
    setFormDescription('');
    setFormStatus(preservedDefaults?.status || 'active');
    setFormInventoryType('raw-material');
    setFormTrackInventory(true);
    setFormUseInRecipeIngredients(true);
    setFormUseAsRecipeOutput(false);
    setFormCostingMethod('last-purchase-rate');
    setFormIssueMethod('fifo');
    setFormPurchaseUnit(preservedDefaults?.purchaseUnit || suggestedSetup.purchaseUnit || fallbackPurchaseUnit);
    setFormBaseUnit(preservedDefaults?.baseUnit || suggestedSetup.baseUnit || fallbackBaseUnit);
    setFormConversionFactor(preservedDefaults?.conversionFactor ?? suggestedSetup.conversionFactor ?? 1000);
    setFormReorderLevel(preservedDefaults?.reorderLevel ?? 0);
    setFormMinimumStockLevel(0);
    setFormMaximumStockLevel(0);
    setFormAllowNegativeStock(false);
    setFormPreferredSupplierId(preservedDefaults?.preferredSupplierId || '');
    setFormApprovedVendors([]);
    setFormDefaultPurchaseCost(preservedDefaults?.defaultPurchaseCost ?? 0);
    setFormLeadTimeDays(preservedDefaults?.leadTimeDays ?? 0);
    setFormMinimumOrderQuantity(preservedDefaults?.minimumOrderQuantity ?? 0);
    setFormTaxGroupId('');
    setFormAssignedStoreIds(
      preservedDefaults?.assignedStoreIds?.length
        ? preservedDefaults.assignedStoreIds
        : suggestedSetup.assignedStoreIds.length
          ? suggestedSetup.assignedStoreIds
          : activeKitchenStoreOptions[0]?.id
            ? [activeKitchenStoreOptions[0].id]
            : [],
    );
  };

  const closeDialog = () => {
    setEditingItem(null);
    setActionsOpen(false);
    setExpandedApprovedVendorId(null);
    setActiveDialogTab('category-policy');
    setShowCategoryManager(false);
    setShowAdvancedSection(false);
    setShowVendorSection(false);
    setShowStoreSection(false);
    setShowSetupSection(false);
    resetCategoryManagerDraft('purchaseCategories');
    setDialogOpen(false);
  };

  const openStockDetailDrawer = (itemId: string) => {
    setSelectedStockDetailItemId(itemId);
    setStockDetailTab('summary');
  };

  const closeStockDetailDrawer = () => {
    setSelectedStockDetailItemId(null);
    setStockDetailTab('summary');
  };

  const handleAddNew = () => {
    setEditingItem(null);
    resetForm(generateItemCode(purchaseItems));
    setActionsOpen(false);
    setExpandedApprovedVendorId(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: PurchaseItem) => {
    const categoryId = getCategoryId(item);
    const existingMappings = vendorItemMappings.filter((mapping) => mapping.kitchenItemId === item.id);
    setEditingItem(item);
    setActiveDialogTab('category-policy');
    setShowCategoryManager(false);
    setShowAdvancedSection(false);
    setShowVendorSection(existingMappings.length > 0);
    setShowStoreSection(false);
    setShowSetupSection(false);
    resetCategoryManagerDraft('purchaseCategories', categoryId);
    setFormItemName(item.itemName);
    setFormItemCode(item.itemCode || generateItemCode(purchaseItems));
    setFormCategoryId(categoryId);
    setFormSubCategoryId(item.subCategoryId || '');
    setFormDescription(item.description || '');
    setFormStatus(item.status);
    setFormInventoryType(getInventoryType(item));
    setFormTrackInventory(isTracked(item));
    setFormUseInRecipeIngredients(isRecipeIngredientEnabled(item));
    setFormUseAsRecipeOutput(isRecipeOutputEnabled(item));
    setFormCostingMethod(getCostingMethod(item));
    setFormIssueMethod(getIssueMethod(item));
    setFormPurchaseUnit(getPurchaseUnit(item));
    setFormBaseUnit(getBaseUnit(item));
    setFormConversionFactor(item.conversionFactor);
    setFormReorderLevel(item.reorderLevel || 0);
    setFormMinimumStockLevel(item.minimumStockLevel || 0);
    setFormMaximumStockLevel(item.maximumStockLevel || 0);
    setFormAllowNegativeStock(Boolean(item.allowNegativeStock));
    setFormPreferredSupplierId(item.preferredSupplierId || '');
    {
      if (existingMappings.length > 0) {
        setFormApprovedVendors(existingMappings);
      } else if (item.preferredSupplierId) {
        const now = new Date();
        setFormApprovedVendors([
          {
            id: `vendor-item-mapping-${Date.now()}`,
            vendorId: item.preferredSupplierId,
            kitchenItemId: item.id,
            isPreferred: true,
            leadTimeDays: item.leadTimeDays || undefined,
            moq: item.minimumOrderQuantity || undefined,
            lastRate: item.lastPurchaseRate || item.defaultPurchaseCost || undefined,
            contractRate: undefined,
            status: 'active',
            notes: '',
            createdAt: now,
            updatedAt: now,
          },
        ]);
      } else {
        setFormApprovedVendors([]);
      }
    }
    setFormDefaultPurchaseCost(item.defaultPurchaseCost || 0);
    setFormLeadTimeDays(item.leadTimeDays || 0);
    setFormMinimumOrderQuantity(item.minimumOrderQuantity || 0);
    setFormTaxGroupId(item.taxGroupId || '');
    setFormAssignedStoreIds(getItemAssignedStoreIds(item).filter((storeId) => allowedKitchenStoreIds.has(storeId)));
    setActionsOpen(false);
    setExpandedApprovedVendorId(null);
    setDialogOpen(true);
  };

  const handleCategoryChange = (categoryId: string) => {
    setFormCategoryId(categoryId);
    setFormSubCategoryId('');
    if (!editingItem) {
      const suggestedSetup = getCategorySuggestedSetup(categoryId);
      setFormPurchaseUnit(suggestedSetup.purchaseUnit);
      setFormBaseUnit(suggestedSetup.baseUnit);
      setFormConversionFactor(suggestedSetup.conversionFactor);
      if (suggestedSetup.assignedStoreIds.length > 0) {
        setFormAssignedStoreIds(suggestedSetup.assignedStoreIds);
      }
    }
    setCategoryManagerDraft((current) =>
      current.section === 'purchaseSubCategories' ? { ...current, parentId: categoryId } : current,
    );
  };

  const getBatchEntryDefaults = (): BatchEntryDefaults => ({
    assignedStoreIds: formAssignedStoreIds.filter((storeId) => allowedKitchenStoreIds.has(storeId)),
    baseUnit: formBaseUnit,
    categoryId: formCategoryId,
    conversionFactor: formConversionFactor,
    defaultPurchaseCost: formDefaultPurchaseCost,
    leadTimeDays: formLeadTimeDays,
    minimumOrderQuantity: formMinimumOrderQuantity,
    preferredSupplierId: formPreferredSupplierId,
    purchaseUnit: formPurchaseUnit,
    reorderLevel: formReorderLevel,
    status: formStatus,
    subCategoryId: formSubCategoryId,
  });

  const resetCategoryManagerDraft = (section: CategoryManagerSection = 'purchaseCategories', parentId = formCategoryId) => {
    setEditingCategoryLookupId(null);
    setCategoryManagerDraft(createEmptyCategoryManagerDraft(section, section === 'purchaseSubCategories' ? parentId : ''));
  };

  const openEditCategoryLookup = (section: CategoryManagerSection, entry: ProcurementLookupValue) => {
    setShowCategoryManager(true);
    setEditingCategoryLookupId(entry.id);
    setCategoryManagerDraft({
      section,
      name: entry.name,
      parentId: entry.parentId || '',
      isActive: entry.status !== 'inactive',
    });
  };

  const saveCategoryManagerDraft = () => {
    const trimmedName = categoryManagerDraft.name.trim();
    if (!trimmedName) {
      toast.error('Name is required');
      return;
    }

    if (categoryManagerDraft.section === 'purchaseSubCategories' && !categoryManagerDraft.parentId) {
      toast.error('Select a category for the sub category');
      return;
    }

    const section = categoryManagerDraft.section;
    const existingValues = procurementLookups[section];
    const normalizedName = trimmedName.toLowerCase();
    const duplicate = existingValues.find((entry) => {
      if (editingCategoryLookupId && entry.id === editingCategoryLookupId) {
        return false;
      }
      const sameParent = section !== 'purchaseSubCategories' || entry.parentId === categoryManagerDraft.parentId;
      return sameParent && entry.name.trim().toLowerCase() === normalizedName;
    });

    if (duplicate) {
      toast.info('This name already exists');
      return;
    }

    const now = new Date();
    let savedId = editingCategoryLookupId;
    let created = false;

    const nextValues = editingCategoryLookupId
      ? existingValues.map((entry) =>
          entry.id === editingCategoryLookupId
            ? {
                ...entry,
                name: trimmedName,
                parentId: section === 'purchaseSubCategories' ? categoryManagerDraft.parentId : undefined,
                status: categoryManagerDraft.isActive ? 'active' : 'inactive',
                updatedAt: now,
              }
            : entry,
        )
      : (() => {
          const createdValue = createProcurementLookupValue(trimmedName, existingValues, 'Procurement');
          if (!createdValue) {
            return existingValues;
          }
          created = true;
          savedId = createdValue.id;
          return [
            ...existingValues,
            {
              ...createdValue,
              parentId: section === 'purchaseSubCategories' ? categoryManagerDraft.parentId : undefined,
              status: categoryManagerDraft.isActive ? 'active' : 'inactive',
            },
          ];
        })();

    onProcurementLookupsChange({
      ...procurementLookups,
      [section]: nextValues,
    });

    if (savedId) {
      if (section === 'purchaseCategories') {
        handleCategoryChange(savedId);
      } else if (categoryManagerDraft.parentId === formCategoryId) {
        setFormSubCategoryId(savedId);
      }
    }

    toast.success(created ? 'Category added' : 'Category updated');
    resetCategoryManagerDraft(section, section === 'purchaseSubCategories' ? categoryManagerDraft.parentId || formCategoryId : formCategoryId);
  };

  const toggleCategoryLookupActive = (section: CategoryManagerSection, entryId: string) => {
    const currentEntry = procurementLookups[section].find((entry) => entry.id === entryId);
    if (!currentEntry) {
      return;
    }

    onProcurementLookupsChange({
      ...procurementLookups,
      [section]: procurementLookups[section].map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              status: entry.status === 'inactive' ? 'active' : 'inactive',
              updatedAt: new Date(),
            }
          : entry,
      ),
    });
  };

  const toggleAssignedStore = (storeId: StoreLocation) => {
    setFormAssignedStoreIds((current) =>
      current.includes(storeId)
        ? current.filter((currentStoreId) => currentStoreId !== storeId)
        : [...current, storeId],
    );
  };

  const syncPreferredVendorSelection = (vendorId: string) => {
    setFormPreferredSupplierId(vendorId);
    setFormApprovedVendors((current) => {
      if (!vendorId) {
        return current.map((mapping) => ({ ...mapping, isPreferred: false, updatedAt: new Date() }));
      }

      const existing = current.find((mapping) => mapping.vendorId === vendorId);
      if (existing) {
        return current.map((mapping) => ({
          ...mapping,
          isPreferred: mapping.vendorId === vendorId,
          updatedAt: new Date(),
        }));
      }

      const now = new Date();
      return [
        ...current.map((mapping) => ({ ...mapping, isPreferred: false, updatedAt: now })),
        {
          id: `vendor-item-mapping-${Date.now()}`,
          vendorId,
          kitchenItemId: editingItem?.id || '',
          isPreferred: true,
          leadTimeDays: formLeadTimeDays || undefined,
          moq: formMinimumOrderQuantity || undefined,
          lastRate: formDefaultPurchaseCost || editingItem?.lastPurchaseRate || undefined,
          contractRate: undefined,
          status: 'active',
          notes: '',
          createdAt: now,
          updatedAt: now,
        },
      ];
    });
  };

  const handleAddApprovedVendor = () => {
    const availableVendor = activeVendors.find(
      (vendor) => !formApprovedVendors.some((mapping) => mapping.vendorId === vendor.id),
    );
    if (!availableVendor) {
      toast.info('No more active vendors available to add');
      return;
    }

    const now = new Date();
    setFormApprovedVendors([
      ...formApprovedVendors,
      {
        id: `vendor-item-mapping-${Date.now()}`,
        vendorId: availableVendor.id,
        kitchenItemId: editingItem?.id || '',
        isPreferred: false,
        leadTimeDays: formLeadTimeDays || undefined,
        moq: formMinimumOrderQuantity || undefined,
        lastRate: formDefaultPurchaseCost || editingItem?.lastPurchaseRate || undefined,
        contractRate: undefined,
        status: 'active',
        notes: '',
        createdAt: now,
        updatedAt: now,
      },
    ]);
  };

  const handleUpdateApprovedVendor = (
    mappingId: string,
    field: keyof VendorItemMapping,
    value: string | number | boolean,
  ) => {
    setFormApprovedVendors((current) =>
      current.map((mapping) => {
        if (mapping.id !== mappingId) {
          if (field === 'isPreferred' && value === true) {
            return { ...mapping, isPreferred: false, updatedAt: new Date() };
          }
          return mapping;
        }

        const nextValue =
          field === 'leadTimeDays' || field === 'moq' || field === 'lastRate' || field === 'contractRate'
            ? Number(value)
            : value;
        const nextMapping = {
          ...mapping,
          [field]: nextValue,
          updatedAt: new Date(),
        };

        if (field === 'isPreferred' && value === true) {
          setFormPreferredSupplierId(mapping.vendorId);
        }

        if (field === 'vendorId' && mapping.isPreferred) {
          setFormPreferredSupplierId(String(value));
        }

        return nextMapping;
      }),
    );
  };

  const handleRemoveApprovedVendor = (mappingId: string) => {
    setFormApprovedVendors((current) => {
      const removed = current.find((mapping) => mapping.id === mappingId);
      if (removed?.isPreferred) {
        setFormPreferredSupplierId('');
      }
      return current.filter((mapping) => mapping.id !== mappingId);
    });
  };

  const numberValidations: Array<[boolean, string]> = [
    [formConversionFactor > 0, 'Conversion must be greater than 0'],
    [formReorderLevel >= 0, 'Reorder level cannot be negative'],
    [formMinimumStockLevel >= 0, 'Minimum stock level cannot be negative'],
    [formMaximumStockLevel >= 0, 'Maximum stock level cannot be negative'],
    [formDefaultPurchaseCost >= 0, 'Default purchase cost cannot be negative'],
    [formLeadTimeDays >= 0, 'Lead time days cannot be negative'],
    [formMinimumOrderQuantity >= 0, 'Minimum order quantity cannot be negative'],
  ];

  const buildApprovedVendorMappingsForItem = (itemId: string) => {
    const now = new Date();
    const preferredVendorId =
      formApprovedVendors.find((mapping) => mapping.isPreferred)?.vendorId || formPreferredSupplierId;
    const mappingsByVendor = new Map<string, VendorItemMapping>();

    formApprovedVendors.forEach((mapping) => {
      if (!mapping.vendorId) {
        return;
      }

      mappingsByVendor.set(mapping.vendorId, {
        ...mapping,
        kitchenItemId: itemId,
        isPreferred: Boolean(preferredVendorId && mapping.vendorId === preferredVendorId),
        leadTimeDays: mapping.leadTimeDays || undefined,
        moq: mapping.moq || undefined,
        lastRate: mapping.lastRate || undefined,
        contractRate: mapping.contractRate || undefined,
        status: mapping.status || 'active',
        updatedAt: now,
      });
    });

    if (preferredVendorId && !mappingsByVendor.has(preferredVendorId)) {
      mappingsByVendor.set(preferredVendorId, {
        id: `vendor-item-mapping-${Date.now()}`,
        vendorId: preferredVendorId,
        kitchenItemId: itemId,
        isPreferred: true,
        leadTimeDays: formLeadTimeDays || undefined,
        moq: formMinimumOrderQuantity || undefined,
        lastRate: formDefaultPurchaseCost || undefined,
        contractRate: undefined,
        status: 'active',
        notes: '',
        createdAt: now,
        updatedAt: now,
      });
    }

    return Array.from(mappingsByVendor.values());
  };

  const handleSave = (mode: 'close' | 'new' = 'close') => {
    const trimmedName = formItemName.trim();
    const assignedKitchenStoreIds = formTrackInventory
      ? formAssignedStoreIds.filter((storeId) => allowedKitchenStoreIds.has(storeId))
      : [];
    const batchDefaults = getBatchEntryDefaults();

    if (!trimmedName) {
      toast.error('Item name is required');
      return;
    }

    if (!formCategoryId) {
      toast.error('Category is required');
      return;
    }

    if (!formInventoryType) {
      toast.error('Inventory type is required');
      return;
    }

    if (formTrackInventory) {
      if (!formBaseUnit) {
        toast.error('Base unit is required when inventory is tracked');
        return;
      }

      if (!formPurchaseUnit) {
        toast.error('Purchase unit is required when inventory is tracked');
        return;
      }

      if (formConversionFactor <= 0) {
        toast.error('Conversion must be greater than 0');
        return;
      }

      if (assignedKitchenStoreIds.length === 0) {
        toast.error('Select at least one kitchen store when inventory is tracked');
        return;
      }
    }

    const invalidNumber = numberValidations.find(([valid]) => !valid);
    if (invalidNumber) {
      toast.error(invalidNumber[1]);
      return;
    }

    const duplicate = purchaseItems.find(
      (item) => item.itemName.toLowerCase() === trimmedName.toLowerCase() && item.id !== editingItem?.id,
    );

    if (duplicate) {
      toast.error('An item with this name already exists');
      return;
    }

    const now = new Date();
    const primaryStoreLocation = assignedKitchenStoreIds[0] || '';
    const itemIdForMapping = editingItem?.id || `purchase-item-${Date.now()}`;
    const approvedVendorMappings = buildApprovedVendorMappingsForItem(itemIdForMapping);
    const preferredVendorId =
      approvedVendorMappings.find((mapping) => mapping.isPreferred)?.vendorId || formPreferredSupplierId || undefined;
    const nextVendorItemMappings = [
      ...vendorItemMappings.filter((mapping) => mapping.kitchenItemId !== itemIdForMapping),
      ...approvedVendorMappings,
    ];

    if (editingItem) {
      const compatibilitySupplyCategoryId = getLegacySupplyCategoryIdForCategory(formCategoryId);
      const updatedItems = purchaseItems.map((item) => {
        if (item.id !== editingItem.id) {
          return item;
        }

        return {
          ...item,
          itemName: trimmedName,
          itemCode: formItemCode,
          category: formCategoryId,
          categoryId: formCategoryId,
          purchaseCategoryId: formCategoryId,
          supplyCategoryId: compatibilitySupplyCategoryId,
          subCategoryId: formSubCategoryId || undefined,
          description: formDescription.trim() || undefined,
          status: formStatus,
          inventoryType: formInventoryType,
          trackInventory: formTrackInventory,
          useInRecipeIngredients: formUseInRecipeIngredients,
          useAsRecipeOutput: formUseAsRecipeOutput,
          costingMethod: formCostingMethod,
          issueMethod: formIssueMethod,
          purchaseUnit: formPurchaseUnit,
          purchaseUnitId: formPurchaseUnit,
          issueUnit: formBaseUnit,
          baseUnitId: formBaseUnit,
          conversionFactor: formConversionFactor,
          storeLocation: primaryStoreLocation,
          assignedKitchenStoreIds,
          currentStock: stockTotalsByItem.get(item.id) ?? item.currentStock,
          reorderLevel: formReorderLevel,
          minimumStockLevel: formMinimumStockLevel,
          maximumStockLevel: formMaximumStockLevel,
          allowNegativeStock: formAllowNegativeStock,
          preferredSupplierId: preferredVendorId,
          defaultPurchaseCost: formDefaultPurchaseCost,
          leadTimeDays: formLeadTimeDays,
          minimumOrderQuantity: formMinimumOrderQuantity,
          taxGroupId: formTaxGroupId || undefined,
          updatedAt: now,
        };
      });

      const updatedStocks = reconcileStoreStocksForItem(
        storeStocks,
        editingItem.id,
        trimmedName,
        assignedKitchenStoreIds,
        formBaseUnit,
        formReorderLevel,
        now,
      );

      onPurchaseItemsChange(updatedItems);
      onVendorItemMappingsChange(nextVendorItemMappings);
      onStoreStocksChange(updatedStocks);
      toast.success('Kitchen item updated successfully');
    } else {
      const compatibilitySupplyCategoryId = getLegacySupplyCategoryIdForCategory(formCategoryId);
      const newItem: PurchaseItem = {
        id: itemIdForMapping,
        itemName: trimmedName,
        itemCode: formItemCode,
        category: formCategoryId,
        categoryId: formCategoryId,
        purchaseCategoryId: formCategoryId,
        supplyCategoryId: compatibilitySupplyCategoryId,
        subCategoryId: formSubCategoryId || undefined,
        description: formDescription.trim() || undefined,
        status: formStatus,
        inventoryType: formInventoryType,
        trackInventory: formTrackInventory,
        useInRecipeIngredients: formUseInRecipeIngredients,
        useAsRecipeOutput: formUseAsRecipeOutput,
        costingMethod: formCostingMethod,
        issueMethod: formIssueMethod,
        purchaseUnit: formPurchaseUnit,
        purchaseUnitId: formPurchaseUnit,
        issueUnit: formBaseUnit,
        baseUnitId: formBaseUnit,
        conversionFactor: formConversionFactor,
        storeLocation: primaryStoreLocation,
        assignedKitchenStoreIds,
        currentStock: 0,
        reorderLevel: formReorderLevel,
        minimumStockLevel: formMinimumStockLevel,
        maximumStockLevel: formMaximumStockLevel,
        allowNegativeStock: formAllowNegativeStock,
        preferredSupplierId: preferredVendorId,
        defaultPurchaseCost: formDefaultPurchaseCost,
        leadTimeDays: formLeadTimeDays,
        minimumOrderQuantity: formMinimumOrderQuantity,
        taxGroupId: formTaxGroupId || undefined,
        lastPurchaseRate: 0,
        createdAt: now,
        updatedAt: now,
      };

      onPurchaseItemsChange([...purchaseItems, newItem]);
      onVendorItemMappingsChange(nextVendorItemMappings);
      onStoreStocksChange(storeStocks);
      toast.success('Kitchen item created successfully');
    }

    if (mode === 'new') {
      setEditingItem(null);
      const nextItemCode = editingItem
        ? generateItemCode(purchaseItems)
        : generateItemCode([...purchaseItems, { itemCode: formItemCode } as PurchaseItem]);
      resetForm(nextItemCode, batchDefaults);
      setActionsOpen(false);
      setExpandedApprovedVendorId(null);
      setDialogOpen(true);
      return;
    }

    closeDialog();
  };

  const emptyMessage =
    searchTerm ||
    categoryFilter !== 'all' ||
    subCategoryFilter !== 'all' ||
    storeFilter !== 'all' ||
    stockFilter !== 'all' ||
    recipeFilter !== 'all' ||
    setupFilter !== 'all'
      ? 'No kitchen items match the current filters.'
      : 'No kitchen items yet. Create the first item to start item control.';

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <h2 className="mr-2 text-base font-semibold text-slate-900">Kitchen Stock Register</h2>
          <div className="flex-1" />
          <button
            onClick={handleAddNew}
            className="inline-flex h-9 items-center gap-2 rounded border border-blue-600 bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="size-4" />
            Create Item
          </button>
        </div>

        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span><strong className="text-slate-900">Items:</strong> {metrics.total}</span>
            <span><strong className="text-slate-900">Low Stock:</strong> {metrics.lowStock}</span>
            <span><strong className="text-slate-900">Assigned Stores:</strong> {metrics.assignedStores}</span>
            <span><strong className="text-slate-900">Categories:</strong> {metrics.categories}</span>
            <span><strong className="text-slate-900">Recipe Enabled:</strong> {metrics.recipeEnabled}</span>
            <button
              type="button"
              onClick={() => setRecipeFilter('recipe-blocked')}
              className={`font-semibold ${metrics.recipeBlocked > 0 ? 'text-red-700 hover:underline' : 'text-slate-900'}`}
              title="Show items not enabled for recipe ingredients"
            >
              Recipe Blocked: {metrics.recipeBlocked}
            </button>
            <button
              type="button"
              onClick={() => setSetupFilter('store-missing')}
              className={`font-semibold ${metrics.missingStore > 0 ? 'text-amber-700 hover:underline' : 'text-slate-900'}`}
              title="Show items without store assignment"
            >
              Missing Store: {metrics.missingStore}
            </button>
            <button
              type="button"
              onClick={() => setSetupFilter('conversion-risk')}
              className={`font-semibold ${metrics.conversionRisk > 0 ? 'text-amber-700 hover:underline' : 'text-slate-900'}`}
              title="Show items with missing or invalid unit conversion"
            >
              Unit Risk: {metrics.conversionRisk}
            </button>
            <span><strong className="text-slate-900">Stock Rows:</strong> {metrics.stockRows}</span>
          </div>
        </div>

        {activeKitchenStoreOptions.length === 0 ? (
          <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
            Create an active kitchen store before saving tracked kitchen items.
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-hidden p-4">
        {itemRows.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-300 bg-white px-6 text-center">
            <div>
              <Package className="mx-auto mb-3 size-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No kitchen items found</p>
              <p className="mt-1 text-xs text-slate-500">{emptyMessage}</p>
            </div>
          </div>
        ) : (
          <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="overflow-hidden rounded border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <h3 className="text-sm font-semibold text-slate-900">Kitchen Stock Register</h3>
                <span className="text-xs text-slate-500">{itemRows.length} rows</span>
              </div>
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-3">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-9">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">From Date</label>
                    <input
                      type="date"
                      value={fromDate}
                      max={toDate || undefined}
                      onChange={(event) => setFromDate(event.target.value)}
                      className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">To Date</label>
                    <input
                      type="date"
                      value={toDate}
                      min={fromDate || undefined}
                      onChange={(event) => setToDate(event.target.value)}
                      className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Store</label>
                    <select
                      value={storeFilter}
                      onChange={(event) => setStoreFilter(event.target.value)}
                      className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      <option value="all">All Stores</option>
                      {activeKitchenStoreOptions.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Category</label>
                    <select
                      value={categoryFilter}
                      onChange={(event) => {
                        setCategoryFilter(event.target.value);
                        setSubCategoryFilter('all');
                      }}
                      className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      <option value="all">All Categories</option>
                      {itemCategoryOptions.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sub Category</label>
                    <select
                      value={subCategoryFilter}
                      onChange={(event) => setSubCategoryFilter(event.target.value)}
                      className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      <option value="all">All Sub Categories</option>
                      {registerSubCategoryOptions.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Stock Status</label>
                    <select
                      value={stockFilter}
                      onChange={(event) => setStockFilter(event.target.value as RegisterStockStatusFilter)}
                      className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      <option value="all">All Status</option>
                      <option value="out">Out</option>
                      <option value="low">Low</option>
                      <option value="ok">OK</option>
                      <option value="not-tracked">Not Tracked</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Recipe Use</label>
                    <select
                      value={recipeFilter}
                      onChange={(event) => setRecipeFilter(event.target.value as RegisterRecipeFilter)}
                      className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      <option value="all">All Items</option>
                      <option value="recipe-enabled">Recipe Enabled</option>
                      <option value="recipe-blocked">Recipe Blocked</option>
                      <option value="recipe-output">Recipe Output</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Setup Issue</label>
                    <select
                      value={setupFilter}
                      onChange={(event) => setSetupFilter(event.target.value as RegisterSetupFilter)}
                      className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      <option value="all">All Setup</option>
                      <option value="store-missing">Missing Store</option>
                      <option value="conversion-risk">Unit Risk</option>
                      <option value="advanced">Advanced Setup</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 xl:col-span-1 2xl:col-span-1">
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Search Item</label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search item or code"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-[calc(100%-138px)] overflow-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Item</th>
                      <th className={tableHeadClass}>Category</th>
                      <th className={tableHeadClass}>Store</th>
                      <th className={tableHeadClass}>Unit</th>
                      <th className={tableHeadClass}>Setup</th>
                      <th className={`${tableHeadClass} text-right`}>Opening Qty</th>
                      <th className={`${tableHeadClass} text-right`}>Purchased Qty</th>
                      <th className={`${tableHeadClass} text-right`}>Issued Qty</th>
                      <th className={`${tableHeadClass} text-right`}>Balance Qty</th>
                      <th className={`${tableHeadClass} text-right`}>Reorder Level</th>
                      <th className={`${tableHeadClass} text-right`}>Stock Value</th>
                      <th className={tableHeadClass}>Status</th>
                      <th className={`${tableHeadClass} text-right`}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemRows.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => openStockDetailDrawer(item.id)}
                        className="cursor-pointer border-t border-slate-200 hover:bg-slate-50"
                      >
                        <td className={tableCellClass}>
                          <div className="flex items-center gap-2">
                            {(item.stockMeta.label === 'Low' || item.stockMeta.label === 'Out') ? (
                              <AlertTriangle className="size-4 text-amber-600" />
                            ) : null}
                            <div>
                              <div className="font-medium text-slate-900">{item.itemName}</div>
                              <div className="text-xs text-slate-500">
                                {item.itemCode || 'No code'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={tableCellClass}>
                          <div>{getPurchaseCategoryLabel(item.categoryId)}</div>
                          <div className="text-xs text-slate-500">{getResolvedSubCategoryLabel(item.categoryId, item.subCategoryId)}</div>
                        </td>
                        <td className={tableCellClass}>
                          <div className="text-slate-900">{formatStoreSummary(stores, item.assignedStoreIds)}</div>
                          <div className="text-xs text-slate-500">{item.assignedStoreIds.length} store{item.assignedStoreIds.length === 1 ? '' : 's'}</div>
                        </td>
                        <td className={tableCellClass}>
                          <div className="text-slate-900">{formatRegisterUnit(item.purchaseUnit)}</div>
                          <div className="text-xs text-slate-500">1 {formatRegisterUnit(item.purchaseUnit)} = {formatRegisterQuantity(item.conversionFactor)} {formatRegisterUnit(item.baseUnit)}</div>
                        </td>
                        <td className={tableCellClass}>
                          <div className="flex max-w-[230px] flex-wrap gap-1">
                            <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${item.recipeEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {item.recipeEnabled ? 'Recipe OK' : 'Recipe Blocked'}
                            </span>
                            {item.recipeOutputEnabled ? (
                              <span className="inline-flex rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">Output</span>
                            ) : null}
                            <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${item.trackInventory ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700'}`}>
                              {item.trackInventory ? 'Tracked' : 'No Track'}
                            </span>
                            {item.missingStoreAssignment ? (
                              <span className="inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">No Store</span>
                            ) : null}
                            {item.conversionRisk ? (
                              <span className="inline-flex rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">Unit Risk</span>
                            ) : null}
                            <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              {getCostingMethodLabel(getCostingMethod(item))}
                            </span>
                            <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              {getIssueMethodLabel(getIssueMethod(item))}
                            </span>
                          </div>
                        </td>
                        <td className={`${tableCellClass} text-right`}>
                          {item.trackInventory ? `${formatRegisterQuantity(item.openingQty)} ${formatRegisterUnit(item.purchaseUnit)}` : '-'}
                        </td>
                        <td className={`${tableCellClass} text-right`}>
                          {item.trackInventory ? `${formatRegisterQuantity(item.purchasedQty)} ${formatRegisterUnit(item.purchaseUnit)}` : '-'}
                        </td>
                        <td className={`${tableCellClass} text-right`}>
                          {item.trackInventory ? `${formatRegisterQuantity(item.issuedQty)} ${formatRegisterUnit(item.purchaseUnit)}` : '-'}
                        </td>
                        <td className={`${tableCellClass} text-right ${item.stockMeta.textClass}`}>
                          {item.trackInventory ? `${formatRegisterQuantity(item.balanceQty)} ${formatRegisterUnit(item.purchaseUnit)}` : '-'}
                        </td>
                        <td className={`${tableCellClass} text-right`}>
                          {item.trackInventory ? `${formatRegisterQuantity(item.reorderQty)} ${formatRegisterUnit(item.purchaseUnit)}` : '-'}
                        </td>
                        <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                          {item.trackInventory ? formatCurrencyPKR(item.stockValue, { compact: true }) : '-'}
                        </td>
                        <td className={tableCellClass}>
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex w-fit rounded px-2 py-0.5 text-[11px] font-medium ${item.stockMeta.badgeClass}`}>
                              {item.stockMeta.label}
                            </span>
                            <span className={`inline-flex w-fit rounded px-2 py-0.5 text-[11px] font-medium ${(item.status || 'active') === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {item.status || 'active'}
                            </span>
                          </div>
                        </td>
                        <td className={`${tableCellClass} text-right`}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                openStockDetailDrawer(item.id);
                              }}
                              className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Eye className="size-3.5" />
                              View
                            </button>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                handleEdit(item);
                              }}
                              className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Edit2 className="size-3.5" />
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid h-full grid-cols-1 gap-4 overflow-hidden">
              <section className="overflow-hidden rounded border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                  <h3 className="text-sm font-semibold text-slate-900">Reorder Watchlist</h3>
                  <AlertTriangle className="size-4 text-slate-400" />
                </div>
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Item</th>
                        <th className={tableHeadClass}>Store</th>
                        <th className={`${tableHeadClass} text-right`}>Balance Qty</th>
                        <th className={`${tableHeadClass} text-right`}>Reorder Level</th>
                        <th className={`${tableHeadClass} text-right`}>Short Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reorderWatchlist.map((item) => (
                        <tr key={item.id} className="border-t border-slate-200">
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{item.itemName}</div>
                            <div className="text-xs text-slate-500">{item.itemCode || 'No code'}</div>
                          </td>
                          <td className={tableCellClass}>{formatStoreSummary(stores, item.assignedStoreIds)}</td>
                          <td className={`${tableCellClass} text-right ${item.stockMeta.textClass}`}>
                            {formatRegisterQuantity(item.balanceQty)} {formatRegisterUnit(item.purchaseUnit)}
                          </td>
                          <td className={`${tableCellClass} text-right`}>
                            {formatRegisterQuantity(item.reorderQty)} {formatRegisterUnit(item.purchaseUnit)}
                          </td>
                          <td className={`${tableCellClass} text-right font-medium ${item.shortQty > 0 ? 'text-red-700' : 'text-slate-700'}`}>
                            {formatRegisterQuantity(item.shortQty)} {formatRegisterUnit(item.purchaseUnit)}
                          </td>
                        </tr>
                      ))}
                      {reorderWatchlist.length === 0 ? (
                        <tr>
                          <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={5}>
                            No low stock kitchen items for the current filters.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="overflow-hidden rounded border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                  <h3 className="text-sm font-semibold text-slate-900">Store Coverage</h3>
                  <Warehouse className="size-4 text-slate-400" />
                </div>
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Kitchen Store</th>
                        <th className={`${tableHeadClass} text-right`}>Items</th>
                        <th className={`${tableHeadClass} text-right`}>Low</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storeCoverage.map((store) => (
                        <tr key={store.id} className="border-t border-slate-200">
                          <td className={tableCellClass}>{store.label}</td>
                          <td className={`${tableCellClass} text-right`}>{store.itemCount}</td>
                          <td className={`${tableCellClass} text-right ${store.lowStock > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                            {store.lowStock}
                          </td>
                        </tr>
                      ))}
                      {storeCoverage.length === 0 ? (
                        <tr>
                          <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={3}>
                            No kitchen store assignments yet.
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

      {selectedStockDetailItem ? (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={closeStockDetailDrawer}>
          <div
            className="absolute inset-y-0 right-0 flex w-full max-w-[760px] flex-col bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Item Stock Detail</h2>
                <div className="mt-1 text-sm font-medium text-slate-900">{selectedStockDetailItem.itemName}</div>
                <div className="text-xs text-slate-500">
                  {selectedStockDetailItem.itemCode || 'No code'} | {getPurchaseCategoryLabel(selectedStockDetailItem.categoryId)}
                </div>
              </div>
              <button onClick={closeStockDetailDrawer} className="rounded p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>

            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'summary', label: 'Summary' },
                  { id: 'purchase-history', label: 'Purchase History' },
                  { id: 'issue-history', label: 'Issue History' },
                  { id: 'stock-ledger', label: 'Stock Ledger' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStockDetailTab(tab.id as StockDetailTab)}
                    className={`rounded px-3 py-1.5 text-sm font-medium ${
                      stockDetailTab === tab.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {stockDetailTab === 'summary' ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {[
                    {
                      label: 'Current Balance',
                      value: `${formatRegisterQuantity(selectedStockDetailItem.balanceQty)} ${formatRegisterUnit(selectedStockDetailItem.purchaseUnit)}`,
                    },
                    {
                      label: 'Stock Value',
                      value: formatCurrencyPKR(selectedStockDetailItem.stockValue),
                    },
                    {
                      label: 'Category',
                      value: getPurchaseCategoryLabel(selectedStockDetailItem.categoryId),
                    },
                    {
                      label: 'Store',
                      value: formatStoreSummary(stores, selectedStockDetailItem.assignedStoreIds),
                    },
                    {
                      label: 'Unit',
                      value: formatRegisterUnit(selectedStockDetailItem.purchaseUnit),
                    },
                    {
                      label: 'Reorder Level',
                      value: `${formatRegisterQuantity(selectedStockDetailItem.reorderQty)} ${formatRegisterUnit(selectedStockDetailItem.purchaseUnit)}`,
                    },
                  ].map((entry) => (
                    <div key={entry.label} className="rounded border border-slate-200 bg-slate-50 px-3 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{entry.label}</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">{entry.value}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              {stockDetailTab === 'purchase-history' ? (
                <div className="overflow-hidden rounded border border-slate-200 bg-white">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Date</th>
                        <th className={tableHeadClass}>GRN No</th>
                        <th className={tableHeadClass}>Vendor</th>
                        <th className={`${tableHeadClass} text-right`}>Qty</th>
                        <th className={`${tableHeadClass} text-right`}>Rate</th>
                        <th className={`${tableHeadClass} text-right`}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseHistoryRows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-200">
                          <td className={tableCellClass}>{formatDatePK(row.date)}</td>
                          <td className={tableCellClass}>{row.reference}</td>
                          <td className={tableCellClass}>{row.vendor}</td>
                          <td className={`${tableCellClass} text-right`}>
                            {formatRegisterQuantity(row.qty)} {formatRegisterUnit(selectedStockDetailItem.purchaseUnit)}
                          </td>
                          <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(row.rate)}</td>
                          <td className={`${tableCellClass} text-right font-medium text-slate-900`}>{formatCurrencyPKR(row.value)}</td>
                        </tr>
                      ))}
                      {purchaseHistoryRows.length === 0 ? (
                        <tr>
                          <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={6}>
                            No purchase history found for the current filters.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {stockDetailTab === 'issue-history' ? (
                <div className="overflow-hidden rounded border border-slate-200 bg-white">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Date</th>
                        <th className={tableHeadClass}>Issue No</th>
                        <th className={tableHeadClass}>Kitchen/Department</th>
                        <th className={`${tableHeadClass} text-right`}>Qty</th>
                        <th className={`${tableHeadClass} text-right`}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issueHistoryRows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-200">
                          <td className={tableCellClass}>{formatDatePK(row.date)}</td>
                          <td className={tableCellClass}>{row.reference}</td>
                          <td className={tableCellClass}>{row.kitchenDepartment}</td>
                          <td className={`${tableCellClass} text-right`}>
                            {formatRegisterQuantity(row.qty)} {formatRegisterUnit(selectedStockDetailItem.purchaseUnit)}
                          </td>
                          <td className={`${tableCellClass} text-right font-medium text-slate-900`}>{formatCurrencyPKR(row.value)}</td>
                        </tr>
                      ))}
                      {issueHistoryRows.length === 0 ? (
                        <tr>
                          <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={5}>
                            No issue history found for the current filters.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {stockDetailTab === 'stock-ledger' ? (
                <div className="overflow-hidden rounded border border-slate-200 bg-white">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Date</th>
                        <th className={tableHeadClass}>Type</th>
                        <th className={tableHeadClass}>Reference</th>
                        <th className={`${tableHeadClass} text-right`}>In Qty</th>
                        <th className={`${tableHeadClass} text-right`}>Out Qty</th>
                        <th className={`${tableHeadClass} text-right`}>Balance Qty</th>
                        <th className={`${tableHeadClass} text-right`}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockLedgerRows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-200">
                          <td className={tableCellClass}>{formatDatePK(row.date)}</td>
                          <td className={tableCellClass}>{row.type}</td>
                          <td className={tableCellClass}>{row.reference}</td>
                          <td className={`${tableCellClass} text-right`}>
                            {row.inQty > 0 ? `${formatRegisterQuantity(row.inQty)} ${formatRegisterUnit(selectedStockDetailItem.purchaseUnit)}` : '-'}
                          </td>
                          <td className={`${tableCellClass} text-right`}>
                            {row.outQty > 0 ? `${formatRegisterQuantity(row.outQty)} ${formatRegisterUnit(selectedStockDetailItem.purchaseUnit)}` : '-'}
                          </td>
                          <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                            {formatRegisterQuantity(row.balanceQty)} {formatRegisterUnit(selectedStockDetailItem.purchaseUnit)}
                          </td>
                          <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(row.value)}</td>
                        </tr>
                      ))}
                      {stockLedgerRows.length === 0 ? (
                        <tr>
                          <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={7}>
                            No stock ledger entries found for the current filters.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="flex max-h-[94vh] w-full max-w-[1380px] flex-col overflow-hidden rounded bg-white shadow-xl">
            <div className="border-b border-slate-200 bg-white">
              <div className="flex items-center justify-between px-4 py-2">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {editingItem ? 'Edit Kitchen Item' : 'Create Kitchen Item'}
                  </h2>
                  <p className="text-xs text-slate-500">Hospitality inventory master</p>
                </div>
                <button onClick={closeDialog} className="rounded p-1.5 text-slate-500 hover:bg-slate-100">
                  <X className="size-5" />
                </button>
              </div>

            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
              <div className="space-y-3">
                <SectionCard
                  title="Quick Entry"
                  icon={Package}
                  summary="Create a usable item first. Open advanced sections only if needed."
                >
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
                    <FieldShell className="xl:col-span-5">
                      <label className={labelClass}>Item Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formItemName}
                        onChange={(event) => setFormItemName(event.target.value)}
                        placeholder="e.g., Chicken Breast, Basmati Rice"
                        className={inputClass}
                      />
                    </FieldShell>
                    <FieldShell className="xl:col-span-2">
                      <label className={labelClass}>Item Code</label>
                      <ReadOnlyField value={formItemCode || 'Auto'} />
                    </FieldShell>
                    <FieldShell className="xl:col-span-3">
                      <label className={labelClass}>Status</label>
                      <select value={formStatus} onChange={(event) => setFormStatus(event.target.value as 'active' | 'inactive')} className={inputClass}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </FieldShell>
                    <div className="xl:col-span-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                      <div className="text-slate-500">Preferred Vendor</div>
                      <div className="mt-1 truncate font-medium text-slate-900">{preferredVendorName}</div>
                    </div>

                    <FieldShell className="xl:col-span-4">
                      <label className={labelClass}>Category <span className="text-red-500">*</span></label>
                      <select value={formCategoryId} onChange={(event) => handleCategoryChange(event.target.value)} className={inputClass}>
                        {itemCategoryOptions.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </FieldShell>
                    <FieldShell className="xl:col-span-4">
                      <label className={labelClass}>Sub Category</label>
                      <select value={formSubCategoryId} onChange={(event) => setFormSubCategoryId(event.target.value)} className={inputClass}>
                        <option value="">Select sub category</option>
                        {formSubCategoryOptions.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </FieldShell>
                    <FieldShell className="xl:col-span-4">
                      <label className={labelClass}>Store {formTrackInventory ? <span className="text-red-500">*</span> : null}</label>
                      <select
                        value={formAssignedStoreIds[0] || ''}
                        onChange={(event) => setFormAssignedStoreIds(event.target.value ? [event.target.value as StoreLocation] : [])}
                        className={inputClass}
                      >
                        <option value="">Select store</option>
                        {activeKitchenStoreOptions.map((store) => (
                          <option key={store.id} value={store.id}>
                            {store.label}
                          </option>
                        ))}
                      </select>
                    </FieldShell>

                    <FieldShell className="xl:col-span-3">
                      <label className={labelClass}>Purchase Unit {formTrackInventory ? <span className="text-red-500">*</span> : null}</label>
                      <select value={formPurchaseUnit} onChange={(event) => setFormPurchaseUnit(event.target.value as MeasurementUnit)} className={inputClass}>
                        {resolvedPurchaseUnitOptions.map((unit) => (
                          <option key={unit.code} value={unit.code}>
                            {formatUnitOptionLabel(unit)}
                          </option>
                        ))}
                      </select>
                    </FieldShell>
                    <FieldShell className="xl:col-span-3">
                      <label className={labelClass}>Base Unit {formTrackInventory ? <span className="text-red-500">*</span> : null}</label>
                      <select value={formBaseUnit} onChange={(event) => setFormBaseUnit(event.target.value as MeasurementUnit)} className={inputClass}>
                        {resolvedBaseUnitOptions.map((unit) => (
                          <option key={unit.code} value={unit.code}>
                            {formatUnitOptionLabel(unit)}
                          </option>
                        ))}
                      </select>
                    </FieldShell>
                    <FieldShell className="xl:col-span-2">
                      <label className={labelClass}>Conversion {formTrackInventory ? <span className="text-red-500">*</span> : null}</label>
                      <input
                        type="number"
                        min="0"
                        value={formConversionFactor}
                        onChange={(event) => setFormConversionFactor(Number(event.target.value))}
                        className={inputClass}
                      />
                    </FieldShell>
                    <FieldShell className="xl:col-span-2">
                      <label className={labelClass}>Reorder Level</label>
                      <input
                        type="number"
                        min="0"
                        value={formReorderLevel}
                        onChange={(event) => setFormReorderLevel(Number(event.target.value))}
                        className={inputClass}
                      />
                    </FieldShell>
                    <div className="xl:col-span-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                      <div className="text-slate-500">Conversion Preview</div>
                      <div className="mt-1 font-medium text-slate-900">{conversionFormula}</div>
                    </div>

                    <FieldShell className="xl:col-span-4">
                      <label className={labelClass}>Preferred Vendor</label>
                      <select value={formPreferredSupplierId} onChange={(event) => syncPreferredVendorSelection(event.target.value)} className={inputClass}>
                        <option value="">Select vendor</option>
                        {activeVendors.map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.vendorName}
                          </option>
                        ))}
                      </select>
                    </FieldShell>
                    <FieldShell className="xl:col-span-2">
                      <label className={labelClass}>Default Cost</label>
                      <input
                        type="number"
                        min="0"
                        value={formDefaultPurchaseCost}
                        onChange={(event) => setFormDefaultPurchaseCost(Number(event.target.value))}
                        className={inputClass}
                      />
                    </FieldShell>
                    <div className="xl:col-span-6 grid grid-cols-2 gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs md:grid-cols-4">
                      <SummaryRow label="Store" value={assignedStoreSummary} />
                      <SummaryRow label="Unit Setup" value={`${formPurchaseUnit || '-'} to ${formBaseUnit || '-'}`} />
                      <SummaryRow label="Lead Time" value={`${formLeadTimeDays || 0}d`} />
                      <SummaryRow label="MOQ" value={`${formMinimumOrderQuantity || 0} ${formPurchaseUnit || ''}`} />
                    </div>
                  </div>
                </SectionCard>

                <ExpandableSection
                  title="Advanced Inventory"
                  summary={`${inventorySummary} | ${replenishmentSummary}`}
                  open={showAdvancedSection}
                  onToggle={() => setShowAdvancedSection((current) => !current)}
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                      <FieldShell>
                        <label className={labelClass}>Inventory Type</label>
                        <select value={formInventoryType} onChange={(event) => setFormInventoryType(event.target.value as InventoryType)} className={inputClass}>
                          {inventoryTypeOptions.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </FieldShell>
                      <FieldShell>
                        <label className={labelClass}>Costing Method</label>
                        <select value={formCostingMethod} onChange={(event) => setFormCostingMethod(event.target.value as CostingMethod)} className={inputClass}>
                          {costingMethodOptions.map((method) => (
                            <option key={method.value} value={method.value}>
                              {method.label}
                            </option>
                          ))}
                        </select>
                      </FieldShell>
                      <FieldShell>
                        <label className={labelClass}>Issue Method</label>
                        <select value={formIssueMethod} onChange={(event) => setFormIssueMethod(event.target.value as IssueMethod)} className={inputClass}>
                          {issueMethodOptions.map((method) => (
                            <option key={method.value} value={method.value}>
                              {method.label}
                            </option>
                          ))}
                        </select>
                      </FieldShell>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                      <FieldShell>
                        <label className={labelClass}>Lead Time Days</label>
                        <input type="number" min="0" value={formLeadTimeDays} onChange={(event) => setFormLeadTimeDays(Number(event.target.value))} className={inputClass} />
                      </FieldShell>
                      <FieldShell>
                        <label className={labelClass}>Minimum Order Quantity</label>
                        <input type="number" min="0" value={formMinimumOrderQuantity} onChange={(event) => setFormMinimumOrderQuantity(Number(event.target.value))} className={inputClass} />
                      </FieldShell>
                      <FieldShell>
                        <label className={labelClass}>Minimum Stock Level</label>
                        <input type="number" min="0" value={formMinimumStockLevel} onChange={(event) => setFormMinimumStockLevel(Number(event.target.value))} className={inputClass} />
                      </FieldShell>
                      <FieldShell>
                        <label className={labelClass}>Maximum Stock Level</label>
                        <input type="number" min="0" value={formMaximumStockLevel} onChange={(event) => setFormMaximumStockLevel(Number(event.target.value))} className={inputClass} />
                      </FieldShell>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <FieldShell className="flex items-end">
                        <label className="inline-flex h-8 items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={formTrackInventory}
                            onChange={(event) => setFormTrackInventory(event.target.checked)}
                            className="size-4 rounded border-slate-300 text-blue-600"
                          />
                          Track Inventory
                        </label>
                      </FieldShell>
                      <FieldShell>
                        <label className="inline-flex h-8 items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={formAllowNegativeStock}
                            onChange={(event) => setFormAllowNegativeStock(event.target.checked)}
                            className="size-4 rounded border-slate-300 text-blue-600"
                          />
                          Allow Negative Stock
                        </label>
                      </FieldShell>
                      <FieldShell>
                        <label className="inline-flex h-8 items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={formUseInRecipeIngredients}
                            onChange={(event) => setFormUseInRecipeIngredients(event.target.checked)}
                            className="size-4 rounded border-slate-300 text-blue-600"
                          />
                          Use In Recipe Ingredients
                        </label>
                      </FieldShell>
                      <FieldShell>
                        <label className="inline-flex h-8 items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={formUseAsRecipeOutput}
                            onChange={(event) => setFormUseAsRecipeOutput(event.target.checked)}
                            className="size-4 rounded border-slate-300 text-blue-600"
                          />
                          Use As Recipe Output
                        </label>
                      </FieldShell>
                    </div>

                    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                      These flags control which kitchen items appear in recipe ingredient lines and recipe output item lists.
                    </div>

                    <FieldShell>
                      <label className={labelClass}>Description</label>
                      <input
                        type="text"
                        value={formDescription}
                        onChange={(event) => setFormDescription(event.target.value)}
                        placeholder="Short item description"
                        className={inputClass}
                      />
                    </FieldShell>
                  </div>
                </ExpandableSection>

                <ExpandableSection
                  title="Additional Vendors"
                  summary={approvedVendorsSummary}
                  open={showVendorSection}
                  onToggle={() => setShowVendorSection((current) => !current)}
                >
                  <div className="mb-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddApprovedVendor}
                      className="inline-flex h-8 items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Plus className="size-3.5" />
                      Add Vendor
                    </button>
                  </div>
                  <div className="overflow-hidden rounded border border-slate-200">
                    <table className="w-full table-fixed">
                      <colgroup>
                        <col className="w-[34%]" />
                        <col className="w-[13%]" />
                        <col className="w-[13%]" />
                        <col className="w-[13%]" />
                        <col className="w-[13%]" />
                        <col className="w-[14%]" />
                      </colgroup>
                      <thead className="bg-slate-50">
                        <tr>
                          <th className={tableHeadClass}>Vendor</th>
                          <th className={`${tableHeadClass} text-center`}>Preferred</th>
                          <th className={`${tableHeadClass} text-right`}>Lead Time</th>
                          <th className={`${tableHeadClass} text-right`}>MOQ</th>
                          <th className={tableHeadClass}>Status</th>
                          <th className={`${tableHeadClass} text-right`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {formApprovedVendors.map((mapping) => (
                          <Fragment key={mapping.id}>
                            <tr>
                              <td className={tableCellClass}>
                                <select
                                  value={mapping.vendorId}
                                  onChange={(event) => handleUpdateApprovedVendor(mapping.id, 'vendorId', event.target.value)}
                                  className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-sm text-slate-700"
                                >
                                  {activeVendors.map((vendor) => (
                                    <option key={vendor.id} value={vendor.id}>
                                      {vendor.vendorName}
                                    </option>
                                  ))}
                                </select>
                                <div className="mt-0.5 truncate text-[11px] text-slate-500">
                                  {vendorById.get(mapping.vendorId)?.vendorCode || 'No code'}
                                </div>
                              </td>
                              <td className={`${tableCellClass} text-center`}>
                                <input
                                  type="checkbox"
                                  checked={mapping.isPreferred}
                                  onChange={(event) => handleUpdateApprovedVendor(mapping.id, 'isPreferred', event.target.checked)}
                                  className="size-4"
                                />
                              </td>
                              <td className={`${tableCellClass} text-right`}>
                                <input
                                  type="number"
                                  min="0"
                                  value={mapping.leadTimeDays || 0}
                                  onChange={(event) => handleUpdateApprovedVendor(mapping.id, 'leadTimeDays', Number(event.target.value))}
                                  className="h-8 w-full rounded border border-slate-300 px-2 text-right text-sm"
                                />
                              </td>
                              <td className={`${tableCellClass} text-right`}>
                                <input
                                  type="number"
                                  min="0"
                                  value={mapping.moq || 0}
                                  onChange={(event) => handleUpdateApprovedVendor(mapping.id, 'moq', Number(event.target.value))}
                                  className="h-8 w-full rounded border border-slate-300 px-2 text-right text-sm"
                                />
                              </td>
                              <td className={tableCellClass}>
                                <select
                                  value={mapping.status}
                                  onChange={(event) => handleUpdateApprovedVendor(mapping.id, 'status', event.target.value)}
                                  className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-sm"
                                >
                                  <option value="active">Active</option>
                                  <option value="inactive">Inactive</option>
                                </select>
                              </td>
                              <td className={`${tableCellClass} text-right`}>
                                <div className="flex justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedApprovedVendorId(expandedApprovedVendorId === mapping.id ? null : mapping.id)}
                                    className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    Details
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveApprovedVendor(mapping.id)}
                                    className="rounded p-1 text-red-600 hover:bg-red-50"
                                    title="Remove vendor"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {expandedApprovedVendorId === mapping.id ? (
                              <tr key={`${mapping.id}-details`} className="bg-slate-50">
                                <td className="px-3 py-3" colSpan={6}>
                                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <FieldShell>
                                      <label className={labelClass}>Last Rate</label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={mapping.lastRate || 0}
                                        onChange={(event) => handleUpdateApprovedVendor(mapping.id, 'lastRate', Number(event.target.value))}
                                        className={inputClass}
                                      />
                                    </FieldShell>
                                    <FieldShell>
                                      <label className={labelClass}>Contract Rate</label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={mapping.contractRate || 0}
                                        onChange={(event) => handleUpdateApprovedVendor(mapping.id, 'contractRate', Number(event.target.value))}
                                        className={inputClass}
                                      />
                                    </FieldShell>
                                    <FieldShell>
                                      <label className={labelClass}>Notes</label>
                                      <input
                                        value={mapping.notes || ''}
                                        onChange={(event) => handleUpdateApprovedVendor(mapping.id, 'notes', event.target.value)}
                                        className={inputClass}
                                      />
                                    </FieldShell>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        ))}
                        {formApprovedVendors.length === 0 ? (
                          <tr>
                            <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={6}>
                              No approved vendors configured.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </ExpandableSection>

                <ExpandableSection
                  title="Multi-Store Assignment"
                  summary={assignedStoreSummary}
                  open={showStoreSection}
                  onToggle={() => setShowStoreSection((current) => !current)}
                >
                  <div id="kitchen-store-assignment" className="space-y-4">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                      {activeKitchenStoreOptions.map((store) => (
                        <label key={store.id} className="flex h-8 items-center gap-2 rounded border border-slate-200 bg-white px-2.5 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={formAssignedStoreIds.includes(store.id)}
                            onChange={() => toggleAssignedStore(store.id)}
                            className="size-4 rounded border-slate-300 text-blue-600"
                          />
                          <span className="truncate">{store.label}</span>
                        </label>
                      ))}
                      {activeKitchenStoreOptions.length === 0 ? (
                        <div className="md:col-span-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          No active kitchen stores are available.
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                      <SectionCard title="Item Summary" icon={Package} summary={itemSummaryText}>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                          <SummaryRow label="Item Code" value={formItemCode || '-'} />
                          <SummaryRow label="Category" value={getPurchaseCategoryLabel(formCategoryId)} />
                          <SummaryRow label="Sub Category" value={getResolvedSubCategoryLabel(formCategoryId, formSubCategoryId)} />
                          <SummaryRow label="Inventory Type" value={getInventoryTypeLabel(formInventoryType)} />
                          <SummaryRow label="Recipe Ingredient" value={formUseInRecipeIngredients ? 'Enabled' : 'Hidden'} />
                          <SummaryRow label="Recipe Output" value={formUseAsRecipeOutput ? 'Enabled' : 'Hidden'} />
                          <SummaryRow label="Base Unit" value={formBaseUnit || '-'} />
                          <SummaryRow label="Status" value={<span className={formStatus === 'active' ? 'text-emerald-700' : 'text-slate-600'}>{formStatus}</span>} />
                        </div>
                      </SectionCard>

                      <SectionCard title="Purchasing Snapshot" icon={ClipboardList} summary={purchasingSnapshotSummary}>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                          <SummaryRow label="Preferred Vendor" value={preferredVendorName} />
                          <SummaryRow label="Lead Time" value={`${formLeadTimeDays || 0} days`} />
                          <SummaryRow label="MOQ" value={`${formMinimumOrderQuantity || 0} ${formPurchaseUnit || ''}`} />
                        </div>
                      </SectionCard>
                    </div>
                  </div>
                </ExpandableSection>

                <ExpandableSection
                  title="Setup Tools"
                  summary="Category maintenance and supporting setup. Use only when required."
                  open={showSetupSection}
                  onToggle={() => setShowSetupSection((current) => !current)}
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-slate-500">
                        Keep item entry fast. Only open these setup tools when a required master value is missing.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCategoryManager((current) => !current);
                          if (!showCategoryManager) {
                            resetCategoryManagerDraft('purchaseCategories', formCategoryId);
                          }
                        }}
                        className={quietButtonClass}
                      >
                        {showCategoryManager ? 'Hide Category Manager' : 'Manage Category Lists'}
                      </button>
                    </div>

                    {showCategoryManager ? (
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                            {editingCategoryLookupId ? 'Edit Category' : 'Manage Category Lists'}
                          </div>
                          <button
                            type="button"
                            onClick={() => resetCategoryManagerDraft('purchaseCategories', formCategoryId)}
                            className="inline-flex h-8 items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[180px_220px_minmax(0,1fr)_160px]">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700">List Type</label>
                            <select
                              value={categoryManagerDraft.section}
                              onChange={(event) =>
                                setCategoryManagerDraft((current) => ({
                                  ...current,
                                  section: event.target.value as CategoryManagerSection,
                                  parentId:
                                    event.target.value === 'purchaseSubCategories'
                                      ? current.parentId || formCategoryId
                                      : '',
                                }))
                              }
                              className={inputClass}
                            >
                              <option value="purchaseCategories">Category</option>
                              <option value="purchaseSubCategories">Sub Category</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700">Parent Category</label>
                            <select
                              value={categoryManagerDraft.parentId}
                              onChange={(event) => setCategoryManagerDraft((current) => ({ ...current, parentId: event.target.value }))}
                              disabled={categoryManagerDraft.section !== 'purchaseSubCategories'}
                              className={inputClass}
                            >
                              <option value="">Select category</option>
                              {itemCategoryOptions.map((category) => (
                                <option key={category.value} value={category.value}>
                                  {category.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700">Name</label>
                            <input
                              type="text"
                              value={categoryManagerDraft.name}
                              onChange={(event) => setCategoryManagerDraft((current) => ({ ...current, name: event.target.value }))}
                              className={inputClass}
                              placeholder="Enter category name"
                            />
                          </div>
                          <div className="flex items-end justify-between gap-3">
                            <label className="inline-flex h-8 items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={categoryManagerDraft.isActive}
                                onChange={(event) =>
                                  setCategoryManagerDraft((current) => ({ ...current, isActive: event.target.checked }))
                                }
                                className="size-4 rounded border-slate-300 text-blue-600"
                              />
                              Active
                            </label>
                            <button
                              type="button"
                              onClick={saveCategoryManagerDraft}
                              className="inline-flex h-8 items-center gap-1.5 rounded border border-blue-600 bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700"
                            >
                              <Save className="size-3.5" />
                              {editingCategoryLookupId ? 'Save' : 'Add'}
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 overflow-auto rounded border border-slate-200 bg-white">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-100">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-slate-700">Type</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-700">Parent</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-700">Name</th>
                                <th className="px-3 py-2 text-center font-semibold text-slate-700">Status</th>
                                <th className="px-3 py-2 text-right font-semibold text-slate-700">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {categoryManagerRows.map((entry) => (
                                <tr key={`${entry.section}-${entry.id}`} className="border-t">
                                  <td className="px-3 py-2 text-slate-700">{entry.sectionLabel}</td>
                                  <td className="px-3 py-2 text-slate-700">{entry.parentLabel}</td>
                                  <td className="px-3 py-2">
                                    <div className="font-medium text-slate-900">{entry.name}</div>
                                    <div className="text-[11px] text-slate-500">{entry.code}</div>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${entry.status === 'inactive' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                      {entry.status === 'inactive' ? 'Inactive' : 'Active'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => openEditCategoryLookup(entry.section, entry)}
                                        className="rounded p-1.5 text-blue-600 hover:bg-blue-100"
                                        title="Edit category"
                                      >
                                        <Edit2 className="size-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => toggleCategoryLookupActive(entry.section, entry.id)}
                                        className="rounded px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                                      >
                                        {entry.status === 'inactive' ? 'Activate' : 'Deactivate'}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </ExpandableSection>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-2 shadow-[0_-8px_20px_rgba(15,23,42,0.08)]">
              <button
                onClick={closeDialog}
                className="h-8 rounded border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave('new')}
                className="inline-flex h-8 items-center gap-1.5 rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus className="size-4" />
                Save + New
              </button>
              <button
                onClick={() => handleSave('close')}
                className="inline-flex h-8 items-center gap-1.5 rounded border border-blue-600 bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Save className="size-4" />
                {editingItem ? 'Update Item' : 'Create Item'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
