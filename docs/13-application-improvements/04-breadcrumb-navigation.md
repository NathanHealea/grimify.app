# Domain Breadcrumb Navigation

**Epic:** Application Improvements
**Type:** Feature
**Status:** Todo
**Branch:** `feature/breadcrumb-navigation`
**Merge into:** `main`

## Summary

Add consistent breadcrumb trails to every community domain that has a detail page and/or an edit page. The breadcrumb component (`src/components/breadcrumbs.tsx`) already exists and is used on Paints, Brands, and Hues detail pages — this feature extends that pattern to Palettes and Recipes (the two domains that also have authenticated edit pages), and replaces the ad-hoc `← Back` arrow links currently used on edit pages.

**Trail pattern per domain:**

| Page | Breadcrumb trail |
|------|-----------------|
| Community list | *(none — it is the root)* |
| Detail | `[Domain] → [Item Name]` |
| Edit (auth only) | `[Domain] → [Item Name] → Edit` |

## Acceptance Criteria

- [ ] Palettes detail page (`/palettes/[id]`) shows `Palettes → [palette name]`
- [ ] Palettes edit page (`/user/palettes/[id]/edit`) shows `Palettes → [palette name] → Edit`; the existing `← Back to palette` arrow link is removed
- [ ] Recipes detail page (`/recipes/[id]`) shows `Recipes → [recipe title]`
- [ ] Recipes edit page (`/user/recipes/[id]/edit`) shows `Recipes → [recipe title] → Edit`; the existing `← Back to recipe` arrow link is removed
- [ ] Paints detail page (`/paints/[id]`) already correct — no change needed
- [ ] Brands detail page (`/brands/[id]`) already correct — no change needed
- [ ] Hues detail page (`/hues/[id]`) already correct — no change needed
- [ ] All breadcrumb links are functional (clicking `Palettes` navigates to `/palettes`, etc.)
- [ ] The `Edit` segment on edit pages is unlinked plain text (current page convention)
- [ ] No `ArrowLeft` / `Link` back-link remnants on edit pages

## Implementation Plan

The `Breadcrumbs` component is already production-ready. All four affected pages already fetch the data needed for the label text (palette name, recipe title), so no new data fetching is required — it is purely a UI wiring task.

### Step 1 — Palettes detail page

File: `src/app/palettes/[id]/page.tsx`

- Import `Breadcrumbs` from `@/components/breadcrumbs`
- Add `<Breadcrumbs>` as the first child inside `<Main>`, before `<PaletteViewTracker>`:

```tsx
<Breadcrumbs items={[{ label: 'Palettes', href: '/palettes' }, { label: palette.name }]} />
```

### Step 2 — Palettes edit page

File: `src/app/user/palettes/[id]/edit/page.tsx`

- Remove the `<Link>` ArrowLeft back-link block and the `ArrowLeft` import from `lucide-react`
- Import `Breadcrumbs` from `@/components/breadcrumbs`
- Add `<Breadcrumbs>` as the first child inside `<Main>`, before `<PageHeader>`:

```tsx
<Breadcrumbs
  items={[
    { label: 'Palettes', href: '/palettes' },
    { label: palette.name, href: `/palettes/${id}` },
    { label: 'Edit' },
  ]}
/>
```

### Step 3 — Recipes detail page

File: `src/app/recipes/[id]/page.tsx`

- Import `Breadcrumbs` from `@/components/breadcrumbs`
- Add `<Breadcrumbs>` as the first child inside `<Main>`, before `<RecipeDetail>`:

```tsx
<Breadcrumbs items={[{ label: 'Recipes', href: '/recipes' }, { label: recipe.title }]} />
```

### Step 4 — Recipes edit page

File: `src/app/user/recipes/[id]/edit/page.tsx`

- Remove the `<Link>` ArrowLeft back-link block and the `ArrowLeft` import from `lucide-react`
- Import `Breadcrumbs` from `@/components/breadcrumbs`
- Add `<Breadcrumbs>` as the first child inside `<Main>`, before `<PageTitle>`:

```tsx
<Breadcrumbs
  items={[
    { label: 'Recipes', href: '/recipes' },
    { label: recipe.title, href: `/recipes/${id}` },
    { label: 'Edit' },
  ]}
/>
```

### Affected Files

| File | Changes |
|------|---------|
| `src/app/palettes/[id]/page.tsx` | Add `Breadcrumbs` import; add breadcrumb trail inside `<Main>` |
| `src/app/user/palettes/[id]/edit/page.tsx` | Remove ArrowLeft back-link; add `Breadcrumbs` with 3-item trail |
| `src/app/recipes/[id]/page.tsx` | Add `Breadcrumbs` import; add breadcrumb trail inside `<Main>` |
| `src/app/user/recipes/[id]/edit/page.tsx` | Remove ArrowLeft back-link; add `Breadcrumbs` with 3-item trail |

### Risks & Considerations

- The `Link` import on the edit pages comes from `next/link` and is only used for the ArrowLeft back-link — removing the back-link likely means the `Link` import can be removed entirely. Verify there are no other usages in each file before removing.
- The `ArrowLeft` import from `lucide-react` can be removed from both edit pages when the back-link is removed.
- No auth check is needed inside the pages themselves for the Edit label — the edit pages are already auth-gated (`if (!user) redirect(...)`) so the `Edit` crumb only ever renders for authenticated owners.
