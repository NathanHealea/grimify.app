import { Skeleton, SkeletonCircle } from '@/components/ui/skeleton'

export default function AdminUserDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="rounded-lg border border-border p-6">
        <div className="mb-6 flex items-center gap-4">
          <SkeletonCircle className="size-16 shrink-0" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
