-- Add a generated relative_luminance column to the paints table.
--
-- The formula is the WCAG sRGB relative-luminance computation:
--   Y = 0.2126·R + 0.7152·G + 0.0722·B
-- where R, G, B are the raw 0-255 channel values stored in paints.r/g/b.
--
-- Multiplying by 1/255 would normalise to [0,1] but the sort order is
-- identical either way, so we leave the scale at 0-255 to keep the
-- expression simple. ORDER BY on this column is equivalent to darkest-first.
--
-- The STORED keyword materialises the value on write so it can be indexed
-- and read without recomputing the expression on every query.

ALTER TABLE paints
  ADD COLUMN relative_luminance double precision
  GENERATED ALWAYS AS (0.2126 * r + 0.7152 * g + 0.0722 * b) STORED;

CREATE INDEX paints_relative_luminance_idx ON paints (relative_luminance);
