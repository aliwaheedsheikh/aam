import type { Booking } from "@/app/components/calendar/types-v2";
import type {
  KitchenIssueSheet,
  PurchaseItem,
  VendorBill,
} from "@/app/components/kitchen/types";

export type AccountType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
export type NormalBalance = "Debit" | "Credit";
export type FinancialStatement = "Balance Sheet" | "Profit & Loss";

export interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  category: string;
  normalBalance: NormalBalance;
  statement: FinancialStatement;
  isActive: boolean;
  systemControlled?: boolean;
  description?: string;
}

export interface PostingRule {
  id: string;
  eventType:
    | "reservation-advance"
    | "reservation-invoice"
    | "customer-payment"
    | "grn-vendor-bill"
    | "vendor-payment"
    | "kitchen-stock-issue";
  label: string;
  module: "Reservations" | "Procurement" | "Kitchen" | "Accounts";
  debitAccountCode: string;
  creditAccountCode: string;
  dimensionSource: "booking" | "vendor" | "store" | "manual";
  timing: string;
  isActive: boolean;
}

export type ProfitLossGroupBy = "venue" | "prime-space";

export interface ProfitLossRow {
  dimensionId: string;
  dimensionName: string;
  revenue: number;
  venueRevenue: number;
  foodRevenue: number;
  serviceRevenue: number;
  miscRevenue: number;
  directCost: number;
  foodCost: number;
  outsourcedCost: number;
  grossProfit: number;
  grossMargin: number;
  eventCount: number;
  unvaluedIssueLines: number;
}

export interface ProfitLossReport {
  groupBy: ProfitLossGroupBy;
  rows: ProfitLossRow[];
  totals: Omit<ProfitLossRow, "dimensionId" | "dimensionName">;
  unallocatedPayables: number;
}

