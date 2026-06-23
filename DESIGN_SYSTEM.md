# VenueOps ERP Design System

**Version:** 1.0.0  
**Last Updated:** January 12, 2026  
**Purpose:** Enterprise-grade design system for Banquet & Catering ERP

---

## 🎯 Design Principles

1. **Consistency First** - Same components, same behavior, everywhere
2. **Professional & Calm** - Enterprise aesthetic suitable for daily operations
3. **No Hardcoding** - All values come from the design system
4. **Operational Focus** - Designed for fast, accurate data entry during customer calls
5. **Accessibility** - WCAG AA compliant, keyboard navigable

---

## 💰 Currency System

### Configuration
- **Currency:** PKR (Pakistani Rupee)
- **Format:** `PKR 000,000` (with thousand separators)
- **Decimal:** Hidden for whole numbers, shown when needed

### Components

#### `<Amount>` Component
**Use for ALL monetary displays**

```tsx
import { Amount } from '@/app/components/design-system';

// Basic usage
<Amount value={25000} />
// Output: "PKR 25,000"

// Variants
<Amount value={50000} variant="positive" /> // Green text
<Amount value={-5000} variant="negative" /> // Red text
<Amount value={100000} variant="highlight" /> // Blue text
<Amount value={75000} variant="neutral" /> // Default gray

// Sizes
<Amount value={25000} size="xs" />   // Extra small
<Amount value={25000} size="sm" />   // Small
<Amount value={25000} size="md" />   // Medium (default)
<Amount value={25000} size="lg" />   // Large
<Amount value={25000} size="xl" />   // Extra large
<Amount value={25000} size="2xl" />  // 2x Large

// Options
<Amount value={25000} showDecimals={true} />  // PKR 25,000.00
<Amount value={25000} compact={true} />       // PKR 25K
<Amount value={25000} bold={true} />          // Bold text
```

#### `<CurrencyInput>` Component
**Use for monetary input fields**

```tsx
import { CurrencyInput } from '@/app/components/design-system';

<CurrencyInput
  value={amount}
  onChange={setAmount}
  placeholder="Enter amount"
/>
```

#### `<AmountCard>` Component
**Use for dashboard summary cards**

```tsx
import { AmountCard } from '@/app/components/design-system';

<AmountCard
  label="Total Revenue"
  amount={500000}
  variant="positive"
  icon={<DollarSign />}
/>
```

### Utilities

```tsx
import { formatCurrency, parseCurrency } from '@/app/components/design-system';

formatCurrency(25000);                    // "PKR 25,000"
formatCurrency(25000, { showCode: false }); // "25,000"
formatCurrency(25000, { compact: true });   // "PKR 25K"

parseCurrency("PKR 25,000");  // 25000
```

### ❌ What NOT to Do

```tsx
// ❌ WRONG - Hardcoded currency
<span>Rs. {amount}</span>
<div>$ {price}</div>
<p>₨ {total}</p>

// ✅ CORRECT
<Amount value={amount} />
```

---

## 🎨 Icon System

### Configuration
- **Library:** lucide-react (outline style only)
- **Stroke Width:** 2px (consistent)
- **Default Size:** 16px (sm) for UI elements
- **Header Size:** 20px (md) for titles

### Components

#### `<Icon>` Component
**Use for ALL icons**

```tsx
import { Icon } from '@/app/components/design-system';
import { Calendar, Users, DollarSign } from 'lucide-react';

// Standard usage
<Icon icon={Calendar} size="sm" className="text-gray-600" />
<Icon icon={Users} size="md" className="text-blue-600" />

// Size reference
size="xs"  // 14px - Very small (rare)
size="sm"  // 16px - Default (buttons, inputs, labels)
size="md"  // 20px - Headers, titles
size="lg"  // 24px - Large headers
size="xl"  // 28px - Hero icons (rare)
```

#### `<IconBadge>` Component
**Use for status indicators with icon**

