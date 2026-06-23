import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Save, Search, Eye, ChefHat, Calculator, ChevronDown, ChevronRight, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  Dish,
  LegacyMenuPackageChefEstimate,
  MenuPackage,
  MenuPackageChoiceGroup,
  MenuPackageChoiceGroupCostingMethod,
  MenuPackageDish,
  MenuPackageMenuEstimate,
  MenuPackageTypeMaster,
  PurchaseItem,
  Recipe,
  UnitMaster,
} from '../types';
import { toast } from 'sonner';
import { convertUnitQuantity, formatUnitLabel, getUnitByCode, getUnitsForUsage, normalizeUnitCode } from '../../../lib/unitConversion';
import { isDishAvailableForUsage } from '../dishUsage';

interface MenuPackageBuilderProps {
  userName: string;
  dishes: Dish[];
  purchaseItems: PurchaseItem[];
  recipes: Recipe[];
  menuPackages: MenuPackage[];
  menuPackageTypes: MenuPackageTypeMaster[];
  units: UnitMaster[];
  onMenuPackagesChange: (packages: MenuPackage[]) => void;
  onMenuPackageTypesChange: (types: MenuPackageTypeMaster[]) => void;
}

const LEGACY_PACKAGE_COMPATIBLE_UNITS = new Set(['per-head', 'per-guest', 'per-portion', 'per-plate']);

type PackageVariantOption = {
  id: string;
  label: string;
  salesUnit: string;
  productionQuantity: number;
  productionUnit: string;
  estimatedCost: number;
  isDefault: boolean;
};

type DishPackageReadinessStatus =
  | 'ready'
  | 'recipe-missing'
  | 'recipe-incomplete'
  | 'cost-not-calculated'
  | 'purchase-link-missing'
  | 'purchase-item-inactive'
  | 'inactive';

type DishPackageReadiness = {
  status: DishPackageReadinessStatus;
  label: string;
  canAdd: boolean;
  reason: string;
};

type BuilderTab = 'package' | 'menu-items' | 'menu-estimate' | 'cost-summary';

const BUILDER_TABS: Array<{ id: BuilderTab; label: string }> = [
  { id: 'menu-items', label: 'Build' },
  { id: 'menu-estimate', label: 'Package Cost Engineering' },
  { id: 'cost-summary', label: 'Review' },
];

const CHOICE_GROUP_COSTING_METHOD_LABELS: Record<MenuPackageChoiceGroupCostingMethod, string> = {
  'highest-cost': 'Highest Cost',
  'default-option': 'Default Option',
  'average-cost': 'Average Cost',
};

const DISH_READINESS_LABELS: Record<DishPackageReadinessStatus, string> = {
  ready: 'Ready',
  'recipe-missing': 'Recipe Missing',
  'recipe-incomplete': 'Recipe Incomplete',
  'cost-not-calculated': 'Cost Not Calculated',
  'purchase-link-missing': 'Purchase Link Missing',
  'purchase-item-inactive': 'Purchase Item Inactive',
  inactive: 'Inactive',
};

const compactLabelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const compactInputClass =
  'h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-slate-100';
const compactTextareaClass =
  'w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-slate-100';
const compactTableHeadClass = 'px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const compactTableCellClass = 'px-2.5 py-1.5 align-top text-sm text-slate-700';
const compactSecondaryButtonClass =
  'inline-flex h-8 items-center justify-center gap-1 rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-100';
const compactPrimaryButtonClass =
  'inline-flex h-8 items-center justify-center gap-1 rounded border border-orange-600 bg-orange-600 px-2.5 text-xs font-medium text-white hover:bg-orange-700 disabled:bg-orange-300';
const compactOutlineAccentButtonClass =
  'inline-flex h-8 items-center justify-center gap-1 rounded border border-orange-300 bg-white px-2.5 text-xs font-medium text-orange-700 hover:bg-orange-50 disabled:bg-slate-100';

const TARGET_FOOD_COST_PERCENT = 30;
const TARGET_MARGIN_PERCENT = 100 - TARGET_FOOD_COST_PERCENT;

type PackageCategoryRequirement = {
  id: string;
  label: string;
  keywords: string[];
  preferChoiceGroup?: boolean;
  groupName?: string;
};

type AssistantSeverity = 'error' | 'warning' | 'info' | 'success';

type AssistantIssue = {
  id: string;
  severity: AssistantSeverity;
  title: string;
  detail: string;
};

type CostEngineeringLine = {
  id: string;
  sourceId: string;
  type: 'Fixed' | 'Choice';
  name: string;
  detail: string;
  readiness: DishPackageReadiness;
  estimateQty: number;
  selectedUnit: string;
  rateUnit: string;
  unitCost: number;
  qtyPerGuestLabel: string;
  costPerGuest: number;
  totalCost: number;
  impactPercent: number;
  conversionValid: boolean;
  hasWarning: boolean;
};

type QuantitySuggestion = {
  id: string;
  sourceId: string;
  type: 'Fixed' | 'Choice';
  name: string;
  averageQty: number;
  currentQty: number;
  sampleCount: number;
};

const PACKAGE_CATEGORY_REQUIREMENTS: PackageCategoryRequirement[] = [
  { id: 'main-course', label: 'Main course', keywords: ['main course', 'main-course', 'curry', 'qorma', 'karahi'] },
  { id: 'rice', label: 'Rice / biryani', keywords: ['rice', 'biryani', 'pulao'] },
  { id: 'bread', label: 'Bread / naan', keywords: ['bread', 'naan', 'roti'] },
  { id: 'dessert', label: 'Dessert / sweets', keywords: ['dessert', 'sweet', 'mithai'], preferChoiceGroup: true, groupName: 'Dessert Choice' },
  { id: 'salad', label: 'Salad / raita', keywords: ['salad', 'raita', 'condiment'], preferChoiceGroup: true, groupName: 'Salad Choice' },
  { id: 'beverage', label: 'Beverage', keywords: ['beverage', 'drink', 'juice', 'tea'], preferChoiceGroup: true, groupName: 'Beverage Choice' },
];

const normalizeComparableText = (value?: string) => (value || '').toLowerCase().replace(/[-_]+/g, ' ');

const dishMatchesRequirement = (dish: Dish, requirement: PackageCategoryRequirement) => {
  const searchable = normalizeComparableText(`${dish.dishName} ${dish.category} ${dish.cuisineName} ${dish.preparationArea}`);
  return requirement.keywords.some((keyword) => searchable.includes(normalizeComparableText(keyword)));
};

const packageDishMatchesRequirement = (
  packageDish: MenuPackageDish,
  dishById: Map<string, Dish>,
  requirement: PackageCategoryRequirement,
) => {
  const dish = dishById.get(packageDish.dishId);
  const searchable = normalizeComparableText(
    `${packageDish.dishName} ${packageDish.preparationArea} ${dish?.category || ''} ${dish?.cuisineName || ''}`,
  );
  return requirement.keywords.some((keyword) => searchable.includes(normalizeComparableText(keyword)));
};

const normalizeDishSourceType = (dish: Dish) =>
  dish.sourceType || (dish.productionType === 'in-house' ? 'in-house-produced' : 'purchased-for-resale');

const isRecipeBasedPackageDish = (dish: Dish) =>
  dish.productionType === 'recipe-based' ||
  dish.productionType === 'in-house' ||
  dish.sourceType === 'in-house-produced' ||
  Boolean(dish.recipeId || dish.hasRecipe);

const getLinkedPurchaseItem = (dish: Dish, purchaseItemsById: Map<string, PurchaseItem>) => {
  const linkedPurchaseItemId = dish.resaleProfile?.linkedPurchaseItemIds?.[0];
  return linkedPurchaseItemId ? purchaseItemsById.get(linkedPurchaseItemId) : undefined;
};

const getPurchaseItemIssueUnit = (item?: PurchaseItem | null) => item?.baseUnitId || item?.issueUnit || '';

const getPurchaseItemUnitCost = (item?: PurchaseItem | null) =>
  Number(item?.ratePerUnit ?? item?.averageCost ?? item?.lastPurchaseRate ?? item?.defaultPurchaseCost ?? 0) || 0;

const SERVICE_UNIT_ESTIMATE_UNIT_MAP: Record<string, string> = {
  'per-head': 'pcs',
  'per-guest': 'pcs',
  'per-portion': 'pcs',
  'per-plate': 'pcs',
  'per-piece': 'pcs',
  'per-bottle': 'pcs',
  'per-tray': 'tray',
  'per-kg': 'kg',
  'per-ltr': 'ltr',
};

const getEstimateUnitCode = (unitCode: string | undefined, units: UnitMaster[]) => {
  const normalizedUnit = normalizeUnitCode(unitCode);
  if (!normalizedUnit) {
    return '';
  }

  const mappedUnit = SERVICE_UNIT_ESTIMATE_UNIT_MAP[normalizedUnit];
  if (mappedUnit) {
    return mappedUnit;
  }

  const unit = getUnitByCode(normalizedUnit, units);
  if (unit?.family === 'service') {
    return 'pcs';
  }

  return normalizedUnit;
};

const resolveVariantProductionUnit = (
  variantQuantityUnit: string | undefined,
  salesUnit: string,
  dishUnit: string,
  units: UnitMaster[],
) =>
  getEstimateUnitCode(variantQuantityUnit, units) ||
  getEstimateUnitCode(dishUnit, units) ||
  getEstimateUnitCode(salesUnit, units) ||
  'pcs';

const convertPackageEstimateQuantity = (
  quantity: number,
  fromUnitCode: string | undefined,
  toUnitCode: string | undefined,
  units: UnitMaster[],
) => {
  const fromUnit = getEstimateUnitCode(fromUnitCode, units);
  const toUnit = getEstimateUnitCode(toUnitCode, units);
  if (!fromUnit || !toUnit) {
    return null;
  }

  if (fromUnit === toUnit) {
    return quantity;
  }

  if (fromUnit === 'kg' && toUnit === 'gm') {
    return quantity * 1000;
  }

  if (fromUnit === 'gm' && toUnit === 'kg') {
    return quantity / 1000;
  }

  if (fromUnit === 'ltr' && toUnit === 'ml') {
    return quantity * 1000;
  }

  if (fromUnit === 'ml' && toUnit === 'ltr') {
    return quantity / 1000;
  }

  return convertUnitQuantity(quantity, fromUnit, toUnit, units);
};

const getRecipeYieldUnitCode = (recipe: Recipe | undefined, units: UnitMaster[]) =>
  getEstimateUnitCode(recipe?.yieldUnitId || recipe?.yieldUnit, units);

const getRecipeCostPerYieldUnit = (recipe: Recipe | undefined) => {
  const storedUnitCost = Number(recipe?.costPerYieldUnit);
  if (Number.isFinite(storedUnitCost) && storedUnitCost > 0) {
    return storedUnitCost;
  }

  const totalRecipeCost = Number(recipe?.totalRecipeCost ?? recipe?.totalCost);
  const yieldQuantity = Number(recipe?.yieldQuantity ?? recipe?.yields);
  if (Number.isFinite(totalRecipeCost) && totalRecipeCost > 0 && Number.isFinite(yieldQuantity) && yieldQuantity > 0) {
    return totalRecipeCost / yieldQuantity;
  }

  const legacyCost = Number(recipe?.costPerPortion);
  return Number.isFinite(legacyCost) ? legacyCost : 0;
};

const getDishPackageReadiness = (
  dish: Dish | undefined,
  recipeByDishId: Map<string, Recipe>,
  purchaseItemsById: Map<string, PurchaseItem> = new Map(),
): DishPackageReadiness => {
  if (!dish || dish.status !== 'approved' || !isDishAvailableForUsage(dish, 'menuPackage')) {
    return {
      status: 'inactive',
      label: DISH_READINESS_LABELS.inactive,
      canAdd: false,
      reason: 'Dish must be approved, active, and available for menu packages.',
    };
  }

  if (dish.productionType === 'purchased-ready') {
    const linkedPurchaseItemId = dish.resaleProfile?.linkedPurchaseItemIds?.[0];
    if (!linkedPurchaseItemId) {
      return {
        status: 'purchase-link-missing',
        label: DISH_READINESS_LABELS['purchase-link-missing'],
        canAdd: false,
        reason: 'Purchased ready dishes must link to one active purchase item in Dish Master.',
      };
    }

    const linkedPurchaseItem = purchaseItemsById.get(linkedPurchaseItemId);
    if (!linkedPurchaseItem || linkedPurchaseItem.status !== 'active') {
      return {
        status: 'purchase-item-inactive',
        label: DISH_READINESS_LABELS['purchase-item-inactive'],
        canAdd: false,
        reason: 'Linked purchase item must be active before this dish can be saved in a package.',
      };
    }

    if (!getPurchaseItemIssueUnit(linkedPurchaseItem)) {
      return {
        status: 'recipe-incomplete',
        label: 'Issue UOM Missing',
        canAdd: false,
        reason: 'Linked purchase item must have an issue/base UOM for package costing.',
      };
    }

    if (getPurchaseItemUnitCost(linkedPurchaseItem) <= 0) {
      return {
        status: 'cost-not-calculated',
        label: DISH_READINESS_LABELS['cost-not-calculated'],
        canAdd: false,
        reason: 'Linked purchase item must have a current rate or average cost for package costing.',
      };
    }

    return {
      status: 'ready',
      label: DISH_READINESS_LABELS.ready,
      canAdd: true,
      reason: 'Linked purchase item is active and costed.',
    };
  }

  if (!isRecipeBasedPackageDish(dish)) {
    return {
      status: 'ready',
      label: DISH_READINESS_LABELS.ready,
      canAdd: true,
      reason: 'Dish is approved and available for menu packages.',
    };
  }

  const recipe = recipeByDishId.get(dish.id);
  if (!recipe) {
    return {
      status: 'recipe-missing',
      label: DISH_READINESS_LABELS['recipe-missing'],
      canAdd: false,
      reason: 'Recipe must be completed and costed before this dish can be added to a package.',
    };
  }

  if (recipe.status === 'inactive') {
    return {
      status: 'inactive',
      label: DISH_READINESS_LABELS.inactive,
      canAdd: false,
      reason: 'Recipe is inactive and cannot be used in a menu package.',
    };
  }

  const yieldQuantity = Number(recipe.yieldQuantity ?? recipe.yields);
  const hasYield = Number.isFinite(yieldQuantity) && yieldQuantity > 0 && Boolean(recipe.yieldUnitId || recipe.yieldUnit);
  if (!recipe.ingredients?.length || !hasYield) {
    return {
      status: 'recipe-incomplete',
      label: DISH_READINESS_LABELS['recipe-incomplete'],
      canAdd: false,
      reason: 'Recipe must have ingredients, yield quantity, and yield UOM before this dish can be added.',
    };
  }

  const hasMissingIngredientCost = recipe.ingredients.some((ingredient) => {
    const costPerUnit = Number(ingredient.unitCost ?? ingredient.costPerUnit);
    const lineCost = Number(ingredient.totalCost);
    return !Number.isFinite(costPerUnit) || costPerUnit <= 0 || !Number.isFinite(lineCost) || lineCost <= 0;
  });
  const unitCost = getRecipeCostPerYieldUnit(recipe);
  if (hasMissingIngredientCost || unitCost <= 0) {
    return {
      status: 'cost-not-calculated',
      label: DISH_READINESS_LABELS['cost-not-calculated'],
      canAdd: false,
      reason: 'Recipe cost must be updated before this dish can be added to a package.',
    };
  }

  return {
    status: 'ready',
    label: DISH_READINESS_LABELS.ready,
    canAdd: true,
    reason: 'Recipe is complete and costed.',
  };
};

const getPackageDishRecipe = (packageDish: MenuPackageDish, recipeByDishId: Map<string, Recipe>) =>
  recipeByDishId.get(packageDish.dishId);

const getPackageDishEstimateUnit = (
  packageDish: MenuPackageDish,
  units: UnitMaster[],
  recipeByDishId: Map<string, Recipe>,
) =>
  getRecipeYieldUnitCode(getPackageDishRecipe(packageDish, recipeByDishId), units) ||
  getEstimateUnitCode(packageDish.unit, units) ||
  packageDish.unit ||
  'pcs';

const getPackageDishEstimateCostPerUnit = (
  packageDish: MenuPackageDish,
  units: UnitMaster[],
  recipeByDishId: Map<string, Recipe>,
) => {
  const recipe = getPackageDishRecipe(packageDish, recipeByDishId);
  const recipeUnitCost = getRecipeCostPerYieldUnit(recipe);
  if (getRecipeYieldUnitCode(recipe, units) && recipeUnitCost > 0) {
    return recipeUnitCost;
  }

  return getPackageDishUnitCost(packageDish);
};

const getPackageDishEstimateQuantityPerHead = (
  packageDish: MenuPackageDish,
  units: UnitMaster[],
  recipeByDishId: Map<string, Recipe>,
) => {
  const recipe = getPackageDishRecipe(packageDish, recipeByDishId);
  const recipeUnitCost = getRecipeCostPerYieldUnit(recipe);
  if (getRecipeYieldUnitCode(recipe, units) && recipeUnitCost > 0 && packageDish.costPerHead > 0) {
    return packageDish.costPerHead / recipeUnitCost;
  }

  return packageDish.quantityPerHead;
};

const formatCompactQuantity = (value: number) => {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const absoluteValue = Math.abs(value);
  const decimals = absoluteValue >= 100 ? 0 : absoluteValue >= 10 ? 1 : 2;
  return value.toFixed(decimals).replace(/\.?0+$/, '');
};

const getUnitSymbol = (unitCode: string | undefined, units: UnitMaster[]) => {
  const normalizedUnit = normalizeUnitCode(unitCode);
  const unit = getUnitByCode(normalizedUnit, units);
  return unit?.symbol || normalizedUnit || '';
};

const formatQuantityWithUnit = (quantity: number, unitCode: string | undefined, units: UnitMaster[]) => {
  const normalizedUnit = normalizeUnitCode(unitCode);
  let displayQuantity = quantity;
  let displayUnit = normalizedUnit;

  if (normalizedUnit === 'kg' && Math.abs(quantity) < 1) {
    const converted = convertPackageEstimateQuantity(quantity, 'kg', 'gm', units);
    if (converted !== null) {
      displayQuantity = converted;
      displayUnit = 'gm';
    }
  } else if (normalizedUnit === 'ltr' && Math.abs(quantity) < 1) {
    const converted = convertPackageEstimateQuantity(quantity, 'ltr', 'ml', units);
    if (converted !== null) {
      displayQuantity = converted;
      displayUnit = 'ml';
    }
  }

  return `${formatCompactQuantity(displayQuantity)} ${getUnitSymbol(displayUnit, units)}`.trim();
};

const formatBaselineQuantityPerGuest = (
  baselineQuantity: number,
  baselineGuests: number,
  unitCode: string | undefined,
  units: UnitMaster[],
) => {
  const safeGuests = Math.max(Number(baselineGuests) || 0, 1);
  const normalizedUnit = normalizeUnitCode(unitCode);

  if (normalizedUnit === 'kg') {
    return `${formatCompactQuantity((baselineQuantity * 1000) / safeGuests)} ${getUnitSymbol('gm', units)}`.trim();
  }

  if (normalizedUnit === 'ltr') {
    return `${formatCompactQuantity((baselineQuantity * 1000) / safeGuests)} ${getUnitSymbol('ml', units)}`.trim();
  }

  return formatQuantityWithUnit(baselineQuantity / safeGuests, normalizedUnit, units);
};

const isPackageCompatibleSalesUnit = (salesUnit: string, units: UnitMaster[]) => {
  const normalizedUnit = normalizeUnitCode(salesUnit);
  return (
    LEGACY_PACKAGE_COMPATIBLE_UNITS.has(normalizedUnit) ||
    getUnitsForUsage('sales', units).some((unit) => unit.code === normalizedUnit)
  );
};

const getVariantProductionQuantity = (variant?: { portionBaseQuantity?: number; quantity?: number; salesQuantity?: number }) =>
  Math.max(Number(variant?.portionBaseQuantity ?? variant?.quantity ?? variant?.salesQuantity ?? 1) || 1, 0.0001);

