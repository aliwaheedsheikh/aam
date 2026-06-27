export const RECIPE_COST_BEHAVIORS = {
  FIXED_PER_BATCH: 'fixed-per-batch',
  VARIABLE_BY_YIELD: 'variable-by-yield',
};

export const recipeCostBehaviorOptions = [
  { value: RECIPE_COST_BEHAVIORS.FIXED_PER_BATCH, label: 'Fixed Per Batch' },
  { value: RECIPE_COST_BEHAVIORS.VARIABLE_BY_YIELD, label: 'Variable By Yield' },
];

const sanitizeNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const firstFiniteNumber = (...values) => {
  for (const value of values) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  return undefined;
};

const calculatePercentage = (numerator, denominator) => {
  const normalizedDenominator = sanitizeNumber(denominator);
  if (normalizedDenominator <= 0) {
    return 0;
  }

  return (sanitizeNumber(numerator) / normalizedDenominator) * 100;
};

export const calculateStandardRecipeMetrics = ({
  standardYieldQuantity,
  ingredientCost = 0,
  laborCost = 0,
  utilityFuelCost,
  utilityCost = 0,
  packagingConsumableCost,
  packagingCost = 0,
  consumableCost = 0,
  otherProductionCost = 0,
  wastageCost = 0,
  sellingPricePerYieldUnit = 0,
}) => {
  const normalizedYieldQuantity = sanitizeNumber(standardYieldQuantity);
  const normalizedIngredientCost = sanitizeNumber(ingredientCost);
  const normalizedLaborCost = sanitizeNumber(laborCost);
  const normalizedUtilityFuelCost = sanitizeNumber(
    utilityFuelCost ?? utilityCost,
  );
  const normalizedPackagingConsumableCost = sanitizeNumber(
    packagingConsumableCost ?? (packagingCost + consumableCost),
  );
  const normalizedOtherProductionCost = sanitizeNumber(otherProductionCost);
  const normalizedWastageCost = sanitizeNumber(wastageCost);
  const normalizedSellingPricePerYieldUnit = sanitizeNumber(sellingPricePerYieldUnit);
  const standardDishCost =
    normalizedIngredientCost +
    normalizedLaborCost +
    normalizedUtilityFuelCost +
    normalizedPackagingConsumableCost +
    normalizedOtherProductionCost +
    normalizedWastageCost;
  const standardCostPerYieldUnit =
    normalizedYieldQuantity > 0 ? standardDishCost / normalizedYieldQuantity : 0;
  const marginPerYieldUnit = normalizedSellingPricePerYieldUnit - standardCostPerYieldUnit;
  const foodCostPercentage = calculatePercentage(
    standardCostPerYieldUnit,
    normalizedSellingPricePerYieldUnit,
  );
  const marginPercentage = calculatePercentage(
    marginPerYieldUnit,
    normalizedSellingPricePerYieldUnit,
  );

  return {
    standardYieldQuantity: normalizedYieldQuantity,
    ingredientCost: normalizedIngredientCost,
    laborCost: normalizedLaborCost,
    utilityFuelCost: normalizedUtilityFuelCost,
    packagingConsumableCost: normalizedPackagingConsumableCost,
    otherProductionCost: normalizedOtherProductionCost,
    wastageCost: normalizedWastageCost,
    standardDishCost,
    standardCostPerYieldUnit,
    sellingPricePerYieldUnit: normalizedSellingPricePerYieldUnit,
    marginPerYieldUnit,
    foodCostPercentage,
    marginPercentage,
  };
};

