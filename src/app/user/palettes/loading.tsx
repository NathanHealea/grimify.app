import { Skeleton } from '@/components/ui/skeleton'

export default function UserPalettesLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div className="flex h-16 gap-1">
              {Array.from({ length: 5 }, (_, j) => (
                <Skeleton key={j} className="h-full flex-1" />
              ))}
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
