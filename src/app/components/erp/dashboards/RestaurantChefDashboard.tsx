import {
  Utensils,
  Users,
  AlertTriangle,
  Clock,
  Package,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';

interface RestaurantChefDashboardProps {
  onNavigateToProduction: () => void;
  onNavigateToInventory: () => void;
}

export function RestaurantChefDashboard({ 
  onNavigateToProduction,
  onNavigateToInventory
}: RestaurantChefDashboardProps) {
  const today = new Date();

  // Mock data for Restaurant operations
  const expectedCoversToday = 200;
  const expectedCoversTomorrow = 180;

  // Restaurant Store low stock
  const restaurantStoreLowStock = [
    { name: 'Chicken Boneless', current: 50, minimum: 80, unit: 'kg', urgency: 'medium' },
    { name: 'Coconut Milk', current: 20, minimum: 35, unit: 'liter', urgency: 'medium' },
    { name: 'Thai Basil', current: 5, minimum: 10, unit: 'kg', urgency: 'high' },
  ];

  // Station Status
  const stationStatus = [
    { name: 'Chinese Station', prepStatus: 75, dishes: 8, readyDishes: 6 },
    { name: 'Thai Station', prepStatus: 80, dishes: 6, readyDishes: 5 },
    { name: 'BBQ Station', prepStatus: 60, dishes: 10, readyDishes: 6 },
    { name: 'Burger Station', prepStatus: 90, dishes: 5, readyDishes: 5 },
  ];

  const kpis = [
    {
      title: 'Expected Covers',
      value: expectedCoversToday,
      subtitle: 'Lunch + Dinner service',
      icon: Users,
      color: 'blue',
      onClick: onNavigateToProduction,
    },
    {
      title: 'Restaurant Store',
      value: restaurantStoreLowStock.length,
      subtitle: 'Items need restocking',
      icon: AlertTriangle,
      color: 'red',
      onClick: onNavigateToInventory,
    },
    {
      title: 'Tomorrow Covers',
      value: expectedCoversTomorrow,
      subtitle: 'Expected service',
      icon: Clock,
      color: 'purple',
    },
    {
      title: 'Stations Ready',
      value: '3/4',
      subtitle: 'Preparation complete',
      icon: CheckCircle,
      color: 'green',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Restaurant Kitchen Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Portion-Based Operations - {today.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          </div>
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm font-medium text-blue-700">🍽️ Restaurant Operations</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div
                key={idx}
                onClick={kpi.onClick}
                className={`bg-white rounded-lg border p-5 hover:shadow-md transition-shadow ${
                  kpi.onClick ? 'cursor-pointer' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-3 bg-${kpi.color}-50 rounded-lg`}>
                    <Icon className={`size-6 text-${kpi.color}-600`} />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">{kpi.title}</p>
                <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
                <p className="text-sm text-gray-500 mt-1">{kpi.subtitle}</p>
              </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Station Status */}
          <div className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Utensils className="size-5 text-blue-600" />
                Station Preparation Status
              </h3>
              <button
                onClick={onNavigateToProduction}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View Production →
              </button>
            </div>
            <div className="space-y-4">
              {stationStatus.map((station, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{station.name}</p>
                      <p className="text-sm text-gray-600">
                        {station.readyDishes}/{station.dishes} dishes ready
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      station.prepStatus >= 80 ? 'bg-green-100 text-green-700' :
                      station.prepStatus >= 60 ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {station.prepStatus}% Ready
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        station.prepStatus >= 80 ? 'bg-green-600' :
                        station.prepStatus >= 60 ? 'bg-blue-600' :
                        'bg-yellow-600'
                      }`}
                      style={{ width: `${station.prepStatus}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Restaurant Store Status */}
          <div className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Package className="size-5 text-red-600" />
                Restaurant Store Status
              </h3>
              <button
                onClick={onNavigateToInventory}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                View Inventory →
              </button>
            </div>
            <div className="space-y-3">
              {restaurantStoreLowStock.map((item, idx) => {
                const percentage = (item.current / item.minimum) * 100;
                return (
                  <div key={idx} className={`border rounded-lg p-4 ${
                    item.urgency === 'high' ? 'bg-red-50 border-red-200' :
                    item.urgency === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.urgency === 'high' ? 'bg-red-100 text-red-700' :
                        item.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {item.urgency === 'high' ? 'Urgent' :
                         item.urgency === 'medium' ? 'Restock Soon' :
                         'Monitor'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>Current: {item.current} {item.unit}</span>
                      <span>Min: {item.minimum} {item.unit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          percentage < 50 ? 'bg-red-600' :
                          percentage < 75 ? 'bg-yellow-600' :
                          'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Note:</span> This is your dedicated Restaurant Store. 
                Banquet kitchen has a separate bulk inventory.
              </p>
            </div>
          </div>

          {/* Menu Categories Performance */}
          <div className="bg-white rounded-lg border p-5 lg:col-span-2">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="size-5 text-purple-600" />
              Today's Menu Category Performance
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { category: 'Chinese', portions: 45, color: 'red' },
                { category: 'Thai', portions: 38, color: 'orange' },
                { category: 'BBQ', portions: 52, color: 'amber' },
                { category: 'Burgers', portions: 35, color: 'green' },
              ].map((cat, idx) => (
                <div key={idx} className="p-4 border rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-2">{cat.category}</p>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{cat.portions}</p>
                  <p className="text-xs text-gray-500">Portions prepared</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium mb-1">Lunch Service</p>
                <p className="text-2xl font-bold text-gray-900">85 covers</p>
                <p className="text-xs text-gray-500 mt-1">11:00 AM - 3:00 PM</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 font-medium mb-1">Dinner Service</p>
                <p className="text-2xl font-bold text-gray-900">115 covers</p>
                <p className="text-xs text-gray-500 mt-1">6:00 PM - 11:00 PM</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium mb-1">Total Expected</p>
                <p className="text-2xl font-bold text-gray-900">200 covers</p>
                <p className="text-xs text-gray-500 mt-1">Full day service</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
