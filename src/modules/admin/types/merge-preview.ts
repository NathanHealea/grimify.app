/**
 * Preview data returned by the `merge_preview` RPC before executing a merge.
 */
export type MergePreview = {
  /** Display name of the source profile being merged away. */
  source_display_name: string
  /** Display name of the target profile that will remain. */
  target_display_name: string
  /** Number of role assignments that will transfer to the target. */
  roles_to_transfer: number
  /** Whether the source bio will copy to the target (target bio is null). */
  will_copy_bio: boolean
  /** Whether the source avatar will copy to the target (target avatar is null). */
  will_copy_avatar: boolean
}
