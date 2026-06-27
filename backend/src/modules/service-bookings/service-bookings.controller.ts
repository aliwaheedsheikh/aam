import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { MODULE_KEYS } from "../auth/auth.constants";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { ServiceBookingsService } from "./service-bookings.service";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("service-bookings")
export class ServiceBookingsController {
  constructor(private readonly serviceBookingsService: ServiceBookingsService) {}

  @RequirePermissions(MODULE_KEYS.reservations, "view")
  @Get("frontend")
  findAllForFrontend() {
    return this.serviceBookingsService.findAllForFrontend();
  }

  @RequirePermissions(MODULE_KEYS.reservations, "view")
  @Get("frontend/:id")
  findOneForFrontend(@Param("id") id: string) {
    return this.serviceBookingsService.findOneForFrontend(id);
  }

  @RequirePermissions(MODULE_KEYS.reservations, "edit")
  @Put("frontend-sync")
  syncFrontendBookings(
    @Body() body: { bookings: Array<Record<string, unknown>> },
    @Headers("x-venueops-client-id") clientId?: string,
  ) {
    return this.serviceBookingsService.syncFrontendBookings((body?.bookings ?? []) as never[], clientId);
  }

  @RequirePermissions(MODULE_KEYS.reservations, "create")
  @Post("frontend")
  createFrontendBooking(
    @Body() booking: Record<string, unknown>,
    @Headers("x-venueops-client-id") clientId?: string,
  ) {
    return this.serviceBookingsService.createFrontendBooking(booking as never, clientId);
  }

  @RequirePermissions(MODULE_KEYS.reservations, "edit")
  @Patch("frontend/:id")
  updateFrontendBooking(
    @Param("id") id: string,
    @Body() booking: Record<string, unknown>,
    @Headers("x-venueops-client-id") clientId?: string,
  ) {
    return this.serviceBookingsService.updateFrontendBooking(id, booking as never, clientId);
  }

  @RequirePermissions(MODULE_KEYS.reservations, "delete")
  @Delete("frontend/:id")
  removeFrontendBooking(@Param("id") id: string, @Headers("x-venueops-client-id") clientId?: string) {
    return this.serviceBookingsService.removeFrontendBooking(id, clientId);
  }
}
