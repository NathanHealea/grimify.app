import { Skeleton } from '@/components/ui/skeleton'

export default function ProfileSetupLoading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-24">
      <div className="w-full max-w-md rounded-lg border border-border p-6">
        <div className="mb-6 flex flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}
