import { useState } from 'react';
import { Plus, Edit2, Eye, Search, Filter, Truck, Phone, Mail, MapPin, CreditCard, AlertCircle } from 'lucide-react';
import { Vendor, VendorCategory, PaymentTerms } from '../kitchen/types';
import { toast } from 'sonner';
import { formatCurrencyPKR } from '../../lib/locale';

interface VendorMasterProps {
  userName: string;
  vendors: Vendor[];
  onVendorsChange: (vendors: Vendor[]) => void;
}

export function VendorMaster({ userName, vendors, onVendorsChange }: VendorMasterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<VendorCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [viewMode, setViewMode] = useState(false);

  // Form state
  const [formVendorName, setFormVendorName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCategories, setFormCategories] = useState<VendorCategory[]>([]);
  const [formPaymentTerms, setFormPaymentTerms] = useState<PaymentTerms>('cash');
  const [formCreditLimit, setFormCreditLimit] = useState(0);
  const [formTaxId, setFormTaxId] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive' | 'blocked'>('active');

  // Filter vendors
  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = 
      vendor.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.vendorCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || vendor.vendorCategory.includes(categoryFilter);
    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const generateVendorCode = () => {
    const prefix = 'VEN';
    const count = vendors.length + 1;
    return `${prefix}${count.toString().padStart(4, '0')}`;
  };

  const handleAddNew = () => {
    setEditingVendor(null);
    setFormVendorName('');
    setFormContactPerson('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormCity('');
    setFormCategories([]);
    setFormPaymentTerms('cash');
    setFormCreditLimit(0);
    setFormTaxId('');
    setFormStatus('active');
    setViewMode(false);
    setDialogOpen(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormVendorName(vendor.vendorName);
    setFormContactPerson(vendor.contactPerson);
    setFormPhone(vendor.phone);
    setFormEmail(vendor.email || '');
    setFormAddress(vendor.address);
    setFormCity(vendor.city);
    setFormCategories(vendor.vendorCategory);
    setFormPaymentTerms(vendor.paymentTerms);
    setFormCreditLimit(vendor.creditLimit || 0);
    setFormTaxId(vendor.taxId || '');
    setFormStatus(vendor.status);
    setViewMode(false);
    setDialogOpen(true);
  };

  const handleView = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormVendorName(vendor.vendorName);
    setFormContactPerson(vendor.contactPerson);
    setFormPhone(vendor.phone);
    setFormEmail(vendor.email || '');
    setFormAddress(vendor.address);
    setFormCity(vendor.city);
    setFormCategories(vendor.vendorCategory);
    setFormPaymentTerms(vendor.paymentTerms);
    setFormCreditLimit(vendor.creditLimit || 0);
    setFormTaxId(vendor.taxId || '');
    setFormStatus(vendor.status);
    setViewMode(true);
    setDialogOpen(true);
  };

  const handleToggleCategory = (category: VendorCategory) => {
    if (formCategories.includes(category)) {
      setFormCategories(formCategories.filter(c => c !== category));
    } else {
      setFormCategories([...formCategories, category]);
    }
  };

  const handleSave = () => {
    if (!formVendorName.trim()) {
      toast.error('Vendor name is required');
      return;
    }

    if (!formContactPerson.trim()) {
      toast.error('Contact person is required');
      return;
    }

    if (!formPhone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    if (formCategories.length === 0) {
      toast.error('Please select at least one category');
      return;
    }

    // Check for duplicates
    const duplicate = vendors.find(
      v => v.vendorName.toLowerCase() === formVendorName.toLowerCase() && 
           v.id !== editingVendor?.id
    );

    if (duplicate) {
      toast.error('A vendor with this name already exists');
      return;
    }

    const vendorData: Vendor = {
      id: editingVendor?.id || `vendor-${Date.now()}`,
      vendorName: formVendorName,
      vendorCode: editingVendor?.vendorCode || generateVendorCode(),
      vendorCategory: formCategories,
      contactPerson: formContactPerson,
      phone: formPhone,
      email: formEmail || undefined,
      address: formAddress,
      city: formCity,
      paymentTerms: formPaymentTerms,
      creditLimit: formPaymentTerms !== 'cash' ? formCreditLimit : undefined,
      status: formStatus,
      taxId: formTaxId || undefined,
      currentBalance: editingVendor?.currentBalance || 0,
      totalPurchases: editingVendor?.totalPurchases || 0,
      lastPurchaseDate: editingVendor?.lastPurchaseDate,
      createdBy: editingVendor?.createdBy || userName,
      createdAt: editingVendor?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    if (editingVendor) {
      const updated = vendors.map(v => v.id === editingVendor.id ? vendorData : v);
      onVendorsChange(updated);
      toast.success('Vendor updated successfully');
    } else {
      onVendorsChange([...vendors, vendorData]);
      toast.success('Vendor created successfully');
    }

    setDialogOpen(false);
  };

  const getPaymentTermsLabel = (terms: PaymentTerms) => {
    switch (terms) {
      case 'cash': return 'Cash';
      case 'credit-7': return 'Credit 7 Days';
      case 'credit-15': return 'Credit 15 Days';
      case 'credit-30': return 'Credit 30 Days';
      case 'credit-60': return 'Credit 60 Days';
    }
  };

  const getCategoryLabel = (category: VendorCategory) => {
    return category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getStatusBadge = (status: 'active' | 'inactive' | 'blocked') => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">Active</span>;
      case 'inactive':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>;
      case 'blocked':
        return <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">Blocked</span>;
    }
  };

  const vendorCategoryOptions: VendorCategory[] = [
    'poultry', 'meat', 'vegetables-fruit', 'beverages', 'dairy', 
    'seafood', 'spices', 'ghee-oil', 'dry-goods', 'bakery-items', 
    'disposables', 'other'
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Vendor Master</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage suppliers and vendor relationships
            </p>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New Vendor
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {vendorCategoryOptions.map(cat => (
                <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm">
            <span className="text-gray-600">Total Vendors: </span>
            <span className="font-semibold text-gray-900">{vendors.length}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Active: </span>
            <span className="font-semibold text-green-600">
              {vendors.filter(v => v.status === 'active').length}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Credit Vendors: </span>
            <span className="font-semibold text-orange-600">
              {vendors.filter(v => v.paymentTerms !== 'cash').length}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {filteredVendors.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'No vendors found matching your filters'
                : 'No vendors yet. Click "Add New Vendor" to get started.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{vendor.vendorName}</h3>
                    <p className="text-xs text-gray-500 mt-1">{vendor.vendorCode}</p>
                  </div>
                  {getStatusBadge(vendor.status)}
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    {vendor.phone}
                  </div>
                  {vendor.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      {vendor.email}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {vendor.city}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CreditCard className="w-4 h-4" />
                    {getPaymentTermsLabel(vendor.paymentTerms)}
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Categories:</p>
                  <div className="flex flex-wrap gap-1">
                    {vendor.vendorCategory.map(cat => (
                      <span key={cat} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                        {getCategoryLabel(cat)}
                      </span>
                    ))}
                  </div>
                </div>

                {vendor.paymentTerms !== 'cash' && vendor.currentBalance > 0 && (
                  <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded">
                    <div className="flex items-center gap-1 text-xs text-orange-700">
                      <AlertCircle className="w-3 h-3" />
                              Outstanding: {formatCurrencyPKR(vendor.currentBalance)}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    {vendor.contactPerson}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleView(vendor)}
                      className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(vendor)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vendor Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 my-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {viewMode ? 'View Vendor' : editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
              </h2>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name *
                  </label>
                  <input
                    type="text"
                    value={formVendorName}
                    onChange={(e) => setFormVendorName(e.target.value)}
                    disabled={viewMode}
                    placeholder="e.g., Al-Rehman Poultry Farm"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                {editingVendor && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor Code
                    </label>
                    <input
                      type="text"
                      value={formVendorName && editingVendor.vendorCode}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    disabled={viewMode}
                    placeholder="e.g., Muhammad Ahmed"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    disabled={viewMode}
                    placeholder="e.g., 0300-1234567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    disabled={viewMode}
                    placeholder="e.g., vendor@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <textarea
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    disabled={viewMode}
                    placeholder="Complete address"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    disabled={viewMode}
                    placeholder="e.g., Lahore"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax ID / GST (Optional)
                  </label>
                  <input
                    type="text"
                    value={formTaxId}
                    onChange={(e) => setFormTaxId(e.target.value)}
                    disabled={viewMode}
                    placeholder="GST number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor Categories * (Select all that apply)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {vendorCategoryOptions.map(category => (
                    <label
                      key={category}
                      className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
                        formCategories.includes(category)
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      } ${viewMode ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={formCategories.includes(category)}
                        onChange={() => handleToggleCategory(category)}
                        disabled={viewMode}
                        className="text-blue-600"
                      />
                      <span className="text-sm">{getCategoryLabel(category)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment Terms */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms *
                  </label>
                  <select
                    value={formPaymentTerms}
                    onChange={(e) => setFormPaymentTerms(e.target.value as PaymentTerms)}
                    disabled={viewMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  >
                    <option value="cash">Cash</option>
                    <option value="credit-7">Credit 7 Days</option>
                    <option value="credit-15">Credit 15 Days</option>
                    <option value="credit-30">Credit 30 Days</option>
                    <option value="credit-60">Credit 60 Days</option>
                  </select>
                </div>

                {formPaymentTerms !== 'cash' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                Credit Limit (Rs.)
                    </label>
                    <input
                      type="number"
                      value={formCreditLimit}
                      onChange={(e) => setFormCreditLimit(Number(e.target.value))}
                      disabled={viewMode}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    disabled={viewMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {viewMode ? 'Close' : 'Cancel'}
              </button>
              {!viewMode && (
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {editingVendor ? 'Update Vendor' : 'Add Vendor'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
