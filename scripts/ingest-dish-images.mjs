import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { imageRoot, masterSize, providers } from "./image-library/style.mjs";
import { loadCatalog, loadSet, validateSets } from "./image-library/catalog.mjs";

const extensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const setName = process.argv[2] ?? "pilot";
const catalog = await loadCatalog();
const owners = await validateSets(catalog);
const slugs = new Set(owners.keys());
const dishes = await loadSet(setName);
const names = new Map([...catalog].map(([slug, { name }]) => [slug, name]));

async function ingestProvider(provider) {
  const sourceDir = path.join(imageRoot, provider);
  const outDir = path.join(imageRoot, "processed", provider);
  await mkdir(outDir, { recursive: true });
  const files = (await readdir(sourceDir).catch(() => [])).filter(file => extensions.has(path.extname(file).toLowerCase()));
  const done = new Set();
  const unknown = [];
  for (const file of files) {
    const slug = path.basename(file, path.extname(file));
    if (!slugs.has(slug)) { unknown.push(file); continue; }
    await sharp(path.join(sourceDir, file)).resize({ ...masterSize, fit: "cover" }).webp({ quality: 82 }).toFile(path.join(outDir, `${slug}.webp`));
    done.add(slug);
  }
  return { provider, done, unknown };
}

const escapeHtml = value => String(value).replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
const results = [];
for (const provider of providers) results.push(await ingestProvider(provider));
const setSlugs = new Set(dishes.map(dish => dish.slug));

const figure = (slug, provider) => `<figure><img src="processed/${provider}/${slug}.webp" loading="lazy" alt="${escapeHtml(names.get(slug))} by ${provider}"><figcaption>${provider}</figcaption></figure>`;
const missingFigure = `<figure class="missing"><div>missing</div></figure>`;
const cards = dishes.map(({ slug }) => {
  const figures = results.filter(({ done }) => done.has(slug)).map(({ provider }) => figure(slug, provider));
  return `<section><h2>${escapeHtml(names.get(slug))} <small>${slug}</small></h2><div class="pair">${figures.join("") || missingFigure}</div></section>`;
}).join("\n");

await writeFile(path.join(imageRoot, `${setName}-compare.html`), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${setName} comparison</title>
<style>body{font-family:system-ui,sans-serif;margin:0;padding:16px;background:#fafafa;color:#1c1917}h2{font-size:1rem;margin:24px 0 8px}small{color:#78716c;font-weight:400}.pair{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))}figure{margin:0}img,.missing div{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;display:block}.missing div{background:#e7e5e4;display:grid;place-items:center;color:#78716c}figcaption{font-size:.85rem;color:#57534e;margin-top:4px}</style></head><body><h1>${setName} comparison</h1>${cards}</body></html>`);

for (const { provider, done, unknown } of results) {
  console.log(`${provider}: ${[...done].filter(slug => setSlugs.has(slug)).length}/${dishes.length} of ${setName} (${done.size} total ingested)`);
  if (unknown.length) console.log(`  ignored (name must match a slug): ${unknown.join(", ")}`);
}
console.log(`Open ${imageRoot}/${setName}-compare.html`);
