import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AppStateService } from "./app-state.service";
import { UpsertAppStateDto } from "./dto/upsert-app-state.dto";

@UseGuards(JwtAuthGuard)
@Controller("app-state")
export class AppStateController {
  constructor(private readonly appStateService: AppStateService) {}

  @Get()
  findAll() {
    return this.appStateService.findAll();
  }

  @Get(":key")
  findOne(@Param("key") key: string) {
    return this.appStateService.findOne(this.normalizeKey(key));
  }

  @Put(":key")
  upsert(@Param("key") key: string, @Body() upsertAppStateDto: UpsertAppStateDto) {
    return this.appStateService.upsert(this.normalizeKey(key), upsertAppStateDto.value);
  }

  private normalizeKey(key: string) {
    return key.startsWith("workflow:") ? key : `workflow:${key}`;
  }
}
