import { RequestContext } from '../context/request-context';

const BUSINESS_ID_ALIASES: Record<string, string> = {
  orderId: 'order_id',
  paymentId: 'payment_id',
  ticketId: 'ticket_id',
  reservationId: 'reservation_id',
  artistBioJobId: 'artist_bio_job_id',
};

const SENSITIVE_KEY_PATTERN =
  /(secret|password|token|qrToken|qr_token|signature|authorization)/i;

export function formatStructuredLog(
  event: string,
  metadata: Record<string, unknown> = {},
): string {
  const context = RequestContext.get();
  const sanitizedMetadata = sanitizeMetadata(metadata);

  return JSON.stringify({
    event,
    correlationId: context?.correlationId ?? null,
    method: context?.method ?? null,
    path: context?.path ?? null,
    userId: context?.userId ?? null,
    ...businessIdAliases(sanitizedMetadata),
    ...sanitizedMetadata,
  });
}

function businessIdAliases(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  return Object.entries(BUSINESS_ID_ALIASES).reduce<Record<string, unknown>>(
    (aliases, [sourceKey, aliasKey]) => {
      const value = metadata[sourceKey];
      if (value !== undefined && metadata[aliasKey] === undefined) {
        aliases[aliasKey] = value;
      }
      return aliases;
    },
    {},
  );
}

function sanitizeMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? '[redacted]' : value,
    ]),
  );
}
