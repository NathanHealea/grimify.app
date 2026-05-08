import { Skeleton } from '@/components/ui/skeleton'

export default function PaletteDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <div className="mb-8 flex flex-col gap-3">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-48" />
      </div>

      <Skeleton className="mb-8 h-20 w-full" />

      <div className="mb-2 flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="aspect-square" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
