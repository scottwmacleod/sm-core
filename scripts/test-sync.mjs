import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const product = mkdtempSync(join(tmpdir(), "sm-core-sync-"));
const failures = [];

const sync = () =>
  execFileSync("node", [join(root, "scripts/sync.mjs"), "vendor/sm-core"], { cwd: product, encoding: "utf8" });
const hasBun = spawnSync("bun", ["--version"]).status === 0;
const runtimes = ["node", ...(hasBun ? ["bun"] : [])];
const verify = (runtime) => spawnSync(runtime, ["vendor/sm-core/verify.mjs"], { cwd: product, encoding: "utf8" });

function expect(name, wantPass, change) {
  sync();
  change?.();
  for (const runtime of runtimes) {
    const r = verify(runtime);
    const passed = r.status === 0;
    if (passed !== wantPass) {
      failures.push(
        `${name} (${runtime}): verify ${passed ? "passed" : "failed"}, expected it to ${wantPass ? "pass" : "fail"}\n${r.stderr}${r.error ?? ""}`,
      );
    }
  }
}

const at = (p) => join(product, p);
const PR = ".github/pull_request_template.md";

try {
  mkdirSync(at(".github"), { recursive: true });
  writeFileSync(at(PR), "old shared text\n<!-- product -->\n\n## Test checklist\n\n- [ ]\n");
  sync();
  const pr = readFileSync(at(PR), "utf8");
  if (!pr.includes("## Merge Danger") || !pr.includes("## Test checklist")) {
    failures.push("sync didn't merge the shared PR template with the product's own section");
  }
  const skill = "tooling/skills/delete-comment/SKILL.md";
  if (readFileSync(at(".claude/skills/delete-comment/SKILL.md"), "utf8") !== readFileSync(join(root, skill), "utf8")) {
    failures.push("sync didn't install the /delete-comment skill");
  }
  if (readFileSync(join(root, ".claude/skills/delete-comment/SKILL.md"), "utf8") !== readFileSync(join(root, skill), "utf8")) {
    failures.push(`sm-core's own .claude/skills/delete-comment/SKILL.md differs from ${skill}; copy it over`);
  }
  if (readFileSync(at(".oxfmtrc.json"), "utf8") !== readFileSync(join(root, "tooling/oxfmtrc.json"), "utf8")) {
    failures.push("sync didn't install the shared bun fmt config at .oxfmtrc.json");
  }
  for (const hook of ["pre-commit", "pre-push"]) {
    if (!(statSync(at(`vendor/sm-core/tooling/hooks/${hook}`)).mode & 0o111)) {
      failures.push(`the synced ${hook} hook isn't executable`);
    }
  }

  expect("fresh sync", true);
  expect("Bun product", true, () => {
    writeFileSync(at("package.json"), JSON.stringify({ name: "product", private: true, packageManager: "bun@1.4.5" }));
    writeFileSync(at("bun.lock"), "{}\n");
  });
  expect("product text below the marker", true, () => appendFileSync(at(PR), "\n- [ ] Works on a phone\n"));
  expect("edit above the marker", false, () =>
    writeFileSync(at(PR), readFileSync(at(PR), "utf8").replace("## Summary", "## What")),
  );
  expect("marker removed", false, () =>
    writeFileSync(at(PR), readFileSync(at(PR), "utf8").replace("<!-- product -->", "")),
  );
  expect("edited agent doc", false, () => appendFileSync(at("docs/agents/sm-conventions.md"), "\nlocal rule\n"));
  expect("deleted issue template", false, () => rmSync(at(".github/ISSUE_TEMPLATE/bug-report.yml")));
  expect("edited tooling copy", false, () =>
    appendFileSync(at("vendor/sm-core/tooling/tsconfig.base.json"), " "),
  );
  expect("edited CSS copy", false, () => appendFileSync(at("vendor/sm-core/sm-core.css"), "/* */"));
  expect("unexpected file in copy", false, () => writeFileSync(at("vendor/sm-core/tooling/extra.json"), "{}"));
} finally {
  rmSync(product, { recursive: true, force: true });
}

if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log(`✓ sync copies tooling and installs shared files; verify catches every edit (on ${runtimes.join(", ")})`);
if (!hasBun) console.log("  Bun isn't installed, so verify ran on Node only. CI's bun-caller job runs it on Bun.");
