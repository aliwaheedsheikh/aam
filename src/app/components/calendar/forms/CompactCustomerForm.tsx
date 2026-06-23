import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';
import { Button } from '../../ui/button';
import {
  User,
  Phone,
  Mail,
  FileCheck2,
  Building2,
  MapPin,
  Search,
  UserCheck,
  X,
} from 'lucide-react';
import { InternationalPhoneInput } from '../../ui/international-phone-input';
import { toast } from 'sonner';

interface CompactCustomerFormProps {
  // Customer Type & Source
  customerType: string;
  setCustomerType: (value: string) => void;
  customerSource: string;
  setCustomerSource: (value: string) => void;
  
  // Search & Selection
  selectedCustomerId: string | null;
  setShowCustomerSearch: (value: boolean) => void;
  customerName: string;
  onClearCustomer: () => void;
  
  // Basic Info
  setCustomerName: (value: string) => void;
  contactNumber: string;
  handleContactNumberChange: (value: string) => void;
  
  // WhatsApp
  whatsapp: string;
  setWhatsapp: (value: string) => void;
  sameAsWhatsApp: boolean;
  handleSameAsWhatsAppChange: (checked: boolean) => void;
  
  // Email & CNIC
  email: string;
  handleEmailChange: (value: string) => void;
  handleEmailBlur: () => void;
  emailError: string;
  cnicNumber: string;
  setCnicNumber: (value: string) => void;
  
  // Alt Contact
  altContactName: string;
  setAltContactName: (value: string) => void;
  altContactNumber: string;
  setAltContactNumber: (value: string) => void;
  
  // Company
  companyName: string;
  setCompanyName: (value: string) => void;
  
  // Referral
  referredBy: string;
  setReferredBy: (value: string) => void;
  
  // Address
  houseStreet: string;
  setHouseStreet: (value: string) => void;
  area: string;
  setArea: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  setAddress: (value: string) => void;
  
  // Preferences
  preferredCommunication: string;
  setPreferredCommunication: (value: string) => void;
  foodPreference: string;
  setFoodPreference: (value: string) => void;
  decorPreference: string;
  setDecorPreference: (value: string) => void;
  
  // Validation functions
  sanitizeInput: (value: string) => string;
  validateTextLength: (value: string, max: number) => string;
  validateAndFormatCNIC: (value: string) => string;
  isCNICValid: (value: string) => boolean;
}

