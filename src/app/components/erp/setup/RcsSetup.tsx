import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  Layers3,
  Package,
  Percent,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { formatCurrencyPKR } from '../../../lib/locale';
import type { Booking } from '../../calendar/types-v2';
import { CompactAccordionSection, CompactFormSection, SetupAdminColumn, SetupAdminGrid } from './SetupCompactPrimitives';
import {
  defaultSetupRcsApprovalSettings,
  defaultSetupRcsCategories,
  defaultSetupRcsCommissionRules,
  defaultSetupRcsPackages,
  defaultSetupRcsServices,
  defaultSetupRcsVendorRates,
  defaultSetupRcsVendors,
  loadSetupRcsApprovalSettings,
  loadSetupRcsCategories,
  loadSetupRcsCommissionRules,
  loadSetupRcsPackages,
  loadSetupRcsServices,
  loadSetupRcsVendorRates,
  loadSetupRcsVendors,
  saveSetupRcsApprovalSettings,
  saveSetupRcsCategories,
  saveSetupRcsCommissionRules,
  saveSetupRcsPackages,
  saveSetupRcsServices,
  saveSetupRcsVendorRates,
  saveSetupRcsVendors,
  type SetupRcsApprovalSettings,
  type SetupRcsCategory,
  type SetupRcsCommissionType,
  type SetupRcsCommissionParticipant,
  type SetupRcsCommissionRule,
  type SetupRcsFulfillmentType,
  type SetupRcsPackage,
  type SetupRcsPackageType,
  type SetupRcsService,
  type SetupRcsNegotiationStatus,
  type SetupRcsVendor,
  type SetupRcsVendorStatus,
  type SetupRcsVendorRate,
} from './setupMasterData';

type RcsSetupTab =
  | 'overview'
  | 'categories'
  | 'services'
  | 'vendors'
  | 'vendor-rates'
  | 'packages'
  | 'commission-rules'
  | 'profit-report'
  | 'approval-settings';

type StatusFilter = 'all' | 'active' | 'inactive';
type DateFilter = 'month' | '30d' | '90d';
type OverviewFilter = 'all' | string;
type RcsCurrentMode = 'In-house' | 'Outsourced' | 'Mixed';
type RcsRecommendation =
  | 'Bring In-house'
  | 'Keep Outsourced'
  | 'Outsource This Service'
  | 'Buy Equipment'
  | 'Assign Staff Operator'
  | 'Negotiate Vendor Rate'
  | 'Watch Margin';
type RcsMarginStatus = 'Healthy' | 'Watch' | 'Low' | 'Negative' | 'No Sales';
type DashboardAction =
  | 'open-service-setup'
  | 'compare-source'
  | 'create-asset-proposal'
  | 'assign-staff-operator'
  | 'mark-vendor-negotiation'
  | 'keep-current-mode';
type EditableRcsSection =
  | 'categories'
  | 'services'
  | 'vendors'
  | 'vendor-rates'
  | 'packages'
  | 'commission-rules'
  | 'approval-settings';

interface RcsSetupProps {
  userName: string;
  bookings?: Booking[];
  serviceBookings?: Array<Record<string, any>>;
}

interface SoldLine {
  source: 'reservation' | 'outside-services';
  date: Date | null;
  serviceId?: string;
  categoryId?: string;
  serviceName: string;
  venueName: string;
  vendorName: string;
  fulfillmentType: SetupRcsFulfillmentType;
  quantity: number;
  sellingRate: number;
  totalRevenue: number;
  vendorCost: number;
  internalCost: number;
  totalCost: number;
  grossProfit: number;
  commissionPayable: number;
  salesCommission: number;
  operatorCommission: number;
  directorShare: number;
  companyProfit: number;
}

interface ServiceDecisionRow {
  id: string;
  service?: SetupRcsService;
  serviceName: string;
  categoryId: string;
  categoryName: string;
  currentMode: RcsCurrentMode;
  soldQty: number;
  revenue: number;
  vendorCost: number;
  internalCost: number;
  grossProfit: number;
  staffCommission: number;
  salesCommission: number;
  operatorCommission: number;
  directorShare: number;
  netCompanyProfit: number;
  marginPercent: number;
  marginStatus: RcsMarginStatus;
  seasonVendorSpend: number;
  estimatedInHouseCost: number;
  estimatedVendorCost: number;
  opportunitySaving: number;
  recommendation: RcsRecommendation;
  vendorName: string;
  venueNames: string[];
  currentVendorCostPerEvent: number;
  estimatedInHouseCostPerEvent: number;
  vendorBenchmarkPerEvent: number;
  assetCost: number;
  paybackEvents: number;
  suggestedStaffShare: number;
  companySavingAfterStaffShare: number;
  missingCost: boolean;
  missingVendorRate: boolean;
  missingCommissionRule: boolean;
}

const tabs: Array<{ id: RcsSetupTab; label: string }> = [
  { id: 'overview', label: 'Sourcing & Profit' },
  { id: 'categories', label: 'Categories' },
  { id: 'services', label: 'Services' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'vendor-rates', label: 'Vendor Rates' },
  { id: 'packages', label: 'Packages' },
  { id: 'commission-rules', label: 'Commission Rules' },
  { id: 'profit-report', label: 'Profit Report' },
  { id: 'approval-settings', label: 'Approval Settings' },
];

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All Records' },
  { value: 'active', label: 'Active Only' },
  { value: 'inactive', label: 'Inactive Only' },
];

const dateOptions: Array<{ value: DateFilter; label: string }> = [
  { value: 'month', label: 'This Season' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
];

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-3 py-2 text-sm text-slate-700 align-top';
const compactTableHeadClass = 'px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const compactTableCellClass = 'px-2 py-1.5 text-xs text-slate-700 align-top';

const recommendationOptions: RcsRecommendation[] = [
  'Bring In-house',
  'Keep Outsourced',
  'Outsource This Service',
  'Buy Equipment',
  'Assign Staff Operator',
  'Negotiate Vendor Rate',
  'Watch Margin',
];

const currentModeOptions: RcsCurrentMode[] = ['In-house', 'Outsourced', 'Mixed'];
const marginStatusOptions: RcsMarginStatus[] = ['Healthy', 'Watch', 'Low', 'Negative', 'No Sales'];
const fulfillmentTypeOptions: Array<{ value: SetupRcsFulfillmentType; label: string }> = [
  { value: 'in-house', label: 'In-house' },
  { value: 'outsourced', label: 'Outsourced' },
];
const packageFulfillmentOptions: Array<{ value: SetupRcsPackageType; label: string }> = [
  { value: 'in-house', label: 'In-house' },
  { value: 'outsourced', label: 'Outsourced' },
  { value: 'mixed', label: 'Mixed' },
];
const vendorStatusOptions: Array<{ value: SetupRcsVendorStatus; label: string }> = [
  { value: 'preferred', label: 'Preferred' },
  { value: 'backup', label: 'Backup' },
  { value: 'standard', label: 'Standard' },
];
const negotiationStatusOptions: Array<{ value: SetupRcsNegotiationStatus; label: string }> = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'pending', label: 'Pending' },
  { value: 'negotiated', label: 'Negotiated' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];
const commissionTypeOptions: Array<{ value: SetupRcsCommissionType; label: string }> = [
  { value: 'sales', label: 'Sales' },
  { value: 'operator', label: 'Operator' },
  { value: 'director', label: 'Director' },
  { value: 'company', label: 'Company Auto' },
];
const ratingOptions = [1, 2, 3, 4, 5];

const dashboardActionOptions: Array<{ value: DashboardAction; label: string }> = [
  { value: 'open-service-setup', label: 'Open Service Setup' },
  { value: 'compare-source', label: 'Compare In-house vs Vendor' },
  { value: 'create-asset-proposal', label: 'Create Asset Proposal' },
  { value: 'assign-staff-operator', label: 'Assign Staff Operator' },
  { value: 'mark-vendor-negotiation', label: 'Mark for Vendor Negotiation' },
  { value: 'keep-current-mode', label: 'Keep Current Mode' },
];

const safeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const formatCompactCurrency = (value: number) =>
  formatCurrencyPKR(value, { compact: true, minimumFractionDigits: 1, maximumFractionDigits: 1 });

const toLocalDate = (value: unknown) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const matchesStatus = (isActive: boolean, filter: StatusFilter) => {
  if (filter === 'active') return isActive;
  if (filter === 'inactive') return !isActive;
  return true;
};

const isWithinDateFilter = (value: Date | null, filter: DateFilter) => {
  if (!value) return false;

  const compareDate = new Date(value);
  const now = new Date();
  if (filter === 'month') {
    return compareDate.getMonth() === now.getMonth() && compareDate.getFullYear() === now.getFullYear();
  }

  const days = filter === '30d' ? 30 : 90;
  const threshold = new Date();
  threshold.setHours(0, 0, 0, 0);
  threshold.setDate(threshold.getDate() - days);
  return compareDate >= threshold;
};

const computeServiceCost = (service: SetupRcsService) =>
  service.fulfillmentType === 'outsourced' ? safeNumber(service.vendorCost) : safeNumber(service.internalCost);

const computeServiceProfit = (service: SetupRcsService) =>
  safeNumber(service.defaultSellingPrice) - computeServiceCost(service);

const computeMargin = (sellingPrice: number, cost: number) => {
  const revenue = safeNumber(sellingPrice);
  if (revenue <= 0) return 0;
  return ((revenue - safeNumber(cost)) / revenue) * 100;
};

const computePackageTotals = (pkg: SetupRcsPackage) => {
  const sellingPrice = pkg.lines.reduce((sum, line) => sum + safeNumber(line.quantity) * safeNumber(line.sellingPrice), 0);
  const lineCost = pkg.lines.reduce((sum, line) => sum + safeNumber(line.quantity) * safeNumber(line.cost), 0);
  const cost = pkg.packageCostOverrideEnabled ? safeNumber(pkg.packageCostOverride) : lineCost;
  return {
    sellingPrice,
    cost,
    grossProfit: sellingPrice - cost,
    grossMargin: computeMargin(sellingPrice, cost),
  };
};

const getCommissionType = (participant: SetupRcsCommissionParticipant): SetupRcsCommissionType => {
  if (participant.commissionType) return participant.commissionType;
  if (participant.shareType === 'auto-remaining') return 'company';
  const role = participant.role.toLowerCase();
  if (role.includes('director')) return 'director';
  if (role.includes('company')) return 'company';
  if (role.includes('operator') || role.includes('staff')) return 'operator';
  return 'sales';
};

const computeRuleBreakdown = (rule: SetupRcsCommissionRule | undefined, grossProfit: number) => {
  const activeParticipants = rule?.participants.filter((participant) => participant.isActive) ?? [];
  const fixedAndPercent = activeParticipants.filter((participant) => participant.shareType !== 'auto-remaining');
  const autoRemaining = activeParticipants.find((participant) => participant.shareType === 'auto-remaining');

  let consumed = 0;
  const allocations = fixedAndPercent.map((participant) => {
    const amount =
      participant.shareType === 'percentage'
        ? (safeNumber(grossProfit) * safeNumber(participant.shareValue)) / 100
        : safeNumber(participant.shareValue);
    consumed += amount;
    return {
      ...participant,
      calculatedAmount: amount,
    };
  });

  if (autoRemaining) {
    allocations.push({
      ...autoRemaining,
      calculatedAmount: Math.max(safeNumber(grossProfit) - consumed, 0),
    });
  }

  const salesCommission = allocations
    .filter((participant) => getCommissionType(participant) === 'sales')
    .reduce((sum, participant) => sum + participant.calculatedAmount, 0);
  const operatorCommission = allocations
    .filter((participant) => getCommissionType(participant) === 'operator')
    .reduce((sum, participant) => sum + participant.calculatedAmount, 0);
  const directorShare = allocations
    .filter((participant) => getCommissionType(participant) === 'director')
    .reduce((sum, participant) => sum + participant.calculatedAmount, 0);
  const companyShare = allocations
    .filter((participant) => getCommissionType(participant) === 'company')
    .reduce((sum, participant) => sum + participant.calculatedAmount, 0);
  const staffCommission = salesCommission + operatorCommission;

  return {
    allocations,
    salesCommission,
    operatorCommission,
    staffCommission,
    directorShare,
    companyShare,
    totalCommission: staffCommission + directorShare,
  };
};

const formatPercent = (value: number) => `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`;

const displayMode = (fulfillmentType: SetupRcsFulfillmentType): RcsCurrentMode =>
  fulfillmentType === 'outsourced' ? 'Outsourced' : 'In-house';

const getMarginStatus = (revenue: number, grossProfit: number, minimumMargin: number): RcsMarginStatus => {
  if (safeNumber(revenue) <= 0) return 'No Sales';
  if (grossProfit < 0) return 'Negative';
  const margin = (grossProfit / revenue) * 100;
  if (margin < minimumMargin) return 'Low';
  if (margin < minimumMargin + 8) return 'Watch';
  return 'Healthy';
};

