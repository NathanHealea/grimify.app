# Grimify

Interactive color research and collection management app for miniature painters. Combines a visual paint library, cross-brand comparison tools, color theory exploration, and a social community for sharing recipes, palettes, and collections.

## Tech Stack

- [Next.js](https://nextjs.org/) 16 (App Router)
- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/) 5
- [Tailwind CSS](https://tailwindcss.com/) 4 with daisyUI-style utility classes
- [shadcn/ui](https://ui.shadcn.com/) component primitives
- [Supabase](https://supabase.com/) (Auth, Database, Storage)

## Getting Started

### Prerequisites

- Node.js v20+
- Docker (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)

### Setup

```bash
# Clone the repository
git clone git@github.com:NathanHealea/grimify.app.git
cd grimify.app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# (printed by db:start for local dev, or from Supabase dashboard > Project Settings > API)

# Start the local Supabase stack
npm run db:start

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

| Script           | Description                                      |
| ---------------- | ------------------------------------------------ |
| `npm run dev`    | Start the Next.js development server             |
| `npm run build`  | Create an optimized production build              |
| `npm run lint`   | Run ESLint                                        |
| `npm run format` | Format code with Prettier and fix lint issues     |
| `npm run db:start`   | Start the local Supabase stack              |
| `npm run db:stop`    | Stop the local Supabase stack               |
| `npm run db:restart` | Restart the local Supabase stack            |
| `npm run db:reset`   | Reset the local database (runs migrations)  |
| `npm run db:types`   | Generate TypeScript types from the database |

## Project Structure

```
src/
  app/              # Next.js App Router pages
  components/ui/    # Shared UI primitives
  lib/              # Shared utilities
  modules/          # Feature modules (actions, components, types, validation)
  styles/           # daisyUI-style CSS class definitions
supabase/
  config.toml       # Supabase local dev configuration
  migrations/       # Database migrations
  seed.sql          # Seed data
docs/               # Planning and feature documentation
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, coding conventions, and development workflow.

## License

This project is privately maintained by [Nathan Healea](https://github.com/NathanHealea).
