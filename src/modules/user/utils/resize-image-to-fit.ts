/**
 * Scales an image File/Blob down to fit within maxWidth × maxHeight using the
 * Canvas API. The aspect ratio is preserved; images already within bounds are
 * returned without upscaling. Output is always JPEG at 85% quality.
 *
 * Must only be called from client-side code — it depends on `document`,
 * `HTMLCanvasElement`, and `URL.createObjectURL`.
 *
 * @param file - The source image File or Blob.
 * @param maxWidth - Maximum output width in pixels.
 * @param maxHeight - Maximum output height in pixels.
 * @returns A Promise resolving to a JPEG Blob at the scaled dimensions.
 */
export function resizeImageToFit(file: File | Blob, maxWidth: number, maxHeight: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = document.createElement('img')

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1)
      const width = Math.round(img.width * ratio)
      const height = Math.round(img.height * ratio)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get 2D canvas context.'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Canvas toBlob returned null.'))
          }
        },
        'image/jpeg',
        0.85,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image for resizing.'))
    }

    img.src = objectUrl
  })
}
