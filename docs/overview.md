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

## MVP Features (Epics)

### Epic: Marketing & Branding

**Goal:** Establish the Grimify visual identity, SEO presence, and legal foundation before building features.

**High-Level Scope:**

- [x] [Color scheme and theme](./00-marketing-and-branding/color-scheme-and-theme.md)
- [ ] [Metadata and OpenGraph](./00-marketing-and-branding/metadata-and-opengraph.md)
- [ ] [Branding images](./00-marketing-and-branding/branding-images.md)
- [ ] [Terms of Use](./00-marketing-and-branding/terms-of-use.md)
- [ ] [Code of Conduct](./00-marketing-and-branding/code-of-conduct.md)

### Epic: Authentication & User Accounts

**Goal:** Provide secure user registration, login, and profile management so users can have personalized experiences across the app.

**High-Level Scope:**

- [ ] [Sign up / sign in via Supabase Auth](./01-authentication-and-user-accounts/sign-up-sign-in.md)
- [ ] [User profile creation on first login](./01-authentication-and-user-accounts/user-profile-creation-on-first-login.md)
- [ ] [Protected routes for authenticated features](./01-authentication-and-user-accounts/protected-routes.md)
- [ ] [User roles (user, admin)](./01-authentication-and-user-accounts/user-roles.md)
- [ ] [Social media login (Google, Discord)](./01-authentication-and-user-accounts/social-media-login.md)
- [ ] [User password reset and change](./01-authentication-and-user-accounts/user-reset-password.md)

### Epic: Paint Data & Search

**Goal:** Provide a comprehensive, searchable database of miniature paints across major brands.

**High-Level Scope:**

- [ ] [Paint data model and seed data](./02-paint-data-search/paint-data-model.md)
- [ ] [Paint search by name, hex, and brand](./02-paint-data-search/paint-search.md)
- [ ] [Brand and product line browsing](./02-paint-data-search/brand-browsing.md)

### Epic: Interactive Color Wheel

**Goal:** Give painters a spatial, visual view of paints mapped by hue and lightness so they can spot gaps and relationships at a glance.

**High-Level Scope:**

- [ ] [Color wheel rendering and paint mapping](./03-interactive-color-wheel/color-wheel-rendering.md)
- [ ] [Zoom, pan, and paint detail interaction](./03-interactive-color-wheel/wheel-interaction.md)
- [ ] [Filter wheel by brand, collection, or owned paints](./03-interactive-color-wheel/wheel-filters.md)

### Epic: Cross-Brand Comparison

**Goal:** Help painters find duplicates, near-matches, and alternatives across manufacturers.

**High-Level Scope:**

- [ ] [Color distance algorithm and matching engine](./04-cross-brand-comparison/color-matching-engine.md)
- [ ] [Side-by-side paint comparison UI](./04-cross-brand-comparison/comparison-ui.md)
- [ ] [Substitute suggestions for discontinued paints](./04-cross-brand-comparison/substitute-suggestions.md)

### Epic: Color Scheme Explorer

**Goal:** Provide color theory tools so painters can make intentional, harmonious color choices.

**High-Level Scope:**

- [ ] [Color scheme generation (complementary, split-comp, analogous, triadic)](./05-color-scheme-explorer/scheme-generation.md)
- [ ] [Scheme visualization on the color wheel](./05-color-scheme-explorer/scheme-visualization.md)
- [ ] [Map schemes to available paints](./05-color-scheme-explorer/scheme-to-paints.md)

### Epic: Collection Tracking

**Goal:** Let users log and manage the paints they own for easy reference when planning projects.

**High-Level Scope:**

- [ ] [Add/remove paints to personal collection](./06-collection-tracking/manage-collection.md)
- [ ] [Collection overview and statistics](./06-collection-tracking/collection-overview.md)

### Epic: Community & Social

**Goal:** Enable painters to share painting recipes, curated palettes, and collections with the community.

**High-Level Scope:**

- [ ] [Painting recipes (step-by-step color layering guides)](./07-community-social/painting-recipes.md)
- [ ] [Curated palette sharing](./07-community-social/palette-sharing.md)
- [ ] [Community feed and discovery](./07-community-social/community-feed.md)
- [ ] [User profiles and shared collections](./07-community-social/user-profiles.md)
