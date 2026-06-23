import { useMemo, useState } from "react";
import { Booking } from "@/app/components/calendar/types-v2";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  MessageSquareWarning,
  PhoneCall,
  Search,
  Trophy,
  UserRound,
} from "lucide-react";
import { formatDatePK, formatNumberPK } from "@/app/lib/locale";

interface ReservationReportsProps {
  bookings: Booking[];
}

type DateFilter = "all" | "month" | "30d" | "90d";
type ReportTab = "staff" | "follow-up" | "feedback" | "rcs" | "menu";

type StaffCallLog = {
  callerName?: string;
  outcome?: string;
  callDate?: Date | string;
};

type ReportBooking = Booking & {
  assignedSalesPerson?: string;
  assignedTo?: string;
  createdBy?: string;
  lastFollowUpBy?: string;
  callLogs?: StaffCallLog[];
};

interface StaffProductivityRow {
  staffName: string;
  totalReservations: number;
  thisMonthReservations: number;
  confirmedReservations: number;
  tentativeReservations: number;
  completedReservations: number;
  lostReservations: number;
  guestsHandled: number;
  followUpsLogged: number;
  paymentPromises: number;
  issueReports: number;
  feedbackPending: number;
  conversionRate: number;
  lastActivityDate?: Date;
}

interface FollowUpPerformanceRow {
  staffName: string;
  assignedReservations: number;
  followUpsLogged: number;
  answered: number;
  noAnswer: number;
  busy: number;
  callbacksScheduled: number;
  paymentPromises: number;
  uniqueCustomers: number;
  dueToday: number;
  overdueCallbacks: number;
  noContactRecords: number;
  productiveRate: number;
  lastFollowUpDate?: Date;
}

interface FeedbackComplaintRow {
  staffName: string;
  completedEvents: number;
  feedbackRecorded: number;
  feedbackPending: number;
  excellent: number;
  good: number;
  average: number;
  poor: number;
  issueReports: number;
  followUpRequired: number;
  recommendationNo: number;
  servicesReviewed: number;
  satisfactionRate: number;
  lastFeedbackDate?: Date;
}

interface FeedbackServiceIssueRow {
  serviceLabel: string;
  reviewed: number;
  issues: number;
  poorOrAverage: number;
}

const percentFormatter = new Intl.NumberFormat("en-PK", {
  maximumFractionDigits: 1,
});

