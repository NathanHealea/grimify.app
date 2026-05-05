# Palette Management — Dashboard, Builder, and CRUD UI

**Epic:** Color Palettes
**Type:** Feature
**Status:** Todo
**Branch:** `feature/palette-management`
**Merge into:** `v1/main`

## Summary

Give authenticated users a complete CRUD experience for their palettes: a "My palettes" dashboard, a builder page with name/description editing and a paint list, a public detail/view page, and the ability to delete palettes. Adds the user-facing surface on top of the schema and module from `00-palette-schema.md`.

This feature delivers the **basic** builder (name, description, visibility, list of paints with remove/clear). Drag-and-drop reordering ships in `03-palette-reorder.md`; bulk-add and "save scheme as palette" ship in `02-add-to-palette.md`; the hue-locked HSL swap ships in `04-palette-hue-swap.md`.

## Acceptance Criteria

- [ ] `/palettes` lists the signed-in user's palettes as cards (name, swatch strip, paint count, updated date)
- [ ] `/palettes/new` creates an empty palette and redirects to its edit page
- [ ] `/palettes/[id]` is the read-only view; visible to anyone if `is_public`, owner-only otherwise
- [ ] `/palettes/[id]/edit` is the builder: edit name/description/visibility, view paints, remove a paint, clear the palette, delete the palette
- [ ] Both the read view and edit view render paints as a swatch strip plus a card list (paint name, brand, hex, optional per-slot note)
- [ ] An "empty palette" state on the read view explains how to add paints
- [ ] Deleting a palette confirms first, then redirects to `/palettes` with a toast
- [ ] Unauthenticated users hitting `/palettes`, `/palettes/new`, or `/palettes/{id}/edit` are redirected to `/sign-in?next={path}`
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route                  | Description                                                | Auth        |
| ---------------------- | ---------------------------------------------------------- | ----------- |
| `/palettes`            | "My palettes" dashboard (later also surfaces public feed)  | required    |
| `/palettes/new`        | Action route — creates a new empty palette and redirects   | required    |
| `/palettes/[id]`       | Read-only palette detail                                   | conditional |
| `/palettes/[id]/edit`  | Palette builder                                            | owner       |

`[id]/edit` enforces ownership in the route loader (404 if not owner). `[id]` 404s if neither the caller is the owner nor `is_public = true`.

## Module additions

```
src/modules/palettes/
├── actions/
│   ├── (existing) create-palette.ts
│   ├── (existing) update-palette.ts
│   ├── (existing) delete-palette.ts
│   └── remove-palette-paint.ts          NEW — single-slot removal action
├── components/
│   ├── palette-card.tsx                 NEW — dashboard tile
│   ├── palette-card-grid.tsx            NEW
│   ├── palette-detail.tsx               NEW — read-only view body
│   ├── palette-form.tsx                 NEW — name/description/visibility (per CLAUDE.md, only the <form>)
│   ├── palette-builder.tsx              NEW — orchestrates form + paint list + delete
│   ├── palette-paint-list.tsx           NEW — vertical list of palette paints with remove buttons
│   ├── palette-paint-row.tsx            NEW — single paint row (swatch, name, brand, note, remove)
│   ├── palette-swatch-strip.tsx         NEW — horizontal hex strip used by card + detail header
│   ├── palette-empty-state.tsx          NEW
│   └── delete-palette-button.tsx        NEW — confirm dialog + action
└── utils/
    └── format-palette-updated-label.ts  NEW — "Updated 3 days ago"
```

## Key Files

| Action  | File                                                                  | Description                                                                |
| ------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Create  | `src/app/palettes/page.tsx`                                           | Server component — loads user palettes, renders dashboard                  |
| Create  | `src/app/palettes/new/route.ts`                                       | Server route handler — calls `createPalette`, redirects to edit page       |
| Create  | `src/app/palettes/[id]/page.tsx`                                      | Read-only detail (auth-conditional)                                        |
| Create  | `src/app/palettes/[id]/edit/page.tsx`                                 | Builder wrapper — enforces owner, renders `<PaletteBuilder>`               |
| Create  | `src/modules/palettes/components/palette-card.tsx`                    | Tile with swatch strip, name, paint count, updated label                   |
| Create  | `src/modules/palettes/components/palette-card-grid.tsx`               | Responsive grid of `PaletteCard`s                                          |
| Create  | `src/modules/palettes/components/palette-detail.tsx`                  | Read view: header + swatch strip + paint list                              |
| Create  | `src/modules/palettes/components/palette-form.tsx`                    | `<form>` only — name, description, visibility toggle, save button          |
| Create  | `src/modules/palettes/components/palette-builder.tsx`                 | Composes form, paint list, delete button; subscribes to action state       |
| Create  | `src/modules/palettes/components/palette-paint-list.tsx`              | Maps `palette.paints` to rows                                              |
| Create  | `src/modules/palettes/components/palette-paint-row.tsx`               | Swatch + paint card linkout + remove button                                |
| Create  | `src/modules/palettes/components/palette-swatch-strip.tsx`            | Horizontal hex strip; truncates with "+N" badge past 16                    |
| Create  | `src/modules/palettes/components/palette-empty-state.tsx`             | "No paints yet — add some from any paint card or the scheme explorer"     |
| Create  | `src/modules/palettes/components/delete-palette-button.tsx`           | Button + dialog + form action                                              |
| Create  | `src/modules/palettes/actions/remove-palette-paint.ts`                | Removes a single slot, normalizes positions                                |
| Create  | `src/modules/palettes/utils/format-palette-updated-label.ts`          | Renders relative-time label                                                |
| Modify  | `src/components/site-nav` (or equivalent)                             | Add "Palettes" link to authenticated nav                                   |

