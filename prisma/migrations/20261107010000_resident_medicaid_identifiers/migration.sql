-- Preserve existing external identifiers before assigning local display IDs.
-- Client.id (the relation key for logs and reports) is never modified.
CREATE TEMP TABLE resident_id_capacity (count INTEGER CHECK(count <= 9000));
INSERT INTO resident_id_capacity SELECT COUNT(*) FROM "Client";
DROP TABLE resident_id_capacity;
ALTER TABLE "Client" ADD COLUMN "medicaidId" TEXT;
UPDATE "Client" SET "medicaidId" = "clientId";
-- Temporary namespace prevents collisions with existing numeric identifiers.
UPDATE "Client" SET "clientId" = '__resident_migration__' || "id";
WITH numbered AS (
 SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") + 999 AS number FROM "Client"
)
UPDATE "Client" SET "clientId" = (SELECT printf('%04d', number) FROM numbered WHERE numbered.id = "Client"."id");
CREATE UNIQUE INDEX "Client_medicaidId_key" ON "Client"("medicaidId");
