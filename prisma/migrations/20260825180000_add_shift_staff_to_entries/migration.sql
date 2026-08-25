ALTER TABLE "CBHSEntry" ADD COLUMN "firstShiftStaffId" TEXT;
ALTER TABLE "CBHSEntry" ADD COLUMN "secondShiftStaffId" TEXT;

CREATE INDEX "CBHSEntry_firstShiftStaffId_idx" ON "CBHSEntry"("firstShiftStaffId");
CREATE INDEX "CBHSEntry_secondShiftStaffId_idx" ON "CBHSEntry"("secondShiftStaffId");
