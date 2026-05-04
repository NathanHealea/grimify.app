# Recipe Builder — Dashboard, Create/Edit, Sections and Steps

**Epic:** Painting Recipes
**Type:** Feature
**Status:** Todo
**Branch:** `feature/recipe-builder`
**Merge into:** `v1/main`

## Summary

Deliver the user-facing CRUD shell for recipes: a "My recipes" dashboard, a basic builder that lets the user edit title/summary/visibility, manage **sections**, manage **steps within sections**, drag/drop sections and steps, and a public detail view that renders the whole recipe top-to-bottom.

This feature delivers the **structural** builder. Per-step paint pickers live in `02-recipe-step-paints.md`; photos in `03-recipe-photos.md`; notes in `04-recipe-notes.md`. By the end of this feature a user can write the prose of a recipe with sections and steps and read it back on a public page.

## Acceptance Criteria

- [ ] `/recipes` lists the signed-in user's recipes as cards (title, cover image, section count, step count, updated)
- [ ] `/recipes/new` creates an empty recipe and redirects to its edit page
- [ ] `/recipes/[id]` is the read-only view; visible to anyone if `is_public`, owner-only otherwise
- [ ] `/recipes/[id]/edit` is the builder
- [ ] Builder edits title, summary, visibility (private/public), optional palette association
- [ ] Builder lets the user add, rename, reorder (drag/drop), and delete sections
- [ ] Within a section, the user can add, edit, reorder (drag/drop), and delete steps
- [ ] Each step has an editable title, technique, and instructions field
- [ ] Step **paints** are placeholder rows here ("Add paints in step paints feature"); actual editing comes in `02-recipe-step-paints.md`
- [ ] Read view renders sections as headings, steps as numbered subitems with technique/instructions/paint references; markdown rendering for `summary` and `instructions`
- [ ] Deleting a recipe confirms first, redirects to `/recipes` with a toast
- [ ] Unauthenticated users hitting `/recipes`, `/recipes/new`, or `/recipes/{id}/edit` are redirected to `/sign-in?next={path}`
- [ ] `npm run build` and `npm run lint` pass with no errors

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
