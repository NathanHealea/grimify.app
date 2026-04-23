import Link from 'next/link'

export default async function AdminUserCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="mb-6">
        <Link
          href={`/admin/users/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to user
        </Link>
      </div>
      <h1 className="text-2xl font-bold">User collection</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        The admin collection management UI is being rebuilt. Check back soon.
      </p>
    </div>
  )
}
