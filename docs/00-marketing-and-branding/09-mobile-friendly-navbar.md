# Mobile-Friendly Navbar

**Epic:** Marketing & Branding
**Type:** Feature
**Status:** Done
**Branch:** `feature/mobile-friendly-navbar`
**Merge into:** `v1/main`

## Summary

The current `<Navbar>` (`src/components/navbar.tsx`) renders a horizontal bar with the brand on the left, six center links (Paints, Brands, Schemes, Palettes, Collection, My palettes), and an auth cluster on the right (Sign In / Sign Up buttons or the user avatar dropdown). On phone- and tablet-sized viewports this row overflows: the center links wrap, the navbar height balloons, and the auth cluster pushes off-screen on small devices. There is no mobile-aware fallback — the navbar uses the same layout at every breakpoint.

This feature adds a mobile-friendly navbar that, below the `lg` breakpoint (≤ 1023px — covering phones and most tablets in portrait + small landscapes), collapses the center link cluster and the right-side auth cluster into a single hamburger trigger that opens a side-sheet drawer. The drawer holds every navigation link and the auth section. Above `lg` the navbar continues to render its current horizontal layout unchanged. Adds a reusable `<Sheet>` UI primitive (daisyUI-style drawer) so the same pattern can host other side panels later.

## Acceptance Criteria

- [x] Below the `lg` breakpoint (`< 1024px`), the navbar shows: brand link on the left, hamburger trigger on the right — and nothing else
- [x] At the `lg` breakpoint and above (`≥ 1024px`), the navbar continues to render its current desktop layout: brand, center link cluster, auth cluster — no visual change vs. today
- [x] Tapping the hamburger opens a side-sheet drawer that slides in from the right edge, with a translucent overlay over the rest of the page
- [x] The drawer contains, in order: a header row (brand or "Menu" label + close button), the full navigation link list, a separator, and an auth section (Sign In / Sign Up for guests, user identity + sign-out for authenticated users)
- [x] The drawer is keyboard-accessible: Escape closes it, focus is trapped inside while open, focus returns to the hamburger trigger on close
- [x] The drawer auto-closes when the user clicks any link inside it (so route changes feel one-step)
- [x] The drawer auto-closes on route change (defensive, in case a child component navigates programmatically)
- [x] The hamburger trigger has `aria-label="Open navigation menu"` and the drawer panel uses Radix Dialog semantics (`role="dialog"`, `aria-modal="true"`)
- [x] Admin users see the `Admin` link inside the drawer (mirrors the desktop admin badge), gated by the same `isAdmin` check
- [x] Authenticated-only links (`Collection`, `My palettes`) are present in the drawer only for signed-in users — same gating as the desktop center cluster
- [x] A new `<Sheet>` UI primitive lives at `src/components/ui/sheet.tsx` with daisyUI-style classes in `src/styles/sheet.css`, supporting `side="right"` (and `side="left"` so it can host other drawers later)
- [x] The sheet primitive is built on `@radix-ui/react-dialog` so it inherits focus-trap, scroll-lock, and Escape handling for free (matches the existing `dialog.tsx` approach)
- [x] The `<Sheet>` CSS file follows the project's style-file header convention (component name, daisyUI reference link, class inventory, section dividers)
- [x] No layout shift on the existing desktop layout — desktop-breakpoint screenshots match pre-feature
- [x] `npm run build` and `npm run lint` pass with no errors

## Non-Goals

- **No icon library swap.** Use the existing `lucide-react` package (already in use by `dialog.tsx`) for `Menu` and `X` icons. Don't introduce a new icon set.
- **No bottom-sheet / top-sheet variants.** This feature ships with `side="right"` (and `side="left"` available for future use). Top/bottom variants are out of scope.
- **No "tap-outside-to-close" customization.** Use Radix Dialog's default modal behavior (overlay click closes, Escape closes). Don't build a non-modal sheet.
- **No routes added or removed.** The drawer surfaces the same links the desktop navbar already shows — no IA changes.
- **No animation polish beyond the basics.** Use Radix's `data-state="open"`/`"closed"` hooks with simple Tailwind transitions (`translate-x-full` ↔ `translate-x-0`, fade overlay). No spring physics, no gesture-driven swipes.

