# Project Initialization Prompt

Im working on creating an interactive color wheel for model paints by Vellejo, Green Stuff World, Citadel, and Army Painter. This application will be using nextjs, tailwindcss, DaisyUI, headlessUI, heroicon. It will follow the Agile methodology to break features down. Before implementing any functionality, I want to plan out a feature set for the MVP. First, I want an overview.md that documents the project overview, tech stack, status key, mvp features (epcis) with features as check boxes and links to feature file. The documents directory will be organized by epic, with each feature being a document within. Follow the same workflow as described in grimdark.nathanhealea.com.

included in this document are sections, each are features. Create the necessary documents  and update the overview.md as needed. Ask questions for clarification. These feature documents do not need to have implementation plans. Just details about the feature for the /plan command to execute efficiently. 

## Interactive Color Wheel

SVG-based circular visualization that maps miniature paints by hue (angle) and lightness (radius). Light colors sit near the center, dark colors at the edge. Six labeled color segments divide the wheel: Red, Yellow, Green, Cyan, Blue, and Magenta. A continuous hue ring around the outer edge provides a color reference.

- **Zoom** — scroll to zoom in/out (0.4x to 8x range)
- **Pan** — click and drag to reposition the wheel
- **Reset** — button restores default zoom and pan

Paint labels appear automatically when zoom exceeds 2x.

UI: The interactive color wheel center on the page, takes up majority of the page. 

## Paint Selection & Hover

- Hover over a paint circle to preview its details in the side panel
- Click a paint to select it (persists until clicked again or another paint is selected)
- Selected paints show a dashed white ring; hovered paints glow

## Detail Panel

Displays information for the selected or hovered paint:

- **Color swatch** with glow shadow
- **Name, brand, and brand icon**
- **Paint type and finish** (currently all Matte)
- **Hex value**
- **HSL breakdown** — numeric values plus visual gradient sliders for Hue, Saturation, and Lightness
- **Duplicate detection** — lists all paints sharing the same hex code across brands
- **Scheme/search matches** — scrollable list of paints matching the active color scheme or search query

When no color is selected, the panel show the color black, with -- for string values and 0 for numeric values. 

## Color Scheme Modes

Select a paint then choose a scheme to highlight matching paints on the wheel. Non-matching paints dim to near-invisible. Matching regions are shown as translucent wedge overlays.

| Scheme               | Matching Rule                  |
|----------------------|--------------------------------|
| Complementary        | Hue distance > 155°            |
| Split Complementary  | Hue distance between 120°–180° |
| Analogous            | Hue distance < 45°             |

A "No Scheme" option shows all paints without filtering.

## Search

Text search across paint name, hex code, and brand name. Matching paints are highlighted on the wheel with a yellow ring and glow filter. Non-matching paints dim. Results appear in the detail panel as a scrollable list. A clear button (✕) resets the search.

## Brand Filtering

Filter the wheel to show paints from a single brand or all brands. Options: All, Citadel, Army Painter, Vallejo, Green Stuff World. Each brand button uses the brand's color.

## Brand Ring Toggle

A "Brand Ring" toggle adds colored arc segments around paint circles to indicate brand ownership. For paints with duplicate hex values across brands, the ring is split into segments (one per brand). A yellow badge shows the duplicate count.

## Brand Legend

Side panel showing each brand's color dot, icon, name, and the count of paints currently visible (respects active brand filter).

## Header Stats

Displays total paint count, unique color count, and search match count (when searching).

## UI

For the Search, Brand Filter, Brand Rin Toggle, Headers Stats, Color Scheme Mode, and Color Details should all be in a toggle sidebar side bar. On desk top the sidebar shrinks the size of the main viewing window. On mobile it overlays the entire screen, an apply button then makes the nessary changes an closes the menu. 

## Paint Database

190+ paints from four brands stored as lightweight js objects:

| Brand             | Icon | Paint Type   |
|-------------------|------|--------------|
| Citadel           | ⚔️    | Base, Layer, Edge |
| Army Painter      | 🛡️    | Warpaints    |
| Vallejo           | 🎯    | Game Color   |
| Green Stuff World | 🧪    | Acrylic      |
