CREATE TABLE "DailyCareNote" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "clientId" TEXT NOT NULL,
 "staffId" TEXT NOT NULL,
 "date" TEXT NOT NULL,
 "note" TEXT NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1,
 "deletedAt" DATETIME,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" DATETIME NOT NULL,
 CONSTRAINT "DailyCareNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "DailyCareNote_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "DailyCareNote_clientId_date_idx" ON "DailyCareNote"("clientId", "date");
CREATE INDEX "DailyCareNote_deletedAt_date_idx" ON "DailyCareNote"("deletedAt", "date");
