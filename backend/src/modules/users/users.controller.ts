import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { MODULE_KEYS } from "../auth/auth.constants";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @RequirePermissions(MODULE_KEYS.setup, "view", "manage")
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @RequirePermissions(MODULE_KEYS.setup, "view", "manage")
  @Get("permission-catalog")
  getPermissionCatalog() {
    return this.usersService.getPermissionCatalog();
  }

  @RequirePermissions(MODULE_KEYS.setup, "create", "manage")
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @RequirePermissions(MODULE_KEYS.setup, "edit", "manage")
  @Patch(":id")
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }
}
