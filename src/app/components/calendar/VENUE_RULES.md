# Venue Reservation Rules & Dependencies

## Overview
The VenueOps ERP system implements a hierarchical venue booking system that manages dependencies between full venues and their sub-venues to prevent double-booking and ensure accurate space allocation.

---

## Primary Rules

### Rule 1: Full Venue Booking Rule
**When a full venue (M1, M2, M3, G1, G2, G3) is booked, ALL corresponding sub-venues become unavailable.**

**Example:**
- ✅ Marquee 1 (Prime) is booked
- ❌ M1-A becomes UNAVAILABLE
- ❌ M1-B becomes UNAVAILABLE

**Implementation:** 
- File: `/src/app/components/calendar/availability-logic.ts`
- Function: `isVenueAvailable()` - Lines 95-107
- Logic: When checking sub-venue availability, the system verifies if the parent venue is booked as a full venue

---

### Rule 2: Sub-Venue Booking Rule
**If ANY sub-venue (e.g., M1-A) is booked, the corresponding full venue (M1) becomes unavailable.**

**Example:**
- ✅ M1-A is booked
- ❌ Marquee 1 (Prime) becomes UNAVAILABLE
- ✅ M1-B remains AVAILABLE (can still be booked)

**Implementation:**
- File: `/src/app/components/calendar/availability-logic.ts`
- Function: `isVenueAvailable()` - Lines 64-74
- Logic: When checking full venue availability, the system scans all sub-venues to ensure none are booked

---

### Rule 3: Concurrent Sub-Venue Rule
**Multiple sub-venues of the same primary venue CAN be booked simultaneously if available.**

**Example:**
- ✅ M1-A is booked
- ✅ M1-B is AVAILABLE and can be booked concurrently
- ❌ Marquee 1 (Prime) is UNAVAILABLE (due to Rule 2)

**Implementation:**
- File: `/src/app/components/calendar/availability-logic.ts`
- Function: `isVenueAvailable()` - Lines 82-87
- Logic: Each sub-venue is checked independently; sibling sub-venues don't block each other

---

## Dependency Relationships

### Marquee Venues (M1, M2, M3)

| Scenario | M1 (Prime) | M1-A | M1-B | Notes |
|----------|------------|------|------|-------|
| **Initial State** | ✅ Available | ✅ Available | ✅ Available | All available |
| **M1 booked** | ❌ Booked | ❌ Blocked | ❌ Blocked | Rule 1: Full venue blocks all sub-venues |
| **M1-A booked** | ❌ Blocked | ❌ Booked | ✅ Available | Rule 2: Sub-venue blocks parent |
| **M1-B booked** | ❌ Blocked | ✅ Available | ❌ Booked | Rule 2: Sub-venue blocks parent |
| **M1-A + M1-B booked** | ❌ Blocked | ❌ Booked | ❌ Booked | Rule 3: Concurrent sub-venue booking |

### Garden Venues (G1, G2, G3)

Same dependency pattern applies:
- **G1 (Prime) booked** ⟹ G1-A and G1-B unavailable
- **G1-A booked** ⟹ G1 (Prime) unavailable, G1-B available
- **G1-B booked** ⟹ G1 (Prime) unavailable, G1-A available
- **G1-A AND G1-B** ⟹ Both can be booked concurrently

---

## Technical Implementation

### 1. Availability Checking (`isVenueAvailable`)

**Location:** `/src/app/components/calendar/availability-logic.ts`

**Parameters:**
- `venueId`: The venue being checked
- `date`: Event date
- `slot`: Lunch or Dinner
- `bookings`: All existing bookings
- `requestType`: 'full' or 'partial'

**Returns:**
```typescript
{
  available: boolean;
  reason?: string;  // "Sub-venue M1-A is already booked" or "Full venue booked by..."
}
```

**Algorithm:**
1. Filter bookings by date and slot
2. If requesting FULL venue:
   - Check if full venue itself is booked
   - Check if ANY sub-venue is booked (blocks full venue)
3. If requesting PARTIAL venue:
   - Check if this specific sub-venue is booked
   - Check if parent venue is booked as full
