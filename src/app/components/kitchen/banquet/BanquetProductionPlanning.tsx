import { useMemo, useState } from 'react';
import { Button } from '../../ui/button';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Package,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Booking } from '../../calendar/types-v2';
import { Dish, KitchenIssueSheet, MenuPackage, ProductionCostMethod, PurchaseItem, Recipe, StoreMaster, StoreStock, UnitMaster } from '../types';
import {
  buildBanquetProductionPlans,
  type BookingProductionPlan,
} from './productionFlow';
import { formatDatePK, formatNumberPK } from '../../../lib/locale';
import { getStoreDisplayName } from '../../../lib/storeMaster';

interface BanquetProductionPlanningProps {
  userName: string;
  bookings: Booking[];
  dishes: Dish[];
  stores: StoreMaster[];
  recipes: Recipe[];
  menuPackages: MenuPackage[];
  productionCostMethods: ProductionCostMethod[];
  purchaseItems: PurchaseItem[];
  storeStocks: StoreStock[];
  units: UnitMaster[];
  issueSheets: KitchenIssueSheet[];
  onStoreStocksChange: (stocks: StoreStock[]) => void;
  onIssueSheetsChange: (issueSheets: KitchenIssueSheet[]) => void;
}

const getStatusBadgeClass = (status: BookingProductionPlan['issueStatus']) => {
  switch (status) {
    case 'issued':
      return 'bg-emerald-100 text-emerald-700';
    case 'partial-issued':
      return 'bg-amber-100 text-amber-700';
    case 'short-stock':
      return 'bg-red-100 text-red-700';
    case 'configuration-gap':
      return 'bg-slate-100 text-slate-700';
    case 'planning-only':
      return 'bg-indigo-100 text-indigo-700';
    default:
      return 'bg-blue-100 text-blue-700';
  }
};

const getStatusLabel = (status: BookingProductionPlan['issueStatus']) => {
  switch (status) {
    case 'issued':
      return 'Issued';
    case 'partial-issued':
      return 'Partial Issue';
    case 'short-stock':
      return 'Short Stock';
    case 'configuration-gap':
      return 'Config Gap';
    case 'planning-only':
      return 'Planning Only';
    default:
      return 'Ready';
  }
};

const formatUsageSources = (
  usageSources?: Array<{ label: string }>,
) => (usageSources && usageSources.length > 0 ? usageSources.map((source) => source.label).join(', ') : '');

