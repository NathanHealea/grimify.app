'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { BaseColorPicker } from '@/modules/color-schemes/components/base-color-picker'
import { SchemeDisplay } from '@/modules/color-schemes/components/scheme-display'
import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Top-level client component for the `/schemes` page.
 *
 * Owns only the {@link BaseColor} state driven by {@link BaseColorPicker}.
 * When a base color is selected, delegates all scheme orchestration and rendering
 * to {@link SchemeDisplay}; otherwise renders an empty-state card.
 *
 * @param props.paints - Full paint list fetched server-side and passed as a prop.
 * @param props.isAuthenticated - Whether the current user is signed in.
 * @param props.collectionPaintIds - Array of paint IDs in the user's collection.
 */
export function SchemeExplorer({
  paints,
  isAuthenticated,
  collectionPaintIds,
}: {
  paints: ColorWheelPaint[]
  isAuthenticated: boolean
  collectionPaintIds: string[]
}) {
  const [baseColor, setBaseColor] = useState<BaseColor | null>(null)
  const ownedIds = useMemo(() => new Set(collectionPaintIds), [collectionPaintIds])

  return (
    <section className="flex flex-col gap-6">
      <BaseColorPicker paints={paints} onChange={setBaseColor} />

      {baseColor ? (
        <SchemeDisplay
          baseColor={baseColor}
          paints={paints}
          isAuthenticated={isAuthenticated}
          ownedIds={ownedIds}
          revalidatePath="/schemes"
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-muted-foreground">Select a base color to generate a scheme.</p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
