import {
  discountConfigDataStore,
  eventConfigDataStore,
  financialConfigDataStore,
  primeSpaceDataStore,
  rcsConfigDataStore,
  subSpaceDataStore,
  venueDataStore,
} from '../../../lib/masterDataStore';

export type SetupEventCategory = 'wedding' | 'corporate' | 'social' | 'religious' | 'other';

export interface SetupEventType {
  id: string;
  name: string;
  displayName: string;
  category: SetupEventCategory;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  notes?: string;
}

export interface SetupAdvancePolicy {
  id: string;
  primeSpaceMinimumAdvance: number;
  subSpaceMinimumAdvance: number;
  dueDaysAfterBooking: number;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface SetupDiscount {
  id: string;
  discountCategory: string;
  discountType: 'percentage' | 'fixed-per-head';
  maximumValue: number;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface SetupTaxDefinition {
  id: string;
  taxName: string;
  taxCode: string;
  taxPercentage: number;
  taxBasis: 'full-invoice' | 'agreed-taxable' | 'service-based';
  taxCalculationType: 'inclusive' | 'exclusive';
  applicableToFood: boolean;
  applicableToServices: boolean;
  applicableToDecor: boolean;
  effectiveDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  notes?: string;
}

export type SetupRcsUnitType =
  | 'event'
  | 'item'
  | 'hour'
  | 'day'
  | 'person'
  | 'stage'
  | 'setup'
  | 'package';

export type SetupRcsFulfillmentType = 'in-house' | 'outsourced';
export type SetupRcsShareType = 'percentage' | 'fixed-amount' | 'auto-remaining';
export type SetupRcsRuleScope = 'all-rcs' | 'category' | 'service' | 'vendor-rate' | 'package';
export type SetupRcsPackageType = 'in-house' | 'outsourced' | 'mixed';
export type SetupRcsCommissionType = 'sales' | 'operator' | 'director' | 'company';
export type SetupRcsVendorStatus = 'preferred' | 'backup' | 'standard';
export type SetupRcsNegotiationStatus = 'not-started' | 'pending' | 'negotiated' | 'approved' | 'rejected';

export interface SetupRcsCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  targetMarginPercent?: number;
  defaultFulfillmentMode?: SetupRcsFulfillmentType;
  showInReservation?: boolean;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface SetupRcsService {
  id: string;
  categoryId: string;
  serviceName: string;
  unitType: SetupRcsUnitType;
  defaultSellingPrice: number;
  fulfillmentType: SetupRcsFulfillmentType;
  vendorCost?: number;
  internalCost?: number;
  estimatedInHouseCost?: number;
  estimatedVendorCost?: number;
  assetRequired?: boolean;
  assetPurchaseCost?: number;
  operatorRequired?: boolean;
  suggestedOperatorCommission?: number;
  targetMarginPercent?: number;
  marketVendorRate?: number;
  showInReservation?: boolean;
  autoCreateVendorPayable?: boolean;
  autoCreateCommissionPayable?: boolean;
  commissionRuleId?: string;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface SetupRcsVendor {
  id: string;
  vendorName: string;
  contactPerson?: string;
  phone?: string;
  city?: string;
  vendorCategory?: string;
  reliabilityRating?: number;
  qualityRating?: number;
  paymentTerms?: string;
  vendorStatus?: SetupRcsVendorStatus;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface SetupRcsVendorRate {
  id: string;
  serviceId: string;
  vendorId: string;
  vendorPrice: number;
  sellingPrice: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  isSeasonRate?: boolean;
  includesTransport?: boolean;
  includesOperator?: boolean;
  includesEquipment?: boolean;
  marketBenchmarkRate?: number;
  negotiationStatus?: SetupRcsNegotiationStatus;
  isPreferred: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface SetupRcsPackageLine {
  id: string;
  serviceId: string;
  quantity: number;
  sellingPrice: number;
  cost: number;
}

export interface SetupRcsPackage {
  id: string;
  packageName: string;
  packageType: SetupRcsPackageType;
  packageFulfillmentMode?: SetupRcsPackageType;
  useServiceCost?: boolean;
  packageCostOverrideEnabled?: boolean;
  packageCostOverride?: number;
  packageTargetMarginPercent?: number;
  approvalRequiredBelowMargin?: boolean;
  categoryId?: string;
  commissionRuleId?: string;
  notes?: string;
  lines: SetupRcsPackageLine[];
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface SetupRcsCommissionParticipant {
  id: string;
  personName: string;
  role: string;
  commissionType?: SetupRcsCommissionType;
  shareType: SetupRcsShareType;
  shareValue: number;
  isActive: boolean;
}

export interface SetupRcsCommissionRule {
  id: string;
  ruleName: string;
  appliesTo: SetupRcsRuleScope;
  targetId?: string;
  participants: SetupRcsCommissionParticipant[];
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface SetupRcsApprovalSettings {
  id: string;
  minimumGrossMarginPercent: number;
  requireApprovalBelowMargin: boolean;
  requireApprovalForManualSellingPrice: boolean;
  requireApprovalForVendorOverride: boolean;
  requireApprovalForCommissionOverride: boolean;
  requireApprovalForInHouseConversion?: boolean;
  requireApprovalForOutsourceConversion?: boolean;
  requireApprovalForAssetPurchaseProposal?: boolean;
  requireApprovalForVendorRateAboveBenchmark?: boolean;
  approverRoles: string[];
  vendorPayableDueDays: number;
  staffCommissionDueDays: number;
  directorShareDueDays: number;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export const defaultSetupEventTypes: SetupEventType[] = [
  {
    id: 'event-1',
    name: 'wedding',
    displayName: 'Wedding',
    category: 'wedding',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
    notes: 'General wedding booking.',
  },
  {
    id: 'event-2',
    name: 'walima',
    displayName: 'Walima',
    category: 'wedding',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
    notes: 'Reception event type.',
  },
  {
    id: 'event-3',
    name: 'mehndi',
    displayName: 'Mehndi',
    category: 'wedding',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
  {
    id: 'event-4',
    name: 'corporate-event',
    displayName: 'Corporate Event',
    category: 'corporate',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
];

export const defaultSetupAdvancePolicy: SetupAdvancePolicy = {
  id: 'advance-policy-default',
  primeSpaceMinimumAdvance: 100000,
  subSpaceMinimumAdvance: 50000,
  dueDaysAfterBooking: 7,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  createdBy: 'Admin',
};

export const defaultSetupDiscounts: SetupDiscount[] = [
  {
    id: 'discount-1',
    discountCategory: 'Director Approval',
    discountType: 'fixed-per-head',
    maximumValue: 250,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
  {
    id: 'discount-2',
    discountCategory: 'Government Department',
    discountType: 'fixed-per-head',
    maximumValue: 200,
    isActive: true,
    createdAt: new Date('2024-01-05'),
    createdBy: 'Admin',
  },
  {
    id: 'discount-3',
    discountCategory: 'Business Strategy',
    discountType: 'percentage',
    maximumValue: 10,
    isActive: true,
    createdAt: new Date('2024-01-10'),
    createdBy: 'Admin',
  },
];

export const defaultSetupTaxes: SetupTaxDefinition[] = [
  {
    id: 'tax-1',
    taxName: 'PRA',
    taxCode: 'TAX001',
    taxPercentage: 16,
    taxBasis: 'full-invoice',
    taxCalculationType: 'exclusive',
    applicableToFood: true,
    applicableToServices: true,
    applicableToDecor: true,
    effectiveDate: '2024-01-01',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
    notes: 'Punjab Revenue Authority tax.',
  },
  {
    id: 'tax-2',
    taxName: 'Withholding',
    taxCode: 'TAX002',
    taxPercentage: 10,
    taxBasis: 'agreed-taxable',
    taxCalculationType: 'exclusive',
    applicableToFood: false,
    applicableToServices: true,
    applicableToDecor: false,
    effectiveDate: '2024-01-01',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
    notes: 'Withholding tax for applicable services.',
  },
  {
    id: 'tax-3',
    taxName: 'Service Tax',
    taxCode: 'TAX003',
    taxPercentage: 5,
    taxBasis: 'service-based',
    taxCalculationType: 'exclusive',
    applicableToFood: false,
    applicableToServices: true,
    applicableToDecor: true,
    effectiveDate: '2024-06-01',
    isActive: false,
    createdAt: new Date('2024-01-15'),
    createdBy: 'Admin',
    notes: 'Service-linked tax definition.',
  },
];

export const defaultSetupRcsCategories: SetupRcsCategory[] = [
  {
    id: 'rcs-category-decor',
    code: 'DECOR',
    name: 'Decor',
    description: 'Stage, floral, gate, walkway and venue dressing services.',
    targetMarginPercent: 35,
    defaultFulfillmentMode: 'in-house',
    showInReservation: true,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
  {
    id: 'rcs-category-audio',
    code: 'AUDIO',
    name: 'Audio & Lights',
    description: 'DJ sound, lighting and screen-based services.',
    targetMarginPercent: 30,
    defaultFulfillmentMode: 'outsourced',
    showInReservation: true,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
  {
    id: 'rcs-category-media',
    code: 'MEDIA',
    name: 'Media',
    description: 'Photography and coverage services.',
    targetMarginPercent: 32,
    defaultFulfillmentMode: 'outsourced',
    showInReservation: true,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
];

export const defaultSetupRcsServices: SetupRcsService[] = [
  {
    id: 'rcs-service-stage-decor',
    categoryId: 'rcs-category-decor',
    serviceName: 'Stage Decor',
    unitType: 'event',
    defaultSellingPrice: 50000,
    fulfillmentType: 'in-house',
    internalCost: 22000,
    estimatedInHouseCost: 22000,
    estimatedVendorCost: 34000,
    assetRequired: true,
    assetPurchaseCost: 180000,
    operatorRequired: true,
    suggestedOperatorCommission: 2500,
    targetMarginPercent: 35,
    marketVendorRate: 34000,
    showInReservation: true,
    autoCreateVendorPayable: false,
    autoCreateCommissionPayable: true,
    commissionRuleId: 'rcs-commission-standard',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
  {
    id: 'rcs-service-entrance-gate',
    categoryId: 'rcs-category-decor',
    serviceName: 'Entrance Gate',
    unitType: 'event',
    defaultSellingPrice: 18000,
    fulfillmentType: 'in-house',
    internalCost: 7500,
    estimatedInHouseCost: 7500,
    estimatedVendorCost: 12000,
    assetRequired: false,
    assetPurchaseCost: 0,
    operatorRequired: true,
    suggestedOperatorCommission: 1000,
    targetMarginPercent: 35,
    marketVendorRate: 12000,
    showInReservation: true,
    autoCreateVendorPayable: false,
    autoCreateCommissionPayable: true,
    commissionRuleId: 'rcs-commission-standard',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
  {
    id: 'rcs-service-dj-sound',
    categoryId: 'rcs-category-audio',
    serviceName: 'DJ Sound',
    unitType: 'event',
    defaultSellingPrice: 5000,
    fulfillmentType: 'outsourced',
    vendorCost: 2500,
    estimatedInHouseCost: 1800,
    estimatedVendorCost: 2500,
    assetRequired: false,
    assetPurchaseCost: 0,
    operatorRequired: false,
    suggestedOperatorCommission: 0,
    targetMarginPercent: 30,
    marketVendorRate: 3000,
    showInReservation: true,
    autoCreateVendorPayable: true,
    autoCreateCommissionPayable: true,
    commissionRuleId: 'rcs-commission-standard',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
  {
    id: 'rcs-service-led-screen',
    categoryId: 'rcs-category-audio',
    serviceName: 'LED Screen',
    unitType: 'event',
    defaultSellingPrice: 30000,
    fulfillmentType: 'outsourced',
    vendorCost: 17000,
    estimatedInHouseCost: 12000,
    estimatedVendorCost: 17000,
    assetRequired: true,
    assetPurchaseCost: 250000,
    operatorRequired: true,
    suggestedOperatorCommission: 1500,
    targetMarginPercent: 30,
    marketVendorRate: 18000,
    showInReservation: true,
    autoCreateVendorPayable: true,
    autoCreateCommissionPayable: true,
    commissionRuleId: 'rcs-commission-standard',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
  {
    id: 'rcs-service-photography',
    categoryId: 'rcs-category-media',
    serviceName: 'Photography',
    unitType: 'event',
    defaultSellingPrice: 40000,
    fulfillmentType: 'outsourced',
    vendorCost: 25000,
    estimatedInHouseCost: 21000,
    estimatedVendorCost: 25000,
    assetRequired: false,
    assetPurchaseCost: 0,
    operatorRequired: false,
    suggestedOperatorCommission: 0,
    targetMarginPercent: 32,
    marketVendorRate: 26000,
    showInReservation: true,
    autoCreateVendorPayable: true,
    autoCreateCommissionPayable: true,
    commissionRuleId: 'rcs-commission-premium',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
];

export const defaultSetupRcsVendors: SetupRcsVendor[] = [
  {
    id: 'rcs-vendor-abc-dj',
    vendorName: 'ABC DJ',
    contactPerson: 'Ali Raza',
    phone: '0300-1111111',
    city: 'Lahore',
    vendorCategory: 'Audio & Lights',
    reliabilityRating: 4,
    qualityRating: 4,
    paymentTerms: '7 days after event',
    vendorStatus: 'preferred',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
  {
    id: 'rcs-vendor-led-pro',
    vendorName: 'LED Pro Vision',
    contactPerson: 'Hamza Khan',
    phone: '0321-2222222',
    city: 'Lahore',
    vendorCategory: 'Audio & Lights',
    reliabilityRating: 5,
    qualityRating: 4,
    paymentTerms: '50% advance, balance after event',
    vendorStatus: 'preferred',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
  {
    id: 'rcs-vendor-media-house',
    vendorName: 'Media House Studio',
    contactPerson: 'Sara Qureshi',
    phone: '0333-3333333',
    city: 'Lahore',
    vendorCategory: 'Media',
    reliabilityRating: 4,
    qualityRating: 5,
    paymentTerms: '7 days after delivery',
    vendorStatus: 'preferred',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
];

export const defaultSetupRcsVendorRates: SetupRcsVendorRate[] = [
  {
    id: 'rcs-rate-dj-abc',
    serviceId: 'rcs-service-dj-sound',
    vendorId: 'rcs-vendor-abc-dj',
    vendorPrice: 2500,
    sellingPrice: 5000,
    effectiveFrom: '2024-01-01',
    effectiveTo: '',
    isSeasonRate: false,
    includesTransport: true,
    includesOperator: true,
    includesEquipment: true,
    marketBenchmarkRate: 3000,
    negotiationStatus: 'approved',
    isPreferred: true,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
  {
    id: 'rcs-rate-led-pro',
    serviceId: 'rcs-service-led-screen',
    vendorId: 'rcs-vendor-led-pro',
    vendorPrice: 17000,
    sellingPrice: 30000,
    effectiveFrom: '2024-01-01',
    effectiveTo: '',
    isSeasonRate: true,
    includesTransport: true,
    includesOperator: true,
    includesEquipment: true,
    marketBenchmarkRate: 18000,
    negotiationStatus: 'approved',
    isPreferred: true,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
  {
    id: 'rcs-rate-media-house',
    serviceId: 'rcs-service-photography',
    vendorId: 'rcs-vendor-media-house',
    vendorPrice: 25000,
    sellingPrice: 40000,
    effectiveFrom: '2024-01-01',
    effectiveTo: '',
    isSeasonRate: false,
    includesTransport: false,
    includesOperator: true,
    includesEquipment: true,
    marketBenchmarkRate: 26000,
    negotiationStatus: 'approved',
    isPreferred: true,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
];

export const defaultSetupRcsPackages: SetupRcsPackage[] = [
  {
    id: 'rcs-package-decor-signature',
    packageName: 'Decor Signature Package',
    packageType: 'in-house',
    packageFulfillmentMode: 'in-house',
    useServiceCost: true,
    packageCostOverrideEnabled: false,
    packageCostOverride: 0,
    packageTargetMarginPercent: 35,
    approvalRequiredBelowMargin: true,
    categoryId: 'rcs-category-decor',
    commissionRuleId: 'rcs-commission-premium',
    notes: 'Balanced decor package for core wedding setup.',
    lines: [
      { id: 'rcs-package-line-1', serviceId: 'rcs-service-stage-decor', quantity: 1, sellingPrice: 50000, cost: 22000 },
      { id: 'rcs-package-line-2', serviceId: 'rcs-service-entrance-gate', quantity: 1, sellingPrice: 18000, cost: 7500 },
    ],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
  {
    id: 'rcs-package-media-premium',
    packageName: 'Media Premium Package',
    packageType: 'mixed',
    packageFulfillmentMode: 'mixed',
    useServiceCost: true,
    packageCostOverrideEnabled: false,
    packageCostOverride: 0,
    packageTargetMarginPercent: 32,
    approvalRequiredBelowMargin: true,
    categoryId: 'rcs-category-media',
    commissionRuleId: 'rcs-commission-premium',
    lines: [
      { id: 'rcs-package-line-3', serviceId: 'rcs-service-photography', quantity: 1, sellingPrice: 40000, cost: 25000 },
      { id: 'rcs-package-line-4', serviceId: 'rcs-service-led-screen', quantity: 1, sellingPrice: 30000, cost: 17000 },
    ],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
];

export const defaultSetupRcsCommissionRules: SetupRcsCommissionRule[] = [
  {
    id: 'rcs-commission-standard',
    ruleName: 'Standard RCS Share',
    appliesTo: 'all-rcs',
    participants: [
      {
        id: 'rcs-participant-ali',
        personName: 'Ali',
        role: 'FO',
        commissionType: 'sales',
        shareType: 'percentage',
        shareValue: 10,
        isActive: true,
      },
      {
        id: 'rcs-participant-manager',
        personName: 'Manager',
        role: 'Manager',
        commissionType: 'sales',
        shareType: 'fixed-amount',
        shareValue: 500,
        isActive: true,
      },
      {
        id: 'rcs-participant-company',
        personName: 'Company',
        role: 'Company',
        commissionType: 'company',
        shareType: 'auto-remaining',
        shareValue: 0,
        isActive: true,
      },
    ],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
  {
    id: 'rcs-commission-premium',
    ruleName: 'Director Premium Share',
    appliesTo: 'package',
    participants: [
      {
        id: 'rcs-participant-fo-premium',
        personName: 'Ali',
        role: 'FO',
        commissionType: 'sales',
        shareType: 'percentage',
        shareValue: 10,
        isActive: true,
      },
      {
        id: 'rcs-participant-director',
        personName: 'Director',
        role: 'Director',
        commissionType: 'director',
        shareType: 'percentage',
        shareValue: 20,
        isActive: true,
      },
      {
        id: 'rcs-participant-company-premium',
        personName: 'Company',
        role: 'Company',
        commissionType: 'company',
        shareType: 'auto-remaining',
        shareValue: 0,
        isActive: true,
      },
    ],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
];

export const defaultSetupRcsApprovalSettings: SetupRcsApprovalSettings = {
  id: 'rcs-approval-default',
  minimumGrossMarginPercent: 20,
  requireApprovalBelowMargin: true,
  requireApprovalForManualSellingPrice: true,
  requireApprovalForVendorOverride: true,
  requireApprovalForCommissionOverride: true,
  requireApprovalForInHouseConversion: true,
  requireApprovalForOutsourceConversion: true,
  requireApprovalForAssetPurchaseProposal: true,
  requireApprovalForVendorRateAboveBenchmark: true,
  approverRoles: ['admin', 'general-manager'],
  vendorPayableDueDays: 7,
  staffCommissionDueDays: 3,
  directorShareDueDays: 7,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  createdBy: 'Admin',
};

export interface LiveVenueRecord {
  id: string;
  venueName: string;
  venueCode?: string;
  city?: string;
  area?: string;
  isActive?: boolean;
  balanceDueDaysBeforeEvent?: number;
}

export interface LivePrimeSpaceRecord {
  id: string;
  venueId: string;
  spaceName: string;
  defaultSeatingCapacity?: number;
  isActive?: boolean;
}

export interface LiveSubSpaceRecord {
  id: string;
  primeSpaceId: string;
  subSpaceName: string;
  customCapacity?: number;
  isActive?: boolean;
}

export function loadSetupEventTypes() {
  const loaded = eventConfigDataStore.getEventTypes(defaultSetupEventTypes as any[]);
  return loaded.map((item: any) => ({
    ...item,
    name: item.name || item.eventTypeName || slugifyEventTypeName(item.displayName || item.name || ''),
    displayName: item.displayName || item.eventTypeName || item.name || '',
    category: item.category || 'other',
    isActive: item.isActive !== false,
    createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
  })) as SetupEventType[];
}

export function saveSetupEventTypes(eventTypes: SetupEventType[]) {
  eventConfigDataStore.saveEventTypes(eventTypes);
}

export function loadSetupAdvancePolicy() {
  const loaded = financialConfigDataStore.getAdvanceRules([defaultSetupAdvancePolicy] as any[]);
  const policy = Array.isArray(loaded) ? loaded[0] : loaded;

  return {
    ...defaultSetupAdvancePolicy,
    ...policy,
    createdAt: policy?.createdAt ? new Date(policy.createdAt) : defaultSetupAdvancePolicy.createdAt,
    updatedAt: policy?.updatedAt ? new Date(policy.updatedAt) : undefined,
    isActive: policy?.isActive !== false,
  } as SetupAdvancePolicy;
}

export function saveSetupAdvancePolicy(policy: SetupAdvancePolicy) {
  financialConfigDataStore.saveAdvanceRules([policy]);
}

export function loadSetupDiscounts() {
  const loaded = discountConfigDataStore.getDiscounts(defaultSetupDiscounts as any[]);
  return loaded.map((item: any) => ({
    ...item,
    createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
    isActive: item.isActive !== false,
  })) as SetupDiscount[];
}

export function saveSetupDiscounts(discounts: SetupDiscount[]) {
  discountConfigDataStore.saveDiscounts(discounts);
}

export function loadSetupTaxes() {
  const loaded = financialConfigDataStore.getTaxGroups(defaultSetupTaxes as any[]);
  return loaded.map((item: any) => ({
    ...item,
    taxName: item?.taxName || item?.name || '',
    taxCode: item?.taxCode || item?.code || '',
    taxPercentage: Number(item?.taxPercentage ?? item?.rate ?? 0) || 0,
    taxBasis: item?.taxBasis || 'full-invoice',
    taxCalculationType: item?.taxCalculationType || 'exclusive',
    applicableToFood: item?.applicableToFood !== false,
    applicableToServices: item?.applicableToServices !== false,
    applicableToDecor: item?.applicableToDecor !== false,
    effectiveDate: item?.effectiveDate || new Date().toISOString().split('T')[0],
    createdAt: item?.createdAt ? new Date(item.createdAt) : new Date(),
    updatedAt: item?.updatedAt ? new Date(item.updatedAt) : undefined,
    isActive: item?.isActive !== false,
  })) as SetupTaxDefinition[];
}

export function saveSetupTaxes(taxes: SetupTaxDefinition[]) {
  financialConfigDataStore.saveTaxGroups(taxes);
}

const asDate = (value: unknown, fallback = new Date()) => {
  if (!value) {
    return fallback;
  }

  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

export function loadSetupRcsCategories() {
  const loaded = rcsConfigDataStore.getCategories(defaultSetupRcsCategories as any[]);
  return loaded.map((item: any) => ({
    ...item,
    targetMarginPercent: Number(item?.targetMarginPercent ?? 30) || 0,
    defaultFulfillmentMode: item?.defaultFulfillmentMode === 'outsourced' ? 'outsourced' : 'in-house',
    showInReservation: item?.showInReservation !== false,
    isActive: item?.isActive !== false,
    createdAt: asDate(item?.createdAt),
    updatedAt: item?.updatedAt ? asDate(item.updatedAt) : undefined,
  })) as SetupRcsCategory[];
}

export function saveSetupRcsCategories(categories: SetupRcsCategory[]) {
  rcsConfigDataStore.saveCategories(categories);
}

export function loadSetupRcsServices() {
  const loaded = rcsConfigDataStore.getServices(defaultSetupRcsServices as any[]);
  return loaded.map((item: any) => ({
    ...item,
    serviceName: item?.serviceName || item?.name || '',
    unitType: item?.unitType || 'event',
    fulfillmentType:
      item?.fulfillmentType === 'outsourced' || item?.source === 'Outsource' ? 'outsourced' : 'in-house',
    defaultSellingPrice: Number(item?.defaultSellingPrice ?? item?.basePrice ?? item?.price ?? 0) || 0,
    vendorCost: Number(item?.vendorCost ?? item?.costRate ?? 0) || 0,
    internalCost: Number(item?.internalCost ?? 0) || 0,
    estimatedInHouseCost: Number(item?.estimatedInHouseCost ?? item?.internalCost ?? 0) || 0,
    estimatedVendorCost: Number(item?.estimatedVendorCost ?? item?.vendorCost ?? item?.marketVendorRate ?? 0) || 0,
    assetRequired: item?.assetRequired === true,
    assetPurchaseCost: Number(item?.assetPurchaseCost ?? 0) || 0,
    operatorRequired: item?.operatorRequired === true,
    suggestedOperatorCommission: Number(item?.suggestedOperatorCommission ?? 0) || 0,
    targetMarginPercent: Number(item?.targetMarginPercent ?? 30) || 0,
    marketVendorRate: Number(item?.marketVendorRate ?? item?.vendorCost ?? 0) || 0,
    showInReservation: item?.showInReservation !== false,
    autoCreateVendorPayable: item?.autoCreateVendorPayable !== false,
    autoCreateCommissionPayable: item?.autoCreateCommissionPayable !== false,
    isActive: item?.isActive !== false,
    createdAt: asDate(item?.createdAt),
    updatedAt: item?.updatedAt ? asDate(item.updatedAt) : undefined,
  })) as SetupRcsService[];
}

export function saveSetupRcsServices(services: SetupRcsService[]) {
  rcsConfigDataStore.saveServices(services);
}

export function loadSetupRcsVendors() {
  const loaded = rcsConfigDataStore.getVendors(defaultSetupRcsVendors as any[]);
  return loaded.map((item: any) => ({
    ...item,
    vendorName: item?.vendorName || item?.name || '',
    vendorCategory: item?.vendorCategory || 'General',
    reliabilityRating: Number(item?.reliabilityRating ?? 3) || 0,
    qualityRating: Number(item?.qualityRating ?? 3) || 0,
    paymentTerms: item?.paymentTerms || '',
    vendorStatus:
      item?.vendorStatus === 'preferred' || item?.vendorStatus === 'backup' ? item.vendorStatus : 'standard',
    isActive: item?.isActive !== false,
    createdAt: asDate(item?.createdAt),
    updatedAt: item?.updatedAt ? asDate(item.updatedAt) : undefined,
  })) as SetupRcsVendor[];
}

export function saveSetupRcsVendors(vendors: SetupRcsVendor[]) {
  rcsConfigDataStore.saveVendors(vendors);
}

export function loadSetupRcsVendorRates() {
  const loaded = rcsConfigDataStore.getVendorRates(defaultSetupRcsVendorRates as any[]);
  return loaded.map((item: any) => ({
    ...item,
    vendorPrice: Number(item?.vendorPrice ?? item?.costRate ?? 0) || 0,
    sellingPrice: Number(item?.sellingPrice ?? item?.price ?? 0) || 0,
    effectiveFrom: item?.effectiveFrom || '',
    effectiveTo: item?.effectiveTo || '',
    isSeasonRate: item?.isSeasonRate === true,
    includesTransport: item?.includesTransport === true,
    includesOperator: item?.includesOperator === true,
    includesEquipment: item?.includesEquipment === true,
    marketBenchmarkRate: Number(item?.marketBenchmarkRate ?? item?.vendorPrice ?? item?.costRate ?? 0) || 0,
    negotiationStatus:
      ['not-started', 'pending', 'negotiated', 'approved', 'rejected'].includes(item?.negotiationStatus)
        ? item.negotiationStatus
        : 'not-started',
    isPreferred: item?.isPreferred === true,
    isActive: item?.isActive !== false,
    createdAt: asDate(item?.createdAt),
    updatedAt: item?.updatedAt ? asDate(item.updatedAt) : undefined,
  })) as SetupRcsVendorRate[];
}

export function saveSetupRcsVendorRates(rates: SetupRcsVendorRate[]) {
  rcsConfigDataStore.saveVendorRates(rates);
}

export function loadSetupRcsPackages() {
  const loaded = rcsConfigDataStore.getPackages(defaultSetupRcsPackages as any[]);
  return loaded.map((item: any) => ({
    ...item,
    packageType: item?.packageFulfillmentMode || item?.packageType || 'mixed',
    packageFulfillmentMode: item?.packageFulfillmentMode || item?.packageType || 'mixed',
    useServiceCost: item?.useServiceCost !== false,
    packageCostOverrideEnabled: item?.packageCostOverrideEnabled === true,
    packageCostOverride: Number(item?.packageCostOverride ?? 0) || 0,
    packageTargetMarginPercent: Number(item?.packageTargetMarginPercent ?? 30) || 0,
    approvalRequiredBelowMargin: item?.approvalRequiredBelowMargin !== false,
    lines: Array.isArray(item?.lines)
      ? item.lines.map((line: any) => ({
          ...line,
          quantity: Number(line?.quantity ?? 0) || 0,
          sellingPrice: Number(line?.sellingPrice ?? line?.price ?? 0) || 0,
          cost: Number(line?.cost ?? 0) || 0,
        }))
      : [],
    isActive: item?.isActive !== false,
    createdAt: asDate(item?.createdAt),
    updatedAt: item?.updatedAt ? asDate(item.updatedAt) : undefined,
  })) as SetupRcsPackage[];
}

export function saveSetupRcsPackages(packages: SetupRcsPackage[]) {
  rcsConfigDataStore.savePackages(packages);
}

export function loadSetupRcsCommissionRules() {
  const loaded = rcsConfigDataStore.getCommissionRules(defaultSetupRcsCommissionRules as any[]);
  return loaded.map((item: any) => ({
    ...item,
    participants: Array.isArray(item?.participants)
      ? item.participants.map((participant: any) => ({
          ...participant,
          commissionType:
            participant?.shareType === 'auto-remaining'
              ? 'company'
              : participant?.commissionType ||
            (/director/i.test(participant?.role || '') ? 'director' : /company/i.test(participant?.role || '') ? 'company' : /operator/i.test(participant?.role || '') ? 'operator' : 'sales'),
          shareType: participant?.shareType || 'percentage',
          shareValue: Number(participant?.shareValue ?? 0) || 0,
          isActive: participant?.isActive !== false,
        }))
      : [],
    isActive: item?.isActive !== false,
    createdAt: asDate(item?.createdAt),
    updatedAt: item?.updatedAt ? asDate(item.updatedAt) : undefined,
  })) as SetupRcsCommissionRule[];
}

export function saveSetupRcsCommissionRules(rules: SetupRcsCommissionRule[]) {
  rcsConfigDataStore.saveCommissionRules(rules);
}

export function loadSetupRcsApprovalSettings() {
  const loaded = rcsConfigDataStore.getApprovalSettings(defaultSetupRcsApprovalSettings as any);
  return {
    ...defaultSetupRcsApprovalSettings,
    ...loaded,
    approverRoles: Array.isArray((loaded as any)?.approverRoles)
      ? (loaded as any).approverRoles
      : defaultSetupRcsApprovalSettings.approverRoles,
    requireApprovalForInHouseConversion: (loaded as any)?.requireApprovalForInHouseConversion !== false,
    requireApprovalForOutsourceConversion: (loaded as any)?.requireApprovalForOutsourceConversion !== false,
    requireApprovalForAssetPurchaseProposal: (loaded as any)?.requireApprovalForAssetPurchaseProposal !== false,
    requireApprovalForVendorRateAboveBenchmark: (loaded as any)?.requireApprovalForVendorRateAboveBenchmark !== false,
    createdAt: asDate((loaded as any)?.createdAt, defaultSetupRcsApprovalSettings.createdAt),
    updatedAt: (loaded as any)?.updatedAt ? asDate((loaded as any).updatedAt) : undefined,
    isActive: (loaded as any)?.isActive !== false,
  } as SetupRcsApprovalSettings;
}

export function saveSetupRcsApprovalSettings(settings: SetupRcsApprovalSettings) {
  rcsConfigDataStore.saveApprovalSettings(settings);
}

export function loadLiveVenueInventory() {
  const venues = venueDataStore.getVenues([] as any[]);
  const primeSpaces = primeSpaceDataStore.getPrimeSpaces([] as any[]);
  const subSpaces = subSpaceDataStore.getSubSpaces([] as any[]);

  return {
    venues: venues.filter((item: any) => item.isActive !== false) as LiveVenueRecord[],
    primeSpaces: primeSpaces.filter((item: any) => item.isActive !== false) as LivePrimeSpaceRecord[],
    subSpaces: subSpaces.filter((item: any) => item.isActive !== false) as LiveSubSpaceRecord[],
  };
}

export function slugifyEventTypeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}
