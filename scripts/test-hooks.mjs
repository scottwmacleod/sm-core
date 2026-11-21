import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const hooks = resolve(dirname(fileURLToPath(import.meta.url)), "../tooling/hooks");
const failures = [];
const check = (name, ok, detail) => ok || failures.push(`${name}\n${detail}`);
const SYSTEM_PATH = [dirname(process.execPath), "/usr/bin", "/bin"].join(delimiter);

function run(hook, { packageJson, lockfile, staged = [], withHk = false, failing = "", args = [], input = "" }) {
  const repo = mkdtempSync(join(tmpdir(), "sm-hooks-"));
  try {
    const bin = join(repo, ".bin");
    const log = join(repo, ".calls");
    mkdirSync(bin);
    const tools = ["npm", "bun", ...(withHk ? ["hk"] : [])];
    for (const tool of tools) {
      const fail = failing && failing.startsWith(tool) ? `case "$*" in *"${failing.slice(tool.length + 1)}"*) exit 3;; esac\n` : "";
      writeFileSync(join(bin, tool), `#!/bin/sh\necho "${tool} $*" >> "${log}"\n${fail}`);
      chmodSync(join(bin, tool), 0o755);
    }
    if (packageJson) writeFileSync(join(repo, "package.json"), JSON.stringify(packageJson));
    if (lockfile) writeFileSync(join(repo, lockfile), "{}\n");
    const git = (...a) => execFileSync("git", a, { cwd: repo, stdio: "pipe" });
    git("init", "-q");
    git("-c", "user.name=t", "-c", "user.email=t@example.com", "commit", "-q", "--allow-empty", "-m", "x");
    for (const f of staged) writeFileSync(join(repo, f), "export {};\n");
    if (staged.length) git("add", ...staged);
    const r = spawnSync(join(hooks, hook), args, {
      cwd: repo,
      input,
      env: { ...process.env, CI: "", PATH: `${bin}${delimiter}${SYSTEM_PATH}` },
      encoding: "utf8",
    });
    const calls = existsSync(log) ? readFileSync(log, "utf8").trim() : "";
    return { status: r.status, calls, out: `${r.stdout}${r.stderr}${r.error ?? ""}` };
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

const bunPkg = { packageManager: "bun@1.4.5", scripts: { lint: "x", check: "x" } };

let r = run("pre-commit", { packageJson: bunPkg, staged: ["a.ts"], withHk: true });
check("with hk: pre-commit hands over to hk", r.calls === "hk run pre-commit" && r.status === 0, r.calls + r.out);

r = run("pre-push", { packageJson: bunPkg, withHk: true, args: ["origin", "git@x:y.git"], input: "refs/heads/a 1 refs/heads/a 2\n" });
check("with hk: pre-push hands over to hk with git's arguments", r.calls === "hk run pre-push origin git@x:y.git" && r.status === 0, r.calls + r.out);

r = run("pre-commit", { packageJson: bunPkg, staged: ["a.ts"], withHk: true, failing: "hk run pre-commit" });
check("with hk: a failing hk run blocks the commit", r.status !== 0, r.calls + r.out);

r = run("pre-commit", { packageJson: bunPkg, staged: ["a.ts", "b.md"] });
check("without hk: pre-commit lints the staged files on Bun", r.calls === "bun run --silent lint a.ts b.md" && r.status === 0, r.calls + r.out);
check("without hk: pre-commit says how to get hk", /hk/.test(r.out), r.out);

r = run("pre-commit", { packageJson: bunPkg, staged: ["a.ts"], failing: "bun run --silent lint" });
check("without hk: a lint failure blocks the commit", r.status !== 0, r.calls + r.out);

r = run("pre-commit", { packageJson: { scripts: { lint: "x" } }, lockfile: "package-lock.json", staged: ["a.ts"] });
check("without hk: npm product lints on npm", r.calls === "npm run lint --silent -- a.ts" && r.status === 0, r.calls + r.out);

r = run("pre-commit", { packageJson: bunPkg });
check("without hk: nothing staged, nothing runs", r.calls === "" && r.status === 0, r.calls + r.out);

r = run("pre-commit", { packageJson: { packageManager: "bun@1.4.5", scripts: {} }, staged: ["a.ts"] });
check("without hk: no lint script, nothing runs", r.calls === "" && r.status === 0, r.calls + r.out);

r = run("pre-push", { packageJson: bunPkg, args: ["origin", "u"], input: "refs/heads/a 1 refs/heads/a 2\n" });
check("without hk: pre-push runs the check script on Bun", r.calls === "bun run --silent check" && r.status === 0, r.calls + r.out);

r = run("pre-push", { packageJson: bunPkg, failing: "bun run --silent check" });
check("without hk: a failing check blocks the push", r.status !== 0, r.calls + r.out);

r = run("pre-push", { packageJson: { scripts: { check: "x" } }, lockfile: "package-lock.json" });
check("without hk: npm product checks on npm", r.calls === "npm run check --silent" && r.status === 0, r.calls + r.out);

r = run("pre-push", { packageJson: bunPkg, input: `refs/heads/a ${"0".repeat(40)} refs/heads/a 2\n` });
check("without hk: deleting a branch runs nothing", r.calls === "" && r.status === 0, r.calls + r.out);

const sm = readFileSync(join(hooks, "sm.pkl"), "utf8");
check("sm.pkl amends the vendored hk schema, so loading it needs no network", /^amends "hk\/Config\.pkl"$/m.test(sm), sm);
for (const cmd of ["bun run --silent format {{files}}", "bun run --silent lint {{files}}", "bun run --silent check"]) {
  check(`sm.pkl runs "${cmd}" like the fallback does`, sm.includes(`"${cmd}"`), sm);
}

if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log("✓ the hooks hand over to hk, and fall back to the repo's own scripts without it");