## Implementation Plan

The work splits into **eight** ordered groups. Each group ends in a buildable, lintable state.

### Group 1 — Auth surface area + service tweaks

**1.1 Update middleware** `src/middleware.ts` — add `'/palettes'` to `PUBLIC_ROUTES`. Middleware currently redirects unauthenticated users away from any non-public path, which would block `/palettes/{id}` for public palettes. After this change, every `/palettes/*` request reaches the page; per-route auth is enforced by the page itself.

**1.2 Align `listPalettesForUser` swatch count** `src/modules/palettes/services/palette-service.ts:115-186` — the service currently returns up to **5** swatch hexes (`row.palette_paints.slice(0, 5)`). The doc/cards want **8**. Update both `listPalettesForUser` and `listPublicPalettes` to slice to 8. Update the JSDoc accordingly. Update `PaletteSummary.swatches` JSDoc at `src/modules/palettes/types/palette-summary.ts:18` to say "up to eight hex color codes".

### Group 2 — Utilities + the one new action

**2.1 Add `format-palette-updated-label.ts`** `src/modules/palettes/utils/format-palette-updated-label.ts` — pure helper. Takes an ISO timestamp, returns a relative label ("Updated 3 days ago", "Updated just now", "Updated on Jan 4"). Use `Intl.RelativeTimeFormat` for the relative span and fall back to a localized date string past 30 days. JSDoc per `CLAUDE.md`'s utility-function convention.

**2.2 Add `remove-palette-paint.ts`** `src/modules/palettes/actions/remove-palette-paint.ts` — `'use server'`. Signature: `removePalettePaint(paletteId: string, position: number): Promise<{ error?: string }>`.

1. Reject if `paletteId` missing or `position < 0`.
2. `createClient()` + `auth.getUser()`; return error if no user.
3. Load the palette via `getPaletteById`. If null, RLS blocked us → return generic error.
4. If `palette.userId !== user.id`, return `'You can only remove paints from palettes you own.'` (defense in depth — RLS will also reject the write).
5. Build the new slot list = `palette.paints.filter(p => p.position !== position)`.
6. `normalizePalettePositions` to close the gap (already exists at `src/modules/palettes/utils/normalize-palette-positions.ts`).
7. Call `service.setPalettePaints(paletteId, normalized)` — uses the `replace_palette_paints` RPC for atomicity.
8. `revalidatePath('/palettes/{id}')` and `revalidatePath('/palettes/{id}/edit')`. No redirect.

### Group 3 — Leaf presentation components

Order matters: each one is reused by the next layer up.

**3.1 `palette-swatch-strip.tsx`** — `'use client'` not required (pure presentational). Props: `hexes: string[]`, `size?: 'sm'|'md'|'lg'` (default `md`), `max?: number` (default 16), `className?: string`. Cells are square `div`s with `style={{ backgroundColor: hex }}`, fixed sizes 16/28/40 px. When `hexes.length > max`, render the first `max` cells plus a `+N` badge cell using `badge badge-soft`. Empty array → render a single dashed muted placeholder cell. Use the `cn()` util for class merging.

**3.2 `palette-empty-state.tsx`** — Props: `variant: 'owner'|'guest'`. Owner copy: "No paints yet — add some from any paint card or the scheme explorer." Guest copy: "This palette is empty." Both render a centered card-like block using `card card-body` styling for visual weight.

**3.3 `palette-paint-row.tsx`** — `'use client'` (has the remove button form). Props: `paletteId`, `position`, `paint: ColorWheelPaint`, `note: string | null`, `canEdit: boolean`. Layout: 32 px swatch + paint name + brand line ("Citadel: Layer") + optional `<p className="text-xs text-muted-foreground">{note}</p>` when present. When `canEdit`, render a small `<form action={removePalettePaint.bind(null, paletteId, position)}>` with a destructive button. (Use `bind` so the button is a plain submit and works without JS — server-action `bind` is supported in Next 15 / React 19.) The form lives **inside** the row but is not nested in any other form (the parent `PaletteForm` is sibling, not ancestor).

