import { RequestContext } from '../context/request-context';

export function formatStructuredLog(
  event: string,
  metadata: Record<string, unknown> = {},
): string {
  const context = RequestContext.get();

  return JSON.stringify({
    event,
    correlationId: context?.correlationId ?? null,
    method: context?.method ?? null,
    path: context?.path ?? null,
    userId: context?.userId ?? null,
    ...metadata,
  });
}
