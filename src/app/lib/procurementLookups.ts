import { ProcurementLookupState, ProcurementLookupValue } from '../components/kitchen/types';

const now = () => new Date('2024-01-01');

const buildLookup = (id: string, name: string, sortOrder: number): ProcurementLookupValue => ({
  id,
  code: id,
  name,
  status: 'active',
  sortOrder,
  createdBy: 'System',
  createdAt: now(),
  updatedAt: now(),
});

const buildChildLookup = (id: string, name: string, parentId: string, sortOrder: number): ProcurementLookupValue => ({
  ...buildLookup(id, name, sortOrder),
  parentId,
});

export const DEFAULT_PROCUREMENT_LOOKUPS: ProcurementLookupState = {
  vendorTypes: [
    buildLookup('specialist-vendor', 'Specialist Vendor', 10),
    buildLookup('general-supplier-wholesale', 'General Supplier / Wholesale', 20),
    buildLookup('market-vendor', 'Market Vendor', 30),
    buildLookup('distributor', 'Distributor', 40),
    buildLookup('manufacturer', 'Manufacturer', 50),
    buildLookup('other', 'Other', 60),
  ],
  supplyCategories: [
    buildLookup('poultry', 'Poultry', 10),
    buildLookup('meat', 'Meat', 20),
    buildLookup('vegetables-fruit', 'Vegetables & Fruit', 30),
    buildLookup('dairy', 'Dairy', 40),
    buildLookup('dry-goods', 'Dry Goods', 50),
    buildLookup('beverages', 'Beverages', 60),
    buildLookup('packaging', 'Packaging', 70),
    buildLookup('cleaning', 'Cleaning', 80),
    buildLookup('bakery-items', 'Bakery Items', 90),
    buildLookup('seafood', 'Seafood', 100),
    buildLookup('spices', 'Spices', 110),
    buildLookup('ghee-oil', 'Ghee & Oil', 120),
    buildLookup('disposables', 'Disposables', 130),
    buildLookup('other', 'Other', 140),
  ],
  purchaseCategories: [
    buildLookup('fresh-vegetables', 'Fresh Vegetables', 10),
    buildLookup('fresh-fruits', 'Fresh Fruits', 20),
    buildLookup('poultry', 'Poultry', 30),
    buildLookup('meat', 'Meat', 40),
    buildLookup('seafood', 'Seafood', 50),
    buildLookup('dairy', 'Dairy', 60),
    buildLookup('dry-grocery', 'Dry Grocery', 70),
    buildLookup('beverages', 'Beverages', 80),
    buildLookup('bakery', 'Bakery', 90),
    buildLookup('packaging', 'Packaging', 100),
    buildLookup('cleaning-supplies', 'Cleaning Supplies', 110),
    buildLookup('other', 'Other', 120),
  ],
  purchaseSubCategories: [
    buildChildLookup('leafy-vegetables', 'Leafy Vegetables', 'fresh-vegetables', 10),
    buildChildLookup('root-vegetables', 'Root Vegetables', 'fresh-vegetables', 20),
    buildChildLookup('fresh-herbs', 'Fresh Herbs', 'fresh-vegetables', 30),
    buildChildLookup('seasonal-fruits', 'Seasonal Fruits', 'fresh-fruits', 10),
    buildChildLookup('citrus-fruits', 'Citrus Fruits', 'fresh-fruits', 20),
    buildChildLookup('berries-grapes', 'Berries & Grapes', 'fresh-fruits', 30),
    buildChildLookup('whole-bird', 'Whole Bird', 'poultry', 10),
    buildChildLookup('cut-portions', 'Cut Portions', 'poultry', 20),
    buildChildLookup('eggs', 'Eggs', 'poultry', 30),
    buildChildLookup('beef', 'Beef', 'meat', 10),
    buildChildLookup('mutton', 'Mutton', 'meat', 20),
    buildChildLookup('minced-meat', 'Minced Meat', 'meat', 30),
    buildChildLookup('fish', 'Fish', 'seafood', 10),
    buildChildLookup('prawns', 'Prawns', 'seafood', 20),
    buildChildLookup('shellfish', 'Shellfish', 'seafood', 30),
    buildChildLookup('milk', 'Milk', 'dairy', 10),
    buildChildLookup('cheese', 'Cheese', 'dairy', 20),
    buildChildLookup('cream-butter', 'Cream & Butter', 'dairy', 30),
    buildChildLookup('rice-pulses', 'Rice & Pulses', 'dry-grocery', 10),
    buildChildLookup('flour-grains', 'Flour & Grains', 'dry-grocery', 20),
    buildChildLookup('spices-condiments', 'Spices & Condiments', 'dry-grocery', 30),
    buildChildLookup('tea-coffee', 'Tea & Coffee', 'beverages', 10),
    buildChildLookup('juices-mixers', 'Juices & Mixers', 'beverages', 20),
    buildChildLookup('soft-drinks-water', 'Soft Drinks & Water', 'beverages', 30),
    buildChildLookup('bread-buns', 'Bread & Buns', 'bakery', 10),
    buildChildLookup('dessert-bases', 'Dessert Bases', 'bakery', 20),
    buildChildLookup('baking-ingredients', 'Baking Ingredients', 'bakery', 30),
    buildChildLookup('trays-foil', 'Trays & Foil', 'packaging', 10),
    buildChildLookup('cups-bottles', 'Cups & Bottles', 'packaging', 20),
    buildChildLookup('labels-seals', 'Labels & Seals', 'packaging', 30),
    buildChildLookup('detergent', 'Detergent', 'cleaning-supplies', 10),
    buildChildLookup('sanitizer', 'Sanitizer', 'cleaning-supplies', 20),
    buildChildLookup('cleaning-tools', 'Cleaning Tools', 'cleaning-supplies', 30),
    buildChildLookup('general-other', 'General Other', 'other', 10),
  ],
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `lookup-${Date.now()}`;

const mergeLookupList = (
  incoming: ProcurementLookupValue[] | undefined,
  defaults: ProcurementLookupValue[],
): ProcurementLookupValue[] => {
  const byId = new Map<string, ProcurementLookupValue>();

  defaults.forEach((entry) => byId.set(entry.id, entry));
  (incoming || []).forEach((entry) => {
    if (!entry?.id) {
      return;
    }

    byId.set(entry.id, {
      ...entry,
      code: entry.code || entry.id,
      name: entry.name || entry.id.replace(/-/g, ' '),
      parentId: entry.parentId,
      status: entry.status || 'active',
      createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
      updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : new Date(),
    });
  });

  return Array.from(byId.values()).sort((left, right) => {
    const leftOrder = left.sortOrder ?? 999;
    const rightOrder = right.sortOrder ?? 999;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.name.localeCompare(right.name);
  });
};

export const normalizeProcurementLookups = (
  value?: Partial<ProcurementLookupState>,
): ProcurementLookupState => ({
  vendorTypes: mergeLookupList(value?.vendorTypes, DEFAULT_PROCUREMENT_LOOKUPS.vendorTypes),
  supplyCategories: mergeLookupList(value?.supplyCategories, DEFAULT_PROCUREMENT_LOOKUPS.supplyCategories),
  purchaseCategories: mergeLookupList(value?.purchaseCategories, DEFAULT_PROCUREMENT_LOOKUPS.purchaseCategories),
  purchaseSubCategories: mergeLookupList(value?.purchaseSubCategories, DEFAULT_PROCUREMENT_LOOKUPS.purchaseSubCategories),
});

export const getActiveLookupValues = (values: ProcurementLookupValue[] = []) =>
  values.filter((value) => value.status !== 'inactive');

export const getLookupName = (values: ProcurementLookupValue[] = [], id?: string) => {
  if (!id) {
    return '-';
  }

  return values.find((value) => value.id === id)?.name || id.replace(/-/g, ' ');
};

export const createProcurementLookupValue = (
  name: string,
  existingValues: ProcurementLookupValue[],
  userName: string,
): ProcurementLookupValue | null => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return null;
  }

  const baseId = slugify(trimmedName);
  const existingIds = new Set(existingValues.map((entry) => entry.id));
  let id = baseId;
  let counter = 2;

  while (existingIds.has(id)) {
    id = `${baseId}-${counter}`;
    counter += 1;
  }

  const createdAt = new Date();
  return {
    id,
    code: id,
    name: trimmedName,
    status: 'active',
    sortOrder: existingValues.length * 10 + 10,
    createdBy: userName,
    createdAt,
    updatedAt: createdAt,
  };
};
