import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

type CollectionConfig = {
  delegate: string;
  include?: Record<string, boolean>;
  orderBy?: Record<string, "asc" | "desc">;
};

const BANQUET_KITCHEN_COLLECTIONS: Record<string, CollectionConfig> = {
  cuisines: { delegate: "banquetCuisine", orderBy: { name: "asc" } },
  "kitchen-stations": { delegate: "kitchenStationMaster", orderBy: { name: "asc" } },
  "dish-categories": { delegate: "kitchenDishCategoryMaster", orderBy: { name: "asc" } },
  "measurement-units": { delegate: "measurementUnitMaster", orderBy: { code: "asc" } },
  stores: { delegate: "kitchenStoreMaster", orderBy: { name: "asc" } },
  dishes: { delegate: "banquetDish", orderBy: { dishName: "asc" } },
  recipes: {
    delegate: "banquetRecipe",
    include: { ingredients: true, costLines: true },
    orderBy: { updatedAt: "desc" },
  },
  "menu-package-types": { delegate: "banquetMenuPackageType", orderBy: { displayOrder: "asc" } },
  "menu-packages": {
    delegate: "banquetMenuPackage",
    include: { dishes: true, choiceGroups: true },
    orderBy: { updatedAt: "desc" },
  },
  "central-kitchen-estimates": {
    delegate: "centralKitchenEstimate",
    include: { lines: true },
    orderBy: { updatedAt: "desc" },
  },
  "central-kitchen-correction-requests": {
    delegate: "centralKitchenCorrectionRequest",
    orderBy: { updatedAt: "desc" },
  },
  "central-kitchen-backup-plans": { delegate: "centralKitchenBackupPlan", orderBy: { updatedAt: "desc" } },
  "central-kitchen-requisitions": {
    delegate: "centralKitchenRequisition",
    include: { lines: true },
    orderBy: { updatedAt: "desc" },
  },
  "central-kitchen-dispatch-plans": {
    delegate: "centralKitchenDispatchPlan",
    include: { lines: true },
    orderBy: { updatedAt: "desc" },
  },
  "kitchen-issue-sheets": {
    delegate: "kitchenIssueSheet",
    include: { items: true },
    orderBy: { updatedAt: "desc" },
  },
};

const FINANCE_COLLECTIONS: Record<string, CollectionConfig> = {
  "customer-invoices": {
    delegate: "customerInvoice",
    include: { items: true, receipts: true },
    orderBy: { updatedAt: "desc" },
  },
  "general-expenses": { delegate: "generalExpenseRecord", orderBy: { expenseDate: "desc" } },
  "chart-of-accounts": { delegate: "chartAccountRecord", orderBy: { code: "asc" } },
  "accounting-posting-rules": { delegate: "accountingPostingRuleRecord", orderBy: { eventType: "asc" } },
};

const SETUP_COLLECTIONS: Record<string, CollectionConfig> = {
  venues: { delegate: "reservationVenueSetup", orderBy: { venueName: "asc" } },
  "prime-spaces": { delegate: "reservationPrimeSpaceSetup", orderBy: { spaceName: "asc" } },
  "sub-spaces": { delegate: "reservationSubSpaceSetup", orderBy: { spaceName: "asc" } },
  layouts: { delegate: "reservationLayoutSetup", orderBy: { layoutName: "asc" } },
  "event-types": { delegate: "eventTypeSetup", orderBy: { displayName: "asc" } },
  "time-slots": { delegate: "timeSlotSetup", orderBy: { startTime: "asc" } },
  services: { delegate: "reservationServiceSetup", orderBy: { name: "asc" } },
  packages: { delegate: "reservationMenuPackageSetup", orderBy: { name: "asc" } },
  "rcs-categories": { delegate: "rcsCategorySetup", orderBy: { name: "asc" } },
  "rcs-services": { delegate: "rcsServiceSetup", orderBy: { name: "asc" } },
  "rcs-vendors": { delegate: "rcsVendorSetup", orderBy: { name: "asc" } },
  "rcs-vendor-rates": { delegate: "rcsVendorRateSetup", orderBy: { updatedAt: "desc" } },
  "rcs-packages": { delegate: "rcsPackageSetup", orderBy: { name: "asc" } },
  "rcs-commission-rules": { delegate: "rcsCommissionRuleSetup", orderBy: { name: "asc" } },
  "rcs-approval-settings": { delegate: "rcsApprovalSetting", orderBy: { updatedAt: "desc" } },
  "advance-rules": { delegate: "advanceRuleSetup", orderBy: { priority: "asc" } },
  "tax-groups": { delegate: "taxGroupSetup", orderBy: { name: "asc" } },
  discounts: { delegate: "discountSetup", orderBy: { name: "asc" } },
};

