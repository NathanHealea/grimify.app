# Navbar User Menu

**Epic:** Marketing & Branding
**Type:** Feature
**Status:** Done
**Branch:** `feature/navbar-user-menu`
**Merge into:** `v1/main`

## Summary

Today the navbar mixes social/public destinations (`Paints`, `Brands`, `Schemes`, `Palettes`) with user-specific destinations (`Collection`, `My palettes`) inside the same center link cluster. There is no visual or interaction-level distinction between "browse the community's stuff" and "open my stuff" — both just look like nav links. The avatar dropdown (`<UserMenu>` at `src/modules/user/components/user-menu.tsx`) is currently a near-empty container holding only the user's name and a sign-out button.

This feature reorganizes the top navigation so the dropdown becomes the dedicated home for **everything the user owns** — their collection, their palettes, and (forward-looking) their recipes. The center navbar cluster becomes the dedicated home for **public/social** destinations only. The split makes "social vs. mine" obvious at a glance and frees the center cluster from the slow growth that would otherwise occur as new user-owned surfaces (recipes, purchase list, etc.) ship.

The same reorganization carries through to the mobile drawer (`<NavbarMobileMenu>`): public links in the body, owned links in a clearly-labeled footer group above sign-out.

The dropdown also surfaces a profile-management pair at the top — the display-name link (`/users/{userId}`) plus an `Edit profile` link (`/profile/edit`) — above the first separator, so account-level destinations sit apart from the owned-content `Mine` group.

## Acceptance Criteria

- [x] On the desktop navbar (`≥ lg`), the center cluster contains only social/public destinations: `Paints`, `Brands`, `Schemes`, `Palettes` — no `Collection` or `My palettes` link inline.
- [x] On the desktop navbar (`≥ lg`), the avatar dropdown contains, in order: profile link (display name → `/users/{userId}`), `Edit profile` link (`/profile/edit`), separator, `Mine` label, owned-content group (`My collection` → `/collection`, `My palettes` → `/user/palettes`, `My recipes` → `/user/recipes`), separator, sign-out button.
- [x] The `My collection`, `My palettes`, and `My recipes` items in the dropdown are full-width interactive `<Link>`s that close the dropdown on click and navigate as expected.
- [x] `My recipes` links to the live `/user/recipes` route shipped by the `12-painting-recipes` epic — the original disabled "Coming soon" placeholder was removed once the route landed.
- [x] The dropdown groups are visually separated by `<DropdownMenuSeparator />` so the user can scan profile → owned items → sign-out.
- [x] On the mobile drawer (`< lg`), the body contains only public/social links (`Paints`, `Brands`, `Schemes`, `Palettes`); the footer contains a `Mine` group (user identity row, `My collection`, `My palettes`, disabled `My recipes`) and the sign-out form, in that order.
- [x] `Admin` link renders in the desktop `navbar-end` cluster (above the avatar dropdown) when `isAdmin === true`, and at the **top of the mobile drawer footer** (gated on `viewer.kind === 'user' && viewer.isAdmin`) for admin users. It is **not** moved into the dropdown — it's a role-gated app surface, not a personal collection. (Reconciled to shipped footer placement per Implementation Plan Phase 2, Option B.)
- [x] Authenticated-only items are hidden for guests on every breakpoint (no "My …" entries appear unless `viewer.kind === 'user'`).
- [x] All dropdown items support keyboard navigation (Tab/Shift+Tab, Enter to activate, Escape to close) — inherited from Radix `DropdownMenu`, no additional handlers.
- [x] No new routes are added or removed. The doc explicitly defers the `/user/recipes` page to the recipes epic.
- [x] `npm run build` and `npm run lint` pass with no new errors.

## Non-Goals

- **No new routes.** This feature only reorganizes the surface that exposes existing routes. The `/user/recipes` route is owned by the `12-painting-recipes` epic.
- **No avatar / trigger restyle.** The avatar trigger (`btn btn-circle` with hover/open ring) keeps its current styling.
- **No dropdown-position swap.** The dropdown stays anchored `align="end"` — same as today.
- **No admin link relocation.** The `Admin` button stays in `navbar-end` (desktop) and the mobile drawer body. Putting it in the user dropdown would imply admin is a user-owned surface, which it isn't — it's a role-gated app section.
- **No icon library swap.** Use existing `lucide-react` icons (already a dependency for `dialog.tsx`, the toolbar, etc.) for any per-row icons (`Library`, `Palette`, `BookOpen`, `LogOut`).
- **No drag-to-reorder, no recents, no badges.** The dropdown is a flat list of links; counts/badges are out of scope.
- **No public/owned merge for palettes elsewhere.** The `/palettes` route already shows public palettes; `/user/palettes` already shows the user's. The split lives in the routes themselves — this feature doesn't change either page, only how they're surfaced in the navbar.

