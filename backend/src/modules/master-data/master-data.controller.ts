import { Body, Controller, Get, Headers, Param, Put, UseGuards } from "@nestjs/common";
import { MODULE_KEYS } from "../auth/auth.constants";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { UpsertMasterDataDto } from "./dto/upsert-master-data.dto";
import { MasterDataService } from "./master-data.service";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("master-data")
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @RequirePermissions(MODULE_KEYS.setup, "view")
  @Get()
  findAll() {
    return this.masterDataService.findAll();
  }

  @RequirePermissions(MODULE_KEYS.setup, "view")
  @Get(":key")
  findOne(@Param("key") key: string) {
    return this.masterDataService.findOne(key);
  }

  @RequirePermissions(MODULE_KEYS.setup, "edit")
  @Put(":key")
  upsert(
    @Param("key") key: string,
    @Body() upsertMasterDataDto: UpsertMasterDataDto,
    @Headers("x-venueops-client-id") clientId?: string,
  ) {
    return this.masterDataService.upsert(key, upsertMasterDataDto.value, clientId);
  }
}
