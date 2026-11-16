// Verifies a synced copy of sm-core against its manifest.
//
//   node vendor/sm-core/verify.mjs
//
// Fails if any file was edited, added or removed. To change the brand, change
// sm-core, cut a release and sync it again; never edit the copy.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(here, "manifest.json"), "utf8"));
const problems = [];

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [relative(here, p).split("\\").join("/")];
  });
}

const present = new Set(walk(here).filter((f) => f !== "manifest.json" && f !== "verify.mjs"));
for (const [file, hash] of Object.entries(manifest.files)) {
  if (!present.has(file)) {
    problems.push(`missing ${file}`);
    continue;
  }
  present.delete(file);
  const got = createHash("sha256").update(readFileSync(join(here, file))).digest("hex");
  if (got !== hash) problems.push(`edited ${file}`);
}
for (const file of present) problems.push(`unexpected ${file}`);

if (problems.length) {
  console.error(`sm-core ${manifest.version} copy has drifted:\n${problems.map((p) => `  ✗ ${p}`).join("\n")}`);
  console.error("Change sm-core and sync a release instead of editing this copy.");
  process.exit(1);
}
console.log(`✓ sm-core ${manifest.version} copy matches its manifest`);
