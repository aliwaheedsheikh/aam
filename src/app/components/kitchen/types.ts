// Kitchen Management System - Data Types

// ==================== ENUMS ====================

export type KitchenModule = 'banquet' | 'restaurant';

export type CuisineStatus = 'active' | 'inactive';

export type DishStatus = 'draft' | 'approved' | 'inactive';

export type ProductionType = 'in-house' | 'purchased' | 'recipe-based' | 'purchased-ready' | 'service-item';

export type IssuedFrom = 'kitchen' | 'banquet-store';

export type UnitOfSale = string;

export type UnitFamily = 'weight' | 'volume' | 'count' | 'package' | 'service';

export type UnitStatus = 'active' | 'inactive';

export type MenuItemSourceType =
  | 'in-house-produced'
  | 'purchased-for-resale'
  | 'outsourced';

export type PreparationArea = string;

export type KitchenStationModule = KitchenModule | 'shared';

export type KitchenStationStatus = 'active' | 'inactive';

export type KitchenStationProductionType = 'production' | 'service' | 'both';

export type DishCategory = string;

export type DishCategoryModule = KitchenModule | 'shared';

export type DishCategoryStatus = 'active' | 'inactive';

export type MenuPackageTypeStatus = 'active' | 'inactive';

export type MeasurementUnit = string;

export type StoreLocation = string;

export type StoreStatus = 'active' | 'inactive';

export type StoreKind = 'store' | 'sub-store';

export type StorePurpose = 'storage' | 'production';

export type VendorCategory = string;

export type ProcurementLookupKind = 'vendorType' | 'supplyCategory' | 'purchaseCategory' | 'purchaseSubCategory';

export type ProcurementLookupStatus = 'active' | 'inactive';

