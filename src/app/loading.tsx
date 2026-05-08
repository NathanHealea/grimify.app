import { Main } from '@/components/main'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <Main>
      <div className="mb-8 flex flex-col gap-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-72" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </Main>
  )
}