## Design Rationale

**Why move `Collection` and `My palettes` out of the center cluster?**

Two reasons:

1. *The center cluster is the social/public surface.* Today every link there except `Collection` and `My palettes` is a public destination. Mixing personal links in dilutes the affordance — users have to read the labels to know which is which. With the split, the center cluster is a stable "browse the community" surface.
2. *The center cluster is filling up.* As epics 11 (Palettes) and 12 (Recipes) progress, more user-specific surfaces will need a navbar entry point. Without a dedicated home, each one bloats the center cluster further. The avatar dropdown is the natural home — it's already where "things belonging to me" live conceptually (sign out, profile).

**Why "Coming soon" rather than hiding `My recipes` entirely?**

The user's request explicitly named recipes as one of the items the dropdown should expose. Hiding it would erase the "this is the home for everything yours" affordance the feature is trying to teach. A disabled row tells users where to expect their recipes to appear once the epic ships, with zero risk of a broken link. When `/user/recipes` lands, the recipes feature flips a single boolean and the row activates.

**Why not duplicate state by mounting the dropdown twice (one for desktop, one for mobile)?**

The desktop avatar dropdown and the mobile drawer footer are different surfaces with different layouts and different parent containers (Radix dropdown vs. inline footer). Trying to share a single component would force an awkward `mode='dropdown' | 'inline'` prop. Each surface stays purpose-built; they share **data shape** (the `Viewer` discriminated union built in `navbar.tsx`) and **destination URLs** (constants in this doc), not component instances.

## Key Files

| Action  | File                                                          | Description                                                                                                                                              |
| ------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modify  | `src/modules/user/components/user-menu.tsx`                   | Extend the dropdown content with profile row, owned-content group (`My collection`, `My palettes`, disabled `My recipes`), separator, and sign-out form. Accept new `isAdmin` prop only if needed for badge styling — current plan: don't pass it. |
| Modify  | `src/components/navbar.tsx`                                   | Remove `Collection` and `My palettes` links from the center cluster. The `<UserMenu>` already receives `userId`, `displayName`, `avatarUrl`; no signature change is required for the desktop wiring.                                          |
| Modify  | `src/components/navbar-mobile-menu.tsx`                       | Move `Collection` and `My palettes` links out of the body and into the footer. Add a labeled `Mine` heading above them. Add a disabled `My recipes` row. Keep `Admin` in the body, keep public links in the body.                              |
| Modify  | `src/styles/dropdown-menu.css` *(if a label/heading class is missing)* | Add a `.dropdown-label` class for the small group heading inside the dropdown (e.g. "Mine"). If the existing CSS already defines this, no edit required — verify before adding.                                                            |
| Modify  | `docs/overview.md`                                            | Mark the new feature as `[ ]` under the Marketing & Branding epic.                                                                                       |

No new module is created. The `user` module already owns the dropdown component. No new server actions or services — every destination is a `<Link>` to an existing route.

## Module placement

Per `CLAUDE.md`'s domain-module rule, all user-owned UI lives under `src/modules/user/`. The `<UserMenu>` already lives at `src/modules/user/components/user-menu.tsx`; this feature extends it in place — no new files inside the module.

The navbar shell components (`src/components/navbar.tsx`, `src/components/navbar-mobile-menu.tsx`) are global cross-cutting components and continue to live under `src/components/`. They consume `<UserMenu>` from the module — that boundary stays the same.

## Implementation Plan

> **Status note (refreshed):** The core reorganization is **built and live** across all three files. The desktop dropdown, the desktop center-cluster cleanup, and the mobile drawer footer all match the design intent. Several details have **diverged from the original plan** because routes that were deferred at planning time now exist — this section reflects the *current* code state and the small amount of remaining work.

### What is already implemented (done)

**`src/modules/user/components/user-menu.tsx`** — fully built:

- `OwnedItem` type and module-level `OWNED_ITEMS` const are present, with JSDoc on both.
- `DropdownMenuContent align="end" className="min-w-56"` renders: profile link (`/users/{userId}`), an **`Edit profile`** link (`/profile/edit`), a `<DropdownMenuSeparator />`, a `<DropdownMenuLabel>Mine</DropdownMenuLabel>`, the mapped `OWNED_ITEMS` rows, a second separator, and the sign-out `<form>` using `dropdown-item dropdown-item-destructive`.
- `DropdownMenuLabel` **is** exported by `src/components/ui/dropdown-menu.tsx` (it maps to the `.dropdown-label` class) — the prerequisite flagged at plan time is satisfied, no wrapper change needed.
- The map still carries the `href === null` → disabled-placeholder branch (with `disabled`, `aria-disabled`, `disabledReason`). **This branch is now dead code** because all three owned routes exist (see remaining work).

