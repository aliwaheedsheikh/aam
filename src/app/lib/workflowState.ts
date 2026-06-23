import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { fetchApi } from "./apiBaseUrl";
import { getAuthToken } from "./authStorage";

const WORKFLOW_EVENT_NAME = "workflowStateUpdated";
const WORKFLOW_KEY_PREFIX = "workflow:";
const PENDING_WORKFLOW_SYNC_KEY = "workflow:pending-sync-keys";
const WORKFLOW_SYNC_META_KEY = "workflow:sync-meta";

type WorkflowSyncMeta = {
  dirty?: boolean;
  localUpdatedAt?: string;
  lastRemoteUpdatedAt?: string;
};

type MergeableWorkflowItem = Record<string, unknown> & {
  id: string;
  updatedAt?: string | Date;
  createdAt?: string | Date;
};

export const WORKFLOW_STATE_KEYS = {
  customerDatabase: `${WORKFLOW_KEY_PREFIX}customer-database`,
  customerDirectory: `${WORKFLOW_KEY_PREFIX}customer-directory`,
  banquetCuisines: `${WORKFLOW_KEY_PREFIX}banquet-cuisines`,
  kitchenStations: `${WORKFLOW_KEY_PREFIX}kitchen-stations`,
  dishCategories: `${WORKFLOW_KEY_PREFIX}dish-categories`,
  measurementUnits: `${WORKFLOW_KEY_PREFIX}measurement-units`,
  banquetDishes: `${WORKFLOW_KEY_PREFIX}banquet-dishes`,
  purchaseItems: `${WORKFLOW_KEY_PREFIX}purchase-items`,
  banquetRecipes: `${WORKFLOW_KEY_PREFIX}banquet-recipes`,
  banquetMenuPackages: `${WORKFLOW_KEY_PREFIX}banquet-menu-packages`,
  banquetMenuPackageTypes: `${WORKFLOW_KEY_PREFIX}banquet-menu-package-types`,
  centralKitchenEstimates: `${WORKFLOW_KEY_PREFIX}central-kitchen-estimates`,
  centralKitchenCorrectionRequests: `${WORKFLOW_KEY_PREFIX}central-kitchen-correction-requests`,
  centralKitchenBackupPlans: `${WORKFLOW_KEY_PREFIX}central-kitchen-backup-plans`,
  centralKitchenRequisitions: `${WORKFLOW_KEY_PREFIX}central-kitchen-requisitions`,
  centralKitchenDispatchPlans: `${WORKFLOW_KEY_PREFIX}central-kitchen-dispatch-plans`,
  stores: `${WORKFLOW_KEY_PREFIX}stores`,
  procurementLookups: `${WORKFLOW_KEY_PREFIX}procurement-lookups`,
  vendors: `${WORKFLOW_KEY_PREFIX}vendors`,
  vendorItemMappings: `${WORKFLOW_KEY_PREFIX}vendor-item-mappings`,
  purchaseOrders: `${WORKFLOW_KEY_PREFIX}purchase-orders`,
  goodsReceipts: `${WORKFLOW_KEY_PREFIX}goods-receipts`,
  storeStocks: `${WORKFLOW_KEY_PREFIX}store-stocks`,
  stockTransfers: `${WORKFLOW_KEY_PREFIX}stock-transfers`,
  kitchenIssueSheets: `${WORKFLOW_KEY_PREFIX}kitchen-issue-sheets`,
  customerInvoices: `${WORKFLOW_KEY_PREFIX}customer-invoices`,
  vendorBills: `${WORKFLOW_KEY_PREFIX}vendor-bills`,
  generalExpenses: `${WORKFLOW_KEY_PREFIX}general-expenses`,
  chartOfAccounts: `${WORKFLOW_KEY_PREFIX}chart-of-accounts`,
  accountingPostingRules: `${WORKFLOW_KEY_PREFIX}accounting-posting-rules`,
} as const;

const isIsoDateString = (value: string) =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) ||
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?[+-]\d{2}:\d{2}$/.test(value);

const reviveDates = <T>(value: T): T => {
  if (typeof value === "string" && isIsoDateString(value)) {
    return new Date(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => reviveDates(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, reviveDates(entry)]),
    ) as T;
  }

  return value;
};

const emitWorkflowStateUpdated = (key: string) => {
  window.dispatchEvent(new CustomEvent(WORKFLOW_EVENT_NAME, { detail: { key } }));
};

