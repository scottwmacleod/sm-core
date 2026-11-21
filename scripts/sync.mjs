import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const markerAt = (text) => text.search(/^<!-- product -->$/m);

export const INSTALL = {
  "tooling/github/pull_request_template.md": ".github/pull_request_template.md",
  "tooling/github/ISSUE_TEMPLATE/bug-report.yml": ".github/ISSUE_TEMPLATE/bug-report.yml",
  "tooling/github/ISSUE_TEMPLATE/feature-request.yml": ".github/ISSUE_TEMPLATE/feature-request.yml",
  "tooling/agents/issue-tracker.md": "docs/agents/issue-tracker.md",
  "tooling/agents/triage-labels.md": "docs/agents/triage-labels.md",
  "tooling/agents/domain.md": "docs/agents/domain.md",
  "tooling/agents/sm-conventions.md": "docs/agents/sm-conventions.md",
  "tooling/skills/delete-comment/SKILL.md": ".claude/skills/delete-comment/SKILL.md",
  "tooling/oxfmtrc.json": ".oxfmtrc.json",
};

const sha = (buf) => createHash("sha256").update(buf).digest("hex");
const slash = (p) => p.split("\\").join("/");

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const target = process.argv[2];
  if (!target) {
    console.error("usage: node scripts/sync.mjs <target-dir>   (run from the product repo root)");
    process.exit(2);
  }
  const product = process.cwd();
  const dest = resolve(product, target);
  const version = readFileSync(resolve(root, "VERSION"), "utf8").trim();

  const sources = [
    "tokens.json",
    "dist/sm-core.css",
    "dist/sm-tailwind.css",
    ...walk(resolve(root, "dist/logos")).map((p) => slash(relative(root, p))),
    ...walk(resolve(root, "tooling")).map((p) => slash(relative(root, p))),
  ];

  rmSync(dest, { recursive: true, force: true });
  const files = {};
  for (const src of sources) {
    const rel = src.replace(/^dist\//, "");
    const to = join(dest, rel);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(resolve(root, src), to);
    files[rel] = sha(readFileSync(to));
  }

  const installed = {};
  for (const [from, to] of Object.entries(INSTALL)) {
    const out = resolve(product, to);
    let body = readFileSync(resolve(root, from), "utf8");
    if (markerAt(body) !== -1 && existsSync(out)) {
      const old = readFileSync(out, "utf8");
      if (markerAt(old) !== -1) body = body.slice(0, markerAt(body)) + old.slice(markerAt(old));
    }
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, body);
    installed[to] = from.replace(/^dist\//, "");
  }

  copyFileSync(resolve(root, "scripts/verify.mjs"), join(dest, "verify.mjs"));
  writeFileSync(
    join(dest, "manifest.json"),
    `${JSON.stringify({ name: "sm-core", version, root: slash(relative(dest, product)) || ".", files, installed }, null, 2)}\n`,
  );
  console.log(
    `synced sm-core ${version} (${Object.keys(files).length} files) to ${slash(relative(product, dest)) || "."}` +
      `, installed ${Object.keys(installed).length} shared files`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