export const DEFAULT_CHART_OF_ACCOUNTS: ChartAccount[] = [
  {
    id: "coa-1000",
    code: "1000",
    name: "Cash in Hand",
    type: "Asset",
    category: "Cash & Bank",
    normalBalance: "Debit",
    statement: "Balance Sheet",
    isActive: true,
    systemControlled: true,
  },
  {
    id: "coa-1010",
    code: "1010",
    name: "Bank - HBL",
    type: "Asset",
    category: "Cash & Bank",
    normalBalance: "Debit",
    statement: "Balance Sheet",
    isActive: true,
  },
  {
    id: "coa-1020",
    code: "1020",
    name: "Bank - MCB",
    type: "Asset",
    category: "Cash & Bank",
    normalBalance: "Debit",
    statement: "Balance Sheet",
    isActive: true,
  },
  {
    id: "coa-1100",
    code: "1100",
    name: "Accounts Receivable",
    type: "Asset",
    category: "Current Assets",
    normalBalance: "Debit",
    statement: "Balance Sheet",
    isActive: true,
    systemControlled: true,
  },
  {
    id: "coa-1200",
    code: "1200",
    name: "Inventory - Main Store",
    type: "Asset",
    category: "Inventory",
    normalBalance: "Debit",
    statement: "Balance Sheet",
    isActive: true,
    systemControlled: true,
  },
  {
    id: "coa-1210",
    code: "1210",
    name: "Inventory - Kitchen / Production Stores",
    type: "Asset",
    category: "Inventory",
    normalBalance: "Debit",
    statement: "Balance Sheet",
    isActive: true,
  },
  {
    id: "coa-1300",
    code: "1300",
    name: "Advances to Vendors / Prepaids",
    type: "Asset",
    category: "Current Assets",
    normalBalance: "Debit",
    statement: "Balance Sheet",
    isActive: true,
  },
  {
    id: "coa-2000",
    code: "2000",
    name: "Accounts Payable",
    type: "Liability",
    category: "Current Liabilities",
    normalBalance: "Credit",
    statement: "Balance Sheet",
    isActive: true,
  },
  {
    id: "coa-2100",
    code: "2100",
    name: "Vendor Payables",
    type: "Liability",
    category: "Current Liabilities",
    normalBalance: "Credit",
    statement: "Balance Sheet",
    isActive: true,
    systemControlled: true,
  },
  {
    id: "coa-2200",
    code: "2200",
    name: "Customer Advances / Unearned Revenue",
    type: "Liability",
    category: "Current Liabilities",
    normalBalance: "Credit",
    statement: "Balance Sheet",
    isActive: true,
    systemControlled: true,
  },
  {
    id: "coa-2300",
    code: "2300",
    name: "Sales Tax / PRA Payable",
    type: "Liability",
    category: "Tax Payables",
    normalBalance: "Credit",
    statement: "Balance Sheet",
    isActive: true,
  },
  {
    id: "coa-2310",
    code: "2310",
    name: "Withholding Tax Payable",
    type: "Liability",
    category: "Tax Payables",
    normalBalance: "Credit",
    statement: "Balance Sheet",
    isActive: true,
  },
  {
    id: "coa-3000",
    code: "3000",
    name: "Owner Capital",
    type: "Equity",
    category: "Equity",
    normalBalance: "Credit",
    statement: "Balance Sheet",
    isActive: true,
  },
  {
    id: "coa-3100",
    code: "3100",
    name: "Retained Earnings",
    type: "Equity",
    category: "Equity",
    normalBalance: "Credit",
    statement: "Balance Sheet",
    isActive: true,
  },
  {
    id: "coa-4000",
    code: "4000",
    name: "Venue Rental Revenue",
    type: "Revenue",
    category: "Operating Revenue",
    normalBalance: "Credit",
    statement: "Profit & Loss",
    isActive: true,
    systemControlled: true,
  },
  {
    id: "coa-4010",
    code: "4010",
    name: "Food / Menu Revenue",
    type: "Revenue",
    category: "Operating Revenue",
    normalBalance: "Credit",
    statement: "Profit & Loss",
    isActive: true,
  },
  {
    id: "coa-4020",
    code: "4020",
    name: "Support Catering Revenue",
    type: "Revenue",
    category: "Operating Revenue",
    normalBalance: "Credit",
    statement: "Profit & Loss",
    isActive: true,
  },
  {
    id: "coa-4030",
    code: "4030",
    name: "Rental / RCS Service Revenue",
    type: "Revenue",
    category: "Operating Revenue",
    normalBalance: "Credit",
    statement: "Profit & Loss",
    isActive: true,
  },
  {
    id: "coa-4040",
    code: "4040",
    name: "Misc Event Revenue",
    type: "Revenue",
    category: "Operating Revenue",
    normalBalance: "Credit",
    statement: "Profit & Loss",
    isActive: true,
  },
  {
    id: "coa-4090",
    code: "4090",
    name: "Sales Discounts / Concessions",
    type: "Revenue",
    category: "Contra Revenue",
    normalBalance: "Debit",
    statement: "Profit & Loss",
    isActive: true,
  },
  {
    id: "coa-5000",
    code: "5000",
    name: "Food Ingredient Cost",
    type: "Expense",
    category: "Cost of Goods Sold",
    normalBalance: "Debit",
    statement: "Profit & Loss",
    isActive: true,
    systemControlled: true,
  },
  {
    id: "coa-5010",
    code: "5010",
    name: "Beverage Cost",
    type: "Expense",
    category: "Cost of Goods Sold",
    normalBalance: "Debit",
    statement: "Profit & Loss",
    isActive: true,
  },
  {
    id: "coa-5020",
    code: "5020",
    name: "Outsourced Services Cost",
    type: "Expense",
    category: "Cost of Goods Sold",
    normalBalance: "Debit",
    statement: "Profit & Loss",
    isActive: true,
  },
  {
    id: "coa-5030",
    code: "5030",
    name: "Event Consumables / Breakage Cost",
    type: "Expense",
    category: "Cost of Goods Sold",
    normalBalance: "Debit",
    statement: "Profit & Loss",
    isActive: true,
  },
  {
    id: "coa-5040",
    code: "5040",
    name: "Direct Labor / Event Staff Cost",
    type: "Expense",
    category: "Cost of Goods Sold",
    normalBalance: "Debit",
    statement: "Profit & Loss",
    isActive: true,
  },
  {
    id: "coa-6000",
    code: "6000",
    name: "Salaries",
    type: "Expense",
    category: "Operating Expenses",
    normalBalance: "Debit",
    statement: "Profit & Loss",
    isActive: true,
  },
  {
    id: "coa-6100",
    code: "6100",
    name: "Utilities",
    type: "Expense",
    category: "Operating Expenses",
    normalBalance: "Debit",
    statement: "Profit & Loss",
    isActive: true,
  },
  {
    id: "coa-6200",
    code: "6200",
    name: "Repairs & Maintenance",
    type: "Expense",
    category: "Operating Expenses",
    normalBalance: "Debit",
    statement: "Profit & Loss",
    isActive: true,
  },
  {
    id: "coa-6300",
    code: "6300",
    name: "Marketing / Commissions",
    type: "Expense",
    category: "Operating Expenses",
    normalBalance: "Debit",
    statement: "Profit & Loss",
    isActive: true,
  },
  {
    id: "coa-6500",
    code: "6500",
    name: "Bank Charges",
    type: "Expense",
    category: "Operating Expenses",
    normalBalance: "Debit",
    statement: "Profit & Loss",
    isActive: true,
  },
];

