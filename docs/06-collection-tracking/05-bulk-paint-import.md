# Bulk Paint Import

**Epic:** Collection Tracking
**Type:** Feature
**Status:** Todo
**Branch:** `feature/collection-paint-import`
**Merge into:** `main`

## Summary

Let authenticated users paste a newline-delimited list of paint descriptions (e.g. `Army Painter Warpaints Fanatic Greenskin`) and have the system match each line to a paint in the database. The user reviews the proposed matches — replacing or removing any row — and finalizes the import. Paints already in the collection are reported as ignored duplicates; failures are surfaced in a per-row result tally.

## Acceptance Criteria

- [ ] Authenticated users can reach a `Import paints` action from the My Collection page
- [ ] The import page accepts a multi-line text block, one paint per line
- [ ] Blank lines and lines exceeding 240 characters are dropped from the parsed list with a warning
- [ ] The system matches each line to the best paint in the database using a brand/line/name scoring algorithm (case-insensitive, punctuation-tolerant)
- [ ] Each parsed row is shown in a review table with one of four statuses: **Exact**, **Fuzzy**, **No match**, **Duplicate** (already in collection)
- [ ] Fuzzy and no-match rows render a clearly visible warning chip
- [ ] The review row's matched paint card shows brand, product line, name, and hex swatch
- [ ] The user can click `Replace` on any row to open a paint search modal and pick a different paint
- [ ] The user can remove a row from the import with a `Remove` action
- [ ] When the user clicks `Import N paints`, only rows with a `selectedPaintId` and status `Exact` or `Fuzzy` are inserted
- [ ] Paints already in the user's collection are skipped server-side and counted under "Ignored"
- [ ] The finalize action returns a summary: `{ imported: number; ignored: number; failed: number; failedRows: ImportRow[] }`
- [ ] A success screen renders the tally and a "Back to collection" link; failed rows are listed with their original input and a per-row error
- [ ] Unauthenticated users hitting the route are redirected to `/sign-in?next=/collection/import`
- [ ] `npm run build` and `npm run lint` pass with no errors

## Domain Modules

Primary module: **`collection`** (owns the import UI, parse + finalize server actions, and import-specific types).

Secondary module: **`paints`** (owns the matching algorithm — extends `match-service.ts` with a name/brand/line scorer and a `searchPaintsForReplace` action used by the replace modal).

```
src/modules/collection/
├── actions/
│   ├── parse-and-match-import.ts        # parse text, score-match each line, return ImportRow[]
│   └── finalize-paint-import.ts         # bulk-insert selected rows, return ImportSummary
├── components/
│   ├── paint-import-form.tsx            # client — textarea + submit (Step 1: paste)
│   ├── paint-import-review.tsx          # client — review table + finalize button (Step 2)
│   ├── paint-import-row.tsx             # client — single row: status chip, paint card, replace/remove
│   ├── paint-import-replace-dialog.tsx  # client — modal hosting PaintCombobox for replacement
│   └── paint-import-summary.tsx         # client — success screen with imported/ignored/failed tally
├── services/
│   └── (extends collection-service.ts with bulkAddPaints + filterAlreadyOwned)
├── types/
│   ├── import-row.ts                    # ImportRow shape
│   ├── import-match-status.ts           # discriminated union: 'exact' | 'fuzzy' | 'none' | 'duplicate'
│   └── import-summary.ts                # finalize action return shape
├── utils/
│   └── parse-paint-import-input.ts      # split, trim, drop blanks/over-length lines
└── validation.ts                        # parseImportInput + parseFinalizeInput schemas

src/modules/paints/
├── actions/
│   └── search-paints-for-replace.ts     # thin wrapper over paint-service.searchPaintsUnified, keyed for modal use
└── services/
    └── (extends match-service.ts with scorePaintMatch + matchPaintFromLine)
```

Route page:

- `src/app/collection/import/page.tsx` — auth-guard, shell that renders a client-side flow component (`<PaintImportFlow>`) which orchestrates Form → Review → Summary states. The page stays thin.

