import { SetMetadata } from "@nestjs/common";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve" | "export" | "manage";

export type PermissionRequirement = {
  moduleKey: string;
  actions: PermissionAction[];
};

export const PERMISSION_REQUIREMENTS_KEY = "permissionRequirements";
export const RequirePermissions = (moduleKey: string, ...actions: PermissionAction[]) =>
  SetMetadata(PERMISSION_REQUIREMENTS_KEY, [{ moduleKey, actions }] satisfies PermissionRequirement[]);
