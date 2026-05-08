# Recipe Photos — Upload, Link, Cover Selection

**Epic:** Painting Recipes
**Type:** Feature
**Status:** Todo
**Branch:** `feature/recipe-photos`
**Merge into:** `v1/main`

## Summary

Let users upload an arbitrary number of photos to a recipe — both at the recipe level (overall progress, finished model) and at the step level (work-in-progress shots for that step). Photos are stored in the `recipe-photos` Supabase Storage bucket (created in `00-recipe-schema`), linked from the `recipe_photos` table, and rendered in the builder and read view as a grid with lightbox previews. The user can pick a cover photo for the recipe.

## Acceptance Criteria

- [ ] The builder has a "Photos" panel at the recipe level: upload, drag/drop reorder, delete, choose cover
- [ ] Each step in the builder has a "Photos" panel: upload, reorder, delete
- [ ] Uploads accept JPEG, PNG, and WebP up to 10 MB
- [ ] Uploads show progress, succeed atomically, and fail with a clear error toast
- [ ] Photos render as a thumbnail grid; clicking opens a lightbox with arrow navigation
- [ ] The recipe-level cover photo is selectable from any recipe-level photo (not step photos); it shows on the dashboard card and at the top of the read view
- [ ] Each photo can have a caption (≤200 chars) edited inline
- [ ] Read view renders recipe-level photos as a gallery near the top and step photos inline within each step
- [ ] If a recipe is public, its photos are publicly readable; if private, only the owner can see them
- [ ] Deleting a photo removes both the DB row and the Storage object; deleting a recipe/step cascades and cleans Storage
- [ ] `npm run build` and `npm run lint` pass with no errors

## Module additions

```
src/modules/recipes/
├── actions/
│   ├── upload-recipe-photo.ts             NEW — server action; signs an upload then writes the row
│   ├── update-recipe-photo.ts             NEW — caption, position
│   ├── delete-recipe-photo.ts             NEW — deletes row + Storage object
│   ├── reorder-recipe-photos.ts           NEW — works for both recipe and step parents
│   └── set-recipe-cover-photo.ts          NEW — updates `recipes.cover_photo_id`
├── components/
│   ├── recipe-photo-uploader.tsx          NEW — drag/drop zone + file picker
│   ├── recipe-photo-grid.tsx              NEW — thumbnail grid with reorder
│   ├── recipe-photo-thumbnail.tsx         NEW — single tile (caption, delete, set-cover, drag)
│   ├── recipe-photo-lightbox.tsx          NEW — overlay viewer with arrow navigation
│   └── recipe-photo-caption-editor.tsx    NEW — inline-edit caption
├── services/
│   └── (modify) recipe-service.ts         add storage helpers: signUploadUrl, deleteStorageObject
└── utils/
    ├── compose-photo-url.ts               NEW — turns storage_path into a public URL
    └── validate-photo-file.ts             NEW — type + size client-side guard
```

## Key Files

| Action | File                                                                | Description                                                              |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Create | `src/modules/recipes/actions/upload-recipe-photo.ts`                | Validates, uploads to Storage, inserts `recipe_photos` row               |
| Create | `src/modules/recipes/actions/update-recipe-photo.ts`                | Updates caption                                                          |
| Create | `src/modules/recipes/actions/delete-recipe-photo.ts`                | Removes row + Storage object                                             |
| Create | `src/modules/recipes/actions/reorder-recipe-photos.ts`              | Two-phase position update                                                |
| Create | `src/modules/recipes/actions/set-recipe-cover-photo.ts`             | Validates the photo belongs to this recipe (recipe-level), updates FK    |
| Create | `src/modules/recipes/components/recipe-photo-uploader.tsx`          | Upload UI                                                                |
| Create | `src/modules/recipes/components/recipe-photo-grid.tsx`              | Grid (DnD wrapper)                                                       |
| Create | `src/modules/recipes/components/recipe-photo-thumbnail.tsx`         | Single thumbnail                                                         |
| Create | `src/modules/recipes/components/recipe-photo-lightbox.tsx`          | Modal viewer                                                             |
| Create | `src/modules/recipes/components/recipe-photo-caption-editor.tsx`    | Inline caption editor                                                    |
| Create | `src/modules/recipes/utils/compose-photo-url.ts`                    | `composePhotoUrl(storagePath)` → public URL via `getPublicUrl`           |
| Create | `src/modules/recipes/utils/validate-photo-file.ts`                  | Returns `{ ok, error? }`                                                 |
| Modify | `src/modules/recipes/components/recipe-builder.tsx`                 | Adds recipe-level photos panel                                           |
| Modify | `src/modules/recipes/components/recipe-step-card.tsx`               | Adds step-level photos panel                                             |
| Modify | `src/modules/recipes/components/recipe-detail.tsx`                  | Renders galleries on the read view                                       |