## Database

No schema changes. The feature writes to the existing `user_paints` table (see [00-manage-collection.md](./00-manage-collection.md)). RLS already enforces `auth.uid() = user_id` on INSERT.

## Implementation Plan

### 1. Input parsing — `src/modules/collection/utils/parse-paint-import-input.ts`

Pure utility (no React, no DB). Exports `parsePaintImportInput(raw: string): ParsedImportLine[]`.

```ts
export type ParsedImportLine = {
  /** Zero-indexed line number from the original input (for stable React keys + error mapping). */
  index: number
  /** Raw line as the user typed it, trimmed. */
  rawInput: string
  /** `true` when the line was dropped (blank or over-length). */
  skipped: boolean
  /** Drop reason, present only when `skipped` is `true`. */
  skipReason?: 'empty' | 'too-long'
}
```

Rules:

- Split on `\n` and `\r\n`.
- Trim each line. Drop pure whitespace lines (`skipped: true`, `skipReason: 'empty'`).
- Reject lines whose length exceeds **240 chars** (`skipped: true`, `skipReason: 'too-long'`). This caps the matcher's work per row and protects against pasted garbage.
- Deduplicate identical normalized lines (lowercase + collapsed whitespace) — keep the first occurrence; mark later ones as skipped with a new reason `'duplicate-line'`. The UI surfaces this so the user knows their paste had repeats.
- Hard-cap parsed lines at **200** entries. Excess lines are returned with `skipped: true`, `skipReason: 'over-limit'` so the UI can warn. 200 covers a typical hobbyist's full collection without risking a runaway match request.

JSDoc the function and the type. Each `skipReason` value gets a one-liner in the type's JSDoc.

### 2. Match scoring — `src/modules/paints/services/match-service.ts`

Extend the existing match service with name-string matching (the file already exists for color-distance matching). Add two methods:

#### `scorePaintMatch(input: string, candidate: PaintWithRelations): number`

Returns a score `0.0 – 1.0`. Algorithm:

1. **Normalize** both `input` and the candidate's "full label" — `${brand.name} ${product_line.name} ${paint.name}`. Normalization: lowercase, strip diacritics (`String.normalize('NFD').replace(/[̀-ͯ]/g, '')`), replace any run of non-alphanumeric chars with a single space, trim.
2. **Tokenize** by spaces.
3. **Token-set ratio** — for each candidate, compute three weighted components against the normalized input tokens:
   - `brand_score` (weight 0.30): fraction of the candidate brand's tokens present in input.
   - `line_score` (weight 0.20): fraction of the product line's tokens present in input.
   - `name_score` (weight 0.50): fraction of the paint name's tokens present in input. Strict substring fallback when token overlap is 0 but the normalized paint name appears as a contiguous substring of the input — gives 0.6 * weight (handles `Vallejo Black 70.950` where `70.950` is the brand_paint_id, not in the name tokens).
4. Sum the weighted components → final score in `[0, 1]`.

Thresholds (constants exported from `match-service.ts`):

- `EXACT_MATCH_THRESHOLD = 0.95` — score at/above this is treated as an exact match. In practice this requires every name token plus at least one brand/line token to be present.
- `FUZZY_MATCH_THRESHOLD = 0.55` — score in `[0.55, 0.95)` is a fuzzy (best-guess) match.
- Below `0.55` → no match.

#### `matchPaintFromLine(line: string, candidates: PaintMatchCandidate[]): { paint: PaintMatchCandidate | null; score: number; status: ImportMatchStatus }`

`PaintMatchCandidate` is a minimal projection — `{ id, name, hex, brand_paint_id, paint_type, product_line: { name, brand: { name } } }`. Iterate the candidate list, compute scores, return the top scorer with its status bucket. Ties are broken by alphabetical paint name (stable).

The matcher accepts the candidate list as an argument rather than fetching internally — the caller fetches once and reuses the list across all input lines (one DB read per import, not one per line).