```tsx
import { IconBadge } from '@/app/components/design-system';

<IconBadge icon={Calendar} variant="primary" />
<IconBadge icon={CheckCircle} variant="success" />
```

### Icon Usage by Context

| Context | Size | Example |
|---------|------|---------|
| Buttons | `sm` (16px) | Action buttons |
| Form Labels | `sm` (16px) | Next to field labels |
| Page Headers | `md` (20px) | Page titles |
| Card Headers | `md` (20px) | Card titles |
| Table Actions | `sm` (16px) | Edit, delete icons |

### ❌ What NOT to Do

```tsx
// ❌ WRONG - Direct icon usage
<Calendar className="size-5" />
<Users size={20} />

// ❌ WRONG - Emojis
🗓️ Event Date
💰 Payment

// ❌ WRONG - Colored backgrounds
<div className="bg-blue-500 p-2">
  <Calendar />
</div>

// ✅ CORRECT
<Icon icon={Calendar} size="sm" className="text-gray-600" />
<IconBadge icon={Calendar} variant="primary" />
```

---

## 🎨 Status Color System

### Color Meanings (FIXED - Never Change)

| Color | Meaning | Use Cases |
|-------|---------|-----------|
| 🟢 **Green** | Success, Confirmed, Paid | Confirmed bookings, paid invoices, completed tasks |
| 🟡 **Yellow** | Warning, Partial, Tentative | Tentative bookings, partial payments, pending items |
| 🔴 **Red** | Error, Overdue, Conflict | Cancelled bookings, overdue payments, conflicts |
| 🔵 **Blue** | Info, Primary Action | New bookings, in-progress items, primary buttons |
| ⚪ **Gray** | Neutral, Disabled, Archived | Disabled items, archived records, neutral states |

### Components

#### `<StatusBadge>` Component
**Use for ALL status displays**

```tsx
import { StatusBadge } from '@/app/components/design-system';

<StatusBadge status="confirmed" label="Confirmed" />
<StatusBadge status="tentative" label="Tentative" />
<StatusBadge status="cancelled" label="Cancelled" />
<StatusBadge status="partial" label="Partial Payment" />

// Sizes
<StatusBadge status="confirmed" label="Confirmed" size="sm" />
<StatusBadge status="confirmed" label="Confirmed" size="md" />
<StatusBadge status="confirmed" label="Confirmed" size="lg" />
```

#### `<StatusDot>` Component
**Use for compact status indicators**

```tsx
import { StatusDot } from '@/app/components/design-system';

<StatusDot status="green" size="md" />
```

### Helper Functions

```tsx
import { 
  getBookingStatusColor,
  getPaymentStatusColor,
  getInventoryStatusColor
} from '@/app/components/design-system';

const color = getBookingStatusColor('confirmed');  // 'green'
const color = getPaymentStatusColor('partial');    // 'yellow'
const color = getInventoryStatusColor('low-stock'); // 'yellow'
```

### Status Mapping

#### Booking Status
- **Green:** Confirmed, Reserved
- **Yellow:** Tentative, Hold
- **Red:** Cancelled, Blocked
- **Blue:** Completed
- **Gray:** Draft, Archived

#### Payment Status
- **Green:** Paid, Full
- **Yellow:** Partial, Partially-Paid
- **Red:** Overdue, Failed
- **Blue:** Pending, Processing
- **Gray:** Draft

#### Inventory Status
- **Green:** In-Stock, Available
- **Yellow:** Low-Stock, Warning
- **Red:** Out-of-Stock, Critical
- **Blue:** Ordered, In-Transit
- **Gray:** Discontinued

### ❌ What NOT to Do

```tsx
// ❌ WRONG - Custom colors
<span className="bg-purple-500">VIP</span>
<div className="text-orange-600">Premium</div>

// ❌ WRONG - Color only (no label)
<div className="size-4 bg-green-500" />

// ✅ CORRECT
<StatusBadge status="confirmed" label="Confirmed" />
```

