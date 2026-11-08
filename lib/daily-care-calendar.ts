import { validMonth } from "@/lib/monthly-progress";

export function daysInMonth(month: string) {
  if (!validMonth(month)) throw new Error("Invalid month.");
  const count = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate();
  return Array.from({ length: count }, (_, day) => `${month}-${String(day + 1).padStart(2, "0")}`);
}
export function adjacentMonth(month: string, offset: number) {
  if (!validMonth(month)) throw new Error("Invalid month.");
  const result = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 1 + offset, 1)).toISOString().slice(0, 7);
  return validMonth(result) ? result : null;
}
