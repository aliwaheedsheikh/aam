# Banquet ERP - Event Availability Calendar System V2

## 🎯 System Overview

This is a **professional Event Availability Calendar** designed for Banquet/Marquee ERP systems. The calendar prevents double booking and dynamically shows/hides spaces based on hierarchical booking logic.

### Core Question Answered:
> **"For this venue, on this date, which exact space is available at this exact time?"**
> 
> Answer time: **2-3 seconds** ⚡

---

## 📋 System Architecture

### Hierarchy Structure

```
Venue (e.g., Aiwan-e-Akbari)
  └─ Prime Space (e.g., Marquee 1)
      ├─ Sub Space A
      └─ Sub Space B
```

### Implemented Venues

#### 1. **Aiwan-e-Akbari** (Main Boulevard, Gulberg)
- **Marquee 1** (1000 capacity)
  - Sub Space A (500)
  - Sub Space B (500)
- **Marquee 2** (800 capacity)
  - Sub Space A (400)
  - Sub Space B (400)
- **Marquee 3** (600 capacity)
  - Sub Space A (300)
  - Sub Space B (300)
- **Lawn 1** (1200 capacity)
  - Sub Space A (600)
  - Sub Space B (600)
- **Lawn 2** (900 capacity)
  - Sub Space A (450)
  - Sub Space B (450)
- **Lawn 3** (700 capacity)
  - Sub Space A (350)
  - Sub Space B (350)

#### 2. **Taj Mahal Banquet Hall** (Ferozepur Road)
- **Hall 1** (1500 capacity)
  - Sub Hall A (900)
  - Sub Hall B (600)
- **Hall 2** (1200 capacity)
  - Sub Hall A (600)
  - Sub Hall B (600)

---

## 🔐 Critical Booking Rules

