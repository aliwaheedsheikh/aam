-- Reconcile Phase 1 procurement intelligence schema for databases where the
-- previous migration record was applied before its final SQL content existed.

DO $$
BEGIN
    IF to_regclass('public."InventoryItem"') IS NOT NULL AND to_regclass('public.kitchen_items') IS NULL THEN
        ALTER TABLE "InventoryItem" RENAME TO "kitchen_items";
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "vendor_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vendor_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "supply_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "supply_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "purchase_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "purchase_categories_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_types_status_check') THEN
        ALTER TABLE "vendor_types" ADD CONSTRAINT "vendor_types_status_check" CHECK ("status" IN ('active', 'inactive'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supply_categories_status_check') THEN
        ALTER TABLE "supply_categories" ADD CONSTRAINT "supply_categories_status_check" CHECK ("status" IN ('active', 'inactive'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_categories_status_check') THEN
        ALTER TABLE "purchase_categories" ADD CONSTRAINT "purchase_categories_status_check" CHECK ("status" IN ('active', 'inactive'));
    END IF;
END $$;

INSERT INTO "vendor_types" ("id", "name", "status", "created_at", "updated_at") VALUES
    ('specialist-vendor', 'Specialist Vendor', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('general-supplier-wholesale', 'General Supplier / Wholesale', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('market-vendor', 'Market Vendor', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('distributor', 'Distributor', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('manufacturer', 'Manufacturer', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('other', 'Other', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "status" = EXCLUDED."status",
    "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "supply_categories" ("id", "name", "status", "created_at", "updated_at") VALUES
    ('poultry', 'Poultry', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('meat', 'Meat', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('vegetables-fruit', 'Vegetables & Fruit', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dairy', 'Dairy', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dry-goods', 'Dry Goods', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('beverages', 'Beverages', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('packaging', 'Packaging', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cleaning', 'Cleaning', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('bakery-items', 'Bakery Items', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seafood', 'Seafood', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('spices', 'Spices', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ghee-oil', 'Ghee & Oil', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('disposables', 'Disposables', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('other', 'Other', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "status" = EXCLUDED."status",
    "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "purchase_categories" ("id", "name", "status", "created_at", "updated_at") VALUES
    ('fresh-vegetables', 'Fresh Vegetables', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('fresh-fruits', 'Fresh Fruits', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('poultry', 'Poultry', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('meat', 'Meat', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seafood', 'Seafood', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dairy', 'Dairy', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dry-grocery', 'Dry Grocery', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('beverages', 'Beverages', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('bakery', 'Bakery', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('packaging', 'Packaging', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cleaning-supplies', 'Cleaning Supplies', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('other', 'Other', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "status" = EXCLUDED."status",
    "updated_at" = CURRENT_TIMESTAMP;

ALTER TABLE "ProcurementVendor" ADD COLUMN IF NOT EXISTS "vendor_type_id" TEXT;
ALTER TABLE "ProcurementVendor" ADD COLUMN IF NOT EXISTS "supply_scope" TEXT;
ALTER TABLE "ProcurementVendor" ADD COLUMN IF NOT EXISTS "default_lead_time_days" INTEGER;
ALTER TABLE "ProcurementVendor" ADD COLUMN IF NOT EXISTS "order_cutoff_time" TEXT;
ALTER TABLE "ProcurementVendor" ADD COLUMN IF NOT EXISTS "delivery_days" JSONB;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProcurementVendor_vendor_type_id_fkey') THEN
        ALTER TABLE "ProcurementVendor" ADD CONSTRAINT "ProcurementVendor_vendor_type_id_fkey"
            FOREIGN KEY ("vendor_type_id") REFERENCES "vendor_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProcurementVendor_supply_scope_check') THEN
        ALTER TABLE "ProcurementVendor" ADD CONSTRAINT "ProcurementVendor_supply_scope_check"
            CHECK (
                "supply_scope" IS NULL OR
                "supply_scope" IN (
                    'approved_items_only',
                    'all_items_in_selected_categories',
                    'selected_categories_with_exceptions'
                )
            );
    END IF;
END $$;

ALTER TABLE "kitchen_items" ADD COLUMN IF NOT EXISTS "purchase_category_id" TEXT;
ALTER TABLE "kitchen_items" ADD COLUMN IF NOT EXISTS "preferred_vendor" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kitchen_items_purchase_category_id_fkey') THEN
        ALTER TABLE "kitchen_items" ADD CONSTRAINT "kitchen_items_purchase_category_id_fkey"
            FOREIGN KEY ("purchase_category_id") REFERENCES "purchase_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "vendor_supply_categories" (
    "vendor_id" TEXT NOT NULL,
    "supply_category_id" TEXT NOT NULL,
    CONSTRAINT "vendor_supply_categories_pkey" PRIMARY KEY ("vendor_id", "supply_category_id")
);

CREATE INDEX IF NOT EXISTS "vendor_supply_categories_supply_category_id_idx" ON "vendor_supply_categories"("supply_category_id");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_supply_categories_vendor_id_fkey') THEN
        ALTER TABLE "vendor_supply_categories" ADD CONSTRAINT "vendor_supply_categories_vendor_id_fkey"
            FOREIGN KEY ("vendor_id") REFERENCES "ProcurementVendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_supply_categories_supply_category_id_fkey') THEN
        ALTER TABLE "vendor_supply_categories" ADD CONSTRAINT "vendor_supply_categories_supply_category_id_fkey"
            FOREIGN KEY ("supply_category_id") REFERENCES "supply_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "vendor_item_mappings" (
    "vendor_id" TEXT NOT NULL,
    "kitchen_item_id" TEXT NOT NULL,
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "lead_time_days" INTEGER,
    "moq" DECIMAL(14,3),
    "last_rate" DECIMAL(14,4),
    "contract_rate" DECIMAL(14,4),
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vendor_item_mappings_pkey" PRIMARY KEY ("vendor_id", "kitchen_item_id")
);

CREATE INDEX IF NOT EXISTS "vendor_item_mappings_kitchen_item_id_idx" ON "vendor_item_mappings"("kitchen_item_id");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_item_mappings_status_check') THEN
        ALTER TABLE "vendor_item_mappings" ADD CONSTRAINT "vendor_item_mappings_status_check" CHECK ("status" IN ('active', 'inactive'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_item_mappings_vendor_id_fkey') THEN
        ALTER TABLE "vendor_item_mappings" ADD CONSTRAINT "vendor_item_mappings_vendor_id_fkey"
            FOREIGN KEY ("vendor_id") REFERENCES "ProcurementVendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_item_mappings_kitchen_item_id_fkey') THEN
        ALTER TABLE "vendor_item_mappings" ADD CONSTRAINT "vendor_item_mappings_kitchen_item_id_fkey"
            FOREIGN KEY ("kitchen_item_id") REFERENCES "kitchen_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

ALTER TABLE "ProcurementPurchaseOrder" ADD COLUMN IF NOT EXISTS "sourceFlow" TEXT;
ALTER TABLE "ProcurementPurchaseOrder" ADD COLUMN IF NOT EXISTS "sourceLabel" TEXT;

ALTER TABLE "ProcurementPurchaseOrderItem" ADD COLUMN IF NOT EXISTS "preferredVendorExternalId" TEXT;
ALTER TABLE "ProcurementPurchaseOrderItem" ADD COLUMN IF NOT EXISTS "selectedVendorExternalId" TEXT;
ALTER TABLE "ProcurementPurchaseOrderItem" ADD COLUMN IF NOT EXISTS "purchaseCategoryExternalId" TEXT;
ALTER TABLE "ProcurementPurchaseOrderItem" ADD COLUMN IF NOT EXISTS "supplyCategoryExternalId" TEXT;
