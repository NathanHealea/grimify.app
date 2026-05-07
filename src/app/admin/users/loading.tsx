import { Skeleton } from '@/components/ui/skeleton'

export default function AdminUsersLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="ml-auto h-3 w-20" />
      </div>

      <div className="rounded-lg border border-border">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="ml-auto h-4 w-24" />
        </div>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
