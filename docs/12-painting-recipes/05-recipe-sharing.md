# Recipe Sharing — Public Pages, Browse, Discovery

**Epic:** Painting Recipes
**Type:** Feature
**Status:** Todo
**Branch:** `feature/recipe-sharing`
**Merge into:** `v1/main`

## Summary

Make public recipes discoverable. Build the public-facing browse page at `/recipes/browse` (or similar), expose the recipe URL as a canonical share link, render share-friendly metadata (OpenGraph + Twitter card) for unfurled previews, and surface basic filtering (by tag, by paint, by author). Wire recipes into the in-app community feed surface set up in `07-community-social`.

By the end of this feature: a public recipe is reachable to anonymous users at `/recipes/{id}`, has a clean share URL, looks correct in Slack/Discord/iMessage previews, and is discoverable via a paginated browse page.

## Acceptance Criteria

- [ ] `/recipes/browse` lists all `is_public` recipes paginated
- [ ] Browse cards show title, author, cover photo, paint count or section count, updated date
- [ ] Search input filters by title (server-side `ilike`)
- [ ] Optional filter chips: by paint (id), by author (username), by section/step count buckets — at minimum implement "filter by paint id"
- [ ] Sort options: newest, recently updated, most paints (basic; popularity comes later when likes/views ship)
- [ ] `/recipes/[id]` exposes OpenGraph + Twitter meta tags (title, description, cover image)
- [ ] The recipe detail page has a "Copy share link" button
- [ ] When the recipe is private, the URL 404s for non-owners (no leaking of existence)
- [ ] When the user makes a recipe public, the builder shows a small "Share" panel with the URL + copy button
- [ ] Recipes the user owns appear on their public profile (when `07-community-social/03-user-profiles.md` ships) — this feature ships only the data hook the profile needs
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route                  | Description                                  | Auth        |
| ---------------------- | -------------------------------------------- | ----------- |
| `/recipes/browse`      | Paginated public recipe browse + search/filter | none      |
| `/recipes/[id]`        | (modify) — adds OG tags + share UI            | conditional |
| `/users/[handle]`      | (touched) — exposes the data shape only      | n/a here    |

## Module additions

```
src/modules/recipes/
├── components/
│   ├── recipe-browse-page.tsx          NEW — server component for the browse page
│   ├── recipe-browse-filters.tsx       NEW — search + filter chips + sort
│   ├── recipe-browse-grid.tsx          NEW — paginated card grid
│   ├── recipe-share-panel.tsx          NEW — share URL + copy button (builder)
│   └── recipe-share-button.tsx         NEW — same affordance, smaller, on the read view
└── services/
    └── (modify) recipe-service.ts      add filtered/sorted listPublicRecipes signature
```

## Key Files

| Action | File                                                              | Description                                                                |
| ------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Create | `src/app/recipes/browse/page.tsx`                                 | Server component — reads search/filter/sort, delegates to `RecipeBrowsePage` |
| Create | `src/modules/recipes/components/recipe-browse-page.tsx`           | Layout + filters + grid                                                    |
| Create | `src/modules/recipes/components/recipe-browse-filters.tsx`        | Search input + filter chips + sort selector (uses URL search params)       |
| Create | `src/modules/recipes/components/recipe-browse-grid.tsx`           | Reuses `RecipeCard` with paginated data                                    |
| Create | `src/modules/recipes/components/recipe-share-panel.tsx`           | Builder share block (only when `is_public`)                                |
| Create | `src/modules/recipes/components/recipe-share-button.tsx`          | Detail-view share button                                                   |
| Modify | `src/app/recipes/[id]/page.tsx`                                   | Adds `generateMetadata` for OG/Twitter tags                                |
| Modify | `src/modules/recipes/components/recipe-detail.tsx`                | Renders share button                                                       |
| Modify | `src/modules/recipes/components/recipe-builder.tsx`               | Renders `<RecipeSharePanel>` when `is_public`                              |
| Modify | `src/modules/recipes/services/recipe-service.ts`                  | `listPublicRecipes(client, { q?, paintId?, sort?, page? })`                |

## Implementation

### 1. Browse page

`/recipes/browse/page.tsx` is a server component that:

1. Reads `q`, `paintId`, `sort`, `page` from `searchParams`
2. Calls `listPublicRecipes` with the parsed filter/sort/pagination
3. Renders `<RecipeBrowsePage>` — header, filters, grid

`RecipeBrowseFilters` is a client component that updates the URL via `router.replace` with new search params; the page re-renders server-side. No client-side data fetching for the grid — Next App Router handles re-rendering on search params change.

