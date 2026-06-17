# Public Changelog Page

**Epic:** Marketing & Branding
**Type:** Feature
**Status:** Todo
**Branch:** `feature/changelog-page`
**Merge into:** `main`

## Summary

Add a public `/changelog` page to Grimify that displays a user-friendly history of notable changes across all releases. The source of truth is a `CHANGELOG.md` file at the project root, following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions. The initial file is bootstrapped from the git tag history (v1.19.0 → v1.65.0), written in plain language for end users. A dedicated `ChangelogRenderer` component renders the markdown with version headers, category badges, and item lists styled to match the app's visual language. A "Changelog" link is added to the site footer.

## Why now

- The app has 65+ versioned releases (v1.19.0 to v1.65.0) with no public record visible to users. A changelog closes that transparency gap.
- The git tag discipline is already in place — each release is a tagged commit with a semantic version. The data exists; it just needs to be surfaced.
- Legal-page infrastructure (`(legal)` route group, `pageMetadata`, `<Main>`) and `react-markdown` are already present, making the page cheap to add.

## Format — Keep a Changelog

```markdown
# Changelog

All notable changes to Grimify will be documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [1.65.0] — 2026-05-27

### Added
- Breadcrumb navigation on paint, palette, recipe, hue, and brand detail pages.

### Fixed
- ...

## [1.64.1] — 2026-05-27

### Added
- Army management: admin CRUD for armies and factions, with Warhammer 40K seed data.
- Army tagging on palettes so painters can associate a palette with a faction.
```

**Change categories (use only those that apply per release):**

| Category | Meaning |
|---|---|
| `Added` | New features or content visible to users |
| `Changed` | Modifications to existing behaviour |
| `Fixed` | Bug fixes |
| `Removed` | Features or content that were removed |
| `Security` | Vulnerability patches (use if ever applicable) |

**Writing rules:**
- End-user language — no code references, no internal module names, no jargon.
- Present tense, active voice: "Add army tagging on palettes" not "Added ArmyCombobox component."
- Group rapid same-day patch releases (`.1`, `.2`, `.3`) into their parent minor release entry unless the change is user-visible and distinct.
- Omit purely internal changes (dependency bumps, refactors, doc-only commits) unless they affect users.

## Component design — `ChangelogRenderer`

The existing `MarkdownRenderer` intentionally limits its allowed elements to the set exposed by `MarkdownEditor` (user-entered content). A changelog is a controlled, trusted source so a richer renderer is appropriate.

Create `src/modules/marketing/components/changelog-renderer.tsx` supporting:

| Element | Styled as |
|---|---|
| `h1` | Large title (hidden — the page header carries the title) or `sr-only` |
| `h2` | Version badge row: `v1.65.0 — May 27, 2026` with a horizontal rule above each entry |
| `h3` | Section label chip: colored pill — Added (success), Changed (info), Fixed (warning), Removed (error), Security (primary) |
| `ul` / `li` | Standard disc list with comfortable line height |
| `a` | Styled link (`text-primary hover:underline`) — used for the `[Unreleased]` comparison links at the bottom of the file |
| `p` | Muted paragraph for intro text |
| `hr` | Optional thin divider (Keep a Changelog files sometimes emit these) |
| `strong`, `em`, `code` | Inherit from `MarkdownRenderer` token styles |

The H3 category pill colors map to daisyUI badge tokens so they update automatically with dark mode:

```tsx
const CATEGORY_BADGE: Record<string, string> = {
  Added:    'badge badge-soft badge-success',
  Changed:  'badge badge-soft badge-info',
  Fixed:    'badge badge-soft badge-warning',
  Removed:  'badge badge-soft badge-error',
  Security: 'badge badge-soft badge-primary',
}
```

## Page design — `/changelog`

Slot into the `(legal)` route group. Same container width and article structure as `terms/page.tsx`.

```tsx
// src/app/(legal)/changelog/page.tsx
import fs from 'node:fs'
import path from 'node:path'

export const metadata = pageMetadata({
  title: 'Changelog',
  description: 'A history of new features, improvements, and bug fixes in Grimify.',
  path: '/changelog',
})

export default function ChangelogPage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'CHANGELOG.md'),
    'utf-8'
  )

  return (
    <Main width="3xl" className="px-6">
      <article className="space-y-6">
        <header className="space-y-2">
          <PageTitle>Changelog</PageTitle>
          <p className="text-sm text-muted-foreground">
            A history of notable changes to Grimify.
          </p>
        </header>
        <ChangelogRenderer content={content} />
      </article>
    </Main>
  )
}
```

`fs.readFileSync` with `process.cwd()` is safe in a Next.js Server Component — `process.cwd()` resolves to the project root at build time and at runtime (Node.js server). No server action or Supabase query needed.

## URL & navigation

- **Route**: `/changelog`
- **Footer link**: Add `<Link href="/changelog">Changelog</Link>` to the `<nav>` in `src/components/footer.tsx` alongside Terms and Code of Conduct.
- No navbar link — the changelog is supplementary content, not a primary navigation destination.

## Initial CHANGELOG.md content

The implementing agent should:

1. Run `git log --tags --simplify-by-decoration --pretty="format:%D %ai"` to collect all version tags and their dates.
2. For each tag (newest first), run `git log <prev-tag>..<tag> --pretty=format:"%s" --no-merges` to collect commits.
3. Translate commits into user-friendly changelog entries using the categories above. Apply the writing rules: end-user language, no code references, omit internal-only changes.
4. Group same-day patch releases (`.1`, `.2`, `.3`) under their parent minor version unless the change is distinct.
5. Limit initial entries to the **most recent 20 releases** for brevity; add an `## [Older]` section at the bottom acknowledging prior history.

