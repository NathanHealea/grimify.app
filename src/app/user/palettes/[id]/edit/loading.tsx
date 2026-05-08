import { Skeleton } from '@/components/ui/skeleton'

export default function UserPaletteEditLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <Skeleton className="mb-6 h-4 w-32" />
      <Skeleton className="mb-8 h-9 w-48" />

      <div className="flex flex-col gap-6 rounded-lg border border-border p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-24 w-full" />
        </div>

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-16" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  )
}