### Rule 1: Prime Space Fully Booked
When a **Prime Space is booked as a whole**:
- ❌ **HIDE** all Sub Spaces (they don't appear in timeline)
- Prime Space shows 🔴 Booked for the time range

**Example:**
```
Marquee 1 booked 12:00 - 16:00 (Full)
Result:
  ✅ Marquee 1 shows red booking bar
  ❌ Sub Space A - HIDDEN
  ❌ Sub Space B - HIDDEN
```

### Rule 2: Sub Space Booked
When **one Sub Space is booked**:
- ❌ Prime Space **CANNOT be booked** (hidden from booking options)
- ✅ Only remaining Sub Spaces remain visible and bookable

**Example:**
```
Marquee 2 - Sub Space A booked 18:00 - 22:00
Result:
  ❌ Marquee 2 (Full) - HIDDEN (cannot book entire space)
  🔴 Sub Space A - Shows red booking bar
  ✅ Sub Space B - Visible and available
```

### Rule 3: Prevent Double Booking
- A Prime Space and its Sub Spaces **CANNOT overlap in time**
- Timeline visualization prevents conflicts
- Real-time availability checking

---

## 🎨 Calendar Views

### 1️⃣ Day View (Timeline) - **PRIMARY VIEW**

**Most Important View** - Default on load

```
Time →    08  09  10  11  12  13  14  15  16  17  18  19  20  21  22  23
---------------------------------------------------------------------------
Marquee 1 │   │   │   │   │████ Ahmed Khan (950 pax) ████│   │   │   │
Marquee 2 [Hidden - Sub Space A is booked]
  └─ Sub Space A │   │   │   │   │   │   │   │   │████ Sara (380) ████│
  └─ Sub Space B │   │   │   │   │   │   │   │   │   │   │   │   │   │
Marquee 3 │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │
  └─ Sub Space A │   │   │   │   │   │   │   │   │   │   │   │   │   │
  └─ Sub Space B │   │   │   │   │████ Tentative Hassan ████│   │   │
```

**Features:**
- 24-hour timeline (00:00 - 23:00)
- Expand/collapse Prime Spaces to show Sub Spaces
- Booking blocks span across actual time ranges
- Color coding: 🔴 Red (Confirmed), 🟡 Yellow (Tentative), 🟢 Green (Available)
- Click booking → View details
- Click empty cell → Create new booking
- Hover → Show "+" icon on available slots

**Hide/Show Logic:**
- If Prime Space has ANY Sub Space booking → Prime Space row is HIDDEN
- If Prime Space is fully booked → All Sub Space rows are HIDDEN
- Expand button shows/hides Sub Space rows when both are visible

### 2️⃣ Month View

High-level monthly overview:
- Shows booking density per day
- Confirmed count (🔴)
- Tentative count (🟡)
- Click any date → Jump to Day Timeline view for that date
- **Venue-specific** - Only shows bookings for selected venue

### 3️⃣ Agenda View

List view with advanced filtering:
- Date range filter (From/To)
- Status filter (All, Confirmed, Tentative)
- Shows: Date, Space, Type, Time, Customer, Guests, Status, Contact
- Export to CSV functionality
- Click row → View booking details

---

## 🕐 Time-Based Booking

**NOT fixed slots** - Custom time ranges supported:

### Common Booking Types:
- **Lunch:** 12:00 PM - 04:00 PM
- **Dinner:** 06:00 PM - 10:00 PM  
- **Full Day:** 09:00 AM - 09:00 PM
- **Custom:** Any start/end time

### Timeline Features:
- Booking blocks **span across timeline** visually
- Continuous bars from start time to end time
- Partial overlap detection
- Automatic conflict prevention

**Example Timeline Visualization:**
```
12:00                  16:00         18:00         22:00
  │─────────────────────│             │─────────────│
  └─ Lunch Booking                    └─ Dinner Booking
```

---

## 🎯 User Interaction Flow

### Step 1: Select Venue (PRIMARY CONTROL)
Located at top of screen - dropdown selector:
- Aiwan-e-Akbari
- Taj Mahal Banquet Hall

**Calendar displays ONLY the selected venue's spaces**

### Step 2: Navigate Date
- Month navigation (◀ Today ▶)
- Or use Month View to select date

### Step 3: View Availability
Day Timeline shows:
- All Prime Spaces for selected venue
- Sub Spaces (if available/not hidden)
- Existing bookings as colored bars
- Available time slots

### Step 4: Interact
- **Click Available Block** → "Create Reservation" 
- **Click Booked Block** → "View Event Summary"
- **Hover** → Tooltip with space, time, status info

---

## 🎨 Visual Status Coding

| Status | Color | Meaning |
|--------|-------|---------|
| 🟢 Available | Green | Space is free |
| 🟡 Tentative | Yellow | Pending confirmation |
| 🔴 Confirmed | Red | Booked/Reserved |

Legend always visible in header.

---

## 📊 Data Model

### Venue
```typescript
{
  id: string
  name: string
  location: string
}
```

### Prime Space
```typescript
{
  id: string
  name: string
  venueId: string
  capacity: number
  subSpaces: SubSpace[]
}
```

### Sub Space
```typescript
{
  id: string
  name: string
  capacity: number
  primeSpaceId: string
}
```

### Booking
```typescript
{
  id: string
  venueId: string
  primeSpaceId?: string     // Set if booking entire prime space
  subSpaceId?: string       // Set if booking only sub space
  date: Date
  startTime: string         // "HH:MM" format
  endTime: string           // "HH:MM" format
  status: 'available' | 'tentative' | 'confirmed'
  customerName: string
  guestCount: number
  contactNumber?: string
  callbackDate?: Date
  notes?: string
}
```

---

## 🔍 Example Scenarios

### Scenario 1: Full Day Wedding
```
Booking: Lawn 1 (Full) - 09:00 to 21:00
Status: Confirmed
Customer: Fatima Sheikh (1150 guests)

Timeline Display:
  Lawn 1: [████████████████████████] 09:00-21:00
  Lawn 1 - Sub Space A: HIDDEN
  Lawn 1 - Sub Space B: HIDDEN
```

### Scenario 2: Dual Events Same Day
```
Booking 1: Marquee 2 - Sub Space A - 12:00 to 16:00 (Lunch)
Booking 2: Marquee 2 - Sub Space B - 19:00 to 23:00 (Dinner)

Timeline Display:
  Marquee 2 (Full): HIDDEN (cannot book)
  Marquee 2 - Sub Space A: [████████] 12:00-16:00
  Marquee 2 - Sub Space B: [████████] 19:00-23:00
```

### Scenario 3: Tentative Blocking
```
Booking: Marquee 1 (Full) - 10:00 to 22:00
Status: Tentative (Callback: Jan 25)

Timeline Display:
  Marquee 1: [🟡🟡🟡🟡🟡🟡🟡🟡] 10:00-22:00 (Yellow)
  Sub Spaces: HIDDEN while tentative exists
```

---

## 🎨 Design Principles

### Enterprise ERP Aesthetic
- Clean, structured, grid-based layout
- No unnecessary decoration
- Professional color palette
- Clear typography
- Designed for front-office staff handling live customer calls

### Performance Goals
- Answer availability question in **2-3 seconds**
- No confusion or ambiguity
- Clear visual hierarchy
- Instant feedback on interactions

### Responsive Behavior
- Optimized for desktop (primary use case)
- Horizontal scroll for timeline (24-hour wide view)
- Fixed headers for easy navigation
- Sticky venue selector

---

## 🔧 Key Implementation Files

| File | Purpose |
|------|---------|
| `types-v2.ts` | TypeScript interfaces and types |
| `data-v2.ts` | Mock venues, spaces, and bookings |
| `availability-v2.ts` | Booking logic and hide/show rules |
| `DayViewV2.tsx` | Primary timeline view component |
| `MonthViewV2.tsx` | Monthly calendar overview |
| `AgendaViewV2.tsx` | List view with filters |
| `CalendarHeaderV2.tsx` | Venue selector and navigation |
| `BookingDetailsDialogV2.tsx` | Booking detail modal |

---

## ✅ Implementation Checklist

- [x] Venue → Prime Space → Sub Space hierarchy
- [x] Custom time range bookings (not just fixed slots)
- [x] Hide Prime Space when Sub Space is booked
- [x] Hide Sub Spaces when Prime Space is booked
- [x] 24-hour timeline visualization
- [x] Booking blocks span across time
- [x] Expand/collapse Prime Spaces
- [x] Color-coded status (Available, Tentative, Confirmed)
- [x] Venue selector as primary control
- [x] Month view with density indicators
- [x] Agenda view with filtering
- [x] Booking details dialog
- [x] Double booking prevention
- [x] 2-3 second answer time goal

---

## 🚀 Next Steps

### Future Enhancements
1. **New Booking Creation Dialog**
   - Time picker with 30-min intervals
   - Prime Space vs Sub Space selector
   - Guest count with capacity validation
   - Customer information form

2. **Conflict Detection UI**
   - Visual warning for overlapping times
   - Suggestion of alternative spaces
   - Automatic capacity matching

3. **Booking Management**
   - Edit booking (with conflict check)
   - Cancel booking
   - Convert tentative → confirmed
   - Automated callback reminders

4. **Advanced Features**
   - Drag-and-drop to reschedule
   - Multi-day event support
   - Recurring bookings
   - Print/export day schedule
   - SMS/Email notifications

---

## 📝 Notes

This calendar is the **core engine** of the ERP system. All other modules (reservation management, menu planning, finance, catering) depend on this availability data.

**Accuracy is critical.** Double bookings would cause operational disasters and customer dissatisfaction.

The system prioritizes **clarity and speed** over visual complexity.
