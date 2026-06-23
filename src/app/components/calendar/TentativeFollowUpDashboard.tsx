import { useState, useMemo } from 'react';
import { Booking } from './types-v2';
import { getVenueById, getPrimeSpaceById, getSubSpaceById } from './data-v2';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Phone, 
  Mail, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar,
  Search,
  AlertCircle,
  CheckSquare,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { formatCurrencyPKR, formatDatePK } from '../../lib/locale';

type FollowUpStage = 'new' | 'scheduled' | 'awaiting' | 'ready' | 'expired';

interface TentativeTask {
  booking: Booking;
  daysUntilEvent: number;
  daysSinceCreated: number;
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
  priority: 'high' | 'medium' | 'low';
  stage: FollowUpStage;
}

interface TentativeFollowUpDashboardProps {
  onBookingClick: (booking: Booking) => void;
  onConvertToConfirmed: (booking: Booking) => void;
  onCancelBooking: (booking: Booking) => void;
  onReturnToCalendar: () => void;
  bookings?: Booking[];
}

export function TentativeFollowUpDashboard({
  onBookingClick,
  onConvertToConfirmed,
  onCancelBooking,
  onReturnToCalendar,
  bookings: externalBookings,
}: TentativeFollowUpDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'eventDate' | 'followUp' | 'priority'>('eventDate');

  const bookingsToUse = externalBookings ?? [];

  // Get all tentative bookings
  const tentativeBookings = useMemo(() => {
    return bookingsToUse.filter(b => b.status === 'tentative');
  }, [bookingsToUse]);

  // Convert bookings to tasks with metadata
  const tasks: TentativeTask[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tentativeBookings.map(booking => {
      const eventDate = new Date(booking.date);
      eventDate.setHours(0, 0, 0, 0);
      const createdAt = booking.createdAt ? new Date(booking.createdAt) : eventDate;
      createdAt.setHours(0, 0, 0, 0);
      
      const daysUntilEvent = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceCreated = Math.max(
        0,
        Math.ceil((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      );
      
      // Determine priority based on days until event
      let priority: 'high' | 'medium' | 'low';
      if (daysUntilEvent < 3) priority = 'high';
      else if (daysUntilEvent < 7) priority = 'medium';
      else priority = 'low';

      let stage: FollowUpStage;
      if (daysUntilEvent < 0) stage = 'expired';
      else if (daysSinceCreated < 1) stage = 'new';
      else if (booking.callbackDate) stage = 'scheduled';
      else if (daysUntilEvent < 5) stage = 'ready';
      else stage = 'awaiting';

      return {
        booking,
        daysUntilEvent,
        daysSinceCreated,
        lastContactDate: booking.callbackDate,
        nextFollowUpDate: booking.callbackDate,
        priority,
        stage,
      };
    });
  }, [tentativeBookings]);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Filter by venue
    if (selectedVenue !== 'all') {
      filtered = filtered.filter(t => t.booking.venueId === selectedVenue);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.booking.customerName.toLowerCase().includes(query) ||
        t.booking.contactNumber?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'eventDate') {
        return a.daysUntilEvent - b.daysUntilEvent;
      } else if (sortBy === 'followUp') {
        if (!a.nextFollowUpDate) return 1;
        if (!b.nextFollowUpDate) return -1;
        return a.nextFollowUpDate.getTime() - b.nextFollowUpDate.getTime();
      } else { // priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
    });

    return filtered;
  }, [tasks, selectedVenue, searchQuery, sortBy]);

  // Group by stage
  const tasksByStage = useMemo(() => {
    const grouped: Record<FollowUpStage, TentativeTask[]> = {
      new: [],
      scheduled: [],
      awaiting: [],
      ready: [],
      expired: [],
    };

    filteredTasks.forEach(task => {
      grouped[task.stage].push(task);
    });

    return grouped;
  }, [filteredTasks]);

  // Get unique venues
  const venues = useMemo(() => {
    const venueIds = new Set(bookingsToUse.map(b => b.venueId));
    return Array.from(venueIds).map(id => getVenueById(id)).filter(v => v !== undefined);
  }, [bookingsToUse]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: filteredTasks.length,
      high: filteredTasks.filter(t => t.priority === 'high').length,
      medium: filteredTasks.filter(t => t.priority === 'medium').length,
      low: filteredTasks.filter(t => t.priority === 'low').length,
      expiringSoon: filteredTasks.filter(t => t.daysUntilEvent < 3 && t.daysUntilEvent >= 0).length,
      expired: tasksByStage.expired.length,
    };
  }, [filteredTasks, tasksByStage]);

  // Get space name helper
  const getSpaceName = (booking: Booking): string => {
    if (booking.primeSpaceId) {
      const primeSpace = getPrimeSpaceById(booking.primeSpaceId);
      return primeSpace?.name || 'Unknown Space';
    } else if (booking.subSpaceId) {
      const subSpace = getSubSpaceById(booking.subSpaceId);
      const primeSpace = getPrimeSpaceById(subSpace?.primeSpaceId || '');
      return `${primeSpace?.name} - ${subSpace?.name}` || 'Unknown Space';
    }
    return 'Unknown Space';
  };

  // Format date helper
  const formatDate = (date: Date): string => {
    return formatDatePK(date);
  };

  // Format time helper
  const formatTime = (time: string | undefined): string => {
    if (!time) return 'N/A';
    const parts = time.split(':');
    if (parts.length < 2) return time; // Return as-is if not in expected format
    const [hours, minutes] = parts.map(Number);
    if (isNaN(hours) || isNaN(minutes)) return time; // Return as-is if not valid numbers
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Render task card
  const renderTaskCard = (task: TentativeTask) => {
    const { booking, daysUntilEvent, priority, nextFollowUpDate } = task;
    const venue = getVenueById(booking.venueId);
    const spaceName = getSpaceName(booking);

    // Priority colors
    const priorityConfig = {
      high: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', badge: 'bg-red-500' },
      medium: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', badge: 'bg-yellow-500' },
      low: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', badge: 'bg-blue-500' },
    };

    const config = priorityConfig[priority];

    // Days until event badge
    let daysLabel = '';
    let daysColor = '';
    if (daysUntilEvent < 0) {
      daysLabel = `${Math.abs(daysUntilEvent)}d overdue`;
      daysColor = 'bg-red-600 text-white';
    } else if (daysUntilEvent === 0) {
      daysLabel = 'Today';
      daysColor = 'bg-red-500 text-white';
    } else if (daysUntilEvent === 1) {
      daysLabel = 'Tomorrow';
      daysColor = 'bg-orange-500 text-white';
    } else if (daysUntilEvent < 7) {
      daysLabel = `${daysUntilEvent}d away`;
      daysColor = 'bg-orange-400 text-white';
    } else {
      daysLabel = `${daysUntilEvent}d away`;
      daysColor = 'bg-gray-400 text-white';
    }

    return (
      <div
        key={booking.id}
        className={`border-2 ${config.border} ${config.bg} rounded-lg p-4 mb-3 hover:shadow-md transition-shadow cursor-pointer`}
        onClick={() => onBookingClick(booking)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">{booking.customerName}</h3>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${daysColor}`}>
                {daysLabel}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {venue?.name} • {spaceName}
            </div>
          </div>
          
          {/* Priority badge */}
          <div className={`w-3 h-3 rounded-full ${config.badge} flex-shrink-0 ml-2`} title={`${priority} priority`} />
        </div>

        {/* Event Details */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="size-4 text-gray-500" />
            <span className="font-medium">{formatDate(booking.date)}</span>
            <span className="text-gray-500">•</span>
            <Clock className="size-4 text-gray-500" />
            <span>{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{booking.guestCount} guests</span>
            {booking.totalAmount && (
              <>
                <span>•</span>
                    <span className="font-medium text-gray-900">{formatCurrencyPKR(booking.totalAmount)}</span>
              </>
            )}
          </div>

          {booking.contactNumber && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="size-3.5" />
              <span>{booking.contactNumber}</span>
            </div>
          )}

          {nextFollowUpDate && (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="size-3.5 text-blue-600" />
              <span className="text-blue-600 font-medium">
                Follow-up: {formatDate(nextFollowUpDate)}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              // Handle call action
            }}
          >
            <Phone className="size-3 mr-1" />
            Call
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              // Handle email action
            }}
          >
            <Mail className="size-3 mr-1" />
            Email
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 text-xs bg-green-600 hover:bg-green-700"
            onClick={(e) => {
              e.stopPropagation();
              onConvertToConfirmed(booking);
            }}
          >
            <CheckCircle className="size-3 mr-1" />
            Confirm
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              onCancelBooking(booking);
            }}
          >
            <XCircle className="size-3.5" />
          </Button>
        </div>

        {booking.notes && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600 italic line-clamp-2">{booking.notes}</p>
          </div>
        )}
      </div>
    );
  };

  // Stage configurations
  const stageConfig: Record<FollowUpStage, { title: string; icon: any; color: string }> = {
    new: { 
      title: 'New Tentative', 
      icon: AlertCircle, 
      color: 'bg-purple-100 text-purple-800 border-purple-300' 
    },
    scheduled: { 
      title: 'Follow-Up Scheduled', 
      icon: Calendar, 
      color: 'bg-blue-100 text-blue-800 border-blue-300' 
    },
    awaiting: { 
      title: 'Awaiting Response', 
      icon: Clock, 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300' 
    },
    ready: { 
      title: 'Ready to Convert', 
      icon: CheckSquare, 
      color: 'bg-green-100 text-green-800 border-green-300' 
    },
    expired: { 
      title: 'Expired / Lost', 
      icon: XCircle, 
      color: 'bg-red-100 text-red-800 border-red-300' 
    },
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Tentative Reservations Follow-Up</h1>
            <p className="text-sm text-gray-600 mt-1">Task pipeline for converting tentative bookings</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-50"
            onClick={onReturnToCalendar}
          >
            <ArrowLeft className="size-3.5" />
            Back to Calendar
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-6 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600 mt-1">Total Tentative</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <div className="text-2xl font-bold text-red-700">{stats.high}</div>
            <div className="text-xs text-red-600 mt-1">High Priority</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-700">{stats.medium}</div>
            <div className="text-xs text-yellow-600 mt-1">Medium Priority</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{stats.low}</div>
            <div className="text-xs text-blue-600 mt-1">Low Priority</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
            <div className="text-2xl font-bold text-orange-700">{stats.expiringSoon}</div>
            <div className="text-xs text-orange-600 mt-1">Expiring Soon</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-300">
            <div className="text-2xl font-bold text-gray-700">{stats.expired}</div>
            <div className="text-xs text-gray-600 mt-1">Expired</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by customer name or contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={selectedVenue}
            onChange={(e) => setSelectedVenue(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="all">All Venues</option>
            {venues.map(venue => (
              <option key={venue?.id} value={venue?.id}>{venue?.name}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="eventDate">Sort: Event Date</option>
            <option value="followUp">Sort: Follow-Up Date</option>
            <option value="priority">Sort: Priority</option>
          </select>
        </div>
      </div>

      {/* Pipeline Columns */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-x-auto">
          <div className="flex gap-4 p-6 min-w-max h-full">
            {(Object.keys(stageConfig) as FollowUpStage[]).map(stage => {
              const config = stageConfig[stage];
              const Icon = config.icon;
              const stageTasks = tasksByStage[stage];

              return (
                <div key={stage} className="flex-shrink-0 w-80 flex flex-col">
                  {/* Column Header */}
                  <div className={`rounded-t-lg px-4 py-3 border-2 ${config.color} flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <Icon className="size-4" />
                      <h2 className="font-semibold">{config.title}</h2>
                    </div>
                    <span className="text-sm font-bold">{stageTasks.length}</span>
                  </div>

                  {/* Column Content */}
                  <ScrollArea className="flex-1 bg-white border-x-2 border-b-2 border-gray-200 rounded-b-lg">
                    <div className="p-3">
                      {stageTasks.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          No tasks in this stage
                        </div>
                      ) : (
                        stageTasks.map(task => renderTaskCard(task))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
