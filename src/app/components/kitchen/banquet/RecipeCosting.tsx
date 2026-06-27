import { Fragment, type DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Edit2, Eye, FileText, GripVertical, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrencyPKR } from '../../../lib/locale';
import {
  calculateStandardRecipeMetrics,
  getRecipeStandardCostSnapshot,
} from '../../../lib/recipeCostingMath';
import {
  convertUnitQuantity,
  ensureSelectedUnitOption,
  formatUnitLabel,
  getUnitByCode,
  formatUnitOptionLabel,
  getUnitsForUsage,
} from '../../../lib/unitConversion';
import {
  Dish,
  MeasurementUnit,
  MenuPackage,
  PurchaseItem,
  Recipe,
  RecipeCostLine,
  RecipeCostLineBasis,
  RecipeCostLineCategory,
  RecipeIngredient,
  UnitMaster,
} from '../types';

interface RecipeCostingProps {
  userName: string;
  dishes: Dish[];
  recipes: Recipe[];
  purchaseItems: PurchaseItem[];
  units: UnitMaster[];
  menuPackages: MenuPackage[];
  onDishesChange: (dishes: Dish[]) => void;
  onRecipesChange: (recipes: Recipe[]) => void;
  onMenuPackagesChange: (packages: MenuPackage[]) => void;
}

type RecipePresenceFilter = 'all' | 'with-recipe' | 'without-recipe';
type ProductionTypeFilter = 'all' | 'recipe-based' | 'purchased-ready' | 'service-item';
type CostingStatusFilter =
  | 'all'
  | 'profitable'
  | 'low-margin'
  | 'zero-margin'
  | 'loss-making'
  | 'missing-cost'
  | 'missing-recipe';
type RecipeStateFilter = 'all' | 'active' | 'inactive' | 'missing-recipe' | 'not-required';
type FoodCostBandFilter = 'all' | 'below-30' | '30-40' | '40-50' | 'above-50';
type MarginFilter = 'all' | 'positive' | 'zero' | 'negative';
type MissingConfigFilter =
  | 'all'
  | 'missing-ingredients'
  | 'missing-labor-or-utility'
  | 'missing-labor'
  | 'missing-utility'
  | 'missing-supply-price'
  | 'missing-category'
  | 'missing-kitchen-section'
  | 'missing-cost-link';
type RegisterSortKey =
  | 'severity'
  | 'dish'
  | 'standard-dish-cost'
  | 'cost-per-unit'
  | 'selling-price'
  | 'margin'
  | 'food-cost'
  | 'margin-percent';
type SellableProductionType = Extract<Dish['productionType'], 'recipe-based' | 'purchased-ready' | 'service-item'>;
type CostingStatusKey =
  | 'profitable'
  | 'low-margin'
  | 'zero-margin'
  | 'loss-making'
  | 'missing-cost'
  | 'missing-recipe';
type RecipeType = NonNullable<Recipe['recipeType']>;
type RecipeStatus = NonNullable<Recipe['status']>;
type RecipeDialogTab = 'ingredients' | 'costing' | 'evaluation';
type CommercialEditMode = 'price' | 'margin';
type RecipeCopyOptions = {
  ingredients: boolean;
  labor: boolean;
  utility: boolean;
  packaging: boolean;
  other: boolean;
  yieldSetup: boolean;
  notes: boolean;
};

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-3 py-2 text-sm text-slate-700 align-middle';
const compactTableHeadClass = 'px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-600';
const compactTableCellClass = 'px-2 py-1.5 text-xs text-slate-700 align-middle';
const inputClass = 'h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500';
const compactInputClass = 'h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-xs text-slate-800 hover:border-slate-300 hover:bg-white focus:border-blue-500 focus:bg-white focus:outline-none disabled:text-slate-600';
const textareaClass = 'min-h-[80px] w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500';
const labelClass = 'mb-1 block text-xs font-medium text-slate-700';
const sectionTitleClass = 'border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700';

const serializeRecipeDialogState = (value: unknown) => {
  try {
    return JSON.stringify(value) ?? null;
  } catch (error) {
    console.error('Failed to serialize recipe dialog state:', error);
    return null;
  }
};

const recipeTypeOptions: Array<{ value: RecipeType; label: string }> = [
  { value: 'menu-recipe', label: 'Menu Recipe' },
  { value: 'production-recipe', label: 'Production Recipe' },
  { value: 'semi-finished-recipe', label: 'Semi Finished Recipe' },
];

const recipeCategoryOptions = [
  { value: '', label: 'Select recipe category' },
  { value: 'main-production', label: 'Main Production' },
  { value: 'sauce-base', label: 'Sauce / Base' },
  { value: 'bakery-prep', label: 'Bakery Prep' },
  { value: 'beverage-base', label: 'Beverage Base' },
  { value: 'semi-finished', label: 'Semi Finished' },
  { value: 'menu-finish', label: 'Menu Finish' },
];

const defaultRecipeCopyOptions: RecipeCopyOptions = {
  ingredients: true,
  labor: true,
  utility: true,
  packaging: true,
  other: true,
  yieldSetup: false,
  notes: false,
};

const kitchenSectionOptions = [
  { value: '', label: 'Select kitchen section' },
  { value: 'hot-kitchen', label: 'Hot Kitchen' },
  { value: 'cold-kitchen', label: 'Cold Kitchen' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'bbq', label: 'BBQ' },
  { value: 'sweet-section', label: 'Sweet Section' },
  { value: 'beverage', label: 'Beverage' },
  { value: 'production-kitchen', label: 'Production Kitchen' },
];

const recipeCostLineCategoryOrder: RecipeCostLineCategory[] = ['labor', 'utility', 'packaging', 'other'];

const itemUsageRecipeCostLineBasisOptions: Array<{ value: RecipeCostLineBasis; label: string }> = [
  { value: 'fixed', label: 'Fixed Cost' },
  { value: 'item-usage', label: 'Item Usage' },
];

const laborRecipeCostLineBasisOptions: Array<{ value: RecipeCostLineBasis; label: string }> = [
  { value: 'fixed', label: 'Fixed Cost' },
  { value: 'per-hour', label: 'Per Hour' },
  { value: 'per-person', label: 'Per Person' },
  { value: 'per-daig', label: 'Per Daig' },
  { value: 'per-head', label: 'Per Head' },
];

const productionTypeOptions: Array<{ value: SellableProductionType; label: string }> = [
  { value: 'recipe-based', label: 'Recipe Based' },
  { value: 'purchased-ready', label: 'Purchased Ready' },
  { value: 'service-item', label: 'Service Item' },
];

const foodCostBandOptions: Array<{ value: FoodCostBandFilter; label: string }> = [
  { value: 'all', label: 'All Food Cost' },
  { value: 'below-30', label: 'Below 30%' },
  { value: '30-40', label: '30% to 40%' },
  { value: '40-50', label: '40% to 50%' },
  { value: 'above-50', label: 'Above 50%' },
];

const marginFilterOptions: Array<{ value: MarginFilter; label: string }> = [
  { value: 'all', label: 'All Margin' },
  { value: 'positive', label: 'Positive Margin' },
  { value: 'zero', label: 'Zero Margin' },
  { value: 'negative', label: 'Negative Margin' },
];

const missingConfigOptions: Array<{ value: MissingConfigFilter; label: string }> = [
  { value: 'all', label: 'All Config' },
  { value: 'missing-ingredients', label: 'Missing Ingredients' },
  { value: 'missing-labor-or-utility', label: 'Missing Labor / Utility' },
  { value: 'missing-labor', label: 'Missing Labor Cost' },
  { value: 'missing-utility', label: 'Missing Utility Cost' },
  { value: 'missing-supply-price', label: 'Missing Supply Price' },
  { value: 'missing-category', label: 'Missing Category' },
  { value: 'missing-kitchen-section', label: 'Missing Kitchen Section' },
  { value: 'missing-cost-link', label: 'Missing Cost Link' },
];

const costingStatusOptions: Array<{ value: CostingStatusFilter; label: string }> = [
  { value: 'all', label: 'All Costing' },
  { value: 'profitable', label: 'Profitable' },
  { value: 'low-margin', label: 'Low Margin' },
  { value: 'zero-margin', label: 'Zero Margin' },
  { value: 'loss-making', label: 'Loss Making' },
  { value: 'missing-cost', label: 'Missing Cost' },
  { value: 'missing-recipe', label: 'Missing Recipe' },
];

const recipeStateOptions: Array<{ value: RecipeStateFilter; label: string }> = [
  { value: 'all', label: 'All Recipe State' },
  { value: 'active', label: 'Active Recipe' },
  { value: 'inactive', label: 'Inactive Recipe' },
  { value: 'missing-recipe', label: 'Missing Recipe' },
  { value: 'not-required', label: 'Not Required' },
];

const sortOptions: Array<{ value: RegisterSortKey; label: string }> = [
  { value: 'severity', label: 'Status Priority' },
  { value: 'dish', label: 'Dish' },
  { value: 'standard-dish-cost', label: 'Standard Dish Cost' },
  { value: 'cost-per-unit', label: 'Standard Cost Per Unit' },
  { value: 'selling-price', label: 'Selling Price' },
  { value: 'margin', label: 'Margin' },
  { value: 'food-cost', label: 'Food Cost %' },
  { value: 'margin-percent', label: 'Margin %' },
];

const COSTING_FOOD_COST_THRESHOLD = 50;

const preferredOutputInventoryTypes = new Set(['semi-finished-product', 'finished-product']);
const legacyInventoryTypeMap = {
  'ready-made': 'finished-product',
  consumable: 'packaging-material',
  packaging: 'packaging-material',
} as const;

const getInventoryType = (item: PurchaseItem) => item.inventoryType || legacyInventoryTypeMap[item.category] || 'raw-material';
const getBaseUnit = (item: PurchaseItem) => item.baseUnitId || item.issueUnit;
const getIngredientEntryUnit = (ingredient: RecipeIngredient, linkedItem?: PurchaseItem) =>
  ingredient.entryUnitId || ingredient.unit || ingredient.baseUnitId || linkedItem?.baseUnitId || linkedItem?.issueUnit || 'pcs';
const isActivePurchaseItem = (item: PurchaseItem) => (item.status || 'active') === 'active';
const isRecipeIngredientEnabled = (item?: PurchaseItem | null) => item?.useInRecipeIngredients !== false;
const resolveDishProductionType = (dish: Dish): SellableProductionType => {
  if (
    dish.productionType === 'recipe-based' ||
    dish.productionType === 'purchased-ready' ||
    dish.productionType === 'service-item'
  ) {
    return dish.productionType;
  }

  if (dish.sourceType === 'in-house-produced' || dish.productionType === 'in-house' || dish.recipeId) {
    return 'recipe-based';
  }

  if (dish.sourceType === 'outsourced') {
    return 'service-item';
  }

  return 'purchased-ready';
};

const getPrimaryLinkedPurchaseItem = (dish: Dish, purchaseItems: PurchaseItem[]) => {
  const linkedPurchaseItemId = dish.resaleProfile?.linkedPurchaseItemIds?.[0];
  return linkedPurchaseItemId ? purchaseItems.find((item) => item.id === linkedPurchaseItemId) : undefined;
};

const getProductionTypeLabel = (productionType: SellableProductionType) =>
  productionTypeOptions.find((option) => option.value === productionType)?.label || productionType.replace(/-/g, ' ');

const isRecipeOutputEnabled = (item: PurchaseItem) =>
  item.useAsRecipeOutput ?? preferredOutputInventoryTypes.has(getInventoryType(item));
