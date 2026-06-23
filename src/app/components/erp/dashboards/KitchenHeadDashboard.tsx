import {
  ChefHat,
  Calendar,
  Users,
  Package,
  AlertTriangle,
  TrendingUp,
  Clock,
  ShoppingCart,
} from 'lucide-react';
import { Booking } from '../../calendar/types-v2';

interface KitchenHeadDashboardProps {
  bookings: Booking[];
  onNavigateToProduction: () => void;
  onNavigateToIngredients: () => void;
}

export function KitchenHeadDashboard({ 
  bookings,
  onNavigateToProduction,
  onNavigateToIngredients 
}: KitchenHeadDashboardProps) {
  const today = new Date();

  // Today's events
  const todayBookings = bookings.filter(b => {
    const bookingDate = new Date(b.date);
    return bookingDate.toDateString() === today.toDateString() && b.status !== 'cancelled';
  });

  // Tomorrow's events
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowBookings = bookings.filter(b => {
    const bookingDate = new Date(b.date);
    return bookingDate.toDateString() === tomorrow.toDateString() && b.status !== 'cancelled';
  });

  // Total guests for today
  const todayGuests = todayBookings.reduce((sum, b) => sum + (b.guests || 0), 0);
  const tomorrowGuests = tomorrowBookings.reduce((sum, b) => sum + (b.guests || 0), 0);

  // Mock kitchen data
  const lowStockItems = [
    { name: 'Tomatoes', current: 15, minimum: 30, unit: 'kg', urgency: 'high' },
    { name: 'Onions', current: 8, minimum: 50, unit: 'kg', urgency: 'high' },
    { name: 'Green Chilies', current: 12, minimum: 20, unit: 'kg', urgency: 'medium' },
    { name: 'Fresh Cream', current: 18, minimum: 25, unit: 'liter', urgency: 'medium' },
    { name: 'Garam Masala', current: 3, minimum: 5, unit: 'kg', urgency: 'low' },
  ];

  const productionStatus = [
    { item: 'Chicken Tikka', prepared: 120, required: 150, unit: 'servings', status: 'in-progress' },
    { item: 'Seekh Kabab', prepared: 100, required: 100, unit: 'servings', status: 'completed' },
    { item: 'Chicken Biryani', prepared: 0, required: 200, unit: 'servings', status: 'pending' },
    { item: 'Mutton Korma', prepared: 50, required: 80, unit: 'servings', status: 'in-progress' },
  ];

  const pendingPurchaseOrders = 3;
  const activeRecipes = 24;

  const kpis = [
    {
      title: 'Today\'s Events',
      value: todayBookings.length,
      subtitle: `${todayGuests} total guests`,
      icon: Calendar,
      color: 'blue',
      onClick: onNavigateToProduction,
    },
    {
      title: 'Low Stock Items',
      value: lowStockItems.length,
      subtitle: 'Need immediate attention',
      icon: AlertTriangle,
      color: 'red',
      onClick: onNavigateToIngredients,
    },
    {
      title: 'Tomorrow\'s Events',
      value: tomorrowBookings.length,
      subtitle: `${tomorrowGuests} guests`,
      icon: Clock,
      color: 'purple',
    },
    {
      title: 'Pending Orders',
      value: pendingPurchaseOrders,
      subtitle: 'Purchase orders',
      icon: ShoppingCart,
      color: 'orange',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kitchen Management Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Production Planning & Operations - {today.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
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
          {/* Today's Production Schedule */}
          <div className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <ChefHat className="size-5 text-orange-600" />
                Today's Production Status
              </h3>
              <button
                onClick={onNavigateToProduction}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                View Planning →
              </button>
            </div>
            <div className="space-y-3">
              {productionStatus.map((item, idx) => {
                const progress = (item.prepared / item.required) * 100;
                return (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900">{item.item}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : item.status === 'in-progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.status === 'completed' ? 'Completed' :
                         item.status === 'in-progress' ? 'In Progress' :
                         'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>{item.prepared} / {item.required} {item.unit}</span>
                      <span className="font-medium">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          progress === 100
                            ? 'bg-green-600'
                            : progress > 0
                            ? 'bg-blue-600'
                            : 'bg-gray-400'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="size-5 text-red-600" />
                Low Stock Alerts
              </h3>
              <button
                onClick={onNavigateToIngredients}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                View Inventory →
              </button>
            </div>
            <div className="space-y-3">
              {lowStockItems.map((item, idx) => {
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
                         item.urgency === 'medium' ? 'Soon' :
                         'Normal'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>Current: {item.current} {item.unit}</span>
                      <span>Min: {item.minimum} {item.unit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          percentage < 30 ? 'bg-red-600' :
                          percentage < 60 ? 'bg-yellow-600' :
                          'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's Events Breakdown */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="size-5 text-blue-600" />
              Today's Events ({todayBookings.length})
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {todayBookings.map((booking, idx) => (
                <div key={idx} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{booking.customerName}</p>
                      <p className="text-sm text-gray-600">{booking.venueName}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      booking.status === 'confirmed' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="size-4" />
                      {booking.eventTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-4" />
                      {booking.guests} guests
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <p className="font-medium">Time: {booking.startTime} - {booking.endTime}</p>
                  </div>
                </div>
              ))}
              {todayBookings.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="size-12 text-gray-300 mx-auto mb-2" />
                  <p>No events scheduled for today</p>
                </div>
              )}
            </div>
          </div>

          {/* Tomorrow's Preview */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="size-5 text-purple-600" />
              Tomorrow's Events ({tomorrowBookings.length})
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tomorrowBookings.map((booking, idx) => (
                <div key={idx} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{booking.customerName}</p>
                      <p className="text-sm text-gray-600">{booking.venueName}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      booking.status === 'confirmed' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="size-4" />
                      {booking.eventTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-4" />
                      {booking.guests} guests
                    </span>
                  </div>
                </div>
              ))}
              {tomorrowBookings.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="size-12 text-gray-300 mx-auto mb-2" />
                  <p>No events scheduled for tomorrow</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