export const getRecipeStandardCostSnapshot = (recipe = {}) => {
  const additionalCostLines = Array.isArray(recipe.additionalCostLines)
    ? recipe.additionalCostLines
    : [];
  const packagingConsumableCost = additionalCostLines
    .filter((line) => line?.category === 'packaging')
    .reduce((sum, line) => sum + sanitizeNumber(line?.totalCost), 0);
  const otherProductionCost = additionalCostLines
    .filter((line) => line?.category === 'other')
    .reduce((sum, line) => sum + sanitizeNumber(line?.totalCost), 0);
  const standardYieldQuantity =
    firstFiniteNumber(recipe.yieldQuantity, recipe.yields, 0) ?? 0;
  const standardDishCost =
    firstFiniteNumber(
      recipe.totalRecipeCost,
      recipe.totalProductionCost,
      recipe.totalCost,
      0,
    ) ?? 0;
  const storedCostPerYieldUnit = firstFiniteNumber(
    recipe.costPerYieldUnit,
    recipe.costPerPortion,
  );
  const resolvedCostPerYieldUnit =
    storedCostPerYieldUnit ??
    (standardYieldQuantity > 0 ? standardDishCost / standardYieldQuantity : 0);
  const sellingPricePerYieldUnit =
    firstFiniteNumber(
      recipe.supplySellingPricePerYieldUnit,
      recipe.suggestedSellingPrice,
      0,
    ) ?? 0;
  const marginPerYieldUnit =
    firstFiniteNumber(recipe.supplyMarginPerYieldUnit) ??
    (sellingPricePerYieldUnit - resolvedCostPerYieldUnit);
  const foodCostPercentage =
    firstFiniteNumber(recipe.supplyFoodCostPercentage, recipe.foodCostPercentage) ??
    calculatePercentage(resolvedCostPerYieldUnit, sellingPricePerYieldUnit);
  const marginPercentage = calculatePercentage(
    marginPerYieldUnit,
    sellingPricePerYieldUnit,
  );

  return {
    standardYieldQuantity,
    standardYieldUnit: recipe.yieldUnitId || recipe.yieldUnit || '',
    ingredientCost: sanitizeNumber(recipe.totalIngredientCost),
    laborCost: sanitizeNumber(recipe.laborCost),
    utilityFuelCost: sanitizeNumber(recipe.utilitiesCost),
    packagingConsumableCost,
    otherProductionCost,
    wastageCost: sanitizeNumber(recipe.wastageCost),
    standardDishCost,
    standardCostPerYieldUnit: resolvedCostPerYieldUnit,
    sellingPricePerYieldUnit,
    marginPerYieldUnit,
    foodCostPercentage,
    marginPercentage,
  };
};

export const getRecipeScaleFactor = (sourceYieldQuantity, targetYieldQuantity) => {
  const sourceYield = sanitizeNumber(sourceYieldQuantity);
  const targetYield = sanitizeNumber(targetYieldQuantity);

  if (sourceYield <= 0 || targetYield <= 0) {
    return 0;
  }

  return targetYield / sourceYield;
};

export const getRecipeBatchMultiplier = (sourceYieldQuantity, targetYieldQuantity) => {
  const scaleFactor = getRecipeScaleFactor(sourceYieldQuantity, targetYieldQuantity);

  if (scaleFactor <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(scaleFactor));
};

export const applyCostBehavior = (
  sourceCost,
  behavior = RECIPE_COST_BEHAVIORS.FIXED_PER_BATCH,
  scaleFactor = 0,
  batchMultiplier = 1,
) => {
  const normalizedSourceCost = sanitizeNumber(sourceCost);
  const normalizedScaleFactor = sanitizeNumber(scaleFactor);
  const normalizedBatchMultiplier = Math.max(1, sanitizeNumber(batchMultiplier) || 1);

  if (behavior === RECIPE_COST_BEHAVIORS.VARIABLE_BY_YIELD) {
    return normalizedSourceCost * normalizedScaleFactor;
  }

  return normalizedSourceCost * normalizedBatchMultiplier;
};

export const scaleRecipeCostLinesForBehavior = (
  sourceCostLines,
  {
    laborCostBehavior = RECIPE_COST_BEHAVIORS.FIXED_PER_BATCH,
    utilityCostBehavior = RECIPE_COST_BEHAVIORS.FIXED_PER_BATCH,
    scaleFactor = 0,
    batchMultiplier = 1,
  } = {},
) =>
  sourceCostLines.map((line) => {
    const lineBehavior =
      line.category === 'utility'
        ? utilityCostBehavior
        : laborCostBehavior;

    return {
      ...line,
      totalCost: applyCostBehavior(line.totalCost, lineBehavior, scaleFactor, batchMultiplier),
    };
  });

export const calculateLegacyRecipeTargetMetrics = ({
  sourceYieldQuantity,
  targetYieldQuantity,
  sourceIngredientCost,
  sourceLaborCost,
  sourceUtilitiesCost,
  sourceWastageCost,
  targetIngredientCost,
  targetLaborCost,
  targetUtilitiesCost,
  targetWastageCost,
  supplyMarginPerYieldUnit,
}) => {
  const normalizedSourceYield = sanitizeNumber(sourceYieldQuantity);
  const normalizedTargetYield = sanitizeNumber(targetYieldQuantity) || normalizedSourceYield;
  const normalizedSourceTotal =
    sanitizeNumber(sourceIngredientCost) +
    sanitizeNumber(sourceLaborCost) +
    sanitizeNumber(sourceUtilitiesCost) +
    sanitizeNumber(sourceWastageCost);
  const normalizedTargetBatchCost =
    sanitizeNumber(targetIngredientCost) +
    sanitizeNumber(targetLaborCost) +
    sanitizeNumber(targetUtilitiesCost) +
    sanitizeNumber(targetWastageCost);
  const costPerYieldUnit = normalizedSourceYield > 0 ? normalizedSourceTotal / normalizedSourceYield : 0;
  const marginPerYieldUnit = sanitizeNumber(supplyMarginPerYieldUnit);
  const sellingPricePerYieldUnit = costPerYieldUnit + marginPerYieldUnit;
  const sellingPriceTotal = sellingPricePerYieldUnit * normalizedTargetYield;
  const totalMargin = sellingPriceTotal - normalizedTargetBatchCost;
  const foodCostPercentage = sellingPricePerYieldUnit > 0 ? (costPerYieldUnit / sellingPricePerYieldUnit) * 100 : 0;
  const marginPercentage = sellingPricePerYieldUnit > 0 ? (marginPerYieldUnit / sellingPricePerYieldUnit) * 100 : 0;

  return {
    costPerYieldUnit,
    marginPerYieldUnit,
    sellingPricePerYieldUnit,
    sellingPriceTotal,
    targetBatchCost: normalizedTargetBatchCost,
    totalMargin,
    foodCostPercentage,
    marginPercentage,
  };
};

