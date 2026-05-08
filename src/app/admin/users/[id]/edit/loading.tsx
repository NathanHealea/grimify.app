import { Skeleton } from '@/components/ui/skeleton'

export default function AdminUserEditLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="mb-6">
        <Skeleton className="h-4 w-28" />
      </div>

      <div className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="space-y-6">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-lg border border-border p-6">
            <div className="mb-6 flex flex-col gap-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>

            <div className="flex flex-col gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
