# Code of Conduct

**Epic:** Marketing & Branding
**Type:** Feature
**Status:** Todo
**Branch:** `v1/feature/code-of-conduct`
**Merge into:** `v1/main`

## Summary

Create a Code of Conduct page that sets community expectations for behavior within Grimify, especially around shared content like recipes, palettes, and comments. Pairs with the boilerplate Terms of Use — same `(legal)` layout, same plain-language tone, same hobbyist framing.

## Acceptance Criteria

- [ ] A `/code-of-conduct` route exists and is publicly accessible
- [ ] Code of Conduct covers: our pledge, expected behavior, unacceptable behavior, content guidelines, reporting, enforcement, scope, and contact
- [ ] Content is written in a welcoming, inclusive tone (Contributor Covenant–inspired, adapted for a user community)
- [ ] Page metadata uses `pageMetadata` from the `seo` module
- [ ] Page mirrors the visual structure of `/terms` (numbered `<section>` blocks, "Last updated" line, semantic headings)
- [ ] Footer link to `/code-of-conduct` resolves (currently links to a placeholder — verify it goes live)
- [ ] Sign-up notice link to `/code-of-conduct` resolves
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route              | Description          |
| ------------------ | -------------------- |
| `/code-of-conduct` | Code of Conduct page |

## Key Files

| Action   | File                                                | Description                                                                                |
| -------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Create   | `src/app/(legal)/code-of-conduct/page.tsx`          | Code of Conduct server component                                                           |
| Existing | `src/app/(legal)/layout.tsx`                        | Shared legal layout — reused as-is                                                          |
| Existing | `src/components/footer.tsx`                         | Already links `/code-of-conduct`                                                            |
| Existing | `src/app/(auth)/sign-up/page.tsx`                   | Sign-up notice already references `/code-of-conduct`                                        |
| Existing | `src/middleware.ts`                                 | `/code-of-conduct` already in `LEGAL_ROUTES` (auth bypass)                                  |

## Implementation Plan

### Pre-flight: what's already done

The Terms of Use PR landed the shared infrastructure. As of planning, all of these already exist and reference `/code-of-conduct` — we just need to make the link resolve:

- **`(legal)` layout** at `src/app/(legal)/layout.tsx` — transparent passthrough (`<>{children}</>`). Pages in this group own their `<main>` via the shared {@link Main} component, so the layout intentionally does **not** apply a width or padding wrapper. Use `<Main width="3xl" className="px-6">` on the page itself to inherit the legal column.
- **Footer** at `src/components/footer.tsx` — already includes a `/code-of-conduct` link
- **Sign-up notice** at `src/app/(auth)/sign-up/page.tsx` — already says "By signing up, you agree to our Terms of Use and Code of Conduct"
- **Middleware** at `src/middleware.ts` — already allows `/code-of-conduct` as a public legal route (in the `LEGAL_ROUTES` array)
- **Terms page** at `src/app/(legal)/terms/page.tsx` — section 1 already links to `/code-of-conduct` for cross-reference

This feature is therefore **page creation only** — no layout, footer, sign-up, or middleware changes required.

### Domain module placement

Static, route-only content — no domain module needed. The page lives directly under `src/app/(legal)/code-of-conduct/`, following the same pattern as `/terms`.

### 1. Create the Code of Conduct page

Create `src/app/(legal)/code-of-conduct/page.tsx` as a server component. Mirror the structure of `src/app/(legal)/terms/page.tsx` exactly so the two legal pages feel consistent:

- `metadata` exported via `pageMetadata({ title, description, path: '/code-of-conduct' })`
- A `lastUpdated` constant at module scope
- Wrap the body in `<Main width="3xl" className="px-6">` — the `(legal)` layout is a passthrough, so the page is responsible for the readable-column width (identical to how `/terms` does it)
- An `<article className="space-y-6">` root inside `<Main>`
- A `<header className="space-y-2">` with `<h1 className="text-3xl font-semibold tracking-tight">` and a "Last updated: …" `<p className="text-sm text-muted-foreground">` line
- An intro paragraph (`<p className="text-muted-foreground">`) that frames the doc in plain language
- Numbered `<section className="space-y-2">` blocks, each with an `<h2 className="text-xl font-semibold tracking-tight">` and one or more `<p>` / `<ul className="list-disc space-y-1 pl-6">` children
- Internal links (e.g. the Contributor Covenant attribution) use `className="text-primary underline-offset-4 hover:underline"` and `target="_blank" rel="noreferrer"` for external URLs — same pattern as the GitHub link in `/terms` section 11

