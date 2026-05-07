# Public Palettes Catalog & User Routes Move

**Epic:** Color Palettes
**Type:** Enhancement
**Status:** Completed
**Branch:** `v1/enhancement/public-palettes-page`
**Merge into:** `v1/main`

## Summary

Split today's owner-only `/palettes` route into two surfaces, mirroring the public schemes split (`docs/05-color-scheme-explorer/03-public-schema-page.md`):

- **`/palettes`** becomes a **public catalog** of community-shared palettes — anyone (signed-out included) can browse palettes other users have published.
- **`/user/palettes`** becomes the home for the authenticated user's "My palettes" dashboard, plus the new-palette POST handler.

The detail route `/palettes/[id]` stays in place — it already reads RLS-gated palettes correctly and shows owner controls when the viewer is the owner. The only owner-only detail route — `/palettes/[id]/edit` — moves to `/user/palettes/[id]/edit`.

The data layer requires **no migration** — `palettes` already has `is_public boolean DEFAULT false`, the matching RLS policies, and `listPublicPalettes` / `listPalettesForUser` already exist in `palette-service.ts`. This enhancement is route-shuffling + a new public catalog page + light UI additions.

## Acceptance Criteria

- [x] `/palettes` renders a paginated list of public palettes (anyone, including signed-out)
- [x] `/palettes/[id]` continues to serve both signed-out (when `is_public = true`) and the owner (always)
- [x] `/user/palettes` renders today's owner-only "My palettes" dashboard (moved from `/palettes`)
- [x] `/user/palettes/new` accepts the POST that creates a draft palette and redirects to `/user/palettes/[id]/edit`
- [x] `/user/palettes/[id]/edit` renders the existing palette edit UI (moved from `/palettes/[id]/edit`)
- [x] Old POST to `/palettes/new` keeps working — handler is moved or forwards to `/user/palettes/new` so external `<form>` posts and bookmarks don't break
- [x] Anyone visiting old `/palettes/[id]/edit` is forwarded to `/user/palettes/[id]/edit` (owner) or to the read-only detail page (non-owner)
- [x] Navbar: `/palettes` link is shown to all visitors; a separate `/user/palettes` link is shown to signed-in users (label disambiguates them — see step 11)
- [x] Public palette catalog cards show the owner's display name; "My palettes" cards do not
- [x] Sitemap includes `/palettes` (already present) and dynamically emits public palette detail URLs
- [x] All `revalidatePath` calls inside `src/modules/palettes/actions/` are updated for the new route shape (revalidate both the public catalog and the owner dashboard when relevant)
- [x] All in-tree links/forms that point at `/palettes/new` and `/palettes/[id]/edit` are repointed at the `/user/palettes/...` equivalents
- [x] Page metadata uses `pageMetadata` from the `seo` module on every new/changed route
- [x] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route                          | Auth     | Description                                                                            |
| ------------------------------ | -------- | -------------------------------------------------------------------------------------- |
| `/palettes`                    | Public   | Public catalog of community-shared palettes (NEW behavior)                             |
| `/palettes/[id]`               | Public\* | Single palette detail; \*also visible to owner when `is_public = false` (unchanged)    |
| `/user/palettes`               | Auth     | "My palettes" dashboard (MOVED from `/palettes`)                                       |
| `/user/palettes/new`           | Auth     | POST handler to create a draft palette + redirect to edit (MOVED from `/palettes/new`) |
| `/user/palettes/[id]/edit`     | Auth     | Edit a palette's name, description, paints, and visibility (MOVED)                     |

## Key Files

