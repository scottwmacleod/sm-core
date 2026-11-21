# sm-core

Brand and tooling core of the sm_ suite (scottmacleod.co, planning-poker, rollin): `tokens.json` generates `dist/`, `tooling/` holds the shared configs, templates, agent docs and pre-push hook, and products keep a synced, hash-checked copy of both. See README.md.

## Commands

- Build: `npm run build` (regenerates `dist/` and `VERSION` from `tokens.json`)
- Check: `npm run check` (CI gate: `dist/` is current, token names and the version are valid, every contrast pair passes, sync plus verify work on a throwaway repo, the PostHog loader and the no-comments check pass their tests, and no new comment has appeared)
- Logos: `npm ci && npm run logos` (regenerates `dist/logos`; needs Playwright's Chromium)

## Rules

- `tokens.json` is the only source for the brand. Never hand-edit `dist/`, `VERSION` or a product's synced copy.
- Changing a token value, name or mark changes all three products: it needs Scott's approval, a new CalVer release (`VERSION`, tag `vYY.MM`) and a sync PR in each product.
- Every release bumps `version` in `tokens.json`: `YY.MM`, or `YY.MM.N` for a second release in the same month. On merge, `.github/workflows/release.yml` tags `v<VERSION>` and publishes the GitHub release; don't tag by hand.
- `tooling/agents/sm-conventions.md` is the suite's shared rulebook. Keep product-specific rules out of it; they belong in that product's AGENTS.md.
- Every text colour must pass 4.5:1 and every control border or focus ring 3:1, in dark and light. Add new pairs to `contrast` in `tokens.json`.
- Token names: lowercase, hyphenated, unique. Core CSS variables are `--sm-*`; products add their own prefix and never redefine `--sm-*`.
- `build`, `check`, `sync`, `verify` and the hooks stay dependency-free so any stack can run them.
- Work on a branch and open a PR; never commit to `main`.
- Every change to `scripts/` uses `/tdd`: a failing check comes first.
- No code comments (ADR-0001). After deleting any, run `node tooling/lint/no-comments.mjs --update` and commit `comments-baseline.json`. `/delete-comment` clears a backlog.
- `.claude/skills/delete-comment/SKILL.md` is a copy of `tooling/skills/delete-comment/SKILL.md`; edit the tooling one and copy it over (`test-sync.mjs` fails if they differ).

## Definition of done

`npm run check` passes; CI runs the same command as the `ci` check. PRs auto-merge (squash) once it passes.

## Agent skills

### Issue tracker

GitHub Issues for `scottwmacleod/sm-core`, via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` plus `docs/adr/` at the root. See `docs/agents/domain.md`.
