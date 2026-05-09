# Paint Details Mobile Action Buttons

**Epic:** Paint Data & Search
**Type:** Bug
**Status:** Todo
**Branch:** `bug/paint-details-mobile-buttons`
**Merge into:** `v1/main`

## Summary

On the paint details page (`/paints/[id]`), the **Save** (collection toggle) and **Add to palette** buttons currently render inline beside the paint name. On narrow viewports the heading and the two buttons are squeezed into a single horizontal row, which makes the heading wrap awkwardly and pushes the action buttons next to a long paint name where they are easy to miss.

This bug repositions the action buttons on mobile only:

- **Mobile (`< sm`):** The action buttons appear in their own row, **below the color swatch and above the paint name**.
- **Small screens and up (`≥ sm`):** No change — the buttons stay inline beside the paint name as they do today.

## Reproduction

1. Open `/paints/[id]` for any paint on a viewport narrower than the `sm` breakpoint (Tailwind default: `640px`).
2. Sign in (so the buttons render).
3. Observe: the paint name, **Save** button, and **Add to palette** button all sit on one row beside the heading. The buttons crowd the name and the heading wraps under the swatch awkwardly.

## Expected Behavior

On mobile the layout should read top-to-bottom:

1. Color swatch
2. **Save** + **Add to palette** action row
3. Paint name (`<h1>`)
4. Brand / product line link
5. Tag chips (paint type, metallic, discontinued)

On `sm` and larger screens the layout stays as it is today: swatch on the left, heading row (name + buttons) and the rest stacked to its right.

## Acceptance Criteria

- [ ] On viewports narrower than `sm` the **Save** and **Add to palette** buttons render in a row directly beneath the color swatch and directly above the `<h1>` paint name.
- [ ] On viewports `sm` and wider the buttons render inline to the right of the paint name as they do today (no visual regression).
- [ ] The heading row no longer wraps awkwardly on mobile because of the inline buttons.
- [ ] The buttons remain hidden / disabled with the same visibility rules as today (`isAuthenticated`, etc.).
- [ ] The empty action row is **not** rendered for unauthenticated users on mobile (no extra blank space above the heading).
- [ ] No changes to the desktop / tablet layout, color values grid, or hue classification section.
- [ ] `npm run build` and `npm run lint` pass with no new errors.

## Out of Scope

- Restyling the buttons themselves (size, color, icon).
- Changing the action set (e.g., adding share, copy hex).
- Refactoring `CollectionToggle` or `AddToPaletteButton` internals.
- Changes to other paint surfaces (paint cards, hue pages, palette builder rows).

## Key Files

| Action | File                                                          | Description                                                                                                  |
| ------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Modify | `src/modules/paints/components/paint-detail.tsx`              | Restructure the heading block: extract the action buttons into a sibling row that is shown only on mobile, kept inline on `sm+`. |

No other files need to change. The page (`src/app/paints/[id]/page.tsx`) just renders `<PaintDetail>` and is unaffected.

## Implementation Plan

### Step 1 — Extract the action buttons into a reusable fragment

Inside `paint-detail.tsx`, pull the `<CollectionToggle>` + `<AddToPaletteButton>` pair into a single local fragment / variable, e.g.:

```tsx
const actions = isAuthenticated ? (
  <div className="flex items-center gap-2">
    <CollectionToggle ... />
    <AddToPaletteButton ... />
  </div>
) : null
```

Rationale: rendering the same node tree twice (once for mobile, once for desktop) duplicates internal state and event handlers and risks subtle bugs in toggles. Storing the JSX in a variable lets us **conditionally place** it without duplicating it.

### Step 2 — Restructure the swatch + heading block

Today the structure is:

```
flex flex-col items-start gap-6 sm:flex-row
├── swatch
└── flex flex-col gap-2
    ├── flex items-center gap-2  ← name + actions inline
    │   ├── h1
    │   ├── CollectionToggle
    │   └── AddToPaletteButton
    ├── brand line
    └── tag chips
```

Change it to:

```
flex flex-col items-start gap-6 sm:flex-row
├── swatch
└── flex flex-col gap-2
    ├── {actions} rendered ONLY on mobile        ← new (sm:hidden)
    ├── flex items-center gap-2
    │   ├── h1
    │   └── {actions} rendered ONLY on sm+       ← (hidden sm:flex)
    ├── brand line
    └── tag chips
```

Concretely:

1. Insert a mobile-only wrapper directly above the heading row:

   ```tsx
   {actions && (
     <div className="flex items-center gap-2 sm:hidden">{actions}</div>
   )}
   ```

   This wrapper renders only when `isAuthenticated` is true (because `actions` is `null` otherwise), so unauthenticated users do not see an empty row.

