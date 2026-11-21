# Shared CI: budgets, planning and caches

The reusable workflows in `.github/workflows/` make these choices on purpose.

- Each job's `timeout-minutes` is only a hang guard. The per-job budget (`*-budget-seconds`) is the real limit, and a job fails when it runs over. The e2e clock restarts after browser setup, because apt mirrors and the browser download vary by tens of seconds and aren't ours to fix; slow tests still fail.
- `web-ci.yml`'s `plan` job needs no checkout: it asks the API for the PR's files. It fails open, so anything other than a docs-only PR runs every job. The lint job always runs, because `verify.mjs` and the extra `checks` run there.
- The concurrency group includes `workspace`, so sm-core's npm and Bun calls of `web-ci.yml` in one workflow don't cancel each other.
- Checkouts are blobless, not shallow: full history, with file contents fetched on demand.
- `budgets.yml` uses the same `node_modules` cache key as `web-ci.yml`, so the two share one cache. Whichever job installs first saves it, and `main`'s runs seed it for every PR.
- Lighthouse asserts on the median when a first run misses: a shared runner's single score swings a lot, so a fresh median washes noise out and still catches a regression. This is the one deliberate exception to the suite's no-retries rule (sm-core v26.11.8), and the retry's time isn't counted against `budget-seconds`.
- `auto-merge.yml`'s concurrency group cancels in progress, so label changes in quick succession settle on the last one.
- `audit.yml` is never a required check: a new advisory would turn unrelated PRs red.
