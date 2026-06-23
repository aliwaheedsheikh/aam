# NewReservationDialog.tsx - Maintenance Guide

## File Status
- **Total Lines**: ~4143 lines
- **Status**: ✅ Syntax errors fixed (duplicate `/>` tags removed)
- **Size**: Large - requires careful maintenance

## Recent Fixes Applied
1. ✅ Line 1000: Removed duplicate `/>` after customerName Input
2. ✅ Line 1025: Removed duplicate `/>` after contactNumber Input

## File Structure Overview

### State Management (Lines 1-450)
- Customer information (name, contact, email, address)
- Event details (date, time, venue, guest count)
- Menu and services (food, beverages, additional services)
- Without Food mode (sitting arrangements, add-ons)
- RCS Services
- Accounts (payments, discounts, taxes)

### Helper Functions (Lines 450-700)
- `handleAddBeverage()` - Add beverage line item
- `handleRemoveBeverage()` - Remove beverage
- `formatPakistaniPhoneNumber()` - Format phone numbers
- `handleCopyToWhatsApp()` - Copy contact to WhatsApp
- Various calculation functions

### Form Submission (Lines 650-750)
- `handleSave()` - Collects all form data and calls onSave

### JSX Rendering (Lines 770-4143)
- Dialog header with resize handles
- Tab navigation (Customer, Event, Menu, RCS, Accounts, Complete)
- Customer information form
- Event details form
- Menu selection with accordion sections
- RCS services form
- Accounts and payment form
- Summary and confirmation

## Common Issues & Solutions

### Issue 1: Duplicate JSX Closing Tags
**Symptom**: ERROR: The character ">" is not valid inside a JSX element
**Cause**: Extra `/>` after Input/Select components
**Solution**: Search for patterns like:
```tsx
placeholder="..." />
/>  // <-- Remove this duplicate
```

### Issue 2: Build Performance
**Symptom**: Slow builds, memory issues
**Cause**: Large file size (4143 lines)
**Solution**: File is working but large. Consider refactoring if needed.

### Issue 3: Missing Imports
**Symptom**: Component not found errors
**Solution**: Ensure all imports at top are present:
- Dialog components from '../ui/dialog'
- Form components (Button, Input, Label, Textarea, Select)
- All lucide-react icons
- CompactAccordion, ExpandableTextarea, ServiceRow from './CompactMenuUI'
- MenuSelectionDialog from './MenuSelectionDialog'

## Refactoring Strategy (If Needed in Future)

To reduce file size, you can extract sections into separate components:

### 1. CustomerInfoForm.tsx (CREATED ✅)
Located at: `/src/app/components/calendar/forms/CustomerInfoForm.tsx`
Handles: All customer information fields

### 2. EventDetailsForm.tsx (Can be created if needed)
Would handle: Date, time, venue, guest count, event type

### 3. MenuServicesForm.tsx (Can be created if needed)
Would handle: Menu selection, beverages, food supplies, additional services

### 4. RCSServicesForm.tsx (Can be created if needed)
Would handle: RCS service line items

### 5. AccountsForm.tsx (Can be created if needed)
Would handle: Charges, discounts, tax, payments

### 6. reservation-utils.ts (CREATED ✅)
Located at: `/src/app/components/calendar/forms/reservation-utils.ts`
Contains: Helper functions for formatting and calculations

## How to Maintain This File

### DO ✅
- Test after every change
- Search for duplicate patterns before saving
- Use proper code formatting
- Keep state updates immutable
- Use useMemo for expensive calculations

### DON'T ❌
- Don't manually format phone numbers - use formatPakistaniPhoneNumber()
- Don't add duplicate `/>` tags
- Don't remove imports without checking usage
- Don't modify the Dialog structure without testing
- Don't add state without memoizing calculations if needed

## Testing Checklist

After any changes, verify:
- [ ] File builds without errors
- [ ] Dialog opens and closes properly
- [ ] All tabs are accessible
- [ ] Form validation works
- [ ] Phone number formatting works
- [ ] Menu selection dialog works
- [ ] Calculations update correctly
- [ ] Save button creates booking
- [ ] No console errors

## Performance Tips

1. **State**: Already using useState for all form fields
2. **Calculations**: Already using useMemo for totals
3. **Re-renders**: Properly memoized to prevent excessive renders
4. **Events**: Using proper event handlers

## Current Status: ✅ WORKING

The file has been fixed and should work without errors. The duplicate `/>` tags that were causing the JSX parsing errors have been removed.

### If you still see errors:
1. Clear your browser cache
2. Restart the Vite dev server
3. Check for any other duplicate closing tags
4. Verify all imports are correct

## File Locations
- Main Dialog: `/src/app/components/calendar/NewReservationDialog.tsx`
- Helper Components: `/src/app/components/calendar/forms/CustomerInfoForm.tsx`
- Utils: `/src/app/components/calendar/forms/reservation-utils.ts`
- Compact UI: `/src/app/components/calendar/CompactMenuUI.tsx`
- Menu Dialog: `/src/app/components/calendar/MenuSelectionDialog.tsx`
