# Recipe Browse Page — Public Paginated Listing

**Epic:** Painting Recipes
**Type:** Feature
**Status:** Done
**Branch:** `feature/recipe-browse-page`
**Merge into:** `main`

## Summary

Public landing page at `/recipes/browse` that lists all `is_public` recipes, sorted by creation date (newest first) by default, with numbered URL-driven pagination. No authentication required. Reuses existing `RecipeCardGrid` and `PaginationControls` — the only new infrastructure is a thin client navigation wrapper and the route page itself.

## Acceptance Criteria

- [x] `/recipes/browse` renders all public recipes without authentication
- [x] Cards are sorted by `created_at DESC` (newest first) by default
- [x] Page is paginated with 24 cards per page (configurable via `?size=`)
- [x] Active page is driven by `?page=` URL param; navigating to page 2 produces `/recipes/browse?page=2`
- [x] Pagination controls show Prev / page numbers / Next and a per-page selector
- [x] Changing page or page size updates the URL and re-fetches server-side
- [x] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route             | Description                        | Auth |
| ----------------- | ---------------------------------- | ---- |
| `/recipes/browse` | Paginated public recipe listing    | none |

## Module additions

```
src/modules/recipes/
├── components/
│   ├── recipe-browse-page.tsx       NEW — server component: header + grid + pagination
│   └── recipe-browse-pagination.tsx NEW — client component: wraps PaginationControls, navigates via URL
└── services/
    └── (modify) recipe-service.ts   change listPublicRecipes default order to created_at DESC
```

## Key Files

| Action | File | Description |
|--------|------|-------------|
| Create | `src/app/recipes/browse/page.tsx` | Server component: reads `page`/`size` from `searchParams`, calls service, renders `RecipeBrowsePage` |
| Create | `src/modules/recipes/components/recipe-browse-page.tsx` | Layout: `PageHeader` + `RecipeCardGrid` + `RecipeBrowsePagination` |
| Create | `src/modules/recipes/components/recipe-browse-pagination.tsx` | Client wrapper around `PaginationControls`; calls `router.replace` with updated params on change |
| Modify | `src/modules/recipes/services/recipe-service.ts` | Change `listPublicRecipes` default order from `updated_at DESC` to `created_at DESC` |

## Implementation Plan

### 1. Update `listPublicRecipes` default sort

In `recipe-service.ts`, change the `.order()` call in `listPublicRecipes` from:

```ts
.order('updated_at', { ascending: false })
```

to:

```ts
.order('created_at', { ascending: false })
```

No schema changes needed — `created_at` is already on the `recipes` table; PostgREST can ORDER by columns not in the SELECT list.

### 2. Create `RecipeBrowsePagination` (client component)

`src/modules/recipes/components/recipe-browse-pagination.tsx`

Thin client component that receives `currentPage`, `totalPages`, `pageSize`, `totalCount`, and `basePath` as props, then delegates to the existing `PaginationControls` UI. On `onPageChange` or `onSizeChange`, calls `router.replace` with the updated `?page=` and `?size=` params. Mirrors the navigation-only half of `PaginatedPaintGrid` without any client-side data fetching — all data loading stays server-side.

```ts
'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { PaginationControls } from '@/modules/paints/components/pagination-controls'

const PAGE_SIZE_OPTIONS = [12, 24, 48] as const

export function RecipeBrowsePagination({ currentPage, totalPages, pageSize, totalCount, basePath }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const navigate = (page: number, size: number) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    startTransition(() => router.replace(`${basePath}?${params}`))
  }

  return (
    <PaginationControls
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={pageSize}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      totalCount={totalCount}
      isPending={isPending}
      onPageChange={(page) => navigate(page, pageSize)}
      onSizeChange={(size) => navigate(1, size)}
    />
  )
}
```

### 3. Create `RecipeBrowsePage` (server component)

`src/modules/recipes/components/recipe-browse-page.tsx`

Server component that renders the full page layout. Receives pre-fetched `summaries`, `totalCount`, `currentPage`, and `pageSize` as props.

