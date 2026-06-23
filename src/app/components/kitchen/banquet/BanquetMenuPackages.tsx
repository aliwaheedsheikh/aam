import { Package } from 'lucide-react';

export function BanquetMenuPackages() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center p-12">
        <div className="inline-block p-6 bg-orange-50 rounded-full mb-6">
          <Package className="size-16 text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Menu Packages</h2>
        <p className="text-gray-600 mb-2">
          Gold, Silver & Economy packages for events
        </p>
        <p className="text-sm text-gray-500">
          Pre-configured menu combinations with pricing per person
        </p>
      </div>
    </div>
  );
}
