/**
 * Visual feedback state for paint-to-group drag interactions.
 *
 * Held in the `groupDropState` React state of `PaletteGroupedPaintList`.
 * When `null`, no group has active drop feedback. When non-null, `groupId`
 * identifies the highlighted group and `kind` controls the ring color:
 * - `'hover'` — a dragged paint is over the group (blue ring)
 * - `'success'` — a paint was just added to the group (green ring, auto-clears after 800 ms)
 * - `'error'` — the drag was rejected, e.g. paint already in group (red ring, auto-clears after 800 ms)
 */
export type GroupDropState = { groupId: string; kind: 'hover' | 'success' | 'error' } | null