JSDoc both methods. Include `@remarks` explaining the weight choices and threshold rationale.

#### Why a JS-side matcher and not Postgres full-text search?

- The catalog is ~5–10k paints; a single in-memory pass is fast (< 50ms).
- A weighted brand/line/name scorer is much easier to tune in TS than as a tsvector + ranking SQL query.
- Avoids adding a Postgres extension dependency and a migration.

### 3. Types — `src/modules/collection/types/`

#### `import-match-status.ts`

```ts
/**
 * Per-row match outcome for a bulk paint import.
 *
 * - `exact`     — matcher score >= 0.95; auto-selected, no warning.
 * - `fuzzy`     — matcher score in [0.55, 0.95); auto-selected with a warning chip.
 * - `none`      — matcher score < 0.55; no paint pre-selected, row blocks finalize.
 * - `duplicate` — match found but already in the user's collection; will be skipped server-side.
 */
export type ImportMatchStatus = 'exact' | 'fuzzy' | 'none' | 'duplicate'
```

#### `import-row.ts`

```ts
export type ImportRow = {
  /** Stable client key; mirrors the original input line index. */
  id: string
  /** Original input as typed, trimmed. */
  rawInput: string
  /** Match status — drives the UI warning state and whether the row contributes to finalize. */
  status: ImportMatchStatus
  /** Score from the matcher [0.0, 1.0]; useful for display ("87% match"). */
  score: number
  /** The candidate paint the matcher (or the user, via replace) chose. Null when status is `none`. */
  selectedPaint: PaintMatchCandidate | null
}
```

#### `import-summary.ts`

```ts
export type ImportSummary = {
  imported: number
  ignored: number          // duplicates skipped server-side
  failed: number
  /** Rows the finalize action could not insert, with their original input and error. */
  failedRows: Array<{ id: string; rawInput: string; error: string }>
}
```

JSDoc each type with field-level descriptions. Cross-link `ImportRow` → `ImportMatchStatus` via `{@link}`.

### 4. Validation — `src/modules/collection/validation.ts`

Two schemas:

- `parseImportInputSchema` — `{ raw: string }` with `raw.trim().length > 0` and `raw.length <= 50_000` (covers 200 lines × 240 chars + slack).
- `finalizeImportSchema` — `{ rows: Array<{ id: string; rawInput: string; selectedPaintId: string }> }` with a max length of 200. The action only sees the rows the user intends to import (no-match rows and removed rows are stripped client-side).

Use `zod` (matches the rest of the codebase). Export the inferred input types.

### 5. Service additions — `src/modules/collection/services/collection-service.ts`

Add two methods to the existing `createCollectionService`:

- `filterAlreadyOwned(userId: string, paintIds: string[]): Promise<Set<string>>` — single `select('paint_id').eq('user_id', userId).in('paint_id', paintIds)`, return as a `Set`.
- `bulkAddPaints(userId: string, paintIds: string[]): Promise<{ insertedCount: number; failed: string[] }>` — single `insert` with `{ user_id, paint_id }` rows. Use `onConflict('user_id,paint_id').ignoreDuplicates()` so existing rows don't error the entire batch. Pre-filter the input through `filterAlreadyOwned` first so the caller can report "ignored" separately from "actually inserted." Returns `failed` as the list of `paint_id`s the DB rejected (rare — only on RLS / FK failures).

Hard-cap `paintIds.length` at 200 in both methods.

### 6. Parse + match action — `src/modules/collection/actions/parse-and-match-import.ts`

`'use server'`. Signature:

```ts
export async function parseAndMatchImport(raw: string): Promise<{
  rows: ImportRow[]
  skipped: ParsedImportLine[]   // surface the skipped lines so the UI can render warnings
  error?: string
}>
```

Flow:

