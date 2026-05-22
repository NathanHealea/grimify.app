# Commit Message Format Hook

**Epic:** Application Improvements
**Type:** Enhancement
**Status:** Todo
**Branch:** `enhancement/commit-message-hook`
**Merge into:** `main`

## Summary

The project's [`CLAUDE.md`](../../CLAUDE.md) declares a commit-message convention — `type(scope): description` — but nothing enforces it locally. As a result, commits drift between forms (`feat(seo): ...`, `docs: ...`, free-form sentences, etc.), making the log inconsistent and harder to scan or filter.

This work adds a local `commit-msg` git hook that validates every commit message against the agreed format:

```
type(domain): message
```

Where:

| Segment | Rule |
|---|---|
| `type` | One of: `chore`, `enhancement`, `feature`, `bugfix`, `hotfix`, `refactor`, `docs`, `test`, `style`, `perf`, `build`, `ci`, `revert` |
| `domain` | Free-form, lowercase + digits + `-` `_` `/` (not validated against a whitelist) |
| `message` | Non-empty subject line after `: ` |

A non-conforming message blocks the commit locally with a clear error explaining the expected format and listing the allowed types. Auto-generated messages (merge commits, revert commits) and lines starting with `#` are exempt.

The hook lives at `.githooks/commit-msg` (committed to the repo) and is wired up by pointing git's `core.hooksPath` at that directory. The pointer is set automatically by a `prepare` script in `package.json`, so every contributor gets the hook after `npm install` — no extra setup step.

## Acceptance Criteria

- [ ] Running `npm install` sets `core.hooksPath` to `.githooks/` automatically (no manual setup step required).
- [ ] A commit with a valid message (e.g. `feature(palettes): add hue swap`) succeeds.
- [ ] A commit with no type prefix (e.g. `add hue swap`) is rejected with a helpful error.
- [ ] A commit with an unrecognized type (e.g. `feat(palettes): add hue swap`) is rejected with an error that lists the allowed types.
- [ ] A commit missing the domain in parens (e.g. `feature: add hue swap`) is rejected.
- [ ] A commit with empty body (e.g. `feature(palettes): `) is rejected.
- [ ] Merge commits (`Merge branch '...'`) and revert commits (`Revert "..."`) are **not** rejected.
- [ ] Comment lines (starting with `#`) are ignored when locating the subject line.
- [ ] The hook script exits `0` for valid messages and `1` with a printed error for invalid ones — confirmed via `npx tsx` or `node` invocation directly.
- [ ] The README or `CLAUDE.md` is updated to document the enforced format and the allowed types (single source of truth).
- [ ] `git commit --no-verify -m "anything"` still works as the documented escape hatch.

## Approach

### Approach decision

Three options were considered:

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **A. `.githooks/` + `core.hooksPath` + custom Node validator** | Zero new dependencies; one committed file; `prepare` script wires up `core.hooksPath` automatically on `npm install` | Slightly less familiar than Husky to contributors who expect a `.husky/` directory | **Selected** |
| B. Husky + custom Node validator | Familiar to Next.js contributors; handles a few CI edge cases | Adds a devDependency for what is essentially `git config core.hooksPath .husky` plus one wrapper file | Rejected — not enough value for one hook |
| C. Husky + `@commitlint/cli` + `@commitlint/config-conventional` | Industry standard; rich config | Default type list is `feat`/`fix`/etc., not `feature`/`bugfix` — needs a custom config either way; ships ~30 transitive deps | Rejected |

The custom validator is ~40 lines of Node. `core.hooksPath` is a stock git feature (since git 2.9), so no extra tooling is needed to install the hook — `npm install` triggers a `prepare` script that sets the config value. If the project later adopts `pre-commit`, `pre-push`, or `lint-staged`, revisit Husky then.

### Type list

