'use client'

import { useActionState, useState, useMemo } from 'react'
import type { ChangeEvent } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { hexToRgb, rgbToHsl } from '@/lib/color-utils'
import { HueSelector } from '@/modules/admin/components/hue-selector'
import type { PaintFormState } from '@/modules/admin/types/paint-form-state'
import type { Brand, ProductLine } from '@/types/paint'
import type { Hue } from '@/types/color'
import type { PaintWithRelationsAndHue } from '@/modules/paints/services/paint-service'

/** A brand with its associated product lines. */
type BrandWithProductLines = Brand & { product_lines: ProductLine[] }

/**
 * Props for {@link PaintForm}.
 */
type PaintFormProps = {
  /** The server action to invoke on submit. */
  action: (prevState: PaintFormState, formData: FormData) => Promise<PaintFormState>
  /** All brands with their product lines for dropdown population. */
  brands: BrandWithProductLines[]
  /** All top-level parent hues. */
  parentHues: Hue[]
  /** Map of parent hue ID to its child hues. */
  childHuesByParent: Record<string, Hue[]>
  /** Default field values when editing an existing paint. */
  defaultValues?: Partial<PaintWithRelationsAndHue>
  /** Whether the form is creating a new paint or editing an existing one. */
  mode: 'create' | 'edit'
}

/**
 * Submit button that reflects pending state via {@link useFormStatus}.
 *
 * @param props.mode - Whether the parent form is in create or edit mode.
 */
function SubmitButton({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="btn-primary btn-sm">
      {pending
        ? mode === 'create'
          ? 'Creating…'
          : 'Saving…'
        : mode === 'create'
          ? 'Create Paint'
          : 'Save Changes'}
    </Button>
  )
}

/**
 * Converts a raw string into a URL-safe slug.
 *
 * @param value - The raw input string.
 * @returns A lowercase, hyphenated slug string.
 */
function toSlug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

/**
 * Admin form for creating or editing a paint.
 *
 * Handles brand → product line cascading dropdowns, real-time hex color preview
 * with computed RGB/HSL readout, auto-slug generation, and a two-step
 * {@link HueSelector} for parent/child hue assignment.
 *
 * @param props - {@link PaintFormProps}
 */
