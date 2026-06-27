ALTER TABLE sync_tokens
  ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_passes_user_updated ON passes(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_passes_updated_at ON passes(updated_at);