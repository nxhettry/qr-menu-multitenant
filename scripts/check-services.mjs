import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { v2: cloudinary } = require("cloudinary");

let failed = false;
function report(service, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"} ${service}: ${detail}`);
  if (!ok) failed = true;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
let publicKey = Boolean(key?.startsWith("sb_publishable_"));
if (key?.split(".").length === 3) {
  try { publicKey = JSON.parse(Buffer.from(key.split(".")[1], "base64url")).role === "anon"; } catch {}
}
try {
  const endpoint = new URL(url);
  if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".supabase.co") || !publicKey) {
    report("Supabase", false, "Use your project API URL and a publishable/anon key, never a secret/service-role key.");
  } else {
    const response = await fetch(new URL("/auth/v1/settings", endpoint), {
      headers: { apikey: key }, signal: AbortSignal.timeout(15000),
    });
    report("Supabase", response.ok, response.ok ? "Project Auth API accepts the configured key." : `Auth API returned HTTP ${response.status}.`);
  }
} catch {
  report("Supabase", false, "Could not reach the project Auth API; check URL and network access.");
}

const cloudConfig = {
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};
if (Object.values(cloudConfig).some(value => !value)) {
  report("Cloudinary", false, "Cloud name, API key, or API secret is missing.");
} else {
  try {
    cloudinary.config({ ...cloudConfig, secure: true, timeout: 15000 });
    const response = await cloudinary.api.ping();
    report("Cloudinary", response.status === "ok", "Authenticated read-only API ping completed.");
  } catch (error) {
    report("Cloudinary", false, error.http_code ? `API returned HTTP ${error.http_code}.` : "Could not reach the authenticated API; check settings and network access.");
  }
}
process.exitCode = failed ? 1 : 0;
