# Tentative Reservation Button Clarification

## Changes Made

### Updated CalendarHeaderV2 Buttons

The two main action buttons in the Calendar Header have been updated with clearer labels and icons:

#### Before:
```
[+ New Tentative]  [+ New Reservation]
```

#### After:
```
[⚠️ + New Tentative (Quick Form)]  [✓ + New Reservation (Full Details)]
```

### Button Behavior

#### 1. **"+ New Tentative (Quick Form)"** - Yellow Button
- **Opens**: `TentativeReservationDialog`
- **Purpose**: Quick tentative bookings with minimal information
- **Fields**: Basic customer details, date, time, space
- **Use Case**: Phone inquiries, initial bookings, follow-up required
- **Icon**: ⚠️ AlertCircle (Yellow)
- **Style**: Yellow border, yellow text

#### 2. **"+ New Reservation (Full Details)"** - Blue Button
- **Opens**: `NewReservationDialog`
- **Purpose**: Complete confirmed bookings with all event details
- **Fields**: Full customer info, event details, menu, services, accounts, etc.
- **Use Case**: Confirmed bookings with advance payment
- **Icon**: ✓ CheckCircle (Blue)
- **Style**: Blue background, white text

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              Event Availability Calendar                     │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌───────────────────────┐        ┌───────────────────────┐
│ + New Tentative       │        │ + New Reservation     │
│   (Quick Form)        │        │   (Full Details)      │
└───────────────────────┘        └───────────────────────┘
        │                                     │
        ▼                                     ▼
┌───────────────────────┐        ┌───────────────────────┐
│ TentativeReservation  │        │ NewReservation        │
│ Dialog                │        │ Dialog                │
│                       │        │                       │
│ • Customer Name       │        │ • Customer Details    │
│ • Contact Number      │        │ • Event Information   │
│ • Event Date          │        │ • Menu & Services     │
│ • Time Slot           │        │ • Financial Details   │
│ • Guest Count         │        │ • Payment Terms       │
│ • Notes               │        │ • Complete Invoice    │
└───────────────────────┘        └───────────────────────┘
        │                                     │
        └──────────────────┬──────────────────┘
                           │
                           ▼
                    Booking Created
```

### Alternative Entry Point: Quick Book from Calendar

When clicking on an empty time slot in the calendar:

```
Click Empty Slot
        │
        ▼
┌───────────────────────┐
│  QuickBookDialog      │
│  "Choose Type"        │
└───────────────────────┘
        │
        ├─── Select "Tentative" ───────────────┐
        │                                       │
        │                                       ▼
        │                       ┌───────────────────────┐
        │                       │ TentativeReservation  │
        │                       │ Dialog (Quick Form)   │
        │                       └───────────────────────┘
        │
        └─── Select "Confirmed" ───────────────┐
                                                │
                                                ▼
                                ┌───────────────────────┐
                                │ NewReservation        │
                                │ Dialog (Full Details) │
                                └───────────────────────┘
```

## Visual Improvements

### Button Styling

**Tentative Button** (Yellow Theme):
- Border: Yellow (#EAB308)
- Text: Yellow-700
- Hover: Yellow background (#FEF9C3)
- Icon: AlertCircle ⚠️

**Reservation Button** (Blue Theme):
- Background: Blue (#2563EB)
- Text: White
- Hover: Darker Blue (#1D4ED8)
- Icon: CheckCircle ✓

### Clear Labeling

The parenthetical descriptions make it crystal clear:
- **(Quick Form)** → Less information required, faster entry
- **(Full Details)** → Complete booking with all fields

## User Impact

### Before Update
**Problem**: Users were confused about which button to click
- Both buttons had similar names
- Unclear what form each would open
- No visual distinction beyond color

### After Update
**Solution**: Clear, descriptive button labels
- ✅ Explicit form type in button text
- ✅ Icons indicating urgency/confirmation level
- ✅ Distinct color schemes
- ✅ Hover tooltips can be added for more info

## Usage Guidelines

### When to Use Tentative (Quick Form)
- 📞 Phone inquiries during customer calls
- ⏱️ Quick placeholder for potential bookings
- 🔄 Callback required - need to follow up
- ❓ Customer needs time to decide
- 💰 Waiting for advance payment
- 📋 Minimal information available at time of booking

### When to Use Reservation (Full Details)
- ✅ Confirmed bookings with advance payment
- 📝 Complete event information available
- 💳 Payment terms agreed upon
- 🎯 Menu and services finalized
- 📄 Ready to generate invoice
- ⚖️ All terms and conditions accepted

## Technical Details

### File Modified
- `/src/app/components/calendar/CalendarHeaderV2.tsx`

### Changes Made
1. Added icon imports: `AlertCircle`, `CheckCircle2`
2. Updated button text to include form type
3. Added icons to both buttons
4. Enhanced button className for better styling
5. Added visual distinction with shadow effects

### Code Changes
```typescript
// Before
<Button onClick={onNewTentative}>
  + New Tentative
</Button>

// After
<Button 
  onClick={onNewTentative} 
  className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
>
  <AlertCircle className="size-4 mr-2" />
  + New Tentative (Quick Form)
</Button>
```

## Testing Checklist

- [x] Click "+ New Tentative (Quick Form)" → Opens TentativeReservationDialog
- [x] Click "+ New Reservation (Full Details)" → Opens NewReservationDialog
- [x] Click empty calendar slot → Opens QuickBookDialog
- [x] Select "Tentative" in QuickBookDialog → Opens TentativeReservationDialog
- [x] Select "Confirmed" in QuickBookDialog → Opens NewReservationDialog
- [x] Button styling is visually distinct
- [x] Icons appear correctly
- [x] Hover states work properly

## Future Enhancements (Optional)

1. **Tooltips**: Add hover tooltips with detailed descriptions
2. **Keyboard Shortcuts**: Add keyboard shortcuts (T for Tentative, R for Reservation)
3. **Context Help**: Add "?" icon with popup explaining the difference
4. **User Preferences**: Remember which form user prefers to use by default
5. **Quick Switch**: Allow switching between forms within the dialog

---

**Updated**: January 2026  
**Purpose**: Clarify button behavior to reduce user confusion  
**Status**: ✅ Complete and deployed
