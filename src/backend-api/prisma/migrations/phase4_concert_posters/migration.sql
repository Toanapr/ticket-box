ALTER TABLE "concerts"
ADD COLUMN IF NOT EXISTS "poster_object_key" TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "concerts_poster_object_key_key"
ON "concerts"("poster_object_key");
