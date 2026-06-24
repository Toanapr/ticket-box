ALTER TABLE "concerts" ADD COLUMN "slug" TEXT;

WITH normalized AS (
  SELECT
    "id",
    COALESCE(
      NULLIF(
        BTRIM(
          REGEXP_REPLACE(LOWER("title"), '[^a-z0-9]+', '-', 'g'),
          '-'
        ),
        ''
      ),
      'concert'
    ) AS base_slug
  FROM "concerts"
), ranked AS (
  SELECT
    "id",
    base_slug,
    ROW_NUMBER() OVER (PARTITION BY base_slug ORDER BY "id") AS slug_rank
  FROM normalized
)
UPDATE "concerts" AS concert
SET "slug" = CASE
  WHEN ranked.slug_rank = 1 THEN ranked.base_slug
  ELSE ranked.base_slug || '-' || ranked.slug_rank
END
FROM ranked
WHERE concert."id" = ranked."id";

ALTER TABLE "concerts" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "concerts_slug_key" ON "concerts"("slug");
