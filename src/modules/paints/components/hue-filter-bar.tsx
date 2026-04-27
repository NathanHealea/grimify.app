import { ChildHueCard } from '@/modules/hues/components/child-hue-card'
import { HueCard } from '@/modules/hues/components/hue-card'
import type { Hue } from '@/types/color'

/**
 * Dumb hue filter bar showing top-level hue pills and (conditionally) child hue pills.
 *
 * Uses existing {@link HueCard} and {@link ChildHueCard} components in filter mode.
 * All selection state lives in the parent — this component only renders and fires callbacks.
 *
 * @param props.hues - All top-level hues to display.
 * @param props.huePaintCounts - Paint count per top-level hue name (lowercased key).
 * @param props.childHues - Child hues for the active parent selection (empty when none selected).
 * @param props.childHuePaintCounts - Paint count per child hue name (lowercased key).
 * @param props.selectedParentName - Name of the active parent hue (lowercased), or `null`.
 * @param props.selectedChildName - Name of the active child hue (lowercased), or `null`.
 * @param props.onSelectParent - Called with the parent hue name (lowercased) when a pill is clicked.
 * @param props.onSelectChild - Called with the child hue name (lowercased) when a pill is clicked.
 */
export function HueFilterBar({
  hues,
  huePaintCounts,
  childHues,
  childHuePaintCounts,
  selectedParentName,
  selectedChildName,
  onSelectParent,
  onSelectChild,
}: {
  hues: Hue[]
  huePaintCounts: Record<string, number>
  childHues: Hue[]
  childHuePaintCounts: Record<string, number>
  selectedParentName: string | null
  selectedChildName: string | null
  onSelectParent: (name: string) => void
  onSelectChild: (name: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {hues.map((hue) => {
          const name = hue.name.toLowerCase()
          return (
            <HueCard
              key={hue.id}
              hue={hue}
              paintCount={huePaintCounts[name] ?? 0}
              isSelected={selectedParentName === name}
              onSelect={() => onSelectParent(name)}
            />
          )
        })}
      </div>

      {childHues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {childHues.map((hue) => {
            const name = hue.name.toLowerCase()
            return (
              <ChildHueCard
                key={hue.id}
                hue={hue}
                paintCount={childHuePaintCounts[name] ?? 0}
                isSelected={selectedChildName === name}
                onSelect={() => onSelectChild(name)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
