import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { fetchApi } from "./apiBaseUrl";
import { getAuthToken } from "./authStorage";

const WORKFLOW_EVENT_NAME = "workflowStateUpdated";
const WORKFLOW_KEY_PREFIX = "workflow:";
const PENDING_WORKFLOW_SYNC_KEY = "workflow:pending-sync-keys";
const WORKFLOW_SYNC_META_KEY = "workflow:sync-meta";
const pendingWorkflowEventKeys = new Set<string>();
let workflowEventFlushScheduled = false;
const inFlightWorkflowSyncKeys = new Set<string>();
const scheduledWorkflowSyncTimers = new Map<string, number>();
const workflowSyncRetryDelays = new Map<string, number>();

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
  banquetProductionCostMethods: `${WORKFLOW_KEY_PREFIX}banquet-production-cost-methods`,
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

const scheduleWorkflowStateUpdated = (key: string) => {
  if (typeof window === "undefined") {
    return;
  }

  pendingWorkflowEventKeys.add(key);
  if (workflowEventFlushScheduled) {
    return;
  }

  workflowEventFlushScheduled = true;
  const flushWorkflowEvents = () => {
    workflowEventFlushScheduled = false;
    const keys = Array.from(pendingWorkflowEventKeys);
    pendingWorkflowEventKeys.clear();
    keys.forEach((eventKey) => emitWorkflowStateUpdated(eventKey));
  };

  if (typeof queueMicrotask === "function") {
    queueMicrotask(flushWorkflowEvents);
    return;
  }

  window.setTimeout(flushWorkflowEvents, 0);
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
  workflowSyncRetryDelays.delete(key);
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

const getWorkflowStateSignature = (value: unknown) => {
  try {
    return JSON.stringify(value) ?? null;
  } catch (error) {
    console.error("Failed to serialize workflow state:", error);
    return null;
  }
};

const readLocalWorkflowStateSnapshot = (key: string) => {
  if (typeof window === "undefined") {
    return { signature: null, value: undefined as unknown };
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return { signature: null, value: undefined as unknown };
    }

    const value = JSON.parse(raw);
    return {
      signature: getWorkflowStateSignature(value),
      value,
    };
  } catch (error) {
    console.error(`Failed to read local workflow state for ${key}:`, error);
    return { signature: null, value: undefined as unknown };
  }
};

const getNextWorkflowSyncRetryDelay = (key: string) => {
  const currentDelay = workflowSyncRetryDelays.get(key) ?? 1000;
  workflowSyncRetryDelays.set(key, Math.min(currentDelay * 2, 30000));
  return currentDelay;
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
  const requestSignature = getWorkflowStateSignature(value);
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
  const localSnapshot = readLocalWorkflowStateSnapshot(key);

  if (
    requestSignature &&
    localSnapshot.signature &&
    localSnapshot.signature !== requestSignature
  ) {
    queueWorkflowStateSync(key);
    markWorkflowStateDirty(key);
    return;
  }

  const remoteValue = record.value ?? payloadValue;
  const remoteSignature = getWorkflowStateSignature(remoteValue);
  const payloadSignature = getWorkflowStateSignature(payloadValue);

  if (
    localSnapshot.signature &&
    remoteSignature &&
    localSnapshot.signature === remoteSignature
  ) {
    markWorkflowStateSynced(key, record.updatedAt);
    return;
  }

  // If the server's response matches exactly what we submitted, the server
  // merely echoed our own payload (no other client merged in new data).
  // Write to localStorage silently — do NOT fire a state-update event, because
  // that would re-trigger repricing effects which would dirty the key again.
  const serverEchoedOurPayload =
    payloadSignature !== null && payloadSignature === remoteSignature;

  setLocalWorkflowStateFromRemote(key, remoteValue, record.updatedAt, serverEchoedOurPayload);
};

const scheduleWorkflowStateSync = (token: string, key: string, delayMs = 0) => {
  if (typeof window === "undefined") {
    return;
  }

  const existingTimer = scheduledWorkflowSyncTimers.get(key);
  if (existingTimer !== undefined) {
    window.clearTimeout(existingTimer);
  }

  const timer = window.setTimeout(() => {
    scheduledWorkflowSyncTimers.delete(key);

    if (inFlightWorkflowSyncKeys.has(key)) {
      scheduleWorkflowStateSync(token, key, 250);
      return;
    }

    const raw = window.localStorage.getItem(key);
    if (!raw) {
      markWorkflowStateSynced(key);
      return;
    }

    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch (error) {
      console.error(`Failed to parse queued workflow state for ${key}:`, error);
      return;
    }

    let syncSucceeded = false;
    inFlightWorkflowSyncKeys.add(key);
    void putWorkflowState(token, key, value)
      .then(() => {
        syncSucceeded = true;
        workflowSyncRetryDelays.delete(key);
      })
      .catch((error) => {
        console.error(`Failed to sync workflow state for ${key}:`, error);
      })
      .finally(() => {
        inFlightWorkflowSyncKeys.delete(key);
        if (getWorkflowSyncMeta(key).dirty) {
          scheduleWorkflowStateSync(token, key, syncSucceeded ? 500 : getNextWorkflowSyncRetryDelay(key));
        }
      });
  }, delayMs);

  scheduledWorkflowSyncTimers.set(key, timer);
};

const setLocalWorkflowStateFromRemote = (
  key: string,
  value: unknown,
  remoteUpdatedAt?: string,
  silent = false,
) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
  markWorkflowStateSynced(key, remoteUpdatedAt);
  if (!silent) {
    scheduleWorkflowStateUpdated(key);
  }
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

    scheduleWorkflowStateSync(token, key);
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

export const saveWorkflowState = <T>(key: string, value: T) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    queueWorkflowStateSync(key);
    markWorkflowStateDirty(key);
    scheduleWorkflowStateUpdated(key);
  } catch (error) {
    console.error(`Failed to cache workflow state for ${key}:`, error);
    return;
  }

  const token = getAuthToken();
  if (!token) {
    return;
  }

  scheduleWorkflowStateSync(token, key);
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

      if (lastKnownRemoteAt === null) {
        // A dirty workflow key has a local edit that has not been acknowledged by the backend yet.
        // Do not trust raw client/server timestamps here because clock skew or overlapping refreshes
        // can make an older remote snapshot look newer and repeatedly revert Banquet Recipe & Costing edits.
        dirtyKeysToPush.add(record.key);
        continue;
      }

      if (
        currentRemoteAt !== null &&
        currentRemoteAt > lastKnownRemoteAt
      ) {
        // Another client may have updated the same workflow collection while this client was still dirty.
        // Keep the local copy in place and let the next PUT merge the two collections item-by-item instead
        // of replacing the current editor state with a full stale/foreign snapshot.
        dirtyKeysToPush.add(record.key);
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
        scheduleWorkflowStateSync(token, key);
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
