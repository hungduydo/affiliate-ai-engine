-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Platform" ADD VALUE 'INSTAGRAM';
ALTER TYPE "Platform" ADD VALUE 'TWITTER';
ALTER TYPE "Platform" ADD VALUE 'LINKEDIN';
ALTER TYPE "Platform" ADD VALUE 'PINTEREST';
ALTER TYPE "Platform" ADD VALUE 'MASTODON';
ALTER TYPE "Platform" ADD VALUE 'THREADS';

-- CreateTable
CREATE TABLE "publish_providers" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabledPlatforms" JSONB NOT NULL,
    "credentials" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publish_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "publish_providers_key_idx" ON "publish_providers"("key");

-- CreateIndex
CREATE INDEX "publish_providers_isActive_idx" ON "publish_providers"("isActive");
