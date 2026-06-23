import { useMemo, useState } from 'react';
import { CheckCircle, Edit2, Eye, Plus, Search, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrencyPKR } from '../../../lib/locale';
import {
  convertUnitQuantity,
  ensureSelectedUnitOption,
  formatUnitLabel,
  formatUnitOptionLabel,
  getUnitsForUsage,
  normalizeUnitCode,
} from '../../../lib/unitConversion';
import { createDefaultDishUsageFlags, getDishUsageLabels, normalizeDishUsageFlags } from '../dishUsage';
import {
  Cuisine,
  Dish,
  DishUsageFlags,
  DishCategory,
  DishStatus,
  InventoryType,
  KitchenDishCategory,
  KitchenStation,
  MenuItemVariant,
  PreparationArea,
  ProductionType,
  PurchaseItem,
  Recipe,
  UnitMaster,
  Vendor,
} from '../types';

interface BanquetDishMasterProps {
  userName: string;
  cuisines: Cuisine[];
  dishCategories: KitchenDishCategory[];
  kitchenStations: KitchenStation[];
  dishes: Dish[];
  purchaseItems: PurchaseItem[];
  units: UnitMaster[];
  vendors: Vendor[];
  recipes: Recipe[];
  onDishesChange: (dishes: Dish[]) => void;
}

type SellableProductionType = Extract<ProductionType, 'recipe-based' | 'purchased-ready' | 'service-item'>;

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-3 py-2 text-sm text-slate-700 align-middle';
const inputClass = 'h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500';
const textareaClass = 'min-h-[64px] w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500';
const labelClass = 'mb-1 block text-xs font-medium text-slate-700';
const sectionTitleClass = 'border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700';

const productionTypeOptions: Array<{ value: SellableProductionType; label: string }> = [
  { value: 'recipe-based', label: 'Recipe Based' },
  { value: 'purchased-ready', label: 'Purchased Ready' },
  { value: 'service-item', label: 'Service Item' },
];

