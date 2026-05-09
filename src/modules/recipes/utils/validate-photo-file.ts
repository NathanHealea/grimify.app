/** Maximum allowed photo size in bytes (10 MB). */
export const RECIPE_PHOTO_MAX_BYTES = 10 * 1024 * 1024

/** MIME types accepted for recipe photo uploads. */
export const RECIPE_PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/**
 * Result of a {@link validatePhotoFile} check.
 *
 * `ok: true` is paired with no other fields; `ok: false` carries a
 * user-facing `error` message that can be surfaced via a toast.
 */
export type ValidatePhotoFileResult = { ok: true } | { ok: false; error: string }

/**
 * Validates a `File` selected by the user before upload.
 *
 * Accepts JPEG, PNG, and WebP up to 10 MB. The MIME type is matched against
 * {@link RECIPE_PHOTO_ALLOWED_TYPES}; size against
 * {@link RECIPE_PHOTO_MAX_BYTES}.
 *
 * @param file - File picked from a file input or drag/drop.
 * @returns A discriminated result; `error` carries a human-readable message.
 */
export function validatePhotoFile(file: File): ValidatePhotoFileResult {
  if (!RECIPE_PHOTO_ALLOWED_TYPES.includes(file.type as (typeof RECIPE_PHOTO_ALLOWED_TYPES)[number])) {
    return {
      ok: false,
      error: `Unsupported file type. Use JPEG, PNG, or WebP.`,
    }
  }
  if (file.size > RECIPE_PHOTO_MAX_BYTES) {
    return {
      ok: false,
      error: `File is too large. Maximum size is 10 MB.`,
    }
  }
  return { ok: true }
}
