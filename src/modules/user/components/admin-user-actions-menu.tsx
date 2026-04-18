'use client'

import { EllipsisVertical, Eye, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeleteUserDialog } from '@/modules/user/components/delete-user-dialog'

/**
 * Per-row actions menu for the admin users table.
 *
 * Renders a vertical-ellipsis trigger that opens a dropdown with
 * View, Edit, and Delete actions. Delete opens a confirmation dialog
 * before running the server action.
 *
 * @param props.userId - UUID of the user the actions apply to.
 * @param props.displayName - Name shown in the delete confirmation.
 */
export function AdminUserActionsMenu({
  userId,
  displayName,
}: {
  userId: string
  displayName: string
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="User actions"
          className="btn btn-sm btn-ghost btn-square"
        >
          <EllipsisVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/users/${userId}`}>
              <Eye className="size-4" />
              View
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/admin/users/${userId}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="dropdown-item-destructive"
            onSelect={(event) => {
              event.preventDefault()
              setDeleteOpen(true)
            }}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteUserDialog
        userId={userId}
        displayName={displayName}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  )
}