### Group 4 — Composite read components

**4.1 `palette-paint-list.tsx`** — server component. Props: `paletteId`, `paints: PalettePaint[]`, `canEdit: boolean`. Maps paints to `<PalettePaintRow>`. When a `paints[i].paint` is `undefined` (paint deleted upstream), render a muted "Paint unavailable" row but keep the slot. Wrapper: `flex flex-col gap-2`.

**4.2 `palette-card.tsx`** — server component (no client logic). Props: a `PaletteSummary` plus `canEdit?: boolean`. Visual: full-tile `<Link href={'/palettes/{id}'}>` that wraps a `card card-body card-compact` with the swatch strip on top, name as `card-title`, paint count + visibility (`badge badge-soft`) as a meta row, and the relative updated label from `formatPaletteUpdatedLabel`. Edit affordance: when `canEdit`, render a small `Edit` link in the corner using `stopPropagation` (mirror the `CollectionPaintCard` overlay pattern at `src/modules/collection/components/collection-paint-card.tsx`).

**4.3 `palette-card-grid.tsx`** — server component. Props: `summaries: PaletteSummary[]`, `canEditAll?: boolean`. Pure layout: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`. Maps to `<PaletteCard>`. Empty state lives **outside** the grid in the page.

**4.4 `palette-detail.tsx`** — server component. Props: `palette: Palette`, `viewer: { id: string } | null`. Composes the read view body:

- Header card: `<h1>{name}</h1>`, optional description, owner attribution (resolve from `profiles.display_name` via a small server-side lookup or pass it in as a prop — pass it in to keep this component pure), public/private chip, "Edit" link when `viewer?.id === palette.userId`.
- `<PaletteSwatchStrip size="lg" hexes={hexes} />` when paints exist.
- `<PalettePaintList>` with `canEdit={false}` when paints exist.
- `<PaletteEmptyState variant="guest" />` when `palette.paints.length === 0`.

### Group 5 — Builder components

**5.1 `palette-form.tsx`** — `'use client'`. Per `CLAUDE.md`'s "Form components should only contain the `<form>` element" rule, this file **renders only the `<form>`** (no card chrome). Props: `palette: Palette`. Uses `useActionState` (imported from `'react'`) bound to `updatePalette`. Inputs: name (required), description (textarea), `is_public` toggle. Hidden `id` input. Renders inline error text from the action state.

**5.2 `delete-palette-button.tsx`** — `'use client'`. Mirrors `src/modules/user/components/delete-user-dialog.tsx`: native `<dialog>` controlled by `useEffect` + `useRef`, type-to-confirm input requiring the palette name, calls `deletePalette` inside `startTransition`, surfaces the returned `{ error }` inline. The button itself lives in this component (`btn btn-destructive`).

**5.3 `palette-builder.tsx`** — `'use client'`. Props: `palette: Palette`. Lays out a single `card`:

- Header: editable name (delegated to `PaletteForm`)
- Body: `<PaletteForm palette={palette} />` followed by `<PalettePaintList paletteId={palette.id} paints={palette.paints} canEdit />` or `<PaletteEmptyState variant="owner" />`.
- Footer: `<DeletePaletteButton palette={palette} />` aligned end.

The form action's `success` state can drive a small inline "Saved" indicator via `aria-live="polite"` — no toast library is wired up in this project, so keep feedback inline. Same for delete: redirect-on-success handles itself; no toast.

### Group 6 — Routes

**6.1 `src/app/palettes/page.tsx`** — server component. Auth check: if no `user`, `redirect('/sign-in?next=/palettes')`. Loads `service.listPalettesForUser(user.id)`. Renders header ("My palettes" + a `<form action="/palettes/new" method="post">` containing a `btn btn-primary` submit), then `<PaletteCardGrid>` or empty-state CTA when `summaries.length === 0`.

**6.2 `src/app/palettes/new/route.ts`** — `export async function POST(request: NextRequest)`. Auth check; if no user, redirect to `/sign-in?next=/palettes`. Calls `service.createPalette({ userId, name: 'Untitled palette' })`. `revalidatePath('/palettes')`. `NextResponse.redirect(new URL('/palettes/{id}/edit', request.url), 303)` (303 = "See Other", correct for POST→GET hop). Note: the `createPalette` server action already performs this same flow but the doc specifies a route handler — favour the route handler so the dashboard button is a plain `<form action="/palettes/new" method="post">`.

**6.3 `src/app/palettes/[id]/page.tsx`** — server component. `params` is `Promise<{ id: string }>` per Next 15 typing. Loads palette via `service.getPaletteById(id)`. `notFound()` if `null`. If `!palette.isPublic && palette.userId !== viewer?.id` → `notFound()`. Resolves owner display name via `supabase.from('profiles').select('display_name').eq('id', palette.userId).single()`. Renders `<PaletteDetail palette={palette} viewer={viewer} ownerDisplayName={...} />`.

**6.4 `src/app/palettes/[id]/edit/page.tsx`** — server component. Auth: if no user, `redirect('/sign-in?next=/palettes/{id}/edit')`. Load palette; `notFound()` if missing or `palette.userId !== user.id`. Renders `<PaletteBuilder palette={palette} />`.

### Group 7 — Navigation + small follow-ups

**7.1 Navbar update** `src/components/navbar.tsx` — Add `<Link href="/palettes" className="btn btn-ghost btn-sm">Palettes</Link>` inside the existing authenticated cluster, immediately after the `Collection` link (line 55–58).

**7.2 Public-route registration** confirm middleware change from 1.1 hasn't broken `/profile/setup` enforcement for new users — incomplete-profile users hitting `/palettes/{id}` should still be funneled to `/profile/setup`. The current middleware short-circuits public routes **before** the profile check, which means a logged-in user with an incomplete profile could view a public palette without setup. That's acceptable per current behavior of `/paints` (also public). No further change.

### Group 8 — Build / lint / manual QA

**8.1** Run `npm run build` and `npm run lint`. Fix any issues.

**8.2** Manual QA checklist:

- Signed in, `/palettes` — empty state with "Create your first palette"
- Click "New palette" → lands on `/palettes/{id}/edit` with name `Untitled palette`
- Edit name + description, toggle Public, Save → values persist; back at `/palettes` the card shows the new label
- Sign out → `/palettes/{id}` (public) renders read-only; private palette 404s
- Sign back in, remove a paint via the row's button → list shrinks, refresh → positions still 0..N-1 (verify in DB or by adding/refreshing in `02-add-to-palette`)
- Delete a palette via the dialog → confirms, redirects to `/palettes`, dashboard reflects deletion
- Hit `/palettes/{id}/edit` for someone else's palette → 404
- Hit `/palettes` while signed out → redirected to `/sign-in?next=/palettes`

## Risks & Considerations

- **Middleware reshape**: Adding `/palettes` to `PUBLIC_ROUTES` shifts auth enforcement from middleware into the page layer. Each protected sub-route must redirect explicitly. This is the same pattern `/paints` uses — public list + public detail, no protected sub-routes — but we're adding protected sub-routes (`/palettes`, `/palettes/new`, `/palettes/{id}/edit`) under a public root for the first time. Forgetting an auth redirect on a future palette sub-route would be a silent leak; double-check during code review.
- **Owner check duplication**: RLS prevents data leaks at the database boundary, but we still 404 in the route loader to keep the URL surface clean and avoid leaking palette existence (an unauthorized request would otherwise see "this palette exists but is private" via timing differences).
- **`/palettes/new` as POST-only**: Prevents accidental duplicate-create from refresh. Use a 303 status on the redirect so browsers GET the destination instead of replaying the POST.
- **Card limits on swatch strip**: At ~16+ paints the strip overflows; truncate after 16 with a "+N" badge and rely on the detail page to show all of them.
- **Per-slot `note`**: The schema has it; the row component renders it read-only here. Editing the note is part of `02-add-to-palette` (where rows are created/updated) — keeping this feature focused on the management shell.
- **No toast library**: The project has no toast/sonner integration. Successful save is communicated via a small `aria-live="polite"` region inline next to the save button; successful delete uses redirect + dashboard re-render. If a toast library is added later, the inline region can be replaced without other changes.
- **`bind` on server actions**: The remove-paint button uses `removePalettePaint.bind(null, paletteId, position)` so it remains a plain `<form>` submit. This works for non-form-data arguments only — keep the action's signature primitive (`string`, `number`).
- **Swatches count alignment**: The service currently slices to 5; the doc and card design call for 8. Updating the service is part of Group 1 — be careful that the type doc on `PaletteSummary.swatches` is updated in lockstep.

## Notes

- "Add a paint" UI lives in `02-add-to-palette.md` — this feature deliberately does **not** include a paint picker on the builder; you add paints from a paint card, the paint detail page, or the scheme explorer.
- Reordering is gated to `03-palette-reorder.md` — the builder list is static-order in this feature.
- The dashboard query stays cheap because `listPalettesForUser` returns a flattened summary with up to 8 swatch hex codes; no per-card paint hydration.
