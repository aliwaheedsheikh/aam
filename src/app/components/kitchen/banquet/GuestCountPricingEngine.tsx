import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw, TrendingUp } from 'lucide-react';
import { formatCurrencyPKR } from '../../../lib/locale';
import {
  applyGuestCountScenarioStatus,
  calculateGuestCountQuotation,
  DEFAULT_QUOTATION_SCENARIO_GUEST_COUNTS,
  getBestProfitScenario,
  getMenuPackageQuotationSource,
  QUOTATION_TARGET_FOOD_COST_PERCENT,
  QUOTATION_TARGET_MARGIN_PERCENT,
} from '../../../lib/menuPackageQuotation';
import type { GuestCountQuotationResult } from '../../../lib/menuPackageQuotation';
import type { MenuPackage } from '../types';

interface GuestCountPricingEngineProps {
  menuPackages: MenuPackage[];
}

const compactLabelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const compactInputClass =
  'h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-slate-100';
const compactTableHeadClass = 'px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const compactTableCellClass = 'px-2.5 py-1.5 align-top text-sm text-slate-700';
const compactMetricCardClass = 'rounded border border-slate-200 bg-white px-2.5 py-2';
const DEFAULT_REDUCTION_STEP = 100;
const RATE_REDUCTION_OPTIONS = [0, 50, 100] as const;

const formatPackageTypeLabel = (packageType: string) => packageType.replace(/-/g, ' ');

