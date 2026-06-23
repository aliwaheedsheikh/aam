import {
  ChefHat,
  Calendar,
  Users,
  AlertTriangle,
  Clock,
  Package,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react';
import { Booking } from '../../calendar/types-v2';

interface BanquetChefDashboardProps {
  bookings: Booking[];
  onNavigateToProduction: () => void;
  onNavigateToInventory: () => void;
  onNavigateToKitchenManagement?: () => void;
}

export function BanquetChefDashboard({ 
  bookings,
  onNavigateToProduction,
  onNavigateToInventory,
  onNavigateToKitchenManagement
}: BanquetChefDashboardProps) {
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

  const todayGuests = todayBookings.reduce((sum, b) => sum + (b.guests || 0), 0);
  const tomorrowGuests = tomorrowBookings.reduce((sum, b) => sum + (b.guests || 0), 0);

  // Mock data for Banquet Store
  const banquetStoreLowStock = [
    { name: 'Chicken With Bone', current: 150, minimum: 200, unit: 'kg', urgency: 'medium' },
    { name: 'Tomatoes', current: 100, minimum: 150, unit: 'kg', urgency: 'medium' },
    { name: 'Onions', current: 180, minimum: 250, unit: 'kg', urgency: 'low' },
    { name: 'Ghee (Pure)', current: 35, minimum: 50, unit: 'kg', urgency: 'medium' },
  ];

  const kpis = [
    {
      title: 'Today\'s Events',
      value: todayBookings.length,
      subtitle: `${todayGuests} total guests`,
      icon: Calendar,
      color: 'orange',
      onClick: onNavigateToProduction,
    },
    {
      title: 'Banquet Store',
      value: banquetStoreLowStock.length,
      subtitle: 'Items need restocking',
      icon: AlertTriangle,
      color: 'red',
      onClick: onNavigateToInventory,
    },
    {
      title: 'Tomorrow\'s Events',
      value: tomorrowBookings.length,
      subtitle: `${tomorrowGuests} guests`,
      icon: Clock,
      color: 'purple',
    },
    {
      title: 'This Week',
      value: '12',
      subtitle: 'Events scheduled',
      icon: TrendingUp,
      color: 'blue',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Banquet & Catering Kitchen Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Bulk Production Operations - {today.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {onNavigateToKitchenManagement && (
              <button
                onClick={onNavigateToKitchenManagement}
                className="flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors shadow-lg hover:shadow-xl font-semibold"
              >
                <UtensilsCrossed className="w-5 h-5" />
                Kitchen Management
              </button>
            )}
            <div className="px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
              <span className="text-sm font-medium text-orange-700">🍛 Banquet Operations</span>
            </div>
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
          {/* Today's Events */}
          <div className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <ChefHat className="size-5 text-orange-600" />
                Today's Events ({todayBookings.length})
              </h3>
              <button
                onClick={onNavigateToProduction}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                View Production →
              </button>
            </div>
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
                  <div className="mt-2 text-sm">
                    <span className="text-gray-600">Bulk prep required:</span>
                    <span className="ml-2 font-medium text-orange-600">
                      ~{Math.ceil((booking.guests || 0) * 0.3)} kg total
                    </span>
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

          {/* Banquet Store Status */}
          <div className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Package className="size-5 text-red-600" />
                Banquet Store Status
              </h3>
              <button
                onClick={onNavigateToInventory}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                View Inventory →
              </button>
            </div>
            <div className="space-y-3">
              {banquetStoreLowStock.map((item, idx) => {
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

            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Note:</span> This is your dedicated Banquet Store. 
                Restaurant kitchen has a separate inventory.
              </p>
            </div>
          </div>

          {/* Tomorrow's Preview */}
          <div className="bg-white rounded-lg border p-5 lg:col-span-2">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="size-5 text-purple-600" />
              Tomorrow's Events - Advance Planning ({tomorrowBookings.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                <div className="text-center py-8 text-gray-500 col-span-2">
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