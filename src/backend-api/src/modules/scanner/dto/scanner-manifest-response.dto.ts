export class ScannerManifestTicketDto {
  ticketRef!: string;
  rawToken!: string;
  ticketId!: string;
  ticketTypeId!: string;
  status!: string;
  eventId!: string;
  gateCode!: string;
  zoneCode!: string;
}

export class ScannerManifestRevokedTicketDto {
  ticketRef!: string;
  reason!: string;
}

export class ScannerManifestGuestDto {
  guestRef!: string;
  displayName!: string;
  eventId!: string;
  gateCode!: string;
  zoneCode!: string;
}

export class ScannerManifestResponseDto {
  assignmentId!: string;
  eventId!: string;
  concertId!: string;
  gateCode!: string;
  zoneCode!: string;
  version!: number;
  generatedAt!: string;
  expiresAt!: string;
  signature!: string;
  chunkIndex!: number | null;
  chunkSize!: number | null;
  totalChunks!: number;
  totalTickets!: number;
  totalRevokedTickets!: number;
  totalGuestEntries!: number;
  isChunked!: boolean;
  tickets!: ScannerManifestTicketDto[];
  revokedTickets!: ScannerManifestRevokedTicketDto[];
  guestList!: ScannerManifestGuestDto[];
}
