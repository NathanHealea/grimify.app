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

## Acceptance Criteria

- [x] On the desktop navbar (`≥ lg`), the center cluster contains only social/public destinations: `Paints`, `Brands`, `Schemes`, `Palettes` — no `Collection` or `My palettes` link inline.
- [x] On the desktop navbar (`≥ lg`), the avatar dropdown contains, in order: profile link (display name → `/users/{userId}`), separator, owned-content group (`My collection` → `/collection`, `My palettes` → `/user/palettes`, `My recipes` → disabled "Coming soon" placeholder), separator, sign-out button.
- [x] The `My collection` and `My palettes` items in the dropdown are full-width interactive `<Link>`s that close the dropdown on click and navigate as expected.
- [x] The `My recipes` item renders as a disabled menu row (greyed text, no link wrapper, `aria-disabled="true"`) until the `12-painting-recipes` epic ships a `/user/recipes` route.
- [x] The dropdown groups are visually separated by `<DropdownMenuSeparator />` so the user can scan profile → owned items → sign-out.
- [x] On the mobile drawer (`< lg`), the body contains only public/social links (`Paints`, `Brands`, `Schemes`, `Palettes`); the footer contains a `Mine` group (user identity row, `My collection`, `My palettes`, disabled `My recipes`) and the sign-out form, in that order.
- [x] `Admin` link continues to render exactly where it does today: in the desktop `navbar-end` cluster (above the avatar dropdown) when `isAdmin === true`, and inside the mobile drawer body for admin users. It is **not** moved into the dropdown — it's a role-gated app surface, not a personal collection.
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

### Step 1 — Define a `UserMenuItem` shape (inline, not a new file)

Inside `user-menu.tsx`, define a small inline type for the "Mine" rows so the JSX stays readable. No need for a new file under `types/` — the type is purely presentational and only used by this component.

```tsx
type OwnedItem = {
  label: string
  href: string | null  // null → render as disabled placeholder
  disabledReason?: string  // tooltip / aria-description for the disabled state
}

const OWNED_ITEMS: OwnedItem[] = [
  { label: 'My collection', href: '/collection' },
  { label: 'My palettes', href: '/user/palettes' },
  { label: 'My recipes', href: null, disabledReason: 'Coming soon' },
]
```

Keep `OWNED_ITEMS` as a module-level `const` inside `user-menu.tsx`. When `/user/recipes` ships, swap `href: null` to `href: '/user/recipes'` and drop `disabledReason` — single-line change.

### Step 2 — Extend `<UserMenu>` content

Replace the current `DropdownMenuContent` body with the four-section layout:

```tsx
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
    <button type="submit" className="dropdown-item dropdown-item-destructive w-full text-left">
      Sign out
    </button>
  </form>
</DropdownMenuContent>
```

Notes:

- `DropdownMenuLabel` is exported by Radix's wrapper at `src/components/ui/dropdown-menu.tsx` — confirm during implementation. If it isn't, add the export or use a `<div className="dropdown-label">` styled via the CSS file.
- `min-w-56` keeps the panel wide enough that "My collection" doesn't wrap on shorter display names. Tune during manual QA if it looks too wide.
- The disabled `My recipes` row uses `disabled` (Radix prop) so it isn't keyboard-focusable, plus `aria-disabled` for screen readers and a "Coming soon" affordance on the right.

### Step 3 — Strip `Collection` and `My palettes` from the desktop center cluster

In `src/components/navbar.tsx`, delete these two `<Link>` blocks from the `.navbar-center` div:

```tsx
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
```

The center cluster is left with only the four public destinations. No other navbar code changes — the existing `<UserMenu>` already gets `userId`/`displayName`/`avatarUrl` and that's all Step 2 needs.

### Step 4 — Reorganize the mobile drawer

In `src/components/navbar-mobile-menu.tsx`:

1. **Body** keeps only public links: `Paints`, `Brands`, `Schemes`, `Palettes`. For admin users, `Admin` stays here too (role-gated app surface).
2. **Footer** gets a new section above the existing user identity row:

   ```tsx
   {viewer.kind === 'user' && (
     <>
       <p className="text-xs uppercase tracking-wide text-muted-foreground px-3 pt-2">
         Mine
       </p>
       <SheetClose asChild>
         <Link href="/collection" className="btn btn-ghost justify-start">
           My collection
         </Link>
       </SheetClose>
       <SheetClose asChild>
         <Link href="/user/palettes" className="btn btn-ghost justify-start">
           My palettes
         </Link>
       </SheetClose>
       <button
         type="button"
         disabled
         aria-disabled="true"
         className="btn btn-ghost justify-start opacity-60 cursor-not-allowed"
       >
         My recipes <span className="ml-auto text-xs">Coming soon</span>
       </button>
     </>
   )}
   ```

