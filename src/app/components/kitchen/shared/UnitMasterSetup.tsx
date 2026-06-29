import { useMemo, useState } from 'react';
import { Filter, Power, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { UnitFamily, UnitMaster, UnitStatus } from '../types';
import {
  formatUnitOptionLabel,
  getHiddenCompatibilityUnits,
  getUnitSetupCatalog,
  normalizeUnitCode,
} from '../../../lib/unitConversion';

interface UnitMasterSetupProps {
  userName: string;
  units: UnitMaster[];
  onUnitsChange: (units: UnitMaster[]) => void;
  initialUsageFilter?: 'all' | 'purchase' | 'issue' | 'recipe' | 'yield' | 'sales';
}

type UnitFamilyFilter = 'all' | UnitFamily;

const familyFilters: Array<{ value: UnitFamilyFilter; label: string }> = [
  { value: 'all', label: 'All Families' },
  { value: 'weight', label: 'Weight' },
  { value: 'volume', label: 'Volume' },
  { value: 'count', label: 'Count' },
  { value: 'package', label: 'Package' },
];

const familyLabels: Record<Exclude<UnitFamilyFilter, 'all'>, string> = {
  weight: 'Weight',
  volume: 'Volume',
  count: 'Count',
  package: 'Package',
  service: 'Service',
};

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-3 py-2 text-sm text-slate-700 align-middle';
const quietButtonClass =
  'inline-flex h-8 items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50';

export function UnitMasterSetup({ userName, units, onUnitsChange }: UnitMasterSetupProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [familyFilter, setFamilyFilter] = useState<UnitFamilyFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UnitStatus>('active');

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const unitRows = useMemo(() => {
    return getUnitSetupCatalog(units)
      .filter((unit) => {
        const matchesSearch =
          !normalizedSearch ||
          unit.code.toLowerCase().includes(normalizedSearch) ||
          unit.name.toLowerCase().includes(normalizedSearch) ||
          unit.symbol.toLowerCase().includes(normalizedSearch);
        const matchesFamily = familyFilter === 'all' || unit.family === familyFilter;
        const matchesStatus = statusFilter === 'all' || unit.status === statusFilter;
        return matchesSearch && matchesFamily && matchesStatus;
      })
      .sort((left, right) => {
        if (left.family !== right.family) {
          return left.family.localeCompare(right.family);
        }
        return left.code.localeCompare(right.code);
      });
  }, [familyFilter, normalizedSearch, statusFilter, units]);

  const hiddenCompatibilityUnits = useMemo(() => getHiddenCompatibilityUnits(units), [units]);

  const metrics = useMemo(
    () => ({
      total: getUnitSetupCatalog(units).length,
      active: getUnitSetupCatalog(units).filter((unit) => unit.status === 'active').length,
      fixedConversions: getUnitSetupCatalog(units).filter((unit) => (unit.conversionToBase || 1) > 0).length,
      hiddenCompatibility: hiddenCompatibilityUnits.length,
    }),
    [hiddenCompatibilityUnits.length, units],
  );

  const persistUnitChange = (targetUnit: UnitMaster, changes: Partial<UnitMaster>) => {
    const normalizedCode = normalizeUnitCode(targetUnit.code);
    const existingIndex = units.findIndex(
      (unit) => unit.id === targetUnit.id || normalizeUnitCode(unit.code) === normalizedCode,
    );

    if (existingIndex >= 0) {
      onUnitsChange(
        units.map((unit, index) =>
          index === existingIndex
            ? {
                ...unit,
                ...changes,
                updatedAt: new Date(),
              }
            : unit,
        ),
      );
      return;
    }

    onUnitsChange([
      ...units,
      {
        ...targetUnit,
        ...changes,
        createdBy: targetUnit.createdBy || userName,
        createdAt: targetUnit.createdAt || new Date(),
        updatedAt: new Date(),
      },
    ]);
  };

  const handleToggleStatus = (unit: UnitMaster) => {
    const nextStatus: UnitStatus = unit.status === 'active' ? 'inactive' : 'active';
    persistUnitChange(unit, { status: nextStatus });
    toast.success(`Unit ${nextStatus === 'active' ? 'activated' : 'deactivated'}`);
  };

  const handleRestoreDefaults = () => {
    const existingCodes = new Set(units.map((unit) => normalizeUnitCode(unit.code)));
    const missingDefaults = getUnitSetupCatalog().filter((unit) => !existingCodes.has(normalizeUnitCode(unit.code)));

    if (missingDefaults.length === 0) {
      toast.info('Standard units are already available');
      return;
    }

    onUnitsChange([...units, ...missingDefaults]);
    toast.success(`${missingDefaults.length} standard units restored`);
  };

  const hiddenCompatibilityLabel = hiddenCompatibilityUnits
    .slice(0, 6)
    .map((unit) => unit.code)
    .join(', ');

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-900">Unit Setup</h1>
            <p className="mt-1 text-sm text-slate-600">
              System unit dictionary for standard conversions. Package content stays in Purchase Item setup.
            </p>
          </div>
          <button onClick={handleRestoreDefaults} className={quietButtonClass}>
            <RotateCcw className="h-4 w-4" />
            Restore Standard Units
          </button>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_160px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search unit code or name..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={familyFilter}
              onChange={(event) => setFamilyFilter(event.target.value as UnitFamilyFilter)}
              className="h-9 w-full rounded border border-slate-300 bg-white px-2.5 text-sm text-slate-700"
            >
              {familyFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | UnitStatus)}
            className="h-9 rounded border border-slate-300 bg-white px-2.5 text-sm text-slate-700"
          >
            <option value="active">Active Only</option>
            <option value="all">All Status</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
          <span>
            Dictionary Units: <strong className="text-slate-900">{metrics.total}</strong>
          </span>
          <span>
            Active: <strong className="text-emerald-700">{metrics.active}</strong>
          </span>
          <span>
            Fixed Conversions: <strong className="text-slate-900">{metrics.fixedConversions}</strong>
          </span>
          <span>
            Hidden Compatibility Units: <strong className="text-amber-700">{metrics.hiddenCompatibility}</strong>
          </span>
        </div>

        {hiddenCompatibilityUnits.length > 0 ? (
          <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Legacy sales and compatibility units remain stored internally and stay hidden from this dictionary.
            {hiddenCompatibilityLabel ? ` Visible examples: ${hiddenCompatibilityLabel}` : ''}
            {hiddenCompatibilityUnits.length > 6 ? ` +${hiddenCompatibilityUnits.length - 6} more.` : '.'}
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="overflow-hidden rounded border border-slate-200">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className={tableHeadClass}>Unit</th>
                <th className={tableHeadClass}>Family</th>
                <th className={tableHeadClass}>Fixed Conversion</th>
                <th className={tableHeadClass}>Status</th>
                <th className={`${tableHeadClass} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {unitRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                    No units match the current filters.
                  </td>
                </tr>
              ) : (
                unitRows.map((unit) => (
                  <tr key={`${unit.id}-${unit.code}`} className="border-t border-slate-200">
                    <td className={tableCellClass}>
                      <div className="font-medium text-slate-900">{formatUnitOptionLabel(unit)}</div>
                      <div className="text-xs text-slate-500">{unit.code}</div>
                    </td>
                    <td className={tableCellClass}>{familyLabels[unit.family]}</td>
                    <td className={tableCellClass}>
                      1 {unit.code} = {unit.conversionToBase || 1} {unit.baseUnitCode || unit.code}
                    </td>
                    <td className={tableCellClass}>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          unit.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {unit.status}
                      </span>
                    </td>
                    <td className={`${tableCellClass} text-right`}>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(unit)}
                        className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        title={unit.status === 'active' ? 'Deactivate unit' : 'Activate unit'}
                      >
                        <Power className="h-3.5 w-3.5" />
                        {unit.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
