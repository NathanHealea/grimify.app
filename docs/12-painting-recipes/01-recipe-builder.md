# Recipe Builder — Dashboard, Create/Edit, Sections and Steps

**Epic:** Painting Recipes
**Type:** Feature
**Status:** Completed
**Branch:** `feature/recipe-builder`
**Merge into:** `v1/main`

## Summary

Deliver the user-facing CRUD shell for recipes: a "My recipes" dashboard, a basic builder that lets the user edit title/summary/visibility, manage **sections**, manage **steps within sections**, drag/drop sections and steps, and a public detail view that renders the whole recipe top-to-bottom.

This feature delivers the **structural** builder. Per-step paint pickers live in `02-recipe-step-paints.md`; photos in `03-recipe-photos.md`; notes in `04-recipe-notes.md`. By the end of this feature a user can write the prose of a recipe with sections and steps and read it back on a public page.

## Acceptance Criteria

- [x] `/user/recipes` lists the signed-in user's recipes as cards (title, cover image, section count, step count, updated). _(Routes were moved from `/recipes` to `/user/recipes` per the "Route convention drift" risk; public catalog at `/recipes` is deferred to `05-recipe-sharing.md`.)_
- [x] `/user/recipes/new` creates an empty recipe and redirects to its edit page
- [x] `/recipes/[id]` is the read-only view; visible to anyone if `is_public`, owner-only otherwise
- [x] `/user/recipes/[id]/edit` is the builder; legacy `/recipes/[id]/edit` redirects owner-aware
- [x] Builder edits title, summary, visibility (private/public), optional palette association
- [x] Builder lets the user add, rename, reorder (drag/drop), and delete sections
- [x] Within a section, the user can add, edit, reorder (drag/drop), and delete steps
- [x] Each step has an editable title, technique, and instructions field
- [x] Step **paints** are placeholder rows here ("Add paints in step paints feature"); actual editing comes in `02-recipe-step-paints.md`
- [x] Read view renders sections as headings, steps as numbered subitems with technique/instructions/paint references; markdown rendering for `summary` and `instructions`
- [x] Deleting a recipe confirms first, redirects to `/user/recipes` with a toast
- [x] Unauthenticated users hitting `/user/recipes`, `/user/recipes/new`, or `/user/recipes/{id}/edit` are redirected to `/sign-in?next={path}`
- [x] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route                    | Description                                                  | Auth        |
| ------------------------ | ------------------------------------------------------------ | ----------- |
| `/recipes`               | "My recipes" dashboard                                       | required    |
| `/recipes/new`           | POST-only — creates an empty recipe and redirects            | required    |
| `/recipes/[id]`          | Read-only recipe detail                                      | conditional |
| `/recipes/[id]/edit`     | Recipe builder                                               | owner       |

## Module additions

```
src/modules/recipes/
├── actions/
│   ├── (existing) create-recipe.ts, update-recipe.ts, delete-recipe.ts
│   ├── add-recipe-section.ts            NEW
│   ├── update-recipe-section.ts         NEW
│   ├── delete-recipe-section.ts         NEW
│   ├── reorder-recipe-sections.ts       NEW
│   ├── add-recipe-step.ts               NEW
│   ├── update-recipe-step.ts            NEW
│   ├── delete-recipe-step.ts            NEW
│   └── reorder-recipe-steps.ts          NEW
├── components/
│   ├── recipe-card.tsx                  NEW — dashboard tile
│   ├── recipe-card-grid.tsx             NEW
│   ├── recipe-detail.tsx                NEW — read-only view
│   ├── recipe-form.tsx                  NEW — title, summary, visibility, palette select
│   ├── recipe-builder.tsx               NEW — orchestrates form + sections + delete
│   ├── recipe-section-list.tsx          NEW — DnD wrapper
│   ├── recipe-section-card.tsx          NEW — section header + step list + add step
│   ├── recipe-step-list.tsx             NEW — DnD wrapper inside a section
│   ├── recipe-step-card.tsx             NEW — step body editor + drag handle
│   ├── recipe-step-paint-placeholder.tsx NEW — "Add paints" affordance (filled in by 02)
│   ├── delete-recipe-button.tsx         NEW
│   └── markdown-text.tsx                NEW (or reused from a future shared module)
└── utils/
    └── reorder-array.ts                 share if Epic 11 already created one — else add here
```

## Key Files