| Type | Use for |
|---|---|
| `chore` | Maintenance work that does not affect runtime behavior (dependency bumps, tooling tweaks). |
| `enhancement` | Improvements to existing functionality that don't add a brand-new feature. |
| `feature` | New user-visible functionality. |
| `bugfix` | Fix for an issue affecting normal users. |
| `hotfix` | Urgent production fix outside the normal release cadence. |
| `refactor` | Internal code restructuring with no behavior change. |
| `docs` | Documentation-only changes. |
| `test` | Test-only changes. |
| `style` | Formatting, whitespace, lint fixes — no logic change. |
| `perf` | Performance improvement. |
| `build` | Build system / packaging changes. |
| `ci` | Continuous integration / GitHub Actions changes. |
| `revert` | Reverts a previous commit. |

Breaking-change suffix `!` is allowed: `feature(palettes)!: rename API`.

> **Note — existing commits use the short `feat` / `fix` form.** The hook only validates *new* commits, so it does not retroactively break the log. If the team prefers the short names, the type list is one constant in the validator and is trivial to swap.

### Regex specification

The validator matches the **first non-blank, non-comment line** of the commit message against:

```
^(chore|enhancement|feature|bugfix|hotfix|refactor|docs|test|style|perf|build|ci|revert)(\([a-z0-9][a-z0-9\-_/]*\))?!?:\s.+
```

- The domain group `()` is **required** by the user-specified format — but the regex allows omitting it (`feature: ...`) only if the team later decides domains are optional. **By default, the validator enforces the parens** by adding a separate check for the literal `(` `)` and rejecting messages without them. See Open Question 1.
- The domain is lowercase by convention. Mixed case is rejected.
- A single space after `:` is required.
- The subject must be non-empty after the space.

### Bypass paths

The validator returns `0` (no-op) for any of these:

1. The first non-blank line starts with `Merge ` (covers `Merge branch ...`, `Merge pull request ...`, `Merge remote-tracking branch ...`).
2. The first non-blank line starts with `Revert "` (auto-generated by `git revert`).
3. The first non-blank line starts with `fixup!` or `squash!` (auto-generated by `git commit --fixup` / `--squash`; the rebase will collapse them).
4. The message file is empty after stripping comments (git itself will abort).

Users can always bypass manually via `git commit --no-verify`.

---

## Implementation Plan

### Step 1 — Wire up `core.hooksPath`

Add a `prepare` script to `package.json` that points git at the `.githooks/` directory:

```json
{
  "scripts": {
    "prepare": "git config core.hooksPath .githooks"
  }
}
```

Why this works:

- npm runs the `prepare` script automatically after `npm install` (and after `npm ci`), so any contributor who installs dependencies gets the config set without an extra step.
- `core.hooksPath` is a stock git feature (git ≥ 2.9). When set, git looks for hooks in the named directory instead of the default `.git/hooks/`.
- The setting is local to the contributor's clone (`.git/config`) — it isn't pushed anywhere, so it can't leak to CI or to a fresh clone that hasn't yet run `npm install`.

> **Note** — if a contributor has set `core.hooksPath` manually before, the `prepare` script will overwrite it. This is the same behavior Husky has. If that ever becomes a problem, the script can be hardened to a no-op when the value is already set, but in practice no one in this project will have it pre-configured.

### Step 2 — Create the validator script

Create `scripts/validate-commit-message.mjs`:

