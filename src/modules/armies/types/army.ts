/**
 * Represents a single army entry from the `armies` table.
 *
 * Armies are hierarchical: alliances (root) contain factions, which may
 * contain sub-factions. Root armies have `parent_id = null`; children carry
 * the UUID of their parent.
 *
 * `sort_order` is nullable — armies without an explicit order sort after those
 * with one (NULLS LAST in all queries).
 *
 * `icon_url` is nullable — set to a Supabase Storage public URL or any
 * external image URL when an icon has been uploaded.
 */
export type Army = {
  /** Primary key UUID. */
  id: string
  /** UUID of the parent army, or `null` for root alliances. */
  parent_id: string | null
  /** Display name of the army (1–100 characters). */
  name: string
  /** URL-safe slug unique within its level (globally for roots, per-parent for children). */
  slug: string
  /** Public URL of the army's icon image, or `null` if none has been set. */
  icon_url: string | null
  /** Explicit sort position, or `null` to fall after ordered entries. */
  sort_order: number | null
  /** ISO 8601 timestamp of when this row was created. */
  created_at: string
}
