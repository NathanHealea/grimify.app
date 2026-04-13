# Contributing to Grimify

Thank you for your interest in contributing to Grimify! This guide will help you get set up and familiar with the project's conventions.

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [npm](https://www.npmjs.com/) v10+
- [Docker](https://www.docker.com/) (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [GitHub CLI](https://cli.github.com/) (`gh`) for PR workflows

## Getting Started

1. **Clone the repository**

   ```bash
   git clone git@github.com:NathanHealea/grimify.app.git
   cd grimify.app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in the values in `.env.local`:

   | Variable                       | Where to find it                                                                 |
   | ------------------------------ | -------------------------------------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`     | Printed by `npm run db:start` (local: `http://127.0.0.1:54321`) or Supabase dashboard > Project Settings > API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Printed by `npm run db:start` (local: `anon key`) or Supabase dashboard > Project Settings > API               |

   For local development, run `npm run db:start` first -- the command output includes both values.

4. **Start the local Supabase stack**

   ```bash
   npm run db:start
   ```

5. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the app.

## Available Scripts

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
  app/              # Next.js App Router pages (thin route handlers)
  components/ui/    # Shared UI primitives (shadcn/ui + daisyUI-style classes)
  lib/              # Shared utilities
  modules/          # Domain modules (actions, components, types, validation)
  styles/           # daisyUI-style CSS class definitions
supabase/
  config.toml       # Supabase local dev configuration
  migrations/       # Database migrations
  seed.sql          # Seed data
docs/               # Planning and feature documentation
```

Feature code lives in `src/modules/<module>/`. Route pages in `src/app/` should be thin wrappers that import from modules. See `CLAUDE.md` for the full module structure.

## Coding Conventions

### Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

Common types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`

### TypeScript & React

- Use named imports from `react` (no `React.` namespace, no `import * as React`)
- Use `import type` for type-only imports
- Import `useActionState` from `react` (React 19)
- Form components contain only the `<form>` element; layout belongs in the route page

### Styling

- UI primitives use daisyUI-style CSS class names (`.btn`, `.card`, `.input`, etc.)
- Custom CSS classes are defined in `src/styles/*.css`
- Use the `cn()` utility for class merging (`clsx` + `tailwind-merge`)
- Theme tokens use CSS custom properties in OKLch color format

### Documentation

All exported types, functions, components, and constants must have JSDoc comments. See the JSDoc section in `CLAUDE.md` for full conventions.

## Development Workflow

This project follows a documentation-driven workflow:

```
/plan -> /implement -> /stage -> (review PR) -> /release
```

Feature documentation lives in `docs/`. Each feature goes through planning, implementation, staging, and release phases. See `CLAUDE.md` for details.

## Database Changes

- Write migrations in `supabase/migrations/`
- Run `npm run db:reset` to apply migrations locally
- Run `npm run db:types` to regenerate TypeScript types after schema changes

## Reporting Issues

Open an issue on [GitHub](https://github.com/NathanHealea/grimify.app/issues) with a clear description of the problem or feature request.

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