const readWorkflowSyncMeta = () => {
  if (typeof window === "undefined") {
    return {} as Record<string, WorkflowSyncMeta>;
  }

  try {
    const stored = window.localStorage.getItem(WORKFLOW_SYNC_META_KEY);
    if (!stored) {
      return {} as Record<string, WorkflowSyncMeta>;
    }

    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, WorkflowSyncMeta>)
      : ({} as Record<string, WorkflowSyncMeta>);
  } catch (error) {
    console.error("Failed to read workflow sync meta:", error);
    return {} as Record<string, WorkflowSyncMeta>;
  }
};

const writeWorkflowSyncMeta = (meta: Record<string, WorkflowSyncMeta>) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const nextMetaEntries = Object.entries(meta).filter(([, value]) => {
      if (!value || typeof value !== "object") {
        return false;
      }

      return Boolean(value.dirty || value.localUpdatedAt || value.lastRemoteUpdatedAt);
    });

    if (nextMetaEntries.length === 0) {
      window.localStorage.removeItem(WORKFLOW_SYNC_META_KEY);
      return;
    }

    window.localStorage.setItem(WORKFLOW_SYNC_META_KEY, JSON.stringify(Object.fromEntries(nextMetaEntries)));
  } catch (error) {
    console.error("Failed to write workflow sync meta:", error);
  }
};

const getWorkflowSyncMeta = (key: string): WorkflowSyncMeta => readWorkflowSyncMeta()[key] || {};

const updateWorkflowSyncMeta = (key: string, updater: (current: WorkflowSyncMeta) => WorkflowSyncMeta) => {
  const meta = readWorkflowSyncMeta();
  meta[key] = updater(meta[key] || {});
  writeWorkflowSyncMeta(meta);
};

const readPendingWorkflowSyncKeys = () => {
  try {
    const stored = window.localStorage.getItem(PENDING_WORKFLOW_SYNC_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string") : [];
  } catch (error) {
    console.error("Failed to read pending workflow sync keys:", error);
    return [];
  }
};

const writePendingWorkflowSyncKeys = (keys: string[]) => {
  try {
    const uniqueKeys = Array.from(new Set(keys));
    if (uniqueKeys.length === 0) {
      window.localStorage.removeItem(PENDING_WORKFLOW_SYNC_KEY);
      return;
    }

    window.localStorage.setItem(PENDING_WORKFLOW_SYNC_KEY, JSON.stringify(uniqueKeys));
  } catch (error) {
    console.error("Failed to write pending workflow sync keys:", error);
  }
};

const queueWorkflowStateSync = (key: string) => {
  writePendingWorkflowSyncKeys([...readPendingWorkflowSyncKeys(), key]);
};

const markWorkflowStateSynced = (key: string, remoteUpdatedAt?: string) => {
  writePendingWorkflowSyncKeys(readPendingWorkflowSyncKeys().filter((pendingKey) => pendingKey !== key));
  updateWorkflowSyncMeta(key, (current) => ({
    ...current,
    dirty: false,
    lastRemoteUpdatedAt: remoteUpdatedAt || current.lastRemoteUpdatedAt,
  }));
};

const markWorkflowStateDirty = (key: string) => {
  updateWorkflowSyncMeta(key, (current) => ({
    ...current,
    dirty: true,
    localUpdatedAt: new Date().toISOString(),
  }));
};

const isMergeableWorkflowItem = (value: unknown): value is MergeableWorkflowItem =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  typeof (value as { id?: unknown }).id === "string";

const isMergeableWorkflowCollection = (value: unknown): value is MergeableWorkflowItem[] =>
  Array.isArray(value) && value.every((entry) => isMergeableWorkflowItem(entry));

const getWorkflowItemTimestamp = (entry: MergeableWorkflowItem) => {
  const rawTimestamp =
    typeof entry.updatedAt === "string" || entry.updatedAt instanceof Date
      ? entry.updatedAt
      : typeof entry.createdAt === "string" || entry.createdAt instanceof Date
        ? entry.createdAt
        : null;

  if (!rawTimestamp) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = new Date(rawTimestamp).getTime();
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};

const mergeWorkflowCollections = (remoteValue: unknown, localValue: unknown) => {
  if (!isMergeableWorkflowCollection(remoteValue) || !isMergeableWorkflowCollection(localValue)) {
    return localValue;
  }

  const remoteById = new Map(remoteValue.map((entry) => [entry.id, entry] as const));
  const localIds = new Set(localValue.map((entry) => entry.id));
  const mergedItems = localValue.map((localEntry) => {
    const remoteEntry = remoteById.get(localEntry.id);
    if (!remoteEntry) {
      return localEntry;
    }

    return getWorkflowItemTimestamp(remoteEntry) > getWorkflowItemTimestamp(localEntry)
      ? remoteEntry
      : localEntry;
  });

  remoteValue.forEach((remoteEntry) => {
    if (!localIds.has(remoteEntry.id)) {
      mergedItems.push(remoteEntry);
    }
  });

  return mergedItems;
};

const prepareWorkflowStateForSync = async (token: string, key: string, value: unknown) => {
  if (!isMergeableWorkflowCollection(value)) {
    return value;
  }

  try {
    const response = await fetchApi(`/app-state/${encodeURIComponent(key)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return value;
    }

    const remoteRecord = (await response.json()) as { value?: unknown } | null;
    return mergeWorkflowCollections(remoteRecord?.value, value);
  } catch (error) {
    console.error(`Failed to merge remote workflow state for ${key}:`, error);
    return value;
  }
};

const putWorkflowState = async (token: string, key: string, value: unknown) => {
  const payloadValue = await prepareWorkflowStateForSync(token, key, value);
  const response = await fetchApi(`/app-state/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ key, value: payloadValue }),
  });

  if (!response.ok) {
    throw new Error(`Failed to sync workflow state for ${key} (${response.status})`);
  }

  const record = (await response.json()) as { updatedAt?: string; value?: unknown };
  setLocalWorkflowStateFromRemote(key, record.value ?? payloadValue, record.updatedAt);
};

