import Link from 'next/link'

import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Props for {@link NotFoundContent}.
 */
export interface NotFoundContentProps {
  /** Whether the current viewer has a Supabase session. Drives which secondary destinations render. */
  isAuthenticated: boolean
}

/**
 * 404 page body rendered by the root `not-found.tsx` segment.
 *
 * Lays out a hero-style heading band, a primary "Back to home" CTA, and a
 * contextual grid of common destinations. Authenticated viewers also see links
 * to their collection and palettes.
 *
 * @param props - See {@link NotFoundContentProps}.
 */
export function NotFoundContent({ isAuthenticated }: NotFoundContentProps) {
  return (
    <section className=" bg-gradient-to-b from-muted/40 to-background rounded rounded-b-none rounded-t-3xl">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-24">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          Page not found
        </h1>
        <p className="text-lg text-muted-foreground text-balance sm:text-xl">
          We couldn&apos;t find that page. It may have been moved, deleted, or the link might be
          wrong.
        </p>
        <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:gap-4">
          <Link href="/" className="btn btn-primary btn-lg">
            Back to home
          </Link>
        </div>
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          <Link href="/paints" className="card transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="text-base">Browse paints</CardTitle>
              <CardDescription>Search across every major brand</CardDescription>
            </CardHeader>
          </Link>
          <Link href="/brands" className="card transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="text-base">Explore brands</CardTitle>
              <CardDescription>Browse paint lines by manufacturer</CardDescription>
            </CardHeader>
          </Link>
          <Link href="/palettes" className="card transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="text-base">Discover palettes</CardTitle>
              <CardDescription>Find inspiration from the community</CardDescription>
            </CardHeader>
          </Link>
          {isAuthenticated && (
            <>
              <Link href="/collection" className="card transition-colors hover:bg-accent">
                <CardHeader>
                  <CardTitle className="text-base">Your collection</CardTitle>
                  <CardDescription>Pick up where you left off</CardDescription>
                </CardHeader>
              </Link>
              <Link href="/user/palettes" className="card transition-colors hover:bg-accent">
                <CardHeader>
                  <CardTitle className="text-base">Your palettes</CardTitle>
                  <CardDescription>View and manage your palettes</CardDescription>
                </CardHeader>
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