4. Return availability status with detailed reason

---

### 2. Get Available Venues (`getAvailableVenues`)

**Location:** `/src/app/components/calendar/availability-logic.ts`

**Purpose:** Returns list of all available venues matching criteria

**Filters:**
- Venue type (full vs. partial)
- Minimum capacity
- Date and slot availability
- Parent-child dependencies

---

### 3. Venue Status Display (`getVenueSlotStatus`)

**Location:** `/src/app/components/calendar/availability-logic.ts`

**Returns:**
```typescript
{
  status: 'available' | 'tentative' | 'confirmed' | 'blocked';
  booking?: Booking;
  reason?: string;
}
```

**Status Types:**
- **available**: Venue is free
- **tentative**: Tentative booking exists
- **confirmed**: Confirmed booking exists
- **blocked**: Unavailable due to parent/child dependency

---

## User Interface Integration

### Venue Selection Dialog

**File:** `/src/app/components/calendar/VenueSelectionDialog.tsx`

**Features:**
- Step-by-step selection flow
- Real-time availability filtering
- Visual rule explanations with examples
- Clear indication of blocked venues

**Rules Display (Lines 231-246):**
```
📋 Venue Reservation Rules & Dependencies:
- Rule 1: Full Venue Booking
- Rule 2: Sub-Venue Booking  
- Rule 3: Concurrent Sub-Venues

Examples:
• Marquee 1 (Prime) booked → M1-A and M1-B unavailable
• M1-A booked → Marquee 1 unavailable, but M1-B still available
• M1-A and M1-B can both be booked concurrently
```

---

### Day View Calendar

**File:** `/src/app/components/calendar/DayView.tsx`

**Features:**
- Shows venue availability matrix
- Displays "Blocked" status with reason
- Color-coded status indicators:
  - 🟢 Green: Available
  - 🟡 Yellow: Tentative
  - 🔴 Red: Confirmed
  - ⚫ Gray: Blocked

**Blocked Reason Display (Lines 138-142, 176-180):**
```tsx
{lunchSlot.status === 'blocked' && lunchSlot.reason && (
  <div className="text-xs text-gray-500 mt-1">
    {lunchSlot.reason}
  </div>
)}
```

Examples of blocked reasons:
- "Sub-venue M1-A is already booked"
- "Full venue Marquee 1 is booked"

---

## Data Structure

### Venue Object
```typescript
interface Venue {
  id: string;
  name: string;
  capacity: number;
  isSubVenue: boolean;
  parentVenueId?: string;
  subVenues?: Venue[];
}
```

### Booking Object
```typescript
interface Booking {
  id: string;
  venueId: string;
  isFullVenue: boolean;  // Critical flag for Rule 1 & 2
  customerName: string;
  date: Date;
  slot: 'lunch' | 'dinner';
  status: 'tentative' | 'confirmed';
  // ... other fields
}
```

---

## Business Logic Examples

### Example 1: Wedding Reception at M1 (Prime)

**Booking Details:**
- Venue: Marquee 1 (Full Venue)
- Date: January 20, 2026
- Slot: Dinner
- Guest Count: 800

**System Behavior:**
1. ✅ Marquee 1 marked as BOOKED (full venue)
2. ❌ M1-A automatically becomes BLOCKED
3. ❌ M1-B automatically becomes BLOCKED
4. User interface shows:
   - M1: "Confirmed - Ali Raza (800 guests)"
   - M1-A: "Blocked - Full venue Marquee 1 is booked"
   - M1-B: "Blocked - Full venue Marquee 1 is booked"

---

### Example 2: Two Concurrent Events in M1 Sub-Venues

**Booking 1:**
- Venue: M1-A (Partial Venue)
- Event: Corporate Lunch
- Slot: Lunch
- Guests: 300

**Booking 2:**
- Venue: M1-B (Partial Venue)  
- Event: Birthday Party
- Slot: Lunch
- Guests: 250

