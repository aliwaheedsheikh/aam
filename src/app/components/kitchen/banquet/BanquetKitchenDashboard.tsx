import { useEffect, useState } from 'react';
import { BanquetDispatchIssueSheet } from './BanquetDispatchIssueSheet';
import { BanquetIngredientRequirement } from './BanquetIngredientRequirement';
import { BanquetProductionPlanning } from './BanquetProductionPlanning';
import { CentralKitchenPlanning } from './CentralKitchenPlanning';
import { Booking } from '../../calendar/types-v2';
import { Dish, KitchenIssueSheet, MenuPackage, PurchaseItem, Recipe, StoreMaster, StoreStock, UnitMaster } from '../types';

type BanquetKitchenTab =
  | 'director-planning'
  | 'ingredient-requirement'
  | 'store-issue'
  | 'dispatch';

interface BanquetKitchenDashboardProps {
  userName: string;
  bookings: Booking[];
  dishes: Dish[];
  stores: StoreMaster[];
  recipes: Recipe[];
  menuPackages: MenuPackage[];
  purchaseItems: PurchaseItem[];
  storeStocks: StoreStock[];
  units: UnitMaster[];
  issueSheets: KitchenIssueSheet[];
  onStoreStocksChange: (stocks: StoreStock[]) => void;
  onIssueSheetsChange: (issueSheets: KitchenIssueSheet[]) => void;
  initialTab?: BanquetKitchenTab;
}

export function BanquetKitchenDashboard({
  userName,
  bookings,
  dishes,
  stores,
  recipes,
  menuPackages,
  purchaseItems,
  storeStocks,
  units,
  issueSheets,
  onStoreStocksChange,
  onIssueSheetsChange,
  initialTab = 'director-planning',
}: BanquetKitchenDashboardProps) {
  const [activeTab, setActiveTab] = useState<BanquetKitchenTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b flex-shrink-0">
        <div className="px-6 py-3 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <span className="text-2xl">K</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Banquet &amp; Central Kitchen Operations</h1>
              <p className="text-sm text-gray-500">Planning, costing, issuing, and dispatch for confirmed banquet events and kitchen-linked outside service orders</p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 px-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('director-planning')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'director-planning'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            F&amp;B Director Planning
          </button>
          <button
            onClick={() => setActiveTab('ingredient-requirement')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'ingredient-requirement'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Ingredient Requirement
          </button>
          <button
            onClick={() => setActiveTab('store-issue')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'store-issue'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Live Store Issue
          </button>
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'dispatch'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Dispatch & Issue Sheet
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'director-planning' && (
          <CentralKitchenPlanning
            userName={userName}
            bookings={bookings}
            dishes={dishes}
            recipes={recipes}
            menuPackages={menuPackages}
            purchaseItems={purchaseItems}
            stores={stores}
            units={units}
          />
        )}
        {activeTab === 'ingredient-requirement' && (
          <BanquetIngredientRequirement
            bookings={bookings}
            dishes={dishes}
            stores={stores}
            recipes={recipes}
            menuPackages={menuPackages}
            purchaseItems={purchaseItems}
            storeStocks={storeStocks}
            units={units}
            issueSheets={issueSheets}
          />
        )}
        {activeTab === 'store-issue' && (
          <BanquetProductionPlanning
            userName={userName}
            bookings={bookings}
            dishes={dishes}
            stores={stores}
            recipes={recipes}
            menuPackages={menuPackages}
            purchaseItems={purchaseItems}
            storeStocks={storeStocks}
            units={units}
            issueSheets={issueSheets}
            onStoreStocksChange={onStoreStocksChange}
            onIssueSheetsChange={onIssueSheetsChange}
          />
        )}
        {activeTab === 'dispatch' && (
          <BanquetDispatchIssueSheet
            bookings={bookings}
            dishes={dishes}
            stores={stores}
            recipes={recipes}
            menuPackages={menuPackages}
            purchaseItems={purchaseItems}
            storeStocks={storeStocks}
            units={units}
            issueSheets={issueSheets}
          />
        )}
      </div>
    </div>
  );
}