| Action  | File                                                              | Description                                                                       |
| ------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Create  | `src/modules/palettes/services/palette-service.ts` *(modify)*     | Add `countPublicPalettes()`; extend `listPublicPalettes` row to carry `userId` + owner display name |
| Create  | `src/modules/palettes/types/palette-summary.ts` *(modify)*        | Add optional `ownerDisplayName?: string` field                                    |
| Create  | `src/modules/palettes/components/palette-card.tsx` *(modify)*     | Render `ownerDisplayName` when present (catalog mode)                             |
| Create  | `src/app/palettes/page.tsx` *(replace)*                           | Public catalog list (replaces today's "My palettes" page)                         |
| Create  | `src/app/user/palettes/page.tsx`                                  | Today's owner-only "My palettes" dashboard, lifted verbatim                       |
| Create  | `src/app/user/palettes/new/route.ts`                              | Today's `/palettes/new` POST handler, with redirect targets pointed at `/user/...`|
| Create  | `src/app/user/palettes/[id]/edit/page.tsx`                        | Today's `/palettes/[id]/edit/page.tsx` lifted verbatim                            |
| Modify  | `src/app/palettes/new/route.ts`                                   | Keep file as a 308 redirect to `/user/palettes/new` so legacy forms still POST    |
| Modify  | `src/app/palettes/[id]/edit/page.tsx`                             | Keep file as a redirect that forwards owners to `/user/palettes/[id]/edit` and sends non-owners to `/palettes/[id]` |
| Modify  | `src/app/palettes/[id]/page.tsx`                                  | Update edit-link CTA on the detail page (owner-only) to `/user/palettes/[id]/edit`|
| Modify  | `src/modules/palettes/components/palette-card.tsx`                | Edit-link `/palettes/{id}/edit` → `/user/palettes/{id}/edit`                      |
| Modify  | `src/modules/palettes/components/palette-detail.tsx`              | Edit-link `/palettes/{id}/edit` → `/user/palettes/{id}/edit`                      |
| Modify  | `src/modules/palettes/actions/*.ts`                               | Update `revalidatePath('/palettes')` calls — see step 8                           |
| Modify  | `src/components/navbar.tsx`                                       | Disambiguate "Palettes" (public) vs "My palettes" (signed-in)                     |
| Modify  | `src/middleware.ts`                                               | Confirm `/palettes` stays in `PUBLIC_ROUTES`; `/user/palettes/*` falls through    |
| Modify  | `src/app/sitemap.ts`                                              | Emit public palette detail URLs                                                   |
| Modify  | `src/modules/marketing/components/cta-section.tsx`                | Signed-in CTA "Build a palette" — point at `/user/palettes` (today: `/palettes`)  |
| Modify  | `src/modules/marketing/utils/features.ts`                         | "Palettes & Collection" feature card href — keep `/palettes` (now public catalog) |

## Implementation Plan

### Module placement

All work lives in the existing `palettes` module — its `actions/`, `services/`, `components/`, `types/`, `utils/`, `validation.ts` directories already exist. No new submodule is needed. Treat the public schemes plan (`05-color-scheme-explorer/03-public-schema-page.md`) as the parallel reference; this plan is its sibling and they should ship in either order.

### Pre-flight: confirm what's already in place

Confirmed during exploration — do not redo:

- `palettes.is_public boolean NOT NULL DEFAULT false` and matching RLS policies (anon + authenticated SELECT for `is_public = true`, owner-only INSERT/UPDATE/DELETE) already exist (`20260425000000_create_palettes_tables.sql`).
- `listPublicPalettes({ limit, offset })` already exists on `createPaletteService` and returns `PaletteSummary[]`.
- `listPalettesForUser(userId)` already exists.
- `/palettes/[id]/page.tsx` already gates on `palette.isPublic || viewerOwnsIt` and produces correct OG/canonical metadata.
- `palette-card.tsx` already renders an `is_public` badge.

What's missing:

- A `count(*)` for public palettes (needed for catalog pagination).
- Owner display name on `PaletteSummary` (catalog cards need to credit the author).
- The route group + page for `/palettes` as a public catalog.
- The `/user/palettes` parallel for owner-only routes.
- Updates to all places that link/redirect/revalidate the old paths.

### 1. Extend the service

Modify `src/modules/palettes/services/palette-service.ts`:

1. **Add `countPublicPalettes()`**:
   ```ts
   async countPublicPalettes(): Promise<number> {
     const { count } = await supabase
       .from('palettes')
       .select('id', { count: 'exact', head: true })
       .eq('is_public', true)
     return count ?? 0
   }
   ```
2. **Extend `listPublicPalettes`** to fetch the owner's display name. Update the select to include the FK join to `profiles`:
   ```ts
   .select('id, name, is_public, updated_at, user_id, profiles(display_name), palette_paints(paint_id, paints(hex))')
   ```
   Map `profiles.display_name` into a new `ownerDisplayName` field on the returned `PaletteSummary`.
3. **`listPalettesForUser`**: leave as-is. The owner dashboard does not need to display its own display name on every card.

### 2. Update the summary type

Modify `src/modules/palettes/types/palette-summary.ts`:

- Add `ownerDisplayName?: string | null`. JSDoc: "Owner's profile display name. Populated by `listPublicPalettes`; omitted from owner-scoped queries where the viewer always owns the palette."

### 3. Update `PaletteCard`

Modify `src/modules/palettes/components/palette-card.tsx`:

- Render the owner's display name underneath the title, only when `summary.ownerDisplayName` is present:
  ```tsx
  {summary.ownerDisplayName && (
    <span className="text-xs text-muted-foreground">by {summary.ownerDisplayName}</span>
  )}
  ```
- Update the edit-link href from `/palettes/${summary.id}/edit` to `/user/palettes/${summary.id}/edit`.

### 4. Public catalog page (`/palettes`)

**Replace** `src/app/palettes/page.tsx`:

```tsx
const PAGE_SIZE = 24

export const metadata = pageMetadata({
  title: 'Community palettes',
  description: 'Browse paint palettes shared by the Grimify community.',
  path: '/palettes',
})

export default async function PalettesCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page = '1' } = await searchParams
  const offset = (Math.max(1, Number(page)) - 1) * PAGE_SIZE

  const supabase = await createClient()
  const service = createPaletteService(supabase)
  const [summaries, total] = await Promise.all([
    service.listPublicPalettes({ limit: PAGE_SIZE, offset }),
    service.countPublicPalettes(),
  ])

  // header + <PaletteCardGrid summaries={summaries} /> + pagination
}
```

- Page size: 24, paginated via `?page=`.
- Drop `noindex: true` — this is the catalog and should be indexable.
- Header right-side CTA: `Sign in → Build a palette` (anon) or `My palettes →` linking `/user/palettes` (signed in).
- Empty state: "No public palettes yet — sign in and share the first one" with a CTA at `/sign-in?next=/user/palettes`.

### 5. Owner dashboard (`/user/palettes`)

Create `src/app/user/palettes/page.tsx`:

- Lift today's `/palettes/page.tsx` body verbatim — auth check, `redirect('/sign-in?next=/user/palettes')`, `service.listPalettesForUser(user.id)`, `<PaletteCardGrid summaries={...} canEditAll />`, header with "New palette" form.
- Update the form action to `/user/palettes/new`.
- Update `pageMetadata` to `path: '/user/palettes'` and keep `noindex: true`.

### 6. New-palette POST handler (`/user/palettes/new`)

Create `src/app/user/palettes/new/route.ts`:

- Lift today's `/palettes/new/route.ts` verbatim with two changes:
  - `next=/palettes` (in the sign-in redirect) → `next=/user/palettes`.
  - `revalidatePath('/palettes')` becomes `revalidatePath('/user/palettes')` and an additional `revalidatePath('/palettes')` (the new public catalog) so a freshly-created (and later possibly toggled-public) palette doesn't show stale counts.
  - Final redirect target stays `/palettes/${id}/edit`? No — change to `/user/palettes/${id}/edit` per the route move.

### 7. Owner edit route move (`/user/palettes/[id]/edit`)

Create `src/app/user/palettes/[id]/edit/page.tsx`:

- Lift `src/app/palettes/[id]/edit/page.tsx` verbatim. Update internal links/forms inside the page (if any) to point at `/user/palettes/...`.
- Confirm the edit page already enforces ownership via service / RLS — keep that exactly as-is.

### 8. Update `revalidatePath` calls in palette actions

Audit every action under `src/modules/palettes/actions/` (currently 13 calls):

- `revalidatePath('/palettes')` — in many actions. Resolve each individually:
  - In actions that mutate **owner-visible** state without touching public visibility (e.g., reordering paints inside a private palette): change to `revalidatePath('/user/palettes')`.
  - In actions that change **public-visible** state (visibility toggle, name/description for a public palette, deleting a public palette): revalidate **both** `/palettes` and `/user/palettes` and `/palettes/${id}` so the public list stays consistent.
  - Actions that already do `revalidatePath(`/palettes/${id}`)` — keep, since the detail route URL is unchanged.
  - Actions that do `revalidatePath(`/palettes/${id}/edit`)` — change to `revalidatePath(`/user/palettes/${id}/edit`)`.

A practical rule: every action revalidates `/user/palettes`; actions that change visibility, name, description, or paint slots additionally revalidate `/palettes` (the catalog) so summary card swatches/counts stay fresh.

Concrete file-by-file pass:

- `delete-palette.ts` — revalidate `/user/palettes`, `/palettes` (catalog will drop a row).
- `update-palette.ts` — revalidate `/user/palettes`, `/palettes`, `/palettes/${id}`.
- `add-paint-to-palette.ts` / `add-paints-to-palette.ts` — revalidate `/user/palettes`, `/palettes`, `/palettes/${id}`, `/user/palettes/${id}/edit`.
- `create-palette-with-paints.ts` / `create-palette.ts` — revalidate `/user/palettes` and `/palettes` (a freshly-public palette must appear in the catalog).
- `swap-palette-paint.ts` / `reorder-palette-paints.ts` / `remove-palette-paint.ts` — revalidate `/palettes/${id}` and `/user/palettes/${id}/edit`.

### 9. Backwards-compat redirects

To preserve external bookmarks and any in-flight forms during deploy, keep stub files at the old owner-only paths that redirect rather than 404:

**`src/app/palettes/new/route.ts`** — replace body with a 308 forward:

```ts
export async function POST(request: NextRequest) {
  return NextResponse.redirect(new URL('/user/palettes/new', request.url), 308)
}
```

**`src/app/palettes/[id]/edit/page.tsx`** — turn into a server-side redirect:

```tsx
export default async function PaletteEditRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Owners go to the new edit URL, everyone else falls back to the public detail page
  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(id)

  if (palette && user && palette.userId === user.id) {
    redirect(`/user/palettes/${id}/edit`)
  }
  redirect(`/palettes/${id}`)
}
```

These stubs can be deleted after a few weeks, once analytics confirm no external traffic hits them.

### 10. Detail-page CTA

Modify `src/app/palettes/[id]/page.tsx` (only minor — the page itself stays public-aware):

- The owner-CTA in `<PaletteDetail>` (currently `href={\`/palettes/${palette.id}/edit\`}`) — update inside `palette-detail.tsx` (step in Key Files).

Modify `src/modules/palettes/components/palette-detail.tsx`:

- Edit-link href `/palettes/${palette.id}/edit` → `/user/palettes/${palette.id}/edit`.

### 11. Navbar

Modify `src/components/navbar.tsx`:

- Existing entry `<Link href="/palettes">Palettes</Link>` — keep, but always render (currently gated on `user`). It now points at the public catalog and is for everyone.
- Add a signed-in-only entry adjacent to "Collection": `<Link href="/user/palettes">My palettes</Link>`.
- Decision: render order (left-to-right) — `Paints | Brands | Schemes | Palettes | Collection | My schemes | My palettes`. The "My …" cluster is a natural pair sitting alongside `Collection`.

If the schemes plan ships first and adds a "My schemes" link, mirror its label and styling here for consistency.

### 12. Middleware

`/palettes` is already in `PUBLIC_ROUTES`. `/user/palettes/*` is **not**, so middleware's existing fallthrough sends unauthenticated requests to `/sign-in?next=/user/palettes/...`. No code change. Verify:

- Hit `/user/palettes` while signed out → land on `/sign-in?next=/user/palettes`.
- Hit `/user/palettes/abc/edit` while signed out → land on `/sign-in?next=/user/palettes/abc/edit`.
- Hit `/palettes` while signed out → public catalog renders.

### 13. Sitemap

Modify `src/app/sitemap.ts`:

- Keep the static `/palettes` entry; bump `priority` to `0.7` and `changeFrequency: 'daily'` since it's now the public landing surface for shared palettes.
- Add a server-side fetch (within the sitemap loader) for all public palette ids + `updated_at`, capped at 1000, and emit `${base}/palettes/${id}` URLs with `priority: 0.5`, `changeFrequency: 'weekly'`. The detail route is already public-OG-friendly.

### 14. Marketing surface updates

Modify `src/modules/marketing/components/cta-section.tsx`:

- Signed-in CTA "Build a palette" currently links `/palettes` — change to `/user/palettes`. Anonymous CTA is unaffected (already routes to sign-up).

Modify `src/modules/marketing/utils/features.ts`:

- "Palettes & Collection" feature card href stays `/palettes` (now public catalog) — confirm during QA that the click destination feels right for unauthenticated visitors. If the team prefers landing them on the explorer or a sign-up nudge, change later.

### 15. Verification

Manual QA (treat as a checklist for the PR description):

- Anonymous: visit `/palettes` → public catalog grid; click a card → `/palettes/[id]` renders with shareable OG metadata.
- Anonymous: visit `/user/palettes` → redirected to `/sign-in?next=/user/palettes`.
- Signed in (user A, has 0 public palettes): visit `/palettes` → empty catalog OR sees other users' public palettes.
- Signed in (user A): from `/user/palettes`, click "New palette" → lands on `/user/palettes/{newId}/edit` and the new draft appears in `/user/palettes`.
- Signed in (user A): toggle a palette to public → it appears at the top of `/palettes`.
- Anonymous (incognito): can view that public palette at `/palettes/{id}`.
- Anonymous (incognito): hitting `/palettes/{ownerOnlyId}/edit` → server redirect to `/palettes/{id}` (read-only fallback).
- Signed in (user A): hitting `/palettes/{ownAId}/edit` → 308/redirect to `/user/palettes/{ownAId}/edit`.
- Signed in (user A): hitting `/palettes/{userBOnlyId}/edit` → fallback to `/palettes/{userBOnlyId}` (read-only) and ultimately 404 if user B's palette isn't public.
- All `revalidatePath` calls land — toggling visibility from edit page reflects on `/palettes` within one navigation.
- `npm run build` and `npm run lint` succeed.

### 16. Out of scope (defer)

- **Search / filter on the catalog** — start with chronological sort. Add hue / paint-count / brand filters once content volume justifies it.
- **Pagination beyond `?page=N`** — no infinite scroll, no `sitemap-{n}.xml` shard. Revisit when the catalog crosses ~500 public palettes.
- **Likes / comments / community signal** — belongs in `07-community-social/`.
- **Deletion of stub redirects** — keep the legacy stubs (`/palettes/new`, `/palettes/[id]/edit`) until analytics show no external traffic. Track as a follow-up cleanup.
- **Refactor to a `(user)` route group** — using a literal `/user/` URL prefix is sufficient and matches the public-schemes plan. A `(user)` route group would be cosmetic only and is not blocking.

### Affected Files

| File                                                                  | Changes                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/modules/palettes/services/palette-service.ts`                    | Add `countPublicPalettes`; extend `listPublicPalettes` row mapping              |
| `src/modules/palettes/types/palette-summary.ts`                       | Add `ownerDisplayName?: string \| null`                                         |
| `src/modules/palettes/components/palette-card.tsx`                    | Render `ownerDisplayName` when present; update edit href to `/user/palettes/...`|
| `src/modules/palettes/components/palette-detail.tsx`                  | Update edit href to `/user/palettes/...`                                        |
| `src/modules/palettes/actions/*.ts`                                   | Update `revalidatePath` calls per step 8                                        |
| `src/app/palettes/page.tsx`                                           | Replace — public catalog list                                                   |
| `src/app/palettes/new/route.ts`                                       | Replace with 308 redirect to `/user/palettes/new`                               |
| `src/app/palettes/[id]/edit/page.tsx`                                 | Replace with owner-aware redirect (`/user/palettes/[id]/edit` or `/palettes/[id]`)|
| `src/app/user/palettes/page.tsx`                                      | New — owner dashboard, lifted from old `/palettes/page.tsx`                     |
| `src/app/user/palettes/new/route.ts`                                  | New — POST handler, lifted with redirect targets updated                        |
| `src/app/user/palettes/[id]/edit/page.tsx`                            | New — edit page lifted from `/palettes/[id]/edit/page.tsx`                      |
| `src/components/navbar.tsx`                                           | Show `/palettes` to all visitors; add `/user/palettes` for signed-in users      |
| `src/app/sitemap.ts`                                                  | Emit `/palettes/[id]` for each public palette                                   |
| `src/modules/marketing/components/cta-section.tsx`                    | Signed-in CTA "Build a palette" → `/user/palettes`                              |

## Risks & Considerations

- **`/palettes` semantic shift is breaking for owners' bookmarks** — anyone who saved `/palettes` as their "My palettes" tab now lands on the public catalog. Mitigation: navbar adds a clear "My palettes" link; the catalog header surfaces "My palettes →" for signed-in viewers. Not silent-redirecting signed-in users away from `/palettes` is intentional — the catalog is the legitimate destination for everyone.
- **Action revalidation correctness** — the `revalidatePath` audit is the highest-risk piece. Missing a public-catalog revalidation will silently stale the catalog after a visibility toggle. QA must specifically toggle visibility on a palette and immediately reload `/palettes`.
- **`profiles.display_name` join performance** — `listPublicPalettes` already joins `palette_paints` + `paints`; adding `profiles` is one more left-join on a small table with a PK match, so no index addition is needed. Verify the generated PostgREST query in dev with EXPLAIN if the catalog feels slow.
- **Display name visibility leak** — if `profiles` ever supports private profile mode, the join needs a visibility guard (currently `display_name` is treated as public on `users/[id]`, so the join is fine today).
- **OG card on `/palettes/[id]`** — already implemented. No change needed; the catalog click-through gets the existing OG image.
- **Stub redirects** — keeping old paths as redirect-only files is the lightest-touch approach. They're cheap to delete later; deleting them now risks 404s for any open editor session that's about to POST.
- **Coordination with public-schemes plan** — the schemes plan introduces `/user/schemes/*`. Whichever ships first establishes the `/user/...` convention; the second one inherits the same shape. The two plans are mutually independent and either can ship first.

## Notes

- Palettes already had `is_public` from day one, so no migration is needed — this PR is a route + UI change with a small service extension.
- The detail URL `/palettes/[id]` does not move. Keeping it stable preserves all existing OG embeds and shareable links.
- The `(user)` route group convention isn't repeated here — use a literal `/user/` URL prefix for clarity. A future cleanup PR can convert `/user/palettes/...` and `/user/schemes/...` to a `(user)` route group without breaking URLs.
