import type { SupabaseClient } from '@supabase/supabase-js'

/** The Supabase storage bucket name for army icons. */
const BUCKET = 'army-icons'

/**
 * Uploads an army icon file to the `army-icons` Supabase storage bucket.
 *
 * The file is stored at `{armyId}/{filename}` inside the bucket. If a file
 * already exists at that path it is replaced (`upsert: true`).
 *
 * @param supabase - An authenticated Supabase client (server-side).
 * @param armyId - The UUID of the army (used as the storage folder).
 * @param file - The image file to upload (from a form `<input type="file">`).
 * @returns The public URL of the uploaded icon, or `null` on failure.
 */
export async function uploadArmyIcon(
  supabase: SupabaseClient,
  armyId: string,
  file: File,
): Promise<string | null> {
  const path = `${armyId}/${file.name}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/png',
  })

  if (error) {
    console.error('[uploadArmyIcon] upload error:', error.message)
    return null
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Deletes an army icon from the `army-icons` storage bucket.
 *
 * Extracts the storage path from the icon's public URL by stripping the bucket
 * prefix. No-ops silently if deletion fails (e.g. file already removed).
 *
 * @param supabase - An authenticated Supabase client (server-side).
 * @param iconUrl - The full public URL of the icon to delete.
 */
export async function deleteArmyIcon(
  supabase: SupabaseClient,
  iconUrl: string,
): Promise<void> {
  // Extract path after the bucket name segment.
  const marker = `/${BUCKET}/`
  const idx = iconUrl.indexOf(marker)
  if (idx === -1) return

  const storagePath = iconUrl.slice(idx + marker.length)
  await supabase.storage.from(BUCKET).remove([storagePath])
}