const setLocalWorkflowStateFromRemote = (key: string, value: unknown, remoteUpdatedAt?: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
  markWorkflowStateSynced(key, remoteUpdatedAt);
  emitWorkflowStateUpdated(key);
};

export const flushPendingWorkflowStateToBackend = async () => {
  const token = getAuthToken();
  if (!token || typeof window === "undefined") {
    return;
  }

  for (const key of readPendingWorkflowSyncKeys()) {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      markWorkflowStateSynced(key);
      continue;
    }

    try {
      await putWorkflowState(token, key, JSON.parse(raw));
    } catch (error) {
      console.error(`Failed to flush workflow state for ${key}:`, error);
    }
  }
};

export const loadWorkflowState = <T>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return defaultValue;
    }

    return reviveDates(JSON.parse(raw)) as T;
  } catch (error) {
    console.error(`Failed to load workflow state for ${key}:`, error);
    return defaultValue;
  }
};

const getWorkflowStateSignature = (value: unknown) => {
  try {
    return JSON.stringify(value) ?? null;
  } catch (error) {
    console.error("Failed to serialize workflow state:", error);
    return null;
  }
};

export const saveWorkflowState = <T>(key: string, value: T) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    queueWorkflowStateSync(key);
    markWorkflowStateDirty(key);
    emitWorkflowStateUpdated(key);
  } catch (error) {
    console.error(`Failed to cache workflow state for ${key}:`, error);
    return;
  }

  const token = getAuthToken();
  if (!token) {
    return;
  }

  void putWorkflowState(token, key, value).catch((error) => {
    console.error(`Failed to sync workflow state for ${key}:`, error);
  });
};

