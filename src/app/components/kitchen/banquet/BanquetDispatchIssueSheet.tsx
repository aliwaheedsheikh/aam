import { useMemo, useState } from 'react';
import { Button } from '../../ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ClipboardList, Clock, MapPin, Users } from 'lucide-react';
import { Booking } from '../../calendar/types-v2';
import { Dish, KitchenIssueSheet, MenuPackage, PurchaseItem, Recipe, StoreMaster, StoreStock, UnitMaster } from '../types';
import { buildBanquetProductionPlans } from './productionFlow';
import { formatDatePK, formatNumberPK } from '../../../lib/locale';
import { getStoreDisplayName } from '../../../lib/storeMaster';

interface BanquetDispatchIssueSheetProps {
  bookings: Booking[];
  dishes: Dish[];
  stores: StoreMaster[];
  recipes: Recipe[];
  menuPackages: MenuPackage[];
  purchaseItems: PurchaseItem[];
  storeStocks: StoreStock[];
  units: UnitMaster[];
  issueSheets: KitchenIssueSheet[];
}

const getStatusMeta = (status: string) => {
  switch (status) {
    case 'issued':
      return { label: 'Issued', className: 'bg-emerald-100 text-emerald-700' };
    case 'partial-issued':
      return { label: 'Partial Issue', className: 'bg-amber-100 text-amber-700' };
    case 'short-stock':
      return { label: 'Short Stock', className: 'bg-red-100 text-red-700' };
    case 'configuration-gap':
      return { label: 'Config Gap', className: 'bg-slate-100 text-slate-700' };
    case 'planning-only':
      return { label: 'Planning Only', className: 'bg-indigo-100 text-indigo-700' };
    default:
      return { label: 'Ready', className: 'bg-blue-100 text-blue-700' };
  }
};

export function BanquetDispatchIssueSheet({
  bookings,
  dishes,
  stores,
  recipes,
  menuPackages,
  purchaseItems,
  storeStocks,
  units,
  issueSheets,
}: BanquetDispatchIssueSheetProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const productionPlans = useMemo(
    () =>
      buildBanquetProductionPlans({
        bookings,
        selectedDate,
        dishes,
        recipes,
        menuPackages,
        purchaseItems,
        storeStocks,
        units,
        issueSheets,
      }),
    [bookings, selectedDate, dishes, recipes, menuPackages, purchaseItems, storeStocks, units, issueSheets],
  );

  const issueSheetsForDate = useMemo(
    () =>
      issueSheets
        .filter((issueSheet) => new Date(issueSheet.eventDate).toDateString() === selectedDate.toDateString())
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [issueSheets, selectedDate],
  );

  const readyCount = productionPlans.filter((plan) => plan.issueStatus === 'ready' || plan.issueStatus === 'issued').length;
  const pendingCount = productionPlans.length - readyCount;

  const moveDate = (days: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + days);
    setSelectedDate(nextDate);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Dispatch & Issue Sheet</h2>
            <p className="text-sm text-gray-500">Live event readiness plus issued stock register</p>
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
              <ClipboardList className="size-4 text-gray-500" />
              <span className="text-gray-600">Events:</span>
              <span className="font-bold text-lg">{productionPlans.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Ready / Issued:</span>
              <span className="font-bold text-lg text-green-600">{readyCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Pending:</span>
              <span className="font-bold text-lg text-amber-600">{pendingCount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {productionPlans.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <CalendarIcon className="size-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Dispatch Rows For This Date</h3>
            <p className="text-gray-500">Bookings will appear here when the selected date has banquet events.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="border-b px-4 py-3">
                <h3 className="font-semibold text-gray-900">Event Readiness</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Event</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Timing</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Venue</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Menu</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Remaining Lines</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Issue Sheets</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {productionPlans.map((plan) => {
                    const statusMeta = getStatusMeta(plan.issueStatus);
                    return (
                      <tr key={plan.bookingId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{plan.customerName}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                            <Users className="size-3" />
                            {plan.eventType} • {plan.guestCount} guests
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock className="size-4" />
                            {plan.eventTime}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="size-4" />
                            {plan.venueName}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{plan.menuLabel}</td>
                        <td className="px-4 py-3 text-center text-gray-700">
                          {plan.ingredients.filter((lineItem) => lineItem.remainingRequiredQuantity > 0).length}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">{plan.issueSheetCount}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="border-b px-4 py-3">
                <h3 className="font-semibold text-gray-900">Issue Sheet Register</h3>
              </div>
              {issueSheetsForDate.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-gray-500">
                  No stock issue sheets have been created for this date yet.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Issue No</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Event</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Created</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Stores</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">Required</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">Issued</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">Shortage</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {issueSheetsForDate.map((issueSheet) => {
                      const storeIds = Array.from(new Set(issueSheet.lineItems.map((lineItem) => lineItem.sourceStore)));
                      const totalRequired = issueSheet.lineItems.reduce((sum, lineItem) => sum + lineItem.requiredQuantity, 0);
                      const totalIssued = issueSheet.lineItems.reduce((sum, lineItem) => sum + lineItem.issuedQuantity, 0);
                      const totalShortage = issueSheet.lineItems.reduce((sum, lineItem) => sum + lineItem.shortageQuantity, 0);
                      const statusMeta = getStatusMeta(issueSheet.status === 'partial' ? 'partial-issued' : 'issued');

                      return (
                        <tr key={issueSheet.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{issueSheet.issueNumber}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{issueSheet.customerName}</div>
                            <div className="text-xs text-gray-500">{issueSheet.packageName || 'Package not captured'}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {formatDatePK(issueSheet.createdAt)} • {new Date(issueSheet.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {storeIds.map((storeId) => getStoreDisplayName(stores, storeId)).join(', ')}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">{formatNumberPK(totalRequired)}</td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-700">{formatNumberPK(totalIssued)}</td>
                          <td className="px-4 py-3 text-right font-medium text-red-700">{formatNumberPK(totalShortage)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusMeta.className}`}>
                              {statusMeta.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {issueSheetsForDate.length > 0 ? (
              <div className="rounded-lg border bg-white">
                <div className="border-b px-4 py-3">
                  <h3 className="font-semibold text-gray-900">Latest Issue Details</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Issue No</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Item</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Store</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Required</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Issued</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Shortage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {issueSheetsForDate.flatMap((issueSheet) =>
                        issueSheet.lineItems.map((lineItem) => (
                          <tr key={`${issueSheet.id}-${lineItem.purchaseItemId}-${lineItem.sourceStore}`} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{issueSheet.issueNumber}</td>
                            <td className="px-4 py-3 text-gray-700">
                              {lineItem.itemName}
                              <div className="text-xs text-gray-500">{lineItem.linkedDishes.join(', ')}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-700">{getStoreDisplayName(stores, lineItem.sourceStore)}</td>
                            <td className="px-4 py-3 text-right text-gray-700">
                              {formatNumberPK(lineItem.requiredQuantity)} {lineItem.unit}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-emerald-700">
                              {formatNumberPK(lineItem.issuedQuantity)} {lineItem.unit}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-red-700">
                              {formatNumberPK(lineItem.shortageQuantity)} {lineItem.unit}
                            </td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
