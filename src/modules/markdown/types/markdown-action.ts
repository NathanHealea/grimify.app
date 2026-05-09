/**
 * Snapshot of the textarea state that a markdown action consumes.
 *
 * @remarks
 * Mirrors the relevant properties of an `HTMLTextAreaElement`. Keeping the
 * input as a plain object lets the action utilities stay pure and unit-testable
 * without reaching for the DOM.
 */
export type MarkdownActionInput = {
  /** Current full text content of the textarea. */
  value: string
  /** Caret start offset (or selection range start). */
  selectionStart: number
  /** Caret end offset (or selection range end). */
  selectionEnd: number
}

/**
 * Output of a markdown action — the new textarea value plus the caret /
 * selection range to restore after the mutation is applied.
 */
export type MarkdownActionResult = {
  /** New full text content to assign to the textarea. */
  value: string
  /** Caret start offset to set after the mutation. */
  selectionStart: number
  /** Caret end offset to set after the mutation. */
  selectionEnd: number
}

/**
 * Pure transform that maps a textarea snapshot to a new snapshot.
 *
 * @param input - See {@link MarkdownActionInput}.
 * @returns The new textarea state — see {@link MarkdownActionResult}.
 */
export type MarkdownAction = (input: MarkdownActionInput) => MarkdownActionResult
