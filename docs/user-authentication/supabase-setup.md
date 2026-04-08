# Supabase Setup

**Epic:** User Authentication
**Type:** Feature
**Status:** Completed

## Summary

Configure Supabase client libraries and middleware for cookie-based auth session management. This is the foundation that all other auth features depend on.

## Acceptance Criteria

- [x] `@supabase/supabase-js` and `@supabase/ssr` packages are installed
- [x] Browser Supabase client exists for client components
- [x] Server Supabase client exists for server components and server actions (cookie-based)
- [x] Middleware refreshes auth session on every request via `supabase.auth.getUser()`
- [x] Environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` are referenced
- [x] Auth state persists across page refreshes (SSR-compatible via `@supabase/ssr`)

## Key Files

| Action | File                         | Description                                     |
| ------ | ---------------------------- | ----------------------------------------------- |
| Create | `src/lib/supabase/client.ts` | Browser Supabase client                         |
| Create | `src/lib/supabase/server.ts` | Server-side Supabase client (cookies-based)     |
| Create | `src/middleware.ts`          | Auth session refresh middleware                  |
| Modify | `.env.local`                 | Add Supabase URL and anon key                   |
| Modify | `package.json`               | Add `@supabase/supabase-js` and `@supabase/ssr` |

## Implementation Plan

### 1. Install dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 2. Browser client

Create `src/lib/supabase/client.ts` — export a `createClient()` function that returns `createBrowserClient()` from `@supabase/ssr`, passing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` env vars.

### 3. Server client

Create `src/lib/supabase/server.ts` — export an async `createClient()` function that returns `createServerClient()` from `@supabase/ssr`. Reads/writes auth tokens via Next.js `cookies()` from `next/headers`. The `setAll` callback is wrapped in a try/catch to handle calls from Server Components where cookies are read-only (middleware handles the refresh in that case).

### 4. Middleware

Create `src/middleware.ts` that refreshes the auth session on every request:

- Creates a `createServerClient` inline using request/response cookie accessors (sets cookies on both the request and a new `NextResponse`).
- Calls `supabase.auth.getUser()` to refresh the session and rewrite expired tokens into the response cookies.
- Matcher excludes static assets: `_next/static`, `_next/image`, `favicon.ico`, and common image extensions (`svg|png|jpg|jpeg|gif|webp`).
- Does **not** handle redirects or route protection at this stage — that is added later in [Role-Based Authorization](./role-based-authorization.md).

## Notes

- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.
- The local Supabase instance is already configured (`supabase/config.toml`) with API on port 54421, DB on port 54422, Studio on port 54423.
