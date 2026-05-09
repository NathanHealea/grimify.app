# Paint Details Mobile Action Buttons

**Epic:** Paint Data & Search
**Type:** Bug
**Status:** Todo
**Branch:** `bug/paint-details-mobile-buttons`
**Merge into:** `v1/main`

## Summary

On the paint details page (`/paints/[id]`), the **Save** (collection toggle) and **Add to palette** buttons currently render inline beside the paint name. On phone and tablet viewports the heading and the two buttons are squeezed into a single horizontal row, which makes the heading wrap awkwardly and pushes the action buttons next to a long paint name where they are easy to miss.

This bug repositions the action buttons on **tablet and smaller** viewports:

- **Tablet and smaller (`< lg`, i.e. `< 1024px`):** The action buttons appear in their own row, **below the color swatch and above the paint name**.
- **Laptop / desktop (`≥ lg`, i.e. `≥ 1024px`):** No change — the buttons stay inline beside the paint name as they do today.

## Reproduction

1. Open `/paints/[id]` for any paint on a viewport narrower than the `lg` breakpoint (Tailwind default: `1024px`) — e.g. an iPad in portrait or landscape, or any phone.
2. Sign in (so the buttons render).
3. Observe: the paint name, **Save** button, and **Add to palette** button all sit on one row beside the heading. The buttons crowd the name and the heading wraps awkwardly.

## Expected Behavior

On phones and tablets (`< lg`) the layout should read top-to-bottom:

1. Color swatch
2. **Save** + **Add to palette** action row
3. Paint name (`<h1>`)
4. Brand / product line link
5. Tag chips (paint type, metallic, discontinued)

On `lg` and larger screens the layout stays as it is today: swatch on the left, heading row (name + buttons inline) and the rest stacked to its right.

> Note: the existing `sm:flex-row` rule on the outer swatch/right-column wrapper is **not** changed — the swatch still moves beside the right column at `sm` (≥ 640px). Only the heading-vs-actions arrangement inside the right column moves to the `lg` breakpoint.

## Acceptance Criteria

- [ ] On viewports narrower than `lg` (`< 1024px`, i.e. phones and tablets) the **Save** and **Add to palette** buttons render in a row directly beneath the color swatch and directly above the `<h1>` paint name.
- [ ] On viewports `lg` and wider (`≥ 1024px`) the buttons render inline to the right of the paint name as they do today (no visual regression).
- [ ] The heading row no longer wraps awkwardly on phone or tablet because of the inline buttons.
- [ ] The buttons remain hidden / disabled with the same visibility rules as today (`isAuthenticated`, etc.).
- [ ] The empty action row is **not** rendered for unauthenticated users on phone / tablet (no extra blank space above the heading).
- [ ] No changes to the desktop layout (`≥ lg`), the color values grid, or the hue classification section.
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
flex flex-col items-start gap-6 sm:flex-row          ← unchanged in this fix
├── swatch
└── flex flex-col gap-2
    ├── flex items-center gap-2  ← name + actions inline at every viewport
    │   ├── h1
    │   ├── CollectionToggle
    │   └── AddToPaletteButton
    ├── brand line
    └── tag chips
```

Target structure:

```
flex flex-col items-start gap-6 sm:flex-row          ← unchanged
├── swatch
└── flex flex-col gap-2
    ├── heading-and-actions wrapper                  ← changed
    │   • flex-col on phones + tablets (< lg)        → actions appear above name
    │   • lg:flex-row + lg:items-center              → actions inline, right of name
    ├── brand line
    └── tag chips
```

The `sm:flex-row` on the outer wrapper still flips swatch+right-column to side-by-side at `sm` (640px) — only the heading-vs-actions arrangement inside the right column changes at `lg` (1024px).

Concretely we will use **flex order utilities** (see Step 3) so the actions JSX is mounted exactly once and visually re-positioned per breakpoint.

### Step 3 — Render strategy (one mount, two slots via flex order)

Two approaches were considered:

**(A) Two wrappers, each containing the same JSX** — simple but mounts both `<CollectionToggle>` instances. Each instance owns its own optimistic state, so a click on the tablet/mobile toggle would not visually update the (hidden) desktop toggle until the next server revalidation. On a viewport rotation this could surface stale state.

**(B) Single mount, CSS-positioned** — keep the actions rendered exactly once and use flex `order-*` utilities to place them differently per breakpoint.

We will use **approach B**. Rewrite the inner column as:

```tsx
<div className="flex flex-col gap-2">
  {/* Heading + actions — share a single mount of the actions JSX */}
  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-2">
    {actions && (
      <div className="order-1 flex items-center gap-2 lg:order-2">{actions}</div>
    )}
    <h1 className="order-2 text-3xl font-bold lg:order-1">{paint.name}</h1>
  </div>

  <p className="text-muted-foreground">
    <Link ...>{brand.name}</Link> {' — '} {productLine.name}
  </p>
  <div className="flex flex-wrap gap-2">{/* tag chips ... */}</div>
