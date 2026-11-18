# sm-core

Brand and tooling core of the sm_ suite (scottmacleod.co, planning-poker, rollin): `tokens.json` generates `dist/`, `tooling/` holds the shared configs, templates, agent docs and pre-push hook, and products keep a synced, hash-checked copy of both. See README.md.

## Commands

- Build: `npm run build` (regenerates `dist/` and `VERSION` from `tokens.json`)
- Check: `npm run check` (CI gate: `dist/` is current, token names and the version are valid, every contrast pair passes, and sync plus verify work on a throwaway repo)
- Logos: `npm ci && npm run logos` (regenerates `dist/logos`; needs Playwright's Chromium)

## Rules

- `tokens.json` is the only source for the brand. Never hand-edit `dist/`, `VERSION` or a product's synced copy.
- Changing a token value, name or mark changes all three products: it needs Scott's approval, a new CalVer release (`VERSION`, tag `vYY.MM`) and a sync PR in each product.
- Every release bumps `version` in `tokens.json`: `YY.MM`, or `YY.MM.N` for a second release in the same month. Tag pushes are refused from agent sessions, so Scott creates the release on GitHub after merge.
- `tooling/agents/sm-conventions.md` is the suite's shared rulebook. Keep product-specific rules out of it; they belong in that product's AGENTS.md.
- Every text colour must pass 4.5:1 and every control border or focus ring 3:1, in dark and light. Add new pairs to `contrast` in `tokens.json`.
- Token names: lowercase, hyphenated, unique. Core CSS variables are `--sm-*`; products add their own prefix and never redefine `--sm-*`.
- `build`, `check`, `sync`, `verify` and the hooks stay dependency-free so any stack can run them.
- Work on a branch and open a PR; never commit to `main`.
