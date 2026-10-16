import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const base = "http://127.0.0.1:3147";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3147"], {
  windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
server.stdout.on("data", data => { output = (output + data).slice(-4000); });
server.stderr.on("data", data => { output = (output + data).slice(-4000); });
try {
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (server.exitCode !== null) throw new Error("Local test server exited before becoming ready.");
    try { if (output.includes("Ready") && (await fetch(`${base}/api/health`)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert(ready, "Local test server did not become ready");
  for (const path of ["/", "/setup", "/momo-house", "/login", "/register", "/forgot-password", "/reset-password"]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    const body = await response.text();
    if (path === "/momo-house") assert(body.includes("Momo House") && body.includes("Chicken"));
    if (["/login", "/register", "/forgot-password", "/reset-password"].includes(path)) {
      assert(response.headers.get("cache-control")?.includes("no-store"), `${path} must not be cached`);
    }
    console.log(`PASS ${path}`);
  }
  const privateApi = await fetch(`${base}/api/dashboard/restaurants`);
  assert.equal(privateApi.status, 401);
  assert(privateApi.headers.get("cache-control")?.includes("no-store"));
  assert.deepEqual(await privateApi.json(), { error: "Sign in required" });
  console.log("PASS anonymous private API: 401, no-store, no restaurant data");
  for (const path of ["/dashboard", "/onboarding"]) {
    const response = await fetch(base + path, { redirect: "manual" });
    const body = await response.text();
    // Suspense redirects may stream as a 200 plus a Next redirect instruction.
    assert(response.headers.get("location")?.includes("/login") || body.includes("/login"), path);
    assert(response.headers.get("cache-control")?.includes("no-store"), path);
    assert(!body.includes("Signed in as"));
    console.log(`PASS anonymous ${path}: redirects to login, no-store`);
  }
  const callback = await fetch(`${base}/auth/callback?next=https://example.com`, { redirect: "manual" });
  assert.equal(callback.status, 302);
  assert.equal(new URL(callback.headers.get("location")).pathname, "/login");
  assert(!callback.headers.get("location").includes("example.com"));
  assert(callback.headers.get("cache-control")?.includes("no-store"));
  console.log("PASS callback: safe redirect and no-store");
  const qr = await fetch(`${base}/q/7Kx2pQa`, { redirect: "manual" });
  assert.equal(qr.status, 302);
  assert.equal(new URL(qr.headers.get("location")).pathname, "/momo-house");
  assert(qr.headers.get("cache-control")?.includes("no-store"));
  console.log("PASS QR redirect remains 302 and no-store");
} catch (error) {
  console.error(error.message);
  if (output) console.error(output);
  process.exitCode = 1;
} finally {
  server.kill();
}
