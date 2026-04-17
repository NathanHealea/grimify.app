import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Total users
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  // Users with completed profile setup
  const { count: setupComplete } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('has_setup_profile', true)

  // Look up admin role ID, then count admins
  const { data: adminRole } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'admin')
    .single()

  let adminCount = 0
  if (adminRole) {
    const { count } = await supabase
      .from('user_roles')
      .select('user_id', { count: 'exact', head: true })
      .eq('role_id', adminRole.id)
    adminCount = count ?? 0
  }

  // Recent sign-ups (last 5)
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of user and role statistics.
        </p>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-2xl">{totalUsers ?? 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Profile Setup Complete</CardDescription>
            <CardTitle className="text-2xl">{setupComplete ?? 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Admins</CardDescription>
            <CardTitle className="text-2xl">{adminCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Recent sign-ups */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sign-ups</CardTitle>
          <CardDescription>The 5 most recent users.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentUsers && recentUsers.length > 0 ? (
            <ul className="divide-y divide-border">
              {recentUsers.map((user) => (
                <li key={user.id} className="flex items-center gap-3 py-3">
                  <div className="avatar avatar-sm">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.display_name ?? 'User avatar'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="avatar-placeholder avatar-sm">
                        {(user.display_name ?? '?').charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 truncate">
                    <p className="truncate text-sm font-medium">
                      {user.display_name ?? 'Unnamed user'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            },
                          )
                        : 'Unknown date'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
