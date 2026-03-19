'use client';

import { useCallback, useMemo } from 'react';

import { brands } from '@/data/index';
import type { ColorScheme, PaintGroup, ProcessedPaint } from '@/types/paint';
import { hexToHsl, isMatchingScheme } from '@/utils/colorUtils';
import { getFilteredColorCount, getFilteredPaintCount, getSchemeMatches, searchPaints } from '@/utils/filterUtils';

export interface UseDerivedFiltersParams {
  processedPaints: ProcessedPaint[];
  paintGroups: PaintGroup[];
  uniqueColorCount: number;
  brandFilter: Set<string>;
  searchQuery: string;
  colorScheme: ColorScheme;
  selectedPaint: ProcessedPaint | null;
  ownedFilter: boolean;
  ownedIds: Set<string>;
  isFiltered: boolean;
  isSearching: boolean;
}

export function useDerivedFilters({
  processedPaints,
  paintGroups,
  uniqueColorCount,
  brandFilter,
  searchQuery,
  colorScheme,
  selectedPaint,
  ownedFilter,
  ownedIds,
  isFiltered,
  isSearching,
}: UseDerivedFiltersParams) {
  const searchResults = useMemo<ProcessedPaint[]>(
    () => searchPaints(processedPaints, searchQuery, brands),
    [processedPaints, searchQuery],
  );

  const searchMatchIds = useMemo(() => new Set(searchResults.map((p) => p.id)), [searchResults]);

  const isSchemeMatching = useCallback(
    (paint: ProcessedPaint) => {
      if (!selectedPaint || colorScheme === 'none') return true;
      if (paint.id === selectedPaint.id) return true;
      const selectedHsl = hexToHsl(selectedPaint.hex);
      const paintHsl = hexToHsl(paint.hex);
      return isMatchingScheme(paintHsl.h, selectedHsl.h, colorScheme);
    },
    [selectedPaint, colorScheme],
  );

  const schemeMatches = useMemo<ProcessedPaint[]>(
    () => getSchemeMatches(processedPaints, selectedPaint, colorScheme),
    [colorScheme, selectedPaint, processedPaints],
  );

  const isSchemeActive = colorScheme !== 'none' && selectedPaint !== null;
  const isAnyFilterActive = isFiltered || isSearching || isSchemeActive || ownedFilter;

  const filteredPaintCount = useMemo(() => {
    if (!isAnyFilterActive) return processedPaints.length;
    return getFilteredPaintCount(processedPaints, {
      brandFilter,
      searchMatchIds,
      isSearching,
      isSchemeActive,
      isSchemeMatching,
      ownedFilter,
      ownedIds,
      isFiltered,
    });
  }, [
    processedPaints,
    brandFilter,
    isFiltered,
    isSearching,
    searchMatchIds,
    isAnyFilterActive,
    isSchemeActive,
    isSchemeMatching,
    ownedFilter,
    ownedIds,
  ]);

  const filteredColorCount = useMemo(() => {
    if (!isAnyFilterActive) return uniqueColorCount;
    return getFilteredColorCount(paintGroups, {
      brandFilter,
      searchMatchIds,
      isSearching,
      isSchemeActive,
      isSchemeMatching,
      ownedFilter,
      ownedIds,
      isFiltered,
    });
  }, [
    paintGroups,
    brandFilter,
    isFiltered,
    isSearching,
    searchMatchIds,
    uniqueColorCount,
    isAnyFilterActive,
    isSchemeActive,
    isSchemeMatching,
    ownedFilter,
    ownedIds,
  ]);

  return {
    searchResults,
    searchMatchIds,
    schemeMatches,
    isSchemeMatching,
    isSchemeActive,
    isAnyFilterActive,
    filteredPaintCount,
    filteredColorCount,
  };
}
