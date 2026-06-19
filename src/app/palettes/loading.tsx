import { Main } from '@/components/main'
import { Skeleton } from '@/components/ui/skeleton'

export default function PalettesLoading() {
  return (
    <Main>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card card-body card-compact flex flex-col gap-3">
            <div className="flex flex-wrap gap-0.5">
              {Array.from({ length: 8 }, (_, j) => (
                <Skeleton key={j} className="rounded-sm" style={{ width: 28, height: 28 }} />
              ))}
            </div>
            <div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-1 h-3 w-1/2" />
              <div className="mt-2 flex gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Main>
  )
}
