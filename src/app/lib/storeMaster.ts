import type {
  GoodsReceipt,
  KitchenIssueSheet,
  KitchenStation,
  PurchaseItem,
  StoreLocation,
  StoreMaster,
  StoreStock,
  StockTransfer,
} from '../components/kitchen/types';

const LEGACY_STORE_ID_MAP: Record<string, string> = {
  'hot-kitchen': 'hot-kitchen-store',
  'cold-kitchen': 'cold-kitchen-store',
  tandoor: 'tandoor-store',
  bbq: 'bbq-store',
  'restaurant-kitchen': 'restaurant-kitchen-store',
  'chinese-section': 'chinese-section-store',
  bakery: 'pastry-store',
  'pastry-section': 'pastry-store',
  bar: 'bar-store',
};

export const slugifyStoreCode = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const normalizeStoreId = (storeId?: string | null): StoreLocation | undefined => {
  if (!storeId) {
    return undefined;
  }

  return LEGACY_STORE_ID_MAP[storeId] || storeId;
};

export const defaultStoreMaster: StoreMaster[] = [];

export const sortStoresForDisplay = (stores: StoreMaster[]) => {
  const roots = stores
    .filter((store) => !store.parentStoreId)
    .sort((left, right) => left.name.localeCompare(right.name));

  const childrenByParent = new Map<string, StoreMaster[]>();
  stores.forEach((store) => {
    if (!store.parentStoreId) {
      return;
    }
    const current = childrenByParent.get(store.parentStoreId) || [];
    current.push(store);
    childrenByParent.set(store.parentStoreId, current);
  });

  const result: StoreMaster[] = [];

  const appendStore = (store: StoreMaster) => {
    result.push(store);
    const children = (childrenByParent.get(store.id) || []).sort((left, right) => left.name.localeCompare(right.name));
    children.forEach(appendStore);
  };

  roots.forEach(appendStore);
  return result;
};

export const getStoreDisplayName = (stores: StoreMaster[], storeId?: string | null) => {
  const normalizedId = normalizeStoreId(storeId);
  if (!normalizedId) {
    return 'Unassigned';
  }

  return stores.find((store) => store.id === normalizedId)?.name || normalizedId.replace(/-/g, ' ');
};

export const getStoreHierarchyLabel = (stores: StoreMaster[], storeId: string) => {
  const normalizedId = normalizeStoreId(storeId) || storeId;
  const current = stores.find((store) => store.id === normalizedId);
  if (!current) {
    return normalizedId.replace(/-/g, ' ');
  }

  if (!current.parentStoreId) {
    return current.name;
  }

  const parent = stores.find((store) => store.id === current.parentStoreId);
  return parent ? `${parent.name} / ${current.name}` : current.name;
};

const hasChildStores = (stores: StoreMaster[], storeId: string, includeInactive = false) =>
  stores.some(
    (store) =>
      store.parentStoreId === storeId &&
      (includeInactive || store.status === 'active'),
  );

export const buildStoreOptions = (stores: StoreMaster[], includeInactive = false) =>
  sortStoresForDisplay(stores)
    .filter((store) => includeInactive || store.status === 'active')
    .map((store) => ({
      ...store,
      label: `${store.kind === 'sub-store' ? '  - ' : ''}${store.name}`,
      hierarchyLabel: getStoreHierarchyLabel(stores, store.id),
    }));

export const buildAssignableStoreOptions = (stores: StoreMaster[], includeInactive = false) =>
  buildStoreOptions(stores, includeInactive).filter(
    (store) => !hasChildStores(stores, store.id, includeInactive),
  );

export const normalizeStoreMaster = (stores: StoreMaster[]) => {
  let changed = false;
  const normalized = stores.map((store) => {
    const normalizedId = normalizeStoreId(store.id) || slugifyStoreCode(store.name || store.code || store.id);
    const normalizedCode = slugifyStoreCode(store.code || store.name || normalizedId);
    const normalizedParentStoreId = normalizeStoreId(store.parentStoreId);

    if (
      normalizedId === store.id &&
      normalizedCode === store.code &&
      normalizedParentStoreId === store.parentStoreId
    ) {
      return store;
    }

    changed = true;
    return {
      ...store,
      id: normalizedId,
      code: normalizedCode,
      parentStoreId: normalizedParentStoreId,
      updatedAt: new Date(),
    };
  });

  return changed ? normalized : stores;
};

const mapIfChanged = <T>(items: T[], mapper: (item: T) => T) => {
  let changed = false;
  const mapped = items.map((item) => {
    const nextItem = mapper(item);
    if (nextItem !== item) {
      changed = true;
    }
    return nextItem;
  });

  return changed ? mapped : items;
};

