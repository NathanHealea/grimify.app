# OG & Page Metadata Reference

A complete catalog of every page's metadata configuration. This document is the authoritative source for implementing
`metadata` exports and `generateMetadata` functions across the app. Claude should use this document to align each
route's metadata with the values below.

**Title template:** `%s · Grimify` (applied by root layout — entries show the _segment title_ passed to the template,
except where the full resolved title is noted).

**Static OG images:** `/og-image.png` (1200×630).
**Dynamic OG images:** `/api/og/*` routes — see the API section at the bottom.

---

## How metadata cascades

All page-level metadata is generated via `pageMetadata()` in `src/modules/seo/utils/page-metadata.ts`.
The utility automatically mirrors `title` and `description` into `openGraph` and `twitter` fields and wires up
`alternates.canonical` when a `path` is provided. Fields not explicitly overridden at the page level inherit from
the root layout export (`src/app/layout.tsx`).

Inherited root-level defaults (no page-level override needed):
- `applicationName` — `Grimify`
- `authors` — `[{ name: 'Nathan Healea' }]`
- `manifest` — `/branding/site.webmanifest`
- `metadataBase` — `https://grimify.app`
- `viewport.themeColor` — light `#fafafa` / dark `#0a0a0a`
- `openGraph.type` — `website` (override to `article` or `profile` where noted)
- `openGraph.siteName` — `Grimify`
- `openGraph.locale` — `en_US`
- `twitter.card` — `summary_large_image`
- `robots` — `index: true, follow: true` (override to `false` for noindex pages)

---

## Root / Default (layout.tsx)

| Field | Value |
|---|---|
| **Title (default)** | `Grimify` |
| **Title template** | `%s · Grimify` |
| **Description** | Search Citadel, Vallejo, Army Painter, Scale75 and 10+ other brands in one place. Build palettes, track your shelf, and share painting recipes — free to browse, no account needed. |
| **Canonical** | _(none — base URL only via `metadataBase`)_ |
| **OG title** | `Grimify — Find any miniature paint` |
| **OG type** | `website` |
| **OG siteName** | `Grimify` |
| **OG locale** | `en_US` |
| **OG image** | `/og-image.png` (1200×630, alt: `Grimify — Find any miniature paint across every brand`) |
| **Twitter card** | `summary_large_image` |
| **Twitter title** | `Grimify — Find any miniature paint` |
| **Twitter image** | `/og-image.png` |
| **Keywords** | miniature painting, Citadel paints, Vallejo paints, Army Painter, Scale75, Reaper paints, cross-brand paint search, paint collection tracker, paint comparison, color palette, tabletop hobby, Warhammer paints, miniature paint database |
| **applicationName** | `Grimify` |
| **authors** | `[{ name: 'Nathan Healea' }]` |
| **manifest** | `/branding/site.webmanifest` |
| **metadataBase** | `https://grimify.app` |
| **viewport.themeColor** | `#fafafa` (light) / `#0a0a0a` (dark) |
| **robots** | `index: true, follow: true` |
| **Structured data** | `WebSite` schema with `SearchAction` pointing to `/paints?q={search_term_string}` |

---

## Public Pages

### Home — `/`

| Field | Value |
|---|---|
| **Title** | `Find any miniature paint — Citadel, Vallejo, Army Painter and more` |
| **Resolved title** | `Find any miniature paint — Citadel, Vallejo, Army Painter and more · Grimify` |
| **Description** | Search Citadel, Vallejo, Army Painter, Scale75 and 10+ other brands in one place. Build palettes, track your collection, and share painting recipes — free to browse, no account needed. |
| **Canonical** | `https://grimify.app/` |
| **OG type** | `website` |
| **OG image** | `/api/og/home` (1200×630, alt: `Grimify — Find any miniature paint across every brand`) |
| **Twitter card** | `summary_large_image` |
| **Twitter image** | `/api/og/home` |
| **Keywords** | miniature paint finder, Citadel paint search, Vallejo paint search, Army Painter, Scale75, paint comparison tool, miniature painting community |
| **Indexed** | yes |
| **robots directives** | `max-snippet: -1, max-image-preview: large` |
| **Structured data** | `WebSite` (same as root) + `WebApplication` schema |