```js
#!/usr/bin/env node
// scripts/validate-commit-message.mjs
//
// Validates a git commit message against the project's format:
//   type(domain): message
//
// Invoked by .githooks/commit-msg with the path to .git/COMMIT_EDITMSG as $1.

import { readFileSync } from 'node:fs'

const ALLOWED_TYPES = [
  'chore',
  'enhancement',
  'feature',
  'bugfix',
  'hotfix',
  'refactor',
  'docs',
  'test',
  'style',
  'perf',
  'build',
  'ci',
  'revert',
]

const TYPE_RE = ALLOWED_TYPES.join('|')
const PATTERN = new RegExp(
  `^(${TYPE_RE})\\(([a-z0-9][a-z0-9\\-_/]*)\\)!?:\\s.+`,
)

const BYPASS_PREFIXES = ['Merge ', 'Revert "', 'fixup!', 'squash!']

function fail(message, subject) {
  console.error('\n✖ Invalid commit message format.\n')
  console.error(`   ${message}\n`)
  if (subject) console.error(`   Got: "${subject}"\n`)
  console.error('   Expected: type(domain): message')
  console.error(`   Allowed types: ${ALLOWED_TYPES.join(', ')}`)
  console.error('\n   Examples:')
  console.error('     feature(palettes): add hue swap')
  console.error('     bugfix(auth): clear stale session on logout')
  console.error('     chore(deps): bump next to 16.1.7')
  console.error('\n   Bypass once (not recommended): git commit --no-verify\n')
  process.exit(1)
}

const path = process.argv[2]
if (!path) fail('Hook invoked without a commit-message file path.')

const raw = readFileSync(path, 'utf8')
const subject = raw
  .split('\n')
  .map((line) => line.trim())
  .find((line) => line.length > 0 && !line.startsWith('#'))

if (!subject) process.exit(0) // git itself will abort the empty commit

if (BYPASS_PREFIXES.some((p) => subject.startsWith(p))) process.exit(0)

if (!PATTERN.test(subject)) {
  fail('Message did not match the required format.', subject)
}

process.exit(0)
```

Notes:

- ESM (`.mjs`) is consistent with `scripts/generate-branding-pngs.mjs`.
- No external deps — uses only `node:fs`.
- Type list is one array — easy to add or remove a type.
- Unicode `✖` symbol works on every modern terminal; substitute `X` if the team prefers ASCII-only.

### Step 3 — Create the hook entrypoint

Create `.githooks/commit-msg` with the contents:

```sh
#!/usr/bin/env sh
node scripts/validate-commit-message.mjs "$1"
```

The first arg `$1` is the path to the commit-message temp file that git provides to the `commit-msg` hook.

Make the file executable:

```bash
chmod +x .githooks/commit-msg
```

Git tracks the executable bit, so contributors who pull the branch get an executable hook without needing to re-`chmod`.

### Step 4 — Update documentation

Update `CLAUDE.md` § Conventions to:

1. Reference the enforced types (not just "conventional commit format").
2. Mention that the hook runs locally and how to bypass it.

Suggested replacement for the existing line `Use conventional commit format: \`type(scope): description\``:

```markdown
- **Commit format:** `type(domain): message` — enforced locally by `.githooks/commit-msg`
  (installed via the `prepare` script in `package.json`). Allowed types: `chore`,
  `enhancement`, `feature`, `bugfix`, `hotfix`, `refactor`, `docs`, `test`, `style`,
  `perf`, `build`, `ci`, `revert`. Bypass with `git commit --no-verify` (use sparingly).
```

### Step 5 — Smoke-test locally

Run each of these from a clean working tree to confirm behaviour:

| # | Command | Expected |
|---|---|---|
| 1 | `git commit --allow-empty -m "feature(palettes): add hue swap"` | Accepted |
| 2 | `git commit --allow-empty -m "add hue swap"` | Rejected — no type |
| 3 | `git commit --allow-empty -m "feat(palettes): add hue swap"` | Rejected — unknown type |
| 4 | `git commit --allow-empty -m "feature: add hue swap"` | Rejected — missing `(domain)` |
| 5 | `git commit --allow-empty -m "feature(palettes):add hue swap"` | Rejected — missing space after `:` |
| 6 | `git commit --allow-empty -m "feature(palettes): "` | Rejected — empty subject |
| 7 | `git commit --allow-empty --no-verify -m "anything goes"` | Accepted (bypass) |
| 8 | `git merge --no-ff some-branch` (commit message starts with `Merge `) | Accepted (bypass) |

Capture these in the PR description as the manual test plan (the project has no automated test suite per [CLAUDE.md § Testing](../../CLAUDE.md)).

---

### Affected files

