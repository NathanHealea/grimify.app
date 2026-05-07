import Link from 'next/link'

/**
 * Site footer (server component).
 *
 * Sits at the bottom of the root layout's flex column. Provides the copyright
 * line, links to legal pages (`/terms`, `/code-of-conduct`), and an external
 * link to the project repository.
 */
export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
        <p>&copy; {year} Grimify</p>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-4">
          <Link href="/terms" className="hover:text-foreground hover:underline underline-offset-4">
            Terms of Use
          </Link>
          <Link
            href="/code-of-conduct"
            className="hover:text-foreground hover:underline underline-offset-4"
          >
            Code of Conduct
          </Link>
          <a
            href="https://github.com/NathanHealea/grimify.app"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground hover:underline underline-offset-4"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  )
}
