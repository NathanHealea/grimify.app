'use client'

import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import { updateProductLine } from '@/modules/admin/actions/product-line-actions'
import { DeleteProductLineButton } from '@/modules/admin/components/delete-product-line-button'
import { ProductLineForm } from '@/modules/admin/components/product-line-form'
import type { ProductLineFormState } from '@/modules/admin/types/product-line-form-state'

/**
 * Data shape for a product line as displayed in the admin table row.
 */
type ProductLineRow = {
  /** Numeric database ID of the product line. */
  id: number
  /** Human-readable name of the product line. */
  name: string
  /** URL-safe slug unique within the brand. */
  slug: string
  /** Number of paints associated with this product line. */
  paint_count: number
}

/**
 * Props for {@link EditProductLineRow}.
 */
type EditProductLineRowProps = {
  /** The product line to display and edit. */
  productLine: ProductLineRow
  /** The numeric ID of the brand that owns this product line. */
  brandId: number
}

/**
 * Admin table row that toggles between a read-only view and an inline edit form.
 *
 * In read-only mode, renders the product-line name, slug, paint count, and
 * action buttons (Edit + Delete). Clicking "Edit" swaps the row to an expanded
 * edit form backed by {@link ProductLineForm} in edit mode alongside the
 * {@link DeleteProductLineButton}. The row collapses back to read-only
 * automatically on a successful save, or when the user clicks "Cancel".
 *
 * @param props - {@link EditProductLineRowProps}
 */
export function EditProductLineRow({ productLine, brandId }: EditProductLineRowProps) {
  const [isEditing, setIsEditing] = useState(false)

  const editAction = useCallback(
    async (
      prevState: ProductLineFormState,
      formData: FormData
    ): Promise<ProductLineFormState> => {
      const result = await updateProductLine(prevState, formData)
      if (result?.success) {
        setIsEditing(false)
      }
      return result
    },
    []
  )

  if (isEditing) {
    return (
      <tr className="border-b border-border/50">
        <td colSpan={4} className="py-3 pr-2">
          <div className="flex flex-col gap-3">
            <ProductLineForm
              action={editAction}
              brandId={brandId}
              defaultValues={productLine}
              mode="edit"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <DeleteProductLineButton
                productLineId={productLine.id}
                productLineName={productLine.name}
                brandId={brandId}
              />
            </div>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-4 font-medium">{productLine.name}</td>
      <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{productLine.slug}</td>
      <td className="py-2 pr-4 text-right tabular-nums">{productLine.paint_count}</td>
      <td className="py-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
          <DeleteProductLineButton
            productLineId={productLine.id}
            productLineName={productLine.name}
            brandId={brandId}
          />
        </div>
      </td>
    </tr>
  )
}