## Implementation

### 1. Upload flow

Client-side flow (kept simple, no signed URLs for v1):

1. User picks a file via `<RecipePhotoUploader>` (or drops one)
2. `validatePhotoFile` checks type + size
3. The component uses the **client-side** Supabase Storage SDK directly to upload to `recipe-photos/{user_id}/{recipe_id}/{generated_id}.{ext}` — Storage policies enforce ownership
4. On success, the client calls server action `uploadRecipePhoto({ storagePath, parent: { kind: 'recipe' | 'step', id }, captions, dimensions })` to insert the `recipe_photos` row
5. On failure (either Storage upload or DB insert), roll back: if the row insert failed but the Storage object exists, delete it

We could route uploads through a server action with a signed URL, but the project already uses RLS-secured client uploads elsewhere — confirm with `src/modules/auth/` patterns and pick the same approach. The doc above assumes client-side Storage SDK with policy enforcement.

### 2. Storage policies (already shipped in `00-recipe-schema`)

`00-recipe-schema` installed:

- INSERT/UPDATE/DELETE on `recipe-photos` bucket: only when the path's `{user_id}` matches `auth.uid()`
- SELECT on objects: gated by joining `recipe_photos` row to its parent recipe's `is_public`

Verify these policies during this feature's QA — the table was created in 00, but downloading public images is the path that's hardest to test until photos exist.

### 3. Photo grid

`<RecipePhotoGrid>`:

- Renders a CSS grid of `<RecipePhotoThumbnail>`s
- Wraps in `<DndContext>` + `<SortableContext>` for reorder (same pattern as palette reorder)
- Empty state: "No photos yet — drag and drop to upload"
- Renders the `<RecipePhotoUploader>` zone at the end of the grid

`<RecipePhotoThumbnail>`:

- Shows the thumbnail
- Hover overlay with: drag handle, "set as cover" (recipe-level only), delete, caption-edit toggle
- Click thumbnail (not the overlay) opens the lightbox at this position

`<RecipePhotoLightbox>`:

- Full-screen overlay; arrow keys + ←/→ buttons navigate
- Esc closes
- Caption renders below the image (read-only here)

### 4. Cover photo

The cover photo is recipe-level only. Selecting one calls `setRecipeCoverPhoto(recipeId, photoId)` which validates the photo belongs to the recipe (not a step) and updates `recipes.cover_photo_id`.

The recipe dashboard card prefers the cover photo; falls back to the first recipe-level photo; falls back to no image.

### 5. Step photos

Each `<RecipeStepCard>` mounts a smaller-format `<RecipePhotoGrid>` at the bottom (max 3 columns, smaller thumbnails). Same upload + reorder mechanics.

### 6. Read view

- Recipe-level photos render as a gallery near the top, after the summary
- Each section's steps render their photos inline at the bottom of the step card
- Read view doesn't show drag handles, delete buttons, or "set cover" — just thumbnails + lightbox

### 7. Deletion + Storage cleanup

