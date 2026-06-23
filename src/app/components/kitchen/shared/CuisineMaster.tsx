import { useMemo, useState } from 'react';
import { Edit2, Eye, Power, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDatePK } from '../../../lib/locale';
import { Cuisine, CuisineStatus, Dish, KitchenModule } from '../types';

interface CuisineMasterProps {
  module: KitchenModule;
  userName: string;
  cuisines: Cuisine[];
  dishes?: Dish[];
  onCuisinesChange: (cuisines: Cuisine[]) => void;
}

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-3 py-2 text-sm text-slate-700 align-middle';
const inputClass = 'h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500';
const textareaClass = 'min-h-[64px] w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500';
const labelClass = 'mb-1 block text-xs font-medium text-slate-700';

const normalizeCuisineName = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const getCuisineCode = (cuisine: Cuisine) => {
  if (cuisine.cuisineCode) {
    return cuisine.cuisineCode;
  }

  const idNumber = cuisine.id.match(/(\d+)$/)?.[1];
  return idNumber ? `CUS-${String(Number(idNumber) || 0).padStart(4, '0')}` : cuisine.id;
};
const getCuisineName = (cuisine: Cuisine) => cuisine.cuisineName || cuisine.name;

const generateCuisineCode = (cuisines: Cuisine[]) => {
  const maxCodeNumber = cuisines.reduce((max, cuisine) => {
    const match = getCuisineCode(cuisine).match(/^CUS-(\d+)$/i);
    return match ? Math.max(max, Number(match[1]) || 0) : max;
  }, 0);

  return `CUS-${String(maxCodeNumber + 1).padStart(4, '0')}`;
};

const getLinkedDishCount = (cuisine: Cuisine, dishes: Dish[]) =>
  dishes.filter((dish) => dish.module === cuisine.module && dish.cuisineId === cuisine.id).length;

