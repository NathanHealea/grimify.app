'use client'

import { useActionState, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getMergePreview } from '@/modules/admin/actions/merge-preview'
import { mergeProfiles } from '@/modules/admin/actions/merge-profiles'
import type { MergePreview } from '@/modules/admin/types/merge-preview'

/** A profile that can be selected as the merge source. */
type MergeableProfile = {
  id: string
  display_name: string | null
}

/**
 * Props for {@link MergeProfileSection}.
 */
export type MergeProfileSectionProps = {
  /** UUID of the target profile (the user currently being viewed). */
  targetId: string
  /** All other profiles available as merge sources. */
  mergeableProfiles: MergeableProfile[]
}

/**
 * Admin section for merging a source profile into the current (target) profile.
 *
 * Provides a three-step flow: select source → preview transfer → confirm merge.
 * The merge is irreversible; the source profile is permanently deleted.
 *
 * @param props - See {@link MergeProfileSectionProps}.
 */
export function MergeProfileSection({
  targetId,
  mergeableProfiles,
}: MergeProfileSectionProps) {
  const [sourceId, setSourceId] = useState('')
  const [preview, setPreview] = useState<MergePreview | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPreviewing, startPreviewTransition] = useTransition()
  const [mergeError, mergeAction] = useActionState(mergeProfiles, null)

  function handleSourceChange(id: string) {
    setSourceId(id)
    setPreview(null)
    setPreviewError('')
  }

  function handlePreview() {
    if (!sourceId) return
    setPreviewError('')
    setPreview(null)
    startPreviewTransition(async () => {
      const result = await getMergePreview(sourceId, targetId)
      if ('error' in result) {
        setPreviewError(result.error)
      } else {
        setPreview(result)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Merge Profile</CardTitle>
        <CardDescription>
          Absorb another profile into this one. Role assignments transfer; the source profile is
          permanently deleted. This action is irreversible.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-48">
            <label htmlFor="source-profile" className="form-label text-sm">
              Source profile (will be deleted)
            </label>
            <select
              id="source-profile"
              className="input w-full mt-1"
              value={sourceId}
              onChange={(e) => handleSourceChange(e.target.value)}
            >
              <option value="">Select a profile to merge…</option>
              {mergeableProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name ?? '(no name)'} — {p.id.slice(0, 8)}…
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            className="btn-secondary btn-sm"
            disabled={!sourceId || isPreviewing}
            onClick={handlePreview}
          >
            {isPreviewing ? 'Loading…' : 'Preview Merge'}
          </Button>
        </div>

        {previewError && (
          <p className="text-sm text-destructive">{previewError}</p>
        )}

        {preview && (
          <div className="rounded-md border p-4 space-y-2">
            <p className="text-sm font-medium">Merge preview</p>
            <p className="text-sm">
              <span className="font-medium">{preview.source_display_name}</span>
              {' → '}
              <span className="font-medium">{preview.target_display_name}</span>
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>{preview.roles_to_transfer} new role(s) will transfer</li>
              {preview.will_copy_bio && <li>Bio will copy from source</li>}
              {preview.will_copy_avatar && <li>Avatar will copy from source</li>}
            </ul>
            <Button
              type="button"
              className="btn-destructive btn-sm mt-1"
              onClick={() => setShowConfirm(true)}
            >
              Merge Profiles
            </Button>
          </div>
        )}

        {/* Confirmation dialog */}
        <Dialog open={showConfirm} onOpenChange={(o) => !o && setShowConfirm(false)}>
          <DialogContent className="w-full max-w-sm p-6">
            <DialogHeader>
              <DialogTitle className="text-destructive">
                Confirm Merge — This is irreversible
              </DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Merge{' '}
                <span className="font-medium">{preview?.source_display_name}</span>
                {' into '}
                <span className="font-medium">{preview?.target_display_name}</span>.
                The source profile will be <strong>permanently deleted</strong>.
              </p>
            </DialogHeader>

            {mergeError && (
              <p className="text-sm text-destructive">{mergeError}</p>
            )}

            <DialogFooter className="mt-2">
              <Button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </Button>
              <form action={mergeAction}>
                <input type="hidden" name="sourceId" value={sourceId} />
                <input type="hidden" name="targetId" value={targetId} />
                <Button type="submit" className="btn-destructive btn-sm">
                  Confirm Merge
                </Button>
              </form>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
