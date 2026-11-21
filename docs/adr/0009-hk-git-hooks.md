# hk git hooks

Supersedes ADR-0005.

Git hooks run through [hk](https://hk.jdx.dev) 2.13. Scott's CI speed brief (21 Nov 2026) asked for it: pre-commit formats and lints the staged files, pre-push runs the same check as CI, and both finish in under 9 seconds. A hook rather than a line in AGENTS.md, because agents skip steps.

- `tooling/hooks/sm.pkl` is the shared config. Pre-commit runs the product's `format` script on the staged files and stages the result, then its `lint` script on the same files. hk stashes unstaged changes first, so a partly staged file is checked as it will be committed. Pre-push runs the product's `check` script, the command CI runs. The hooks call scripts, not tools, so a product can change its formatter or linter without touching sm-core.
- A product's `hk.pkl` is one line, `amends "vendor/sm-core/tooling/hooks/sm.pkl"`, and can override any step.
- `tooling/hooks/hk/Config.pkl` is hk's own schema, copied from the hk 2.13.0 crate (MIT, licence alongside). `sm.pkl` amends that copy instead of hk's `package://github.com/...` URL, so loading the config needs no network and stays on one schema version until we update the copy on purpose.
- `install.mjs` runs from each product's `prepare` script and sets `core.hooksPath` to `tooling/hooks`. It exits quietly in CI and outside a git checkout, because deploy builds (Vercel) run `prepare` without a `.git` folder. When `core.hooksPath` already points somewhere else it says so and leaves it alone.
- `pre-commit` and `pre-push` in that folder hand over to `hk run` when hk is on `PATH`. Without it, `fallback.mjs` runs the same scripts with the repo's own package manager: `lint` on the staged files (it checks but doesn't fix, because it can't stash) and `check` on push. Thread environments don't have hk yet, and a hook that silently does nothing is worse than a slower one.