### Paints — `/paints`

| Field | Value |
|---|---|
| **Title** | `Paints` |
| **Resolved title** | `Paints · Grimify` |
| **Description** | Search Citadel, Vallejo, Army Painter, Scale75 and 10+ other brands by name, hex, or colour. Filter by hue, compare swatches, and track what you own. |
| **Canonical** | `https://grimify.app/paints` |
| **OG type** | `website` |
| **OG image** | `/og-image.png` (1200×630) |
| **Twitter card** | `summary_large_image` |
| **Twitter image** | `/og-image.png` |
| **Keywords** | miniature paints, Citadel paint database, Vallejo paint database, Army Painter paints, Scale75 paints, paint hex codes, miniature paint search |
| **Indexed** | yes |
| **robots directives** | `max-snippet: -1, max-image-preview: large` |
| **Structured data** | `ItemList` of paints (paginated — omit if implementation complexity is high) |

### Paint detail — `/paints/[id]`

Dynamic. Resolved at request time from the paint record.

| Field | Value |
|---|---|
| **Title** | `{paint.name} — {product_line.name}` _(or `{paint.name}` if no product line)_ |
| **Resolved title** | `{paint.name} — {product_line.name} · Grimify` |
| **Description** | `{paint.name} is part of the {product_line.name} range by {brand.name} — hex codes, cross-brand substitutes and painting tips.` _(falls back to brand-only or paint-only variant when fields are absent)_ |
| **Canonical** | `https://grimify.app/paints/{id}` |
| **OG type** | `website` |
| **OG image** | `/api/og/paint/{id}` (1200×630, alt: `{paint.name}`) |
| **Twitter card** | `summary_large_image` |
| **Twitter image** | `/api/og/paint/{id}` |
| **Keywords** | `{paint.name}`, `{brand.name} paints`, `{product_line.name}`, miniature paint hex code, paint substitute |
| **Indexed** | yes |
| **robots directives** | `max-snippet: -1, max-image-preview: large` |
| **Structured data** | `Product` schema — name: `{paint.name}`, brand: `{brand.name}`, color: `#{paint.hex}`, description from meta description, url: canonical |
| **404 fallback** | `title: 'Paint not found'`, `noindex: true` |

### Brands — `/brands`

| Field | Value |
|---|---|
| **Title** | `Brands` |
| **Resolved title** | `Brands · Grimify` |
| **Description** | Browse every Citadel, Vallejo, Army Painter, Scale75 and 10+ other miniature paint ranges — full product lines in one place. |
| **Canonical** | `https://grimify.app/brands` |
| **OG type** | `website` |
| **OG image** | `/og-image.png` (1200×630) |
| **Twitter card** | `summary_large_image` |
| **Twitter image** | `/og-image.png` |
| **Keywords** | miniature paint brands, Citadel, Vallejo, Army Painter, Scale75, Reaper, paint manufacturer comparison |
| **Indexed** | yes |
| **robots directives** | `max-snippet: -1, max-image-preview: large` |
| **Structured data** | `ItemList` of brands |

### Brand detail — `/brands/[id]`

Dynamic. Resolved at request time from the brand record.

| Field | Value |
|---|---|
| **Title** | `{brand.name}` |
| **Resolved title** | `{brand.name} · Grimify` |
| **Description** | Browse `{paintCount}` `{brand.name}` miniature paints on Grimify — full product lines, hex codes, and cross-brand comparisons. |
| **Canonical** | `https://grimify.app/brands/{id}` |
| **OG type** | `website` |
| **OG image** | `/api/og/brand/{id}` (1200×630, alt: `{brand.name}`) |
| **Twitter card** | `summary_large_image` |
| **Twitter image** | `/api/og/brand/{id}` |
| **Keywords** | `{brand.name}` paints, `{brand.name}` paint range, miniature paints by `{brand.name}` |
| **Indexed** | yes |
| **robots directives** | `max-snippet: -1, max-image-preview: large` |
| **Structured data** | `Organization` schema — name: `{brand.name}`, url: canonical, numberOfItems: `{paintCount}` |
| **404 fallback** | `title: 'Brand not found'`, `noindex: true` |