1. Validate input via `parseImportInputSchema`. Return `{ rows: [], skipped: [], error: ... }` on failure.
2. Resolve current user via `createClient()` + `auth.getUser()`. Return `{ error: 'You must be signed in.' }` if absent.
3. `parsePaintImportInput(raw)` → `{ parsedLines, skippedLines }`.
4. Fetch the candidate pool once via a new paint service helper `listMatchCandidates()` — returns the minimal projection (id, name, hex, brand_paint_id, paint_type, product_line.name, product_line.brand.name) for all non-discontinued paints. Add to `paint-service.ts`. Reuses the color-wheel-paints pagination loop pattern to bypass the 1000-row cap.
5. For each non-skipped parsed line, call `matchPaintFromLine(line, candidates)`.
6. Fetch the user's existing collection IDs (`filterAlreadyOwned` against the set of selected paint IDs) — for matched rows whose paint is already owned, override `status` to `'duplicate'`.
7. Return `{ rows, skipped: skippedLines }`.

**No writes.** The action is pure read-side; the user reviews before any insert happens.

JSDoc covers side effects (`@remarks` notes "No database writes; review-only").

### 7. Finalize action — `src/modules/collection/actions/finalize-paint-import.ts`

`'use server'`. Signature:

```ts
export async function finalizePaintImport(
  rows: Array<{ id: string; rawInput: string; selectedPaintId: string }>
): Promise<ImportSummary>
```

Flow:

1. Validate via `finalizeImportSchema`. On failure return `{ imported: 0, ignored: 0, failed: rows.length, failedRows: rows.map(...) }`.
2. Resolve user; reject anonymous.
3. Dedupe `selectedPaintId` across the incoming rows (the user could pick the same replacement for two lines).
4. `filterAlreadyOwned(userId, paintIds)` → `ownedSet`. Rows whose paint is in `ownedSet` count toward `ignored`.
5. The remaining paint IDs go through `bulkAddPaints`. The returned `insertedCount` becomes `imported`; the returned `failed` array gets mapped back to the originating `rows` (via the `selectedPaintId → row` map built in step 3) so `failedRows` carries the user-facing `rawInput` and a generic "Could not add to collection." error.
6. Call `revalidatePath('/collection')` and `revalidatePath('/collection/paints')` so the dashboard reflects the new totals on navigation.
7. Return the `ImportSummary`.

Action never throws — all failures map to `failed` / `failedRows` entries.

### 8. Search-for-replace action — `src/modules/paints/actions/search-paints-for-replace.ts`

`'use server'`. Thin wrapper:

```ts
export async function searchPaintsForReplace(query: string): Promise<PaintMatchCandidate[]>
```

Delegates to `paintService.searchPaintsUnified({ query, scope: 'all', limit: 20 })` and projects each row down to the same `PaintMatchCandidate` shape used by the matcher and the UI. Exists primarily to keep the modal's network layer consistent with the rest of the import flow (same shape in, same shape out).

`searchPaintsUnified` already exists — no service changes required for this action.

### 9. Components — `src/modules/collection/components/`

#### `paint-import-form.tsx` (Step 1: Paste)

Client component. Props: `onParsed(result: { rows: ImportRow[]; skipped: ParsedImportLine[] }): void`.

- Single `<textarea>` (uses the `Textarea` UI primitive) with a `name="raw"`, ~12 rows tall, `monospace` font, placeholder showing one example line per brand.
- Submit button: `Match paints` — disabled when the textarea is empty or while `useTransition` is pending.
- On submit: call `parseAndMatchImport(raw)`; on error, surface inline; on success, hand the result to `onParsed`.
- Below the textarea, a collapsible "Tips" panel: input format (one paint per line, brand + line + name), the 240-char per-line limit, the 200-row total limit.

#### `paint-import-review.tsx` (Step 2: Review)

Client component. Props: `initialRows: ImportRow[]`, `skipped: ParsedImportLine[]`, `onComplete(summary: ImportSummary): void`.

