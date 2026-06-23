import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";

const SUPPORTED_WORKFLOW_KEYS = {
  procurementLookups: "workflow:procurement-lookups",
  vendors: "workflow:vendors",
  purchaseItems: "workflow:purchase-items",
  purchaseOrders: "workflow:purchase-orders",
  goodsReceipts: "workflow:goods-receipts",
  storeStocks: "workflow:store-stocks",
  stockTransfers: "workflow:stock-transfers",
  vendorItemMappings: "workflow:vendor-item-mappings",
  vendorBills: "workflow:vendor-bills",
  banquetCuisines: "workflow:banquet-cuisines",
  kitchenStations: "workflow:kitchen-stations",
  dishCategories: "workflow:dish-categories",
  measurementUnits: "workflow:measurement-units",
  banquetDishes: "workflow:banquet-dishes",
  banquetRecipes: "workflow:banquet-recipes",
  banquetMenuPackages: "workflow:banquet-menu-packages",
  banquetMenuPackageTypes: "workflow:banquet-menu-package-types",
  centralKitchenEstimates: "workflow:central-kitchen-estimates",
  centralKitchenCorrectionRequests: "workflow:central-kitchen-correction-requests",
  centralKitchenBackupPlans: "workflow:central-kitchen-backup-plans",
  centralKitchenRequisitions: "workflow:central-kitchen-requisitions",
  centralKitchenDispatchPlans: "workflow:central-kitchen-dispatch-plans",
  stores: "workflow:stores",
  kitchenIssueSheets: "workflow:kitchen-issue-sheets",
  customerInvoices: "workflow:customer-invoices",
  generalExpenses: "workflow:general-expenses",
  chartOfAccounts: "workflow:chart-of-accounts",
  accountingPostingRules: "workflow:accounting-posting-rules",
} as const;

