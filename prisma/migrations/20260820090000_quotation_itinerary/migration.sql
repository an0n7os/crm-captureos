-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "complimentaryText" TEXT,
ADD COLUMN     "deliverablesText" TEXT,
ADD COLUMN     "leadName" TEXT,
ADD COLUMN     "pdfTemplate" TEXT NOT NULL DEFAULT 'CLASSIC',
ADD COLUMN     "showDates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showLeadName" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "QuotationEvent" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "venue" TEXT,
    "date" TIMESTAMP(3),
    "dateConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuotationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationEventService" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuotationEventService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationPayment" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'UPI',
    "paidOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceItem" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuotationEvent_quotationId_idx" ON "QuotationEvent"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationEventService_eventId_idx" ON "QuotationEventService"("eventId");

-- CreateIndex
CREATE INDEX "QuotationPayment_quotationId_idx" ON "QuotationPayment"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationPayment_studioId_idx" ON "QuotationPayment"("studioId");

-- CreateIndex
CREATE INDEX "ServiceItem_studioId_idx" ON "ServiceItem"("studioId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceItem_studioId_name_key" ON "ServiceItem"("studioId", "name");

-- AddForeignKey
ALTER TABLE "QuotationEvent" ADD CONSTRAINT "QuotationEvent_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationEventService" ADD CONSTRAINT "QuotationEventService_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "QuotationEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationPayment" ADD CONSTRAINT "QuotationPayment_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItem" ADD CONSTRAINT "ServiceItem_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

