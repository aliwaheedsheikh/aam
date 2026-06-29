import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Save, Search, Eye, ChevronDown, ChevronRight, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  Dish,
  LegacyMenuPackageChefEstimate,
  MenuPackage,
  MenuPackageCommercialPricing,
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

const BUILDER_TABS: Array<{ id: BuilderTab; step: string; label: string }> = [
  { id: 'menu-items', step: 'Step 1', label: 'Build Menu' },
  { id: 'menu-estimate', step: 'Step 2', label: 'Commercial Costing' },
  { id: 'cost-summary', step: 'Step 3', label: 'Review & Approve' },
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

const TARGET_FOOD_COST_PERCENT = 70;
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
  itemTypeLabel: string;
  readiness: DishPackageReadiness;
  estimateQty: number;
  selectedUnit: string;
  rateUnit: string;
  unitCost: number;
  statusLabel: string;
  statusClassName: string;
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

const SELECTED_MENU_CATEGORY_META = [
  { id: 'main-course', label: 'Main Course' },
  { id: 'rice', label: 'Rice/Biryani' },
  { id: 'bread', label: 'Bread/Naan' },
  { id: 'salad', label: 'Salad' },
  { id: 'dessert', label: 'Dessert' },
  { id: 'beverage', label: 'Beverage' },
  { id: 'other', label: 'Other' },
] as const;

type SelectedMenuCategoryId = (typeof SELECTED_MENU_CATEGORY_META)[number]['id'];

const normalizeComparableText = (value?: string) => (value || '').toLowerCase().replace(/[-_]+/g, ' ');

const getSelectedMenuCategoryMeta = (value?: string): (typeof SELECTED_MENU_CATEGORY_META)[number] => {
  const searchable = normalizeComparableText(value);
  const matchedRequirement = PACKAGE_CATEGORY_REQUIREMENTS.find((requirement) =>
    requirement.keywords.some((keyword) => searchable.includes(normalizeComparableText(keyword))),
  );

  return (
    SELECTED_MENU_CATEGORY_META.find((category) => category.id === matchedRequirement?.id) ||
    SELECTED_MENU_CATEGORY_META.find((category) => category.id === 'other')!
  );
};

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
        reason: 'Purchase cost required.',
      };
    }

    const linkedPurchaseItem = purchaseItemsById.get(linkedPurchaseItemId);
    if (!linkedPurchaseItem || linkedPurchaseItem.status !== 'active') {
      return {
        status: 'purchase-item-inactive',
        label: DISH_READINESS_LABELS['purchase-item-inactive'],
        canAdd: false,
        reason: 'Purchase cost required.',
      };
    }

    if (!getPurchaseItemIssueUnit(linkedPurchaseItem)) {
      return {
        status: 'recipe-incomplete',
        label: 'Issue UOM Missing',
        canAdd: false,
        reason: 'Purchase cost required.',
      };
    }

    if (getPurchaseItemUnitCost(linkedPurchaseItem) <= 0) {
      return {
        status: 'cost-not-calculated',
        label: DISH_READINESS_LABELS['cost-not-calculated'],
        canAdd: false,
        reason: 'Purchase cost required.',
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
        reason: 'Complete recipe costing first.',
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
        reason: 'Complete recipe costing first.',
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
        reason: 'Complete recipe costing first.',
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

const getPackageLineTypeLabel = (dish: Dish | undefined) => {
  if (!dish) {
    return 'Menu Item';
  }

  if (dish.productionType === 'purchased-ready') {
    return 'Purchased Ready';
  }

  if (isRecipeBasedPackageDish(dish)) {
    return 'Recipe Based';
  }

  if (normalizeDishSourceType(dish) === 'outsourced') {
    return 'Service Item';
  }

  return 'Menu Item';
};

const getCommercialStatus = (
  readiness: DishPackageReadiness,
  sellingPricePerUnit: number,
  unitCost: number,
) => {
  if (!readiness.canAdd) {
    return {
      label: readiness.reason,
      className: 'border-red-200 bg-red-50 text-red-700',
    };
  }

  if (sellingPricePerUnit <= 0) {
    return {
      label: 'Selling price required.',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  if (sellingPricePerUnit < unitCost) {
    return {
      label: 'Loss Making',
      className: 'border-red-200 bg-red-50 text-red-700',
    };
  }

  const foodCostPercent = sellingPricePerUnit > 0 ? (unitCost / sellingPricePerUnit) * 100 : 0;
  if (foodCostPercent > TARGET_FOOD_COST_PERCENT) {
    return {
      label: 'Low Margin',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  return {
    label: 'Healthy',
    className: 'border-green-200 bg-green-50 text-green-700',
  };
};

const getPackageCommercialStatus = (costPerGuest: number, sellingPerGuest: number) =>
  getCommercialStatus(
    {
      status: 'ready',
      label: DISH_READINESS_LABELS.ready,
      canAdd: true,
      reason: 'Package is fully available for sale.',
    },
    sellingPerGuest,
    costPerGuest,
  );

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
  const [formSellingPricePerGuest, setFormSellingPricePerGuest] = useState(0);
  const [formStatus, setFormStatus] = useState<'draft' | 'approved' | 'inactive'>('draft');
  const [packageDishes, setPackageDishes] = useState<MenuPackageDish[]>([]);
  const [choiceGroups, setChoiceGroups] = useState<MenuPackageChoiceGroup[]>([]);
  const [selectedAvailableDishIds, setSelectedAvailableDishIds] = useState<string[]>([]);
  const [activeChoiceGroupId, setActiveChoiceGroupId] = useState<string | null>(null);
  const [pendingAddDishIds, setPendingAddDishIds] = useState<string[]>([]);
  const [pendingAddChoiceGroupId, setPendingAddChoiceGroupId] = useState('');
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

  const getFixedEstimateQuantityForState = (
    sourceEstimate: MenuPackageMenuEstimate,
    dish: MenuPackageDish,
    baselineGuests: number,
  ) => sourceEstimate.fixedItemQuantities[dish.dishId] ?? dish.quantityPerHead * Math.max(Number(baselineGuests) || 0, 1);

  const getFixedEstimateRateUnitForState = (dish: MenuPackageDish) =>
    getPackageDishEstimateUnit(dish, units, recipeByDishId);

  const getFixedEstimateSelectedUnitForState = (sourceEstimate: MenuPackageMenuEstimate, dish: MenuPackageDish) =>
    getEstimateUnitCode(sourceEstimate.fixedItemUnits?.[dish.dishId], units) || getFixedEstimateRateUnitForState(dish);

  const getChoiceEstimateSelectionForState = (
    choiceGroup: MenuPackageChoiceGroup,
    sourceEstimate: MenuPackageMenuEstimate,
  ) => {
    if (choiceGroup.costingMethod === 'default-option' && choiceGroup.defaultDishId) {
      return choiceGroup.defaultDishId;
    }

    const storedSelection = sourceEstimate.choiceGroupSelections?.[choiceGroup.id];
    if (storedSelection && choiceGroup.dishes.some((dish) => dish.dishId === storedSelection)) {
      return storedSelection;
    }

    return getChoiceGroupDefaultSelectionId(choiceGroup) || '';
  };

  const getChoiceRepresentativeDishForState = (
    choiceGroup: MenuPackageChoiceGroup,
    sourceEstimate: MenuPackageMenuEstimate,
  ) =>
    choiceGroup.dishes.find((dish) => dish.dishId === getChoiceEstimateSelectionForState(choiceGroup, sourceEstimate)) ||
    getChoiceGroupDefaultDish(choiceGroup);

  const getChoiceEstimateQuantityForState = (
    sourceEstimate: MenuPackageMenuEstimate,
    choiceGroup: MenuPackageChoiceGroup,
    baselineGuests: number,
  ) =>
    sourceEstimate.choiceGroupQuantities[choiceGroup.id] ??
    getChoiceGroupDefaultEstimateQuantityPerHead(choiceGroup, units, recipeByDishId) * Math.max(Number(baselineGuests) || 0, 1);

  const getChoiceEstimateRateUnitForState = (
    choiceGroup: MenuPackageChoiceGroup,
    sourceEstimate: MenuPackageMenuEstimate,
  ) =>
    getChoiceRepresentativeDishForState(choiceGroup, sourceEstimate)
      ? getPackageDishEstimateUnit(getChoiceRepresentativeDishForState(choiceGroup, sourceEstimate)!, units, recipeByDishId)
      : 'pcs';

  const getChoiceEstimateSelectedUnitForState = (
    sourceEstimate: MenuPackageMenuEstimate,
    choiceGroup: MenuPackageChoiceGroup,
  ) =>
    getEstimateUnitCode(sourceEstimate.choiceGroupUnits?.[choiceGroup.id], units) ||
    getChoiceEstimateRateUnitForState(choiceGroup, sourceEstimate);

  const calculateFixedItemTotalCostForState = (
    sourceEstimate: MenuPackageMenuEstimate,
    dish: MenuPackageDish,
    baselineGuests: number,
  ) => {
    const quantityInRateUnit = convertPackageEstimateQuantity(
      getFixedEstimateQuantityForState(sourceEstimate, dish, baselineGuests),
      getFixedEstimateSelectedUnitForState(sourceEstimate, dish),
      getFixedEstimateRateUnitForState(dish),
      units,
    );

    return quantityInRateUnit === null ? 0 : getPackageDishEstimateCostPerUnit(dish, units, recipeByDishId) * quantityInRateUnit;
  };

  const calculateChoiceGroupTotalCostForState = (
    sourceEstimate: MenuPackageMenuEstimate,
    choiceGroup: MenuPackageChoiceGroup,
    baselineGuests: number,
  ) => {
    const quantityInRateUnit = convertPackageEstimateQuantity(
      getChoiceEstimateQuantityForState(sourceEstimate, choiceGroup, baselineGuests),
      getChoiceEstimateSelectedUnitForState(sourceEstimate, choiceGroup),
      getChoiceEstimateRateUnitForState(choiceGroup, sourceEstimate),
      units,
    );

    return quantityInRateUnit === null
      ? 0
      : getChoiceGroupMenuEstimateUnitCost(
          choiceGroup,
          getChoiceEstimateSelectionForState(choiceGroup, sourceEstimate),
          units,
          recipeByDishId,
        ) * quantityInRateUnit;
  };

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
    setFormSellingPricePerGuest(0);
    setFormStatus('draft');
    setPackageDishes([]);
    setChoiceGroups([]);
    setSelectedAvailableDishIds([]);
    setActiveChoiceGroupId(null);
    setPendingAddDishIds([]);
    setPendingAddChoiceGroupId('');
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
    const hydratedMenuEstimate = buildMenuEstimate(
      pkg.menuEstimate ?? pkg.chefEstimate,
      hydratedDishes,
      hydratedChoiceGroups,
      pkg.minimumGuests || 100,
      userName,
      units,
      recipeByDishId,
    );

    setEditingPackage(pkg);
    setFormPackageName(pkg.packageName);
    setFormPackageType(pkg.packageType);
    setFormDescription(pkg.description || '');
    setFormBaselineGuests(baselineGuests);
    setFormSellingPricePerGuest(pkg.sellingPricePerHead || 0);
    setFormStatus(pkg.status);
    setPackageDishes(hydratedDishes);
    setChoiceGroups(hydratedChoiceGroups);
    setActiveChoiceGroupId(hydratedChoiceGroups[0]?.id || null);
    setPendingAddDishIds([]);
    setPendingAddChoiceGroupId('');
    setSelectedAvailableDishIds([]);
    setActiveBuilderTab('menu-items');
    setFixedItemsOpen(true);
    setChoiceGroupsOpen(true);
    setChoiceGroupEditorOpen(false);
    resetMenuItemFilters();
    setMenuEstimate(hydratedMenuEstimate);
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

  const openAddDishDialog = (dishIds: string[]) => {
    if (viewMode || dishIds.length === 0) {
      return;
    }

    setPendingAddDishIds(dishIds);
    setPendingAddChoiceGroupId(activeChoiceGroupId || choiceGroups[0]?.id || '');
  };

  const closeAddDishDialog = () => {
    setPendingAddDishIds([]);
    setPendingAddChoiceGroupId('');
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

  const handleConfirmAddToFixedItems = () => {
    if (pendingAddDishIds.length === 0) {
      return;
    }

    addDishesToFixedItems(pendingAddDishIds);
    closeAddDishDialog();
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

  const handleConfirmAddToChoiceGroup = () => {
    if (pendingAddDishIds.length === 0) {
      return;
    }

    if (!pendingAddChoiceGroupId) {
      toast.error('Create or select a choice group first');
      return;
    }

    setActiveChoiceGroupId(pendingAddChoiceGroupId);
    addDishesToChoiceGroup(pendingAddChoiceGroupId, pendingAddDishIds);
    closeAddDishDialog();
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
    getFixedEstimateQuantityForState(menuEstimate, dish, formBaselineGuests);

  const getMenuEstimateChoiceQuantity = (choiceGroup: MenuPackageChoiceGroup) =>
    getChoiceEstimateQuantityForState(menuEstimate, choiceGroup, formBaselineGuests);

  const getMenuEstimateChoiceSelection = (choiceGroup: MenuPackageChoiceGroup) =>
    getChoiceEstimateSelectionForState(choiceGroup, menuEstimate);

  const getChoiceGroupMenuEstimateRepresentativeDish = (choiceGroup: MenuPackageChoiceGroup) =>
    getChoiceRepresentativeDishForState(choiceGroup, menuEstimate);

  const getMenuEstimateFixedRateUnit = (dish: MenuPackageDish) =>
    getFixedEstimateRateUnitForState(dish);

  const getMenuEstimateFixedUnit = (dish: MenuPackageDish) =>
    getFixedEstimateSelectedUnitForState(menuEstimate, dish);

  const getMenuEstimateChoiceRateUnit = (choiceGroup: MenuPackageChoiceGroup) =>
    getChoiceEstimateRateUnitForState(choiceGroup, menuEstimate);

  const getMenuEstimateChoiceUnit = (choiceGroup: MenuPackageChoiceGroup) =>
    getChoiceEstimateSelectedUnitForState(menuEstimate, choiceGroup);

  const convertMenuEstimateQuantityToRateUnit = (quantity: number, selectedUnitCode: string, rateUnitCode: string) => {
    const selectedUnit = getEstimateUnitCode(selectedUnitCode, units);
    const rateUnit = getEstimateUnitCode(rateUnitCode, units);
    if (!selectedUnit || !rateUnit) {
      return null;
    }

    return convertPackageEstimateQuantity(quantity, selectedUnit, rateUnit, units);
  };

  const calculateFixedItemMenuEstimateTotalCost = (dish: MenuPackageDish) => {
    return calculateFixedItemTotalCostForState(menuEstimate, dish, formBaselineGuests);
  };

  const calculateChoiceGroupMenuEstimateTotalCost = (choiceGroup: MenuPackageChoiceGroup) => {
    return calculateChoiceGroupTotalCostForState(menuEstimate, choiceGroup, formBaselineGuests);
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

  const calculateTotalPackageSelling = () => Math.max(Number(formSellingPricePerGuest) || 0, 0) * Math.max(formBaselineGuests, 0);

  const calculateSellingPricePerHead = () => Math.max(Number(formSellingPricePerGuest) || 0, 0);

  const calculatePackageProfit = () => calculateTotalPackageSelling() - calculateTotalMenuCost();

  const calculateMargin = () => {
    const totalSelling = calculateTotalPackageSelling();
    if (totalSelling <= 0) {
      return 0;
    }

    return (calculatePackageProfit() / totalSelling) * 100;
  };

  const calculateFoodCostPercent = () => {
    const totalSelling = calculateTotalPackageSelling();
    if (totalSelling <= 0) {
      return 0;
    }

    return (calculateTotalMenuCost() / totalSelling) * 100;
  };

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
        issues.push(`Fixed item "${dish.dishName}": ${readiness.reason}`);
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
          issues.push(`Choice group "${choiceGroup.groupName || 'Unnamed'}" has "${dish.dishName}": ${readiness.reason}`);
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
        issues.push(`Recipe cost missing: ${dish.dishName}.`);
      }

      if (getMenuEstimateFixedQuantity(dish) === 0) {
        issues.push(`Fixed item "${dish.dishName}" has zero estimated quantity.`);
      }
    });

    choiceGroups.forEach((choiceGroup) => {
      if (
        getChoiceGroupMenuEstimateUnitCost(choiceGroup, getMenuEstimateChoiceSelection(choiceGroup), units, recipeByDishId) <= 0
      ) {
        issues.push(`Recipe cost missing: ${choiceGroup.groupName || 'Unnamed'}.`);
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

    const packageSellingTotal = calculateTotalPackageSelling();
    const packageSellingPerHead = calculateSellingPricePerHead();
    if (packageSellingPerHead <= 0) {
      issues.push('Selling price missing.');
    } else {
      const totalMenuCost = calculateTotalMenuCost();
      const marginPercent = ((packageSellingTotal - totalMenuCost) / packageSellingTotal) * 100;
      const foodCostPercent = (totalMenuCost / packageSellingTotal) * 100;

      if (packageSellingPerHead < calculateTotalCostPerHead()) {
        issues.push('Package is loss making.');
      } else if (marginPercent < TARGET_MARGIN_PERCENT) {
        issues.push('Low margin.');
      }

      if (foodCostPercent > TARGET_FOOD_COST_PERCENT) {
        issues.push('Food cost above target.');
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
    const totalSellingPerHead = Math.max(Number(formSellingPricePerGuest) || 0, 0);
    const normalizedCommercialPricing: MenuPackageCommercialPricing = {
      fixedItemSellingPrices: {},
      choiceGroupSellingPrices: {},
      updatedBy: userName,
      updatedAt: new Date(),
    };

    const packageData: MenuPackage = {
      id: editingPackage?.id || `package-${Date.now()}`,
      packageName: formPackageName,
      packageType: formPackageType,
      module: 'banquet',
      dishes: normalizedPackageDishes,
      choiceGroups: normalizedChoiceGroups,
      minimumGuests: formBaselineGuests,
      totalCostPerHead,
      sellingPricePerHead: totalSellingPerHead,
      menuEstimate: normalizedMenuEstimate,
      commercialPricing: normalizedCommercialPricing,
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

  const menuEstimateFixedCostPerHead = calculateMenuEstimateFixedItemsCostPerHead();
  const menuEstimateChoiceCostPerHead = calculateMenuEstimateChoiceGroupCostPerHead();
  const menuEstimateCostPerHead = calculateTotalCostPerHead();
  const menuEstimateTotalCost = calculateTotalMenuCost();
  const packageSellingTotal = calculateTotalPackageSelling();
  const packageSellingPerHead = calculateSellingPricePerHead();
  const packageProfit = calculatePackageProfit();
  const packageProfitPercent = calculateMargin();
  const packageFoodCostPercent = calculateFoodCostPercent();
  const packageMarginPerHead = packageSellingPerHead - menuEstimateCostPerHead;
  const canApprovePackage = validationErrors.length === 0 && packageSellingPerHead > 0;
  const validationIssueCount = validationErrors.length + validationWarnings.length;
  const validationStatusLabel = validationErrors.length > 0 ? 'Blocked' : validationWarnings.length > 0 ? 'Review' : 'Healthy';
  const validationStatusClass =
    validationErrors.length > 0 ? 'text-red-600' : validationWarnings.length > 0 ? 'text-amber-600' : 'text-green-600';
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
      const sourceDish = dishes.find((item) => item.id === dish.dishId);
      const unitCost = getPackageDishEstimateCostPerUnit(dish, units, recipeByDishId);
      const totalCost = calculateFixedItemMenuEstimateTotalCost(dish);
      const readiness = getDishReadiness(dish.dishId);
      const commercialStatus = !readiness.canAdd
        ? { label: readiness.label, className: 'border-red-200 bg-red-50 text-red-700' }
        : unitCost <= 0 || estimateQty <= 0 || !conversionValid
          ? { label: 'Missing Cost', className: 'border-amber-200 bg-amber-50 text-amber-700' }
          : { label: 'Ready', className: 'border-green-200 bg-green-50 text-green-700' };
      return {
        id: `fixed-${dish.dishId}`,
        sourceId: dish.dishId,
        type: 'Fixed' as const,
        name: dish.dishName,
        detail: `${dish.variantLabel || 'Default'} | ${dish.preparationArea.replace(/-/g, ' ')}`,
        itemTypeLabel: getPackageLineTypeLabel(sourceDish),
        readiness,
        estimateQty,
        selectedUnit,
        rateUnit,
        unitCost,
        statusLabel: commercialStatus.label,
        statusClassName: commercialStatus.className,
        totalCost,
        impactPercent: menuEstimateTotalCost > 0 ? (totalCost / menuEstimateTotalCost) * 100 : 0,
        conversionValid,
        hasWarning: unitCost <= 0 || estimateQty <= 0 || !conversionValid || !readiness.canAdd,
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
      const commercialStatus = !readiness.canAdd
        ? { label: readiness.label, className: 'border-red-200 bg-red-50 text-red-700' }
        : unitCost <= 0 || (choiceGroup.required && estimateQty <= 0) || !conversionValid
          ? { label: 'Missing Cost', className: 'border-amber-200 bg-amber-50 text-amber-700' }
          : { label: 'Ready', className: 'border-green-200 bg-green-50 text-green-700' };
      const lineTypeSet = new Set(
        choiceGroup.dishes.map((dish) => getPackageLineTypeLabel(dishes.find((item) => item.id === dish.dishId))),
      );
      return {
        id: `choice-${choiceGroup.id}`,
        sourceId: choiceGroup.id,
        type: 'Choice' as const,
        name: choiceGroup.groupName || 'Unnamed Group',
        detail: `${CHOICE_GROUP_COSTING_METHOD_LABELS[choiceGroup.costingMethod]} | ${representativeDish?.dishName || 'No representative item'} | ${formatChoiceGroupDishSummary(choiceGroup, 3, true)}`,
        itemTypeLabel: lineTypeSet.size === 1 ? Array.from(lineTypeSet)[0] : 'Mixed Choice',
        readiness,
        estimateQty,
        selectedUnit,
        rateUnit,
        unitCost,
        statusLabel: commercialStatus.label,
        statusClassName: commercialStatus.className,
        totalCost,
        impactPercent: menuEstimateTotalCost > 0 ? (totalCost / menuEstimateTotalCost) * 100 : 0,
        conversionValid,
        hasWarning:
          unitCost <= 0 ||
          (choiceGroup.required && estimateQty <= 0) ||
          !conversionValid ||
          (choiceGroup.costingMethod === 'default-option' && !representativeDish) ||
          !readiness.canAdd,
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
      passed: packageSellingPerHead > 0,
      detail: packageSellingPerHead > 0 ? `Rs. ${packageSellingPerHead.toFixed(2)}/guest` : 'Enter selling price / guest',
    },
    {
      label: 'Profit Above Target',
      passed: packageSellingTotal > 0 && packageProfitPercent >= TARGET_MARGIN_PERCENT,
      detail:
        packageSellingTotal > 0
          ? `${packageProfitPercent.toFixed(1)}% profit vs ${TARGET_MARGIN_PERCENT}% target`
          : 'Selling pending',
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

  if (packageSellingTotal > 0 && packageProfitPercent < TARGET_MARGIN_PERCENT) {
    assistantIssues.push({
      id: 'low-margin',
      severity: 'warning',
      title: 'Low margin',
      detail: `${packageProfitPercent.toFixed(1)}% package margin. Raise selling price / guest or reduce cost.`,
    });
  }

  if (packageSellingTotal > 0 && packageFoodCostPercent > TARGET_FOOD_COST_PERCENT) {
    assistantIssues.push({
      id: 'high-food-cost',
      severity: 'warning',
      title: 'High food cost',
      detail: `${packageFoodCostPercent.toFixed(1)}% food cost is above target.`,
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
    packageSellingTotal <= 0 ||
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
  const packageCommercialStatus = getPackageCommercialStatus(menuEstimateCostPerHead, packageSellingPerHead);
  const baselineGuestDivisor = Math.max(formBaselineGuests, 1);
  const selectedMenuRows = [
    ...packageDishes.map((dish, index) => {
      const sourceDish = dishes.find((item) => item.id === dish.dishId);
      const costPerGuest = calculateFixedItemMenuEstimateCostPerHead(dish);
      const readiness = getDishReadiness(dish.dishId);
      const commercialStatus = !readiness.canAdd
        ? { label: readiness.label, className: 'border-red-200 bg-red-50 text-red-700' }
        : costPerGuest <= 0
          ? { label: 'Missing Cost', className: 'border-amber-200 bg-amber-50 text-amber-700' }
          : { label: 'Ready', className: 'border-green-200 bg-green-50 text-green-700' };
      const categoryMeta = getSelectedMenuCategoryMeta(
        `${dish.dishName} ${sourceDish?.category || ''} ${sourceDish?.cuisineName || ''} ${dish.preparationArea}`,
      );

      return {
        id: `fixed-${dish.dishId}-${index}`,
        rowType: 'fixed' as const,
        categoryId: categoryMeta.id as SelectedMenuCategoryId,
        categoryLabel: categoryMeta.label,
        itemName: dish.dishName,
        itemType: 'Fixed Item',
        quantityPerGuest: dish.quantityPerHead,
        unit: dish.unit,
        costPerGuest,
        readiness,
        statusLabel: commercialStatus.label,
        statusClassName: commercialStatus.className,
        onEdit: () => setFixedItemsOpen(true),
        onRemove: () => handleRemoveDish(index),
      };
    }),
    ...choiceGroups.map((choiceGroup) => {
      const representativeDish = getChoiceGroupMenuEstimateRepresentativeDish(choiceGroup);
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
      const unitCost = getChoiceGroupMenuEstimateUnitCost(
        choiceGroup,
        getMenuEstimateChoiceSelection(choiceGroup),
        units,
        recipeByDishId,
      );
      const costPerGuest = calculateChoiceGroupMenuEstimateCostPerHead(choiceGroup);
      const commercialStatus = !readiness.canAdd
        ? { label: readiness.label, className: 'border-red-200 bg-red-50 text-red-700' }
        : unitCost <= 0
          ? { label: 'Missing Cost', className: 'border-amber-200 bg-amber-50 text-amber-700' }
          : { label: 'Ready', className: 'border-green-200 bg-green-50 text-green-700' };
      const categoryMeta = getSelectedMenuCategoryMeta(
        `${choiceGroup.groupName} ${representativeDish?.dishName || ''} ${representativeDish?.preparationArea || ''}`,
      );

      return {
        id: `group-${choiceGroup.id}`,
        rowType: 'choice-group' as const,
        categoryId: categoryMeta.id as SelectedMenuCategoryId,
        categoryLabel: categoryMeta.label,
        itemName: choiceGroup.groupName || 'Unnamed Choice Group',
        itemType: 'Choice Group',
        quantityPerGuest: getMenuEstimateChoiceQuantity(choiceGroup) / baselineGuestDivisor,
        unit: getMenuEstimateChoiceUnit(choiceGroup),
        costPerGuest,
        readiness,
        statusLabel: commercialStatus.label,
        statusClassName: commercialStatus.className,
        onEdit: () => openChoiceGroupEditor(choiceGroup.id),
        onRemove: () => handleRemoveChoiceGroup(choiceGroup.id),
      };
    }),
  ];
  const selectedMenuSections = SELECTED_MENU_CATEGORY_META.map((category) => ({
    ...category,
    rows: selectedMenuRows.filter((row) => row.categoryId === category.id),
  })).filter((category) => category.rows.length > 0);
  const validationSummaryItems = [
    ...validationErrors.map((issue) => ({ id: `error-${issue}`, label: issue, tone: 'blocked' as const })),
    ...suggestedCategoryGaps.map((gap) => ({
      id: `gap-${gap.requirement.id}`,
      label: `Missing required category: ${gap.requirement.label}.`,
      tone: 'warning' as const,
    })),
    ...validationWarnings.map((issue) => ({ id: `warning-${issue}`, label: issue, tone: 'warning' as const })),
  ];
  const summaryMetricItems = [
    { label: 'Total Items', value: totalSelectedLines.toString() },
    { label: 'Baseline Guests', value: formBaselineGuests.toString() },
    { label: 'Cost/Guest', value: `Rs. ${menuEstimateCostPerHead.toFixed(2)}` },
    { label: 'Selling/Guest', value: packageSellingPerHead > 0 ? `Rs. ${packageSellingPerHead.toFixed(2)}` : 'Pending' },
    {
      label: 'Food Cost %',
      value: packageSellingPerHead > 0 ? `${packageFoodCostPercent.toFixed(1)}%` : 'Pending',
      valueClassName: packageSellingPerHead > 0 && packageFoodCostPercent > TARGET_FOOD_COST_PERCENT ? 'text-amber-700' : '',
    },
    {
      label: 'Margin/Guest',
      value: packageSellingPerHead > 0 ? `Rs. ${packageMarginPerHead.toFixed(2)}` : 'Pending',
      valueClassName: packageSellingPerHead > 0 && packageMarginPerHead < 0 ? 'text-red-700' : '',
    },
    {
      label: 'Package Profit',
      value: packageSellingTotal > 0 ? `Rs. ${packageProfit.toFixed(2)}` : 'Pending',
      valueClassName: packageSellingTotal > 0 && packageProfit < 0 ? 'text-red-700' : '',
    },
  ];

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
          <table className="w-full min-w-[980px] text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className={compactTableHeadClass}>Package Name</th>
                <th className={compactTableHeadClass}>Type</th>
                <th className={compactTableHeadClass}>Status</th>
                <th className={`${compactTableHeadClass} text-right`}>Baseline Guests</th>
                <th className={`${compactTableHeadClass} text-right`}>Cost/Guest</th>
                <th className={`${compactTableHeadClass} text-right`}>Selling/Guest</th>
                <th className={`${compactTableHeadClass} text-right`}>Food Cost %</th>
                <th className={`${compactTableHeadClass} text-right`}>Margin/Guest</th>
                <th className={compactTableHeadClass}>Commercial Status</th>
                <th className={`${compactTableHeadClass} text-right`}>Actions</th>
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
                  const packageFoodCost = pkg.sellingPricePerHead > 0 ? (pkg.totalCostPerHead / pkg.sellingPricePerHead) * 100 : null;
                  const packageProfitPerGuest = pkg.sellingPricePerHead - pkg.totalCostPerHead;
                  const commercialStatus = getPackageCommercialStatus(pkg.totalCostPerHead, pkg.sellingPricePerHead);

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
                          <div className="mt-0.5 max-w-xl whitespace-normal break-words text-[11px] text-slate-500">{pkg.description}</div>
                        ) : null}
                      </td>
                      <td className={compactTableCellClass}>
                        {packageTypeNameMap.get(pkg.packageType) || pkg.packageType.replace(/-/g, ' ')}
                      </td>
                      <td className={compactTableCellClass}>{getStatusBadge(pkg.status)}</td>
                      <td className={`${compactTableCellClass} text-right font-medium text-slate-900`}>
                        {pkg.minimumGuests || 0}
                      </td>
                      <td className={`${compactTableCellClass} text-right font-medium text-slate-900`}>
                        Rs. {pkg.totalCostPerHead.toFixed(2)}
                      </td>
                      <td className={`${compactTableCellClass} text-right font-medium text-orange-700`}>
                        Rs. {pkg.sellingPricePerHead.toFixed(2)}
                      </td>
                      <td className={`${compactTableCellClass} text-right font-medium ${packageFoodCost !== null && packageFoodCost > TARGET_FOOD_COST_PERCENT ? 'text-amber-700' : 'text-slate-900'}`}>
                        {packageFoodCost !== null ? `${packageFoodCost.toFixed(1)}%` : 'Pending'}
                      </td>
                      <td className={`${compactTableCellClass} text-right font-medium ${packageProfitPerGuest < 0 ? 'text-red-700' : 'text-slate-900'}`}>
                        Rs. {packageProfitPerGuest.toFixed(2)}
                      </td>
                      <td className={compactTableCellClass}>
                        <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium ${commercialStatus.className}`}>
                          {commercialStatus.label}
                        </span>
                      </td>
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

            <div className="border-b border-slate-200 bg-white px-3 py-2">
              <div className="grid gap-2 xl:grid-cols-[minmax(0,2fr)_180px_150px_170px_150px]">
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
                <div>
                  <label className={compactLabelClass}>Baseline Guests *</label>
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
                  <label className={compactLabelClass}>Selling Price / Guest</label>
                  <input
                    type="number"
                    value={formSellingPricePerGuest}
                    onChange={(event) => setFormSellingPricePerGuest(Math.max(Number(event.target.value) || 0, 0))}
                    disabled={viewMode}
                    placeholder="1950"
                    className={compactInputClass}
                  />
                </div>
                <div>
                  <label className={compactLabelClass}>Status *</label>
                  <select
                    value={formStatus}
                    onChange={(event) => setFormStatus(event.target.value as 'draft' | 'approved' | 'inactive')}
                    disabled={viewMode}
                    className={compactInputClass}
                  >
                    <option value="draft">Draft</option>
                    <option value="approved" disabled={!canApprovePackage}>
                      Approved
                    </option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="mt-2 grid gap-2 xl:grid-cols-[minmax(0,1fr)_260px]">
                <div>
                  <label className={compactLabelClass}>Description</label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(event) => setFormDescription(event.target.value)}
                    disabled={viewMode}
                    placeholder="Optional service or commercial note"
                    className={compactInputClass}
                  />
                </div>
                <div className={`flex items-center justify-between rounded border px-2.5 py-1.5 text-xs ${assistantToneClass[primaryAssistantIssue.severity]}`}>
                  <div className="min-w-0">
                    <div className="font-semibold">{primaryAssistantIssue.title}</div>
                    <div className="truncate">{primaryAssistantIssue.detail}</div>
                  </div>
                  <div className="pl-3 text-right font-semibold">
                    {validationStatusLabel}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid gap-2 sm:grid-cols-3">
                  {BUILDER_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveBuilderTab(tab.id)}
                      className={`rounded border px-3 py-2 text-left ${
                        activeBuilderTab === tab.id
                          ? 'border-orange-300 bg-white text-slate-900 shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{tab.step}</div>
                      <div className="text-sm font-semibold">{tab.label}</div>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                  <span>Available: <span className="font-semibold text-slate-900">{filteredAvailableDishes.length}</span></span>
                  <span>Selected: <span className="font-semibold text-slate-900">{totalSelectedLines}</span></span>
                  <span>Ready: <span className="font-semibold text-green-700">{readyDishCount}</span></span>
                  <span>Blocked: <span className={`font-semibold ${blockedDishCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{blockedDishCount}</span></span>
                </div>
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
                <div className="grid gap-2 xl:grid-cols-[minmax(280px,0.95fr)_minmax(420px,1.2fr)_320px]">
                  <section className="rounded border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-2.5 py-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">Available Dishes</h3>
                        <span className="text-[11px] text-slate-500">{filteredAvailableDishes.length} rows</span>
                      </div>
                      <div className="mt-2 grid gap-2 lg:grid-cols-2">
                        <div className="relative lg:col-span-2">
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
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>{selectedAvailableDishIds.length} selected</span>
                          <span>
                            Active group: <span className="font-semibold text-slate-900">{activeChoiceGroup?.groupName || 'None selected'}</span>
                          </span>
                        </div>
                        {!viewMode ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={handleSelectVisibleDishes} className={compactSecondaryButtonClass}>
                              Select Visible
                            </button>
                            <button type="button" onClick={handleClearDishSelection} className={compactSecondaryButtonClass}>
                              Clear Selection
                            </button>
                            <button
                              type="button"
                              onClick={() => openAddDishDialog(selectedAvailableDishIds)}
                              disabled={selectedAvailableDishIds.length === 0}
                              className={compactPrimaryButtonClass}
                            >
                              Add Selected
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="max-h-[620px] min-h-[260px] overflow-auto divide-y divide-slate-100">
                      {filteredAvailableDishes.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-slate-500">No dishes match the current filters.</div>
                      ) : (
                        filteredAvailableDishes.map((dish) => {
                          const assignmentLabel = getDishAssignmentLabel(dish.id);
                          const isSelected = selectedAvailableDishIds.includes(dish.id);
                          const readiness = getDishPackageReadiness(dish, recipeByDishId, purchaseItemsById);
                          const defaultVariant = getDefaultPackageVariant(dish, units, recipeByDishId, purchaseItemsById);

                          return (
                            <div
                              key={dish.id}
                              className={`grid grid-cols-[22px_minmax(0,1fr)_70px_124px_72px] items-center gap-2 px-2 py-1.5 text-sm ${
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
                                <div className="whitespace-normal break-words font-medium text-slate-900">{dish.dishName}</div>
                                <div className="text-[11px] text-slate-500">
                                  {dish.category} | {dish.preparationArea.replace(/-/g, ' ')}
                                </div>
                              </div>
                              <div className="truncate text-[11px] text-slate-600">
                                {defaultVariant?.salesUnit || dish.unit || 'pcs'}
                              </div>
                              <div className="flex justify-end">
                                <span
                                  className={`inline-flex max-w-[120px] truncate rounded border px-1.5 py-0.5 text-[11px] font-medium ${getDishReadinessBadgeClass(readiness)}`}
                                  title={readiness.reason}
                                >
                                  {readiness.label}
                                </span>
                              </div>
                              <div className="flex justify-end">
                                {assignmentLabel ? (
                                  <span className="inline-flex max-w-[72px] truncate rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">
                                    {assignmentLabel}
                                  </span>
                                ) : viewMode ? (
                                  <span className="text-[11px] text-slate-400">Open</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openAddDishDialog([dish.id])}
                                    disabled={!readiness.canAdd}
                                    title={readiness.canAdd ? 'Choose where to add this dish' : readiness.reason}
                                    className={compactPrimaryButtonClass}
                                  >
                                    Add
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>

                  <section className="rounded border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-200 px-2.5 py-1.5">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Selected Menu Package</h3>
                        <div className="text-[11px] text-slate-500">
                          Grouped by service category with cost-only visibility.
                        </div>
                      </div>
                      {!viewMode ? (
                        <div className="flex items-center gap-1">
                          {suggestedCategoryGaps.length > 0 ? (
                            <button type="button" onClick={handleApplyAssistantPlan} className={compactOutlineAccentButtonClass}>
                              Apply Suggestions
                            </button>
                          ) : null}
                          <button type="button" onClick={handleAddChoiceGroup} className={compactPrimaryButtonClass}>
                            <Plus className="h-4 w-4" />
                            Group
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="max-h-[360px] overflow-auto">
                      {selectedMenuSections.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-500">Add dishes to start building the package.</div>
                      ) : (
                        selectedMenuSections.map((section) => (
                          <div key={section.id} className="border-b border-slate-100 last:border-b-0">
                            <div className="bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                              {section.label}
                            </div>
                            <div className="divide-y divide-slate-100">
                              {section.rows.map((row) => (
                                <div
                                  key={row.id}
                                  className="grid grid-cols-[minmax(0,1.5fr)_92px_92px_96px_122px_78px] items-center gap-2 px-2 py-1.5 text-sm"
                                >
                                  <div className="min-w-0">
                                    <div className="whitespace-normal break-words font-medium text-slate-900">{row.itemName}</div>
                                    <div className="text-[11px] text-slate-500">{row.itemType}</div>
                                  </div>
                                  <div className="text-right text-slate-900">
                                    {row.quantityPerGuest.toFixed(2)}
                                    <div className="text-[11px] text-slate-500">{row.unit || 'pcs'}</div>
                                  </div>
                                  <div className="text-right font-medium text-slate-900">Rs. {row.costPerGuest.toFixed(2)}</div>
                                  <div className="text-right text-slate-900">
                                    {menuEstimateCostPerHead > 0
                                      ? `${((row.costPerGuest / menuEstimateCostPerHead) * 100).toFixed(1)}%`
                                      : '0.0%'}
                                  </div>
                                  <div className="flex justify-end">
                                    <span className={`inline-flex max-w-[120px] truncate rounded border px-1.5 py-0.5 text-[11px] font-medium ${row.statusClassName}`}>
                                      {row.statusLabel}
                                    </span>
                                  </div>
                                  <div className="flex justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={row.onEdit}
                                      className="inline-flex h-7 items-center rounded border border-slate-300 px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                      Edit
                                    </button>
                                    {!viewMode ? (
                                      <button
                                        type="button"
                                        onClick={row.onRemove}
                                        className="inline-flex size-7 items-center justify-center rounded text-red-600 hover:bg-red-50"
                                        title="Remove row"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="border-t border-slate-200">
                      <section className="border-b border-slate-200">
                        <button
                          type="button"
                          onClick={() => setFixedItemsOpen((current) => !current)}
                          className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left"
                        >
                          <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            {fixedItemsOpen ? <ChevronDown className="size-3.5 text-slate-500" /> : <ChevronRight className="size-3.5 text-slate-500" />}
                            Fixed Item Controls
                          </span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {packageDishes.length} items
                          </span>
                        </button>
                        <div className={fixedItemsOpen ? 'max-h-[180px] overflow-auto border-t border-slate-100' : 'hidden'}>
                          {packageDishes.length === 0 ? (
                            <div className="px-4 py-4 text-center text-sm text-slate-500">No fixed items selected.</div>
                          ) : (
                            <div className="min-w-[620px] divide-y divide-slate-100">
                              {packageDishes.map((dish, index) => {
                                const readiness = getDishReadiness(dish.dishId);
                                return (
                                  <div
                                    key={`${dish.dishId}-${index}`}
                                    className="grid grid-cols-[minmax(0,1fr)_160px_88px_132px_28px] items-center gap-2 px-2 py-1.5 text-sm"
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
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={dish.quantityPerHead}
                                      onChange={(event) => handleUpdateDish(index, 'quantityPerHead', Number(event.target.value))}
                                      disabled={viewMode}
                                      className={`${compactInputClass} text-right`}
                                    />
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

                      <section>
                        <div className="flex items-center justify-between px-2.5 py-1.5">
                          <button
                            type="button"
                            onClick={() => setChoiceGroupsOpen((current) => !current)}
                            className="flex items-center gap-2 text-left text-sm font-semibold text-slate-900"
                          >
                            {choiceGroupsOpen ? <ChevronDown className="size-3.5 text-slate-500" /> : <ChevronRight className="size-3.5 text-slate-500" />}
                            Choice Group Controls
                          </button>
                          {!viewMode ? (
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
                          ) : null}
                        </div>
                        <div className={choiceGroupsOpen ? 'max-h-[220px] overflow-auto border-t border-slate-100' : 'hidden'}>
                          {choiceGroups.length === 0 ? (
                            <div className="px-4 py-4 text-center text-sm text-slate-500">No choice groups.</div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {choiceGroups.map((choiceGroup) => (
                                <div
                                  key={choiceGroup.id}
                                  className={`grid grid-cols-[minmax(0,1fr)_72px_84px_122px] items-center gap-2 px-2 py-1.5 text-sm ${
                                    activeChoiceGroupId === choiceGroup.id ? 'bg-orange-50' : 'bg-white'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="truncate font-medium text-slate-900">{choiceGroup.groupName || 'Unnamed Group'}</div>
                                    <div className="truncate text-[11px] text-slate-500" title={formatChoiceGroupDishSummary(choiceGroup, 12)}>
                                      {formatChoiceGroupDishSummary(choiceGroup)}
                                    </div>
                                  </div>
                                  <div className="text-xs text-slate-600">{choiceGroup.required ? 'Required' : 'Optional'}</div>
                                  <div className="text-xs text-slate-600">
                                    {choiceGroup.minSelect}/{choiceGroup.maxSelect}
                                  </div>
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
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </section>
                    </div>
                  </section>

                  <div className="space-y-2 xl:sticky xl:top-0 xl:self-start">
                    <section className="rounded border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 px-2.5 py-1.5">
                        <h3 className="text-sm font-semibold text-slate-900">Package Summary</h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {summaryMetricItems.map((item) => (
                          <div key={item.label} className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-sm">
                            <span className="text-slate-600">{item.label}</span>
                            <span className={`font-semibold text-slate-900 ${item.valueClassName || ''}`}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-slate-200 px-2.5 py-2">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-slate-600">Commercial Status</span>
                          <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium ${packageCommercialStatus.className}`}>
                            {packageCommercialStatus.label}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                          <span className="text-slate-600">Validation Status</span>
                          <span className={`font-semibold ${validationStatusClass}`}>{validationStatusLabel}</span>
                        </div>
                      </div>
                    </section>

                    <section className="rounded border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 px-2.5 py-1.5">
                        <h3 className="text-sm font-semibold text-slate-900">Validation</h3>
                      </div>
                      <div className="max-h-[300px] overflow-auto px-2.5 py-2">
                        {validationSummaryItems.length === 0 ? (
                          <div className="flex items-center gap-2 text-sm text-green-700">
                            <CheckCircle2 className="size-4" />
                            Ready for commercial review.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {validationSummaryItems.slice(0, 10).map((item) => (
                              <div key={item.id} className="flex items-start gap-2 text-sm">
                                {item.tone === 'blocked' ? (
                                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
                                ) : (
                                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                                )}
                                <span className={item.tone === 'blocked' ? 'text-red-800' : 'text-amber-800'}>{item.label}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>

                  </div>
                </div>
              )}

              {activeBuilderTab === 'menu-estimate' && (
                <div>
                  {costEngineeringLines.length === 0 ? (
                    <div className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                      <h3 className="text-base font-semibold text-slate-900">Add menu items first</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Build the package menu, then define the commercial consumption baseline here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_320px]">
                      <section className="rounded border border-slate-200 bg-white">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-1.5">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">Package Costing</h3>
                            <p className="mt-0.5 text-[11px] text-slate-500">Production cost only. Package selling is entered once at package level.</p>
                          </div>
                          <div className="text-right text-[11px] text-slate-600">
                            <div>Baseline: {formBaselineGuests} guests</div>
                            <div>Cost/guest: Rs. {menuEstimateCostPerHead.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="max-h-[560px] overflow-auto">
                          <table className="w-full min-w-[980px] text-sm">
                            <thead className="sticky top-0 bg-slate-50">
                              <tr>
                                <th className={compactTableHeadClass}>Menu Item</th>
                                <th className={`${compactTableHeadClass} text-right`}>Estimated Qty for Baseline Guests</th>
                                <th className={compactTableHeadClass}>UOM</th>
                                <th className={compactTableHeadClass}>Output Unit</th>
                                <th className={`${compactTableHeadClass} text-right`}>Cost / Unit</th>
                                <th className={`${compactTableHeadClass} text-right`}>Total Cost</th>
                                <th className={`${compactTableHeadClass} text-right`}>Cost Impact %</th>
                                <th className={compactTableHeadClass}>Status</th>
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
                                    <td className={compactTableCellClass}>
                                      <div className="whitespace-normal break-words font-medium text-slate-900">{line.name}</div>
                                      <div className="mt-0.5 text-[11px] text-slate-500">{line.itemTypeLabel} | {line.detail}</div>
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
                                      {getUnitSymbol(line.rateUnit, units)}
                                    </td>
                                    <td className={`${compactTableCellClass} text-right font-medium text-slate-900`}>
                                      Rs. {line.unitCost.toFixed(2)}
                                    </td>
                                    <td className={`${compactTableCellClass} text-right font-medium text-slate-900`}>
                                      Rs. {line.totalCost.toFixed(2)}
                                    </td>
                                    <td className={`${compactTableCellClass} text-right font-medium text-slate-900`}>
                                      {line.impactPercent.toFixed(1)}%
                                    </td>
                                    <td
                                      className={`${compactTableCellClass}`}
                                    >
                                      <div className="flex flex-col items-start gap-1">
                                        <span
                                          className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium ${line.statusClassName}`}
                                          title={line.readiness.reason}
                                        >
                                          {line.statusLabel}
                                        </span>
                                        <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium ${getDishReadinessBadgeClass(line.readiness)}`}>
                                          {line.readiness.label}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="sticky bottom-0 bg-slate-100">
                              <tr className="border-t border-slate-300">
                                <td colSpan={5} className="px-2.5 py-2 text-right text-sm font-semibold uppercase tracking-wide text-slate-700">
                                  Package Total
                                </td>
                                <td className="px-2.5 py-2 text-right text-sm font-semibold text-slate-900">
                                  Rs. {menuEstimateTotalCost.toFixed(2)}
                                </td>
                                <td className="px-2.5 py-2 text-right text-sm font-semibold text-slate-900">100%</td>
                                <td className="px-2.5 py-2 text-left text-sm font-semibold text-slate-900">
                                  {packageCommercialStatus.label}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </section>

                      <div className="space-y-2">
                        <section className="rounded border border-slate-200 bg-white">
                          <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">Package KPIs</div>
                          <div className="space-y-1.5 px-3 py-2 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-600">Baseline Guests</span>
                              <span className="font-semibold text-slate-900">{formBaselineGuests}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-600">Total Package Cost</span>
                              <span className="font-semibold text-slate-900">Rs. {menuEstimateTotalCost.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-600">Cost / Guest</span>
                              <span className="font-semibold text-slate-900">Rs. {menuEstimateCostPerHead.toFixed(2)}</span>
                            </div>
                            <div>
                              <label className={compactLabelClass}>Selling Price / Guest</label>
                              <input
                                type="number"
                                value={formSellingPricePerGuest}
                                onChange={(event) => setFormSellingPricePerGuest(Math.max(Number(event.target.value) || 0, 0))}
                                disabled={viewMode}
                                className={compactInputClass}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-600">Margin / Guest</span>
                              <span className="font-semibold text-slate-900">
                                {packageSellingPerHead > 0 ? `Rs. ${packageMarginPerHead.toFixed(2)}` : 'Pending'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-600">Food Cost %</span>
                              <span className={`font-semibold ${packageSellingPerHead > 0 && packageFoodCostPercent > TARGET_FOOD_COST_PERCENT ? 'text-amber-700' : 'text-slate-900'}`}>
                                {packageSellingPerHead > 0 ? `${packageFoodCostPercent.toFixed(1)}%` : 'Pending'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-600">Package Profit</span>
                              <span className={`font-semibold ${packageProfit < 0 ? 'text-red-700' : 'text-green-700'}`}>
                                {packageSellingTotal > 0 ? `Rs. ${packageProfit.toFixed(2)}` : 'Pending price'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-1.5">
                              <span className="font-medium text-slate-900">Commercial Status</span>
                              <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium ${packageCommercialStatus.className}`}>
                                {packageCommercialStatus.label}
                              </span>
                            </div>
                          </div>
                        </section>

                        <section className="rounded border border-slate-200 bg-white">
                          <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">Warnings</div>
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
                <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-2">
                    <section className={`rounded border px-3 py-2 ${reviewVerdict.className}`}>
                      <div className="text-sm font-semibold">{reviewVerdict.label}</div>
                      <div className="mt-0.5 text-xs">{reviewVerdict.detail}</div>
                    </section>

                    <section className="rounded border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                        Final Package Summary
                      </div>
                      <div className="grid grid-cols-2 gap-px bg-slate-200 p-px lg:grid-cols-4">
                        {[
                          { label: 'Package Name', value: formPackageName || 'Untitled' },
                          { label: 'Baseline Guests', value: formBaselineGuests },
                          { label: 'Total Cost', value: `Rs. ${menuEstimateTotalCost.toFixed(2)}` },
                          { label: 'Cost/Guest', value: `Rs. ${menuEstimateCostPerHead.toFixed(2)}` },
                          { label: 'Selling/Guest', value: packageSellingPerHead > 0 ? `Rs. ${packageSellingPerHead.toFixed(2)}` : 'Pending' },
                          { label: 'Margin/Guest', value: packageSellingPerHead > 0 ? `Rs. ${packageMarginPerHead.toFixed(2)}` : 'Pending' },
                          { label: 'Food Cost %', value: packageSellingPerHead > 0 ? `${packageFoodCostPercent.toFixed(1)}%` : 'Pending' },
                          { label: 'Package Profit', value: packageSellingTotal > 0 ? `Rs. ${packageProfit.toFixed(2)}` : 'Pending' },
                          { label: 'Status', value: packageCommercialStatus.label },
                        ].map((item) => (
                          <div key={item.label} className="bg-white px-2.5 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</div>
                            <div className="text-sm font-semibold text-slate-900 break-words">{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                        Review Checks
                      </div>
                      <div className="space-y-1.5 p-3">
                        {validationSummaryItems.length === 0 ? (
                          <div className="flex items-center gap-2 text-sm text-green-700">
                            <CheckCircle2 className="size-4" />
                            All approval checks are clear.
                          </div>
                        ) : (
                          validationSummaryItems.slice(0, 12).map((item) => (
                            <div key={item.id} className="flex items-start gap-2 text-sm">
                              <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${item.tone === 'blocked' ? 'text-red-600' : 'text-amber-600'}`} />
                              <span className={item.tone === 'blocked' ? 'text-red-800' : 'text-amber-800'}>{item.label}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <section className="rounded border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                        Preparation Area Breakdown
                      </div>
                      <div className="flex flex-wrap gap-1.5 px-3 py-2">
                        {Object.keys(getPreparationAreaSummary()).length === 0 ? (
                          <span className="text-sm text-slate-500">No dishes selected yet.</span>
                        ) : (
                          Object.entries(getPreparationAreaSummary()).map(([area, count]) => (
                            <span key={area} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                              <span className="text-slate-600">{area.replace(/-/g, ' ')}:</span>{' '}
                              <span className="font-medium text-slate-900">{count} lines</span>
                            </span>
                          ))
                        )}
                      </div>
                    </section>

                    {choiceGroups.length > 0 && (
                      <section className="rounded border border-slate-200 bg-white">
                        <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                          Choice Group Assumptions
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

                  <div className="space-y-2 xl:sticky xl:top-0 xl:self-start">
                    <section className="rounded border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 px-2.5 py-1.5">
                        <h3 className="text-sm font-semibold text-slate-900">Approval Summary</h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {summaryMetricItems.map((item) => (
                          <div key={item.label} className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-sm">
                            <span className="text-slate-600">{item.label}</span>
                            <span className={`font-semibold text-slate-900 ${item.valueClassName || ''}`}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-slate-200 px-2.5 py-2">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-slate-600">Commercial Status</span>
                          <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium ${packageCommercialStatus.className}`}>
                            {packageCommercialStatus.label}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                          <span className="text-slate-600">Approval Gate</span>
                          <span className={`font-semibold ${canApprovePackage ? 'text-green-700' : 'text-red-600'}`}>
                            {canApprovePackage ? 'Ready' : 'Blocked'}
                          </span>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-2">
              <div className="text-xs text-slate-600">
                {BUILDER_TABS.find((tab) => tab.id === activeBuilderTab)?.step} | {BUILDER_TABS.find((tab) => tab.id === activeBuilderTab)?.label}
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

          {pendingAddDishIds.length > 0 && (
            <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/30 p-4">
              <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Add Menu Item</h3>
                    <p className="text-[11px] text-slate-500">Choose whether the selected dish belongs in a fixed line or a choice group.</p>
                  </div>
                  <button type="button" onClick={closeAddDishDialog} className="inline-flex size-8 items-center justify-center rounded text-slate-500 hover:bg-slate-100">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="space-y-3 px-4 py-4">
                  <button type="button" onClick={handleConfirmAddToFixedItems} className={`${compactPrimaryButtonClass} w-full justify-center`}>
                    Add as Fixed Item
                  </button>
                  <div>
                    <label className={compactLabelClass}>Choice Group</label>
                    <select
                      value={pendingAddChoiceGroupId}
                      onChange={(event) => setPendingAddChoiceGroupId(event.target.value)}
                      className={compactInputClass}
                    >
                      <option value="">Select choice group</option>
                      {choiceGroups.map((choiceGroup) => (
                        <option key={choiceGroup.id} value={choiceGroup.id}>
                          {choiceGroup.groupName || 'Unnamed Group'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmAddToChoiceGroup}
                      disabled={!pendingAddChoiceGroupId}
                      className={`${compactOutlineAccentButtonClass} flex-1 justify-center`}
                    >
                      Add to Choice Group
                    </button>
                    {!viewMode ? (
                      <button type="button" onClick={handleAddChoiceGroup} className={compactSecondaryButtonClass}>
                        <Plus className="h-4 w-4" />
                        New Group
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}

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