| Action | File                                                                | Description                                                       |
| ------ | ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Create | `src/app/recipes/page.tsx`                                          | Dashboard                                                         |
| Create | `src/app/recipes/new/route.ts`                                      | POST → createRecipe → redirect                                    |
| Create | `src/app/recipes/[id]/page.tsx`                                     | Read-only detail                                                  |
| Create | `src/app/recipes/[id]/edit/page.tsx`                                | Builder                                                           |
| Create | `src/modules/recipes/components/*.tsx`                              | (see module additions above)                                      |
| Create | `src/modules/recipes/actions/*.ts`                                  | One action per file                                               |
| Modify | `src/components/site-nav` (or equivalent)                           | Add "Recipes" link to authenticated nav                           |
| Modify | `package.json`                                                      | `react-markdown` (or similar) if not present                      |

## Implementation

### 1. Dashboard — `/recipes/page.tsx`

Server component that loads the user's recipes via `listRecipesForUser`. Renders:

- "My recipes" header + "New recipe" CTA (POSTs to `/recipes/new`)
- `RecipeCardGrid` of summaries
- Empty state CTA when zero recipes

`RecipeCard` accepts `RecipeSummary` (id, title, coverPhotoUrl, sectionCount, stepCount, updatedAt, isPublic). The card links to `/recipes/{id}`.

### 2. New recipe — `/recipes/new/route.ts`

POST-only:

1. Verify session
2. `createRecipe` with default title "Untitled recipe"
3. Redirect to `/recipes/{id}/edit`

### 3. Read view — `/recipes/[id]/page.tsx`

1. `getRecipeById`
2. 404 if not found, or not public and caller isn't owner
3. Render `<RecipeDetail>`:
   - Header: cover photo (if any), title, author attribution, "Edit" if owner
   - Summary block (markdown rendered)
   - Sections in order; each section heading + numbered step cards (1.1, 1.2, ...) showing title, technique chip, instructions (markdown), referenced paints (renders even if `02-recipe-step-paints` hasn't shipped — empty state placeholder), notes (renders even if `04-recipe-notes` hasn't shipped — empty state)
   - "Print/share" toolbar TBD (out of scope here)

### 4. Builder — `/recipes/[id]/edit/page.tsx`

1. Load recipe; 404 if caller isn't owner
2. Render `<RecipeBuilder recipe={recipe} />`

`RecipeBuilder` is a client component that:

- Renders `<RecipeForm>` for title/summary/visibility/palette association (uses `useActionState` against `updateRecipe`)
- Renders `<RecipeSectionList>` for sections; each `RecipeSectionCard` contains a `RecipeStepList`
- Renders `<DeleteRecipeButton>` at the bottom

Per `CLAUDE.md`, `RecipeForm` only contains the `<form>` element; layout/header/footer compose in `RecipeBuilder`.

### 5. Section management

`RecipeSectionCard`:

- Editable title (inline edit on click; saves via `updateRecipeSection` on blur)
- "Add step" button — calls `addRecipeStep` and inserts a new step at the end
- "Delete section" affordance (confirm dialog; cascades steps)
- Drag handle for reorder

Actions:

- `addRecipeSection(recipeId, title?)` — appends a new section
- `updateRecipeSection(sectionId, patch)` — updates title
- `deleteRecipeSection(sectionId)` — deletes; normalizes positions of siblings
- `reorderRecipeSections(recipeId, orderedSectionIds[])` — same two-phase update technique as palette reorder

### 6. Step management

`RecipeStepCard`:

- Editable title, technique, instructions
- Saves via `updateRecipeStep` on blur (or with a per-step "Save" button if blur-on-save feels noisy in QA)
- Step number (e.g., `1.1`, `1.2`) is computed client-side from section position + step position
- Drag handle for reorder
- "Delete step" affordance (confirm)
- `RecipeStepPaintPlaceholder` slot — filled in by `02-recipe-step-paints.md`

Actions:

- `addRecipeStep(sectionId, title?)`
- `updateRecipeStep(stepId, patch)`
- `deleteRecipeStep(stepId)`
- `reorderRecipeSteps(sectionId, orderedStepIds[])`

### 7. Palette association

`RecipeForm` includes a "Palette" combobox listing the user's palettes (queries `listPalettesForUser` via the client service). Setting a palette updates `recipes.palette_id`. The detail page renders the palette's swatch strip below the summary; the builder shows a small "Linked palette: {name}" chip with an "x" to clear.

Selecting a palette here doesn't auto-populate any step's paints — it's purely a soft link that lets the user (and the per-step paint picker in `02-recipe-step-paints.md`) prefer that palette as a source.