export function PaintForm({
  action,
  brands,
  parentHues,
  childHuesByParent,
  defaultValues,
  mode,
}: PaintFormProps) {
  const [state, formAction] = useActionState(action, null)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    mode === 'edit' || !!state?.fields?.slug
  )
  const [slugValue, setSlugValue] = useState(
    state?.fields?.slug ?? defaultValues?.slug ?? ''
  )
  const [selectedBrandId, setSelectedBrandId] = useState<number | ''>(
    state?.fields?.brand_id
      ? parseInt(state.fields.brand_id, 10)
      : (defaultValues?.product_lines?.brand_id ?? '')
  )
  const [hexValue, setHexValue] = useState(
    state?.fields?.hex ? `#${state.fields.hex}` : (defaultValues?.hex ?? '#000000')
  )

  const computedColor = useMemo(() => {
    const rgb = hexToRgb(hexValue)
    if (!rgb) return null
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
    return { ...rgb, ...hsl }
  }, [hexValue])

  const productLines =
    selectedBrandId !== ''
      ? (brands.find((b) => b.id === selectedBrandId)?.product_lines ?? [])
      : []

  const defaultParentHueId =
    state?.fields?.parent_hue_id ||
    defaultValues?.hues?.parent_id ||
    defaultValues?.hue_id ||
    undefined
  const defaultChildHueId =
    state?.fields?.child_hue_id ||
    (defaultValues?.hues?.parent_id != null ? (defaultValues?.hue_id ?? undefined) : undefined)

  function handleNameChange(e: ChangeEvent<HTMLInputElement>) {
    if (!slugManuallyEdited) {
      setSlugValue(toSlug(e.target.value))
    }
  }

  function handleSlugChange(e: ChangeEvent<HTMLInputElement>) {
    setSlugManuallyEdited(true)
    setSlugValue(e.target.value)
  }

  function handleBrandChange(e: ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setSelectedBrandId(val === '' ? '' : parseInt(val, 10))
  }

  function handleHexChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setHexValue(raw.startsWith('#') ? raw : `#${raw}`)
  }

  function handleColorPickerChange(e: ChangeEvent<HTMLInputElement>) {
    setHexValue(e.target.value)
  }

  const hexInputValue = hexValue.startsWith('#') ? hexValue.slice(1) : hexValue

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {defaultValues?.id && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}
      <input type="hidden" name="brand_id" value={String(selectedBrandId)} />

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {state?.success && (
        <p className="text-sm text-green-600">Paint saved successfully.</p>
      )}

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="paint-name" className="form-label text-sm">
          Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="paint-name"
          name="name"
          type="text"
          required
          defaultValue={state?.fields?.name ?? defaultValues?.name ?? ''}
          onChange={handleNameChange}
          className="input-sm"
          placeholder="e.g. Abaddon Black"
        />
        {state?.errors?.name && (
          <p className="text-xs text-destructive">{state.errors.name}</p>
        )}
      </div>

      {/* Slug */}
      <div className="flex flex-col gap-1">
        <label htmlFor="paint-slug" className="form-label text-sm">
          Slug
        </label>
        <Input
          id="paint-slug"
          name="slug"
          type="text"
          value={slugValue}
          onChange={handleSlugChange}
          className="input-sm font-mono"
          placeholder="e.g. abaddon-black"
        />
        {state?.errors?.slug && (
          <p className="text-xs text-destructive">{state.errors.slug}</p>
        )}
      </div>

      {/* Brand */}
      <div className="flex flex-col gap-1">
        <label htmlFor="paint-brand" className="form-label text-sm">
          Brand <span className="text-destructive">*</span>
        </label>
        <select
          id="paint-brand"
          value={selectedBrandId}
          onChange={handleBrandChange}
          className="input input-sm"
        >
          <option value="">— Select Brand —</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
        {state?.errors?.brand_id && (
          <p className="text-xs text-destructive">{state.errors.brand_id}</p>
        )}
      </div>

      {/* Product Line */}
      <div className="flex flex-col gap-1">
        <label htmlFor="paint-product-line" className="form-label text-sm">
          Product Line <span className="text-destructive">*</span>
        </label>
        <select
          id="paint-product-line"
          name="product_line_id"
          required
          defaultValue={state?.fields?.product_line_id ?? defaultValues?.product_line_id ?? ''}
          disabled={productLines.length === 0}
          className="input input-sm"
        >
          <option value="">— Select Product Line —</option>
          {productLines.map((pl) => (
            <option key={pl.id} value={pl.id}>
              {pl.name}
            </option>
          ))}
        </select>
        {state?.errors?.product_line_id && (
          <p className="text-xs text-destructive">{state.errors.product_line_id}</p>
        )}
      </div>

      {/* Brand Paint ID */}
      <div className="flex flex-col gap-1">
        <label htmlFor="paint-brand-paint-id" className="form-label text-sm">
          Brand Paint ID <span className="text-destructive">*</span>
        </label>
        <Input
          id="paint-brand-paint-id"
          name="brand_paint_id"
          type="text"
          required
          defaultValue={state?.fields?.brand_paint_id ?? defaultValues?.brand_paint_id ?? ''}
          className="input-sm font-mono"
          placeholder="e.g. 99189950001"
        />
        {state?.errors?.brand_paint_id && (
          <p className="text-xs text-destructive">{state.errors.brand_paint_id}</p>
        )}
      </div>

      {/* Hex Color */}
      <div className="flex flex-col gap-1">
        <label htmlFor="paint-hex" className="form-label text-sm">
          Hex Color <span className="text-destructive">*</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">#</span>
          <Input
            id="paint-hex"
            name="hex"
            type="text"
            value={hexInputValue}
            onChange={handleHexChange}
            className="input-sm font-mono w-28"
            placeholder="000000"
            maxLength={6}
          />
          <input
            type="color"
            value={hexValue.length === 7 ? hexValue : '#000000'}
            onChange={handleColorPickerChange}
            className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
            aria-label="Color picker"
          />
          <span
            className="inline-block h-6 w-6 rounded-full border border-border"
            style={{ backgroundColor: hexValue }}
            aria-hidden="true"
          />
        </div>

        {/* Computed color values */}
        {computedColor && (
          <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
            <span>
              RGB: {computedColor.r}, {computedColor.g}, {computedColor.b}
            </span>
            <span>
              HSL: {computedColor.h}°, {computedColor.s}%, {computedColor.l}%
            </span>
          </div>
        )}

        {state?.errors?.hex && (
          <p className="text-xs text-destructive">{state.errors.hex}</p>
        )}
      </div>

      {/* Paint Type */}
      <div className="flex flex-col gap-1">
        <label htmlFor="paint-type" className="form-label text-sm">
          Paint Type
        </label>
        <Input
          id="paint-type"
          name="paint_type"
          type="text"
          defaultValue={state?.fields?.paint_type ?? defaultValues?.paint_type ?? ''}
          className="input-sm"
          placeholder="e.g. base, layer, contrast"
        />
      </div>

      {/* Flags */}
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="is_metallic"
            defaultChecked={state?.fields?.is_metallic ?? defaultValues?.is_metallic ?? false}
            className="checkbox checkbox-sm"
          />
          <span className="form-label text-sm">Metallic</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="is_discontinued"
            defaultChecked={state?.fields?.is_discontinued ?? defaultValues?.is_discontinued ?? false}
            className="checkbox checkbox-sm"
          />
          <span className="form-label text-sm">Discontinued</span>
        </label>
      </div>

      {/* Hue Selector */}
      <div className="border-t border-border pt-4">
        <p className="mb-3 text-sm font-medium">Hue Assignment</p>
        {state?.errors?.hue && (
          <p className="mb-2 text-xs text-destructive">{state.errors.hue}</p>
        )}
        <HueSelector
          parentHues={parentHues}
          childHuesByParent={childHuesByParent}
          defaultParentHueId={defaultParentHueId}
          defaultChildHueId={defaultChildHueId}
        />
      </div>

      <div className="flex justify-end">
        <SubmitButton mode={mode} />
      </div>
    </form>
  )
}
