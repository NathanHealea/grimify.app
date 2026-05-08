import { Skeleton } from '@/components/ui/skeleton'

export default function PaintDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <div className="mb-6 flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-3" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-start">
        <Skeleton className="aspect-square w-full sm:w-48" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}
