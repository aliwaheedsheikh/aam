import { Booking, type BookingStatus } from '../../calendar/types-v2';
import {
  type Dish,
  type KitchenIssueSheet,
  type MeasurementUnit,
  type MenuItemVariant,
  type MenuPackage,
  type MenuPackageDish,
  type ProductionCostMethod,
  type PurchaseItem,
  type Recipe,
  type RecipeIngredient,
  type RecipeCostLineCategory,
  type StoreLocation,
  type StoreStock,
  type UnitMaster,
} from '../types';
import {
  resolveProductionCostMethodFromLine,
  shouldProductionCostMethodShowReference,
} from '../../../lib/productionCostMethods';
import { convertUnitQuantity as convertQuantityByUnit } from '../../../lib/unitConversion';

type RequirementUsageSource = {
  kind: 'ingredient' | 'resale' | RecipeCostLineCategory;
  label: string;
  methodName?: string;
};

export type BookingMenuSelection = {
  serviceMode?: string;
  mode?: string;
  summaryLabel?: string;
  packageId?: string;
  packageName?: string;
  items?: Array<{
    kitchenItemId?: string;
    name?: string;
    category?: string;
    source?: string;
  }>;
  customerProvidedMenu?: Array<{
    category?: string;
    itemName?: string;
    notes?: string;
  }>;
};

export interface ProductionIngredientLine {
  purchaseItemId: string;
  itemName: string;
  sourceStore: StoreLocation;
  unit: MeasurementUnit;
  totalRequiredQuantity: number;
  alreadyIssuedQuantity: number;
  remainingRequiredQuantity: number;
  availableQuantity: number;
  issueQuantity: number;
  shortageQuantity: number;
  linkedDishes: string[];
  usageSources: RequirementUsageSource[];
}

export interface BookingProductionPlan {
  bookingId: string;
  bookingStatus: BookingStatus;
  customerName: string;
  eventType: string;
  venueName: string;
  eventDate: Date;
  eventTime: string;
  guestCount: number;
  packageId?: string;
  packageName?: string;
  menuLabel: string;
  issueSheetCount: number;
  issueStatus: 'planning-only' | 'configuration-gap' | 'ready' | 'short-stock' | 'partial-issued' | 'issued';
  blockingIssues: string[];
  notes: string[];
  ingredients: ProductionIngredientLine[];
  sourceStores: StoreLocation[];
  totalRequiredQuantity: number;
  totalRemainingQuantity: number;
  totalIssueQuantity: number;
  totalShortageQuantity: number;
  canIssue: boolean;
  isFullyIssued: boolean;
}

export interface ConsolidatedProductionRequirement {
  purchaseItemId: string;
  itemName: string;
  sourceStore: StoreLocation;
  unit: MeasurementUnit;
  totalRequiredQuantity: number;
  alreadyIssuedQuantity: number;
  remainingRequiredQuantity: number;
  availableQuantity: number;
  shortageQuantity: number;
  eventNames: string[];
  linkedDishes: string[];
  usageSources: RequirementUsageSource[];
}

const storeNames: Record<string, string> = {
  'main-store': 'Main Store',
  'main-cold-store': 'Main Cold Store',
  'main-dry-store': 'Main Dry Store',
  'banquet-store': 'Banquet Store',
  'restaurant-store': 'Restaurant Store',
  'beverage-store': 'Beverage Store',
  'hot-kitchen': 'Hot Kitchen',
  'hot-kitchen-store': 'Hot Kitchen Store',
  'cold-kitchen': 'Cold Kitchen',
  'cold-kitchen-store': 'Cold Kitchen Store',
  tandoor: 'Tandoor',
  'tandoor-store': 'Tandoor Store',
  bbq: 'BBQ Station',
  'bbq-store': 'BBQ Store',
  'restaurant-kitchen': 'Restaurant Kitchen',
  'chinese-section': 'Chinese Section',
  bakery: 'Bakery',
  bar: 'Bar',
  'pastry-section': 'Pastry Section',
};

const normalizeText = (value?: string | null) => (value || '').trim().toLowerCase();

const isIssueEligibleStatus = (status: BookingStatus) => status === 'confirmed' || status === 'completed';

export const getBookingSnapshot = (booking: Booking) =>
  booking.currentAgreementSnapshot || booking.signedAgreementSnapshot;

