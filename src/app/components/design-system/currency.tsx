// Global Currency System for VenueOps ERP
// All monetary values must use this system - NO hardcoded currency symbols

import { cn } from '../ui/utils';
import { formatCurrencyPKR } from '../../lib/locale';

// ==========================================
// CURRENCY CONFIGURATION
// ==========================================
export const CURRENCY_CONFIG = {
  code: 'PKR',
  symbol: 'Rs.',
  format: 'Rs. 000,000',
  locale: 'en-PK',
} as const;

// ==========================================
// CURRENCY FORMATTING UTILITIES
// ==========================================

/**
 * Format a number as PKR currency
 * @param amount - The numeric amount to format
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "PKR 25,000")
 */
export function formatCurrency(
  amount: number | string,
  options?: {
    showCode?: boolean; // Default: true
    showDecimals?: boolean; // Default: false for whole numbers, true if decimals exist
    compact?: boolean; // Default: false (e.g., PKR 25K instead of PKR 25,000)
  }
): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return `${CURRENCY_CONFIG.code} 0`;

  const showCode = options?.showCode !== false; // Default true
  const hasDecimals = numAmount % 1 !== 0;
  const showDecimals = options?.showDecimals !== undefined 
    ? options.showDecimals 
    : hasDecimals;

  const formatted = formatCurrencyPKR(numAmount, {
    compact: options?.compact,
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  return showCode ? formatted : formatted.replace(/^Rs\.\s*/, '');
}

/**
 * Parse a currency string to number
 * @param currencyString - String like "PKR 25,000" or "25,000"
 * @returns Numeric value
 */
export function parseCurrency(currencyString: string): number {
  const cleaned = currencyString.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

// ==========================================
// AMOUNT COMPONENT VARIANTS
// ==========================================

export type AmountVariant = 'neutral' | 'positive' | 'negative' | 'highlight';

interface AmountProps {
  value: number | string;
  variant?: AmountVariant;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showCode?: boolean;
  showDecimals?: boolean;
  compact?: boolean;
  className?: string;
  bold?: boolean;
}

/**
 * Standard Amount Component - Use for ALL monetary displays
 * Ensures consistent currency formatting across the entire ERP
 */
export function Amount({
  value,
  variant = 'neutral',
  size = 'md',
  showCode = true,
  showDecimals,
  compact = false,
  className,
  bold = false,
}: AmountProps) {
  const formatted = formatCurrency(value, { showCode, showDecimals, compact });

  // Variant color classes
  const variantClasses: Record<AmountVariant, string> = {
    neutral: 'text-gray-900',
    positive: 'text-green-700',
    negative: 'text-red-700',
    highlight: 'text-blue-700',
  };

  // Size classes
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  };

  return (
    <span
      className={cn(
        variantClasses[variant],
        sizeClasses[size],
        bold && 'font-semibold',
        'tabular-nums', // Monospaced numbers for alignment
        className
      )}
    >
      {formatted}
    </span>
  );
}

// ==========================================
// INPUT COMPONENT FOR CURRENCY
// ==========================================

interface CurrencyInputProps {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

/**
 * Currency Input Component
 * Automatically formats as user types
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  disabled = false,
  className,
  error = false,
}: CurrencyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and decimal point
    const cleaned = e.target.value.replace(/[^\d.]/g, '');
    onChange(cleaned);
  };

  const displayValue = value ? formatCurrency(value, { showCode: false }) : '';

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none">
        {CURRENCY_CONFIG.symbol}
      </div>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full pl-16 pr-3 py-2 border rounded-md',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          'tabular-nums font-medium',
          error ? 'border-red-500' : 'border-gray-300',
          disabled && 'bg-gray-100 cursor-not-allowed',
          className
        )}
      />
    </div>
  );
}

// ==========================================
// AMOUNT SUMMARY CARDS
// ==========================================

interface AmountCardProps {
  label: string;
  amount: number | string;
  variant?: AmountVariant;
  icon?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

/**
 * Amount Card - For dashboard summary displays
 */
export function AmountCard({
  label,
  amount,
  variant = 'neutral',
  icon,
  compact = false,
  className,
}: AmountCardProps) {
  const variantBgClasses: Record<AmountVariant, string> = {
    neutral: 'bg-gray-50 border-gray-200',
    positive: 'bg-green-50 border-green-200',
    negative: 'bg-red-50 border-red-200',
    highlight: 'bg-blue-50 border-blue-200',
  };

  return (
    <div
      className={cn(
        'border rounded-lg p-4',
        variantBgClasses[variant],
        className
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm text-gray-600">{label}</span>
        {icon && <div className="text-gray-500">{icon}</div>}
      </div>
      <Amount
        value={amount}
        variant={variant}
        size={compact ? 'lg' : 'xl'}
        bold
        compact={compact}
      />
    </div>
  );
}
