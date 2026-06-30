import { Injectable } from "@nestjs/common";
import { BookingStatus } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";

const CONFIRMED_BOOKING_STATUSES = [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] as const;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getReservationSummary() {
    // A-5: Consolidated from 4 DB round-trips (3 in Promise.all + 1 groupBy) to
    // 2 parallel queries: one groupBy on status for totals, one groupBy on venueId.
    const [statusGroups, venueGroups] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ["status"],
        _count: { _all: true },
        _sum: { totalAmount: true, paidAmount: true, balanceAmount: true },
      }),
      this.prisma.booking.groupBy({
        by: ["venueId"],
        where: { status: { in: [...CONFIRMED_BOOKING_STATUSES] } },
        _count: { _all: true },
        _sum: { guestCount: true, totalAmount: true },
        orderBy: { _count: { venueId: "desc" } },
      }),
    ]);

    const confirmedGroups = statusGroups.filter((g) =>
      (CONFIRMED_BOOKING_STATUSES as readonly string[]).includes(g.status),
    );
    const tentativeGroup = statusGroups.find((g) => g.status === BookingStatus.TENTATIVE);

    const confirmedCount = confirmedGroups.reduce((acc, g) => acc + g._count._all, 0);
    const tentativeCount = tentativeGroup?._count._all ?? 0;

    const totalRevenue = confirmedGroups.reduce(
      (acc, g) => acc + this.toNumber(g._sum.totalAmount),
      0,
    );
    const totalCollected = confirmedGroups.reduce(
      (acc, g) => acc + this.toNumber(g._sum.paidAmount),
      0,
    );
    const totalOutstanding = confirmedGroups.reduce(
      (acc, g) => acc + this.toNumber(g._sum.balanceAmount),
      0,
    );

    return {
      summary: {
        confirmedBookings: confirmedCount,
        tentativeBookings: tentativeCount,
        totalRevenue,
        totalCollected,
        totalOutstanding,
      },
      venueBreakdown: venueGroups.map((venue) => ({
        venueId: venue.venueId,
        bookings: venue._count._all,
        guestCount: venue._sum.guestCount ?? 0,
        totalRevenue: this.toNumber(venue._sum.totalAmount),
      })),
    };
  }

  private toNumber(value: { toNumber(): number } | number | null | undefined) {
    if (typeof value === "number") {
      return value;
    }

    return value ? value.toNumber() : 0;
  }
}