Sections, in order:

1. **Our Pledge** — Grimify is a welcoming community for miniature painters of every skill level, background, and style. We commit to a harassment-free experience for everyone.
2. **Expected Behavior** — Be respectful and constructive. Give credit when sharing or adapting another painter's recipe, palette, or technique. Assume good faith. Welcome beginners.
3. **Unacceptable Behavior** *(use a `<ul>`)* — harassment, hate speech, or personal attacks; doxxing or sharing private info; spam or excessive self-promotion; plagiarism of recipes, guides, or images without attribution; deliberate misinformation about paint products or techniques.
4. **Content Guidelines** — Recipes, palettes, and collections you share should be original or properly attributed. Do not upload copyrighted images you do not have rights to. Keep critique focused on work, not the person behind it.
5. **Reporting** — How to report violations: open an issue on the GitHub repository, or once available, use the in-app report button. Provide enough detail (links, usernames, screenshots) to investigate.
6. **Enforcement** — Maintainers may take any action they deem appropriate, ranging from a private warning, to content removal, to temporary or permanent account suspension. Decisions are final but you may appeal by contacting the maintainers.
7. **Scope** — Applies to all Grimify community surfaces — recipes, palettes, profiles, comments, and any future community features. Also applies to off-platform behavior (e.g., harassment of other Grimify users on social media) when it affects the safety of the community.
8. **Attribution** — Adapted from the [Contributor Covenant](https://www.contributor-covenant.org/), version 2.1, modified for a user community rather than open-source contributors.
9. **Contact** — Link to the GitHub repository issues for general questions; note that sensitive reports can be sent to a dedicated maintainer email if/when one is set up.

Keep total length short — same rhythm as the Terms page (target one screen of scrolling).

### 2. Verification

- Visit `/code-of-conduct` in dev — content renders in the centered readable column.
- Visit footer link — navigates to `/code-of-conduct` (was a dead link before this PR).
- Visit `/sign-up` — Code of Conduct link in the notice now resolves.
- Visit `/terms` — section 1 cross-link to Code of Conduct resolves.
- `npm run build` and `npm run lint` pass.

### Affected Files

| File                                                 | Changes                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| `src/app/(legal)/code-of-conduct/page.tsx`           | New — Code of Conduct server component, structure mirrors `/terms`   |

That's it — single file. All wiring already exists.

### Risks & Considerations

- **Tone consistency** — Keep the Contributor Covenant influence visible (welcoming, plain language) but adapt for a user community, not an OSS project. Avoid jargon like "contributors" or "maintainers" except in the enforcement/contact sections.
- **Reporting endpoint** — We don't have an in-app report button or a dedicated abuse email yet. Use the GitHub issues link as the interim channel; revisit when community features ship (per `07-community-social/`).
- **Per-form CoC link (deferred)** — The original doc suggested linking from "recipe/palette submission forms". Skip this for v1 — the sign-up notice already covers acceptance, and adding inline CoC reminders to every content-creation form is friction without a clear payoff. Revisit when moderation tooling is built.
- **Scope creep** — Resist adding moderation policy, ban-appeal procedure, or detailed enforcement workflow. Those belong in the Community & Social epic (`docs/07-community-social/`), not here.
- **Not legal advice** — Boilerplate community standards. Have a lawyer review before any commercial launch or paid features.

## Notes

- Adapted from the [Contributor Covenant](https://www.contributor-covenant.org/), modified for a user community.
- The Code of Conduct can be expanded as community features grow.
- Enforcement mechanisms (reporting, moderation) are implemented in the Community & Social epic — this page just defines the rules.
- This page is the second occupant of the `(legal)` route group; see `03-terms-of-use.md` for the first.
