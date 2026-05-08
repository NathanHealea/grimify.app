import { Skeleton } from '@/components/ui/skeleton'

export default function ProfileEditLoading() {
  return (
    <div className="flex min-h-screen w-full justify-center px-4 py-24">
      <div className="w-full max-w-md space-y-6">
        <Skeleton className="h-8 w-40" />

        <div className="rounded-lg border border-border p-6">
          <div className="mb-6 flex flex-col gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