const getRecommendationBadgeClass = (recommendation: RcsRecommendation) => {
  switch (recommendation) {
    case 'Bring In-house':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Keep Outsourced':
      return 'bg-slate-50 text-slate-700 border-slate-200';
    case 'Outsource This Service':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Buy Equipment':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Assign Staff Operator':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Negotiate Vendor Rate':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Watch Margin':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const getMarginBadgeClass = (status: RcsMarginStatus) => {
  switch (status) {
    case 'Healthy':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Watch':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Low':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Negative':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'No Sales':
      return 'bg-slate-50 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

const getRiskBadgeClass = (risk: string) => {
  if (risk === 'High') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (risk === 'Medium') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
};

const getRecommendation = ({
  currentMode,
  marginStatus,
  soldQty,
  seasonVendorSpend,
  internalCost,
  estimatedInHouseCost,
  estimatedVendorCost,
  opportunitySaving,
  assetPaybackEvents,
  missingCost,
  missingVendorRate,
  vendorRateAboveBenchmark,
}: {
  currentMode: RcsCurrentMode;
  marginStatus: RcsMarginStatus;
  soldQty: number;
  seasonVendorSpend: number;
  internalCost: number;
  estimatedInHouseCost: number;
  estimatedVendorCost: number;
  opportunitySaving: number;
  assetPaybackEvents: number;
  missingCost: boolean;
  missingVendorRate: boolean;
  vendorRateAboveBenchmark: boolean;
}): RcsRecommendation => {
  if (soldQty <= 0) {
    if (vendorRateAboveBenchmark) {
      return 'Negotiate Vendor Rate';
    }
    if (missingCost || (currentMode !== 'In-house' && missingVendorRate)) {
      return 'Watch Margin';
    }
    return currentMode === 'Outsourced' ? 'Keep Outsourced' : 'Watch Margin';
  }

  if (missingCost || (currentMode !== 'In-house' && missingVendorRate)) {
    return 'Watch Margin';
  }

  if (currentMode === 'In-house') {
    if (estimatedVendorCost > 0 && internalCost > estimatedVendorCost * 1.05) {
      return 'Outsource This Service';
    }
    if (marginStatus === 'Negative' || marginStatus === 'Low') {
      return 'Watch Margin';
    }
    return 'Assign Staff Operator';
  }

  if (currentMode === 'Outsourced' || currentMode === 'Mixed') {
    if (vendorRateAboveBenchmark) {
      return 'Negotiate Vendor Rate';
    }
    if (estimatedInHouseCost > 0 && opportunitySaving > 0) {
      if (soldQty >= 4 && Number.isFinite(assetPaybackEvents) && assetPaybackEvents <= Math.max(soldQty, 4)) {
        return 'Buy Equipment';
      }
      if (seasonVendorSpend > 0 && opportunitySaving / seasonVendorSpend >= 0.22) {
        return 'Bring In-house';
      }
      if (seasonVendorSpend > 0 && opportunitySaving / seasonVendorSpend >= 0.1) {
        return 'Assign Staff Operator';
      }
    }

    if (marginStatus === 'Negative' || marginStatus === 'Low' || seasonVendorSpend > 0) {
      return 'Negotiate Vendor Rate';
    }

    return 'Keep Outsourced';
  }

  return marginStatus === 'Healthy' ? 'Keep Outsourced' : 'Watch Margin';
};

const estimateAssetCost = (vendorCostPerEvent: number, inHouseCostPerEvent: number) => {
  const base = Math.max(vendorCostPerEvent * 4, inHouseCostPerEvent * 7, 25000);
  return Math.ceil(base / 5000) * 5000;
};

const hasExistingRecord = <T extends { id: string }>(records: T[], draft: T) => records.some((record) => record.id === draft.id);

const buildEmptyCategory = (userName: string): SetupRcsCategory => ({
  id: createId('rcs-category'),
  code: '',
  name: '',
  description: '',
  targetMarginPercent: 30,
  defaultFulfillmentMode: 'in-house',
  showInReservation: true,
  isActive: true,
  createdAt: new Date(),
  createdBy: userName,
});

const buildEmptyService = (userName: string, defaultCategoryId?: string): SetupRcsService => ({
  id: createId('rcs-service'),
  categoryId: defaultCategoryId || '',
  serviceName: '',
  unitType: 'event',
  defaultSellingPrice: 0,
  fulfillmentType: 'in-house',
  internalCost: 0,
  vendorCost: 0,
  estimatedInHouseCost: 0,
  estimatedVendorCost: 0,
  assetRequired: false,
  assetPurchaseCost: 0,
  operatorRequired: false,
  suggestedOperatorCommission: 0,
  targetMarginPercent: 30,
  marketVendorRate: 0,
  showInReservation: true,
  autoCreateVendorPayable: true,
  autoCreateCommissionPayable: true,
  commissionRuleId: '',
  isActive: true,
  notes: '',
  createdAt: new Date(),
  createdBy: userName,
});

const buildEmptyVendor = (userName: string): SetupRcsVendor => ({
  id: createId('rcs-vendor'),
  vendorName: '',
  contactPerson: '',
  phone: '',
  city: '',
  vendorCategory: '',
  reliabilityRating: 3,
  qualityRating: 3,
  paymentTerms: '',
  vendorStatus: 'standard',
  notes: '',
  isActive: true,
  createdAt: new Date(),
  createdBy: userName,
});

const buildEmptyVendorRate = (userName: string, defaultServiceId?: string, defaultVendorId?: string): SetupRcsVendorRate => ({
  id: createId('rcs-rate'),
  serviceId: defaultServiceId || '',
  vendorId: defaultVendorId || '',
  vendorPrice: 0,
  sellingPrice: 0,
  effectiveFrom: '',
  effectiveTo: '',
  isSeasonRate: false,
  includesTransport: false,
  includesOperator: false,
  includesEquipment: false,
  marketBenchmarkRate: 0,
  negotiationStatus: 'not-started',
  isPreferred: true,
  isActive: true,
  notes: '',
  createdAt: new Date(),
  createdBy: userName,
});

const buildEmptyPackage = (userName: string): SetupRcsPackage => ({
  id: createId('rcs-package'),
  packageName: '',
  packageType: 'in-house',
  packageFulfillmentMode: 'in-house',
  useServiceCost: true,
  packageCostOverrideEnabled: false,
  packageCostOverride: 0,
  packageTargetMarginPercent: 30,
  approvalRequiredBelowMargin: true,
  categoryId: '',
  commissionRuleId: '',
  notes: '',
  lines: [],
  isActive: true,
  createdAt: new Date(),
  createdBy: userName,
});

const buildEmptyParticipant = (): SetupRcsCommissionParticipant => ({
  id: createId('rcs-share'),
  personName: '',
  role: '',
  commissionType: 'sales',
  shareType: 'percentage',
  shareValue: 0,
  isActive: true,
});

const buildEmptyCommissionRule = (userName: string): SetupRcsCommissionRule => ({
  id: createId('rcs-rule'),
  ruleName: '',
  appliesTo: 'all-rcs',
  targetId: '',
  participants: [buildEmptyParticipant()],
  isActive: true,
  createdAt: new Date(),
  createdBy: userName,
});

export function RcsSetup({ userName, bookings = [], serviceBookings = [] }: RcsSetupProps) {
  const [activeTab, setActiveTab] = useState<RcsSetupTab>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [venueFilter, setVenueFilter] = useState<OverviewFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<OverviewFilter>('all');
  const [modeFilter, setModeFilter] = useState<OverviewFilter>('all');
  const [recommendationFilter, setRecommendationFilter] = useState<OverviewFilter>('all');
  const [vendorFilter, setVendorFilter] = useState<OverviewFilter>('all');
  const [marginStatusFilter, setMarginStatusFilter] = useState<OverviewFilter>('all');
  const [dashboardActionMessage, setDashboardActionMessage] = useState('');
  const [commissionPreviewAmount, setCommissionPreviewAmount] = useState(85000);

  const [categories, setCategories] = useState<SetupRcsCategory[]>(() => {
    const loaded = loadSetupRcsCategories();
    return loaded.length > 0 ? loaded : defaultSetupRcsCategories;
  });
  const [services, setServices] = useState<SetupRcsService[]>(() => {
    const loaded = loadSetupRcsServices();
    return loaded.length > 0 ? loaded : defaultSetupRcsServices;
  });
  const [vendors, setVendors] = useState<SetupRcsVendor[]>(() => {
    const loaded = loadSetupRcsVendors();
    return loaded.length > 0 ? loaded : defaultSetupRcsVendors;
  });
  const [vendorRates, setVendorRates] = useState<SetupRcsVendorRate[]>(() => {
    const loaded = loadSetupRcsVendorRates();
    return loaded.length > 0 ? loaded : defaultSetupRcsVendorRates;
  });
  const [packages, setPackages] = useState<SetupRcsPackage[]>(() => {
    const loaded = loadSetupRcsPackages();
    return loaded.length > 0 ? loaded : defaultSetupRcsPackages;
  });
  const [commissionRules, setCommissionRules] = useState<SetupRcsCommissionRule[]>(() => {
    const loaded = loadSetupRcsCommissionRules();
    return loaded.length > 0 ? loaded : defaultSetupRcsCommissionRules;
  });
  const [approvalSettings, setApprovalSettings] = useState<SetupRcsApprovalSettings>(() => {
    return loadSetupRcsApprovalSettings() || defaultSetupRcsApprovalSettings;
  });

  const [categoryDraft, setCategoryDraft] = useState<SetupRcsCategory>(() => categories[0] ?? buildEmptyCategory(userName));
  const [serviceDraft, setServiceDraft] = useState<SetupRcsService>(() => services[0] ?? buildEmptyService(userName));
  const [vendorDraft, setVendorDraft] = useState<SetupRcsVendor>(() => vendors[0] ?? buildEmptyVendor(userName));
  const [vendorRateDraft, setVendorRateDraft] = useState<SetupRcsVendorRate>(() => vendorRates[0] ?? buildEmptyVendorRate(userName));
  const [packageDraft, setPackageDraft] = useState<SetupRcsPackage>(() => packages[0] ?? buildEmptyPackage(userName));
  const [commissionRuleDraft, setCommissionRuleDraft] = useState<SetupRcsCommissionRule>(() => commissionRules[0] ?? buildEmptyCommissionRule(userName));
  const [editModes, setEditModes] = useState<Record<EditableRcsSection, boolean>>({
    categories: false,
    services: false,
    vendors: false,
    'vendor-rates': false,
    packages: false,
    'commission-rules': false,
    'approval-settings': false,
  });

  const loadRcsSetupState = useCallback(() => {
    const nextCategories = (() => {
      const loaded = loadSetupRcsCategories();
      return loaded.length > 0 ? loaded : defaultSetupRcsCategories;
    })();
    const nextServices = (() => {
      const loaded = loadSetupRcsServices();
      return loaded.length > 0 ? loaded : defaultSetupRcsServices;
    })();
    const nextVendors = (() => {
      const loaded = loadSetupRcsVendors();
      return loaded.length > 0 ? loaded : defaultSetupRcsVendors;
    })();
    const nextVendorRates = (() => {
      const loaded = loadSetupRcsVendorRates();
      return loaded.length > 0 ? loaded : defaultSetupRcsVendorRates;
    })();
    const nextPackages = (() => {
      const loaded = loadSetupRcsPackages();
      return loaded.length > 0 ? loaded : defaultSetupRcsPackages;
    })();
    const nextCommissionRules = (() => {
      const loaded = loadSetupRcsCommissionRules();
      return loaded.length > 0 ? loaded : defaultSetupRcsCommissionRules;
    })();
    const nextApprovalSettings = loadSetupRcsApprovalSettings() || defaultSetupRcsApprovalSettings;

    const keepMatchingRecord = <T extends { id: string }>(
      current: T,
      records: T[],
      buildEmpty: () => T,
    ) => records.find((record) => record.id === current.id) ?? records[0] ?? buildEmpty();

    setCategories(nextCategories);
    setServices(nextServices);
    setVendors(nextVendors);
    setVendorRates(nextVendorRates);
    setPackages(nextPackages);
    setCommissionRules(nextCommissionRules);
    setApprovalSettings(nextApprovalSettings);
    setCategoryDraft((current) => keepMatchingRecord(current, nextCategories, () => buildEmptyCategory(userName)));
    setServiceDraft((current) => keepMatchingRecord(current, nextServices, () => buildEmptyService(userName)));
    setVendorDraft((current) => keepMatchingRecord(current, nextVendors, () => buildEmptyVendor(userName)));
    setVendorRateDraft((current) => keepMatchingRecord(current, nextVendorRates, () => buildEmptyVendorRate(userName)));
    setPackageDraft((current) => keepMatchingRecord(current, nextPackages, () => buildEmptyPackage(userName)));
    setCommissionRuleDraft((current) => keepMatchingRecord(current, nextCommissionRules, () => buildEmptyCommissionRule(userName)));
  }, [userName]);

  useEffect(() => {
    const isEditingAnySection = Object.values(editModes).some(Boolean);
    if (isEditingAnySection) {
      return;
    }

    const handleMasterDataUpdated = (event: Event) => {
      const key = String((event as CustomEvent<{ key?: string }>).detail?.key || '');
      if (!key || key === 'all' || key.includes('rcs')) {
        loadRcsSetupState();
      }
    };

    const handleStorageUpdated = (event: StorageEvent) => {
      if (!event.key || event.key.includes('rcs')) {
        loadRcsSetupState();
      }
    };

    window.addEventListener('masterDataUpdated', handleMasterDataUpdated);
    window.addEventListener('storage', handleStorageUpdated);

    return () => {
      window.removeEventListener('masterDataUpdated', handleMasterDataUpdated);
      window.removeEventListener('storage', handleStorageUpdated);
    };
  }, [editModes, loadRcsSetupState]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const setEditMode = (section: EditableRcsSection, isEditing: boolean) =>
    setEditModes((current) => ({
      ...current,
      [section]: isEditing,
    }));

  const isCategoryExisting = hasExistingRecord(categories, categoryDraft);
  const isServiceExisting = hasExistingRecord(services, serviceDraft);
  const isVendorExisting = hasExistingRecord(vendors, vendorDraft);
  const isVendorRateExisting = hasExistingRecord(vendorRates, vendorRateDraft);
  const isPackageExisting = hasExistingRecord(packages, packageDraft);
  const isCommissionRuleExisting = hasExistingRecord(commissionRules, commissionRuleDraft);

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const serviceMap = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);
  const serviceByNameMap = useMemo(
    () => new Map(services.map((service) => [service.serviceName.trim().toLowerCase(), service])),
    [services],
  );
  const vendorMap = useMemo(() => new Map(vendors.map((vendor) => [vendor.id, vendor])), [vendors]);
  const commissionRuleMap = useMemo(
    () => new Map(commissionRules.map((rule) => [rule.id, rule])),
    [commissionRules],
  );
  const preferredVendorRateMap = useMemo(() => {
    const map = new Map<string, SetupRcsVendorRate>();
    vendorRates
      .filter((rate) => rate.isActive)
      .sort((left, right) => Number(right.isPreferred) - Number(left.isPreferred))
      .forEach((rate) => {
        if (!map.has(rate.serviceId)) {
          map.set(rate.serviceId, rate);
        }
      });
    return map;
  }, [vendorRates]);
  const vendorBenchmarkRateMap = useMemo(() => {
    const map = new Map<string, SetupRcsVendorRate>();
    vendorRates
      .filter((rate) => rate.isActive && safeNumber(rate.vendorPrice) > 0)
      .sort((left, right) => safeNumber(left.vendorPrice) - safeNumber(right.vendorPrice))
      .forEach((rate) => {
        if (!map.has(rate.serviceId)) {
          map.set(rate.serviceId, rate);
        }
      });
    return map;
  }, [vendorRates]);

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          matchesStatus(category.isActive, statusFilter) &&
          [category.name, category.code, category.description, category.defaultFulfillmentMode]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedSearch)),
      ),
    [categories, normalizedSearch, statusFilter],
  );

  const filteredServices = useMemo(
    () =>
      services.filter(
        (service) =>
          matchesStatus(service.isActive, statusFilter) &&
          [
            service.serviceName,
            categoryMap.get(service.categoryId)?.name,
            service.fulfillmentType,
            service.showInReservation === false ? 'hidden from reservation' : 'reservation',
            service.notes,
          ]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedSearch)),
      ),
    [categoryMap, normalizedSearch, services, statusFilter],
  );

  const filteredVendors = useMemo(
    () =>
      vendors.filter(
        (vendor) =>
          matchesStatus(vendor.isActive, statusFilter) &&
          [vendor.vendorName, vendor.contactPerson, vendor.city, vendor.phone, vendor.vendorCategory, vendor.paymentTerms, vendor.vendorStatus]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedSearch)),
      ),
    [normalizedSearch, statusFilter, vendors],
  );

  const filteredVendorRates = useMemo(
    () =>
      vendorRates.filter((rate) => {
        if (!matchesStatus(rate.isActive, statusFilter)) return false;
        const service = serviceMap.get(rate.serviceId);
        const vendor = vendorMap.get(rate.vendorId);
        return [service?.serviceName, vendor?.vendorName, rate.negotiationStatus, rate.notes]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedSearch));
      }),
    [normalizedSearch, serviceMap, statusFilter, vendorMap, vendorRates],
  );

  const filteredPackages = useMemo(
    () =>
      packages.filter(
        (pkg) =>
          matchesStatus(pkg.isActive, statusFilter) &&
          [pkg.packageName, categoryMap.get(pkg.categoryId || '')?.name, pkg.packageFulfillmentMode || pkg.packageType, pkg.notes]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedSearch)),
      ),
    [categoryMap, normalizedSearch, packages, statusFilter],
  );

  const filteredCommissionRules = useMemo(
    () =>
      commissionRules.filter(
        (rule) =>
          matchesStatus(rule.isActive, statusFilter) &&
          [rule.ruleName, rule.appliesTo]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedSearch)),
      ),
    [commissionRules, normalizedSearch, statusFilter],
  );

  const soldLines = useMemo<SoldLine[]>(() => {
    const resolveCommissionRule = (service?: SetupRcsService) => {
      if (!service) return undefined;
      return (
        commissionRuleMap.get(service.commissionRuleId || '') ||
        commissionRules.find((rule) => rule.isActive && rule.appliesTo === 'service' && rule.targetId === service.id) ||
        commissionRules.find((rule) => rule.isActive && rule.appliesTo === 'category' && rule.targetId === service.categoryId) ||
        commissionRules.find((rule) => rule.isActive && rule.appliesTo === 'all-rcs')
      );
    };

    const reservationLines: SoldLine[] = bookings.flatMap((booking) => {
      const snapshot = booking.currentAgreementSnapshot || booking.signedAgreementSnapshot;
      const items = snapshot?.rcs?.items ?? [];
      return items.map((item) => {
        const service = item.masterServiceId ? serviceMap.get(item.masterServiceId) : serviceByNameMap.get(String(item.serviceName || '').trim().toLowerCase());
        const preferredRate = service ? preferredVendorRateMap.get(service.id) : undefined;
        const preferredVendor = preferredRate ? vendorMap.get(preferredRate.vendorId) : undefined;
        const itemSource = String(item.source || '').toLowerCase();
        const fulfillmentType: SetupRcsFulfillmentType = itemSource.includes('out')
          ? 'outsourced'
          : itemSource.includes('in')
            ? 'in-house'
            : service?.fulfillmentType || 'in-house';
        const quantity = safeNumber(item.quantity);
        const sellingRate = safeNumber(item.price);
        const totalRevenue = quantity * sellingRate;
        const unitCost =
          safeNumber(item.costRate) ||
          (service
            ? fulfillmentType === 'outsourced'
              ? safeNumber(preferredRate?.vendorPrice || service.vendorCost)
              : safeNumber(service.internalCost)
            : 0);
        const vendorCost = fulfillmentType === 'outsourced' ? quantity * unitCost : 0;
        const internalCost = fulfillmentType === 'in-house' ? quantity * unitCost : 0;
        const totalCost = vendorCost + internalCost;
        const grossProfit = totalRevenue - vendorCost - internalCost;
        const rule = resolveCommissionRule(service);
        const breakdown = computeRuleBreakdown(rule, grossProfit);
        return {
          source: 'reservation',
          date: toLocalDate((booking as any).date || (booking as any).eventDate || snapshot?.event?.date),
          serviceId: service?.id,
          categoryId: service?.categoryId,
          serviceName: String(item.serviceName || service?.serviceName || '').trim(),
          venueName:
            snapshot?.venue?.venueName ||
            (booking as any).venueName ||
            (booking as any).venue?.name ||
            'Venue Booking',
          vendorName: fulfillmentType === 'outsourced' ? String(item.vendorName || preferredVendor?.vendorName || 'Unassigned Vendor') : '',
          fulfillmentType,
          quantity,
          sellingRate,
          totalRevenue,
          vendorCost,
          internalCost,
          totalCost,
          grossProfit,
          commissionPayable: breakdown.staffCommission,
          salesCommission: breakdown.salesCommission,
          operatorCommission: breakdown.operatorCommission,
          directorShare: breakdown.directorShare,
          companyProfit: grossProfit - breakdown.totalCommission,
        };
      });
    });

    const outsideServiceLines: SoldLine[] = serviceBookings.flatMap((booking) => {
      const payload = (booking as any).sourcePayload || booking;
      const items = Array.isArray(payload?.rcsServices) ? payload.rcsServices : [];
      return items.map((item: any) => {
        const serviceName = String(item?.serviceType || item?.serviceName || '').trim();
        const service = serviceByNameMap.get(serviceName.toLowerCase());
        const preferredRate = service ? preferredVendorRateMap.get(service.id) : undefined;
        const preferredVendor = preferredRate ? vendorMap.get(preferredRate.vendorId) : undefined;
        const fulfillmentType = service?.fulfillmentType || 'outsourced';
        const quantity = safeNumber(item?.quantity);
        const sellingRate = safeNumber(item?.charges);
        const totalRevenue = safeNumber(item?.total) || quantity * sellingRate;
        const unitCost =
          safeNumber(item?.costRate) ||
          (service
            ? fulfillmentType === 'outsourced'
              ? safeNumber(preferredRate?.vendorPrice || service.vendorCost)
              : safeNumber(service.internalCost)
            : 0);
        const vendorCost = fulfillmentType === 'outsourced' ? quantity * unitCost : 0;
        const internalCost = fulfillmentType === 'in-house' ? quantity * unitCost : 0;
        const totalCost = vendorCost + internalCost;
        const grossProfit = totalRevenue - vendorCost - internalCost;
        const rule = resolveCommissionRule(service);
        const breakdown = computeRuleBreakdown(rule, grossProfit);
        return {
          source: 'outside-services',
          date: toLocalDate((booking as any).date || payload?.supplyDate),
          serviceId: service?.id,
          categoryId: service?.categoryId,
          serviceName,
          venueName: String(payload?.supplyCity || payload?.city || payload?.supplyLocation || 'Outside Services'),
          vendorName: fulfillmentType === 'outsourced' ? String(preferredVendor?.vendorName || 'Unassigned Vendor') : '',
          fulfillmentType,
          quantity,
          sellingRate,
          totalRevenue,
          vendorCost,
          internalCost,
          totalCost,
          grossProfit,
          commissionPayable: breakdown.staffCommission,
          salesCommission: breakdown.salesCommission,
          operatorCommission: breakdown.operatorCommission,
          directorShare: breakdown.directorShare,
          companyProfit: grossProfit - breakdown.totalCommission,
        };
      });
    });

    return [...reservationLines, ...outsideServiceLines].filter((line) => line.serviceName.trim());
  }, [bookings, commissionRuleMap, commissionRules, preferredVendorRateMap, serviceBookings, serviceByNameMap, serviceMap, vendorMap]);

  const dateFilteredSoldLines = useMemo(
    () => soldLines.filter((line) => isWithinDateFilter(line.date, dateFilter)),
    [dateFilter, soldLines],
  );

  const vendorSeasonSpendMap = useMemo(() => {
    const rows = new Map<string, { seasonSpend: number; services: Set<string> }>();
    dateFilteredSoldLines.forEach((line) => {
      if (!line.vendorName || line.vendorCost <= 0) return;
      const current = rows.get(line.vendorName) || { seasonSpend: 0, services: new Set<string>() };
      current.seasonSpend += line.vendorCost;
      current.services.add(line.serviceName);
      rows.set(line.vendorName, current);
    });
    return rows;
  }, [dateFilteredSoldLines]);

  const filteredSoldLines = useMemo(
    () =>
      dateFilteredSoldLines.filter((line) => {
        if (!normalizedSearch) return true;
        return [line.serviceName, line.vendorName, line.venueName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));
      }),
    [dateFilteredSoldLines, normalizedSearch],
  );

  const profitRows = useMemo(() => {
    const rows = new Map<
      string,
      {
        serviceName: string;
        quantity: number;
        revenue: number;
        cost: number;
        vendorCost: number;
        internalCost: number;
        grossProfit: number;
        commissionPayable: number;
        salesCommission: number;
        operatorCommission: number;
        directorShare: number;
        companyProfit: number;
      }
    >();

    filteredSoldLines.forEach((line) => {
      const current = rows.get(line.serviceName) || {
        serviceName: line.serviceName,
        quantity: 0,
        revenue: 0,
        cost: 0,
        vendorCost: 0,
        internalCost: 0,
        grossProfit: 0,
        commissionPayable: 0,
        salesCommission: 0,
        operatorCommission: 0,
        directorShare: 0,
        companyProfit: 0,
      };
      current.quantity += line.quantity;
      current.revenue += line.totalRevenue;
      current.cost += line.totalCost;
      current.vendorCost += line.vendorCost;
      current.internalCost += line.internalCost;
      current.grossProfit += line.grossProfit;
      current.commissionPayable += line.commissionPayable;
      current.salesCommission += line.salesCommission;
      current.operatorCommission += line.operatorCommission;
      current.directorShare += line.directorShare;
      current.companyProfit += line.companyProfit;
      rows.set(line.serviceName, current);
    });

    return Array.from(rows.values()).sort((left, right) => right.grossProfit - left.grossProfit);
  }, [filteredSoldLines]);

  const serviceDecisionRows = useMemo<ServiceDecisionRow[]>(() => {
    const linesByService = new Map<string, SoldLine[]>();
    dateFilteredSoldLines.forEach((line) => {
      const keys = [line.serviceId, line.serviceName.trim().toLowerCase()].filter(Boolean) as string[];
      keys.forEach((key) => {
        const current = linesByService.get(key) || [];
        current.push(line);
        linesByService.set(key, current);
      });
    });

    const activeAllRcsRule = commissionRules.find((rule) => rule.isActive && rule.appliesTo === 'all-rcs');

    return services
      .filter((service) => service.isActive)
      .map((service) => {
        const serviceLinesById = linesByService.get(service.id) || [];
        const serviceLinesByName = linesByService.get(service.serviceName.trim().toLowerCase()) || [];
        const lines = serviceLinesById.length > 0 ? serviceLinesById : serviceLinesByName;
        const preferredRate = preferredVendorRateMap.get(service.id);
        const benchmarkRate = vendorBenchmarkRateMap.get(service.id) || preferredRate;
        const preferredVendor = preferredRate ? vendorMap.get(preferredRate.vendorId) : undefined;
        const benchmarkVendor = benchmarkRate ? vendorMap.get(benchmarkRate.vendorId) : undefined;
        const category = categoryMap.get(service.categoryId);
        const configuredVendorCost = safeNumber(service.vendorCost);
        const setupEstimatedVendorCost = safeNumber(service.estimatedVendorCost);
        const setupMarketVendorRate = safeNumber(service.marketVendorRate);
        const benchmarkRateValue = safeNumber(benchmarkRate?.marketBenchmarkRate) || safeNumber(benchmarkRate?.vendorPrice);
        const preferredRateValue = safeNumber(preferredRate?.vendorPrice);
        const vendorBenchmarkPerEvent =
          setupEstimatedVendorCost || setupMarketVendorRate || benchmarkRateValue || preferredRateValue || configuredVendorCost;
        const configuredInternalCost = safeNumber(service.internalCost);
        const setupEstimatedInHouseCost = safeNumber(service.estimatedInHouseCost);
        const estimatedInHouseCostPerEvent =
          setupEstimatedInHouseCost > 0
            ? setupEstimatedInHouseCost
            : configuredInternalCost > 0
            ? configuredInternalCost
            : vendorBenchmarkPerEvent > 0
              ? Math.round(vendorBenchmarkPerEvent * 0.72)
              : 0;

        const soldQty = lines.reduce((sum, line) => sum + line.quantity, 0);
        const revenue = lines.reduce((sum, line) => sum + line.totalRevenue, 0);
        const vendorCost = lines.reduce((sum, line) => sum + line.vendorCost, 0);
        const internalCost = lines.reduce((sum, line) => sum + line.internalCost, 0);
        const staffCommission = lines.reduce((sum, line) => sum + line.commissionPayable, 0);
        const salesCommission = lines.reduce((sum, line) => sum + line.salesCommission, 0);
        const operatorCommission = lines.reduce((sum, line) => sum + line.operatorCommission, 0);
        const directorShare = lines.reduce((sum, line) => sum + line.directorShare, 0);
        const vendorQty = lines
          .filter((line) => line.fulfillmentType === 'outsourced')
          .reduce((sum, line) => sum + line.quantity, 0);

        const currentMode: RcsCurrentMode =
          vendorCost > 0 && internalCost > 0
            ? 'Mixed'
            : vendorCost > 0
              ? 'Outsourced'
              : internalCost > 0
                ? 'In-house'
                : safeNumber(service.vendorCost) > 0 && safeNumber(service.internalCost) > 0
                  ? 'Mixed'
                  : displayMode(service.fulfillmentType);

        const grossProfit = revenue - vendorCost - internalCost;
        const netCompanyProfit = grossProfit - staffCommission - directorShare;
        const marginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
        const targetMarginPercent =
          safeNumber(service.targetMarginPercent) || safeNumber(category?.targetMarginPercent) || approvalSettings.minimumGrossMarginPercent;
        const marginStatus = getMarginStatus(revenue, grossProfit, targetMarginPercent);
        const estimatedInHouseCost = soldQty > 0 && estimatedInHouseCostPerEvent > 0 ? estimatedInHouseCostPerEvent * soldQty : 0;
        const estimatedVendorCost = soldQty > 0 && vendorBenchmarkPerEvent > 0 ? vendorBenchmarkPerEvent * soldQty : 0;
        const currentCost = vendorCost + internalCost;
        const estimatedAlternativeCost =
          currentMode === 'In-house'
            ? estimatedVendorCost
            : currentMode === 'Outsourced'
              ? estimatedInHouseCost
              : Math.min(...[estimatedInHouseCost, estimatedVendorCost].filter((value) => value > 0));
        const opportunitySaving =
          currentCost > 0 && Number.isFinite(estimatedAlternativeCost) && estimatedAlternativeCost > 0
            ? currentCost - estimatedAlternativeCost
            : 0;
        const currentVendorCostPerEvent = vendorQty > 0 ? vendorCost / vendorQty : vendorBenchmarkPerEvent;
        const assetCost = safeNumber(service.assetPurchaseCost) || (
          currentVendorCostPerEvent > estimatedInHouseCostPerEvent && currentVendorCostPerEvent > 0
            ? estimateAssetCost(currentVendorCostPerEvent, estimatedInHouseCostPerEvent)
            : 0
        );
        const paybackEvents =
          assetCost > 0 && currentVendorCostPerEvent > estimatedInHouseCostPerEvent
            ? assetCost / Math.max(currentVendorCostPerEvent - estimatedInHouseCostPerEvent, 1)
            : Infinity;
        const vendorSpendByName = new Map<string, number>();
        lines.forEach((line) => {
          if (!line.vendorName || line.vendorCost <= 0) return;
          vendorSpendByName.set(line.vendorName, (vendorSpendByName.get(line.vendorName) || 0) + line.vendorCost);
        });
        const topVendorName =
          Array.from(vendorSpendByName.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ||
          preferredVendor?.vendorName ||
          benchmarkVendor?.vendorName ||
          '';
        const missingCost =
          service.fulfillmentType === 'in-house'
            ? configuredInternalCost <= 0
            : vendorBenchmarkPerEvent <= 0 && safeNumber(service.vendorCost) <= 0;
        const missingVendorRate = service.fulfillmentType === 'outsourced' && !benchmarkRate;
        const vendorRateAboveBenchmark =
          safeNumber(preferredRate?.marketBenchmarkRate || service.marketVendorRate) > 0 &&
          safeNumber(preferredRate?.vendorPrice || service.vendorCost) > safeNumber(preferredRate?.marketBenchmarkRate || service.marketVendorRate) * 1.05;
        const missingCommissionRule =
          !service.commissionRuleId &&
          !commissionRules.some((rule) => rule.isActive && rule.appliesTo === 'service' && rule.targetId === service.id) &&
          !commissionRules.some((rule) => rule.isActive && rule.appliesTo === 'category' && rule.targetId === service.categoryId) &&
          !activeAllRcsRule;

        const recommendation = getRecommendation({
          currentMode,
          marginStatus,
          soldQty,
          seasonVendorSpend: vendorCost,
          internalCost,
          estimatedInHouseCost,
          estimatedVendorCost,
          opportunitySaving,
          assetPaybackEvents: paybackEvents,
          missingCost,
          missingVendorRate,
          vendorRateAboveBenchmark,
        });
        const suggestedStaffShare =
          safeNumber(service.suggestedOperatorCommission) > 0
            ? safeNumber(service.suggestedOperatorCommission) * Math.max(soldQty, 1)
            : opportunitySaving > 0
              ? Math.round(opportunitySaving * 0.3)
              : 0;

        return {
          id: service.id,
          service,
          serviceName: service.serviceName,
          categoryId: service.categoryId,
          categoryName: categoryMap.get(service.categoryId)?.name || 'Uncategorized',
          currentMode,
          soldQty,
          revenue,
          vendorCost,
          internalCost,
          grossProfit,
          staffCommission,
          salesCommission,
          operatorCommission,
          directorShare,
          netCompanyProfit,
          marginPercent,
          marginStatus,
          seasonVendorSpend: vendorCost,
          estimatedInHouseCost,
          estimatedVendorCost,
          opportunitySaving,
          recommendation,
          vendorName: topVendorName,
          venueNames: Array.from(new Set(lines.map((line) => line.venueName).filter(Boolean))),
          currentVendorCostPerEvent,
          estimatedInHouseCostPerEvent,
          vendorBenchmarkPerEvent,
          assetCost,
          paybackEvents,
          suggestedStaffShare,
          companySavingAfterStaffShare: Math.max(opportunitySaving - suggestedStaffShare, 0),
          missingCost,
          missingVendorRate,
          missingCommissionRule,
        };
      })
      .sort((left, right) => right.opportunitySaving - left.opportunitySaving || right.revenue - left.revenue);
  }, [
    approvalSettings.minimumGrossMarginPercent,
    categoryMap,
    commissionRules,
    dateFilteredSoldLines,
    preferredVendorRateMap,
    services,
    vendorBenchmarkRateMap,
    vendorMap,
  ]);

  const overviewFilterOptions = useMemo(() => {
    const venues = Array.from(new Set(serviceDecisionRows.flatMap((row) => row.venueNames))).filter(Boolean).sort();
    const rowVendors = serviceDecisionRows.map((row) => row.vendorName).filter(Boolean);
    const vendorsFromSetup = vendors.filter((vendor) => vendor.isActive).map((vendor) => vendor.vendorName);
    return {
      venues,
      vendors: Array.from(new Set([...rowVendors, ...vendorsFromSetup])).filter(Boolean).sort(),
    };
  }, [serviceDecisionRows, vendors]);

  const filteredServiceDecisionRows = useMemo(() => {
    return serviceDecisionRows.filter((row) => {
      if (normalizedSearch) {
        const matchesSearch = [
          row.serviceName,
          row.categoryName,
          row.currentMode,
          row.recommendation,
          row.vendorName,
          ...row.venueNames,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));
        if (!matchesSearch) return false;
      }
      if (venueFilter !== 'all' && !row.venueNames.includes(venueFilter)) return false;
      if (categoryFilter !== 'all' && row.categoryId !== categoryFilter) return false;
      if (modeFilter !== 'all' && row.currentMode !== modeFilter) return false;
      if (recommendationFilter !== 'all' && row.recommendation !== recommendationFilter) return false;
      if (vendorFilter !== 'all' && row.vendorName !== vendorFilter) return false;
      if (marginStatusFilter !== 'all' && row.marginStatus !== marginStatusFilter) return false;
      return true;
    });
  }, [
    categoryFilter,
    marginStatusFilter,
    modeFilter,
    normalizedSearch,
    recommendationFilter,
    serviceDecisionRows,
    vendorFilter,
    venueFilter,
  ]);

  const profitReportRows = useMemo(
    () =>
      serviceDecisionRows.filter((row) => {
        const hasActivity = row.soldQty > 0 || row.revenue > 0 || row.vendorCost > 0 || row.internalCost > 0;
        if (!hasActivity) return false;
        if (!normalizedSearch) return true;
        return [row.serviceName, row.categoryName, row.currentMode, row.recommendation, row.vendorName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));
      }),
    [normalizedSearch, serviceDecisionRows],
  );

  const dashboardSummary = useMemo(() => {
    const revenue = filteredServiceDecisionRows.reduce((sum, row) => sum + row.revenue, 0);
    const vendorSpend = filteredServiceDecisionRows.reduce((sum, row) => sum + row.vendorCost, 0);
    const inHouseCost = filteredServiceDecisionRows.reduce((sum, row) => sum + row.internalCost, 0);
    const grossProfit = filteredServiceDecisionRows.reduce((sum, row) => sum + row.grossProfit, 0);
    const netCompanyProfit = filteredServiceDecisionRows.reduce((sum, row) => sum + row.netCompanyProfit, 0);
    const opportunitySaving = filteredServiceDecisionRows.reduce((sum, row) => sum + Math.max(row.opportunitySaving, 0), 0);
    return {
      revenue,
      vendorSpend,
      inHouseCost,
      grossProfit,
      netCompanyProfit,
      averageMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
      opportunitySaving,
    };
  }, [filteredServiceDecisionRows]);

  const decisionCounts = useMemo(
    () => ({
      bringInHouse: filteredServiceDecisionRows.filter((row) => row.recommendation === 'Bring In-house').length,
      outsource: filteredServiceDecisionRows.filter((row) => row.recommendation === 'Outsource This Service').length,
      negotiate: filteredServiceDecisionRows.filter((row) => row.recommendation === 'Negotiate Vendor Rate').length,
      buyEquipment: filteredServiceDecisionRows.filter((row) => row.recommendation === 'Buy Equipment').length,
      staffOperator: filteredServiceDecisionRows.filter((row) => row.recommendation === 'Assign Staff Operator').length,
      lowMargin: filteredServiceDecisionRows.filter((row) => row.marginStatus === 'Low' || row.marginStatus === 'Negative').length,
    }),
    [filteredServiceDecisionRows],
  );

  const topVendorLeakage = useMemo(() => {
    const totalSpend = filteredServiceDecisionRows.reduce((sum, row) => sum + row.seasonVendorSpend, 0);
    const rows = new Map<string, { vendor: string; seasonSpend: number; services: Set<string>; riskLevel: 'Low' | 'Medium' | 'High' }>();
    filteredServiceDecisionRows.forEach((row) => {
      if (!row.vendorName || row.seasonVendorSpend <= 0) return;
      const current = rows.get(row.vendorName) || {
        vendor: row.vendorName,
        seasonSpend: 0,
        services: new Set<string>(),
        riskLevel: 'Low' as const,
      };
      current.seasonSpend += row.seasonVendorSpend;
      current.services.add(row.serviceName);
      rows.set(row.vendorName, current);
    });
    return Array.from(rows.values())
      .map((row) => ({
        ...row,
        riskLevel:
          row.seasonSpend >= totalSpend * 0.4 || row.services.size >= 3
            ? 'High'
            : row.seasonSpend >= totalSpend * 0.2 || row.services.size >= 2
              ? 'Medium'
              : 'Low',
      }))
      .sort((left, right) => right.seasonSpend - left.seasonSpend)
      .slice(0, 4);
  }, [filteredServiceDecisionRows]);

  const topInHouseOpportunities = useMemo(
    () =>
      filteredServiceDecisionRows
        .filter((row) => ['Bring In-house', 'Buy Equipment', 'Assign Staff Operator'].includes(row.recommendation) && row.opportunitySaving > 0)
        .sort((left, right) => right.opportunitySaving - left.opportunitySaving)
        .slice(0, 4),
    [filteredServiceDecisionRows],
  );

  const outsourceRecommendations = useMemo(
    () =>
      filteredServiceDecisionRows
        .filter((row) => row.recommendation === 'Outsource This Service')
        .sort((left, right) => right.opportunitySaving - left.opportunitySaving)
        .slice(0, 4),
    [filteredServiceDecisionRows],
  );

  const setupHealth = useMemo(() => {
    const activeServices = services.filter((service) => service.isActive);
    const missingCost = activeServices.filter((service) => {
      const hasInternalCost = safeNumber(service.internalCost) > 0 || safeNumber(service.estimatedInHouseCost) > 0;
      const hasVendorCost =
        safeNumber(service.vendorCost) > 0 ||
        safeNumber(service.estimatedVendorCost) > 0 ||
        safeNumber(service.marketVendorRate) > 0 ||
        vendorBenchmarkRateMap.has(service.id);
      return service.fulfillmentType === 'in-house' ? !hasInternalCost : !hasVendorCost;
    }).length;
    const missingVendorRate = activeServices.filter(
      (service) =>
        service.fulfillmentType === 'outsourced' &&
        !vendorBenchmarkRateMap.has(service.id) &&
        safeNumber(service.estimatedVendorCost) <= 0 &&
        safeNumber(service.marketVendorRate) <= 0,
    ).length;
    const activeAllRcsRule = commissionRules.some((rule) => rule.isActive && rule.appliesTo === 'all-rcs');
    const missingCommissionRule = activeServices.filter(
      (service) =>
        !service.commissionRuleId &&
        !commissionRules.some((rule) => rule.isActive && rule.appliesTo === 'service' && rule.targetId === service.id) &&
        !commissionRules.some((rule) => rule.isActive && rule.appliesTo === 'category' && rule.targetId === service.categoryId) &&
        !activeAllRcsRule,
    ).length;
    const approvalRequired =
      approvalSettings.requireApprovalBelowMargin
        ? filteredServiceDecisionRows.filter((row) => row.revenue > 0 && row.marginPercent < approvalSettings.minimumGrossMarginPercent).length
        : 0;

    return {
      missingCost,
      missingVendorRate,
      missingCommissionRule,
      hiddenFromReservation: activeServices.filter((service) => service.showInReservation === false).length,
      approvalRequired,
      totalCategories: categories.filter((category) => category.isActive).length,
      totalActiveServices: activeServices.length,
      activeVendors: vendors.filter((vendor) => vendor.isActive).length,
      packages: packages.filter((pkg) => pkg.isActive).length,
    };
  }, [
    approvalSettings.minimumGrossMarginPercent,
    approvalSettings.requireApprovalBelowMargin,
    categories,
    commissionRules,
    filteredServiceDecisionRows,
    packages,
    services,
    vendorBenchmarkRateMap,
    vendors,
  ]);

  const assetPaybackRows = useMemo(
    () =>
      filteredServiceDecisionRows
        .filter(
          (row) =>
            row.soldQty > 0 &&
            row.seasonVendorSpend > 0 &&
            row.assetCost > 0 &&
            Number.isFinite(row.paybackEvents) &&
            row.currentVendorCostPerEvent > row.estimatedInHouseCostPerEvent,
        )
        .sort((left, right) => left.paybackEvents - right.paybackEvents)
        .slice(0, 5),
    [filteredServiceDecisionRows],
  );

  const staffOperatorRows = useMemo(
    () =>
      filteredServiceDecisionRows
        .filter((row) => row.opportunitySaving > 0 && row.suggestedStaffShare > 0)
        .sort((left, right) => right.companySavingAfterStaffShare - left.companySavingAfterStaffShare)
        .slice(0, 5),
    [filteredServiceDecisionRows],
  );

  const selectedVendorSeasonSpend = vendorSeasonSpendMap.get(vendorDraft.vendorName);

  const selectedRuleForPreview = useMemo(
    () => commissionRules.find((rule) => rule.id === (serviceDraft.commissionRuleId || packageDraft.commissionRuleId)) || commissionRuleDraft,
    [commissionRuleDraft, commissionRules, packageDraft.commissionRuleId, serviceDraft.commissionRuleId],
  );

  const previewCost =
    activeTab === 'packages'
      ? computePackageTotals(packageDraft).cost
      : serviceDraft.fulfillmentType === 'outsourced'
        ? safeNumber(serviceDraft.vendorCost)
        : safeNumber(serviceDraft.internalCost);
  const previewSellingPrice =
    activeTab === 'packages'
      ? computePackageTotals(packageDraft).sellingPrice
      : safeNumber(serviceDraft.defaultSellingPrice);
  const previewGrossProfit =
    activeTab === 'packages'
      ? computePackageTotals(packageDraft).grossProfit
      : previewSellingPrice - previewCost;
  const previewBreakdown = computeRuleBreakdown(selectedRuleForPreview, previewGrossProfit || commissionPreviewAmount);

  const persistCategories = (next: SetupRcsCategory[]) => {
    setCategories(next);
    saveSetupRcsCategories(next);
  };

  const persistServices = (next: SetupRcsService[]) => {
    setServices(next);
    saveSetupRcsServices(next);
  };

  const persistVendors = (next: SetupRcsVendor[]) => {
    setVendors(next);
    saveSetupRcsVendors(next);
  };

  const persistVendorRates = (next: SetupRcsVendorRate[]) => {
    setVendorRates(next);
    saveSetupRcsVendorRates(next);
  };

  const persistPackages = (next: SetupRcsPackage[]) => {
    setPackages(next);
    saveSetupRcsPackages(next);
  };

  const persistCommissionRules = (next: SetupRcsCommissionRule[]) => {
    setCommissionRules(next);
    saveSetupRcsCommissionRules(next);
  };

  const blockReferencedDelete = (recordLabel: string, referenceLabel: string) => {
    window.alert(`${recordLabel} is used by ${referenceLabel}. Deactivate it instead of deleting to preserve setup and reservation history.`);
  };

  const handleSaveCategory = () => {
    if (!categoryDraft.name.trim()) return;
    const nextCategory = {
      ...categoryDraft,
      code: categoryDraft.code.trim() || slugify(categoryDraft.name).toUpperCase().slice(0, 10),
      targetMarginPercent: safeNumber(categoryDraft.targetMarginPercent),
      defaultFulfillmentMode: categoryDraft.defaultFulfillmentMode || 'in-house',
      showInReservation: categoryDraft.showInReservation !== false,
      updatedAt: new Date(),
      updatedBy: userName,
    };
    const exists = categories.some((category) => category.id === nextCategory.id);
    const nextCategories = exists
      ? categories.map((category) => (category.id === nextCategory.id ? nextCategory : category))
      : [...categories, nextCategory];
    persistCategories(nextCategories);
    setCategoryDraft(nextCategory);
    setEditMode('categories', false);
  };

  const handleDeleteCategory = () => {
    if (services.some((service) => service.categoryId === categoryDraft.id)) {
      blockReferencedDelete('This RCS category', 'RCS services');
      return;
    }

    if (packages.some((pkg) => pkg.categoryId === categoryDraft.id)) {
      blockReferencedDelete('This RCS category', 'RCS packages');
      return;
    }

    if (commissionRules.some((rule) => rule.appliesTo === 'category' && rule.targetId === categoryDraft.id)) {
      blockReferencedDelete('This RCS category', 'commission rules');
      return;
    }

    const nextCategories = categories.filter((category) => category.id !== categoryDraft.id);
    persistCategories(nextCategories);
    if (nextCategories[0]) {
      setCategoryDraft(nextCategories[0]);
      setEditMode('categories', false);
      return;
    }
    setCategoryDraft(buildEmptyCategory(userName));
    setEditMode('categories', true);
  };

  const handleCancelCategoryEdit = () => {
    const nextCategory = categories.find((category) => category.id === categoryDraft.id) ?? categories[0];
    if (nextCategory) {
      setCategoryDraft(nextCategory);
      setEditMode('categories', false);
      return;
    }
    setCategoryDraft(buildEmptyCategory(userName));
    setEditMode('categories', true);
  };

  const handleSaveService = () => {
    if (!serviceDraft.serviceName.trim() || !serviceDraft.categoryId) return;
    const nextService = {
      ...serviceDraft,
      updatedAt: new Date(),
      updatedBy: userName,
      internalCost: serviceDraft.fulfillmentType === 'in-house' ? safeNumber(serviceDraft.internalCost) : 0,
      vendorCost: serviceDraft.fulfillmentType === 'outsourced' ? safeNumber(serviceDraft.vendorCost) : 0,
      estimatedInHouseCost: safeNumber(serviceDraft.estimatedInHouseCost),
      estimatedVendorCost: safeNumber(serviceDraft.estimatedVendorCost),
      assetRequired: Boolean(serviceDraft.assetRequired),
      assetPurchaseCost: safeNumber(serviceDraft.assetPurchaseCost),
      operatorRequired: Boolean(serviceDraft.operatorRequired),
      suggestedOperatorCommission: safeNumber(serviceDraft.suggestedOperatorCommission),
      targetMarginPercent: safeNumber(serviceDraft.targetMarginPercent),
      marketVendorRate: safeNumber(serviceDraft.marketVendorRate),
      showInReservation: serviceDraft.showInReservation !== false,
      autoCreateVendorPayable: serviceDraft.autoCreateVendorPayable !== false,
      autoCreateCommissionPayable: serviceDraft.autoCreateCommissionPayable !== false,
    };
    const exists = services.some((service) => service.id === nextService.id);
    const nextServices = exists
      ? services.map((service) => (service.id === nextService.id ? nextService : service))
      : [...services, nextService];
    persistServices(nextServices);
    setServiceDraft(nextService);
    setEditMode('services', false);
  };

  const handleDeleteService = () => {
    if (vendorRates.some((rate) => rate.serviceId === serviceDraft.id)) {
      blockReferencedDelete('This RCS service', 'vendor rates');
      return;
    }

    if (packages.some((pkg) => pkg.lines.some((line) => line.serviceId === serviceDraft.id))) {
      blockReferencedDelete('This RCS service', 'RCS packages');
      return;
    }

    if (commissionRules.some((rule) => rule.appliesTo === 'service' && rule.targetId === serviceDraft.id)) {
      blockReferencedDelete('This RCS service', 'commission rules');
      return;
    }

    const nextServices = services.filter((service) => service.id !== serviceDraft.id);
    persistServices(nextServices);
    if (nextServices[0]) {
      setServiceDraft(nextServices[0]);
      setEditMode('services', false);
      return;
    }
    setServiceDraft(buildEmptyService(userName, categories[0]?.id));
    setEditMode('services', true);
  };

  const handleCancelServiceEdit = () => {
    const nextService = services.find((service) => service.id === serviceDraft.id) ?? services[0];
    if (nextService) {
      setServiceDraft(nextService);
      setEditMode('services', false);
      return;
    }
    setServiceDraft(buildEmptyService(userName, categories[0]?.id));
    setEditMode('services', true);
  };

  const handleSaveVendor = () => {
    if (!vendorDraft.vendorName.trim()) return;
    const nextVendor = {
      ...vendorDraft,
      reliabilityRating: safeNumber(vendorDraft.reliabilityRating),
      qualityRating: safeNumber(vendorDraft.qualityRating),
      vendorStatus: vendorDraft.vendorStatus || 'standard',
      updatedAt: new Date(),
      updatedBy: userName,
    };
    const exists = vendors.some((vendor) => vendor.id === nextVendor.id);
    const nextVendors = exists
      ? vendors.map((vendor) => (vendor.id === nextVendor.id ? nextVendor : vendor))
      : [...vendors, nextVendor];
    persistVendors(nextVendors);
    setVendorDraft(nextVendor);
    setEditMode('vendors', false);
  };

  const handleDeleteVendor = () => {
    if (vendorRates.some((rate) => rate.vendorId === vendorDraft.id)) {
      blockReferencedDelete('This RCS vendor', 'vendor rates');
      return;
    }

    const nextVendors = vendors.filter((vendor) => vendor.id !== vendorDraft.id);
    persistVendors(nextVendors);
    if (nextVendors[0]) {
      setVendorDraft(nextVendors[0]);
      setEditMode('vendors', false);
      return;
    }
    setVendorDraft(buildEmptyVendor(userName));
    setEditMode('vendors', true);
  };

  const handleCancelVendorEdit = () => {
    const nextVendor = vendors.find((vendor) => vendor.id === vendorDraft.id) ?? vendors[0];
    if (nextVendor) {
      setVendorDraft(nextVendor);
      setEditMode('vendors', false);
      return;
    }
    setVendorDraft(buildEmptyVendor(userName));
    setEditMode('vendors', true);
  };

  const handleSaveVendorRate = () => {
    if (!vendorRateDraft.serviceId || !vendorRateDraft.vendorId) return;
    const nextRate = {
      ...vendorRateDraft,
      vendorPrice: safeNumber(vendorRateDraft.vendorPrice),
      sellingPrice: safeNumber(vendorRateDraft.sellingPrice),
      marketBenchmarkRate: safeNumber(vendorRateDraft.marketBenchmarkRate),
      isSeasonRate: Boolean(vendorRateDraft.isSeasonRate),
      includesTransport: Boolean(vendorRateDraft.includesTransport),
      includesOperator: Boolean(vendorRateDraft.includesOperator),
      includesEquipment: Boolean(vendorRateDraft.includesEquipment),
      negotiationStatus: vendorRateDraft.negotiationStatus || 'not-started',
      updatedAt: new Date(),
      updatedBy: userName,
    };
    let nextRates = vendorRates.some((rate) => rate.id === nextRate.id)
      ? vendorRates.map((rate) => (rate.id === nextRate.id ? nextRate : rate))
      : [...vendorRates, nextRate];

    if (nextRate.isPreferred) {
      nextRates = nextRates.map((rate) =>
        rate.serviceId === nextRate.serviceId && rate.id !== nextRate.id ? { ...rate, isPreferred: false } : rate,
      );
    }

    persistVendorRates(nextRates);
    setVendorRateDraft(nextRate);
    setEditMode('vendor-rates', false);
  };

  const handleDeleteVendorRate = () => {
    if (commissionRules.some((rule) => rule.appliesTo === 'vendor-rate' && rule.targetId === vendorRateDraft.id)) {
      blockReferencedDelete('This vendor rate', 'commission rules');
      return;
    }

    const nextRates = vendorRates.filter((rate) => rate.id !== vendorRateDraft.id);
    persistVendorRates(nextRates);
    if (nextRates[0]) {
      setVendorRateDraft(nextRates[0]);
      setEditMode('vendor-rates', false);
      return;
    }
    setVendorRateDraft(buildEmptyVendorRate(userName, services[0]?.id, vendors[0]?.id));
    setEditMode('vendor-rates', true);
  };

  const handleCancelVendorRateEdit = () => {
    const nextRate = vendorRates.find((rate) => rate.id === vendorRateDraft.id) ?? vendorRates[0];
    if (nextRate) {
      setVendorRateDraft(nextRate);
      setEditMode('vendor-rates', false);
      return;
    }
    setVendorRateDraft(buildEmptyVendorRate(userName, services[0]?.id, vendors[0]?.id));
    setEditMode('vendor-rates', true);
  };

  const handleSavePackage = () => {
    if (!packageDraft.packageName.trim()) return;
    const nextPackage = {
      ...packageDraft,
      packageType: packageDraft.packageFulfillmentMode || packageDraft.packageType,
      packageFulfillmentMode: packageDraft.packageFulfillmentMode || packageDraft.packageType,
      useServiceCost: packageDraft.useServiceCost !== false,
      packageCostOverrideEnabled: Boolean(packageDraft.packageCostOverrideEnabled),
      packageCostOverride: safeNumber(packageDraft.packageCostOverride),
      packageTargetMarginPercent: safeNumber(packageDraft.packageTargetMarginPercent),
      approvalRequiredBelowMargin: packageDraft.approvalRequiredBelowMargin !== false,
      updatedAt: new Date(),
      updatedBy: userName,
    };
    const exists = packages.some((pkg) => pkg.id === nextPackage.id);
    const nextPackages = exists
      ? packages.map((pkg) => (pkg.id === nextPackage.id ? nextPackage : pkg))
      : [...packages, nextPackage];
    persistPackages(nextPackages);
    setPackageDraft(nextPackage);
    setEditMode('packages', false);
  };

  const handleDeletePackage = () => {
    if (commissionRules.some((rule) => rule.appliesTo === 'package' && rule.targetId === packageDraft.id)) {
      blockReferencedDelete('This RCS package', 'commission rules');
      return;
    }

    const nextPackages = packages.filter((pkg) => pkg.id !== packageDraft.id);
    persistPackages(nextPackages);
    if (nextPackages[0]) {
      setPackageDraft(nextPackages[0]);
      setEditMode('packages', false);
      return;
    }
    setPackageDraft(buildEmptyPackage(userName));
    setEditMode('packages', true);
  };

  const handleCancelPackageEdit = () => {
    const nextPackage = packages.find((pkg) => pkg.id === packageDraft.id) ?? packages[0];
    if (nextPackage) {
      setPackageDraft(nextPackage);
      setEditMode('packages', false);
      return;
    }
    setPackageDraft(buildEmptyPackage(userName));
    setEditMode('packages', true);
  };

  const handleSaveCommissionRule = () => {
    if (!commissionRuleDraft.ruleName.trim()) return;
    const nextRule = {
      ...commissionRuleDraft,
      participants: commissionRuleDraft.participants
        .filter((participant) => participant.personName.trim() || participant.role.trim())
        .map((participant) => ({
          ...participant,
          commissionType: participant.shareType === 'auto-remaining' ? 'company' : getCommissionType(participant),
          shareValue: safeNumber(participant.shareValue),
        })),
      updatedAt: new Date(),
      updatedBy: userName,
    };
    const exists = commissionRules.some((rule) => rule.id === nextRule.id);
    const nextRules = exists
      ? commissionRules.map((rule) => (rule.id === nextRule.id ? nextRule : rule))
      : [...commissionRules, nextRule];
    persistCommissionRules(nextRules);
    setCommissionRuleDraft(nextRule);
    setEditMode('commission-rules', false);
  };

  const handleDeleteCommissionRule = () => {
    const nextRules = commissionRules.filter((rule) => rule.id !== commissionRuleDraft.id);
    persistCommissionRules(nextRules);
    if (nextRules[0]) {
      setCommissionRuleDraft(nextRules[0]);
      setEditMode('commission-rules', false);
      return;
    }
    setCommissionRuleDraft(buildEmptyCommissionRule(userName));
    setEditMode('commission-rules', true);
  };

  const handleCancelCommissionRuleEdit = () => {
    const nextRule = commissionRules.find((rule) => rule.id === commissionRuleDraft.id) ?? commissionRules[0];
    if (nextRule) {
      setCommissionRuleDraft(nextRule);
      setEditMode('commission-rules', false);
      return;
    }
    setCommissionRuleDraft(buildEmptyCommissionRule(userName));
    setEditMode('commission-rules', true);
  };

  const handleSaveApprovalSettings = () => {
    const nextSettings = {
      ...approvalSettings,
      minimumGrossMarginPercent: safeNumber(approvalSettings.minimumGrossMarginPercent),
      requireApprovalForInHouseConversion: approvalSettings.requireApprovalForInHouseConversion !== false,
      requireApprovalForOutsourceConversion: approvalSettings.requireApprovalForOutsourceConversion !== false,
      requireApprovalForAssetPurchaseProposal: approvalSettings.requireApprovalForAssetPurchaseProposal !== false,
      requireApprovalForVendorRateAboveBenchmark: approvalSettings.requireApprovalForVendorRateAboveBenchmark !== false,
      vendorPayableDueDays: safeNumber(approvalSettings.vendorPayableDueDays),
      staffCommissionDueDays: safeNumber(approvalSettings.staffCommissionDueDays),
      directorShareDueDays: safeNumber(approvalSettings.directorShareDueDays),
      updatedAt: new Date(),
      updatedBy: userName,
    };
    setApprovalSettings(nextSettings);
    saveSetupRcsApprovalSettings(nextSettings);
    setEditMode('approval-settings', false);
  };

  const handleCancelApprovalSettingsEdit = () => {
    setApprovalSettings(loadSetupRcsApprovalSettings() || defaultSetupRcsApprovalSettings);
    setEditMode('approval-settings', false);
  };

  const handleDashboardAction = (row: ServiceDecisionRow, action: DashboardAction) => {
    const actionLabel = dashboardActionOptions.find((option) => option.value === action)?.label || 'Action';
    if (action === 'open-service-setup' && row.service) {
      setServiceDraft(row.service);
      setEditMode('services', false);
      setActiveTab('services');
      return;
    }
    setDashboardActionMessage(`${actionLabel}: ${row.serviceName}`);
  };

  const renderStatusBadge = (label: string, className: string) => (
    <span className={`inline-flex w-fit items-center rounded border px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {label}
    </span>
  );

  const renderKpiStrip = () => (
    <div className="grid gap-2 lg:grid-cols-7">
      {[
        { label: 'RCS Revenue', value: formatCompactCurrency(dashboardSummary.revenue), tone: 'text-blue-700' },
        { label: 'Vendor Spend', value: formatCompactCurrency(dashboardSummary.vendorSpend), tone: 'text-amber-700' },
        { label: 'In-house Cost', value: formatCompactCurrency(dashboardSummary.inHouseCost), tone: 'text-slate-700' },
        { label: 'Gross Profit', value: formatCompactCurrency(dashboardSummary.grossProfit), tone: dashboardSummary.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700' },
        { label: 'Net Company Profit', value: formatCompactCurrency(dashboardSummary.netCompanyProfit), tone: dashboardSummary.netCompanyProfit >= 0 ? 'text-blue-800' : 'text-rose-700' },
        { label: 'Average Margin %', value: formatPercent(dashboardSummary.averageMargin), tone: dashboardSummary.averageMargin >= approvalSettings.minimumGrossMarginPercent ? 'text-emerald-700' : 'text-orange-700' },
        { label: 'Opportunity Saving', value: formatCompactCurrency(dashboardSummary.opportunitySaving), tone: 'text-indigo-700' },
      ].map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</div>
          <div className={`mt-1 text-base font-semibold ${item.tone}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );

  const renderDecisionCards = () => (
    <div className="grid gap-2 lg:grid-cols-6">
      {[
        { label: 'Bring In-house Candidates', value: decisionCounts.bringInHouse, tone: 'text-blue-700' },
        { label: 'Outsource Candidates', value: decisionCounts.outsource, tone: 'text-rose-700' },
        { label: 'Negotiate Vendor Rates', value: decisionCounts.negotiate, tone: 'text-amber-700' },
        { label: 'Buy Equipment / Asset Payback', value: decisionCounts.buyEquipment, tone: 'text-indigo-700' },
        { label: 'Staff Operator Advantage', value: decisionCounts.staffOperator, tone: 'text-emerald-700' },
        { label: 'Low Margin Services', value: decisionCounts.lowMargin, tone: 'text-orange-700' },
      ].map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</div>
          <div className={`mt-1 text-lg font-semibold ${item.tone}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );

  const renderOverviewFilters = () => (
    <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 md:grid-cols-2 xl:grid-cols-7">
      <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
        {dateOptions.map((option) => (
          <option key={option.value} value={option.value}>
            Date Range / {option.label}
          </option>
        ))}
      </select>
      <select value={venueFilter} onChange={(event) => setVenueFilter(event.target.value)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
        <option value="all">Venue / Branch</option>
        {overviewFilterOptions.venues.map((venue) => (
          <option key={venue} value={venue}>
            {venue}
          </option>
        ))}
      </select>
      <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
        <option value="all">Category</option>
        {categories.filter((category) => category.isActive).map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <select value={modeFilter} onChange={(event) => setModeFilter(event.target.value)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
        <option value="all">Current Mode</option>
        {currentModeOptions.map((mode) => (
          <option key={mode} value={mode}>
            {mode}
          </option>
        ))}
      </select>
      <select value={recommendationFilter} onChange={(event) => setRecommendationFilter(event.target.value)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
        <option value="all">Recommendation</option>
        {recommendationOptions.map((recommendation) => (
          <option key={recommendation} value={recommendation}>
            {recommendation}
          </option>
        ))}
      </select>
      <select value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
        <option value="all">Vendor</option>
        {overviewFilterOptions.vendors.map((vendor) => (
          <option key={vendor} value={vendor}>
            {vendor}
          </option>
        ))}
      </select>
      <select value={marginStatusFilter} onChange={(event) => setMarginStatusFilter(event.target.value)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
        <option value="all">Margin Status</option>
        {marginStatusOptions.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </div>
  );

  const renderSourcingDashboard = () => (
    <div className="space-y-2.5">
      {renderKpiStrip()}
      {renderDecisionCards()}
      {renderOverviewFilters()}

      {dashboardActionMessage ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
          {dashboardActionMessage}
        </div>
      ) : null}

      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <ArrowRightLeft className="size-4 text-blue-700" />
              Service Sourcing Decision
            </div>
            <span className="text-xs text-slate-500">{filteredServiceDecisionRows.length} services</span>
          </div>
          <div className="max-h-[560px] overflow-auto">
            <table className="min-w-[1840px] w-full">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr>
                  <th className={tableHeadClass}>Service</th>
                  <th className={tableHeadClass}>Category</th>
                  <th className={tableHeadClass}>Current Mode</th>
                  <th className={`${tableHeadClass} text-right`}>Sold Qty</th>
                  <th className={`${tableHeadClass} text-right`}>Revenue</th>
                  <th className={`${tableHeadClass} text-right`}>Vendor Cost</th>
                  <th className={`${tableHeadClass} text-right`}>Internal Cost</th>
                  <th className={`${tableHeadClass} text-right`}>Gross Profit</th>
                  <th className={`${tableHeadClass} text-right`}>Margin %</th>
                  <th className={`${tableHeadClass} text-right`}>Season Vendor Spend</th>
                  <th className={`${tableHeadClass} text-right`}>Estimated In-house Cost</th>
                  <th className={`${tableHeadClass} text-right`}>Estimated Vendor Cost</th>
                  <th className={`${tableHeadClass} text-right`}>Opportunity Saving</th>
                  <th className={tableHeadClass}>Recommendation</th>
                  <th className={tableHeadClass}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredServiceDecisionRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className={tableCellClass}>
                      <div className="font-medium text-slate-900">{row.serviceName}</div>
                      <div className="text-xs text-slate-500">{row.vendorName || 'No vendor linked'}</div>
                    </td>
                    <td className={tableCellClass}>{row.categoryName}</td>
                    <td className={tableCellClass}>{renderStatusBadge(row.currentMode, 'bg-slate-50 text-slate-700 border-slate-200')}</td>
                    <td className={`${tableCellClass} text-right`}>{row.soldQty}</td>
                    <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(row.revenue)}</td>
                    <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(row.vendorCost)}</td>
                    <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(row.internalCost)}</td>
                    <td className={`${tableCellClass} text-right font-semibold ${row.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatCurrencyPKR(row.grossProfit)}
                    </td>
                    <td className={`${tableCellClass} text-right`}>
                      <div className={row.marginStatus === 'Healthy' ? 'font-semibold text-emerald-700' : 'font-semibold text-orange-700'}>
                        {formatPercent(row.marginPercent)}
                      </div>
                      <div className="mt-1 flex justify-end">{renderStatusBadge(row.marginStatus, getMarginBadgeClass(row.marginStatus))}</div>
                    </td>
                    <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(row.seasonVendorSpend)}</td>
                    <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(row.estimatedInHouseCost)}</td>
                    <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(row.estimatedVendorCost)}</td>
                    <td className={`${tableCellClass} text-right font-semibold ${row.opportunitySaving >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                      {formatCurrencyPKR(row.opportunitySaving)}
                    </td>
                    <td className={tableCellClass}>{renderStatusBadge(row.recommendation, getRecommendationBadgeClass(row.recommendation))}</td>
                    <td className={tableCellClass}>
                      <select
                        aria-label={`Action for ${row.serviceName}`}
                        defaultValue=""
                        className="h-7 w-[168px] rounded border border-slate-300 bg-white px-2 text-xs text-slate-700"
                        onChange={(event) => {
                          const nextAction = event.target.value as DashboardAction;
                          if (nextAction) handleDashboardAction(row, nextAction);
                          event.currentTarget.value = '';
                        }}
                      >
                        <option value="" disabled>Action</option>
                        {dashboardActionOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {filteredServiceDecisionRows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-3 py-8 text-center text-sm text-slate-500">
                      No services match the current sourcing filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-2.5">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <h3 className="text-sm font-semibold text-slate-900">Top Vendor Leakage</h3>
              <Wallet className="size-4 text-slate-400" />
            </div>
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={compactTableHeadClass}>Vendor</th>
                  <th className={`${compactTableHeadClass} text-right`}>Season Spend</th>
                  <th className={compactTableHeadClass}>Services</th>
                  <th className={compactTableHeadClass}>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {topVendorLeakage.map((row) => (
                  <tr key={row.vendor} className="border-t border-slate-200">
                    <td className={compactTableCellClass}>{row.vendor}</td>
                    <td className={`${compactTableCellClass} text-right`}>{formatCompactCurrency(row.seasonSpend)}</td>
                    <td className={compactTableCellClass}>{Array.from(row.services).slice(0, 2).join(', ') || '-'}</td>
                    <td className={compactTableCellClass}>{renderStatusBadge(row.riskLevel, getRiskBadgeClass(row.riskLevel))}</td>
                  </tr>
                ))}
                {topVendorLeakage.length === 0 ? (
                  <tr><td colSpan={4} className="px-2 py-5 text-center text-xs text-slate-500">No vendor spend in this filter.</td></tr>
                ) : null}
              </tbody>
            </table>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <h3 className="text-sm font-semibold text-slate-900">Top In-house Opportunities</h3>
              <Building2 className="size-4 text-slate-400" />
            </div>
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={compactTableHeadClass}>Service</th>
                  <th className={`${compactTableHeadClass} text-right`}>Current Vendor Spend</th>
                  <th className={`${compactTableHeadClass} text-right`}>Estimated In-house Cost</th>
                  <th className={`${compactTableHeadClass} text-right`}>Saving</th>
                </tr>
              </thead>
              <tbody>
                {topInHouseOpportunities.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className={compactTableCellClass}>{row.serviceName}</td>
                    <td className={`${compactTableCellClass} text-right`}>{formatCompactCurrency(row.seasonVendorSpend)}</td>
                    <td className={`${compactTableCellClass} text-right`}>{formatCompactCurrency(row.estimatedInHouseCost)}</td>
                    <td className={`${compactTableCellClass} text-right font-semibold text-indigo-700`}>{formatCompactCurrency(row.opportunitySaving)}</td>
                  </tr>
                ))}
                {topInHouseOpportunities.length === 0 ? (
                  <tr><td colSpan={4} className="px-2 py-5 text-center text-xs text-slate-500">No in-house saving candidate.</td></tr>
                ) : null}
              </tbody>
            </table>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <h3 className="text-sm font-semibold text-slate-900">Outsource Recommendations</h3>
              <Briefcase className="size-4 text-slate-400" />
            </div>
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={compactTableHeadClass}>Service</th>
                  <th className={`${compactTableHeadClass} text-right`}>Current In-house Cost</th>
                  <th className={`${compactTableHeadClass} text-right`}>Vendor Benchmark</th>
                  <th className={`${compactTableHeadClass} text-right`}>Saving</th>
                </tr>
              </thead>
              <tbody>
                {outsourceRecommendations.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className={compactTableCellClass}>{row.serviceName}</td>
                    <td className={`${compactTableCellClass} text-right`}>{formatCompactCurrency(row.internalCost)}</td>
                    <td className={`${compactTableCellClass} text-right`}>{formatCompactCurrency(row.estimatedVendorCost)}</td>
                    <td className={`${compactTableCellClass} text-right font-semibold text-rose-700`}>{formatCompactCurrency(Math.max(row.opportunitySaving, 0))}</td>
                  </tr>
                ))}
                {outsourceRecommendations.length === 0 ? (
                  <tr><td colSpan={4} className="px-2 py-5 text-center text-xs text-slate-500">No in-house cost overrun found.</td></tr>
                ) : null}
              </tbody>
            </table>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <h3 className="text-sm font-semibold text-slate-900">Setup Health</h3>
              <Settings className="size-4 text-slate-400" />
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 p-3 text-xs">
              {[
                ['Missing Cost', setupHealth.missingCost],
                ['Missing Vendor Rate', setupHealth.missingVendorRate],
                ['Missing Commission Rule', setupHealth.missingCommissionRule],
                ['Hidden from Reservation', setupHealth.hiddenFromReservation],
                ['Approval Required', setupHealth.approvalRequired],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold text-slate-900">{value}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-600">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span><strong className="text-slate-900">{setupHealth.totalCategories}</strong> categories</span>
                <span><strong className="text-slate-900">{setupHealth.totalActiveServices}</strong> services</span>
                <span><strong className="text-slate-900">{setupHealth.activeVendors}</strong> vendors</span>
                <span><strong className="text-slate-900">{setupHealth.packages}</strong> packages</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-2.5 xl:grid-cols-2">
        <CompactAccordionSection title="Asset Payback" icon={Package} iconClassName="text-indigo-600" hint={`${assetPaybackRows.length} candidates`} defaultOpen={assetPaybackRows.length > 0}>
          <div className="overflow-auto">
            <table className="min-w-[760px] w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={compactTableHeadClass}>Service</th>
                  <th className={`${compactTableHeadClass} text-right`}>Asset Cost</th>
                  <th className={`${compactTableHeadClass} text-right`}>Current Vendor Cost per Event</th>
                  <th className={`${compactTableHeadClass} text-right`}>Events This Season</th>
                  <th className={`${compactTableHeadClass} text-right`}>Payback Events</th>
                  <th className={compactTableHeadClass}>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {assetPaybackRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className={compactTableCellClass}>{row.serviceName}</td>
                    <td className={`${compactTableCellClass} text-right`}>{formatCurrencyPKR(row.assetCost)}</td>
                    <td className={`${compactTableCellClass} text-right`}>{formatCurrencyPKR(row.currentVendorCostPerEvent)}</td>
                    <td className={`${compactTableCellClass} text-right`}>{row.soldQty}</td>
                    <td className={`${compactTableCellClass} text-right`}>{row.paybackEvents.toFixed(1)}</td>
                    <td className={compactTableCellClass}>{renderStatusBadge(row.recommendation, getRecommendationBadgeClass(row.recommendation))}</td>
                  </tr>
                ))}
                {assetPaybackRows.length === 0 ? (
                  <tr><td colSpan={6} className="px-2 py-5 text-center text-xs text-slate-500">No asset payback candidate for this filter.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CompactAccordionSection>

        <CompactAccordionSection title="Staff Operator Advantage" icon={Users} iconClassName="text-emerald-600" hint={`${staffOperatorRows.length} candidates`} defaultOpen={staffOperatorRows.length > 0}>
          <div className="overflow-auto">
            <table className="min-w-[700px] w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={compactTableHeadClass}>Service</th>
                  <th className={`${compactTableHeadClass} text-right`}>Old Vendor Cost</th>
                  <th className={`${compactTableHeadClass} text-right`}>Suggested Staff Operator Share</th>
                  <th className={`${compactTableHeadClass} text-right`}>Company Saving</th>
                  <th className={compactTableHeadClass}>Suggested Action</th>
                </tr>
              </thead>
              <tbody>
                {staffOperatorRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className={compactTableCellClass}>{row.serviceName}</td>
                    <td className={`${compactTableCellClass} text-right`}>{formatCurrencyPKR(row.seasonVendorSpend || row.estimatedVendorCost)}</td>
                    <td className={`${compactTableCellClass} text-right`}>{formatCurrencyPKR(row.suggestedStaffShare)}</td>
                    <td className={`${compactTableCellClass} text-right font-semibold text-emerald-700`}>{formatCurrencyPKR(row.companySavingAfterStaffShare)}</td>
                    <td className={compactTableCellClass}>{row.recommendation === 'Buy Equipment' ? 'Prepare asset proposal' : 'Assign staff operator'}</td>
                  </tr>
                ))}
                {staffOperatorRows.length === 0 ? (
                  <tr><td colSpan={5} className="px-2 py-5 text-center text-xs text-slate-500">No staff operator advantage for this filter.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CompactAccordionSection>
      </div>
    </div>
  );

  const renderSummaryCards = () => {
    const revenue = filteredSoldLines.reduce((sum, line) => sum + line.totalRevenue, 0);
    const vendorSpend = filteredSoldLines.reduce((sum, line) => sum + line.vendorCost, 0);
    const inHouseCost = filteredSoldLines.reduce((sum, line) => sum + line.internalCost, 0);
    const grossProfit = revenue - vendorSpend - inHouseCost;
    const netCompanyProfit = filteredSoldLines.reduce((sum, line) => sum + line.companyProfit, 0);
    const opportunitySaving = serviceDecisionRows.reduce((sum, row) => sum + Math.max(row.opportunitySaving, 0), 0);

    return (
      <div className="grid gap-2 lg:grid-cols-7">
        {[
          { label: 'RCS Revenue', value: formatCompactCurrency(revenue), tone: 'text-blue-700' },
          { label: 'Vendor Spend', value: formatCompactCurrency(vendorSpend), tone: 'text-amber-700' },
          { label: 'In-house Cost', value: formatCompactCurrency(inHouseCost), tone: 'text-slate-700' },
          { label: 'Gross Profit', value: formatCompactCurrency(grossProfit), tone: grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700' },
          { label: 'Net Company Profit', value: formatCompactCurrency(netCompanyProfit), tone: netCompanyProfit >= 0 ? 'text-blue-800' : 'text-rose-700' },
          { label: 'Average Margin %', value: formatPercent(revenue > 0 ? (grossProfit / revenue) * 100 : 0), tone: 'text-emerald-700' },
          { label: 'Opportunity Saving', value: formatCompactCurrency(opportunitySaving), tone: 'text-indigo-700' },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</div>
            <div className={`mt-1 text-base font-semibold ${item.tone}`}>{item.value}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderCalculationStrip = (sellingPrice: number, cost: number, grossProfit: number, commissionPayable: number, companyProfit: number) => (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {[
        { label: 'Selling Price', value: formatCurrencyPKR(sellingPrice), tone: 'text-slate-900' },
        { label: 'Vendor/Internal Cost', value: formatCurrencyPKR(cost), tone: 'text-amber-700' },
        { label: 'Gross Profit', value: formatCurrencyPKR(grossProfit), tone: grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700' },
        { label: 'Commission Payable', value: formatCurrencyPKR(commissionPayable), tone: 'text-violet-700' },
        { label: 'Net Company Profit', value: formatCurrencyPKR(companyProfit), tone: companyProfit >= 0 ? 'text-blue-700' : 'text-red-700' },
      ].map((card) => (
        <div key={card.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{card.label}</div>
          <div className={`mt-1.5 text-base font-semibold ${card.tone}`}>{card.value}</div>
        </div>
      ))}
    </div>
  );

  const renderOverview = () => {
    const lowMarginServices = [...services]
      .filter((service) => service.isActive)
      .map((service) => ({
        service,
        profit: computeServiceProfit(service),
        margin: computeMargin(service.defaultSellingPrice, computeServiceCost(service)),
      }))
      .sort((left, right) => left.margin - right.margin)
      .slice(0, 5);

    return (
      <div className="space-y-3.5">
        {renderSummaryCards()}

        {renderCalculationStrip(5000, 2500, 2500, 1000, 1500)}

        <SetupAdminGrid className="xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <SetupAdminColumn>
            <CompactFormSection title="Profit Snapshot" icon={BarChart3} iconClassName="text-emerald-600">
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-[940px] w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Service</th>
                      <th className={`${tableHeadClass} text-right`}>Revenue</th>
                      <th className={`${tableHeadClass} text-right`}>Cost</th>
                      <th className={`${tableHeadClass} text-right`}>Gross Profit</th>
                      <th className={`${tableHeadClass} text-right`}>Company Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profitRows.slice(0, 6).map((row) => (
                      <tr key={row.serviceName} className="border-t border-slate-200">
                        <td className={tableCellClass}>{row.serviceName}</td>
                        <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(row.revenue)}</td>
                        <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(row.cost)}</td>
                        <td className={`${tableCellClass} text-right font-semibold text-emerald-700`}>
                          {formatCurrencyPKR(row.grossProfit)}
                        </td>
                        <td className={`${tableCellClass} text-right font-semibold text-blue-700`}>
                          {formatCurrencyPKR(row.companyProfit)}
                        </td>
                      </tr>
                    ))}
                    {profitRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                          No RCS sales are available for the selected date filter yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CompactFormSection>
          </SetupAdminColumn>

          <SetupAdminColumn>
            <CompactFormSection title="Margin Watch" icon={Percent} iconClassName="text-amber-600">
              <div className="space-y-2">
                {lowMarginServices.map(({ service, profit, margin }) => (
                  <div key={service.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">{service.serviceName}</div>
                        <div className="text-xs text-slate-500">
                          {categoryMap.get(service.categoryId)?.name || 'Uncategorized'} - {service.fulfillmentType}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${margin < approvalSettings.minimumGrossMarginPercent ? 'text-red-700' : 'text-emerald-700'}`}>
                          {margin.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-500">{formatCurrencyPKR(profit)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CompactFormSection>
          </SetupAdminColumn>
        </SetupAdminGrid>
      </div>
    );
  };

  return (
    <div className="space-y-3.5">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-slate-700" />
                <h2 className="text-lg font-semibold text-slate-900">
                  {activeTab === 'overview' ? 'RCS Sourcing & Profit Dashboard' : 'RCS Services Setup'}
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {activeTab === 'overview'
                  ? 'Analyze vendor leakage, in-house opportunities, outsourcing recommendations, staff operator advantage, and seasonal profit.'
                  : 'Clean master setup for categories, services, vendors, packages, pricing, profit visibility, and commission rules.'}
              </p>
            </div>

            <div className={`grid gap-2 ${activeTab === 'overview' ? 'md:grid-cols-[minmax(220px,360px)]' : 'md:grid-cols-[minmax(220px,320px)_150px_150px]'}`}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={activeTab === 'overview' ? 'Search service, vendor, or venue...' : 'Search setup records...'}
                  className="pl-9"
                />
              </div>
              {activeTab !== 'overview' ? (
                <>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={dateFilter}
                    onChange={(event) => setDateFilter(event.target.value as DateFilter)}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  >
                    {dateOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-slate-200 px-3 py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' ? renderSourcingDashboard() : null}

      {activeTab === 'categories' ? (
        <SetupAdminGrid className="xl:grid-cols-[360px_minmax(0,1fr)]">
          <SetupAdminColumn>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Layers3 className="size-4 text-blue-600" />
                    Categories
                  </div>
                  <div className="text-xs text-slate-500">{filteredCategories.length} records</div>
                </div>
                <Button
                  size="sm"
                  className="h-8 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setCategoryDraft(buildEmptyCategory(userName));
                    setEditMode('categories', true);
                  }}
                >
                  <Plus className="mr-1 size-4" />
                  New
                </Button>
              </div>
              <div className="max-h-[640px] overflow-y-auto p-2">
                {filteredCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setCategoryDraft(category);
                      setEditMode('categories', false);
                    }}
                    className={`mb-1 w-full rounded-lg border px-3 py-3 text-left transition ${
                      categoryDraft.id === category.id ? 'border-blue-300 bg-blue-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-slate-900">{category.name}</div>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${category.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {category.code} - Target {formatPercent(safeNumber(category.targetMarginPercent))} - {category.defaultFulfillmentMode || 'in-house'}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {category.showInReservation === false ? 'Hidden from Reservation' : 'Shown in Reservation'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </SetupAdminColumn>

          <SetupAdminColumn>
            <CompactFormSection
              title="Category Detail"
              icon={Layers3}
              iconClassName="text-blue-600"
              actions={
                editModes.categories ? (
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveCategory}>
                      <Save className="mr-1 size-4" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={handleCancelCategoryEdit}>
                      <X className="mr-1 size-4" />
                      Cancel
                    </Button>
                    {isCategoryExisting ? (
                      <Button size="sm" variant="outline" className="h-8 border-red-200 text-red-600 hover:bg-red-50" onClick={handleDeleteCategory}>
                        <Trash2 className="mr-1 size-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                ) : isCategoryExisting ? (
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setEditMode('categories', true)}>
                    <Pencil className="mr-1 size-4" />
                    Edit
                  </Button>
                ) : null
              }
            >
              {!editModes.categories && isCategoryExisting ? (
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Click Edit to update this category.
                </div>
              ) : null}
              <fieldset disabled={!editModes.categories} className={!editModes.categories ? 'space-y-3 opacity-80' : 'space-y-3'}>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input value={categoryDraft.name} onChange={(event) => setCategoryDraft({ ...categoryDraft, name: event.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Code</Label>
                    <Input value={categoryDraft.code} onChange={(event) => setCategoryDraft({ ...categoryDraft, code: event.target.value.toUpperCase() })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={categoryDraft.description || ''} onChange={(event) => setCategoryDraft({ ...categoryDraft, description: event.target.value })} rows={4} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Target Margin %</Label>
                    <Input
                      type="number"
                      value={safeNumber(categoryDraft.targetMarginPercent)}
                      onChange={(event) => setCategoryDraft({ ...categoryDraft, targetMarginPercent: safeNumber(event.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Default Fulfillment Mode</Label>
                    <select
                      value={categoryDraft.defaultFulfillmentMode || 'in-house'}
                      onChange={(event) => setCategoryDraft({ ...categoryDraft, defaultFulfillmentMode: event.target.value as SetupRcsFulfillmentType })}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      {fulfillmentTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      id="category-active"
                      type="checkbox"
                      checked={categoryDraft.isActive}
                      onChange={(event) => setCategoryDraft({ ...categoryDraft, isActive: event.target.checked })}
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      id="category-reservation"
                      type="checkbox"
                      checked={categoryDraft.showInReservation !== false}
                      onChange={(event) => setCategoryDraft({ ...categoryDraft, showInReservation: event.target.checked })}
                    />
                    Show in Reservation
                  </label>
                </div>
              </fieldset>
            </CompactFormSection>
          </SetupAdminColumn>
        </SetupAdminGrid>
      ) : null}

      {activeTab === 'services' ? (
        <SetupAdminGrid className="xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <SetupAdminColumn>
            <CompactFormSection
              title="Service Master"
              icon={Briefcase}
              iconClassName="text-violet-600"
              actions={
                <Button
                  size="sm"
                  className="h-8 bg-violet-600 hover:bg-violet-700"
                  onClick={() => {
                    setServiceDraft(buildEmptyService(userName, categories[0]?.id));
                    setEditMode('services', true);
                  }}
                >
                  <Plus className="mr-1 size-4" />
                  New Service
                </Button>
              }
            >
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-[920px] w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Service</th>
                      <th className={tableHeadClass}>Category</th>
                      <th className={tableHeadClass}>Mode</th>
                      <th className={`${tableHeadClass} text-right`}>Target</th>
                      <th className={`${tableHeadClass} text-right`}>Selling</th>
                      <th className={`${tableHeadClass} text-right`}>Cost</th>
                      <th className={`${tableHeadClass} text-right`}>Profit</th>
                      <th className={tableHeadClass}>Reservation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServices.map((service) => {
                      const cost = computeServiceCost(service);
                      const profit = computeServiceProfit(service);
                      return (
                        <tr
                          key={service.id}
                          className={`cursor-pointer border-t border-slate-200 ${serviceDraft.id === service.id ? 'bg-violet-50' : 'hover:bg-slate-50'}`}
                          onClick={() => {
                            setServiceDraft(service);
                            setEditMode('services', false);
                          }}
                        >
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{service.serviceName}</div>
                            <div className="text-xs text-slate-500">{service.unitType}</div>
                          </td>
                          <td className={tableCellClass}>{categoryMap.get(service.categoryId)?.name || 'Uncategorized'}</td>
                          <td className={tableCellClass}>{service.fulfillmentType}</td>
                          <td className={`${tableCellClass} text-right`}>{formatPercent(safeNumber(service.targetMarginPercent))}</td>
                          <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(service.defaultSellingPrice)}</td>
                          <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(cost)}</td>
                          <td className={`${tableCellClass} text-right font-semibold ${profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {formatCurrencyPKR(profit)}
                          </td>
                          <td className={tableCellClass}>
                            {service.showInReservation === false ? 'Hidden' : 'Shown'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CompactFormSection>
          </SetupAdminColumn>

          <SetupAdminColumn>
            <CompactFormSection
              title="Service Detail"
              icon={Briefcase}
              iconClassName="text-violet-600"
              actions={
                editModes.services ? (
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveService}>
                      <Save className="mr-1 size-4" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={handleCancelServiceEdit}>
                      <X className="mr-1 size-4" />
                      Cancel
                    </Button>
                    {isServiceExisting ? (
                      <Button size="sm" variant="outline" className="h-8 border-red-200 text-red-600 hover:bg-red-50" onClick={handleDeleteService}>
                        <Trash2 className="mr-1 size-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                ) : isServiceExisting ? (
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setEditMode('services', true)}>
                    <Pencil className="mr-1 size-4" />
                    Edit
                  </Button>
                ) : null
              }
            >
              {!editModes.services && isServiceExisting ? (
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Click Edit to update this service.
                </div>
              ) : null}
              <fieldset disabled={!editModes.services} className={!editModes.services ? 'space-y-3 opacity-80' : 'space-y-3'}>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <select
                      value={serviceDraft.categoryId}
                      onChange={(event) => setServiceDraft({ ...serviceDraft, categoryId: event.target.value })}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unit Type</Label>
                    <select
                      value={serviceDraft.unitType}
                      onChange={(event) => setServiceDraft({ ...serviceDraft, unitType: event.target.value as SetupRcsService['unitType'] })}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      {['event', 'item', 'hour', 'day', 'person', 'stage', 'setup', 'package'].map((unitType) => (
                        <option key={unitType} value={unitType}>
                          {unitType}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Service Name</Label>
                    <Input value={serviceDraft.serviceName} onChange={(event) => setServiceDraft({ ...serviceDraft, serviceName: event.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Commission Rule</Label>
                    <select
                      value={serviceDraft.commissionRuleId || ''}
                      onChange={(event) => setServiceDraft({ ...serviceDraft, commissionRuleId: event.target.value })}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      <option value="">No commission rule</option>
                      {commissionRules.map((rule) => (
                        <option key={rule.id} value={rule.id}>
                          {rule.ruleName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Default Selling Price</Label>
                    <Input
                      type="number"
                      value={serviceDraft.defaultSellingPrice}
                      onChange={(event) => setServiceDraft({ ...serviceDraft, defaultSellingPrice: safeNumber(event.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Current Fulfillment Mode</Label>
                    <select
                      value={serviceDraft.fulfillmentType}
                      onChange={(event) => setServiceDraft({ ...serviceDraft, fulfillmentType: event.target.value as SetupRcsFulfillmentType })}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      {fulfillmentTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{serviceDraft.fulfillmentType === 'outsourced' ? 'Vendor Cost' : 'Internal Cost'}</Label>
                    <Input
                      type="number"
                      value={serviceDraft.fulfillmentType === 'outsourced' ? safeNumber(serviceDraft.vendorCost) : safeNumber(serviceDraft.internalCost)}
                      onChange={(event) =>
                        setServiceDraft({
                          ...serviceDraft,
                          vendorCost: serviceDraft.fulfillmentType === 'outsourced' ? safeNumber(event.target.value) : serviceDraft.vendorCost,
                          internalCost: serviceDraft.fulfillmentType === 'in-house' ? safeNumber(event.target.value) : serviceDraft.internalCost,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label>Estimated In-house Cost</Label>
                    <Input
                      type="number"
                      value={safeNumber(serviceDraft.estimatedInHouseCost)}
                      onChange={(event) => setServiceDraft({ ...serviceDraft, estimatedInHouseCost: safeNumber(event.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Estimated Vendor Cost</Label>
                    <Input
                      type="number"
                      value={safeNumber(serviceDraft.estimatedVendorCost)}
                      onChange={(event) => setServiceDraft({ ...serviceDraft, estimatedVendorCost: safeNumber(event.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Market Vendor Rate</Label>
                    <Input
                      type="number"
                      value={safeNumber(serviceDraft.marketVendorRate)}
                      onChange={(event) => setServiceDraft({ ...serviceDraft, marketVendorRate: safeNumber(event.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Target Margin %</Label>
                    <Input
                      type="number"
                      value={safeNumber(serviceDraft.targetMarginPercent)}
                      onChange={(event) => setServiceDraft({ ...serviceDraft, targetMarginPercent: safeNumber(event.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(serviceDraft.assetRequired)}
                      onChange={(event) => setServiceDraft({ ...serviceDraft, assetRequired: event.target.checked })}
                    />
                    Asset Required
                  </label>
                  <div className="space-y-1.5">
                    <Label>Asset Purchase Cost</Label>
                    <Input
                      type="number"
                      value={safeNumber(serviceDraft.assetPurchaseCost)}
                      onChange={(event) => setServiceDraft({ ...serviceDraft, assetPurchaseCost: safeNumber(event.target.value) })}
                    />
                  </div>
                  <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(serviceDraft.operatorRequired)}
                      onChange={(event) => setServiceDraft({ ...serviceDraft, operatorRequired: event.target.checked })}
                    />
                    Operator Required
                  </label>
                  <div className="space-y-1.5">
                    <Label>Suggested Operator Commission</Label>
                    <Input
                      type="number"
                      value={safeNumber(serviceDraft.suggestedOperatorCommission)}
                      onChange={(event) => setServiceDraft({ ...serviceDraft, suggestedOperatorCommission: safeNumber(event.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {[
                    {
                      id: 'service-active',
                      label: 'Active',
                      checked: serviceDraft.isActive,
                      onChange: (checked: boolean) => setServiceDraft({ ...serviceDraft, isActive: checked }),
                    },
                    {
                      id: 'service-reservation',
                      label: 'Show in Reservation',
                      checked: serviceDraft.showInReservation !== false,
                      onChange: (checked: boolean) => setServiceDraft({ ...serviceDraft, showInReservation: checked }),
                    },
                    {
                      id: 'service-vendor-payable',
                      label: 'Auto Create Vendor Payable',
                      checked: serviceDraft.autoCreateVendorPayable !== false,
                      onChange: (checked: boolean) => setServiceDraft({ ...serviceDraft, autoCreateVendorPayable: checked }),
                    },
                    {
                      id: 'service-commission-payable',
                      label: 'Auto Create Commission Payable',
                      checked: serviceDraft.autoCreateCommissionPayable !== false,
                      onChange: (checked: boolean) => setServiceDraft({ ...serviceDraft, autoCreateCommissionPayable: checked }),
                    },
                  ].map((option) => (
                    <label key={option.id} className="flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700">
                      <input
                        id={option.id}
                        type="checkbox"
                        checked={option.checked}
                        onChange={(event) => option.onChange(event.target.checked)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea value={serviceDraft.notes || ''} onChange={(event) => setServiceDraft({ ...serviceDraft, notes: event.target.value })} rows={3} />
                </div>
              </fieldset>
            </CompactFormSection>

            {renderCalculationStrip(
              serviceDraft.defaultSellingPrice,
              computeServiceCost(serviceDraft),
              computeServiceProfit(serviceDraft),
              previewBreakdown.totalCommission,
              Math.max(computeServiceProfit(serviceDraft) - previewBreakdown.totalCommission, 0),
            )}
          </SetupAdminColumn>
        </SetupAdminGrid>
      ) : null}

      {activeTab === 'vendors' ? (
        <SetupAdminGrid className="xl:grid-cols-[360px_minmax(0,1fr)]">
          <SetupAdminColumn>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Building2 className="size-4 text-emerald-600" />
                    Vendors
                  </div>
                  <div className="text-xs text-slate-500">{filteredVendors.length} records</div>
                </div>
                <Button
                  size="sm"
                  className="h-8 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    setVendorDraft(buildEmptyVendor(userName));
                    setEditMode('vendors', true);
                  }}
                >
                  <Plus className="mr-1 size-4" />
                  New
                </Button>
              </div>
              <div className="max-h-[640px] overflow-y-auto p-2">
                {filteredVendors.map((vendor) => {
                  const spendSummary = vendorSeasonSpendMap.get(vendor.vendorName);
                  return (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => {
                      setVendorDraft(vendor);
                      setEditMode('vendors', false);
                    }}
                    className={`mb-1 w-full rounded-lg border px-3 py-3 text-left transition ${
                      vendorDraft.id === vendor.id ? 'border-emerald-300 bg-emerald-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium text-slate-900">{vendor.vendorName}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 capitalize">{vendor.vendorStatus || 'standard'}</span>
                      <span>{vendor.vendorCategory || 'General'}</span>
                      <span>Reliability {safeNumber(vendor.reliabilityRating)}/5</span>
                      <span>Quality {safeNumber(vendor.qualityRating)}/5</span>
                    </div>
                    <div className="mt-1 text-xs font-medium text-emerald-700">
                      Season Spend {formatCurrencyPKR(spendSummary?.seasonSpend || 0)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{vendor.contactPerson || 'No contact person'} - {vendor.city || 'No city'}</div>
                  </button>
                  );
                })}
              </div>
            </div>
          </SetupAdminColumn>

          <SetupAdminColumn>
            <CompactFormSection
              title="Vendor Detail"
              icon={Building2}
              iconClassName="text-emerald-600"
              actions={
                editModes.vendors ? (
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveVendor}>
                      <Save className="mr-1 size-4" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={handleCancelVendorEdit}>
                      <X className="mr-1 size-4" />
                      Cancel
                    </Button>
                    {isVendorExisting ? (
                      <Button size="sm" variant="outline" className="h-8 border-red-200 text-red-600 hover:bg-red-50" onClick={handleDeleteVendor}>
                        <Trash2 className="mr-1 size-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                ) : isVendorExisting ? (
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setEditMode('vendors', true)}>
                    <Pencil className="mr-1 size-4" />
                    Edit
                  </Button>
                ) : null
              }
            >
              {!editModes.vendors && isVendorExisting ? (
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Click Edit to update this vendor.
                </div>
              ) : null}
              <div className="mb-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 md:grid-cols-3">
                <div>
                  <div className="uppercase tracking-wide text-slate-400">Season Spend</div>
                  <div className="font-semibold text-slate-900">{formatCurrencyPKR(selectedVendorSeasonSpend?.seasonSpend || 0)}</div>
                </div>
                <div>
                  <div className="uppercase tracking-wide text-slate-400">Services</div>
                  <div className="font-semibold text-slate-900">{selectedVendorSeasonSpend?.services.size || 0}</div>
                </div>
                <div>
                  <div className="uppercase tracking-wide text-slate-400">Payment Terms</div>
                  <div className="font-semibold text-slate-900">{vendorDraft.paymentTerms || 'Not set'}</div>
                </div>
              </div>
              <fieldset disabled={!editModes.vendors} className={!editModes.vendors ? 'space-y-3 opacity-80' : 'space-y-3'}>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Vendor Name</Label>
                    <Input value={vendorDraft.vendorName} onChange={(event) => setVendorDraft({ ...vendorDraft, vendorName: event.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact Person</Label>
                    <Input value={vendorDraft.contactPerson || ''} onChange={(event) => setVendorDraft({ ...vendorDraft, contactPerson: event.target.value })} />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={vendorDraft.phone || ''} onChange={(event) => setVendorDraft({ ...vendorDraft, phone: event.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input value={vendorDraft.city || ''} onChange={(event) => setVendorDraft({ ...vendorDraft, city: event.target.value })} />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Vendor Category</Label>
                    <Input value={vendorDraft.vendorCategory || ''} onChange={(event) => setVendorDraft({ ...vendorDraft, vendorCategory: event.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Preferred / Backup Status</Label>
                    <select
                      value={vendorDraft.vendorStatus || 'standard'}
                      onChange={(event) => setVendorDraft({ ...vendorDraft, vendorStatus: event.target.value as SetupRcsVendorStatus })}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      {vendorStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Reliability Rating</Label>
                    <select
                      value={safeNumber(vendorDraft.reliabilityRating)}
                      onChange={(event) => setVendorDraft({ ...vendorDraft, reliabilityRating: safeNumber(event.target.value) })}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      {ratingOptions.map((rating) => (
                        <option key={rating} value={rating}>
                          {rating}/5
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Quality Rating</Label>
                    <select
                      value={safeNumber(vendorDraft.qualityRating)}
                      onChange={(event) => setVendorDraft({ ...vendorDraft, qualityRating: safeNumber(event.target.value) })}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      {ratingOptions.map((rating) => (
                        <option key={rating} value={rating}>
                          {rating}/5
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Payment Terms</Label>
                    <Input value={vendorDraft.paymentTerms || ''} onChange={(event) => setVendorDraft({ ...vendorDraft, paymentTerms: event.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea value={vendorDraft.notes || ''} onChange={(event) => setVendorDraft({ ...vendorDraft, notes: event.target.value })} rows={4} />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="vendor-active"
                    type="checkbox"
                    checked={vendorDraft.isActive}
                    onChange={(event) => setVendorDraft({ ...vendorDraft, isActive: event.target.checked })}
                  />
                  <Label htmlFor="vendor-active">Active</Label>
                </div>
              </fieldset>
            </CompactFormSection>
          </SetupAdminColumn>
        </SetupAdminGrid>
      ) : null}

      {activeTab === 'vendor-rates' ? (
        <SetupAdminGrid className="xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <SetupAdminColumn>
            <CompactFormSection
              title="Vendor Rate Matrix"
              icon={Wallet}
              iconClassName="text-amber-600"
              actions={
                <Button
                  size="sm"
                  className="h-8 bg-amber-600 hover:bg-amber-700"
                  onClick={() => {
                    setVendorRateDraft(buildEmptyVendorRate(userName, services[0]?.id, vendors[0]?.id));
                    setEditMode('vendor-rates', true);
                  }}
                >
                  <Plus className="mr-1 size-4" />
                  New Rate
                </Button>
              }
            >
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Service</th>
                      <th className={tableHeadClass}>Vendor</th>
                      <th className={`${tableHeadClass} text-right`}>Vendor Price</th>
                      <th className={`${tableHeadClass} text-right`}>Benchmark</th>
                      <th className={`${tableHeadClass} text-right`}>Selling Price</th>
                      <th className={`${tableHeadClass} text-right`}>Profit</th>
                      <th className={tableHeadClass}>Negotiation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendorRates.map((rate) => {
                      const profit = safeNumber(rate.sellingPrice) - safeNumber(rate.vendorPrice);
                      return (
                        <tr
                          key={rate.id}
                          className={`cursor-pointer border-t border-slate-200 ${vendorRateDraft.id === rate.id ? 'bg-amber-50' : 'hover:bg-slate-50'}`}
                          onClick={() => {
                            setVendorRateDraft(rate);
                            setEditMode('vendor-rates', false);
                          }}
                        >
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{serviceMap.get(rate.serviceId)?.serviceName || 'Unknown service'}</div>
                            {rate.isPreferred ? <div className="text-xs text-emerald-700">Preferred</div> : null}
                            <div className="text-xs text-slate-500">
                              {rate.isSeasonRate ? 'Season Rate' : 'Standard Rate'} {rate.effectiveFrom ? `from ${rate.effectiveFrom}` : ''}
                            </div>
                          </td>
                          <td className={tableCellClass}>{vendorMap.get(rate.vendorId)?.vendorName || 'Unknown vendor'}</td>
                          <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(rate.vendorPrice)}</td>
                          <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(safeNumber(rate.marketBenchmarkRate))}</td>
                          <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(rate.sellingPrice)}</td>
                          <td className={`${tableCellClass} text-right font-semibold ${profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {formatCurrencyPKR(profit)}
                          </td>
                          <td className={tableCellClass}>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">
                              {(rate.negotiationStatus || 'not-started').replace('-', ' ')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CompactFormSection>
          </SetupAdminColumn>

          <SetupAdminColumn>
            <CompactFormSection
              title="Vendor Rate Detail"
              icon={Wallet}
              iconClassName="text-amber-600"
              actions={
                editModes['vendor-rates'] ? (
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveVendorRate}>
                      <Save className="mr-1 size-4" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={handleCancelVendorRateEdit}>
                      <X className="mr-1 size-4" />
                      Cancel
                    </Button>
                    {isVendorRateExisting ? (
                      <Button size="sm" variant="outline" className="h-8 border-red-200 text-red-600 hover:bg-red-50" onClick={handleDeleteVendorRate}>
                        <Trash2 className="mr-1 size-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                ) : isVendorRateExisting ? (
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setEditMode('vendor-rates', true)}>
                    <Pencil className="mr-1 size-4" />
                    Edit
                  </Button>
                ) : null
              }
            >
              {!editModes['vendor-rates'] && isVendorRateExisting ? (
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Click Edit to update this vendor rate.
                </div>
              ) : null}
              <fieldset disabled={!editModes['vendor-rates']} className={!editModes['vendor-rates'] ? 'space-y-3 opacity-80' : 'space-y-3'}>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Service</Label>
                    <select
                      value={vendorRateDraft.serviceId}
                      onChange={(event) => {
                        const service = serviceMap.get(event.target.value);
                        const preferredRate = preferredVendorRateMap.get(event.target.value);
                        setVendorRateDraft({
                          ...vendorRateDraft,
                          serviceId: event.target.value,
                          sellingPrice: safeNumber(service?.defaultSellingPrice || vendorRateDraft.sellingPrice),
                          vendorPrice: safeNumber(preferredRate?.vendorPrice || service?.vendorCost || vendorRateDraft.vendorPrice),
                          marketBenchmarkRate: safeNumber(service?.marketVendorRate || vendorRateDraft.marketBenchmarkRate),
                        });
                      }}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      <option value="">Select service</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.serviceName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vendor</Label>
                    <select
                      value={vendorRateDraft.vendorId}
                      onChange={(event) => setVendorRateDraft({ ...vendorRateDraft, vendorId: event.target.value })}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.vendorName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Vendor Price</Label>
                    <Input type="number" value={vendorRateDraft.vendorPrice} onChange={(event) => setVendorRateDraft({ ...vendorRateDraft, vendorPrice: safeNumber(event.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Market Benchmark Rate</Label>
                    <Input
                      type="number"
                      value={safeNumber(vendorRateDraft.marketBenchmarkRate)}
                      onChange={(event) => setVendorRateDraft({ ...vendorRateDraft, marketBenchmarkRate: safeNumber(event.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Selling Price</Label>
                    <Input type="number" value={vendorRateDraft.sellingPrice} onChange={(event) => setVendorRateDraft({ ...vendorRateDraft, sellingPrice: safeNumber(event.target.value) })} />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Effective From</Label>
                    <Input
                      type="date"
                      value={vendorRateDraft.effectiveFrom || ''}
                      onChange={(event) => setVendorRateDraft({ ...vendorRateDraft, effectiveFrom: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Effective To</Label>
                    <Input
                      type="date"
                      value={vendorRateDraft.effectiveTo || ''}
                      onChange={(event) => setVendorRateDraft({ ...vendorRateDraft, effectiveTo: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Negotiation Status</Label>
                    <select
                      value={vendorRateDraft.negotiationStatus || 'not-started'}
                      onChange={(event) => setVendorRateDraft({ ...vendorRateDraft, negotiationStatus: event.target.value as SetupRcsNegotiationStatus })}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      {negotiationStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  {[
                    { label: 'Preferred Rate', checked: vendorRateDraft.isPreferred, onChange: (checked: boolean) => setVendorRateDraft({ ...vendorRateDraft, isPreferred: checked }) },
                    { label: 'Season Rate', checked: Boolean(vendorRateDraft.isSeasonRate), onChange: (checked: boolean) => setVendorRateDraft({ ...vendorRateDraft, isSeasonRate: checked }) },
                    { label: 'Includes Transport', checked: Boolean(vendorRateDraft.includesTransport), onChange: (checked: boolean) => setVendorRateDraft({ ...vendorRateDraft, includesTransport: checked }) },
                    { label: 'Includes Operator', checked: Boolean(vendorRateDraft.includesOperator), onChange: (checked: boolean) => setVendorRateDraft({ ...vendorRateDraft, includesOperator: checked }) },
                    { label: 'Includes Equipment', checked: Boolean(vendorRateDraft.includesEquipment), onChange: (checked: boolean) => setVendorRateDraft({ ...vendorRateDraft, includesEquipment: checked }) },
                    { label: 'Active', checked: vendorRateDraft.isActive, onChange: (checked: boolean) => setVendorRateDraft({ ...vendorRateDraft, isActive: checked }) },
                  ].map((option) => (
                    <label key={option.label} className="flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700">
                      <input type="checkbox" checked={option.checked} onChange={(event) => option.onChange(event.target.checked)} />
                      {option.label}
                    </label>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea value={vendorRateDraft.notes || ''} onChange={(event) => setVendorRateDraft({ ...vendorRateDraft, notes: event.target.value })} rows={3} />
                </div>
              </fieldset>
            </CompactFormSection>

            {renderCalculationStrip(
              vendorRateDraft.sellingPrice,
              vendorRateDraft.vendorPrice,
              vendorRateDraft.sellingPrice - vendorRateDraft.vendorPrice,
              previewBreakdown.totalCommission,
              Math.max(vendorRateDraft.sellingPrice - vendorRateDraft.vendorPrice - previewBreakdown.totalCommission, 0),
            )}
          </SetupAdminColumn>
        </SetupAdminGrid>
      ) : null}

      {activeTab === 'packages' ? (
        <SetupAdminGrid className="xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <SetupAdminColumn>
            <CompactFormSection
              title="Package Master"
              icon={Package}
              iconClassName="text-indigo-600"
              actions={
                <Button
                  size="sm"
                  className="h-8 bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => {
                    setPackageDraft(buildEmptyPackage(userName));
                    setEditMode('packages', true);
                  }}
                >
                  <Plus className="mr-1 size-4" />
                  New Package
                </Button>
              }
            >
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Package</th>
                      <th className={tableHeadClass}>Type</th>
                      <th className={`${tableHeadClass} text-right`}>Selling Price</th>
                      <th className={`${tableHeadClass} text-right`}>Cost</th>
                      <th className={`${tableHeadClass} text-right`}>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPackages.map((pkg) => {
                      const totals = computePackageTotals(pkg);
                      return (
                        <tr
                          key={pkg.id}
                          className={`cursor-pointer border-t border-slate-200 ${packageDraft.id === pkg.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                          onClick={() => {
                            setPackageDraft(pkg);
                            setEditMode('packages', false);
                          }}
                        >
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{pkg.packageName}</div>
                            <div className="text-xs text-slate-500">{pkg.lines.length} service lines</div>
                          </td>
                          <td className={tableCellClass}>
                            <div className="capitalize">{pkg.packageFulfillmentMode || pkg.packageType}</div>
                            <div className="text-xs text-slate-500">Target {formatPercent(safeNumber(pkg.packageTargetMarginPercent))}</div>
                          </td>
                          <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(totals.sellingPrice)}</td>
                          <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(totals.cost)}</td>
                          <td className={`${tableCellClass} text-right font-semibold text-emerald-700`}>{formatCurrencyPKR(totals.grossProfit)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CompactFormSection>
          </SetupAdminColumn>

          <SetupAdminColumn>
            <CompactFormSection
              title="Package Detail"
              icon={Package}
              iconClassName="text-indigo-600"
              actions={
                editModes.packages ? (
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={handleSavePackage}>
                      <Save className="mr-1 size-4" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={handleCancelPackageEdit}>
                      <X className="mr-1 size-4" />
                      Cancel
                    </Button>
                    {isPackageExisting ? (
                      <Button size="sm" variant="outline" className="h-8 border-red-200 text-red-600 hover:bg-red-50" onClick={handleDeletePackage}>
                        <Trash2 className="mr-1 size-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                ) : isPackageExisting ? (
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setEditMode('packages', true)}>
                    <Pencil className="mr-1 size-4" />
                    Edit
                  </Button>
                ) : null
              }
            >
              {!editModes.packages && isPackageExisting ? (
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Click Edit to update this package.
                </div>
              ) : null}
              <fieldset disabled={!editModes.packages} className={!editModes.packages ? 'space-y-3 opacity-80' : 'space-y-3'}>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Package Name</Label>
                  <Input value={packageDraft.packageName} onChange={(event) => setPackageDraft({ ...packageDraft, packageName: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Package Fulfillment Mode</Label>
                  <select
                    value={packageDraft.packageFulfillmentMode || packageDraft.packageType}
                    onChange={(event) =>
                      setPackageDraft({
                        ...packageDraft,
                        packageFulfillmentMode: event.target.value as SetupRcsPackageType,
                        packageType: event.target.value as SetupRcsPackageType,
                      })
                    }
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  >
                    {packageFulfillmentOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <select
                    value={packageDraft.categoryId || ''}
                    onChange={(event) => setPackageDraft({ ...packageDraft, categoryId: event.target.value })}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Package Commission Rule</Label>
                  <select
                    value={packageDraft.commissionRuleId || ''}
                    onChange={(event) => setPackageDraft({ ...packageDraft, commissionRuleId: event.target.value })}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  >
                    <option value="">No commission rule</option>
                    {commissionRules.map((rule) => (
                      <option key={rule.id} value={rule.id}>
                        {rule.ruleName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Package Target Margin %</Label>
                  <Input
                    type="number"
                    value={safeNumber(packageDraft.packageTargetMarginPercent)}
                    onChange={(event) => setPackageDraft({ ...packageDraft, packageTargetMarginPercent: safeNumber(event.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Package Cost Override</Label>
                  <Input
                    type="number"
                    value={safeNumber(packageDraft.packageCostOverride)}
                    disabled={!packageDraft.packageCostOverrideEnabled}
                    onChange={(event) => setPackageDraft({ ...packageDraft, packageCostOverride: safeNumber(event.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Cost Source</Label>
                  <div className="grid gap-1.5">
                    <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={packageDraft.useServiceCost !== false}
                        onChange={(event) => setPackageDraft({ ...packageDraft, useServiceCost: event.target.checked })}
                      />
                      Use Service Cost
                    </label>
                    <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(packageDraft.packageCostOverrideEnabled)}
                        onChange={(event) => setPackageDraft({ ...packageDraft, packageCostOverrideEnabled: event.target.checked })}
                      />
                      Package Cost Override
                    </label>
                  </div>
                </div>
              </div>

              <label className="mt-3 flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={packageDraft.approvalRequiredBelowMargin !== false}
                  onChange={(event) => setPackageDraft({ ...packageDraft, approvalRequiredBelowMargin: event.target.checked })}
                />
                Approval Required Below Margin
              </label>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">Package Lines</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() =>
                      setPackageDraft({
                        ...packageDraft,
                        lines: [
                          ...packageDraft.lines,
                          {
                            id: createId('rcs-package-line'),
                            serviceId: services[0]?.id || '',
                            quantity: 1,
                            sellingPrice: safeNumber(services[0]?.defaultSellingPrice),
                            cost: packageDraft.useServiceCost !== false ? computeServiceCost(services[0] || buildEmptyService(userName)) : 0,
                          },
                        ],
                      })
                    }
                  >
                    <Plus className="mr-1 size-4" />
                    Add Line
                  </Button>
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Service</th>
                        <th className={`${tableHeadClass} text-center`}>Qty</th>
                        <th className={`${tableHeadClass} text-right`}>Selling</th>
                        <th className={`${tableHeadClass} text-right`}>Cost</th>
                        <th className={`${tableHeadClass} text-right`}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {packageDraft.lines.map((line) => (
                        <tr key={line.id} className="border-t border-slate-200">
                          <td className={tableCellClass}>
                            <select
                              value={line.serviceId}
                              onChange={(event) => {
                                const service = serviceMap.get(event.target.value);
                                const nextLines = packageDraft.lines.map((entry) =>
                                  entry.id === line.id
                                    ? {
                                        ...entry,
                                        serviceId: event.target.value,
                                        sellingPrice: safeNumber(service?.defaultSellingPrice),
                                        cost: packageDraft.useServiceCost !== false ? computeServiceCost(service || buildEmptyService(userName)) : entry.cost,
                                      }
                                    : entry,
                                );
                                setPackageDraft({ ...packageDraft, lines: nextLines });
                              }}
                              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700"
                            >
                              <option value="">Select service</option>
                              {services.map((service) => (
                                <option key={service.id} value={service.id}>
                                  {service.serviceName}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className={`${tableCellClass} text-center`}>
                            <Input
                              type="number"
                              value={line.quantity}
                              onChange={(event) =>
                                setPackageDraft({
                                  ...packageDraft,
                                  lines: packageDraft.lines.map((entry) =>
                                    entry.id === line.id ? { ...entry, quantity: safeNumber(event.target.value) } : entry,
                                  ),
                                })
                              }
                              className="h-9 text-center"
                            />
                          </td>
                          <td className={`${tableCellClass} text-right`}>
                            <Input
                              type="number"
                              value={line.sellingPrice}
                              onChange={(event) =>
                                setPackageDraft({
                                  ...packageDraft,
                                  lines: packageDraft.lines.map((entry) =>
                                    entry.id === line.id ? { ...entry, sellingPrice: safeNumber(event.target.value) } : entry,
                                  ),
                                })
                              }
                              className="h-9 text-right"
                            />
                          </td>
                          <td className={`${tableCellClass} text-right`}>
                            <Input
                              type="number"
                              value={line.cost}
                              onChange={(event) =>
                                setPackageDraft({
                                  ...packageDraft,
                                  lines: packageDraft.lines.map((entry) =>
                                    entry.id === line.id ? { ...entry, cost: safeNumber(event.target.value) } : entry,
                                  ),
                                })
                              }
                              className="h-9 text-right"
                            />
                          </td>
                          <td className={`${tableCellClass} text-right`}>
                            <button
                              type="button"
                              onClick={() =>
                                setPackageDraft({
                                  ...packageDraft,
                                  lines: packageDraft.lines.filter((entry) => entry.id !== line.id),
                                })
                              }
                              className="rounded p-1.5 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {packageDraft.lines.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                            No package lines added yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
              </fieldset>
            </CompactFormSection>

            {renderCalculationStrip(
              computePackageTotals(packageDraft).sellingPrice,
              computePackageTotals(packageDraft).cost,
              computePackageTotals(packageDraft).grossProfit,
              previewBreakdown.totalCommission,
              Math.max(computePackageTotals(packageDraft).grossProfit - previewBreakdown.totalCommission, 0),
            )}
          </SetupAdminColumn>
        </SetupAdminGrid>
      ) : null}

      {activeTab === 'commission-rules' ? (
        <SetupAdminGrid className="xl:grid-cols-[360px_minmax(0,1fr)]">
          <SetupAdminColumn>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Users className="size-4 text-violet-600" />
                    Commission Rules
                  </div>
                  <div className="text-xs text-slate-500">{filteredCommissionRules.length} records</div>
                </div>
                <Button
                  size="sm"
                  className="h-8 bg-violet-600 hover:bg-violet-700"
                  onClick={() => {
                    setCommissionRuleDraft(buildEmptyCommissionRule(userName));
                    setEditMode('commission-rules', true);
                  }}
                >
                  <Plus className="mr-1 size-4" />
                  New Rule
                </Button>
              </div>
              <div className="max-h-[640px] overflow-y-auto p-2">
                {filteredCommissionRules.map((rule) => (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => {
                      setCommissionRuleDraft(rule);
                      setEditMode('commission-rules', false);
                    }}
                    className={`mb-1 w-full rounded-lg border px-3 py-3 text-left transition ${
                      commissionRuleDraft.id === rule.id ? 'border-violet-300 bg-violet-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium text-slate-900">{rule.ruleName}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {rule.appliesTo} - {rule.participants.filter((participant) => participant.isActive).length} active shares
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </SetupAdminColumn>

          <SetupAdminColumn>
            <CompactFormSection
              title="Commission Rule Detail"
              icon={Users}
              iconClassName="text-violet-600"
              actions={
                editModes['commission-rules'] ? (
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveCommissionRule}>
                      <Save className="mr-1 size-4" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={handleCancelCommissionRuleEdit}>
                      <X className="mr-1 size-4" />
                      Cancel
                    </Button>
                    {isCommissionRuleExisting ? (
                      <Button size="sm" variant="outline" className="h-8 border-red-200 text-red-600 hover:bg-red-50" onClick={handleDeleteCommissionRule}>
                        <Trash2 className="mr-1 size-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                ) : isCommissionRuleExisting ? (
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setEditMode('commission-rules', true)}>
                    <Pencil className="mr-1 size-4" />
                    Edit
                  </Button>
                ) : null
              }
            >
              {!editModes['commission-rules'] && isCommissionRuleExisting ? (
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Click Edit to update this commission rule.
                </div>
              ) : null}
              <fieldset disabled={!editModes['commission-rules']} className={!editModes['commission-rules'] ? 'space-y-3 opacity-80' : 'space-y-3'}>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Rule Name</Label>
                  <Input value={commissionRuleDraft.ruleName} onChange={(event) => setCommissionRuleDraft({ ...commissionRuleDraft, ruleName: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Apply To</Label>
                  <select
                    value={commissionRuleDraft.appliesTo}
                    onChange={(event) => setCommissionRuleDraft({ ...commissionRuleDraft, appliesTo: event.target.value as SetupRcsCommissionRule['appliesTo'], targetId: '' })}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  >
                    <option value="all-rcs">All RCS</option>
                    <option value="category">Category</option>
                    <option value="service">Service</option>
                    <option value="vendor-rate">Vendor Rate</option>
                    <option value="package">Package</option>
                  </select>
                </div>
              </div>

              {commissionRuleDraft.appliesTo !== 'all-rcs' ? (
                <div className="mt-3 space-y-1.5">
                  <Label>Target</Label>
                  <select
                    value={commissionRuleDraft.targetId || ''}
                    onChange={(event) => setCommissionRuleDraft({ ...commissionRuleDraft, targetId: event.target.value })}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  >
                    <option value="">Select target</option>
                    {commissionRuleDraft.appliesTo === 'category'
                      ? categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))
                      : null}
                    {commissionRuleDraft.appliesTo === 'service'
                      ? services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.serviceName}
                          </option>
                        ))
                      : null}
                    {commissionRuleDraft.appliesTo === 'vendor-rate'
                      ? vendorRates.map((rate) => (
                          <option key={rate.id} value={rate.id}>
                            {(serviceMap.get(rate.serviceId)?.serviceName || 'Service')} - {(vendorMap.get(rate.vendorId)?.vendorName || 'Vendor')}
                          </option>
                        ))
                      : null}
                    {commissionRuleDraft.appliesTo === 'package'
                      ? packages.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.packageName}
                          </option>
                        ))
                      : null}
                  </select>
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Commission People</div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => setCommissionRuleDraft({ ...commissionRuleDraft, participants: [...commissionRuleDraft.participants, buildEmptyParticipant()] })}
                >
                  <Plus className="mr-1 size-4" />
                  Add Person
                </Button>
              </div>

              <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-[980px] w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Person Name</th>
                      <th className={tableHeadClass}>Role</th>
                      <th className={tableHeadClass}>Commission Type</th>
                      <th className={tableHeadClass}>Share Type</th>
                      <th className={`${tableHeadClass} text-right`}>Share Value</th>
                      <th className={`${tableHeadClass} text-right`}>Calculated</th>
                      <th className={`${tableHeadClass} text-right`}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissionRuleDraft.participants.map((participant) => {
                      const previewAmount =
                        previewBreakdown.allocations.find((allocation) => allocation.id === participant.id)?.calculatedAmount || 0;
                      return (
                        <tr key={participant.id} className="border-t border-slate-200">
                          <td className={tableCellClass}>
                            <Input
                              value={participant.personName}
                              onChange={(event) =>
                                setCommissionRuleDraft({
                                  ...commissionRuleDraft,
                                  participants: commissionRuleDraft.participants.map((entry) =>
                                    entry.id === participant.id ? { ...entry, personName: event.target.value } : entry,
                                  ),
                                })
                              }
                              className="h-9"
                            />
                          </td>
                          <td className={tableCellClass}>
                            <Input
                              value={participant.role}
                              onChange={(event) =>
                                setCommissionRuleDraft({
                                  ...commissionRuleDraft,
                                  participants: commissionRuleDraft.participants.map((entry) =>
                                    entry.id === participant.id ? { ...entry, role: event.target.value } : entry,
                                  ),
                                })
                              }
                              className="h-9"
                            />
                          </td>
                          <td className={tableCellClass}>
                            <select
                              value={getCommissionType(participant)}
                              disabled={participant.shareType === 'auto-remaining'}
                              onChange={(event) =>
                                setCommissionRuleDraft({
                                  ...commissionRuleDraft,
                                  participants: commissionRuleDraft.participants.map((entry) =>
                                    entry.id === participant.id ? { ...entry, commissionType: event.target.value as SetupRcsCommissionType } : entry,
                                  ),
                                })
                              }
                              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700"
                            >
                              {commissionTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className={tableCellClass}>
                            <select
                              value={participant.shareType}
                              onChange={(event) =>
                                setCommissionRuleDraft({
                                  ...commissionRuleDraft,
                                  participants: commissionRuleDraft.participants.map((entry) =>
                                    entry.id === participant.id
                                      ? {
                                          ...entry,
                                          shareType: event.target.value as SetupRcsCommissionParticipant['shareType'],
                                          commissionType:
                                            event.target.value === 'auto-remaining' ? 'company' : entry.commissionType || getCommissionType(entry),
                                          shareValue: event.target.value === 'auto-remaining' ? 0 : entry.shareValue,
                                        }
                                      : entry,
                                  ),
                                })
                              }
                              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700"
                            >
                              <option value="percentage">Percentage</option>
                              <option value="fixed-amount">Fixed Amount</option>
                              <option value="auto-remaining">Auto Remaining</option>
                            </select>
                          </td>
                          <td className={`${tableCellClass} text-right`}>
                            <Input
                              type="number"
                              value={participant.shareValue}
                              disabled={participant.shareType === 'auto-remaining' || !editModes['commission-rules']}
                              onChange={(event) =>
                                setCommissionRuleDraft({
                                  ...commissionRuleDraft,
                                  participants: commissionRuleDraft.participants.map((entry) =>
                                    entry.id === participant.id ? { ...entry, shareValue: safeNumber(event.target.value) } : entry,
                                  ),
                                })
                              }
                              className="h-9 text-right"
                            />
                          </td>
                          <td className={`${tableCellClass} text-right font-medium text-blue-700`}>{formatCurrencyPKR(previewAmount)}</td>
                          <td className={`${tableCellClass} text-right`}>
                            <button
                              type="button"
                              onClick={() =>
                                setCommissionRuleDraft({
                                  ...commissionRuleDraft,
                                  participants: commissionRuleDraft.participants.filter((entry) => entry.id !== participant.id),
                                })
                              }
                              className="rounded p-1.5 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 space-y-1.5">
                <Label>Commission Preview Base Profit</Label>
                <Input type="number" value={commissionPreviewAmount} onChange={(event) => setCommissionPreviewAmount(safeNumber(event.target.value))} />
                <p className="text-xs text-slate-500">
                  Percentages are calculated on gross profit, not on total selling price, so the company profit remains operationally meaningful.
                </p>
              </div>
              </fieldset>
            </CompactFormSection>

            {renderCalculationStrip(
              commissionPreviewAmount,
              0,
              commissionPreviewAmount,
              previewBreakdown.totalCommission,
              Math.max(commissionPreviewAmount - previewBreakdown.totalCommission, 0),
            )}
          </SetupAdminColumn>
        </SetupAdminGrid>
      ) : null}

      {activeTab === 'profit-report' ? (
        <div className="space-y-3.5">
          {renderSummaryCards()}
          <CompactFormSection title="Service Profit Report" icon={BarChart3} iconClassName="text-emerald-600">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-[1180px] w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={tableHeadClass}>Service</th>
                    <th className={`${tableHeadClass} text-right`}>Qty</th>
                    <th className={`${tableHeadClass} text-right`}>Revenue</th>
                    <th className={`${tableHeadClass} text-right`}>Vendor Cost</th>
                    <th className={`${tableHeadClass} text-right`}>Internal Cost</th>
                    <th className={`${tableHeadClass} text-right`}>Gross Profit</th>
                    <th className={`${tableHeadClass} text-right`}>Operator Commission</th>
                    <th className={`${tableHeadClass} text-right`}>Sales Commission</th>
                    <th className={`${tableHeadClass} text-right`}>Director Share</th>
                    <th className={`${tableHeadClass} text-right`}>Net Company</th>
                    <th className={`${tableHeadClass} text-right`}>Margin %</th>
                    <th className={tableHeadClass}>Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {profitReportRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-200">
                      <td className={tableCellClass}>
                        <div className="font-medium text-slate-900">{row.serviceName}</div>
                        <div className="text-xs text-slate-500">{row.categoryName} - {row.currentMode}</div>
                      </td>
                      <td className={`${tableCellClass} text-right`}>{row.soldQty}</td>
                      <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(row.revenue)}</td>
                      <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(row.vendorCost)}</td>
                      <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(row.internalCost)}</td>
                      <td className={`${tableCellClass} text-right font-semibold text-emerald-700`}>{formatCurrencyPKR(row.grossProfit)}</td>
                      <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(row.operatorCommission)}</td>
                      <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(row.salesCommission)}</td>
                      <td className={`${tableCellClass} text-right`}>{formatCurrencyPKR(row.directorShare)}</td>
                      <td className={`${tableCellClass} text-right font-semibold text-blue-700`}>{formatCurrencyPKR(row.netCompanyProfit)}</td>
                      <td className={`${tableCellClass} text-right`}>{formatPercent(row.marginPercent)}</td>
                      <td className={tableCellClass}>
                        {renderStatusBadge(row.recommendation, getRecommendationBadgeClass(row.recommendation))}
                      </td>
                    </tr>
                  ))}
                  {profitReportRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-3 py-8 text-center text-sm text-slate-500">
                        No sold RCS lines are available for this date filter.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CompactFormSection>
        </div>
      ) : null}

      {activeTab === 'approval-settings' ? (
        <SetupAdminGrid className="xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <SetupAdminColumn>
            <CompactFormSection
              title="Approval Controls"
              icon={Settings}
              iconClassName="text-slate-600"
              actions={
                editModes['approval-settings'] ? (
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveApprovalSettings}>
                      <Save className="mr-1 size-4" />
                      Save Settings
                    </Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={handleCancelApprovalSettingsEdit}>
                      <X className="mr-1 size-4" />
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setEditMode('approval-settings', true)}>
                    <Pencil className="mr-1 size-4" />
                    Edit
                  </Button>
                )
              }
            >
              {!editModes['approval-settings'] ? (
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Click Edit to update approval settings.
                </div>
              ) : null}
              <fieldset disabled={!editModes['approval-settings']} className={!editModes['approval-settings'] ? 'space-y-4 opacity-80' : 'space-y-4'}>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Minimum Gross Margin %</Label>
                    <Input
                      type="number"
                      value={approvalSettings.minimumGrossMarginPercent}
                      onChange={(event) => setApprovalSettings({ ...approvalSettings, minimumGrossMarginPercent: safeNumber(event.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Approver Roles</Label>
                    <Input
                      value={approvalSettings.approverRoles.join(', ')}
                      onChange={(event) =>
                        setApprovalSettings({
                          ...approvalSettings,
                          approverRoles: event.target.value
                            .split(',')
                            .map((value) => value.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="admin, general-manager"
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={approvalSettings.requireApprovalBelowMargin}
                      onChange={(event) => setApprovalSettings({ ...approvalSettings, requireApprovalBelowMargin: event.target.checked })}
                    />
                    Require approval for price below margin
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={approvalSettings.requireApprovalForManualSellingPrice}
                      onChange={(event) => setApprovalSettings({ ...approvalSettings, requireApprovalForManualSellingPrice: event.target.checked })}
                    />
                    Require approval for manual selling price
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={approvalSettings.requireApprovalForVendorOverride}
                      onChange={(event) => setApprovalSettings({ ...approvalSettings, requireApprovalForVendorOverride: event.target.checked })}
                    />
                    Require approval for vendor cost override
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={approvalSettings.requireApprovalForCommissionOverride}
                      onChange={(event) => setApprovalSettings({ ...approvalSettings, requireApprovalForCommissionOverride: event.target.checked })}
                    />
                    Require approval for commission override
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={approvalSettings.requireApprovalForInHouseConversion !== false}
                      onChange={(event) => setApprovalSettings({ ...approvalSettings, requireApprovalForInHouseConversion: event.target.checked })}
                    />
                    Require approval for converting to in-house
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={approvalSettings.requireApprovalForOutsourceConversion !== false}
                      onChange={(event) => setApprovalSettings({ ...approvalSettings, requireApprovalForOutsourceConversion: event.target.checked })}
                    />
                    Require approval for converting to outsourced
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={approvalSettings.requireApprovalForAssetPurchaseProposal !== false}
                      onChange={(event) => setApprovalSettings({ ...approvalSettings, requireApprovalForAssetPurchaseProposal: event.target.checked })}
                    />
                    Require approval for asset purchase proposal
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={approvalSettings.requireApprovalForVendorRateAboveBenchmark !== false}
                      onChange={(event) => setApprovalSettings({ ...approvalSettings, requireApprovalForVendorRateAboveBenchmark: event.target.checked })}
                    />
                    Require approval for vendor rate above benchmark
                  </label>
                </div>
              </fieldset>
            </CompactFormSection>
          </SetupAdminColumn>

          <SetupAdminColumn>
            <CompactFormSection title="Settlement Timing" icon={CheckCircle2} iconClassName="text-emerald-600">
              <fieldset disabled={!editModes['approval-settings']} className={!editModes['approval-settings'] ? 'space-y-4 opacity-80' : 'space-y-4'}>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Vendor Payable Due Days</Label>
                    <Input
                      type="number"
                      value={approvalSettings.vendorPayableDueDays}
                      onChange={(event) => setApprovalSettings({ ...approvalSettings, vendorPayableDueDays: safeNumber(event.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Staff Commission Due Days</Label>
                    <Input
                      type="number"
                      value={approvalSettings.staffCommissionDueDays}
                      onChange={(event) => setApprovalSettings({ ...approvalSettings, staffCommissionDueDays: safeNumber(event.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Director Share Due Days</Label>
                    <Input
                      type="number"
                      value={approvalSettings.directorShareDueDays}
                      onChange={(event) => setApprovalSettings({ ...approvalSettings, directorShareDueDays: safeNumber(event.target.value) })}
                    />
                  </div>
                </div>
              </fieldset>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm font-semibold text-slate-900">Refined RCS setup guidance</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  <li>Keep sales users limited to category, service/package, quantity, selling price, and notes.</li>
                  <li>Keep all cost, profit, and commission visibility in setup and management-only screens.</li>
                  <li>Apply commission on gross profit, not total sales, so the company share remains operationally correct.</li>
                  <li>Use vendor rates for outsourced services and service/package rules for in-house profitability.</li>
                </ul>
              </div>
            </CompactFormSection>
          </SetupAdminColumn>
        </SetupAdminGrid>
      ) : null}
    </div>
  );
}
