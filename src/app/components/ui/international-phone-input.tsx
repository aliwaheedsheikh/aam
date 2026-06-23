import { forwardRef } from 'react';
import PhoneInput from 'react-phone-number-input';
import { Label } from '@/app/components/ui/label';
import { cn } from '@/app/components/ui/utils';

interface InternationalPhoneInputProps {
  id?: string;
  label?: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  errorMessage?: string;
  defaultCountry?: string;
  className?: string;
  icon?: React.ReactNode;
}

// Helper function to normalize phone number to E.164 format
const normalizePhoneNumber = (phoneNumber: string | undefined, defaultCountry: string): string | undefined => {
  if (!phoneNumber) return undefined;
  
  // If already in E.164 format (starts with +), return as is
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  // If it's a Pakistani number starting with 0, convert to E.164
  if (defaultCountry === 'PK' && phoneNumber.startsWith('0')) {
    return `+92${phoneNumber.substring(1)}`;
  }
  
  // If it's already without leading 0 for Pakistan, add +92
  if (defaultCountry === 'PK' && /^3\d{9}$/.test(phoneNumber)) {
    return `+92${phoneNumber}`;
  }
  
  // For other cases, try to add the country code
  if (defaultCountry === 'PK') {
    return `+92${phoneNumber}`;
  }
  
  // Return undefined if can't normalize (will use empty string)
  return undefined;
};

export const InternationalPhoneInput = forwardRef<HTMLInputElement, InternationalPhoneInputProps>(
  (
    {
      id,
      label,
      value,
      onChange,
      onBlur,
      placeholder = 'Enter phone number',
      disabled = false,
      required = false,
      error = false,
      errorMessage,
      defaultCountry = 'PK', // Default to Pakistan
      className,
      icon,
    },
    ref
  ) => {
    // Normalize the value to E.164 format
    const normalizedValue = normalizePhoneNumber(value, defaultCountry);
    
    return (
      <div className={cn('space-y-2', className)}>
        {label && (
          <Label htmlFor={id} className="text-sm mb-2 flex items-center gap-2">
            {icon}
            {label}
            {required && <span className="text-red-500">*</span>}
          </Label>
        )}
        <PhoneInput
          id={id}
          international
          defaultCountry={defaultCountry as any}
          value={normalizedValue}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn('PhoneInput', error && 'PhoneInput--error')}
          numberInputProps={{
            className: 'PhoneInputInput',
          }}
          countrySelectProps={{
            className: 'PhoneInputCountrySelect',
          }}
        />
        {error && errorMessage && (
          <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
        )}
      </div>
    );
  }
);

InternationalPhoneInput.displayName = 'InternationalPhoneInput';