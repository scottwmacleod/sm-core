import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const P = "--sm-";

export function load(json) {
  const doc = JSON.parse(json);
  const ids = doc.color.themes.map((t) => t.id).join();
  if (ids !== "dark,light") throw new Error(`themes must be dark, light; got ${ids}`);
  return doc;
}

function colourBlock(doc, theme, indent) {
  let out = `${indent}color-scheme: ${theme};\n`;
  for (const t of doc.color.tokens) out += `${indent}${P}${t.name}: ${t.value[theme]};\n`;
  return out;
}

function typeStyles(doc) {
  return doc.type.groups.flatMap((g) => g.styles.map((s) => ({ ...s, family: g.family })));
}

const lh = (v) => (typeof v === "number" ? String(v) : v);

export function css(doc) {
  const v = doc.version;
  let o = `/* sm_ core ${v}: generated from tokens.json by scripts/build.mjs. Do not edit. */\n`;
  o += "\n";

  o += `:root,\n[data-theme="dark"] {\n${colourBlock(doc, "dark", "  ")}}\n\n`;
  o += `@media (prefers-color-scheme: light) {\n  :root:not([data-theme="dark"]) {\n${colourBlock(doc, "light", "    ")}  }\n}\n\n`;
  o += `[data-theme="light"] {\n${colourBlock(doc, "light", "  ")}}\n\n`;

  for (const f of doc.type.fallbacks) {
    o += `@font-face {\n  font-family: "${f.family}";\n  src: ${f.local.map((n) => `local("${n}")`).join(", ")};\n`;
    o += `  size-adjust: ${f.sizeAdjust};\n  ascent-override: ${f.ascent};\n  descent-override: ${f.descent};\n  line-gap-override: ${f.lineGap};\n}\n\n`;
  }

  o += ":root {\n";
  for (const [name, fam] of Object.entries(doc.type.families)) o += `  ${P}font-${name}: ${fam};\n`;
  for (const t of [...doc.spacing.tokens, ...doc.radius.tokens, ...doc.motion.tokens]) {
    o += `  ${P}${t.name}: ${t.value};\n`;
  }
  for (const s of typeStyles(doc)) {
    o += `  ${P}text-${s.name}: ${s.fontWeight} ${s.fontSize}/${lh(s.lineHeight)} var(${P}font-${s.family});\n`;
    if (s.letterSpacing) o += `  ${P}text-${s.name}-tracking: ${s.letterSpacing};\n`;
  }
  o += "}\n\n";

  const reduced = doc.motion.tokens.filter((t) => t.reduced !== undefined);
  o += "@media (prefers-reduced-motion: reduce) {\n  :root {\n";
  for (const t of reduced) o += `    ${P}${t.name}: ${t.reduced};\n`;
  o += "  }\n}\n\n";

  o += "@media (prefers-contrast: more) {\n";
  o += `  :root { ${P}ink-muted: var(${P}ink); ${P}line: var(${P}control-line); ${P}line-strong: var(${P}control-line); }\n}\n\n`;

  o += `@media print {\n  :root {\n${colourBlock(doc, "light", "    ")}  }\n}\n\n`;

  o += `@keyframes sm-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.sm-mark {
  display: inline-flex;
  align-items: baseline;
  font-family: var(${P}font-mono);
  font-weight: 600;
  letter-spacing: -0.06em;
  line-height: 1;
  color: var(${P}ink);
}

.sm-cursor {
  display: inline-block;
  width: 0.46em;
  height: 0.11em;
  margin-left: 0.06em;
  background: var(${P}signal);
  animation: sm-blink var(${P}duration-blink) steps(1) infinite;
}

.sm-credit {
  display: inline-flex;
  align-items: center;
  gap: var(${P}space-2);
  min-height: 44px;
  padding: 0 var(${P}space-3);
  border: 1px solid var(${P}control-line);
  border-radius: var(${P}radius-1);
  font: var(${P}text-ui-sm);
  color: var(${P}ink-muted);
  text-decoration: none;
  transition: border-color var(${P}duration-enter) var(${P}ease-out), color var(${P}duration-enter) var(${P}ease-out);
}

.sm-credit:hover { border-color: var(${P}signal-ink); color: var(${P}ink-body); }
.sm-credit:focus-visible { outline: 2px solid var(${P}signal-ink); outline-offset: 2px; }

@media (forced-colors: active) {
  .sm-cursor { background: CanvasText; }
  .sm-credit { border-color: LinkText; }
}

@media (prefers-reduced-motion: reduce) {
  .sm-cursor { animation: none; }
}

@media print {
  .sm-cursor { animation: none; }
}
`;
  return o;
}

