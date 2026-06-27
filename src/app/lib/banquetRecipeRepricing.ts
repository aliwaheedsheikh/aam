import { calculateStandardRecipeMetrics } from './recipeCostingMath.js';
import { convertUnitQuantity } from './unitConversion';
import type {
  Dish,
  MeasurementUnit,
  MenuItemVariant,
  MenuPackage,
  PurchaseItem,
  Recipe,
  RecipeCostLine,
  RecipeIngredient,
  UnitMaster,
} from '../components/kitchen/types';

const legacyInventoryTypeMap = {
  'ready-made': 'finished-product',
  consumable: 'packaging-material',
  packaging: 'packaging-material',
} as const;

const getInventoryType = (item: PurchaseItem) => item.inventoryType || legacyInventoryTypeMap[item.category] || 'raw-material';
const getBaseUnit = (item: PurchaseItem) => item.baseUnitId || item.issueUnit;
const getPurchaseItemPurchaseUnit = (item?: PurchaseItem) => item?.purchaseUnitId || item?.purchaseUnit || '-';
const getIngredientEntryUnit = (ingredient: RecipeIngredient, linkedItem?: PurchaseItem) =>
  ingredient.entryUnitId || ingredient.unit || ingredient.baseUnitId || linkedItem?.baseUnitId || linkedItem?.issueUnit || 'pcs';

const normalizeMatchText = (value?: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

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

const getPurchaseItemLastPurchaseRate = (item?: PurchaseItem) =>
  item ? item.lastPurchaseRate || item.lastCost || item.defaultPurchaseCost || 0 : 0;

const getIngredientCategoryKey = (item: PurchaseItem) => item.categoryId || item.category || 'uncategorized';

const formatIngredientCategoryLabel = (value: string) =>
  value === 'uncategorized'
    ? 'Uncategorized'
    : value
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());

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

const ingredientsEqual = (left: RecipeIngredient, right: RecipeIngredient) =>
  left.itemId === right.itemId &&
  left.purchaseItemId === right.purchaseItemId &&
  left.itemName === right.itemName &&
  left.purchaseItemName === right.purchaseItemName &&
  left.categoryId === right.categoryId &&
  left.categoryName === right.categoryName &&
  left.entryQuantity === right.entryQuantity &&
  left.entryUnitId === right.entryUnitId &&
  left.requiredQuantity === right.requiredQuantity &&
  left.quantity === right.quantity &&
  left.baseQuantity === right.baseQuantity &&
  left.scaledEntryQuantity === right.scaledEntryQuantity &&
  left.scaledBaseQuantity === right.scaledBaseQuantity &&
  left.baseUnitId === right.baseUnitId &&
  left.unit === right.unit &&
  left.lastPurchaseRate === right.lastPurchaseRate &&
  left.lastPurchaseUnit === right.lastPurchaseUnit &&
  left.unitCost === right.unitCost &&
  left.costPerUnit === right.costPerUnit &&
  left.wastagePercentage === right.wastagePercentage &&
  left.netQuantity === right.netQuantity &&
  left.totalCost === right.totalCost;

const syncStoredIngredient = (
  ingredient: RecipeIngredient,
  purchaseItems: PurchaseItem[],
  units: UnitMaster[],
): RecipeIngredient => {
  const itemId = ingredient.itemId || ingredient.purchaseItemId;
  const linkedItem = resolveRecipeIngredientItem(ingredient, purchaseItems);
  const resolvedItemId = linkedItem?.id || itemId;
  const entryQuantity = ingredient.entryQuantity ?? ingredient.requiredQuantity ?? ingredient.quantity ?? 0;
  const entryUnitId = getIngredientEntryUnit(ingredient, linkedItem);
  const baseUnitId = linkedItem ? getBaseUnit(linkedItem) : ingredient.baseUnitId || ingredient.unit || entryUnitId;
  const baseQuantity = getIngredientBaseQuantity(entryQuantity, entryUnitId, baseUnitId, linkedItem, units);
  const resolvedBaseQuantity = baseQuantity ?? 0;
  const unitCost = linkedItem ? getPurchaseItemUnitCost(linkedItem, units) : ingredient.unitCost ?? ingredient.costPerUnit ?? 0;
  const wastagePercentage = ingredient.wastagePercentage ?? 0;
  const totalCost = resolvedBaseQuantity * unitCost;
  const purchaseItemName = linkedItem?.itemName || ingredient.itemName || ingredient.purchaseItemName || 'Unknown Item';
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
  const nextIngredient: RecipeIngredient = {
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
    scaledEntryQuantity: entryQuantity,
    scaledBaseQuantity: resolvedBaseQuantity,
    baseUnitId,
    unit: entryUnitId,
    lastPurchaseRate,
    lastPurchaseUnit,
    unitCost,
    costPerUnit: unitCost,
    wastagePercentage,
    netQuantity: resolvedBaseQuantity * (1 + wastagePercentage / 100),
    totalCost,
  };

  return ingredientsEqual(ingredient, nextIngredient) ? ingredient : nextIngredient;
};

