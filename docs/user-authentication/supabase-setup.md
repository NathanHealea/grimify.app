# Supabase Setup

**Epic:** User Authentication
**Type:** Feature
**Status:** Todo

## Summary

Install and configure Supabase for the colorwheel project. This is the foundation feature that all other auth features depend on. Set up the Supabase project, install packages, create server/client helpers, and add middleware for session management.

## Acceptance Criteria

- [ ] `@supabase/supabase-js` and `@supabase/ssr` packages installed
- [ ] Supabase project initialized (`supabase init`) with `config.toml`
- [ ] Server-side Supabase client helper at `src/lib/supabase/server.ts` using cookie-based auth
- [ ] Browser-side Supabase client helper at `src/lib/supabase/client.ts`
- [ ] Environment variables documented (`.env.example`) and added to `.env.local`
- [ ] Next.js middleware at `src/middleware.ts` refreshes auth session on every request
- [ ] Supabase types generated (if using CLI) or base types defined

## Implementation Plan

### Step 1: Install dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
npx supabase init
```

### Step 2: Create Supabase client helpers

Follow the grimdark reference pattern:

**`src/lib/supabase/server.ts`** — Server-side client using `createServerClient` from `@supabase/ssr` with cookie management via `next/headers`.

**`src/lib/supabase/client.ts`** — Browser client using `createBrowserClient` from `@supabase/ssr` for client components.

### Step 3: Create middleware

**`src/middleware.ts`** — Refresh auth session on every request by calling `supabase.auth.getUser()`. Define public routes that don't require auth. Use `matcher` config to exclude static assets and API routes.

### Step 4: Configure environment

Create `.env.example` with:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Add actual values to `.env.local` (gitignored).

### Step 5: Update next.config.ts if needed

No changes expected — Supabase works with default Next.js config.

### Affected Files

| File | Changes |
|------|---------|
| `package.json` | Add `@supabase/supabase-js`, `@supabase/ssr` |
| `src/lib/supabase/server.ts` | New — server-side Supabase client |
| `src/lib/supabase/client.ts` | New — browser-side Supabase client |
| `src/middleware.ts` | New — session refresh middleware |
| `supabase/config.toml` | New — Supabase local config |
| `.env.example` | New — env var template |

### Risks & Considerations

- The app is currently entirely client-side (`"use client"`). The middleware and server helpers introduce server-side rendering concerns. Ensure existing client components continue to work.
- Reference `grimdark.nathanhealea.com/src/lib/supabase/server.ts` and `client.ts` for the exact pattern.
