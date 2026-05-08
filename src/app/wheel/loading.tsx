import { Main } from '@/components/main'
import { Skeleton, SkeletonCircle } from '@/components/ui/skeleton'

export default function WheelLoading() {
  return (
    <Main width="full" padding="compact" className="flex flex-col gap-4 lg:flex-row max-w-7xl">
      <div className="flex flex-1 flex-col items-center gap-4 p-4">
        <div className="flex gap-1 rounded-lg border border-border p-1">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>

        <Skeleton className="h-12 w-full max-w-2xl" />

        <SkeletonCircle className="aspect-square w-full max-w-2xl" />
      </div>

      <aside className="flex w-full flex-col gap-3 lg:w-80">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </aside>
    </Main>
  )
}
