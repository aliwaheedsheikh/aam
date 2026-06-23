import { Booking } from '../../calendar/types-v2';
import { Dish, MenuPackage, MenuPackageDish, Recipe } from '../types';
import { PurchaseItem, UnitMaster } from '../types';
import {
  type BookingMenuSelection,
  convertUnitQuantity,
  getBookingEventTime,
  getBookingGuestCount,
  getMenuSelection,
  getSelectedVariant,
  resolvePackageForBooking,
} from './productionFlow';

export const DIRECTOR_PLANNING_SECTIONS = [
  'Hot Kitchen',
  'Sweet Section',
  'Salad Section',
  'BBQ',
  'Bakery',
  'Naan / Bread',
  'Other',
] as const;

export type DirectorPlanningSection = (typeof DIRECTOR_PLANNING_SECTIONS)[number];

export type EstimateFactorMode = 'per-pax' | 'rule-based';
export type EstimateRecordStatus = 'draft' | 'approved';

export interface DirectorEstimateLineDraft {
  lineId: string;
  estimateFactor: number;
  wastagePercent: number;
  sellingPriceAllocation: number;
  factorMode: EstimateFactorMode;
  notes?: string;
}

export interface DirectorEstimateRecord {
  bookingId: string;
  dateKey: string;
  status: EstimateRecordStatus;
  guestCountSnapshot?: number;
  menuSignature?: string;
  foodSuppliesSignature?: string;
  lines: DirectorEstimateLineDraft[];
  savedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  managementAlertSentAt?: Date;
}

export interface DirectorPlanningLineBase {
  lineId: string;
  dishId: string;
  menuItemName: string;
  section: DirectorPlanningSection;
  preparationArea: string;
  pax: number;
  unitOfMeasure: string;
  defaultEstimateFactor: number;
  defaultWastagePercent: number;
  factorMode: EstimateFactorMode;
  recipeCostPerUnit: number;
  sellingPriceAllocation: number;
  issueReady: boolean;
  duplicateEventCount: number;
  duplicateEventLabels: string[];
  combinedSuggestedQuantity: number;
}

export interface DirectorPlanningEvent {
  bookingId: string;
  reservationNumber: string;
  customerName: string;
  eventDate: Date;
  eventTime: string;
  venueName: string;
  primeSpaceName: string;
  subSpaceName: string;
  eventType: string;
  pax: number;
  packageId?: string;
  packageName: string;
  perHeadSellingPrice: number;
  issues: string[];
  duplicateSummary: string[];
  lines: DirectorPlanningLineBase[];
}

export interface DirectorComputedPlanningLine extends DirectorPlanningLineBase, DirectorEstimateLineDraft {
  finalProductionQuantity: number;
}

export interface GeneratedRequisitionLine {
  purchaseItemId: string;
  itemName: string;
  sourceStore: string;
  unit: string;
  requiredQuantity: number;
  linkedMenuItems: string[];
}

export interface GeneratedDispatchLine {
  dishId: string;
  menuItemName: string;
  section: string;
  quantity: number;
  unit: string;
  dispatchTo: string;
  notes?: string;
}

const sectionOrder = new Map<DirectorPlanningSection, number>(
  DIRECTOR_PLANNING_SECTIONS.map((section, index) => [section, index]),
);

const normalizeText = (value?: string | null) => (value || '').trim().toLowerCase();

const formatEventLabel = (booking: Booking) => `${booking.customerName} (${booking.id})`;

const getPrimeSpaceLabel = (booking: Booking) =>
  booking.primeSpaceNames?.filter(Boolean).join(', ') || booking.primeSpaceName || '—';

const getSubSpaceLabel = (booking: Booking) => booking.subSpaceName || '—';

const getDefaultWastagePercent = (section: DirectorPlanningSection) => {
  switch (section) {
    case 'Salad Section':
      return 12;
    case 'BBQ':
      return 10;
    case 'Naan / Bread':
      return 8;
    case 'Sweet Section':
      return 5;
    case 'Bakery':
      return 6;
    case 'Hot Kitchen':
      return 7;
    default:
      return 8;
  }
};