Search behavior: `title ilike '%' || $q || '%'`. For paint filter: join `recipes` → `recipe_sections` → `recipe_steps` → `recipe_step_paints` and filter where `paint_id = $paintId`. For sort: `newest` → `created_at desc`, `recently_updated` → `updated_at desc`, `most_paints` → `count(recipe_step_paints) desc` (computed via a join + group by, or via a precomputed counter column if performance demands it; v1 uses the join).

Pagination: 24 cards per page; "Load more" or numbered pagination — pick numbered (URL-stable, easier to share specific pages).

### 2. OG / Twitter tags

`/recipes/[id]/page.tsx` exports `generateMetadata` (Next.js):

```ts
export async function generateMetadata({ params }) {
  const recipe = await getRecipeById(serverClient, params.id)
  if (!recipe || !recipe.isPublic) return { title: 'Grimify' }
  const cover = recipe.coverPhotoUrl ?? recipe.photos[0]?.url
  return {
    title: `${recipe.title} — Grimify`,
    description: recipe.summary?.slice(0, 200),
    openGraph: {
      title: recipe.title,
      description: recipe.summary?.slice(0, 200),
      images: cover ? [cover] : undefined,
      type: 'article',
      authors: [recipe.author?.handle].filter(Boolean),
    },
    twitter: {
      card: cover ? 'summary_large_image' : 'summary',
      title: recipe.title,
      description: recipe.summary?.slice(0, 200),
      images: cover ? [cover] : undefined,
    },
  }
}
```

If the recipe is private, return generic metadata so URL probing doesn't leak the title.

### 3. Share UI

`RecipeSharePanel` (builder, shown only when `is_public`):

- Heading "Share"
- Read-only URL field (`https://grimify.app/recipes/{id}`)
- "Copy link" button (uses `navigator.clipboard.writeText`); confirms with a toast
- Optional: "Copy as markdown" button that produces `[Recipe title](https://grimify.app/recipes/{id})` for forum posts

`RecipeShareButton` (read view, shown on owned + public recipes):

- Single icon button that opens a small popover with the same URL + copy

### 4. Service layer changes

`listPublicRecipes(client, opts)`:

```ts
type ListOpts = {
  q?: string
  paintId?: string
  sort?: 'newest' | 'recently_updated' | 'most_paints'
  page?: number  // 1-indexed
  pageSize?: number  // default 24
}
```

Returns `{ recipes: RecipeSummary[]; total: number }`. The query joins as needed for filters; results are sorted and paginated server-side.

The `RecipeSummary` shape adds `paintCount` and `author: { id, handle, displayName }` for the browse cards.

### 5. Community feed hook

The feed page in `07-community-social/02-community-feed.md` will mix recipes and palettes. This feature exposes a `listRecentPublicRecipes(client, limit)` helper (a thin wrapper around `listPublicRecipes` with sort=recently_updated, page=1) that the feed can consume without re-deriving anything. Don't build the feed itself here — just the data hook.

### 6. Manual QA checklist

- Make a recipe public, hit `/recipes/browse` — recipe shows
- Search "blood raven" — filters; URL updates with `?q=blood+raven`
- Filter by a specific paint — only recipes using that paint render
- Toggle sort options — order updates; URL reflects sort
- Paginate — page=2 loads the next 24
- Copy link from builder share panel — clipboard contains `https://grimify.app/recipes/{id}`
- Paste recipe URL into Slack/Discord — preview shows title, summary, cover image
- Make a recipe private — vanishes from `/recipes/browse`; URL 404s for anon
- Hit the URL of a private recipe as anon — generic 404, no leaked title
- `npm run build` + `npm run lint`

## Risks & Considerations

- **OG image absolute URLs**: `composePhotoUrl` must return an absolute URL (with `https://` and the production host) for OG tags to work. In dev/preview, use the deployed URL or skip OG. The `getPublicUrl` from Supabase already returns absolute URLs — good.
- **Search performance**: `ilike '%q%'` doesn't use B-tree indexes. For the v1 dataset this is fine (small recipe count). If results slow down, add a `pg_trgm` index on `title`.
- **`most_paints` sort cost**: Joining and grouping for sort is fine at v1 scale. If it becomes hot, add a denormalized `paint_count` column on `recipes` updated by triggers when step paints change.
- **Privacy on metadata**: `generateMetadata` runs server-side and reads from the DB; ensure private recipes return generic metadata (already covered) and that the function doesn't throw on missing recipes (404s should be clean).
- **Bot crawlers**: `is_public = true` recipes should be indexable. Once `00-marketing-and-branding/01-metadata-and-opengraph.md` ships, the global metadata setup will pick this up. No special robots.txt rules needed beyond what already exists.
- **Author profile dependency**: This feature reads `author: { handle, displayName }` from `profiles`. The community-social user profiles feature is the right home for the public profile page (`/users/[handle]`); when that ships, the browse cards link there. Until then, the cards just display the author's name without a link.
- **Like / view counts (deferred)**: A "popular this week" surface is a natural follow-up but needs likes or views first. Out of scope; note in PR description.

