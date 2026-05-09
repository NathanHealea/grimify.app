'use client'

import type { ComponentProps } from 'react'

import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Root container for a Radix Select. Owns the open state, value, and
 * (optionally) participates in form submissions when given a `name`.
 *
 * Wraps {@link SelectPrimitive.Root}. Compose with {@link SelectTrigger},
 * {@link SelectContent}, and {@link SelectItem}.
 */
function Select({ ...props }: ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

/**
 * Visible trigger button that opens the select popup.
 *
 * Applies the daisyUI-style `.select-trigger` class. Size variants
 * (`select-trigger-xs`, `-sm`, `-md`, `-lg`), color variants
 * (`select-trigger-primary`, `-secondary`, `-accent`, `-error`), and
 * `select-trigger-ghost` are passed via `className` — same convention as the
 * {@link Input} primitive.
 *
 * @param props.className Additional classes merged via {@link cn}.
 * @param props.children The selected value display, typically {@link SelectValue}.
 */
function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn('select-trigger', className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="select-trigger-icon" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

/**
 * Renders the currently selected item's text inside the trigger, or the
 * placeholder when no value is selected.
 *
 * @param props.placeholder Text shown when no value is selected.
 */
function SelectValue({ ...props }: ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

/**
 * Floating popup containing the list of options. Portaled into the document
 * body to escape parent overflow/stacking contexts.
 *
 * @param props.className Additional classes merged via {@link cn}.
 * @param props.position `'popper'` (default) anchors to the trigger; `'item-aligned'` aligns the selected item with the trigger.
 */
function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        className={cn('select-content', className)}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="select-scroll-button">
          <ChevronUp className="size-4" />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="select-viewport">{children}</SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="select-scroll-button">
          <ChevronDown className="size-4" />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

/**
 * A selectable option inside {@link SelectContent}.
 *
 * Radix forbids `value=""`. To represent "all" or "none", consumers should
 * use a sentinel string (e.g. `"__all__"`) and translate it in their handler.
 *
 * @param props.className Additional classes merged via {@link cn}.
 * @param props.value The value associated with this item (required, non-empty).
 * @param props.children The item label.
 */
function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn('select-item', className)}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="select-item-indicator">
        <Check className="size-3.5" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

/**
 * Logical grouping of related items inside {@link SelectContent}. Pair with
 * {@link SelectLabel} for an accessible group heading.
 */
function SelectGroup({ ...props }: ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

/**
 * Non-interactive label rendered above a {@link SelectGroup}.
 *
 * @param props.className Additional classes merged via {@link cn}.
 */
function SelectLabel({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn('select-label', className)}
      {...props}
    />
  )
}

/**
 * Visual separator between groups of items.
 *
 * @param props.className Additional classes merged via {@link cn}.
 */
function SelectSeparator({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('select-separator', className)}
      {...props}
    />
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