export interface ProcurementLookupValue {
  id: string;
  code: string;
  name: string;
  parentId?: string;
  status: ProcurementLookupStatus;
  sortOrder?: number;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcurementLookupState {
  vendorTypes: ProcurementLookupValue[];
  supplyCategories: ProcurementLookupValue[];
  purchaseCategories: ProcurementLookupValue[];
  purchaseSubCategories: ProcurementLookupValue[];
}

export type PaymentTerms = 'cash' | 'credit-7' | 'credit-15' | 'credit-30' | 'credit-60';

export type PurchaseOrderStatus = 'draft' | 'approved' | 'received' | 'partially-received' | 'cancelled';

export type VendorSupplyScope =
  | 'approved_items_only'
  | 'all_items_in_selected_categories'
  | 'selected_categories_with_exceptions';

export type VendorCategoryScopeType = 'all_subcategories' | 'selected_subcategories';

export interface VendorItemMapping {
  id: string;
  vendorId: string;
  kitchenItemId: string;
  isPreferred: boolean;
  leadTimeDays?: number;
  moq?: number;
  lastRate?: number;
  contractRate?: number;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ItemCategory = 
  | 'raw-material' 
  | 'ready-made' 
  | 'consumable' 
  | 'beverage'
  | 'packaging';

export type InventoryType =
  | 'raw-material'
  | 'semi-finished-product'
  | 'finished-product'
  | 'packaging-material';

export type CostingMethod =
  | 'weighted-average'
  | 'last-purchase-rate'
  | 'standard-cost'
  | 'fifo-costing';

export type IssueMethod =
  | 'fifo'
  | 'lifo'
  | 'fefo'
  | 'specific-batch';

// ==================== INTERFACES ====================

// Cuisine Master
export interface Cuisine {
  id: string;
  cuisineId?: string;
  cuisineCode?: string;
  cuisineName?: string;
  name: string;
  description?: string;
  linkedDishesCount?: number;
  module: KitchenModule; // 'banquet' or 'restaurant'
  status: CuisineStatus;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt: Date;
}

export interface KitchenStation {
  id: string;
  stationId?: string;
  stationCode?: string;
  stationName?: string;
  code: string;
  name: string;
  module: KitchenStationModule;
  productionType?: KitchenStationProductionType;
  status: KitchenStationStatus;
  linkedStoreId?: StoreLocation;
  linkedStoreName?: string;
  linkedStoreLocation?: StoreLocation;
  description?: string;
  linkedDishesCount?: number;
  linkedRecipesCount?: number;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt: Date;
}

export interface StoreMaster {
  id: string;
  code: string;
  name: string;
  kind: StoreKind;
  purpose: StorePurpose;
  parentStoreId?: string;
  status: StoreStatus;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KitchenDishCategory {
  id: string;
  categoryId?: string;
  categoryCode?: string;
  categoryName?: string;
  code: string;
  name: string;
  description?: string;
  linkedDishesCount?: number;
  module: DishCategoryModule;
  status: DishCategoryStatus;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt: Date;
}

export interface MenuPackageTypeMaster {
  id: string;
  code: string;
  name: string;
  status: MenuPackageTypeStatus;
  notes?: string;
  displayOrder?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnitMaster {
  id: string;
  code: string;
  name: string;
  symbol: string;
  family: UnitFamily;
  baseUnitCode?: string;
  conversionToBase?: number;
  allowPurchase: boolean;
  allowIssue: boolean;
  allowRecipe: boolean;
  allowYield: boolean;
  allowSales: boolean;
  status: UnitStatus;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItemVariant {
  id: string;
  variantLabel?: string;
  label: string;
  salesQuantity?: number;
  salesUnit: UnitOfSale;
  salesUnitId?: UnitOfSale;
  quantity: number;
  portionBaseQuantity?: number;
  quantityUnit?: string;
  sellingPrice: number;
  estimatedCost?: number;
  isDefault?: boolean;
  active: boolean;
  status?: 'active' | 'inactive';
}

export interface MenuItemResaleProfile {
  linkedPurchaseItemIds: string[];
}

export interface MenuItemOutsourceProfile {
  vendorId?: string;
  vendorName?: string;
  defaultCost?: number;
}

// Purchase Item Master (Shared)
export interface PurchaseItem {
  id: string;
  itemName: string;
  itemCode?: string; // Optional item code for reference
  category: string; // Compatibility alias for categoryId
  categoryId?: string;
  subCategoryId?: string;
  purchaseCategoryId?: string;
  supplyCategoryId?: string;
  description?: string;
  inventoryType?: InventoryType;
  trackInventory?: boolean;
  useInRecipeIngredients?: boolean;
  useAsRecipeOutput?: boolean;
  costingMethod?: CostingMethod;
  issueMethod?: IssueMethod;
  purchaseUnit: MeasurementUnit;
  purchaseUnitId?: MeasurementUnit;
  issueUnit: MeasurementUnit;
  baseUnitId?: MeasurementUnit;
  conversionFactor: number; // e.g., 1 kg = 1000 gm
  storeLocation: StoreLocation;
  assignedKitchenStoreIds?: StoreLocation[];
  currentStock: number;
  openingStock?: number;
  reorderLevel: number;
  minimumStockLevel?: number;
  maximumStockLevel?: number;
  allowNegativeStock?: boolean;
  preferredSupplierId?: string;
  alternateSupplierIds?: string[];
  defaultPurchaseCost?: number;
  leadTimeDays?: number;
  minimumOrderQuantity?: number;
  taxGroupId?: string;
  lastPurchaseRate: number; // Per purchase unit
  lastCost?: number;
  averageCost?: number;
  ratePerUnit?: number; // Current rate per unit (for inventory valuation)
  lastPurchaseDate?: Date;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// Recipe Ingredient
export interface RecipeIngredient {
  id: string;
  itemId?: string;
  purchaseItemId: string;
  itemName?: string;
  purchaseItemName: string;
  categoryId?: string;
  categoryName?: string;
  entryQuantity?: number;
  entryUnitId?: MeasurementUnit;
  requiredQuantity?: number;
  quantity: number;
  baseQuantity?: number;
  scaledEntryQuantity?: number;
  scaledBaseQuantity?: number;
  baseUnitId?: MeasurementUnit;
  unit: MeasurementUnit;
  lastPurchaseRate?: number;
  lastPurchaseUnit?: MeasurementUnit;
  unitCost?: number;
  costPerUnit: number; // Auto-fetched from purchase item
  wastagePercentage?: number;
  netQuantity?: number;
  totalCost: number; // quantity * costPerUnit
}

export type RecipeCostLineCategory = 'labor' | 'utility';

export type RecipeCostLineBasis =
  | 'fixed'
  | 'fixed-daig-capacity'
  | 'per-kg-yield'
  | 'per-kg-output'
  | 'per-kg-input'
  | 'per-batch'
  | 'per-hour'
  | 'per-person'
  | 'per-head';

export interface RecipeCostLine {
  id: string;
  category: RecipeCostLineCategory;
  name: string;
  calculationBasis: RecipeCostLineBasis;
  rate: number;
  quantity?: number;
  capacityQuantity?: number;
  unit?: string;
  ingredientReferenceId?: string;
  totalCost: number;
}

// Recipe
export interface Recipe {
  id: string;
  dishId: string;
  recipeName?: string;
  recipeCode?: string;
  recipeType?: 'menu-recipe' | 'production-recipe' | 'semi-finished-recipe';
  outputItemId?: string;
  outputItemName?: string;
  recipeCategoryId?: string;
  kitchenSectionId?: string;
  status?: 'active' | 'inactive';
  ingredients: RecipeIngredient[];
  preparationSteps?: string;
  preparationTimeMinutes?: number;
  preparationTime: number; // in minutes
  yieldQuantity?: number;
  yields: number; // Yield quantity in yieldUnit
  yieldUnitId?: MeasurementUnit;
  yieldUnit: MeasurementUnit;
  targetYieldQuantity?: number;
  targetYieldUnitId?: MeasurementUnit;
  expectedWastagePercentage?: number;
  expectedYieldPercentage?: number;
  totalIngredientCost?: number;
  wastageCost?: number;
  laborCost?: number;
  utilitiesCost?: number;
  additionalCost?: number;
  additionalCostLines?: RecipeCostLine[];
  totalRecipeCost?: number;
  totalProductionCost?: number;
  totalCost: number; // Full recipe production cost
  costPerPortion: number; // Legacy field kept for compatibility
  costPerYieldUnit?: number; // totalCost / yields in yieldUnit
  supplyMarginPerYieldUnit?: number;
  supplySellingPricePerYieldUnit?: number;
  supplyFoodCostPercentage?: number;
  suggestedSellingPrice?: number;
  foodCostPercentage?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Banquet Sale Enablement (for Restaurant Dishes)
export interface BanquetSaleEnablement {
  enabled: boolean;
  allowedUnits: UnitOfSale[];
  minimumQuantity: number;
  advanceNoticeRequired: number; // in days
  preparationResponsibility: 'restaurant-kitchen' | 'banquet-kitchen';
  internalTransferPrice?: number;
  notes?: string;
}

export interface DishUsageFlags {
  customMenu: boolean;
  menuPackage: boolean;
  reservationFoodSupplies: boolean;
  outsideServices: boolean;
}

// Dish Master
export interface Dish {
  id: string;
  dishCode?: string;
  dishName: string;
  cuisineId: string;
  cuisineName: string;
  categoryId?: DishCategory;
  category: DishCategory;
  module: KitchenModule; // 'banquet' or 'restaurant'
  kitchenStationId?: PreparationArea;
  preparationArea: PreparationArea;
  sourceType?: MenuItemSourceType;
  productionType: ProductionType;
  issuedFrom: IssuedFrom;
  unitOfSale: UnitOfSale;
  status: DishStatus;
  description?: string;
  salesVariants?: MenuItemVariant[];
  resaleProfile?: MenuItemResaleProfile;
  outsourceProfile?: MenuItemOutsourceProfile;
  usageFlags?: DishUsageFlags;
  
  // Recipe & Costing (only for in-house dishes)
  hasRecipe: boolean;
  recipeId?: string;
  estimatedCost?: number; // From recipe
  costPerBaseUnit?: number;
  sellingPrice?: number; // Optional
  recipeCost?: number;
  defaultVariantCost?: number;
  defaultSellingPrice?: number;
  foodCostPercentage?: number;
  grossMargin?: number;
  
  // Restaurant-specific: Banquet Sale Enablement
  banquetSaleEnablement?: BanquetSaleEnablement;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
}

// Menu Package (for Banquet)
export interface MenuPackage {
  id: string;
  packageName: string;
  packageType: string;
  module: KitchenModule;
  
  // Dishes included in package
  dishes: MenuPackageDish[];
  choiceGroups?: MenuPackageChoiceGroup[];
  
  // Package commercial costing baseline. maximumGuests is legacy saved-data compatibility only.
  minimumGuests: number;
  maximumGuests?: number;
  totalCostPerHead: number;
  sellingPricePerHead: number;
  menuEstimate?: MenuPackageMenuEstimate;
  chefEstimate?: LegacyMenuPackageChefEstimate;
  
  status: 'draft' | 'approved' | 'inactive';
  description?: string;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MenuPackageChoiceGroupCostingMethod =
  | 'highest-cost'
  | 'default-option'
  | 'average-cost';

export interface MenuPackageMenuEstimate {
  estimateBasis?: 'baseline-total';
  baselineGuests?: number;
  fixedItemQuantities: Record<string, number>;
  fixedItemUnits?: Record<string, string>;
  choiceGroupQuantities: Record<string, number>;
  choiceGroupUnits?: Record<string, string>;
  choiceGroupSelections: Record<string, string | undefined>;
  updatedBy: string;
  updatedAt: Date;
}

export type LegacyMenuPackageChefEstimateSlabId =
  | 'up-to-100'
  | 'from-101-to-300'
  | 'above-300';

export interface LegacyMenuPackageChefEstimateSlab {
  id: LegacyMenuPackageChefEstimateSlabId;
  label: string;
  minGuests: number;
  maxGuests?: number;
  plannedGuests: number;
  fixedItemQuantities: Record<string, number>;
  choiceGroupQuantities: Record<string, number>;
  choiceGroupSelections: Record<string, string | undefined>;
  notes?: string;
}

export interface LegacyMenuPackageChefEstimate {
  pricingSlabId: LegacyMenuPackageChefEstimateSlabId;
  slabs: LegacyMenuPackageChefEstimateSlab[];
  updatedBy: string;
  updatedAt: Date;
}

export interface MenuPackageChoiceGroup {
  id: string;
  groupName: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
  costingMethod: MenuPackageChoiceGroupCostingMethod;
  defaultDishId?: string;
  dishes: MenuPackageDish[];
}

// Dish included in a menu package
export interface MenuPackageDish {
  dishId: string;
  dishName: string;
  preparationArea: PreparationArea;
  variantId?: string;
  variantLabel?: string;
  sourceType?: MenuItemSourceType;
  quantityPerHead: number;
  unit: UnitOfSale;
  costPerHead: number;
  isFromRestaurant?: boolean; // Flag for restaurant dishes
}

// Production Order (Inter-kitchen)
export interface ProductionOrder {
  id: string;
  orderNumber: string;
  bookingId: string;
  eventDate: Date;
  requestedBy: 'banquet-kitchen' | 'front-office';
  assignedTo: 'banquet-kitchen' | 'restaurant-kitchen';
  
  // Order items
  items: ProductionOrderItem[];
  
  totalGuests: number;
  status: 'pending' | 'confirmed' | 'in-production' | 'ready' | 'delivered' | 'cancelled';
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductionOrderItem {
  dishId: string;
  dishName: string;
  quantity: number;
  unit: UnitOfSale;
  preparationArea: PreparationArea;
  specialInstructions?: string;
}

// ==================== VENDOR MANAGEMENT ====================

// Vendor Category Assignment
export interface VendorCategoryAssignment {
  category: VendorCategory;
  startDate: Date; // When we started dealing with this vendor in this category
  isActive: boolean;
  scopeType?: VendorCategoryScopeType;
  subCategoryIds?: string[];
}

// Vendor Pricing Formula (for poultry and other dynamic pricing)
export interface VendorPricingFormula {
  id: string;
  productType: string; // e.g., "Chicken With Bone", "Chicken Boneless", "Mutton"
  pricingMethod: 'fixed' | 'supply-rate-multiplier'; // Fixed rate or based on market supply rate
  baseSupplyRate?: number; // Current market supply rate (for supply-rate-multiplier)
  multiplyFactor?: number; // e.g., 1.15 means supply rate + 15%
  fixedRate?: number; // For fixed pricing method
  lastUpdated: Date;
}

// Vendor Master
export interface Vendor {
  id: string;
  vendorName: string;
  vendorCode: string; // Auto-generated unique code
  vendorTypeId?: string;
  vendorCategories: VendorCategoryAssignment[]; // Changed from simple array to assignment with dates
  supplyCategoryIds?: string[];
  supplyScope?: VendorSupplyScope;
  defaultLeadTimeDays?: number;
  orderCutoffTime?: string;
  deliveryDays?: string[];
  contactPerson: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  paymentTerms: PaymentTerms;
  creditLimit?: number; // For credit vendors
  status: 'active' | 'inactive' | 'blocked';
  taxId?: string; // GST/Tax number
  
  // Inactive tracking
  inactiveReason?: string; // Reason for marking inactive/blocked
  inactiveSince?: Date; // When vendor was marked inactive
  
  // Pricing formulas (for poultry vendors with dynamic pricing)
  pricingFormulas?: VendorPricingFormula[];
  
  // Financial tracking
  currentBalance: number; // Outstanding amount
  totalPurchases: number; // Lifetime purchases
  lastPurchaseDate?: Date;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Purchase Order
export interface PurchaseOrder {
  id: string;
  poNumber: string; // Auto-generated: PO-YYYYMMDD-XXX
  vendorId: string;
  vendorName: string;
  orderDate: Date;
  expectedDeliveryDate: Date;
  paymentTerms: PaymentTerms;
  status: PurchaseOrderStatus;
  sourceFlow?: 'manual' | 'fast-daily' | 'multi-vendor-planning';
  sourceLabel?: string;
  
  // Items
  items: PurchaseOrderItem[];
  
  // Financials
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  
  // Payment
  amountPaid: number;
  amountPending: number;
  
  // Delivery tracking
  deliveredDate?: Date;
  receivedBy?: string;
  receivedQuantities?: Record<string, number>; // itemId -> quantity received
  
  // Notes
  remarks?: string;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  updatedAt: Date;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseItemId: string;
  itemName: string;
  quantity: number;
  unit: MeasurementUnit;
  ratePerUnit: number;
  amount: number; // quantity * ratePerUnit
  preferredVendorId?: string;
  selectedVendorId?: string;
  purchaseCategoryId?: string;
  supplyCategoryId?: string;
  notes?: string;
  
  // Receiving
  receivedQuantity?: number;
  pendingQuantity?: number;
}

// Goods Receipt Note (GRN)
export interface GoodsReceipt {
  id: string;
  grnNumber: string; // Auto-generated: GRN-YYYYMMDD-XXX
  purchaseOrderId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  receiptDate: Date;
  
  // Items received
  items: GoodsReceiptItem[];
  
  // Store allocation
  destinationStore: StoreLocation; // Legacy primary store for the receipt
  
  // Quality check
  qualityCheckStatus: 'pending' | 'approved' | 'rejected' | 'partial';
  qualityCheckedBy?: string;
  qualityRemarks?: string;
  
  // Metadata
  receivedBy: string;
  createdAt: Date;
}

export interface GoodsReceiptItem {
  purchaseItemId: string;
  itemName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  unit: MeasurementUnit;
  ratePerUnit: number;
  totalValue: number; // acceptedQuantity * ratePerUnit
  destinationStore?: StoreLocation;
}

// Stock Transfer (Main Store to Production Stores)
export interface StockTransfer {
  id: string;
  transferNumber: string; // Auto-generated: STR-YYYYMMDD-XXX
  transferDate: Date;
  fromStore: StoreLocation;
  toStore: StoreLocation;
  
  items: StockTransferItem[];
  
  status: 'pending' | 'in-transit' | 'received' | 'cancelled';
  
  // Tracking
  issuedBy: string;
  receivedBy?: string;
  receivedAt?: Date;
  
  remarks?: string;
  createdAt: Date;
}

export interface StockTransferItem {
  purchaseItemId: string;
  itemName: string;
  quantity: number;
  unit: MeasurementUnit;
  status: 'pending' | 'received';
}

// Store Stock Level
export interface StoreStock {
  storeLocation: StoreLocation;
  purchaseItemId: string;
  itemName: string;
  currentStock: number;
  unit: MeasurementUnit;
  reorderLevel: number;
  lastUpdated: Date;
}

export interface KitchenIssueSheet {
  id: string;
  issueNumber: string; // KIS-YYYYMMDD-XXX
  module: KitchenModule;
  bookingId: string;
  customerName: string;
  eventType?: string;
  venueName?: string;
  eventDate: Date;
  eventTime?: string;
  guestCount: number;
  packageId?: string;
  packageName?: string;
  status: 'issued' | 'partial' | 'blocked';
  remarks?: string;
  lineItems: KitchenIssueSheetItem[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KitchenIssueSheetItem {
  purchaseItemId: string;
  itemName: string;
  sourceStore: StoreLocation;
  unit: MeasurementUnit;
  requiredQuantity: number;
  issuedQuantity: number;
  shortageQuantity: number;
  availableQuantity: number;
  linkedDishes: string[];
}

export interface CentralKitchenRequisition {
  id: string;
  requisitionNumber: string; // CKR-YYYYMMDD-XXX
  bookingId: string;
  reservationNumber: string;
  customerName: string;
  eventDate: Date;
  venueName?: string;
  primeSpaceName?: string;
  subSpaceName?: string;
  status: 'draft' | 'approved' | 'sent-to-store';
  remarks?: string;
  lineItems: CentralKitchenRequisitionLine[];
  createdBy: string;
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface CentralKitchenRequisitionLine {
  purchaseItemId: string;
  itemName: string;
  sourceStore: StoreLocation;
  unit: MeasurementUnit;
  requiredQuantity: number;
  linkedMenuItems: string[];
}

export interface CentralKitchenDispatchPlan {
  id: string;
  dispatchNumber: string; // CKD-YYYYMMDD-XXX
  bookingId: string;
  reservationNumber: string;
  customerName: string;
  eventDate: Date;
  eventTime?: string;
  venueName?: string;
  primeSpaceName?: string;
  subSpaceName?: string;
  status: 'planned' | 'approved' | 'dispatched';
  remarks?: string;
  lineItems: CentralKitchenDispatchLine[];
  createdBy: string;
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface CentralKitchenDispatchLine {
  dishId: string;
  menuItemName: string;
  section: string;
  quantity: number;
  unit: string;
  dispatchTo: string;
  notes?: string;
}

// ==================== FINANCE & ACCOUNTING ====================

// Customer Invoice (from Bookings)
export interface CustomerInvoice {
  id: string;
  invoiceNumber: string; // INV-YYYYMMDD-XXX
  invoiceDate: Date;
  dueDate: Date;
  
  // Customer & Booking Details
  bookingId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  eventDate: Date;
  venueName: string;
  
  // Invoice Items
  items: InvoiceItem[];
  
  // Financials
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  discountReason?: string;
  totalAmount: number;
  
  // Payments
  amountPaid: number;
  amountPending: number;
  
  status: 'draft' | 'sent' | 'partially-paid' | 'paid' | 'overdue' | 'cancelled';
  
  // Payment tracking
  paymentHistory: PaymentReceipt[];
  
  // Notes
  remarks?: string;
  termsAndConditions?: string;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  sentAt?: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  description: string;
  itemType: 'venue-charges' | 'menu-package' | 'service-charges' | 'decoration' | 'other';
  quantity: number;
  unit: string;
  ratePerUnit: number;
  amount: number;
  taxable: boolean;
}

// Payment Receipt (AR)
export interface PaymentReceipt {
  id: string;
  receiptNumber: string; // RCP-YYYYMMDD-XXX
  receiptDate: Date;
  
  // Customer & Invoice
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  
  // Payment Details
  amount: number;
  paymentMethod: 'cash' | 'bank-transfer' | 'cheque' | 'credit-card' | 'online';
  paymentReference?: string; // Cheque number, transaction ID, etc.
  bankName?: string;
  
  // Reconciliation
  reconciled: boolean;
  reconciledDate?: Date;
  reconciledBy?: string;
  
  remarks?: string;
  
  // Metadata
  receivedBy: string;
  createdAt: Date;
}

// Vendor Bill (from Purchase Orders)
export interface VendorBill {
  id: string;
  billNumber: string; // BILL-YYYYMMDD-XXX
  vendorBillNumber?: string; // Vendor's own bill number
  billDate: Date;
  dueDate: Date;
  
  // Vendor & PO Details
  vendorId: string;
  vendorName: string;
  purchaseOrderId?: string;
  poNumber?: string;
  
  // Bill Items
  items: VendorBillItem[];
  
  // Financials
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  
  // Payments
  amountPaid: number;
  amountPending: number;
  
  status: 'pending' | 'partially-paid' | 'paid' | 'overdue';
  
  // Payment tracking
  paymentHistory: PaymentVoucher[];
  
  remarks?: string;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorBillItem {
  id: string;
  purchaseItemId?: string;
  itemName: string;
  quantity: number;
  unit: MeasurementUnit;
  ratePerUnit: number;
  amount: number;
}

// Payment Voucher (AP)
export interface PaymentVoucher {
  id: string;
  voucherNumber: string; // PV-YYYYMMDD-XXX
  paymentDate: Date;
  
  // Vendor & Bill
  vendorId: string;
  vendorName: string;
  billId?: string;
  billNumber?: string;
  
  // Payment Details
  amount: number;
  paymentMethod: 'cash' | 'bank-transfer' | 'cheque';
  paymentReference?: string;
  bankName?: string;
  chequeNumber?: string;
  chequeDate?: Date;
  
  // Approval
  approvedBy?: string;
  approvedAt?: Date;
  
  remarks?: string;
  
  // Metadata
  paidBy: string;
  createdAt: Date;
}

// Credit/Debit Note
export interface CreditDebitNote {
  id: string;
  noteNumber: string; // CN-XXX or DN-XXX
  noteType: 'credit' | 'debit';
  noteDate: Date;
  
  // Party Details
  partyType: 'customer' | 'vendor';
  partyId: string;
  partyName: string;
  
  // Reference
  referenceType: 'invoice' | 'bill' | 'other';
  referenceId?: string;
  referenceNumber?: string;
  
  // Amount & Reason
  amount: number;
  reason: string;
  description?: string;
  
  status: 'draft' | 'approved' | 'applied';
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
}

// Expense Category
export type ExpenseCategory = 
  | 'utilities' 
  | 'salaries' 
  | 'rent' 
  | 'maintenance' 
  | 'marketing'
  | 'office-supplies'
  | 'fuel'
  | 'miscellaneous';

// General Expense
export interface GeneralExpense {
  id: string;
  expenseNumber: string; // EXP-YYYYMMDD-XXX
  expenseDate: Date;
  
  category: ExpenseCategory;
  description: string;
  amount: number;
  
  paymentMethod: 'cash' | 'bank-transfer' | 'cheque';
  paymentReference?: string;
  
  // Approval
  approvedBy?: string;
  approvedAt?: Date;
  
  remarks?: string;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
}
