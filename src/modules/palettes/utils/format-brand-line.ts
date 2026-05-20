/**
 * Formats a paint's brand and product line into a display string.
 *
 * Returns `"Brand: Line"` when both are present, `"Brand"` when only the brand
 * is set, `"Line"` when only the line is set, and `""` when both are null.
 *
 * @param brandName - The paint brand name, or null.
 * @param productLineName - The paint product line name, or null.
 * @returns A formatted string suitable for display in a paint row or card.
 */
export function formatBrandLine(
  brandName: string | null,
  productLineName: string | null,
): string {
  return [brandName, productLineName].filter(Boolean).join(': ')
}
