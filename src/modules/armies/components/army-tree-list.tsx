'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'

import { deleteArmy } from '@/modules/armies/actions/delete-army'
import type { ArmyNode } from '@/modules/armies/types/army-node'
import type { ArmyFormState } from '@/modules/armies/types/army-form-state'

/**
 * Props for the inline delete form shown in each army row.
 */
type DeleteFormProps = {
  /** Army ID to delete. */
  armyId: string
  /** Army name shown in the confirmation button label. */
  armyName: string
}

/** Delete button that reflects pending state via {@link useFormStatus}. */
function DeleteSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-ghost btn-sm text-destructive hover:bg-destructive/10"
    >
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  )
}

/**
 * Inline form that calls {@link deleteArmy} for a single army row.
 *
 * Displays any error returned by the server action beneath the form.
 *
 * @param props - {@link DeleteFormProps}
 */
function DeleteArmyForm({ armyId, armyName }: DeleteFormProps) {
  const [state, formAction] = useActionState(deleteArmy, null)

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="id" value={armyId} />
        <DeleteSubmitButton />
      </form>
      {state?.error && (
        <p className="mt-1 text-xs text-destructive max-w-xs">{state.error}</p>
      )}
      {/* Suppress unused variable warning — armyName used for accessibility. */}
      <span className="sr-only">{armyName}</span>
    </div>
  )
}

/**
 * Props for {@link ArmyTreeList}.
 */
type ArmyTreeListProps = {
  /** Root army nodes with nested `children` arrays. */
  armies: ArmyNode[]
}

/**
 * Props for the recursive row renderer.
 */
type ArmyRowProps = {
  node: ArmyNode
  depth: number
  parentName?: string
}

/**
 * Renders a single army row and recursively renders its children.
 *
 * @param props - {@link ArmyRowProps}
 */
function ArmyRow({ node, depth, parentName }: ArmyRowProps) {
  return (
    <>
      <tr className="border-b border-border/50">
        <td className="py-2 pr-3 w-8">
          {node.icon_url ? (
            <img
              src={node.icon_url}
              alt={`${node.name} icon`}
              className="h-6 w-6 rounded object-contain"
            />
          ) : (
            <span className="inline-block h-6 w-6 rounded border border-border/30 bg-muted" />
          )}
        </td>
        <td
          className="py-2 pr-4 font-medium"
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
        >
          {node.name}
        </td>
        <td className="py-2 pr-4 text-sm text-muted-foreground">
          {parentName ?? '—'}
        </td>
        <td className="py-2 pr-4 text-sm tabular-nums text-muted-foreground">
          {node.sort_order ?? '—'}
        </td>
        <td className="py-2">
          <div className="flex items-start gap-1">
            <Link href={`/admin/armies/${node.id}`} className="btn btn-ghost btn-sm">
              Edit
            </Link>
            <DeleteArmyForm armyId={node.id} armyName={node.name} />
          </div>
        </td>
      </tr>
      {node.children.map((child) => (
        <ArmyRow key={child.id} node={child} depth={depth + 1} parentName={node.name} />
      ))}
    </>
  )
}

/**
 * Renders the full army hierarchy as an indented table for the admin list page.
 *
 * Each row shows the army icon thumbnail (24×24), name (indented by depth),
 * parent name (or "—" for root armies), sort order, and Edit/Delete actions.
 * Deleting an army with children shows an inline error from the server action.
 *
 * @param props - {@link ArmyTreeListProps}
 */
export function ArmyTreeList({ armies }: ArmyTreeListProps) {
  if (armies.length === 0) {
    return <p className="text-sm text-muted-foreground">No armies found.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 pr-3 font-medium w-8">Icon</th>
            <th className="pb-2 pr-4 font-medium">Name</th>
            <th className="pb-2 pr-4 font-medium">Parent</th>
            <th className="pb-2 pr-4 font-medium">Order</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {armies.map((node) => (
            <ArmyRow key={node.id} node={node} depth={0} parentName={undefined} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
