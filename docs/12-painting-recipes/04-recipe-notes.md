# Recipe Notes — Multiple Notes Per Step and Per Recipe

**Epic:** Painting Recipes
**Type:** Feature
**Status:** Todo
**Branch:** `feature/recipe-notes`
**Merge into:** `v1/feature/paint-recipes`

## Summary

Let users attach an arbitrary number of free-form notes to a recipe and to each step. A note is a small markdown-rendered body — useful for captions, callouts, lessons learned, mistakes to avoid, or commentary that doesn't belong in the step's main `instructions` field. Notes are stored in `recipe_notes` (already created in `00-recipe-schema`), ordered, and rendered both in the builder and on the read view.

The user's request specifically called out "I should be able to add as many notes as I want" — this feature delivers exactly that.

## Acceptance Criteria

- [ ] The builder has a "Notes" panel at the recipe level: add, edit, reorder, delete
- [ ] Each step in the builder has a "Notes" panel: add, edit, reorder, delete
- [ ] Notes accept markdown (same renderer as `summary` and `instructions` from `01-recipe-builder`)
- [ ] Notes auto-save on blur with optimistic UI
- [ ] Notes can be reordered via drag/drop
- [ ] Read view renders recipe-level notes as a callout block under the summary, and step-level notes as small callouts inside each step
- [ ] Notes have no character limit beyond the schema's max (5000)
- [ ] Deleting a note prompts a small confirm before destroying content
- [ ] `npm run build` and `npm run lint` pass with no errors

## Module additions

```
src/modules/recipes/
├── actions/
│   ├── add-recipe-note.ts             NEW
│   ├── update-recipe-note.ts          NEW
│   ├── delete-recipe-note.ts          NEW
│   └── reorder-recipe-notes.ts        NEW
└── components/
    ├── recipe-note-list.tsx           NEW — DnD wrapper; mounts in builder + step card
    ├── recipe-note-card.tsx           NEW — single editable note (markdown editor + preview)
    └── recipe-note-display.tsx        NEW — read-only render for the detail view
```

## Key Files

| Action | File                                                                | Description                                                              |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Create | `src/modules/recipes/actions/add-recipe-note.ts`                    | Append a new note to a recipe or step parent                             |
| Create | `src/modules/recipes/actions/update-recipe-note.ts`                 | Update note body                                                         |
| Create | `src/modules/recipes/actions/delete-recipe-note.ts`                 | Delete note + normalize positions                                        |
| Create | `src/modules/recipes/actions/reorder-recipe-notes.ts`               | Two-phase position update                                                |
| Create | `src/modules/recipes/components/recipe-note-list.tsx`               | DnD wrapper around `RecipeNoteCard`s                                     |
| Create | `src/modules/recipes/components/recipe-note-card.tsx`               | Markdown editor with toggle to preview; auto-saves on blur               |
| Create | `src/modules/recipes/components/recipe-note-display.tsx`            | Read-only markdown render for the detail page                            |
| Modify | `src/modules/recipes/components/recipe-builder.tsx`                 | Mounts a recipe-level `<RecipeNoteList>`                                 |
| Modify | `src/modules/recipes/components/recipe-step-card.tsx`               | Mounts a step-level `<RecipeNoteList>`                                   |
| Modify | `src/modules/recipes/components/recipe-detail.tsx`                  | Renders notes via `<RecipeNoteDisplay>` in both contexts                 |

## Implementation

### 1. Actions

The `recipe_notes` table uses an XOR check (`recipe_id` XOR `step_id`). Actions take a discriminated `parent` union to keep the API explicit:

```ts
type NoteParent = { kind: 'recipe'; recipeId: string } | { kind: 'step'; stepId: string }

addRecipeNote(parent: NoteParent, body: string): { id: string; position: number }
updateRecipeNote(noteId: string, patch: { body: string }): void
deleteRecipeNote(noteId: string): void
reorderRecipeNotes(parent: NoteParent, orderedNoteIds: string[]): void
```

`addRecipeNote` reads the current max `position` for that parent and inserts at `max + 1`. Validation: body must be non-empty, ≤5000 chars.

### 2. Note card

`RecipeNoteCard` is a small daisyUI card with two modes:

