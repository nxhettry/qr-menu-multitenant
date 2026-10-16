import test from "node:test";
import assert from "node:assert/strict";
import { safeNextPath } from "../src/lib/auth/redirect.ts";
import { restaurantSchema } from "../src/lib/auth/schemas.ts";

test("confirmation redirects accept only application destinations", () => {
  for (const value of ["https://example.com", "//example.com", "/\\example.com", "/dashboard?next=https://example.com", "javascript:alert(1)", "", null]) {
    assert.equal(safeNextPath(value), "/dashboard");
  }
  assert.equal(safeNextPath("/onboarding"), "/onboarding");
  assert.equal(safeNextPath("/reset-password"), "/reset-password");
});
test("restaurant inputs reject reserved, malformed, or oversized slugs", () => {
  for (const slug of ["dashboard", "auth", "onboarding", "setup", "momo-house", "bad slug", "-bad", "bad-", "ABCD", "ab", "x".repeat(41)]) {
    assert.equal(restaurantSchema.safeParse({ name: "Momo House", slug }).success, false, slug);
  }
  assert.equal(restaurantSchema.safeParse({ name: "Momo House", slug: "momo-house-thamel" }).success, true);
});
