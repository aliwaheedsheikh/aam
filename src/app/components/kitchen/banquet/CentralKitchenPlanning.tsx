import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileWarning,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Utensils,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Booking } from '../../calendar/types-v2';
import {
  Dish,
  MenuPackage,
  PurchaseItem,
  Recipe,
  StoreMaster,
  UnitMaster,
} from '../types';
import { WORKFLOW_STATE_KEYS, usePersistedWorkflowState } from '../../../lib/workflowState';
import { formatCurrencyPKR, formatDatePK, formatNumberPK } from '../../../lib/locale';
import {
  buildDirectorPlanningEvents,
  type DirectorEstimateLineDraft,
  type DirectorEstimateRecord,
  type DirectorPlanningEvent,
  type DirectorPlanningLineBase,
  getDirectorEstimateDateKey,
} from './directorPlanningFlow';
import { getBookingSnapshot } from './productionFlow';

interface CentralKitchenPlanningProps {
  userName: string;
  bookings: Booking[];
  dishes: Dish[];
  recipes: Recipe[];
  menuPackages: MenuPackage[];
  purchaseItems: PurchaseItem[];
  stores: StoreMaster[];
  units: UnitMaster[];
}

interface ComputedPlanningLine extends DirectorPlanningLineBase, DirectorEstimateLineDraft {
  requiredQuantity: number;
  finalProductionQuantity: number;
  totalFoodCost: number;
  foodCostPerPax: number;
  grossMargin: number;
  marginPercent: number;
  foodCostPercent: number;
  alerts: string[];
}

type EventEstimateStatus = 'pending' | 'estimated' | 'approved';
type MealPeriod = 'Lunch' | 'Dinner';
type CorrectionStatus = 'sent' | 'resolved';

interface MenuCorrectionRequest {
  id: string;
  bookingId: string;
  dateKey: string;
  reservationNumber: string;
  eventLabel: string;
  lineId?: string;
  menuItemName?: string;
  reason: string;
  notes: string;
  status: CorrectionStatus;
  requestedBy: string;
  createdAt: Date;
}

interface BackupFoodPlanLine {
  id: string;
  bookingId: string;
  dateKey: string;
  itemName: string;
  reason: string;
  estimateFactor: number;
  wastagePercent: number;
  unitOfMeasure: string;
  costPerUnit: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
}

interface FoodSupplyProductionLine {
  lineId: string;
  itemName: string;
  quantity: number;
  unitOfMeasure: string;
  rate: number;
  totalFoodCost: number;
}

const MIN_MARGIN_PERCENT = 35;
const HIGH_FOOD_COST_PERCENT = 65;
const HIGH_WASTAGE_PERCENT = 15;

const DEFAULT_CORRECTION_REASON = 'Wrong or missing sold menu item';

const CORRECTION_REASONS = [
  DEFAULT_CORRECTION_REASON,
  'Wrong package or package line',
  'Incorrect pax or guarantee',
  'Wrong UOM or factor basis',
  'Recipe or costing missing',
  'Other',
];

const BACKUP_REASONS = [
  'Guest count risk',
  'Late service buffer',
  'VIP table buffer',
  'Kitchen yield risk',
  'Weather/service delay',
  'Other',
];

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-3 py-2 text-sm text-slate-700 align-middle';
const inputClass = 'h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 disabled:bg-slate-100 disabled:text-slate-500';
const numberInputClass = `${inputClass} text-right`;

