import { AuthUser, PermissionFlags } from "./authTypes";

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

export const normalizeRole = (role: AuthUser["role"]) => {
  switch (role) {
    case "ADMIN":
      return "admin";
    case "GENERAL_MANAGER":
      return "general-manager";
    case "FRONT_OFFICE":
      return "front-office";
    case "ACCOUNTS":
      return "accounts";
    case "BANQUET_CHEF":
      return "banquet-chef";
    case "RESTAURANT_CHEF":
      return "restaurant-chef";
    case "HR_MANAGER":
      return "hr-manager";
    default:
      return "front-office";
  }
};

export const getPermission = (permissions: PermissionFlags[], moduleKey: string) =>
  permissions.find((entry) => entry.moduleKey === moduleKey);

const ROLE_DEFAULT_MODULES: Record<string, string[]> = {
  admin: [
    MODULE_KEYS.dashboard,
    MODULE_KEYS.reservations,
    MODULE_KEYS.banquetKitchen,
    MODULE_KEYS.restaurantKitchen,
    MODULE_KEYS.accountsFinance,
    MODULE_KEYS.customerDatabase,
    MODULE_KEYS.inventory,
    MODULE_KEYS.procurement,
    MODULE_KEYS.reports,
    MODULE_KEYS.setup,
    MODULE_KEYS.systemFlow,
    MODULE_KEYS.hr,
  ],
  "front-office": [
    MODULE_KEYS.dashboard,
    MODULE_KEYS.reservations,
    MODULE_KEYS.customerDatabase,
  ],
  "general-manager": [
    MODULE_KEYS.dashboard,
    MODULE_KEYS.reservations,
    MODULE_KEYS.accountsFinance,
    MODULE_KEYS.customerDatabase,
    MODULE_KEYS.reports,
  ],
  accounts: [
    MODULE_KEYS.dashboard,
    MODULE_KEYS.accountsFinance,
    MODULE_KEYS.customerDatabase,
    MODULE_KEYS.reports,
  ],
  "banquet-chef": [
    MODULE_KEYS.dashboard,
    MODULE_KEYS.banquetKitchen,
    MODULE_KEYS.inventory,
  ],
  "restaurant-chef": [
    MODULE_KEYS.dashboard,
    MODULE_KEYS.restaurantKitchen,
    MODULE_KEYS.inventory,
  ],
  "hr-manager": [
    MODULE_KEYS.dashboard,
    MODULE_KEYS.hr,
  ],
};

const ROLE_MODULE_CAPS: Partial<Record<string, string[]>> = {
  "front-office": [MODULE_KEYS.dashboard, MODULE_KEYS.reservations, MODULE_KEYS.customerDatabase],
  "general-manager": ROLE_DEFAULT_MODULES["general-manager"],
  accounts: ROLE_DEFAULT_MODULES.accounts,
  "banquet-chef": ROLE_DEFAULT_MODULES["banquet-chef"],
  "restaurant-chef": ROLE_DEFAULT_MODULES["restaurant-chef"],
  "hr-manager": ROLE_DEFAULT_MODULES["hr-manager"],
};

export const hasExplicitPermissions = (permissions: PermissionFlags[] | undefined | null) =>
  Array.isArray(permissions) && permissions.length > 0;

export const hasRoleBasedModuleAccess = (
  role: string,
  moduleKey: string,
  action: "view" | "create" | "edit" | "delete" | "approve" | "export" | "manage" = "view",
) => {
  if (role === "admin") {
    return true;
  }

  if (action !== "view") {
    return false;
  }

  return ROLE_DEFAULT_MODULES[role]?.includes(moduleKey) ?? false;
};

export const hasModuleAction = (
  permissions: PermissionFlags[],
  moduleKey: string,
  action: "view" | "create" | "edit" | "delete" | "approve" | "export" | "manage" = "view",
) => {
  const permission = getPermission(permissions, moduleKey);
  if (!permission) {
    return false;
  }

  switch (action) {
    case "view":
      return permission.canView;
    case "create":
      return permission.canCreate;
    case "edit":
      return permission.canEdit;
    case "delete":
      return permission.canDelete;
    case "approve":
      return permission.canApprove;
    case "export":
      return permission.canExport;
    case "manage":
      return permission.canManage;
    default:
      return false;
  }
};

export const canAccessModuleForRole = (
  role: string,
  permissions: PermissionFlags[] | undefined | null,
  moduleKey: string,
  action: "view" | "create" | "edit" | "delete" | "approve" | "export" | "manage" = "view",
) => {
  if (role === "admin") {
    return true;
  }

  const roleCap = ROLE_MODULE_CAPS[role];
  if (roleCap && !roleCap.includes(moduleKey)) {
    return false;
  }

  if (hasExplicitPermissions(permissions)) {
    const scopedPermissions = permissions ?? [];
    const explicitPermission = getPermission(scopedPermissions, moduleKey);

    if (explicitPermission) {
      return hasModuleAction(scopedPermissions, moduleKey, action);
    }

    if (action === "view" && roleCap?.includes(moduleKey)) {
      return hasRoleBasedModuleAccess(role, moduleKey, action);
    }

    return false;
  }

  return hasRoleBasedModuleAccess(role, moduleKey, action);
};

export const canAccessReservationPaymentTools = (
  role: string,
  permissions: PermissionFlags[] | undefined | null,
) => {
  if (role === "admin") {
    return true;
  }

  if (hasExplicitPermissions(permissions)) {
    const scopedPermissions = permissions ?? [];
    return (
      hasModuleAction(scopedPermissions, MODULE_KEYS.accountsFinance, "view") ||
      hasModuleAction(scopedPermissions, MODULE_KEYS.accountsFinance, "create") ||
      hasModuleAction(scopedPermissions, MODULE_KEYS.accountsFinance, "edit") ||
      hasModuleAction(scopedPermissions, MODULE_KEYS.accountsFinance, "manage") ||
      hasModuleAction(scopedPermissions, MODULE_KEYS.reservations, "manage")
    );
  }

  return ["front-office", "general-manager", "accounts"].includes(role);
};

export const canAccessBookingAgreementPreview = (
  role: string,
  permissions: PermissionFlags[] | undefined | null,
) => canAccessModuleForRole(role, permissions, MODULE_KEYS.reservations, "view");
