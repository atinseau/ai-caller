-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ROOT', 'USER');

-- CreateEnum
CREATE TYPE "RoomEventType" AS ENUM ('USER_TRANSCRIPT', 'AGENT_TRANSCRIPT', 'TOOL_INVOKE_CREATED', 'TOOL_INVOKE_UPDATED', 'TEXT_DELTA', 'TEXT_DONE');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "isTest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "room_event" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "RoomEventType" NOT NULL,
    "payload" JSONB NOT NULL,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "room_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_event_roomId_idx" ON "room_event"("roomId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_event" ADD CONSTRAINT "room_event_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
