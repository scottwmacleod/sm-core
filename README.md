# sm-core

The brand core of the sm_ suite (scottmacleod.co, planning-poker, rollin): design tokens, the generated CSS, and every mark and icon. Each product keeps a pinned copy, so the suite looks the same everywhere and changes on purpose.

The rules for using all of this are in the [sm_ core style guide](https://claude.ai/artifact/2xghCuwzxtMn5UfRsMUdHt).

## What's here

| Path | What it is |
| --- | --- |
| `tokens.json` | The source of truth: colour roles (dark and light), type scales, spacing, radius, motion, and the contrast pairs CI checks. |
| `dist/sm-core.css` | `--sm-*` custom properties for dark (default), light (OS) and `[data-theme]`; reduced-motion, high-contrast, forced-colours and print overrides; the `.sm-mark`, `.sm-cursor` and `.sm-credit` classes. Works anywhere CSS does. |
| `dist/sm-tailwind.css` | A Tailwind 4 `@theme inline` block that maps the tokens to utilities: `bg-ground`, `text-ink-muted`, `p-space-4`, `rounded-1`, `text-ui-sm`, `ease-sm-out`. |
| `dist/logos/` | Outlined wordmarks (`<name>-wordmark-dark.svg` for dark grounds, `-light.svg` for light) and icons: `-favicon.svg`, `-favicon-16/32.png`, `-icon.svg`, `-icon-192/512.png`, `-icon-maskable-512.png`, `-apple-touch-icon.png`. |
| `VERSION` | The release, CalVer `YY.MM`. |

The site's favicon is `sm_`. Both `sm-lime-*` and `sm-dark-*` ship until the tile colour is decided.

## Using it in a product

Sync a release into the product, then commit the copy:

```sh
# in a checkout of sm-core, at the release you want
git checkout v26.11
# from the product repo
node ../sm-core/scripts/sync.mjs vendor/sm-core
```

Add `node vendor/sm-core/verify.mjs` to the product's CI. It fails if anyone edits the copy. To change the brand, change sm-core, release it and sync again.

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

Node 22. `build`, `check` and `sync` have no dependencies; only `logos` needs `npm ci`.