The agent should exercise judgment — not every commit produces a changelog entry. A commit like `chore: update package-lock.json` is silently dropped; a commit like `feat(armies): add admin army management CRUD` becomes "Added army management: admin tools for managing armies and factions."

## Implementation Plan

### Phase 1 — `CHANGELOG.md`

1. Review git history: all tags from `v1.19.0` to `v1.65.0` and their commit messages.
2. Create `CHANGELOG.md` at the project root. Include:
   - Standard Keep a Changelog header + link
   - `## [Unreleased]` section (initially empty — a placeholder for the next release)
   - One `## [version] — date` section per release (or grouped patch release), newest first
   - User-friendly entries under the appropriate category header
3. Verify the file parses as valid Markdown.

### Phase 2 — `ChangelogRenderer`

1. Create `src/modules/marketing/components/changelog-renderer.tsx`.
2. Import `ReactMarkdown` and define the extended component map (H1 hidden, H2 as version row, H3 as colored pill, etc.).
3. Export `ChangelogRenderer` with `{ content: string; className?: string }` props.
4. JSDoc the export and the `ChangelogRendererProps` type.
5. Verify `npx tsc --noEmit` passes.

### Phase 3 — `/changelog` page

1. Create `src/app/(legal)/changelog/page.tsx`.
2. Read `CHANGELOG.md` at the `process.cwd()` root using `node:fs`.
3. Export `metadata` using `pageMetadata`.
4. Render `<ChangelogRenderer content={content} />` inside the standard `<Main>` / `<article>` / `<header>` layout.
5. Verify the page loads at `/changelog` in the dev server.

### Phase 4 — Footer link

1. Edit `src/components/footer.tsx` to add `<Link href="/changelog">Changelog</Link>` in the existing `<nav>` block alongside Terms of Use and Code of Conduct.
2. Verify the link appears in the footer and navigates correctly.

### Phase 5 — Docs

1. JSDoc every new export (`ChangelogRenderer`, `ChangelogRendererProps`).
2. `npx tsc --noEmit` and `npm run lint` — zero new errors.

### Affected Files

| # | File | Role | Change |
|---|------|------|--------|
| 1 | `CHANGELOG.md` | changelog source | **New** — initial content from git history |
| 2 | `src/modules/marketing/components/changelog-renderer.tsx` | component | **New** — extended markdown renderer for changelog display |
| 3 | `src/app/(legal)/changelog/page.tsx` | route page | **New** — public `/changelog` page |
| 4 | `src/components/footer.tsx` | shared component | **Edit** — add Changelog link to footer nav |

No changes to `MarkdownRenderer`, `MarkdownEditor`, or any other existing component.

### Risks & Considerations

- **`fs.readFileSync` path at runtime.** `process.cwd()` resolves to the project root in the Next.js Node.js server. If the app is ever deployed in an environment that changes `cwd` (e.g., a Docker image that `COPY`s only `dist/`), the file must also be copied. This is the same pattern used by many Next.js documentation sites; document in the component's JSDoc.
- **Build-time vs runtime.** Because the changelog page is a Server Component with `fs.readFileSync`, it re-reads the file on every request (no static generation unless `export const revalidate = false` is added). For now, runtime reads are fine — the file changes only on deploy. Add `export const dynamic = 'force-static'` to generate it at build time if needed (simple one-liner change).
- **Initial content quality.** Auto-generating changelog copy from commit messages requires judgment. The implementing agent should prioritize user impact over technical detail. Entries that describe internal plumbing (refactors, package updates, docs-only commits) should be omitted.
- **`ChangelogRenderer` vs extending `MarkdownRenderer`.** We deliberately keep them separate: `MarkdownRenderer` is the safe renderer for user-entered content (restricted allow-list); `ChangelogRenderer` is the trusted renderer for app-owned content. Merging them would loosen the user-content renderer's safety guarantees.
- **Versioning cadence.** The app has had multiple patch releases per day (e.g., v1.56.0 through v1.56.3 on adjacent days). Grouping these in the changelog avoids a noisy list. The grouping rule: patch releases that fix an issue introduced in the same minor release should be merged into that entry; patch releases that fix a pre-existing issue should appear as a `### Fixed` entry under a merged heading (e.g., `## [1.56.0–1.56.3] — 2026-05-18`).

## Acceptance Criteria

- [ ] `CHANGELOG.md` exists at the project root in Keep a Changelog format, with at least the 20 most recent releases documented in user-friendly language.
- [ ] `/changelog` route renders the changelog content in a browser.
- [ ] Version headers (`## [1.65.0]`) display prominently with the release date.
- [ ] Change category headers (`### Added`, `### Fixed`, etc.) display as colored badge pills.
- [ ] The page uses the standard legal-page layout (`<Main width="3xl">`, `<PageTitle>`, `<article>`).
- [ ] `pageMetadata` is applied with a meaningful title and description.
- [ ] A "Changelog" link appears in the site footer nav alongside Terms of Use and Code of Conduct.
- [ ] `ChangelogRenderer` is in `src/modules/marketing/components/` with full JSDoc.
- [ ] No new TypeScript or lint errors.
- [ ] The page loads without a flash of unstyled content or a client-side refetch — content is rendered on the server.
