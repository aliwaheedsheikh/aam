import {
  ProductionCostMethod,
  ProductionCostMethodAppliesTo,
  ProductionCostMethodCalculationType,
  ProductionCostMethodCostType,
  ProductionCostMethodInputRequired,
  RecipeCostLine,
  RecipeCostLineBasis,
  RecipeCostLineCategory,
} from '../components/kitchen/types';

const METHOD_REFERENCE_UNITS: Record<ProductionCostMethodCalculationType, string> = {
  fixed: '',
  'per-batch': 'batch',
  'per-daig': 'daig',
  'per-kg-output': 'kg',
  'per-piece-output': 'pcs',
  'per-guest': 'guest',
  'per-hour': 'hour',
  'per-person': 'person',
  'per-purchase-kg': 'kg',
  'per-event': 'event',
};

const METHOD_FORMULAS: Record<ProductionCostMethodCalculationType, string> = {
  fixed: 'Total = Amount',
  'per-batch': 'Total = Rate x Quantity',
  'per-daig': 'Total = Rate x Quantity',
  'per-kg-output': 'Total = Rate x Quantity',
  'per-piece-output': 'Total = Rate x Quantity',
  'per-guest': 'Total = Rate x Quantity',
  'per-hour': 'Total = Rate x Quantity',
  'per-person': 'Total = Rate x Quantity',
  'per-purchase-kg': 'Total = Rate x Quantity',
  'per-event': 'Total = Amount',
};

const LEGACY_BASIS_LABELS: Partial<Record<RecipeCostLineBasis, string>> = {
  'item-usage': 'Legacy Item Usage',
  'fixed-daig-capacity': 'Legacy Per Batch',
  'per-kg-yield': 'Legacy Per Kg Output',
  'per-kg-input': 'Legacy Per Purchase Kg',
  'per-head': 'Legacy Per Person',
};

const LEGACY_METHOD_PREFIX = 'legacy-';

const DEFAULT_METHOD_SEED: Array<{
  methodCode: string;
  methodName: string;
  costType: ProductionCostMethodCostType;
  calculationType: ProductionCostMethodCalculationType;
  consumesInventory: boolean;
}> = [
  { methodCode: 'cook-charge', methodName: 'Cook Charge', costType: 'labor', calculationType: 'per-daig', consumesInventory: false },
  { methodCode: 'labor-per-hour', methodName: 'Labor Per Hour', costType: 'labor', calculationType: 'per-hour', consumesInventory: false },
  { methodCode: 'lpg', methodName: 'LPG', costType: 'utility', calculationType: 'per-purchase-kg', consumesInventory: true },
  { methodCode: 'utility-fixed', methodName: 'Utility Fixed Cost', costType: 'utility', calculationType: 'fixed', consumesInventory: false },
  { methodCode: 'foil-box', methodName: 'Foil Box', costType: 'packaging', calculationType: 'per-piece-output', consumesInventory: true },
  { methodCode: 'packaging-per-batch', methodName: 'Packaging Per Batch', costType: 'packaging', calculationType: 'per-batch', consumesInventory: true },
  { methodCode: 'cleaning-chemical', methodName: 'Cleaning Chemical', costType: 'other', calculationType: 'per-purchase-kg', consumesInventory: true },
  { methodCode: 'other-fixed', methodName: 'Other Fixed Production Cost', costType: 'other', calculationType: 'fixed', consumesInventory: false },
];

export const productionCostMethodCalculationTypeOptions: Array<{
  value: ProductionCostMethodCalculationType;
  label: string;
}> = [
  { value: 'fixed', label: 'Fixed Cost' },
  { value: 'per-batch', label: 'Per Batch' },
  { value: 'per-daig', label: 'Per Daig' },
  { value: 'per-kg-output', label: 'Per Kg Output' },
  { value: 'per-piece-output', label: 'Per Piece' },
  { value: 'per-guest', label: 'Per Guest' },
  { value: 'per-hour', label: 'Per Hour' },
  { value: 'per-person', label: 'Per Person' },
  { value: 'per-purchase-kg', label: 'Per Purchase Kg' },
  { value: 'per-event', label: 'Per Event' },
];

