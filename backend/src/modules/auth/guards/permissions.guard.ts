import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSION_REQUIREMENTS_KEY, PermissionRequirement } from "../decorators/permissions.decorator";
import { AuthenticatedUser } from "../auth.types";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirements = this.reflector.getAllAndOverride<PermissionRequirement[]>(
      PERMISSION_REQUIREMENTS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requirements || requirements.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException("Authentication is required");
    }

    if (user.role === "ADMIN") {
      return true;
    }

    const hasAllRequirements = requirements.every((requirement) => {
      const permission = user.permissions.find((entry) => entry.moduleKey === requirement.moduleKey);
      if (!permission) {
        return false;
      }

      return requirement.actions.every((action) => {
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
      });
    });

    if (!hasAllRequirements) {
      throw new ForbiddenException("You do not have permission to use this module");
    }

    return true;
  }
}
