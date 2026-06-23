import { useState } from 'react';
import { Plus, Trash2, Calendar, MapPin, Users, Edit2, Check, Copy, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { formatCurrencyPKR, formatDatePK, formatNumberPK, formatTimeRangePK } from '../../lib/locale';

export interface EventDetails {
  id: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  venueId: string;
  venueName: string;
  primeSpaceId: string;
  primeSpaceName: string;
  subSpaceId?: string;
  subSpaceName?: string;
  guaranteedGuests: number;
  expectedGuests: number;
  menuTotal: number;
  venueCharges: number;
  foodSuppliesTotal: number;
  rcsTotal: number;
  miscTotal: number;
  eventTotal: number;
}

interface MultiEventManagerProps {
  events: EventDetails[];
  currentEventId: string;
  onEventSelect: (eventId: string) => void;
  onAddEvent: () => void;
  onRemoveEvent: (eventId: string) => void;
  onDuplicateEvent: (eventId: string) => void;
  showCompact?: boolean; // New prop for compact mode
}

export function MultiEventManager({
  events,
  currentEventId,
  onEventSelect,
  onAddEvent,
  onRemoveEvent,
  onDuplicateEvent,
  showCompact = false,
}: MultiEventManagerProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const currentEvent = events.find(e => e.id === currentEventId);
  const totalAcrossAllEvents = events.reduce((sum, event) => sum + event.eventTotal, 0);

  // If only one event and compact mode, show minimal UI
  if (events.length === 1 && showCompact) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-900">Single Event Booking</span>
          </div>
          <Button
            onClick={onAddEvent}
            size="sm"
            variant="outline"
            className="text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            <Plus className="size-3 mr-1" />
            Add Another Event
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-300 rounded-lg mb-6">
      {/* Header */}
      <div className="p-4 border-b border-purple-300 bg-white/50 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="size-5 text-purple-600" />
              Multi-Event Booking
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                {events.length} {events.length === 1 ? 'Event' : 'Events'}
              </span>
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Managing multiple events for this customer
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onAddEvent}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
            >
              <Plus className="size-3 mr-1" />
              Add Event
            </Button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ChevronRight className={`size-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {isExpanded && (
        <div className="p-4">
          {/* Events List */}
          <div className="grid grid-cols-1 gap-3 mb-4">
            {events.map((event) => {
              const isActive = event.id === currentEventId;
              
              return (
                <div
                  key={event.id}
                  className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                    isActive
                      ? 'border-purple-600 bg-white shadow-md'
                      : 'border-gray-300 bg-white hover:border-purple-400 hover:shadow'
                  }`}
                  onClick={() => onEventSelect(event.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Event Header */}
                      <div className="flex items-center gap-2 mb-2">
                        {isActive && (
                          <div className="bg-purple-600 text-white p-1 rounded">
                            <Check className="size-3" />
                          </div>
                        )}
                        <h4 className="text-sm font-bold text-gray-900">
                          {event.eventType}
                        </h4>
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                          Event #{events.indexOf(event) + 1}
                        </span>
                      </div>

                      {/* Event Details Grid */}
                      <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3 text-gray-400" />
                          <span className="text-gray-600">Date:</span>
                          <span className="font-semibold text-gray-900">
                            {event.eventDate ? formatDatePK(event.eventDate) : '—'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <MapPin className="size-3 text-gray-400" />
                          <span className="text-gray-600">Venue:</span>
                          <span className="font-semibold text-gray-900">
                            {event.venueName || 'â€”'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Users className="size-3 text-gray-400" />
                          <span className="text-gray-600">Guests:</span>
                          <span className="font-semibold text-gray-900">
                            {event.guaranteedGuests || 0}
                          </span>
                        </div>

                        <div className="col-span-2">
                          <span className="text-gray-600">Time:</span>
                          <span className="font-semibold text-gray-900 ml-1.5">
                            {formatTimeRangePK(event.startTime, event.endTime) || '—'}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray-600">Space:</span>
                          <span className="font-semibold text-gray-900 ml-1.5">
                            {event.primeSpaceName || 'â€”'}
                          </span>
                        </div>
                      </div>

                      {/* Event Financial Summary */}
                      <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-4 gap-2">
                        <div className="text-center">
                          <div className="text-[10px] text-gray-500">Menu</div>
                          <div className="text-xs font-bold text-blue-600">
                            {formatCurrencyPKR(event.menuTotal)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-gray-500">Venue</div>
                          <div className="text-xs font-bold text-green-600">
                            {formatCurrencyPKR(event.venueCharges)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-gray-500">Services</div>
                          <div className="text-xs font-bold text-amber-600">
                            {formatCurrencyPKR(event.rcsTotal + event.foodSuppliesTotal + event.miscTotal)}
                          </div>
                        </div>
                        <div className="text-center bg-purple-50 rounded px-2 py-1">
                          <div className="text-[10px] text-gray-700 font-semibold">Event Total</div>
                          <div className="text-sm font-bold text-purple-900">
                            {formatCurrencyPKR(event.eventTotal)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 ml-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateEvent(event.id);
                        }}
                        className="p-1.5 hover:bg-blue-100 rounded transition-colors text-blue-600"
                        title="Duplicate Event"
                      >
                        <Copy className="size-3.5" />
                      </button>
                      {events.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remove ${event.eventType}? This cannot be undone.`)) {
                              onRemoveEvent(event.id);
                            }
                          }}
                          className="p-1.5 hover:bg-red-100 rounded transition-colors text-red-600"
                          title="Remove Event"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Multi-Event Summary */}
          {events.length > 1 && (
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-xs opacity-90">Total Events</div>
                  <div className="text-xl font-bold">{events.length}</div>
                </div>
                <div>
                  <div className="text-xs opacity-90">Total Guests</div>
                  <div className="text-xl font-bold">
                    {formatNumberPK(events.reduce((sum, e) => sum + e.guaranteedGuests, 0))}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-90">Average per Event</div>
                  <div className="text-xl font-bold">
                    {formatCurrencyPKR(Math.round(totalAcrossAllEvents / events.length))}
                  </div>
                </div>
                <div className="bg-white/20 rounded-lg p-2">
                  <div className="text-xs font-semibold">GRAND TOTAL (All Events)</div>
                  <div className="text-2xl font-bold">
                    {formatCurrencyPKR(totalAcrossAllEvents)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Event Indicator (Collapsed State) */}
      {!isExpanded && currentEvent && (
        <div className="px-4 pb-3">
          <div className="text-xs text-gray-600">
            Currently editing: <span className="font-bold text-purple-600">{currentEvent.eventType}</span>
            {' '}on{' '}
            <span className="font-semibold">
              {currentEvent.eventDate ? formatDatePK(currentEvent.eventDate) : '—'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