### 8. Drag-and-drop

Same library and patterns as `11-color-palettes/03-palette-reorder.md`: `@dnd-kit/core` + `@dnd-kit/sortable`, two-phase position update, optimistic UI with rollback.

Reuse `reorder-array.ts` if it landed in Epic 11; otherwise create it in this feature's `utils/`.

### 9. Markdown rendering

Use `react-markdown` (or whatever Next/MDX-ish lib already exists in the project — verify before adding a dep). Sanitize default HTML; allow basic formatting (headings, lists, bold/italic, code, links). Keep the renderer wrapped in a small `<MarkdownText source={...} />` component so the policy lives in one place.

### 10. Delete

`DeleteRecipeButton` opens a confirm dialog; on confirm calls `deleteRecipe`, which cascades sections → steps → step_paints → notes → photos and triggers Storage cleanup (handled in `03-recipe-photos`). Redirect to `/recipes` with a toast.

### 11. Visibility

Same pattern as palettes: private by default. The form copy makes "Public means the URL is shareable" explicit.

### 12. Navigation

Add "Recipes" to authenticated nav next to "Palettes" and "Collection".

### 13. Manual QA checklist

- Sign in, hit `/recipes` — empty state with CTA
- Click "New recipe" — lands on `/recipes/{id}/edit` with default title
- Add a section, rename it, add three steps, edit titles + instructions
- Drag-reorder sections — persists on refresh
- Drag-reorder steps within a section — persists
- Toggle the recipe public; sign out; load `/recipes/{id}` — renders publicly
- Sign back in, link a palette to the recipe — chip shows; read view shows the palette's swatch strip
- Delete a section — its steps disappear too; positions stay coherent
- Delete the recipe — confirm, redirect, toast
- Hit someone else's `/recipes/{id}/edit` — 404
- `npm run build` + `npm run lint`

## Risks & Considerations

- **Inline-edit save policy**: Saving on blur is convenient but can feel surprising on slow connections. If QA complaints surface, switch to explicit per-card "Save" buttons; the action signatures don't need to change.
- **Cascading deletes**: Deleting a section cascades to steps and step_paints; deleting a step cascades to step_paints, notes, and photos attached to that step. Confirm dialogs for sections and steps must call out what they take with them.
- **Drag identity**: Section ids are uuids in the schema, so DnD ids are already stable; no slot-id workaround needed.
- **Markdown XSS**: Use a maintained renderer (`react-markdown` strips raw HTML by default). Don't add `rehype-raw`. The sanitization story stays in `MarkdownText`.
- **Optimistic step saves while reordering**: If a user is editing a step's title while another step is being reordered, the optimistic state could get fiddly. Keep edits and reorders in separate `useTransition` queues; if a reorder fails it shouldn't roll back unrelated edits.
- **Dependency on Epic 11 for shared deps**: dnd-kit and `react-markdown` (if not already present) ship in whichever feature lands first. Coordinate so we don't bump versions in flight.

## Notes

- Per-step paints, photos, and notes have empty placeholder states in this feature so the builder is usable end-to-end immediately. As the next features ship, those slots get real UIs.
- The recipe URL `/recipes/{id}` is the canonical share URL once the recipe is public. The community feed and discovery page (Epic 7 follow-ups) consume this.

## Implementation Plan

### Overview

Depends on `00-recipe-schema` landing first. This feature delivers the user-facing CRUD shell: a "My recipes" dashboard, an empty-recipe creator, a hydrated read view, and a builder that manages sections + steps with drag-and-drop. We follow the recently shipped palettes route split: private surfaces under `/user/recipes/*` and public detail/dashboard analogs under `/recipes/*`. The builder mirrors `PaletteBuilder` exactly — a single client component that composes `<RecipeForm>`, `<RecipeSectionList>`, `<RecipeNoteList>` placeholder slot, and `<DeleteRecipeButton>`. Drag/drop reuses `@dnd-kit` and the same two-phase optimistic-rollback pattern from `palette-paint-list.tsx` and `reorder-palette-paints.ts`. Per-step paint pickers, photos, and notes are stubbed here as placeholder components so the doc 02/03/04 implementations slot in without re-litigating layout.

### Module changes

