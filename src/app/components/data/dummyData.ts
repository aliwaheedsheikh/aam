/**
 * COMPREHENSIVE DUMMY DATA FOR BANQUET/MARQUEE ERP SYSTEM
 * 
 * This file contains realistic dummy data for all modules to help understand
 * the complete system flow and data structure.
 */

import { Booking } from '../calendar/types-v2';

// =============================================================================
// 1. BOOKINGS DATA (Core of the system)
// =============================================================================

export const dummyBookings: Booking[] = [
  // CONFIRMED BOOKING - Wedding (Full payment)
  {
    id: 'BK-2025-001',
    customerName: 'Ahmed Khan',
    contactNumber: '+923001234567',
    guestCount: 500,
    eventType: 'Wedding - Valima',
    date: new Date(2025, 0, 15), // Jan 15, 2025
    startTime: '19:00',
    endTime: '23:00',
    status: 'confirmed',
    venueId: 'aiwan-e-akbari',
    primeSpaceId: 'PS-AAK-001',
    subSpaceId: undefined,
    createdAt: new Date(2024, 11, 1),
    // Financial Details
    totalAmount: 1500000, // PKR 15 Lakh
    advancePayment: 500000, // PKR 5 Lakh advance
    remainingBalance: 0, // Fully paid
    paymentStatus: 'paid',
    menuRate: 2500, // Per person
    // Additional Details
    whatsapp: '+923001234567',
    email: 'ahmed.khan@example.com',
    address: 'House #123, Street 5, DHA Phase 6, Karachi',
    cnic: '42101-1234567-1',
    eventDetails: {
      brideName: 'Ayesha Ahmed',
      groomName: 'Ahmed Khan',
      expectedDinnerTime: '21:00',
      specialRequests: 'Need extra lighting in ladies section',
    },
    menu: {
      serviceType: 'Buffet Service',
      welcomeDrink: 'Fresh Lemonade',
      soup: 'Chicken Corn Soup',
      starters: ['Chicken Tikka', 'Seekh Kabab', 'Spring Rolls'],
      mainCourse: ['Chicken Karahi', 'Mutton Biryani', 'Dal Makhani', 'Mix Vegetables'],
      bread: ['Naan', 'Roti', 'Garlic Naan'],
      dessert: ['Gulab Jamun', 'Ice Cream', 'Fruit Trifle'],
      beverages: ['Soft Drinks', 'Mineral Water', 'Tea & Coffee'],
    },
    payments: [
      {
        id: 'PAY-001-1',
        date: new Date(2024, 11, 1),
        amount: 500000,
        paymentMethod: 'Bank Transfer',
        paymentType: 'Advance',
        receivedBy: 'Ali Raza - Front Office',
        bankDetails: 'HBL - Transaction #ABC123456',
      },
      {
        id: 'PAY-001-2',
        date: new Date(2025, 0, 10),
        amount: 750000,
        paymentMethod: 'Cash',
        paymentType: 'Partial',
        receivedBy: 'Ali Raza - Front Office',
      },
      {
        id: 'PAY-001-3',
        date: new Date(2025, 0, 14),
        amount: 250000,
        paymentMethod: 'Cash',
        paymentType: 'Final',
        receivedBy: 'Ali Raza - Front Office',
      },
    ],
  },

  // CONFIRMED BOOKING - Corporate Event (Partial payment)
  {
    id: 'BK-2025-002',
    customerName: 'Fatima Sheikh (XYZ Corporation)',
    contactNumber: '+92 321 9876543',
    guestCount: 200,
    eventType: 'Corporate - Annual Dinner',
    date: new Date(2025, 0, 20), // Jan 20, 2025
    startTime: '18:00',
    endTime: '22:00',
    status: 'confirmed',
    venueId: 'emerald-banquet',
    primeSpaceId: 'PS-EMR-001',
    subSpaceId: undefined,
    createdAt: new Date(2024, 11, 15),
    totalAmount: 600000, // PKR 6 Lakh
    advancePayment: 200000, // PKR 2 Lakh advance
    remainingBalance: 400000, // PKR 4 Lakh remaining
    paymentStatus: 'partial',
    menuRate: 2000,
    whatsapp: '+92 321 9876543',
    email: 'fatima.sheikh@xyzcorp.com',
    address: 'Office Tower, Shahrah-e-Faisal, Karachi',
    eventDetails: {
      companyName: 'XYZ Corporation',
      contactPerson: 'Fatima Sheikh - HR Manager',
      expectedDinnerTime: '20:00',
      specialRequests: 'Need projector and sound system for presentations',
    },
    menu: {
      serviceType: 'Plated Service',
      welcomeDrink: 'Orange Juice',
      soup: 'Hot & Sour Soup',
      starters: ['Chicken Wings', 'Fish Fingers', 'Vegetable Samosa'],
      mainCourse: ['Grilled Chicken', 'Fish Tikka', 'Vegetable Biryani', 'Pasta'],
      bread: ['Dinner Rolls', 'Garlic Bread'],
      dessert: ['Chocolate Brownie', 'Fruit Salad'],
      beverages: ['Soft Drinks', 'Mineral Water', 'Coffee'],
    },
    payments: [
      {
        id: 'PAY-002-1',
        date: new Date(2024, 11, 15),
        amount: 200000,
        paymentMethod: 'Cheque',
        paymentType: 'Advance',
        receivedBy: 'Ali Raza - Front Office',
        bankDetails: 'MCB - Cheque #123456',
      },
    ],
  },

  // TENTATIVE BOOKING - Birthday (Follow-up needed)
  {
    id: 'BK-2025-003',
    customerName: 'Hassan Ahmed',
    contactNumber: '+92 333 5555555',
    guestCount: 150,
    eventType: 'Birthday Party',
    date: new Date(2025, 0, 25), // Jan 25, 2025
    startTime: '17:00',
    endTime: '21:00',
    status: 'tentative',
    venueId: 'pearl-marquee',
    primeSpaceId: undefined,
    subSpaceId: 'SS-PRL-001',
    createdAt: new Date(2025, 0, 5),
    totalAmount: 300000, // PKR 3 Lakh (estimated)
    advancePayment: 0,
    remainingBalance: 300000,
    paymentStatus: 'pending',
    menuRate: 1500,
    whatsapp: '+92 333 5555555',
    email: 'hassan.ahmed@example.com',
    address: 'Flat 4B, Clifton Block 5, Karachi',
    eventDetails: {
      occasionType: '50th Birthday Celebration',
      expectedDinnerTime: '19:00',
      specialRequests: 'Need kids play area and birthday cake arrangement',
    },
    menu: {
      serviceType: 'Buffet Service',
      welcomeDrink: 'Fresh Juice',
      starters: ['Chicken Nuggets', 'Pizza Slices', 'Sandwiches'],
      mainCourse: ['Fried Chicken', 'Beef Pulao', 'Chinese Rice'],
      dessert: ['Birthday Cake', 'Ice Cream', 'Donuts'],
      beverages: ['Soft Drinks', 'Juices'],
    },
    followUpNotes: [
      {
        date: new Date(2025, 0, 5),
        note: 'Customer called to check availability. Sent quotation.',
        addedBy: 'Ali Raza',
      },
      {
        date: new Date(2025, 0, 8),
        note: 'Follow-up call done. Customer needs 2 more days to decide.',
        addedBy: 'Ali Raza',
      },
    ],
  },

  // TENTATIVE BOOKING - Mehndi (Urgent follow-up)
  {
    id: 'BK-2025-004',
    customerName: 'Zainab Hussain',
    contactNumber: '+92 345 7777777',
    guestCount: 300,
    eventType: 'Wedding - Mehndi',
    date: new Date(2025, 0, 18), // Jan 18, 2025 (Soon!)
    startTime: '16:00',
    endTime: '20:00',
    status: 'tentative',
    venueId: 'aiwan-e-akbari',
    primeSpaceId: undefined,
    subSpaceId: 'SS-AAK-002',
    createdAt: new Date(2025, 0, 3),
    totalAmount: 450000,
    advancePayment: 0,
    remainingBalance: 450000,
    paymentStatus: 'pending',
    menuRate: 1200,
    whatsapp: '+92 345 7777777',
    email: 'zainab.h@example.com',
    eventDetails: {
      brideName: 'Zainab Hussain',
      expectedDinnerTime: '18:00',
      specialRequests: 'Need mehndi stage decoration and traditional music setup',
    },
    followUpNotes: [
      {
        date: new Date(2025, 0, 3),
        note: 'Initial inquiry. Sent quotation and menu options.',
        addedBy: 'Sana Khan',
      },
      {
        date: new Date(2025, 0, 6),
        note: 'URGENT: Event is in 12 days. Need confirmation by tomorrow.',
        addedBy: 'Sana Khan',
      },
    ],
  },

  // CONFIRMED BOOKING - Engagement (Payment due)
  {
    id: 'BK-2025-005',
    customerName: 'Muhammad Asif',
    contactNumber: '+92 300 8888888',
    guestCount: 250,
    eventType: 'Engagement Ceremony',
    date: new Date(2025, 0, 22), // Jan 22, 2025
    startTime: '19:00',
    endTime: '23:00',
    status: 'confirmed',
    venueId: 'emerald-banquet',
    primeSpaceId: undefined,
    subSpaceId: 'SS-EMR-002',
    createdAt: new Date(2024, 11, 20),
    totalAmount: 500000,
    advancePayment: 150000,
    remainingBalance: 350000, // Payment overdue
    paymentStatus: 'overdue',
    menuRate: 1800,
    whatsapp: '+92 300 8888888',
    email: 'm.asif@example.com',
    eventDetails: {
      brideName: 'Aliya Tariq',
      groomName: 'Muhammad Asif',
      expectedDinnerTime: '21:00',
    },
    payments: [
      {
        id: 'PAY-005-1',
        date: new Date(2024, 11, 20),
        amount: 150000,
        paymentMethod: 'Cash',
        paymentType: 'Advance',
        receivedBy: 'Ali Raza - Front Office',
      },
    ],
    paymentFollowUpNotes: [
      {
        date: new Date(2025, 0, 10),
        note: 'Reminder sent for pending balance of PKR 3.5 Lakh',
        addedBy: 'Accounts Team',
      },
    ],
  },
];

