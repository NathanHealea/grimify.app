import type { ReactNode } from 'react'

import { SchemePartnerRow } from '@/modules/color-schemes/components/scheme-partner-row'
import type { SchemePartner } from '@/modules/color-schemes/types/scheme-partner'

/**
 * One scheme block — header (title + optional control slot) followed by partner rows.
 *
 * @param props.title - Scheme display name (e.g. `Complementary`, `Split-Complementary`).
 * @param props.partners - Non-base partner colors with their value-scale matches.
 * @param props.ownedIds - Forwarded to each {@link SchemePartnerRow}.
 * @param props.control - Optional slot for inline controls (e.g. the analogous angle slider).
 */
export function SchemeOverviewBlock({
  title,
  partners,
  ownedIds,
  control,
}: {
  title: string
  partners: SchemePartner[]
  ownedIds: Set<string>
  control?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{title}</h3>
        {control ?? null}
      </div>
      <div className="flex flex-col gap-3">
        {partners.map((p) => (
          <SchemePartnerRow
            key={p.label}
            label={p.label}
            hue={p.hue}
            paints={p.paints}
            ownedIds={ownedIds}
          />
        ))}
      </div>
    </div>
  )
}
