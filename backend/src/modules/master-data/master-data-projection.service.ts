import { Injectable, OnModuleInit } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";

type ProjectionTransaction = Prisma.TransactionClient | PrismaClient;

const MASTER_DATA_KEYS = {
  venues: "venueops_master_venues",
  primeSpaces: "venueops_master_prime_spaces",
  subSpaces: "venueops_master_sub_spaces",
  layouts: "venueops_master_layouts",
  eventTypes: "venueops_master_event_types",
  timeSlots: "venueops_master_time_slots",
  services: "venueops_master_services",
  packages: "venueops_master_packages",
  rcsCategories: "venueops_master_rcs_categories",
  rcsServices: "venueops_master_rcs_services",
  rcsVendors: "venueops_master_rcs_vendors",
  rcsVendorRates: "venueops_master_rcs_vendor_rates",
  rcsPackages: "venueops_master_rcs_packages",
  rcsCommissionRules: "venueops_master_rcs_commission_rules",
  rcsApprovalSettings: "venueops_master_rcs_approval_settings",
  advanceRules: "venueops_master_advance_rules",
  taxGroups: "venueops_master_tax_groups",
  discounts: "venueops_master_discounts",
} as const;

@Injectable()
export class MasterDataProjectionService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const records = await this.prisma.masterDataRecord.findMany({
      where: {
        key: {
          in: Object.values(MASTER_DATA_KEYS),
        },
      },
      orderBy: {
        key: "asc",
      },
    });

    for (const record of records) {
      await this.prisma.$transaction(async (tx) => {
        await this.project(tx, record.key, record.value);
      });
    }
  }

  async project(tx: ProjectionTransaction, key: string, value: unknown) {
    switch (key) {
      case MASTER_DATA_KEYS.venues:
        await this.projectExternalIdCollection(tx, value, "reservationVenueSetup", (entry) => ({
          venueName: this.toString(entry.venueName ?? entry.name) ?? "Unnamed Venue",
          location: this.toString(entry.location),
          address: this.toString(entry.address),
          city: this.toString(entry.city),
          phone: this.toString(entry.phone),
          email: this.toString(entry.email),
          capacity: this.toNullableInteger(entry.capacity),
          isActive: this.toBoolean(entry.isActive, true),
          operatingHours: this.toJsonValue(entry.operatingHours),
          sourceCreatedAt: this.toNullableDate(entry.createdAt),
          sourcePayload: entry as Prisma.InputJsonValue,
        }));
        return;
      case MASTER_DATA_KEYS.primeSpaces:
        await this.projectExternalIdCollection(tx, value, "reservationPrimeSpaceSetup", (entry) => ({
          venueExternalId: this.toString(entry.venueId),
          spaceName: this.toString(entry.spaceName ?? entry.name) ?? "Unnamed Prime Space",
          spaceType: this.toString(entry.spaceType),
          capacity: this.toNullableInteger(entry.capacity),
          area: this.toNullableNumber(entry.area),
          isActive: this.toBoolean(entry.isActive, true),
          defaultAdvanceRuleId: this.toString(entry.defaultAdvanceRuleId),
          sourceCreatedAt: this.toNullableDate(entry.createdAt),
          sourcePayload: entry as Prisma.InputJsonValue,
        }));
        return;
      case MASTER_DATA_KEYS.subSpaces:
        await this.projectExternalIdCollection(tx, value, "reservationSubSpaceSetup", (entry) => ({
          primeSpaceExternalId: this.toString(entry.primeSpaceId),
          venueExternalId: this.toString(entry.venueId),
          spaceName: this.toString(entry.spaceName ?? entry.name) ?? "Unnamed Sub Space",
          capacity: this.toNullableInteger(entry.capacity),
          area: this.toNullableNumber(entry.area),
          isActive: this.toBoolean(entry.isActive, true),
          canOperateIndependently: this.toBoolean(entry.canOperateIndependently),
          sourceCreatedAt: this.toNullableDate(entry.createdAt),
          sourcePayload: entry as Prisma.InputJsonValue,
        }));
        return;
      case MASTER_DATA_KEYS.layouts:
        await this.projectExternalIdCollection(tx, value, "reservationLayoutSetup", (entry) => ({
          venueExternalId: this.toString(entry.venueId),
          primeSpaceExternalId: this.toString(entry.primeSpaceId),
          subSpaceExternalId: this.toString(entry.subSpaceId),
          layoutName: this.toString(entry.layoutName ?? entry.name) ?? "Unnamed Layout",
          layoutType: this.toString(entry.layoutType),
          capacity: this.toNullableInteger(entry.capacity),
          description: this.toString(entry.description),
          isActive: this.toBoolean(entry.isActive, true),
          sourceCreatedAt: this.toNullableDate(entry.createdAt),
          sourcePayload: entry as Prisma.InputJsonValue,
        }));
        return;
      case MASTER_DATA_KEYS.eventTypes:
        await this.projectExternalIdCollection(tx, value, "eventTypeSetup", (entry) => ({
          name: this.toString(entry.name) ?? "event",
          displayName: this.toString(entry.displayName ?? entry.name) ?? "Event",
          category: this.toString(entry.category) ?? "other",
          requiresCouple: this.toBoolean(entry.requiresCouple),
          defaultDuration: this.toNullableNumber(entry.defaultDuration),
          color: this.toString(entry.color),
          isActive: this.toBoolean(entry.isActive, true),
          sourcePayload: entry as Prisma.InputJsonValue,
        }));
        return;
      case MASTER_DATA_KEYS.timeSlots:
        await this.projectExternalIdCollection(tx, value, "timeSlotSetup", (entry) => ({
          name: this.toString(entry.name) ?? "Time Slot",
          startTime: this.toString(entry.startTime) ?? "00:00",
          endTime: this.toString(entry.endTime) ?? "00:00",
          slotType: this.toString(entry.slotType) ?? "general",
          isActive: this.toBoolean(entry.isActive, true),
          sourcePayload: entry as Prisma.InputJsonValue,
        }));
        return;
      case MASTER_DATA_KEYS.services:
        await this.projectExternalIdCollection(tx, value, "reservationServiceSetup", (entry) => ({
          name: this.toString(entry.name) ?? "Service",
          category: this.toString(entry.category) ?? "other",
          basePrice: this.toNumber(entry.basePrice),
          isActive: this.toBoolean(entry.isActive, true),
          sourcePayload: entry as Prisma.InputJsonValue,
        }));
        return;
      case MASTER_DATA_KEYS.packages:
        await this.projectExternalIdCollection(tx, value, "reservationMenuPackageSetup", (entry) => ({
          name: this.toString(entry.name) ?? "Package",
          pricePerPerson: this.toNumber(entry.pricePerPerson),
          description: this.toString(entry.description),
          isActive: this.toBoolean(entry.isActive, true),
          sourcePayload: entry as Prisma.InputJsonValue,
        }));
        return;
      case MASTER_DATA_KEYS.rcsCategories:
        await this.projectNamedSetup(tx, value, "rcsCategorySetup");
        return;
      case MASTER_DATA_KEYS.rcsServices:
        await this.projectExternalIdCollection(tx, value, "rcsServiceSetup", (entry) => ({
          name: this.toString(entry.name ?? entry.serviceName) ?? "RCS Service",
          categoryId: this.toString(entry.categoryId),
          categoryName: this.toString(entry.categoryName),
          basePrice: this.toNullableNumber(entry.basePrice ?? entry.rate),
          status: this.toString(entry.status),
          isActive: this.toBoolean(entry.isActive, true),
          sourcePayload: entry as Prisma.InputJsonValue,
        }));
        return;
      case MASTER_DATA_KEYS.rcsVendors:
        await this.projectExternalIdCollection(tx, value, "rcsVendorSetup", (entry) => ({
          name: this.toString(entry.name ?? entry.vendorName) ?? "RCS Vendor",
          phone: this.toString(entry.phone),
          categoryId: this.toString(entry.categoryId),
          categoryName: this.toString(entry.categoryName),
          status: this.toString(entry.status),
          isActive: this.toBoolean(entry.isActive, true),
          sourcePayload: entry as Prisma.InputJsonValue,
        }));
        return;
      case MASTER_DATA_KEYS.rcsVendorRates:
        await this.projectExternalIdCollection(tx, value, "rcsVendorRateSetup", (entry) => ({
          vendorExternalId: this.toString(entry.vendorId ?? entry.vendorExternalId),
          serviceExternalId: this.toString(entry.serviceId ?? entry.serviceExternalId),
          rate: this.toNumber(entry.rate),
          unit: this.toString(entry.unit),
          isActive: this.toBoolean(entry.isActive, true),
          sourcePayload: entry as Prisma.InputJsonValue,
        }));
        return;
      case MASTER_DATA_KEYS.rcsPackages:
        await this.projectExternalIdCollection(tx, value, "rcsPackageSetup", (entry) => ({
          name: this.toString(entry.name ?? entry.packageName) ?? "RCS Package",
          price: this.toNullableNumber(entry.price ?? entry.amount),
          status: this.toString(entry.status),
          isActive: this.toBoolean(entry.isActive, true),
          sourcePayload: entry as Prisma.InputJsonValue,
        }));
        return;
      case MASTER_DATA_KEYS.rcsCommissionRules:
        await this.projectExternalIdCollection(tx, value, "rcsCommissionRuleSetup", (entry) => ({
          name: this.toString(entry.name ?? entry.ruleName) ?? "Commission Rule",
          ruleType: this.toString(entry.ruleType ?? entry.commissionType),
          value: this.toNullableNumber(entry.value ?? entry.commissionValue),
          isActive: this.toBoolean(entry.isActive, true),
          sourcePayload: entry as Prisma.InputJsonValue,
        }));
        return;
      case MASTER_DATA_KEYS.rcsApprovalSettings:
        await this.projectApprovalSettings(tx, value);
        return;
      case MASTER_DATA_KEYS.advanceRules:
        await this.projectExternalIdCollection(tx, value, "advanceRuleSetup", (entry) => ({
          ruleName: this.toString(entry.ruleName ?? entry.name) ?? "Advance Rule",
          applicationType: this.toString(entry.applicationType) ?? "global",
          appliedTo: this.toString(entry.appliedTo),
          advanceType: this.toString(entry.advanceType) ?? "percentage",
          value: this.toNumber(entry.value),
          isActive: this.toBoolean(entry.isActive, true),
          priority: this.toNullableInteger(entry.priority) ?? 0,
          sourceCreatedAt: this.toNullableDate(entry.createdAt),
          sourcePayload: entry as Prisma.InputJsonValue,
        }));
        return;
      case MASTER_DATA_KEYS.taxGroups:
        await this.projectExternalIdCollection(tx, value, "taxGroupSetup", (entry) => ({
          name: this.toString(entry.name) ?? "Tax Group",
          totalPercentage: this.toNumber(entry.totalPercentage),
          isActive: this.toBoolean(entry.isActive, true),
          taxes: this.toJsonValue(entry.taxes),
          sourcePayload: entry as Prisma.InputJsonValue,
        }));
        return;
      case MASTER_DATA_KEYS.discounts:
        await this.projectExternalIdCollection(tx, value, "discountSetup", (entry) => ({
          name: this.toString(entry.name ?? entry.discountName) ?? "Discount",
          discountType: this.toString(entry.discountType ?? entry.type),
          value: this.toNullableNumber(entry.value ?? entry.amount),
          isActive: this.toBoolean(entry.isActive, true),
          sourcePayload: entry as Prisma.InputJsonValue,
        }));
        return;
      default:
        return;
    }
  }

  private async projectNamedSetup(tx: ProjectionTransaction, value: unknown, delegateName: string) {
    await this.projectExternalIdCollection(tx, value, delegateName, (entry) => ({
      name: this.toString(entry.name ?? entry.categoryName) ?? "Setup Item",
      status: this.toString(entry.status),
      isActive: this.toBoolean(entry.isActive, true),
      sourcePayload: entry as Prisma.InputJsonValue,
    }));
  }

  private async projectApprovalSettings(tx: ProjectionTransaction, value: unknown) {
    const delegate: any = (tx as any).rcsApprovalSetting;
    const payload = this.toObject(value) ?? { value };

    await delegate.upsert({
      where: {
        externalKey: MASTER_DATA_KEYS.rcsApprovalSettings,
      },
      update: {
        isActive: true,
        sourcePayload: payload as Prisma.InputJsonValue,
      },
      create: {
        externalKey: MASTER_DATA_KEYS.rcsApprovalSettings,
        isActive: true,
        sourcePayload: payload as Prisma.InputJsonValue,
      },
    });
  }

  private async projectExternalIdCollection(
    tx: ProjectionTransaction,
    value: unknown,
    delegateName: string,
    mapEntry: (entry: Record<string, unknown>) => Record<string, unknown>,
  ) {
    const entries = this.toArrayOfObjects(value);
    const delegate: any = (tx as any)[delegateName];

    if (!entries || entries.length === 0) {
      await delegate.deleteMany({});
      return;
    }

    const externalIds = entries.map((entry) => this.toString(entry.id)).filter(Boolean) as string[];
    await delegate.deleteMany({
      where: {
        externalId: {
          notIn: externalIds,
        },
      },
    });

    for (const entry of entries) {
      const externalId = this.toString(entry.id);
      if (!externalId) {
        continue;
      }

      const data = mapEntry(entry);
      await delegate.upsert({
        where: {
          externalId,
        },
        update: data,
        create: {
          externalId,
          ...data,
        },
      });
    }
  }

  private toArrayOfObjects(value: unknown) {
    if (!Array.isArray(value)) {
      return null;
    }

    return value.filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
    );
  }

  private toObject(value: unknown) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private toString(value: unknown) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  }

  private toNumber(value: unknown, fallback = 0) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return fallback;
  }

  private toNullableNumber(value: unknown) {
    const parsed = this.toNumber(value, Number.NaN);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toNullableInteger(value: unknown) {
    const parsed = this.toNullableNumber(value);
    return parsed === null ? null : Math.trunc(parsed);
  }

  private toBoolean(value: unknown, fallback = false) {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      if (value.toLowerCase() === "true") {
        return true;
      }

      if (value.toLowerCase() === "false") {
        return false;
      }
    }

    return fallback;
  }

  private toNullableDate(value: unknown) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return null;
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }
}
