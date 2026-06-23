# Reservation Types - Visual Comparison Guide

## Quick Reference: Which Reservation Type to Use?

```
┌─────────────────────────────────────────────────────────────┐
│                    DECISION TREE                             │
└─────────────────────────────────────────────────────────────┘

Is it ONE customer?
    │
    ├─→ YES → Is it ONE continuous event over multiple days?
    │         │
    │         ├─→ YES → 🗓️ MULTI-DAY RESERVATION
    │         │         (Conference, Training, Trade Show)
    │         │
    │         └─→ NO → Are there MULTIPLE separate events?
    │                   │
    │                   ├─→ YES → 🎉 MULTI-EVENT (Single-Day Mode)
    │                   │         (Mehndi + Barat + Walima)
    │                   │
    │                   └─→ NO → ✅ SINGLE-DAY RESERVATION
    │                             (Birthday, One-day Wedding)
    │
    └─→ NO → Multiple customers = Create separate bookings
```

---

## Type 1: Single-Day Reservation (Default)

### When to Use:
- Standard one-day events
- Birthday parties
- One-day corporate events
- Single wedding ceremonies
- Regular bookings

### Visual Interface:
```
┌──────────────────────────────────────────────────────┐
│ Reservation Type: [Single Day Event✓] [Multi-Day]   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ 📅 Single Event Booking    [+ Add Another Event]     │
└──────────────────────────────────────────────────────┘

Customer: Ahmed Khan
Event: Birthday Party
Date: April 10, 2026
Venue: Garden Hall
Guests: 150
Total: Rs. 200,000
```

### Characteristics:
- ✅ Clean, simple interface
- ✅ One date, one venue, one menu
- ✅ Fast data entry
- ✅ Most common scenario (95% of bookings)

---

## Type 2: Multi-Event Reservation (Single-Day Mode)

### When to Use:
- Multiple **separate events** for same customer
- Different event **types** (Mehndi, Barat, Walima)
- Different **dates** (may be days apart)
- Different **venues** possible
- Each event is **independent**

### Visual Interface:
```
┌──────────────────────────────────────────────────────┐
│ Reservation Type: [Single Day Event✓] [Multi-Day]   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ 📅 Multi-Event Booking [3 Events]    [+ Add Event]  │
├──────────────────────────────────────────────────────┤
│  ✓ Mehndi - Feb 10 | Garden Hall | 300 | Rs. 200K   │
│    Barat - Feb 12 | Ballroom | 500 | Rs. 700K       │
│    Walima - Feb 13 | Ballroom | 400 | Rs. 600K      │
│  ────────────────────────────────────────────────────│
│  🎊 GRAND TOTAL: Rs. 1,500,000                       │
└──────────────────────────────────────────────────────┘

Customer: Ahmed & Fatima (shared)
Event 1: Mehndi (Feb 10) - Rs. 200K
Event 2: Barat (Feb 12) - Rs. 700K
Event 3: Walima (Feb 13) - Rs. 600K
Total: Rs. 1,500,000
Payment: Combined ledger
```

### Characteristics:
- ✅ Multiple **distinct** events
- ✅ Different **event types**
- ✅ May have different **dates** (days or weeks apart)
- ✅ Each event configured **independently**
- ✅ One customer, one payment ledger
- ✅ Common for: Wedding packages, VIP clients

---

## Type 3: Multi-Day Reservation

### When to Use:
- **ONE continuous event** over multiple days
- **Same event context** (conference, training, exhibition)
- Consecutive or non-consecutive days
- Each day may have different venue/menu/guests
- Day-specific configurations needed

### Visual Interface:
```
┌──────────────────────────────────────────────────────┐
│ Reservation Type: [Single Day] [Multi-Day Event✓]   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ Event Title: Annual Tech Summit 2026                 │
│ Total Duration: 3 Days              [+ Add Day]      │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ [Day 1] Apr 10 | Ballroom | 300 | Rs. 150K  [📋][🗑️][▼]│
├──────────────────────────────────────────────────────┤
│ Date: Apr 10 | Time: 09:00-17:00                    │
│ Venue: Grand Ballroom | Guests: 300                 │
│ Menu: Breakfast + Lunch | Rate: Rs. 400             │
│ Day Total: Rs. 150,000                              │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ [Day 2] Apr 11 | Hall A | 250 | Rs. 120K    [📋][🗑️][▼]│
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ [Day 3] Apr 12 | Ballroom | 350 | Rs. 180K  [📋][🗑️][▼]│
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ GRAND TOTAL: Rs. 450,000 | 3 Days | 900 Guests      │
└──────────────────────────────────────────────────────┘

Customer: XYZ Corporation (shared)
Event: Annual Tech Summit 2026 (ONE event)
Days: 3 (Apr 10-12)
Day 1: Rs. 150K | Day 2: Rs. 120K | Day 3: Rs. 180K
Total: Rs. 450,000
Payment: Combined OR day-specific allocation
```