const COLLECTION_GROUPS = {
  banquetKitchen: BANQUET_KITCHEN_COLLECTIONS,
  finance: FINANCE_COLLECTIONS,
  setup: SETUP_COLLECTIONS,
} as const;

type CollectionGroup = keyof typeof COLLECTION_GROUPS;

@Injectable()
export class NormalizedDataService {
  constructor(private readonly prisma: PrismaService) {}

  findCollections(group: CollectionGroup) {
    return Object.keys(COLLECTION_GROUPS[group]).sort();
  }

  findAll(group: CollectionGroup, collection: string) {
    const { delegate, config } = this.getDelegate(group, collection);

    return delegate.findMany({
      ...(config.include ? { include: config.include } : {}),
      ...(config.orderBy ? { orderBy: config.orderBy } : {}),
    });
  }

  async findOne(group: CollectionGroup, collection: string, id: string) {
    const { delegate, config } = this.getDelegate(group, collection);
    const record = await delegate.findFirst({
      where: this.buildIdWhere(id),
      ...(config.include ? { include: config.include } : {}),
    });

    if (!record) {
      throw new NotFoundException(`${collection} record ${id} was not found`);
    }

    return record;
  }

  create(group: CollectionGroup, collection: string, body: Record<string, unknown>) {
    const { delegate } = this.getDelegate(group, collection);

    return delegate.create({
      data: this.normalizeWritableBody(body),
    });
  }

  async update(group: CollectionGroup, collection: string, id: string, body: Record<string, unknown>) {
    const { delegate } = this.getDelegate(group, collection);
    const existing = await delegate.findFirst({
      where: this.buildIdWhere(id),
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`${collection} record ${id} was not found`);
    }

    return delegate.update({
      where: { id: existing.id },
      data: this.normalizeWritableBody(body, true),
    });
  }

  async remove(group: CollectionGroup, collection: string, id: string) {
    const { delegate } = this.getDelegate(group, collection);
    const existing = await delegate.findFirst({
      where: this.buildIdWhere(id),
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`${collection} record ${id} was not found`);
    }

    await delegate.delete({
      where: { id: existing.id },
    });

    return { deleted: true, id };
  }

  private getDelegate(group: CollectionGroup, collection: string) {
    const config = COLLECTION_GROUPS[group][collection];
    if (!config) {
      throw new BadRequestException(`Unsupported ${group} collection: ${collection}`);
    }

    const delegate = (this.prisma as never as Record<string, unknown>)[config.delegate];
    if (!delegate || typeof delegate !== "object") {
      throw new BadRequestException(`Prisma delegate is not configured for ${collection}`);
    }

    return {
      delegate: delegate as {
        findMany: (args?: unknown) => Promise<unknown[]>;
        findFirst: (args?: unknown) => Promise<Record<string, unknown> | null>;
        create: (args: unknown) => Promise<unknown>;
        update: (args: unknown) => Promise<unknown>;
        delete: (args: unknown) => Promise<unknown>;
      },
      config,
    };
  }

  private buildIdWhere(id: string) {
    return {
      OR: [{ id }, { externalId: id }, { externalKey: id }],
    };
  }

  private normalizeWritableBody(body: Record<string, unknown>, isUpdate = false) {
    const next = { ...body };

    if (!next.externalId && typeof next.id === "string" && !isUpdate) {
      next.externalId = next.id;
    }

    if (!next.externalKey && typeof next.id === "string" && !isUpdate) {
      next.externalKey = next.id;
    }

    delete next.id;
    delete next.createdAt;
    delete next.updatedAt;

    return next;
  }
}
