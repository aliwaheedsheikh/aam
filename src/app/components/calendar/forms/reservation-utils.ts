import { formatCurrencyPKR } from '../../../lib/locale';

// Helper function to format Pakistani phone numbers
export const formatPakistaniPhoneNumber = (input: string): string => {
  // Remove all non-digit characters
  let cleaned = input.replace(/\D/g, '');
  
  // If it starts with country code (92), keep it
  if (cleaned.startsWith('92')) {
    // Format: +92 3XX XXXXXXX
    if (cleaned.length >= 12) {
      return `+92 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 12)}`;
    } else if (cleaned.length >= 5) {
      return `+92 ${cleaned.slice(2, 5)}${cleaned.length > 5 ? ' ' + cleaned.slice(5) : ''}`;
    } else if (cleaned.length > 2) {
      return `+92 ${cleaned.slice(2)}`;
    }
    return `+92 ${cleaned.slice(2)}`;
  }
  
  // If it starts with 0 (local format)
  if (cleaned.startsWith('0')) {
    // Format: 03XX XXXXXXX
    if (cleaned.length >= 11) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 11)}`;
    }
    return cleaned;
  }
  
  // If it's just digits without country code or leading 0
  // Assume it's a mobile number and add 0
  if (cleaned.length === 10 && cleaned.startsWith('3')) {
    return `0${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }
  
  return cleaned;
};

// Calculate menu discount based on guest count tiers
export const calculateAutoMenuDiscount = (guestCount: number, menuRate: number): number => {
  if (!guestCount || !menuRate) return 0;
  
  const totalMenuAmount = guestCount * menuRate;
  
  // Discount tiers
  if (guestCount >= 500) {
    return totalMenuAmount * 0.15; // 15% for 500+ guests
  } else if (guestCount >= 300) {
    return totalMenuAmount * 0.10; // 10% for 300-499 guests
  } else if (guestCount >= 200) {
    return totalMenuAmount * 0.05; // 5% for 200-299 guests
  }
  
  return 0;
};

// Calculate predefined menu rate from selected items
export const calculatePredefinedMenuRate = (
  selectedItems: Array<{ ratePerHead: number }>
): number => {
  if (selectedItems.length === 0) return 0;
  return selectedItems.reduce((sum, item) => sum + item.ratePerHead, 0);
};

// Format currency for PKR
export const formatPKR = (amount: number): string => {
  return formatCurrencyPKR(amount);
};

// Validate email format
export const validateEmail = (email: string): boolean => {
  if (!email) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Generate unique booking ID
export const generateBookingId = (): string => {
  return `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Calculate totals for menu and services
export const calculateTotals = (
  serviceMode: 'with_food' | 'without_food',
  
  // With Food calculations
  menuRate: string,
  guestCount: string,
  beverages: Array<{ quantity: string; rate: string }>,
  foodSupplies: Array<{ quantity: string; rate: string }>,
  additionalServices: Array<{ quantity: string; rate: string; discount: string }>,
  
  // Without Food calculations
  withoutFoodPricingMethod: 'fixed' | 'per_head',
  withoutFoodFixedAmount: string,
  withoutFoodPerHeadRate: string,
  withoutFoodWaiters: string,
  withoutFoodWaiterRate: string,
  withoutFoodAddOns: Array<{ enabled: boolean; quantity: string; rate: string }>,
  
  // RCS and other charges
  rcsServices: Array<{ quantity: string; rate: string }>,
  otherCharges: string,
  discount: string,
  taxRate: string
) => {
  let menuTotal = 0;
  let beveragesTotal = 0;
  let foodSuppliesTotal = 0;
  let additionalServicesTotal = 0;
  let withoutFoodSpaceCharges = 0;
  let withoutFoodWaiterCharges = 0;
  let withoutFoodAddOnsTotal = 0;
  let withoutFoodGrandTotal = 0;

  if (serviceMode === 'with_food') {
    // With Food calculations
    menuTotal = parseFloat(menuRate || '0') * parseFloat(guestCount || '0');
    
    beveragesTotal = beverages.reduce((sum, bev) => {
      return sum + (parseFloat(bev.quantity || '0') * parseFloat(bev.rate || '0'));
    }, 0);
    
    foodSuppliesTotal = foodSupplies.reduce((sum, supply) => {
      return sum + (parseFloat(supply.quantity || '0') * parseFloat(supply.rate || '0'));
    }, 0);
    
    additionalServicesTotal = additionalServices.reduce((sum, service) => {
      const amount = parseFloat(service.quantity || '0') * parseFloat(service.rate || '0');
      const discountAmount = parseFloat(service.discount || '0');
      return sum + (amount - discountAmount);
    }, 0);
  } else {
    // Without Food calculations
    if (withoutFoodPricingMethod === 'fixed') {
      withoutFoodSpaceCharges = parseFloat(withoutFoodFixedAmount || '0');
    } else {
      withoutFoodSpaceCharges = parseFloat(withoutFoodPerHeadRate || '0') * parseFloat(guestCount || '0');
    }
    
    withoutFoodWaiterCharges = parseFloat(withoutFoodWaiters || '0') * parseFloat(withoutFoodWaiterRate || '0');
    
    withoutFoodAddOnsTotal = withoutFoodAddOns.reduce((sum, addon) => {
      if (!addon.enabled) return sum;
      return sum + (parseFloat(addon.quantity || '0') * parseFloat(addon.rate || '0'));
    }, 0);
    
    withoutFoodGrandTotal = withoutFoodSpaceCharges + withoutFoodWaiterCharges + withoutFoodAddOnsTotal;
  }

  const rcsTotal = rcsServices.reduce((sum, rcs) => {
    return sum + (parseFloat(rcs.quantity || '0') * parseFloat(rcs.rate || '0'));
  }, 0);

  const subtotal = serviceMode === 'with_food'
    ? menuTotal + beveragesTotal + foodSuppliesTotal + additionalServicesTotal + rcsTotal
    : withoutFoodGrandTotal + rcsTotal;

  const totalDiscount = parseFloat(discount || '0');
  const taxAmount = (subtotal - totalDiscount) * (parseFloat(taxRate || '0') / 100);
  const totalAmount = subtotal + parseFloat(otherCharges || '0') - totalDiscount + taxAmount;

  return {
    menuTotal,
    beveragesTotal,
    foodSuppliesTotal,
    additionalServicesTotal,
    withoutFoodSpaceCharges,
    withoutFoodWaiterCharges,
    withoutFoodAddOnsTotal,
    withoutFoodGrandTotal,
    rcsTotal,
    subtotal,
    totalDiscount,
    taxAmount,
    totalAmount,
  };
};