const getDishVariantOptions = (
  dish: Dish,
  units: UnitMaster[],
  recipeByDishId: Map<string, Recipe> = new Map(),
  purchaseItemsById: Map<string, PurchaseItem> = new Map(),
): PackageVariantOption[] => {
  const recipe = recipeByDishId.get(dish.id);
  const recipeYieldUnit = getRecipeYieldUnitCode(recipe, units);
  const recipeUnitCost = getRecipeCostPerYieldUnit(recipe);
  const linkedPurchaseItem = dish.productionType === 'purchased-ready' ? getLinkedPurchaseItem(dish, purchaseItemsById) : undefined;
  const purchaseIssueUnit = getEstimateUnitCode(getPurchaseItemIssueUnit(linkedPurchaseItem), units);
  const purchaseUnitCost = getPurchaseItemUnitCost(linkedPurchaseItem);
  const fallbackProductionUnit =
    recipeYieldUnit ||
    purchaseIssueUnit ||
    resolveVariantProductionUnit(undefined, dish.unitOfSale || 'per-head', dish.unitOfSale || 'pcs', units);
  const getVariantEstimatedCost = (variantQuantity: number, variantQuantityUnit: string | undefined, storedCost: number | undefined) => {
    if (recipeYieldUnit && recipeUnitCost > 0) {
      return recipeUnitCost * variantQuantity;
    }

    if (dish.productionType === 'purchased-ready' && purchaseIssueUnit && purchaseUnitCost > 0) {
      const sourceUnit = getEstimateUnitCode(variantQuantityUnit, units) || purchaseIssueUnit;
      const quantityInIssueUnit =
        sourceUnit === purchaseIssueUnit
          ? variantQuantity
          : convertPackageEstimateQuantity(variantQuantity, sourceUnit, purchaseIssueUnit, units);
      if (quantityInIssueUnit !== null) {
        return quantityInIssueUnit * purchaseUnitCost;
      }
    }

    return storedCost ??
      (normalizeDishSourceType(dish) === 'outsourced' ? dish.outsourceProfile?.defaultCost || 0 : dish.estimatedCost || 0);
  };
  const fallbackVariant: PackageVariantOption = {
    id: `${dish.id}-default`,
    label: 'Default',
    salesUnit: dish.unitOfSale || 'per-head',
    productionQuantity: 1,
    productionUnit: fallbackProductionUnit,
    estimatedCost: getVariantEstimatedCost(1, fallbackProductionUnit, dish.defaultVariantCost || dish.estimatedCost),
    isDefault: true,
  };
  const variants =
    dish.salesVariants?.length
      ? dish.salesVariants.map((variant, index) => {
          const productionQuantity = getVariantProductionQuantity(variant);
          const productionUnit =
            recipeYieldUnit ||
            purchaseIssueUnit ||
            resolveVariantProductionUnit(variant.quantityUnit, variant.salesUnit, dish.unitOfSale || 'pcs', units);
          return {
            id: variant.id,
            label: variant.label || `Variant ${index + 1}`,
            salesUnit: variant.salesUnit,
            productionQuantity,
            productionUnit,
            estimatedCost: getVariantEstimatedCost(productionQuantity, productionUnit, variant.estimatedCost),
            isDefault: Boolean(variant.isDefault),
          };
        })
      : [fallbackVariant];

  const compatibleVariants = variants.filter((variant) => isPackageCompatibleSalesUnit(variant.salesUnit, units));
  if (compatibleVariants.length === 0 && isPackageCompatibleSalesUnit(fallbackVariant.salesUnit, units)) {
    return [fallbackVariant];
  }

  return compatibleVariants.map((variant, index) => ({
    ...variant,
    isDefault: compatibleVariants.some((item) => item.isDefault) ? variant.isDefault : index === 0,
  }));
};

const getDefaultPackageVariant = (
  dish: Dish,
  units: UnitMaster[],
  recipeByDishId: Map<string, Recipe> = new Map(),
  purchaseItemsById: Map<string, PurchaseItem> = new Map(),
) => {
  const variants = getDishVariantOptions(dish, units, recipeByDishId, purchaseItemsById);
  return variants.find((variant) => variant.isDefault) || variants[0] || null;
};

const resolvePackageDishQuantityPerHead = (
  currentQuantityPerHead: number | undefined,
  currentUnit: string | undefined,
  variant: PackageVariantOption,
  units: UnitMaster[],
) => {
  const quantity = Number(currentQuantityPerHead);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return variant.productionQuantity;
  }

  const currentEstimateUnit = getEstimateUnitCode(currentUnit, units);
  const variantEstimateUnit = getEstimateUnitCode(variant.productionUnit, units);
  if (currentEstimateUnit && variantEstimateUnit && currentEstimateUnit !== variantEstimateUnit) {
    const convertedQuantity = convertPackageEstimateQuantity(quantity, currentEstimateUnit, variantEstimateUnit, units);
    return convertedQuantity === null ? variant.productionQuantity : convertedQuantity;
  }

  if (currentEstimateUnit && variantEstimateUnit && currentEstimateUnit === variantEstimateUnit) {
    return quantity;
  }

  return normalizeUnitCode(currentUnit) === normalizeUnitCode(variant.productionUnit) ? quantity : variant.productionQuantity;
};

const buildPackageDish = (
  dish: Dish,
  variant: PackageVariantOption,
  quantityPerHead = variant.productionQuantity,
): MenuPackageDish => ({
  dishId: dish.id,
  dishName: dish.dishName,
  preparationArea: dish.preparationArea,
  variantId: variant.id,
  variantLabel: variant.label,
  sourceType: normalizeDishSourceType(dish),
  quantityPerHead,
  unit: variant.productionUnit,
  costPerHead: (variant.estimatedCost / Math.max(variant.productionQuantity, 0.0001)) * quantityPerHead,
  isFromRestaurant: false,
});

const createPackageTypeCode = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `package-type-${Date.now()}`;

const createChoiceGroup = (index: number): MenuPackageChoiceGroup => ({
  id: `choice-group-${Date.now()}-${index}`,
  groupName: `Choice Group ${index}`,
  minSelect: 1,
  maxSelect: 1,
  required: true,
  costingMethod: 'highest-cost',
  dishes: [],
});

function getPackageDishUnitCost(packageDish: MenuPackageDish) {
  return packageDish.quantityPerHead > 0 ? packageDish.costPerHead / packageDish.quantityPerHead : packageDish.costPerHead;
}

const getChoiceGroupHighestCostDish = (choiceGroup: MenuPackageChoiceGroup) =>
  choiceGroup.dishes.reduce<MenuPackageDish | null>(
    (highestDish, currentDish) =>
      !highestDish || currentDish.costPerHead > highestDish.costPerHead ? currentDish : highestDish,
    null,
  );

const getChoiceGroupDefaultDish = (choiceGroup: MenuPackageChoiceGroup) =>
  choiceGroup.dishes.find((dish) => dish.dishId === choiceGroup.defaultDishId) ||
  getChoiceGroupHighestCostDish(choiceGroup) ||
  choiceGroup.dishes[0] ||
  null;

const getChoiceGroupDefaultSelectionId = (choiceGroup: MenuPackageChoiceGroup) => {
  if (choiceGroup.costingMethod === 'default-option') {
    return getChoiceGroupDefaultDish(choiceGroup)?.dishId;
  }

  return getChoiceGroupHighestCostDish(choiceGroup)?.dishId || choiceGroup.dishes[0]?.dishId;
};

const getChoiceGroupDefaultQuantityPerHead = (choiceGroup: MenuPackageChoiceGroup) => {
  if (choiceGroup.dishes.length === 0) {
    return 0;
  }

  if (choiceGroup.costingMethod === 'highest-cost') {
    return getChoiceGroupHighestCostDish(choiceGroup)?.quantityPerHead || 0;
  }

  if (choiceGroup.costingMethod === 'average-cost') {
    return (
      choiceGroup.dishes.reduce((sum, dish) => sum + (dish.quantityPerHead || 0), 0) /
      Math.max(choiceGroup.dishes.length, 1)
    );
  }

  return getChoiceGroupDefaultDish(choiceGroup)?.quantityPerHead || 0;
};

const getChoiceGroupDefaultEstimateQuantityPerHead = (
  choiceGroup: MenuPackageChoiceGroup,
  units: UnitMaster[],
  recipeByDishId: Map<string, Recipe>,
) => {
  if (choiceGroup.dishes.length === 0) {
    return 0;
  }

  if (choiceGroup.costingMethod === 'highest-cost') {
    const highestDish = getChoiceGroupHighestCostDish(choiceGroup);
    return highestDish ? getPackageDishEstimateQuantityPerHead(highestDish, units, recipeByDishId) : 0;
  }

  if (choiceGroup.costingMethod === 'average-cost') {
    return (
      choiceGroup.dishes.reduce(
        (sum, dish) => sum + getPackageDishEstimateQuantityPerHead(dish, units, recipeByDishId),
        0,
      ) / Math.max(choiceGroup.dishes.length, 1)
    );
  }

  const defaultDish = getChoiceGroupDefaultDish(choiceGroup);
  return defaultDish ? getPackageDishEstimateQuantityPerHead(defaultDish, units, recipeByDishId) : 0;
};

const getChoiceGroupMenuEstimateUnitCost = (
  choiceGroup: MenuPackageChoiceGroup,
  selectedDishId?: string,
  units: UnitMaster[] = [],
  recipeByDishId: Map<string, Recipe> = new Map(),
) => {
  if (choiceGroup.dishes.length === 0) {
    return 0;
  }

  if (choiceGroup.costingMethod === 'highest-cost') {
    return Math.max(...choiceGroup.dishes.map((dish) => getPackageDishEstimateCostPerUnit(dish, units, recipeByDishId)));
  }

  if (choiceGroup.costingMethod === 'average-cost') {
    return (
      choiceGroup.dishes.reduce((sum, dish) => sum + getPackageDishEstimateCostPerUnit(dish, units, recipeByDishId), 0) /
      Math.max(choiceGroup.dishes.length, 1)
    );
  }

  const selectedDish =
    choiceGroup.dishes.find((dish) => dish.dishId === selectedDishId) ||
    getChoiceGroupDefaultDish(choiceGroup);
  return selectedDish ? getPackageDishEstimateCostPerUnit(selectedDish, units, recipeByDishId) : 0;
};

const isLegacyChefEstimate = (
  estimate: MenuPackageMenuEstimate | LegacyMenuPackageChefEstimate | undefined,
): estimate is LegacyMenuPackageChefEstimate =>
  Boolean(estimate) && 'slabs' in estimate && Array.isArray(estimate.slabs);

const getLegacyPricingSlab = (estimate: LegacyMenuPackageChefEstimate) =>
  estimate.slabs.find((slab) => slab.id === estimate.pricingSlabId) || estimate.slabs[0];

const toBaselineTotalQuantity = (
  storedQuantity: number | undefined,
  fallbackQuantityPerGuest: number,
  baselineGuests: number,
  alreadyBaselineTotal: boolean,
) => {
  const safeBaselineGuests = Math.max(Number(baselineGuests) || 0, 1);
  if (typeof storedQuantity === 'number') {
    return alreadyBaselineTotal ? storedQuantity : storedQuantity * safeBaselineGuests;
  }

  return fallbackQuantityPerGuest * safeBaselineGuests;
};

const buildMenuEstimate = (
  currentEstimate: MenuPackageMenuEstimate | LegacyMenuPackageChefEstimate | undefined,
  currentPackageDishes: MenuPackageDish[],
  currentChoiceGroups: MenuPackageChoiceGroup[],
  baselineGuests: number,
  userName: string,
  units: UnitMaster[] = [],
  recipeByDishId: Map<string, Recipe> = new Map(),
): MenuPackageMenuEstimate => {
  const legacyPricingSlab = isLegacyChefEstimate(currentEstimate) ? getLegacyPricingSlab(currentEstimate) : undefined;
  const isBaselineTotalEstimate =
    !isLegacyChefEstimate(currentEstimate) && currentEstimate?.estimateBasis === 'baseline-total';
  const fixedItemQuantities = Object.fromEntries(
    currentPackageDishes.map((dish) => [
      dish.dishId,
      toBaselineTotalQuantity(
        legacyPricingSlab?.fixedItemQuantities?.[dish.dishId] ??
          (!isLegacyChefEstimate(currentEstimate) ? currentEstimate?.fixedItemQuantities?.[dish.dishId] : undefined),
        getPackageDishEstimateQuantityPerHead(dish, units, recipeByDishId),
        baselineGuests,
        isBaselineTotalEstimate,
      ),
    ]),
  );
  const fixedItemUnits = Object.fromEntries(
    currentPackageDishes.map((dish) => [
      dish.dishId,
      getEstimateUnitCode(
        !isLegacyChefEstimate(currentEstimate) ? currentEstimate?.fixedItemUnits?.[dish.dishId] : undefined,
        units,
      ) ||
        getPackageDishEstimateUnit(dish, units, recipeByDishId) ||
        'pcs',
    ]),
  );
  const choiceGroupQuantities = Object.fromEntries(
    currentChoiceGroups.map((choiceGroup) => [
      choiceGroup.id,
      toBaselineTotalQuantity(
        legacyPricingSlab?.choiceGroupQuantities?.[choiceGroup.id] ??
          (!isLegacyChefEstimate(currentEstimate) ? currentEstimate?.choiceGroupQuantities?.[choiceGroup.id] : undefined),
        getChoiceGroupDefaultEstimateQuantityPerHead(choiceGroup, units, recipeByDishId),
        baselineGuests,
        isBaselineTotalEstimate,
      ),
    ]),
  );
  const choiceGroupSelections = Object.fromEntries(
    currentChoiceGroups.map((choiceGroup) => {
      const storedSelection =
        !isLegacyChefEstimate(currentEstimate) ? currentEstimate?.choiceGroupSelections?.[choiceGroup.id] : undefined;
      const validStoredSelection = choiceGroup.dishes.some((dish) => dish.dishId === storedSelection)
        ? storedSelection
        : undefined;

      return [
        choiceGroup.id,
        validStoredSelection || getChoiceGroupDefaultSelectionId(choiceGroup),
      ];
    }),
  );
  const choiceGroupUnits = Object.fromEntries(
    currentChoiceGroups.map((choiceGroup) => {
      const storedSelection = choiceGroupSelections[choiceGroup.id];
      const representativeDish =
        choiceGroup.dishes.find((dish) => dish.dishId === storedSelection) ||
        getChoiceGroupDefaultDish(choiceGroup);

      return [
        choiceGroup.id,
        getEstimateUnitCode(
          !isLegacyChefEstimate(currentEstimate) ? currentEstimate?.choiceGroupUnits?.[choiceGroup.id] : undefined,
          units,
        ) ||
          (representativeDish ? getPackageDishEstimateUnit(representativeDish, units, recipeByDishId) : '') ||
          'pcs',
      ];
    }),
  );

  return {
    estimateBasis: 'baseline-total',
    baselineGuests: Math.max(Number(baselineGuests) || 0, 1),
    fixedItemQuantities,
    fixedItemUnits,
    choiceGroupQuantities,
    choiceGroupUnits,
    choiceGroupSelections,
    updatedBy: userName,
    updatedAt: new Date(),
  };
};

