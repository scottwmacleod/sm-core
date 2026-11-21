# No code comments, enforced by a ratchet

The sm_ suite keeps no code comments. A comment that repeats the code rots as the code moves, and a comment that excuses a shortcut lets the shortcut spread. A reason goes in a name, a test, an ADR, an issue or the PR; usage goes in the README. Scott decided this on 21 Nov 2026.

`tooling/lint/no-comments.mjs` enforces it. Biome has no rule for comments and doesn't read HTML or YAML, and the site has no `package.json`, so the check is one dependency-free script that runs on Node and Bun and reads JS, TS, JSON/JSONC, CSS, HTML, YAML, TOML and shell. Markdown is documentation, so it isn't read; the PR template's `<!-- product -->` marker stays.

It counts comment lines per file against `comments-baseline.json`, and the count only goes down: a new comment fails, a deletion fails until `--update` records it, and `--update` never raises a count. That lets a repo adopt the rule before its backlog is cleared.

Tool directives aren't comments: `biome-ignore`, `@ts-expect-error` and similar, a shebang, and the `# v7.0.1` that Dependabot keeps beside a SHA-pinned action. sm-core's generated CSS keeps its one-line "generated, do not edit" header, which the baseline records.

The baseline is written in Biome's own format, so a product's `biome check` passes on it. `biome.base.json` turns Biome's Markdown formatter off: Biome 2.6 reads a skill's YAML frontmatter as a rule and a heading, and would break `.claude/skills/delete-comment/SKILL.md` and reflow the synced docs, which `verify.mjs` then rejects.

`/delete-comment` (`tooling/skills/delete-comment/`) repeats the cleanup. Its first rule is Scott's: don't remove a fence until you know why it was put up.
