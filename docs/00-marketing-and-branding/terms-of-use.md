# Terms of Use

**Epic:** Marketing & Branding
**Type:** Feature
**Status:** Todo
**Branch:** `v1/feature/terms-of-use`

## Summary

Create a Terms of Use page that outlines the rules and guidelines for using Grimify, covering user responsibilities, content ownership, and liability.

## Acceptance Criteria

- [ ] A `/terms` route exists and is publicly accessible
- [ ] Terms cover: account usage, user-generated content, intellectual property, liability limitations, and termination
- [ ] Content is written in clear, readable language
- [ ] Page is linked from the site footer
- [ ] Page is linked from the sign-up flow (e.g., "By signing up, you agree to our Terms of Use")
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route    | Description       |
| -------- | ----------------- |
| `/terms` | Terms of Use page |

## Key Files

| Action | File                             | Description                                              |
| ------ | -------------------------------- | -------------------------------------------------------- |
| Create | `src/app/(legal)/terms/page.tsx` | Terms of Use page                                        |
| Create | `src/app/(legal)/layout.tsx`     | Shared layout for legal pages (centered, readable width) |

## Implementation

### 1. Create legal layout

A `(legal)` route group with a layout that renders content at a readable max-width (e.g., `max-w-3xl mx-auto`) with generous padding.

### 2. Create terms page

A server component rendering the Terms of Use content. Use semantic HTML headings and paragraphs. Key sections:

- **Acceptance of Terms** — Using the app means you agree
- **Account Responsibilities** — Accurate info, password security
- **User-Generated Content** — Users own their content but grant Grimify a license to display it
- **Paint Data** — Paint data is sourced from manufacturers; Grimify does not claim ownership
- **Prohibited Conduct** — No abuse, scraping, or malicious behavior
- **Limitation of Liability** — App provided as-is
- **Termination** — Grimify can suspend accounts that violate terms
- **Changes to Terms** — Terms may be updated with notice
- **Contact** — How to reach Grimify for questions

### 3. Link from footer and sign-up

Add a link in the site footer and a note on the sign-up page referencing the terms.

## Notes

- This is not legal advice — consider having a lawyer review before launch.
- Keep the language simple and avoid excessive legalese.
- The legal layout is shared with the Code of Conduct page.
