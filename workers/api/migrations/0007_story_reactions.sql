CREATE TABLE IF NOT EXISTS story_reactions (
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(story_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_story_reactions_user ON story_reactions(user_id,created_at DESC);
