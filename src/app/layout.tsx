import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'
import { cn } from '@/lib/utils'
import { siteUrl } from '@/modules/seo/utils/site-url'
import { Geist } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

const description =
  'Interactive color research and collection management for miniature painters — paint library, cross-brand comparisons, palettes, and recipes.'

/**
 * Default site metadata. Page-level `metadata` exports and `generateMetadata`
 * functions may override individual fields (title, description, openGraph)
 * per route.
 *
 * Favicons live in `src/app/` (icon.svg, apple-icon.png, favicon.ico) and are
 * picked up automatically by Next.js's file conventions. The supplementary
 * Android/PWA icon set lives in `public/branding/` and is referenced via the
 * web manifest.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Grimify',
    template: '%s · Grimify',
  },
  description,
  applicationName: 'Grimify',
  keywords: [
    'miniature painting',
    'warhammer paints',
    'paint comparison',
    'paint collection',
    'color palette',
    'color wheel',
    'recipes',
    'tabletop hobby',
  ],
  authors: [{ name: 'Nathan Healea' }],
  manifest: '/branding/site.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'Grimify',
    title: 'Grimify',
    description,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Grimify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grimify',
    description,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body className="flex min-h-dvh flex-col">
        <Navbar />
        {children}
        <Footer />
        <Toaster position="bottom-right" richColors closeButton theme="system" />
      </body>
    </html>
  )
}