// =============================================================================
// 2. KITCHEN MANAGEMENT DATA
// =============================================================================

// Banquet Kitchen - Cuisine Masters
export const banquetCuisines = [
  {
    id: 'BC-001',
    name: 'Pakistani Traditional',
    description: 'Traditional Pakistani dishes for weddings and events',
    isActive: true,
    createdAt: new Date(2024, 0, 1),
  },
  {
    id: 'BC-002',
    name: 'Chinese',
    description: 'Chinese cuisine for banquet events',
    isActive: true,
    createdAt: new Date(2024, 0, 1),
  },
  {
    id: 'BC-003',
    name: 'Continental',
    description: 'Western continental dishes',
    isActive: true,
    createdAt: new Date(2024, 0, 1),
  },
];

// Banquet Kitchen - Dish Masters
export const banquetDishes = [
  {
    id: 'BD-001',
    name: 'Chicken Karahi',
    cuisineId: 'BC-001',
    cuisineName: 'Pakistani Traditional',
    category: 'Main Course',
    portionSize: '1 Person',
    preparationTime: '45 minutes',
    shelfLife: '2 hours',
    allergens: ['Dairy', 'Tomatoes'],
    isActive: true,
    standardRecipe: {
      ingredients: [
        { name: 'Chicken', quantity: 250, unit: 'grams' },
        { name: 'Tomatoes', quantity: 100, unit: 'grams' },
        { name: 'Green Chili', quantity: 20, unit: 'grams' },
        { name: 'Ginger Garlic Paste', quantity: 30, unit: 'grams' },
        { name: 'Oil', quantity: 50, unit: 'ml' },
        { name: 'Spices Mix', quantity: 15, unit: 'grams' },
      ],
      estimatedCost: 350, // PKR per portion
    },
  },
  {
    id: 'BD-002',
    name: 'Mutton Biryani',
    cuisineId: 'BC-001',
    cuisineName: 'Pakistani Traditional',
    category: 'Main Course',
    portionSize: '1 Person',
    preparationTime: '90 minutes',
    shelfLife: '3 hours',
    allergens: ['Dairy'],
    isActive: true,
    standardRecipe: {
      ingredients: [
        { name: 'Mutton', quantity: 200, unit: 'grams' },
        { name: 'Basmati Rice', quantity: 150, unit: 'grams' },
        { name: 'Yogurt', quantity: 50, unit: 'grams' },
        { name: 'Onions', quantity: 100, unit: 'grams' },
        { name: 'Spices Mix', quantity: 20, unit: 'grams' },
        { name: 'Ghee', quantity: 30, unit: 'ml' },
      ],
      estimatedCost: 450, // PKR per portion
    },
  },
  {
    id: 'BD-003',
    name: 'Chicken Corn Soup',
    cuisineId: 'BC-002',
    cuisineName: 'Chinese',
    category: 'Soup',
    portionSize: '1 Bowl',
    preparationTime: '30 minutes',
    shelfLife: '2 hours',
    allergens: ['Corn', 'Egg'],
    isActive: true,
    standardRecipe: {
      ingredients: [
        { name: 'Chicken', quantity: 100, unit: 'grams' },
        { name: 'Sweet Corn', quantity: 80, unit: 'grams' },
        { name: 'Chicken Stock', quantity: 250, unit: 'ml' },
        { name: 'Egg', quantity: 1, unit: 'piece' },
        { name: 'Cornflour', quantity: 20, unit: 'grams' },
      ],
      estimatedCost: 120, // PKR per portion
    },
  },
];

