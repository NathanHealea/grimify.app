-- Add army_id foreign key to palettes table.
-- ON DELETE SET NULL ensures palettes are not deleted when an army is removed;
-- the palette simply loses its army association.
ALTER TABLE public.palettes
  ADD COLUMN army_id uuid REFERENCES public.armies (id) ON DELETE SET NULL;
