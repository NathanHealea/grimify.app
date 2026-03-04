# Project Overview

**Color Wheel** is an interactive color wheel for miniature paints by Vallejo, Green Stuff World, Citadel, and Army Painter. It maps 190+ paints by hue and lightness onto an SVG-based circular visualization, helping hobbyists find colors, compare across brands, and explore color relationships.

## What It Does

The app serves miniature painters who want to:

- **Visualize** their paint collection on an interactive color wheel mapped by hue (angle) and lightness (radius)
- **Compare** paints across brands to find duplicates and alternatives
- **Explore** color relationships using complementary, split complementary, and analogous schemes
- **Search** paints by name, hex code, or brand

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js (App Router), React, TypeScript |
| **Styling** | Tailwind CSS, DaisyUI |
| **UI Components** | Headless UI, Heroicons |

---

## Status Key

| Status | Description |
|---|---|
| **Todo** | Not started — no acceptance criteria completed |
| **In Progress** | Partially implemented — some acceptance criteria completed |
| **Completed** | Fully implemented — all acceptance criteria completed |

## MVP Features (Epics)

<!--
Epic Template:

### Epic N: [Name]
**Goal:** [What this epic delivers to the user]

**High-Level Scope:**
- [Capability or user story]
- [Capability or user story]
- [Capability or user story]
-->

## Implementation Order

| Order | Epic | Rationale |
|---|---|---|
| 1 | Paint Database | Foundation — all features depend on paint data |
| 2 | Color Wheel Visualization | Core feature — renders the wheel and paint interactions |
| 3 | UI & Layout | Sidebar and stats bar provide the shell for remaining features |
| 4 | Paint Information | Detail panel populates the sidebar with paint data |
| 5 | Brand Features | Filtering, rings, and legend layer on top of the wheel and sidebar |
| 6 | Color Analysis | Color schemes and search are advanced features that enhance the base experience |

---

### Epic 1: Paint Database

**Goal:** Establish the paint data foundation that all other features depend on.

**High-Level Scope:**

- [x] [Paint database](./paint-information/paint-database.md)

### Epic 2: Color Wheel Visualization

**Goal:** Provide an interactive SVG-based color wheel that maps paints by hue and lightness with zoom, pan, and reset controls.

**High-Level Scope:**

- [x] [Interactive color wheel (zoom, pan, reset)](./color-wheel-visualization/interactive-color-wheel.md)
- [ ] [Paint selection and hover](./color-wheel-visualization/paint-selection-and-hover.md)

### Epic 3: UI & Layout

**Goal:** Provide a responsive layout with a toggleable sidebar for controls and stats.

**High-Level Scope:**

- [x] [Sidebar layout](./ui-and-layout/sidebar-layout.md)
- [ ] [Header stats](./ui-and-layout/header-stats.md)

### Epic 4: Paint Information

**Goal:** Display detailed paint information in the sidebar.

**High-Level Scope:**

- [ ] [Detail panel](./paint-information/detail-panel.md)

### Epic 5: Brand Features

**Goal:** Allow users to filter, identify, and explore paints by brand.

**High-Level Scope:**

- [ ] [Brand filtering](./brand-features/brand-filtering.md)
- [ ] [Brand ring toggle](./brand-features/brand-ring-toggle.md)
- [ ] [Brand legend](./brand-features/brand-legend.md)

### Epic 6: Color Analysis

**Goal:** Help users explore color relationships and find paints through search and color scheme modes.

**High-Level Scope:**

- [ ] [Color scheme modes (complementary, split complementary, analogous)](./color-analysis/color-scheme-modes.md)
- [ ] [Search](./color-analysis/search.md)
