import { useState } from 'react';
import { KitchenManagementSystem } from './KitchenManagementSystem';
import { IngredientManagement } from './IngredientManagement';
import { ProductionPlanning } from './ProductionPlanning';
import { Booking } from '../calendar/types-v2';

interface KitchenDashboardProps {
  bookings: Booking[];
}

export function KitchenDashboard({ bookings }: KitchenDashboardProps) {
  const [activeTab, setActiveTab] = useState<'recipes' | 'ingredients' | 'production'>('recipes');

  return (
    <div className="h-full flex flex-col">
      {/* Top Level Navigation */}
      <div className="bg-white border-b flex-shrink-0">
        <div className="flex gap-1 px-6">
          <button
            onClick={() => setActiveTab('recipes')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'recipes'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📝 Recipes & Menus
          </button>
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'ingredients'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🛒 Ingredients & Vendors
          </button>
          <button
            onClick={() => setActiveTab('production')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'production'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 Production Planning
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'recipes' && <KitchenManagementSystem />}
        {activeTab === 'ingredients' && <IngredientManagement />}
        {activeTab === 'production' && <ProductionPlanning bookings={bookings} />}
      </div>
    </div>
  );
}
