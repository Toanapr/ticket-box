export enum ScannerCheckInReason {
  ACCEPTED_FIRST_SCAN = 'accepted_first_scan',
  DUPLICATE_EVENT_REPLAY = 'duplicate_event_replay',
  TICKET_ALREADY_CHECKED_IN = 'ticket_already_checked_in',
  TICKET_NOT_FOUND = 'ticket_not_found',
  TICKET_REVOKED = 'ticket_revoked',
  WRONG_EVENT = 'wrong_event',
  WRONG_GATE = 'wrong_gate',
  WRONG_ZONE = 'wrong_zone',
  INVALID_ASSIGNMENT = 'invalid_assignment',
  INVALID_DEVICE = 'invalid_device',
  INVALID_MANIFEST_SCOPE = 'invalid_manifest_scope',
  INVALID_TICKET_PAYLOAD = 'invalid_ticket_payload',
}
