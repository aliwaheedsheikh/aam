/**
 * Master Data Store
 * Centralized data management for all Master Setup modules
 * Uses localStorage as a fast cache and syncs to backend for persistence
 */

import { fetchApi } from "./apiBaseUrl";
import { getAuthToken } from "./authStorage";

// Storage keys
const STORAGE_KEYS = {
  VENUES: 'venueops_master_venues',
  PRIME_SPACES: 'venueops_master_prime_spaces',
  SUB_SPACES: 'venueops_master_sub_spaces',
  LAYOUTS: 'venueops_master_layouts',
  EVENT_TYPES: 'venueops_master_event_types',
  TIME_SLOTS: 'venueops_master_time_slots',
  SERVICES: 'venueops_master_services',
  ADDITIONAL_CHARGE_TYPES: 'venueops_master_additional_charge_types',
  PACKAGES: 'venueops_master_packages',
  RCS_CATEGORIES: 'venueops_master_rcs_categories',
  RCS_SERVICES: 'venueops_master_rcs_services',
  RCS_VENDORS: 'venueops_master_rcs_vendors',
  RCS_VENDOR_RATES: 'venueops_master_rcs_vendor_rates',
  RCS_PACKAGES: 'venueops_master_rcs_packages',
  RCS_COMMISSION_RULES: 'venueops_master_rcs_commission_rules',
  RCS_APPROVAL_SETTINGS: 'venueops_master_rcs_approval_settings',
  ADVANCE_RULES: 'venueops_master_advance_rules',
  TAX_GROUPS: 'venueops_master_tax_groups',
  DISCOUNTS: 'venueops_master_discounts',
};

const PENDING_MASTER_DATA_SYNC_KEY = 'venueops_master_pending_sync_keys';

const readPendingSyncKeys = () => {
  try {
    const stored = localStorage.getItem(PENDING_MASTER_DATA_SYNC_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === 'string') : [];
  } catch (error) {
    console.error('Error reading pending master data sync keys:', error);
    return [];
  }
};

const writePendingSyncKeys = (keys: string[]) => {
  try {
    const uniqueKeys = Array.from(new Set(keys));
    if (uniqueKeys.length === 0) {
      localStorage.removeItem(PENDING_MASTER_DATA_SYNC_KEY);
      return;
    }

    localStorage.setItem(PENDING_MASTER_DATA_SYNC_KEY, JSON.stringify(uniqueKeys));
  } catch (error) {
    console.error('Error writing pending master data sync keys:', error);
  }
};

const queueMasterDataSync = (key: string) => {
  writePendingSyncKeys([...readPendingSyncKeys(), key]);
};

const markMasterDataSynced = (key: string) => {
  writePendingSyncKeys(readPendingSyncKeys().filter((pendingKey) => pendingKey !== key));
};

// Generic storage functions
function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    queueMasterDataSync(key);
    // Trigger custom event to notify MasterDataContext of changes
    window.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { key } }));
    void flushPendingMasterDataToBackend();
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
}

function loadFromStorage<T>(key: string, defaultData: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // Convert date strings back to Date objects for all entity types
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          ...item,
          createdAt: item.createdAt ? new Date(item.createdAt) : item.createdAt,
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
        })) as T;
      }
      
      return parsed;
    }
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
  }
  return defaultData;
}

async function syncMasterDataKeyToBackend<T>(key: string, data: T) {
  const token = getAuthToken();
  if (!token) {
    return;
  }

  await putMasterDataKey(token, key, data);
  markMasterDataSynced(key);
}

async function putMasterDataKey<T>(token: string, key: string, data: T) {
  try {
    const response = await fetchApi(`/master-data/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key, value: data }),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync ${key} (${response.status})`);
    }
  } catch (error) {
    console.error(`Error syncing ${key} to backend:`, error);
    throw error;
  }
}

export async function flushPendingMasterDataToBackend() {
  const token = getAuthToken();
  if (!token || typeof window === 'undefined') {
    return;
  }

  for (const key of readPendingSyncKeys()) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      markMasterDataSynced(key);
      continue;
    }

    try {
      await syncMasterDataKeyToBackend(key, JSON.parse(raw));
    } catch (error) {
      console.error(`Error flushing pending master data for ${key}:`, error);
    }
  }
}

