import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Receipt,
} from 'lucide-react';
import { Booking } from '../../calendar/types-v2';

interface AccountsDashboardProps {
  bookings: Booking[];
}

export function AccountsDashboard({ bookings }: AccountsDashboardProps) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // This month's confirmed bookings
  const thisMonthBookings = bookings.filter(b => {
    const bookingDate = new Date(b.date);
    return (
      bookingDate.getMonth() === currentMonth &&
      bookingDate.getFullYear() === currentYear &&
      b.status === 'confirmed'
    );
  });

  const totalRevenue = thisMonthBookings.reduce(
    (sum, b) => sum + ((b.packagePrice || 0) + (b.extraCharges || 0)),
    0
  );

  const totalAdvance = thisMonthBookings.reduce(
    (sum, b) => sum + (b.advanceAmount || 0),
    0
  );

  const totalPending = totalRevenue - totalAdvance;

  // Mock data for demonstration
  const pendingInvoices = 12;
  const paidInvoices = 45;
  const overdueInvoices = 3;
  
  const pendingPayments = 8;
  const todayCollection = 450000;
  
  const monthlyExpenses = 1250000;
  const netProfit = totalRevenue - monthlyExpenses;

  const kpis = [
    {
      title: 'Monthly Revenue',
      value: `PKR ${(totalRevenue / 1000000).toFixed(2)}M`,
      change: 18,
      icon: DollarSign,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Received (Advance)',
      value: `PKR ${(totalAdvance / 1000000).toFixed(2)}M`,
      change: 12,
      icon: CheckCircle,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Pending Collection',
      value: `PKR ${(totalPending / 1000000).toFixed(2)}M`,
      change: -5,
      icon: AlertCircle,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
    {
      title: 'Net Profit',
      value: `PKR ${(netProfit / 1000000).toFixed(2)}M`,
      change: 22,
      icon: TrendingUp,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
  ];

  const recentInvoices = thisMonthBookings.slice(0, 8).map((booking, idx) => ({
    id: `INV-${booking.id}`,
    customer: booking.customerName,
    date: new Date(booking.date).toLocaleDateString(),
    amount: (booking.packagePrice || 0) + (booking.extraCharges || 0),
    paid: booking.advanceAmount || 0,
    status: (booking.advanceAmount || 0) >= ((booking.packagePrice || 0) + (booking.extraCharges || 0)) 
      ? 'paid' 
      : booking.advanceAmount 
      ? 'partial' 
      : 'pending',
  }));

  const accountsPayable = [
    { vendor: 'Metro Cash & Carry', amount: 85000, dueDate: '2026-01-10', status: 'pending' },
    { vendor: 'Al-Karam Meat Shop', amount: 125000, dueDate: '2026-01-12', status: 'pending' },
    { vendor: 'Fresh Vegetables Market', amount: 45000, dueDate: '2026-01-08', status: 'overdue' },
    { vendor: 'Spice King Traders', amount: 32000, dueDate: '2026-01-15', status: 'pending' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accounts & Finance Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Financial Overview & Management - {today.toLocaleDateString('en-US', { 
                month: 'long', 
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
              <div key={idx} className="bg-white rounded-lg border p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className={`${kpi.bgColor} p-3 rounded-lg`}>
                    <Icon className={`size-6 ${kpi.textColor}`} />
                  </div>
                  <div className="flex items-center gap-1">
                    {kpi.change > 0 ? (
                      <TrendingUp className="size-4 text-green-600" />
                    ) : (
                      <TrendingDown className="size-4 text-red-600" />
                    )}
                    <span className={`text-xs font-medium ${
                      kpi.change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {kpi.change > 0 ? '+' : ''}{kpi.change}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">{kpi.title}</p>
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="size-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Invoices</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pending:</span>
                <span className="font-semibold text-orange-600">{pendingInvoices}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Paid:</span>
                <span className="font-semibold text-green-600">{paidInvoices}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Overdue:</span>
                <span className="font-semibold text-red-600">{overdueInvoices}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CreditCard className="size-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Collections</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Today:</span>
                <span className="font-semibold text-green-600">
                  PKR {(todayCollection / 1000).toFixed(0)}K
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">This Month:</span>
                <span className="font-semibold">
                  PKR {(totalAdvance / 1000000).toFixed(2)}M
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pending:</span>
                <span className="font-semibold text-orange-600">{pendingPayments}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Receipt className="size-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Expenses</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">This Month:</span>
                <span className="font-semibold">
                  PKR {(monthlyExpenses / 1000000).toFixed(2)}M
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Revenue:</span>
                <span className="font-semibold text-green-600">
                  PKR {(totalRevenue / 1000000).toFixed(2)}M
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Net Profit:</span>
                <span className="font-semibold text-blue-600">
                  PKR {(netProfit / 1000000).toFixed(2)}M
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Invoices */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="size-5 text-blue-600" />
              Recent Invoices
            </h3>
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Customer</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Amount</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentInvoices.map((invoice, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{invoice.customer}</p>
                          <p className="text-xs text-gray-500">{invoice.date}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div>
                          <p className="font-semibold text-gray-900">
                            PKR {(invoice.amount / 1000).toFixed(0)}K
                          </p>
                          {invoice.status === 'partial' && (
                            <p className="text-xs text-gray-500">
                              Paid: PKR {(invoice.paid / 1000).toFixed(0)}K
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'paid' 
                            ? 'bg-green-100 text-green-700' 
                            : invoice.status === 'partial'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {invoice.status === 'paid' ? 'Paid' : invoice.status === 'partial' ? 'Partial' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Accounts Payable */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Receipt className="size-5 text-orange-600" />
              Accounts Payable
            </h3>
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Vendor</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Amount</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {accountsPayable.map((payable, idx) => (
                    <tr key={idx} className={`hover:bg-gray-50 ${
                      payable.status === 'overdue' ? 'bg-red-50' : ''
                    }`}>
                      <td className="px-3 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{payable.vendor}</p>
                          <p className="text-xs text-gray-500">Due: {payable.dueDate}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <p className="font-semibold text-gray-900">
                          PKR {(payable.amount / 1000).toFixed(0)}K
                        </p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payable.status === 'overdue'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {payable.status === 'overdue' ? 'Overdue' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
