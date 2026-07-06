import { ScannerAssignmentStatus } from '@prisma/client';

export class ScannerAssignmentResponseDto {
  assignmentId!: string;
  deviceId!: string;
  scannerUserId!: string;
  status!: ScannerAssignmentStatus;
  eventId!: string;
  concertId!: string;
  gateCode!: string;
  zoneCode!: string;
  manifestVersion!: number | null;
  manifestGeneratedAt!: string | null;
  manifestExpiresAt!: string | null;
}