// Restaurant Kitchen - Cuisine Masters (Separate from Banquet)
export const restaurantCuisines = [
  {
    id: 'RC-001',
    name: 'Pakistani Fast Food',
    description: 'Daily menu items for restaurant',
    isActive: true,
    createdAt: new Date(2024, 0, 1),
  },
  {
    id: 'RC-002',
    name: 'BBQ & Grills',
    description: 'Grilled and BBQ items',
    isActive: true,
    createdAt: new Date(2024, 0, 1),
  },
];

// Restaurant Kitchen - Dish Masters
export const restaurantDishes = [
  {
    id: 'RD-001',
    name: 'Chicken Tikka Roll',
    cuisineId: 'RC-001',
    cuisineName: 'Pakistani Fast Food',
    category: 'Fast Food',
    portionSize: '1 Piece',
    preparationTime: '15 minutes',
    isActive: true,
    standardRecipe: {
      ingredients: [
        { name: 'Chicken Tikka', quantity: 150, unit: 'grams' },
        { name: 'Paratha', quantity: 1, unit: 'piece' },
        { name: 'Salad', quantity: 50, unit: 'grams' },
        { name: 'Sauce', quantity: 30, unit: 'ml' },
      ],
      estimatedCost: 180,
    },
  },
];

// Production Orders - Banquet Kitchen
export const banquetProductionOrders = [
  {
    id: 'BPO-2025-001',
    bookingId: 'BK-2025-001',
    bookingReference: 'Ahmed Khan - Wedding',
    eventDate: new Date(2025, 0, 15),
    guestCount: 500,
    dishes: [
      {
        dishId: 'BD-001',
        dishName: 'Chicken Karahi',
        quantity: 500,
        portionSize: '1 Person',
        totalCost: 175000,
      },
      {
        dishId: 'BD-002',
        dishName: 'Mutton Biryani',
        quantity: 500,
        portionSize: '1 Person',
        totalCost: 225000,
      },
      {
        dishId: 'BD-003',
        dishName: 'Chicken Corn Soup',
        quantity: 500,
        portionSize: '1 Bowl',
        totalCost: 60000,
      },
    ],
    status: 'planned',
    assignedTo: 'Chef Imran - Banquet Kitchen',
    createdDate: new Date(2025, 0, 8),
  },
];

