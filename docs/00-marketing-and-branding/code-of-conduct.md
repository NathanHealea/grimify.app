# Code of Conduct

**Epic:** Marketing & Branding
**Type:** Feature
**Status:** Todo
**Branch:** `v1/feature/code-of-conduct`

## Summary

Create a Code of Conduct page that sets community expectations for behavior within Grimify, especially around shared content like recipes, palettes, and comments.

## Acceptance Criteria

- [ ] A `/code-of-conduct` route exists and is publicly accessible
- [ ] Code of Conduct covers: expected behavior, unacceptable behavior, reporting, and enforcement
- [ ] Content is written in a welcoming, inclusive tone
- [ ] Page is linked from the site footer
- [ ] Page is linked from community features (e.g., recipe/palette submission forms)
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route              | Description          |
| ------------------ | -------------------- |
| `/code-of-conduct` | Code of Conduct page |

## Key Files

| Action   | File                                       | Description          |
| -------- | ------------------------------------------ | -------------------- |
| Create   | `src/app/(legal)/code-of-conduct/page.tsx` | Code of Conduct page |
| Existing | `src/app/(legal)/layout.tsx`               | Shared legal layout  |

## Implementation

### 1. Create Code of Conduct page

A server component in the `(legal)` route group. Key sections:

- **Our Pledge** — Grimify is committed to a welcoming community for all miniature painters
- **Expected Behavior** — Be respectful, constructive, and supportive; give credit when sharing others' techniques
- **Unacceptable Behavior** — Harassment, hate speech, spam, plagiarism of recipes/guides, doxxing
- **Content Guidelines** — Shared recipes, palettes, and collections should be original or properly attributed
- **Reporting** — How to report violations (email or in-app reporting when available)
- **Enforcement** — Warnings, content removal, temporary/permanent bans
- **Scope** — Applies to all community features (recipes, palettes, profiles, future comments/forums)
- **Contact** — How to reach the Grimify team

### 2. Link from footer and community features

Add a link in the site footer alongside Terms of Use. Reference the Code of Conduct in community submission flows.

## Notes

- Consider basing this on the Contributor Covenant (https://www.contributor-covenant.org/) adapted for a user community rather than open-source contributors.
- The Code of Conduct can be expanded as community features grow.
- Enforcement mechanisms (reporting, moderation) are implemented in the Community & Social epic — this page just defines the rules.