const isLikelyProducedOutputItem = (item: PurchaseItem) => {
  const inventoryType = getInventoryType(item);
  return inventoryType === 'semi-finished-product' || inventoryType === 'finished-product' || isRecipeOutputEnabled(item);
};
const isIngredientStyleOutputItem = (item: PurchaseItem) => !isLikelyProducedOutputItem(item);
const normalizeMatchText = (value?: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const findSuggestedOutputItem = (dishName: string, items: PurchaseItem[]) => {
  const normalizedDishName = normalizeMatchText(dishName);
  if (!normalizedDishName) {
    return undefined;
  }

  const exactMatch = items.find((item) => normalizeMatchText(item.itemName) === normalizedDishName);
  if (exactMatch) {
    return exactMatch;
  }

  return items.find((item) => {
    const normalizedItemName = normalizeMatchText(item.itemName);
    return normalizedItemName.startsWith(`${normalizedDishName} `) || normalizedDishName.startsWith(`${normalizedItemName} `);
  });
};

const resolveRecipeIngredientItem = (ingredient: RecipeIngredient, items: PurchaseItem[]) => {
  const itemId = ingredient.itemId || ingredient.purchaseItemId;
  const itemById = itemId ? items.find((item) => item.id === itemId) : undefined;
  if (itemById) {
    return itemById;
  }

  const ingredientName = normalizeMatchText(ingredient.itemName || ingredient.purchaseItemName);
  if (!ingredientName) {
    return undefined;
  }

  const exactMatch = items.find((item) => normalizeMatchText(item.itemName) === ingredientName);
  if (exactMatch) {
    return exactMatch;
  }

  const partialMatches = items.filter((item) => {
    const itemName = normalizeMatchText(item.itemName);
    return itemName.startsWith(`${ingredientName} `) || ingredientName.startsWith(`${itemName} `);
  });

  return partialMatches.length === 1 ? partialMatches[0] : undefined;
};

const getPurchaseItemUnitCost = (item: PurchaseItem, units: UnitMaster[] = []) => {
  const lastPurchaseCost = item.lastPurchaseRate || item.lastCost || item.defaultPurchaseCost || 0;
  const purchaseUnitId = getPurchaseItemPurchaseUnit(item);
  const baseUnitId = getBaseUnit(item);

  if (lastPurchaseCost > 0) {
    if (!purchaseUnitId || !baseUnitId || purchaseUnitId === baseUnitId) {
      return lastPurchaseCost;
    }

    const convertedPurchaseQuantity = convertUnitQuantity(1, purchaseUnitId, baseUnitId, units);
    if (convertedPurchaseQuantity !== null && convertedPurchaseQuantity > 0) {
      return lastPurchaseCost / convertedPurchaseQuantity;
    }

    if (item.conversionFactor > 0) {
      return lastPurchaseCost / item.conversionFactor;
    }
  }

  if (typeof item.ratePerUnit === 'number' && item.ratePerUnit > 0) {
    return item.ratePerUnit;
  }

  if (typeof item.averageCost === 'number' && item.averageCost > 0) {
    return item.averageCost;
  }

  return 0;
};

const formatSalesUnitLabel = (unit?: string) => String(unit || 'unit').replace(/-/g, ' ');

const getDefaultSalesVariant = (dish: Dish) =>
  dish.salesVariants?.find((variant) => variant.isDefault) || dish.salesVariants?.[0];

const buildFallbackSalesVariant = (dish: Dish, costPerYieldUnit: number) => {
  const salesUnit = dish.unitOfSale || 'portion';

  return {
    id: `${dish.id}-default`,
    label: 'Default',
    variantLabel: 'Default',
    salesUnit,
    salesUnitId: salesUnit,
    quantity: 1,
    salesQuantity: 1,
    quantityUnit: salesUnit,
    sellingPrice: dish.sellingPrice || dish.defaultSellingPrice || 0,
    estimatedCost: costPerYieldUnit,
    isDefault: true,
    active: true,
    status: 'active' as const,
  };
};

const recostDishFromRecipe = (dish: Dish, recipe: Recipe, userName: string, now: Date): Dish => {
  const costPerYieldUnit = recipe.costPerYieldUnit ?? recipe.costPerPortion ?? 0;
  const productionType = resolveDishProductionType(dish);
  const recipeSellingPricePerYieldUnit = recipe.supplySellingPricePerYieldUnit ?? recipe.suggestedSellingPrice ?? 0;
  const variants = dish.salesVariants?.length
    ? dish.salesVariants
    : [buildFallbackSalesVariant(dish, costPerYieldUnit)];
  const hasDefaultVariant = variants.some((variant) => variant.isDefault);
  const recostedVariants = variants.map((variant, index) => {
    const quantity = Number(variant.quantity ?? variant.salesQuantity ?? 1) || 1;
    const salesUnit = variant.salesUnit || variant.salesUnitId || dish.unitOfSale || 'portion';
    const nextSellingPrice =
      productionType === 'purchased-ready' && recipeSellingPricePerYieldUnit > 0
        ? quantity * recipeSellingPricePerYieldUnit
        : variant.sellingPrice;

    return {
      ...variant,
      salesUnit,
      salesUnitId: variant.salesUnitId || salesUnit,
      quantity,
      salesQuantity: quantity,
      quantityUnit: variant.quantityUnit || salesUnit,
      sellingPrice: nextSellingPrice,
      estimatedCost: quantity * costPerYieldUnit,
      isDefault: hasDefaultVariant ? Boolean(variant.isDefault) : index === 0,
      active: variant.status ? variant.status !== 'inactive' : variant.active !== false,
      status: variant.status || (variant.active === false ? 'inactive' : 'active'),
    };
  });
  const defaultVariant = getDefaultSalesVariant({ ...dish, salesVariants: recostedVariants }) || recostedVariants[0];
  const defaultSellingPrice = defaultVariant?.sellingPrice ?? dish.sellingPrice ?? 0;
  const defaultVariantCost = defaultVariant?.estimatedCost ?? costPerYieldUnit;
  const foodCostPercentage = defaultSellingPrice > 0 ? (defaultVariantCost / defaultSellingPrice) * 100 : 0;

  return {
    ...dish,
    hasRecipe: true,
    recipeId: recipe.id,
    salesVariants: recostedVariants,
    estimatedCost: costPerYieldUnit,
    costPerBaseUnit: costPerYieldUnit,
    recipeCost: recipe.totalRecipeCost ?? recipe.totalCost ?? 0,
    defaultVariantCost,
    defaultSellingPrice,
    sellingPrice: defaultSellingPrice,
    foodCostPercentage,
    grossMargin: defaultSellingPrice - defaultVariantCost,
    updatedBy: userName,
    updatedAt: now,
  };
};

const getPackageLineCost = (dish: Dish, variantId: string | undefined, unit: string, quantityPerHead: number) => {
  const variant =
    dish.salesVariants?.find((entry) => variantId && entry.id === variantId) ||
    dish.salesVariants?.find((entry) => entry.salesUnit === unit || entry.salesUnitId === unit) ||
    getDefaultSalesVariant(dish);

  return (variant?.estimatedCost ?? dish.defaultVariantCost ?? dish.estimatedCost ?? 0) * quantityPerHead;
};

const recostMenuPackagesForDish = (packages: MenuPackage[], updatedDish: Dish): MenuPackage[] =>
  packages.map((menuPackage) => {
    let packageChanged = false;
    const recostedDishes = menuPackage.dishes.map((packageDish) => {
      if (packageDish.dishId !== updatedDish.id) {
        return packageDish;
      }

      packageChanged = true;
      return {
        ...packageDish,
        dishName: updatedDish.dishName,
        preparationArea: updatedDish.preparationArea,
        sourceType: updatedDish.sourceType,
        costPerHead: getPackageLineCost(
          updatedDish,
          packageDish.variantId,
          packageDish.unit,
          packageDish.quantityPerHead || 1,
        ),
      };
    });

    if (!packageChanged) {
      return menuPackage;
    }

    return {
      ...menuPackage,
      dishes: recostedDishes,
      totalCostPerHead: recostedDishes.reduce((sum, dish) => sum + (dish.costPerHead || 0), 0),
      updatedAt: new Date(),
    };
  });

const getRecipeTypeLabel = (recipeType?: string) =>
  recipeTypeOptions.find((option) => option.value === recipeType)?.label || (recipeType || '-').replace(/-/g, ' ');

const getRecipeStatusLabel = (recipe?: Recipe) => {
  if (!recipe) {
    return 'Missing';
  }

  return recipe.status === 'inactive' ? 'Inactive' : 'Active';
};

const getRecipeStateLabel = (recipeState: Exclude<RecipeStateFilter, 'all'>) => {
  if (recipeState === 'missing-recipe') {
    return 'Missing Recipe';
  }

  if (recipeState === 'not-required') {
    return 'Not Required';
  }

  return recipeState === 'inactive' ? 'Inactive' : 'Active';
};

const getCostingStatusLabel = (status: CostingStatusKey) => {
  switch (status) {
    case 'profitable':
      return 'Profitable';
    case 'low-margin':
      return 'Low Margin';
    case 'zero-margin':
      return 'Zero Margin';
    case 'loss-making':
      return 'Loss Making';
    case 'missing-cost':
      return 'Missing Cost';
    case 'missing-recipe':
      return 'Missing Recipe';
    default:
      return status;
  }
};

const getCostingStatusBadgeClass = (status: CostingStatusKey) => {
  if (status === 'profitable') {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (status === 'low-margin') {
    return 'bg-amber-100 text-amber-700';
  }
  if (status === 'zero-margin') {
    return 'bg-slate-100 text-slate-600';
  }
  return 'bg-red-100 text-red-700';
};

const getRecipeStateBadgeClass = (recipeState: Exclude<RecipeStateFilter, 'all'>) => {
  if (recipeState === 'active') {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (recipeState === 'inactive' || recipeState === 'not-required') {
    return 'bg-slate-100 text-slate-600';
  }
  return 'bg-red-100 text-red-700';
};

const getRecipeCode = (recipe?: Recipe) => recipe?.recipeCode || '-';
const getRecipeName = (dish: Dish, recipe?: Recipe) => recipe?.recipeName || dish.dishName;

const getYieldQuantity = (recipe?: Recipe) => recipe?.yieldQuantity ?? recipe?.yields ?? 0;
const getYieldUnit = (recipe?: Recipe) => recipe?.yieldUnitId || recipe?.yieldUnit || '-';
const getRecipeOutputItemName = (recipe: Recipe | undefined, purchaseItems: PurchaseItem[]) => {
  if (!recipe?.outputItemId) {
    return recipe?.outputItemName || recipe?.recipeName || '-';
  }

  return (
    recipe.outputItemName ||
    purchaseItems.find((item) => item.id === recipe.outputItemId)?.itemName ||
    '-'
  );
};

const getIngredientCategoryKey = (item: PurchaseItem) => item.categoryId || item.category || 'uncategorized';

const formatIngredientCategoryLabel = (value: string) =>
  value === 'uncategorized'
    ? 'Uncategorized'
    : value
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());

const getPurchaseItemLastPurchaseRate = (item?: PurchaseItem) =>
  item ? item.lastPurchaseRate || item.lastCost || item.defaultPurchaseCost || 0 : 0;

const getPurchaseItemPurchaseUnit = (item?: PurchaseItem) => item?.purchaseUnitId || item?.purchaseUnit || '-';

const getPreferredPurchasedReadyYieldUnit = (item?: PurchaseItem): MeasurementUnit =>
  (item ? (getBaseUnit(item) || getPurchaseItemPurchaseUnit(item)) : '') || 'kg';

const resolveRecipeYieldUnitId = ({
  dish,
  recipe,
  linkedPurchaseItem,
}: {
  dish: Dish;
  recipe?: Recipe;
  linkedPurchaseItem?: PurchaseItem;
}): MeasurementUnit => {
  const savedYieldUnitId = (recipe?.yieldUnitId || recipe?.yieldUnit || '') as MeasurementUnit;

  if (resolveDishProductionType(dish) !== 'purchased-ready') {
    return savedYieldUnitId || 'kg';
  }

  const preferredYieldUnitId = getPreferredPurchasedReadyYieldUnit(linkedPurchaseItem);
  if (!savedYieldUnitId) {
    return preferredYieldUnitId;
  }

  if (savedYieldUnitId === preferredYieldUnitId) {
    return savedYieldUnitId;
  }

  const savedYieldQuantity = recipe?.yieldQuantity ?? recipe?.yields ?? 1;
  const recipeHasIngredients = Boolean(recipe?.ingredients?.length);
  const isLegacyPurchasedReadyDefault =
    savedYieldUnitId === 'kg' &&
    preferredYieldUnitId !== 'kg' &&
    savedYieldQuantity === 1 &&
    !recipeHasIngredients;

  return isLegacyPurchasedReadyDefault ? preferredYieldUnitId : savedYieldUnitId;
};

const getRecipeCostLineCategoryLabel = (category: RecipeCostLineCategory) => {
  switch (category) {
    case 'labor':
      return 'Labor';
    case 'utility':
      return 'Utility / Fuel';
    case 'packaging':
      return 'Packaging / Consumable';
    case 'other':
      return 'Other Production';
    default:
      return 'Cost';
  }
};

const getRecipeCostLineDefaultName = (category: RecipeCostLineCategory) => {
  switch (category) {
    case 'labor':
      return 'Cook Charge';
    case 'utility':
      return 'LPG / Utility';
    case 'packaging':
      return 'Packaging / Consumable';
    case 'other':
      return 'Other Production Cost';
    default:
      return 'Cost Line';
  }
};

const getRecipeCostLinePlaceholder = (category: RecipeCostLineCategory) => {
  switch (category) {
    case 'labor':
      return 'Cook, helper, loader';
    case 'utility':
      return 'LPG, electricity, water';
    case 'packaging':
      return 'Container, box, foil, label';
    case 'other':
      return 'Cleaning, overhead, misc';
    default:
      return 'Cost line';
  }
};

const getIngredientSnapshot = (ingredient: RecipeIngredient, purchaseItems: PurchaseItem[]) => {
  const itemId = ingredient.itemId || ingredient.purchaseItemId;
  const linkedItem = purchaseItems.find((item) => item.id === itemId);
  const categoryId = linkedItem ? getIngredientCategoryKey(linkedItem) : ingredient.categoryId || 'uncategorized';
  const itemName = linkedItem?.itemName || ingredient.itemName || ingredient.purchaseItemName || 'Unknown Item';

  return {
    categoryId,
    categoryName: linkedItem ? formatIngredientCategoryLabel(categoryId) : ingredient.categoryName || formatIngredientCategoryLabel(categoryId),
    itemName,
    lastPurchaseRate: linkedItem
      ? getPurchaseItemLastPurchaseRate(linkedItem)
      : ingredient.lastPurchaseRate ?? ingredient.unitCost ?? ingredient.costPerUnit ?? 0,
    lastPurchaseUnit: linkedItem
      ? getPurchaseItemPurchaseUnit(linkedItem)
      : ingredient.lastPurchaseUnit || ingredient.baseUnitId || ingredient.unit || '-',
  };
};

const compareIngredientsByCategoryAndCost = (
  left: RecipeIngredient,
  right: RecipeIngredient,
  purchaseItems: PurchaseItem[],
) => {
  const leftSnapshot = getIngredientSnapshot(left, purchaseItems);
  const rightSnapshot = getIngredientSnapshot(right, purchaseItems);
  const categoryOrder = leftSnapshot.categoryName.localeCompare(rightSnapshot.categoryName);

  if (categoryOrder !== 0) {
    return categoryOrder;
  }

  const costOrder = (right.totalCost || 0) - (left.totalCost || 0);
  if (costOrder !== 0) {
    return costOrder;
  }

  return leftSnapshot.itemName.localeCompare(rightSnapshot.itemName);
};

const sortIngredientsByCategoryAndCost = (ingredients: RecipeIngredient[], purchaseItems: PurchaseItem[]) =>
  [...ingredients].sort((left, right) => compareIngredientsByCategoryAndCost(left, right, purchaseItems));

const formatShare = (amount: number, total: number) => {
  if (total <= 0) {
    return '0.00%';
  }

  return `${((amount / total) * 100).toFixed(2)}%`;
};

const formatDisplayQuantity = (value: number) => {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return (Math.round(value * 1000) / 1000).toFixed(3).replace(/\.?0+$/, '');
};

const getCostLineBasisLabel = (basis: RecipeCostLineBasis) =>
  (
    {
      'item-usage': 'Item Usage',
      'fixed-daig-capacity': 'Per Batch / Daig',
      'per-batch': 'Per Batch / Daig',
      'per-daig': 'Per Daig',
      'per-kg-yield': 'Per KG Output',
      'per-head': 'Per Head',
    } as Partial<Record<RecipeCostLineBasis, string>>
  )[basis] ||
  laborRecipeCostLineBasisOptions.find((option) => option.value === basis)?.label ||
  basis.replace(/-/g, ' ');

const normalizeRecipeCostLineBasis = (basis?: RecipeCostLineBasis): RecipeCostLineBasis => {
  if (basis === 'fixed-daig-capacity') {
    return 'per-batch';
  }

  if (basis === 'per-kg-yield') {
    return 'per-kg-output';
  }

  return basis || 'fixed';
};

const laborPerKgInputUnit = 'kg';

const getRecipeCostLineBasisOptions = (
  category: RecipeCostLineCategory,
  selectedBasis?: RecipeCostLineBasis,
): Array<{ value: RecipeCostLineBasis; label: string }> => {
  const baseOptions = category === 'labor' ? laborRecipeCostLineBasisOptions : itemUsageRecipeCostLineBasisOptions;
  if (!selectedBasis || baseOptions.some((option) => option.value === selectedBasis)) {
    return baseOptions;
  }

  return [
    { value: selectedBasis, label: getCostLineBasisLabel(selectedBasis) },
    ...baseOptions,
  ];
};

const shouldShowRecipeCostReference = (category: RecipeCostLineCategory) => category !== 'labor';

const getRecipeCostLineNameColumnLabel = (category: RecipeCostLineCategory) => {
  switch (category) {
    case 'labor':
      return 'Labor Name';
    case 'utility':
      return 'Utility Name';
    case 'packaging':
      return 'Packaging Name';
    default:
      return 'Cost Name';
  }
};

const resolveRecipeCostReferenceId = (
  referenceId: string | undefined,
  ingredients: RecipeIngredient[],
  purchaseItems: PurchaseItem[] = [],
) => {
  if (!referenceId) {
    return undefined;
  }

  if (purchaseItems.some((item) => item.id === referenceId)) {
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

const findReferencedIngredient = (
  line: RecipeCostLine,
  ingredients: RecipeIngredient[],
  purchaseItems: PurchaseItem[] = [],
) => {
  const resolvedReferenceId = resolveRecipeCostReferenceId(line.ingredientReferenceId, ingredients, purchaseItems);

  return ingredients.find(
    (entry) =>
      entry.id === line.ingredientReferenceId ||
      entry.id === resolvedReferenceId ||
      entry.itemId === resolvedReferenceId ||
      entry.purchaseItemId === resolvedReferenceId,
  );
};

const findReferencedPurchaseItem = (
  line: RecipeCostLine,
  ingredients: RecipeIngredient[],
  purchaseItems: PurchaseItem[] = [],
) => {
  const resolvedReferenceId = resolveRecipeCostReferenceId(line.ingredientReferenceId, ingredients, purchaseItems);
  return resolvedReferenceId ? purchaseItems.find((item) => item.id === resolvedReferenceId) : undefined;
};

const getReferencedIngredientQuantity = (
  line: RecipeCostLine,
  ingredients: RecipeIngredient[],
  purchaseItems: PurchaseItem[] = [],
) => {
  const ingredient = findReferencedIngredient(line, ingredients, purchaseItems);

  return ingredient?.scaledEntryQuantity ?? ingredient?.entryQuantity ?? ingredient?.requiredQuantity ?? ingredient?.quantity ?? 0;
};

const getRecipeInputQuantityInKg = (
  ingredients: RecipeIngredient[] = [],
  units: UnitMaster[] = [],
) =>
  ingredients.reduce((sum, ingredient) => {
    const entryQuantity =
      ingredient.scaledEntryQuantity ??
      ingredient.entryQuantity ??
      ingredient.requiredQuantity ??
      ingredient.quantity ??
      0;
    const entryUnitId = ingredient.entryUnitId || ingredient.unit || ingredient.baseUnitId;
    const baseQuantity = ingredient.scaledBaseQuantity ?? ingredient.baseQuantity ?? 0;
    const baseUnitId = ingredient.baseUnitId || ingredient.unit;
    const entryKg =
      entryQuantity > 0 && entryUnitId
        ? convertUnitQuantity(entryQuantity, entryUnitId, laborPerKgInputUnit, units)
        : null;

    if (entryKg !== null) {
      return sum + Math.max(entryKg, 0);
    }

    const baseKg =
      baseQuantity > 0 && baseUnitId
        ? convertUnitQuantity(baseQuantity, baseUnitId, laborPerKgInputUnit, units)
        : null;

    return sum + Math.max(baseKg || 0, 0);
  }, 0);

const calculateRecipeCostLineQuantity = (
  line: RecipeCostLine,
  effectiveYield: number,
  ingredients: RecipeIngredient[] = [],
  yieldUnitId?: MeasurementUnit,
  units: UnitMaster[] = [],
  purchaseItems: PurchaseItem[] = [],
) => {
  const yieldQuantity = Math.max(effectiveYield || 0, 0);
  const calculationBasis = normalizeRecipeCostLineBasis(line.calculationBasis);

  if (calculationBasis === 'fixed') {
    return 1;
  }

  if (calculationBasis === 'item-usage') {
    return line.quantity && line.quantity > 0 ? line.quantity : 1;
  }

  if (calculationBasis === 'per-kg-output') {
    return yieldQuantity;
  }

  if (calculationBasis === 'per-kg-input') {
    if (line.category === 'labor') {
      return Math.max(getRecipeInputQuantityInKg(ingredients, units), 0);
    }

    return Math.max(getReferencedIngredientQuantity(line, ingredients, purchaseItems), 0);
  }

  if (calculationBasis === 'per-batch') {
    const capacity = line.capacityQuantity && line.capacityQuantity > 0 ? line.capacityQuantity : 12;
    const capacityUnit = line.unit || yieldUnitId;
    const capacityInYieldUnit =
      yieldUnitId && capacityUnit && capacityUnit !== yieldUnitId
        ? convertUnitQuantity(capacity, capacityUnit, yieldUnitId, units)
        : capacity;

    return Math.max(1, Math.ceil(yieldQuantity / (capacityInYieldUnit || capacity)));
  }

  return line.quantity && line.quantity > 0 ? line.quantity : 1;
};

const syncRecipeCostLine = (
  line: RecipeCostLine,
  effectiveYield: number,
  ingredients: RecipeIngredient[] = [],
  yieldUnitId?: MeasurementUnit,
  units: UnitMaster[] = [],
  purchaseItems: PurchaseItem[] = [],
): RecipeCostLine => {
  const calculationBasis = normalizeRecipeCostLineBasis(line.calculationBasis);
  const normalizedReferenceId = resolveRecipeCostReferenceId(line.ingredientReferenceId, ingredients, purchaseItems);
  const referencedIngredient = findReferencedIngredient(line, ingredients, purchaseItems);
  const referencedPurchaseItem = findReferencedPurchaseItem(line, ingredients, purchaseItems);
  const referencedIngredientUnit =
    referencedIngredient?.entryUnitId || referencedIngredient?.unit || referencedIngredient?.baseUnitId;
  const referencedUsageUnit =
    referencedPurchaseItem?.baseUnitId ||
    referencedPurchaseItem?.issueUnit ||
    referencedIngredient?.baseUnitId ||
    referencedIngredient?.unit ||
    referencedIngredient?.entryUnitId;
  const supportsReference = shouldShowRecipeCostReference(line.category || 'labor');
  const rate =
    calculationBasis === 'item-usage' && referencedPurchaseItem
      ? getPurchaseItemUnitCost(referencedPurchaseItem, units)
      : Number(line.rate) || 0;
  const capacityQuantity = calculationBasis === 'per-batch'
    ? line.capacityQuantity && line.capacityQuantity > 0
      ? line.capacityQuantity
      : 12
    : undefined;
  const quantity = ['fixed', 'per-kg-output', 'per-kg-input'].includes(calculationBasis)
    ? undefined
    : calculationBasis === 'per-batch'
      ? calculateRecipeCostLineQuantity(
        { ...line, calculationBasis, rate, capacityQuantity },
        effectiveYield,
        ingredients,
        yieldUnitId,
        units,
        purchaseItems,
      )
      : line.quantity && line.quantity > 0
        ? line.quantity
        : 1;
  const chargeQuantity = calculateRecipeCostLineQuantity(
    { ...line, calculationBasis, rate, quantity, capacityQuantity },
    effectiveYield,
    ingredients,
    yieldUnitId,
    units,
    purchaseItems,
  );

  return {
    ...line,
    category: line.category || 'labor',
    name: line.name || '',
    calculationBasis,
    rate,
    quantity,
    capacityQuantity,
    unit:
      calculationBasis === 'fixed'
        ? undefined
        : calculationBasis === 'item-usage'
          ? referencedUsageUnit || line.unit
        : calculationBasis === 'per-kg-input'
          ? line.category === 'labor'
            ? laborPerKgInputUnit
            : referencedIngredientUnit || referencedPurchaseItem?.baseUnitId || referencedPurchaseItem?.issueUnit || line.unit
          : line.unit,
    ingredientReferenceId: supportsReference ? normalizedReferenceId : undefined,
    totalCost: rate * chargeQuantity,
  };
};

const createRecipeCostLine = (
  category: RecipeCostLineCategory,
  effectiveYield: number,
  yieldUnitId: MeasurementUnit,
  units: UnitMaster[],
  purchaseItems: PurchaseItem[] = [],
): RecipeCostLine =>
  syncRecipeCostLine(
    {
      id: `recipe-cost-${Date.now()}-${category}`,
      category,
      name: getRecipeCostLineDefaultName(category),
      calculationBasis: 'fixed',
      rate: 0,
      quantity: 1,
      unit: '',
      totalCost: 0,
    },
    effectiveYield,
    [],
    yieldUnitId,
    units,
    purchaseItems,
  );

const getDefaultCostLineUnit = (basis: RecipeCostLineBasis, yieldUnitId: MeasurementUnit) => {
  switch (normalizeRecipeCostLineBasis(basis)) {
    case 'item-usage':
      return '';
    case 'per-kg-output':
      return yieldUnitId;
    case 'per-kg-input':
      return laborPerKgInputUnit;
    case 'per-daig':
      return 'daig';
    case 'per-hour':
      return 'hour';
    case 'per-person':
      return 'person';
    case 'per-head':
      return 'head';
    default:
      return '';
  }
};

const standardizeRecipeCostLine = (
  line: RecipeCostLine,
  effectiveYield: number,
  ingredients: RecipeIngredient[] = [],
  yieldUnitId?: MeasurementUnit,
  units: UnitMaster[] = [],
  purchaseItems: PurchaseItem[] = [],
) => {
  const syncedLine = syncRecipeCostLine(line, effectiveYield, ingredients, yieldUnitId, units, purchaseItems);
  if (normalizeRecipeCostLineBasis(syncedLine.calculationBasis) !== 'per-batch') {
    return syncedLine;
  }

  return syncRecipeCostLine(
    {
      ...syncedLine,
      calculationBasis: 'fixed',
      rate: syncedLine.totalCost || 0,
      quantity: undefined,
      capacityQuantity: undefined,
      unit: undefined,
      ingredientReferenceId: syncedLine.ingredientReferenceId,
      totalCost: syncedLine.totalCost || 0,
    },
    effectiveYield,
    ingredients,
    yieldUnitId,
    units,
    purchaseItems,
  );
};

const generateRecipeCode = (recipes: Recipe[]) => {
  const maxCodeNumber = recipes.reduce((max, recipe) => {
    const match = recipe.recipeCode?.match(/^RCP-(\d+)$/i);
    if (!match) {
      return max;
    }

    return Math.max(max, Number(match[1]) || 0);
  }, 0);

  return `RCP-${String(maxCodeNumber + 1).padStart(4, '0')}`;
};

const getIngredientUnitOptions = (
  item: PurchaseItem | undefined,
  units: UnitMaster[],
  selectedUnitId?: MeasurementUnit,
) => {
  const recipeUnits = getUnitsForUsage('recipe', units);
  const baseUnit = item ? getUnitByCode(getBaseUnit(item), units) : undefined;
  const compatibleUnits = baseUnit
    ? recipeUnits.filter(
        (unit) => unit.family === baseUnit.family && unit.baseUnitCode === baseUnit.baseUnitCode,
      )
    : recipeUnits;

  return ensureSelectedUnitOption(compatibleUnits, selectedUnitId);
};

const getIngredientBaseQuantity = (
  entryQuantity: number,
  entryUnitId: MeasurementUnit,
  baseUnitId: MeasurementUnit,
  linkedItem: PurchaseItem | undefined,
  units: UnitMaster[],
) => {
  if (entryUnitId === baseUnitId) {
    return entryQuantity;
  }

  const convertedQuantity = convertUnitQuantity(entryQuantity, entryUnitId, baseUnitId, units);
  if (convertedQuantity !== null) {
    return convertedQuantity;
  }

  const purchaseUnitId = linkedItem?.purchaseUnitId || linkedItem?.purchaseUnit;
  if (linkedItem && entryUnitId === purchaseUnitId && linkedItem.conversionFactor > 0) {
    return entryQuantity * linkedItem.conversionFactor;
  }

  return null;
};

const normalizeIngredient = (ingredient: RecipeIngredient, purchaseItems: PurchaseItem[], units: UnitMaster[]) => {
  const itemId = ingredient.itemId || ingredient.purchaseItemId;
  const linkedItem = resolveRecipeIngredientItem(ingredient, purchaseItems);
  const resolvedItemId = linkedItem?.id || itemId;
  const entryQuantity = ingredient.entryQuantity ?? ingredient.requiredQuantity ?? ingredient.quantity ?? 0;
  const baseUnitId = ingredient.baseUnitId || linkedItem?.baseUnitId || linkedItem?.issueUnit || ingredient.unit || 'pcs';
  const entryUnitId = getIngredientEntryUnit(ingredient, linkedItem);
  const unitCost = linkedItem ? getPurchaseItemUnitCost(linkedItem, units) : ingredient.unitCost ?? ingredient.costPerUnit ?? 0;
  const wastagePercentage = ingredient.wastagePercentage ?? 0;
  const baseQuantity = getIngredientBaseQuantity(entryQuantity, entryUnitId, baseUnitId, linkedItem, units);
  const resolvedBaseQuantity = baseQuantity ?? 0;
  const netQuantity = resolvedBaseQuantity * (1 + wastagePercentage / 100);
  const totalCost = resolvedBaseQuantity * unitCost;
  const purchaseItemName = ingredient.purchaseItemName || ingredient.itemName || linkedItem?.itemName || 'Unknown Item';
  const categoryId = linkedItem ? getIngredientCategoryKey(linkedItem) : ingredient.categoryId || 'uncategorized';
  const categoryName = linkedItem
    ? formatIngredientCategoryLabel(categoryId)
    : ingredient.categoryName || formatIngredientCategoryLabel(categoryId);
  const lastPurchaseRate = linkedItem
    ? getPurchaseItemLastPurchaseRate(linkedItem)
    : ingredient.lastPurchaseRate ?? ingredient.unitCost ?? ingredient.costPerUnit ?? 0;
  const lastPurchaseUnit = linkedItem
    ? getPurchaseItemPurchaseUnit(linkedItem)
    : ingredient.lastPurchaseUnit || baseUnitId;

  return {
    ...ingredient,
    itemId: resolvedItemId,
    purchaseItemId: resolvedItemId,
    itemName: purchaseItemName,
    purchaseItemName,
    categoryId,
    categoryName,
    entryQuantity,
    entryUnitId,
    requiredQuantity: entryQuantity,
    quantity: entryQuantity,
    baseQuantity: resolvedBaseQuantity,
    scaledEntryQuantity: ingredient.scaledEntryQuantity ?? entryQuantity,
    scaledBaseQuantity: ingredient.scaledBaseQuantity ?? resolvedBaseQuantity,
    baseUnitId,
    unit: entryUnitId,
    lastPurchaseRate,
    lastPurchaseUnit,
    unitCost,
    costPerUnit: unitCost,
    wastagePercentage,
    netQuantity,
    totalCost,
  };
};

const createIngredientRow = (item: PurchaseItem, units: UnitMaster[] = []): RecipeIngredient => {
  const baseUnitId = getBaseUnit(item);
  const unitCost = getPurchaseItemUnitCost(item, units);
  const categoryId = getIngredientCategoryKey(item);

  return {
    id: `ingredient-${Date.now()}-${item.id}`,
    itemId: item.id,
    purchaseItemId: item.id,
    itemName: item.itemName,
    purchaseItemName: item.itemName,
    categoryId,
    categoryName: formatIngredientCategoryLabel(categoryId),
    entryQuantity: 0,
    entryUnitId: baseUnitId,
    requiredQuantity: 0,
    quantity: 0,
    baseQuantity: 0,
    scaledEntryQuantity: 0,
    scaledBaseQuantity: 0,
    baseUnitId,
    unit: baseUnitId,
    lastPurchaseRate: getPurchaseItemLastPurchaseRate(item),
    lastPurchaseUnit: getPurchaseItemPurchaseUnit(item),
    unitCost,
    costPerUnit: unitCost,
    wastagePercentage: 0,
    netQuantity: 0,
    totalCost: 0,
  };
};

const syncIngredientRow = (
  ingredient: RecipeIngredient,
  purchaseItems: PurchaseItem[] = [],
  units: UnitMaster[] = [],
  scaleFactor = 1,
) => {
  const itemId = ingredient.itemId || ingredient.purchaseItemId;
  const linkedItem = resolveRecipeIngredientItem(ingredient, purchaseItems);
  const resolvedItemId = linkedItem?.id || itemId;
  const entryQuantity = ingredient.entryQuantity ?? ingredient.requiredQuantity ?? ingredient.quantity ?? 0;
  const unitCost = linkedItem ? getPurchaseItemUnitCost(linkedItem, units) : ingredient.unitCost ?? ingredient.costPerUnit ?? 0;
  const wastagePercentage = ingredient.wastagePercentage ?? 0;
  const baseUnitId = linkedItem ? getBaseUnit(linkedItem) : ingredient.baseUnitId || ingredient.unit;
  const entryUnitId = getIngredientEntryUnit(ingredient, linkedItem);
  const baseQuantity = getIngredientBaseQuantity(entryQuantity, entryUnitId, baseUnitId, linkedItem, units);
  const resolvedBaseQuantity = baseQuantity ?? 0;
  const scaledEntryQuantity = entryQuantity * scaleFactor;
  const scaledBaseQuantity = resolvedBaseQuantity * scaleFactor;
  const netQuantity = scaledBaseQuantity * (1 + wastagePercentage / 100);
  const totalCost = scaledBaseQuantity * unitCost;
  const itemName = linkedItem?.itemName || ingredient.itemName || ingredient.purchaseItemName;
  const categoryId = linkedItem ? getIngredientCategoryKey(linkedItem) : ingredient.categoryId || 'uncategorized';
  const categoryName = linkedItem
    ? formatIngredientCategoryLabel(categoryId)
    : ingredient.categoryName || formatIngredientCategoryLabel(categoryId);
  const lastPurchaseRate = linkedItem
    ? getPurchaseItemLastPurchaseRate(linkedItem)
    : ingredient.lastPurchaseRate ?? ingredient.unitCost ?? ingredient.costPerUnit ?? 0;
  const lastPurchaseUnit = linkedItem
    ? getPurchaseItemPurchaseUnit(linkedItem)
    : ingredient.lastPurchaseUnit || baseUnitId;

  return {
    ...ingredient,
    itemId: resolvedItemId,
    purchaseItemId: resolvedItemId,
    itemName,
    purchaseItemName: itemName,
    categoryId,
    categoryName,
    entryQuantity,
    entryUnitId,
    requiredQuantity: entryQuantity,
    quantity: entryQuantity,
    baseQuantity: resolvedBaseQuantity,
    scaledEntryQuantity,
    scaledBaseQuantity,
    baseUnitId,
    unit: entryUnitId,
    lastPurchaseRate,
    lastPurchaseUnit,
    unitCost,
    costPerUnit: unitCost,
    wastagePercentage,
    netQuantity,
    totalCost,
  };
};

const CollapsibleFormSection = ({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <section className="rounded border border-slate-200 bg-white">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-700"
    >
      {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
      {title}
    </button>
    {open ? <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2">{children}</div> : null}
  </section>
);

export function RecipeCosting({
  userName,
  dishes,
  recipes,
  purchaseItems,
  units,
  menuPackages,
  onDishesChange,
  onRecipesChange,
  onMenuPackagesChange,
}: RecipeCostingProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [recipePresenceFilter, setRecipePresenceFilter] = useState<RecipePresenceFilter>('all');
  const [productionTypeFilter, setProductionTypeFilter] = useState<ProductionTypeFilter>('all');
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [kitchenSectionFilter, setKitchenSectionFilter] = useState('all');
  const [recipeTypeFilter, setRecipeTypeFilter] = useState<'all' | RecipeType>('all');
  const [recipeStateFilter, setRecipeStateFilter] = useState<RecipeStateFilter>('all');
  const [costingStatusFilter, setCostingStatusFilter] = useState<CostingStatusFilter>('all');
  const [yieldUnitFilter, setYieldUnitFilter] = useState('all');
  const [foodCostBandFilter, setFoodCostBandFilter] = useState<FoodCostBandFilter>('all');
  const [marginFilter, setMarginFilter] = useState<MarginFilter>('all');
  const [missingConfigFilter, setMissingConfigFilter] = useState<MissingConfigFilter>('all');
  const [sortKey, setSortKey] = useState<RegisterSortKey>('severity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [recipeActiveTab, setRecipeActiveTab] = useState<RecipeDialogTab>('ingredients');
  const [recipeHeaderOpen, setRecipeHeaderOpen] = useState(false);
  const [yieldSetupOpen, setYieldSetupOpen] = useState(false);
  const [ingredientsOpen, setIngredientsOpen] = useState(true);
  const [preparationNotesOpen, setPreparationNotesOpen] = useState(false);

  const [recipeName, setRecipeName] = useState('');
  const [recipeCode, setRecipeCode] = useState('');
  const [recipeType, setRecipeType] = useState<RecipeType>('menu-recipe');
  const [recipeCategoryId, setRecipeCategoryId] = useState('');
  const [kitchenSectionId, setKitchenSectionId] = useState('');
  const [recipeStatus, setRecipeStatus] = useState<RecipeStatus>('active');
  const [yieldQuantity, setYieldQuantity] = useState(1);
  const [yieldUnitId, setYieldUnitId] = useState<MeasurementUnit>('kg');
  const [preparationTimeMinutes, setPreparationTimeMinutes] = useState(30);
  const [wastageEnabled, setWastageEnabled] = useState(false);
  const [expectedWastagePercentage, setExpectedWastagePercentage] = useState(0);
  const [preparationSteps, setPreparationSteps] = useState('');
  const [sellingPricePerYieldUnit, setSellingPricePerYieldUnit] = useState(0);
  const [commercialEditMode, setCommercialEditMode] = useState<CommercialEditMode>('price');
  const [targetMarginPerYieldUnit, setTargetMarginPerYieldUnit] = useState(0);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [recipeCostLines, setRecipeCostLines] = useState<RecipeCostLine[]>([]);
  const [draggedCostLineId, setDraggedCostLineId] = useState<string | null>(null);
  const [ingredientCategoryFilter, setIngredientCategoryFilter] = useState('');
  const [ingredientSearchTerm, setIngredientSearchTerm] = useState('');
  const [bulkIngredientPickerOpen, setBulkIngredientPickerOpen] = useState(false);
  const [selectedBulkIngredientIds, setSelectedBulkIngredientIds] = useState<string[]>([]);
  const [copySourceRecipeId, setCopySourceRecipeId] = useState('');
  const [copyOptions, setCopyOptions] = useState<RecipeCopyOptions>(defaultRecipeCopyOptions);
  const recipeDialogSourceSignatureRef = useRef<string | null>(null);
  const recipeDialogFormSignatureRef = useRef<string | null>(null);

  const activeKitchenItems = purchaseItems
    .filter(isActivePurchaseItem)
    .sort((left, right) => left.itemName.localeCompare(right.itemName));
  const activeIngredientItems = activeKitchenItems.filter(isRecipeIngredientEnabled);
  const outputItemOptions = activeKitchenItems.filter(isRecipeOutputEnabled);
  const isMenuRecipe = recipeType === 'menu-recipe';
  const outputSuggestionPool = outputItemOptions.length > 0 ? outputItemOptions : activeKitchenItems.filter(isLikelyProducedOutputItem);
  const suggestedOutputItem = selectedDish ? findSuggestedOutputItem(selectedDish.dishName || recipeName, outputSuggestionPool) : undefined;
  const yieldUnitOptions = getUnitsForUsage('yield', units);
  const resolvedYieldUnitOptions = ensureSelectedUnitOption(yieldUnitOptions, yieldUnitId);
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const normalizedIngredientSearch = ingredientSearchTerm.trim().toLowerCase();
  const recipeDialogFormSignature = useMemo(
    () =>
      serializeRecipeDialogState({
        recipeName,
        recipeCode,
        recipeType,
        recipeCategoryId,
        kitchenSectionId,
        recipeStatus,
        yieldQuantity,
        yieldUnitId,
        preparationTimeMinutes,
        wastageEnabled,
        expectedWastagePercentage,
        preparationSteps,
        sellingPricePerYieldUnit,
        commercialEditMode,
        targetMarginPerYieldUnit,
        recipeIngredients: recipeIngredients.map((ingredient) => ({
          id: ingredient.id,
          itemId: ingredient.itemId || ingredient.purchaseItemId || '',
          itemName: ingredient.itemName || ingredient.purchaseItemName || '',
          entryQuantity: ingredient.entryQuantity ?? ingredient.requiredQuantity ?? ingredient.quantity ?? 0,
          entryUnitId: ingredient.entryUnitId || ingredient.unit || '',
          baseQuantity: ingredient.baseQuantity ?? 0,
          baseUnitId: ingredient.baseUnitId || '',
          unitCost: ingredient.unitCost ?? ingredient.costPerUnit ?? 0,
          wastagePercentage: ingredient.wastagePercentage ?? 0,
        })),
        recipeCostLines: recipeCostLines.map((line) => ({
          id: line.id,
          category: line.category,
          name: line.name,
          calculationBasis: line.calculationBasis,
          rate: line.rate,
          quantity: line.quantity,
          capacityQuantity: line.capacityQuantity ?? null,
          unit: line.unit || '',
          ingredientReferenceId: line.ingredientReferenceId || '',
          sortOrder: line.sortOrder ?? null,
        })),
      }),
    [
      expectedWastagePercentage,
      kitchenSectionId,
      preparationSteps,
      preparationTimeMinutes,
      recipeCategoryId,
      recipeCode,
      recipeCostLines,
      recipeIngredients,
      recipeName,
      recipeStatus,
      recipeType,
      commercialEditMode,
      sellingPricePerYieldUnit,
      targetMarginPerYieldUnit,
      wastageEnabled,
      yieldQuantity,
      yieldUnitId,
    ],
  );
  const resetRegisterFilters = (options?: { clearSearch?: boolean }) => {
    if (options?.clearSearch) {
      setSearchTerm('');
    }
    setRecipePresenceFilter('all');
    setProductionTypeFilter('all');
    setCuisineFilter('all');
    setKitchenSectionFilter('all');
    setRecipeTypeFilter('all');
    setRecipeStateFilter('all');
    setCostingStatusFilter('all');
    setYieldUnitFilter('all');
    setFoodCostBandFilter('all');
    setMarginFilter('all');
    setMissingConfigFilter('all');
  };
  const applyRegisterFilterPreset = (
    preset: Partial<{
      recipePresenceFilter: RecipePresenceFilter;
      productionTypeFilter: ProductionTypeFilter;
      recipeStateFilter: RecipeStateFilter;
      costingStatusFilter: CostingStatusFilter;
      foodCostBandFilter: FoodCostBandFilter;
      missingConfigFilter: MissingConfigFilter;
    }>,
  ) => {
    resetRegisterFilters();
    if (preset.recipePresenceFilter) {
      setRecipePresenceFilter(preset.recipePresenceFilter);
    }
    if (preset.productionTypeFilter) {
      setProductionTypeFilter(preset.productionTypeFilter);
    }
    if (preset.recipeStateFilter) {
      setRecipeStateFilter(preset.recipeStateFilter);
    }
    if (preset.costingStatusFilter) {
      setCostingStatusFilter(preset.costingStatusFilter);
    }
    if (preset.foodCostBandFilter) {
      setFoodCostBandFilter(preset.foodCostBandFilter);
    }
    if (preset.missingConfigFilter) {
      setMissingConfigFilter(preset.missingConfigFilter);
    }
  };
  const ingredientCategoryOptions = Array.from(
    activeIngredientItems.reduce((categoryMap, item) => {
      const categoryKey = getIngredientCategoryKey(item);
      if (!categoryMap.has(categoryKey)) {
        categoryMap.set(categoryKey, formatIngredientCategoryLabel(categoryKey));
      }
      return categoryMap;
    }, new Map<string, string>()),
  ).sort((left, right) => left[1].localeCompare(right[1]));
  const filteredKitchenItems = activeIngredientItems.filter((item) => {
    const matchesCategory = !ingredientCategoryFilter || getIngredientCategoryKey(item) === ingredientCategoryFilter;
    const matchesSearch =
      !normalizedIngredientSearch ||
      item.itemName.toLowerCase().includes(normalizedIngredientSearch) ||
      (item.itemCode || '').toLowerCase().includes(normalizedIngredientSearch);

    return matchesCategory && matchesSearch;
  });
  const getIngredientOptionsForRow = (selectedItemId?: string) => {
    if (!selectedItemId || filteredKitchenItems.some((item) => item.id === selectedItemId)) {
      return filteredKitchenItems;
    }

    const selectedItem = activeKitchenItems.find((item) => item.id === selectedItemId);
    return selectedItem && isRecipeIngredientEnabled(selectedItem) ? [selectedItem, ...filteredKitchenItems] : filteredKitchenItems;
  };
  const getRecipeCostReferenceOptions = (selectedReferenceId?: string) => {
    const resolvedReferenceId = resolveRecipeCostReferenceId(selectedReferenceId, standardRecipeIngredients, purchaseItems);
    if (!resolvedReferenceId || activeKitchenItems.some((item) => item.id === resolvedReferenceId)) {
      return activeKitchenItems;
    }

    const selectedItem = purchaseItems.find((item) => item.id === resolvedReferenceId);
    return selectedItem ? [selectedItem, ...activeKitchenItems] : activeKitchenItems;
  };
  const selectedIngredientItemIds = new Set(recipeIngredients.map((ingredient) => ingredient.itemId || ingredient.purchaseItemId));
  const bulkIngredientOptions = filteredKitchenItems.filter((item) => !selectedIngredientItemIds.has(item.id));
  const selectedBulkIngredientSet = new Set(selectedBulkIngredientIds);
  const allVisibleBulkIngredientsSelected =
    bulkIngredientOptions.length > 0 && bulkIngredientOptions.every((item) => selectedBulkIngredientSet.has(item.id));

  const getLinkedRecipe = (dish: Dish) => {
    const recipeById = dish.recipeId ? recipesById.get(dish.recipeId) : undefined;
    return recipeById || recipes.find((recipe) => recipe.dishId === dish.id);
  };
  const serializeRecipeIngredientsForDialog = (ingredients: RecipeIngredient[]) =>
    ingredients.map((ingredient) => ({
      id: ingredient.id,
      itemId: ingredient.itemId || ingredient.purchaseItemId || '',
      itemName: ingredient.itemName || ingredient.purchaseItemName || '',
      entryQuantity: ingredient.entryQuantity ?? ingredient.requiredQuantity ?? ingredient.quantity ?? 0,
      entryUnitId: ingredient.entryUnitId || ingredient.unit || '',
      baseQuantity: ingredient.baseQuantity ?? 0,
      baseUnitId: ingredient.baseUnitId || '',
      unitCost: ingredient.unitCost ?? ingredient.costPerUnit ?? 0,
      wastagePercentage: ingredient.wastagePercentage ?? 0,
    }));
  const serializeRecipeCostLinesForDialog = (lines: RecipeCostLine[]) =>
    lines.map((line) => ({
      id: line.id,
      category: line.category,
      name: line.name,
      calculationBasis: line.calculationBasis,
      rate: line.rate,
      quantity: line.quantity,
      capacityQuantity: line.capacityQuantity ?? null,
      unit: line.unit || '',
      ingredientReferenceId: line.ingredientReferenceId || '',
      sortOrder: line.sortOrder ?? null,
    }));
  const buildRecipeDialogSnapshot = (dish: Dish) => {
    const existingRecipe = getLinkedRecipe(dish);
    const linkedPurchaseItem = getPrimaryLinkedPurchaseItem(dish, purchaseItems);
    const resolvedYieldUnitId = resolveRecipeYieldUnitId({
      dish,
      recipe: existingRecipe,
      linkedPurchaseItem,
    });
    const standardCostSnapshot = getRecipeStandardCostSnapshot(existingRecipe);
    const normalizedIngredients = resolveDishProductionType(dish) !== 'purchased-ready' && existingRecipe?.ingredients?.length
      ? sortIngredientsByCategoryAndCost(
          existingRecipe.ingredients.map((ingredient) => normalizeIngredient(ingredient, purchaseItems, units)),
          purchaseItems,
        )
      : [];
    const hasExistingWastage =
      (existingRecipe?.expectedWastagePercentage ?? 0) > 0 ||
      normalizedIngredients.some((ingredient) => (ingredient.wastagePercentage || 0) > 0);
    const selectedDishSnapshot = existingRecipe ? { ...dish, hasRecipe: true, recipeId: existingRecipe.id } : dish;
    const normalizedCostLines = existingRecipe?.additionalCostLines?.length
      ? existingRecipe.additionalCostLines.map((line) =>
          standardizeRecipeCostLine(
            line,
            standardCostSnapshot.standardYieldQuantity,
            normalizedIngredients,
            resolvedYieldUnitId,
            units,
            purchaseItems,
          ),
        )
      : [];

    return {
      selectedDishSnapshot,
      hasExistingRecipe: Boolean(existingRecipe),
      productionType: resolveDishProductionType(selectedDishSnapshot),
      hasExistingWastage,
      recipeName: existingRecipe?.recipeName || dish.dishName,
      recipeCode: existingRecipe?.recipeCode || generateRecipeCode(recipes),
      recipeType: existingRecipe?.recipeType || 'menu-recipe',
      recipeCategoryId: existingRecipe?.recipeCategoryId || '',
      kitchenSectionId: existingRecipe?.kitchenSectionId || '',
      recipeStatus: existingRecipe?.status || 'active',
      yieldQuantity: existingRecipe?.yieldQuantity ?? existingRecipe?.yields ?? 1,
      yieldUnitId: resolvedYieldUnitId,
      preparationTimeMinutes: existingRecipe?.preparationTimeMinutes ?? existingRecipe?.preparationTime ?? 30,
      expectedWastagePercentage: existingRecipe?.expectedWastagePercentage ?? 0,
      preparationSteps: existingRecipe?.preparationSteps || '',
      sellingPricePerYieldUnit: standardCostSnapshot.sellingPricePerYieldUnit,
      commercialEditMode: resolveDishProductionType(selectedDishSnapshot) === 'purchased-ready' ? 'margin' : 'price',
      targetMarginPerYieldUnit: standardCostSnapshot.marginPerYieldUnit,
      recipeIngredients: normalizedIngredients,
      recipeCostLines: normalizedCostLines,
    };
  };
  const getRecipeDialogSourceSignature = (dish: Dish) => {
    const snapshot = buildRecipeDialogSnapshot(dish);
    return serializeRecipeDialogState({
      dish: {
        id: snapshot.selectedDishSnapshot.id,
        recipeId: snapshot.selectedDishSnapshot.recipeId || '',
        hasRecipe: Boolean(snapshot.selectedDishSnapshot.hasRecipe),
        productionType: snapshot.selectedDishSnapshot.productionType || '',
        resaleProfile: snapshot.selectedDishSnapshot.resaleProfile || null,
        sourceType: snapshot.selectedDishSnapshot.sourceType || '',
        updatedAt: snapshot.selectedDishSnapshot.updatedAt || null,
      },
      recipeName: snapshot.recipeName,
      recipeCode: snapshot.recipeCode,
      recipeType: snapshot.recipeType,
      recipeCategoryId: snapshot.recipeCategoryId,
      kitchenSectionId: snapshot.kitchenSectionId,
      recipeStatus: snapshot.recipeStatus,
      productionType: snapshot.productionType,
      yieldQuantity: snapshot.yieldQuantity,
      yieldUnitId: snapshot.yieldUnitId,
      preparationTimeMinutes: snapshot.preparationTimeMinutes,
      hasExistingWastage: snapshot.hasExistingWastage,
      expectedWastagePercentage: snapshot.expectedWastagePercentage,
      preparationSteps: snapshot.preparationSteps,
      sellingPricePerYieldUnit: snapshot.sellingPricePerYieldUnit,
      commercialEditMode: snapshot.commercialEditMode,
      targetMarginPerYieldUnit: snapshot.targetMarginPerYieldUnit,
      recipeIngredients: serializeRecipeIngredientsForDialog(snapshot.recipeIngredients),
      recipeCostLines: serializeRecipeCostLinesForDialog(snapshot.recipeCostLines),
    });
  };
  const applyRecipeDialogSnapshot = (
    dish: Dish,
    options?: {
      resetUi?: boolean;
      viewMode?: boolean;
      openDialog?: boolean;
    },
  ) => {
    const snapshot = buildRecipeDialogSnapshot(dish);
    const isPurchasedReadySnapshot = snapshot.productionType === 'purchased-ready';

    setSelectedDish(snapshot.selectedDishSnapshot);
    if (typeof options?.viewMode === 'boolean') {
      setViewMode(options.viewMode);
    }
    if (options?.resetUi) {
      setRecipeActiveTab(isPurchasedReadySnapshot ? 'costing' : 'ingredients');
      setRecipeHeaderOpen(!isPurchasedReadySnapshot && !snapshot.hasExistingRecipe);
      setYieldSetupOpen(!isPurchasedReadySnapshot && !snapshot.hasExistingRecipe);
      setIngredientsOpen(!isPurchasedReadySnapshot);
      setPreparationNotesOpen(Boolean(snapshot.preparationSteps));
      setIngredientCategoryFilter('');
      setIngredientSearchTerm('');
      setBulkIngredientPickerOpen(false);
      setSelectedBulkIngredientIds([]);
      setCopySourceRecipeId('');
      setCopyOptions(defaultRecipeCopyOptions);
    }

    setRecipeName(snapshot.recipeName);
    setRecipeCode(snapshot.recipeCode);
    setRecipeType(snapshot.recipeType);
    setRecipeCategoryId(snapshot.recipeCategoryId);
    setKitchenSectionId(snapshot.kitchenSectionId);
    setRecipeStatus(snapshot.recipeStatus);
    setYieldQuantity(snapshot.yieldQuantity);
    setYieldUnitId(snapshot.yieldUnitId);
    setPreparationTimeMinutes(snapshot.preparationTimeMinutes);
    setWastageEnabled(snapshot.hasExistingWastage);
    setExpectedWastagePercentage(snapshot.expectedWastagePercentage);
    setPreparationSteps(snapshot.preparationSteps);
    setSellingPricePerYieldUnit(snapshot.sellingPricePerYieldUnit);
    setCommercialEditMode(snapshot.commercialEditMode);
    setTargetMarginPerYieldUnit(snapshot.targetMarginPerYieldUnit);
    setRecipeIngredients(snapshot.recipeIngredients);
    setRecipeCostLines(snapshot.recipeCostLines);

    if (options?.openDialog) {
      setDialogOpen(true);
    }

    recipeDialogSourceSignatureRef.current = getRecipeDialogSourceSignature(dish);
    recipeDialogFormSignatureRef.current = serializeRecipeDialogState({
      recipeName: snapshot.recipeName,
      recipeCode: snapshot.recipeCode,
      recipeType: snapshot.recipeType,
      recipeCategoryId: snapshot.recipeCategoryId,
      kitchenSectionId: snapshot.kitchenSectionId,
      recipeStatus: snapshot.recipeStatus,
      yieldQuantity: snapshot.yieldQuantity,
      yieldUnitId: snapshot.yieldUnitId,
      preparationTimeMinutes: snapshot.preparationTimeMinutes,
      wastageEnabled: snapshot.hasExistingWastage,
      expectedWastagePercentage: snapshot.expectedWastagePercentage,
      preparationSteps: snapshot.preparationSteps,
      sellingPricePerYieldUnit: snapshot.sellingPricePerYieldUnit,
      commercialEditMode: snapshot.commercialEditMode,
      targetMarginPerYieldUnit: snapshot.targetMarginPerYieldUnit,
      recipeIngredients: serializeRecipeIngredientsForDialog(snapshot.recipeIngredients),
      recipeCostLines: serializeRecipeCostLinesForDialog(snapshot.recipeCostLines),
    });
  };
  const allBanquetMenuItems = useMemo(
    () =>
      dishes
        .filter((dish) => dish.module === 'banquet')
        .map((dish) => {
          const productionType = resolveDishProductionType(dish);
          const recipe = getLinkedRecipe(dish);
          const linkedPurchaseItemId = dish.resaleProfile?.linkedPurchaseItemIds?.[0];
          const linkedPurchaseItem = linkedPurchaseItemId
            ? purchaseItems.find((item) => item.id === linkedPurchaseItemId)
            : undefined;
          const defaultVariant =
            getDefaultSalesVariant(dish) ||
            buildFallbackSalesVariant(dish, recipe?.costPerYieldUnit ?? recipe?.costPerPortion ?? dish.defaultVariantCost ?? 0);
          const standardCostSnapshot = getRecipeStandardCostSnapshot(recipe);
          const purchasedReadyYieldUnit = resolveRecipeYieldUnitId({
            dish,
            recipe,
            linkedPurchaseItem,
          });
          const purchasedReadyRecipeCost = recipe?.costPerYieldUnit ?? standardCostSnapshot.standardCostPerYieldUnit;
          const purchasedReadyRecipePrice =
            recipe?.supplySellingPricePerYieldUnit ?? recipe?.suggestedSellingPrice ?? 0;
          const purchasedReadyRecipeMargin =
            recipe?.supplyMarginPerYieldUnit ??
            (purchasedReadyRecipePrice > 0 ? purchasedReadyRecipePrice - purchasedReadyRecipeCost : undefined);
          const purchasedReadyRecipeFoodCost = recipe?.supplyFoodCostPercentage ?? recipe?.foodCostPercentage;
          const standardYieldQuantity = standardCostSnapshot.standardYieldQuantity;
          const standardYieldUnit = standardCostSnapshot.standardYieldUnit;
          const standardDishCost = standardCostSnapshot.standardDishCost;
          const ingredientCost = standardCostSnapshot.ingredientCost;
          const laborCost = standardCostSnapshot.laborCost;
          const utilityCost = standardCostSnapshot.utilityFuelCost;
          const packagingCost = standardCostSnapshot.packagingConsumableCost;
          const otherProductionCost = standardCostSnapshot.otherProductionCost;
          const wastageCost = standardCostSnapshot.wastageCost;
          const purchasedUnitCost = linkedPurchaseItem ? getPurchaseItemUnitCost(linkedPurchaseItem, units) : 0;
          const variantCost =
            defaultVariant?.estimatedCost ?? dish.defaultVariantCost ?? dish.estimatedCost ?? 0;
          const variantPrice =
            defaultVariant?.sellingPrice ?? dish.defaultSellingPrice ?? dish.sellingPrice ?? 0;
          const serviceDefaultCost = dish.outsourceProfile?.defaultCost ?? variantCost;
          const costPerUnit =
            productionType === 'recipe-based'
              ? standardCostSnapshot.standardCostPerYieldUnit
              : productionType === 'purchased-ready'
                ? purchasedReadyRecipeCost || variantCost || purchasedUnitCost
                : serviceDefaultCost;
          const supplyPricePerUnit =
            productionType === 'recipe-based'
              ? standardCostSnapshot.sellingPricePerYieldUnit || recipe?.supplySellingPricePerYieldUnit || variantPrice
              : productionType === 'purchased-ready'
                ? purchasedReadyRecipePrice || variantPrice
                : variantPrice;
          const marginPerUnit =
            productionType === 'recipe-based'
              ? standardCostSnapshot.marginPerYieldUnit
              : productionType === 'purchased-ready' && typeof purchasedReadyRecipeMargin === 'number'
                ? purchasedReadyRecipeMargin
              : dish.grossMargin ?? (supplyPricePerUnit - costPerUnit);
          const foodCostPercentage =
            productionType === 'recipe-based'
              ? standardCostSnapshot.foodCostPercentage
              : productionType === 'purchased-ready' && typeof purchasedReadyRecipeFoodCost === 'number'
                ? purchasedReadyRecipeFoodCost
              : dish.foodCostPercentage ?? (supplyPricePerUnit > 0 ? (costPerUnit / supplyPricePerUnit) * 100 : 0);
          const marginPercentage =
            productionType === 'recipe-based'
              ? standardCostSnapshot.marginPercentage
              : supplyPricePerUnit > 0 ? (marginPerUnit / supplyPricePerUnit) * 100 : 0;
          const recipeState: Exclude<RecipeStateFilter, 'all'> =
            productionType !== 'recipe-based'
              ? 'not-required'
              : !recipe
                ? 'missing-recipe'
                : recipe.status === 'inactive'
                  ? 'inactive'
                  : 'active';
          const costUnit =
            productionType === 'recipe-based'
              ? standardYieldUnit || 'unit'
              : productionType === 'purchased-ready'
                ? purchasedReadyYieldUnit
              : defaultVariant?.salesUnit || defaultVariant?.salesUnitId || dish.unitOfSale || 'unit';
          const outputOrLinkedItem =
            productionType === 'recipe-based'
              ? getRecipeOutputItemName(recipe, purchaseItems)
              : productionType === 'purchased-ready'
                ? linkedPurchaseItem?.itemName || 'Not linked'
                : dish.outsourceProfile?.vendorName || 'Outside Service';
          const missingIngredients = productionType === 'recipe-based' && recipeState !== 'missing-recipe' && ingredientCost <= 0;
          const missingLabor = productionType === 'recipe-based' && recipeState !== 'missing-recipe' && laborCost <= 0;
          const missingUtility = productionType === 'recipe-based' && recipeState !== 'missing-recipe' && utilityCost <= 0;
          const missingSupplyPrice = supplyPricePerUnit <= 0;
          const missingCategory = !(dish.categoryId || dish.category);
          const missingKitchenSection = !(dish.kitchenStationId || dish.preparationArea);
          const missingCostLink =
            (productionType === 'purchased-ready' && !linkedPurchaseItemId) ||
            (productionType === 'service-item' && serviceDefaultCost <= 0);
          const costingStatus: CostingStatusKey =
            productionType === 'recipe-based' && recipeState === 'missing-recipe'
              ? 'missing-recipe'
              : missingIngredients || missingLabor || missingUtility || missingSupplyPrice || missingCostLink
                ? 'missing-cost'
                : supplyPricePerUnit > 0 && supplyPricePerUnit < costPerUnit
                  ? 'loss-making'
                  : supplyPricePerUnit > 0 && Math.abs(supplyPricePerUnit - costPerUnit) < 0.0001
                    ? 'zero-margin'
                    : foodCostPercentage > COSTING_FOOD_COST_THRESHOLD
                      ? 'low-margin'
                      : 'profitable';

          return {
            id: dish.id,
            dish,
            recipe,
            linkedPurchaseItem,
            productionType,
            productionTypeLabel: getProductionTypeLabel(productionType),
            recipeState,
            recipeCode: getRecipeCode(recipe),
            recipeType: recipe ? getRecipeTypeLabel(recipe.recipeType || 'menu-recipe') : '-',
            outputOrLinkedItem,
            standardYieldQuantity,
            standardYieldUnit,
            standardDishCost,
            ingredientCost,
            laborCost,
            utilityCost,
            packagingCost,
            otherProductionCost,
            wastageCost,
            costPerUnit,
            supplyPricePerUnit,
            marginPerUnit,
            foodCostPercentage,
            marginPercentage,
            costingStatus,
            costUnit,
            missingIngredients,
            missingLabor,
            missingUtility,
            missingSupplyPrice,
            missingCategory,
            missingKitchenSection,
            missingCostLink,
            statusSeverity:
              costingStatus === 'missing-recipe'
                ? 6
                : costingStatus === 'missing-cost'
                  ? 5
                  : costingStatus === 'loss-making'
                    ? 4
                    : costingStatus === 'zero-margin'
                      ? 3
                      : costingStatus === 'low-margin'
                        ? 2
                        : 1,
          };
        }),
    [dishes, purchaseItems, recipes, units],
  );

  const cuisineFilterOptions = useMemo(
    () =>
      Array.from(new Map(allBanquetMenuItems.map((row) => [row.dish.cuisineId, row.dish.cuisineName])).entries()).sort((left, right) =>
        left[1].localeCompare(right[1]),
      ),
    [allBanquetMenuItems],
  );

  const kitchenSectionFilterOptions = useMemo(
    () =>
      Array.from(
        new Map(
          allBanquetMenuItems.map((row) => [
            row.dish.kitchenStationId || row.dish.preparationArea,
            String(row.dish.kitchenStationId || row.dish.preparationArea || '-').replace(/-/g, ' '),
          ]),
        ).entries(),
      ).sort((left, right) => left[1].localeCompare(right[1])),
    [allBanquetMenuItems],
  );

  const costUnitFilterOptions = useMemo(
    () =>
      Array.from(new Set(allBanquetMenuItems.map((row) => row.costUnit).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right),
      ),
    [allBanquetMenuItems],
  );

  const filteredRows = useMemo(() => {
    const rows = allBanquetMenuItems.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        row.dish.dishName.toLowerCase().includes(normalizedSearch) ||
        row.dish.cuisineName.toLowerCase().includes(normalizedSearch) ||
        row.recipeCode.toLowerCase().includes(normalizedSearch) ||
        row.outputOrLinkedItem.toLowerCase().includes(normalizedSearch) ||
        row.productionTypeLabel.toLowerCase().includes(normalizedSearch);
      const matchesRecipePresence =
        recipePresenceFilter === 'all' ||
        (recipePresenceFilter === 'with-recipe' && Boolean(row.recipe)) ||
        (recipePresenceFilter === 'without-recipe' && !row.recipe);
      const matchesProductionType = productionTypeFilter === 'all' || row.productionType === productionTypeFilter;
      const matchesCuisine = cuisineFilter === 'all' || row.dish.cuisineId === cuisineFilter;
      const matchesKitchenSection =
        kitchenSectionFilter === 'all' || (row.dish.kitchenStationId || row.dish.preparationArea) === kitchenSectionFilter;
      const matchesRecipeType = recipeTypeFilter === 'all' || (row.recipe?.recipeType || 'menu-recipe') === recipeTypeFilter;
      const matchesRecipeState = recipeStateFilter === 'all' || row.recipeState === recipeStateFilter;
      const matchesCostingStatus = costingStatusFilter === 'all' || row.costingStatus === costingStatusFilter;
      const matchesYieldUnit = yieldUnitFilter === 'all' || row.costUnit === yieldUnitFilter;
      const matchesFoodCostBand =
        foodCostBandFilter === 'all' ||
        (foodCostBandFilter === 'below-30' && row.foodCostPercentage < 30) ||
        (foodCostBandFilter === '30-40' && row.foodCostPercentage >= 30 && row.foodCostPercentage < 40) ||
        (foodCostBandFilter === '40-50' && row.foodCostPercentage >= 40 && row.foodCostPercentage <= 50) ||
        (foodCostBandFilter === 'above-50' && row.foodCostPercentage > 50);
      const matchesMargin =
        marginFilter === 'all' ||
        (marginFilter === 'positive' && row.marginPerUnit > 0) ||
        (marginFilter === 'zero' && Math.abs(row.marginPerUnit) < 0.0001) ||
        (marginFilter === 'negative' && row.marginPerUnit < 0);
      const matchesMissingConfig =
        missingConfigFilter === 'all' ||
        (missingConfigFilter === 'missing-ingredients' && row.missingIngredients) ||
        (missingConfigFilter === 'missing-labor-or-utility' && (row.missingLabor || row.missingUtility)) ||
        (missingConfigFilter === 'missing-labor' && row.missingLabor) ||
        (missingConfigFilter === 'missing-utility' && row.missingUtility) ||
        (missingConfigFilter === 'missing-supply-price' && row.missingSupplyPrice) ||
        (missingConfigFilter === 'missing-category' && row.missingCategory) ||
        (missingConfigFilter === 'missing-kitchen-section' && row.missingKitchenSection) ||
        (missingConfigFilter === 'missing-cost-link' && row.missingCostLink);

      return (
        matchesSearch &&
        matchesRecipePresence &&
        matchesProductionType &&
        matchesCuisine &&
        matchesKitchenSection &&
        matchesRecipeType &&
        matchesRecipeState &&
        matchesCostingStatus &&
        matchesYieldUnit &&
        matchesFoodCostBand &&
        matchesMargin &&
        matchesMissingConfig
      );
    });

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...rows].sort((left, right) => {
      if (sortKey === 'severity') {
        return (left.statusSeverity - right.statusSeverity) * direction || left.dish.dishName.localeCompare(right.dish.dishName);
      }
      if (sortKey === 'dish') {
        return left.dish.dishName.localeCompare(right.dish.dishName) * direction;
      }
      if (sortKey === 'standard-dish-cost') {
        return (left.standardDishCost - right.standardDishCost) * direction;
      }
      if (sortKey === 'cost-per-unit') {
        return (left.costPerUnit - right.costPerUnit) * direction;
      }
      if (sortKey === 'selling-price') {
        return (left.supplyPricePerUnit - right.supplyPricePerUnit) * direction;
      }
      if (sortKey === 'margin') {
        return (left.marginPerUnit - right.marginPerUnit) * direction;
      }
      if (sortKey === 'food-cost') {
        return (left.foodCostPercentage - right.foodCostPercentage) * direction;
      }
      if (sortKey === 'margin-percent') {
        return (left.marginPercentage - right.marginPercentage) * direction;
      }
      return left.dish.dishName.localeCompare(right.dish.dishName);
    });
  }, [
    allBanquetMenuItems,
    normalizedSearch,
    recipePresenceFilter,
    productionTypeFilter,
    cuisineFilter,
    kitchenSectionFilter,
    recipeTypeFilter,
    recipeStateFilter,
    costingStatusFilter,
    yieldUnitFilter,
    foodCostBandFilter,
    marginFilter,
    missingConfigFilter,
    sortDirection,
    sortKey,
  ]);

  const registerMetrics = useMemo(() => {
    const recipeBasedCount = allBanquetMenuItems.filter((row) => row.productionType === 'recipe-based').length;
    const purchasedReadyCount = allBanquetMenuItems.filter((row) => row.productionType === 'purchased-ready').length;
    const serviceItemCount = allBanquetMenuItems.filter((row) => row.productionType === 'service-item').length;
    const withRecipeCount = allBanquetMenuItems.filter((row) => Boolean(row.recipe)).length;
    const withoutRecipeCount = allBanquetMenuItems.filter((row) => row.recipeState === 'missing-recipe').length;
    const activeRecipesCount = allBanquetMenuItems.filter((row) => row.recipeState === 'active').length;
    const inactiveRecipesCount = allBanquetMenuItems.filter((row) => row.recipeState === 'inactive').length;
    const avgFoodCostSource = allBanquetMenuItems.filter((row) => row.supplyPricePerUnit > 0 && Number.isFinite(row.foodCostPercentage));
    const avgFoodCost =
      avgFoodCostSource.length > 0
        ? avgFoodCostSource.reduce((sum, row) => sum + row.foodCostPercentage, 0) / avgFoodCostSource.length
        : 0;

    return {
      totalMenuItems: allBanquetMenuItems.length,
      recipeBasedCount,
      purchasedReadyCount,
      serviceItemCount,
      withRecipeCount,
      withoutRecipeCount,
      activeRecipesCount,
      inactiveRecipesCount,
      avgFoodCost,
      highFoodCostCount: allBanquetMenuItems.filter((row) => row.foodCostPercentage > COSTING_FOOD_COST_THRESHOLD).length,
      zeroMarginCount: allBanquetMenuItems.filter((row) => row.costingStatus === 'zero-margin').length,
      lossMakingCount: allBanquetMenuItems.filter((row) => row.costingStatus === 'loss-making').length,
      missingSupplyPriceCount: allBanquetMenuItems.filter((row) => row.missingSupplyPrice).length,
      missingIngredientCostCount: allBanquetMenuItems.filter((row) => row.missingIngredients).length,
      missingLaborUtilityCount: allBanquetMenuItems.filter((row) => row.missingLabor || row.missingUtility).length,
      missingCostLinkCount: allBanquetMenuItems.filter((row) => row.missingCostLink).length,
    };
  }, [allBanquetMenuItems]);

  const mismatchedLinkedRecipeDishes = allBanquetMenuItems
    .filter((row) => row.productionType === 'recipe-based')
    .map((row) => ({ dish: row.dish, recipe: row.recipe }))
    .filter(({ dish, recipe }) => recipe && (dish.recipeId !== recipe.id || dish.hasRecipe !== true));
  const currentRecipe = selectedDish ? getLinkedRecipe(selectedDish) : undefined;
  const copyableRecipes = recipes
    .filter((recipe) => recipe.id !== currentRecipe?.id)
    .sort((left, right) => (left.recipeName || '').localeCompare(right.recipeName || ''));
  const selectedCopyRecipe = copySourceRecipeId ? recipesById.get(copySourceRecipeId) : undefined;
  const selectedDishProductionType = selectedDish ? resolveDishProductionType(selectedDish) : 'recipe-based';
  const isPurchasedReadyDialog = selectedDishProductionType === 'purchased-ready';
  const isRecipeBasedDialog = selectedDishProductionType === 'recipe-based';
  const selectedLinkedPurchaseItem = selectedDish ? getPrimaryLinkedPurchaseItem(selectedDish, purchaseItems) : undefined;
  const selectedPurchasedReadyUnitCost = selectedLinkedPurchaseItem ? getPurchaseItemUnitCost(selectedLinkedPurchaseItem, units) : 0;

  const pricedRecipeIngredients = recipeIngredients.map((ingredient) =>
    syncIngredientRow(ingredient, purchaseItems, units, 1),
  );
  const standardRecipeIngredients = recipeIngredients.map((ingredient) => syncIngredientRow(ingredient, purchaseItems, units, 1));
  const standardIngredientBomCost = standardRecipeIngredients.reduce((sum, ingredient) => sum + (ingredient.totalCost || 0), 0);
  const standardWastageCost = wastageEnabled
    ? standardRecipeIngredients.reduce(
      (sum, ingredient) => sum + ((ingredient.baseQuantity || 0) * (ingredient.unitCost || 0) * ((ingredient.wastagePercentage || 0) / 100)),
      0,
    )
    : 0;
  const effectiveYieldQuantity = yieldQuantity > 0 ? yieldQuantity : 0;
  const sourceIngredientCost =
    selectedDishProductionType === 'purchased-ready'
      ? selectedPurchasedReadyUnitCost * effectiveYieldQuantity
      : standardIngredientBomCost;
  const sourceRecipeCostLines = recipeCostLines.map((line) =>
    standardizeRecipeCostLine(line, effectiveYieldQuantity, standardRecipeIngredients, yieldUnitId, units, purchaseItems),
  );
  const sourceLaborCost = sourceRecipeCostLines
    .filter((line) => line.category === 'labor')
    .reduce((sum, line) => sum + (line.totalCost || 0), 0);
  const sourceUtilitiesCost = sourceRecipeCostLines
    .filter((line) => line.category === 'utility')
    .reduce((sum, line) => sum + (line.totalCost || 0), 0);
  const sourcePackagingCost = sourceRecipeCostLines
    .filter((line) => line.category === 'packaging')
    .reduce((sum, line) => sum + (line.totalCost || 0), 0);
  const sourceOtherProductionCost = sourceRecipeCostLines
    .filter((line) => line.category === 'other')
    .reduce((sum, line) => sum + (line.totalCost || 0), 0);
  const sourceAdditionalCost =
    sourceLaborCost + sourceUtilitiesCost + sourcePackagingCost + sourceOtherProductionCost;
  const standardDishCostBeforeCommercial =
    sourceIngredientCost +
    sourceLaborCost +
    sourceUtilitiesCost +
    sourcePackagingCost +
    sourceOtherProductionCost +
    standardWastageCost;
  const costPerYieldUnitBeforeCommercial =
    effectiveYieldQuantity > 0 ? standardDishCostBeforeCommercial / effectiveYieldQuantity : 0;
  const resolvedSellingPricePerYieldUnit =
    isPurchasedReadyDialog && commercialEditMode === 'margin'
      ? costPerYieldUnitBeforeCommercial + targetMarginPerYieldUnit
      : sellingPricePerYieldUnit;
  const standardMetrics = calculateStandardRecipeMetrics({
    standardYieldQuantity: effectiveYieldQuantity,
    ingredientCost: sourceIngredientCost,
    laborCost: sourceLaborCost,
    utilityFuelCost: sourceUtilitiesCost,
    packagingConsumableCost: sourcePackagingCost,
    otherProductionCost: sourceOtherProductionCost,
    wastageCost: standardWastageCost,
    sellingPricePerYieldUnit: resolvedSellingPricePerYieldUnit,
  });
  const totalIngredientCost = standardMetrics.ingredientCost;
  const wastageCost = standardMetrics.wastageCost;
  const laborCost = standardMetrics.laborCost;
  const utilitiesCost = standardMetrics.utilityFuelCost;
  const packagingConsumableCost = standardMetrics.packagingConsumableCost;
  const otherProductionCost = standardMetrics.otherProductionCost;
  const additionalCost = laborCost + utilitiesCost + packagingConsumableCost + otherProductionCost;
  const laborCostLines = sourceRecipeCostLines.filter((line) => line.category === 'labor');
  const utilityCostLines = sourceRecipeCostLines.filter((line) => line.category === 'utility');
  const packagingCostLines = sourceRecipeCostLines.filter((line) => line.category === 'packaging');
  const otherProductionCostLines = sourceRecipeCostLines.filter((line) => line.category === 'other');
  const visibleProductionCostSummaries = [
    { key: 'labor', label: 'Labor', amount: laborCost, rows: laborCostLines },
    { key: 'utility', label: 'Utilities', amount: utilitiesCost, rows: utilityCostLines },
    { key: 'packaging', label: 'Packaging', amount: packagingConsumableCost, rows: packagingCostLines },
    { key: 'other', label: 'Other', amount: otherProductionCost, rows: otherProductionCostLines },
  ].filter((entry) => entry.rows.length > 0);
  const visibleProductionCostSections = [
    { key: 'labor', category: 'labor' as const, title: 'Labor Costs', rows: laborCostLines, total: laborCost },
    { key: 'utility', category: 'utility' as const, title: 'Utility Costs', rows: utilityCostLines, total: utilitiesCost },
    { key: 'packaging', category: 'packaging' as const, title: 'Packaging / Consumable Costs', rows: packagingCostLines, total: packagingConsumableCost },
    { key: 'other', category: 'other' as const, title: 'Other Production Costs', rows: otherProductionCostLines, total: otherProductionCost },
  ].filter((entry) => entry.rows.length > 0);
  const productionCostSummaryText =
    visibleProductionCostSummaries.length > 0
      ? visibleProductionCostSummaries.map((entry) => `${entry.label} ${formatCurrencyPKR(entry.amount)}`).join(' | ')
      : 'No add-ons';
  const totalRecipeCost = standardMetrics.standardDishCost;
  const costPerYieldUnit = standardMetrics.standardCostPerYieldUnit;
  const marginPerYieldUnit = standardMetrics.marginPerYieldUnit;
  const supplySellingPricePerYieldUnit = standardMetrics.sellingPricePerYieldUnit;
  const sellingPriceTotal = supplySellingPricePerYieldUnit * effectiveYieldQuantity;
  const totalMargin = sellingPriceTotal - totalRecipeCost;
  const foodCostPercentage = standardMetrics.foodCostPercentage;
  const marginPercentage = standardMetrics.marginPercentage;
  const yieldUnitLabel = formatUnitLabel(yieldUnitId, units) || yieldUnitId || 'unit';
  const formattedYieldQuantity = formatDisplayQuantity(effectiveYieldQuantity);
  const standardYieldSummary = `${formattedYieldQuantity} ${yieldUnitLabel}`;
  const selectedPurchaseCostUnitId = selectedLinkedPurchaseItem
    ? getBaseUnit(selectedLinkedPurchaseItem) || getPurchaseItemPurchaseUnit(selectedLinkedPurchaseItem)
    : yieldUnitId;
  const selectedPurchaseCostUnitLabel = formatUnitLabel(selectedPurchaseCostUnitId, units) || selectedPurchaseCostUnitId || yieldUnitLabel;
  const summaryAddOnRows = [
    { label: 'Wastage', amount: wastageCost },
    { label: 'Labor', amount: laborCost },
    { label: 'Utilities', amount: utilitiesCost },
    { label: 'Packaging', amount: packagingConsumableCost },
    { label: 'Other', amount: otherProductionCost },
    { label: 'Add-on Total', amount: additionalCost, emphasize: true },
  ];
  const dialogTitle = isPurchasedReadyDialog
    ? `${viewMode ? 'View Purchased Ready Costing' : currentRecipe ? 'Edit Purchased Ready Costing' : 'Create Purchased Ready Costing'}: ${selectedDish?.dishName || ''}`
    : `${viewMode ? 'View Recipe' : selectedDish?.hasRecipe ? 'Edit Recipe' : 'Create Recipe'}: ${selectedDish?.dishName || ''}`;
  const dialogSubtitle = isPurchasedReadyDialog
    ? 'Compact kitchen ERP cost and selling profile'
    : 'Compact kitchen ERP recipe / BOM';
  const ingredientSummaryLabel = isPurchasedReadyDialog ? 'Purchase Cost' : 'Ingredient Cost';
  const evaluationTabLabel = isPurchasedReadyDialog ? 'Commercial' : 'Evaluation';
  const costingTabLabel = isPurchasedReadyDialog ? 'Costing & Usage' : 'Labor & Utilities';
  const saveButtonLabel = isPurchasedReadyDialog ? 'Save Costing' : 'Save Recipe';
  const sortedEvaluationIngredientRows = [...pricedRecipeIngredients]
    .sort(
      (left, right) =>
        (right.totalCost || 0) - (left.totalCost || 0) ||
        compareIngredientsByCategoryAndCost(left, right, purchaseItems),
    )
    .map((ingredient, rank) => ({
      ingredient,
      rank: rank + 1,
      snapshot: getIngredientSnapshot(ingredient, purchaseItems),
      recipeShare: formatShare(ingredient.totalCost || 0, totalRecipeCost),
    }));
  const ingredientCategoryCostRows = Array.from(
    sortedEvaluationIngredientRows.reduce((categoryMap, row) => {
      const existing = categoryMap.get(row.snapshot.categoryId) || {
        categoryId: row.snapshot.categoryId,
        categoryName: row.snapshot.categoryName,
        ingredientCount: 0,
        cost: 0,
      };

      existing.ingredientCount += 1;
      existing.cost += row.ingredient.totalCost || 0;
      categoryMap.set(row.snapshot.categoryId, existing);
      return categoryMap;
    }, new Map<string, { categoryId: string; categoryName: string; ingredientCount: number; cost: number }>()),
  )
    .map(([, row]) => ({ ...row, recipeShare: formatShare(row.cost, totalRecipeCost) }))
    .sort((left, right) => right.cost - left.cost || left.categoryName.localeCompare(right.categoryName));
  const evaluationCostBreakdownRows = [
    { label: 'Ingredients', amount: totalIngredientCost },
    { label: 'Wastage', amount: wastageCost },
    { label: 'Labor', amount: laborCost },
    { label: 'Utilities', amount: utilitiesCost },
    { label: 'Packaging / Consumable', amount: packagingConsumableCost },
    { label: 'Other Production', amount: otherProductionCost },
  ];

  const openRecipeDialog = (dish: Dish, nextViewMode: boolean) => {
    applyRecipeDialogSnapshot(dish, { resetUi: true, viewMode: nextViewMode, openDialog: true });
  };

  useEffect(() => {
    if (!dialogOpen || !selectedDish) {
      return;
    }

    const latestDish = dishes.find((dish) => dish.id === selectedDish.id);
    if (!latestDish) {
      closeDialog();
      return;
    }

    const latestSourceSignature = getRecipeDialogSourceSignature(latestDish);
    const currentSourceSignature = recipeDialogSourceSignatureRef.current;
    const hasLocalChanges =
      recipeDialogFormSignatureRef.current !== null &&
      recipeDialogFormSignature !== null &&
      recipeDialogFormSignature !== recipeDialogFormSignatureRef.current;

    if (currentSourceSignature === latestSourceSignature) {
      return;
    }

    if (hasLocalChanges && !viewMode) {
      return;
    }

    applyRecipeDialogSnapshot(latestDish, { resetUi: false, viewMode });
  }, [dialogOpen, dishes, recipeDialogFormSignature, recipes, purchaseItems, selectedDish, units, viewMode]);

  const handleAddIngredient = () => {
    if (activeIngredientItems.length === 0) {
      toast.error('Enable at least one kitchen item for recipe ingredients first');
      return;
    }

    if (filteredKitchenItems.length === 0) {
      toast.error('No active ingredients match the current filter');
      return;
    }

    setRecipeIngredients((current) => {
      const selectedItemIds = new Set(current.map((ingredient) => ingredient.itemId || ingredient.purchaseItemId));
      const nextItem = filteredKitchenItems.find((item) => !selectedItemIds.has(item.id));

      if (!nextItem) {
        toast.error('All matching ingredients are already added');
        return current;
      }

      return [createIngredientRow(nextItem, units), ...current];
    });
  };

  const toggleBulkIngredientSelection = (itemId: string) => {
    setSelectedBulkIngredientIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
    );
  };

  const toggleVisibleBulkIngredients = () => {
    const visibleIds = bulkIngredientOptions.map((item) => item.id);
    setSelectedBulkIngredientIds((current) => {
      const currentSet = new Set(current);
      if (visibleIds.length > 0 && visibleIds.every((id) => currentSet.has(id))) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      visibleIds.forEach((id) => currentSet.add(id));
      return Array.from(currentSet);
    });
  };

  const handleAddSelectedIngredients = () => {
    const existingItemIds = new Set(recipeIngredients.map((ingredient) => ingredient.itemId || ingredient.purchaseItemId));
    const itemsToAdd = selectedBulkIngredientIds
      .map((itemId) => activeIngredientItems.find((item) => item.id === itemId))
      .filter((item): item is PurchaseItem => Boolean(item) && !existingItemIds.has(item.id));

    if (itemsToAdd.length === 0) {
      toast.info('Select at least one new ingredient');
      return;
    }

    setRecipeIngredients((current) => [...itemsToAdd.map((item) => createIngredientRow(item, units)), ...current]);
    setSelectedBulkIngredientIds((current) => current.filter((itemId) => !itemsToAdd.some((item) => item.id === itemId)));
    setIngredientsOpen(true);
    toast.success(`${itemsToAdd.length} ingredient${itemsToAdd.length === 1 ? '' : 's'} added`);
  };

  const toggleCopyOption = (option: keyof RecipeCopyOptions) => {
    setCopyOptions((current) => ({ ...current, [option]: !current[option] }));
  };

  const handleApplyRecipeCopy = () => {
    if (!selectedCopyRecipe) {
      toast.error('Select a recipe to copy from');
      return;
    }

    const selectedSections = Object.entries(copyOptions).filter(([, enabled]) => enabled);
    if (selectedSections.length === 0) {
      toast.error('Select at least one section to copy');
      return;
    }

    const replacingSections = [
      copyOptions.ingredients && recipeIngredients.length > 0 ? 'ingredients' : null,
      copyOptions.labor && laborCostLines.length > 0 ? 'labor costs' : null,
      copyOptions.utility && utilityCostLines.length > 0 ? 'utility costs' : null,
      copyOptions.packaging && packagingCostLines.length > 0 ? 'packaging costs' : null,
      copyOptions.other && otherProductionCostLines.length > 0 ? 'other production costs' : null,
      copyOptions.yieldSetup ? 'yield setup' : null,
      copyOptions.notes && preparationSteps.trim() ? 'preparation notes' : null,
    ].filter(Boolean);

    if (
      replacingSections.length > 0 &&
      typeof window !== 'undefined' &&
      !window.confirm(`Copying will replace ${replacingSections.join(', ')} in this editor. Continue?`)
    ) {
      return;
    }

    const now = Date.now();
    const sourceYieldQuantity = selectedCopyRecipe.yieldQuantity ?? selectedCopyRecipe.yields ?? 1;
    const sourceYieldUnitId = selectedCopyRecipe.yieldUnitId || selectedCopyRecipe.yieldUnit || 'kg';
    const nextYieldQuantity = copyOptions.yieldSetup ? sourceYieldQuantity : yieldQuantity;
    const nextYieldUnitId = copyOptions.yieldSetup ? sourceYieldUnitId : yieldUnitId;
    const nextEffectiveYield = nextYieldQuantity > 0 ? nextYieldQuantity : 0;
    const copiedIngredientIdMap = new Map<string, string>();
    const copiedIngredients = sortIngredientsByCategoryAndCost(
      (selectedCopyRecipe.ingredients || []).map((ingredient, index) => {
        const normalizedIngredient = normalizeIngredient(ingredient, purchaseItems, units);
        const copiedId = `ingredient-${now}-${index}-${normalizedIngredient.itemId || normalizedIngredient.purchaseItemId || 'item'}`;
        copiedIngredientIdMap.set(ingredient.id, copiedId);

        return {
          ...normalizedIngredient,
          id: copiedId,
        };
      }),
      purchaseItems,
    );
    const targetIngredientsForCost = copyOptions.ingredients ? copiedIngredients : pricedRecipeIngredients;

    const resolveCopiedIngredientReference = (line: RecipeCostLine) => {
      if (!line.ingredientReferenceId) {
        return undefined;
      }

      const mappedId = copiedIngredientIdMap.get(line.ingredientReferenceId);
      if (mappedId) {
        return mappedId;
      }

      const sourceIngredient = selectedCopyRecipe.ingredients.find(
        (ingredient) =>
          ingredient.id === line.ingredientReferenceId ||
          ingredient.itemId === line.ingredientReferenceId ||
          ingredient.purchaseItemId === line.ingredientReferenceId,
      );
      const targetIngredient = targetIngredientsForCost.find(
        (ingredient) =>
          (sourceIngredient?.itemId || sourceIngredient?.purchaseItemId) &&
          (ingredient.itemId === sourceIngredient.itemId || ingredient.purchaseItemId === sourceIngredient.purchaseItemId),
      );

      return targetIngredient?.id || line.ingredientReferenceId;
    };

    const copyCostLines = (category: RecipeCostLineCategory) =>
      (selectedCopyRecipe.additionalCostLines || [])
        .filter((line) => line.category === category)
        .map((line, index) =>
          standardizeRecipeCostLine(
            {
              ...line,
              id: `recipe-cost-${now}-${category}-${index}`,
              category,
              ingredientReferenceId: resolveCopiedIngredientReference(line),
            },
            nextEffectiveYield,
            targetIngredientsForCost,
            nextYieldUnitId,
            units,
            purchaseItems,
          ),
        );

    if (copyOptions.yieldSetup) {
      setYieldQuantity(sourceYieldQuantity);
      setYieldUnitId(sourceYieldUnitId);
      setPreparationTimeMinutes(selectedCopyRecipe.preparationTimeMinutes ?? selectedCopyRecipe.preparationTime ?? 30);
      setExpectedWastagePercentage(selectedCopyRecipe.expectedWastagePercentage ?? 0);
      setWastageEnabled(
        (selectedCopyRecipe.expectedWastagePercentage ?? 0) > 0 ||
          selectedCopyRecipe.ingredients.some((ingredient) => (ingredient.wastagePercentage || 0) > 0),
      );
    }

    if (copyOptions.ingredients) {
      setRecipeIngredients(copiedIngredients);
      setIngredientsOpen(true);
      setBulkIngredientPickerOpen(false);
      setSelectedBulkIngredientIds([]);
      if (copiedIngredients.some((ingredient) => (ingredient.wastagePercentage || 0) > 0)) {
        setWastageEnabled(true);
      }
    }

    if (copyOptions.labor || copyOptions.utility || copyOptions.packaging || copyOptions.other) {
      const copiedLaborLines = copyOptions.labor ? copyCostLines('labor') : laborCostLines;
      const copiedUtilityLines = copyOptions.utility ? copyCostLines('utility') : utilityCostLines;
      const copiedPackagingLines = copyOptions.packaging ? copyCostLines('packaging') : packagingCostLines;
      const copiedOtherLines = copyOptions.other ? copyCostLines('other') : otherProductionCostLines;
      setRecipeCostLines([
        ...copiedLaborLines,
        ...copiedUtilityLines,
        ...copiedPackagingLines,
        ...copiedOtherLines,
      ]);
    }

    if (copyOptions.notes) {
      setPreparationSteps(selectedCopyRecipe.preparationSteps || '');
      setPreparationNotesOpen(Boolean(selectedCopyRecipe.preparationSteps));
    }

    setRecipeActiveTab(copyOptions.ingredients ? 'ingredients' : 'costing');
    toast.success('Recipe sections copied. Review quantities before saving.');
  };

  const handleIngredientChange = (
    index: number,
    field: 'itemId' | 'entryQuantity' | 'entryUnitId' | 'wastagePercentage',
    value: string | number,
  ) => {
    setRecipeIngredients((current) => {
      const nextIngredients = [...current];
      const currentIngredient = nextIngredients[index];
      if (!currentIngredient) {
        return current;
      }

      if (field === 'itemId') {
        const itemId = String(value);
        const duplicateIndex = nextIngredients.findIndex(
          (ingredient, ingredientIndex) =>
            ingredientIndex !== index && (ingredient.itemId || ingredient.purchaseItemId) === itemId,
        );

        if (duplicateIndex >= 0) {
          toast.error('Duplicate ingredients are not allowed');
          return current;
        }

        const item = activeIngredientItems.find((entry) => entry.id === itemId);
        if (!item) {
          toast.error('Ingredient must be active and enabled for recipe ingredients in Purchase Item Master');
          return current;
        }

        const requestedEntryUnitId = currentIngredient.entryUnitId || currentIngredient.unit || getBaseUnit(item);
        const compatibleEntryUnits = getIngredientUnitOptions(item, units, requestedEntryUnitId);
        const nextEntryUnitId = compatibleEntryUnits.some((unit) => unit.code === requestedEntryUnitId)
          ? requestedEntryUnitId
          : getBaseUnit(item);

        const nextRow = syncIngredientRow({
          ...currentIngredient,
          itemId: item.id,
          purchaseItemId: item.id,
          itemName: item.itemName,
          purchaseItemName: item.itemName,
          entryUnitId: nextEntryUnitId,
          baseUnitId: getBaseUnit(item),
          unit: nextEntryUnitId,
          unitCost: getPurchaseItemUnitCost(item, units),
          costPerUnit: getPurchaseItemUnitCost(item, units),
        }, activeIngredientItems, units, 1);

        nextIngredients[index] = nextRow;
        return nextIngredients;
      }

      const numericValue = Number(value);
      const updatedRow = syncIngredientRow({
        ...currentIngredient,
        [field]:
          field === 'entryUnitId'
            ? String(value)
            : numericValue,
      }, activeIngredientItems, units, 1);
      nextIngredients[index] = updatedRow;
      return nextIngredients;
    });
  };

  const handleRemoveIngredient = (index: number) => {
    setRecipeIngredients((current) => current.filter((_, ingredientIndex) => ingredientIndex !== index));
  };

  const handleWastageToggle = (enabled: boolean) => {
    setWastageEnabled(enabled);
    if (!enabled) {
      setExpectedWastagePercentage(0);
      setRecipeIngredients((current) =>
        current.map((ingredient) => syncIngredientRow({ ...ingredient, wastagePercentage: 0 }, purchaseItems, units, 1)),
      );
    }
  };

  const handleAddRecipeCostLine = (category: RecipeCostLineCategory) => {
    setRecipeCostLines((current) => [
      ...current,
      createRecipeCostLine(category, effectiveYieldQuantity, yieldUnitId, units, purchaseItems),
    ]);
    setRecipeActiveTab('costing');
  };

  const handleRecipeCostLineChange = (
    lineId: string,
    field: keyof Pick<
      RecipeCostLine,
      'name' | 'calculationBasis' | 'rate' | 'quantity' | 'capacityQuantity' | 'unit' | 'ingredientReferenceId'
    >,
    value: string | number,
  ) => {
    setRecipeCostLines((current) => {
      const lineIndex = current.findIndex((line) => line.id === lineId);
      const currentLine = current[lineIndex];
      if (!currentLine) {
        return current;
      }

      const numericFields = new Set(['rate', 'quantity', 'capacityQuantity']);
      const fieldValue = numericFields.has(field) ? Number(value) : value;
      const nextBasis =
        field === 'calculationBasis'
          ? normalizeRecipeCostLineBasis(fieldValue as RecipeCostLineBasis)
          : normalizeRecipeCostLineBasis(currentLine.calculationBasis);
      const supportsReference = shouldShowRecipeCostReference(currentLine.category);
      const nextReferenceId =
        !supportsReference
          ? undefined
          : field === 'ingredientReferenceId'
          ? resolveRecipeCostReferenceId(String(value), standardRecipeIngredients, purchaseItems)
          : resolveRecipeCostReferenceId(currentLine.ingredientReferenceId, standardRecipeIngredients, purchaseItems);
      const referencedPurchaseItem = nextReferenceId
        ? purchaseItems.find((item) => item.id === nextReferenceId)
        : undefined;
      const nextReferencedIngredient = nextReferenceId
        ? standardRecipeIngredients.find(
          (ingredient) => ingredient.itemId === nextReferenceId || ingredient.purchaseItemId === nextReferenceId,
        )
        : undefined;
      const nextLine = standardizeRecipeCostLine(
        {
          ...currentLine,
          [field]: fieldValue,
          calculationBasis: nextBasis,
          rate:
            field === 'ingredientReferenceId' && referencedPurchaseItem
              ? getPurchaseItemUnitCost(referencedPurchaseItem, units)
              : field === 'rate'
                ? Number(value)
                : currentLine.rate,
          unit:
            field === 'calculationBasis'
              ? nextBasis === 'per-kg-input'
                ? currentLine.category === 'labor'
                  ? laborPerKgInputUnit
                  : nextReferencedIngredient?.entryUnitId ||
                    nextReferencedIngredient?.unit ||
                    nextReferencedIngredient?.baseUnitId ||
                    referencedPurchaseItem?.baseUnitId ||
                    referencedPurchaseItem?.issueUnit ||
                    getDefaultCostLineUnit(nextBasis, yieldUnitId)
                : getDefaultCostLineUnit(nextBasis, yieldUnitId)
              : field === 'ingredientReferenceId' && nextBasis === 'per-kg-input'
                ? currentLine.category === 'labor'
                  ? laborPerKgInputUnit
                  : nextReferencedIngredient?.entryUnitId ||
                    nextReferencedIngredient?.unit ||
                    nextReferencedIngredient?.baseUnitId ||
                    referencedPurchaseItem?.baseUnitId ||
                    referencedPurchaseItem?.issueUnit ||
                    currentLine.unit
              : field === 'unit'
                ? String(value)
                : currentLine.unit,
          ingredientReferenceId: nextReferenceId,
        },
        effectiveYieldQuantity,
        standardRecipeIngredients,
        yieldUnitId,
        units,
        purchaseItems,
      );

      const nextLines = [...current];
      nextLines[lineIndex] = nextLine;
      return nextLines;
    });
  };

  const handleRemoveRecipeCostLine = (lineId: string) => {
    setRecipeCostLines((current) => current.filter((line) => line.id !== lineId));
  };

  const handleCostLineDrop = (targetLineId: string, category: RecipeCostLineCategory) => {
    if (!draggedCostLineId || draggedCostLineId === targetLineId || viewMode) {
      setDraggedCostLineId(null);
      return;
    }

    setRecipeCostLines((current) => {
      const sectionLines = current.filter((line) => line.category === category);
      const fromIndex = sectionLines.findIndex((line) => line.id === draggedCostLineId);
      const toIndex = sectionLines.findIndex((line) => line.id === targetLineId);

      if (fromIndex < 0 || toIndex < 0) {
        return current;
      }

      const reorderedSection = [...sectionLines];
      const [movedLine] = reorderedSection.splice(fromIndex, 1);
      reorderedSection.splice(toIndex, 0, movedLine);
      const groupedLines = new Map<RecipeCostLineCategory, RecipeCostLine[]>(
        recipeCostLineCategoryOrder.map((entryCategory) => [
          entryCategory,
          entryCategory === category ? reorderedSection : current.filter((line) => line.category === entryCategory),
        ]),
      );

      return recipeCostLineCategoryOrder.flatMap((entryCategory) => groupedLines.get(entryCategory) || []);
    });
    setDraggedCostLineId(null);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedDish(null);
    setViewMode(false);
    setCommercialEditMode('price');
    setTargetMarginPerYieldUnit(0);
    recipeDialogSourceSignatureRef.current = null;
    recipeDialogFormSignatureRef.current = null;
  };

  const toggleExpandedRow = (rowId: string) => {
    setExpandedRowId((current) => (current === rowId ? null : rowId));
  };

  const handleRecalculateDish = (dish: Dish, recipe?: Recipe) => {
    if (!recipe) {
      toast.error('Recipe is missing for this dish');
      return;
    }

    const now = new Date();
    const updatedDish = recostDishFromRecipe(dish, recipe, userName, now);
    onDishesChange(dishes.map((entry) => (entry.id === dish.id ? updatedDish : entry)));
    onMenuPackagesChange(recostMenuPackagesForDish(menuPackages, updatedDish));
    toast.success('Recipe costs recalculated');
  };

  const repairRecipeDishLinks = () => {
    if (mismatchedLinkedRecipeDishes.length === 0) {
      toast.info('Recipe links are already aligned');
      return;
    }

    const now = new Date();
    const recipeByDishId = new Map(
      mismatchedLinkedRecipeDishes
        .filter((entry): entry is { dish: Dish; recipe: Recipe } => Boolean(entry.recipe))
        .map(({ dish, recipe }) => [dish.id, recipe]),
    );

    const updatedDishes = dishes.map((dish) => {
      const recipe = recipeByDishId.get(dish.id);
      return recipe ? recostDishFromRecipe(dish, recipe, userName, now) : dish;
    });

    const updatedDishById = new Map(updatedDishes.map((dish) => [dish.id, dish]));
    const updatedMenuPackages = menuPackages.map((menuPackage) => {
      let packageChanged = false;
      const recostedDishes = menuPackage.dishes.map((packageDish) => {
        const updatedDish = updatedDishById.get(packageDish.dishId);
        if (!updatedDish || !recipeByDishId.has(updatedDish.id)) {
          return packageDish;
        }

        packageChanged = true;
        return {
          ...packageDish,
          dishName: updatedDish.dishName,
          preparationArea: updatedDish.preparationArea,
          sourceType: updatedDish.sourceType,
          costPerHead: getPackageLineCost(
            updatedDish,
            packageDish.variantId,
            packageDish.unit,
            packageDish.quantityPerHead || 1,
          ),
        };
      });

      return packageChanged ? { ...menuPackage, dishes: recostedDishes, updatedAt: now } : menuPackage;
    });

    onDishesChange(updatedDishes);
    onMenuPackagesChange(updatedMenuPackages);
    toast.success(`${mismatchedLinkedRecipeDishes.length} recipe link${mismatchedLinkedRecipeDishes.length === 1 ? '' : 's'} repaired`);
  };

  const validateRecipe = () => {
    const isPurchasedReady = selectedDishProductionType === 'purchased-ready';

    if (!isPurchasedReady && !recipeName.trim()) {
      toast.error('Recipe name is required');
      return false;
    }

    if (!isPurchasedReady && !recipeType) {
      toast.error('Recipe type is required');
      return false;
    }

    if (!isPurchasedReady && yieldQuantity <= 0) {
      toast.error('Yield quantity must be greater than 0');
      return false;
    }

    if (!isPurchasedReady && !yieldUnitId) {
      toast.error('Yield unit is required');
      return false;
    }

    if (wastageEnabled && expectedWastagePercentage < 0) {
      toast.error('Expected wastage % cannot be negative');
      return false;
    }

    if (resolvedSellingPricePerYieldUnit < 0) {
      toast.error('Selling price per yield unit cannot be negative');
      return false;
    }

    if (isPurchasedReady && !selectedLinkedPurchaseItem) {
      toast.error('Link a purchase item in Dish Master before saving Purchased Ready costing');
      return false;
    }

    if (!isPurchasedReady && recipeIngredients.length === 0) {
      toast.error('Add at least one ingredient');
      return false;
    }

    if (!isPurchasedReady) {
      const ingredientIds = new Set<string>();
      for (const ingredient of pricedRecipeIngredients) {
        const item = resolveRecipeIngredientItem(ingredient, purchaseItems);
        const itemId = item?.id || ingredient.itemId || ingredient.purchaseItemId;
        const ingredientName = ingredient.itemName || ingredient.purchaseItemName || itemId || 'Unknown ingredient';

        if (!item) {
          toast.error(`Ingredient not found in Purchase Item Master: ${ingredientName}`);
          return false;
        }

        if (!isActivePurchaseItem(item)) {
          toast.error(`Purchase item is inactive: ${item.itemName}`);
          return false;
        }

        if (!isRecipeIngredientEnabled(item)) {
          toast.error(`Enable "Use In Recipe Ingredients" for: ${item.itemName}`);
          return false;
        }

        if (ingredientIds.has(itemId)) {
          toast.error('Duplicate ingredients are not allowed');
          return false;
        }
        ingredientIds.add(itemId);

        const entryQuantity = ingredient.entryQuantity ?? ingredient.requiredQuantity ?? ingredient.quantity ?? 0;
        if (entryQuantity <= 0) {
          toast.error('Required quantity must be greater than 0');
          return false;
        }

        if (wastageEnabled && (ingredient.wastagePercentage || 0) < 0) {
          toast.error('Wastage % cannot be negative');
          return false;
        }

        const baseUnitId = ingredient.baseUnitId || ingredient.unit;
        const entryUnitId = ingredient.entryUnitId || ingredient.unit;
        const baseQuantity = getIngredientBaseQuantity(entryQuantity, entryUnitId, baseUnitId, item, units);
        if (baseQuantity === null) {
          toast.error(
            `Set unit conversion for ${item.itemName}: ${entryUnitId} cannot convert to ${baseUnitId}. If using ${entryUnitId}, make it the purchase unit and set its conversion factor in Purchase Item Master.`,
          );
          return false;
        }

        if ((ingredient.unitCost ?? ingredient.costPerUnit ?? 0) < 0 || (ingredient.totalCost || 0) < 0) {
          toast.error('Cost values cannot be negative');
          return false;
        }
      }
    }

    for (const line of sourceRecipeCostLines) {
      const calculationBasis = normalizeRecipeCostLineBasis(line.calculationBasis);
      const costLineLabel = getRecipeCostLineCategoryLabel(line.category);

      if (!line.name.trim()) {
        toast.error(`${costLineLabel} cost name is required`);
        return false;
      }

      if (line.rate < 0 || line.totalCost < 0) {
        toast.error(`${costLineLabel} cost cannot be negative`);
        return false;
      }

      if (calculationBasis === 'item-usage' && line.category !== 'labor' && !line.ingredientReferenceId) {
        toast.error(`${costLineLabel} item usage must link to a purchase / stock item`);
        return false;
      }

      if (calculationBasis === 'per-kg-input' && line.category !== 'labor') {
        const referencedIngredient = findReferencedIngredient(line, pricedRecipeIngredients, purchaseItems);

        if (!line.ingredientReferenceId || !referencedIngredient) {
          toast.error(`Item reference must match an Ingredients/BOM line for Per KG Input ${costLineLabel.toLowerCase()} costs`);
          return false;
        }
      }

      if (['item-usage', 'per-hour', 'per-person', 'per-head', 'per-daig'].includes(calculationBasis) && (!line.quantity || line.quantity <= 0)) {
        toast.error('Quantity must be greater than 0 for item usage, hour, person, head, or daig based costs');
        return false;
      }
    }

    return true;
  };

  const handleSaveRecipe = () => {
    if (!selectedDish || !validateRecipe()) {
      return;
    }

    const isPurchasedReady = selectedDishProductionType === 'purchased-ready';
    const existingRecipe = getLinkedRecipe(selectedDish);
    const existingOutputItem =
      existingRecipe?.outputItemId ? purchaseItems.find((item) => item.id === existingRecipe.outputItemId) : undefined;
    const resolvedOutputItemId =
      suggestedOutputItem?.id ||
      (existingOutputItem && !isIngredientStyleOutputItem(existingOutputItem) ? existingOutputItem.id : undefined);
    const now = new Date();
    const persistedRecipeName = isPurchasedReady
      ? selectedLinkedPurchaseItem?.itemName || selectedDish.dishName
      : recipeName.trim();
    const persistedRecipeType = isPurchasedReady ? 'menu-recipe' : recipeType;
    const persistedYieldQuantity = isPurchasedReady ? 1 : yieldQuantity;
    const persistedYieldUnitId = isPurchasedReady
      ? getPreferredPurchasedReadyYieldUnit(selectedLinkedPurchaseItem)
      : yieldUnitId;
    const persistedPreparationTimeMinutes = isPurchasedReady
      ? existingRecipe?.preparationTimeMinutes ?? existingRecipe?.preparationTime ?? 0
      : preparationTimeMinutes;
    const normalizedIngredients = isPurchasedReady
      ? []
      : sortIngredientsByCategoryAndCost(pricedRecipeIngredients.map((ingredient) => {
          const syncedIngredient = syncIngredientRow(
            { ...ingredient, wastagePercentage: wastageEnabled ? ingredient.wastagePercentage : 0 },
            purchaseItems,
            units,
            1,
          );
          const snapshot = getIngredientSnapshot(syncedIngredient, purchaseItems);

          return {
            ...syncedIngredient,
            itemId: syncedIngredient.itemId || syncedIngredient.purchaseItemId,
            purchaseItemId: syncedIngredient.itemId || syncedIngredient.purchaseItemId,
            itemName: syncedIngredient.itemName || syncedIngredient.purchaseItemName,
            purchaseItemName: syncedIngredient.itemName || syncedIngredient.purchaseItemName,
            categoryId: snapshot.categoryId,
            categoryName: snapshot.categoryName,
            entryQuantity: syncedIngredient.entryQuantity ?? syncedIngredient.requiredQuantity ?? syncedIngredient.quantity,
            entryUnitId: syncedIngredient.entryUnitId || syncedIngredient.unit,
            requiredQuantity: syncedIngredient.entryQuantity ?? syncedIngredient.requiredQuantity ?? syncedIngredient.quantity,
            quantity: syncedIngredient.entryQuantity ?? syncedIngredient.requiredQuantity ?? syncedIngredient.quantity,
            baseQuantity: syncedIngredient.baseQuantity,
            scaledEntryQuantity: syncedIngredient.entryQuantity ?? syncedIngredient.requiredQuantity ?? syncedIngredient.quantity,
            scaledBaseQuantity: syncedIngredient.baseQuantity,
            baseUnitId: syncedIngredient.baseUnitId || syncedIngredient.unit,
            unit: syncedIngredient.entryUnitId || syncedIngredient.unit,
            lastPurchaseRate: snapshot.lastPurchaseRate,
            lastPurchaseUnit: snapshot.lastPurchaseUnit,
            unitCost: syncedIngredient.unitCost ?? syncedIngredient.costPerUnit,
            costPerUnit: syncedIngredient.unitCost ?? syncedIngredient.costPerUnit,
          };
        }), purchaseItems);
    const normalizedCostLines = sourceRecipeCostLines.map((line) =>
      standardizeRecipeCostLine(line, effectiveYieldQuantity, standardRecipeIngredients, persistedYieldUnitId, units, purchaseItems),
    );
    const computedMarginPerYieldUnit = standardMetrics.marginPerYieldUnit;

    const recipeData: Recipe = {
      id: existingRecipe?.id || `recipe-${Date.now()}`,
      dishId: selectedDish.id,
      recipeName: persistedRecipeName,
      recipeCode,
      recipeType: persistedRecipeType,
      outputItemId: isPurchasedReady ? selectedLinkedPurchaseItem?.id : resolvedOutputItemId,
      outputItemName: isPurchasedReady || persistedRecipeType === 'menu-recipe' ? selectedDish.dishName : persistedRecipeName,
      recipeCategoryId: isPurchasedReady ? existingRecipe?.recipeCategoryId : recipeCategoryId || undefined,
      kitchenSectionId: isPurchasedReady ? existingRecipe?.kitchenSectionId : kitchenSectionId || undefined,
      status: recipeStatus,
      ingredients: normalizedIngredients,
      preparationSteps: isPurchasedReady ? existingRecipe?.preparationSteps : preparationSteps.trim() || undefined,
      preparationTimeMinutes: persistedPreparationTimeMinutes,
      preparationTime: persistedPreparationTimeMinutes,
      yieldQuantity: persistedYieldQuantity,
      yields: persistedYieldQuantity,
      yieldUnitId: persistedYieldUnitId,
      yieldUnit: persistedYieldUnitId,
      targetYieldQuantity: persistedYieldQuantity,
      targetYieldUnitId: persistedYieldUnitId,
      expectedWastagePercentage: wastageEnabled ? expectedWastagePercentage : 0,
      expectedYieldPercentage: 100,
      totalIngredientCost: sourceIngredientCost,
      wastageCost: standardWastageCost,
      laborCost: sourceLaborCost,
      utilitiesCost: sourceUtilitiesCost,
      additionalCost: sourceAdditionalCost,
      additionalCostLines: normalizedCostLines,
      totalRecipeCost: totalRecipeCost,
      totalProductionCost: totalRecipeCost,
      totalCost: totalRecipeCost,
      costPerPortion: costPerYieldUnit,
      costPerYieldUnit,
      supplyMarginPerYieldUnit: computedMarginPerYieldUnit,
      supplySellingPricePerYieldUnit: resolvedSellingPricePerYieldUnit,
      supplyFoodCostPercentage: foodCostPercentage,
      suggestedSellingPrice: resolvedSellingPricePerYieldUnit,
      foodCostPercentage,
      createdBy: existingRecipe?.createdBy || userName,
      createdAt: existingRecipe?.createdAt || now,
      updatedAt: now,
    };

    const nextRecipes = existingRecipe
      ? recipes.map((recipe) => (recipe.id === existingRecipe.id ? recipeData : recipe))
      : [...recipes, recipeData];
    onRecipesChange(nextRecipes);
    setRecipeIngredients(normalizedIngredients);

    let updatedDish: Dish | null = null;
    const updatedDishes = dishes.map((dish) => {
      if (dish.id !== selectedDish.id) {
        return dish;
      }

      updatedDish = recostDishFromRecipe(dish, recipeData, userName, now);
      return updatedDish;
    });
    onDishesChange(updatedDishes);
    if (updatedDish) {
      onMenuPackagesChange(recostMenuPackagesForDish(menuPackages, updatedDish));
    }

    toast.success('Recipe saved. Dish link and costing updated.');
    closeDialog();
  };

  const renderCostLineQuantityControl = (line: RecipeCostLine) => {
    const calculationBasis = normalizeRecipeCostLineBasis(line.calculationBasis);
    const effectiveCostYield = effectiveYieldQuantity;

  if (calculationBasis === 'fixed') {
    return <span className="block text-right text-xs text-slate-400">-</span>;
  }

  if (calculationBasis === 'item-usage') {
    return (
      <input
        type="number"
        min="0.01"
        step="0.01"
        value={line.quantity || 1}
        onChange={(event) => handleRecipeCostLineChange(line.id, 'quantity', Number(event.target.value))}
        disabled={viewMode}
        className={`${compactInputClass} text-right`}
      />
    );
  }

  if (calculationBasis === 'per-kg-output') {
      return (
        <div
          className="flex h-7 items-center justify-end rounded border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700"
          title="Auto from recipe output"
        >
          {effectiveCostYield.toFixed(2)}
        </div>
      );
    }

    if (calculationBasis === 'per-kg-input') {
      if (line.category === 'labor') {
        return (
          <div
            className="flex h-7 items-center justify-end rounded border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700"
            title="Auto from total Ingredients/BOM input weight"
          >
            {getRecipeInputQuantityInKg(pricedRecipeIngredients, units).toFixed(2)}
          </div>
        );
      }

      const referencedIngredient = findReferencedIngredient(line, pricedRecipeIngredients, purchaseItems);
      return (
        <div
          className="flex h-7 items-center justify-end rounded border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700"
          title={
            referencedIngredient
              ? 'Auto from selected item quantity in Ingredients/BOM'
              : 'Selected item is not in Ingredients/BOM. Use Fixed, Per Batch, or Per KG Output for catalog-only cost items.'
          }
        >
          {getReferencedIngredientQuantity(line, pricedRecipeIngredients, purchaseItems).toFixed(2)}
        </div>
      );
    }

    if (calculationBasis === 'per-batch') {
      return (
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={line.capacityQuantity || 12}
          onChange={(event) => handleRecipeCostLineChange(line.id, 'capacityQuantity', Number(event.target.value))}
          disabled={viewMode}
          title={`${line.quantity || 1} batch(es) auto-calculated from yield`}
          className={`${compactInputClass} text-right`}
        />
      );
    }

    return (
      <input
        type="number"
        min="0.01"
        step="0.01"
        value={line.quantity || 1}
        onChange={(event) => handleRecipeCostLineChange(line.id, 'quantity', Number(event.target.value))}
        disabled={viewMode}
        className={`${compactInputClass} text-right`}
      />
    );
  };

  const renderCostSection = (
    category: RecipeCostLineCategory,
    title: string,
    rows: RecipeCostLine[],
    total: number,
  ) => {
    const showItemReference = shouldShowRecipeCostReference(category);
    const emptyStateColSpan = showItemReference ? 8 : 7;

    return (
      <section className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">{title}</div>
          <div className="text-xs font-semibold text-slate-900">{formatCurrencyPKR(total)}</div>
        </div>
        <div className="overflow-x-auto">
          <table className={`w-full table-fixed ${showItemReference ? 'min-w-[940px]' : 'min-w-[820px]'}`}>
          <thead className="bg-white">
            <tr className="border-b border-slate-200">
              <th className={`${compactTableHeadClass} ${showItemReference ? 'w-[22%]' : 'w-[28%]'}`}>{getRecipeCostLineNameColumnLabel(category)}</th>
              <th className={`${compactTableHeadClass} w-[15%]`}>Cost Basis</th>
              <th className={`${compactTableHeadClass} w-[10%] text-right`}>Rate</th>
              <th className={`${compactTableHeadClass} w-[12%] text-right`}>Quantity</th>
              <th className={`${compactTableHeadClass} w-[9%]`}>Unit</th>
              {showItemReference ? (
                <th className={`${compactTableHeadClass} w-[18%]`}>Item Reference</th>
              ) : null}
              <th className={`${compactTableHeadClass} w-[10%] text-right`}>Total</th>
              <th className={`${compactTableHeadClass} w-[4%] text-right`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((line) => {
              const calculationBasis = normalizeRecipeCostLineBasis(line.calculationBasis);
              const defaultUnit = getDefaultCostLineUnit(calculationBasis, yieldUnitId);
              const referencedIngredient = findReferencedIngredient(line, standardRecipeIngredients, purchaseItems);
              const referencedPurchaseItem = findReferencedPurchaseItem(line, standardRecipeIngredients, purchaseItems);
              const ingredientUnit =
                referencedIngredient?.entryUnitId ||
                referencedIngredient?.unit ||
                referencedIngredient?.baseUnitId ||
                referencedPurchaseItem?.baseUnitId ||
                referencedPurchaseItem?.issueUnit ||
                line.unit ||
                laborPerKgInputUnit;
              const referenceOptions = getRecipeCostReferenceOptions(line.ingredientReferenceId);
              const rowBasisOptions = getRecipeCostLineBasisOptions(category, calculationBasis);
              const unitValue =
                calculationBasis === 'fixed'
                  ? ''
                  : calculationBasis === 'item-usage'
                    ? referencedPurchaseItem?.baseUnitId ||
                      referencedPurchaseItem?.issueUnit ||
                      referencedIngredient?.baseUnitId ||
                      referencedIngredient?.unit ||
                      referencedIngredient?.entryUnitId ||
                      line.unit ||
                      ''
                  : calculationBasis === 'per-kg-input'
                    ? category === 'labor'
                      ? laborPerKgInputUnit
                      : ingredientUnit
                    : line.unit || defaultUnit;

              return (
                <tr
                  key={line.id}
                  draggable={!viewMode}
                  onDragStart={(event: DragEvent<HTMLTableRowElement>) => {
                    setDraggedCostLineId(line.id);
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(event: DragEvent<HTMLTableRowElement>) => {
                    if (!viewMode && draggedCostLineId) {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                    }
                  }}
                  onDrop={() => handleCostLineDrop(line.id, category)}
                  onDragEnd={() => setDraggedCostLineId(null)}
                  className={`border-b border-slate-100 last:border-b-0 ${draggedCostLineId === line.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <td className={compactTableCellClass}>
                    <div className="flex items-center gap-1">
                      <GripVertical className="size-3.5 shrink-0 text-slate-400" />
                      <input
                        type="text"
                        value={line.name}
                        onChange={(event) => handleRecipeCostLineChange(line.id, 'name', event.target.value)}
                        disabled={viewMode}
                        className={compactInputClass}
                        placeholder={getRecipeCostLinePlaceholder(category)}
                      />
                    </div>
                  </td>
                  <td className={compactTableCellClass}>
                    <select
                      value={calculationBasis}
                      onChange={(event) =>
                        handleRecipeCostLineChange(line.id, 'calculationBasis', event.target.value as RecipeCostLineBasis)
                      }
                      disabled={viewMode}
                      className={compactInputClass}
                    >
                      {rowBasisOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={compactTableCellClass}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.rate}
                      onChange={(event) => handleRecipeCostLineChange(line.id, 'rate', Number(event.target.value))}
                      disabled={viewMode || (calculationBasis === 'item-usage' && Boolean(line.ingredientReferenceId))}
                      className={`${compactInputClass} text-right`}
                    />
                  </td>
                  <td className={compactTableCellClass}>{renderCostLineQuantityControl(line)}</td>
                  <td className={compactTableCellClass}>
                    <input
                      type="text"
                      value={unitValue}
                      onChange={(event) => handleRecipeCostLineChange(line.id, 'unit', event.target.value)}
                      disabled={viewMode || ['fixed', 'item-usage', 'per-kg-output', 'per-kg-input'].includes(calculationBasis)}
                      className={compactInputClass}
                    />
                  </td>
                  {showItemReference ? (
                    <td className={compactTableCellClass}>
                      <select
                        value={line.ingredientReferenceId || ''}
                        onChange={(event) => handleRecipeCostLineChange(line.id, 'ingredientReferenceId', event.target.value)}
                        disabled={viewMode}
                        className={compactInputClass}
                      >
                        <option value="">Select purchase / stock item</option>
                        {referenceOptions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.itemName} | {formatIngredientCategoryLabel(getIngredientCategoryKey(item))}
                          </option>
                        ))}
                      </select>
                    </td>
                  ) : null}
                  <td className={`${compactTableCellClass} text-right font-semibold text-slate-900`}>
                    {formatCurrencyPKR(line.totalCost || 0)}
                  </td>
                  <td className={`${compactTableCellClass} text-right`}>
                    {!viewMode ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipeCostLine(line.id)}
                        title={`Remove ${getRecipeCostLineCategoryLabel(category).toLowerCase()} cost`}
                        className="inline-flex size-7 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-5 text-center text-xs text-slate-500" colSpan={emptyStateColSpan}>
                  No {getRecipeCostLineCategoryLabel(category).toLowerCase()} costs added.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
        <span className="font-medium text-slate-600">{title} Total</span>
        <span className="min-w-[120px] text-right font-semibold text-slate-900">{formatCurrencyPKR(total)}</span>
      </div>
      </section>
    );
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <h2 className="mr-2 text-base font-semibold text-slate-900">Banquet Menu Costing Control</h2>
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search dish, recipe code, output item"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as RegisterSortKey)} className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700">
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select>
          <select value={sortDirection} onChange={(event) => setSortDirection(event.target.value as 'asc' | 'desc')} className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700">
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2">
          <div className="flex flex-wrap gap-2">
            <select value={recipePresenceFilter} onChange={(event) => setRecipePresenceFilter(event.target.value as RecipePresenceFilter)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
              <option value="all">All Recipe Presence</option>
              <option value="with-recipe">With Recipe</option>
              <option value="without-recipe">Without Recipe</option>
            </select>
            <select value={productionTypeFilter} onChange={(event) => setProductionTypeFilter(event.target.value as ProductionTypeFilter)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
              <option value="all">All Production Types</option>
              {productionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select value={cuisineFilter} onChange={(event) => setCuisineFilter(event.target.value)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
              <option value="all">All Cuisines</option>
              {cuisineFilterOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select value={kitchenSectionFilter} onChange={(event) => setKitchenSectionFilter(event.target.value)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
              <option value="all">All Kitchen Sections</option>
              {kitchenSectionFilterOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select value={recipeTypeFilter} onChange={(event) => setRecipeTypeFilter(event.target.value as 'all' | RecipeType)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
              <option value="all">All Recipe Types</option>
              {recipeTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select value={recipeStateFilter} onChange={(event) => setRecipeStateFilter(event.target.value as RecipeStateFilter)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
              {recipeStateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select value={costingStatusFilter} onChange={(event) => setCostingStatusFilter(event.target.value as CostingStatusFilter)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
              {costingStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select value={yieldUnitFilter} onChange={(event) => setYieldUnitFilter(event.target.value)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
              <option value="all">All Units</option>
              {costUnitFilterOptions.map((unit) => (
                <option key={unit} value={unit}>
                  {formatSalesUnitLabel(unit)}
                </option>
              ))}
            </select>
            <select value={foodCostBandFilter} onChange={(event) => setFoodCostBandFilter(event.target.value as FoodCostBandFilter)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
              {foodCostBandOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select value={marginFilter} onChange={(event) => setMarginFilter(event.target.value as MarginFilter)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
              {marginFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select value={missingConfigFilter} onChange={(event) => setMissingConfigFilter(event.target.value as MissingConfigFilter)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
              {missingConfigOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => resetRegisterFilters({ clearSearch: true })}
              className="h-8 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              All Filters
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <button type="button" onClick={() => resetRegisterFilters()} className="font-semibold text-slate-900">Total Menu Items: {registerMetrics.totalMenuItems}</button>
            <button type="button" onClick={() => applyRegisterFilterPreset({ productionTypeFilter: 'recipe-based' })} className="font-semibold text-slate-900">Recipe Based: {registerMetrics.recipeBasedCount}</button>
            <button type="button" onClick={() => applyRegisterFilterPreset({ productionTypeFilter: 'purchased-ready' })} className="font-semibold text-slate-900">Purchased Ready: {registerMetrics.purchasedReadyCount}</button>
            <button type="button" onClick={() => applyRegisterFilterPreset({ productionTypeFilter: 'service-item' })} className="font-semibold text-slate-900">Service Items: {registerMetrics.serviceItemCount}</button>
            <button type="button" onClick={() => applyRegisterFilterPreset({ recipePresenceFilter: 'with-recipe' })} className="font-semibold text-slate-900">With Recipe: {registerMetrics.withRecipeCount}</button>
            <button type="button" onClick={() => applyRegisterFilterPreset({ recipeStateFilter: 'missing-recipe' })} className={`font-semibold ${registerMetrics.withoutRecipeCount > 0 ? 'text-red-700 hover:underline' : 'text-slate-900'}`}>Without Recipe: {registerMetrics.withoutRecipeCount}</button>
            <span><strong className="text-slate-900">Active Recipes:</strong> {registerMetrics.activeRecipesCount}</span>
            <span><strong className="text-slate-900">Inactive Recipes:</strong> {registerMetrics.inactiveRecipesCount}</span>
            <span><strong className="text-slate-900">Avg Food Cost %:</strong> {registerMetrics.avgFoodCost.toFixed(2)}%</span>
            <button type="button" onClick={() => applyRegisterFilterPreset({ foodCostBandFilter: 'above-50' })} className={`font-semibold ${registerMetrics.highFoodCostCount > 0 ? 'text-amber-700 hover:underline' : 'text-slate-900'}`}>High Food Cost: {registerMetrics.highFoodCostCount}</button>
            <button type="button" onClick={() => applyRegisterFilterPreset({ costingStatusFilter: 'zero-margin' })} className={`font-semibold ${registerMetrics.zeroMarginCount > 0 ? 'text-slate-700 hover:underline' : 'text-slate-900'}`}>Zero Margin: {registerMetrics.zeroMarginCount}</button>
            <button type="button" onClick={() => applyRegisterFilterPreset({ costingStatusFilter: 'loss-making' })} className={`font-semibold ${registerMetrics.lossMakingCount > 0 ? 'text-red-700 hover:underline' : 'text-slate-900'}`}>Loss Making: {registerMetrics.lossMakingCount}</button>
            <button type="button" onClick={() => applyRegisterFilterPreset({ missingConfigFilter: 'missing-supply-price' })} className={`font-semibold ${registerMetrics.missingSupplyPriceCount > 0 ? 'text-red-700 hover:underline' : 'text-slate-900'}`}>Missing Supply Price: {registerMetrics.missingSupplyPriceCount}</button>
            <button type="button" onClick={() => applyRegisterFilterPreset({ missingConfigFilter: 'missing-ingredients' })} className={`font-semibold ${registerMetrics.missingIngredientCostCount > 0 ? 'text-red-700 hover:underline' : 'text-slate-900'}`}>Missing Ingredient Cost: {registerMetrics.missingIngredientCostCount}</button>
            <button type="button" onClick={() => applyRegisterFilterPreset({ missingConfigFilter: 'missing-labor-or-utility' })} className={`font-semibold ${registerMetrics.missingLaborUtilityCount > 0 ? 'text-red-700 hover:underline' : 'text-slate-900'}`}>Missing Labor / Utility: {registerMetrics.missingLaborUtilityCount}</button>
            <button type="button" onClick={() => applyRegisterFilterPreset({ missingConfigFilter: 'missing-cost-link' })} className={`font-semibold ${registerMetrics.missingCostLinkCount > 0 ? 'text-red-700 hover:underline' : 'text-slate-900'}`}>Missing Cost Link: {registerMetrics.missingCostLinkCount}</button>
          </div>
        </div>

        {activeIngredientItems.length === 0 ? (
          <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
            Enable at least one active Purchase Item for recipe ingredients before building recipes.
          </div>
        ) : null}

        {mismatchedLinkedRecipeDishes.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
            <span>
              {mismatchedLinkedRecipeDishes.length} saved recipe{mismatchedLinkedRecipeDishes.length === 1 ? '' : 's'} need dish-link repair. Register rows may show wrong status until repaired.
            </span>
            <button type="button" onClick={repairRecipeDishLinks} className="h-7 rounded border border-amber-300 bg-white px-2 font-semibold text-amber-900 hover:bg-amber-100">
              Repair Links
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {filteredRows.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-300 bg-white px-6 text-center">
            <div>
              <FileText className="mx-auto mb-3 size-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No costing rows found</p>
              <p className="mt-1 text-xs text-slate-500">Adjust the costing filters to see banquet menu items.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <h3 className="text-sm font-semibold text-slate-900">Menu Costing Register</h3>
              <span className="text-xs text-slate-500">{filteredRows.length} rows</span>
            </div>
            <div className="overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className={tableHeadClass}>Dish</th>
                    <th className={tableHeadClass}>Production Type</th>
                    <th className={tableHeadClass}>Recipe Type</th>
                    <th className={tableHeadClass}>Output / Linked Item</th>
                    <th className={tableHeadClass}>Standard Yield</th>
                    <th className={`${tableHeadClass} text-right`}>Standard Dish Cost</th>
                    <th className={`${tableHeadClass} text-right`}>Standard Cost / Unit</th>
                    <th className={`${tableHeadClass} text-right`}>Selling Price</th>
                    <th className={`${tableHeadClass} text-right`}>Margin</th>
                    <th className={`${tableHeadClass} text-right`}>Food Cost %</th>
                    <th className={`${tableHeadClass} text-right`}>Margin %</th>
                    <th className={tableHeadClass}>Costing Status</th>
                    <th className={tableHeadClass}>Recipe Status</th>
                    <th className={`${tableHeadClass} text-right`}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const standardYieldText =
                      row.productionType === 'recipe-based' && row.standardYieldQuantity > 0
                        ? `${row.standardYieldQuantity} ${row.standardYieldUnit || row.costUnit}`
                        : '-';
                    const costPerUnitText =
                      row.costPerUnit > 0 ? `${formatCurrencyPKR(row.costPerUnit)} / ${formatSalesUnitLabel(row.costUnit)}` : '-';
                    const sellingPriceText =
                      row.supplyPricePerUnit > 0 ? `${formatCurrencyPKR(row.supplyPricePerUnit)} / ${formatSalesUnitLabel(row.costUnit)}` : 'Missing';
                    const marginText =
                      row.supplyPricePerUnit > 0 || row.marginPerUnit !== 0
                        ? `${formatCurrencyPKR(row.marginPerUnit)} / ${formatSalesUnitLabel(row.costUnit)}`
                        : '-';
                    const marginPercentageText =
                      row.supplyPricePerUnit > 0 ? `${row.marginPercentage.toFixed(2)}%` : 'Missing';

                    return (
                      <Fragment key={row.id}>
                        <tr className="cursor-pointer border-t border-slate-200 hover:bg-slate-50" onClick={() => toggleExpandedRow(row.id)}>
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{row.dish.dishName}</div>
                            <div className="text-xs text-slate-500">
                              {row.dish.cuisineName} | {String(row.dish.kitchenStationId || row.dish.preparationArea || '-').replace(/-/g, ' ')}
                            </div>
                          </td>
                          <td className={tableCellClass}>
                            <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">{row.productionTypeLabel}</span>
                          </td>
                          <td className={tableCellClass}>{row.recipeType}</td>
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{row.outputOrLinkedItem}</div>
                            <div className="text-xs text-slate-500">{formatSalesUnitLabel(row.costUnit)}</div>
                          </td>
                          <td className={tableCellClass}>{standardYieldText}</td>
                          <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                            {row.productionType === 'recipe-based' ? formatCurrencyPKR(row.standardDishCost) : '-'}
                          </td>
                          <td className={`${tableCellClass} text-right font-medium text-slate-900`}>{costPerUnitText}</td>
                          <td className={`${tableCellClass} text-right font-medium text-slate-900`}>{sellingPriceText}</td>
                          <td className={`${tableCellClass} text-right font-medium ${row.marginPerUnit < 0 ? 'text-red-700' : 'text-slate-900'}`}>{marginText}</td>
                          <td className={`${tableCellClass} text-right font-medium ${row.foodCostPercentage > COSTING_FOOD_COST_THRESHOLD ? 'text-amber-700' : 'text-slate-900'}`}>
                            {row.supplyPricePerUnit > 0 ? `${row.foodCostPercentage.toFixed(2)}%` : 'Missing'}
                          </td>
                          <td className={`${tableCellClass} text-right font-medium ${row.marginPerUnit < 0 ? 'text-red-700' : 'text-slate-900'}`}>{marginPercentageText}</td>
                          <td className={tableCellClass}>
                            <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${getCostingStatusBadgeClass(row.costingStatus)}`}>
                              {getCostingStatusLabel(row.costingStatus)}
                            </span>
                          </td>
                          <td className={tableCellClass}>
                            <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${getRecipeStateBadgeClass(row.recipeState)}`}>
                              {getRecipeStateLabel(row.recipeState)}
                            </span>
                          </td>
                          <td className={`${tableCellClass} text-right`}>
                            <div className="inline-flex items-center gap-1">
                              {(row.productionType === 'recipe-based' || row.productionType === 'purchased-ready') && row.recipe ? (
                                <button
                                  type="button"
                                  title={row.productionType === 'purchased-ready' ? 'View purchased ready costing' : 'View recipe'}
                                  aria-label={row.productionType === 'purchased-ready' ? 'View purchased ready costing' : 'View recipe'}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openRecipeDialog(row.dish, true);
                                  }}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                                >
                                  <Eye className="size-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  title="Show detail"
                                  aria-label="Show detail"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleExpandedRow(row.id);
                                  }}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                                >
                                  <Eye className="size-3.5" />
                                </button>
                              )}
                              {row.productionType === 'recipe-based' || row.productionType === 'purchased-ready' ? (
                                <button
                                  type="button"
                                  title={
                                    row.productionType === 'purchased-ready'
                                      ? row.recipe
                                        ? 'Edit purchased ready costing'
                                        : 'Create purchased ready costing'
                                      : row.recipe
                                        ? 'Edit recipe'
                                        : 'Create recipe'
                                  }
                                  aria-label={
                                    row.productionType === 'purchased-ready'
                                      ? row.recipe
                                        ? 'Edit purchased ready costing'
                                        : 'Create purchased ready costing'
                                      : row.recipe
                                        ? 'Edit recipe'
                                        : 'Create recipe'
                                  }
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openRecipeDialog(row.dish, false);
                                  }}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
                                  disabled={row.productionType === 'recipe-based' && !row.recipe && activeIngredientItems.length === 0}
                                >
                                  {row.recipe ? <Edit2 className="size-3.5" /> : <Plus className="size-3.5" />}
                                </button>
                              ) : null}
                              {row.productionType === 'recipe-based' && row.recipe ? (
                                <button
                                  type="button"
                                  title="Recalculate dish cost"
                                  aria-label="Recalculate dish cost"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleRecalculateDish(row.dish, row.recipe);
                                  }}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                                >
                                  <RefreshCw className="size-3.5" />
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                        {expandedRowId === row.id ? (
                          <tr className="border-t border-slate-100 bg-slate-50/60">
                            <td className="px-3 py-3" colSpan={14}>
                              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-6">
                                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="text-xs text-slate-500">Ingredient Cost</div>
                                  <div className="font-semibold text-slate-900">{row.productionType === 'recipe-based' ? formatCurrencyPKR(row.ingredientCost) : '-'}</div>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="text-xs text-slate-500">Labor Cost</div>
                                  <div className="font-semibold text-slate-900">{row.productionType === 'recipe-based' ? formatCurrencyPKR(row.laborCost) : '-'}</div>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="text-xs text-slate-500">Utility Cost</div>
                                  <div className="font-semibold text-slate-900">{row.productionType === 'recipe-based' ? formatCurrencyPKR(row.utilityCost) : '-'}</div>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="text-xs text-slate-500">Packaging / Consumable Cost</div>
                                  <div className="font-semibold text-slate-900">{row.productionType === 'recipe-based' ? formatCurrencyPKR(row.packagingCost) : '-'}</div>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="text-xs text-slate-500">Other Production Cost</div>
                                  <div className="font-semibold text-slate-900">{row.productionType === 'recipe-based' ? formatCurrencyPKR(row.otherProductionCost) : '-'}</div>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="text-xs text-slate-500">Wastage Cost</div>
                                  <div className="font-semibold text-slate-900">{row.productionType === 'recipe-based' ? formatCurrencyPKR(row.wastageCost) : '-'}</div>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="text-xs text-slate-500">Standard Dish Cost</div>
                                  <div className="font-semibold text-slate-900">
                                    {row.productionType === 'recipe-based' ? formatCurrencyPKR(row.standardDishCost) : row.costPerUnit > 0 ? formatCurrencyPKR(row.costPerUnit) : 'Missing'}
                                  </div>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="text-xs text-slate-500">Standard Yield</div>
                                  <div className="font-semibold text-slate-900">
                                    {row.productionType === 'recipe-based' ? `${row.standardYieldQuantity} ${row.standardYieldUnit || row.costUnit}` : '-'}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                                {row.missingIngredients ? <span className="rounded bg-red-100 px-2 py-0.5 text-red-700">Missing ingredients</span> : null}
                                {row.missingLabor ? <span className="rounded bg-red-100 px-2 py-0.5 text-red-700">Missing labor cost</span> : null}
                                {row.missingUtility ? <span className="rounded bg-red-100 px-2 py-0.5 text-red-700">Missing utility cost</span> : null}
                                {row.missingSupplyPrice ? <span className="rounded bg-red-100 px-2 py-0.5 text-red-700">Missing supply price</span> : null}
                                {row.missingCostLink ? <span className="rounded bg-red-100 px-2 py-0.5 text-red-700">Missing linked cost source</span> : null}
                                {row.missingCategory ? <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">Missing category</span> : null}
                                {row.missingKitchenSection ? <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">Missing kitchen section</span> : null}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {dialogOpen && selectedDish ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="flex max-h-[94vh] w-full max-w-7xl flex-col rounded bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {dialogTitle}
                </h2>
                <p className="text-xs text-slate-500">{dialogSubtitle}</p>
              </div>
              <button onClick={closeDialog} className="rounded p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-3">
                <section className="rounded border border-slate-200 bg-white">
                  <div className={sectionTitleClass}>Cost Summary</div>
                  {isPurchasedReadyDialog ? (
                    <div className="grid gap-px bg-slate-200 md:grid-cols-3 xl:grid-cols-[minmax(220px,1.4fr)_0.75fr_0.8fr_minmax(230px,1.25fr)_0.75fr_0.7fr]">
                      <div className="bg-white px-2.5 py-2 text-sm">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Purchase Item</div>
                        <div className="truncate font-semibold text-slate-900">{selectedLinkedPurchaseItem?.itemName || 'Not linked'}</div>
                        <div className="text-[11px] text-slate-500">
                          {formatCurrencyPKR(selectedPurchasedReadyUnitCost)} / {selectedPurchaseCostUnitLabel}
                        </div>
                      </div>
                      <div className="bg-white px-2.5 py-2 text-sm">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Add-ons</div>
                        <div className="font-semibold text-slate-900">{formatCurrencyPKR(additionalCost + wastageCost)}</div>
                        <div className="truncate text-[11px] text-slate-500">{productionCostSummaryText}</div>
                      </div>
                      <div className="bg-white px-2.5 py-2 text-sm">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Final Cost / {yieldUnitLabel}</div>
                        <div className="font-semibold text-slate-900">{formatCurrencyPKR(costPerYieldUnit)}</div>
                        <div className="text-[11px] text-slate-500">{standardYieldSummary}</div>
                      </div>
                      <div className="bg-white px-2.5 py-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            {commercialEditMode === 'price' ? 'Selling Price' : 'Target Margin'} / {yieldUnitLabel}
                          </div>
                          {!viewMode ? (
                            <div className="inline-flex rounded border border-slate-300 bg-slate-50 p-0.5 text-[10px] font-medium text-slate-700">
                              <button
                                type="button"
                                onClick={() => {
                                  setCommercialEditMode('margin');
                                  setTargetMarginPerYieldUnit(marginPerYieldUnit);
                                }}
                                className={`h-5 rounded px-1.5 ${commercialEditMode === 'margin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                              >
                                Margin
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCommercialEditMode('price');
                                  setSellingPricePerYieldUnit(supplySellingPricePerYieldUnit);
                                }}
                                className={`h-5 rounded px-1.5 ${commercialEditMode === 'price' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                              >
                                Price
                              </button>
                            </div>
                          ) : null}
                        </div>
                        {viewMode ? (
                          <div className="font-semibold text-slate-900">{formatCurrencyPKR(supplySellingPricePerYieldUnit)}</div>
                        ) : commercialEditMode === 'price' ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={sellingPricePerYieldUnit}
                            onChange={(event) => {
                              const nextValue = Number(event.target.value);
                              setSellingPricePerYieldUnit(nextValue);
                              setTargetMarginPerYieldUnit(nextValue - costPerYieldUnit);
                            }}
                            className={`${compactInputClass} mt-1 text-right`}
                          />
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            value={targetMarginPerYieldUnit}
                            onChange={(event) => {
                              const nextMargin = Number(event.target.value);
                              setTargetMarginPerYieldUnit(nextMargin);
                              setSellingPricePerYieldUnit(costPerYieldUnit + nextMargin);
                            }}
                            className={`${compactInputClass} mt-1 text-right`}
                          />
                        )}
                        {!viewMode ? (
                          <div className="mt-1 text-[11px] text-slate-500">Selling: {formatCurrencyPKR(supplySellingPricePerYieldUnit)}</div>
                        ) : null}
                      </div>
                      <div className="bg-white px-2.5 py-2 text-sm">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Margin / {yieldUnitLabel}</div>
                        <div className={`font-semibold ${marginPerYieldUnit < 0 ? 'text-red-700' : 'text-slate-900'}`}>{formatCurrencyPKR(marginPerYieldUnit)}</div>
                        <div className="text-[11px] text-slate-500">
                          {Number.isFinite(marginPercentage) ? `${marginPercentage.toFixed(2)}%` : '0.00%'}
                        </div>
                      </div>
                      <div className="bg-white px-2.5 py-2 text-sm">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Food Cost</div>
                        <div className="font-semibold text-slate-900">
                          {Number.isFinite(foodCostPercentage) ? `${foodCostPercentage.toFixed(2)}%` : '0.00%'}
                        </div>
                        <div className="text-[11px] text-slate-500">Total {formatCurrencyPKR(sellingPriceTotal)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-px bg-slate-200 md:grid-cols-3 lg:grid-cols-[minmax(180px,1.15fr)_0.9fr_0.85fr_minmax(210px,1.15fr)_0.8fr_0.7fr]">
                      <div className="bg-white px-2.5 py-2 text-sm">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Ingredient Cost</div>
                        <div className="font-semibold text-slate-900">{formatCurrencyPKR(totalIngredientCost)}</div>
                        <div className="truncate text-[11px] text-slate-500">{standardRecipeIngredients.length} lines | {standardYieldSummary}</div>
                      </div>
                      <div className="bg-white px-2.5 py-2 text-sm">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Standard Cost</div>
                        <div className="font-semibold text-slate-900">{formatCurrencyPKR(totalRecipeCost)}</div>
                        <div className="text-[11px] text-slate-500">{formatCurrencyPKR(costPerYieldUnit)} / {yieldUnitLabel}</div>
                      </div>
                      <div className="bg-white px-2.5 py-2 text-sm">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Add-ons</div>
                        <div className="font-semibold text-slate-900">{formatCurrencyPKR(additionalCost + wastageCost)}</div>
                        <div className="truncate text-[11px] text-slate-500">{productionCostSummaryText}</div>
                      </div>
                      <div className="bg-white px-2.5 py-2 text-sm">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Selling Price / {yieldUnitLabel}</div>
                        {viewMode ? (
                          <div className="font-semibold text-slate-900">{formatCurrencyPKR(supplySellingPricePerYieldUnit)}</div>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={sellingPricePerYieldUnit}
                            onChange={(event) => setSellingPricePerYieldUnit(Number(event.target.value))}
                            className={`${compactInputClass} mt-1 text-right`}
                          />
                        )}
                        <div className="text-[11px] text-slate-500">Total {formatCurrencyPKR(sellingPriceTotal)}</div>
                      </div>
                      <div className="bg-white px-2.5 py-2 text-sm">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Margin / {yieldUnitLabel}</div>
                        <div className={`font-semibold ${marginPerYieldUnit < 0 ? 'text-red-700' : 'text-slate-900'}`}>{formatCurrencyPKR(marginPerYieldUnit)}</div>
                        <div className="text-[11px] text-slate-500">
                          {Number.isFinite(marginPercentage) ? `${marginPercentage.toFixed(2)}%` : '0.00%'}
                        </div>
                      </div>
                      <div className="bg-white px-2.5 py-2 text-sm">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Food Cost</div>
                        <div className="font-semibold text-slate-900">
                          {Number.isFinite(foodCostPercentage) ? `${foodCostPercentage.toFixed(2)}%` : '0.00%'}
                        </div>
                        <div className="text-[11px] text-slate-500">Recipe KPI</div>
                      </div>
                    </div>
                  )}
                </section>

                {!viewMode && !isPurchasedReadyDialog && copyableRecipes.length > 0 ? (
                  <section className="rounded border border-slate-200 bg-white">
                    <div className="grid gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 lg:grid-cols-[150px_minmax(260px,1fr)_auto]">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                        <Copy className="size-3.5" />
                        Copy From Recipe
                      </div>
                      <select
                        value={copySourceRecipeId}
                        onChange={(event) => setCopySourceRecipeId(event.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select saved recipe</option>
                        {copyableRecipes.map((recipe) => {
                          const sourceDish = dishes.find((dish) => dish.id === recipe.dishId);
                          return (
                            <option key={recipe.id} value={recipe.id}>
                              {recipe.recipeCode || 'Recipe'} | {recipe.recipeName || sourceDish?.dishName || 'Unnamed Recipe'}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        type="button"
                        onClick={handleApplyRecipeCopy}
                        className="inline-flex h-8 items-center justify-center gap-1 rounded border border-slate-700 bg-slate-700 px-2.5 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
                        disabled={!copySourceRecipeId}
                      >
                        <Copy className="size-3.5" />
                        Apply Copy
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 px-3 py-2 text-xs text-slate-700">
                      {[
                        ['ingredients', 'Ingredients'],
                        ['labor', 'Labor Costs'],
                        ['utility', 'Utility Costs'],
                        ['packaging', 'Packaging / Consumable Costs'],
                        ['other', 'Other Production Costs'],
                        ['yieldSetup', 'Standard Yield'],
                        ['notes', 'Preparation Notes'],
                      ].map(([key, label]) => (
                        <label key={key} className="inline-flex h-7 items-center gap-1.5 rounded border border-slate-200 bg-white px-2">
                          <input
                            type="checkbox"
                            checked={copyOptions[key as keyof RecipeCopyOptions]}
                            onChange={() => toggleCopyOption(key as keyof RecipeCopyOptions)}
                            className="size-3.5"
                          />
                          {label}
                        </label>
                      ))}
                      {selectedCopyRecipe ? (
                        <span className="text-[11px] text-slate-500">
                          {selectedCopyRecipe.ingredients.length} ingredients | {(selectedCopyRecipe.additionalCostLines || []).length} cost lines
                        </span>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                {!isPurchasedReadyDialog ? (
                  <>
                    <CollapsibleFormSection
                      title="Recipe Header"
                      open={recipeHeaderOpen}
                      onToggle={() => setRecipeHeaderOpen((current) => !current)}
                    >
                      <div>
                        <label className={labelClass}>Recipe Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={recipeName}
                          onChange={(event) => setRecipeName(event.target.value)}
                          disabled={viewMode}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Recipe Code</label>
                        <input type="text" value={recipeCode} readOnly className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Recipe Type <span className="text-red-500">*</span></label>
                        <select
                          value={recipeType}
                          onChange={(event) => setRecipeType(event.target.value as RecipeType)}
                          disabled={viewMode}
                          className={inputClass}
                        >
                          {recipeTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Recipe Category</label>
                        <select
                          value={recipeCategoryId}
                          onChange={(event) => setRecipeCategoryId(event.target.value)}
                          disabled={viewMode}
                          className={inputClass}
                        >
                          {recipeCategoryOptions.map((option) => (
                            <option key={option.value || 'none'} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Kitchen Section</label>
                        <select
                          value={kitchenSectionId}
                          onChange={(event) => setKitchenSectionId(event.target.value)}
                          disabled={viewMode}
                          className={inputClass}
                        >
                          {kitchenSectionOptions.map((option) => (
                            <option key={option.value || 'none'} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Status</label>
                        <select
                          value={recipeStatus}
                          onChange={(event) => setRecipeStatus(event.target.value as RecipeStatus)}
                          disabled={viewMode}
                          className={inputClass}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </CollapsibleFormSection>

                    <CollapsibleFormSection
                      title="Standard Yield"
                      open={yieldSetupOpen}
                      onToggle={() => setYieldSetupOpen((current) => !current)}
                    >
                      <div>
                        <label className={labelClass}>Standard Yield Quantity <span className="text-red-500">*</span></label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={yieldQuantity}
                          onChange={(event) => setYieldQuantity(Number(event.target.value))}
                          disabled={viewMode}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Standard Yield Unit <span className="text-red-500">*</span></label>
                        <select
                          value={yieldUnitId}
                          onChange={(event) => setYieldUnitId(event.target.value as MeasurementUnit)}
                          disabled={viewMode}
                          className={inputClass}
                        >
                          {resolvedYieldUnitOptions.map((unit) => (
                            <option key={unit.code} value={unit.code}>
                              {formatUnitOptionLabel(unit)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Preparation Time Minutes</label>
                        <input
                          type="number"
                          min="0"
                          value={preparationTimeMinutes}
                          onChange={(event) => setPreparationTimeMinutes(Number(event.target.value))}
                          disabled={viewMode}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Wastage</label>
                        <label className="flex h-8 items-center gap-2 rounded border border-slate-300 bg-white px-2.5 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={wastageEnabled}
                            onChange={(event) => handleWastageToggle(event.target.checked)}
                            disabled={viewMode}
                            className="size-4"
                          />
                          Enable wastage
                        </label>
                      </div>
                      {wastageEnabled ? (
                        <div>
                          <label className={labelClass}>Expected Wastage %</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={expectedWastagePercentage}
                            onChange={(event) => setExpectedWastagePercentage(Number(event.target.value))}
                            disabled={viewMode}
                            className={inputClass}
                          />
                        </div>
                      ) : null}
                      <div className="md:col-span-2">
                        <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          Define one standard yield for the dish. Production planning and scaled order quantities should be handled outside this recipe-costing screen.
                        </p>
                      </div>
                    </CollapsibleFormSection>
                  </>
                ) : null}

                <section className="rounded border border-slate-200 bg-white">
                  <div className="flex border-b border-slate-200 bg-slate-50 px-3 pt-2">
                    {!isPurchasedReadyDialog ? (
                      <button
                        type="button"
                        onClick={() => setRecipeActiveTab('ingredients')}
                        className={`h-8 rounded-t border border-b-0 px-3 text-xs font-semibold uppercase tracking-wide ${
                          recipeActiveTab === 'ingredients'
                            ? 'border-slate-200 bg-white text-slate-900'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Ingredients / BOM
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setRecipeActiveTab('costing')}
                      className={`h-8 rounded-t border border-b-0 px-3 text-xs font-semibold uppercase tracking-wide ${
                        recipeActiveTab === 'costing'
                          ? 'border-slate-200 bg-white text-slate-900'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {costingTabLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipeActiveTab('evaluation')}
                      className={`h-8 rounded-t border border-b-0 px-3 text-xs font-semibold uppercase tracking-wide ${
                        recipeActiveTab === 'evaluation'
                          ? 'border-slate-200 bg-white text-slate-900'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {evaluationTabLabel}
                    </button>
                  </div>

                  {recipeActiveTab === 'ingredients' ? (
                    <>
                      <div className="grid gap-2 border-b border-slate-200 px-3 py-2 md:grid-cols-[180px_1fr_auto_auto_auto]">
                        <select
                          value={ingredientCategoryFilter}
                          onChange={(event) => setIngredientCategoryFilter(event.target.value)}
                          className={inputClass}
                        >
                          <option value="">All Categories</option>
                          {ingredientCategoryOptions.map(([categoryKey, categoryLabel]) => (
                            <option key={categoryKey} value={categoryKey}>
                              {categoryLabel}
                            </option>
                          ))}
                        </select>
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search ingredient"
                            value={ingredientSearchTerm}
                            onChange={(event) => setIngredientSearchTerm(event.target.value)}
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                        <label className="flex h-8 items-center justify-center gap-2 rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={wastageEnabled}
                            onChange={(event) => handleWastageToggle(event.target.checked)}
                            disabled={viewMode}
                            className="size-4"
                          />
                          Wastage
                        </label>
                        {!viewMode ? (
                          <button
                            type="button"
                            onClick={() => setBulkIngredientPickerOpen((current) => !current)}
                            className="inline-flex h-8 items-center justify-center gap-1 rounded border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {bulkIngredientPickerOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                            Bulk Select
                          </button>
                        ) : null}
                        {!viewMode ? (
                          <button
                            type="button"
                            onClick={handleAddIngredient}
                            className="inline-flex h-8 items-center justify-center gap-1 rounded border border-blue-600 bg-blue-600 px-2.5 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            <Plus className="size-3.5" />
                            Add Ingredient
                          </button>
                        ) : null}
                      </div>
                      {bulkIngredientPickerOpen && !viewMode ? (
                        <div className="border-b border-slate-200 bg-white px-3 py-2">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs text-slate-600">
                              {selectedBulkIngredientIds.length} selected | {bulkIngredientOptions.length} available in current filter
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={toggleVisibleBulkIngredients}
                                className="h-7 rounded border border-slate-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                disabled={bulkIngredientOptions.length === 0}
                              >
                                {allVisibleBulkIngredientsSelected ? 'Clear Visible' : 'Select Visible'}
                              </button>
                              <button
                                type="button"
                                onClick={handleAddSelectedIngredients}
                                className="h-7 rounded border border-blue-600 bg-blue-600 px-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
                                disabled={selectedBulkIngredientIds.length === 0}
                              >
                                Add Selected
                              </button>
                            </div>
                          </div>
                          <div className="grid max-h-44 gap-px overflow-auto rounded border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {bulkIngredientOptions.map((item) => (
                              <label
                                key={item.id}
                                className="flex min-h-8 items-center gap-2 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedBulkIngredientSet.has(item.id)}
                                  onChange={() => toggleBulkIngredientSelection(item.id)}
                                  className="size-3.5"
                                />
                                <span className="min-w-0 flex-1 truncate">
                                  <span className="font-medium text-slate-900">{item.itemName}</span>
                                  <span className="text-slate-500"> | {formatIngredientCategoryLabel(getIngredientCategoryKey(item))}</span>
                                </span>
                              </label>
                            ))}
                            {bulkIngredientOptions.length === 0 ? (
                              <div className="bg-white px-3 py-5 text-center text-sm text-slate-500 sm:col-span-2 lg:col-span-3 xl:col-span-4">
                                No new ingredients available for the current filter.
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => setIngredientsOpen((current) => !current)}
                          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-700"
                        >
                          {ingredientsOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                          Ingredient Lines
                        </button>
                        <div className="text-[11px] text-slate-500">
                          {pricedRecipeIngredients.length} lines | Save order: category, highest cost
                        </div>
                      </div>
                      {ingredientsOpen ? (
                      <div className="max-h-[300px] overflow-auto">
                        <table className="w-full">
                          <thead className="sticky top-0 z-10 bg-slate-50">
                            <tr>
                              <th className={compactTableHeadClass}>Ingredient</th>
                              <th className={`${compactTableHeadClass} w-56 text-center`}>Chef Qty / Unit</th>
                              {wastageEnabled ? (
                                <th className={`${compactTableHeadClass} text-right`}>Wastage / Net</th>
                              ) : null}
                              <th className={`${compactTableHeadClass} text-right`}>Last Purchase Rate</th>
                              <th className={`${compactTableHeadClass} text-right`}>Ingredient Cost</th>
                              <th className={`${compactTableHeadClass} text-right`}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pricedRecipeIngredients.map((ingredient, index) => {
                              const selectedItemId = ingredient.itemId || ingredient.purchaseItemId;
                              const selectedItem = purchaseItems.find((item) => item.id === selectedItemId);
                              const ingredientOptions = getIngredientOptionsForRow(selectedItemId);
                              const ingredientUnitOptions = getIngredientUnitOptions(
                                selectedItem,
                                units,
                                ingredient.entryUnitId || ingredient.unit,
                              );
                              const latestUnitCost = selectedItem ? getPurchaseItemUnitCost(selectedItem, units) : 0;
                              const lastPurchaseRate =
                                selectedItem?.lastPurchaseRate || selectedItem?.lastCost || selectedItem?.defaultPurchaseCost || 0;
                              const purchaseUnit = selectedItem?.purchaseUnitId || selectedItem?.purchaseUnit || '-';

                              return (
                                <tr key={ingredient.id} className="border-t border-slate-200 hover:bg-slate-50">
                                  <td className={`${compactTableCellClass} min-w-[260px] py-1`}>
                                    <select
                                      value={selectedItemId}
                                      onChange={(event) => handleIngredientChange(index, 'itemId', event.target.value)}
                                      disabled={viewMode}
                                      className={compactInputClass}
                                    >
                                      {ingredientOptions.map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {item.itemName} | {formatIngredientCategoryLabel(getIngredientCategoryKey(item))}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className={`${compactTableCellClass} w-56 py-1`}>
                                    <div className="grid grid-cols-[minmax(96px,1fr)_84px] items-center gap-3">
                                      <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={ingredient.entryQuantity ?? ingredient.requiredQuantity ?? ingredient.quantity}
                                        onChange={(event) => handleIngredientChange(index, 'entryQuantity', Number(event.target.value))}
                                        disabled={viewMode}
                                        className={`${compactInputClass} text-right`}
                                      />
                                      <select
                                        value={ingredient.entryUnitId || ingredient.unit}
                                        onChange={(event) => handleIngredientChange(index, 'entryUnitId', event.target.value)}
                                        disabled={viewMode}
                                        className={compactInputClass}
                                      >
                                        {ingredientUnitOptions.map((unit) => (
                                          <option key={unit.code} value={unit.code}>
                                            {unit.code}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </td>
                                  {wastageEnabled ? (
                                    <td className={`${compactTableCellClass} w-44 py-1 text-right`}>
                                      <div className="flex items-center justify-end gap-2">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={ingredient.wastagePercentage || 0}
                                          onChange={(event) => handleIngredientChange(index, 'wastagePercentage', Number(event.target.value))}
                                          disabled={viewMode}
                                          className={`${compactInputClass} w-20 text-right`}
                                        />
                                        <span className="whitespace-nowrap text-[11px] text-slate-600">
                                          Net {Number(ingredient.netQuantity || 0).toFixed(2)} {ingredient.baseUnitId || '-'}
                                        </span>
                                      </div>
                                    </td>
                                  ) : null}
                                  <td className={`${compactTableCellClass} w-40 py-1 text-right`}>
                                    <div className="whitespace-nowrap font-semibold text-slate-900">
                                      {formatCurrencyPKR(lastPurchaseRate)} <span className="text-[11px] font-normal text-slate-500">/ {purchaseUnit}</span>
                                    </div>
                                  </td>
                                  <td className={`${compactTableCellClass} w-44 py-1 text-right`}>
                                    <div className="whitespace-nowrap font-semibold text-slate-900">
                                      {formatCurrencyPKR(ingredient.totalCost || 0)}{' '}
                                      <span className="text-[11px] font-normal text-slate-500">
                                        | {formatCurrencyPKR(latestUnitCost, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })} / {ingredient.baseUnitId || ingredient.unit}
                                      </span>
                                    </div>
                                  </td>
                                  <td className={`${compactTableCellClass} w-14 py-1 text-right`}>
                                    {!viewMode ? (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveIngredient(index)}
                                        title="Remove ingredient"
                                        className="inline-flex size-7 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-700"
                                      >
                                        <X className="size-3.5" />
                                      </button>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {recipeIngredients.length === 0 ? (
                              <tr>
                                <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={wastageEnabled ? 6 : 5}>
                                  No ingredients added yet.
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                      ) : null}
                    </>
                  ) : null}

                  {recipeActiveTab === 'costing' ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
                        <div className="flex flex-wrap overflow-hidden rounded border border-slate-200 bg-slate-200 text-xs">
                          {visibleProductionCostSummaries.map((entry) => (
                            <div key={entry.key} className="min-w-[96px] bg-white px-2.5 py-1">
                              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{entry.label}</div>
                              <div className="font-semibold text-slate-900">{formatCurrencyPKR(entry.amount)}</div>
                            </div>
                          ))}
                          <div className="min-w-[120px] bg-white px-2.5 py-1">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Standard Cost / {yieldUnitId}</div>
                            <div className="font-semibold text-slate-900">{formatCurrencyPKR(costPerYieldUnit)}</div>
                          </div>
                        </div>
                        {!viewMode ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleAddRecipeCostLine('labor')}
                              className="inline-flex h-8 items-center justify-center gap-1 rounded border border-blue-600 bg-blue-600 px-2.5 text-xs font-medium text-white hover:bg-blue-700"
                            >
                              <Plus className="size-3.5" />
                              Add Labor
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddRecipeCostLine('utility')}
                              className="inline-flex h-8 items-center justify-center gap-1 rounded border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Plus className="size-3.5" />
                              Add Utility
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddRecipeCostLine('packaging')}
                              className="inline-flex h-8 items-center justify-center gap-1 rounded border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Plus className="size-3.5" />
                              Add Packaging
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddRecipeCostLine('other')}
                              className="inline-flex h-8 items-center justify-center gap-1 rounded border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Plus className="size-3.5" />
                              Add Other
                            </button>
                          </div>
                        ) : null}
                      </div>
                      {isPurchasedReadyDialog ? (
                        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                          <span className="font-semibold text-slate-900">Purchased ready formula:</span>{' '}
                          linked purchase cost + labor + utilities + packaging + other production.
                          {selectedLinkedPurchaseItem ? (
                            <span className="ml-1 text-slate-500">
                              Cost source: {selectedLinkedPurchaseItem.itemName}
                            </span>
                          ) : (
                            <span className="ml-1 text-red-600">
                              Link a purchase item in Dish Master to complete costing.
                            </span>
                          )}
                        </div>
                      ) : null}
                      <div className="space-y-2 p-2">
                        {visibleProductionCostSections.map((entry) =>
                          renderCostSection(entry.category, entry.title, entry.rows, entry.total),
                        )}
                        {visibleProductionCostSections.length > 0 ? (
                          <div className="sticky bottom-0 z-10 flex items-center justify-between rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm shadow-sm">
                            <div className="font-semibold text-blue-950">Total Additional Production Cost</div>
                            <div className="text-base font-bold text-blue-950">{formatCurrencyPKR(additionalCost)}</div>
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : null}

                  {recipeActiveTab === 'evaluation' ? (
                    isPurchasedReadyDialog ? (
                      <>
                        <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 md:grid-cols-3 xl:grid-cols-6">
                          <div className="bg-white px-3 py-2 text-sm">
                            <div className="text-xs text-slate-500">Purchase Cost</div>
                            <div className="font-semibold text-slate-900">{formatCurrencyPKR(totalIngredientCost)}</div>
                          </div>
                          <div className="bg-white px-3 py-2 text-sm">
                            <div className="text-xs text-slate-500">Standard Dish Cost</div>
                            <div className="font-semibold text-slate-900">{formatCurrencyPKR(totalRecipeCost)}</div>
                          </div>
                          <div className="bg-white px-3 py-2 text-sm">
                            <div className="text-xs text-slate-500">Standard Cost / {yieldUnitId}</div>
                            <div className="font-semibold text-slate-900">{formatCurrencyPKR(costPerYieldUnit)}</div>
                          </div>
                          <div className="bg-white px-3 py-2 text-sm">
                            <div className="text-xs text-slate-500">Selling Price / {yieldUnitId}</div>
                            <div className="font-semibold text-slate-900">{formatCurrencyPKR(supplySellingPricePerYieldUnit)}</div>
                          </div>
                          <div className="bg-white px-3 py-2 text-sm">
                            <div className="text-xs text-slate-500">Margin / {yieldUnitId}</div>
                            <div className={`font-semibold ${marginPerYieldUnit < 0 ? 'text-red-700' : 'text-slate-900'}`}>{formatCurrencyPKR(marginPerYieldUnit)}</div>
                          </div>
                          <div className="bg-white px-3 py-2 text-sm">
                            <div className="text-xs text-slate-500">Margin %</div>
                            <div className="font-semibold text-slate-900">
                              {Number.isFinite(marginPercentage) ? `${marginPercentage.toFixed(2)}%` : '0.00%'}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                          <div className="overflow-hidden border border-slate-200">
                            <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                              Cost Breakdown
                            </div>
                            <table className="w-full">
                              <tbody>
                                {evaluationCostBreakdownRows.map((row) => (
                                  <tr key={row.label} className="border-t border-slate-200 first:border-t-0">
                                    <td className={compactTableCellClass}>{row.label === 'Ingredients' ? 'Purchase Cost' : row.label}</td>
                                    <td className={`${compactTableCellClass} text-right font-semibold text-slate-900`}>{formatCurrencyPKR(row.amount)}</td>
                                    <td className={`${compactTableCellClass} text-right`}>{formatShare(row.amount, totalRecipeCost)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="space-y-3">
                            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Linked Purchase Item</div>
                              <div className="mt-1 font-semibold text-slate-900">
                                {selectedLinkedPurchaseItem ? selectedLinkedPurchaseItem.itemName : 'Not linked'}
                              </div>
                              <div className="mt-1 text-xs text-slate-600">
                                {selectedLinkedPurchaseItem
                                  ? `Source cost per unit: ${formatCurrencyPKR(selectedPurchasedReadyUnitCost)}`
                                  : 'Link a purchased item in Dish Master so purchased-ready costing can read the vendor cost.'}
                              </div>
                            </div>
                            <div className="rounded border border-slate-200 bg-white">
                              <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                                Commercial Totals
                              </div>
                              <table className="w-full">
                                <tbody>
                                  <tr className="border-t border-slate-200 first:border-t-0">
                                    <td className={compactTableCellClass}>Food Cost %</td>
                                    <td className={`${compactTableCellClass} text-right font-semibold text-slate-900`}>
                                      {Number.isFinite(foodCostPercentage) ? `${foodCostPercentage.toFixed(2)}%` : '0.00%'}
                                    </td>
                                  </tr>
                                  <tr className="border-t border-slate-200">
                                    <td className={compactTableCellClass}>Selling Price Total</td>
                                    <td className={`${compactTableCellClass} text-right font-semibold text-slate-900`}>{formatCurrencyPKR(sellingPriceTotal)}</td>
                                  </tr>
                                  <tr className="border-t border-slate-200">
                                    <td className={compactTableCellClass}>Total Margin</td>
                                    <td className={`${compactTableCellClass} text-right font-semibold ${totalMargin < 0 ? 'text-red-700' : 'text-slate-900'}`}>
                                      {formatCurrencyPKR(totalMargin)}
                                    </td>
                                  </tr>
                                  <tr className="border-t border-slate-200">
                                    <td className={compactTableCellClass}>Standard Yield</td>
                                    <td className={`${compactTableCellClass} text-right font-semibold text-slate-900`}>
                                      {yieldQuantity} {yieldUnitId}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 md:grid-cols-3 xl:grid-cols-6">
                          <div className="bg-white px-3 py-2 text-sm">
                            <div className="text-xs text-slate-500">Standard Dish Cost</div>
                            <div className="font-semibold text-slate-900">{formatCurrencyPKR(totalRecipeCost)}</div>
                          </div>
                          <div className="bg-white px-3 py-2 text-sm">
                            <div className="text-xs text-slate-500">Ingredient Cost</div>
                            <div className="font-semibold text-slate-900">{formatCurrencyPKR(totalIngredientCost)}</div>
                          </div>
                          <div className="bg-white px-3 py-2 text-sm">
                            <div className="text-xs text-slate-500">Standard Cost / {yieldUnitId}</div>
                            <div className="font-semibold text-slate-900">{formatCurrencyPKR(costPerYieldUnit)}</div>
                          </div>
                          <div className="bg-white px-3 py-2 text-sm">
                            <div className="text-xs text-slate-500">Standard Yield</div>
                            <div className="font-semibold text-slate-900">{yieldQuantity} {yieldUnitId}</div>
                          </div>
                          <div className="bg-white px-3 py-2 text-sm">
                            <div className="text-xs text-slate-500">Selling Price / {yieldUnitId}</div>
                            <div className="font-semibold text-slate-900">{formatCurrencyPKR(supplySellingPricePerYieldUnit)}</div>
                          </div>
                          <div className="bg-white px-3 py-2 text-sm">
                            <div className="text-xs text-slate-500">Margin / {yieldUnitId}</div>
                            <div className={`font-semibold ${marginPerYieldUnit < 0 ? 'text-red-700' : 'text-slate-900'}`}>{formatCurrencyPKR(marginPerYieldUnit)}</div>
                          </div>
                          <div className="bg-white px-3 py-2 text-sm">
                            <div className="text-xs text-slate-500">Food Cost %</div>
                            <div className="font-semibold text-slate-900">
                              {Number.isFinite(foodCostPercentage) ? `${foodCostPercentage.toFixed(2)}%` : '0.00%'}
                            </div>
                          </div>
                          <div className="bg-white px-3 py-2 text-sm">
                            <div className="text-xs text-slate-500">Margin %</div>
                            <div className="font-semibold text-slate-900">
                              {Number.isFinite(marginPercentage) ? `${marginPercentage.toFixed(2)}%` : '0.00%'}
                            </div>
                          </div>
                          <div className="bg-white px-3 py-2 text-sm">
                            <div className="text-xs text-slate-500">Selling Price Total</div>
                            <div className="font-semibold text-slate-900">{formatCurrencyPKR(sellingPriceTotal)}</div>
                          </div>
                        </div>

                        <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
                          <div className="overflow-hidden border border-slate-200">
                            <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                              Ingredient Cost Ranking
                            </div>
                            <div className="max-h-[320px] overflow-auto">
                              <table className="w-full">
                                <thead className="sticky top-0 z-10 bg-slate-50">
                                  <tr>
                                    <th className={compactTableHeadClass}>Rank</th>
                                    <th className={compactTableHeadClass}>Category</th>
                                    <th className={compactTableHeadClass}>Ingredient</th>
                                    <th className={`${compactTableHeadClass} text-right`}>Scaled Qty</th>
                                    <th className={`${compactTableHeadClass} text-right`}>Last Purchase Rate</th>
                                    <th className={`${compactTableHeadClass} text-right`}>Cost</th>
                                    <th className={`${compactTableHeadClass} text-right`}>Share</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sortedEvaluationIngredientRows.map((row) => (
                                    <tr key={row.ingredient.id} className="border-t border-slate-200">
                                      <td className={compactTableCellClass}>{row.rank}</td>
                                      <td className={compactTableCellClass}>{row.snapshot.categoryName}</td>
                                      <td className={compactTableCellClass}>
                                        <div className="font-medium text-slate-900">{row.snapshot.itemName}</div>
                                        <div className="text-[11px] text-slate-500">
                                          {formatCurrencyPKR(row.ingredient.unitCost ?? row.ingredient.costPerUnit ?? 0, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })} / {row.ingredient.baseUnitId || row.ingredient.unit}
                                        </div>
                                      </td>
                                      <td className={`${compactTableCellClass} text-right`}>
                                        {(row.ingredient.scaledBaseQuantity || 0).toFixed(3)} {row.ingredient.baseUnitId || '-'}
                                      </td>
                                      <td className={`${compactTableCellClass} text-right`}>
                                        <div className="font-medium text-slate-900">{formatCurrencyPKR(row.snapshot.lastPurchaseRate)}</div>
                                        <div className="text-[11px] text-slate-500">/{row.snapshot.lastPurchaseUnit}</div>
                                      </td>
                                      <td className={`${compactTableCellClass} text-right font-semibold text-slate-900`}>
                                        {formatCurrencyPKR(row.ingredient.totalCost || 0)}
                                      </td>
                                      <td className={`${compactTableCellClass} text-right`}>{row.recipeShare}</td>
                                    </tr>
                                  ))}
                                  {sortedEvaluationIngredientRows.length === 0 ? (
                                    <tr>
                                      <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={7}>
                                        No ingredient costs to evaluate yet.
                                      </td>
                                    </tr>
                                  ) : null}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="overflow-hidden border border-slate-200">
                              <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                                Category Cost
                              </div>
                              <table className="w-full">
                                <thead className="bg-slate-50">
                                  <tr>
                                    <th className={compactTableHeadClass}>Category</th>
                                    <th className={`${compactTableHeadClass} text-right`}>Lines</th>
                                    <th className={`${compactTableHeadClass} text-right`}>Cost</th>
                                    <th className={`${compactTableHeadClass} text-right`}>Share</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ingredientCategoryCostRows.map((row) => (
                                    <tr key={row.categoryId} className="border-t border-slate-200">
                                      <td className={compactTableCellClass}>{row.categoryName}</td>
                                      <td className={`${compactTableCellClass} text-right`}>{row.ingredientCount}</td>
                                      <td className={`${compactTableCellClass} text-right font-semibold text-slate-900`}>{formatCurrencyPKR(row.cost)}</td>
                                      <td className={`${compactTableCellClass} text-right`}>{row.recipeShare}</td>
                                    </tr>
                                  ))}
                                  {ingredientCategoryCostRows.length === 0 ? (
                                    <tr>
                                      <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={4}>
                                        No categories yet.
                                      </td>
                                    </tr>
                                  ) : null}
                                </tbody>
                              </table>
                            </div>

                            <div className="overflow-hidden border border-slate-200">
                              <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                                Cost Breakdown
                              </div>
                              <table className="w-full">
                                <tbody>
                                  {evaluationCostBreakdownRows.map((row) => (
                                    <tr key={row.label} className="border-t border-slate-200 first:border-t-0">
                                      <td className={compactTableCellClass}>{row.label}</td>
                                      <td className={`${compactTableCellClass} text-right font-semibold text-slate-900`}>{formatCurrencyPKR(row.amount)}</td>
                                      <td className={`${compactTableCellClass} text-right`}>{formatShare(row.amount, totalRecipeCost)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </>
                    )
                  ) : null}
                </section>

                <section className="rounded border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setPreparationNotesOpen((current) => !current)}
                    className="flex w-full items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-700"
                  >
                    <span className="inline-flex items-center gap-2">
                      {preparationNotesOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      Preparation Notes
                    </span>
                    <span className="text-[11px] font-medium normal-case tracking-normal text-slate-500">
                      {preparationSteps.trim() ? 'Notes added' : 'Empty'}
                    </span>
                  </button>
                  {preparationNotesOpen ? (
                    <div className="p-3">
                      <label className={labelClass}>Preparation Steps</label>
                      <textarea
                        value={preparationSteps}
                        onChange={(event) => setPreparationSteps(event.target.value)}
                        disabled={viewMode}
                        className={textareaClass}
                      />
                    </div>
                  ) : null}
                </section>

              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                onClick={closeDialog}
                className="h-8 rounded border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-white"
              >
                {viewMode ? 'Close' : 'Cancel'}
              </button>
              {!viewMode ? (
                <button
                  onClick={handleSaveRecipe}
                  className="h-8 rounded border border-blue-600 bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {saveButtonLabel}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