### Characteristics:
- ✅ **ONE event** spanning multiple days
- ✅ **Same event title/context**
- ✅ Each day has own configuration
- ✅ Day-wise breakdowns
- ✅ Payment allocation per day (optional)
- ✅ Common for: Conferences, training, exhibitions

---

## Side-by-Side Comparison

| Feature | Single-Day | Multi-Event | Multi-Day |
|---------|-----------|-------------|-----------|
| **Customer** | One | One | One |
| **Event Count** | One | Multiple (2+) | One (multi-day) |
| **Event Types** | One type | Different types | Same type |
| **Dates** | One date | Multiple dates | Multiple dates |
| **Configuration** | Simple | Per-event | Per-day |
| **Payment Ledger** | Simple | Combined | Combined or per-day |
| **Use Case** | Birthday | Mehndi+Barat+Walima | 3-Day Conference |
| **Complexity** | Low | Medium | Medium |
| **Interface** | Minimal | Event cards | Day cards |
| **Independence** | N/A | Events are separate | Days are connected |
| **Grand Total** | Direct | Sum of events | Sum of days |

---

## Real-World Examples

### Example 1: Birthday Party
**Type**: ✅ Single-Day Reservation

```
Customer: Ali Khan
Event: Birthday Party
Date: April 15, 2026
Venue: Garden Hall
Guests: 150
Menu: Standard Package
Total: Rs. 180,000
```

**Why Single-Day?**
- One customer, one event, one date
- Simplest scenario
- No need for multi-event or multi-day

---

### Example 2: Wedding Package (Mehndi + Barat + Walima)
**Type**: 🎉 Multi-Event (Single-Day Mode)

```
Customer: Ahmed & Fatima
Booking: Wedding Package

Event 1 - Mehndi:
  Date: February 10, 2026
  Type: Mehndi
  Venue: Garden Terrace
  Guests: 300
  Total: Rs. 200,000

Event 2 - Barat:
  Date: February 12, 2026
  Type: Barat (Main Wedding)
  Venue: Grand Ballroom
  Guests: 500
  Total: Rs. 700,000

Event 3 - Walima:
  Date: February 13, 2026
  Type: Walima (Reception)
  Venue: Grand Ballroom
  Guests: 400
  Total: Rs. 600,000

Grand Total: Rs. 1,500,000
```

**Why Multi-Event?**
- Three **distinct** events
- Different **event types**
- Different **configurations**
- Customer wants **package deal**

---

### Example 3: Annual Conference
**Type**: 🗓️ Multi-Day Reservation

```
Customer: Tech Corp Pakistan
Event: Annual Sales Summit 2026
Duration: 3 Days

Day 1 - Opening Ceremony (April 10):
  Venue: Grand Ballroom
  Time: 09:00 - 17:00
  Guests: 300
  Menu: Breakfast + Lunch + Tea
  Total: Rs. 200,000

Day 2 - Workshop Sessions (April 11):
  Venue: Conference Halls A+B
  Time: 09:00 - 18:00
  Guests: 250
  Menu: Lunch + Tea Breaks
  Total: Rs. 150,000

Day 3 - Gala Dinner (April 12):
  Venue: Grand Ballroom
  Time: 19:00 - 23:00
  Guests: 350
  Menu: Premium Dinner
  Total: Rs. 300,000

Grand Total: Rs. 650,000
```

**Why Multi-Day?**
- **ONE continuous event** (the conference)
- Happens over **multiple days**
- Each day has different setup
- Need per-day tracking
- Client may pay per day

---

### Example 4: Training Program
**Type**: 🗓️ Multi-Day Reservation

```
Customer: Leadership Institute
Event: Management Training Program
Duration: 5 Days (Mon-Fri, April 10-14)

All Days:
  Venue: Training Room 1
  Time: 09:00 - 17:00
  Guests: 50 participants
  Menu: Lunch + Tea Breaks
  Per Day: Rs. 75,000

Grand Total: Rs. 375,000 (5 days)
```

**Why Multi-Day?**
- **ONE training program**
- Spans **5 days**
- **Same configuration** each day
- Use **duplicate feature** to save time

---

## Payment Handling Comparison

