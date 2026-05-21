'use client'

import { useEffect, useRef, useState, useTransition, type ChangeEvent } from 'react'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateAvatar } from '@/modules/user/actions/update-avatar'
import { resizeImageToFit } from '@/modules/user/utils/resize-image-to-fit'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/**
 * Avatar upload form for the profile edit page.
 *
 * Intercepts the file input change event to resize the selected image
 * client-side via the Canvas API (max 800 × 800 px) before submitting to the
 * {@link updateAvatar} server action. The live preview updates immediately on
 * file selection. Uses `useTransition` instead of `useActionState` so the file
 * can be processed before the server call.
 *
 * @param props.currentAvatarUrl - Current avatar URL to display as the initial preview.
 * @param props.displayName - Used to generate initials when no avatar is set.
 */
export function EditAvatarForm({
  currentAvatarUrl,
  displayName,
}: {
  currentAvatarUrl: string | null
  displayName: string
}) {
  const [isPending, startTransition] = useTransition()
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl)
  const [clientError, setClientError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const prevPreviewRef = useRef<string | null>(null)

  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)

  useEffect(() => {
    return () => {
      if (prevPreviewRef.current && prevPreviewRef.current !== currentAvatarUrl) {
        URL.revokeObjectURL(prevPreviewRef.current)
      }
    }
  }, [currentAvatarUrl])

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setClientError('Please select a JPEG, PNG, WebP, or GIF image.')
      return
    }

    setClientError(null)

    try {
      const blob = await resizeImageToFit(file, 800, 800)

      if (prevPreviewRef.current && prevPreviewRef.current !== currentAvatarUrl) {
        URL.revokeObjectURL(prevPreviewRef.current)
      }

      const url = URL.createObjectURL(blob)
      prevPreviewRef.current = url
      setPreviewUrl(url)
      setProcessedBlob(blob)
    } catch {
      setClientError('Failed to process the selected image. Please try again.')
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!processedBlob) return

    setServerError(null)
    const formData = new FormData()
    formData.append('avatar', processedBlob, 'avatar.jpg')

    startTransition(async () => {
      const result = await updateAvatar(null, formData)
      if (result?.error) {
        setServerError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={displayName}
            width={80}
            height={80}
            className="size-20 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="avatar avatar-lg avatar-placeholder">
            {initials}
          </span>
        )}
      </div>

      <div className="form-item">
        <Label htmlFor="avatar">Profile picture</Label>
        <Input
          id="avatar"
          name="avatar"
          type="file"
          accept="image/*"
          onChange={handleChange}
          disabled={isPending}
        />
        <p className="text-sm text-muted-foreground">
          JPEG, PNG, WebP, or GIF — resized to max 800 × 800 px, 2 MB limit
        </p>
      </div>

      {(clientError || serverError) && (
        <p className="text-sm text-destructive">{clientError || serverError}</p>
      )}

      <Button type="submit" className="btn-primary" disabled={isPending || !processedBlob}>
        {isPending ? 'Uploading…' : 'Upload avatar'}
      </Button>
    </form>
  )
}