const resolveDirectorPlanningSection = (
  dish: Dish,
  packageDish: MenuPackageDish,
): DirectorPlanningSection => {
  const haystack = normalizeText(
    [dish.preparationArea, dish.category, dish.dishName, packageDish.dishName].filter(Boolean).join(' '),
  );

  if (/(naan|bread|roti|chapati|kulcha)/.test(haystack)) {
    return 'Naan / Bread';
  }

  if (/(bbq|barbeque|barbecue|kebab|tikka|grill)/.test(haystack)) {
    return 'BBQ';
  }

  if (/(bakery|cake|pastry|biscuit|cookie)/.test(haystack)) {
    return 'Bakery';
  }

  if (/(sweet|dessert|kheer|halwa|jamun|custard|ice cream)/.test(haystack)) {
    return 'Sweet Section';
  }

  if (/(salad|raita|cold kitchen|cold section|cold)/.test(haystack)) {
    return 'Salad Section';
  }

  if (/(hot kitchen|main course|qorma|karahi|biryani|pulao|rice|curry)/.test(haystack)) {
    return 'Hot Kitchen';
  }

  return 'Other';
};

const resolveDirectorPlanningSectionFromText = (value: string): DirectorPlanningSection => {
  const haystack = normalizeText(value);

  if (/(naan|bread|roti|chapati|kulcha)/.test(haystack)) {
    return 'Naan / Bread';
  }

  if (/(bbq|barbeque|barbecue|kebab|tikka|grill)/.test(haystack)) {
    return 'BBQ';
  }

  if (/(bakery|cake|pastry|biscuit|cookie)/.test(haystack)) {
    return 'Bakery';
  }

  if (/(sweet|dessert|kheer|halwa|jamun|custard|ice cream)/.test(haystack)) {
    return 'Sweet Section';
  }

  if (/(salad|raita|cold kitchen|cold section|cold)/.test(haystack)) {
    return 'Salad Section';
  }

  if (/(hot kitchen|main course|qorma|karahi|biryani|pulao|rice|curry|soup|tea|coffee|kashmir)/.test(haystack)) {
    return 'Hot Kitchen';
  }

  return 'Other';
};

const resolveFactorMode = (section: DirectorPlanningSection): EstimateFactorMode =>
  section === 'Naan / Bread' ? 'rule-based' : 'per-pax';

const resolveDisplayUnit = (
  dish: Dish,
  packageDish: MenuPackageDish,
  recipe?: Recipe,
) => recipe?.yieldUnit || dish.salesVariants?.find((variant) => variant.active !== false)?.quantityUnit || packageDish.unit || dish.unitOfSale || 'pcs';

const resolveDefaultEstimateFactor = (
  packageDish: MenuPackageDish,
  unitOfMeasure: string,
  recipe?: Recipe,
  variantQuantityUnit?: string,
  variantQuantity?: number,
  units?: UnitMaster[],
) => {
  const baseQuantity = packageDish.quantityPerHead * (variantQuantity || 1);
  const sourceUnit = variantQuantityUnit || packageDish.unit || recipe?.yieldUnit || unitOfMeasure;

  if (!sourceUnit || sourceUnit === unitOfMeasure) {
    return baseQuantity;
  }

  const converted = convertUnitQuantity(baseQuantity, sourceUnit, unitOfMeasure, units);
  return converted ?? baseQuantity;
};

const resolveRecipeCostPerDisplayUnit = (
  recipe: Recipe | undefined,
  unitOfMeasure: string,
  units?: UnitMaster[],
) => {
  if (!recipe || !recipe.yields) {
    return 0;
  }

  const costPerYieldUnit =
    recipe.costPerYieldUnit ??
    (recipe.totalCost > 0 && recipe.yields > 0 ? recipe.totalCost / recipe.yields : 0);

  if (!costPerYieldUnit) {
    return 0;
  }

  if (recipe.yieldUnit === unitOfMeasure) {
    return costPerYieldUnit;
  }

  const conversion = convertUnitQuantity(1, unitOfMeasure, recipe.yieldUnit, units);
  if (conversion === null) {
    return costPerYieldUnit;
  }

  return costPerYieldUnit * conversion;
};

