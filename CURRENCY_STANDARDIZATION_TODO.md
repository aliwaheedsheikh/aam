# Currency Standardization - Action Items

## Issue
Different currency symbols are being used across modules:
- **Accounts & Finance**: Using ₹ (Indian Rupee)
- **General Manager Dashboard**: Using "PKR " + toLocaleString()
- **Design System Standard**: PKR with "PKR 000,000" format

## Required Changes

### 1. Accounts & Finance Module (`/src/app/components/finance/AccountsFinanceManagement.tsx`)

**Import Statement (DONE):**
```tsx
import { Amount } from '../design-system';
```

**Replace all ₹ symbols with Amount component:**

#### Dashboard KPI Cards:
```tsx
// ❌ OLD:
<p className="text-3xl font-bold text-gray-900">₹{(metrics.totalPayables / 100000).toFixed(1)}L</p>

// ✅ NEW:
<Amount value={metrics.totalPayables} variant="neutral" size="2xl" bold compact />
```

#### Aging Analysis Sections:
```tsx
// ❌ OLD:
<p className="text-lg font-bold text-green-700">₹{(metrics.aging.ar.current / 1000).toFixed(0)}K</p>

// ✅ NEW:
<Amount value={metrics.aging.ar.current} variant="positive" size="lg" bold compact />
```

#### Recent Activity Lists:
```tsx
// ❌ OLD:
<span className="text-gray-600">Amount: ₹{inv.totalAmount.toLocaleString()}</span>
<span className="text-red-600">Pending: ₹{inv.amountPending.toLocaleString()}</span>

// ✅ NEW:
<span className="text-gray-600">Amount: <Amount value={inv.totalAmount} size="sm" /></span>
<span><Amount value={inv.amountPending} variant="negative" size="sm" /></span>
```

#### Table Cells:
```tsx
// ❌ OLD:
<p className="font-bold text-gray-900">₹{inv.totalAmount.toLocaleString()}</p>
<p className="font-semibold text-green-600">₹{inv.amountPaid.toLocaleString()}</p>
<p className="font-semibold text-red-600">₹{inv.amountPending.toLocaleString()}</p>

// ✅ NEW:
<Amount value={inv.totalAmount} variant="neutral" bold />
<Amount value={inv.amountPaid} variant="positive" bold />
<Amount value={inv.amountPending} variant="negative" bold />
```

#### Payment Receipts & Vouchers:
```tsx
// ❌ OLD:
<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
  ₹{receipt.amount.toLocaleString()}
</span>

// ✅ NEW:
<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
  <Amount value={receipt.amount} size="xs" showCode={false} />
</span>
```

#### Expenses Table:
```tsx
// ❌ OLD:
<td className="px-4 py-3 text-right font-bold text-gray-900">
  ₹{exp.amount.toLocaleString()}
</td>

// ✅ NEW:
<td className="px-4 py-3 text-right">
  <Amount value={exp.amount} bold />
</td>
```

### 2. General Manager Dashboard (`/src/app/components/erp/dashboards/GeneralManagerDashboard.tsx`)

**Add Import:**
```tsx
import { Amount } from '../../design-system';
```

**Replace all PKR + toLocaleString() with Amount component:**

#### Approval Bookings Section (Lines 421, 426, 432):
```tsx
// ❌ OLD:
<p className="font-bold text-gray-900">PKR {totalAmount.toLocaleString()}</p>
<p className="font-bold text-yellow-600">PKR {advanceAmount.toLocaleString()}</p>
<p className="font-bold text-red-600">PKR {(totalAmount - advanceAmount).toLocaleString()}</p>

// ✅ NEW:
<Amount value={totalAmount} bold />
<Amount value={advanceAmount} variant="highlight" bold />
<Amount value={totalAmount - advanceAmount} variant="negative" bold />
```

#### Pending Payments Section (Lines 529, 533, 538):
```tsx
// ❌ OLD:
<p className="font-bold text-gray-900">PKR {totalAmount.toLocaleString()}</p>
<p className="font-semibold text-green-600">PKR {paidAmount.toLocaleString()}</p>
<p className={`font-bold ${paid >= total ? 'text-green-600' : 'text-orange-600'}`}>
  PKR {(totalAmount - paidAmount).toLocaleString()}
</p>

// ✅ NEW:
<Amount value={totalAmount} bold />
<Amount value={paidAmount} variant="positive" bold />
<Amount value={totalAmount - paidAmount} variant={paidAmount >= totalAmount ? "positive" : "negative"} bold />
```

#### Overdue Invoices Section (Lines 644, 648, 652):
Same pattern as above.

#### Overdue Vendor Bills Section (Lines 713, 717, 721):
Same pattern as above.

## Quick Search & Replace Guide

### For Accounts & Finance:

1. **Find:** `₹{(metrics.totalReceivables / 100000).toFixed(1)}L`  
   **Replace:** `<Amount value={metrics.totalReceivables} variant="neutral" size="2xl" bold compact />`

2. **Find:** `₹{inv.totalAmount.toLocaleString()}`  
   **Replace:** `<Amount value={inv.totalAmount} />`

3. **Find:** `₹{inv.amountPaid.toLocaleString()}`  
   **Replace:** `<Amount value={inv.amountPaid} variant="positive" />`

4. **Find:** `₹{inv.amountPending.toLocaleString()}`  
   **Replace:** `<Amount value={inv.amountPending} variant="negative" />`

### For General Manager Dashboard:

1. **Find:** `PKR {totalAmount.toLocaleString()}`  
   **Replace:** `<Amount value={totalAmount} bold />`

2. **Find:** `PKR {advanceAmount.toLocaleString()}`  
   **Replace:** `<Amount value={advanceAmount} variant="highlight" bold />`

3. **Find:** `PKR {paidAmount.toLocaleString()}`  
   **Replace:** `<Amount value={paidAmount} variant="positive" bold />`

## Testing Checklist

After making changes, verify:

- [ ] Accounts & Finance Dashboard shows "PKR 2.5L" format for large numbers
- [ ] General Manager Dashboard shows "PKR 250,000" format
- [ ] All amounts are consistently formatted
- [ ] Green color for positive values (paid, received)
- [ ] Red color for negative values (pending, overdue)
- [ ] Blue color for highlight values (advances, partial payments)
- [ ] No ₹ or hardcoded currency symbols anywhere
- [ ] toLocaleString() removed - all amounts use Amount component

## Files to Update

1. `/src/app/components/finance/AccountsFinanceManagement.tsx` - ~18 replacements
2. `/src/app/components/erp/dashboards/GeneralManagerDashboard.tsx` - ~12 replacements

## Notes

- Use `compact={true}` for dashboard summary cards to show "PKR 2.5L" instead of "PKR 2,500,000"
- Use `size="2xl"` for large KPI numbers
- Use `size="sm"` or `size="xs"` for table cells and small displays
- Always use `variant` prop to indicate meaning: positive (green), negative (red), highlight (blue), neutral (gray)
- Remove `showCode={false}` only when space is very tight (like in badges)
