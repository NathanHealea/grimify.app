# Iconographic Sidebar Navigation

**Epic:** UI & Layout
**Type:** Refactor
**Status:** Todo

## Summary

Refactor the sidebar navigation from the current vertical text tab strip into an iconographic sidebar rail. The rail displays icons representing each panel (Filters, Collection, Palette). Clicking an icon expands the sidebar to reveal that panel's content. A second click collapses it. The design follows a pattern similar to VS Code / Untitled UI sidebar navigation — a narrow icon rail that expands into a content panel — implemented with DaisyUI elements.

## Acceptance Criteria

- [ ] A narrow icon rail replaces the current vertical text tab strip on the left edge
- [ ] The rail contains icons for: Filters (funnel), Collection (archive/box), Palette (swatch — placeholder for future feature)
- [ ] Clicking an icon expands the sidebar to show that panel's content; clicking the active icon collapses it
- [ ] The active icon has a visual indicator (highlighted background or accent border)
- [ ] DaisyUI tooltip shows the panel name on icon hover
- [ ] On mobile, clicking an icon opens the panel as a full-screen Dialog overlay (preserving current mobile behavior)
- [ ] The Palette icon is present but shows a "Coming soon" placeholder panel
- [ ] Existing filter and collection panel content/behavior is unchanged
- [ ] The hamburger menu button in the navbar is removed (the icon rail replaces it)

## Implementation Plan

### Step 1: Update the `SidebarTab` type

In `src/app/page.tsx`, extend the `SidebarTab` type to include the future palette panel:

```ts
type SidebarTab = 'filters' | 'collection' | 'palette'
```

### Step 2: Create `IconRail` component

Create `src/components/IconRail.tsx` — a narrow vertical strip of icon buttons:

```tsx
interface IconRailProps {
  activeTab: SidebarTab | null
  onTabClick: (tab: SidebarTab) => void
}
```

Implementation details:
- Fixed-width column (`w-12`) with `bg-base-200` and a right border
- Each icon is a `button` with DaisyUI `btn btn-ghost btn-square btn-sm` classes
- Use Heroicons: `AdjustmentsHorizontalIcon` (Filters), `ArchiveBoxIcon` (Collection), `SwatchIcon` (Palette)
- Active tab gets `bg-base-300` background + a left accent border (`border-l-2 border-primary`)
- Wrap each button in a DaisyUI `tooltip tooltip-right` with the panel name
- Icons are stacked at the top; the rail stretches full height

### Step 3: Refactor `Sidebar.tsx`

Simplify `Sidebar.tsx` to only handle the expandable content panel (remove the concept of "which tab" — it just receives `isOpen` and `children`):

- Desktop: keep the current flex panel behavior (`w-80` when open, `w-0` when closed) but remove the title bar since the icon rail handles navigation
- Mobile: keep the HeadlessUI Dialog behavior but add the panel title back (passed as prop)
- Export `useIsDesktop` as before

No major structural change — the component already works this way. Just ensure the desktop variant doesn't render a redundant header.

### Step 4: Refactor `page.tsx` layout

Replace the current vertical tab strip + dual `<Sidebar>` pattern with:

1. **Remove** the hamburger menu button from the navbar (lines 251-256) — the icon rail is always visible
2. **Remove** the vertical tab strip `<div>` (lines 290-309)
3. **Add** `<IconRail>` before the sidebar content area
4. **Consolidate** to a single `<Sidebar>` that renders the active tab's content:

```tsx
<div className='flex flex-1 overflow-hidden'>
  <IconRail activeTab={effectiveTab} onTabClick={handleTabToggle} />
  <Sidebar isOpen={effectiveTab !== null} onClose={() => setSidebarState('closed')} title={effectiveTab ?? ''}>
    {effectiveTab === 'filters' && (
      <>
        {/* existing filters content */}
      </>
    )}
    {effectiveTab === 'collection' && (
      <CollectionPanel ... />
    )}
    {effectiveTab === 'palette' && (
      <div className='flex flex-col items-center justify-center py-12 text-base-content/40'>
        <SwatchIcon className='size-12 mb-2' />
        <p className='text-sm'>Color Palettes</p>
        <p className='text-xs'>Coming soon</p>
      </div>
    )}
  </Sidebar>
  <main ...>
    ...
  </main>
</div>
```

### Step 5: Clean up `handleMenuToggle`

Remove `handleMenuToggle` since the hamburger button is gone. The `handleTabToggle` callback already handles open/close toggling. Simplify `lastTab` tracking if needed.

### Step 6: Mobile adjustments

On mobile, the `IconRail` should still be visible (it replaces the hamburger menu). When an icon is tapped:
- The `Sidebar` opens as a Dialog overlay (existing behavior)
- The Dialog title reflects the active panel name

The icon rail stays visible on mobile at the left edge. The Dialog opens on top of the main content but beside the rail.

### Affected Files

| File | Changes |
|------|---------|
| `src/components/IconRail.tsx` | **New** — icon rail component with tab icons and tooltips |
| `src/components/Sidebar.tsx` | Simplify desktop variant (remove redundant header), keep mobile Dialog |
| `src/app/page.tsx` | Remove hamburger button and vertical tab strip, add IconRail, consolidate to single Sidebar with conditional content, extend SidebarTab type, remove handleMenuToggle |

### Risks & Considerations

- **Mobile icon rail width**: On very small screens, the 48px rail may feel large. Consider hiding the rail on mobile and keeping the hamburger menu as a fallback, or making the rail narrower (`w-10`)
- **Palette tab is a placeholder**: It should be clearly marked as "coming soon" and not confuse users into thinking it's broken
- **Tooltip accessibility**: DaisyUI tooltips are CSS-only and may not be screen-reader friendly — consider adding `aria-label` to each icon button as well
- **Transition animation**: The sidebar expand/collapse animation already exists in `Sidebar.tsx` (`transition-all duration-300`). Ensure it still feels smooth with the new layout
- **State persistence**: The current `sidebarState` / `lastTab` logic should still work — just make sure the default open tab on desktop still opens Filters
