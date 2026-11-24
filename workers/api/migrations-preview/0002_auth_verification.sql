-- Preview-only auth hardening. Apply to the isolated Novyra preview D1 database.
ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'password';
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  rate_key TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  blocked_until INTEGER
);
CREATE TABLE IF NOT EXISTS signup_verification_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used_at INTEGER,
  sent_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_signup_codes_user ON signup_verification_codes(user_id,expires_at);
