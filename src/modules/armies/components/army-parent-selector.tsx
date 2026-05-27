'use client'

import { useState } from 'react'

import type { ArmyNode } from '@/modules/armies/types/army-node'

/** Sentinel value used for the "None (root army)" option. */
const NONE_VALUE = '__none__'

/**
 * Props for {@link ArmyParentSelector}.
 */
type ArmyParentSelectorProps = {
  /** Full army tree used to build the hierarchical option list. */
  armies: ArmyNode[]
  /** Currently selected parent army ID, or `null`/`undefined` for root. */
  defaultValue?: string | null
  /** Name attribute for the hidden input that carries the selected value. */
  name: string
  /**
   * Army ID to exclude from the list (along with all its descendants).
   * Prevents an army from being assigned as its own parent or child.
   */
  excludeId?: string
}

/** Flattened option with its display label and depth. */
type FlatOption = {
  id: string
  label: string
  depth: number
}

/**
 * Collects all descendant IDs of a given army node.
 *
 * @param node - The army node whose descendants should be collected.
 * @param result - Accumulator set (mutated in place).
 */
function collectDescendantIds(node: ArmyNode, result: Set<string>): void {
  result.add(node.id)
  for (const child of node.children) {
    collectDescendantIds(child, result)
  }
}

/**
 * Recursively flattens an {@link ArmyNode} tree into an ordered list of options.
 *
 * Each option carries its depth level for indent styling and a breadcrumb label
 * built from ancestor names separated by " › ".
 *
 * @param nodes - Army nodes at the current depth level.
 * @param depth - Current depth (0 = root).
 * @param exclude - Set of IDs to skip (the edited army and its descendants).
 * @param ancestorNames - Names accumulated from ancestor nodes for breadcrumb display.
 * @returns Flat ordered array of {@link FlatOption}.
 */
function flattenTree(
  nodes: ArmyNode[],
  depth: number,
  exclude: Set<string>,
  ancestorNames: string[] = [],
): FlatOption[] {
  const result: FlatOption[] = []

  for (const node of nodes) {
    if (exclude.has(node.id)) continue

    const breadcrumb = [...ancestorNames, node.name].join(' › ')
    result.push({ id: node.id, label: breadcrumb, depth })

    if (node.children.length > 0) {
      result.push(...flattenTree(node.children, depth + 1, exclude, [...ancestorNames, node.name]))
    }
  }

  return result
}

/**
 * Dropdown for selecting an army's parent from the full army tree.
 *
 * Excludes the army being edited (and all its descendants) to prevent
 * circular references. Displays options as breadcrumb ancestry strings
 * (e.g., `Imperium › Space Marines`) with visual indent via padding.
 *
 * Emits the selected army ID via a hidden `<input>` named by the `name` prop.
 * Selecting "None" sets the hidden input to an empty string (root army).
 *
 * @param props - {@link ArmyParentSelectorProps}
 */
export function ArmyParentSelector({
  armies,
  defaultValue,
  name,
  excludeId,
}: ArmyParentSelectorProps) {
  const [value, setValue] = useState<string>(defaultValue ?? NONE_VALUE)

  // Build exclude set from the army being edited and all its descendants.
  const excludeSet = new Set<string>()
  if (excludeId) {
    const findNode = (nodes: ArmyNode[]): ArmyNode | undefined => {
      for (const n of nodes) {
        if (n.id === excludeId) return n
        const found = findNode(n.children)
        if (found) return found
      }
    }
    const excludeNode = findNode(armies)
    if (excludeNode) collectDescendantIds(excludeNode, excludeSet)
  }

  const options = flattenTree(armies, 0, excludeSet)

  return (
    <>
      {/* Hidden input carries the value for server action form submission */}
      <input
        type="hidden"
        name={name}
        value={value === NONE_VALUE ? '' : value}
      />
      <select
        className="input input-sm w-full"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Parent army"
      >
        <option value={NONE_VALUE}>— None (root army) —</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id} style={{ paddingLeft: `${opt.depth * 16}px` }}>
            {opt.label}
          </option>
        ))}
      </select>
    </>
  )
}