export const productionCostMethodCostTypeOptions: Array<{
  value: ProductionCostMethodCostType;
  label: string;
}> = [
  { value: 'labor', label: 'Labor' },
  { value: 'utility', label: 'Utilities' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'other', label: 'Other' },
];

export const productionCostMethodAppliesToOptions: Array<{
  value: ProductionCostMethodAppliesTo;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'labor', label: 'Labor' },
  { value: 'utility', label: 'Utilities' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'other', label: 'Other' },
];

export const slugifyProductionCostMethodCode = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'method';

export const normalizeRecipeCostLineBasis = (
  basis?: RecipeCostLineBasis | ProductionCostMethodCalculationType,
): RecipeCostLineBasis | ProductionCostMethodCalculationType => {
  if (basis === 'fixed-daig-capacity') {
    return 'per-batch';
  }

  if (basis === 'per-kg-yield') {
    return 'per-kg-output';
  }

  if (basis === 'per-head') {
    return 'per-person';
  }

  if (basis === 'per-kg-input') {
    return 'per-purchase-kg';
  }

  return basis || 'fixed';
};

const getBaseInputRequirements = (calculationType: ProductionCostMethodCalculationType): ProductionCostMethodInputRequired[] => {
  switch (calculationType) {
    case 'fixed':
    case 'per-event':
      return ['amount'];
    case 'per-kg-output':
    case 'per-piece-output':
    case 'per-guest':
      return ['rate', 'quantity', 'recipe-yield'];
    default:
      return ['rate', 'quantity'];
  }
};

const inferMethodCostType = (
  method?: Partial<ProductionCostMethod>,
  fallbackCategory?: RecipeCostLineCategory,
): ProductionCostMethodCostType | undefined => {
  if (method?.costType) {
    return method.costType;
  }

  if (method?.appliesTo && method.appliesTo !== 'all') {
    return method.appliesTo;
  }

  return fallbackCategory;
};

const inferConsumesInventory = ({
  method,
  fallbackBasis,
  fallbackCategory,
}: {
  method?: Partial<ProductionCostMethod>;
  fallbackBasis?: RecipeCostLineBasis | ProductionCostMethodCalculationType;
  fallbackCategory?: RecipeCostLineCategory;
}) => {
  if (typeof method?.consumesInventory === 'boolean') {
    return method.consumesInventory;
  }

  if (method?.inputRequired?.includes('ingredient-reference')) {
    return true;
  }

  const normalizedBasis = normalizeRecipeCostLineBasis(
    fallbackBasis || method?.calculationType,
  ) as ProductionCostMethodCalculationType | RecipeCostLineBasis;

  if (normalizedBasis === 'item-usage' || normalizedBasis === 'per-purchase-kg') {
    return true;
  }

  if (normalizedBasis === 'per-kg-input' && fallbackCategory && fallbackCategory !== 'labor') {
    return true;
  }

  return false;
};

export const getProductionCostMethodReferenceUnit = (calculationType: ProductionCostMethodCalculationType) =>
  METHOD_REFERENCE_UNITS[calculationType];

export const getProductionCostMethodInputRequired = (
  calculationType: ProductionCostMethodCalculationType,
  consumesInventory = false,
) => {
  const required = [...getBaseInputRequirements(calculationType)];
  if (consumesInventory && !required.includes('ingredient-reference')) {
    required.push('ingredient-reference');
  }
  return required;
};

export const getProductionCostMethodLabel = (calculationType: ProductionCostMethodCalculationType) =>
  productionCostMethodCalculationTypeOptions.find((option) => option.value === calculationType)?.label ||
  calculationType.replace(/-/g, ' ');

