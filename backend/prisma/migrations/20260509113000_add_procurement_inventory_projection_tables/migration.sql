-- CreateTable
CREATE TABLE "ProcurementVendor" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "vendorCode" TEXT,
    "vendorCategories" JSONB,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "paymentTerms" TEXT,
    "creditLimit" DECIMAL(12,2),
    "status" TEXT NOT NULL,
    "taxId" TEXT,
    "inactiveReason" TEXT,
    "inactiveSince" TIMESTAMP(3),
    "pricingFormulas" JSONB,
    "currentBalance" DECIMAL(12,2),
    "totalPurchases" DECIMAL(12,2),
    "lastPurchaseDate" TIMESTAMP(3),
    "createdBy" TEXT,
    "sourceCreatedAt" TIMESTAMP(3),
    "sourceUpdatedAt" TIMESTAMP(3),
    "sourcePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemCode" TEXT,
    "category" TEXT NOT NULL,
    "purchaseUnit" TEXT NOT NULL,
    "issueUnit" TEXT NOT NULL,
    "conversionFactor" DECIMAL(14,4) NOT NULL,
    "storeLocation" TEXT NOT NULL,
    "currentStock" DECIMAL(14,3) NOT NULL,
    "reorderLevel" DECIMAL(14,3) NOT NULL,
    "lastPurchaseRate" DECIMAL(14,4) NOT NULL,
    "ratePerUnit" DECIMAL(14,4),
    "lastPurchaseDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "sourceCreatedAt" TIMESTAMP(3),
    "sourceUpdatedAt" TIMESTAMP(3),
    "sourcePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementPurchaseOrder" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "vendorExternalId" TEXT,
    "vendorName" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "expectedDeliveryDate" TIMESTAMP(3) NOT NULL,
    "paymentTerms" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "subtotal" DECIMAL(14,2),
    "taxAmount" DECIMAL(14,2),
    "totalAmount" DECIMAL(14,2),
    "amountPaid" DECIMAL(14,2),
    "amountPending" DECIMAL(14,2),
    "deliveredDate" TIMESTAMP(3),
    "receivedBy" TEXT,
    "receivedQuantities" JSONB,
    "remarks" TEXT,
    "createdBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sourceCreatedAt" TIMESTAMP(3),
    "sourceUpdatedAt" TIMESTAMP(3),
    "sourcePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementPurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementPurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "sourceItemId" TEXT,
    "purchaseItemExternalId" TEXT,
    "itemName" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "ratePerUnit" DECIMAL(14,4) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "receivedQuantity" DECIMAL(14,3),
    "pendingQuantity" DECIMAL(14,3),
    "sourcePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementPurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementGoodsReceipt" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "purchaseOrderExternalId" TEXT,
    "poNumber" TEXT NOT NULL,
    "vendorExternalId" TEXT,
    "vendorName" TEXT NOT NULL,
    "receiptDate" TIMESTAMP(3) NOT NULL,
    "destinationStore" TEXT NOT NULL,
    "qualityCheckStatus" TEXT NOT NULL,
    "qualityCheckedBy" TEXT,
    "qualityRemarks" TEXT,
    "receivedBy" TEXT,
    "sourceCreatedAt" TIMESTAMP(3),
    "sourcePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementGoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementGoodsReceiptItem" (
    "id" TEXT NOT NULL,
    "goodsReceiptId" TEXT NOT NULL,
    "purchaseItemExternalId" TEXT,
    "itemName" TEXT NOT NULL,
    "orderedQuantity" DECIMAL(14,3) NOT NULL,
    "receivedQuantity" DECIMAL(14,3) NOT NULL,
    "acceptedQuantity" DECIMAL(14,3) NOT NULL,
    "rejectedQuantity" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "ratePerUnit" DECIMAL(14,4) NOT NULL,
    "totalValue" DECIMAL(14,2) NOT NULL,
    "sourcePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementGoodsReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryStoreStock" (
    "id" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "storeLocation" TEXT NOT NULL,
    "purchaseItemExternalId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "currentStock" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "reorderLevel" DECIMAL(14,3) NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "sourcePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryStoreStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryStockTransfer" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL,
    "fromStore" TEXT NOT NULL,
    "toStore" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "issuedBy" TEXT,
    "receivedBy" TEXT,
    "receivedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "sourceCreatedAt" TIMESTAMP(3),
    "sourcePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryStockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryStockTransferItem" (
    "id" TEXT NOT NULL,
    "stockTransferId" TEXT NOT NULL,
    "purchaseItemExternalId" TEXT,
    "itemName" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sourcePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryStockTransferItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementVendorBill" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "vendorBillNumber" TEXT,
    "billDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "vendorExternalId" TEXT,
    "vendorName" TEXT NOT NULL,
    "purchaseOrderExternalId" TEXT,
    "poNumber" TEXT,
    "subtotal" DECIMAL(14,2),
    "taxRate" DECIMAL(8,4),
    "taxAmount" DECIMAL(14,2),
    "totalAmount" DECIMAL(14,2),
    "amountPaid" DECIMAL(14,2),
    "amountPending" DECIMAL(14,2),
    "status" TEXT NOT NULL,
    "remarks" TEXT,
    "createdBy" TEXT,
    "sourceCreatedAt" TIMESTAMP(3),
    "sourceUpdatedAt" TIMESTAMP(3),
    "sourcePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementVendorBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementVendorBillItem" (
    "id" TEXT NOT NULL,
    "vendorBillId" TEXT NOT NULL,
    "sourceItemId" TEXT,
    "purchaseItemExternalId" TEXT,
    "itemName" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "ratePerUnit" DECIMAL(14,4) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "sourcePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementVendorBillItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementVendorPayment" (
    "id" TEXT NOT NULL,
    "vendorBillId" TEXT NOT NULL,
    "sourcePaymentId" TEXT,
    "voucherNumber" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "vendorExternalId" TEXT,
    "vendorName" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentReference" TEXT,
    "bankName" TEXT,
    "chequeNumber" TEXT,
    "chequeDate" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "paidBy" TEXT,
    "sourceCreatedAt" TIMESTAMP(3),
    "sourcePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementVendorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementVendor_externalId_key" ON "ProcurementVendor"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_externalId_key" ON "InventoryItem"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementPurchaseOrder_externalId_key" ON "ProcurementPurchaseOrder"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementPurchaseOrder_poNumber_key" ON "ProcurementPurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "ProcurementPurchaseOrderItem_purchaseOrderId_idx" ON "ProcurementPurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementGoodsReceipt_externalId_key" ON "ProcurementGoodsReceipt"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementGoodsReceipt_grnNumber_key" ON "ProcurementGoodsReceipt"("grnNumber");

-- CreateIndex
CREATE INDEX "ProcurementGoodsReceiptItem_goodsReceiptId_idx" ON "ProcurementGoodsReceiptItem"("goodsReceiptId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryStoreStock_externalKey_key" ON "InventoryStoreStock"("externalKey");

-- CreateIndex
CREATE INDEX "InventoryStoreStock_storeLocation_idx" ON "InventoryStoreStock"("storeLocation");

-- CreateIndex
CREATE INDEX "InventoryStoreStock_purchaseItemExternalId_idx" ON "InventoryStoreStock"("purchaseItemExternalId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryStockTransfer_externalId_key" ON "InventoryStockTransfer"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryStockTransfer_transferNumber_key" ON "InventoryStockTransfer"("transferNumber");

-- CreateIndex
CREATE INDEX "InventoryStockTransferItem_stockTransferId_idx" ON "InventoryStockTransferItem"("stockTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementVendorBill_externalId_key" ON "ProcurementVendorBill"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementVendorBill_billNumber_key" ON "ProcurementVendorBill"("billNumber");

-- CreateIndex
CREATE INDEX "ProcurementVendorBillItem_vendorBillId_idx" ON "ProcurementVendorBillItem"("vendorBillId");

-- CreateIndex
CREATE INDEX "ProcurementVendorPayment_vendorBillId_idx" ON "ProcurementVendorPayment"("vendorBillId");

-- AddForeignKey
ALTER TABLE "ProcurementPurchaseOrderItem" ADD CONSTRAINT "ProcurementPurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "ProcurementPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementGoodsReceiptItem" ADD CONSTRAINT "ProcurementGoodsReceiptItem_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "ProcurementGoodsReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStockTransferItem" ADD CONSTRAINT "InventoryStockTransferItem_stockTransferId_fkey" FOREIGN KEY ("stockTransferId") REFERENCES "InventoryStockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementVendorBillItem" ADD CONSTRAINT "ProcurementVendorBillItem_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "ProcurementVendorBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementVendorPayment" ADD CONSTRAINT "ProcurementVendorPayment_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "ProcurementVendorBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