// =============================================================================
// 3. VENDOR MANAGEMENT & PROCUREMENT DATA
// =============================================================================

// Vendor Categories
export const vendorCategories = [
  { id: 'VC-001', name: 'Meat & Poultry', description: 'Chicken, Mutton, Beef suppliers' },
  { id: 'VC-002', name: 'Vegetables & Fruits', description: 'Fresh produce suppliers' },
  { id: 'VC-003', name: 'Dairy Products', description: 'Milk, Yogurt, Cream, Butter' },
  { id: 'VC-004', name: 'Spices & Condiments', description: 'Spices, Masala, Sauces' },
  { id: 'VC-005', name: 'Dry Goods', description: 'Rice, Flour, Pulses, Oil' },
];

// Vendors
export const vendors = [
  {
    id: 'V-001',
    name: 'Al-Madina Meat Shop',
    categoryId: 'VC-001',
    category: 'Meat & Poultry',
    contactPerson: 'Rasheed Ahmed',
    phone: '+92 300 1111111',
    address: 'Saddar Market, Karachi',
    email: 'almadinameat@example.com',
    paymentTerms: 'Cash on Delivery',
    creditLimit: 500000,
    currentBalance: 0,
    isActive: true,
    rating: 5,
  },
  {
    id: 'V-002',
    name: 'Fresh Farms Vegetables',
    categoryId: 'VC-002',
    category: 'Vegetables & Fruits',
    contactPerson: 'Saleem Khan',
    phone: '+92 321 2222222',
    address: 'Sabzi Mandi, Karachi',
    email: 'freshfarms@example.com',
    paymentTerms: '7 Days Credit',
    creditLimit: 200000,
    currentBalance: 50000,
    isActive: true,
    rating: 4,
  },
  {
    id: 'V-003',
    name: 'National Dairy Products',
    categoryId: 'VC-003',
    category: 'Dairy Products',
    contactPerson: 'Ahmed Ali',
    phone: '+92 333 3333333',
    address: 'Landhi Industrial Area, Karachi',
    email: 'nationaldairy@example.com',
    paymentTerms: '15 Days Credit',
    creditLimit: 300000,
    currentBalance: 75000,
    isActive: true,
    rating: 5,
  },
];

