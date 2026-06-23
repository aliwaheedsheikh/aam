import { UserRole } from "@prisma/client";

export const MODULE_KEYS = {
  dashboard: "dashboard",
  reservations: "reservations",
  banquetKitchen: "banquet-kitchen",
  restaurantKitchen: "restaurant-kitchen",
  accountsFinance: "accounts-finance",
  customerDatabase: "customer-database",
  inventory: "inventory",
  procurement: "procurement-management",
  reports: "reports",
  setup: "setup",
  systemFlow: "system-flow",
  hr: "hr",
} as const;

export type ModuleKey = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];

export const USER_PERMISSION_MODULES = [
  { key: MODULE_KEYS.dashboard, label: "Dashboard" },
  { key: MODULE_KEYS.reservations, label: "Reservations" },
  { key: MODULE_KEYS.banquetKitchen, label: "Banquet Kitchen" },
  { key: MODULE_KEYS.restaurantKitchen, label: "Restaurant Kitchen" },
  { key: MODULE_KEYS.accountsFinance, label: "Accounts & Finance" },
  { key: MODULE_KEYS.customerDatabase, label: "Customer Database" },
  { key: MODULE_KEYS.inventory, label: "Inventory" },
  { key: MODULE_KEYS.procurement, label: "Procurement" },
  { key: MODULE_KEYS.reports, label: "Reports" },
  { key: MODULE_KEYS.hr, label: "Human Resources" },
  { key: MODULE_KEYS.systemFlow, label: "System Flow" },
  { key: MODULE_KEYS.setup, label: "User & Permission Setup" },
] as const;

export const USER_MANAGEMENT_DEFAULT_PERMISSIONS = [
  {
    moduleKey: MODULE_KEYS.setup,
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canApprove: false,
    canExport: false,
    canManage: true,
  },
];

export const FULL_ACCESS_PERMISSIONS = USER_PERMISSION_MODULES.map((module) => ({
  moduleKey: module.key,
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canApprove: true,
  canExport: true,
  canManage: true,
}));

export const normalizeDevelopmentRole = (role: UserRole | undefined): UserRole | undefined => role;