- `deleteRecipePhoto(photoId)`:
  1. Read the row to get `storage_path`
  2. Delete the row
  3. Delete the Storage object
  4. Normalize sibling positions

- Cascade-deleting via `deleteRecipe` or `deleteRecipeStep` doesn't auto-clean Storage — Postgres cascades only delete DB rows. Add a server-side cleanup step in `deleteRecipe` (and `deleteRecipeSection`/`deleteRecipeStep`) that:
  1. Reads all `storage_path`s under the parent before the cascade runs
  2. Runs the cascade
  3. Issues a Storage delete batch for the captured paths

Document this clearly in `recipe-service.ts` — without it, deleted recipes leave orphaned Storage objects.

### 8. URL composition

Use Supabase Storage's `getPublicUrl` for `is_public` recipes. For private recipes, use `createSignedUrl` with a short TTL (e.g., 1 hour) when the owner views — `composePhotoUrl(storagePath, { isPublic })` encapsulates this.

The read view always knows whether the parent recipe is public and passes the flag in.

### 9. Manual QA checklist

- Upload a photo to a recipe — thumbnail appears, gallery on read view shows it
- Upload three photos, reorder via drag — order persists
- Set a non-cover photo as cover — dashboard card updates
- Delete a photo — gone from grid + Storage (verify in Supabase Studio)
- Upload a 12 MB image — rejected client-side with clear message
- Upload a `.gif` — rejected (unsupported type)
- Upload a step-level photo — appears under that step in the builder and read view
- Make recipe public, sign out, hit `/recipes/{id}` — photos load
- Make recipe private, sign out, attempt direct Storage URL — fails (storage policy)
- Delete the entire recipe — Storage objects also gone (no orphans)
- `npm run build` + `npm run lint`

## Risks & Considerations

- **Storage cleanup on cascade**: Postgres cascades don't touch Storage. Without explicit cleanup we accumulate orphaned objects. Centralize the cleanup logic in `recipe-service.ts` so every deletion path uses it.
- **Private recipe photos**: Signed URLs solve the read story, but they expire — refreshing the page should compose new URLs. Avoid baking signed URLs into HTML caches.
- **Image dimensions**: Storing `width_px`/`height_px` lets us avoid layout shift on the read view (use `next/image` with `width` and `height`). The client extracts dimensions before upload via a hidden `<img>` or `createImageBitmap`.
- **Image transforms**: For v1 we serve original images. If page weight becomes an issue, plug in Supabase image transforms (resize on read) — `composePhotoUrl` is the single point to add the `?width=…&quality=…` parameters.
- **Polymorphic photos**: The XOR check (recipe XOR step parent) lives in the schema. Server actions accept a discriminated `parent` union to keep the API explicit.
- **Reorder across parents**: Out of scope. A photo always belongs to one parent; "move from step to recipe" requires deleting and re-uploading. If the demand surfaces, add a `move-recipe-photo.ts` action that updates `recipe_id`/`step_id` (within the same owner).
- **Bulk upload**: A user pasting 30 photos at once should be supported — accept multi-file input, queue uploads sequentially, show per-file progress, don't fail the batch on a single failure.

## Notes

- This feature ships heavy UI plus Storage logistics. Pace it as the largest feature in the recipe epic.
- The Storage bucket and policies were created in `00-recipe-schema`. If they need adjustments, prefer adding a follow-up migration over editing the original.

## Implementation Plan

### Overview

Depends on 00 (schema, bucket, storage policies) and 01 (builder + detail). This is the first feature in the codebase to use Supabase Storage — there is no existing `supabase.storage` usage in `src/`, so this doc establishes the pattern. Uploads happen client-side using the browser Supabase client (RLS + storage policies enforce ownership); a server action then inserts the `recipe_photos` row. Recipe-level photos render in a panel inside `<RecipeBuilder>`; step-level photos render at the bottom of `<RecipeStepCard>`. The read view renders galleries with a lightbox. Storage cleanup is centralized in `recipe-service.ts` so every deletion path (single photo, step delete, section delete, recipe delete) cleans up consistently.

