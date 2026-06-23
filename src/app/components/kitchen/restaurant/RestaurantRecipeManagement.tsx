import { BookOpen } from 'lucide-react';

export function RestaurantRecipeManagement() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center p-12">
        <div className="inline-block p-6 bg-blue-50 rounded-full mb-6">
          <BookOpen className="size-16 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Portion Recipe Management</h2>
        <p className="text-gray-600 mb-2">
          Manage recipes for individual portions
        </p>
        <p className="text-sm text-gray-500">
          Example: Thai Red Curry - 1 portion = 200g chicken, 150ml coconut milk
        </p>
      </div>
    </div>
  );
}
