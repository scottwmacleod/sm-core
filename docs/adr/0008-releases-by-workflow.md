# Releases are tagged by a workflow

Agent sessions can't push tags, so `release.yml` tags `v<VERSION>` and publishes the GitHub release whenever `VERSION` changes on `main`. Nobody tags by hand.

It also runs hourly. A merge made with `GITHUB_TOKEN` starts no workflows, so the push trigger never fires for it (seen with #14 on 18 Nov 2026). `SM_MERGE_TOKEN` now makes auto-merges start workflows, but Dependabot merges and any fallback to `GITHUB_TOKEN` still don't, so the hourly catch-up stays. It does nothing when the tag already exists, and can be run by hand from the Actions tab.