| File | Change |
|---|---|
| `package.json` | Add `"prepare": "git config core.hooksPath .githooks"` to `scripts`. |
| `.githooks/commit-msg` | **New.** Shell entrypoint that invokes the Node validator. |
| `scripts/validate-commit-message.mjs` | **New.** Validator logic. |
| `CLAUDE.md` | Update the Conventions section with the enforced type list and bypass note. |

No `package-lock.json` change, no new `node_modules` entries — there is no new dependency.

### Order of operations

1. Branch off `main` → `enhancement/commit-message-hook`.
2. Add the `prepare` script to `package.json`.
3. Run `npm install` once to trigger `prepare` locally (or run the `git config` command directly).
4. Create `.githooks/commit-msg` and `chmod +x` it.
5. Create `scripts/validate-commit-message.mjs`.
6. Update `CLAUDE.md`.
7. Run the smoke test matrix from Step 5.
8. Commit (using the new hook — meta-validation that the format is itself valid).
9. Open PR against `main`.

---

## Risks and considerations

1. **Pre-existing `core.hooksPath`** — The `prepare` script unconditionally sets `core.hooksPath=.githooks`. If a contributor has it set to something else (rare in this project), it'll be overwritten on the next `npm install`. Flag in the PR; harden the script later if it ever bites someone.
2. **Fresh clone before `npm install`** — `core.hooksPath` is local to `.git/config`, so a fresh clone has no hook until the contributor runs `npm install` once. The git history shows this is acceptable (most contributors install deps before their first commit). Document in the PR.
3. **CI commits** — GitHub Actions that auto-commit (e.g. dependabot, release-please) won't run the local hook. This is fine — the hook is local-only and CI bots produce well-formed messages.
4. **Rebase / amend** — `git commit --amend` and `git rebase -i reword` both run the `commit-msg` hook. If an old commit has a now-invalid message, the rebase will halt. Document that `--no-verify` is fine for historical rewrites.
5. **Unicode in the error output** — The `✖` symbol renders fine in modern terminals (incl. Windows Terminal). If a contributor reports glitched output, swap it for `X`.
6. **Drift between the hook and the doc** — The allowed-types list lives in two places: the validator and `CLAUDE.md`. Out of scope to dedupe (a JSON manifest would be overkill for 13 strings). Mention in the PR that both must change in lockstep.
7. **No automated tests** — Project has no test suite. Manual smoke-test matrix in Step 5 is the verification. If the team later adopts a test framework, the validator is a pure function — extract the matcher and add unit tests.
8. **`feature` vs. `feat`** — The current log uses `feat`. The hook will reject `feat` going forward. If the team prefers `feat`/`fix`, swap the array in one line and update `CLAUDE.md`.
9. **Worktrees** — `core.hooksPath` is set on the main `.git/config`, which is shared across worktrees, so worktrees inherit the hook automatically. No extra work needed.

## Open Questions

1. **Domain mandatory or optional?** The user-specified format is `[type]([domain]): message`, implying parens are required. The validator above enforces them. **If domain should be optional** (e.g. `docs: typo`), make the domain group optional in the regex: `\(([a-z0-9][a-z0-9\-_/]*)\)?` and adjust the validator. Recommend keeping it mandatory — the recent log shows most commits already include a scope.
2. **Subject-line length cap?** Conventional-commit style caps subjects at 72 chars. The current proposal does not enforce a length limit. Adding it is one extra `if (subject.length > 72) fail(...)`. Recommend: add a soft warning (print to stderr but still exit `0`) rather than a hard reject — long messages are annoying but not malformed.
3. **Should breaking-change marker `!` require a `BREAKING CHANGE:` footer in the body?** Conventional commits do. Recommend: out of scope — the hook only validates the subject line. Body conventions can be enforced later if/when the team adopts them.
4. **Should the hook also enforce lowercase first word of the subject?** E.g. reject `feature(palettes): Add hue swap`. Recommend: out of scope; a stylistic preference, not a format rule.

---

## Key files

### New
- `.githooks/commit-msg`
- `scripts/validate-commit-message.mjs`

### Modified
- `package.json` (`prepare` script)
- `CLAUDE.md` (Conventions section)
