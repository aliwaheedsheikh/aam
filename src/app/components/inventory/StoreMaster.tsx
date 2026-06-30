import { useMemo, useState } from 'react';
import { Edit2, Plus, Power, Search, SplitSquareVertical, Warehouse, X } from 'lucide-react';
import { toast } from 'sonner';
import { getStoreDisplayName, slugifyStoreCode, sortStoresForDisplay } from '../../lib/storeMaster';
import { PurchaseItem, StoreMaster as StoreMasterType, StoreStock, StockTransfer } from '../kitchen/types';

interface StoreMasterProps {
  userName: string;
  stores: StoreMasterType[];
  purchaseItems: PurchaseItem[];
  storeStocks: StoreStock[];
  stockTransfers: StockTransfer[];
  onStoresChange: (stores: StoreMasterType[]) => void;
}

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-3 py-2 text-sm text-slate-700 align-middle';

const getStatusBadge = (status: 'active' | 'inactive') => (
  <span
    className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${
      status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
    }`}
  >
    {status}
  </span>
);

export function StoreMaster({
  userName,
  stores = [],
  purchaseItems = [],
  storeStocks = [],
  stockTransfers = [],
  onStoresChange,
}: StoreMasterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [purposeFilter, setPurposeFilter] = useState<'all' | 'storage' | 'production'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreMasterType | null>(null);

  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formKind, setFormKind] = useState<'store' | 'sub-store'>('store');
  const [formPurpose, setFormPurpose] = useState<'storage' | 'production'>('storage');
  const [formParentStoreId, setFormParentStoreId] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formNotes, setFormNotes] = useState('');

  const rootStoreOptions = useMemo(
    () => stores.filter((store) => store.kind === 'store').sort((left, right) => left.name.localeCompare(right.name)),
    [stores],
  );
  const orderedStores = useMemo(() => sortStoresForDisplay(stores), [stores]);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const storeUsage = useMemo(() => {
    const usage = new Map<string, { items: number; stockRows: number; transfers: number }>();
    stores.forEach((store) => usage.set(store.id, { items: 0, stockRows: 0, transfers: 0 }));

    purchaseItems.forEach((item) => {
      const current = usage.get(item.storeLocation);
      if (current) {
        current.items += 1;
      }
    });

    storeStocks.forEach((stock) => {
      const current = usage.get(stock.storeLocation);
      if (current) {
        current.stockRows += 1;
      }
    });

    stockTransfers.forEach((transfer) => {
      const fromUsage = usage.get(transfer.fromStore);
      if (fromUsage) {
        fromUsage.transfers += 1;
      }
      const toUsage = usage.get(transfer.toStore);
      if (toUsage) {
        toUsage.transfers += 1;
      }
    });

    return usage;
  }, [purchaseItems, stockTransfers, storeStocks, stores]);

  const storeRows = useMemo(
    () =>
      orderedStores
        .map((store) => ({
          ...store,
          usage: storeUsage.get(store.id) || { items: 0, stockRows: 0, transfers: 0 },
        }))
        .filter((store) => {
          const matchesSearch =
            !normalizedSearch ||
            store.name.toLowerCase().includes(normalizedSearch) ||
            store.code.toLowerCase().includes(normalizedSearch) ||
            (store.notes || '').toLowerCase().includes(normalizedSearch);
          const matchesStatus = statusFilter === 'all' || store.status === statusFilter;
          const matchesPurpose = purposeFilter === 'all' || store.purpose === purposeFilter;
          return matchesSearch && matchesStatus && matchesPurpose;
        }),
    [normalizedSearch, orderedStores, purposeFilter, statusFilter, storeUsage],
  );

  const metrics = useMemo(
    () => ({
      total: stores.length,
      active: stores.filter((store) => store.status === 'active').length,
      subStores: stores.filter((store) => store.kind === 'sub-store').length,
      production: stores.filter((store) => store.purpose === 'production').length,
      withStock: stores.filter((store) => (storeUsage.get(store.id)?.stockRows || 0) > 0).length,
    }),
    [storeUsage, stores],
  );

  const structureWatchlist = useMemo(
    () =>
      storeRows
        .map((store) => {
          let label = 'Stable';
          let detail = 'No issues detected';
          let priority = 5;

          if (store.status === 'inactive') {
            label = 'Inactive';
            detail = 'Store is unavailable for new activity';
            priority = 1;
          } else if (store.kind === 'sub-store' && !store.parentStoreId) {
            label = 'Missing Parent';
            detail = 'Sub-store needs a parent assignment';
            priority = 1;
          } else if (store.usage.stockRows > 0 && store.usage.items === 0) {
            label = 'Stock Only';
            detail = 'Stock exists without item master ownership';
            priority = 2;
          } else if (store.purpose === 'production') {
            label = 'Production';
            detail = 'Used in kitchen or issue operations';
            priority = 3;
          } else if (store.usage.transfers > 0) {
            label = 'High Movement';
            detail = `${store.usage.transfers} transfer touchpoints`;
            priority = 4;
          }

          return { ...store, priority, label, detail };
        })
        .sort((left, right) => {
          if (left.priority !== right.priority) {
            return left.priority - right.priority;
          }
          return right.usage.transfers - left.usage.transfers;
        })
        .slice(0, 8),
    [storeRows],
  );

  const storeActivity = useMemo(
    () =>
      [...storeRows]
        .sort((left, right) => {
          if (left.usage.stockRows !== right.usage.stockRows) {
            return right.usage.stockRows - left.usage.stockRows;
          }
          return right.usage.items - left.usage.items;
        })
        .slice(0, 8),
    [storeRows],
  );

  const hasStores = stores.length > 0;

  const resetForm = () => {
    setEditingStore(null);
    setFormName('');
    setFormCode('');
    setFormKind('store');
    setFormPurpose('storage');
    setFormParentStoreId('');
    setFormStatus('active');
    setFormNotes('');
  };

  const closeDialog = () => {
    resetForm();
    setDialogOpen(false);
  };

  const handleAddNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (store: StoreMasterType) => {
    setEditingStore(store);
    setFormName(store.name);
    setFormCode(store.code);
    setFormKind(store.kind);
    setFormPurpose(store.purpose);
    setFormParentStoreId(store.parentStoreId || '');
    setFormStatus(store.status);
    setFormNotes(store.notes || '');
    setDialogOpen(true);
  };

  const handleSave = () => {
    const trimmedName = formName.trim();
    const normalizedCode = slugifyStoreCode(formCode || trimmedName);

    if (!trimmedName) {
      toast.error('Store name is required');
      return;
    }

    if (!normalizedCode) {
      toast.error('Store code is required');
      return;
    }

    if (formKind === 'sub-store' && !formParentStoreId) {
      toast.error('Please select a parent store for this sub-store');
      return;
    }

    const duplicate = stores.find((store) => store.code === normalizedCode && store.id !== editingStore?.id);
    if (duplicate) {
      toast.error('A store with this code already exists');
      return;
    }

    if (editingStore) {
      onStoresChange(
        stores.map((store) =>
          store.id === editingStore.id
            ? {
                ...store,
                code: normalizedCode,
                name: trimmedName,
                kind: formKind,
                purpose: formPurpose,
                parentStoreId: formKind === 'sub-store' ? formParentStoreId : undefined,
                status: formStatus,
                notes: formNotes.trim() || undefined,
                updatedAt: new Date(),
              }
            : store,
        ),
      );
      toast.success('Store updated successfully');
    } else {
      const newStore: StoreMasterType = {
        id: normalizedCode,
        code: normalizedCode,
        name: trimmedName,
        kind: formKind,
        purpose: formPurpose,
        parentStoreId: formKind === 'sub-store' ? formParentStoreId : undefined,
        status: formStatus,
        notes: formNotes.trim() || undefined,
        createdBy: userName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      onStoresChange([...stores, newStore]);
      toast.success(formKind === 'sub-store' ? 'Sub-store created successfully' : 'Store created successfully');
    }

    closeDialog();
  };

  const handleToggleStatus = (store: StoreMasterType) => {
    const nextStatus = store.status === 'active' ? 'inactive' : 'active';
    onStoresChange(
      stores.map((entry) =>
        entry.id === store.id
          ? {
              ...entry,
              status: nextStatus,
              updatedAt: new Date(),
            }
          : entry,
      ),
    );
    toast.success(`Store ${nextStatus === 'active' ? 'activated' : 'deactivated'}`);
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <h2 className="mr-2 text-base font-semibold text-slate-900">Store Master</h2>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search store name, code, or note"
              className="h-9 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
            className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={purposeFilter}
            onChange={(event) => setPurposeFilter(event.target.value as 'all' | 'storage' | 'production')}
            className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            <option value="all">All Purposes</option>
            <option value="storage">Storage</option>
            <option value="production">Production</option>
          </select>
          <button
            onClick={handleAddNew}
            className="inline-flex h-9 items-center gap-2 rounded border border-blue-600 bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="size-4" />
            Add Store
          </button>
        </div>

        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span><strong className="text-slate-900">Stores:</strong> {metrics.total}</span>
            <span><strong className="text-slate-900">Active:</strong> {metrics.active}</span>
            <span><strong className="text-slate-900">Sub-Stores:</strong> {metrics.subStores}</span>
            <span><strong className="text-slate-900">Production:</strong> {metrics.production}</span>
            <span><strong className="text-slate-900">With Stock:</strong> {metrics.withStock}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        {!hasStores ? (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-300 bg-white px-6 text-center">
            <div className="max-w-md">
              <Warehouse className="mx-auto mb-3 size-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">Create your first store</p>
              <p className="mt-1 text-xs text-slate-500">
                Start with a main store, then add sub-stores for kitchens, cold rooms, or sections as needed.
              </p>
              <button
                onClick={handleAddNew}
                className="mt-4 inline-flex items-center gap-2 rounded border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="size-4" />
                Create First Store
              </button>
            </div>
          </div>
        ) : storeRows.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-300 bg-white px-6 text-center">
            <div>
              <Warehouse className="mx-auto mb-3 size-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No stores found</p>
              <p className="mt-1 text-xs text-slate-500">Adjust the current filters to view store records.</p>
            </div>
          </div>
        ) : (
          <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="overflow-hidden rounded border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <h3 className="text-sm font-semibold text-slate-900">Store Register</h3>
                <span className="text-xs text-slate-500">{storeRows.length} rows</span>
              </div>
              <div className="h-[calc(100%-41px)] overflow-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className={tableHeadClass}>Store</th>
                      <th className={tableHeadClass}>Structure</th>
                      <th className={tableHeadClass}>Purpose</th>
                      <th className={`${tableHeadClass} text-right`}>Items</th>
                      <th className={`${tableHeadClass} text-right`}>Stock Rows</th>
                      <th className={`${tableHeadClass} text-right`}>Transfers</th>
                      <th className={tableHeadClass}>Status</th>
                      <th className={`${tableHeadClass} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storeRows.map((store) => (
                      <tr key={store.id} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className={tableCellClass}>
                          <div className="flex items-center gap-2">
                            {store.kind === 'store' ? (
                              <Warehouse className="size-4 text-slate-500" />
                            ) : (
                              <SplitSquareVertical className="size-4 text-blue-500" />
                            )}
                            <div>
                              <div className="font-medium text-slate-900">{getStoreDisplayName(stores, store.id)}</div>
                              <div className="text-xs text-slate-500">{store.code}</div>
                            </div>
                          </div>
                        </td>
                        <td className={tableCellClass}>
                          <div className="text-slate-900">{store.kind === 'store' ? 'Parent Store' : 'Sub-Store'}</div>
                          <div className="text-xs text-slate-500">
                            {store.parentStoreId ? getStoreDisplayName(stores, store.parentStoreId) : 'No parent'}
                          </div>
                        </td>
                        <td className={tableCellClass}>
                          <div className="capitalize text-slate-900">{store.purpose}</div>
                          <div className="text-xs text-slate-500">{store.notes || 'No operational note'}</div>
                        </td>
                        <td className={`${tableCellClass} text-right`}>{store.usage.items}</td>
                        <td className={`${tableCellClass} text-right`}>{store.usage.stockRows}</td>
                        <td className={`${tableCellClass} text-right`}>{store.usage.transfers}</td>
                        <td className={tableCellClass}>{getStatusBadge(store.status)}</td>
                        <td className={`${tableCellClass} text-right`}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEdit(store)}
                              className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Edit2 className="size-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleStatus(store)}
                              className={`inline-flex h-7 items-center gap-1 rounded border px-2 text-xs font-medium ${
                                store.status === 'active'
                                  ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              <Power className="size-3.5" />
                              {store.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid h-full grid-cols-1 gap-4 overflow-hidden">
              <section className="overflow-hidden rounded border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                  <h3 className="text-sm font-semibold text-slate-900">Structure Watchlist</h3>
                  <SplitSquareVertical className="size-4 text-slate-400" />
                </div>
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Store</th>
                        <th className={tableHeadClass}>Focus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {structureWatchlist.map((store) => (
                        <tr key={store.id} className="border-t border-slate-200">
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{store.name}</div>
                            <div className="text-xs text-slate-500">{store.code}</div>
                          </td>
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{store.label}</div>
                            <div className="text-xs text-slate-500">{store.detail}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="overflow-hidden rounded border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                  <h3 className="text-sm font-semibold text-slate-900">Store Activity</h3>
                  <Warehouse className="size-4 text-slate-400" />
                </div>
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Store</th>
                        <th className={`${tableHeadClass} text-right`}>Stock</th>
                        <th className={`${tableHeadClass} text-right`}>Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storeActivity.map((store) => (
                        <tr key={store.id} className="border-t border-slate-200">
                          <td className={tableCellClass}>{store.name}</td>
                          <td className={`${tableCellClass} text-right`}>{store.usage.stockRows}</td>
                          <td className={`${tableCellClass} text-right`}>{store.usage.items}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingStore ? 'Edit Store' : 'Create Store'}
                </h2>
                <p className="text-xs text-slate-500">Define structure, usage purpose, and operational notes for inventory routing.</p>
              </div>
              <button onClick={closeDialog} className="rounded p-2 text-slate-500 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5">
                  <section className="rounded border border-slate-200">
                    <div className="border-b border-slate-200 px-4 py-2">
                      <h3 className="text-sm font-semibold text-slate-900">Store Identity</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Store Name *</label>
                        <input
                          type="text"
                          value={formName}
                          onChange={(event) => {
                            setFormName(event.target.value);
                            if (!editingStore) {
                              setFormCode(slugifyStoreCode(event.target.value));
                            }
                          }}
                          className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                          placeholder="e.g., Dry Warehouse"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Store Code *</label>
                        <input
                          type="text"
                          value={formCode}
                          onChange={(event) => setFormCode(slugifyStoreCode(event.target.value))}
                          className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                          placeholder="dry-warehouse"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="rounded border border-slate-200">
                    <div className="border-b border-slate-200 px-4 py-2">
                      <h3 className="text-sm font-semibold text-slate-900">Structure & Usage</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Type *</label>
                        <select
                          value={formKind}
                          onChange={(event) => {
                            const nextKind = event.target.value as 'store' | 'sub-store';
                            setFormKind(nextKind);
                            if (nextKind === 'store') {
                              setFormParentStoreId('');
                            }
                          }}
                          className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                        >
                          <option value="store">Store</option>
                          <option value="sub-store">Sub-Store</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Purpose *</label>
                        <select
                          value={formPurpose}
                          onChange={(event) => setFormPurpose(event.target.value as 'storage' | 'production')}
                          className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                        >
                          <option value="storage">Storage</option>
                          <option value="production">Production</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">Parent Store</label>
                        <select
                          value={formParentStoreId}
                          onChange={(event) => setFormParentStoreId(event.target.value)}
                          disabled={formKind !== 'sub-store'}
                          className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:bg-slate-100"
                        >
                          <option value="">Select parent store</option>
                          {rootStoreOptions.map((store) => (
                            <option key={store.id} value={store.id}>
                              {store.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                        <select
                          value={formStatus}
                          onChange={(event) => setFormStatus(event.target.value as 'active' | 'inactive')}
                          className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                        <textarea
                          value={formNotes}
                          onChange={(event) => setFormNotes(event.target.value)}
                          rows={3}
                          className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                          placeholder="Operational note, temperature class, issuing rule, etc."
                        />
                      </div>
                    </div>
                  </section>
                </div>

                <div className="space-y-4">
                  <section className="rounded border border-slate-200 bg-slate-50 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">Structure Summary</h3>
                    <div className="space-y-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between">
                        <span>Store Type</span>
                        <span className="font-medium text-slate-900">{formKind === 'store' ? 'Parent Store' : 'Sub-Store'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Purpose</span>
                        <span className="font-medium capitalize text-slate-900">{formPurpose}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Parent</span>
                        <span className="font-medium text-slate-900">
                          {formParentStoreId ? getStoreDisplayName(stores, formParentStoreId) : 'None'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Status</span>
                        <span className="font-medium text-slate-900">{formStatus}</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button
                onClick={closeDialog}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {editingStore ? 'Update Store' : 'Create Store'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
