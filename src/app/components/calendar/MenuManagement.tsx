import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Edit2, Plus, Search, Sparkles, Tag, Trash2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { formatCurrencyPKR, formatNumberPK } from '../../lib/locale';
import { loadSetupDiscounts } from '../erp/setup/setupMasterData';
import { isDishAvailableForUsage } from '../kitchen/dishUsage';
import type { Dish, KitchenDishCategory, MenuPackage } from '../kitchen/types';

const DEFAULT_CUISINE = 'Pakistani';
const PROVIDED_MENU_CATEGORIES = [
  'Welcome Drink',
  'Soup',
  'Starters',
  'Main Dish',
  'Rice',
  'Bread',
  'Salad',
  'Dessert',
  'Tea/Coffee',
  'Other',
] as const;

const REQUIRED_MENU_GROUPS = [
  {
    label: 'Rice',
    matches: (item: ReservationMenuItem) => /rice|biryani|pulao|zarda/i.test(`${item.category} ${item.name}`),
  },
  {
    label: 'Sweet / Dessert',
    matches: (item: ReservationMenuItem) => item.category === 'Dessert' || /sweet|dessert/i.test(item.name),
  },
  {
    label: 'Salad',
    matches: (item: ReservationMenuItem) => item.category === 'Salad' || /salad|raita|kachumber/i.test(item.name),
  },
];

export interface ReservationMenuItem {
  kitchenItemId: string;
  name: string;
  category: string;
  cuisine: string;
  isVeg: boolean;
  source: 'package' | 'custom' | 'added' | 'replacement';
  originalName?: string;
}

export interface CustomerProvidedMenuItem {
  category: string;
  itemName: string;
  notes: string;
}

export interface ReservationMenuSnapshot {
  serviceMode: 'in-house' | 'catering-only';
  mode: 'package' | 'custom' | 'catering-only';
  summaryLabel: string;
  packageId?: string;
  packageName?: string;
  guaranteedGuests: number;
  basePerHeadRate: number;
  finalPerHeadRate: number;
  pricingMode?: 'fixed' | 'per-head';
  fixedAmount?: number;
  cateringPerHeadRate?: number;
  discountType: 'rs' | '%';
  discountAmount: number;
  discountPercent: number;
  discountGivenBy: string;
  discountReason: string;
  approvedBy: string;
  completenessOverrideNote: string;
  missingRequirements: string[];
  items: ReservationMenuItem[];
  customerProvidedMenu: CustomerProvidedMenuItem[];
  menuTotal: number;
}

type ReservationKitchenItemOption = {
  id: string;
  name: string;
  category: string;
  cuisine: string;
  isVeg: boolean;
};

type ReservationPackageOption = {
  id: string;
  name: string;
  description: string;
  baseRate: number;
  itemIds: string[];
};

interface MenuManagementProps {
  guaranteedGuests: number;
  onGuaranteedGuestsChange: (value: number) => void;
  onMenuSnapshotChange: (snapshot: ReservationMenuSnapshot) => void;
  initialSnapshot?: ReservationMenuSnapshot;
  kitchenDishes?: Dish[];
  kitchenDishCategories?: KitchenDishCategory[];
  kitchenMenuPackages?: MenuPackage[];
}

const toTitleCase = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const mapDishCategoryToReservationCategory = (
  category: Dish['category'],
  categoryNameMap: Map<string, string>
) => {
  const resolvedCategory = categoryNameMap.get(category) || category;
  const normalizedCategory = resolvedCategory.trim().toLowerCase();
  const normalizedCode = category.trim().toLowerCase();
  const matchableValue = `${normalizedCategory} ${normalizedCode}`;

  if (/welcome|drink|beverage|juice|tea|coffee/.test(matchableValue)) return 'Beverages';
  if (/soup/.test(matchableValue)) return 'Soup';
  if (/starter|appetizer|bbq|grill|kebab|tikka|finger|snack/.test(matchableValue)) return 'Starter';
  if (/rice|biryani|pulao|pilaf|zarda/.test(matchableValue)) return 'Rice';
  if (/bread|naan|roti|kulcha|paratha|tandoor/.test(matchableValue)) return 'Bread';
  if (/salad|raita|kachumber/.test(matchableValue)) return 'Salad';
  if (/dessert|sweet|halwa|kheer|custard|ice\s*cream/.test(matchableValue)) return 'Dessert';
  if (/main|course|curry|karahi|handi|qorma|korma|entree/.test(matchableValue)) return 'Main Dish';

  return toTitleCase(resolvedCategory.replace(/[-_]+/g, ' ')) || 'Other';
};

