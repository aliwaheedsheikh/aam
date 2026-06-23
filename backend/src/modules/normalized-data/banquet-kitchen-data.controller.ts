import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { MODULE_KEYS } from "../auth/auth.constants";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { NormalizedDataService } from "./normalized-data.service";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("banquet-kitchen-data")
export class BanquetKitchenDataController {
  constructor(private readonly normalizedDataService: NormalizedDataService) {}

  @RequirePermissions(MODULE_KEYS.banquetKitchen, "view")
  @Get()
  findCollections() {
    return this.normalizedDataService.findCollections("banquetKitchen");
  }

  @RequirePermissions(MODULE_KEYS.banquetKitchen, "view")
  @Get(":collection")
  findAll(@Param("collection") collection: string) {
    return this.normalizedDataService.findAll("banquetKitchen", collection);
  }

  @RequirePermissions(MODULE_KEYS.banquetKitchen, "view")
  @Get(":collection/:id")
  findOne(@Param("collection") collection: string, @Param("id") id: string) {
    return this.normalizedDataService.findOne("banquetKitchen", collection, id);
  }

  @RequirePermissions(MODULE_KEYS.banquetKitchen, "create")
  @Post(":collection")
  create(@Param("collection") collection: string, @Body() body: Record<string, unknown>) {
    return this.normalizedDataService.create("banquetKitchen", collection, body);
  }

  @RequirePermissions(MODULE_KEYS.banquetKitchen, "edit")
  @Patch(":collection/:id")
  update(
    @Param("collection") collection: string,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.normalizedDataService.update("banquetKitchen", collection, id, body);
  }

  @RequirePermissions(MODULE_KEYS.banquetKitchen, "delete")
  @Delete(":collection/:id")
  remove(@Param("collection") collection: string, @Param("id") id: string) {
    return this.normalizedDataService.remove("banquetKitchen", collection, id);
  }
}
