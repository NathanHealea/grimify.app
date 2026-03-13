# Sharing

**Epic:** Color Palette
**Type:** Feature
**Status:** Todo

## Summary

Allow users to share their color palettes and projects via public links. A shared palette or project is accessible to anyone with the link, even unauthenticated users. Sharing is toggle-based — users can enable or disable sharing on any palette or project they own. Shared items are read-only for viewers.

## Acceptance Criteria

- [ ] `palettes` table has `is_shared` boolean column (default false) and `share_token` UUID
- [ ] `projects` table has `is_shared` boolean column (default false) and `share_token` UUID
- [ ] RLS policies: anyone can read shared palettes/projects via share token
- [ ] Users can toggle sharing on/off for their own palettes and projects
- [ ] When sharing is enabled, a shareable URL is generated and displayed
- [ ] Shared palette page at `/shared/palette/[token]` — read-only view
- [ ] Shared project page at `/shared/project/[token]` — read-only view with contained palettes
- [ ] Shared views show paint swatches, names, brands, and notes — no edit controls
- [ ] Shared views show "owned" indicators if the viewer is authenticated and has those paints
- [ ] Users can copy the share link to clipboard
- [ ] Disabling sharing invalidates the existing link (regenerates token on re-enable)

## Implementation Plan

### Step 1: Add sharing columns migration

**`supabase/migrations/{timestamp}_add_sharing_columns.sql`**

```sql
ALTER TABLE public.palettes
  ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN share_token UUID UNIQUE DEFAULT gen_random_uuid();

ALTER TABLE public.projects
  ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN share_token UUID UNIQUE DEFAULT gen_random_uuid();

-- Public read access for shared items (no auth required)
CREATE POLICY "Anyone can read shared palettes"
  ON public.palettes FOR SELECT
  USING (is_shared = true);

CREATE POLICY "Anyone can read shared palette paints"
  ON public.palette_paints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.palettes p
      WHERE p.id = palette_id AND p.is_shared = true
    )
  );

CREATE POLICY "Anyone can read shared projects"
  ON public.projects FOR SELECT
  USING (is_shared = true);

CREATE POLICY "Anyone can read shared project palettes"
  ON public.project_palettes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.is_shared = true
    )
  );
```

### Step 2: Add sharing service functions

**`src/lib/supabase/sharing.ts`**

- `togglePaletteSharing(supabase, paletteId, enabled)` — set `is_shared`, regenerate `share_token` if re-enabling
- `toggleProjectSharing(supabase, projectId, enabled)` — same for projects
- `getSharedPalette(supabase, shareToken)` — fetch palette by token (public, no auth)
- `getSharedProject(supabase, shareToken)` — fetch project by token (public, no auth)

### Step 3: Add sharing toggle to palette and project detail pages

**`src/app/palettes/[id]/page.tsx`** and **`src/app/projects/[id]/page.tsx`**:
- Add a "Share" toggle button in the page header
- When enabled, show the shareable URL with a "Copy Link" button
- URL format: `{origin}/shared/palette/{share_token}` or `{origin}/shared/project/{share_token}`

### Step 4: Create shared palette page

**`src/app/shared/palette/[token]/page.tsx`** — Public read-only view:
- Fetch palette via share token (no auth required)
- Display palette name, description, owner display name
- List paints with swatches, names, brands, notes
- If viewer is authenticated, show owned/not-owned indicators
- No edit controls (no delete, reorder, or note editing)
- 404 if token is invalid or sharing is disabled

### Step 5: Create shared project page

**`src/app/shared/project/[token]/page.tsx`** — Public read-only view:
- Fetch project via share token
- Display project name, description, owner display name
- List contained palettes as expandable sections
- Each palette shows its paints with swatches
- If viewer is authenticated, show owned indicators
- 404 if invalid

### Affected Files

| File | Changes |
|------|---------|
| `supabase/migrations/{timestamp}_add_sharing_columns.sql` | New — sharing columns and public RLS policies |
| `src/lib/supabase/sharing.ts` | New — sharing service functions |
| `src/app/palettes/[id]/page.tsx` | Add sharing toggle and share link display |
| `src/app/projects/[id]/page.tsx` | Add sharing toggle and share link display |
| `src/app/shared/palette/[token]/page.tsx` | New — public shared palette view |
| `src/app/shared/project/[token]/page.tsx` | New — public shared project view |

### Dependencies

- [Color Palettes](./color-palettes.md) — palettes table must exist
- [Projects](./projects.md) — projects table must exist
- [Cloud Paint Collection](../paint-collection/cloud-paint-collection.md) — for owned indicators on shared views (optional)

### Risks & Considerations

- **Token security:** Share tokens are UUIDs — unguessable but not secret. Anyone with the link can view. This is the standard approach for "anyone with the link" sharing (like Google Docs).
- **Token regeneration:** When sharing is disabled then re-enabled, a new token is generated. This invalidates any previously shared links, which is intentional for security.
- **SEO/Crawling:** Shared pages could be indexed by search engines. Consider adding `noindex` meta tags if this is undesirable, or leave it for discoverability.
- **Rate limiting:** Shared pages are public and unauthenticated. If abuse is a concern, Supabase rate limiting or Next.js middleware rate limiting can be added later.
- **Shared palette paints RLS:** The public read policy on `palette_paints` checks the parent palette's `is_shared` flag. This avoids exposing paints from non-shared palettes.
