# Project Overview

**Grimify** — An interactive color research and collection management app for miniature painters.

## What It Does

Grimify helps miniature painters manage their paint collections, discover new colors, find cross-brand substitutes, explore color theory, and connect with a community of painters. Target users are hobbyist and competitive miniature painters who want to make intentional color choices, track what they own, and share their knowledge.

Core functionality:

- Visual paint library mapped onto an interactive color wheel
- Cross-brand paint comparison and substitute finder
- Color scheme exploration (complementary, split-complementary, analogous)
- Paint search by name, hex code, or brand
- Community features for sharing recipes, palettes, and collections
- Personal collection tracking and management

## Tech Stack

| Layer                | Technology                     |
| -------------------- | ------------------------------ |
| **Framework**        | Next.js                        |
| **Styling**          | Tailwind CSS                   |
| **UI Components**    | shadcn/ui                      |
| **State Management** | Zustand                        |
| **Backend / Auth**   | Supabase (Auth, Database, RLS) |

---

## Status Key

| Status          | Description                                                |
| --------------- | ---------------------------------------------------------- |
| **Todo**        | Not started — no acceptance criteria completed             |
| **In Progress** | Partially implemented — some acceptance criteria completed |
| **Completed**   | Fully implemented — all acceptance criteria completed      |

## Implementation Order

<!-- Recommended sequence for building the MVP epics -->

0. Marketing & Branding — Visual identity, metadata, and legal pages; sets the tone for everything else
1. Authentication & User Accounts — Foundation for all personalized features; required before collection tracking, community, and any user-specific data
2. Paint Data & Search — Core data layer; all paint features depend on having a searchable paint database
3. Interactive Color Wheel — Core visual differentiator; requires paint data
4. Cross-Brand Comparison — Builds on paint data to surface substitutes and near-matches
5. Color Scheme Explorer — Extends the color wheel with color theory relationships
6. Collection Tracking — Personalizes the experience; requires paint data and user accounts
7. Community & Social — Highest complexity; depends on collections, recipes, and user accounts
8. User Management — Admin tools for managing roles, users, and profiles; requires authentication and roles
9. Color Management — Admin CRUD for brands, hues, and paints with hue association management and constraint enforcement
10. Purchase List — Let users bookmark paints they want to buy, with a dedicated dashboard and admin management interface
11. Color Palettes — Personal palettes of paints (owned and not), built from any source, with drag/drop reorder, scheme integration, and hue-locked HSL swap
12. Painting Recipes — Step-by-step painting guides with sections, paints per step, photos, freeform notes, and public sharing

## MVP Features (Epics)

### Epic: Marketing & Branding

**Goal:** Establish the Grimify visual identity, SEO presence, and legal foundation before building features.

**High-Level Scope:**

- [x] [Color scheme and theme](./00-marketing-and-branding/00-color-scheme-and-theme.md)
- [x] [Metadata and OpenGraph](./00-marketing-and-branding/01-metadata-and-opengraph.md)
- [x] [Branding images](./00-marketing-and-branding/02-branding-images.md)
- [x] [Terms of Use](./00-marketing-and-branding/03-terms-of-use.md)
- [ ] [Code of Conduct](./00-marketing-and-branding/04-code-of-conduct.md)
- [x] [Homepage marketing landing page](./00-marketing-and-branding/05-homepage-marketing.md)
- [x] [Per-page skeleton loading screens](./00-marketing-and-branding/06-new-loading-screen.md)
- [x] [Shared `<Main>` page wrapper component](./00-marketing-and-branding/07-main-component-refactor.md)
- [ ] [Shared `<PageHeader>` title and subtitle component](./00-marketing-and-branding/08-title-and-subtitle-component-refactor.md)

### Epic: Authentication & User Accounts

**Goal:** Provide secure user registration, login, and profile management so users can have personalized experiences across the app.

**High-Level Scope:**

- [x] [Sign up / sign in via Supabase Auth](./01-authentication-and-user-accounts/00-sign-up-sign-in.md)
- [x] [User profile creation on first login](./01-authentication-and-user-accounts/01-user-profile-creation-on-first-login.md)
- [x] [Protected routes for authenticated features](./01-authentication-and-user-accounts/02-protected-routes.md)
- [x] [User roles (user, admin)](./01-authentication-and-user-accounts/03-user-roles.md)
- [x] [Social media login (Google, Discord)](./01-authentication-and-user-accounts/04-social-media-login.md)
- [x] [User password reset and change](./01-authentication-and-user-accounts/05-user-reset-password.md)
- [x] [OAuth profile setup redirect bug](./01-authentication-and-user-accounts/06-oauth-profile-setup-redirect.md)
- [ ] [Edit user profile](./01-authentication-and-user-accounts/07-edit-user-profile.md)
- [x] [Auth & account toast feedback](./01-authentication-and-user-accounts/08-auth-toast.md)