---

## 📝 Typography System

### Hierarchy

| Level | Component | Size | Weight | Use Case |
|-------|-----------|------|--------|----------|
| H1 | `<PageTitle>` | 2xl | Semibold | Main page heading (once per page) |
| H2 | `<SectionTitle>` | xl | Semibold | Major sections |
| H3 | `<SubsectionTitle>` | lg | Semibold | Subsections, card titles |
| H4 | `<CardTitle>` | base | Semibold | Dialog titles, small cards |
| Label | `<FieldLabel>` | sm | Medium | Form labels, table headers |
| Body | `<BodyText>` | sm | Normal | Paragraph text |
| Caption | `<Caption>` | xs | Normal | Helper text, metadata |
| Financial | Custom | base | Semibold | Monetary amounts (tabular nums) |

### Components

```tsx
import { 
  PageTitle,
  SectionTitle,
  SubsectionTitle,
  CardTitle,
  FieldLabel,
  BodyText,
  Caption
} from '@/app/components/design-system';

<PageTitle>Event Availability Calendar</PageTitle>
<SectionTitle>Booking Details</SectionTitle>
<SubsectionTitle>Payment Information</SubsectionTitle>
<CardTitle>Summary</CardTitle>
<FieldLabel required>Guest Name</FieldLabel>
<BodyText>This is a description of the event...</BodyText>
<Caption>Last updated: 2 hours ago</Caption>
```

### Utility Classes

When you can't use components:

```tsx
import { TEXT_STYLES } from '@/app/components/design-system';

<div className={TEXT_STYLES.pageTitle}>Dashboard</div>
<span className={TEXT_STYLES.label}>Email:</span>
<p className={TEXT_STYLES.caption}>Required field</p>
```

### Financial Typography

```tsx
// For monetary amounts - use Amount component
<Amount value={25000} bold size="lg" />

// If you must use custom
<span className="text-base font-semibold tabular-nums">
  PKR 25,000
</span>
```

### ❌ What NOT to Do

```tsx
// ❌ WRONG - Arbitrary sizes
<h1 className="text-3xl">Title</h1>
<p className="text-lg font-black">Text</p>

// ❌ WRONG - Multiple H1s per page
<h1>Dashboard</h1>
<h1>Summary</h1>

// ✅ CORRECT
<PageTitle>Dashboard</PageTitle>
<SectionTitle>Summary</SectionTitle>
```

---

## ⏰ Time System

### Configuration
- **Format:** 12-hour with AM/PM (e.g., "2:30 PM")
- **Intervals:** 30 minutes
- **Range:** 6:00 AM to 5:00 AM (next day)

### Components

```tsx
import { TimePicker, formatTimeDisplay } from '@/app/components/design-system';

// Input
<TimePicker
  value={startTime}
  onChange={setStartTime}
  placeholder="Select time"
/>

// Display (read-only)
<span>{formatTimeDisplay("18:00")}</span>
// Output: "6:00 PM"
```

### Utilities

```tsx
import { 
  formatTimeDisplay,
  formatTimeRangeDisplay,
  convert12To24Hour,
  convert24To12Hour
} from '@/app/components/design-system';

formatTimeDisplay("18:00");              // "6:00 PM"
formatTimeRangeDisplay("13:00", "17:00"); // "1:00 PM to 5:00 PM"
convert12To24Hour("2:30 PM");            // "14:30"
convert24To12Hour("14:30");              // "2:30 PM"
```

---

## 📦 Complete Import Example

```tsx
import {
  // Currency
  Amount,
  CurrencyInput,
  AmountCard,
  formatCurrency,
  
  // Icons
  Icon,
  IconBadge,
  
  // Status
  StatusBadge,
  StatusDot,
  getBookingStatusColor,
  
  // Typography
  PageTitle,
  SectionTitle,
  FieldLabel,
  BodyText,
  Caption,
  
  // Time
  TimePicker,
  formatTimeDisplay,
} from '@/app/components/design-system';

import { Calendar, Users, DollarSign } from 'lucide-react';
```

