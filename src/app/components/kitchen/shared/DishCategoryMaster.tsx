import { useMemo, useState } from 'react';
import { Edit2, Eye, Power, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDatePK } from '../../../lib/locale';
import { Dish, DishCategoryModule, DishCategoryStatus, KitchenDishCategory } from '../types';

interface DishCategoryMasterProps {
  module: DishCategoryModule;
  userName: string;
  categories: KitchenDishCategory[];
  dishes?: Dish[];
  onCategoriesChange: (categories: KitchenDishCategory[]) => void;
}

const moduleLabels: Record<DishCategoryModule, string> = {
  banquet: 'Banquet Kitchen',
  restaurant: 'Restaurant Kitchen',
  shared: 'Shared Kitchen',
};

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-3 py-2 text-sm text-slate-700 align-middle';
const inputClass = 'h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500';
const textareaClass = 'min-h-[64px] w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500';
const labelClass = 'mb-1 block text-xs font-medium text-slate-700';

const normalizeCategoryName = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const slugifyLegacyCode = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getCategoryCode = (category: KitchenDishCategory) => {
  if (category.categoryCode) {
    return category.categoryCode;
  }

  const idNumber = category.id.match(/(\d+)$/)?.[1];
  return idNumber ? `CAT-${String(Number(idNumber) || 0).padStart(4, '0')}` : category.code;
};

const getCategoryName = (category: KitchenDishCategory) => category.categoryName || category.name;
const getCategoryDescription = (category: KitchenDishCategory) => category.description || category.notes || '';

const generateCategoryCode = (categories: KitchenDishCategory[]) => {
  const maxCodeNumber = categories.reduce((max, category) => {
    const match = getCategoryCode(category).match(/^CAT-(\d+)$/i);
    return match ? Math.max(max, Number(match[1]) || 0) : max;
  }, 0);

  return `CAT-${String(maxCodeNumber + 1).padStart(4, '0')}`;
};

const getLinkedDishCount = (category: KitchenDishCategory, dishes: Dish[], currentModule: DishCategoryModule) =>
  dishes.filter((dish) => {
    const sameModule = category.module === 'shared' ? dish.module === currentModule : dish.module === category.module;
    return sameModule && (dish.category === category.code || dish.categoryId === category.code || dish.categoryId === category.categoryCode);
  }).length;