### Epic: Paint Data & Search

**Goal:** Provide a comprehensive, searchable database of miniature paints across major brands.

**High-Level Scope:**

- [x] [Paint data model and seed data](./02-paint-data-search/00-paint-data-model.md)
- [x] [Itten hue self-referencing refactor](./02-paint-data-search/01-itten-hue-self-referencing-refactor.md)
- [x] [Paint search by name, hex, and brand](./02-paint-data-search/02-paint-search.md)
- [x] [Brand and product line browsing](./02-paint-data-search/03-brand-browsing.md)
- [x] [Munsell hue system refactor](./02-paint-data-search/04-munsell-hue-refactor.md)
- [ ] [Paint database data improvement](./02-paint-data-search/05-paint-database-data-improvement.md)
- [x] [Paint search v2 (rearchitecture)](./02-paint-data-search/06-paint-search-v2.md)

### Epic: Interactive Color Wheel

**Goal:** Give painters a spatial, visual view of paints mapped by hue and lightness so they can spot gaps and relationships at a glance.

**High-Level Scope:**

- [x] [Color wheel rendering and paint mapping](./03-interactive-color-wheel/00-color-wheel-rendering.md)
- [x] [Zoom, pan, and paint detail interaction](./03-interactive-color-wheel/01-wheel-interaction.md)
- [x] [Filter wheel by brand, collection, or owned paints](./03-interactive-color-wheel/02-wheel-filters.md)
- [ ] [Emphasize collection paints on the color wheel](./03-interactive-color-wheel/03-wheel-collection-emphasis.md)
- [x] [HSL color wheel](./03-interactive-color-wheel/03-hls-color-wheel.md)
- [x] [Color wheel zoom — paint marker scaling](./03-interactive-color-wheel/04-color-wheel-zoom-marker-scale.md)
- [x] [HSL wheel — Itten segment boundary rendering](./03-interactive-color-wheel/05-hsl-wheel-itten-segment-rendering.md)
- [x] [Paint rendering refactor — groups, brand rings, and halos](./03-interactive-color-wheel/06-paint-rendering.md)

### Epic: Cross-Brand Comparison

**Goal:** Help painters find duplicates, near-matches, and alternatives across manufacturers.

**High-Level Scope:**

- [ ] [Color distance algorithm and matching engine](./04-cross-brand-comparison/00-color-matching-engine.md)
- [ ] [Side-by-side paint comparison UI](./04-cross-brand-comparison/01-comparison-ui.md)
- [ ] [Substitute suggestions for discontinued paints](./04-cross-brand-comparison/02-substitute-suggestions.md)

### Epic: Color Scheme Explorer

**Goal:** Provide color theory tools so painters can make intentional, harmonious color choices.

**High-Level Scope:**

- [x] [Color scheme generation (complementary, split-comp, analogous, triadic)](./05-color-scheme-explorer/00-scheme-generation.md)
- [ ] [Scheme visualization on the color wheel](./05-color-scheme-explorer/01-scheme-visualization.md)
- [ ] [Map schemes to available paints](./05-color-scheme-explorer/02-scheme-to-paints.md)
- [ ] [Public schemes catalog & user explorer move](./05-color-scheme-explorer/03-public-schema-page.md)

### Epic: Collection Tracking

**Goal:** Let users log and manage the paints they own for easy reference when planning projects.

**High-Level Scope:**

- [x] [Add/remove paints to personal collection](./06-collection-tracking/00-manage-collection.md)
- [ ] [Collection overview and statistics](./06-collection-tracking/01-collection-overview.md)
- [x] [Collection dashboard](./06-collection-tracking/02-collection-dashboard.md)
- [x] [Collection toast feedback (add / remove)](./06-collection-tracking/03-collection-toast.md)

### Epic: Community & Social

**Goal:** Enable painters to share painting recipes, curated palettes, and collections with the community.

**High-Level Scope:**

