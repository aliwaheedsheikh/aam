import { useMemo, useState } from 'react';
import { AlertTriangle, Edit2, Plus, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  ProductionCostMethod,
  ProductionCostMethodCalculationType,
  ProductionCostMethodCostType,
  Recipe,
} from '../types';
import {
  getProductionCostMethodCostTypeLabel,
  getProductionCostMethodFormulaDescription,
  getProductionCostMethodInputRequired,
  getProductionCostMethodInventoryLabel,
  getProductionCostMethodLabel,
  getProductionCostMethodRecipeBehaviorPreview,
  getProductionCostMethodReferenceUnit,
  isProductionCostMethodDangerousChange,
  normalizeProductionCostMethod,
  productionCostMethodCalculationTypeOptions,
  productionCostMethodCostTypeOptions,
  slugifyProductionCostMethodCode,
} from '../../../lib/productionCostMethods';

interface ProductionCostMethodMasterProps {
  userName: string;
  methods: ProductionCostMethod[];
  recipes: Recipe[];
  onMethodsChange: (methods: ProductionCostMethod[]) => void;
}

type CostTypeFilter = 'all' | ProductionCostMethodCostType;

const compactInputClass =
  'h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-200';
const compactButtonClass =
  'inline-flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50';

const defaultCostType = (): ProductionCostMethodCostType => 'labor';

