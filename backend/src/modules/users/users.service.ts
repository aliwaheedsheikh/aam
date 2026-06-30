import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import {
  FULL_ACCESS_PERMISSIONS,
  MODULE_KEYS,
  USER_MANAGEMENT_DEFAULT_PERMISSIONS,
  USER_PERMISSION_MODULES,
} from "../auth/auth.constants";
import { toAuthenticatedUser } from "../auth/auth.types";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  getPermissionCatalog() {
    return USER_PERMISSION_MODULES;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: {
        permissions: true,
      },
      orderBy: {
        fullName: "asc",
      },
    });

    return users.map((user) => this.toResponse(user));
  }

  async create(createUserDto: CreateUserDto) {
    const username = createUserDto.username.trim().toLowerCase();
    const email = this.normalizeEmail(createUserDto.email, username);
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException("A user with this username already exists");
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        fullName: createUserDto.fullName.trim(),
        passwordHash,
        role: createUserDto.role,
        isActive: createUserDto.isActive ?? true,
        permissions: {
          create: this.normalizePermissions(createUserDto.role, createUserDto.permissions),
        },
      },
      include: {
        permissions: true,
      },
    });

    return this.toResponse(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.ensureUserExists(id);

    const passwordHash = updateUserDto.password ? await bcrypt.hash(updateUserDto.password, 10) : undefined;
    const username = updateUserDto.username?.trim().toLowerCase();
    const email = updateUserDto.email || username ? this.normalizeEmail(updateUserDto.email, username) : undefined;

    if (username || email) {
      const existing = await this.prisma.user.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(username ? [{ username }] : []),
            ...(email ? [{ email }] : []),
          ],
        },
        select: { id: true },
      });

      if (existing) {
        throw new ConflictException("A user with this username already exists");
      }
    }

    const user = await this.prisma.$transaction(async (tx) => {
      if (updateUserDto.permissions) {
        await tx.userModuleAccess.deleteMany({
          where: {
            userId: id,
          },
        });
      }

      return tx.user.update({
        where: { id },
        data: {
          email,
          username,
          fullName: updateUserDto.fullName?.trim(),
          role: updateUserDto.role,
          isActive: updateUserDto.isActive,
          passwordHash,
          permissions: updateUserDto.permissions
            ? {
                create: this.normalizePermissions(updateUserDto.role, updateUserDto.permissions),
              }
            : undefined,
        },
        include: {
          permissions: true,
        },
      });
    });

    return this.toResponse(user);
  }

  private async ensureUserExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} was not found`);
    }
  }

  private normalizePermissions(role: UserRole | undefined, permissions: CreateUserDto["permissions"] = []) {
    if (role === "ADMIN" && permissions.length === 0) {
      return USER_MANAGEMENT_DEFAULT_PERMISSIONS.map((permission) => ({ ...permission }));
    }

    if (role === "ADMIN" && permissions.some((permission) => permission.moduleKey !== MODULE_KEYS.setup)) {
      return FULL_ACCESS_PERMISSIONS.map((defaultPermission) => {
        const provided = permissions.find((permission) => permission.moduleKey === defaultPermission.moduleKey);
        return provided
          ? {
              moduleKey: provided.moduleKey,
              canView: provided.canView,
              canCreate: provided.canCreate,
              canEdit: provided.canEdit,
              canDelete: provided.canDelete,
              canApprove: provided.canApprove,
              canExport: provided.canExport,
              canManage: provided.canManage,
            }
          : { ...defaultPermission };
      });
    }

    return permissions
      .filter((permission) => role === "ADMIN" || permission.moduleKey !== MODULE_KEYS.setup)
      .map((permission) => ({
        moduleKey: permission.moduleKey,
        canView: permission.canView,
        canCreate: permission.canCreate,
        canEdit: permission.canEdit,
        canDelete: permission.canDelete,
        canApprove: permission.canApprove,
        canExport: permission.canExport,
        canManage: permission.canManage,
      }));
  }

  private normalizeEmail(email: string | undefined, username: string | undefined) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (normalizedEmail) {
      return normalizedEmail;
    }

    if (!username) {
      throw new ConflictException("Username is required");
    }

    return `${username}@venueops.local`;
  }

  // A-7: Delegate permission mapping to the shared toAuthenticatedUser() function
  // instead of duplicating the identical mapping logic here for the third time.
  private toResponse(user: {
    id: string;
    email: string;
    username: string | null;
    fullName: string;
    role: UserRole;
    isActive: boolean;
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
  }) {
    return {
      ...toAuthenticatedUser(user),
      isActive: user.isActive,
    };
  }
}