const buildEventLines = ({
  booking,
  resolvedPackage,
  menuSelection,
  dishesById,
  recipesById,
  perHeadSellingPrice,
  units,
}: {
  booking: Booking;
  resolvedPackage: MenuPackage;
  menuSelection?: BookingMenuSelection;
  dishesById: Map<string, Dish>;
  recipesById: Map<string, Recipe>;
  perHeadSellingPrice: number;
  units?: UnitMaster[];
}): DirectorPlanningLineBase[] => {
  const pax = getBookingGuestCount(booking);
  const totalDishCostPerHead =
    resolvedPackage.dishes.reduce((sum, line) => sum + (line.costPerHead || 0), 0) ||
    resolvedPackage.totalCostPerHead ||
    0;
  const equalAllocation = resolvedPackage.dishes.length > 0 ? (perHeadSellingPrice * pax) / resolvedPackage.dishes.length : 0;
  const packageDishIds = new Set(resolvedPackage.dishes.map((line) => line.dishId));

  const packageLines = resolvedPackage.dishes
    .map((packageDish) => {
      const dish = dishesById.get(packageDish.dishId);
      if (!dish) {
        return null;
      }

      const recipe = dish.recipeId ? recipesById.get(dish.recipeId) : undefined;
      const variant = getSelectedVariant(dish, packageDish);
      const unitOfMeasure = resolveDisplayUnit(dish, packageDish, recipe);
      const section = resolveDirectorPlanningSection(dish, packageDish);
      const factorMode = resolveFactorMode(section);
      const defaultEstimateFactor = resolveDefaultEstimateFactor(
        packageDish,
        unitOfMeasure,
        recipe,
        variant?.quantityUnit,
        variant?.quantity,
        units,
      );
      const recipeCostPerUnit = resolveRecipeCostPerDisplayUnit(recipe, unitOfMeasure, units);
      const sellingPriceAllocation =
        totalDishCostPerHead > 0
          ? perHeadSellingPrice * pax * ((packageDish.costPerHead || 0) / totalDishCostPerHead)
          : equalAllocation;

      return {
        lineId: `${booking.id}::${packageDish.dishId}`,
        dishId: packageDish.dishId,
        menuItemName: packageDish.dishName,
        section,
        preparationArea: dish.preparationArea || section,
        pax,
        unitOfMeasure,
        defaultEstimateFactor,
        defaultWastagePercent: getDefaultWastagePercent(section),
        factorMode,
        recipeCostPerUnit,
        sellingPriceAllocation,
        issueReady: Boolean(dish.recipeId && recipe),
        duplicateEventCount: 0,
        duplicateEventLabels: [],
        combinedSuggestedQuantity: defaultEstimateFactor * pax * (1 + getDefaultWastagePercent(section) / 100),
      };
    })
    .filter((line): line is DirectorPlanningLineBase => Boolean(line));

  const addedMenuLines =
    menuSelection?.items
      ?.filter((item) => item.kitchenItemId && !packageDishIds.has(item.kitchenItemId))
      .map((item, index) => {
        const dish = item.kitchenItemId ? dishesById.get(item.kitchenItemId) : undefined;
        const section = dish
          ? resolveDirectorPlanningSection(dish, {
              dishId: dish.id,
              dishName: item.name || dish.dishName,
              preparationArea: dish.preparationArea,
              quantityPerHead: 1,
              unit: dish.unitOfSale,
              costPerHead: dish.estimatedCost || 0,
            })
          : resolveDirectorPlanningSectionFromText(`${item.category || ''} ${item.name || ''}`);
        const recipe = dish?.recipeId ? recipesById.get(dish.recipeId) : undefined;
        const packageDish: MenuPackageDish = {
          dishId: dish?.id || `added-${index}`,
          dishName: item.name || dish?.dishName || 'Added menu item',
          preparationArea: dish?.preparationArea || section,
          quantityPerHead: 1,
          unit: dish?.unitOfSale || 'pcs',
          costPerHead: dish?.estimatedCost || 0,
        };
        const variant = dish ? getSelectedVariant(dish, packageDish) : undefined;
        const unitOfMeasure = dish ? resolveDisplayUnit(dish, packageDish, recipe) : 'pcs';
        const defaultEstimateFactor = dish
          ? resolveDefaultEstimateFactor(
              packageDish,
              unitOfMeasure,
              recipe,
              variant?.quantityUnit,
              variant?.quantity,
              units,
            )
          : 0;
        const recipeCostPerUnit = resolveRecipeCostPerDisplayUnit(recipe, unitOfMeasure, units);

        return {
          lineId: `${booking.id}::added-menu::${item.kitchenItemId || index}`,
          dishId: dish?.id || '',
          menuItemName: item.name || dish?.dishName || 'Added menu item',
          section,
          preparationArea: dish?.preparationArea || section,
          pax,
          unitOfMeasure,
          defaultEstimateFactor,
          defaultWastagePercent: getDefaultWastagePercent(section),
          factorMode: resolveFactorMode(section),
          recipeCostPerUnit,
          sellingPriceAllocation: 0,
          issueReady: Boolean(dish?.recipeId && recipe),
          duplicateEventCount: 0,
          duplicateEventLabels: [],
          combinedSuggestedQuantity: defaultEstimateFactor * pax * (1 + getDefaultWastagePercent(section) / 100),
        };
      }) ?? [];

  const customerProvidedLines =
    menuSelection?.customerProvidedMenu
      ?.filter((item) => item.itemName?.trim())
      .map((item, index) => {
        const section = resolveDirectorPlanningSectionFromText(`${item.category || ''} ${item.itemName || ''}`);
        return {
          lineId: `${booking.id}::customer-menu::${index}`,
          dishId: '',
          menuItemName: item.itemName || 'Customer-provided menu item',
          section,
          preparationArea: section,
          pax,
          unitOfMeasure: 'pcs',
          defaultEstimateFactor: 0,
          defaultWastagePercent: getDefaultWastagePercent(section),
          factorMode: resolveFactorMode(section),
          recipeCostPerUnit: 0,
          sellingPriceAllocation: 0,
          issueReady: false,
          duplicateEventCount: 0,
          duplicateEventLabels: [],
          combinedSuggestedQuantity: 0,
        };
      }) ?? [];

  return [...packageLines, ...addedMenuLines, ...customerProvidedLines]
    .sort((left, right) => {
      const sectionDifference =
        (sectionOrder.get(left.section) ?? Number.MAX_SAFE_INTEGER) -
        (sectionOrder.get(right.section) ?? Number.MAX_SAFE_INTEGER);
      if (sectionDifference !== 0) {
        return sectionDifference;
      }

      return left.menuItemName.localeCompare(right.menuItemName);
    });
};

