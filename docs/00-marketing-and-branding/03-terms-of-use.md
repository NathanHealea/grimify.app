# Terms of Use

**Epic:** Marketing & Branding
**Type:** Feature
**Status:** Done
**Branch:** `v1/feature/terms-of-use`
**Merge into:** `v1/main`

## Summary

Boilerplate Terms of Use page that frames Grimify as a hobbyist project provided **as-is, with no warranties**, and explicitly disclaims any affiliation with paint manufacturers. Paint names, color names, product imagery, brand marks, and trademarks referenced by the app belong to their respective owners; Grimify is not endorsed, sponsored, or affiliated with Citadel, Vallejo, Army Painter, Scale75, AK Interactive, or any other paint company.

## Acceptance Criteria

- [x] A `/terms` route exists and is publicly accessible
- [x] Page includes an explicit **"As-Is" / No Warranty** disclaimer
- [x] Page includes a **Non-Affiliation / Trademarks** section disclaiming any relationship with paint manufacturers and acknowledging third-party trademarks
- [x] Page covers: acceptance of terms, account responsibilities, user-generated content, prohibited conduct, limitation of liability, termination, changes to terms, and contact
- [x] Content is written in plain, readable language (boilerplate, not heavy legalese)
- [x] Page is linked from the site footer (creating the footer is in scope if one does not yet exist)
- [x] Sign-up page references the Terms of Use (e.g., "By signing up, you agree to our Terms of Use and Code of Conduct")
- [x] Page metadata uses `pageMetadata` from the `seo` module
- [x] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route    | Description       |
| -------- | ----------------- |
| `/terms` | Terms of Use page |

## Key Files

| Action | File                                            | Description                                                                   |
| ------ | ----------------------------------------------- | ----------------------------------------------------------------------------- |
| Create | `src/app/(legal)/layout.tsx`                    | Shared layout for legal pages (centered, readable max-width, generous padding) |
| Create | `src/app/(legal)/terms/page.tsx`                | Terms of Use server component                                                  |
| Create | `src/components/footer.tsx`                     | Site footer with links to `/terms` and `/code-of-conduct` (if not yet present) |
| Modify | `src/app/layout.tsx`                            | Mount the new `<Footer />` after `{children}`                                  |
| Modify | `src/app/(auth)/sign-up/page.tsx`               | Add a small terms-acceptance note above or below the sign-up form              |

## Implementation Plan

### Domain module placement

This feature is **static, route-only content** — no domain module is needed. Pages live directly under `src/app/(legal)/` per the Domain Module convention (route pages are thin and may hold layout-only content without a backing module).

### 1. Create the `(legal)` route group layout

Create `src/app/(legal)/layout.tsx` as a server component that wraps children in a centered, readable container:

```tsx
// Pseudocode shape
<main className="mx-auto w-full max-w-3xl px-6 py-12 prose">
  {children}
</main>
```

Use existing daisyUI/Tailwind tokens — no new global styles. The layout is shared with `/code-of-conduct` (see `04-code-of-conduct.md`).

### 2. Create the Terms of Use page

Create `src/app/(legal)/terms/page.tsx` as a server component rendering semantic HTML (`<h1>`, `<h2>`, `<p>`, `<ul>`). Export `metadata` via the existing `pageMetadata` helper from `@/modules/seo/utils/page-metadata`.

Sections, in order — written as plain-language boilerplate:

1. **Acceptance of Terms** — Using Grimify means you agree to these terms. If you don't agree, don't use the app.
2. **The Service is Provided "As-Is"** — Grimify is a hobbyist project offered free of charge. The service, paint data, color comparisons, and recommendations are provided **"as-is" and "as available"**, without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, accuracy, or non-infringement. Use at your own risk.
3. **No Affiliation with Paint Manufacturers** *(the disclaimer the user explicitly asked for)* — Grimify is **not affiliated with, endorsed by, or sponsored by** any paint manufacturer, including but not limited to Citadel / Games Workshop, Vallejo, The Army Painter, Scale75, AK Interactive, Reaper, Pro Acryl / Monument Hobbies, P3 / Privateer Press, or any other brand referenced in the app. All paint names, color names, product images, brand names, logos, and trademarks are the property of their respective owners. Grimify references these marks **for identification and comparison purposes only** under nominative/fair use. If you are a rights holder and have concerns, see the Contact section.
4. **Paint Data Accuracy** — Paint and color data is sourced from publicly available manufacturer information and community contributions. Grimify does not guarantee accuracy, and color rendering on screen will differ from physical paint. Always verify critical purchases against the manufacturer's official source.
5. **Account Responsibilities** — Keep your credentials secure; you are responsible for activity on your account.
6. **User-Generated Content** — You retain ownership of recipes, palettes, collections, and other content you submit. By submitting, you grant Grimify a non-exclusive, worldwide, royalty-free license to host, display, and share that content within the app. You are responsible for ensuring you have the right to share what you submit.
7. **Prohibited Conduct** — No abuse, harassment, scraping, automated access without permission, attempts to disrupt the service, or uploading unlawful, infringing, or malicious content.
8. **Limitation of Liability** — To the maximum extent permitted by law, Grimify and its maintainers are not liable for indirect, incidental, or consequential damages arising from use of the service.
9. **Termination** — Grimify may suspend or terminate accounts that violate these terms. You may delete your account at any time.
10. **Changes to These Terms** — Terms may be updated; material changes will be communicated in-app or by email. Continued use after changes means acceptance.
11. **Contact** — A contact email or link for questions, takedown requests, or rights-holder concerns.

