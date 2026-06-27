import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { RealtimeService } from "../realtime/realtime.service";

type FrontendServiceBookingPayload = {
  id: string;
  serviceType: string;
  status: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  customerName: string;
  contactNumber: string;
  guestCount: number;
  notes?: string;
  createdAt?: string | Date;
  totalAmount?: number;
  paidAmount?: number;
  balanceDue?: number;
  [key: string]: unknown;
};

@Injectable()
export class ServiceBookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async findAllForFrontend() {
    const bookings = await this.prisma.serviceBooking.findMany({
      orderBy: {
        eventDate: "asc",
      },
    });

    return bookings.map((booking) => this.mapFrontendBooking(booking));
  }

  async findOneForFrontend(externalId: string) {
    const booking = await this.prisma.serviceBooking.findUnique({
      where: {
        externalId,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Service booking ${externalId} was not found`);
    }

    return this.mapFrontendBooking(booking);
  }

  async createFrontendBooking(booking: FrontendServiceBookingPayload, originClientId?: string) {
    await this.prisma.$transaction(async (tx) => {
      await this.upsertFrontendBooking(tx, booking);
    });

    this.realtimeService.notifyResourceChanged("service-bookings", "upsert", {
      recordId: booking.id,
      originClientId,
    });

    return this.findOneForFrontend(booking.id);
  }

  async updateFrontendBooking(
    externalId: string,
    booking: FrontendServiceBookingPayload,
    originClientId?: string,
  ) {
    await this.ensureFrontendBookingExists(externalId);

    await this.prisma.$transaction(async (tx) => {
      await this.upsertFrontendBooking(tx, {
        ...booking,
        id: externalId,
      });
    });

    this.realtimeService.notifyResourceChanged("service-bookings", "upsert", {
      recordId: externalId,
      originClientId,
    });

    return this.findOneForFrontend(externalId);
  }

  async removeFrontendBooking(externalId: string, originClientId?: string) {
    const deleted = await this.prisma.serviceBooking.deleteMany({
      where: {
        externalId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(`Service booking ${externalId} was not found`);
    }

    this.realtimeService.notifyResourceChanged("service-bookings", "delete", {
      recordId: externalId,
      originClientId,
    });

    return {
      deleted: true,
      id: externalId,
    };
  }

  async syncFrontendBookings(bookings: FrontendServiceBookingPayload[], originClientId?: string) {
    const incomingExternalIds = bookings.map((booking) => booking.id);

    await this.prisma.$transaction(async (tx) => {
      for (const booking of bookings) {
        await this.upsertFrontendBooking(tx, booking);
      }

      await tx.serviceBooking.deleteMany({
        where: {
          externalId: {
            notIn: incomingExternalIds,
          },
        },
      });
    });

    this.realtimeService.notifyResourceChanged("service-bookings", "bulk-sync", {
      originClientId,
    });

    return this.findAllForFrontend();
  }

  private async upsertFrontendBooking(tx: Prisma.TransactionClient, booking: FrontendServiceBookingPayload) {
    const totalAmount = this.toNullableNumber(booking.totalAmount);
    const paidAmount = this.toNullableNumber(booking.paidAmount);
    const balanceAmount = this.toNullableNumber(
      booking.balanceDue ?? (totalAmount ?? 0) - (paidAmount ?? 0),
    );
    const sourcePayload = booking as Prisma.InputJsonValue;

    await tx.serviceBooking.upsert({
      where: {
        externalId: booking.id,
      },
      update: {
        serviceType: this.normalizeServiceType(booking.serviceType),
        status: this.normalizeServiceStatus(booking.status),
        eventDate: this.normalizeDate(booking.date),
        startTime: booking.startTime,
        endTime: booking.endTime,
        customerName: booking.customerName,
        contactNumber: booking.contactNumber,
        guestCount: typeof booking.guestCount === "number" ? booking.guestCount : 0,
        notes: booking.notes,
        totalAmount,
        paidAmount,
        balanceAmount,
        sourcePayload,
        createdAt: booking.createdAt ? this.normalizeDate(booking.createdAt) : undefined,
      },
      create: {
        externalId: booking.id,
        serviceType: this.normalizeServiceType(booking.serviceType),
        status: this.normalizeServiceStatus(booking.status),
        eventDate: this.normalizeDate(booking.date),
        startTime: booking.startTime,
        endTime: booking.endTime,
        customerName: booking.customerName,
        contactNumber: booking.contactNumber,
        guestCount: typeof booking.guestCount === "number" ? booking.guestCount : 0,
        notes: booking.notes,
        totalAmount,
        paidAmount,
        balanceAmount,
        sourcePayload,
        createdAt: booking.createdAt ? this.normalizeDate(booking.createdAt) : undefined,
      },
    });
  }

  private normalizeDate(value: string | Date) {
    return value instanceof Date ? value : new Date(value);
  }

  private normalizeServiceType(serviceType: string) {
    const normalized = serviceType.toUpperCase().replace(/-/g, "_");
    switch (normalized) {
      case "VENUE_BOOKING":
      case "OUTDOOR_CATERING":
      case "FOOD_SUPPLY":
      case "RENTAL_SERVICES":
      case "MIXED_PACKAGE":
        return normalized;
      default:
        return "OUTDOOR_CATERING";
    }
  }

  private normalizeServiceStatus(status: string) {
    const normalized = status.toUpperCase().replace(/-/g, "_");
    switch (normalized) {
      case "TENTATIVE":
      case "CONFIRMED":
      case "COMPLETED":
      case "CANCELLED":
      case "EXPIRED":
        return normalized;
      default:
        return "TENTATIVE";
    }
  }

  private toFrontendServiceType(value: string) {
    return value.toLowerCase().replace(/_/g, "-");
  }

  private parseSourcePayload(payload: unknown): Record<string, any> {
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      return payload as Record<string, any>;
    }

    return {};
  }

  private toNullableNumber(value: unknown) {
    if (typeof value === "number" && !Number.isNaN(value)) {
      return value;
    }

    return null;
  }

  private toNumber(value: { toNumber(): number } | number | null | undefined) {
    if (typeof value === "number") {
      return value;
    }

    return value ? value.toNumber() : 0;
  }

  private async ensureFrontendBookingExists(externalId: string) {
    const existing = await this.prisma.serviceBooking.findUnique({
      where: {
        externalId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Service booking ${externalId} was not found`);
    }
  }

  private mapFrontendBooking(booking: Prisma.ServiceBookingGetPayload<Record<string, never>>) {
    const sourcePayload = this.parseSourcePayload(booking.sourcePayload);

    return {
      ...sourcePayload,
      id: booking.externalId,
      serviceType: sourcePayload.serviceType ?? this.toFrontendServiceType(booking.serviceType),
      status: sourcePayload.status ?? booking.status.toLowerCase(),
      date: sourcePayload.date ?? booking.eventDate.toISOString(),
      startTime: sourcePayload.startTime ?? booking.startTime,
      endTime: sourcePayload.endTime ?? booking.endTime,
      customerName: sourcePayload.customerName ?? booking.customerName,
      contactNumber: sourcePayload.contactNumber ?? booking.contactNumber,
      guestCount: sourcePayload.guestCount ?? booking.guestCount,
      notes: sourcePayload.notes ?? booking.notes ?? undefined,
      totalAmount: sourcePayload.totalAmount ?? this.toNumber(booking.totalAmount),
      paidAmount: sourcePayload.paidAmount ?? this.toNumber(booking.paidAmount),
      balanceDue:
        sourcePayload.balanceDue ??
        this.toNumber(booking.balanceAmount) ??
        Math.max(this.toNumber(booking.totalAmount) - this.toNumber(booking.paidAmount), 0),
      createdAt: sourcePayload.createdAt ?? booking.createdAt.toISOString(),
    };
  }
}
