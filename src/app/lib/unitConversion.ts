import type { UnitFamily, UnitMaster } from '../components/kitchen/types';

const createSystemUnit = (
  code: string,
  name: string,
  symbol: string,
  family: UnitFamily,
  options: Partial<Omit<UnitMaster, 'id' | 'code' | 'name' | 'symbol' | 'family' | 'status' | 'createdBy' | 'createdAt' | 'updatedAt'>> = {},
): UnitMaster => ({
  id: `unit-${code}`,
  code,
  name,
  symbol,
  family,
  baseUnitCode: options.baseUnitCode ?? code,
  conversionToBase: options.conversionToBase ?? 1,
  allowPurchase: options.allowPurchase ?? false,
  allowIssue: options.allowIssue ?? false,
  allowRecipe: options.allowRecipe ?? false,
  allowYield: options.allowYield ?? false,
  allowSales: options.allowSales ?? false,
  notes: options.notes,
  status: 'active',
  createdBy: 'System',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
});

export const DEFAULT_UNIT_MASTERS: UnitMaster[] = [
  createSystemUnit('gm', 'Gram', 'gm', 'weight', {
    baseUnitCode: 'gm',
    conversionToBase: 1,
    allowIssue: true,
    allowRecipe: true,
    allowYield: true,
  }),
  createSystemUnit('kg', 'Kilogram', 'kg', 'weight', {
    baseUnitCode: 'gm',
    conversionToBase: 1000,
    allowPurchase: true,
    allowIssue: true,
    allowRecipe: true,
    allowYield: true,
  }),
  createSystemUnit('ml', 'Milliliter', 'ml', 'volume', {
    baseUnitCode: 'ml',
    conversionToBase: 1,
    allowIssue: true,
    allowRecipe: true,
    allowYield: true,
  }),
  createSystemUnit('ltr', 'Liter', 'ltr', 'volume', {
    baseUnitCode: 'ml',
    conversionToBase: 1000,
    allowPurchase: true,
    allowIssue: true,
    allowRecipe: true,
    allowYield: true,
  }),
  createSystemUnit('pcs', 'Pieces', 'pcs', 'count', {
    baseUnitCode: 'pcs',
    conversionToBase: 1,
    allowPurchase: true,
    allowIssue: true,
    allowRecipe: true,
    allowYield: true,
  }),
  createSystemUnit('dozen', 'Dozen', 'dozen', 'count', {
    baseUnitCode: 'pcs',
    conversionToBase: 12,
    allowPurchase: true,
    allowIssue: true,
    allowRecipe: true,
    allowYield: true,
  }),
  createSystemUnit('packet', 'Packet', 'pkt', 'package', {
    baseUnitCode: 'packet',
    conversionToBase: 1,
    allowPurchase: true,
    allowIssue: true,
    allowRecipe: true,
    allowYield: true,
  }),
  createSystemUnit('tray', 'Tray', 'tray', 'package', {
    baseUnitCode: 'tray',
    conversionToBase: 1,
    allowPurchase: true,
    allowIssue: true,
    allowRecipe: true,
    allowYield: true,
    allowSales: true,
  }),
  createSystemUnit('bunch', 'Bunch', 'bunch', 'package', {
    baseUnitCode: 'bunch',
    conversionToBase: 1,
    allowPurchase: true,
    allowIssue: true,
    allowRecipe: true,
    allowYield: true,
  }),
  createSystemUnit('plate', 'Plate', 'plate', 'package', {
    baseUnitCode: 'plate',
    conversionToBase: 1,
    allowIssue: true,
    allowRecipe: true,
    allowYield: true,
    allowSales: true,
  }),
  createSystemUnit('per-head', 'Per Head', 'head', 'service', { allowSales: true }),
  createSystemUnit('per-guest', 'Per Guest', 'guest', 'service', { allowSales: true }),
  createSystemUnit('per-portion', 'Per Portion', 'portion', 'service', { allowSales: true }),
  createSystemUnit('per-plate', 'Per Plate', 'plate', 'service', { allowSales: true }),
  createSystemUnit('per-piece', 'Per Piece', 'piece', 'service', { allowSales: true }),
  createSystemUnit('per-bottle', 'Per Bottle', 'bottle', 'service', { allowSales: true }),
  createSystemUnit('per-tray', 'Per Tray', 'tray', 'service', { allowSales: true }),
  createSystemUnit('per-kettle', 'Per Kettle', 'kettle', 'service', { allowSales: true }),
  createSystemUnit('per-kg', 'Per Kilogram', 'kg', 'service', { allowSales: true }),
  createSystemUnit('per-ltr', 'Per Liter', 'ltr', 'service', { allowSales: true }),
  createSystemUnit('fixed-event', 'Fixed Event', 'event', 'service', { allowSales: true }),
];

