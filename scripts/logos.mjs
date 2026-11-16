// Generates the sm_ marks in dist/logos from Geist Mono outlines.
//
//   node scripts/logos.mjs
//
// Wordmarks: the lowercase name in Geist Mono 600, tracking -0.06em, then the
// lime cursor (0.46em x 0.11em, bottom on the baseline, 0.06em gap).
// Icons: the first letter (or the whole short name) in Geist Mono 700 with the
// heavy cursor (0.50em x 0.19em) on a tile. Products sit on a dark tile; sm_
// ships on lime and on dark while the site's favicon is decided.
//
// The SVGs hold outlines only, so no font ships. PNGs are rendered with the
// Playwright Chromium already on the machine. Outputs are committed; CI does
// not run this script.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const tokens = JSON.parse(readFileSync(resolve(root, "tokens.json"), "utf8"));
const colour = Object.fromEntries(tokens.color.tokens.map((t) => [t.name, t.value]));
const C = {
  ground: colour.ground.dark,
  inkDark: colour.ink.dark,
  inkLight: colour.ink.light,
  signal: colour.signal.dark,
  onSignal: colour["on-signal"].dark,
};

function font(weight) {
  const file = require.resolve(`@fontsource/geist-mono/files/geist-mono-latin-${weight}-normal.woff`);
  const buf = readFileSync(file);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}
const F600 = font(600);
const F700 = font(700);

const r = (n) => Math.round(n * 100) / 100;

/** Outline `text` at `size`, then the cursor. Returns path data and bounds in a
 *  coordinate space whose origin is the start of the baseline. */
function setMark(f, text, size, cursor) {
  const em = size;
  const tracking = -0.06 * em;
  let x = 0;
  const parts = [];
  for (const ch of text) {
    const g = f.charToGlyph(ch);
    parts.push(g.getPath(x, 0, size).toPathData(2));
    x += (g.advanceWidth / f.unitsPerEm) * size + tracking;
  }
  const letters = f.getPath(text, 0, 0, size, { letterSpacing: -0.06 }).getBoundingBox();
  const cx = x + 0.06 * em;
  const cw = cursor.w * em;
  const ch = cursor.h * em;
  return {
    d: parts.join(" "),
    cursor: { x: r(cx), y: r(-ch), w: r(cw), h: r(ch) },
    box: { x1: Math.min(letters.x1, 0), y1: letters.y1, x2: cx + cw, y2: Math.max(letters.y2, 0) },
  };
}

function wordmark(name, ink) {
  const m = setMark(F600, name, 1000, { w: 0.46, h: 0.11 });
  const { x1, y1, x2, y2 } = m.box;
  const vb = [r(x1), r(y1), r(x2 - x1), r(y2 - y1)].join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${name}"><path fill="${ink}" d="${m.d}"/><rect fill="${C.signal}" x="${m.cursor.x}" y="${m.cursor.y}" width="${m.cursor.w}" height="${m.cursor.h}"/></svg>\n`;
}

/** An icon tile. `fill` is the share of the tile the mark may span. */
function tile(text, { bg, ink, cursor, radius, fill, weight = 700, heavy = true }) {
  const S = 1024;
  const f = weight === 700 ? F700 : F600;
  const cur = heavy ? { w: 0.5, h: 0.19 } : { w: 0.46, h: 0.11 };
  const probe = setMark(f, text, 1000, cur);
  const pw = probe.box.x2 - probe.box.x1;
  const ph = probe.box.y2 - probe.box.y1;
  const size = 1000 * Math.min((fill * S) / pw, (fill * 0.75 * S) / ph);
  const m = setMark(f, text, size, cur);
  const w = m.box.x2 - m.box.x1;
  const h = m.box.y2 - m.box.y1;
  const tx = r((S - w) / 2 - m.box.x1);
  const ty = r((S - h) / 2 - m.box.y1);
  const rx = radius ? ` rx="${r(radius * S)}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" role="img" aria-label="${text}_"><rect width="${S}" height="${S}"${rx} fill="${bg}"/><g transform="translate(${tx} ${ty})"><path fill="${ink}" d="${m.d}"/><rect fill="${cursor}" x="${m.cursor.x}" y="${m.cursor.y}" width="${m.cursor.w}" height="${m.cursor.h}"/></g></svg>\n`;
}

const DARK = { bg: C.ground, ink: C.inkDark, cursor: C.signal };
const LIME = { bg: C.signal, ink: C.onSignal, cursor: C.onSignal };

// Icon letters: one per product; two when another product already has the letter.
const marks = [
  { id: "sm", name: "sm", icons: { "sm-lime": ["sm", LIME], "sm-dark": ["sm", DARK] } },
  { id: "planning-poker", name: "planning-poker", icons: { "planning-poker": ["p", DARK] } },
  { id: "rollin", name: "rollin", icons: { rollin: ["r", DARK] } },
];

const out = resolve(root, "dist/logos");
mkdirSync(out, { recursive: true });
const pngJobs = [];

for (const m of marks) {
  writeFileSync(resolve(out, `${m.id}-wordmark-dark.svg`), wordmark(m.name, C.inkDark));
  writeFileSync(resolve(out, `${m.id}-wordmark-light.svg`), wordmark(m.name, C.inkLight));
  for (const [id, [text, look]] of Object.entries(m.icons)) {
    // Favicon: 2px corners at 32px (1/16 of the tile).
    const fav = tile(text, { ...look, radius: 1 / 16, fill: 0.72 });
    // App icon with its own corners; maskable and Apple icons fill the square and
    // keep the mark inside the 80% safe zone so the platform mask never clips it.
    const app = tile(text, { ...look, radius: 1 / 8, fill: 0.62, weight: 600, heavy: false });
    const full = tile(text, { ...look, radius: 0, fill: 0.5, weight: 600, heavy: false });
    writeFileSync(resolve(out, `${id}-favicon.svg`), fav);
    writeFileSync(resolve(out, `${id}-icon.svg`), app);
    pngJobs.push(
      [`${id}-favicon-16.png`, fav, 16],
      [`${id}-favicon-32.png`, fav, 32],
      [`${id}-apple-touch-icon.png`, full, 180],
      [`${id}-icon-192.png`, app, 192],
      [`${id}-icon-512.png`, app, 512],
      [`${id}-icon-maskable-512.png`, full, 512],
    );
  }
}

let chromium;
try {
  // require (not import) so a machine-wide Playwright is found through NODE_PATH.
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright is not installed here; wrote the SVGs but no PNGs.");
  process.exit(1);
}
const browser = await chromium.launch(
  process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
);
for (const [name, svg, size] of pngJobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.screenshot({ path: resolve(out, name), omitBackground: true });
  await page.close();
}
await browser.close();
console.log(`wrote ${marks.length * 2} wordmarks and ${pngJobs.length} PNGs to dist/logos`);
