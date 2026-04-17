'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'

import { AdminSidebar } from '@/modules/admin/components/admin-sidebar'

/**
 * Client wrapper for the admin layout that manages mobile sidebar state.
 *
 * Provides a hamburger toggle for the sidebar on mobile viewports and
 * renders children in a flex layout alongside the sidebar.
 *
 * @param props.children - The page content rendered in the main area.
 */
export function AdminLayoutClient({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col">
        <div className="border-b border-border p-2 lg:hidden">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar navigation"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
        </div>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
