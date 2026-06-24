-- CreateTable
CREATE TABLE "ScannerManifestTicket" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "ticketId" TEXT NOT NULL,
    "ticketRef" TEXT NOT NULL,
    "rawToken" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "concertId" TEXT NOT NULL,
    "gateCode" TEXT NOT NULL,
    "zoneCode" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "ScannerManifestTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScannerRevokedTicket" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "ticketRef" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "concertId" TEXT NOT NULL,
    "gateCode" TEXT NOT NULL,
    "zoneCode" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "ScannerRevokedTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScannerGuestEntry" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "guestRef" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "concertId" TEXT NOT NULL,
    "gateCode" TEXT NOT NULL,
    "zoneCode" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "ScannerGuestEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScannerManifestTicket_assignmentId_ticketRef_key" ON "ScannerManifestTicket"("assignmentId", "ticketRef");

-- CreateIndex
CREATE INDEX "ScannerManifestTicket_eventId_gateCode_zoneCode_idx" ON "ScannerManifestTicket"("eventId", "gateCode", "zoneCode");

-- CreateIndex
CREATE UNIQUE INDEX "ScannerRevokedTicket_assignmentId_ticketRef_key" ON "ScannerRevokedTicket"("assignmentId", "ticketRef");

-- CreateIndex
CREATE INDEX "ScannerRevokedTicket_eventId_gateCode_zoneCode_idx" ON "ScannerRevokedTicket"("eventId", "gateCode", "zoneCode");

-- CreateIndex
CREATE UNIQUE INDEX "ScannerGuestEntry_assignmentId_guestRef_key" ON "ScannerGuestEntry"("assignmentId", "guestRef");

-- CreateIndex
CREATE INDEX "ScannerGuestEntry_eventId_gateCode_zoneCode_idx" ON "ScannerGuestEntry"("eventId", "gateCode", "zoneCode");

-- AddForeignKey
ALTER TABLE "ScannerManifestTicket" ADD CONSTRAINT "ScannerManifestTicket_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ScannerAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannerRevokedTicket" ADD CONSTRAINT "ScannerRevokedTicket_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ScannerAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannerGuestEntry" ADD CONSTRAINT "ScannerGuestEntry_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ScannerAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
