-- AlterTable
ALTER TABLE "WhatsAppConfig" DROP COLUMN "accessToken",
DROP COLUMN "verifyToken",
DROP COLUMN "whatsappBusinessId";

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConfig_phoneNumberId_key" ON "WhatsAppConfig"("phoneNumberId");