### Single-Day:
```
Total: Rs. 200,000
├─ Advance: Rs. 60,000
└─ Balance: Rs. 140,000
```

### Multi-Event:
```
Grand Total: Rs. 1,500,000

Option A - Combined:
├─ Advance: Rs. 500,000 (Combined)
└─ Balance: Rs. 1,000,000 (Combined)

Option B - Per Event:
├─ Mehndi: Rs. 200,000 (Allocated)
├─ Barat: Rs. 700,000 (Allocated)
└─ Walima: Rs. 600,000 (Allocated)

Option C - Mixed:
├─ Advance: Rs. 500,000 (Combined)
├─ Mehndi Balance: Rs. 100,000 (Allocated to Mehndi)
├─ Barat Balance: Rs. 500,000 (Allocated to Barat)
└─ Final: Rs. 400,000 (Combined)
```

### Multi-Day:
```
Grand Total: Rs. 650,000

Option A - Combined:
├─ Advance: Rs. 200,000 (Combined)
└─ Balance: Rs. 450,000 (Combined)

Option B - Per Day:
├─ Day 1: Rs. 200,000 (Allocated to Day 1)
├─ Day 2: Rs. 150,000 (Allocated to Day 2)
└─ Day 3: Rs. 300,000 (Allocated to Day 3)

Option C - Mixed:
├─ Advance: Rs. 200,000 (Combined)
├─ Before Day 1: Rs. 150,000 (Allocated to Day 1)
├─ Before Day 2: Rs. 100,000 (Allocated to Day 2)
└─ Final: Rs. 200,000 (Combined)
```

---

## Common Mistakes & How to Avoid

### ❌ Mistake 1: Using Multi-Event for Multi-Day Conference
**Wrong**:
```
Event 1: Conference Day 1
Event 2: Conference Day 2
Event 3: Conference Day 3
```
**Why Wrong?**: It's ONE conference, not three separate events

**Correct**: Use **Multi-Day Reservation**

---

### ❌ Mistake 2: Using Multi-Day for Mehndi+Barat+Walima
**Wrong**:
```
Day 1: Mehndi
Day 2: Barat
Day 3: Walima
```
**Why Wrong?**: These are three distinct EVENT TYPES, not days of one event

**Correct**: Use **Multi-Event** (Single-Day Mode)

---

### ❌ Mistake 3: Creating Separate Bookings for Wedding Package
**Wrong**:
```
Booking 1: Mehndi (Feb 10)
Booking 2: Barat (Feb 12)
Booking 3: Walima (Feb 13)
```
**Why Wrong?**: Same customer, package deal, consolidated payment

**Correct**: Use **Multi-Event** (Single-Day Mode) - ONE booking with 3 events

---

## Quick Decision Guide

**Ask yourself:**

1. **How many customers?**
   - One → Continue
   - Multiple → Separate bookings

2. **How many dates?**
   - One date → **Single-Day**
   - Multiple dates → Continue to #3

3. **Are the events on different dates the SAME TYPE or DIFFERENT TYPES?**
   - Same type (e.g., all "Conference") → **Multi-Day**
   - Different types (Mehndi, Barat, Walima) → **Multi-Event**

4. **Is it ONE continuous event or MULTIPLE separate events?**
   - One continuous → **Multi-Day**
   - Multiple separate → **Multi-Event**

---

## System Behavior Summary

### Switching Between Types:
- ⚠️ **Cannot switch** after booking is created
- ⚠️ Choose correct type before data entry
- ℹ️ If wrong type selected, create new booking

### Data Sharing:
- **All Types**: Customer info is shared
- **Single-Day**: All data for one event
- **Multi-Event**: Each event has own data
- **Multi-Day**: Each day has own data

### Reporting:
- **Single-Day**: Standard event report
- **Multi-Event**: Per-event + consolidated reports
- **Multi-Day**: Per-day + event-level reports

---

## Training Checklist

For front office staff:

- [ ] Understand difference: Multi-Event vs Multi-Day
- [ ] Know when to use each type
- [ ] Practice: Create single-day booking
- [ ] Practice: Create multi-event booking (wedding)
- [ ] Practice: Create multi-day booking (conference)
- [ ] Understand payment allocation options
- [ ] Know common mistakes to avoid

---

## Support

**Need Help Choosing?**
1. Describe the booking to supervisor
2. Check this comparison guide
3. Use decision tree above
4. If still unsure, ask before creating

**Training Resources**:
- Video: "Reservation Types Explained" (5 min)
- Documentation: Section 5 "Booking Types"
- Practice scenarios in test environment
