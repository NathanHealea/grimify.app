# MVP Overview

**Grimify** — An interactive color research and collection management app for miniature painters.

This document defines the **minimum viable product**: the smallest set of features that delivers Grimify's core value to a miniature painter and is shippable as a public product. It is derived by reviewing every epic in `docs/` and cross-referencing each feature's status in [`overview.md`](./overview.md).

## What Grimify Must Do at Launch

The MVP must let a painter complete this core loop without friction:

> **Search** a paint (by name, hex, or brand) → **compare** across brands (substitutes and near-matches) → plan a **scheme** (color theory relationships) → **track** what they own (personal collection) → build a **palette** (save and organize their choices).

Everything required to support that loop — plus the authentication, branding, and admin data-management needed to operate and launch it — is in MVP scope. The interactive color wheel, social/community layers, niche organizational tools, and internal refactors are explicitly deferred.

## Status Key

| Status          | Meaning                                            |
| --------------- | -------------------------------------------------- |
| `[x]`           | Completed per `overview.md`                         |
| `[~]`           | In progress per `overview.md`                       |
| `[ ]`           | Not started per `overview.md`                       |

---

## MVP Scope

### ✅ Epic: Authentication & User Accounts — _MVP (complete)_

Foundation for every personalized feature. Required before collection tracking and palettes.

- [x] Sign up / sign in via Supabase Auth
- [x] User profile creation on first login
- [x] Protected routes for authenticated features
- [x] User roles (user, admin)
- [x] Social media login (Google, Discord)
- [x] User password reset and change
- [x] Edit user profile

### ✅ Epic: Paint Data & Search — _MVP (core complete)_

The core data layer and the entry point of the loop; every paint feature depends on it.

- [x] Paint data model and seed data
- [x] Paint search by name, hex, and brand
- [x] Brand and product line browsing
- [x] Munsell hue system + paint search v2 rearchitecture
- [x] Navbar paint search bar
- [x] Paint explorer filters (brand, type, line, discontinued, metallic)
- [x] Paint explorer sort (hue, lightness, contrast)
- [~] Paint database data improvement — _ongoing data quality; not launch-blocking_

> Deferred (not MVP): compact list view, reactive hue counts, mobile action buttons, additional paint-line indexing (Scale75 done; Army Painter Effects later).

### ✅ Epic: Cross-Brand Comparison — _MVP (complete)_

A primary reason painters use Grimify: find duplicates, near-matches, and substitutes.

- [x] Color distance algorithm and matching engine
- [x] Side-by-side paint comparison UI
- [x] Substitute suggestions for discontinued paints
- [x] Similar paints on the paint detail page

### ✅ Epic: Color Scheme Explorer — _MVP (core complete)_

Color theory tools so painters make intentional choices.

- [x] Color scheme generation (complementary, split-comp, analogous, triadic)
- [x] Paint details color schemes section
- [x] Paint detail color schemes — brand filter

> Deferred (not MVP): scheme visualization on the wheel, map-schemes-to-paints, public schemes catalog — valuable enhancements, but the explorer is functional without them.

### ✅ Epic: Collection Tracking — _MVP (core complete)_

Personalizes the app; the "what do I own" step of the loop.

- [x] Add/remove paints to personal collection
- [x] Collection dashboard
- [x] Collection toast feedback

> Deferred (not MVP): collection overview/statistics, bulk paint import.

### ✅ Epic: Color Palettes — _MVP (core complete)_

The "save and organize my choices" step; heavily built out and the destination of the loop.

- [x] Palette database schema and module scaffold
- [x] Palette management (list, create, edit, delete)
- [x] Add to palette from paint cards and color schemes
- [x] Drag-and-drop palette reorder
- [x] Hue-locked HSL paint swap
- [x] Palette description markdown editor
- [x] Public palettes catalog & user routes
- [x] Color palette groups + sorting

> Deferred (not MVP): paint group references (multi-group), palette paint search type display — refinements on a working feature.

### 🟡 Epic: Marketing & Branding — _MVP (launch-blocking gaps remain)_

Required to present Grimify as a real, trustworthy product at launch.

- [x] Color scheme and theme
- [x] Metadata and OpenGraph
- [x] Terms of Use
- [x] Code of Conduct
- [x] Per-page skeleton loading screens
- [x] Shared `<Main>` and `<PageHeader>` components
- [x] Mobile-friendly navbar
- [x] Navbar user menu
- [x] 404 not-found page
- [ ] **Homepage marketing landing page** — first impression for new visitors
- [ ] Branding images — _desirable for polish; soft-MVP_

### 🟡 Epic: Color Management (Admin) — _MVP (operationally required)_

Someone must be able to maintain the paint/brand/hue data the entire app depends on.

- [x] Admin layout and navigation
- [ ] **Brand management**
- [ ] **Hue management**
- [ ] **Paint management**

### 🟡 Epic: User Management (Admin) — _MVP (core complete)_

Minimum admin tooling to run the platform.

- [x] Admin dashboard and navigation
- [x] Role management (CRUD and assignment)
- [x] User account management
- [x] Collection management

> Deferred (not MVP): admin profile editing, profile/account merging, self-service profile deletion.

---

## Out of MVP Scope (Deferred)

These epics are intentionally excluded from the MVP. They add value but are not required for the core loop, and several are high-complexity layers best built once the foundation is live.

| Epic | Why deferred |
| ---- | ------------ |
| **Interactive Color Wheel** | De-scoped from MVP per current product direction — the core loop no longer centers the wheel. The visual mapping is a differentiator to layer on post-launch, not a requirement for search → compare → scheme → track → palette. |
| **Community & Social** (feed, public profiles) | Highest-complexity layer; depends on a mature base. The app is useful as a personal tool before it is social. |
| **Painting Recipes** | A large sub-application (sections, steps, paints, photos, notes, sharing); mostly incomplete. Not part of the core loop. |
| **Army Management** | Niche palette-tagging feature; valuable for organization but not core. |
| **Purchase List** | Shopping/wishlist convenience; orthogonal to color research and collection tracking. |
| **Application Improvements** | Internal refactors (DnD utilities, hooks, footer version, commit hooks); no direct user-facing MVP value. |
| **Other** (Button / Input & Textarea prop refactors) | Internal component-API cleanups. |

---

## Implementation Group Order

Everything below is **in MVP scope but not yet complete**. Work the groups top-to-bottom; items within a group are listed in their recommended implementation order. Check items off as they ship.

### Group 1 — Admin Data Management

_Operationally required: someone must be able to maintain the paint/brand/hue data the entire app depends on. Implemented in dependency order — brands and hues exist before paints reference them._

- [ ] Brand management
- [ ] Hue management
- [ ] Paint management

### Group 2 — Launch Presentation

_The public first impression and visual polish needed to present Grimify as a real, trustworthy product at launch._

- [ ] Homepage marketing landing page
- [ ] Branding images _(soft — desirable for polish, not strictly launch-blocking)_

### Group 3 — Data Quality (ongoing)

_Non-blocking; continues after launch as a rolling data-quality effort._

- [ ] Paint database data improvement

---

Once Groups 1 and 2 close, the core loop — search → compare → scheme → track → palette — is fully supported behind authentication, with admin tooling to maintain the data and a presentable public shell. That constitutes the Grimify MVP.
