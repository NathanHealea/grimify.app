'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { deleteRecipe } from '@/modules/recipes/actions/delete-recipe'
import type { Recipe } from '@/modules/recipes/types/recipe'

/**
 * Destructive delete button with a type-to-confirm dialog.
 *
 * Mirrors `DeletePaletteButton`: opens a centered {@link Dialog} that requires
 * the user to type the recipe title before the confirm button activates. Calls
 * {@link deleteRecipe} inside `startTransition`; the action redirects to
 * `/user/recipes` on success. On error, the dialog stays open and the failure
 * is surfaced via a Sonner toast.
 *
 * @param props.recipe - The recipe to delete; its `id` and `title` are used.
 */
export function DeleteRecipeButton({ recipe }: { recipe: Recipe }) {
  const [open, setOpen] = useState(false)
  const [confirmValue, setConfirmValue] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    setConfirmValue('')
    setOpen(false)
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteRecipe(recipe.id)
      if (result?.error) {
        toast.error(result.error)
      }
    })
  }

  const canConfirm = confirmValue === recipe.title && !isPending

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-sm btn-destructive"
      >
        Delete recipe
      </Button>

      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="w-full max-w-sm p-6">
          <DialogHeader>
            <DialogTitle>Delete recipe?</DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Permanently delete{' '}
              <span className="font-medium">{recipe.title}</span> and all its
              sections, steps, paints, notes, and photos. This action cannot be
              undone.
            </p>
          </DialogHeader>

          <div className="form-item mt-2">
            <label className="form-label text-sm" htmlFor="confirm-recipe-title">
              Type <span className="font-medium">{recipe.title}</span> to confirm
            </label>
            <Input
              id="confirm-recipe-title"
              type="text"
              value={confirmValue}
              onChange={(e) => setConfirmValue(e.target.value)}
              className="input-sm w-full"
              placeholder={recipe.title}
              autoComplete="off"
            />
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="btn-sm btn-ghost"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="btn-sm btn-destructive"
            >
              {isPending ? 'Deleting…' : 'Delete recipe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
