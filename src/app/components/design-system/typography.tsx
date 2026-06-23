// Global Typography System for VenueOps ERP
// Consistent text hierarchy across all modules

import { cn } from '../ui/utils';

// ==========================================
// TYPOGRAPHY CONFIGURATION
// ==========================================

/**
 * TYPOGRAPHY HIERARCHY:
 * 
 * Page Title (H1): Main page heading
 * Section Title (H2): Major sections within a page
 * Subsection Title (H3): Subsections and card titles
 * Label: Form labels, table headers
 * Body: Standard paragraph text
 * Caption: Helper text, metadata
 * Financial: Monetary amounts (uses tabular nums)
 */

export const TYPOGRAPHY = {
  pageTitle: {
    size: 'text-2xl',
    weight: 'font-semibold',
    color: 'text-gray-900',
    lineHeight: 'leading-tight',
  },
  sectionTitle: {
    size: 'text-xl',
    weight: 'font-semibold',
    color: 'text-gray-900',
    lineHeight: 'leading-tight',
  },
  subsectionTitle: {
    size: 'text-lg',
    weight: 'font-semibold',
    color: 'text-gray-900',
    lineHeight: 'leading-tight',
  },
  cardTitle: {
    size: 'text-base',
    weight: 'font-semibold',
    color: 'text-gray-900',
    lineHeight: 'leading-normal',
  },
  label: {
    size: 'text-sm',
    weight: 'font-medium',
    color: 'text-gray-700',
    lineHeight: 'leading-normal',
  },
  body: {
    size: 'text-sm',
    weight: 'font-normal',
    color: 'text-gray-900',
    lineHeight: 'leading-relaxed',
  },
  caption: {
    size: 'text-xs',
    weight: 'font-normal',
    color: 'text-gray-600',
    lineHeight: 'leading-normal',
  },
  financial: {
    size: 'text-base',
    weight: 'font-semibold',
    color: 'text-gray-900',
    lineHeight: 'leading-normal',
    extra: 'tabular-nums', // Monospaced numbers for alignment
  },
} as const;

// ==========================================
// TYPOGRAPHY COMPONENTS
// ==========================================

interface PageTitleProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Page Title (H1) - Main page heading
 * Use once per page at the top
 */
export function PageTitle({ children, className }: PageTitleProps) {
  const { size, weight, color, lineHeight } = TYPOGRAPHY.pageTitle;
  return (
    <h1 className={cn(size, weight, color, lineHeight, className)}>
      {children}
    </h1>
  );
}

interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Section Title (H2) - Major sections within a page
 */
export function SectionTitle({ children, className }: SectionTitleProps) {
  const { size, weight, color, lineHeight } = TYPOGRAPHY.sectionTitle;
  return (
    <h2 className={cn(size, weight, color, lineHeight, className)}>
      {children}
    </h2>
  );
}

interface SubsectionTitleProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Subsection Title (H3) - Subsections and card titles
 */
