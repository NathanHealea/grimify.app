# Footer Version Display

**Epic:** Application Improvements
**Type:** Enhancement
**Status:** Completed
**Branch:** `enhancement/footer-version-display`
**Merge into:** `main`

## Summary

Render the current application version (e.g. `v1.63.0`) at the very bottom of the site footer so users — and the team — can see at a glance which build is currently deployed. The value is sourced from the `version` field in `package.json`, which is already bumped as part of the release flow (`/release`). No new tooling, env vars, or build-time scripts are required.

The current footer (`src/components/footer.tsx`) renders a copyright line on the left and a row of navigation links on the right inside a `flex-col sm:flex-row` container. This enhancement adds a third, full-width row below those two elements containing the version string in muted small text, centered on the row to avoid biasing the existing left/right rhythm.

## Goals

- Surface the deployed app version somewhere persistent and unobtrusive.
- Use the value that already exists in `package.json` — do not introduce a second source of truth.
- Keep the footer markup and styling consistent with the existing visual language (muted small text, `text-sm text-muted-foreground` family).
- Zero new dependencies. Zero new build steps. Zero new env vars.

## Non-Goals

- No git SHA, build time, or environment label (dev/preview/prod) display.
- No automatic version bumping — `/release` already owns that.
- No version-history UI, changelog modal, or "what's new" popover. This is a single static label only.
- No changes to `/release`, `package.json` bump conventions, or CI.

## Acceptance Criteria

- [x] The footer renders a third row below the existing copyright + nav links.
- [x] The third row displays the version in the form `v<semver>` (lowercase `v`, no spaces), e.g. `v1.63.0`.
- [x] The version value matches the `version` field of `package.json` exactly at build time.
- [x] The text uses muted small typography consistent with the rest of the footer (`text-xs text-muted-foreground` or visually equivalent — one step smaller than the existing `text-sm` is acceptable to de-emphasize it).
- [x] The version row is horizontally centered within the footer container at all viewport widths.
- [x] The version row is announced sensibly to assistive tech: a `<small>` element with an `aria-label` like `"Application version 1.63.0"` (or equivalent visually-hidden label).
- [x] Bumping `version` in `package.json`, rebuilding, and reloading the page shows the new value.
- [x] No new runtime dependencies, no new env vars, no changes to `next.config.ts`.
- [x] No new client components are introduced — the footer remains a server component.

## Codebase Context

### Footer location

The footer lives in a single file as a top-level shared component:

| File | Lines | Notes |
|---|---|---|
| `src/components/footer.tsx` | 1–39 | Server component (no `'use client'` directive). Imports `next/link` only. Wrapped in a `<footer class="mt-auto border-t bg-background">` and renders `<p>&copy; ...</p>` + a `<nav>` with three links. |
| `src/app/layout.tsx` | 105 | Mounts `<Footer />` once for every route inside the root `RootLayout`. |

The footer is mounted in the root layout, so a change here surfaces on every page in the app.

The current rendered markup (post-render) is roughly:

```
[Footer container]
  [Inner flex row]
    [© 2026 Grimify]   [Terms · Code of Conduct · GitHub]
```

After this enhancement:

```
[Footer container]
  [Inner flex row]
    [© 2026 Grimify]   [Terms · Code of Conduct · GitHub]
  [Version row]
    v1.63.0
```

### Source of truth for the version

The canonical version lives in `package.json`:

```json
{ "name": "grimify.app", "version": "1.63.0", ... }
```

Recent release commits (e.g. `feat(collection): ... (v1.63.0)`) confirm `package.json` is the value that gets bumped during `/release`. No other version constant exists in the repo — `grep -r "1.63"` returns only `package.json` and the release commit messages.

### Build / runtime environment

- Framework: Next.js `16.1.6` (App Router).
- React `19.2.3`.
- The footer is a server component, rendered at request time on the server (or at build time for statically generated routes).
- TypeScript with `"resolveJsonModule": true` is already enabled implicitly via the Next.js TS preset — `import` of `package.json` works out of the box in server code.

## Approach Decision

### Option A — Direct JSON import in the server component (selected)

```tsx
// src/components/footer.tsx
import packageJson from '../../package.json'

const APP_VERSION = packageJson.version
```

**Pros:**

- One file change. No `next.config.ts` change. No env var.
- The value is inlined at build time by Next.js / TypeScript — there is no runtime filesystem read.
- Works because `Footer` is a server component; server components freely import any module, including JSON.
- Type-safe: `packageJson.version` is typed as `string` via JSON-module type inference.

**Cons:**

