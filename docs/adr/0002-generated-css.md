# Generated CSS: metric-matched fallbacks and override order

`scripts/build.mjs` writes `dist/sm-core.css` from `tokens.json`. Two choices in it aren't obvious from the output.

The fallback faces (`Geist Fallback`, `Geist Mono Fallback`) are local system fonts scaled to Geist's widths and line metrics with `size-adjust` and the metric overrides, so the swap to the real font shifts no text. `problems()` fails the build if a fallback face is in no `--sm-font-*` stack, because an unused face does nothing.

The reduced-motion and print rules that stop the cursor blinking come after `.sm-cursor`. A media-query override has the same specificity as the rule it overrides, so it only wins when it comes later. `orderProblems()` fails the build if they move above it.
