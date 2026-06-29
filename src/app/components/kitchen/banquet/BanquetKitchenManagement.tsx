import { useEffect, useState } from 'react';
import { ChefHat, List, Package, UtensilsCrossed, FileText, GitBranch, Tags, Calculator, Settings2 } from 'lucide-react';
import { Cuisine, Dish, PurchaseItem, Recipe, MenuPackage, KitchenStation, KitchenDishCategory, MenuPackageTypeMaster, ProductionCostMethod, Vendor, StoreMaster, StoreStock, UnitMaster, ProcurementLookupState, VendorItemMapping } from '../types';
import { CuisineMaster } from '../shared/CuisineMaster';
import { DishCategoryMaster } from '../shared/DishCategoryMaster';
import { KitchenStationMaster } from '../shared/KitchenStationMaster';
import { PurchaseItemMaster } from '../shared/PurchaseItemMaster';
import { BanquetDishMaster } from './BanquetDishMaster';
import { RecipeCosting } from './RecipeCosting';
import { MenuPackageBuilder } from './MenuPackageBuilder';
import { GuestCountPricingEngine } from './GuestCountPricingEngine';
import { ProductionCostMethodMaster } from './ProductionCostMethodMaster';

const BANQUET_KITCHEN_SUBMODULE_STORAGE_KEY = 'venueops:banquet-kitchen-submodule';

interface BanquetKitchenManagementProps {
  userName: string;
  cuisines: Cuisine[];
  dishCategories: KitchenDishCategory[];
  kitchenStations: KitchenStation[];
  dishes: Dish[];
  stores: StoreMaster[];
  purchaseItems: PurchaseItem[];
  storeStocks: StoreStock[];
  units: UnitMaster[];
  vendors: Vendor[];
  vendorItemMappings: VendorItemMapping[];
  procurementLookups: ProcurementLookupState;
  recipes: Recipe[];
  productionCostMethods: ProductionCostMethod[];
  menuPackages: MenuPackage[];
  menuPackageTypes: MenuPackageTypeMaster[];
  onCuisinesChange: (cuisines: Cuisine[]) => void;
  onDishCategoriesChange: (categories: KitchenDishCategory[]) => void;
  onKitchenStationsChange: (stations: KitchenStation[]) => void;
  onUnitsChange: (units: UnitMaster[]) => void;
  onDishesChange: (dishes: Dish[]) => void;
  onPurchaseItemsChange: (items: PurchaseItem[]) => void;
  onVendorItemMappingsChange: (mappings: VendorItemMapping[]) => void;
  onProcurementLookupsChange: (lookups: ProcurementLookupState) => void;
  onStoreStocksChange: (stocks: StoreStock[]) => void;
  onRecipesChange: (recipes: Recipe[]) => void;
  onProductionCostMethodsChange: (methods: ProductionCostMethod[]) => void;
  onMenuPackagesChange: (packages: MenuPackage[]) => void;
  onMenuPackageTypesChange: (types: MenuPackageTypeMaster[]) => void;
}

type SubModule =
  | 'cuisine-master'
  | 'dish-categories'
  | 'kitchen-stations'
  | 'dish-master'
  | 'recipe-costing'
  | 'production-cost-methods'
  | 'menu-builder'
  | 'guest-pricing'
  | 'purchase-items';

