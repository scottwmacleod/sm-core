# Lighthouse warms Chrome instead of retrying

Supersedes the Lighthouse bullet in ADR-0007.

v26.11.8 ran Lighthouse again three times when a score missed and asserted on the median. In 177 product runs from 19 to 21 Nov 2026, 33 (19%) needed that retry, every one for performance, with first-run scores from 0.69 to 0.89. The retry doubled the Lighthouse step from about 30 s to about 67 s and its time wasn't counted against the budget. Scott's no-retries rule now covers it: a check that needs a retry has a bug.

The bug was a cold disk. On a fresh GitHub-hosted runner, Chrome's 293 MB `chrome` binary isn't in the page cache, so the first page load stalls on reading it. Lighthouse counts those stalls as main-thread work, and simulated throttling multiplies them by four, so total blocking time came out at 400 to 5,200 ms. Every later run on the same machine scored 0.95 to 1.0. Probes on 21 Nov, each a fresh runner building rollin (`lh-probe.yml` on rollin's `claude/project-thread-6q1n4t` branch), scored the first run:

| Before the first run | Runs below 0.90 |
| --- | --- |
| Nothing | 8 of 15, and 18 of 30 in an earlier probe |
| Launch Chrome on `about:blank` | 12 of 15 |
| Read every file in Chrome's folder except `chrome` | 6 of 12 |
| Read the `chrome` binary | 0 of 12 |
| Read the `chrome` binary in the background from the job's start | 0 of 12 |

The CPU model (four kinds seen) made no visible difference.

So `budgets.yml` starts `cat chrome > /dev/null` in the background as its first step, and the Lighthouse step waits for it. It finishes during install and build, so it usually costs nothing; a static site with no build waits for it (1.5 to 13 s seen). If the read fails, the job fails rather than scoring a cold run. The scored run is still one cold-for-the-page, warm-for-the-disk run, asserted at the same thresholds as before.

Users' browsers are already in memory, so a cold-disk stall was never something they saw. Warming the disk takes out the runner's noise and leaves the page's own cost in the score.