export const getMenuSelection = (booking: Booking): BookingMenuSelection | undefined =>
  getBookingSnapshot(booking)?.foodAndCatering?.menuSelection as BookingMenuSelection | undefined;

export const getBookingGuestCount = (booking: Booking) => {
  const snapshot = getBookingSnapshot(booking);
  return (
    snapshot?.guestGuarantees?.guaranteedGuests ||
    snapshot?.guestGuarantees?.totalGuests ||
    booking.guestCount ||
    0
  );
};

export const getBookingEventTime = (booking: Booking) => `${booking.startTime} - ${booking.endTime}`;

const createFallbackVariant = (dish: Dish): MenuItemVariant => ({
  id: `${dish.id}-default`,
  label: 'Default',
  salesUnit: dish.unitOfSale || 'per-head',
  quantity: 1,
  quantityUnit: '',
  sellingPrice: dish.sellingPrice || 0,
  estimatedCost: dish.estimatedCost,
  isDefault: true,
  active: true,
});

const getDishVariants = (dish: Dish) =>
  dish.salesVariants?.length ? dish.salesVariants.filter((variant) => variant.active !== false) : [createFallbackVariant(dish)];

export const getSelectedVariant = (dish: Dish, packageDish: MenuPackageDish) => {
  const variants = getDishVariants(dish);
  return (
    variants.find((variant) => variant.id === packageDish.variantId) ||
    variants.find((variant) => variant.salesUnit === packageDish.unit) ||
    variants.find((variant) => variant.isDefault) ||
    variants[0] ||
    null
  );
};

export const convertUnitQuantity = (quantity: number, fromUnit: string, toUnit: string, units?: UnitMaster[]) =>
  convertQuantityByUnit(quantity, fromUnit, toUnit, units);

const resolveDishSourceType = (dish: Dish) =>
  dish.sourceType || (dish.productionType === 'in-house' ? 'in-house-produced' : 'purchased-for-resale');

const getIssueSheetItemKey = (bookingId: string, purchaseItemId: string, sourceStore: StoreLocation) =>
  `${bookingId}::${purchaseItemId}::${sourceStore}`;

const getRequirementKey = (purchaseItemId: string, sourceStore: StoreLocation) => `${purchaseItemId}::${sourceStore}`;

const mergeUsageSources = (
  currentSources: RequirementUsageSource[],
  nextSources: RequirementUsageSource[],
) => {
  const sourceMap = new Map<string, RequirementUsageSource>();
  [...currentSources, ...nextSources].forEach((source) => {
    sourceMap.set(`${source.kind}::${source.methodName || ''}::${source.label}`, source);
  });
  return Array.from(sourceMap.values());
};

const getRequirementSourceLabel = (
  kind: RequirementUsageSource['kind'],
  methodName?: string,
) => {
  switch (kind) {
    case 'ingredient':
      return 'Ingredient';
    case 'resale':
      return 'Resale';
    case 'labor':
      return methodName ? `Labor: ${methodName}` : 'Labor';
    case 'utility':
      return methodName ? `Utilities: ${methodName}` : 'Utilities';
    case 'packaging':
      return methodName ? `Packaging: ${methodName}` : 'Packaging';
    case 'other':
      return methodName ? `Other: ${methodName}` : 'Other';
    default:
      return kind;
  }
};

const resolveProductionCostReferenceId = (
  referenceId: string | undefined,
  ingredients: RecipeIngredient[],
  purchaseItemsById: Map<string, PurchaseItem>,
) => {
  if (!referenceId) {
    return undefined;
  }

  if (purchaseItemsById.has(referenceId)) {
    return referenceId;
  }

  const referencedIngredient = ingredients.find(
    (entry) =>
      entry.id === referenceId ||
      entry.itemId === referenceId ||
      entry.purchaseItemId === referenceId,
  );

  return referencedIngredient?.itemId || referencedIngredient?.purchaseItemId || referenceId;
};