**`src/components/navbar.tsx`** — fully built:

- The center cluster contains only public destinations: `Paints`, `Brands`, `Palettes`, `Recipes` (a `Recipes` public link was added beyond the original four; `Schemes` is commented out). No `Collection` / `My palettes` links inline. ✔
- `Admin Dashboard` renders in `navbar-end` (above the avatar dropdown) when `isAdmin === true`. ✔
- `<UserMenu>` receives `userId` / `displayName` / `avatarUrl` — no signature change. ✔

**`src/components/navbar-mobile-menu.tsx`** — mostly built:

- `SheetBody` holds only public links (`Paints`, `Brands`, `Palettes`; `Schemes` commented out). ✔
- `SheetFooter` holds, in order: the user-identity `<Link>` (avatar + display name → `/users/{userId}`), a centered `Mine` label, `My collection`, `My palettes`, `My recipes` (live links), and the sign-out form. ✔
- Guest footer shows `Sign In` / `Sign Up` only. ✔

**Styling** — the dropdown CSS already defines `.dropdown-content`, `.dropdown-item`, `.dropdown-item-destructive`, `.dropdown-label`, and `.dropdown-separator`. The file lives at **`src/styles/dropdown.css`** (the original Key Files table mislabels it `dropdown-menu.css`). No CSS work remains.

**Routes** — `/collection`, `/user/palettes`, `/user/recipes`, `/recipes`, `/profile/edit`, and `/users/{userId}` all exist. The recipes routes that the original plan deferred to epic 12 have since shipped.

`npm run lint` passes with **0 errors** (only pre-existing warnings in unrelated `armies` / `paints` / `brands` files). The navbar and user-menu files are clean.

### Remaining work

#### Phase 1 — Reconcile `My recipes` with its now-live route

The original plan modeled `My recipes` as a disabled "Coming soon" placeholder because `/user/recipes` did not exist. **It now exists**, and the desktop `OWNED_ITEMS` already points `My recipes` at `/user/recipes` (a live link). The placeholder machinery is now dead weight.

In `src/modules/user/components/user-menu.tsx`:

1. Drop the `href: string | null` union back to `href: string` and remove `disabledReason` from the `OwnedItem` type (and its JSDoc note about the `null` state).
2. Delete the `item.href ? (...) : (...)` ternary in the render, collapsing to the link-only branch:

   ```tsx
   {OWNED_ITEMS.map((item) => (
     <DropdownMenuItem key={item.label} asChild>
       <Link href={item.href}>{item.label}</Link>
     </DropdownMenuItem>
   ))}
   ```
3. Update the `<UserMenu>` JSDoc body: it currently says "disabled My recipes placeholder" — change to describe `My recipes` as a live link, and document the `Edit profile` row.

Self-contained: type narrows, dead branch removed, JSDoc accurate. Ships green types/lint.

> If the product decision is instead to **keep** a deferred-placeholder pattern for some future surface, leave the union in place but the JSDoc must stop describing `My recipes` as disabled, since it is wired to a real route. Phase 1 assumes the simpler "all owned routes are live" reality.

#### Phase 2 — Resolve the `Admin`-in-mobile-body acceptance criterion

This is the **only unchecked acceptance criterion** (line 25): "`Admin` link continues to render … inside the mobile drawer body for admin users."

Current code places the admin link in `SheetFooter` (top of the footer, gated on `viewer.kind === 'user' && viewer.isAdmin`), **not** in `SheetBody`. Two ways to close this:

- **Option A (move code to match the doc):** relocate the `Admin Dashboard` `<SheetClose><Link/></SheetClose>` block from `SheetFooter` into `SheetBody`, after the public links and gated on the same admin condition.
- **Option B (amend the doc to match code):** if the footer placement is the deliberate, shipped design, update the acceptance criterion + Non-Goals wording to say the admin link lives at the **top of the mobile footer** rather than the body. (Do not edit Acceptance Criteria as part of this plan refresh — flag for the doc owner.)

Pick one during implementation. Either way the box at line 25 can then be checked. Self-contained, single-file change for Option A.

#### Phase 3 — Decide on the unplanned `Edit profile` row

The shipped dropdown includes an `Edit profile` link (`/profile/edit`) that the original design did not mention. It sits between the profile link and the first separator. This is an enhancement, not a regression, but it is undocumented:

