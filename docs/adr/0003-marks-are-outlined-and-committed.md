# Marks are outlined SVGs, rendered by hand and committed

`scripts/logos.mjs` sets every wordmark and icon from Geist Mono outlines, so the SVGs hold paths only and no font ships with them. The PNGs are screenshots from Playwright's Chromium. That needs `npm ci` and a browser, so CI never runs the script: a person runs `npm run logos` after a mark changes and commits `dist/logos`. Playwright is loaded with `require`, not `import`, so a machine-wide install is found through `NODE_PATH`.

Icons use one letter per product, or two when another product already has the letter. Maskable and Apple icons fill the square, so their mark spans half the tile (`markShare: 0.5`) and stays inside the 80% safe zone; the platform's mask never clips it.
