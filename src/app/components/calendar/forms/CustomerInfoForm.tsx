import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { User, Phone, Mail, MessageSquare, MapPin, Building2, Copy } from 'lucide-react';

interface CustomerInfoFormProps {
  customerName: string;
  setCustomerName: (value: string) => void;
  customerType: string;
  setCustomerType: (value: string) => void;
  contactNumber: string;
  setContactNumber: (value: string) => void;
  whatsapp: string;
  setWhatsapp: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  emailError: string;
  setEmailError: (value: string) => void;
  altContactName: string;
  setAltContactName: (value: string) => void;
  altContactNumber: string;
  setAltContactNumber: (value: string) => void;
  cnicNumber: string;
  setCnicNumber: (value: string) => void;
  companyName: string;
  setCompanyName: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  houseStreet: string;
  setHouseStreet: (value: string) => void;
  area: string;
  setArea: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  customerSource: string;
  setCustomerSource: (value: string) => void;
  referredBy: string;
  setReferredBy: (value: string) => void;
  preferredCommunication: string;
  setPreferredCommunication: (value: string) => void;
  foodPreference: string;
  setFoodPreference: (value: string) => void;
  decorPreference: string;
  setDecorPreference: (value: string) => void;
  formatPakistaniPhoneNumber: (value: string) => string;
  handleCopyToWhatsApp: () => void;
}