const buildDirectorPlanningEvent = ({
  booking,
  dishesById,
  recipesById,
  menuPackages,
  units,
}: {
  booking: Booking;
  dishesById: Map<string, Dish>;
  recipesById: Map<string, Recipe>;
  menuPackages: MenuPackage[];
  units?: UnitMaster[];
}): DirectorPlanningEvent => {
  const menuSelection = getMenuSelection(booking);
  const resolvedPackage = resolvePackageForBooking(booking, menuPackages);
  const perHeadSellingPrice =
    Number(menuSelection?.finalPerHeadRate) ||
    resolvedPackage?.sellingPricePerHead ||
    0;
  const issues: string[] = [];

  if (!menuSelection || menuSelection.serviceMode !== 'in-house') {
    issues.push('Reservation does not have an in-house menu linked for central kitchen planning.');
  } else if (menuSelection.mode !== 'package') {
    issues.push('Reservation uses a custom or catering-only menu. Package-based estimation is required here.');
  } else if (!resolvedPackage) {
    issues.push('Approved menu package could not be resolved from the reservation snapshot.');
  }

  const lines =
    resolvedPackage && issues.length === 0
      ? buildEventLines({
          booking,
          resolvedPackage,
          menuSelection,
          dishesById,
          recipesById,
          perHeadSellingPrice,
          units,
        })
      : [];

  return {
    bookingId: booking.id,
    reservationNumber: booking.id,
    customerName: booking.customerName,
    eventDate: new Date(booking.date),
    eventTime: getBookingEventTime(booking),
    venueName: booking.venueName || 'Venue not selected',
    primeSpaceName: getPrimeSpaceLabel(booking),
    subSpaceName: getSubSpaceLabel(booking),
    eventType: booking.eventType || 'Event',
    pax: getBookingGuestCount(booking),
    packageId: resolvedPackage?.id || menuSelection?.packageId,
    packageName:
      resolvedPackage?.packageName ||
      menuSelection?.packageName ||
      menuSelection?.summaryLabel ||
      'Menu not finalized',
    perHeadSellingPrice,
    issues,
    duplicateSummary: [],
    lines,
  };
};

