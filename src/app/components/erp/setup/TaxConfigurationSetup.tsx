import { useMemo, useState } from 'react';
import { CheckCircle2, Edit2, Plus, Save, Search, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import {
  defaultSetupTaxes,
  loadSetupTaxes,
  saveSetupTaxes,
  type SetupTaxDefinition,
} from './setupMasterData';

interface TaxConfigurationSetupProps {
  userName: string;
  compact?: boolean;
  hideAudit?: boolean;
}

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-3 py-2 text-sm text-slate-700 align-middle';

const taxBasisOptions = [
  { id: 'full-invoice', name: 'Full Invoice Amount' },
  { id: 'agreed-taxable', name: 'Agreed Taxable Amount' },
  { id: 'service-based', name: 'Service-Based Amount' },
] as const;

function formatDate(value?: Date | string) {
  if (!value) return '-';
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-PK');
}

const getTaxBasisName = (taxBasis: SetupTaxDefinition['taxBasis']) =>
  taxBasisOptions.find((option) => option.id === taxBasis)?.name || 'Tax basis';

const StatusBadge = ({ isActive }: { isActive: boolean }) => (
  <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${
    isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
  }`}>
    {isActive ? 'Active' : 'Inactive'}
  </span>
);

export function TaxConfigurationSetup({ userName, hideAudit = false }: TaxConfigurationSetupProps) {
  const loadedTaxes = loadSetupTaxes();
  const [taxes, setTaxes] = useState<SetupTaxDefinition[]>(loadedTaxes.length > 0 ? loadedTaxes : defaultSetupTaxes);
  const [selectedTax, setSelectedTax] = useState<SetupTaxDefinition | null>(
    (loadedTaxes.length > 0 ? loadedTaxes : defaultSetupTaxes)[0] ?? null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editedTax, setEditedTax] = useState<SetupTaxDefinition | null>(null);

  const filteredTaxes = useMemo(
    () =>
      taxes.filter((tax) => {
        const normalizedSearch = searchQuery.trim().toLowerCase();
        return (
          !normalizedSearch ||
          tax.taxName.toLowerCase().includes(normalizedSearch) ||
          tax.taxCode.toLowerCase().includes(normalizedSearch) ||
          getTaxBasisName(tax.taxBasis).toLowerCase().includes(normalizedSearch)
        );
      }),
    [taxes, searchQuery],
  );

  const metrics = useMemo(
    () => ({
      total: taxes.length,
      active: taxes.filter((tax) => tax.isActive).length,
      inactive: taxes.filter((tax) => !tax.isActive).length,
      showing: filteredTaxes.length,
    }),
    [taxes, filteredTaxes.length],
  );

  const persistTaxes = (nextTaxes: SetupTaxDefinition[]) => {
    setTaxes(nextTaxes);
    saveSetupTaxes(nextTaxes);
  };

  const activeTax = editedTax || selectedTax;
  const inputStateClass = `h-9 rounded border-slate-300 ${!isEditing ? 'bg-slate-50 text-slate-700' : 'bg-white'}`;
  const selectStateClass = `h-9 w-full rounded border border-slate-300 px-3 text-sm ${
    !isEditing ? 'bg-slate-50 text-slate-600' : 'bg-white text-slate-700'
  }`;

  const handleCreateNew = () => {
    const newTax: SetupTaxDefinition = {
      id: `temp-${Date.now()}`,
      taxName: '',
      taxCode: `TAX${String(taxes.length + 1).padStart(3, '0')}`,
      taxPercentage: 0,
      taxBasis: 'full-invoice',
      taxCalculationType: 'exclusive',
      applicableToFood: true,
      applicableToServices: true,
      applicableToDecor: true,
      effectiveDate: new Date().toISOString().split('T')[0],
      isActive: true,
      createdAt: new Date(),
      createdBy: userName,
      notes: '',
    };

    setEditedTax(newTax);
    setSelectedTax(newTax);
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEdit = () => {
    if (!selectedTax) return;
    setEditedTax({ ...selectedTax });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editedTax) return;

    if (!editedTax.taxName.trim()) {
      alert('Tax Name is required');
      return;
    }
    if (!editedTax.taxCode.trim()) {
      alert('Tax Code is required');
      return;
    }
    if (editedTax.taxPercentage < 0 || editedTax.taxPercentage > 100) {
      alert('Tax percentage must be between 0 and 100');
      return;
    }
    if (!editedTax.effectiveDate) {
      alert('Effective date is required');
      return;
    }
    if (!editedTax.taxBasis) {
      alert('Tax Basis is required');
      return;
    }

    const normalizedName = editedTax.taxName.trim().toLowerCase();
    const normalizedCode = editedTax.taxCode.trim().toLowerCase();
    const hasDuplicateName = taxes.some(
      (tax) => tax.id !== editedTax.id && tax.taxName.trim().toLowerCase() === normalizedName,
    );
    const hasDuplicateCode = taxes.some(
      (tax) => tax.id !== editedTax.id && tax.taxCode.trim().toLowerCase() === normalizedCode,
    );

    if (hasDuplicateName) {
      alert('A tax with this name already exists.');
      return;
    }

    if (hasDuplicateCode) {
      alert('A tax with this code already exists.');
      return;
    }

    if (isCreating) {
      const newTax = {
        ...editedTax,
        id: Date.now().toString(),
        taxName: editedTax.taxName.trim(),
        taxCode: editedTax.taxCode.trim(),
        createdAt: new Date(),
        createdBy: userName,
      };
      persistTaxes([...taxes, newTax]);
      setSelectedTax(newTax);
      setIsCreating(false);
    } else {
      const updatedTax = {
        ...editedTax,
        taxName: editedTax.taxName.trim(),
        taxCode: editedTax.taxCode.trim(),
        updatedAt: new Date(),
        updatedBy: userName,
      };
      persistTaxes(taxes.map((tax) => (tax.id === updatedTax.id ? updatedTax : tax)));
      setSelectedTax(updatedTax);
    }

    setEditedTax(null);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTax(null);
    setIsEditing(false);
    if (isCreating) {
      setSelectedTax(taxes[0] ?? null);
      setIsCreating(false);
    }
  };

  const handleDelete = () => {
    if (!selectedTax || !window.confirm(`Are you sure you want to delete "${selectedTax.taxName}"?`)) return;

    const remainingTaxes = taxes.filter((tax) => tax.id !== selectedTax.id);
    persistTaxes(remainingTaxes);
    setSelectedTax(remainingTaxes[0] ?? null);
    setEditedTax(null);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleToggleStatus = () => {
    if (!selectedTax) return;

    const updatedTax = { ...selectedTax, isActive: !selectedTax.isActive };
    persistTaxes(taxes.map((tax) => (tax.id === updatedTax.id ? updatedTax : tax)));
    setSelectedTax(updatedTax);

    if (editedTax?.id === updatedTax.id) {
      setEditedTax(updatedTax);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <h2 className="mr-2 text-sm font-semibold text-slate-900">Tax Configuration</h2>
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search tax name, code, or basis"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-9 rounded border-slate-300 pl-9"
            />
          </div>
          <Button onClick={handleCreateNew} disabled={isEditing} className="h-9 bg-blue-600 px-3 hover:bg-blue-700">
            <Plus className="mr-1.5 size-4" />
            New
          </Button>
        </div>

        <div className="border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span><strong className="text-slate-900">Definitions:</strong> {metrics.total}</span>
            <span><strong className="text-slate-900">Showing:</strong> {metrics.showing}</span>
            <span><strong className="text-slate-900">Active:</strong> {metrics.active}</span>
            <span><strong className="text-slate-900">Inactive:</strong> {metrics.inactive}</span>
            <span><strong className="text-slate-900">User:</strong> {userName}</span>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-h-0 overflow-hidden rounded border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <h3 className="text-sm font-semibold text-slate-900">Tax Register</h3>
            <span className="text-xs text-slate-500">{filteredTaxes.length} rows</span>
          </div>

          <div className="h-full overflow-auto pb-10">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr>
                  <th className={tableHeadClass}>Tax</th>
                  <th className={tableHeadClass}>Code</th>
                  <th className={`${tableHeadClass} text-right`}>Rate</th>
                  <th className={tableHeadClass}>Basis</th>
                  <th className={tableHeadClass}>Effective</th>
                  <th className={tableHeadClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTaxes.map((tax) => {
                  const isSelected = selectedTax?.id === tax.id;

                  return (
                    <tr
                      key={tax.id}
                      onClick={() => {
                        if (!isEditing) {
                          setSelectedTax(tax);
                        }
                      }}
                      className={`cursor-pointer border-t border-slate-200 ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                      } ${isEditing ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      <td className={tableCellClass}>
                        <div className="font-medium text-slate-900">{tax.taxName || 'Untitled Tax'}</div>
                      </td>
                      <td className={tableCellClass}>{tax.taxCode || '-'}</td>
                      <td className={`${tableCellClass} text-right font-medium text-slate-900`}>{tax.taxPercentage}%</td>
                      <td className={tableCellClass}>{getTaxBasisName(tax.taxBasis)}</td>
                      <td className={tableCellClass}>{formatDate(tax.effectiveDate)}</td>
                      <td className={tableCellClass}><StatusBadge isActive={tax.isActive} /></td>
                    </tr>
                  );
                })}
                {filteredTaxes.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={6}>
                      No tax definitions found for the current search.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="min-h-0 overflow-auto rounded border border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-3 py-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-900">
                {isCreating ? 'Create Tax Definition' : activeTax?.taxName || 'Select Tax Definition'}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {activeTax
                  ? `${activeTax.taxCode || 'No code'} - ${activeTax.isActive ? 'Active' : 'Inactive'}`
                  : 'No record selected'}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave} className="h-8 bg-emerald-600 hover:bg-emerald-700">
                    <Save className="mr-1 size-4" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel} className="h-8">
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={handleEdit} className="h-8" disabled={!selectedTax}>
                    <Edit2 className="mr-1 size-4" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleToggleStatus} className="h-8" disabled={!selectedTax}>
                    <CheckCircle2 className="mr-1 size-4" />
                    {selectedTax?.isActive ? 'Inactive' : 'Active'}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleDelete}
                    className="h-8 w-8 border-red-200 text-red-600 hover:bg-red-50"
                    disabled={!selectedTax}
                    aria-label="Delete tax definition"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {activeTax ? (
            <div className="space-y-4 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block text-sm font-medium text-slate-700">
                    Tax Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={activeTax.taxName}
                    onChange={(event) => setEditedTax({ ...activeTax, taxName: event.target.value })}
                    disabled={!isEditing}
                    placeholder="e.g. PRA"
                    className={inputStateClass}
                  />
                </div>

                <div>
                  <Label className="mb-1 block text-sm font-medium text-slate-700">
                    Tax Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={activeTax.taxCode}
                    onChange={(event) => setEditedTax({ ...activeTax, taxCode: event.target.value })}
                    disabled={!isEditing}
                    placeholder="e.g. TAX001"
                    className={inputStateClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block text-sm font-medium text-slate-700">
                    Percentage <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={activeTax.taxPercentage}
                      onChange={(event) =>
                        setEditedTax({
                          ...activeTax,
                          taxPercentage: parseFloat(event.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                      className={`${inputStateClass} pr-8`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
                  </div>
                </div>

                <div>
                  <Label className="mb-1 block text-sm font-medium text-slate-700">
                    Effective Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={activeTax.effectiveDate}
                    onChange={(event) => setEditedTax({ ...activeTax, effectiveDate: event.target.value })}
                    disabled={!isEditing}
                    className={inputStateClass}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1 block text-sm font-medium text-slate-700">
                  Tax Basis <span className="text-red-500">*</span>
                </Label>
                <select
                  value={activeTax.taxBasis}
                  onChange={(event) =>
                    setEditedTax({
                      ...activeTax,
                      taxBasis: event.target.value as SetupTaxDefinition['taxBasis'],
                    })
                  }
                  disabled={!isEditing}
                  className={selectStateClass}
                >
                  {taxBasisOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="mb-1 block text-sm font-medium text-slate-700">Notes</Label>
                <Textarea
                  value={activeTax.notes || ''}
                  onChange={(event) => setEditedTax({ ...activeTax, notes: event.target.value })}
                  disabled={!isEditing}
                  rows={4}
                  placeholder="Internal notes"
                  className={!isEditing ? 'bg-slate-50' : 'bg-white'}
                />
              </div>

              {!hideAudit ? (
                <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <div><strong className="text-slate-900">Created:</strong> {formatDate(activeTax.createdAt)} by {activeTax.createdBy || 'System'}</div>
                  <div className="mt-1">
                    <strong className="text-slate-900">Last Updated:</strong>{' '}
                    {activeTax.updatedAt
                      ? `${formatDate(activeTax.updatedAt)} by ${activeTax.updatedBy || 'System'}`
                      : 'No updates recorded'}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              Select a tax definition or create a new record.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
