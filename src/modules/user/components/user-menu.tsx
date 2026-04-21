'use client'

import Image from 'next/image';
import Link from 'next/link';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/modules/auth/actions/sign-out';

/**
 * User avatar dropdown menu for the navbar.
 *
 * Displays the user's profile picture (or initials fallback) as a trigger
 * button. Opens a Radix dropdown with the user's name (linking to their profile
 * details page) and a sign-out action.
 *
 * @param props.userId - The user's ID, used to construct the profile details link.
 * @param props.displayName - The user's display name.
 * @param props.avatarUrl - URL to the user's profile picture, or `null` for the initials fallback.
 */
export function UserMenu({
  userId,
  displayName,
  avatarUrl,
}: {
  userId: string
  displayName: string
  avatarUrl: string | null
}) {
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="btn btn-circle focus-visible:ring-0 hover:ring-3 hover:ring-primary data-[state=open]:ring-3 data-[state=open]:ring-primary">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName}
            width={28}
            height={28}
            className="size-7 rounded-full pointer-events-none"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="avatar avatar-sm avatar-placeholder pointer-events-none">
            {initials}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/users/${userId}`}>{displayName}</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <button
            type="submit"
            className="dropdown-item dropdown-item-destructive"
          >
            Sign out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
