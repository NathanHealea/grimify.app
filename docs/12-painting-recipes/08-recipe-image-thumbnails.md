# Recipe Image Thumbnails — Faster Photo Loading via Supabase Storage Transforms

**Epic:** Painting Recipes
**Type:** Enhancement
**Status:** Todo
**Branch:** `enhancement/recipe-image-thumbnails`
**Merge into:** `main`

## Summary

Recipe images load slowly because every render path — recipe cards, gallery thumbnails, lightboxes — fetches the **original** full-resolution photo straight from the `recipe-photos` bucket. A 5–10 MB JPEG from a modern phone gets shipped to render a 96×96 grid tile, dragging First Contentful Paint and chewing through mobile data.

This enhancement adds a single chokepoint that requests **resized variants** for the small contexts that don't need full resolution, while preserving the original for the lightbox / detail views. Supabase Storage's built-in image transformation pipeline does the resize on-the-fly via URL query params (`?width=…&height=…&resize=cover&quality=…&format=origin`) — no extra storage, no upload-time work, no schema change, and existing photos benefit immediately.

We do **not** introduce a separate thumbnail file or column. The single point of change is `composePhotoUrl` (already the documented chokepoint per `03-recipe-photos.md` Risks → "Image transforms") plus its callsites picking the right size for the context.

## Problem

`composePhotoUrl` returns the raw object URL today:

```ts
return bucket.getPublicUrl(storagePath).data.publicUrl
```

That URL is wired through every consumer:

| Consumer | Display size | Currently requests |
|---|---|---|
| `RecipeCard` cover (dashboard + browse + `/recipes`) | `aspect-video w-full` (~360px wide on mobile, ~280px in a 3-col grid) | Original (often 3–4000px) |
| `RecipePhotoThumbnail` (builder + detail galleries) | `aspect-square` tile (~120–200px) | Original |
| `RecipePhotoThumbnail` compact (step photos) | `aspect-square` smaller (~80–120px) | Original |
| `RecipePhotoLightbox` | `max-h-[80vh] max-w-full` | Original (correct) |

A recipe with 12 step photos plus a cover therefore downloads ~13 full-res files just to render the read view above the fold — before the user opens the lightbox.

Additional contributing factors:

- All `<img>` usages are raw `<img>` (with `eslint-disable @next/next/no-img-element`), so `next/image` optimization, AVIF/WebP negotiation, and srcset are bypassed. We're not going to switch to `next/image` in this enhancement (see Rejected Option C below), but the consequence is that the browser's `Accept` header is our only format negotiation lever.
- `width_px` / `height_px` are stored on `recipe_photos`, but only used as raw `width` / `height` attributes on the `<img>` — they're not driving any responsive `srcset`.

## Goals

- Recipe card grids and photo gallery thumbnails load images that are sized for their display context, not the source resolution.
- The recipe lightbox and any "open full" path continue to serve the original photo (or a high-quality large variant).
- Existing photos in the `recipe-photos` bucket benefit on the next page load, without a backfill script or re-upload.
- The mechanism stays in one place — `composePhotoUrl` — so size policy is a single grep away from any consumer.
- No new dependencies, no new schema columns, no new server-action work in the upload path.

## Non-Goals

- Replacing the recipe upload flow with a server-side resize step (see Rejected Option A — re-evaluate only if the Supabase image-transform usage cap becomes a cost concern).
- Migrating the recipe module to `next/image` (separate enhancement; tracked here as future work).
- Adding new bucket folders (`thumbs/`, etc.) or a `image_thumb_path` column.
- Adding responsive `srcset` to `<img>` tags (deferred until/unless the read view shows a measurable LCP regression at >2× DPR).
- Background lazy-thumbnail generation queue.
- EXIF stripping or any other image-content mutation.

## Recommended Strategy — Supabase Storage Image Transformations

Supabase Storage exposes a transformation endpoint that resizes images on read via URL query parameters. The Supabase JS client supports this directly:

```ts
supabase.storage
  .from('recipe-photos')
  .getPublicUrl(storagePath, {
    transform: { width: 400, height: 400, resize: 'cover', quality: 75 },
  })
```

(For private recipes, `createSignedUrl(path, ttl, { transform })` accepts the same options.)

Behaviour:

- Variants are generated and cached at the Supabase edge on first request, then served from cache.
- Source images stay untouched; the variant is purely derived.
- The transform endpoint honors the request's `Accept` header and serves AVIF/WebP automatically when supported by the client.
- Works against every existing object in the bucket — no backfill.
- A "no transform" call (omit the `transform` option) continues to return the deterministic public URL we use today, so the lightbox path doesn't change.

### Rationale vs. alternatives

| Option | Cost | Complexity | Backfill | Recommendation |
|---|---|---|---|---|
| **(A) Server-side resize on upload** (`sharp` + extra bucket object) | Adds a Node dependency (`sharp` doesn't run in Edge runtimes), doubles Storage usage, lengthens upload latency, requires a schema column or naming convention to track the variant, needs a one-time backfill script for existing photos. | High — touches `upload-recipe-photo.ts`, `recipe-photo-uploader.tsx`, service deletion paths, schema. | Yes (backfill required). | Rejected for v1. Revisit only if transform-endpoint pricing or rate limits become an issue. |
| **(B) Supabase Storage transformations** | Free transforms within plan quota; cached at the edge after first hit. | Low — one-file change in `composePhotoUrl` + per-call size choice. | None. | **Selected.** |
| **(C) `next/image` everywhere** | Routes all bucket traffic through the Next.js image optimizer (CPU/cache on our deploy). Solves a lot in one go but is a much wider refactor (`<RecipePhotoThumbnail>`, `<RecipePhotoLightbox>`, `<RecipeCard>`, plus `next.config.ts` `images.remotePatterns` for the Supabase domain). | Medium-high (refactor + infra). | None (existing photos served fine). | Deferred. Logged in [Follow-ups](#follow-ups) as a separate `next/image` migration. |

### Why option (B) wins now

- The chokepoint already exists (`composePhotoUrl`), and the doc that introduced it explicitly called this out as the upgrade path:
  > "The single chokepoint here is also the place to plug in Supabase image transforms (`?width=…&quality=…`) if page weight becomes a concern."
- Zero schema migration, zero data backfill, zero new dependency, zero change to the upload pipeline.
- Existing recipe photos get the speedup the moment we ship.
- Reversible — drop the `transform` option to fall back to current behavior.

## Sizing Policy

A small set of named presets — chosen for the actual rendered dimensions we have today — keeps the policy obvious at every callsite. All presets target `resize: 'cover'` for square tiles and `resize: 'contain'` for the card cover (which uses `aspect-video`).

| Preset | Width × Height | Resize | Quality | Used by |
|---|---|---|---|---|
| `'card'` | 800 × 450 | `cover` | 75 | `RecipeCard` cover (16:9 dashboard / browse / `/recipes` cards) |
| `'thumb'` | 480 × 480 | `cover` | 75 | `RecipePhotoThumbnail` regular tile (recipe-level gallery, detail view) |
| `'thumb-compact'` | 320 × 320 | `cover` | 75 | `RecipePhotoThumbnail` compact tile (step-level gallery) |
| `'full'` *(default)* | — | — | — | `RecipePhotoLightbox` — no transform, original URL |

The numbers are chosen at roughly **2× the largest expected CSS pixel size** so a Retina/2× DPR phone gets a crisp image while still avoiding the multi-megabyte original. A typical 3-column mobile-friendly recipe browse grid shows cards at ~360 CSS-px wide, so an 800 × 450 variant is the 2× target. Cards never render bigger than a max-width container, so 800 is the ceiling.

No multi-size `srcset` for v1 — the gap between the 1× and 2× tier is small enough that the single preset captures most of the win. Revisit if the read view's LCP regresses on very large screens.

### Format

Pass `format: 'origin'` (default) so Supabase negotiates AVIF/WebP based on the browser's `Accept` header without any extra work from us. We do not need an explicit `format: 'webp'` request, because that would force the format regardless of browser support.

## Storage Schema

**No changes.** No new columns on `recipe_photos`, no new bucket folders, no new RLS or storage policies. The existing SELECT/INSERT/UPDATE/DELETE policies on the `recipe-photos` bucket — set up in `00-recipe-schema` — apply equally to the transform endpoint because access is gated by the underlying object, not the variant URL.

## Domain Module — `src/modules/recipes/`

### Files to touch

| Path | Kind | Purpose |
|---|---|---|
| `src/modules/recipes/utils/compose-photo-url.ts` | modify | Accept an optional `variant` parameter and pass `{ transform }` to `getPublicUrl` / `createSignedUrl` |
| `src/modules/recipes/utils/recipe-photo-variant.ts` | new | Single source of truth for the variant presets (`'card' | 'thumb' | 'thumb-compact' | 'full'`) and their `{ width, height, resize, quality }` mappings |
| `src/modules/recipes/services/recipe-service.ts` | modify | `publicUrlFor` becomes `publicUrlFor(storagePath, variant?)` and forwards the variant; `listRecipesForUser` and `listPublicRecipes` pass `'card'` when resolving `coverPhotoUrl`; `getRecipeById`'s `mapPhoto` stays on the default (full) URL because the lightbox needs originals — see "Photo URL on `RecipePhoto`" below |
| `src/modules/recipes/types/recipe-photo.ts` | modify | Add a second optional URL field, `thumbnailUrl: string`, alongside `url` — lets components grab the right one without re-deriving it client-side |
| `src/modules/recipes/components/recipe-photo-thumbnail.tsx` | modify | Use `photo.thumbnailUrl` instead of `photo.url` for the tile `<img src>`; `compact` prop picks `'thumb-compact'` over `'thumb'` (see service note below) |
| `src/modules/recipes/components/recipe-photo-lightbox.tsx` | modify | Continue to use `photo.url` (original) — explicit JSDoc note added so future readers know this is intentional |
| `src/modules/recipes/components/recipe-photo-grid.tsx` | modify | Forwards `compact` through to thumbnails (already does); confirm prop pass-through is intact |
| `src/modules/recipes/components/recipe-card.tsx` | modify | No code change if `coverPhotoUrl` is already pre-sized by the service; otherwise call site uses the `'card'` variant URL |

### Photo URL on `RecipePhoto`

The cleanest split is to hydrate **both** URLs at service-read time, so consumers don't need to know how variants are built:

```ts
type RecipePhoto = {
  /** Full-resolution URL — original object. Use for lightbox / detail view. */
  url: string
  /** Pre-sized URL for grid tiles (~480×480, edge-cached). */
  thumbnailUrl: string
  /** Pre-sized URL for compact step-level tiles (~320×320). */
  thumbnailCompactUrl: string
  // ... existing fields
}
```

Inside `getRecipeById`'s `mapPhoto`, compute all three URLs from the same `storage_path`. The transform endpoint is just a URL composition — no extra round-trip, no async work.

Components then pick:

- `recipe-photo-thumbnail.tsx` → `photo.thumbnailUrl` (or `photo.thumbnailCompactUrl` when `compact`)
- `recipe-photo-lightbox.tsx` → `photo.url`

`coverPhotoUrl` on `RecipeSummary` is the `'card'` variant — derived in `listRecipesForUser` / `listPublicRecipes`.

### Files NOT to touch

- `src/modules/recipes/actions/upload-recipe-photo.ts` — upload path is unchanged; thumbnails are derived on read.
- `src/modules/recipes/components/recipe-photo-uploader.tsx` — no client-side resize.
- Supabase migrations — no schema or policy changes.
- `next.config.ts` `images.remotePatterns` — only relevant if we adopt `next/image`.

## Consumer Audit

`grep` for `<img` in `src/modules/recipes/components/` (verified at plan time):

| Component | Source URL today | Should use |
|---|---|---|
| `recipe-card.tsx` | `summary.coverPhotoUrl` (originals) | `'card'` variant (800×450 cover) |
| `recipe-photo-thumbnail.tsx` | `photo.url` | `'thumb'` (480×480) — `'thumb-compact'` (320×320) when `compact` |
| `recipe-photo-lightbox.tsx` | `photo.url` | Unchanged — full original |

No usage of `next/image` exists in the recipes module. No `<img>` tags exist for recipe images outside `src/modules/recipes/components/` (verified). The `lh3.googleusercontent.com` and `cdn.discordapp.com` entries in `next.config.ts` are for avatars, not recipe photos.

## Backfill

**None required.** Supabase Storage transformations work against any existing object in the bucket — the variant URL is computed from the same `storage_path` value already stored on `recipe_photos`. The first request for each new variant URL incurs a cold-cache transform; subsequent requests are served from the Supabase edge cache.

If the read view loads visibly slower on the day we ship (because every recipe page is generating cold variants for the first time), we can pre-warm the cache for high-traffic public recipes by fetching the variant URLs from a one-off script — but this is a tail-risk mitigation, not a required step.

## Performance Acceptance

### Today (baseline)

- Recipe cards on `/recipes` and the user dashboard download **full original photos** (commonly 1–8 MB JPEGs from modern phones) to render an 800-wide cover. A 12-card grid above the fold can transfer ~20–80 MB.
- Recipe detail pages with a 10-photo gallery and a 5-step recipe with 3 step-photos each: ~25 originals downloaded above the fold.
- LCP on a typical mobile connection is dominated by the cover photo download; recipe detail pages often exceed 4s LCP on simulated Slow 4G.

### Target (post-enhancement)

- A 12-card `/recipes` grid downloads ~12 × ~80–150 KB AVIF/WebP variants — a **>90% reduction** in image bytes above the fold.
- Recipe detail page above-the-fold image bytes drop similarly; LCP target on Slow 4G: **<2.0s** for the cover, **<3.0s** total for the gallery.
- Lightbox open latency is unchanged (still original URL).

### How we'll measure

- Lighthouse mobile run on `/recipes` (browse), one public recipe detail page, and one private owner-only recipe — before vs. after.
- Network panel inspection: confirm a typical card-cover variant request returns `image/avif` (or `image/webp`) and is well under 200 KB.
- Confirm the variant URL is HTTP-cacheable (the response carries a long `Cache-Control` from the Supabase edge).

## Implementation Plan

### Order of operations

1. **Add the variant preset utility.** Create `src/modules/recipes/utils/recipe-photo-variant.ts` exporting:
   - `RecipePhotoVariant` — string union: `'card' | 'thumb' | 'thumb-compact' | 'full'`
   - `RECIPE_PHOTO_VARIANTS` — readonly mapping to `{ width, height, resize, quality } | null` (null for `'full'`)
   - `getRecipePhotoTransform(variant)` — returns the transform options or `undefined`
2. **Update `composePhotoUrl`.** Accept an optional `variant: RecipePhotoVariant` (default `'full'`) and forward `{ transform: getRecipePhotoTransform(variant) }` to `getPublicUrl` / `createSignedUrl`. Update the JSDoc to reference the variant util as the single source of size policy.
3. **Update the service layer.** In `recipe-service.ts`:
   - Change `publicUrlFor` to `publicUrlFor(storagePath, variant?)`, forwarding the transform.
   - In `mapPhoto` inside `getRecipeById`, compute all three URLs (`url`, `thumbnailUrl`, `thumbnailCompactUrl`).
   - In `listRecipesForUser` and `listPublicRecipes`, switch `coverPhotoUrl` to the `'card'` variant.
4. **Extend the `RecipePhoto` type** with `thumbnailUrl: string` and `thumbnailCompactUrl: string`. Update JSDoc.
5. **Wire `RecipePhotoThumbnail`** to use the new URLs based on the `compact` prop.
6. **Document the lightbox decision.** Add a JSDoc note on `RecipePhotoLightbox` clarifying it intentionally uses the original `photo.url`.
7. **Sanity-check `RecipeCard`** — it already reads `summary.coverPhotoUrl`, so step 3 is enough; verify visually that the cover image renders the variant URL.
8. **Manual QA pass.** See checklist below.
9. **Verify build / lint.** `npm run build` + `npm run lint`.

### Risks & Considerations

- **Supabase plan quotas.** Image transformations are billed/throttled per plan tier. Check the project's current plan documentation in the Supabase dashboard before shipping. If we are on the Free plan, transforms may have a monthly cap — confirm the cap is comfortably above expected traffic, or upgrade.
- **Edge cache warm-up cost.** First request for each variant URL is a cold transform. Public recipes with many existing photos may have a noticeable one-time cost. Acceptable risk for v1; can pre-warm later if needed.
- **Transform URL stability.** Supabase composes variant URLs deterministically from the request, so caching headers / CDN keys remain stable across page loads. No signed-URL caching concerns for public recipes; private recipes still mint short-TTL signed URLs (TTL applies to access, not transform behavior).
- **Aspect ratio choices.** `RecipeCard` uses `aspect-video` (16:9) for the cover. Setting the variant to 800×450 with `resize: 'cover'` crops the source to 16:9 — matches the existing CSS rendering exactly. `RecipePhotoThumbnail` uses `aspect-square`, so 480×480 / 320×320 `cover` matches there too. No visual regression expected; QA must confirm.
- **Cover photos that were uploaded as portrait orientation.** With `resize: 'cover'`, a tall portrait gets center-cropped to 16:9 for cards. This is the current behavior too (CSS `object-cover` does the same crop), so no change in user-visible cropping.
- **`storage_path` is a URL-safe string** (UUID + extension under `{userId}/{recipeId}/`), so no encoding issues passing it through the transform endpoint. Verify the `recipe-photos/{user_id}/{recipe_id}/{uuid}.{ext}` convention by spot-check.
- **`next/image` migration is still a worthwhile follow-up** — it gives us browser-native lazy-loading priorities, deterministic `srcset`, and central blur placeholders — but it is independent of this work and not a blocker.
- **Lightbox falls back to original.** If a user opens the lightbox on a recipe with very large photos (>10 MB), the lightbox load will still be slow — that's the explicit trade. Showing a transition state (existing thumbnail blurred behind the loading original) is a UX polish item, **out of scope** here.

## Manual QA Checklist

- Visit `/recipes` (public browse) — confirm cards render covers that are visually identical to today but the network panel shows `image/avif` or `image/webp` responses well under 200 KB.
- Open a public recipe with several recipe-level photos — gallery tiles render the `'thumb'` variant; clicking opens the lightbox at the original URL.
- Open a public recipe with step-level photos — step tiles render the `'thumb-compact'` variant.
- Open a private recipe as the owner — same behavior, URLs use `createSignedUrl` with transforms.
- Open a private recipe while signed out — gallery requests still 403 (storage policy unaffected by the transform endpoint).
- Verify the user dashboard recipe cards render the `'card'` variant.
- Lightbox photo opens at full resolution (same source bytes as before).
- `npm run build` + `npm run lint` pass.

## Follow-ups (Out of Scope)

- **`next/image` migration** for the recipes module — covers responsive `srcset`, native lazy-loading priorities, and a place to plug in blur placeholders. Treat as a new doc once this enhancement is verified in production.
- **Blur / `LQIP` placeholders** during gallery load (most easily added during the `next/image` migration).
- **Pre-warming variant cache** for high-traffic recipes if cold-cache transform latency turns out to matter at launch.
- **Module-wide `<img>` audit** beyond recipes — palette / paint card images are out of scope here but would benefit from the same pattern (a generic `composeStorageUrl` chokepoint).
- **Re-evaluating Option A** (server-side resize on upload with `sharp`) only if Supabase transform quotas become a binding cost ceiling.
