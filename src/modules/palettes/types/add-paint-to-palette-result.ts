/**
 * Result returned by the `addPaintToPalette` server action.
 *
 * Discriminated by the presence of `error`. The optional `code` field lets
 * callers distinguish a duplicate rejection from a generic failure without
 * parsing the human-readable `error` string. On success, `paletteName` is
 * surfaced for toast messaging.
 */
export type AddPaintToPaletteResult =
  | {
      /** Indicates a successful add. */
      ok: true
      /** Name of the palette the paint was added to (for toast feedback). */
      paletteName: string
    }
  | {
      /** Human-readable error message, suitable for surfacing in a toast. */
      error: string
      /**
       * Machine-readable error code:
       * - `'duplicate'` — paint already exists in the target palette
       * - `'auth'` — caller is not signed in
       * - `'not_found'` — palette does not exist
       * - `'forbidden'` — caller does not own the palette
       * - `'unknown'` — any other failure (RPC, network, etc.)
       */
      code?: 'duplicate' | 'auth' | 'not_found' | 'forbidden' | 'unknown'
    }

/**
 * Result returned by the `addPaintsToPalette` bulk server action.
 *
 * Behaves like {@link AddPaintToPaletteResult} for the success / generic-error
 * paths, with an additional `duplicateIds` array on duplicate rejections so the
 * caller can name the offending paints in feedback.
 */
export type AddPaintsToPaletteResult =
  | {
      /** Indicates a successful add. */
      ok: true
    }
  | {
      /** Human-readable error message, suitable for surfacing in a toast. */
      error: string
      /** See {@link AddPaintToPaletteResult} for code semantics. */
      code?: 'duplicate' | 'auth' | 'not_found' | 'forbidden' | 'unknown'
      /** Paint IDs that were already present in the palette (when `code === 'duplicate'`). */
      duplicateIds?: string[]
    }
