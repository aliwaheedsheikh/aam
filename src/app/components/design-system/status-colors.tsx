// Global Status Color System for VenueOps ERP
// Consistent color meanings across all modules

// ==========================================
// STATUS COLOR CONFIGURATION
// ==========================================

/**
 * STANDARD STATUS COLOR MEANINGS:
 * 
 * 🟢 GREEN: Confirmed / Paid / Complete / Active / Success
 * 🟡 YELLOW: Partial / Tentative / Pending / Warning
 * 🔴 RED: Overdue / Conflict / Error / Cancelled / Critical
 * 🔵 BLUE: Information / Primary Action / In Progress
 * ⚪ GRAY: Disabled / Archived / Inactive / Neutral
 */

export const STATUS_COLORS = {
  // GREEN - Success/Confirmed States
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
    buttonBg: 'bg-green-600 hover:bg-green-700',
    buttonText: 'text-white',
    meanings: ['Confirmed', 'Paid', 'Complete', 'Active', 'Success'],
  },
  
  // YELLOW - Warning/Partial States
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    badgeBg: 'bg-yellow-100',
    badgeText: 'text-yellow-700',
    buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
    buttonText: 'text-white',
    meanings: ['Partial', 'Tentative', 'Pending', 'Warning'],
  },
  
  // RED - Error/Critical States
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    buttonBg: 'bg-red-600 hover:bg-red-700',
    buttonText: 'text-white',
    meanings: ['Overdue', 'Conflict', 'Error', 'Cancelled', 'Critical'],
  },
  
  // BLUE - Information/Primary States
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    buttonBg: 'bg-blue-600 hover:bg-blue-700',
    buttonText: 'text-white',
    meanings: ['Information', 'Primary Action', 'In Progress'],
  },
  
  // GRAY - Neutral/Inactive States
  gray: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-700',
    buttonBg: 'bg-gray-600 hover:bg-gray-700',
    buttonText: 'text-white',
    meanings: ['Disabled', 'Archived', 'Inactive', 'Neutral'],
  },
} as const;

export type StatusColor = keyof typeof STATUS_COLORS;

// ==========================================
// STATUS BADGE COMPONENT
// ==========================================

interface StatusBadgeProps {
  status: StatusColor | string;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Standard Status Badge Component
 * Use for all status indicators across the ERP
 */
export function StatusBadge({
  status,
  label,
  size = 'md',
  className,
}: StatusBadgeProps) {
  // Map common status strings to colors
  const statusColorMap: Record<string, StatusColor> = {
    // Green statuses
    confirmed: 'green',
    paid: 'green',
    complete: 'green',
    active: 'green',
    success: 'green',
    available: 'green',
    
    // Yellow statuses
    tentative: 'yellow',
    partial: 'yellow',
    pending: 'yellow',
    warning: 'yellow',
    'partially-paid': 'yellow',
    
    // Red statuses
    overdue: 'red',
    conflict: 'red',
    error: 'red',
    cancelled: 'red',
    critical: 'red',
    blocked: 'red',
    
    // Blue statuses
    info: 'blue',
    information: 'blue',
    'in-progress': 'blue',
    processing: 'blue',
    
    // Gray statuses
    disabled: 'gray',
    archived: 'gray',
    inactive: 'gray',
    neutral: 'gray',
    draft: 'gray',
  };

  const colorKey = statusColorMap[status.toLowerCase()] || (status as StatusColor);
  const colors = STATUS_COLORS[colorKey] || STATUS_COLORS.gray;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colors.badgeBg} ${colors.badgeText} ${sizeClasses[size]} ${className || ''}`}
    >
      {label}
    </span>
  );
}

// ==========================================
// STATUS INDICATOR DOT
// ==========================================

interface StatusDotProps {
  status: StatusColor;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Status Dot - Simple colored indicator
 */
export function StatusDot({ status, size = 'md', className }: StatusDotProps) {
  const dotColors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    gray: 'bg-gray-400',
  };

  const sizeClasses = {
    sm: 'size-2',
    md: 'size-3',
    lg: 'size-4',
  };

  return (
    <div
      className={`rounded-full ${dotColors[status]} ${sizeClasses[size]} ${className || ''}`}
    />
  );
}

// ==========================================
// BOOKING STATUS HELPERS
// ==========================================

/**
 * Get status color for booking status
 */
export function getBookingStatusColor(status: string): StatusColor {
  const normalized = status.toLowerCase();
  
  if (normalized === 'confirmed' || normalized === 'reserved') return 'green';
  if (normalized === 'tentative' || normalized === 'hold') return 'yellow';
  if (normalized === 'cancelled' || normalized === 'blocked') return 'red';
  if (normalized === 'completed') return 'blue';
  
  return 'gray';
}

/**
 * Get status color for payment status
 */
export function getPaymentStatusColor(status: string): StatusColor {
  const normalized = status.toLowerCase();
  
  if (normalized === 'paid' || normalized === 'full') return 'green';
  if (normalized === 'partial' || normalized === 'partially-paid') return 'yellow';
  if (normalized === 'overdue' || normalized === 'failed') return 'red';
  if (normalized === 'pending' || normalized === 'processing') return 'blue';
  
  return 'gray';
}

/**
 * Get status color for inventory status
 */
export function getInventoryStatusColor(status: string): StatusColor {
  const normalized = status.toLowerCase();
  
  if (normalized === 'in-stock' || normalized === 'available') return 'green';
  if (normalized === 'low-stock' || normalized === 'warning') return 'yellow';
  if (normalized === 'out-of-stock' || normalized === 'critical') return 'red';
  if (normalized === 'ordered' || normalized === 'in-transit') return 'blue';
  
  return 'gray';
}

// ==========================================
// COLOR USAGE GUIDELINES
// ==========================================

export const STATUS_COLOR_GUIDE = {
  rules: [
    '✅ DO: Use green for confirmed/paid/complete states',
    '✅ DO: Use yellow for partial/tentative/pending states',
    '✅ DO: Use red for overdue/conflict/error states',
    '✅ DO: Use blue for information/primary actions',
    '✅ DO: Use gray for disabled/archived/inactive states',
    '',
    '❌ DON\'T: Use custom colors for status',
    '❌ DON\'T: Mix color meanings across modules',
    '❌ DON\'T: Use color alone - always include text label',
  ],
  
  examples: {
    bookingStatus: {
      confirmed: 'green',
      tentative: 'yellow',
      cancelled: 'red',
    },
    paymentStatus: {
      paid: 'green',
      partial: 'yellow',
      overdue: 'red',
    },
    actions: {
      primary: 'blue',
      success: 'green',
      danger: 'red',
      warning: 'yellow',
    },
  },
} as const;