3. The existing user identity `<Link>` (avatar + display name → `/users/{userId}`) and the sign-out `<form>` stay below the `Mine` group. Result reading top-to-bottom: profile row → Mine group → sign out.
4. Guest footer is unchanged — `Sign In` / `Sign Up` only.

### Step 5 — Verify

1. `npm run build` and `npm run lint` pass.
2. `npm run dev` and walk through:
   - **Authenticated, desktop ≥ lg:** center cluster shows `Paints / Brands / Schemes / Palettes` only. Open the avatar dropdown — see profile name → `Mine` group with `My collection`, `My palettes`, disabled `My recipes` → sign-out. Click `My collection` → drops to `/collection` and dropdown closes.
   - **Authenticated, mobile < lg:** open hamburger. Body shows `Paints / Brands / Schemes / Palettes` (and `Admin` if admin). Footer shows the `Mine` group above sign-out.
   - **Authenticated admin:** `Admin` link still appears in `navbar-end` (desktop) and in the mobile drawer body. It does **not** appear inside the user dropdown.
   - **Guest, desktop:** no avatar dropdown; center cluster shows the four public links; right cluster shows `Sign In` / `Sign Up`.
   - **Guest, mobile:** drawer body has the four public links; footer has `Sign In` / `Sign Up`. No `Mine` group, no sign-out.
3. Keyboard test: `Tab` to the avatar trigger, `Enter` opens it, arrow keys move focus between rows, the disabled `My recipes` row is **not** keyboard-focusable (Radix should skip it for `disabled` items), `Escape` closes.
4. Screen reader test (VoiceOver / NVDA): the `Mine` label is announced as a group heading; the disabled row announces "My recipes, dimmed" or equivalent.

### Order of operations

1. **Step 2** lands first — extends the dropdown. Standalone change; no callers break.
2. **Step 3** lands second — strips the two links from the desktop center cluster. After this commit, the only entry point for `/collection` and `/user/palettes` on desktop is the dropdown, so Step 2 must already be in place.
3. **Step 4** lands third — mirrors the reorganization to mobile.
4. **Step 5** is the verification sweep across both breakpoints and both auth states.

Each step is its own commit (conventional format).

## Risks & Considerations

- **`DropdownMenuLabel` may not be exported.** The current `dropdown-menu.tsx` wrapper only re-exports the items the project has used so far. If it's missing, add the export from `@radix-ui/react-dropdown-menu` and a matching `.dropdown-label` CSS class in `src/styles/dropdown-menu.css` (style header per `CLAUDE.md` styling conventions). This is a 5-minute side change but a real prerequisite.
- **Disabled row affordance.** A greyed-out menu row with "Coming soon" is a soft affordance. Some users will still try to click it. Radix's `disabled` prop blocks both pointer and keyboard activation, so the worst case is no feedback. If user testing surfaces confusion, swap the disabled row for a `<DropdownMenuItem>` that links to a `/coming-soon` page or a tooltip. Out of scope for this feature.
- **Removing `Collection` from the center cluster on desktop is a discoverability shift.** Existing users have muscle memory for the link. Mitigation: the ✨ first time the user opens the redesigned navbar, the avatar dropdown momentarily wiggles (a `data-attention` animation on first mount per session). **Not in scope** for this feature — flag it as a follow-up if support tickets cite "I can't find my collection".
- **Mobile drawer order matters.** The `Mine` group sits below the user identity row but above sign-out so the user's mental model reads "this is mine → my stuff → sign out". Resist the urge to put `Mine` at the very top of the footer — that visually disconnects the user identity from the items that belong to that identity.
- **`Admin` is intentionally not in the dropdown.** Admin is a role-gated app surface (CRUD for paints, brands, hues), not a user's personal collection. Putting it in the dropdown would conflate "I own this" with "I can administer this". Keep it where it is.
- **Adding a fourth dropdown row in the future** (e.g., `My purchase list` from epic 10): just push another entry onto `OWNED_ITEMS`. The map-and-render pattern in Step 2 absorbs new items with no structural change.
- **Server-component boundary stays the same.** `<Navbar>` continues to resolve auth + roles server-side and pass resolved props to client children (`<UserMenu>`, `<NavbarMobileMenu>`). This feature does not push any auth resolution onto the client.
- **No JSDoc churn beyond the touched component.** Per `CLAUDE.md`, the modified `<UserMenu>` JSDoc summary stays valid (still "User avatar dropdown for the navbar") — update only the body to describe the new groups. The two navbar shell files have no exported components other than `<Navbar>` / `<NavbarMobileMenu>`; their JSDoc already reflects the high-level responsibility and needs only minor wording tweaks if at all.
