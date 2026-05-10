-- CreateEnum
CREATE TYPE "UserMode" AS ENUM ('SHOP', 'PERSONAL');

-- AlterTable: add mode column (nullable)
ALTER TABLE "User" ADD COLUMN "mode" "UserMode";

-- Backfill: existing users are all shop owners (pre-personal-finance era)
UPDATE "User" SET "mode" = 'SHOP' WHERE "mode" IS NULL;

-- AlterTable: add optional category to Sale and Expense
ALTER TABLE "Sale" ADD COLUMN "category" TEXT;
ALTER TABLE "Expense" ADD COLUMN "category" TEXT;

-- CreateIndex
CREATE INDEX "Sale_userId_category_idx" ON "Sale"("userId", "category");
CREATE INDEX "Expense_userId_category_idx" ON "Expense"("userId", "category");
