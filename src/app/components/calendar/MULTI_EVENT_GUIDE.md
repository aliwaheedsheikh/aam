# Multi-Event Booking System - Implementation Guide

## Overview
The VenueOps ERP now supports **optional** multi-event bookings for customers who book multiple events. This is essential for scenarios like:
- **Wedding Packages**: Mehndi, Barat, Walima (3 events)
- **Corporate Series**: Multiple training sessions or conferences
- **Recurring Events**: Weekly/monthly bookings
- **Festival Packages**: Multiple celebration events

**Key Design Principle**: The system defaults to single-event mode and only expands when needed, keeping the interface clean for the majority of bookings.

## Interface Modes

### 1. Single Event Mode (Default)
When a booking has only one event, a **compact bar** appears at the top:
- Blue background with minimal footprint
- Shows "Single Event Booking" label
- **"Add Another Event"** button on the right
- Takes minimal screen space (one line)
- No overwhelming multi-event interface

**This is what 95% of bookings will see** - clean and simple!

### 2. Multi-Event Mode (When 2+ Events)
Only when user clicks "Add Another Event" does the full interface appear:
- Expands to show all event cards
- Visual navigation between events
- Financial summaries
- Event management actions

## How It Works

### 1. Multi-Event Manager Component
Located at the top of the Confirmed Reservation Form, this component displays:
- **All events** in the current booking
- **Visual cards** showing each event with key details
- **Current event indicator** (highlighted with purple border and checkmark)
- **Quick actions**: Add, Duplicate, Remove events
- **Financial summary** for each event and grand total across all events

### 2. Event-Specific Data
Each event maintains its own:
- Event Type (Wedding, Mehndi, Walima, Birthday, etc.)
- Date & Time
- Venue & Space selection
- Guest Count (Guaranteed & Expected)
- Menu Package & Items
- Venue Charges
- Food Supplies
- RCS Services
- Miscellaneous Charges
- **Event Total** (auto-calculated)

### 3. Shared Data Across Events
Customer information is shared across all events:
- Customer Name
- Phone Numbers
- Address
- Reference Source
- **Payment Ledger** (consolidated for all events)

### 4. Navigation Flow

#### Adding a New Event:
1. Click **"Add Event"** button in Multi-Event Manager
2. New event card is created with default values
3. System automatically switches to the new event
4. Fill in event-specific details
5. Each event is independent but part of the same booking

#### Switching Between Events:
1. Click on any event card in the Multi-Event Manager
2. Form fields automatically update to show selected event's data
3. Purple border and checkmark indicate current event
4. All sections (Venue, Menu, Services) reflect the selected event

#### Duplicating an Event:
1. Click the **Copy icon** on an event card
2. Creates exact copy of the event (except date is cleared)
3. Useful for similar events (e.g., copying Mehndi to create Walima)
4. Automatically switches to duplicated event for editing

#### Removing an Event:
1. Click the **Trash icon** on an event card
2. Confirmation dialog appears
3. Event is removed from booking
4. **Note**: Cannot remove the last event (minimum 1 event required)

## Use Case Examples

### Example 1: Complete Wedding Package
**Customer**: Ahmad & Fatima  
**Events**: 3 (Mehndi, Barat, Walima)

1. **Initial Booking (Mehndi)**:
   - Event Type: Mehndi
   - Date: Feb 10, 2026
   - Venue: Garden Hall
   - Guests: 300
   - Menu: Budget Package

2. **Add Barat** (Click "Add Event"):
   - Event Type: Barat  
   - Date: Feb 12, 2026
   - Venue: Grand Ballroom
   - Guests: 500
   - Menu: Premium Wedding Package

3. **Add Walima** (Duplicate Barat):
   - Event Type: Walima
   - Date: Feb 13, 2026
   - Venue: Grand Ballroom  
   - Guests: 400
   - Menu: Standard Wedding Package (edited from duplicated)

**Result**:
- **Grand Total**: Sum of all 3 events
- **Payment Ledger**: One consolidated ledger tracking all payments
- **Total Guests**: 1,200 across all events
- **Average per Event**: Calculated automatically

### Example 2: Corporate Training Series
**Customer**: XYZ Corporation  
**Events**: 4 (Weekly training sessions)

1. Add 4 events with same venue but different dates
2. Same menu package for all (use duplicate feature)
3. Different guest counts per session
4. Single payment tracking across all sessions

## Financial Management

### Event-Level Totals:
Each event shows breakdown:
- Menu Charges
- Venue Charges
- Services (Food Supplies + RCS + Misc)
- **Event Total**

### Multi-Event Summary:
When multiple events exist:
- Total number of events
- Combined guest count
- Average cost per event
- **Grand Total** (all events combined)

### Payment Handling:
- **Single Payment Ledger** for entire booking
- Payments apply to total booking amount
- Balance calculated across all events
- Individual event costs visible for reference

## Technical Implementation

### Data Structure:
```typescript
interface EventDetails {
  id: string;                    // Unique identifier
  eventType: string;             // Wedding, Mehndi, etc.
  eventDate: string;             // YYYY-MM-DD
  startTime: string;             // HH:MM
  endTime: string;               // HH:MM
  venueId: string;               // Selected venue
  venueName: string;             
  primeSpaceId: string;          // Main hall/space
  primeSpaceName: string;
  subSpaceId?: string;           // Optional partition
  subSpaceName?: string;
  guaranteedGuests: number;      // For calculations
  expectedGuests: number;        // Estimate only
  menuTotal: number;             // Auto-calculated
  venueCharges: number;
  foodSuppliesTotal: number;
  rcsTotal: number;
  miscTotal: number;
  eventTotal: number;            // Sum of all charges
}
```

### State Management:
- `events`: Array of EventDetails
- `currentEventId`: Currently selected event
- `updateCurrentEvent()`: Update active event data
- `handleAddEvent()`: Create new event
- `handleRemoveEvent()`: Delete event
- `handleDuplicateEvent()`: Clone event

## Best Practices

### For Front Office Staff:

1. **Always start with the first event** (e.g., Mehndi) and add subsequent events
2. **Use duplicate feature** for similar events to save time
3. **Verify each event** individually by clicking through event cards
4. **Check grand total** before finalizing booking
5. **Record advance payment** in consolidated payment ledger

### For Customers:

1. **Discuss all events** during initial booking call
2. **Confirm dates** for all events upfront
3. **Understand that payment** covers all events collectively
4. **Advance payment** secures all event dates
5. **Balance can be paid** in installments or per event

## Benefits

1. **Single Customer Record**: All events linked to one booking
2. **Consolidated Billing**: One invoice, one payment tracking
3. **Package Discounts**: Easier to offer multi-event discounts
4. **Complete History**: All customer events in one place
5. **Efficient Processing**: No need for separate bookings
6. **Better Follow-up**: Track entire package together

## Future Enhancements (Planned)

- [ ] Event dependencies (e.g., Barat requires Mehndi)
- [ ] Bulk operations (apply settings to all events)
- [ ] Event-specific payment tracking (optional)
- [ ] Package templates (pre-defined multi-event packages)
- [ ] Calendar view showing all events for a booking
- [ ] Event status tracking (confirmed, tentative, completed)

## Support

For questions or issues with multi-event bookings, contact:
- System Administrator
- Training Documentation
- User Manual Section 4.2: "Multi-Event Bookings"