export const getProductionCostMethodAppliesToLabel = (appliesTo?: ProductionCostMethodAppliesTo) =>
  productionCostMethodAppliesToOptions.find((option) => option.value === appliesTo)?.label ||
  String(appliesTo || 'All').replace(/-/g, ' ');

export const getProductionCostMethodCostTypeLabel = (
  costType?: ProductionCostMethodCostType | ProductionCostMethodAppliesTo,
) =>
  productionCostMethodCostTypeOptions.find((option) => option.value === costType)?.label ||
  String(costType || 'Unassigned').replace(/-/g, ' ');

export const normalizeProductionCostMethod = (
  method: ProductionCostMethod,
  fallbackCategory?: RecipeCostLineCategory,
): ProductionCostMethod => {
  const costType = inferMethodCostType(method, fallbackCategory);
  const consumesInventory = inferConsumesInventory({
    method,
    fallbackBasis: method.calculationType,
    fallbackCategory: costType,
  });
  const calculationType = method.calculationType || 'fixed';

  return {
    ...method,
    costType,
    appliesTo: method.appliesTo || costType || 'all',
    calculationType,
    consumesInventory,
    referenceUnit: method.referenceUnit ?? getProductionCostMethodReferenceUnit(calculationType),
    inputRequired: getProductionCostMethodInputRequired(calculationType, consumesInventory),
    sortOrder: method.sortOrder ?? Number.MAX_SAFE_INTEGER,
  };
};

export const getProductionCostMethodFormulaDescription = (method?: ProductionCostMethod) => {
  if (!method) {
    return 'Select method';
  }

  const normalizedMethod = normalizeProductionCostMethod(method);
  return METHOD_FORMULAS[normalizedMethod.calculationType] || 'Total = Rate x Quantity';
};

export const getProductionCostMethodInputSummary = (method?: ProductionCostMethod) => {
  if (!method) {
    return 'Select method';
  }

  return normalizeProductionCostMethod(method).inputRequired.map((entry) => entry.replace(/-/g, ' ')).join(', ');
};

export const getProductionCostMethodInventoryLabel = (method?: ProductionCostMethod) =>
  normalizeProductionCostMethod(method || ({} as ProductionCostMethod)).consumesInventory ? 'Purchase Item' : 'No Inventory';

export const getProductionCostMethodRecipeBehaviorPreview = (method?: ProductionCostMethod) => {
  if (!method) {
    return 'Select method';
  }

  const normalizedMethod = normalizeProductionCostMethod(method);
  return normalizedMethod.consumesInventory ? 'Link item + Qty' : 'Rate x Qty';
};

export const shouldProductionCostMethodShowReference = (
  method?: ProductionCostMethod,
  fallbackBasis?: RecipeCostLineBasis | ProductionCostMethodCalculationType,
  fallbackCategory?: RecipeCostLineCategory,
) => {
  if (method) {
    return normalizeProductionCostMethod(method, fallbackCategory).consumesInventory;
  }

  const normalizedBasis = normalizeRecipeCostLineBasis(fallbackBasis);
  if (normalizedBasis === 'item-usage' || normalizedBasis === 'per-purchase-kg') {
    return true;
  }

  return normalizedBasis === 'per-kg-input' && fallbackCategory !== 'labor';
};

export const shouldProductionCostMethodShowQuantity = (
  method?: ProductionCostMethod,
  fallbackBasis?: RecipeCostLineBasis | ProductionCostMethodCalculationType,
) => {
  const calculationType =
    method?.calculationType ||
    (normalizeRecipeCostLineBasis(fallbackBasis) as ProductionCostMethodCalculationType | undefined);

  return calculationType !== 'fixed' && calculationType !== 'per-event';
};

export const isProductionCostMethodQuantityEditable = (
  method?: ProductionCostMethod,
  fallbackBasis?: RecipeCostLineBasis | ProductionCostMethodCalculationType,
) => shouldProductionCostMethodShowQuantity(method, fallbackBasis);

