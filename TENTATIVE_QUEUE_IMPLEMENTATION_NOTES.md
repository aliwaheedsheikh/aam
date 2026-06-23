# Tentative Queue System Implementation

## Overview
The Event Availability Calendar now supports multiple tentative reservations per time slot with a clean queue management interface.

## Key Features Implemented

### 1. **TentativeQueuePanel Component** ✅
Located at: `/src/app/components/calendar/TentativeQueuePanel.tsx`

Features:
- Shows all tentative bookings for a specific time slot
- Priority ordering (numbered 1, 2, 3, etc.)
- Expiry timer (48 hours from creation)
- Risk indicator based on competition level
- Action buttons: Promote, Demote, Confirm, Edit, Delete
- Expandable details on click
- Follow-up status badges

### 2. **Visual Tentative Grouping** (To Be Completed)
The system needs these updates to DayViewV2:

#### Group Tentatives by Time Slot
```typescript
// Helper function to group tentatives overlapping a specific hour
const getTentativesForHour = (hour: number, spaceBookings: Booking[]): Booking[] => {
  return spaceBookings.filter(booking => {
    if (booking.status !== 'tentative') return false;
    
    const startMinutes = timeToMinutes(booking.startTime);
    const endMinutes = getAdjustedEndMinutes(booking);
    const hourStartMinutes = hour * 60;
    const hourEndMinutes = (hour + 1) * 60;
    
    return startMinutes < hourEndMinutes && endMinutes > hourStartMinutes;
  });
};
```

#### Render "T × n" Indicator Instead of Individual Blocks
```typescript
// In renderTimeCells function
const tentativesAtHour = getTentativesForHour(hour, spaceBookings);

if (tentativesAtHour.length > 0) {
  // Don't render individual blocks - show single "T × n" cell
  const isFirstTentativeCell = // Calculate if this is the first hour of overlap
  
  return (
    <div
      key={`${hour}-${hourIndex}`}
      className="w-20 h-12 border-r border-gray-200 relative cursor-pointer bg-yellow-400 text-gray-900 hover:bg-yellow-500 transition-all group"
      onClick={() => {
        setSelectedTentatives(tentativesAtHour);
        setSelectedTentativeSpace({ name: spaceName, venueId, isPrime, spaceId });
        setSelectedTentativeTimeSlot(`${hour}:00`);
        setSelectedTentativeDate(currentDate);
        setTentativeQueueOpen(true);
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-sm font-bold">
          T × {tentativesAtHour.length}
        </div>
      </div>
      
      {/* Hover tooltip */}
      <div className="absolute left-0 top-full mt-1 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-yellow-600 text-white text-xs rounded-lg shadow-xl px-3 py-2 whitespace-nowrap">
          <div className="font-semibold">{tentativesAtHour.length} Tentative Bookings</div>
          <div className="text-yellow-100 mt-0.5">Click to view queue</div>
        </div>
      </div>
    </div>
  );
}
```

### 3. **Risk Indicator Column**
Add at the start of each space row:

```typescript
{/* Risk Indicator */}
<div className="w-12 flex-shrink-0 border-r bg-gray-100 p-2 flex items-center justify-center">
  {totalTentativesForSpace >= 4 ? (
    <AlertTriangle className="size-5 text-red-600" title="High Risk - 4+ tentatives" />
  ) : totalTentativesForSpace >= 2 ? (
    <AlertTriangle className="size-5 text-orange-600" title="Medium Risk - 2-3 tentatives" />
  ) : totalTentativesForSpace > 0 ? (
    <AlertTriangle className="size-5 text-yellow-600" title="Low Risk - 1 tentative" />
  ) : (
    <div className="size-5" />
  )}
</div>
```

### 4. **Queue Panel Handlers**
```typescript
const handleTentativePromote = (bookingId: string) => {
  // Move booking up in priority
  // Update booking order in data
};

const handleTentativeDemote = (bookingId: string) => {
  // Move booking down in priority
};

const handleTentativeConvert = (bookingId: string) => {
  // Convert tentative to confirmed
  // This should open the full booking dialog with pre-filled data
};

const handleTentativeEdit = (booking: Booking) => {
  // Open TentativeReservationDialog in edit mode
  onBookingClick(booking);
  setTentativeQueueOpen(false);
};

const handleTentativeDelete = (bookingId: string) => {
  // Delete the tentative booking
  // Refresh the queue
};
```

## Design Principles

### Confirmed Bookings (Red)
- Fully block the time slot
- Show customer name
- No other bookings can overlap
- Sub-spaces are marked as N/A if prime is booked
- Prime space is marked as N/A if any sub-space is booked

### Tentative Bookings (Yellow)
- **DO NOT** block availability
- Multiple tentatives can exist for same slot
- Grouped as "T × n" indicator
- Shows risk level without preventing new bookings
- Click to open queue panel for management

### Visual Hierarchy
```
🟢 Available (Green) - Open for booking
🟡 Tentative (Yellow) - Shows "T × n" count
🔴 Confirmed (Red) - Fully blocked
⚫ N/A (Gray) - Blocked by parent/child booking
```

## User Workflow

### Creating Tentative
1. Click "+ New Tentative (Quick Form)" button
2. Fill in minimal details
3. System adds to queue automatically

### Managing Queue
1. Click on "T × 4" indicator
2. Queue panel opens showing all 4 tentatives
3. View priority order, expiry times, customer details
4. Actions:
   - **Promote/Demote**: Change priority
   - **Confirm**: Convert to confirmed booking (opens full form)
   - **Edit**: Update tentative details
   - **Delete**: Remove from queue

### Risk Assessment
- **Green/Low**: 0-1 tentatives (safe)
- **Yellow/Medium**: 2-3 tentatives (moderate competition)
- **Orange/High**: 4+ tentatives (high demand, prioritize follow-ups)

## Future Enhancements

1. **Auto-Expiry**: Automatically remove tentatives after 48 hours
2. **Email Notifications**: Send reminders before expiry
3. **SMS Integration**: WhatsApp notifications for priority changes
4. **Analytics**: Track conversion rates from tentative to confirmed
5. **Smart Recommendations**: Suggest alternative dates/times for lower-priority tentatives

## Technical Notes

### State Management
- `tentativeQueueOpen`: boolean - Controls queue panel visibility
- `selectedTentatives`: Booking[] - All tentatives for the clicked slot
- `selectedTentativeSpace`: Object - Space information for display
- `selectedTentativeTimeSlot`: string - Time slot (e.g., "14:00")
- `selectedTentativeDate`: Date - Event date

### Performance Considerations
- Group tentatives by hour to avoid rendering individual blocks
- Use memo/useMemo for expensive calculations
- Limit queue panel to showing relevant tentatives only
- Optimize rendering with virtual scrolling if queue is very long

## Status

- ✅ TentativeQueuePanel component created
- ✅ State management added to DayViewV2
- ⏳ Tentative grouping logic (in progress)
- ⏳ "T × n" rendering (in progress)
- ⏳ Risk indicator column (in progress)
- ⏳ Queue handlers implementation (in progress)

---

**Next Steps**: Complete the rendering logic in DayViewV2 to show grouped tentatives and integrate the queue panel handlers.