- Local state: `rows: ImportRow[]` (initialized from `initialRows`).
- Top bar: counts by status (`12 exact · 3 fuzzy · 2 no match · 1 duplicate`) and the **Import N paints** primary button. `N` = count of rows where `status === 'exact' || status === 'fuzzy'` and `selectedPaint != null`.
- Renders one `<PaintImportRow>` per row.
- If `skipped.length > 0`, renders a `Skipped lines` collapsible above the table listing rawInput + reason for each.
- Finalize button calls `finalizePaintImport(...)` with the filtered rows, then calls `onComplete(summary)`.

Disable the finalize button when the importable row count is `0`.

#### `paint-import-row.tsx`

Client component. Props: `row: ImportRow`, `onReplace(newPaint: PaintMatchCandidate): void`, `onRemove(): void`.

Layout:

- Left column: original `rawInput` in a smaller muted font.
- Center column: matched paint card — hex swatch, paint name, `brand • product line`, paint_type chip. When `status === 'none'`, render a placeholder ("No match found — replace or remove").
- Right column: status chip (`Exact` green soft, `Fuzzy` amber outline, `No match` red outline, `Duplicate` neutral), action buttons (`Replace`, `Remove`).
- Warning chip for `fuzzy` and `none` rows; helper text under fuzzy: "Best guess match — confirm before importing." Helper text under duplicate: "Already in your collection — will be skipped."

The replace action opens `<PaintImportReplaceDialog>`.

#### `paint-import-replace-dialog.tsx`

Client component. Props: `open: boolean`, `onOpenChange(open: boolean): void`, `onSelect(paint: PaintMatchCandidate): void`, `initialQuery?: string`.

- Uses the existing `Dialog` UI primitive.
- Internally hosts a debounced search input that calls `searchPaintsForReplace`. Results render as a list of `PaintMatchCandidate` rows; clicking one fires `onSelect` and closes the dialog.
- Pre-fill the input with the row's `rawInput` so the user starts with a useful query.

#### `paint-import-summary.tsx` (Step 3: Done)

Client component. Props: `summary: ImportSummary`.

- Big tally card: `Imported · Ignored · Failed`.
- If `failedRows.length > 0`, render a collapsible table of failed rows with their `rawInput` and `error`.
- "Back to collection" link → `/collection`.
- "Import more" link → resets the parent flow to Step 1.

#### Flow orchestrator (inline in the route page or a `paint-import-flow.tsx` client component)

State machine: `'form' | 'review' | 'summary'`. Stores the current `rows`, `skipped`, and `summary` between transitions. The route page renders this single client component to keep navigation state in one place.

### 10. Route page — `src/app/collection/import/page.tsx`

```tsx
// auth: middleware enforces auth; redirect guard is for type narrowing only
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/sign-in?next=/collection/import')
```

Renders:

- `<Main>`
- `<PageHeader><PageTitle>Import paints</PageTitle></PageHeader>`
- `<PaintImportFlow />`

Add `metadata` via `pageMetadata({ title: 'Import paints', path: '/collection/import', noindex: true })`.

### 11. Collection page entry point

Update `src/modules/collection/components/collection-stats.tsx` (or add a new toolbar in `src/app/collection/page.tsx`) to include an `Import paints` link button next to the "Add paints" affordance. Style as `.btn .btn-outline .btn-sm`. The link goes to `/collection/import`.

### 12. UX states

- **Empty textarea + submit:** disabled state.
- **Matching in-flight:** spinner on the submit button, textarea stays editable.
- **Match completed, all `none`:** review screen still renders, but the import button is disabled and a hint banner explains "No matches were found — try simplifying your paint names or use the replace action."
- **All rows are duplicates:** import button disabled with a hint "All paints in this list are already in your collection."
- **Replace dialog with no results:** muted "No paints found" placeholder.
- **Finalize in-flight:** import button shows a spinner; review rows are non-interactive.
- **Server error from finalize action:** treated as a row-level failure (the action never throws — falls back to the summary screen with `failed > 0`).

### 13. Duplicate handling