**System Behavior:**
1. ✅ M1-A marked as BOOKED
2. ✅ M1-B marked as BOOKED (concurrent booking allowed)
3. ❌ Marquee 1 (Prime) automatically becomes BLOCKED
4. User interface shows:
   - M1-A: "Confirmed - ABC Corp (300 guests)"
   - M1-B: "Confirmed - Sara Ahmad (250 guests)"
   - M1: "Blocked - Sub-venue M1-A is already booked"

---

### Example 3: Attempted Overbooking (Prevented)

**Scenario:**
1. M1-A is already booked for Lunch
2. User tries to book Marquee 1 (Prime) for Lunch

**System Response:**
```typescript
{
  available: false,
  reason: "Sub-venue M1-A is already booked"
}
```

**UI Behavior:**
- Marquee 1 does NOT appear in available venues list
- If user navigates to calendar, M1 shows "Blocked" status
- Error message explains the dependency

---

## Validation & Error Prevention

### Frontend Validation
- **VenueSelectionDialog:** Only shows available venues
- **NewReservationDialog:** Pre-validates venue selection
- **Calendar Views:** Visual indicators prevent invalid selections

### Business Logic Validation
- **isVenueAvailable():** Enforces all three rules
- **getAvailableVenues():** Filters out unavailable venues
- **getVenueSlotStatus():** Provides detailed blocking reasons

### Error Messages
All error messages are user-friendly and specific:
- ✅ "Sub-venue M1-A is already booked"
- ✅ "Full venue booked by Ali Raza"
- ❌ NOT: "Venue unavailable" (too vague)

---

## Testing Scenarios

### Test Case 1: Full Venue Blocks Sub-Venues
1. Book Marquee 1 (Prime) for Jan 20, Dinner
2. Verify M1-A shows "Blocked" status
3. Verify M1-B shows "Blocked" status
4. Attempt to book M1-A → Should fail with clear reason

### Test Case 2: Sub-Venue Blocks Full Venue
1. Book M1-A for Jan 21, Lunch
2. Verify Marquee 1 shows "Blocked" status
3. Verify M1-B shows "Available" status
4. Attempt to book M1 → Should fail
5. Successfully book M1-B (concurrent booking)

### Test Case 3: Concurrent Sub-Venue Bookings
1. Book M1-A for Jan 22, Dinner
2. Verify M1-B is still "Available"
3. Book M1-B for Jan 22, Dinner
4. Verify both M1-A and M1-B show "Confirmed"
5. Verify M1 shows "Blocked"

---

## Future Enhancements

### Potential Features:
1. **Automatic Upgrade Suggestions**
   - If M1-A and M1-B are both requested, suggest booking M1 (Prime)
   - Potential cost savings or capacity benefits

2. **Dynamic Pricing**
   - Full venue booking at discounted rate vs. sum of sub-venues
   - Encourages full venue bookings

3. **Waiting List Management**
   - Queue requests for blocked venues
   - Auto-notify when dependencies are cleared

4. **Split Billing**
   - When M1-A and M1-B booked separately
   - Track separate customer invoices

---

## Support & Troubleshooting

### Common Issues:

**Q: Why can't I book Marquee 1 even though it shows available?**
A: Check if any sub-venue (M1-A or M1-B) is already booked for that date/slot.

**Q: Can I book M1-A and M1-B for different customers?**
A: Yes! Rule 3 allows concurrent sub-venue bookings.

**Q: What happens if I cancel M1-A?**
A: If M1-B is not booked, Marquee 1 (Prime) becomes available. If M1-B is booked, M1 remains blocked.

---

## Related Files

- `/src/app/components/calendar/availability-logic.ts` - Core availability logic
- `/src/app/components/calendar/VenueSelectionDialog.tsx` - Venue selection UI
- `/src/app/components/calendar/NewReservationDialog.tsx` - Booking creation
- `/src/app/components/calendar/DayView.tsx` - Calendar day view
- `/src/app/components/calendar/MonthView.tsx` - Calendar month view
- `/src/app/components/calendar/mock-data.ts` - Venue definitions
- `/src/app/components/calendar/types.ts` - TypeScript interfaces

---

**Last Updated:** January 15, 2026  
**System Version:** VenueOps ERP v1.0  
**Contact:** System Administrator
