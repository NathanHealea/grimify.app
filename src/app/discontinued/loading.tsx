import { Main } from '@/components/main'
import { Skeleton } from '@/components/ui/skeleton'

export default function DiscontinuedLoading() {
  return (
    <Main width="6xl">
      <div className="mb-8 flex flex-col gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-80" />
      </div>

      <div className="flex flex-col gap-8">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="grid gap-6 rounded-lg border border-border p-4 sm:grid-cols-[minmax(0,18rem)_1fr]"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <Skeleton className="size-16 shrink-0 rounded-lg" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>

            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-32" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }, (_, j) => (
                  <div key={j} className="flex flex-col items-center gap-2 rounded-lg border border-border p-3">
                    <Skeleton className="size-16" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Main>
  )
}
