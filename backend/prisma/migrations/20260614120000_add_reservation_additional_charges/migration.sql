-- CreateTable
CREATE TABLE "additional_charge_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "default_rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unit_type" TEXT NOT NULL DEFAULT 'fixed',
    "default_description" TEXT NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "additional_charge_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_additional_charges" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "additional_charge_type_id" TEXT,
    "custom_charge_name" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservation_additional_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "additional_charge_types_name_key" ON "additional_charge_types"("name");

-- CreateIndex
CREATE INDEX "reservation_additional_charges_reservation_id_idx" ON "reservation_additional_charges"("reservation_id");

-- CreateIndex
CREATE INDEX "reservation_additional_charges_additional_charge_type_id_idx" ON "reservation_additional_charges"("additional_charge_type_id");

-- AddForeignKey
ALTER TABLE "reservation_additional_charges" ADD CONSTRAINT "reservation_additional_charges_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_additional_charges" ADD CONSTRAINT "reservation_additional_charges_additional_charge_type_id_fkey" FOREIGN KEY ("additional_charge_type_id") REFERENCES "additional_charge_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
