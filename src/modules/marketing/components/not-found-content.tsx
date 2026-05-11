import Link from 'next/link'

import { PageHeader, PageSubtitle, PageTitle } from '@/components/page-header'

/**
 * Props for {@link NotFoundContent}.
 */
export interface NotFoundContentProps {
  /**
   * Whether the current viewer has a Supabase session. Drives which secondary
   * destinations render — signed-in viewers also see `/collection` and
   * `/user/palettes`.
   */
  isAuthenticated: boolean
}

type Destination = {
  href: string
  label: string
  hint: string
}

const GUEST_DESTINATIONS: Destination[] = [
  { href: '/paints', label: 'Browse paints', hint: 'Search across every major brand.' },
  { href: '/schemes', label: 'Explore color schemes', hint: 'Browse color theory and harmonies.' },
  { href: '/palettes', label: 'Browse palettes', hint: 'See palettes shared by the community.' },
]

const SIGNED_IN_DESTINATIONS: Destination[] = [
  { href: '/collection', label: 'Open your collection', hint: 'Jump back into the paints you own.' },
  { href: '/user/palettes', label: 'Your palettes', hint: 'Pick up where you left off.' },
]

/**
 * 404 page body rendered by the root `not-found.tsx` segment.
 *
 * Lays out a hero-style heading band (Page not found / subtitle), a primary
 * "Back to home" CTA, and a contextual list of common destinations. The
 * destination list grows when the viewer is signed in to surface their own
 * collection and palettes.
 *
 * @param props - See {@link NotFoundContentProps}.
 */
export function NotFoundContent({ isAuthenticated }: NotFoundContentProps) {
  const destinations = isAuthenticated
    ? [...GUEST_DESTINATIONS, ...SIGNED_IN_DESTINATIONS]
    : GUEST_DESTINATIONS

  return (
    <div className="flex flex-col items-center gap-10 py-8 text-center sm:py-12">
      <PageHeader className="items-center text-center">
        <PageTitle>Page not found</PageTitle>
        <PageSubtitle>
          We couldn&apos;t find that page on Grimify. The link may be broken or the page may have
          moved.
        </PageSubtitle>
      </PageHeader>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <Link href="/" className="btn btn-primary btn-lg">
          Back to home
        </Link>
      </div>

      <section className="w-full max-w-2xl">
        <h2 className="page-title-md mb-4 text-center">Try one of these instead</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {destinations.map((destination) => (
            <li key={destination.href}>
              <Link
                href={destination.href}
                className="btn btn-ghost h-auto w-full flex-col items-start gap-1 py-3 text-left"
              >
                <span className="font-medium">{destination.label}</span>
                <span className="text-sm text-muted-foreground">{destination.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
