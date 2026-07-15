-- Add nullable profile data without breaking existing organizer/scanner users.
ALTER TABLE "users" ADD COLUMN "full_name" TEXT;
