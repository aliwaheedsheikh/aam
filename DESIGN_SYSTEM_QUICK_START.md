# Design System Quick Start Guide

**For Developers**: Fast reference for implementing design system components

---

## 🚀 Quick Import

```tsx
import {
  // Currency
  Amount, CurrencyInput, AmountCard, formatCurrency,
  
  // Icons
  Icon, IconBadge,
  
  // Status
  StatusBadge, StatusDot, getBookingStatusColor,
  
  // Typography
  PageTitle, SectionTitle, SubsectionTitle, CardTitle,
  FieldLabel, BodyText, Caption,
  
  // Time
  TimePicker, formatTimeDisplay,
} from '@/app/components/design-system';

import { Calendar, Users, DollarSign } from 'lucide-react';
```

---

## 💰 Currency - Most Common Use Cases

### Display Money
```tsx
// Simple amount
<Amount value={25000} />
// Output: "PKR 25,000"

// With color
<Amount value={50000} variant="positive" bold />  // Green
<Amount value={-5000} variant="negative" />       // Red
<Amount value={100000} variant="highlight" />     // Blue

// Compact for dashboards
<Amount value={2500000} compact bold size="xl" />
// Output: "PKR 2.5L"
```

### Input Money
```tsx
const [amount, setAmount] = useState('');

<CurrencyInput
  value={amount}
  onChange={setAmount}
/>
```

### Dashboard Cards
```tsx
<AmountCard
  label="Total Revenue"
  amount={500000}
  variant="positive"
  icon={<Icon icon={DollarSign} size="md" />}
/>
```

---

## 🎨 Icons - Most Common Use Cases

### Standard Icon
```tsx
// In buttons, labels, headers
<Icon icon={Calendar} size="sm" className="text-gray-600" />
<Icon icon={Users} size="md" className="text-blue-600" />

// Sizes:
// sm = 16px (default for UI)
// md = 20px (headers)
```

### With Text
```tsx
<div className="flex items-center gap-2">
  <Icon icon={Calendar} size="sm" className="text-gray-600" />
  <span>Event Date</span>
</div>
```

---

## 🎨 Status Colors - Most Common Use Cases

### Status Badges
```tsx
<StatusBadge status="confirmed" label="Confirmed" />
<StatusBadge status="tentative" label="Tentative" />
<StatusBadge status="cancelled" label="Cancelled" />
<StatusBadge status="partial" label="Partial Payment" />
```

### Dynamic Status
```tsx
const statusColor = getBookingStatusColor(booking.status);
<StatusBadge status={statusColor} label={booking.status} />
```

### Color Meanings (FIXED)
- **Green** → Confirmed, Paid, Complete
- **Yellow** → Tentative, Partial, Pending
- **Red** → Cancelled, Overdue, Error
- **Blue** → Info, In Progress
- **Gray** → Disabled, Archived

---

## 📝 Typography - Most Common Use Cases

### Page Structure
```tsx
<PageTitle>Event Calendar</PageTitle>  {/* Once per page */}

<SectionTitle>Booking Details</SectionTitle>  {/* Major sections */}

<SubsectionTitle>Payment Info</SubsectionTitle>  {/* Cards/panels */}

<CardTitle>Summary</CardTitle>  {/* Dialog titles */}
```

### Forms
```tsx
<FieldLabel required>Guest Name</FieldLabel>
<Input />
<Caption>Enter full name as per ID</Caption>
```

### Content
```tsx
<BodyText>
  This is a description...
</BodyText>

<Caption>Last updated 2 hours ago</Caption>
```

---

## ⏰ Time - Most Common Use Cases

### Time Input
```tsx
const [startTime, setStartTime] = useState('');

<TimePicker
  value={startTime}
  onChange={setStartTime}
  placeholder="Select time"
/>
```

### Display Time
```tsx
// Show 12-hour format
<span>{formatTimeDisplay("18:00")}</span>
// Output: "6:00 PM"

// Show time range
<span>{formatTimeRangeDisplay("13:00", "17:00")}</span>
// Output: "1:00 PM to 5:00 PM"
```

---

## 📋 Complete Component Examples

### Booking Card
```tsx
<div className="border rounded-lg p-4">
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <Icon icon={Calendar} size="md" className="text-blue-600" />
      <CardTitle>Wedding Booking</CardTitle>
    </div>
    <StatusBadge status="confirmed" label="Confirmed" />
  </div>
  
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Icon icon={Users} size="sm" className="text-gray-500" />
      <BodyText>250 guests</BodyText>
    </div>
    
    <div className="flex items-center gap-2">
      <Icon icon={Clock} size="sm" className="text-gray-500" />
      <BodyText>{formatTimeDisplay("18:00")}</BodyText>
    </div>
    
    <div className="flex items-center gap-2">
      <Icon icon={DollarSign} size="sm" className="text-gray-500" />
      <Amount value={500000} variant="positive" />
    </div>
  </div>
</div>
```

### Dashboard Summary
```tsx
<div className="space-y-6">
  <PageTitle>Front Office Dashboard</PageTitle>
  
  <SectionTitle>Today's Overview</SectionTitle>
  
  <div className="grid grid-cols-4 gap-4">
    <AmountCard
      label="Total Revenue"
      amount={2500000}
      variant="positive"
      icon={<Icon icon={DollarSign} size="md" />}
      compact
    />
    
    <AmountCard
      label="Pending Payments"
      amount={350000}
      variant="highlight"
      icon={<Icon icon={Clock} size="md" />}
      compact
    />
    
    {/* More cards... */}
  </div>
</div>
```

### Form Section
```tsx
<div className="space-y-4">
  <SectionTitle>Customer Details</SectionTitle>
  
  <div>
    <FieldLabel required>Full Name</FieldLabel>
    <Input />
    <Caption>As per CNIC or Passport</Caption>
  </div>
  
  <div>
    <FieldLabel>Total Amount</FieldLabel>
    <CurrencyInput value={amount} onChange={setAmount} />
  </div>
  
  <div>
    <FieldLabel>Event Time</FieldLabel>
    <TimePicker value={time} onChange={setTime} />
  </div>
</div>
```

---

## 🚫 Common Mistakes

### ❌ Wrong
```tsx
<span>Rs. {amount}</span>
<Calendar className="size-5" />
<span className="bg-purple-500">VIP</span>
<h1 className="text-4xl">Title</h1>
<input type="time" />
```

### ✅ Correct
```tsx
<Amount value={amount} />
<Icon icon={Calendar} size="sm" />
<StatusBadge status="highlight" label="VIP" />
<PageTitle>Title</PageTitle>
<TimePicker value={time} onChange={setTime} />
```

---

## 📦 File Locations

- **Components**: `/src/app/components/design-system/`
- **Main Export**: `/src/app/components/design-system/index.tsx`
- **Documentation**: `/DESIGN_SYSTEM.md`
- **Showcase**: `/src/app/components/design-system/DesignSystemShowcase.tsx`

---

## 🎯 Checklist for New Screens

Before submitting any new screen:

- [ ] All money displays use `<Amount>`
- [ ] All icons use `<Icon>` with size
- [ ] All statuses use `<StatusBadge>`
- [ ] Typography uses system components
- [ ] Time inputs use `<TimePicker>`
- [ ] No hardcoded currency symbols
- [ ] No emojis in UI
- [ ] No custom status colors
- [ ] Proper heading hierarchy

---

**Need Help?** Check `/DESIGN_SYSTEM.md` for complete documentation.
