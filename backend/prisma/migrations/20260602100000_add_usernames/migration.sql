ALTER TABLE "User" ADD COLUMN "username" TEXT;

UPDATE "User"
SET "username" = LOWER(SPLIT_PART("email", '@', 1))
WHERE "username" IS NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