// Purchase Orders
export const purchaseOrders = [
  {
    id: 'PO-2025-001',
    poNumber: 'PO/2025/0001',
    vendorId: 'V-001',
    vendorName: 'Al-Madina Meat Shop',
    orderDate: new Date(2025, 0, 10),
    expectedDelivery: new Date(2025, 0, 14),
    status: 'received',
    items: [
      {
        itemName: 'Chicken (Fresh)',
        quantity: 150,
        unit: 'kg',
        rate: 450,
        amount: 67500,
      },
      {
        itemName: 'Mutton (Boneless)',
        quantity: 100,
        unit: 'kg',
        rate: 1200,
        amount: 120000,
      },
    ],
    subtotal: 187500,
    tax: 0,
    totalAmount: 187500,
    paymentStatus: 'paid',
    orderedBy: 'Ali Raza - Procurement',
    receivedDate: new Date(2025, 0, 14),
    receivedBy: 'Store Keeper - Main Store',
  },
  {
    id: 'PO-2025-002',
    poNumber: 'PO/2025/0002',
    vendorId: 'V-002',
    vendorName: 'Fresh Farms Vegetables',
    orderDate: new Date(2025, 0, 12),
    expectedDelivery: new Date(2025, 0, 14),
    status: 'pending',
    items: [
      {
        itemName: 'Tomatoes',
        quantity: 50,
        unit: 'kg',
        rate: 80,
        amount: 4000,
      },
      {
        itemName: 'Onions',
        quantity: 40,
        unit: 'kg',
        rate: 60,
        amount: 2400,
      },
      {
        itemName: 'Green Chili',
        quantity: 10,
        unit: 'kg',
        rate: 200,
        amount: 2000,
      },
    ],
    subtotal: 8400,
    tax: 0,
    totalAmount: 8400,
    paymentStatus: 'pending',
    orderedBy: 'Ali Raza - Procurement',
  },
];

// =============================================================================
// 4. INVENTORY MANAGEMENT DATA (10 Store Locations)
// =============================================================================

// Store Locations
export const storeLocations = [
  { id: 'ST-001', name: 'Main Store', type: 'Central Storage', location: 'Ground Floor' },
  { id: 'ST-002', name: 'Banquet Kitchen Store', type: 'Production Store', location: 'Banquet Kitchen Area' },
  { id: 'ST-003', name: 'Restaurant Kitchen Store', type: 'Production Store', location: 'Restaurant Kitchen Area' },
  { id: 'ST-004', name: 'Cold Storage', type: 'Cold Room', location: 'Basement' },
  { id: 'ST-005', name: 'Dry Goods Store', type: 'Dry Storage', location: 'Ground Floor - Room B' },
  { id: 'ST-006', name: 'Beverage Store', type: 'Beverage Storage', location: 'Ground Floor - Room C' },
  { id: 'ST-007', name: 'Disposables Store', type: 'Non-Food Items', location: 'First Floor' },
  { id: 'ST-008', name: 'Cleaning Supplies Store', type: 'Housekeeping', location: 'First Floor - Room A' },
  { id: 'ST-009', name: 'Linen Store', type: 'Textile Storage', location: 'First Floor - Room B' },
  { id: 'ST-010', name: 'Equipment Store', type: 'Equipment Storage', location: 'Basement - Room A' },
];

