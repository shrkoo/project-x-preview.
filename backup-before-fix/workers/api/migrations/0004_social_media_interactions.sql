-- Persist social saves, reposts, shares, and direct post shares.
ALTER TABLE social_posts ADD COLUMN repost_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE social_posts ADD COLUMN share_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS social_post_views (
  post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_social_post_views_user ON social_post_views(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS social_post_saves (
  post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(post_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_social_post_saves_user ON social_post_saves(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS social_post_reposts (
  post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(post_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_social_post_reposts_user ON social_post_reposts(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS social_post_shares (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_social_post_shares_post ON social_post_shares(post_id,created_at DESC);

CREATE TABLE IF NOT EXISTS social_direct_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_post_id TEXT REFERENCES social_posts(id) ON DELETE SET NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_social_direct_messages_recipient ON social_direct_messages(recipient_id,created_at DESC);
