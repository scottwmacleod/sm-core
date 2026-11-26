# sm-core

The brand and tooling core of the sm_ suite (scottmacleod.co, planning-poker, rollin): design tokens, the generated CSS, every mark and icon, and the shared engineering files (configs, templates, agent docs and git hooks). Each product keeps a pinned copy, so the suite looks and works the same everywhere and changes on purpose.

The rules for using all of this are in the [sm_ core style guide](https://claude.ai/artifact/2xghCuwzxtMn5UfRsMUdHt).

## What's here

| Path | What it is |
| --- | --- |
| `tokens.json` | The source of truth: colour roles (dark and light), type scales, spacing, radius, motion, and the contrast pairs CI checks. |
| `dist/sm-core.css` | `--sm-*` custom properties for dark (default), light (OS) and `[data-theme]`; reduced-motion, high-contrast, forced-colours and print overrides; the `.sm-mark`, `.sm-cursor` and `.sm-credit` classes. Works anywhere CSS does. |
| `dist/sm-tailwind.css` | A Tailwind 4 `@theme inline` block that maps the tokens to utilities: `bg-ground`, `text-ink-muted`, `p-space-4`, `rounded-1`, `text-ui-sm`, `ease-sm-out`. |
| `dist/logos/` | Outlined wordmarks (`<name>-wordmark-dark.svg` for dark grounds, `-light.svg` for light) and icons: `-favicon.svg`, `-favicon-16/32.png`, `-icon.svg`, `-icon-192/512.png`, `-icon-maskable-512.png`, `-apple-touch-icon.png`. |
| `tooling/oxlintrc.base.json` | `bun lint` base: every rule on except those ADR-0010 explains. Products `extends` it from `vendor/sm-core/tooling/`. |
| `tooling/oxfmtrc.json` | `bun fmt` config. Sync installs it at the product's root as `.oxfmtrc.json`. |
| `tooling/biome.base.json` | Biome base, for what `bun lint` can't check: CSS (the recommended rules) and 9 JavaScript rules. Formatter off. Products `extends` it from `vendor/sm-core/tooling/`. |
| `tooling/tsconfig.base.json` | TypeScript base: ES2022, `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`. Products `extends` it. |
| `tooling/github/` | The PR template and the bug and feature issue forms. Sync installs them into `.github/`. |
| `tooling/agents/` | `issue-tracker.md`, `triage-labels.md`, `domain.md`, `sm-conventions.md` and the docs it points at (`looking-after-prs.md`, `ui-browser-checks.md`, `prune-tests.md`), the rules every repo shares. Sync installs them into `docs/agents/`. |
| `tooling/lint/no-comments.mjs` | The no-comments check with its ratchet. See **No comments**. |
| `tooling/skills/delete-comment/` | The `/delete-comment` skill. Sync installs it at `.claude/skills/delete-comment/`. |
| `tooling/hooks/` | The hk git hooks: `sm.pkl` (pre-commit formats and lints staged files, pre-push runs `check`), hk's schema in `hk/`, a fallback for machines without hk, and `install.mjs`, which points git at them. |
| `tooling/analytics/sm-posthog.js` | The PostHog loader: queues calls, loads PostHog's script once the page is idle, and serves flags without flicker. See **PostHog**. |
| `tooling/pins.json` | Agent tools pinned outside `package.json` (agent-browser, modern-web-guidance), for the behind-check. |
| `.github/workflows/` | The shared CI, called by products at a release tag. See **Shared CI**. |
| `VERSION` | The release, CalVer `YY.MM`, plus `.N` for a second release in the same month (`26.11.1`). |

The site's favicon is `sm_` on a dark tile (`sm-dark-*`). Every icon tile is dark; lime is only the cursor.

## Using it in a product

Sync a release into the product, then commit the copy:

```sh
# in a checkout of sm-core, at the release you want
git checkout v26.11.3
# from the product repo's root
node ../sm-core/scripts/sync.mjs vendor/sm-core
```

Sync writes the copy to `vendor/sm-core` and installs the shared files at their usual paths:

| From `tooling/` | Installed at |
| --- | --- |
| `github/pull_request_template.md` | `.github/pull_request_template.md` |
| `github/ISSUE_TEMPLATE/bug-report.yml`, `feature-request.yml` | `.github/ISSUE_TEMPLATE/` |
| `agents/*.md` | `docs/agents/` |
| `skills/delete-comment/SKILL.md` | `.claude/skills/delete-comment/SKILL.md` |

Add `node vendor/sm-core/verify.mjs` to the product's CI. It fails if anyone edits the copy or an installed file. The PR template is the one exception: a product adds its own sections below the `<!-- product -->` line, and sync keeps them. To change any of it, change sm-core, release it and sync again.

**Configs:** extend the bases rather than copying them.

```jsonc
// .oxlintrc.json
{ "extends": ["./vendor/sm-core/tooling/oxlintrc.base.json"], "ignorePatterns": ["dist", "vendor"] }
// biome.json
{ "extends": ["./vendor/sm-core/tooling/biome.base.json"], "files": { "includes": ["src/**"] } }
// tsconfig.json
{ "extends": "./vendor/sm-core/tooling/tsconfig.base.json", "compilerOptions": { "lib": ["ES2022", "DOM"] } }
```

**Git hooks:** add `"prepare": "bun vendor/sm-core/tooling/hooks/install.mjs"` to `package.json` and an `hk.pkl` at the root that says `amends "vendor/sm-core/tooling/hooks/sm.pkl"`. Install [hk](https://hk.jdx.dev) with `mise use -g hk` or `brew install hk`. Pre-commit runs the `format` script on the staged files, stages the result, then runs `lint` on them; pre-push runs `check`, the same command as CI. `format` and `lint` must accept file paths (`lint` may check more than it's given). Without hk the hooks still run: `lint` on the staged files without fixing, and `check` on push. See ADR-0009.

**Agent docs:** `CLAUDE.md` imports `@AGENTS.md` and `@docs/agents/sm-conventions.md`; keep `AGENTS.md` to what's specific to the product. Sync removes files it no longer installs (`RETIRED` in `scripts/sync.mjs`), such as the old `.claude/skills/steward/`.

**Plain HTML:** link or inline `vendor/sm-core/sm-core.css` and use the variables (`background: var(--sm-ground)`).

**Tailwind 4 (Vite or Next):**

```css
@import "tailwindcss";
@import "../vendor/sm-core/sm-core.css";
@import "../vendor/sm-core/sm-tailwind.css";
```

**The mark and the credit:**

```html
<span class="sm-mark">rollin<span class="sm-cursor" aria-hidden="true"></span></span>

<a class="sm-credit" href="https://scottmacleod.co" target="_blank" rel="noopener"
   aria-label="Shipped by sm_, scottmacleod.co (opens in a new tab)">shipped by
  <span class="sm-mark">sm<span class="sm-cursor" aria-hidden="true"></span></span></a>
```

Products self-host Geist and Geist Mono however their stack does it (a woff2 file, `next/font`, `@fontsource`). Never load them from a font CDN. `sm-core.css` also defines `Geist Fallback` and `Geist Mono Fallback` (Arial and Courier New scaled to Geist's metrics) and puts them in the `--sm-font-*` stacks, so the swap to the real font doesn't shift text. Use the stacks, not a bare `Geist`.

Product-only tokens use the product's own prefix (`--rollin-size-roll-row`) and never redefine an `--sm-*` value.

## PostHog

The suite shares one PostHog project, `sm_` (US cloud). Its key (`phc_…`) is public by design, so it lives in code. Every event carries a `product` property. The plan is in #21.

Never install `posthog-js`: its script is about 120 kB gzipped. The loader is about 1.4 kB gzipped and fetches PostHog's script through the product's own domain once the page is idle, or on the first tap or key press. It also turns on PostHog's error tracking and Core Web Vitals; their code (about 6 kB and 7 kB gzipped) loads from the same host after PostHog, never from the bundle. Errors thrown before PostHog loads are queued. Nothing loads when the visitor sends Global Privacy Control or Do Not Track. There are no cookies (PostHog keeps its id in localStorage) and replay masks every input.

```js
import { capture, captureException, flag, onFlags, startPostHog } from "../vendor/sm-core/tooling/analytics/sm-posthog.js";

startPostHog({ token: "phc_…", product: "rollin" });          // add flags: true on a page that runs an experiment
flag("hero-copy");             // the variant, synchronously; undefined means show control
onFlags(() => render());       // fresh values arrived
capture("rolled", { dice: 2 }); // a custom event
captureException(error);        // a caught error, e.g. in a React error boundary
```

Call `startPostHog` once, as early as you like: until the page is idle it costs one small request at most. `onFlags` returns a function that unsubscribes. Every export is a safe no-op outside a browser and for a visitor who opted out.

`flags: true` asks PostHog for the visitor's variants straight away and caches them, so the next visit renders the right variant at first paint. `flag()` records the exposure once per page, which experiment results need. `options` passes straight to `posthog.init` (for example `{ mask_all_text: true }`). After PostHog loads, `window.posthog` is the full SDK.

Proxy PostHog through the product's domain, so blockers miss it and the CSP stays `'self'`. In `vercel.json`, before any catch-all rewrite:

```json
{ "source": "/_sm/static/:path(.*)", "destination": "https://us-assets.i.posthog.com/static/:path" },
{ "source": "/_sm/array/:path(.*)", "destination": "https://us-assets.i.posthog.com/array/:path" },
{ "source": "/_sm/:path(.*)", "destination": "https://us.i.posthog.com/:path" }
```

Use `:path(.*)`, not `:path*`. PostHog posts events to paths that end in a slash (`/e/`, `/i/v0/e/`), and Vercel's `:path*` doesn't match a trailing slash: the request falls through to a 404, or to an SPA catch-all that answers 405, and no event arrives.

For readable stack traces, build with public source maps (Vite: `build: { sourcemap: true }`). PostHog fetches them from the deployed site, so there's nothing to upload. A private repo that can't publish its source uploads them with `posthog-cli` instead.

A service worker must leave `/_sm/` to the network. Plain HTML serves a copy of the loader under a name blockers don't match (the site uses `/sm.js`) and checks it against the vendor copy.

## Shared CI

Reusable workflows in `.github/workflows/`. A product calls them at a release tag, and Dependabot (`github-actions` ecosystem) bumps the tag. Third-party actions inside are pinned by SHA, and none needs a secret beyond `GITHUB_TOKEN`.

| Workflow | What it does |
| --- | --- |
| `web-ci.yml` | Lint (plus `verify.mjs` and any extra `checks`), typecheck, unit tests, build and optional Playwright, as parallel jobs. Blobless clone, `node_modules` and Playwright browsers cached, superseded PR runs cancelled, docs-only PRs skipped via `skip-paths`. Each job has a time budget (`*-budget-seconds`) and fails when it runs over; the e2e budget starts after browser setup, so a slow apt mirror can't fail a PR but slow tests still do. |
| `budgets.yml` | Builds once, then checks gzipped JS and CSS against `js-kb` and `css-kb` (one size comment per PR, with main's last sizes as "before") and runs Lighthouse against the build or a `lighthouse-url`. Lighthouse runs once, with no retry, after Chrome's binary has been read into the page cache in the background (ADR-0011). `lighthouse-skip-pages` leaves pages out, e.g. `/404.html`. Defaults match the site: accessibility 0.95, the rest 0.90. |
| `auto-merge.yml` | Squash auto-merge for non-draft PRs from the repo's own branches. A PR labelled `hold` (the `hold-label` input) is left for a person: adding the label turns auto-merge off, removing it turns it back on. Callers list `synchronize` in their trigger types, so a PR opened with a merge conflict gets auto-merge once a push resolves it. |
| `dependabot-automerge.yml` | Auto-merge for Dependabot minor and patch updates. Majors wait for Scott. |
| `audit.yml` | `npm audit --audit-level=high`, or `bun audit` with `package-manager: bun`. Not a required check. |
| `behind.yml` | Weekly: opens one issue when `vendor/sm-core` is older than sm-core's latest release, or a tool in `tooling/pins.json` has a newer version on npm. Closes it when everything is current. |

Merges and `main`: a PR merged with `GITHUB_TOKEN` starts no workflows for that push to `main`. So each caller of `auto-merge.yml` passes the repo secret `SM_MERGE_TOKEN` as `merge-token`: a fine-grained token for Scott's account with Contents, Pull requests and Workflows set to read and write on the four sm_ repos. Auto-merge is turned on with it, so the merge starts deploys, releases and `main`'s CI. Without the secret it falls back to `GITHUB_TOKEN`, which is why `release.yml` still runs hourly and `budgets.yml` callers refresh `main`'s sizes daily. Dependabot PRs can't read Actions secrets, so their merges still start nothing.

The product's main workflow looks like this, with one required check named `ci`:

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
  pull-requests: read   # for skip-paths
jobs:
  web:
    uses: scottwmacleod/sm-core/.github/workflows/web-ci.yml@v26.11.3
    with:
      e2e: true
      skip-paths: '^(docs/|[^/]+\.md$)'
  ci:
    needs: web
    if: always()
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - run: test "${{ needs.web.result }}" = success
```

The inputs default to the shared script names (`npm run lint`, `bun check --no-script`, `npm test`, `npm run build`, `npm run e2e`) and to Node from `.nvmrc`. Pass an empty string to drop a job. sm-core's own `ci.yml` runs `web-ci.yml` from the same commit, as an npm caller and as a Bun caller (`scripts/fixtures/bun-caller`), so a change to it is proven before it's tagged.

### Callers for the other workflows

Swap the tag for the latest release. A Bun product adds `package-manager: bun` to `budgets.yml` and `audit.yml`.

```yaml
# budgets: main's runs record the "before" sizes; the daily run covers pushes that auto-merge started no run for
on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: "41 4 * * *"
permissions:
  contents: read
  pull-requests: write   # for the size comment
jobs:
  budgets:
    uses: scottwmacleod/sm-core/.github/workflows/budgets.yml@v26.11.17
    with:
      dist-dir: apps/web/dist
      js-kb: 120
      css-kb: 20
```

```yaml
# auto-merge
on:
  pull_request:
    types: [opened, synchronize, ready_for_review, reopened, labeled, unlabeled]
permissions:
  contents: write
  pull-requests: write
jobs:
  auto-merge:
    uses: scottwmacleod/sm-core/.github/workflows/auto-merge.yml@v26.11.17
    secrets:
      merge-token: ${{ secrets.SM_MERGE_TOKEN }}
```

```yaml
# dependabot-automerge
on: pull_request
permissions:
  contents: write
  pull-requests: write
jobs:
  dependabot:
    uses: scottwmacleod/sm-core/.github/workflows/dependabot-automerge.yml@v26.11.17
```

```yaml
# audit
on:
  pull_request:
    paths: ["**/package.json", "**/package-lock.json", "**/bun.lock"]
  push:
    branches: [main]
  schedule:
    - cron: "43 5 * * 1"
permissions:
  contents: read
jobs:
  audit:
    uses: scottwmacleod/sm-core/.github/workflows/audit.yml@v26.11.17
```

```yaml
# behind
on:
  schedule:
    - cron: "17 6 * * 1"
  workflow_dispatch:
permissions:
  contents: read
  issues: write
jobs:
  behind:
    uses: scottwmacleod/sm-core/.github/workflows/behind.yml@v26.11.17
```

### Bun products

rollin and planning-poker use Bun as package manager and runtime. Set `packageManager` in `package.json` (`"bun@1.4.5"`): the workflows read the version from it. Commit `bun.lock` and delete `package-lock.json`. Then pass `package-manager: bun` to `web-ci.yml`, `budgets.yml` and `audit.yml`:

```yaml
jobs:
  web:
    uses: scottwmacleod/sm-core/.github/workflows/web-ci.yml@v26.11.12
    with:
      package-manager: bun
      e2e: true
  budgets:
    uses: scottwmacleod/sm-core/.github/workflows/budgets.yml@v26.11.12
    with:
      package-manager: bun
      dist-dir: apps/web/dist
```

With `bun`, each job sets up Bun from `packageManager` (`bun-version` is the fallback when it names none), keys the `node_modules` cache on `bun.lock`, installs with `bun install --frozen-lockfile`, and turns the npm defaults into `bun run lint`, `bun run test`, `bun run build` and `bun run e2e`. Commands you pass yourself run as given. Playwright's browser is installed with `bunx playwright` from the workspace root, so `@playwright/test` must resolve there. Node is still set up, for `verify.mjs` and anything else that calls `node`. An npm caller keeps the same jobs and cache keys as before.

Vercel's bundled Bun (1.3.14) can't read a Bun 1.4 `bun.lock`, so install the pinned Bun first in `vercel.json`:

```json
"installCommand": "curl -fsSL https://bun.sh/install | bash -s bun-v1.4.5 && ~/.bun/bin/bun install --frozen-lockfile",
"buildCommand": "~/.bun/bin/bun --bun run build"
```

`npm i -g bun` doesn't work there: npm 12 blocks Bun's postinstall. Drop the workaround once Vercel ships Bun 1.4. Dependabot uses the `bun` ecosystem.

## No comments

The suite bans code comments. A reason belongs in a name, a test, an ADR or the PR; usage belongs in the README. `tooling/lint/no-comments.mjs` enforces it with a ratchet: `comments-baseline.json` at the repo root records how many comment lines each file may keep, and the count can only go down. It reads JS and TS (and JSON/JSONC), CSS, HTML (markup, `<script>` and `<style>`), YAML, TOML and shell. Markdown isn't code and isn't read. Tool directives (`biome-ignore`, `@ts-expect-error`, a shebang, the `# v7.0.1` beside a SHA-pinned action) aren't comments.

```sh
node vendor/sm-core/tooling/lint/no-comments.mjs --init     # once: record today's comments as the baseline
node vendor/sm-core/tooling/lint/no-comments.mjs            # in CI: fails on a new comment, or on a deletion the baseline hasn't recorded
node vendor/sm-core/tooling/lint/no-comments.mjs --update   # after deleting comments: lowers the baseline (never raises it)
node vendor/sm-core/tooling/lint/no-comments.mjs --report   # comment lines per file, and how many lines deleting them all sheds
```

Run it from the repo root (Bun products: `bun vendor/...`). Add it to web-ci's `checks` input or to the `lint` script. Paths listed in the baseline's `ignore`, the `vendor/sm-core` copy and well-known generated files (`worker-configuration.d.ts`, `*.gen.ts`) are never read. The baseline is written the way Biome formats it, so `biome check` passes on it. To clear the backlog, run `/delete-comment` (sync installs it at `.claude/skills/delete-comment/`).

## Changing the brand

1. Edit `tokens.json`.
2. `npm run build` regenerates `dist/` and `VERSION`. It refuses to write if a token name is invalid or a contrast pair fails.
3. If a mark or a colour used in a mark changed, run `npm run logos` (needs `npm ci` and Playwright's Chromium).
4. Open a PR. CI runs `npm run check`, which fails if `dist/` is stale.
5. Merging the PR tags the release (`v26.12`) and publishes it on GitHub automatically (`release.yml`, whenever `VERSION` changes on `main`). Then sync it into each product.

Tooling changes follow the same path: edit `tooling/`, bump `version` in `tokens.json` (`26.11.2`), run `npm run build` and open a PR. Merging tags and releases it; then sync.

Node 26. `build`, `check` and `sync` have no dependencies; only `logos` needs `npm ci`. `check` also runs `scripts/test-sync.mjs`, which syncs into a throwaway repo and proves `verify.mjs` catches edits, on Node and, when it's installed, on Bun.
