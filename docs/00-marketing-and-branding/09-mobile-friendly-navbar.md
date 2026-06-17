# Mobile-Friendly Navbar

**Epic:** Marketing & Branding
**Type:** Feature
**Status:** Completed
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

> **Status: In Progress — substantially complete.** The `<Sheet>` primitive, the
> `<NavbarMobileMenu>` drawer, the CSS, and the navbar wire-up are all built and
> live. The drawer also diverged from the original side-sheet design into a
> **full-screen** overlay. Only one acceptance criterion remains: auto-close on
> route change (defensive, for programmatic navigation). The phases below
> document what shipped and scope the remaining work.

### Module placement

`<Navbar>` is a global app-shell component (`src/components/navbar.tsx`), not a domain module. The mobile menu is a sibling concern — a presentational variation of the same shell — so it lives next to the navbar at `src/components/navbar-mobile-menu.tsx`, matching the placement of the other cross-cutting primitives (`footer.tsx`, `logo.tsx`). The `<Sheet>` primitive lives in `src/components/ui/` as a low-level Radix-based building block alongside `dialog.tsx`, `dropdown-menu.tsx`, and `popover.tsx`. No `src/modules/` module is created.

### Already implemented

All of the following landed in earlier work on this branch and verify green:

- **`src/components/ui/sheet.tsx`** — Radix-Dialog-based sheet primitive. Exports `Sheet`, `SheetTrigger`, `SheetClose`, `SheetPortal` (internal), `SheetOverlay` (internal), `SheetContent` (with `side: 'left' | 'right'` default `'right'`, and `showCloseButton` default `true`), `SheetHeader`, `SheetBody`, `SheetFooter`, `SheetTitle`, `SheetDescription`. Inherits focus-trap, scroll-lock, overlay-click, and Escape-to-close from Radix. JSDoc on every export per `CLAUDE.md`. No barrel file — imports are direct.
- **`src/styles/sheet.css`** — daisyUI-style classes with the project header convention: `.sheet-overlay`, `.sheet-content`, `.sheet-content-right`, `.sheet-content-left`, `.sheet-header`, `.sheet-body`, `.sheet-footer`. Class inventory and `/* --- */` section dividers present. Imported in `src/app/globals.css` via `@import '../styles/sheet.css' layer(components);`.
- **`src/styles/navbar.css`** — adds the `.navbar-mobile-trigger` hamburger-button class (sized `h-9 w-9`, ghost-style hover, focus-visible ring).
- **`src/components/navbar-mobile-menu.tsx`** — `'use client'` component. Hamburger `<SheetTrigger>` with `aria-label="Open navigation menu"` and a `<Menu>` lucide icon, opening a right-anchored `<SheetContent>`. Local `useState` controls the open state. Accepts a `Viewer` discriminated union prop (`{ kind: 'guest' }` | `{ kind: 'user', userId, displayName, avatarUrl, isAdmin }`) resolved server-side by the parent. Every link is wrapped in `<SheetClose asChild>` so taps auto-close the drawer.
- **`src/components/navbar.tsx`** — server component resolves auth + admin, builds the `viewer` descriptor, gates the desktop `.navbar-center` / `.navbar-end` clusters with `hidden lg:flex`, and renders `<NavbarMobileMenu viewer={viewer} />` inside an `ml-auto … lg:hidden` wrapper.

Drift from the original plan that is now the source of truth (do **not** revert these):

- **Full-screen drawer, not a 3/4 side-sheet.** `<SheetContent>` is rendered with `className="w-full max-w-none"`, overriding the `.sheet-content` width. The original `w-3/4 max-w-sm` design was superseded.
- **Responsive link alignment.** Links use `w-full justify-center md:justify-start` — centered on phones, left-aligned at `md`+.
- **Current nav set.** `Schemes` is commented out in both the desktop navbar and the drawer (route not shipped). `Recipes` was added to the desktop navbar. A `<NavbarSearchBar>` lives in the desktop `.navbar-center`.
- **Drawer footer holds the auth + "Mine" section.** For signed-in users the footer shows: `Admin Dashboard` (admin-gated), the profile link (avatar + display name), a "Mine" label, then `My collection`, `My palettes`, `My recipes`, and a `signOut` form. Guests get `Sign In` / `Sign Up`. Sign-out uses `<Button>` from `@/components/ui/button` inside `<form action={signOut}>`.
- **Admin label** is `Admin Dashboard` (matches the desktop cluster), not `Admin`.

### Phase 1 — Auto-close on route change (remaining)

This is the only open acceptance criterion. Today the drawer auto-closes on link **taps** (via `<SheetClose>`), but a programmatic redirect (e.g. the `signOut` server action, or any child that navigates) leaves the `open` state stale. Close the drawer whenever the path changes.

**File:** `src/components/navbar-mobile-menu.tsx` (modify)

- Add `import { usePathname } from 'next/navigation'` and pull `useEffect` into the existing `react` import (currently only `useState`).
- Read `const pathname = usePathname()`.
- Add an effect that resets the open state on every path change:

  ```tsx
  // Defensive: a programmatic redirect (e.g. signOut) should also close the
  // drawer. SheetClose handles user link taps; this covers navigation that
  // does not originate from a tapped link.
  useEffect(() => {
    setOpen(false)
  }, [pathname])
  ```

- Keep the existing `<SheetClose>` wrappers — they remain the primary close path for taps; the effect is the defensive backstop the criterion calls for.

After this lands, check the corresponding Acceptance Criteria box (the drawer auto-closes on route change).

### Phase 2 — Verify & finalize

Self-contained verification pass; no code beyond Phase 1.

1. `npm run build` and `npm run lint` — must pass clean.
2. `npm run dev`, then exercise via the Chrome devtools device toolbar:
   - 320 / 768 / 1023 px — hamburger only on the right.
   - 1024 / 1280 px — full desktop nav, no regression vs. today.
3. Open the drawer and confirm: Tab is trapped inside; Escape closes; focus returns to the hamburger; the ✕ close button works.
4. Tap a link — drawer closes and the route renders.
5. Trigger a programmatic redirect: signed in, open the drawer, submit **Sign out**. After the redirect the drawer must be closed (Phase 1 backstop) — confirm no lingering overlay.
6. Auth-state matrix:
   - Guest — footer shows `Sign In` / `Sign Up`; no `Mine` section.
   - Signed-in non-admin — profile row, `My collection` / `My palettes` / `My recipes`, `Sign out`; no `Admin Dashboard`.
   - Signed-in admin — same plus `Admin Dashboard`.
7. Desktop DOM (`≥ lg`) unchanged vs. pre-feature for the existing center/end clusters.

### Order of operations

1. Phase 1 — single edit to `navbar-mobile-menu.tsx`; ships green on its own.
2. Phase 2 — verification only.

One commit for Phase 1; the diff is small and self-contained.

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
