import { useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Star,
  TrendingUp,
  Calendar,
  DollarSign,
  Building2,
  User,
  Award,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Customer, CustomerSegment, CustomerType, CustomerStatus, SAMPLE_CUSTOMERS } from './customer-types';
import { CustomerProfileDialog } from './CustomerProfileDialog';
import { AddCustomerDialog } from './AddCustomerDialog';
import { usePersistedWorkflowState, WORKFLOW_STATE_KEYS } from '@/app/lib/workflowState';

export function CustomerDatabase() {
  const [customers, setCustomers] = usePersistedWorkflowState<Customer[]>(
    WORKFLOW_STATE_KEYS.customerDatabase,
    SAMPLE_CUSTOMERS,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | 'all'>('all');
  const [selectedType, setSelectedType] = useState<CustomerType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<CustomerStatus | 'all'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Filter customers
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.customerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.primaryContact.includes(searchQuery) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSegment = selectedSegment === 'all' || customer.segment === selectedSegment;
    const matchesType = selectedType === 'all' || customer.customerType === selectedType;
    const matchesStatus = selectedStatus === 'all' || customer.status === selectedStatus;
    
    return matchesSearch && matchesSegment && matchesType && matchesStatus;
  });

  // Statistics
  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'active').length,
    vip: customers.filter(c => c.segment === 'vip').length,
    totalRevenue: customers.reduce((sum, c) => sum + c.totalRevenue, 0),
    outstanding: customers.reduce((sum, c) => sum + c.totalOutstanding, 0),
  };

  const handleViewProfile = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowProfileDialog(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowAddDialog(true);
  };

  const handleDeleteCustomer = (customerId: string) => {
    if (confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      setCustomers(customers.filter(c => c.id !== customerId));
    }
  };

  const handleAddCustomer = (customer: Customer) => {
    if (selectedCustomer) {
      // Edit existing
      setCustomers(customers.map(c => c.id === customer.id ? customer : c));
    } else {
      // Add new
      setCustomers([...customers, customer]);
    }
    setShowAddDialog(false);
    setSelectedCustomer(null);
  };

  const getSegmentBadge = (segment: CustomerSegment) => {
    const config = {
      vip: { bg: 'bg-purple-100', text: 'text-purple-800', icon: '👑', label: 'VIP' },
      premium: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '⭐', label: 'Premium' },
      regular: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '👤', label: 'Regular' },
      new: { bg: 'bg-green-100', text: 'text-green-800', icon: '🆕', label: 'New' },
    };
    const { bg, text, icon, label } = config[segment];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
        <span>{icon}</span>
        {label}
      </span>
    );
  };

  const getTypeBadge = (type: CustomerType) => {
    const config = {
      individual: { label: 'Individual', icon: User },
      corporate: { label: 'Corporate', icon: Building2 },
      government: { label: 'Government', icon: Award },
      ngo: { label: 'NGO', icon: AlertCircle },
    };
    const { label, icon: Icon } = config[type];
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
        <Icon className="size-3" />
        {label}
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Database</h1>
              <p className="text-sm text-gray-600 mt-0.5">Manage customer information and relationships</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="text-gray-700">
                <Upload className="size-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" className="text-gray-700">
                <Download className="size-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={() => {
                  setSelectedCustomer(null);
                  setShowAddDialog(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="size-4 mr-2" />
                Add Customer
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-5 gap-4 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 mb-1">Total Customers</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <User className="size-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-600 mb-1">Active</p>
                  <p className="text-2xl font-bold text-green-900">{stats.active}</p>
                </div>
                <TrendingUp className="size-8 text-green-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-600 mb-1">VIP Customers</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.vip}</p>
                </div>
                <Award className="size-8 text-purple-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-indigo-600 mb-1">Total Revenue</p>
                  <p className="text-xl font-bold text-indigo-900">PKR {(stats.totalRevenue / 1000000).toFixed(1)}M</p>
                </div>
                <DollarSign className="size-8 text-indigo-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-orange-600 mb-1">Outstanding</p>
                  <p className="text-xl font-bold text-orange-900">PKR {(stats.outstanding / 1000).toFixed(0)}K</p>
                </div>
                <AlertCircle className="size-8 text-orange-400" />
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, code, phone, or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Segments</option>
              <option value="vip">VIP</option>
              <option value="premium">Premium</option>
              <option value="regular">Regular</option>
              <option value="new">New</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="individual">Individual</option>
              <option value="corporate">Corporate</option>
              <option value="government">Government</option>
              <option value="ngo">NGO</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Segment
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Total Revenue
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Outstanding
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-semibold text-gray-900">{customer.customerName}</div>
                      <div className="text-xs text-gray-500">{customer.customerCode}</div>
                      {customer.companyName && (
                        <div className="text-xs text-gray-600 mt-0.5">{customer.companyName}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <Phone className="size-3 text-gray-400" />
                        {customer.primaryContact}
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Mail className="size-3 text-gray-400" />
                          {customer.email}
                        </div>
                      )}
                      {customer.city && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin className="size-3 text-gray-400" />
                          {customer.area ? `${customer.area}, ` : ''}{customer.city}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {getSegmentBadge(customer.segment)}
                  </td>
                  <td className="px-4 py-4">
                    {getTypeBadge(customer.customerType)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="text-sm font-semibold text-gray-900">{customer.totalBookings}</div>
                    <div className="text-xs text-gray-500">
                      {customer.upcomingEvents} upcoming
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      PKR {(customer.totalRevenue / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-500">
                      Paid: PKR {(customer.totalPaid / 1000).toFixed(0)}K
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={`text-sm font-semibold ${
                      customer.totalOutstanding > 0 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      PKR {(customer.totalOutstanding / 1000).toFixed(0)}K
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {customer.customerRating && (
                      <div className="flex items-center justify-center gap-1">
                        <Star className="size-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-semibold text-gray-900">
                          {customer.customerRating}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleViewProfile(customer)}
                        className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                        title="View Profile"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        onClick={() => handleEditCustomer(customer)}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                        title="Edit"
                      >
                        <Edit className="size-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(customer.id)}
                        className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCustomers.length === 0 && (
            <div className="py-12 text-center">
              <User className="size-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No customers found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        {/* Results Count */}
        {filteredCustomers.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Showing {filteredCustomers.length} of {customers.length} customers
          </div>
        )}
      </div>

      {/* Customer Profile Dialog */}
      {selectedCustomer && (
        <CustomerProfileDialog
          open={showProfileDialog}
          onClose={() => {
            setShowProfileDialog(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
          onEdit={() => {
            setShowProfileDialog(false);
            setShowAddDialog(true);
          }}
        />
      )}

      {/* Add/Edit Customer Dialog */}
      <AddCustomerDialog
        open={showAddDialog}
        onClose={() => {
          setShowAddDialog(false);
          setSelectedCustomer(null);
        }}
        onSave={handleAddCustomer}
        existingCustomer={selectedCustomer}
      />
    </div>
  );
}
