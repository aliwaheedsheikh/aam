import { IsBoolean, IsString } from "class-validator";

export class UserPermissionDto {
  @IsString()
  moduleKey!: string;

  @IsBoolean()
  canView!: boolean;

  @IsBoolean()
  canCreate!: boolean;

  @IsBoolean()
  canEdit!: boolean;

  @IsBoolean()
  canDelete!: boolean;

  @IsBoolean()
  canApprove!: boolean;

  @IsBoolean()
  canExport!: boolean;

  @IsBoolean()
  canManage!: boolean;
}
