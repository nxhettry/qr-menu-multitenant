import test from "node:test";
import assert from "node:assert/strict";
import { publicMenuSchema } from "../src/lib/menu/schema.ts";
import { demoMenu } from "../src/lib/menu/demo.ts";
import { accessibleAccent, cloudinaryImageUrl, formatPrice, openingHoursEntries, phoneHref, safeMapUrl } from "../src/lib/menu/presentation.ts";

test("public projection accepts published, unavailable, and missing menus while stripping private fields", () => {
  assert.equal(publicMenuSchema.parse({ ...demoMenu, memberships: ["private"], notes: "private" }).status, "PUBLISHED");
  assert(!Object.hasOwn(publicMenuSchema.parse({ ...demoMenu, memberships: ["private"] }), "memberships"));
  assert.deepEqual(publicMenuSchema.parse({ status: "UNAVAILABLE", name: "Private draft" }), { status: "UNAVAILABLE" });
  assert.equal(publicMenuSchema.parse(null), null);
  assert.equal(publicMenuSchema.safeParse({ ...demoMenu, categories: [{ ...demoMenu.categories[0], items: [{ ...demoMenu.categories[0].items[0], priceMinor: -1 }] }] }).success, false);
});

test("public links reject executable URLs, credentials, and malformed phone numbers", () => {
  for (const url of ["javascript:alert(1)", "//example.com", "http://example.com", "https://user:pass@example.com", "bad url"]) assert.equal(safeMapUrl(url), null);
  assert.equal(safeMapUrl("https://maps.google.com/?q=Kathmandu"), "https://maps.google.com/?q=Kathmandu");
  assert.equal(phoneHref("+977 (980) 123-4567"), "tel:+9779801234567");
  for (const value of ["javascript:alert(1)", "+977#12", "123", "1234567890123456"]) assert.equal(phoneHref(value), null);
});

test("Cloudinary delivery requires a configured account, safe ID and immutable version", () => {
  assert.equal(cloudinaryImageUrl("demo", "menus/food", 12, 320, 240), "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_fill,w_320,h_240/v12/menus/food");
  for (const id of ["../private", "https://example.com/a", "menus//food", "a?b=c", "v1/a.jpg"]) assert.equal(cloudinaryImageUrl("demo", id, 12, 320, 240), null);
  assert.equal(cloudinaryImageUrl(undefined, "food", 12, 320, 240), null);
  assert.equal(cloudinaryImageUrl("demo", "food", null, 320, 240), null);
  assert.equal(cloudinaryImageUrl("demo", "food", 12, 99999, 240), null);
});

test("theme accents meet 4.5:1 contrast against the menu background", () => {
  const luminance = hex => [1, 3, 5].reduce((sum, index, i) => {
    const c = parseInt(hex.slice(index, index + 2), 16) / 255;
    return sum + (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][i];
  }, 0);
  for (const color of ["#ffffff", "#ffff00", "#00ff00", "#ff0000", "#000000", "#9a3412", "invalid"]) {
    assert((luminance("#faf8f2") + 0.05) / (luminance(accessibleAccent(color)) + 0.05) >= 4.5, color);
  }
});

test("menu presentation preserves paisa precision and bounds unstructured opening hours", () => {
  assert.equal(formatPrice(18000), "Rs 180");
  assert.equal(formatPrice(18005), "Rs 180.05");
  assert.equal(formatPrice(0), "Rs 0");
  assert.deepEqual(openingHoursEntries({ Monday: "09:00–21:00", Tuesday: { bad: "data" }, Wednesday: "x".repeat(101) }), [["Monday", "09:00–21:00"]]);
});
