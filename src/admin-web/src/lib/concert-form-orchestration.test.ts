import assert from "node:assert/strict";
import test from "node:test";

const moduleUrl = new URL("./concert-form-orchestration.ts", import.meta.url)
  .href;
const { getPostCreateStatusPatch } = (await import(
  moduleUrl
)) as typeof import("./concert-form-orchestration");

test("keeps a new draft without an unnecessary status patch", () => {
  assert.equal(getPostCreateStatusPatch("draft"), null);
});

test("applies every requested non-draft status after draft creation", () => {
  assert.deepEqual(getPostCreateStatusPatch("published"), {
    status: "published",
  });
  assert.deepEqual(getPostCreateStatusPatch("canceled"), {
    status: "canceled",
  });
});
