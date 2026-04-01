-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('RAW', 'ENRICHED', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EnrichStatus" AS ENUM ('PENDING', 'ENRICHING', 'DONE', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "commission" DOUBLE PRECISION,
    "affiliateLink" TEXT NOT NULL,
    "productLink" TEXT,
    "imageUrl" TEXT,
    "rawData" JSONB NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'RAW',
    "enrichStatus" "EnrichStatus" NOT NULL DEFAULT 'PENDING',
    "enrichedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "productDna" JSONB,
    "dnaExtractedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_externalId_key" ON "products"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "products_affiliateLink_key" ON "products"("affiliateLink");

-- CreateIndex
CREATE INDEX "products_source_idx" ON "products"("source");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_enrichStatus_idx" ON "products"("enrichStatus");
