import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, RotateCcw, TrendingUp } from 'lucide-react';
import { formatCurrencyPKR, formatNumberPK } from '../../../lib/locale';
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
  onOpenCommercialCosting?: (menuPackageId: string) => void;
}

const compactLabelClass = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const compactInputClass =
  'h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:bg-slate-50 disabled:text-slate-500';
const compactTableHeadClass =
  'border-b border-slate-200 bg-slate-50 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-600 whitespace-nowrap';
const compactTableCellClass =
  'border-b border-slate-100 px-2 py-2 align-middle text-[12px] text-slate-700 whitespace-nowrap';
const compactMetricCardClass = 'flex flex-col justify-center rounded border border-slate-200 bg-white px-2.5 py-2';
const quietButtonClass =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400';

const DEFAULT_REDUCTION_STEP = 100;
const RATE_REDUCTION_OPTIONS = [0, 50, 100] as const;
const CUSTOM_REDUCTION_OPTION = 'custom';

const roundWholeNumber = (value: number | string | null | undefined) => {
  const numericValue = typeof value === 'string' ? Number(value) : Number(value ?? 0);
  return Number.isFinite(numericValue) ? Math.round(numericValue) : 0;
};

const formatRoundedPercent = (value: number) => `${formatNumberPK(Math.round(Number(value) || 0))}%`;

const formatPackageTypeLabel = (packageType: string) => packageType.replace(/-/g, ' ');

const getStatusClassName = (status: GuestCountQuotationResult['status']) => {
  switch (status) {
    case 'Healthy':
      return 'border-green-200 bg-green-100 text-green-850';
    case 'Low Margin':
      return 'border-amber-200 bg-amber-100 text-amber-850';
    case 'Loss Making':
      return 'border-red-200 bg-red-100 text-red-850';
    case 'Selling price required':
      return 'border-slate-200 bg-slate-100 text-slate-800';
    default:
      return 'border-slate-200 bg-slate-100 text-slate-850';
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
    return 'Recommended';
  }

  return scenario.status;
};

