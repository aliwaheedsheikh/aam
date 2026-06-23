// Standardized Time Picker Component - 12-hour format with AM/PM
// Used across entire VenueOps ERP for consistent time selection
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Clock } from 'lucide-react';
import { formatTimePK } from '../../lib/locale';

interface TimePickerProps {
  value: string; // Format: "HH:mm" (24-hour) or "hh:mm AM/PM" (12-hour)
  onChange: (time: string) => void; // Returns "HH:mm" (24-hour format)
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  startHour?: number; // Starting hour (24-hour format, default: 6)
  endHour?: number; // Ending hour (24-hour format, default: 5 next day)
  interval?: number; // Minutes interval (default: 30)
}

export function TimePicker({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'Select time',
  startHour = 6,
  endHour = 5,
  interval = 30,
}: TimePickerProps) {
  // Convert 24-hour to 12-hour display format
  const format24To12 = (time24: string): string => {
    return formatTimePK(time24);
  };

  // Convert 12-hour to 24-hour format
  const format12To24 = (time12: string): string => {
    if (!time12 || !time12.includes(':')) return '';
    
    const parts = time12.split(' ');
    if (parts.length !== 2) return time12; // Already in 24-hour format
    
    const [time, period] = parts;
    const [hours, minutes] = time.split(':').map(Number);
    
    let hour24 = hours;
    if (period === 'AM' && hours === 12) hour24 = 0;
    else if (period === 'PM' && hours !== 12) hour24 = hours + 12;
    
    return `${String(hour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Generate time options from startHour to endHour with specified interval
  const generateTimeOptions = (): { value: string; label: string }[] => {
    const options: { value: string; label: string }[] = [];
    
    // Generate hours array (handles overnight: 6 AM to 5 AM next day)
    const hours: number[] = [];
    if (startHour <= endHour) {
      for (let h = startHour; h <= endHour; h++) {
        hours.push(h);
      }
    } else {
      // Overnight span (e.g., 6 PM to 5 AM)
      for (let h = startHour; h < 24; h++) {
        hours.push(h);
      }
      for (let h = 0; h <= endHour; h++) {
        hours.push(h);
      }
    }

    // Generate time slots with specified interval
    hours.forEach(hour => {
      for (let minute = 0; minute < 60; minute += interval) {
        const time24 = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const time12 = format24To12(time24);
        options.push({ value: time24, label: time12 });
      }
    });

    return options;
  };

  const timeOptions = generateTimeOptions();

  // Normalize incoming value to 24-hour format
  const normalizedValue = value.includes('AM') || value.includes('PM') 
    ? format12To24(value) 
    : value;

  // Get display value (12-hour format)
  const displayValue = normalizedValue ? format24To12(normalizedValue) : '';

  return (
    <Select
      value={normalizedValue}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className={`${className} ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
        <div className="flex items-center gap-2 w-full">
          <Clock className="size-4 text-gray-500 flex-shrink-0" />
          <SelectValue placeholder={placeholder}>
            {displayValue || placeholder}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {timeOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Utility function to format time for display (read-only)
export function formatTimeDisplay(time24: string): string {
  return formatTimePK(time24);
}

// Utility function to format time range for display
export function formatTimeRangeDisplay(startTime24: string, endTime24: string): string {
  return `${formatTimeDisplay(startTime24)} to ${formatTimeDisplay(endTime24)}`;
}

// Utility function to convert 12-hour to 24-hour (for data storage)
export function convert12To24Hour(time12: string): string {
  if (!time12 || !time12.includes(':')) return time12;
  
  const parts = time12.split(' ');
  if (parts.length !== 2) return time12; // Already in 24-hour format
  
  const [time, period] = parts;
  const [hours, minutes] = time.split(':').map(Number);
  
  let hour24 = hours;
  if (period === 'AM' && hours === 12) hour24 = 0;
  else if (period === 'PM' && hours !== 12) hour24 = hours + 12;
  
  return `${String(hour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Utility function to convert 24-hour to 12-hour (for display)
export function convert24To12Hour(time24: string): string {
  return formatTimePK(time24);
}