// Inventory Items with Stock Levels
export const inventoryStock = [
  {
    itemId: 'INV-001',
    itemName: 'Chicken (Fresh)',
    category: 'Meat & Poultry',
    unit: 'kg',
    stockByLocation: [
      { storeId: 'ST-001', storeName: 'Main Store', quantity: 50, minLevel: 30, maxLevel: 200 },
      { storeId: 'ST-002', storeName: 'Banquet Kitchen Store', quantity: 80, minLevel: 50, maxLevel: 150 },
      { storeId: 'ST-003', storeName: 'Restaurant Kitchen Store', quantity: 25, minLevel: 20, maxLevel: 80 },
      { storeId: 'ST-004', storeName: 'Cold Storage', quantity: 100, minLevel: 50, maxLevel: 300 },
    ],
    totalStock: 255,
    lastPurchaseRate: 450,
    averageRate: 445,
    reorderLevel: 100,
    status: 'adequate',
  },
  {
    itemId: 'INV-002',
    itemName: 'Mutton (Boneless)',
    category: 'Meat & Poultry',
    unit: 'kg',
    stockByLocation: [
      { storeId: 'ST-001', storeName: 'Main Store', quantity: 30, minLevel: 20, maxLevel: 100 },
      { storeId: 'ST-002', storeName: 'Banquet Kitchen Store', quantity: 60, minLevel: 40, maxLevel: 120 },
      { storeId: 'ST-004', storeName: 'Cold Storage', quantity: 50, minLevel: 30, maxLevel: 150 },
    ],
    totalStock: 140,
    lastPurchaseRate: 1200,
    averageRate: 1180,
    reorderLevel: 80,
    status: 'adequate',
  },
  {
    itemId: 'INV-003',
    itemName: 'Basmati Rice',
    category: 'Dry Goods',
    unit: 'kg',
    stockByLocation: [
      { storeId: 'ST-001', storeName: 'Main Store', quantity: 200, minLevel: 100, maxLevel: 500 },
      { storeId: 'ST-002', storeName: 'Banquet Kitchen Store', quantity: 150, minLevel: 100, maxLevel: 300 },
      { storeId: 'ST-003', storeName: 'Restaurant Kitchen Store', quantity: 80, minLevel: 50, maxLevel: 200 },
      { storeId: 'ST-005', storeName: 'Dry Goods Store', quantity: 300, minLevel: 200, maxLevel: 800 },
    ],
    totalStock: 730,
    lastPurchaseRate: 180,
    averageRate: 175,
    reorderLevel: 300,
    status: 'adequate',
  },
  {
    itemId: 'INV-004',
    itemName: 'Tomatoes',
    category: 'Vegetables',
    unit: 'kg',
    stockByLocation: [
      { storeId: 'ST-001', storeName: 'Main Store', quantity: 15, minLevel: 20, maxLevel: 100 },
      { storeId: 'ST-002', storeName: 'Banquet Kitchen Store', quantity: 10, minLevel: 15, maxLevel: 80 },
      { storeId: 'ST-003', storeName: 'Restaurant Kitchen Store', quantity: 8, minLevel: 10, maxLevel: 50 },
    ],
    totalStock: 33,
    lastPurchaseRate: 80,
    averageRate: 85,
    reorderLevel: 50,
    status: 'low', // Below reorder level!
  },
];

// Stock Movements (Auto-Issuance from Main Store to Production Stores)
export const stockMovements = [
  {
    id: 'SM-2025-001',
    movementDate: new Date(2025, 0, 14),
    movementType: 'Auto-Issue',
    fromStore: 'ST-001 - Main Store',
    toStore: 'ST-002 - Banquet Kitchen Store',
    reason: 'Production requirement for BK-2025-001',
    items: [
      { itemName: 'Chicken (Fresh)', quantity: 125, unit: 'kg' },
      { itemName: 'Mutton (Boneless)', quantity: 100, unit: 'kg' },
    ],
    issuedBy: 'System - Auto Issue',
    receivedBy: 'Chef Imran',
  },
  {
    id: 'SM-2025-002',
    movementDate: new Date(2025, 0, 13),
    movementType: 'Manual Transfer',
    fromStore: 'ST-005 - Dry Goods Store',
    toStore: 'ST-002 - Banquet Kitchen Store',
    reason: 'Kitchen requested extra rice',
    items: [
      { itemName: 'Basmati Rice', quantity: 50, unit: 'kg' },
    ],
    issuedBy: 'Store Keeper',
    receivedBy: 'Chef Imran',
  },
];

// =============================================================================
// 5. ACCOUNTS & FINANCE DATA
// =============================================================================

