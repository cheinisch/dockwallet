ALTER TABLE passes
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_passes_favorite ON passes(user_id, is_favorite);