export function BanquetProductionPlanning({
  userName,
  bookings,
  dishes,
  stores,
  recipes,
  menuPackages,
  productionCostMethods,
  purchaseItems,
  storeStocks,
  units,
  issueSheets,
  onStoreStocksChange,
  onIssueSheetsChange,
}: BanquetProductionPlanningProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const productionPlans = useMemo(
    () =>
      buildBanquetProductionPlans({
        bookings,
        selectedDate,
        dishes,
        recipes,
        menuPackages,
        productionCostMethods,
        purchaseItems,
        storeStocks,
        units,
        issueSheets,
      }),
    [bookings, selectedDate, dishes, recipes, menuPackages, productionCostMethods, purchaseItems, storeStocks, units, issueSheets],
  );

  const metrics = useMemo(
    () => ({
      events: productionPlans.length,
      guests: productionPlans.reduce((sum, plan) => sum + plan.guestCount, 0),
      ready: productionPlans.filter((plan) => plan.issueStatus === 'ready' || plan.issueStatus === 'short-stock').length,
      issued: productionPlans.filter((plan) => plan.isFullyIssued).length,
    }),
    [productionPlans],
  );

  const moveDate = (days: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + days);
    setSelectedDate(nextDate);
  };

  const handleIssueStock = (plan: BookingProductionPlan) => {
    if (!plan.canIssue) {
      return;
    }

    const lineItems = plan.ingredients
      .filter((lineItem) => lineItem.remainingRequiredQuantity > 0)
      .map((lineItem) => ({
        purchaseItemId: lineItem.purchaseItemId,
        itemName: lineItem.itemName,
        sourceStore: lineItem.sourceStore,
        unit: lineItem.unit,
        requiredQuantity: lineItem.remainingRequiredQuantity,
        issuedQuantity: lineItem.issueQuantity,
        shortageQuantity: lineItem.shortageQuantity,
        availableQuantity: lineItem.availableQuantity,
        linkedDishes: lineItem.linkedDishes,
        usageSources: lineItem.usageSources,
      }));

    if (lineItems.length === 0) {
      toast.error('There is no remaining stock requirement to issue for this event.');
      return;
    }

    const now = new Date();
    const issueNumber = `KIS-${now.toISOString().split('T')[0].replace(/-/g, '')}-${(issueSheets.length + 1)
      .toString()
      .padStart(3, '0')}`;
    const issueStatus = lineItems.some((lineItem) => lineItem.shortageQuantity > 0) ? 'partial' : 'issued';

    const newIssueSheet: KitchenIssueSheet = {
      id: `kis-${Date.now()}`,
      issueNumber,
      module: 'banquet',
      bookingId: plan.bookingId,
      customerName: plan.customerName,
      eventType: plan.eventType,
      venueName: plan.venueName,
      eventDate: plan.eventDate,
      eventTime: plan.eventTime,
      guestCount: plan.guestCount,
      packageId: plan.packageId,
      packageName: plan.packageName,
      status: issueStatus,
      remarks:
        issueStatus === 'partial'
          ? 'Issued available stock. Remaining requirement is still short.'
          : 'Issued full ingredient requirement for production.',
      lineItems,
      createdBy: userName,
      createdAt: now,
      updatedAt: now,
    };

    const updatedStoreStocks = storeStocks.map((stock) => {
      const matchingLine = lineItems.find(
        (lineItem) =>
          lineItem.purchaseItemId === stock.purchaseItemId &&
          lineItem.sourceStore === stock.storeLocation &&
          lineItem.issuedQuantity > 0,
      );

      if (!matchingLine) {
        return stock;
      }

      return {
        ...stock,
        currentStock: Math.max(0, stock.currentStock - matchingLine.issuedQuantity),
        lastUpdated: now,
      };
    });

    onStoreStocksChange(updatedStoreStocks);
    onIssueSheetsChange([...issueSheets, newIssueSheet]);

    toast.success(issueStatus === 'partial' ? 'Partial issue sheet created' : 'Issue sheet created', {
      description:
        issueStatus === 'partial'
          ? `${issueNumber} issued available stock for ${plan.customerName}. Short stock remains on some ingredients.`
          : `${issueNumber} issued the full live ingredient requirement for ${plan.customerName}.`,
    });
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="flex-shrink-0 border-b bg-white px-6 py-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Daily Production</h2>
            <p className="text-sm text-gray-500">Approved package to recipe to live store issue</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => moveDate(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-[250px] text-center font-semibold text-lg">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <Button variant="ghost" size="sm" onClick={() => moveDate(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button size="sm" onClick={() => setSelectedDate(new Date())}>
            Today
          </Button>

          <div className="ml-auto flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 text-gray-500" />
              <span className="text-gray-600">Events:</span>
              <span className="text-lg font-bold">{metrics.events}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-gray-500" />
              <span className="text-gray-600">Guests:</span>
              <span className="text-lg font-bold">{metrics.guests}</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="size-4 text-gray-500" />
              <span className="text-gray-600">Issued:</span>
              <span className="text-lg font-bold text-emerald-600">{metrics.issued}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {productionPlans.length === 0 ? (
          <div className="rounded-lg border bg-white p-12 text-center">
            <CalendarIcon className="mx-auto mb-4 size-16 text-gray-300" />
            <h3 className="mb-2 text-xl font-semibold text-gray-700">No Events Scheduled</h3>
            <p className="text-gray-500">There are no banquet events available for production planning on this date.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {productionPlans.map((plan) => (
              <section key={plan.bookingId} className="overflow-hidden rounded-lg border bg-white">
                <div className="border-b px-5 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">{plan.customerName}</h3>
                        <span className={`rounded px-2 py-1 text-xs font-medium ${getStatusBadgeClass(plan.issueStatus)}`}>
                          {getStatusLabel(plan.issueStatus)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {plan.eventType} • {plan.eventTime} • {plan.venueName}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        Package: <span className="font-medium text-gray-900">{plan.menuLabel}</span> • Guests: {plan.guestCount}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded border bg-gray-50 px-3 py-1 text-xs text-gray-600">
                        Issue Sheets: {plan.issueSheetCount}
                      </span>
                      <span className="rounded border bg-gray-50 px-3 py-1 text-xs text-gray-600">
                        Stores: {plan.sourceStores.length > 0 ? plan.sourceStores.map((store) => getStoreDisplayName(stores, store)).join(', ') : '—'}
                      </span>
                      <button
                        onClick={() => handleIssueStock(plan)}
                        disabled={!plan.canIssue}
                        className="rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {plan.isFullyIssued
                          ? 'Issued'
                          : plan.canIssue
                            ? plan.totalShortageQuantity > 0
                              ? 'Issue Available Stock'
                              : 'Issue Stock'
                            : 'Issue Blocked'}
                      </button>
                    </div>
                  </div>

                  {plan.blockingIssues.length > 0 ? (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                      <p className="text-sm font-medium text-red-800">Configuration gaps</p>
                      <ul className="mt-2 space-y-1 text-sm text-red-700">
                        {plan.blockingIssues.map((issue) => (
                          <li key={issue}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {plan.notes.length > 0 ? (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-sm font-medium text-amber-900">Planning notes</p>
                      <ul className="mt-2 space-y-1 text-sm text-amber-800">
                        {plan.notes.map((note) => (
                          <li key={note}>• {note}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Item</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Store</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Required</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Already Issued</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Remaining</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Available</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Issue Now</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Shortage</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Linked Dishes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {plan.ingredients.map((lineItem) => (
                        <tr key={`${plan.bookingId}-${lineItem.purchaseItemId}-${lineItem.sourceStore}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            <div>{lineItem.itemName}</div>
                            {lineItem.usageSources.length > 0 ? (
                              <div className="text-xs font-normal text-gray-500">{formatUsageSources(lineItem.usageSources)}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{getStoreDisplayName(stores, lineItem.sourceStore)}</td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {formatNumberPK(lineItem.totalRequiredQuantity)} {lineItem.unit}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {formatNumberPK(lineItem.alreadyIssuedQuantity)} {lineItem.unit}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">
                            {formatNumberPK(lineItem.remainingRequiredQuantity)} {lineItem.unit}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {formatNumberPK(lineItem.availableQuantity)} {lineItem.unit}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-700">
                            {formatNumberPK(lineItem.issueQuantity)} {lineItem.unit}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-red-700">
                            {formatNumberPK(lineItem.shortageQuantity)} {lineItem.unit}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{lineItem.linkedDishes.join(', ')}</td>
                        </tr>
                      ))}
                      {plan.ingredients.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                            No issue-ready stock accountability lines are available for this event yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                <div className="border-t bg-gray-50 px-5 py-3 text-sm text-gray-600">
                  Remaining requirement: <span className="font-medium text-gray-900">{formatNumberPK(plan.totalRemainingQuantity)}</span> • Short stock: <span className="font-medium text-red-700">{formatNumberPK(plan.totalShortageQuantity)}</span> • Last reviewed: {formatDatePK(plan.eventDate)}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
