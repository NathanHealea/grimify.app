import { Main } from '@/components/main'
import { Skeleton } from '@/components/ui/skeleton'

export default function PaletteDetailLoading() {
  return (
    <Main>
      <div className="flex flex-col gap-6">
        {/* Header card skeleton — mirrors PaletteDetail header card */}
        <div className="card card-body">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-4 w-full max-w-md" />
              <div className="mt-1 flex gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
            <Skeleton className="h-8 w-16 shrink-0" />
          </div>
          {/* Swatch strip placeholder */}
          <div className="mt-4 flex flex-wrap gap-0.5">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="rounded-sm" style={{ width: 40, height: 40 }} />
            ))}
          </div>
        </div>

        {/* Paint list skeleton — mirrors PaletteGroupedPaintList rows */}
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex-1 flex flex-col gap-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Main>
  )
}
