import { Injectable } from '@nestjs/common';
import { ScannerCheckInResult } from './enums/scanner-check-in-result.enum';

export type ScannerMetricsSnapshot = {
  accepted: number;
  conflict: number;
  rejected: number;
  duplicateReplay: number;
};

@Injectable()
export class ScannerMetricsService {
  private counters: ScannerMetricsSnapshot = {
    accepted: 0,
    conflict: 0,
    rejected: 0,
    duplicateReplay: 0,
  };

  incrementResult(result: ScannerCheckInResult) {
    if (result === ScannerCheckInResult.ACCEPTED) {
      this.counters.accepted += 1;
      return;
    }

    if (result === ScannerCheckInResult.CONFLICT) {
      this.counters.conflict += 1;
      return;
    }

    this.counters.rejected += 1;
  }

  incrementDuplicateReplay() {
    this.counters.duplicateReplay += 1;
  }

  snapshot(): ScannerMetricsSnapshot {
    return {
      ...this.counters,
    };
  }

  reset() {
    this.counters = {
      accepted: 0,
      conflict: 0,
      rejected: 0,
      duplicateReplay: 0,
    };
  }
}
