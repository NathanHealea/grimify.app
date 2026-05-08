import { Skeleton, SkeletonCircle } from '@/components/ui/skeleton'

export default function UserProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="rounded-lg border border-border p-6">
        <div className="mb-6 flex items-center gap-4">
          <SkeletonCircle className="size-18 shrink-0" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  )
}
