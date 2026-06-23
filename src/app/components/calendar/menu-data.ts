// Kitchen Items Database organized by categories
export interface KitchenItem {
  id: string;
  name: string;
  category: 'Starter' | 'Main Dish' | 'Tandoor' | 'BBQ' | 'Dessert' | 'Salad' | 'Beverages';
  priceAdjustment: number; // Additional cost per head if added
  isVeg: boolean;
}

export const kitchenItems: KitchenItem[] = [
  // Starters
  { id: 'st-1', name: 'Chicken Tikka', category: 'Starter', priceAdjustment: 120, isVeg: false },
  { id: 'st-2', name: 'Fish Tikka', category: 'Starter', priceAdjustment: 150, isVeg: false },
  { id: 'st-3', name: 'Paneer Tikka', category: 'Starter', priceAdjustment: 80, isVeg: true },
  { id: 'st-4', name: 'Chicken Malai Tikka', category: 'Starter', priceAdjustment: 140, isVeg: false },
  { id: 'st-5', name: 'Seekh Kabab', category: 'Starter', priceAdjustment: 130, isVeg: false },
  { id: 'st-6', name: 'Hara Bhara Kabab', category: 'Starter', priceAdjustment: 70, isVeg: true },
  { id: 'st-7', name: 'Spring Rolls', category: 'Starter', priceAdjustment: 60, isVeg: true },
  { id: 'st-8', name: 'Chicken Wings', category: 'Starter', priceAdjustment: 110, isVeg: false },

  // Main Dishes
  { id: 'md-1', name: 'Chicken Karahi', category: 'Main Dish', priceAdjustment: 180, isVeg: false },
  { id: 'md-2', name: 'Mutton Karahi', category: 'Main Dish', priceAdjustment: 250, isVeg: false },
  { id: 'md-3', name: 'Chicken Korma', category: 'Main Dish', priceAdjustment: 160, isVeg: false },
  { id: 'md-4', name: 'Mutton Korma', category: 'Main Dish', priceAdjustment: 230, isVeg: false },
  { id: 'md-5', name: 'Chicken Jalfrezi', category: 'Main Dish', priceAdjustment: 170, isVeg: false },
  { id: 'md-6', name: 'Paneer Tikka Masala', category: 'Main Dish', priceAdjustment: 120, isVeg: true },
  { id: 'md-7', name: 'Mix Vegetable', category: 'Main Dish', priceAdjustment: 90, isVeg: true },
  { id: 'md-8', name: 'Daal Makhani', category: 'Main Dish', priceAdjustment: 80, isVeg: true },
  { id: 'md-9', name: 'Palak Paneer', category: 'Main Dish', priceAdjustment: 100, isVeg: true },
  { id: 'md-10', name: 'Fish Masala', category: 'Main Dish', priceAdjustment: 200, isVeg: false },

  // Tandoor
  { id: 'td-1', name: 'Naan', category: 'Tandoor', priceAdjustment: 15, isVeg: true },
  { id: 'td-2', name: 'Garlic Naan', category: 'Tandoor', priceAdjustment: 25, isVeg: true },
  { id: 'td-3', name: 'Roti', category: 'Tandoor', priceAdjustment: 10, isVeg: true },
  { id: 'td-4', name: 'Tandoori Paratha', category: 'Tandoor', priceAdjustment: 30, isVeg: true },
  { id: 'td-5', name: 'Cheese Naan', category: 'Tandoor', priceAdjustment: 40, isVeg: true },
  { id: 'td-6', name: 'Kulcha', category: 'Tandoor', priceAdjustment: 35, isVeg: true },

  // BBQ
  { id: 'bbq-1', name: 'Chicken Boti', category: 'BBQ', priceAdjustment: 140, isVeg: false },
  { id: 'bbq-2', name: 'Beef Boti', category: 'BBQ', priceAdjustment: 160, isVeg: false },
  { id: 'bbq-3', name: 'Reshmi Kabab', category: 'BBQ', priceAdjustment: 150, isVeg: false },
  { id: 'bbq-4', name: 'Chicken Seekh Kabab', category: 'BBQ', priceAdjustment: 130, isVeg: false },
  { id: 'bbq-5', name: 'Beef Seekh Kabab', category: 'BBQ', priceAdjustment: 140, isVeg: false },
  { id: 'bbq-6', name: 'Grilled Fish', category: 'BBQ', priceAdjustment: 180, isVeg: false },
  { id: 'bbq-7', name: 'Tandoori Chicken (Full)', category: 'BBQ', priceAdjustment: 200, isVeg: false },
  { id: 'bbq-8', name: 'Malai Boti', category: 'BBQ', priceAdjustment: 160, isVeg: false },

  // Desserts
  { id: 'ds-1', name: 'Kheer', category: 'Dessert', priceAdjustment: 50, isVeg: true },
  { id: 'ds-2', name: 'Gulab Jamun', category: 'Dessert', priceAdjustment: 60, isVeg: true },
  { id: 'ds-3', name: 'Ras Malai', category: 'Dessert', priceAdjustment: 70, isVeg: true },
  { id: 'ds-4', name: 'Fruit Custard', category: 'Dessert', priceAdjustment: 65, isVeg: true },
  { id: 'ds-5', name: 'Ice Cream', category: 'Dessert', priceAdjustment: 80, isVeg: true },
  { id: 'ds-6', name: 'Gajar Halwa', category: 'Dessert', priceAdjustment: 90, isVeg: true },
  { id: 'ds-7', name: 'Zarda', category: 'Dessert', priceAdjustment: 55, isVeg: true },

  // Salads
  { id: 'sl-1', name: 'Garden Salad', category: 'Salad', priceAdjustment: 40, isVeg: true },
  { id: 'sl-2', name: 'Russian Salad', category: 'Salad', priceAdjustment: 50, isVeg: true },
  { id: 'sl-3', name: 'Caesar Salad', category: 'Salad', priceAdjustment: 60, isVeg: true },
  { id: 'sl-4', name: 'Raita', category: 'Salad', priceAdjustment: 30, isVeg: true },
  { id: 'sl-5', name: 'Kachumber', category: 'Salad', priceAdjustment: 35, isVeg: true },

  // Beverages
  { id: 'bv-1', name: 'Cold Drink', category: 'Beverages', priceAdjustment: 50, isVeg: true },
  { id: 'bv-2', name: 'Mineral Water', category: 'Beverages', priceAdjustment: 30, isVeg: true },
  { id: 'bv-3', name: 'Fresh Juice', category: 'Beverages', priceAdjustment: 80, isVeg: true },
  { id: 'bv-4', name: 'Tea', category: 'Beverages', priceAdjustment: 40, isVeg: true },
  { id: 'bv-5', name: 'Coffee', category: 'Beverages', priceAdjustment: 50, isVeg: true },
  { id: 'bv-6', name: 'Lassi', category: 'Beverages', priceAdjustment: 60, isVeg: true },
  { id: 'bv-7', name: 'Kashmiri Chai', category: 'Beverages', priceAdjustment: 45, isVeg: true },
];

