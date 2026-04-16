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

## MVP Features (Epics)

### Epic: Marketing & Branding

**Goal:** Establish the Grimify visual identity, SEO presence, and legal foundation before building features.

**High-Level Scope:**

- [x] [Color scheme and theme](./00-marketing-and-branding/00-color-scheme-and-theme.md)
- [ ] [Metadata and OpenGraph](./00-marketing-and-branding/01-metadata-and-opengraph.md)
- [ ] [Branding images](./00-marketing-and-branding/02-branding-images.md)
- [ ] [Terms of Use](./00-marketing-and-branding/03-terms-of-use.md)
- [ ] [Code of Conduct](./00-marketing-and-branding/04-code-of-conduct.md)

### Epic: Authentication & User Accounts

**Goal:** Provide secure user registration, login, and profile management so users can have personalized experiences across the app.

**High-Level Scope:**

- [x] [Sign up / sign in via Supabase Auth](./01-authentication-and-user-accounts/00-sign-up-sign-in.md)
- [x] [User profile creation on first login](./01-authentication-and-user-accounts/01-user-profile-creation-on-first-login.md)
- [x] [Protected routes for authenticated features](./01-authentication-and-user-accounts/02-protected-routes.md)
- [x] [User roles (user, admin)](./01-authentication-and-user-accounts/03-user-roles.md)
- [x] [Social media login (Google, Discord)](./01-authentication-and-user-accounts/04-social-media-login.md)
- [x] [User password reset and change](./01-authentication-and-user-accounts/05-user-reset-password.md)
- [ ] [OAuth profile setup redirect bug](./01-authentication-and-user-accounts/06-oauth-profile-setup-redirect.md)

### Epic: Paint Data & Search

**Goal:** Provide a comprehensive, searchable database of miniature paints across major brands.

**High-Level Scope:**

- [x] [Paint data model and seed data](./02-paint-data-search/00-paint-data-model.md)
- [x] [Itten hue self-referencing refactor](./02-paint-data-search/01-itten-hue-self-referencing-refactor.md)
- [x] [Paint search by name, hex, and brand](./02-paint-data-search/02-paint-search.md)
- [x] [Brand and product line browsing](./02-paint-data-search/03-brand-browsing.md)
- [x] [Munsell hue system refactor](./02-paint-data-search/04-munsell-hue-refactor.md)
- [x] [Paint database data improvement](./02-paint-data-search/05-paint-database-data-improvement.md)

### Epic: Interactive Color Wheel

**Goal:** Give painters a spatial, visual view of paints mapped by hue and lightness so they can spot gaps and relationships at a glance.

**High-Level Scope:**

- [ ] [Color wheel rendering and paint mapping](./03-interactive-color-wheel/00-color-wheel-rendering.md)
- [ ] [Zoom, pan, and paint detail interaction](./03-interactive-color-wheel/01-wheel-interaction.md)
- [ ] [Filter wheel by brand, collection, or owned paints](./03-interactive-color-wheel/02-wheel-filters.md)

### Epic: Cross-Brand Comparison

**Goal:** Help painters find duplicates, near-matches, and alternatives across manufacturers.

**High-Level Scope:**

- [ ] [Color distance algorithm and matching engine](./04-cross-brand-comparison/00-color-matching-engine.md)
- [ ] [Side-by-side paint comparison UI](./04-cross-brand-comparison/01-comparison-ui.md)
- [ ] [Substitute suggestions for discontinued paints](./04-cross-brand-comparison/02-substitute-suggestions.md)

### Epic: Color Scheme Explorer

**Goal:** Provide color theory tools so painters can make intentional, harmonious color choices.

**High-Level Scope:**

- [ ] [Color scheme generation (complementary, split-comp, analogous, triadic)](./05-color-scheme-explorer/00-scheme-generation.md)
- [ ] [Scheme visualization on the color wheel](./05-color-scheme-explorer/01-scheme-visualization.md)
- [ ] [Map schemes to available paints](./05-color-scheme-explorer/02-scheme-to-paints.md)

### Epic: Collection Tracking

**Goal:** Let users log and manage the paints they own for easy reference when planning projects.

**High-Level Scope:**

- [ ] [Add/remove paints to personal collection](./06-collection-tracking/00-manage-collection.md)
- [ ] [Collection overview and statistics](./06-collection-tracking/01-collection-overview.md)

### Epic: Community & Social

**Goal:** Enable painters to share painting recipes, curated palettes, and collections with the community.

**High-Level Scope:**

- [ ] [Painting recipes (step-by-step color layering guides)](./07-community-social/00-painting-recipes.md)
- [ ] [Curated palette sharing](./07-community-social/01-palette-sharing.md)
- [ ] [Community feed and discovery](./07-community-social/02-community-feed.md)
- [ ] [User profiles and shared collections](./07-community-social/03-user-profiles.md)

### Epic: User Management

**Goal:** Provide administrators with tools to manage roles, user accounts, and profiles, including the ability to merge duplicate profiles.

**High-Level Scope:**

- [ ] [Admin dashboard and navigation](./08-user-management/00-admin-dashboard.md)
- [ ] [Role management (CRUD and assignment)](./08-user-management/01-role-management.md)
- [ ] [User account management](./08-user-management/02-user-account-management.md)
- [ ] [Admin profile editing](./08-user-management/03-admin-profile-editing.md)
- [ ] [Profile and account merging](./08-user-management/04-profile-merging.md)

### Epic: Color Management

**Goal:** Provide administrators with tools to manage brands, hues, and paints — including CRUD operations, hue-paint association management, and constraint enforcement for hue hierarchies.

**High-Level Scope:**

- [ ] [Admin layout and navigation](./09-color-management/00-admin-layout-navigation.md)
- [ ] [Brand management](./09-color-management/01-brand-management.md)
- [ ] [Hue management](./09-color-management/02-hue-management.md)
- [ ] [Paint management](./09-color-management/03-paint-management.md)