- **Edit mode** (default when first added or clicked): `<textarea>` with markdown source
- **Preview mode**: `<MarkdownText source={body} />`

A small "Edit" / "Preview" toggle in the corner switches between modes. Auto-save on blur of the textarea calls `updateRecipeNote`. Pending state shows a subtle "Saving..." indicator.

`RecipeNoteList` wraps notes in a `<SortableContext>` (dnd-kit) for reorder. Reuse the same DnD setup as palette/recipe step reorders.

### 3. Read view

`RecipeNoteDisplay` is a small markdown render block with a left border accent (e.g., `border-l-4 border-primary`) that distinguishes it from the main step instructions. Each note is its own block; multiple notes stack vertically with consistent spacing.

`RecipeDetail` renders recipe-level notes after the summary block and before the sections. Each step's notes render at the bottom of that step's body, after the step instructions and (eventually) above its photos.

### 4. Builder integration

`recipe-builder.tsx`:

- Adds a "Notes" section between the recipe form and the section list
- Mounts `<RecipeNoteList parent={{ kind: 'recipe', recipeId }} notes={recipe.notes} />`
- An "Add note" button below the list creates a new note in edit mode

`recipe-step-card.tsx`:

- Adds a "Notes" subsection below the step's main fields, above the photos panel (or above the placeholder if `03-recipe-photos` hasn't shipped yet)
- Mounts `<RecipeNoteList parent={{ kind: 'step', stepId }} notes={step.notes} />`

### 5. Manual QA checklist

- Add a recipe-level note — appears immediately, persists on refresh
- Add several notes to a step — each renders inline; ordering matches add order
- Reorder notes via drag — persists
- Edit a note's markdown (e.g. `**bold**`, `- list`, `[link](https://example.com)`) — preview renders correctly; XSS injection (e.g. raw `<script>` tags) is escaped
- Delete a note — confirm fires; content gone after delete
- Recipe with many notes (10+) renders without layout issues
- Read view shows notes correctly at both recipe and step levels
- `npm run build` + `npm run lint`

## Risks & Considerations

- **Markdown XSS**: Use the same `MarkdownText` component from `01-recipe-builder`. Don't allow raw HTML. Ensure links open in a new tab (`rel="noopener noreferrer" target="_blank"`).
- **Auto-save UX**: Same trade-off as recipe step inline edits. Saving on blur is convenient but can be surprising on a slow network. Keep the action small; show "Saving..." inline; on failure roll back to the previously saved body and surface a toast.
- **Empty notes**: Reject empty bodies on save. If a user saves an empty body, treat it as a delete (with confirm) rather than persisting an empty row.
- **Note vs. step instructions vs. step paint note**: Three places to write text on a step — easy to confuse. The UI labeling needs to be clear: instructions = "what to do," notes = "additional commentary," paint note = "context about this specific paint." Keep the visual styling distinct (different borders/colors).
- **Reorder across parents**: Out of scope. A note belongs to one parent; moving requires delete + re-add.

## Notes

- Schema and indexes ship in `00-recipe-schema`. This feature is purely UI + actions on top.
- This is the smallest feature in the recipe epic — keep it tight.

## Implementation Plan

### Overview

Depends on 00 (schema) and 01 (builder + read view). Smallest feature in the epic — adds four server actions, a list component, a card component (with edit/preview toggle), and a read-only display component, then mounts them inside `<RecipeBuilder>` (recipe-level) and `<RecipeStepCard>` (step-level). Reuses the same `MarkdownEditor` and `MarkdownRenderer` components from `@/modules/markdown/` that the palette description and recipe summary already use. Reorder uses the same dnd-kit pattern as everywhere else. The XOR parent (recipe-or-step) is enforced via a discriminated `parent` union in action signatures and the schema-level CHECK from 00.

### Module changes

