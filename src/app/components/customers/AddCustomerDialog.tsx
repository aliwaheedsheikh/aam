import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Customer, CustomerType, CustomerSegment, CustomerStatus } from './customer-types';

interface AddCustomerDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (customer: Customer) => void;
  existingCustomer?: Customer | null;
}

export function AddCustomerDialog({
  open,
  onClose,
  onSave,
  existingCustomer,
}: AddCustomerDialogProps) {
  const isEdit = !!existingCustomer;

  // Form state
  const [customerName, setCustomerName] = useState(existingCustomer?.customerName || '');
  const [customerType, setCustomerType] = useState<CustomerType>(existingCustomer?.customerType || 'individual');
  const [segment, setSegment] = useState<CustomerSegment>(existingCustomer?.segment || 'new');
  const [status, setStatus] = useState<CustomerStatus>(existingCustomer?.status || 'active');
  
  const [primaryContact, setPrimaryContact] = useState(existingCustomer?.primaryContact || '');
  const [secondaryContact, setSecondaryContact] = useState(existingCustomer?.secondaryContact || '');
  const [email, setEmail] = useState(existingCustomer?.email || '');
  const [whatsapp, setWhatsapp] = useState(existingCustomer?.whatsapp || '');
  
  const [address, setAddress] = useState(existingCustomer?.address || '');
  const [city, setCity] = useState(existingCustomer?.city || 'Lahore');
  const [area, setArea] = useState(existingCustomer?.area || '');
  
  const [companyName, setCompanyName] = useState(existingCustomer?.companyName || '');
  const [designation, setDesignation] = useState(existingCustomer?.designation || '');
  const [gstNumber, setGstNumber] = useState(existingCustomer?.gstNumber || '');
  const [ntnNumber, setNtnNumber] = useState(existingCustomer?.ntnNumber || '');
  
  const [paymentTerms, setPaymentTerms] = useState(existingCustomer?.paymentTerms || '100% Advance');
  const [creditLimit, setCreditLimit] = useState(existingCustomer?.creditLimit?.toString() || '');
  const [defaultDiscount, setDefaultDiscount] = useState(existingCustomer?.defaultDiscount?.toString() || '');
  
  const [notes, setNotes] = useState(existingCustomer?.notes || '');
  const [internalNotes, setInternalNotes] = useState(existingCustomer?.internalNotes || '');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const customer: Customer = {
      id: existingCustomer?.id || `cust-${Date.now()}`,
      customerCode: existingCustomer?.customerCode || `CUST-${String(Date.now()).slice(-4)}`,
      customerName,
      customerType,
      segment,
      status,
      
      primaryContact,
      secondaryContact: secondaryContact || undefined,
      email: email || undefined,
      whatsapp: whatsapp || undefined,
      
      address: address || undefined,
      city,
      area: area || undefined,
      
      companyName: customerType === 'corporate' ? companyName : undefined,
      designation: customerType === 'corporate' ? designation : undefined,
      gstNumber: customerType === 'corporate' ? gstNumber : undefined,
      ntnNumber: customerType === 'corporate' ? ntnNumber : undefined,
      
      totalBookings: existingCustomer?.totalBookings || 0,
      totalRevenue: existingCustomer?.totalRevenue || 0,
      totalPaid: existingCustomer?.totalPaid || 0,
      totalOutstanding: existingCustomer?.totalOutstanding || 0,
      lifetimeValue: existingCustomer?.lifetimeValue || 0,
      
      completedEvents: existingCustomer?.completedEvents || 0,
      cancelledEvents: existingCustomer?.cancelledEvents || 0,
      upcomingEvents: existingCustomer?.upcomingEvents || 0,
      lastBookingDate: existingCustomer?.lastBookingDate,
      
      creditLimit: creditLimit ? parseInt(creditLimit) : undefined,
      paymentTerms,
      defaultDiscount: defaultDiscount ? parseFloat(defaultDiscount) : undefined,
      
      createdAt: existingCustomer?.createdAt || new Date(),
      createdBy: existingCustomer?.createdBy || 'Admin',
      updatedAt: new Date(),
      notes: notes || undefined,
      internalNotes: internalNotes || undefined,
      tags: existingCustomer?.tags,
      customerRating: existingCustomer?.customerRating,
    };

    onSave(customer);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                {isEdit ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <p className="text-sm text-blue-100 mt-0.5">
                {isEdit ? 'Update customer information' : 'Create a new customer profile'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter full name or company name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Type *
                  </label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value as CustomerType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="individual">Individual</option>
                    <option value="corporate">Corporate</option>
                    <option value="government">Government</option>
                    <option value="ngo">NGO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Segment *
                  </label>
                  <select
                    value={segment}
                    onChange={(e) => setSegment(e.target.value as CustomerSegment)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="new">New</option>
                    <option value="regular">Regular</option>
                    <option value="premium">Premium</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CustomerStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Contact *
                  </label>
                  <input
                    type="tel"
                    value={primaryContact}
                    onChange={(e) => setPrimaryContact(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0300-1234567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary Contact
                  </label>
                  <input
                    type="tel"
                    value={secondaryContact}
                    onChange={(e) => setSecondaryContact(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0321-7654321"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="customer@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0300-1234567"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="House/Office number, Street"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Lahore"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="DHA, Gulberg, etc."
                  />
                </div>
              </div>
            </div>

            {/* Corporate Details (only shown for corporate customers) */}
            {customerType === 'corporate' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Corporate Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Company Pvt Ltd"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="HR Manager, Event Coordinator"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GST Number
                    </label>
                    <input
                      type="text"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="GST-12345678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      NTN Number
                    </label>
                    <input
                      type="text"
                      value={ntnNumber}
                      onChange={(e) => setNtnNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="NTN-87654321"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment Terms */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Terms</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="100% Advance">100% Advance</option>
                    <option value="50-50">50-50 (Half Advance)</option>
                    <option value="70-30">70-30</option>
                    <option value="Credit 15 days">Credit 15 days</option>
                    <option value="Credit 30 days">Credit 30 days</option>
                    <option value="Credit 45 days">Credit 45 days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credit Limit (PKR)
                  </label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="500000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Discount (%)
                  </label>
                  <input
                    type="number"
                    value={defaultDiscount}
                    onChange={(e) => setDefaultDiscount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="5"
                    step="0.5"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Public Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="General notes about the customer..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Internal Notes (Staff Only)
                  </label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-yellow-50 border-yellow-300"
                    placeholder="Private notes for staff only..."
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="size-4 mr-2" />
            {isEdit ? 'Update Customer' : 'Save Customer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