const getRecipeLaborCost = (recipe: Recipe) =>
  recipe.laborCost ??
  (recipe.additionalCostLines || [])
    .filter((line) => line.category === 'labor')
    .reduce((sum, line) => sum + (line.totalCost || 0), 0);

const getRecipeUtilityCost = (recipe: Recipe) =>
  recipe.utilitiesCost ??
  (recipe.additionalCostLines || [])
    .filter((line) => line.category === 'utility')
    .reduce((sum, line) => sum + (line.totalCost || 0), 0);

const getRecipePackagingCost = (recipe: Recipe) =>
  (recipe.additionalCostLines || [])
    .filter((line) => line.category === 'packaging')
    .reduce((sum, line) => sum + (line.totalCost || 0), 0);

const getRecipeOtherProductionCost = (recipe: Recipe) =>
  (recipe.additionalCostLines || [])
    .filter((line) => line.category === 'other')
    .reduce((sum, line) => sum + (line.totalCost || 0), 0);

const getRecipeEffectiveYieldQuantity = (recipe: Recipe) => {
  const yieldQuantity = recipe.yieldQuantity ?? recipe.yields ?? 0;
  const yieldFactor = (recipe.expectedYieldPercentage ?? 100) / 100 || 1;
  return yieldQuantity > 0 ? yieldQuantity * yieldFactor : 0;
};

const normalizeRecipeCostLineBasis = (basis?: string) => {
  if (basis === 'fixed-daig-capacity') {
    return 'per-batch';
  }

  if (basis === 'per-kg-yield') {
    return 'per-kg-output';
  }

  return basis || 'fixed';
};

const resolveRecipeCostReferenceId = (
  referenceId: string | undefined,
  ingredients: RecipeIngredient[],
  purchaseItems: PurchaseItem[],
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
  purchaseItems: PurchaseItem[],
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
  purchaseItems: PurchaseItem[],
) => {
  const resolvedReferenceId = resolveRecipeCostReferenceId(line.ingredientReferenceId, ingredients, purchaseItems);
  return resolvedReferenceId ? purchaseItems.find((item) => item.id === resolvedReferenceId) : undefined;
};

const getReferencedIngredientQuantity = (
  line: RecipeCostLine,
  ingredients: RecipeIngredient[],
  purchaseItems: PurchaseItem[],
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
        ? convertUnitQuantity(entryQuantity, entryUnitId, 'kg', units)
        : null;

    if (entryKg !== null) {
      return sum + Math.max(entryKg, 0);
    }

    const baseKg =
      baseQuantity > 0 && baseUnitId
        ? convertUnitQuantity(baseQuantity, baseUnitId, 'kg', units)
        : null;

    return sum + Math.max(baseKg || 0, 0);
  }, 0);

