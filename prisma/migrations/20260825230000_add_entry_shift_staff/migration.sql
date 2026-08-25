ALTER TABLE "CBHSEntry" ADD COLUMN "shift" TEXT NOT NULL DEFAULT 'FIRST';
ALTER TABLE "CBHSEntry" ADD COLUMN "shiftStaffId" TEXT;

CREATE INDEX "CBHSEntry_shift_idx" ON "CBHSEntry"("shift");
CREATE INDEX "CBHSEntry_shiftStaffId_idx" ON "CBHSEntry"("shiftStaffId");