// Chart of Accounts (Simplified)
export const chartOfAccounts = [
  // Assets
  { accountCode: '1000', accountName: 'Cash in Hand', type: 'Asset', category: 'Current Assets' },
  { accountCode: '1010', accountName: 'Bank Account - HBL', type: 'Asset', category: 'Current Assets' },
  { accountCode: '1020', accountName: 'Bank Account - MCB', type: 'Asset', category: 'Current Assets' },
  { accountCode: '1100', accountName: 'Inventory - Main Store', type: 'Asset', category: 'Current Assets' },
  { accountCode: '1200', accountName: 'Accounts Receivable', type: 'Asset', category: 'Current Assets' },
  
  // Liabilities
  { accountCode: '2000', accountName: 'Accounts Payable', type: 'Liability', category: 'Current Liabilities' },
  { accountCode: '2100', accountName: 'Vendor Payables', type: 'Liability', category: 'Current Liabilities' },
  { accountCode: '2200', accountName: 'Advance from Customers', type: 'Liability', category: 'Current Liabilities' },
  
  // Revenue
  { accountCode: '4000', accountName: 'Banquet Revenue', type: 'Revenue', category: 'Operating Revenue' },
  { accountCode: '4100', accountName: 'Restaurant Revenue', type: 'Revenue', category: 'Operating Revenue' },
  
  // Expenses
  { accountCode: '5000', accountName: 'Food Cost', type: 'Expense', category: 'Cost of Goods Sold' },
  { accountCode: '5100', accountName: 'Kitchen Supplies', type: 'Expense', category: 'Operating Expenses' },
  { accountCode: '5200', accountName: 'Staff Salaries', type: 'Expense', category: 'Operating Expenses' },
  { accountCode: '5300', accountName: 'Utilities', type: 'Expense', category: 'Operating Expenses' },
];

// Journal Entries (Double Entry Accounting)
export const journalEntries = [
  {
    id: 'JE-2025-001',
    date: new Date(2024, 11, 1),
    reference: 'BK-2025-001 - Advance Payment',
    description: 'Advance received for Ahmed Khan wedding booking',
    entries: [
      { accountCode: '1000', accountName: 'Cash in Hand', debit: 500000, credit: 0 },
      { accountCode: '2200', accountName: 'Advance from Customers', debit: 0, credit: 500000 },
    ],
    totalDebit: 500000,
    totalCredit: 500000,
    isBalanced: true,
    enteredBy: 'Accounts Manager',
  },
  {
    id: 'JE-2025-002',
    date: new Date(2025, 0, 14),
    reference: 'PO-2025-001 - Purchase Payment',
    description: 'Payment to Al-Madina Meat Shop for meat purchase',
    entries: [
      { accountCode: '1100', accountName: 'Inventory - Main Store', debit: 187500, credit: 0 },
      { accountCode: '1000', accountName: 'Cash in Hand', debit: 0, credit: 187500 },
    ],
    totalDebit: 187500,
    totalCredit: 187500,
    isBalanced: true,
    enteredBy: 'Accounts Manager',
  },
  {
    id: 'JE-2025-003',
    date: new Date(2025, 0, 15),
    reference: 'BK-2025-001 - Event Revenue',
    description: 'Revenue recognition for Ahmed Khan wedding event',
    entries: [
      { accountCode: '1200', accountName: 'Accounts Receivable', debit: 1500000, credit: 0 },
      { accountCode: '4000', accountName: 'Banquet Revenue', debit: 0, credit: 1500000 },
    ],
    totalDebit: 1500000,
    totalCredit: 1500000,
    isBalanced: true,
    enteredBy: 'Accounts Manager',
  },
];

// Financial Summary
export const financialSummary = {
  currentMonth: {
    month: 'January 2025',
    totalRevenue: 1500000,
    totalExpenses: 687500,
    netProfit: 812500,
    totalBookings: 5,
    confirmedBookings: 3,
    tentativeBookings: 2,
    averageBookingValue: 610000,
  },
  cashFlow: {
    cashInHand: 312500,
    bankBalance: 1250000,
    totalReceivable: 750000,
    totalPayable: 125000,
  },
};

// =============================================================================
// 6. USER MANAGEMENT & PERMISSIONS
// =============================================================================

export const users = [
  {
    id: 'USER-001',
    name: 'Ali Raza',
    role: 'front-office',
    email: 'ali.raza@banquet.com',
    phone: '+92 300 1111111',
    permissions: ['view-calendar', 'create-booking', 'edit-booking', 'view-payments', 'record-payment'],
    isActive: true,
  },
  {
    id: 'USER-002',
    name: 'Chef Imran',
    role: 'banquet-chef',
    email: 'imran.chef@banquet.com',
    phone: '+92 321 2222222',
    permissions: ['view-production-orders', 'manage-banquet-kitchen', 'view-inventory', 'request-stock'],
    isActive: true,
  },
  {
    id: 'USER-003',
    name: 'Chef Kamran',
    role: 'restaurant-chef',
    email: 'kamran.chef@banquet.com',
    phone: '+92 333 3333333',
    permissions: ['view-restaurant-orders', 'manage-restaurant-kitchen', 'view-inventory'],
    isActive: true,
  },
  {
    id: 'USER-004',
    name: 'Fatima Sheikh',
    role: 'accounts',
    email: 'fatima.accounts@banquet.com',
    phone: '+92 345 4444444',
    permissions: ['view-all-finances', 'create-journal-entries', 'manage-vendors', 'approve-payments'],
    isActive: true,
  },
  {
    id: 'USER-005',
    name: 'Ahmed Khan',
    role: 'general-manager',
    email: 'ahmed.gm@banquet.com',
    phone: '+92 300 5555555',
    permissions: ['all'],
    isActive: true,
  },
];

