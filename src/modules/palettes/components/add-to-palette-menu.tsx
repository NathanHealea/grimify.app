'use client'

import { useState, useTransition } from 'react'

import { createClient } from '@/lib/supabase/client'
import { getPaletteService } from '@/modules/palettes/services/palette-service.client'
import type { PaletteSummary } from '@/modules/palettes/types/palette-summary'
import { addPaintToPalette } from '@/modules/palettes/actions/add-paint-to-palette'
import { NewPaletteInlineForm } from '@/modules/palettes/components/new-palette-inline-form'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

type MenuState = 'loading' | 'error' | 'list' | 'create'

/**
 * Body of the "Add to palette" dropdown menu.
 *
 * Fetches the viewer's palettes from the browser-side Supabase client on every
 * open so newly created palettes from other tabs are reflected. Renders four
 * states: loading skeleton, error with retry, empty CTA, and a scrollable
 * palette list. Selecting an existing palette calls {@link addPaintToPalette}
 * and shows an inline aria-live confirmation. Selecting "Create new palette"
 * swaps the body to {@link NewPaletteInlineForm}.
 *
 * The first palette row receives `data-default="true"` (the most-recently-edited
 * palette, since `listPalettesForUser` returns `updated_at desc`).
 *
 * @param props.paintId - UUID of the paint to add.
 * @param props.open - Whether the parent dropdown is open; triggers a re-fetch on each open.
 */
export function AddToPaletteMenu({
  paintId,
  open,
}: {
  paintId: string
  open: boolean
}) {
  const [menuState, setMenuState] = useState<MenuState>('loading')
  const [palettes, setPalettes] = useState<PaletteSummary[]>([])
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Fetch palettes every time the menu opens
  const [lastOpen, setLastOpen] = useState(false)
  if (open && !lastOpen) {
    setLastOpen(true)
    setMenuState('loading')
    setConfirmation(null)
    ;(async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setMenuState('error')
          return
        }
        const service = getPaletteService()
        const list = await service.listPalettesForUser(user.id)
        setPalettes(list)
        setMenuState(list.length === 0 ? 'list' : 'list')
      } catch {
        setMenuState('error')
      }
    })()
  }
  if (!open && lastOpen) {
    setLastOpen(false)
    setMenuState('loading')
  }

  function handleSelect(palette: PaletteSummary) {
    startTransition(async () => {
      const result = await addPaintToPalette(palette.id, paintId)
      if ('error' in result) {
        setConfirmation(`Error: ${result.error}`)
      } else {
        setConfirmation(`Added to ${result.paletteName}`)
      }
    })
  }

  if (confirmation) {
    return (
      <div className="px-3 py-2 text-sm" aria-live="polite">
        {confirmation}
      </div>
    )
  }

  if (menuState === 'loading') {
    return (
      <div className="flex flex-col gap-1 p-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-8 animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }

  if (menuState === 'error') {
    return (
      <div className="flex flex-col gap-2 p-3">
        <p className="text-sm text-destructive">Failed to load palettes.</p>
        <button
          type="button"
          onClick={() => {
            setLastOpen(false)
          }}
          className="btn btn-ghost btn-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  if (menuState === 'create') {
    return (
      <NewPaletteInlineForm
        paintId={paintId}
        onCancel={() => setMenuState('list')}
      />
    )
  }

  // list state
  return (
    <>
      {palettes.length === 0 ? (
        <DropdownMenuItem
          onSelect={() => setMenuState('create')}
          className="font-medium"
        >
          + Create new palette
        </DropdownMenuItem>
      ) : (
        <>
          <DropdownMenuLabel>Add to palette</DropdownMenuLabel>
          <div className="max-h-48 overflow-y-auto">
            {palettes.map((palette, index) => (
              <DropdownMenuItem
                key={palette.id}
                data-default={index === 0 ? 'true' : undefined}
                disabled={isPending}
                onSelect={() => handleSelect(palette)}
                className={index === 0 ? 'font-medium' : undefined}
              >
                <span className="flex-1 truncate">{palette.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {palette.paintCount}
                </span>
              </DropdownMenuItem>
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setMenuState('create')}>
            + Create new palette
          </DropdownMenuItem>
        </>
      )}
    </>
  )
}