export function CompactCustomerForm({
  customerType,
  setCustomerType,
  customerSource,
  setCustomerSource,
  selectedCustomerId,
  setShowCustomerSearch,
  customerName,
  onClearCustomer,
  setCustomerName,
  contactNumber,
  handleContactNumberChange,
  whatsapp,
  setWhatsapp,
  sameAsWhatsApp,
  handleSameAsWhatsAppChange,
  email,
  handleEmailChange,
  handleEmailBlur,
  emailError,
  cnicNumber,
  setCnicNumber,
  altContactName,
  setAltContactName,
  altContactNumber,
  setAltContactNumber,
  companyName,
  setCompanyName,
  referredBy,
  setReferredBy,
  houseStreet,
  setHouseStreet,
  area,
  setArea,
  city,
  setCity,
  setAddress,
  preferredCommunication,
  setPreferredCommunication,
  foodPreference,
  setFoodPreference,
  decorPreference,
  setDecorPreference,
  sanitizeInput,
  validateTextLength,
  validateAndFormatCNIC,
  isCNICValid,
}: CompactCustomerFormProps) {
  return (
    <div className="space-y-4">
      {/* Customer Type + Customer Source - Top Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs mb-1.5">Customer Type</Label>
          <Select value={customerType} onValueChange={setCustomerType}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="returning">Returning</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs mb-1.5">Customer Source</Label>
          <Select value={customerSource} onValueChange={setCustomerSource}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="How did they find us?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="walk-in">Walk-in</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search Customer Button - Only for Returning Customers */}
      {customerType === 'returning' && !selectedCustomerId && (
        <div className="border border-blue-200 rounded-lg p-2 bg-blue-50">
          <Button
            type="button"
            onClick={() => setShowCustomerSearch(true)}
            className="w-full h-8 bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
          >
            <Search className="size-3.5" />
            Search Existing Customer
          </Button>
        </div>
      )}

      {selectedCustomerId && (
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1.5">
          <UserCheck className="size-3.5" />
          <span className="font-medium">Loaded: {customerName}</span>
          <button onClick={onClearCustomer} className="ml-auto text-red-600 hover:text-red-800">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Full Name */}
      <div>
        <Label htmlFor="customerName" className="text-xs mb-1.5 flex items-center gap-1.5">
          <User className="size-3.5" />
          Full Name
        </Label>
        <Input
          id="customerName"
          value={customerName}
          onChange={(e) => {
            const sanitized = sanitizeInput(e.target.value);
            const validated = validateTextLength(sanitized, 100);
            setCustomerName(validated);
          }}
          placeholder="John Doe"
          maxLength={100}
          className="h-9"
        />
      </div>

      {/* Contact Number with Same as WhatsApp checkbox */}
      <div>
        <Label htmlFor="contactNumber" className="text-xs mb-1.5 flex items-center gap-1.5">
          <Phone className="size-3.5" />
          Contact Number
        </Label>
        <InternationalPhoneInput
          id="contactNumber"
          label=""
          value={contactNumber}
          onChange={handleContactNumberChange}
          placeholder="+92 300 1234567"
          defaultCountry="PK"
          required
        />
        <div className="flex items-center gap-2 mt-1.5">
          <Checkbox
            id="sameAsWhatsApp"
            checked={sameAsWhatsApp}
            onCheckedChange={handleSameAsWhatsAppChange}
          />
          <Label htmlFor="sameAsWhatsApp" className="text-xs cursor-pointer">
            Same as WhatsApp number
          </Label>
        </div>
      </div>

      {/* Email + CNIC in one row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="email" className="text-xs mb-1.5 flex items-center gap-1.5">
            <Mail className="size-3.5" />
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            onBlur={handleEmailBlur}
            placeholder="john.doe@example.com"
            className={`h-9 ${emailError ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
          {emailError && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <X className="size-3" />
              {emailError}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="cnicNumber" className="text-xs mb-1.5 flex items-center gap-1.5">
            <FileCheck2 className="size-3.5" />
            CNIC/ID Number
          </Label>
          <Input
            id="cnicNumber"
            value={cnicNumber}
            onChange={(e) => {
              const validated = validateAndFormatCNIC(e.target.value);
              setCnicNumber(validated);
            }}
            onBlur={(e) => {
              if (e.target.value && !isCNICValid(e.target.value)) {
                toast.error('Invalid CNIC', {
                  description: 'CNIC must be 13 digits (XXXXX-XXXXXXX-X)',
                });
              }
            }}
            placeholder="12345-6789012-3"
            maxLength={15}
            className="h-9"
          />
        </div>
      </div>

      {/* Alt Contact Name + Alt Contact Number in one row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="altContactName" className="text-xs mb-1.5 flex items-center gap-1.5">
            <User className="size-3.5" />
            Alt. Contact Name
          </Label>
          <Input
            id="altContactName"
            value={altContactName}
            onChange={(e) => {
              const sanitized = sanitizeInput(e.target.value);
              const validated = validateTextLength(sanitized, 100);
              setAltContactName(validated);
            }}
            placeholder="Emergency contact"
            maxLength={100}
            className="h-9"
          />
        </div>
        <div>
          <Label htmlFor="altContactNumber" className="text-xs mb-1.5 flex items-center gap-1.5">
            <Phone className="size-3.5" />
            Alt. Contact Number
          </Label>
          <InternationalPhoneInput
            id="altContactNumber"
            label=""
            value={altContactNumber}
            onChange={(value) => setAltContactNumber(value || '')}
            placeholder="+92 300 1234567"
            defaultCountry="PK"
          />
        </div>
      </div>

      {/* Company Name */}
      <div>
        <Label htmlFor="companyName" className="text-xs mb-1.5 flex items-center gap-1.5">
          <Building2 className="size-3.5" />
          Company Name (Optional)
        </Label>
        <Input
          id="companyName"
          value={companyName}
          onChange={(e) => {
            const sanitized = sanitizeInput(e.target.value);
            const validated = validateTextLength(sanitized, 150);
            setCompanyName(validated);
          }}
          placeholder="For corporate clients"
          maxLength={150}
          className="h-9"
        />
      </div>

      {/* Referred By - conditional */}
      {customerSource === 'referral' && (
        <div>
          <Label htmlFor="referredBy" className="text-xs mb-1.5">
            Referred By
          </Label>
          <Input
            id="referredBy"
            value={referredBy}
            onChange={(e) => setReferredBy(e.target.value)}
            placeholder="Name of person who referred"
            className="h-9"
          />
        </div>
      )}

      {/* Address - Structured Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="houseStreet" className="text-xs mb-1.5 flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            House/Street
          </Label>
          <Input
            id="houseStreet"
            value={houseStreet}
            onChange={(e) => {
              const sanitized = sanitizeInput(e.target.value);
              const validated = validateTextLength(sanitized, 150);
              setHouseStreet(validated);
              setAddress(`${validated}, ${area}, Lahore`.replace(/(^,\s*)|(,\s*$)/g, ''));
            }}
            placeholder="27 Ahmed Block"
            maxLength={150}
            className="h-9"
          />
        </div>
        <div>
          <Label htmlFor="area" className="text-xs mb-1.5">
            Area / Locality
          </Label>
          <Input
            list="compact-lahore-area-options"
            id="area"
            value={area}
            onChange={(e) => {
              const sanitized = sanitizeInput(e.target.value);
              const validated = validateTextLength(sanitized, 100);
              setArea(validated);
              setAddress(`${houseStreet}, ${validated}, Lahore`.replace(/(^,\s*)|(,\s*$)/g, ''));
            }}
            placeholder="Pak Arab Society"
            maxLength={100}
            className="h-9"
          />
          <datalist id="compact-lahore-area-options">
            <option value="Pak Arab Society" />
            <option value="Shadab Town" />
            <option value="Garden Town" />
            <option value="Gulberg" />
            <option value="DHA" />
            <option value="Johar Town" />
            <option value="Model Town" />
            <option value="Faisal Town" />
            <option value="Wapda Town" />
            <option value="Valencia Town" />
          </datalist>
        </div>
      </div>

      {/* Preferred Communication + Preferences */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs mb-1.5">Preferred Communication</Label>
          <Select value={preferredCommunication} onValueChange={setPreferredCommunication}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="phone">Phone Call</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="foodPreference" className="text-xs mb-1.5">
            Food Preference
          </Label>
          <Input
            id="foodPreference"
            value={foodPreference}
            onChange={(e) => setFoodPreference(e.target.value)}
            placeholder="Vegetarian, Halal, etc."
            className="h-9"
          />
        </div>
      </div>

      {/* Decor Preference */}
      <div>
        <Label htmlFor="decorPreference" className="text-xs mb-1.5">
          Decor Preference
        </Label>
        <Input
          id="decorPreference"
          value={decorPreference}
          onChange={(e) => setDecorPreference(e.target.value)}
          placeholder="Traditional, Modern, Minimalist, etc."
          className="h-9"
        />
      </div>
    </div>
  );
}