- Importing the whole `package.json` pulls the JSON into the server bundle. For a ~1 KB JSON this is a non-issue; if the file grew large (it won't), a generated `version.ts` would be preferable.

### Option B — `NEXT_PUBLIC_APP_VERSION` env var set in `next.config.ts`

```ts
// next.config.ts
import pkg from './package.json' assert { type: 'json' }

export default {
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
  // ...existing config
}
```

Then read `process.env.NEXT_PUBLIC_APP_VERSION` in the component.

**Pros:**

- Available in both server and client components without re-importing JSON.
- The value is publicly inlined into the client bundle by Next.js's `NEXT_PUBLIC_` convention.

**Cons:**

- Adds a `next.config.ts` change. The footer is server-only today and has no need for client access.
- Two-step indirection (config sets env, component reads env) for a single value.

### Option C — Git tag or commit SHA at build time

E.g. shell out to `git describe` during the Next build.

**Pros:** Reflects exact deployed commit.

**Cons:** Overkill for the request. Requires git to be available at build time (true locally and on Vercel, but coupling the build to a git invocation for one cosmetic label is not worth it). The user asked for the **version number**, not the build hash.

### Decision

**Option A**. Direct import of `package.json` in `src/components/footer.tsx`. It is the smallest possible change that satisfies the request, keeps the footer a server component, requires no infra changes, and inlines the value at build time so there is no runtime risk of the file being missing.

If a future feature needs the version on the client (e.g. a "you're using vX, latest is vY" banner), we can switch to Option B at that point — Option A does not block it.

## Display Specification

### Text format

`v` + the exact `version` string from `package.json`, no whitespace.

- Examples: `v1.63.0`, `v2.0.0`, `v1.63.0-beta.1` (semver pre-release tags pass through unchanged).

### Typography

| Property | Value | Source |
|---|---|---|
| Element | `<small>` | Semantic match for fine-print version label. |
| Font size | `text-xs` (one step smaller than the existing `text-sm` footer text) | De-emphasize relative to copyright + nav. |
| Color | `text-muted-foreground` | Matches the existing footer text token. |
| Weight | default (no `font-medium`) | Plain, recedes into the footer. |
| Letter-spacing | default | No special tracking. |
| Alignment | `text-center` on the row | Visually distinct from the left/right poles of the row above. |

### Layout placement

The existing footer inner wrapper is:

```tsx
<div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
  <p>...</p>
  <nav>...</nav>
</div>
```

The version row sits **below** that inner row, inside the same `<footer>` but as a separate full-width block so it is always centered and never wraps awkwardly between the copyright and the nav at small breakpoints.

Proposed new structure (markup intent, not final code):

```tsx
<footer className="mt-auto border-t bg-background">
  <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 pt-6 pb-3 text-sm text-muted-foreground sm:flex-row">
    {/* existing copyright + nav, padding-bottom reduced */}
  </div>
  <div className="mx-auto w-full max-w-6xl px-6 pb-6 text-center">
    <small className="text-xs text-muted-foreground" aria-label={`Application version ${APP_VERSION}`}>
      v{APP_VERSION}
    </small>
  </div>
</footer>
```

Notes:

- The original `py-6` is split into `pt-6 pb-3` on the existing row and `pb-6` on the new row so total vertical breathing room is unchanged.
- The new block uses the same `mx-auto max-w-6xl px-6` rhythm so the centerline matches the row above.
- Tailwind tokens — no new CSS file or `.css` class definition needed. (See `src/styles/` documentation requirements in `CLAUDE.md` — no new component class is being introduced, so the header requirement does not apply.)

### Accessibility

- Use `<small>` rather than a `<span>` — `<small>` is the semantic element for "side comments and small print" per HTML spec, which is exactly what a version footnote is.
- Add `aria-label={`Application version ${APP_VERSION}`}` so screen readers read "Application version 1.63.0" instead of "v 1.63.0" (which screen readers may pronounce as "v one point sixty-three point oh").
- No tab stop, no interactive role — the version is informational only.
- Contrast: `text-muted-foreground` on `bg-background` already meets the project's existing footer contrast level. No new contrast considerations.

## Implementation Plan

### Step 1 — Modify the Footer component

Edit `src/components/footer.tsx`:

1. Add an import for `package.json` at the top of the file (relative path `../../package.json` from `src/components/footer.tsx` to the repo root).
2. Extract the version into a `const APP_VERSION = packageJson.version` near the imports.
3. Restructure the `<footer>` body so the existing flex row sits inside a `pt-6 pb-3` block and a new centered `<small>` row sits below it inside a `pb-6` block. Keep the outer `<footer>` `mt-auto border-t bg-background` unchanged.
4. Update the existing inner `<div>`'s vertical padding from `py-6` to `pt-6 pb-3`.
5. Render the version label as a `<small>` element with the `aria-label` specified in the Display Specification above.
6. Update the component's JSDoc to mention the new third row ("Also displays the current application version sourced from `package.json`.").

The footer remains a server component — do **not** add `'use client'`.

### Step 2 — Verify the TypeScript JSON import resolves

The Next.js + TypeScript preset already enables `resolveJsonModule` and `esModuleInterop`. The import should typecheck without changes to `tsconfig.json`. If for any reason `tsc` complains (it should not), add `"resolveJsonModule": true` to `compilerOptions` in `tsconfig.json` as a defensive fallback — but only if needed.

### Step 3 — Manual visual verification

1. Run `npm run dev`.
2. Open any page (e.g. `/`) and confirm the footer shows three visual rows: copyright + nav (existing row) and `v1.63.0` (new row, centered, smaller).
3. Bump `package.json` `version` to `1.63.1` temporarily, refresh the dev page, and confirm the footer updates. Revert.
4. Inspect the rendered HTML in dev tools and confirm a `<small>` element with the expected `aria-label` is present.
5. Toggle dark mode and confirm the muted text reads correctly in both themes.
6. Resize the viewport to a narrow width (~360 px) and confirm the version row stays centered and does not push the row above into a weird wrap.

### Step 4 — No automated tests

Per `CLAUDE.md` § Testing, the project has **no test framework**. There is nothing to add here. The manual verification in Step 3 is the verification.

## Affected Files

| File | Change |
|---|---|
| `src/components/footer.tsx` | **Modified.** Add `package.json` import, extract `APP_VERSION`, restructure JSX into two stacked rows (existing copyright/nav row on top, new centered version row below). Update JSDoc. |
| `package.json` | **Read only** (no change) — sourced as the version value. |
| `next.config.ts` | **No change** (Option A does not need this). |
| `tsconfig.json` | **No change expected.** Only modify defensively if `resolveJsonModule` is missing from the resolved config and the JSON import fails to typecheck. |

No new files. No deletions. No CSS additions.

## Release Workflow Integration

This enhancement does not change the release flow. The project's `/release` skill bumps `package.json` `version` as part of cutting a release; the footer simply surfaces whatever value is in that file at build time. Once this lands, the next `/release` automatically updates the displayed version in the footer with no extra work.

If the release flow does **not** currently bump `package.json` (worth confirming during implementation), then this enhancement's value is reduced — but it still correctly reflects the version that was committed at build time, and the gap is a release-flow improvement to address separately (not part of this doc).

## Edge Cases and Risks

1. **`package.json` becomes unreadable at runtime.** Cannot happen with Option A — the JSON is statically imported and inlined at build time, so the running server never reads the file. If the import fails, the build itself fails, and the broken build never ships.
2. **Pre-release version strings (`1.63.0-beta.1`).** Pass through unchanged. The footer will render `v1.63.0-beta.1`. Acceptable.
3. **Bundle size impact.** Importing `package.json` brings the JSON into the server bundle, but Next.js does not ship the server bundle to the client. The footer remains a server component, so the version constant is rendered into static HTML and the client receives a plain string — zero client-bundle bloat.
4. **Cache busting after a release.** Because the version is rendered server-side, every newly-built deployment serves the updated string immediately. There is no client-side cache that could go stale (no `localStorage`, no service worker is involved). If/when a service worker is added to the app, revisit caching.
5. **Footer becomes a client component later.** If a future change requires the footer to be a client component, switch to Option B (`NEXT_PUBLIC_APP_VERSION` via `next.config.ts`) at that time. The migration is a five-line diff and does not affect the rendered output.
6. **Mobile viewport stacking.** The existing footer already stacks vertically below the `sm` breakpoint (`flex-col sm:flex-row`). The new version row stacks naturally below the existing row at every breakpoint. No new responsive concerns.
7. **Visual noise.** The version is intentionally rendered at `text-xs` and muted color so it does not compete with the copyright or links. If product wants the version to be even more discreet (e.g. only visible on hover, or only in dev/preview), open a follow-up — out of scope here.

## Open Questions

1. **Should the version link anywhere?** A common pattern is to link the version label to the GitHub release page (e.g. `https://github.com/NathanHealea/grimify.app/releases/tag/v1.63.0`). This doc proposes a **plain `<small>`**, not a link, to keep the footer simple. If product wants the link, swap `<small>` for an `<a>` with the same typography and an external-link affordance. Out of scope for this enhancement.
2. **Should the version row collapse on very small screens?** At ~320 px the version is already small and centered — no collapse needed. Flag if product disagrees.
3. **Should there be a tooltip with build time / commit SHA on hover?** Out of scope. If wanted later, that becomes Option C (git SHA at build time) and gets its own doc.

## Key Files

### Modified
- `src/components/footer.tsx`

### Read (no change)
- `package.json` (version source)
- `src/app/layout.tsx` (mount point, unchanged)
