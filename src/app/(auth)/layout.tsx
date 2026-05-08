import type { ReactNode } from 'react'
import Link from 'next/link'

import { Logo } from '@/components/logo'
import { Main } from '@/components/main'

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Main
      width="full"
      padding="none"
      className="flex min-h-screen w-full flex-col items-center justify-center gap-8 px-4 py-24"
    >
      <Link href="/" aria-label="Grimify home" className="inline-flex">
        <Logo size="2xl" variant="full" />
      </Link>
      {children}
    </Main>
  )
}
