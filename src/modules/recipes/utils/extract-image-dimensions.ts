/**
 * Pixel dimensions extracted from an image file.
 */
export type ImageDimensions = {
  /** Image width in pixels. */
  widthPx: number
  /** Image height in pixels. */
  heightPx: number
}

/**
 * Reads the natural pixel dimensions of an image `File` using
 * `createImageBitmap`. Returns `null` if the bitmap cannot be decoded
 * (e.g., unsupported codec, corrupt file) so callers can persist the
 * photo with `width_px` / `height_px` left null.
 *
 * @param file - The image file to inspect. Must be a decodable image.
 * @returns A {@link ImageDimensions} object, or `null` if decoding fails.
 */
export async function extractImageDimensions(file: File): Promise<ImageDimensions | null> {
  if (typeof createImageBitmap !== 'function') {
    return null
  }
  try {
    const bitmap = await createImageBitmap(file)
    const dimensions: ImageDimensions = {
      widthPx: bitmap.width,
      heightPx: bitmap.height,
    }
    bitmap.close()
    return dimensions
  } catch {
    return null
  }
}
