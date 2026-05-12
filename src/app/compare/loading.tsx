import { Main } from '@/components/main'
import { Skeleton } from '@/components/ui/skeleton'

export default function CompareLoading() {
  return (
    <Main>
      <Skeleton className="mb-4 h-4 w-32" />
      <div className="mb-8 flex flex-col gap-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-80" />
      </div>

      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-full max-w-md" />

        <div className="flex flex-col gap-4 sm:flex-row sm:overflow-x-auto">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="flex w-56 shrink-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:w-64"
            >
              <Skeleton className="h-32 w-full sm:h-40" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </Main>
  )
}