export function CustomerInfoForm({
  customerName,
  setCustomerName,
  customerType,
  setCustomerType,
  contactNumber,
  setContactNumber,
  whatsapp,
  setWhatsapp,
  email,
  setEmail,
  emailError,
  setEmailError,
  altContactName,
  setAltContactName,
  altContactNumber,
  setAltContactNumber,
  cnicNumber,
  setCnicNumber,
  companyName,
  setCompanyName,
  address,
  setAddress,
  houseStreet,
  setHouseStreet,
  area,
  setArea,
  city,
  setCity,
  customerSource,
  setCustomerSource,
  referredBy,
  setReferredBy,
  preferredCommunication,
  setPreferredCommunication,
  foodPreference,
  setFoodPreference,
  decorPreference,
  setDecorPreference,
  formatPakistaniPhoneNumber,
  handleCopyToWhatsApp,
}: CustomerInfoFormProps) {
  
  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError('');
      return true;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  return (
    <div className="space-y-4">
      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customerType" className="text-sm mb-2">
            Customer Type
          </Label>
          <Select value={customerType} onValueChange={setCustomerType}>
            <SelectTrigger id="customerType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New Customer</SelectItem>
              <SelectItem value="returning">Returning Customer</SelectItem>
              <SelectItem value="vip">VIP Customer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="customerName" className="text-sm mb-2 flex items-center gap-2">
            <User className="size-4" />
            Full Name
          </Label>
          <Input
            id="customerName"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="John Doe"
          />
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="contactNumber" className="text-sm mb-2 flex items-center gap-2">
            <Phone className="size-4" />
            Contact Number
          </Label>
          <Input
            id="contactNumber"
            type="tel"
            value={contactNumber}
            onChange={(e) => {
              const formatted = formatPakistaniPhoneNumber(e.target.value);
              setContactNumber(formatted);
            }}
            onBlur={(e) => {
              const formatted = formatPakistaniPhoneNumber(e.target.value);
              setContactNumber(formatted);
            }}
            placeholder="03001234567 or +92 300 1234567"
          />
        </div>
        <div>
          <Label htmlFor="whatsapp" className="text-sm mb-2 flex items-center gap-2">
            <MessageSquare className="size-4" />
            WhatsApp Number
          </Label>
          <div className="relative">
            <Input
              id="whatsapp"
              type="tel"
              value={whatsapp}
              onChange={(e) => {
                const formatted = formatPakistaniPhoneNumber(e.target.value);
                setWhatsapp(formatted);
              }}
              onBlur={(e) => {
                const formatted = formatPakistaniPhoneNumber(e.target.value);
                setWhatsapp(formatted);
              }}
              placeholder="03001234567 or +92 300 1234567"
              className="pr-10"
            />
            {contactNumber && (
              <button
                type="button"
                onClick={handleCopyToWhatsApp}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition-colors"
                title="Copy from Contact Number"
              >
                <Copy className="size-4" />
              </button>
            )}
          </div>
        </div>
        <div>
          <Label htmlFor="email" className="text-sm mb-2 flex items-center gap-2">
            <Mail className="size-4" />
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              validateEmail(e.target.value);
            }}
            onBlur={(e) => validateEmail(e.target.value)}
            placeholder="john@example.com"
            className={emailError ? 'border-red-500' : ''}
          />
          {emailError && (
            <p className="text-xs text-red-500 mt-1">{emailError}</p>
          )}
        </div>
      </div>

      {/* Additional Contact */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="altContactName" className="text-sm mb-2">
            Alternative Contact Name
          </Label>
          <Input
            id="altContactName"
            value={altContactName}
            onChange={(e) => setAltContactName(e.target.value)}
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <Label htmlFor="altContactNumber" className="text-sm mb-2">
            Alternative Contact Number
          </Label>
          <Input
            id="altContactNumber"
            type="tel"
            value={altContactNumber}
            onChange={(e) => {
              const formatted = formatPakistaniPhoneNumber(e.target.value);
              setAltContactNumber(formatted);
            }}
            placeholder="03001234567"
          />
        </div>
      </div>

      {/* CNIC & Company */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cnicNumber" className="text-sm mb-2">
            CNIC Number
          </Label>
          <Input
            id="cnicNumber"
            value={cnicNumber}
            onChange={(e) => setCnicNumber(e.target.value)}
            placeholder="12345-1234567-1"
          />
        </div>
        <div>
          <Label htmlFor="companyName" className="text-sm mb-2 flex items-center gap-2">
            <Building2 className="size-4" />
            Company Name (if applicable)
          </Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="ABC Corporation"
          />
        </div>
      </div>

      {/* Address */}
      <div>
        <Label htmlFor="address" className="text-sm mb-2 flex items-center gap-2">
          <MapPin className="size-4" />
          Full Address
        </Label>
        <Textarea
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Complete address"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="houseStreet" className="text-sm mb-2">
            House / Street
          </Label>
          <Input
            id="houseStreet"
            value={houseStreet}
            onChange={(e) => setHouseStreet(e.target.value)}
            placeholder="House #123, Street 45"
          />
        </div>
        <div>
          <Label htmlFor="area" className="text-sm mb-2">
            Area / Sector
          </Label>
          <Input
            id="area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="G-11/3"
          />
        </div>
        <div>
          <Label htmlFor="city" className="text-sm mb-2">
            City
          </Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Islamabad"
          />
        </div>
      </div>

      {/* Customer Source */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customerSource" className="text-sm mb-2">
            How did they find us?
          </Label>
          <Select value={customerSource} onValueChange={setCustomerSource}>
            <SelectTrigger id="customerSource">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="google">Google Search</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="walkIn">Walk-in</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {customerSource === 'referral' && (
          <div>
            <Label htmlFor="referredBy" className="text-sm mb-2">
              Referred By
            </Label>
            <Input
              id="referredBy"
              value={referredBy}
              onChange={(e) => setReferredBy(e.target.value)}
              placeholder="Name of referrer"
            />
          </div>
        )}
      </div>

      {/* Preferences */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="preferredCommunication" className="text-sm mb-2">
            Preferred Communication Method
          </Label>
          <Select value={preferredCommunication} onValueChange={setPreferredCommunication}>
            <SelectTrigger id="preferredCommunication">
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
          <Label htmlFor="foodPreference" className="text-sm mb-2">
            Food Preference Notes
          </Label>
          <Input
            id="foodPreference"
            value={foodPreference}
            onChange={(e) => setFoodPreference(e.target.value)}
            placeholder="Vegetarian, Halal, etc."
          />
        </div>
      </div>

      <div>
        <Label htmlFor="decorPreference" className="text-sm mb-2">
          Decor Preference Notes
        </Label>
        <Input
          id="decorPreference"
          value={decorPreference}
          onChange={(e) => setDecorPreference(e.target.value)}
          placeholder="Traditional, Modern, Minimalist, etc."
        />
      </div>
    </div>
  );
}
