# Recipes

**Epic:** Recipe
**Type:** Feature
**Status:** Todo

## Summary

Allow authenticated users to create, edit, and delete paint recipes. A recipe is a step-by-step painting guide for a specific area of a miniature (e.g., "Ultramarines Blue Armor", "NMM Gold Trim", "Nurgle Flesh"). Each recipe has a name, optional model area label, optional description, and an ordered list of steps. Each step specifies a paint and a technique (prime, base, wash, layer, highlight, drybrush, glaze, contrast, technical). Users manage their own recipes; administrators can manage any recipe.

This mirrors how the Warhammer painting community shares recipes — an ordered sequence of paints and techniques to reproduce a specific look on a miniature.

## Acceptance Criteria

- [ ] `recipes` table created with `id`, `user_id`, `name`, `model_area`, `description`, `created_at`, `updated_at`
- [ ] `recipe_steps` table linking recipes to paints with `position` (ordering), `technique` (enum), and `note` (optional text)
- [ ] `technique` enum type created: `prime`, `base`, `wash`, `layer`, `highlight`, `drybrush`, `glaze`, `contrast`, `technical`
- [ ] RLS policies: users can CRUD their own recipes and recipe_steps
- [ ] RLS policies: administrators can CRUD all recipes and recipe_steps
- [ ] Recipe type defined at `src/types/recipe.ts`
- [ ] Recipe service functions at `src/lib/supabase/recipes.ts`
- [ ] Recipe list page at `/recipes` showing the user's recipes
- [ ] Create recipe page at `/recipes/new`
- [ ] View/edit recipe page at `/recipes/[id]`
- [ ] Users can add paints to a recipe from the DetailPanel (color wheel)
- [ ] Users can reorder steps within a recipe
- [ ] Users can set a technique for each step (dropdown selector)
- [ ] Users can add notes to individual steps in a recipe
- [ ] Users can delete a recipe (with confirmation)
- [ ] Each step in a recipe shows owned/not-owned indicator based on the user's collection
- [ ] Recipe view shows count of owned vs total paints ("You own 5/8 paints")

## Implementation Plan

### Step 1: Create database migration

**`supabase/migrations/{timestamp}_create_recipes_tables.sql`**

```sql
-- Technique enum for recipe steps
CREATE TYPE public.paint_technique AS ENUM (
  'prime',
  'base',
  'wash',
  'layer',
  'highlight',
  'drybrush',
  'glaze',
  'contrast',
  'technical'
);

CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  model_area TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  paint_id TEXT NOT NULL,
  technique public.paint_technique NOT NULL DEFAULT 'base',
  position INT NOT NULL DEFAULT 0,
  note TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX idx_recipe_steps_recipe_id ON public.recipe_steps(recipe_id);
CREATE UNIQUE INDEX idx_recipe_steps_unique ON public.recipe_steps(recipe_id, paint_id, technique);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;

-- Auto-update timestamp
CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- User policies
CREATE POLICY "Users can read own recipes"
  ON public.recipes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes"
  ON public.recipes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes"
  ON public.recipes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes"
  ON public.recipes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can read all recipes"
  ON public.recipes FOR SELECT TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can update all recipes"
  ON public.recipes FOR UPDATE TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can delete all recipes"
  ON public.recipes FOR DELETE TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

-- Recipe steps: inherit access from recipe ownership
CREATE POLICY "Users can manage own recipe steps"
  ON public.recipe_steps FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all recipe steps"
  ON public.recipe_steps FOR ALL TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));
```

### Step 2: Create recipe types

**`src/types/recipe.ts`**

```typescript
export type PaintTechnique =
  | 'prime'
  | 'base'
  | 'wash'
  | 'layer'
  | 'highlight'
  | 'drybrush'
  | 'glaze'
  | 'contrast'
  | 'technical'

export interface Recipe {
  id: string
  user_id: string
  name: string
  model_area: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface RecipeStep {
  id: string
  recipe_id: string
  paint_id: string
  technique: PaintTechnique
  position: number
  note: string | null
  added_at: string
}

export interface RecipeWithSteps extends Recipe {
  steps: RecipeStep[]
}
```

### Step 3: Create recipe service

**`src/lib/supabase/recipes.ts`**