### Module changes

| Path | Kind | Purpose |
|------|------|---------|
| `src/modules/recipes/actions/upload-recipe-photo.ts` | new | After client upload completes, inserts the `recipe_photos` row; rolls back the Storage object on insert failure |
| `src/modules/recipes/actions/update-recipe-photo.ts` | new | Patches caption (and position via reorder action) |
| `src/modules/recipes/actions/delete-recipe-photo.ts` | new | Reads row, deletes row, deletes Storage object, normalizes sibling positions |
| `src/modules/recipes/actions/reorder-recipe-photos.ts` | new | Two-phase reorder; works for both `parent: { kind: 'recipe' }` and `{ kind: 'step' }` |
| `src/modules/recipes/actions/set-recipe-cover-photo.ts` | new | Validates the photo's `recipe_id` matches and is recipe-level (not step), updates `recipes.cover_photo_id` |
| `src/modules/recipes/components/recipe-photo-uploader.tsx` | new | Drag/drop zone + file input; client-side validates and uploads |
| `src/modules/recipes/components/recipe-photo-grid.tsx` | new | DnD grid wrapper around `RecipePhotoThumbnail`s; renders `<RecipePhotoUploader>` at the end of the grid |
| `src/modules/recipes/components/recipe-photo-thumbnail.tsx` | new | Single tile (drag handle + caption + delete + set-cover overlay) |
| `src/modules/recipes/components/recipe-photo-lightbox.tsx` | new | Modal overlay with arrow navigation; closes on Esc |
| `src/modules/recipes/components/recipe-photo-caption-editor.tsx` | new | Inline-edit caption, auto-save on blur |
| `src/modules/recipes/components/recipe-builder.tsx` | modify | Mounts recipe-level `<RecipePhotoGrid parent={{ kind: 'recipe', recipeId }} />` |
| `src/modules/recipes/components/recipe-step-card.tsx` | modify | Mounts step-level `<RecipePhotoGrid parent={{ kind: 'step', stepId }} />` |
| `src/modules/recipes/components/recipe-detail.tsx` | modify | Renders a recipe-level gallery near the top; step photos inline at the bottom of each step |
| `src/modules/recipes/components/recipe-card.tsx` | modify | Prefers cover photo URL, falls back to first recipe-level photo URL, falls back to placeholder |
| `src/modules/recipes/services/recipe-service.ts` | modify | Adds `signUploadPath`, `deleteStorageObject`, `deleteStorageObjectsForRecipe`, `deleteStorageObjectsForStep`. Modifies `deleteRecipe` to capture all `storage_path`s before cascade and batch-delete after. |
| `src/modules/recipes/utils/compose-photo-url.ts` | new | `composePhotoUrl(client, storagePath, { isPublic })` — uses `getPublicUrl` for public, `createSignedUrl` (1h TTL) for private |
| `src/modules/recipes/utils/validate-photo-file.ts` | new | Returns `{ ok: true }` or `{ ok: false, error }`; checks JPEG/PNG/WebP and ≤10MB |
| `src/modules/recipes/utils/extract-image-dimensions.ts` | new | Reads width/height from a `File` via `createImageBitmap` |

### Database changes

None new. Bucket + policies + table + indexes + RLS ship in 00. If a policy adjustment surfaces during QA, ship a follow-up migration `<ts>_recipe_photos_storage_policy_fix.sql` rather than editing the 00 migration.

### Route / page changes

None. Mounts inside the existing recipe pages.

### Step-by-step ordering

