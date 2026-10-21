# Grimify marketing site

The public marketing site for Grimify at grimify.app. The app itself lives at my.grimify.app (repo `NathanHealea/my.grimify.app`, checked out in `../my.grimify.app`).

## Quick facts
- Stack: Astro (static output only), plain CSS files, Cloudflare Workers (static assets). No adapter, no server rendering.
- Accessibility: WCAG 2.1 AA on every page.
- Anything marked **TBD** in /docs is undecided. Ask; don't guess.

## Workflow
1. Plan first. Don't write code until I approve the plan.
2. Make small, focused changes.
3. Run the verify commands before saying you're done.

## Work Item Workflow
- work_items_root: docs/implementation-plans
- base_branch: main
- verify_commands:
  - npm run check
  - npm run build

@docs/AGENTS.md
