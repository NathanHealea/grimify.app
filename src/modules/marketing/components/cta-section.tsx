import Link from 'next/link'

/**
 * Marketing call-to-action section. Renders an auth-aware pair of buttons:
 * signed-out visitors are pushed toward sign-up, signed-in visitors are
 * pointed at their collection and palette tools.
 *
 * @param props.isAuthenticated - Whether the current viewer has a Supabase
 *   session. Drives which CTA pair renders.
 */
export function CtaSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const primary = isAuthenticated
    ? { label: 'Open your collection', href: '/collection' }
    : { label: 'Create your account', href: '/sign-up' }
  const secondary = isAuthenticated
    ? { label: 'Build a palette', href: '/user/palettes' }
    : { label: 'Browse paints', href: '/paints' }

  return (
    <section className="marketing-section">
      <div className="marketing-section-body-sm">
        <header className="marketing-section-header">
          <p className="marketing-section-eyebrow">
            {isAuthenticated ? 'Welcome back' : 'Get started'}
          </p>
          <h2 className="marketing-section-heading">
            {isAuthenticated ? 'Pick up where you left off' : 'Stop buying duplicate paints.'}
          </h2>
          <p className="marketing-section-desc">
            {isAuthenticated
              ? 'Jump back into your collection or build a palette for your next project.'
              : 'Search Citadel, Vallejo, Army Painter, and every major brand — free, no account needed. Sign up to save palettes and track your shelf.'}
          </p>
        </header>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link href={primary.href} className="btn btn-primary btn-lg">
            {primary.label}
          </Link>
          <Link href={secondary.href} className="btn btn-outline btn-lg">
            {secondary.label}
          </Link>
        </div>
      </div>
    </section>
  )
}
