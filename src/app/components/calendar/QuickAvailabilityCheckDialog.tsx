import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Search, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { canBookPrimeSpace, canBookSubSpace } from './availability-v2';
import { getPrimeSpacesByVenue, primeSpaces as allPrimeSpaces, venues } from './data-v2';
import { Booking } from './types-v2';
import { formatDatePK } from '../../lib/locale';
import { primeSpaceDataStore, subSpaceDataStore } from '../../lib/masterDataStore';

type SessionType = 'all' | 'lunch' | 'dinner' | 'full-day' | 'custom';

type AvailabilityResult = {
  date: Date;
  session: SessionType;
  startTime: string;
  endTime: string;
  hour: number;
  venueId: string;
  venueName: string;
  primeSpaceId: string;
  primeSpaceName: string;
  subSpaceId?: string;
  subSpaceName?: string;
  isPrime: boolean;
  capacity: number;
  guestCount: number;
  minimumGuarantee: number;
  commercialCondition: string;
  availabilityLabel: string;
};

interface QuickAvailabilityCheckDialogProps {
  open: boolean;
  bookings: Booking[];
  initialVenueId?: string;
  initialDate?: Date;
  onClose: () => void;
  onReserve: (result: AvailabilityResult) => void;
}

const SESSION_PRESETS: Record<Exclude<SessionType, 'custom'>, { label: string; startTime: string; endTime: string; hour: number }> = {
  lunch: { label: 'Lunch', startTime: '12:00', endTime: '16:00', hour: 12 },
  dinner: { label: 'Dinner', startTime: '18:00', endTime: '22:00', hour: 18 },
  'full-day': { label: 'Full Day', startTime: '10:00', endTime: '22:00', hour: 10 },
};

const toDateInputValue = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

const enumerateDates = (startValue: string, endValue: string) => {
  const dates: Date[] = [];
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(new Date(cursor));
  }

  return dates;
};

const defaultPrimeSpacesForLookup = [
  { id: 'ps-1', minimumGuests: 250 },
  { id: 'ps-2', minimumGuests: 250 },
  { id: 'ps-3', minimumGuests: 250 },
  { id: 'ps-4', minimumGuests: 100 },
  { id: 'ps-5', minimumGuests: 100 },
  { id: 'ps-6', minimumGuests: 300 },
  { id: 'ps-7', minimumGuests: 200 },
];

const defaultSubSpacesForLookup = [
  { id: 'ss-1', primeSpaceId: 'ps-1' },
  { id: 'ss-2', primeSpaceId: 'ps-1' },
  { id: 'ss-3', primeSpaceId: 'ps-2' },
  { id: 'ss-4', primeSpaceId: 'ps-2' },
  { id: 'ss-5', primeSpaceId: 'ps-3' },
  { id: 'ss-6', primeSpaceId: 'ps-3' },
];