- [ ] ~~[Painting recipes (step-by-step color layering guides)](./07-community-social/00-painting-recipes.md)~~ — superseded by [Epic: Painting Recipes](#epic-painting-recipes)
- [ ] ~~[Curated palette sharing](./07-community-social/01-palette-sharing.md)~~ — superseded by [Epic: Color Palettes](#epic-color-palettes)
- [ ] [Community feed and discovery](./07-community-social/02-community-feed.md)
- [ ] [User profiles and shared collections](./07-community-social/03-user-profiles.md)

### Epic: User Management

**Goal:** Provide administrators with tools to manage roles, user accounts, and profiles, including the ability to merge duplicate profiles.

**High-Level Scope:**

- [x] [Admin dashboard and navigation](./08-user-management/00-admin-dashboard.md)
- [x] [Role management (CRUD and assignment)](./08-user-management/01-role-management.md)
- [x] [User account management](./08-user-management/02-user-account-management.md)
- [ ] [Admin profile editing](./08-user-management/03-admin-profile-editing.md)
- [ ] [Profile and account merging](./08-user-management/04-profile-merging.md)
- [ ] [User profile deletion (self-service)](./08-user-management/05-user-profile-deletion.md)
- [x] [Collection management](./08-user-management/06-collection-management.md)
- [x] [Profile form toast feedback](./08-user-management/07-profile-toast.md)
- [x] [Admin management toast feedback](./08-user-management/08-admin-toast.md)

### Epic: Color Management

**Goal:** Provide administrators with tools to manage brands, hues, and paints — including CRUD operations, hue-paint association management, and constraint enforcement for hue hierarchies.

**High-Level Scope:**

- [ ] [Admin layout and navigation](./09-color-management/00-admin-layout-navigation.md)
- [ ] [Brand management](./09-color-management/01-brand-management.md)
- [ ] [Hue management](./09-color-management/02-hue-management.md)
- [ ] [Paint management](./09-color-management/03-paint-management.md)

### Epic: Purchase List

**Goal:** Let authenticated users bookmark paints they want to buy, manage their purchase list from a dedicated dashboard, and give admins tools to manage any user's purchase list.

**High-Level Scope:**

- [ ] [Purchase list database schema](./10-purchase-list/00-purchase-list-schema.md)
- [ ] [Purchase list toggle on paint cards](./10-purchase-list/01-purchase-list-toggle.md)
- [ ] [Purchase list dashboard](./10-purchase-list/02-purchase-list-dashboard.md)
- [ ] [Admin purchase list management](./10-purchase-list/03-admin-purchase-list-management.md)

### Epic: Color Palettes

**Goal:** Let users build personal palettes of paints (owned and not), assemble them from any source — including the color scheme explorer — drag/drop to reorder, and swap individual paints by saturation/lightness while preserving hue.

**High-Level Scope:**

- [x] [Palette database schema and module scaffold](./11-color-palettes/00-palette-schema.md)
- [x] [Palette management (list, create, edit, delete)](./11-color-palettes/01-palette-management.md)
- [x] [Add to palette from paint cards and color schemes](./11-color-palettes/02-add-to-palette.md)
- [x] [Drag-and-drop palette reorder](./11-color-palettes/03-palette-reorder.md)
- [x] [Hue-locked HSL paint swap](./11-color-palettes/04-palette-hue-swap.md)
- [x] [Palette description markdown editor](./11-color-palettes/05-palette-description-markdown.md)
- [x] [Prevent duplicate paints + toast feedback](./11-color-palettes/06-prevent-duplicate-paint-add.md)
- [x] [Palette & scheme toast feedback](./11-color-palettes/07-palette-toast.md)
- [x] [Public palettes catalog & user routes move](./11-color-palettes/08-public-palettes-page.md)

### Epic: Painting Recipes

**Goal:** Let users author step-by-step painting recipes — sections, steps with techniques and paints, freeform notes, photos at the recipe and step level — and share completed recipes publicly with discoverable browse and previewable share links.

**High-Level Scope:**

- [x] [Recipe database schema and module scaffold](./12-painting-recipes/00-recipe-schema.md)
- [x] [Recipe builder (sections, steps, instructions)](./12-painting-recipes/01-recipe-builder.md)
- [x] [Recipe step paints (palette-aware picker, ratios)](./12-painting-recipes/02-recipe-step-paints.md)
- [x] [Recipe photos (upload, cover, lightbox)](./12-painting-recipes/03-recipe-photos.md)
- [ ] [Recipe notes (multiple notes per recipe and per step)](./12-painting-recipes/04-recipe-notes.md)
- [ ] [Public recipe sharing, browse, and OG previews](./12-painting-recipes/05-recipe-sharing.md)
