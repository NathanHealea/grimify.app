import type { ReactNode } from 'react'

import { AdminLayoutClient } from '@/modules/admin/components/admin-layout-client'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
