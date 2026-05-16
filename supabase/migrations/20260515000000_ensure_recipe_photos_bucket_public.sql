-- Ensures the recipe-photos storage bucket is marked public.
--
-- The original migration used ON CONFLICT DO NOTHING, which left the
-- bucket private if it was created before that migration ran. A private
-- bucket causes getPublicUrl() to return 400, breaking cover photo
-- display on recipe cards.
UPDATE storage.buckets
SET public = true
WHERE id = 'recipe-photos';
