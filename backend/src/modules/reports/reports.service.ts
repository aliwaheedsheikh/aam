import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

const CONFIRMED_BOOKING_STATUSES = ["CONFIRMED", "COMPLETED"] as const;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getReservationSummary() {
    const [confirmedCount, tentativeCount, totals] = await Promise.all([
      this.prisma.booking.count({
        where: {
          status: { in: [...CONFIRMED_BOOKING_STATUSES] },
        },
      }),
      this.prisma.booking.count({
        where: {
          status: "TENTATIVE",
        },
      }),
      this.prisma.booking.aggregate({
        where: {
          status: { in: [...CONFIRMED_BOOKING_STATUSES] },
        },
        _sum: {
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
        },
      }),
    ]);

    const venueBreakdown = await this.prisma.booking.groupBy({
      by: ["venueId"],
      where: {
        status: { in: [...CONFIRMED_BOOKING_STATUSES] },
      },
      _count: {
        _all: true,
      },
      _sum: {
        guestCount: true,
        totalAmount: true,
      },
      orderBy: {
        _count: {
          venueId: "desc",
        },
      },
    });

    return {
      summary: {
        confirmedBookings: confirmedCount,
        tentativeBookings: tentativeCount,
        totalRevenue: this.toNumber(totals._sum.totalAmount),
        totalCollected: this.toNumber(totals._sum.paidAmount),
        totalOutstanding: this.toNumber(totals._sum.balanceAmount),
      },
      venueBreakdown: venueBreakdown.map((venue) => ({
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
