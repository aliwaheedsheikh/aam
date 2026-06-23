# Master Data Integration Guide
## VenueOps ERP - Reservations & Master Setup Integration

## Overview

The VenueOps ERP now has **centralized Master Data Management** that ensures consistency between the Master Setup module and Reservations module. All venue data, event configurations, financial rules, and other master data are stored in a single source of truth and automatically synced across the system.

## Architecture

### 1. **Master Data Store** (`/src/app/lib/masterDataStore.ts`)
- Uses localStorage for persistent data storage
- Automatically triggers update events when data changes
- Provides getter and setter functions for all master data types

### 2. **Master Data Context** (`/src/app/contexts/MasterDataContext.tsx`)
- React Context Provider that wraps the entire application
- Loads data from localStorage on mount
- Provides helper functions to access and filter data
- Automatically re-renders components when master data updates

### 3. **Master Setup Modules**
All Master Setup modules now save data to the centralized store:
- **Venue Master Setup** → Venue data
- **Prime Space Setup** → Prime space data
- **Sub Space Setup** → Sub space data
- **Event Configuration** → Event types, time slots, services, packages
- **Advance Rules Setup** → Financial advance payment rules
- **Tax Configuration** → Tax groups and rules

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Master Setup Module                          │
│  (User creates/edits venues, event types, services, etc.)       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Saves to
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   masterDataStore.ts                             │
│  (localStorage + triggers 'masterDataUpdated' event)             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Loads from
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  MasterDataContext                               │
│  (React Context - provides data to all components)               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Consumes via useMasterData()
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Reservation/Booking Components                      │
│  (Auto-populate dropdowns, calculate prices, apply rules)       │
└─────────────────────────────────────────────────────────────────┘
```

## How to Use in Booking/Reservation Components

### Step 1: Import the Hook

```typescript
import { useMasterData } from '../../contexts/MasterDataContext';
```

### Step 2: Access Master Data

```typescript
function MyBookingForm() {
  const {
    // Raw data arrays
    venues,
    primeSpaces,
    subSpaces,
    eventTypes,
    timeSlots,
    services,
    packages,
    advanceRules,
    taxGroups,
    
    // Helper functions
    getVenueById,
    getPrimeSpaceById,
    getSubSpaceById,
    getPrimeSpacesByVenue,
    getSubSpacesByPrimeSpace,
    getActiveEventTypes,
    getActiveTimeSlots,
    getActiveServices,
    getActivePackages,
    getApplicableAdvanceRule,
    getActiveTaxGroups,
    refreshData,
  } = useMasterData();
  
  // Your component logic here...
}
```

### Step 3: Use in Dropdowns/Selects

```typescript
// Venue dropdown
<Select value={venueId} onValueChange={setVenueId}>
  <SelectTrigger>
    <SelectValue placeholder="Select venue" />
  </SelectTrigger>
  <SelectContent>
    {venues.filter(v => v.isActive).map(venue => (
      <SelectItem key={venue.id} value={venue.id}>
        {venue.venueName} - {venue.location}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

// Prime Space dropdown (filtered by venue)
<Select value={primeSpaceId} onValueChange={setPrimeSpaceId}>
  <SelectTrigger>
    <SelectValue placeholder="Select prime space" />
  </SelectTrigger>
  <SelectContent>
    {getPrimeSpacesByVenue(venueId).map(space => (
      <SelectItem key={space.id} value={space.id}>
        {space.spaceName} - {space.capacity} guests
      </SelectItem>
    ))}
  </SelectContent>
</Select>

// Event Type dropdown
<Select value={eventTypeId} onValueChange={setEventTypeId}>
  <SelectTrigger>
    <SelectValue placeholder="Select event type" />
  </SelectTrigger>
  <SelectContent>
    {getActiveEventTypes().map(eventType => (
      <SelectItem key={eventType.id} value={eventType.id}>
        {eventType.displayName}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Step 4: Calculate Financial Values

```typescript
// Get applicable advance rule based on hierarchy
const advanceRule = getApplicableAdvanceRule(
  venueId,           // Venue level
  primeSpaceId,      // Prime space level
  subSpaceId,        // Sub space level (optional)
  eventTypeId        // Event type level
);

// Calculate advance amount
const calculateAdvance = (totalAmount: number) => {
  if (!advanceRule) return 0;
  
  if (advanceRule.advanceType === 'percentage') {
    return (totalAmount * advanceRule.value) / 100;
  }
  return advanceRule.value; // Fixed amount
};

// Calculate package cost
const selectedPackage = packages.find(p => p.id === packageId);
const packageCost = selectedPackage 
  ? selectedPackage.pricePerPerson * guestCount 
  : 0;

// Calculate services cost
const servicesCost = selectedServiceIds.reduce((total, serviceId) => {
  const service = services.find(s => s.id === serviceId);
  return total + (service?.basePrice || 0);
}, 0);

const totalAmount = packageCost + servicesCost;
const advanceRequired = calculateAdvance(totalAmount);
const balance = totalAmount - advanceRequired;
```

## Master Data Types

### Venue
```typescript
interface Venue {
  id: string;
  venueName: string;
  location: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  isActive: boolean;
  capacity: number;
  operatingHours: { open: string; close: string };
  createdAt: Date;
}
```

### Prime Space
```typescript
interface PrimeSpace {
  id: string;
  venueId: string;
  spaceName: string;
  spaceType: 'indoor' | 'outdoor' | 'hybrid';
  capacity: number;
  area: number;
  isActive: boolean;
  defaultAdvanceRuleId?: string;
  createdAt: Date;
}
```

### Sub Space
```typescript
interface SubSpace {
  id: string;
  primeSpaceId: string;
  venueId: string;
  spaceName: string;
  capacity: number;
  area: number;
  isActive: boolean;
  canOperateIndependently: boolean;
  createdAt: Date;
}
```

### Event Type
```typescript
interface EventType {
  id: string;
  name: string;
  displayName: string;
  category: 'wedding' | 'corporate' | 'social' | 'other';
  requiresCouple: boolean;
  defaultDuration: number;
  color: string;
  isActive: boolean;
}
```

### Time Slot
```typescript
interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  slotType: 'morning' | 'afternoon' | 'evening' | 'night';
  isActive: boolean;
}
```

### Service
```typescript
interface Service {
  id: string;
  name: string;
  category: 'decoration' | 'entertainment' | 'catering' | 'other';
  basePrice: number;
  isActive: boolean;
}
```

### Menu Package
```typescript
interface MenuPackage {
  id: string;
  name: string;
  pricePerPerson: number;
  description: string;
  isActive: boolean;
}
```

### Advance Rule
```typescript
interface AdvanceRule {
  id: string;
  ruleName: string;
  applicationType: 'venue' | 'prime-space' | 'sub-space' | 'event-type' | 'global';
  appliedTo?: string; // ID of venue/space/event
  advanceType: 'percentage' | 'fixed';
  value: number;
  isActive: boolean;
  priority: number;
  createdAt: Date;
}
```

## Advance Rule Priority

The system automatically selects the most specific applicable rule:

1. **Sub-Space specific** (highest priority)
2. **Prime Space specific**
3. **Venue specific**
4. **Event Type specific**
5. **Global rule** (lowest priority - fallback)

Example:
```typescript
// This will check in order and return the first match:
const rule = getApplicableAdvanceRule('venue-1', 'prime-2', 'sub-3', 'event-5');

// Priority: sub-3 > prime-2 > venue-1 > event-5 > global
```

## Real-Time Sync

When Master Setup data is updated:
1. Data is saved to localStorage via `masterDataStore`
2. A `masterDataUpdated` custom event is triggered
3. `MasterDataContext` listens for this event
4. All components using `useMasterData()` automatically re-render with fresh data

No page refresh required! ✨

## Example Component

See `/src/app/components/calendar/BookingFormWithMasterData.tsx` for a complete working example that demonstrates:
- Venue hierarchy selection (Venue → Prime Space → Sub Space)
- Event type and time slot selection from Master Data
- Package and services selection
- Automatic financial calculation using advance rules
- Real-time data synchronization

## Migration Checklist for Existing Booking Components

To update existing booking/reservation components:

- [ ] Remove hardcoded venue/event data arrays
- [ ] Add `import { useMasterData } from '../../contexts/MasterDataContext'`
- [ ] Replace static data with context data (e.g., `venues` from context instead of imported array)
- [ ] Update dropdowns to use filtered data from helper functions
- [ ] Implement advance rule calculation using `getApplicableAdvanceRule()`
- [ ] Update financial calculations to use package and service pricing from Master Data
- [ ] Remove any duplicate data management code

## Benefits

✅ **Single Source of Truth** - All master data in one place  
✅ **Consistent Data** - No discrepancies between modules  
✅ **Easy Maintenance** - Update once, reflects everywhere  
✅ **Type Safety** - Full TypeScript support  
✅ **Real-Time Updates** - No page refresh needed  
✅ **Hierarchical Rules** - Smart rule application based on priority  
✅ **Persistent Storage** - Data survives page reloads  
✅ **Professional UX** - Smooth, seamless user experience  

## Next Steps

1. Update `NewReservationDialog.tsx` to use `useMasterData()`
2. Update `TentativeReservationDialog.tsx` to use Master Data
3. Update `BookingDetailsDialogV2.tsx` to display Master Data
4. Update Calendar views to use venue/space data from context
5. Remove old hardcoded data files (`data-v2.ts`, etc.)

## Support

For questions or issues with Master Data integration, refer to:
- `/src/app/contexts/MasterDataContext.tsx` - Context implementation
- `/src/app/lib/masterDataStore.ts` - Storage layer
- `/src/app/components/calendar/BookingFormWithMasterData.tsx` - Example usage
