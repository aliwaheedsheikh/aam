import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { MODULE_KEYS } from "../auth/auth.constants";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { NormalizedDataService } from "./normalized-data.service";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("finance-data")
export class FinanceDataController {
  constructor(private readonly normalizedDataService: NormalizedDataService) {}

  @RequirePermissions(MODULE_KEYS.accountsFinance, "view")
  @Get()
  findCollections() {
    return this.normalizedDataService.findCollections("finance");
  }

  @RequirePermissions(MODULE_KEYS.accountsFinance, "view")
  @Get(":collection")
  findAll(@Param("collection") collection: string) {
    return this.normalizedDataService.findAll("finance", collection);
  }

  @RequirePermissions(MODULE_KEYS.accountsFinance, "view")
  @Get(":collection/:id")
  findOne(@Param("collection") collection: string, @Param("id") id: string) {
    return this.normalizedDataService.findOne("finance", collection, id);
  }

  @RequirePermissions(MODULE_KEYS.accountsFinance, "create")
  @Post(":collection")
  create(@Param("collection") collection: string, @Body() body: Record<string, unknown>) {
    return this.normalizedDataService.create("finance", collection, body);
  }

  @RequirePermissions(MODULE_KEYS.accountsFinance, "edit")
  @Patch(":collection/:id")
  update(
    @Param("collection") collection: string,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.normalizedDataService.update("finance", collection, id, body);
  }

  @RequirePermissions(MODULE_KEYS.accountsFinance, "delete")
  @Delete(":collection/:id")
  remove(@Param("collection") collection: string, @Param("id") id: string) {
    return this.normalizedDataService.remove("finance", collection, id);
  }
}