export function ProductionCostMethodMaster({
  userName,
  methods,
  recipes,
  onMethodsChange,
}: ProductionCostMethodMasterProps) {
  const [activeFilter, setActiveFilter] = useState<CostTypeFilter>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [methodName, setMethodName] = useState('');
  const [costType, setCostType] = useState<ProductionCostMethodCostType>(defaultCostType());
  const [calculationType, setCalculationType] = useState<ProductionCostMethodCalculationType>('fixed');
  const [consumesInventory, setConsumesInventory] = useState(false);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [description, setDescription] = useState('');

  const normalizedMethods = useMemo(
    () =>
      methods
        .map((method) => normalizeProductionCostMethod(method))
        .sort(
          (left, right) =>
            (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
            left.methodName.localeCompare(right.methodName),
        ),
    [methods],
  );

  const usageByMethodId = useMemo(() => {
    const usageMap = new Map<string, number>();
    recipes.forEach((recipe) => {
      (recipe.additionalCostLines || []).forEach((line) => {
        if (!line.calculationMethodId) {
          return;
        }

        usageMap.set(line.calculationMethodId, (usageMap.get(line.calculationMethodId) || 0) + 1);
      });
    });
    return usageMap;
  }, [recipes]);

  const visibleMethods = useMemo(
    () =>
      normalizedMethods.filter((method) => activeFilter === 'all' || method.costType === activeFilter),
    [activeFilter, normalizedMethods],
  );

  const previewMethod = normalizeProductionCostMethod({
    id: editingMethodId || 'preview-method',
    methodName: methodName.trim() || 'Preview Method',
    methodCode: slugifyProductionCostMethodCode(methodName || 'preview-method'),
    appliesTo: costType,
    costType,
    calculationType,
    consumesInventory,
    referenceUnit: getProductionCostMethodReferenceUnit(calculationType),
    inputRequired: getProductionCostMethodInputRequired(calculationType, consumesInventory),
    status,
    sortOrder: 1,
    description: description.trim() || undefined,
    createdBy: userName,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const resetForm = (nextCostType: ProductionCostMethodCostType = activeFilter === 'all' ? defaultCostType() : activeFilter) => {
    setEditingMethodId(null);
    setMethodName('');
    setCostType(nextCostType);
    setCalculationType('fixed');
    setConsumesInventory(nextCostType === 'packaging');
    setStatus('active');
    setDescription('');
  };

  const openCreateDrawer = (nextCostType?: ProductionCostMethodCostType) => {
    resetForm(nextCostType);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    resetForm();
  };

  const loadMethod = (method: ProductionCostMethod) => {
    const normalizedMethod = normalizeProductionCostMethod(method);
    setEditingMethodId(method.id);
    setMethodName(normalizedMethod.methodName);
    setCostType(normalizedMethod.costType || defaultCostType());
    setCalculationType(normalizedMethod.calculationType);
    setConsumesInventory(Boolean(normalizedMethod.consumesInventory));
    setStatus(normalizedMethod.status);
    setDescription(normalizedMethod.description || normalizedMethod.notes || '');
    setDrawerOpen(true);
  };

  const handleCostTypeChange = (value: ProductionCostMethodCostType) => {
    setCostType(value);
    if (value === 'packaging') {
      setConsumesInventory(true);
    }
  };

  const handleSave = () => {
    const trimmedName = methodName.trim();
    if (!trimmedName) {
      toast.error('Method name is required');
      return;
    }

    const methodCode = slugifyProductionCostMethodCode(trimmedName);
    const existingMethod = editingMethodId ? methods.find((method) => method.id === editingMethodId) : undefined;
    const duplicate = methods.find(
      (method) =>
        (normalizeProductionCostMethod(method).methodCode === methodCode ||
          normalizeProductionCostMethod(method).methodName.toLowerCase() === trimmedName.toLowerCase()) &&
        method.id !== editingMethodId,
    );
    if (duplicate) {
      toast.error('Method name already exists');
      return;
    }

    const nextMethod = normalizeProductionCostMethod({
      id: editingMethodId || `production-cost-method-${Date.now()}`,
      methodName: trimmedName,
      methodCode,
      appliesTo: costType,
      costType,
      calculationType,
      consumesInventory: costType === 'packaging' ? true : consumesInventory,
      referenceUnit: getProductionCostMethodReferenceUnit(calculationType),
      inputRequired: getProductionCostMethodInputRequired(
        calculationType,
        costType === 'packaging' ? true : consumesInventory,
      ),
      status,
      sortOrder: existingMethod?.sortOrder ?? normalizedMethods.length + 1,
      notes: description.trim() || undefined,
      description: description.trim() || undefined,
      createdBy: existingMethod?.createdBy || userName,
      createdAt: existingMethod?.createdAt || new Date(),
      updatedAt: new Date(),
    });

    if (existingMethod && (usageByMethodId.get(existingMethod.id) || 0) > 0 && isProductionCostMethodDangerousChange(existingMethod, nextMethod)) {
      toast.error('This method is already used in recipes. Create a new method version instead of changing type, calculation, or inventory behavior.');
      return;
    }

    if (editingMethodId) {
      onMethodsChange(methods.map((method) => (method.id === editingMethodId ? nextMethod : method)));
      toast.success('Production cost method updated');
    } else {
      onMethodsChange([...methods, nextMethod]);
      toast.success('Production cost method added');
    }

    closeDrawer();
  };

  return (
    <div className="relative flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Production Cost Methods</h2>
            <p className="text-xs text-slate-500">Define how Labor, Utilities, Packaging, and Other rows behave inside Recipe &amp; Costing.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => openCreateDrawer()} className={compactButtonClass}>
              <Plus className="size-3.5" />
              Add Method
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(['all', 'labor', 'utility', 'packaging', 'other'] as CostTypeFilter[]).map((filter) => {
            const label = filter === 'all' ? 'All' : getProductionCostMethodCostTypeLabel(filter);
            const count =
              filter === 'all'
                ? normalizedMethods.length
                : normalizedMethods.filter((method) => method.costType === filter).length;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`inline-flex h-7 items-center gap-1 rounded border px-2.5 text-xs font-medium transition ${
                  activeFilter === filter
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{label}</span>
                <span className={`rounded px-1 text-[10px] ${activeFilter === filter ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3">
        <div className="overflow-hidden rounded border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="w-[22%] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Method</th>
                  <th className="w-[12%] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Type</th>
                  <th className="w-[14%] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Calculation</th>
                  <th className="w-[12%] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Inventory</th>
                  <th className="w-[18%] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Recipe Behavior</th>
                  <th className="w-[8%] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">Used In</th>
                  <th className="w-[8%] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Status</th>
                  <th className="w-[6%] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleMethods.map((method) => {
                  const usedCount = usageByMethodId.get(method.id) || 0;
                  return (
                    <tr key={method.id} className="border-b border-slate-100 text-xs last:border-b-0 hover:bg-slate-50">
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium text-slate-900">{method.methodName}</div>
                        {method.description ? <div className="mt-0.5 text-[11px] text-slate-500">{method.description}</div> : null}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{getProductionCostMethodCostTypeLabel(method.costType)}</td>
                      <td className="px-3 py-2 text-slate-600">{getProductionCostMethodLabel(method.calculationType)}</td>
                      <td className="px-3 py-2 text-slate-600">{getProductionCostMethodInventoryLabel(method)}</td>
                      <td className="px-3 py-2 text-slate-600">
                        <div>{getProductionCostMethodRecipeBehaviorPreview(method)}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">{getProductionCostMethodFormulaDescription(method)}</div>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">{usedCount}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${
                            method.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {method.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => loadMethod(method)}
                            className="inline-flex size-7 items-center justify-center rounded text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                            title="Edit method"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visibleMethods.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-xs text-slate-500">
                      No methods found for this cost type.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {drawerOpen ? (
        <div className="absolute inset-0 z-20 flex justify-end bg-slate-900/20">
          <div className="flex h-full w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{editingMethodId ? 'Edit Production Cost Method' : 'Add Production Cost Method'}</h3>
                  <p className="text-xs text-slate-500">Keep this setup about behavior only. Rates and actual quantities stay inside Recipe &amp; Costing.</p>
                </div>
                <button type="button" onClick={closeDrawer} className="inline-flex size-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100">
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-auto px-4 py-4">
              {editingMethodId && (usageByMethodId.get(editingMethodId) || 0) > 0 ? (
                <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <div>
                      This method is already used in existing recipes. Changing cost type, calculation, or inventory behavior is blocked. Create a new method version instead.
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">Cost Type</label>
                  <select
                    value={costType}
                    onChange={(event) => handleCostTypeChange(event.target.value as ProductionCostMethodCostType)}
                    className={compactInputClass}
                  >
                    {productionCostMethodCostTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">Method Name</label>
                  <input
                    type="text"
                    value={methodName}
                    onChange={(event) => setMethodName(event.target.value)}
                    placeholder="Example: LPG, Cook Charge, Foil Box"
                    className={compactInputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">Calculation Method</label>
                  <select
                    value={calculationType}
                    onChange={(event) => setCalculationType(event.target.value as ProductionCostMethodCalculationType)}
                    className={compactInputClass}
                  >
                    {productionCostMethodCalculationTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">Consumes Inventory</label>
                  <select
                    value={(costType === 'packaging' ? true : consumesInventory) ? 'yes' : 'no'}
                    onChange={(event) => setConsumesInventory(event.target.value === 'yes')}
                    disabled={costType === 'packaging'}
                    className={`${compactInputClass} ${costType === 'packaging' ? 'bg-slate-50 text-slate-500' : ''}`}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {costType === 'packaging'
                      ? 'Packaging stays inventory-linked so stock usage can be tracked.'
                      : (costType === 'packaging' ? true : consumesInventory)
                        ? 'Purchase item will be required in Recipe & Costing.'
                        : 'Recipe row will not ask for a purchase item.'}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">Status</label>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as 'active' | 'inactive')}
                    className={compactInputClass}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">Description</label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    placeholder="Optional note for users"
                    className="w-full rounded border border-slate-300 bg-white px-2 py-2 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
              </div>

              <section className="rounded border border-slate-200 bg-slate-50">
                <div className="border-b border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-700">Recipe Preview</div>
                <div className="space-y-2 px-3 py-3 text-xs text-slate-700">
                  <div><span className="font-semibold text-slate-900">Method:</span> {previewMethod.methodName}</div>
                  <div><span className="font-semibold text-slate-900">Type:</span> {getProductionCostMethodCostTypeLabel(previewMethod.costType)}</div>
                  <div><span className="font-semibold text-slate-900">Fields:</span> {(previewMethod.consumesInventory ? 'Purchase Item + ' : '') + 'Rate / Amount + Quantity + Unit'}</div>
                  <div><span className="font-semibold text-slate-900">Formula:</span> {getProductionCostMethodFormulaDescription(previewMethod)}</div>
                  <div><span className="font-semibold text-slate-900">Inventory:</span> {previewMethod.consumesInventory ? 'Consumes Purchase Item' : 'No stock consumption from this row'}</div>
                </div>
              </section>
            </div>

            <div className="border-t border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={closeDrawer} className={compactButtonClass}>
                  Cancel
                </button>
                <button type="button" onClick={handleSave} className="inline-flex h-8 items-center gap-1 rounded bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700">
                  <Save className="size-3.5" />
                  {editingMethodId ? 'Update Method' : 'Save Method'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
