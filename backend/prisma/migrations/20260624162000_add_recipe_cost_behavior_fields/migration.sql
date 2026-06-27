ALTER TABLE "banquet_recipes"
ADD COLUMN IF NOT EXISTS "laborCostBehavior" TEXT,
ADD COLUMN IF NOT EXISTS "utilityCostBehavior" TEXT,
ADD COLUMN IF NOT EXISTS "wastageCostBehavior" TEXT;
