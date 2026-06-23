-- CreateEnum
CREATE TYPE "BookingSpaceAssignmentType" AS ENUM ('PRIME_FULL', 'SUB_ONLY');

-- CreateTable
CREATE TABLE "BookingSpaceAssignment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "primeSpaceId" TEXT NOT NULL,
    "subSpaceId" TEXT,
    "assignmentType" "BookingSpaceAssignmentType" NOT NULL,
    "usageLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingSpaceAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingSpaceAssignment_bookingId_idx" ON "BookingSpaceAssignment"("bookingId");

-- CreateIndex
CREATE INDEX "BookingSpaceAssignment_venueId_primeSpaceId_idx" ON "BookingSpaceAssignment"("venueId", "primeSpaceId");

-- CreateIndex
CREATE INDEX "BookingSpaceAssignment_venueId_subSpaceId_idx" ON "BookingSpaceAssignment"("venueId", "subSpaceId");

-- AddForeignKey
ALTER TABLE "BookingSpaceAssignment" ADD CONSTRAINT "BookingSpaceAssignment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