const statusOptions: Array<{ value: DishStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const dishUsageOptions: Array<{ key: keyof DishUsageFlags; label: string; note: string }> = [
  { key: 'customMenu', label: 'Custom Menu', note: 'Show in Confirm Reservation custom menu picker.' },
  { key: 'menuPackage', label: 'Menu Package', note: 'Allow package builder to include this dish.' },
  { key: 'reservationFoodSupplies', label: 'Food Supplies', note: 'Show in Confirm Reservation food supplies.' },
  { key: 'outsideServices', label: 'Outside Services', note: 'Show in outside services food supply rows.' },
];

const createVariant = (overrides?: Partial<MenuItemVariant>): MenuItemVariant => {
  const quantity = overrides?.quantity ?? overrides?.salesQuantity ?? 1;
  const salesUnit = overrides?.salesUnit || overrides?.salesUnitId || 'portion';

  return {
    id: overrides?.id || `variant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: overrides?.label || overrides?.variantLabel || 'Default',
    variantLabel: overrides?.variantLabel || overrides?.label || 'Default',
    salesUnit,
    salesUnitId: overrides?.salesUnitId || overrides?.salesUnit || 'portion',
    quantity,
    salesQuantity: overrides?.salesQuantity ?? overrides?.quantity ?? 1,
    portionBaseQuantity: overrides?.portionBaseQuantity ?? quantity,
    quantityUnit: overrides?.quantityUnit || salesUnit,
    sellingPrice: overrides?.sellingPrice ?? 0,
    estimatedCost: overrides?.estimatedCost ?? 0,
    isDefault: overrides?.isDefault ?? false,
    active: overrides?.active ?? overrides?.status !== 'inactive',
    status: overrides?.status || (overrides?.active === false ? 'inactive' : 'active'),
  };
};

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded border border-slate-200 bg-white">
    <div className={sectionTitleClass}>{title}</div>
    <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2">{children}</div>
  </section>
);

const getDefaultVariant = (variants: MenuItemVariant[]) =>
  variants.find((variant) => variant.isDefault) || variants[0];

const MENU_BASED_SALES_UNITS = new Set(['per-head', 'per-guest']);

const isMenuBasedSalesUnit = (salesUnit?: string) => MENU_BASED_SALES_UNITS.has(normalizeUnitCode(salesUnit));

const getVariantCostBasisLabel = (productionType: SellableProductionType, variant: MenuItemVariant) => {
  if (isMenuBasedSalesUnit(variant.salesUnit)) {
    return 'Menu-Based';
  }

  if (productionType === 'recipe-based') {
    return 'Recipe-Based';
  }

  if (productionType === 'purchased-ready') {
    return 'Purchase-Based';
  }

  return 'Service-Based';
};

const ensureDefaultVariant = (variants: MenuItemVariant[]) => {
  const activeVariants = variants.length ? variants : [createVariant({ isDefault: true })];
  const hasDefault = activeVariants.some((variant) => variant.isDefault);

  return activeVariants.map((variant, index) => ({
    ...variant,
    isDefault: hasDefault ? Boolean(variant.isDefault) : index === 0,
  }));
};

const buildLegacyVariant = (dish: Dish) =>
  createVariant({
    id: `${dish.id}-default`,
    label: 'Default',
    salesUnit: dish.unitOfSale || 'portion',
    quantity: 1,
    sellingPrice: dish.sellingPrice || 0,
    estimatedCost: dish.estimatedCost || 0,
    isDefault: true,
  });

const getDishVariants = (dish: Dish) =>
  ensureDefaultVariant(
    dish.salesVariants?.length ? dish.salesVariants.map((variant) => createVariant(variant)) : [buildLegacyVariant(dish)],
  );

const getVariantBaseQuantity = (variant: MenuItemVariant) => Number(variant.portionBaseQuantity ?? variant.quantity) || 0;

const legacyInventoryTypeMap: Record<string, InventoryType> = {
  'ready-made': 'finished-product',
  consumable: 'packaging-material',
  packaging: 'packaging-material',
};

const getPurchaseItemInventoryType = (item: PurchaseItem): InventoryType =>
  item.inventoryType || legacyInventoryTypeMap[item.category] || 'raw-material';

const getPurchaseItemIssueUnit = (item: PurchaseItem) => item.baseUnitId || item.issueUnit;

const getPurchaseItemUnitCost = (item?: PurchaseItem | null) =>
  item?.ratePerUnit ?? item?.averageCost ?? item?.lastPurchaseRate ?? item?.defaultPurchaseCost ?? 0;

const formatInventoryTypeLabel = (inventoryType?: InventoryType) => (inventoryType ? inventoryType.replace(/-/g, ' ') : '-');

const resolveDishProductionType = (dish: Dish): SellableProductionType => {
  if (
    dish.productionType === 'recipe-based' ||
    dish.productionType === 'purchased-ready' ||
    dish.productionType === 'service-item'
  ) {
    return dish.productionType;
  }

  if (dish.sourceType === 'in-house-produced' || dish.productionType === 'in-house' || dish.recipeId) {
    return 'recipe-based';
  }

  if (dish.sourceType === 'outsourced') {
    return 'service-item';
  }

  return 'purchased-ready';
};

const getSourceTypeForProductionType = (productionType: SellableProductionType) => {
  if (productionType === 'recipe-based') {
    return 'in-house-produced' as const;
  }

  if (productionType === 'service-item') {
    return 'outsourced' as const;
  }

  return 'purchased-for-resale' as const;
};

const getProductionTypeLabel = (productionType: SellableProductionType) =>
  productionTypeOptions.find((option) => option.value === productionType)?.label || productionType.replace(/-/g, ' ');

const getStatusLabel = (status: DishStatus) =>
  statusOptions.find((option) => option.value === status)?.label || status.replace(/-/g, ' ');

const getRecipeName = (recipe?: Recipe) => recipe?.recipeName || recipe?.id || '-';
const getRecipeCost = (recipe?: Recipe) => recipe?.totalRecipeCost ?? recipe?.totalCost ?? 0;
const getRecipeYieldQuantity = (recipe?: Recipe) => recipe?.yieldQuantity ?? recipe?.yields ?? 0;
const getRecipeYieldUnit = (recipe?: Recipe) => recipe?.yieldUnitId || recipe?.yieldUnit || '-';
const getRecipeCostPerYieldUnit = (recipe?: Recipe) =>
  recipe?.costPerYieldUnit ?? recipe?.costPerPortion ?? 0;

const getDishCode = (dish: Dish) => dish.dishCode || '-';

const generateDishCode = (dishes: Dish[]) => {
  const maxCodeNumber = dishes.reduce((max, dish) => {
    const match = dish.dishCode?.match(/^DSH-(\d+)$/i);
    return match ? Math.max(max, Number(match[1]) || 0) : max;
  }, 0);

  return `DSH-${String(maxCodeNumber + 1).padStart(4, '0')}`;
};

export function BanquetDishMaster({
  userName,
  cuisines,
  dishCategories,
  kitchenStations,
  dishes,
  purchaseItems,
  units,
  recipes,
  onDishesChange,
}: BanquetDishMasterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DishStatus>('all');
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [kitchenStationFilter, setKitchenStationFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [viewMode, setViewMode] = useState(false);

  const [formDishName, setFormDishName] = useState('');
  const [formDishCode, setFormDishCode] = useState('');
  const [formCuisineId, setFormCuisineId] = useState('');
  const [formCategory, setFormCategory] = useState<DishCategory>('');
  const [formKitchenStation, setFormKitchenStation] = useState<PreparationArea>('');
  const [formProductionType, setFormProductionType] = useState<SellableProductionType>('recipe-based');
  const [formRecipeId, setFormRecipeId] = useState('');
  const [formLinkedPurchaseItemId, setFormLinkedPurchaseItemId] = useState('');
  const [formStatus, setFormStatus] = useState<DishStatus>('draft');
  const [formDescription, setFormDescription] = useState('');
  const [formUsageFlags, setFormUsageFlags] = useState<DishUsageFlags>(createDefaultDishUsageFlags);
  const [formSalesVariants, setFormSalesVariants] = useState<MenuItemVariant[]>([
    createVariant({ label: 'Default', salesUnit: 'portion', quantity: 1, isDefault: true }),
  ]);

  const activeCategories = useMemo(
    () => dishCategories.filter((category) => category.status === 'active'),
    [dishCategories],
  );
  const activeStations = useMemo(
    () => kitchenStations.filter((station) => station.status === 'active'),
    [kitchenStations],
  );
  const recipesById = useMemo(() => new Map(recipes.map((recipe) => [recipe.id, recipe])), [recipes]);
  const purchaseItemsById = useMemo(() => new Map(purchaseItems.map((item) => [item.id, item])), [purchaseItems]);
  const purchaseItemOptions = useMemo(
    () =>
      purchaseItems
        .filter((item) => item.status === 'active' || item.id === formLinkedPurchaseItemId)
        .sort((left, right) => {
          const leftRank = getPurchaseItemInventoryType(left) === 'finished-product' ? 0 : 1;
          const rightRank = getPurchaseItemInventoryType(right) === 'finished-product' ? 0 : 1;
          return leftRank - rightRank || left.itemName.localeCompare(right.itemName);
        }),
    [formLinkedPurchaseItemId, purchaseItems],
  );
  const recipeOptions = useMemo(
    () =>
      editingDish
        ? recipes.filter(
            (recipe) =>
              recipe.dishId === editingDish.id &&
              (recipe.status !== 'inactive' || recipe.id === formRecipeId),
          )
        : [],
    [editingDish, formRecipeId, recipes],
  );
  const categoryNameMap = useMemo(
    () => new Map(dishCategories.map((category) => [category.code, category.name])),
    [dishCategories],
  );
  const stationNameMap = useMemo(
    () => new Map(kitchenStations.map((station) => [station.code, station.name])),
    [kitchenStations],
  );
  const salesUnitOptions = useMemo(() => getUnitsForUsage('sales', units), [units]);
  const fallbackSalesUnit = salesUnitOptions.find((unit) => unit.code === 'portion')?.code || salesUnitOptions[0]?.code || 'portion';
  const selectedRecipe = formRecipeId ? recipesById.get(formRecipeId) : undefined;
  const selectedPurchaseItem = formLinkedPurchaseItemId ? purchaseItemsById.get(formLinkedPurchaseItemId) : undefined;
  const recipeRequiredForApproval = formProductionType === 'recipe-based' && formStatus === 'approved';
  const canSelectRecipe = formProductionType === 'recipe-based' && recipeOptions.length > 0;
  const defaultVariant = getDefaultVariant(formSalesVariants);
  const defaultVariantIsMenuBased = isMenuBasedSalesUnit(defaultVariant?.salesUnit);
  const recipeYieldUnit = selectedRecipe ? getRecipeYieldUnit(selectedRecipe) : 'recipe unit';
  const recipeQuantityUnit = selectedRecipe ? getRecipeYieldUnit(selectedRecipe) : '';
  const purchasedReadyIssueUnit = selectedPurchaseItem ? getPurchaseItemIssueUnit(selectedPurchaseItem) : '';
  const purchasedReadyUnitCost = getPurchaseItemUnitCost(selectedPurchaseItem);
  const purchasedReadyInventoryType = selectedPurchaseItem ? getPurchaseItemInventoryType(selectedPurchaseItem) : undefined;
  const purchasedReadyCurrentStock = selectedPurchaseItem?.currentStock ?? 0;
  const getPurchasedReadyVariantCost = (variant: MenuItemVariant) => {
    if (!selectedPurchaseItem) {
      return 0;
    }

    const baseQuantity = getVariantBaseQuantity(variant);
    const issueUnit = getPurchaseItemIssueUnit(selectedPurchaseItem);
    const sourceUnit = variant.quantityUnit || issueUnit;
    const convertedQuantity =
      sourceUnit === issueUnit
        ? baseQuantity
        : convertUnitQuantity(baseQuantity, sourceUnit, issueUnit, units);
    const requiredQuantity =
      convertedQuantity === null && variant.quantityUnit === variant.salesUnit ? baseQuantity : convertedQuantity;

    return requiredQuantity === null ? 0 : requiredQuantity * purchasedReadyUnitCost;
  };
  const recipeCost = formProductionType === 'recipe-based' ? getRecipeCost(selectedRecipe) : 0;
  const recipeCostPerYieldUnit =
    formProductionType === 'recipe-based'
      ? getRecipeCostPerYieldUnit(selectedRecipe)
      : formProductionType === 'purchased-ready'
        ? purchasedReadyUnitCost
        : 0;
  const defaultVariantCost = defaultVariant
    ? defaultVariantIsMenuBased
      ? 0
      : formProductionType === 'recipe-based'
        ? getVariantBaseQuantity(defaultVariant) * recipeCostPerYieldUnit
      : formProductionType === 'purchased-ready'
        ? getPurchasedReadyVariantCost(defaultVariant)
        : 0
    : 0;
  const defaultSellingPrice = defaultVariant?.sellingPrice || 0;
  const foodCostPercentage =
    !defaultVariantIsMenuBased && defaultSellingPrice > 0 ? (defaultVariantCost / defaultSellingPrice) * 100 : 0;
  const grossMargin = defaultVariantIsMenuBased ? 0 : defaultSellingPrice - defaultVariantCost;
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const banquetDishes = useMemo(
    () => dishes.filter((dish) => dish.module === 'banquet'),
    [dishes],
  );

  const filteredDishes = banquetDishes.filter((dish) => {
    const productionType = resolveDishProductionType(dish);
    const recipe = dish.recipeId ? recipesById.get(dish.recipeId) : undefined;
    const matchesSearch =
      !normalizedSearch ||
      dish.dishName.toLowerCase().includes(normalizedSearch) ||
      (dish.dishCode || '').toLowerCase().includes(normalizedSearch) ||
      dish.cuisineName.toLowerCase().includes(normalizedSearch) ||
      getRecipeName(recipe).toLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === 'all' || dish.status === statusFilter;
    const matchesCuisine = cuisineFilter === 'all' || dish.cuisineId === cuisineFilter;
    const matchesCategory = categoryFilter === 'all' || dish.category === categoryFilter || dish.categoryId === categoryFilter;
    const stationId = dish.kitchenStationId || dish.preparationArea;
    const matchesKitchenStation = kitchenStationFilter === 'all' || stationId === kitchenStationFilter;

    return matchesSearch && matchesStatus && matchesCuisine && matchesCategory && matchesKitchenStation && productionType;
  });

  const openDialog = (dish: Dish | null, nextViewMode: boolean) => {
    if (!dish) {
      setEditingDish(null);
      setFormDishName('');
      setFormDishCode(generateDishCode(dishes));
      setFormCuisineId(cuisines[0]?.id || '');
      setFormCategory(activeCategories[0]?.code || '');
      setFormKitchenStation(activeStations[0]?.code || '');
      setFormProductionType('recipe-based');
      setFormRecipeId('');
      setFormLinkedPurchaseItemId('');
      setFormStatus('draft');
      setFormDescription('');
      setFormUsageFlags(createDefaultDishUsageFlags());
      setFormSalesVariants([
        createVariant({ label: 'Default', salesUnit: fallbackSalesUnit, quantity: 1, isDefault: true }),
      ]);
      setViewMode(false);
      setDialogOpen(true);
      return;
    }

    const productionType = resolveDishProductionType(dish);
    setEditingDish(dish);
    setFormDishName(dish.dishName);
    setFormDishCode(dish.dishCode || generateDishCode(dishes));
    setFormCuisineId(dish.cuisineId);
    setFormCategory(dish.categoryId || dish.category);
    setFormKitchenStation(dish.kitchenStationId || dish.preparationArea);
    setFormProductionType(productionType);
    setFormRecipeId(productionType === 'recipe-based' ? dish.recipeId || '' : '');
    setFormLinkedPurchaseItemId(productionType === 'purchased-ready' ? dish.resaleProfile?.linkedPurchaseItemIds?.[0] || '' : '');
    setFormStatus(dish.status);
    setFormDescription(dish.description || '');
    setFormUsageFlags(normalizeDishUsageFlags(dish));
    setFormSalesVariants(getDishVariants(dish));
    setViewMode(nextViewMode);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    if (cuisines.length === 0) {
      toast.error('Please add at least one cuisine first');
      return;
    }

    if (activeCategories.length === 0) {
      toast.error('Please add at least one dish category first');
      return;
    }

    if (activeStations.length === 0) {
      toast.error('Please add at least one kitchen station first');
      return;
    }

    openDialog(null, false);
  };

  const handleProductionTypeChange = (nextProductionType: SellableProductionType) => {
    setFormProductionType(nextProductionType);
    if (nextProductionType !== 'recipe-based') {
      setFormRecipeId('');
    }
  };

  const handleLinkedPurchaseItemChange = (purchaseItemId: string) => {
    setFormLinkedPurchaseItemId(purchaseItemId);
    const purchaseItem = purchaseItemsById.get(purchaseItemId);
    if (!purchaseItem) {
      return;
    }

    const issueUnit = getPurchaseItemIssueUnit(purchaseItem);
    setFormSalesVariants((current) =>
      current.map((variant) =>
        createVariant({
          ...variant,
          portionBaseQuantity: getVariantBaseQuantity(variant) || 1,
          quantityUnit: issueUnit,
        }),
      ),
    );
  };

  const handleAddVariant = () => {
    setFormSalesVariants((current) => [
      ...current,
      createVariant({
        label: `Variant ${current.length + 1}`,
        salesUnit: current[0]?.salesUnit || fallbackSalesUnit,
        quantity: 1,
      }),
    ]);
  };

  const handleUpdateVariant = (variantId: string, updates: Partial<MenuItemVariant>) => {
    setFormSalesVariants((current) =>
      current.map((variant) => {
        if (variant.id !== variantId) {
          return updates.isDefault ? { ...variant, isDefault: false } : variant;
        }

        const nextVariant = { ...variant, ...updates };
        if (updates.label !== undefined || updates.variantLabel !== undefined) {
          nextVariant.label = updates.label ?? updates.variantLabel ?? nextVariant.label;
          nextVariant.variantLabel = nextVariant.label;
        }
        if (updates.quantity !== undefined || updates.salesQuantity !== undefined) {
          const quantity = Number(updates.quantity ?? updates.salesQuantity);
          const shouldSyncBaseQuantity =
            variant.portionBaseQuantity === undefined || Number(variant.portionBaseQuantity) === Number(variant.quantity);
          nextVariant.quantity = quantity;
          nextVariant.salesQuantity = quantity;
          if (shouldSyncBaseQuantity) {
            nextVariant.portionBaseQuantity = quantity;
          }
        }
        if (updates.salesUnit !== undefined || updates.salesUnitId !== undefined) {
          const salesUnit = updates.salesUnit ?? updates.salesUnitId ?? nextVariant.salesUnit;
          nextVariant.salesUnit = salesUnit;
          nextVariant.salesUnitId = salesUnit;
          nextVariant.quantityUnit =
            isMenuBasedSalesUnit(salesUnit)
              ? salesUnit
              : formProductionType === 'recipe-based' && recipeQuantityUnit && recipeQuantityUnit !== '-'
              ? recipeQuantityUnit
              : formProductionType === 'purchased-ready' && selectedPurchaseItem
              ? getPurchaseItemIssueUnit(selectedPurchaseItem)
              : salesUnit;
          if (isMenuBasedSalesUnit(salesUnit)) {
            nextVariant.portionBaseQuantity = undefined;
          }
        }
        if (updates.status !== undefined || updates.active !== undefined) {
          nextVariant.status = updates.status || (updates.active === false ? 'inactive' : 'active');
          nextVariant.active = nextVariant.status !== 'inactive';
        }

        return nextVariant;
      }),
    );
  };

  const handleRemoveVariant = (variantId: string) => {
    setFormSalesVariants((current) => {
      const remaining = current.filter((variant) => variant.id !== variantId);
      return remaining.length ? ensureDefaultVariant(remaining) : current;
    });
  };

  const validateDish = () => {
    if (!formDishName.trim()) {
      toast.error('Dish name is required');
      return false;
    }

    if (!formCuisineId) {
      toast.error('Please select a cuisine');
      return false;
    }

    if (!formCategory) {
      toast.error('Please select a dish category');
      return false;
    }

    if (!formKitchenStation) {
      toast.error('Please select a kitchen station');
      return false;
    }

    if (!formProductionType) {
      toast.error('Production type is required');
      return false;
    }

    if (!formStatus) {
      toast.error('Status is required');
      return false;
    }

    const duplicateDish = dishes.find(
      (dish) =>
        dish.module === 'banquet' &&
        dish.id !== editingDish?.id &&
        dish.dishName.trim().toLowerCase() === formDishName.trim().toLowerCase(),
    );

    if (duplicateDish) {
      toast.error('A dish with this name already exists in Banquet Kitchen');
      return false;
    }

    if (formProductionType === 'recipe-based') {
      const recipe = formRecipeId ? recipesById.get(formRecipeId) : undefined;
      if (formRecipeId && !editingDish) {
        toast.error('Save the dish first, then create its recipe in Recipe & Costing');
        return false;
      }

      if (recipe && recipe.dishId !== editingDish?.id) {
        toast.error('Selected recipe does not belong to this dish');
        return false;
      }

      if (recipe && recipe.status === 'inactive') {
        toast.error('Recipe must be active');
        return false;
      }

      if (recipeRequiredForApproval && !recipe) {
        toast.error('Create an active recipe in Recipe & Costing before activating this dish');
        return false;
      }
    }

    if (formProductionType === 'purchased-ready' && formStatus === 'approved' && !selectedPurchaseItem) {
      toast.error('Link one purchase item before activating a purchased ready dish');
      return false;
    }

    if (formSalesVariants.length === 0) {
      toast.error('Add at least one sales variant');
      return false;
    }

    if (!formSalesVariants.some((variant) => variant.isDefault)) {
      toast.error('One default sales variant is required');
      return false;
    }

    const variantLabels = new Set<string>();
    for (const variant of formSalesVariants) {
      const label = variant.label.trim().toLowerCase();
      if (!label) {
        toast.error('Variant label is required');
        return false;
      }

      if (variantLabels.has(label)) {
        toast.error('Duplicate variant labels are not allowed');
        return false;
      }
      variantLabels.add(label);

      if ((Number(variant.quantity) || 0) <= 0) {
        toast.error('Sales qty must be greater than 0');
        return false;
      }

      if (
        formProductionType === 'recipe-based' &&
        selectedRecipe &&
        !isMenuBasedSalesUnit(variant.salesUnit) &&
        getVariantBaseQuantity(variant) <= 0
      ) {
        toast.error('Recipe qty must be greater than 0 for each variant');
        return false;
      }

      if ((Number(variant.sellingPrice) || 0) < 0) {
        toast.error('Selling price cannot be negative');
        return false;
      }

      if (!variant.salesUnit) {
        toast.error('Please select a sales unit for each variant');
        return false;
      }
    }

    return true;
  };

  const handleSave = () => {
    if (!validateDish()) {
      return;
    }

    const selectedCuisine = cuisines.find((cuisine) => cuisine.id === formCuisineId);
    const selectedRecipeForSave = formRecipeId ? recipesById.get(formRecipeId) : undefined;
    const sourceType = getSourceTypeForProductionType(formProductionType);
    const recipeYieldUnitForSave = selectedRecipeForSave ? getRecipeYieldUnit(selectedRecipeForSave) : undefined;
    const purchasedReadyIssueUnitForSave = selectedPurchaseItem ? getPurchaseItemIssueUnit(selectedPurchaseItem) : undefined;
    const normalizedVariants = ensureDefaultVariant(
      formSalesVariants.map((variant) => {
        const variantIsMenuBased = isMenuBasedSalesUnit(variant.salesUnit);
        const baseQuantity = variantIsMenuBased ? 0 : getVariantBaseQuantity(variant);
        const variantCost =
          variantIsMenuBased
            ? 0
            : formProductionType === 'recipe-based'
            ? baseQuantity * recipeCostPerYieldUnit
            : formProductionType === 'purchased-ready'
              ? getPurchasedReadyVariantCost(variant)
              : 0;
        const normalizedVariant = createVariant({
          ...variant,
          label: variant.label.trim(),
          variantLabel: variant.label.trim(),
          quantity: Number(variant.quantity) || 1,
          salesQuantity: Number(variant.quantity) || 1,
          portionBaseQuantity: variantIsMenuBased ? undefined : baseQuantity || Number(variant.quantity) || 1,
          salesUnit: variant.salesUnit || fallbackSalesUnit,
          salesUnitId: variant.salesUnit || fallbackSalesUnit,
          quantityUnit:
            variantIsMenuBased
              ? variant.salesUnit || fallbackSalesUnit
              : formProductionType === 'recipe-based' && recipeYieldUnitForSave && recipeYieldUnitForSave !== '-'
              ? recipeYieldUnitForSave
              : formProductionType === 'purchased-ready' && purchasedReadyIssueUnitForSave
              ? purchasedReadyIssueUnitForSave
              : variant.quantityUnit || variant.salesUnit || fallbackSalesUnit,
          sellingPrice: Number(variant.sellingPrice) || 0,
          estimatedCost: variantCost,
          status: variant.status || (variant.active === false ? 'inactive' : 'active'),
          active: variant.status ? variant.status !== 'inactive' : variant.active !== false,
        });

        return variantIsMenuBased
          ? {
              ...normalizedVariant,
              portionBaseQuantity: undefined,
              quantityUnit: variant.salesUnit || fallbackSalesUnit,
              estimatedCost: 0,
            }
          : normalizedVariant;
      }),
    );
    const normalizedDefaultVariant = getDefaultVariant(normalizedVariants);
    const normalizedDefaultVariantIsMenuBased = isMenuBasedSalesUnit(normalizedDefaultVariant?.salesUnit);
    const recipeCostForSave = formProductionType === 'recipe-based' ? getRecipeCost(selectedRecipeForSave) : 0;
    const defaultVariantCostForSave = normalizedDefaultVariantIsMenuBased ? 0 : normalizedDefaultVariant?.estimatedCost || 0;
    const defaultSellingPriceForSave = normalizedDefaultVariant?.sellingPrice || 0;
    const foodCostPercentageForSave =
      !normalizedDefaultVariantIsMenuBased && defaultSellingPriceForSave > 0
        ? (defaultVariantCostForSave / defaultSellingPriceForSave) * 100
        : 0;
    const grossMarginForSave = normalizedDefaultVariantIsMenuBased ? 0 : defaultSellingPriceForSave - defaultVariantCostForSave;
    const now = new Date();
    const recipeId = formProductionType === 'recipe-based' ? formRecipeId : undefined;
    const resaleProfile =
      formProductionType === 'purchased-ready' && formLinkedPurchaseItemId
        ? { linkedPurchaseItemIds: [formLinkedPurchaseItemId] }
        : undefined;
    const costPerBaseUnitForSave =
      formProductionType === 'recipe-based'
        ? recipeCostPerYieldUnit
        : formProductionType === 'purchased-ready'
          ? purchasedReadyUnitCost
          : 0;

    const dishPayload: Dish = {
      ...(editingDish || {
        id: `dish-${Date.now()}`,
        module: 'banquet',
        createdBy: userName,
        createdAt: now,
      }),
      dishCode: formDishCode,
      dishName: formDishName.trim(),
      cuisineId: formCuisineId,
      cuisineName: selectedCuisine?.name || '',
      categoryId: formCategory,
      category: formCategory,
      kitchenStationId: formKitchenStation,
      preparationArea: formKitchenStation,
      sourceType,
      productionType: formProductionType,
      issuedFrom: editingDish?.issuedFrom || 'kitchen',
      unitOfSale: normalizedDefaultVariant?.salesUnit || fallbackSalesUnit,
      status: formStatus,
      description: formDescription.trim() || undefined,
      salesVariants: normalizedVariants,
      resaleProfile,
      outsourceProfile: undefined,
      usageFlags: normalizeDishUsageFlags(formUsageFlags),
      hasRecipe: Boolean(recipeId),
      recipeId,
      estimatedCost: costPerBaseUnitForSave,
      costPerBaseUnit: costPerBaseUnitForSave,
      sellingPrice: defaultSellingPriceForSave,
      recipeCost: recipeCostForSave,
      defaultVariantCost: defaultVariantCostForSave,
      defaultSellingPrice: defaultSellingPriceForSave,
      foodCostPercentage: foodCostPercentageForSave,
      grossMargin: grossMarginForSave,
      updatedBy: userName,
      updatedAt: now,
      ...(formStatus === 'approved' && !editingDish?.approvedBy
        ? {
            approvedBy: userName,
            approvedAt: now,
          }
        : {}),
    };

    if (editingDish) {
      onDishesChange(dishes.map((dish) => (dish.id === editingDish.id ? dishPayload : dish)));
      toast.success('Dish updated successfully');
    } else {
      onDishesChange([...dishes, dishPayload]);
      toast.success('Dish created successfully');
    }

    setDialogOpen(false);
  };

  const getStatusBadge = (status: DishStatus) => {
    const baseClass = 'inline-flex rounded px-2 py-0.5 text-[11px] font-medium';
    if (status === 'approved') {
      return <span className={`${baseClass} bg-emerald-100 text-emerald-700`}>Active</span>;
    }
    if (status === 'draft') {
      return <span className={`${baseClass} bg-amber-100 text-amber-700`}>Draft</span>;
    }
    return <span className={`${baseClass} bg-slate-100 text-slate-600`}>Inactive</span>;
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <h2 className="mr-2 text-base font-semibold text-slate-900">Dish Master</h2>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Dish"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | DishStatus)} className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700">
            <option value="all">All Status</option>
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <select value={cuisineFilter} onChange={(event) => setCuisineFilter(event.target.value)} className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700">
            <option value="all">All Cuisines</option>
            {cuisines.map((cuisine) => (
              <option key={cuisine.id} value={cuisine.id}>
                {cuisine.name}
              </option>
            ))}
          </select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700">
            <option value="all">All Categories</option>
            {activeCategories.map((category) => (
              <option key={category.id} value={category.code}>
                {category.name}
              </option>
            ))}
          </select>
          <select value={kitchenStationFilter} onChange={(event) => setKitchenStationFilter(event.target.value)} className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700">
            <option value="all">All Kitchen Stations</option>
            {activeStations.map((station) => (
              <option key={station.id} value={station.code}>
                {station.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddNew}
            className="inline-flex h-9 items-center gap-2 rounded border border-orange-600 bg-orange-600 px-3 text-sm font-medium text-white hover:bg-orange-700"
          >
            <Plus className="size-4" />
            Add New Dish
          </button>
        </div>

        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span><strong className="text-slate-900">Dishes:</strong> {banquetDishes.length}</span>
            <span><strong className="text-slate-900">Active:</strong> {banquetDishes.filter((dish) => dish.status === 'approved').length}</span>
            <span><strong className="text-slate-900">Draft:</strong> {banquetDishes.filter((dish) => dish.status === 'draft').length}</span>
            <span><strong className="text-slate-900">Recipe Based:</strong> {banquetDishes.filter((dish) => resolveDishProductionType(dish) === 'recipe-based').length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="overflow-hidden rounded border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <h3 className="text-sm font-semibold text-slate-900">Sellable Dish Register</h3>
            <span className="text-xs text-slate-500">{filteredDishes.length} rows</span>
          </div>
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className={tableHeadClass}>Dish Code</th>
                  <th className={tableHeadClass}>Dish Name</th>
                  <th className={tableHeadClass}>Cuisine</th>
                  <th className={tableHeadClass}>Category</th>
                  <th className={tableHeadClass}>Kitchen Station</th>
                  <th className={tableHeadClass}>Production Type</th>
                  <th className={tableHeadClass}>Recipe</th>
                  <th className={`${tableHeadClass} text-right`}>Cost</th>
                  <th className={`${tableHeadClass} text-right`}>Default Selling Price</th>
                  <th className={`${tableHeadClass} text-right`}>Food Cost %</th>
                  <th className={tableHeadClass}>Status</th>
                  <th className={`${tableHeadClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDishes.map((dish) => {
                  const recipe = dish.recipeId ? recipesById.get(dish.recipeId) : undefined;
                  const defaultDishVariant = getDefaultVariant(getDishVariants(dish));
                  const dishProductionType = resolveDishProductionType(dish);
                  const defaultPrice = dish.defaultSellingPrice ?? defaultDishVariant?.sellingPrice ?? dish.sellingPrice ?? 0;
                  const cost = dish.defaultVariantCost ?? defaultDishVariant?.estimatedCost ?? dish.estimatedCost ?? 0;
                  const foodCost = dish.foodCostPercentage ?? (defaultPrice > 0 ? (cost / defaultPrice) * 100 : 0);
                  const stationId = dish.kitchenStationId || dish.preparationArea;

                  return (
                    <tr key={dish.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className={tableCellClass}>{getDishCode(dish)}</td>
                      <td className={tableCellClass}>
                        <div className="font-medium text-slate-900">{dish.dishName}</div>
                        {dish.description ? <div className="max-w-[220px] truncate text-xs text-slate-500">{dish.description}</div> : null}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {getDishUsageLabels(dish).map((label) => (
                            <span key={label} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              {label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className={tableCellClass}>{dish.cuisineName}</td>
                      <td className={tableCellClass}>{categoryNameMap.get(dish.category) || dish.category}</td>
                      <td className={tableCellClass}>{stationNameMap.get(stationId) || stationId}</td>
                      <td className={tableCellClass}>{getProductionTypeLabel(dishProductionType)}</td>
                      <td className={tableCellClass}>{recipe ? getRecipeName(recipe) : '-'}</td>
                      <td className={`${tableCellClass} text-right font-medium text-slate-900`}>{formatCurrencyPKR(cost)}</td>
                      <td className={`${tableCellClass} text-right font-medium text-slate-900`}>{formatCurrencyPKR(defaultPrice)}</td>
                      <td className={`${tableCellClass} text-right`}>{Number.isFinite(foodCost) ? `${foodCost.toFixed(2)}%` : '0.00%'}</td>
                      <td className={tableCellClass}>{getStatusBadge(dish.status)}</td>
                      <td className={`${tableCellClass} text-right`}>
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openDialog(dish, true)}
                            className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                            title="View"
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            onClick={() => openDialog(dish, false)}
                            className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                            title="Edit"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          {dish.status === 'approved' ? (
                            <CheckCircle className="size-4 text-emerald-600" />
                          ) : (
                            <XCircle className="size-4 text-slate-400" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredDishes.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={12}>
                      {searchTerm || statusFilter !== 'all' || cuisineFilter !== 'all' || categoryFilter !== 'all' || kitchenStationFilter !== 'all'
                        ? 'No dishes found matching your filters.'
                        : 'No dishes yet. Click "Add New Dish" to get started.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="flex max-h-[94vh] w-full max-w-7xl flex-col rounded bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {viewMode ? 'View Dish' : editingDish ? 'Edit Dish' : 'Create Dish'}
                </h2>
                <p className="text-xs text-slate-500">Kitchen ERP sellable dish setup</p>
              </div>
              <button onClick={() => setDialogOpen(false)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100">
                <XCircle className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-3">
                <FormSection title="Basic Dish Information">
                  <div>
                    <label className={labelClass}>Dish Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formDishName}
                      onChange={(event) => setFormDishName(event.target.value)}
                      disabled={viewMode}
                      placeholder="e.g., Chicken Qorma"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Dish Code</label>
                    <input type="text" value={formDishCode} readOnly className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Cuisine <span className="text-red-500">*</span></label>
                    <select value={formCuisineId} onChange={(event) => setFormCuisineId(event.target.value)} disabled={viewMode} className={inputClass}>
                      <option value="">Select cuisine</option>
                      {cuisines.map((cuisine) => (
                        <option key={cuisine.id} value={cuisine.id}>
                          {cuisine.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Dish Category <span className="text-red-500">*</span></label>
                    <select value={formCategory} onChange={(event) => setFormCategory(event.target.value as DishCategory)} disabled={viewMode} className={inputClass}>
                      <option value="">Select dish category</option>
                      {activeCategories.map((category) => (
                        <option key={category.id} value={category.code}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Kitchen Station <span className="text-red-500">*</span></label>
                    <select value={formKitchenStation} onChange={(event) => setFormKitchenStation(event.target.value as PreparationArea)} disabled={viewMode} className={inputClass}>
                      <option value="">Select kitchen station</option>
                      {activeStations.map((station) => (
                        <option key={station.id} value={station.code}>
                          {station.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Status <span className="text-red-500">*</span></label>
                    <select value={formStatus} onChange={(event) => setFormStatus(event.target.value as DishStatus)} disabled={viewMode} className={inputClass}>
                      {statusOptions.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </FormSection>

                <FormSection title="Production Setup">
                  <div>
                    <label className={labelClass}>Production Type <span className="text-red-500">*</span></label>
                    <select
                      value={formProductionType}
                      onChange={(event) => handleProductionTypeChange(event.target.value as SellableProductionType)}
                      disabled={viewMode}
                      className={inputClass}
                    >
                      {productionTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <div className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {formProductionType === 'recipe-based'
                        ? 'Draft dishes can be created before recipe costing. Active dishes require a linked recipe.'
                        : formProductionType === 'purchased-ready'
                          ? 'Purchased ready dishes do not require a recipe, but they should link to one purchase item for costing and stock issue.'
                          : 'Service items do not affect inventory from Dish Master.'}
                    </div>
                  </div>
                </FormSection>

                {formProductionType === 'purchased-ready' ? (
                  <FormSection title="Purchased Ready Mapping">
                    <div>
                      <label className={labelClass}>Linked Purchase Item {formStatus === 'approved' ? <span className="text-red-500">*</span> : null}</label>
                      <select
                        value={formLinkedPurchaseItemId}
                        onChange={(event) => handleLinkedPurchaseItemChange(event.target.value)}
                        disabled={viewMode}
                        className={inputClass}
                      >
                        <option value="">{purchaseItemOptions.length > 0 ? 'Select purchase item' : 'No purchase items available'}</option>
                        {purchaseItemOptions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.itemName} ({item.itemCode || 'Auto'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <div className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        Link the stock item that should be consumed when this menu dish is sold in a package.
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-px bg-slate-200 md:col-span-2 md:grid-cols-5">
                      <div className="bg-white px-3 py-2 text-sm">
                        <div className="text-xs text-slate-500">Item Code</div>
                        <div className="font-semibold text-slate-900">{selectedPurchaseItem?.itemCode || '-'}</div>
                      </div>
                      <div className="bg-white px-3 py-2 text-sm">
                        <div className="text-xs text-slate-500">Inventory Type</div>
                        <div className="font-semibold text-slate-900">{formatInventoryTypeLabel(purchasedReadyInventoryType)}</div>
                      </div>
                      <div className="bg-white px-3 py-2 text-sm">
                        <div className="text-xs text-slate-500">Issue Unit</div>
                        <div className="font-semibold text-slate-900">{formatUnitLabel(purchasedReadyIssueUnit, units) || '-'}</div>
                      </div>
                      <div className="bg-white px-3 py-2 text-sm">
                        <div className="text-xs text-slate-500">Unit Cost</div>
                        <div className="font-semibold text-slate-900">{formatCurrencyPKR(purchasedReadyUnitCost)}</div>
                      </div>
                      <div className="bg-white px-3 py-2 text-sm">
                        <div className="text-xs text-slate-500">Current Stock</div>
                        <div className="font-semibold text-slate-900">
                          {selectedPurchaseItem ? `${purchasedReadyCurrentStock} ${formatUnitLabel(purchasedReadyIssueUnit, units)}` : '-'}
                        </div>
                      </div>
                    </div>
                  </FormSection>
                ) : null}

                <section className="rounded border border-slate-200 bg-white">
                  <div className={sectionTitleClass}>Usage Availability</div>
                  <div className="grid gap-3 p-3 md:grid-cols-2">
                    {dishUsageOptions.map((option) => (
                      <label
                        key={option.key}
                        className="flex items-start gap-2 rounded border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={formUsageFlags[option.key]}
                          onChange={(event) =>
                            setFormUsageFlags((current) => ({
                              ...current,
                              [option.key]: event.target.checked,
                            }))
                          }
                          disabled={viewMode}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-900">{option.label}</span>
                          <span className="block text-xs text-slate-500">{option.note}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>

                <FormSection title="Recipe Mapping">
                  <div>
                    <label className={labelClass}>Recipe {recipeRequiredForApproval ? <span className="text-red-500">*</span> : null}</label>
                    <select
                      value={formRecipeId}
                      onChange={(event) => setFormRecipeId(event.target.value)}
                      disabled={viewMode || !canSelectRecipe}
                      className={inputClass}
                    >
                      <option value="">
                        {formProductionType !== 'recipe-based'
                          ? 'Recipe not required'
                          : !editingDish
                          ? 'Save dish before recipe setup'
                          : canSelectRecipe
                            ? 'No recipe linked'
                            : 'No recipe created for this dish'}
                      </option>
                      {recipeOptions.map((recipe) => (
                        <option key={recipe.id} value={recipe.id}>
                          {getRecipeName(recipe)}{recipe.status === 'inactive' ? ' (Inactive)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <div className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {!editingDish
                        ? 'Recipe costing starts after this dish is saved.'
                        : formProductionType !== 'recipe-based'
                          ? 'Recipe mapping is not required for this production type.'
                          : canSelectRecipe
                            ? 'Only recipes created for this dish are available here.'
                            : 'Create the recipe from Recipe & Costing after saving the dish.'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-slate-200 md:col-span-2 md:grid-cols-3">
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Recipe Yield</div>
                      <div className="font-semibold text-slate-900">
                        {selectedRecipe ? `${getRecipeYieldQuantity(selectedRecipe)} ${getRecipeYieldUnit(selectedRecipe)}` : '-'}
                      </div>
                    </div>
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Recipe Cost</div>
                      <div className="font-semibold text-slate-900">{formatCurrencyPKR(recipeCost)}</div>
                    </div>
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Cost Per Yield Unit</div>
                      <div className="font-semibold text-slate-900">{formatCurrencyPKR(recipeCostPerYieldUnit)}</div>
                    </div>
                  </div>
                </FormSection>

                <section className="rounded border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">Sales Variants</h3>
                      <div className="text-[11px] text-slate-500">
                        {formProductionType === 'recipe-based'
                          ? `Recipe qty uses the linked recipe yield unit: ${recipeYieldUnit}.`
                          : formProductionType === 'purchased-ready'
                            ? `Stock qty uses the linked purchase item issue unit: ${formatUnitLabel(purchasedReadyIssueUnit, units) || '-'}`
                            : 'Service items use selling price only unless vendor costing is added later.'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Per Head cost is finalized in Menu/Package costing because it depends on the complete menu and portion planning.
                      </div>
                    </div>
                    {!viewMode ? (
                      <button
                        onClick={handleAddVariant}
                        className="inline-flex h-7 items-center gap-1 rounded border border-orange-600 bg-orange-600 px-2 text-xs font-medium text-white hover:bg-orange-700"
                      >
                        <Plus className="size-3.5" />
                        Add Variant
                      </button>
                    ) : null}
                  </div>
                  <div className="overflow-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className={tableHeadClass}>Variant Label</th>
                          <th className={`${tableHeadClass} text-right`}>Sales Qty</th>
                          <th className={tableHeadClass}>Sales Unit</th>
                          <th className={`${tableHeadClass} text-right`}>
                            {formProductionType === 'recipe-based' ? 'Recipe Qty' : formProductionType === 'purchased-ready' ? 'Stock Qty' : 'Base Qty'}
                          </th>
                          <th className={tableHeadClass}>Cost Basis</th>
                          <th className={`${tableHeadClass} text-right`}>Selling Price</th>
                          <th className={`${tableHeadClass} text-right`}>Auto Cost</th>
                          <th className={`${tableHeadClass} text-right`}>Margin</th>
                          <th className={tableHeadClass}>Default</th>
                          <th className={tableHeadClass}>Status</th>
                          <th className={`${tableHeadClass} text-right`}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formSalesVariants.map((variant) => {
                          const variantIsMenuBased = isMenuBasedSalesUnit(variant.salesUnit);
                          const variantCostBasis = getVariantCostBasisLabel(formProductionType, variant);
                          const variantCost =
                            variantIsMenuBased
                              ? 0
                              : formProductionType === 'recipe-based'
                              ? getVariantBaseQuantity(variant) * recipeCostPerYieldUnit
                              : formProductionType === 'purchased-ready'
                                ? getPurchasedReadyVariantCost(variant)
                                : 0;
                          const variantMargin = variantIsMenuBased ? 0 : (Number(variant.sellingPrice) || 0) - variantCost;

                          return (
                          <tr key={variant.id} className="border-t border-slate-200">
                            <td className={tableCellClass}>
                              <input
                                type="text"
                                value={variant.label}
                                onChange={(event) => handleUpdateVariant(variant.id, { label: event.target.value })}
                                disabled={viewMode}
                                className={inputClass}
                              />
                            </td>
                            <td className={`${tableCellClass} text-right`}>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={variant.quantity}
                                onChange={(event) => handleUpdateVariant(variant.id, { quantity: Number(event.target.value) })}
                                disabled={viewMode}
                                className={`${inputClass} text-right`}
                              />
                            </td>
                            <td className={tableCellClass}>
                              <select
                                value={variant.salesUnit}
                                onChange={(event) => handleUpdateVariant(variant.id, { salesUnit: event.target.value })}
                                disabled={viewMode}
                                className={inputClass}
                              >
                                {ensureSelectedUnitOption(salesUnitOptions, variant.salesUnit).map((unit) => (
                                  <option key={unit.code} value={unit.code}>
                                    {formatUnitOptionLabel(unit)}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className={`${tableCellClass} text-right`}>
                              {variantIsMenuBased ? (
                                <div className="font-medium text-slate-500">Not Required</div>
                              ) : (
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={variant.portionBaseQuantity ?? variant.quantity}
                                  onChange={(event) => handleUpdateVariant(variant.id, { portionBaseQuantity: Number(event.target.value) })}
                                  disabled={viewMode || (formProductionType === 'recipe-based' && !selectedRecipe)}
                                  className={`${inputClass} text-right`}
                                />
                              )}
                            </td>
                            <td className={tableCellClass}>
                              <span className="font-medium text-slate-700">{variantCostBasis}</span>
                            </td>
                            <td className={`${tableCellClass} text-right`}>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={variant.sellingPrice}
                                onChange={(event) => handleUpdateVariant(variant.id, { sellingPrice: Number(event.target.value) })}
                                disabled={viewMode}
                                className={`${inputClass} text-right`}
                              />
                            </td>
                            <td className={`${tableCellClass} text-right`}>
                              <div className="font-semibold text-slate-900">
                                {variantIsMenuBased ? 'Calculated at Menu Level' : formatCurrencyPKR(variantCost)}
                              </div>
                            </td>
                            <td className={`${tableCellClass} text-right`}>
                              <div className="font-semibold text-slate-900">
                                {variantIsMenuBased ? 'Calculated at Menu Level' : formatCurrencyPKR(variantMargin)}
                              </div>
                            </td>
                            <td className={tableCellClass}>
                              <input
                                type="radio"
                                checked={Boolean(variant.isDefault)}
                                onChange={() => handleUpdateVariant(variant.id, { isDefault: true })}
                                disabled={viewMode}
                                className="size-4 border-slate-300 text-orange-600"
                              />
                            </td>
                            <td className={tableCellClass}>
                              <select
                                value={variant.status || (variant.active === false ? 'inactive' : 'active')}
                                onChange={(event) => handleUpdateVariant(variant.id, { status: event.target.value as 'active' | 'inactive' })}
                                disabled={viewMode}
                                className={inputClass}
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </td>
                            <td className={`${tableCellClass} text-right`}>
                              {!viewMode && formSalesVariants.length > 1 ? (
                                <button
                                  onClick={() => handleRemoveVariant(variant.id)}
                                  className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  <Trash2 className="size-3.5" />
                                  Remove
                                </button>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded border border-slate-200 bg-white">
                  <div className={sectionTitleClass}>Cost Preview</div>
                  <div className="grid grid-cols-2 gap-px bg-slate-200 md:grid-cols-5">
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">
                        {formProductionType === 'recipe-based' ? 'Recipe Cost' : formProductionType === 'purchased-ready' ? 'Purchase Unit Cost' : 'Cost Basis'}
                      </div>
                      <div className="font-semibold text-slate-900">
                        {formatCurrencyPKR(
                          formProductionType === 'recipe-based' ? recipeCost : formProductionType === 'purchased-ready' ? purchasedReadyUnitCost : 0,
                        )}
                      </div>
                    </div>
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Default Variant Cost</div>
                      <div className="font-semibold text-slate-900">
                        {defaultVariantIsMenuBased ? 'Calculated at Menu Level' : formatCurrencyPKR(defaultVariantCost)}
                      </div>
                    </div>
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Default Selling Price</div>
                      <div className="font-semibold text-slate-900">{formatCurrencyPKR(defaultSellingPrice)}</div>
                    </div>
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Food Cost %</div>
                      <div className="font-semibold text-slate-900">
                        {defaultVariantIsMenuBased
                          ? 'Calculated at Menu Level'
                          : Number.isFinite(foodCostPercentage)
                            ? `${foodCostPercentage.toFixed(2)}%`
                            : '0.00%'}
                      </div>
                    </div>
                    <div className="bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-slate-500">Gross Margin</div>
                      <div className="font-semibold text-slate-900">
                        {defaultVariantIsMenuBased ? 'Calculated at Menu Level' : formatCurrencyPKR(grossMargin)}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded border border-slate-200 bg-white">
                  <div className={sectionTitleClass}>Description</div>
                  <div className="p-3">
                    <label className={labelClass}>Description</label>
                    <textarea
                      value={formDescription}
                      onChange={(event) => setFormDescription(event.target.value)}
                      disabled={viewMode}
                      className={textareaClass}
                    />
                  </div>
                </section>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                onClick={() => setDialogOpen(false)}
                className="h-8 rounded border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-white"
              >
                {viewMode ? 'Close' : 'Cancel'}
              </button>
              {!viewMode ? (
                <button
                  onClick={handleSave}
                  className="h-8 rounded border border-orange-600 bg-orange-600 px-3 text-sm font-medium text-white hover:bg-orange-700"
                >
                  {editingDish ? 'Update Dish' : 'Create Dish'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
