# Our own PostHog loader

`tooling/analytics/sm-posthog.js` stands in for `posthog-js`, whose script is about 120 kB gzipped. The page carries only the loader; PostHog's script loads through the product's `/_sm` rewrites once the page is idle or on the first tap or key press. Until then calls are queued, as PostHog's HTML snippet does. The plan is in #21.

Choices in it that aren't obvious:

- Every `localStorage` access is wrapped, because private mode and blocked storage throw.
- The visitor id is PostHog's own if PostHog already stored one, so a returning visitor keeps their id. `crypto.randomUUID` needs a secure context, so plain-http previews fall back to random bytes.
- With `flags: true`, `/flags/?v=2` answers `{ flags: { key: { enabled, variant } } }`; `readFlags` turns that into values. If the request fails the cached values stand, and they bootstrap PostHog, so the page never flickers between variants.
- Errors are queued only until PostHog loads, because PostHog catches them itself from then on.
- `flag()` records `$feature_flag_called` once per flag per page, which experiment results need.
