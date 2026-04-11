import { Navbar } from '@/components/navbar'
import { cn } from '@/lib/utils'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  )
}