### Hue detail — `/hues/[id]`

Dynamic. Resolved at request time from the hue record.

| Field | Value |
|---|---|
| **Title** | `{hue.name}` |
| **Resolved title** | `{hue.name} · Grimify` |
| **Description** | `{hue.name} ({parent.name}) — browse miniature paints in this hue on Grimify.` _(or `Browse miniature paints in the {hue.name} hue on Grimify.` for parent hues)_ |
| **Canonical** | `https://grimify.app/hues/{id}` |
| **OG type** | `website` |
| **OG image** | `/api/og/hue/{id}` (1200×630, alt: `{hue.name}`) |
| **Twitter card** | `summary_large_image` |
| **Twitter image** | `/api/og/hue/{id}` |
| **Keywords** | `{hue.name}` miniature paints, `{hue.name}` paint colours, paint hue filter |
| **Indexed** | yes |
| **robots directives** | `max-snippet: -1, max-image-preview: large` |
| **Structured data** | `ItemList` of paints in this hue (optional) |
| **404 fallback** | `title: 'Hue not found'`, `noindex: true` |

### Community palettes — `/palettes`

| Field | Value |
|---|---|
| **Title** | `Community palettes` |
| **Resolved title** | `Community palettes · Grimify` |
| **Description** | Discover paint palettes built by miniature painters. Find inspiration for your next Citadel or Vallejo colour scheme. |
| **Canonical** | `https://grimify.app/palettes` |
| **OG type** | `website` |
| **OG image** | `/og-image.png` (1200×630) |
| **Twitter card** | `summary_large_image` |
| **Twitter image** | `/og-image.png` |
| **Keywords** | miniature paint palette, Citadel colour scheme, Vallejo colour scheme, community palettes, miniature painting inspiration |
| **Indexed** | yes |
| **robots directives** | `max-snippet: -1, max-image-preview: large` |
| **Structured data** | `ItemList` of public palettes (optional) |

### Palette detail — `/palettes/[id]`

Dynamic. Resolved at request time. Returns `noindex` for private palettes not owned by the viewer.

| Field | Value |
|---|---|
| **Title** | `{palette.name} — Grimify` _(note: the segment already contains `— Grimify` so the resolved title is `{palette.name} — Grimify · Grimify` — consider revising to just `{palette.name}`)_ |
| **Resolved title** | `{palette.name} · Grimify` _(recommended: remove `— Grimify` from the segment title to avoid duplication)_ |
| **Description** | `{palette.description (truncated to 175 chars)} — on Grimify.` _(or `{palette.name} — a miniature paint palette on Grimify.` when no description)_ |
| **Canonical** | `https://grimify.app/palettes/{id}` _(public palettes only)_ |
| **OG type** | `website` |
| **OG image** | `/api/og/palette/{id}` (1200×630, public only; omit for private) |
| **Twitter card** | `summary_large_image` (when image present) / `summary` (no image) |
| **Twitter image** | `/api/og/palette/{id}` (public only) |
| **Indexed** | public palettes only |
| **robots** | `noindex: true` for private palettes |
| **robots directives** | `max-snippet: -1, max-image-preview: large` (public only) |
| **Structured data** | `CreativeWork` schema — name: `{palette.name}`, description, author: `{owner}`, url: canonical (public only) |
| **404 / private fallback** | `title: 'Palette not found'`, `noindex: true` |

### User profile — `/users/[id]`

Dynamic. Resolved at request time from the profile record.

| Field | Value |
|---|---|
| **Title** | `{profile.display_name}` |
| **Resolved title** | `{profile.display_name} · Grimify` |
| **Description** | `{profile.bio (truncated to 200 chars)}` _(or `{display_name}'s profile on Grimify.` when no bio)_ |
| **Canonical** | `https://grimify.app/users/{id}` |
| **OG type** | `profile` |
| **OG image** | `/api/og/user/{id}` (1200×630, when display_name is set; omit otherwise) |
| **Twitter card** | `summary_large_image` (when image) / `summary` (no image) |
| **Twitter image** | `/api/og/user/{id}` (when display_name is set) |
| **Indexed** | yes |
| **robots directives** | `max-snippet: -1, max-image-preview: large` |
| **Structured data** | `Person` schema — name: `{display_name}`, description: bio, url: canonical |
| **404 fallback** | `title: 'User not found'`, `noindex: true` |

