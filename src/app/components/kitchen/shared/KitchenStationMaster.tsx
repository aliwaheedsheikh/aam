import { useMemo, useState } from 'react';
import { Edit2, Eye, Plus, Power, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDatePK } from '../../../lib/locale';
import { buildAssignableStoreOptions, getStoreDisplayName } from '../../../lib/storeMaster';
import {
  Dish,
  KitchenStation,
  KitchenStationModule,
  KitchenStationProductionType,
  KitchenStationStatus,
  Recipe,
  StoreLocation,
  StoreMaster,
} from '../types';

interface KitchenStationMasterProps {
  module: KitchenStationModule;
  userName: string;
  stores: StoreMaster[];
  stations: KitchenStation[];
  dishes?: Dish[];
  recipes?: Recipe[];
  onStationsChange: (stations: KitchenStation[]) => void;
}

type KitchenStationRow = KitchenStation & {
  stationId: string;
  stationCode: string;
  stationName: string;
  linkedStoreName: string;
  productionType: KitchenStationProductionType;
  description: string;
  linkedDishesCount: number;
  linkedRecipesCount: number;
};

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-3 py-2 text-sm text-slate-700 align-middle';
const inputClass = 'h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500';
const textareaClass = 'min-h-[64px] w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500';
const labelClass = 'mb-1 block text-xs font-medium text-slate-700';

const productionTypeOptions: Array<{ value: KitchenStationProductionType; label: string }> = [
  { value: 'production', label: 'Production' },
  { value: 'service', label: 'Service' },
  { value: 'both', label: 'Both' },
];

const blockedStoreKeywords = [
  'housekeeping',
  'maintenance',
  'engineering',
  'asset',
  'cleaning',
  'repair',
  'office',
  'linen',
  'dishwash',
];

const kitchenStoreKeywords = [
  'main store',
  'kitchen',
  'bakery',
  'cold room',
  'cold storage',
  'freezer',
  'butchery',
  'beverage',
  'production',
  'dry goods',
  'food packaging',
  'disposable',
];

const isGeneratedStationCode = (value?: string) => Boolean(value?.match(/^KS-\d+$/i));

const normalizeStationName = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const getStationCode = (station: KitchenStation, allStations: KitchenStation[]) => {
  if (station.stationCode) {
    return station.stationCode.toUpperCase();
  }

  if (isGeneratedStationCode(station.code)) {
    return station.code.toUpperCase();
  }

  const rowNumber = Math.max(
    allStations.findIndex((entry) => entry.id === station.id) + 1,
    1,
  );
  return `KS-${String(rowNumber).padStart(4, '0')}`;
};

const generateStationCode = (stations: KitchenStation[]) => {
  const maxCodeNumber = stations.reduce((max, station) => {
    const match = getStationCode(station, stations).match(/^KS-(\d+)$/i);
    return match ? Math.max(max, Number(match[1]) || 0) : max;
  }, 0);

  return `KS-${String(maxCodeNumber + 1).padStart(4, '0')}`;
};

const getStationName = (station: KitchenStation) => station.stationName || station.name;
const getStationDescription = (station: KitchenStation) => station.description || station.notes || '';
const getStationLinkedStoreId = (station: KitchenStation) => station.linkedStoreId || station.linkedStoreLocation;
const getStationProductionType = (station: KitchenStation): KitchenStationProductionType => {
  if (station.productionType === 'service' || station.productionType === 'both') {
    return station.productionType;
  }

  return 'production';
};

const getProductionTypeLabel = (productionType: KitchenStationProductionType) =>
  productionTypeOptions.find((option) => option.value === productionType)?.label || productionType;

const hasKitchenStoreSignal = (store: StoreMaster & { label?: string; hierarchyLabel?: string }) => {
  const text = `${store.name} ${store.code} ${store.label || ''} ${store.hierarchyLabel || ''}`.toLowerCase();
  if (blockedStoreKeywords.some((keyword) => text.includes(keyword))) {
    return false;
  }

  return store.purpose === 'production' || kitchenStoreKeywords.some((keyword) => text.includes(keyword));
};

const getStationMatchKeys = (station: KitchenStation) =>
  new Set([station.id, station.code, station.stationCode].filter(Boolean) as string[]);

const stationOwnsDish = (station: KitchenStation, dish: Dish, currentModule: KitchenStationModule) => {
  if (currentModule !== 'shared' && dish.module !== currentModule) {
    return false;
  }

  const stationKey = dish.kitchenStationId || dish.preparationArea;
  return Boolean(stationKey && getStationMatchKeys(station).has(stationKey));
};

const getLinkedDishCount = (station: KitchenStation, dishes: Dish[], currentModule: KitchenStationModule) =>
  dishes.filter((dish) => stationOwnsDish(station, dish, currentModule)).length;

