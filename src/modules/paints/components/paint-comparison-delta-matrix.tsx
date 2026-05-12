'use client'

import { useMemo } from 'react'

import type { PaintWithRelationsAndHue } from '@/modules/paints/services/paint-service'
import { computePairwiseDeltaE } from '@/modules/paints/utils/compute-pairwise-delta-e'

/**
 * Threshold below which two colors are perceived as effectively identical
 * (CIE76 ΔE). Cells under this value get a success tone.
 */
const DELTA_E_IMPERCEPTIBLE = 2

/**
 * Threshold above which two colors are perceived as clearly different.
 * Cells above this value are de-emphasised with muted text.
 */
const DELTA_E_DISTINCT = 10

/**
 * Pairwise ΔE grid for the comparison row.
 *
 * Computes the NxN ΔE matrix via {@link computePairwiseDeltaE} (memoised
 * by `paints` identity) and renders it as a table. The diagonal is blank;
 * off-diagonal cells show ΔE rounded to one decimal. Cells where
 * ΔE < {@link DELTA_E_IMPERCEPTIBLE} get a soft success tone; cells where
 * ΔE > {@link DELTA_E_DISTINCT} use muted text.
 *
 * Row and column headers are short paint names paired with a swatch dot.
 *
 * @param props.paints - Paints to compare. Must contain at least two
 *   entries; the caller is responsible for not rendering this component
 *   below that threshold.
 */
export function PaintComparisonDeltaMatrix({
  paints,
}: {
  paints: PaintWithRelationsAndHue[]
}) {
  const matrix = useMemo(() => computePairwiseDeltaE(paints), [paints])

  return (
    <section
      aria-label="Pairwise color difference (ΔE) matrix"
      className="flex flex-col gap-3"
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Pairwise ΔE (CIE76)</h2>
        <p className="text-xs text-muted-foreground">
          Lower values mean colors are perceptually closer. Below {DELTA_E_IMPERCEPTIBLE} is
          imperceptible to most viewers; above {DELTA_E_DISTINCT} is clearly distinct.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-border bg-muted/50 p-2 text-left text-xs font-medium text-muted-foreground" />
              {paints.map((p) => (
                <th
                  key={p.id}
                  scope="col"
                  className="border border-border bg-muted/50 p-2 text-left text-xs font-medium"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block size-3 shrink-0 rounded-full border border-border"
                      style={{ backgroundColor: p.hex }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{p.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paints.map((rowPaint) => (
              <tr key={rowPaint.id}>
                <th
                  scope="row"
                  className="border border-border bg-muted/50 p-2 text-left text-xs font-medium"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block size-3 shrink-0 rounded-full border border-border"
                      style={{ backgroundColor: rowPaint.hex }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{rowPaint.name}</span>
                  </div>
                </th>
                {paints.map((colPaint) => {
                  if (rowPaint.id === colPaint.id) {
                    return (
                      <td
                        key={colPaint.id}
                        className="border border-border bg-muted/30 p-2"
                        aria-hidden="true"
                      />
                    )
                  }

                  const delta = matrix[rowPaint.id]?.[colPaint.id] ?? 0
                  const isClose = delta < DELTA_E_IMPERCEPTIBLE
                  const isDistinct = delta > DELTA_E_DISTINCT

                  const toneClass = isClose
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400 font-medium'
                    : isDistinct
                      ? 'text-muted-foreground'
                      : ''

                  return (
                    <td
                      key={colPaint.id}
                      className={`border border-border p-2 text-center font-mono text-xs ${toneClass}`}
                    >
                      {delta.toFixed(1)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
