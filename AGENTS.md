# sm-core

Brand core of the sm_ suite (scottmacleod.co, planning-poker, rollin): `tokens.json` generates `dist/`, and products keep a synced, hash-checked copy. See README.md.

## Commands

- Build: `npm run build` (regenerates `dist/` and `VERSION` from `tokens.json`)
- Check: `npm run check` (CI gate: `dist/` is current, token names are valid, every contrast pair passes)
- Logos: `npm ci && npm run logos` (regenerates `dist/logos`; needs Playwright's Chromium)

## Rules

- `tokens.json` is the only source. Never hand-edit `dist/`, `VERSION` or a product's synced copy.
- Changing a token value, name or mark changes all three products: it needs Scott's approval, a new CalVer release (`VERSION`, tag `vYY.MM`) and a sync PR in each product.
- Every text colour must pass 4.5:1 and every control border or focus ring 3:1, in dark and light. Add new pairs to `contrast` in `tokens.json`.
- Token names: lowercase, hyphenated, unique. Core CSS variables are `--sm-*`; products add their own prefix and never redefine `--sm-*`.
- `build`, `check` and `sync` stay dependency-free so any stack can run them.
- Work on a branch and open a PR; never commit to `main`.
