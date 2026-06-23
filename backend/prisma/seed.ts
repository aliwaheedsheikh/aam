import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { USER_MANAGEMENT_DEFAULT_PERMISSIONS } from "../src/modules/auth/auth.constants";

const prisma = new PrismaClient();

const procurementLookupDefaults = {
  vendorTypes: [
    ["specialist-vendor", "Specialist Vendor"],
    ["general-supplier-wholesale", "General Supplier / Wholesale"],
    ["market-vendor", "Market Vendor"],
    ["distributor", "Distributor"],
    ["manufacturer", "Manufacturer"],
    ["other", "Other"],
  ],
  supplyCategories: [
    ["poultry", "Poultry"],
    ["meat", "Meat"],
    ["vegetables-fruit", "Vegetables & Fruit"],
    ["dairy", "Dairy"],
    ["dry-goods", "Dry Goods"],
    ["beverages", "Beverages"],
    ["packaging", "Packaging"],
    ["cleaning", "Cleaning"],
    ["bakery-items", "Bakery Items"],
    ["seafood", "Seafood"],
    ["spices", "Spices"],
    ["ghee-oil", "Ghee & Oil"],
    ["disposables", "Disposables"],
    ["other", "Other"],
  ],
  purchaseCategories: [
    ["fresh-vegetables", "Fresh Vegetables"],
    ["fresh-fruits", "Fresh Fruits"],
    ["poultry", "Poultry"],
    ["meat", "Meat"],
    ["seafood", "Seafood"],
    ["dairy", "Dairy"],
    ["dry-grocery", "Dry Grocery"],
    ["beverages", "Beverages"],
    ["bakery", "Bakery"],
    ["packaging", "Packaging"],
    ["cleaning-supplies", "Cleaning Supplies"],
    ["other", "Other"],
  ],
} as const;

async function main() {
  const passwordHash = await bcrypt.hash("Admin@123", 10);

  await prisma.user.upsert({
    where: { email: "admin@venueops.local" },
    update: {
      username: "admin",
      role: "ADMIN",
      permissions: {
        deleteMany: {},
        create: USER_MANAGEMENT_DEFAULT_PERMISSIONS,
      },
    },
    create: {
      email: "admin@venueops.local",
      username: "admin",
      fullName: "VenueOps Administrator",
      passwordHash,
      role: "ADMIN",
      permissions: {
        create: USER_MANAGEMENT_DEFAULT_PERMISSIONS,
      },
    },
  });

  for (const [id, name] of procurementLookupDefaults.vendorTypes) {
    await prisma.vendorType.upsert({
      where: { id },
      update: { name, status: "active" },
      create: { id, name, status: "active" },
    });
  }

  for (const [id, name] of procurementLookupDefaults.supplyCategories) {
    await prisma.supplyCategory.upsert({
      where: { id },
      update: { name, status: "active" },
      create: { id, name, status: "active" },
    });
  }

  for (const [id, name] of procurementLookupDefaults.purchaseCategories) {
    await prisma.purchaseCategory.upsert({
      where: { id },
      update: { name, status: "active" },
      create: { id, name, status: "active" },
    });
  }

  // Keep broader business setup data user-managed so a fresh installation starts clean.
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
