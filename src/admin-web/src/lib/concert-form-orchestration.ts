import type { ConcertStatus } from "./api";

export function getPostCreateStatusPatch(
  requestedStatus: ConcertStatus,
): { status: Exclude<ConcertStatus, "draft"> } | null {
  if (requestedStatus === "draft") return null;
  return { status: requestedStatus };
}
