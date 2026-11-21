ALTER TABLE social_direct_messages ADD COLUMN story_id TEXT REFERENCES stories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_social_direct_messages_story ON social_direct_messages(story_id);
