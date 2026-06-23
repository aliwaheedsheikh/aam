import { ChevronLeft, ChevronRight, Building2, Split } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { getAllVenues } from './mock-data';
import { getStatusColor } from './status-colors';
import { VenueType } from './types';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';

interface CalendarHeaderProps {
  currentDate: Date;
  selectedVenue: string;
  venueTypeFilter: VenueType;
  onDateChange: (date: Date) => void;
  onVenueChange: (venueId: string) => void;
  onVenueTypeChange: (type: VenueType) => void;
  onNewBooking: () => void;
}

export function CalendarHeader({
  currentDate,
  selectedVenue,
  venueTypeFilter,
  onDateChange,
  onVenueChange,
  onVenueTypeChange,
  onNewBooking,
}: CalendarHeaderProps) {
  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onDateChange(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const allVenues = getAllVenues();

  return (
    <div className="border-b bg-white">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <h1 className="mr-4">
            Confirmed Reservations
          </h1>
          
          <Select value={selectedVenue} onValueChange={onVenueChange}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select venue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Venues</SelectItem>
              {allVenues.map((venue) => (
                <SelectItem key={venue.id} value={venue.id}>
                  <div className="flex items-center gap-2">
                    {venue.isSubVenue ? (
                      <Split className="size-3" />
                    ) : (
                      <Building2 className="size-3" />
                    )}
                    {venue.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="border-l pl-4 ml-2">
            <RadioGroup 
              value={venueTypeFilter} 
              onValueChange={(v) => onVenueTypeChange(v as VenueType)}
              className="flex items-center gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="full-venue" />
                <Label htmlFor="full-venue" className="cursor-pointer">Full Venues</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id="partial-venue" />
                <Label htmlFor="partial-venue" className="cursor-pointer">Partial Venues</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-gray-50">
            <div className="flex items-center gap-1">
              <div className={`size-3 rounded-full ${getStatusColor('available').dot}`} />
              <span className="text-sm">Available</span>
            </div>
            <div className="w-px h-4 bg-gray-300 mx-2" />
            <div className="flex items-center gap-1">
              <div className={`size-3 rounded-full ${getStatusColor('tentative').dot}`} />
              <span className="text-sm">Tentative</span>
            </div>
            <div className="w-px h-4 bg-gray-300 mx-2" />
            <div className="flex items-center gap-1">
              <div className={`size-3 rounded-full ${getStatusColor('confirmed').dot}`} />
              <span className="text-sm">Booked</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevious}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext}>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <Button onClick={onNewBooking}>
            New Booking
          </Button>
        </div>
      </div>
    </div>
  );
}