Keep total length short (target one screen of scrolling) — boilerplate, not a wall of text.

### 3. Site footer

Check whether a `Footer` component exists. As of planning, `src/app/layout.tsx` renders only `<Navbar />` + `{children}` + `<Toaster />` — there is no footer yet. Implementation must:

- Create `src/components/footer.tsx` (server component) with at minimum:
  - Copyright line ("© {year} Grimify")
  - Link to `/terms`
  - Link to `/code-of-conduct` (forward-compatible placeholder — page will be created in the companion PR)
  - Optional: link to GitHub / contact
- Mount `<Footer />` in `src/app/layout.tsx` after `{children}` so it sits at the bottom of the body flex column.

If the Code of Conduct PR has already landed and added a footer, this step is skipped — just add the `/terms` link to the existing footer.

### 4. Sign-up page reference

Modify `src/app/(auth)/sign-up/page.tsx` to add a short notice — typically rendered inside `<CardFooter>` or directly under the form:

```tsx
<p className="text-xs text-muted-foreground">
  By signing up, you agree to our{' '}
  <Link href="/terms" className="underline">Terms of Use</Link>
  {' '}and{' '}
  <Link href="/code-of-conduct" className="underline">Code of Conduct</Link>.
</p>
```

Do **not** add a checkbox or block submission on agreement — clickwrap framing via the notice is sufficient for a boilerplate hobbyist app.

### 5. SEO metadata

Use `pageMetadata({ title: 'Terms of Use', description: '...', path: '/terms' })` so the page inherits the site's OpenGraph defaults and gets a proper canonical URL.

### 6. Verification

- Visit `/terms` in dev — content renders in centered readable column.
- Visit footer link — navigates to `/terms`.
- Visit `/sign-up` — the terms notice is visible and links work.
- `npm run build` and `npm run lint` pass.

### Affected Files

| File                                            | Changes                                                                                   |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/app/(legal)/layout.tsx`                    | New — shared centered/readable layout for legal pages                                     |
| `src/app/(legal)/terms/page.tsx`                | New — Terms of Use server component with `pageMetadata` export                            |
| `src/components/footer.tsx`                     | New — site footer with `/terms` link (if a footer does not yet exist)                     |
| `src/app/layout.tsx`                            | Add `<Footer />` after `{children}` (only if creating the footer here)                    |
| `src/app/(auth)/sign-up/page.tsx`               | Add a short terms-acceptance note linking to `/terms`                                     |

### Risks & Considerations

- **Footer dependency** — The Code of Conduct doc also asks for a footer link. Whichever feature lands first owns footer creation; the second one only adds its link. Coordinate so we don't double-build the footer.
- **Trademark wording** — The non-affiliation paragraph names specific manufacturers. Keep the list illustrative ("including but not limited to"), since the paint catalog will grow. The intent is clear nominative/fair-use framing, not an exhaustive list.
- **Not legal advice** — This is hobbyist boilerplate. If Grimify ever takes paid features, sponsorships, or stores commercial data, a lawyer should review.
- **Content drift** — Paint manufacturer list and contact info will rot. The page should be a single-source-of-truth file that is easy to edit; no DB-backed content.
- **No clickwrap blocking** — We intentionally do not gate sign-up on a checkbox. If terms compliance becomes load-bearing later (e.g., paid plans), revisit with a checkbox + recorded acceptance timestamp.

## Notes

- This is **not legal advice**. The content is intentionally boilerplate; have a lawyer review before any commercial launch.
- Keep language plain — avoid heavy legalese.
- The `(legal)` layout is shared with the Code of Conduct page (`04-code-of-conduct.md`).
- The non-affiliation disclaimer is the most important section for this app — keep it prominent and easy to find.