const getPreferredStoreStock = (purchaseItem: PurchaseItem, storeStocks: StoreStock[]) => {
  const itemStocks = storeStocks
    .filter((stock) => stock.purchaseItemId === purchaseItem.id)
    .sort((left, right) => right.currentStock - left.currentStock);

  return (
    itemStocks.find((stock) => stock.storeLocation === purchaseItem.storeLocation) ||
    itemStocks[0] || {
      storeLocation: purchaseItem.storeLocation,
      purchaseItemId: purchaseItem.id,
      itemName: purchaseItem.itemName,
      currentStock: 0,
      unit: purchaseItem.issueUnit,
      reorderLevel: purchaseItem.reorderLevel,
      lastUpdated: new Date(0),
    }
  );
};

export const resolvePackageForBooking = (booking: Booking, menuPackages: MenuPackage[]) => {
  const selection = getMenuSelection(booking);
  if (!selection || selection.serviceMode !== 'in-house' || selection.mode !== 'package') {
    return null;
  }

  const approvedPackages = menuPackages.filter((menuPackage) => menuPackage.module === 'banquet' && menuPackage.status === 'approved');
  if (approvedPackages.length === 0) {
    return null;
  }

  if (selection.packageId) {
    const byId = approvedPackages.find((menuPackage) => menuPackage.id === selection.packageId);
    if (byId) {
      return byId;
    }
  }

  const labelCandidates = [selection.packageName, selection.summaryLabel]
    .map((value) => normalizeText(value))
    .filter(Boolean);

  const byName = approvedPackages.find((menuPackage) =>
    labelCandidates.includes(normalizeText(menuPackage.packageName)),
  );
  if (byName) {
    return byName;
  }

  const selectedDishIds = new Set(
    (selection.items || [])
      .map((item) => item.kitchenItemId)
      .filter((itemId): itemId is string => Boolean(itemId)),
  );

  if (selectedDishIds.size > 0) {
    const byDishSet = approvedPackages.find((menuPackage) => {
      const packageDishIds = menuPackage.dishes.map((dish) => dish.dishId);
      return (
        packageDishIds.length === selectedDishIds.size &&
        packageDishIds.every((dishId) => selectedDishIds.has(dishId))
      );
    });

    if (byDishSet) {
      return byDishSet;
    }
  }

  return null;
};

const addIngredientRequirement = (
  requirementMap: Map<string, ProductionIngredientLine>,
  bookingId: string,
  purchaseItem: PurchaseItem,
  stockRow: StoreStock,
  requiredQuantity: number,
  linkedDishName: string,
  issueSheets: KitchenIssueSheet[],
  usageSources: RequirementUsageSource[],
) => {
  const key = getRequirementKey(purchaseItem.id, stockRow.storeLocation);
  const issuedQuantity = issueSheets.reduce((sum, sheet) => {
    if (sheet.bookingId !== bookingId) {
      return sum;
    }

    return (
      sum +
      sheet.lineItems
        .filter(
          (lineItem) =>
            getIssueSheetItemKey(sheet.bookingId, lineItem.purchaseItemId, lineItem.sourceStore) ===
            getIssueSheetItemKey(bookingId, purchaseItem.id, stockRow.storeLocation),
        )
        .reduce((lineSum, lineItem) => lineSum + lineItem.issuedQuantity, 0)
    );
  }, 0);

  const existing = requirementMap.get(key);
  if (existing) {
    existing.totalRequiredQuantity += requiredQuantity;
    existing.alreadyIssuedQuantity = issuedQuantity;
    if (!existing.linkedDishes.includes(linkedDishName)) {
      existing.linkedDishes.push(linkedDishName);
    }
    existing.usageSources = mergeUsageSources(existing.usageSources, usageSources);
    return;
  }

  requirementMap.set(key, {
    purchaseItemId: purchaseItem.id,
    itemName: purchaseItem.itemName,
    sourceStore: stockRow.storeLocation,
    unit: stockRow.unit,
    totalRequiredQuantity: requiredQuantity,
    alreadyIssuedQuantity: issuedQuantity,
    remainingRequiredQuantity: 0,
    availableQuantity: stockRow.currentStock,
    issueQuantity: 0,
    shortageQuantity: 0,
    linkedDishes: [linkedDishName],
    usageSources,
  });
};

