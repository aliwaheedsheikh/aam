import { Controller, Get, UseGuards } from "@nestjs/common";
import { MODULE_KEYS } from "../auth/auth.constants";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { ReportsService } from "./reports.service";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @RequirePermissions(MODULE_KEYS.reports, "view")
  @Get("reservations")
  getReservationSummary() {
    return this.reportsService.getReservationSummary();
  }
}