const getLinkedRecipeCount = (
  station: KitchenStation,
  dishes: Dish[],
  recipes: Recipe[],
  currentModule: KitchenStationModule,
) => {
  const stationKeys = getStationMatchKeys(station);
  const linkedDishIds = new Set(
    dishes
      .filter((dish) => stationOwnsDish(station, dish, currentModule))
      .map((dish) => dish.id),
  );

  return recipes.filter((recipe) => {
    if (linkedDishIds.has(recipe.dishId)) {
      return true;
    }

    return Boolean(recipe.kitchenSectionId && stationKeys.has(recipe.kitchenSectionId));
  }).length;
};

const getStatusBadge = (status: KitchenStationStatus) => (
  <span
    className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${
      status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
    }`}
  >
    {status === 'active' ? 'Active' : 'Inactive'}
  </span>
);

export function KitchenStationMaster({
  module,
  userName,
  stores,
  stations,
  dishes = [],
  recipes = [],
  onStationsChange,
}: KitchenStationMasterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | KitchenStationStatus>('all');
  const [productionTypeFilter, setProductionTypeFilter] = useState<'all' | KitchenStationProductionType>('all');
  const [linkedStoreFilter, setLinkedStoreFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<KitchenStationRow | null>(null);
  const [viewMode, setViewMode] = useState(false);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formLinkedStoreId, setFormLinkedStoreId] = useState('');
  const [formProductionType, setFormProductionType] = useState<KitchenStationProductionType>('production');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<KitchenStationStatus>('active');

  const visibleStations = useMemo(
    () => stations.filter((station) => station.module === module || station.module === 'shared'),
    [module, stations],
  );

  const activeStoreOptions = useMemo(() => buildAssignableStoreOptions(stores), [stores]);
  const kitchenStoreOptions = useMemo(
    () => activeStoreOptions.filter((store) => hasKitchenStoreSignal(store)),
    [activeStoreOptions],
  );
  const allowedKitchenStoreIds = useMemo(
    () => new Set(kitchenStoreOptions.map((store) => store.id)),
    [kitchenStoreOptions],
  );

  const stationBaseRows = useMemo<KitchenStationRow[]>(
    () =>
      visibleStations.map((station) => {
        const linkedStoreId = getStationLinkedStoreId(station);
        const linkedStoreName =
          linkedStoreId ? getStoreDisplayName(stores, linkedStoreId) : station.linkedStoreName || 'Unassigned';

        return {
          ...station,
          stationId: station.stationId || station.id,
          stationCode: getStationCode(station, stations),
          stationName: getStationName(station),
          linkedStoreId,
          linkedStoreName,
          productionType: getStationProductionType(station),
          description: getStationDescription(station),
          linkedDishesCount: getLinkedDishCount(station, dishes, module),
          linkedRecipesCount: getLinkedRecipeCount(station, dishes, recipes, module),
        };
      }),
    [dishes, module, recipes, stations, stores, visibleStations],
  );

  const stationRows = useMemo(
    () =>
      stationBaseRows
        .filter((station) => {
          const search = searchTerm.trim().toLowerCase();
          const matchesSearch =
            !search ||
            station.stationCode.toLowerCase().includes(search) ||
            station.stationName.toLowerCase().includes(search);
          const matchesStatus = statusFilter === 'all' || station.status === statusFilter;
          const matchesProductionType = productionTypeFilter === 'all' || station.productionType === productionTypeFilter;
          const matchesLinkedStore =
            linkedStoreFilter === 'all' ||
            (linkedStoreFilter === 'unassigned'
              ? !station.linkedStoreId
              : station.linkedStoreId === linkedStoreFilter);

          return matchesSearch && matchesStatus && matchesProductionType && matchesLinkedStore;
        })
        .sort((left, right) => left.stationName.localeCompare(right.stationName)),
    [linkedStoreFilter, productionTypeFilter, searchTerm, stationBaseRows, statusFilter],
  );

  const metrics = useMemo(
    () => ({
      total: stationBaseRows.length,
      active: stationBaseRows.filter((station) => station.status === 'active').length,
      inactive: stationBaseRows.filter((station) => station.status === 'inactive').length,
      linkedDishes: stationBaseRows.reduce((sum, station) => sum + station.linkedDishesCount, 0),
      linkedRecipes: stationBaseRows.reduce((sum, station) => sum + station.linkedRecipesCount, 0),
    }),
    [stationBaseRows],
  );

  const openDialog = (station: KitchenStationRow | null, nextViewMode: boolean) => {
    if (!station) {
      setEditingStation(null);
      setViewMode(false);
      setFormCode(generateStationCode(stations));
      setFormName('');
      setFormLinkedStoreId('');
      setFormProductionType('production');
      setFormDescription('');
      setFormStatus('active');
      setDialogOpen(true);
      return;
    }

    setEditingStation(station);
    setViewMode(nextViewMode);
    setFormCode(station.stationCode);
    setFormName(station.stationName);
    setFormLinkedStoreId(station.linkedStoreId || '');
    setFormProductionType(station.productionType);
    setFormDescription(station.description);
    setFormStatus(station.status);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const trimmedName = formName.trim().replace(/\s+/g, ' ');
    const trimmedDescription = formDescription.trim();
    const linkedStoreId = formLinkedStoreId ? (formLinkedStoreId as StoreLocation) : undefined;

    if (!trimmedName) {
      toast.error('Station name is required');
      return;
    }

    const duplicate = stationBaseRows.find(
      (station) =>
        station.id !== editingStation?.id &&
        normalizeStationName(station.stationName) === normalizeStationName(trimmedName),
    );

    if (duplicate) {
      toast.error('A kitchen station with this name already exists');
      return;
    }

    if (linkedStoreId && !allowedKitchenStoreIds.has(linkedStoreId)) {
      toast.error('Linked store must be a kitchen-related store');
      return;
    }

    const now = new Date();
    const linkedStoreName = linkedStoreId ? getStoreDisplayName(stores, linkedStoreId) : undefined;

    if (editingStation) {
      onStationsChange(
        stations.map((station) => {
          if (station.id !== editingStation.id) {
            return station;
          }

          const linkedDishesCount = getLinkedDishCount(station, dishes, module);
          const linkedRecipesCount = getLinkedRecipeCount(station, dishes, recipes, module);

          return {
            ...station,
            stationId: station.stationId || station.id,
            stationCode: formCode,
            stationName: trimmedName,
            code: station.code && !isGeneratedStationCode(station.code) ? station.code : formCode,
            name: trimmedName,
            linkedStoreId,
            linkedStoreName,
            linkedStoreLocation: linkedStoreId,
            productionType: formProductionType,
            description: trimmedDescription || undefined,
            notes: trimmedDescription || undefined,
            linkedDishesCount,
            linkedRecipesCount,
            status: formStatus,
            updatedBy: userName,
            updatedAt: now,
          };
        }),
      );
      toast.success('Kitchen station saved successfully');
    } else {
      const newStationId = `station-${Date.now()}`;
      const newStation: KitchenStation = {
        id: newStationId,
        stationId: newStationId,
        stationCode: formCode,
        stationName: trimmedName,
        code: formCode,
        name: trimmedName,
        module,
        linkedStoreId,
        linkedStoreName,
        linkedStoreLocation: linkedStoreId,
        productionType: formProductionType,
        description: trimmedDescription || undefined,
        notes: trimmedDescription || undefined,
        linkedDishesCount: 0,
        linkedRecipesCount: 0,
        status: formStatus,
        createdBy: userName,
        createdAt: now,
        updatedBy: userName,
        updatedAt: now,
      };

      onStationsChange([...stations, newStation]);
      toast.success('Kitchen station saved successfully');
    }

    setDialogOpen(false);
  };

  const handleDeactivate = (station: KitchenStationRow) => {
    const nextStatus: KitchenStationStatus = station.status === 'active' ? 'inactive' : 'active';
    const now = new Date();

    onStationsChange(
      stations.map((entry) =>
        entry.id === station.id
          ? {
              ...entry,
              stationId: entry.stationId || entry.id,
              stationCode: station.stationCode,
              stationName: station.stationName,
              linkedStoreId: station.linkedStoreId,
              linkedStoreName: station.linkedStoreId ? getStoreDisplayName(stores, station.linkedStoreId) : undefined,
              productionType: station.productionType,
              description: station.description || undefined,
              linkedDishesCount: station.linkedDishesCount,
              linkedRecipesCount: station.linkedRecipesCount,
              status: nextStatus,
              updatedBy: userName,
              updatedAt: now,
            }
          : entry,
      ),
    );
    toast.success(`Kitchen station ${nextStatus === 'active' ? 'activated' : 'deactivated'}`);
  };

  const handleDeleteBlocked = (station: KitchenStationRow) => {
    if (station.linkedDishesCount > 0 || station.linkedRecipesCount > 0) {
      toast.error('Kitchen Station is used in dishes or recipes and cannot be deleted. Deactivate it instead.');
      return;
    }

    toast.info('Kitchen station deletion is not enabled in this master. Deactivate it instead.');
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <h2 className="mr-2 text-base font-semibold text-slate-900">Kitchen Station Master</h2>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Station Code or Station Name"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | KitchenStationStatus)}
            className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={productionTypeFilter}
            onChange={(event) => setProductionTypeFilter(event.target.value as 'all' | KitchenStationProductionType)}
            className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            <option value="all">All Production Types</option>
            {productionTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={linkedStoreFilter}
            onChange={(event) => setLinkedStoreFilter(event.target.value)}
            className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            <option value="all">All Linked Stores</option>
            <option value="unassigned">Unassigned</option>
            {kitchenStoreOptions.map((store) => (
              <option key={store.id} value={store.id}>
                {store.hierarchyLabel || store.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => openDialog(null, false)}
            className="inline-flex h-9 items-center gap-2 rounded border border-orange-600 bg-orange-600 px-3 text-sm font-medium text-white hover:bg-orange-700"
          >
            <Plus className="size-4" />
            Add Station
          </button>
        </div>

        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span><strong className="text-slate-900">Total:</strong> {metrics.total}</span>
            <span><strong className="text-slate-900">Active:</strong> {metrics.active}</span>
            <span><strong className="text-slate-900">Inactive:</strong> {metrics.inactive}</span>
            <span><strong className="text-slate-900">Linked Dishes:</strong> {metrics.linkedDishes}</span>
            <span><strong className="text-slate-900">Linked Recipes:</strong> {metrics.linkedRecipes}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="overflow-hidden rounded border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <h3 className="text-sm font-semibold text-slate-900">Kitchen Station Register</h3>
            <span className="text-xs text-slate-500">{stationRows.length} rows</span>
          </div>
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className={tableHeadClass}>Station Code</th>
                  <th className={tableHeadClass}>Station Name</th>
                  <th className={tableHeadClass}>Linked Store</th>
                  <th className={tableHeadClass}>Production Type</th>
                  <th className={`${tableHeadClass} text-right`}>Linked Dishes</th>
                  <th className={`${tableHeadClass} text-right`}>Linked Recipes</th>
                  <th className={tableHeadClass}>Status</th>
                  <th className={tableHeadClass}>Created By</th>
                  <th className={tableHeadClass}>Updated At</th>
                  <th className={`${tableHeadClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stationRows.map((station) => (
                  <tr key={station.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className={tableCellClass}>{station.stationCode}</td>
                    <td className={tableCellClass}>
                      <div className="font-medium text-slate-900">{station.stationName}</div>
                      {station.description ? (
                        <div className="max-w-[240px] truncate text-xs text-slate-500">{station.description}</div>
                      ) : null}
                    </td>
                    <td className={tableCellClass}>{station.linkedStoreName}</td>
                    <td className={tableCellClass}>{getProductionTypeLabel(station.productionType)}</td>
                    <td className={`${tableCellClass} text-right`}>{station.linkedDishesCount}</td>
                    <td className={`${tableCellClass} text-right`}>{station.linkedRecipesCount}</td>
                    <td className={tableCellClass}>{getStatusBadge(station.status)}</td>
                    <td className={tableCellClass}>{station.createdBy}</td>
                    <td className={tableCellClass}>{formatDatePK(station.updatedAt)}</td>
                    <td className={`${tableCellClass} text-right`}>
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openDialog(station, true)}
                          className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                          title="View"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          onClick={() => openDialog(station, false)}
                          className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                          title="Edit"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDeactivate(station)}
                          className={`rounded p-1.5 ${
                            station.status === 'active'
                              ? 'text-slate-600 hover:bg-slate-100'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={station.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBlocked(station)}
                          className="hidden"
                          aria-label="Delete blocked"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {stationRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={10}>
                      {searchTerm ||
                      statusFilter !== 'all' ||
                      productionTypeFilter !== 'all' ||
                      linkedStoreFilter !== 'all'
                        ? 'No kitchen stations found matching your filters.'
                        : 'No kitchen stations yet. Click "Add Station" to get started.'}
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
              <h2 className="text-base font-semibold text-slate-900">
                {viewMode ? 'View Kitchen Station' : editingStation ? 'Edit Kitchen Station' : 'Create Kitchen Station'}
              </h2>
              <button onClick={() => setDialogOpen(false)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 p-3">
              <div>
                <label className={labelClass}>Station Code</label>
                <input type="text" value={formCode} readOnly className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Station Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  disabled={viewMode}
                  placeholder="e.g., Hot Kitchen"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Linked Store</label>
                <select
                  value={formLinkedStoreId}
                  onChange={(event) => setFormLinkedStoreId(event.target.value)}
                  disabled={viewMode}
                  className={inputClass}
                >
                  <option value="">Select kitchen store</option>
                  {kitchenStoreOptions.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.hierarchyLabel || store.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Production Type</label>
                <select
                  value={formProductionType}
                  onChange={(event) => setFormProductionType(event.target.value as KitchenStationProductionType)}
                  disabled={viewMode}
                  className={inputClass}
                >
                  {productionTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Description / Notes</label>
                <textarea
                  value={formDescription}
                  onChange={(event) => setFormDescription(event.target.value)}
                  disabled={viewMode}
                  rows={3}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={formStatus}
                  onChange={(event) => setFormStatus(event.target.value as KitchenStationStatus)}
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
                  Save Station
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
