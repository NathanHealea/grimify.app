import type { SupabaseClient } from '@supabase/supabase-js'

import type { Brand, Paint, ProductLine } from '@/types/paint'

/** A brand with an aggregated paint count across all product lines. */
export type BrandWithPaintCount = Brand & { paint_count: number }

/**
 * Creates a brand service bound to the given Supabase client.
 *
 * All brand-related queries are encapsulated here. Use the `.server.ts`
 * or `.client.ts` wrappers to obtain an instance with the correct client.
 *
 * @param supabase - A Supabase client instance (server or browser).
 * @returns An object with brand query methods.
 */
export function createBrandService(supabase: SupabaseClient) {
  return {
    /**
     * Fetches all brands ordered by name.
     *
     * Includes an aggregated paint count for each brand by counting
     * paints across all product lines.
     *
     * @returns Array of brands with paint counts.
     */
    async getAllBrands(): Promise<BrandWithPaintCount[]> {
      const { data: brands } = await supabase.from('brands').select('*').order('name')

      if (!brands || brands.length === 0) return []

      const { data: counts } = await supabase
        .from('product_lines')
        .select('brand_id, paints(count)')

      const paintCountByBrand = new Map<number, number>()
      if (counts) {
        for (const line of counts) {
          const lineCount = (line.paints as unknown as { count: number }[])?.[0]?.count ?? 0
          paintCountByBrand.set(line.brand_id, (paintCountByBrand.get(line.brand_id) ?? 0) + lineCount)
        }
      }

      return brands.map((brand) => ({
        ...brand,
        paint_count: paintCountByBrand.get(brand.id) ?? 0,
      }))
    },

    /**
     * Fetches a single brand by ID.
     *
     * @param id - The brand's database ID.
     * @returns The brand row, or `null` if not found.
     */
    async getBrandById(id: number): Promise<Brand | null> {
      const { data } = await supabase.from('brands').select('*').eq('id', id).single()
      return data
    },

    /**
     * Fetches all product lines for a brand, ordered by name.
     *
     * @param brandId - The brand's database ID.
     * @returns Array of product lines, or an empty array on error.
     */
    async getBrandProductLines(brandId: number): Promise<ProductLine[]> {
      const { data } = await supabase
        .from('product_lines')
        .select('*')
        .eq('brand_id', brandId)
        .order('name')

      return data ?? []
    },

    /**
     * Fetches all paints belonging to a brand (across all product lines), ordered by name.
     *
     * @param brandId - The brand's database ID.
     * @returns Array of paints, or an empty array on error.
     */
    async getBrandPaints(brandId: number): Promise<Paint[]> {
      const { data } = await supabase
        .from('paints')
        .select('*, product_lines!inner(brand_id)')
        .eq('product_lines.brand_id', brandId)
        .order('name')

      return data ?? []
    },
  }
}

/** The brand service instance type. */
export type BrandService = ReturnType<typeof createBrandService>
