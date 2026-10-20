CREATE TABLE "ShiftAssignment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "staffId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "shift" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShiftAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ShiftAssignment_staffId_date_shift_key" ON "ShiftAssignment"("staffId", "date", "shift");
CREATE INDEX "ShiftAssignment_date_shift_idx" ON "ShiftAssignment"("date", "shift");
