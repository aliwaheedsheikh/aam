import { useState } from 'react';
import { Plus, Trash2, Calendar, MapPin, Users, Clock, DollarSign, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { venues, primeSpaces } from './data-v2';
import { formatCurrencyPKR, formatDatePK, formatNumberPK } from '../../lib/locale';

export interface EventDay {
  id: string;
  dayNumber: number;
  date: string;
  venueId: string;
  venueName: string;
  primeSpaceId: string;
  primeSpaceName: string;
  subSpaceId?: string;
  subSpaceName?: string;
  guaranteedGuests: number;
  menuPackage: string;
  menuRate: number;
  startTime: string;
  endTime: string;
  venueCharges: number;
  serviceCharges: number;
  dayTotal: number;
  notes: string;
}

interface MultiDayReservationProps {
  eventDays: EventDay[];
  onEventDaysChange: (days: EventDay[]) => void;
  onAddDay: () => void;
  onRemoveDay: (dayId: string) => void;
  onDuplicateDay: (dayId: string) => void;
  masterEventTitle: string;
  onMasterEventTitleChange: (value: string) => void;
}

export function MultiDayReservation({
  eventDays,
  onEventDaysChange,
  onAddDay,
  onRemoveDay,
  onDuplicateDay,
  masterEventTitle,
  onMasterEventTitleChange,
}: MultiDayReservationProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(eventDays.map(d => d.id)));

  const toggleDayExpansion = (dayId: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dayId)) {
      newExpanded.delete(dayId);
    } else {
      newExpanded.add(dayId);
    }
    setExpandedDays(newExpanded);
  };

  const updateDay = (dayId: string, updates: Partial<EventDay>) => {
    onEventDaysChange(
      eventDays.map(day => 
        day.id === dayId 
          ? { 
              ...day, 
              ...updates,
              dayTotal: calculateDayTotal({ ...day, ...updates })
            }
          : day
      )
    );
  };

  const calculateDayTotal = (day: EventDay) => {
    const menuTotal = day.guaranteedGuests * day.menuRate;
    return menuTotal + day.venueCharges + day.serviceCharges;
  };

  const grandTotal = eventDays.reduce((sum, day) => sum + day.dayTotal, 0);
  const totalGuests = eventDays.reduce((sum, day) => sum + day.guaranteedGuests, 0);

  return (
    <div className="space-y-4">
      {/* Master Event Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-4 shadow-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-90">Event Title / Description</label>
            <Input
              value={masterEventTitle}
              onChange={(e) => onMasterEventTitleChange(e.target.value)}
              placeholder="e.g., Annual Conference 2026, Tech Summit"
              className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
            />
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs opacity-90">Total Event Duration</div>
              <div className="text-2xl font-bold">{eventDays.length} Days</div>
            </div>
            <Button
              onClick={onAddDay}
              size="sm"
              className="bg-white text-indigo-600 hover:bg-white/90"
            >
              <Plus className="size-4 mr-1" />
              Add Day
            </Button>
          </div>
        </div>
      </div>

      {/* Event Days Cards */}
      <div className="space-y-3">
        {eventDays.map((day, index) => {
          const isExpanded = expandedDays.has(day.id);
          const selectedVenue = venues.find(v => v.id === day.venueId);
          const selectedPrimeSpace = primeSpaces.find(ps => ps.id === day.primeSpaceId);
          const selectedSubSpace = selectedPrimeSpace?.subSpaces?.find(ss => ss.id === day.subSpaceId);

          return (
            <div
              key={day.id}
              className="border-2 border-indigo-300 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Day Header (Always Visible) */}
              <div className="bg-indigo-50 border-b border-indigo-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold text-sm">
                      Day {day.dayNumber}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm flex-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-4 text-indigo-600" />
                        <span className="font-semibold text-gray-900">
                          {day.date ? formatDatePK(day.date) : '—'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-4 text-indigo-600" />
                        <span className="text-gray-700">{day.venueName || 'â€”'}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Users className="size-4 text-indigo-600" />
                        <span className="text-gray-700">{day.guaranteedGuests} guests</span>
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto">
                        <DollarSign className="size-4 text-green-600" />
                        <span className="font-bold text-green-700">{formatCurrencyPKR(day.dayTotal)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => onDuplicateDay(day.id)}
                      className="p-1.5 hover:bg-indigo-100 rounded transition-colors text-indigo-600"
                      title="Duplicate Day"
                    >
                      <Copy className="size-4" />
                    </button>
                    {eventDays.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove Day ${day.dayNumber}?`)) {
                            onRemoveDay(day.id);
                          }
                        }}
                        className="p-1.5 hover:bg-red-100 rounded transition-colors text-red-600"
                        title="Remove Day"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                    <button
                      onClick={() => toggleDayExpansion(day.id)}
                      className="p-1.5 hover:bg-indigo-100 rounded transition-colors text-indigo-600"
                    >
                      {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Day Details (Collapsible) */}
              {isExpanded && (
                <div className="p-4">
                  <div className="grid grid-cols-4 gap-3">
                    {/* Date */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Date *</label>
                      <Input
                        type="date"
                        value={day.date}
                        onChange={(e) => updateDay(day.id, { date: e.target.value })}
                        className="text-sm"
                      />
                    </div>

                    {/* Start Time */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Start Time</label>
                      <Input
                        type="time"
                        value={day.startTime}
                        onChange={(e) => updateDay(day.id, { startTime: e.target.value })}
                        className="text-sm"
                      />
                    </div>

                    {/* End Time */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">End Time</label>
                      <Input
                        type="time"
                        value={day.endTime}
                        onChange={(e) => updateDay(day.id, { endTime: e.target.value })}
                        className="text-sm"
                      />
                    </div>

                    {/* Guaranteed Guests */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Guaranteed Guests *</label>
                      <Input
                        type="number"
                        value={day.guaranteedGuests}
                        onChange={(e) => updateDay(day.id, { guaranteedGuests: parseInt(e.target.value) || 0 })}
                        className="text-sm"
                      />
                    </div>

                    {/* Venue Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Venue *</label>
                      <select
                        value={day.venueId}
                        onChange={(e) => {
                          const venue = venues.find(v => v.id === e.target.value);
                          updateDay(day.id, { 
                            venueId: e.target.value,
                            venueName: venue?.name || '',
                            primeSpaceId: '',
                            primeSpaceName: '',
                            subSpaceId: '',
                            subSpaceName: ''
                          });
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Venue</option>
                        {venues.map(venue => (
                          <option key={venue.id} value={venue.id}>{venue.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Prime Space */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Hall/Space</label>
                      <select
                        value={day.primeSpaceId}
                        onChange={(e) => {
                          const space = primeSpaces.find(ps => ps.id === e.target.value);
                          updateDay(day.id, { 
                            primeSpaceId: e.target.value,
                            primeSpaceName: space?.name || '',
                            subSpaceId: '',
                            subSpaceName: ''
                          });
                        }}
                        disabled={!day.venueId}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                      >
                        <option value="">Select Space</option>
                        {primeSpaces
                          .filter(ps => ps.venueId === day.venueId)
                          .map(space => (
                            <option key={space.id} value={space.id}>{space.name}</option>
                          ))}
                      </select>
                    </div>

                    {/* Menu Package */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Menu Package</label>
                      <Input
                        type="text"
                        value={day.menuPackage}
                        onChange={(e) => updateDay(day.id, { menuPackage: e.target.value })}
                        placeholder="e.g., Standard"
                        className="text-sm"
                      />
                    </div>

                    {/* Menu Rate */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Per Head Rate</label>
                      <Input
                        type="number"
                        value={day.menuRate}
                        onChange={(e) => updateDay(day.id, { menuRate: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="text-sm"
                      />
                    </div>

                    {/* Venue Charges */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Venue Charges</label>
                      <Input
                        type="number"
                        value={day.venueCharges}
                        onChange={(e) => updateDay(day.id, { venueCharges: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="text-sm"
                      />
                    </div>

                    {/* Service Charges */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Service Charges</label>
                      <Input
                        type="number"
                        value={day.serviceCharges}
                        onChange={(e) => updateDay(day.id, { serviceCharges: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="text-sm"
                      />
                    </div>

                    {/* Notes */}
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Day Notes</label>
                      <Input
                        type="text"
                        value={day.notes}
                        onChange={(e) => updateDay(day.id, { notes: e.target.value })}
                        placeholder="Special requirements for this day"
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* Day Financial Summary */}
                  <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-4 gap-2">
                    <div className="bg-blue-50 rounded p-2">
                      <div className="text-xs text-gray-600">Menu Total</div>
                      <div className="text-sm font-bold text-blue-700">
                        {formatCurrencyPKR(day.guaranteedGuests * day.menuRate)}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded p-2">
                      <div className="text-xs text-gray-600">Venue Charges</div>
                      <div className="text-sm font-bold text-green-700">
                        {formatCurrencyPKR(day.venueCharges)}
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded p-2">
                      <div className="text-xs text-gray-600">Service Charges</div>
                      <div className="text-sm font-bold text-amber-700">
                        {formatCurrencyPKR(day.serviceCharges)}
                      </div>
                    </div>
                    <div className="bg-indigo-100 rounded p-2">
                      <div className="text-xs text-gray-700 font-semibold">Day Total</div>
                      <div className="text-lg font-bold text-indigo-900">
                        {formatCurrencyPKR(day.dayTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grand Total Summary */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg p-4 shadow-lg">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-xs opacity-90">Total Days</div>
            <div className="text-2xl font-bold">{eventDays.length}</div>
          </div>
          <div>
            <div className="text-xs opacity-90">Total Guests (All Days)</div>
            <div className="text-2xl font-bold">{formatNumberPK(totalGuests)}</div>
          </div>
          <div>
            <div className="text-xs opacity-90">Average per Day</div>
            <div className="text-2xl font-bold">
              {formatCurrencyPKR(eventDays.length > 0 ? Math.round(grandTotal / eventDays.length) : 0)}
            </div>
          </div>
          <div className="bg-white/20 rounded-lg p-2">
            <div className="text-xs font-semibold">GRAND TOTAL (All Days)</div>
            <div className="text-3xl font-bold">
              {formatCurrencyPKR(grandTotal)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

