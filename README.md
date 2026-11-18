# sm-core

The brand and tooling core of the sm_ suite (scottmacleod.co, planning-poker, rollin): design tokens, the generated CSS, every mark and icon, and the shared engineering files (configs, templates, agent docs and a pre-push hook). Each product keeps a pinned copy, so the suite looks and works the same everywhere and changes on purpose.

The rules for using all of this are in the [sm_ core style guide](https://claude.ai/artifact/2xghCuwzxtMn5UfRsMUdHt).

## What's here

| Path | What it is |
| --- | --- |
| `tokens.json` | The source of truth: colour roles (dark and light), type scales, spacing, radius, motion, and the contrast pairs CI checks. |
| `dist/sm-core.css` | `--sm-*` custom properties for dark (default), light (OS) and `[data-theme]`; reduced-motion, high-contrast, forced-colours and print overrides; the `.sm-mark`, `.sm-cursor` and `.sm-credit` classes. Works anywhere CSS does. |
| `dist/sm-tailwind.css` | A Tailwind 4 `@theme inline` block that maps the tokens to utilities: `bg-ground`, `text-ink-muted`, `p-space-4`, `rounded-1`, `text-ui-sm`, `ease-sm-out`. |
| `dist/logos/` | Outlined wordmarks (`<name>-wordmark-dark.svg` for dark grounds, `-light.svg` for light) and icons: `-favicon.svg`, `-favicon-16/32.png`, `-icon.svg`, `-icon-192/512.png`, `-icon-maskable-512.png`, `-apple-touch-icon.png`. |
| `tooling/biome.base.json` | Biome base (formatter and lint rules). Products `extends` it from `vendor/sm-core/tooling/`. |
| `tooling/tsconfig.base.json` | TypeScript base: ES2022, `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`. Products `extends` it. |
| `tooling/github/` | The PR template and the bug and feature issue forms. Sync installs them into `.github/`. |
| `tooling/agents/` | `issue-tracker.md`, `triage-labels.md`, `domain.md` and `sm-conventions.md`, the rules every repo shares. Sync installs them into `docs/agents/`. |
| `tooling/hooks/` | The pre-push hook (format, lint and typecheck on changed files) and `install.mjs`, which points git at it. |
| `VERSION` | The release, CalVer `YY.MM`, plus `.N` for a second release in the same month (`26.11.1`). |

The site's favicon is `sm_`. Both `sm-lime-*` and `sm-dark-*` ship until the tile colour is decided.

## Using it in a product

Sync a release into the product, then commit the copy:

```sh
# in a checkout of sm-core, at the release you want
git checkout v26.11.1
# from the product repo's root
node ../sm-core/scripts/sync.mjs vendor/sm-core
```

Sync writes the copy to `vendor/sm-core` and installs the shared files at their usual paths:

| From `tooling/` | Installed at |
| --- | --- |
| `github/pull_request_template.md` | `.github/pull_request_template.md` |
| `github/ISSUE_TEMPLATE/bug-report.yml`, `feature-request.yml` | `.github/ISSUE_TEMPLATE/` |
| `agents/*.md` | `docs/agents/` |

Add `node vendor/sm-core/verify.mjs` to the product's CI. It fails if anyone edits the copy or an installed file. The PR template is the one exception: a product adds its own sections below the `<!-- product -->` line, and sync keeps them. To change any of it, change sm-core, release it and sync again.

**Configs:** extend the bases rather than copying them.

```jsonc
// biome.json
{ "extends": ["./vendor/sm-core/tooling/biome.base.json"], "files": { "includes": ["src/**"] } }
// tsconfig.json
{ "extends": "./vendor/sm-core/tooling/tsconfig.base.json", "compilerOptions": { "lib": ["ES2022", "DOM"] } }
```

**Pre-push hook:** add `"prepare": "node vendor/sm-core/tooling/hooks/install.mjs"` to `package.json`. It sets `core.hooksPath` and skips itself in CI. The hook runs Biome on the changed files and `npm run typecheck`; a repo that needs something else defines a `pre-push` script, which gets the changed files as arguments.

**Agent docs:** point `AGENTS.md` at `docs/agents/sm-conventions.md` and keep only what's specific to the product.

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

Products self-host Geist and Geist Mono however their stack does it (a woff2 file, `next/font`, `@fontsource`). Never load them from a font CDN.

Product-only tokens use the product's own prefix (`--rollin-size-roll-row`) and never redefine an `--sm-*` value.

## Changing the brand

1. Edit `tokens.json`.
2. `npm run build` regenerates `dist/` and `VERSION`. It refuses to write if a token name is invalid or a contrast pair fails.
3. If a mark or a colour used in a mark changed, run `npm run logos` (needs `npm ci` and Playwright's Chromium).
4. Open a PR. CI runs `npm run check`, which fails if `dist/` is stale.
5. After merge, tag the release (`v26.12`) and sync it into each product.

Tooling changes follow the same path: edit `tooling/`, bump `version` in `tokens.json` (`26.11.2`), run `npm run build`, open a PR, then tag and sync.

Node 22. `build`, `check` and `sync` have no dependencies; only `logos` needs `npm ci`. `check` also runs `scripts/test-sync.mjs`, which syncs into a throwaway repo and proves `verify.mjs` catches edits.
