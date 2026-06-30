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

type UserWithPermissions = {
  id: string;
  email: string;
  username: string | null;
  fullName: string;
  role: UserRole;
  permissions: Array<{
    moduleKey: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canExport: boolean;
    canManage: boolean;
  }>;
};

/**
 * Maps a Prisma user+permissions record to the AuthenticatedUser DTO.
 * Centralised here (A-7) so jwt.strategy, auth.service, and users.service
 * all share the same mapping logic — adding a field only needs one change.
 */
export function toAuthenticatedUser(user: UserWithPermissions): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    permissions: user.permissions.map((p) => ({
      moduleKey: p.moduleKey,
      canView: p.canView,
      canCreate: p.canCreate,
      canEdit: p.canEdit,
      canDelete: p.canDelete,
      canApprove: p.canApprove,
      canExport: p.canExport,
      canManage: p.canManage,
    })),
  };
}