export function BanquetKitchenManagement({
  userName,
  cuisines,
  dishCategories,
  kitchenStations,
  dishes,
  stores,
  purchaseItems,
  storeStocks,
  units,
  vendors,
  vendorItemMappings,
  procurementLookups,
  recipes,
  productionCostMethods,
  menuPackages,
  menuPackageTypes,
  onCuisinesChange,
  onDishCategoriesChange,
  onKitchenStationsChange,
  onUnitsChange,
  onDishesChange,
  onPurchaseItemsChange,
  onVendorItemMappingsChange,
  onProcurementLookupsChange,
  onStoreStocksChange,
  onRecipesChange,
  onProductionCostMethodsChange,
  onMenuPackagesChange,
  onMenuPackageTypesChange,
}: BanquetKitchenManagementProps) {
  const [activeSubModule, setActiveSubModule] = useState<SubModule>(() => {
    if (typeof window === 'undefined') {
      return 'dish-master';
    }

    const stored = window.localStorage.getItem(BANQUET_KITCHEN_SUBMODULE_STORAGE_KEY);
    return (stored as SubModule) || 'dish-master';
  });

  const subModules = [
    { id: 'cuisine-master' as SubModule, name: 'Cuisine Master', icon: List },
    { id: 'dish-categories' as SubModule, name: 'Dish Categories', icon: Tags },
    { id: 'kitchen-stations' as SubModule, name: 'Kitchen Stations', icon: GitBranch },
    { id: 'dish-master' as SubModule, name: 'Dish Master', icon: UtensilsCrossed },
    { id: 'recipe-costing' as SubModule, name: 'Recipe & Costing', icon: FileText },
    { id: 'production-cost-methods' as SubModule, name: 'Production Cost Methods', icon: Settings2 },
    { id: 'menu-builder' as SubModule, name: 'Menu Package Builder', icon: ChefHat },
    { id: 'guest-pricing' as SubModule, name: 'Menu Guest Count Rate Evaluation', icon: Calculator },
    { id: 'purchase-items' as SubModule, name: 'Purchase Items', icon: Package },
  ];

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(BANQUET_KITCHEN_SUBMODULE_STORAGE_KEY, activeSubModule);
  }, [activeSubModule]);

  const renderSubModule = () => {
    switch (activeSubModule) {
      case 'cuisine-master':
        return (
          <CuisineMaster
            module="banquet"
            userName={userName}
            cuisines={cuisines}
            dishes={dishes}
            onCuisinesChange={onCuisinesChange}
          />
        );

      case 'kitchen-stations':
        return (
          <KitchenStationMaster
            module="banquet"
            userName={userName}
            stores={stores}
            stations={kitchenStations}
            dishes={dishes}
            recipes={recipes}
            onStationsChange={onKitchenStationsChange}
          />
        );

      case 'dish-categories':
        return (
          <DishCategoryMaster
            module="banquet"
            userName={userName}
            categories={dishCategories}
            dishes={dishes}
            onCategoriesChange={onDishCategoriesChange}
          />
        );

      case 'dish-master':
        return (
          <BanquetDishMaster
            userName={userName}
            cuisines={cuisines.filter(c => c.module === 'banquet' && c.status === 'active')}
            dishCategories={dishCategories.filter(
              (category) => (category.module === 'banquet' || category.module === 'shared') && category.status === 'active',
            )}
            kitchenStations={kitchenStations.filter(
              (station) => (station.module === 'banquet' || station.module === 'shared') && station.status === 'active',
            )}
            dishes={dishes}
            purchaseItems={purchaseItems}
            units={units}
            vendors={vendors.filter((vendor) => vendor.status === 'active')}
            recipes={recipes}
            onDishesChange={onDishesChange}
          />
        );

      case 'recipe-costing':
        return (
          <RecipeCosting
            userName={userName}
            dishes={dishes}
            recipes={recipes}
            purchaseItems={purchaseItems}
            units={units}
            productionCostMethods={productionCostMethods}
            menuPackages={menuPackages}
            onDishesChange={onDishesChange}
            onRecipesChange={onRecipesChange}
            onMenuPackagesChange={onMenuPackagesChange}
          />
        );

      case 'production-cost-methods':
        return (
          <ProductionCostMethodMaster
            userName={userName}
            methods={productionCostMethods}
            recipes={recipes}
            onMethodsChange={onProductionCostMethodsChange}
          />
        );

      case 'menu-builder':
        return (
          <MenuPackageBuilder
            userName={userName}
            dishes={dishes}
            purchaseItems={purchaseItems}
            recipes={recipes}
            menuPackages={menuPackages}
            menuPackageTypes={menuPackageTypes}
            units={units}
            onMenuPackagesChange={onMenuPackagesChange}
            onMenuPackageTypesChange={onMenuPackageTypesChange}
          />
        );

      case 'guest-pricing':
        return <GuestCountPricingEngine menuPackages={menuPackages} />;

      case 'purchase-items':
        return (
          <PurchaseItemMaster
            stores={stores}
            purchaseItems={purchaseItems}
            storeStocks={storeStocks}
            units={units}
            vendors={vendors}
            vendorItemMappings={vendorItemMappings}
            procurementLookups={procurementLookups}
            onPurchaseItemsChange={onPurchaseItemsChange}
            onVendorItemMappingsChange={onVendorItemMappingsChange}
            onProcurementLookupsChange={onProcurementLookupsChange}
            onStoreStocksChange={onStoreStocksChange}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with Sub-Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-4 py-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Banquet & Catering Kitchen</h1>
              <p className="text-xs text-gray-600">Master data management for banquet operations</p>
            </div>
            <div className="flex items-center gap-2 rounded border border-orange-200 bg-orange-50 px-2 py-1">
              <ChefHat className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-900">{userName}</span>
            </div>
          </div>

          {/* Sub-module tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {subModules.map((module) => {
              const Icon = module.icon;
              return (
                <button
                  key={module.id}
                  onClick={() => setActiveSubModule(module.id)}
                  className={`flex h-8 items-center gap-1.5 rounded px-3 text-sm whitespace-nowrap transition-colors ${
                    activeSubModule === module.id
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {module.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sub-module Content */}
      <div className="flex-1 overflow-hidden">
        {renderSubModule()}
      </div>
    </div>
  );
}
