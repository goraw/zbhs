-- CreateTable
CREATE TABLE "WeeklySummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "weekEnd" DATETIME NOT NULL,
    "narrative" TEXT NOT NULL,
    "unusualEvents" TEXT,
    "interventionsUsed" TEXT NOT NULL,
    "effectiveness" TEXT NOT NULL,
    "attestationName" TEXT,
    "signatureText" TEXT,
    "signatureTimestamp" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WeeklySummary_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WeeklySummary_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklySummary_clientId_weekStart_key" ON "WeeklySummary"("clientId", "weekStart");

-- CreateIndex
CREATE INDEX "WeeklySummary_clientId_idx" ON "WeeklySummary"("clientId");

-- CreateIndex
CREATE INDEX "WeeklySummary_staffId_idx" ON "WeeklySummary"("staffId");

-- CreateIndex
CREATE INDEX "WeeklySummary_status_idx" ON "WeeklySummary"("status");
