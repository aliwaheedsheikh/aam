import {
  type ProcurementLookupState,
  type PurchaseItem,
  type Vendor,
  type VendorCategoryAssignment,
} from '../components/kitchen/types';

const LEGACY_SUPPLY_TO_CATEGORY_MAP: Record<string, string[]> = {
  poultry: ['poultry'],
  meat: ['meat'],
  'vegetables-fruit': ['fresh-vegetables', 'fresh-fruits'],
  dairy: ['dairy'],
  'dry-goods': ['dry-grocery'],
  beverages: ['beverages'],
  packaging: ['packaging'],
  cleaning: ['cleaning-supplies'],
  'bakery-items': ['bakery'],
  seafood: ['seafood'],
  spices: ['dry-grocery'],
  'ghee-oil': ['dry-grocery'],
  disposables: ['packaging'],
  other: ['other'],
};

const CATEGORY_TO_LEGACY_SUPPLY_MAP: Record<string, string> = {
  'fresh-vegetables': 'vegetables-fruit',
  'fresh-fruits': 'vegetables-fruit',
  poultry: 'poultry',
  meat: 'meat',
  seafood: 'seafood',
  dairy: 'dairy',
  'dry-grocery': 'dry-goods',
  beverages: 'beverages',
  bakery: 'bakery-items',
  packaging: 'packaging',
  'cleaning-supplies': 'cleaning',
  other: 'other',
};

export const getCanonicalItemCategoryId = (item: PurchaseItem) =>
  item.categoryId || item.purchaseCategoryId || item.category || '';

const uniqueList = <T,>(values: T[]) => Array.from(new Set(values));

const getCategoryAssignmentKey = (assignment: VendorCategoryAssignment) =>
  `${assignment.category}::${assignment.scopeType || 'all_subcategories'}`;

const isKnownPurchaseCategory = (categoryId: string, procurementLookups: ProcurementLookupState) =>
  procurementLookups.purchaseCategories.some((entry) => entry.id === categoryId);

const getValidSubCategoryIds = (
  categoryId: string,
  subCategoryIds: string[] | undefined,
  procurementLookups: ProcurementLookupState,
) => {
  if (!subCategoryIds?.length) {
    return [];
  }

  const validSubCategoryIds = new Set(
    procurementLookups.purchaseSubCategories
      .filter((entry) => entry.parentId === categoryId)
      .map((entry) => entry.id),
  );

  return uniqueList(subCategoryIds.filter((subCategoryId) => validSubCategoryIds.has(subCategoryId)));
};

const expandLegacyCategoryId = (categoryId: string) => LEGACY_SUPPLY_TO_CATEGORY_MAP[categoryId] || [];

const normalizeAssignment = (
  assignment: VendorCategoryAssignment,
  categoryId: string,
  procurementLookups: ProcurementLookupState,
): VendorCategoryAssignment => {
  const scopeType = assignment.scopeType === 'selected_subcategories' ? 'selected_subcategories' : 'all_subcategories';
  const subCategoryIds =
    scopeType === 'selected_subcategories'
      ? getValidSubCategoryIds(categoryId, assignment.subCategoryIds, procurementLookups)
      : [];

  return {
    ...assignment,
    category: categoryId,
    scopeType,
    subCategoryIds,
    isActive: assignment.isActive !== false,
  };
};

export const normalizeVendorCategoryAssignments = (
  vendor: Pick<Vendor, 'vendorCategories' | 'supplyCategoryIds'>,
  procurementLookups: ProcurementLookupState,
): VendorCategoryAssignment[] => {
  const rawAssignments =
    vendor.vendorCategories?.length
      ? vendor.vendorCategories
      : (vendor.supplyCategoryIds || []).map((category) => ({
          category,
          startDate: new Date(),
          isActive: true,
        }));

  const normalizedAssignments = rawAssignments.flatMap((assignment) => {
    const categoryId = String(assignment.category || '').trim();
    if (!categoryId) {
      return [];
    }

    if (isKnownPurchaseCategory(categoryId, procurementLookups)) {
      return [normalizeAssignment(assignment, categoryId, procurementLookups)];
    }

    return expandLegacyCategoryId(categoryId).map((mappedCategoryId) =>
      normalizeAssignment(assignment, mappedCategoryId, procurementLookups),
    );
  });

  const dedupedAssignments = new Map<string, VendorCategoryAssignment>();
  normalizedAssignments.forEach((assignment) => {
    const key = getCategoryAssignmentKey(assignment);
    const existing = dedupedAssignments.get(key);
    if (!existing) {
      dedupedAssignments.set(key, assignment);
      return;
    }

    dedupedAssignments.set(key, {
      ...existing,
      isActive: existing.isActive || assignment.isActive,
      subCategoryIds: uniqueList([...(existing.subCategoryIds || []), ...(assignment.subCategoryIds || [])]),
      startDate: new Date(Math.min(new Date(existing.startDate).getTime(), new Date(assignment.startDate).getTime())),
    });
  });

  return Array.from(dedupedAssignments.values());
};

export const getLegacySupplyCategoryIds = (assignments: VendorCategoryAssignment[]) =>
  uniqueList(
    assignments
      .map((assignment) => CATEGORY_TO_LEGACY_SUPPLY_MAP[assignment.category])
      .filter((categoryId): categoryId is string => Boolean(categoryId)),
  );

export const getLegacySupplyCategoryIdForCategory = (categoryId: string) =>
  CATEGORY_TO_LEGACY_SUPPLY_MAP[categoryId];

export const getVendorSupportMatch = (
  vendor: Pick<Vendor, 'vendorCategories' | 'supplyCategoryIds'>,
  purchaseItem: PurchaseItem,
  procurementLookups: ProcurementLookupState,
) => {
  const categoryId = getCanonicalItemCategoryId(purchaseItem);
  const subCategoryId = purchaseItem.subCategoryId || '';
  const normalizedAssignments = normalizeVendorCategoryAssignments(vendor, procurementLookups).filter(
    (assignment) => assignment.isActive !== false && assignment.category === categoryId,
  );

  const selectedSubCategoryMatch =
    subCategoryId &&
    normalizedAssignments.some(
      (assignment) =>
        assignment.scopeType === 'selected_subcategories' && (assignment.subCategoryIds || []).includes(subCategoryId),
    );

  if (selectedSubCategoryMatch) {
    return { matched: true, matchType: 'category_subcategory' as const };
  }

  const fullCategoryMatch = normalizedAssignments.some(
    (assignment) => assignment.scopeType !== 'selected_subcategories',
  );

  if (fullCategoryMatch) {
    return { matched: true, matchType: 'category_all' as const };
  }

  return { matched: false, matchType: null as const };
};