| Path | Kind | Purpose |
|------|------|---------|
| `src/modules/recipes/actions/add-recipe-section.ts` | new | Append section at `position = max + 1` |
| `src/modules/recipes/actions/update-recipe-section.ts` | new | Patch title only |
| `src/modules/recipes/actions/delete-recipe-section.ts` | new | Delete + normalize sibling positions; cascades to steps |
| `src/modules/recipes/actions/reorder-recipe-sections.ts` | new | Two-phase reorder (mirrors `reorder-palette-paints.ts`) |
| `src/modules/recipes/actions/add-recipe-step.ts` | new | Append step at `position = max + 1` within section |
| `src/modules/recipes/actions/update-recipe-step.ts` | new | Patch title, technique, instructions |
| `src/modules/recipes/actions/delete-recipe-step.ts` | new | Delete + normalize sibling positions |
| `src/modules/recipes/actions/reorder-recipe-steps.ts` | new | Two-phase reorder within section |
| `src/modules/recipes/services/recipe-service.ts` | modify | Add helpers: `addSection`, `updateSection`, `deleteSection`, `setSections`, `addStep`, `updateStep`, `deleteStep`, `setSteps` (atomic position-replace pattern via inline transaction or new RPCs) |
| `src/modules/recipes/components/recipe-card.tsx` | new | Dashboard tile — title, cover image fallback, section/step count, updated label, public chip |
| `src/modules/recipes/components/recipe-card-grid.tsx` | new | Card grid; mirrors `palette-card-grid.tsx` |
| `src/modules/recipes/components/recipe-detail.tsx` | new | Read-only render: header card + summary + sections + steps |
| `src/modules/recipes/components/recipe-form.tsx` | new | Title + summary (`MarkdownEditor`) + isPublic checkbox + palette combobox; bound to `updateRecipe` via `useActionState` |
| `src/modules/recipes/components/recipe-builder.tsx` | new | Orchestrates form + section list + delete button |
| `src/modules/recipes/components/recipe-section-list.tsx` | new | Client component: dnd-kit `DndContext` + `SortableContext` for sections; mirrors `palette-paint-list.tsx` |
| `src/modules/recipes/components/recipe-section-card.tsx` | new | One section: editable title (inline; saves on blur via `updateRecipeSection`), step list, "Add step" button, delete affordance |
| `src/modules/recipes/components/recipe-step-list.tsx` | new | Per-section step DnD wrapper |
| `src/modules/recipes/components/recipe-step-card.tsx` | new | Step body editor; placeholder mounts for `<RecipeStepPaintPlaceholder>`, photos, notes (filled in by docs 02/03/04) |
| `src/modules/recipes/components/recipe-step-paint-placeholder.tsx` | new | "Add paints in step paints feature" stub |
| `src/modules/recipes/components/delete-recipe-button.tsx` | new | Confirm dialog wrapper around `deleteRecipe` |
| `src/modules/recipes/components/recipe-empty-state.tsx` | new | Owner / guest empty states (mirrors `palette-empty-state.tsx`) |
| `src/modules/recipes/components/recipe-palette-combobox.tsx` | new | Lists user's palettes via the palette client service; updates `recipes.palette_id` |
| `src/modules/recipes/utils/format-recipe-updated-label.ts` | new | "Updated 3 days ago" — copy of `format-palette-updated-label.ts` |
| `src/modules/recipes/utils/reorder-array.ts` | new | Generic reorder; alternative: import from `@/modules/palettes/utils/reorder-array` (cross-module imports are allowed per `CLAUDE.md`). Plan: import from palettes; do not duplicate. |
| `src/components/site-nav` (or equivalent) | modify | Add "Recipes" link to authenticated nav |
| `package.json` | modify (maybe) | `@dnd-kit/core`, `@dnd-kit/sortable` already present (Epic 11 shipped them). `react-markdown` already covered by `src/modules/markdown/` — no new deps. |

### Database changes

None new in this doc — the schema and `set_updated_at` triggers ship in 00. If `setSections` / `setSteps` need an atomic position-replace RPC for parity with `replace_palette_paints`, add `replace_recipe_sections(p_recipe_id, p_rows)` and `replace_recipe_steps(p_section_id, p_rows)` migrations as a follow-on; otherwise the actions can do client-side renumber + per-row update inside a transaction via `supabase.rpc`. Recommend: include both RPCs in the 00 migration (note added there).

### Route / page changes

