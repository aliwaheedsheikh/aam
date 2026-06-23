import { useState } from 'react';
import { RestaurantRecipeManagement } from './RestaurantRecipeManagement';
import { RestaurantProductionPlanning } from './RestaurantProductionPlanning';
import { RestaurantMenuCategories } from './RestaurantMenuCategories';
import type { UnitMaster } from '../types';

interface RestaurantKitchenDashboardProps {
  units: UnitMaster[];
}

export function RestaurantKitchenDashboard({ units }: RestaurantKitchenDashboardProps) {
  const [activeTab, setActiveTab] = useState<'production' | 'menu' | 'recipes'>('production');

  return (
    <div className="h-full flex flex-col">
      {/* Top Level Navigation */}
      <div className="bg-white border-b flex-shrink-0">
        <div className="px-6 py-3 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">🍽️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Restaurant Kitchen</h1>
              <p className="text-sm text-gray-500">Portion-Based - Daily Service Operations</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-1 px-6">
          <button
            onClick={() => setActiveTab('production')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'production'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 Daily Production
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'menu'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📖 Menu Categories
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'recipes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📝 Portion Recipes
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'production' && <RestaurantProductionPlanning units={units} />}
        {activeTab === 'menu' && <RestaurantMenuCategories />}
        {activeTab === 'recipes' && <RestaurantRecipeManagement />}
      </div>
    </div>
  );
}