const CompactSection = ({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) => (
  <section className="min-h-0 overflow-hidden rounded border border-slate-200 bg-white">
    <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

const getStatusBadge = (status: string) => {
  const classNameMap: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-700',
    estimated: 'bg-emerald-100 text-emerald-700',
    draft: 'bg-emerald-100 text-emerald-700',
    approved: 'bg-blue-100 text-blue-700',
    sent: 'bg-amber-100 text-amber-700',
    resolved: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${
        classNameMap[status] || 'bg-slate-100 text-slate-700'
      }`}
    >
      {status.replace(/-/g, ' ')}
    </span>
  );
};

const upsertEstimateRecord = (
  currentRecords: DirectorEstimateRecord[],
  nextRecord: DirectorEstimateRecord,
) => {
  const nextRecords = currentRecords.filter((record) => record.bookingId !== nextRecord.bookingId);
  nextRecords.push(nextRecord);
  return nextRecords;
};

const buildWorkingEstimate = (
  event: DirectorPlanningEvent,
  savedEstimate?: DirectorEstimateRecord,
): DirectorEstimateRecord => {
  const savedLineMap = new Map(savedEstimate?.lines.map((line) => [line.lineId, line]) ?? []);

  return {
    bookingId: event.bookingId,
    dateKey: getDirectorEstimateDateKey(event.eventDate),
    status: savedEstimate?.status ?? 'draft',
    guestCountSnapshot: savedEstimate?.guestCountSnapshot ?? event.pax,
    menuSignature: savedEstimate?.menuSignature,
    foodSuppliesSignature: savedEstimate?.foodSuppliesSignature,
    savedAt: savedEstimate?.savedAt,
    approvedAt: savedEstimate?.approvedAt,
    approvedBy: savedEstimate?.approvedBy,
    managementAlertSentAt: savedEstimate?.managementAlertSentAt,
    lines: event.lines.map((line) => {
      const savedLine = savedLineMap.get(line.lineId);
      return {
        lineId: line.lineId,
        estimateFactor: savedLine?.estimateFactor ?? line.defaultEstimateFactor,
        wastagePercent: savedLine?.wastagePercent ?? line.defaultWastagePercent,
        sellingPriceAllocation: savedLine?.sellingPriceAllocation ?? line.sellingPriceAllocation,
        factorMode: savedLine?.factorMode ?? line.factorMode,
        notes: savedLine?.notes ?? '',
      };
    }),
  };
};

const toPositiveNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const getComputedLines = (
  event: DirectorPlanningEvent | undefined,
  workingEstimate: DirectorEstimateRecord | null,
): ComputedPlanningLine[] => {
  if (!event || !workingEstimate) {
    return [];
  }

  const draftMap = new Map(workingEstimate.lines.map((line) => [line.lineId, line]));

  return event.lines.map((line) => {
    const draft = draftMap.get(line.lineId) ?? {
      lineId: line.lineId,
      estimateFactor: line.defaultEstimateFactor,
      wastagePercent: line.defaultWastagePercent,
      sellingPriceAllocation: line.sellingPriceAllocation,
      factorMode: line.factorMode,
      notes: '',
    };

    const requiredQuantity = line.pax * draft.estimateFactor;
    const finalProductionQuantity = requiredQuantity * (1 + draft.wastagePercent / 100);
    const totalFoodCost = finalProductionQuantity * line.recipeCostPerUnit;
    const foodCostPerPax = line.pax > 0 ? totalFoodCost / line.pax : 0;
    const grossMargin = draft.sellingPriceAllocation - totalFoodCost;
    const marginPercent =
      draft.sellingPriceAllocation > 0 ? (grossMargin / draft.sellingPriceAllocation) * 100 : 0;
    const foodCostPercent =
      draft.sellingPriceAllocation > 0 ? (totalFoodCost / draft.sellingPriceAllocation) * 100 : 0;
    const alerts: string[] = [];

    if (!line.issueReady) {
      alerts.push('Recipe costing is incomplete for this item.');
    }

    if (draft.wastagePercent > HIGH_WASTAGE_PERCENT) {
      alerts.push('Wastage is above preferred limit.');
    }

    if (draft.sellingPriceAllocation <= 0) {
      alerts.push('Sold price allocation is missing.');
    }

    if (foodCostPercent > HIGH_FOOD_COST_PERCENT) {
      alerts.push('Food cost is high for the sold allocation.');
    }

    if (marginPercent < MIN_MARGIN_PERCENT) {
      alerts.push('Food margin is below planning target.');
    }

    return {
      ...line,
      ...draft,
      requiredQuantity,
      finalProductionQuantity,
      totalFoodCost,
      foodCostPerPax,
      grossMargin,
      marginPercent,
      foodCostPercent,
      alerts,
    };
  });
};

const getMealPeriod = (event: DirectorPlanningEvent): MealPeriod => {
  const eventText = `${event.eventType} ${event.packageName}`.toLowerCase();
  if (eventText.includes('lunch')) {
    return 'Lunch';
  }

  if (eventText.includes('dinner')) {
    return 'Dinner';
  }

  const startTime = event.eventTime.split('-')[0]?.trim() || '';
  const startHour = Number(startTime.split(':')[0]);
  return Number.isFinite(startHour) && startHour >= 11 && startHour < 17 ? 'Lunch' : 'Dinner';
};

const getEventStatus = (savedEstimate?: DirectorEstimateRecord): EventEstimateStatus => {
  if (savedEstimate?.status === 'approved') {
    return 'approved';
  }

  if (savedEstimate?.savedAt) {
    return 'estimated';
  }

  return 'pending';
};

const isLineSearchMatch = (line: ComputedPlanningLine, normalizedSearch: string) => {
  if (!normalizedSearch) {
    return false;
  }

  return (
    line.menuItemName.toLowerCase().includes(normalizedSearch) ||
    line.section.toLowerCase().includes(normalizedSearch) ||
    line.preparationArea.toLowerCase().includes(normalizedSearch)
  );
};

const getBackupComputation = (line: BackupFoodPlanLine, pax: number) => {
  const estimatedQuantity = pax * line.estimateFactor;
  const finalQuantity = estimatedQuantity * (1 + line.wastagePercent / 100);
  const totalFoodCost = finalQuantity * line.costPerUnit;
  return { estimatedQuantity, finalQuantity, totalFoodCost };
};

const normalizeSignatureValue = (value?: string | null) => (value || '').trim().toLowerCase();

const getMenuSignature = (event: DirectorPlanningEvent) =>
  JSON.stringify(
    event.lines
      .map((line) => ({
        dishId: line.dishId,
        name: line.menuItemName,
        section: line.section,
        unit: line.unitOfMeasure,
      }))
      .sort((left, right) => `${left.dishId}:${left.name}`.localeCompare(`${right.dishId}:${right.name}`)),
  );

const getFoodSupplyLinesForBooking = (booking?: Booking): FoodSupplyProductionLine[] => {
  if (!booking) {
    return [];
  }

  const items = getBookingSnapshot(booking)?.foodSupplies?.items ?? [];

  return items
    .map((item, index) => {
      const quantity = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      return {
        lineId: `food-supply-${index}-${normalizeSignatureValue(item.item)}`,
        itemName: item.item || 'Food supply item',
        quantity,
        unitOfMeasure: item.unit || 'unit',
        rate,
        totalFoodCost: quantity * rate,
      };
    })
    .filter((line) => line.itemName.trim() && line.quantity > 0);
};

const getFoodSuppliesSignature = (lines: FoodSupplyProductionLine[]) =>
  JSON.stringify(
    lines
      .map((line) => ({
        item: line.itemName,
        quantity: line.quantity,
        unit: line.unitOfMeasure,
        rate: line.rate,
      }))
      .sort((left, right) => `${left.item}:${left.unit}`.localeCompare(`${right.item}:${right.unit}`)),
  );

const isFoodSupplySearchMatch = (line: FoodSupplyProductionLine, normalizedSearch: string) => {
  if (!normalizedSearch) {
    return false;
  }

  return (
    line.itemName.toLowerCase().includes(normalizedSearch) ||
    line.unitOfMeasure.toLowerCase().includes(normalizedSearch) ||
    'food supplies'.includes(normalizedSearch)
  );
};

export function CentralKitchenPlanning({
  userName,
  bookings,
  dishes,
  recipes,
  menuPackages,
  units,
}: CentralKitchenPlanningProps) {
  const [savedEstimates, setSavedEstimates] = usePersistedWorkflowState<DirectorEstimateRecord[]>(
    WORKFLOW_STATE_KEYS.centralKitchenEstimates,
    [],
  );
  const [correctionRequests, setCorrectionRequests] = usePersistedWorkflowState<MenuCorrectionRequest[]>(
    WORKFLOW_STATE_KEYS.centralKitchenCorrectionRequests,
    [],
  );
  const [backupPlans, setBackupPlans] = usePersistedWorkflowState<BackupFoodPlanLine[]>(
    WORKFLOW_STATE_KEYS.centralKitchenBackupPlans,
    [],
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [menuSearch, setMenuSearch] = useState('');
  const [workingEstimate, setWorkingEstimate] = useState<DirectorEstimateRecord | null>(null);
  const [isEditingEstimate, setIsEditingEstimate] = useState(false);
  const [correctionReason, setCorrectionReason] = useState(DEFAULT_CORRECTION_REASON);
  const [correctionNotes, setCorrectionNotes] = useState('');

  const selectedDateKey = getDirectorEstimateDateKey(selectedDate);

  const eventPlans = useMemo(
    () =>
      buildDirectorPlanningEvents({
        bookings,
        selectedDate,
        dishes,
        recipes,
        menuPackages,
        units,
      }),
    [bookings, selectedDate, dishes, recipes, menuPackages, units],
  );

  useEffect(() => {
    if (eventPlans.length === 0) {
      setSelectedEventId('');
      setSelectedLineId('');
      setWorkingEstimate(null);
      setIsEditingEstimate(false);
      return;
    }

    if (!eventPlans.some((event) => event.bookingId === selectedEventId)) {
      setSelectedEventId(eventPlans[0].bookingId);
    }
  }, [eventPlans, selectedEventId]);

  const selectedEvent = useMemo(
    () => eventPlans.find((event) => event.bookingId === selectedEventId),
    [eventPlans, selectedEventId],
  );

  const bookingsById = useMemo(
    () => new Map(bookings.map((booking) => [booking.id, booking])),
    [bookings],
  );

  const selectedBooking = selectedEvent ? bookingsById.get(selectedEvent.bookingId) : undefined;
  const selectedFoodSupplyLines = useMemo(
    () => getFoodSupplyLinesForBooking(selectedBooking),
    [selectedBooking],
  );
  const selectedMenuSignature = selectedEvent ? getMenuSignature(selectedEvent) : '';
  const selectedFoodSuppliesSignature = getFoodSuppliesSignature(selectedFoodSupplyLines);

  const selectedSavedEstimate = useMemo(
    () =>
      selectedEvent
        ? savedEstimates.find(
            (record) =>
              record.bookingId === selectedEvent.bookingId &&
              record.dateKey === getDirectorEstimateDateKey(selectedEvent.eventDate),
          )
        : undefined,
    [savedEstimates, selectedEvent],
  );

  useEffect(() => {
    if (!selectedEvent) {
      setWorkingEstimate(null);
      setSelectedLineId('');
      setIsEditingEstimate(false);
      return;
    }

    setWorkingEstimate(buildWorkingEstimate(selectedEvent, selectedSavedEstimate));
    setSelectedLineId(selectedEvent.lines[0]?.lineId ?? '');
    setIsEditingEstimate(!selectedSavedEstimate?.savedAt);
    setCorrectionReason(DEFAULT_CORRECTION_REASON);
    setCorrectionNotes('');
  }, [selectedEvent, selectedSavedEstimate]);

  const computedLines = useMemo(
    () => getComputedLines(selectedEvent, workingEstimate),
    [selectedEvent, workingEstimate],
  );

  const normalizedMenuSearch = menuSearch.trim().toLowerCase();

  const groupedLines = useMemo(() => {
    const groups = new Map<string, ComputedPlanningLine[]>();

    computedLines.forEach((line) => {
      const current = groups.get(line.section) ?? [];
      current.push(line);
      groups.set(line.section, current);
    });

    return groups;
  }, [computedLines]);

  const selectedLine = computedLines.find((line) => line.lineId === selectedLineId) ?? computedLines[0];
  const isApproved = workingEstimate?.status === 'approved';
  const estimateLocked = !isEditingEstimate;

  const requestsForDate = useMemo(
    () =>
      correctionRequests
        .filter((request) => request.dateKey === selectedDateKey)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [correctionRequests, selectedDateKey],
  );

  const selectedEventRequests = useMemo(
    () => requestsForDate.filter((request) => request.bookingId === selectedEvent?.bookingId),
    [requestsForDate, selectedEvent?.bookingId],
  );

  const unresolvedSelectedRequestCount = selectedEventRequests.filter(
    (request) => request.status !== 'resolved',
  ).length;

  const selectedBackupLines = useMemo(
    () => backupPlans.filter((line) => line.bookingId === selectedEvent?.bookingId),
    [backupPlans, selectedEvent?.bookingId],
  );

  const menuSummary = useMemo(() => {
    const totalFoodCost = computedLines.reduce((sum, line) => sum + line.totalFoodCost, 0);
    const totalSoldAllocation = computedLines.reduce((sum, line) => sum + line.sellingPriceAllocation, 0);
    const foodCostPercent = totalSoldAllocation > 0 ? (totalFoodCost / totalSoldAllocation) * 100 : 0;
    const warningLines = computedLines.filter((line) => line.alerts.length > 0).length;

    return {
      totalFoodCost,
      totalSoldAllocation,
      foodCostPercent,
      warningLines,
    };
  }, [computedLines]);

  const foodSuppliesSummary = useMemo(() => {
    const totalFoodCost = selectedFoodSupplyLines.reduce((sum, line) => sum + line.totalFoodCost, 0);
    return { totalFoodCost };
  }, [selectedFoodSupplyLines]);

  const backupSummary = useMemo(() => {
    const totalFoodCost = selectedBackupLines.reduce(
      (sum, line) => sum + getBackupComputation(line, selectedEvent?.pax ?? 0).totalFoodCost,
      0,
    );

    return { totalFoodCost };
  }, [selectedBackupLines, selectedEvent?.pax]);

  const totalSelectedFoodCost = menuSummary.totalFoodCost + foodSuppliesSummary.totalFoodCost + backupSummary.totalFoodCost;
  const selectedFoodCostPerPax = selectedEvent?.pax ? totalSelectedFoodCost / selectedEvent.pax : 0;

  const eventStatusRows = useMemo(() => {
    return eventPlans.map((event) => {
      const savedEstimate = savedEstimates.find(
        (record) =>
          record.bookingId === event.bookingId &&
          record.dateKey === getDirectorEstimateDateKey(event.eventDate),
      );
      const lineWarnings = getComputedLines(event, buildWorkingEstimate(event, savedEstimate)).filter(
        (line) => line.alerts.length > 0,
      ).length;
      const openCorrections = correctionRequests.filter(
        (request) => request.bookingId === event.bookingId && request.status !== 'resolved',
      ).length;
      const booking = bookingsById.get(event.bookingId);
      const foodSupplyLines = getFoodSupplyLinesForBooking(booking);
      const menuChanged = Boolean(savedEstimate?.menuSignature && savedEstimate.menuSignature !== getMenuSignature(event));
      const foodSuppliesChanged = Boolean(
        savedEstimate?.foodSuppliesSignature &&
        savedEstimate.foodSuppliesSignature !== getFoodSuppliesSignature(foodSupplyLines),
      );

      return {
        status: getEventStatus(savedEstimate),
        meal: getMealPeriod(event),
        exceptions: event.issues.length + lineWarnings + openCorrections + (menuChanged ? 1 : 0) + (foodSuppliesChanged ? 1 : 0),
      };
    });
  }, [bookingsById, correctionRequests, eventPlans, savedEstimates]);

  const dashboardStats = useMemo(() => {
    const confirmedEvents = eventStatusRows.length;
    const estimatedEvents = eventStatusRows.filter((row) => row.status !== 'pending').length;

    return {
      confirmedEvents,
      estimatedEvents,
      pendingEvents: confirmedEvents - estimatedEvents,
      exceptionEvents: eventStatusRows.filter((row) => row.exceptions > 0).length,
      lunchEvents: eventStatusRows.filter((row) => row.meal === 'Lunch').length,
      dinnerEvents: eventStatusRows.filter((row) => row.meal === 'Dinner').length,
    };
  }, [eventStatusRows]);

  const currentEventStatus = getEventStatus(selectedSavedEstimate);
  const selectedMeal = selectedEvent ? getMealPeriod(selectedEvent) : 'Dinner';
  const guestCountChanged =
    Boolean(selectedEvent && selectedSavedEstimate?.guestCountSnapshot !== undefined) &&
    selectedSavedEstimate?.guestCountSnapshot !== selectedEvent?.pax;
  const menuChangedAfterSave = Boolean(
    selectedSavedEstimate?.menuSignature &&
      selectedSavedEstimate.menuSignature !== selectedMenuSignature,
  );
  const foodSuppliesChangedAfterSave = Boolean(
    selectedSavedEstimate?.foodSuppliesSignature &&
      selectedSavedEstimate.foodSuppliesSignature !== selectedFoodSuppliesSignature,
  );

  const notifications = useMemo(() => {
    const entries: Array<{ title: string; detail: string; tone: 'amber' | 'rose' | 'blue' | 'slate' }> = [];

    if (!selectedEvent) {
      return entries;
    }

    if (guestCountChanged) {
      entries.push({
        title: 'Guest count updated automatically',
        detail: `Front Office pax changed from ${formatNumberPK(selectedSavedEstimate?.guestCountSnapshot ?? 0)} to ${formatNumberPK(selectedEvent.pax)}. Quantities recalculated with saved factors.`,
        tone: 'blue',
      });
    }

    if (menuChangedAfterSave) {
      entries.push({
        title: 'Sold menu changed after kitchen estimation',
        detail: 'Reservation / Front Office changed the sold menu. Review the full menu and save a revised estimate.',
        tone: 'rose',
      });
    }

    if (foodSuppliesChangedAfterSave) {
      entries.push({
        title: 'Food supplies changed after kitchen estimation',
        detail: 'Food supply production items changed. Kitchen production list has been refreshed.',
        tone: 'amber',
      });
    }

    selectedEvent.issues.forEach((issue) => {
      entries.push({ title: 'Event setup issue', detail: issue, tone: 'rose' });
    });

    computedLines.forEach((line) => {
      line.alerts.forEach((alert) => {
        entries.push({ title: line.menuItemName, detail: alert, tone: 'amber' });
      });
    });

    selectedEventRequests
      .filter((request) => request.status !== 'resolved')
      .forEach((request) => {
        entries.push({
          title: request.menuItemName || 'Event level correction',
          detail: `${request.reason}${request.notes ? `: ${request.notes}` : ''}`,
          tone: 'slate',
        });
      });

    return entries;
  }, [
    computedLines,
    foodSuppliesChangedAfterSave,
    guestCountChanged,
    menuChangedAfterSave,
    selectedEvent,
    selectedEventRequests,
    selectedSavedEstimate?.guestCountSnapshot,
  ]);

  const stationGroups = useMemo(() => {
    const groups = new Map<string, Array<{ itemName: string; quantity: number; unit: string; source: string }>>();

    computedLines.forEach((line) => {
      const current = groups.get(line.section) ?? [];
      current.push({
        itemName: line.menuItemName,
        quantity: line.finalProductionQuantity,
        unit: line.unitOfMeasure,
        source: 'Sold menu',
      });
      groups.set(line.section, current);
    });

    selectedBackupLines.forEach((line) => {
      const current = groups.get('Backup Food') ?? [];
      const computed = getBackupComputation(line, selectedEvent?.pax ?? 0);
      current.push({
        itemName: line.itemName || 'Backup item',
        quantity: computed.finalQuantity,
        unit: line.unitOfMeasure,
        source: line.reason,
      });
      groups.set('Backup Food', current);
    });

    selectedFoodSupplyLines.forEach((line) => {
      const current = groups.get('Food Supplies') ?? [];
      current.push({
        itemName: line.itemName,
        quantity: line.quantity,
        unit: line.unitOfMeasure,
        source: 'Reservation food supplies',
      });
      groups.set('Food Supplies', current);
    });

    return groups;
  }, [computedLines, selectedBackupLines, selectedEvent?.pax, selectedFoodSupplyLines]);

  const moveDate = (days: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + days);
    setSelectedDate(nextDate);
  };

  const updateLineDraft = (
    lineId: string,
    updater: (line: DirectorEstimateLineDraft) => DirectorEstimateLineDraft,
  ) => {
    setWorkingEstimate((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        status: 'draft',
        approvedAt: undefined,
        approvedBy: undefined,
        lines: current.lines.map((line) => (line.lineId === lineId ? updater(line) : line)),
      };
    });
  };

  const handleEditEstimate = () => {
    if (!selectedEvent || !workingEstimate) {
      return;
    }

    setWorkingEstimate({
      ...workingEstimate,
      status: 'draft',
      approvedAt: undefined,
      approvedBy: undefined,
    });
    setIsEditingEstimate(true);
  };

  const persistEstimate = (status: DirectorEstimateRecord['status']) => {
    if (!selectedEvent || !workingEstimate) {
      toast.error('There is no active estimate to save.');
      return;
    }

    if (status === 'approved' && selectedEvent.issues.length > 0) {
      toast.error('Resolve the event setup issue before approval.');
      return;
    }

    if (status === 'approved' && unresolvedSelectedRequestCount > 0) {
      toast.error('Menu correction requests are still pending.');
      return;
    }

    const now = new Date();
    const nextRecord: DirectorEstimateRecord = {
      ...workingEstimate,
      status,
      guestCountSnapshot: selectedEvent.pax,
      menuSignature: selectedMenuSignature,
      foodSuppliesSignature: selectedFoodSuppliesSignature,
      savedAt: now,
      approvedAt: status === 'approved' ? now : undefined,
      approvedBy: status === 'approved' ? userName : undefined,
    };

    setSavedEstimates((current) => upsertEstimateRecord(current, nextRecord));
    setWorkingEstimate(nextRecord);
    setIsEditingEstimate(false);

    toast.success(status === 'approved' ? 'Event estimation approved.' : 'Estimate saved successfully.');
  };

  const handleUndoProcessing = () => {
    if (!selectedEvent || !selectedSavedEstimate) {
      return;
    }

    const nextRecord: DirectorEstimateRecord = {
      ...selectedSavedEstimate,
      status: 'draft',
      approvedAt: undefined,
      approvedBy: undefined,
      savedAt: new Date(),
    };

    setSavedEstimates((current) => upsertEstimateRecord(current, nextRecord));
    setWorkingEstimate(buildWorkingEstimate(selectedEvent, nextRecord));
    setIsEditingEstimate(false);
    toast.success('Kitchen processing undone. Front Office can now revise the menu.');
  };

  const handleRaiseCorrectionRequest = (line?: ComputedPlanningLine) => {
    if (!selectedEvent) {
      toast.error('Select a confirmed event first.');
      return;
    }

    const requestLine = line ?? selectedLine;
    const nextRequest: MenuCorrectionRequest = {
      id: `mcr-${selectedEvent.bookingId}-${Date.now()}`,
      bookingId: selectedEvent.bookingId,
      dateKey: selectedDateKey,
      reservationNumber: selectedEvent.reservationNumber,
      eventLabel: `${selectedEvent.customerName} / ${selectedEvent.eventType}`,
      lineId: requestLine?.lineId,
      menuItemName: requestLine?.menuItemName,
      reason: correctionReason,
      notes: correctionNotes.trim(),
      status: 'sent',
      requestedBy: userName,
      createdAt: new Date(),
    };

    setCorrectionRequests((current) => [nextRequest, ...current]);
    setCorrectionReason(DEFAULT_CORRECTION_REASON);
    setCorrectionNotes('');
    toast.success('Menu correction request raised for Reservation / Front Office.');
  };

  const resolveCorrectionRequest = (requestId: string) => {
    setCorrectionRequests((current) =>
      current.map((request) =>
        request.id === requestId ? { ...request, status: 'resolved' } : request,
      ),
    );
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const addBackupLine = () => {
    if (!selectedEvent) {
      toast.error('Select a confirmed event first.');
      return;
    }

    const nextLine: BackupFoodPlanLine = {
      id: `backup-${selectedEvent.bookingId}-${Date.now()}`,
      bookingId: selectedEvent.bookingId,
      dateKey: selectedDateKey,
      itemName: '',
      reason: BACKUP_REASONS[0],
      estimateFactor: 0,
      wastagePercent: 10,
      unitOfMeasure: 'kg',
      costPerUnit: 0,
      notes: '',
      createdBy: userName,
      createdAt: new Date(),
    };

    setBackupPlans((current) => [...current, nextLine]);
  };

  const updateBackupLine = (
    lineId: string,
    updater: (line: BackupFoodPlanLine) => BackupFoodPlanLine,
  ) => {
    setBackupPlans((current) => current.map((line) => (line.id === lineId ? updater(line) : line)));
  };

  const removeBackupLine = (lineId: string) => {
    setBackupPlans((current) => current.filter((line) => line.id !== lineId));
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <h2 className="mr-2 text-base font-semibold text-slate-900">F&amp;B Director Planning</h2>
          <Button variant="ghost" size="sm" onClick={() => moveDate(-1)} title="Previous date">
            <ChevronLeft className="size-4" />
          </Button>
          <div className="min-w-[210px] text-center text-sm font-semibold text-slate-900">
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
          <Button variant="ghost" size="sm" onClick={() => moveDate(1)} title="Next date">
            <ChevronRight className="size-4" />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setSelectedDate(new Date())}>
            Today
          </Button>
          <select
            value={selectedEventId}
            onChange={(event) => setSelectedEventId(event.target.value)}
            className="h-9 min-w-[340px] flex-1 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            <option value="">{eventPlans.length ? 'Select confirmed event' : 'No confirmed events found'}</option>
            {eventPlans.map((event) => (
              <option key={event.bookingId} value={event.bookingId}>
                {event.customerName} | {event.eventTime} | {event.packageName}
              </option>
            ))}
          </select>
          <div className="relative min-w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={menuSearch}
              onChange={(event) => setMenuSearch(event.target.value)}
              placeholder="Highlight menu item or station"
              className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span><strong className="text-slate-900">Confirmed Events:</strong> {dashboardStats.confirmedEvents}</span>
            <span><strong className="text-slate-900">Estimated:</strong> {dashboardStats.estimatedEvents}</span>
            <span><strong className="text-slate-900">Pending:</strong> {dashboardStats.pendingEvents}</span>
            <span><strong className="text-slate-900">Exceptions:</strong> {dashboardStats.exceptionEvents}</span>
            <span><strong className="text-slate-900">Lunch Events:</strong> {dashboardStats.lunchEvents}</span>
            <span><strong className="text-slate-900">Dinner Events:</strong> {dashboardStats.dinnerEvents}</span>
            <span><strong className="text-slate-900">User:</strong> {userName}</span>
          </div>
        </div>

        {selectedEvent ? (
          <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span><strong className="text-slate-900">Customer:</strong> {selectedEvent.customerName}</span>
              <span><strong className="text-slate-900">Date:</strong> {formatDatePK(selectedEvent.eventDate)}</span>
              <span><strong className="text-slate-900">Time:</strong> {selectedEvent.eventTime}</span>
              <span><strong className="text-slate-900">Meal:</strong> {selectedMeal}</span>
              <span><strong className="text-slate-900">Event Type:</strong> {selectedEvent.eventType}</span>
              <span><strong className="text-slate-900">Pax:</strong> {formatNumberPK(selectedEvent.pax)}</span>
              <span><strong className="text-slate-900">Package:</strong> {selectedEvent.packageName}</span>
              <span><strong className="text-slate-900">Status:</strong> {getStatusBadge(isEditingEstimate ? 'draft' : currentEventStatus)}</span>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1 border-t border-slate-200 px-4 py-2">
          {isEditingEstimate ? (
            <Button size="sm" onClick={() => persistEstimate('draft')} disabled={!workingEstimate}>
              <Save className="mr-2 size-4" />
              Save Estimate
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={handleEditEstimate} disabled={!workingEstimate || isApproved}>
              <Edit3 className="mr-2 size-4" />
              Edit Estimate
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => persistEstimate('approved')}
            disabled={!workingEstimate || isEditingEstimate || isApproved}
          >
            <ShieldCheck className="mr-2 size-4" />
            Approve Event Estimation
          </Button>
          {isApproved ? (
            <Button size="sm" variant="secondary" onClick={handleUndoProcessing}>
              <RotateCcw className="mr-2 size-4" />
              Undo Processing
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" onClick={() => handleRaiseCorrectionRequest()} disabled={!selectedEvent}>
            <FileWarning className="mr-2 size-4" />
            Raise Correction Request
          </Button>
          <Button size="sm" variant="secondary" onClick={addBackupLine} disabled={!selectedEvent || estimateLocked}>
            <Plus className="mr-2 size-4" />
            Add Backup Food
          </Button>
          <Button size="sm" variant="secondary" onClick={handlePrint} disabled={!selectedEvent}>
            <Printer className="mr-2 size-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        {eventPlans.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-300 bg-white px-6 text-center">
            <div>
              <CalendarDays className="mx-auto mb-3 size-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No confirmed events found</p>
              <p className="mt-1 text-xs text-slate-500">Confirmed reservations will appear here for estimation.</p>
            </div>
          </div>
        ) : (
          <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_220px] gap-4">
              <CompactSection
                title="Full Menu Estimation Register"
                action={
                  <span className="text-xs text-slate-500">
                    {computedLines.length} sold menu rows / {selectedFoodSupplyLines.length} food supply rows
                  </span>
                }
              >
                <div className="h-[calc(100%-41px)] overflow-auto">
                  <table className="w-full min-w-[1120px]">
                    <thead className="sticky top-0 z-10 bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Menu Item</th>
                        <th className={`${tableHeadClass} text-right`}>Pax</th>
                        <th className={`${tableHeadClass} text-right`}>Factor</th>
                        <th className={`${tableHeadClass} text-right`}>UOM</th>
                        <th className={`${tableHeadClass} text-right`}>Est. Qty</th>
                        <th className={`${tableHeadClass} text-right`}>Waste %</th>
                        <th className={`${tableHeadClass} text-right`}>Final Qty</th>
                        <th className={`${tableHeadClass} text-right`}>Food Cost</th>
                        <th className={`${tableHeadClass} text-right`}>Cost / Pax</th>
                        <th className={`${tableHeadClass} text-right`}>Food Cost %</th>
                        <th className={tableHeadClass}>Planning Notes</th>
                        <th className={`${tableHeadClass} text-right`}>Request</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(groupedLines.entries()).map(([section, lines]) => (
                        <Fragment key={section}>
                          <tr>
                            <td colSpan={12} className="border-t border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                              {section} Full Production List
                            </td>
                          </tr>
                          {lines.map((line) => {
                            const selected = selectedLine?.lineId === line.lineId;
                            const searchMatch = isLineSearchMatch(line, normalizedMenuSearch);
                            return (
                              <tr
                                key={line.lineId}
                                onClick={() => setSelectedLineId(line.lineId)}
                                className={`cursor-pointer border-t border-slate-200 ${
                                  selected
                                    ? 'bg-blue-50/70'
                                    : searchMatch
                                      ? 'bg-amber-50'
                                      : 'hover:bg-slate-50'
                                }`}
                              >
                                <td className={tableCellClass}>
                                  <div className="font-medium text-slate-900">{line.menuItemName}</div>
                                  <div className="text-xs text-slate-500">{line.preparationArea}</div>
                                </td>
                                <td className={`${tableCellClass} text-right`}>{formatNumberPK(line.pax)}</td>
                                <td className={tableCellClass}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={line.estimateFactor}
                                    disabled={estimateLocked}
                                    onChange={(event) =>
                                      updateLineDraft(line.lineId, (draft) => ({
                                        ...draft,
                                        estimateFactor: toPositiveNumber(event.target.value, draft.estimateFactor),
                                      }))
                                    }
                                    className={`${numberInputClass} w-20`}
                                  />
                                </td>
                                <td className={`${tableCellClass} text-right`}>{line.unitOfMeasure}</td>
                                <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                                  {formatNumberPK(line.requiredQuantity, { maximumFractionDigits: 2 })}
                                </td>
                                <td className={tableCellClass}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={line.wastagePercent}
                                    disabled={estimateLocked}
                                    onChange={(event) =>
                                      updateLineDraft(line.lineId, (draft) => ({
                                        ...draft,
                                        wastagePercent: toPositiveNumber(event.target.value, draft.wastagePercent),
                                      }))
                                    }
                                    className={`${numberInputClass} w-16`}
                                  />
                                </td>
                                <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                                  {formatNumberPK(line.finalProductionQuantity, { maximumFractionDigits: 2 })}
                                </td>
                                <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                                  {formatCurrencyPKR(line.totalFoodCost)}
                                </td>
                                <td className={`${tableCellClass} text-right`}>
                                  {formatCurrencyPKR(line.foodCostPerPax)}
                                </td>
                                <td className={`${tableCellClass} text-right`}>
                                  {formatNumberPK(line.foodCostPercent, { maximumFractionDigits: 1 })}%
                                </td>
                                <td className={tableCellClass}>
                                  <input
                                    value={line.notes || ''}
                                    disabled={estimateLocked}
                                    onChange={(event) =>
                                      updateLineDraft(line.lineId, (draft) => ({
                                        ...draft,
                                        notes: event.target.value,
                                      }))
                                    }
                                    className={`${inputClass} w-44`}
                                    placeholder="Planning note"
                                  />
                                </td>
                                <td className={`${tableCellClass} text-right`}>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title="Raise correction request"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedLineId(line.lineId);
                                      handleRaiseCorrectionRequest(line);
                                    }}
                                  >
                                    <FileWarning className="size-4 text-slate-600" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      ))}
                      {selectedFoodSupplyLines.length > 0 ? (
                        <Fragment>
                          <tr>
                            <td colSpan={12} className="border-t border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Food Supplies Production Items
                            </td>
                          </tr>
                          {selectedFoodSupplyLines.map((line) => {
                            const searchMatch = isFoodSupplySearchMatch(line, normalizedMenuSearch);
                            return (
                              <tr
                                key={line.lineId}
                                className={`border-t border-slate-200 ${searchMatch ? 'bg-amber-50' : 'hover:bg-slate-50'}`}
                              >
                                <td className={tableCellClass}>
                                  <div className="font-medium text-slate-900">{line.itemName}</div>
                                  <div className="text-xs text-slate-500">Food Supplies / Production only</div>
                                </td>
                                <td className={`${tableCellClass} text-right`}>-</td>
                                <td className={`${tableCellClass} text-right text-slate-500`}>Direct</td>
                                <td className={`${tableCellClass} text-right`}>{line.unitOfMeasure}</td>
                                <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                                  {formatNumberPK(line.quantity, { maximumFractionDigits: 2 })}
                                </td>
                                <td className={`${tableCellClass} text-right text-slate-500`}>-</td>
                                <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                                  {formatNumberPK(line.quantity, { maximumFractionDigits: 2 })}
                                </td>
                                <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                                  {formatCurrencyPKR(line.totalFoodCost)}
                                </td>
                                <td className={`${tableCellClass} text-right`}>
                                  {selectedEvent?.pax ? formatCurrencyPKR(line.totalFoodCost / selectedEvent.pax) : 'Rs. 0'}
                                </td>
                                <td className={`${tableCellClass} text-right text-slate-500`}>-</td>
                                <td className={`${tableCellClass} text-slate-500`}>No estimation required</td>
                                <td className={`${tableCellClass} text-right`}>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title="Raise correction request"
                                    onClick={() => handleRaiseCorrectionRequest()}
                                  >
                                    <FileWarning className="size-4 text-slate-600" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      ) : null}
                      {computedLines.length === 0 && selectedFoodSupplyLines.length === 0 ? (
                        <tr>
                          <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={12}>
                            No sold package menu lines are available for this event.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CompactSection>

              <CompactSection
                title="Backup Food Planning"
                action={<span className="text-xs text-slate-500">Not part of sold menu</span>}
              >
                <div className="h-[calc(100%-41px)] overflow-auto">
                  <table className="w-full min-w-[880px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Item</th>
                        <th className={tableHeadClass}>Reason</th>
                        <th className={`${tableHeadClass} text-right`}>Factor</th>
                        <th className={`${tableHeadClass} text-right`}>UOM</th>
                        <th className={`${tableHeadClass} text-right`}>Est. Qty</th>
                        <th className={`${tableHeadClass} text-right`}>Waste %</th>
                        <th className={`${tableHeadClass} text-right`}>Final Qty</th>
                        <th className={`${tableHeadClass} text-right`}>Cost / Unit</th>
                        <th className={`${tableHeadClass} text-right`}>Food Cost</th>
                        <th className={`${tableHeadClass} text-right`}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBackupLines.map((line) => {
                        const computed = getBackupComputation(line, selectedEvent?.pax ?? 0);
                        return (
                          <tr key={line.id} className="border-t border-slate-200">
                            <td className={tableCellClass}>
                              <input
                                value={line.itemName}
                                disabled={estimateLocked}
                                onChange={(event) =>
                                  updateBackupLine(line.id, (current) => ({ ...current, itemName: event.target.value }))
                                }
                                className={`${inputClass} w-44`}
                                placeholder="Backup item"
                              />
                            </td>
                            <td className={tableCellClass}>
                              <select
                                value={line.reason}
                                disabled={estimateLocked}
                                onChange={(event) =>
                                  updateBackupLine(line.id, (current) => ({ ...current, reason: event.target.value }))
                                }
                                className={`${inputClass} w-40`}
                              >
                                {BACKUP_REASONS.map((reason) => (
                                  <option key={reason} value={reason}>{reason}</option>
                                ))}
                              </select>
                            </td>
                            <td className={tableCellClass}>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.estimateFactor}
                                disabled={estimateLocked}
                                onChange={(event) =>
                                  updateBackupLine(line.id, (current) => ({
                                    ...current,
                                    estimateFactor: toPositiveNumber(event.target.value, current.estimateFactor),
                                  }))
                                }
                                className={`${numberInputClass} w-20`}
                              />
                            </td>
                            <td className={tableCellClass}>
                              <input
                                value={line.unitOfMeasure}
                                disabled={estimateLocked}
                                onChange={(event) =>
                                  updateBackupLine(line.id, (current) => ({ ...current, unitOfMeasure: event.target.value }))
                                }
                                className={`${inputClass} w-16 text-right`}
                              />
                            </td>
                            <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                              {formatNumberPK(computed.estimatedQuantity, { maximumFractionDigits: 2 })}
                            </td>
                            <td className={tableCellClass}>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={line.wastagePercent}
                                disabled={estimateLocked}
                                onChange={(event) =>
                                  updateBackupLine(line.id, (current) => ({
                                    ...current,
                                    wastagePercent: toPositiveNumber(event.target.value, current.wastagePercent),
                                  }))
                                }
                                className={`${numberInputClass} w-16`}
                              />
                            </td>
                            <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                              {formatNumberPK(computed.finalQuantity, { maximumFractionDigits: 2 })}
                            </td>
                            <td className={tableCellClass}>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={line.costPerUnit}
                                disabled={estimateLocked}
                                onChange={(event) =>
                                  updateBackupLine(line.id, (current) => ({
                                    ...current,
                                    costPerUnit: toPositiveNumber(event.target.value, current.costPerUnit),
                                  }))
                                }
                                className={`${numberInputClass} w-24`}
                              />
                            </td>
                            <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                              {formatCurrencyPKR(computed.totalFoodCost)}
                            </td>
                            <td className={`${tableCellClass} text-right`}>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Remove backup item"
                                disabled={estimateLocked}
                                onClick={() => removeBackupLine(line.id)}
                              >
                                <Trash2 className="size-4 text-rose-600" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {selectedBackupLines.length === 0 ? (
                        <tr>
                          <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={10}>
                            No backup food planned for this event.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CompactSection>
            </div>

            <div className="grid h-full grid-cols-1 gap-4 overflow-hidden">
              <CompactSection
                title="Notification Section"
                action={<Bell className="size-4 text-slate-400" />}
              >
                <div className="max-h-[310px] overflow-auto">
                  <div className="border-b border-slate-200 px-3 py-2 text-xs text-slate-600">
                    <div><strong className="text-slate-900">Menu Food Cost:</strong> {formatCurrencyPKR(menuSummary.totalFoodCost)}</div>
                    <div><strong className="text-slate-900">Food Supplies Cost:</strong> {formatCurrencyPKR(foodSuppliesSummary.totalFoodCost)}</div>
                    <div><strong className="text-slate-900">Backup Food Cost:</strong> {formatCurrencyPKR(backupSummary.totalFoodCost)}</div>
                    <div><strong className="text-slate-900">Total Food Cost:</strong> {formatCurrencyPKR(totalSelectedFoodCost)}</div>
                    <div><strong className="text-slate-900">Food Cost / Pax:</strong> {formatCurrencyPKR(selectedFoodCostPerPax)}</div>
                    <div><strong className="text-slate-900">Food Cost %:</strong> {formatNumberPK(menuSummary.foodCostPercent, { maximumFractionDigits: 1 })}%</div>
                  </div>
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-slate-200">
                      {notifications.map((notification, index) => {
                        const toneClass =
                          notification.tone === 'rose'
                            ? 'text-rose-700'
                            : notification.tone === 'amber'
                              ? 'text-amber-700'
                              : notification.tone === 'blue'
                                ? 'text-blue-700'
                                : 'text-slate-700';
                        return (
                          <div key={`${notification.title}-${index}`} className="px-3 py-2 text-sm">
                            <div className={`font-medium ${toneClass}`}>{notification.title}</div>
                            <div className="mt-0.5 text-xs text-slate-600">{notification.detail}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-3 py-8 text-center text-sm text-slate-500">
                      No warnings for the selected event.
                    </div>
                  )}

                  <div className="border-t border-slate-200 px-3 py-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <FileWarning className="size-3.5" />
                      Correction Request
                    </div>
                    <select
                      value={correctionReason}
                      onChange={(event) => setCorrectionReason(event.target.value)}
                      className={`${inputClass} w-full`}
                    >
                      {CORRECTION_REASONS.map((reason) => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                    <textarea
                      value={correctionNotes}
                      onChange={(event) => setCorrectionNotes(event.target.value)}
                      rows={2}
                      className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                      placeholder="Note for Reservation / Front Office"
                    />
                  </div>
                </div>
              </CompactSection>

              <CompactSection
                title="Kitchen Station Production"
                action={<Utensils className="size-4 text-slate-400" />}
              >
                <div className="overflow-auto">
                  {Array.from(stationGroups.entries()).map(([station, lines]) => (
                    <div key={station} className="border-b border-slate-200 last:border-b-0">
                      <div className="bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {station} Full Production List
                      </div>
                      <div className="divide-y divide-slate-100">
                        {lines.map((line, index) => (
                          <div key={`${station}-${line.itemName}-${index}`} className="grid grid-cols-[minmax(0,1fr)_90px] gap-2 px-3 py-2 text-sm">
                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-900">{line.itemName}</div>
                              <div className="truncate text-xs text-slate-500">{line.source}</div>
                            </div>
                            <div className="text-right font-medium text-slate-900">
                              {formatNumberPK(line.quantity, { maximumFractionDigits: 2 })} {line.unit}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CompactSection>

              <CompactSection
                title="Correction Requests"
                action={<AlertTriangle className="size-4 text-slate-400" />}
              >
                <div className="max-h-[220px] overflow-auto">
                  {selectedEventRequests.length > 0 ? (
                    <div className="divide-y divide-slate-200">
                      {selectedEventRequests.map((request) => (
                        <div key={request.id} className="px-3 py-2 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-900">
                                {request.menuItemName || 'Event level request'}
                              </div>
                              <div className="text-xs text-slate-500">{request.reason}</div>
                            </div>
                            {getStatusBadge(request.status)}
                          </div>
                          {request.notes ? <div className="mt-1 text-xs text-slate-600">{request.notes}</div> : null}
                          {request.status !== 'resolved' ? (
                            <button
                              type="button"
                              onClick={() => resolveCorrectionRequest(request.id)}
                              className="mt-2 text-xs font-medium text-blue-700 hover:text-blue-800"
                            >
                              Mark resolved
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-8 text-center text-sm text-slate-500">
                      No correction requests for this event.
                    </div>
                  )}
                </div>
              </CompactSection>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