### Compare — `/compare`

| Field | Value |
|---|---|
| **Title** | `Compare paints` |
| **Resolved title** | `Compare paints · Grimify` |
| **Description** | Compare Citadel, Vallejo, Army Painter and any other brand side by side — hex values, product lines, and perceptual colour distance at a glance. |
| **Canonical** | `https://grimify.app/compare` |
| **OG type** | `website` |
| **OG image** | `/og-image.png` (1200×630) |
| **Twitter card** | `summary_large_image` |
| **Twitter image** | `/og-image.png` |
| **Keywords** | compare miniature paints, Citadel vs Vallejo, paint substitute, cross-brand paint comparison, perceptual colour distance |
| **Indexed** | yes |
| **robots directives** | `max-snippet: -1, max-image-preview: large` |
| **Structured data** | _(none)_ |

### Discontinued paints — `/discontinued`

| Field | Value |
|---|---|
| **Title** | `Discontinued paints` |
| **Resolved title** | `Discontinued paints · Grimify` |
| **Description** | Every discontinued Citadel, Vallejo and Army Painter paint — with cross-brand substitute suggestions ranked by perceptual colour distance. |
| **Canonical** | `https://grimify.app/discontinued` |
| **OG type** | `website` |
| **OG image** | `/og-image.png` (1200×630) |
| **Twitter card** | `summary_large_image` |
| **Twitter image** | `/og-image.png` |
| **Keywords** | discontinued miniature paints, Citadel discontinued, Vallejo discontinued, paint substitute finder, out of print paints |
| **Indexed** | yes |
| **robots directives** | `max-snippet: -1, max-image-preview: large` |
| **Structured data** | _(none)_ |

### Browse recipes — `/recipes`

| Field | Value |
|---|---|
| **Title** | `Browse Recipes` |
| **Resolved title** | `Browse Recipes · Grimify` |
| **Description** | Discover step-by-step painting recipes from the miniature painting community — techniques, paint lists, and photos. |
| **Canonical** | `https://grimify.app/recipes` |
| **OG type** | `website` |
| **OG image** | `/og-image.png` (1200×630) |
| **Twitter card** | `summary_large_image` |
| **Twitter image** | `/og-image.png` |
| **Keywords** | miniature painting recipes, painting techniques, Citadel tutorial, miniature paint guide, step-by-step painting |
| **Indexed** | yes |
| **robots directives** | `max-snippet: -1, max-image-preview: large` |
| **Structured data** | `ItemList` of public recipes (optional) |

### Recipe detail — `/recipes/[id]`

Dynamic. Resolved at request time from the recipe record.

| Field | Value |
|---|---|
| **Title** | `{recipe.title}` |
| **Resolved title** | `{recipe.title} · Grimify` |
| **Description** | `{recipe.summary (truncated to 200 chars)}` _(or `{recipe.title} — a painting recipe on Grimify.` when no summary)_ |
| **Canonical** | `https://grimify.app/recipes/{id}` (public only) |
| **OG type** | `article` |
| **OG image** | _(none — uses root default `/og-image.png`)_ |
| **Twitter card** | `summary` _(no dedicated image)_ |
| **Indexed** | public recipes only |
| **robots** | `noindex: true` for private recipes |
| **robots directives** | `max-snippet: -1` (public only) |
| **Structured data** | `HowTo` schema — name: `{recipe.title}`, description: summary, step list from recipe steps (when data available) |
| **404 / private fallback** | `title: 'Recipe not found'`, `noindex: true` |

### Color schemes — `/schemes`

