import { type DragEvent, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Edit2, Eye, FileText, GripVertical, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrencyPKR } from '../../../lib/locale';
import {
  convertUnitQuantity,
  ensureSelectedUnitOption,
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

const isInHouseProduced = (dish: Dish) =>
  dish.productionType === 'recipe-based' ||
  dish.productionType === 'in-house' ||
  dish.sourceType === 'in-house-produced';

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

type RecipeStatusFilter = 'all' | 'with-recipe' | 'without-recipe';
type RecipeType = NonNullable<Recipe['recipeType']>;
type RecipeStatus = NonNullable<Recipe['status']>;
type RecipeDialogTab = 'ingredients' | 'costing' | 'evaluation';
type RecipeCopyOptions = {
  ingredients: boolean;
  labor: boolean;
  utility: boolean;
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

const recipeCostLineBasisOptions: Array<{ value: RecipeCostLineBasis; label: string }> = [
  { value: 'fixed', label: 'Fixed Cost' },
  { value: 'per-batch', label: 'Per Batch / Daig' },
  { value: 'per-kg-output', label: 'Per KG Output' },
  { value: 'per-kg-input', label: 'Per KG Input' },
  { value: 'per-hour', label: 'Per Hour' },
  { value: 'per-person', label: 'Per Person' },
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

const getPurchaseItemUnitCost = (item: PurchaseItem) => {
  const conversionFactor = item.conversionFactor || 1;
  const lastPurchaseCost = item.lastPurchaseRate || item.lastCost || item.defaultPurchaseCost || 0;

  if (lastPurchaseCost > 0) {
    return lastPurchaseCost / conversionFactor;
  }

  if (typeof item.ratePerUnit === 'number' && item.ratePerUnit > 0) {
    return item.ratePerUnit;
  }

  if (typeof item.averageCost === 'number' && item.averageCost > 0) {
    return item.averageCost;
  }

  return 0;
};

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
const getIngredientScaleFactor = (
  sourceYieldQuantity: number,
  sourceYieldUnitId: MeasurementUnit,
  targetYieldQuantity: number,
  targetYieldUnitId: MeasurementUnit,
  units: UnitMaster[],
) => {
  if (sourceYieldQuantity <= 0 || targetYieldQuantity <= 0) {
    return 0;
  }

  const targetYieldInSourceUnit =
    sourceYieldUnitId === targetYieldUnitId
      ? targetYieldQuantity
      : convertUnitQuantity(targetYieldQuantity, targetYieldUnitId, sourceYieldUnitId, units);

  if (targetYieldInSourceUnit === null) {
    return null;
  }

  return targetYieldInSourceUnit / sourceYieldQuantity;
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

const getCostLineBasisLabel = (basis: RecipeCostLineBasis) =>
  recipeCostLineBasisOptions.find((option) => option.value === basis)?.label || basis.replace(/-/g, ' ');

const normalizeRecipeCostLineBasis = (basis?: RecipeCostLineBasis): RecipeCostLineBasis => {
  if (basis === 'fixed-daig-capacity') {
    return 'per-batch';
  }

  if (basis === 'per-kg-yield') {
    return 'per-kg-output';
  }

  if (basis === 'per-head') {
    return 'per-person';
  }

  return basis || 'fixed';
};

const findReferencedIngredient = (line: RecipeCostLine, ingredients: RecipeIngredient[]) =>
  ingredients.find(
    (entry) =>
      entry.id === line.ingredientReferenceId ||
      entry.itemId === line.ingredientReferenceId ||
      entry.purchaseItemId === line.ingredientReferenceId,
  );

const getReferencedIngredientQuantity = (line: RecipeCostLine, ingredients: RecipeIngredient[]) => {
  const ingredient = findReferencedIngredient(line, ingredients);

  return ingredient?.scaledEntryQuantity ?? ingredient?.entryQuantity ?? ingredient?.requiredQuantity ?? ingredient?.quantity ?? 0;
};

const calculateRecipeCostLineQuantity = (
  line: RecipeCostLine,
  effectiveYield: number,
  ingredients: RecipeIngredient[] = [],
  yieldUnitId?: MeasurementUnit,
  units: UnitMaster[] = [],
) => {
  const yieldQuantity = Math.max(effectiveYield || 0, 0);
  const calculationBasis = normalizeRecipeCostLineBasis(line.calculationBasis);

  if (calculationBasis === 'fixed') {
    return 1;
  }

  if (calculationBasis === 'per-kg-output') {
    return yieldQuantity;
  }

  if (calculationBasis === 'per-kg-input') {
    return Math.max(getReferencedIngredientQuantity(line, ingredients), 0);
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
): RecipeCostLine => {
  const calculationBasis = normalizeRecipeCostLineBasis(line.calculationBasis);
  const rate = Number(line.rate) || 0;
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
  );
  const referencedIngredient = findReferencedIngredient(line, ingredients);
  const referencedIngredientUnit =
    referencedIngredient?.entryUnitId || referencedIngredient?.unit || referencedIngredient?.baseUnitId;

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
        : calculationBasis === 'per-kg-input'
          ? referencedIngredientUnit || line.unit
          : line.unit,
    ingredientReferenceId: calculationBasis === 'per-kg-input' ? line.ingredientReferenceId : undefined,
    totalCost: rate * chargeQuantity,
  };
};

const createRecipeCostLine = (
  category: RecipeCostLineCategory,
  effectiveYield: number,
  yieldUnitId: MeasurementUnit,
  units: UnitMaster[],
): RecipeCostLine =>
  syncRecipeCostLine(
    {
      id: `recipe-cost-${Date.now()}-${category}`,
      category,
      name: category === 'labor' ? 'Cook Charge' : 'LPG / Utility',
      calculationBasis: category === 'labor' ? 'per-batch' : 'fixed',
      rate: 0,
      quantity: 1,
      capacityQuantity: category === 'labor' ? 12 : undefined,
      unit: category === 'labor' ? yieldUnitId : '',
      totalCost: 0,
    },
    effectiveYield,
    [],
    yieldUnitId,
    units,
  );

const getDefaultCostLineUnit = (basis: RecipeCostLineBasis, yieldUnitId: MeasurementUnit) => {
  switch (normalizeRecipeCostLineBasis(basis)) {
    case 'per-kg-output':
    case 'per-batch':
      return yieldUnitId;
    case 'per-kg-input':
      return 'kg';
    case 'per-hour':
      return 'hour';
    case 'per-person':
      return 'person';
    default:
      return '';
  }
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
  const unitCost = linkedItem ? getPurchaseItemUnitCost(linkedItem) : ingredient.unitCost ?? ingredient.costPerUnit ?? 0;
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

const createIngredientRow = (item: PurchaseItem): RecipeIngredient => {
  const baseUnitId = getBaseUnit(item);
  const unitCost = getPurchaseItemUnitCost(item);
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
  const unitCost = linkedItem ? getPurchaseItemUnitCost(linkedItem) : ingredient.unitCost ?? ingredient.costPerUnit ?? 0;
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
  const [statusFilter, setStatusFilter] = useState<RecipeStatusFilter>('without-recipe');
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
  const [targetYieldQuantity, setTargetYieldQuantity] = useState(1);
  const [targetYieldUnitId, setTargetYieldUnitId] = useState<MeasurementUnit>('kg');
  const [preparationTimeMinutes, setPreparationTimeMinutes] = useState(30);
  const [wastageEnabled, setWastageEnabled] = useState(false);
  const [expectedWastagePercentage, setExpectedWastagePercentage] = useState(0);
  const [expectedYieldPercentage, setExpectedYieldPercentage] = useState(100);
  const [preparationSteps, setPreparationSteps] = useState('');
  const [supplyMarginPerYieldUnit, setSupplyMarginPerYieldUnit] = useState(0);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [recipeCostLines, setRecipeCostLines] = useState<RecipeCostLine[]>([]);
  const [draggedCostLineId, setDraggedCostLineId] = useState<string | null>(null);
  const [ingredientCategoryFilter, setIngredientCategoryFilter] = useState('');
  const [ingredientSearchTerm, setIngredientSearchTerm] = useState('');
  const [bulkIngredientPickerOpen, setBulkIngredientPickerOpen] = useState(false);
  const [selectedBulkIngredientIds, setSelectedBulkIngredientIds] = useState<string[]>([]);
  const [copySourceRecipeId, setCopySourceRecipeId] = useState('');
  const [copyOptions, setCopyOptions] = useState<RecipeCopyOptions>(defaultRecipeCopyOptions);

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
  const resolvedTargetYieldUnitOptions = ensureSelectedUnitOption(yieldUnitOptions, targetYieldUnitId);
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const normalizedIngredientSearch = ingredientSearchTerm.trim().toLowerCase();
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
  const selectedIngredientItemIds = new Set(recipeIngredients.map((ingredient) => ingredient.itemId || ingredient.purchaseItemId));
  const bulkIngredientOptions = filteredKitchenItems.filter((item) => !selectedIngredientItemIds.has(item.id));
  const selectedBulkIngredientSet = new Set(selectedBulkIngredientIds);
  const allVisibleBulkIngredientsSelected =
    bulkIngredientOptions.length > 0 && bulkIngredientOptions.every((item) => selectedBulkIngredientSet.has(item.id));

  const inHouseDishes = dishes.filter((dish) => dish.module === 'banquet' && isInHouseProduced(dish));
  const getLinkedRecipe = (dish: Dish) => {
    const recipeById = dish.recipeId ? recipesById.get(dish.recipeId) : undefined;
    return recipeById || recipes.find((recipe) => recipe.dishId === dish.id);
  };
  const dishHasSavedRecipe = (dish: Dish) => Boolean(getLinkedRecipe(dish));
  const filteredDishes = inHouseDishes.filter((dish) => {
    const recipe = getLinkedRecipe(dish);
    const matchesSearch =
      !normalizedSearch ||
      dish.dishName.toLowerCase().includes(normalizedSearch) ||
      dish.cuisineName.toLowerCase().includes(normalizedSearch) ||
      getRecipeName(dish, recipe).toLowerCase().includes(normalizedSearch) ||
      getRecipeOutputItemName(recipe, purchaseItems).toLowerCase().includes(normalizedSearch);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'with-recipe' && dishHasSavedRecipe(dish)) ||
      (statusFilter === 'without-recipe' && !dishHasSavedRecipe(dish));

    return matchesSearch && matchesStatus;
  });

  const totalRecipeCount = inHouseDishes.filter(dishHasSavedRecipe).length;
  const totalMissingRecipeCount = inHouseDishes.length - totalRecipeCount;
  const mismatchedLinkedRecipeDishes = inHouseDishes
    .map((dish) => ({ dish, recipe: getLinkedRecipe(dish) }))
    .filter(({ dish, recipe }) => recipe && (dish.recipeId !== recipe.id || dish.hasRecipe !== true));
  const currentRecipe = selectedDish ? getLinkedRecipe(selectedDish) : undefined;
  const copyableRecipes = recipes
    .filter((recipe) => recipe.id !== currentRecipe?.id)
    .sort((left, right) => (left.recipeName || '').localeCompare(right.recipeName || ''));
  const selectedCopyRecipe = copySourceRecipeId ? recipesById.get(copySourceRecipeId) : undefined;

  const ingredientScaleFactor = getIngredientScaleFactor(
    yieldQuantity,
    yieldUnitId,
    targetYieldQuantity,
    targetYieldUnitId,
    units,
  );
  const resolvedIngredientScaleFactor =
    ingredientScaleFactor === null ? 0 : ingredientScaleFactor > 0 ? ingredientScaleFactor : 0;
  const pricedRecipeIngredients = recipeIngredients.map((ingredient) =>
    syncIngredientRow(ingredient, purchaseItems, units, resolvedIngredientScaleFactor),
  );
  const sourceRecipeIngredients = recipeIngredients.map((ingredient) => syncIngredientRow(ingredient, purchaseItems, units, 1));
  const sourceIngredientCost = sourceRecipeIngredients.reduce((sum, ingredient) => sum + (ingredient.totalCost || 0), 0);
  const totalIngredientCost = pricedRecipeIngredients.reduce((sum, ingredient) => sum + (ingredient.totalCost || 0), 0);
  const sourceWastageCost = wastageEnabled
    ? sourceRecipeIngredients.reduce(
      (sum, ingredient) => sum + ((ingredient.baseQuantity || 0) * (ingredient.unitCost || 0) * ((ingredient.wastagePercentage || 0) / 100)),
      0,
    )
    : 0;
  const wastageCost = wastageEnabled
    ? pricedRecipeIngredients.reduce(
      (sum, ingredient) => sum + (((ingredient.scaledBaseQuantity || 0) * (ingredient.unitCost || 0)) * ((ingredient.wastagePercentage || 0) / 100)),
      0,
    )
    : 0;
  const effectiveYieldQuantity = yieldQuantity > 0 ? yieldQuantity * (expectedYieldPercentage / 100 || 1) : 0;
  const targetYieldInSourceUnit =
    targetYieldUnitId === yieldUnitId
      ? targetYieldQuantity
      : convertUnitQuantity(targetYieldQuantity, targetYieldUnitId, yieldUnitId, units);
  const effectiveTargetYieldQuantity =
    targetYieldInSourceUnit !== null ? targetYieldInSourceUnit * (expectedYieldPercentage / 100 || 1) : 0;
  const syncedRecipeCostLines = recipeCostLines.map((line) =>
    syncRecipeCostLine(line, effectiveTargetYieldQuantity || effectiveYieldQuantity, pricedRecipeIngredients, yieldUnitId, units),
  );
  const sourceRecipeCostLines = recipeCostLines.map((line) =>
    syncRecipeCostLine(line, effectiveYieldQuantity, sourceRecipeIngredients, yieldUnitId, units),
  );
  const laborCost = syncedRecipeCostLines
    .filter((line) => line.category === 'labor')
    .reduce((sum, line) => sum + (line.totalCost || 0), 0);
  const utilitiesCost = syncedRecipeCostLines
    .filter((line) => line.category === 'utility')
    .reduce((sum, line) => sum + (line.totalCost || 0), 0);
  const additionalCost = laborCost + utilitiesCost;
  const laborCostLines = syncedRecipeCostLines.filter((line) => line.category === 'labor');
  const utilityCostLines = syncedRecipeCostLines.filter((line) => line.category === 'utility');
  const totalRecipeCost = totalIngredientCost + wastageCost + additionalCost;
  const sourceLaborCost = sourceRecipeCostLines
    .filter((line) => line.category === 'labor')
    .reduce((sum, line) => sum + (line.totalCost || 0), 0);
  const sourceUtilitiesCost = sourceRecipeCostLines
    .filter((line) => line.category === 'utility')
    .reduce((sum, line) => sum + (line.totalCost || 0), 0);
  const sourceAdditionalCost = sourceLaborCost + sourceUtilitiesCost;
  const sourceTotalRecipeCost = sourceIngredientCost + sourceWastageCost + sourceAdditionalCost;
  const costPerYieldUnit = effectiveYieldQuantity > 0 ? sourceTotalRecipeCost / effectiveYieldQuantity : 0;
  const supplySellingPricePerYieldUnit = costPerYieldUnit + supplyMarginPerYieldUnit;
  const foodCostPercentage =
    supplySellingPricePerYieldUnit > 0 ? (costPerYieldUnit / supplySellingPricePerYieldUnit) * 100 : 0;
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
  ];

  const openRecipeDialog = (dish: Dish, nextViewMode: boolean) => {
    const existingRecipe = getLinkedRecipe(dish);
    const existingYieldQuantity = existingRecipe?.yieldQuantity ?? existingRecipe?.yields ?? 1;
    const existingExpectedYieldPercentage = existingRecipe?.expectedYieldPercentage ?? 100;
    const existingEffectiveYieldQuantity =
      existingYieldQuantity > 0 ? existingYieldQuantity * (existingExpectedYieldPercentage / 100 || 1) : 0;
    const existingCostPerYieldUnit = existingRecipe?.costPerYieldUnit ?? existingRecipe?.costPerPortion ?? 0;
    const existingSupplySellingPrice =
      existingRecipe?.supplySellingPricePerYieldUnit ?? existingRecipe?.suggestedSellingPrice ?? 0;
    const existingSupplyMargin =
      existingRecipe?.supplyMarginPerYieldUnit ?? Math.max(existingSupplySellingPrice - existingCostPerYieldUnit, 0);
    const normalizedIngredients = existingRecipe?.ingredients?.length
      ? sortIngredientsByCategoryAndCost(
        existingRecipe.ingredients.map((ingredient) => normalizeIngredient(ingredient, purchaseItems, units)),
        purchaseItems,
      )
      : [];
    const hasExistingWastage =
      (existingRecipe?.expectedWastagePercentage ?? 0) > 0 ||
      normalizedIngredients.some((ingredient) => (ingredient.wastagePercentage || 0) > 0);

    setSelectedDish(existingRecipe ? { ...dish, hasRecipe: true, recipeId: existingRecipe.id } : dish);
    setViewMode(nextViewMode);
    setRecipeActiveTab('ingredients');
    setRecipeHeaderOpen(!existingRecipe);
    setYieldSetupOpen(!existingRecipe);
    setIngredientsOpen(true);
    setPreparationNotesOpen(Boolean(existingRecipe?.preparationSteps));
    setRecipeName(existingRecipe?.recipeName || dish.dishName);
    setRecipeCode(existingRecipe?.recipeCode || generateRecipeCode(recipes));
    setRecipeType(existingRecipe?.recipeType || 'menu-recipe');
    setRecipeCategoryId(existingRecipe?.recipeCategoryId || '');
    setKitchenSectionId(existingRecipe?.kitchenSectionId || '');
    setRecipeStatus(existingRecipe?.status || 'active');
    setYieldQuantity(existingRecipe?.yieldQuantity ?? existingRecipe?.yields ?? 1);
    setYieldUnitId(existingRecipe?.yieldUnitId || existingRecipe?.yieldUnit || 'kg');
    setTargetYieldQuantity(existingRecipe?.targetYieldQuantity ?? 1);
    setTargetYieldUnitId(existingRecipe?.targetYieldUnitId || existingRecipe?.yieldUnitId || existingRecipe?.yieldUnit || 'kg');
    setPreparationTimeMinutes(existingRecipe?.preparationTimeMinutes ?? existingRecipe?.preparationTime ?? 30);
    setWastageEnabled(hasExistingWastage);
    setExpectedWastagePercentage(existingRecipe?.expectedWastagePercentage ?? 0);
    setExpectedYieldPercentage(existingRecipe?.expectedYieldPercentage ?? 100);
    setPreparationSteps(existingRecipe?.preparationSteps || '');
    setSupplyMarginPerYieldUnit(existingSupplyMargin);
    setRecipeIngredients(normalizedIngredients);
    setRecipeCostLines(
      existingRecipe?.additionalCostLines?.length
        ? existingRecipe.additionalCostLines.map((line) =>
          syncRecipeCostLine(
            line,
            existingEffectiveYieldQuantity,
            normalizedIngredients,
            existingRecipe.yieldUnitId || existingRecipe.yieldUnit || 'kg',
            units,
          ),
        )
        : [],
    );
    setIngredientCategoryFilter('');
    setIngredientSearchTerm('');
    setBulkIngredientPickerOpen(false);
    setSelectedBulkIngredientIds([]);
    setCopySourceRecipeId('');
    setCopyOptions(defaultRecipeCopyOptions);
    setDialogOpen(true);
  };

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

      return [...current, createIngredientRow(nextItem)];
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

    setRecipeIngredients((current) => [...current, ...itemsToAdd.map((item) => createIngredientRow(item))]);
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
    const sourceTargetYieldQuantity = selectedCopyRecipe.targetYieldQuantity ?? 1;
    const sourceTargetYieldUnitId = selectedCopyRecipe.targetYieldUnitId || sourceYieldUnitId;
    const sourceExpectedYieldPercentage = selectedCopyRecipe.expectedYieldPercentage ?? 100;
    const nextYieldQuantity = copyOptions.yieldSetup ? sourceYieldQuantity : yieldQuantity;
    const nextYieldUnitId = copyOptions.yieldSetup ? sourceYieldUnitId : yieldUnitId;
    const nextEffectiveYield =
      nextYieldQuantity > 0
        ? nextYieldQuantity * ((copyOptions.yieldSetup ? sourceExpectedYieldPercentage : expectedYieldPercentage) / 100 || 1)
        : 0;
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
          syncRecipeCostLine(
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
          ),
        );

    if (copyOptions.yieldSetup) {
      setYieldQuantity(sourceYieldQuantity);
      setYieldUnitId(sourceYieldUnitId);
      setTargetYieldQuantity(sourceTargetYieldQuantity);
      setTargetYieldUnitId(sourceTargetYieldUnitId);
      setPreparationTimeMinutes(selectedCopyRecipe.preparationTimeMinutes ?? selectedCopyRecipe.preparationTime ?? 30);
      setExpectedWastagePercentage(selectedCopyRecipe.expectedWastagePercentage ?? 0);
      setExpectedYieldPercentage(sourceExpectedYieldPercentage);
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

    if (copyOptions.labor || copyOptions.utility) {
      const copiedLaborLines = copyOptions.labor ? copyCostLines('labor') : laborCostLines;
      const copiedUtilityLines = copyOptions.utility ? copyCostLines('utility') : utilityCostLines;
      setRecipeCostLines([...copiedLaborLines, ...copiedUtilityLines]);
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
          unitCost: getPurchaseItemUnitCost(item),
          costPerUnit: getPurchaseItemUnitCost(item),
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
      createRecipeCostLine(category, effectiveTargetYieldQuantity || effectiveYieldQuantity, yieldUnitId, units),
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
      const nextLine = syncRecipeCostLine(
        {
          ...currentLine,
          [field]: fieldValue,
          calculationBasis: nextBasis,
          unit:
            field === 'calculationBasis'
              ? getDefaultCostLineUnit(nextBasis, yieldUnitId)
              : field === 'unit'
                ? String(value)
                : currentLine.unit,
          ingredientReferenceId:
            field === 'calculationBasis'
              ? nextBasis === 'per-kg-input'
                ? currentLine.ingredientReferenceId
                : undefined
              : field === 'ingredientReferenceId'
                ? String(value)
                : currentLine.ingredientReferenceId,
        },
        effectiveTargetYieldQuantity || effectiveYieldQuantity,
        pricedRecipeIngredients,
        yieldUnitId,
        units,
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

      const otherLines = current.filter((line) => line.category !== category);

      return category === 'labor'
        ? [...reorderedSection, ...otherLines]
        : [...otherLines, ...reorderedSection];
    });
    setDraggedCostLineId(null);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedDish(null);
    setViewMode(false);
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
    if (!recipeName.trim()) {
      toast.error('Recipe name is required');
      return false;
    }

    if (!recipeType) {
      toast.error('Recipe type is required');
      return false;
    }

    if (yieldQuantity <= 0) {
      toast.error('Yield quantity must be greater than 0');
      return false;
    }

    if (!yieldUnitId) {
      toast.error('Yield unit is required');
      return false;
    }

    if (targetYieldQuantity <= 0) {
      toast.error('Target yield quantity must be greater than 0');
      return false;
    }

    if (!targetYieldUnitId) {
      toast.error('Target yield unit is required');
      return false;
    }

    if (ingredientScaleFactor === null) {
      toast.error('Target yield unit must be convertible to the source yield unit');
      return false;
    }

    if (expectedYieldPercentage <= 0) {
      toast.error('Expected yield % must be greater than 0');
      return false;
    }

    if (wastageEnabled && expectedWastagePercentage < 0) {
      toast.error('Expected wastage % cannot be negative');
      return false;
    }

    if (supplyMarginPerYieldUnit < 0) {
      toast.error('Supply margin cannot be negative');
      return false;
    }

    if (recipeIngredients.length === 0) {
      toast.error('Add at least one ingredient');
      return false;
    }

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

    for (const line of syncedRecipeCostLines) {
      const calculationBasis = normalizeRecipeCostLineBasis(line.calculationBasis);

      if (!line.name.trim()) {
        toast.error('Labor and utility cost names are required');
        return false;
      }

      if (line.rate < 0 || line.totalCost < 0) {
        toast.error('Labor and utility costs cannot be negative');
        return false;
      }

      if (calculationBasis === 'per-batch' && (!line.capacityQuantity || line.capacityQuantity <= 0)) {
        toast.error('Batch capacity must be greater than 0');
        return false;
      }

      if (calculationBasis === 'per-kg-input') {
        const referencedIngredient = findReferencedIngredient(line, pricedRecipeIngredients);

        if (!line.ingredientReferenceId || !referencedIngredient) {
          toast.error('Ingredient reference is required for Per KG Input labor and utility costs');
          return false;
        }
      }

      if (['per-hour', 'per-person'].includes(calculationBasis) && (!line.quantity || line.quantity <= 0)) {
        toast.error('Hours or person count must be greater than 0');
        return false;
      }
    }

    return true;
  };

  const handleSaveRecipe = () => {
    if (!selectedDish || !validateRecipe()) {
      return;
    }

    const existingRecipe = getLinkedRecipe(selectedDish);
    const existingOutputItem =
      existingRecipe?.outputItemId ? purchaseItems.find((item) => item.id === existingRecipe.outputItemId) : undefined;
    const resolvedOutputItemId =
      suggestedOutputItem?.id ||
      (existingOutputItem && !isIngredientStyleOutputItem(existingOutputItem) ? existingOutputItem.id : undefined);
    const now = new Date();
    const normalizedIngredients = sortIngredientsByCategoryAndCost(pricedRecipeIngredients.map((ingredient) => {
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
      syncRecipeCostLine(line, effectiveYieldQuantity, sourceRecipeIngredients, yieldUnitId, units),
    );

    const recipeData: Recipe = {
      id: existingRecipe?.id || `recipe-${Date.now()}`,
      dishId: selectedDish.id,
      recipeName: recipeName.trim(),
      recipeCode,
      recipeType,
      outputItemId: resolvedOutputItemId,
      outputItemName: isMenuRecipe ? selectedDish.dishName : recipeName.trim(),
      recipeCategoryId: recipeCategoryId || undefined,
      kitchenSectionId: kitchenSectionId || undefined,
      status: recipeStatus,
      ingredients: normalizedIngredients,
      preparationSteps: preparationSteps.trim() || undefined,
      preparationTimeMinutes,
      preparationTime: preparationTimeMinutes,
      yieldQuantity,
      yields: yieldQuantity,
      yieldUnitId,
      yieldUnit: yieldUnitId,
      targetYieldQuantity,
      targetYieldUnitId,
      expectedWastagePercentage: wastageEnabled ? expectedWastagePercentage : 0,
      expectedYieldPercentage,
      totalIngredientCost: sourceIngredientCost,
      wastageCost: sourceWastageCost,
      laborCost: sourceLaborCost,
      utilitiesCost: sourceUtilitiesCost,
      additionalCost: sourceAdditionalCost,
      additionalCostLines: normalizedCostLines,
      totalRecipeCost: sourceTotalRecipeCost,
      totalProductionCost: sourceTotalRecipeCost,
      totalCost: sourceTotalRecipeCost,
      costPerPortion: costPerYieldUnit,
      costPerYieldUnit,
      supplyMarginPerYieldUnit,
      supplySellingPricePerYieldUnit,
      supplyFoodCostPercentage: foodCostPercentage,
      suggestedSellingPrice: supplySellingPricePerYieldUnit,
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
    const effectiveCostYield = effectiveTargetYieldQuantity || effectiveYieldQuantity;

    if (calculationBasis === 'fixed') {
      return <span className="block text-right text-xs text-slate-400">-</span>;
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
      return (
        <div
          className="flex h-7 items-center justify-end rounded border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700"
          title="Auto from selected ingredient quantity"
        >
          {getReferencedIngredientQuantity(line, pricedRecipeIngredients).toFixed(2)}
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
  ) => (
    <section className="overflow-hidden rounded border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">{title}</div>
        <div className="text-xs font-semibold text-slate-900">{formatCurrencyPKR(total)}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] table-fixed">
          <thead className="bg-white">
            <tr className="border-b border-slate-200">
              <th className={`${compactTableHeadClass} w-[22%]`}>Name</th>
              <th className={`${compactTableHeadClass} w-[15%]`}>Calculation Method</th>
              <th className={`${compactTableHeadClass} w-[10%] text-right`}>Rate</th>
              <th className={`${compactTableHeadClass} w-[12%] text-right`}>Qty / Capacity</th>
              <th className={`${compactTableHeadClass} w-[9%]`}>Unit</th>
              <th className={`${compactTableHeadClass} w-[18%]`}>Ingredient Reference</th>
              <th className={`${compactTableHeadClass} w-[10%] text-right`}>Total</th>
              <th className={`${compactTableHeadClass} w-[4%] text-right`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((line) => {
              const calculationBasis = normalizeRecipeCostLineBasis(line.calculationBasis);
              const defaultUnit = getDefaultCostLineUnit(calculationBasis, yieldUnitId);
              const referencedIngredient = findReferencedIngredient(line, pricedRecipeIngredients);
              const ingredientUnit =
                referencedIngredient?.entryUnitId || referencedIngredient?.unit || referencedIngredient?.baseUnitId || 'kg';
              const unitValue =
                calculationBasis === 'fixed'
                  ? ''
                  : calculationBasis === 'per-kg-input'
                    ? ingredientUnit
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
                        placeholder={category === 'labor' ? 'Cook, helper, loader' : 'LPG, electricity, water'}
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
                      {recipeCostLineBasisOptions.map((option) => (
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
                      disabled={viewMode}
                      className={`${compactInputClass} text-right`}
                    />
                  </td>
                  <td className={compactTableCellClass}>{renderCostLineQuantityControl(line)}</td>
                  <td className={compactTableCellClass}>
                    <input
                      type="text"
                      value={unitValue}
                      onChange={(event) => handleRecipeCostLineChange(line.id, 'unit', event.target.value)}
                      disabled={viewMode || ['fixed', 'per-kg-output', 'per-kg-input'].includes(calculationBasis)}
                      className={compactInputClass}
                    />
                  </td>
                  <td className={compactTableCellClass}>
                    {calculationBasis === 'per-kg-input' ? (
                      <select
                        value={line.ingredientReferenceId || ''}
                        onChange={(event) => handleRecipeCostLineChange(line.id, 'ingredientReferenceId', event.target.value)}
                        disabled={viewMode}
                        className={compactInputClass}
                      >
                        <option value="">Select ingredient</option>
                        {pricedRecipeIngredients.map((ingredient) => {
                          const ingredientId = ingredient.id || ingredient.itemId || ingredient.purchaseItemId || '';
                          const ingredientName = ingredient.itemName || ingredient.purchaseItemName || 'Ingredient';
                          const quantity = ingredient.scaledEntryQuantity ?? ingredient.entryQuantity ?? ingredient.quantity ?? 0;
                          const unit = ingredient.entryUnitId || ingredient.unit || ingredient.baseUnitId || '';

                          return (
                            <option key={ingredientId} value={ingredientId}>
                              {ingredientName} ({quantity.toFixed(2)} {unit})
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <span className="block truncate text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className={`${compactTableCellClass} text-right font-semibold text-slate-900`}>
                    {formatCurrencyPKR(line.totalCost || 0)}
                  </td>
                  <td className={`${compactTableCellClass} text-right`}>
                    {!viewMode ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipeCostLine(line.id)}
                        title={`Remove ${category === 'labor' ? 'labor' : 'utility'} cost`}
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
                <td className="px-3 py-5 text-center text-xs text-slate-500" colSpan={8}>
                  No {category === 'labor' ? 'labor' : 'utility'} costs added.
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

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <h2 className="mr-2 text-base font-semibold text-slate-900">Kitchen Recipe / BOM</h2>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search dish, recipe, or output item"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as RecipeStatusFilter)}
            className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            <option value="all">All Dishes</option>
            <option value="without-recipe">Without Recipe</option>
            <option value="with-recipe">With Recipe</option>
          </select>
        </div>

        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span><strong className="text-slate-900">In-House Dishes:</strong> {inHouseDishes.length}</span>
            <span><strong className="text-slate-900">With Recipe:</strong> {totalRecipeCount}</span>
            <span><strong className="text-slate-900">Without Recipe:</strong> {totalMissingRecipeCount}</span>
            <span><strong className="text-slate-900">Active Kitchen Items:</strong> {activeKitchenItems.length}</span>
            <span><strong className="text-slate-900">Recipe Ingredients:</strong> {activeIngredientItems.length}</span>
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
            <button
              type="button"
              onClick={repairRecipeDishLinks}
              className="h-7 rounded border border-amber-300 bg-white px-2 font-semibold text-amber-900 hover:bg-amber-100"
            >
              Repair Links
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {filteredDishes.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-300 bg-white px-6 text-center">
            <div>
              <FileText className="mx-auto mb-3 size-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No recipe rows found</p>
              <p className="mt-1 text-xs text-slate-500">
                {searchTerm || statusFilter !== 'all'
                  ? 'No dishes match the current filters.'
                  : 'No in-house banquet dishes are ready for recipe setup.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <h3 className="text-sm font-semibold text-slate-900">Recipe Register</h3>
              <span className="text-xs text-slate-500">{filteredDishes.length} rows</span>
            </div>
            <div className="overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className={tableHeadClass}>Dish</th>
                    <th className={tableHeadClass}>Recipe Code</th>
                    <th className={tableHeadClass}>Recipe Type</th>
                    <th className={tableHeadClass}>Output Item</th>
                    <th className={tableHeadClass}>Yield</th>
                    <th className={`${tableHeadClass} text-right`}>Cost / Yield</th>
                    <th className={tableHeadClass}>Status</th>
                    <th className={`${tableHeadClass} text-right`}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDishes.map((dish) => {
                    const recipe = getLinkedRecipe(dish);
                    return (
                      <tr key={dish.id} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{dish.dishName}</div>
                          <div className="text-xs text-slate-500">
                            {dish.cuisineName} | {dish.preparationArea.replace(/-/g, ' ')}
                          </div>
                        </td>
                        <td className={tableCellClass}>{getRecipeCode(recipe)}</td>
                        <td className={tableCellClass}>{recipe ? getRecipeTypeLabel(recipe.recipeType || 'menu-recipe') : '-'}</td>
                        <td className={tableCellClass}>{getRecipeOutputItemName(recipe, purchaseItems)}</td>
                        <td className={tableCellClass}>
                          {recipe ? `${getYieldQuantity(recipe)} ${getYieldUnit(recipe)}` : '-'}
                        </td>
                        <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                          {recipe ? formatCurrencyPKR(recipe.costPerYieldUnit || 0) : '-'}
                        </td>
                        <td className={tableCellClass}>
                          <span
                            className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${
                              recipe
                                ? recipe.status === 'inactive'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {getRecipeStatusLabel(recipe)}
                          </span>
                        </td>
                        <td className={`${tableCellClass} text-right`}>
                          <div className="inline-flex items-center gap-1">
                            {recipe ? (
                              <button
                                onClick={() => openRecipeDialog(dish, true)}
                                className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <Eye className="size-3.5" />
                                View
                              </button>
                            ) : null}
                            <button
                              onClick={() => openRecipeDialog(dish, false)}
                              className="inline-flex h-7 items-center gap-1 rounded border border-blue-600 bg-blue-600 px-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
                              disabled={activeIngredientItems.length === 0}
                            >
                              {recipe ? <Edit2 className="size-3.5" /> : <Plus className="size-3.5" />}
                              {recipe ? 'Edit' : 'Create'}
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
        )}
      </div>

      {dialogOpen && selectedDish ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="flex max-h-[94vh] w-full max-w-7xl flex-col rounded bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {viewMode ? 'View Recipe' : selectedDish.hasRecipe ? 'Edit Recipe' : 'Create Recipe'}: {selectedDish.dishName}
                </h2>
                <p className="text-xs text-slate-500">Compact kitchen ERP recipe / BOM</p>
              </div>
              <button onClick={closeDialog} className="rounded p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-3">
                <section className="rounded border border-slate-200 bg-white">
                  <div className={sectionTitleClass}>Cost Summary</div>
                  <div className="grid grid-cols-2 gap-px bg-slate-200 md:grid-cols-5 xl:grid-cols-10">
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Ingredient Cost</div>
                      <div className="font-semibold text-slate-900">{formatCurrencyPKR(totalIngredientCost)}</div>
                    </div>
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Target Wastage Cost</div>
                      <div className="font-semibold text-slate-900">{formatCurrencyPKR(wastageCost)}</div>
                    </div>
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Target Labor Cost</div>
                      <div className="font-semibold text-slate-900">{formatCurrencyPKR(laborCost)}</div>
                    </div>
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Target Utilities Cost</div>
                      <div className="font-semibold text-slate-900">{formatCurrencyPKR(utilitiesCost)}</div>
                    </div>
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Source Production Cost</div>
                      <div className="font-semibold text-slate-900">{formatCurrencyPKR(sourceTotalRecipeCost)}</div>
                    </div>
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Target Batch Cost</div>
                      <div className="font-semibold text-slate-900">{formatCurrencyPKR(totalRecipeCost)}</div>
                    </div>
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Source Yield</div>
                      <div className="font-semibold text-slate-900">{yieldQuantity} {yieldUnitId}</div>
                    </div>
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Target Yield</div>
                      <div className="font-semibold text-slate-900">{targetYieldQuantity} {targetYieldUnitId}</div>
                    </div>
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Cost Per Yield Unit</div>
                      <div className="font-semibold text-slate-900">{formatCurrencyPKR(costPerYieldUnit)}</div>
                    </div>
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Supply Margin / {yieldUnitId}</div>
                      {viewMode ? (
                        <div className="font-semibold text-slate-900">{formatCurrencyPKR(supplyMarginPerYieldUnit)}</div>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={supplyMarginPerYieldUnit}
                          onChange={(event) => setSupplyMarginPerYieldUnit(Number(event.target.value))}
                          className={`${inputClass} mt-1`}
                        />
                      )}
                    </div>
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Supply Price / {yieldUnitId}</div>
                      <div className="font-semibold text-slate-900">{formatCurrencyPKR(supplySellingPricePerYieldUnit)}</div>
                    </div>
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Supply Food Cost %</div>
                      <div className="font-semibold text-slate-900">
                        {Number.isFinite(foodCostPercentage) ? `${foodCostPercentage.toFixed(2)}%` : '0.00%'}
                      </div>
                    </div>
                  </div>
                </section>

                {!viewMode && copyableRecipes.length > 0 ? (
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
                        ['yieldSetup', 'Yield Setup'],
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
                  title="Yield Setup"
                  open={yieldSetupOpen}
                  onToggle={() => setYieldSetupOpen((current) => !current)}
                >
                  <div>
                    <label className={labelClass}>Source Yield Quantity <span className="text-red-500">*</span></label>
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
                    <label className={labelClass}>Source Yield Unit <span className="text-red-500">*</span></label>
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
                    <label className={labelClass}>Target Yield Quantity <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={targetYieldQuantity}
                      onChange={(event) => setTargetYieldQuantity(Number(event.target.value))}
                      disabled={viewMode}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Target Yield Unit <span className="text-red-500">*</span></label>
                    <select
                      value={targetYieldUnitId}
                      onChange={(event) => setTargetYieldUnitId(event.target.value as MeasurementUnit)}
                      disabled={viewMode}
                      className={inputClass}
                    >
                      {resolvedTargetYieldUnitOptions.map((unit) => (
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
                  <div>
                    <label className={labelClass}>Expected Yield %</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={expectedYieldPercentage}
                      onChange={(event) => setExpectedYieldPercentage(Number(event.target.value))}
                      disabled={viewMode}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      Enter the chef recipe once as the source batch, then set a target yield to preview scaled ingredient quantities and target-batch cost automatically.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {ingredientScaleFactor === null
                        ? 'Target yield unit must be convertible to the source yield unit.'
                        : `Scale factor: ${resolvedIngredientScaleFactor.toFixed(4)}x | Source ${yieldQuantity} ${yieldUnitId} -> Target ${targetYieldQuantity} ${targetYieldUnitId}`}
                    </p>
                  </div>
                </CollapsibleFormSection>

                <section className="rounded border border-slate-200 bg-white">
                  <div className="flex border-b border-slate-200 bg-slate-50 px-3 pt-2">
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
                    <button
                      type="button"
                      onClick={() => setRecipeActiveTab('costing')}
                      className={`h-8 rounded-t border border-b-0 px-3 text-xs font-semibold uppercase tracking-wide ${
                        recipeActiveTab === 'costing'
                          ? 'border-slate-200 bg-white text-slate-900'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Labor & Utilities
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
                      Evaluation
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
                              const latestUnitCost = selectedItem ? getPurchaseItemUnitCost(selectedItem) : 0;
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
                        <div className="grid grid-cols-3 gap-px overflow-hidden rounded border border-slate-200 bg-slate-200 text-xs">
                          <div className="bg-white px-2.5 py-1">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Labor</div>
                            <div className="font-semibold text-slate-900">{formatCurrencyPKR(laborCost)}</div>
                          </div>
                          <div className="bg-white px-2.5 py-1">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Utilities</div>
                            <div className="font-semibold text-slate-900">{formatCurrencyPKR(utilitiesCost)}</div>
                          </div>
                          <div className="bg-white px-2.5 py-1">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Cost / {yieldUnitId}</div>
                            <div className="font-semibold text-slate-900">{formatCurrencyPKR(costPerYieldUnit)}</div>
                          </div>
                        </div>
                        {!viewMode ? (
                          <div className="flex flex-wrap gap-2">
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
                          </div>
                        ) : null}
                      </div>
                      <div className="space-y-2 p-2">
                        {renderCostSection('labor', 'Labor Costs', laborCostLines, laborCost)}
                        {renderCostSection('utility', 'Utility Costs', utilityCostLines, utilitiesCost)}
                        <div className="sticky bottom-0 z-10 flex items-center justify-between rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm shadow-sm">
                          <div className="font-semibold text-blue-950">Total Labor & Utility Cost</div>
                          <div className="text-base font-bold text-blue-950">{formatCurrencyPKR(additionalCost)}</div>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {recipeActiveTab === 'evaluation' ? (
                    <>
                      <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 md:grid-cols-3 xl:grid-cols-6">
                        <div className="bg-white px-3 py-2 text-sm">
                          <div className="text-xs text-slate-500">Target Batch Cost</div>
                          <div className="font-semibold text-slate-900">{formatCurrencyPKR(totalRecipeCost)}</div>
                        </div>
                        <div className="bg-white px-3 py-2 text-sm">
                          <div className="text-xs text-slate-500">Target Ingredient Cost</div>
                          <div className="font-semibold text-slate-900">{formatCurrencyPKR(totalIngredientCost)}</div>
                        </div>
                        <div className="bg-white px-3 py-2 text-sm">
                          <div className="text-xs text-slate-500">Cost / {yieldUnitId}</div>
                          <div className="font-semibold text-slate-900">{formatCurrencyPKR(costPerYieldUnit)}</div>
                        </div>
                        <div className="bg-white px-3 py-2 text-sm">
                          <div className="text-xs text-slate-500">Source Yield</div>
                          <div className="font-semibold text-slate-900">{yieldQuantity} {yieldUnitId}</div>
                        </div>
                        <div className="bg-white px-3 py-2 text-sm">
                          <div className="text-xs text-slate-500">Target Yield</div>
                          <div className="font-semibold text-slate-900">{targetYieldQuantity} {targetYieldUnitId}</div>
                        </div>
                        <div className="bg-white px-3 py-2 text-sm">
                          <div className="text-xs text-slate-500">Scale Factor</div>
                          <div className="font-semibold text-slate-900">
                            {ingredientScaleFactor === null ? 'Invalid' : `${resolvedIngredientScaleFactor.toFixed(4)}x`}
                          </div>
                        </div>
                        <div className="bg-white px-3 py-2 text-sm">
                          <div className="text-xs text-slate-500">Supply Price / {yieldUnitId}</div>
                          <div className="font-semibold text-slate-900">{formatCurrencyPKR(supplySellingPricePerYieldUnit)}</div>
                        </div>
                        <div className="bg-white px-3 py-2 text-sm">
                          <div className="text-xs text-slate-500">Food Cost %</div>
                          <div className="font-semibold text-slate-900">
                            {Number.isFinite(foodCostPercentage) ? `${foodCostPercentage.toFixed(2)}%` : '0.00%'}
                          </div>
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
                  Save Recipe
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
