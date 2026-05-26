import type { Army } from '@/modules/armies/types/army'

/**
 * An {@link Army} extended with its nested children for tree rendering.
 *
 * Built in JavaScript from a flat `getAllArmiesFlat()` result by
 * `getArmyTree()`. Leaf nodes (sub-factions with no children) carry an
 * empty `children` array.
 *
 * Used by admin tree lists and the palette army combobox.
 */
export type ArmyNode = Army & {
  /** Direct child armies, each recursively typed as {@link ArmyNode}. */
  children: ArmyNode[]
}
