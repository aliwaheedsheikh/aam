# Hierarchical Venue Booking Display Logic

## How Overlapping Time Slots Appear on Screen

### Scenario Example:
**Marquee 1** is booked with different spaces across different time slots on the same day:

1. **Lunch Time (1 PM - 4 PM)**: Full Marquee 1 (Prime Space) booked
2. **Dinner Time (6 PM - 10 PM)**: Both Sub-halls (M1-A and M1-B) booked separately

---

## Visual Display in Day View Timeline

### During Lunch Time (1 PM - 4 PM):

```
┌─────────────────────────────────────────────────────────────┐
│ Prime Space / Sub Space    │ 1PM │ 2PM │ 3PM │ 4PM │ ...    │
├─────────────────────────────────────────────────────────────┤
│ Marquee 1                  │ ████ AHMED KHAN ████ │ ...    │
│ (Cap: 1000)                │    Wedding Lunch     │        │
│                            │     900 pax          │        │
├─────────────────────────────────────────────────────────────┤
│ M1-A (Sub-Space)           │  [HIDDEN - Prime    │ ...    │
│                            │   Space Booked]     │        │
├─────────────────────────────────────────────────────────────┤
│ M1-B (Sub-Space)           │  [HIDDEN - Prime    │ ...    │
│                            │   Space Booked]     │        │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- ✅ **Marquee 1 (Prime Space)** is VISIBLE and shows RED booking block
- ❌ **M1-A and M1-B (Sub-Spaces)** are HIDDEN during lunch hours
- ✅ Sub-spaces automatically hide because parent is booked

---

### During Dinner Time (6 PM - 10 PM):

```
┌─────────────────────────────────────────────────────────────┐
│ Prime Space / Sub Space    │ 6PM │ 7PM │ 8PM │ 9PM │ 10PM  │
├─────────────────────────────────────────────────────────────┤
│ Marquee 1                  │  [HIDDEN - Sub      │        │
│ (Cap: 1000)                │   Spaces Booked]    │        │
├─────────────────────────────────────────────────────────────┤
│ M1-A (Sub-Space)           │ ████ SARA ALI ████ │        │
│ (Cap: 500)                 │     Walima          │        │
│                            │    450 pax          │        │
├─────────────────────────────────────────────────────────────┤
│ M1-B (Sub-Space)           │ ████ BILAL AHMED ████       │
│ (Cap: 500)                 │     Reception       │        │
│                            │    480 pax          │        │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- ❌ **Marquee 1 (Prime Space)** is HIDDEN during dinner hours
- ✅ **M1-A (Sub-Space)** is VISIBLE and shows RED booking block
- ✅ **M1-B (Sub-Space)** is VISIBLE and shows RED booking block
- ✅ Parent prime space automatically hides when any sub-space is booked

---

## Complete Day View (All Time Slots):

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Space              │ 12PM│ 1PM │ 2PM │ 3PM │ 4PM │ 5PM │ 6PM │ 7PM │ 8PM │ 9PM │
├────────────────────────────────────────────────────────────────────────────────┤
│ Marquee 1          │ ✅  │ ████████ AHMED KHAN ████████ │ ✅  │ [HIDDEN]      │
│                    │     │   Wedding Lunch - 900 pax    │     │               │
├────────────────────────────────────────────────────────────────────────────────┤
│ M1-A               │ ✅  │ [HIDDEN - Prime Booked]      │ ✅  │ ████ SARA ████│
│                    │     │                              │     │  Walima-450   │
├────────────────────────────────────────────────────────────────────────────────┤
│ M1-B               │ ✅  │ [HIDDEN - Prime Booked]      │ ✅  │ ████ BILAL ███│
│                    │     │                              │     │ Reception-480 │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Hierarchical Hiding Rules

### Rule 1: Prime Space Booking Hides Sub-Spaces
When a **Prime Space** (e.g., Marquee 1) is booked:
- ✅ Prime Space row is VISIBLE and shows booking
- ❌ ALL Sub-Space rows are HIDDEN during that time slot
- 🎯 Front office sees only the full venue booking

### Rule 2: Sub-Space Booking Hides Prime Space
When ANY **Sub-Space** (e.g., M1-A or M1-B) is booked:
- ❌ Prime Space row is HIDDEN during that time slot
- ✅ Booked Sub-Space rows are VISIBLE
- ✅ Other available Sub-Spaces remain VISIBLE
- 🎯 Front office sees individual hall bookings

### Rule 3: Multiple Sub-Spaces Booked
When MULTIPLE Sub-Spaces are booked:
- ❌ Prime Space remains HIDDEN
- ✅ Each booked Sub-Space shows its own booking
- ✅ Available Sub-Spaces show as green (available)
- 🎯 Front office can still book remaining sub-spaces

---

## Color Coding (Status)

| Status | Color | Display |
|--------|-------|---------|
| ✅ Available | Green | Empty cell with "+" on hover |
| 🟡 Tentative | Yellow | Customer name + time + pax |
| 🔴 Confirmed | Red | Customer name + time + pax |

---

## Month View Display

In Month View, the same day shows:
```
┌───────────────────────┐
│   Saturday, Dec 28    │
├───────────────────────┤
│ Marquee 1             │
│ • 1PM-4PM: 🔴 Booked  │
│                       │
│ M1-A                  │
│ • 6PM-10PM: 🔴 Booked │
│                       │
│ M1-B                  │
│ • 6PM-10PM: 🔴 Booked │
└───────────────────────┘
```

---

## Agenda View Display

Shows chronological list:
```
🔴 1:00 PM - 4:00 PM  Marquee 1 (Full)
   Ahmed Khan Wedding Lunch - 900 guests
   
🔴 6:00 PM - 10:00 PM  M1-A (Sub-Space)
   Sara Ali Walima - 450 guests
   
🔴 6:00 PM - 10:00 PM  M1-B (Sub-Space)
   Bilal Ahmed Reception - 480 guests
```

---

## Benefits for Front Office

1. **Quick Visual Scanning**: Instantly see available vs booked
2. **No Confusion**: Rows auto-hide based on booking hierarchy
3. **3-Second Availability Check**: Can answer customer immediately
4. **Flexible Booking**: Can book prime or sub-spaces separately
5. **Double-Booking Prevention**: System enforces hierarchy rules

---

## Test This Feature

To see this in action:
1. Open the calendar app
2. Select **Aiwan-e-Akbari** venue
3. Navigate to **Today's date**
4. Switch to **Day View**
5. Look at **Marquee 1** row:
   - Scroll to 1 PM: See full Marquee booking (sub-spaces hidden)
   - Scroll to 6 PM: See sub-space bookings (prime space hidden)
6. Expand/collapse rows to see the hierarchy

---

## Current Implementation Status

✅ **Hierarchical booking logic** implemented in `availability-v2.ts`
✅ **Time-slot-aware hiding functions** added:
   - `shouldHidePrimeSpaceInTimeSlot()`
   - `shouldHideSubSpaceInTimeSlot()`
✅ **Day View** displays bookings with proper hiding
✅ **Demo bookings** added to show overlapping scenarios
✅ **Color coding** implemented for status visualization

🔄 **Future Enhancement**: Dynamic row hiding per time slot (currently rows hide if ANY booking exists on that date)
