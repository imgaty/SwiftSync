-- Persist Salt Edge customer ID on the User row to avoid re-querying the API on every bank request.
ALTER TABLE "User" ADD COLUMN "saltEdgeCustomerId" TEXT;
CREATE UNIQUE INDEX "User_saltEdgeCustomerId_key" ON "User"("saltEdgeCustomerId");

-- Back-fill from any existing SaltEdgeConnection rows (latest customerId wins).
UPDATE "User" u
SET "saltEdgeCustomerId" = c."customerId"
FROM (
    SELECT DISTINCT ON ("userId") "userId", "customerId"
    FROM "SaltEdgeConnection"
    ORDER BY "userId", "createdAt" DESC
) c
WHERE u."id" = c."userId"
  AND u."saltEdgeCustomerId" IS NULL;
