'use client'

import { useCallback, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { updateHue } from '@/modules/admin/actions/hue-actions'
import { DeleteHueButton } from '@/modules/admin/components/delete-hue-button'
import { HueForm } from '@/modules/admin/components/hue-form'
import type { HueFormState } from '@/modules/admin/types/hue-form-state'

/** Submit button for the inline edit form with pending-state feedback. */
function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="btn-primary btn-sm">
      {pending ? 'Saving…' : 'Save Changes'}
    </Button>
  )
}

/**
 * Data shape for a child hue as displayed in the admin table row.
 */
type ChildHueRow = {
  /** UUID of the child hue. */
  id: string
  /** Human-readable name. */
  name: string
  /** URL-safe slug. */
  slug: string
  /** Hex color code (e.g. `#ff0000`). */
  hex_code: string | null
  /** UUID of the parent hue. */
  parent_id: string | null
}

/**
 * Props for {@link EditChildHueRow}.
 */
type EditChildHueRowProps = {
  /** The child hue to display and edit. */
  childHue: ChildHueRow
}

/**
 * Admin table row that toggles between a read-only view and an inline edit form
 * for a child hue.
 *
 * In read-only mode, renders the hue swatch, name, slug, and action buttons
 * (Edit + Delete). Clicking "Edit" expands the row into a card backed by
 * {@link HueForm} in edit mode. The row collapses back to read-only on a
 * successful save or when the user clicks "Cancel".
 *
 * @param props - {@link EditChildHueRowProps}
 */
export function EditChildHueRow({ childHue }: EditChildHueRowProps) {
  const [isEditing, setIsEditing] = useState(false)

  const editAction = useCallback(
    async (prevState: HueFormState, formData: FormData): Promise<HueFormState> => {
      const result = await updateHue(prevState, formData)
      if (result?.success) {
        setIsEditing(false)
      }
      return result
    },
    []
  )

  if (isEditing) {
    return (
      <tr>
        <td colSpan={4} className="py-3">
          <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Editing: {childHue.name}
            </p>
            <HueForm
              action={editAction}
              parentId={childHue.parent_id ?? undefined}
              defaultValues={{ ...childHue, hex_code: childHue.hex_code ?? undefined }}
              mode="edit"
              footer={
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <DeleteHueButton
                    hueId={childHue.id}
                    hueName={childHue.name}
                    triggerClassName=""
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <SaveButton />
                  </div>
                </div>
              }
            />
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-3">
        <span
          className="inline-block h-5 w-5 rounded border border-border"
          style={{ backgroundColor: childHue.hex_code ?? undefined }}
          aria-hidden="true"
        />
      </td>
      <td className="py-2 pr-4 font-medium">{childHue.name}</td>
      <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{childHue.slug}</td>
      <td className="py-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
          <Link href={`/admin/hues/${childHue.id}`} className="btn btn-ghost btn-sm">
            View
          </Link>
          <DeleteHueButton
            hueId={childHue.id}
            hueName={childHue.name}
            triggerClassName="btn-outline"
          />
        </div>
      </td>
    </tr>
  )
}