```tsx
import { Main } from '@/components/main'
import { PageHeader, PageTitle, PageSubtitle } from '@/components/page-header'
import { RecipeCardGrid } from '@/modules/recipes/components/recipe-card-grid'
import { RecipeBrowsePagination } from '@/modules/recipes/components/recipe-browse-pagination'
import type { RecipeSummary } from '@/modules/recipes/types/recipe-summary'

export function RecipeBrowsePage({ summaries, totalCount, currentPage, pageSize }) {
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <Main>
      <PageHeader>
        <PageTitle>Recipes</PageTitle>
        <PageSubtitle>Browse {totalCount.toLocaleString()} public recipes.</PageSubtitle>
      </PageHeader>

      {summaries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No public recipes yet.</p>
      ) : (
        <div className="flex flex-col gap-8">
          <RecipeCardGrid summaries={summaries} />
          <RecipeBrowsePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalCount={totalCount}
            basePath="/recipes/browse"
          />
        </div>
      )}
    </Main>
  )
}
```

### 4. Create `src/app/recipes/browse/page.tsx`

Thin server component. Reads `page` and `size` from `searchParams`, validates them, computes `offset`, fetches data in parallel, and renders `RecipeBrowsePage`.

```tsx
import { createRecipeServiceServer } from '@/modules/recipes/services/recipe-service.server'
import { RecipeBrowsePage } from '@/modules/recipes/components/recipe-browse-page'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Browse Recipes',
  description: 'Discover step-by-step painting recipes from the Grimify community.',
  path: '/recipes/browse',
})

const VALID_SIZES = [12, 24, 48]
const DEFAULT_SIZE = 24

export default async function RecipesBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>
}) {
  const { page, size } = await searchParams
  const pageSize = VALID_SIZES.includes(Number(size)) ? Number(size) : DEFAULT_SIZE
  const currentPage = Math.max(1, parseInt(page ?? '1', 10) || 1)
  const offset = (currentPage - 1) * pageSize

  const service = await createRecipeServiceServer()
  const [summaries, totalCount] = await Promise.all([
    service.listPublicRecipes({ limit: pageSize, offset }),
    service.countPublicRecipes(),
  ])

  // Clamp page to valid range after we know totalCount
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(currentPage, totalPages)

  return (
    <RecipeBrowsePage
      summaries={summaries}
      totalCount={totalCount}
      currentPage={safePage}
      pageSize={pageSize}
    />
  )
}
```

### Step-by-step order

1. Update `listPublicRecipes` in `recipe-service.ts` — change sort to `created_at DESC`.
2. Create `recipe-browse-pagination.tsx` client component.
3. Create `recipe-browse-page.tsx` server component.
4. Create `src/app/recipes/browse/page.tsx` route.
5. Run `npm run build` and `npm run lint`; fix any errors.
6. Manual QA: visit `/recipes/browse` as anon, check ordering, paginate, change page size.

## Affected Files

| File | Changes |
|------|---------|
| `src/modules/recipes/services/recipe-service.ts` | Change `listPublicRecipes` sort from `updated_at` to `created_at` |
| `src/modules/recipes/components/recipe-browse-page.tsx` | New server component: layout with grid + pagination |
| `src/modules/recipes/components/recipe-browse-pagination.tsx` | New client component: URL-driven pagination nav |
| `src/app/recipes/browse/page.tsx` | New route: reads searchParams, fetches data, renders page |

## Risks & Considerations

- `PaginationControls` lives in `src/modules/paints/components/` — this is a cross-module import. It's acceptable since no recipe-internal logic is involved, but if it starts feeling awkward, move it to `src/components/` in a follow-up.
- `listPublicRecipes` currently sorts by `updated_at` — changing this is a **breaking change** for any other caller. The only callers are: the user's own recipe list (`listRecipesForUser`, unaffected) and the user-facing browse page (doesn't exist yet). Safe to change.
- Page-size options `[12, 24, 48]` are multiples of 3 (the grid column count at large breakpoints), so pages end cleanly without a ragged last row.
- If `?page=` exceeds `totalPages` after a size change, clamp to `totalPages` server-side (handled in the route above).
- Future search/filter extensions (from `05-recipe-sharing.md`) slot in by adding `q` and `sort` params to the route and extending `listPublicRecipes` — no structural change to the components built here.