export const createDefaultProductionCostMethods = (
  createdBy = 'System',
  createdAt = new Date('2024-01-01T00:00:00.000Z'),
): ProductionCostMethod[] =>
  DEFAULT_METHOD_SEED.map((entry, index) =>
    normalizeProductionCostMethod({
      id: `production-cost-method-${entry.methodCode}`,
      methodName: entry.methodName,
      methodCode: entry.methodCode,
      appliesTo: entry.costType,
      costType: entry.costType,
      calculationType: entry.calculationType,
      consumesInventory: entry.consumesInventory,
      referenceUnit: getProductionCostMethodReferenceUnit(entry.calculationType),
      inputRequired: getProductionCostMethodInputRequired(entry.calculationType, entry.consumesInventory),
      status: 'active',
      sortOrder: index + 1,
      createdBy,
      createdAt,
      updatedAt: createdAt,
    }),
  );

export const shouldMethodApplyToCategory = (
  method: ProductionCostMethod,
  category: RecipeCostLineCategory,
) => {
  const normalizedMethod = normalizeProductionCostMethod(method);
  if (normalizedMethod.costType) {
    return normalizedMethod.costType === category;
  }

  if (normalizedMethod.appliesTo && normalizedMethod.appliesTo !== 'all') {
    return normalizedMethod.appliesTo === category;
  }

  return false;
};

const getCompatibilityMethod = (
  basis?: RecipeCostLineBasis,
  category?: RecipeCostLineCategory,
): ProductionCostMethod | undefined => {
  if (!basis) {
    return undefined;
  }

  const normalizedBasis = normalizeRecipeCostLineBasis(basis) as ProductionCostMethodCalculationType;
  const compatibilityLabel = LEGACY_BASIS_LABELS[basis];
  if (!compatibilityLabel) {
    return undefined;
  }

  return normalizeProductionCostMethod({
    id: `${LEGACY_METHOD_PREFIX}${basis}`,
    methodName: compatibilityLabel,
    methodCode: `${LEGACY_METHOD_PREFIX}${basis}`,
    appliesTo: category || 'all',
    costType: category,
    calculationType: normalizedBasis,
    consumesInventory: inferConsumesInventory({
      fallbackBasis: basis,
      fallbackCategory: category,
    }),
    referenceUnit: getProductionCostMethodReferenceUnit(normalizedBasis),
    inputRequired: getProductionCostMethodInputRequired(
      normalizedBasis,
      inferConsumesInventory({
        fallbackBasis: basis,
        fallbackCategory: category,
      }),
    ),
    status: 'inactive',
    sortOrder: Number.MAX_SAFE_INTEGER,
    createdBy: 'System',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  }, category);
};

export const resolveProductionCostMethodFromLine = (
  line: Pick<RecipeCostLine, 'calculationMethodId' | 'calculationBasis' | 'category'>,
  methods: ProductionCostMethod[],
) => {
  if (line.calculationMethodId) {
    const matchedById = methods.find((method) => method.id === line.calculationMethodId);
    if (matchedById) {
      return normalizeProductionCostMethod(matchedById, line.category);
    }
  }

  const normalizedBasis = normalizeRecipeCostLineBasis(line.calculationBasis) as ProductionCostMethodCalculationType;
  const matchedByType = methods.find(
    (method) =>
      normalizeProductionCostMethod(method, line.category).calculationType === normalizedBasis &&
      shouldMethodApplyToCategory(method, line.category),
  );
  if (matchedByType) {
    return normalizeProductionCostMethod(matchedByType, line.category);
  }

  return getCompatibilityMethod(line.calculationBasis, line.category);
};

