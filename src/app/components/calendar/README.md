# Event Availability Calendar - Hierarchical Venue Booking System

## Overview

This calendar system implements a sophisticated hierarchical venue booking logic for banquet/marquee events. It supports both full venue and partial (sub-venue) bookings with automatic blocking rules.

## Venue Structure

### Full Venues (Parent)
- **M1** - Marquee 1 - Grand Palace (1000 capacity)
- **M2** - Marquee 2 - Crystal Hall (800 capacity)
- **M3** - Marquee 3 - Royal Garden (600 capacity)
- **G1** - Grand Hall 1 - Aiwan-e-Akbari (1200 capacity)
- **G2** - Grand Hall 2 - Taj Convention (1500 capacity)
- **G3** - Grand Hall 3 - Pearl Pavilion (900 capacity)

### Partial Venues (Sub-venues)
Each full venue can be subdivided into two sub-venues:
- **M1-A** / **M1-B** (500 each)
- **M2-A** / **M2-B** (400 each)
- **M3-A** / **M3-B** (300 each)
- **G1-A** / **G1-B** (700 / 500)
- **G2-A** / **G2-B** (900 / 600)
- **G3-A** / **G3-B** (450 each)

## Booking Logic Rules

### Rule 1: Full Venue Booking
When a full venue is booked:
- ✅ The entire venue is marked as unavailable
- ❌ All sub-venues automatically become unavailable
- ❌ Cannot book any sub-venue of that parent

**Example:** M1 is fully booked
- Result: M1, M1-A, and M1-B all show as unavailable

### Rule 2: Partial Venue Booking
When a sub-venue is booked:
- ✅ Only that specific sub-venue is marked as unavailable
- ❌ The parent full venue automatically becomes unavailable
- ✅ Other sub-venues of the same parent remain available independently

**Example:** M2-A is booked
- Result: M2-A is unavailable, M2 (full) is blocked, M2-B remains available

### Rule 3: Multiple Sub-Venue Bookings
Multiple sub-venues can be booked on the same day:
- ✅ Each sub-venue can be booked independently
- ❌ Once any sub-venue is booked, the parent becomes unavailable
- ✅ Remaining sub-venues can still be booked separately

**Example:** G1-A is booked on a date
- Result: G1 (full) cannot be booked, G1-B is still available and can be booked

## User Flow

### Step 1: Date Selection
User selects:
- Event date
- Time slot (Lunch / Dinner)
- Expected guest count (optional, filters by capacity)

### Step 2: Space Type Selection
User chooses:
- **Full Venue** - Shows only parent venues (M1, M2, M3, G1, G2, G3)
- **Partial Venue** - Shows only sub-venues (M1-A, M1-B, etc.)

### Step 3: Venue Selection
System displays only available venues based on:
- Selected date and slot
- Venue type (Full/Partial)
- Capacity requirements
- Existing bookings and hierarchical rules

## Calendar Views

### Month View
- Shows availability summary for each day
- Color-coded dots for Lunch/Dinner slots
- Hover cards display detailed venue-wise availability
- Counts of available venues shown in parentheses

### Day Grid View
- Grid showing all venues for a specific day
- Slot-by-slot availability for Lunch and Dinner
- "Blocked" status shown when venue is unavailable due to parent/child booking
- Capacity and venue type displayed

### Day Timeline View (Resource Timeline)
A sophisticated 24-hour timeline showing nested venue bookings with visual blocking.

```
Time →   08  09  10  11  12  13  14  15  16  17  18  19  20  21  22  23
-----------------------------------------------------------------------
M1       ·   ▓▓  ▓▓   ·   ·   ·   ·   ·   ·   ·   ▓▓  ▓▓  ▓▓  ·   ·

  M1-A   ·   ░░  ░░   ·   ■■  ■■   ·   ·   ·   ·   ·   ·   ·   ·

  M1-B   ·   ░░  ░░   ·   ■■  ■■   ·   ·   ·   ·   ·   ·   ·   ·

  M1-C   ·   ░░  ░░   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·  
```

**Legend:**
- `·` = Free slot (available)
- `▓▓` = Full venue booking (parent)
- `░░` = Blocked background (due to parent booking)
- `■■` = Sub-venue booking (child)

**Features:**
- **Nested Resources**: Parent venues expand/collapse to show sub-venues
- **Background Blocking**: When full venue is booked, all sub-venues show grey blocked background
- **Multi-slot Display**: Shows bookings across entire day, not just lunch/dinner
- **Visual Conflict Detection**: Instantly see which venues are blocked and why
- **Color Coding**: 
  - 🔴 Red = Confirmed booking
  - 🟡 Yellow = Tentative booking
  - 🟢 Green = Available slot
  - ⚫ Grey = Blocked slot

**Timeline Example:**
```
Today's Schedule for Marquee 3:

Time →   12:00 │ 13:00 │ 14:00 │ 15:00 │ 16:00 │ 17:00 │ 18:00 │ 19:00 │ 20:00 │ 21:00 │ 22:00
-----------------------------------------------------------------------------------------
M3 (Full)  │       │       │       │       │       │       │██████Tentative Full Venue██████│
  M3-A     │████Confirmed Kamran H.████│       │       │████-background-blocked██████████│
  M3-B     │       │       │       │       │       │       │████-background-blocked██████████│
```

This shows:
1. M3-A has a confirmed lunch booking (12:00-17:00) for Kamran Hussain
2. M3 (full venue) has a tentative dinner booking (18:00-24:00) for Ayesha Tariq
3. When M3 full venue is booked for dinner, both M3-A and M3-B show blocked background

### Agenda View
- List of all bookings with filters
- Filter by date range, venue, status
- Shows full venue vs partial venue bookings
- Customer details and guest counts

## Status Colors

- 🟢 **Green** - Available
- 🟡 **Yellow** - Tentative (pending confirmation)
- 🔴 **Red** - Confirmed/Booked
- ⚫ **Gray** - Blocked (due to hierarchical booking rules)

## Implementation Details

### Key Files

- `availability-logic.ts` - Core booking logic and availability checking
- `mock-data.ts` - Hierarchical venue structure and sample bookings
- `types.ts` - TypeScript interfaces for venues, bookings, slots
- `VenueSelectionDialog.tsx` - Guided booking flow component
- `MonthView.tsx`, `DayView.tsx`, `AgendaView.tsx` - Calendar displays

### Key Functions

- `isVenueAvailable()` - Checks if venue can be booked
- `getAvailableVenues()` - Returns list of bookable venues
- `getVenueSlotStatus()` - Gets status with blocking reason
- `getDateSlotSummary()` - Availability summary for a date/slot

## Example Scenarios

### Scenario 1: Full Venue Booking
Date: Dec 15, Dinner, M1 (950 guests)
- M1 marked as Confirmed
- M1-A and M1-B automatically blocked
- UI shows M1, M1-A, M1-B as unavailable

### Scenario 2: Partial Venue Booking
Date: Dec 18, Lunch, M2-A (380 guests)
- M2-A marked as Confirmed
- M2 (full) blocked from booking
- M2-B remains available and bookable

### Scenario 3: Multiple Bookings Same Day
Date: Dec 22, Dinner
- G1-A booked (650 guests)
- G1 (full) blocked
- G1-B still available
- If G1-B is later booked, both sub-venues are occupied but shown separately

## Future Enhancements

- Visual venue map showing layout
- Drag-and-drop booking creation
- Automated tentative booking expiration
- Integration with payment and contract systems
- SMS/Email notifications for booking confirmations
- Conflict detection and warnings