- If it stays, add a brief line to the Summary / Acceptance Criteria describing the profile-management rows (profile link + edit profile) so the doc matches reality. (Flag for the doc owner — not edited here.)
- If it should not be in this feature's scope, remove the `Edit profile` `<DropdownMenuItem>` from `user-menu.tsx`.

No code is strictly required if the team accepts the addition; this phase is a documentation-alignment decision.

#### Phase 4 — Verify

1. `npm run build` and `npm run lint` pass (lint already green for these files).
2. `npm run dev` walkthrough:
   - **Authenticated, desktop ≥ lg:** center cluster shows public links only (`Paints / Brands / Palettes / Recipes`). Open the avatar dropdown — profile name → `Edit profile` → `Mine` group (`My collection`, `My palettes`, `My recipes`, all live) → sign-out. Click `My recipes` → navigates to `/user/recipes` and the dropdown closes.
   - **Authenticated, mobile < lg:** open hamburger. Body shows public links (and `Admin` if Option A landed). Footer shows profile row → `Mine` group → sign-out.
   - **Authenticated admin:** `Admin Dashboard` appears in `navbar-end` (desktop); on mobile it appears wherever Phase 2 resolves it. It does **not** appear inside the user dropdown.
   - **Guest, desktop / mobile:** no dropdown / no `Mine` group; `Sign In` / `Sign Up` shown.
3. Keyboard: `Tab` to the avatar trigger, `Enter` opens, arrows move between rows, `Escape` closes. With Phase 1 done there is no disabled row to skip.

### Order of operations

1. **Phase 1** — narrow the type and remove the dead placeholder branch (standalone; no callers affected).
2. **Phase 2** — close the open admin-placement acceptance criterion (Option A code move, or doc amendment by the owner).
3. **Phase 3** — documentation-alignment decision on the `Edit profile` row (doc owner; code only if removing).
4. **Phase 4** — verification sweep across breakpoints and auth states.

Each code phase is its own commit (conventional format). Phases 2 and 3 may be purely documentation if the shipped behavior is accepted as-is.

## Risks & Considerations

- **`DropdownMenuLabel` may not be exported.** The current `dropdown-menu.tsx` wrapper only re-exports the items the project has used so far. If it's missing, add the export from `@radix-ui/react-dropdown-menu` and a matching `.dropdown-label` CSS class in `src/styles/dropdown-menu.css` (style header per `CLAUDE.md` styling conventions). This is a 5-minute side change but a real prerequisite.
- **Disabled row affordance.** A greyed-out menu row with "Coming soon" is a soft affordance. Some users will still try to click it. Radix's `disabled` prop blocks both pointer and keyboard activation, so the worst case is no feedback. If user testing surfaces confusion, swap the disabled row for a `<DropdownMenuItem>` that links to a `/coming-soon` page or a tooltip. Out of scope for this feature.
- **Removing `Collection` from the center cluster on desktop is a discoverability shift.** Existing users have muscle memory for the link. Mitigation: the ✨ first time the user opens the redesigned navbar, the avatar dropdown momentarily wiggles (a `data-attention` animation on first mount per session). **Not in scope** for this feature — flag it as a follow-up if support tickets cite "I can't find my collection".
- **Mobile drawer order matters.** The `Mine` group sits below the user identity row but above sign-out so the user's mental model reads "this is mine → my stuff → sign out". Resist the urge to put `Mine` at the very top of the footer — that visually disconnects the user identity from the items that belong to that identity.
- **`Admin` is intentionally not in the dropdown.** Admin is a role-gated app surface (CRUD for paints, brands, hues), not a user's personal collection. Putting it in the dropdown would conflate "I own this" with "I can administer this". Keep it where it is.
- **Adding a fourth dropdown row in the future** (e.g., `My purchase list` from epic 10): just push another entry onto `OWNED_ITEMS`. The map-and-render pattern in Step 2 absorbs new items with no structural change.
- **Server-component boundary stays the same.** `<Navbar>` continues to resolve auth + roles server-side and pass resolved props to client children (`<UserMenu>`, `<NavbarMobileMenu>`). This feature does not push any auth resolution onto the client.
- **No JSDoc churn beyond the touched component.** Per `CLAUDE.md`, the modified `<UserMenu>` JSDoc summary stays valid (still "User avatar dropdown for the navbar") — update only the body to describe the new groups. The two navbar shell files have no exported components other than `<Navbar>` / `<NavbarMobileMenu>`; their JSDoc already reflects the high-level responsibility and needs only minor wording tweaks if at all.
