import type {
  ScannerAssignment,
  ScannerManifest,
  ScannerManifestTicket,
} from "./types";

export type ParsedQrPayload = {
  ticketRef: string;
  rawToken: string;
};

export type LocalScanValidationResult =
  | {
      ok: true;
      payload: ParsedQrPayload;
      ticket: ScannerManifestTicket;
    }
  | {
      ok: false;
      reason:
        | "manifest_unavailable"
        | "assignment_unavailable"
        | "ticket_not_found"
        | "ticket_revoked"
        | "wrong_event"
        | "wrong_gate"
        | "wrong_zone"
        | "duplicate_local_scan"
        | "invalid_qr_payload";
      message: string;
    };

export function parseQrPayload(rawValue: string): ParsedQrPayload | null {
  const normalizedValue = rawValue.trim();

  if (normalizedValue.length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalizedValue) as
      { rawToken?: unknown; ticketRef?: unknown } | string;

    if (typeof parsed === "string") {
      return {
        ticketRef: parsed,
        rawToken: normalizedValue,
      };
    }

    const ticketRef =
      typeof parsed.ticketRef === "string" && parsed.ticketRef.trim().length > 0
        ? parsed.ticketRef.trim()
        : typeof parsed.rawToken === "string" &&
            parsed.rawToken.trim().length > 0
          ? parsed.rawToken.trim()
          : null;
    const rawToken =
      typeof parsed.rawToken === "string" && parsed.rawToken.trim().length > 0
        ? parsed.rawToken.trim()
        : normalizedValue;

    if (!ticketRef) {
      return null;
    }

    return {
      ticketRef,
      rawToken,
    };
  } catch {
    return {
      ticketRef: normalizedValue,
      rawToken: normalizedValue,
    };
  }
}

export function validateLocalScan(input: {
  rawValue: string;
  manifest: ScannerManifest | null;
  assignment: ScannerAssignment | null;
  checkedInTicketRefs: string[];
}): LocalScanValidationResult {
  const payload = parseQrPayload(input.rawValue);

  if (!payload) {
    return {
      ok: false,
      reason: "invalid_qr_payload",
      message: "QR payload could not be parsed into a stable ticket reference.",
    };
  }

  if (!input.manifest) {
    return {
      ok: false,
      reason: "manifest_unavailable",
      message: "Load a valid manifest before scanning offline.",
    };
  }

  if (!input.assignment) {
    return {
      ok: false,
      reason: "assignment_unavailable",
      message: "Load the current scanner assignment before scanning.",
    };
  }

  const ticket =
    input.manifest.tickets.find(
      (item) => item.ticketRef === payload.ticketRef,
    ) ??
    input.manifest.tickets.find((item) => item.rawToken === payload.rawToken);

  if (!ticket) {
    return {
      ok: false,
      reason: "ticket_not_found",
      message:
        "The scanned ticket was not found in the current manifest scope.",
    };
  }

  const revokedTicket = input.manifest.revokedTickets.find(
    (item) =>
      item.ticketRef === ticket.ticketRef ||
      item.ticketRef === payload.ticketRef,
  );

  if (revokedTicket) {
    return {
      ok: false,
      reason: "ticket_revoked",
      message: "This ticket appears in the revoked manifest list.",
    };
  }

  // A QR commonly contains rawToken while local state stores the canonical
  // ticketRef from the manifest. Always compare after canonicalization.
  if (
    input.checkedInTicketRefs.includes(ticket.ticketRef) ||
    input.checkedInTicketRefs.includes(ticket.rawToken)
  ) {
    return {
      ok: false,
      reason: "duplicate_local_scan",
      message: "This ticket has already been recorded on this device.",
    };
  }

  if (ticket.eventId !== input.assignment.eventId) {
    return {
      ok: false,
      reason: "wrong_event",
      message: "The scanned ticket belongs to a different event scope.",
    };
  }

  if (ticket.gateCode !== input.assignment.gateCode) {
    return {
      ok: false,
      reason: "wrong_gate",
      message: "The scanned ticket is not valid for this gate.",
    };
  }

  if (ticket.zoneCode !== input.assignment.zoneCode) {
    return {
      ok: false,
      reason: "wrong_zone",
      message: "The scanned ticket is not valid for this zone.",
    };
  }

  return {
    ok: true,
    // Always sync the canonical pair from the signed manifest. Manual entry may
    // contain only a ticket reference, while the backend also validates rawToken.
    payload: {
      ticketRef: ticket.ticketRef,
      rawToken: ticket.rawToken,
    },
    ticket,
  };
}
