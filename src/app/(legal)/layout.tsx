import type { ReactNode } from 'react'

/**
 * Shared layout for legal pages (Terms of Use, Code of Conduct).
 *
 * Pages within this group own their semantic `<main>` via the shared
 * {@link Main} component, so this layout is a transparent passthrough.
 */
export default function LegalLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>
}