export const DEFAULT_POSTING_RULES: PostingRule[] = [
  {
    id: "rule-reservation-advance",
    eventType: "reservation-advance",
    label: "Reservation advance received",
    module: "Reservations",
    debitAccountCode: "1000",
    creditAccountCode: "2200",
    dimensionSource: "booking",
    timing: "When payment is received before event invoice",
    isActive: true,
  },
  {
    id: "rule-reservation-invoice",
    eventType: "reservation-invoice",
    label: "Confirmed reservation invoice",
    module: "Reservations",
    debitAccountCode: "1100",
    creditAccountCode: "4000",
    dimensionSource: "booking",
    timing: "When confirmed invoice is issued or event is completed",
    isActive: true,
  },
  {
    id: "rule-customer-payment",
    eventType: "customer-payment",
    label: "Customer payment against invoice",
    module: "Accounts",
    debitAccountCode: "1000",
    creditAccountCode: "1100",
    dimensionSource: "booking",
    timing: "When receipt is posted",
    isActive: true,
  },
  {
    id: "rule-grn-vendor-bill",
    eventType: "grn-vendor-bill",
    label: "GRN and vendor bill",
    module: "Procurement",
    debitAccountCode: "1200",
    creditAccountCode: "2100",
    dimensionSource: "store",
    timing: "When accepted GRN creates a vendor bill",
    isActive: true,
  },
  {
    id: "rule-vendor-payment",
    eventType: "vendor-payment",
    label: "Vendor payment",
    module: "Accounts",
    debitAccountCode: "2100",
    creditAccountCode: "1000",
    dimensionSource: "vendor",
    timing: "When AP voucher is paid",
    isActive: true,
  },
  {
    id: "rule-kitchen-stock-issue",
    eventType: "kitchen-stock-issue",
    label: "Kitchen stock issued to event",
    module: "Kitchen",
    debitAccountCode: "5000",
    creditAccountCode: "1200",
    dimensionSource: "booking",
    timing: "When kitchen issue sheet posts stock to an event",
    isActive: true,
  },
];

const safeNumber = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const getBookingSnapshot = (booking: Booking) =>
  booking.currentAgreementSnapshot || booking.signedAgreementSnapshot;

const isRecognizedBooking = (booking: Booking) =>
  booking.status === "confirmed" || booking.status === "completed";

const getBookingRevenue = (booking: Booking) => {
  const snapshot = getBookingSnapshot(booking);

  if (!snapshot) {
    return {
      venueRevenue: safeNumber(booking.totalAmount),
      foodRevenue: 0,
      serviceRevenue: 0,
      miscRevenue: 0,
      totalRevenue: safeNumber(booking.totalAmount),
    };
  }

  const venueRevenue = safeNumber(snapshot.venueCharges?.total);
  const foodRevenue =
    safeNumber(snapshot.totals?.menuTotal) +
    safeNumber(snapshot.totals?.foodSuppliesTotal) +
    safeNumber(snapshot.totals?.supportCateringTotal);
  const serviceRevenue = safeNumber(snapshot.totals?.rcsTotal);
  const miscRevenue = safeNumber(snapshot.totals?.additionalChargesTotal ?? snapshot.totals?.miscTotal);
  const fallbackRevenue = safeNumber(snapshot.totals?.grandTotal) - safeNumber(snapshot.totals?.taxTotal);
  const totalRevenue = venueRevenue + foodRevenue + serviceRevenue + miscRevenue;

  return {
    venueRevenue,
    foodRevenue,
    serviceRevenue,
    miscRevenue,
    totalRevenue: totalRevenue > 0 ? totalRevenue : fallbackRevenue,
  };
};

