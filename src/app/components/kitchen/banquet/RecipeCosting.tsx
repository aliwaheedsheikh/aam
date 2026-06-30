import { Fragment, type DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Edit2, Eye, FileText, GripVertical, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrencyPKR, formatDatePK } from '../../../lib/locale';
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
  MenuPackageChoiceGroup,
  ProductionCostMethod,
  PurchaseItem,
  Recipe,
  RecipeCostLine,
  RecipeCostLineBasis,
  RecipeCostLineCategory,
  RecipeIngredient,
  UnitMaster,
} from '../types';
import {
  getDefaultProductionCostMethodUnit,
  getProductionCostMethodOptionsForCategory,
  getProductionCostMethodQuantityLabel,
  getProductionCostMethodRateLabel,
  getRecipeCostLineDefaultMethod,
  isProductionCostMethodQuantityEditable,
  normalizeRecipeCostLineBasis,
  resolveProductionCostMethodFromLine,
  shouldProductionCostMethodShowQuantity,
  shouldProductionCostMethodShowReference,
} from '../../../lib/productionCostMethods';

interface RecipeCostingProps {
  userName: string;
  dishes: Dish[];
  recipes: Recipe[];
  purchaseItems: PurchaseItem[];
  units: UnitMaster[];
  productionCostMethods: ProductionCostMethod[];
  menuPackages: MenuPackage[];
  onDishesChange: (dishes: Dish[]) => void;
  onRecipesChange: (recipes: Recipe[]) => void;
  onMenuPackagesChange: (packages: MenuPackage[]) => void;
}

type RecipePresenceFilter = 'all' | 'with-recipe' | 'without-recipe';
type ProductionTypeFilter = 'all' | 'recipe-based' | 'purchased-ready' | 'service-item';
type CostingStatusFilter =
  | 'all'
  | 'complete'
  | 'missing-purchase-rate'
  | 'missing-ingredient-cost'
  | 'missing-labor'
  | 'missing-utility'
  | 'missing-packaging'
  | 'unit-conversion-missing'
  | 'yield-missing'
  | 'missing-cost-link'
  | 'inactive-recipe'
  | 'missing-recipe';
type RecipeStateFilter = 'all' | 'active' | 'inactive' | 'missing-recipe' | 'not-required';
type MissingConfigFilter =
  | 'all'
  | 'missing-ingredient-cost'
  | 'missing-purchase-rate'
  | 'missing-labor'
  | 'missing-utility'
  | 'missing-packaging'
  | 'unit-conversion-missing'
  | 'yield-missing'
  | 'missing-category'
  | 'missing-kitchen-section'
  | 'missing-cost-link';
type RegisterSortKey =
  | 'severity'
  | 'dish'
  | 'recipe-type'
  | 'yield'
  | 'ingredient-cost'
  | 'total-cost'
  | 'cost-per-unit'
  | 'updated-at';
type SellableProductionType = Extract<Dish['productionType'], 'recipe-based' | 'purchased-ready' | 'service-item'>;
type CostingStatusKey =
  | 'complete'
  | 'missing-purchase-rate'
  | 'missing-ingredient-cost'
  | 'missing-labor'
  | 'missing-utility'
  | 'missing-packaging'
  | 'unit-conversion-missing'
  | 'yield-missing'
  | 'missing-cost-link'
  | 'inactive-recipe'
  | 'missing-recipe';
type RecipeType = NonNullable<Recipe['recipeType']>;
type RecipeStatus = NonNullable<Recipe['status']>;
type RecipeDialogTab = 'ingredients' | 'costing' | 'evaluation';
type RecipeEvaluationMode = 'profit-percent' | 'profit-per-unit';
type OptionalProductionCostSection = 'utility' | 'packaging' | 'other';
type OptionalProductionCostSectionState = Record<OptionalProductionCostSection, boolean>;
type RecipeCopyOptions = {
  ingredients: boolean;
  labor: boolean;
  utility: boolean;
  packaging: boolean;
  other: boolean;
  yieldSetup: boolean;
  notes: boolean;
};

const tableHeadClass = 'px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-2.5 py-1.5 text-xs text-slate-700 align-middle';
const compactTableHeadClass = 'px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-600';
const compactTableCellClass = 'px-2 py-1.5 text-xs text-slate-700 align-middle';
const inputClass = 'h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500';
const compactInputClass = 'h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-xs text-slate-800 hover:border-slate-300 hover:bg-white focus:border-blue-500 focus:bg-white focus:outline-none disabled:text-slate-600';
const compactSetupInputClass = 'h-7 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-700 disabled:bg-slate-50 disabled:text-slate-500';
const compactSetupToggleClass = 'flex h-7 items-center gap-2 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700 disabled:bg-slate-50 disabled:text-slate-500';
const ingredientToolbarInputClass = 'h-7 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-700 disabled:bg-slate-50 disabled:text-slate-500';
const ingredientToolbarButtonClass = 'inline-flex h-7 items-center justify-center gap-1 rounded border border-slate-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50';
const ingredientPrimaryButtonClass = 'inline-flex h-7 items-center justify-center gap-1 rounded border border-blue-600 bg-blue-600 px-2 text-xs font-medium text-white hover:bg-blue-700';
const ingredientRowInputClass = 'h-6 w-full rounded border border-transparent bg-transparent px-1 text-[11px] text-slate-800 hover:border-slate-300 hover:bg-white focus:border-blue-500 focus:bg-white focus:outline-none disabled:text-slate-600';
const costLineInputClass = 'h-6 w-full rounded border border-transparent bg-transparent px-1 text-[11px] text-slate-800 hover:border-slate-300 hover:bg-white focus:border-blue-500 focus:bg-white focus:outline-none disabled:text-slate-600';
const costLineStaticClass = 'flex h-6 items-center rounded border border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-500';
const textareaClass = 'min-h-[80px] w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500';
const labelClass = 'mb-1 block text-xs font-medium text-slate-700';
const compactSetupLabelClass = 'mb-0.5 block text-[11px] font-medium text-slate-700';
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