export function QuickAvailabilityCheckDialog({
  open,
  bookings,
  initialVenueId,
  initialDate,
  onClose,
  onReserve,
}: QuickAvailabilityCheckDialogProps) {
  const defaultDate = initialDate || new Date();
  const [guestCount, setGuestCount] = useState<number>(300);
  const [venueId, setVenueId] = useState(initialVenueId || '');
  const [primeSpaceId, setPrimeSpaceId] = useState('');
  const [subSpaceId, setSubSpaceId] = useState('');
  const [session, setSession] = useState<SessionType>('all');
  const [startDate, setStartDate] = useState(toDateInputValue(defaultDate));
  const [endDate, setEndDate] = useState(toDateInputValue(defaultDate));
  const [dayFilter, setDayFilter] = useState('any');
  const [customStartTime, setCustomStartTime] = useState('18:00');
  const [customEndTime, setCustomEndTime] = useState('22:00');
  const [results, setResults] = useState<AvailabilityResult[]>([]);

  useEffect(() => {
    if (!open) return;

    const seedDate = initialDate || new Date();
    setVenueId(initialVenueId || '');
    setPrimeSpaceId('');
    setSubSpaceId('');
    setSession('all');
    setStartDate(toDateInputValue(seedDate));
    setEndDate(toDateInputValue(seedDate));
    setDayFilter('any');
    setCustomStartTime('18:00');
    setCustomEndTime('22:00');
    setResults([]);
  }, [initialDate, initialVenueId, open]);

  const primeSpaces = useMemo(() => (venueId ? getPrimeSpacesByVenue(venueId) : allPrimeSpaces), [venueId]);
  const selectedPrimeSpace = primeSpaces.find((primeSpace) => primeSpace.id === primeSpaceId);
  const masterPrimeSpaces = useMemo(() => primeSpaceDataStore.getPrimeSpaces([]), []);
  const masterSubSpaces = useMemo(() => subSpaceDataStore.getSubSpaces([]), []);
  const activeBookings = bookings.filter(
    (booking) => booking.status !== 'cancelled' && booking.status !== 'expired' && booking.status !== 'lost-space-taken'
  );

  if (!open) {
    return null;
  }

  const handleSearch = () => {
    if (guestCount <= 0 || !startDate || !endDate) {
      setResults([]);
      return;
    }

    const resolvedStartDate = startDate <= endDate ? startDate : endDate;
    const resolvedEndDate = endDate >= startDate ? endDate : startDate;
    const sessionConfigs =
      session === 'all'
        ? (Object.entries(SESSION_PRESETS).map(([key, value]) => ({
            key: key as Exclude<SessionType, 'all' | 'custom'>,
            ...value,
          })))
        : session === 'custom'
          ? [{
              key: 'custom' as const,
              label: 'Custom Time',
              startTime: customStartTime,
              endTime: customEndTime,
              hour: Number((customStartTime || '00:00').split(':')[0]),
            }]
          : [{
              key: session,
              ...SESSION_PRESETS[session],
            }];

    const nextResults: AvailabilityResult[] = [];

    const buildCommercialCondition = (minimumGuarantee: number) => {
      if (minimumGuarantee > 0 && guestCount < minimumGuarantee) {
        return 'Below minimum guarantee - fixed rental applies';
      }
      return 'Available with venue charge';
    };

    enumerateDates(resolvedStartDate, resolvedEndDate)
      .filter((date) => dayFilter === 'any' || String(date.getDay()) === dayFilter)
      .forEach((date) => {
        const venuePrimeSpaces = primeSpaceId
          ? primeSpaces.filter((primeSpace) => primeSpace.id === primeSpaceId)
          : primeSpaces;

        venuePrimeSpaces.forEach((primeSpace) => {
          const venueName = venues.find((venue) => venue.id === primeSpace.venueId)?.name || 'Unknown Venue';
          sessionConfigs.forEach((sessionConfig) => {
            const candidateSpaces = subSpaceId
              ? primeSpace.subSpaces.filter((subSpace) => subSpace.id === subSpaceId)
              : [];

            if (candidateSpaces.length > 0) {
              candidateSpaces.forEach((subSpace) => {
                if (subSpace.capacity < guestCount) return;
                const availability = canBookSubSpace(subSpace.id, date, sessionConfig.startTime, sessionConfig.endTime, activeBookings);
                if (!availability.isAvailable) return;
                const masterPrimeSpace = masterPrimeSpaces.find((space: any) => space.id === primeSpace.id);
                const masterSubSpace = masterSubSpaces.find((space: any) => space.id === subSpace.id);
                const minimumGuarantee = Number(masterSubSpace?.customMinGuests ?? masterPrimeSpace?.minimumGuests ?? 0);

                nextResults.push({
                  date,
                  session: sessionConfig.key,
                  startTime: sessionConfig.startTime,
                  endTime: sessionConfig.endTime,
                  hour: sessionConfig.hour,
                  venueId: primeSpace.venueId,
                  venueName,
                  primeSpaceId: primeSpace.id,
                  primeSpaceName: primeSpace.name,
                  subSpaceId: subSpace.id,
                  subSpaceName: subSpace.name,
                  isPrime: false,
                  capacity: subSpace.capacity,
                  guestCount,
                  minimumGuarantee,
                  commercialCondition: buildCommercialCondition(minimumGuarantee),
                  availabilityLabel: 'Available',
                });
              });
              return;
            }

            if (primeSpace.capacity >= guestCount) {
              const primeAvailability = canBookPrimeSpace(primeSpace.id, date, sessionConfig.startTime, sessionConfig.endTime, activeBookings);
              if (primeAvailability.isAvailable) {
                const masterPrimeSpace = masterPrimeSpaces.find((space: any) => space.id === primeSpace.id);
                const minimumGuarantee = Number(masterPrimeSpace?.minimumGuests ?? 0);
                nextResults.push({
                  date,
                  session: sessionConfig.key,
                  startTime: sessionConfig.startTime,
                  endTime: sessionConfig.endTime,
                  hour: sessionConfig.hour,
                  venueId: primeSpace.venueId,
                  venueName,
                  primeSpaceId: primeSpace.id,
                  primeSpaceName: primeSpace.name,
                  isPrime: true,
                  capacity: primeSpace.capacity,
                  guestCount,
                  minimumGuarantee,
                  commercialCondition: buildCommercialCondition(minimumGuarantee),
                  availabilityLabel: 'Available',
                });
              }
            }

            if (!subSpaceId) {
              primeSpace.subSpaces.forEach((subSpace) => {
                if (subSpace.capacity < guestCount) return;
                const availability = canBookSubSpace(subSpace.id, date, sessionConfig.startTime, sessionConfig.endTime, activeBookings);
                if (!availability.isAvailable) return;
                const masterPrimeSpace = masterPrimeSpaces.find((space: any) => space.id === primeSpace.id);
                const masterSubSpace = masterSubSpaces.find((space: any) => space.id === subSpace.id);
                const minimumGuarantee = Number(masterSubSpace?.customMinGuests ?? masterPrimeSpace?.minimumGuests ?? 0);

                nextResults.push({
                  date,
                  session: sessionConfig.key,
                  startTime: sessionConfig.startTime,
                  endTime: sessionConfig.endTime,
                  hour: sessionConfig.hour,
                  venueId: primeSpace.venueId,
                  venueName,
                  primeSpaceId: primeSpace.id,
                  primeSpaceName: primeSpace.name,
                  subSpaceId: subSpace.id,
                  subSpaceName: subSpace.name,
                  isPrime: false,
                  capacity: subSpace.capacity,
                  guestCount,
                  minimumGuarantee,
                  commercialCondition: buildCommercialCondition(minimumGuarantee),
                  availabilityLabel: 'Available',
                });
              });
            }
          });
        });
      });

    nextResults.sort((left, right) => {
      if (left.date.getTime() !== right.date.getTime()) return left.date.getTime() - right.date.getTime();
      if (left.startTime !== right.startTime) return left.startTime.localeCompare(right.startTime);
      return left.capacity - right.capacity;
    });

    setResults(nextResults);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/35 px-4 py-8">
      <div className="w-full max-w-6xl rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Quick Availability Check</h2>
            <p className="mt-1 text-sm text-slate-500">Find an available slot before starting a confirmed reservation.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="grid gap-5 px-5 py-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Guest Count</label>
                <Input type="number" min="1" value={guestCount || ''} onChange={(e) => setGuestCount(Number(e.target.value) || 0)} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Venue</label>
                <select
                  value={venueId}
                  onChange={(e) => {
                    setVenueId(e.target.value);
                    setPrimeSpaceId('');
                    setSubSpaceId('');
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">All Venues</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>{venue.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Prime Space</label>
                <select
                  value={primeSpaceId}
                  onChange={(e) => {
                    setPrimeSpaceId(e.target.value);
                    setSubSpaceId('');
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">All Prime Spaces</option>
                  {primeSpaces.map((primeSpace) => (
                    <option key={primeSpace.id} value={primeSpace.id}>{primeSpace.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Optional Sub Space</label>
                <select
                  value={subSpaceId}
                  onChange={(e) => setSubSpaceId(e.target.value)}
                  disabled={!selectedPrimeSpace}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                >
                  <option value="">Any Matching Space</option>
                  {(selectedPrimeSpace?.subSpaces || []).map((subSpace) => (
                    <option key={subSpace.id} value={subSpace.id}>{subSpace.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Session</label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value as SessionType)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="all">All Sessions</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="full-day">Full Day</option>
                  <option value="custom">Custom Time</option>
                </select>
              </div>

              {session === 'custom' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Start Time</label>
                    <Input type="time" value={customStartTime} onChange={(e) => setCustomStartTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">End Time</label>
                    <Input type="time" value={customEndTime} onChange={(e) => setCustomEndTime(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Start Date</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">End Date</label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Day Filter</label>
                <select
                  value={dayFilter}
                  onChange={(e) => setDayFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="any">Any Day</option>
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </div>
            </div>

            <Button onClick={handleSearch} className="w-full">
              <Search className="mr-2 size-4" />
              Find Available Slots
            </Button>
          </div>

          <div className="min-h-[480px] rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Available Options</h3>
                <p className="text-xs text-slate-500">Reserve from a valid available slot only.</p>
              </div>
              <div className="text-xs font-medium text-slate-500">{results.length} result{results.length === 1 ? '' : 's'}</div>
            </div>

            <div className="max-h-[560px] overflow-y-auto p-4">
              {results.length === 0 ? (
                <div className="flex h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
                  <CalendarDays className="mb-3 size-10 text-slate-300" />
                  <div className="text-sm font-medium text-slate-700">Run an availability search to see matching slots.</div>
                  <div className="mt-1 text-xs text-slate-500">Results include availability, capacity fit, minimum guarantee, commercial condition, and reserve action.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((result, index) => (
                    <div key={`${result.venueId}-${result.primeSpaceId}-${result.subSpaceId || 'prime'}-${result.date.toISOString()}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-slate-900">
                            {result.venueName} &gt; {result.primeSpaceName}{result.subSpaceName ? ` > ${result.subSpaceName}` : ''}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                            <span className="rounded-full bg-white px-2.5 py-1">{formatDatePK(result.date)}</span>
                            <span className="rounded-full bg-white px-2.5 py-1">
                              {result.session === 'custom' ? 'Custom Time' : SESSION_PRESETS[result.session as Exclude<SessionType, 'custom'>].label}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1">{result.startTime} - {result.endTime}</span>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                              {result.availabilityLabel}
                            </span>
                            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700">
                              Requested guests: {result.guestCount}
                            </span>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                              Capacity fit: {result.guestCount}/{result.capacity}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1">
                              Minimum guarantee: {result.minimumGuarantee > 0 ? result.minimumGuarantee : 'Not set'}
                            </span>
                            <span className={`rounded-full px-2.5 py-1 ${result.guestCount < result.minimumGuarantee ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                              {result.commercialCondition}
                            </span>
                          </div>
                        </div>

                        <Button
                          onClick={() => onReserve(result)}
                          className="shrink-0"
                        >
                          Reserve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