export const hydrateWorkflowStateFromBackend = async () => {
  const token = getAuthToken();
  if (!token || typeof window === "undefined") {
    return;
  }

  try {
    const response = await fetchApi("/app-state", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load workflow state (${response.status})`);
    }

    const records = (await response.json()) as Array<{ key: string; value: unknown; updatedAt?: string }>;
    const remoteKeys = new Set(records.map((record) => record.key));
    const dirtyKeysToPush = new Set<string>();

    for (const record of records) {
      const localRaw = window.localStorage.getItem(record.key);
      const localMeta = getWorkflowSyncMeta(record.key);
      const localSignature = localRaw ? getWorkflowStateSignature(JSON.parse(localRaw)) : null;
      const remoteSignature = getWorkflowStateSignature(record.value);
      const remoteUpdatedAt = record.updatedAt;
      const lastKnownRemoteAt = localMeta.lastRemoteUpdatedAt
        ? new Date(localMeta.lastRemoteUpdatedAt).getTime()
        : null;
      const currentRemoteAt = remoteUpdatedAt ? new Date(remoteUpdatedAt).getTime() : null;
      const localUpdatedAt = localMeta.localUpdatedAt
        ? new Date(localMeta.localUpdatedAt).getTime()
        : null;

      if (!localMeta.dirty) {
        if (localSignature !== remoteSignature) {
          setLocalWorkflowStateFromRemote(record.key, record.value, remoteUpdatedAt);
        } else {
          markWorkflowStateSynced(record.key, remoteUpdatedAt);
        }
        continue;
      }

      if (localSignature !== null && localSignature === remoteSignature) {
        markWorkflowStateSynced(record.key, remoteUpdatedAt);
        continue;
      }

      if (
        currentRemoteAt !== null &&
        localUpdatedAt !== null &&
        currentRemoteAt > localUpdatedAt
      ) {
        setLocalWorkflowStateFromRemote(record.key, record.value, remoteUpdatedAt);
        continue;
      }

      if (lastKnownRemoteAt === null) {
        // A just-saved workflow collection can be dirty before the first remote timestamp is known.
        // Keep the local change authoritative when it is newer than the backend record, so live polling
        // cannot briefly revert Banquet Kitchen masters, recipes, or packages to stale database JSON.
        if (localUpdatedAt !== null && currentRemoteAt !== null && localUpdatedAt >= currentRemoteAt) {
          dirtyKeysToPush.add(record.key);
          continue;
        }

        setLocalWorkflowStateFromRemote(record.key, record.value, remoteUpdatedAt);
        continue;
      }

      if (
        currentRemoteAt !== null &&
        currentRemoteAt > lastKnownRemoteAt &&
        (localUpdatedAt === null || currentRemoteAt >= localUpdatedAt)
      ) {
        setLocalWorkflowStateFromRemote(record.key, record.value, remoteUpdatedAt);
        continue;
      }

      dirtyKeysToPush.add(record.key);
    }

    for (const key of Object.values(WORKFLOW_STATE_KEYS)) {
      const meta = getWorkflowSyncMeta(key);
      const raw = window.localStorage.getItem(key);
      if (!meta.dirty) {
        continue;
      }

      if (!raw) {
        continue;
      }

      if (!remoteKeys.has(key) || dirtyKeysToPush.has(key)) {
        try {
          await putWorkflowState(token, key, JSON.parse(raw));
        } catch (error) {
          console.error(`Failed to sync workflow state for ${key}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Failed to hydrate workflow state from backend:", error);
  }
};

export const usePersistedWorkflowState = <T>(
  key: string,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] => {
  const defaultValueRef = useRef(defaultValue);
  const stateSignatureRef = useRef<string | null>(null);
  const [state, setState] = useState<T>(() => {
    const initialState = loadWorkflowState(key, defaultValueRef.current);
    stateSignatureRef.current = getWorkflowStateSignature(initialState);
    return initialState;
  });

  const reloadStateFromStorage = useCallback(() => {
    const nextState = loadWorkflowState(key, defaultValueRef.current);
    const nextSignature = getWorkflowStateSignature(nextState);

    if (nextSignature && nextSignature === stateSignatureRef.current) {
      return;
    }

    stateSignatureRef.current = nextSignature;
    setState(nextState);
  }, [key]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== key) {
        return;
      }

      reloadStateFromStorage();
    };

    const handleWorkflowUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (detail?.key && detail.key !== key) {
        return;
      }

      reloadStateFromStorage();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(WORKFLOW_EVENT_NAME, handleWorkflowUpdate);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(WORKFLOW_EVENT_NAME, handleWorkflowUpdate);
    };
  }, [key, reloadStateFromStorage]);

  const updateState: Dispatch<SetStateAction<T>> = useCallback((value) => {
    setState((current) => {
      const nextValue =
        typeof value === "function" ? (value as (current: T) => T)(current) : value;

      if (nextValue === current) {
        return current;
      }

      const nextSignature = getWorkflowStateSignature(nextValue);
      if (nextSignature && nextSignature === stateSignatureRef.current) {
        return current;
      }

      stateSignatureRef.current = nextSignature;
      saveWorkflowState(key, nextValue);
      return nextValue;
    });
  }, [key]);

  return [state, updateState];
};