| Field | Value |
|---|---|
| **Title** | `Color schemes` |
| **Resolved title** | `Color schemes · Grimify` |
| **Description** | Pick a base color and explore complementary, analogous, triadic, and split-complementary schemes — matched to real miniature paints. |
| **Canonical** | `https://grimify.app/schemes` |
| **OG type** | `website` |
| **OG image** | _(none — uses root default)_ |
| **Twitter card** | `summary` _(no dedicated image)_ |
| **Keywords** | colour theory miniature painting, complementary colour scheme, analogous scheme, paint colour wheel |
| **Indexed** | yes |
| **robots directives** | `max-snippet: -1` |
| **Structured data** | `WebApplication` or `SoftwareApplication` (interactive tool) |

---

## Auth Pages _(noindex)_

Auth pages (except sign-up): `robots: { index: false, follow: false }`. No OG image. Twitter card: `summary`.
Sign-up is indexed — see its dedicated entry below.

### Sign in — `/sign-in`

| Field | Value |
|---|---|
| **Title** | `Sign in` |
| **Resolved title** | `Sign in · Grimify` |
| **Description** | Sign in to your Grimify account. |
| **Canonical** | _(omit — noindex page)_ |
| **OG type** | `website` |
| **OG image** | _(none)_ |
| **Twitter card** | `summary` |
| **Indexed** | no |

### Sign up — `/sign-up`

| Field | Value |
|---|---|
| **Title** | `Create an account` |
| **Resolved title** | `Create an account · Grimify` |
| **Description** | Create a free Grimify account to track your Citadel, Vallejo and Army Painter collection, build palettes, and share painting recipes. |
| **Canonical** | `https://grimify.app/sign-up` |
| **OG type** | `website` |
| **OG image** | `/og-image.png` (1200×630) |
| **Twitter card** | `summary_large_image` |
| **Twitter image** | `/og-image.png` |
| **Keywords** | free miniature paint tracker, Grimify account, paint collection app |
| **Indexed** | yes |
| **robots directives** | `max-snippet: -1, max-image-preview: large` |

### Forgot password — `/forgot-password`

| Field | Value |
|---|---|
| **Title** | `Forgot password` |
| **Resolved title** | `Forgot password · Grimify` |
| **Description** | Send yourself a password reset link for your Grimify account. |
| **Canonical** | _(omit)_ |
| **OG image** | _(none)_ |
| **Twitter card** | `summary` |
| **Indexed** | no |

### Reset password — `/reset-password`

| Field | Value |
|---|---|
| **Title** | `Reset password` |
| **Resolved title** | `Reset password · Grimify` |
| **Description** | Choose a new password for your Grimify account. |
| **Canonical** | _(omit)_ |
| **OG image** | _(none)_ |
| **Twitter card** | `summary` |
| **Indexed** | no |

### Profile setup — `/profile/setup`

| Field | Value |
|---|---|
| **Title** | `Set up your profile` |
| **Resolved title** | `Set up your profile · Grimify` |
| **Description** | Choose a display name to finish setting up your Grimify account. |
| **Canonical** | _(omit)_ |
| **OG image** | _(none)_ |
| **Twitter card** | `summary` |
| **Indexed** | no |

---

## Legal Pages

Legal pages are indexed but don't need page-level keywords or structured data.

### Terms of Use — `/terms`

| Field | Value |
|---|---|
| **Title** | `Terms of Use` |
| **Resolved title** | `Terms of Use · Grimify` |
| **Description** | Terms of Use for Grimify — a hobbyist paint research tool provided as-is, not affiliated with any paint manufacturer. |
| **Canonical** | `https://grimify.app/terms` |
| **OG type** | `website` |
| **OG image** | _(none — uses root default)_ |
| **Twitter card** | `summary` |
| **Indexed** | yes |

### Code of Conduct — `/code-of-conduct`

| Field | Value |
|---|---|
| **Title** | `Code of Conduct` |
| **Resolved title** | `Code of Conduct · Grimify` |
| **Description** | Community expectations for Grimify — a welcoming space for miniature painters of every skill level to share recipes, palettes, and ideas. |
| **Canonical** | `https://grimify.app/code-of-conduct` |
| **OG type** | `website` |
| **OG image** | _(none — uses root default)_ |
| **Twitter card** | `summary` |
| **Indexed** | yes |

---

## Authenticated User Pages _(noindex)_

