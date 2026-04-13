import Link from 'next/link'

export type BreadcrumbItem = {
  label: string
  href?: string
}

/**
 * Renders a breadcrumb trail from an array of items.
 *
 * The last item is rendered as plain text (current page).
 * All preceding items are rendered as links.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && <span aria-hidden="true">/</span>}
              {isLast || !item.href ? (
                <span className="text-foreground font-medium">{item.label}</span>
              ) : (
                <Link href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
