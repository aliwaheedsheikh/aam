import { type ReactNode, useMemo, useState } from 'react';
import {
  Calculator,
  ChevronDown,
  ClipboardList,
  Edit2,
  Eye,
  PackageCheck,
  Plus,
  Search,
  Settings,
  Trash2,
  Truck,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrencyPKR, formatDatePK } from '../../lib/locale';
import {
  DEFAULT_PROCUREMENT_LOOKUPS,
  createProcurementLookupValue,
  getActiveLookupValues,
  getLookupName,
} from '../../lib/procurementLookups';
import { getLegacySupplyCategoryIds, normalizeVendorCategoryAssignments } from '../../lib/vendorCategorySupport';
import {
  PaymentTerms,
  ProcurementLookupState,
  ProcurementLookupValue,
  PurchaseItem,
  Vendor,
  VendorCategory,
  VendorCategoryAssignment,
  VendorItemMapping,
  VendorPricingFormula,
  VendorCategoryScopeType,
} from '../kitchen/types';

interface VendorMasterEnhancedProps {
  userName: string;
  vendors: Vendor[];
  purchaseItems: PurchaseItem[];
  vendorItemMappings: VendorItemMapping[];
  procurementLookups: ProcurementLookupState;
  onVendorsChange: (vendors: Vendor[]) => void;
  onPurchaseItemsChange: (items: PurchaseItem[]) => void;
  onVendorItemMappingsChange: (mappings: VendorItemMapping[]) => void;
  onProcurementLookupsChange: (lookups: ProcurementLookupState) => void;
}

const inactiveReasons = [
  'Late Delivery Issues',
  'Quality Declined',
  'Higher Pricing Than Competitors',
  'Poor Customer Service',
  'Inconsistent Supply',
  'Payment Disputes',
  'Business Closed',
  'Other',
];

const paymentTermLabels: Record<PaymentTerms, string> = {
  cash: 'Cash',
  'credit-7': 'Credit 7 Days',
  'credit-15': 'Credit 15 Days',
  'credit-30': 'Credit 30 Days',
  'credit-60': 'Credit 60 Days',
};

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-3 py-2 text-sm text-slate-700 align-middle';
const vendorRegisterCellClass = 'px-3 py-1.5 text-xs text-slate-700 align-middle';
const inputClass = 'h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500';
const labelClass = 'mb-1 block text-xs font-medium text-slate-700';
const quietButtonClass = 'inline-flex h-8 items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50';

type AttentionFilter = 'all' | 'attention' | 'pricing' | 'credit';
type StatusFilter = 'all' | 'active' | 'inactive' | 'blocked';
type LookupSection = keyof ProcurementLookupState;
type VendorTypeManagerDraft = {
  name: string;
  isActive: boolean;
};

const categorySupportScopeOptions: Array<{ value: VendorCategoryScopeType; label: string }> = [
  { value: 'all_subcategories', label: 'All Sub Categories' },
  { value: 'selected_subcategories', label: 'Selected Sub Categories' },
];

const getLookupOptions = (values: ProcurementLookupValue[]) =>
  getActiveLookupValues(values).map((value) => ({ value: value.id, label: value.name }));

const createEmptyVendorTypeManagerDraft = (): VendorTypeManagerDraft => ({
  name: '',
  isActive: true,
});

const toDateInputValue = (value?: Date | string) => {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
};

const getCategoryScopeLabel = (value?: VendorCategoryScopeType) =>
  categorySupportScopeOptions.find((option) => option.value === value)?.label || 'All Sub Categories';

interface CollapsibleSectionProps {
  title: string;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  summary?: string;
  count?: number;
  hasError?: boolean;
  children: ReactNode;
}

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  summary,
  count,
  hasError,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50"
      >
        {Icon ? (
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded bg-blue-50 text-blue-700">
            <Icon className="size-4" />
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
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
          </span>
          {!open && summary ? <span className="mt-1 block truncate text-xs text-slate-500">{summary}</span> : null}
        </span>
        <ChevronDown className={`size-4 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-slate-100 p-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

const getStatusBadge = (status: Vendor['status']) => {
  const styles: Record<Vendor['status'], string> = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-slate-100 text-slate-700',
    blocked: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${styles[status]}`}>
      {status}
    </span>
  );
};

const getCreditUtilization = (vendor: Vendor) => {
  if (!vendor.creditLimit || vendor.creditLimit <= 0) {
    return null;
  }

  return vendor.currentBalance / vendor.creditLimit;
};

const getAttentionMeta = (vendor: Vendor) => {
  const utilization = getCreditUtilization(vendor);

  if (vendor.status === 'blocked') {
    return { priority: 1, label: 'Blocked', detail: 'Vendor is blocked from new activity.' };
  }

  if (vendor.status === 'inactive') {
    return {
      priority: 2,
      label: 'Inactive',
      detail: vendor.inactiveReason || 'Vendor is inactive and needs review.',
    };
  }

  if (utilization !== null && utilization >= 1) {
    return { priority: 1, label: 'Over Limit', detail: 'Outstanding balance is above credit limit.' };
  }

  if (utilization !== null && utilization >= 0.8) {
    return { priority: 2, label: 'Near Limit', detail: 'Outstanding balance is close to credit limit.' };
  }

  if (vendor.currentBalance > 0) {
    return { priority: 3, label: 'Outstanding', detail: 'Open payable balance requires follow-up.' };
  }

  if ((vendor.pricingFormulas || []).length > 0) {
    return { priority: 4, label: 'Pricing Rules', detail: 'Dynamic pricing formulas are configured.' };
  }

  return { priority: 5, label: 'Stable', detail: 'No active issues detected.' };
};

const calculateFinalPrice = (formula: VendorPricingFormula): number => {
  if (formula.pricingMethod === 'fixed') {
    return formula.fixedRate || 0;
  }

  return (formula.baseSupplyRate || 0) * (formula.multiplyFactor || 1);
};

