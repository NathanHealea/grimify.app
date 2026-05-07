import { Skeleton } from '@/components/ui/skeleton'

export default function SchemesLoading() {
  return (
    <main className="container mx-auto px-4 py-8">
      <Skeleton className="mb-2 h-7 w-72" />
      <Skeleton className="mb-6 h-4 w-full max-w-xl" />

      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-28" />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="aspect-square" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </main>
  )
}
