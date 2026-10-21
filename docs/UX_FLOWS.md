# UX Flows

Answers: what does the user actually do, step by step?

> Anything marked **TBD** is undecided. Ask; don't guess.

Every flow must work with a keyboard alone and be announced correctly by a screen reader (WCAG 2.1 AA). Every flow also works with JavaScript disabled: the site is static HTML and CSS, and no flow depends on a script.

Every page has the same header and footer:

- **Header:** "Grimify" (links to `/`), "FAQ" (links to the FAQ page), and "Open Grimify" (links to https://my.grimify.app/).
- **Footer:** repeats the same three links.
- A "Skip to main content" link comes first in the tab order.

## Flow Map

```text
Search result / shared link / typed URL
    ↓
Landing page (/) ──→ FAQ ──→ Open Grimify ──→ my.grimify.app
    │                                              ↑
    └──────────────→ Open Grimify ─────────────────┘

Unknown path ──→ 404 page ──→ Landing page or Open Grimify
```

## Flow 1 — Learn about Grimify and open the app

**Feature:** PRD Feature 1, Landing page
**Actor:** Hobby miniature painter

1. The visitor arrives at `/`.
2. They read the headline and the four feature sections: track paints you own, favorite or want; search across brands; cross-brand equivalents; palettes.
3. They activate "Open Grimify" from the header, the hero, or the footer.
4. The browser navigates to https://my.grimify.app/ in the same tab.

- **Success:** The visitor is on the app's home page.
- **Failure:** If my.grimify.app is down, the browser shows its own error, because the marketing site has no way to detect it. The visitor uses Back to return.
- **Loading state:** None. The page is static HTML; there are no spinners or skeletons.
- **Empty state:** Not applicable. All content is static.
- **Error state:** Not applicable on this page. Unknown paths go to Flow 3.

**TBD:** whether "Open Grimify" opens in the same tab (assumed above) or a new one. Same tab is the default; a new tab would need a visible and announced "opens in a new tab" cue.

## Flow 2 — Get questions answered

**Feature:** PRD Feature 2, FAQ
**Actor:** Hobby miniature painter

1. The visitor activates "FAQ" from the header or footer, or a link on the landing page.
2. They read the questions and answers. Each question is a heading, so screen-reader users can jump between questions.
3. They activate "Open Grimify".

- **Success:** The visitor has their answer and is on my.grimify.app.
- **Failure:** Their question isn't listed. There's no contact form (PRD §7). **TBD:** whether the FAQ points to any contact route, such as the app repo's GitHub Issues.
- **Loading state:** None.
- **Empty state:** Not applicable.
- **Error state:** Not applicable.

**TBD:** whether answers use native `<details>`/`<summary>` disclosure or are always visible. Either works without JavaScript; always visible is simpler and searchable with the browser's find.

## Flow 3 — Land on a page that doesn't exist

**Feature:** PRD Feature 3, 404 page
**Actor:** Any visitor, including people with old links to app paths

1. The visitor requests an unknown path.
2. The server returns HTTP 404 with the not-found page.
3. The page states the page wasn't found and offers links to `/` and https://my.grimify.app/.

- **Success:** The visitor follows a link to the home page or the app.
- **Failure:** None beyond the page itself.
- **Loading state:** None.
- **Empty state:** Not applicable.
- **Error state:** This flow *is* the error state. The `<title>` and `<h1>` both say the page wasn't found, so screen-reader users hear it immediately.

Old app paths (`/paints`, `/palettes/*` and others) are redirected to my.grimify.app by the separate cutover work item. Until then they never reach this site, because grimify.app still serves the app.

## Open Questions

- **TBD:** Does "Open Grimify" open in the same tab or a new tab? (Flow 1. Same tab assumed.)
- **TBD:** Is there a contact route for questions the FAQ doesn't answer? (Flow 2)
- **TBD:** FAQ format: always visible, or `<details>` disclosure? (Flow 2)
- Assumption: no flow uses JavaScript. If one ever does, it needs a no-JS fallback, and the CSP in SECURITY.md already restricts scripts to same-origin.
