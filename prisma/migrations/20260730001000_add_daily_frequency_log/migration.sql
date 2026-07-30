-- AlterTable
ALTER TABLE "CBHSEntry" ADD COLUMN "servicePeriods" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "CBHSEntry" ADD COLUMN "behaviorFrequencies" TEXT NOT NULL DEFAULT '{}';
