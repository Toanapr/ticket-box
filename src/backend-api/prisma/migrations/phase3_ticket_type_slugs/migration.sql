ALTER TABLE "ticket_types" ADD COLUMN "slug" TEXT;

WITH normalized AS (
  SELECT
    "id",
    "concert_id",
    COALESCE(
      NULLIF(
        BTRIM(
          REGEXP_REPLACE(LOWER("name"), '[^a-z0-9]+', '-', 'g'),
          '-'
        ),
        ''
      ),
      'ticket'
    ) AS base_slug
  FROM "ticket_types"
), ranked AS (
  SELECT
    "id",
    base_slug,
    ROW_NUMBER() OVER (
      PARTITION BY "concert_id", base_slug
      ORDER BY "id"
    ) AS slug_rank
  FROM normalized
)
UPDATE "ticket_types" AS ticket_type
SET "slug" = CASE
  WHEN ranked.slug_rank = 1 THEN ranked.base_slug
  ELSE ranked.base_slug || '-' || ranked.slug_rank
END
FROM ranked
WHERE ticket_type."id" = ranked."id";

ALTER TABLE "ticket_types" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "ticket_types_concert_id_slug_key"
ON "ticket_types"("concert_id", "slug");
