import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateStandardRecipeMetrics,
  getRecipeStandardCostSnapshot,
} from '../src/app/lib/recipeCostingMath.js';

const rounded = (value) => Number(value.toFixed(2));

test('standard dish costing uses one-time standard dish data only', () => {
  const result = calculateStandardRecipeMetrics({
    standardYieldQuantity: 12,
    ingredientCost: 2400,
    laborCost: 600,
    utilityFuelCost: 300,
    packagingConsumableCost: 180,
    otherProductionCost: 120,
    wastageCost: 120,
    sellingPricePerYieldUnit: 400,
  });

  assert.equal(rounded(result.standardDishCost), 3720);
  assert.equal(rounded(result.standardCostPerYieldUnit), 310);
  assert.equal(rounded(result.sellingPricePerYieldUnit), 400);
  assert.equal(rounded(result.marginPerYieldUnit), 90);
  assert.equal(rounded(result.foodCostPercentage), 77.5);
  assert.equal(rounded(result.marginPercentage), 22.5);
});

test('standard dish costing can derive packaging and consumables from separate inputs', () => {
  const result = calculateStandardRecipeMetrics({
    standardYieldQuantity: 10,
    ingredientCost: 1800,
    laborCost: 400,
    utilityCost: 150,
    packagingCost: 90,
    consumableCost: 60,
    otherProductionCost: 100,
    wastageCost: 50,
    sellingPricePerYieldUnit: 320,
  });

  assert.equal(rounded(result.packagingConsumableCost), 150);
  assert.equal(rounded(result.standardDishCost), 2650);
  assert.equal(rounded(result.standardCostPerYieldUnit), 265);
  assert.equal(rounded(result.marginPerYieldUnit), 55);
  assert.equal(rounded(result.foodCostPercentage), 82.81);
  assert.equal(rounded(result.marginPercentage), 17.19);
});

test('legacy recipe snapshot maps canonical saved fields to standard dish values', () => {
  const result = getRecipeStandardCostSnapshot({
    yieldQuantity: 12,
    yields: 5,
    yieldUnitId: 'kg',
    targetYieldQuantity: 100,
    totalIngredientCost: 2400,
    laborCost: 600,
    utilitiesCost: 300,
    wastageCost: 120,
    totalRecipeCost: 3420,
    totalProductionCost: 3500,
    totalCost: 3600,
    costPerYieldUnit: 285,
    costPerPortion: 999,
    supplySellingPricePerYieldUnit: 385,
    suggestedSellingPrice: 450,
    supplyMarginPerYieldUnit: 100,
    supplyFoodCostPercentage: 74.03,
    foodCostPercentage: 80,
  });

  assert.equal(result.standardYieldQuantity, 12);
  assert.equal(result.standardYieldUnit, 'kg');
  assert.equal(rounded(result.standardDishCost), 3420);
  assert.equal(rounded(result.standardCostPerYieldUnit), 285);
  assert.equal(rounded(result.sellingPricePerYieldUnit), 385);
  assert.equal(rounded(result.marginPerYieldUnit), 100);
  assert.equal(rounded(result.foodCostPercentage), 74.03);
  assert.equal(rounded(result.marginPercentage), 25.97);
});

test('legacy snapshot derives packaging and other production costs from saved cost lines', () => {
  const result = getRecipeStandardCostSnapshot({
    yieldQuantity: 8,
    yieldUnitId: 'kg',
    totalRecipeCost: 1600,
    costPerYieldUnit: 200,
    suggestedSellingPrice: 260,
    additionalCostLines: [
      { category: 'labor', totalCost: 180 },
      { category: 'utility', totalCost: 90 },
      { category: 'packaging', totalCost: 75 },
      { category: 'packaging', totalCost: 25 },
      { category: 'other', totalCost: 40 },
    ],
  });

  assert.equal(result.standardYieldQuantity, 8);
  assert.equal(result.standardYieldUnit, 'kg');
  assert.equal(rounded(result.standardDishCost), 1600);
  assert.equal(rounded(result.packagingConsumableCost), 100);
  assert.equal(rounded(result.otherProductionCost), 40);
  assert.equal(rounded(result.standardCostPerYieldUnit), 200);
  assert.equal(rounded(result.marginPerYieldUnit), 60);
});

test('legacy snapshot falls back to derived values when only old compatibility fields exist', () => {
  const result = getRecipeStandardCostSnapshot({
    yields: 10,
    yieldUnit: 'kg',
    totalCost: 2500,
    costPerPortion: 250,
    suggestedSellingPrice: 400,
  });

  assert.equal(result.standardYieldQuantity, 10);
  assert.equal(result.standardYieldUnit, 'kg');
  assert.equal(rounded(result.standardDishCost), 2500);
  assert.equal(rounded(result.standardCostPerYieldUnit), 250);
  assert.equal(rounded(result.sellingPricePerYieldUnit), 400);
  assert.equal(rounded(result.marginPerYieldUnit), 150);
  assert.equal(rounded(result.foodCostPercentage), 62.5);
  assert.equal(rounded(result.marginPercentage), 37.5);
});
