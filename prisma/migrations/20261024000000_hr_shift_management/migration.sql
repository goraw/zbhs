CREATE TABLE "WorkShift" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "startMinute" INTEGER NOT NULL,
  "endMinute" INTEGER NOT NULL,
  "minimumStaff" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "legacyShift" TEXT
);
CREATE UNIQUE INDEX "WorkShift_name_key" ON "WorkShift"("name");
CREATE UNIQUE INDEX "WorkShift_legacyShift_key" ON "WorkShift"("legacyShift");
INSERT INTO "WorkShift" (id,name,startMinute,endMinute,legacyShift) VALUES
 ('hr-first','First shift',360,840,'FIRST'),
 ('hr-cover','Afternoon cover',840,960,NULL),
 ('hr-second','Second shift',960,1320,'SECOND'),
 ('hr-third','Night shift',1320,360,'THIRD');

CREATE TABLE "new_ShiftAssignment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "staffId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "shift" TEXT,
  "workShiftId" TEXT NOT NULL DEFAULT 'hr-first',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShiftAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ShiftAssignment_workShiftId_fkey" FOREIGN KEY ("workShiftId") REFERENCES "WorkShift" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ShiftAssignment" (id,staffId,date,shift,workShiftId,createdAt)
 SELECT id,staffId,date,shift,CASE shift WHEN 'SECOND' THEN 'hr-second' WHEN 'THIRD' THEN 'hr-third' ELSE 'hr-first' END,createdAt FROM "ShiftAssignment";
DROP TABLE "ShiftAssignment";
ALTER TABLE "new_ShiftAssignment" RENAME TO "ShiftAssignment";
CREATE UNIQUE INDEX "ShiftAssignment_staffId_date_shift_key" ON "ShiftAssignment"("staffId","date","shift");
CREATE UNIQUE INDEX "ShiftAssignment_staffId_date_workShiftId_key" ON "ShiftAssignment"("staffId","date","workShiftId");
CREATE INDEX "ShiftAssignment_date_shift_idx" ON "ShiftAssignment"("date","shift");
CREATE TABLE "ShiftRevocation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "staffId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "workShiftId" TEXT NOT NULL,
  CONSTRAINT "ShiftRevocation_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ShiftRevocation_workShiftId_fkey" FOREIGN KEY ("workShiftId") REFERENCES "WorkShift" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ShiftRevocation_staffId_date_workShiftId_key" ON "ShiftRevocation"("staffId","date","workShiftId");
CREATE INDEX "ShiftRevocation_date_idx" ON "ShiftRevocation"("date");
