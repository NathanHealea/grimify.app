'use client'

import Image from 'next/image';
import Link from 'next/link';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/modules/auth/actions/sign-out';

/** A navigation item in the "Mine" owned-content group of the user dropdown. */
type OwnedItem = {
  label: string
  href: string | null
  disabledReason?: string
}

/** Owned-content destinations shown in the user dropdown under the "Mine" heading. */
const OWNED_ITEMS: OwnedItem[] = [
  { label: 'My collection', href: '/collection' },
  { label: 'My palettes', href: '/user/palettes' },
  { label: 'My recipes', href: '/user/recipes'},
]

/**
 * User avatar dropdown menu for the navbar.
 *
 * Displays the user's profile picture (or initials fallback) as a trigger
 * button. Opens a Radix dropdown with four sections: profile link, a "Mine"
 * group (My collection, My palettes, disabled My recipes placeholder), a
 * separator, and the sign-out action.
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
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuItem asChild>
          <Link href={`/users/${userId}`}>{displayName}</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Mine</DropdownMenuLabel>
        {OWNED_ITEMS.map((item) =>
          item.href ? (
            <DropdownMenuItem key={item.label} asChild>
              <Link href={item.href}>{item.label}</Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              key={item.label}
              disabled
              aria-disabled="true"
              className="cursor-not-allowed opacity-60"
            >
              {item.label}
              {item.disabledReason && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {item.disabledReason}
                </span>
              )}
            </DropdownMenuItem>
          ),
        )}
        <DropdownMenuSeparator />
        <form action={signOut}>
          <button
            type="submit"
            className="dropdown-item dropdown-item-destructive w-full text-left"
          >
            Sign out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