const addRecipeRequirements = (
  bookingId: string,
  dish: Dish,
  packageDish: MenuPackageDish,
  recipe: Recipe,
  variant: MenuItemVariant,
  guestCount: number,
  productionCostMethods: ProductionCostMethod[],
  purchaseItemsById: Map<string, PurchaseItem>,
  storeStocks: StoreStock[],
  issueSheets: KitchenIssueSheet[],
  requirementMap: Map<string, ProductionIngredientLine>,
  blockingIssues: string[],
  units?: UnitMaster[],
) => {
  if (!variant.quantityUnit) {
    blockingIssues.push(`${dish.dishName} is missing a recipe quantity unit on the selected sales variant.`);
    return;
  }

  if (!recipe.yields || recipe.yields <= 0) {
    blockingIssues.push(`${dish.dishName} has an invalid recipe yield.`);
    return;
  }

  const outputPerGuestInRecipeYieldUnit = convertUnitQuantity(
    packageDish.quantityPerHead * variant.quantity,
    variant.quantityUnit,
    recipe.yieldUnit,
    units,
  );

  if (outputPerGuestInRecipeYieldUnit === null) {
    blockingIssues.push(
      `${dish.dishName} cannot be converted from ${variant.quantityUnit} to recipe yield unit ${recipe.yieldUnit}.`,
    );
    return;
  }

  const batchMultiplier = (guestCount * outputPerGuestInRecipeYieldUnit) / recipe.yields;

  recipe.ingredients.forEach((ingredient: RecipeIngredient) => {
    const purchaseItem = purchaseItemsById.get(ingredient.purchaseItemId);
    if (!purchaseItem) {
      blockingIssues.push(`${dish.dishName} has a recipe ingredient that is no longer linked to Purchase Items.`);
      return;
    }

    const stockRow = getPreferredStoreStock(purchaseItem, storeStocks);
    const requiredQuantity = ingredient.quantity * batchMultiplier;
    const requiredInIssueUnit =
      ingredient.unit === purchaseItem.issueUnit
        ? requiredQuantity
        : convertUnitQuantity(requiredQuantity, ingredient.unit, purchaseItem.issueUnit, units);

    if (requiredInIssueUnit === null) {
      blockingIssues.push(
        `${dish.dishName} ingredient ${ingredient.purchaseItemName} cannot be converted from ${ingredient.unit} to ${purchaseItem.issueUnit}.`,
      );
      return;
    }

    addIngredientRequirement(
      requirementMap,
      bookingId,
      purchaseItem,
      stockRow,
      requiredInIssueUnit,
      dish.dishName,
      issueSheets,
      [{ kind: 'ingredient', label: getRequirementSourceLabel('ingredient') }],
    );
  });

  (recipe.additionalCostLines || []).forEach((line) => {
    const selectedMethod = resolveProductionCostMethodFromLine(line, productionCostMethods);
    const consumesInventory = shouldProductionCostMethodShowReference(selectedMethod, line.calculationBasis, line.category);
    if (!selectedMethod || !consumesInventory) {
      return;
    }

    const resolvedReferenceId = resolveProductionCostReferenceId(line.ingredientReferenceId, recipe.ingredients || [], purchaseItemsById);
    if (!resolvedReferenceId) {
      blockingIssues.push(`${dish.dishName} ${selectedMethod.methodName} is missing a linked purchase item for stock accountability.`);
      return;
    }

    const purchaseItem = purchaseItemsById.get(resolvedReferenceId);
    if (!purchaseItem) {
      blockingIssues.push(`${dish.dishName} ${selectedMethod.methodName} links to a missing purchase item.`);
      return;
    }

    const stockRow = getPreferredStoreStock(purchaseItem, storeStocks);
    const rowQuantity = typeof line.quantity === 'number' && line.quantity > 0 ? line.quantity : 1;
    const requiredQuantity = rowQuantity * batchMultiplier;
    const sourceUnit =
      line.unit ||
      purchaseItem.purchaseUnitId ||
      purchaseItem.purchaseUnit ||
      purchaseItem.issueUnit;
    const requiredInIssueUnit =
      sourceUnit === purchaseItem.issueUnit
        ? requiredQuantity
        : convertUnitQuantity(requiredQuantity, sourceUnit, purchaseItem.issueUnit, units);

    if (requiredInIssueUnit === null) {
      blockingIssues.push(
        `${dish.dishName} ${selectedMethod.methodName} cannot be converted from ${sourceUnit} to ${purchaseItem.issueUnit}.`,
      );
      return;
    }

    addIngredientRequirement(
      requirementMap,
      bookingId,
      purchaseItem,
      stockRow,
      requiredInIssueUnit,
      dish.dishName,
      issueSheets,
      [{
        kind: line.category,
        label: getRequirementSourceLabel(line.category, selectedMethod.methodName),
        methodName: selectedMethod.methodName,
      }],
    );
  });
};

