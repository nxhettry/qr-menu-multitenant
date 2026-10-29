import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const markPath = (await readFile(new URL("./brand/restrofuel-mark.svg", import.meta.url), "utf8")).match(/ d="([^"]+)"/)[1];
const orange = { light: "#fb923c", base: "#ea580c", deep: "#c2410c" };
const font = "Avenir Next, Helvetica Neue, Arial, sans-serif";

const gradient = (id, from, to) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`;

// Stylised QR: three finder squares plus a few data modules on a 7×7 grid.
const dataModules = [[4, 0], [4, 2], [3, 3], [5, 3], [6, 4], [4, 4], [3, 5], [5, 6], [6, 6], [4, 6]];
function qrGlyph(x, y, size, fg) {
  const u = size / 7;
  const finder = (cx, cy) => `<rect x="${x + cx * u + u * 0.25}" y="${y + cy * u + u * 0.25}" width="${u * 2.5}" height="${u * 2.5}" rx="${u * 0.7}" fill="none" stroke="${fg}" stroke-width="${u * 0.5}"/><rect x="${x + cx * u + u * 0.95}" y="${y + cy * u + u * 0.95}" width="${u * 1.1}" height="${u * 1.1}" rx="${u * 0.3}" fill="${fg}"/>`;
  const dots = dataModules.map(([cx, cy]) => `<rect x="${x + cx * u + u * 0.12}" y="${y + cy * u + u * 0.12}" width="${u * 0.76}" height="${u * 0.76}" rx="${u * 0.22}" fill="${fg}"/>`).join("");
  return finder(0, 0) + finder(4, 0) + finder(0, 4) + dots;
}

// The "R" with its fork arm, isolated from the rest of the RestroFuel wordmark.
const rForkClip = `<clipPath id="r-fork"><polygon points="0,0 112,0 112,40 240,40 240,61 111,61 111,96 128,96 128,128.8 0,128.8"/></clipPath>`;

function iconSvg({ size, padding, rounded }) {
  const inner = size * (1 - padding * 2);
  const scale = inner / 240;
  const offsetY = (size - 128.8 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>${gradient("bg", orange.light, orange.deep)}${rForkClip}</defs>
  <rect width="${size}" height="${size}" rx="${rounded ? size * 0.225 : 0}" fill="url(#bg)"/>
  <g transform="translate(${size * padding} ${offsetY}) scale(${scale})">
    <path clip-path="url(#r-fork)" fill-rule="evenodd" fill="#fff" d="${markPath}"/>
    <rect x="136" y="70" width="62" height="58" rx="12" fill="#fff"/>
    ${qrGlyph(140, 72, 54, orange.deep)}
  </g>
</svg>`;
}

function logoSvg() {
  const width = 372, height = 128.8;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * 5}" height="${height * 5}" viewBox="0 0 ${width} ${height}">
  <defs>${gradient("ink", orange.light, orange.deep)}</defs>
  <path fill-rule="evenodd" fill="url(#ink)" d="${markPath}"/>
  <rect x="254" y="50" width="2.4" height="72" rx="1.2" fill="${orange.base}" opacity="0.35"/>
  <rect x="270" y="52" width="44" height="44" rx="11" fill="url(#ink)"/>
  ${qrGlyph(275, 57, 34, "#fff")}
  <text x="322" y="85" font-family="${font}" font-weight="700" font-size="30" fill="${orange.deep}" letter-spacing="-0.5">QR</text>
  <text x="270" y="120" font-family="${font}" font-weight="700" font-size="20.5" fill="${orange.base}" letter-spacing="7.2">MENU</text>
</svg>`;
}

// ICO container holding PNG frames (supported by every current browser).
function toIco(pngs) {
  const header = Buffer.alloc(6 + pngs.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map(p => p.data)]);
}

const png = (svg, size) => sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
const icon = size => png(iconSvg({ size: 512, padding: 0.1, rounded: true }), size);

await mkdir("public/icons", { recursive: true });
await writeFile("public/qr-menu-logo.png", await sharp(Buffer.from(logoSvg())).png({ compressionLevel: 9 }).toBuffer());
await writeFile("public/icons/icon-192.png", await icon(192));
await writeFile("public/icons/icon-512.png", await icon(512));
await writeFile("public/icons/maskable-512.png", await png(iconSvg({ size: 512, padding: 0.2, rounded: false }), 512));
await writeFile("src/app/icon.png", await icon(512));
await writeFile("src/app/apple-icon.png", await png(iconSvg({ size: 512, padding: 0.12, rounded: false }), 180));
await writeFile("src/app/favicon.ico", toIco(await Promise.all([16, 32, 48].map(async size => ({ size, data: await png(iconSvg({ size: 512, padding: 0.05, rounded: true }), size) })))));
console.log("Brand assets written.");
