import { Request } from 'express';
import { ScannerPrincipal } from './scanner-auth.guard';

export type ScannerRequest = Request & {
  correlationId: string;
  scannerPrincipal?: ScannerPrincipal;
  headers: Record<string, string | string[] | undefined>;
};
