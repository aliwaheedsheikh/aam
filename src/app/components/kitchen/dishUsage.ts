import type { Dish, DishUsageFlags } from './types';

export type DishUsageContext =
  | 'customMenu'
  | 'menuPackage'
  | 'reservationFoodSupplies'
  | 'outsideServices';

const DEFAULT_DISH_USAGE_FLAGS: DishUsageFlags = {
  customMenu: true,
  menuPackage: true,
  reservationFoodSupplies: true,
  outsideServices: true,
};

export const createDefaultDishUsageFlags = (): DishUsageFlags => ({
  ...DEFAULT_DISH_USAGE_FLAGS,
});

export const normalizeDishUsageFlags = (
  dishOrFlags?: Partial<Pick<Dish, 'usageFlags'>> | DishUsageFlags | null,
): DishUsageFlags => {
  const usageFlags =
    dishOrFlags && 'usageFlags' in dishOrFlags ? dishOrFlags.usageFlags : dishOrFlags;

  return {
    ...DEFAULT_DISH_USAGE_FLAGS,
    ...(usageFlags || {}),
  };
};

export const isDishAvailableForUsage = (
  dishOrFlags: Partial<Pick<Dish, 'usageFlags'>> | DishUsageFlags | null | undefined,
  context: DishUsageContext,
) => normalizeDishUsageFlags(dishOrFlags)[context];

export const getDishUsageLabels = (
  dishOrFlags: Partial<Pick<Dish, 'usageFlags'>> | DishUsageFlags | null | undefined,
) => {
  const usageFlags = normalizeDishUsageFlags(dishOrFlags);

  return [
    usageFlags.customMenu ? 'Custom Menu' : null,
    usageFlags.menuPackage ? 'Menu Package' : null,
    usageFlags.reservationFoodSupplies ? 'Food Supplies' : null,
    usageFlags.outsideServices ? 'Outside Services' : null,
  ].filter((label): label is string => Boolean(label));
};
