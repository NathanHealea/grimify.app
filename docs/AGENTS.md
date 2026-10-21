# AI Coding Agent Instructions

Operational rules for any AI coding agent working in this repository.

## 1. Project Context

- **Project:** Grimify marketing site (grimify.app)
- **Purpose:** A static site that explains Grimify to miniature painters and sends them to the app at https://my.grimify.app/.
- **Primary users:** Hobby miniature painters (PRD §4)
- **Hard constraints:**
  - WCAG 2.1 AA on every page, in light and dark mode.
  - Static output only: no server code, no adapter.
  - No personal data collected: no forms, cookies, or browser storage.

## 2. Source of Truth

Before any significant change, read the relevant documents in `docs/`:

- `PRD.md`: what the site is for, its three pages, non-goals, and copy tone rules.
- `UX_FLOWS.md`: the three visitor flows, plus the header and footer on every page.
- `DESIGN_SYSTEM.md`: the look, which matches the app; tokens and accessibility rules.
- `ARCHITECTURE.md`: the static Astro build, the Cloudflare Worker, project structure, and dependency rules.
- `SECURITY.md`: security headers and CSP, deploy credentials, no data collection.
- `CODE_STYLE.md`: naming, styling rules (no inline styles, no `<style>` blocks), and tooling.
- `TESTING.md`: test levels, critical flows, and commands.
- `implementation-plans/`: work items for the wi workflow.

Do not contradict these documents. If a task conflicts with one, stop and name the conflict. Anything marked **TBD** is undecided: ask, do not assume.

The app's docs (`../my.grimify.app/docs/`) are the source of truth for facts about the app (features, brands, labels) and for design tokens. Read them; never edit them.

## 3. General Rules

- Understand existing code before modifying it
- Reuse existing components and styles
- Follow the design system, architecture, security rules, and code style
- Do not invent product claims, pages, features, or copy facts. Every claim about the app must match the app's docs
- Do not expose secrets
- Do not add dependencies without approval
- Do not make unrelated changes

## 4. Planning

Before a non-trivial task:

1. Read the relevant documentation
2. Read the relevant code
3. Identify affected files and dependencies
4. Identify security (CSP, headers) and accessibility impact
5. Identify the tests required
6. Write a concise plan, as a wi work item under `docs/implementation-plans/`, and wait for approval

Don't write code until the plan is approved.

## 5. Implementation

- Make the smallest correct change
- Reuse established patterns
- Preserve existing behavior

## 6. Validation

After implementation, run the verify commands, then review the diff for unintended changes:

- `npm run check`
- `npm run build`

TESTING.md §7 lists the other commands (`npm run lint` and `npm run test:e2e`) as the work items that add them land. Pages also need the manual accessibility pass in TESTING.md §2.

## 7. Documentation

Update the matching document in the same change when implementation alters it:

| Change | Update |
|---|---|
| Product requirement, page, or copy rule | PRD.md |
| Visitor journey, navigation | UX_FLOWS.md |
| Visual design, tokens | DESIGN_SYSTEM.md |
| Architecture, structure, dependencies | ARCHITECTURE.md |
| Headers, CSP, crawling, credentials | SECURITY.md |
| Coding convention, tooling | CODE_STYLE.md |
| Testing strategy, commands | TESTING.md |

## 8. Project-Specific Rules

- Never modify anything in `../my.grimify.app` or `../old.grimify.app`. Reading them is fine.
- Never add routes for `grimify.app` or `www.grimify.app` to `wrangler.json`. That belongs to the separate cutover work item.
- Never add a dependency without asking.
- Plan first; wait for approval before writing code.

## 9. Completion Criteria

A task is complete only when:

- Requirements are satisfied
- Validation commands pass
- No unintended files changed
- Security and accessibility rules are respected
- Documentation is updated where needed

## 10. Open Questions

- None specific to this document. The other documents list their own; find them with `grep -rn "TBD" docs/`.