export const getDirectorEstimateDateKey = (eventDate: Date) =>
  `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;

export const buildDirectorPlanningEvents = ({
  bookings,
  selectedDate,
  dishes,
  recipes,
  menuPackages,
  units,
}: {
  bookings: Booking[];
  selectedDate: Date;
  dishes: Dish[];
  recipes: Recipe[];
  menuPackages: MenuPackage[];
  units?: UnitMaster[];
}) => {
  const dishesById = new Map(dishes.map((dish) => [dish.id, dish]));
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  const baseEvents = bookings
    .filter((booking) => {
      const bookingDate = new Date(booking.date);
      return booking.status === 'confirmed' && bookingDate.toDateString() === selectedDate.toDateString();
    })
    .map((booking) =>
      buildDirectorPlanningEvent({
        booking,
        dishesById,
        recipesById,
        menuPackages,
        units,
      }),
    )
    .sort((left, right) => left.eventTime.localeCompare(right.eventTime));

  const duplicateMap = new Map<
    string,
    {
      count: number;
      labels: string[];
      combinedQuantity: number;
    }
  >();

  baseEvents.forEach((event) => {
    const eventLabel = formatEventLabel({
      id: event.reservationNumber,
      customerName: event.customerName,
    } as Booking);

    event.lines.forEach((line) => {
      const key = line.dishId || normalizeText(line.menuItemName);
      const current = duplicateMap.get(key);
      if (current) {
        current.count += 1;
        current.labels.push(eventLabel);
        current.combinedQuantity += line.combinedSuggestedQuantity;
        return;
      }

      duplicateMap.set(key, {
        count: 1,
        labels: [eventLabel],
        combinedQuantity: line.combinedSuggestedQuantity,
      });
    });
  });

  return baseEvents.map((event) => {
    const lines = event.lines.map((line) => {
      const duplicate = duplicateMap.get(line.dishId || normalizeText(line.menuItemName));
      return {
        ...line,
        duplicateEventCount: duplicate?.count || 0,
        duplicateEventLabels: duplicate?.labels || [],
        combinedSuggestedQuantity: duplicate?.combinedQuantity || line.combinedSuggestedQuantity,
      };
    });

    const duplicateSummary = lines
      .filter((line) => line.duplicateEventCount > 1)
      .map((line) => `${line.menuItemName} found in ${line.duplicateEventCount} confirmed events.`);

    return {
      ...event,
      lines,
      duplicateSummary: Array.from(new Set(duplicateSummary)),
    };
  });
};

export const buildDirectorRequisitionLines = ({
  computedLines,
  dishes,
  recipes,
  purchaseItems,
  units,
}: {
  computedLines: DirectorComputedPlanningLine[];
  dishes: Dish[];
  recipes: Recipe[];
  purchaseItems: PurchaseItem[];
  units?: UnitMaster[];
}) => {
  const dishesById = new Map(dishes.map((dish) => [dish.id, dish]));
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const purchaseItemsById = new Map(purchaseItems.map((item) => [item.id, item]));
  const lineMap = new Map<string, GeneratedRequisitionLine>();

  computedLines.forEach((line) => {
    if (line.finalProductionQuantity <= 0) {
      return;
    }

    const dish = dishesById.get(line.dishId);
    if (!dish) {
      return;
    }

    const recipe = dish.recipeId ? recipesById.get(dish.recipeId) : undefined;

    if (recipe && recipe.yields > 0) {
      const quantityInYieldUnit =
        line.unitOfMeasure === recipe.yieldUnit
          ? line.finalProductionQuantity
          : convertUnitQuantity(line.finalProductionQuantity, line.unitOfMeasure, recipe.yieldUnit, units);

      if (quantityInYieldUnit === null) {
        return;
      }

      const batchMultiplier = quantityInYieldUnit / recipe.yields;

      recipe.ingredients.forEach((ingredient) => {
        const purchaseItem = purchaseItemsById.get(ingredient.purchaseItemId);
        if (!purchaseItem) {
          return;
        }

        const quantityInIssueUnit =
          ingredient.unit === purchaseItem.issueUnit
            ? ingredient.quantity * batchMultiplier
            : convertUnitQuantity(ingredient.quantity * batchMultiplier, ingredient.unit, purchaseItem.issueUnit, units);

        if (quantityInIssueUnit === null) {
          return;
        }

        const key = `${purchaseItem.id}::${purchaseItem.storeLocation}`;
        const existing = lineMap.get(key);
        if (existing) {
          existing.requiredQuantity += quantityInIssueUnit;
          if (!existing.linkedMenuItems.includes(line.menuItemName)) {
            existing.linkedMenuItems.push(line.menuItemName);
          }
          return;
        }

        lineMap.set(key, {
          purchaseItemId: purchaseItem.id,
          itemName: purchaseItem.itemName,
          sourceStore: purchaseItem.storeLocation,
          unit: purchaseItem.issueUnit,
          requiredQuantity: quantityInIssueUnit,
          linkedMenuItems: [line.menuItemName],
        });
      });

      return;
    }

    const resaleLinks = dish.resaleProfile?.linkedPurchaseItemIds || [];
    resaleLinks.forEach((purchaseItemId) => {
      const purchaseItem = purchaseItemsById.get(purchaseItemId);
      if (!purchaseItem) {
        return;
      }

      const quantityInIssueUnit =
        line.unitOfMeasure === purchaseItem.issueUnit
          ? line.finalProductionQuantity
          : convertUnitQuantity(line.finalProductionQuantity, line.unitOfMeasure, purchaseItem.issueUnit, units);

      if (quantityInIssueUnit === null) {
        return;
      }

      const key = `${purchaseItem.id}::${purchaseItem.storeLocation}`;
      const existing = lineMap.get(key);
      if (existing) {
        existing.requiredQuantity += quantityInIssueUnit;
        if (!existing.linkedMenuItems.includes(line.menuItemName)) {
          existing.linkedMenuItems.push(line.menuItemName);
        }
        return;
      }

      lineMap.set(key, {
        purchaseItemId: purchaseItem.id,
        itemName: purchaseItem.itemName,
        sourceStore: purchaseItem.storeLocation,
        unit: purchaseItem.issueUnit,
        requiredQuantity: quantityInIssueUnit,
        linkedMenuItems: [line.menuItemName],
      });
    });
  });

  return Array.from(lineMap.values()).sort((left, right) => left.itemName.localeCompare(right.itemName));
};

export const buildDirectorDispatchLines = ({
  event,
  computedLines,
}: {
  event: DirectorPlanningEvent;
  computedLines: DirectorComputedPlanningLine[];
}) => {
  const dispatchTo = [event.venueName, event.primeSpaceName, event.subSpaceName]
    .filter((value) => value && value !== '—')
    .join(' / ');

  return computedLines
    .filter((line) => line.finalProductionQuantity > 0)
    .map<GeneratedDispatchLine>((line) => ({
      dishId: line.dishId,
      menuItemName: line.menuItemName,
      section: line.section,
      quantity: line.finalProductionQuantity,
      unit: line.unitOfMeasure,
      dispatchTo,
      notes: line.notes,
    }))
    .sort((left, right) => left.section.localeCompare(right.section) || left.menuItemName.localeCompare(right.menuItemName));
};
