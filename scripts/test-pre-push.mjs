import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const hook = resolve(dirname(fileURLToPath(import.meta.url)), "../tooling/hooks/pre-push.mjs");
const failures = [];

function push(files, { packageJson, lockfile }) {
  const repo = mkdtempSync(join(tmpdir(), "sm-pre-push-"));
  try {
    const bin = join(repo, ".bin");
    const log = join(repo, ".calls");
    mkdirSync(bin);
    for (const tool of ["npm", "bun"]) {
      writeFileSync(join(bin, tool), `#!/bin/sh\necho "${tool} $*" >> "${log}"\n`);
      chmodSync(join(bin, tool), 0o755);
    }
    writeFileSync(join(repo, "package.json"), JSON.stringify(packageJson));
    if (lockfile) writeFileSync(join(repo, lockfile), "{}\n");
    for (const f of files) writeFileSync(join(repo, f), "export {};\n");
    const git = (...args) => execFileSync("git", args, { cwd: repo, stdio: "pipe" });
    git("init", "-q");
    git("add", "-A");
    git("-c", "user.name=t", "-c", "user.email=t@example.com", "commit", "-qm", "x");
    const sha = git("rev-parse", "HEAD").toString().trim();
    const r = spawnSync("node", [hook], {
      cwd: repo,
      input: `refs/heads/x ${sha} refs/heads/x ${"0".repeat(40)}\n`,
      env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}` },
      encoding: "utf8",
    });
    let calls = "";
    try {
      calls = readFileSync(log, "utf8");
    } catch {}
    return { status: r.status, calls, out: r.stdout + r.stderr };
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

const check = (name, ok, detail) => ok || failures.push(`${name}\n${detail}`);

let r = push(["a.ts"], { packageJson: { packageManager: "bun@1.4.5", scripts: { typecheck: "x" } } });
check("Bun product (packageManager): typecheck runs on Bun", r.calls.trim() === "bun run --silent typecheck", r.calls + r.out);

r = push(["a.ts"], { packageJson: { scripts: { typecheck: "x" } }, lockfile: "bun.lock" });
check("Bun product (bun.lock): typecheck runs on Bun", r.calls.trim() === "bun run --silent typecheck", r.calls + r.out);

r = push(["a.ts"], { packageJson: { packageManager: "bun@1.4.5", scripts: { "pre-push": "x" } } });
check("Bun product: its pre-push script runs on Bun with the files", /^bun run --silent pre-push .*a\.ts/.test(r.calls.trim()), r.calls + r.out);

r = push(["a.ts"], { packageJson: { scripts: { typecheck: "x" } }, lockfile: "package-lock.json" });
check("npm product: typecheck runs on npm", r.calls.trim() === "npm run typecheck --silent", r.calls + r.out);

r = push(["a.ts"], { packageJson: { packageManager: "bun@1.4.5", scripts: { lint: "x", typecheck: "x" } } });
check(
  "Bun product with a lint script: lint, then typecheck",
  r.calls.trim() === "bun run --silent lint\nbun run --silent typecheck",
  r.calls + r.out,
);

r = push(["a.md"], { packageJson: { packageManager: "bun@1.4.5", scripts: { lint: "x", typecheck: "x" } } });
check("lint runs for any changed file, typecheck only for code", r.calls.trim() === "bun run --silent lint", r.calls + r.out);

r = push(["a.md"], { packageJson: { packageManager: "bun@1.4.5", scripts: { typecheck: "x" } } });
check("no code file changed: no typecheck", r.calls === "" && r.status === 0, r.calls + r.out);

if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log("✓ the pre-push hook runs the repo's own package manager");
