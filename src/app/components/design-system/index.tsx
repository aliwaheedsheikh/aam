// VenueOps ERP Design System - Central Export
// Import from this file to ensure consistency across all modules

/**
 * ========================================
 * VENUEOPS ERP DESIGN SYSTEM
 * ========================================
 * 
 * A comprehensive, enterprise-grade design system for
 * banquet and catering operations management.
 * 
 * CORE PRINCIPLES:
 * - Consistency across all modules
 * - Professional, calm, enterprise aesthetic
 * - No hardcoded values or inline styles
 * - Accessibility and readability first
 * - Designed for daily operational use
 * 
 * ========================================
 */

// ==========================================
// CURRENCY SYSTEM
// ==========================================
export {
  // Configuration
  CURRENCY_CONFIG,
  
  // Utilities
  formatCurrency,
  parseCurrency,
  
  // Components
  Amount,
  CurrencyInput,
  AmountCard,
  
  // Types
  type AmountVariant,
} from './currency';

// ==========================================
// ICON SYSTEM
// ==========================================
export {
  // Configuration
  ICON_CONFIG,
  
  // Components
  Icon,
  IconBadge,
  
  // Types
  type IconSize,
  
  // Guidelines
  ICON_USAGE_GUIDE,
} from './icons';

// ==========================================
// STATUS COLOR SYSTEM
// ==========================================
export {
  // Configuration
  STATUS_COLORS,
  
  // Components
  StatusBadge,
  StatusDot,
  
  // Helpers
  getBookingStatusColor,
  getPaymentStatusColor,
  getInventoryStatusColor,
  
  // Types
  type StatusColor,
  
  // Guidelines
  STATUS_COLOR_GUIDE,
} from './status-colors';

// ==========================================
// TYPOGRAPHY SYSTEM
// ==========================================
export {
  // Configuration
  TYPOGRAPHY,
  
  // Components
  PageTitle,
  SectionTitle,
  SubsectionTitle,
  CardTitle,
  FieldLabel,
  BodyText,
  Caption,
  
  // Utility Classes
  TEXT_STYLES,
  
  // Guidelines
  TYPOGRAPHY_GUIDE,
} from './typography';

// ==========================================
// TIME SYSTEM
// ==========================================
export {
  // Components
  TimePicker,
  
  // Utilities
  formatTimeDisplay,
  formatTimeRangeDisplay,
  convert12To24Hour,
  convert24To12Hour,
} from '../ui/time-picker';

// ==========================================
// DESIGN SYSTEM GUIDELINES
// ==========================================

export const DESIGN_SYSTEM_RULES = {
  currency: [
    '✅ Always use Amount component for monetary values',
    '✅ Use PKR format: "PKR 25,000"',
    '✅ Never hardcode currency symbols in UI text',
    '✅ Use formatCurrency() for all currency displays',
    '❌ Never write "Rs.", "$", or other symbols manually',
  ],
  
  icons: [
    '✅ Always use Icon component with size prop',
    '✅ Outline style only (lucide-react)',
    '✅ Default size: sm (16px) for UI elements',
    '✅ Header size: md (20px) for titles',
    '❌ Never use emojis instead of icons',
    '❌ Never mix icon styles or libraries',
    '❌ Never add colored backgrounds to icons (except IconBadge)',
  ],
  
  statusColors: [
    '✅ Green = Confirmed/Paid/Complete',
    '✅ Yellow = Partial/Tentative/Pending',
    '✅ Red = Overdue/Conflict/Error',
    '✅ Blue = Information/Primary Action',
    '✅ Gray = Disabled/Archived/Inactive',
    '❌ Never use custom colors for status',
    '❌ Never use color alone without text label',
  ],
  
  typography: [
    '✅ Use PageTitle for main page heading',
    '✅ Use SectionTitle for major sections',
    '✅ Use Label for form fields',
    '✅ Use Caption for helper text',
    '✅ Use tabular-nums for financial data',
    '❌ Never use arbitrary text sizes',
    '❌ Never skip heading hierarchy levels',
  ],
  
  time: [
    '✅ Always use TimePicker component',
    '✅ 12-hour format with AM/PM',
    '✅ 30-minute intervals',
    '✅ Use formatTimeDisplay() for read-only times',
    '❌ Never allow free-text time entry',
    '❌ Never display 24-hour format to users',
  ],
} as const;

// ==========================================
// COMPONENT PATTERNS
// ==========================================

export const COMPONENT_PATTERNS = {
  dashboard: {
    structure: 'PageTitle → SectionTitle → AmountCard/StatusBadge → Table',
    icons: 'Icon with size="md" for headers',
    amounts: 'AmountCard with variant based on context',
  },
  
  forms: {
    structure: 'PageTitle → SectionTitle → FieldLabel → Input → Caption',
    icons: 'Icon with size="sm" next to labels',
    validation: 'Caption with text-red-600 for errors',
  },
  
  tables: {
    headers: 'FieldLabel or CardTitle',
    amounts: 'Amount component with appropriate variant',
    status: 'StatusBadge for all status columns',
    icons: 'Icon with size="sm" for actions',
  },
  
  modals: {
    title: 'CardTitle or SubsectionTitle',
    content: 'BodyText for descriptions',
    actions: 'Buttons with Icon size="sm"',
  },
  
  calendar: {
    timeDisplay: 'formatTimeDisplay() for all times',
    bookingStatus: 'StatusBadge with getBookingStatusColor()',
    amounts: 'Amount with compact={true} for summaries',
  },
} as const;

// ==========================================
// ACCESSIBILITY GUIDELINES
// ==========================================

export const ACCESSIBILITY_RULES = {
  color: 'Never use color alone to convey meaning - always include text',
  contrast: 'All text must meet WCAG AA standards (4.5:1 minimum)',
  focus: 'All interactive elements must have visible focus states',
  labels: 'All form fields must have associated labels',
  hierarchy: 'Use proper heading hierarchy for screen readers',
  icons: 'Provide aria-label or sr-only text for icon-only buttons',
} as const;

// ==========================================
// EXPORT DESIGN SYSTEM VERSION
// ==========================================

export const DESIGN_SYSTEM_VERSION = '1.0.0';
export const LAST_UPDATED = '2026-01-12';