## Breakpoint Decision

The user request specifies "mobile or tablet device" → mobile menu. Tailwind's default breakpoints (`sm: 640`, `md: 768`, `lg: 1024`, `xl: 1280`):

| Device class                          | Approx width   | Treatment        |
| ------------------------------------- | -------------- | ---------------- |
| Phone portrait                        | 320–480        | Mobile menu      |
| Phone landscape                       | 568–844        | Mobile menu      |
| Tablet portrait (iPad / 10")          | 768–820        | Mobile menu      |
| Tablet landscape (iPad / 10")         | 1024–1080      | Desktop nav      |
| Tablet landscape (iPad Pro 11"/12.9") | 1194–1366      | Desktop nav      |
| Laptop / desktop                      | ≥ 1280         | Desktop nav      |

Using `lg` (`≥ 1024px`) as the desktop cutoff means: phones and tablets-in-portrait get the mobile menu; tablets-in-landscape and laptops get the full desktop nav. This matches the user's "mobile or tablet" intent for portrait orientations and avoids cramming the desktop nav into ~768px when the center cluster already overflows there today.

Concrete utility usage:

- Hamburger trigger: `lg:hidden` (visible only below `lg`)
- Center link cluster + right auth cluster: `hidden lg:flex` (visible only at `lg` and up)

## Key Files

| Action  | File                                              | Description                                                                                   |
| ------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Create  | `src/components/ui/sheet.tsx`                     | Sheet primitive — `<Sheet>`, `<SheetTrigger>`, `<SheetContent side="…">`, header/footer parts |
| Create  | `src/styles/sheet.css`                            | `.sheet-overlay`, `.sheet-content`, `.sheet-content-right`, `.sheet-content-left`, header/footer modifiers |
| Modify  | `src/app/globals.css`                             | `@import '../styles/sheet.css' layer(components);`                                            |
| Create  | `src/components/navbar-mobile-menu.tsx`           | Client component — hamburger trigger + sheet drawer with the nav link list and auth section  |
| Modify  | `src/components/navbar.tsx`                       | Add `lg:hidden` `<NavbarMobileMenu>` and gate existing center/end clusters with `hidden lg:flex` |
| Modify  | `src/styles/navbar.css`                           | Add a `.navbar-mobile-trigger` class (hamburger button) for consistent styling                |

No new module under `src/modules/` is created. The navbar remains a global cross-cutting shell component, so the mobile menu lives alongside it in `src/components/`.

## Implementation Plan

### Module placement

`<Navbar>` is a global app-shell component (`src/components/navbar.tsx`), not a domain module. The mobile menu is a sibling concern — a presentational variation of the same shell — so it lives next to the navbar at `src/components/navbar-mobile-menu.tsx`. Per `CLAUDE.md`, this matches the placement of the other cross-cutting primitives (`footer.tsx`, `breadcrumbs.tsx`, `logo.tsx`, `main.tsx`).

The new `<Sheet>` primitive belongs in `src/components/ui/` because it is a low-level Radix-based building block in the same family as `dialog.tsx`, `dropdown-menu.tsx`, and `popover.tsx`. It is reusable across the app for any future side-panel UI (filter drawers, settings panels, etc.).

### Step 1 — Sheet primitive (`src/components/ui/sheet.tsx` + `src/styles/sheet.css`)

The sheet wraps `@radix-ui/react-dialog` (already a dependency — used by `dialog.tsx`). It mirrors the API of `dialog.tsx` but renders the content panel anchored to a screen edge instead of centered.

Create `src/styles/sheet.css` with the daisyUI-style header convention used by every other file in `src/styles/`:

```css
/*
 * Sheet
 *
 * Side-anchored modal panel that slides in from a screen edge. Built on
 * Radix Dialog, so it inherits focus-trap, scroll-lock, overlay click,
 * and Escape-to-close behavior.
 *
 * Loosely modeled on the daisyUI Drawer component.
 * https://daisyui.com/components/drawer/
 *
 * Classes:
 *   Overlay:   .sheet-overlay              — Fixed translucent backdrop
 *   Content:   .sheet-content              — Base side panel (fixed, full viewport height)
 *   Sides:     .sheet-content-right        — Anchored to right edge, slides in from right
 *              .sheet-content-left         — Anchored to left edge, slides in from left
 *   Header:    .sheet-header               — Top row inside the panel (title + close button)
 *   Body:      .sheet-body                 — Scrollable content area
 *   Footer:    .sheet-footer               — Bottom row inside the panel
 */

.sheet-overlay {
  @apply fixed inset-0 z-50 bg-black/50 backdrop-blur-sm
    data-[state=open]:animate-in data-[state=closed]:animate-out
    data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0;
}

/* --- */

.sheet-content {
  @apply fixed z-50 flex h-full w-3/4 max-w-sm flex-col gap-4
    border-border bg-background p-6 shadow-lg
    transition ease-in-out
    data-[state=open]:animate-in data-[state=closed]:animate-out
    data-[state=closed]:duration-200 data-[state=open]:duration-300;
}

.sheet-content-right {
  @apply inset-y-0 right-0 border-l
    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right;
}

.sheet-content-left {
  @apply inset-y-0 left-0 border-r
    data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left;
}

/* --- */

.sheet-header {
  @apply flex items-center justify-between gap-4;
}

.sheet-body {
  @apply flex flex-1 flex-col gap-2 overflow-y-auto;
}

.sheet-footer {
  @apply mt-auto flex flex-col gap-2;
}
```

Wire into `src/app/globals.css`:

```css
@import '../styles/sheet.css' layer(components);
```

Create `src/components/ui/sheet.tsx` mirroring `dialog.tsx`'s structure:

```tsx
'use client'

import type { ComponentProps } from 'react'
import { X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'

import { cn } from '@/lib/utils'

/** Root sheet provider. */
function Sheet(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

/** Element that opens the sheet. */
function SheetTrigger(props: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

/** Close button element. */
function SheetClose(props: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal(props: ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn('sheet-overlay', className)}
      {...props}
    />
  )
}

/**
 * Sheet content panel — anchored to the left or right edge of the viewport.
 *
 * @param props.side - Which edge the sheet slides in from. Default `'right'`.
 * @param props.showCloseButton - Whether to render the default ✕ close button (default `true`).
 */
function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  side?: 'left' | 'right'
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        className={cn('sheet-content', `sheet-content-${side}`, className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background
              transition-opacity hover:opacity-100 focus:outline-none focus:ring-2
              focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sheet-header" className={cn('sheet-header', className)} {...props} />
}

function SheetBody({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sheet-body" className={cn('sheet-body', className)} {...props} />
}

function SheetFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sheet-footer" className={cn('sheet-footer', className)} {...props} />
}

function SheetTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-lg font-semibold', className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
```

JSDoc per `CLAUDE.md` conventions on each named export.

### Step 2 — `<NavbarMobileMenu>` client component

Create `src/components/navbar-mobile-menu.tsx`. Because the parent `<Navbar>` is a server component that resolves the auth state, this child receives the resolved data via props rather than re-fetching it client-side:

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
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
 * Renders only below the `lg` breakpoint (the parent gates this with
 * `lg:hidden`). The drawer slides in from the right and contains the same
 * navigation links as the desktop navbar plus an auth section.
 *
 * Auto-closes on route change so a tap-then-navigate flow feels like one step.
 *
 * @param props.viewer - Either `{ kind: 'guest' }` or a fully resolved user
 *                       descriptor with display name, avatar, and admin flag.
 *                       The parent `<Navbar>` (a server component) computes this.
 */
export function NavbarMobileMenu({ viewer }: { viewer: Viewer }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Defensive: programmatic navigation should also close the drawer.
  // Wrapping link clicks in a SheetClose handles user clicks; this covers redirects.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="navbar-mobile-trigger"
        aria-label="Open navigation menu"
      >
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
                <Link
                  href={`/users/${viewer.userId}`}
                  className="btn btn-ghost justify-start"
                >
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
                <button type="submit" className="btn btn-ghost btn-destructive justify-start w-full">
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
```

Add `.navbar-mobile-trigger` to `src/styles/navbar.css`:

```css
/* -------------------------------------------------------------------------
 * Mobile menu trigger
 * ----------------------------------------------------------------------- */
.navbar-mobile-trigger {
  @apply inline-flex h-9 w-9 items-center justify-center rounded-md
    text-foreground transition-colors
    hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring;
}
```

### Step 3 — Wire into `<Navbar>`

Modify `src/components/navbar.tsx` to:
1. Continue resolving auth state and admin status server-side (no behavior change there).
2. Build a `viewer` descriptor matching the `Viewer` discriminated union from Step 2.
3. Render `<NavbarMobileMenu viewer={viewer} />` with `lg:hidden`.
4. Gate the existing `.navbar-center` and `.navbar-end` clusters with `hidden lg:flex` so they only render on desktop.

```tsx
import Link from 'next/link'

import { Logo } from '@/components/logo'
import { NavbarMobileMenu } from '@/components/navbar-mobile-menu'
import { createClient } from '@/lib/supabase/server'
import { UserMenu } from '@/modules/user/components/user-menu'
import { getUserRoles } from '@/modules/user/utils/roles'

/**
 * Top-level navigation bar (server component).
 *
 * Above the `lg` breakpoint, renders the brand link, center navigation
 * cluster, and auth-state-dependent right cluster (sign-in/up for guests,
 * avatar dropdown for authenticated users).
 *
 * Below `lg`, renders the brand link plus a hamburger trigger that opens
 * a side-sheet drawer containing every navigation link and the auth section.
 */
export async function Navbar() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let displayName: string | null = null
  let avatarUrl: string | null = null
  let isAdmin = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .single()

    displayName = profile?.display_name ?? null
    avatarUrl = profile?.avatar_url ?? null

    const roles = await getUserRoles(user.id)
    isAdmin = roles.includes('admin')
  }

  const viewer =
    user && displayName
      ? ({
          kind: 'user' as const,
          userId: user.id,
          displayName,
          avatarUrl,
          isAdmin,
        })
      : ({ kind: 'guest' as const })

  return (
    <nav className="navbar sticky top-0 z-50 gap-2 bg-background">
      <div className="navbar-start gap-2">
        <Link href="/" className="navbar-brand inline-flex items-center" aria-label="Grimify home">
          <Logo size="md" />
        </Link>
      </div>
      <div className="navbar-center hidden grow justify-center align-center gap-2 lg:flex">
        <Link href="/paints" className="btn btn-ghost btn-sm">
          Paints
        </Link>
        <Link href="/brands" className="btn btn-ghost btn-sm">
          Brands
        </Link>
        <Link href="/schemes" className="btn btn-ghost btn-sm">
          Schemes
        </Link>
        <Link href="/palettes" className="btn btn-ghost btn-sm">
          Palettes
        </Link>
        {user && (
          <Link href="/collection" className="btn btn-ghost btn-sm">
            Collection
          </Link>
        )}
        {user && (
          <Link href="/user/palettes" className="btn btn-ghost btn-sm">
            My palettes
          </Link>
        )}
      </div>
      <div className="navbar-end hidden gap-2 lg:flex">
        {isAdmin && (
          <Link href="/admin" className="btn btn-ghost btn-sm">
            Admin
          </Link>
        )}
        {user && displayName ? (
          <UserMenu userId={user.id} displayName={displayName} avatarUrl={avatarUrl} />
        ) : (
          <>
            <Link href="/sign-in" className="btn btn-ghost btn-sm">
              Sign In
            </Link>
            <Link href="/sign-up" className="btn btn-primary btn-sm">
              Sign Up
            </Link>
          </>
        )}
      </div>
      <div className="ml-auto flex items-center lg:hidden">
        <NavbarMobileMenu viewer={viewer} />
      </div>
    </nav>
  )
}
```

The `ml-auto` on the mobile-only wrapper pushes the hamburger to the right edge once `.navbar-center` and `.navbar-end` are hidden — they no longer occupy flex space below `lg`.

### Step 4 — Verify

1. `npm run build` and `npm run lint` pass with no errors.
2. `npm run dev`. Use Chrome devtools' device toolbar to walk through these widths and confirm the layout transitions cleanly:
   - 320 (iPhone SE) — hamburger only on right
   - 768 (iPad portrait) — still hamburger
   - 1023 — still hamburger (one px below `lg`)
   - 1024 — desktop nav appears (the breakpoint flip)
   - 1280 — full desktop nav, no change vs. today
3. With the drawer open, tab through every focusable element — focus stays inside the drawer; Shift+Tab from the first wraps to the last; Escape closes; focus returns to the hamburger trigger.
4. Tap a link inside the drawer — the drawer closes and the new route renders.
5. Sign in and re-test: the drawer footer shows the user's avatar/name and a "Sign out" form button. The "Collection" and "My palettes" links appear in the body. If admin, "Admin" appears.
6. Sign out and re-test: the drawer footer shows "Sign In" and "Sign Up" buttons; auth-only links are absent.
7. View source on `/` at desktop width and confirm the rendered DOM exactly matches the pre-feature output for the existing center/end clusters (no regression to authenticated flows).

### Order of operations

1. Step 1 (Sheet primitive + CSS) — must land first; the navbar mobile menu depends on it.
2. Step 2 (`<NavbarMobileMenu>`) — second; can be staged independently because it's not yet imported anywhere.
3. Step 3 (Navbar wire-up) — third; this is the user-visible change. Until this commits, the mobile menu is dormant.
4. Step 4 — verification across viewports and auth states.

Each step is its own commit so the diff stays reviewable.

## Risks & Considerations

- **Breakpoint choice locks in tablet UX.** Using `lg` (1024) means iPad-portrait users get the mobile menu. If a future product decision wants the desktop nav on tablet portrait, the change is one breakpoint swap (`lg:` → `md:` everywhere in the navbar) — but every tablet-portrait viewport will then have the same overflow problem the desktop nav has today, so we'd also need to tighten the link cluster (smaller buttons, fewer items, etc.). Document the breakpoint choice in this doc so the rationale survives.
- **The `<Navbar>` keeps its server-component status.** Resist the temptation to convert the whole navbar to a client component just to manage drawer state — that would force every page to re-fetch auth on the client and lose the streaming benefit. The split (server parent → client child receiving resolved props) is the right shape.
- **Avatar duplication.** The desktop right-cluster uses `<UserMenu>` (a client component already), which renders the avatar dropdown. The mobile menu re-renders the avatar inline inside the drawer footer. That's intentional — they are different surfaces. Don't try to share a single component; the desktop dropdown and the inline drawer row have different layouts and interactions.
- **Sign-out is a `<form action={signOut}>`.** Inside the drawer, the form submission causes a full server action round trip and a redirect. Radix Dialog's portal won't interfere with the form post, but verify the drawer state resets cleanly after the redirect (the new route renders → `usePathname` changes → the `useEffect` closes any lingering open state if it survives the redirect, which it shouldn't).
- **Escape closes the drawer, but it also closes any nested popovers.** No nested Radix overlays are planned for the drawer's initial content — just plain `<Link>`s and a `<form>` — so this isn't a concern at launch. If future content nests a popover or dialog inside the drawer, validate the Escape stack ordering then.
- **Animation classes (`animate-in` / `slide-in-from-right`).** These come from `tailwindcss-animate`, which the existing `dialog.tsx` already uses (the centered dialog has fade/zoom animations). Confirm the package is in `package.json`; if not, the existing `dialog.tsx` would also be broken. Treat this as a smoke check rather than an unknown.
- **No barrel file.** Per `CLAUDE.md`, do not create `src/components/ui/index.ts`. Imports are direct (`import { Sheet } from '@/components/ui/sheet'`).
- **JSDoc on every export.** The `Sheet*` exports and `NavbarMobileMenu` need JSDoc per `CLAUDE.md` conventions — summary, `@param` for props, cross-references via `{@link}` where useful.
- **Don't change the Logo size on mobile.** The brand keeps `<Logo size="md" />` so the navbar's vertical rhythm matches desktop. The drawer header uses `<Logo size="sm" />` because it's inside a 24rem-wide panel where the medium logo would dominate.
- **Sticky positioning interaction.** The navbar is `sticky top-0 z-50`. Radix Dialog renders the sheet into a portal at the document body, so its `z-50` overlay/content layer is independent of the navbar's stacking context — they won't collide. If a future `z-[60]+` element is added (e.g. a global toast), confirm the overlay still sits above it.
