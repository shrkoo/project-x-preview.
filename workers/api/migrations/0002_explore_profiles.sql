-- Explore and profile enhancements. Additive only.
ALTER TABLE social_posts ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS social_search_history (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  search_type TEXT NOT NULL CHECK (search_type IN ('user','query')),
  target_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  query_text TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (search_type='user' AND target_user_id IS NOT NULL AND query_text IS NULL) OR
    (search_type='query' AND target_user_id IS NULL AND query_text IS NOT NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_search_history_user
  ON social_search_history(owner_id,target_user_id) WHERE target_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_search_history_query
  ON social_search_history(owner_id,query_text) WHERE query_text IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_search_history_recent
  ON social_search_history(owner_id,created_at DESC);