type ProjectionTransaction = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class WorkflowProjectionService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowProjectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const records = await this.prisma.masterDataRecord.findMany({
      where: {
        key: {
          in: Object.values(SUPPORTED_WORKFLOW_KEYS),
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
      case SUPPORTED_WORKFLOW_KEYS.procurementLookups:
        await this.projectProcurementLookups(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.vendors:
        await this.projectVendors(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.purchaseItems:
        await this.projectPurchaseItems(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.vendorItemMappings:
        await this.projectVendorItemMappings(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.purchaseOrders:
        await this.projectPurchaseOrders(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.goodsReceipts:
        await this.projectGoodsReceipts(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.storeStocks:
        await this.projectStoreStocks(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.stockTransfers:
        await this.projectStockTransfers(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.vendorBills:
        await this.projectVendorBills(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.banquetCuisines:
        await this.projectBanquetCuisines(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.kitchenStations:
        await this.projectKitchenStations(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.dishCategories:
        await this.projectDishCategories(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.measurementUnits:
        await this.projectMeasurementUnits(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.stores:
        await this.projectKitchenStores(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.banquetDishes:
        await this.projectBanquetDishes(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.banquetRecipes:
        await this.projectBanquetRecipes(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.banquetMenuPackageTypes:
        await this.projectBanquetMenuPackageTypes(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.banquetMenuPackages:
        await this.projectBanquetMenuPackages(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.centralKitchenEstimates:
        await this.projectCentralKitchenEstimates(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.centralKitchenCorrectionRequests:
        await this.projectCentralKitchenCorrectionRequests(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.centralKitchenBackupPlans:
        await this.projectCentralKitchenBackupPlans(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.centralKitchenRequisitions:
        await this.projectCentralKitchenRequisitions(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.centralKitchenDispatchPlans:
        await this.projectCentralKitchenDispatchPlans(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.kitchenIssueSheets:
        await this.projectKitchenIssueSheets(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.customerInvoices:
        await this.projectCustomerInvoices(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.generalExpenses:
        await this.projectGeneralExpenses(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.chartOfAccounts:
        await this.projectChartOfAccounts(tx, value);
        return;
      case SUPPORTED_WORKFLOW_KEYS.accountingPostingRules:
        await this.projectAccountingPostingRules(tx, value);
        return;
      default:
        return;
    }
  }

  private async projectProcurementLookups(tx: ProjectionTransaction, value: unknown) {
    const payload = this.toObject(value);
    if (!payload) {
      return;
    }

    await this.projectLookupValues(tx, "vendorTypes", payload.vendorTypes);
    await this.projectLookupValues(tx, "supplyCategories", payload.supplyCategories);
    await this.projectLookupValues(tx, "purchaseCategories", payload.purchaseCategories);
  }

  private async projectLookupValues(
    tx: ProjectionTransaction,
    table: "vendorTypes" | "supplyCategories" | "purchaseCategories",
    value: unknown,
  ) {
    const lookupValues = this.toArrayOfObjects(value);
    if (!lookupValues) {
      return;
    }

    const ids = lookupValues.map((entry) => this.toString(entry.id)).filter(Boolean) as string[];
    const delegate: any =
      table === "vendorTypes"
        ? tx.vendorType
        : table === "supplyCategories"
          ? tx.supplyCategory
          : tx.purchaseCategory;

    if (ids.length === 0) {
      return;
    }

    for (const entry of lookupValues) {
      const id = this.toString(entry.id);
      if (!id) {
        continue;
      }

      await delegate.upsert({
        where: {
          id,
        },
        update: {
          name: this.toString(entry.name) ?? id,
          status: this.toString(entry.status) ?? "active",
        },
        create: {
          id,
          name: this.toString(entry.name) ?? id,
          status: this.toString(entry.status) ?? "active",
          createdAt: this.toNullableDate(entry.createdAt) ?? new Date(),
        },
      });
    }
  }

  private async projectVendors(tx: ProjectionTransaction, value: unknown) {
    const vendors = this.toArrayOfObjects(value);
    if (!vendors) {
      return;
    }

    const externalIds = vendors.map((vendor) => this.toString(vendor.id)).filter(Boolean) as string[];
    if (externalIds.length === 0) {
      await tx.procurementVendor.deleteMany({});
      return;
    }

    await tx.procurementVendor.deleteMany({
      where: {
        externalId: {
          notIn: externalIds,
        },
      },
    });

    for (const vendor of vendors) {
      const externalId = this.toString(vendor.id);
      if (!externalId) {
        continue;
      }
      const vendorTypeId = await this.resolveExistingLookupId(tx, "vendorType", this.toString(vendor.vendorTypeId));

      const record = await tx.procurementVendor.upsert({
        where: {
          externalId,
        },
        update: {
          vendorName: this.toString(vendor.vendorName) ?? "Unnamed Vendor",
          vendorCode: this.toString(vendor.vendorCode),
          vendorTypeId,
          vendorCategories: this.toJsonValue(vendor.vendorCategories),
          contactPerson: this.toString(vendor.contactPerson),
          phone: this.toString(vendor.phone),
          email: this.toString(vendor.email),
          address: this.toString(vendor.address),
          city: this.toString(vendor.city),
          paymentTerms: this.toString(vendor.paymentTerms),
          creditLimit: this.toNullableNumber(vendor.creditLimit),
          supplyScope: this.toString(vendor.supplyScope),
          defaultLeadTimeDays: this.toNullableInteger(vendor.defaultLeadTimeDays),
          orderCutoffTime: this.toString(vendor.orderCutoffTime),
          deliveryDays: this.toJsonValue(vendor.deliveryDays),
          status: this.toString(vendor.status) ?? "active",
          taxId: this.toString(vendor.taxId),
          inactiveReason: this.toString(vendor.inactiveReason),
          inactiveSince: this.toNullableDate(vendor.inactiveSince),
          pricingFormulas: this.toJsonValue(vendor.pricingFormulas),
          currentBalance: this.toNullableNumber(vendor.currentBalance),
          totalPurchases: this.toNullableNumber(vendor.totalPurchases),
          lastPurchaseDate: this.toNullableDate(vendor.lastPurchaseDate),
          createdBy: this.toString(vendor.createdBy),
          sourceCreatedAt: this.toNullableDate(vendor.createdAt),
          sourceUpdatedAt: this.toNullableDate(vendor.updatedAt),
          sourcePayload: vendor as Prisma.InputJsonValue,
        },
        create: {
          externalId,
          vendorName: this.toString(vendor.vendorName) ?? "Unnamed Vendor",
          vendorCode: this.toString(vendor.vendorCode),
          vendorTypeId,
          vendorCategories: this.toJsonValue(vendor.vendorCategories),
          contactPerson: this.toString(vendor.contactPerson),
          phone: this.toString(vendor.phone),
          email: this.toString(vendor.email),
          address: this.toString(vendor.address),
          city: this.toString(vendor.city),
          paymentTerms: this.toString(vendor.paymentTerms),
          creditLimit: this.toNullableNumber(vendor.creditLimit),
          supplyScope: this.toString(vendor.supplyScope),
          defaultLeadTimeDays: this.toNullableInteger(vendor.defaultLeadTimeDays),
          orderCutoffTime: this.toString(vendor.orderCutoffTime),
          deliveryDays: this.toJsonValue(vendor.deliveryDays),
          status: this.toString(vendor.status) ?? "active",
          taxId: this.toString(vendor.taxId),
          inactiveReason: this.toString(vendor.inactiveReason),
          inactiveSince: this.toNullableDate(vendor.inactiveSince),
          pricingFormulas: this.toJsonValue(vendor.pricingFormulas),
          currentBalance: this.toNullableNumber(vendor.currentBalance),
          totalPurchases: this.toNullableNumber(vendor.totalPurchases),
          lastPurchaseDate: this.toNullableDate(vendor.lastPurchaseDate),
          createdBy: this.toString(vendor.createdBy),
          sourceCreatedAt: this.toNullableDate(vendor.createdAt),
          sourceUpdatedAt: this.toNullableDate(vendor.updatedAt),
          sourcePayload: vendor as Prisma.InputJsonValue,
        },
      });

      await this.syncVendorSupplyCategories(tx, record.id, vendor);
    }

    const projectedStoredMappings = await this.syncVendorItemMappingsFromStoredState(tx);
    if (!projectedStoredMappings) {
      await this.syncPreferredVendorMappingsFromStoredPurchaseItems(tx);
    }
  }

  private getVendorSupplyCategoryIds(vendor: Record<string, unknown>) {
    const directIds = Array.isArray(vendor.supplyCategoryIds)
      ? vendor.supplyCategoryIds.map((entry) => this.toString(entry)).filter(Boolean)
      : [];
    const categoryAssignments = this.toArrayOfObjects(vendor.vendorCategories) ?? [];
    const assignmentIds = categoryAssignments
      .filter((assignment) => assignment.isActive !== false)
      .map((assignment) => this.toString(assignment.category))
      .filter(Boolean);

    return Array.from(new Set([...directIds, ...assignmentIds])) as string[];
  }

  private async syncVendorSupplyCategories(
    tx: ProjectionTransaction,
    vendorId: string,
    vendor: Record<string, unknown>,
  ) {
    const requestedCategoryIds = this.getVendorSupplyCategoryIds(vendor);

    await tx.vendorSupplyCategory.deleteMany({
      where: {
        vendorId,
      },
    });

    if (requestedCategoryIds.length === 0) {
      return;
    }

    const existingCategories = await tx.supplyCategory.findMany({
      where: {
        id: {
          in: requestedCategoryIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingCategories.length === 0) {
      return;
    }

    await tx.vendorSupplyCategory.createMany({
      data: existingCategories.map((category) => ({
        vendorId,
        supplyCategoryId: category.id,
      })),
      skipDuplicates: true,
    });
  }

  private async projectPurchaseItems(tx: ProjectionTransaction, value: unknown) {
    const purchaseItems = this.toArrayOfObjects(value);
    if (!purchaseItems) {
      return;
    }

    const externalIds = purchaseItems
      .map((purchaseItem) => this.toString(purchaseItem.id))
      .filter(Boolean) as string[];

    if (externalIds.length === 0) {
      await tx.inventoryItem.deleteMany({});
      return;
    }

    await tx.inventoryItem.deleteMany({
      where: {
        externalId: {
          notIn: externalIds,
        },
      },
    });

    for (const purchaseItem of purchaseItems) {
      const externalId = this.toString(purchaseItem.id);
      if (!externalId) {
        continue;
      }

      const assignedKitchenStoreIds = Array.isArray(purchaseItem.assignedKitchenStoreIds)
        ? purchaseItem.assignedKitchenStoreIds
        : [];
      const primaryStoreLocation =
        assignedKitchenStoreIds.map((storeId) => this.toString(storeId)).find(Boolean) ??
        this.toString(purchaseItem.storeLocation) ??
        "unknown";
      const category = this.toString(purchaseItem.categoryId) ?? this.toString(purchaseItem.category) ?? "uncategorized";
      const requestedPurchaseCategoryId =
        this.toString(purchaseItem.purchaseCategoryId) ?? this.toString(purchaseItem.categoryId) ?? this.toString(purchaseItem.category);
      const purchaseCategoryId = await this.resolveExistingLookupId(tx, "purchaseCategory", requestedPurchaseCategoryId);
      const purchaseUnit = this.toString(purchaseItem.purchaseUnitId) ?? this.toString(purchaseItem.purchaseUnit) ?? "unit";
      const issueUnit = this.toString(purchaseItem.baseUnitId) ?? this.toString(purchaseItem.issueUnit) ?? "unit";
      const lastPurchaseRate = this.toNumber(
        purchaseItem.lastPurchaseRate ?? purchaseItem.lastCost ?? purchaseItem.defaultPurchaseCost,
      );
      const ratePerUnit = this.toNullableNumber(purchaseItem.ratePerUnit ?? purchaseItem.averageCost);
      const preferredVendorExternalId = this.getPreferredVendorExternalId(purchaseItem);

      const record = await tx.inventoryItem.upsert({
        where: {
          externalId,
        },
        update: {
          itemName: this.toString(purchaseItem.itemName) ?? "Unnamed Item",
          itemCode: this.toString(purchaseItem.itemCode),
          category,
          purchaseCategoryId,
          purchaseUnit,
          issueUnit,
          conversionFactor: this.toNumber(purchaseItem.conversionFactor, 1),
          storeLocation: primaryStoreLocation,
          currentStock: this.toNumber(purchaseItem.currentStock),
          reorderLevel: this.toNumber(purchaseItem.reorderLevel),
          lastPurchaseRate,
          ratePerUnit,
          preferredVendorExternalId,
          lastPurchaseDate: this.toNullableDate(purchaseItem.lastPurchaseDate),
          status: this.toString(purchaseItem.status) ?? "active",
          sourceCreatedAt: this.toNullableDate(purchaseItem.createdAt),
          sourceUpdatedAt: this.toNullableDate(purchaseItem.updatedAt),
          sourcePayload: purchaseItem as Prisma.InputJsonValue,
        },
        create: {
          externalId,
          itemName: this.toString(purchaseItem.itemName) ?? "Unnamed Item",
          itemCode: this.toString(purchaseItem.itemCode),
          category,
          purchaseCategoryId,
          purchaseUnit,
          issueUnit,
          conversionFactor: this.toNumber(purchaseItem.conversionFactor, 1),
          storeLocation: primaryStoreLocation,
          currentStock: this.toNumber(purchaseItem.currentStock),
          reorderLevel: this.toNumber(purchaseItem.reorderLevel),
          lastPurchaseRate,
          ratePerUnit,
          preferredVendorExternalId,
          lastPurchaseDate: this.toNullableDate(purchaseItem.lastPurchaseDate),
          status: this.toString(purchaseItem.status) ?? "active",
          sourceCreatedAt: this.toNullableDate(purchaseItem.createdAt),
          sourceUpdatedAt: this.toNullableDate(purchaseItem.updatedAt),
          sourcePayload: purchaseItem as Prisma.InputJsonValue,
        },
      });

      await this.syncPreferredVendorMapping(tx, record, purchaseItem);
    }

    await this.syncVendorItemMappingsFromStoredState(tx);
  }

  private async projectVendorItemMappings(tx: ProjectionTransaction, value: unknown) {
    const mappings = this.toArrayOfObjects(value);
    if (!mappings) {
      return;
    }

    if (mappings.length === 0) {
      await tx.vendorItemMapping.deleteMany({});
      await this.syncPreferredVendorMappingsFromStoredPurchaseItems(tx);
      return;
    }

    const vendorExternalIds = Array.from(
      new Set(mappings.map((mapping) => this.toString(mapping.vendorId)).filter(Boolean)),
    ) as string[];
    const itemExternalIds = Array.from(
      new Set(mappings.map((mapping) => this.toString(mapping.kitchenItemId)).filter(Boolean)),
    ) as string[];

    const [vendors, kitchenItems] = await Promise.all([
      tx.procurementVendor.findMany({
        where: {
          externalId: {
            in: vendorExternalIds,
          },
        },
        select: {
          id: true,
          externalId: true,
        },
      }),
      tx.inventoryItem.findMany({
        where: {
          externalId: {
            in: itemExternalIds,
          },
        },
        select: {
          id: true,
          externalId: true,
        },
      }),
    ]);

    const vendorIdByExternalId = new Map(vendors.map((vendor) => [vendor.externalId, vendor.id]));
    const itemIdByExternalId = new Map(kitchenItems.map((item) => [item.externalId, item.id]));
    const projectedPairs: Array<{ vendorId: string; kitchenItemId: string }> = [];

    for (const mapping of mappings) {
      const vendorExternalId = this.toString(mapping.vendorId);
      const kitchenItemExternalId = this.toString(mapping.kitchenItemId);
      if (!vendorExternalId || !kitchenItemExternalId) {
        continue;
      }

      const vendorId = vendorIdByExternalId.get(vendorExternalId);
      const kitchenItemId = itemIdByExternalId.get(kitchenItemExternalId);
      if (!vendorId || !kitchenItemId) {
        continue;
      }

      projectedPairs.push({ vendorId, kitchenItemId });

      const isPreferred = Boolean(mapping.isPreferred);
      if (isPreferred) {
        await tx.vendorItemMapping.updateMany({
          where: {
            kitchenItemId,
            vendorId: {
              not: vendorId,
            },
            isPreferred: true,
          },
          data: {
            isPreferred: false,
          },
        });
      }

      await tx.vendorItemMapping.upsert({
        where: {
          vendorId_kitchenItemId: {
            vendorId,
            kitchenItemId,
          },
        },
        update: {
          isPreferred,
          leadTimeDays: this.toNullableInteger(mapping.leadTimeDays),
          moq: this.toNullableNumber(mapping.moq),
          lastRate: this.toNullableNumber(mapping.lastRate),
          contractRate: this.toNullableNumber(mapping.contractRate),
          status: this.toString(mapping.status) ?? "active",
          notes: this.toString(mapping.notes),
        },
        create: {
          vendorId,
          kitchenItemId,
          isPreferred,
          leadTimeDays: this.toNullableInteger(mapping.leadTimeDays),
          moq: this.toNullableNumber(mapping.moq),
          lastRate: this.toNullableNumber(mapping.lastRate),
          contractRate: this.toNullableNumber(mapping.contractRate),
          status: this.toString(mapping.status) ?? "active",
          notes: this.toString(mapping.notes),
          createdAt: this.toNullableDate(mapping.createdAt) ?? new Date(),
        },
      });
    }

    if (projectedPairs.length > 0) {
      await tx.vendorItemMapping.deleteMany({
        where: {
          NOT: projectedPairs,
        },
      });
    }

    await this.syncPreferredVendorMappingsFromStoredPurchaseItems(tx);
  }

  private async syncVendorItemMappingsFromStoredState(tx: ProjectionTransaction) {
    const mappingState = await tx.masterDataRecord.findUnique({
      where: {
        key: SUPPORTED_WORKFLOW_KEYS.vendorItemMappings,
      },
    });

    if (!mappingState) {
      return false;
    }

    await this.projectVendorItemMappings(tx, mappingState.value);
    return true;
  }

  private async projectPurchaseOrders(tx: ProjectionTransaction, value: unknown) {
    const purchaseOrders = this.toArrayOfObjects(value);
    if (!purchaseOrders) {
      return;
    }

    const externalIds = purchaseOrders.map((order) => this.toString(order.id)).filter(Boolean) as string[];
    if (externalIds.length === 0) {
      await tx.procurementPurchaseOrder.deleteMany({});
      return;
    }

    await tx.procurementPurchaseOrder.deleteMany({
      where: {
        externalId: {
          notIn: externalIds,
        },
      },
    });

    for (const order of purchaseOrders) {
      const externalId = this.toString(order.id);
      if (!externalId) {
        continue;
      }

      const record = await tx.procurementPurchaseOrder.upsert({
        where: {
          externalId,
        },
        update: {
          poNumber: this.toString(order.poNumber) ?? externalId,
          vendorExternalId: this.toString(order.vendorId),
          vendorName: this.toString(order.vendorName) ?? "Unknown Vendor",
          orderDate: this.toDate(order.orderDate),
          expectedDeliveryDate: this.toDate(order.expectedDeliveryDate),
          paymentTerms: this.toString(order.paymentTerms) ?? "credit",
          status: this.toString(order.status) ?? "draft",
          sourceFlow: this.toString(order.sourceFlow),
          sourceLabel: this.toString(order.sourceLabel),
          subtotal: this.toNullableNumber(order.subtotal),
          taxAmount: this.toNullableNumber(order.taxAmount),
          totalAmount: this.toNullableNumber(order.totalAmount),
          amountPaid: this.toNullableNumber(order.amountPaid),
          amountPending: this.toNullableNumber(order.amountPending),
          deliveredDate: this.toNullableDate(order.deliveredDate),
          receivedBy: this.toString(order.receivedBy),
          receivedQuantities: this.toJsonValue(order.receivedQuantities),
          remarks: this.toString(order.remarks),
          createdBy: this.toString(order.createdBy),
          approvedBy: this.toString(order.approvedBy),
          approvedAt: this.toNullableDate(order.approvedAt),
          sourceCreatedAt: this.toNullableDate(order.createdAt),
          sourceUpdatedAt: this.toNullableDate(order.updatedAt),
          sourcePayload: order as Prisma.InputJsonValue,
        },
        create: {
          externalId,
          poNumber: this.toString(order.poNumber) ?? externalId,
          vendorExternalId: this.toString(order.vendorId),
          vendorName: this.toString(order.vendorName) ?? "Unknown Vendor",
          orderDate: this.toDate(order.orderDate),
          expectedDeliveryDate: this.toDate(order.expectedDeliveryDate),
          paymentTerms: this.toString(order.paymentTerms) ?? "credit",
          status: this.toString(order.status) ?? "draft",
          sourceFlow: this.toString(order.sourceFlow),
          sourceLabel: this.toString(order.sourceLabel),
          subtotal: this.toNullableNumber(order.subtotal),
          taxAmount: this.toNullableNumber(order.taxAmount),
          totalAmount: this.toNullableNumber(order.totalAmount),
          amountPaid: this.toNullableNumber(order.amountPaid),
          amountPending: this.toNullableNumber(order.amountPending),
          deliveredDate: this.toNullableDate(order.deliveredDate),
          receivedBy: this.toString(order.receivedBy),
          receivedQuantities: this.toJsonValue(order.receivedQuantities),
          remarks: this.toString(order.remarks),
          createdBy: this.toString(order.createdBy),
          approvedBy: this.toString(order.approvedBy),
          approvedAt: this.toNullableDate(order.approvedAt),
          sourceCreatedAt: this.toNullableDate(order.createdAt),
          sourceUpdatedAt: this.toNullableDate(order.updatedAt),
          sourcePayload: order as Prisma.InputJsonValue,
        },
      });

      const items = this.toArrayOfObjects(order.items) ?? [];
      await tx.procurementPurchaseOrderItem.deleteMany({
        where: {
          purchaseOrderId: record.id,
        },
      });

      if (items.length > 0) {
        await tx.procurementPurchaseOrderItem.createMany({
          data: items.map((item) => ({
            purchaseOrderId: record.id,
            sourceItemId: this.toString(item.id),
            purchaseItemExternalId: this.toString(item.purchaseItemId),
            itemName: this.toString(item.itemName) ?? "Unnamed Item",
            preferredVendorExternalId: this.toString(item.preferredVendorId),
            selectedVendorExternalId: this.toString(item.selectedVendorId),
            purchaseCategoryExternalId: this.toString(item.purchaseCategoryId),
            supplyCategoryExternalId: this.toString(item.supplyCategoryId),
            quantity: this.toNumber(item.quantity),
            unit: this.toString(item.unit) ?? "unit",
            ratePerUnit: this.toNumber(item.ratePerUnit),
            amount: this.toNumber(item.amount),
            receivedQuantity: this.toNullableNumber(item.receivedQuantity),
            pendingQuantity: this.toNullableNumber(item.pendingQuantity),
            sourcePayload: item as Prisma.InputJsonValue,
          })),
        });
      }
    }
  }

  private async projectGoodsReceipts(tx: ProjectionTransaction, value: unknown) {
    const goodsReceipts = this.toArrayOfObjects(value);
    if (!goodsReceipts) {
      return;
    }

    const externalIds = goodsReceipts.map((receipt) => this.toString(receipt.id)).filter(Boolean) as string[];
    if (externalIds.length === 0) {
      await tx.procurementGoodsReceipt.deleteMany({});
      return;
    }

    await tx.procurementGoodsReceipt.deleteMany({
      where: {
        externalId: {
          notIn: externalIds,
        },
      },
    });

    for (const receipt of goodsReceipts) {
      const externalId = this.toString(receipt.id);
      if (!externalId) {
        continue;
      }

      const record = await tx.procurementGoodsReceipt.upsert({
        where: {
          externalId,
        },
        update: {
          grnNumber: this.toString(receipt.grnNumber) ?? externalId,
          purchaseOrderExternalId: this.toString(receipt.purchaseOrderId),
          poNumber: this.toString(receipt.poNumber) ?? "",
          vendorExternalId: this.toString(receipt.vendorId),
          vendorName: this.toString(receipt.vendorName) ?? "Unknown Vendor",
          receiptDate: this.toDate(receipt.receiptDate),
          destinationStore: this.toString(receipt.destinationStore) ?? "unknown",
          qualityCheckStatus: this.toString(receipt.qualityCheckStatus) ?? "pending",
          qualityCheckedBy: this.toString(receipt.qualityCheckedBy),
          qualityRemarks: this.toString(receipt.qualityRemarks),
          receivedBy: this.toString(receipt.receivedBy),
          sourceCreatedAt: this.toNullableDate(receipt.createdAt),
          sourcePayload: receipt as Prisma.InputJsonValue,
        },
        create: {
          externalId,
          grnNumber: this.toString(receipt.grnNumber) ?? externalId,
          purchaseOrderExternalId: this.toString(receipt.purchaseOrderId),
          poNumber: this.toString(receipt.poNumber) ?? "",
          vendorExternalId: this.toString(receipt.vendorId),
          vendorName: this.toString(receipt.vendorName) ?? "Unknown Vendor",
          receiptDate: this.toDate(receipt.receiptDate),
          destinationStore: this.toString(receipt.destinationStore) ?? "unknown",
          qualityCheckStatus: this.toString(receipt.qualityCheckStatus) ?? "pending",
          qualityCheckedBy: this.toString(receipt.qualityCheckedBy),
          qualityRemarks: this.toString(receipt.qualityRemarks),
          receivedBy: this.toString(receipt.receivedBy),
          sourceCreatedAt: this.toNullableDate(receipt.createdAt),
          sourcePayload: receipt as Prisma.InputJsonValue,
        },
      });

      const items = this.toArrayOfObjects(receipt.items) ?? [];
      await tx.procurementGoodsReceiptItem.deleteMany({
        where: {
          goodsReceiptId: record.id,
        },
      });

      if (items.length > 0) {
        await tx.procurementGoodsReceiptItem.createMany({
          data: items.map((item) => ({
            goodsReceiptId: record.id,
            purchaseItemExternalId: this.toString(item.purchaseItemId),
            itemName: this.toString(item.itemName) ?? "Unnamed Item",
            orderedQuantity: this.toNumber(item.orderedQuantity),
            receivedQuantity: this.toNumber(item.receivedQuantity),
            acceptedQuantity: this.toNumber(item.acceptedQuantity),
            rejectedQuantity: this.toNumber(item.rejectedQuantity),
            unit: this.toString(item.unit) ?? "unit",
            ratePerUnit: this.toNumber(item.ratePerUnit),
            totalValue: this.toNumber(item.totalValue),
            sourcePayload: item as Prisma.InputJsonValue,
          })),
        });
      }
    }
  }

  private async projectStoreStocks(tx: ProjectionTransaction, value: unknown) {
    const storeStocks = this.toArrayOfObjects(value);
    if (!storeStocks) {
      return;
    }

    const externalKeys = storeStocks
      .map((stock) => this.buildStoreStockKey(stock))
      .filter(Boolean) as string[];

    if (externalKeys.length === 0) {
      await tx.inventoryStoreStock.deleteMany({});
      return;
    }

    await tx.inventoryStoreStock.deleteMany({
      where: {
        externalKey: {
          notIn: externalKeys,
        },
      },
    });

    for (const stock of storeStocks) {
      const externalKey = this.buildStoreStockKey(stock);
      if (!externalKey) {
        continue;
      }

      await tx.inventoryStoreStock.upsert({
        where: {
          externalKey,
        },
        update: {
          storeLocation: this.toString(stock.storeLocation) ?? "unknown",
          purchaseItemExternalId: this.toString(stock.purchaseItemId) ?? externalKey,
          itemName: this.toString(stock.itemName) ?? "Unnamed Item",
          currentStock: this.toNumber(stock.currentStock),
          unit: this.toString(stock.unit) ?? "unit",
          reorderLevel: this.toNumber(stock.reorderLevel),
          lastUpdatedAt: this.toDate(stock.lastUpdated),
          sourcePayload: stock as Prisma.InputJsonValue,
        },
        create: {
          externalKey,
          storeLocation: this.toString(stock.storeLocation) ?? "unknown",
          purchaseItemExternalId: this.toString(stock.purchaseItemId) ?? externalKey,
          itemName: this.toString(stock.itemName) ?? "Unnamed Item",
          currentStock: this.toNumber(stock.currentStock),
          unit: this.toString(stock.unit) ?? "unit",
          reorderLevel: this.toNumber(stock.reorderLevel),
          lastUpdatedAt: this.toDate(stock.lastUpdated),
          sourcePayload: stock as Prisma.InputJsonValue,
        },
      });
    }
  }

  private async projectStockTransfers(tx: ProjectionTransaction, value: unknown) {
    const stockTransfers = this.toArrayOfObjects(value);
    if (!stockTransfers) {
      return;
    }

    const externalIds = stockTransfers.map((transfer) => this.toString(transfer.id)).filter(Boolean) as string[];
    if (externalIds.length === 0) {
      await tx.inventoryStockTransfer.deleteMany({});
      return;
    }

    await tx.inventoryStockTransfer.deleteMany({
      where: {
        externalId: {
          notIn: externalIds,
        },
      },
    });

    for (const transfer of stockTransfers) {
      const externalId = this.toString(transfer.id);
      if (!externalId) {
        continue;
      }

      const record = await tx.inventoryStockTransfer.upsert({
        where: {
          externalId,
        },
        update: {
          transferNumber: this.toString(transfer.transferNumber) ?? externalId,
          transferDate: this.toDate(transfer.transferDate),
          fromStore: this.toString(transfer.fromStore) ?? "unknown",
          toStore: this.toString(transfer.toStore) ?? "unknown",
          status: this.toString(transfer.status) ?? "pending",
          issuedBy: this.toString(transfer.issuedBy),
          receivedBy: this.toString(transfer.receivedBy),
          receivedAt: this.toNullableDate(transfer.receivedAt),
          remarks: this.toString(transfer.remarks),
          sourceCreatedAt: this.toNullableDate(transfer.createdAt),
          sourcePayload: transfer as Prisma.InputJsonValue,
        },
        create: {
          externalId,
          transferNumber: this.toString(transfer.transferNumber) ?? externalId,
          transferDate: this.toDate(transfer.transferDate),
          fromStore: this.toString(transfer.fromStore) ?? "unknown",
          toStore: this.toString(transfer.toStore) ?? "unknown",
          status: this.toString(transfer.status) ?? "pending",
          issuedBy: this.toString(transfer.issuedBy),
          receivedBy: this.toString(transfer.receivedBy),
          receivedAt: this.toNullableDate(transfer.receivedAt),
          remarks: this.toString(transfer.remarks),
          sourceCreatedAt: this.toNullableDate(transfer.createdAt),
          sourcePayload: transfer as Prisma.InputJsonValue,
        },
      });

      const items = this.toArrayOfObjects(transfer.items) ?? [];
      await tx.inventoryStockTransferItem.deleteMany({
        where: {
          stockTransferId: record.id,
        },
      });

      if (items.length > 0) {
        await tx.inventoryStockTransferItem.createMany({
          data: items.map((item) => ({
            stockTransferId: record.id,
            purchaseItemExternalId: this.toString(item.purchaseItemId),
            itemName: this.toString(item.itemName) ?? "Unnamed Item",
            quantity: this.toNumber(item.quantity),
            unit: this.toString(item.unit) ?? "unit",
            status: this.toString(item.status) ?? "pending",
            sourcePayload: item as Prisma.InputJsonValue,
          })),
        });
      }
    }
  }

  private async projectVendorBills(tx: ProjectionTransaction, value: unknown) {
    const vendorBills = this.toArrayOfObjects(value);
    if (!vendorBills) {
      return;
    }

    const externalIds = vendorBills.map((bill) => this.toString(bill.id)).filter(Boolean) as string[];
    if (externalIds.length === 0) {
      await tx.procurementVendorBill.deleteMany({});
      return;
    }

    await tx.procurementVendorBill.deleteMany({
      where: {
        externalId: {
          notIn: externalIds,
        },
      },
    });

    for (const bill of vendorBills) {
      const externalId = this.toString(bill.id);
      if (!externalId) {
        continue;
      }

      const record = await tx.procurementVendorBill.upsert({
        where: {
          externalId,
        },
        update: {
          billNumber: this.toString(bill.billNumber) ?? externalId,
          vendorBillNumber: this.toString(bill.vendorBillNumber),
          billDate: this.toDate(bill.billDate),
          dueDate: this.toDate(bill.dueDate),
          vendorExternalId: this.toString(bill.vendorId),
          vendorName: this.toString(bill.vendorName) ?? "Unknown Vendor",
          purchaseOrderExternalId: this.toString(bill.purchaseOrderId),
          poNumber: this.toString(bill.poNumber),
          subtotal: this.toNullableNumber(bill.subtotal),
          taxRate: this.toNullableNumber(bill.taxRate),
          taxAmount: this.toNullableNumber(bill.taxAmount),
          totalAmount: this.toNullableNumber(bill.totalAmount),
          amountPaid: this.toNullableNumber(bill.amountPaid),
          amountPending: this.toNullableNumber(bill.amountPending),
          status: this.toString(bill.status) ?? "pending",
          remarks: this.toString(bill.remarks),
          createdBy: this.toString(bill.createdBy),
          sourceCreatedAt: this.toNullableDate(bill.createdAt),
          sourceUpdatedAt: this.toNullableDate(bill.updatedAt),
          sourcePayload: bill as Prisma.InputJsonValue,
        },
        create: {
          externalId,
          billNumber: this.toString(bill.billNumber) ?? externalId,
          vendorBillNumber: this.toString(bill.vendorBillNumber),
          billDate: this.toDate(bill.billDate),
          dueDate: this.toDate(bill.dueDate),
          vendorExternalId: this.toString(bill.vendorId),
          vendorName: this.toString(bill.vendorName) ?? "Unknown Vendor",
          purchaseOrderExternalId: this.toString(bill.purchaseOrderId),
          poNumber: this.toString(bill.poNumber),
          subtotal: this.toNullableNumber(bill.subtotal),
          taxRate: this.toNullableNumber(bill.taxRate),
          taxAmount: this.toNullableNumber(bill.taxAmount),
          totalAmount: this.toNullableNumber(bill.totalAmount),
          amountPaid: this.toNullableNumber(bill.amountPaid),
          amountPending: this.toNullableNumber(bill.amountPending),
          status: this.toString(bill.status) ?? "pending",
          remarks: this.toString(bill.remarks),
          createdBy: this.toString(bill.createdBy),
          sourceCreatedAt: this.toNullableDate(bill.createdAt),
          sourceUpdatedAt: this.toNullableDate(bill.updatedAt),
          sourcePayload: bill as Prisma.InputJsonValue,
        },
      });

      const items = this.toArrayOfObjects(bill.items) ?? [];
      await tx.procurementVendorBillItem.deleteMany({
        where: {
          vendorBillId: record.id,
        },
      });

      if (items.length > 0) {
        await tx.procurementVendorBillItem.createMany({
          data: items.map((item) => ({
            vendorBillId: record.id,
            sourceItemId: this.toString(item.id),
            purchaseItemExternalId: this.toString(item.purchaseItemId),
            itemName: this.toString(item.itemName) ?? "Unnamed Item",
            quantity: this.toNumber(item.quantity),
            unit: this.toString(item.unit) ?? "unit",
            ratePerUnit: this.toNumber(item.ratePerUnit),
            amount: this.toNumber(item.amount),
            sourcePayload: item as Prisma.InputJsonValue,
          })),
        });
      }

      const payments = this.toArrayOfObjects(bill.paymentHistory) ?? [];
      await tx.procurementVendorPayment.deleteMany({
        where: {
          vendorBillId: record.id,
        },
      });

      if (payments.length > 0) {
        await tx.procurementVendorPayment.createMany({
          data: payments.map((payment) => ({
            vendorBillId: record.id,
            sourcePaymentId: this.toString(payment.id),
            voucherNumber: this.toString(payment.voucherNumber),
            paymentDate: this.toDate(payment.paymentDate),
            vendorExternalId: this.toString(payment.vendorId ?? bill.vendorId),
            vendorName: this.toString(payment.vendorName ?? bill.vendorName) ?? "Unknown Vendor",
            amount: this.toNumber(payment.amount),
            paymentMethod: this.toString(payment.paymentMethod) ?? "cash",
            paymentReference: this.toString(payment.paymentReference),
            bankName: this.toString(payment.bankName),
            chequeNumber: this.toString(payment.chequeNumber),
            chequeDate: this.toNullableDate(payment.chequeDate),
            approvedBy: this.toString(payment.approvedBy),
            approvedAt: this.toNullableDate(payment.approvedAt),
            remarks: this.toString(payment.remarks),
            paidBy: this.toString(payment.paidBy),
            sourceCreatedAt: this.toNullableDate(payment.createdAt),
            sourcePayload: payment as Prisma.InputJsonValue,
          })),
        });
      }
    }
  }

  private async projectBanquetCuisines(tx: ProjectionTransaction, value: unknown) {
    await this.projectExternalIdCollection(tx, value, "banquetCuisine", (entry) => ({
      code: this.toString(entry.cuisineCode),
      name: this.toString(entry.name ?? entry.cuisineName) ?? "Unnamed Cuisine",
      module: this.toString(entry.module) ?? "banquet",
      status: this.toString(entry.status) ?? "active",
      description: this.toString(entry.description),
      linkedDishesCount: this.toNullableInteger(entry.linkedDishesCount),
      createdBy: this.toString(entry.createdBy),
      updatedBy: this.toString(entry.updatedBy),
      sourceCreatedAt: this.toNullableDate(entry.createdAt),
      sourceUpdatedAt: this.toNullableDate(entry.updatedAt),
      sourcePayload: entry as Prisma.InputJsonValue,
    }));
  }

  private async projectKitchenStations(tx: ProjectionTransaction, value: unknown) {
    await this.projectExternalIdCollection(tx, value, "kitchenStationMaster", (entry) => ({
      code: this.toString(entry.code ?? entry.stationCode),
      name: this.toString(entry.name ?? entry.stationName) ?? "Unnamed Station",
      module: this.toString(entry.module) ?? "banquet",
      productionType: this.toString(entry.productionType),
      linkedStoreExternalId: this.toString(entry.linkedStoreId),
      linkedStoreName: this.toString(entry.linkedStoreName),
      linkedStoreLocation: this.toString(entry.linkedStoreLocation),
      status: this.toString(entry.status) ?? "active",
      description: this.toString(entry.description),
      notes: this.toString(entry.notes),
      linkedDishesCount: this.toNullableInteger(entry.linkedDishesCount),
      linkedRecipesCount: this.toNullableInteger(entry.linkedRecipesCount),
      createdBy: this.toString(entry.createdBy),
      updatedBy: this.toString(entry.updatedBy),
      sourceCreatedAt: this.toNullableDate(entry.createdAt),
      sourceUpdatedAt: this.toNullableDate(entry.updatedAt),
      sourcePayload: entry as Prisma.InputJsonValue,
    }));
  }

  private async projectDishCategories(tx: ProjectionTransaction, value: unknown) {
    await this.projectExternalIdCollection(tx, value, "kitchenDishCategoryMaster", (entry) => ({
      code: this.toString(entry.code ?? entry.categoryCode),
      name: this.toString(entry.name ?? entry.categoryName) ?? "Unnamed Category",
      module: this.toString(entry.module) ?? "banquet",
      status: this.toString(entry.status) ?? "active",
      description: this.toString(entry.description),
      notes: this.toString(entry.notes),
      linkedDishesCount: this.toNullableInteger(entry.linkedDishesCount),
      createdBy: this.toString(entry.createdBy),
      updatedBy: this.toString(entry.updatedBy),
      sourceCreatedAt: this.toNullableDate(entry.createdAt),
      sourceUpdatedAt: this.toNullableDate(entry.updatedAt),
      sourcePayload: entry as Prisma.InputJsonValue,
    }));
  }

  private async projectMeasurementUnits(tx: ProjectionTransaction, value: unknown) {
    await this.projectExternalIdCollection(tx, value, "measurementUnitMaster", (entry) => ({
      code: this.toString(entry.code) ?? "UNIT",
      name: this.toString(entry.name) ?? "Unnamed Unit",
      symbol: this.toString(entry.symbol) ?? this.toString(entry.code) ?? "unit",
      family: this.toString(entry.family) ?? "general",
      baseUnitCode: this.toString(entry.baseUnitCode),
      conversionToBase: this.toNullableNumber(entry.conversionToBase),
      allowPurchase: this.toBoolean(entry.allowPurchase),
      allowIssue: this.toBoolean(entry.allowIssue),
      allowRecipe: this.toBoolean(entry.allowRecipe),
      allowYield: this.toBoolean(entry.allowYield),
      allowSales: this.toBoolean(entry.allowSales),
      status: this.toString(entry.status) ?? "active",
      notes: this.toString(entry.notes),
      createdBy: this.toString(entry.createdBy),
      sourceCreatedAt: this.toNullableDate(entry.createdAt),
      sourceUpdatedAt: this.toNullableDate(entry.updatedAt),
      sourcePayload: entry as Prisma.InputJsonValue,
    }));
  }

  private async projectKitchenStores(tx: ProjectionTransaction, value: unknown) {
    await this.projectExternalIdCollection(tx, value, "kitchenStoreMaster", (entry) => ({
      code: this.toString(entry.code) ?? "STORE",
      name: this.toString(entry.name) ?? "Unnamed Store",
      kind: this.toString(entry.kind) ?? "inventory",
      purpose: this.toString(entry.purpose) ?? "general",
      parentStoreId: this.toString(entry.parentStoreId),
      status: this.toString(entry.status) ?? "active",
      notes: this.toString(entry.notes),
      createdBy: this.toString(entry.createdBy),
      sourceCreatedAt: this.toNullableDate(entry.createdAt),
      sourceUpdatedAt: this.toNullableDate(entry.updatedAt),
      sourcePayload: entry as Prisma.InputJsonValue,
    }));
  }

  private async projectBanquetDishes(tx: ProjectionTransaction, value: unknown) {
    await this.projectExternalIdCollection(tx, value, "banquetDish", (entry) => ({
      dishCode: this.toString(entry.dishCode),
      dishName: this.toString(entry.dishName) ?? "Unnamed Dish",
      cuisineExternalId: this.toString(entry.cuisineId),
      cuisineName: this.toString(entry.cuisineName),
      categoryExternalId: this.toString(entry.categoryId),
      category: this.toString(entry.category),
      module: this.toString(entry.module) ?? "banquet",
      kitchenStationExternalId: this.toString(entry.kitchenStationId),
      preparationArea: this.toString(entry.preparationArea),
      sourceType: this.toString(entry.sourceType),
      productionType: this.toString(entry.productionType),
      issuedFrom: this.toString(entry.issuedFrom),
      unitOfSale: this.toString(entry.unitOfSale),
      status: this.toString(entry.status) ?? "draft",
      description: this.toString(entry.description),
      hasRecipe: this.toBoolean(entry.hasRecipe),
      recipeExternalId: this.toString(entry.recipeId),
      estimatedCost: this.toNullableNumber(entry.estimatedCost),
      costPerBaseUnit: this.toNullableNumber(entry.costPerBaseUnit),
      sellingPrice: this.toNullableNumber(entry.sellingPrice),
      recipeCost: this.toNullableNumber(entry.recipeCost),
      defaultVariantCost: this.toNullableNumber(entry.defaultVariantCost),
      defaultSellingPrice: this.toNullableNumber(entry.defaultSellingPrice),
      foodCostPercentage: this.toNullableNumber(entry.foodCostPercentage),
      grossMargin: this.toNullableNumber(entry.grossMargin),
      createdBy: this.toString(entry.createdBy),
      updatedBy: this.toString(entry.updatedBy),
      approvedBy: this.toString(entry.approvedBy),
      approvedAt: this.toNullableDate(entry.approvedAt),
      sourceCreatedAt: this.toNullableDate(entry.createdAt),
      sourceUpdatedAt: this.toNullableDate(entry.updatedAt),
      sourcePayload: entry as Prisma.InputJsonValue,
    }));
  }

  private async projectBanquetRecipes(tx: ProjectionTransaction, value: unknown) {
    const recipes = this.toArrayOfObjects(value);
    const delegate: any = (tx as any).banquetRecipe;
    if (!recipes || recipes.length === 0) {
      await delegate.deleteMany({});
      return;
    }

    const externalIds = recipes.map((recipe) => this.toString(recipe.id)).filter(Boolean) as string[];
    await delegate.deleteMany({ where: { externalId: { notIn: externalIds } } });

    for (const recipe of recipes) {
      const externalId = this.toString(recipe.id);
      if (!externalId) {
        continue;
      }

      const record = await delegate.upsert({
        where: { externalId },
        update: this.buildRecipeData(recipe),
        create: { externalId, ...this.buildRecipeData(recipe) },
      });

      const ingredients = this.toArrayOfObjects(recipe.ingredients) ?? [];
      await tx.banquetRecipeIngredient.deleteMany({ where: { recipeId: record.id } });
      if (ingredients.length > 0) {
        await tx.banquetRecipeIngredient.createMany({
          data: ingredients.map((ingredient) => ({
            recipeId: record.id,
            sourceIngredientId: this.toString(ingredient.id),
            purchaseItemExternalId: this.toString(ingredient.purchaseItemId ?? ingredient.itemId),
            purchaseItemName:
              this.toString(ingredient.purchaseItemName ?? ingredient.itemName) ?? "Unnamed Ingredient",
            categoryExternalId: this.toString(ingredient.categoryId),
            categoryName: this.toString(ingredient.categoryName),
            entryQuantity: this.toNullableNumber(ingredient.entryQuantity),
            entryUnitExternalId: this.toString(ingredient.entryUnitId),
            requiredQuantity: this.toNullableNumber(ingredient.requiredQuantity),
            quantity: this.toNumber(ingredient.quantity),
            baseQuantity: this.toNullableNumber(ingredient.baseQuantity),
            baseUnitExternalId: this.toString(ingredient.baseUnitId),
            unit: this.toString(ingredient.unit) ?? "unit",
            lastPurchaseRate: this.toNullableNumber(ingredient.lastPurchaseRate),
            lastPurchaseUnit: this.toString(ingredient.lastPurchaseUnit),
            unitCost: this.toNullableNumber(ingredient.unitCost),
            costPerUnit: this.toNumber(ingredient.costPerUnit),
            wastagePercentage: this.toNullableNumber(ingredient.wastagePercentage),
            netQuantity: this.toNullableNumber(ingredient.netQuantity),
            totalCost: this.toNumber(ingredient.totalCost),
            sourcePayload: ingredient as Prisma.InputJsonValue,
          })),
        });
      }

      const costLines = this.toArrayOfObjects(recipe.additionalCostLines) ?? [];
      await tx.banquetRecipeCostLine.deleteMany({ where: { recipeId: record.id } });
      if (costLines.length > 0) {
        await tx.banquetRecipeCostLine.createMany({
          data: costLines.map((line) => ({
            recipeId: record.id,
            sourceLineId: this.toString(line.id),
            category: this.toString(line.category) ?? "labor",
            name: this.toString(line.name) ?? "Cost Line",
            calculationBasis: this.toString(line.calculationBasis) ?? "fixed",
            rate: this.toNumber(line.rate),
            quantity: this.toNullableNumber(line.quantity),
            capacityQuantity: this.toNullableNumber(line.capacityQuantity),
            unit: this.toString(line.unit),
            ingredientReferenceId: this.toString(line.ingredientReferenceId),
            totalCost: this.toNumber(line.totalCost),
            sourcePayload: line as Prisma.InputJsonValue,
          })),
        });
      }
    }
  }

  private buildRecipeData(recipe: Record<string, unknown>) {
    return {
      dishExternalId: this.toString(recipe.dishId) ?? "unlinked",
      recipeCode: this.toString(recipe.recipeCode),
      recipeName: this.toString(recipe.recipeName),
      recipeType: this.toString(recipe.recipeType),
      outputItemExternalId: this.toString(recipe.outputItemId),
      outputItemName: this.toString(recipe.outputItemName),
      recipeCategoryExternalId: this.toString(recipe.recipeCategoryId),
      kitchenSectionExternalId: this.toString(recipe.kitchenSectionId),
      status: this.toString(recipe.status) ?? "active",
      preparationSteps: this.toString(recipe.preparationSteps),
      preparationTimeMinutes: this.toNullableInteger(recipe.preparationTimeMinutes ?? recipe.preparationTime),
      yieldQuantity: this.toNullableNumber(recipe.yieldQuantity ?? recipe.yields),
      yieldUnit: this.toString(recipe.yieldUnit),
      yieldUnitExternalId: this.toString(recipe.yieldUnitId),
      targetYieldQuantity: this.toNullableNumber(recipe.targetYieldQuantity),
      targetYieldUnitExternalId: this.toString(recipe.targetYieldUnitId),
      expectedWastagePercentage: this.toNullableNumber(recipe.expectedWastagePercentage),
      expectedYieldPercentage: this.toNullableNumber(recipe.expectedYieldPercentage),
      totalIngredientCost: this.toNullableNumber(recipe.totalIngredientCost),
      wastageCost: this.toNullableNumber(recipe.wastageCost),
      laborCost: this.toNullableNumber(recipe.laborCost),
      utilitiesCost: this.toNullableNumber(recipe.utilitiesCost),
      additionalCost: this.toNullableNumber(recipe.additionalCost),
      totalRecipeCost: this.toNullableNumber(recipe.totalRecipeCost),
      totalProductionCost: this.toNullableNumber(recipe.totalProductionCost),
      totalCost: this.toNumber(recipe.totalCost),
      costPerPortion: this.toNullableNumber(recipe.costPerPortion),
      costPerYieldUnit: this.toNullableNumber(recipe.costPerYieldUnit),
      supplyMarginPerYieldUnit: this.toNullableNumber(recipe.supplyMarginPerYieldUnit),
      supplySellingPricePerYieldUnit: this.toNullableNumber(recipe.supplySellingPricePerYieldUnit),
      supplyFoodCostPercentage: this.toNullableNumber(recipe.supplyFoodCostPercentage),
      suggestedSellingPrice: this.toNullableNumber(recipe.suggestedSellingPrice),
      foodCostPercentage: this.toNullableNumber(recipe.foodCostPercentage),
      createdBy: this.toString(recipe.createdBy),
      sourceCreatedAt: this.toNullableDate(recipe.createdAt),
      sourceUpdatedAt: this.toNullableDate(recipe.updatedAt),
      sourcePayload: recipe as Prisma.InputJsonValue,
    };
  }

  private async projectBanquetMenuPackageTypes(tx: ProjectionTransaction, value: unknown) {
    await this.projectExternalIdCollection(tx, value, "banquetMenuPackageType", (entry) => ({
      code: this.toString(entry.code) ?? "TYPE",
      name: this.toString(entry.name) ?? "Unnamed Type",
      status: this.toString(entry.status) ?? "active",
      notes: this.toString(entry.notes),
      displayOrder: this.toNullableInteger(entry.displayOrder),
      createdBy: this.toString(entry.createdBy),
      sourceCreatedAt: this.toNullableDate(entry.createdAt),
      sourceUpdatedAt: this.toNullableDate(entry.updatedAt),
      sourcePayload: entry as Prisma.InputJsonValue,
    }));
  }

  private async projectBanquetMenuPackages(tx: ProjectionTransaction, value: unknown) {
    const packages = this.toArrayOfObjects(value);
    const delegate: any = (tx as any).banquetMenuPackage;
    if (!packages || packages.length === 0) {
      await delegate.deleteMany({});
      return;
    }

    const externalIds = packages.map((entry) => this.toString(entry.id)).filter(Boolean) as string[];
    await delegate.deleteMany({ where: { externalId: { notIn: externalIds } } });

    for (const entry of packages) {
      const externalId = this.toString(entry.id);
      if (!externalId) {
        continue;
      }

      const record = await delegate.upsert({
        where: { externalId },
        update: this.buildMenuPackageData(entry),
        create: { externalId, ...this.buildMenuPackageData(entry) },
      });

      const dishes = this.toArrayOfObjects(entry.dishes) ?? [];
      await tx.banquetMenuPackageDish.deleteMany({ where: { packageId: record.id } });
      if (dishes.length > 0) {
        await tx.banquetMenuPackageDish.createMany({
          data: dishes.map((dish) => ({
            packageId: record.id,
            sourceDishId: this.toString(dish.dishId),
            dishExternalId: this.toString(dish.dishId),
            dishName: this.toString(dish.dishName) ?? "Unnamed Dish",
            preparationArea: this.toString(dish.preparationArea),
            variantExternalId: this.toString(dish.variantId),
            variantLabel: this.toString(dish.variantLabel),
            sourceType: this.toString(dish.sourceType),
            quantityPerHead: this.toNumber(dish.quantityPerHead),
            unit: this.toString(dish.unit) ?? "unit",
            costPerHead: this.toNumber(dish.costPerHead),
            isFromRestaurant: this.toBoolean(dish.isFromRestaurant),
            sourcePayload: dish as Prisma.InputJsonValue,
          })),
        });
      }

      const choiceGroups = this.toArrayOfObjects(entry.choiceGroups) ?? [];
      await tx.banquetMenuPackageChoiceGroup.deleteMany({ where: { packageId: record.id } });
      if (choiceGroups.length > 0) {
        await tx.banquetMenuPackageChoiceGroup.createMany({
          data: choiceGroups.map((group) => ({
            packageId: record.id,
            sourceGroupId: this.toString(group.id),
            groupName: this.toString(group.groupName) ?? "Choice Group",
            minSelect: this.toNullableInteger(group.minSelect) ?? 0,
            maxSelect: this.toNullableInteger(group.maxSelect) ?? 0,
            required: this.toBoolean(group.required),
            costingMethod: this.toString(group.costingMethod) ?? "highest-cost",
            defaultDishId: this.toString(group.defaultDishId),
            sourcePayload: group as Prisma.InputJsonValue,
          })),
        });
      }
    }
  }

  private buildMenuPackageData(entry: Record<string, unknown>) {
    return {
      packageName: this.toString(entry.packageName) ?? "Unnamed Package",
      packageType: this.toString(entry.packageType) ?? "standard",
      module: this.toString(entry.module) ?? "banquet",
      minimumGuests: this.toNullableInteger(entry.minimumGuests) ?? 0,
      maximumGuests: this.toNullableInteger(entry.maximumGuests),
      totalCostPerHead: this.toNumber(entry.totalCostPerHead),
      sellingPricePerHead: this.toNumber(entry.sellingPricePerHead),
      status: this.toString(entry.status) ?? "draft",
      description: this.toString(entry.description),
      createdBy: this.toString(entry.createdBy),
      sourceCreatedAt: this.toNullableDate(entry.createdAt),
      sourceUpdatedAt: this.toNullableDate(entry.updatedAt),
      sourcePayload: entry as Prisma.InputJsonValue,
    };
  }

  private async projectCentralKitchenEstimates(tx: ProjectionTransaction, value: unknown) {
    const estimates = this.toArrayOfObjects(value);
    const delegate: any = (tx as any).centralKitchenEstimate;
    if (!estimates || estimates.length === 0) {
      await delegate.deleteMany({});
      return;
    }

    const keys = estimates
      .map((entry) => this.buildEstimateExternalKey(entry))
      .filter(Boolean) as string[];
    await delegate.deleteMany({ where: { externalKey: { notIn: keys } } });

    for (const entry of estimates) {
      const externalKey = this.buildEstimateExternalKey(entry);
      if (!externalKey) {
        continue;
      }

      const record = await delegate.upsert({
        where: { externalKey },
        update: {
          bookingExternalId: this.toString(entry.bookingId) ?? "unknown",
          dateKey: this.toString(entry.dateKey) ?? "unknown",
          status: this.toString(entry.status) ?? "draft",
          guestCountSnapshot: this.toNullableInteger(entry.guestCountSnapshot),
          menuSignature: this.toString(entry.menuSignature),
          foodSuppliesSignature: this.toString(entry.foodSuppliesSignature),
          savedAt: this.toNullableDate(entry.savedAt),
          approvedAt: this.toNullableDate(entry.approvedAt),
          approvedBy: this.toString(entry.approvedBy),
          managementAlertSentAt: this.toNullableDate(entry.managementAlertSentAt),
          sourcePayload: entry as Prisma.InputJsonValue,
        },
        create: {
          externalKey,
          bookingExternalId: this.toString(entry.bookingId) ?? "unknown",
          dateKey: this.toString(entry.dateKey) ?? "unknown",
          status: this.toString(entry.status) ?? "draft",
          guestCountSnapshot: this.toNullableInteger(entry.guestCountSnapshot),
          menuSignature: this.toString(entry.menuSignature),
          foodSuppliesSignature: this.toString(entry.foodSuppliesSignature),
          savedAt: this.toNullableDate(entry.savedAt),
          approvedAt: this.toNullableDate(entry.approvedAt),
          approvedBy: this.toString(entry.approvedBy),
          managementAlertSentAt: this.toNullableDate(entry.managementAlertSentAt),
          sourcePayload: entry as Prisma.InputJsonValue,
        },
      });

      const lines = this.toArrayOfObjects(entry.lines) ?? [];
      await tx.centralKitchenEstimateLine.deleteMany({ where: { estimateId: record.id } });
      if (lines.length > 0) {
        await tx.centralKitchenEstimateLine.createMany({
          data: lines.map((line) => ({
            estimateId: record.id,
            lineExternalId: this.toString(line.lineId) ?? "line",
            estimateFactor: this.toNumber(line.estimateFactor),
            wastagePercent: this.toNumber(line.wastagePercent),
            sellingPriceAllocation: this.toNumber(line.sellingPriceAllocation),
            factorMode: this.toString(line.factorMode) ?? "per-pax",
            notes: this.toString(line.notes),
            sourcePayload: line as Prisma.InputJsonValue,
          })),
        });
      }
    }
  }

  private async projectCentralKitchenCorrectionRequests(tx: ProjectionTransaction, value: unknown) {
    await this.projectExternalIdCollection(tx, value, "centralKitchenCorrectionRequest", (entry) => ({
      bookingExternalId: this.toString(entry.bookingId) ?? "unknown",
      dateKey: this.toString(entry.dateKey) ?? "unknown",
      reservationNumber: this.toString(entry.reservationNumber),
      eventLabel: this.toString(entry.eventLabel),
      lineExternalId: this.toString(entry.lineId),
      menuItemName: this.toString(entry.menuItemName),
      reason: this.toString(entry.reason) ?? "Correction requested",
      notes: this.toString(entry.notes),
      status: this.toString(entry.status) ?? "sent",
      requestedBy: this.toString(entry.requestedBy),
      sourceCreatedAt: this.toNullableDate(entry.createdAt),
      sourcePayload: entry as Prisma.InputJsonValue,
    }));
  }

  private async projectCentralKitchenBackupPlans(tx: ProjectionTransaction, value: unknown) {
    await this.projectExternalIdCollection(tx, value, "centralKitchenBackupPlan", (entry) => ({
      bookingExternalId: this.toString(entry.bookingId) ?? "unknown",
      dateKey: this.toString(entry.dateKey) ?? "unknown",
      itemName: this.toString(entry.itemName) ?? "Backup Item",
      reason: this.toString(entry.reason) ?? "Backup",
      estimateFactor: this.toNumber(entry.estimateFactor),
      wastagePercent: this.toNumber(entry.wastagePercent),
      unitOfMeasure: this.toString(entry.unitOfMeasure) ?? "unit",
      costPerUnit: this.toNumber(entry.costPerUnit),
      notes: this.toString(entry.notes),
      createdBy: this.toString(entry.createdBy),
      sourceCreatedAt: this.toNullableDate(entry.createdAt),
      sourcePayload: entry as Prisma.InputJsonValue,
    }));
  }

  private async projectCentralKitchenRequisitions(tx: ProjectionTransaction, value: unknown) {
    await this.projectDocumentWithLines(tx, value, "centralKitchenRequisition", "centralKitchenRequisitionLine", "requisitionId", (entry) => ({
      requisitionNumber: this.toString(entry.requisitionNumber) ?? "CKR",
      bookingExternalId: this.toString(entry.bookingId) ?? "unknown",
      reservationNumber: this.toString(entry.reservationNumber),
      customerName: this.toString(entry.customerName) ?? "Unknown Customer",
      eventDate: this.toDate(entry.eventDate),
      venueName: this.toString(entry.venueName),
      primeSpaceName: this.toString(entry.primeSpaceName),
      subSpaceName: this.toString(entry.subSpaceName),
      status: this.toString(entry.status) ?? "draft",
      remarks: this.toString(entry.remarks),
      createdBy: this.toString(entry.createdBy),
      approvedBy: this.toString(entry.approvedBy),
      approvedAt: this.toNullableDate(entry.approvedAt),
      sourceCreatedAt: this.toNullableDate(entry.createdAt),
      sourcePayload: entry as Prisma.InputJsonValue,
    }), (line) => ({
      purchaseItemExternalId: this.toString(line.purchaseItemId),
      itemName: this.toString(line.itemName) ?? "Unnamed Item",
      sourceStore: this.toString(line.sourceStore),
      unit: this.toString(line.unit) ?? "unit",
      requiredQuantity: this.toNumber(line.requiredQuantity),
      linkedMenuItems: this.toJsonValue(line.linkedMenuItems),
      sourcePayload: line as Prisma.InputJsonValue,
    }));
  }

  private async projectCentralKitchenDispatchPlans(tx: ProjectionTransaction, value: unknown) {
    await this.projectDocumentWithLines(tx, value, "centralKitchenDispatchPlan", "centralKitchenDispatchLine", "dispatchPlanId", (entry) => ({
      dispatchNumber: this.toString(entry.dispatchNumber) ?? "CKD",
      bookingExternalId: this.toString(entry.bookingId) ?? "unknown",
      reservationNumber: this.toString(entry.reservationNumber),
      customerName: this.toString(entry.customerName) ?? "Unknown Customer",
      eventDate: this.toDate(entry.eventDate),
      eventTime: this.toString(entry.eventTime),
      venueName: this.toString(entry.venueName),
      primeSpaceName: this.toString(entry.primeSpaceName),
      subSpaceName: this.toString(entry.subSpaceName),
      status: this.toString(entry.status) ?? "planned",
      remarks: this.toString(entry.remarks),
      createdBy: this.toString(entry.createdBy),
      approvedBy: this.toString(entry.approvedBy),
      approvedAt: this.toNullableDate(entry.approvedAt),
      sourceCreatedAt: this.toNullableDate(entry.createdAt),
      sourcePayload: entry as Prisma.InputJsonValue,
    }), (line) => ({
      dishExternalId: this.toString(line.dishId),
      menuItemName: this.toString(line.menuItemName) ?? "Menu Item",
      section: this.toString(line.section) ?? "Other",
      quantity: this.toNumber(line.quantity),
      unit: this.toString(line.unit) ?? "unit",
      dispatchTo: this.toString(line.dispatchTo) ?? "Kitchen",
      notes: this.toString(line.notes),
      sourcePayload: line as Prisma.InputJsonValue,
    }));
  }

  private async projectKitchenIssueSheets(tx: ProjectionTransaction, value: unknown) {
    await this.projectDocumentWithLines(tx, value, "kitchenIssueSheet", "kitchenIssueSheetItem", "issueSheetId", (entry) => ({
      issueNumber: this.toString(entry.issueNumber) ?? "KIS",
      module: this.toString(entry.module) ?? "banquet",
      bookingExternalId: this.toString(entry.bookingId) ?? "unknown",
      customerName: this.toString(entry.customerName) ?? "Unknown Customer",
      eventType: this.toString(entry.eventType),
      venueName: this.toString(entry.venueName),
      eventDate: this.toDate(entry.eventDate),
      eventTime: this.toString(entry.eventTime),
      guestCount: this.toNullableInteger(entry.guestCount) ?? 0,
      packageExternalId: this.toString(entry.packageId),
      packageName: this.toString(entry.packageName),
      status: this.toString(entry.status) ?? "issued",
      remarks: this.toString(entry.remarks),
      createdBy: this.toString(entry.createdBy),
      sourceCreatedAt: this.toNullableDate(entry.createdAt),
      sourceUpdatedAt: this.toNullableDate(entry.updatedAt),
      sourcePayload: entry as Prisma.InputJsonValue,
    }), (line) => ({
      purchaseItemExternalId: this.toString(line.purchaseItemId),
      itemName: this.toString(line.itemName) ?? "Unnamed Item",
      sourceStore: this.toString(line.sourceStore) ?? "store",
      unit: this.toString(line.unit) ?? "unit",
      requiredQuantity: this.toNumber(line.requiredQuantity),
      issuedQuantity: this.toNumber(line.issuedQuantity),
      shortageQuantity: this.toNumber(line.shortageQuantity),
      availableQuantity: this.toNumber(line.availableQuantity),
      linkedDishes: this.toJsonValue(line.linkedDishes),
      sourcePayload: line as Prisma.InputJsonValue,
    }), "lineItems");
  }

  private async projectCustomerInvoices(tx: ProjectionTransaction, value: unknown) {
    const invoices = this.toArrayOfObjects(value);
    const delegate: any = (tx as any).customerInvoice;
    if (!invoices || invoices.length === 0) {
      await delegate.deleteMany({});
      return;
    }

    const externalIds = invoices.map((entry) => this.toString(entry.id)).filter(Boolean) as string[];
    await delegate.deleteMany({ where: { externalId: { notIn: externalIds } } });

    for (const entry of invoices) {
      const externalId = this.toString(entry.id);
      if (!externalId) {
        continue;
      }

      const record = await delegate.upsert({
        where: { externalId },
        update: this.buildCustomerInvoiceData(entry),
        create: { externalId, ...this.buildCustomerInvoiceData(entry) },
      });

      const items = this.toArrayOfObjects(entry.items) ?? [];
      await tx.customerInvoiceItem.deleteMany({ where: { invoiceId: record.id } });
      if (items.length > 0) {
        await tx.customerInvoiceItem.createMany({
          data: items.map((item) => ({
            invoiceId: record.id,
            sourceItemId: this.toString(item.id),
            description: this.toString(item.description) ?? "Invoice Item",
            itemType: this.toString(item.itemType) ?? "other",
            quantity: this.toNumber(item.quantity),
            unit: this.toString(item.unit) ?? "unit",
            ratePerUnit: this.toNumber(item.ratePerUnit),
            amount: this.toNumber(item.amount),
            taxable: this.toBoolean(item.taxable),
            sourcePayload: item as Prisma.InputJsonValue,
          })),
        });
      }

      const receipts = this.toArrayOfObjects(entry.paymentHistory) ?? [];
      await tx.customerPaymentReceipt.deleteMany({ where: { invoiceId: record.id } });
      if (receipts.length > 0) {
        await tx.customerPaymentReceipt.createMany({
          data: receipts.map((receipt) => ({
            invoiceId: record.id,
            sourceReceiptId: this.toString(receipt.id),
            receiptNumber: this.toString(receipt.receiptNumber),
            receiptDate: this.toDate(receipt.receiptDate),
            customerName: this.toString(receipt.customerName ?? entry.customerName) ?? "Unknown Customer",
            amount: this.toNumber(receipt.amount),
            paymentMethod: this.toString(receipt.paymentMethod) ?? "cash",
            paymentReference: this.toString(receipt.paymentReference),
            bankName: this.toString(receipt.bankName),
            reconciled: this.toBoolean(receipt.reconciled),
            reconciledDate: this.toNullableDate(receipt.reconciledDate),
            reconciledBy: this.toString(receipt.reconciledBy),
            remarks: this.toString(receipt.remarks),
            receivedBy: this.toString(receipt.receivedBy),
            sourceCreatedAt: this.toNullableDate(receipt.createdAt),
            sourcePayload: receipt as Prisma.InputJsonValue,
          })),
        });
      }
    }
  }

  private buildCustomerInvoiceData(entry: Record<string, unknown>) {
    return {
      invoiceNumber: this.toString(entry.invoiceNumber) ?? "INV",
      invoiceDate: this.toDate(entry.invoiceDate),
      dueDate: this.toDate(entry.dueDate),
      bookingExternalId: this.toString(entry.bookingId),
      customerName: this.toString(entry.customerName) ?? "Unknown Customer",
      customerPhone: this.toString(entry.customerPhone),
      customerEmail: this.toString(entry.customerEmail),
      eventDate: this.toNullableDate(entry.eventDate),
      venueName: this.toString(entry.venueName),
      subtotal: this.toNumber(entry.subtotal),
      taxRate: this.toNumber(entry.taxRate),
      taxAmount: this.toNumber(entry.taxAmount),
      discount: this.toNumber(entry.discount),
      discountReason: this.toString(entry.discountReason),
      totalAmount: this.toNumber(entry.totalAmount),
      amountPaid: this.toNumber(entry.amountPaid),
      amountPending: this.toNumber(entry.amountPending),
      status: this.toString(entry.status) ?? "draft",
      remarks: this.toString(entry.remarks),
      termsAndConditions: this.toString(entry.termsAndConditions),
      createdBy: this.toString(entry.createdBy),
      sentAt: this.toNullableDate(entry.sentAt),
      sourceCreatedAt: this.toNullableDate(entry.createdAt),
      sourceUpdatedAt: this.toNullableDate(entry.updatedAt),
      sourcePayload: entry as Prisma.InputJsonValue,
    };
  }

  private async projectGeneralExpenses(tx: ProjectionTransaction, value: unknown) {
    await this.projectExternalIdCollection(tx, value, "generalExpenseRecord", (entry) => ({
      expenseNumber: this.toString(entry.expenseNumber) ?? "EXP",
      expenseDate: this.toDate(entry.expenseDate),
      category: this.toString(entry.category) ?? "miscellaneous",
      description: this.toString(entry.description) ?? "Expense",
      amount: this.toNumber(entry.amount),
      paymentMethod: this.toString(entry.paymentMethod) ?? "cash",
      paymentReference: this.toString(entry.paymentReference),
      approvedBy: this.toString(entry.approvedBy),
      approvedAt: this.toNullableDate(entry.approvedAt),
      remarks: this.toString(entry.remarks),
      createdBy: this.toString(entry.createdBy),
      sourceCreatedAt: this.toNullableDate(entry.createdAt),
      sourcePayload: entry as Prisma.InputJsonValue,
    }));
  }

  private async projectChartOfAccounts(tx: ProjectionTransaction, value: unknown) {
    await this.projectExternalIdCollection(tx, value, "chartAccountRecord", (entry) => ({
      code: this.toString(entry.code) ?? "0000",
      name: this.toString(entry.name) ?? "Unnamed Account",
      type: this.toString(entry.type) ?? "Asset",
      category: this.toString(entry.category) ?? "General",
      normalBalance: this.toString(entry.normalBalance) ?? "Debit",
      statement: this.toString(entry.statement) ?? "Balance Sheet",
      isActive: this.toBoolean(entry.isActive, true),
      systemControlled: this.toBoolean(entry.systemControlled),
      description: this.toString(entry.description),
      sourcePayload: entry as Prisma.InputJsonValue,
    }));
  }

  private async projectAccountingPostingRules(tx: ProjectionTransaction, value: unknown) {
    await this.projectExternalIdCollection(tx, value, "accountingPostingRuleRecord", (entry) => ({
      eventType: this.toString(entry.eventType) ?? "manual",
      label: this.toString(entry.label) ?? "Posting Rule",
      module: this.toString(entry.module) ?? "Accounts",
      debitAccountCode: this.toString(entry.debitAccountCode) ?? "0000",
      creditAccountCode: this.toString(entry.creditAccountCode) ?? "0000",
      dimensionSource: this.toString(entry.dimensionSource) ?? "manual",
      timing: this.toString(entry.timing) ?? "on-save",
      isActive: this.toBoolean(entry.isActive, true),
      sourcePayload: entry as Prisma.InputJsonValue,
    }));
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

  private async projectDocumentWithLines(
    tx: ProjectionTransaction,
    value: unknown,
    documentDelegateName: string,
    lineDelegateName: string,
    lineForeignKey: string,
    mapDocument: (entry: Record<string, unknown>) => Record<string, unknown>,
    mapLine: (entry: Record<string, unknown>) => Record<string, unknown>,
    lineItemsKey = "lineItems",
  ) {
    const documents = this.toArrayOfObjects(value);
    const documentDelegate: any = (tx as any)[documentDelegateName];
    const lineDelegate: any = (tx as any)[lineDelegateName];

    if (!documents || documents.length === 0) {
      await documentDelegate.deleteMany({});
      return;
    }

    const externalIds = documents.map((entry) => this.toString(entry.id)).filter(Boolean) as string[];
    await documentDelegate.deleteMany({
      where: {
        externalId: {
          notIn: externalIds,
        },
      },
    });

    for (const entry of documents) {
      const externalId = this.toString(entry.id);
      if (!externalId) {
        continue;
      }

      const document = await documentDelegate.upsert({
        where: {
          externalId,
        },
        update: mapDocument(entry),
        create: {
          externalId,
          ...mapDocument(entry),
        },
      });

      await lineDelegate.deleteMany({
        where: {
          [lineForeignKey]: document.id,
        },
      });

      const lines = this.toArrayOfObjects(entry[lineItemsKey]) ?? [];
      if (lines.length > 0) {
        await lineDelegate.createMany({
          data: lines.map((line) => ({
            [lineForeignKey]: document.id,
            ...mapLine(line),
          })),
        });
      }
    }
  }

  private buildEstimateExternalKey(entry: Record<string, unknown>) {
    const bookingId = this.toString(entry.bookingId);
    const dateKey = this.toString(entry.dateKey);

    if (!bookingId || !dateKey) {
      return null;
    }

    return `${bookingId}::${dateKey}`;
  }

  private buildStoreStockKey(stock: Record<string, unknown>) {
    const storeLocation = this.toString(stock.storeLocation);
    const purchaseItemId = this.toString(stock.purchaseItemId);

    if (!storeLocation || !purchaseItemId) {
      return null;
    }

    return `${storeLocation}::${purchaseItemId}`;
  }

  private getPreferredVendorExternalId(purchaseItem: Record<string, unknown>) {
    return (
      this.toString(purchaseItem.preferredSupplierId) ??
      this.toString(purchaseItem.preferredVendorId) ??
      this.toString(purchaseItem.preferred_vendor)
    );
  }

  private async syncPreferredVendorMappingsFromStoredPurchaseItems(tx: ProjectionTransaction) {
    const purchaseItemState = await tx.masterDataRecord.findUnique({
      where: {
        key: SUPPORTED_WORKFLOW_KEYS.purchaseItems,
      },
    });
    const purchaseItems = this.toArrayOfObjects(purchaseItemState?.value) ?? [];

    for (const purchaseItem of purchaseItems) {
      const externalId = this.toString(purchaseItem.id);
      if (!externalId) {
        continue;
      }

      const itemRecord = await tx.inventoryItem.findUnique({
        where: {
          externalId,
        },
        select: {
          id: true,
        },
      });
      if (!itemRecord) {
        continue;
      }

      await this.syncPreferredVendorMapping(tx, itemRecord, purchaseItem);
    }
  }

  private async syncPreferredVendorMapping(
    tx: ProjectionTransaction,
    itemRecord: { id: string },
    purchaseItem: Record<string, unknown>,
  ) {
    const preferredVendorExternalId = this.getPreferredVendorExternalId(purchaseItem);

    if (!preferredVendorExternalId) {
      await tx.vendorItemMapping.updateMany({
        where: {
          kitchenItemId: itemRecord.id,
          isPreferred: true,
        },
        data: {
          isPreferred: false,
        },
      });
      return;
    }

    const vendorRecord = await tx.procurementVendor.findUnique({
      where: {
        externalId: preferredVendorExternalId,
      },
      select: {
        id: true,
      },
    });

    if (!vendorRecord) {
      return;
    }

    await tx.vendorItemMapping.updateMany({
      where: {
        kitchenItemId: itemRecord.id,
        vendorId: {
          not: vendorRecord.id,
        },
        isPreferred: true,
      },
      data: {
        isPreferred: false,
      },
    });

    await tx.vendorItemMapping.upsert({
      where: {
        vendorId_kitchenItemId: {
          vendorId: vendorRecord.id,
          kitchenItemId: itemRecord.id,
        },
      },
      update: {
        isPreferred: true,
        leadTimeDays: this.toNullableInteger(purchaseItem.leadTimeDays),
        moq: this.toNullableNumber(purchaseItem.minimumOrderQuantity),
        lastRate: this.toNullableNumber(purchaseItem.lastPurchaseRate ?? purchaseItem.defaultPurchaseCost),
        contractRate: this.toNullableNumber(purchaseItem.contractRate),
        status: "active",
      },
      create: {
        vendorId: vendorRecord.id,
        kitchenItemId: itemRecord.id,
        isPreferred: true,
        leadTimeDays: this.toNullableInteger(purchaseItem.leadTimeDays),
        moq: this.toNullableNumber(purchaseItem.minimumOrderQuantity),
        lastRate: this.toNullableNumber(purchaseItem.lastPurchaseRate ?? purchaseItem.defaultPurchaseCost),
        contractRate: this.toNullableNumber(purchaseItem.contractRate),
        status: "active",
        notes: "Auto-created from kitchen item preferred vendor.",
      },
    });
  }

  private async resolveExistingLookupId(
    tx: ProjectionTransaction,
    table: "vendorType" | "supplyCategory" | "purchaseCategory",
    id: string | null,
  ) {
    if (!id) {
      return null;
    }

    const delegate: any =
      table === "vendorType" ? tx.vendorType : table === "supplyCategory" ? tx.supplyCategory : tx.purchaseCategory;
    const record = await delegate.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    return record?.id ?? null;
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
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return null;
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

  private toDate(value: unknown) {
    const parsed = this.toNullableDate(value);
    if (parsed) {
      return parsed;
    }

    this.logger.warn(`Falling back to current timestamp while projecting workflow state`);
    return new Date();
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
