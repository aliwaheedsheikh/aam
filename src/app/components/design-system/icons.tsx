// Global Icon System for VenueOps ERP
// Standardized icon usage - outline style only, consistent sizing

import { LucideIcon } from 'lucide-react';
import { cn } from '../ui/utils';

// ==========================================
// ICON SYSTEM CONFIGURATION
// ==========================================

export const ICON_CONFIG = {
  style: 'outline', // Only outline icons allowed
  strokeWidth: 2, // Fixed stroke width
  sizes: {
    xs: 14,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 28,
  },
  defaultSize: 'sm', // 16px for most UI elements
  headerSize: 'md', // 20px for headers/titles
} as const;

// ==========================================
// ICON SIZE TYPE
// ==========================================

export type IconSize = keyof typeof ICON_CONFIG.sizes;

// ==========================================
// STANDARD ICON COMPONENT
// ==========================================

interface IconProps {
  icon: LucideIcon;
  size?: IconSize;
  className?: string;
  strokeWidth?: number;
}

/**
 * Standard Icon Component - Use for ALL icons in the ERP
 * Enforces consistent sizing and stroke width
 * 
 * @example
 * <Icon icon={Calendar} size="md" />
 * <Icon icon={Users} size="sm" className="text-blue-600" />
 */
export function Icon({
  icon: IconComponent,
  size = 'sm',
  className,
  strokeWidth = ICON_CONFIG.strokeWidth,
}: IconProps) {
  const sizeInPx = ICON_CONFIG.sizes[size];

  return (
    <IconComponent
      size={sizeInPx}
      strokeWidth={strokeWidth}
      className={cn('flex-shrink-0', className)}
    />
  );
}

// ==========================================
// ICON WITH BACKGROUND (For Status/Category)
// ==========================================

interface IconBadgeProps {
  icon: LucideIcon;
  variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: IconSize;
  className?: string;
}

/**
 * Icon Badge - Icon with subtle background
 * Use sparingly for status indicators or category markers
 */
export function IconBadge({
  icon: IconComponent,
  variant = 'neutral',
  size = 'sm',
  className,
}: IconBadgeProps) {
  const sizeInPx = ICON_CONFIG.sizes[size];
  
  const variantClasses = {
    neutral: 'bg-gray-100 text-gray-600',
    primary: 'bg-blue-100 text-blue-600',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-yellow-100 text-yellow-600',
    danger: 'bg-red-100 text-red-600',
    info: 'bg-indigo-100 text-indigo-600',
  };

  return (
    <div
      className={cn(
        'rounded-lg p-2 inline-flex items-center justify-center',
        variantClasses[variant],
        className
      )}
    >
      <IconComponent
        size={sizeInPx}
        strokeWidth={ICON_CONFIG.strokeWidth}
        className="flex-shrink-0"
      />
    </div>
  );
}

// ==========================================
// ICON GUIDELINES & RULES
// ==========================================

/**
 * ICON SYSTEM RULES:
 * 
 * 1. ✅ DO: Use lucide-react icons (outline style only)
 * 2. ✅ DO: Use Icon component for consistent sizing
 * 3. ✅ DO: Use size="sm" (16px) for most UI elements
 * 4. ✅ DO: Use size="md" (20px) for headers and titles
 * 5. ✅ DO: Apply color via className (e.g., "text-blue-600")
 * 
 * 6. ❌ DON'T: Use filled/solid icon variants
 * 7. ❌ DON'T: Use emojis instead of icons
 * 8. ❌ DON'T: Use colored icon backgrounds (except IconBadge)
 * 9. ❌ DON'T: Mix different icon libraries
 * 10. ❌ DON'T: Use arbitrary sizes - stick to defined sizes
 * 
 * EXAMPLES:
 * 
 * // ✅ Correct
 * <Icon icon={Calendar} size="sm" className="text-gray-600" />
 * <Icon icon={Users} size="md" className="text-blue-600" />
 * 
 * // ❌ Incorrect
 * <Calendar className="size-5" /> // Don't use direct icon
 * 🗓️ // Don't use emojis
 * <div className="bg-blue-500 p-2"><Calendar /></div> // Don't add backgrounds
 */

export const ICON_USAGE_GUIDE = {
  standard: 'Use Icon component with size prop',
  strokeWidth: 'Always 2px (default)',
  style: 'Outline only - no filled variants',
  backgrounds: 'Avoid colored backgrounds except for IconBadge',
  emojis: 'Never use emojis - use icons only',
  sizes: {
    buttons: 'sm (16px)',
    inputs: 'sm (16px)',
    headers: 'md (20px)',
    cards: 'md (20px)',
    modals: 'md (20px)',
  },
} as const;