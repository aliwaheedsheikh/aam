import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength, ValidateNested } from "class-validator";
import { UserRole } from "@prisma/client";
import { UserPermissionDto } from "./user-permission.dto";

export class CreateUserDto {
  @IsString()
  fullName!: string;

  @IsString()
  username!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserPermissionDto)
  permissions!: UserPermissionDto[];
}
