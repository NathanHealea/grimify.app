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
    <section>
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {isAuthenticated ? 'Pick up where you left off' : 'Start your color research today'}
        </h2>
        <p className="text-base text-muted-foreground text-balance sm:text-lg">
          {isAuthenticated
            ? 'Jump back into your collection or build a palette for your next project.'
            : 'Free to use — sign up to save palettes and track your collection, or browse the paint library as a guest.'}
        </p>
        <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:gap-4">
          <Link href={primary.href} className="btn btn-primary btn-lg">
            {primary.label}
          </Link>
          <Link href={secondary.href} className="btn btn-ghost btn-lg">
            {secondary.label}
          </Link>
        </div>
      </div>
    </section>
  )
}
