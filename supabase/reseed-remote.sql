-- ============================================================
-- Remote reseed: truncate all paint-related tables before
-- running seed.sql against the remote Supabase instance.
--
-- Usage:
--   1. Run this file in the remote Supabase SQL editor (or via psql)
--   2. Then run supabase/seed.sql
--
-- WARNING: This will permanently delete all user paint collections
-- (user_paints), all paints, all hues, and all brand/product data.
-- ============================================================

-- Remove user collections first (references paints)
DELETE FROM public.user_paints;

-- Remove paint cross-references (references paints)
DELETE FROM public.paint_references;

-- Remove paints (references product_lines and hues)
DELETE FROM public.paints;

-- Remove product lines (references brands)
DELETE FROM public.product_lines;

-- Remove brands
DELETE FROM public.brands;

-- Remove sub-hues before principals (self-referencing FK)
DELETE FROM public.hues WHERE parent_id IS NOT NULL;
DELETE FROM public.hues WHERE parent_id IS NULL;
