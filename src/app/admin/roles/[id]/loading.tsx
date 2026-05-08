import { Skeleton } from '@/components/ui/skeleton'

export default function AdminRoleDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <div className="mb-6">
        <Skeleton className="h-4 w-28" />
      </div>

      <div className="mb-8">
        <Skeleton className="h-9 w-40" />
      </div>

      <div className="space-y-8">
        <div className="rounded-lg border border-border p-6">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-40" />
          <div className="rounded-lg border border-border">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="ml-auto h-4 w-16" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      </div>
    </div>
  )
}
