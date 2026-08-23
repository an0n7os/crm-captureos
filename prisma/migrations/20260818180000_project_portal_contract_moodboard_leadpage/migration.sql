-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'SENT', 'SIGNED', 'DECLINED');

-- AlterTable
-- shareToken lands nullable so existing projects can be backfilled with unique
-- values before the NOT NULL constraint goes on.
ALTER TABLE "Project" ADD COLUMN     "clientWhatsapp" TEXT,
ADD COLUMN     "portalPin" TEXT,
ADD COLUMN     "shareToken" TEXT,
ADD COLUMN     "whatsappGroupUrl" TEXT;

UPDATE "Project" SET "shareToken" = replace(gen_random_uuid()::text, '-', '') WHERE "shareToken" IS NULL;

ALTER TABLE "Project" ALTER COLUMN "shareToken" SET NOT NULL;

-- AlterTable
ALTER TABLE "Studio" ADD COLUMN     "enquiryCoverUrl" TEXT,
ADD COLUMN     "enquiryEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enquiryHeading" TEXT,
ADD COLUMN     "enquirySlug" TEXT,
ADD COLUMN     "enquirySubtext" TEXT,
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "whatsappNumber" TEXT;

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "signerName" TEXT,
    "signerIp" TEXT,
    "shareToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodboardItem" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoodboardItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadPageView" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "referrer" TEXT,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadPageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contract_projectId_key" ON "Contract"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_shareToken_key" ON "Contract"("shareToken");

-- CreateIndex
CREATE INDEX "Contract_studioId_idx" ON "Contract"("studioId");

-- CreateIndex
CREATE INDEX "MoodboardItem_studioId_idx" ON "MoodboardItem"("studioId");

-- CreateIndex
CREATE INDEX "MoodboardItem_projectId_idx" ON "MoodboardItem"("projectId");

-- CreateIndex
CREATE INDEX "LeadPageView_studioId_createdAt_idx" ON "LeadPageView"("studioId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_shareToken_key" ON "Project"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "Studio_enquirySlug_key" ON "Studio"("enquirySlug");

-- CreateIndex
CREATE UNIQUE INDEX "Studio_referralCode_key" ON "Studio"("referralCode");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodboardItem" ADD CONSTRAINT "MoodboardItem_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodboardItem" ADD CONSTRAINT "MoodboardItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadPageView" ADD CONSTRAINT "LeadPageView_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