const getPrimeSpaceName = (booking: Booking, primeSpaceId: string) => {
  const index = booking.primeSpaceIds?.indexOf(primeSpaceId) ?? -1;
  if (index >= 0 && booking.primeSpaceNames?.[index]) {
    return booking.primeSpaceNames[index];
  }

  if (booking.primeSpaceId === primeSpaceId && booking.primeSpaceName) {
    return booking.primeSpaceName;
  }

  return primeSpaceId || "Unassigned Prime Space";
};

const getBookingAllocations = (booking: Booking, groupBy: ProfitLossGroupBy) => {
  if (groupBy === "venue") {
    return [
      {
        id: booking.venueId || "unassigned-venue",
        name: booking.venueName || booking.venueId || "Unassigned Venue",
        weight: 1,
      },
    ];
  }

  const assignments =
    booking.spaceAssignments && booking.spaceAssignments.length > 0
      ? booking.spaceAssignments
      : (booking.primeSpaceIds ?? [booking.primeSpaceId].filter(Boolean)).map((primeSpaceId) => ({
          primeSpaceId: primeSpaceId as string,
          guestCount: undefined,
        }));

  const normalizedAssignments = assignments.filter((assignment) => assignment.primeSpaceId);
  if (normalizedAssignments.length === 0) {
    return [
      {
        id: "unassigned-prime-space",
        name: "Unassigned Prime Space",
        weight: 1,
      },
    ];
  }

  const totalGuests = normalizedAssignments.reduce(
    (sum, assignment) => sum + safeNumber(assignment.guestCount),
    0,
  );
  const equalWeight = 1 / normalizedAssignments.length;

  return normalizedAssignments.map((assignment) => {
    const id = assignment.primeSpaceId;
    return {
      id,
      name: getPrimeSpaceName(booking, id),
      weight: totalGuests > 0 ? safeNumber(assignment.guestCount) / totalGuests : equalWeight,
    };
  });
};

const createEmptyRow = (dimensionId: string, dimensionName: string): ProfitLossRow => ({
  dimensionId,
  dimensionName,
  revenue: 0,
  venueRevenue: 0,
  foodRevenue: 0,
  serviceRevenue: 0,
  miscRevenue: 0,
  directCost: 0,
  foodCost: 0,
  outsourcedCost: 0,
  grossProfit: 0,
  grossMargin: 0,
  eventCount: 0,
  unvaluedIssueLines: 0,
});

const addToRow = (
  rows: Map<string, ProfitLossRow>,
  dimensionId: string,
  dimensionName: string,
  patch: Partial<ProfitLossRow>,
) => {
  const row = rows.get(dimensionId) ?? createEmptyRow(dimensionId, dimensionName);
  row.revenue += safeNumber(patch.revenue);
  row.venueRevenue += safeNumber(patch.venueRevenue);
  row.foodRevenue += safeNumber(patch.foodRevenue);
  row.serviceRevenue += safeNumber(patch.serviceRevenue);
  row.miscRevenue += safeNumber(patch.miscRevenue);
  row.directCost += safeNumber(patch.directCost);
  row.foodCost += safeNumber(patch.foodCost);
  row.outsourcedCost += safeNumber(patch.outsourcedCost);
  row.eventCount += safeNumber(patch.eventCount);
  row.unvaluedIssueLines += safeNumber(patch.unvaluedIssueLines);
  rows.set(dimensionId, row);
};

