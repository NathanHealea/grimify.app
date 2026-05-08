import { Skeleton, SkeletonCircle } from '@/components/ui/skeleton'

export default function AdminDashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border p-6">
        <div className="mb-4 flex flex-col gap-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>

        <div className="flex flex-col">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-t border-border py-3 first:border-t-0">
              <SkeletonCircle className="size-8 shrink-0" />
              <div className="flex flex-1 flex-col gap-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
