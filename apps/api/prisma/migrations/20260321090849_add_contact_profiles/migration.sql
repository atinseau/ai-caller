-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "contactId" TEXT;

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "email" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "summary" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contact_companyId_phoneNumber_idx" ON "Contact"("companyId", "phoneNumber");

-- CreateIndex
CREATE INDEX "Contact_companyId_email_idx" ON "Contact"("companyId", "email");

-- CreateIndex
CREATE INDEX "Contact_companyId_ipAddress_idx" ON "Contact"("companyId", "ipAddress");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