export function VendorMasterEnhanced({
  userName,
  vendors,
  purchaseItems,
  vendorItemMappings,
  procurementLookups,
  onVendorsChange,
  onPurchaseItemsChange,
  onVendorItemMappingsChange,
  onProcurementLookupsChange,
}: VendorMasterEnhancedProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>('all');
  const [vendorTypeFilter, setVendorTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [showVendorTypeManager, setShowVendorTypeManager] = useState(false);
  const [editingVendorTypeLookupId, setEditingVendorTypeLookupId] = useState<string | null>(null);
  const [vendorTypeManagerDraft, setVendorTypeManagerDraft] = useState<VendorTypeManagerDraft>(createEmptyVendorTypeManagerDraft);

  const [formVendorName, setFormVendorName] = useState('');
  const [formVendorTypeId, setFormVendorTypeId] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCategories, setFormCategories] = useState<VendorCategoryAssignment[]>([]);
  const [formDefaultLeadTimeDays, setFormDefaultLeadTimeDays] = useState(0);
  const [formVendorSinceDate, setFormVendorSinceDate] = useState(toDateInputValue());
  const [formApprovedItems, setFormApprovedItems] = useState<VendorItemMapping[]>([]);
  const [approvedItemSearch, setApprovedItemSearch] = useState('');
  const [approvedItemCategoryFilter, setApprovedItemCategoryFilter] = useState<string>('all');
  const [formPaymentTerms, setFormPaymentTerms] = useState<PaymentTerms>('cash');
  const [formCreditLimit, setFormCreditLimit] = useState(0);
  const [formTaxId, setFormTaxId] = useState('');
  const [formStatus, setFormStatus] = useState<Vendor['status']>('active');
  const [formInactiveReason, setFormInactiveReason] = useState('');
  const [formPricingFormulas, setFormPricingFormulas] = useState<VendorPricingFormula[]>([]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const categoryOptions = useMemo(
    () => getLookupOptions(procurementLookups.purchaseCategories),
    [procurementLookups.purchaseCategories],
  );
  const vendorTypeOptions = useMemo(
    () => getLookupOptions(procurementLookups.vendorTypes),
    [procurementLookups.vendorTypes],
  );
  const vendorTypeRows = useMemo(
    () =>
      procurementLookups.vendorTypes.map((entry) => ({
        ...entry,
        isDefault: DEFAULT_PROCUREMENT_LOOKUPS.vendorTypes.some((defaultEntry) => defaultEntry.id === entry.id),
        vendorCount: vendors.filter((vendor) => vendor.vendorTypeId === entry.id).length,
      })),
    [procurementLookups.vendorTypes, vendors],
  );
  const activeVendorTypeOptionValues = useMemo(
    () => new Set(vendorTypeOptions.map((option) => option.value)),
    [vendorTypeOptions],
  );
  const activePurchaseItems = useMemo(
    () => purchaseItems.filter((item) => item.status === 'active').sort((left, right) => left.itemName.localeCompare(right.itemName)),
    [purchaseItems],
  );
  const approvedItemCategoryOptions = useMemo(
    () => getLookupOptions(procurementLookups.purchaseCategories),
    [procurementLookups.purchaseCategories],
  );
  const subCategoryOptionsByCategory = useMemo(
    () =>
      procurementLookups.purchaseSubCategories.reduce<Record<string, Array<{ value: string; label: string }>>>((accumulator, entry) => {
        if (entry.status === 'inactive' || !entry.parentId) {
          return accumulator;
        }

        accumulator[entry.parentId] = accumulator[entry.parentId] || [];
        accumulator[entry.parentId].push({ value: entry.id, label: entry.name });
        return accumulator;
      }, {}),
    [procurementLookups.purchaseSubCategories],
  );
  const purchaseItemById = useMemo(() => {
    const map = new Map<string, PurchaseItem>();
    purchaseItems.forEach((item) => map.set(item.id, item));
    return map;
  }, [purchaseItems]);
  const getCategoryLabel = (category: VendorCategory) =>
    getLookupName(procurementLookups.purchaseCategories, category);
  const getSubCategoryLabel = (subCategoryId: string) =>
    getLookupName(procurementLookups.purchaseSubCategories, subCategoryId);
  const getPurchaseItemCategoryLabel = (item?: PurchaseItem) =>
    item ? getLookupName(procurementLookups.purchaseCategories, item.purchaseCategoryId || item.categoryId || item.category) : '-';
  const getVendorTypeLabel = (vendorTypeId?: string) =>
    vendorTypeId ? getLookupName(procurementLookups.vendorTypes, vendorTypeId) : 'Not set';
  const getVendorCategoryLabels = (assignments: VendorCategoryAssignment[]) =>
    Array.from(new Set(assignments.map((assignment) => getCategoryLabel(assignment.category)))).filter(Boolean);
  const getCategorySupportSummary = (assignment: VendorCategoryAssignment) => {
    if (assignment.scopeType === 'selected_subcategories') {
      const subCategoryLabels = (assignment.subCategoryIds || []).map(getSubCategoryLabel).filter(Boolean);
      return subCategoryLabels.length > 0 ? subCategoryLabels.join(', ') : 'Selected Sub Categories';
    }

    return 'All Sub Categories';
  };

  const vendorRows = useMemo(
    () =>
      vendors.map((vendor) => {
        const activeCategories = normalizeVendorCategoryAssignments(vendor, procurementLookups).filter(
          (assignment) => assignment.isActive !== false,
        );
        const utilization = getCreditUtilization(vendor);
        const pricingRuleCount = vendor.pricingFormulas?.length || 0;
        const attention = getAttentionMeta(vendor);

        return {
          ...vendor,
          activeCategories,
          utilization,
          pricingRuleCount,
          attention,
        };
      }),
    [procurementLookups, vendors],
  );

  const filteredVendors = useMemo(
    () =>
      vendorRows.filter((vendor) => {
        const categoryLabels = vendor.activeCategories
          .map((assignment) => `${getCategoryLabel(assignment.category)} ${getCategorySupportSummary(assignment)}`)
          .join(' ');
        const matchesSearch =
          !normalizedSearch ||
          vendor.vendorName.toLowerCase().includes(normalizedSearch) ||
          getVendorTypeLabel(vendor.vendorTypeId).toLowerCase().includes(normalizedSearch) ||
          categoryLabels.toLowerCase().includes(normalizedSearch);

        const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
        const matchesVendorType = vendorTypeFilter === 'all' || (vendor.vendorTypeId || '') === vendorTypeFilter;
        const matchesCategory =
          categoryFilter === 'all' || vendor.activeCategories.some((assignment) => assignment.category === categoryFilter);
        const matchesAttention =
          attentionFilter === 'all' ||
          (attentionFilter === 'attention' && vendor.attention.priority <= 3) ||
          (attentionFilter === 'pricing' && vendor.pricingRuleCount > 0) ||
          (attentionFilter === 'credit' && vendor.paymentTerms !== 'cash');

        return matchesSearch && matchesStatus && matchesVendorType && matchesCategory && matchesAttention;
      }),
    [
      attentionFilter,
      categoryFilter,
      normalizedSearch,
      procurementLookups.purchaseCategories,
      procurementLookups.purchaseSubCategories,
      procurementLookups.vendorTypes,
      statusFilter,
      vendorTypeFilter,
      vendorRows,
    ],
  );

  const metrics = useMemo(
    () => ({
      total: vendors.length,
      active: vendors.filter((vendor) => vendor.status === 'active').length,
      blocked: vendors.filter((vendor) => vendor.status === 'blocked').length,
      creditVendors: vendors.filter((vendor) => vendor.paymentTerms !== 'cash').length,
      outstanding: vendors.reduce((sum, vendor) => sum + vendor.currentBalance, 0),
      pricingRules: vendors.reduce((sum, vendor) => sum + (vendor.pricingFormulas?.length || 0), 0),
    }),
    [vendors],
  );

  const attentionQueue = useMemo(
    () =>
      [...vendorRows]
        .filter((vendor) => vendor.attention.priority <= 4)
        .sort((left, right) => {
          if (left.attention.priority !== right.attention.priority) {
            return left.attention.priority - right.attention.priority;
          }
          return right.currentBalance - left.currentBalance;
        })
        .slice(0, 8),
    [vendorRows],
  );

  const categoryCoverage = useMemo(
    () =>
      categoryOptions
        .map((category) => {
          const matchingVendors = vendorRows.filter((vendor) =>
            vendor.activeCategories.some((assignment) => assignment.category === category.value),
          );

          return {
            ...category,
            totalVendors: matchingVendors.length,
            creditVendors: matchingVendors.filter((vendor) => vendor.paymentTerms !== 'cash').length,
            pricingVendors: matchingVendors.filter((vendor) => vendor.pricingRuleCount > 0).length,
          };
        })
        .filter((category) => category.totalVendors > 0)
        .sort((left, right) => right.totalVendors - left.totalVendors),
    [categoryOptions, vendorRows],
  );

  const resetForm = () => {
    setEditingVendor(null);
    setFormVendorName('');
    setFormVendorTypeId('');
    setFormContactPerson('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormCity('');
    setFormCategories([]);
    setFormDefaultLeadTimeDays(0);
    setFormVendorSinceDate(toDateInputValue());
    setFormApprovedItems([]);
    setApprovedItemSearch('');
    setApprovedItemCategoryFilter('all');
    setFormPaymentTerms('cash');
    setFormCreditLimit(0);
    setFormTaxId('');
    setFormStatus('active');
    setFormInactiveReason('');
    setFormPricingFormulas([]);
  };

  const openVendor = (vendor: Vendor, mode: 'view' | 'edit') => {
    const vendorCategories = normalizeVendorCategoryAssignments(vendor, procurementLookups);

    setEditingVendor(vendor);
    setFormVendorName(vendor.vendorName);
    setFormVendorTypeId(vendor.vendorTypeId || '');
    setFormContactPerson(vendor.contactPerson);
    setFormPhone(vendor.phone);
    setFormEmail(vendor.email || '');
    setFormAddress(vendor.address);
    setFormCity(vendor.city);
    setFormCategories(vendorCategories);
    setFormDefaultLeadTimeDays(vendor.defaultLeadTimeDays || 0);
    setFormVendorSinceDate(toDateInputValue(vendor.createdAt));
    setFormApprovedItems(vendorItemMappings.filter((mapping) => mapping.vendorId === vendor.id));
    setApprovedItemSearch('');
    setApprovedItemCategoryFilter('all');
    setFormPaymentTerms(vendor.paymentTerms);
    setFormCreditLimit(vendor.creditLimit || 0);
    setFormTaxId(vendor.taxId || '');
    setFormStatus(vendor.status);
    setFormInactiveReason(vendor.inactiveReason || '');
    setFormPricingFormulas(vendor.pricingFormulas || []);
    setViewMode(mode === 'view');
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    resetForm();
    setViewMode(false);
    setDialogOpen(true);
  };

  const generateVendorCode = () => {
    const prefix = 'VEN';
    const count = vendors.length + 1;
    return `${prefix}${count.toString().padStart(4, '0')}`;
  };

  const handleAddCategory = (category: VendorCategory) => {
    if (!formCategories.find((entry) => entry.category === category)) {
      setFormCategories([
        ...formCategories,
        {
          category,
          startDate: new Date(),
          isActive: true,
          scopeType: 'all_subcategories',
          subCategoryIds: [],
        },
      ]);
    }
  };

  const handleRemoveCategory = (category: VendorCategory) => {
    setFormCategories(formCategories.filter((entry) => entry.category !== category));
  };

  const handleCategoryScopeChange = (category: VendorCategory, scopeType: VendorCategoryScopeType) => {
    setFormCategories((current) =>
      current.map((entry) =>
        entry.category === category
          ? {
              ...entry,
              scopeType,
              subCategoryIds: scopeType === 'selected_subcategories' ? entry.subCategoryIds || [] : [],
            }
          : entry,
      ),
    );
  };

  const handleToggleCategorySubCategory = (category: VendorCategory, subCategoryId: string) => {
    setFormCategories((current) =>
      current.map((entry) => {
        if (entry.category !== category) {
          return entry;
        }

        const existingSubCategoryIds = new Set(entry.subCategoryIds || []);
        if (existingSubCategoryIds.has(subCategoryId)) {
          existingSubCategoryIds.delete(subCategoryId);
        } else {
          existingSubCategoryIds.add(subCategoryId);
        }

        return {
          ...entry,
          scopeType: 'selected_subcategories',
          subCategoryIds: Array.from(existingSubCategoryIds),
        };
      }),
    );
  };

  const handleAddApprovedItem = () => {
    const availableItem = activePurchaseItems.find(
      (item) => !formApprovedItems.some((mapping) => mapping.kitchenItemId === item.id),
    );
    if (!availableItem) {
      toast.info('No more active kitchen items available to add');
      return;
    }

    const now = new Date();
    setFormApprovedItems([
      ...formApprovedItems,
      {
        id: `vendor-item-mapping-${Date.now()}`,
        vendorId: editingVendor?.id || '',
        kitchenItemId: availableItem.id,
        isPreferred: false,
        leadTimeDays: formDefaultLeadTimeDays || undefined,
        moq: availableItem.minimumOrderQuantity || undefined,
        lastRate: availableItem.lastPurchaseRate || availableItem.defaultPurchaseCost || undefined,
        contractRate: undefined,
        status: 'active',
        notes: '',
        createdAt: now,
        updatedAt: now,
      },
    ]);
  };

  const handleUpdateApprovedItem = (
    mappingId: string,
    field: keyof VendorItemMapping,
    value: string | number | boolean,
  ) => {
    setFormApprovedItems((current) =>
      current.map((mapping) => {
        if (mapping.id !== mappingId) {
          if (field === 'isPreferred' && value === true && mapping.kitchenItemId === current.find((entry) => entry.id === mappingId)?.kitchenItemId) {
            return { ...mapping, isPreferred: false, updatedAt: new Date() };
          }
          return mapping;
        }

        const nextValue =
          field === 'leadTimeDays' || field === 'moq' || field === 'lastRate' || field === 'contractRate'
            ? Number(value)
            : value;

        return {
          ...mapping,
          [field]: nextValue,
          updatedAt: new Date(),
        };
      }),
    );
  };

  const handleRemoveApprovedItem = (mappingId: string) => {
    setFormApprovedItems((current) => current.filter((mapping) => mapping.id !== mappingId));
  };

  const handleCreateLookupValue = (
    section: LookupSection,
    label: string,
    afterCreate?: (value: ProcurementLookupValue) => void,
  ) => {
    const name = window.prompt(`Add ${label}`);
    if (!name) {
      return;
    }

    const existingValues = procurementLookups[section];
    const duplicate = existingValues.find((entry) => entry.name.toLowerCase() === name.trim().toLowerCase());
    if (duplicate) {
      toast.info(`${label} already exists`);
      afterCreate?.(duplicate);
      return;
    }

    const created = createProcurementLookupValue(name, existingValues, userName);
    if (!created) {
      return;
    }

    onProcurementLookupsChange({
      ...procurementLookups,
      [section]: [...existingValues, created],
    });
    afterCreate?.(created);
    toast.success(`${label} added`);
  };

  const resetVendorTypeManagerDraft = () => {
    setEditingVendorTypeLookupId(null);
    setVendorTypeManagerDraft(createEmptyVendorTypeManagerDraft());
  };

  const openVendorTypeManager = () => {
    resetVendorTypeManagerDraft();
    setShowVendorTypeManager(true);
  };

  const openEditVendorType = (entry: ProcurementLookupValue) => {
    setEditingVendorTypeLookupId(entry.id);
    setVendorTypeManagerDraft({
      name: entry.name,
      isActive: entry.status !== 'inactive',
    });
    setShowVendorTypeManager(true);
  };

  const saveVendorTypeManagerDraft = () => {
    const trimmedName = vendorTypeManagerDraft.name.trim();
    if (!trimmedName) {
      toast.error('Vendor type name is required');
      return;
    }

    const duplicate = procurementLookups.vendorTypes.find((entry) => {
      if (editingVendorTypeLookupId && entry.id === editingVendorTypeLookupId) {
        return false;
      }
      return entry.name.trim().toLowerCase() === trimmedName.toLowerCase();
    });

    if (duplicate) {
      toast.info('Vendor type already exists');
      setFormVendorTypeId(duplicate.id);
      return;
    }

    const now = new Date();
    let savedId = editingVendorTypeLookupId;
    let created = false;

    const nextVendorTypes = editingVendorTypeLookupId
      ? procurementLookups.vendorTypes.map((entry) =>
          entry.id === editingVendorTypeLookupId
            ? {
                ...entry,
                name: trimmedName,
                status: vendorTypeManagerDraft.isActive ? 'active' : 'inactive',
                updatedAt: now,
              }
            : entry,
        )
      : (() => {
          const createdValue = createProcurementLookupValue(trimmedName, procurementLookups.vendorTypes, userName);
          if (!createdValue) {
            return procurementLookups.vendorTypes;
          }
          created = true;
          savedId = createdValue.id;
          return [
            ...procurementLookups.vendorTypes,
            {
              ...createdValue,
              status: vendorTypeManagerDraft.isActive ? 'active' : 'inactive',
            },
          ];
        })();

    onProcurementLookupsChange({
      ...procurementLookups,
      vendorTypes: nextVendorTypes,
    });

    if (savedId && vendorTypeManagerDraft.isActive) {
      setFormVendorTypeId(savedId);
    } else if (savedId && formVendorTypeId === savedId && !vendorTypeManagerDraft.isActive) {
      setFormVendorTypeId(savedId);
    }

    toast.success(created ? 'Vendor type added' : 'Vendor type updated');
    resetVendorTypeManagerDraft();
  };

  const toggleVendorTypeActive = (entryId: string) => {
    const currentEntry = procurementLookups.vendorTypes.find((entry) => entry.id === entryId);
    if (!currentEntry) {
      return;
    }

    onProcurementLookupsChange({
      ...procurementLookups,
      vendorTypes: procurementLookups.vendorTypes.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              status: entry.status === 'inactive' ? 'active' : 'inactive',
              updatedAt: new Date(),
            }
          : entry,
      ),
    });

    toast.success(`Vendor type ${currentEntry.status === 'inactive' ? 'activated' : 'deactivated'}`);
  };

  const deleteVendorType = (entryId: string) => {
    const currentEntry = vendorTypeRows.find((entry) => entry.id === entryId);
    if (!currentEntry) {
      return;
    }

    if (currentEntry.isDefault) {
      toast.error('Default vendor types cannot be deleted. Deactivate them instead.');
      return;
    }

    if (currentEntry.vendorCount > 0) {
      toast.error('This vendor type is assigned to vendors. Remove or change those vendors first.');
      return;
    }

    onProcurementLookupsChange({
      ...procurementLookups,
      vendorTypes: procurementLookups.vendorTypes.filter((entry) => entry.id !== entryId),
    });

    if (formVendorTypeId === entryId) {
      setFormVendorTypeId('');
    }
    if (editingVendorTypeLookupId === entryId) {
      resetVendorTypeManagerDraft();
    }

    toast.success('Vendor type deleted');
  };

  const handleAddPricingFormula = () => {
    setFormPricingFormulas([
      ...formPricingFormulas,
      {
        id: `formula-${Date.now()}`,
        productType: '',
        pricingMethod: 'supply-rate-multiplier',
        baseSupplyRate: 0,
        multiplyFactor: 1,
        lastUpdated: new Date(),
      },
    ]);
  };

  const handleUpdatePricingFormula = (id: string, updates: Partial<VendorPricingFormula>) => {
    setFormPricingFormulas(
      formPricingFormulas.map((formula) =>
        formula.id === id ? { ...formula, ...updates, lastUpdated: new Date() } : formula,
      ),
    );
  };

  const handleRemovePricingFormula = (id: string) => {
    setFormPricingFormulas(formPricingFormulas.filter((formula) => formula.id !== id));
  };

  const handleSave = () => {
    if (!formVendorName.trim()) {
      toast.error('Please enter vendor name');
      return;
    }
    if (!formContactPerson.trim()) {
      toast.error('Please enter contact person');
      return;
    }
    if (!formPhone.trim()) {
      toast.error('Please enter phone number');
      return;
    }
    if (formCategories.length === 0) {
      toast.error('Please select at least one category');
      return;
    }
    if (
      formCategories.some(
        (assignment) => assignment.scopeType === 'selected_subcategories' && !(assignment.subCategoryIds || []).length,
      )
    ) {
      toast.error('Select at least one sub category for every partial category support');
      return;
    }
    if (formStatus !== 'active' && !formInactiveReason.trim()) {
      toast.error('Please provide reason for inactive or blocked status');
      return;
    }

    const duplicate = vendors.find(
      (vendor) =>
        vendor.vendorName.toLowerCase() === formVendorName.trim().toLowerCase() &&
        vendor.id !== editingVendor?.id,
    );

    if (duplicate) {
      toast.error('A vendor with this name already exists');
      return;
    }

    const normalizedCategoryAssignments = formCategories.map((assignment) => ({
      ...assignment,
      scopeType: assignment.scopeType === 'selected_subcategories' ? 'selected_subcategories' : 'all_subcategories',
      subCategoryIds:
        assignment.scopeType === 'selected_subcategories' ? Array.from(new Set(assignment.subCategoryIds || [])) : [],
    }));

    const vendorData: Vendor = {
      id: editingVendor?.id || `vendor-${Date.now()}`,
      vendorName: formVendorName.trim(),
      vendorCode: editingVendor?.vendorCode || generateVendorCode(),
      vendorTypeId: formVendorTypeId || undefined,
      vendorCategories: normalizedCategoryAssignments,
      supplyCategoryIds: getLegacySupplyCategoryIds(
        normalizedCategoryAssignments.filter((assignment) => assignment.isActive !== false),
      ),
      supplyScope: normalizedCategoryAssignments.length > 0 ? 'all_items_in_selected_categories' : 'approved_items_only',
      defaultLeadTimeDays: formDefaultLeadTimeDays > 0 ? formDefaultLeadTimeDays : undefined,
      contactPerson: formContactPerson.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim() || undefined,
      address: formAddress.trim(),
      city: formCity.trim(),
      paymentTerms: formPaymentTerms,
      creditLimit: formPaymentTerms.startsWith('credit') ? formCreditLimit : undefined,
      status: formStatus,
      inactiveReason: formStatus !== 'active' ? formInactiveReason : undefined,
      inactiveSince:
        formStatus !== 'active' && !editingVendor?.inactiveSince ? new Date() : editingVendor?.inactiveSince,
      pricingFormulas: formPricingFormulas.length > 0 ? formPricingFormulas : undefined,
      taxId: formTaxId.trim() || undefined,
      currentBalance: editingVendor?.currentBalance || 0,
      totalPurchases: editingVendor?.totalPurchases || 0,
      lastPurchaseDate: editingVendor?.lastPurchaseDate,
      createdBy: editingVendor?.createdBy || userName,
      createdAt: new Date(formVendorSinceDate || toDateInputValue()),
      updatedAt: new Date(),
    };

    const approvedItemsByItem = new Map<string, VendorItemMapping>();
    formApprovedItems.forEach((mapping) => {
      if (!mapping.kitchenItemId) {
        return;
      }

      approvedItemsByItem.set(mapping.kitchenItemId, {
        ...mapping,
        vendorId: vendorData.id,
        leadTimeDays: mapping.leadTimeDays || undefined,
        moq: mapping.moq || undefined,
        lastRate: mapping.lastRate || undefined,
        contractRate: mapping.contractRate || undefined,
        status: mapping.status || 'active',
        updatedAt: new Date(),
      });
    });
    const approvedItems = Array.from(approvedItemsByItem.values());
    const preferredItemIds = new Set(approvedItems.filter((mapping) => mapping.isPreferred).map((mapping) => mapping.kitchenItemId));
    const nextVendorItemMappings = [
      ...vendorItemMappings
        .filter((mapping) => mapping.vendorId !== vendorData.id)
        .map((mapping) =>
          preferredItemIds.has(mapping.kitchenItemId)
            ? { ...mapping, isPreferred: false, updatedAt: new Date() }
            : mapping,
        ),
      ...approvedItems,
    ];

    const preferredVendorByItem = new Map<string, string>();
    nextVendorItemMappings.forEach((mapping) => {
      if (mapping.isPreferred) {
        preferredVendorByItem.set(mapping.kitchenItemId, mapping.vendorId);
      }
    });
    const nextPurchaseItems = purchaseItems.map((item) => {
      const preferredVendorId = preferredVendorByItem.get(item.id);
      if (preferredVendorId && item.preferredSupplierId !== preferredVendorId) {
        return { ...item, preferredSupplierId: preferredVendorId, updatedAt: new Date() };
      }
      if (!preferredVendorId && item.preferredSupplierId === vendorData.id) {
        return { ...item, preferredSupplierId: undefined, updatedAt: new Date() };
      }
      return item;
    });

    if (editingVendor) {
      onVendorsChange(vendors.map((vendor) => (vendor.id === editingVendor.id ? vendorData : vendor)));
      toast.success('Vendor updated successfully');
    } else {
      onVendorsChange([...vendors, vendorData]);
      toast.success('Vendor created successfully');
    }
    onVendorItemMappingsChange(nextVendorItemMappings);
    onPurchaseItemsChange(nextPurchaseItems);

    setDialogOpen(false);
  };

  const activeFormCategories = formCategories.filter((assignment) => assignment.isActive !== false);
  const normalizedApprovedItemSearch = approvedItemSearch.trim().toLowerCase();
  const filteredApprovedItems = formApprovedItems.filter((mapping) => {
    const item = purchaseItemById.get(mapping.kitchenItemId);
    const categoryId = item?.purchaseCategoryId || item?.categoryId || item?.category || '';
    const categoryLabel = getPurchaseItemCategoryLabel(item);
    const matchesSearch =
      !normalizedApprovedItemSearch ||
      item?.itemName.toLowerCase().includes(normalizedApprovedItemSearch) ||
      categoryLabel.toLowerCase().includes(normalizedApprovedItemSearch);
    const matchesCategory =
      approvedItemCategoryFilter === 'all' ||
      categoryId === approvedItemCategoryFilter ||
      categoryLabel === approvedItemCategoryFilter;

    return matchesSearch && matchesCategory;
  });
  const supplyConfigurationSummary = `${
    activeFormCategories.length
  } supported categor${activeFormCategories.length === 1 ? 'y' : 'ies'} - ${
    formDefaultLeadTimeDays > 0 ? `${formDefaultLeadTimeDays} day lead time` : 'No default lead time'
  }`;
  const approvedItemsSummary =
    formApprovedItems.length > 0
      ? `${filteredApprovedItems.length} of ${formApprovedItems.length} approved items shown`
      : 'No approved items configured';
  const pricingRulesSummary =
    formPricingFormulas.length > 0 ? `${formPricingFormulas.length} pricing rules configured` : 'No pricing rules configured';
  const vendorCodeDisplay = editingVendor?.vendorCode || 'Auto generated on save';

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-base font-semibold text-slate-900">Vendor Master</h2>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendor or category"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={handleAddNew}
            className="inline-flex h-9 items-center gap-2 rounded border border-blue-600 bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="size-4" />
            Add Vendor
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          <span><strong className="text-slate-900">Total:</strong> {metrics.total}</span>
          <span><strong className="text-slate-900">Active:</strong> {metrics.active}</span>
          <span><strong className="text-slate-900">Blocked:</strong> {metrics.blocked}</span>
          <span><strong className="text-slate-900">Credit Vendors:</strong> {metrics.creditVendors}</span>
          <span><strong className="text-slate-900">Outstanding:</strong> {formatCurrencyPKR(metrics.outstanding, { compact: true })}</span>
          <span><strong className="text-slate-900">Pricing Rules:</strong> {metrics.pricingRules}</span>
        </div>

        <div className="mt-3 border-t border-slate-200 pt-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Filters</div>
          <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
          <select
            value={vendorTypeFilter}
            onChange={(e) => setVendorTypeFilter(e.target.value)}
            className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700"
          >
            <option value="all">All Types</option>
            {vendorTypeOptions.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700"
          >
            <option value="all">All Categories</option>
            {categoryOptions.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
          </select>
          <select
            value={attentionFilter}
            onChange={(e) => setAttentionFilter(e.target.value as AttentionFilter)}
            className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700"
          >
            <option value="all">All Views</option>
            <option value="attention">Attention Queue</option>
            <option value="credit">Credit Vendors</option>
            <option value="pricing">Pricing Rules</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setVendorTypeFilter('all');
              setCategoryFilter('all');
              setStatusFilter('active');
              setAttentionFilter('all');
            }}
            className="h-8 rounded border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear Filters
          </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        {filteredVendors.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-300 bg-white text-center text-slate-500">
            <div>
              <Truck className="mx-auto mb-3 size-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No vendors found</p>
              <p className="mt-1 text-xs text-slate-500">Adjust the filters or add a new vendor.</p>
            </div>
          </div>
        ) : (
          <div className="grid h-full min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-h-0 flex-col overflow-hidden rounded border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-3 py-2">
                <h3 className="text-sm font-semibold text-slate-900">Vendor Register</h3>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Vendor</th>
                      <th className={tableHeadClass}>Type</th>
                      <th className={tableHeadClass}>Categories</th>
                      <th className={`${tableHeadClass} text-right`}>Outstanding</th>
                      <th className={`${tableHeadClass} text-right`}>Purchases</th>
                      <th className={tableHeadClass}>Last Purchase</th>
                      <th className={tableHeadClass}>Pricing</th>
                      <th className={tableHeadClass}>Status</th>
                      <th className={`${tableHeadClass} text-center`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.map((vendor) => {
                      const categoryLabels = getVendorCategoryLabels(vendor.activeCategories);
                      return (
                      <tr key={vendor.id} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className={vendorRegisterCellClass}>
                          <div className="font-semibold text-slate-900">{vendor.vendorName}</div>
                        </td>
                        <td className={vendorRegisterCellClass}>{getVendorTypeLabel(vendor.vendorTypeId)}</td>
                        <td className={vendorRegisterCellClass}>
                          <div className="flex flex-wrap gap-1">
                            {categoryLabels.slice(0, 3).map((categoryLabel) => (
                              <span
                                key={categoryLabel}
                                className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                              >
                                {categoryLabel}
                              </span>
                            ))}
                            {categoryLabels.length > 3 ? (
                              <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                                +{categoryLabels.length - 3}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className={`${vendorRegisterCellClass} text-right`}>
                          <div className="font-medium text-slate-900">{formatCurrencyPKR(vendor.currentBalance, { compact: true })}</div>
                          <div className="text-xs text-slate-500">
                            {vendor.utilization !== null ? `${Math.round(vendor.utilization * 100)}% of limit` : 'Cash vendor'}
                          </div>
                        </td>
                        <td className={`${vendorRegisterCellClass} text-right font-medium text-slate-900`}>
                          {formatCurrencyPKR(vendor.totalPurchases, { compact: true })}
                        </td>
                        <td className={vendorRegisterCellClass}>
                          {vendor.lastPurchaseDate ? formatDatePK(vendor.lastPurchaseDate) : 'No purchases'}
                        </td>
                        <td className={vendorRegisterCellClass}>
                          {vendor.pricingRuleCount > 0 ? (
                            <span className="inline-flex rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                              {vendor.pricingRuleCount} rules
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className={vendorRegisterCellClass}>
                          <div className="flex flex-col gap-0.5">
                            {getStatusBadge(vendor.status)}
                            {vendor.attention.priority <= 4 ? (
                              <span className="text-[11px] text-slate-500">{vendor.attention.label}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className={`${vendorRegisterCellClass} text-center`}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openVendor(vendor, 'view')}
                              className="rounded p-1 text-slate-600 hover:bg-slate-100"
                              title="View vendor"
                            >
                              <Eye className="size-4" />
                            </button>
                            <button
                              onClick={() => openVendor(vendor, 'edit')}
                              className="rounded p-1 text-blue-600 hover:bg-blue-50"
                              title="Edit vendor"
                            >
                              <Edit2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex h-full min-h-0 flex-col gap-4">
              <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-3 py-2">
                  <h3 className="text-sm font-semibold text-slate-900">Attention Queue</h3>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
                  {attentionQueue.length === 0 ? (
                    <p className="text-sm text-slate-500">No vendor follow-ups right now.</p>
                  ) : (
                    attentionQueue.map((vendor) => (
                      <div key={vendor.id} className="rounded border border-slate-200 px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{vendor.vendorName}</p>
                            <p className="mt-1 text-xs text-slate-500">{vendor.attention.detail}</p>
                          </div>
                          <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {vendor.attention.label}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                          <span>{paymentTermLabels[vendor.paymentTerms]}</span>
                          <span>{formatCurrencyPKR(vendor.currentBalance, { compact: true })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-3 py-2">
                  <h3 className="text-sm font-semibold text-slate-900">Category Coverage</h3>
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Category</th>
                        <th className={`${tableHeadClass} text-right`}>Vendors</th>
                        <th className={`${tableHeadClass} text-right`}>Credit</th>
                        <th className={`${tableHeadClass} text-right`}>Rules</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryCoverage.map((category) => (
                        <tr key={category.value} className="border-t border-slate-200">
                          <td className={tableCellClass}>{category.label}</td>
                          <td className={`${tableCellClass} text-right`}>{category.totalVendors}</td>
                          <td className={`${tableCellClass} text-right`}>{category.creditVendors}</td>
                          <td className={`${tableCellClass} text-right`}>{category.pricingVendors}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3">
          <div className="flex max-h-[94vh] w-full max-w-[1380px] flex-col overflow-hidden rounded bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  {viewMode ? 'Vendor Details' : editingVendor ? 'Edit Vendor' : 'Add Vendor'}
                </h2>
                <p className="text-xs text-slate-500">
                  {formVendorName || 'Kitchen purchase supplier profile'} - {vendorCodeDisplay}
                </p>
              </div>
              <button onClick={() => setDialogOpen(false)} className="rounded p-1.5 hover:bg-slate-100">
                <X className="size-5 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-b border-slate-200 bg-slate-50 px-4 py-1.5 text-xs md:grid-cols-5">
              <div>
                <span className="text-slate-500">Categories</span>
                <span className="ml-1 font-semibold text-slate-900">{activeFormCategories.length}</span>
              </div>
              <div>
                <span className="text-slate-500">Approved Items</span>
                <span className="ml-1 font-semibold text-slate-900">{formApprovedItems.length}</span>
              </div>
              <div className="min-w-0 truncate">
                <span className="text-slate-500">Coverage</span>
                <span className="ml-1 font-semibold text-slate-900">
                  {activeFormCategories.some((assignment) => assignment.scopeType === 'selected_subcategories')
                    ? 'Category + Sub Category'
                    : 'Category'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Lead</span>
                <span className="ml-1 font-semibold text-slate-900">{formDefaultLeadTimeDays || 0}d</span>
              </div>
              <div className="min-w-0 truncate">
                <span className="text-slate-500">Terms</span>
                <span className="ml-1 font-semibold text-slate-900">{paymentTermLabels[formPaymentTerms]}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-3">
                  <section className="rounded border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="inline-flex size-8 items-center justify-center rounded bg-blue-50 text-blue-700">
                        <UserRound className="size-4" />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-950">Basic Information</h3>
                        <p className="text-xs text-slate-500">Profile and commercial details</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-x-3 gap-y-2 md:grid-cols-2 xl:grid-cols-3">
                      <div className="xl:col-span-2">
                        <label className={labelClass}>
                          Vendor Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formVendorName}
                          onChange={(e) => setFormVendorName(e.target.value)}
                          disabled={viewMode}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Vendor Code</label>
                        <input
                          type="text"
                          value={vendorCodeDisplay}
                          readOnly
                          className="h-8 w-full rounded border border-slate-200 bg-slate-50 px-2.5 text-sm font-medium text-slate-600"
                        />
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <label className="block text-xs font-medium text-slate-700">Vendor Type</label>
                          {!viewMode ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={openVendorTypeManager}
                                className="inline-flex size-6 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
                                title="Manage vendor types"
                              >
                                <Plus className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={openVendorTypeManager}
                                className="inline-flex size-6 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
                                title="Manage vendor types"
                              >
                                <Settings className="size-3.5" />
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <select
                          value={formVendorTypeId}
                          onChange={(e) => setFormVendorTypeId(e.target.value)}
                          disabled={viewMode}
                          className={inputClass}
                        >
                          <option value="">Select type</option>
                          {formVendorTypeId && !activeVendorTypeOptionValues.has(formVendorTypeId) ? (
                            <option value={formVendorTypeId}>
                              {getVendorTypeLabel(formVendorTypeId)} (Inactive)
                            </option>
                          ) : null}
                          {vendorTypeOptions.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        {!viewMode ? (
                          <div className="mt-1 text-[10px] text-slate-500">
                            Use the manage buttons to add, rename, deactivate, or delete custom vendor types.
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <label className={labelClass}>
                          Contact Person <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formContactPerson}
                          onChange={(e) => setFormContactPerson(e.target.value)}
                          disabled={viewMode}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>
                          Phone <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          disabled={viewMode}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Email</label>
                        <input
                          type="email"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          disabled={viewMode}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>City</label>
                        <input
                          type="text"
                          value={formCity}
                          onChange={(e) => setFormCity(e.target.value)}
                          disabled={viewMode}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Status</label>
                        <select
                          value={formStatus}
                          onChange={(e) => setFormStatus(e.target.value as Vendor['status'])}
                          disabled={viewMode}
                          className={inputClass}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="blocked">Blocked</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Vendor Since Date</label>
                        <input
                          type="date"
                          value={formVendorSinceDate}
                          onChange={(e) => setFormVendorSinceDate(e.target.value)}
                          disabled={viewMode}
                          className={inputClass}
                        />
                      </div>
                      <div className="md:col-span-2 xl:col-span-3">
                        <label className={labelClass}>Address</label>
                        <input
                          type="text"
                          value={formAddress}
                          onChange={(e) => setFormAddress(e.target.value)}
                          disabled={viewMode}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Payment Terms</label>
                        <select
                          value={formPaymentTerms}
                          onChange={(e) => setFormPaymentTerms(e.target.value as PaymentTerms)}
                          disabled={viewMode}
                          className={inputClass}
                        >
                          {Object.entries(paymentTermLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {formPaymentTerms.startsWith('credit') ? (
                        <div>
                          <label className={labelClass}>Credit Limit</label>
                          <input
                            type="number"
                            value={formCreditLimit}
                            onChange={(e) => setFormCreditLimit(parseFloat(e.target.value) || 0)}
                            disabled={viewMode}
                            className={inputClass}
                          />
                        </div>
                      ) : null}
                      <div>
                        <label className={labelClass}>Tax ID</label>
                        <input
                          type="text"
                          value={formTaxId}
                          onChange={(e) => setFormTaxId(e.target.value)}
                          disabled={viewMode}
                          className={inputClass}
                        />
                      </div>
                      {formStatus !== 'active' ? (
                        <div className="md:col-span-2 xl:col-span-3">
                          <label className={labelClass}>
                            Reason <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formInactiveReason}
                            onChange={(e) => setFormInactiveReason(e.target.value)}
                            disabled={viewMode}
                            className={inputClass}
                          >
                            <option value="">Select reason</option>
                            {inactiveReasons.map((reason) => (
                              <option key={reason} value={reason}>
                                {reason}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <CollapsibleSection
                    title="Supported Categories"
                    icon={Settings}
                    summary={supplyConfigurationSummary}
                    count={activeFormCategories.length}
                    hasError={formCategories.length === 0}
                  >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
                      <div>
                        <label className={labelClass}>Default Lead Time</label>
                        <input
                          type="number"
                          min="0"
                          value={formDefaultLeadTimeDays}
                          onChange={(e) => setFormDefaultLeadTimeDays(parseInt(e.target.value, 10) || 0)}
                          disabled={viewMode}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-900">
                          Supported Categories <span className="text-red-500">*</span>
                        </h4>
                        {!viewMode ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleCreateLookupValue('purchaseCategories', 'category', (created) =>
                                handleAddCategory(created.id),
                              )
                            }
                            className={quietButtonClass}
                          >
                            <Plus className="size-3.5" />
                            Add Category
                          </button>
                        ) : null}
                      </div>
                      {!viewMode ? (
                        <div className="mb-4 flex flex-wrap gap-2">
                          {categoryOptions.map((category) => {
                            const selected = formCategories.some((assignment) => assignment.category === category.value);
                            return (
                              <button
                                key={category.value}
                                type="button"
                                onClick={() => handleAddCategory(category.value)}
                                disabled={selected}
                                className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                                  selected
                                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                    : 'border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                                }`}
                              >
                                {category.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {formCategories.map((assignment) => (
                          <div
                            key={assignment.category}
                            className="rounded border border-slate-200 bg-slate-50 p-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">{getCategoryLabel(assignment.category)}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <span
                                    className={`rounded-full px-2 py-0.5 font-medium ${
                                      assignment.isActive === false
                                        ? 'bg-slate-200 text-slate-600'
                                        : 'bg-emerald-100 text-emerald-700'
                                    }`}
                                  >
                                    {assignment.isActive === false ? 'Inactive' : 'Active'}
                                  </span>
                                  <span>{formatDatePK(assignment.startDate)}</span>
                                </div>
                              </div>
                              {!viewMode ? (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCategory(assignment.category)}
                                  className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                                  title="Remove category"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              ) : null}
                            </div>
                            <div className="mt-3 space-y-2">
                              <div>
                                <label className={labelClass}>Coverage</label>
                                <select
                                  value={assignment.scopeType || 'all_subcategories'}
                                  onChange={(event) =>
                                    handleCategoryScopeChange(
                                      assignment.category,
                                      event.target.value as VendorCategoryScopeType,
                                    )
                                  }
                                  disabled={viewMode}
                                  className={inputClass}
                                >
                                  {categorySupportScopeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {assignment.scopeType === 'selected_subcategories' ? (
                                <div>
                                  <label className={labelClass}>Sub Categories</label>
                                  <div className="flex flex-wrap gap-2">
                                    {(subCategoryOptionsByCategory[assignment.category] || []).map((subCategory) => {
                                      const selected = (assignment.subCategoryIds || []).includes(subCategory.value);
                                      return (
                                        <button
                                          key={subCategory.value}
                                          type="button"
                                          onClick={() => handleToggleCategorySubCategory(assignment.category, subCategory.value)}
                                          disabled={viewMode}
                                          className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                                            selected
                                              ? 'border-blue-300 bg-blue-50 text-blue-700'
                                              : 'border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                                          }`}
                                        >
                                          {subCategory.label}
                                        </button>
                                      );
                                    })}
                                    {(subCategoryOptionsByCategory[assignment.category] || []).length === 0 ? (
                                      <span className="text-xs text-slate-500">No sub categories available under this category.</span>
                                    ) : null}
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-700">
                                  This vendor can supply all sub categories under {getCategoryLabel(assignment.category)}.
                                </div>
                              )}
                              {viewMode ? (
                                <div className="text-xs text-slate-500">{getCategorySupportSummary(assignment)}</div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                        {formCategories.length === 0 ? (
                          <div className="rounded border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                            No supported categories selected.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </CollapsibleSection>

                  <CollapsibleSection
                    title="Approved Items Supplied"
                    icon={PackageCheck}
                    defaultOpen
                    summary={approvedItemsSummary}
                    count={formApprovedItems.length}
                  >
                    <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-1 flex-col gap-2 md:flex-row">
                        <div className="relative min-w-[220px] flex-1">
                          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={approvedItemSearch}
                            onChange={(e) => setApprovedItemSearch(e.target.value)}
                            placeholder="Search approved item"
                            className="h-8 w-full rounded border border-slate-300 bg-white pl-8 pr-2.5 text-sm"
                          />
                        </div>
                        <select
                          value={approvedItemCategoryFilter}
                          onChange={(e) => setApprovedItemCategoryFilter(e.target.value)}
                          className="h-8 rounded border border-slate-300 bg-white px-2.5 text-sm text-slate-700"
                        >
                          <option value="all">All categories</option>
                          {approvedItemCategoryOptions.map((category) => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </div>
                        <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {filteredApprovedItems.length} items
                        </span>
                        {!viewMode ? (
                          <button
                            type="button"
                            onClick={handleAddApprovedItem}
                            className="inline-flex h-8 items-center gap-1.5 rounded border border-blue-600 bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            <Plus className="size-4" />
                            Add Item
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="overflow-hidden rounded border border-slate-200">
                      <table className="w-full table-fixed">
                        <colgroup>
                          <col className="w-[38%]" />
                          <col className="w-[24%]" />
                          <col className="w-[16%]" />
                          <col className="w-[14%]" />
                          <col className="w-[8%]" />
                        </colgroup>
                        <thead className="bg-slate-100">
                          <tr>
                            <th className={tableHeadClass}>Item Name</th>
                            <th className={tableHeadClass}>Category</th>
                            <th className={`${tableHeadClass} text-center`}>Preferred Supplier</th>
                            <th className={`${tableHeadClass} text-right`}>Lead Time</th>
                            <th className={`${tableHeadClass} text-right`}>Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {filteredApprovedItems.map((mapping) => {
                            const item = purchaseItemById.get(mapping.kitchenItemId);
                            return (
                              <tr key={mapping.id} className="align-middle">
                                <td className={tableCellClass}>
                                  <select
                                    value={mapping.kitchenItemId}
                                    onChange={(e) => handleUpdateApprovedItem(mapping.id, 'kitchenItemId', e.target.value)}
                                    disabled={viewMode}
                                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm disabled:bg-slate-50"
                                  >
                                    {activePurchaseItems.map((purchaseItem) => (
                                      <option key={purchaseItem.id} value={purchaseItem.id}>
                                        {purchaseItem.itemName}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className={`${tableCellClass} truncate`}>{getPurchaseItemCategoryLabel(item)}</td>
                                <td className={`${tableCellClass} text-center`}>
                                  <input
                                    type="checkbox"
                                    checked={mapping.isPreferred}
                                    onChange={(e) => handleUpdateApprovedItem(mapping.id, 'isPreferred', e.target.checked)}
                                    disabled={viewMode}
                                    className="size-4 rounded border-slate-300 text-blue-600"
                                    title="Preferred supplier"
                                  />
                                </td>
                                <td className={`${tableCellClass} text-right`}>
                                  <input
                                    type="number"
                                    min="0"
                                    value={mapping.leadTimeDays || 0}
                                    onChange={(e) => handleUpdateApprovedItem(mapping.id, 'leadTimeDays', Number(e.target.value))}
                                    disabled={viewMode}
                                    className="h-9 w-full rounded-md border border-slate-300 px-2 text-right text-sm disabled:bg-slate-50"
                                  />
                                </td>
                                <td className={`${tableCellClass} text-right`}>
                                  {!viewMode ? (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveApprovedItem(mapping.id)}
                                      className="inline-flex size-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                                      title="Remove item"
                                    >
                                      <Trash2 className="size-4" />
                                    </button>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {filteredApprovedItems.length === 0 ? (
                            <tr>
                              <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={5}>
                                No approved items match the current filters.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </CollapsibleSection>

                  <CollapsibleSection
                    title="Pricing Rules"
                    icon={Calculator}
                    summary={pricingRulesSummary}
                    count={formPricingFormulas.length}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-1.5 text-xs font-medium">
                        <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">Fixed price</span>
                        <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">Factor based</span>
                        <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">Dynamic pricing</span>
                      </div>
                      {!viewMode ? (
                        <button
                          type="button"
                          onClick={handleAddPricingFormula}
                          className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                          <Plus className="size-4" />
                          Add Rule
                        </button>
                      ) : null}
                    </div>

                    {formPricingFormulas.length === 0 ? (
                          <div className="rounded border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-sm text-slate-500">
                        No pricing rules configured.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formPricingFormulas.map((formula) => {
                          const isFixed = formula.pricingMethod === 'fixed';
                          return (
                            <div key={formula.id} className="rounded border border-slate-200 bg-slate-50 p-3">
                              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_170px_140px_120px_150px_44px]">
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-slate-700">Rule / Item Group</label>
                                  <input
                                    type="text"
                                    value={formula.productType}
                                    onChange={(e) => handleUpdatePricingFormula(formula.id, { productType: e.target.value })}
                                    disabled={viewMode}
                                    className={inputClass}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-slate-700">Pricing Type</label>
                                  <select
                                    value={formula.pricingMethod}
                                    onChange={(e) =>
                                      handleUpdatePricingFormula(formula.id, {
                                        pricingMethod: e.target.value as VendorPricingFormula['pricingMethod'],
                                      })
                                    }
                                    disabled={viewMode}
                                    className={inputClass}
                                  >
                                    <option value="fixed">Fixed price</option>
                                    <option value="supply-rate-multiplier">Factor / dynamic</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                                    {isFixed ? 'Fixed Rate' : 'Market Rate'}
                                  </label>
                                  <input
                                    type="number"
                                    value={isFixed ? formula.fixedRate || 0 : formula.baseSupplyRate || 0}
                                    onChange={(e) =>
                                      handleUpdatePricingFormula(
                                        formula.id,
                                        isFixed
                                          ? { fixedRate: parseFloat(e.target.value) || 0 }
                                          : { baseSupplyRate: parseFloat(e.target.value) || 0 },
                                      )
                                    }
                                    disabled={viewMode}
                                    className={inputClass}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-slate-700">Factor</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={formula.multiplyFactor || 1}
                                    onChange={(e) => handleUpdatePricingFormula(formula.id, { multiplyFactor: parseFloat(e.target.value) || 1 })}
                                    disabled={viewMode || isFixed}
                                    className={inputClass}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-slate-700">Calculated Price</label>
                                  <div className="flex h-8 items-center rounded border border-emerald-200 bg-emerald-50 px-2.5 text-sm font-semibold text-emerald-700">
                                    {formatCurrencyPKR(calculateFinalPrice(formula), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </div>
                                <div className="flex items-end justify-end">
                                  {!viewMode ? (
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePricingFormula(formula.id)}
                                      className="inline-flex size-10 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                                      title="Delete pricing rule"
                                    >
                                      <Trash2 className="size-4" />
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CollapsibleSection>
                </div>

                <aside className="space-y-3 xl:sticky xl:top-0 xl:self-start">
                  <CollapsibleSection
                    title="Vendor Summary"
                    icon={ClipboardList}
                    defaultOpen
                    summary={`${activeFormCategories.length} categories - ${formApprovedItems.length} items`}
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded border border-slate-200 bg-slate-50 p-2">
                        <p className="text-xs font-medium uppercase text-slate-500">Categories</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{activeFormCategories.length}</p>
                      </div>
                      <div className="rounded border border-slate-200 bg-slate-50 p-2">
                        <p className="text-xs font-medium uppercase text-slate-500">Approved Items</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{formApprovedItems.length}</p>
                      </div>
                      <div className="rounded border border-slate-200 bg-slate-50 p-2">
                        <p className="text-xs font-medium uppercase text-slate-500">Default Lead Time</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">
                          {formDefaultLeadTimeDays > 0 ? `${formDefaultLeadTimeDays} days` : 'Not set'}
                        </p>
                      </div>
                      <div className="rounded border border-slate-200 bg-slate-50 p-2">
                        <p className="text-xs font-medium uppercase text-slate-500">Pricing Rules</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{formPricingFormulas.length}</p>
                      </div>
                      <div className="rounded border border-slate-200 bg-slate-50 p-2">
                        <p className="text-xs font-medium uppercase text-slate-500">Vendor Status</p>
                        <div className="mt-1">{getStatusBadge(formStatus)}</div>
                      </div>
                      <div className="rounded border border-slate-200 bg-slate-50 p-2">
                        <p className="text-xs font-medium uppercase text-slate-500">Vendor Since</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{formatDatePK(new Date(formVendorSinceDate))}</p>
                      </div>
                    </div>
                    {editingVendor ? (
                      <div className="mt-3 rounded border border-slate-200 bg-white p-2 text-xs text-slate-600">
                        <div className="flex items-center justify-between gap-3">
                          <span>Outstanding</span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrencyPKR(editingVendor.currentBalance, { compact: true })}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span>Total Purchases</span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrencyPKR(editingVendor.totalPurchases, { compact: true })}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span>Last Purchase</span>
                          <span className="font-semibold text-slate-900">
                            {editingVendor.lastPurchaseDate ? formatDatePK(editingVendor.lastPurchaseDate) : 'No purchases'}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </CollapsibleSection>
                </aside>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-2 shadow-[0_-8px_20px_rgba(15,23,42,0.08)]">
              <button
                onClick={() => setDialogOpen(false)}
                className="h-8 rounded border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {viewMode ? 'Close' : 'Cancel'}
              </button>
              {!viewMode ? (
                <button
                  onClick={handleSave}
                  className="h-8 rounded border border-blue-600 bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {editingVendor ? 'Update Vendor' : 'Create Vendor'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showVendorTypeManager ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-3">
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Vendor Type Manager</h3>
                <p className="text-xs text-slate-500">Add, edit, deactivate, or delete vendor types used in vendor profiles.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowVendorTypeManager(false);
                  resetVendorTypeManagerDraft();
                }}
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 md:grid-cols-[minmax(0,1fr)_120px_auto]">
              <div>
                <label className={labelClass}>Vendor Type Name</label>
                <input
                  type="text"
                  value={vendorTypeManagerDraft.name}
                  onChange={(event) => setVendorTypeManagerDraft((current) => ({ ...current, name: event.target.value }))}
                  className={inputClass}
                  placeholder="Enter vendor type name"
                />
              </div>
              <div className="flex items-end">
                <label className="inline-flex h-8 items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={vendorTypeManagerDraft.isActive}
                    onChange={(event) =>
                      setVendorTypeManagerDraft((current) => ({ ...current, isActive: event.target.checked }))
                    }
                    className="size-4 rounded border-slate-300 text-blue-600"
                  />
                  Active
                </label>
              </div>
              <div className="flex items-end justify-end gap-2">
                <button
                  type="button"
                  onClick={resetVendorTypeManagerDraft}
                  className={quietButtonClass}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={saveVendorTypeManagerDraft}
                  className="inline-flex h-8 items-center gap-1.5 rounded border border-blue-600 bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="size-3.5" />
                  {editingVendorTypeLookupId ? 'Save' : 'Add'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="overflow-hidden rounded border border-slate-200 bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Vendor Type</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-700">Status</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Used By</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorTypeRows.map((entry) => (
                      <tr key={entry.id} className="border-t border-slate-200">
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-900">{entry.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {entry.code}
                            {entry.isDefault ? ' | Default type' : ' | Custom type'}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${entry.status === 'inactive' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>
                            {entry.status === 'inactive' ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-slate-700">{entry.vendorCount}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditVendorType(entry)}
                              className="rounded p-1.5 text-blue-600 hover:bg-blue-100"
                              title="Edit vendor type"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleVendorTypeActive(entry.id)}
                              className="rounded px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                            >
                              {entry.status === 'inactive' ? 'Activate' : 'Deactivate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteVendorType(entry.id)}
                              className="rounded p-1.5 text-red-600 hover:bg-red-50"
                              title="Delete vendor type"
                              disabled={entry.isDefault || entry.vendorCount > 0}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {vendorTypeRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500">
                          No vendor types found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
