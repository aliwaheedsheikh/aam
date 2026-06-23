import { useState } from 'react';
import { Plus, Building2, UtensilsCrossed, Package, Tent } from 'lucide-react';
import { Button } from '../ui/button';
import { EventAvailabilityCalendar } from './EventAvailabilityCalendar';
import { OutdoorCateringCalendar } from './OutdoorCateringCalendar';
import { FoodSupplyCalendar } from './FoodSupplyCalendar';
import { RentalServicesCalendar } from './RentalServicesCalendar';
import { ServiceTypeSelector } from './ServiceTypeSelector';
import { MixedPackageDialog } from './MixedPackageDialog';
import { Booking } from './types-v2';
import { ServiceBooking, ServiceType } from './service-types';

interface ServiceCalendarContainerProps {
  bookings: Booking[];
  onBookingsChange: (bookings: Booking[]) => void;
  serviceBookings: ServiceBooking[];
  onServiceBookingsChange: (bookings: ServiceBooking[]) => void;
  onNavigateToTentatives: () => void;
  variant?: 'all' | 'outside-services';
}

type CalendarTab = 'venues' | 'outdoor-catering' | 'food-supply' | 'rentals';

export function ServiceCalendarContainer({
  bookings,
  onBookingsChange,
  serviceBookings,
  onServiceBookingsChange,
  onNavigateToTentatives,
  variant = 'all',
}: ServiceCalendarContainerProps) {
  const showVenueTab = variant === 'all';
  const [activeTab, setActiveTab] = useState<CalendarTab>(showVenueTab ? 'venues' : 'outdoor-catering');
  const [showServiceSelector, setShowServiceSelector] = useState(false);
  const [showMixedPackageDialog, setShowMixedPackageDialog] = useState(false);

  console.log('🎯 ServiceCalendarContainer rendered!', { bookings, serviceBookings, activeTab });

  // Count bookings by type
  const venueBookingsCount = bookings.length;
  const outdoorCateringCount = serviceBookings.filter(b => b.serviceType === 'outdoor-catering').length;
  const foodSupplyCount = serviceBookings.filter(b => b.serviceType === 'food-supply').length;
  const rentalCount = serviceBookings.filter(b => b.serviceType === 'rental-services').length;

  const handleNewBooking = (serviceType: ServiceType) => {
    setShowServiceSelector(false);

    if (serviceType === 'mixed-package') {
      setShowMixedPackageDialog(true);
      return;
    }

    if (serviceType === 'venue-booking') {
      if (showVenueTab) {
        setActiveTab('venues');
      }
      return;
    }

    if (serviceType === 'outdoor-catering') {
      setActiveTab('outdoor-catering');
      return;
    }

    if (serviceType === 'food-supply') {
      setActiveTab('food-supply');
      return;
    }

    if (serviceType === 'rental-services') {
      setActiveTab('rentals');
    }
  };

  const handleSaveMixedPackage = (booking: ServiceBooking) => {
    onServiceBookingsChange([...serviceBookings, booking]);
    setShowMixedPackageDialog(false);
  };

  const tabs: Array<{ id: CalendarTab; label: string; icon: any; count: number; color: string }> = [
    ...(showVenueTab
      ? [{
          id: 'venues' as CalendarTab,
          label: 'Venues',
          icon: Building2,
          count: venueBookingsCount,
          color: 'blue',
        }]
      : []),
    {
      id: 'outdoor-catering' as CalendarTab,
      label: 'Outdoor Catering',
      icon: UtensilsCrossed,
      count: outdoorCateringCount,
      color: 'purple',
    },
    {
      id: 'food-supply' as CalendarTab,
      label: 'Food Supply',
      icon: Package,
      count: foodSupplyCount,
      color: 'orange',
    },
    {
      id: 'rentals' as CalendarTab,
      label: 'Rentals',
      icon: Tent,
      count: rentalCount,
      color: 'green',
    },
  ];

  const serviceSelectorTypes = showVenueTab
    ? undefined
    : (['outdoor-catering', 'food-supply', 'rental-services', 'mixed-package'] as ServiceType[]);

  const headerTitle = showVenueTab ? 'Reservations & Services Calendar' : 'Outside Services';
  const headerDescription = showVenueTab
    ? 'Manage all venue bookings and service operations'
    : 'Manage dispatch-based food supply, outdoor catering, and rental service orders';

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Tabs */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 pt-4 pb-0 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{headerTitle}</h1>
            <p className="text-sm text-gray-600 mt-0.5">{headerDescription}</p>
          </div>
          <Button
            onClick={() => setShowServiceSelector(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="size-4 mr-2" />
            New Booking
          </Button>
        </div>

        {/* Tabs */}
        <div className="px-6 mt-4 flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 font-medium text-sm rounded-t-lg transition-all
                  ${isActive 
                    ? `bg-${tab.color}-50 text-${tab.color}-700 border-b-2 border-${tab.color}-600` 
                    : 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
                style={isActive ? {
                  backgroundColor: `var(--color-${tab.color}-50, #eff6ff)`,
                  color: `var(--color-${tab.color}-700, #1d4ed8)`,
                  borderBottomColor: `var(--color-${tab.color}-600, #2563eb)`,
                } : undefined}
              >
                <Icon className="size-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`
                    ml-1 px-2 py-0.5 rounded-full text-xs font-semibold
                    ${isActive 
                      ? `bg-${tab.color}-100 text-${tab.color}-700` 
                      : 'bg-gray-200 text-gray-700'
                    }
                  `}
                  style={isActive ? {
                    backgroundColor: `var(--color-${tab.color}-100, #dbeafe)`,
                    color: `var(--color-${tab.color}-700, #1d4ed8)`,
                  } : undefined}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden">
        {showVenueTab && activeTab === 'venues' && (
          <EventAvailabilityCalendar
            bookings={bookings}
            onBookingsChange={onBookingsChange}
            onCreateTentativeBooking={() => onNavigateToTentatives()}
            onEditTentativeInquiry={() => onNavigateToTentatives()}
            onConvertTentativeInquiry={() => onNavigateToTentatives()}
          />
        )}
        {activeTab === 'outdoor-catering' && (
          <OutdoorCateringCalendar
            bookings={serviceBookings.filter(b => b.serviceType === 'outdoor-catering')}
            onBookingsChange={(updated) => {
              const others = serviceBookings.filter(b => b.serviceType !== 'outdoor-catering');
              onServiceBookingsChange([...others, ...updated]);
            }}
          />
        )}
        {activeTab === 'food-supply' && (
          <FoodSupplyCalendar
            bookings={serviceBookings.filter(b => b.serviceType === 'food-supply')}
            onBookingsChange={(updated) => {
              const others = serviceBookings.filter(b => b.serviceType !== 'food-supply');
              onServiceBookingsChange([...others, ...updated]);
            }}
          />
        )}
        {activeTab === 'rentals' && (
          <RentalServicesCalendar
            bookings={serviceBookings.filter(b => b.serviceType === 'rental-services')}
            onBookingsChange={(updated) => {
              const others = serviceBookings.filter(b => b.serviceType !== 'rental-services');
              onServiceBookingsChange([...others, ...updated]);
            }}
          />
        )}
      </div>

      {/* Service Type Selector Dialog */}
      <ServiceTypeSelector
        open={showServiceSelector}
        onClose={() => setShowServiceSelector(false)}
        onSelect={handleNewBooking}
        allowedServiceTypes={serviceSelectorTypes}
      />

      {/* Mixed Package Dialog */}
      <MixedPackageDialog
        open={showMixedPackageDialog}
        onClose={() => setShowMixedPackageDialog(false)}
        onSave={handleSaveMixedPackage}
      />
    </div>
  );
}
