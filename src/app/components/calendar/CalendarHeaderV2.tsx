import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, Eye, Filter, MessageCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { venues } from './data-v2';
import { formatDatePK } from '../../lib/locale';

export type StatusFilters = {
  available: boolean;
  tentative: boolean;
  confirmed: boolean;
};

interface CalendarHeaderV2Props {
  currentDate: Date;
  selectedVenueId: string;
  view?: string; // Current active view: 'day-timeline', 'month', or 'agenda'
  statusFilters: StatusFilters;
  onDateChange: (date: Date) => void;
  onVenueChange: (venueId: string) => void;
  onNewBooking: () => void;
  onNewTentative: () => void;
  onStatusFilterChange: (filters: StatusFilters) => void;
  onViewChange?: (view: string) => void;
}

export function CalendarHeaderV2({
  currentDate,
  selectedVenueId,
  view,
  statusFilters,
  onDateChange,
  onVenueChange,
  onNewBooking,
  onNewTentative,
  onStatusFilterChange,
  onViewChange,
}: CalendarHeaderV2Props) {
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

  // Handle month picker change
  const handleMonthPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value; // Format: "YYYY-MM"
    if (value) {
      const [newYear, newMonth] = value.split('-').map(Number);
      const newDate = new Date(newYear, newMonth - 1, 1);
      onDateChange(newDate);
    }
  };

  // Format current date for input value (YYYY-MM)
  const inputValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const selectedVenue = venues.find((v) => v.id === selectedVenueId);

  return (
    <div className="border-b bg-white">
      <div className="p-4 space-y-4">
        {/* Top Row: Title + View Switcher + Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="flex items-center gap-2">
                <CalendarIcon className="size-6" />
                Confirmed Reservations
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Real booking calendar for confirmed events
              </p>
            </div>

            {/* View Switcher */}
            {onViewChange && (
              <>
                {/* Vertical Divider */}
                <div className="w-px h-10 bg-gray-300 mx-2" />
                
                <div className="flex items-center gap-2">
                  <label className="text-xs whitespace-nowrap flex items-center gap-1 text-gray-600">
                    <Eye className="size-3.5" />
                    View:
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onViewChange('day-timeline')}
                      className={`px-3 py-1.5 rounded text-xs transition-all ${
                        view === 'day-timeline'
                          ? 'bg-blue-500 text-white font-medium'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Day
                    </button>
                    <button
                      onClick={() => onViewChange('month')}
                      className={`px-3 py-1.5 rounded text-xs transition-all ${
                        view === 'month'
                          ? 'bg-blue-500 text-white font-medium'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Month
                    </button>
                    <button
                      onClick={() => onViewChange('agenda')}
                      className={`px-3 py-1.5 rounded text-xs transition-all ${
                        view === 'agenda'
                          ? 'bg-blue-500 text-white font-medium'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Agenda
                    </button>
                    <button
                      onClick={() => onViewChange('follow-up')}
                      className={`px-3 py-1.5 rounded text-xs transition-all ${
                        view === 'follow-up'
                          ? 'bg-blue-500 text-white font-medium'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Follow-Up
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={onNewTentative}
              size="lg"
              variant="outline"
              className="border-amber-300 bg-amber-50 text-amber-800 shadow-sm hover:bg-amber-100"
            >
              <MessageCircle className="size-4 mr-2" />
              Add Inquiry
            </Button>
            
            <Button 
              onClick={onNewBooking} 
              size="lg"
              className="shadow-sm"
            >
              <CheckCircle2 className="size-4 mr-2" />
              + Quick Availability Check
            </Button>
          </div>
        </div>

        {/* Second Row: Venue Selector + Date Navigation + Filters */}
        <div className="flex items-center justify-between">
          {/* Venue Selector - PRIMARY CONTROL */}
          <div className="flex items-center gap-2">
            <label className="text-xs whitespace-nowrap text-gray-600 text-[15px]">
              Venue:
            </label>
            <Select value={selectedVenueId} onValueChange={onVenueChange}>
              <SelectTrigger className="w-[280px] h-8 text-sm">
                <SelectValue placeholder="Select a venue" />
              </SelectTrigger>
              <SelectContent>
                {venues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    <div className="flex flex-col">
                      <span>{venue.name}</span>
                      <span className="text-xs text-gray-500">{venue.location}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Vertical Divider */}
            <div className="w-px h-6 bg-gray-300 mx-1" />

            {/* Date Navigation - Day View Only */}
            {view === 'day-timeline' && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-xs whitespace-nowrap text-gray-600">
                    Date:
                  </label>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        const newDate = new Date(currentDate);
                        newDate.setDate(newDate.getDate() - 1);
                        onDateChange(newDate);
                      }}
                      className="h-6 px-2"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-sm text-gray-700 min-w-[160px] text-center">
                      {formatDatePK(currentDate)}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        const newDate = new Date(currentDate);
                        newDate.setDate(newDate.getDate() + 1);
                        onDateChange(newDate);
                      }}
                      className="h-6 px-2"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                  <Input
                    type="date"
                    value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        const newDate = new Date(value);
                        onDateChange(newDate);
                      }
                    }}
                    className="w-[140px] h-6 text-xs"
                  />
                </div>
                
                {/* Vertical Divider */}
                <div className="w-px h-6 bg-gray-300 mx-1" />
              </>
            )}

            {/* Status Toggle Filters */}
            <div className="flex items-center gap-2">
              <label className="text-xs whitespace-nowrap flex items-center gap-1 text-gray-600">
                <Filter className="size-3.5" />
                Filters:
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onStatusFilterChange({ ...statusFilters, available: !statusFilters.available })}
                  className={`px-2 py-1 rounded border text-xs transition-all flex items-center gap-1 ${
                    statusFilters.available
                      ? 'bg-green-50 border-green-500 text-green-700 font-medium'
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                  }`}
                >
                  <div className={`size-2 rounded-full ${statusFilters.available ? 'bg-green-500' : 'bg-gray-400'}`} />
                  Available
                </button>
                
                <button
                  onClick={() => onStatusFilterChange({ ...statusFilters, confirmed: !statusFilters.confirmed })}
                  className={`px-2 py-1 rounded border text-xs transition-all flex items-center gap-1 ${
                    statusFilters.confirmed
                      ? 'bg-red-50 border-red-500 text-red-700 font-medium'
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                  }`}
                >
                  <div className={`size-2 rounded-full ${statusFilters.confirmed ? 'bg-red-500' : 'bg-gray-400'}`} />
                  Confirmed
                </button>
              </div>
            </div>
          </div>

          {/* Date Navigation */}
          {view === 'month' && (
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
              <div className="w-px h-6 bg-gray-300 mx-2" />
              <Input
                type="month"
                value={inputValue}
                onChange={handleMonthPickerChange}
                className="w-[160px]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