export const calculateRecipeTargetMetrics = ({
  sourceYieldQuantity,
  targetYieldQuantity,
  sourceIngredientCost,
  targetIngredientCost,
  sourceLaborCost,
  sourceUtilitiesCost,
  sourceWastageCost,
  targetWastageCost,
  laborCostBehavior = RECIPE_COST_BEHAVIORS.FIXED_PER_BATCH,
  utilityCostBehavior = RECIPE_COST_BEHAVIORS.FIXED_PER_BATCH,
  wastageCostBehavior = RECIPE_COST_BEHAVIORS.VARIABLE_BY_YIELD,
  supplyMarginPerYieldUnit = 0,
}) => {
  const normalizedSourceYield = sanitizeNumber(sourceYieldQuantity);
  const normalizedTargetYield = sanitizeNumber(targetYieldQuantity) || normalizedSourceYield;
  const scaleFactor = getRecipeScaleFactor(normalizedSourceYield, normalizedTargetYield);
  const batchMultiplier = getRecipeBatchMultiplier(normalizedSourceYield, normalizedTargetYield);
  const normalizedSourceIngredientCost = sanitizeNumber(sourceIngredientCost);
  const normalizedTargetIngredientCost =
    sanitizeNumber(targetIngredientCost) || normalizedSourceIngredientCost * scaleFactor;
  const normalizedSourceWastageCost = sanitizeNumber(sourceWastageCost);
  const normalizedTargetWastageVariableCost =
    sanitizeNumber(targetWastageCost) || normalizedSourceWastageCost * scaleFactor;
  const resolvedTargetLaborCost = applyCostBehavior(
    sourceLaborCost,
    laborCostBehavior,
    scaleFactor,
    batchMultiplier,
  );
  const resolvedTargetUtilitiesCost = applyCostBehavior(
    sourceUtilitiesCost,
    utilityCostBehavior,
    scaleFactor,
    batchMultiplier,
  );
  const resolvedTargetWastageCost =
    wastageCostBehavior === RECIPE_COST_BEHAVIORS.FIXED_PER_BATCH
      ? applyCostBehavior(
        sourceWastageCost,
        RECIPE_COST_BEHAVIORS.FIXED_PER_BATCH,
        scaleFactor,
        batchMultiplier,
      )
      : normalizedTargetWastageVariableCost;
  const sourceBatchCost =
    normalizedSourceIngredientCost +
    sanitizeNumber(sourceLaborCost) +
    sanitizeNumber(sourceUtilitiesCost) +
    normalizedSourceWastageCost;
  const targetBatchCost =
    normalizedTargetIngredientCost +
    resolvedTargetLaborCost +
    resolvedTargetUtilitiesCost +
    resolvedTargetWastageCost;
  const costPerYieldUnit = normalizedTargetYield > 0 ? targetBatchCost / normalizedTargetYield : 0;
  const marginPerYieldUnit = sanitizeNumber(supplyMarginPerYieldUnit);
  const sellingPricePerYieldUnit = costPerYieldUnit + marginPerYieldUnit;
  const sellingPriceTotal = sellingPricePerYieldUnit * normalizedTargetYield;
  const totalMargin = sellingPriceTotal - targetBatchCost;
  const foodCostPercentage = sellingPricePerYieldUnit > 0 ? (costPerYieldUnit / sellingPricePerYieldUnit) * 100 : 0;
  const marginPercentage = sellingPricePerYieldUnit > 0 ? (marginPerYieldUnit / sellingPricePerYieldUnit) * 100 : 0;

  return {
    scaleFactor,
    batchMultiplier,
    sourceBatchCost,
    targetIngredientCost: normalizedTargetIngredientCost,
    targetLaborCost: resolvedTargetLaborCost,
    targetUtilitiesCost: resolvedTargetUtilitiesCost,
    targetWastageCost: resolvedTargetWastageCost,
    targetBatchCost,
    costPerYieldUnit,
    marginPerYieldUnit,
    sellingPricePerYieldUnit,
    sellingPriceTotal,
    totalMargin,
    foodCostPercentage,
    marginPercentage,
  };
};