export function MenuPackageBuilder({
  userName,
  dishes,
  purchaseItems,
  recipes,
  menuPackages,
  menuPackageTypes,
  units,
  onMenuPackagesChange,
  onMenuPackageTypesChange,
}: MenuPackageBuilderProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<MenuPackage | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<MenuPackageTypeMaster | null>(null);
  const [activeBuilderTab, setActiveBuilderTab] = useState<BuilderTab>('menu-items');
  const [fixedItemsOpen, setFixedItemsOpen] = useState(true);
  const [choiceGroupsOpen, setChoiceGroupsOpen] = useState(true);
  const [choiceGroupEditorOpen, setChoiceGroupEditorOpen] = useState(false);

  const [formPackageName, setFormPackageName] = useState('');
  const [formPackageType, setFormPackageType] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBaselineGuests, setFormBaselineGuests] = useState(100);
  const [formSellingPricePerHead, setFormSellingPricePerHead] = useState(0);
  const [formStatus, setFormStatus] = useState<'draft' | 'approved' | 'inactive'>('draft');
  const [packageDishes, setPackageDishes] = useState<MenuPackageDish[]>([]);
  const [choiceGroups, setChoiceGroups] = useState<MenuPackageChoiceGroup[]>([]);
  const [selectedAvailableDishIds, setSelectedAvailableDishIds] = useState<string[]>([]);
  const [activeChoiceGroupId, setActiveChoiceGroupId] = useState<string | null>(null);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [preparationAreaFilter, setPreparationAreaFilter] = useState('all');
  const [typeFormName, setTypeFormName] = useState('');
  const [typeFormStatus, setTypeFormStatus] = useState<'active' | 'inactive'>('active');
  const [typeFormNotes, setTypeFormNotes] = useState('');
  const recipesById = useMemo(() => new Map(recipes.map((recipe) => [recipe.id, recipe])), [recipes]);
  const purchaseItemsById = useMemo(() => new Map(purchaseItems.map((item) => [item.id, item])), [purchaseItems]);
  const recipeByDishId = useMemo(() => {
    const recipeMap = new Map<string, Recipe>();
    recipes.forEach((recipe) => {
      if (recipe.dishId && (recipe.status !== 'inactive' || !recipeMap.has(recipe.dishId))) {
        recipeMap.set(recipe.dishId, recipe);
      }
    });
    dishes.forEach((dish) => {
      const linkedRecipe = dish.recipeId ? recipesById.get(dish.recipeId) : undefined;
      if (linkedRecipe) {
        recipeMap.set(dish.id, linkedRecipe);
      }
    });
    return recipeMap;
  }, [dishes, recipes, recipesById]);
  const [menuEstimate, setMenuEstimate] = useState<MenuPackageMenuEstimate>(() =>
    buildMenuEstimate(undefined, [], [], 100, userName, units, recipeByDishId),
  );

  const approvedDishes = useMemo(
    () =>
      dishes.filter(
        (dish) => dish.module === 'banquet' && dish.status === 'approved' && isDishAvailableForUsage(dish, 'menuPackage'),
      ),
    [dishes],
  );
  const packageEligibleDishes = useMemo(
    () => approvedDishes.filter((dish) => getDishVariantOptions(dish, units, recipeByDishId, purchaseItemsById).length > 0),
    [approvedDishes, purchaseItemsById, recipeByDishId, units],
  );
  const sortedMenuPackageTypes = useMemo(
    () =>
      [...menuPackageTypes].sort(
        (left, right) =>
          (left.displayOrder ?? Number.MAX_SAFE_INTEGER) - (right.displayOrder ?? Number.MAX_SAFE_INTEGER) ||
          left.name.localeCompare(right.name),
      ),
    [menuPackageTypes],
  );
  const activeMenuPackageTypes = useMemo(
    () => sortedMenuPackageTypes.filter((type) => type.status === 'active'),
    [sortedMenuPackageTypes],
  );
  const packageEngineeringUnitOptions = useMemo(() => {
    const unitMap = new Map<string, UnitMaster>();
    (['yield', 'recipe', 'issue', 'purchase'] as const).forEach((usage) => {
      getUnitsForUsage(usage, units).forEach((unit) => {
        if (unit.family !== 'service') {
          unitMap.set(unit.code, unit);
        }
      });
    });

    return Array.from(unitMap.values()).sort(
      (left, right) =>
        left.family.localeCompare(right.family) ||
        left.name.localeCompare(right.name),
    );
  }, [units]);
  const packageTypeNameMap = useMemo(
    () => new Map(sortedMenuPackageTypes.map((type) => [type.code, type.name])),
    [sortedMenuPackageTypes],
  );
  const banquetPackages = useMemo(() => menuPackages.filter((pkg) => pkg.module === 'banquet'), [menuPackages]);
  const filteredPackages = useMemo(
    () =>
      banquetPackages.filter((pkg) => {
        const matchesSearch = pkg.packageName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || pkg.packageType === typeFilter;
        return matchesSearch && matchesType;
      }),
    [banquetPackages, searchTerm, typeFilter],
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set(packageEligibleDishes.map((dish) => dish.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [packageEligibleDishes],
  );
  const cuisineOptions = useMemo(
    () =>
      Array.from(new Set(packageEligibleDishes.map((dish) => dish.cuisineName).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [packageEligibleDishes],
  );
  const preparationAreaOptions = useMemo(
    () =>
      Array.from(new Set(packageEligibleDishes.map((dish) => dish.preparationArea).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [packageEligibleDishes],
  );
  const getDishReadiness = (dishId: string) =>
    getDishPackageReadiness(dishes.find((dish) => dish.id === dishId), recipeByDishId, purchaseItemsById);
  const getDishReadinessBadgeClass = (readiness: DishPackageReadiness) => {
    switch (readiness.status) {
      case 'ready':
        return 'border-green-200 bg-green-50 text-green-700';
      case 'cost-not-calculated':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'recipe-missing':
      case 'recipe-incomplete':
      case 'purchase-link-missing':
      case 'purchase-item-inactive':
        return 'border-red-200 bg-red-50 text-red-700';
      case 'inactive':
      default:
        return 'border-slate-200 bg-slate-100 text-slate-600';
    }
  };
  const filteredAvailableDishes = useMemo(
    () =>
      packageEligibleDishes.filter((dish) => {
        const matchesSearch =
          !itemSearchTerm.trim() ||
          dish.dishName.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
          dish.category.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
          dish.preparationArea.toLowerCase().includes(itemSearchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || dish.category === categoryFilter;
        const matchesCuisine = cuisineFilter === 'all' || dish.cuisineName === cuisineFilter;
        const matchesPreparationArea = preparationAreaFilter === 'all' || dish.preparationArea === preparationAreaFilter;
        return matchesSearch && matchesCategory && matchesCuisine && matchesPreparationArea;
      }),
    [packageEligibleDishes, itemSearchTerm, categoryFilter, cuisineFilter, preparationAreaFilter],
  );

  const resetMenuItemFilters = () => {
    setItemSearchTerm('');
    setCategoryFilter('all');
    setCuisineFilter('all');
    setPreparationAreaFilter('all');
    setSelectedAvailableDishIds([]);
  };

  const resetPackageForm = () => {
    setFormPackageName('');
    setFormPackageType(activeMenuPackageTypes[0]?.code || '');
    setFormDescription('');
    setFormBaselineGuests(100);
    setFormSellingPricePerHead(0);
    setFormStatus('draft');
    setPackageDishes([]);
    setChoiceGroups([]);
    setSelectedAvailableDishIds([]);
    setActiveChoiceGroupId(null);
    setActiveBuilderTab('menu-items');
    setFixedItemsOpen(true);
    setChoiceGroupsOpen(true);
    setChoiceGroupEditorOpen(false);
    resetMenuItemFilters();
    setMenuEstimate(buildMenuEstimate(undefined, [], [], 100, userName, units, recipeByDishId));
  };

  const buildPackageDishFromBaselineEstimate = (
    dish: Dish,
    variant: PackageVariantOption,
    baselineQuantity: number | undefined,
    estimateUnit: string | undefined,
    baselineGuests: number,
    fallbackPackageDish?: MenuPackageDish,
  ) => {
    const safeGuests = Math.max(Number(baselineGuests) || 0, 1);
    const estimateQuantity = Number(baselineQuantity);
    if (Number.isFinite(estimateQuantity) && estimateQuantity >= 0) {
      if (estimateQuantity === 0) {
        return buildPackageDish(dish, variant, 0);
      }

      const convertedQuantity = convertPackageEstimateQuantity(estimateQuantity, estimateUnit || variant.productionUnit, variant.productionUnit, units);
      if (convertedQuantity !== null) {
        return buildPackageDish(dish, variant, convertedQuantity / safeGuests);
      }
    }

    return buildPackageDish(
      dish,
      variant,
      fallbackPackageDish
        ? resolvePackageDishQuantityPerHead(fallbackPackageDish.quantityPerHead, fallbackPackageDish.unit, variant, units)
        : variant.productionQuantity,
    );
  };

  const hydratePackageDish = (
    packageDish: MenuPackageDish,
    sourceEstimate?: MenuPackageMenuEstimate | LegacyMenuPackageChefEstimate,
    baselineGuests = formBaselineGuests,
    choiceGroupId?: string,
  ) => {
    const dish = approvedDishes.find((approvedDish) => approvedDish.id === packageDish.dishId);
    if (!dish) {
      return packageDish;
    }

    const variants = getDishVariantOptions(dish, units, recipeByDishId, purchaseItemsById);
    const selectedVariant =
      variants.find((variant) => variant.id === packageDish.variantId) ||
      variants.find((variant) => variant.salesUnit === packageDish.unit) ||
      variants.find((variant) => variant.productionUnit === normalizeUnitCode(packageDish.unit)) ||
      getDefaultPackageVariant(dish, units, recipeByDishId, purchaseItemsById);

    if (!selectedVariant) {
      return packageDish;
    }

    if (choiceGroupId) {
      const baselineEstimate = sourceEstimate && !isLegacyChefEstimate(sourceEstimate) ? sourceEstimate : undefined;
      return buildPackageDishFromBaselineEstimate(
        dish,
        selectedVariant,
        baselineEstimate?.choiceGroupQuantities?.[choiceGroupId],
        baselineEstimate?.choiceGroupUnits?.[choiceGroupId],
        baselineEstimate?.baselineGuests || baselineGuests,
        packageDish,
      );
    }

    const baselineEstimate = buildMenuEstimate(
      sourceEstimate,
      [packageDish],
      [],
      baselineGuests,
      userName,
      units,
      recipeByDishId,
    );

    return buildPackageDishFromBaselineEstimate(
      dish,
      selectedVariant,
      baselineEstimate.fixedItemQuantities[packageDish.dishId],
      baselineEstimate.fixedItemUnits?.[packageDish.dishId],
      baselineEstimate.baselineGuests,
      packageDish,
    );
  };

  const hydrateChoiceGroup = (
    choiceGroup: MenuPackageChoiceGroup,
    sourceEstimate?: MenuPackageMenuEstimate | LegacyMenuPackageChefEstimate,
    baselineGuests = formBaselineGuests,
  ): MenuPackageChoiceGroup => {
    const hydratedDishes = choiceGroup.dishes.map((dish) =>
      hydratePackageDish(dish, sourceEstimate, baselineGuests, choiceGroup.id),
    );
    const defaultDishId = hydratedDishes.some((dish) => dish.dishId === choiceGroup.defaultDishId)
      ? choiceGroup.defaultDishId
      : hydratedDishes[0]?.dishId;

    return {
      ...choiceGroup,
      dishes: hydratedDishes,
      defaultDishId,
    };
  };

  const getChoiceGroupAssignment = (dishId: string) =>
    choiceGroups.find((choiceGroup) => choiceGroup.dishes.some((dish) => dish.dishId === dishId));

  const getDishAssignmentLabel = (dishId: string) => {
    if (packageDishes.some((dish) => dish.dishId === dishId)) {
      return 'Fixed Item';
    }

    const assignedGroup = getChoiceGroupAssignment(dishId);
    return assignedGroup ? assignedGroup.groupName : null;
  };
  const activeChoiceGroup = choiceGroups.find((choiceGroup) => choiceGroup.id === activeChoiceGroupId) || null;
  const eligibleDishById = useMemo(
    () => new Map(packageEligibleDishes.map((dish) => [dish.id, dish])),
    [packageEligibleDishes],
  );
  const assignedDishIds = useMemo(
    () =>
      new Set([
        ...packageDishes.map((dish) => dish.dishId),
        ...choiceGroups.flatMap((choiceGroup) => choiceGroup.dishes.map((dish) => dish.dishId)),
      ]),
    [choiceGroups, packageDishes],
  );
  const packageDishLines = useMemo(
    () => [...packageDishes, ...choiceGroups.flatMap((choiceGroup) => choiceGroup.dishes)],
    [choiceGroups, packageDishes],
  );
  const selectedCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    packageDishLines.forEach((dish) => {
      const category = eligibleDishById.get(dish.dishId)?.category || 'Uncategorized';
      counts[category] = (counts[category] || 0) + 1;
    });
    return counts;
  }, [eligibleDishById, packageDishLines]);
  const preparationAreaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    packageDishLines.forEach((dish) => {
      const area = dish.preparationArea || 'Unassigned';
      counts[area] = (counts[area] || 0) + 1;
    });
    return counts;
  }, [packageDishLines]);
  const suggestedCategoryGaps = useMemo(
    () =>
      PACKAGE_CATEGORY_REQUIREMENTS.map((requirement) => {
        const alreadyCovered = packageDishLines.some((dish) =>
          packageDishMatchesRequirement(dish, eligibleDishById, requirement),
        );
        const candidates = packageEligibleDishes
          .filter((dish) => !assignedDishIds.has(dish.id) && dishMatchesRequirement(dish, requirement))
          .sort((left, right) => (left.estimatedCost || 0) - (right.estimatedCost || 0));

        return {
          requirement,
          alreadyCovered,
          candidates,
          bestDish: candidates[0],
        };
      }).filter((gap) => !gap.alreadyCovered && gap.candidates.length > 0),
    [assignedDishIds, eligibleDishById, packageDishLines, packageEligibleDishes],
  );

  const handleAddNew = () => {
    if (activeMenuPackageTypes.length === 0) {
      toast.error('Please add at least one active package type first');
      return;
    }

    if (packageEligibleDishes.length === 0) {
      toast.error('Please add and approve dishes with package-friendly variants first');
      return;
    }

    setEditingPackage(null);
    resetPackageForm();
    setViewMode(false);
    setDialogOpen(true);
  };

  const openPackage = (pkg: MenuPackage, nextViewMode: boolean) => {
    const baselineGuests = pkg.minimumGuests || 100;
    const hydratedDishes = pkg.dishes.map((dish) => hydratePackageDish(dish, pkg.menuEstimate, baselineGuests));
    const hydratedChoiceGroups = (pkg.choiceGroups || []).map((choiceGroup) =>
      hydrateChoiceGroup(choiceGroup, pkg.menuEstimate, baselineGuests),
    );

    setEditingPackage(pkg);
    setFormPackageName(pkg.packageName);
    setFormPackageType(pkg.packageType);
    setFormDescription(pkg.description || '');
    setFormBaselineGuests(baselineGuests);
    setFormSellingPricePerHead(pkg.sellingPricePerHead);
    setFormStatus(pkg.status);
    setPackageDishes(hydratedDishes);
    setChoiceGroups(hydratedChoiceGroups);
    setActiveChoiceGroupId(hydratedChoiceGroups[0]?.id || null);
    setSelectedAvailableDishIds([]);
    setActiveBuilderTab('menu-items');
    setFixedItemsOpen(true);
    setChoiceGroupsOpen(true);
    setChoiceGroupEditorOpen(false);
    resetMenuItemFilters();
    setMenuEstimate(
      buildMenuEstimate(
        pkg.menuEstimate ?? pkg.chefEstimate,
        hydratedDishes,
        hydratedChoiceGroups,
        pkg.minimumGuests || 100,
        userName,
        units,
        recipeByDishId,
      ),
    );
    setViewMode(nextViewMode);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }

    setMenuEstimate((current) =>
      buildMenuEstimate(current, packageDishes, choiceGroups, formBaselineGuests, userName, units, recipeByDishId),
    );
  }, [dialogOpen, packageDishes, choiceGroups, formBaselineGuests, userName, units, recipeByDishId]);

  const handleEdit = (pkg: MenuPackage) => {
    openPackage(pkg, false);
  };

  const handleView = (pkg: MenuPackage) => {
    openPackage(pkg, true);
  };

  const toggleAvailableDishSelection = (dishId: string) => {
    setSelectedAvailableDishIds((current) =>
      current.includes(dishId) ? current.filter((id) => id !== dishId) : [...current, dishId],
    );
  };

  const handleSelectVisibleDishes = () => {
    setSelectedAvailableDishIds(
      filteredAvailableDishes
        .filter((dish) => getDishPackageReadiness(dish, recipeByDishId, purchaseItemsById).canAdd && !assignedDishIds.has(dish.id))
        .map((dish) => dish.id),
    );
  };

  const handleClearDishSelection = () => {
    setSelectedAvailableDishIds([]);
  };

  const addDishesToFixedItems = (dishIds: string[]) => {
    const dishesToAdd = dishIds
      .map((dishId) => packageEligibleDishes.find((dish) => dish.id === dishId) || null)
      .filter((dish): dish is Dish => Boolean(dish));
    const addedDishes: MenuPackageDish[] = [];
    let skippedCount = 0;

    dishesToAdd.forEach((dish) => {
      const readiness = getDishPackageReadiness(dish, recipeByDishId, purchaseItemsById);
      if (!readiness.canAdd) {
        toast.error(`${dish.dishName}: ${readiness.reason}`);
        skippedCount += 1;
        return;
      }

      if (packageDishes.some((existingDish) => existingDish.dishId === dish.id) || getChoiceGroupAssignment(dish.id)) {
        skippedCount += 1;
        return;
      }

      const defaultVariant = getDefaultPackageVariant(dish, units, recipeByDishId, purchaseItemsById);
      if (!defaultVariant) {
        skippedCount += 1;
        return;
      }

      addedDishes.push(buildPackageDish(dish, defaultVariant));
    });

    if (addedDishes.length > 0) {
      setPackageDishes((current) => [...current, ...addedDishes]);
      toast.success(`${addedDishes.length} dish${addedDishes.length === 1 ? '' : 'es'} added to fixed items`);
    }

    if (skippedCount > 0) {
      toast.info(`${skippedCount} selected dish${skippedCount === 1 ? '' : 'es'} could not be added`);
    }

    setSelectedAvailableDishIds([]);
  };

  const handleAddSelectedToFixedItems = () => {
    if (selectedAvailableDishIds.length === 0) {
      toast.error('Select at least one dish first');
      return;
    }

    addDishesToFixedItems(selectedAvailableDishIds);
  };

  const handleQuickAddToFixedItems = (dishId: string) => {
    addDishesToFixedItems([dishId]);
  };

  const handleUpdateDish = (index: number, field: 'dishId' | 'variantId' | 'quantityPerHead', value: string | number) => {
    const updated = [...packageDishes];

    if (field === 'dishId') {
      const dish = packageEligibleDishes.find((candidate) => candidate.id === value);
      const defaultVariant = dish ? getDefaultPackageVariant(dish, units, recipeByDishId, purchaseItemsById) : null;
      if (dish && defaultVariant) {
        updated[index] = buildPackageDish(
          dish,
          defaultVariant,
          resolvePackageDishQuantityPerHead(updated[index].quantityPerHead, updated[index].unit, defaultVariant, units),
        );
      }
    } else if (field === 'variantId') {
      const dish = packageEligibleDishes.find((candidate) => candidate.id === updated[index].dishId);
      const selectedVariant = dish
        ? getDishVariantOptions(dish, units, recipeByDishId, purchaseItemsById).find((variant) => variant.id === value) || null
        : null;
      if (dish && selectedVariant) {
        updated[index] = buildPackageDish(
          dish,
          selectedVariant,
          resolvePackageDishQuantityPerHead(updated[index].quantityPerHead, updated[index].unit, selectedVariant, units),
        );
      }
    } else if (field === 'quantityPerHead') {
      const dish = packageEligibleDishes.find((candidate) => candidate.id === updated[index].dishId);
      const selectedVariant = dish
        ? getDishVariantOptions(dish, units, recipeByDishId, purchaseItemsById).find((variant) => variant.id === updated[index].variantId) ||
          getDefaultPackageVariant(dish, units, recipeByDishId, purchaseItemsById)
        : null;
      if (dish && selectedVariant) {
        updated[index] = buildPackageDish(dish, selectedVariant, Number(value) || 0);
      }
    }

    setPackageDishes(updated);
  };

  const handleRemoveDish = (index: number) => {
    setPackageDishes((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const openChoiceGroupEditor = (groupId: string) => {
    setActiveChoiceGroupId(groupId);
    setChoiceGroupEditorOpen(true);
  };

  const closeChoiceGroupEditor = () => {
    setChoiceGroupEditorOpen(false);
  };

  const handleAddChoiceGroup = () => {
    const nextGroup = createChoiceGroup(choiceGroups.length + 1);
    setChoiceGroups((current) => [...current, nextGroup]);
    openChoiceGroupEditor(nextGroup.id);
  };

  const handleUpdateChoiceGroup = <K extends keyof MenuPackageChoiceGroup>(
    groupId: string,
    field: K,
    value: MenuPackageChoiceGroup[K],
  ) => {
    setChoiceGroups((current) =>
      current.map((choiceGroup) => {
        if (choiceGroup.id !== groupId) {
          return choiceGroup;
        }

        const nextChoiceGroup = {
          ...choiceGroup,
          [field]: value,
        } as MenuPackageChoiceGroup;

        if (field === 'costingMethod' && nextChoiceGroup.costingMethod !== 'default-option') {
          return nextChoiceGroup;
        }

        if (field === 'costingMethod' && nextChoiceGroup.costingMethod === 'default-option' && !nextChoiceGroup.defaultDishId) {
          return {
            ...nextChoiceGroup,
            defaultDishId: nextChoiceGroup.dishes[0]?.dishId,
          };
        }

        if (field === 'dishes' && nextChoiceGroup.defaultDishId && !nextChoiceGroup.dishes.some((dish) => dish.dishId === nextChoiceGroup.defaultDishId)) {
          return {
            ...nextChoiceGroup,
            defaultDishId: nextChoiceGroup.dishes[0]?.dishId,
          };
        }

        return nextChoiceGroup;
      }),
    );
  };

  const handleRemoveChoiceGroup = (groupId: string) => {
    setChoiceGroups((current) => current.filter((choiceGroup) => choiceGroup.id !== groupId));
    if (activeChoiceGroupId === groupId) {
      setChoiceGroupEditorOpen(false);
    }
    setActiveChoiceGroupId((current) => {
      if (current !== groupId) {
        return current;
      }

      const remainingChoiceGroups = choiceGroups.filter((choiceGroup) => choiceGroup.id !== groupId);
      return remainingChoiceGroups[0]?.id || null;
    });
  };

  const addDishesToChoiceGroup = (groupId: string, dishIds: string[]) => {
    const targetGroup = choiceGroups.find((choiceGroup) => choiceGroup.id === groupId);
    if (!targetGroup) {
      toast.error('Select a choice group first');
      return;
    }

    const dishesToAdd = dishIds
      .map((dishId) => packageEligibleDishes.find((dish) => dish.id === dishId) || null)
      .filter((dish): dish is Dish => Boolean(dish));
    const nextGroupDishes = [...targetGroup.dishes];
    let addedCount = 0;
    let skippedCount = 0;

    dishesToAdd.forEach((dish) => {
      const readiness = getDishPackageReadiness(dish, recipeByDishId, purchaseItemsById);
      if (!readiness.canAdd) {
        toast.error(`${dish.dishName}: ${readiness.reason}`);
        skippedCount += 1;
        return;
      }

      if (packageDishes.some((fixedDish) => fixedDish.dishId === dish.id)) {
        skippedCount += 1;
        return;
      }

      const assignedChoiceGroup = getChoiceGroupAssignment(dish.id);
      if (assignedChoiceGroup && assignedChoiceGroup.id !== groupId) {
        skippedCount += 1;
        return;
      }

      if (nextGroupDishes.some((choiceDish) => choiceDish.dishId === dish.id)) {
        skippedCount += 1;
        return;
      }

      const defaultVariant = getDefaultPackageVariant(dish, units, recipeByDishId, purchaseItemsById);
      if (!defaultVariant) {
        skippedCount += 1;
        return;
      }

      nextGroupDishes.push(buildPackageDish(dish, defaultVariant));
      addedCount += 1;
    });

    if (addedCount > 0) {
      handleUpdateChoiceGroup(groupId, 'dishes', nextGroupDishes);
      const currentGroup = choiceGroups.find((choiceGroup) => choiceGroup.id === groupId);
      if (currentGroup?.costingMethod === 'default-option' && !currentGroup.defaultDishId) {
        handleUpdateChoiceGroup(groupId, 'defaultDishId', nextGroupDishes[0]?.dishId);
      }
      toast.success(`${addedCount} dish${addedCount === 1 ? '' : 'es'} added to choice group`);
    }

    if (skippedCount > 0) {
      toast.info(`${skippedCount} selected dish${skippedCount === 1 ? '' : 'es'} could not be added`);
    }

    setSelectedAvailableDishIds([]);
  };

  const handleAddSelectedToChoiceGroup = () => {
    if (!activeChoiceGroupId) {
      toast.error('Create or select a choice group first');
      return;
    }

    if (selectedAvailableDishIds.length === 0) {
      toast.error('Select at least one dish first');
      return;
    }

    addDishesToChoiceGroup(activeChoiceGroupId, selectedAvailableDishIds);
  };

  const handleQuickAddToChoiceGroup = (dishId: string) => {
    if (!activeChoiceGroupId) {
      toast.error('Select or create a choice group first');
      return;
    }

    addDishesToChoiceGroup(activeChoiceGroupId, [dishId]);
  };

  const handleApplyAssistantPlan = () => {
    if (viewMode) {
      return;
    }

    if (suggestedCategoryGaps.length === 0) {
      toast.info('No missing package categories with available approved dishes');
      return;
    }

    const nextFixedDishes = [...packageDishes];
    const nextChoiceGroups = [...choiceGroups];
    const nextAssignedDishIds = new Set(assignedDishIds);
    let addedLines = 0;
    let firstCreatedGroupId: string | null = null;

    suggestedCategoryGaps.slice(0, 4).forEach(({ requirement, candidates }) => {
      const unassignedCandidates = candidates.filter(
        (dish) => !nextAssignedDishIds.has(dish.id) && getDishPackageReadiness(dish, recipeByDishId, purchaseItemsById).canAdd,
      );
      if (unassignedCandidates.length === 0) {
        return;
      }

      if (requirement.preferChoiceGroup && unassignedCandidates.length >= 2) {
        const existingGroup = nextChoiceGroups.find((choiceGroup) =>
          normalizeComparableText(choiceGroup.groupName).includes(normalizeComparableText(requirement.groupName || requirement.label)),
        );
        if (existingGroup) {
          return;
        }

        const groupDishes = unassignedCandidates
          .slice(0, 3)
          .map((dish) => {
            const defaultVariant = getDefaultPackageVariant(dish, units, recipeByDishId, purchaseItemsById);
            return defaultVariant ? buildPackageDish(dish, defaultVariant) : null;
          })
          .filter((dish): dish is MenuPackageDish => Boolean(dish));

        if (groupDishes.length === 0) {
          return;
        }

        const nextGroup: MenuPackageChoiceGroup = {
          ...createChoiceGroup(nextChoiceGroups.length + 1),
          groupName: requirement.groupName || `${requirement.label} Choice`,
          dishes: groupDishes,
          defaultDishId: groupDishes[0]?.dishId,
        };

        nextChoiceGroups.push(nextGroup);
        firstCreatedGroupId = firstCreatedGroupId || nextGroup.id;
        groupDishes.forEach((dish) => nextAssignedDishIds.add(dish.dishId));
        addedLines += groupDishes.length;
        return;
      }

      const bestDish = unassignedCandidates[0];
      const defaultVariant = getDefaultPackageVariant(bestDish, units, recipeByDishId, purchaseItemsById);
      if (!defaultVariant) {
        return;
      }

      nextFixedDishes.push(buildPackageDish(bestDish, defaultVariant));
      nextAssignedDishIds.add(bestDish.id);
      addedLines += 1;
    });

    if (addedLines === 0) {
      toast.info('Assistant did not find any unassigned dishes to add');
      return;
    }

    setPackageDishes(nextFixedDishes);
    setChoiceGroups(nextChoiceGroups);
    if (firstCreatedGroupId) {
      setActiveChoiceGroupId(firstCreatedGroupId);
    }
    toast.success(`${addedLines} menu line${addedLines === 1 ? '' : 's'} added from package suggestions`);
  };

  const handleUpdateChoiceGroupDish = (
    groupId: string,
    dishIndex: number,
    field: 'dishId' | 'variantId' | 'quantityPerHead',
    value: string | number,
  ) => {
    const targetGroup = choiceGroups.find((choiceGroup) => choiceGroup.id === groupId);
    if (!targetGroup) {
      return;
    }

    const updatedDishes = [...targetGroup.dishes];
    const currentDish = updatedDishes[dishIndex];

    if (field === 'dishId') {
      const dish = packageEligibleDishes.find((candidate) => candidate.id === value);
      const defaultVariant = dish ? getDefaultPackageVariant(dish, units, recipeByDishId, purchaseItemsById) : null;
      if (dish && defaultVariant) {
        updatedDishes[dishIndex] = buildPackageDish(
          dish,
          defaultVariant,
          resolvePackageDishQuantityPerHead(currentDish.quantityPerHead, currentDish.unit, defaultVariant, units),
        );
      }
    } else if (field === 'variantId') {
      const dish = packageEligibleDishes.find((candidate) => candidate.id === currentDish.dishId);
      const selectedVariant = dish
        ? getDishVariantOptions(dish, units, recipeByDishId, purchaseItemsById).find((variant) => variant.id === value) || null
        : null;
      if (dish && selectedVariant) {
        updatedDishes[dishIndex] = buildPackageDish(
          dish,
          selectedVariant,
          resolvePackageDishQuantityPerHead(currentDish.quantityPerHead, currentDish.unit, selectedVariant, units),
        );
      }
    } else if (field === 'quantityPerHead') {
      const dish = packageEligibleDishes.find((candidate) => candidate.id === currentDish.dishId);
      const selectedVariant = dish
        ? getDishVariantOptions(dish, units, recipeByDishId, purchaseItemsById).find((variant) => variant.id === currentDish.variantId) ||
          getDefaultPackageVariant(dish, units, recipeByDishId, purchaseItemsById)
        : null;
      if (dish && selectedVariant) {
        updatedDishes[dishIndex] = buildPackageDish(dish, selectedVariant, Number(value) || 0);
      }
    }

    handleUpdateChoiceGroup(groupId, 'dishes', updatedDishes);
  };

  const handleRemoveChoiceGroupDish = (groupId: string, dishIndex: number) => {
    const targetGroup = choiceGroups.find((choiceGroup) => choiceGroup.id === groupId);
    if (!targetGroup) {
      return;
    }

    const updatedDishes = targetGroup.dishes.filter((_, currentIndex) => currentIndex !== dishIndex);
    handleUpdateChoiceGroup(groupId, 'dishes', updatedDishes);
  };

  const resetTypeForm = () => {
    setEditingType(null);
    setTypeFormName('');
    setTypeFormStatus('active');
    setTypeFormNotes('');
  };

  const handleOpenTypeDialog = () => {
    resetTypeForm();
    setTypeDialogOpen(true);
  };

  const handleEditType = (menuPackageType: MenuPackageTypeMaster) => {
    setEditingType(menuPackageType);
    setTypeFormName(menuPackageType.name);
    setTypeFormStatus(menuPackageType.status);
    setTypeFormNotes(menuPackageType.notes || '');
    setTypeDialogOpen(true);
  };

  const handleSaveType = () => {
    if (!typeFormName.trim()) {
      toast.error('Package type name is required');
      return;
    }

    const code = editingType?.code || createPackageTypeCode(typeFormName);
    const duplicate = menuPackageTypes.find(
      (type) =>
        (type.name.toLowerCase() === typeFormName.trim().toLowerCase() || type.code === code) &&
        type.id !== editingType?.id,
    );

    if (duplicate) {
      toast.error('A package type with this name already exists');
      return;
    }

    if (editingType) {
      onMenuPackageTypesChange(
        menuPackageTypes.map((type) =>
          type.id === editingType.id
            ? {
                ...type,
                name: typeFormName.trim(),
                status: typeFormStatus,
                notes: typeFormNotes.trim() || undefined,
                updatedAt: new Date(),
              }
            : type,
        ),
      );
      toast.success('Package type updated successfully');
    } else {
      onMenuPackageTypesChange([
        ...menuPackageTypes,
        {
          id: `menu-package-type-${Date.now()}`,
          code,
          name: typeFormName.trim(),
          status: typeFormStatus,
          notes: typeFormNotes.trim() || undefined,
          displayOrder: menuPackageTypes.length + 1,
          createdBy: userName,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      toast.success('Package type added successfully');
    }

    if (!formPackageType && typeFormStatus === 'active') {
      setFormPackageType(code);
    }

    setTypeDialogOpen(false);
    resetTypeForm();
  };

  const calculateChoiceGroupPlanningCost = (choiceGroup: MenuPackageChoiceGroup) => {
    if (choiceGroup.dishes.length === 0) {
      return 0;
    }

    if (choiceGroup.costingMethod === 'highest-cost') {
      return Math.max(...choiceGroup.dishes.map((dish) => dish.costPerHead));
    }

    if (choiceGroup.costingMethod === 'average-cost') {
      return (
        choiceGroup.dishes.reduce((sum, dish) => sum + dish.costPerHead, 0) /
        Math.max(choiceGroup.dishes.length, 1)
      );
    }

    const defaultDish = choiceGroup.dishes.find((dish) => dish.dishId === choiceGroup.defaultDishId);
    return defaultDish?.costPerHead || choiceGroup.dishes[0]?.costPerHead || 0;
  };

  const calculateFixedItemsCostPerHead = () => packageDishes.reduce((sum, dish) => sum + dish.costPerHead, 0);

  const calculateChoiceGroupCostPerHead = () =>
    choiceGroups.reduce((sum, choiceGroup) => sum + calculateChoiceGroupPlanningCost(choiceGroup), 0);

  const calculateBaseRecipeCostPerHead = () => calculateFixedItemsCostPerHead() + calculateChoiceGroupCostPerHead();

  const updateMenuEstimate = (updater: (current: MenuPackageMenuEstimate) => MenuPackageMenuEstimate) => {
    setMenuEstimate((current) => ({
      ...updater(current),
      updatedBy: userName,
      updatedAt: new Date(),
    }));
  };

  const getPackageEngineeringUnitOptions = (selectedUnitCode?: string) => {
    const selectedUnit = getEstimateUnitCode(selectedUnitCode, units);
    if (!selectedUnit || packageEngineeringUnitOptions.some((unit) => unit.code === selectedUnit)) {
      return packageEngineeringUnitOptions;
    }

    const existingUnit = getUnitByCode(selectedUnit, units);
    return existingUnit ? [...packageEngineeringUnitOptions, existingUnit] : packageEngineeringUnitOptions;
  };

  const rebuildPackageDishFromEstimate = (
    packageDish: MenuPackageDish,
    baselineQuantity: number | undefined,
    estimateUnit: string | undefined,
  ) => {
    const dish = packageEligibleDishes.find((candidate) => candidate.id === packageDish.dishId);
    const selectedVariant = dish
      ? getDishVariantOptions(dish, units, recipeByDishId, purchaseItemsById).find((variant) => variant.id === packageDish.variantId) ||
        getDefaultPackageVariant(dish, units, recipeByDishId, purchaseItemsById)
      : null;

    if (!dish || !selectedVariant) {
      return packageDish;
    }

    return buildPackageDishFromBaselineEstimate(
      dish,
      selectedVariant,
      baselineQuantity,
      estimateUnit,
      formBaselineGuests,
      packageDish,
    );
  };

  const handleMenuEstimateFixedQuantityChange = (dishId: string, value: number) => {
    const nextQuantity = Math.max(Number(value) || 0, 0);
    const currentDish = packageDishes.find((dish) => dish.dishId === dishId);
    const selectedUnit = currentDish ? getMenuEstimateFixedUnit(currentDish) : undefined;
    setPackageDishes((current) =>
      current.map((dish) => (dish.dishId === dishId ? rebuildPackageDishFromEstimate(dish, nextQuantity, selectedUnit) : dish)),
    );
    updateMenuEstimate((current) => ({
      ...current,
      fixedItemQuantities: {
        ...current.fixedItemQuantities,
        [dishId]: nextQuantity,
      },
    }));
  };

  const handleMenuEstimateFixedUnitChange = (dishId: string, unitCode: string) => {
    const selectedUnit = getEstimateUnitCode(unitCode, units) || normalizeUnitCode(unitCode);
    const currentDish = packageDishes.find((dish) => dish.dishId === dishId);
    const currentQuantity = currentDish ? getMenuEstimateFixedQuantity(currentDish) : undefined;
    setPackageDishes((current) =>
      current.map((dish) => (dish.dishId === dishId ? rebuildPackageDishFromEstimate(dish, currentQuantity, selectedUnit) : dish)),
    );
    updateMenuEstimate((current) => ({
      ...current,
      fixedItemUnits: {
        ...(current.fixedItemUnits || {}),
        [dishId]: selectedUnit,
      },
    }));
  };

  const handleMenuEstimateChoiceQuantityChange = (groupId: string, value: number) => {
    const nextQuantity = Math.max(Number(value) || 0, 0);
    const currentGroup = choiceGroups.find((choiceGroup) => choiceGroup.id === groupId);
    const selectedUnit = currentGroup ? getMenuEstimateChoiceUnit(currentGroup) : undefined;
    setChoiceGroups((current) =>
      current.map((choiceGroup) =>
        choiceGroup.id === groupId
          ? {
              ...choiceGroup,
              dishes: choiceGroup.dishes.map((dish) => rebuildPackageDishFromEstimate(dish, nextQuantity, selectedUnit)),
            }
          : choiceGroup,
      ),
    );
    updateMenuEstimate((current) => ({
      ...current,
      choiceGroupQuantities: {
        ...current.choiceGroupQuantities,
        [groupId]: nextQuantity,
      },
    }));
  };

  const handleMenuEstimateChoiceUnitChange = (groupId: string, unitCode: string) => {
    const selectedUnit = getEstimateUnitCode(unitCode, units) || normalizeUnitCode(unitCode);
    const currentGroup = choiceGroups.find((choiceGroup) => choiceGroup.id === groupId);
    const currentQuantity = currentGroup ? getMenuEstimateChoiceQuantity(currentGroup) : undefined;
    setChoiceGroups((current) =>
      current.map((choiceGroup) =>
        choiceGroup.id === groupId
          ? {
              ...choiceGroup,
              dishes: choiceGroup.dishes.map((dish) => rebuildPackageDishFromEstimate(dish, currentQuantity, selectedUnit)),
            }
          : choiceGroup,
      ),
    );
    updateMenuEstimate((current) => ({
      ...current,
      choiceGroupUnits: {
        ...(current.choiceGroupUnits || {}),
        [groupId]: selectedUnit,
      },
    }));
  };

  const getBaselineGuestDivisor = () => Math.max(Number(formBaselineGuests) || 0, 1);

  const getMenuEstimateFixedQuantity = (dish: MenuPackageDish) =>
    menuEstimate.fixedItemQuantities[dish.dishId] ?? dish.quantityPerHead * getBaselineGuestDivisor();

  const getMenuEstimateChoiceQuantity = (choiceGroup: MenuPackageChoiceGroup) =>
    menuEstimate.choiceGroupQuantities[choiceGroup.id] ??
    getChoiceGroupDefaultEstimateQuantityPerHead(choiceGroup, units, recipeByDishId) * getBaselineGuestDivisor();

  const getMenuEstimateChoiceSelection = (choiceGroup: MenuPackageChoiceGroup) => {
    if (choiceGroup.costingMethod === 'default-option' && choiceGroup.defaultDishId) {
      return choiceGroup.defaultDishId;
    }

    const storedSelection = menuEstimate.choiceGroupSelections?.[choiceGroup.id];
    if (storedSelection && choiceGroup.dishes.some((dish) => dish.dishId === storedSelection)) {
      return storedSelection;
    }

    return getChoiceGroupDefaultSelectionId(choiceGroup) || '';
  };

  const getChoiceGroupMenuEstimateRepresentativeDish = (choiceGroup: MenuPackageChoiceGroup) =>
    choiceGroup.dishes.find((dish) => dish.dishId === getMenuEstimateChoiceSelection(choiceGroup)) ||
    getChoiceGroupDefaultDish(choiceGroup);

  const getMenuEstimateFixedRateUnit = (dish: MenuPackageDish) =>
    getPackageDishEstimateUnit(dish, units, recipeByDishId);

  const getMenuEstimateFixedUnit = (dish: MenuPackageDish) =>
    getEstimateUnitCode(menuEstimate.fixedItemUnits?.[dish.dishId], units) ||
    getMenuEstimateFixedRateUnit(dish);

  const getMenuEstimateChoiceRateUnit = (choiceGroup: MenuPackageChoiceGroup) =>
    getChoiceGroupMenuEstimateRepresentativeDish(choiceGroup)
      ? getPackageDishEstimateUnit(getChoiceGroupMenuEstimateRepresentativeDish(choiceGroup)!, units, recipeByDishId)
      : 'pcs';

  const getMenuEstimateChoiceUnit = (choiceGroup: MenuPackageChoiceGroup) =>
    getEstimateUnitCode(menuEstimate.choiceGroupUnits?.[choiceGroup.id], units) ||
    getMenuEstimateChoiceRateUnit(choiceGroup);

  const convertMenuEstimateQuantityToRateUnit = (quantity: number, selectedUnitCode: string, rateUnitCode: string) => {
    const selectedUnit = getEstimateUnitCode(selectedUnitCode, units);
    const rateUnit = getEstimateUnitCode(rateUnitCode, units);
    if (!selectedUnit || !rateUnit) {
      return null;
    }

    return convertPackageEstimateQuantity(quantity, selectedUnit, rateUnit, units);
  };

  const calculateFixedItemMenuEstimateTotalCost = (dish: MenuPackageDish) => {
    const quantityInRateUnit = convertMenuEstimateQuantityToRateUnit(
      getMenuEstimateFixedQuantity(dish),
      getMenuEstimateFixedUnit(dish),
      getMenuEstimateFixedRateUnit(dish),
    );

    return quantityInRateUnit === null
      ? 0
      : getPackageDishEstimateCostPerUnit(dish, units, recipeByDishId) * quantityInRateUnit;
  };

  const calculateChoiceGroupMenuEstimateTotalCost = (choiceGroup: MenuPackageChoiceGroup) => {
    const quantityInRateUnit = convertMenuEstimateQuantityToRateUnit(
      getMenuEstimateChoiceQuantity(choiceGroup),
      getMenuEstimateChoiceUnit(choiceGroup),
      getMenuEstimateChoiceRateUnit(choiceGroup),
    );

    return quantityInRateUnit === null
      ? 0
      : getChoiceGroupMenuEstimateUnitCost(choiceGroup, getMenuEstimateChoiceSelection(choiceGroup), units, recipeByDishId) *
          quantityInRateUnit;
  };

  const calculateFixedItemMenuEstimateCostPerHead = (dish: MenuPackageDish) =>
    calculateFixedItemMenuEstimateTotalCost(dish) / getBaselineGuestDivisor();

  const calculateChoiceGroupMenuEstimateCostPerHead = (choiceGroup: MenuPackageChoiceGroup) =>
    calculateChoiceGroupMenuEstimateTotalCost(choiceGroup) / getBaselineGuestDivisor();

  const calculateMenuEstimateFixedItemsCostPerHead = () =>
    packageDishes.reduce((sum, dish) => sum + calculateFixedItemMenuEstimateCostPerHead(dish), 0);

  const calculateMenuEstimateChoiceGroupCostPerHead = () =>
    choiceGroups.reduce((sum, choiceGroup) => sum + calculateChoiceGroupMenuEstimateCostPerHead(choiceGroup), 0);

  const calculateTotalCostPerHead = () =>
    calculateMenuEstimateFixedItemsCostPerHead() + calculateMenuEstimateChoiceGroupCostPerHead();

  const calculateTotalMenuCost = () => calculateTotalCostPerHead() * Math.max(formBaselineGuests, 0);

  const calculateMargin = () => {
    if (formSellingPricePerHead <= 0) {
      return 0;
    }

    return ((formSellingPricePerHead - calculateTotalCostPerHead()) / formSellingPricePerHead) * 100;
  };

  const calculateFoodCostPercent = () => {
    if (formSellingPricePerHead <= 0) {
      return 0;
    }

    return (calculateTotalCostPerHead() / formSellingPricePerHead) * 100;
  };

  const calculateMenuEstimateVariance = () => calculateTotalCostPerHead() - calculateBaseRecipeCostPerHead();

  const getPreparationAreaSummary = () => {
    const summary: Record<string, number> = {};
    [...packageDishes, ...choiceGroups.flatMap((choiceGroup) => choiceGroup.dishes)].forEach((dish) => {
      summary[dish.preparationArea] = (summary[dish.preparationArea] || 0) + 1;
    });
    return summary;
  };

  const normalizePackageDishes = (dishesToNormalize: MenuPackageDish[]) =>
    dishesToNormalize.map((packageDish) => {
      const dish = packageEligibleDishes.find((approvedDish) => approvedDish.id === packageDish.dishId);
      const selectedVariant = dish
        ? getDishVariantOptions(dish, units, recipeByDishId, purchaseItemsById).find((variant) => variant.id === packageDish.variantId) ||
          getDishVariantOptions(dish, units, recipeByDishId, purchaseItemsById).find((variant) => variant.salesUnit === packageDish.unit) ||
          getDishVariantOptions(dish, units, recipeByDishId, purchaseItemsById).find((variant) => variant.productionUnit === normalizeUnitCode(packageDish.unit)) ||
          getDefaultPackageVariant(dish, units, recipeByDishId, purchaseItemsById)
        : null;

      if (!dish || !selectedVariant) {
        return packageDish;
      }

      return buildPackageDish(
        dish,
        selectedVariant,
        resolvePackageDishQuantityPerHead(packageDish.quantityPerHead, packageDish.unit, selectedVariant, units),
      );
    });

  const validationErrors = useMemo(() => {
    const issues: string[] = [];

    if (!formPackageName.trim()) {
      issues.push('Package name is required.');
    }

    if (!formPackageType) {
      issues.push('Package type is required.');
    }

    if (formBaselineGuests <= 0) {
      issues.push('Baseline guest count must be greater than 0.');
    }

    if (packageDishes.length === 0 && choiceGroups.length === 0) {
      issues.push('Add at least one fixed item or one choice group.');
    }

    if (packageDishes.some((dish) => !dish.variantId || dish.quantityPerHead <= 0)) {
      issues.push('Every fixed item must have a valid variant and qty/head above 0.');
    }

    packageDishes.forEach((dish) => {
      const readiness = getDishPackageReadiness(dishes.find((item) => item.id === dish.dishId), recipeByDishId, purchaseItemsById);
      if (!readiness.canAdd) {
        issues.push(`Fixed item "${dish.dishName}" is not ready: ${readiness.label}.`);
      }

      const selectedUnit = getMenuEstimateFixedUnit(dish);
      const rateUnit = getMenuEstimateFixedRateUnit(dish);
      if (convertMenuEstimateQuantityToRateUnit(1, selectedUnit, rateUnit) === null) {
        issues.push(
          `UOM ${formatUnitLabel(selectedUnit, units)} cannot convert to ${formatUnitLabel(rateUnit, units)} for "${dish.dishName}".`,
        );
      }
    });

    choiceGroups.forEach((choiceGroup) => {
      if (!choiceGroup.groupName.trim()) {
        issues.push('Every choice group needs a name.');
      }

      if (choiceGroup.dishes.length === 0) {
        issues.push(`Choice group "${choiceGroup.groupName || 'Unnamed'}" needs at least one dish.`);
      }

      if (choiceGroup.minSelect <= 0) {
        issues.push(`Choice group "${choiceGroup.groupName || 'Unnamed'}" must allow at least one minimum selection.`);
      }

      if (choiceGroup.maxSelect < choiceGroup.minSelect) {
        issues.push(`Choice group "${choiceGroup.groupName || 'Unnamed'}" cannot have max select below min select.`);
      }

      if (choiceGroup.maxSelect > choiceGroup.dishes.length && choiceGroup.dishes.length > 0) {
        issues.push(`Choice group "${choiceGroup.groupName || 'Unnamed'}" cannot select more dishes than available options.`);
      }

      if (
        choiceGroup.costingMethod === 'default-option' &&
        (!choiceGroup.defaultDishId || !choiceGroup.dishes.some((dish) => dish.dishId === choiceGroup.defaultDishId))
      ) {
        issues.push(`Choice group "${choiceGroup.groupName || 'Unnamed'}" needs a valid default option.`);
      }

      if (choiceGroup.dishes.some((dish) => !dish.variantId || dish.quantityPerHead <= 0)) {
        issues.push(`Choice group "${choiceGroup.groupName || 'Unnamed'}" has a dish with missing variant or qty/head.`);
      }

      choiceGroup.dishes.forEach((dish) => {
        const readiness = getDishPackageReadiness(dishes.find((item) => item.id === dish.dishId), recipeByDishId, purchaseItemsById);
        if (!readiness.canAdd) {
          issues.push(`Choice group "${choiceGroup.groupName || 'Unnamed'}" has "${dish.dishName}" not ready: ${readiness.label}.`);
        }
      });

      const selectedUnit = getMenuEstimateChoiceUnit(choiceGroup);
      const rateUnit = getMenuEstimateChoiceRateUnit(choiceGroup);
      if (convertMenuEstimateQuantityToRateUnit(1, selectedUnit, rateUnit) === null) {
        issues.push(
          `UOM ${formatUnitLabel(selectedUnit, units)} cannot convert to ${formatUnitLabel(rateUnit, units)} for choice group "${choiceGroup.groupName || 'Unnamed'}".`,
        );
      }

      if (
        choiceGroup.required &&
        choiceGroup.costingMethod === 'default-option' &&
        !choiceGroup.dishes.some((dish) => dish.dishId === getMenuEstimateChoiceSelection(choiceGroup))
      ) {
        issues.push(`Choice group "${choiceGroup.groupName || 'Unnamed'}" needs a valid costing basis.`);
      }
    });

    if (Object.values(menuEstimate.fixedItemQuantities).some((quantity) => quantity < 0)) {
      issues.push('Estimated quantity cannot be negative for fixed items.');
    }

    if (Object.values(menuEstimate.choiceGroupQuantities).some((quantity) => quantity < 0)) {
      issues.push('Estimated quantity cannot be negative for choice groups.');
    }

    if (formSellingPricePerHead <= 0) {
      issues.push('Price per head must be greater than 0.');
    }

    const duplicate = menuPackages.find(
      (pkg) =>
        pkg.packageName.toLowerCase() === formPackageName.toLowerCase() &&
        pkg.module === 'banquet' &&
        pkg.id !== editingPackage?.id,
    );

    if (duplicate) {
      issues.push('A package with this name already exists.');
    }

    return Array.from(new Set(issues));
  }, [
    choiceGroups,
    dishes,
    editingPackage?.id,
    formBaselineGuests,
    formPackageName,
    formPackageType,
    formSellingPricePerHead,
    menuPackages,
    menuEstimate,
    packageDishes,
    purchaseItemsById,
    recipeByDishId,
    units,
  ]);

  const validationWarnings = useMemo(() => {
    const issues: string[] = [];

    packageDishes.forEach((dish) => {
      if (getPackageDishEstimateCostPerUnit(dish, units, recipeByDishId) <= 0) {
        issues.push(`Fixed item "${dish.dishName}" has zero recipe cost.`);
      }

      if (getMenuEstimateFixedQuantity(dish) === 0) {
        issues.push(`Fixed item "${dish.dishName}" has zero estimated quantity.`);
      }
    });

    choiceGroups.forEach((choiceGroup) => {
      if (
        getChoiceGroupMenuEstimateUnitCost(choiceGroup, getMenuEstimateChoiceSelection(choiceGroup), units, recipeByDishId) <= 0
      ) {
        issues.push(`Choice group "${choiceGroup.groupName || 'Unnamed'}" has zero recipe cost.`);
      }

      if (choiceGroup.required && getMenuEstimateChoiceQuantity(choiceGroup) === 0) {
        issues.push(`Choice group "${choiceGroup.groupName || 'Unnamed'}" has zero estimated quantity.`);
      }
    });

    const dessertRequirement = PACKAGE_CATEGORY_REQUIREMENTS.find((requirement) => requirement.id === 'dessert');
    const hasDessertEstimate =
      !dessertRequirement ||
      packageDishLines.some((dish) => packageDishMatchesRequirement(dish, eligibleDishById, dessertRequirement));
    if (packageDishLines.length > 0 && !hasDessertEstimate) {
      issues.push('Dessert estimate missing.');
    }

    if (formSellingPricePerHead > 0) {
      const totalCostPerHead = calculateTotalCostPerHead();
      const marginPercent = ((formSellingPricePerHead - totalCostPerHead) / formSellingPricePerHead) * 100;
      const foodCostPercent = (totalCostPerHead / formSellingPricePerHead) * 100;

      if (marginPercent < TARGET_MARGIN_PERCENT) {
        issues.push(`Selling price below ${TARGET_MARGIN_PERCENT}% target margin.`);
      }

      if (foodCostPercent > TARGET_FOOD_COST_PERCENT) {
        issues.push(`Food cost is above ${TARGET_FOOD_COST_PERCENT}% target.`);
      }
    }

    const packageTotalCost = calculateTotalMenuCost();
    if (packageTotalCost > 0) {
      packageDishes.forEach((dish) => {
        const impactPercent = (calculateFixedItemMenuEstimateTotalCost(dish) / packageTotalCost) * 100;
        if (impactPercent > 50) {
          issues.push(`Cost impact exceeds 50% for "${dish.dishName}".`);
        }
      });

      choiceGroups.forEach((choiceGroup) => {
        const impactPercent = (calculateChoiceGroupMenuEstimateTotalCost(choiceGroup) / packageTotalCost) * 100;
        if (impactPercent > 50) {
          issues.push(`Cost impact exceeds 50% for "${choiceGroup.groupName || 'Unnamed'}".`);
        }
      });
    }

    return Array.from(new Set(issues));
  }, [
    choiceGroups,
    eligibleDishById,
    formBaselineGuests,
    formSellingPricePerHead,
    menuEstimate,
    packageDishes,
    packageDishLines,
    recipeByDishId,
    units,
  ]);

  const handleSave = () => {
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }

    const normalizedPackageDishes = normalizePackageDishes(packageDishes);
    const normalizedChoiceGroups = choiceGroups.map((choiceGroup) => {
      const normalizedDishes = normalizePackageDishes(choiceGroup.dishes);
      const normalizedDefaultDishId = normalizedDishes.some((dish) => dish.dishId === choiceGroup.defaultDishId)
        ? choiceGroup.defaultDishId
        : normalizedDishes[0]?.dishId;

      return {
        ...choiceGroup,
        dishes: normalizedDishes,
        defaultDishId: normalizedDefaultDishId,
      };
    });

    if (normalizedPackageDishes.some((packageDish) => !packageDish.variantId)) {
      toast.error('Please select a valid variant for each fixed dish');
      return;
    }

    if (
      normalizedChoiceGroups.some((choiceGroup) =>
        choiceGroup.dishes.some((choiceDish) => !choiceDish.variantId),
      )
    ) {
      toast.error('Please select a valid variant for each choice-group dish');
      return;
    }

    const notReadyLine = [...normalizedPackageDishes, ...normalizedChoiceGroups.flatMap((choiceGroup) => choiceGroup.dishes)]
      .map((packageDish) => ({
        packageDish,
        readiness: getDishPackageReadiness(dishes.find((dish) => dish.id === packageDish.dishId), recipeByDishId, purchaseItemsById),
      }))
      .find((line) => !line.readiness.canAdd);

    if (notReadyLine) {
      toast.error(`${notReadyLine.packageDish.dishName}: ${notReadyLine.readiness.reason}`);
      return;
    }

    const normalizedMenuEstimate = buildMenuEstimate(
      menuEstimate,
      normalizedPackageDishes,
      normalizedChoiceGroups,
      formBaselineGuests,
      userName,
      units,
      recipeByDishId,
    );

    if (
      Object.values(normalizedMenuEstimate.fixedItemQuantities).some((quantity) => quantity < 0) ||
      Object.values(normalizedMenuEstimate.choiceGroupQuantities).some((quantity) => quantity < 0)
    ) {
      toast.error('Menu estimate cannot contain negative quantities');
      return;
    }

    const convertSavedEstimateQuantity = (quantity: number, selectedUnitCode: string, rateUnitCode: string) => {
      const selectedUnit = getEstimateUnitCode(selectedUnitCode, units);
      const rateUnit = getEstimateUnitCode(rateUnitCode, units);
      if (!selectedUnit || !rateUnit) {
        return null;
      }

      return convertPackageEstimateQuantity(quantity, selectedUnit, rateUnit, units);
    };
    const getSavedChoiceSelection = (choiceGroup: MenuPackageChoiceGroup) => {
      if (choiceGroup.costingMethod === 'default-option' && choiceGroup.defaultDishId) {
        return choiceGroup.defaultDishId;
      }

      const storedSelection = normalizedMenuEstimate.choiceGroupSelections?.[choiceGroup.id];
      if (storedSelection && choiceGroup.dishes.some((dish) => dish.dishId === storedSelection)) {
        return storedSelection;
      }

      return getChoiceGroupDefaultSelectionId(choiceGroup) || '';
    };
    const getSavedChoiceRateUnit = (choiceGroup: MenuPackageChoiceGroup) => {
      const representativeDish =
        choiceGroup.dishes.find((dish) => dish.dishId === getSavedChoiceSelection(choiceGroup)) ||
        getChoiceGroupDefaultDish(choiceGroup);

      return representativeDish ? getPackageDishEstimateUnit(representativeDish, units, recipeByDishId) : 'pcs';
    };

    let invalidSavedUnitLine = '';
    const fixedItemsTotalCost = normalizedPackageDishes.reduce((sum, dish) => {
      const selectedUnit =
        getEstimateUnitCode(normalizedMenuEstimate.fixedItemUnits?.[dish.dishId], units) ||
        getPackageDishEstimateUnit(dish, units, recipeByDishId);
      const rateUnit = getPackageDishEstimateUnit(dish, units, recipeByDishId);
      const quantityInRateUnit = convertSavedEstimateQuantity(
        normalizedMenuEstimate.fixedItemQuantities[dish.dishId] ??
          getPackageDishEstimateQuantityPerHead(dish, units, recipeByDishId) * Math.max(formBaselineGuests, 1),
        selectedUnit,
        rateUnit,
      );

      if (quantityInRateUnit === null) {
        invalidSavedUnitLine = invalidSavedUnitLine || dish.dishName;
        return sum;
      }

      return sum + getPackageDishEstimateCostPerUnit(dish, units, recipeByDishId) * quantityInRateUnit;
    }, 0);
    const choiceGroupsTotalCost = normalizedChoiceGroups.reduce((sum, choiceGroup) => {
      const selectedUnit =
        getEstimateUnitCode(normalizedMenuEstimate.choiceGroupUnits?.[choiceGroup.id], units) ||
        getSavedChoiceRateUnit(choiceGroup);
      const rateUnit = getSavedChoiceRateUnit(choiceGroup);
      const quantityInRateUnit = convertSavedEstimateQuantity(
        normalizedMenuEstimate.choiceGroupQuantities[choiceGroup.id] ??
          getChoiceGroupDefaultEstimateQuantityPerHead(choiceGroup, units, recipeByDishId) * Math.max(formBaselineGuests, 1),
        selectedUnit,
        rateUnit,
      );

      if (quantityInRateUnit === null) {
        invalidSavedUnitLine = invalidSavedUnitLine || choiceGroup.groupName || 'Unnamed choice group';
        return sum;
      }

      return (
        sum +
        getChoiceGroupMenuEstimateUnitCost(choiceGroup, getSavedChoiceSelection(choiceGroup), units, recipeByDishId) *
          quantityInRateUnit
      );
    }, 0);

    if (invalidSavedUnitLine) {
      toast.error(`Selected UOM cannot convert for ${invalidSavedUnitLine}`);
      return;
    }

    const totalCostPerHead = (fixedItemsTotalCost + choiceGroupsTotalCost) / Math.max(formBaselineGuests, 1);

    const packageData: MenuPackage = {
      id: editingPackage?.id || `package-${Date.now()}`,
      packageName: formPackageName,
      packageType: formPackageType,
      module: 'banquet',
      dishes: normalizedPackageDishes,
      choiceGroups: normalizedChoiceGroups,
      minimumGuests: formBaselineGuests,
      totalCostPerHead,
      sellingPricePerHead: formSellingPricePerHead,
      menuEstimate: normalizedMenuEstimate,
      status: formStatus,
      description: formDescription,
      createdBy: editingPackage?.createdBy || userName,
      createdAt: editingPackage?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    if (editingPackage) {
      onMenuPackagesChange(menuPackages.map((pkg) => (pkg.id === editingPackage.id ? packageData : pkg)));
      toast.success('Menu package updated successfully');
    } else {
      onMenuPackagesChange([...menuPackages, packageData]);
      toast.success('Menu package created successfully');
    }

    setDialogOpen(false);
  };

  const getStatusBadge = (status: 'draft' | 'approved' | 'inactive') => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">Approved</span>;
      case 'draft':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Draft</span>;
      case 'inactive':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>;
    }
  };

  const baseRecipeCostPerHead = calculateBaseRecipeCostPerHead();
  const menuEstimateFixedCostPerHead = calculateMenuEstimateFixedItemsCostPerHead();
  const menuEstimateChoiceCostPerHead = calculateMenuEstimateChoiceGroupCostPerHead();
  const menuEstimateCostPerHead = calculateTotalCostPerHead();
  const menuEstimateTotalCost = calculateTotalMenuCost();
  const menuEstimateVariance = calculateMenuEstimateVariance();
  const validationIssueCount = validationErrors.length + validationWarnings.length;
  const validationStatusLabel = validationErrors.length > 0 ? 'Blocked' : validationWarnings.length > 0 ? 'Review' : 'Healthy';
  const validationStatusClass =
    validationErrors.length > 0 ? 'text-red-600' : validationWarnings.length > 0 ? 'text-amber-600' : 'text-green-600';
  const recommendedSellingPricePerHead =
    menuEstimateCostPerHead > 0 ? menuEstimateCostPerHead / (TARGET_FOOD_COST_PERCENT / 100) : 0;
  const sellingPriceGap = Math.max(recommendedSellingPricePerHead - formSellingPricePerHead, 0);
  const totalSelectedLines = packageDishLines.length;
  const sortedPreparationAreas = Object.entries(preparationAreaCounts).sort((left, right) => right[1] - left[1]);
  const dominantPreparationArea = sortedPreparationAreas[0];
  const formatChoiceGroupDishSummary = (choiceGroup: MenuPackageChoiceGroup, maxItems = 3, includeQuantities = false) => {
    if (choiceGroup.dishes.length === 0) {
      return 'No dishes assigned';
    }

    const visibleDishes = choiceGroup.dishes.slice(0, maxItems).map((dish) =>
      includeQuantities ? `${dish.dishName} (${formatQuantityWithUnit(dish.quantityPerHead, dish.unit, units)})` : dish.dishName,
    );
    const remainingCount = choiceGroup.dishes.length - visibleDishes.length;
    return `${visibleDishes.join(', ')}${remainingCount > 0 ? ` +${remainingCount} more` : ''}`;
  };
  const costEngineeringLines: CostEngineeringLine[] = [
    ...packageDishes.map((dish) => {
      const estimateQty = getMenuEstimateFixedQuantity(dish);
      const selectedUnit = getMenuEstimateFixedUnit(dish);
      const rateUnit = getMenuEstimateFixedRateUnit(dish);
      const conversionValid = convertMenuEstimateQuantityToRateUnit(1, selectedUnit, rateUnit) !== null;
      const unitCost = getPackageDishEstimateCostPerUnit(dish, units, recipeByDishId);
      const totalCost = calculateFixedItemMenuEstimateTotalCost(dish);
      const costPerGuest = calculateFixedItemMenuEstimateCostPerHead(dish);
      const readiness = getDishReadiness(dish.dishId);
      return {
        id: `fixed-${dish.dishId}`,
        sourceId: dish.dishId,
        type: 'Fixed' as const,
        name: dish.dishName,
        detail: `${dish.variantLabel || 'Default'} | ${dish.preparationArea.replace(/-/g, ' ')}`,
        readiness,
        estimateQty,
        selectedUnit,
        rateUnit,
        unitCost,
        qtyPerGuestLabel: formatBaselineQuantityPerGuest(estimateQty, formBaselineGuests, selectedUnit, units),
        costPerGuest,
        totalCost,
        impactPercent: menuEstimateTotalCost > 0 ? (totalCost / menuEstimateTotalCost) * 100 : 0,
        conversionValid,
        hasWarning: unitCost <= 0 || estimateQty <= 0 || !conversionValid,
      };
    }),
    ...choiceGroups.map((choiceGroup) => {
      const representativeDish = getChoiceGroupMenuEstimateRepresentativeDish(choiceGroup);
      const estimateQty = getMenuEstimateChoiceQuantity(choiceGroup);
      const selectedUnit = getMenuEstimateChoiceUnit(choiceGroup);
      const rateUnit = getMenuEstimateChoiceRateUnit(choiceGroup);
      const conversionValid = convertMenuEstimateQuantityToRateUnit(1, selectedUnit, rateUnit) !== null;
      const unitCost = getChoiceGroupMenuEstimateUnitCost(
        choiceGroup,
        getMenuEstimateChoiceSelection(choiceGroup),
        units,
        recipeByDishId,
      );
      const totalCost = calculateChoiceGroupMenuEstimateTotalCost(choiceGroup);
      const costPerGuest = calculateChoiceGroupMenuEstimateCostPerHead(choiceGroup);
      const readiness =
        choiceGroup.dishes.length === 0
          ? ({
              status: 'recipe-incomplete',
              label: DISH_READINESS_LABELS['recipe-incomplete'],
              canAdd: false,
              reason: 'Choice group must contain at least one ready dish.',
            } as DishPackageReadiness)
          : choiceGroup.dishes.map((dish) => getDishReadiness(dish.dishId)).find((item) => !item.canAdd) ||
            ({
              status: 'ready',
              label: DISH_READINESS_LABELS.ready,
              canAdd: true,
              reason: 'All choice-group dishes are complete and costed.',
            } as DishPackageReadiness);
      return {
        id: `choice-${choiceGroup.id}`,
        sourceId: choiceGroup.id,
        type: 'Choice' as const,
        name: choiceGroup.groupName || 'Unnamed Group',
        detail: `${CHOICE_GROUP_COSTING_METHOD_LABELS[choiceGroup.costingMethod]} | ${representativeDish?.dishName || 'No representative item'} | ${formatChoiceGroupDishSummary(choiceGroup, 3, true)}`,
        readiness,
        estimateQty,
        selectedUnit,
        rateUnit,
        unitCost,
        qtyPerGuestLabel: formatBaselineQuantityPerGuest(estimateQty, formBaselineGuests, selectedUnit, units),
        costPerGuest,
        totalCost,
        impactPercent: menuEstimateTotalCost > 0 ? (totalCost / menuEstimateTotalCost) * 100 : 0,
        conversionValid,
        hasWarning:
          unitCost <= 0 ||
          (choiceGroup.required && estimateQty <= 0) ||
          !conversionValid ||
          (choiceGroup.costingMethod === 'default-option' && !representativeDish),
      };
    }),
  ];
  const topCostDrivers = [...costEngineeringLines]
    .filter((line) => line.totalCost > 0)
    .sort((left, right) => right.totalCost - left.totalCost)
    .slice(0, 4);
  const highestCostLine = topCostDrivers[0] || null;
  const similarPackages = banquetPackages.filter(
    (pkg) => pkg.id !== editingPackage?.id && pkg.packageType === formPackageType,
  );
  const quantitySuggestions: QuantitySuggestion[] = costEngineeringLines
    .map((line) => {
      const comparisonQuantities = similarPackages
        .map((pkg) => {
          const sourceBaselineGuests = Math.max(pkg.menuEstimate?.baselineGuests || pkg.minimumGuests || 1, 1);
          const targetBaselineGuests = getBaselineGuestDivisor();
          const projectQuantityToCurrentBaseline = (
            storedQuantity: number | undefined,
            fallbackQuantityPerGuest: number,
          ) => {
            if (pkg.menuEstimate?.estimateBasis === 'baseline-total') {
              const baselineTotal = storedQuantity ?? fallbackQuantityPerGuest * sourceBaselineGuests;
              return (baselineTotal / sourceBaselineGuests) * targetBaselineGuests;
            }

            return (storedQuantity ?? fallbackQuantityPerGuest) * targetBaselineGuests;
          };

          if (line.type === 'Fixed') {
            const matchingDish = pkg.dishes.find((dish) => dish.dishId === line.sourceId);
            return matchingDish
              ? projectQuantityToCurrentBaseline(
                  pkg.menuEstimate?.fixedItemQuantities?.[line.sourceId],
                  matchingDish.quantityPerHead,
                )
              : undefined;
          }

          const currentChoiceGroup = choiceGroups.find((choiceGroup) => choiceGroup.id === line.sourceId);
          const matchingGroup = (pkg.choiceGroups || []).find(
            (choiceGroup) =>
              normalizeComparableText(choiceGroup.groupName) ===
              normalizeComparableText(currentChoiceGroup?.groupName || line.name),
          );
          return matchingGroup
            ? projectQuantityToCurrentBaseline(
                pkg.menuEstimate?.choiceGroupQuantities?.[matchingGroup.id],
                getChoiceGroupDefaultQuantityPerHead(matchingGroup),
              )
            : undefined;
        })
        .filter((quantity): quantity is number => typeof quantity === 'number' && quantity >= 0);

      if (comparisonQuantities.length === 0) {
        return null;
      }

      const averageQty =
        comparisonQuantities.reduce((sum, quantity) => sum + quantity, 0) / comparisonQuantities.length;
      if (Math.abs(averageQty - line.estimateQty) < 0.05) {
        return null;
      }

      return {
        id: `suggest-${line.id}`,
        sourceId: line.sourceId,
        type: line.type,
        name: line.name,
        averageQty,
        currentQty: line.estimateQty,
        sampleCount: comparisonQuantities.length,
      };
    })
    .filter((suggestion): suggestion is QuantitySuggestion => Boolean(suggestion))
    .slice(0, 4);
  const packageHealthItems = [
    {
      label: 'Package Cost Estimated',
      passed: menuEstimateCostPerHead > 0 && costEngineeringLines.length > 0,
      detail: menuEstimateCostPerHead > 0 ? `Rs. ${menuEstimateCostPerHead.toFixed(2)}/head` : 'Add menu costs',
    },
    {
      label: 'Selling Price Defined',
      passed: formSellingPricePerHead > 0,
      detail: formSellingPricePerHead > 0 ? `Rs. ${formSellingPricePerHead.toFixed(2)}/head` : 'Enter price/head',
    },
    {
      label: 'Margin Above Target',
      passed: formSellingPricePerHead > 0 && calculateMargin() >= TARGET_MARGIN_PERCENT,
      detail:
        formSellingPricePerHead > 0
          ? `${calculateMargin().toFixed(1)}% margin vs ${TARGET_MARGIN_PERCENT}% target`
          : 'Price pending',
    },
    {
      label: 'Choice Groups Costed',
      passed:
        choiceGroups.length === 0 ||
        choiceGroups.every(
          (choiceGroup) =>
            choiceGroup.dishes.length > 0 &&
            getChoiceGroupMenuEstimateUnitCost(choiceGroup, getMenuEstimateChoiceSelection(choiceGroup), units, recipeByDishId) > 0,
        ),
      detail:
        choiceGroups.length === 0
          ? 'No choice groups'
          : `${choiceGroups.filter((choiceGroup) => getChoiceGroupMenuEstimateUnitCost(choiceGroup, getMenuEstimateChoiceSelection(choiceGroup), units, recipeByDishId) > 0).length}/${choiceGroups.length} costed`,
    },
  ];
  const mainCourseRequirement = PACKAGE_CATEGORY_REQUIREMENTS.find((requirement) => requirement.id === 'main-course');
  const dessertRequirement = PACKAGE_CATEGORY_REQUIREMENTS.find((requirement) => requirement.id === 'dessert');
  const mainCourseLineCount = mainCourseRequirement
    ? packageDishLines.filter((dish) => packageDishMatchesRequirement(dish, eligibleDishById, mainCourseRequirement)).length
    : 0;
  const dessertLineCount = dessertRequirement
    ? packageDishLines.filter((dish) => packageDishMatchesRequirement(dish, eligibleDishById, dessertRequirement)).length
    : 0;
  const assistantIssues: AssistantIssue[] = [];

  if (validationErrors.length > 0) {
    assistantIssues.push({
      id: 'validation-error',
      severity: 'error',
      title: `${validationErrors.length} save blocker${validationErrors.length === 1 ? '' : 's'}`,
      detail: validationErrors[0],
    });
  }

  if (formSellingPricePerHead > 0 && calculateMargin() < TARGET_MARGIN_PERCENT) {
    assistantIssues.push({
      id: 'low-margin',
      severity: 'warning',
      title: 'Low margin',
      detail: `${calculateMargin().toFixed(1)}% margin. Raise price/head or replace high-cost dishes.`,
    });
  }

  if (formSellingPricePerHead > 0 && calculateFoodCostPercent() > TARGET_FOOD_COST_PERCENT) {
    assistantIssues.push({
      id: 'high-food-cost',
      severity: 'warning',
      title: 'High food cost',
      detail: `${calculateFoodCostPercent().toFixed(1)}% food cost is above target.`,
    });
  }

  if (suggestedCategoryGaps.length > 0) {
    assistantIssues.push({
      id: 'missing-categories',
      severity: 'info',
      title: 'Missing categories',
      detail: suggestedCategoryGaps
        .slice(0, 4)
        .map((gap) => gap.requirement.label)
        .join(', '),
    });
  }

  choiceGroups
    .filter((choiceGroup) => choiceGroup.dishes.length > 0 && choiceGroup.dishes.length < 2)
    .forEach((choiceGroup) => {
      assistantIssues.push({
        id: `thin-group-${choiceGroup.id}`,
        severity: 'warning',
        title: 'Thin choice group',
        detail: `${choiceGroup.groupName || 'Unnamed group'} has only ${choiceGroup.dishes.length} option.`,
      });
    });

  if (mainCourseLineCount >= 3 && dessertLineCount === 0) {
    assistantIssues.push({
      id: 'main-dessert-imbalance',
      severity: 'warning',
      title: 'Menu imbalance',
      detail: 'Main courses are covered but dessert/sweets are missing.',
    });
  }

  if (dominantPreparationArea && totalSelectedLines >= 4 && dominantPreparationArea[1] / totalSelectedLines > 0.65) {
    assistantIssues.push({
      id: 'prep-area-concentration',
      severity: 'warning',
      title: 'Kitchen load concentration',
      detail: `${dominantPreparationArea[0].replace(/-/g, ' ')} owns ${dominantPreparationArea[1]} of ${totalSelectedLines} lines.`,
    });
  }

  if (highestCostLine && menuEstimateTotalCost > 0 && highestCostLine.totalCost / menuEstimateTotalCost > 0.45) {
    assistantIssues.push({
      id: 'cost-concentration',
      severity: 'warning',
      title: 'Cost concentration',
      detail: `${highestCostLine.name} drives ${(highestCostLine.totalCost / menuEstimateTotalCost * 100).toFixed(0)}% of package cost.`,
    });
  }

  if (assistantIssues.length === 0) {
    assistantIssues.push({
      id: 'ready',
      severity: 'success',
      title: 'Package balanced',
      detail: 'No category, balance, or margin issues detected.',
    });
  }

  const visibleAssistantIssues =
    activeBuilderTab === 'menu-items'
      ? assistantIssues.filter(
          (issue) => !['validation-error', 'low-margin', 'high-food-cost', 'cost-concentration'].includes(issue.id),
        )
      : assistantIssues;
  const primaryAssistantIssue =
    visibleAssistantIssues[0] || {
      id: 'menu-ready',
      severity: 'success' as const,
      title: 'Menu structure ready',
      detail: 'No category or menu-balance issues detected.',
    };
  const assistantToneClass: Record<AssistantSeverity, string> = {
    error: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    success: 'border-green-200 bg-green-50 text-green-800',
  };
  const categoryCoverageItems = Object.entries(selectedCategoryCounts).sort((left, right) => right[1] - left[1]);
  const readyDishCount = packageEligibleDishes.filter((dish) => getDishPackageReadiness(dish, recipeByDishId, purchaseItemsById).canAdd).length;
  const blockedDishCount = Math.max(packageEligibleDishes.length - readyDishCount, 0);
  const packageRecipeIssueCount = packageDishLines.filter((dish) => !getDishReadiness(dish.dishId).canAdd).length;
  const hasMenuIncompleteIssue =
    packageDishLines.length === 0 ||
    choiceGroups.some((choiceGroup) => choiceGroup.required && choiceGroup.dishes.length === 0) ||
    suggestedCategoryGaps.length > 0;
  const hasCostingReviewIssue =
    menuEstimateCostPerHead <= 0 ||
    formSellingPricePerHead <= 0 ||
    validationWarnings.some((issue) => /cost|margin|price|quantity/i.test(issue));
  const reviewVerdict =
    packageRecipeIssueCount > 0
      ? {
          label: 'Recipe Issues Found',
          detail: `${packageRecipeIssueCount} package line${packageRecipeIssueCount === 1 ? '' : 's'} need Dish Master recipe correction.`,
          className: 'border-red-200 bg-red-50 text-red-800',
        }
      : hasMenuIncompleteIssue
        ? {
            label: 'Menu Incomplete',
            detail: 'Complete required categories and choice groups before sale.',
            className: 'border-amber-200 bg-amber-50 text-amber-800',
          }
        : hasCostingReviewIssue || validationErrors.length > 0
          ? {
              label: 'Needs Costing Review',
              detail: 'Review quantities, selling price, margin, and package health.',
              className: 'border-amber-200 bg-amber-50 text-amber-800',
            }
          : {
              label: 'Ready for Sale',
              detail: 'Menu, recipe readiness, costing, and selling checks are complete.',
              className: 'border-green-200 bg-green-50 text-green-800',
            };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="border-b border-gray-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold text-gray-900">Menu Package Builder</h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <span>
              Packages <span className="font-semibold text-gray-900">{banquetPackages.length}</span>
            </span>
            <span>
              Approved{' '}
              <span className="font-semibold text-green-700">
                {banquetPackages.filter((pkg) => pkg.status === 'approved').length}
              </span>
            </span>
            <span>
              Dishes <span className="font-semibold text-blue-700">{approvedDishes.length}</span>
            </span>
          </div>
          <div className="ml-auto flex flex-1 flex-wrap items-center justify-end gap-2 lg:flex-nowrap">
            <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search packages"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-8 w-full rounded border border-gray-300 pl-8 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-8 rounded border border-gray-300 px-2 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Types</option>
              {activeMenuPackageTypes.map((type) => (
                <option key={type.id} value={type.code}>
                  {type.name}
                </option>
              ))}
            </select>
            <button onClick={handleOpenTypeDialog} className={compactSecondaryButtonClass}>
              Types
            </button>
            <button onClick={handleAddNew} className={compactPrimaryButtonClass}>
              <Plus className="h-4 w-4" />
              New Package
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        <div className="overflow-auto rounded border border-gray-200">
          <table className="w-full min-w-[1060px] text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className={compactTableHeadClass}>Package</th>
                <th className={compactTableHeadClass}>Type</th>
                <th className={compactTableHeadClass}>Status</th>
                <th className={`${compactTableHeadClass} text-right`}>Baseline</th>
                <th className={`${compactTableHeadClass} text-right`}>Lines</th>
                <th className={`${compactTableHeadClass} text-right`}>Cost/Guest</th>
                <th className={`${compactTableHeadClass} text-right`}>Price/Guest</th>
                <th className={`${compactTableHeadClass} text-right`}>Margin</th>
                <th className={compactTableHeadClass}>Owner</th>
                <th className={`${compactTableHeadClass} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPackages.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">
                    {searchTerm || typeFilter !== 'all'
                      ? 'No packages match the current filters.'
                      : 'No menu packages yet.'}
                  </td>
                </tr>
              ) : (
                filteredPackages.map((pkg) => {
                  const packageMargin =
                    pkg.sellingPricePerHead > 0
                      ? ((pkg.sellingPricePerHead - pkg.totalCostPerHead) / pkg.sellingPricePerHead) * 100
                      : 0;

                  return (
                    <tr key={pkg.id} className="border-t border-gray-200 hover:bg-orange-50/40">
                      <td className={compactTableCellClass}>
                        <button
                          type="button"
                          onClick={() => handleEdit(pkg)}
                          className="font-semibold text-slate-900 hover:text-orange-700"
                        >
                          {pkg.packageName}
                        </button>
                        {pkg.description ? (
                          <div className="mt-0.5 max-w-lg truncate text-[11px] text-slate-500">{pkg.description}</div>
                        ) : null}
                      </td>
                      <td className={compactTableCellClass}>
                        {packageTypeNameMap.get(pkg.packageType) || pkg.packageType.replace(/-/g, ' ')}
                      </td>
                      <td className={compactTableCellClass}>{getStatusBadge(pkg.status)}</td>
                      <td className={`${compactTableCellClass} text-right text-slate-900`}>
                        {pkg.minimumGuests || 0}
                      </td>
                      <td className={`${compactTableCellClass} text-right text-slate-900`}>
                        {pkg.dishes.length + (pkg.choiceGroups || []).reduce((sum, group) => sum + group.dishes.length, 0)}
                        <span className="ml-1 text-[11px] text-slate-500">
                          ({pkg.dishes.length}F/{pkg.choiceGroups?.length || 0}G)
                        </span>
                      </td>
                      <td className={`${compactTableCellClass} text-right font-medium text-slate-900`}>
                        Rs. {pkg.totalCostPerHead.toFixed(2)}
                      </td>
                      <td className={`${compactTableCellClass} text-right font-medium text-orange-700`}>
                        Rs. {pkg.sellingPricePerHead.toFixed(2)}
                      </td>
                      <td
                        className={`${compactTableCellClass} text-right font-semibold ${
                          pkg.sellingPricePerHead <= 0
                            ? 'text-amber-700'
                            : packageMargin >= TARGET_MARGIN_PERCENT
                              ? 'text-green-700'
                              : 'text-red-700'
                        }`}
                      >
                        {pkg.sellingPricePerHead > 0 ? `${packageMargin.toFixed(1)}%` : 'Pending'}
                      </td>
                      <td className={compactTableCellClass}>{pkg.createdBy}</td>
                      <td className={`${compactTableCellClass} text-right`}>
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleView(pkg)}
                            className="inline-flex size-7 items-center justify-center rounded text-gray-600 hover:bg-gray-100"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(pkg)}
                            className="inline-flex size-7 items-center justify-center rounded text-blue-600 hover:bg-blue-50"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="flex max-h-[94vh] w-full max-w-[98vw] xl:max-w-[1540px] flex-col overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5">
              <h2 className="text-base font-semibold text-slate-900">
                {viewMode ? 'View Package' : editingPackage ? 'Edit Package' : 'Create Menu Package'}
              </h2>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="inline-flex size-8 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
                aria-label="Close package dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid gap-px border-b border-slate-200 bg-slate-200 text-xs md:grid-cols-5">
              {(activeBuilderTab === 'menu-items'
                ? [
                    { label: 'Fixed Items', value: packageDishes.length.toString() },
                    { label: 'Choice Groups', value: choiceGroups.length.toString() },
                    { label: 'Menu Lines', value: totalSelectedLines.toString() },
                    { label: 'Ready Dishes', value: readyDishCount.toString(), valueClassName: 'text-green-700' },
                    { label: 'Blocked Dishes', value: blockedDishCount.toString(), valueClassName: blockedDishCount > 0 ? 'text-amber-700' : 'text-slate-900' },
                  ]
                : [
                    { label: 'Package Cost/Guest', value: `Rs. ${menuEstimateCostPerHead.toFixed(2)}` },
                    { label: 'Selling Price/Guest', value: formSellingPricePerHead > 0 ? `Rs. ${formSellingPricePerHead.toFixed(2)}` : 'Pending price' },
                    { label: 'Food Cost %', value: formSellingPricePerHead > 0 ? `${calculateFoodCostPercent().toFixed(1)}%` : 'Pending price', valueClassName: formSellingPricePerHead <= 0 ? 'text-amber-600' : calculateFoodCostPercent() <= TARGET_FOOD_COST_PERCENT ? 'text-green-600' : 'text-red-600' },
                    { label: 'Margin %', value: formSellingPricePerHead > 0 ? `${calculateMargin().toFixed(1)}%` : 'Pending price', valueClassName: formSellingPricePerHead <= 0 ? 'text-amber-600' : calculateMargin() >= TARGET_MARGIN_PERCENT ? 'text-green-600' : 'text-red-600' },
                    {
                      label: 'Validation Status',
                      value: validationStatusLabel,
                      valueClassName: validationStatusClass,
                    },
                  ]
              ).map((item) => (
                <div key={item.label} className="bg-slate-50 px-2 py-1">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</div>
                  <div className={`font-semibold text-slate-900 ${item.valueClassName || ''}`}>{item.value}</div>
                </div>
              ))}
            </div>

            <div className="border-b border-slate-200 bg-white px-3 py-2">
              <div className={`grid gap-2 ${activeBuilderTab === 'menu-items' ? 'xl:grid-cols-[minmax(0,2fr)_220px_160px]' : 'xl:grid-cols-[minmax(0,2fr)_180px_170px_160px_140px]'}`}>
                <div>
                  <label className={compactLabelClass}>Package Name *</label>
                  <input
                    type="text"
                    value={formPackageName}
                    onChange={(event) => setFormPackageName(event.target.value)}
                    disabled={viewMode}
                    placeholder="Package name"
                    className={compactInputClass}
                  />
                </div>
                <div>
                  <label className={compactLabelClass}>Package Type *</label>
                  <select
                    value={formPackageType}
                    onChange={(event) => setFormPackageType(event.target.value)}
                    disabled={viewMode}
                    className={compactInputClass}
                  >
                    {sortedMenuPackageTypes.map((type) => (
                      <option key={type.id} value={type.code}>
                        {type.name}
                        {type.status === 'inactive' ? ' (Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {activeBuilderTab !== 'menu-items' ? (
                  <>
                    <div>
                      <label className={compactLabelClass}>Baseline Guest Count *</label>
                      <input
                        type="number"
                        value={formBaselineGuests}
                        onChange={(event) => setFormBaselineGuests(Number(event.target.value))}
                        disabled={viewMode}
                        placeholder="100"
                        className={compactInputClass}
                      />
                    </div>
                    <div>
                      <label className={compactLabelClass}>Selling Price/Guest *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formSellingPricePerHead}
                        onChange={(event) => setFormSellingPricePerHead(Number(event.target.value))}
                        disabled={viewMode}
                        className={compactInputClass}
                      />
                    </div>
                  </>
                ) : null}
                <div>
                  <label className={compactLabelClass}>Status *</label>
                  <select
                    value={formStatus}
                    onChange={(event) => setFormStatus(event.target.value as 'draft' | 'approved' | 'inactive')}
                    disabled={viewMode}
                    className={compactInputClass}
                  >
                    <option value="draft">Draft</option>
                    <option value="approved">Approved</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-end justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 pt-1.5">
              <div className="flex gap-1 overflow-x-auto">
                {BUILDER_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveBuilderTab(tab.id)}
                    className={`h-7 rounded-t border border-b-0 px-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
                      activeBuilderTab === tab.id
                        ? 'border-slate-200 bg-white text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="pb-2 text-[11px] text-slate-500">
                {filteredAvailableDishes.length} filtered | {selectedAvailableDishIds.length} selected
              </div>
            </div>

            <div className="border-b border-slate-200 bg-white px-3 py-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className={`flex min-w-[260px] flex-1 items-center gap-2 rounded border px-2 py-1 ${assistantToneClass[primaryAssistantIssue.severity]}`}>
                  <span className="font-semibold">{primaryAssistantIssue.title}</span>
                  <span className="truncate">{primaryAssistantIssue.detail}</span>
                </div>
                {categoryCoverageItems.slice(0, 5).map(([category, count]) => (
                  <span key={category} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
                    {category}: <span className="font-semibold text-slate-900">{count}</span>
                  </span>
                ))}
                {suggestedCategoryGaps.length > 0 && !viewMode ? (
                  <button type="button" onClick={handleApplyAssistantPlan} className={compactPrimaryButtonClass}>
                    Apply Suggestions
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-2">
              {activeBuilderTab === 'package' && (
                <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
                  <section className="rounded border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      Package Setup Notes
                    </div>
                    <div className="space-y-3 p-3">
                      <div>
                        <label className={compactLabelClass}>Description</label>
                        <textarea
                          value={formDescription}
                          onChange={(event) => setFormDescription(event.target.value)}
                          disabled={viewMode}
                          rows={5}
                          placeholder="Optional description, service note, or commercial summary."
                          className={compactTextareaClass}
                        />
                      </div>
                      <div className="grid gap-2 md:grid-cols-3">
                        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">Baseline Guests</div>
                          <div className="font-semibold text-slate-900">{formBaselineGuests}</div>
                        </div>
                        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">Package Type</div>
                          <div className="font-semibold text-slate-900">
                            {packageTypeNameMap.get(formPackageType) || formPackageType || 'Not selected'}
                          </div>
                        </div>
                        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">Status</div>
                          <div className="font-semibold capitalize text-slate-900">{formStatus}</div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      Validation
                    </div>
                    <div className="p-3">
                      {validationIssueCount === 0 ? (
                        <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                          Package setup and menu estimate are valid. You can continue to menu composition or save.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {validationErrors.length > 0 ? (
                            <div className="rounded border border-red-200 bg-red-50 px-3 py-2">
                              <div className="text-sm font-medium text-red-700">Resolve these before saving:</div>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                                {validationErrors.map((issue) => (
                                  <li key={issue}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {validationWarnings.length > 0 ? (
                            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2">
                              <div className="text-sm font-medium text-amber-700">Warnings to review:</div>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-700">
                                {validationWarnings.map((issue) => (
                                  <li key={issue}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              )}

              {activeBuilderTab === 'menu-items' && (
                <div className="space-y-3">
                  <div className="rounded border border-slate-200 bg-white p-2.5">
                    <div className="grid gap-2 lg:grid-cols-[minmax(0,1.6fr)_180px_180px_180px_auto]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <input
                          type="text"
                          value={itemSearchTerm}
                          onChange={(event) => setItemSearchTerm(event.target.value)}
                          disabled={viewMode}
                          placeholder="Search dish, category, cuisine, or area"
                          className={`${compactInputClass} pl-9`}
                        />
                      </div>
                      <select
                        value={categoryFilter}
                        onChange={(event) => setCategoryFilter(event.target.value)}
                        disabled={viewMode}
                        className={compactInputClass}
                      >
                        <option value="all">All Categories</option>
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      <select
                        value={cuisineFilter}
                        onChange={(event) => setCuisineFilter(event.target.value)}
                        disabled={viewMode}
                        className={compactInputClass}
                      >
                        <option value="all">All Cuisines</option>
                        {cuisineOptions.map((cuisine) => (
                          <option key={cuisine} value={cuisine}>
                            {cuisine}
                          </option>
                        ))}
                      </select>
                      <select
                        value={preparationAreaFilter}
                        onChange={(event) => setPreparationAreaFilter(event.target.value)}
                        disabled={viewMode}
                        className={compactInputClass}
                      >
                        <option value="all">All Preparation Areas</option>
                        {preparationAreaOptions.map((preparationArea) => (
                          <option key={preparationArea} value={preparationArea}>
                            {preparationArea.replace(/-/g, ' ')}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={resetMenuItemFilters} disabled={viewMode} className={compactSecondaryButtonClass}>
                        Clear
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>{filteredAvailableDishes.length} dishes</span>
                        <span>{selectedAvailableDishIds.length} selected</span>
                        <span>
                          Active group:{' '}
                          <span className="font-medium text-slate-900">{activeChoiceGroup?.groupName || 'None selected'}</span>
                        </span>
                      </div>
                      {!viewMode && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" onClick={handleSelectVisibleDishes} className={compactSecondaryButtonClass}>
                            Select Visible
                          </button>
                          <button type="button" onClick={handleClearDishSelection} className={compactSecondaryButtonClass}>
                            Clear Selection
                          </button>
                          <button type="button" onClick={handleAddSelectedToFixedItems} className={compactPrimaryButtonClass}>
                            Add to Fixed
                          </button>
                          <button type="button" onClick={handleAddSelectedToChoiceGroup} className={compactOutlineAccentButtonClass}>
                            Add to Active Group
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.92fr)]">
                    <section className="rounded border border-slate-200 bg-white">
                      <div className="flex items-center justify-between border-b border-slate-200 px-2.5 py-1.5">
                        <h3 className="text-sm font-semibold text-slate-900">Available Dishes</h3>
                        <span className="text-[11px] text-slate-500">{filteredAvailableDishes.length} rows</span>
                      </div>
                      <div className="max-h-[520px] min-h-[240px] overflow-auto divide-y divide-slate-100">
                        {filteredAvailableDishes.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-slate-500">No dishes match the current filters.</div>
                        ) : (
                          filteredAvailableDishes.map((dish) => {
                            const assignmentLabel = getDishAssignmentLabel(dish.id);
                            const isSelected = selectedAvailableDishIds.includes(dish.id);
                            const readiness = getDishPackageReadiness(dish, recipeByDishId, purchaseItemsById);

                            return (
                              <div
                                key={dish.id}
                                className={`grid grid-cols-[24px_minmax(0,1fr)_132px_104px] items-center gap-2 px-2 py-1.5 text-sm ${
                                  isSelected ? 'bg-orange-50' : assignmentLabel ? 'bg-slate-50' : 'bg-white'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleAvailableDishSelection(dish.id)}
                                  disabled={viewMode || Boolean(assignmentLabel) || !readiness.canAdd}
                                  title={readiness.canAdd ? undefined : readiness.reason}
                                  className="size-4"
                                />
                                <div className="min-w-0">
                                  <div className="truncate font-medium text-slate-900">{dish.dishName}</div>
                                  <div className="truncate text-[11px] text-slate-500">
                                    {dish.category} | {dish.cuisineName} | {dish.preparationArea.replace(/-/g, ' ')}
                                  </div>
                                </div>
                                <div className="flex justify-end">
                                  <span
                                    className={`inline-flex max-w-[128px] truncate rounded border px-1.5 py-0.5 text-[11px] font-medium ${getDishReadinessBadgeClass(readiness)}`}
                                    title={readiness.reason}
                                  >
                                    {readiness.label}
                                  </span>
                                </div>
                                <div className="flex justify-end gap-1">
                                  {assignmentLabel ? (
                                    <span className="inline-flex max-w-[96px] truncate rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">
                                      {assignmentLabel}
                                    </span>
                                  ) : viewMode ? (
                                    <span className="text-[11px] text-slate-400">Open</span>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickAddToFixedItems(dish.id)}
                                        disabled={!readiness.canAdd}
                                        title={readiness.canAdd ? 'Add as fixed item' : readiness.reason}
                                        className="inline-flex h-7 items-center rounded border border-slate-300 px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
                                      >
                                        Fixed
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickAddToChoiceGroup(dish.id)}
                                        disabled={!activeChoiceGroupId || !readiness.canAdd}
                                        title={readiness.canAdd ? 'Add to active choice group' : readiness.reason}
                                        className="inline-flex h-7 items-center rounded border border-orange-300 px-2 text-[11px] font-medium text-orange-700 hover:bg-orange-50 disabled:bg-slate-100 disabled:text-slate-400"
                                      >
                                        Group
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </section>

                    <div className="space-y-2">
                      <section className="rounded border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => setFixedItemsOpen((current) => !current)}
                          className="flex w-full items-center justify-between gap-2 border-b border-slate-200 px-2.5 py-1.5 text-left"
                        >
                          <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            {fixedItemsOpen ? <ChevronDown className="size-3.5 text-slate-500" /> : <ChevronRight className="size-3.5 text-slate-500" />}
                            Fixed Items
                          </span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {packageDishes.length} lines
                          </span>
                        </button>
                        <div className={fixedItemsOpen ? 'max-h-[245px] overflow-auto' : 'hidden'}>
                          {packageDishes.length === 0 ? (
                            <div className="px-4 py-5 text-center text-sm text-slate-500">No fixed items selected.</div>
                          ) : (
                            <div className="min-w-[620px] divide-y divide-slate-100">
                              {packageDishes.map((dish, index) => {
                                const readiness = getDishReadiness(dish.dishId);
                                return (
                                  <div
                                    key={`${dish.dishId}-${index}`}
                                    className="grid grid-cols-[minmax(0,1fr)_150px_132px_28px] items-center gap-2 px-2 py-1.5 text-sm"
                                  >
                                    <div className="min-w-0">
                                      <div className="truncate font-medium text-slate-900">{dish.dishName}</div>
                                      <div className="truncate text-[11px] text-slate-500">{dish.preparationArea.replace(/-/g, ' ')}</div>
                                    </div>
                                    <select
                                      value={dish.variantId || ''}
                                      onChange={(event) => handleUpdateDish(index, 'variantId', event.target.value)}
                                      disabled={viewMode}
                                      className={compactInputClass}
                                    >
                                      {(packageEligibleDishes.find((item) => item.id === dish.dishId)
                                        ? getDishVariantOptions(packageEligibleDishes.find((item) => item.id === dish.dishId)!, units, recipeByDishId, purchaseItemsById)
                                        : []
                                      ).map((variant) => (
                                        <option key={variant.id} value={variant.id}>
                                          {variant.label}
                                        </option>
                                      ))}
                                    </select>
                                    <span
                                      className={`inline-flex justify-center truncate rounded border px-1.5 py-0.5 text-[11px] font-medium ${getDishReadinessBadgeClass(readiness)}`}
                                      title={readiness.reason}
                                    >
                                      {readiness.label}
                                    </span>
                                    {!viewMode ? (
                                      <button
                                        onClick={() => handleRemoveDish(index)}
                                        className="inline-flex size-7 items-center justify-center rounded text-red-600 hover:bg-red-50"
                                        title="Remove fixed item"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    ) : (
                                      <span />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </section>

                      <section className="rounded border border-slate-200 bg-white">
                        <div className="flex items-center justify-between border-b border-slate-200 px-2.5 py-1.5">
                          <button
                            type="button"
                            onClick={() => setChoiceGroupsOpen((current) => !current)}
                            className="flex items-center gap-2 text-left text-sm font-semibold text-slate-900"
                          >
                            {choiceGroupsOpen ? <ChevronDown className="size-3.5 text-slate-500" /> : <ChevronRight className="size-3.5 text-slate-500" />}
                            Choice Groups
                          </button>
                          {!viewMode && (
                            <div className="flex items-center gap-1">
                              {activeChoiceGroup ? (
                                <button type="button" onClick={() => openChoiceGroupEditor(activeChoiceGroup.id)} className={compactOutlineAccentButtonClass}>
                                  Edit Active
                                </button>
                              ) : null}
                              <button type="button" onClick={handleAddChoiceGroup} className={compactPrimaryButtonClass}>
                                <Plus className="h-4 w-4" />
                                Group
                              </button>
                            </div>
                          )}
                        </div>
                        <div className={choiceGroupsOpen ? 'max-h-[280px] overflow-auto' : 'hidden'}>
                          {choiceGroups.length === 0 ? (
                            <div className="px-4 py-5 text-center text-sm text-slate-500">No choice groups.</div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {choiceGroups.map((choiceGroup) => (
                                <div
                                  key={choiceGroup.id}
                                  className={`grid grid-cols-[minmax(0,1fr)_70px_62px_76px_118px] items-center gap-2 px-2 py-1.5 text-sm ${
                                    activeChoiceGroupId === choiceGroup.id ? 'bg-orange-50' : 'bg-white'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="truncate font-medium text-slate-900">{choiceGroup.groupName || 'Unnamed Group'}</div>
                                    <div className="truncate text-[11px] text-slate-500">
                                      Choose {choiceGroup.minSelect}/{choiceGroup.maxSelect}
                                    </div>
                                    <div className="truncate text-[11px] text-slate-500" title={formatChoiceGroupDishSummary(choiceGroup, 12)}>
                                      {formatChoiceGroupDishSummary(choiceGroup)}
                                    </div>
                                  </div>
                                  <div className="text-xs text-slate-600">{choiceGroup.required ? 'Req' : 'Opt'}</div>
                                  <div className="text-xs text-slate-600">
                                    {choiceGroup.minSelect}/{choiceGroup.maxSelect}
                                  </div>
                                  <div className="text-right text-xs font-semibold text-slate-900">{choiceGroup.dishes.length} dishes</div>
                                  <div className="flex justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setActiveChoiceGroupId(choiceGroup.id)}
                                      className="inline-flex h-7 items-center rounded border border-slate-300 px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                      Use
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openChoiceGroupEditor(choiceGroup.id)}
                                      className="inline-flex h-7 items-center rounded border border-orange-300 px-2 text-[11px] font-medium text-orange-700 hover:bg-orange-50"
                                    >
                                      Edit
                                    </button>
                                    {!viewMode && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveChoiceGroup(choiceGroup.id)}
                                        className="inline-flex size-7 items-center justify-center rounded text-red-600 hover:bg-red-50"
                                        title="Remove group"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              )}

              {activeBuilderTab === 'menu-estimate' && (
                <div className="space-y-2">
                  <div className="grid gap-px overflow-hidden rounded border border-slate-200 bg-slate-200 text-xs md:grid-cols-5">
                    {[
                      { label: 'Baseline Guests', value: formBaselineGuests.toFixed(0) },
                      { label: 'Total Menu Cost', value: `Rs. ${calculateTotalMenuCost().toFixed(2)}` },
                      { label: 'Base Recipe Cost', value: `Rs. ${baseRecipeCostPerHead.toFixed(2)}/head` },
                      {
                        label: 'Estimate Variance',
                        value: `Rs. ${menuEstimateVariance.toFixed(2)}/head`,
                        valueClassName:
                          menuEstimateVariance > 0
                            ? 'text-red-700'
                            : menuEstimateVariance < 0
                              ? 'text-green-700'
                              : 'text-slate-900',
                      },
                      {
                        label: `Recommended @ ${TARGET_FOOD_COST_PERCENT}% FC`,
                        value: recommendedSellingPricePerHead > 0 ? `Rs. ${recommendedSellingPricePerHead.toFixed(0)}` : 'Pending cost',
                        valueClassName: sellingPriceGap > 0 ? 'text-orange-700' : 'text-green-700',
                      },
                    ].map((item) => (
                      <div key={item.label} className="bg-white px-2.5 py-1.5">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</div>
                        <div className={`font-semibold text-slate-900 ${item.valueClassName || ''}`}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {costEngineeringLines.length === 0 ? (
                    <div className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                      <h3 className="text-base font-semibold text-slate-900">Add menu items first</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Build the package menu, then define the commercial consumption baseline here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_360px]">
                      <section className="rounded border border-slate-200 bg-white">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">Package Cost Engineering</h3>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              Edit estimated quantity and UOM. Per-guest quantities and costs recalculate automatically.
                            </p>
                          </div>
                          <div className="text-right text-[11px] text-slate-600">
                            <div>Baseline: {formBaselineGuests} guests</div>
                            <div>Food cost: {formSellingPricePerHead > 0 ? `${calculateFoodCostPercent().toFixed(1)}%` : 'Pending price'}</div>
                          </div>
                        </div>
                        <div className="max-h-[560px] overflow-auto">
                          <table className="w-full min-w-[1120px] text-sm">
                            <thead className="sticky top-0 bg-slate-50">
                              <tr>
                                <th className={compactTableHeadClass}>Type</th>
                                <th className={compactTableHeadClass}>Menu Item</th>
                                <th className={compactTableHeadClass}>Recipe Status</th>
                                <th className={`${compactTableHeadClass} text-right`}>Estimated Qty for Baseline Guests</th>
                                <th className={compactTableHeadClass}>UOM</th>
                                <th className={`${compactTableHeadClass} text-right`}>Qty Per Guest</th>
                                <th className={`${compactTableHeadClass} text-right`}>Cost Per Guest</th>
                                <th className={`${compactTableHeadClass} text-right`}>Total Cost</th>
                                <th className={`${compactTableHeadClass} text-right`}>Cost Impact %</th>
                              </tr>
                            </thead>
                            <tbody>
                              {costEngineeringLines.map((line) => {
                                const choiceGroup =
                                  line.type === 'Choice'
                                    ? choiceGroups.find((group) => group.id === line.sourceId) || null
                                    : null;

                                return (
                                  <tr
                                    key={line.id}
                                    className={`border-t border-slate-200 align-top ${
                                      line.hasWarning
                                        ? 'bg-amber-50/70'
                                        : line.impactPercent >= 50
                                          ? 'bg-red-50/40'
                                          : 'bg-white'
                                    }`}
                                  >
                                    <td className={compactTableCellClass}>{line.type}</td>
                                    <td className={compactTableCellClass}>
                                      <div className="font-medium text-slate-900">{line.name}</div>
                                      <div className="mt-0.5 text-[11px] text-slate-500">{line.detail}</div>
                                      {choiceGroup ? (
                                        <div className="mt-1 grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                          <select
                                            value={choiceGroup.costingMethod}
                                            onChange={(event) =>
                                              handleUpdateChoiceGroup(choiceGroup.id, 'costingMethod', event.target.value as MenuPackageChoiceGroupCostingMethod)
                                            }
                                            disabled={viewMode}
                                            className="h-7 rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:bg-slate-100"
                                          >
                                            {Object.entries(CHOICE_GROUP_COSTING_METHOD_LABELS).map(([value, label]) => (
                                              <option key={value} value={value}>
                                                {label}
                                              </option>
                                            ))}
                                          </select>
                                          {choiceGroup.costingMethod === 'default-option' ? (
                                            <select
                                              value={choiceGroup.defaultDishId || ''}
                                              onChange={(event) =>
                                                handleUpdateChoiceGroup(choiceGroup.id, 'defaultDishId', event.target.value || undefined)
                                              }
                                              disabled={viewMode}
                                              className="h-7 rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:bg-slate-100"
                                            >
                                              <option value="">Representative item</option>
                                              {choiceGroup.dishes.map((dish) => (
                                                <option key={dish.dishId} value={dish.dishId}>
                                                  {dish.dishName}
                                                </option>
                                              ))}
                                            </select>
                                          ) : null}
                                        </div>
                                      ) : null}
                                    </td>
                                    <td className={compactTableCellClass}>
                                      <span
                                        className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium ${getDishReadinessBadgeClass(line.readiness)}`}
                                        title={line.readiness.reason}
                                      >
                                        {line.readiness.label}
                                      </span>
                                    </td>
                                    <td className={`${compactTableCellClass} text-right`}>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={line.estimateQty}
                                        onChange={(event) =>
                                          line.type === 'Fixed'
                                            ? handleMenuEstimateFixedQuantityChange(line.sourceId, Number(event.target.value))
                                            : handleMenuEstimateChoiceQuantityChange(line.sourceId, Number(event.target.value))
                                        }
                                        disabled={viewMode}
                                        className="h-8 w-24 rounded border border-slate-300 px-2 text-right text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:bg-slate-100"
                                      />
                                    </td>
                                    <td className={compactTableCellClass}>
                                      <select
                                        value={line.selectedUnit}
                                        onChange={(event) =>
                                          line.type === 'Fixed'
                                            ? handleMenuEstimateFixedUnitChange(line.sourceId, event.target.value)
                                            : handleMenuEstimateChoiceUnitChange(line.sourceId, event.target.value)
                                        }
                                        disabled={viewMode}
                                        className="h-8 w-24 rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:bg-slate-100"
                                      >
                                        {getPackageEngineeringUnitOptions(line.selectedUnit).map((unit) => (
                                          <option key={unit.code} value={unit.code}>
                                            {unit.symbol || unit.code}
                                          </option>
                                        ))}
                                      </select>
                                      {!line.conversionValid ? (
                                        <div className="mt-0.5 text-[10px] font-medium text-red-600">
                                          No conversion to {getUnitSymbol(line.rateUnit, units)}
                                        </div>
                                      ) : null}
                                    </td>
                                    <td className={`${compactTableCellClass} text-right font-medium text-slate-900`}>
                                      {line.qtyPerGuestLabel}
                                    </td>
                                    <td className={`${compactTableCellClass} text-right font-medium text-slate-900`}>
                                      Rs. {line.costPerGuest.toFixed(2)}
                                    </td>
                                    <td className={`${compactTableCellClass} text-right font-medium text-slate-900`}>
                                      Rs. {line.totalCost.toFixed(2)}
                                    </td>
                                    <td
                                      className={`${compactTableCellClass} text-right font-semibold ${
                                        line.impactPercent >= 50
                                          ? 'text-red-700'
                                          : line.impactPercent >= 20
                                            ? 'text-amber-700'
                                            : 'text-slate-900'
                                      }`}
                                    >
                                      {line.impactPercent.toFixed(1)}%
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="sticky bottom-0 bg-slate-100">
                              <tr className="border-t border-slate-300">
                                <td colSpan={6} className="px-2.5 py-2 text-right text-sm font-semibold uppercase tracking-wide text-slate-700">
                                  Package Total
                                </td>
                                <td className="px-2.5 py-2 text-right text-sm font-semibold text-slate-900">
                                  Rs. {menuEstimateCostPerHead.toFixed(2)}
                                </td>
                                <td className="px-2.5 py-2 text-right text-sm font-semibold text-slate-900">
                                  Rs. {calculateTotalMenuCost().toFixed(2)}
                                </td>
                                <td className="px-2.5 py-2 text-right text-sm font-semibold text-slate-900">100.0%</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </section>

                      <div className="space-y-2">
                        <section className="rounded border border-slate-200 bg-white">
                          <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                            Pricing Recommendation
                          </div>
                          <div className="space-y-1.5 px-3 py-2 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-600">Current Food Cost</span>
                              <span className={`font-semibold ${calculateFoodCostPercent() > TARGET_FOOD_COST_PERCENT ? 'text-red-700' : 'text-green-700'}`}>
                                {formSellingPricePerHead > 0 ? `${calculateFoodCostPercent().toFixed(1)}%` : 'Pending price'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-600">Target Food Cost</span>
                              <span className="font-semibold text-slate-900">{TARGET_FOOD_COST_PERCENT}%</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-1.5">
                              <span className="font-medium text-slate-900">Recommended Selling Price</span>
                              <span className="font-semibold text-orange-700">
                                {recommendedSellingPricePerHead > 0 ? `Rs. ${recommendedSellingPricePerHead.toFixed(0)}` : 'Pending cost'}
                              </span>
                            </div>
                            {sellingPriceGap > 0 ? (
                              <div className="text-[11px] text-amber-700">
                                Increase price by Rs. {sellingPriceGap.toFixed(0)}/head to meet target.
                              </div>
                            ) : null}
                          </div>
                        </section>

                        {quantitySuggestions.length > 0 ? (
                          <section className="rounded border border-slate-200 bg-white">
                            <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                              Similar Package Quantity Suggestions
                            </div>
                            <div className="divide-y divide-slate-100">
                              {quantitySuggestions.map((suggestion) => (
                                <div key={suggestion.id} className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-2 px-3 py-1.5 text-sm">
                                  <div className="min-w-0">
                                    <div className="truncate font-medium text-slate-900">{suggestion.name}</div>
                                    <div className="text-[11px] text-slate-500">
                                      Avg {suggestion.averageQty.toFixed(2)} from {suggestion.sampleCount} package{suggestion.sampleCount === 1 ? '' : 's'}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={viewMode}
                                    onClick={() =>
                                      suggestion.type === 'Fixed'
                                        ? handleMenuEstimateFixedQuantityChange(suggestion.sourceId, suggestion.averageQty)
                                        : handleMenuEstimateChoiceQuantityChange(suggestion.sourceId, suggestion.averageQty)
                                    }
                                    className="inline-flex h-7 items-center justify-center rounded border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-100"
                                  >
                                    Use
                                  </button>
                                </div>
                              ))}
                            </div>
                          </section>
                        ) : null}

                        <section className="rounded border border-slate-200 bg-white">
                          <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                            Top Cost Drivers
                          </div>
                          <div className="divide-y divide-slate-100">
                            {topCostDrivers.length === 0 ? (
                              <div className="px-3 py-3 text-sm text-slate-500">No cost drivers yet.</div>
                            ) : (
                              topCostDrivers.map((line) => (
                                <div key={line.id} className="grid grid-cols-[minmax(0,1fr)_56px] items-center gap-2 px-3 py-1.5 text-sm">
                                  <div className="min-w-0">
                                    <div className="truncate font-medium text-slate-900">{line.name}</div>
                                    <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-100">
                                      <div className="h-full bg-orange-500" style={{ width: `${Math.min(line.impactPercent, 100)}%` }} />
                                    </div>
                                  </div>
                                  <div className="text-right font-semibold text-slate-900">{line.impactPercent.toFixed(0)}%</div>
                                </div>
                              ))
                            )}
                          </div>
                        </section>

                        <section className="rounded border border-slate-200 bg-white">
                          <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                            Package Health
                          </div>
                          <div className="divide-y divide-slate-100">
                            {packageHealthItems.map((item) => (
                              <div key={item.label} className="flex items-start gap-2 px-3 py-1.5 text-sm">
                                {item.passed ? (
                                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
                                ) : (
                                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                                )}
                                <div className="min-w-0">
                                  <div className="font-medium text-slate-900">{item.label}</div>
                                  <div className="truncate text-[11px] text-slate-500">{item.detail}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>

                        <section className="rounded border border-slate-200 bg-white">
                          <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                            Cost Warnings
                          </div>
                          <div className="max-h-40 overflow-auto px-3 py-2">
                            {validationWarnings.length === 0 ? (
                              <div className="flex items-center gap-2 text-sm text-green-700">
                                <CheckCircle2 className="size-4" />
                                No costing warnings.
                              </div>
                            ) : (
                              <ul className="space-y-1 text-sm text-amber-800">
                                {validationWarnings.map((issue) => (
                                  <li key={issue} className="flex gap-2">
                                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                    <span>{issue}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </section>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeBuilderTab === 'cost-summary' && (
                <div className="space-y-3">
                  <section className={`rounded border px-3 py-2 ${reviewVerdict.className}`}>
                    <div className="text-sm font-semibold">{reviewVerdict.label}</div>
                    <div className="mt-0.5 text-xs">{reviewVerdict.detail}</div>
                  </section>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[0.8fr_1.2fr]">
                    <div className="rounded border border-slate-200 bg-white p-3">
                      <label className={compactLabelClass}>Selling Price Per Guest * (Rs.)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formSellingPricePerHead}
                        onChange={(event) => setFormSellingPricePerHead(Number(event.target.value))}
                        disabled={viewMode}
                        placeholder="0.00"
                        className={compactInputClass}
                      />
                    </div>

                    <div className="rounded border border-slate-200 bg-white p-3">
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <ChefHat className="w-4 h-4" />
                        Preparation Area Breakdown
                      </h3>
                      {Object.keys(getPreparationAreaSummary()).length === 0 ? (
                        <p className="text-sm text-slate-500">No dishes selected yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(getPreparationAreaSummary()).map(([area, count]) => (
                            <span key={area} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                              <span className="text-slate-600">{area.replace(/-/g, ' ')}:</span>{' '}
                              <span className="font-medium text-slate-900">{count} lines</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <section className="rounded border border-blue-200 bg-blue-50">
                    <div className="flex items-center gap-2 border-b border-blue-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      <Calculator className="w-4 h-4" />
                      Package Costing Summary
                    </div>
                    <div className="grid grid-cols-2 gap-0.5 bg-blue-200/40 p-0.5 lg:grid-cols-6">
                      {[
                        { label: 'Fixed Items', value: packageDishes.length },
                        { label: 'Choice Groups', value: choiceGroups.length },
                        { label: 'Fixed Cost/Guest', value: `Rs. ${menuEstimateFixedCostPerHead.toFixed(2)}` },
                        { label: 'Choice Cost/Guest', value: `Rs. ${menuEstimateChoiceCostPerHead.toFixed(2)}` },
                        { label: 'Total Cost/Guest', value: `Rs. ${menuEstimateCostPerHead.toFixed(2)}` },
                        {
                          label: 'Margin',
                          value: formSellingPricePerHead > 0 ? `${calculateMargin().toFixed(1)}%` : 'Pending price',
                          valueClassName:
                            formSellingPricePerHead <= 0
                              ? 'text-amber-600'
                              : calculateMargin() >= TARGET_MARGIN_PERCENT
                                ? 'text-green-600'
                                : 'text-red-600',
                        },
                      ].map((item) => (
                        <div key={item.label} className="bg-white px-2.5 py-2">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</p>
                          <p className={`text-sm font-semibold text-slate-900 ${item.valueClassName || ''}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {choiceGroups.length > 0 && (
                    <section className="rounded border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                        Choice Group Planning Assumptions
                      </div>
                      <div className="space-y-1.5 p-3">
                        {choiceGroups.map((choiceGroup) => (
                          <div
                            key={choiceGroup.id}
                            className="grid gap-1 rounded border border-slate-200 px-2.5 py-2 text-sm md:grid-cols-[minmax(0,1fr)_190px_92px]"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900">{choiceGroup.groupName || 'Unnamed Choice Group'}</div>
                              <div className="truncate text-[11px] text-slate-500" title={formatChoiceGroupDishSummary(choiceGroup, 12)}>
                                {formatChoiceGroupDishSummary(choiceGroup, 12)}
                              </div>
                            </div>
                            <div className="text-slate-600">
                              <div>{CHOICE_GROUP_COSTING_METHOD_LABELS[choiceGroup.costingMethod]}</div>
                              <div className="truncate text-[11px] text-slate-500">
                                {getMenuEstimateChoiceSelection(choiceGroup)
                                  ? choiceGroup.dishes.find((dish) => dish.dishId === getMenuEstimateChoiceSelection(choiceGroup))?.dishName || 'No item selected'
                                  : 'No item selected'}
                              </div>
                            </div>
                            <div className="text-right font-medium text-slate-900">
                              Rs. {calculateChoiceGroupMenuEstimateCostPerHead(choiceGroup).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
              <div className="text-xs text-slate-600">
                {activeBuilderTab === 'menu-items' ? (
                  <>
                    Fixed: <span className="font-semibold text-slate-900">{packageDishes.length}</span>
                    {' '}| Choice Groups: <span className="font-semibold text-slate-900">{choiceGroups.length}</span>
                    {' '}| Menu Lines: <span className="font-semibold text-slate-900">{totalSelectedLines}</span>
                    {' '}| Active Group: <span className="font-semibold text-slate-900">{activeChoiceGroup?.groupName || 'None selected'}</span>
                  </>
                ) : (
                  <>
                    Fixed: <span className="font-semibold text-slate-900">{packageDishes.length}</span>
                    {' '}| Choice Groups: <span className="font-semibold text-slate-900">{choiceGroups.length}</span>
                    {' '}| Cost/guest: <span className="font-semibold text-slate-900">Rs. {menuEstimateCostPerHead.toFixed(2)}</span>
                    {' '}| Total Menu Cost: <span className="font-semibold text-slate-900">Rs. {calculateTotalMenuCost().toFixed(2)}</span>
                    {' '}| Price/guest: <span className="font-semibold text-slate-900">{formSellingPricePerHead > 0 ? `Rs. ${formSellingPricePerHead.toFixed(2)}` : 'Pending price'}</span>
                    {' '}| Margin: <span className={`font-semibold ${formSellingPricePerHead <= 0 ? 'text-amber-600' : calculateMargin() >= TARGET_MARGIN_PERCENT ? 'text-green-600' : 'text-red-600'}`}>{formSellingPricePerHead > 0 ? `${calculateMargin().toFixed(1)}%` : 'Pending price'}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setDialogOpen(false)} className={compactSecondaryButtonClass}>
                  {viewMode ? 'Close' : 'Cancel'}
                </button>
                {!viewMode && (
                  <button onClick={handleSave} className={compactPrimaryButtonClass}>
                    <Save className="w-4 h-4" />
                    Save Package
                  </button>
                )}
              </div>
            </div>
          </div>

          {choiceGroupEditorOpen && activeChoiceGroup ? (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
              <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
                <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {activeChoiceGroup.groupName || 'Choice Group'}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Configure selection rules and assigned dishes without expanding the main screen.
                    </p>
                  </div>
                  <button type="button" onClick={closeChoiceGroupEditor} className="inline-flex size-8 items-center justify-center rounded text-slate-500 hover:bg-slate-100">
                    <X className="size-4" />
                  </button>
                </div>

                <div className="grid gap-px border-b border-slate-200 bg-slate-200 text-xs md:grid-cols-3">
                  {[
                    { label: 'Dishes', value: activeChoiceGroup.dishes.length },
                    { label: 'Type', value: activeChoiceGroup.required ? 'Required' : 'Optional' },
                    { label: 'Selection', value: `Choose ${activeChoiceGroup.minSelect}/${activeChoiceGroup.maxSelect}` },
                  ].map((item) => (
                    <div key={item.label} className="bg-slate-50 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</div>
                      <div className="font-semibold text-slate-900">{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid gap-3 md:grid-cols-[1.3fr_0.7fr_0.7fr_0.9fr]">
                    <div>
                      <label className={compactLabelClass}>Group Name *</label>
                      <input
                        type="text"
                        value={activeChoiceGroup.groupName}
                        onChange={(event) => handleUpdateChoiceGroup(activeChoiceGroup.id, 'groupName', event.target.value)}
                        disabled={viewMode}
                        className={compactInputClass}
                      />
                    </div>
                    <div>
                      <label className={compactLabelClass}>Min Select</label>
                      <input
                        type="number"
                        value={activeChoiceGroup.minSelect}
                        onChange={(event) => handleUpdateChoiceGroup(activeChoiceGroup.id, 'minSelect', Math.max(1, Number(event.target.value) || 1))}
                        disabled={viewMode}
                        className={compactInputClass}
                      />
                    </div>
                    <div>
                      <label className={compactLabelClass}>Max Select</label>
                      <input
                        type="number"
                        value={activeChoiceGroup.maxSelect}
                        onChange={(event) => handleUpdateChoiceGroup(activeChoiceGroup.id, 'maxSelect', Math.max(1, Number(event.target.value) || 1))}
                        disabled={viewMode}
                        className={compactInputClass}
                      />
                    </div>
                    <div>
                      <label className={compactLabelClass}>Required</label>
                      <select
                        value={activeChoiceGroup.required ? 'required' : 'optional'}
                        onChange={(event) => handleUpdateChoiceGroup(activeChoiceGroup.id, 'required', event.target.value === 'required')}
                        disabled={viewMode}
                        className={compactInputClass}
                      >
                        <option value="required">Required</option>
                        <option value="optional">Optional</option>
                      </select>
                    </div>
                  </div>

                  {!viewMode && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-slate-700">
                      <span>
                        Select dishes in Available Dishes, then add them here for the active group.
                      </span>
                      <button
                        type="button"
                        onClick={() => addDishesToChoiceGroup(activeChoiceGroup.id, selectedAvailableDishIds)}
                        disabled={selectedAvailableDishIds.length === 0}
                        className={compactPrimaryButtonClass}
                      >
                        Add Selected Dishes
                      </button>
                    </div>
                  )}

                  <div className="mt-3 rounded border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      Group Dishes
                    </div>
                    <div className="max-h-[380px] overflow-auto">
                      {activeChoiceGroup.dishes.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-slate-500">
                          No dishes in this group yet.
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-slate-50">
                            <tr>
                              <th className={compactTableHeadClass}>Dish</th>
                              <th className={compactTableHeadClass}>Variant</th>
                              <th className={compactTableHeadClass}>Recipe Status</th>
                              {!viewMode && <th className={`${compactTableHeadClass} text-right`}>Action</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {activeChoiceGroup.dishes.map((dish, dishIndex) => {
                              const readiness = getDishReadiness(dish.dishId);
                              return (
                                <tr key={`${activeChoiceGroup.id}-${dish.dishId}-${dishIndex}`} className="border-t border-slate-200">
                                  <td className={compactTableCellClass}>
                                    <div className="font-medium text-slate-900">{dish.dishName}</div>
                                    <div className="mt-0.5 text-[11px] text-slate-500">{dish.preparationArea.replace(/-/g, ' ')}</div>
                                  </td>
                                  <td className={compactTableCellClass}>
                                    <select
                                      value={dish.variantId || ''}
                                      onChange={(event) => handleUpdateChoiceGroupDish(activeChoiceGroup.id, dishIndex, 'variantId', event.target.value)}
                                      disabled={viewMode}
                                      className={compactInputClass}
                                    >
                                      {(packageEligibleDishes.find((item) => item.id === dish.dishId)
                                        ? getDishVariantOptions(packageEligibleDishes.find((item) => item.id === dish.dishId)!, units, recipeByDishId, purchaseItemsById)
                                        : []
                                      ).map((variant) => (
                                        <option key={variant.id} value={variant.id}>
                                          {variant.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className={compactTableCellClass}>
                                    <span
                                      className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium ${getDishReadinessBadgeClass(readiness)}`}
                                      title={readiness.reason}
                                    >
                                      {readiness.label}
                                    </span>
                                  </td>
                                  {!viewMode && (
                                    <td className={`${compactTableCellClass} text-right`}>
                                      <button
                                        onClick={() => handleRemoveChoiceGroupDish(activeChoiceGroup.id, dishIndex)}
                                        className="inline-flex size-7 items-center justify-center rounded text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
                  <button type="button" onClick={closeChoiceGroupEditor} className={compactSecondaryButtonClass}>
                    Done
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {typeDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 my-8">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Package Types</h2>
              <button
                onClick={() => {
                  setTypeDialogOpen(false);
                  resetTypeForm();
                }}
                className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 max-h-[70vh] overflow-y-auto">
              <div>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Type</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Code</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMenuPackageTypes.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                            No package types yet
                          </td>
                        </tr>
                      ) : (
                        sortedMenuPackageTypes.map((type) => (
                          <tr key={type.id} className="border-t border-gray-200">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{type.name}</div>
                              {type.notes ? <div className="text-xs text-gray-500 mt-1">{type.notes}</div> : null}
                            </td>
                            <td className="px-4 py-3 text-gray-600">{type.code}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  type.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {type.status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleEditType(type)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit Type"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {editingType ? 'Edit Package Type' : 'Add Package Type'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type Name *</label>
                    <input
                      type="text"
                      value={typeFormName}
                      onChange={(event) => setTypeFormName(event.target.value)}
                      placeholder="e.g., Mehndi Menu"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                    <select
                      value={typeFormStatus}
                      onChange={(event) => setTypeFormStatus(event.target.value as 'active' | 'inactive')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={typeFormNotes}
                      onChange={(event) => setTypeFormNotes(event.target.value)}
                      rows={3}
                      placeholder="Optional notes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={resetTypeForm}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleSaveType}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      {editingType ? 'Update Type' : 'Save Type'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
