-- Demo-safe metadata for social fixtures. Existing normalized interaction tables remain the source of truth.
ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;

ALTER TABLE social_posts ADD COLUMN thumbnail_url TEXT;
ALTER TABLE social_posts ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;

UPDATE users
SET username = COALESCE(username, LOWER(REPLACE(REPLACE(display_name, ' ', ''), '.', '')))
WHERE username IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_demo ON users(is_demo);
CREATE INDEX IF NOT EXISTS idx_social_posts_is_demo ON social_posts(is_demo);
CREATE INDEX IF NOT EXISTS idx_social_posts_media_created ON social_posts(media_type, created_at DESC);