</div>
```

Notes on this approach:

- On phone and tablet (`< lg`) the wrapper is `flex-col`, so children stack. We assign `order-1` to the actions and `order-2` to the heading so actions appear above the heading.
- On `lg+` the wrapper becomes `lg:flex-row lg:items-center` and we flip the order to put the heading first (`lg:order-1`) and the actions to its right (`lg:order-2`), preserving the current desktop layout.
- The actions JSX is mounted exactly once, so there is no duplicate state.
- When `isAuthenticated` is false, `actions` is `null` and only the heading renders — no empty row appears on phone or tablet.

### Step 4 — Manual QA

Run `npm run dev` and visit `/paints/[id]` for an authenticated user. Confirm:

1. **Phone (≤ `639px`):** stacked column — swatch → action row (Save + Add to palette) → paint name → brand → chips, top-to-bottom.
2. **Small (`640–767px`):** swatch sits on the left (from `sm:flex-row`); the right column stacks action row above the heading, then brand line, then chips.
3. **Tablet (`md` `768–1023px`):** same as small — swatch on the left, right column stacks action row above the heading. **This is the new behavior** previously the actions were inline at this breakpoint.
4. **Laptop / desktop (`≥ lg` `1024px+`):** unchanged from `main` — swatch on the left; right column shows heading row with name + actions inline, then brand line, then chips.
5. **Unauthenticated:** no action row appears on phone/tablet (no empty gap above the heading); on desktop the heading sits alone, as today.
6. **Toggling Save** on a tablet viewport updates the icon/state correctly (validates approach B's single-mount choice).
7. **Long paint names** wrap to a second line on phone/tablet without overlapping the action row.
8. **Tag chips** still wrap correctly under the heading at every viewport.
9. Run `npm run build` and `npm run lint` — both clean.

## Risks & Considerations

- **Single mount vs duplicated mount.** Using `lg:hidden` / `hidden lg:flex` to render the actions in two places would mount `<CollectionToggle>` and `<AddToPaletteButton>` twice. Each maintains its own optimistic state (e.g., the heart icon updates immediately on click). Two independent mounts would visually diverge between the hidden and visible copy on a viewport-rotation event. The plan uses **flex order utilities** (approach B in Step 3) to keep a single mount, eliminating this risk.
- **`lg:flex-row` on the inner wrapper.** The outer wrapper uses `sm:flex-row` to put the swatch beside the right column at `≥ 640px`. The new inner heading-vs-actions wrapper uses `lg:flex-row` so it only flips inline at `≥ 1024px`. The two breakpoints intentionally differ — `sm` for swatch placement, `lg` for action placement. Confirm visually at the `md` breakpoint (e.g. `768px–1023px`) that the swatch is to the left while the actions remain stacked above the name in the right column.
- **Vertical centering on `lg+`.** `lg:items-center` should keep the heading + buttons vertically centered (matches today's `items-center`). If the buttons look misaligned with the larger `text-3xl` heading, switch to `lg:items-baseline` or add `lg:py-1` padding on the actions.
- **Tailwind `order` utilities** require the parent to be `flex` (or `grid`); the wrapper is `flex flex-col` on phone/tablet and `lg:flex-row` on desktop, so `order-*` is valid at every breakpoint.
- **Spacing.** `gap-2` is applied at every viewport (`gap-2 lg:gap-2`), so the vertical gap between action row and heading on tablet matches the horizontal gap between heading and inline actions on desktop. No spacing regression expected.
- **New responsive breakpoint introduced for this concern.** The component's existing layout uses `sm` only. This fix introduces `lg` as a second breakpoint inside the heading block. That is acceptable — `lg` is already used elsewhere in the project (e.g. `paint-references.tsx`, palette grids) and matches the conventional "tablet vs desktop" cutoff.
- **No service / data changes.** This is a pure layout fix; no schema, action, or API surface is touched.