| Path | Kind | Purpose |
|------|------|---------|
| `src/app/user/recipes/page.tsx` | new | "My recipes" dashboard; redirects to `/sign-in?next=/user/recipes` for anon; renders `<RecipeCardGrid>` |
| `src/app/user/recipes/new/route.ts` | new | POST → `createRecipe` → redirect to `/user/recipes/{id}/edit` (mirrors `palettes/new/route.ts`) |
| `src/app/user/recipes/[id]/edit/page.tsx` | new | Builder; loads `getRecipeById`, 404 if not owner; renders `<RecipeBuilder>` |
| `src/app/recipes/[id]/page.tsx` | new | Public read view; `notFound()` if not public and not owner; renders `<RecipeDetail>` |
| `src/app/recipes/[id]/edit/page.tsx` | new | Owner-aware redirect to `/user/recipes/{id}/edit` (mirrors `palettes/[id]/edit/page.tsx`) for bookmark continuity |

Per `CLAUDE.md`, all four pages are thin: auth check + service call + delegate to module components. `pageMetadata({ title, description, path, noindex })` is used for static metadata; OG tags land in 05.

### Step-by-step ordering

1. Add the eight section/step server actions; each loads via service, mutates, normalizes positions, revalidates `/user/recipes`, `/recipes`, `/user/recipes/{id}/edit`, `/recipes/{id}`.
2. Extend `recipe-service.ts` with section + step CRUD helpers; if including `replace_recipe_sections` / `replace_recipe_steps` RPCs, wire them here.
3. Build `<RecipeForm>` (form-only, no card chrome) and `<RecipePaletteCombobox>`. Form posts to `updateRecipe`.
4. Build `<RecipeStepCard>` with placeholder slots for paints/photos/notes.
5. Build `<RecipeStepList>` with dnd-kit; copy the seedSlots/latestConfirmedRef rollback pattern from `palette-paint-list.tsx`. Wire to `reorderRecipeSteps`.
6. Build `<RecipeSectionCard>` with inline-edit title, "Add step" button, embedded `<RecipeStepList>`, delete affordance.
7. Build `<RecipeSectionList>` with dnd-kit at the section level. Wire to `reorderRecipeSections`.
8. Build `<RecipeBuilder>` composing form + section list + delete button.
9. Build `<RecipeDetail>`: read-only render of header, summary (via `MarkdownRenderer`), sections + steps. Each step renders empty placeholder slots for paints/photos/notes.
10. Build `<RecipeCard>` and `<RecipeCardGrid>` for the dashboard. Card prefers cover photo URL, falls back to a generated swatch / placeholder.
11. Build `<DeleteRecipeButton>` with confirm dialog (reuse the same dialog primitive as `delete-palette-button.tsx`).
12. Add the four route pages and the `/user/recipes/new` POST route.
13. Update authenticated site nav to include "Recipes".
14. Manual QA per the checklist; `npm run build` and `npm run lint`.

### Risks & considerations

- **Route convention drift**: existing palettes split is `/user/palettes` (private) + `/palettes` (public catalog + detail). The doc as written says `/recipes` for the dashboard. I am implementing the new convention (`/user/recipes` private; `/recipes` public detail). This deliberately diverges from the doc's `Routes` table — flag for review before implementing. Public browse lives at `/recipes/browse` per 05; until 05 ships, `/recipes` (no id) can either redirect to `/recipes/browse` or 404.
- **Inline-edit save policy**: same risk as palettes — saving on blur is convenient but can surprise on slow networks. Keep actions small and idempotent; if QA pushes back, swap to an explicit per-card "Save" button without changing action signatures.
- **DnD rollback isolation**: section reorder and step reorder run in separate `useTransition` queues so a failed step reorder doesn't roll back unrelated section edits.
- **Palette combobox data path**: list uses the palettes client service (`@/modules/palettes/services/palette-service.client`). Cross-module import per `CLAUDE.md` is allowed.
- **Step-numbering display**: `1.1`, `1.2` etc. computed client-side from section+step `position`. Recompute after every reorder.
- **`/recipes/[id]/edit` legacy URL**: keep as an owner-aware redirect (matches the palettes pattern in `src/app/palettes/[id]/edit/page.tsx`).
- **Markdown XSS**: use the existing `<MarkdownRenderer>` and `<MarkdownEditor>` from `@/modules/markdown/` — no `rehype-raw`, no new sanitization story.
- **Dashboard cover photo**: until 03 ships, `coverPhotoUrl` is always null and the card renders a fallback. Don't block on 03.

### Out of scope

- Per-step paint picker UI (02).
- Photo upload + cover selection (03).
- Note authoring + display (04).
- Public browse, search, OG tags, share UI (05).
- Drag-to-move steps **between** sections — out of scope; v1 reorders only within a section.