2. In the existing heading row, wrap the actions so they only render on `sm+`:

   ```tsx
   <div className="flex items-center gap-2">
     <h1 className="text-3xl font-bold">{paint.name}</h1>
     {actions && (
       <div className="hidden items-center gap-2 sm:flex">{actions}</div>
     )}
   </div>
   ```

3. The same `actions` JSX is referenced twice in the source, but only **one** of the two `<div>` wrappers is visible on a given viewport — the other is removed by `display: none` via `sm:hidden` / `hidden sm:flex`. This means the toggle state lives in one place per render (React still mounts both subtrees, but each instance renders independently and the hidden one is purely visual). To avoid duplicate mounted toggles, we instead render the actions once and place it in the correct slot via a ternary on viewport using a CSS-only solution — see _Risks & Considerations_ below.

### Step 3 — Decide the rendering strategy (one mount, two slots)

Two viable approaches:

**(A) Two wrappers, each containing the same JSX** — simple but mounts both `<CollectionToggle>` instances. Each instance owns its own optimistic state, so a click on the mobile toggle would not visually update the (hidden) desktop toggle until the next server revalidation. On a viewport rotation this could surface stale state.

**(B) Single mount, CSS-positioned** — keep the actions rendered exactly once, and use CSS / order utilities to place them differently per breakpoint. Concretely, change the heading block to use `flex flex-col` so the actions row can be ordered above the heading on mobile and to the right of the heading on desktop.

We will use **approach B**. Rewrite the inner column as:

```tsx
<div className="flex flex-col gap-2">
  {/* Action row + heading row — share a single mount of the actions */}
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
    {actions && (
      <div className="order-1 flex items-center gap-2 sm:order-2">{actions}</div>
    )}
    <h1 className="order-2 text-3xl font-bold sm:order-1">{paint.name}</h1>
  </div>

  <p className="text-muted-foreground">
    <Link ...>{brand.name}</Link> {' — '} {productLine.name}
  </p>
  <div className="flex flex-wrap gap-2">{/* tag chips ... */}</div>
</div>
```

Notes on this approach:

- On mobile the wrapper is `flex-col`, so children stack. We assign `order-1` to the actions and `order-2` to the heading so actions appear above the heading.
- On `sm+` the wrapper becomes `flex-row sm:items-center` and we flip the order to put the heading first (`sm:order-1`) and the actions to its right (`sm:order-2`), preserving the current desktop layout.
- The actions JSX is mounted exactly once, so there is no duplicate state.
- When `isAuthenticated` is false, `actions` is `null` and only the heading renders — no empty row appears on mobile.

### Step 4 — Manual QA

Run `npm run dev` and visit `/paints/[id]` for an authenticated user. Confirm:

1. **Mobile (≤ `639px`):** swatch → action row (Save + Add to palette) → paint name → brand → chips, top-to-bottom.
2. **Small (≥ `640px`):** swatch on the left; right column shows heading row with name + actions inline, then brand line, then chips. Visually matches `main` before this change.
3. **Tablet/desktop (`md`, `lg`):** unchanged.
4. **Unauthenticated:** no action row appears on mobile (no empty gap above the heading); on desktop the heading sits alone, also as today.
5. **Toggling Save** on mobile updates the icon/state correctly (validates approach B's single-mount choice).
6. **Long paint names** wrap to a second line on mobile without overlapping the action row.
7. **Tag chips** still wrap correctly under the heading.
8. Run `npm run build` and `npm run lint` — both clean.

## Risks & Considerations

- **Single mount vs duplicated mount.** Using `sm:hidden` / `hidden sm:flex` to render the actions in two places would mount `<CollectionToggle>` and `<AddToPaletteButton>` twice. Each maintains its own optimistic state (e.g., the heart icon updates immediately on click). Two independent mounts would visually diverge between the hidden and visible copy on a viewport-rotation event. The plan uses **flex order utilities** (approach B in Step 3) to keep a single mount, eliminating this risk.
- **`sm:flex-row` on the inner wrapper.** The outer wrapper already uses `sm:flex-row` to put the swatch beside the right column. The new inner wrapper inside the right column also uses `sm:flex-row`. Confirm visually that `sm:items-center` on the inner row keeps the heading + buttons vertically centered (matches today). If the buttons look misaligned, switch to `sm:items-baseline` or pad the heading.
- **Tailwind `order` utilities** require the parent to be `flex` (or `grid`); the wrapper is `flex flex-col` on mobile and `sm:flex-row` on desktop, so `order-*` is valid on both.
- **Existing `gap-2` between heading and inline actions** is preserved on desktop because the wrapper uses `sm:gap-2`. On mobile we keep `gap-2` between the action row and the heading so the spacing matches the rest of the column.
- **No new responsive breakpoints introduced.** The fix uses the existing `sm` breakpoint that the rest of the component already uses, so the change is consistent with the file's responsive style.
- **No service / data changes.** This is a pure layout fix; no schema, action, or API surface is touched.
