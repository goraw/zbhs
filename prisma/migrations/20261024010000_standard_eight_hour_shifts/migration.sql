-- Standardize the three shifts while retaining any historical cover records.
UPDATE "WorkShift" SET "startMinute" = 360, "endMinute" = 840, "isActive" = true WHERE "id" = 'hr-first';
UPDATE "WorkShift" SET "startMinute" = 840, "endMinute" = 1320, "isActive" = true WHERE "id" = 'hr-second';
UPDATE "WorkShift" SET "startMinute" = 1320, "endMinute" = 360, "isActive" = true WHERE "id" = 'hr-third';
UPDATE "WorkShift" SET "isActive" = false WHERE "id" = 'hr-cover';