- `getUserRecipes(supabase, userId)` — list all recipes with step counts
- `getRecipe(supabase, recipeId)` — fetch recipe with steps (ordered by position)
- `createRecipe(supabase, { name, model_area, description })` — create empty recipe
- `updateRecipe(supabase, recipeId, { name, model_area, description })` — update metadata
- `deleteRecipe(supabase, recipeId)` — delete recipe (cascade deletes steps)
- `addStepToRecipe(supabase, recipeId, paintId, technique, note?)` — add step at end
- `removeStep(supabase, stepId)` — remove step entry
- `updateStep(supabase, stepId, { technique, position, note })` — update technique, reorder, or update note
- `reorderSteps(supabase, recipeId, orderedIds)` — bulk update positions

### Step 4: Create recipe list page

**`src/app/recipes/page.tsx`** — Server component listing the user's recipes:
- Grid/list of recipe cards with name, model area, description preview, step count, tag badges
- "Create Recipe" button
- Each card links to `/recipes/[id]`
- Empty state: "No recipes yet. Create your first recipe to start documenting your painting process."

### Step 5: Create recipe detail/edit page

**`src/app/recipes/[id]/page.tsx`** — View and edit a single recipe:
- Recipe name, model area, and description (editable inline)
- Ordered list of steps with: step number, technique badge, color swatch, paint name, brand, owned indicator, note field
- Technique selector dropdown per step (prime, base, wash, layer, highlight, drybrush, glaze, contrast, technical)
- Drag-to-reorder or up/down buttons for step ordering
- Remove step button per entry
- "Add Step" action that navigates to the color wheel with a recipe context
- Owned vs total count display ("You own 5/8 paints")
- Tag picker for managing recipe tags
- Delete recipe button with confirmation

### Step 6: Create recipe creation page

**`src/app/recipes/new/page.tsx`** — Form with name, model area, description, and optional initial tags. On submit, creates recipe and redirects to the detail page.

### Step 7: Add "Add to Recipe" action in DetailPanel

**`src/components/DetailPanel.tsx`** — Add an "Add to Recipe" button below the collection toggle when a paint is selected. Clicking opens a dropdown/modal listing the user's recipes. Selecting a recipe opens a technique picker, then adds the paint as a new step.

This requires passing recipes data and an `onAddToRecipe` callback through props.

### Affected Files

| File | Changes |
|------|---------|
| `supabase/migrations/{timestamp}_create_recipes_tables.sql` | New — recipes, recipe_steps tables with RLS, paint_technique enum |
| `src/types/recipe.ts` | New — Recipe, RecipeStep, PaintTechnique types |
| `src/lib/supabase/recipes.ts` | New — recipe CRUD service |
| `src/app/recipes/page.tsx` | New — recipe list page |
| `src/app/recipes/[id]/page.tsx` | New — recipe detail/edit page |
| `src/app/recipes/new/page.tsx` | New — create recipe page |
| `src/components/DetailPanel.tsx` | Add "Add to Recipe" button with recipe and technique picker |
| `src/app/page.tsx` | Pass recipe context to DetailPanel |

### Dependencies

- [Supabase Setup](../user-authentication/supabase-setup.md) — Supabase client
- [User Profiles](../user-authentication/user-profiles.md) — `profiles` table referenced by `user_id`
- [Role-Based Authorization](../user-authentication/role-based-authorization.md) — admin RLS policies
- [Cloud Paint Collection](../paint-collection/cloud-paint-collection.md) — owned paint data for owned/not-owned indicators

### Risks & Considerations

- **Paint ID format:** `recipe_steps.paint_id` uses the same TEXT format as `user_paint_collection.paint_id` (`${brand}-${name}-${type}`). If paint data migration changes IDs, both tables need updating.
- **Same paint, multiple techniques:** A recipe may use the same paint for different techniques (e.g., Macragge Blue as both base and layer after mixing). The unique index is on `(recipe_id, paint_id, technique)` to allow the same paint with different techniques but prevent exact duplicates.
- **Reordering:** Drag-and-drop reordering adds complexity. For MVP, simple up/down buttons may be sufficient. Consider `@dnd-kit/core` if drag-and-drop is desired.
- **Navigation flow:** Adding a step from the color wheel requires selecting both a recipe and a technique. A two-step modal (pick recipe → pick technique) keeps the user on the wheel.
- **`update_updated_at` function:** Reuses the trigger function from the profiles migration. Ensure it exists before this migration runs.
- **Technique enum extensibility:** The `paint_technique` enum can be extended with `ALTER TYPE` if new techniques are needed (e.g., `stipple`, `wetblend`, `airbrush`).
