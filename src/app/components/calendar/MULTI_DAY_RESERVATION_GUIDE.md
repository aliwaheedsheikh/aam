# Multi-Day Reservation Workflow - User Guide

## Overview
The Multi-Day Reservation system is designed for events that span multiple consecutive or non-consecutive days, such as:
- **Conferences** (3-day tech summit)
- **Training Programs** (5-day corporate training)
- **Multi-Day Weddings** (Reception on Day 1, Ceremony on Day 2)
- **Festivals** (Eid celebrations across 3 days)
- **Trade Shows** (Week-long exhibition)

## Key Difference: Multi-Day vs Multi-Event

### Multi-Day Reservation:
- **One continuous event** happening over multiple days
- **Same customer**, same event context
- Each day may have different venue, menu, guests
- **Example**: 3-Day Annual Conference (same event, 3 days)
- **Payment**: Can allocate to specific days or combined

### Multi-Event Reservation:
- **Multiple separate events** for same customer
- Different event types (Mehndi, Barat, Walima)
- Each event is independent
- **Example**: Wedding Package (3 different events)
- **Payment**: Can allocate to specific events or combined

---

## Workflow Steps

### Step 1: Select Reservation Type

At the top of the form, you'll see:
```
┌──────────────────────────────────────────┐
│ Reservation Type:                         │
│  [Single Day Event] [Multi-Day Event]    │
└──────────────────────────────────────────┘
```

**Action**: Click **"Multi-Day Event"** button

---

### Step 2: Master Event Configuration

Once Multi-Day mode is active, you'll see:
```
┌─────────────────────────────────────────────────┐
│ Event Title: [Annual Conference 2026       ]    │
│ Total Event Duration: 3 Days     [+ Add Day]    │
└─────────────────────────────────────────────────┘
```

**Fill in**:
- **Event Title**: Descriptive name for the entire multi-day event
- Example: "Annual Tech Summit 2026", "Corporate Training Week"

---

### Step 3: Configure Each Day

Each day has its own collapsible card:

```
┌─────────────────────────────────────────────────┐
│ [Day 1] 📅 Apr 10, 2026  📍 Grand Hall  👥 200  │
│                              Rs. 150,000  [📋] [🗑️] [▼]
├─────────────────────────────────────────────────┤
│ Date: [2026-04-10]     Start: [09:00]           │
│ Venue: [Grand Ballroom]  End: [17:00]           │
│ Guests: [200]           Menu: [Standard Package]│
│ Per Head Rate: [500]    Venue Charges: [25000]  │
│ Service Charges: [15000]                        │
│ ─────────────────────────────────────────────   │
│ Menu Total: Rs. 100,000 | Venue: Rs. 25,000    │
│ Services: Rs. 15,000 | Day Total: Rs. 140,000  │
└─────────────────────────────────────────────────┘
```

**For Each Day, Enter**:
1. **Date**: Event date for this day
2. **Time Slot**: Start and end times
3. **Venue Selection**: Choose venue and space
4. **Guaranteed Guests**: Number of guests for this day
5. **Menu Package**: Menu selection
6. **Per Head Rate**: Menu price per person
7. **Venue Charges**: Rental/venue fees for this day
8. **Service Charges**: Additional services (decor, AV, etc.)
9. **Notes**: Day-specific notes/requirements

---

### Step 4: Add More Days

**To Add Day**:
- Click **"+ Add Day"** button (top right of master header OR bottom of days list)
- New day card appears
- Fill in details for the new day

**To Duplicate Day**:
- Click **📋 Copy icon** on existing day card
- Exact copy created (except date is cleared)
- Useful for similar days (e.g., same menu, different date)

**To Remove Day**:
- Click **🗑️ Trash icon** on day card
- Confirmation dialog appears
- Cannot remove if only 1 day exists

**To Collapse/Expand Day**:
- Click **▼ Chevron icon** to toggle day details
- Keeps interface clean when managing many days

---

### Step 5: Review Grand Total

