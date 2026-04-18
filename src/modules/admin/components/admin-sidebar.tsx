'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

/** Navigation items for the admin sidebar. */
const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/roles', label: 'Roles' },
]

/**
 * Admin sidebar navigation component.
 *
 * Renders a vertical nav with route-aware active highlighting.
 * On mobile, renders as an overlay drawer controlled by parent state.
 *
 * @param props.open - Whether the mobile drawer is open.
 * @param props.onClose - Callback to close the mobile drawer.
 */
export function AdminSidebar({
  open,
  onClose,
}: {
  open?: boolean
  onClose?: () => void
}) {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    if (exact) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const navContent = (
    <nav className="sidebar-nav">
      <p className="sidebar-header">Admin</p>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClose}
          className={cn(
            'sidebar-item',
            isActive(item.href, item.exact) && 'sidebar-item-active',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar">{navContent}</aside>

      {/* Mobile overlay drawer */}
      {open && (
        <>
          <div className="sidebar-overlay" onClick={onClose} />
          <aside className="sidebar-mobile">{navContent}</aside>
        </>
      )}
    </>
  )
}