const defaultOptionalProductionCostSectionState: OptionalProductionCostSectionState = {
  utility: false,
  packaging: false,
  other: false,
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

const productionTypeOptions: Array<{ value: SellableProductionType; label: string }> = [
  { value: 'recipe-based', label: 'Recipe Based' },
  { value: 'purchased-ready', label: 'Purchased Ready' },
  { value: 'service-item', label: 'Service Item' },
];

const missingConfigOptions: Array<{ value: MissingConfigFilter; label: string }> = [
  { value: 'all', label: 'All Config' },
  { value: 'missing-ingredient-cost', label: 'Missing Ingredient Cost' },
  { value: 'missing-purchase-rate', label: 'Missing Purchase Rate' },
  { value: 'missing-labor', label: 'Missing Labor Cost' },
  { value: 'missing-utility', label: 'Missing Utility Cost' },
  { value: 'missing-packaging', label: 'Missing Packaging Cost' },
  { value: 'unit-conversion-missing', label: 'Unit Conversion Missing' },
  { value: 'yield-missing', label: 'Yield Missing' },
  { value: 'missing-category', label: 'Missing Category' },
  { value: 'missing-kitchen-section', label: 'Missing Kitchen Section' },
  { value: 'missing-cost-link', label: 'Missing Cost Link' },
];

const costingStatusOptions: Array<{ value: CostingStatusFilter; label: string }> = [
  { value: 'all', label: 'All Validation' },
  { value: 'complete', label: 'Complete' },
  { value: 'missing-purchase-rate', label: 'Missing Purchase Rate' },
  { value: 'missing-ingredient-cost', label: 'Missing Ingredient Cost' },
  { value: 'missing-labor', label: 'Missing Labor' },
  { value: 'missing-utility', label: 'Missing Utility' },
  { value: 'missing-packaging', label: 'Missing Packaging' },
  { value: 'unit-conversion-missing', label: 'Unit Conversion Missing' },
  { value: 'yield-missing', label: 'Yield Missing' },
  { value: 'missing-cost-link', label: 'Missing Cost Link' },
  { value: 'inactive-recipe', label: 'Inactive Recipe' },
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
  { value: 'recipe-type', label: 'Recipe Type' },
  { value: 'yield', label: 'Standard Yield' },
  { value: 'ingredient-cost', label: 'Ingredient Cost' },
  { value: 'total-cost', label: 'Total Recipe Cost' },
  { value: 'cost-per-unit', label: 'Cost Per Output Unit' },
  { value: 'updated-at', label: 'Last Edit' },
];

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
const formatPerOutputUnitValue = (amount: number, unit?: string) => `${formatCurrencyPKR(amount)}/${formatSalesUnitLabel(unit)}`;

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
  const variants = dish.salesVariants?.length
    ? dish.salesVariants
    : [buildFallbackSalesVariant(dish, costPerYieldUnit)];
  const hasDefaultVariant = variants.some((variant) => variant.isDefault);
  const recostedVariants = variants.map((variant, index) => {
    const quantity = Number(variant.quantity ?? variant.salesQuantity ?? 1) || 1;
    const salesUnit = variant.salesUnit || variant.salesUnitId || dish.unitOfSale || 'portion';

    return {
      ...variant,
      salesUnit,
      salesUnitId: variant.salesUnitId || salesUnit,
      quantity,
      salesQuantity: quantity,
      quantityUnit: variant.quantityUnit || salesUnit,
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

const getChoiceGroupCostPerHead = (choiceGroup: MenuPackageChoiceGroup) => {
  if (choiceGroup.dishes.length === 0) {
    return 0;
  }

  if (choiceGroup.costingMethod === 'highest-cost') {
    return Math.max(...choiceGroup.dishes.map((dish) => dish.costPerHead || 0));
  }

  if (choiceGroup.costingMethod === 'average-cost') {
    return (
      choiceGroup.dishes.reduce((sum, dish) => sum + (dish.costPerHead || 0), 0) /
      Math.max(choiceGroup.dishes.length, 1)
    );
  }

  const defaultDish = choiceGroup.dishes.find((dish) => dish.dishId === choiceGroup.defaultDishId);
  return defaultDish?.costPerHead || choiceGroup.dishes[0]?.costPerHead || 0;
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
    const recostedChoiceGroups = (menuPackage.choiceGroups || []).map((choiceGroup) => {
      let groupChanged = false;
      const recostedGroupDishes = choiceGroup.dishes.map((packageDish) => {
        if (packageDish.dishId !== updatedDish.id) {
          return packageDish;
        }

        groupChanged = true;
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

      if (!groupChanged) {
        return choiceGroup;
      }

      packageChanged = true;
      return {
        ...choiceGroup,
        dishes: recostedGroupDishes,
      };
    });

    if (!packageChanged) {
      return menuPackage;
    }

    return {
      ...menuPackage,
      dishes: recostedDishes,
      choiceGroups: recostedChoiceGroups,
      totalCostPerHead:
        recostedDishes.reduce((sum, dish) => sum + (dish.costPerHead || 0), 0) +
        recostedChoiceGroups.reduce((sum, choiceGroup) => sum + getChoiceGroupCostPerHead(choiceGroup), 0),
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
    case 'complete':
      return 'Complete';
    case 'missing-purchase-rate':
      return 'Missing Purchase Rate';
    case 'missing-ingredient-cost':
      return 'Missing Ingredient Cost';
    case 'missing-labor':
      return 'Missing Labor';
    case 'missing-utility':
      return 'Missing Utility';
    case 'missing-packaging':
      return 'Missing Packaging';
    case 'unit-conversion-missing':
      return 'Unit Conversion Missing';
    case 'yield-missing':
      return 'Yield Missing';
    case 'missing-cost-link':
      return 'Missing Cost Link';
    case 'inactive-recipe':
      return 'Inactive Recipe';
    case 'missing-recipe':
      return 'Missing Recipe';
    default:
      return status;
  }
};

const getCostingStatusBadgeClass = (status: CostingStatusKey) => {
  if (status === 'complete') {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (status === 'inactive-recipe') {
    return 'bg-slate-100 text-slate-600';
  }
  if (status === 'yield-missing' || status === 'unit-conversion-missing') {
    return 'bg-amber-100 text-amber-700';
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

const getRecipeMissingDataBadges = (row: {
  missingIngredientCost: boolean;
  missingPurchaseRate: boolean;
  missingLabor: boolean;
  missingUtility: boolean;
  missingPackaging: boolean;
  missingYield: boolean;
  unitConversionMissing: boolean;
  missingCostLink: boolean;
  missingCategory: boolean;
  missingKitchenSection: boolean;
}) => {
  const badges: string[] = [];
  if (row.missingIngredientCost) {
    badges.push('Missing ingredient cost');
  }
  if (row.missingPurchaseRate) {
    badges.push('Missing purchase rate');
  }
  if (row.missingLabor) {
    badges.push('Missing labor');
  }
  if (row.missingUtility) {
    badges.push('Missing utility');
  }
  if (row.missingPackaging) {
    badges.push('Missing packaging');
  }
  if (row.unitConversionMissing) {
    badges.push('Unit conversion missing');
  }
  if (row.missingYield) {
    badges.push('Yield missing');
  }
  if (row.missingCostLink) {
    badges.push('Missing cost link');
  }
  if (row.missingCategory) {
    badges.push('Missing category');
  }
  if (row.missingKitchenSection) {
    badges.push('Missing kitchen section');
  }
  return badges;
};

const deriveOptionalProductionCostSectionState = (recipe?: Recipe): OptionalProductionCostSectionState => {
  if (!recipe) {
    return defaultOptionalProductionCostSectionState;
  }

  const snapshot = getRecipeStandardCostSnapshot(recipe);
  const hasCategoryLine = (category: OptionalProductionCostSection) =>
    (recipe.additionalCostLines || []).some((line) => line.category === category);

  return {
    utility:
      typeof recipe.utilityCostEnabled === 'boolean'
        ? recipe.utilityCostEnabled
        : hasCategoryLine('utility') || snapshot.utilityFuelCost > 0,
    packaging:
      typeof recipe.packagingCostEnabled === 'boolean'
        ? recipe.packagingCostEnabled
        : hasCategoryLine('packaging') || snapshot.packagingConsumableCost > 0,
    other:
      typeof recipe.otherProductionCostEnabled === 'boolean'
        ? recipe.otherProductionCostEnabled
        : hasCategoryLine('other') || snapshot.otherProductionCost > 0,
  };
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

const getPurchaseItemRateForUnit = (
  item: PurchaseItem | undefined,
  unitId: MeasurementUnit | undefined,
  units: UnitMaster[] = [],
) => {
  if (!item) {
    return 0;
  }

  const purchaseRate = getPurchaseItemLastPurchaseRate(item);
  const purchaseUnitId = item.purchaseUnitId || item.purchaseUnit;
  if (!unitId || !purchaseUnitId || unitId === purchaseUnitId) {
    return purchaseRate;
  }

  const convertedPurchaseQuantity = convertUnitQuantity(1, unitId, purchaseUnitId, units);
  if (convertedPurchaseQuantity !== null && convertedPurchaseQuantity > 0) {
    return purchaseRate * convertedPurchaseQuantity;
  }

  if (unitId === getBaseUnit(item)) {
    return getPurchaseItemUnitCost(item, units);
  }

  return purchaseRate;
};

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
      return 'Utilities';
    case 'packaging':
      return 'Packaging';
    case 'other':
      return 'Other Production';
    default:
      return 'Cost';
  }
};

const getRecipeCostLineDefaultName = (category: RecipeCostLineCategory) => {
  switch (category) {
    case 'labor':
      return 'Labor Cost';
    case 'utility':
      return 'Utility Cost';
    case 'packaging':
      return 'Packaging Cost';
    case 'other':
      return 'Other Production Cost';
    default:
      return 'Cost Line';
  }
};

const getRecipeCostLinePlaceholder = (category: RecipeCostLineCategory) => {
  switch (category) {
    case 'labor':
      return 'Optional description';
    case 'utility':
      return 'Optional description';
    case 'packaging':
      return 'Optional description';
    case 'other':
      return 'Optional description';
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

const trackedManualCostCategories = new Set<RecipeCostLineCategory>(['labor', 'utility', 'other']);

const toTrackedNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const getTrackedIngredientEntries = (ingredients: RecipeIngredient[] = []) =>
  [...ingredients]
    .map((ingredient) => ({
      itemId: ingredient.itemId || ingredient.purchaseItemId || '',
      unit: ingredient.entryUnitId || ingredient.unit || ingredient.baseUnitId || '',
      quantity: toTrackedNumber(ingredient.entryQuantity ?? ingredient.requiredQuantity ?? ingredient.quantity),
    }))
    .sort((left, right) =>
      left.itemId.localeCompare(right.itemId) ||
      left.unit.localeCompare(right.unit) ||
      left.quantity - right.quantity,
    );

const getTrackedManualCostLineEntries = (lines: RecipeCostLine[] = []) =>
  [...lines]
    .filter((line) => trackedManualCostCategories.has(line.category))
    .map((line) => ({
      category: line.category,
      name: String(line.name || '').trim(),
      calculationBasis: line.calculationBasis,
      calculationMethodId: line.calculationMethodId || '',
      quantity: toTrackedNumber(line.quantity),
      capacityQuantity: toTrackedNumber(line.capacityQuantity),
      unit: line.unit || '',
      ingredientReferenceId: line.ingredientReferenceId || '',
      sortOrder: toTrackedNumber(line.sortOrder),
    }))
    .sort((left, right) =>
      left.category.localeCompare(right.category) ||
      left.name.localeCompare(right.name) ||
      left.calculationBasis.localeCompare(right.calculationBasis) ||
      left.calculationMethodId.localeCompare(right.calculationMethodId) ||
      left.ingredientReferenceId.localeCompare(right.ingredientReferenceId) ||
      left.unit.localeCompare(right.unit) ||
      left.quantity - right.quantity ||
      left.capacityQuantity - right.capacityQuantity ||
      left.sortOrder - right.sortOrder,
    );

const buildRecipeManualEditSignature = ({
  ingredients,
  additionalCostLines,
  utilityCostEnabled,
  otherProductionCostEnabled,
}: Pick<Recipe, 'ingredients' | 'additionalCostLines' | 'utilityCostEnabled' | 'otherProductionCostEnabled'>) =>
  JSON.stringify({
    ingredients: getTrackedIngredientEntries(ingredients),
    additionalCostLines: getTrackedManualCostLineEntries(additionalCostLines),
    utilityCostEnabled: Boolean(utilityCostEnabled),
    otherProductionCostEnabled: Boolean(otherProductionCostEnabled),
  });

const hasRecipeManualEditChanged = (
  currentRecipe: Recipe | undefined,
  nextRecipe: Pick<Recipe, 'ingredients' | 'additionalCostLines' | 'utilityCostEnabled' | 'otherProductionCostEnabled'>,
) => {
  if (!currentRecipe) {
    return true;
  }

  return buildRecipeManualEditSignature(currentRecipe) !== buildRecipeManualEditSignature(nextRecipe);
};

const getRecipeRegisterLastEditAt = (recipe?: Recipe, dish?: Dish) =>
  recipe?.costingEditedAt || recipe?.updatedAt || dish?.updatedAt;

const formatCountLabel = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const getRecipeIngredientStatus = (
  ingredient: RecipeIngredient,
  linkedItem: PurchaseItem | undefined,
  units: UnitMaster[],
) => {
  const entryQuantity = Number(ingredient.entryQuantity ?? ingredient.requiredQuantity ?? ingredient.quantity) || 0;
  const entryUnitId = ingredient.entryUnitId || ingredient.unit || '-';
  const entryUnitLabel = formatUnitLabel(entryUnitId, units) || entryUnitId;
  const baseUnitId = ingredient.baseUnitId || linkedItem?.baseUnitId || linkedItem?.issueUnit || entryUnitId;
  const baseUnitLabel = formatUnitLabel(baseUnitId, units) || baseUnitId;
  const purchaseUnitId = linkedItem
    ? getPurchaseItemPurchaseUnit(linkedItem)
    : ingredient.lastPurchaseUnit || baseUnitId;
  const purchaseUnitLabel = formatUnitLabel(purchaseUnitId, units) || purchaseUnitId || '-';
  const lastPurchaseRate =
    linkedItem?.lastPurchaseRate || linkedItem?.lastCost || linkedItem?.defaultPurchaseCost || ingredient.lastPurchaseRate || 0;
  const unitCost = ingredient.unitCost ?? ingredient.costPerUnit ?? 0;

  if (!linkedItem) {
    return {
      label: 'Item missing',
      badgeClass: 'bg-red-100 text-red-700',
      detail: 'This ingredient is no longer linked to an active purchase item in Purchase Item Master.',
    };
  }

  if (entryQuantity <= 0) {
    return {
      label: 'Qty missing',
      badgeClass: 'bg-amber-100 text-amber-700',
      detail: 'Enter the consumed quantity used in the recipe.',
    };
  }

  if (ingredient.baseQuantity == null) {
    return {
      label: 'Unit mapping needed',
      badgeClass: 'bg-amber-100 text-amber-700',
      detail: `Cannot convert ${formatDisplayQuantity(entryQuantity)} ${entryUnitLabel} to ${baseUnitLabel}. Set the purchase/base unit mapping in Purchase Item Master.`,
    };
  }

  if (lastPurchaseRate <= 0) {
    return {
      label: 'Missing rate',
      badgeClass: 'bg-red-100 text-red-700',
      detail: `No last purchase cost is available for ${linkedItem.itemName}. Enter a purchase rate before relying on this recipe cost.`,
    };
  }

  return {
    label: 'Ready',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    detail: `${formatDisplayQuantity(entryQuantity)} ${entryUnitLabel} converts to ${formatDisplayQuantity(ingredient.baseQuantity || 0)} ${baseUnitLabel}. Last purchase cost ${formatCurrencyPKR(lastPurchaseRate)} / ${purchaseUnitLabel}. Internal cost ${formatCurrencyPKR(unitCost, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} / ${baseUnitLabel}. Final amount ${formatCurrencyPKR(ingredient.totalCost || 0)}.`,
  };
};

const laborPerKgInputUnit = 'kg';
const shouldShowRecipeCostReference = (line: RecipeCostLine, methods: ProductionCostMethod[]) => {
  const selectedMethod = resolveProductionCostMethodFromLine(line, methods);
  return shouldProductionCostMethodShowReference(selectedMethod, line.calculationBasis, line.category);
};

const getRecipeCostLineNameColumnLabel = (_category: RecipeCostLineCategory) => 'Description';

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

const getYieldQuantityInTargetUnit = (
  effectiveYield: number,
  yieldUnitId: MeasurementUnit | undefined,
  targetUnit: MeasurementUnit,
  units: UnitMaster[] = [],
) => {
  const yieldQuantity = Math.max(effectiveYield || 0, 0);
  if (yieldQuantity <= 0) {
    return 0;
  }

  if (!yieldUnitId || yieldUnitId === targetUnit) {
    return yieldQuantity;
  }

  const convertedQuantity = convertUnitQuantity(yieldQuantity, yieldUnitId, targetUnit, units);
  return Math.max(convertedQuantity ?? yieldQuantity, 0);
};

const getReferencedIngredientQuantityInKg = (
  line: RecipeCostLine,
  ingredients: RecipeIngredient[] = [],
  purchaseItems: PurchaseItem[] = [],
  units: UnitMaster[] = [],
) => {
  if (line.category === 'labor' && !line.ingredientReferenceId) {
    return Math.max(getRecipeInputQuantityInKg(ingredients, units), 0);
  }

  const referencedIngredient = findReferencedIngredient(line, ingredients, purchaseItems);
  const referencedQuantity = getReferencedIngredientQuantity(line, ingredients, purchaseItems);
  const referencedUnit =
    referencedIngredient?.entryUnitId || referencedIngredient?.unit || referencedIngredient?.baseUnitId;
  if (referencedQuantity > 0 && referencedUnit) {
    const convertedQuantity = convertUnitQuantity(referencedQuantity, referencedUnit, laborPerKgInputUnit, units);
    if (convertedQuantity !== null) {
      return Math.max(convertedQuantity, 0);
    }
  }

  return Math.max(referencedQuantity || 0, 0);
};

const calculateRecipeCostLineQuantity = (
  line: RecipeCostLine,
  effectiveYield: number,
  ingredients: RecipeIngredient[] = [],
  yieldUnitId?: MeasurementUnit,
  units: UnitMaster[] = [],
  purchaseItems: PurchaseItem[] = [],
  methods: ProductionCostMethod[] = [],
) => {
  const selectedMethod = resolveProductionCostMethodFromLine(line, methods);
  const calculationBasis = (selectedMethod?.calculationType ||
    normalizeRecipeCostLineBasis(line.calculationBasis)) as RecipeCostLineBasis;

  if (calculationBasis === 'fixed' || calculationBasis === 'per-event') {
    return 1;
  }

  if (!isProductionCostMethodQuantityEditable(selectedMethod, calculationBasis)) {
    return 1;
  }

  return typeof line.quantity === 'number' && line.quantity >= 0 ? line.quantity : 1;
};

const syncRecipeCostLine = (
  line: RecipeCostLine,
  effectiveYield: number,
  ingredients: RecipeIngredient[] = [],
  yieldUnitId?: MeasurementUnit,
  units: UnitMaster[] = [],
  purchaseItems: PurchaseItem[] = [],
  methods: ProductionCostMethod[] = [],
): RecipeCostLine => {
  const selectedMethod = resolveProductionCostMethodFromLine(line, methods);
  const calculationBasis = (selectedMethod?.calculationType ||
    normalizeRecipeCostLineBasis(line.calculationBasis)) as RecipeCostLineBasis;
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
  const supportsReference = shouldShowRecipeCostReference({ ...line, calculationBasis }, methods);
  const defaultUnit =
    supportsReference && referencedPurchaseItem
      ? referencedPurchaseItem.purchaseUnitId || referencedPurchaseItem.purchaseUnit || getBaseUnit(referencedPurchaseItem)
      : calculationBasis === 'item-usage'
        ? referencedUsageUnit
        : getDefaultProductionCostMethodUnit(selectedMethod, yieldUnitId || '');
  const unitOptions = getRecipeCostLineUnitOptions(
    { unit: line.unit, ingredientReferenceId: normalizedReferenceId },
    supportsReference ? referencedPurchaseItem : undefined,
    units,
    defaultUnit as MeasurementUnit | undefined,
  );
  const resolvedUnit =
    calculationBasis === 'fixed' || calculationBasis === 'per-event'
      ? undefined
      : unitOptions.some((option) => option.code === line.unit)
        ? line.unit
        : defaultUnit || unitOptions[0]?.code || line.unit;
  const rate =
    supportsReference && referencedPurchaseItem
      ? getPurchaseItemRateForUnit(referencedPurchaseItem, resolvedUnit as MeasurementUnit | undefined, units)
      : Number(line.rate) || 0;
  const quantity = shouldProductionCostMethodShowQuantity(selectedMethod, calculationBasis)
    ? typeof line.quantity === 'number' && line.quantity >= 0
      ? line.quantity
      : 1
    : 1;
  const chargeQuantity = calculateRecipeCostLineQuantity(
    { ...line, calculationBasis, calculationMethodId: selectedMethod?.id || line.calculationMethodId, rate, quantity },
    effectiveYield,
    ingredients,
    yieldUnitId,
    units,
    purchaseItems,
    methods,
  );

  return {
    ...line,
    category: line.category || 'labor',
    name: line.name || '',
    calculationBasis,
    calculationMethodId: selectedMethod?.id || line.calculationMethodId,
    rate,
    quantity,
    capacityQuantity: undefined,
    unit: resolvedUnit,
    ingredientReferenceId: supportsReference ? normalizedReferenceId : undefined,
    totalCost: rate * chargeQuantity,
  };
};

const createRecipeCostLine = (
  category: RecipeCostLineCategory,
  effectiveYield: number,
  yieldUnitId: MeasurementUnit,
  units: UnitMaster[],
  methods: ProductionCostMethod[],
  purchaseItems: PurchaseItem[] = [],
): RecipeCostLine =>
  (() => {
    const defaultMethod = getRecipeCostLineDefaultMethod(category, methods);
    const calculationBasis = (defaultMethod?.calculationType || 'fixed') as RecipeCostLineBasis;
    return syncRecipeCostLine(
      {
        id: `recipe-cost-${Date.now()}-${category}`,
        category,
        name: defaultMethod?.methodName || getRecipeCostLineDefaultName(category),
        calculationBasis,
        calculationMethodId: defaultMethod?.id,
        rate: 0,
        quantity: 1,
        unit: getDefaultProductionCostMethodUnit(defaultMethod, yieldUnitId),
        totalCost: 0,
      },
      effectiveYield,
      [],
      yieldUnitId,
      units,
      purchaseItems,
      methods,
    );
  })();

const getDefaultCostLineUnit = (
  line: Pick<RecipeCostLine, 'calculationMethodId' | 'calculationBasis' | 'category'>,
  yieldUnitId: MeasurementUnit,
  methods: ProductionCostMethod[],
) => {
  const selectedMethod = resolveProductionCostMethodFromLine(line, methods);
  const calculationBasis = selectedMethod?.calculationType || normalizeRecipeCostLineBasis(line.calculationBasis);
  if (calculationBasis === 'item-usage') {
    return '';
  }

  return getDefaultProductionCostMethodUnit(selectedMethod, yieldUnitId);
};

const standardizeRecipeCostLine = (
  line: RecipeCostLine,
  effectiveYield: number,
  ingredients: RecipeIngredient[] = [],
  yieldUnitId?: MeasurementUnit,
  units: UnitMaster[] = [],
  purchaseItems: PurchaseItem[] = [],
  methods: ProductionCostMethod[] = [],
) => {
  return syncRecipeCostLine(line, effectiveYield, ingredients, yieldUnitId, units, purchaseItems, methods);
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

  let resolvedOptions = ensureSelectedUnitOption(compatibleUnits, selectedUnitId);
  if (!item) {
    return resolvedOptions;
  }

  if (item.purchaseUnitId || item.purchaseUnit) {
    resolvedOptions = ensureSelectedUnitOption(resolvedOptions, item.purchaseUnitId || item.purchaseUnit);
  }
  if (getBaseUnit(item)) {
    resolvedOptions = ensureSelectedUnitOption(resolvedOptions, getBaseUnit(item));
  }
  if (item.issueUnit) {
    resolvedOptions = ensureSelectedUnitOption(resolvedOptions, item.issueUnit);
  }
  return resolvedOptions;
};

const getRecipeCostLineUnitOptions = (
  line: Pick<RecipeCostLine, 'unit' | 'ingredientReferenceId'>,
  item: PurchaseItem | undefined,
  units: UnitMaster[],
  fallbackUnitId?: MeasurementUnit,
) => {
  if (item) {
    return getIngredientUnitOptions(item, units, (line.unit || fallbackUnitId) as MeasurementUnit | undefined);
  }

  const recipeUnits = getUnitsForUsage('recipe', units);
  return ensureSelectedUnitOption(recipeUnits, (line.unit || fallbackUnitId) as MeasurementUnit | undefined);
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
  contentClassName,
  children,
}: {
  title: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  contentClassName?: string;
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
    {open ? <div className={contentClassName || 'grid grid-cols-1 gap-3 p-3 md:grid-cols-2'}>{children}</div> : null}
  </section>
);

export function RecipeCosting({
  userName,
  dishes,
  recipes,
  purchaseItems,
  units,
  productionCostMethods,
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
  const [missingConfigFilter, setMissingConfigFilter] = useState<MissingConfigFilter>('all');
  const [sortKey, setSortKey] = useState<RegisterSortKey>('severity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [recipeActiveTab, setRecipeActiveTab] = useState<RecipeDialogTab>('ingredients');
  const [recipeSetupOpen, setRecipeSetupOpen] = useState(true);
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
  const [utilityCostEnabled, setUtilityCostEnabled] = useState(false);
  const [packagingCostEnabled, setPackagingCostEnabled] = useState(false);
  const [otherProductionCostEnabled, setOtherProductionCostEnabled] = useState(false);
  const [evaluationMode, setEvaluationMode] = useState<RecipeEvaluationMode>('profit-per-unit');
  const [evaluationValue, setEvaluationValue] = useState(0);
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
      utilityCostEnabled,
      packagingCostEnabled,
      otherProductionCostEnabled,
      evaluationMode,
      evaluationValue,
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
          calculationMethodId: line.calculationMethodId || '',
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
      utilityCostEnabled,
      packagingCostEnabled,
      otherProductionCostEnabled,
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
      evaluationMode,
      evaluationValue,
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
    setMissingConfigFilter('all');
  };
  const applyRegisterFilterPreset = (
    preset: Partial<{
      recipePresenceFilter: RecipePresenceFilter;
      productionTypeFilter: ProductionTypeFilter;
      recipeStateFilter: RecipeStateFilter;
      costingStatusFilter: CostingStatusFilter;
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
      calculationMethodId: line.calculationMethodId || '',
      rate: line.rate,
      quantity: line.quantity,
      capacityQuantity: line.capacityQuantity ?? null,
      unit: line.unit || '',
      ingredientReferenceId: line.ingredientReferenceId || '',
      sortOrder: line.sortOrder ?? null,
    }));
  const buildRecipeDialogSnapshot = (dish: Dish) => {
    const existingRecipe = getLinkedRecipe(dish);
    const optionalCostSections = deriveOptionalProductionCostSectionState(existingRecipe);
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
            productionCostMethods,
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
      utilityCostEnabled: optionalCostSections.utility,
      packagingCostEnabled: optionalCostSections.packaging,
      otherProductionCostEnabled: optionalCostSections.other,
      evaluationMode: existingRecipe?.pricingEvaluationMode || 'profit-per-unit',
      evaluationValue:
        existingRecipe?.pricingEvaluationValue ??
        standardCostSnapshot.marginPerYieldUnit,
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
      utilityCostEnabled: snapshot.utilityCostEnabled,
      packagingCostEnabled: snapshot.packagingCostEnabled,
      otherProductionCostEnabled: snapshot.otherProductionCostEnabled,
      evaluationMode: snapshot.evaluationMode,
      evaluationValue: snapshot.evaluationValue,
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
      setRecipeSetupOpen(!isPurchasedReadySnapshot);
      setIngredientsOpen(!isPurchasedReadySnapshot);
      setPreparationNotesOpen(false);
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
    setUtilityCostEnabled(snapshot.utilityCostEnabled);
    setPackagingCostEnabled(snapshot.packagingCostEnabled);
    setOtherProductionCostEnabled(snapshot.otherProductionCostEnabled);
    setEvaluationMode(snapshot.evaluationMode);
    setEvaluationValue(snapshot.evaluationValue);
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
      utilityCostEnabled: snapshot.utilityCostEnabled,
      packagingCostEnabled: snapshot.packagingCostEnabled,
      otherProductionCostEnabled: snapshot.otherProductionCostEnabled,
      evaluationMode: snapshot.evaluationMode,
      evaluationValue: snapshot.evaluationValue,
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
          const standardYieldQuantity = standardCostSnapshot.standardYieldQuantity;
          const standardYieldUnit = standardCostSnapshot.standardYieldUnit;
          const standardDishCost = standardCostSnapshot.standardDishCost;
          const ingredientCost = standardCostSnapshot.ingredientCost;
          const laborCost = standardCostSnapshot.laborCost;
          const utilityCost = standardCostSnapshot.utilityFuelCost;
          const packagingCost = standardCostSnapshot.packagingConsumableCost;
          const otherProductionCost = standardCostSnapshot.otherProductionCost;
          const wastageCost = standardCostSnapshot.wastageCost;
          const marginPerOutputUnit = recipe ? standardCostSnapshot.marginPerYieldUnit : 0;
          const sellingPricePerOutputUnit = recipe ? standardCostSnapshot.sellingPricePerYieldUnit : 0;
          const optionalCostSections = deriveOptionalProductionCostSectionState(recipe);
          const purchasedUnitCost = linkedPurchaseItem ? getPurchaseItemUnitCost(linkedPurchaseItem, units) : 0;
          const variantCost =
            defaultVariant?.estimatedCost ?? dish.defaultVariantCost ?? dish.estimatedCost ?? 0;
          const serviceDefaultCost = dish.outsourceProfile?.defaultCost ?? variantCost;
          const costPerUnit =
            productionType === 'recipe-based'
              ? standardCostSnapshot.standardCostPerYieldUnit
              : productionType === 'purchased-ready'
                ? purchasedReadyRecipeCost || variantCost || purchasedUnitCost
                : serviceDefaultCost;
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
          const recipeValidationIngredients =
            productionType === 'recipe-based'
              ? (recipe?.ingredients || []).map((ingredient) => syncIngredientRow(ingredient, purchaseItems, units, 1))
              : [];
          const ingredientLineCount = recipeValidationIngredients.length;
          const laborLineCount = (recipe?.additionalCostLines || []).filter((line) => line.category === 'labor').length;
          const utilityLineCount = (recipe?.additionalCostLines || []).filter((line) => line.category === 'utility').length;
          const packagingLineCount = (recipe?.additionalCostLines || []).filter((line) => line.category === 'packaging').length;
          const otherProductionLineCount = (recipe?.additionalCostLines || []).filter((line) => line.category === 'other').length;
          const missingYield =
            productionType === 'recipe-based' &&
            recipeState !== 'missing-recipe' &&
            (!(standardYieldQuantity > 0) || !standardYieldUnit);
          const unitConversionMissing =
            productionType === 'recipe-based' &&
            recipeState !== 'missing-recipe' &&
            recipeValidationIngredients.some((ingredient) => {
              const linkedItem = resolveRecipeIngredientItem(ingredient, purchaseItems);
              if (!linkedItem) {
                return false;
              }
              const entryQuantity = ingredient.entryQuantity ?? ingredient.requiredQuantity ?? ingredient.quantity ?? 0;
              const entryUnitId = ingredient.entryUnitId || ingredient.unit;
              const baseUnitId = ingredient.baseUnitId || ingredient.unit;
              return getIngredientBaseQuantity(entryQuantity, entryUnitId, baseUnitId, linkedItem, units) === null;
            });
          const missingPurchaseRate =
            (productionType === 'recipe-based' &&
              recipeState !== 'missing-recipe' &&
              recipeValidationIngredients.some((ingredient) => {
                const linkedItem = resolveRecipeIngredientItem(ingredient, purchaseItems);
                return linkedItem ? getPurchaseItemLastPurchaseRate(linkedItem) <= 0 : false;
              })) ||
            (productionType === 'purchased-ready' && Boolean(linkedPurchaseItemId) && purchasedUnitCost <= 0);
          const missingIngredientCost =
            productionType === 'recipe-based' &&
            recipeState !== 'missing-recipe' &&
            (!recipeValidationIngredients.length || ingredientCost <= 0);
          const missingLabor = productionType === 'recipe-based' && recipeState !== 'missing-recipe' && laborCost <= 0;
          const missingUtility =
            productionType === 'recipe-based' &&
            recipeState !== 'missing-recipe' &&
            optionalCostSections.utility &&
            utilityCost <= 0;
          const missingPackaging =
            productionType === 'recipe-based' &&
            recipeState !== 'missing-recipe' &&
            optionalCostSections.packaging &&
            packagingCost <= 0;
          const missingCategory = !(dish.categoryId || dish.category);
          const missingKitchenSection = !(dish.kitchenStationId || dish.preparationArea);
          const missingCostLink =
            (productionType === 'purchased-ready' && !linkedPurchaseItemId) ||
            (productionType === 'service-item' && serviceDefaultCost <= 0);
          const costingStatus: CostingStatusKey =
            recipeState === 'missing-recipe'
              ? 'missing-recipe'
              : recipeState === 'inactive'
                ? 'inactive-recipe'
                : missingCostLink
                  ? 'missing-cost-link'
                  : missingYield
                    ? 'yield-missing'
                    : unitConversionMissing
                      ? 'unit-conversion-missing'
                      : missingPurchaseRate
                        ? 'missing-purchase-rate'
                        : missingIngredientCost
                          ? 'missing-ingredient-cost'
                          : missingLabor
                            ? 'missing-labor'
                            : missingUtility
                              ? 'missing-utility'
                              : missingPackaging
                                ? 'missing-packaging'
                                : 'complete';

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
            marginPerOutputUnit,
            sellingPricePerOutputUnit,
            costingStatus,
            costUnit,
            ingredientLineCount,
            laborLineCount,
            utilityLineCount,
            packagingLineCount,
            otherProductionLineCount,
            missingIngredientCost,
            missingPurchaseRate,
            missingLabor,
            missingUtility,
            missingPackaging,
            missingYield,
            unitConversionMissing,
            missingCategory,
            missingKitchenSection,
            missingCostLink,
            lastUpdatedAt: getRecipeRegisterLastEditAt(recipe, dish),
            statusSeverity:
              costingStatus === 'missing-recipe'
                  ? 5
                  : costingStatus === 'missing-cost-link' || costingStatus === 'unit-conversion-missing'
                    ? 4
                    : costingStatus === 'yield-missing' || costingStatus === 'missing-purchase-rate'
                      ? 3
                      : costingStatus === 'missing-ingredient-cost' ||
                          costingStatus === 'missing-labor' ||
                          costingStatus === 'missing-utility' ||
                          costingStatus === 'missing-packaging'
                        ? 2
                        : costingStatus === 'inactive-recipe'
                          ? 1
                          : 0,
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
      const matchesMissingConfig =
        missingConfigFilter === 'all' ||
        (missingConfigFilter === 'missing-ingredient-cost' && row.missingIngredientCost) ||
        (missingConfigFilter === 'missing-purchase-rate' && row.missingPurchaseRate) ||
        (missingConfigFilter === 'missing-labor' && row.missingLabor) ||
        (missingConfigFilter === 'missing-utility' && row.missingUtility) ||
        (missingConfigFilter === 'missing-packaging' && row.missingPackaging) ||
        (missingConfigFilter === 'unit-conversion-missing' && row.unitConversionMissing) ||
        (missingConfigFilter === 'yield-missing' && row.missingYield) ||
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
      if (sortKey === 'recipe-type') {
        return left.recipeType.localeCompare(right.recipeType) * direction || left.dish.dishName.localeCompare(right.dish.dishName);
      }
      if (sortKey === 'yield') {
        return (left.standardYieldQuantity - right.standardYieldQuantity) * direction;
      }
      if (sortKey === 'ingredient-cost') {
        return (left.ingredientCost - right.ingredientCost) * direction;
      }
      if (sortKey === 'total-cost') {
        return (left.standardDishCost - right.standardDishCost) * direction;
      }
      if (sortKey === 'cost-per-unit') {
        return (left.costPerUnit - right.costPerUnit) * direction;
      }
      if (sortKey === 'updated-at') {
        return ((new Date(left.lastUpdatedAt || 0).getTime()) - (new Date(right.lastUpdatedAt || 0).getTime())) * direction;
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
    const averageCostSource = allBanquetMenuItems.filter((row) => row.costPerUnit > 0);
    const averageCostPerUnit =
      averageCostSource.length > 0
        ? averageCostSource.reduce((sum, row) => sum + row.costPerUnit, 0) / averageCostSource.length
        : 0;
    const recentThreshold = new Date();
    recentThreshold.setDate(recentThreshold.getDate() - 7);

    return {
      totalRecipes: allBanquetMenuItems.length,
      recipeBasedCount,
      purchasedReadyCount,
      serviceItemCount,
      withRecipeCount,
      withoutRecipeCount,
      activeRecipesCount,
      inactiveRecipesCount,
      completeRecipesCount: allBanquetMenuItems.filter((row) => row.costingStatus === 'complete').length,
      incompleteRecipesCount: allBanquetMenuItems.filter((row) => row.costingStatus !== 'complete').length,
      missingPurchaseRateCount: allBanquetMenuItems.filter((row) => row.missingPurchaseRate).length,
      missingIngredientCostCount: allBanquetMenuItems.filter((row) => row.missingIngredientCost).length,
      missingLaborCount: allBanquetMenuItems.filter((row) => row.missingLabor).length,
      missingUtilityCount: allBanquetMenuItems.filter((row) => row.missingUtility).length,
      missingLaborUtilityCount: allBanquetMenuItems.filter((row) => row.missingLabor || row.missingUtility).length,
      missingPackagingCount: allBanquetMenuItems.filter((row) => row.missingPackaging).length,
      unitConversionMissingCount: allBanquetMenuItems.filter((row) => row.unitConversionMissing).length,
      yieldMissingCount: allBanquetMenuItems.filter((row) => row.missingYield).length,
      missingCostLinkCount: allBanquetMenuItems.filter((row) => row.missingCostLink).length,
      averageCostPerUnit,
      recentlyUpdatedCount: allBanquetMenuItems.filter((row) => {
        const updatedAt = row.lastUpdatedAt ? new Date(row.lastUpdatedAt) : null;
        return updatedAt ? updatedAt >= recentThreshold : false;
      }).length,
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
    standardizeRecipeCostLine(
      line,
      effectiveYieldQuantity,
      standardRecipeIngredients,
      yieldUnitId,
      units,
      purchaseItems,
      productionCostMethods,
    ),
  );
  const optionalProductionCostSectionState: OptionalProductionCostSectionState = {
    utility: utilityCostEnabled,
    packaging: packagingCostEnabled,
    other: otherProductionCostEnabled,
  };
  const activeSourceRecipeCostLines = sourceRecipeCostLines.filter(
    (line) => line.category === 'labor' || optionalProductionCostSectionState[line.category as OptionalProductionCostSection],
  );
  const sourceLaborCost = activeSourceRecipeCostLines
    .filter((line) => line.category === 'labor')
    .reduce((sum, line) => sum + (line.totalCost || 0), 0);
  const sourceUtilitiesCost = activeSourceRecipeCostLines
    .filter((line) => line.category === 'utility')
    .reduce((sum, line) => sum + (line.totalCost || 0), 0);
  const sourcePackagingCost = activeSourceRecipeCostLines
    .filter((line) => line.category === 'packaging')
    .reduce((sum, line) => sum + (line.totalCost || 0), 0);
  const sourceOtherProductionCost = activeSourceRecipeCostLines
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
  const evaluatedProfitPerYieldUnit =
    evaluationMode === 'profit-percent'
      ? (costPerYieldUnitBeforeCommercial * Math.max(evaluationValue, 0)) / 100
      : Math.max(evaluationValue, 0);
  const resolvedSellingPricePerYieldUnit = costPerYieldUnitBeforeCommercial + evaluatedProfitPerYieldUnit;
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
  const summarizedOtherCost = otherProductionCost + wastageCost;
  const laborCostLines = sourceRecipeCostLines.filter((line) => line.category === 'labor');
  const utilityCostLines = sourceRecipeCostLines.filter((line) => line.category === 'utility');
  const packagingCostLines = sourceRecipeCostLines.filter((line) => line.category === 'packaging');
  const otherProductionCostLines = sourceRecipeCostLines.filter((line) => line.category === 'other');
  const visibleProductionCostSummaries = [
    { key: 'labor', label: 'Labor', amount: laborCost, enabled: true },
    { key: 'utility', label: 'Utilities', amount: utilitiesCost, enabled: utilityCostEnabled },
    { key: 'packaging', label: 'Packaging', amount: packagingConsumableCost, enabled: packagingCostEnabled },
    { key: 'other', label: 'Other', amount: otherProductionCost, enabled: otherProductionCostEnabled },
  ].filter((entry) => entry.enabled);
  const visibleProductionCostSections = [
    { key: 'labor', category: 'labor' as const, title: 'Labor Costs', rows: laborCostLines, total: laborCost, enabled: true },
    { key: 'utility', category: 'utility' as const, title: 'Utility Costs', rows: utilityCostLines, total: utilitiesCost, enabled: utilityCostEnabled },
    { key: 'packaging', category: 'packaging' as const, title: 'Packaging / Consumable Costs', rows: packagingCostLines, total: packagingConsumableCost, enabled: packagingCostEnabled },
    { key: 'other', category: 'other' as const, title: 'Other Production Costs', rows: otherProductionCostLines, total: otherProductionCost, enabled: otherProductionCostEnabled },
  ].filter((entry) => entry.enabled);
  const productionCostSummaryText =
    visibleProductionCostSummaries.length > 0
      ? visibleProductionCostSummaries.map((entry) => `${entry.label} ${formatCurrencyPKR(entry.amount)}`).join(' | ')
      : 'No add-ons';
  const totalRecipeCost = standardMetrics.standardDishCost;
  const costPerYieldUnit = standardMetrics.standardCostPerYieldUnit;
  const supplySellingPricePerYieldUnit = standardMetrics.sellingPricePerYieldUnit;
  const foodCostPercentage = standardMetrics.foodCostPercentage;
  const yieldUnitLabel = formatUnitLabel(yieldUnitId, units) || yieldUnitId || 'unit';
  const costingKpiStripEntries = [
    { key: 'labor', label: 'Labor', value: formatCurrencyPKR(laborCost) },
    { key: 'utility', label: 'Utilities', value: formatCurrencyPKR(utilitiesCost) },
    { key: 'standard-cost', label: `Standard Cost / ${yieldUnitLabel}`, value: formatCurrencyPKR(costPerYieldUnit) },
  ];
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
    ? 'Compact kitchen ERP purchased-ready cost worksheet'
    : 'Compact kitchen ERP recipe costing worksheet';
  const ingredientSummaryLabel = isPurchasedReadyDialog ? 'Purchase Cost' : 'Ingredient Cost';
  const evaluationTabLabel = 'Evaluation';
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
    const copiedOptionalCostSections = deriveOptionalProductionCostSectionState(selectedCopyRecipe);

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
            productionCostMethods,
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
      if (copyOptions.utility) {
        setUtilityCostEnabled(copiedOptionalCostSections.utility);
      }
      if (copyOptions.packaging) {
        setPackagingCostEnabled(copiedOptionalCostSections.packaging);
      }
      if (copyOptions.other) {
        setOtherProductionCostEnabled(copiedOptionalCostSections.other);
      }
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
      createRecipeCostLine(category, effectiveYieldQuantity, yieldUnitId, units, productionCostMethods, purchaseItems),
    ]);
    setRecipeActiveTab('costing');
  };

  const handleRecipeCostLineChange = (
    lineId: string,
    field: keyof Pick<
      RecipeCostLine,
      'name' | 'calculationBasis' | 'calculationMethodId' | 'rate' | 'quantity' | 'capacityQuantity' | 'unit' | 'ingredientReferenceId'
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
      const currentSelectedMethod = resolveProductionCostMethodFromLine(currentLine, productionCostMethods);
      const selectedMethod =
        field === 'calculationMethodId'
          ? productionCostMethods.find((method) => method.id === String(value))
          : resolveProductionCostMethodFromLine(currentLine, productionCostMethods);
      const nextBasis =
        field === 'calculationBasis'
          ? normalizeRecipeCostLineBasis(fieldValue as RecipeCostLineBasis)
          : (selectedMethod?.calculationType ||
              normalizeRecipeCostLineBasis(currentLine.calculationBasis)) as RecipeCostLineBasis;
      const supportsReference = shouldShowRecipeCostReference(
          {
            ...currentLine,
            calculationBasis: nextBasis,
            calculationMethodId: selectedMethod?.id || currentLine.calculationMethodId,
          },
        productionCostMethods,
      );
      const nextReferenceId =
        !supportsReference
          ? undefined
          : field === 'ingredientReferenceId'
          ? resolveRecipeCostReferenceId(String(value), standardRecipeIngredients, purchaseItems)
          : resolveRecipeCostReferenceId(currentLine.ingredientReferenceId, standardRecipeIngredients, purchaseItems);
      const referencedPurchaseItem = nextReferenceId
        ? purchaseItems.find((item) => item.id === nextReferenceId)
        : undefined;
      const nextMethodSupportsReference = shouldProductionCostMethodShowReference(selectedMethod, nextBasis, currentLine.category);
      const nextDefaultUnit = getDefaultCostLineUnit(
        {
          ...currentLine,
          calculationBasis: nextBasis,
          calculationMethodId: selectedMethod?.id || currentLine.calculationMethodId,
        },
        yieldUnitId,
        productionCostMethods,
      );
      const nextFallbackUnit =
        nextMethodSupportsReference && referencedPurchaseItem
          ? referencedPurchaseItem.purchaseUnitId || referencedPurchaseItem.purchaseUnit || getBaseUnit(referencedPurchaseItem)
          : nextDefaultUnit;
      const nextUnitOptions = getRecipeCostLineUnitOptions(
        {
          unit: currentLine.unit,
          ingredientReferenceId: nextReferenceId,
        },
        nextMethodSupportsReference ? referencedPurchaseItem : undefined,
        units,
        nextFallbackUnit as MeasurementUnit | undefined,
      );
      const resolvedNextUnit =
        field === 'unit'
          ? String(value)
          : nextUnitOptions.some((option) => option.code === currentLine.unit)
            ? currentLine.unit
            : nextFallbackUnit || nextUnitOptions[0]?.code || currentLine.unit || nextDefaultUnit;
      const nextReferenceRate =
        nextMethodSupportsReference && referencedPurchaseItem
          ? getPurchaseItemRateForUnit(referencedPurchaseItem, resolvedNextUnit as MeasurementUnit | undefined, units)
          : undefined;
      const shouldAutofillName =
        field === 'calculationMethodId' &&
        selectedMethod &&
        (!currentLine.name.trim() ||
          currentLine.name === getRecipeCostLineDefaultName(currentLine.category) ||
          currentLine.name === currentSelectedMethod?.methodName);
      const nextLine = standardizeRecipeCostLine(
        {
          ...currentLine,
          [field]: fieldValue,
          name: shouldAutofillName ? selectedMethod.methodName : currentLine.name,
          calculationBasis: nextBasis,
          calculationMethodId:
            field === 'calculationMethodId'
              ? String(value)
              : selectedMethod?.id || currentLine.calculationMethodId,
          rate:
            (field === 'ingredientReferenceId' || field === 'calculationMethodId' || field === 'unit') &&
            typeof nextReferenceRate === 'number'
                ? nextReferenceRate
              : field === 'rate'
                ? Number(value)
                : currentLine.rate,
          unit:
            resolvedNextUnit,
          ingredientReferenceId: nextReferenceId,
        },
        effectiveYieldQuantity,
        standardRecipeIngredients,
        yieldUnitId,
        units,
        purchaseItems,
        productionCostMethods,
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
    setEvaluationMode('profit-per-unit');
    setEvaluationValue(0);
    recipeDialogSourceSignatureRef.current = null;
    recipeDialogFormSignatureRef.current = null;
  };

  const toggleExpandedRow = (rowId: string) => {
    setExpandedRowId((current) => (current === rowId ? null : rowId));
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

    if (utilityCostEnabled && utilityCostLines.length === 0) {
      toast.error('Add at least one utility cost line or uncheck Utility Costs');
      return false;
    }

    if (packagingCostEnabled && packagingCostLines.length === 0) {
      toast.error('Add at least one packaging cost line or uncheck Packaging Costs');
      return false;
    }

    if (otherProductionCostEnabled && otherProductionCostLines.length === 0) {
      toast.error('Add at least one other production cost line or uncheck Other Production Costs');
      return false;
    }

    for (const line of activeSourceRecipeCostLines) {
      const selectedMethod = resolveProductionCostMethodFromLine(line, productionCostMethods);
      const calculationBasis = (selectedMethod?.calculationType ||
        normalizeRecipeCostLineBasis(line.calculationBasis)) as RecipeCostLineBasis;
      const costLineLabel = getRecipeCostLineCategoryLabel(line.category);

      if (!line.name.trim()) {
        toast.error(`${costLineLabel} cost name is required`);
        return false;
      }

      if (!selectedMethod || selectedMethod.id.startsWith('legacy-')) {
        toast.error(`${costLineLabel} calculation method is required`);
        return false;
      }

      if (line.rate < 0 || line.totalCost < 0) {
        toast.error(`${costLineLabel} cost cannot be negative`);
        return false;
      }

      if (selectedMethod.inputRequired.includes('amount') && line.rate <= 0) {
        toast.error(`${costLineLabel} amount must be greater than 0`);
        return false;
      }

      if (selectedMethod.inputRequired.includes('rate') && line.rate <= 0) {
        toast.error(`${costLineLabel} rate must be greater than 0`);
        return false;
      }

      if (selectedMethod.inputRequired.includes('quantity') && (!line.quantity || line.quantity <= 0)) {
        toast.error(`${costLineLabel} quantity must be greater than 0`);
        return false;
      }

      if (selectedMethod.inputRequired.includes('recipe-yield') && effectiveYieldQuantity <= 0) {
        toast.error(`${costLineLabel} requires a valid recipe yield`);
        return false;
      }

      if (shouldShowRecipeCostReference(line, productionCostMethods)) {
        const referencedPurchaseItem = findReferencedPurchaseItem(line, pricedRecipeIngredients, purchaseItems);

        if (!line.ingredientReferenceId || !referencedPurchaseItem) {
          toast.error(`${costLineLabel} purchase item reference is required`);
          return false;
        }
      }

      if (calculationBasis === 'item-usage' && !line.ingredientReferenceId) {
        toast.error(`${costLineLabel} legacy item usage must link to a purchase / stock item`);
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
    const normalizedCostLines = activeSourceRecipeCostLines.map((line) =>
      standardizeRecipeCostLine(
        line,
        effectiveYieldQuantity,
        standardRecipeIngredients,
        persistedYieldUnitId,
        units,
        purchaseItems,
        productionCostMethods,
      ),
    );
    const computedMarginPerYieldUnit = standardMetrics.marginPerYieldUnit;
    const costingEditedAt =
      !existingRecipe || hasRecipeManualEditChanged(existingRecipe, {
        ingredients: normalizedIngredients,
        additionalCostLines: normalizedCostLines,
        utilityCostEnabled,
        otherProductionCostEnabled,
      })
        ? now
        : existingRecipe.costingEditedAt || existingRecipe.updatedAt || now;

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
      utilityCostEnabled,
      packagingCostEnabled,
      otherProductionCostEnabled,
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
      pricingEvaluationMode: evaluationMode,
      pricingEvaluationValue: evaluationValue,
      suggestedSellingPrice: resolvedSellingPricePerYieldUnit,
      foodCostPercentage,
      costingEditedAt,
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
    const selectedMethod = resolveProductionCostMethodFromLine(line, productionCostMethods);
    const calculationBasis = (selectedMethod?.calculationType ||
      normalizeRecipeCostLineBasis(line.calculationBasis)) as RecipeCostLineBasis;

    if (!shouldProductionCostMethodShowQuantity(selectedMethod, calculationBasis)) {
      return (
        <div
          className={`${costLineStaticClass} justify-end font-medium`}
          title="This method uses a default quantity of 1."
        >
          1
        </div>
      );
    }

    return (
      <input
        type="number"
        min="0"
        step="0.01"
        value={typeof line.quantity === 'number' ? line.quantity : 1}
        onChange={(event) => handleRecipeCostLineChange(line.id, 'quantity', Number(event.target.value))}
        disabled={viewMode}
        className={`${costLineInputClass} text-right`}
        title={selectedMethod ? getProductionCostMethodQuantityLabel(selectedMethod) : 'Quantity'}
      />
    );
  };

  const renderCostSection = (
    category: RecipeCostLineCategory,
    title: string,
    rows: RecipeCostLine[],
    total: number,
  ) => {
    const showReferenceColumn = rows.some((line) => shouldShowRecipeCostReference(line, productionCostMethods));
    const emptyStateColSpan = viewMode ? (showReferenceColumn ? 7 : 6) : showReferenceColumn ? 8 : 7;

    return (
      <section className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-2.5 py-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">{title}</div>
        </div>
        <div className="overflow-auto">
          <table className="w-full table-fixed">
          <thead className="bg-white">
            <tr className="border-b border-slate-200">
              <th className={`${compactTableHeadClass} ${showReferenceColumn ? 'w-[24%]' : 'w-[29%]'}`}>{getRecipeCostLineNameColumnLabel(category)}</th>
              <th className={`${compactTableHeadClass} ${showReferenceColumn ? 'w-[17%]' : 'w-[20%]'}`}>Calculation Method</th>
              <th className={`${compactTableHeadClass} ${showReferenceColumn ? 'w-[10%]' : 'w-[11%]'} text-right`}>Rate / Amount</th>
              <th className={`${compactTableHeadClass} w-[8%] text-right`}>Quantity</th>
              <th className={`${compactTableHeadClass} w-[8%]`}>Unit</th>
              {showReferenceColumn ? <th className={`${compactTableHeadClass} w-[23%]`}>Purchase Item</th> : null}
              <th className={`${compactTableHeadClass} w-[8%] text-right`}>Total</th>
              {!viewMode ? <th className={`${compactTableHeadClass} w-[2%] text-right`}>Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((line) => {
              const selectedMethod = resolveProductionCostMethodFromLine(line, productionCostMethods);
              const calculationBasis = (selectedMethod?.calculationType ||
                normalizeRecipeCostLineBasis(line.calculationBasis)) as RecipeCostLineBasis;
              const defaultUnit = getDefaultCostLineUnit(line, yieldUnitId, productionCostMethods);
              const referencedPurchaseItem = findReferencedPurchaseItem(line, standardRecipeIngredients, purchaseItems);
              const referenceOptions = getRecipeCostReferenceOptions(line.ingredientReferenceId);
              const rowMethodOptions = getProductionCostMethodOptionsForCategory(
                productionCostMethods,
                category,
                line,
              );
              const showLineReference = shouldShowRecipeCostReference(line, productionCostMethods);
              const unitOptions = getRecipeCostLineUnitOptions(
                line,
                showLineReference ? referencedPurchaseItem : undefined,
                units,
                ((showLineReference && referencedPurchaseItem
                  ? referencedPurchaseItem.purchaseUnitId || referencedPurchaseItem.purchaseUnit || getBaseUnit(referencedPurchaseItem)
                  : defaultUnit) || '') as MeasurementUnit | undefined,
              );

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
                  <td className="px-2 py-0.5 text-xs text-slate-700 align-middle">
                    <div className="flex items-center gap-1">
                      <GripVertical className="size-3 shrink-0 text-slate-400" />
                      <input
                        type="text"
                        value={line.name}
                        onChange={(event) => handleRecipeCostLineChange(line.id, 'name', event.target.value)}
                        disabled={viewMode}
                        className={costLineInputClass}
                        placeholder={getRecipeCostLinePlaceholder(category)}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-0.5 text-xs text-slate-700 align-middle">
                    <select
                      value={selectedMethod?.id || ''}
                      onChange={(event) =>
                        handleRecipeCostLineChange(line.id, 'calculationMethodId', event.target.value)
                      }
                      disabled={viewMode}
                      className={costLineInputClass}
                    >
                      <option value="">Select method</option>
                      {rowMethodOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.methodName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-0.5 text-xs text-slate-700 align-middle">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.rate}
                      onChange={(event) => handleRecipeCostLineChange(line.id, 'rate', Number(event.target.value))}
                      disabled={viewMode || (showLineReference && Boolean(line.ingredientReferenceId))}
                      className={`${costLineInputClass} text-right`}
                      title={selectedMethod ? getProductionCostMethodRateLabel(selectedMethod) : 'Rate / Amount'}
                    />
                  </td>
                  <td className="px-2 py-0.5 text-xs text-slate-700 align-middle">{renderCostLineQuantityControl(line)}</td>
                  <td className="px-2 py-0.5 text-xs text-slate-700 align-middle">
                    {calculationBasis === 'fixed' || calculationBasis === 'per-event' ? (
                      <div
                        className={costLineStaticClass}
                        title="This method does not require a unit."
                      >
                        -
                      </div>
                    ) : (
                      <select
                        value={line.unit || ''}
                        onChange={(event) => handleRecipeCostLineChange(line.id, 'unit', event.target.value)}
                        disabled={viewMode}
                        className={costLineInputClass}
                        title={selectedMethod ? `Unit options for ${selectedMethod.methodName}` : 'Select unit'}
                      >
                        <option value="">Select unit</option>
                        {unitOptions.map((option) => (
                          <option key={option.code} value={option.code}>
                            {formatUnitOptionLabel(option)}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  {showReferenceColumn ? (
                    <td className="px-2 py-0.5 text-xs text-slate-700 align-middle">
                      {showLineReference ? (
                        <select
                          value={line.ingredientReferenceId || ''}
                          onChange={(event) => handleRecipeCostLineChange(line.id, 'ingredientReferenceId', event.target.value)}
                          disabled={viewMode}
                          className={costLineInputClass}
                        >
                          <option value="">Select purchase item</option>
                          {referenceOptions.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.itemName} | {formatIngredientCategoryLabel(getIngredientCategoryKey(item))}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </td>
                  ) : null}
                  <td className="px-2 py-0.5 text-right text-[11px] font-semibold text-slate-900 align-middle">
                    {formatCurrencyPKR(line.totalCost || 0)}
                  </td>
                  {!viewMode ? (
                    <td className="px-1 py-0.5 text-right text-xs text-slate-700 align-middle">
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipeCostLine(line.id)}
                        title={`Remove ${getRecipeCostLineCategoryLabel(category).toLowerCase()} cost`}
                        className="inline-flex size-6 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </td>
                  ) : null}
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
      </section>
    );
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <h2 className="mr-2 text-base font-semibold text-slate-900">Recipe Costing Control</h2>
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

        <div className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-600">
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => resetRegisterFilters()} className="inline-flex h-6 items-center rounded border border-slate-200 bg-white px-2 font-semibold text-slate-900">Recipes {registerMetrics.totalRecipes}</button>
            <button type="button" onClick={() => applyRegisterFilterPreset({ productionTypeFilter: 'recipe-based' })} className="inline-flex h-6 items-center rounded border border-slate-200 bg-white px-2 font-semibold text-slate-900">Recipe Based {registerMetrics.recipeBasedCount}</button>
            <button type="button" onClick={() => applyRegisterFilterPreset({ productionTypeFilter: 'purchased-ready' })} className="inline-flex h-6 items-center rounded border border-slate-200 bg-white px-2 font-semibold text-slate-900">Purchased Ready {registerMetrics.purchasedReadyCount}</button>
            <button type="button" onClick={() => applyRegisterFilterPreset({ recipeStateFilter: 'missing-recipe' })} className={`inline-flex h-6 items-center rounded border px-2 font-semibold ${registerMetrics.withoutRecipeCount > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-900'}`}>Without Recipe {registerMetrics.withoutRecipeCount}</button>
            <button type="button" onClick={() => applyRegisterFilterPreset({ costingStatusFilter: 'complete' })} className="inline-flex h-6 items-center rounded border border-emerald-200 bg-emerald-50 px-2 font-semibold text-emerald-700">Complete {registerMetrics.completeRecipesCount}</button>
            <span className="inline-flex h-6 items-center rounded border border-amber-200 bg-amber-50 px-2 font-semibold text-amber-800">Incomplete {registerMetrics.incompleteRecipesCount}</span>
            <button type="button" onClick={() => applyRegisterFilterPreset({ missingConfigFilter: 'missing-labor' })} className={`inline-flex h-6 items-center rounded border px-2 font-semibold ${registerMetrics.missingLaborCount > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-900'}`}>Labor {registerMetrics.missingLaborCount}</button>
            <button type="button" onClick={() => applyRegisterFilterPreset({ missingConfigFilter: 'missing-utility' })} className={`inline-flex h-6 items-center rounded border px-2 font-semibold ${registerMetrics.missingUtilityCount > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-900'}`}>Utility {registerMetrics.missingUtilityCount}</button>
            <button type="button" onClick={() => applyRegisterFilterPreset({ missingConfigFilter: 'missing-packaging' })} className={`inline-flex h-6 items-center rounded border px-2 font-semibold ${registerMetrics.missingPackagingCount > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-900'}`}>Packaging {registerMetrics.missingPackagingCount}</button>
            <button type="button" onClick={() => applyRegisterFilterPreset({ missingConfigFilter: 'missing-purchase-rate' })} className={`inline-flex h-6 items-center rounded border px-2 font-semibold ${registerMetrics.missingPurchaseRateCount > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-900'}`}>Purchase Rate {registerMetrics.missingPurchaseRateCount}</button>
            <span className="inline-flex h-6 items-center rounded border border-slate-200 bg-white px-2">Avg / Unit {formatCurrencyPKR(registerMetrics.averageCostPerUnit)}</span>
            <span className="inline-flex h-6 items-center rounded border border-slate-200 bg-white px-2">Edited 7d {registerMetrics.recentlyUpdatedCount}</span>
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
              <p className="text-sm font-medium text-slate-700">No recipe cost rows found</p>
              <p className="mt-1 text-xs text-slate-500">Adjust the recipe filters to see banquet kitchen recipes.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <h3 className="text-sm font-semibold text-slate-900">Recipe Cost Register</h3>
              <span className="text-xs text-slate-500">{filteredRows.length} rows</span>
            </div>
            <div className="overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className={tableHeadClass}>Recipe</th>
                    <th className={tableHeadClass}>Section / Type</th>
                    <th className={tableHeadClass}>Yield</th>
                    <th className={`${tableHeadClass} text-right`}>Ingredient Cost</th>
                    <th className={`${tableHeadClass} text-right`}>Add-ons</th>
                    <th className={`${tableHeadClass} text-right`}>Total Recipe Cost</th>
                    <th className={`${tableHeadClass} text-right`}>Cost / Output Unit</th>
                    <th className={`${tableHeadClass} text-right`}>Margin</th>
                    <th className={`${tableHeadClass} text-right`}>Selling Price</th>
                    <th className={tableHeadClass}>Recipe Validation</th>
                    <th className={tableHeadClass}>Missing Data</th>
                    <th className={`${tableHeadClass} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const displayRecipeName = getRecipeName(row.dish, row.recipe);
                    const standardYieldText = row.standardYieldQuantity > 0
                      ? `${row.standardYieldQuantity} ${row.standardYieldUnit || row.costUnit}`
                      : '-';
                    const costPerUnitText =
                      row.costPerUnit > 0 ? formatPerOutputUnitValue(row.costPerUnit, row.costUnit) : '-';
                    const marginPerUnitText = row.recipe ? formatPerOutputUnitValue(row.marginPerOutputUnit, row.costUnit) : '-';
                    const sellingPricePerUnitText = row.recipe ? formatPerOutputUnitValue(row.sellingPricePerOutputUnit, row.costUnit) : '-';
                    const missingDataBadges = getRecipeMissingDataBadges(row);

                    return (
                      <Fragment key={row.id}>
                        <tr className="cursor-pointer border-t border-slate-200 hover:bg-slate-50" onClick={() => toggleExpandedRow(row.id)}>
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{displayRecipeName}</div>
                            <div className="text-[11px] text-slate-500">{row.recipeCode}</div>
                            <div className="text-[11px] text-slate-500">
                              Last edit {row.lastUpdatedAt ? formatDatePK(row.lastUpdatedAt) : '-'}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1">
                              <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${getRecipeStateBadgeClass(row.recipeState)}`}>
                                {getRecipeStateLabel(row.recipeState)}
                              </span>
                              <span className="text-[10px] text-slate-500">{row.recipeType}</span>
                            </div>
                          </td>
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{row.dish.cuisineName || '-'}</div>
                            <div className="text-[11px] text-slate-500">
                              {String(row.dish.kitchenStationId || row.dish.preparationArea || '-').replace(/-/g, ' ')}
                            </div>
                            <div className="mt-0.5">
                              <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">{row.productionTypeLabel}</span>
                            </div>
                          </td>
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{standardYieldText}</div>
                            <div className="text-[11px] text-slate-500">{row.outputOrLinkedItem}</div>
                          </td>
                          <td className={`${tableCellClass} text-right font-medium text-slate-900`}>{formatCurrencyPKR(row.ingredientCost)}</td>
                          <td className={`${tableCellClass} text-right`}>
                            <div className="font-medium text-slate-900">{formatCurrencyPKR(row.laborCost + row.utilityCost + row.packagingCost + row.otherProductionCost)}</div>
                            <div className="text-[10px] text-slate-500">
                              L {formatCurrencyPKR(row.laborCost)} | U {formatCurrencyPKR(row.utilityCost)} | P {formatCurrencyPKR(row.packagingCost)}
                            </div>
                          </td>
                          <td className={`${tableCellClass} text-right font-medium text-slate-900`}>{formatCurrencyPKR(row.standardDishCost)}</td>
                          <td className={`${tableCellClass} text-right font-medium text-slate-900`}>{costPerUnitText}</td>
                          <td className={`${tableCellClass} text-right font-medium text-slate-900`}>{marginPerUnitText}</td>
                          <td className={`${tableCellClass} text-right font-medium text-slate-900`}>{sellingPricePerUnitText}</td>
                          <td className={tableCellClass}>
                            <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${getCostingStatusBadgeClass(row.costingStatus)}`}>
                              {getCostingStatusLabel(row.costingStatus)}
                            </span>
                          </td>
                          <td className={tableCellClass}>
                            {missingDataBadges.length > 0 ? (
                              <div className="flex max-w-[180px] flex-wrap gap-1">
                                {missingDataBadges.slice(0, 2).map((badge) => (
                                  <span key={badge} className="rounded bg-red-100 px-2 py-0.5 text-[11px] text-red-700">
                                    {badge}
                                  </span>
                                ))}
                                {missingDataBadges.length > 2 ? (
                                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                                    +{missingDataBadges.length - 2}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500">-</span>
                            )}
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
                            </div>
                          </td>
                        </tr>
                        {expandedRowId === row.id ? (
                          <tr className="border-t border-slate-100 bg-slate-50/60">
                            <td className="px-3 py-3" colSpan={12}>
                              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-6">
                                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                                    <span>Ingredient Cost</span>
                                    <span>{formatCountLabel(row.ingredientLineCount, 'ingredient')}</span>
                                  </div>
                                  <div className="font-semibold text-slate-900">{formatCurrencyPKR(row.ingredientCost)}</div>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                                    <span>Labor Cost</span>
                                    <span>{formatCountLabel(row.laborLineCount, 'line')}</span>
                                  </div>
                                  <div className="font-semibold text-slate-900">{formatCurrencyPKR(row.laborCost)}</div>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                                    <span>Utility Cost</span>
                                    <span>{formatCountLabel(row.utilityLineCount, 'line')}</span>
                                  </div>
                                  <div className="font-semibold text-slate-900">{formatCurrencyPKR(row.utilityCost)}</div>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                                    <span>Packaging / Consumable Cost</span>
                                    <span>{formatCountLabel(row.packagingLineCount, 'line')}</span>
                                  </div>
                                  <div className="font-semibold text-slate-900">{formatCurrencyPKR(row.packagingCost)}</div>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                                    <span>Other Production Cost</span>
                                    <span>{formatCountLabel(row.otherProductionLineCount, 'line')}</span>
                                  </div>
                                  <div className="font-semibold text-slate-900">{formatCurrencyPKR(row.otherProductionCost)}</div>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="text-xs text-slate-500">Wastage Cost</div>
                                  <div className="font-semibold text-slate-900">{formatCurrencyPKR(row.wastageCost)}</div>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="text-xs text-slate-500">Total Recipe Cost</div>
                                  <div className="font-semibold text-slate-900">
                                    {formatCurrencyPKR(row.standardDishCost)}
                                  </div>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="text-xs text-slate-500">Standard Yield</div>
                                  <div className="font-semibold text-slate-900">
                                    {standardYieldText}
                                  </div>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="text-xs text-slate-500">Margin</div>
                                  <div className="font-semibold text-slate-900">{marginPerUnitText}</div>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="text-xs text-slate-500">Selling Price</div>
                                  <div className="font-semibold text-slate-900">{sellingPricePerUnitText}</div>
                                </div>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                                {row.missingIngredientCost ? <span className="rounded bg-red-100 px-2 py-0.5 text-red-700">Missing ingredient cost</span> : null}
                                {row.missingPurchaseRate ? <span className="rounded bg-red-100 px-2 py-0.5 text-red-700">Missing purchase rate</span> : null}
                                {row.missingLabor ? <span className="rounded bg-red-100 px-2 py-0.5 text-red-700">Missing labor cost</span> : null}
                                {row.missingUtility ? <span className="rounded bg-red-100 px-2 py-0.5 text-red-700">Missing utility cost</span> : null}
                                {row.missingPackaging ? <span className="rounded bg-red-100 px-2 py-0.5 text-red-700">Missing packaging cost</span> : null}
                                {row.unitConversionMissing ? <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">Unit conversion missing</span> : null}
                                {row.missingYield ? <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">Yield missing</span> : null}
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
                  <div className="grid gap-px bg-slate-200 md:grid-cols-3 xl:grid-cols-6">
                    <div className="bg-white px-2.5 py-2 text-sm">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{ingredientSummaryLabel}</div>
                      <div className="font-semibold text-slate-900">{formatCurrencyPKR(totalIngredientCost)}</div>
                      <div className="truncate text-[11px] text-slate-500">
                        {isPurchasedReadyDialog ? (selectedLinkedPurchaseItem?.itemName || 'Not linked') : `${standardRecipeIngredients.length} lines`} | {standardYieldSummary}
                      </div>
                    </div>
                    <div className="bg-white px-2.5 py-2 text-sm">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Add-ons</div>
                      <div className="font-semibold text-slate-900">{formatCurrencyPKR(additionalCost + wastageCost)}</div>
                      <div className="truncate text-[11px] text-slate-500">{productionCostSummaryText}</div>
                    </div>
                    <div className="bg-white px-2.5 py-2 text-sm">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total Recipe Cost</div>
                      <div className="font-semibold text-slate-900">{formatCurrencyPKR(totalRecipeCost)}</div>
                      <div className="text-[11px] text-slate-500">{formatCurrencyPKR(costPerYieldUnit)} / {yieldUnitLabel}</div>
                    </div>
                    <div className="bg-white px-2.5 py-2 text-sm">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Other Cost</div>
                      <div className="font-semibold text-slate-900">{formatCurrencyPKR(summarizedOtherCost)}</div>
                      <div className="text-[11px] text-slate-500">
                        {wastageCost > 0 ? `Includes wastage ${formatCurrencyPKR(wastageCost)}` : 'Other production charges'}
                      </div>
                    </div>
                    <div className="bg-white px-2.5 py-2 text-sm">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Yield</div>
                      <div className="font-semibold text-slate-900">{formattedYieldQuantity} {yieldUnitLabel}</div>
                      <div className="text-[11px] text-slate-500">Batch output</div>
                    </div>
                    <div className="bg-white px-2.5 py-2 text-sm">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Cost per Output Unit</div>
                      <div className="font-semibold text-slate-900">{formatCurrencyPKR(costPerYieldUnit)}</div>
                      <div className="text-[11px] text-slate-500">Per {yieldUnitLabel}</div>
                    </div>
                  </div>
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
                      title={
                        <div className="flex items-center gap-2">
                          <span>Recipe Setup</span>
                          <span
                            className="inline-flex size-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold normal-case tracking-normal text-slate-500"
                            title="Define one standard yield for this recipe. Production planning and scaled order quantities should be handled outside this screen."
                          >
                            ?
                          </span>
                        </div>
                      }
                      open={recipeSetupOpen}
                      onToggle={() => setRecipeSetupOpen((current) => !current)}
                      contentClassName="grid grid-cols-1 gap-x-2 gap-y-2 p-3 sm:grid-cols-2 xl:grid-cols-4"
                    >
                      <div>
                        <label className={compactSetupLabelClass}>Recipe Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={recipeName}
                          onChange={(event) => setRecipeName(event.target.value)}
                          disabled={viewMode}
                          className={compactSetupInputClass}
                        />
                      </div>
                      <div>
                        <label className={compactSetupLabelClass}>Recipe Code</label>
                        <input type="text" value={recipeCode} readOnly className={`${compactSetupInputClass} bg-slate-50 text-slate-500`} />
                      </div>
                      <div>
                        <label className={compactSetupLabelClass}>Recipe Type <span className="text-red-500">*</span></label>
                        <select
                          value={recipeType}
                          onChange={(event) => setRecipeType(event.target.value as RecipeType)}
                          disabled={viewMode}
                          className={compactSetupInputClass}
                        >
                          {recipeTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={compactSetupLabelClass}>Status</label>
                        <select
                          value={recipeStatus}
                          onChange={(event) => setRecipeStatus(event.target.value as RecipeStatus)}
                          disabled={viewMode}
                          className={compactSetupInputClass}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      <div>
                        <label className={compactSetupLabelClass}>Recipe Category</label>
                        <select
                          value={recipeCategoryId}
                          onChange={(event) => setRecipeCategoryId(event.target.value)}
                          disabled={viewMode}
                          className={compactSetupInputClass}
                        >
                          {recipeCategoryOptions.map((option) => (
                            <option key={option.value || 'none'} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={compactSetupLabelClass}>Kitchen Section</label>
                        <select
                          value={kitchenSectionId}
                          onChange={(event) => setKitchenSectionId(event.target.value)}
                          disabled={viewMode}
                          className={compactSetupInputClass}
                        >
                          {kitchenSectionOptions.map((option) => (
                            <option key={option.value || 'none'} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={compactSetupLabelClass}>Yield Qty <span className="text-red-500">*</span></label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={yieldQuantity}
                          onChange={(event) => setYieldQuantity(Number(event.target.value))}
                          disabled={viewMode}
                          className={compactSetupInputClass}
                        />
                      </div>
                      <div>
                        <label className={compactSetupLabelClass}>Yield Unit <span className="text-red-500">*</span></label>
                        <select
                          value={yieldUnitId}
                          onChange={(event) => setYieldUnitId(event.target.value as MeasurementUnit)}
                          disabled={viewMode}
                          className={compactSetupInputClass}
                        >
                          {resolvedYieldUnitOptions.map((unit) => (
                            <option key={unit.code} value={unit.code}>
                              {formatUnitOptionLabel(unit)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={compactSetupLabelClass}>Prep Time</label>
                        <input
                          type="number"
                          min="0"
                          value={preparationTimeMinutes}
                          onChange={(event) => setPreparationTimeMinutes(Number(event.target.value))}
                          disabled={viewMode}
                          className={compactSetupInputClass}
                        />
                      </div>
                      <div>
                        <label className={compactSetupLabelClass}>Enable Wastage</label>
                        <label className={compactSetupToggleClass}>
                          <input
                            type="checkbox"
                            checked={wastageEnabled}
                            onChange={(event) => handleWastageToggle(event.target.checked)}
                            disabled={viewMode}
                            className="size-3.5"
                          />
                          Enable wastage
                        </label>
                      </div>
                      <div>
                        <label className={compactSetupLabelClass}>Wastage %</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={expectedWastagePercentage}
                          onChange={(event) => setExpectedWastagePercentage(Number(event.target.value))}
                          disabled={viewMode || !wastageEnabled}
                          className={compactSetupInputClass}
                        />
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
                        className={`h-7 rounded-t border border-b-0 px-2.5 text-[11px] font-semibold uppercase tracking-wide ${
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
                      className={`h-7 rounded-t border border-b-0 px-2.5 text-[11px] font-semibold uppercase tracking-wide ${
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
                      className={`h-7 rounded-t border border-b-0 px-2.5 text-[11px] font-semibold uppercase tracking-wide ${
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
                      <div className="grid gap-1.5 border-b border-slate-200 px-2.5 py-1.5 md:grid-cols-[150px_minmax(0,1fr)_auto_auto_auto]">
                        <select
                          value={ingredientCategoryFilter}
                          onChange={(event) => setIngredientCategoryFilter(event.target.value)}
                          className={ingredientToolbarInputClass}
                        >
                          <option value="">All Categories</option>
                          {ingredientCategoryOptions.map(([categoryKey, categoryLabel]) => (
                            <option key={categoryKey} value={categoryKey}>
                              {categoryLabel}
                            </option>
                          ))}
                        </select>
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search ingredient"
                            value={ingredientSearchTerm}
                            onChange={(event) => setIngredientSearchTerm(event.target.value)}
                            className={`${ingredientToolbarInputClass} pl-7`}
                          />
                        </div>
                        <label className="flex h-7 items-center justify-center gap-1.5 rounded border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={wastageEnabled}
                            onChange={(event) => handleWastageToggle(event.target.checked)}
                            disabled={viewMode}
                            className="size-3.5"
                          />
                          Wastage
                        </label>
                        {!viewMode ? (
                          <button
                            type="button"
                            onClick={() => setBulkIngredientPickerOpen((current) => !current)}
                            className={ingredientToolbarButtonClass}
                          >
                            {bulkIngredientPickerOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                            Bulk Select
                          </button>
                        ) : null}
                        {!viewMode ? (
                          <button
                            type="button"
                            onClick={handleAddIngredient}
                            className={ingredientPrimaryButtonClass}
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
                      <div className="flex items-center justify-between border-b border-slate-200 px-2.5 py-1">
                        <button
                          type="button"
                          onClick={() => setIngredientsOpen((current) => !current)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700"
                        >
                          {ingredientsOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                          Ingredient Lines
                        </button>
                        <div className="text-[10px] text-slate-500">
                          {pricedRecipeIngredients.length} lines | Save order: category, highest cost
                        </div>
                      </div>
                      {ingredientsOpen ? (
                      <div className="max-h-[42vh] overflow-auto">
                        <table className="w-full">
                          <thead className="sticky top-0 z-10 bg-slate-50">
                            <tr>
                              <th className={compactTableHeadClass}>Ingredient</th>
                              <th className={`${compactTableHeadClass} w-20 text-right`}>Qty Used</th>
                              <th className={`${compactTableHeadClass} w-20`}>Unit Used</th>
                              <th className={`${compactTableHeadClass} w-28 text-right`}>Purchase Rate</th>
                              <th className={`${compactTableHeadClass} w-24 text-right`}>Amount</th>
                              <th className={`${compactTableHeadClass} w-44`}>Status</th>
                              {!viewMode ? <th className={`${compactTableHeadClass} w-10 text-right`}>Action</th> : null}
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
                              const ingredientStatus = getRecipeIngredientStatus(ingredient, selectedItem, units);

                              return (
                                <tr key={ingredient.id} className="border-t border-slate-200 hover:bg-slate-50">
                                  <td className={`${compactTableCellClass} min-w-[320px] px-2 py-0.5`}>
                                    <select
                                      value={selectedItemId}
                                      onChange={(event) => handleIngredientChange(index, 'itemId', event.target.value)}
                                      disabled={viewMode}
                                      className={ingredientRowInputClass}
                                    >
                                      {ingredientOptions.map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {item.itemName} | {formatIngredientCategoryLabel(getIngredientCategoryKey(item))}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className={`${compactTableCellClass} w-20 px-2 py-0.5`}>
                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={ingredient.entryQuantity ?? ingredient.requiredQuantity ?? ingredient.quantity}
                                      onChange={(event) => handleIngredientChange(index, 'entryQuantity', Number(event.target.value))}
                                      disabled={viewMode}
                                      className={`${ingredientRowInputClass} text-right`}
                                    />
                                  </td>
                                  <td className={`${compactTableCellClass} w-20 px-2 py-0.5`}>
                                    <select
                                      value={ingredient.entryUnitId || ingredient.unit}
                                      onChange={(event) => handleIngredientChange(index, 'entryUnitId', event.target.value)}
                                      disabled={viewMode}
                                      className={ingredientRowInputClass}
                                    >
                                      {ingredientUnitOptions.map((unit) => (
                                        <option key={unit.code} value={unit.code}>
                                          {unit.code}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className={`${compactTableCellClass} w-28 px-2 py-0.5 text-right`}>
                                    <div className="whitespace-nowrap text-[11px] font-semibold text-slate-900">
                                      {formatCurrencyPKR(lastPurchaseRate)} <span className="text-[10px] font-normal text-slate-500">/ {purchaseUnit}</span>
                                    </div>
                                  </td>
                                  <td className={`${compactTableCellClass} w-24 px-2 py-0.5 text-right`}>
                                    <div className="whitespace-nowrap text-[11px] font-semibold text-slate-900">
                                      {formatCurrencyPKR(ingredient.totalCost || 0)}
                                    </div>
                                  </td>
                                  <td className={`${compactTableCellClass} w-44 px-2 py-0.5`}>
                                    <div className="truncate text-[11px]">
                                      <span
                                        className={`font-semibold ${
                                          ingredientStatus.badgeClass.includes('red')
                                            ? 'text-red-700'
                                            : ingredientStatus.badgeClass.includes('amber')
                                              ? 'text-amber-700'
                                              : 'text-emerald-700'
                                        }`}
                                      >
                                        {ingredientStatus.label}
                                      </span>
                                      <span className="text-slate-400"> • </span>
                                      <span className="font-medium text-slate-500" title={ingredientStatus.detail}>
                                        View Calc
                                      </span>
                                    </div>
                                    <div className="truncate text-[10px] text-slate-500">
                                      {wastageEnabled
                                        ? `Wastage ${Number(ingredient.wastagePercentage || 0).toFixed(2)}% | Net ${formatDisplayQuantity(Number(ingredient.netQuantity || 0))} ${ingredient.baseUnitId || ingredient.unit || '-'}`
                                        : `Internal Rate: ${formatCurrencyPKR(latestUnitCost, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })} / ${ingredient.baseUnitId || ingredient.unit || '-'
                                          }`}
                                    </div>
                                  </td>
                                  {!viewMode ? (
                                    <td className={`${compactTableCellClass} w-10 px-1 py-0.5 text-right`}>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveIngredient(index)}
                                        title="Remove ingredient"
                                        className="inline-flex size-6 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-700"
                                      >
                                        <X className="size-3.5" />
                                      </button>
                                    </td>
                                  ) : null}
                                </tr>
                              );
                            })}
                            {recipeIngredients.length === 0 ? (
                              <tr>
                                <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={viewMode ? 6 : 7}>
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
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-2.5 py-1.5">
                        <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                          {costingKpiStripEntries.map((entry) => (
                            <div key={entry.key} className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1">
                              <span className="font-semibold uppercase tracking-wide text-slate-500">{entry.label}</span>
                              <span className="font-semibold text-slate-900">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                        {!viewMode ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAddRecipeCostLine('labor')}
                              className={ingredientPrimaryButtonClass}
                            >
                              <Plus className="size-3.5" />
                              Add Labor
                            </button>
                            {utilityCostEnabled ? (
                              <button
                                type="button"
                                onClick={() => handleAddRecipeCostLine('utility')}
                                className={ingredientToolbarButtonClass}
                              >
                                <Plus className="size-3.5" />
                                Add Utility
                              </button>
                            ) : null}
                            {packagingCostEnabled ? (
                              <button
                                type="button"
                                onClick={() => handleAddRecipeCostLine('packaging')}
                                className={ingredientToolbarButtonClass}
                              >
                                <Plus className="size-3.5" />
                                Add Packaging
                              </button>
                            ) : null}
                            {otherProductionCostEnabled ? (
                              <button
                                type="button"
                                onClick={() => handleAddRecipeCostLine('other')}
                                className={ingredientToolbarButtonClass}
                              >
                                <Plus className="size-3.5" />
                                Add Other
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      {!viewMode && !isPurchasedReadyDialog ? (
                        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-700">
                          <span className="font-semibold uppercase tracking-wide text-slate-600">Optional Charges</span>
                          <label className="inline-flex h-6 items-center gap-1 rounded border border-slate-200 bg-white px-2">
                            <input
                              type="checkbox"
                              checked={utilityCostEnabled}
                              onChange={(event) => setUtilityCostEnabled(event.target.checked)}
                              className="size-3"
                            />
                            Utility
                          </label>
                          <label className="inline-flex h-6 items-center gap-1 rounded border border-slate-200 bg-white px-2">
                            <input
                              type="checkbox"
                              checked={packagingCostEnabled}
                              onChange={(event) => setPackagingCostEnabled(event.target.checked)}
                              className="size-3"
                            />
                            Packaging
                          </label>
                          <label className="inline-flex h-6 items-center gap-1 rounded border border-slate-200 bg-white px-2">
                            <input
                              type="checkbox"
                              checked={otherProductionCostEnabled}
                              onChange={(event) => setOtherProductionCostEnabled(event.target.checked)}
                              className="size-3"
                            />
                            Other
                          </label>
                          <span className="text-[10px] text-slate-500">
                            Unchecked sections do not add cost and do not show as missing in the register.
                          </span>
                        </div>
                      ) : null}
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
                      <div className="space-y-1.5 p-2">
                        {visibleProductionCostSections.map((entry) =>
                          renderCostSection(entry.category, entry.title, entry.rows, entry.total),
                        )}
                        {visibleProductionCostSections.length > 0 ? (
                          <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-1 rounded border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] shadow-sm">
                            <div className="inline-flex items-center gap-1.5">
                              <span className="font-semibold uppercase tracking-wide text-blue-900">Labor Total</span>
                              <span className="font-semibold text-blue-950">{formatCurrencyPKR(laborCost)}</span>
                            </div>
                            <div className="inline-flex items-center gap-1.5">
                              <span className="font-semibold uppercase tracking-wide text-blue-900">Utility Total</span>
                              <span className="font-semibold text-blue-950">{formatCurrencyPKR(utilitiesCost)}</span>
                            </div>
                            <div className="inline-flex items-center gap-1.5">
                              <span className="font-semibold uppercase tracking-wide text-blue-900">Total Additional Production Cost</span>
                              <span className="font-bold text-blue-950">{formatCurrencyPKR(additionalCost)}</span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : null}

                  {recipeActiveTab === 'evaluation' ? (
                    <>
                      <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 md:grid-cols-4 xl:grid-cols-8">
                        <div className="bg-white px-3 py-2 text-sm">
                          <div className="text-xs text-slate-500">{ingredientSummaryLabel}</div>
                          <div className="font-semibold text-slate-900">{formatCurrencyPKR(totalIngredientCost)}</div>
                        </div>
                        <div className="bg-white px-3 py-2 text-sm">
                          <div className="text-xs text-slate-500">Labor Cost</div>
                          <div className="font-semibold text-slate-900">{formatCurrencyPKR(laborCost)}</div>
                        </div>
                        <div className="bg-white px-3 py-2 text-sm">
                          <div className="text-xs text-slate-500">Utility Cost</div>
                          <div className="font-semibold text-slate-900">{formatCurrencyPKR(utilitiesCost)}</div>
                        </div>
                        <div className="bg-white px-3 py-2 text-sm">
                          <div className="text-xs text-slate-500">Packaging Cost</div>
                          <div className="font-semibold text-slate-900">{formatCurrencyPKR(packagingConsumableCost)}</div>
                        </div>
                        <div className="bg-white px-3 py-2 text-sm">
                          <div className="text-xs text-slate-500">Other Cost</div>
                          <div className="font-semibold text-slate-900">{formatCurrencyPKR(summarizedOtherCost)}</div>
                          {wastageCost > 0 ? (
                            <div className="text-[11px] text-slate-500">Includes wastage {formatCurrencyPKR(wastageCost)}</div>
                          ) : null}
                        </div>
                        <div className="bg-white px-3 py-2 text-sm">
                          <div className="text-xs text-slate-500">Total Recipe Cost</div>
                          <div className="font-semibold text-slate-900">{formatCurrencyPKR(totalRecipeCost)}</div>
                        </div>
                        <div className="bg-white px-3 py-2 text-sm">
                          <div className="text-xs text-slate-500">Yield</div>
                          <div className="font-semibold text-slate-900">{formattedYieldQuantity} {yieldUnitLabel}</div>
                        </div>
                        <div className="bg-white px-3 py-2 text-sm">
                          <div className="text-xs text-slate-500">Cost per Output Unit</div>
                          <div className="font-semibold text-slate-900">{formatCurrencyPKR(costPerYieldUnit)}</div>
                        </div>
                      </div>

                      <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.85fr)]">
                        <div className="space-y-3">
                          <div className="grid gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 lg:grid-cols-[150px_140px_repeat(4,minmax(0,1fr))]">
                            <div>
                              <label className={labelClass}>Margin Basis</label>
                              <select
                                value={evaluationMode}
                                onChange={(event) => setEvaluationMode(event.target.value as RecipeEvaluationMode)}
                                disabled={viewMode}
                                className={inputClass}
                              >
                                <option value="profit-per-unit">Margin by Value</option>
                                <option value="profit-percent">Margin by %</option>
                              </select>
                            </div>
                            <div>
                              <label className={labelClass}>
                                {evaluationMode === 'profit-percent' ? 'Margin %' : `Margin / ${yieldUnitLabel}`}
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={evaluationValue}
                                onChange={(event) => setEvaluationValue(Number(event.target.value))}
                                disabled={viewMode}
                                className={inputClass}
                              />
                            </div>
                            <div className="rounded border border-slate-200 bg-white px-2.5 py-2 text-xs">
                              <div className="text-slate-500">Food Supply Cost / {yieldUnitLabel}</div>
                              <div className="font-semibold text-slate-900">{formatCurrencyPKR(costPerYieldUnit)}</div>
                            </div>
                            <div className="rounded border border-slate-200 bg-white px-2.5 py-2 text-xs">
                              <div className="text-slate-500">Selling Rate / {yieldUnitLabel}</div>
                              <div className="font-semibold text-slate-900">{formatCurrencyPKR(supplySellingPricePerYieldUnit)}</div>
                            </div>
                            <div className="rounded border border-slate-200 bg-white px-2.5 py-2 text-xs">
                              <div className="text-slate-500">Food Cost %</div>
                              <div className="font-semibold text-slate-900">{foodCostPercentage.toFixed(2)}%</div>
                            </div>
                            <div className="rounded border border-slate-200 bg-white px-2.5 py-2 text-xs">
                              <div className="text-slate-500">Target Margin %</div>
                              <div className="font-semibold text-slate-900">
                                {supplySellingPricePerYieldUnit > 0
                                  ? `${(((supplySellingPricePerYieldUnit - costPerYieldUnit) / supplySellingPricePerYieldUnit) * 100).toFixed(2)}%`
                                  : '0.00%'}
                              </div>
                            </div>
                          </div>

                          <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            This evaluation is only for food supply selling guidance. Menu Package Builder and Menu Guest Count Rate Evaluation continue to use the production cost only: {formatCurrencyPKR(costPerYieldUnit)} / {yieldUnitLabel}.
                          </div>

                          {!isPurchasedReadyDialog ? (
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
                                      <th className={`${compactTableHeadClass} text-right`}>Qty Used</th>
                                      <th className={`${compactTableHeadClass} text-right`}>Last Purchase Cost</th>
                                      <th className={`${compactTableHeadClass} text-right`}>Amount</th>
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
                                          <div
                                            className="text-[11px] text-slate-500"
                                            title={getRecipeIngredientStatus(
                                              row.ingredient,
                                              resolveRecipeIngredientItem(row.ingredient, purchaseItems) || undefined,
                                              units,
                                            ).detail}
                                          >
                                            View calculation
                                          </div>
                                        </td>
                                        <td className={`${compactTableCellClass} text-right`}>
                                          {formatDisplayQuantity(
                                            row.ingredient.scaledEntryQuantity ||
                                              row.ingredient.entryQuantity ||
                                              row.ingredient.quantity ||
                                              0,
                                          )} {row.ingredient.entryUnitId || row.ingredient.unit || '-'}
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
                          ) : (
                            <div className="rounded border border-slate-200 bg-white">
                              <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                                Linked Purchase Item
                              </div>
                              <div className="px-3 py-3 text-sm">
                                <div className="font-semibold text-slate-900">{selectedLinkedPurchaseItem ? selectedLinkedPurchaseItem.itemName : 'Not linked'}</div>
                                <div className="mt-1 text-xs text-slate-600">
                                  {selectedLinkedPurchaseItem
                                    ? `Source cost per unit: ${formatCurrencyPKR(selectedPurchasedReadyUnitCost)} / ${selectedPurchaseCostUnitLabel}`
                                    : 'Link a purchase item in Dish Master so purchased-ready costing can read the vendor cost.'}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          {!isPurchasedReadyDialog ? (
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
                          ) : null}

                          <div className="overflow-hidden border border-slate-200">
                            <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                              Recipe Cost Summary
                            </div>
                            <table className="w-full">
                              <tbody>
                                <tr className="border-t border-slate-200 first:border-t-0">
                                  <td className={compactTableCellClass}>{ingredientSummaryLabel}</td>
                                  <td className={`${compactTableCellClass} text-right font-semibold text-slate-900`}>{formatCurrencyPKR(totalIngredientCost)}</td>
                                  <td className={`${compactTableCellClass} text-right`}>{formatShare(totalIngredientCost, totalRecipeCost)}</td>
                                </tr>
                                <tr className="border-t border-slate-200">
                                  <td className={compactTableCellClass}>Labor Cost</td>
                                  <td className={`${compactTableCellClass} text-right font-semibold text-slate-900`}>{formatCurrencyPKR(laborCost)}</td>
                                  <td className={`${compactTableCellClass} text-right`}>{formatShare(laborCost, totalRecipeCost)}</td>
                                </tr>
                                <tr className="border-t border-slate-200">
                                  <td className={compactTableCellClass}>Utility Cost</td>
                                  <td className={`${compactTableCellClass} text-right font-semibold text-slate-900`}>{formatCurrencyPKR(utilitiesCost)}</td>
                                  <td className={`${compactTableCellClass} text-right`}>{formatShare(utilitiesCost, totalRecipeCost)}</td>
                                </tr>
                                <tr className="border-t border-slate-200">
                                  <td className={compactTableCellClass}>Packaging Cost</td>
                                  <td className={`${compactTableCellClass} text-right font-semibold text-slate-900`}>{formatCurrencyPKR(packagingConsumableCost)}</td>
                                  <td className={`${compactTableCellClass} text-right`}>{formatShare(packagingConsumableCost, totalRecipeCost)}</td>
                                </tr>
                                <tr className="border-t border-slate-200">
                                  <td className={compactTableCellClass}>Other Cost</td>
                                  <td className={`${compactTableCellClass} text-right font-semibold text-slate-900`}>{formatCurrencyPKR(summarizedOtherCost)}</td>
                                  <td className={`${compactTableCellClass} text-right`}>{formatShare(summarizedOtherCost, totalRecipeCost)}</td>
                                </tr>
                                <tr className="border-t border-slate-200">
                                  <td className={compactTableCellClass}>Yield</td>
                                  <td className={`${compactTableCellClass} text-right font-semibold text-slate-900`}>{formattedYieldQuantity} {yieldUnitLabel}</td>
                                  <td className={`${compactTableCellClass} text-right text-slate-500`}>Output</td>
                                </tr>
                                <tr className="border-t border-slate-200">
                                  <td className={compactTableCellClass}>Cost per Output Unit</td>
                                  <td className={`${compactTableCellClass} text-right font-semibold text-slate-900`}>{formatCurrencyPKR(costPerYieldUnit)}</td>
                                  <td className={`${compactTableCellClass} text-right text-slate-500`}>Per {yieldUnitLabel}</td>
                                </tr>
                                <tr className="border-t border-slate-200 bg-slate-50">
                                  <td className={`${compactTableCellClass} font-semibold text-slate-900`}>Total Recipe Cost</td>
                                  <td className={`${compactTableCellClass} text-right font-bold text-slate-900`}>{formatCurrencyPKR(totalRecipeCost)}</td>
                                  <td className={`${compactTableCellClass} text-right font-semibold text-slate-900`}>100%</td>
                                </tr>
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
                                    <td className={compactTableCellClass}>{row.label === 'Ingredients' ? ingredientSummaryLabel : row.label}</td>
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
