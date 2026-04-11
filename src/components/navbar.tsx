import Link from 'next/link'

export function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-start">
        <Link href="/" className="navbar-brand">
          Grimify
        </Link>
      </div>
      <div className="navbar-end">
        <Link href="/sign-in" className="btn btn-ghost btn-sm">
          Sign In
        </Link>
        <Link href="/sign-up" className="btn btn-primary btn-sm">
          Sign Up
        </Link>
      </div>
    </nav>
  )
}