const getStatusClassName = (status: GuestCountQuotationResult['status']) => {
  switch (status) {
    case 'Healthy':
      return 'border-green-200 bg-green-50 text-green-700';
    case 'Low Margin':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'Loss Making':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'Selling price required':
      return 'border-slate-200 bg-slate-100 text-slate-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
};

const getRecommendedStatusLabel = (scenario: GuestCountQuotationResult | null) => {
  if (!scenario) {
    return 'Pending';
  }

  if (scenario.isBestTotalProfit) {
    return 'Best Total Profit';
  }

  if (scenario.isRecommended) {
    return 'Recommended for Front Office';
  }

  return scenario.status;
};

export function GuestCountPricingEngine({ menuPackages }: GuestCountPricingEngineProps) {
  const approvedPackages = useMemo(
    () =>
      menuPackages
        .filter(
          (menuPackage) =>
            menuPackage.module === 'banquet' &&
            menuPackage.status === 'approved' &&
            Number(menuPackage.totalCostPerHead) > 0,
        )
        .sort((left, right) => left.packageName.localeCompare(right.packageName)),
    [menuPackages],
  );

  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [baselineGuestCount, setBaselineGuestCount] = useState(100);
  const [marginPerGuest, setMarginPerGuest] = useState(0);
  const [targetFoodCostPercent, setTargetFoodCostPercent] = useState(QUOTATION_TARGET_FOOD_COST_PERCENT);
  const [targetMarginPercent, setTargetMarginPercent] = useState(QUOTATION_TARGET_MARGIN_PERCENT);
  const [rateReductionStep, setRateReductionStep] = useState<number>(DEFAULT_REDUCTION_STEP);
  const [scenarioOverrides, setScenarioOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!approvedPackages.length) {
      setSelectedPackageId('');
      return;
    }

    setSelectedPackageId((current) =>
      current && approvedPackages.some((menuPackage) => menuPackage.id === current)
        ? current
        : approvedPackages[0].id,
    );
  }, [approvedPackages]);

  const selectedPackage = useMemo(
    () => approvedPackages.find((menuPackage) => menuPackage.id === selectedPackageId) || null,
    [approvedPackages, selectedPackageId],
  );
  const quotationSource = useMemo(
    () => (selectedPackage ? getMenuPackageQuotationSource(selectedPackage) : null),
    [selectedPackage],
  );

  useEffect(() => {
    if (!quotationSource) {
      setBaselineGuestCount(100);
      setMarginPerGuest(0);
      setTargetFoodCostPercent(QUOTATION_TARGET_FOOD_COST_PERCENT);
      setTargetMarginPercent(QUOTATION_TARGET_MARGIN_PERCENT);
      setRateReductionStep(DEFAULT_REDUCTION_STEP);
      setScenarioOverrides({});
      return;
    }

    setBaselineGuestCount(quotationSource.baselineGuestCount || 100);
    setMarginPerGuest(
      Math.max(quotationSource.baseSellingPricePerGuest - quotationSource.basePackageCostPerGuest, 0),
    );
    setTargetFoodCostPercent(QUOTATION_TARGET_FOOD_COST_PERCENT);
    setTargetMarginPercent(QUOTATION_TARGET_MARGIN_PERCENT);
    setRateReductionStep(DEFAULT_REDUCTION_STEP);
    setScenarioOverrides({});
  }, [quotationSource]);

  const scenarioGuestCounts = useMemo(
    () =>
      Array.from(new Set([...DEFAULT_QUOTATION_SCENARIO_GUEST_COUNTS, Math.max(Number(baselineGuestCount) || 0, 0)]))
        .filter((value) => value > 0)
        .sort((left, right) => left - right),
    [baselineGuestCount],
  );

  const baseCostPerGuest = quotationSource ? quotationSource.basePackageCostPerGuest : 0;
  const baselineMenuCost = baseCostPerGuest * Math.max(Number(baselineGuestCount) || 0, 0);
  const baseSellingPricePerGuest = baseCostPerGuest + Math.max(Number(marginPerGuest) || 0, 0);

  const getAutoSuggestedRate = (guestCount: number) => {
    if (guestCount <= baselineGuestCount) {
      return baseSellingPricePerGuest;
    }

    const slabsAboveBaseline = Math.ceil((guestCount - baselineGuestCount) / 100);
    return Math.max(baseSellingPricePerGuest - slabsAboveBaseline * rateReductionStep, 0);
  };

  const comparisonScenarios = useMemo(
    () =>
      applyGuestCountScenarioStatus(
        scenarioGuestCounts.map((scenarioGuestCount) =>
          calculateGuestCountQuotation({
            baselineGuestCount,
            baselineMenuCost,
            guestCount: scenarioGuestCount,
            sellingPricePerGuest:
              Number(
                scenarioOverrides[String(scenarioGuestCount)] ?? getAutoSuggestedRate(scenarioGuestCount),
              ) || 0,
            targetFoodCostPercent,
            targetMarginPercent,
          }),
        ),
      ),
    [
      baselineGuestCount,
      baselineMenuCost,
      scenarioGuestCounts,
      scenarioOverrides,
      targetFoodCostPercent,
      targetMarginPercent,
      baseSellingPricePerGuest,
      rateReductionStep,
    ],
  );

  const bestScenario = useMemo(() => getBestProfitScenario(comparisonScenarios), [comparisonScenarios]);
  const baselineScenario =
    comparisonScenarios.find((scenario) => scenario.guestCount === baselineGuestCount) ||
    comparisonScenarios[0] ||
    null;

  const baselineLineItems = useMemo(() => {
    if (!selectedPackage) {
      return [];
    }

    const storedBaselineGuests = Math.max(
      Number(selectedPackage.menuEstimate?.baselineGuests) ||
        Number(selectedPackage.minimumGuests) ||
        100,
      1,
    );
    const scaleFactor = Math.max(Number(baselineGuestCount) || 0, 0) / storedBaselineGuests;

    const fixedLines = selectedPackage.dishes.map((dish) => {
      const baseQuantity =
        selectedPackage.menuEstimate?.fixedItemQuantities?.[dish.dishId] ??
        dish.quantityPerHead * storedBaselineGuests;

      return {
        id: `fixed-${dish.dishId}`,
        itemName: dish.dishName,
        itemType: 'Fixed Item',
        quantity: baseQuantity * scaleFactor,
        unit: selectedPackage.menuEstimate?.fixedItemUnits?.[dish.dishId] || dish.unit,
        detail: `${dish.variantLabel || 'Default variant'} | ${dish.preparationArea.replace(/-/g, ' ')}`,
      };
    });

    const choiceLines = (selectedPackage.choiceGroups || []).map((choiceGroup) => {
      const selectedDishId =
        selectedPackage.menuEstimate?.choiceGroupSelections?.[choiceGroup.id] ||
        choiceGroup.defaultDishId ||
        choiceGroup.dishes[0]?.dishId;
      const selectedDish =
        choiceGroup.dishes.find((dish) => dish.dishId === selectedDishId) ||
        choiceGroup.dishes[0] ||
        null;
      const baseQuantity =
        selectedPackage.menuEstimate?.choiceGroupQuantities?.[choiceGroup.id] ??
        (selectedDish ? selectedDish.quantityPerHead * storedBaselineGuests : 0);

      return {
        id: `choice-${choiceGroup.id}`,
        itemName: choiceGroup.groupName || 'Choice Group',
        itemType: 'Choice Group',
        quantity: baseQuantity * scaleFactor,
        unit: selectedPackage.menuEstimate?.choiceGroupUnits?.[choiceGroup.id] || selectedDish?.unit || '',
        detail: selectedDish
          ? `${selectedDish.dishName} | ${choiceGroup.costingMethod.replace(/-/g, ' ')}`
          : 'No representative dish selected',
      };
    });

    return [...fixedLines, ...choiceLines];
  }, [baselineGuestCount, selectedPackage]);

  const handleScenarioRateChange = (guestCount: number, value: number) => {
    setScenarioOverrides((current) => ({
      ...current,
      [String(guestCount)]: Math.max(Number(value) || 0, 0),
    }));
  };

  const handleResetScenarioRate = (guestCount: number) => {
    setScenarioOverrides((current) => {
      const nextState = { ...current };
      delete nextState[String(guestCount)];
      return nextState;
    });
  };

  if (!approvedPackages.length) {
    return (
      <div className="flex h-full flex-col bg-white">
        <div className="border-b border-gray-200 bg-white px-3 py-2">
          <h2 className="text-base font-bold text-gray-900">Menu Guest Count Rate Evaluation</h2>
          <p className="text-xs text-gray-600">Approve menu packages in Layer 4 before using Layer 5 guest-count evaluation.</p>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="rounded border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
            <div className="text-sm font-semibold text-slate-900">No approved menu packages available</div>
            <div className="mt-1 text-sm text-slate-600">
              This screen only reads approved package cost and menu estimate data from Menu Package Builder.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-gray-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-gray-900">Menu Guest Count Rate Evaluation</h2>
            <p className="text-xs text-gray-600">
              Uses approved menu package chef estimate and Layer 4 cost only. Reservation quotation fields are excluded here.
            </p>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
            Layer 5 evaluation only
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-7">
          <div className="xl:col-span-2">
            <label className={compactLabelClass}>Menu Package</label>
            <select
              value={selectedPackageId}
              onChange={(event) => setSelectedPackageId(event.target.value)}
              className={compactInputClass}
            >
              {approvedPackages.map((menuPackage) => (
                <option key={menuPackage.id} value={menuPackage.id}>
                  {menuPackage.packageName} | {formatPackageTypeLabel(menuPackage.packageType)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={compactLabelClass}>Baseline Guests</label>
            <input
              type="number"
              value={baselineGuestCount}
              onChange={(event) => setBaselineGuestCount(Math.max(Number(event.target.value) || 0, 0))}
              className={compactInputClass}
            />
          </div>
          <div>
            <label className={compactLabelClass}>Margin / Guest</label>
            <input
              type="number"
              step="0.01"
              value={marginPerGuest}
              onChange={(event) => setMarginPerGuest(Math.max(Number(event.target.value) || 0, 0))}
              className={compactInputClass}
            />
          </div>
          <div>
            <label className={compactLabelClass}>Base Selling / Guest</label>
            <div className={`${compactInputClass} flex items-center bg-slate-100 font-semibold text-slate-900`}>
              {formatCurrencyPKR(baseSellingPricePerGuest)}
            </div>
          </div>
          <div>
            <label className={compactLabelClass}>Target Food Cost %</label>
            <input
              type="number"
              step="0.01"
              value={targetFoodCostPercent}
              onChange={(event) => setTargetFoodCostPercent(Math.max(Number(event.target.value) || 0, 0))}
              className={compactInputClass}
            />
          </div>
          <div>
            <label className={compactLabelClass}>Target Margin %</label>
            <input
              type="number"
              step="0.01"
              value={targetMarginPercent}
              onChange={(event) => setTargetMarginPercent(Math.max(Number(event.target.value) || 0, 0))}
              className={compactInputClass}
            />
          </div>
        </div>

        <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_180px]">
          <div className="rounded border border-slate-200 bg-white px-2.5 py-1.5">
            <div className="whitespace-normal break-words text-sm font-semibold text-slate-900" title={quotationSource?.packageName}>
              {quotationSource?.packageName}
            </div>
            <div className="mt-0.5 whitespace-normal break-words text-[11px] text-slate-600">
              {quotationSource ? formatPackageTypeLabel(quotationSource.packageType) : ''}
              {selectedPackage?.description ? ` | ${selectedPackage.description}` : ''}
            </div>
          </div>
          <div>
            <label className={compactLabelClass}>Reduce / Slab</label>
            <select
              value={rateReductionStep}
              onChange={(event) => setRateReductionStep(Number(event.target.value) || 0)}
              className={compactInputClass}
            >
              {RATE_REDUCTION_OPTIONS.map((step) => (
                <option key={step} value={step}>
                  {step === 0 ? 'No reduction' : `Rs. ${step} per slab`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white px-3 py-2">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
          <div className={compactMetricCardClass}>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Menu Cost / {baselineGuestCount || 0} Guests
            </div>
            <div className="font-semibold text-slate-900">{formatCurrencyPKR(baselineMenuCost)}</div>
          </div>
          <div className={compactMetricCardClass}>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Cost / Guest</div>
            <div className="font-semibold text-slate-900">{formatCurrencyPKR(baseCostPerGuest)}</div>
          </div>
          <div className={compactMetricCardClass}>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Profit / Guest</div>
            <div className={`font-semibold ${baseSellingPricePerGuest - baseCostPerGuest < 0 ? 'text-red-700' : 'text-slate-900'}`}>
              {formatCurrencyPKR(baseSellingPricePerGuest - baseCostPerGuest)}
            </div>
          </div>
          <div className={compactMetricCardClass}>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Food Cost %</div>
            <div className={`font-semibold ${baselineScenario && baselineScenario.foodCostPercent > targetFoodCostPercent ? 'text-amber-700' : 'text-slate-900'}`}>
              {baselineScenario ? `${baselineScenario.foodCostPercent.toFixed(2)}%` : '0.00%'}
            </div>
          </div>
          <div className={compactMetricCardClass}>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Recommended Status</div>
            <div className="font-semibold text-slate-900">{getRecommendedStatusLabel(baselineScenario)}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-3 py-2">
        <div className="space-y-2">
          {bestScenario ? (
            <div className="flex flex-wrap items-center gap-2 rounded border border-blue-200 bg-blue-50 px-2.5 py-2 text-[12px] text-blue-900">
              <TrendingUp className="size-4 shrink-0" />
              <span className="font-semibold">Negotiation guidance:</span>
              <span>
                Best total profit is currently {formatCurrencyPKR(bestScenario.totalProfit)} at {bestScenario.guestCount} guests
                with {formatCurrencyPKR(bestScenario.sellingPricePerGuest)} per guest.
              </span>
            </div>
          ) : null}

          <details className="rounded border border-slate-200 bg-white">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-900">
              Baseline Menu Details for {baselineGuestCount} Guests
            </summary>
            <div className="border-t border-slate-200">
              <div className="max-h-[260px] overflow-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className={compactTableHeadClass}>Menu Line</th>
                      <th className={compactTableHeadClass}>Type</th>
                      <th className={`${compactTableHeadClass} text-right`}>Qty</th>
                      <th className={compactTableHeadClass}>Unit</th>
                      <th className={compactTableHeadClass}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baselineLineItems.map((line) => (
                      <tr key={line.id} className="border-t border-slate-200">
                        <td className={`${compactTableCellClass} whitespace-normal break-words font-medium text-slate-900`}>
                          {line.itemName}
                        </td>
                        <td className={`${compactTableCellClass} whitespace-nowrap`}>{line.itemType}</td>
                        <td className={`${compactTableCellClass} whitespace-nowrap text-right font-medium text-slate-900`}>
                          {line.quantity.toFixed(2)}
                        </td>
                        <td className={`${compactTableCellClass} whitespace-nowrap`}>{line.unit || '-'}</td>
                        <td className={`${compactTableCellClass} whitespace-normal break-words text-[12px] text-slate-600`}>
                          {line.detail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>

          <section className="rounded border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Guest Count Scenario Table</h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Base selling starts from cost/guest + margin/guest. Larger guest counts can be discounted per slab or manually overridden.
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-600">
                <div>Baseline: {baselineGuestCount} guests</div>
                <div>Auto reduction: {rateReductionStep === 0 ? 'None' : `${formatCurrencyPKR(rateReductionStep)} per slab`}</div>
              </div>
            </div>
            <div className="max-h-[620px] overflow-auto">
              <table className="w-full min-w-[1220px] text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className={compactTableHeadClass}>Guest Count</th>
                    <th className={`${compactTableHeadClass} text-right`}>Suggested Rate / Guest</th>
                    <th className={`${compactTableHeadClass} text-right`}>Cost / Guest</th>
                    <th className={`${compactTableHeadClass} text-right`}>Profit / Guest</th>
                    <th className={`${compactTableHeadClass} text-right`}>Total Cost</th>
                    <th className={`${compactTableHeadClass} text-right`}>Total Selling</th>
                    <th className={`${compactTableHeadClass} text-right`}>Total Profit</th>
                    <th className={`${compactTableHeadClass} text-right`}>Food Cost %</th>
                    <th className={compactTableHeadClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonScenarios.map((scenario) => {
                    const hasManualOverride = Object.prototype.hasOwnProperty.call(
                      scenarioOverrides,
                      String(scenario.guestCount),
                    );

                    return (
                      <tr
                        key={scenario.guestCount}
                        className={`border-t border-slate-200 ${scenario.isBestTotalProfit ? 'bg-green-50/70' : 'bg-white'}`}
                      >
                        <td className={`${compactTableCellClass} whitespace-nowrap font-semibold text-slate-900`}>
                          {scenario.guestCount}
                        </td>
                        <td className={`${compactTableCellClass} text-right`}>
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="0.01"
                              value={scenario.sellingPricePerGuest}
                              onChange={(event) =>
                                handleScenarioRateChange(scenario.guestCount, Number(event.target.value))
                              }
                              className="h-8 w-28 rounded border border-slate-300 px-2 text-right text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-orange-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleResetScenarioRate(scenario.guestCount)}
                              disabled={!hasManualOverride}
                              className="inline-flex size-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
                              title="Reset to auto rate"
                            >
                              <RotateCcw className="size-3.5" />
                            </button>
                          </div>
                          <div className="mt-1 text-[10px] text-slate-500">
                            {hasManualOverride
                              ? `Manual | Auto ${formatCurrencyPKR(getAutoSuggestedRate(scenario.guestCount))}`
                              : 'Auto'}
                          </div>
                        </td>
                        <td className={`${compactTableCellClass} whitespace-nowrap text-right font-medium text-slate-900`}>
                          {formatCurrencyPKR(scenario.costPerGuest)}
                        </td>
                        <td className={`${compactTableCellClass} whitespace-nowrap text-right font-medium ${scenario.profitPerGuest < 0 ? 'text-red-700' : 'text-slate-900'}`}>
                          {formatCurrencyPKR(scenario.profitPerGuest)}
                        </td>
                        <td className={`${compactTableCellClass} whitespace-nowrap text-right font-medium text-slate-900`}>
                          {formatCurrencyPKR(scenario.totalMenuCost)}
                        </td>
                        <td className={`${compactTableCellClass} whitespace-nowrap text-right font-medium text-slate-900`}>
                          {formatCurrencyPKR(scenario.totalSellingAmount)}
                        </td>
                        <td className={`${compactTableCellClass} whitespace-nowrap text-right font-semibold ${scenario.totalProfit < 0 ? 'text-red-700' : 'text-slate-900'}`}>
                          {formatCurrencyPKR(scenario.totalProfit)}
                        </td>
                        <td className={`${compactTableCellClass} whitespace-nowrap text-right font-medium ${scenario.foodCostPercent > targetFoodCostPercent ? 'text-amber-700' : 'text-slate-900'}`}>
                          {scenario.foodCostPercent.toFixed(2)}%
                        </td>
                        <td className={compactTableCellClass}>
                          <div className="flex flex-wrap gap-1">
                            <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium ${getStatusClassName(scenario.status)}`}>
                              {scenario.status}
                            </span>
                            {scenario.isBestTotalProfit ? (
                              <span className="inline-flex rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[11px] font-medium text-green-700">
                                Best Total Profit
                              </span>
                            ) : null}
                            {scenario.isRecommended ? (
                              <span className="inline-flex rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">
                                Recommended for Front Office
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12px] text-slate-700">
            Formula: menu cost for any guest count = cost/guest × guest count. Base selling/guest = cost/guest + margin/guest.
            Scenario rate starts from the base selling rate, then reduces by the configured slab step unless manually overridden.
          </div>
        </div>
      </div>
    </div>
  );
}