At the bottom, you'll see:
```
┌─────────────────────────────────────────────────┐
│ Total Days: 3                                    │
│ Total Guests (All Days): 600                     │
│ Average per Day: Rs. 150,000                     │
│ GRAND TOTAL (All Days): Rs. 450,000             │
└─────────────────────────────────────────────────┘
```

This automatically calculates:
- Sum of all day totals
- Total guest count across all days
- Average cost per day

---

### Step 6: Payment Allocation

When recording payments in the **Payment Ledger** section:

```
┌─────────────────────────────────────────────────┐
│ 💰 Payment Allocation                            │
├─────────────────────────────────────────────────┤
│ Allocate To: [Combined (All Days)        ▼]    │
│              [Specific Day               ▼]    │
├─────────────────────────────────────────────────┤
│ Select Day:  [Day 1 - Apr 10 (Rs. 150K)  ▼]   │
│              [Day 2 - Apr 11 (Rs. 150K)  ▼]   │
│              [Day 3 - Apr 12 (Rs. 150K)  ▼]   │
└─────────────────────────────────────────────────┘
```

**Payment Options**:

1. **Combined (Default)**:
   - Payment applies to entire booking
   - Best for: Full advance, package deals
   - Example: Client pays Rs. 200,000 advance for all 3 days

2. **Specific Day**:
   - Payment allocated to one particular day
   - Best for: Per-day billing, installments
   - Example: Client pays Rs. 50,000 for Day 1 only

**In Payment History**:
- Combined payments show: **💼 Combined Payment** badge
- Specific day payments show: **🗓️ Day 2** badge

---

## Use Case Examples

### Example 1: 3-Day Corporate Conference

**Event Title**: "Annual Sales Summit 2026"

**Day 1 - Opening Ceremony** (Apr 10):
- Venue: Grand Ballroom
- Guests: 300
- Menu: Premium Breakfast + Lunch
- Time: 09:00 - 17:00
- Day Total: Rs. 200,000

**Day 2 - Workshop Sessions** (Apr 11):
- Venue: Conference Hall A+B
- Guests: 250
- Menu: Standard Lunch + Tea
- Time: 09:00 - 18:00
- Day Total: Rs. 150,000

**Day 3 - Gala Dinner** (Apr 12):
- Venue: Grand Ballroom
- Guests: 350
- Menu: Premium Dinner
- Time: 19:00 - 23:00
- Day Total: Rs. 300,000

**Grand Total**: Rs. 650,000

**Payment Plan**:
- Advance: Rs. 200,000 (Combined)
- Day 1: Rs. 100,000 (Allocated to Day 1)
- Day 2: Rs. 100,000 (Allocated to Day 2)
- Final: Rs. 250,000 (Combined)

---

### Example 2: 5-Day Training Program

**Event Title**: "Leadership Development Program"

**All 5 Days**:
- Same venue (Training Room 1)
- Same guest count (50 participants)
- Same menu (Standard Lunch + Tea Breaks)
- Different dates (Apr 10-14, excluding weekends)
- Each day: Rs. 75,000

**Quick Setup**:
1. Configure Day 1 completely
2. Click **📋 Duplicate** 4 times
3. Update only the dates for Days 2-5
4. All other settings copied automatically

**Grand Total**: Rs. 375,000 (5 days × Rs. 75,000)

**Payment Plan**:
- Full payment upfront: Rs. 375,000 (Combined)

---

### Example 3: 2-Day Wedding (Reception + Main Event)

**Event Title**: "Ahmed & Fatima Wedding"

**Day 1 - Reception** (Feb 10):
- Venue: Garden Terrace
- Guests: 200
- Menu: Evening Tea + Snacks
- Time: 17:00 - 20:00
- Day Total: Rs. 150,000

**Day 2 - Main Wedding** (Feb 11):
- Venue: Grand Ballroom
- Guests: 500
- Menu: Premium Dinner Buffet
- Time: 19:00 - 01:00
- Day Total: Rs. 650,000

**Grand Total**: Rs. 800,000

**Payment Plan**:
- Advance: Rs. 300,000 (Combined)
- Before Day 1: Rs. 150,000 (Allocated to Day 1)
- Before Day 2: Rs. 350,000 (Combined for remaining)