const syncStoredRecipeCostLine = (
  line: RecipeCostLine,
  effectiveYieldQuantity: number,
  ingredients: RecipeIngredient[],
  purchaseItems: PurchaseItem[],
  units: UnitMaster[],
): RecipeCostLine => {
  const calculationBasis = normalizeRecipeCostLineBasis(line.calculationBasis);
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
  const quantity =
    calculationBasis === 'fixed' || calculationBasis === 'per-kg-output' || calculationBasis === 'per-kg-input'
      ? undefined
      : line.quantity && line.quantity > 0
        ? line.quantity
        : 1;
  const rate =
    (calculationBasis === 'item-usage' || (calculationBasis === 'per-kg-input' && line.category !== 'labor')) && referencedPurchaseItem
      ? getPurchaseItemUnitCost(referencedPurchaseItem, units)
      : Number(line.rate) || 0;
  const chargeQuantity =
    calculationBasis === 'fixed'
      ? 1
      : calculationBasis === 'item-usage'
        ? quantity || 1
        : calculationBasis === 'per-kg-output'
          ? Math.max(effectiveYieldQuantity || 0, 0)
          : calculationBasis === 'per-kg-input'
            ? line.category === 'labor'
              ? Math.max(getRecipeInputQuantityInKg(ingredients, units), 0)
              : Math.max(getReferencedIngredientQuantity(line, ingredients, purchaseItems), 0)
            : quantity || 1;

  return {
    ...line,
    calculationBasis: calculationBasis as RecipeCostLine['calculationBasis'],
    rate,
    quantity,
    unit:
      calculationBasis === 'fixed'
        ? undefined
        : calculationBasis === 'item-usage'
          ? referencedUsageUnit || line.unit
          : calculationBasis === 'per-kg-input'
            ? line.category === 'labor'
              ? 'kg'
              : referencedIngredientUnit || referencedPurchaseItem?.baseUnitId || referencedPurchaseItem?.issueUnit || line.unit
            : line.unit,
    ingredientReferenceId: resolveRecipeCostReferenceId(line.ingredientReferenceId, ingredients, purchaseItems),
    totalCost: rate * chargeQuantity,
  };
};

const getDefaultSalesVariant = (dish: Dish) =>
  dish.salesVariants?.find((variant) => variant.isDefault) || dish.salesVariants?.[0];

const buildFallbackSalesVariant = (dish: Dish, costPerYieldUnit: number): MenuItemVariant => {
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
    status: 'active',
  };
};

const resolveDishProductionType = (dish: Dish) => {
  if (
    dish.productionType === 'recipe-based' ||
    dish.productionType === 'purchased-ready' ||
    dish.productionType === 'service-item'
  ) {
    return dish.productionType;
  }

  if (dish.sourceType === 'in-house-produced' || dish.productionType === 'in-house' || dish.recipeId) {
    return 'recipe-based' as const;
  }

  if (dish.sourceType === 'outsourced') {
    return 'service-item' as const;
  }

  return 'purchased-ready' as const;
};