export function orderProblems(text) {
  const base = text.indexOf("\n.sm-cursor {");
  const out = [];
  for (const m of text.matchAll(/\.sm-cursor \{ animation: none; \}/g)) {
    if (base === -1 || m.index < base) {
      out.push("dist/sm-core.css turns the cursor blink off before .sm-cursor sets it, so reduced motion and print still blink");
    }
  }
  return out;
}

export function tailwind(doc) {
  let o = `/* sm_ core ${doc.version}: Tailwind 4 theme, generated from tokens.json. Do not edit. */\n\n@theme inline {\n`;
  for (const t of doc.color.tokens) o += `  --color-${t.name}: var(${P}${t.name});\n`;
  for (const name of Object.keys(doc.type.families)) o += `  --font-${name}: var(${P}font-${name});\n`;
  for (const t of doc.spacing.tokens) o += `  --spacing-${t.name}: var(${P}${t.name});\n`;
  for (const t of doc.radius.tokens) o += `  --radius-${t.name.replace("radius-", "")}: var(${P}${t.name});\n`;
  for (const s of typeStyles(doc)) {
    o += `  --text-${s.name}: ${s.fontSize};\n`;
    o += `  --text-${s.name}--line-height: ${lh(s.lineHeight)};\n`;
    o += `  --text-${s.name}--font-weight: ${s.fontWeight};\n`;
    if (s.letterSpacing) o += `  --text-${s.name}--letter-spacing: ${s.letterSpacing};\n`;
  }
  for (const t of doc.motion.tokens.filter((t) => t.name.startsWith("ease-"))) {
    o += `  --ease-sm-${t.name.replace("ease-", "")}: var(${P}${t.name});\n`;
  }
  o += "}\n";
  return o;
}

function wcagLuminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function ratio(a, b) {
  const [hi, lo] = [wcagLuminance(a), wcagLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function problems(doc) {
  const out = [];
  if (!/^\d{2}\.(0[1-9]|1[0-2])(\.[1-9]\d*)?$/.test(String(doc.version))) {
    out.push(`version "${doc.version}" must be YY.MM or YY.MM.N`);
  }
  for (const f of doc.type.fallbacks) {
    if (!Object.values(doc.type.families).some((stack) => stack.includes(`"${f.family}"`))) {
      out.push(`fallback font "${f.family}" is in no family stack`);
    }
  }
  const names = [
    ...doc.color.tokens,
    ...doc.spacing.tokens,
    ...doc.radius.tokens,
    ...doc.motion.tokens,
  ].map((t) => t.name);
  const seen = new Set();
  for (const n of names) {
    if (!/^[a-z0-9-]+$/.test(n)) out.push(`invalid token name \`${n}\``);
    if (seen.has(n)) out.push(`duplicate token name \`${n}\``);
    seen.add(n);
  }
  const colour = Object.fromEntries(doc.color.tokens.map((t) => [t.name, t.value]));
  for (const pair of doc.contrast) {
    for (const bg of pair.bg) {
      for (const theme of ["dark", "light"]) {
        const f = colour[pair.fg]?.[theme];
        const g = colour[bg]?.[theme];
        if (!f || !g) {
          out.push(`contrast pair ${pair.fg} on ${bg}: unknown token`);
          continue;
        }
        const r = ratio(f, g);
        if (r < pair.min) out.push(`${theme}: ${pair.fg} on ${bg} is ${r.toFixed(2)}:1, needs ${pair.min}:1`);
      }
    }
  }
  return out;
}

function main() {
  const doc = load(readFileSync(resolve(root, "tokens.json"), "utf8"));
  const files = {
    "dist/sm-core.css": css(doc),
    "dist/sm-tailwind.css": tailwind(doc),
    VERSION: `${doc.version}\n`,
  };
  const issues = [...problems(doc), ...orderProblems(files["dist/sm-core.css"])];
  if (process.argv.includes("--check")) {
    for (const [path, want] of Object.entries(files)) {
      let have = "";
      try {
        have = readFileSync(resolve(root, path), "utf8");
      } catch {}
      if (have !== want) issues.push(`${path} is out of date: run \`npm run build\``);
    }
    if (issues.length) {
      console.error(issues.map((i) => `✗ ${i}`).join("\n"));
      process.exit(1);
    }
    console.log("✓ dist/ is current, names are valid, every contrast pair passes");
    return;
  }
  if (issues.length) {
    console.error(issues.map((i) => `✗ ${i}`).join("\n"));
    process.exit(1);
  }
  mkdirSync(resolve(root, "dist"), { recursive: true });
  for (const [path, body] of Object.entries(files)) writeFileSync(resolve(root, path), body);
  console.log(`wrote ${Object.keys(files).join(", ")}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
