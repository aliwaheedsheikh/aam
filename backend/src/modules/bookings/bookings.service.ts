import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BookingSpaceAssignmentType, BookingStatus, Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { RealtimeService } from "../realtime/realtime.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { UpdateBookingDto } from "./dto/update-booking.dto";

type FrontendBookingSpaceAssignment = {
  venueId?: string;
  primeSpaceId?: string;
  subSpaceId?: string;
  assignmentType?: "PRIME_FULL" | "SUB_ONLY";
  usageLabel?: string;
  guestCount?: number;
  sortOrder?: number;
};

type FrontendBookingPayload = {
  id: string;
  customerName?: string;
  contactNumber?: string;
  venueId: string;
  venueName?: string;
  status: string;
  eventType?: string;
  bookingSource?: string;
  notes?: string;
  guestCount?: number;
  date: string | Date;
  startTime: string;
  endTime: string;
  primeSpaceId?: string;
  primeSpaceIds?: string[];
  subSpaceId?: string;
  spaceAssignments?: FrontendBookingSpaceAssignment[];
  totalAmount?: number;
  paidAmount?: number;
  balance?: number;
  createdAt?: string | Date;
  [key: string]: unknown;
};

const getSpaceAssignmentKey = (assignment: FrontendBookingSpaceAssignment) =>
  assignment.assignmentType === "SUB_ONLY"
    ? `sub:${assignment.subSpaceId ?? ""}`
    : `prime:${assignment.primeSpaceId ?? ""}`;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  findAll() {
    return this.prisma.booking.findMany({
      include: {
        customer: true,
        venue: true,
        payments: true,
      },
      orderBy: {
        eventDate: "asc",
      },
    });
  }

  findOne(id: string) {
    return this.prisma.booking.findUnique({
      where: { id },
      include: {
        customer: true,
        venue: true,
        payments: true,
        auditLogs: true,
      },
    });
  }

  async findOneForFrontend(externalId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: {
        externalId,
      },
      include: {
        customer: true,
        venue: true,
        spaceAssignments: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${externalId} was not found`);
    }

    return this.mapFrontendBooking(booking);
  }

  async create(createBookingDto: CreateBookingDto, originClientId?: string) {
    const booking = await this.prisma.booking.create({
      data: {
        ...createBookingDto,
        eventDate: new Date(createBookingDto.eventDate),
      },
      include: {
        customer: true,
        venue: true,
        spaceAssignments: true,
      },
    });

    this.realtimeService.notifyResourceChanged("bookings", "upsert", {
      recordId: booking.id,
      originClientId,
    });

    return booking;
  }

  async update(id: string, updateBookingDto: UpdateBookingDto, originClientId?: string) {
    const { eventDate, ...rest } = updateBookingDto as UpdateBookingDto & { eventDate?: string };

    const booking = await this.prisma.booking.update({
      where: { id },
      data: {
        ...rest,
        eventDate: eventDate ? new Date(eventDate) : undefined,
      },
      include: {
        customer: true,
        venue: true,
        spaceAssignments: true,
        payments: true,
      },
    });

    this.realtimeService.notifyResourceChanged("bookings", "upsert", {
      recordId: id,
      originClientId,
    });

    return booking;
  }

  async findAllForFrontend() {
    const bookings = await this.prisma.booking.findMany({
      where: {
        externalId: {
          not: null,
        },
      },
      include: {
        customer: true,
        venue: true,
        spaceAssignments: true,
      },
      orderBy: {
        eventDate: "asc",
      },
    });

    return bookings.map((booking) => this.mapFrontendBooking(booking));
  }

  async createFrontendBooking(booking: FrontendBookingPayload, originClientId?: string) {
    await this.prisma.$transaction(async (tx) => {
      await this.upsertFrontendBooking(tx, booking);
    });

    this.realtimeService.notifyResourceChanged("bookings", "upsert", {
      recordId: booking.id,
      originClientId,
    });

    return this.findOneForFrontend(booking.id);
  }

  async updateFrontendBooking(externalId: string, booking: FrontendBookingPayload, originClientId?: string) {
    await this.ensureFrontendBookingExists(externalId);

    await this.prisma.$transaction(async (tx) => {
      await this.upsertFrontendBooking(tx, {
        ...booking,
        id: externalId,
      });
    });

    this.realtimeService.notifyResourceChanged("bookings", "upsert", {
      recordId: externalId,
      originClientId,
    });

    return this.findOneForFrontend(externalId);
  }

  async removeFrontendBooking(externalId: string, originClientId?: string) {
    const deleted = await this.prisma.booking.deleteMany({
      where: {
        externalId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(`Booking ${externalId} was not found`);
    }

    this.realtimeService.notifyResourceChanged("bookings", "delete", {
      recordId: externalId,
      originClientId,
    });

    return {
      deleted: true,
      id: externalId,
    };
  }

  async syncFrontendBookings(bookings: FrontendBookingPayload[], originClientId?: string) {
    const incomingExternalIds = bookings.map((booking) => booking.id);

    // A-2: Process in chunks of 50 to avoid a single mega-transaction that locks tables
    // for seconds (N+1 upserts × 4 DB round-trips each = hundreds of sequential queries).
    const CHUNK_SIZE = 50;
    for (let i = 0; i < bookings.length; i += CHUNK_SIZE) {
      const chunk = bookings.slice(i, i + CHUNK_SIZE);
      await this.prisma.$transaction(
        async (tx) => {
          for (const booking of chunk) {
            await this.upsertFrontendBooking(tx, booking);
          }
        },
        { timeout: 30_000 },
      );
    }

    // Delete orphaned bookings once — outside any per-chunk transaction.
    await this.prisma.booking.deleteMany({
      where: {
        externalId: {
          not: null,
          notIn: incomingExternalIds,
        },
      },
    });

    this.realtimeService.notifyResourceChanged("bookings", "bulk-sync", {
      originClientId,
    });

    return this.findAllForFrontend();
  }

  private async upsertFrontendBooking(tx: Prisma.TransactionClient, booking: FrontendBookingPayload) {
    const normalizedBooking = this.buildNormalizedBookingPayload(booking);

    const venue = await tx.venue.upsert({
      where: {
        code: normalizedBooking.venueId,
      },
      update: {
        name: normalizedBooking.venueName ?? this.humanizeCode(normalizedBooking.venueId),
      },
      create: {
        code: normalizedBooking.venueId,
        name: normalizedBooking.venueName ?? this.humanizeCode(normalizedBooking.venueId),
      },
    });

    this.assertValidSpaceAssignments(normalizedBooking.spaceAssignments ?? []);
    await this.assertNoConfirmedReservationConflict(tx, normalizedBooking, venue.id);

    const customerPhone = this.normalizeCustomerPhone(normalizedBooking);
    const customer = await tx.customer.upsert({
      where: {
        phone: customerPhone,
      },
      update: {
        fullName: normalizedBooking.customerName ?? "Walk-in Customer",
      },
      create: {
        fullName: normalizedBooking.customerName ?? "Walk-in Customer",
        phone: customerPhone,
      },
    });

    const totalAmount = this.toNullableNumber(normalizedBooking.totalAmount);
    const paidAmount = this.toNullableNumber(normalizedBooking.paidAmount);
    const balanceAmount = this.toNullableNumber(
      normalizedBooking.balance ?? (totalAmount ?? 0) - (paidAmount ?? 0),
    );

    const bookingNumber = this.toBookingNumber(normalizedBooking.id);
    const sourcePayload = normalizedBooking as Prisma.InputJsonValue;
    const assignmentRows = (normalizedBooking.spaceAssignments ?? []).map((assignment, index) => ({
      venueId: assignment.venueId ?? normalizedBooking.venueId,
      primeSpaceId: assignment.primeSpaceId ?? "",
      subSpaceId: assignment.subSpaceId,
      assignmentType:
        assignment.assignmentType === "SUB_ONLY"
          ? BookingSpaceAssignmentType.SUB_ONLY
          : BookingSpaceAssignmentType.PRIME_FULL,
      usageLabel: assignment.usageLabel,
      sortOrder: assignment.sortOrder ?? index,
    }));

    await tx.booking.upsert({
      where: {
        externalId: normalizedBooking.id,
      },
      update: {
        bookingNumber,
        customerId: customer.id,
        venueId: venue.id,
        status: this.normalizeBookingStatus(normalizedBooking.status),
        paymentStatus: this.normalizePaymentStatus(totalAmount, paidAmount, balanceAmount),
        eventType: normalizedBooking.eventType,
        bookingSource: normalizedBooking.bookingSource,
        notes: normalizedBooking.notes,
        guestCount: typeof normalizedBooking.guestCount === "number" ? normalizedBooking.guestCount : 0,
        eventDate: this.normalizeDate(normalizedBooking.date),
        startTime: normalizedBooking.startTime,
        endTime: normalizedBooking.endTime,
        totalAmount,
        paidAmount,
        balanceAmount,
        sourcePayload,
        createdAt: normalizedBooking.createdAt ? this.normalizeDate(normalizedBooking.createdAt) : undefined,
        spaceAssignments: {
          deleteMany: {},
          create: assignmentRows,
        },
      },
      create: {
        externalId: normalizedBooking.id,
        bookingNumber,
        customerId: customer.id,
        venueId: venue.id,
        status: this.normalizeBookingStatus(normalizedBooking.status),
        paymentStatus: this.normalizePaymentStatus(totalAmount, paidAmount, balanceAmount),
        eventType: normalizedBooking.eventType,
        bookingSource: normalizedBooking.bookingSource,
        notes: normalizedBooking.notes,
        guestCount: typeof normalizedBooking.guestCount === "number" ? normalizedBooking.guestCount : 0,
        eventDate: this.normalizeDate(normalizedBooking.date),
        startTime: normalizedBooking.startTime,
        endTime: normalizedBooking.endTime,
        totalAmount,
        paidAmount,
        balanceAmount,
        sourcePayload,
        createdAt: normalizedBooking.createdAt ? this.normalizeDate(normalizedBooking.createdAt) : undefined,
        spaceAssignments: {
          create: assignmentRows,
        },
      },
    });
  }

  private normalizeDate(value: string | Date) {
    return value instanceof Date ? value : new Date(value);
  }

  private async assertNoConfirmedReservationConflict(
    tx: Prisma.TransactionClient,
    booking: FrontendBookingPayload,
    venueRecordId: string,
  ) {
    if (!this.bookingStatusBlocksAvailability(this.normalizeBookingStatus(booking.status))) {
      return;
    }

    const requestedAssignments = this.normalizeSpaceAssignments(booking);
    if (requestedAssignments.length === 0 || !booking.startTime || !booking.endTime) {
      return;
    }

    const eventDate = this.normalizeDate(booking.date);
    const dayStart = new Date(
      Date.UTC(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate()),
    );
    const nextDayStart = new Date(dayStart);
    nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);

    const existingBookings = await tx.booking.findMany({
      where: {
        venueId: venueRecordId,
        status: {
          in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
        },
        eventDate: {
          gte: dayStart,
          lt: nextDayStart,
        },
        externalId: {
          not: booking.id,
        },
      },
      select: {
        externalId: true,
        startTime: true,
        endTime: true,
        sourcePayload: true,
        spaceAssignments: true,
      },
    });

    const conflictingBooking = existingBookings.find((existingBooking) => {
      if (!this.timeRangesOverlap(booking.startTime, booking.endTime, existingBooking.startTime, existingBooking.endTime)) {
        return false;
      }

      const existingPayload = this.parseSourcePayload(existingBooking.sourcePayload);
      return this.bookingConflictsOnSpace(booking, existingPayload, existingBooking.spaceAssignments);
    });

    if (conflictingBooking) {
      throw new BadRequestException("This space is already booked for this time.");
    }
  }

  private bookingConflictsOnSpace(
    booking: Pick<FrontendBookingPayload, "primeSpaceId" | "primeSpaceIds" | "subSpaceId" | "spaceAssignments" | "venueId">,
    existingBooking: Record<string, any>,
    existingAssignments?: Array<{
      venueId: string;
      primeSpaceId: string;
      subSpaceId: string | null;
      assignmentType: BookingSpaceAssignmentType;
      usageLabel: string | null;
      sortOrder: number;
    }>,
  ) {
    const requestedAssignments = this.normalizeSpaceAssignments(booking);
    const persistedAssignments: FrontendBookingSpaceAssignment[] =
      existingAssignments && existingAssignments.length > 0
        ? existingAssignments.map((assignment) => ({
            venueId: assignment.venueId,
            primeSpaceId: assignment.primeSpaceId,
            subSpaceId: assignment.subSpaceId ?? undefined,
            assignmentType:
              assignment.assignmentType === BookingSpaceAssignmentType.SUB_ONLY ? "SUB_ONLY" : "PRIME_FULL",
            usageLabel: assignment.usageLabel ?? undefined,
            sortOrder: assignment.sortOrder,
          }))
        : this.normalizeSpaceAssignments(existingBooking as FrontendBookingPayload);

    for (const requestedAssignment of requestedAssignments) {
      for (const persistedAssignment of persistedAssignments) {
        if (this.spaceAssignmentsConflict(requestedAssignment, persistedAssignment)) {
          return true;
        }
      }
    }

    return false;
  }

  private bookingUsesPrimeSpace(
    booking: Pick<FrontendBookingPayload, "primeSpaceId" | "primeSpaceIds"> | Record<string, any>,
    primeSpaceId: string,
  ) {
    const primeSpaceIds = Array.isArray(booking.primeSpaceIds) ? booking.primeSpaceIds : [];
    return booking.primeSpaceId === primeSpaceId || primeSpaceIds.includes(primeSpaceId);
  }

  private resolvePrimeSpaceId(booking: Pick<FrontendBookingPayload, "primeSpaceId" | "primeSpaceIds"> | Record<string, any>) {
    const primeSpaceIds = Array.isArray(booking.primeSpaceIds) ? booking.primeSpaceIds : [];
    return primeSpaceIds[0] ?? booking.primeSpaceId;
  }

  private normalizeSpaceAssignments(
    booking: Pick<FrontendBookingPayload, "venueId" | "primeSpaceId" | "primeSpaceIds" | "subSpaceId" | "spaceAssignments"> | Record<string, any>,
  ): FrontendBookingSpaceAssignment[] {
    const fallbackVenueId = typeof booking.venueId === "string" ? booking.venueId : undefined;
    const rawAssignments = Array.isArray(booking.spaceAssignments) ? booking.spaceAssignments : [];
    const assignments = rawAssignments.length > 0
      ? rawAssignments
      : this.buildLegacyAssignments(booking);
    const deduped = new Map<string, FrontendBookingSpaceAssignment>();

    assignments.forEach((assignment, index) => {
      const primeSpaceId =
        typeof assignment?.primeSpaceId === "string" && assignment.primeSpaceId.trim()
          ? assignment.primeSpaceId.trim()
          : undefined;
      const subSpaceId =
        typeof assignment?.subSpaceId === "string" && assignment.subSpaceId.trim()
          ? assignment.subSpaceId.trim()
          : undefined;
      const assignmentType =
        (assignment?.assignmentType ?? (subSpaceId ? "SUB_ONLY" : "PRIME_FULL")) === "SUB_ONLY"
          ? "SUB_ONLY"
          : "PRIME_FULL";

      if (!primeSpaceId) {
        return;
      }

      const key = assignmentType === "SUB_ONLY" ? `sub:${subSpaceId}` : `prime:${primeSpaceId}`;
      deduped.set(key, {
        venueId:
          typeof assignment?.venueId === "string" && assignment.venueId.trim()
            ? assignment.venueId.trim()
            : fallbackVenueId,
        primeSpaceId,
        subSpaceId,
        assignmentType,
        usageLabel:
          typeof assignment?.usageLabel === "string" && assignment.usageLabel.trim()
            ? assignment.usageLabel.trim()
            : undefined,
        guestCount:
          typeof assignment?.guestCount === "number" && Number.isFinite(assignment.guestCount)
            ? assignment.guestCount
            : undefined,
        sortOrder: typeof assignment?.sortOrder === "number" ? assignment.sortOrder : index,
      });
    });

    return Array.from(deduped.values()).sort(
      (left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0),
    );
  }

  private buildLegacyAssignments(
    booking: Pick<FrontendBookingPayload, "venueId" | "primeSpaceId" | "primeSpaceIds" | "subSpaceId"> | Record<string, any>,
  ): FrontendBookingSpaceAssignment[] {
    if (typeof booking.subSpaceId === "string" && booking.subSpaceId.trim()) {
      const primeSpaceId = this.resolvePrimeSpaceId(booking);
      return primeSpaceId
        ? [
            {
              venueId: booking.venueId,
              primeSpaceId,
              subSpaceId: booking.subSpaceId.trim(),
              assignmentType: "SUB_ONLY",
              sortOrder: 0,
            },
          ]
        : [];
    }

    const primeSpaceIds = Array.isArray(booking.primeSpaceIds)
      ? booking.primeSpaceIds
      : booking.primeSpaceId
        ? [booking.primeSpaceId]
        : [];

    return Array.from(new Set(primeSpaceIds.filter(Boolean))).map((primeSpaceId, index) => ({
      venueId: booking.venueId,
      primeSpaceId,
      assignmentType: "PRIME_FULL",
      sortOrder: index,
    }));
  }

  private buildNormalizedBookingPayload(booking: FrontendBookingPayload): FrontendBookingPayload {
    const spaceAssignments = this.normalizeSpaceAssignments(booking);
    const uniquePrimeSpaceIds = Array.from(
      new Set(
        spaceAssignments
          .map((assignment) => assignment.primeSpaceId)
          .filter((primeSpaceId): primeSpaceId is string => Boolean(primeSpaceId)),
      ),
    );
    const primaryAssignment = spaceAssignments[0];
    const primaryPrimeAssignment =
      spaceAssignments.find((assignment) => assignment.assignmentType === "PRIME_FULL") ?? primaryAssignment;
    const subOnlyAssignment =
      spaceAssignments.length === 1 && primaryAssignment?.assignmentType === "SUB_ONLY"
        ? primaryAssignment
        : undefined;

    return {
      ...booking,
      venueId: booking.venueId,
      primeSpaceId: primaryPrimeAssignment?.primeSpaceId ?? booking.primeSpaceId,
      primeSpaceIds: uniquePrimeSpaceIds.length > 0 ? uniquePrimeSpaceIds : booking.primeSpaceIds,
      subSpaceId: subOnlyAssignment?.subSpaceId,
      spaceAssignments,
    };
  }

  private assertValidSpaceAssignments(spaceAssignments: FrontendBookingSpaceAssignment[]) {
    if (spaceAssignments.length === 0) {
      throw new BadRequestException("Please select at least one reserved space.");
    }

    const fullPrimeSpaceIds = new Set<string>();
    const subAssignments = new Set<string>();

    for (const assignment of spaceAssignments) {
      if (!assignment.primeSpaceId) {
        throw new BadRequestException("Each reserved space must include a prime space.");
      }

      if (assignment.assignmentType === "SUB_ONLY") {
        if (!assignment.subSpaceId) {
          throw new BadRequestException("Sub-space assignments must include a sub-space id.");
        }

        if (fullPrimeSpaceIds.has(assignment.primeSpaceId)) {
          throw new BadRequestException("A full prime space and one of its sub spaces cannot be reserved in the same booking.");
        }

        const subKey = `${assignment.primeSpaceId}:${assignment.subSpaceId}`;
        if (subAssignments.has(subKey)) {
          throw new BadRequestException("Duplicate sub-space assignments are not allowed.");
        }

        subAssignments.add(subKey);
        continue;
      }

      if (fullPrimeSpaceIds.has(assignment.primeSpaceId)) {
        throw new BadRequestException("Duplicate prime space assignments are not allowed.");
      }

      const conflictingSub = Array.from(subAssignments).some((subKey) =>
        subKey.startsWith(`${assignment.primeSpaceId}:`),
      );
      if (conflictingSub) {
        throw new BadRequestException("A full prime space and one of its sub spaces cannot be reserved in the same booking.");
      }

      fullPrimeSpaceIds.add(assignment.primeSpaceId);
    }
  }

  private spaceAssignmentsConflict(
    requestedAssignment: FrontendBookingSpaceAssignment,
    existingAssignment: FrontendBookingSpaceAssignment,
  ) {
    if (requestedAssignment.assignmentType === "PRIME_FULL") {
      if (existingAssignment.assignmentType === "PRIME_FULL") {
        return requestedAssignment.primeSpaceId === existingAssignment.primeSpaceId;
      }

      return requestedAssignment.primeSpaceId === existingAssignment.primeSpaceId;
    }

    if (existingAssignment.assignmentType === "PRIME_FULL") {
      return requestedAssignment.primeSpaceId === existingAssignment.primeSpaceId;
    }

    return Boolean(
      requestedAssignment.subSpaceId &&
        existingAssignment.subSpaceId &&
        requestedAssignment.subSpaceId === existingAssignment.subSpaceId,
    );
  }

  private bookingStatusBlocksAvailability(status: BookingStatus) {
    return status === BookingStatus.CONFIRMED || status === BookingStatus.COMPLETED;
  }

  private timeRangesOverlap(start1: string, end1: string, start2: string, end2: string) {
    const [normalizedStart1, normalizedEnd1] = this.normalizeTimeRange(start1, end1);
    const [normalizedStart2, normalizedEnd2] = this.normalizeTimeRange(start2, end2);

    return normalizedStart1 < normalizedEnd2 && normalizedStart2 < normalizedEnd1;
  }

  private normalizeTimeRange(start: string, end: string) {
    const startMinutes = this.timeToMinutes(start);
    let endMinutes = this.timeToMinutes(end);

    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }

    return [startMinutes, endMinutes] as const;
  }

  private timeToMinutes(value: string) {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  }

  private normalizeCustomerPhone(booking: FrontendBookingPayload) {
    const rawPhone = booking.contactNumber?.trim();
    if (rawPhone) {
      return rawPhone;
    }

    return `missing-${booking.id}`;
  }

  private toBookingNumber(externalId: string) {
    return externalId.length <= 50 ? externalId : `VO-${externalId.slice(0, 46)}`;
  }

  private humanizeCode(value: string) {
    return value
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  private normalizeBookingStatus(status: string): BookingStatus {
    const normalized = status.toUpperCase().replace(/-/g, "_");
    // A-3: Validate against the Prisma enum — reject unknown values instead of
    // silently defaulting to "TENTATIVE" which could mask data corruption.
    if (Object.values(BookingStatus).includes(normalized as BookingStatus)) {
      return normalized as BookingStatus;
    }
    throw new BadRequestException(`Unknown booking status: "${status}"`);
  }

  private normalizePaymentStatus(totalAmount: number | null, paidAmount: number | null, balanceAmount: number | null) {
    const total = totalAmount ?? 0;
    const paid = paidAmount ?? 0;
    const balance = balanceAmount ?? Math.max(total - paid, 0);

    if (total === 0 && paid === 0) {
      return "PENDING";
    }

    if (balance <= 0 && total > 0) {
      return "PAID";
    }

    if (paid > 0 && balance > 0) {
      return "PARTIAL";
    }

    return "PENDING";
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
    const existing = await this.prisma.booking.findUnique({
      where: {
        externalId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Booking ${externalId} was not found`);
    }
  }

  private mapFrontendBooking(
    booking: Prisma.BookingGetPayload<{
      include: {
        customer: true;
        venue: true;
        spaceAssignments: true;
      };
    }>,
  ) {
    const sourcePayload = this.parseSourcePayload(booking.sourcePayload);
    const sourceAssignments = this.normalizeSpaceAssignments(sourcePayload as FrontendBookingPayload);
    const sourceAssignmentMap = new Map(
      sourceAssignments.map((assignment) => [getSpaceAssignmentKey(assignment), assignment] as const),
    );
    const persistedAssignments: FrontendBookingSpaceAssignment[] = booking.spaceAssignments.map((assignment) => ({
      venueId: assignment.venueId,
      primeSpaceId: assignment.primeSpaceId,
      subSpaceId: assignment.subSpaceId ?? undefined,
      assignmentType:
        assignment.assignmentType === BookingSpaceAssignmentType.SUB_ONLY ? "SUB_ONLY" : "PRIME_FULL",
      usageLabel: assignment.usageLabel ?? undefined,
      guestCount:
        sourceAssignmentMap.get(
          getSpaceAssignmentKey({
            primeSpaceId: assignment.primeSpaceId,
            subSpaceId: assignment.subSpaceId ?? undefined,
            assignmentType:
              assignment.assignmentType === BookingSpaceAssignmentType.SUB_ONLY ? "SUB_ONLY" : "PRIME_FULL",
          }),
        )?.guestCount,
      sortOrder: assignment.sortOrder,
    }));
    const normalizedPayload = this.buildNormalizedBookingPayload({
      ...(sourcePayload as FrontendBookingPayload),
      id: (sourcePayload as FrontendBookingPayload)?.id ?? booking.externalId ?? booking.id,
      venueId: (sourcePayload as FrontendBookingPayload)?.venueId ?? booking.venue.code,
      primeSpaceId: (sourcePayload as FrontendBookingPayload)?.primeSpaceId,
      primeSpaceIds: (sourcePayload as FrontendBookingPayload)?.primeSpaceIds,
      subSpaceId: (sourcePayload as FrontendBookingPayload)?.subSpaceId,
      spaceAssignments:
        persistedAssignments.length > 0
          ? persistedAssignments
          : sourceAssignments,
    });

    return {
      ...sourcePayload,
      ...normalizedPayload,
      id: booking.externalId ?? booking.id,
      customerName: sourcePayload.customerName ?? booking.customer.fullName,
      contactNumber: sourcePayload.contactNumber ?? booking.customer.phone,
      venueId: sourcePayload.venueId ?? booking.venue.code,
      venueName: sourcePayload.venueName ?? booking.venue.name,
      status: sourcePayload.status ?? booking.status.toLowerCase(),
      eventType: sourcePayload.eventType ?? booking.eventType ?? undefined,
      bookingSource: sourcePayload.bookingSource ?? booking.bookingSource ?? undefined,
      notes: sourcePayload.notes ?? booking.notes ?? undefined,
      guestCount: sourcePayload.guestCount ?? booking.guestCount,
      date: sourcePayload.date ?? booking.eventDate.toISOString(),
      startTime: sourcePayload.startTime ?? booking.startTime,
      endTime: sourcePayload.endTime ?? booking.endTime,
      totalAmount: sourcePayload.totalAmount ?? this.toNumber(booking.totalAmount),
      paidAmount: sourcePayload.paidAmount ?? this.toNumber(booking.paidAmount),
      balance:
        sourcePayload.balance ??
        this.toNumber(booking.balanceAmount) ??
        Math.max(this.toNumber(booking.totalAmount) - this.toNumber(booking.paidAmount), 0),
      createdAt: sourcePayload.createdAt ?? booking.createdAt.toISOString(),
    };
  }
}
