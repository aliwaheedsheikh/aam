import { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import {
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Download,
  Printer,
  AlertTriangle,
  Utensils,
  CheckCircle,
} from 'lucide-react';
import type { UnitMaster } from '../types';
import { formatUnitLabel, normalizeUnitCode } from '../../../lib/unitConversion';

type PortionRecipeIngredient = {
  ingredientId: string;
  ingredientName: string;
  quantityPerPortion: number; // Quantity per single portion
  unit: string;
};

type PortionDishRecipe = {
  dishId: string;
  dishName: string;
  category: string;
  station: string;
  sellingPrice: number;
  ingredients: PortionRecipeIngredient[];
};

type StationProduction = {
  stationId: string;
  stationName: string;
  dishes: {
    dishId: string;
    dishName: string;
    portionsToPrepare: number;
    status: 'pending' | 'in-progress' | 'completed';
  }[];
};

type ConsolidatedIngredient = {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  totalRequired: number;
  currentStock: number;
  toBePurchased: number;
  dishes: string[];
};

interface RestaurantProductionPlanningProps {
  units: UnitMaster[];
}

export function RestaurantProductionPlanning({ units }: RestaurantProductionPlanningProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expectedCovers, setExpectedCovers] = useState(200);
  const displayUnit = (unit: string) => formatUnitLabel(unit, units);

  // Portion-based recipes for restaurant (per serving)
  const portionRecipes: PortionDishRecipe[] = [
    // Chinese Category
    {
      dishId: 'chinese-manchurian',
      dishName: 'Chicken Manchurian',
      category: 'Chinese',
      station: 'Chinese Station',
      sellingPrice: 750,
      ingredients: [
        { ingredientId: 'ing1', ingredientName: 'Chicken Boneless', quantityPerPortion: 0.2, unit: 'kg' },
        { ingredientId: 'ing5', ingredientName: 'Onions', quantityPerPortion: 0.05, unit: 'kg' },
        { ingredientId: 'ing7', ingredientName: 'Green Chilies', quantityPerPortion: 0.01, unit: 'kg' },
        { ingredientId: 'ing9', ingredientName: 'Garlic', quantityPerPortion: 0.015, unit: 'kg' },
        { ingredientId: 'ing19', ingredientName: 'Cooking Oil', quantityPerPortion: 0.03, unit: 'ltr' },
      ],
    },
    {
      dishId: 'chinese-sweet-sour',
      dishName: 'Sweet & Sour Chicken',
      category: 'Chinese',
      station: 'Chinese Station',
      sellingPrice: 780,
      ingredients: [
        { ingredientId: 'ing1', ingredientName: 'Chicken Boneless', quantityPerPortion: 0.22, unit: 'kg' },
        { ingredientId: 'ing5', ingredientName: 'Onions', quantityPerPortion: 0.04, unit: 'kg' },
        { ingredientId: 'ing6', ingredientName: 'Tomatoes', quantityPerPortion: 0.05, unit: 'kg' },
        { ingredientId: 'ing19', ingredientName: 'Cooking Oil', quantityPerPortion: 0.03, unit: 'ltr' },
      ],
    },
    // Thai Category
    {
      dishId: 'thai-red-curry',
      dishName: 'Thai Red Curry',
      category: 'Thai',
      station: 'Thai Station',
      sellingPrice: 850,
      ingredients: [
        { ingredientId: 'ing1', ingredientName: 'Chicken Boneless', quantityPerPortion: 0.2, unit: 'kg' },
        { ingredientId: 'ing16', ingredientName: 'Fresh Cream', quantityPerPortion: 0.15, unit: 'ltr' },
        { ingredientId: 'ing7', ingredientName: 'Green Chilies', quantityPerPortion: 0.015, unit: 'kg' },
        { ingredientId: 'ing9', ingredientName: 'Garlic', quantityPerPortion: 0.01, unit: 'kg' },
        { ingredientId: 'ing19', ingredientName: 'Cooking Oil', quantityPerPortion: 0.025, unit: 'ltr' },
      ],
    },
    {
      dishId: 'thai-green-curry',
      dishName: 'Thai Green Curry',
      category: 'Thai',
      station: 'Thai Station',
      sellingPrice: 850,
      ingredients: [
        { ingredientId: 'ing1', ingredientName: 'Chicken Boneless', quantityPerPortion: 0.2, unit: 'kg' },
        { ingredientId: 'ing16', ingredientName: 'Fresh Cream', quantityPerPortion: 0.15, unit: 'ltr' },
        { ingredientId: 'ing7', ingredientName: 'Green Chilies', quantityPerPortion: 0.02, unit: 'kg' },
        { ingredientId: 'ing19', ingredientName: 'Cooking Oil', quantityPerPortion: 0.025, unit: 'ltr' },
      ],
    },
    // BBQ Category
    {
      dishId: 'bbq-tikka',
      dishName: 'Chicken Tikka',
      category: 'BBQ',
      station: 'BBQ Station',
      sellingPrice: 650,
      ingredients: [
        { ingredientId: 'ing1', ingredientName: 'Chicken Boneless', quantityPerPortion: 0.25, unit: 'kg' },
        { ingredientId: 'ing15', ingredientName: 'Yogurt', quantityPerPortion: 0.05, unit: 'kg' },
        { ingredientId: 'ing8', ingredientName: 'Ginger', quantityPerPortion: 0.01, unit: 'kg' },
        { ingredientId: 'ing9', ingredientName: 'Garlic', quantityPerPortion: 0.01, unit: 'kg' },
        { ingredientId: 'ing10', ingredientName: 'Red Chili Powder', quantityPerPortion: 0.005, unit: 'kg' },
      ],
    },
    {
      dishId: 'bbq-seekh',
      dishName: 'Seekh Kabab',
      category: 'BBQ',
      station: 'BBQ Station',
      sellingPrice: 680,
      ingredients: [
        { ingredientId: 'ing3', ingredientName: 'Beef (Boneless)', quantityPerPortion: 0.2, unit: 'kg' },
        { ingredientId: 'ing5', ingredientName: 'Onions', quantityPerPortion: 0.03, unit: 'kg' },
        { ingredientId: 'ing7', ingredientName: 'Green Chilies', quantityPerPortion: 0.01, unit: 'kg' },
        { ingredientId: 'ing13', ingredientName: 'Coriander Powder', quantityPerPortion: 0.005, unit: 'kg' },
      ],
    },
  ];

  // Mock Restaurant Store stock
  const restaurantStoreStock: Record<string, number> = {
    'ing1': 50,  // Chicken Boneless
    'ing3': 35,  // Beef
    'ing5': 70,  // Onions
    'ing6': 80,  // Tomatoes
    'ing7': 20,  // Green Chilies
    'ing8': 12,  // Ginger
    'ing9': 15,  // Garlic
    'ing10': 10, // Red Chili
    'ing13': 9,  // Coriander Powder
    'ing15': 40, // Yogurt
    'ing16': 20, // Cream
    'ing19': 70, // Oil
  };

  const [stationProduction, setStationProduction] = useState<StationProduction[]>([
    {
      stationId: 'chinese',
      stationName: 'Chinese Station',
      dishes: [
        { dishId: 'chinese-manchurian', dishName: 'Chicken Manchurian', portionsToPrepare: 0, status: 'pending' },
        { dishId: 'chinese-sweet-sour', dishName: 'Sweet & Sour Chicken', portionsToPrepare: 0, status: 'pending' },
      ],
    },
    {
      stationId: 'thai',
      stationName: 'Thai Station',
      dishes: [
        { dishId: 'thai-red-curry', dishName: 'Thai Red Curry', portionsToPrepare: 0, status: 'pending' },
        { dishId: 'thai-green-curry', dishName: 'Thai Green Curry', portionsToPrepare: 0, status: 'pending' },
      ],
    },
    {
      stationId: 'bbq',
      stationName: 'BBQ Station',
      dishes: [
        { dishId: 'bbq-tikka', dishName: 'Chicken Tikka', portionsToPrepare: 0, status: 'pending' },
        { dishId: 'bbq-seekh', dishName: 'Seekh Kabab', portionsToPrepare: 0, status: 'pending' },
      ],
    },
  ]);

  // Calculate consolidated ingredients
  const calculateConsolidatedIngredients = (): ConsolidatedIngredient[] => {
    const ingredientMap = new Map<string, ConsolidatedIngredient>();

    stationProduction.forEach(station => {
      station.dishes.forEach(dish => {
        if (dish.portionsToPrepare > 0) {
          const recipe = portionRecipes.find(r => r.dishId === dish.dishId);
          if (!recipe) return;

          recipe.ingredients.forEach(ing => {
            const requiredQty = ing.quantityPerPortion * dish.portionsToPrepare;

            if (ingredientMap.has(ing.ingredientId)) {
              const existing = ingredientMap.get(ing.ingredientId)!;
              existing.totalRequired += requiredQty;
              if (!existing.dishes.includes(dish.dishName)) {
                existing.dishes.push(dish.dishName);
              }
            } else {
              ingredientMap.set(ing.ingredientId, {
                ingredientId: ing.ingredientId,
                ingredientName: ing.ingredientName,
                unit: normalizeUnitCode(ing.unit),
                totalRequired: requiredQty,
                currentStock: restaurantStoreStock[ing.ingredientId] || 0,
                toBePurchased: 0,
                dishes: [dish.dishName],
              });
            }
          });
        }
      });
    });

    const result = Array.from(ingredientMap.values()).map(ing => ({
      ...ing,
      toBePurchased: Math.max(0, ing.totalRequired - ing.currentStock),
    }));

    return result;
  };

  const consolidatedIngredients = calculateConsolidatedIngredients();
  const hasShortage = consolidatedIngredients.some(ing => ing.toBePurchased > 0);

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handlePortionChange = (stationId: string, dishId: string, value: number) => {
    setStationProduction(prev =>
      prev.map(station =>
        station.stationId === stationId
          ? {
              ...station,
              dishes: station.dishes.map(dish =>
                dish.dishId === dishId
                  ? { ...dish, portionsToPrepare: value }
                  : dish
              ),
            }
          : station
      )
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Daily Production Planning</h2>
            <p className="text-sm text-gray-500">Station-based portion preparation</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Download className="size-4 mr-2" />
              Export Prep List
            </Button>
            <Button variant="outline">
              <Printer className="size-4 mr-2" />
              Print Station Sheets
            </Button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handlePreviousDay}>
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-[250px] text-center">
              <div className="font-semibold text-lg">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleNextDay}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button size="sm" onClick={handleToday}>
            Today
          </Button>

          {/* Expected Covers */}
          <div className="flex items-center gap-2">
            <Users className="size-4 text-gray-500" />
            <span className="text-sm text-gray-600">Expected Covers:</span>
            <Input
              type="number"
              value={expectedCovers}
              onChange={(e) => setExpectedCovers(parseInt(e.target.value) || 0)}
              className="w-20 h-8 text-center"
            />
          </div>

          <div className="ml-auto px-3 py-1 bg-blue-50 border border-blue-200 rounded">
            <span className="text-xs font-medium text-blue-700">🍽️ Restaurant Store</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Station Production */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Utensils className="size-5 text-blue-600" />
              Station-wise Production Planning
            </h3>
            <div className="space-y-4">
              {stationProduction.map(station => (
                <div key={station.stationId} className="bg-white rounded-lg border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-lg text-gray-900">{station.stationName}</h4>
                    <span className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                      {station.dishes.length} Dishes
                    </span>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Dish Name</th>
                          <th className="px-4 py-2 text-center font-medium text-gray-700">
                            Portions to Prepare
                          </th>
                          <th className="px-4 py-2 text-center font-medium text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {station.dishes.map(dish => (
                          <tr key={dish.dishId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{dish.dishName}</td>
                            <td className="px-4 py-3 text-center">
                              <Input
                                type="number"
                                placeholder="0"
                                value={dish.portionsToPrepare || ''}
                                onChange={(e) =>
                                  handlePortionChange(
                                    station.stationId,
                                    dish.dishId,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-24 text-center mx-auto"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              {dish.portionsToPrepare > 0 ? (
                                <CheckCircle className="size-5 text-green-600 mx-auto" />
                              ) : (
                                <span className="text-gray-400 text-xs">Not set</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Consolidated Ingredients */}
          {consolidatedIngredients.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ClipboardList className="size-5 text-blue-600" />
                  Consolidated Ingredient Requirements (configured units)
                </h3>
                {hasShortage && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="size-5 text-red-600" />
                    <span className="text-sm font-medium text-red-700">Purchase needed for service!</span>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Ingredient</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Required</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Restaurant Store</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">To Purchase</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Used In Dishes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {consolidatedIngredients.map(ing => (
                      <tr key={ing.ingredientId} className={`${ing.toBePurchased > 0 ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3 font-medium">{ing.ingredientName}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold">{ing.totalRequired.toFixed(3)}</span> {displayUnit(ing.unit)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={ing.currentStock < ing.totalRequired ? 'text-red-600 font-semibold' : ''}>
                            {ing.currentStock.toFixed(2)}
                          </span> {displayUnit(ing.unit)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {ing.toBePurchased > 0 ? (
                            <span className="px-3 py-1 bg-red-600 text-white rounded-full font-semibold text-xs">
                              BUY {ing.toBePurchased.toFixed(3)} {displayUnit(ing.unit)}
                            </span>
                          ) : (
                            <span className="text-green-600 font-medium">✓ Sufficient</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {ing.dishes.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Box */}
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Utensils className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">Restaurant Store Allocation</h4>
                    <p className="text-sm text-gray-700">
                      This preparation list is calculated based on <strong>Restaurant Store</strong> inventory only. 
                      All purchases will be allocated to Restaurant operations. Banquet kitchen maintains separate bulk stock.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