---

## 🎯 Module Implementation Checklist

When creating or updating a module, ensure:

### ✅ Currency
- [ ] All monetary values use `<Amount>` component
- [ ] No hardcoded currency symbols (Rs., $, etc.)
- [ ] Currency inputs use `<CurrencyInput>`
- [ ] Dashboard summaries use `<AmountCard>`

### ✅ Icons
- [ ] All icons use `<Icon>` component with size prop
- [ ] No direct lucide-react icon usage
- [ ] No emojis used in place of icons
- [ ] Consistent size: sm (16px) for UI, md (20px) for headers

### ✅ Status Colors
- [ ] All statuses use `<StatusBadge>` component
- [ ] Colors match standard meanings (green=confirmed, yellow=partial, etc.)
- [ ] No custom status colors
- [ ] Never color alone - always with text label

### ✅ Typography
- [ ] Page has one `<PageTitle>`
- [ ] Sections use `<SectionTitle>`
- [ ] Form labels use `<FieldLabel>`
- [ ] Helper text uses `<Caption>`
- [ ] No arbitrary text sizes

### ✅ Time
- [ ] All time inputs use `<TimePicker>`
- [ ] All time displays use `formatTimeDisplay()`
- [ ] 12-hour format everywhere
- [ ] No free-text time entry

---

## 🚫 Common Mistakes to Avoid

### Currency
```tsx
❌ <span>Rs. {amount}</span>
✅ <Amount value={amount} />

❌ <div>${price}</div>
✅ <Amount value={price} />
```

### Icons
```tsx
❌ <Calendar className="size-5" />
✅ <Icon icon={Calendar} size="sm" />

❌ 🗓️ Event
✅ <Icon icon={Calendar} size="sm" /> Event
```

### Status Colors
```tsx
❌ <span className="text-purple-600">Premium</span>
✅ <StatusBadge status="highlight" label="Premium" />

❌ <div className="bg-green-500 size-4" />
✅ <StatusBadge status="confirmed" label="Confirmed" />
```

### Typography
```tsx
❌ <h1 className="text-4xl font-bold">Title</h1>
✅ <PageTitle>Title</PageTitle>

❌ <label className="text-xs">Name:</label>
✅ <FieldLabel>Name</FieldLabel>
```

---

## 🎨 Design Tokens Reference

### Colors
```css
/* Primary Palette */
--navy-deep: #1F3A5F;
--gray-light: #F5F7FA;
--charcoal: #2E2E2E;

/* Status Colors */
--green-bg: #F0FDF4;
--green-border: #BBF7D0;
--green-text: #15803D;

--yellow-bg: #FEFCE8;
--yellow-border: #FDE047;
--yellow-text: #A16207;

--red-bg: #FEF2F2;
--red-border: #FECACA;
--red-text: #B91C1C;

--blue-bg: #EFF6FF;
--blue-border: #BFDBFE;
--blue-text: #1D4ED8;

--gray-bg: #F9FAFB;
--gray-border: #E5E7EB;
--gray-text: #374151;
```

### Spacing
```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
--spacing-2xl: 48px;
```

### Border Radius
```css
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
```

---

## 📚 Resources

- **Components Location:** `/src/app/components/design-system/`
- **Main Export:** `/src/app/components/design-system/index.tsx`
- **Icon Library:** [Lucide Icons](https://lucide.dev/)
- **Tailwind Docs:** [TailwindCSS](https://tailwindcss.com/)

---

## 🔄 Version History

- **v1.0.0** (2026-01-12) - Initial design system release
  - Currency system with Amount component
  - Icon system standardization
  - Status color system
  - Typography hierarchy
  - Time picker standardization

---

**Questions?** Refer to inline code documentation in each component file.
