export type PermissionFlags = {
  moduleKey: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
  canManage: boolean;
};

export type AuthUser = {
  id: string;
  email: string;
  username: string | null;
  fullName: string;
  role:
    | "ADMIN"
    | "GENERAL_MANAGER"
    | "FRONT_OFFICE"
    | "ACCOUNTS"
    | "BANQUET_CHEF"
    | "RESTAURANT_CHEF"
    | "HR_MANAGER";
  permissions: PermissionFlags[];
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};
