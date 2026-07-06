ALTER TABLE "Order"
  ADD COLUMN "buyer_full_name" TEXT,
  ADD COLUMN "buyer_phone" TEXT,
  ADD COLUMN "buyer_email" TEXT;

UPDATE "Order" o
SET
  "buyer_full_name" = u."full_name",
  "buyer_email" = u."email"
FROM "users" u
WHERE o."userId" = u."id"
  AND o."buyer_email" IS NULL;

CREATE INDEX "Order_buyer_email_idx" ON "Order"("buyer_email");
