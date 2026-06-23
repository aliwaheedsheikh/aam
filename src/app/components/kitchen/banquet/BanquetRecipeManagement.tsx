import { BookOpen } from 'lucide-react';

export function BanquetRecipeManagement() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center p-12">
        <div className="inline-block p-6 bg-orange-50 rounded-full mb-6">
          <BookOpen className="size-16 text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Bulk Recipe Management</h2>
        <p className="text-gray-600 mb-2">
          Manage recipes for bulk cooking (per 100 persons base)
        </p>
        <p className="text-sm text-gray-500">
          Example: Chicken Biryani - 100 persons = 25kg chicken, 20kg rice
        </p>
      </div>
    </div>
  );
}
