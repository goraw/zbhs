PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MonthlyProgress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SAVED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "completedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- Preserve content, authorship, timestamps, and all existing revision records.
INSERT INTO "new_MonthlyProgress" (id,clientId,month,staffId,authorName,content,status,version,completedAt,createdAt,updatedAt)
  SELECT id,clientId,month,staffId,authorName,content,'SAVED',version,completedAt,createdAt,updatedAt FROM "MonthlyProgress";
DROP TABLE "MonthlyProgress";
ALTER TABLE "new_MonthlyProgress" RENAME TO "MonthlyProgress";
CREATE UNIQUE INDEX "MonthlyProgress_clientId_month_key" ON "MonthlyProgress"("clientId","month");
CREATE INDEX "MonthlyProgress_month_status_idx" ON "MonthlyProgress"("month","status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