export const getProductionCostMethodOptionsForCategory = (
  methods: ProductionCostMethod[],
  category: RecipeCostLineCategory,
  selectedLine?: Pick<RecipeCostLine, 'calculationMethodId' | 'calculationBasis' | 'category'>,
) => {
  const activeMethods = methods
    .map((method) => normalizeProductionCostMethod(method, category))
    .filter((method) => method.status === 'active' && shouldMethodApplyToCategory(method, category))
    .sort(
      (left, right) =>
        (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
        left.methodName.localeCompare(right.methodName),
    );
  const selectedMethod = selectedLine ? resolveProductionCostMethodFromLine(selectedLine, methods) : undefined;

  if (!selectedMethod || activeMethods.some((method) => method.id === selectedMethod.id)) {
    return activeMethods;
  }

  return [selectedMethod, ...activeMethods];
};

export const getRecipeCostLineDefaultMethod = (
  category: RecipeCostLineCategory,
  methods: ProductionCostMethod[],
) =>
  getProductionCostMethodOptionsForCategory(methods, category).find(
    (method) => method.calculationType === 'fixed',
  ) || getProductionCostMethodOptionsForCategory(methods, category)[0];

export const getProductionCostMethodRateLabel = (method?: ProductionCostMethod) => {
  if (!method) {
    return 'Rate';
  }

  switch (normalizeProductionCostMethod(method).calculationType) {
    case 'fixed':
      return 'Amount';
    case 'per-batch':
      return 'Rs / Batch';
    case 'per-daig':
      return 'Rs / Daig';
    case 'per-kg-output':
      return 'Rs / Kg';
    case 'per-piece-output':
      return 'Rs / Piece';
    case 'per-guest':
      return 'Rs / Guest';
    case 'per-hour':
      return 'Rs / Hour';
    case 'per-person':
      return 'Rs / Person';
    case 'per-purchase-kg':
      return 'Rs / Kg';
    case 'per-event':
      return 'Amount / Event';
    default:
      return 'Rate';
  }
};

export const getProductionCostMethodQuantityLabel = (method?: ProductionCostMethod) => {
  if (!method) {
    return 'Quantity';
  }

  switch (normalizeProductionCostMethod(method).calculationType) {
    case 'fixed':
    case 'per-event':
      return '-';
    case 'per-batch':
      return 'Batch Count';
    case 'per-daig':
      return 'Daig Count';
    case 'per-kg-output':
      return 'Output Kg';
    case 'per-piece-output':
      return 'Pieces';
    case 'per-guest':
      return 'Guests';
    case 'per-hour':
      return 'Hours';
    case 'per-person':
      return 'Persons';
    case 'per-purchase-kg':
      return 'Purchase Kg';
    default:
      return 'Quantity';
  }
};

export const getDefaultProductionCostMethodUnit = (
  method: ProductionCostMethod | undefined,
  yieldUnitId: string,
) => {
  if (!method) {
    return '';
  }

  const normalizedMethod = normalizeProductionCostMethod(method);
  const configuredReferenceUnit = normalizedMethod.referenceUnit?.trim();
  if (configuredReferenceUnit) {
    return configuredReferenceUnit;
  }

  switch (normalizedMethod.calculationType) {
    case 'per-kg-output':
    case 'per-purchase-kg':
      return 'kg';
    case 'per-piece-output':
      return 'pcs';
    case 'per-guest':
      return 'guest';
    case 'per-hour':
      return 'hour';
    case 'per-person':
      return 'person';
    case 'per-daig':
      return 'daig';
    case 'per-batch':
      return 'batch';
    case 'per-event':
      return 'event';
    default:
      return normalizedMethod.consumesInventory ? yieldUnitId || '' : '';
  }
};

export const isProductionCostMethodDangerousChange = (
  currentMethod: ProductionCostMethod,
  nextMethod: ProductionCostMethod,
) => {
  const current = normalizeProductionCostMethod(currentMethod);
  const next = normalizeProductionCostMethod(nextMethod);

  return (
    current.costType !== next.costType ||
    current.calculationType !== next.calculationType ||
    current.consumesInventory !== next.consumesInventory
  );
};
