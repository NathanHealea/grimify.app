import { Skeleton } from '@/components/ui/skeleton'

export default function AdminRolesLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <div className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="rounded-lg border border-border">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="ml-auto h-4 w-20" />
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="ml-auto h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}
