import { ScannerCheckInReason } from '../enums/scanner-check-in-reason.enum';
import { ScannerCheckInResult } from '../enums/scanner-check-in-result.enum';

export class ScannerCheckInSyncResultDto {
  clientEventId!: string;
  result!: ScannerCheckInResult;
  reason!: ScannerCheckInReason;
  serverRecordedAt!: string;
  winningEventId!: string | null;
  checkInEventId!: string;
  ticketId!: string | null;
}

export class ScannerCheckInSyncResponseDto {
  assignmentId!: string;
  processedAt!: string;
  results!: ScannerCheckInSyncResultDto[];
}