---

## Navigation & Data Entry Tips

### Efficient Data Entry:

1. **Customer Info First**:
   - Fill customer details (name, phone) in Customer Information section
   - This is shared across all days

2. **Multi-Day Configuration**:
   - Go to "Event Details" or "Venue Selection" section
   - Multi-Day Reservation interface appears
   - Fill master event title

3. **Day-by-Day Setup**:
   - Configure Day 1 completely
   - Use **Duplicate** for similar days
   - Expand/collapse days to manage screen space

4. **Other Sections**:
   - Customer Info, Payment Ledger, etc. work normally
   - They apply to the entire multi-day booking

### Keyboard Shortcuts (Planned):
- `Ctrl + D`: Duplicate current day
- `Ctrl + N`: Add new day
- `Alt + ↑/↓`: Navigate between days

---

## Single-Day Mode Unchanged

**Important**: If you select **"Single Day Event"**:
- Everything works exactly as before
- No multi-day interface shown
- Multi-Event Manager (Mehndi/Barat/Walima) still available
- Zero impact on existing single-day workflow

---

## System Behavior

### Calculations:
- **Day Total** = (Guests × Per Head Rate) + Venue Charges + Service Charges
- **Grand Total** = Sum of all Day Totals
- **Payments** = Can be combined or day-specific
- **Balance** = Grand Total - Total Payments

### Data Storage:
- All days stored in one booking record
- Event title saved at booking level
- Each day maintains its own configuration
- Payments track allocation (combined vs specific)

### Reporting (Future):
- Per-day revenue breakdown
- Multi-day event analysis
- Day-wise guest attendance tracking
- Payment allocation reports

---

## Common Questions

**Q: Can I have different venues for each day?**  
A: Yes! Each day has independent venue selection.

**Q: What if guest count changes for one day?**  
A: Edit that specific day's guest count. Other days unaffected.

**Q: Can I record advance for all days and balance per day?**  
A: Yes! Use "Combined" for advance, "Specific Day" for day-wise balance.

**Q: Is multi-day the same as multi-event (Mehndi/Barat)?**  
A: No. Multi-day = one event over multiple days. Multi-event = separate events (different types).

**Q: Can I switch from multi-day to single-day after creating?**  
A: Not recommended. Data may be lost. Plan reservation type before starting.

**Q: What happens to single-day bookings?**  
A: Zero impact. Single-day workflow completely unchanged.

---

## Technical Details

### Multi-Day Data Structure:
```typescript
interface EventDay {
  id: string;
  dayNumber: number;
  date: string;
  venueId: string;
  venueName: string;
  primeSpaceId: string;
  primeSpaceName: string;
  guaranteedGuests: number;
  menuPackage: string;
  menuRate: number;
  startTime: string;
  endTime: string;
  venueCharges: number;
  serviceCharges: number;
  dayTotal: number; // Auto-calculated
  notes: string;
}
```

### Payment Allocation:
```typescript
interface PaymentEntry {
  // ... existing fields
  allocationType: 'combined' | 'specific-day';
  allocatedTo: string; // 'combined' or day ID
}
```

---

## Support & Training

**Need Help?**
- In-app tooltips on each field
- Help documentation: Section 5.3 "Multi-Day Reservations"
- Training video: "Multi-Day Booking Workflow" (8 min)
- Front desk support: ext. 234

**Best Practices**:
1. Always fill Event Title (helps in reports)
2. Use duplicate for similar days (saves time)
3. Verify guest counts per day (common mistake)
4. Record payments with clear allocation
5. Add day notes for special requirements

---

## Future Enhancements

- [ ] Day-wise kitchen orders
- [ ] Per-day setup/teardown schedules
- [ ] Automatic day numbering with date sorting
- [ ] Bulk edit (apply changes to multiple days)
- [ ] Day templates (save common day configurations)
- [ ] Visual timeline view of all days
- [ ] Day-wise inventory allocation
- [ ] Per-day staff assignments