| Path | Kind | Purpose |
|------|------|---------|
| `src/modules/recipes/actions/add-recipe-note.ts` | new | Inserts at `position = max + 1`; accepts `parent: { kind: 'recipe', recipeId } \| { kind: 'step', stepId }` and `body` |
| `src/modules/recipes/actions/update-recipe-note.ts` | new | Patches body; rejects empty (caller should call delete instead) |
| `src/modules/recipes/actions/delete-recipe-note.ts` | new | Deletes + normalizes sibling positions |
| `src/modules/recipes/actions/reorder-recipe-notes.ts` | new | Two-phase reorder; mirrors `reorder-palette-paints` exactly, scoped by parent |
| `src/modules/recipes/components/recipe-note-list.tsx` | new | DnD wrapper around `RecipeNoteCard`s; mounts in builder + step card |
| `src/modules/recipes/components/recipe-note-card.tsx` | new | Single editable note with Edit/Preview toggle; auto-saves on blur |
| `src/modules/recipes/components/recipe-note-display.tsx` | new | Read-only render for the detail view; left-border accent style |
| `src/modules/recipes/components/recipe-builder.tsx` | modify | Mounts recipe-level `<RecipeNoteList parent={{ kind: 'recipe', recipeId }} />` between form and section list |
| `src/modules/recipes/components/recipe-step-card.tsx` | modify | Mounts step-level `<RecipeNoteList>` below the step body, above photos |
| `src/modules/recipes/components/recipe-detail.tsx` | modify | Renders `<RecipeNoteDisplay>` blocks at recipe level (after summary) and at step level (after instructions) |

No new types are required — `RecipeNote` ships in 00. No service-layer changes required if action bodies query/mutate directly via the Supabase client; alternatively expose `noteService.add/update/delete/list` helpers in `recipe-service.ts` for parity. Recommend exposing them for consistency with palettes patterns.

### Database changes

None. Schema, RLS, and indexes ship in 00.

### Route / page changes

None.

### Step-by-step ordering

1. Implement the four actions; each verifies ownership via the service, mutates, revalidates `/user/recipes/{id}/edit` and `/recipes/{id}`. Validation: body 1–5000 chars after trimming.
2. Build `<RecipeNoteCard>` with two modes — `<MarkdownEditor>` in edit mode, `<MarkdownRenderer>` in preview. Toggle button in the corner. Auto-save on textarea blur via `updateRecipeNote`.
3. Build `<RecipeNoteList>` — dnd-kit `DndContext` + `SortableContext`; two-phase optimistic reorder with rollback. "Add note" button below the list creates a new note in edit mode (blank body, calls `addRecipeNote` only when first blur saves with content; or pre-create with empty body and let validation gate the save).
4. Build `<RecipeNoteDisplay>` — read-only markdown render with `border-l-4 border-primary pl-4` for distinction.
5. Modify `<RecipeBuilder>` and `<RecipeStepCard>` to mount `<RecipeNoteList>`.
6. Modify `<RecipeDetail>` to render note blocks at the appropriate spots.
7. Manual QA per checklist; `npm run build` + `npm run lint`.

### Risks & considerations

- **Markdown XSS**: reuse `<MarkdownRenderer>` from `@/modules/markdown/` — it already enforces no raw HTML. Don't duplicate sanitization logic. Open external links in a new tab.
- **Auto-save UX**: same trade-off as recipe step inline edits. Show "Saving…" inline; on failure roll back to the previously saved body and toast the error.
- **Empty notes**: reject empty bodies on save. If a user clears a note's text, treat it as a delete (with confirm). Implementation: client checks for empty before calling `updateRecipeNote`; if empty, prompts a confirm to delete instead.
- **Confusion with three text fields per step**: step has `instructions`, `notes[]`, and `step_paints[].note`. The labels in the UI must distinguish them clearly: instructions = "what to do," notes = "additional commentary," paint note = "context about this paint." Visual styling already differs (instructions is the main step text; notes have the left-border accent; paint notes are inline tiny muted text).
- **Reorder**: dnd-kit pattern is identical to palette/section/step reorder — copy from those.
- **Cross-parent reorder**: out of scope for v1.
- **Optimistic add UX**: when a user clicks "Add note," show the new card immediately in edit mode with a placeholder id; only `addRecipeNote` runs on first save. If the user clicks "Add note" multiple times without saving, allow it but cap at e.g. 5 unsaved drafts.

### Out of scope

- Cross-parent move (recipe-level note → step-level note).
- Tagging / categorizing notes.
- Pinning a note to the top of a step.
- Per-note visibility (all notes inherit the recipe's `is_public`).
