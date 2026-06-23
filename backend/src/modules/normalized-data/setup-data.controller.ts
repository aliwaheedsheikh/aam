import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { MODULE_KEYS } from "../auth/auth.constants";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { NormalizedDataService } from "./normalized-data.service";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("setup-data")
export class SetupDataController {
  constructor(private readonly normalizedDataService: NormalizedDataService) {}

  @RequirePermissions(MODULE_KEYS.setup, "view")
  @Get()
  findCollections() {
    return this.normalizedDataService.findCollections("setup");
  }

  @RequirePermissions(MODULE_KEYS.setup, "view")
  @Get(":collection")
  findAll(@Param("collection") collection: string) {
    return this.normalizedDataService.findAll("setup", collection);
  }

  @RequirePermissions(MODULE_KEYS.setup, "view")
  @Get(":collection/:id")
  findOne(@Param("collection") collection: string, @Param("id") id: string) {
    return this.normalizedDataService.findOne("setup", collection, id);
  }

  @RequirePermissions(MODULE_KEYS.setup, "create")
  @Post(":collection")
  create(@Param("collection") collection: string, @Body() body: Record<string, unknown>) {
    return this.normalizedDataService.create("setup", collection, body);
  }

  @RequirePermissions(MODULE_KEYS.setup, "edit")
  @Patch(":collection/:id")
  update(
    @Param("collection") collection: string,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.normalizedDataService.update("setup", collection, id, body);
  }

  @RequirePermissions(MODULE_KEYS.setup, "delete")
  @Delete(":collection/:id")
  remove(@Param("collection") collection: string, @Param("id") id: string) {
    return this.normalizedDataService.remove("setup", collection, id);
  }
}
