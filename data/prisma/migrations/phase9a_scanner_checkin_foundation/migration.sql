-- CreateEnum
CREATE TYPE "ScannerDeviceStatus" AS ENUM ('active', 'inactive', 'revoked');

-- CreateEnum
CREATE TYPE "ScannerAssignmentStatus" AS ENUM ('active', 'inactive', 'revoked');

-- CreateEnum
CREATE TYPE "CheckInResultStatus" AS ENUM ('accepted', 'conflict', 'rejected');

-- CreateTable
CREATE TABLE "ScannerDevice" (
    "id" UUID NOT NULL,
    "deviceCode" TEXT NOT NULL,
    "scannerUserId" TEXT NOT NULL,
    "status" "ScannerDeviceStatus" NOT NULL,
    "lastSeenAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "ScannerDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScannerAssignment" (
    "id" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "scannerUserId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "concertId" TEXT NOT NULL,
    "gateCode" TEXT NOT NULL,
    "zoneCode" TEXT NOT NULL,
    "status" "ScannerAssignmentStatus" NOT NULL,
    "manifestVersion" INTEGER,
    "manifestIssuedAt" TIMESTAMPTZ(6),
    "manifestExpiresAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "ScannerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInEvent" (
    "id" UUID NOT NULL,
    "clientEventId" TEXT NOT NULL,
    "ticketId" TEXT,
    "ticketRef" TEXT NOT NULL,
    "rawToken" TEXT,
    "scannerUserId" TEXT NOT NULL,
    "deviceId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "concertId" TEXT,
    "gateCode" TEXT NOT NULL,
    "zoneCode" TEXT NOT NULL,
    "manifestVersion" INTEGER,
    "clientScannedAt" TIMESTAMPTZ(6) NOT NULL,
    "serverRecordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" "CheckInResultStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "winningEventId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "CheckInEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScannerDevice_deviceCode_key" ON "ScannerDevice"("deviceCode");

-- CreateIndex
CREATE INDEX "ScannerAssignment_eventId_gateCode_zoneCode_status_idx" ON "ScannerAssignment"("eventId", "gateCode", "zoneCode", "status");

-- CreateIndex
CREATE INDEX "ScannerAssignment_deviceId_status_idx" ON "ScannerAssignment"("deviceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CheckInEvent_clientEventId_key" ON "CheckInEvent"("clientEventId");

-- CreateIndex
CREATE INDEX "CheckInEvent_ticketId_serverRecordedAt_idx" ON "CheckInEvent"("ticketId", "serverRecordedAt");

-- CreateIndex
CREATE INDEX "CheckInEvent_ticketRef_serverRecordedAt_idx" ON "CheckInEvent"("ticketRef", "serverRecordedAt");

-- CreateIndex
CREATE INDEX "CheckInEvent_assignmentId_serverRecordedAt_idx" ON "CheckInEvent"("assignmentId", "serverRecordedAt");

-- CreateIndex
CREATE INDEX "CheckInEvent_eventId_gateCode_zoneCode_result_idx" ON "CheckInEvent"("eventId", "gateCode", "zoneCode", "result");

-- AddForeignKey
ALTER TABLE "ScannerAssignment" ADD CONSTRAINT "ScannerAssignment_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "ScannerDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInEvent" ADD CONSTRAINT "CheckInEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "ScannerDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInEvent" ADD CONSTRAINT "CheckInEvent_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ScannerAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
