ALTER TABLE "guest_entries"
    DROP CONSTRAINT "guest_entries_ticket_type_id_fkey";

ALTER TABLE "guest_entries"
    ALTER COLUMN "ticket_type_id" DROP NOT NULL;

ALTER TABLE "guest_entries"
    ADD CONSTRAINT "guest_entries_ticket_type_id_fkey"
    FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
