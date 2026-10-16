import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

export async function checkEditorBrowser({ base, cookie, restaurantId, draftId }) {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? (process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : undefined) });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const separator = cookie.indexOf("=");
    await context.addCookies([{ name: cookie.slice(0, separator), value: cookie.slice(separator + 1), url: base, sameSite: "Lax" }]);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const snapshotPath = `/api/dashboard/restaurants/${restaurantId}/menu`;
    async function save(button) {
      const refreshed = page.waitForResponse(response => response.url().includes(snapshotPath) && response.request().method() === "GET" && response.status() === 200);
      await button.click();
      return (await refreshed).json();
    }
    await page.goto(`${base}/dashboard/${restaurantId}`);
    await page.getByRole("heading", { name: "Your menu", exact: true }).waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "editor must fit a phone viewport");
    await page.getByRole("button", { name: "+ Add category", exact: true }).click();
    await page.getByLabel("Category name", { exact: true }).fill("Browser specials");
    await page.getByLabel("Nepali name (optional)", { exact: true }).fill("विशेष परिकार");
    await save(page.getByRole("button", { name: "Save category", exact: true }));
    const category = page.locator("section").filter({ has: page.getByRole("heading", { name: "Browser specials", exact: true }) });
    await category.getByRole("button", { name: "+ Add item", exact: true }).click();
    await page.getByLabel("Item name", { exact: true }).fill("Phone momo");
    await page.getByLabel("Price (Rs)", { exact: true }).fill("220.05");
    await save(page.getByRole("button", { name: "Save item", exact: true }));
    const item = category.locator("li").filter({ has: page.getByRole("heading", { name: "Phone momo", exact: true }) });
    await save(item.getByRole("button", { name: "Available today", exact: true }));
    await item.getByRole("button", { name: "Sold out", exact: true }).waitFor();
    await item.getByRole("button", { name: "Edit item", exact: true }).click();
    await page.getByLabel(/Use variants/).check();
    await page.getByRole("button", { name: "+ Add variant", exact: true }).click();
    await page.getByLabel("Variant name", { exact: true }).nth(0).fill("Veg");
    await page.getByLabel("Price (Rs)", { exact: true }).nth(0).fill("180.01");
    await page.getByRole("button", { name: "+ Add variant", exact: true }).click();
    await page.getByLabel("Variant name", { exact: true }).nth(1).fill("Buff");
    await page.getByLabel("Price (Rs)", { exact: true }).nth(1).fill("220.05");
    await page.getByRole("button", { name: "Move variant 2 up", exact: true }).click();
    const variants = await save(page.getByRole("button", { name: "Save item", exact: true }));
    const savedItem = variants.categories.flatMap(category => category.items).find(item => item.name === "Phone momo");
    assert.deepEqual(savedItem.variants.map(variant => [variant.name, variant.price_minor]), [["Buff", 22005], ["Veg", 18001]]);
    const reordered = await save(category.getByRole("button", { name: "Move Browser specials up", exact: true }));
    assert.equal(reordered.categories[0].name, "Browser specials");
    await item.locator("summary").filter({ hasText: "Item photo" }).click();
    await item.getByLabel("Upload item image", { exact: true }).setInputFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("not a real image") });
    await item.getByText("Choose a still JPEG, PNG, or WebP image smaller than 3 MB and 20 megapixels.", { exact: true }).waitFor();

    await page.getByRole("button", { name: "Settings & images", exact: true }).click();
    await page.getByLabel("Restaurant name", { exact: true }).fill("Browser Kitchen");
    await page.getByLabel("Menu address", { exact: false }).fill("browser-kitchen");
    await page.getByLabel("Theme color", { exact: false }).fill("#ffffff");
    await save(page.getByRole("button", { name: "Save settings", exact: true }));
    await page.getByRole("heading", { name: "Browser Kitchen", exact: true }).waitFor();
    const old = await fetch(`${base}/renamed-kitchen`, { redirect: "manual" });
    assert.equal(old.status, 301);
    assert.equal(new URL(old.headers.get("location"), base).pathname, "/browser-kitchen");
    const previewOpened = context.waitForEvent("page");
    await page.getByRole("link", { name: "Phone preview ↗", exact: true }).click();
    const preview = await previewOpened;
    await preview.getByRole("heading", { name: "Phone momo", exact: true }).waitFor();
    await preview.close();
    await page.getByRole("button", { name: "Unpublish", exact: true }).click();
    await save(page.getByRole("button", { name: "Unpublish menu", exact: true }));
    assert((await (await fetch(`${base}/browser-kitchen`)).text()).includes("isn’t available right now"));
    await save(page.getByRole("button", { name: "Publish menu", exact: true }));
    assert((await (await fetch(`${base}/browser-kitchen`)).text()).includes("Phone momo"));
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page.getByRole("heading", { name: "Phone momo", exact: true }).waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "saved menu must fit a phone viewport");
    await mkdir("artifacts", { recursive: true });
    await page.screenshot({ path: "artifacts/owner-editor-mobile.png", fullPage: true });

    await page.goto(`${base}/dashboard/${draftId}`);
    await page.getByRole("heading", { name: "Secret Draft Name", exact: true }).waitFor();
    assert.equal(await page.getByRole("heading", { name: "Phone momo", exact: true }).count(), 0);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.waitForURL("**/login");
    await page.goto(`${base}/dashboard/${restaurantId}`);
    await page.waitForURL("**/login");
    assert.equal(await page.getByRole("heading", { name: "Browser Kitchen", exact: true }).count(), 0);
    assert.deepEqual(errors, [], "browser must not report unhandled errors");
    console.log("PASS mobile browser category/item/variant forms, reordering, image validation, settings/rename, preview, publishing, tenant switch and logout");
  } finally { await browser.close(); }
}
