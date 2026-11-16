// Copies this release of sm-core into a product repo.
//
//   node scripts/sync.mjs <target-dir>
//   e.g. node ../sm-core/scripts/sync.mjs vendor/sm-core   (run from the product repo)
//
// Writes the generated CSS, tokens.json and logos, a manifest.json with the
// version and a SHA-256 of every file, and verify.mjs. The product's CI runs
// `node vendor/sm-core/verify.mjs` so a hand edit to the copy fails the build.
// Check out the release tag (e.g. v26.11) in sm-core before syncing.
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2];
if (!target) {
  console.error("usage: node scripts/sync.mjs <target-dir>");
  process.exit(2);
}
const dest = resolve(process.cwd(), target);
const version = readFileSync(resolve(root, "VERSION"), "utf8").trim();

const sources = [
  "tokens.json",
  "dist/sm-core.css",
  "dist/sm-tailwind.css",
  ...readdirSync(resolve(root, "dist/logos")).map((f) => `dist/logos/${f}`),
];

rmSync(dest, { recursive: true, force: true });
const files = {};
for (const src of sources) {
  const rel = src.replace(/^dist\//, "");
  const to = join(dest, rel);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(resolve(root, src), to);
  files[rel] = createHash("sha256").update(readFileSync(to)).digest("hex");
}
copyFileSync(resolve(root, "scripts/verify.mjs"), join(dest, "verify.mjs"));
writeFileSync(
  join(dest, "manifest.json"),
  `${JSON.stringify({ name: "sm-core", version, files }, null, 2)}\n`,
);
console.log(`synced sm-core ${version} (${Object.keys(files).length} files) to ${relative(process.cwd(), dest) || "."}`);
