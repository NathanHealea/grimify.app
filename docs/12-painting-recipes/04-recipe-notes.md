# Recipe Notes — Multiple Notes Per Step and Per Recipe

**Epic:** Painting Recipes
**Type:** Feature
**Status:** Todo
**Branch:** `feature/recipe-notes`
**Merge into:** `v1/main`

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
