import type { MenuPackage } from '../components/kitchen/types';

export const QUOTATION_TARGET_FOOD_COST_PERCENT = 70;
export const QUOTATION_TARGET_MARGIN_PERCENT = 100 - QUOTATION_TARGET_FOOD_COST_PERCENT;
export const DEFAULT_QUOTATION_SCENARIO_GUEST_COUNTS = [100, 200, 300, 400, 500] as const;

export type GuestCountQuotationStatus =
  | 'Healthy'
  | 'Low Margin'
  | 'Loss Making'
  | 'Selling price required';

export interface GuestCountQuotationInput {
  baselineGuestCount: number;
  baselineMenuCost: number;
  guestCount: number;
  sellingPricePerGuest: number;
  targetFoodCostPercent?: number;
  targetMarginPercent?: number;
}

export interface GuestCountQuotationResult {
  guestCount: number;
  baselineGuestCount: number;
  baselineMenuCost: number;
  sellingPricePerGuest: number;
  costPerGuest: number;
  totalMenuCost: number;
  totalSellingAmount: number;
  profitPerGuest: number;
  totalProfit: number;
  foodCostPercent: number;
  marginPercent: number;
  status: GuestCountQuotationStatus;
  isBestTotalProfit?: boolean;
  isRecommended?: boolean;
}

export interface MenuPackageQuotationSource {
  packageId: string;
  packageName: string;
  packageType: string;
  baselineGuestCount: number;
  baselineMenuCost: number;
  basePackageCostPerGuest: number;
  baseSellingPricePerGuest: number;
}

const toSafeNonNegativeNumber = (value: number | undefined) => {
  const nextValue = Number(value ?? 0);
  return Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 0;
};

export const getMenuPackageQuotationSource = (menuPackage: MenuPackage): MenuPackageQuotationSource => {
  const baselineGuestCount = Math.max(
    toSafeNonNegativeNumber(menuPackage.menuEstimate?.baselineGuests) ||
      toSafeNonNegativeNumber(menuPackage.minimumGuests) ||
      100,
    1,
  );
  const basePackageCostPerGuest = toSafeNonNegativeNumber(menuPackage.totalCostPerHead);
  const baseSellingPricePerGuest = toSafeNonNegativeNumber(menuPackage.sellingPricePerHead);

  return {
    packageId: menuPackage.id,
    packageName: menuPackage.packageName,
    packageType: menuPackage.packageType,
    baselineGuestCount,
    baselineMenuCost: basePackageCostPerGuest * baselineGuestCount,
    basePackageCostPerGuest,
    baseSellingPricePerGuest,
  };
};

export const calculateGuestCountQuotation = (
  input: GuestCountQuotationInput,
): GuestCountQuotationResult => {
  const baselineGuestCount = Math.max(Number(input.baselineGuestCount) || 0, 1);
  const baselineMenuCost = Math.max(Number(input.baselineMenuCost) || 0, 0);
  const guestCount = Math.max(Number(input.guestCount) || 0, 0);
  const sellingPricePerGuest = Math.max(Number(input.sellingPricePerGuest) || 0, 0);
  const targetFoodCostPercent = Math.max(Number(input.targetFoodCostPercent) || QUOTATION_TARGET_FOOD_COST_PERCENT, 0);
  const targetMarginPercent = Math.max(Number(input.targetMarginPercent) || QUOTATION_TARGET_MARGIN_PERCENT, 0);
  const costPerGuest = baselineMenuCost / baselineGuestCount;
  const totalMenuCost = costPerGuest * guestCount;
  const totalSellingAmount = sellingPricePerGuest * guestCount;
  const profitPerGuest = sellingPricePerGuest - costPerGuest;
  const totalProfit = totalSellingAmount - totalMenuCost;
  const foodCostPercent = totalSellingAmount > 0 ? (totalMenuCost / totalSellingAmount) * 100 : 0;
  const marginPercent = totalSellingAmount > 0 ? (totalProfit / totalSellingAmount) * 100 : 0;

  const status: GuestCountQuotationStatus =
    sellingPricePerGuest <= 0
      ? 'Selling price required'
      : totalProfit < 0
        ? 'Loss Making'
        : foodCostPercent > targetFoodCostPercent || marginPercent < targetMarginPercent
          ? 'Low Margin'
          : 'Healthy';

  return {
    guestCount,
    baselineGuestCount,
    baselineMenuCost,
    sellingPricePerGuest,
    costPerGuest,
    totalMenuCost,
    totalSellingAmount,
    profitPerGuest,
    totalProfit,
    foodCostPercent,
    marginPercent,
    status,
  };
};

export const getBestProfitScenario = (scenarios: GuestCountQuotationResult[]) =>
  scenarios.reduce<GuestCountQuotationResult | null>(
    (bestScenario, scenario) =>
      !bestScenario || scenario.totalProfit > bestScenario.totalProfit ? scenario : bestScenario,
    null,
  );

export const applyGuestCountScenarioStatus = (
  scenarios: GuestCountQuotationResult[],
): GuestCountQuotationResult[] => {
  const bestScenario = getBestProfitScenario(
    scenarios.filter((scenario) => scenario.status !== 'Selling price required'),
  );

  return scenarios.map((scenario) => ({
    ...scenario,
    isBestTotalProfit: Boolean(bestScenario && bestScenario.guestCount === scenario.guestCount),
    isRecommended: scenario.status === 'Healthy',
  }));
};