const salesVariantsEqual = (left: MenuItemVariant[] | undefined, right: MenuItemVariant[] | undefined) => {
  const leftVariants = left || [];
  const rightVariants = right || [];
  if (leftVariants.length !== rightVariants.length) {
    return false;
  }

  return leftVariants.every((variant, index) => {
    const compare = rightVariants[index];
    return (
      variant.id === compare.id &&
      variant.salesUnit === compare.salesUnit &&
      variant.salesUnitId === compare.salesUnitId &&
      variant.quantity === compare.quantity &&
      variant.salesQuantity === compare.salesQuantity &&
      variant.quantityUnit === compare.quantityUnit &&
      variant.sellingPrice === compare.sellingPrice &&
      variant.estimatedCost === compare.estimatedCost &&
      variant.isDefault === compare.isDefault &&
      variant.active === compare.active &&
      variant.status === compare.status
    );
  });
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
  const nextDish: Dish = {
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

  const unchanged =
    dish.hasRecipe === nextDish.hasRecipe &&
    dish.recipeId === nextDish.recipeId &&
    dish.estimatedCost === nextDish.estimatedCost &&
    dish.costPerBaseUnit === nextDish.costPerBaseUnit &&
    dish.recipeCost === nextDish.recipeCost &&
    dish.defaultVariantCost === nextDish.defaultVariantCost &&
    dish.defaultSellingPrice === nextDish.defaultSellingPrice &&
    dish.sellingPrice === nextDish.sellingPrice &&
    dish.foodCostPercentage === nextDish.foodCostPercentage &&
    dish.grossMargin === nextDish.grossMargin &&
    salesVariantsEqual(dish.salesVariants, nextDish.salesVariants);

  return unchanged ? dish : nextDish;
};

const getPackageLineCost = (dish: Dish, variantId: string | undefined, unit: string, quantityPerHead: number) => {
  const variant =
    dish.salesVariants?.find((entry) => variantId && entry.id === variantId) ||
    dish.salesVariants?.find((entry) => entry.salesUnit === unit || entry.salesUnitId === unit) ||
    getDefaultSalesVariant(dish);

  return (variant?.estimatedCost ?? dish.defaultVariantCost ?? dish.estimatedCost ?? 0) * quantityPerHead;
};

const recostMenuPackage = (menuPackage: MenuPackage, dishesById: Map<string, Dish>, now: Date) => {
  let packageChanged = false;
  const recostedDishes = menuPackage.dishes.map((packageDish) => {
    const updatedDish = dishesById.get(packageDish.dishId);
    if (!updatedDish) {
      return packageDish;
    }

    const nextDish = {
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

    const unchanged =
      packageDish.dishName === nextDish.dishName &&
      packageDish.preparationArea === nextDish.preparationArea &&
      packageDish.sourceType === nextDish.sourceType &&
      packageDish.costPerHead === nextDish.costPerHead;

    if (!unchanged) {
      packageChanged = true;
    }

    return unchanged ? packageDish : nextDish;
  });

  if (!packageChanged) {
    return menuPackage;
  }

  return {
    ...menuPackage,
    dishes: recostedDishes,
    totalCostPerHead: recostedDishes.reduce((sum, dish) => sum + (dish.costPerHead || 0), 0),
    updatedAt: now,
  };
};

const recalculateRecipe = (
  recipe: Recipe,
  purchaseItems: PurchaseItem[],
  units: UnitMaster[],
  now: Date,
): Recipe => {
  if (!recipe.ingredients?.length) {
    return recipe;
  }

  let ingredientsChanged = false;
  const syncedIngredients = recipe.ingredients.map((ingredient) => {
    const nextIngredient = syncStoredIngredient(ingredient, purchaseItems, units);
    if (nextIngredient !== ingredient) {
      ingredientsChanged = true;
    }
    return nextIngredient;
  });
  const syncedAdditionalCostLines = (recipe.additionalCostLines || []).map((line) =>
    syncStoredRecipeCostLine(
      line,
      getRecipeEffectiveYieldQuantity(recipe),
      syncedIngredients,
      purchaseItems,
      units,
    ),
  );
  const additionalCostLinesChanged =
    syncedAdditionalCostLines.length !== (recipe.additionalCostLines || []).length ||
    syncedAdditionalCostLines.some((line, index) => {
      const currentLine = recipe.additionalCostLines?.[index];
      return (
        !currentLine ||
        currentLine.calculationBasis !== line.calculationBasis ||
        currentLine.rate !== line.rate ||
        currentLine.quantity !== line.quantity ||
        currentLine.unit !== line.unit ||
        currentLine.ingredientReferenceId !== line.ingredientReferenceId ||
        currentLine.totalCost !== line.totalCost
      );
    });

  const totalIngredientCost = syncedIngredients.reduce((sum, ingredient) => sum + (ingredient.totalCost || 0), 0);
  const wastageCost = syncedIngredients.reduce(
    (sum, ingredient) =>
      sum + ((ingredient.baseQuantity || 0) * (ingredient.unitCost || 0) * ((ingredient.wastagePercentage || 0) / 100)),
    0,
  );
  const effectiveYieldQuantity = getRecipeEffectiveYieldQuantity(recipe);
  const laborCost =
    syncedAdditionalCostLines.filter((line) => line.category === 'labor').reduce((sum, line) => sum + (line.totalCost || 0), 0) ||
    getRecipeLaborCost(recipe);
  const utilitiesCost =
    syncedAdditionalCostLines.filter((line) => line.category === 'utility').reduce((sum, line) => sum + (line.totalCost || 0), 0) ||
    getRecipeUtilityCost(recipe);
  const packagingConsumableCost =
    syncedAdditionalCostLines.filter((line) => line.category === 'packaging').reduce((sum, line) => sum + (line.totalCost || 0), 0) ||
    getRecipePackagingCost(recipe);
  const otherProductionCost =
    syncedAdditionalCostLines.filter((line) => line.category === 'other').reduce((sum, line) => sum + (line.totalCost || 0), 0) ||
    getRecipeOtherProductionCost(recipe);
  const additionalCost = laborCost + utilitiesCost + packagingConsumableCost + otherProductionCost;
  const sellingPricePerYieldUnit = recipe.supplySellingPricePerYieldUnit ?? recipe.suggestedSellingPrice ?? 0;
  const standardMetrics = calculateStandardRecipeMetrics({
    standardYieldQuantity: effectiveYieldQuantity,
    ingredientCost: totalIngredientCost,
    laborCost,
    utilityFuelCost: utilitiesCost,
    packagingConsumableCost,
    otherProductionCost,
    wastageCost,
    sellingPricePerYieldUnit,
  });
  const totalRecipeCost = standardMetrics.standardDishCost;
  const costPerYieldUnit = standardMetrics.standardCostPerYieldUnit;
  const supplySellingPricePerYieldUnit = standardMetrics.sellingPricePerYieldUnit;
  const marginPerYieldUnit = standardMetrics.marginPerYieldUnit;
  const foodCostPercentage = standardMetrics.foodCostPercentage;

  const unchanged =
    !ingredientsChanged &&
    !additionalCostLinesChanged &&
    recipe.totalIngredientCost === totalIngredientCost &&
    recipe.wastageCost === wastageCost &&
    recipe.laborCost === laborCost &&
    recipe.utilitiesCost === utilitiesCost &&
    recipe.additionalCost === additionalCost &&
    recipe.totalRecipeCost === totalRecipeCost &&
    recipe.totalProductionCost === totalRecipeCost &&
    recipe.totalCost === totalRecipeCost &&
    recipe.costPerPortion === costPerYieldUnit &&
    recipe.costPerYieldUnit === costPerYieldUnit &&
    recipe.supplySellingPricePerYieldUnit === supplySellingPricePerYieldUnit &&
    recipe.supplyFoodCostPercentage === foodCostPercentage &&
    recipe.suggestedSellingPrice === supplySellingPricePerYieldUnit &&
    recipe.foodCostPercentage === foodCostPercentage;

  if (unchanged) {
    return recipe;
  }

  return {
    ...recipe,
    ingredients: syncedIngredients,
    additionalCostLines: syncedAdditionalCostLines,
    totalIngredientCost,
    wastageCost,
    laborCost,
    utilitiesCost,
    additionalCost,
    totalRecipeCost,
    totalProductionCost: totalRecipeCost,
    totalCost: totalRecipeCost,
    costPerPortion: costPerYieldUnit,
    costPerYieldUnit,
    supplySellingPricePerYieldUnit,
    supplyFoodCostPercentage: foodCostPercentage,
    suggestedSellingPrice: supplySellingPricePerYieldUnit,
    foodCostPercentage,
    updatedAt: now,
  };
};

export const syncBanquetRecipePricingFromPurchaseItems = ({
  recipes,
  purchaseItems,
  units,
  dishes,
  menuPackages,
  userName,
  now = new Date(),
}: {
  recipes: Recipe[];
  purchaseItems: PurchaseItem[];
  units: UnitMaster[];
  dishes: Dish[];
  menuPackages: MenuPackage[];
  userName: string;
  now?: Date;
}) => {
  let recipesChanged = false;
  const nextRecipes = recipes.map((recipe) => {
    const nextRecipe = recalculateRecipe(recipe, purchaseItems, units, now);
    if (nextRecipe !== recipe) {
      recipesChanged = true;
    }
    return nextRecipe;
  });

  const recipesByDishId = new Map(nextRecipes.map((recipe) => [recipe.dishId, recipe]));
  let dishesChanged = false;
  const nextDishes = dishes.map((dish) => {
    const linkedRecipe = recipesByDishId.get(dish.id);
    if (!linkedRecipe) {
      return dish;
    }

    const nextDish = recostDishFromRecipe(dish, linkedRecipe, userName, now);
    if (nextDish !== dish) {
      dishesChanged = true;
    }
    return nextDish;
  });

  const dishesById = new Map(nextDishes.map((dish) => [dish.id, dish]));
  let menuPackagesChanged = false;
  const nextMenuPackages = menuPackages.map((menuPackage) => {
    const nextMenuPackage = recostMenuPackage(menuPackage, dishesById, now);
    if (nextMenuPackage !== menuPackage) {
      menuPackagesChanged = true;
    }
    return nextMenuPackage;
  });

  return {
    changed: recipesChanged || dishesChanged || menuPackagesChanged,
    recipes: nextRecipes,
    dishes: nextDishes,
    menuPackages: nextMenuPackages,
  };
};