export const normalizePurchaseItemStores = (items: PurchaseItem[]) =>
  mapIfChanged(items, (item) => {
    const normalizedStoreLocation = normalizeStoreId(item.storeLocation);
    const normalizedAssignedKitchenStoreIds = item.assignedKitchenStoreIds?.map(
      (storeId) => normalizeStoreId(storeId) || storeId,
    );
    const assignedStoresChanged =
      Boolean(normalizedAssignedKitchenStoreIds) &&
      normalizedAssignedKitchenStoreIds?.some((storeId, index) => storeId !== item.assignedKitchenStoreIds?.[index]);

    if (normalizedStoreLocation === item.storeLocation && !assignedStoresChanged) {
      return item;
    }

    return {
      ...item,
      storeLocation: normalizedStoreLocation || item.storeLocation,
      assignedKitchenStoreIds: normalizedAssignedKitchenStoreIds || item.assignedKitchenStoreIds,
      updatedAt: new Date(),
    };
  });

export const normalizeStoreStocks = (stocks: StoreStock[]) =>
  mapIfChanged(stocks, (stock) => {
    const normalizedStoreLocation = normalizeStoreId(stock.storeLocation);
    if (normalizedStoreLocation === stock.storeLocation) {
      return stock;
    }

    return {
      ...stock,
      storeLocation: normalizedStoreLocation || stock.storeLocation,
      lastUpdated: new Date(),
    };
  });

export const normalizeStockTransfers = (transfers: StockTransfer[]) =>
  mapIfChanged(transfers, (transfer) => {
    const normalizedFromStore = normalizeStoreId(transfer.fromStore);
    const normalizedToStore = normalizeStoreId(transfer.toStore);
    if (normalizedFromStore === transfer.fromStore && normalizedToStore === transfer.toStore) {
      return transfer;
    }

    return {
      ...transfer,
      fromStore: normalizedFromStore || transfer.fromStore,
      toStore: normalizedToStore || transfer.toStore,
    };
  });

export const normalizeGoodsReceipts = (receipts: GoodsReceipt[]) =>
  mapIfChanged(receipts, (receipt) => {
    const normalizedDestinationStore = normalizeStoreId(receipt.destinationStore);
    const normalizedItems = mapIfChanged(receipt.items, (item) => {
      const normalizedItemStore = normalizeStoreId(item.destinationStore);
      if (normalizedItemStore === item.destinationStore) {
        return item;
      }
      return {
        ...item,
        destinationStore: normalizedItemStore,
      };
    });

    if (
      normalizedDestinationStore === receipt.destinationStore &&
      normalizedItems === receipt.items
    ) {
      return receipt;
    }

    return {
      ...receipt,
      destinationStore: normalizedDestinationStore || receipt.destinationStore,
      items: normalizedItems,
    };
  });

const isGeneratedKitchenStationCode = (value?: string) => Boolean(value?.match(/^KS-\d+$/i));

const getKitchenStationCode = (station: KitchenStation, stations: KitchenStation[]) => {
  if (station.stationCode) {
    return station.stationCode.toUpperCase();
  }

  if (isGeneratedKitchenStationCode(station.code)) {
    return station.code.toUpperCase();
  }

  const rowNumber = Math.max(
    stations.findIndex((entry) => entry.id === station.id) + 1,
    1,
  );
  return `KS-${String(rowNumber).padStart(4, '0')}`;
};

export const normalizeKitchenStations = (stations: KitchenStation[]) =>
  mapIfChanged(stations, (station) => {
    const normalizedLinkedStore = normalizeStoreId(station.linkedStoreId || station.linkedStoreLocation);
    const linkedStoreChanged =
      normalizedLinkedStore !== station.linkedStoreLocation ||
      normalizedLinkedStore !== station.linkedStoreId;
    const stationCode = getKitchenStationCode(station, stations);
    const stationName = station.stationName || station.name;
    const productionType =
      station.productionType === 'service' || station.productionType === 'both'
        ? station.productionType
        : 'production';
    const description = station.description || station.notes;

    if (
      normalizedLinkedStore === station.linkedStoreLocation &&
      normalizedLinkedStore === station.linkedStoreId &&
      station.stationId === station.id &&
      station.stationCode === stationCode &&
      station.stationName === stationName &&
      station.productionType === productionType &&
      station.description === description
    ) {
      return station;
    }

    return {
      ...station,
      stationId: station.id,
      stationCode,
      stationName,
      linkedStoreId: normalizedLinkedStore,
      linkedStoreLocation: normalizedLinkedStore,
      productionType,
      description,
      ...(linkedStoreChanged ? { updatedAt: new Date() } : {}),
    };
  });

export const normalizeKitchenIssueSheets = (issueSheets: KitchenIssueSheet[]) =>
  mapIfChanged(issueSheets, (issueSheet) => {
    const normalizedLineItems = mapIfChanged(issueSheet.lineItems, (lineItem) => {
      const normalizedSourceStore = normalizeStoreId(lineItem.sourceStore);
      if (normalizedSourceStore === lineItem.sourceStore) {
        return lineItem;
      }

      return {
        ...lineItem,
        sourceStore: normalizedSourceStore || lineItem.sourceStore,
      };
    });

    if (normalizedLineItems === issueSheet.lineItems) {
      return issueSheet;
    }

    return {
      ...issueSheet,
      lineItems: normalizedLineItems,
      updatedAt: new Date(),
    };
  });
