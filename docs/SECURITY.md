# Security

Answers: what must be protected, and how? Security is a requirement from the first commit, not a final pass.

> Anything marked **TBD** is undecided. Ask; don't guess.

The site is static, with no accounts, forms, data or server code. Its security work is the response headers, the deploy credentials, and the dependencies.

## 1. Authentication

- **Provider:** None. The marketing site has no sign-in. Sign-in lives in the app (my.grimify.app).
- **Methods:** Not applicable.
- **Session handling:** None. The site sets no cookies.

## 2. Authorization

Not applicable. There are no roles: every page is public and the same for everyone.

The only privileged action is deploying, which needs Cloudflare credentials (§4).

## 3. Data Classification and Privacy

- **Sensitive data handled:** None. The site collects, stores and displays no data about people (confirmed 2026-10-20).
- **Obligations:** None for the site itself. If a form, analytics or any other data collection is added, this section must be revisited before it ships.
- **Rules:**
  - The site collects nothing: no forms, no cookies, and no `localStorage` or other browser storage.
  - Links to the app pass nothing: no query parameters identifying the visitor, and no tracking parameters. **TBD:** whether UTM-style source tags are allowed. They identify the source page, not the person, but they tie to the analytics decision.
  - Any analytics must be cookieless and collect no personal data. **TBD:** whether there's analytics at all (PRD §13).

## 4. Secrets

- Never hard-code credentials.
- Never commit secrets. `.env*` files are git-ignored.
- The site itself uses no secrets at build time or at runtime.
- Deploying needs Cloudflare credentials. Locally, `wrangler login` (interactive) is assumed. **TBD:** whether deploys will use an API token (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) instead, such as in CI. CI is out of scope for now.
- Rotate any credential that may have leaked.

## 5. Environment Variables

None at build time or at runtime. Only Wrangler's own deploy credentials, if a token is used (§4).

## 6. HTTP Security Headers

The headers live in `public/_headers`, apply to `/*`, and come from the scaffold plan (R4, T5):

- **`Content-Security-Policy`:**
  - `default-src 'self'`, `script-src 'self'`, `object-src 'none'` and `frame-ancestors 'none'`;
  - no `unsafe-eval`, and no `unsafe-inline` in `script-src`;
  - no wildcard, and no third-party `http:` or `https:` origin.
- **`X-Content-Type-Options: nosniff`.**
- **`Referrer-Policy`.** **TBD:** the exact value. The scaffold plan requires the header but names no value. `strict-origin-when-cross-origin` is the common choice.
- **`Permissions-Policy`.** It disables browser features the site doesn't use. **TBD:** the exact list.

JSON-LD structured data (PRD Feature 4) needs no CSP change. A `<script type="application/ld+json">` is a data block, which the browser never runs and the CSP never checks (ARCHITECTURE §8). Never add `unsafe-inline` or a hash to `script-src` for it.

Any change that needs a new origin (analytics, images on a CDN) changes the CSP. That change needs explicit approval and a test update.

**TBD:** whether to add `Strict-Transport-Security`. It isn't in the scaffold plan. On `workers.dev` it's less relevant; at the grimify.app cutover it should be decided.

## 7. API Security

Not applicable: no API, endpoints or forms. No input reaches any code.

## 8. Data Protection

- **Encryption in transit:** HTTPS, served by Cloudflare.
- **Encryption at rest:** Not applicable; no data is stored.
- **Retention and deletion:** Not applicable. Cloudflare's own request logs are outside this repo's control.

## 9. Logging

The site writes no logs; it has no code that runs at request time.

**Never log:** deploy credentials or API tokens. That includes CI output, if CI is added.

## 10. File Uploads

Not applicable.

## 11. Dependencies

- Every new dependency needs the owner's approval (global rule).
- Pin exact versions in `package.json`. **TBD:** which versions (scaffold plan open item).
- `wrangler` is a pinned dev dependency, run with `npx --no` so it never pulls a different version, matching the app.
- **TBD:** how dependencies are kept current: Dependabot, Renovate, or manual. Nothing is configured.
- **Check before trusting a new release:** the scaffold plan noted that Astro 7.4.1 was published the day it was planned, and asked whether to pin the previous patch instead.

## 12. Crawling

- `public/robots.txt` disallows all crawlers until launch (scaffold plan R5). It also names the sitemap URL, which is harmless while crawling is blocked.
- Launching for search is a single change: `Disallow: /` becomes `Allow: /` (or an empty `Disallow:`). It's a launch decision for the owner, never made in passing.
- Search-console verification, if used, is a static file in `public/` or a meta tag. It adds no third-party origin and no script.
- **TBD:** the launch date, when crawling is allowed (PRD §13).

## 13. Security Checklist

- [x] Authentication: not applicable (no accounts)
- [x] Authorization: not applicable (no roles)
- [x] Server-side input validation: not applicable (no input)
- [ ] Secrets protected (deploy credentials only)
- [x] Sensitive data identified: none
- [x] Rate limiting: not applicable (static assets at the edge)
- [x] File uploads: not applicable
- [ ] Security headers in `public/_headers` pass T5
- [ ] Errors expose nothing: the 404 page is static and shows no request details
- [ ] Dependencies reviewed and pinned

## 14. Open Questions

- **TBD:** Exact `Referrer-Policy` value and `Permissions-Policy` feature list (§6).
- **TBD:** HSTS at the grimify.app cutover (§6).
- **TBD:** Analytics, and whether UTM tags go on app links (§3).
- **TBD:** Deploy credentials: `wrangler login` or an API token (§4).
- **TBD:** Dependency update process (§11).
- **TBD:** Launch date for allowing crawlers (§12).
