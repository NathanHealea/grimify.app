import type { SupabaseClient } from '@supabase/supabase-js'

/** Storage bucket that holds recipe photos. */
const RECIPE_PHOTOS_BUCKET = 'recipe-photos'

/** TTL (in seconds) used when minting signed URLs for private recipes. */
const PRIVATE_SIGNED_URL_TTL_SECONDS = 60 * 60

/**
 * Options controlling how {@link composePhotoUrl} resolves a URL.
 */
export type ComposePhotoUrlOptions = {
  /**
   * Whether the parent recipe is publicly visible. Public recipes use
   * `getPublicUrl`; private recipes mint a short-lived signed URL so the
   * owner (or other authorized viewers) can fetch the object.
   */
  isPublic: boolean
}

/**
 * Resolves a viewable URL for a recipe photo's `storage_path`.
 *
 * For public recipes this returns the deterministic public URL via
 * `getPublicUrl`. For private recipes it mints a signed URL via
 * `createSignedUrl` with a {@link PRIVATE_SIGNED_URL_TTL_SECONDS} TTL — short
 * enough that the URL should not be persisted across page loads.
 *
 * The single chokepoint here is also the place to plug in Supabase image
 * transforms (`?width=…&quality=…`) if page weight becomes a concern.
 *
 * @param supabase - Supabase client (server or browser).
 * @param storagePath - The `recipe_photos.storage_path` value.
 * @param options - URL resolution options. See {@link ComposePhotoUrlOptions}.
 * @returns A URL string, or `null` if a signed URL could not be minted.
 */
export async function composePhotoUrl(
  supabase: SupabaseClient,
  storagePath: string,
  options: ComposePhotoUrlOptions,
): Promise<string | null> {
  const bucket = supabase.storage.from(RECIPE_PHOTOS_BUCKET)
  if (options.isPublic) {
    return bucket.getPublicUrl(storagePath).data.publicUrl
  }
  const { data, error } = await bucket.createSignedUrl(storagePath, PRIVATE_SIGNED_URL_TTL_SECONDS)
  if (error || !data) {
    return null
  }
  return data.signedUrl
}
