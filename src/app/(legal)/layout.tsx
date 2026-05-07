import type { ReactNode } from 'react'

/**
 * Shared layout for legal pages (Terms of Use, Code of Conduct).
 *
 * Wraps children in a centered, readable column with generous vertical
 * spacing. Pages render their own semantic content (`<h1>`, `<h2>`, `<p>`)
 * with utility classes for typography.
 */
export default function LegalLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <main className="mx-auto w-full max-w-3xl px-6 py-12">{children}</main>
}