export async function hydrateMasterDataFromBackend() {
  const token = getAuthToken();
  if (!token) {
    return;
  }

  try {
    await flushPendingMasterDataToBackend();

    const response = await fetchApi("/master-data", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load master data (${response.status})`);
    }

    const records = (await response.json()) as Array<{ key: string; value: unknown }>;
    const remoteKeys = new Set(records.map((record) => record.key));

    for (const record of records) {
      localStorage.setItem(record.key, JSON.stringify(record.value));
    }

    for (const key of Object.values(STORAGE_KEYS)) {
      if (remoteKeys.has(key)) {
        continue;
      }

      const raw = localStorage.getItem(key);
      if (!raw) {
        continue;
      }

      try {
        await putMasterDataKey(token, key, JSON.parse(raw));
      } catch (error) {
        console.error(`Error backfilling ${key} to backend:`, error);
      }
    }

    window.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { key: 'all' } }));
  } catch (error) {
    console.error("Error hydrating master data from backend:", error);
  }
}

// Venue Master Data
export const venueDataStore = {
  getVenues: (defaultVenues: any[]) => {
    return loadFromStorage(STORAGE_KEYS.VENUES, defaultVenues);
  },
  saveVenues: (venues: any[]) => {
    saveToStorage(STORAGE_KEYS.VENUES, venues);
  },
};

// Prime Space Data
export const primeSpaceDataStore = {
  getPrimeSpaces: (defaultSpaces: any[]) => {
    return loadFromStorage(STORAGE_KEYS.PRIME_SPACES, defaultSpaces);
  },
  savePrimeSpaces: (spaces: any[]) => {
    saveToStorage(STORAGE_KEYS.PRIME_SPACES, spaces);
  },
};

// Sub Space Data
export const subSpaceDataStore = {
  getSubSpaces: (defaultSpaces: any[]) => {
    return loadFromStorage(STORAGE_KEYS.SUB_SPACES, defaultSpaces);
  },
  saveSubSpaces: (spaces: any[]) => {
    saveToStorage(STORAGE_KEYS.SUB_SPACES, spaces);
  },
};

// Layout Data
export const layoutDataStore = {
  getLayouts: (defaultLayouts: any[]) => {
    return loadFromStorage(STORAGE_KEYS.LAYOUTS, defaultLayouts);
  },
  saveLayouts: (layouts: any[]) => {
    saveToStorage(STORAGE_KEYS.LAYOUTS, layouts);
  },
};

// Event Configuration Data
export const eventConfigDataStore = {
  getEventTypes: (defaultTypes: any[]) => {
    return loadFromStorage(STORAGE_KEYS.EVENT_TYPES, defaultTypes);
  },
  saveEventTypes: (types: any[]) => {
    saveToStorage(STORAGE_KEYS.EVENT_TYPES, types);
  },
  getTimeSlots: (defaultSlots: any[]) => {
    return loadFromStorage(STORAGE_KEYS.TIME_SLOTS, defaultSlots);
  },
  saveTimeSlots: (slots: any[]) => {
    saveToStorage(STORAGE_KEYS.TIME_SLOTS, slots);
  },
  getServices: (defaultServices: any[]) => {
    return loadFromStorage(STORAGE_KEYS.SERVICES, defaultServices);
  },
  saveServices: (services: any[]) => {
    saveToStorage(STORAGE_KEYS.SERVICES, services);
  },
  getAdditionalChargeTypes: (defaultChargeTypes: any[]) => {
    return loadFromStorage(STORAGE_KEYS.ADDITIONAL_CHARGE_TYPES, defaultChargeTypes);
  },
  saveAdditionalChargeTypes: (chargeTypes: any[]) => {
    saveToStorage(STORAGE_KEYS.ADDITIONAL_CHARGE_TYPES, chargeTypes);
  },
  getPackages: (defaultPackages: any[]) => {
    return loadFromStorage(STORAGE_KEYS.PACKAGES, defaultPackages);
  },
  savePackages: (packages: any[]) => {
    saveToStorage(STORAGE_KEYS.PACKAGES, packages);
  },
};

// RCS Configuration Data
export const rcsConfigDataStore = {
  getCategories: (defaultCategories: any[]) => {
    return loadFromStorage(STORAGE_KEYS.RCS_CATEGORIES, defaultCategories);
  },
  saveCategories: (categories: any[]) => {
    saveToStorage(STORAGE_KEYS.RCS_CATEGORIES, categories);
  },
  getServices: (defaultServices: any[]) => {
    return loadFromStorage(STORAGE_KEYS.RCS_SERVICES, defaultServices);
  },
  saveServices: (services: any[]) => {
    saveToStorage(STORAGE_KEYS.RCS_SERVICES, services);
  },
  getVendors: (defaultVendors: any[]) => {
    return loadFromStorage(STORAGE_KEYS.RCS_VENDORS, defaultVendors);
  },
  saveVendors: (vendors: any[]) => {
    saveToStorage(STORAGE_KEYS.RCS_VENDORS, vendors);
  },
  getVendorRates: (defaultRates: any[]) => {
    return loadFromStorage(STORAGE_KEYS.RCS_VENDOR_RATES, defaultRates);
  },
  saveVendorRates: (rates: any[]) => {
    saveToStorage(STORAGE_KEYS.RCS_VENDOR_RATES, rates);
  },
  getPackages: (defaultPackages: any[]) => {
    return loadFromStorage(STORAGE_KEYS.RCS_PACKAGES, defaultPackages);
  },
  savePackages: (packages: any[]) => {
    saveToStorage(STORAGE_KEYS.RCS_PACKAGES, packages);
  },
  getCommissionRules: (defaultRules: any[]) => {
    return loadFromStorage(STORAGE_KEYS.RCS_COMMISSION_RULES, defaultRules);
  },
  saveCommissionRules: (rules: any[]) => {
    saveToStorage(STORAGE_KEYS.RCS_COMMISSION_RULES, rules);
  },
  getApprovalSettings: <T>(defaultSettings: T) => {
    return loadFromStorage(STORAGE_KEYS.RCS_APPROVAL_SETTINGS, defaultSettings);
  },
  saveApprovalSettings: (settings: any) => {
    saveToStorage(STORAGE_KEYS.RCS_APPROVAL_SETTINGS, settings);
  },
};

// Financial Configuration Data
export const financialConfigDataStore = {
  getAdvanceRules: (defaultRules: any[]) => {
    return loadFromStorage(STORAGE_KEYS.ADVANCE_RULES, defaultRules);
  },
  saveAdvanceRules: (rules: any[]) => {
    saveToStorage(STORAGE_KEYS.ADVANCE_RULES, rules);
  },
  getTaxGroups: (defaultGroups: any[]) => {
    return loadFromStorage(STORAGE_KEYS.TAX_GROUPS, defaultGroups);
  },
  saveTaxGroups: (groups: any[]) => {
    saveToStorage(STORAGE_KEYS.TAX_GROUPS, groups);
  },
};

// Discount Configuration Data
export const discountConfigDataStore = {
  getDiscounts: (defaultDiscounts: any[]) => {
    return loadFromStorage(STORAGE_KEYS.DISCOUNTS, defaultDiscounts);
  },
  saveDiscounts: (discounts: any[]) => {
    saveToStorage(STORAGE_KEYS.DISCOUNTS, discounts);
  },
};

// Helper function to clear all master data (for testing/reset)
export function clearAllMasterData() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// Helper function to export all data (for backup)
export function exportAllMasterData() {
  const data: Record<string, any> = {};
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    const stored = localStorage.getItem(key);
    if (stored) {
      data[name] = JSON.parse(stored);
    }
  });
  return data;
}

// Helper function to import all data (for restore)
export function importAllMasterData(data: Record<string, any>) {
  Object.entries(data).forEach(([name, value]) => {
    const key = STORAGE_KEYS[name as keyof typeof STORAGE_KEYS];
    if (key) {
      saveToStorage(key, value);
    }
  });
}
