import type { MouseEvent, PointerEvent } from 'react'

import type { PaintGroup } from '@/modules/color-wheel/types/paint-group'
import { BrandRingArcs } from '@/modules/color-wheel/components/brand-ring-arcs'

/** Base dot radius in SVG units. Multi-paint groups add 2 units. */
const DOT_RADIUS = 5

/**
 * SVG group that renders a single {@link PaintGroup} on the color wheel.
 *
 * Visual layers (back to front):
 * 1. Opacity wrapper — dims the group when it doesn't match active filters/scheme.
 * 2. Owned halo — green ring when the user owns any paint in the group.
 * 3. Search-glow ring — yellow ring with Gaussian blur when the group matches the search query.
 * 4. Selection ring — white dashed ring when the group is selected.
 * 5. Brand-ring arcs — segmented arc band of unique brand colors (optional toggle).
 * 6. Center dot — filled circle in the representative paint's hex color.
 * 7. Multi-paint badge — yellow count bubble in the upper-right for groups with >1 paint.
 *
 * @param group - The paint group to render.
 * @param isSelected - Whether this group is the currently selected paint.
 * @param showBrandRing - Whether to render the brand-ring arc band.
 * @param showOwnedRing - Whether to render the owned halo (requires `isOwned`).
 * @param dimmed - Whether this group is dimmed by a filter, search, or scheme.
 * @param schemeDimmed - Whether this group is additionally dimmed by a color-scheme mismatch.
 * @param searchHighlight - Whether this group matches the active search query (renders glow ring).
 * @param isOwned - Whether the current user owns at least one paint in this group.
 * @param onHover - Called with the group and pointer event on enter, `null` on leave.
 * @param onClick - Called with the group when the dot is clicked.
 */
export function PaintDot({
  group,
  isSelected,
  showBrandRing,
  showOwnedRing,
  dimmed,
  schemeDimmed,
  searchHighlight,
  isOwned,
  onHover,
  onClick,
}: {
  group: PaintGroup
  isSelected: boolean
  showBrandRing: boolean
  showOwnedRing: boolean
  dimmed: boolean
  schemeDimmed: boolean
  searchHighlight: boolean
  isOwned: boolean
  onHover: (group: PaintGroup | null, event: PointerEvent<SVGCircleElement>) => void
  onClick: (group: PaintGroup) => void
}) {
  const { rep, paints } = group
  const isMulti = paints.length > 1
  const r = isMulti ? DOT_RADIUS + 2 : DOT_RADIUS

  return (
    <g opacity={dimmed ? (schemeDimmed ? 0.06 : 0.15) : 1}>
      {/* Owned halo */}
      {showOwnedRing && isOwned && !dimmed && (
        <circle
          cx={rep.x}
          cy={rep.y}
          r={r + (showBrandRing ? 5.5 : 3)}
          fill="none"
          stroke="#10b981"
          strokeWidth={1.5}
          pointerEvents="none"
        />
      )}

      {/* Search-glow ring */}
      {searchHighlight && !dimmed && (
        <circle
          cx={rep.x}
          cy={rep.y}
          r={r + 3}
          fill="none"
          stroke="#facc15"
          strokeWidth={2}
          filter="url(#search-glow)"
          pointerEvents="none"
        />
      )}

      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={rep.x}
          cy={rep.y}
          r={showBrandRing ? r + 4 : r + 2.5}
          fill="none"
          stroke="white"
          strokeWidth={2}
          strokeDasharray="4 2"
          pointerEvents="none"
        />
      )}

      {/* Brand ring arcs */}
      {showBrandRing && (
        <BrandRingArcs paints={paints} cx={rep.x} cy={rep.y} r={r} />
      )}

      {/* Center dot */}
      <circle
        cx={rep.x}
        cy={rep.y}
        r={r}
        fill={rep.hex}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth={1}
        style={{ cursor: 'pointer' }}
        onPointerEnter={(e: PointerEvent<SVGCircleElement>) => onHover(group, e)}
        onPointerLeave={(e: PointerEvent<SVGCircleElement>) => onHover(null, e)}
        onClick={(e: MouseEvent<SVGCircleElement>) => {
          e.stopPropagation()
          onClick(group)
        }}
      />

      {/* Multi-paint count badge */}
      {isMulti && (
        <>
          <circle
            cx={rep.x + r * 0.7}
            cy={rep.y - r * 0.7}
            r={4}
            fill="#f0c040"
            stroke="#000"
            strokeWidth={0.5}
            pointerEvents="none"
          />
          <text
            x={rep.x + r * 0.7}
            y={rep.y - r * 0.7}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#000"
            fontSize={5}
            fontWeight={800}
            pointerEvents="none"
          >
            {paints.length}
          </text>
        </>
      )}
    </g>
  )
}