Duplicates are detected at two points:

1. **During match (review screen):** rows whose matched paint is already in `user_paints` are marked `status: 'duplicate'` so the user sees them upfront and can choose to replace or remove.
2. **During finalize (server-side):** `filterAlreadyOwned` runs again against the final selected paint IDs. This catches the race where the user added the same paint in another tab between match and finalize. Duplicates always count under `ignored`, never `failed`.

The server is the source of truth — the client display is a hint, not enforcement.

### 14. Error reporting (final tally)

The summary screen renders three pill counters:

- **Imported** — `summary.imported`
- **Ignored (duplicate)** — `summary.ignored`
- **Failed** — `summary.failed`, with the `failedRows` table beneath when non-zero

For shipping, the failed-row error is always the same generic string (`"Could not add to collection."`). Future enhancement: surface the underlying RLS / FK error.

### 15. Verification

- Manual paste-test with a mix of formats: `Citadel Base Abaddon Black`, `Vallejo Game Color Sick Green`, `Army Painter Warpaints Fanatic Greenskin`, plus deliberate typos and gibberish, plus a paint already owned, plus 250+ lines to exercise the over-limit cap.
- Confirm the replace modal returns to the row with the new paint and the status is forced to `'fuzzy'` (manual override never counts as `'exact'`).
- Run `npm run build` and `npm run lint`.

## Dependencies

- **Depends on** `00-manage-collection.md` — uses `user_paints` and the existing collection service.
- **Compatible with** `02-collection-dashboard.md` — surfaces a new entry point on the collection page.

## Risks & Considerations

- **Matcher false positives.** A score of 0.95 still allows one tokenset to be partial; a paint named `Black` could match `Citadel Base Abaddon Black` if the brand tokens line up. Mitigation: weight name highest (0.5) and require the full normalized paint name (or a contiguous substring fallback) to appear before granting an `'exact'` status. Tune by hand with a sample list during implementation.
- **Catalog growth.** Fetching every paint into memory per import works at today's scale (~5–10k rows). If the catalog grows past ~50k, move the matcher to a Postgres tsvector + ranking query. The interface (`matchPaintFromLine`) is shaped so the implementation can be swapped without touching the route, action, or UI.
- **Replace modal performance.** `searchPaintsUnified` is already debounced via the existing component pattern; the modal should debounce the action call by 250ms to match the rest of the codebase.
- **Duplicate detection race.** Solved by running `filterAlreadyOwned` server-side at finalize time, but worth surfacing in the summary as `ignored` (not silently dropping).
- **Large input handling.** 200-row cap, 240-char per-line cap, 50k-char overall cap — three independent ceilings, all enforced both in validation and in the parser. A user with 800 paints can run two imports.
- **`useTransition` vs `useFormStatus`.** The review screen has two concurrent actions (replace, finalize). Use `useTransition` per action; do not share a single pending state.
- **Idempotency.** `bulkAddPaints` relies on `onConflict('user_id,paint_id').ignoreDuplicates()` so a double-click on `Import` does not throw. The post-conditions are identical to a single click.
- **RLS coverage.** `user_paints` already has INSERT policy `auth.uid() = user_id`; the bulk action passes `user_id` explicitly on every row, but the policy is the authoritative guard.
- **No support for CSV/structured input in v1.** Plain-text, one paint per line. If users ask, a future enhancement can detect comma- or tab-separated columns and parse `brand,line,name` explicitly.

## Notes

- The match algorithm constants (`EXACT_MATCH_THRESHOLD`, `FUZZY_MATCH_THRESHOLD`, the per-component weights) live in `match-service.ts` so they can be tuned in one place — JSDoc them as the canonical knobs.
- The replace modal uses the existing `PaintCombobox`-style UX patterns rather than introducing a new search surface — keeps the visual language consistent with palette editing.
- The import flow does not write to `user_paints.notes`. A future enhancement can add a "Note" column to the review row that maps onto `notes` at insert time.