1. Add `validate-photo-file.ts` and `extract-image-dimensions.ts` utilities.
2. Add `compose-photo-url.ts`. For public recipes use `supabase.storage.from('recipe-photos').getPublicUrl(path)`; for private use `createSignedUrl(path, 3600)`.
3. Extend `recipe-service.ts` with Storage helpers and the centralized cleanup methods. Modify `deleteRecipe` (currently from 00) to call `deleteStorageObjectsForRecipe` before the SQL delete. Add the step-level / section-level cleanup hooks for `deleteRecipeStep` / `deleteRecipeSection` from 01.
4. Implement the five actions. `upload-recipe-photo.ts` accepts `{ storagePath, parent: NoteParent-style discriminated union, captionInit?, width?, height? }`.
5. Build `<RecipePhotoUploader>`: client component using `'use client'`. Uses `@/lib/supabase/client` and calls `supabase.storage.from('recipe-photos').upload(...)`. On success, calls `uploadRecipePhoto` server action with the metadata. Shows per-file progress + error toasts (sonner).
6. Build `<RecipePhotoThumbnail>`: hover overlay with drag handle, "set as cover" (recipe-level only), delete, caption-edit. Click opens the lightbox.
7. Build `<RecipePhotoGrid>`: dnd-kit grid wrapper with `rectSortingStrategy`. Empty state + `<RecipePhotoUploader>` at the end.
8. Build `<RecipePhotoLightbox>`: full-screen modal with arrow navigation and Esc close.
9. Build `<RecipePhotoCaptionEditor>`: inline textarea, auto-saves on blur.
10. Modify `<RecipeBuilder>` and `<RecipeStepCard>` to mount the grids.
11. Modify `<RecipeDetail>` to render galleries (read-only, lightbox-only).
12. Modify `<RecipeCard>` to prefer cover photo.
13. Manual QA per checklist; `npm run build` + `npm run lint`.

### Risks & considerations

- **First Storage usage in the app**: there is no existing `supabase.storage` reference in `src/`. This doc establishes the pattern. Other features (avatars, scheme uploads) may follow — keep the pattern simple and well-documented in `recipe-service.ts`.
- **Storage cleanup on cascade**: Postgres `ON DELETE CASCADE` only deletes DB rows. Without explicit cleanup, deleting a recipe leaves orphaned objects. Centralize in `recipe-service.ts.deleteRecipe` / `deleteRecipeStep` / `deleteRecipeSection` and document in JSDoc.
- **Private vs. public URL composition**: `getPublicUrl` returns immediately and works for any path; access is then enforced by storage policies. For private recipes, the policy denies anonymous access — owner must use `createSignedUrl`. `composePhotoUrl` encapsulates this; the caller must always pass `isPublic` correctly. Don't cache signed URLs across page loads.
- **RLS-secured client uploads**: client-side uploads are authenticated via the browser Supabase client; storage policies in 00 require the path's first segment to equal `auth.uid()`. Verify with manual QA.
- **Image dimensions**: store `width_px`/`height_px` so `next/image` can avoid layout shift. Extracted via `createImageBitmap` before upload.
- **Bulk uploads**: queue files sequentially (not parallel) to avoid spike load on Storage. Report per-file progress; don't fail the batch on a single failure.
- **OG image absolute URL** (relevant in 05): `getPublicUrl` already returns absolute URLs.
- **Polymorphic parent**: every action takes a discriminated union `parent: { kind: 'recipe', recipeId } | { kind: 'step', stepId }` to keep the XOR check explicit in TypeScript.
- **Cover photo invariants**: the `cover_photo_id` FK must point at a recipe-level photo (not step). Validate in `set-recipe-cover-photo.ts`.

### Out of scope

- Server-side image transforms / resizing (revisit when page weight becomes an issue; `composePhotoUrl` is the single point to add `?width=…` later).
- Moving photos between parents (recipe ↔ step). v1: delete + re-upload.
- Image cropping or in-app editing.
- A separate avatar / non-recipe Storage bucket (handled elsewhere if needed).
- EXIF stripping (rely on Supabase / browser defaults for v1).