const dateFilterOptions: Array<{ value: DateFilter; label: string }> = [
  { value: "all", label: "All Dates" },
  { value: "month", label: "This Month" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
];

const reportTabs: Array<{ id: ReportTab; label: string; enabled: boolean }> = [
  { id: "staff", label: "Staff Productivity", enabled: true },
  { id: "follow-up", label: "Follow-Up", enabled: true },
  { id: "feedback", label: "Feedback", enabled: true },
  { id: "rcs", label: "RCS Sales", enabled: false },
  { id: "menu", label: "Menu Focus", enabled: false },
];

const tableHeadClass = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600";
const tableCellClass = "px-3 py-2 text-sm text-slate-700 align-middle";

const toValidDate = (value: unknown) => {
  if (!value) return undefined;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const normalizeStaffName = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const getCallLogs = (booking: Booking) => {
  const logs = (booking as ReportBooking).callLogs;
  return Array.isArray(logs) ? logs : [];
};

const getLatestCallLog = (booking: Booking) =>
  [...getCallLogs(booking)].sort((left, right) => {
    const leftDate = toValidDate(left.callDate)?.getTime() ?? 0;
    const rightDate = toValidDate(right.callDate)?.getTime() ?? 0;
    return rightDate - leftDate;
  })[0];

const getBookingStaffName = (booking: Booking) => {
  const reportBooking = booking as ReportBooking;

  return (
    normalizeStaffName(reportBooking.assignedSalesPerson) ??
    normalizeStaffName(reportBooking.assignedTo) ??
    normalizeStaffName(reportBooking.lastFollowUpBy) ??
    normalizeStaffName(booking.agreementSignedBy) ??
    normalizeStaffName(booking.confirmationRequestedBy) ??
    normalizeStaffName(booking.releasedBy) ??
    normalizeStaffName(getLatestCallLog(booking)?.callerName) ??
    normalizeStaffName(reportBooking.createdBy) ??
    "Unassigned"
  );
};

const getBookingActivityDate = (booking: Booking) =>
  toValidDate(getLatestCallLog(booking)?.callDate) ??
  toValidDate(booking.agreementSignedAt) ??
  toValidDate(booking.releasedAt) ??
  toValidDate(booking.createdAt) ??
  toValidDate(booking.date);

const getIssueCount = (booking: Booking) => {
  const serviceIssues =
    booking.postEventFeedback?.serviceFeedback.filter((feedback) => feedback.issueReported).length ?? 0;
  return serviceIssues + (booking.postEventFeedback?.followUpRequired ? 1 : 0);
};

const isFeedbackPending = (booking: Booking) =>
  booking.status === "completed" && !booking.postEventFeedback?.recordedAt;

const isWithinDateFilter = (booking: Booking, filter: DateFilter) => {
  if (filter === "all") return true;

  const compareDate = getBookingActivityDate(booking);
  if (!compareDate) return false;

  const now = new Date();
  if (filter === "month") {
    return compareDate.getMonth() === now.getMonth() && compareDate.getFullYear() === now.getFullYear();
  }

  const days = filter === "30d" ? 30 : 90;
  const threshold = new Date();
  threshold.setHours(0, 0, 0, 0);
  threshold.setDate(threshold.getDate() - days);
  return compareDate >= threshold;
};

const isDateWithinFilter = (value: unknown, filter: DateFilter) => {
  if (filter === "all") return true;

  const compareDate = toValidDate(value);
  if (!compareDate) return false;

  const now = new Date();
  if (filter === "month") {
    return compareDate.getMonth() === now.getMonth() && compareDate.getFullYear() === now.getFullYear();
  }

  const days = filter === "30d" ? 30 : 90;
  const threshold = new Date();
  threshold.setHours(0, 0, 0, 0);
  threshold.setDate(threshold.getDate() - days);
  return compareDate >= threshold;
};

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const isOpenForFollowUp = (booking: Booking) =>
  booking.status !== "cancelled" && booking.status !== "expired" && booking.status !== "lost-space-taken";

const getFeedbackDate = (booking: Booking) =>
  toValidDate(booking.postEventFeedback?.recordedAt) ??
  toValidDate(booking.postEventFeedback?.updatedAt) ??
  toValidDate(booking.date);

const isWithinFeedbackDateFilter = (booking: Booking, filter: DateFilter) => {
  if (filter === "all") return true;
  return isDateWithinFilter(getFeedbackDate(booking), filter);
};

const createEmptyStaffRow = (staffName: string): StaffProductivityRow => ({
  staffName,
  totalReservations: 0,
  thisMonthReservations: 0,
  confirmedReservations: 0,
  tentativeReservations: 0,
  completedReservations: 0,
  lostReservations: 0,
  guestsHandled: 0,
  followUpsLogged: 0,
  paymentPromises: 0,
  issueReports: 0,
  feedbackPending: 0,
  conversionRate: 0,
});

const buildStaffProductivityRows = (bookings: Booking[]) => {
  const now = new Date();
  const rowsByStaff = new Map<string, StaffProductivityRow>();

  bookings.forEach((booking) => {
    const staffName = getBookingStaffName(booking);
    const row = rowsByStaff.get(staffName) ?? createEmptyStaffRow(staffName);
    const bookingCreatedAt = toValidDate(booking.createdAt) ?? toValidDate(booking.date);
    const callLogs = getCallLogs(booking);
    const activityDates = [
      bookingCreatedAt,
      toValidDate(getLatestCallLog(booking)?.callDate),
      toValidDate(booking.agreementSignedAt),
      toValidDate(booking.releasedAt),
    ].filter((date): date is Date => Boolean(date));

    row.totalReservations += 1;
    if (
      bookingCreatedAt &&
      bookingCreatedAt.getMonth() === now.getMonth() &&
      bookingCreatedAt.getFullYear() === now.getFullYear()
    ) {
      row.thisMonthReservations += 1;
    }

    if (booking.status === "confirmed" || booking.status === "completed") {
      row.confirmedReservations += 1;
      row.guestsHandled += booking.guestCount;
    }

    if (booking.status === "completed") row.completedReservations += 1;
    if (booking.status === "tentative") row.tentativeReservations += 1;
    if (booking.status === "cancelled" || booking.status === "expired" || booking.status === "lost-space-taken") {
      row.lostReservations += 1;
    }

    row.followUpsLogged += callLogs.length;
    row.paymentPromises += callLogs.filter((log) => log.outcome === "payment-promised").length;
    row.issueReports += getIssueCount(booking);
    row.feedbackPending += isFeedbackPending(booking) ? 1 : 0;

    const latestActivityDate = activityDates.sort((left, right) => right.getTime() - left.getTime())[0];
    if (
      latestActivityDate &&
      (!row.lastActivityDate || latestActivityDate.getTime() > row.lastActivityDate.getTime())
    ) {
      row.lastActivityDate = latestActivityDate;
    }

    rowsByStaff.set(staffName, row);
  });

  return Array.from(rowsByStaff.values())
    .map((row) => ({
      ...row,
      conversionRate: row.totalReservations > 0 ? (row.confirmedReservations / row.totalReservations) * 100 : 0,
    }))
    .sort((left, right) => {
      if (right.confirmedReservations !== left.confirmedReservations) {
        return right.confirmedReservations - left.confirmedReservations;
      }

      return right.totalReservations - left.totalReservations;
    });
};

const createEmptyFollowUpRow = (staffName: string): FollowUpPerformanceRow => ({
  staffName,
  assignedReservations: 0,
  followUpsLogged: 0,
  answered: 0,
  noAnswer: 0,
  busy: 0,
  callbacksScheduled: 0,
  paymentPromises: 0,
  uniqueCustomers: 0,
  dueToday: 0,
  overdueCallbacks: 0,
  noContactRecords: 0,
  productiveRate: 0,
});

const buildFollowUpPerformanceRows = (bookings: Booking[], filter: DateFilter) => {
  const rowsByStaff = new Map<string, FollowUpPerformanceRow>();
  const customerSetsByStaff = new Map<string, Set<string>>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ensureRow = (staffName: string) => {
    const existing = rowsByStaff.get(staffName);
    if (existing) return existing;

    const row = createEmptyFollowUpRow(staffName);
    rowsByStaff.set(staffName, row);
    customerSetsByStaff.set(staffName, new Set());
    return row;
  };

  bookings.forEach((booking) => {
    const ownerName = getBookingStaffName(booking);
    const ownerRow = ensureRow(ownerName);
    const callLogs = getCallLogs(booking);
    const callbackDate = toValidDate(booking.callbackDate);

    if (isWithinDateFilter(booking, filter)) {
      ownerRow.assignedReservations += 1;
      if (callLogs.length === 0) {
        ownerRow.noContactRecords += 1;
      }
    }

    if (callbackDate && isOpenForFollowUp(booking)) {
      if (isSameDay(callbackDate, today)) {
        ownerRow.dueToday += 1;
      } else if (callbackDate < today) {
        ownerRow.overdueCallbacks += 1;
      }
    }

    callLogs
      .filter((log) => isDateWithinFilter(log.callDate, filter))
      .forEach((log) => {
        const staffName = normalizeStaffName(log.callerName) ?? ownerName;
        const row = ensureRow(staffName);
        const customerSet = customerSetsByStaff.get(staffName) ?? new Set<string>();
        const logDate = toValidDate(log.callDate);

        row.followUpsLogged += 1;
        if (log.outcome === "answered") row.answered += 1;
        if (log.outcome === "no-answer") row.noAnswer += 1;
        if (log.outcome === "busy") row.busy += 1;
        if (log.outcome === "callback-scheduled") row.callbacksScheduled += 1;
        if (log.outcome === "payment-promised") row.paymentPromises += 1;

        customerSet.add(booking.customerId || booking.contactNumber || booking.customerName || booking.id);
        customerSetsByStaff.set(staffName, customerSet);

        if (logDate && (!row.lastFollowUpDate || logDate.getTime() > row.lastFollowUpDate.getTime())) {
          row.lastFollowUpDate = logDate;
        }
      });
  });

  return Array.from(rowsByStaff.values())
    .map((row) => {
      const productiveFollowUps = row.answered + row.callbacksScheduled + row.paymentPromises;
      return {
        ...row,
        uniqueCustomers: customerSetsByStaff.get(row.staffName)?.size ?? 0,
        productiveRate: row.followUpsLogged > 0 ? (productiveFollowUps / row.followUpsLogged) * 100 : 0,
      };
    })
    .sort((left, right) => {
      if (right.followUpsLogged !== left.followUpsLogged) {
        return right.followUpsLogged - left.followUpsLogged;
      }

      return right.overdueCallbacks - left.overdueCallbacks;
    });
};

const createEmptyFeedbackRow = (staffName: string): FeedbackComplaintRow => ({
  staffName,
  completedEvents: 0,
  feedbackRecorded: 0,
  feedbackPending: 0,
  excellent: 0,
  good: 0,
  average: 0,
  poor: 0,
  issueReports: 0,
  followUpRequired: 0,
  recommendationNo: 0,
  servicesReviewed: 0,
  satisfactionRate: 0,
});

const buildFeedbackComplaintRows = (bookings: Booking[], filter: DateFilter) => {
  const rowsByStaff = new Map<string, FeedbackComplaintRow>();

  bookings
    .filter((booking) => isWithinFeedbackDateFilter(booking, filter))
    .forEach((booking) => {
      const staffName = getBookingStaffName(booking);
      const row = rowsByStaff.get(staffName) ?? createEmptyFeedbackRow(staffName);
      const feedback = booking.postEventFeedback;
      const feedbackDate = getFeedbackDate(booking);

      if (booking.status === "completed") {
        row.completedEvents += 1;
      }

      if (!feedback?.recordedAt) {
        if (booking.status === "completed") {
          row.feedbackPending += 1;
        }
        rowsByStaff.set(staffName, row);
        return;
      }

      row.feedbackRecorded += 1;
      row.servicesReviewed += feedback.serviceFeedback.length;
      row.issueReports += getIssueCount(booking);
      row.followUpRequired += feedback.followUpRequired ? 1 : 0;
      row.recommendationNo += feedback.wouldRecommend === "No" ? 1 : 0;

      if (feedback.overallRating === "Excellent") row.excellent += 1;
      if (feedback.overallRating === "Good") row.good += 1;
      if (feedback.overallRating === "Average") row.average += 1;
      if (feedback.overallRating === "Poor") row.poor += 1;

      if (feedbackDate && (!row.lastFeedbackDate || feedbackDate.getTime() > row.lastFeedbackDate.getTime())) {
        row.lastFeedbackDate = feedbackDate;
      }

      rowsByStaff.set(staffName, row);
    });

  return Array.from(rowsByStaff.values())
    .map((row) => {
      const satisfied = row.excellent + row.good;
      return {
        ...row,
        satisfactionRate: row.feedbackRecorded > 0 ? (satisfied / row.feedbackRecorded) * 100 : 0,
      };
    })
    .sort((left, right) => {
      if (right.issueReports !== left.issueReports) {
        return right.issueReports - left.issueReports;
      }

      return right.feedbackRecorded - left.feedbackRecorded;
    });
};

const buildFeedbackServiceIssueRows = (bookings: Booking[], filter: DateFilter) => {
  const rowsByService = new Map<string, FeedbackServiceIssueRow>();

  bookings
    .filter((booking) => booking.postEventFeedback?.recordedAt && isWithinFeedbackDateFilter(booking, filter))
    .forEach((booking) => {
      booking.postEventFeedback?.serviceFeedback.forEach((serviceFeedback) => {
        const serviceLabel = serviceFeedback.serviceLabel || serviceFeedback.serviceKey;
        const row = rowsByService.get(serviceLabel) ?? {
          serviceLabel,
          reviewed: 0,
          issues: 0,
          poorOrAverage: 0,
        };

        row.reviewed += 1;
        row.issues += serviceFeedback.issueReported ? 1 : 0;
        row.poorOrAverage +=
          serviceFeedback.rating === "Poor" || serviceFeedback.rating === "Average" ? 1 : 0;

        rowsByService.set(serviceLabel, row);
      });
    });

  return Array.from(rowsByService.values())
    .sort((left, right) => {
      if (right.issues !== left.issues) {
        return right.issues - left.issues;
      }

      return right.poorOrAverage - left.poorOrAverage;
    })
    .slice(0, 7);
};

const getRowStatus = (row: StaffProductivityRow) => {
  if (row.staffName === "Unassigned") return { label: "review", className: "bg-amber-100 text-amber-700" };
  if (row.issueReports > 0 || row.feedbackPending > 0) return { label: "watch", className: "bg-rose-100 text-rose-700" };
  if (row.tentativeReservations > row.confirmedReservations) {
    return { label: "follow-up", className: "bg-blue-100 text-blue-700" };
  }
  return { label: "active", className: "bg-emerald-100 text-emerald-700" };
};

const getFeedbackRowStatus = (row: FeedbackComplaintRow) => {
  if (row.staffName === "Unassigned") return { label: "review", className: "bg-amber-100 text-amber-700" };
  if (row.issueReports > 0 || row.poor > 0) return { label: "complaint", className: "bg-rose-100 text-rose-700" };
  if (row.feedbackPending > 0) return { label: "pending", className: "bg-blue-100 text-blue-700" };
  if (row.feedbackRecorded === 0 && row.completedEvents > 0) {
    return { label: "no feedback", className: "bg-slate-100 text-slate-700" };
  }
  return { label: "clear", className: "bg-emerald-100 text-emerald-700" };
};

const getFollowUpRowStatus = (row: FollowUpPerformanceRow) => {
  if (row.staffName === "Unassigned") return { label: "review", className: "bg-amber-100 text-amber-700" };
  if (row.overdueCallbacks > 0) return { label: "overdue", className: "bg-rose-100 text-rose-700" };
  if (row.dueToday > 0) return { label: "today", className: "bg-blue-100 text-blue-700" };
  if (row.followUpsLogged === 0 && row.assignedReservations > 0) {
    return { label: "no contact", className: "bg-slate-100 text-slate-700" };
  }
  return { label: "active", className: "bg-emerald-100 text-emerald-700" };
};

const buildWatchReason = (row: StaffProductivityRow) => {
  if (row.staffName === "Unassigned") return "Assign owner to improve staff progress tracking";
  if (row.issueReports > 0) return "Customer issue or complaint needs attention";
  if (row.feedbackPending > 0) return "Completed event feedback is still pending";
  if (row.tentativeReservations > row.confirmedReservations) return "More tentative records than confirmed";
  return "Progress is steady";
};

const buildFollowUpWatchReason = (row: FollowUpPerformanceRow) => {
  if (row.staffName === "Unassigned") return "Follow-up ownership is missing";
  if (row.overdueCallbacks > 0) return "Callbacks are overdue";
  if (row.noContactRecords > 0) return "Assigned records still have no contact log";
  if (row.noAnswer > row.answered) return "No-answer calls are higher than answered calls";
  if (row.dueToday > 0) return "Callbacks are due today";
  return "Follow-up activity is steady";
};

const buildFeedbackWatchReason = (row: FeedbackComplaintRow) => {
  if (row.staffName === "Unassigned") return "Feedback ownership is missing";
  if (row.issueReports > 0) return "Customer complaint or service issue reported";
  if (row.poor > 0) return "Poor overall rating received";
  if (row.recommendationNo > 0) return "Customer would not recommend";
  if (row.feedbackPending > 0) return "Completed event feedback is pending";
  return "Feedback is positive";
};

export function ReservationReports({ bookings }: ReservationReportsProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>("30d");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeReport, setActiveReport] = useState<ReportTab>("staff");

  const filteredBookings = useMemo(
    () => bookings.filter((booking) => isWithinDateFilter(booking, dateFilter)),
    [bookings, dateFilter],
  );
  const staffProductivityRows = useMemo(() => buildStaffProductivityRows(filteredBookings), [filteredBookings]);
  const followUpPerformanceRows = useMemo(
    () => buildFollowUpPerformanceRows(bookings, dateFilter),
    [bookings, dateFilter],
  );
  const feedbackComplaintRows = useMemo(
    () => buildFeedbackComplaintRows(bookings, dateFilter),
    [bookings, dateFilter],
  );
  const feedbackServiceIssueRows = useMemo(
    () => buildFeedbackServiceIssueRows(bookings, dateFilter),
    [bookings, dateFilter],
  );
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleStaffRows = staffProductivityRows.filter((row) =>
    row.staffName.toLowerCase().includes(normalizedSearch),
  );
  const visibleFollowUpRows = followUpPerformanceRows.filter((row) =>
    row.staffName.toLowerCase().includes(normalizedSearch),
  );
  const visibleFeedbackRows = feedbackComplaintRows.filter((row) =>
    row.staffName.toLowerCase().includes(normalizedSearch),
  );
  const topStaff = staffProductivityRows.find((row) => row.staffName !== "Unassigned");

  const totals = staffProductivityRows.reduce(
    (summary, row) => ({
      staff: summary.staff + (row.staffName === "Unassigned" ? 0 : 1),
      reservations: summary.reservations + row.totalReservations,
      monthReservations: summary.monthReservations + row.thisMonthReservations,
      confirmed: summary.confirmed + row.confirmedReservations,
      tentative: summary.tentative + row.tentativeReservations,
      completed: summary.completed + row.completedReservations,
      lost: summary.lost + row.lostReservations,
      guests: summary.guests + row.guestsHandled,
      followUps: summary.followUps + row.followUpsLogged,
      paymentPromises: summary.paymentPromises + row.paymentPromises,
      issues: summary.issues + row.issueReports,
      feedbackPending: summary.feedbackPending + row.feedbackPending,
      unassigned: summary.unassigned + (row.staffName === "Unassigned" ? row.totalReservations : 0),
    }),
    {
      staff: 0,
      reservations: 0,
      monthReservations: 0,
      confirmed: 0,
      tentative: 0,
      completed: 0,
      lost: 0,
      guests: 0,
      followUps: 0,
      paymentPromises: 0,
      issues: 0,
      feedbackPending: 0,
      unassigned: 0,
    },
  );
  const averageConversion = totals.reservations > 0 ? (totals.confirmed / totals.reservations) * 100 : 0;
  const followUpTotals = followUpPerformanceRows.reduce(
    (summary, row) => ({
      staff: summary.staff + (row.staffName === "Unassigned" ? 0 : 1),
      assigned: summary.assigned + row.assignedReservations,
      followUps: summary.followUps + row.followUpsLogged,
      answered: summary.answered + row.answered,
      noAnswer: summary.noAnswer + row.noAnswer,
      busy: summary.busy + row.busy,
      callbacksScheduled: summary.callbacksScheduled + row.callbacksScheduled,
      paymentPromises: summary.paymentPromises + row.paymentPromises,
      dueToday: summary.dueToday + row.dueToday,
      overdue: summary.overdue + row.overdueCallbacks,
      noContact: summary.noContact + row.noContactRecords,
      uniqueCustomers: summary.uniqueCustomers + row.uniqueCustomers,
    }),
    {
      staff: 0,
      assigned: 0,
      followUps: 0,
      answered: 0,
      noAnswer: 0,
      busy: 0,
      callbacksScheduled: 0,
      paymentPromises: 0,
      dueToday: 0,
      overdue: 0,
      noContact: 0,
      uniqueCustomers: 0,
    },
  );
  const followUpProductiveRate =
    followUpTotals.followUps > 0
      ? ((followUpTotals.answered + followUpTotals.callbacksScheduled + followUpTotals.paymentPromises) /
          followUpTotals.followUps) *
        100
      : 0;
  const feedbackTotals = feedbackComplaintRows.reduce(
    (summary, row) => ({
      staff: summary.staff + (row.staffName === "Unassigned" ? 0 : 1),
      completed: summary.completed + row.completedEvents,
      recorded: summary.recorded + row.feedbackRecorded,
      pending: summary.pending + row.feedbackPending,
      excellent: summary.excellent + row.excellent,
      good: summary.good + row.good,
      average: summary.average + row.average,
      poor: summary.poor + row.poor,
      issues: summary.issues + row.issueReports,
      followUpRequired: summary.followUpRequired + row.followUpRequired,
      recommendationNo: summary.recommendationNo + row.recommendationNo,
      servicesReviewed: summary.servicesReviewed + row.servicesReviewed,
    }),
    {
      staff: 0,
      completed: 0,
      recorded: 0,
      pending: 0,
      excellent: 0,
      good: 0,
      average: 0,
      poor: 0,
      issues: 0,
      followUpRequired: 0,
      recommendationNo: 0,
      servicesReviewed: 0,
    },
  );
  const feedbackSatisfactionRate =
    feedbackTotals.recorded > 0
      ? ((feedbackTotals.excellent + feedbackTotals.good) / feedbackTotals.recorded) * 100
      : 0;
  const watchlistRows = [...staffProductivityRows]
    .sort((left, right) => {
      const leftScore = left.issueReports * 5 + left.feedbackPending * 3 + left.tentativeReservations + (left.staffName === "Unassigned" ? 10 : 0);
      const rightScore = right.issueReports * 5 + right.feedbackPending * 3 + right.tentativeReservations + (right.staffName === "Unassigned" ? 10 : 0);
      return rightScore - leftScore;
    })
    .slice(0, 5);
  const activityRows = [...staffProductivityRows]
    .sort((left, right) => right.followUpsLogged - left.followUpsLogged || right.confirmedReservations - left.confirmedReservations)
    .slice(0, 7);
  const followUpWatchlistRows = [...followUpPerformanceRows]
    .sort((left, right) => {
      const leftScore = left.overdueCallbacks * 5 + left.noContactRecords * 3 + left.noAnswer + (left.staffName === "Unassigned" ? 10 : 0);
      const rightScore = right.overdueCallbacks * 5 + right.noContactRecords * 3 + right.noAnswer + (right.staffName === "Unassigned" ? 10 : 0);
      return rightScore - leftScore;
    })
    .slice(0, 5);
  const followUpActivityRows = [...followUpPerformanceRows]
    .sort((left, right) => right.followUpsLogged - left.followUpsLogged || right.productiveRate - left.productiveRate)
    .slice(0, 7);
  const feedbackWatchlistRows = [...feedbackComplaintRows]
    .sort((left, right) => {
      const leftScore = left.issueReports * 5 + left.poor * 4 + left.recommendationNo * 3 + left.feedbackPending;
      const rightScore = right.issueReports * 5 + right.poor * 4 + right.recommendationNo * 3 + right.feedbackPending;
      return rightScore - leftScore;
    })
    .slice(0, 5);
  const metricItems =
    activeReport === "feedback"
      ? [
          { label: "Staff", value: feedbackTotals.staff },
          { label: "Completed", value: feedbackTotals.completed },
          { label: "Feedback", value: feedbackTotals.recorded },
          { label: "Pending", value: feedbackTotals.pending },
          { label: "Issues", value: feedbackTotals.issues },
          { label: "Poor", value: feedbackTotals.poor },
          { label: "Follow-up Req.", value: feedbackTotals.followUpRequired },
          { label: "No Recommend", value: feedbackTotals.recommendationNo },
        ]
      : activeReport === "follow-up"
      ? [
          { label: "Staff", value: followUpTotals.staff },
          { label: "Assigned", value: followUpTotals.assigned },
          { label: "Follow-ups", value: followUpTotals.followUps },
          { label: "Answered", value: followUpTotals.answered },
          { label: "No Answer", value: followUpTotals.noAnswer },
          { label: "Due Today", value: followUpTotals.dueToday },
          { label: "Overdue", value: followUpTotals.overdue },
          { label: "No Contact", value: followUpTotals.noContact },
        ]
      : [
          { label: "Staff", value: totals.staff },
          { label: "Reservations", value: totals.reservations },
          { label: "This Month", value: totals.monthReservations },
          { label: "Confirmed", value: totals.confirmed },
          { label: "Tentative", value: totals.tentative },
          { label: "Completed", value: totals.completed },
          { label: "Follow-ups", value: totals.followUps },
          { label: "Issues", value: totals.issues },
        ];

  return (
    <div className="flex h-full flex-col bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex min-h-[42px] flex-wrap items-center gap-2 px-4 py-2">
          <div className="mr-2 text-sm font-semibold text-slate-900">Reservation Reports</div>
          <select
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value as DateFilter)}
            className="h-8 min-w-[150px] rounded border border-slate-300 bg-white px-3 text-xs text-slate-700"
          >
            {dateFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="relative min-w-[280px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={
                activeReport === "follow-up"
                  ? "Search follow-up staff"
                  : activeReport === "feedback"
                    ? "Search feedback staff"
                    : "Search staff name"
              }
              className="h-8 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <Button variant="outline" className="h-8 border-slate-300 bg-white px-3 text-xs text-slate-700">
            <Download className="size-4" />
            Export
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 px-4 py-2 text-[11px] text-slate-700">
          {metricItems.map((item) => (
            <span key={item.label}>
              <strong className="text-slate-950">{item.label}:</strong> {formatNumberPK(item.value)}
            </span>
          ))}
          <span>
            <strong className="text-slate-950">
              {activeReport === "follow-up" ? "Productive:" : activeReport === "feedback" ? "Satisfied:" : "Conversion:"}
            </strong>{" "}
            {percentFormatter.format(
              activeReport === "follow-up"
                ? followUpProductiveRate
                : activeReport === "feedback"
                  ? feedbackSatisfactionRate
                  : averageConversion,
            )}
            %
          </span>
          <span>
            <strong className="text-slate-950">User:</strong> Front Office
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1 border-t border-slate-200 px-4 py-2">
          {reportTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={!tab.enabled}
              onClick={() => tab.enabled && setActiveReport(tab.id)}
              className={`h-8 rounded px-3 text-xs font-medium ${
                tab.id === activeReport
                  ? "bg-blue-600 text-white"
                  : !tab.enabled
                    ? "cursor-not-allowed text-slate-400"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        {activeReport === "staff" ? (
        <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2">
              <div className="mr-auto flex items-center gap-2">
                <UserRound className="size-4 text-blue-600" />
                <div className="text-sm font-semibold text-slate-900">Staff Booking Productivity</div>
              </div>
              <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                {formatNumberPK(visibleStaffRows.length)} rows
              </Badge>
              {topStaff ? (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  Top: {topStaff.staffName}
                </Badge>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-0 border-b border-slate-200 bg-slate-50 md:grid-cols-4 xl:grid-cols-6">
              <div className="border-r border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <ClipboardList className="size-3.5" />
                  Total
                </div>
                <div className="mt-1 text-xl font-semibold text-slate-900">{formatNumberPK(totals.reservations)}</div>
              </div>
              <div className="border-r border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <CheckCircle2 className="size-3.5" />
                  Confirmed
                </div>
                <div className="mt-1 text-xl font-semibold text-emerald-700">{formatNumberPK(totals.confirmed)}</div>
              </div>
              <div className="border-r border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <CalendarDays className="size-3.5" />
                  This Month
                </div>
                <div className="mt-1 text-xl font-semibold text-slate-900">{formatNumberPK(totals.monthReservations)}</div>
              </div>
              <div className="border-r border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <PhoneCall className="size-3.5" />
                  Follow-ups
                </div>
                <div className="mt-1 text-xl font-semibold text-blue-700">{formatNumberPK(totals.followUps)}</div>
              </div>
              <div className="border-r border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <Trophy className="size-3.5" />
                  Conversion
                </div>
                <div className="mt-1 text-xl font-semibold text-slate-900">{percentFormatter.format(averageConversion)}%</div>
              </div>
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <AlertTriangle className="size-3.5" />
                  Unassigned
                </div>
                <div className="mt-1 text-xl font-semibold text-amber-700">{formatNumberPK(totals.unassigned)}</div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[980px]">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className={tableHeadClass}>Staff</th>
                    <th className={`${tableHeadClass} text-right`}>Total</th>
                    <th className={`${tableHeadClass} text-right`}>This Month</th>
                    <th className={`${tableHeadClass} text-right`}>Confirmed</th>
                    <th className={`${tableHeadClass} text-right`}>Tentative</th>
                    <th className={`${tableHeadClass} text-right`}>Completed</th>
                    <th className={`${tableHeadClass} text-right`}>Lost</th>
                    <th className={`${tableHeadClass} text-right`}>Guests</th>
                    <th className={`${tableHeadClass} text-right`}>Follow-ups</th>
                    <th className={`${tableHeadClass} text-right`}>Promises</th>
                    <th className={`${tableHeadClass} text-right`}>Issues</th>
                    <th className={`${tableHeadClass} text-right`}>Conversion</th>
                    <th className={tableHeadClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStaffRows.map((row) => {
                    const status = getRowStatus(row);

                    return (
                      <tr key={row.staffName} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{row.staffName}</div>
                          <div className="text-xs text-slate-500">
                            {row.lastActivityDate ? `Last activity ${formatDatePK(row.lastActivityDate)}` : "No activity date"}
                          </div>
                        </td>
                        <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                          {formatNumberPK(row.totalReservations)}
                        </td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.thisMonthReservations)}</td>
                        <td className={`${tableCellClass} text-right text-emerald-700`}>{formatNumberPK(row.confirmedReservations)}</td>
                        <td className={`${tableCellClass} text-right text-blue-700`}>{formatNumberPK(row.tentativeReservations)}</td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.completedReservations)}</td>
                        <td className={`${tableCellClass} text-right text-rose-700`}>{formatNumberPK(row.lostReservations)}</td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.guestsHandled)}</td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.followUpsLogged)}</td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.paymentPromises)}</td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.issueReports)}</td>
                        <td className={`${tableCellClass} text-right`}>
                          <div className="font-medium text-slate-900">{percentFormatter.format(row.conversionRate)}%</div>
                          <div className="ml-auto mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${Math.min(row.conversionRate, 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className={tableCellClass}>
                          <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {visibleStaffRows.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-3 py-10 text-center text-sm text-slate-500">
                        No staff progress rows match the current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
            <section className="overflow-hidden rounded border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <div className="text-sm font-semibold text-slate-900">Progress Watchlist</div>
                <MessageSquareWarning className="size-4 text-slate-400" />
              </div>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Staff</th>
                      <th className={tableHeadClass}>Focus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchlistRows.map((row) => (
                      <tr key={row.staffName} className="border-t border-slate-200">
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{row.staffName}</div>
                          <div className="text-xs text-slate-500">{formatNumberPK(row.totalReservations)} records</div>
                        </td>
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{buildWatchReason(row)}</div>
                          <div className="text-xs text-slate-500">
                            {formatNumberPK(row.tentativeReservations)} tentative | {formatNumberPK(row.issueReports)} issues
                          </div>
                        </td>
                      </tr>
                    ))}
                    {watchlistRows.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-3 py-8 text-center text-sm text-slate-500">
                          No records to review.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <div className="text-sm font-semibold text-slate-900">Activity Snapshot</div>
                <PhoneCall className="size-4 text-slate-400" />
              </div>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Staff</th>
                      <th className={`${tableHeadClass} text-right`}>Calls</th>
                      <th className={`${tableHeadClass} text-right`}>Done</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityRows.map((row) => (
                      <tr key={row.staffName} className="border-t border-slate-200">
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{row.staffName}</div>
                          <div className="text-xs text-slate-500">
                            {row.lastActivityDate ? formatDatePK(row.lastActivityDate) : "No date"}
                          </div>
                        </td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.followUpsLogged)}</td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.completedReservations)}</td>
                      </tr>
                    ))}
                    {activityRows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-8 text-center text-sm text-slate-500">
                          No activity yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </aside>
        </div>
        ) : activeReport === "follow-up" ? (
        <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2">
              <div className="mr-auto flex items-center gap-2">
                <PhoneCall className="size-4 text-blue-600" />
                <div className="text-sm font-semibold text-slate-900">Follow-Up Performance</div>
              </div>
              <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                {formatNumberPK(visibleFollowUpRows.length)} rows
              </Badge>
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                Productive {percentFormatter.format(followUpProductiveRate)}%
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-0 border-b border-slate-200 bg-slate-50 md:grid-cols-4 xl:grid-cols-6">
              <div className="border-r border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <ClipboardList className="size-3.5" />
                  Assigned
                </div>
                <div className="mt-1 text-xl font-semibold text-slate-900">{formatNumberPK(followUpTotals.assigned)}</div>
              </div>
              <div className="border-r border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <PhoneCall className="size-3.5" />
                  Follow-ups
                </div>
                <div className="mt-1 text-xl font-semibold text-blue-700">{formatNumberPK(followUpTotals.followUps)}</div>
              </div>
              <div className="border-r border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <CheckCircle2 className="size-3.5" />
                  Answered
                </div>
                <div className="mt-1 text-xl font-semibold text-emerald-700">{formatNumberPK(followUpTotals.answered)}</div>
              </div>
              <div className="border-r border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <CalendarDays className="size-3.5" />
                  Due Today
                </div>
                <div className="mt-1 text-xl font-semibold text-slate-900">{formatNumberPK(followUpTotals.dueToday)}</div>
              </div>
              <div className="border-r border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <AlertTriangle className="size-3.5" />
                  Overdue
                </div>
                <div className="mt-1 text-xl font-semibold text-rose-700">{formatNumberPK(followUpTotals.overdue)}</div>
              </div>
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <MessageSquareWarning className="size-3.5" />
                  No Contact
                </div>
                <div className="mt-1 text-xl font-semibold text-amber-700">{formatNumberPK(followUpTotals.noContact)}</div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[1080px]">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className={tableHeadClass}>Staff</th>
                    <th className={`${tableHeadClass} text-right`}>Assigned</th>
                    <th className={`${tableHeadClass} text-right`}>Follow-ups</th>
                    <th className={`${tableHeadClass} text-right`}>Customers</th>
                    <th className={`${tableHeadClass} text-right`}>Answered</th>
                    <th className={`${tableHeadClass} text-right`}>No Answer</th>
                    <th className={`${tableHeadClass} text-right`}>Busy</th>
                    <th className={`${tableHeadClass} text-right`}>Callback</th>
                    <th className={`${tableHeadClass} text-right`}>Promises</th>
                    <th className={`${tableHeadClass} text-right`}>Due Today</th>
                    <th className={`${tableHeadClass} text-right`}>Overdue</th>
                    <th className={`${tableHeadClass} text-right`}>No Contact</th>
                    <th className={`${tableHeadClass} text-right`}>Productive</th>
                    <th className={tableHeadClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFollowUpRows.map((row) => {
                    const status = getFollowUpRowStatus(row);

                    return (
                      <tr key={row.staffName} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{row.staffName}</div>
                          <div className="text-xs text-slate-500">
                            {row.lastFollowUpDate ? `Last call ${formatDatePK(row.lastFollowUpDate)}` : "No call date"}
                          </div>
                        </td>
                        <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                          {formatNumberPK(row.assignedReservations)}
                        </td>
                        <td className={`${tableCellClass} text-right text-blue-700`}>{formatNumberPK(row.followUpsLogged)}</td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.uniqueCustomers)}</td>
                        <td className={`${tableCellClass} text-right text-emerald-700`}>{formatNumberPK(row.answered)}</td>
                        <td className={`${tableCellClass} text-right text-rose-700`}>{formatNumberPK(row.noAnswer)}</td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.busy)}</td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.callbacksScheduled)}</td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.paymentPromises)}</td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.dueToday)}</td>
                        <td className={`${tableCellClass} text-right text-rose-700`}>{formatNumberPK(row.overdueCallbacks)}</td>
                        <td className={`${tableCellClass} text-right text-amber-700`}>{formatNumberPK(row.noContactRecords)}</td>
                        <td className={`${tableCellClass} text-right`}>
                          <div className="font-medium text-slate-900">{percentFormatter.format(row.productiveRate)}%</div>
                          <div className="ml-auto mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${Math.min(row.productiveRate, 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className={tableCellClass}>
                          <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {visibleFollowUpRows.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-3 py-10 text-center text-sm text-slate-500">
                        No follow-up rows match the current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
            <section className="overflow-hidden rounded border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <div className="text-sm font-semibold text-slate-900">Follow-Up Watchlist</div>
                <MessageSquareWarning className="size-4 text-slate-400" />
              </div>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Staff</th>
                      <th className={tableHeadClass}>Focus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {followUpWatchlistRows.map((row) => (
                      <tr key={row.staffName} className="border-t border-slate-200">
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{row.staffName}</div>
                          <div className="text-xs text-slate-500">{formatNumberPK(row.followUpsLogged)} calls</div>
                        </td>
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{buildFollowUpWatchReason(row)}</div>
                          <div className="text-xs text-slate-500">
                            {formatNumberPK(row.overdueCallbacks)} overdue | {formatNumberPK(row.noContactRecords)} no contact
                          </div>
                        </td>
                      </tr>
                    ))}
                    {followUpWatchlistRows.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-3 py-8 text-center text-sm text-slate-500">
                          No follow-up records to review.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <div className="text-sm font-semibold text-slate-900">Outcome Snapshot</div>
                <PhoneCall className="size-4 text-slate-400" />
              </div>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Staff</th>
                      <th className={`${tableHeadClass} text-right`}>Calls</th>
                      <th className={`${tableHeadClass} text-right`}>Productive</th>
                    </tr>
                  </thead>
                  <tbody>
                    {followUpActivityRows.map((row) => (
                      <tr key={row.staffName} className="border-t border-slate-200">
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{row.staffName}</div>
                          <div className="text-xs text-slate-500">
                            {row.lastFollowUpDate ? formatDatePK(row.lastFollowUpDate) : "No date"}
                          </div>
                        </td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.followUpsLogged)}</td>
                        <td className={`${tableCellClass} text-right`}>{percentFormatter.format(row.productiveRate)}%</td>
                      </tr>
                    ))}
                    {followUpActivityRows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-8 text-center text-sm text-slate-500">
                          No follow-up activity yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </aside>
        </div>
        ) : (
        <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2">
              <div className="mr-auto flex items-center gap-2">
                <MessageSquareWarning className="size-4 text-blue-600" />
                <div className="text-sm font-semibold text-slate-900">Customer Feedback & Complaint Report</div>
              </div>
              <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                {formatNumberPK(visibleFeedbackRows.length)} rows
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                Satisfied {percentFormatter.format(feedbackSatisfactionRate)}%
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-0 border-b border-slate-200 bg-slate-50 md:grid-cols-4 xl:grid-cols-6">
              <div className="border-r border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <ClipboardList className="size-3.5" />
                  Completed
                </div>
                <div className="mt-1 text-xl font-semibold text-slate-900">{formatNumberPK(feedbackTotals.completed)}</div>
              </div>
              <div className="border-r border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <CheckCircle2 className="size-3.5" />
                  Feedback
                </div>
                <div className="mt-1 text-xl font-semibold text-emerald-700">{formatNumberPK(feedbackTotals.recorded)}</div>
              </div>
              <div className="border-r border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <CalendarDays className="size-3.5" />
                  Pending
                </div>
                <div className="mt-1 text-xl font-semibold text-amber-700">{formatNumberPK(feedbackTotals.pending)}</div>
              </div>
              <div className="border-r border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <AlertTriangle className="size-3.5" />
                  Issues
                </div>
                <div className="mt-1 text-xl font-semibold text-rose-700">{formatNumberPK(feedbackTotals.issues)}</div>
              </div>
              <div className="border-r border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <MessageSquareWarning className="size-3.5" />
                  Poor
                </div>
                <div className="mt-1 text-xl font-semibold text-rose-700">{formatNumberPK(feedbackTotals.poor)}</div>
              </div>
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <Trophy className="size-3.5" />
                  Satisfied
                </div>
                <div className="mt-1 text-xl font-semibold text-slate-900">{percentFormatter.format(feedbackSatisfactionRate)}%</div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[1080px]">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className={tableHeadClass}>Staff</th>
                    <th className={`${tableHeadClass} text-right`}>Completed</th>
                    <th className={`${tableHeadClass} text-right`}>Feedback</th>
                    <th className={`${tableHeadClass} text-right`}>Pending</th>
                    <th className={`${tableHeadClass} text-right`}>Excellent</th>
                    <th className={`${tableHeadClass} text-right`}>Good</th>
                    <th className={`${tableHeadClass} text-right`}>Average</th>
                    <th className={`${tableHeadClass} text-right`}>Poor</th>
                    <th className={`${tableHeadClass} text-right`}>Issues</th>
                    <th className={`${tableHeadClass} text-right`}>Follow-up Req.</th>
                    <th className={`${tableHeadClass} text-right`}>No Recommend</th>
                    <th className={`${tableHeadClass} text-right`}>Services</th>
                    <th className={`${tableHeadClass} text-right`}>Satisfied</th>
                    <th className={tableHeadClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFeedbackRows.map((row) => {
                    const status = getFeedbackRowStatus(row);

                    return (
                      <tr key={row.staffName} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{row.staffName}</div>
                          <div className="text-xs text-slate-500">
                            {row.lastFeedbackDate ? `Last feedback ${formatDatePK(row.lastFeedbackDate)}` : "No feedback date"}
                          </div>
                        </td>
                        <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                          {formatNumberPK(row.completedEvents)}
                        </td>
                        <td className={`${tableCellClass} text-right text-emerald-700`}>{formatNumberPK(row.feedbackRecorded)}</td>
                        <td className={`${tableCellClass} text-right text-amber-700`}>{formatNumberPK(row.feedbackPending)}</td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.excellent)}</td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.good)}</td>
                        <td className={`${tableCellClass} text-right text-amber-700`}>{formatNumberPK(row.average)}</td>
                        <td className={`${tableCellClass} text-right text-rose-700`}>{formatNumberPK(row.poor)}</td>
                        <td className={`${tableCellClass} text-right text-rose-700`}>{formatNumberPK(row.issueReports)}</td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.followUpRequired)}</td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.recommendationNo)}</td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.servicesReviewed)}</td>
                        <td className={`${tableCellClass} text-right`}>
                          <div className="font-medium text-slate-900">{percentFormatter.format(row.satisfactionRate)}%</div>
                          <div className="ml-auto mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${Math.min(row.satisfactionRate, 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className={tableCellClass}>
                          <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {visibleFeedbackRows.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-3 py-10 text-center text-sm text-slate-500">
                        No feedback rows match the current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
            <section className="overflow-hidden rounded border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <div className="text-sm font-semibold text-slate-900">Complaint Watchlist</div>
                <MessageSquareWarning className="size-4 text-slate-400" />
              </div>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Staff</th>
                      <th className={tableHeadClass}>Focus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackWatchlistRows.map((row) => (
                      <tr key={row.staffName} className="border-t border-slate-200">
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{row.staffName}</div>
                          <div className="text-xs text-slate-500">{formatNumberPK(row.feedbackRecorded)} feedback</div>
                        </td>
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{buildFeedbackWatchReason(row)}</div>
                          <div className="text-xs text-slate-500">
                            {formatNumberPK(row.issueReports)} issues | {formatNumberPK(row.feedbackPending)} pending
                          </div>
                        </td>
                      </tr>
                    ))}
                    {feedbackWatchlistRows.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-3 py-8 text-center text-sm text-slate-500">
                          No feedback records to review.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <div className="text-sm font-semibold text-slate-900">Service Issue Snapshot</div>
                <AlertTriangle className="size-4 text-slate-400" />
              </div>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Service</th>
                      <th className={`${tableHeadClass} text-right`}>Reviewed</th>
                      <th className={`${tableHeadClass} text-right`}>Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackServiceIssueRows.map((row) => (
                      <tr key={row.serviceLabel} className="border-t border-slate-200">
                        <td className={tableCellClass}>
                          <div className="font-medium text-slate-900">{row.serviceLabel}</div>
                          <div className="text-xs text-slate-500">{formatNumberPK(row.poorOrAverage)} average/poor</div>
                        </td>
                        <td className={`${tableCellClass} text-right`}>{formatNumberPK(row.reviewed)}</td>
                        <td className={`${tableCellClass} text-right text-rose-700`}>{formatNumberPK(row.issues)}</td>
                      </tr>
                    ))}
                    {feedbackServiceIssueRows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-8 text-center text-sm text-slate-500">
                          No service feedback recorded yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </aside>
        </div>
        )}
      </div>
    </div>
  );
}
