import type { Brand, ColorScheme, PaintGroup, ProcessedPaint } from '@/types/paint';
import { hexToHsl, isMatchingScheme } from '@/utils/colorUtils';

// ── Individual matchers ──────────────────────────────────────────────

export function matchesBrandFilter(paint: ProcessedPaint, brandFilter: Set<string>): boolean {
  return brandFilter.size === 0 || brandFilter.has(paint.brand);
}

export function matchesSearchFilter(paint: ProcessedPaint, searchMatchIds: Set<string>): boolean {
  return searchMatchIds.size === 0 || searchMatchIds.has(paint.id);
}

export function matchesOwnedFilter(paint: ProcessedPaint, ownedFilter: boolean, ownedIds: Set<string>): boolean {
  return !ownedFilter || ownedIds.size === 0 || ownedIds.has(paint.id);
}

export function matchesSchemeFilter(paint: ProcessedPaint, isSchemeMatching: (p: ProcessedPaint) => boolean): boolean {
  return isSchemeMatching(paint);
}

// ── Group-level dimming check ────────────────────────────────────────

export interface GroupFilterParams {
  brandFilter: Set<string>;
  searchMatchIds: Set<string>;
  isSchemeActive: boolean;
  isSchemeMatching: (p: ProcessedPaint) => boolean;
  ownedFilter: boolean;
  ownedIds: Set<string>;
}

/**
 * Determines whether a paint group should be dimmed based on all active filters.
 * Returns `true` when the group does NOT pass the filters (i.e. should be dimmed).
 */
export function isGroupDimmed(group: PaintGroup, filters: GroupFilterParams): boolean {
  const matchesBrand = filters.brandFilter.size === 0 || group.paints.some((p) => filters.brandFilter.has(p.brand));

  const matchesSearch = filters.searchMatchIds.size === 0 || group.paints.some((p) => filters.searchMatchIds.has(p.id));

  const matchesOwned = !filters.ownedFilter || filters.ownedIds.size === 0 || group.paints.some((p) => filters.ownedIds.has(p.id));

  const schemeDimmed = !group.paints.some(filters.isSchemeMatching);

  const dimmed = !matchesBrand || !matchesOwned || (filters.isSchemeActive ? schemeDimmed : !matchesSearch);
  
  return dimmed;
}

/** Whether the scheme specifically dims this group (used for extra-low opacity). */
export function isGroupSchemeDimmed(group: PaintGroup, isSchemeMatching: (p: ProcessedPaint) => boolean): boolean {
  return !group.paints.some(isSchemeMatching);
}

// ── Count calculations ───────────────────────────────────────────────

export interface FilterCountParams {
  brandFilter: Set<string>;
  searchMatchIds: Set<string>;
  isSearching: boolean;
  isSchemeActive: boolean;
  isSchemeMatching: (p: ProcessedPaint) => boolean;
  ownedFilter: boolean;
  ownedIds: Set<string>;
  isFiltered: boolean;
}

export function getFilteredPaintCount(processedPaints: ProcessedPaint[], filters: FilterCountParams): number {
  return processedPaints.filter((p) => {
    const matchesBrand = !filters.isFiltered || filters.brandFilter.has(p.brand);
    const matchesSearch = !filters.isSearching || filters.searchMatchIds.has(p.id);
    const matchesScheme = !filters.isSchemeActive || filters.isSchemeMatching(p);
    const matchesOwned = !filters.ownedFilter || filters.ownedIds.has(p.id);
    return matchesBrand && matchesSearch && matchesScheme && matchesOwned;
  }).length;
}

export function getFilteredColorCount(paintGroups: PaintGroup[], filters: FilterCountParams): number {
  return paintGroups.filter((g) =>
    g.paints.some((p) => {
      const matchesBrand = !filters.isFiltered || filters.brandFilter.has(p.brand);
      const matchesSearch = !filters.isSearching || filters.searchMatchIds.has(p.id);
      const matchesScheme = !filters.isSchemeActive || filters.isSchemeMatching(p);
      const matchesOwned = !filters.ownedFilter || filters.ownedIds.has(p.id);
      return matchesBrand && matchesSearch && matchesScheme && matchesOwned;
    }),
  ).length;
}

// ── Search ───────────────────────────────────────────────────────────

export function searchPaints(processedPaints: ProcessedPaint[], query: string, brands: Brand[]): ProcessedPaint[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return processedPaints.filter((p) => {
    const brandName = brands.find((b) => b.id === p.brand)?.name ?? '';
    return p.name.toLowerCase().includes(q) || p.hex.toLowerCase().includes(q) || brandName.toLowerCase().includes(q);
  });
}

// ── Scheme matching ──────────────────────────────────────────────────

export function getSchemeMatches(
  processedPaints: ProcessedPaint[],
  selectedPaint: ProcessedPaint | null,
  colorScheme: ColorScheme,
): ProcessedPaint[] {
  if (colorScheme === 'none' || !selectedPaint) return [];
  const selectedHsl = hexToHsl(selectedPaint.hex);
  return processedPaints.filter((p) => {
    if (p.id === selectedPaint.id) return false;
    const paintHsl = hexToHsl(p.hex);
    return isMatchingScheme(paintHsl.h, selectedHsl.h, colorScheme);
  });
}