const unitAliases: Record<string, string> = {
  g: 'gm',
  gram: 'gm',
  grams: 'gm',
  kilogram: 'kg',
  kilograms: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  l: 'ltr',
  liter: 'ltr',
  liters: 'ltr',
  litre: 'ltr',
  litres: 'ltr',
  milliliter: 'ml',
  milliliters: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  pc: 'pcs',
  piece: 'pcs',
  pieces: 'pcs',
  guest: 'per-guest',
  head: 'per-head',
  portion: 'per-portion',
};

export const normalizeUnitCode = (value?: string | null) => {
  const normalized = (value || '').trim().toLowerCase().replace(/\s+/g, '-');
  return unitAliases[normalized] || normalized;
};

export const resolveUnitCatalog = (units?: UnitMaster[]) => (units && units.length > 0 ? units : DEFAULT_UNIT_MASTERS);

export const getUnitByCode = (code: string | undefined, units?: UnitMaster[]) => {
  const normalizedCode = normalizeUnitCode(code);
  return resolveUnitCatalog(units).find((unit) => unit.code === normalizedCode);
};

export const getActiveUnits = (units?: UnitMaster[]) =>
  resolveUnitCatalog(units).filter((unit) => unit.status === 'active');

export const getUnitsForUsage = (
  usage: 'purchase' | 'issue' | 'recipe' | 'yield' | 'sales',
  units?: UnitMaster[],
) => {
  const flagByUsage = {
    purchase: 'allowPurchase',
    issue: 'allowIssue',
    recipe: 'allowRecipe',
    yield: 'allowYield',
    sales: 'allowSales',
  } as const;

  const flag = flagByUsage[usage];
  return getActiveUnits(units).filter((unit) => unit[flag]);
};

export const formatUnitLabel = (code: string | undefined, units?: UnitMaster[]) => {
  if (!code) {
    return '';
  }

  const unit = getUnitByCode(code, units);
  return unit ? unit.name : code.replace(/-/g, ' ');
};

export const formatUnitOptionLabel = (unit: UnitMaster) =>
  unit.symbol && unit.symbol !== unit.name ? `${unit.name} (${unit.symbol})` : unit.name;

export const convertUnitQuantity = (
  quantity: number,
  fromUnitCode: string,
  toUnitCode: string,
  units?: UnitMaster[],
) => {
  const fromCode = normalizeUnitCode(fromUnitCode);
  const toCode = normalizeUnitCode(toUnitCode);

  if (!fromCode || !toCode || fromCode === toCode) {
    return quantity;
  }

  const fromUnit = getUnitByCode(fromCode, units);
  const toUnit = getUnitByCode(toCode, units);

  if (!fromUnit || !toUnit) {
    return null;
  }

  if (fromUnit.family !== toUnit.family) {
    return null;
  }

  if (!fromUnit.baseUnitCode || !toUnit.baseUnitCode || fromUnit.baseUnitCode !== toUnit.baseUnitCode) {
    return null;
  }

  const fromFactor = fromUnit.conversionToBase || 1;
  const toFactor = toUnit.conversionToBase || 1;

  return (quantity * fromFactor) / toFactor;
};

export const ensureSelectedUnitOption = (options: UnitMaster[], code?: string) => {
  if (!code || options.some((option) => option.code === code)) {
    return options;
  }

  const existing = getUnitByCode(code);
  if (existing) {
    return [...options, existing];
  }

  return [
    ...options,
    createSystemUnit(code, code.replace(/-/g, ' '), code, 'package', {
      allowPurchase: true,
      allowIssue: true,
      allowRecipe: true,
      allowYield: true,
      allowSales: true,
    }),
  ];
};
