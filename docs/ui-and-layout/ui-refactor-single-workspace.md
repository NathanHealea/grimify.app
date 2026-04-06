# UI Refactor: Single Workspace Layout

**Epic:** UI & Layout
**Type:** Refactor
**Status:** Todo

## Summary

Replace the current two-tab sidebar (Filters / Collection) with a single-workspace layout inspired by Coolors, Adobe Color, and similar palette tools. The core problems this solves:

1. **Sidebar tab switching is disruptive** — Filters and Collection are mutually exclusive panels, forcing users to switch context constantly
2. **Color details are locked to the Filters tab** — DetailPanel disappears when viewing the Collection tab
3. **Adding to collection requires too many steps** — select on wheel, view in detail panel (Filters tab), click add, switch to Collection tab to verify

The new layout provides:
- A **single sidebar** for filters/tools (no tab switching)
- A **color detail drawer** that opens from any paint interaction regardless of context
- A **persistent collection strip** at the bottom of the sidebar showing the user's collection
- **One-click add/remove** from the detail drawer

## Acceptance Criteria

- [ ] Vertical tab strip (Filters / Collection buttons) is removed
- [ ] Single sidebar contains: filters, brand controls, color scheme, and collection section (stacked, not tabbed)
- [ ] Clicking any paint (wheel, grid, list, collection, search results) opens a detail drawer/panel overlay
- [ ] Detail drawer shows paint info, HSL sliders, add/remove collection, scheme matches, and search results
- [ ] Detail drawer is accessible regardless of sidebar state (works on mobile too)
- [ ] Collection section is always visible in the sidebar (below filters) with search, owned count, and paint list
- [ ] Collection section is collapsible to save space
- [ ] "Owned Ring" and "Owned Only" toggles remain accessible in the collection section
- [ ] Mobile experience: sidebar is a full-screen Dialog (existing pattern), detail drawer is a bottom sheet or modal
- [ ] Duplicate remove-confirmation dialogs consolidated into one implementation
- [ ] No regression in existing filter, search, color scheme, or view mode functionality

## Implementation Plan

### Step 1: Create the ColorDetailDrawer component

**New file:** `src/components/ColorDetailDrawer.tsx`

Extract the DetailPanel rendering logic into a standalone drawer/modal component that can be triggered from anywhere. This replaces the current DetailPanel embedded inside the Filters sidebar.

**Behavior:**
- Desktop: a slide-in panel from the right side (`fixed right-0 top-0 h-full w-80`) overlaying the main content, with a backdrop click to close
- Mobile: a bottom sheet or full-screen Dialog (reuse HeadlessUI Dialog pattern)
- Triggered by setting `selectedGroup` in `usePaintStore` — the drawer auto-opens when a paint/group is selected and closes when deselected
- Contains: paint swatch, name/brand, HSL sliders, hex/HSL values, "Add to Collection" / "Remove from Collection" button, group paint list (for overlapping colors), and scheme/search matches list
- Close button in the header, click-outside to close, Escape key to close

**Key difference from current DetailPanel:**
- Self-contained — reads from `usePaintStore` directly instead of receiving props
- Opens as an overlay, not embedded in sidebar content flow
- Always accessible regardless of sidebar state

**Props:** Minimal — mostly reads from stores. Accept `processedPaints` and `paintGroups` for match navigation.

### Step 2: Consolidate the sidebar into a single panel

**File:** `src/app/page.tsx`

Remove the vertical tab strip and the two `<Sidebar>` instances. Replace with a single `<Sidebar>` containing all controls stacked vertically:

1. **Brand Ring Toggle** (existing `BrandRingToggle`)
2. **Brand Legend** (existing `BrandLegend`)
3. **Brand Filter** (existing `BrandFilterPanel`)
4. **Color Scheme** (existing `ColorSchemePanel`)
5. **Divider**
6. **Collection Section** — collapsible section with:
   - Header: "My Collection (N)" with collapse/expand chevron
   - "Owned Ring" toggle
   - "Owned Only" filter toggle
   - Collection search input
   - Collection paint list (scrollable)

Each section separated by DaisyUI `divider`. The collection section uses a DaisyUI `collapse` or simple state toggle for expand/collapse.

### Step 3: Refactor the sidebar state

**File:** `src/stores/useUIStore.ts`

Simplify sidebar state since there are no longer tabs to switch between:

- Remove `SidebarTab` type (or reduce to just open/closed)
- Remove `lastTab` tracking
- Keep `sidebarOpen: boolean` and `toggleSidebar()` / `closeSidebar()`
- Add `detailDrawerOpen: boolean` (or derive from `selectedGroup !== null` in `usePaintStore`)
- Add `collectionExpanded: boolean` (default `true`) for the collapsible collection section

**File:** `src/types/paint.ts`

Remove or simplify the `SidebarTab` type.

### Step 4: Update paint selection to trigger the drawer