// =============================================================================
// SYSTEM FLOW EXPLANATION
// =============================================================================

export const systemFlowGuide = {
  title: 'Complete System Data Flow',
  steps: [
    {
      step: 1,
      module: 'Inquiry Follow-ups',
      action: 'Create Booking',
      description: 'Customer calls, front office creates a booking (Confirmed or Tentative)',
      dataCreated: 'Booking record with customer details, event details, and financial terms',
      involvedUsers: ['Front Office Staff'],
    },
    {
      step: 2,
      module: 'Inquiry Follow-ups',
      action: 'Payment Recording',
      description: 'Front office records advance and subsequent payments',
      dataCreated: 'Payment records linked to booking, accounting journal entries',
      involvedUsers: ['Front Office Staff', 'Accounts Team'],
    },
    {
      step: 3,
      module: 'Banquet Kitchen Management',
      action: 'Production Planning',
      description: 'Banquet Chef creates production orders based on confirmed bookings',
      dataCreated: 'Production orders with dish quantities and ingredient requirements',
      involvedUsers: ['Banquet Chef'],
    },
    {
      step: 4,
      module: 'Procurement & Vendor Management',
      action: 'Purchase Ingredients',
      description: 'Procurement team creates purchase orders to vendors based on production needs',
      dataCreated: 'Purchase orders, vendor invoices',
      involvedUsers: ['Procurement Manager', 'Vendors'],
    },
    {
      step: 5,
      module: 'Inventory Management',
      action: 'Receive Stock',
      description: 'Goods received in Main Store, stock levels updated automatically',
      dataCreated: 'Goods Receipt Notes (GRN), stock entries in Main Store',
      involvedUsers: ['Store Keeper'],
    },
    {
      step: 6,
      module: 'Inventory Management',
      action: 'Auto-Issue to Production',
      description: 'System automatically issues ingredients from Main Store to Banquet Kitchen Store based on production orders',
      dataCreated: 'Stock transfer records, updated stock levels in multiple stores',
      involvedUsers: ['System (Auto)', 'Banquet Chef (Receiver)'],
    },
    {
      step: 7,
      module: 'Banquet Kitchen Production',
      action: 'Cook & Serve',
      description: 'Kitchen team prepares dishes, marks production order as complete',
      dataCreated: 'Production completion records, cost tracking',
      involvedUsers: ['Banquet Chef', 'Kitchen Staff'],
    },
    {
      step: 8,
      module: 'Accounts & Finance',
      action: 'Revenue Recognition',
      description: 'After event completion, revenue is recognized and final payments are recorded',
      dataCreated: 'Revenue journal entries, final payment records, profit/loss calculation',
      involvedUsers: ['Accounts Manager'],
    },
    {
      step: 9,
      module: 'Tentative Follow-Up',
      action: 'Convert or Cancel',
      description: 'Front office follows up on tentative bookings, converts to confirmed or cancels',
      dataCreated: 'Follow-up notes, booking status updates',
      involvedUsers: ['Front Office Staff'],
    },
  ],
  keyInsights: [
    'Each booking in Event Calendar triggers a chain of activities across all modules',
    'Inventory is tracked in 10 different store locations with automatic transfers',
    'Banquet Kitchen and Restaurant Kitchen are completely separate (no data mixing)',
    'All financial transactions follow double-entry accounting principles',
    'Real-time stock tracking prevents shortages and enables timely procurement',
  ],
};

// Export all dummy data
export const allDummyData = {
  bookings: dummyBookings,
  banquetCuisines,
  banquetDishes,
  restaurantCuisines,
  restaurantDishes,
  banquetProductionOrders,
  vendorCategories,
  vendors,
  purchaseOrders,
  storeLocations,
  inventoryStock,
  stockMovements,
  chartOfAccounts,
  journalEntries,
  financialSummary,
  users,
  systemFlowGuide,
};