const addResaleRequirements = (
  bookingId: string,
  dish: Dish,
  packageDish: MenuPackageDish,
  variant: MenuItemVariant,
  guestCount: number,
  purchaseItemsById: Map<string, PurchaseItem>,
  storeStocks: StoreStock[],
  issueSheets: KitchenIssueSheet[],
  requirementMap: Map<string, ProductionIngredientLine>,
  blockingIssues: string[],
  units?: UnitMaster[],
) => {
  const linkedIds = dish.resaleProfile?.linkedPurchaseItemIds || [];
  if (linkedIds.length === 0) {
    blockingIssues.push(`${dish.dishName} is marked for resale but has no linked purchase item.`);
    return;
  }

  linkedIds.forEach((purchaseItemId) => {
    const purchaseItem = purchaseItemsById.get(purchaseItemId);
    if (!purchaseItem) {
      blockingIssues.push(`${dish.dishName} links to a missing purchase item.`);
      return;
    }

    const stockRow = getPreferredStoreStock(purchaseItem, storeStocks);
    const sourceUnit = variant.quantityUnit || purchaseItem.issueUnit;
    const requiredQuantity = guestCount * packageDish.quantityPerHead * variant.quantity;
    const requiredInIssueUnit =
      sourceUnit === purchaseItem.issueUnit
        ? requiredQuantity
        : convertUnitQuantity(requiredQuantity, sourceUnit, purchaseItem.issueUnit, units);

    if (requiredInIssueUnit === null) {
      blockingIssues.push(
        `${dish.dishName} cannot be converted from ${sourceUnit} to linked stock unit ${purchaseItem.issueUnit}.`,
      );
      return;
    }

    addIngredientRequirement(
      requirementMap,
      bookingId,
      purchaseItem,
      stockRow,
      requiredInIssueUnit,
      dish.dishName,
      issueSheets,
      [{ kind: 'resale', label: getRequirementSourceLabel('resale') }],
    );
  });
};