const toReservationItem = (
  kitchenItemId: string,
  kitchenItemOptions: ReservationKitchenItemOption[],
  source: ReservationMenuItem['source'],
  originalName?: string
): ReservationMenuItem | null => {
  const kitchenItem = kitchenItemOptions.find((item) => item.id === kitchenItemId);
  if (!kitchenItem) return null;

  return {
    kitchenItemId: kitchenItem.id,
    name: kitchenItem.name,
    category: kitchenItem.category,
    cuisine: DEFAULT_CUISINE,
    isVeg: kitchenItem.isVeg,
    source,
    originalName,
  };
};

export function MenuManagement({
  guaranteedGuests,
  onGuaranteedGuestsChange,
  onMenuSnapshotChange,
  initialSnapshot,
  kitchenDishes = [],
  kitchenDishCategories = [],
  kitchenMenuPackages = [],
}: MenuManagementProps) {
  const kitchenDishCategoryNameMap = useMemo(
    () => new Map(kitchenDishCategories.map((category) => [category.code, category.name])),
    [kitchenDishCategories]
  );
  const liveBanquetDishes = useMemo(
    () =>
      kitchenDishes.filter(
        (dish) =>
          dish.module === 'banquet' &&
          dish.status === 'approved' &&
          isDishAvailableForUsage(dish, 'customMenu'),
      ),
    [kitchenDishes]
  );
  const liveBanquetMenuPackages = useMemo(
    () => kitchenMenuPackages.filter((menuPackage) => menuPackage.module === 'banquet' && menuPackage.status === 'approved'),
    [kitchenMenuPackages]
  );
  const liveKitchenItemOptions = useMemo<ReservationKitchenItemOption[]>(
    () =>
      liveBanquetDishes.map((dish) => ({
        id: dish.id,
        name: dish.dishName,
        category: mapDishCategoryToReservationCategory(dish.category, kitchenDishCategoryNameMap),
        cuisine: dish.cuisineName || DEFAULT_CUISINE,
        isVeg: false,
      })),
    [kitchenDishCategoryNameMap, liveBanquetDishes]
  );
  const reservationKitchenItems = liveKitchenItemOptions;
  const livePackageOptions = useMemo<ReservationPackageOption[]>(
    () =>
      liveBanquetMenuPackages
        .map((menuPackage) => ({
          id: menuPackage.id,
          name: menuPackage.packageName,
          description: menuPackage.description || '',
          baseRate: menuPackage.sellingPricePerHead,
          itemIds: menuPackage.dishes.map((item) => item.dishId),
        }))
        .filter((menuPackage) => menuPackage.itemIds.length > 0),
    [liveBanquetMenuPackages]
  );
  const reservationMenuPackages = livePackageOptions;
  const [foodServiceMode, setFoodServiceMode] = useState<'in-house' | 'catering-only'>('in-house');
  const [menuMode, setMenuMode] = useState<'package' | 'custom'>('package');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedPackageLabel, setSelectedPackageLabel] = useState('');
  const [packageItems, setPackageItems] = useState<ReservationMenuItem[]>([]);
  const [customMenuItems, setCustomMenuItems] = useState<ReservationMenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [basePerHeadRate, setBasePerHeadRate] = useState(0);
  const [discountType, setDiscountType] = useState<'rs' | '%'>('rs');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountGivenBy, setDiscountGivenBy] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [showDiscountAudit, setShowDiscountAudit] = useState(false);
  const [completenessOverrideNote, setCompletenessOverrideNote] = useState('');
  const [cateringChargeMode, setCateringChargeMode] = useState<'fixed' | 'per-head'>('fixed');
  const [cateringFixedAmount, setCateringFixedAmount] = useState(0);
  const [cateringPerHeadRate, setCateringPerHeadRate] = useState(0);
  const [customerProvidedMenu, setCustomerProvidedMenu] = useState<CustomerProvidedMenuItem[]>([]);
  const activeSetupDiscounts = useMemo(
    () => loadSetupDiscounts().filter((discountConfig) => discountConfig.isActive),
    []
  );
  const selectedDiscountConfig = useMemo(
    () => activeSetupDiscounts.find((discountConfig) => discountConfig.discountCategory === discountGivenBy),
    [activeSetupDiscounts, discountGivenBy]
  );
  const isMenuStatePristine =
    foodServiceMode === 'in-house' &&
    menuMode === 'package' &&
    !selectedPackageId &&
    !selectedPackageLabel &&
    packageItems.length === 0 &&
    customMenuItems.length === 0 &&
    !searchQuery &&
    basePerHeadRate === 0 &&
    discountType === 'rs' &&
    discountAmount === 0 &&
    discountPercent === 0 &&
    !discountGivenBy &&
    !discountReason &&
    !approvedBy &&
    !completenessOverrideNote &&
    cateringChargeMode === 'fixed' &&
    cateringFixedAmount === 0 &&
    cateringPerHeadRate === 0 &&
    customerProvidedMenu.length === 0;

  const selectedPackage = reservationMenuPackages.find((pkg) => pkg.id === selectedPackageId);
  const displayPackageLabel = selectedPackage?.name || selectedPackageLabel;
  const historicalPackageOption =
    selectedPackageId && !selectedPackage && selectedPackageLabel
      ? {
          id: selectedPackageId,
          name: selectedPackageLabel,
          description: 'Previously selected package',
          baseRate: basePerHeadRate,
          itemIds: [],
        }
      : null;
  const availablePackageOptions = historicalPackageOption
    ? [historicalPackageOption, ...reservationMenuPackages]
    : reservationMenuPackages;
  const selectedItems = menuMode === 'package' ? packageItems : customMenuItems;

  const filteredKitchenItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return reservationKitchenItems.filter((item) =>
      [item.cuisine, item.category, item.name].some((value) => value.toLowerCase().includes(query))
    );
  }, [reservationKitchenItems, searchQuery]);

  const groupedSelectedItems = useMemo(() => {
    return selectedItems.reduce<Record<string, ReservationMenuItem[]>>((groups, item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
      return groups;
    }, {});
  }, [selectedItems]);

  const missingRequirements = useMemo(() => {
    if (foodServiceMode !== 'in-house' || selectedItems.length === 0) return [];
    return REQUIRED_MENU_GROUPS.filter((requirement) => !selectedItems.some(requirement.matches)).map(
      (requirement) => requirement.label
    );
  }, [foodServiceMode, selectedItems]);

  const pricingBaseRate =
    foodServiceMode === 'in-house'
      ? basePerHeadRate
      : cateringChargeMode === 'fixed'
        ? guaranteedGuests > 0
          ? cateringFixedAmount / guaranteedGuests
          : 0
        : cateringPerHeadRate;
  const maxDiscountAmount =
    selectedDiscountConfig?.discountType === 'fixed-per-head'
      ? selectedDiscountConfig.maximumValue
      : selectedDiscountConfig
        ? (pricingBaseRate * selectedDiscountConfig.maximumValue) / 100
        : Number.POSITIVE_INFINITY;
  const maxDiscountPercent =
    selectedDiscountConfig?.discountType === 'percentage'
      ? selectedDiscountConfig.maximumValue
      : selectedDiscountConfig && pricingBaseRate > 0
        ? (selectedDiscountConfig.maximumValue / pricingBaseRate) * 100
        : Number.POSITIVE_INFINITY;
  const finalPerHeadRate = Math.max(0, pricingBaseRate - discountAmount);
  const menuTotal = Math.max(0, finalPerHeadRate * guaranteedGuests);

  useEffect(() => {
    if (!selectedDiscountConfig) return;

    const configuredType = selectedDiscountConfig.discountType === 'percentage' ? '%' : 'rs';
    if (discountType !== configuredType) {
      setDiscountType(configuredType);
    }
  }, [discountType, selectedDiscountConfig]);

  useEffect(() => {
    if (!initialSnapshot || !isMenuStatePristine) return;

    setFoodServiceMode(initialSnapshot.serviceMode);
    setMenuMode(initialSnapshot.mode === 'custom' ? 'custom' : 'package');
    setSelectedPackageId(initialSnapshot.packageId || '');
    setSelectedPackageLabel(initialSnapshot.packageName || initialSnapshot.summaryLabel || '');
    setPackageItems(initialSnapshot.mode === 'package' ? initialSnapshot.items : []);
    setCustomMenuItems(initialSnapshot.mode === 'custom' ? initialSnapshot.items : []);
    setBasePerHeadRate(initialSnapshot.basePerHeadRate || 0);
    setDiscountType(initialSnapshot.discountType);
    setDiscountAmount(initialSnapshot.discountAmount || 0);
    setDiscountPercent(initialSnapshot.discountPercent || 0);
    setDiscountGivenBy(initialSnapshot.discountGivenBy || '');
    setDiscountReason(initialSnapshot.discountReason || '');
    setApprovedBy(initialSnapshot.approvedBy || '');
    setCompletenessOverrideNote(initialSnapshot.completenessOverrideNote || '');
    setCateringChargeMode(initialSnapshot.pricingMode || 'fixed');
    setCateringFixedAmount(initialSnapshot.fixedAmount || 0);
    setCateringPerHeadRate(initialSnapshot.cateringPerHeadRate || 0);
    setCustomerProvidedMenu(initialSnapshot.customerProvidedMenu || []);
  }, [initialSnapshot, isMenuStatePristine]);

  useEffect(() => {
    onMenuSnapshotChange({
      serviceMode: foodServiceMode,
      mode: foodServiceMode === 'in-house' ? menuMode : 'catering-only',
      summaryLabel:
        foodServiceMode === 'in-house'
          ? displayPackageLabel || (menuMode === 'custom' ? 'Custom Menu' : 'Package Menu')
          : 'Catering Only',
      packageId: foodServiceMode === 'in-house' ? selectedPackageId || undefined : undefined,
      packageName: foodServiceMode === 'in-house' ? displayPackageLabel || undefined : undefined,
      guaranteedGuests,
      basePerHeadRate: pricingBaseRate,
      finalPerHeadRate,
      pricingMode: foodServiceMode === 'catering-only' ? cateringChargeMode : undefined,
      fixedAmount: foodServiceMode === 'catering-only' ? cateringFixedAmount : undefined,
      cateringPerHeadRate: foodServiceMode === 'catering-only' ? cateringPerHeadRate : undefined,
      discountType,
      discountAmount,
      discountPercent,
      discountGivenBy,
      discountReason,
      approvedBy,
      completenessOverrideNote: foodServiceMode === 'in-house' ? completenessOverrideNote : '',
      missingRequirements,
      items: foodServiceMode === 'in-house' ? selectedItems : [],
      customerProvidedMenu,
      menuTotal,
    });
  }, [
    approvedBy,
    basePerHeadRate,
    cateringChargeMode,
    cateringFixedAmount,
    cateringPerHeadRate,
    completenessOverrideNote,
    customerProvidedMenu,
    discountAmount,
    discountGivenBy,
    discountPercent,
    discountReason,
    discountType,
    finalPerHeadRate,
    foodServiceMode,
    guaranteedGuests,
    menuMode,
    menuTotal,
    missingRequirements,
    onMenuSnapshotChange,
    selectedItems,
    selectedPackage,
    selectedPackageId,
    displayPackageLabel,
  ]);

  const hasInHouseData =
    Boolean(selectedPackageId) ||
    packageItems.length > 0 ||
    customMenuItems.length > 0 ||
    basePerHeadRate > 0 ||
    discountAmount > 0 ||
    discountPercent > 0;

  const hasCateringOnlyData =
    cateringFixedAmount > 0 ||
    cateringPerHeadRate > 0 ||
    customerProvidedMenu.some((row) => row.category || row.itemName || row.notes);

  const switchFoodServiceMode = (nextMode: 'in-house' | 'catering-only') => {
    if (nextMode === foodServiceMode) return;

    const shouldWarn =
      (nextMode === 'catering-only' && hasInHouseData) || (nextMode === 'in-house' && hasCateringOnlyData);

    if (
      shouldWarn &&
      !window.confirm('Switching modes will hide existing entered data, but it will be preserved. Continue?')
    ) {
      return;
    }

    setFoodServiceMode(nextMode);
  };

  const syncDiscountFromAmount = (amount: number, nextBaseRate = pricingBaseRate) => {
    const configuredLimit =
      selectedDiscountConfig?.discountType === 'fixed-per-head'
        ? selectedDiscountConfig.maximumValue
        : selectedDiscountConfig
          ? (nextBaseRate * selectedDiscountConfig.maximumValue) / 100
          : Number.POSITIVE_INFINITY;
    const safeAmount = Math.min(Math.max(0, amount), configuredLimit);
    const safePercent = nextBaseRate > 0 ? (safeAmount / nextBaseRate) * 100 : 0;
    setDiscountAmount(safeAmount);
    setDiscountPercent(Number(safePercent.toFixed(2)));
  };

  const syncDiscountFromPercent = (percent: number, nextBaseRate = pricingBaseRate) => {
    const configuredLimit =
      selectedDiscountConfig?.discountType === 'percentage'
        ? selectedDiscountConfig.maximumValue
        : selectedDiscountConfig && nextBaseRate > 0
          ? (selectedDiscountConfig.maximumValue / nextBaseRate) * 100
          : Number.POSITIVE_INFINITY;
    const safePercent = Math.min(Math.max(0, percent), configuredLimit);
    const safeAmount = (nextBaseRate * safePercent) / 100;
    setDiscountPercent(safePercent);
    setDiscountAmount(Number(safeAmount.toFixed(2)));
  };

  const handleBaseRateChange = (value: number) => {
    const nextBaseRate = Math.max(0, value);
    setBasePerHeadRate(nextBaseRate);
    if (discountType === 'rs') {
      syncDiscountFromAmount(discountAmount, nextBaseRate);
    } else {
      syncDiscountFromPercent(discountPercent, nextBaseRate);
    }
  };

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackageId(packageId);
    const pkg = reservationMenuPackages.find((item) => item.id === packageId);
    if (!pkg) {
      setSelectedPackageLabel('');
      setPackageItems([]);
      setBasePerHeadRate(0);
      return;
    }

    setSelectedPackageLabel(pkg.name);
    setPackageItems(
      pkg.itemIds
        .map((itemId) => toReservationItem(itemId, reservationKitchenItems, 'package'))
        .filter((item): item is ReservationMenuItem => Boolean(item))
    );
    setBasePerHeadRate(pkg.baseRate);
    setSearchQuery('');
  };

  const handleReplaceItem = (mode: 'package' | 'custom', index: number, kitchenItemId: string) => {
    const currentItems = mode === 'package' ? packageItems : customMenuItems;
    const replacement = toReservationItem(kitchenItemId, reservationKitchenItems, 'replacement', currentItems[index]?.name);
    if (!replacement) return;

    const updatedItems = [...currentItems];
    updatedItems[index] = replacement;

    if (mode === 'package') {
      setPackageItems(updatedItems);
    } else {
      setCustomMenuItems(updatedItems);
    }
  };

  const handleDeleteItem = (mode: 'package' | 'custom', index: number) => {
    if (mode === 'package') {
      setPackageItems(packageItems.filter((_, itemIndex) => itemIndex !== index));
      return;
    }

    setCustomMenuItems(customMenuItems.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleAddSearchResult = (kitchenItemId: string) => {
    const item = toReservationItem(
      kitchenItemId,
      reservationKitchenItems,
      menuMode === 'package' ? 'added' : 'custom'
    );
    if (!item) return;

    if (menuMode === 'package') {
      setPackageItems((current) => [...current, item]);
    } else {
      setCustomMenuItems((current) => [...current, item]);
    }

    setSearchQuery('');
  };

  const categoryOptions = (category: string, currentItem?: ReservationMenuItem) => {
    const liveMatches = reservationKitchenItems.filter((item) => item.category === category);
    const options = currentItem
      ? [
          ...liveMatches,
          {
            id: currentItem.kitchenItemId,
            name: currentItem.name,
            category: currentItem.category,
            cuisine: currentItem.cuisine || DEFAULT_CUISINE,
            isVeg: currentItem.isVeg,
          },
        ]
      : liveMatches;

    return options.filter(
      (option, index, allOptions) => allOptions.findIndex((candidate) => candidate.id === option.id) === index
    );
  };

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <h2 className="flex h-9 items-center gap-2 text-base font-semibold text-gray-900">
          <Sparkles className="size-5 text-blue-600" />
          Food & Catering
        </h2>

        <div className="flex flex-wrap items-start gap-3">
          <div className="w-[110px]">
            <label className="mb-1 block text-xs font-semibold text-gray-700">Guests</label>
            <Input
              type="number"
              value={guaranteedGuests || ''}
              onChange={(e) => onGuaranteedGuestsChange(Number(e.target.value))}
              placeholder="500"
              className="h-9 w-full border-blue-500 px-2 text-sm"
              maxLength={5}
            />
          </div>

          <div className="w-[320px]">
            <label className="mb-1 block text-xs font-semibold text-gray-700">Service Mode</label>
            <div className="flex h-9 gap-1 rounded-md bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => switchFoodServiceMode('in-house')}
                className={`flex-1 rounded px-3 text-sm font-medium ${
                  foodServiceMode === 'in-house' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                }`}
              >
                Food & Catering
              </button>
              <button
                type="button"
                onClick={() => switchFoodServiceMode('catering-only')}
                className={`flex-1 rounded px-3 text-sm font-medium ${
                  foodServiceMode === 'catering-only' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                }`}
              >
                Catering Only
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {foodServiceMode === 'in-house' && (
            <>
              <div className="flex w-[220px] gap-1 rounded-md bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setMenuMode('package')}
                  className={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${
                    menuMode === 'package' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Package
                </button>
                <button
                  type="button"
                  onClick={() => setMenuMode('custom')}
                  className={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${
                    menuMode === 'custom' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Custom
                </button>
              </div>

              {menuMode === 'package' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Kitchen Package</label>
                  <select
                    value={selectedPackageId}
                    onChange={(e) => handlePackageSelect(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select package from Kitchen Module</option>
                    {availablePackageOptions.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} - {formatCurrencyPKR(pkg.baseRate)} / head
                      </option>
                    ))}
                  </select>
                  {selectedPackage && <p className="mt-1 text-[11px] text-gray-600">{selectedPackage.description}</p>}
                  {availablePackageOptions.length === 0 && (
                    <p className="mt-1 text-[11px] text-amber-700">
                      No approved Menu Engineering packages are available yet.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Search Kitchen Menu</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cuisine, category, or item name"
                    className="w-full pl-9 pr-9"
                    disabled={reservationKitchenItems.length === 0}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                {searchQuery && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white">
                    {filteredKitchenItems.length > 0 ? (
                      <div className="space-y-1 p-1.5">
                        {filteredKitchenItems.map((item) => (
                          <div
                            key={item.id}
                            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_52px] items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-blue-50"
                          >
                            <div className="truncate font-semibold text-gray-900">{item.name}</div>
                            <div className="truncate text-[10px] text-gray-500">
                              {DEFAULT_CUISINE} &gt; {item.category}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddSearchResult(item.id)}
                              className="text-[10px] font-semibold text-blue-600"
                            >
                              Select
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-4 text-center text-xs text-gray-500">
                        {reservationKitchenItems.length === 0
                          ? 'No approved Menu Engineering items are available yet'
                          : 'No kitchen items found'}
                      </p>
                    )}
                  </div>
                )}
                {reservationKitchenItems.length === 0 && !searchQuery && (
                  <p className="mt-1 text-[11px] text-amber-700">
                    Approve banquet dishes in Menu Engineering to search and add items here.
                  </p>
                )}
              </div>

              <div className="space-y-2 rounded-md border border-gray-200 bg-white p-3">
                {Object.keys(groupedSelectedItems).length > 0 ? (
                  Object.entries(groupedSelectedItems).map(([category, items]) => (
                    <div key={category} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{category}</div>
                        <div className="text-[10px] text-gray-500">{items.length} selected</div>
                      </div>
                      <div className="space-y-1">
                        {items.map((item) => {
                          const itemIndex = selectedItems.findIndex(
                            (selected) =>
                              selected.kitchenItemId === item.kitchenItemId &&
                              selected.name === item.name &&
                              selected.source === item.source
                          );

                          return (
                            <div
                              key={`${item.kitchenItemId}-${itemIndex}`}
                              className="grid items-center gap-2 rounded border border-gray-100 bg-gray-50 px-2 py-1.5 md:grid-cols-[minmax(0,1fr)_180px_36px]"
                            >
                              <div className="truncate text-sm font-medium text-gray-900">{item.name}</div>
                              <select
                                value={item.kitchenItemId}
                                onChange={(e) => handleReplaceItem(menuMode, itemIndex, e.target.value)}
                                className="rounded border border-gray-300 px-2 py-1 text-xs"
                              >
                                {categoryOptions(item.category, item).map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(menuMode, itemIndex)}
                                className="rounded p-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                                title="Delete item"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-gray-500">
                    {menuMode === 'package'
                      ? 'Select a Kitchen Module package to begin.'
                      : 'Search and select Kitchen Module items to build a custom menu.'}
                  </div>
                )}
              </div>

              {missingRequirements.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 size-4 text-amber-700" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-amber-900">
                        Missing recommended categories: {missingRequirements.join(', ')}
                      </div>
                      <div className="mt-1 text-[11px] text-amber-800">
                        You can continue, but add an override note if this menu is intentionally incomplete.
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="mb-1 block text-[10px] font-semibold text-amber-900">Override note</label>
                    <Input
                      value={completenessOverrideNote}
                      onChange={(e) => setCompletenessOverrideNote(e.target.value)}
                      placeholder="Reason for continuing without all recommended categories"
                      className="text-xs"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {foodServiceMode === 'catering-only' && (
            <>
              <div className="rounded-md border border-gray-200 bg-white p-3">
                <div className="mb-2 flex w-[220px] gap-1 rounded-md bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => setCateringChargeMode('fixed')}
                    className={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${
                      cateringChargeMode === 'fixed' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    Fixed Amount
                  </button>
                  <button
                    type="button"
                    onClick={() => setCateringChargeMode('per-head')}
                    className={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${
                      cateringChargeMode === 'per-head' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    Per Head
                  </button>
                </div>

                {cateringChargeMode === 'fixed' ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">Fixed Catering Charge</label>
                      <Input
                        type="number"
                        value={cateringFixedAmount || ''}
                        onChange={(e) => setCateringFixedAmount(Number(e.target.value))}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">Effective Per Head</label>
                      <div className="flex h-9 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-900">
                        {formatCurrencyPKR(finalPerHeadRate)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">Catering Rate / Head</label>
                      <Input
                        type="number"
                        value={cateringPerHeadRate || ''}
                        onChange={(e) => setCateringPerHeadRate(Number(e.target.value))}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">Total Catering Charge</label>
                      <div className="flex h-9 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-900">
                        {formatCurrencyPKR(menuTotal)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-md border border-gray-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Customer Provided Menu</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCustomerProvidedMenu((current) => [
                        ...current,
                        { category: 'Main Dish', itemName: '', notes: '' },
                      ])
                    }
                    className="h-7 px-2 text-[11px]"
                  >
                    <Plus className="mr-1 size-3" />
                    Add Row
                  </Button>
                </div>

                {customerProvidedMenu.length > 0 ? (
                  <div className="space-y-2">
                    {customerProvidedMenu.map((row, index) => (
                      <div
                        key={`${row.category}-${index}`}
                        className="grid gap-2 rounded border border-gray-100 bg-gray-50 p-2 md:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_36px]"
                      >
                        <select
                          value={row.category}
                          onChange={(e) =>
                            setCustomerProvidedMenu((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, category: e.target.value } : item
                              )
                            )
                          }
                          className="rounded border border-gray-300 px-2 py-1 text-xs"
                        >
                          {PROVIDED_MENU_CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                        <Input
                          value={row.itemName}
                          onChange={(e) =>
                            setCustomerProvidedMenu((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, itemName: e.target.value } : item
                              )
                            )
                          }
                          placeholder="Item name"
                          className="text-xs"
                        />
                        <Input
                          value={row.notes}
                          onChange={(e) =>
                            setCustomerProvidedMenu((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, notes: e.target.value } : item
                              )
                            )
                          }
                          placeholder="Notes"
                          className="text-xs"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setCustomerProvidedMenu((current) => current.filter((_, itemIndex) => itemIndex !== index))
                          }
                          className="rounded p-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                          title="Delete row"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-gray-500">
                    Add customer-provided menu rows for banquet planning only.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            {foodServiceMode === 'in-house' && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-semibold text-gray-700">Base Per Head Rate</label>
                <Input
                  type="number"
                  value={basePerHeadRate || ''}
                  onChange={(e) => handleBaseRateChange(Number(e.target.value))}
                  placeholder="Kitchen / Accounts committed rate"
                  className="w-full"
                />
              </div>
            )}

            {foodServiceMode === 'catering-only' && (
              <div className="mb-3 text-xs text-gray-600">
                Kitchen menu selection is hidden in Catering Only. Pricing uses catering service only.
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowDiscountAudit((current) => !current)}
              className="flex w-full items-center justify-between border-y border-gray-200 py-2 text-left"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <Tag className="size-3.5 text-blue-600" />
                Discount Audit
              </span>
              <span className="text-[10px] text-gray-500">{showDiscountAudit ? 'Hide' : 'Optional'}</span>
            </button>

            {showDiscountAudit && (
              <div className="space-y-3 pt-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold text-gray-600">Discount Type</label>
                  <div className="flex gap-2 rounded-md bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setDiscountType('rs')}
                      className={`flex-1 rounded px-2 py-1 text-xs ${
                        discountType === 'rs' ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-600'
                      }`}
                    >
                      Rs
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('%')}
                      className={`flex-1 rounded px-2 py-1 text-xs ${
                        discountType === '%' ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-600'
                      }`}
                    >
                      %
                    </button>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-gray-600">Discount Amount</label>
                    <Input
                      type="number"
                      value={discountAmount || ''}
                      onChange={(e) => syncDiscountFromAmount(Number(e.target.value))}
                      disabled={discountType !== 'rs'}
                      max={Number.isFinite(maxDiscountAmount) ? maxDiscountAmount : undefined}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-gray-600">Discount Percentage</label>
                    <Input
                      type="number"
                      value={discountPercent || ''}
                      onChange={(e) => syncDiscountFromPercent(Number(e.target.value))}
                      disabled={discountType !== '%'}
                      max={Number.isFinite(maxDiscountPercent) ? maxDiscountPercent : undefined}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-gray-600">
                      <Edit2 className="size-3 text-blue-600" />
                      Discount Category
                    </label>
                    <select
                      value={discountGivenBy}
                      onChange={(e) => setDiscountGivenBy(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs"
                    >
                      <option value="">Select setup discount</option>
                      {activeSetupDiscounts.map((discountConfig) => (
                        <option key={discountConfig.id} value={discountConfig.discountCategory}>
                          {discountConfig.discountCategory}
                        </option>
                      ))}
                    </select>
                    {selectedDiscountConfig && (
                      <p className="mt-1 text-[10px] text-gray-500">
                        Max {selectedDiscountConfig.discountType === 'percentage'
                          ? `${selectedDiscountConfig.maximumValue}%`
                          : formatCurrencyPKR(selectedDiscountConfig.maximumValue)} per head
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-gray-600">Discount Reason</label>
                    <Input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} className="text-xs" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-gray-600">Approved By (optional)</label>
                    <Input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} className="text-xs" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-md border border-gray-200 bg-white p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Summary</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Guaranteed Guests</span>
                <span className="font-semibold text-gray-900">{formatNumberPK(guaranteedGuests)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">
                  {foodServiceMode === 'in-house' ? 'Base Per Head Rate' : 'Base Catering Rate'}
                </span>
                <span className="font-semibold text-gray-900">{formatCurrencyPKR(pricingBaseRate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Discount</span>
                <span className="font-semibold text-gray-900">
                  {discountAmount > 0 ? `${formatCurrencyPKR(discountAmount)} (${discountPercent.toFixed(2)}%)` : '-'}
                </span>
              </div>
              {foodServiceMode === 'catering-only' && cateringChargeMode === 'fixed' && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Fixed Catering Charge</span>
                  <span className="font-semibold text-gray-900">{formatCurrencyPKR(cateringFixedAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Final Per Head Rate</span>
                <span className="font-semibold text-gray-900">{formatCurrencyPKR(finalPerHeadRate)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">
                    {foodServiceMode === 'in-house' ? 'Menu Total' : 'Catering Total'}
                  </span>
                  <span className="text-base font-bold text-blue-700">{formatCurrencyPKR(menuTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
