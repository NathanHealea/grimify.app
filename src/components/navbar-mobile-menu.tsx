'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu } from 'lucide-react'

import { Logo } from '@/components/logo'
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { signOut } from '@/modules/auth/actions/sign-out'

/**
 * Authenticated user descriptor passed from the server-side {@link Navbar}.
 *
 * `kind: 'guest'` — no session. `kind: 'user'` — fully resolved user info.
 */
type Viewer =
  | { kind: 'guest' }
  | {
      kind: 'user'
      userId: string
      displayName: string
      avatarUrl: string | null
      isAdmin: boolean
    }

/**
 * Mobile/tablet navbar menu — hamburger button + side-sheet drawer.
 *
 * Renders only below the `lg` breakpoint (the parent `<Navbar>` gates this
 * component with `lg:hidden`). The drawer slides in from the right and
 * contains the same navigation links as the desktop navbar plus an auth
 * section.
 *
 * Auto-closes when the user taps any link (via {@link SheetClose} wrappers).
 *
 * @param props.viewer - Either `{ kind: 'guest' }` or a fully resolved user
 *   descriptor with display name, avatar URL, and admin flag. The parent
 *   `<Navbar>` (a server component) computes this before passing it down.
 */
export function NavbarMobileMenu({ viewer }: { viewer: Viewer }) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="navbar-mobile-trigger" aria-label="Open navigation menu">
        <Menu className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>
            <Logo size="sm" />
          </SheetTitle>
        </SheetHeader>
        <SheetBody>
          <SheetClose asChild>
            <Link href="/paints" className="btn btn-ghost justify-start">
              Paints
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link href="/brands" className="btn btn-ghost justify-start">
              Brands
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link href="/schemes" className="btn btn-ghost justify-start">
              Schemes
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link href="/palettes" className="btn btn-ghost justify-start">
              Palettes
            </Link>
          </SheetClose>
          {viewer.kind === 'user' && (
            <>
              <SheetClose asChild>
                <Link href="/collection" className="btn btn-ghost justify-start">
                  Collection
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link href="/user/palettes" className="btn btn-ghost justify-start">
                  My palettes
                </Link>
              </SheetClose>
              {viewer.isAdmin && (
                <SheetClose asChild>
                  <Link href="/admin" className="btn btn-ghost justify-start">
                    Admin
                  </Link>
                </SheetClose>
              )}
            </>
          )}
        </SheetBody>
        <SheetFooter>
          {viewer.kind === 'user' ? (
            <>
              <SheetClose asChild>
                <Link href={`/users/${viewer.userId}`} className="btn btn-ghost justify-start">
                  {viewer.avatarUrl ? (
                    <Image
                      src={viewer.avatarUrl}
                      alt={viewer.displayName}
                      width={24}
                      height={24}
                      className="size-6 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  <span className="ml-2">{viewer.displayName}</span>
                </Link>
              </SheetClose>
              <form action={signOut}>
                <button
                  type="submit"
                  className="btn btn-ghost btn-destructive w-full justify-start"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <SheetClose asChild>
                <Link href="/sign-in" className="btn btn-ghost justify-start">
                  Sign In
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link href="/sign-up" className="btn btn-primary justify-start">
                  Sign Up
                </Link>
              </SheetClose>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