## Notes

- This feature is the recipe epic's bridge into the community surfaces in Epic 7. Once both ship, recipes integrate with the community feed and user profile pages without further work in this epic.
- Palette sharing (the parallel feature in Epic 11) follows the same pattern — if both epics ship, consider extracting a shared `share-panel` and `browse-filters` component in a follow-up. Don't pre-extract here.

## Implementation Plan

### Overview

Depends on 00–04 shipping first. This feature exposes public recipes to discovery: a paginated browse page at `/recipes/browse`, OG/Twitter metadata on the recipe detail page (with a dynamic OG image route), and a "Copy share link" affordance on both the builder and the read view. Browse-page filtering and sorting are URL-driven (search params), matching the Next.js App Router pattern already used by `/palettes` (numbered pagination via `?page=`). The detail page already exists from 01; this doc adds `generateMetadata` exporting OG + Twitter tags. The OG image uses the existing `buildOgUrl('recipe', id)` helper pattern from `@/modules/seo/utils/build-og-url.ts`, which requires adding `'recipe'` to the `OgEntity` union plus a new `/api/og/recipe/[id]/route.ts` endpoint.

### Module changes

| Path | Kind | Purpose |
|------|------|---------|
| `src/modules/recipes/services/recipe-service.ts` | modify | Replace simple `listPublicRecipes({ limit, offset })` with filtered/sorted version; add `countPublicRecipes(opts)` to honor filters; add `listRecentPublicRecipes(limit)` thin wrapper for the community feed in Epic 7 |
| `src/modules/recipes/types/recipe-summary.ts` | modify | Add `paintCount: number` and `author: { id, handle, displayName } \| null` |
| `src/modules/recipes/components/recipe-browse-page.tsx` | new | Layout: header + `<RecipeBrowseFilters>` + `<RecipeBrowseGrid>` + pagination |
| `src/modules/recipes/components/recipe-browse-filters.tsx` | new | Client component: search input + sort selector + filter chips; updates `router.replace` with new search params |
| `src/modules/recipes/components/recipe-browse-grid.tsx` | new | Renders `RecipeCard` from 01 with paginated data |
| `src/modules/recipes/components/recipe-share-panel.tsx` | new | Builder-only; visible when `is_public`; URL field + "Copy link" + "Copy as markdown" buttons |
| `src/modules/recipes/components/recipe-share-button.tsx` | new | Read-view icon button; popover with the same URL + copy |
| `src/modules/recipes/components/recipe-detail.tsx` | modify | Renders `<RecipeShareButton>` (when public) |
| `src/modules/recipes/components/recipe-builder.tsx` | modify | Renders `<RecipeSharePanel>` when `recipe.isPublic` |
| `src/modules/seo/utils/build-og-url.ts` | modify | Extend `OgEntity` union with `'recipe'` |

### Database changes

None for v1 — search uses `ilike` on `title`, paint filter uses a join through `recipe_step_paints`, and `most_paints` sort uses a count + group-by. If performance lags in QA, add a denormalized `paint_count` integer column on `recipes` (updated by trigger on `recipe_step_paints` insert/delete) — that's a follow-up migration, not a 05 deliverable. Same story for `pg_trgm` index on `title`.

### Route / page changes

| Path | Kind | Purpose |
|------|------|---------|
| `src/app/recipes/browse/page.tsx` | new | Server component: reads `q`, `paintId`, `sort`, `page` from `searchParams`; calls `listPublicRecipes`; renders `<RecipeBrowsePage>`. Applies `pageMetadata({ title: 'Browse recipes', path: '/recipes/browse' })`. |
| `src/app/recipes/[id]/page.tsx` | modify | Add `generateMetadata` exporting OG + Twitter tags; private/missing recipes return generic noindex metadata so the title isn't leaked |
| `src/app/api/og/recipe/[id]/route.ts` | new | Dynamic OG image endpoint — uses `next/og` `ImageResponse`; reads recipe via the server service; returns a 1200x630 image with title + cover photo + paint swatches. Mirrors the existing `/api/og/palette/[id]` pattern. |
| `src/app/recipes/page.tsx` | new (or redirect) | Coexists with `/recipes/browse`. Recommend: redirect `/recipes` → `/recipes/browse` for discoverability, since 01's per-doc plan reuses `/recipes` for the detail-only namespace. |

