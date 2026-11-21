# The pre-push hook

`tooling/hooks/pre-push.mjs` runs on the files a push changes: a product's own `pre-push` script if it has one, otherwise Biome on those files, then `typecheck` when a code file changed. It runs those scripts with the repo's own package manager (Bun when `packageManager` names `bun@` or `bun.lock` exists, npm otherwise), so a Bun product never needs npm. Its budget is under 9 seconds on a 10-file change; anything slower belongs in CI.

`install.mjs` runs from each product's `prepare` script and sets `core.hooksPath`. It exits quietly in CI and outside a git checkout, because deploy builds (Vercel) run `prepare` without a `.git` folder. When `core.hooksPath` already points somewhere else it says so and leaves it alone.