export function DishCategoryMaster({
  module,
  userName,
  categories,
  dishes = [],
  onCategoriesChange,
}: DishCategoryMasterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DishCategoryStatus>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<KitchenDishCategory | null>(null);
  const [viewMode, setViewMode] = useState(false);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formStatus, setFormStatus] = useState<DishCategoryStatus>('active');
  const [formNotes, setFormNotes] = useState('');

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.module === module || category.module === 'shared'),
    [categories, module],
  );

  const categoryRows = useMemo(
    () =>
      visibleCategories
        .map((category) => ({
          ...category,
          categoryCode: getCategoryCode(category),
          categoryName: getCategoryName(category),
          description: getCategoryDescription(category),
          linkedDishesCount: getLinkedDishCount(category, dishes, module),
        }))
        .filter((category) => {
          const search = searchTerm.trim().toLowerCase();
          const matchesSearch =
            !search ||
            category.categoryCode.toLowerCase().includes(search) ||
            category.categoryName.toLowerCase().includes(search);
          const matchesStatus = statusFilter === 'all' || category.status === statusFilter;
          return matchesSearch && matchesStatus;
        })
        .sort((left, right) => left.categoryName.localeCompare(right.categoryName)),
    [dishes, module, searchTerm, statusFilter, visibleCategories],
  );

  const metrics = useMemo(() => {
    const linkedDishes = visibleCategories.reduce(
      (sum, category) => sum + getLinkedDishCount(category, dishes, module),
      0,
    );

    return {
      total: visibleCategories.length,
      active: visibleCategories.filter((category) => category.status === 'active').length,
      inactive: visibleCategories.filter((category) => category.status === 'inactive').length,
      linkedDishes,
    };
  }, [dishes, module, visibleCategories]);

  const openDialog = (category: KitchenDishCategory | null, nextViewMode: boolean) => {
    if (!category) {
      setEditingCategory(null);
      setViewMode(false);
      setFormCode(generateCategoryCode(categories));
      setFormName('');
      setFormStatus('active');
      setFormNotes('');
      setDialogOpen(true);
      return;
    }

    setEditingCategory(category);
    setViewMode(nextViewMode);
    setFormCode(getCategoryCode(category));
    setFormName(getCategoryName(category));
    setFormStatus(category.status);
    setFormNotes(getCategoryDescription(category));
    setDialogOpen(true);
  };

  const handleSave = () => {
    const trimmedName = formName.trim().replace(/\s+/g, ' ');
    const trimmedDescription = formNotes.trim();

    if (!trimmedName) {
      toast.error('Category name is required');
      return;
    }

    const duplicate = categories.find(
      (category) =>
        category.module === module &&
        category.id !== editingCategory?.id &&
        normalizeCategoryName(getCategoryName(category)) === normalizeCategoryName(trimmedName),
    );

    if (duplicate) {
      toast.error('A dish category with this name already exists in this module');
      return;
    }

    const now = new Date();

    if (editingCategory) {
      onCategoriesChange(
        categories.map((category) =>
          category.id === editingCategory.id
            ? {
                ...category,
                categoryId: category.categoryId || category.id,
                categoryCode: formCode,
                categoryName: trimmedName,
                name: trimmedName,
                description: trimmedDescription || undefined,
                notes: trimmedDescription || undefined,
                linkedDishesCount: getLinkedDishCount(category, dishes, module),
                status: formStatus,
                updatedBy: userName,
                updatedAt: now,
              }
            : category,
        ),
      );
      toast.success('Category saved successfully');
    } else {
      const newCategoryId = `dish-category-${Date.now()}`;
      const newCategory: KitchenDishCategory = {
        id: newCategoryId,
        categoryId: newCategoryId,
        categoryCode: formCode,
        categoryName: trimmedName,
        code: formCode || slugifyLegacyCode(trimmedName),
        name: trimmedName,
        description: trimmedDescription || undefined,
        linkedDishesCount: 0,
        module,
        status: formStatus,
        notes: trimmedDescription || undefined,
        createdBy: userName,
        createdAt: now,
        updatedBy: userName,
        updatedAt: now,
      };
      onCategoriesChange([...categories, newCategory]);
      toast.success('Category saved successfully');
    }

    setDialogOpen(false);
  };

  const handleDeactivate = (category: KitchenDishCategory) => {
    const nextStatus: DishCategoryStatus = category.status === 'active' ? 'inactive' : 'active';
    const linkedDishesCount = getLinkedDishCount(category, dishes, module);
    const now = new Date();

    onCategoriesChange(
      categories.map((entry) =>
        entry.id === category.id
          ? {
              ...entry,
              categoryId: entry.categoryId || entry.id,
              categoryCode: getCategoryCode(entry),
              categoryName: getCategoryName(entry),
              description: getCategoryDescription(entry) || undefined,
              linkedDishesCount,
              status: nextStatus,
              updatedBy: userName,
              updatedAt: now,
            }
          : entry,
      ),
    );
    toast.success(`Category ${nextStatus === 'active' ? 'activated' : 'deactivated'}`);
  };

  const handleDeleteBlocked = (category: KitchenDishCategory) => {
    if (getLinkedDishCount(category, dishes, module) > 0) {
      toast.error('Category is used in dishes and cannot be deleted. Deactivate it instead.');
      return;
    }

    toast.info('Category deletion is not enabled in this master. Deactivate it instead.');
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <h2 className="mr-2 text-base font-semibold text-slate-900">Dish Category Master</h2>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Category Code or Category Name"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | DishCategoryStatus)}
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
            Add Category
          </button>
        </div>

        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span><strong className="text-slate-900">Module:</strong> {moduleLabels[module]}</span>
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
            <h3 className="text-sm font-semibold text-slate-900">Dish Category Register</h3>
            <span className="text-xs text-slate-500">{categoryRows.length} rows</span>
          </div>
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className={tableHeadClass}>Category Code</th>
                  <th className={tableHeadClass}>Category Name</th>
                  <th className={tableHeadClass}>Description / Notes</th>
                  <th className={`${tableHeadClass} text-right`}>Linked Dishes</th>
                  <th className={tableHeadClass}>Status</th>
                  <th className={tableHeadClass}>Created By</th>
                  <th className={tableHeadClass}>Updated At</th>
                  <th className={`${tableHeadClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categoryRows.map((category) => (
                  <tr key={category.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className={tableCellClass}>{category.categoryCode}</td>
                    <td className={`${tableCellClass} font-medium text-slate-900`}>{category.categoryName}</td>
                    <td className={tableCellClass}>
                      <span className="block max-w-[320px] truncate">{category.description || '-'}</span>
                    </td>
                    <td className={`${tableCellClass} text-right`}>{category.linkedDishesCount}</td>
                    <td className={tableCellClass}>
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${
                          category.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {category.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className={tableCellClass}>{category.createdBy}</td>
                    <td className={tableCellClass}>{formatDatePK(category.updatedAt)}</td>
                    <td className={`${tableCellClass} text-right`}>
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openDialog(category, true)}
                          className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                          title="View"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          onClick={() => openDialog(category, false)}
                          className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                          title="Edit"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDeactivate(category)}
                          className={`rounded p-1.5 ${
                            category.status === 'active'
                              ? 'text-slate-600 hover:bg-slate-100'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={category.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBlocked(category)}
                          className="hidden"
                          aria-label="Delete blocked"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {categoryRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={8}>
                      {searchTerm || statusFilter !== 'all'
                        ? 'No dish categories found matching your filters.'
                        : 'No dish categories yet. Click "Add Category" to get started.'}
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
                  {viewMode ? 'View Dish Category' : editingCategory ? 'Edit Dish Category' : 'Create Dish Category'}
                </h2>
                <p className="text-xs text-slate-500">Compact dish category master data</p>
              </div>
              <button onClick={() => setDialogOpen(false)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 p-3">
              <div>
                <label className={labelClass}>Category Code</label>
                <input type="text" value={formCode} readOnly className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Category Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  disabled={viewMode}
                  placeholder="e.g., Main Course, BBQ, Tandoor"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Description / Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(event) => setFormNotes(event.target.value)}
                  disabled={viewMode}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={formStatus}
                  onChange={(event) => setFormStatus(event.target.value as DishCategoryStatus)}
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
                  Save Category
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
