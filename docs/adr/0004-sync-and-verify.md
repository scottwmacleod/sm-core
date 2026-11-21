# Products keep a synced, hash-checked copy

`scripts/sync.mjs` copies a release into a product's `vendor/sm-core` with a SHA-256 manifest, and installs the shared files listed in `INSTALL` at their usual paths. The Biome and tsconfig bases aren't installed: products extend them from the copy. The hooks run from the copy too.

`verify.mjs` runs in every product's CI, on Node or Bun depending on the product, so `scripts/test-sync.mjs` proves every case on both runtimes when Bun is installed, and sm-core's CI runs it on Bun as well (`scripts/fixtures/bun-caller`).

The copy keeps file modes (`copyFileSync`), so the pre-push hook stays executable. `tooling/hooks/install.mjs` also sets the mode, because a copy made another way can lose it.
