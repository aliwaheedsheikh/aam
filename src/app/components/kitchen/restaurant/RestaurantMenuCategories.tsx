import { Menu } from 'lucide-react';

export function RestaurantMenuCategories() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center p-12">
        <div className="inline-block p-6 bg-blue-50 rounded-full mb-6">
          <Menu className="size-16 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Menu Categories</h2>
        <p className="text-gray-600 mb-2">
          Chinese • Thai • BBQ • Burgers • Sandwiches • Pasta • Starters
        </p>
        <p className="text-sm text-gray-500">
          A la carte menu with individual pricing per dish
        </p>
      </div>
    </div>
  );
}
