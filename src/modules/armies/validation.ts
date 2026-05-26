import { z } from 'zod'

export type { ArmyFormState } from '@/modules/armies/types/army-form-state'

/** Pattern for valid army slugs: lowercase letters, digits, and hyphens only. */
const SLUG_PATTERN = /^[a-z0-9-]+$/

/**
 * Zod schema for validating army create and edit form data.
 *
 * - `name`: 1–100 characters, required
 * - `slug`: 1–100 characters, lowercase letters/digits/hyphens only
 * - `parent_id`: optional UUID string (null = root army)
 * - `sort_order`: optional integer ≥ 0
 */
export const armySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required.')
    .max(100, 'Name must be 100 characters or fewer.'),
  slug: z
    .string()
    .min(1, 'Slug is required.')
    .max(100, 'Slug must be 100 characters or fewer.')
    .regex(SLUG_PATTERN, 'Slug must contain only lowercase letters, digits, and hyphens.'),
  parent_id: z
    .string()
    .uuid('Parent ID must be a valid UUID.')
    .nullable()
    .optional(),
  sort_order: z
    .number()
    .int('Sort order must be a whole number.')
    .min(0, 'Sort order must be 0 or greater.')
    .nullable()
    .optional(),
})

/** Validated army form values extracted by {@link armySchema}. */
export type ArmyFormValues = z.infer<typeof armySchema>