export const buildBanquetProductionPlan = ({
  booking,
  dishes,
  recipes,
  menuPackages,
  purchaseItems,
  productionCostMethods = [],
  storeStocks,
  issueSheets,
  units,
}: {
  booking: Booking;
  dishes: Dish[];
  recipes: Recipe[];
  menuPackages: MenuPackage[];
  purchaseItems: PurchaseItem[];
  productionCostMethods?: ProductionCostMethod[];
  storeStocks: StoreStock[];
  issueSheets: KitchenIssueSheet[];
  units?: UnitMaster[];
}): BookingProductionPlan => {
  const eventDate = new Date(booking.date);
  const guestCount = getBookingGuestCount(booking);
  const menuSelection = getMenuSelection(booking);
  const resolvedPackage = resolvePackageForBooking(booking, menuPackages);
  const purchaseItemsById = new Map(purchaseItems.map((item) => [item.id, item]));
  const dishesById = new Map(dishes.map((dish) => [dish.id, dish]));
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const relevantIssueSheets = issueSheets.filter((sheet) => sheet.bookingId === booking.id);
  const blockingIssues: string[] = [];
  const notes: string[] = [];
  const requirementMap = new Map<string, ProductionIngredientLine>();

  if (!isIssueEligibleStatus(booking.status)) {
    notes.push('Booking is not confirmed yet. Production can be reviewed, but stock issue is held.');
  }

  if (!menuSelection || menuSelection.serviceMode !== 'in-house') {
    blockingIssues.push('Reservation does not have an in-house menu package linked for kitchen production.');
  } else if (menuSelection.mode !== 'package') {
    blockingIssues.push('Reservation uses a custom or catering-only menu. Auto stock issue currently requires an approved package.');
  } else if (!resolvedPackage) {
    blockingIssues.push('Approved menu package could not be resolved from the reservation snapshot.');
  }

  if (resolvedPackage && guestCount > 0) {
    resolvedPackage.dishes.forEach((packageDish) => {
      const dish = dishesById.get(packageDish.dishId);
      if (!dish) {
        blockingIssues.push(`${packageDish.dishName} is no longer available in Dish Master.`);
        return;
      }

      const variant = getSelectedVariant(dish, packageDish);
      if (!variant) {
        blockingIssues.push(`${dish.dishName} has no active sales variant for package production.`);
        return;
      }

      const sourceType = resolveDishSourceType(dish);

      if (sourceType === 'outsourced') {
        notes.push(`${dish.dishName} is outsourced and does not consume in-house stock.`);
        return;
      }

      if (sourceType === 'purchased-for-resale') {
        addResaleRequirements(
          booking.id,
          dish,
          packageDish,
          variant,
          guestCount,
          purchaseItemsById,
          storeStocks,
          relevantIssueSheets,
          requirementMap,
          blockingIssues,
          units,
        );
        return;
      }

      if (!dish.recipeId) {
        blockingIssues.push(`${dish.dishName} is approved but does not have a recipe linked.`);
        return;
      }

      const recipe = recipesById.get(dish.recipeId);
      if (!recipe) {
        blockingIssues.push(`${dish.dishName} references a recipe that could not be found.`);
        return;
      }

        addRecipeRequirements(
          booking.id,
          dish,
          packageDish,
          recipe,
          variant,
          guestCount,
          productionCostMethods,
          purchaseItemsById,
          storeStocks,
          relevantIssueSheets,
          requirementMap,
        blockingIssues,
        units,
      );
    });
  }

  const ingredients = Array.from(requirementMap.values())
    .map((lineItem) => {
      const remainingRequiredQuantity = Math.max(0, lineItem.totalRequiredQuantity - lineItem.alreadyIssuedQuantity);
      const issueQuantity = Math.min(remainingRequiredQuantity, lineItem.availableQuantity);
      const shortageQuantity = Math.max(0, remainingRequiredQuantity - issueQuantity);

      return {
        ...lineItem,
        remainingRequiredQuantity,
        issueQuantity,
        shortageQuantity,
      };
    })
    .sort((left, right) => left.itemName.localeCompare(right.itemName));

  const isFullyIssued = ingredients.length > 0 && ingredients.every((lineItem) => lineItem.remainingRequiredQuantity <= 0);
  const totalRemainingQuantity = ingredients.reduce((sum, lineItem) => sum + lineItem.remainingRequiredQuantity, 0);
  const totalIssueQuantity = ingredients.reduce((sum, lineItem) => sum + lineItem.issueQuantity, 0);
  const totalShortageQuantity = ingredients.reduce((sum, lineItem) => sum + lineItem.shortageQuantity, 0);
  const hasAnyIssuedHistory = ingredients.some((lineItem) => lineItem.alreadyIssuedQuantity > 0) || relevantIssueSheets.length > 0;
  const canIssue =
    blockingIssues.length === 0 &&
    isIssueEligibleStatus(booking.status) &&
    ingredients.some((lineItem) => lineItem.remainingRequiredQuantity > 0 && lineItem.issueQuantity > 0);

  let issueStatus: BookingProductionPlan['issueStatus'] = 'ready';
  if (!isIssueEligibleStatus(booking.status)) {
    issueStatus = 'planning-only';
  } else if (blockingIssues.length > 0) {
    issueStatus = 'configuration-gap';
  } else if (isFullyIssued) {
    issueStatus = 'issued';
  } else if (hasAnyIssuedHistory) {
    issueStatus = totalShortageQuantity > 0 ? 'partial-issued' : 'ready';
  } else if (totalShortageQuantity > 0) {
    issueStatus = 'short-stock';
  }

  return {
    bookingId: booking.id,
    bookingStatus: booking.status,
    customerName: booking.customerName,
    eventType: booking.eventType || 'Event',
    venueName: booking.venueName || 'Venue not selected',
    eventDate,
    eventTime: getBookingEventTime(booking),
    guestCount,
    packageId: resolvedPackage?.id || menuSelection?.packageId,
    packageName: resolvedPackage?.packageName || menuSelection?.packageName || menuSelection?.summaryLabel,
    menuLabel: resolvedPackage?.packageName || menuSelection?.summaryLabel || 'Menu not finalized',
    issueSheetCount: relevantIssueSheets.length,
    issueStatus,
    blockingIssues: Array.from(new Set(blockingIssues)),
    notes: Array.from(new Set(notes)),
    ingredients,
    sourceStores: Array.from(new Set(ingredients.map((lineItem) => lineItem.sourceStore))),
    totalRequiredQuantity: ingredients.reduce((sum, lineItem) => sum + lineItem.totalRequiredQuantity, 0),
    totalRemainingQuantity,
    totalIssueQuantity,
    totalShortageQuantity,
    canIssue,
    isFullyIssued,
  };
};