**File:** `src/stores/usePaintStore.ts`

When `selectGroup()`, `selectPaint()`, or `selectSearchResult()` is called, the detail drawer should automatically open. Add a `clearSelection()` action that also closes the drawer.

No new state needed if the drawer visibility is derived from `selectedGroup !== null`.

### Step 5: Wire up the new layout in page.tsx

**File:** `src/app/page.tsx`

New layout structure:
```
<div flex h-screen w-screen flex-col>
  <nav> (navbar with search + sidebar toggle) </nav>
  <div flex flex-1>
    <Sidebar> (single, no tabs)
      <BrandRingToggle />
      <BrandLegend />
      <BrandFilterPanel />
      <ColorSchemePanel />
      <CollectionSection /> (collapsible)
    </Sidebar>
    <main>
      <ViewModeToggle />
      <ColorWheel | GridView | ListView />
      <StatsOverlay />
    </main>
  </div>
  <ColorDetailDrawer /> (overlay, reads from store)
  <RemoveConfirmDialog /> (single instance)
</div>
```

### Step 6: Update CollectionPanel to be an inline section

**File:** `src/components/CollectionPanel.tsx` → rename/refactor to `CollectionSection.tsx`

Adapt from a full sidebar panel to an inline collapsible section:
- Remove the full-panel framing
- Add collapse/expand toggle in the section header
- Keep search, owned ring toggle, owned filter toggle, and paint list
- When a paint is clicked in the collection list, open the detail drawer (not switch sidebar tabs)
- Remove the local `paintToRemove` state — use the consolidated dialog

### Step 7: Consolidate remove-confirmation dialog

**File:** `src/app/page.tsx` (or extract to `src/components/RemoveConfirmDialog.tsx`)

Currently duplicated in both `page.tsx` and `CollectionPanel.tsx`. Consolidate into a single component that reads `paintToRemove` from `usePaintStore` and handles the confirm/cancel flow.

### Step 8: Update Sidebar component

**File:** `src/components/Sidebar.tsx`

Simplify since there's only one sidebar:
- Remove `title` prop (or keep for mobile Dialog header, default to "Filters & Collection")
- Desktop: same side-by-side flex panel behavior
- Mobile: same HeadlessUI Dialog overlay

### Step 9: Clean up unused code

- Remove `getEffectiveTabFromState()` from `useUIStore`
- Remove `toggleTab()` and `toggleMenu()` — replace with single `toggleSidebar()`
- Remove vertical tab strip JSX from `page.tsx`
- Update any imports that referenced the old `SidebarTab` type

### Affected Files

| File | Changes |
|------|---------|
| `src/components/ColorDetailDrawer.tsx` | **New** — standalone detail drawer/modal component |
| `src/components/CollectionSection.tsx` | **New** (or rename from CollectionPanel) — inline collapsible collection section |
| `src/components/RemoveConfirmDialog.tsx` | **New** — consolidated remove confirmation dialog |
| `src/app/page.tsx` | Remove tab strip, consolidate to single sidebar, add drawer + dialog |
| `src/stores/useUIStore.ts` | Simplify sidebar state (remove tabs, add collectionExpanded) |
| `src/stores/usePaintStore.ts` | Ensure selection actions work with drawer pattern |
| `src/types/paint.ts` | Remove or simplify `SidebarTab` type |
| `src/components/Sidebar.tsx` | Simplify (single sidebar, no title switching) |
| `src/components/DetailPanel.tsx` | **Remove** — replaced by ColorDetailDrawer |
| `src/components/CollectionPanel.tsx` | **Remove** — replaced by CollectionSection |

### Risks & Considerations

- **Sidebar height on desktop:** Stacking filters + collection in one sidebar means more scrolling. The collapsible collection section mitigates this — users who don't need the collection list can collapse it. Consider making the filters section collapsible too if the sidebar gets too long.
- **Detail drawer z-index:** The drawer overlays the main content but should not block the sidebar. On desktop, position it to the right of the sidebar. On mobile, it should be a full-screen modal above everything.
- **Mobile detail + sidebar conflict:** If the sidebar Dialog is open and the user taps a paint in the collection list, the detail drawer should open and the sidebar should close (or the drawer opens on top). Need to handle this transition cleanly.
- **Existing docs affected:** The `iconographic-sidebar.md` and `local-color-palettes.md` docs reference the tab strip pattern. After this refactor, the iconographic sidebar doc would need updating (icon rail could still work for sidebar toggle + drawer toggle). The local palettes doc references adding a "Palettes" tab — that would instead become another collapsible section or a drawer view.
- **No new dependencies:** Uses existing HeadlessUI Dialog/Transition patterns. The drawer can be built with HeadlessUI Dialog or plain CSS transitions.
- **Paint selection from collection:** Currently clicking a collection paint calls `selectSearchResult()` which finds the group. This should continue to work — it just also needs to open the detail drawer now.
