# Grimify

> Interactive color research and collection management for miniature painters.

Grimify is a web app for hobbyist and competitive miniature painters who want to make intentional color choices, track what they own, and share their craft. It pairs a visual paint library mapped onto an interactive color wheel with cross-brand substitute matching, color theory tools, personal palettes, step-by-step recipes, and a growing community catalog.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Auth_%2B_DB-3ecf8e?logo=supabase)

---

## Features

### Paint Library & Search

- Searchable database of miniature paints across major manufacturers
- Search by name, hex code, or brand
- Brand and product-line browsing
- Hue-based organization using a Munsell-derived system

### Interactive Color Wheel (No currently publicly available)

- Paints mapped spatially by hue and lightness for at-a-glance discovery
- Zoom and pan, with markers that scale intelligently
- Filter by brand, collection, or owned paints
- HSL wheel view with Itten segment boundaries

### Color Theory Tools

- Generate complementary, split-complementary, analogous, and triadic schemes
- Visualize schemes on the wheel
- Map schemes back to paints you actually have

### Personal Palettes

- Build palettes from any paint — owned or wishlisted
- Drag-and-drop reorder
- Group paints within a palette (basecoats, highlights, metallics, etc.)
- Hue-locked HSL swap to find lighter or more saturated alternatives
- Markdown descriptions

### Painting Recipes

- Step-by-step guides with sections, steps, and per-step paints with mixing ratios
- Photos at recipe and step level with lightbox view
- Freeform notes attachable to the recipe or individual steps

### Community

- Public catalogs for palettes, recipes, and schemes
- Share-friendly OpenGraph previews for paints, palettes, recipes, brands, hues, and users
- User profiles and shared collections

### Collection Tracking

- Log paints you own with a one-click toggle from any paint card
- Personal collection dashboard
- Emphasized rendering on the color wheel for owned paints

### Admin Tools

- User and role management (CRUD, assignment, account merging)
- Brand, hue, and paint catalog management
- Admin oversight of any user's collection and (soon) purchase list

See [`docs/overview.md`](docs/overview.md) for the complete epic-level roadmap and current status.

---

## Tech Stack

| Layer            | Technology                                                   |
| ---------------- | ------------------------------------------------------------ |
| Framework        | [Next.js 16](https://nextjs.org/) (App Router, Turbopack)    |
| UI               | [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/) |
| Styling          | [Tailwind CSS 4](https://tailwindcss.com/) with daisyUI-style utility classes |
| Components       | [shadcn/ui](https://ui.shadcn.com/) primitives + [Radix UI](https://www.radix-ui.com/) |
| Drag and drop    | [@dnd-kit](https://dndkit.com/)                              |
| Backend          | [Supabase](https://supabase.com/) — Postgres, Auth, Storage, RLS |
| Toasts           | [sonner](https://sonner.emilkowal.ski/)                      |
| Tooling          | ESLint, Prettier, tsx                                        |

---

## Getting Started

### Prerequisites

- Node.js v20+
- Docker (for the local Supabase stack)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)

### Setup

```bash
# 1. Clone
git clone git@github.com:NathanHealea/grimify.app.git
cd grimify.app

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# (printed by `db:start` for local dev, or from the Supabase dashboard
#  under Project Settings > API for hosted instances)

# 4. Start local Supabase
npm run db:start

# 5. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and you're in.

---

## Scripts

| Script                       | Description                                          |
| ---------------------------- | ---------------------------------------------------- |
| `npm run dev`                | Start the Next.js dev server                         |
| `npm run build`              | Create an optimized production build                 |
| `npm run start`              | Run the production build                             |
| `npm run lint`               | Run ESLint                                           |
| `npm run format`             | Format with Prettier and auto-fix lint issues        |
| `npm run db:start`           | Start the local Supabase stack                       |
| `npm run db:stop`            | Stop the local Supabase stack                        |
| `npm run db:restart`         | Restart the local Supabase stack                     |
| `npm run db:reset`           | Reset the local database (re-runs migrations + seed) |
| `npm run db:status`          | Print local Supabase status and URLs                 |
| `npm run db:types`           | Regenerate TypeScript types from the local schema    |
| `npm run db:seed:generate`   | Regenerate `seed.sql` from authored fixtures         |
| `npm run db:paints:recalculate` | Recompute derived paint color values              |

---

## Project Structure

Grimify follows a **domain module** architecture — every feature lives inside `src/modules/<module>/`, and route pages stay thin.

```
src/
  app/                    # Next.js App Router pages (layout + data fetching only)
  components/ui/          # Shared UI primitives (button, input, dialog, ...)
  lib/                    # Shared utilities
  modules/                # Feature modules — each owns one domain
    <module>/
      actions/            # Server actions (one file per action)
      components/         # React components owned by the module
      services/           # Data access and domain logic
      types/              # Type declarations (one file per type)
      utils/              # Module-internal helpers
      validation.ts       # Validation rules
  styles/                 # daisyUI-style CSS class definitions
  types/                  # Generated Supabase types
supabase/
  config.toml             # Supabase CLI configuration
  migrations/             # Database migrations
  seed.sql                # Seed data
scripts/                  # One-off operational scripts
docs/                     # Planning and feature documentation
```

The full architecture rules — including the file-per-export convention, no barrel files, and route-page constraints — live in [`CLAUDE.md`](CLAUDE.md).

---

## Documentation

- [`docs/overview.md`](docs/overview.md) — Roadmap, epics, and status overview
- [`docs/<epic>/`](docs/) — One folder per epic with per-feature plans
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — Setup, conventions, and workflow
- [`CLAUDE.md`](CLAUDE.md) — Architecture conventions and AI-assist guidance

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, coding conventions, and the `/plan` → `/implement` → `/stage` → `/release` feature workflow.

---

## License

Privately maintained by [Nathan Healea](https://github.com/NathanHealea). All rights reserved.