### Step-by-step ordering

1. Extend `RecipeSummary` with `paintCount` and `author`.
2. Modify `recipe-service.ts.listPublicRecipes` to accept `{ q?, paintId?, sort?, page?, pageSize? }` and return `{ recipes, total }`. Implement:
   - Base query: `recipes(*, profiles(handle, display_name), recipe_sections(recipe_steps(recipe_step_paints(paint_id))))` with `is_public=true`.
   - `q`: `.ilike('title', '%' + q + '%')`.
   - `paintId`: nested filter via `recipe_sections.recipe_steps.recipe_step_paints.paint_id`.
   - `sort`: `'newest' → created_at desc`, `'recently_updated' → updated_at desc`, `'most_paints' → joined count desc` (compute in JS post-fetch for v1 if PostgREST joins are awkward; revisit with a DB view if needed).
   - Pagination: `.range(offset, offset + limit - 1)` and a separate `count: 'exact', head: true` query for `total`.
3. Add `listRecentPublicRecipes(limit)` thin wrapper for Epic 7's feed.
4. Add `'recipe'` to `OgEntity` in `build-og-url.ts`.
5. Build `/api/og/recipe/[id]/route.ts` based on the existing `/api/og/palette/[id]` pattern. Output: 1200x630 image with title, optional cover, swatch strip from up to 8 step paints.
6. Modify `/recipes/[id]/page.tsx` to export `generateMetadata` — mirror the existing palette `generateMetadata` block. For private/missing: return `pageMetadata({ title: 'Recipe not found', noindex: true })`.
7. Build `<RecipeBrowseFilters>` (client) — text input (debounced), sort `<select>`, "filter by paint" chip popover (uses `use-paint-search`). Each change calls `router.replace('/recipes/browse?…')`.
8. Build `<RecipeBrowseGrid>` and `<RecipeBrowsePage>` (server). 24 cards per page; numbered pagination (Prev / Page X / Next).
9. Build `/recipes/browse/page.tsx` and (optionally) `/recipes/page.tsx` redirect.
10. Build `<RecipeSharePanel>` and `<RecipeShareButton>`. Use `navigator.clipboard.writeText` (client component) and toast on success. The "Copy as markdown" button copies `[Title](https://grimify.app/recipes/{id})`.
11. Modify `<RecipeBuilder>` and `<RecipeDetail>` to mount the share UI.
12. Manual QA per checklist; `npm run build` + `npm run lint`.

### Risks & considerations

- **OG image absolute URLs**: `metadataBase` in the root layout already promotes relative URLs to absolute when Next.js renders the meta tags. Use `buildOgUrl('recipe', id)` and trust the promotion. Verified pattern in `/palettes/[id]/page.tsx`.
- **Privacy in metadata**: `generateMetadata` must return generic metadata for private or missing recipes — never leak the title via `<title>` to URL-probing bots.
- **Search performance**: `ilike '%q%'` doesn't use B-tree indexes. Fine for v1 dataset; if results slow, add a `pg_trgm` GIN index on `title`.
- **`most_paints` sort cost**: nested join + count is fine at v1 scale. Add a denormalized `paint_count` column with triggers if hot.
- **Author profile dependency**: `author.handle` comes from `profiles.handle`. If the handle column doesn't exist yet (Epic 7 may add it), fall back to `display_name` and skip the link.
- **Numbered pagination**: URL-stable, easier to share. Skip "Load more" infinite scroll for v1.
- **Filter chip UX**: paint-id filter requires showing the resolved paint name (not the UUID) in the chip. Resolve via a side `getPaintById` lookup at page render time.
- **Bot indexing**: `is_public = true` recipes should be indexable — `noindex` only when private. The global metadata setup in `00-marketing-and-branding/01-metadata-and-opengraph` covers robots.txt; no extra rules needed.
- **Deferred**: like / view counts and "popular this week" sort are out of scope; revisit when a likes table ships.
- **Coexistence with 01's `/recipes` namespace**: 01 may use `/recipes/[id]` for detail. Make sure `/recipes/browse/page.tsx` is created before any catch-all route is added that would shadow it.

### Out of scope

- "Popular this week" / like-based sorting (needs likes; deferred until Epic 7).
- View counts / analytics tracking.
- Tag-based filtering (needs a tags schema; future).
- Author profile page (`/users/[handle]`) — Epic 7 owns it; this doc only exposes the data shape.
- Embeddable recipe cards / oEmbed.
- Atom/RSS feeds for new public recipes.