export function GuestCountPricingEngine({
  menuPackages,
  onOpenCommercialCosting,
}: GuestCountPricingEngineProps) {
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
  const [rateReductionPreset, setRateReductionPreset] = useState<string>(String(DEFAULT_REDUCTION_STEP));
  const [customRateReductionStep, setCustomRateReductionStep] = useState<number>(DEFAULT_REDUCTION_STEP);
  const [customScenarioGuestCount, setCustomScenarioGuestCount] = useState('');
  const [customScenarioGuestCounts, setCustomScenarioGuestCounts] = useState<number[]>([]);
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
      setRateReductionPreset(String(DEFAULT_REDUCTION_STEP));
      setCustomRateReductionStep(DEFAULT_REDUCTION_STEP);
      setCustomScenarioGuestCount('');
      setCustomScenarioGuestCounts([]);
      setScenarioOverrides({});
      return;
    }

    setBaselineGuestCount(roundWholeNumber(quotationSource.baselineGuestCount || 100));
    setMarginPerGuest(
      Math.max(
        roundWholeNumber(quotationSource.baseSellingPricePerGuest - quotationSource.basePackageCostPerGuest),
        0,
      ),
    );
    setTargetFoodCostPercent(QUOTATION_TARGET_FOOD_COST_PERCENT);
    setTargetMarginPercent(QUOTATION_TARGET_MARGIN_PERCENT);
    setRateReductionPreset(String(DEFAULT_REDUCTION_STEP));
    setCustomRateReductionStep(DEFAULT_REDUCTION_STEP);
    setCustomScenarioGuestCount('');
    setCustomScenarioGuestCounts([]);
    setScenarioOverrides({});
  }, [quotationSource]);

  const effectiveRateReductionStep =
    rateReductionPreset === CUSTOM_REDUCTION_OPTION
      ? Math.max(roundWholeNumber(customRateReductionStep), 0)
      : Math.max(roundWholeNumber(rateReductionPreset), 0);

  const scenarioGuestCounts = useMemo(
    () =>
      Array.from(
        new Set([
          ...DEFAULT_QUOTATION_SCENARIO_GUEST_COUNTS,
          Math.max(roundWholeNumber(baselineGuestCount), 0),
          ...customScenarioGuestCounts,
        ]),
      )
        .filter((value) => value > 0)
        .sort((left, right) => left - right),
    [baselineGuestCount, customScenarioGuestCounts],
  );

  const baseCostPerGuest = quotationSource ? quotationSource.basePackageCostPerGuest : 0;
  const baselineMenuCost = roundWholeNumber(baseCostPerGuest * Math.max(roundWholeNumber(baselineGuestCount), 0));
  const baseSellingPricePerGuest = Math.max(
    roundWholeNumber(baseCostPerGuest + Math.max(Number(marginPerGuest) || 0, 0)),
    0,
  );

  const getAutoSuggestedRate = (guestCount: number) => {
    if (guestCount <= baselineGuestCount) {
      return baseSellingPricePerGuest;
    }

    const slabsAboveBaseline = Math.ceil((guestCount - baselineGuestCount) / 100);
    return Math.max(
      roundWholeNumber(baseSellingPricePerGuest - slabsAboveBaseline * effectiveRateReductionStep),
      0,
    );
  };

  const comparisonScenarios = useMemo(
    () =>
      applyGuestCountScenarioStatus(
        scenarioGuestCounts.map((scenarioGuestCount) =>
          calculateGuestCountQuotation({
            baselineGuestCount,
            baselineMenuCost,
            guestCount: scenarioGuestCount,
            sellingPricePerGuest: roundWholeNumber(
              scenarioOverrides[String(scenarioGuestCount)] ?? getAutoSuggestedRate(scenarioGuestCount),
            ),
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
      effectiveRateReductionStep,
    ],
  );

  const bestScenario = useMemo(() => getBestProfitScenario(comparisonScenarios), [comparisonScenarios]);
  const baselineScenario =
    comparisonScenarios.find((scenario) => scenario.guestCount === baselineGuestCount) ||
    comparisonScenarios[0] ||
    null;

  const handleScenarioRateChange = (guestCount: number, value: number) => {
    setScenarioOverrides((current) => ({
      ...current,
      [String(guestCount)]: Math.max(roundWholeNumber(value), 0),
    }));
  };

  const handleBaseSellingPriceChange = (value: number) => {
    const nextBaseSellingPrice = Math.max(roundWholeNumber(value), 0);
    setMarginPerGuest(Math.max(roundWholeNumber(nextBaseSellingPrice - baseCostPerGuest), 0));
  };

  const handleAddCustomScenarioGuestCount = () => {
    const nextGuestCount = Math.max(roundWholeNumber(customScenarioGuestCount), 0);
    if (!nextGuestCount) {
      return;
    }

    setCustomScenarioGuestCounts((current) =>
      Array.from(new Set([...current, nextGuestCount])).sort((left, right) => left - right),
    );
    setCustomScenarioGuestCount('');
  };

  const handleRemoveCustomScenarioGuestCount = (guestCount: number) => {
    setCustomScenarioGuestCounts((current) => current.filter((value) => value !== guestCount));
    setScenarioOverrides((current) => {
      const nextState = { ...current };
      delete nextState[String(guestCount)];
      return nextState;
    });
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
        <div className="border-b border-slate-200 bg-white px-3 py-2">
          <h2 className="text-base font-semibold text-slate-900">Menu Guest Count Rate Evaluation</h2>
          <p className="text-xs text-slate-500">Approve menu packages before using guest-count rate evaluation.</p>
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
    <div className="flex h-[calc(100vh-140px)] flex-col overflow-hidden bg-slate-50">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Menu Guest Count Rate Evaluation</h2>
            <p className="text-xs text-slate-500">
              Compare guest count scenarios, margins, and yield optimizations to offer competitive pricing.
            </p>
          </div>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
            Front Office Assistant
          </span>
        </div>
      </div>

      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
          <div className="sm:col-span-2 md:col-span-2 lg:col-span-2">
            <label className={compactLabelClass}>Menu Package</label>
            <div className="flex gap-2">
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
              <button
                type="button"
                onClick={() => selectedPackage && onOpenCommercialCosting?.(selectedPackage.id)}
                disabled={!selectedPackage || !onOpenCommercialCosting}
                className={quietButtonClass}
                title="Open selected menu in Commercial Costing"
              >
                <ArrowUpRight className="size-3.5" />
                Commercial Costing
              </button>
            </div>
          </div>
          <div>
            <label className={compactLabelClass}>Baseline Guests</label>
            <input
              type="number"
              value={baselineGuestCount}
              onChange={(event) => setBaselineGuestCount(Math.max(roundWholeNumber(event.target.value), 0))}
              className={compactInputClass}
            />
          </div>
          <div>
            <label className={compactLabelClass}>Margin / Guest</label>
            <input
              type="number"
              step="1"
              value={marginPerGuest}
              onChange={(event) => setMarginPerGuest(Math.max(roundWholeNumber(event.target.value), 0))}
              className={compactInputClass}
            />
          </div>
          <div>
            <label className={compactLabelClass}>Base Selling / Guest</label>
            <input
              type="number"
              step="1"
              value={baseSellingPricePerGuest}
              onChange={(event) => handleBaseSellingPriceChange(Number(event.target.value))}
              className={compactInputClass}
            />
          </div>
          <div>
            <label className={compactLabelClass}>Target Food Cost %</label>
            <input
              type="number"
              step="1"
              value={targetFoodCostPercent}
              onChange={(event) => setTargetFoodCostPercent(Math.max(roundWholeNumber(event.target.value), 0))}
              className={compactInputClass}
            />
          </div>
          <div>
            <label className={compactLabelClass}>Target Margin %</label>
            <input
              type="number"
              step="1"
              value={targetMarginPercent}
              onChange={(event) => setTargetMarginPercent(Math.max(roundWholeNumber(event.target.value), 0))}
              className={compactInputClass}
            />
          </div>
          <div>
            <label className={compactLabelClass}>Reduce / Slab</label>
            <select
              value={rateReductionPreset}
              onChange={(event) => setRateReductionPreset(event.target.value)}
              className={compactInputClass}
            >
              {RATE_REDUCTION_OPTIONS.map((step) => (
                <option key={step} value={step}>
                  {step === 0 ? 'No reduction' : `Rs. ${step} per slab`}
                </option>
              ))}
              <option value={CUSTOM_REDUCTION_OPTION}>Custom</option>
            </select>
          </div>
          <div>
            {rateReductionPreset === CUSTOM_REDUCTION_OPTION ? (
              <>
                <label className={compactLabelClass}>Custom Slab Value</label>
                <input
                  type="number"
                  step="1"
                  value={customRateReductionStep}
                  onChange={(event) => setCustomRateReductionStep(Math.max(roundWholeNumber(event.target.value), 0))}
                  className={compactInputClass}
                />
              </>
            ) : (
              <>
                <label className={compactLabelClass}>Add Custom Guests</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={customScenarioGuestCount}
                    onChange={(event) => setCustomScenarioGuestCount(event.target.value)}
                    className={compactInputClass}
                    placeholder="e.g. 650"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomScenarioGuestCount}
                    className={quietButtonClass}
                  >
                    Add
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-2">
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
            <div className={compactMetricCardClass}>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Menu Cost / {formatNumberPK(baselineGuestCount)} Guests
              </div>
              <div className="text-sm font-semibold text-slate-900">{formatCurrencyPKR(baselineMenuCost)}</div>
            </div>
            <div className={compactMetricCardClass}>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Cost / Guest</div>
              <div className="text-sm font-semibold text-slate-900">{formatCurrencyPKR(baseCostPerGuest)}</div>
            </div>
            <div className={compactMetricCardClass}>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Base Selling / Guest</div>
              <div className="text-sm font-semibold text-slate-900">{formatCurrencyPKR(baseSellingPricePerGuest)}</div>
            </div>
            <div className={compactMetricCardClass}>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Food Cost %</div>
              <div
                className={`text-sm font-semibold ${
                  baselineScenario && baselineScenario.foodCostPercent > targetFoodCostPercent
                    ? 'text-amber-600'
                    : 'text-slate-950'
                }`}
              >
                {baselineScenario
                  ? `${formatRoundedPercent(baselineScenario.foodCostPercent)} / ${formatRoundedPercent(targetFoodCostPercent)}`
                  : `0% / ${formatRoundedPercent(targetFoodCostPercent)}`}
              </div>
            </div>
            <div className={compactMetricCardClass}>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Margin %</div>
              <div
                className={`text-sm font-semibold ${
                  baselineScenario && baselineScenario.marginPercent < targetMarginPercent
                    ? 'text-amber-600'
                    : 'text-slate-950'
                }`}
              >
                {baselineScenario
                  ? `${formatRoundedPercent(baselineScenario.marginPercent)} / ${formatRoundedPercent(targetMarginPercent)}`
                  : `0% / ${formatRoundedPercent(targetMarginPercent)}`}
              </div>
            </div>
            <div className={compactMetricCardClass}>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Rec. Status</div>
              <div className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                {baselineScenario && baselineScenario.status === 'Healthy' ? (
                  <span className="inline-block size-1.5 rounded-full bg-green-500" />
                ) : null}
                {getRecommendedStatusLabel(baselineScenario)}
              </div>
            </div>
          </div>

          {bestScenario ? (
            <div className="flex items-center gap-1.5 rounded border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs text-orange-850">
              <TrendingUp className="size-3.5 shrink-0 text-orange-600" />
              <div>
                <span className="font-semibold text-orange-950">Negotiation guidance:</span>{' '}
                Best total profit is <span className="font-semibold">{formatCurrencyPKR(bestScenario.totalProfit)}</span> at{' '}
                {formatNumberPK(bestScenario.guestCount)} guests.
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-3">
        <div className="flex h-full w-full flex-col overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
          <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Front Office Pricing Scenarios
              </h3>
              {customScenarioGuestCounts.length ? (
                <div className="flex flex-wrap gap-1">
                  {customScenarioGuestCounts.map((guestCount) => (
                    <span
                      key={guestCount}
                      className="inline-flex items-center gap-1 rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700"
                    >
                      {formatNumberPK(guestCount)}
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomScenarioGuestCount(guestCount)}
                        className="ml-0.5 text-[9px] font-bold hover:text-orange-950"
                        title="Remove custom guest count"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className={compactTableHeadClass}>Guests</th>
                  <th className={compactTableHeadClass}>Selling Rate / Guest</th>
                  <th className={`${compactTableHeadClass} text-right`}>Total Cost</th>
                  <th className={`${compactTableHeadClass} text-right`}>Total Selling</th>
                  <th className={`${compactTableHeadClass} text-right`}>Total Profit</th>
                  <th className={`${compactTableHeadClass} text-right`}>Food Cost</th>
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
                      className={`border-b border-slate-200 hover:bg-slate-50 ${
                        scenario.isBestTotalProfit ? 'bg-orange-50/20 font-medium' : 'bg-white'
                      }`}
                    >
                      <td className={`${compactTableCellClass} font-semibold text-slate-900`}>
                        {formatNumberPK(scenario.guestCount)}
                        {scenario.isBestTotalProfit ? (
                          <span className="ml-1 text-[10px] font-normal text-orange-600">(Best Yield)</span>
                        ) : null}
                      </td>
                      <td className={compactTableCellClass}>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="1"
                            value={roundWholeNumber(scenario.sellingPricePerGuest)}
                            onChange={(event) =>
                              handleScenarioRateChange(scenario.guestCount, Number(event.target.value))
                            }
                            className="h-8 w-24 rounded border border-slate-300 px-2 text-right text-xs text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleResetScenarioRate(scenario.guestCount)}
                            disabled={!hasManualOverride}
                            className="inline-flex size-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 disabled:bg-slate-50 disabled:text-slate-300"
                            title="Reset to default slab-discount rate"
                          >
                            <RotateCcw className="size-3" />
                          </button>
                        </div>
                        <div className="mt-0.5 px-1 text-[9px] text-slate-500">
                          {hasManualOverride ? 'Manual price' : 'Auto rate'}
                        </div>
                      </td>
                      <td className={`${compactTableCellClass} text-right font-medium text-slate-700`}>
                        {formatCurrencyPKR(scenario.totalMenuCost)}
                      </td>
                      <td className={`${compactTableCellClass} text-right font-semibold text-slate-900`}>
                        {formatCurrencyPKR(scenario.totalSellingAmount)}
                      </td>
                      <td
                        className={`${compactTableCellClass} text-right font-semibold ${
                          scenario.totalProfit < 0 ? 'text-red-600' : 'text-slate-900'
                        }`}
                      >
                        {formatCurrencyPKR(scenario.totalProfit)}
                      </td>
                      <td
                        className={`${compactTableCellClass} text-right ${
                          scenario.foodCostPercent > targetFoodCostPercent ? 'text-amber-600' : 'text-slate-900'
                        }`}
                      >
                        {formatRoundedPercent(scenario.foodCostPercent)}
                      </td>
                      <td className={compactTableCellClass}>
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${getStatusClassName(scenario.status)}`}
                          >
                            {scenario.status}
                          </span>
                          {scenario.isBestTotalProfit ? (
                            <span className="inline-flex items-center justify-center rounded border border-orange-200 bg-orange-100 px-1.5 py-0.5 text-[9px] font-semibold text-orange-850">
                              Best Yield
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

          <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-2 text-[10px] text-slate-500">
            <span className="font-semibold text-slate-700">Formula notes:</span> Target Food Cost and Target Margin
            set the profitability checks. Front office managers should aim to keep the scenario status{' '}
            <span className="font-bold text-green-700">Healthy</span>.
          </div>
        </div>
      </div>
    </div>
  );
}
