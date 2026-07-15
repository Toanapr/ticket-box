-- Backfill tickets accepted before scanner sync projected check-in state to Ticket.
UPDATE "Ticket" AS ticket
SET
  "status" = 'checked_in'::"TicketStatus",
  "updatedAt" = NOW()
WHERE ticket."status" = 'issued'::"TicketStatus"
  AND EXISTS (
    SELECT 1
    FROM "CheckInEvent" AS check_in
    WHERE check_in."ticketId" = ticket."id"::text
      AND check_in."result" = 'accepted'::"CheckInResultStatus"
  );
