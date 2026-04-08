import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <Link href="/" className="btn btn-ghost btn-sm absolute top-4 left-4" aria-label="Back to app">
        <ArrowLeftIcon className="size-5" />
        <span className="hidden sm:inline">Back</span>
      </Link>
      {children}
    </div>
  )
}
