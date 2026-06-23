import { useMemo, useState } from 'react';
import { Edit2, Filter, Plus, Power, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { UnitFamily, UnitMaster, UnitStatus } from '../types';
import { DEFAULT_UNIT_MASTERS, formatUnitOptionLabel, normalizeUnitCode } from '../../../lib/unitConversion';

interface UnitMasterSetupProps {
  userName: string;
  units: UnitMaster[];
  onUnitsChange: (units: UnitMaster[]) => void;
  initialUsageFilter?: UnitFilter;
}

type UnitFilter = 'all' | 'purchase' | 'issue' | 'recipe' | 'yield' | 'sales';

const familyOptions: Array<{ value: UnitFamily; label: string }> = [
  { value: 'weight', label: 'Weight' },
  { value: 'volume', label: 'Volume' },
  { value: 'count', label: 'Count' },
  { value: 'package', label: 'Package' },
  { value: 'service', label: 'Sales / Service' },
];

const usageFilters: Array<{ value: UnitFilter; label: string }> = [
  { value: 'all', label: 'All Usage' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'issue', label: 'Issue' },
  { value: 'recipe', label: 'Recipe' },
  { value: 'yield', label: 'Yield' },
  { value: 'sales', label: 'Sales' },
];

const usageFlags = [
  { key: 'allowPurchase', label: 'Purchase' },
  { key: 'allowIssue', label: 'Issue' },
  { key: 'allowRecipe', label: 'Recipe' },
  { key: 'allowYield', label: 'Yield' },
  { key: 'allowSales', label: 'Sales' },
] as const;

const emptyUnitForm = {
  code: '',
  name: '',
  symbol: '',
  family: 'weight' as UnitFamily,
  baseUnitCode: '',
  conversionToBase: 1,
  allowPurchase: false,
  allowIssue: true,
  allowRecipe: true,
  allowYield: true,
  allowSales: false,
  status: 'active' as UnitStatus,
  notes: '',
};

export function UnitMasterSetup({
  userName,
  units,
  onUnitsChange,
  initialUsageFilter = 'all',
}: UnitMasterSetupProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [usageFilter, setUsageFilter] = useState<UnitFilter>(initialUsageFilter);
  const [statusFilter, setStatusFilter] = useState<'all' | UnitStatus>('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitMaster | null>(null);
  const [form, setForm] = useState(emptyUnitForm);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const unitRows = useMemo(
    () =>
      units
        .filter((unit) => {
          const matchesSearch =
            !normalizedSearch ||
            unit.code.toLowerCase().includes(normalizedSearch) ||
            unit.name.toLowerCase().includes(normalizedSearch) ||
            unit.symbol.toLowerCase().includes(normalizedSearch);
          const matchesStatus = statusFilter === 'all' || unit.status === statusFilter;
          const matchesUsage =
            usageFilter === 'all' ||
            (usageFilter === 'purchase' && unit.allowPurchase) ||
            (usageFilter === 'issue' && unit.allowIssue) ||
            (usageFilter === 'recipe' && unit.allowRecipe) ||
            (usageFilter === 'yield' && unit.allowYield) ||
            (usageFilter === 'sales' && unit.allowSales);

          return matchesSearch && matchesStatus && matchesUsage;
        })
        .sort((left, right) => {
          if (left.family !== right.family) {
            return left.family.localeCompare(right.family);
          }
          return left.code.localeCompare(right.code);
        }),
    [normalizedSearch, statusFilter, units, usageFilter],
  );

  const metrics = useMemo(
    () => ({
      total: units.length,
      active: units.filter((unit) => unit.status === 'active').length,
      purchase: units.filter((unit) => unit.status === 'active' && unit.allowPurchase).length,
      sales: units.filter((unit) => unit.status === 'active' && unit.allowSales).length,
    }),
    [units],
  );

  const resetForm = () => {
    setForm(emptyUnitForm);
    setEditingUnit(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (unit: UnitMaster) => {
    setEditingUnit(unit);
    setForm({
      code: unit.code,
      name: unit.name,
      symbol: unit.symbol,
      family: unit.family,
      baseUnitCode: unit.baseUnitCode || unit.code,
      conversionToBase: unit.conversionToBase || 1,
      allowPurchase: unit.allowPurchase,
      allowIssue: unit.allowIssue,
      allowRecipe: unit.allowRecipe,
      allowYield: unit.allowYield,
      allowSales: unit.allowSales,
      status: unit.status,
      notes: unit.notes || '',
    });
    setDialogOpen(true);
  };

  const updateForm = <Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = () => {
    const code = normalizeUnitCode(form.code || form.symbol || form.name);
    const name = form.name.trim();
    const symbol = form.symbol.trim() || code;
    const baseUnitCode = normalizeUnitCode(form.baseUnitCode || code);
    const conversionToBase = Number(form.conversionToBase) || 1;

    if (!code) {
      toast.error('Unit code is required');
      return;
    }

    if (!name) {
      toast.error('Unit name is required');
      return;
    }

    if (conversionToBase <= 0) {
      toast.error('Conversion factor must be greater than 0');
      return;
    }

    const duplicate = units.find((unit) => unit.code === code && unit.id !== editingUnit?.id);
    if (duplicate) {
      toast.error('A unit with this code already exists');
      return;
    }

    if (editingUnit) {
      onUnitsChange(
        units.map((unit) =>
          unit.id === editingUnit.id
            ? {
                ...unit,
                code,
                name,
                symbol,
                family: form.family,
                baseUnitCode,
                conversionToBase,
                allowPurchase: form.allowPurchase,
                allowIssue: form.allowIssue,
                allowRecipe: form.allowRecipe,
                allowYield: form.allowYield,
                allowSales: form.allowSales,
                status: form.status,
                notes: form.notes.trim() || undefined,
                updatedAt: new Date(),
              }
            : unit,
        ),
      );
      toast.success('Unit updated successfully');
    } else {
      const newUnit: UnitMaster = {
        id: `unit-${Date.now()}`,
        code,
        name,
        symbol,
        family: form.family,
        baseUnitCode,
        conversionToBase,
        allowPurchase: form.allowPurchase,
        allowIssue: form.allowIssue,
        allowRecipe: form.allowRecipe,
        allowYield: form.allowYield,
        allowSales: form.allowSales,
        status: form.status,
        notes: form.notes.trim() || undefined,
        createdBy: userName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      onUnitsChange([...units, newUnit]);
      toast.success('Unit added successfully');
    }

    setDialogOpen(false);
  };

  const handleToggleStatus = (unit: UnitMaster) => {
    const nextStatus: UnitStatus = unit.status === 'active' ? 'inactive' : 'active';
    onUnitsChange(
      units.map((item) => (item.id === unit.id ? { ...item, status: nextStatus, updatedAt: new Date() } : item)),
    );
    toast.success(`Unit ${nextStatus === 'active' ? 'activated' : 'deactivated'}`);
  };

  const handleRestoreDefaults = () => {
    const existingCodes = new Set(units.map((unit) => unit.code));
    const missingDefaults = DEFAULT_UNIT_MASTERS.filter((unit) => !existingCodes.has(unit.code));

    if (missingDefaults.length === 0) {
      toast.info('Default units are already available');
      return;
    }

    onUnitsChange([...units, ...missingDefaults.map((unit) => ({ ...unit, id: `${unit.id}-${Date.now()}` }))]);
    toast.success(`${missingDefaults.length} default units restored`);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Unit Setup</h1>
            <p className="text-sm text-gray-600 mt-1">Controlled measurement units for kitchen costing, purchases, and menu engineering</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestoreDefaults}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RotateCcw className="w-4 h-4" />
              Restore Defaults
            </button>
            <button
              onClick={openAddDialog}
              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Unit
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search units..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <select
              value={usageFilter}
              onChange={(event) => setUsageFilter(event.target.value as UnitFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {usageFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | UnitStatus)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200 text-sm">
          <span><span className="text-gray-600">Total:</span> <strong>{metrics.total}</strong></span>
          <span><span className="text-gray-600">Active:</span> <strong className="text-green-700">{metrics.active}</strong></span>
          <span><span className="text-gray-600">Purchase:</span> <strong>{metrics.purchase}</strong></span>
          <span><span className="text-gray-600">Sales:</span> <strong>{metrics.sales}</strong></span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {unitRows.length === 0 ? (
          <div className="text-center py-12 text-gray-600">No units found for the current filters.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Family</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Conversion</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Usage</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {unitRows.map((unit) => (
                  <tr key={unit.id} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{formatUnitOptionLabel(unit)}</div>
                      <div className="text-xs text-gray-500">{unit.code}</div>
                    </td>
                    <td className="px-4 py-3 text-sm capitalize text-gray-700">{unit.family}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      1 {unit.code} = {unit.conversionToBase || 1} {unit.baseUnitCode || unit.code}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {usageFlags
                          .filter((flag) => unit[flag.key])
                          .map((flag) => (
                            <span key={flag.key} className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              {flag.label}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          unit.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {unit.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditDialog(unit)}
                          className="rounded p-1 text-blue-600 hover:bg-blue-50"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(unit)}
                          className="rounded p-1 text-gray-600 hover:bg-gray-100"
                          title={unit.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">{editingUnit ? 'Edit Unit' : 'Add Unit'}</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Unit Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => {
                    updateForm('name', event.target.value);
                    if (!editingUnit) {
                      updateForm('code', normalizeUnitCode(event.target.value));
                    }
                  }}
                  placeholder="Kilogram"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Code *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(event) => updateForm('code', normalizeUnitCode(event.target.value))}
                  placeholder="kg"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Symbol</label>
                <input
                  type="text"
                  value={form.symbol}
                  onChange={(event) => updateForm('symbol', event.target.value)}
                  placeholder="kg"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Family *</label>
                <select
                  value={form.family}
                  onChange={(event) => updateForm('family', event.target.value as UnitFamily)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500"
                >
                  {familyOptions.map((family) => (
                    <option key={family.value} value={family.value}>
                      {family.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Base Unit Code</label>
                <input
                  type="text"
                  value={form.baseUnitCode}
                  onChange={(event) => updateForm('baseUnitCode', normalizeUnitCode(event.target.value))}
                  placeholder="gm"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Conversion To Base *</label>
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={form.conversionToBase}
                  onChange={(event) => updateForm('conversionToBase', Number(event.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  1 {form.code || 'unit'} = {form.conversionToBase || 1} {form.baseUnitCode || form.code || 'base'}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={form.status}
                  onChange={(event) => updateForm('status', event.target.value as UnitStatus)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">Allowed Usage</label>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                  {usageFlags.map((flag) => (
                    <label key={flag.key} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form[flag.key]}
                        onChange={(event) => updateForm(flag.key, event.target.checked)}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      {flag.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => updateForm('notes', event.target.value)}
                  rows={3}
                  placeholder="Use for conversion assumptions, package size notes, or costing rules"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setDialogOpen(false)}
                className="rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
              >
                {editingUnit ? 'Update' : 'Add'} Unit
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