All user-authenticated pages: `robots: { index: false, follow: false }`. No OG image. Twitter card: `summary`.
Canonical URL: omit on all noindex pages.

### My collection — `/collection`

| Field | Value |
|---|---|
| **Title** | `My collection` |
| **Resolved title** | `My collection · Grimify` |
| **Description** | Your saved miniature paint collection on Grimify. |
| **OG image** | _(none)_ |
| **Indexed** | no |

### Collection paints — `/collection/paints`

| Field | Value |
|---|---|
| **Title** | `Collection paints` |
| **Resolved title** | `Collection paints · Grimify` |
| **Description** | Browse the paints in your Grimify collection. |
| **OG image** | _(none)_ |
| **Indexed** | no |

### My palettes — `/user/palettes`

| Field | Value |
|---|---|
| **Title** | `My palettes` |
| **Resolved title** | `My palettes · Grimify` |
| **Description** | Manage your saved Grimify palettes. |
| **OG image** | _(none)_ |
| **Indexed** | no |

### Edit palette — `/user/palettes/[id]/edit`

| Field | Value |
|---|---|
| **Title** | `Edit palette` |
| **Resolved title** | `Edit palette · Grimify` |
| **Description** | Edit your paint palette on Grimify. |
| **OG image** | _(none)_ |
| **Indexed** | no |

### My recipes — `/user/recipes`

| Field | Value |
|---|---|
| **Title** | `My recipes` |
| **Resolved title** | `My recipes · Grimify` |
| **Description** | Manage your saved Grimify painting recipes. |
| **OG image** | _(none)_ |
| **Indexed** | no |

### Edit recipe — `/user/recipes/[id]/edit`

| Field | Value |
|---|---|
| **Title** | `Edit recipe` |
| **Resolved title** | `Edit recipe · Grimify` |
| **Description** | Edit your painting recipe on Grimify. |
| **OG image** | _(none)_ |
| **Indexed** | no |

### Edit profile — `/profile/edit`

| Field | Value |
|---|---|
| **Title** | `Edit profile` |
| **Resolved title** | `Edit profile · Grimify` |
| **Description** | Update your Grimify account settings. |
| **OG image** | _(none)_ |
| **Indexed** | no |

---

## System Pages

### 404 Not found

| Field | Value |
|---|---|
| **Title** | `Page not found` |
| **Resolved title** | `Page not found · Grimify` |
| **Description** | We couldn't find that page on Grimify. Try one of the popular destinations below. |
| **Canonical** | _(omit)_ |
| **OG image** | _(none)_ |
| **Twitter card** | `summary` |
| **Indexed** | no |

---

## Admin Pages _(all noindex)_

All admin pages: `robots: { index: false, follow: false }`. No OG images. Twitter card: `summary`.
Canonical URL: omit on all admin pages.

| URL | Title | Description |
|---|---|---|
| `/admin` | `Admin dashboard · Grimify` | Grimify admin dashboard. |
| `/admin/paints` | `Paint management · Grimify` | Admin: manage Grimify paints. |
| `/admin/paints/[id]` | `Edit paint · Grimify` | Admin: edit a Grimify paint. |
| `/admin/paints/new` | `New paint · Grimify` | Admin: create a new Grimify paint. |
| `/admin/hues` | `Hue management · Grimify` | Admin: manage Grimify paint hues. |
| `/admin/hues/[id]` | `Edit hue · Grimify` | Admin: edit a Grimify hue. |
| `/admin/hues/new` | `New hue · Grimify` | Admin: create a new Grimify hue. |
| `/admin/brands` | `Brand management · Grimify` | Admin: manage Grimify paint brands. |
| `/admin/brands/[id]` | `Edit brand · Grimify` | Admin: edit a Grimify paint brand. |
| `/admin/brands/new` | `New brand · Grimify` | Admin: create a new Grimify paint brand. |
| `/admin/users` | `User management · Grimify` | Admin: manage Grimify user accounts. |
| `/admin/users/[id]` | `User detail · Grimify` | Admin: Grimify user detail. |
| `/admin/users/[id]/edit` | `Edit user · Grimify` | Admin: edit Grimify user profile and roles. |
| `/admin/users/[id]/collection` | `User collection · Grimify` | Admin: view a user's Grimify paint collection. |
| `/admin/roles` | `Role management · Grimify` | Admin: manage Grimify roles. |
| `/admin/roles/[id]` | `Role detail · Grimify` | Admin: Grimify role detail. |

