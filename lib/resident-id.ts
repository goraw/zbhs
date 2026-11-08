export function nextResidentId(existing: readonly string[]): string {
  const used = new Set(existing);
  for (let value = 1000; value <= 9999; value++) {
    const candidate = String(value);
    if (!used.has(candidate)) return candidate;
  }
  throw new Error("All four-digit Resident IDs are in use.");
}
