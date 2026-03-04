# Sidebar Layout

**Epic:** UI & Layout
**Type:** Feature
**Status:** Completed

## Summary

A toggleable sidebar that contains Search, Brand Filter, Brand Ring Toggle, Header Stats, Color Scheme Mode, and Color Details. Responsive behavior differs between desktop and mobile.

## Acceptance Criteria

- [x] Sidebar contains: Search, Brand Filter, Brand Ring Toggle, Header Stats, Color Scheme Mode, and Color Details
- [x] Sidebar is toggleable (open/close)
- [x] On desktop, the sidebar shrinks the size of the main viewing window (side-by-side layout)
- [x] On mobile, the sidebar overlays the entire screen
- [x] On mobile, an apply button makes the necessary changes and closes the menu

## Implementation Plan

### Current State

The app is in early stage: `page.tsx` owns only `zoom` and `pan` state, with a single `ColorWheel` component rendering fullscreen. No search, filters, brand toggles, color scheme mode, detail panel, or stats components exist yet. The sidebar feature creates the layout shell and placeholder sections for these future features.

### Libraries

This implementation uses three UI libraries, matching the patterns established in the reference project (`grimdark.nathanhealea.com`):

- **DaisyUI v5** — Tailwind CSS component library for styled components (`btn`, `input`, `toggle`, `checkbox`, `menu`, `divider`, `badge`)
- **HeadlessUI v2** — Accessible, unstyled primitives for the mobile overlay sidebar (`Dialog`, `DialogPanel`, `CloseButton`) with built-in transition support
- **HeroIcons v2** — SVG icon library (`Bars3Icon`, `XMarkIcon`, `MagnifyingGlassIcon`, etc.)

### Step 1: Install dependencies and configure DaisyUI

Install packages:
```bash
npm install daisyui @headlessui/react @heroicons/react
```

Update `src/app/globals.css` to register DaisyUI with a custom dark theme:
```css
@import 'tailwindcss';

@plugin 'daisyui' {
  themes: colorwheel --default;
}

@plugin "daisyui/theme" {
  name: "colorwheel";
  default: true;
  prefersdark: true;
  color-scheme: "dark";
  --color-base-100: #0a0a0a;
  --color-base-200: #141414;
  --color-base-300: #2a2a2a;
  --color-base-content: #e5e5e5;
  --color-primary: #6366f1;
  --color-primary-content: #ffffff;
  --radius-selector: 2rem;
  --radius-field: 0.5rem;
  --radius-box: 1rem;
}
```

### Step 2: Add sidebar state to `src/app/page.tsx`

Add `sidebarOpen` boolean state (default `true` on desktop, `false` on mobile). Add a toggle handler passed to both the sidebar and a toggle button.

### Step 3: Create `src/components/Sidebar.tsx`

New component that serves as the sidebar container/shell with two rendering modes.

**Props:**
- `isOpen: boolean` — controls visibility
- `onClose: () => void` — callback to close the sidebar
- `children: React.ReactNode` — sidebar content sections

**Desktop behavior (md+ breakpoint, ≥768px):**
- Renders as a fixed-width panel (`w-80` / 320px) on the left side using `bg-base-200`
- Uses flex layout so the main content area shrinks to fill remaining space
- Smooth width transition via CSS `transition-all duration-300`
- No overlay/backdrop — sits side-by-side with main content

**Mobile behavior (<768px):**
- Uses HeadlessUI `Dialog` + `DialogPanel` for accessible overlay
- Full-screen overlay (`fixed inset-0 z-50 bg-base-200`)
- Built-in transition via `data-[closed]:opacity-0` and `transition duration-200 ease-out`
- Close button at top using `CloseButton` from HeadlessUI + `XMarkIcon` from HeroIcons
- "Apply" DaisyUI `btn btn-primary` fixed at the bottom — closes the sidebar via `onClose`
- Focus trapping and scroll locking handled automatically by HeadlessUI `Dialog`

**Interior layout:**
- Scrollable content area (`overflow-y-auto`) with `p-4`
- Sections separated by DaisyUI `divider` component
- Section headings styled with `text-base-content/60 text-xs font-semibold uppercase`

### Step 4: Update page layout in `src/app/page.tsx`

Restructure the JSX from fullscreen `ColorWheel` to a responsive flex layout:

```tsx
<div className="flex h-screen w-screen overflow-hidden">
  <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
    {/* placeholder sections */}
  </Sidebar>
  <main className="flex-1 relative">
    <button
      className="btn btn-ghost absolute left-3 top-3 z-10"
      onClick={() => setSidebarOpen(true)}
      aria-label="Open menu"
    >
      <Bars3Icon className="size-6" />
    </button>
    <ColorWheel ... />
    {/* existing zoom/reset controls */}
  </main>
</div>
```

On desktop, the sidebar and main sit side-by-side in a flex row. On mobile, the HeadlessUI `Dialog` renders as a fixed overlay so it doesn't affect main content flow.

### Step 5: Add placeholder sections inside the sidebar

Create lightweight placeholder sections using DaisyUI components and HeroIcons. These will be replaced by real implementations in future features:

1. **Search** — DaisyUI `input` with `MagnifyingGlassIcon` from HeroIcons, non-functional placeholder
2. **Brand Filter** — DaisyUI `checkbox` components with brand names and emoji icons, non-functional
3. **Brand Ring Toggle** — DaisyUI `toggle` component, non-functional
4. **Header Stats** — DaisyUI `badge` components showing paint count (from data), non-functional
5. **Color Scheme Mode** — DaisyUI `btn btn-sm` button group (Complementary, Split-Comp, Analogous, None), non-functional
6. **Color Details** — Empty state message ("Select a paint to see details"), non-functional

Each section is separated by a DaisyUI `divider`. Sections can be inline in the sidebar or extracted to `src/components/sidebar/` if they grow.

### Step 6: Verify responsive behavior

- Desktop: sidebar open shrinks the wheel area, sidebar closed gives full width
- Mobile: HeadlessUI `Dialog` overlays with focus trap, apply button closes, main content unaffected
- Touch/scroll within sidebar doesn't interfere with ColorWheel zoom/pan (HeadlessUI scroll lock on mobile)
- Toggle button hidden when sidebar is open on desktop, always visible on mobile

### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `daisyui`, `@headlessui/react`, `@heroicons/react` dependencies |
| `src/app/globals.css` | Modify | Add DaisyUI plugin config with custom "colorwheel" dark theme |
| `src/app/page.tsx` | Modify | Add sidebar state, restructure layout to flex, render Sidebar + toggle button |
| `src/components/Sidebar.tsx` | Create | Sidebar container: desktop flex panel + mobile HeadlessUI Dialog overlay |

### Risks & Considerations

- **ColorWheel resize:** The SVG uses `viewBox` for scaling so resizing the container should work naturally, but verify the wheel re-centers correctly when sidebar opens/closes.
- **Touch event conflicts:** On mobile, HeadlessUI `Dialog` handles scroll locking, which isolates sidebar scroll from ColorWheel interactions.
- **Initial sidebar state:** Default open on desktop for discoverability, default closed on mobile to show the wheel first. Use a `useMediaQuery` hook or `window.matchMedia` check on mount.
- **DaisyUI + Tailwind v4 compatibility:** DaisyUI v5 supports Tailwind v4's `@plugin` directive. Follow the same pattern as the reference project.
- **Theme colors:** The `--color-primary` value (`#6366f1` / indigo) is a starting point — adjust to match the color wheel aesthetic.