export const buildProfitLossReport = ({
  bookings,
  kitchenIssueSheets,
  purchaseItems,
  vendorBills,
  groupBy,
}: {
  bookings: Booking[];
  kitchenIssueSheets: KitchenIssueSheet[];
  purchaseItems: PurchaseItem[];
  vendorBills: VendorBill[];
  groupBy: ProfitLossGroupBy;
}): ProfitLossReport => {
  const rows = new Map<string, ProfitLossRow>();
  const bookingsById = new Map(bookings.map((booking) => [booking.id, booking]));
  const purchaseItemsById = new Map(purchaseItems.map((item) => [item.id, item]));

  bookings.filter(isRecognizedBooking).forEach((booking) => {
    const revenue = getBookingRevenue(booking);
    const allocations = getBookingAllocations(booking, groupBy);

    allocations.forEach((allocation) => {
      addToRow(rows, allocation.id, allocation.name, {
        revenue: revenue.totalRevenue * allocation.weight,
        venueRevenue: revenue.venueRevenue * allocation.weight,
        foodRevenue: revenue.foodRevenue * allocation.weight,
        serviceRevenue: revenue.serviceRevenue * allocation.weight,
        miscRevenue: revenue.miscRevenue * allocation.weight,
        eventCount: allocation.weight,
      });
    });

    const snapshot = getBookingSnapshot(booking);
    snapshot?.rcs?.items?.forEach((item) => {
      if (item.source !== "Outsource") {
        return;
      }

      const cost = safeNumber(item.quantity) * safeNumber(item.costRate);
      if (cost <= 0) {
        return;
      }

      allocations.forEach((allocation) => {
        addToRow(rows, allocation.id, allocation.name, {
          directCost: cost * allocation.weight,
          outsourcedCost: cost * allocation.weight,
        });
      });
    });
  });

  kitchenIssueSheets.forEach((issueSheet) => {
    const booking = bookingsById.get(issueSheet.bookingId);
    if (!booking || !isRecognizedBooking(booking)) {
      return;
    }

    const allocations = getBookingAllocations(booking, groupBy);

    issueSheet.lineItems.forEach((lineItem) => {
      const purchaseItem = purchaseItemsById.get(lineItem.purchaseItemId);
      const unitCost = safeNumber(purchaseItem?.ratePerUnit || purchaseItem?.lastPurchaseRate);
      const issueCost = safeNumber(lineItem.issuedQuantity) * unitCost;
      const unvaluedIssueLines = unitCost <= 0 && safeNumber(lineItem.issuedQuantity) > 0 ? 1 : 0;

      allocations.forEach((allocation) => {
        addToRow(rows, allocation.id, allocation.name, {
          directCost: issueCost * allocation.weight,
          foodCost: issueCost * allocation.weight,
          unvaluedIssueLines: unvaluedIssueLines * allocation.weight,
        });
      });
    });
  });

  const reportRows = Array.from(rows.values())
    .map((row) => {
      const grossProfit = row.revenue - row.directCost;
      return {
        ...row,
        grossProfit,
        grossMargin: row.revenue > 0 ? (grossProfit / row.revenue) * 100 : 0,
      };
    })
    .sort((left, right) => right.revenue - left.revenue);

  const totals = reportRows.reduce<Omit<ProfitLossRow, "dimensionId" | "dimensionName">>(
    (sum, row) => {
      sum.revenue += row.revenue;
      sum.venueRevenue += row.venueRevenue;
      sum.foodRevenue += row.foodRevenue;
      sum.serviceRevenue += row.serviceRevenue;
      sum.miscRevenue += row.miscRevenue;
      sum.directCost += row.directCost;
      sum.foodCost += row.foodCost;
      sum.outsourcedCost += row.outsourcedCost;
      sum.grossProfit += row.grossProfit;
      sum.eventCount += row.eventCount;
      sum.unvaluedIssueLines += row.unvaluedIssueLines;
      return sum;
    },
    {
      revenue: 0,
      venueRevenue: 0,
      foodRevenue: 0,
      serviceRevenue: 0,
      miscRevenue: 0,
      directCost: 0,
      foodCost: 0,
      outsourcedCost: 0,
      grossProfit: 0,
      grossMargin: 0,
      eventCount: 0,
      unvaluedIssueLines: 0,
    },
  );

  totals.grossMargin = totals.revenue > 0 ? (totals.grossProfit / totals.revenue) * 100 : 0;

  return {
    groupBy,
    rows: reportRows,
    totals,
    unallocatedPayables: vendorBills.reduce((sum, bill) => sum + safeNumber(bill.amountPending), 0),
  };
};
