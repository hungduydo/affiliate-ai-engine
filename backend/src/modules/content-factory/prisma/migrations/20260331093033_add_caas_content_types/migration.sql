-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('WORDPRESS', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'SHOPIFY');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('BLOG_POST', 'SOCIAL_POST', 'VIDEO_SCRIPT', 'CAROUSEL', 'THREAD', 'HERO_COPY');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('RAW', 'AI_PROCESSING', 'GENERATED', 'PENDING_APPROVAL', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "contents" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "mediaAssets" JSONB,
    "promptId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'RAW',
    "scheduledPublishAt" TIMESTAMP(3),
    "scheduledPlatform" "Platform",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contents_productId_idx" ON "contents"("productId");

-- CreateIndex
CREATE INDEX "contents_status_idx" ON "contents"("status");

-- CreateIndex
CREATE INDEX "contents_platform_idx" ON "contents"("platform");

-- CreateIndex
CREATE INDEX "contents_scheduledPublishAt_idx" ON "contents"("scheduledPublishAt");
