import { test } from "node:test";
import assert from "node:assert/strict";
import { nextResidentId } from "../lib/resident-id";

test("Resident IDs are four digits and skip existing values", () => {
  assert.equal(nextResidentId([]), "1000");
  assert.equal(nextResidentId(["1000", "1002"]), "1001");
});

test("exhausted ID range fails explicitly", () => {
  assert.throws(() => nextResidentId(Array.from({ length: 9000 }, (_, i) => String(i + 1000))));
});
