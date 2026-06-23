import { UserRole } from "@prisma/client";

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

export type AuthenticatedUser = {
  id: string;
  email: string;
  username: string | null;
  fullName: string;
  role: UserRole;
  permissions: PermissionFlags[];
};