export function CuisineMaster({ module, userName, cuisines, dishes = [], onCuisinesChange }: CuisineMasterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CuisineStatus>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCuisine, setEditingCuisine] = useState<Cuisine | null>(null);
  const [viewMode, setViewMode] = useState(false);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<CuisineStatus>('active');

  const moduleCuisines = useMemo(
    () => cuisines.filter((cuisine) => cuisine.module === module),
    [cuisines, module],
  );
  const cuisineRows = useMemo(
    () =>
      moduleCuisines
        .map((cuisine) => ({
          ...cuisine,
          cuisineCode: getCuisineCode(cuisine),
          cuisineName: getCuisineName(cuisine),
          linkedDishesCount: getLinkedDishCount(cuisine, dishes),
        }))
        .filter((cuisine) => {
          const search = searchTerm.trim().toLowerCase();
          const matchesSearch =
            !search ||
            cuisine.cuisineCode.toLowerCase().includes(search) ||
            cuisine.cuisineName.toLowerCase().includes(search);
          const matchesStatus = statusFilter === 'all' || cuisine.status === statusFilter;

          return matchesSearch && matchesStatus;
        })
        .sort((left, right) => left.cuisineName.localeCompare(right.cuisineName)),
    [dishes, moduleCuisines, searchTerm, statusFilter],
  );

  const metrics = useMemo(() => {
    const linkedDishes = moduleCuisines.reduce((sum, cuisine) => sum + getLinkedDishCount(cuisine, dishes), 0);

    return {
      total: moduleCuisines.length,
      active: moduleCuisines.filter((cuisine) => cuisine.status === 'active').length,
      inactive: moduleCuisines.filter((cuisine) => cuisine.status === 'inactive').length,
      linkedDishes,
    };
  }, [dishes, moduleCuisines]);

  const openDialog = (cuisine: Cuisine | null, nextViewMode: boolean) => {
    if (!cuisine) {
      setEditingCuisine(null);
      setViewMode(false);
      setFormCode(generateCuisineCode(cuisines));
      setFormName('');
      setFormDescription('');
      setFormStatus('active');
      setDialogOpen(true);
      return;
    }

    setEditingCuisine(cuisine);
    setViewMode(nextViewMode);
    setFormCode(getCuisineCode(cuisine));
    setFormName(getCuisineName(cuisine));
    setFormDescription(cuisine.description || '');
    setFormStatus(cuisine.status);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const trimmedName = formName.trim().replace(/\s+/g, ' ');
    const trimmedDescription = formDescription.trim();

    if (!trimmedName) {
      toast.error('Cuisine name is required');
      return;
    }

    const duplicate = cuisines.find(
      (cuisine) =>
        cuisine.module === module &&
        cuisine.id !== editingCuisine?.id &&
        normalizeCuisineName(getCuisineName(cuisine)) === normalizeCuisineName(trimmedName),
    );

    if (duplicate) {
      toast.error('A cuisine with this name already exists in this module');
      return;
    }

    const now = new Date();

    if (editingCuisine) {
      onCuisinesChange(
        cuisines.map((cuisine) =>
          cuisine.id === editingCuisine.id
            ? {
                ...cuisine,
                cuisineId: cuisine.cuisineId || cuisine.id,
                cuisineCode: formCode,
                cuisineName: trimmedName,
                name: trimmedName,
                description: trimmedDescription || undefined,
                linkedDishesCount: getLinkedDishCount(cuisine, dishes),
                status: formStatus,
                updatedBy: userName,
                updatedAt: now,
              }
            : cuisine,
        ),
      );
      toast.success('Cuisine saved successfully');
    } else {
      const newCuisineId = `cuisine-${Date.now()}`;
      const newCuisine: Cuisine = {
        id: newCuisineId,
        cuisineId: newCuisineId,
        cuisineCode: formCode,
        cuisineName: trimmedName,
        name: trimmedName,
        description: trimmedDescription || undefined,
        linkedDishesCount: 0,
        module,
        status: formStatus,
        createdBy: userName,
        createdAt: now,
        updatedBy: userName,
        updatedAt: now,
      };
      onCuisinesChange([...cuisines, newCuisine]);
      toast.success('Cuisine saved successfully');
    }

    setDialogOpen(false);
  };

  const handleDeactivate = (cuisine: Cuisine) => {
    const nextStatus: CuisineStatus = cuisine.status === 'active' ? 'inactive' : 'active';
    const linkedDishesCount = getLinkedDishCount(cuisine, dishes);
    const now = new Date();

    onCuisinesChange(
      cuisines.map((entry) =>
        entry.id === cuisine.id
          ? {
              ...entry,
              cuisineId: entry.cuisineId || entry.id,
              cuisineCode: getCuisineCode(entry),
              cuisineName: getCuisineName(entry),
              linkedDishesCount,
              status: nextStatus,
              updatedBy: userName,
              updatedAt: now,
            }
          : entry,
      ),
    );
    toast.success(`Cuisine ${nextStatus === 'active' ? 'activated' : 'deactivated'}`);
  };

  const handleDeleteBlocked = (cuisine: Cuisine) => {
    if (getLinkedDishCount(cuisine, dishes) > 0) {
      toast.error('Cuisine is used in dishes and cannot be deleted. Deactivate it instead.');
      return;
    }

    toast.info('Cuisine deletion is not enabled in this master. Deactivate it instead.');
  };

  const moduleTitle = module === 'banquet' ? 'Banquet & Catering Kitchen' : 'Restaurant Kitchen';

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <h2 className="mr-2 text-base font-semibold text-slate-900">Cuisine Master</h2>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Cuisine Code or Cuisine Name"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | CuisineStatus)}
            className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={() => openDialog(null, false)}
            className="inline-flex h-9 items-center gap-2 rounded border border-orange-600 bg-orange-600 px-3 text-sm font-medium text-white hover:bg-orange-700"
          >
            <Plus className="size-4" />
            Add Cuisine
          </button>
        </div>

        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span><strong className="text-slate-900">Module:</strong> {moduleTitle}</span>
            <span><strong className="text-slate-900">Total:</strong> {metrics.total}</span>
            <span><strong className="text-slate-900">Active:</strong> {metrics.active}</span>
            <span><strong className="text-slate-900">Inactive:</strong> {metrics.inactive}</span>
            <span><strong className="text-slate-900">Linked Dishes:</strong> {metrics.linkedDishes}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="overflow-hidden rounded border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <h3 className="text-sm font-semibold text-slate-900">Cuisine Register</h3>
            <span className="text-xs text-slate-500">{cuisineRows.length} rows</span>
          </div>
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className={tableHeadClass}>Cuisine Code</th>
                  <th className={tableHeadClass}>Cuisine Name</th>
                  <th className={tableHeadClass}>Description</th>
                  <th className={`${tableHeadClass} text-right`}>Linked Dishes</th>
                  <th className={tableHeadClass}>Status</th>
                  <th className={tableHeadClass}>Created By</th>
                  <th className={tableHeadClass}>Updated At</th>
                  <th className={`${tableHeadClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cuisineRows.map((cuisine) => (
                  <tr key={cuisine.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className={tableCellClass}>{cuisine.cuisineCode}</td>
                    <td className={`${tableCellClass} font-medium text-slate-900`}>{cuisine.cuisineName}</td>
                    <td className={tableCellClass}>
                      <span className="block max-w-[320px] truncate">{cuisine.description || '-'}</span>
                    </td>
                    <td className={`${tableCellClass} text-right`}>{cuisine.linkedDishesCount}</td>
                    <td className={tableCellClass}>
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${
                          cuisine.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {cuisine.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className={tableCellClass}>{cuisine.createdBy}</td>
                    <td className={tableCellClass}>{formatDatePK(cuisine.updatedAt)}</td>
                    <td className={`${tableCellClass} text-right`}>
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openDialog(cuisine, true)}
                          className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                          title="View"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          onClick={() => openDialog(cuisine, false)}
                          className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                          title="Edit"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDeactivate(cuisine)}
                          className={`rounded p-1.5 ${
                            cuisine.status === 'active'
                              ? 'text-slate-600 hover:bg-slate-100'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={cuisine.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBlocked(cuisine)}
                          className="hidden"
                          aria-label="Delete blocked"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {cuisineRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={8}>
                      {searchTerm || statusFilter !== 'all'
                        ? 'No cuisines found matching your filters.'
                        : 'No cuisines yet. Click "Add Cuisine" to get started.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="flex max-h-[94vh] w-full max-w-lg flex-col rounded bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {viewMode ? 'View Cuisine' : editingCuisine ? 'Edit Cuisine' : 'Create Cuisine'}
                </h2>
                <p className="text-xs text-slate-500">Compact cuisine master data</p>
              </div>
              <button onClick={() => setDialogOpen(false)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 p-3">
              <div>
                <label className={labelClass}>Cuisine Code</label>
                <input type="text" value={formCode} readOnly className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Cuisine Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  disabled={viewMode}
                  placeholder="e.g., Pakistani, Chinese, Continental"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={formDescription}
                  onChange={(event) => setFormDescription(event.target.value)}
                  disabled={viewMode}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={formStatus}
                  onChange={(event) => setFormStatus(event.target.value as CuisineStatus)}
                  disabled={viewMode}
                  className={inputClass}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                onClick={() => setDialogOpen(false)}
                className="h-8 rounded border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-white"
              >
                {viewMode ? 'Close' : 'Cancel'}
              </button>
              {!viewMode ? (
                <button
                  onClick={handleSave}
                  className="h-8 rounded border border-orange-600 bg-orange-600 px-3 text-sm font-medium text-white hover:bg-orange-700"
                >
                  Save Cuisine
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
