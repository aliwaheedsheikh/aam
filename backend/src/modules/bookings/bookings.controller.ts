import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { MODULE_KEYS } from "../auth/auth.constants";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { UpdateBookingDto } from "./dto/update-booking.dto";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @RequirePermissions(MODULE_KEYS.reservations, "view")
  @Get()
  findAll() {
    return this.bookingsService.findAll();
  }

  @RequirePermissions(MODULE_KEYS.reservations, "view")
  @Get("frontend")
  findAllForFrontend() {
    return this.bookingsService.findAllForFrontend();
  }

  @RequirePermissions(MODULE_KEYS.reservations, "view")
  @Get("frontend/:id")
  findOneForFrontend(@Param("id") id: string) {
    return this.bookingsService.findOneForFrontend(id);
  }

  @RequirePermissions(MODULE_KEYS.reservations, "view")
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.bookingsService.findOne(id);
  }

  @RequirePermissions(MODULE_KEYS.reservations, "create")
  @Post()
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(createBookingDto);
  }

  @RequirePermissions(MODULE_KEYS.reservations, "edit")
  @Patch(":id")
  update(@Param("id") id: string, @Body() updateBookingDto: UpdateBookingDto) {
    return this.bookingsService.update(id, updateBookingDto);
  }

  @RequirePermissions(MODULE_KEYS.reservations, "edit")
  @Put("frontend-sync")
  syncFrontendBookings(@Body() body: { bookings: Array<Record<string, unknown>> }) {
    return this.bookingsService.syncFrontendBookings((body?.bookings ?? []) as never[]);
  }

  @RequirePermissions(MODULE_KEYS.reservations, "create")
  @Post("frontend")
  createFrontendBooking(@Body() booking: Record<string, unknown>) {
    return this.bookingsService.createFrontendBooking(booking as never);
  }

  @RequirePermissions(MODULE_KEYS.reservations, "edit")
  @Patch("frontend/:id")
  updateFrontendBooking(@Param("id") id: string, @Body() booking: Record<string, unknown>) {
    return this.bookingsService.updateFrontendBooking(id, booking as never);
  }

  @RequirePermissions(MODULE_KEYS.reservations, "delete")
  @Delete("frontend/:id")
  removeFrontendBooking(@Param("id") id: string) {
    return this.bookingsService.removeFrontendBooking(id);
  }
}
