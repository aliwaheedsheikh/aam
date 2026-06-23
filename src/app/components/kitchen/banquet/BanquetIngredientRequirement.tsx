import { useMemo, useState } from 'react';
import { Button } from '../../ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, PackageCheck, ShoppingCart, Users } from 'lucide-react';
import { Booking } from '../../calendar/types-v2';
import { Dish, KitchenIssueSheet, MenuPackage, PurchaseItem, Recipe, StoreMaster, StoreStock, UnitMaster } from '../types';
import {
  buildBanquetProductionPlans,
  buildConsolidatedBanquetRequirements,
} from './productionFlow';
import { formatNumberPK } from '../../../lib/locale';
import { getStoreDisplayName } from '../../../lib/storeMaster';

interface BanquetIngredientRequirementProps {
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

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'issued':
      return { label: 'Issued', className: 'bg-emerald-100 text-emerald-700' };
    case 'partial-issued':
      return { label: 'Partial', className: 'bg-amber-100 text-amber-700' };
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

export function BanquetIngredientRequirement({
  bookings,
  dishes,
  stores,
  recipes,
  menuPackages,
  purchaseItems,
  storeStocks,
  units,
  issueSheets,
}: BanquetIngredientRequirementProps) {
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

  const consolidatedRequirements = useMemo(
    () => buildConsolidatedBanquetRequirements(productionPlans, storeStocks),
    [productionPlans, storeStocks],
  );

  const metrics = useMemo(
    () => ({
      events: productionPlans.length,
      lines: consolidatedRequirements.length,
      remaining: consolidatedRequirements.reduce((sum, item) => sum + item.remainingRequiredQuantity, 0),
      shortageLines: consolidatedRequirements.filter((item) => item.shortageQuantity > 0).length,
    }),
    [productionPlans, consolidatedRequirements],
  );

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
            <h2 className="text-xl font-bold text-gray-900">Ingredient Requirement</h2>
            <p className="text-sm text-gray-500">Live package-driven requirement from recipes and purchase items</p>
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
              <span className="font-bold text-lg">{metrics.events}</span>
            </div>
            <div className="flex items-center gap-2">
              <PackageCheck className="size-4 text-gray-500" />
              <span className="text-gray-600">Lines:</span>
              <span className="font-bold text-lg">{metrics.lines}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-4 text-gray-500" />
              <span className="text-gray-600">Remaining Qty:</span>
              <span className="font-bold text-lg">{formatNumberPK(metrics.remaining)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {productionPlans.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <CalendarIcon className="size-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Events Scheduled</h3>
            <p className="text-gray-500">There are no banquet events available for requirement planning on this date.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border">
                <div className="px-4 py-3 border-b">
                  <h3 className="font-semibold text-gray-900">Event Coverage</h3>
                </div>
                <div className="divide-y">
                  {productionPlans.map((plan) => {
                    const statusMeta = getStatusLabel(plan.issueStatus);
                    return (
                      <div key={plan.bookingId} className="px-4 py-3 flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium text-gray-900">{plan.customerName}</div>
                          <div className="text-sm text-gray-500">
                            {plan.menuLabel} • {plan.guestCount} guests • {plan.eventTime}
                          </div>
                          {plan.blockingIssues.length > 0 ? (
                            <div className="mt-1 text-xs text-red-600">{plan.blockingIssues[0]}</div>
                          ) : null}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-lg border">
                <div className="px-4 py-3 border-b">
                  <h3 className="font-semibold text-gray-900">Consolidated Requirement</h3>
                </div>
                {consolidatedRequirements.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    No live ingredient requirements are available yet for this date.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Item</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Store</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-700">Required</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-700">Issued</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-700">Remaining</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-700">Available</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-700">Shortage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {consolidatedRequirements.map((item) => (
                          <tr key={`${item.purchaseItemId}-${item.sourceStore}`}>
                            <td className="px-4 py-3 font-medium text-gray-900">{item.itemName}</td>
                            <td className="px-4 py-3 text-gray-600">{getStoreDisplayName(stores, item.sourceStore)}</td>
                            <td className="px-4 py-3 text-right text-gray-700">
                              {formatNumberPK(item.totalRequiredQuantity)} {item.unit}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700">
                              {formatNumberPK(item.alreadyIssuedQuantity)} {item.unit}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">
                              {formatNumberPK(item.remainingRequiredQuantity)} {item.unit}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700">
                              {formatNumberPK(item.availableQuantity)} {item.unit}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-red-700">
                              {formatNumberPK(item.shortageQuantity)} {item.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border">
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="size-4 text-orange-600" />
                  Required By Event
                </h3>
              </div>
              {consolidatedRequirements.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  No package-linked ingredient usage is available for this date yet.
                </div>
              ) : (
                <div className="divide-y">
                  {consolidatedRequirements.map((item) => (
                    <div key={`${item.purchaseItemId}-${item.sourceStore}-events`} className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {item.itemName} • {getStoreDisplayName(stores, item.sourceStore)}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        Events: {item.eventNames.join(', ')} • Dishes: {item.linkedDishes.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {metrics.shortageLines > 0 ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {metrics.shortageLines} ingredient line(s) are short against live store stock. Complete GRNs or store transfers before final issue.
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