---

## Dynamic OG Image Routes (`/api/og/*`)

All routes return a `1200×630` PNG. Edge runtime. `Cache-Control: public, max-age=300, s-maxage=86400`.

### `/api/og/home`

Static branded card. Uses a static server-rendered image — see `src/app/api/og/home/route.tsx`.

### `/api/og/paint/[id]`

| Layout | Left 600px: solid swatch in `paint.hex`. Right: brand name (small), paint name (large), paint type + "on Grimify" (small). |
|---|---|
| **GRIMIFY label** | yes |
| **"on Grimify"** | `{paint_type} on Grimify` _(or `on Grimify` when no paint type)_ |
| **404** | when paint not found |

### `/api/og/hue/[id]`

| Layout | Left: GRIMIFY label, hue name (large), Itten classification + "on Grimify" (medium). Right 600px: solid swatch in `hue.hex_code`. |
|---|---|
| **GRIMIFY label** | yes |
| **"on Grimify"** | `Itten: {parent.name} — on Grimify` _(or `Explore hues on Grimify` for parent hues)_ |
| **404** | when hue not found |

### `/api/og/brand/[id]`

| Layout | Top: GRIMIFY label, brand name (large), paint count (medium). Bottom strip: up to 10 paint swatches. |
|---|---|
| **GRIMIFY label** | yes |
| **"on Grimify"** | `{N} paints on Grimify` |
| **404** | when brand not found |

### `/api/og/palette/[id]`

| Layout | Top: GRIMIFY label, palette name (large), paint count + owner + "on Grimify" (medium), community palette count (small). Bottom strip: up to 10 paint swatches + overflow tile. |
|---|---|
| **GRIMIFY label** | yes |
| **"on Grimify"** | `{N} paints · by {owner} on Grimify` |
| **Community count** | `one of {N} community palettes` _(shown when count > 1)_ |
| **404** | when palette not found or not public |

### `/api/og/user/[id]`

| Layout | Left half: avatar (or initials tile) above display name. Right half: GRIMIFY label, bio (truncated to 140 chars) + "on Grimify" below _(or "Grimify community member" when no bio)_. |
|---|---|
| **GRIMIFY label** | yes |
| **"on Grimify"** | below bio text, or baked into "Grimify community member" fallback |
| **404** | when profile not found or has no display_name |

---

## Structured Data (JSON-LD)

The following schema types are recommended per page category. Implement via a `<script type="application/ld+json">`
tag injected through Next.js `metadata.other` or a dedicated `JsonLd` component.

| Page | Schema type | Key fields |
|---|---|---|
| Root layout | `WebSite` | `name: "Grimify"`, `url: "https://grimify.app"`, `potentialAction: SearchAction` pointing to `/paints?q=` |
| `/` | `WebApplication` | `name`, `description`, `applicationCategory: "UtilitiesApplication"` |
| `/paints/[id]` | `Product` | `name`, `brand.name`, `color` (hex), `description`, `url` |
| `/brands/[id]` | `Organization` | `name`, `url`, `description` |
| `/recipes/[id]` | `HowTo` | `name`, `description`, `step[]` (when step data available) |
| `/users/[id]` | `Person` | `name: display_name`, `description: bio`, `url` |
| `/palettes/[id]` | `CreativeWork` | `name`, `description`, `author`, `url` (public palettes only) |

---

## Robots & Sitemap

- **`/robots.ts`** — `sitemap: https://grimify.app/sitemap.xml`; disallow `/admin`, `/collection`, `/user`, `/profile`, `/api`.
- **`/sitemap.ts`** — include all indexed static pages plus dynamic paint, brand, hue, palette (public), recipe (public), and user profile routes.
- Paginated routes (`/paints?page=2`) should use `rel="canonical"` pointing to the base URL (`/paints`) to avoid index fragmentation.
