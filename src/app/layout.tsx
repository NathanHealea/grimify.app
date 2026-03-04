import type { Metadata, Viewport } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'Miniature Paint Color Wheel',
  description: 'Interactive color wheel for miniature paint hobbyists',
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="overflow-hidden">{children}</body>
    </html>
  )
}