export const buildBanquetProductionPlans = ({
  bookings,
  selectedDate,
  dishes,
  recipes,
  menuPackages,
  purchaseItems,
  productionCostMethods = [],
  storeStocks,
  issueSheets,
  units,
}: {
  bookings: Booking[];
  selectedDate: Date;
  dishes: Dish[];
  recipes: Recipe[];
  menuPackages: MenuPackage[];
  purchaseItems: PurchaseItem[];
  productionCostMethods?: ProductionCostMethod[];
  storeStocks: StoreStock[];
  issueSheets: KitchenIssueSheet[];
  units?: UnitMaster[];
}) =>
  bookings
    .filter((booking) => {
      const bookingDate = new Date(booking.date);
      return bookingDate.toDateString() === selectedDate.toDateString() && booking.status !== 'cancelled';
    })
    .map((booking) =>
      buildBanquetProductionPlan({
        booking,
        dishes,
        recipes,
        menuPackages,
        purchaseItems,
        productionCostMethods,
        storeStocks,
        issueSheets,
        units,
      }),
    )
    .sort((left, right) => left.eventTime.localeCompare(right.eventTime));

export const buildConsolidatedBanquetRequirements = (
  plans: BookingProductionPlan[],
  storeStocks: StoreStock[],
): ConsolidatedProductionRequirement[] => {
  const map = new Map<string, ConsolidatedProductionRequirement>();

  plans.forEach((plan) => {
    plan.ingredients.forEach((lineItem) => {
      const key = getRequirementKey(lineItem.purchaseItemId, lineItem.sourceStore);
      const availableQuantity =
        storeStocks.find(
          (stock) =>
            stock.purchaseItemId === lineItem.purchaseItemId &&
            stock.storeLocation === lineItem.sourceStore,
        )?.currentStock || 0;
      const existing = map.get(key);

      if (existing) {
        existing.totalRequiredQuantity += lineItem.totalRequiredQuantity;
        existing.alreadyIssuedQuantity += lineItem.alreadyIssuedQuantity;
        existing.remainingRequiredQuantity += lineItem.remainingRequiredQuantity;
        if (!existing.eventNames.includes(plan.customerName)) {
          existing.eventNames.push(plan.customerName);
        }
        lineItem.linkedDishes.forEach((dishName) => {
          if (!existing.linkedDishes.includes(dishName)) {
            existing.linkedDishes.push(dishName);
          }
        });
        existing.usageSources = mergeUsageSources(existing.usageSources, lineItem.usageSources);
        existing.availableQuantity = availableQuantity;
        return;
      }

      map.set(key, {
        purchaseItemId: lineItem.purchaseItemId,
        itemName: lineItem.itemName,
        sourceStore: lineItem.sourceStore,
        unit: lineItem.unit,
        totalRequiredQuantity: lineItem.totalRequiredQuantity,
        alreadyIssuedQuantity: lineItem.alreadyIssuedQuantity,
        remainingRequiredQuantity: lineItem.remainingRequiredQuantity,
        availableQuantity,
        shortageQuantity: 0,
        eventNames: [plan.customerName],
        linkedDishes: [...lineItem.linkedDishes],
        usageSources: [...lineItem.usageSources],
      });
    });
  });

  return Array.from(map.values())
    .map((lineItem) => ({
      ...lineItem,
      shortageQuantity: Math.max(0, lineItem.remainingRequiredQuantity - lineItem.availableQuantity),
    }))
    .sort((left, right) => left.itemName.localeCompare(right.itemName));
};

export const getStoreLocationName = (storeLocation: StoreLocation | string) =>
  storeNames[storeLocation] || storeLocation.replace(/-/g, ' ');
