import type { ReactNode } from 'react'

import { Navbar } from '@/components/navbar'
import { cn } from '@/lib/utils'
import { Geist } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body className="flex h-dvh flex-col">
        <Navbar />
        {children}
        <Toaster position="bottom-right" richColors closeButton theme="system" />
      </body>
    </html>
  )
}
