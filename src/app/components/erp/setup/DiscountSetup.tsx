import { useMemo, useState } from 'react';
import { CheckCircle2, Edit2, Plus, Save, Search, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  defaultSetupDiscounts,
  loadSetupDiscounts,
  saveSetupDiscounts,
  type SetupDiscount,
} from './setupMasterData';

interface DiscountSetupProps {
  userName: string;
  compact?: boolean;
  hideAudit?: boolean;
}

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-3 py-2 text-sm text-slate-700 align-middle';

function formatDate(value?: Date) {
  if (!value || Number.isNaN(value.getTime())) return '-';
  return value.toLocaleDateString('en-PK');
}

const formatDiscountType = (value: SetupDiscount['discountType']) =>
  value === 'percentage' ? 'Percentage' : 'Fixed per head';

const formatMaximumValue = (discount: SetupDiscount) =>
  discount.discountType === 'percentage'
    ? `${discount.maximumValue}%`
    : `Rs. ${discount.maximumValue}`;

const StatusBadge = ({ isActive }: { isActive: boolean }) => (
  <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${
    isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
  }`}>
    {isActive ? 'Active' : 'Inactive'}
  </span>
);

export function DiscountSetup({ userName, hideAudit = false }: DiscountSetupProps) {
  const loadedDiscounts = loadSetupDiscounts();
  const [discounts, setDiscounts] = useState<SetupDiscount[]>(
    loadedDiscounts.length > 0 ? loadedDiscounts : defaultSetupDiscounts,
  );
  const [selectedDiscount, setSelectedDiscount] = useState<SetupDiscount | null>(discounts[0] ?? null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editedDiscount, setEditedDiscount] = useState<SetupDiscount | null>(null);

  const filteredDiscounts = useMemo(
    () =>
      discounts.filter((discount) =>
        discount.discountCategory.toLowerCase().includes(searchQuery.trim().toLowerCase()),
      ),
    [discounts, searchQuery],
  );

  const metrics = useMemo(
    () => ({
      total: discounts.length,
      active: discounts.filter((discount) => discount.isActive).length,
      inactive: discounts.filter((discount) => !discount.isActive).length,
      percentage: discounts.filter((discount) => discount.discountType === 'percentage').length,
      fixed: discounts.filter((discount) => discount.discountType === 'fixed-per-head').length,
      showing: filteredDiscounts.length,
    }),
    [discounts, filteredDiscounts.length],
  );

  const persistDiscounts = (nextDiscounts: SetupDiscount[]) => {
    setDiscounts(nextDiscounts);
    saveSetupDiscounts(nextDiscounts);
  };

  const activeDiscount = editedDiscount || selectedDiscount;
  const inputStateClass = `h-9 rounded border-slate-300 ${!isEditing ? 'bg-slate-50 text-slate-700' : 'bg-white'}`;
  const selectStateClass = `h-9 w-full rounded border border-slate-300 px-3 text-sm ${
    !isEditing ? 'bg-slate-50 text-slate-600' : 'bg-white text-slate-700'
  }`;

  const handleCreateNew = () => {
    const newDiscount: SetupDiscount = {
      id: `temp-${Date.now()}`,
      discountCategory: '',
      discountType: 'fixed-per-head',
      maximumValue: 0,
      isActive: true,
      createdAt: new Date(),
      createdBy: userName,
    };

    setEditedDiscount(newDiscount);
    setSelectedDiscount(newDiscount);
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEdit = () => {
    if (!selectedDiscount) return;
    setEditedDiscount({ ...selectedDiscount });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editedDiscount) return;

    if (!editedDiscount.discountCategory.trim()) {
      alert('Discount Category is required');
      return;
    }

    const normalizedCategory = editedDiscount.discountCategory.trim().toLowerCase();
    const hasDuplicateCategory = discounts.some(
      (discount) =>
        discount.id !== editedDiscount.id &&
        discount.discountCategory.trim().toLowerCase() === normalizedCategory,
    );

    if (hasDuplicateCategory) {
      alert('A discount with this category already exists.');
      return;
    }

    if (editedDiscount.maximumValue < 0) {
      alert('Maximum Value cannot be negative');
      return;
    }

    if (editedDiscount.discountType === 'percentage' && editedDiscount.maximumValue > 100) {
      alert('Percentage discount cannot exceed 100');
      return;
    }

    if (isCreating) {
      const newDiscount = {
        ...editedDiscount,
        id: Date.now().toString(),
        createdAt: new Date(),
        createdBy: userName,
      };
      const nextDiscounts = [...discounts, newDiscount];
      persistDiscounts(nextDiscounts);
      setSelectedDiscount(newDiscount);
      setIsCreating(false);
    } else {
      const updatedDiscount = {
        ...editedDiscount,
        updatedAt: new Date(),
        updatedBy: userName,
      };
      const nextDiscounts = discounts.map((discount) =>
        discount.id === updatedDiscount.id ? updatedDiscount : discount,
      );
      persistDiscounts(nextDiscounts);
      setSelectedDiscount(updatedDiscount);
    }

    setEditedDiscount(null);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedDiscount(null);
    setIsEditing(false);
    if (isCreating) {
      setSelectedDiscount(discounts[0] ?? null);
      setIsCreating(false);
    }
  };

  const handleDelete = () => {
    if (!selectedDiscount || !window.confirm(`Are you sure you want to delete "${selectedDiscount.discountCategory}"?`)) {
      return;
    }

    const remainingDiscounts = discounts.filter((discount) => discount.id !== selectedDiscount.id);
    persistDiscounts(remainingDiscounts);
    setSelectedDiscount(remainingDiscounts[0] ?? null);
    setEditedDiscount(null);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleToggleStatus = () => {
    if (!selectedDiscount) return;

    const updatedDiscount = { ...selectedDiscount, isActive: !selectedDiscount.isActive };
    persistDiscounts(discounts.map((discount) => (discount.id === updatedDiscount.id ? updatedDiscount : discount)));
    setSelectedDiscount(updatedDiscount);

    if (editedDiscount?.id === updatedDiscount.id) {
      setEditedDiscount(updatedDiscount);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <h2 className="mr-2 text-sm font-semibold text-slate-900">Discount Rules</h2>
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search discount category"
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
            <span><strong className="text-slate-900">Rules:</strong> {metrics.total}</span>
            <span><strong className="text-slate-900">Showing:</strong> {metrics.showing}</span>
            <span><strong className="text-slate-900">Active:</strong> {metrics.active}</span>
            <span><strong className="text-slate-900">Inactive:</strong> {metrics.inactive}</span>
            <span><strong className="text-slate-900">Fixed:</strong> {metrics.fixed}</span>
            <span><strong className="text-slate-900">Percentage:</strong> {metrics.percentage}</span>
            <span><strong className="text-slate-900">User:</strong> {userName}</span>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-h-0 overflow-hidden rounded border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <h3 className="text-sm font-semibold text-slate-900">Discount Register</h3>
            <span className="text-xs text-slate-500">{filteredDiscounts.length} rows</span>
          </div>

          <div className="h-full overflow-auto pb-10">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr>
                  <th className={tableHeadClass}>Category</th>
                  <th className={tableHeadClass}>Type</th>
                  <th className={`${tableHeadClass} text-right`}>Maximum</th>
                  <th className={tableHeadClass}>Status</th>
                  <th className={tableHeadClass}>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredDiscounts.map((discount) => {
                  const isSelected = selectedDiscount?.id === discount.id;

                  return (
                    <tr
                      key={discount.id}
                      onClick={() => {
                        if (!isEditing) {
                          setSelectedDiscount(discount);
                        }
                      }}
                      className={`cursor-pointer border-t border-slate-200 ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                      } ${isEditing ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      <td className={tableCellClass}>
                        <div className="font-medium text-slate-900">{discount.discountCategory || 'Untitled Discount'}</div>
                      </td>
                      <td className={tableCellClass}>{formatDiscountType(discount.discountType)}</td>
                      <td className={`${tableCellClass} text-right font-medium text-slate-900`}>{formatMaximumValue(discount)}</td>
                      <td className={tableCellClass}><StatusBadge isActive={discount.isActive} /></td>
                      <td className={tableCellClass}>{formatDate(discount.createdAt)}</td>
                    </tr>
                  );
                })}
                {filteredDiscounts.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={5}>
                      No discount rules found for the current search.
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
                {isCreating ? 'Create Discount Rule' : activeDiscount?.discountCategory || 'Select Discount Rule'}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {activeDiscount
                  ? `${formatDiscountType(activeDiscount.discountType)} - ${activeDiscount.isActive ? 'Active' : 'Inactive'}`
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
                  <Button size="sm" variant="outline" onClick={handleEdit} className="h-8" disabled={!selectedDiscount}>
                    <Edit2 className="mr-1 size-4" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleToggleStatus} className="h-8" disabled={!selectedDiscount}>
                    <CheckCircle2 className="mr-1 size-4" />
                    {selectedDiscount?.isActive ? 'Inactive' : 'Active'}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleDelete}
                    className="h-8 w-8 border-red-200 text-red-600 hover:bg-red-50"
                    disabled={!selectedDiscount}
                    aria-label="Delete discount rule"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {activeDiscount ? (
            <div className="space-y-4 p-4">
              <div>
                <Label className="mb-1 block text-sm font-medium text-slate-700">
                  Discount Category <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={activeDiscount.discountCategory}
                  onChange={(event) => setEditedDiscount({ ...activeDiscount, discountCategory: event.target.value })}
                  disabled={!isEditing}
                  placeholder="e.g. Business Strategy"
                  className={inputStateClass}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block text-sm font-medium text-slate-700">Discount Type</Label>
                  <select
                    value={activeDiscount.discountType}
                    onChange={(event) =>
                      setEditedDiscount({
                        ...activeDiscount,
                        discountType: event.target.value as SetupDiscount['discountType'],
                      })
                    }
                    disabled={!isEditing}
                    className={selectStateClass}
                  >
                    <option value="fixed-per-head">Fixed per head</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>

                <div>
                  <Label className="mb-1 block text-sm font-medium text-slate-700">Maximum Value</Label>
                  <Input
                    type="number"
                    value={activeDiscount.maximumValue}
                    onChange={(event) =>
                      setEditedDiscount({
                        ...activeDiscount,
                        maximumValue: Number(event.target.value) || 0,
                      })
                    }
                    disabled={!isEditing}
                    className={inputStateClass}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1 block text-sm font-medium text-slate-700">Status</Label>
                <div className="flex h-9 items-center rounded border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                  {activeDiscount.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>

              {!hideAudit ? (
                <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <div><strong className="text-slate-900">Created:</strong> {formatDate(activeDiscount.createdAt)} by {activeDiscount.createdBy || 'System'}</div>
                  <div className="mt-1">
                    <strong className="text-slate-900">Last Updated:</strong>{' '}
                    {activeDiscount.updatedAt
                      ? `${formatDate(activeDiscount.updatedAt)} by ${activeDiscount.updatedBy || 'System'}`
                      : 'No updates recorded'}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              Select a discount rule or create a new record.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
