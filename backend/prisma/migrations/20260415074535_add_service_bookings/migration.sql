-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('VENUE_BOOKING', 'OUTDOOR_CATERING', 'FOOD_SUPPLY', 'RENTAL_SERVICES', 'MIXED_PACKAGE');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('TENTATIVE', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "ServiceBooking" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "status" "ServiceStatus" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "notes" TEXT,
    "totalAmount" DECIMAL(12,2),
    "paidAmount" DECIMAL(12,2),
    "balanceAmount" DECIMAL(12,2),
    "sourcePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceBooking_externalId_key" ON "ServiceBooking"("externalId");
