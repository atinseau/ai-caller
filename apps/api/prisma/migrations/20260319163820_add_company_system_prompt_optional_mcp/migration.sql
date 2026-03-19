-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "description" TEXT,
ADD COLUMN     "system_prompt" TEXT,
ALTER COLUMN "mcpUrl" DROP NOT NULL;
