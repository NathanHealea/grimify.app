'use client'

import Image from 'next/image'
import { useEffect, useId, useRef, useState, useTransition, type ChangeEvent, type DragEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { MarkdownEditor } from '@/modules/markdown/components/markdown-editor'
import { changePassword } from '@/modules/user/actions/change-password'
import { updateAvatar } from '@/modules/user/actions/update-avatar'
import { updateProfile } from '@/modules/user/actions/update-profile'
import type { UpdateProfileFormState } from '@/modules/user/types/update-profile-form-state'
import type { UpdateProfileFormValues } from '@/modules/user/types/update-profile-form-values'
import { resizeImageToFit } from '@/modules/user/utils/resize-image-to-fit'
import { validateDisplayName } from '@/modules/user/validation'

type ProfileAction = (prev: UpdateProfileFormState, formData: FormData) => Promise<UpdateProfileFormState>
type AvatarAction = (prev: { error?: string } | null, formData: FormData) => Promise<{ error?: string } | null>

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/**
 * Unified profile edit form — avatar (drag-and-drop), display name, bio, and
 * optional password change — with a single save button.
 *
 * Avatar images are resized client-side to max 800 × 800 px via
 * {@link resizeImageToFit} before upload. Password fields are optional; if the
 * current password field is left blank the password section is skipped. Password
 * fields are always cleared after submission regardless of outcome. All other
 * field values persist across failed submissions.
 *
 * @param props.defaultValues - Current display name and bio used to pre-populate.
 * @param props.currentAvatarUrl - Existing avatar URL shown as the initial preview.
 * @param props.displayName - Used to generate the initials fallback avatar.
 * @param props.hasEmailIdentity - When `true`, the password change section is shown.
 * @param props.profileAction - Server action for saving display name and bio. Defaults to {@link updateProfile}.
 * @param props.avatarAction - Server action for uploading the avatar. Defaults to {@link updateAvatar}.
 */
export function EditProfileForm({
  defaultValues,
  currentAvatarUrl,
  displayName: initialDisplayName,
  hasEmailIdentity,
  profileAction = updateProfile,
  avatarAction = updateAvatar,
}: {
  defaultValues: UpdateProfileFormValues
  currentAvatarUrl: string | null
  displayName: string
  hasEmailIdentity: boolean
  profileAction?: ProfileAction
  avatarAction?: AvatarAction
}) {
  const inputId = useId()
  const prevPreviewRef = useRef<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Avatar
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl)
  const [isDragOver, setIsDragOver] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  // Password (controlled so they can be cleared after submission)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Feedback
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const initials = initialDisplayName
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

  async function processFile(file: File) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setAvatarError('Please select a JPEG, PNG, WebP, or GIF image.')
      return
    }
    setAvatarError(null)
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
      setAvatarError('Failed to process the selected image. Please try again.')
    }
  }

  function handleDragOver(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void processFile(file)
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
    e.target.value = ''
  }

  function clearPasswordFields() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setFieldErrors({})
    setGeneralError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const clientErrors: Record<string, string> = {}

    const displayNameVal = (formData.get('display_name') as string) ?? ''
    const displayNameError = validateDisplayName(displayNameVal)
    if (displayNameError) clientErrors.display_name = displayNameError

    if (hasEmailIdentity && currentPassword) {
      if (!newPassword) {
        clientErrors.password = 'New password is required.'
      } else if (newPassword.length < 6) {
        clientErrors.password = 'New password must be at least 6 characters.'
      } else if (newPassword !== confirmPassword) {
        clientErrors.confirmPassword = 'Passwords do not match.'
      }
    }

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors)
      clearPasswordFields()
      return
    }

    startTransition(async () => {
      const serverErrors: Record<string, string> = {}
      let generalErr: string | null = null

      const profileResult = await profileAction(null, formData)
      if (profileResult?.errors?.display_name) serverErrors.display_name = profileResult.errors.display_name
      if (profileResult?.errors?.bio) serverErrors.bio = profileResult.errors.bio
      if (profileResult?.error) generalErr = profileResult.error

      if (processedBlob) {
        const avatarFormData = new FormData()
        avatarFormData.append('avatar', processedBlob, 'avatar.jpg')
        const avatarResult = await avatarAction(null, avatarFormData)
        if (avatarResult?.error) serverErrors.avatar = avatarResult.error
      }

      if (hasEmailIdentity && currentPassword) {
        const pwResult = await changePassword(null, formData)
        if (pwResult?.error) serverErrors.password = pwResult.error
      }

      clearPasswordFields()

      if (Object.keys(serverErrors).length === 0 && !generalErr) {
        setSuccess(true)
      } else {
        setFieldErrors(serverErrors)
        if (generalErr) setGeneralError(generalErr)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {generalError && <p className="text-sm text-destructive">{generalError}</p>}
      {success && <p className="text-sm text-green-600 dark:text-green-400">Profile updated successfully.</p>}

      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
          <CardDescription>Drag and drop or click to upload a new profile picture.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <label
              htmlFor={inputId}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'flex min-w-48 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors select-none',
                isDragOver
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
              )}
            >
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt={initialDisplayName}
                  width={80}
                  height={80}
                  className="size-20 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="avatar avatar-lg avatar-placeholder">{initials}</span>
              )}
              <span className="text-sm font-medium">Drop image here or click to browse</span>
              <span className="text-xs">JPEG, PNG, WebP, or GIF — max 800 × 800 px, 2 MB</span>
            </label>

            <input
              id={inputId}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
              tabIndex={-1}
            />
          </div>
          {(avatarError || fieldErrors.avatar) && (
            <p className="text-sm text-destructive">{avatarError || fieldErrors.avatar}</p>
          )}
        </CardContent>
      </Card>

      {/* Profile info */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your display name and bio.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="form-item">
            <Label htmlFor="display_name">Display name</Label>
            <Input
              id="display_name"
              name="display_name"
              type="text"
              defaultValue={defaultValues.display_name}
              placeholder="e.g. Ragnar_42"
              required
              minLength={3}
              maxLength={20}
              pattern="^[a-zA-Z0-9_-]+$"
              autoComplete="username"
            />
            {fieldErrors.display_name ? (
              <p className="text-sm text-destructive">{fieldErrors.display_name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                3-20 characters. Letters, numbers, hyphens, and underscores only.
              </p>
            )}
          </div>

          <div className="form-item">
            <Label htmlFor="bio">Bio</Label>
            <MarkdownEditor
              id="bio"
              name="bio"
              defaultValue={defaultValues.bio ?? ''}
              maxLength={500}
              placeholder="Tell the community about yourself…"
              error={fieldErrors.bio}
            />
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      {hasEmailIdentity && (
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Leave blank to keep your current password.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="form-item">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <div className="form-item">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
            </div>
            <div className="form-item">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {fieldErrors.confirmPassword && <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      <Button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