export function SubsectionTitle({ children, className }: SubsectionTitleProps) {
  const { size, weight, color, lineHeight } = TYPOGRAPHY.subsectionTitle;
  return (
    <h3 className={cn(size, weight, color, lineHeight, className)}>
      {children}
    </h3>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card Title - Titles within cards and dialogs
 */
export function CardTitle({ children, className }: CardTitleProps) {
  const { size, weight, color, lineHeight } = TYPOGRAPHY.cardTitle;
  return (
    <h4 className={cn(size, weight, color, lineHeight, className)}>
      {children}
    </h4>
  );
}

interface LabelProps {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

/**
 * Label - Form labels and table headers
 */
export function FieldLabel({ children, required = false, className }: LabelProps) {
  const { size, weight, color, lineHeight } = TYPOGRAPHY.label;
  return (
    <label className={cn(size, weight, color, lineHeight, className)}>
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

interface BodyTextProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Body Text - Standard paragraph text
 */
export function BodyText({ children, className }: BodyTextProps) {
  const { size, weight, color, lineHeight } = TYPOGRAPHY.body;
  return (
    <p className={cn(size, weight, color, lineHeight, className)}>
      {children}
    </p>
  );
}

interface CaptionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Caption - Helper text, metadata, timestamps
 */
export function Caption({ children, className }: CaptionProps) {
  const { size, weight, color, lineHeight } = TYPOGRAPHY.caption;
  return (
    <span className={cn(size, weight, color, lineHeight, className)}>
      {children}
    </span>
  );
}

// ==========================================
// TYPOGRAPHY UTILITY CLASSES
// ==========================================

/**
 * Utility classes for direct use in components
 * When you can't use the component wrapper
 */
export const TEXT_STYLES = {
  // Headings
  pageTitle: cn(
    TYPOGRAPHY.pageTitle.size,
    TYPOGRAPHY.pageTitle.weight,
    TYPOGRAPHY.pageTitle.color,
    TYPOGRAPHY.pageTitle.lineHeight
  ),
  sectionTitle: cn(
    TYPOGRAPHY.sectionTitle.size,
    TYPOGRAPHY.sectionTitle.weight,
    TYPOGRAPHY.sectionTitle.color,
    TYPOGRAPHY.sectionTitle.lineHeight
  ),
  subsectionTitle: cn(
    TYPOGRAPHY.subsectionTitle.size,
    TYPOGRAPHY.subsectionTitle.weight,
    TYPOGRAPHY.subsectionTitle.color,
    TYPOGRAPHY.subsectionTitle.lineHeight
  ),
  cardTitle: cn(
    TYPOGRAPHY.cardTitle.size,
    TYPOGRAPHY.cardTitle.weight,
    TYPOGRAPHY.cardTitle.color,
    TYPOGRAPHY.cardTitle.lineHeight
  ),
  
  // Content
  label: cn(
    TYPOGRAPHY.label.size,
    TYPOGRAPHY.label.weight,
    TYPOGRAPHY.label.color,
    TYPOGRAPHY.label.lineHeight
  ),
  body: cn(
    TYPOGRAPHY.body.size,
    TYPOGRAPHY.body.weight,
    TYPOGRAPHY.body.color,
    TYPOGRAPHY.body.lineHeight
  ),
  caption: cn(
    TYPOGRAPHY.caption.size,
    TYPOGRAPHY.caption.weight,
    TYPOGRAPHY.caption.color,
    TYPOGRAPHY.caption.lineHeight
  ),
  
  // Financial
  financial: cn(
    TYPOGRAPHY.financial.size,
    TYPOGRAPHY.financial.weight,
    TYPOGRAPHY.financial.color,
    TYPOGRAPHY.financial.lineHeight,
    TYPOGRAPHY.financial.extra
  ),
} as const;

// ==========================================
// TYPOGRAPHY USAGE GUIDELINES
// ==========================================

export const TYPOGRAPHY_GUIDE = {
  rules: [
    '✅ DO: Use PageTitle once per page at the top',
    '✅ DO: Use SectionTitle for major divisions',
    '✅ DO: Use SubsectionTitle for cards and panels',
    '✅ DO: Use Label for all form fields',
    '✅ DO: Use Caption for helper text and metadata',
    '✅ DO: Use tabular-nums for financial amounts',
    '',
    '❌ DON\'T: Use arbitrary text sizes',
    '❌ DON\'T: Mix font weights randomly',
    '❌ DON\'T: Use multiple h1 elements per page',
    '❌ DON\'T: Skip heading levels (h1 → h3)',
  ],
  
  hierarchy: {
    page: 'PageTitle (2xl, semibold)',
    section: 'SectionTitle (xl, semibold)',
    subsection: 'SubsectionTitle (lg, semibold)',
    card: 'CardTitle (base, semibold)',
    label: 'Label (sm, medium)',
    body: 'Body (sm, normal)',
    caption: 'Caption (xs, normal)',
    financial: 'Financial (base, semibold, tabular)',
  },
  
  examples: {
    dashboard: 'PageTitle → SectionTitle → CardTitle → Body → Caption',
    form: 'PageTitle → SectionTitle → Label → Body → Caption',
    table: 'PageTitle → SectionTitle → Label (headers) → Body (cells)',
  },
} as const;