// Menu Package Item
export interface MenuPackageItem {
  kitchenItemId: string;
  name: string;
  category: string;
  isVeg: boolean;
}

// Menu Package Definition
export interface MenuPackage {
  id: string;
  name: string;
  baseRate: number; // Per head base rate
  description: string;
  items: MenuPackageItem[];
}

export const menuPackages: MenuPackage[] = [
  {
    id: 'pkg-premium',
    name: 'Premium Wedding Package',
    baseRate: 2500,
    description: 'Luxurious spread with premium ingredients and variety',
    items: [
      // Starters (2)
      { kitchenItemId: 'st-1', name: 'Chicken Tikka', category: 'Starter', isVeg: false },
      { kitchenItemId: 'st-3', name: 'Paneer Tikka', category: 'Starter', isVeg: true },
      
      // Main Dishes (4)
      { kitchenItemId: 'md-2', name: 'Mutton Karahi', category: 'Main Dish', isVeg: false },
      { kitchenItemId: 'md-1', name: 'Chicken Karahi', category: 'Main Dish', isVeg: false },
      { kitchenItemId: 'md-6', name: 'Paneer Tikka Masala', category: 'Main Dish', isVeg: true },
      { kitchenItemId: 'md-8', name: 'Daal Makhani', category: 'Main Dish', isVeg: true },
      
      // Tandoor (2)
      { kitchenItemId: 'td-2', name: 'Garlic Naan', category: 'Tandoor', isVeg: true },
      { kitchenItemId: 'td-4', name: 'Tandoori Paratha', category: 'Tandoor', isVeg: true },
      
      // BBQ (3)
      { kitchenItemId: 'bbq-7', name: 'Tandoori Chicken (Full)', category: 'BBQ', isVeg: false },
      { kitchenItemId: 'bbq-1', name: 'Chicken Boti', category: 'BBQ', isVeg: false },
      { kitchenItemId: 'bbq-3', name: 'Reshmi Kabab', category: 'BBQ', isVeg: false },
      
      // Desserts (2)
      { kitchenItemId: 'ds-3', name: 'Ras Malai', category: 'Dessert', isVeg: true },
      { kitchenItemId: 'ds-2', name: 'Gulab Jamun', category: 'Dessert', isVeg: true },
      
      // Salads (2)
      { kitchenItemId: 'sl-2', name: 'Russian Salad', category: 'Salad', isVeg: true },
      { kitchenItemId: 'sl-4', name: 'Raita', category: 'Salad', isVeg: true },
      
      // Beverages (2)
      { kitchenItemId: 'bv-1', name: 'Cold Drink', category: 'Beverages', isVeg: true },
      { kitchenItemId: 'bv-2', name: 'Mineral Water', category: 'Beverages', isVeg: true },
    ],
  },
  {
    id: 'pkg-standard',
    name: 'Standard Wedding Package',
    baseRate: 1800,
    description: 'Balanced menu with quality items for medium-scale events',
    items: [
      // Starters (2)
      { kitchenItemId: 'st-1', name: 'Chicken Tikka', category: 'Starter', isVeg: false },
      { kitchenItemId: 'st-3', name: 'Paneer Tikka', category: 'Starter', isVeg: true },
      
      // Main Dishes (3)
      { kitchenItemId: 'md-1', name: 'Chicken Karahi', category: 'Main Dish', isVeg: false },
      { kitchenItemId: 'md-6', name: 'Paneer Tikka Masala', category: 'Main Dish', isVeg: true },
      { kitchenItemId: 'md-8', name: 'Daal Makhani', category: 'Main Dish', isVeg: true },
      
      // Tandoor (2)
      { kitchenItemId: 'td-1', name: 'Naan', category: 'Tandoor', isVeg: true },
      { kitchenItemId: 'td-3', name: 'Roti', category: 'Tandoor', isVeg: true },
      
      // BBQ (2)
      { kitchenItemId: 'bbq-1', name: 'Chicken Boti', category: 'BBQ', isVeg: false },
      { kitchenItemId: 'bbq-4', name: 'Chicken Seekh Kabab', category: 'BBQ', isVeg: false },
      
      // Desserts (2)
      { kitchenItemId: 'ds-1', name: 'Kheer', category: 'Dessert', isVeg: true },
      { kitchenItemId: 'ds-2', name: 'Gulab Jamun', category: 'Dessert', isVeg: true },
      
      // Salads (1)
      { kitchenItemId: 'sl-1', name: 'Garden Salad', category: 'Salad', isVeg: true },
      
      // Beverages (1)
      { kitchenItemId: 'bv-1', name: 'Cold Drink', category: 'Beverages', isVeg: true },
    ],
  },
  {
    id: 'pkg-budget',
    name: 'Budget Package',
    baseRate: 1200,
    description: 'Economical menu with essential items for budget-conscious events',
    items: [
      // Starters (1)
      { kitchenItemId: 'st-3', name: 'Paneer Tikka', category: 'Starter', isVeg: true },
      
      // Main Dishes (3)
      { kitchenItemId: 'md-1', name: 'Chicken Karahi', category: 'Main Dish', isVeg: false },
      { kitchenItemId: 'md-7', name: 'Mix Vegetable', category: 'Main Dish', isVeg: true },
      { kitchenItemId: 'md-8', name: 'Daal Makhani', category: 'Main Dish', isVeg: true },
      
      // Tandoor (1)
      { kitchenItemId: 'td-1', name: 'Naan', category: 'Tandoor', isVeg: true },
      
      // BBQ (1)
      { kitchenItemId: 'bbq-4', name: 'Chicken Seekh Kabab', category: 'BBQ', isVeg: false },
      
      // Desserts (1)
      { kitchenItemId: 'ds-1', name: 'Kheer', category: 'Dessert', isVeg: true },
      
      // Salads (1)
      { kitchenItemId: 'sl-1', name: 'Garden Salad', category: 'Salad', isVeg: true },
      
      // Beverages (1)
      { kitchenItemId: 'bv-1', name: 'Cold Drink', category: 'Beverages', isVeg: true },
    ],
  },
  {
    id: 'pkg-veg-deluxe',
    name: 'Vegetarian Deluxe',
    baseRate: 1500,
    description: 'Pure vegetarian premium menu',
    items: [
      // Starters (2)
      { kitchenItemId: 'st-3', name: 'Paneer Tikka', category: 'Starter', isVeg: true },
      { kitchenItemId: 'st-6', name: 'Hara Bhara Kabab', category: 'Starter', isVeg: true },
      
      // Main Dishes (3)
      { kitchenItemId: 'md-6', name: 'Paneer Tikka Masala', category: 'Main Dish', isVeg: true },
      { kitchenItemId: 'md-9', name: 'Palak Paneer', category: 'Main Dish', isVeg: true },
      { kitchenItemId: 'md-8', name: 'Daal Makhani', category: 'Main Dish', isVeg: true },
      
      // Tandoor (2)
      { kitchenItemId: 'td-2', name: 'Garlic Naan', category: 'Tandoor', isVeg: true },
      { kitchenItemId: 'td-4', name: 'Tandoori Paratha', category: 'Tandoor', isVeg: true },
      
      // Desserts (2)
      { kitchenItemId: 'ds-3', name: 'Ras Malai', category: 'Dessert', isVeg: true },
      { kitchenItemId: 'ds-6', name: 'Gajar Halwa', category: 'Dessert', isVeg: true },
      
      // Salads (2)
      { kitchenItemId: 'sl-2', name: 'Russian Salad', category: 'Salad', isVeg: true },
      { kitchenItemId: 'sl-4', name: 'Raita', category: 'Salad', isVeg: true },
      
      // Beverages (2)
      { kitchenItemId: 'bv-1', name: 'Cold Drink', category: 'Beverages', isVeg: true },
      { kitchenItemId: 'bv-6', name: 'Lassi', category: 'Beverages', isVeg: true },
    ],
  },
];

// Helper functions
export const getCategorizedItems = (categoryName: string) => {
  return kitchenItems.filter(item => item.category === categoryName);
};

export const getKitchenItemById = (id: string) => {
  return kitchenItems.find(item => item.id === id);
};

export const getMenuPackageById = (id: string) => {
  return menuPackages.find(pkg => pkg.id === id);
};

export const calculatePackageTotal = (
  baseRate: number,
  extraItems: { kitchenItemId: string }[],
  guaranteedGuests: number
): { baseRate: number; addOns: number; adjustedRate: number; total: number } => {
  const addOnsTotal = extraItems.reduce((sum, item) => {
    const kitchenItem = getKitchenItemById(item.kitchenItemId);
    return sum + (kitchenItem?.priceAdjustment || 0);
  }, 0);

  return {
    baseRate,
    addOns: addOnsTotal,
    adjustedRate: baseRate + addOnsTotal,
    total: (baseRate + addOnsTotal) * guaranteedGuests,
  };
};
