CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_url TEXT,
  type TEXT NOT NULL CHECK(type IN ('image','video')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  media_data BLOB,
  content_type TEXT
);
CREATE INDEX IF NOT EXISTS idx_stories_active ON stories(expires_at, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_user_active ON stories(user_id, expires_at, created_at DESC);
CREATE TABLE IF NOT EXISTS story_views (
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(story_id, viewer_id)
);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer ON story_views(viewer_id, story_id);
