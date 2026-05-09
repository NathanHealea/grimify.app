'use client'

import { useId, useRef, useState, useTransition } from 'react'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { uploadRecipePhoto } from '@/modules/recipes/actions/upload-recipe-photo'
import { extractImageDimensions } from '@/modules/recipes/utils/extract-image-dimensions'
import { validatePhotoFile } from '@/modules/recipes/utils/validate-photo-file'
import type { RecipePhotoParent } from '@/modules/recipes/types/recipe-photo-parent'

const RECIPE_PHOTOS_BUCKET = 'recipe-photos'

function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && fromName.length <= 5) return fromName
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'bin'
}

/**
 * Drag-and-drop + file-picker zone for uploading recipe photos.
 *
 * Validates each file via {@link validatePhotoFile}, extracts dimensions
 * via {@link extractImageDimensions}, then uploads the blob directly
 * to Supabase Storage with the browser client. Storage policies
 * shipped in `00-recipe-schema` enforce that the path's first segment
 * matches `auth.uid()`. After each upload succeeds the component calls
 * {@link uploadRecipePhoto} to insert the matching `recipe_photos`
 * row; on row-insert failure the action removes the orphaned object.
 *
 * Files are processed sequentially so a single failure does not abort
 * the rest of the batch — each error surfaces a Sonner toast and the
 * loop continues.
 *
 * @param props.parent - Discriminated union identifying the photo's parent.
 * @param props.recipeId - The owning recipe UUID; used as the second
 *   path segment regardless of whether the parent is a recipe or step
 *   so cleanup-by-recipe and storage policies stay simple.
 * @param props.compact - When true, renders a smaller upload zone that
 *   matches the step-level grid's tighter tile size.
 */
export function RecipePhotoUploader({
  parent,
  recipeId,
  compact = false,
}: {
  parent: RecipePhotoParent
  recipeId: string
  compact?: boolean
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [isUploading, startUpload] = useTransition()

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Sign in required to upload photos.')
      return
    }

    setProgress({ done: 0, total: files.length })
    let succeeded = 0
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validation = validatePhotoFile(file)
      if (!validation.ok) {
        toast.error(`${file.name}: ${validation.error}`)
        setProgress({ done: i + 1, total: files.length })
        continue
      }

      const photoId = crypto.randomUUID()
      const ext = fileExtension(file)
      const storagePath = `${user.id}/${recipeId}/${photoId}.${ext}`

      const dimensions = await extractImageDimensions(file)
      const { error: uploadError } = await supabase.storage
        .from(RECIPE_PHOTOS_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })
      if (uploadError) {
        toast.error(`${file.name}: ${uploadError.message}`)
        setProgress({ done: i + 1, total: files.length })
        continue
      }

      const result = await uploadRecipePhoto({
        parent,
        storagePath,
        widthPx: dimensions?.widthPx ?? null,
        heightPx: dimensions?.heightPx ?? null,
      })
      if ('error' in result) {
        toast.error(`${file.name}: ${result.error}`)
        setProgress({ done: i + 1, total: files.length })
        continue
      }
      succeeded += 1
      setProgress({ done: i + 1, total: files.length })
    }

    if (succeeded > 0) {
      toast.success(
        `${succeeded} of ${files.length} photo${files.length === 1 ? '' : 's'} uploaded`,
      )
    }
    setProgress(null)
  }

  function handleSelect(filesList: FileList | null) {
    if (!filesList || filesList.length === 0) return
    const files = Array.from(filesList)
    startUpload(async () => {
      await uploadFiles(files)
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        handleSelect(e.dataTransfer?.files ?? null)
      }}
      className={[
        'flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-background text-center transition-colors',
        compact ? 'p-2 text-xs' : 'p-3 text-sm',
        isDragOver ? 'border-primary bg-primary/5' : 'hover:bg-muted/40',
        isUploading ? 'pointer-events-none opacity-70' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Upload className={compact ? 'size-4' : 'size-6'} aria-hidden />
      {progress ? (
        <span>
          Uploading {progress.done}/{progress.total}…
        </span>
      ) : compact ? (
        <span>Add photos</span>
      ) : (
        <>
          <span className="font-medium">Drop or click</span>
          <span className="text-xs text-muted-foreground">JPEG, PNG, WebP — 10 MB</span>
        </>
      )}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => handleSelect(e.target.files)}
        disabled={isUploading}
        className="sr-only"
      />
    </label>
  )
}
